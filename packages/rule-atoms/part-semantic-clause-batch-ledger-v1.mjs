import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { createPartSemanticClauseLedger } from "./part-semantic-clause-ledger-v1.mjs";
import { verifyPartSemanticBatchPlan } from "./part-semantic-review-batch-plan-v1.mjs";

const LEDGER_SCHEMA = "starcraft_tmg_part_semantic_clause_batch_ledger_v1";
const BINDING_SCHEMA = "starcraft_tmg_part_semantic_clause_batch_review_binding_v1";
const MERGE_STATUS_SCHEMA = "starcraft_tmg_part_semantic_full_merge_status_v1";
const MERGE_SCHEMA = "starcraft_tmg_part_semantic_batch_merge_v1";
const DENOMINATOR_SCHEMA = "starcraft_tmg_core_clause_candidate_denominator_v1";
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const NON_EXECUTABLE_DISPOSITIONS = Object.freeze([
  "display_only",
  "review_required",
  "quarantined",
]);
const SEMANTIC_CLASSES = Object.freeze([
  "classification",
  "constraint",
  "cross_reference",
  "definition",
  "example",
  "permission",
  "priority",
  "rationale",
  "rule_summary",
  "terminology_note",
  "timing",
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredText(value, code) {
  const normalized = String(value || "").trim();
  if (!normalized) fail(code);
  return normalized;
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function assertDenominator(denominator) {
  if (!object(denominator) || denominator.schema !== DENOMINATOR_SCHEMA) {
    fail("part_semantic_batch_denominator_invalid");
  }
  if (hashStarcraftTmgContract(without(denominator, ["denominatorHash"]))
    !== denominator.denominatorHash) {
    fail("part_semantic_batch_denominator_hash_mismatch");
  }
  if (!Array.isArray(denominator.anchorRegions)
    || !Array.isArray(denominator.clauseCandidates)
    || denominator.canonicalClauseCount !== null
    || denominator.rulesEligible !== false) {
    fail("part_semantic_batch_denominator_premature_or_incomplete_contract");
  }
}

function assertBatchPlan(denominator, batchPlan) {
  verifyPartSemanticBatchPlan({ denominator, plan: batchPlan });
}

function findPlannedBatch(batchPlan, batchId) {
  const batch = batchPlan.batches.find((entry) => entry.batchId === batchId);
  if (!batch) fail("part_semantic_batch_not_planned", batchId);
  return batch;
}

function normalizeBinding(reviewedBinding, denominator, batchPlan) {
  if (!object(reviewedBinding) || reviewedBinding.schema !== BINDING_SCHEMA) {
    fail("part_semantic_batch_reviewed_binding_invalid");
  }
  const sourcePart = requiredText(
    reviewedBinding.sourcePart,
    "part_semantic_batch_source_part_required",
  );
  const batchId = requiredText(reviewedBinding.batchId, "part_semantic_batch_id_required");
  const plannedBatch = findPlannedBatch(batchPlan, batchId);
  if (sourcePart !== batchPlan.sourcePart
    || reviewedBinding.coreClauseCandidateDenominatorHash !== denominator.denominatorHash
    || reviewedBinding.reviewPacketHash !== batchPlan.reviewPacketHash
    || reviewedBinding.batchPlanHash !== batchPlan.batchPlanHash) {
    fail("part_semantic_batch_binding_dependency_mismatch");
  }
  if (!Array.isArray(reviewedBinding.anchorIds)
    || JSON.stringify(reviewedBinding.anchorIds) !== JSON.stringify(plannedBatch.anchorIds)) {
    fail("part_semantic_batch_binding_anchor_scope_mismatch", batchId);
  }
  const reviewMethod = requiredText(
    reviewedBinding.reviewMethod,
    "part_semantic_batch_review_method_required",
  );
  const reviewAuthority = requiredText(
    reviewedBinding.reviewAuthority,
    "part_semantic_batch_review_authority_required",
  );
  if (reviewAuthority !== "development_evidence_only") {
    fail("part_semantic_batch_review_authority_invalid");
  }
  if (!Array.isArray(reviewedBinding.clauses) || reviewedBinding.clauses.length === 0) {
    fail("part_semantic_batch_reviewed_clauses_required");
  }
  const clauses = reviewedBinding.clauses.map((raw) => {
    if (!object(raw)) fail("part_semantic_batch_reviewed_clause_invalid");
    if (Object.hasOwn(raw, "text") || Object.hasOwn(raw, "excerpt")) {
      fail("copyrighted_rule_text_embedded");
    }
    const disposition = requiredText(raw.disposition, "part_semantic_batch_disposition_required");
    if (!NON_EXECUTABLE_DISPOSITIONS.includes(disposition)) {
      fail("part_semantic_batch_executable_disposition_forbidden", disposition);
    }
    const semanticClass = requiredText(raw.semanticClass, "part_semantic_batch_class_required");
    if (!SEMANTIC_CLASSES.includes(semanticClass)) {
      fail("part_semantic_batch_class_invalid", semanticClass);
    }
    const candidateOrdinalStart = Number(raw.candidateOrdinalStart);
    const candidateOrdinalEnd = Number(raw.candidateOrdinalEnd);
    if (!Number.isInteger(candidateOrdinalStart)
      || !Number.isInteger(candidateOrdinalEnd)
      || candidateOrdinalStart < 1
      || candidateOrdinalEnd < candidateOrdinalStart) {
      fail("part_semantic_batch_candidate_range_invalid", String(raw.clauseId || ""));
    }
    return {
      clauseId: requiredText(raw.clauseId, "part_semantic_batch_clause_id_required"),
      anchorId: requiredText(raw.anchorId, "part_semantic_batch_anchor_id_required"),
      candidateOrdinalStart,
      candidateOrdinalEnd,
      semanticClass,
      title: requiredText(raw.title, "part_semantic_batch_clause_title_required"),
      disposition,
      reasonCode: requiredText(raw.reasonCode, "part_semantic_batch_reason_code_required"),
    };
  });
  const clauseIds = clauses.map((clause) => clause.clauseId);
  if (new Set(clauseIds).size !== clauseIds.length) {
    fail("part_semantic_batch_duplicate_clause_id");
  }
  return {
    schema: BINDING_SCHEMA,
    sourcePart,
    batchId,
    coreClauseCandidateDenominatorHash: denominator.denominatorHash,
    reviewPacketHash: batchPlan.reviewPacketHash,
    batchPlanHash: batchPlan.batchPlanHash,
    anchorIds: [...plannedBatch.anchorIds],
    reviewMethod,
    reviewAuthority,
    clauses,
  };
}

function createCanonicalClauses(denominator, binding) {
  const anchorIdSet = new Set(binding.anchorIds);
  const regions = binding.anchorIds.map((anchorId) => (
    denominator.anchorRegions.find((region) => region.anchorId === anchorId)
  ));
  if (regions.some((region) => !region || region.sourcePart !== binding.sourcePart)) {
    fail("part_semantic_batch_anchor_scope_invalid", binding.batchId);
  }
  const regionById = new Map(regions.map((region) => [region.anchorId, region]));
  const regionOrder = new Map(regions.map((region, index) => [region.anchorId, index]));
  const candidateById = new Map(denominator.clauseCandidates
    .map((candidate) => [candidate.clauseCandidateId, candidate]));
  for (const clause of binding.clauses) {
    if (!anchorIdSet.has(clause.anchorId)) {
      fail("part_semantic_batch_clause_anchor_out_of_scope", clause.anchorId);
    }
  }
  const orderedBindingClauses = [...binding.clauses].sort((left, right) => (
    regionOrder.get(left.anchorId) - regionOrder.get(right.anchorId)
      || left.candidateOrdinalStart - right.candidateOrdinalStart
      || left.clauseId.localeCompare(right.clauseId)
  ));
  const canonicalClauses = orderedBindingClauses.map((reviewedClause) => {
    const region = regionById.get(reviewedClause.anchorId);
    if (reviewedClause.candidateOrdinalEnd > region.candidateClauseCount) {
      fail("part_semantic_batch_candidate_range_out_of_bounds", reviewedClause.clauseId);
    }
    const candidateIds = region.candidateClauseIds.slice(
      reviewedClause.candidateOrdinalStart - 1,
      reviewedClause.candidateOrdinalEnd,
    );
    const candidates = candidateIds.map((candidateId) => candidateById.get(candidateId));
    if (candidates.some((candidate) => !candidate)) {
      fail("part_semantic_batch_candidate_missing", reviewedClause.clauseId);
    }
    const candidateOrdinals = candidates.map((candidate) => candidate.locator.anchorClauseOrdinal);
    const sourceTextHashes = candidates.map((candidate) => candidate.sourceTextHash);
    return {
      clauseId: reviewedClause.clauseId,
      sourcePart: binding.sourcePart,
      batchId: binding.batchId,
      anchorId: region.anchorId,
      sourceAnchorId: region.sourceAnchorId,
      sourceSnapshotId: candidates[0].sourceSnapshotId,
      sourceContentHash: candidates[0].sourceContentHash,
      authority: "official_primary",
      locator: {
        pdfPage: candidates[0].locator.anchorPdfPage,
        anchorLineOrdinal: candidates[0].locator.anchorLineOrdinal,
        candidateOrdinalStart: reviewedClause.candidateOrdinalStart,
        candidateOrdinalEnd: reviewedClause.candidateOrdinalEnd,
      },
      candidateIds,
      candidateOrdinals,
      sourceTextHashes,
      candidateSequenceHash: hashStarcraftTmgContract({ candidateIds, sourceTextHashes }),
      semanticClass: reviewedClause.semanticClass,
      title: reviewedClause.title,
      disposition: reviewedClause.disposition,
      reasonCode: reviewedClause.reasonCode,
      boundaryStatus: "reviewed_batch_semantic_boundary",
      eligibleForRuleAtomMapping: reviewedClause.disposition === "review_required",
      executable: false,
      trainingTruth: false,
    };
  });
  const expectedCandidateIds = regions.flatMap((region) => region.candidateClauseIds);
  const classifiedCandidateIds = canonicalClauses.flatMap((clause) => clause.candidateIds);
  if (JSON.stringify(classifiedCandidateIds) !== JSON.stringify(expectedCandidateIds)) {
    fail("part_semantic_batch_candidate_coverage_invalid");
  }
  return { regions, canonicalClauses, expectedCandidateIds };
}

function ledgerBody(ledger) {
  return without(ledger, ["batchLedgerHash"]);
}

export function createPartSemanticClauseBatchLedger(input = {}) {
  const { denominator, batchPlan, reviewedBinding } = input;
  assertDenominator(denominator);
  assertBatchPlan(denominator, batchPlan);
  const binding = normalizeBinding(reviewedBinding, denominator, batchPlan);
  const { regions, canonicalClauses, expectedCandidateIds } = createCanonicalClauses(
    denominator,
    binding,
  );
  const structuralContainerAnchorIds = regions
    .filter((region) => region.regionStatus === "structural_container_only")
    .map((region) => region.anchorId);
  const body = {
    schema: LEDGER_SCHEMA,
    sourcePart: binding.sourcePart,
    batchId: binding.batchId,
    sourceSnapshotId: denominator.sourceSnapshot.sourceSnapshotId,
    sourceContentHash: denominator.sourceSnapshot.contentHash,
    anchorIndexHash: denominator.anchorIndexHash,
    coreClauseCandidateDenominatorHash: denominator.denominatorHash,
    reviewPacketHash: binding.reviewPacketHash,
    batchPlanHash: binding.batchPlanHash,
    anchorIds: binding.anchorIds,
    reviewedBindingHash: hashStarcraftTmgContract(binding),
    reviewMethod: binding.reviewMethod,
    reviewAuthority: binding.reviewAuthority,
    canonicalClauses,
    structuralContainerAnchorIds,
    sourceAnchorCount: regions.length,
    clauseBearingAnchorCount: new Set(canonicalClauses.map((clause) => clause.anchorId)).size,
    sourceCandidateCount: expectedCandidateIds.length,
    batchCanonicalClauseCount: canonicalClauses.length,
    fullPartLedgerEligible: false,
    globalCoverageEligible: false,
    rulesEligible: false,
    canAffectRules: false,
    ctx2skillPromotionEligible: false,
    blocks: [
      "remaining_part_batches_pending",
      "full_part_merge_not_verified",
      "rule_atom_mapping_pending",
      "judge_and_replay_evidence_pending",
    ],
    trainingTruth: false,
  };
  return deepFreeze({ ...body, batchLedgerHash: hashStarcraftTmgContract(body) });
}

export function verifyPartSemanticClauseBatchLedger(input = {}) {
  const { denominator, batchPlan, ledger } = input;
  assertDenominator(denominator);
  assertBatchPlan(denominator, batchPlan);
  if (!object(ledger) || ledger.schema !== LEDGER_SCHEMA) {
    fail("part_semantic_batch_ledger_schema_invalid");
  }
  if (hashStarcraftTmgContract(ledgerBody(ledger)) !== ledger.batchLedgerHash) {
    fail("part_semantic_batch_ledger_hash_mismatch");
  }
  const plannedBatch = findPlannedBatch(batchPlan, ledger.batchId);
  if (ledger.sourcePart !== batchPlan.sourcePart
    || ledger.sourceSnapshotId !== denominator.sourceSnapshot.sourceSnapshotId
    || ledger.sourceContentHash !== denominator.sourceSnapshot.contentHash
    || ledger.anchorIndexHash !== denominator.anchorIndexHash
    || ledger.coreClauseCandidateDenominatorHash !== denominator.denominatorHash
    || ledger.reviewPacketHash !== batchPlan.reviewPacketHash
    || ledger.batchPlanHash !== batchPlan.batchPlanHash) {
    fail("part_semantic_batch_ledger_dependency_mismatch");
  }
  if (!Array.isArray(ledger.anchorIds)
    || JSON.stringify(ledger.anchorIds) !== JSON.stringify(plannedBatch.anchorIds)
    || !Array.isArray(ledger.canonicalClauses)
    || !Array.isArray(ledger.structuralContainerAnchorIds)) {
    fail("part_semantic_batch_ledger_scope_invalid");
  }
  const regions = plannedBatch.anchorIds.map((anchorId) => (
    denominator.anchorRegions.find((region) => region.anchorId === anchorId)
  ));
  const expectedCandidateIds = regions.flatMap((region) => region.candidateClauseIds);
  const expectedCandidateIdSet = new Set(expectedCandidateIds);
  const classifiedCandidateIds = ledger.canonicalClauses
    .flatMap((clause) => clause.candidateIds || []);
  const classifiedCandidateIdSet = new Set(classifiedCandidateIds);
  const duplicateCandidateAssignments = classifiedCandidateIds.length
    - classifiedCandidateIdSet.size;
  const unclassifiedCandidates = expectedCandidateIds
    .filter((candidateId) => !classifiedCandidateIdSet.has(candidateId)).length;
  const outOfBatchCandidateAssignments = classifiedCandidateIds
    .filter((candidateId) => !expectedCandidateIdSet.has(candidateId)).length;
  if (JSON.stringify(classifiedCandidateIds) !== JSON.stringify(expectedCandidateIds)
    || duplicateCandidateAssignments
    || unclassifiedCandidates
    || outOfBatchCandidateAssignments) {
    fail("part_semantic_batch_ledger_candidate_coverage_invalid");
  }
  const clauseIds = ledger.canonicalClauses.map((clause) => clause.clauseId);
  if (new Set(clauseIds).size !== clauseIds.length) {
    fail("part_semantic_batch_ledger_duplicate_clause_id");
  }
  const byDisposition = {
    executable: 0,
    display_only: 0,
    review_required: 0,
    quarantined: 0,
  };
  for (const clause of ledger.canonicalClauses) {
    if (Object.hasOwn(clause, "text") || Object.hasOwn(clause, "excerpt")) {
      fail("copyrighted_rule_text_embedded");
    }
    if (!Object.hasOwn(byDisposition, clause.disposition)) {
      fail("part_semantic_batch_ledger_disposition_invalid", String(clause.disposition || ""));
    }
    byDisposition[clause.disposition] += 1;
    if (clause.disposition === "executable"
      || clause.executable !== false
      || clause.trainingTruth !== false
      || Object.hasOwn(clause, "legalSpace")
      || Object.hasOwn(clause, "effect")) {
      fail("part_semantic_batch_ledger_premature_authority", clause.clauseId);
    }
  }
  const expectedStructuralContainers = regions
    .filter((region) => region.regionStatus === "structural_container_only")
    .map((region) => region.anchorId);
  if (JSON.stringify(ledger.structuralContainerAnchorIds)
    !== JSON.stringify(expectedStructuralContainers)) {
    fail("part_semantic_batch_ledger_structural_container_mismatch");
  }
  if (ledger.sourceAnchorCount !== regions.length
    || ledger.sourceCandidateCount !== expectedCandidateIds.length
    || ledger.batchCanonicalClauseCount !== ledger.canonicalClauses.length
    || ledger.fullPartLedgerEligible !== false
    || ledger.globalCoverageEligible !== false
    || ledger.rulesEligible !== false
    || ledger.canAffectRules !== false
    || ledger.ctx2skillPromotionEligible !== false
    || ledger.trainingTruth !== false) {
    fail("part_semantic_batch_ledger_status_invalid");
  }
  return deepFreeze({
    schema: "starcraft_tmg_part_semantic_clause_batch_ledger_audit_v1",
    batchLedgerHash: ledger.batchLedgerHash,
    counts: {
      sourceAnchors: regions.length,
      clauseBearingAnchors: new Set(ledger.canonicalClauses
        .map((clause) => clause.anchorId)).size,
      structuralContainers: ledger.structuralContainerAnchorIds.length,
      sourceCandidates: expectedCandidateIds.length,
      classifiedCandidates: classifiedCandidateIds.length,
      unclassifiedCandidates,
      duplicateCandidateAssignments,
      outOfBatchCandidateAssignments,
      canonicalClauses: ledger.canonicalClauses.length,
      byDisposition,
    },
    fullPartLedgerEligible: false,
    globalCoverageEligible: false,
    rulesEligible: false,
    trainingTruth: false,
  });
}

function orderedVerifiedBatchLedgers(denominator, batchPlan, batchLedgers) {
  if (!Array.isArray(batchLedgers)) fail("part_semantic_batch_ledgers_required");
  const ledgerByBatchId = new Map();
  for (const ledger of batchLedgers) {
    verifyPartSemanticClauseBatchLedger({ denominator, batchPlan, ledger });
    if (ledgerByBatchId.has(ledger.batchId)) {
      fail("part_semantic_duplicate_batch_ledger", ledger.batchId);
    }
    ledgerByBatchId.set(ledger.batchId, ledger);
  }
  return batchPlan.batches
    .filter((batch) => ledgerByBatchId.has(batch.batchId))
    .map((batch) => ledgerByBatchId.get(batch.batchId));
}

export function createPartSemanticFullMergeStatus(input = {}) {
  const { denominator, batchPlan, batchLedgers = [] } = input;
  assertDenominator(denominator);
  assertBatchPlan(denominator, batchPlan);
  const orderedLedgers = orderedVerifiedBatchLedgers(denominator, batchPlan, batchLedgers);
  const reviewedBatchIds = orderedLedgers.map((ledger) => ledger.batchId);
  const pendingBatchIds = batchPlan.batches
    .filter((batch) => !reviewedBatchIds.includes(batch.batchId))
    .map((batch) => batch.batchId);
  const reviewedAnchorCount = orderedLedgers
    .reduce((total, ledger) => total + ledger.sourceAnchorCount, 0);
  const reviewedCandidateCount = orderedLedgers
    .reduce((total, ledger) => total + ledger.sourceCandidateCount, 0);
  const reviewedCanonicalClauseCount = orderedLedgers
    .reduce((total, ledger) => total + ledger.batchCanonicalClauseCount, 0);
  const body = {
    schema: MERGE_STATUS_SCHEMA,
    sourcePart: batchPlan.sourcePart,
    sourceSnapshotId: denominator.sourceSnapshot.sourceSnapshotId,
    sourceContentHash: denominator.sourceSnapshot.contentHash,
    coreClauseCandidateDenominatorHash: denominator.denominatorHash,
    reviewPacketHash: batchPlan.reviewPacketHash,
    batchPlanHash: batchPlan.batchPlanHash,
    reviewedBatchIds,
    pendingBatchIds,
    batchLedgers: orderedLedgers.map((ledger) => ({
      batchId: ledger.batchId,
      batchLedgerHash: ledger.batchLedgerHash,
      sourceAnchorCount: ledger.sourceAnchorCount,
      sourceCandidateCount: ledger.sourceCandidateCount,
      canonicalClauseCount: ledger.batchCanonicalClauseCount,
    })),
    counts: {
      totalBatches: batchPlan.batches.length,
      reviewedBatches: reviewedBatchIds.length,
      pendingBatches: pendingBatchIds.length,
      totalAnchors: batchPlan.sourceAnchorCount,
      reviewedAnchors: reviewedAnchorCount,
      pendingAnchors: batchPlan.sourceAnchorCount - reviewedAnchorCount,
      totalCandidates: batchPlan.sourceCandidateCount,
      reviewedCandidates: reviewedCandidateCount,
      pendingCandidates: batchPlan.sourceCandidateCount - reviewedCandidateCount,
      reviewedCanonicalClauses: reviewedCanonicalClauseCount,
    },
    fullPartMergeEligible: pendingBatchIds.length === 0,
    fullPartLedgerHash: null,
    globalCoverageEligible: false,
    rulesEligible: false,
    canAffectRules: false,
    ctx2skillPromotionEligible: false,
    blocks: [
      ...(pendingBatchIds.length > 0 ? ["all_batches_not_reviewed"] : []),
      "full_part_merge_not_verified",
      "rule_atom_mapping_pending",
      "judge_and_replay_evidence_pending",
    ],
    trainingTruth: false,
  };
  return deepFreeze({ ...body, mergeStatusHash: hashStarcraftTmgContract(body) });
}

export function mergePartSemanticBatchLedgers(input = {}) {
  const { denominator, batchPlan, batchLedgers = [] } = input;
  const mergeStatus = createPartSemanticFullMergeStatus({
    denominator,
    batchPlan,
    batchLedgers,
  });
  if (!mergeStatus.fullPartMergeEligible) {
    fail("part_semantic_full_merge_incomplete", mergeStatus.pendingBatchIds.join(","));
  }
  const orderedLedgers = orderedVerifiedBatchLedgers(denominator, batchPlan, batchLedgers);
  const clauses = orderedLedgers.flatMap((ledger) => ledger.canonicalClauses.map((clause) => ({
    clauseId: clause.clauseId,
    anchorId: clause.anchorId,
    candidateOrdinalStart: clause.locator.candidateOrdinalStart,
    candidateOrdinalEnd: clause.locator.candidateOrdinalEnd,
    semanticClass: clause.semanticClass,
    title: clause.title,
    disposition: clause.disposition,
    reasonCode: clause.reasonCode,
  })));
  const fullPartLedger = createPartSemanticClauseLedger({
    denominator,
    reviewedBinding: {
      schema: "starcraft_tmg_part_semantic_clause_review_binding_v1",
      sourcePart: batchPlan.sourcePart,
      coreClauseCandidateDenominatorHash: denominator.denominatorHash,
      reviewPacketHash: batchPlan.reviewPacketHash,
      reviewMethod: "semantic_review_from_verified_batch_ledgers",
      reviewAuthority: "development_evidence_only",
      clauses,
    },
  });
  const body = {
    schema: MERGE_SCHEMA,
    sourcePart: batchPlan.sourcePart,
    coreClauseCandidateDenominatorHash: denominator.denominatorHash,
    reviewPacketHash: batchPlan.reviewPacketHash,
    batchPlanHash: batchPlan.batchPlanHash,
    batchLedgerHashes: orderedLedgers.map((ledger) => ledger.batchLedgerHash),
    fullPartLedger,
    fullPartLedgerHash: fullPartLedger.ledgerHash,
    globalCoverageEligible: true,
    rulesEligible: false,
    canAffectRules: false,
    ctx2skillPromotionEligible: false,
    blocks: [
      "global_core_part_coverage_pending",
      "rule_atom_mapping_pending",
      "judge_and_replay_evidence_pending",
    ],
    trainingTruth: false,
  };
  return deepFreeze({ ...body, mergeHash: hashStarcraftTmgContract(body) });
}
