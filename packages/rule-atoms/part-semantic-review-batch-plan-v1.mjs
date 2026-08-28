import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";

const PLAN_SCHEMA = "starcraft_tmg_part_semantic_review_batch_plan_v1";
const BINDING_SCHEMA = "starcraft_tmg_part_semantic_review_batch_plan_binding_v1";
const DENOMINATOR_SCHEMA = "starcraft_tmg_core_clause_candidate_denominator_v1";
const HASH_PATTERN = /^[a-f0-9]{64}$/u;

function fail(code, detail = "") { throw new Error(detail ? `${code}:${detail}` : code); }
function object(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function without(value, keys) { return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key))); }
function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
function assertDenominator(denominator) {
  if (!object(denominator) || denominator.schema !== DENOMINATOR_SCHEMA) fail("part_semantic_batch_denominator_invalid");
  if (hashStarcraftTmgContract(without(denominator, ["denominatorHash"])) !== denominator.denominatorHash) fail("part_semantic_batch_denominator_hash_mismatch");
}
function planBody(plan) { return without(plan, ["batchPlanHash"]); }

function deriveBatches(denominator, sourcePart, rawBatches) {
  const partRegions = denominator.anchorRegions.filter((region) => region.sourcePart === sourcePart);
  const regionById = new Map(partRegions.map((region) => [region.anchorId, region]));
  const expectedAnchorIds = partRegions.map((region) => region.anchorId);
  const batches = rawBatches.map((raw) => {
    if (!object(raw) || !Array.isArray(raw.anchorIds) || raw.anchorIds.length === 0) fail("part_semantic_batch_invalid");
    const batchId = String(raw.batchId || "").trim();
    if (!batchId) fail("part_semantic_batch_id_required");
    const anchorIds = raw.anchorIds.map(String);
    const regions = anchorIds.map((anchorId) => regionById.get(anchorId));
    if (regions.some((region) => !region)) fail("part_semantic_batch_anchor_out_of_part", batchId);
    return {
      batchId,
      anchorIds,
      anchorCount: anchorIds.length,
      candidateCount: regions.reduce((total, region) => total + region.candidateClauseCount, 0),
      structuralContainerAnchorIds: regions.filter((region) => region.regionStatus === "structural_container_only").map((region) => region.anchorId),
      batchLedgerHash: null,
      globalCoverageEligible: false,
      trainingTruth: false,
    };
  });
  const batchIds = batches.map((batch) => batch.batchId);
  if (new Set(batchIds).size !== batchIds.length) fail("part_semantic_duplicate_batch_id");
  const assignedAnchorIds = batches.flatMap((batch) => batch.anchorIds);
  if (JSON.stringify(assignedAnchorIds) !== JSON.stringify(expectedAnchorIds)) fail("part_semantic_batch_anchor_partition_invalid");
  return { partRegions, batches };
}

export function createPartSemanticBatchPlan(input = {}) {
  const { denominator, reviewedPlan } = input;
  assertDenominator(denominator);
  if (!object(reviewedPlan) || reviewedPlan.schema !== BINDING_SCHEMA) fail("part_semantic_batch_plan_binding_invalid");
  const sourcePart = String(reviewedPlan.sourcePart || "").trim();
  if (reviewedPlan.coreClauseCandidateDenominatorHash !== denominator.denominatorHash || !HASH_PATTERN.test(String(reviewedPlan.reviewPacketHash || ""))) {
    fail("part_semantic_batch_plan_dependency_mismatch");
  }
  if (reviewedPlan.reviewAuthority !== "development_evidence_only") fail("part_semantic_batch_plan_authority_invalid");
  if (!Array.isArray(reviewedPlan.batches) || reviewedPlan.batches.length === 0) fail("part_semantic_batches_required");
  const { partRegions, batches } = deriveBatches(denominator, sourcePart, reviewedPlan.batches);
  const body = {
    schema: PLAN_SCHEMA,
    sourcePart,
    sourceSnapshotId: denominator.sourceSnapshot.sourceSnapshotId,
    sourceContentHash: denominator.sourceSnapshot.contentHash,
    coreClauseCandidateDenominatorHash: denominator.denominatorHash,
    reviewPacketHash: reviewedPlan.reviewPacketHash,
    reviewAuthority: reviewedPlan.reviewAuthority,
    batches,
    sourceAnchorCount: partRegions.length,
    sourceCandidateCount: partRegions.reduce((total, region) => total + region.candidateClauseCount, 0),
    completePartition: true,
    fullPartLedgerHash: null,
    globalCoverageEligible: false,
    rulesEligible: false,
    canAffectRules: false,
    ctx2skillPromotionEligible: false,
    blocks: ["all_batches_not_reviewed", "full_part_merge_not_verified", "rule_atom_mapping_pending"],
    trainingTruth: false,
  };
  return deepFreeze({ ...body, batchPlanHash: hashStarcraftTmgContract(body) });
}

export function verifyPartSemanticBatchPlan(input = {}) {
  const { denominator, plan } = input;
  assertDenominator(denominator);
  if (!object(plan) || plan.schema !== PLAN_SCHEMA) fail("part_semantic_batch_plan_schema_invalid");
  if (hashStarcraftTmgContract(planBody(plan)) !== plan.batchPlanHash) fail("part_semantic_batch_plan_hash_mismatch");
  if (plan.coreClauseCandidateDenominatorHash !== denominator.denominatorHash || plan.sourceSnapshotId !== denominator.sourceSnapshot.sourceSnapshotId || plan.sourceContentHash !== denominator.sourceSnapshot.contentHash) fail("part_semantic_batch_plan_dependency_mismatch");
  const { partRegions, batches } = deriveBatches(denominator, plan.sourcePart, plan.batches);
  if (JSON.stringify(batches) !== JSON.stringify(plan.batches)) fail("part_semantic_batch_plan_derivation_mismatch");
  const expectedCandidates = partRegions.reduce((total, region) => total + region.candidateClauseCount, 0);
  if (plan.sourceAnchorCount !== partRegions.length || plan.sourceCandidateCount !== expectedCandidates || plan.completePartition !== true || plan.fullPartLedgerHash !== null || plan.globalCoverageEligible !== false || plan.rulesEligible !== false || plan.canAffectRules !== false || plan.ctx2skillPromotionEligible !== false || plan.trainingTruth !== false) fail("part_semantic_batch_plan_status_invalid");
  return deepFreeze({
    schema: "starcraft_tmg_part_semantic_review_batch_plan_audit_v1",
    batchPlanHash: plan.batchPlanHash,
    counts: {
      batches: plan.batches.length,
      sourceAnchors: partRegions.length,
      assignedAnchors: plan.batches.reduce((total, batch) => total + batch.anchorCount, 0),
      unassignedAnchors: 0,
      duplicateAnchorAssignments: 0,
      sourceCandidates: expectedCandidates,
      assignedCandidates: plan.batches.reduce((total, batch) => total + batch.candidateCount, 0),
    },
    fullPartLedgerHash: null,
    globalCoverageEligible: false,
    rulesEligible: false,
    trainingTruth: false,
  });
}
