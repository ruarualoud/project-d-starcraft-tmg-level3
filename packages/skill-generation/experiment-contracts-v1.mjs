import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";
import { assertStarcraftTmgSkillGenerationContract } from "./contracts-v1.mjs";

export const STARCRAFT_TMG_SKILL_EXPERIMENT_CONTRACT_VERSION = "starcraft_tmg_skill_experiment_contract_v1";

export const STARCRAFT_TMG_SKILL_EXPERIMENT_DAG_V1 = Object.freeze([
  { nodeId: "generate_dsh", dependencies: [] },
  { nodeId: "generate_control", dependencies: [] },
  { nodeId: "schema_dsh", dependencies: ["generate_dsh"] },
  { nodeId: "schema_control", dependencies: ["generate_control"] },
  { nodeId: "provenance_fact_dsh", dependencies: ["schema_dsh"] },
  { nodeId: "provenance_fact_control", dependencies: ["schema_control"] },
  { nodeId: "semantic_judge_dsh", dependencies: ["provenance_fact_dsh"] },
  { nodeId: "semantic_judge_control", dependencies: ["provenance_fact_control"] },
  { nodeId: "heldout_dsh", dependencies: ["semantic_judge_dsh"] },
  { nodeId: "heldout_control", dependencies: ["semantic_judge_control"] },
  { nodeId: "cross_time_dsh", dependencies: ["heldout_dsh"] },
  { nodeId: "cross_time_control", dependencies: ["heldout_control"] },
  { nodeId: "paired_compare", dependencies: ["cross_time_dsh", "cross_time_control"] },
  { nodeId: "admin_review", dependencies: ["paired_compare"] },
  { nodeId: "publish_snapshot", dependencies: ["admin_review"] },
]);

export const STARCRAFT_TMG_REQUIRED_PROMOTION_GATES_V1 = Object.freeze([
  "schema",
  "provenance_fact",
  "semantic_judge",
  "heldout_drill",
  "cross_time_replay",
  "paired_quality",
]);

const CONTRACT_TYPES = new Set(["experiment-manifest", "gate-receipt", "paired-comparison", "runtime-skill-snapshot", "promotion-receipt", "rollback-receipt"]);

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

function positiveInteger(value, field) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1) throw new Error(`${field} must be a positive safe integer`);
  return normalized;
}

function nonNegativeNumber(value, field) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) throw new Error(`${field} must be a non-negative finite number`);
  return normalized;
}

function seal(contractType, input = {}) {
  if (!CONTRACT_TYPES.has(contractType)) throw new Error(`unsupported Skill experiment contract type: ${contractType}`);
  const unsigned = {
    schemaVersion: STARCRAFT_TMG_SKILL_EXPERIMENT_CONTRACT_VERSION,
    contractType,
    ...clone(input),
  };
  return deepFreeze({ ...unsigned, integrity: { algorithm: "sha256", hash: hashStarcraftTmgContract(unsigned) } });
}

export function assertStarcraftTmgSkillExperimentContract(value, expectedType) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Skill experiment contract must be an object");
  if (value.schemaVersion !== STARCRAFT_TMG_SKILL_EXPERIMENT_CONTRACT_VERSION) throw new Error("Skill experiment schema mismatch");
  if (expectedType && value.contractType !== expectedType) throw new Error(`expected ${expectedType}, received ${value.contractType}`);
  if (!CONTRACT_TYPES.has(value.contractType)) throw new Error("unknown Skill experiment contract type");
  const { integrity, ...unsigned } = clone(value);
  if (integrity?.algorithm !== "sha256" || integrity.hash !== hashStarcraftTmgContract(unsigned)) throw new Error("Skill experiment integrity mismatch");
  return value;
}

function assertPairedJobs(dshJob, controlJob) {
  if (dshJob.executionArm !== "dsh" || controlJob.executionArm !== "direct_provider_control") throw new Error("paired experiment requires DSH and direct-provider control jobs");
  const equalPaths = [
    ["gameId", dshJob.gameId, controlJob.gameId],
    ["roleRoute", dshJob.roleRoute, controlJob.roleRoute],
    ["skillType", dshJob.skillType, controlJob.skillType],
    ["rulesVersion", dshJob.rulesVersion, controlJob.rulesVersion],
    ["dataVersion", dshJob.dataVersion, controlJob.dataVersion],
    ["stagedInputHash", dshJob.stagedInputHash, controlJob.stagedInputHash],
    ["existingSkillSetHash", dshJob.existingSkillSetHash, controlJob.existingSkillSetHash],
    ["promptPackRef.hash", dshJob.promptPackRef.hash, controlJob.promptPackRef.hash],
    ["providerProfileRef.hash", dshJob.providerProfileRef.hash, controlJob.providerProfileRef.hash],
    ["providerProfileRef.model", dshJob.providerProfileRef.model, controlJob.providerProfileRef.model],
    ["toolContract.schemaHash", dshJob.toolContract.schemaHash, controlJob.toolContract.schemaHash],
    ["budget.maxProviderAttempts", dshJob.budget.maxProviderAttempts, controlJob.budget.maxProviderAttempts],
    ["budget.maxInputTokens", dshJob.budget.maxInputTokens, controlJob.budget.maxInputTokens],
    ["budget.maxOutputTokens", dshJob.budget.maxOutputTokens, controlJob.budget.maxOutputTokens],
    ["budget.maxWallMs", dshJob.budget.maxWallMs, controlJob.budget.maxWallMs],
    ["budget.maxEstimatedCost", dshJob.budget.maxEstimatedCost, controlJob.budget.maxEstimatedCost],
    ["budget.priceTableVersion", dshJob.budget.priceTableVersion, controlJob.budget.priceTableVersion],
  ];
  for (const [field, left, right] of equalPaths) if (left !== right) throw new Error(`paired job mismatch: ${field}`);
  if (hashStarcraftTmgContract(dshJob.sourceSnapshotRefs) !== hashStarcraftTmgContract(controlJob.sourceSnapshotRefs)) throw new Error("paired job source snapshots differ");
  if (hashStarcraftTmgContract(dshJob.toolContract.allowlist) !== hashStarcraftTmgContract(controlJob.toolContract.allowlist)) throw new Error("paired job tool allowlists differ");
}

export function createStarcraftTmgSkillExperimentManifest(input = {}) {
  const dshJob = assertStarcraftTmgSkillGenerationContract(input.dshJobManifest, "job-manifest");
  const controlJob = assertStarcraftTmgSkillGenerationContract(input.controlJobManifest, "job-manifest");
  assertPairedJobs(dshJob, controlJob);
  const maxNodeAttempts = positiveInteger(input.schedulerPolicy?.maxNodeAttempts || 2, "schedulerPolicy.maxNodeAttempts");
  const leaseMs = positiveInteger(input.schedulerPolicy?.leaseMs || 60000, "schedulerPolicy.leaseMs");
  return seal("experiment-manifest", {
    experimentId: requiredString(input.experimentId, "experimentId"),
    gameId: "starcraft-tmg",
    objective: requiredString(input.objective, "objective"),
    candidateJobs: {
      dsh: { id: dshJob.jobId, hash: dshJob.integrity.hash },
      directProviderControl: { id: controlJob.jobId, hash: controlJob.integrity.hash },
    },
    pairedBindings: {
      stagedInputHash: dshJob.stagedInputHash,
      existingSkillSetHash: dshJob.existingSkillSetHash,
      promptPackHash: dshJob.promptPackRef.hash,
      providerProfileHash: dshJob.providerProfileRef.hash,
      model: dshJob.providerProfileRef.model,
      toolSchemaHash: dshJob.toolContract.schemaHash,
      sourceSnapshotSetHash: hashStarcraftTmgContract(dshJob.sourceSnapshotRefs),
    },
    dagVersion: "starcraft_tmg_skill_experiment_dag_v1",
    dag: clone(STARCRAFT_TMG_SKILL_EXPERIMENT_DAG_V1),
    requiredPromotionGates: clone(STARCRAFT_TMG_REQUIRED_PROMOTION_GATES_V1),
    schedulerPolicy: {
      maxNodeAttempts,
      leaseMs,
      retryableFailureClasses: ["TRANSIENT_PROVIDER", "WORKER_CRASH", "LEASE_EXPIRED"],
      internalWorkerRetryAllowed: false,
    },
    totalBudget: {
      maxNodeLeases: positiveInteger(input.totalBudget?.maxNodeLeases, "totalBudget.maxNodeLeases"),
      maxProviderAttempts: positiveInteger(input.totalBudget?.maxProviderAttempts, "totalBudget.maxProviderAttempts"),
      maxInputTokens: positiveInteger(input.totalBudget?.maxInputTokens, "totalBudget.maxInputTokens"),
      maxOutputTokens: positiveInteger(input.totalBudget?.maxOutputTokens, "totalBudget.maxOutputTokens"),
      maxWallMs: positiveInteger(input.totalBudget?.maxWallMs, "totalBudget.maxWallMs"),
      maxEstimatedCost: nonNegativeNumber(input.totalBudget?.maxEstimatedCost, "totalBudget.maxEstimatedCost"),
      currency: input.totalBudget?.currency || "USD",
      priceTableVersion: requiredString(input.totalBudget?.priceTableVersion, "totalBudget.priceTableVersion"),
    },
    evaluationPolicy: {
      minimumHeldoutCases: positiveInteger(input.evaluationPolicy?.minimumHeldoutCases, "evaluationPolicy.minimumHeldoutCases"),
      maximumLegalityRegressions: 0,
      maximumRuleAuthorityViolations: 0,
      pairedWinnerPolicy: input.evaluationPolicy?.pairedWinnerPolicy || "noninferior_quality_then_cost_latency",
      blindArmLabels: true,
      administratorPromotionRequired: true,
    },
    runtimeBinding: {
      rulesVersion: dshJob.rulesVersion,
      dataVersion: dshJob.dataVersion,
      sourceSnapshotSetHash: hashStarcraftTmgContract(dshJob.sourceSnapshotRefs),
    },
    createdAt: new Date(input.createdAt).toISOString(),
    automaticPromotionAllowed: false,
    canAffectRules: false,
    trainingTruth: false,
  });
}

export function createStarcraftTmgSkillGateReceipt(input = {}) {
  const experiment = assertStarcraftTmgSkillExperimentContract(input.experimentManifest, "experiment-manifest");
  const gateType = requiredString(input.gateType, "gateType");
  if (!STARCRAFT_TMG_REQUIRED_PROMOTION_GATES_V1.includes(gateType) || gateType === "paired_quality") throw new Error(`unsupported candidate gateType: ${gateType}`);
  return seal("gate-receipt", {
    experimentRef: { id: experiment.experimentId, hash: experiment.integrity.hash },
    gateType,
    candidateHash: requiredString(input.candidateHash, "candidateHash"),
    executionArm: requiredString(input.executionArm, "executionArm"),
    passed: input.passed === true,
    evaluator: {
      id: requiredString(input.evaluator?.id, "evaluator.id"),
      version: requiredString(input.evaluator?.version, "evaluator.version"),
      hash: requiredString(input.evaluator?.hash, "evaluator.hash"),
      independentContext: input.evaluator?.independentContext === true,
    },
    evidenceHashes: Array.isArray(input.evidenceHashes) ? input.evidenceHashes.map((hash, index) => requiredString(hash, `evidenceHashes[${index}]`)) : [],
    metrics: clone(input.metrics || {}),
    findings: clone(input.findings || []),
    evaluatedAt: new Date(input.evaluatedAt).toISOString(),
    mayAffectRules: false,
    promotionGranted: false,
    trainingTruth: false,
  });
}

export function createStarcraftTmgPairedComparisonReceipt(input = {}) {
  const experiment = assertStarcraftTmgSkillExperimentContract(input.experimentManifest, "experiment-manifest");
  const winnerCandidateHash = input.winnerCandidateHash || null;
  const candidateHashes = [requiredString(input.dshCandidateHash, "dshCandidateHash"), requiredString(input.controlCandidateHash, "controlCandidateHash")];
  if (winnerCandidateHash && !candidateHashes.includes(winnerCandidateHash)) throw new Error("paired winner is outside candidate pair");
  return seal("paired-comparison", {
    experimentRef: { id: experiment.experimentId, hash: experiment.integrity.hash },
    gateType: "paired_quality",
    armLabelsBlindedDuringJudging: input.armLabelsBlindedDuringJudging === true,
    dshCandidateHash: candidateHashes[0],
    controlCandidateHash: candidateHashes[1],
    winnerCandidateHash,
    disposition: requiredString(input.disposition, "disposition"),
    qualityNoninferiorityPassed: input.qualityNoninferiorityPassed === true,
    legalityRegressions: Number(input.legalityRegressions || 0),
    ruleAuthorityViolations: Number(input.ruleAuthorityViolations || 0),
    heldoutCaseCount: Number(input.heldoutCaseCount || 0),
    metrics: clone(input.metrics || {}),
    judgeRefs: clone(input.judgeRefs || []),
    comparedAt: new Date(input.comparedAt).toISOString(),
    promotionGranted: false,
    trainingTruth: false,
  });
}

export function sealStarcraftTmgSkillExperimentContract(contractType, input = {}) {
  return seal(contractType, input);
}
