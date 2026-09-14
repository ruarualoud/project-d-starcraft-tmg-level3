import { clone, fail, freeze, hash, seal } from "../skill-production/common.mjs";

export const STARCRAFT_TMG_INCREMENTAL_SKILL_FRESHNESS_VERSION =
  "starcraft_tmg_incremental_skill_freshness_v1";

const KINDS = new Set(["source", "fact", "claim", "section", "skill", "regression"]);
const BLOCKING_SEVERITY = new Set(["critical", "high"]);

function required(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) fail("SKILL_FRESHNESS_FIELD_REQUIRED", { field });
  return normalized;
}

function key(artifactId, version) {
  return `${artifactId}@${version}`;
}

function dependency(value) {
  return freeze({
    artifactId: required(value?.artifactId, "dependency.artifactId"),
    version: required(value?.version, "dependency.version"),
  });
}

function normalizeArtifact(input) {
  const kind = required(input?.kind, "kind");
  if (!KINDS.has(kind)) fail("SKILL_FRESHNESS_KIND_INVALID", { kind });
  const artifact = {
    artifactId: required(input.artifactId, "artifactId"),
    kind,
    version: required(input.version, "version"),
    dependencies: (input.dependencies || []).map(dependency),
    contentRef: input.contentRef ? clone(input.contentRef) : null,
    status: required(input.status || "available", "status"),
    createdAt: required(input.createdAt || new Date().toISOString(), "createdAt"),
    rulesAuthority: kind === "source" || kind === "fact"
      ? Boolean(input.rulesAuthority) : false,
    trainingTruth: false,
  };
  return freeze({ ...artifact, versionIdentity: hash(artifact) });
}

export function createStarcraftTmgIncrementalSkillFreshnessRuntimeV1(input = {}) {
  const versions = new Map();
  const active = new Map();
  const plans = new Map();
  const regressions = new Map();
  const registryHistory = new Map([[0, new Map()]]);
  let registryRevision = 0;

  function register(inputArtifact = {}) {
    const artifact = normalizeArtifact(inputArtifact);
    const identity = key(artifact.artifactId, artifact.version);
    const existing = versions.get(identity);
    if (existing && existing.versionIdentity !== artifact.versionIdentity) {
      fail("SKILL_FRESHNESS_VERSION_IDENTITY_DRIFT", { identity });
    }
    for (const ref of artifact.dependencies) {
      if (!versions.has(key(ref.artifactId, ref.version))) {
        fail("SKILL_FRESHNESS_DEPENDENCY_VERSION_MISSING", { dependency: ref });
      }
    }
    versions.set(identity, artifact);
    if (inputArtifact.activate === true) active.set(artifact.artifactId, artifact.version);
    return artifact;
  }

  function currentArtifacts() {
    return [...active.entries()].map(([artifactId, version]) =>
      versions.get(key(artifactId, version))).filter(Boolean);
  }

  function reverseDependents() {
    const reverse = new Map();
    for (const artifact of currentArtifacts()) {
      for (const ref of artifact.dependencies) {
        const dependencyKey = key(ref.artifactId, ref.version);
        const rows = reverse.get(dependencyKey) || [];
        rows.push(artifact);
        reverse.set(dependencyKey, rows);
      }
    }
    return reverse;
  }

  function planRefresh(request = {}) {
    if (request.confirmedByHuman !== true || !Array.isArray(request.changes)
      || !request.changes.length) {
      fail("SKILL_FRESHNESS_MANUAL_CHANGESET_REQUIRED");
    }
    const changes = request.changes.map((change) => ({
      artifactId: required(change.artifactId, "change.artifactId"),
      fromVersion: required(change.fromVersion, "change.fromVersion"),
      toVersion: required(change.toVersion, "change.toVersion"),
    }));
    const changedKeys = changes.map((change) => key(change.artifactId,
      change.fromVersion));
    for (const change of changes) {
      if (active.get(change.artifactId) !== change.fromVersion
        || !versions.has(key(change.artifactId, change.toVersion))) {
        fail("SKILL_FRESHNESS_CHANGESET_VERSION_INVALID", { change });
      }
    }
    const reverse = reverseDependents();
    const affectedKeys = new Set(changedKeys);
    const queue = [...changedKeys];
    while (queue.length) {
      const dependencyKey = queue.shift();
      for (const dependent of reverse.get(dependencyKey) || []) {
        const dependentKey = key(dependent.artifactId, dependent.version);
        if (!affectedKeys.has(dependentKey)) {
          affectedKeys.add(dependentKey);
          queue.push(dependentKey);
        }
      }
    }
    const affected = currentArtifacts().filter((artifact) =>
      affectedKeys.has(key(artifact.artifactId, artifact.version)));
    const unaffected = currentArtifacts().filter((artifact) =>
      !affectedKeys.has(key(artifact.artifactId, artifact.version)));
    const planId = required(request.planId || `freshness-${hash({
      changes, registryRevision,
    }).slice(0, 16)}`, "planId");
    const plan = seal({
      schema: `${STARCRAFT_TMG_INCREMENTAL_SKILL_FRESHNESS_VERSION}.plan`,
      planId,
      baseRegistryRevision: registryRevision,
      changes,
      affectedVersions: affected.map((artifact) => ({
        artifactId: artifact.artifactId,
        kind: artifact.kind,
        version: artifact.version,
      })),
      reusableUnchangedVersions: unaffected.map((artifact) => ({
        artifactId: artifact.artifactId,
        kind: artifact.kind,
        version: artifact.version,
      })),
      affectedSkillIds: affected.filter((artifact) => artifact.kind === "skill")
        .map((artifact) => artifact.artifactId),
      requiredRegressionIds: affected.filter((artifact) =>
        artifact.kind === "regression").map((artifact) => artifact.artifactId),
      regenerationPolicy: "affected_subgraph_only",
      oldVersionsPreserved: true,
      automaticPublication: false,
      trainingTruth: false,
    });
    if (plans.has(planId) && plans.get(planId).hash !== plan.hash) {
      fail("SKILL_FRESHNESS_PLAN_ID_DRIFT", { planId });
    }
    plans.set(planId, plan);
    regressions.set(planId, new Map());
    return plan;
  }

  function recordRegression(input = {}) {
    const plan = plans.get(required(input.planId, "planId"));
    if (!plan) fail("SKILL_FRESHNESS_PLAN_NOT_FOUND");
    const regressionId = required(input.regressionId, "regressionId");
    if (!plan.requiredRegressionIds.includes(regressionId)) {
      fail("SKILL_FRESHNESS_REGRESSION_OUTSIDE_AFFECTED_SUBGRAPH", { regressionId });
    }
    const severity = required(input.severity, "severity").toLowerCase();
    if (!["critical", "high", "medium", "important", "low"].includes(severity)) {
      fail("SKILL_FRESHNESS_REGRESSION_SEVERITY_INVALID");
    }
    const status = required(input.status, "status");
    if (!["passed", "failed"].includes(status)) {
      fail("SKILL_FRESHNESS_REGRESSION_STATUS_INVALID");
    }
    const receipt = freeze({ regressionId, severity, status,
      evidenceRef: clone(input.evidenceRef || null), trainingTruth: false });
    regressions.get(plan.planId).set(regressionId, receipt);
    return receipt;
  }

  function publishSelective(input = {}) {
    if (input.confirmedByHuman !== true) {
      fail("SKILL_FRESHNESS_PUBLICATION_CONFIRMATION_REQUIRED");
    }
    const plan = plans.get(required(input.planId, "planId"));
    if (!plan || plan.baseRegistryRevision !== registryRevision) {
      fail("SKILL_FRESHNESS_PLAN_STALE");
    }
    const results = regressions.get(plan.planId) || new Map();
    const missing = plan.requiredRegressionIds.filter((id) => !results.has(id));
    const blocking = [...results.values()].filter((row) =>
      row.status === "failed" && BLOCKING_SEVERITY.has(row.severity));
    if (missing.length || blocking.length) {
      fail("SKILL_FRESHNESS_REGRESSION_GATE_BLOCKED", {
        missingRegressionIds: missing,
        blockingRegressionIds: blocking.map((row) => row.regressionId),
      });
    }
    const replacements = (input.replacements || []).map((replacement) => ({
      artifactId: required(replacement.artifactId, "replacement.artifactId"),
      fromVersion: required(replacement.fromVersion, "replacement.fromVersion"),
      toVersion: required(replacement.toVersion, "replacement.toVersion"),
    }));
    if (!replacements.length) fail("SKILL_FRESHNESS_REPLACEMENTS_REQUIRED");
    for (const replacement of replacements) {
      if (active.get(replacement.artifactId) !== replacement.fromVersion
        || !versions.has(key(replacement.artifactId, replacement.toVersion))) {
        fail("SKILL_FRESHNESS_REPLACEMENT_INVALID", { replacement });
      }
      if (!plan.affectedVersions.some((row) =>
        row.artifactId === replacement.artifactId
        && row.version === replacement.fromVersion)) {
        fail("SKILL_FRESHNESS_REPLACEMENT_OUTSIDE_PLAN", { replacement });
      }
    }
    const previousRegistryRevision = registryRevision;
    for (const replacement of replacements) {
      active.set(replacement.artifactId, replacement.toVersion);
    }
    registryRevision += 1;
    registryHistory.set(registryRevision, new Map(active));
    return seal({
      schema: `${STARCRAFT_TMG_INCREMENTAL_SKILL_FRESHNESS_VERSION}.publication`,
      planId: plan.planId,
      previousRegistryRevision,
      registryRevision,
      replacements,
      retainedUnchangedCount: plan.reusableUnchangedVersions.length,
      mediumImportantFindingsTracked: [...results.values()].filter((row) =>
        row.status === "failed" && ["medium", "important"].includes(row.severity))
        .map((row) => row.regressionId),
      oldVersionsPreserved: true,
      automaticPublication: false,
      trainingTruth: false,
    });
  }

  function rollback(input = {}) {
    if (input.confirmedByHuman !== true) {
      fail("SKILL_FRESHNESS_ROLLBACK_CONFIRMATION_REQUIRED");
    }
    const targetRegistryRevision = Number(input.targetRegistryRevision);
    const target = registryHistory.get(targetRegistryRevision);
    if (!target) fail("SKILL_FRESHNESS_ROLLBACK_TARGET_NOT_FOUND");
    const previousRegistryRevision = registryRevision;
    registryRevision += 1;
    active.clear();
    for (const [artifactId, version] of target) active.set(artifactId, version);
    registryHistory.set(registryRevision, new Map(active));
    return seal({
      schema: `${STARCRAFT_TMG_INCREMENTAL_SKILL_FRESHNESS_VERSION}.rollback`,
      previousRegistryRevision,
      targetRegistryRevision,
      registryRevision,
      activeVersions: Object.fromEntries(active),
      oldVersionsPreserved: true,
      trainingTruth: false,
    });
  }

  function readVersion(input = {}) {
    return versions.get(key(required(input.artifactId, "artifactId"),
      required(input.version, "version"))) || null;
  }

  function read() {
    return seal({
      schema: `${STARCRAFT_TMG_INCREMENTAL_SKILL_FRESHNESS_VERSION}.projection`,
      registryRevision,
      activeVersions: Object.fromEntries(active),
      versionCount: versions.size,
      planCount: plans.size,
      historicalVersionsPreserved: true,
      sourceToSkillDependencyPath: ["source", "fact", "claim", "section", "skill"],
      refreshPolicy: "explicit_change_then_affected_subgraph_only",
      regressionPolicy: "critical_high_block_medium_important_track",
      automaticNetworkRefresh: false,
      automaticPublication: false,
      trainingTruth: false,
    });
  }

  if (Array.isArray(input.artifacts)) {
    for (const artifact of input.artifacts) register(artifact);
    registryHistory.set(0, new Map(active));
  }
  return freeze({ register, planRefresh, recordRegression, publishSelective,
    rollback, readVersion, read });
}
