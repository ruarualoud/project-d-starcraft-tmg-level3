import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";

const FINALIZATION_SCHEMA = "starcraft_tmg_global_canonical_clause_finalization_v1";
const POLICY_SCHEMA = "starcraft_tmg_global_canonical_clause_singleton_finalization_policy_v1";
const PLAN_SCHEMA = "starcraft_tmg_global_canonical_clause_merge_plan_v1";
const FIRST_BATCH_SCHEMA = "starcraft_tmg_global_canonical_clause_merge_batch_v1";
const SECOND_BATCH_SCHEMA = "starcraft_tmg_global_canonical_clause_semantic_merge_batch_v1";
const THIRD_BATCH_SCHEMA = "starcraft_tmg_global_canonical_clause_containment_merge_batch_v1";
const RESIDUAL_BATCH_SCHEMA = "starcraft_tmg_global_canonical_clause_residual_merge_batch_v1";
const EXPECTED_PLAN_HASH = "8068f9635e473d3a4c72849aacb997a87365d46c8e5479d877bf1c68bbee4618";
const EXPECTED_BATCH_HASHES = Object.freeze([
  "f881fdc48a64f7be2506abf36e4c5d10a1c668054848a34441678ecd108c83e2",
  "c5eda2ecb1ee817520579eba5f6d9cf364872b4d2b86c14034aa61e1bb702f5f",
  "1c99facab4bca696ea97927e9f6ff788ff0efd7bd960f5decbf1887dbea27d97",
]);
const EXPECTED_RESIDUAL_BATCH_HASH = "58068f4c6357aff8a04917d891329a79e8ff5615a7554c5cf25111142189022f";

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function verifyPlan(plan) {
  if (!object(plan) || plan.schema !== PLAN_SCHEMA
    || hashStarcraftTmgContract(without(plan, ["planHash"])) !== plan.planHash
    || plan.planHash !== EXPECTED_PLAN_HASH
    || plan.counts?.localClauses !== 1093
    || plan.counts?.byDisposition?.review_required !== 978
    || plan.counts?.byDisposition?.display_only !== 115
    || plan.globalCanonicalClauseCount !== null
    || plan.rulesEligible !== false
    || plan.trainingTruth !== false) {
    fail("global_canonical_finalization_plan_dependency_mismatch");
  }
}

function verifyPreviousBatches(plan, previousBatches) {
  if (!Array.isArray(previousBatches) || previousBatches.length !== 3) {
    fail("global_canonical_finalization_previous_batch_chain_invalid");
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
      fail("global_canonical_finalization_previous_batch_chain_invalid");
    }
  }
  if (previousBatches[1].previousBatchHash !== previousBatches[0].batchHash
    || previousBatches[2].previousBatchHash !== previousBatches[1].batchHash
    || previousBatches[2].cumulativeReviewedLocalClauseCount !== 151
    || previousBatches[2].cumulativeCanonicalClauseCount !== 111
    || previousBatches[2].remainingLocalClauseCount !== 942) {
    fail("global_canonical_finalization_previous_batch_chain_invalid");
  }
}

function verifyResidualBatch(plan, previousBatches, residualMergeBatch) {
  if (!object(residualMergeBatch) || residualMergeBatch.schema !== RESIDUAL_BATCH_SCHEMA
    || hashStarcraftTmgContract(without(residualMergeBatch, ["batchHash"]))
      !== residualMergeBatch.batchHash
    || residualMergeBatch.batchHash !== EXPECTED_RESIDUAL_BATCH_HASH
    || residualMergeBatch.globalMergePlanHash !== plan.planHash
    || !isDeepStrictEqual(
      residualMergeBatch.previousBatchHashes,
      previousBatches.map((batch) => batch.batchHash),
    )
    || residualMergeBatch.batchReviewedLocalClauseCount !== 111
    || residualMergeBatch.batchNewCanonicalClauseCount !== 84
    || residualMergeBatch.batchExtendedCanonicalClauseCount !== 5
    || residualMergeBatch.cumulativeReviewedLocalClauseCount !== 262
    || residualMergeBatch.cumulativeCanonicalClauseCount !== 195
    || residualMergeBatch.remainingLocalClauseCount !== 831
    || residualMergeBatch.globalCanonicalClauseCount !== null
    || residualMergeBatch.rulesEligible !== false
    || residualMergeBatch.trainingTruth !== false) {
    fail("global_canonical_finalization_residual_batch_dependency_mismatch");
  }
}

function normalizePolicy(plan, residualMergeBatch, policy) {
  if (!object(policy) || policy.schema !== POLICY_SCHEMA
    || policy.globalMergePlanHash !== plan.planHash
    || policy.previousResidualMergeBatchHash !== residualMergeBatch.batchHash
    || policy.finalizationMode !== "deterministic_remaining_singletons"
    || policy.canonicalIdPolicy !== "normalized_local_id_plus_source_identity_hash_prefix"
    || policy.canonicalIdHashPrefixLength !== 12
    || policy.reviewBasisCode
      !== "remaining_after_exact_near_containment_and_residual_human_review"
    || policy.executable !== false
    || policy.rulesEligible !== false
    || policy.trainingTruth !== false) {
    fail("global_canonical_finalization_policy_invalid");
  }
  return {
    schema: POLICY_SCHEMA,
    globalMergePlanHash: policy.globalMergePlanHash,
    previousResidualMergeBatchHash: policy.previousResidualMergeBatchHash,
    finalizationMode: policy.finalizationMode,
    canonicalIdPolicy: policy.canonicalIdPolicy,
    canonicalIdHashPrefixLength: policy.canonicalIdHashPrefixLength,
    reviewBasisCode: policy.reviewBasisCode,
    executable: false,
    rulesEligible: false,
    trainingTruth: false,
  };
}

function canonicalRecord(clause, formation, formationBatchId, extra = {}) {
  const sourceRows = clause.sourceRows.map((row) => ({ ...row }));
  return {
    canonicalClauseId: clause.canonicalClauseId,
    canonicalSemanticClass: clause.canonicalSemanticClass,
    disposition: clause.disposition,
    sourceLocalClauseIds: [...clause.sourceLocalClauseIds],
    sourceRows,
    sourceBindingHash: clause.sourceBindingHash,
    formation,
    formationBatchId,
    reviewBasisCode: clause.reviewBasisCode,
    eligibleForRuleAtomMapping: clause.eligibleForRuleAtomMapping,
    executable: false,
    trainingTruth: false,
    ...extra,
  };
}

function singletonCanonicalId(row, policy) {
  const slug = row.localClauseId.normalize("NFC").toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  const identityPrefix = hashStarcraftTmgContract({
    localClauseId: row.localClauseId,
    sourceIdentitySetHash: row.sourceIdentitySetHash,
  }).slice(0, policy.canonicalIdHashPrefixLength);
  return `canonical:singleton:${slug}:${identityPrefix}`;
}

function finalizationBody(finalization) {
  return without(finalization, ["finalizationHash"]);
}

export function createGlobalCanonicalClauseFinalizationV1(input = {}) {
  verifyPlan(input.plan);
  verifyPreviousBatches(input.plan, input.previousBatches);
  verifyResidualBatch(input.plan, input.previousBatches, input.residualMergeBatch);
  const policy = normalizePolicy(
    input.plan,
    input.residualMergeBatch,
    input.finalizationPolicy,
  );
  const canonicalById = new Map();
  const localToCanonical = new Map();
  for (const batch of input.previousBatches) {
    for (const clause of batch.canonicalClauses) {
      if (canonicalById.has(clause.canonicalClauseId)) {
        fail("global_canonical_finalization_duplicate_prior_canonical", clause.canonicalClauseId);
      }
      const normalized = canonicalRecord(clause, "reviewed_merge", batch.batchId);
      canonicalById.set(normalized.canonicalClauseId, normalized);
      for (const localClauseId of normalized.sourceLocalClauseIds) {
        if (localToCanonical.has(localClauseId)) {
          fail("global_canonical_finalization_duplicate_prior_local_mapping", localClauseId);
        }
        localToCanonical.set(localClauseId, normalized.canonicalClauseId);
      }
    }
  }
  if (canonicalById.size !== 111 || localToCanonical.size !== 151) {
    fail("global_canonical_finalization_prior_counts_invalid");
  }
  for (const clause of input.residualMergeBatch.newCanonicalClauses) {
    if (canonicalById.has(clause.canonicalClauseId)) {
      fail("global_canonical_finalization_duplicate_residual_canonical", clause.canonicalClauseId);
    }
    const normalized = canonicalRecord(
      clause,
      "reviewed_residual_mapping",
      input.residualMergeBatch.batchId,
    );
    canonicalById.set(normalized.canonicalClauseId, normalized);
    for (const localClauseId of normalized.sourceLocalClauseIds) {
      if (localToCanonical.has(localClauseId)) {
        fail("global_canonical_finalization_duplicate_residual_local_mapping", localClauseId);
      }
      localToCanonical.set(localClauseId, normalized.canonicalClauseId);
    }
  }
  let changedPreExtensionSourceRows = 0;
  for (const extension of input.residualMergeBatch.canonicalExtensions) {
    const previous = canonicalById.get(extension.canonicalClauseId);
    if (!previous) {
      fail("global_canonical_finalization_extension_target_unknown", extension.canonicalClauseId);
    }
    if (!isDeepStrictEqual(extension.previousSourceRows, previous.sourceRows)
      || !isDeepStrictEqual(extension.previousSourceLocalClauseIds, previous.sourceLocalClauseIds)
      || extension.previousSourceBindingHash !== previous.sourceBindingHash) {
      changedPreExtensionSourceRows += 1;
    }
    for (const localClauseId of extension.addedSourceLocalClauseIds) {
      if (localToCanonical.has(localClauseId)) {
        fail("global_canonical_finalization_duplicate_extension_local_mapping", localClauseId);
      }
      localToCanonical.set(localClauseId, extension.canonicalClauseId);
    }
    canonicalById.set(extension.canonicalClauseId, canonicalRecord(
      extension,
      "reviewed_alias_extension",
      input.residualMergeBatch.batchId,
      {
        previousSourceBindingHash: extension.previousSourceBindingHash,
        preExtensionSourceLocalClauseCount: extension.previousSourceLocalClauseIds.length,
        addedAliasLocalClauseCount: extension.addedSourceLocalClauseIds.length,
      },
    ));
  }
  if (changedPreExtensionSourceRows !== 0
    || canonicalById.size !== input.residualMergeBatch.cumulativeCanonicalClauseCount
    || localToCanonical.size !== input.residualMergeBatch.cumulativeReviewedLocalClauseCount) {
    fail("global_canonical_finalization_residual_materialization_invalid");
  }
  const planRowById = new Map(input.plan.localClauseIndex.map((row) => [row.localClauseId, row]));
  const remainingRows = input.plan.localClauseIndex
    .filter((row) => !localToCanonical.has(row.localClauseId))
    .sort((left, right) => left.localClauseId.localeCompare(right.localClauseId));
  if (remainingRows.length !== input.residualMergeBatch.remainingLocalClauseCount) {
    fail("global_canonical_finalization_remaining_denominator_mismatch");
  }
  for (const row of remainingRows) {
    const canonicalClauseId = singletonCanonicalId(row, policy);
    if (canonicalById.has(canonicalClauseId)) {
      fail("global_canonical_finalization_singleton_id_collision", canonicalClauseId);
    }
    const sourceRows = [{ ...row }];
    const clause = {
      canonicalClauseId,
      canonicalSemanticClass: row.semanticClass,
      disposition: row.disposition,
      sourceLocalClauseIds: [row.localClauseId],
      sourceRows,
      sourceBindingHash: hashStarcraftTmgContract({ sourceRows }),
      formation: "residual_singleton",
      formationBatchId: "global-canonical-clause-singleton-finalization-v1",
      reviewBasisCode: policy.reviewBasisCode,
      eligibleForRuleAtomMapping: row.eligibleForRuleAtomMapping === true,
      executable: false,
      trainingTruth: false,
    };
    canonicalById.set(canonicalClauseId, clause);
    localToCanonical.set(row.localClauseId, canonicalClauseId);
  }
  const canonicalClauses = [...canonicalById.values()]
    .sort((left, right) => left.canonicalClauseId.localeCompare(right.canonicalClauseId));
  const localToCanonicalIndex = [...localToCanonical.entries()]
    .map(([localClauseId, canonicalClauseId]) => {
      const sourceRow = planRowById.get(localClauseId);
      const canonical = canonicalById.get(canonicalClauseId);
      if (!sourceRow || !canonical) {
        fail("global_canonical_finalization_local_index_dependency_missing", localClauseId);
      }
      return {
        localClauseId,
        canonicalClauseId,
        canonicalSourceBindingHash: canonical.sourceBindingHash,
        sourceIdentitySetHash: sourceRow.sourceIdentitySetHash,
        disposition: sourceRow.disposition,
        eligibleForRuleAtomMapping: sourceRow.eligibleForRuleAtomMapping,
      };
    }).sort((left, right) => left.localClauseId.localeCompare(right.localClauseId));
  const mappedIds = localToCanonicalIndex.map((row) => row.localClauseId);
  const planIds = input.plan.localClauseIndex.map((row) => row.localClauseId)
    .sort((left, right) => left.localeCompare(right));
  if (!isDeepStrictEqual(mappedIds, planIds)
    || new Set(canonicalClauses.map((clause) => clause.canonicalClauseId)).size
      !== canonicalClauses.length
    || canonicalClauses.length !== 1026) {
    fail("global_canonical_finalization_complete_mapping_invalid");
  }
  const canonicalCatalogueHash = hashStarcraftTmgContract({ canonicalClauses });
  const localToCanonicalIndexHash = hashStarcraftTmgContract({ localToCanonicalIndex });
  const body = {
    schema: FINALIZATION_SCHEMA,
    globalMergePlanHash: input.plan.planHash,
    previousBatchHashes: input.previousBatches.map((batch) => batch.batchHash),
    residualMergeBatchHash: input.residualMergeBatch.batchHash,
    finalizationPolicyHash: hashStarcraftTmgContract(policy),
    canonicalCatalogueHash,
    localToCanonicalIndexHash,
    canonicalClauses,
    localToCanonicalIndex,
    localClauseCount: localToCanonicalIndex.length,
    globalCanonicalClauseCount: canonicalClauses.length,
    singletonCanonicalClauseCount: remainingRows.length,
    preExtensionSourceRowChangeCount: changedPreExtensionSourceRows,
    canonicalMappingComplete: true,
    ruleAtomMappingComplete: false,
    finalizationStatus: "global_canonical_mapping_complete_rule_atom_mapping_pending",
    rulesEligible: false,
    canAffectRules: false,
    ctx2skillPromotionEligible: false,
    replayEligible: false,
    trainingTruth: false,
    blocks: [
      "rule_atom_mapping_pending",
      "executor_and_legal_space_coverage_pending",
      "judge_interaction_lifecycle_and_replay_pending",
    ],
  };
  return deepFreeze({ ...body, finalizationHash: hashStarcraftTmgContract(body) });
}

export function verifyGlobalCanonicalClauseFinalizationV1(input = {}) {
  if (!object(input.finalization) || input.finalization.schema !== FINALIZATION_SCHEMA) {
    fail("global_canonical_finalization_invalid");
  }
  if (hashStarcraftTmgContract(finalizationBody(input.finalization))
    !== input.finalization.finalizationHash) {
    fail("global_canonical_finalization_hash_mismatch");
  }
  const expected = createGlobalCanonicalClauseFinalizationV1(input);
  if (!isDeepStrictEqual(input.finalization, expected)) {
    fail("global_canonical_finalization_content_mismatch");
  }
  const planIds = new Set(input.plan.localClauseIndex.map((row) => row.localClauseId));
  const mappedIds = input.finalization.localToCanonicalIndex.map((row) => row.localClauseId);
  const canonicalIds = input.finalization.canonicalClauses.map((row) => row.canonicalClauseId);
  const sourceRows = input.finalization.canonicalClauses.flatMap((clause) => clause.sourceRows);
  const localClausesByDisposition = Object.fromEntries(["review_required", "display_only"].map((value) => [
    value,
    input.plan.localClauseIndex.filter((row) => row.disposition === value).length,
  ]));
  return deepFreeze({
    valid: true,
    counts: {
      localClauses: input.plan.localClauseIndex.length,
      mappedLocalClauses: new Set(mappedIds).size,
      unmappedLocalClauses: [...planIds].filter((id) => !mappedIds.includes(id)).length,
      duplicateLocalClauseMappings: mappedIds.length - new Set(mappedIds).size,
      unknownLocalClauseMappings: mappedIds.filter((id) => !planIds.has(id)).length,
      canonicalClauses: canonicalIds.length,
      duplicateCanonicalClauseIds: canonicalIds.length - new Set(canonicalIds).size,
      singletonCanonicalClauses: input.finalization.canonicalClauses.filter((clause) => (
        clause.formation === "residual_singleton"
      )).length,
      localToCanonicalReduction: mappedIds.length - canonicalIds.length,
      localClausesByDisposition,
      ruleAtomEligibleLocalClauses: input.plan.localClauseIndex.filter((row) => (
        row.eligibleForRuleAtomMapping === true
      )).length,
      displayOnlyLocalClauses: input.plan.localClauseIndex.filter((row) => (
        row.disposition === "display_only"
      )).length,
      canonicalSourceRows: sourceRows.length,
      changedPreExtensionSourceRows: input.finalization.preExtensionSourceRowChangeCount,
    },
  });
}
