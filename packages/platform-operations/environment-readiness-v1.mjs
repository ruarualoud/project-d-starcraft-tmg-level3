import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const STARCRAFT_TMG_ENVIRONMENT_READINESS_VERSION =
  "starcraft_tmg_environment_readiness_v1";

export const STARCRAFT_TMG_ENVIRONMENT_CLASSES = Object.freeze([
  "local_demo",
  "controlled_experiment",
  "production_room",
  "training_eligible_run",
]);

const CLASS_LEVEL = Object.freeze(Object.fromEntries(
  STARCRAFT_TMG_ENVIRONMENT_CLASSES.map((name, index) => [name, index]),
));

const CAPABILITIES = Object.freeze({
  local_demo: Object.freeze([
    "public_catalogue_read",
    "local_development_room",
    "local_untrusted_artifact",
  ]),
  controlled_experiment: Object.freeze([
    "public_catalogue_read",
    "controlled_room",
    "owner_scoped_provider_inference",
    "offline_skill_candidate",
    "selfplay_evidence",
    "training_export_ineligible",
  ]),
  production_room: Object.freeze([
    "public_catalogue_read",
    "production_multiplayer_room",
    "owner_scoped_provider_inference",
    "approved_release_distribution",
  ]),
  training_eligible_run: Object.freeze([
    "public_catalogue_read",
    "controlled_room",
    "selfplay_evidence",
    "approved_training_dataset_entry",
  ]),
});

const REQUIREMENTS = Object.freeze({
  local_demo: Object.freeze([]),
  controlled_experiment: Object.freeze([
    "scopedIdentity",
    "isolatedProviderEgress",
    "persistentAttemptAccounting",
    "budgetPolicy",
    "auditJournal",
    "controlledRulesDataBinding",
  ]),
  production_room: Object.freeze([
    "externalIdentityAuthority",
    "externalKeyManagement",
    "productionPostgresCas",
    "durableQueue",
    "immutableRelease",
    "distributionRightsApproved",
    "privacyRetentionPolicy",
    "productionTelemetry",
    "incidentRollback",
  ]),
  training_eligible_run: Object.freeze([
    "scopedIdentity",
    "externalKeyManagement",
    "durableQueue",
    "immutableRelease",
    "viewerLeakAuditPassed",
    "technicalTrajectoryEligibility",
    "groupedSplitManifest",
    "independentTrainingApproval",
  ]),
});

const SECRET_KEY = /(?:api.?key|authorization|bearer|cookie|credential|secret|access.?token|refresh.?token|seat.?token)/iu;
const SECRET_VALUE = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}|\b(?:sk|jsk)-[A-Za-z0-9_-]{12,}/iu;

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function required(value, field) {
  const result = String(value || "").trim();
  if (!result) throw new TypeError(`${field} is required`);
  return result;
}

function assertNoSecretMaterial(value, path = "evidence", seen = new Set()) {
  if (typeof value === "string") {
    if (SECRET_VALUE.test(value)) throw new Error(`SECRET_MATERIAL_FORBIDDEN:${path}`);
    return;
  }
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoSecretMaterial(entry,
      `${path}[${index}]`, seen));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) throw new Error(`SECRET_FIELD_FORBIDDEN:${path}.${key}`);
    assertNoSecretMaterial(child, `${path}.${key}`, seen);
  }
}

function normalizeClass(value) {
  const result = required(value, "environmentClass");
  if (!STARCRAFT_TMG_ENVIRONMENT_CLASSES.includes(result)) {
    throw new TypeError(`unsupported environmentClass: ${result}`);
  }
  return result;
}

function normalizeEvidence(value) {
  if (!object(value)) throw new TypeError("evidence is required");
  assertNoSecretMaterial(value);
  return Object.fromEntries(Object.entries(clone(value))
    .sort(([left], [right]) => left.localeCompare(right)));
}

function finding(code, severity, detail) {
  return deepFreeze({
    code,
    severity,
    detail,
    integrationBlocking: severity === "Critical" || severity === "High",
  });
}

export function describeStarcraftTmgEnvironmentClassV1(environmentClass) {
  const name = normalizeClass(environmentClass);
  return deepFreeze({
    schemaVersion: `${STARCRAFT_TMG_ENVIRONMENT_READINESS_VERSION}.class`,
    environmentClass: name,
    level: CLASS_LEVEL[name],
    capabilities: [...CAPABILITIES[name]],
    requiredEvidence: [...REQUIREMENTS[name]],
    canClaimProductionRoom: name === "production_room",
    canClaimTrainingEligibility: name === "training_eligible_run",
    implicitEscalationAllowed: false,
    trainingTruth: false,
  });
}

export function assessStarcraftTmgEnvironmentReadinessV1(input = {}) {
  const environmentClass = normalizeClass(input.environmentClass);
  const environmentId = required(input.environmentId, "environmentId");
  const evidence = normalizeEvidence(input.evidence);
  const findings = [];
  for (const requirement of REQUIREMENTS[environmentClass]) {
    if (evidence[requirement] !== true) {
      findings.push(finding("REQUIRED_EVIDENCE_MISSING", "High", requirement));
    }
  }
  if (evidence.environmentClass !== undefined
    && evidence.environmentClass !== environmentClass) {
    findings.push(finding("ENVIRONMENT_EVIDENCE_CLASS_MISMATCH", "Critical",
      `${evidence.environmentClass}!=${environmentClass}`));
  }
  if (environmentClass === "local_demo"
    && Object.values(evidence).some((value) => value === "production")) {
    findings.push(finding("LOCAL_DEMO_PRODUCTION_LABEL", "Medium",
      "local evidence contains a production label"));
  }
  if (environmentClass === "training_eligible_run"
    && evidence.productionRoomReady === true) {
    findings.push(finding("TRAINING_AND_ROOM_READINESS_CONFLATED", "Medium",
      "training approval does not turn an experiment into a production room"));
  }
  const blocking = findings.filter((entry) => entry.integrationBlocking);
  const body = {
    schemaVersion: `${STARCRAFT_TMG_ENVIRONMENT_READINESS_VERSION}.assessment`,
    environmentId,
    environmentClass,
    level: CLASS_LEVEL[environmentClass],
    capabilities: [...CAPABILITIES[environmentClass]],
    evidence,
    findings,
    counts: {
      critical: findings.filter((entry) => entry.severity === "Critical").length,
      high: findings.filter((entry) => entry.severity === "High").length,
      medium: findings.filter((entry) => entry.severity === "Medium").length,
      blocking: blocking.length,
    },
    ready: blocking.length === 0,
    productionRoomReady: environmentClass === "production_room"
      && blocking.length === 0,
    trainingEligible: environmentClass === "training_eligible_run"
      && blocking.length === 0,
    implicitEscalationAllowed: false,
    trainingTruth: false,
  };
  return deepFreeze({
    ...body,
    assessmentHash: hashStarcraftTmgContract(body),
  });
}

export function authorizeStarcraftTmgEnvironmentCapabilityV1(input = {}) {
  const assessment = input.assessment;
  const capability = required(input.capability, "capability");
  if (!object(assessment)
    || assessment.schemaVersion
      !== `${STARCRAFT_TMG_ENVIRONMENT_READINESS_VERSION}.assessment`) {
    throw new TypeError("environment assessment is invalid");
  }
  const { assessmentHash, ...body } = clone(assessment);
  if (hashStarcraftTmgContract(body) !== assessmentHash) {
    throw new Error("ENVIRONMENT_ASSESSMENT_TAMPERED");
  }
  const allowed = assessment.ready === true
    && assessment.capabilities.includes(capability);
  return deepFreeze({
    schemaVersion: `${STARCRAFT_TMG_ENVIRONMENT_READINESS_VERSION}.capability-decision`,
    environmentId: assessment.environmentId,
    environmentClass: assessment.environmentClass,
    assessmentHash,
    capability,
    allowed,
    reason: allowed ? null
      : assessment.ready !== true ? "ENVIRONMENT_NOT_READY"
        : "CAPABILITY_NOT_GRANTED_TO_ENVIRONMENT_CLASS",
    implicitEscalationAllowed: false,
    trainingTruth: false,
  });
}

