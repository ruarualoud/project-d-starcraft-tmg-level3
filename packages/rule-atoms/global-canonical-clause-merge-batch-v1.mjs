import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";

const BATCH_SCHEMA = "starcraft_tmg_global_canonical_clause_merge_batch_v1";
const BINDING_SCHEMA = "starcraft_tmg_global_canonical_clause_merge_batch_binding_v1";
const PLAN_SCHEMA = "starcraft_tmg_global_canonical_clause_merge_plan_v1";
const EXPECTED_PLAN_HASH = "8068f9635e473d3a4c72849aacb997a87365d46c8e5479d877bf1c68bbee4618";
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

function verifyFrozenPlan(plan) {
  if (!object(plan) || plan.schema !== PLAN_SCHEMA) fail("global_canonical_batch_plan_invalid");
  if (hashStarcraftTmgContract(without(plan, ["planHash"])) !== plan.planHash) {
    fail("global_canonical_batch_plan_hash_mismatch");
  }
  if (plan.planHash !== EXPECTED_PLAN_HASH
    || plan.globalCanonicalClauseCount !== null
    || plan.reviewStatus !== "global_canonical_mapping_review_pending"
    || plan.counts?.localClauses !== 1093
    || plan.rulesEligible !== false
    || plan.trainingTruth !== false) {
    fail("global_canonical_batch_plan_dependency_mismatch");
  }
}

function normalizeBinding(plan, reviewedBinding) {
  if (!object(reviewedBinding) || reviewedBinding.schema !== BINDING_SCHEMA) {
    fail("global_canonical_batch_binding_invalid");
  }
  if (reviewedBinding.globalMergePlanHash !== plan.planHash) {
    fail("global_canonical_batch_binding_dependency_mismatch");
  }
  const reviewBatch = plan.reviewBatches.find((batch) => (
    batch.batchId === reviewedBinding.reviewBatchId
  ));
  if (!reviewBatch || reviewBatch.batchKind !== "potential_merge_groups") {
    fail("global_canonical_batch_review_batch_invalid");
  }
  const groupById = new Map(plan.potentialMergeGroups.map((group) => [group.groupId, group]));
  if (!Array.isArray(reviewedBinding.groupDecisions)) {
    fail("global_canonical_batch_group_decisions_required");
  }
  const seenGroups = new Set();
  const seenCanonicalIds = new Set();
  const decisions = [];
  const mappings = [];
  for (const rawDecision of reviewedBinding.groupDecisions) {
    if (!object(rawDecision)) fail("global_canonical_batch_group_decision_invalid");
    const groupId = text(rawDecision.groupId, "global_canonical_batch_group_id_required");
    const group = groupById.get(groupId);
    if (!group) fail("global_canonical_batch_unknown_merge_group", groupId);
    if (seenGroups.has(groupId)) {
      fail("global_canonical_batch_duplicate_merge_group_decision", groupId);
    }
    seenGroups.add(groupId);
    const decision = text(rawDecision.decision, "global_canonical_batch_decision_required");
    if (!DECISIONS.includes(decision)) fail("global_canonical_batch_decision_invalid", decision);
    if (!Array.isArray(rawDecision.canonicalMappings) || rawDecision.canonicalMappings.length === 0) {
      fail("global_canonical_batch_canonical_mappings_required", groupId);
    }
    const groupLocalIds = [...group.localClauseIds].sort((left, right) => left.localeCompare(right));
    const mappedGroupLocalIds = [];
    const normalizedMappings = rawDecision.canonicalMappings.map((rawMapping) => {
      if (!object(rawMapping)) fail("global_canonical_batch_mapping_invalid", groupId);
      const canonicalClauseId = text(
        rawMapping.canonicalClauseId,
        "global_canonical_batch_canonical_clause_id_required",
      );
      if (seenCanonicalIds.has(canonicalClauseId)) {
        fail("global_canonical_batch_duplicate_canonical_clause_id", canonicalClauseId);
      }
      seenCanonicalIds.add(canonicalClauseId);
      const sourceLocalClauseIds = sortedUniqueText(
        rawMapping.sourceLocalClauseIds,
        "global_canonical_batch_duplicate_local_mapping",
        "global_canonical_batch_source_local_clause_ids_required",
      );
      for (const localClauseId of sourceLocalClauseIds) {
        if (!groupLocalIds.includes(localClauseId)) {
          fail("global_canonical_batch_local_clause_outside_group", localClauseId);
        }
        mappedGroupLocalIds.push(localClauseId);
      }
      return {
        canonicalClauseId,
        canonicalSemanticClass: text(
          rawMapping.canonicalSemanticClass,
          "global_canonical_batch_semantic_class_required",
        ),
        sourceLocalClauseIds,
      };
    }).sort((left, right) => left.canonicalClauseId.localeCompare(right.canonicalClauseId));
    const sortedMapped = [...mappedGroupLocalIds].sort((left, right) => left.localeCompare(right));
    if (!isDeepStrictEqual(sortedMapped, groupLocalIds)) {
      fail("global_canonical_batch_group_local_coverage_mismatch", groupId);
    }
    if (decision === "merge_equivalent"
      && (normalizedMappings.length !== 1
        || normalizedMappings[0].sourceLocalClauseIds.length !== groupLocalIds.length)) {
      fail("global_canonical_batch_equivalent_mapping_shape_invalid", groupId);
    }
    if (decision === "keep_distinct_context"
      && (normalizedMappings.length !== groupLocalIds.length
        || normalizedMappings.some((mapping) => mapping.sourceLocalClauseIds.length !== 1))) {
      fail("global_canonical_batch_distinct_mapping_shape_invalid", groupId);
    }
    const reviewBasisCode = text(
      rawDecision.reviewBasisCode,
      "global_canonical_batch_review_basis_required",
    );
    decisions.push({
      groupId,
      evidenceKind: group.evidenceKind,
      evidenceHash: group.evidenceHash,
      localClauseIds: groupLocalIds,
      decision,
      reviewBasisCode,
      canonicalClauseIds: normalizedMappings.map((mapping) => mapping.canonicalClauseId),
    });
    for (const mapping of normalizedMappings) mappings.push({
      ...mapping,
      groupId,
      decision,
      reviewBasisCode,
    });
  }
  if (seenGroups.size !== groupById.size) {
    fail("global_canonical_batch_merge_group_coverage_incomplete");
  }
  decisions.sort((left, right) => left.groupId.localeCompare(right.groupId));
  mappings.sort((left, right) => left.canonicalClauseId.localeCompare(right.canonicalClauseId));
  return {
    reviewBatch,
    binding: {
      schema: BINDING_SCHEMA,
      globalMergePlanHash: reviewedBinding.globalMergePlanHash,
      reviewBatchId: reviewedBinding.reviewBatchId,
      groupDecisions: decisions.map((decision) => ({
        groupId: decision.groupId,
        decision: decision.decision,
        reviewBasisCode: decision.reviewBasisCode,
        canonicalMappings: mappings
          .filter((mapping) => mapping.groupId === decision.groupId)
          .map(({ groupId: _groupId, decision: _decision, reviewBasisCode: _basis, ...mapping }) => mapping),
      })),
    },
    decisions,
    mappings,
  };
}

function batchBody(batch) {
  return without(batch, ["batchHash"]);
}

export function createGlobalCanonicalClauseMergeBatchV1(input = {}) {
  verifyFrozenPlan(input.plan);
  const normalized = normalizeBinding(input.plan, input.reviewedBinding);
  const localRowById = new Map(input.plan.localClauseIndex.map((row) => [row.localClauseId, row]));
  const canonicalClauses = normalized.mappings.map((mapping) => {
    const sourceRows = mapping.sourceLocalClauseIds.map((localClauseId) => {
      const row = localRowById.get(localClauseId);
      if (!row) fail("global_canonical_batch_local_clause_missing", localClauseId);
      return { ...row };
    }).sort((left, right) => left.localClauseId.localeCompare(right.localClauseId));
    const dispositions = [...new Set(sourceRows.map((row) => row.disposition))];
    if (dispositions.length !== 1) {
      fail("global_canonical_batch_mixed_disposition_mapping", mapping.canonicalClauseId);
    }
    const sourceBindingHash = hashStarcraftTmgContract({ sourceRows });
    return {
      canonicalClauseId: mapping.canonicalClauseId,
      canonicalSemanticClass: mapping.canonicalSemanticClass,
      disposition: dispositions[0],
      mergeDecision: mapping.decision,
      reviewBasisCode: mapping.reviewBasisCode,
      sourceLocalClauseIds: sourceRows.map((row) => row.localClauseId),
      sourceRows,
      sourceBindingHash,
      eligibleForRuleAtomMapping: sourceRows.every((row) => row.eligibleForRuleAtomMapping === true),
      executable: false,
      trainingTruth: false,
    };
  });
  const reviewedLocalClauseCount = normalized.reviewBatch.localClauseIds.length;
  const body = {
    schema: BATCH_SCHEMA,
    batchId: "global-canonical-clause-merge-batch-1",
    globalMergePlanHash: input.plan.planHash,
    reviewBatchId: normalized.reviewBatch.batchId,
    reviewBatchKind: normalized.reviewBatch.batchKind,
    reviewedBindingHash: hashStarcraftTmgContract(normalized.binding),
    groupDecisions: normalized.decisions,
    canonicalClauses,
    potentialMergeGroupCount: input.plan.potentialMergeGroups.length,
    reviewedMergeGroupCount: normalized.decisions.length,
    reviewedLocalClauseCount,
    remainingLocalClauseCount: input.plan.counts.localClauses - reviewedLocalClauseCount,
    batchCanonicalClauseCount: canonicalClauses.length,
    localToCanonicalReduction: reviewedLocalClauseCount - canonicalClauses.length,
    globalCanonicalClauseCount: null,
    mergeStatus: "partial_global_canonical_mapping_reviewed",
    rulesEligible: false,
    canAffectRules: false,
    ctx2skillPromotionEligible: false,
    blocks: [
      "remaining_global_review_batches_pending",
      "rule_atom_mapping_pending",
      "judge_and_replay_evidence_pending",
    ],
    trainingTruth: false,
  };
  return deepFreeze({ ...body, batchHash: hashStarcraftTmgContract(body) });
}

export function verifyGlobalCanonicalClauseMergeBatchV1(input = {}) {
  if (!object(input.batch) || input.batch.schema !== BATCH_SCHEMA) {
    fail("global_canonical_batch_schema_invalid");
  }
  if (hashStarcraftTmgContract(batchBody(input.batch)) !== input.batch.batchHash) {
    fail("global_canonical_batch_hash_mismatch");
  }
  const expected = createGlobalCanonicalClauseMergeBatchV1(input);
  if (expected.batchHash !== input.batch.batchHash || !isDeepStrictEqual(expected, input.batch)) {
    fail("global_canonical_batch_content_mismatch");
  }
  const groupIds = input.batch.groupDecisions.map((decision) => decision.groupId);
  const duplicateMergeGroupDecisions = groupIds.length - new Set(groupIds).size;
  const mappedLocalIds = input.batch.canonicalClauses
    .flatMap((clause) => clause.sourceLocalClauseIds);
  const duplicateLocalClauseMappings = mappedLocalIds.length - new Set(mappedLocalIds).size;
  const reviewBatch = input.plan.reviewBatches.find((item) => item.batchId === input.batch.reviewBatchId);
  const unmappedLocalClauses = reviewBatch.localClauseIds
    .filter((localClauseId) => !mappedLocalIds.includes(localClauseId)).length;
  const mergeEquivalentGroups = input.batch.groupDecisions
    .filter((decision) => decision.decision === "merge_equivalent").length;
  const keepDistinctGroups = input.batch.groupDecisions
    .filter((decision) => decision.decision === "keep_distinct_context").length;
  const counts = {
    potentialMergeGroups: input.plan.potentialMergeGroups.length,
    reviewedMergeGroups: input.batch.groupDecisions.length,
    unreviewedMergeGroups: input.plan.potentialMergeGroups.length - input.batch.groupDecisions.length,
    duplicateMergeGroupDecisions,
    reviewBatchLocalClauses: reviewBatch.localClauseIds.length,
    mappedLocalClauses: new Set(mappedLocalIds).size,
    unmappedLocalClauses,
    duplicateLocalClauseMappings,
    mergeEquivalentGroups,
    keepDistinctGroups,
    batchCanonicalClauses: input.batch.canonicalClauses.length,
    localToCanonicalReduction: reviewBatch.localClauseIds.length - input.batch.canonicalClauses.length,
  };
  if (counts.unreviewedMergeGroups !== 0 || duplicateMergeGroupDecisions !== 0
    || unmappedLocalClauses !== 0 || duplicateLocalClauseMappings !== 0
    || input.batch.globalCanonicalClauseCount !== null
    || input.batch.rulesEligible !== false
    || input.batch.canAffectRules !== false
    || input.batch.ctx2skillPromotionEligible !== false
    || input.batch.trainingTruth !== false
    || input.batch.canonicalClauses.some((clause) => (
      clause.executable !== false || clause.trainingTruth !== false
    ))) {
    fail("global_canonical_batch_status_invalid");
  }
  return deepFreeze({
    schema: "starcraft_tmg_global_canonical_clause_merge_batch_audit_v1",
    batchHash: input.batch.batchHash,
    counts,
    globalCanonicalClauseCount: null,
    rulesEligible: false,
    canAffectRules: false,
    ctx2skillPromotionEligible: false,
    trainingTruth: false,
  });
}
