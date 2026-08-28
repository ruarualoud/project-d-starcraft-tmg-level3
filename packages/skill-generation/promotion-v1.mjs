import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";
import { assertStarcraftTmgSkillGenerationContract } from "./contracts-v1.mjs";
import {
  assertStarcraftTmgSkillExperimentContract,
  sealStarcraftTmgSkillExperimentContract,
} from "./experiment-contracts-v1.mjs";

export const STARCRAFT_TMG_SKILL_PROMOTION_VERSION = "starcraft_tmg_skill_promotion_v1";

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requiredString(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

function assertAdministrator(principal) {
  if (!principal?.id || principal.role !== "skill_admin" || principal.humanAuthenticated !== true) {
    throw new Error("authenticated human Skill administrator is required");
  }
  return { id: String(principal.id), role: "skill_admin", humanAuthenticated: true };
}

function validateGateSet(experiment, candidate, executionArm, receipts) {
  const required = ["schema", "provenance_fact", "semantic_judge", "heldout_drill", "cross_time_replay"];
  const byType = new Map();
  for (const receipt of receipts || []) {
    const gate = assertStarcraftTmgSkillExperimentContract(receipt, "gate-receipt");
    if (gate.experimentRef.hash !== experiment.integrity.hash || gate.candidateHash !== candidate.integrity.hash || gate.executionArm !== executionArm) {
      throw new Error("gate receipt candidate/experiment/arm binding mismatch");
    }
    if (byType.has(gate.gateType)) throw new Error(`duplicate gate receipt: ${gate.gateType}`);
    byType.set(gate.gateType, gate);
  }
  for (const gateType of required) {
    const gate = byType.get(gateType);
    if (!gate || !gate.passed || gate.evaluator.independentContext !== true) throw new Error(`promotion gate not independently passed: ${gateType}`);
  }
  const provenance = byType.get("provenance_fact");
  if (Number(provenance.metrics?.ruleAuthorityViolations || 0) !== 0) throw new Error("rule authority violation blocks promotion");
  const heldout = byType.get("heldout_drill");
  if (Number(heldout.metrics?.caseCount || 0) < experiment.evaluationPolicy.minimumHeldoutCases
    || Number(heldout.metrics?.legalityRegressions || 0) !== 0) throw new Error("held-out denominator/regression gate failed");
  const crossTime = byType.get("cross_time_replay");
  if (crossTime.metrics?.replayPassed !== true || Number(crossTime.metrics?.regressions || 0) !== 0) throw new Error("Cross-Time replay gate failed");
  return byType;
}

function candidateExecutionArm(experiment, candidate) {
  if (candidate.jobRef.hash === experiment.candidateJobs.dsh.hash) return "dsh";
  if (candidate.jobRef.hash === experiment.candidateJobs.directProviderControl.hash) return "direct_provider_control";
  throw new Error("candidate job is outside experiment pair");
}

function activeEntries(previousSnapshot) {
  if (!previousSnapshot) return [];
  const snapshot = assertStarcraftTmgSkillExperimentContract(previousSnapshot, "runtime-skill-snapshot");
  return clone(snapshot.skillEntries || []);
}

export function promoteStarcraftTmgSkillCandidate(input = {}) {
  const experiment = assertStarcraftTmgSkillExperimentContract(input.experimentManifest, "experiment-manifest");
  const candidate = assertStarcraftTmgSkillGenerationContract(input.candidateBundle, "candidate-skill-bundle");
  const runReceipt = assertStarcraftTmgSkillGenerationContract(input.runReceipt, "run-receipt");
  const executionArm = candidateExecutionArm(experiment, candidate);
  if (runReceipt.candidateBundleHash !== candidate.integrity.hash || runReceipt.jobRef.hash !== candidate.jobRef.hash
    || runReceipt.disposition !== "candidate_emitted") throw new Error("candidate run receipt binding mismatch");
  validateGateSet(experiment, candidate, executionArm, input.gateReceipts);
  const paired = assertStarcraftTmgSkillExperimentContract(input.pairedComparison, "paired-comparison");
  if (paired.experimentRef.hash !== experiment.integrity.hash || paired.armLabelsBlindedDuringJudging !== true
    || paired.qualityNoninferiorityPassed !== true || paired.winnerCandidateHash !== candidate.integrity.hash
    || paired.legalityRegressions !== 0 || paired.ruleAuthorityViolations !== 0
    || paired.heldoutCaseCount < experiment.evaluationPolicy.minimumHeldoutCases) {
    throw new Error("paired quality gate did not select this candidate safely");
  }
  const administrator = assertAdministrator(input.administratorPrincipal);
  if (input.decision !== "promote") throw new Error("explicit promote decision is required");
  const previousSnapshot = input.previousSnapshot
    ? assertStarcraftTmgSkillExperimentContract(input.previousSnapshot, "runtime-skill-snapshot")
    : null;
  if (previousSnapshot && (previousSnapshot.rulesVersion !== experiment.runtimeBinding.rulesVersion
    || previousSnapshot.dataVersion !== experiment.runtimeBinding.dataVersion
    || previousSnapshot.sourceSnapshotSetHash !== experiment.runtimeBinding.sourceSnapshotSetHash)) {
    throw new Error("previous runtime snapshot binding differs from experiment");
  }
  const promotedArtifact = {
    ...clone(candidate.skillArtifact),
    status: "human_reviewed",
    humanReviewed: true,
    canAffectStrategy: candidate.skillArtifact.skillType === "strategy",
    canAffectRules: false,
    trainingTruth: false,
  };
  const entries = activeEntries(previousSnapshot)
    .filter((entry) => entry.skillArtifact.skillId !== promotedArtifact.skillId);
  const superseded = activeEntries(previousSnapshot)
    .find((entry) => entry.skillArtifact.skillId === promotedArtifact.skillId) || null;
  entries.push({
    candidateHash: candidate.integrity.hash,
    executionArm,
    skillArtifact: promotedArtifact,
    supersedesCandidateHash: superseded?.candidateHash || null,
    promotionEvidenceHash: hashStarcraftTmgContract({
      gates: input.gateReceipts.map((receipt) => receipt.integrity.hash),
      paired: paired.integrity.hash,
      administrator: administrator.id,
    }),
  });
  entries.sort((left, right) => left.skillArtifact.skillId.localeCompare(right.skillArtifact.skillId));
  const promotedAt = new Date(input.promotedAt).toISOString();
  const snapshot = sealStarcraftTmgSkillExperimentContract("runtime-skill-snapshot", {
    snapshotId: requiredString(input.snapshotId, "snapshotId"),
    gameId: "starcraft-tmg",
    rulesVersion: experiment.runtimeBinding.rulesVersion,
    dataVersion: experiment.runtimeBinding.dataVersion,
    sourceSnapshotSetHash: experiment.runtimeBinding.sourceSnapshotSetHash,
    previousSnapshotRef: previousSnapshot ? { id: previousSnapshot.snapshotId, hash: previousSnapshot.integrity.hash } : null,
    skillEntries: entries,
    skillSetHash: hashStarcraftTmgContract(entries),
    promotedAt,
    promotedBy: administrator.id,
    runtimeMayRead: true,
    canAffectRules: false,
    trainingTruth: false,
    productionReady: false,
  });
  const promotionReceipt = sealStarcraftTmgSkillExperimentContract("promotion-receipt", {
    experimentRef: { id: experiment.experimentId, hash: experiment.integrity.hash },
    candidateHash: candidate.integrity.hash,
    runReceiptHash: runReceipt.integrity.hash,
    gateReceiptHashes: input.gateReceipts.map((receipt) => receipt.integrity.hash),
    pairedComparisonHash: paired.integrity.hash,
    previousSnapshotRef: snapshot.previousSnapshotRef,
    newSnapshotRef: { id: snapshot.snapshotId, hash: snapshot.integrity.hash },
    administrator,
    decision: "promote",
    reviewNotes: requiredString(input.reviewNotes, "reviewNotes"),
    promotedAt,
    automaticPromotion: false,
    canAffectRules: false,
    trainingTruth: false,
    productionReady: false,
  });
  return deepFreeze({
    ok: true,
    snapshot,
    promotionReceipt,
    rollbackTarget: snapshot.previousSnapshotRef,
    productionReady: false,
    trainingTruth: false,
  });
}

export function rollbackStarcraftTmgSkillSnapshot(input = {}) {
  const current = assertStarcraftTmgSkillExperimentContract(input.currentSnapshot, "runtime-skill-snapshot");
  const target = assertStarcraftTmgSkillExperimentContract(input.targetSnapshot, "runtime-skill-snapshot");
  const administrator = assertAdministrator(input.administratorPrincipal);
  if (!current.previousSnapshotRef || current.previousSnapshotRef.hash !== target.integrity.hash) throw new Error("rollback target is not the current snapshot predecessor");
  const rolledBackAt = new Date(input.rolledBackAt).toISOString();
  const receipt = sealStarcraftTmgSkillExperimentContract("rollback-receipt", {
    fromSnapshotRef: { id: current.snapshotId, hash: current.integrity.hash },
    toSnapshotRef: { id: target.snapshotId, hash: target.integrity.hash },
    administrator,
    reason: requiredString(input.reason, "reason"),
    rolledBackAt,
    runtimeMutationPerformed: false,
    requiresRegistryPointerCas: true,
    canAffectRules: false,
    trainingTruth: false,
  });
  return deepFreeze({ ok: true, targetSnapshot: target, rollbackReceipt: receipt, requiresRegistryPointerCas: true, trainingTruth: false });
}
