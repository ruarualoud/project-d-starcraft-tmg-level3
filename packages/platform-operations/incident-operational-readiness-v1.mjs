import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const STARCRAFT_TMG_INCIDENT_READINESS_VERSION =
  "starcraft_tmg_incident_operational_readiness_v1";

const SAFE_ID = /^[A-Za-z0-9._:@/+\-]{1,240}$/u;
const HASH = /^[a-f0-9]{64}$/u;
const SEVERITIES = new Set(["Medium", "High", "Critical"]);
const SECRET_KEY = /^(?:api.?key|authorization|cookie|credential(?:value|bytes|material)|secret(?:value|bytes|material)|access.?token|refresh.?token|seat.?token|bearer(?:token|value|bytes|material)|prompt(?:text|content)?|reasoning(?:text|content)?|private.?state|raw.?identity)$/iu;
const SECRET_VALUE = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}|\b(?:sk|jsk)-[A-Za-z0-9_-]{12,}/iu;

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function id(value, field) {
  const result = String(value || "").trim();
  if (!SAFE_ID.test(result)) throw new TypeError(`${field} is invalid`);
  return result;
}

function digest(value, field) {
  const result = String(value || "").toLowerCase();
  if (!HASH.test(result)) throw new TypeError(`${field} is invalid`);
  return result;
}

function instant(value, field) {
  let result;
  try { result = new Date(value).toISOString(); } catch {
    throw new TypeError(`${field} is invalid`);
  }
  if (result !== value) throw new TypeError(`${field} is invalid`);
  return result;
}

function noSecrets(value, path = "$", seen = new Set()) {
  if (typeof value === "string") {
    if (SECRET_VALUE.test(value)) throw new Error(`INCIDENT_SECRET_FORBIDDEN:${path}`);
    return;
  }
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => noSecrets(entry, `${path}[${index}]`, seen));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) throw new Error(`INCIDENT_FIELD_FORBIDDEN:${path}.${key}`);
    noSecrets(child, `${path}.${key}`, seen);
  }
}

function seal(body, field) {
  const value = clone(body);
  return freeze({ ...value, [field]: hashStarcraftTmgContract(value) });
}

function assertAuthorization(decision, action) {
  if (decision?.allowed !== true || decision.action !== action) {
    throw new Error(`INCIDENT_AUTHORIZATION_REQUIRED:${action}`);
  }
}

export function createStarcraftTmgIncidentControlV1() {
  const incidents = new Map();

  function open(input = {}) {
    noSecrets(input);
    const incidentId = id(input.incidentId, "incidentId");
    if (incidents.has(incidentId)) throw new Error("INCIDENT_ALREADY_EXISTS");
    const severity = id(input.severity, "severity");
    if (!SEVERITIES.has(severity)) throw new TypeError("incident severity is invalid");
    const scope = {
      environmentId: id(input.scope?.environmentId, "scope.environmentId"),
      releaseHash: input.scope?.releaseHash == null ? null
        : digest(input.scope.releaseHash, "scope.releaseHash"),
      subsystems: [...new Set(input.scope?.subsystems || [])]
        .map((entry) => id(entry, "scope.subsystems")).sort(),
    };
    if (!scope.subsystems.length) throw new TypeError("incident subsystem scope is required");
    const openedAt = instant(input.openedAt, "openedAt");
    const body = {
      schemaVersion: `${STARCRAFT_TMG_INCIDENT_READINESS_VERSION}.incident`,
      incidentId,
      severity,
      summaryCode: id(input.summaryCode, "summaryCode"),
      evidenceRefHash: digest(input.evidenceRefHash, "evidenceRefHash"),
      scope,
      state: "open",
      revision: 0,
      integrationBlocking: severity === "Critical" || severity === "High",
      timeline: [{ kind: "opened", at: openedAt,
        actorPrincipalId: "automated-monitor" }],
      rollbackDrill: null,
      resolution: null,
      secretMaterialRetained: false,
      trainingTruth: false,
    };
    const incident = seal(body, "incidentHash");
    incidents.set(incidentId, clone(incident));
    return incident;
  }

  function current(input) {
    const incident = incidents.get(id(input.incidentId, "incidentId"));
    if (!incident) throw new Error("INCIDENT_NOT_FOUND");
    if (incident.revision !== Number(input.expectedRevision)) {
      throw new Error("INCIDENT_CAS_CONFLICT");
    }
    return incident;
  }

  function quarantine(input = {}) {
    assertAuthorization(input.authorizationDecision, "incident.manage");
    const incident = current(input);
    if (!incident.integrationBlocking || incident.state !== "open") {
      throw new Error("INCIDENT_QUARANTINE_NOT_REQUIRED");
    }
    const at = instant(input.at, "at");
    const next = seal({ ...Object.fromEntries(Object.entries(incident)
      .filter(([key]) => key !== "incidentHash")),
    state: "quarantined", revision: incident.revision + 1,
    timeline: [...incident.timeline, { kind: "quarantined", at,
      actorPrincipalId: input.authorizationDecision.principalId }] }, "incidentHash");
    incidents.set(next.incidentId, clone(next));
    return next;
  }

  function evaluateOperation(input = {}) {
    const environmentId = id(input.environmentId, "environmentId");
    const releaseHash = input.releaseHash == null ? null
      : digest(input.releaseHash, "releaseHash");
    const subsystem = id(input.subsystem, "subsystem");
    const blocking = [...incidents.values()].filter((incident) =>
      incident.integrationBlocking && incident.state !== "resolved"
      && incident.scope.environmentId === environmentId
      && (!incident.scope.releaseHash || incident.scope.releaseHash === releaseHash)
      && incident.scope.subsystems.includes(subsystem));
    return freeze({
      schemaVersion: `${STARCRAFT_TMG_INCIDENT_READINESS_VERSION}.operation-decision`,
      environmentId, releaseHash, subsystem,
      allowed: blocking.length === 0,
      blockingIncidentIds: blocking.map((entry) => entry.incidentId).sort(),
      onlyCriticalHighBlock: true,
      trainingTruth: false,
    });
  }

  function rollback(input = {}) {
    assertAuthorization(input.incidentAuthorizationDecision, "incident.manage");
    assertAuthorization(input.rollbackAuthorizationDecision, "release.rollback");
    const incident = current(input);
    if (incident.state !== "quarantined") throw new Error("INCIDENT_NOT_QUARANTINED");
    const before = input.releaseRegistry.snapshot();
    if (before.activeReleaseHash !== incident.scope.releaseHash) {
      throw new Error("INCIDENT_ACTIVE_RELEASE_MISMATCH");
    }
    const after = input.releaseRegistry.rollback({
      expectedRevision: before.revision,
      targetReleaseHash: digest(input.targetReleaseHash, "targetReleaseHash"),
      reason: id(input.reason, "reason"),
    });
    const at = instant(input.at, "at");
    const drill = seal({
      schemaVersion: `${STARCRAFT_TMG_INCIDENT_READINESS_VERSION}.rollback-drill`,
      incidentId: incident.incidentId,
      fromReleaseHash: before.activeReleaseHash,
      toReleaseHash: after.activeReleaseHash,
      registryRevisionBefore: before.revision,
      registryRevisionAfter: after.revision,
      replayOrSmokeEvidenceHash: digest(input.replayOrSmokeEvidenceHash,
        "replayOrSmokeEvidenceHash"),
      performedAt: at,
      passed: after.activeReleaseHash === input.targetReleaseHash,
      fixtureEvidenceOnly: input.fixtureEvidenceOnly === true,
      trainingTruth: false,
    }, "drillHash");
    const next = seal({ ...Object.fromEntries(Object.entries(incident)
      .filter(([key]) => key !== "incidentHash")),
    state: "mitigated", revision: incident.revision + 1,
    rollbackDrill: drill,
    timeline: [...incident.timeline, { kind: "release_rolled_back", at,
      actorPrincipalId: input.rollbackAuthorizationDecision.principalId,
      drillHash: drill.drillHash }] }, "incidentHash");
    incidents.set(next.incidentId, clone(next));
    return next;
  }

  function resolve(input = {}) {
    assertAuthorization(input.authorizationDecision, "incident.manage");
    const incident = current(input);
    if (incident.state !== "mitigated" || incident.rollbackDrill?.passed !== true
      || input.reviewerPrincipalId === input.authorizationDecision.principalId) {
      throw new Error("INCIDENT_INDEPENDENT_RESOLUTION_REQUIRED");
    }
    const at = instant(input.at, "at");
    const resolution = {
      rootCauseRefHash: digest(input.rootCauseRefHash, "rootCauseRefHash"),
      recoveryEvidenceHash: digest(input.recoveryEvidenceHash,
        "recoveryEvidenceHash"),
      reviewerPrincipalId: id(input.reviewerPrincipalId, "reviewerPrincipalId"),
      resolvedAt: at,
    };
    const next = seal({ ...Object.fromEntries(Object.entries(incident)
      .filter(([key]) => key !== "incidentHash")),
    state: "resolved", revision: incident.revision + 1, resolution,
    timeline: [...incident.timeline, { kind: "resolved", at,
      actorPrincipalId: input.authorizationDecision.principalId,
      reviewerPrincipalId: resolution.reviewerPrincipalId }] }, "incidentHash");
    incidents.set(next.incidentId, clone(next));
    return next;
  }

  function inspect(incidentId) {
    const incident = incidents.get(id(incidentId, "incidentId"));
    return incident ? freeze(clone(incident)) : null;
  }

  function snapshot() {
    const values = [...incidents.values()]
      .sort((left, right) => left.incidentId.localeCompare(right.incidentId));
    const body = {
      schemaVersion: `${STARCRAFT_TMG_INCIDENT_READINESS_VERSION}.snapshot`,
      incidentCount: values.length,
      activeBlockingCount: values.filter((entry) =>
        entry.integrationBlocking && entry.state !== "resolved").length,
      activeMediumCount: values.filter((entry) =>
        !entry.integrationBlocking && entry.state !== "resolved").length,
      incidents: values.map((entry) => ({ incidentId: entry.incidentId,
        severity: entry.severity, state: entry.state,
        incidentHash: entry.incidentHash,
        rollbackDrillHash: entry.rollbackDrill?.drillHash || null })),
      onlyCriticalHighBlock: true,
      trainingTruth: false,
    };
    return seal(body, "snapshotHash");
  }

  return freeze({ version: STARCRAFT_TMG_INCIDENT_READINESS_VERSION,
    open, quarantine, evaluateOperation, rollback, resolve, inspect, snapshot });
}

function readinessFinding(code, severity, appliesTo, detail) {
  return { code, severity, appliesTo, detail,
    integrationBlocking: severity === "Critical" || severity === "High" };
}

export function assessStarcraftTmgOperationalReadinessV1(input = {}) {
  noSecrets(input);
  const findings = [];
  const env = input.environmentAssessments || {};
  const localReady = env.localDemo?.ready === true
    && env.localDemo?.environmentClass === "local_demo";
  if (!localReady) findings.push(readinessFinding("LOCAL_ENVIRONMENT_NOT_READY",
    "High", ["local_demo"], "localDemo"));
  const controlledChecks = [
    [env.controlledExperiment?.ready === true
      && env.controlledExperiment?.environmentClass === "controlled_experiment",
    "CONTROLLED_ENVIRONMENT_NOT_READY"],
    [input.rbacPolicy?.defaultDecision === "deny", "RBAC_DEFAULT_DENY_MISSING"],
    [object(input.keySnapshot) && input.keySnapshot.byokPersisted === false,
      "KEY_CONTROL_MISSING"],
    [input.persistence?.controlled?.ready === true,
      "CONTROLLED_PERSISTENCE_NOT_READY"],
    [input.releaseDecisions?.controlled?.allowed === true,
      "CONTROLLED_RELEASE_NOT_ALLOWED"],
    [object(input.privacy?.policy), "PRIVACY_POLICY_MISSING"],
    [object(input.telemetry?.sinkHealth), "TELEMETRY_MISSING"],
    [input.incidents?.activeBlockingCount === 0, "ACTIVE_BLOCKING_INCIDENT"],
  ];
  for (const [passed, code] of controlledChecks) if (!passed) {
    findings.push(readinessFinding(code, "High", ["controlled_experiment"], code));
  }
  const productionChecks = [
    [env.productionRoom?.ready === true
      && env.productionRoom?.environmentClass === "production_room",
    "PRODUCTION_ENVIRONMENT_NOT_READY"],
    [input.keySnapshot?.provider?.productionReady === true,
      "EXTERNAL_KMS_NOT_CONFIGURED"],
    [input.persistence?.production?.productionReady === true
      && input.persistence?.production?.fixtureEvidenceOnly === false,
    "REAL_POSTGRES_MULTI_INSTANCE_NOT_CONFIGURED"],
    [input.privacy?.adapterProductionReady === true,
      "PRODUCTION_PRIVACY_ADAPTER_NOT_CONFIGURED"],
    [input.telemetry?.sinkHealth?.productionReady === true,
      "PRODUCTION_TELEMETRY_SINK_NOT_CONFIGURED"],
    [input.telemetry?.slo?.passed === true, "PRODUCTION_SLO_NOT_PASSING"],
    [input.incidents?.activeBlockingCount === 0, "ACTIVE_BLOCKING_INCIDENT"],
    [input.rollbackDrill?.passed === true
      && input.rollbackDrill?.fixtureEvidenceOnly === false,
    "REAL_ROLLBACK_DRILL_MISSING"],
  ];
  for (const [passed, code] of productionChecks) if (!passed) {
    findings.push(readinessFinding(code, "High",
      ["production_web", "production_app"], code));
  }
  if (input.releaseDecisions?.publicWeb?.allowed !== true) {
    findings.push(readinessFinding("PUBLIC_WEB_RELEASE_NOT_ALLOWED", "High",
      ["production_web"], "publicWeb"));
  }
  if (input.releaseDecisions?.appStore?.allowed !== true) {
    findings.push(readinessFinding("APP_STORE_RELEASE_NOT_ALLOWED", "High",
      ["production_app"], "appStore"));
  }
  if (input.deviceAcceptance?.passed !== true) {
    findings.push(readinessFinding("PHYSICAL_DEVICE_ACCEPTANCE_MISSING", "High",
      ["production_app"], "Ticket14 Slice143"));
  }
  const trainingChecks = [
    [env.trainingEligibleRun?.ready === true
      && env.trainingEligibleRun?.environmentClass === "training_eligible_run",
    "TRAINING_ENVIRONMENT_NOT_READY"],
    [input.trainingEligibility?.eligibleForTraining === true,
      "INDEPENDENT_TRAINING_APPROVAL_MISSING"],
  ];
  for (const [passed, code] of trainingChecks) if (!passed) {
    findings.push(readinessFinding(code, "High", ["training_eligible_run"], code));
  }
  const blocked = (target) => findings.some((entry) =>
    entry.integrationBlocking && entry.appliesTo.includes(target));
  const body = {
    schemaVersion: `${STARCRAFT_TMG_INCIDENT_READINESS_VERSION}.aggregate`,
    readiness: {
      localDemo: !blocked("local_demo"),
      controlledExperiment: !blocked("controlled_experiment"),
      productionWeb: !blocked("production_web"),
      productionApp: !blocked("production_app"),
      trainingEligibleRun: !blocked("training_eligible_run"),
    },
    findings,
    counts: {
      critical: findings.filter((entry) => entry.severity === "Critical").length,
      high: findings.filter((entry) => entry.severity === "High").length,
      medium: findings.filter((entry) => entry.severity === "Medium").length,
    },
    onlyCriticalHighBlock: true,
    localEvidenceNeverClaimsExternalProduction: true,
    trainingTruth: false,
  };
  return seal(body, "readinessHash");
}
