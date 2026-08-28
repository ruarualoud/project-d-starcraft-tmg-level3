import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";

const BATCH_SCHEMA = "starcraft_tmg_global_canonical_clause_semantic_merge_batch_v1";
const BINDING_SCHEMA = "starcraft_tmg_global_canonical_clause_semantic_merge_batch_binding_v1";
const PLAN_SCHEMA = "starcraft_tmg_global_canonical_clause_merge_plan_v1";
const PREVIOUS_BATCH_SCHEMA = "starcraft_tmg_global_canonical_clause_merge_batch_v1";
const EXPANSION_SCHEMA = "starcraft_tmg_global_canonical_clause_semantic_candidate_expansion_v1";
const EXPECTED_PLAN_HASH = "8068f9635e473d3a4c72849aacb997a87365d46c8e5479d877bf1c68bbee4618";
const EXPECTED_PREVIOUS_BATCH_HASH = "f881fdc48a64f7be2506abf36e4c5d10a1c668054848a34441678ecd108c83e2";
const EXPECTED_EXPANSION_HASH = "083601ed5407d9604cde126b2375cca496e9797d9cc2ecc1325b5e84ee3eb4fd";
const DECISIONS = Object.freeze(["merge_equivalent", "keep_distinct_context"]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value, code) {
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

function sortedUniqueText(values, duplicateCode, requiredCode) {
  if (!Array.isArray(values) || values.length === 0) fail(requiredCode);
  const normalized = values.map((value) => text(value, requiredCode));
  if (new Set(normalized).size !== normalized.length) fail(duplicateCode);
  return normalized.sort((left, right) => left.localeCompare(right));
}

function verifyDependencies(plan, previousBatch, expansion) {
  if (!object(plan) || plan.schema !== PLAN_SCHEMA
    || hashStarcraftTmgContract(without(plan, ["planHash"])) !== plan.planHash
    || plan.planHash !== EXPECTED_PLAN_HASH) {
    fail("semantic_merge_batch_plan_dependency_mismatch");
  }
  if (!object(previousBatch) || previousBatch.schema !== PREVIOUS_BATCH_SCHEMA
    || hashStarcraftTmgContract(without(previousBatch, ["batchHash"])) !== previousBatch.batchHash
    || previousBatch.batchHash !== EXPECTED_PREVIOUS_BATCH_HASH
    || previousBatch.globalMergePlanHash !== plan.planHash
    || previousBatch.reviewedLocalClauseCount !== 28
    || previousBatch.remainingLocalClauseCount !== 1065) {
    fail("semantic_merge_batch_previous_batch_dependency_mismatch");
  }
  if (!object(expansion) || expansion.schema !== EXPANSION_SCHEMA
    || hashStarcraftTmgContract(without(expansion, ["expansionHash"])) !== expansion.expansionHash
    || expansion.expansionHash !== EXPECTED_EXPANSION_HASH
    || expansion.globalMergePlanHash !== plan.planHash
    || expansion.previousBatchHash !== previousBatch.batchHash
    || expansion.globalCanonicalClauseCount !== null
    || expansion.rulesEligible !== false
    || expansion.trainingTruth !== false) {
    fail("semantic_merge_batch_expansion_dependency_mismatch");
  }
}

function normalizeBinding(input) {
  const { plan, previousBatch, expansion, reviewedBinding } = input;
  if (!object(reviewedBinding) || reviewedBinding.schema !== BINDING_SCHEMA) {
    fail("semantic_merge_batch_binding_invalid");
  }
  if (reviewedBinding.globalMergePlanHash !== plan.planHash
    || reviewedBinding.previousBatchHash !== previousBatch.batchHash
    || reviewedBinding.semanticCandidateExpansionHash !== expansion.expansionHash) {
    fail("semantic_merge_batch_binding_dependency_mismatch");
  }
  if (!Array.isArray(reviewedBinding.groupDecisions)) {
    fail("semantic_merge_batch_group_decisions_required");
  }
  const groupById = new Map(expansion.candidateGroups.map((group) => [group.groupId, group]));
  const planRowById = new Map(plan.localClauseIndex.map((row) => [row.localClauseId, row]));
  const previousLocalIds = new Set(previousBatch.canonicalClauses.flatMap((clause) => (
    clause.sourceLocalClauseIds
  )));
  const previousCanonicalIds = new Set(previousBatch.canonicalClauses.map((clause) => (
    clause.canonicalClauseId
  )));
  const seenGroups = new Set();
  const seenCanonicalIds = new Set();
  const seenLocalIds = new Set();
  const decisions = [];
  const mappings = [];
  for (const rawDecision of reviewedBinding.groupDecisions) {
    if (!object(rawDecision)) fail("semantic_merge_batch_group_decision_invalid");
    const groupId = text(rawDecision.groupId, "semantic_merge_batch_group_id_required");
    const group = groupById.get(groupId);
    if (!group) fail("semantic_merge_batch_unknown_candidate_group", groupId);
    if (seenGroups.has(groupId)) {
      fail("semantic_merge_batch_duplicate_candidate_group_decision", groupId);
    }
    seenGroups.add(groupId);
    const decision = text(rawDecision.decision, "semantic_merge_batch_decision_required");
    if (!DECISIONS.includes(decision)) fail("semantic_merge_batch_decision_invalid", decision);
    const reviewBasisCode = text(
      rawDecision.reviewBasisCode,
      "semantic_merge_batch_review_basis_required",
    );
    if (!Array.isArray(rawDecision.canonicalMappings) || rawDecision.canonicalMappings.length === 0) {
      fail("semantic_merge_batch_canonical_mappings_required", groupId);
    }
    const groupLocalIds = [...group.localClauseIds].sort((left, right) => left.localeCompare(right));
    const mappedGroupIds = [];
    const normalizedMappings = rawDecision.canonicalMappings.map((rawMapping) => {
      if (!object(rawMapping)) fail("semantic_merge_batch_mapping_invalid", groupId);
      const canonicalClauseId = text(
        rawMapping.canonicalClauseId,
        "semantic_merge_batch_canonical_clause_id_required",
      );
      if (seenCanonicalIds.has(canonicalClauseId) || previousCanonicalIds.has(canonicalClauseId)) {
        fail("semantic_merge_batch_duplicate_canonical_clause_id", canonicalClauseId);
      }
      seenCanonicalIds.add(canonicalClauseId);
      const sourceLocalClauseIds = sortedUniqueText(
        rawMapping.sourceLocalClauseIds,
        "semantic_merge_batch_duplicate_local_mapping",
        "semantic_merge_batch_source_local_clause_ids_required",
      );
      for (const localClauseId of sourceLocalClauseIds) {
        if (!groupLocalIds.includes(localClauseId)) {
          fail("semantic_merge_batch_local_clause_outside_group", localClauseId);
        }
        if (previousLocalIds.has(localClauseId) || seenLocalIds.has(localClauseId)) {
          fail("semantic_merge_batch_duplicate_local_mapping", localClauseId);
        }
        seenLocalIds.add(localClauseId);
        mappedGroupIds.push(localClauseId);
      }
      const semanticClasses = [...new Set(sourceLocalClauseIds.map((id) => (
        planRowById.get(id)?.semanticClass
      )))];
      if (semanticClasses.length !== 1) {
        fail("semantic_merge_batch_source_semantic_class_mismatch", canonicalClauseId);
      }
      const canonicalSemanticClass = text(
        rawMapping.canonicalSemanticClass,
        "semantic_merge_batch_semantic_class_required",
      );
      if (canonicalSemanticClass !== semanticClasses[0]) {
        fail("semantic_merge_batch_canonical_semantic_class_mismatch", canonicalClauseId);
      }
      return { canonicalClauseId, canonicalSemanticClass, sourceLocalClauseIds };
    }).sort((left, right) => left.canonicalClauseId.localeCompare(right.canonicalClauseId));
    if (!isDeepStrictEqual(
      mappedGroupIds.sort((left, right) => left.localeCompare(right)),
      groupLocalIds,
    )) {
      fail("semantic_merge_batch_group_local_coverage_mismatch", groupId);
    }
    if (decision === "merge_equivalent"
      && (normalizedMappings.length !== 1
        || normalizedMappings[0].sourceLocalClauseIds.length !== groupLocalIds.length)) {
      fail("semantic_merge_batch_equivalent_mapping_shape_invalid", groupId);
    }
    if (decision === "keep_distinct_context"
      && (normalizedMappings.length !== groupLocalIds.length
        || normalizedMappings.some((mapping) => mapping.sourceLocalClauseIds.length !== 1))) {
      fail("semantic_merge_batch_distinct_mapping_shape_invalid", groupId);
    }
    decisions.push({
      groupId,
      pairIds: [...group.pairIds],
      localClauseIds: groupLocalIds,
      decision,
      reviewBasisCode,
      canonicalClauseIds: normalizedMappings.map((mapping) => mapping.canonicalClauseId),
    });
    for (const mapping of normalizedMappings) {
      mappings.push({ ...mapping, groupId, decision, reviewBasisCode });
    }
  }
  if (seenGroups.size !== groupById.size) {
    fail("semantic_merge_batch_candidate_group_coverage_incomplete");
  }
  decisions.sort((left, right) => left.groupId.localeCompare(right.groupId));
  mappings.sort((left, right) => left.canonicalClauseId.localeCompare(right.canonicalClauseId));
  return {
    binding: {
      schema: BINDING_SCHEMA,
      globalMergePlanHash: plan.planHash,
      previousBatchHash: previousBatch.batchHash,
      semanticCandidateExpansionHash: expansion.expansionHash,
      groupDecisions: decisions.map((decision) => ({
        groupId: decision.groupId,
        decision: decision.decision,
        reviewBasisCode: decision.reviewBasisCode,
        canonicalMappings: mappings
          .filter((mapping) => mapping.groupId === decision.groupId)
          .map(({ groupId: _group, decision: _decision, reviewBasisCode: _basis, ...mapping }) => mapping),
      })),
    },
    decisions,
    mappings,
  };
}

function batchBody(batch) {
  return without(batch, ["batchHash"]);
}

export function createGlobalCanonicalClauseSemanticMergeBatchV1(input = {}) {
  verifyDependencies(input.plan, input.previousBatch, input.expansion);
  const normalized = normalizeBinding(input);
  const planRowById = new Map(input.plan.localClauseIndex.map((row) => [row.localClauseId, row]));
  const canonicalClauses = normalized.mappings.map((mapping) => {
    const sourceRows = mapping.sourceLocalClauseIds.map((localClauseId) => {
      const row = planRowById.get(localClauseId);
      if (!row) fail("semantic_merge_batch_unknown_local_clause", localClauseId);
      return row;
    }).sort((left, right) => left.localClauseId.localeCompare(right.localClauseId));
    const dispositions = [...new Set(sourceRows.map((row) => row.disposition))];
    if (dispositions.length !== 1) {
      fail("semantic_merge_batch_source_disposition_mismatch", mapping.canonicalClauseId);
    }
    const sourceBindingHash = hashStarcraftTmgContract({
      sourceRows: sourceRows.map((row) => ({
        localClauseId: row.localClauseId,
        sourceKind: row.sourceKind,
        sourceScope: row.sourceScope,
        sourcePart: row.sourcePart,
        sourceAnchorId: row.sourceAnchorId,
        sourceLedgerHash: row.sourceLedgerHash,
        sourceIdentitySetHash: row.sourceIdentitySetHash,
        semanticTitleHash: row.semanticTitleHash,
      })),
    });
    return {
      canonicalClauseId: mapping.canonicalClauseId,
      canonicalSemanticClass: mapping.canonicalSemanticClass,
      disposition: dispositions[0],
      sourceLocalClauseIds: sourceRows.map((row) => row.localClauseId),
      sourceRows,
      sourceBindingHash,
      candidateGroupId: mapping.groupId,
      mergeDecision: mapping.decision,
      reviewBasisCode: mapping.reviewBasisCode,
      eligibleForRuleAtomMapping: sourceRows.every((row) => (
        row.eligibleForRuleAtomMapping === true
      )),
      executable: false,
      trainingTruth: false,
    };
  }).sort((left, right) => left.canonicalClauseId.localeCompare(right.canonicalClauseId));
  const batchReviewedLocalClauseCount = canonicalClauses.reduce((total, clause) => (
    total + clause.sourceLocalClauseIds.length
  ), 0);
  const body = {
    schema: BATCH_SCHEMA,
    batchId: "global-canonical-clause-merge-batch-2",
    globalMergePlanHash: input.plan.planHash,
    previousBatchHash: input.previousBatch.batchHash,
    semanticCandidateExpansionHash: input.expansion.expansionHash,
    reviewedBindingHash: hashStarcraftTmgContract(normalized.binding),
    groupDecisions: normalized.decisions,
    canonicalClauses,
    reviewedCandidateGroupCount: normalized.decisions.length,
    batchReviewedLocalClauseCount,
    batchCanonicalClauseCount: canonicalClauses.length,
    cumulativeReviewedLocalClauseCount:
      input.previousBatch.reviewedLocalClauseCount + batchReviewedLocalClauseCount,
    remainingLocalClauseCount:
      input.previousBatch.remainingLocalClauseCount - batchReviewedLocalClauseCount,
    cumulativeCanonicalClauseCount:
      input.previousBatch.batchCanonicalClauseCount + canonicalClauses.length,
    globalCanonicalClauseCount: null,
    mergeStatus: "partial_global_canonical_semantic_mapping_reviewed",
    rulesEligible: false,
    canAffectRules: false,
    ctx2skillPromotionEligible: false,
    trainingTruth: false,
    blocks: [
      "remaining_global_canonical_mapping_pending",
      "rule_atom_mapping_pending",
      "executor_judge_and_replay_pending",
    ],
  };
  return deepFreeze({ ...body, batchHash: hashStarcraftTmgContract(body) });
}

export function verifyGlobalCanonicalClauseSemanticMergeBatchV1(input = {}) {
  if (!object(input.batch) || input.batch.schema !== BATCH_SCHEMA) {
    fail("semantic_merge_batch_invalid");
  }
  if (hashStarcraftTmgContract(batchBody(input.batch)) !== input.batch.batchHash) {
    fail("semantic_merge_batch_hash_mismatch");
  }
  const expected = createGlobalCanonicalClauseSemanticMergeBatchV1(input);
  if (!isDeepStrictEqual(input.batch, expected)) {
    fail("semantic_merge_batch_content_mismatch");
  }
  const candidateIds = input.expansion.candidateGroups.flatMap((group) => group.localClauseIds);
  const mappedIds = input.batch.canonicalClauses.flatMap((clause) => clause.sourceLocalClauseIds);
  const reviewedGroupIds = input.batch.groupDecisions.map((decision) => decision.groupId);
  const expectedGroupIds = input.expansion.candidateGroups.map((group) => group.groupId);
  return deepFreeze({
    valid: true,
    counts: {
      candidateGroups: expectedGroupIds.length,
      reviewedCandidateGroups: new Set(reviewedGroupIds).size,
      unreviewedCandidateGroups: expectedGroupIds.filter((id) => !reviewedGroupIds.includes(id)).length,
      duplicateCandidateGroupDecisions: reviewedGroupIds.length - new Set(reviewedGroupIds).size,
      candidateLocalClauses: new Set(candidateIds).size,
      mappedLocalClauses: new Set(mappedIds).size,
      unmappedLocalClauses: [...new Set(candidateIds)].filter((id) => !mappedIds.includes(id)).length,
      duplicateLocalClauseMappings: mappedIds.length - new Set(mappedIds).size,
      mergeEquivalentGroups: input.batch.groupDecisions.filter((decision) => (
        decision.decision === "merge_equivalent"
      )).length,
      keepDistinctGroups: input.batch.groupDecisions.filter((decision) => (
        decision.decision === "keep_distinct_context"
      )).length,
      batchCanonicalClauses: input.batch.canonicalClauses.length,
      localToCanonicalReduction:
        input.batch.batchReviewedLocalClauseCount - input.batch.batchCanonicalClauseCount,
    },
  });
}
