import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";

const BATCH_SCHEMA = "starcraft_tmg_global_canonical_clause_residual_merge_batch_v1";
const BINDING_SCHEMA = "starcraft_tmg_global_canonical_clause_residual_merge_batch_binding_v1";
const PLAN_SCHEMA = "starcraft_tmg_global_canonical_clause_merge_plan_v1";
const EXPANSION_SCHEMA = "starcraft_tmg_global_canonical_clause_residual_candidate_expansion_v1";
const FIRST_BATCH_SCHEMA = "starcraft_tmg_global_canonical_clause_merge_batch_v1";
const SECOND_BATCH_SCHEMA = "starcraft_tmg_global_canonical_clause_semantic_merge_batch_v1";
const THIRD_BATCH_SCHEMA = "starcraft_tmg_global_canonical_clause_containment_merge_batch_v1";
const EXPECTED_PLAN_HASH = "8068f9635e473d3a4c72849aacb997a87365d46c8e5479d877bf1c68bbee4618";
const EXPECTED_BATCH_HASHES = Object.freeze([
  "f881fdc48a64f7be2506abf36e4c5d10a1c668054848a34441678ecd108c83e2",
  "c5eda2ecb1ee817520579eba5f6d9cf364872b4d2b86c14034aa61e1bb702f5f",
  "1c99facab4bca696ea97927e9f6ff788ff0efd7bd960f5decbf1887dbea27d97",
]);
const EXPECTED_EXPANSION_HASH = "167ab2e648c3148d0d29be7bb790a3a066aca3693bd1b8a7b83703d92a172af0";
const DECISIONS = Object.freeze([
  "extend_existing_canonical",
  "merge_new_equivalent",
  "keep_distinct_context",
  "partition_context",
]);
const MAPPING_KINDS = Object.freeze([
  "create_new_canonical",
  "extend_existing_canonical",
]);

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

function verifyPlan(plan) {
  if (!object(plan) || plan.schema !== PLAN_SCHEMA
    || hashStarcraftTmgContract(without(plan, ["planHash"])) !== plan.planHash
    || plan.planHash !== EXPECTED_PLAN_HASH
    || plan.counts?.localClauses !== 1093
    || plan.globalCanonicalClauseCount !== null
    || plan.rulesEligible !== false
    || plan.trainingTruth !== false) {
    fail("residual_merge_batch_plan_dependency_mismatch");
  }
}

function verifyBatchChain(plan, previousBatches) {
  if (!Array.isArray(previousBatches) || previousBatches.length !== 3) {
    fail("residual_merge_batch_previous_batch_chain_invalid");
  }
  const expectedSchemas = [FIRST_BATCH_SCHEMA, SECOND_BATCH_SCHEMA, THIRD_BATCH_SCHEMA];
  for (let index = 0; index < previousBatches.length; index += 1) {
    const batch = previousBatches[index];
    if (!object(batch) || batch.schema !== expectedSchemas[index]
      || hashStarcraftTmgContract(without(batch, ["batchHash"])) !== batch.batchHash
      || batch.batchHash !== EXPECTED_BATCH_HASHES[index]
      || batch.globalMergePlanHash !== plan.planHash
      || batch.globalCanonicalClauseCount !== null
      || batch.rulesEligible !== false
      || batch.trainingTruth !== false) {
      fail("residual_merge_batch_previous_batch_chain_invalid");
    }
  }
  const [first, second, third] = previousBatches;
  if (second.previousBatchHash !== first.batchHash
    || third.previousBatchHash !== second.batchHash
    || third.cumulativeReviewedLocalClauseCount !== 151
    || third.cumulativeCanonicalClauseCount !== 111
    || third.remainingLocalClauseCount !== 942) {
    fail("residual_merge_batch_previous_batch_chain_invalid");
  }
  const previousCanonicalClauses = previousBatches.flatMap((batch) => batch.canonicalClauses);
  const previousCanonicalById = new Map();
  const previousLocalIds = new Set();
  for (const clause of previousCanonicalClauses) {
    if (previousCanonicalById.has(clause.canonicalClauseId)) {
      fail("residual_merge_batch_previous_batch_chain_invalid");
    }
    previousCanonicalById.set(clause.canonicalClauseId, clause);
    for (const localClauseId of clause.sourceLocalClauseIds) {
      if (previousLocalIds.has(localClauseId)) {
        fail("residual_merge_batch_previous_batch_chain_invalid");
      }
      previousLocalIds.add(localClauseId);
    }
  }
  if (previousCanonicalById.size !== 111 || previousLocalIds.size !== 151) {
    fail("residual_merge_batch_previous_batch_chain_invalid");
  }
  return { previousCanonicalById, previousLocalIds };
}

function verifyExpansion(plan, previousBatches, expansion) {
  if (!object(expansion) || expansion.schema !== EXPANSION_SCHEMA
    || hashStarcraftTmgContract(without(expansion, ["expansionHash"])) !== expansion.expansionHash
    || expansion.expansionHash !== EXPECTED_EXPANSION_HASH
    || expansion.globalMergePlanHash !== plan.planHash
    || !isDeepStrictEqual(
      expansion.previousBatchHashes,
      previousBatches.map((batch) => batch.batchHash),
    )
    || expansion.candidatePairs?.length !== 90
    || expansion.candidateGroups?.length !== 56
    || expansion.reviewedLocalClauseCount !== 151
    || expansion.remainingLocalClauseCount !== 942
    || expansion.globalCanonicalClauseCount !== null
    || expansion.rulesEligible !== false
    || expansion.trainingTruth !== false) {
    fail("residual_merge_batch_expansion_dependency_mismatch");
  }
}

function normalizeBinding(input, dependencies) {
  const { plan, previousBatches, expansion, reviewedBinding } = input;
  const { previousCanonicalById, previousLocalIds } = dependencies;
  if (!object(reviewedBinding) || reviewedBinding.schema !== BINDING_SCHEMA) {
    fail("residual_merge_batch_binding_invalid");
  }
  if (reviewedBinding.globalMergePlanHash !== plan.planHash
    || reviewedBinding.previousBatchHash !== previousBatches[2].batchHash
    || reviewedBinding.residualCandidateExpansionHash !== expansion.expansionHash) {
    fail("residual_merge_batch_binding_dependency_mismatch");
  }
  if (!Array.isArray(reviewedBinding.groupDecisions)) {
    fail("residual_merge_batch_group_decisions_required");
  }
  const groupById = new Map(expansion.candidateGroups.map((group) => [group.groupId, group]));
  const planRowById = new Map(plan.localClauseIndex.map((row) => [row.localClauseId, row]));
  const seenGroups = new Set();
  const seenRemainingLocalIds = new Set();
  const seenNewCanonicalIds = new Set();
  const seenExtensionCanonicalIds = new Set();
  const decisions = [];
  const mappings = [];
  for (const rawDecision of reviewedBinding.groupDecisions) {
    if (!object(rawDecision)) fail("residual_merge_batch_group_decision_invalid");
    const groupId = text(rawDecision.groupId, "residual_merge_batch_group_id_required");
    const group = groupById.get(groupId);
    if (!group) fail("residual_merge_batch_unknown_candidate_group", groupId);
    if (seenGroups.has(groupId)) {
      fail("residual_merge_batch_duplicate_candidate_group_decision", groupId);
    }
    seenGroups.add(groupId);
    const decision = text(rawDecision.decision, "residual_merge_batch_decision_required");
    if (!DECISIONS.includes(decision)) fail("residual_merge_batch_decision_invalid", decision);
    const reviewBasisCode = text(
      rawDecision.reviewBasisCode,
      "residual_merge_batch_review_basis_required",
    );
    if (!Array.isArray(rawDecision.canonicalMappings)
      || rawDecision.canonicalMappings.length === 0) {
      fail("residual_merge_batch_canonical_mappings_required", groupId);
    }
    const remainingGroupIds = [...group.remainingLocalClauseIds]
      .sort((left, right) => left.localeCompare(right));
    const mappedGroupIds = [];
    const normalizedMappings = rawDecision.canonicalMappings.map((rawMapping) => {
      if (!object(rawMapping)) fail("residual_merge_batch_mapping_invalid", groupId);
      const mappingKind = text(rawMapping.mappingKind, "residual_merge_batch_mapping_kind_required");
      if (!MAPPING_KINDS.includes(mappingKind)) {
        fail("residual_merge_batch_mapping_kind_invalid", mappingKind);
      }
      const canonicalClauseId = text(
        rawMapping.canonicalClauseId,
        "residual_merge_batch_canonical_clause_id_required",
      );
      const sourceLocalClauseIds = sortedUniqueText(
        rawMapping.sourceLocalClauseIds,
        "residual_merge_batch_duplicate_local_mapping",
        "residual_merge_batch_source_local_clause_ids_required",
      );
      for (const localClauseId of sourceLocalClauseIds) {
        if (previousLocalIds.has(localClauseId)) {
          fail("residual_merge_batch_previously_mapped_local_clause", localClauseId);
        }
        if (!remainingGroupIds.includes(localClauseId)) {
          fail("residual_merge_batch_local_clause_outside_group", localClauseId);
        }
        if (seenRemainingLocalIds.has(localClauseId)) {
          fail("residual_merge_batch_duplicate_local_mapping", localClauseId);
        }
        seenRemainingLocalIds.add(localClauseId);
        mappedGroupIds.push(localClauseId);
      }
      const sourceRows = sourceLocalClauseIds.map((localClauseId) => {
        const row = planRowById.get(localClauseId);
        if (!row) fail("residual_merge_batch_local_clause_unknown", localClauseId);
        return row;
      });
      const sourceSemanticClasses = [...new Set(sourceRows.map((row) => row.semanticClass))];
      const sourceDispositions = [...new Set(sourceRows.map((row) => row.disposition))];
      if (sourceSemanticClasses.length !== 1 || sourceDispositions.length !== 1) {
        fail("residual_merge_batch_mapping_source_mismatch", canonicalClauseId);
      }
      if (mappingKind === "create_new_canonical") {
        if (previousCanonicalById.has(canonicalClauseId)
          || seenNewCanonicalIds.has(canonicalClauseId)
          || seenExtensionCanonicalIds.has(canonicalClauseId)) {
          fail("residual_merge_batch_duplicate_canonical_clause_id", canonicalClauseId);
        }
        seenNewCanonicalIds.add(canonicalClauseId);
        const canonicalSemanticClass = text(
          rawMapping.canonicalSemanticClass,
          "residual_merge_batch_semantic_class_required",
        );
        if (canonicalSemanticClass !== sourceSemanticClasses[0]) {
          fail("residual_merge_batch_canonical_semantic_class_mismatch", canonicalClauseId);
        }
        return {
          mappingKind,
          canonicalClauseId,
          canonicalSemanticClass,
          sourceLocalClauseIds,
        };
      }
      const previousCanonical = previousCanonicalById.get(canonicalClauseId);
      if (!previousCanonical) {
        fail("residual_merge_batch_extension_canonical_unknown", canonicalClauseId);
      }
      if (!group.existingCanonicalClauseIds.includes(canonicalClauseId)) {
        fail("residual_merge_batch_extension_canonical_outside_group", canonicalClauseId);
      }
      if (seenExtensionCanonicalIds.has(canonicalClauseId)
        || seenNewCanonicalIds.has(canonicalClauseId)) {
        fail("residual_merge_batch_duplicate_canonical_clause_id", canonicalClauseId);
      }
      seenExtensionCanonicalIds.add(canonicalClauseId);
      if (previousCanonical.canonicalSemanticClass !== sourceSemanticClasses[0]
        || previousCanonical.disposition !== sourceDispositions[0]) {
        fail("residual_merge_batch_extension_source_mismatch", canonicalClauseId);
      }
      return { mappingKind, canonicalClauseId, sourceLocalClauseIds };
    }).sort((left, right) => left.canonicalClauseId.localeCompare(right.canonicalClauseId));
    if (!isDeepStrictEqual(
      mappedGroupIds.sort((left, right) => left.localeCompare(right)),
      remainingGroupIds,
    )) {
      fail("residual_merge_batch_group_remaining_coverage_mismatch", groupId);
    }
    if (decision === "extend_existing_canonical"
      && (normalizedMappings.length !== 1
        || normalizedMappings[0].mappingKind !== "extend_existing_canonical"
        || !isDeepStrictEqual(normalizedMappings[0].sourceLocalClauseIds, remainingGroupIds))) {
      fail("residual_merge_batch_extend_existing_shape_invalid", groupId);
    }
    if (decision === "merge_new_equivalent"
      && (normalizedMappings.length !== 1
        || normalizedMappings[0].mappingKind !== "create_new_canonical"
        || !isDeepStrictEqual(normalizedMappings[0].sourceLocalClauseIds, remainingGroupIds))) {
      fail("residual_merge_batch_merge_new_shape_invalid", groupId);
    }
    if (decision === "keep_distinct_context"
      && (normalizedMappings.some((mapping) => (
        mapping.mappingKind !== "create_new_canonical"
          || mapping.sourceLocalClauseIds.length !== 1
      )) || normalizedMappings.length !== remainingGroupIds.length)) {
      fail("residual_merge_batch_keep_distinct_shape_invalid", groupId);
    }
    if (decision === "partition_context" && normalizedMappings.length < 2) {
      fail("residual_merge_batch_partition_shape_invalid", groupId);
    }
    decisions.push({
      groupId,
      pairIds: [...group.pairIds],
      mappedContextLocalClauseIds: [...group.mappedLocalClauseIds],
      remainingLocalClauseIds: remainingGroupIds,
      existingCanonicalClauseIds: [...group.existingCanonicalClauseIds],
      decision,
      reviewBasisCode,
      mappingKinds: normalizedMappings.map((mapping) => mapping.mappingKind),
      canonicalClauseIds: normalizedMappings.map((mapping) => mapping.canonicalClauseId),
    });
    for (const mapping of normalizedMappings) {
      mappings.push({ ...mapping, groupId, decision, reviewBasisCode });
    }
  }
  if (seenGroups.size !== groupById.size) {
    fail("residual_merge_batch_candidate_group_coverage_incomplete");
  }
  decisions.sort((left, right) => left.groupId.localeCompare(right.groupId));
  mappings.sort((left, right) => left.canonicalClauseId.localeCompare(right.canonicalClauseId));
  return {
    normalizedBinding: {
      schema: BINDING_SCHEMA,
      globalMergePlanHash: plan.planHash,
      previousBatchHash: previousBatches[2].batchHash,
      residualCandidateExpansionHash: expansion.expansionHash,
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

export function createGlobalCanonicalClauseResidualMergeBatchV1(input = {}) {
  verifyPlan(input.plan);
  const dependencies = verifyBatchChain(input.plan, input.previousBatches);
  verifyExpansion(input.plan, input.previousBatches, input.expansion);
  const normalized = normalizeBinding(input, dependencies);
  const planRowById = new Map(input.plan.localClauseIndex.map((row) => [row.localClauseId, row]));
  const newCanonicalClauses = normalized.mappings
    .filter((mapping) => mapping.mappingKind === "create_new_canonical")
    .map((mapping) => {
      const sourceRows = mapping.sourceLocalClauseIds.map((localClauseId) => ({
        ...planRowById.get(localClauseId),
      })).sort((left, right) => left.localClauseId.localeCompare(right.localClauseId));
      const dispositions = [...new Set(sourceRows.map((row) => row.disposition))];
      if (dispositions.length !== 1) {
        fail("residual_merge_batch_source_disposition_mismatch", mapping.canonicalClauseId);
      }
      return {
        canonicalClauseId: mapping.canonicalClauseId,
        canonicalSemanticClass: mapping.canonicalSemanticClass,
        disposition: dispositions[0],
        sourceLocalClauseIds: sourceRows.map((row) => row.localClauseId),
        sourceRows,
        sourceBindingHash: hashStarcraftTmgContract({ sourceRows }),
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
  const canonicalExtensions = normalized.mappings
    .filter((mapping) => mapping.mappingKind === "extend_existing_canonical")
    .map((mapping) => {
      const previous = dependencies.previousCanonicalById.get(mapping.canonicalClauseId);
      const previousSourceRows = previous.sourceRows.map((row) => ({ ...row }));
      const addedSourceRows = mapping.sourceLocalClauseIds.map((localClauseId) => ({
        ...planRowById.get(localClauseId),
      })).sort((left, right) => left.localClauseId.localeCompare(right.localClauseId));
      const sourceRows = [...previousSourceRows, ...addedSourceRows];
      return {
        canonicalClauseId: mapping.canonicalClauseId,
        canonicalSemanticClass: previous.canonicalSemanticClass,
        disposition: previous.disposition,
        previousSourceBindingHash: previous.sourceBindingHash,
        previousSourceLocalClauseIds: [...previous.sourceLocalClauseIds],
        addedSourceLocalClauseIds: addedSourceRows.map((row) => row.localClauseId),
        sourceLocalClauseIds: sourceRows.map((row) => row.localClauseId),
        previousSourceRows,
        addedSourceRows,
        sourceRows,
        sourceBindingHash: hashStarcraftTmgContract({
          previousSourceBindingHash: previous.sourceBindingHash,
          previousSourceRows,
          addedSourceRows,
        }),
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
  const newCanonicalSourceLocalClauseCount = newCanonicalClauses.reduce((total, clause) => (
    total + clause.sourceLocalClauseIds.length
  ), 0);
  const addedAliasLocalClauseCount = canonicalExtensions.reduce((total, extension) => (
    total + extension.addedSourceLocalClauseIds.length
  ), 0);
  const batchReviewedLocalClauseCount = newCanonicalSourceLocalClauseCount
    + addedAliasLocalClauseCount;
  const body = {
    schema: BATCH_SCHEMA,
    batchId: "global-canonical-clause-residual-merge-batch-4",
    globalMergePlanHash: input.plan.planHash,
    previousBatchHashes: input.previousBatches.map((batch) => batch.batchHash),
    residualCandidateExpansionHash: input.expansion.expansionHash,
    reviewedBindingHash: hashStarcraftTmgContract(normalized.normalizedBinding),
    groupDecisions: normalized.decisions,
    newCanonicalClauses,
    canonicalExtensions,
    reviewedCandidateGroupCount: normalized.decisions.length,
    batchReviewedLocalClauseCount,
    batchNewCanonicalSourceLocalClauseCount: newCanonicalSourceLocalClauseCount,
    batchAddedAliasLocalClauseCount: addedAliasLocalClauseCount,
    batchNewCanonicalClauseCount: newCanonicalClauses.length,
    batchExtendedCanonicalClauseCount: canonicalExtensions.length,
    cumulativeReviewedLocalClauseCount:
      input.previousBatches[2].cumulativeReviewedLocalClauseCount + batchReviewedLocalClauseCount,
    remainingLocalClauseCount:
      input.previousBatches[2].remainingLocalClauseCount - batchReviewedLocalClauseCount,
    cumulativeCanonicalClauseCount:
      input.previousBatches[2].cumulativeCanonicalClauseCount + newCanonicalClauses.length,
    globalCanonicalClauseCount: null,
    mergeStatus: "partial_global_canonical_residual_alias_extension_reviewed",
    rulesEligible: false,
    canAffectRules: false,
    ctx2skillPromotionEligible: false,
    replayEligible: false,
    trainingTruth: false,
    blocks: [
      "remaining_global_canonical_mapping_pending",
      "rule_atom_mapping_pending",
      "executor_judge_and_replay_pending",
    ],
  };
  return deepFreeze({ ...body, batchHash: hashStarcraftTmgContract(body) });
}

export function verifyGlobalCanonicalClauseResidualMergeBatchV1(input = {}) {
  if (!object(input.batch) || input.batch.schema !== BATCH_SCHEMA) {
    fail("residual_merge_batch_invalid");
  }
  if (hashStarcraftTmgContract(batchBody(input.batch)) !== input.batch.batchHash) {
    fail("residual_merge_batch_hash_mismatch");
  }
  const expected = createGlobalCanonicalClauseResidualMergeBatchV1(input);
  if (!isDeepStrictEqual(input.batch, expected)) {
    fail("residual_merge_batch_content_mismatch");
  }
  const candidateRemainingIds = new Set(input.expansion.candidateGroups.flatMap((group) => (
    group.remainingLocalClauseIds
  )));
  const mappedRemainingIds = [
    ...input.batch.newCanonicalClauses.flatMap((clause) => clause.sourceLocalClauseIds),
    ...input.batch.canonicalExtensions.flatMap((extension) => extension.addedSourceLocalClauseIds),
  ];
  const previouslyMappedIds = new Set(input.previousBatches.flatMap((batch) => (
    batch.canonicalClauses.flatMap((clause) => clause.sourceLocalClauseIds)
  )));
  const reviewedGroupIds = input.batch.groupDecisions.map((decision) => decision.groupId);
  const expectedGroupIds = input.expansion.candidateGroups.map((group) => group.groupId);
  let changedPreviousSourceRows = 0;
  const previousCanonicalById = new Map(input.previousBatches.flatMap((batch) => (
    batch.canonicalClauses.map((clause) => [clause.canonicalClauseId, clause])
  )));
  for (const extension of input.batch.canonicalExtensions) {
    const previous = previousCanonicalById.get(extension.canonicalClauseId);
    if (!isDeepStrictEqual(extension.previousSourceRows, previous?.sourceRows)
      || extension.previousSourceBindingHash !== previous?.sourceBindingHash
      || !isDeepStrictEqual(extension.previousSourceLocalClauseIds, previous?.sourceLocalClauseIds)) {
      changedPreviousSourceRows += 1;
    }
  }
  return deepFreeze({
    valid: true,
    counts: {
      candidateGroups: expectedGroupIds.length,
      reviewedCandidateGroups: new Set(reviewedGroupIds).size,
      unreviewedCandidateGroups: expectedGroupIds.filter((id) => !reviewedGroupIds.includes(id)).length,
      duplicateCandidateGroupDecisions: reviewedGroupIds.length - new Set(reviewedGroupIds).size,
      extendExistingGroups: input.batch.groupDecisions.filter((decision) => (
        decision.decision === "extend_existing_canonical"
      )).length,
      mergeNewEquivalentGroups: input.batch.groupDecisions.filter((decision) => (
        decision.decision === "merge_new_equivalent"
      )).length,
      keepDistinctGroups: input.batch.groupDecisions.filter((decision) => (
        decision.decision === "keep_distinct_context"
      )).length,
      partitionGroups: input.batch.groupDecisions.filter((decision) => (
        decision.decision === "partition_context"
      )).length,
      candidateRemainingLocalClauses: candidateRemainingIds.size,
      mappedRemainingLocalClauses: new Set(mappedRemainingIds).size,
      unmappedRemainingLocalClauses: [...candidateRemainingIds]
        .filter((id) => !mappedRemainingIds.includes(id)).length,
      duplicateRemainingLocalMappings: mappedRemainingIds.length - new Set(mappedRemainingIds).size,
      previouslyMappedLocalClauseRemaps: mappedRemainingIds
        .filter((id) => previouslyMappedIds.has(id)).length,
      canonicalExtensions: input.batch.canonicalExtensions.length,
      addedAliasLocalClauses: input.batch.batchAddedAliasLocalClauseCount,
      changedPreviousSourceRows,
      newCanonicalClauses: input.batch.newCanonicalClauses.length,
      newCanonicalSourceLocalClauses: input.batch.batchNewCanonicalSourceLocalClauseCount,
      localToCanonicalReduction:
        input.batch.batchReviewedLocalClauseCount - input.batch.batchNewCanonicalClauseCount,
    },
  });
}
