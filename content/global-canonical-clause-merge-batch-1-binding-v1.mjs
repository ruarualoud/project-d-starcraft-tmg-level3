function merge(groupId, canonicalClauseId, canonicalSemanticClass, sourceLocalClauseIds, reviewBasisCode) {
  return Object.freeze({
    groupId,
    decision: "merge_equivalent",
    reviewBasisCode,
    canonicalMappings: Object.freeze([
      Object.freeze({
        canonicalClauseId,
        canonicalSemanticClass,
        sourceLocalClauseIds: Object.freeze(sourceLocalClauseIds),
      }),
    ]),
  });
}

function keep(groupId, mappings, reviewBasisCode) {
  return Object.freeze({
    groupId,
    decision: "keep_distinct_context",
    reviewBasisCode,
    canonicalMappings: Object.freeze(mappings.map((mapping) => Object.freeze({
      ...mapping,
      sourceLocalClauseIds: Object.freeze(mapping.sourceLocalClauseIds),
    }))),
  });
}

export const GLOBAL_CANONICAL_CLAUSE_MERGE_BATCH_1_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_global_canonical_clause_merge_batch_binding_v1",
  globalMergePlanHash: "8068f9635e473d3a4c72849aacb997a87365d46c8e5479d877bf1c68bbee4618",
  reviewBatchId: "global-review-001-potential-merges",
  groupDecisions: Object.freeze([
    merge(
      "merge-candidate:exact_source_hash_set:0fcb9ecf3481609b",
      "canonical:shielded-status-heal-restoration-forbidden",
      "constraint",
      ["core:11:shielded-heal-no-restore", "core:5.1:shield-heal-restriction"],
      "identical_source_and_semantic_constraint",
    ),
    merge(
      "merge-candidate:exact_source_hash_set:117f61cd272b5ecd",
      "canonical:status-marker-stay-in-play",
      "classification",
      ["core:11:status-effect-stay-in-play", "core:11:status-mode-stay-in-play"],
      "identical_predicate_covers_both_status_marker_categories",
    ),
    keep(
      "merge-candidate:exact_source_hash_set:11aee7a9ba49da4b",
      [
        {
          canonicalClauseId: "canonical:movement-phase-hold-action",
          canonicalSemanticClass: "action",
          sourceLocalClauseIds: ["core:12.3:hold-summary"],
        },
        {
          canonicalClauseId: "canonical:assault-phase-hold-action",
          canonicalSemanticClass: "action",
          sourceLocalClauseIds: ["core:12.4:hold-action-summary"],
        },
      ],
      "same_wording_but_distinct_phase_timing",
    ),
    merge(
      "merge-candidate:exact_source_hash_set:32094893ba9ca1e3",
      "canonical:race-faction-tag-set",
      "classification",
      ["core:11:race-tag-set", "core:2.4.1:race-tags"],
      "identical_source_and_semantic_classification",
    ),
    merge(
      "merge-candidate:exact_source_hash_set:3a5d7ad610fd4c9d",
      "canonical:sub-faction-tag-classification",
      "classification",
      ["core:11:sub-faction-tags", "core:2.4.1:sub-faction-tags"],
      "identical_source_and_semantic_classification",
    ),
    merge(
      "merge-candidate:exact_source_hash_set:4d013eab055cc570",
      "canonical:modified-target-number-bounds",
      "constraint",
      ["core:11:modified-target-number-bounds", "core:3.4:target-number-bounds"],
      "identical_source_and_semantic_constraint",
    ),
    merge(
      "merge-candidate:exact_source_hash_set:521e14aceea99ad3",
      "canonical:transferred-control-owner-equivalence",
      "constraint",
      ["core:11:control-transfer-equivalence", "core:2.5:control-transfer"],
      "identical_source_behavior_with_constraint_classification",
    ),
    merge(
      "merge-candidate:exact_source_hash_set:713101da2036bf7a",
      "canonical:combat-tag-type-set",
      "classification",
      ["core:11:combat-tag-list", "core:2.4.2:combat-tag-list"],
      "identical_source_and_semantic_classification",
    ),
    merge(
      "merge-candidate:exact_source_hash_set:b0a8a9c86033fdaf",
      "canonical:surge-target-combat-tag-match",
      "constraint",
      ["core:11:combat-tag-surge", "core:2.4.2:surge-type-match"],
      "identical_source_and_semantic_constraint",
    ),
    merge(
      "merge-candidate:normalized_review_title:6c63e4eed138140a",
      "canonical:final-round-unlimited-supply",
      "permission",
      ["core:6.2:final-round-unlimited-supply", "core:8.3.1:final-round-unlimited-supply"],
      "equivalent_final_round_supply_permission",
    ),
    merge(
      "merge-candidate:normalized_review_title:9411ca046ba42c2f",
      "canonical:cleanup-refreshes-exhausted-cards",
      "timing",
      ["core:11:ready-cleanup-refresh", "core:12.6:refresh-cards-step"],
      "equivalent_cleanup_refresh_timing",
    ),
    merge(
      "merge-candidate:normalized_review_title:c3ed7e8c122274c9",
      "canonical:combat-tag-definition",
      "definition",
      ["core:11:combat-tags-definition", "core:2.4.2:combat-tag-definition"],
      "same_definition_with_glossary_location_detail",
    ),
    keep(
      "merge-candidate:normalized_review_title:d6c3bf82427c70dd",
      [
        {
          canonicalClauseId: "canonical:faction-tag-unit-allegiance",
          canonicalSemanticClass: "definition",
          sourceLocalClauseIds: ["core:2.4.1:faction-tag-definition"],
        },
        {
          canonicalClauseId: "canonical:faction-card-tag-eligibility",
          canonicalSemanticClass: "constraint",
          sourceLocalClauseIds: ["core:9.1.2:faction-tag-definition"],
        },
      ],
      "same_review_label_but_different_subject_and_obligation",
    ),
    merge(
      "merge-candidate:normalized_review_title:d7974c75d2b9fac4",
      "canonical:available-supply-formula",
      "definition",
      ["core:11:available-supply-formula", "core:8.3.2:available-supply-formula"],
      "equivalent_available_supply_formula",
    ),
  ]),
});
