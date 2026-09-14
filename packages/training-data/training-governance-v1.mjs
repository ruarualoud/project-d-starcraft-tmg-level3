import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const STARCRAFT_TMG_TRAINING_GOVERNANCE_VERSION =
  "starcraft_tmg_training_governance_v1";
export const STARCRAFT_TMG_DATASET_SPLIT_MANIFEST_VERSION =
  "starcraft_tmg_dataset_split_manifest_v1";
export const STARCRAFT_TMG_REANALYSIS_REQUEST_VERSION =
  "starcraft_tmg_reanalysis_request_v1";

const BLOCKING_SEVERITIES = new Set(["Critical", "High"]);
const PARTITIONS = new Set(["train", "validation", "test"]);
const LEAKAGE_AXES = Object.freeze([
  "runFamilyId",
  "seedFamilyId",
  "mirrorFamilyId",
  "rosterVariantFamilyId",
  "opponentSnapshotFamilyId",
]);
const PRIVATE_KEYS = new Set([
  "privateBySeat",
  "opponentPrivate",
  "opponentPrivateState",
  "authoritativeRosterRegistry",
  "authoritativeArmyRostersBySide",
]);
const FUTURE_KEYS = new Set([
  "futureEvents",
  "futureState",
  "futureOutcome",
  "postState",
  "postStateHash",
  "rewardVector",
  "scalarReward",
  "valueTarget",
  "chanceReveal",
  "journalHash",
]);
const CREDENTIAL_KEYS = /^(?:apiKey|api_key|authorization|credential|credentials|seatToken|bearerToken)$/i;
const API_KEY_VALUE = /(?:\b(?:sk|jsk)-[A-Za-z0-9_-]{12,}\b|\bbearer\s+[A-Za-z0-9._~-]{12,}\b)/i;

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function required(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new TypeError(`${field} is required`);
  return normalized;
}

function withIdentity(value, kind) {
  const body = clone(value);
  const hash = hashStarcraftTmgContract(body);
  return deepFreeze({
    ...body,
    contentIdentity: {
      schemaVersion: "starcraft_tmg_content_identity_v1",
      kind,
      algorithm: "sha256-canonical-json-v1",
      hash,
      compatibilityAuthority: false,
    },
  });
}

function finding(code, severity, path, detail) {
  return { code, severity, path, detail,
    integrationBlocking: BLOCKING_SEVERITIES.has(severity) };
}

function inspectActorValue(value, path, findings) {
  if (typeof value === "string" && API_KEY_VALUE.test(value)) {
    findings.push(finding("API_KEY_VALUE_LEAK", "Critical", path,
      "secret-like Provider credential appeared in actor input"));
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((child, index) => inspectActorValue(child,
      `${path}[${index}]`, findings));
    return;
  }
  if (!object(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (CREDENTIAL_KEYS.test(key)) {
      findings.push(finding("CREDENTIAL_FIELD_LEAK", "Critical", childPath,
        "credential-bearing field appeared in actor input"));
    }
    if (PRIVATE_KEYS.has(key)) {
      findings.push(finding("OPPONENT_PRIVATE_FIELD_LEAK", "High", childPath,
        "unprojected private state appeared in actor input"));
    }
    if (FUTURE_KEYS.has(key)) {
      findings.push(finding("FUTURE_TARGET_FIELD_LEAK", "High", childPath,
        "post-action or target field appeared in actor input"));
    }
    inspectActorValue(child, childPath, findings);
  }
}

function auditSeatProjection(step, findings) {
  const state = step.actorInput?.viewerState;
  const seatKey = step.toPlay;
  const privateMapFields = [
    "cardResources",
    "armyBuildingConfigurationBySide",
    "armyResourceBudgetsBySide",
    "unitCompositionSelectionsBySide",
    "unitUpgradeSelectionsBySide",
    "armyCompositionUpgradeAuditsBySide",
  ];
  for (const field of privateMapFields) {
    const map = state?.[field];
    if (object(map) && Object.keys(map).some((key) => key !== seatKey)) {
      findings.push(finding("OPPONENT_SEAT_MAP_LEAK", "High",
        `$.steps[${step.stepIndex}].actorInput.viewerState.${field}`,
        "seat-private map contains another seat"));
    }
  }
  for (const [index, entry] of (step.actorInput?.publicHistoryPrefix || [])
    .entries()) {
    const logicalSequence = Number(entry?.logicalSequence);
    if (Number.isSafeInteger(logicalSequence)
      && logicalSequence > step.revision.before) {
      findings.push(finding("FUTURE_HISTORY_ENTRY_LEAK", "High",
        `$.steps[${step.stepIndex}].actorInput.publicHistoryPrefix[${index}]`,
        "public history contains an event after the decision revision"));
    }
  }
}

export function createStarcraftTmgTrainingGovernanceV1(options = {}) {
  if (typeof options.trajectoryVerifier !== "function") {
    throw new TypeError("trajectoryVerifier is required");
  }
  const trajectoryVerifier = options.trajectoryVerifier;

  function auditTrajectory(trajectory) {
    const findings = [];
    try {
      trajectoryVerifier(trajectory);
    } catch (error) {
      findings.push(finding("TRAJECTORY_IDENTITY_OR_STRUCTURE_INVALID",
        "High", "$", error.message));
    }
    for (const step of trajectory?.steps || []) {
      inspectActorValue(step.actorInput,
        `$.steps[${step.stepIndex}].actorInput`, findings);
      inspectActorValue(step.recurrentState,
        `$.steps[${step.stepIndex}].recurrentState`, findings);
      auditSeatProjection(step, findings);
      if (step.actorInput?.containsFutureOutcome !== false
        || step.actorInput?.containsOpponentPrivateState !== false
        || step.recurrentState?.fullFutureOutcomeIncluded !== false) {
        findings.push(finding("INFORMATION_POLICY_FLAG_INVALID", "High",
          `$.steps[${step.stepIndex}]`,
          "information-state exclusion flags are not explicit"));
      }
      if (step.decisionBinding?.modelNarrativeIncluded === true) {
        findings.push(finding("MODEL_NARRATIVE_IN_ACTOR_BINDING", "Medium",
          `$.steps[${step.stepIndex}].decisionBinding`,
          "model narrative should remain outside the learner observation"));
      }
    }
    const blocking = findings.filter((entry) => entry.integrationBlocking);
    return deepFreeze({
      schemaVersion:
        `${STARCRAFT_TMG_TRAINING_GOVERNANCE_VERSION}.leak_audit`,
      trajectoryHash: trajectory?.contentIdentity?.hash || null,
      stepCount: trajectory?.steps?.length || 0,
      findings,
      counts: {
        total: findings.length,
        blocking: blocking.length,
        critical: findings.filter((entry) =>
          entry.severity === "Critical").length,
        high: findings.filter((entry) => entry.severity === "High").length,
        medium: findings.filter((entry) =>
          entry.severity === "Medium").length,
      },
      passed: blocking.length === 0,
      trainingTruth: false,
    });
  }

  function assessEligibility(input = {}) {
    const trajectory = input.trajectory;
    const audit = input.audit || auditTrajectory(trajectory);
    const reasons = [];
    if (!audit.passed) reasons.push("private_or_future_information_leak");
    if (trajectory?.terminal?.terminal !== true) {
      reasons.push("nonterminal_or_truncated_episode");
    }
    if (trajectory?.sourceLineage?.deterministicReplayMatchesCurrent
      !== true) reasons.push("authoritative_replay_unverified");
    if ((trajectory?.steps || []).some((step) =>
      step.source?.manualAdjudication === true)) {
      reasons.push("manual_adjudication_present");
    }
    if (!object(trajectory?.versions?.data)
      || !object(trajectory?.versions?.rules)
      || !object(trajectory?.versions?.actionSpace)) {
      reasons.push("version_lineage_incomplete");
    }
    if (input.infrastructureFailure === true) {
      reasons.push("infrastructure_failure");
    }
    const technicalEligibilityChecksPassed = reasons.length === 0;
    const approval = input.independentApproval;
    const independentTrainingApprovalPresent = object(approval)
      && approval.decision === "approved"
      && approval.trajectoryHash === trajectory?.contentIdentity?.hash
      && String(approval.approvedBy || "").trim().length > 0;
    if (!independentTrainingApprovalPresent) {
      reasons.push("independent_training_approval_missing");
    }
    return deepFreeze({
      schemaVersion:
        `${STARCRAFT_TMG_TRAINING_GOVERNANCE_VERSION}.eligibility`,
      trajectoryHash: trajectory?.contentIdentity?.hash || null,
      technicalEligibilityChecksPassed,
      independentTrainingApprovalPresent,
      eligibleForTraining: technicalEligibilityChecksPassed
        && independentTrainingApprovalPresent,
      reasons,
      automaticApproval: false,
      trainingTruth: false,
    });
  }

  function createDatasetSplitManifest(input = {}) {
    const assignments = (input.assignments || []).map((entry, index) => {
      const partition = required(entry.partition,
        `assignments[${index}].partition`);
      if (!PARTITIONS.has(partition)) {
        throw new Error(`assignments[${index}].partition is invalid`);
      }
      const splitIdentity = Object.fromEntries(LEAKAGE_AXES.map((axis) => [
        axis,
        required(entry.splitIdentity?.[axis],
          `assignments[${index}].splitIdentity.${axis}`),
      ]));
      return {
        trajectoryHash: required(entry.trajectoryHash,
          `assignments[${index}].trajectoryHash`),
        partition,
        splitIdentity,
      };
    });
    if (new Set(assignments.map((entry) => entry.trajectoryHash)).size
      !== assignments.length) {
      throw new Error("dataset split contains duplicate trajectory hashes");
    }
    for (const axis of LEAKAGE_AXES) {
      const partitionsByFamily = new Map();
      for (const assignment of assignments) {
        const family = assignment.splitIdentity[axis];
        if (!partitionsByFamily.has(family)) {
          partitionsByFamily.set(family, new Set());
        }
        partitionsByFamily.get(family).add(assignment.partition);
      }
      for (const [family, partitions] of partitionsByFamily) {
        if (partitions.size > 1) {
          throw new Error(`${axis} ${family} leaks across dataset partitions`);
        }
      }
    }
    return withIdentity({
      schemaVersion: STARCRAFT_TMG_DATASET_SPLIT_MANIFEST_VERSION,
      manifestId: required(input.manifestId, "manifestId"),
      assignments,
      partitionCounts: Object.fromEntries([...PARTITIONS].map((partition) => [
        partition,
        assignments.filter((entry) => entry.partition === partition).length,
      ])),
      leakageAxes: clone(LEAKAGE_AXES),
      crossPartitionLeakCount: 0,
      eligibleForTraining: false,
      trainingTruth: false,
    }, "dataset_split_manifest");
  }

  function createReanalysisRequest(input = {}) {
    const trajectory = input.trajectory;
    trajectoryVerifier(trajectory);
    const targetFields = [...new Set(input.targetFields || ["policy", "value"])]
      .sort();
    if (targetFields.length === 0
      || targetFields.some((field) => !["policy", "value"].includes(field))) {
      throw new Error("reanalysis may change only policy and value targets");
    }
    return withIdentity({
      schemaVersion: STARCRAFT_TMG_REANALYSIS_REQUEST_VERSION,
      requestId: required(input.requestId, "requestId"),
      sourceTrajectoryHash: trajectory.contentIdentity.hash,
      learnerVersion: required(input.learnerVersion, "learnerVersion"),
      targetFields,
      sourceObservationActionRulesChanceImmutable: true,
      newTargetVersionRequired: true,
      mayRewriteHistoricalTrajectory: false,
      eligibleForTraining: false,
      trainingTruth: false,
    }, "reanalysis_request");
  }

  return Object.freeze({
    auditTrajectory,
    assessEligibility,
    createDatasetSplitManifest,
    createReanalysisRequest,
  });
}

