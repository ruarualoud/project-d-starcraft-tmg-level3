const SCHEMA = "starcraft_tmg_global_canonical_clause_semantic_merge_batch_binding_v1";
const GLOBAL_MERGE_PLAN_HASH = "8068f9635e473d3a4c72849aacb997a87365d46c8e5479d877bf1c68bbee4618";
const PREVIOUS_BATCH_HASH = "f881fdc48a64f7be2506abf36e4c5d10a1c668054848a34441678ecd108c83e2";
const SEMANTIC_CANDIDATE_EXPANSION_HASH = "083601ed5407d9604cde126b2375cca496e9797d9cc2ecc1325b5e84ee3eb4fd";

function merge(groupId, canonicalClauseId, canonicalSemanticClass, sourceLocalClauseIds, reviewBasisCode) {
  return {
    groupId,
    decision: "merge_equivalent",
    reviewBasisCode,
    canonicalMappings: [{ canonicalClauseId, canonicalSemanticClass, sourceLocalClauseIds }],
  };
}

function keep(groupId, canonicalMappings, reviewBasisCode) {
  return {
    groupId,
    decision: "keep_distinct_context",
    reviewBasisCode,
    canonicalMappings,
  };
}

function one(canonicalClauseId, canonicalSemanticClass, sourceLocalClauseId) {
  return { canonicalClauseId, canonicalSemanticClass, sourceLocalClauseIds: [sourceLocalClauseId] };
}

export const GLOBAL_CANONICAL_CLAUSE_MERGE_BATCH_2_BINDING_V1 = Object.freeze({
  schema: SCHEMA,
  globalMergePlanHash: GLOBAL_MERGE_PLAN_HASH,
  previousBatchHash: PREVIOUS_BATCH_HASH,
  semanticCandidateExpansionHash: SEMANTIC_CANDIDATE_EXPANSION_HASH,
  groupDecisions: Object.freeze([
    merge(
      "semantic-candidate:0b0a596dd9550d5e8721",
      "canonical:reaction-limit-examples",
      "example",
      ["core:10.4:reaction-limit-examples", "core:2.7.3:reaction-examples"],
      "same_examples_with_ocr_spacing_variation",
    ),
    merge(
      "semantic-candidate:1b28a84dc2a1392211f2",
      "canonical:model-wholly-within-definition",
      "definition",
      ["core:11:wholly-within-model", "core:4.2:model-wholly-within"],
      "same_model_wholly_within_definition",
    ),
    merge(
      "semantic-candidate:22162f1c8e088210a137",
      "canonical:model-within-definition",
      "definition",
      ["core:11:within-model", "core:4.2:model-within"],
      "same_model_within_definition",
    ),
    keep(
      "semantic-candidate:2670bacafd21d14c581b",
      [
        one("canonical:movement-first-pass-priority", "priority", "core:12.3:first-pass-priority"),
        one("canonical:combat-first-pass-priority", "priority", "core:12.4:first-pass-priority"),
      ],
      "same_sentence_shape_but_different_destination_phase",
    ),
    merge(
      "semantic-candidate:2ad14d7552c62f9debe6",
      "canonical:per-activation-reaction-limit",
      "constraint",
      ["core:10.4:per-activation-reaction-limit", "core:2.7.3:one-reaction-per-player-activation"],
      "same_per_player_per_activation_limit",
    ),
    keep(
      "semantic-candidate:2db6ef2d91d5da19da0b",
      [
        one("canonical:respawn-enemy-separation", "constraint", "core:11:respawn-enemy-separation"),
        one("canonical:summon-enemy-separation", "constraint", "core:11:summon-enemy-separation"),
      ],
      "same_endpoint_constraint_but_different_entry_mechanism",
    ),
    keep(
      "semantic-candidate:4993b362d890d7f83610",
      [
        one("canonical:mission-engagement-scale-field", "classification", "core:5.5:mission-engagement-scale"),
        one("canonical:deployment-engagement-scale-field", "classification", "core:5.6:deployment-engagement-scale"),
      ],
      "same_field_shape_but_different_official_record_type",
    ),
    merge(
      "semantic-candidate:6388e6f50afae3408161",
      "canonical:reaction-reserve-prohibition",
      "constraint",
      ["core:10.4:reaction-reserve-prohibition", "core:2.7.3:reaction-reserves"],
      "same_reserve_prohibition_and_exception",
    ),
    merge(
      "semantic-candidate:6bbaf629f9da45f4e693",
      "canonical:ground-level-effective-size",
      "definition",
      ["core:11:effective-size-ground-level-restatement", "core:11:ground-level-effective-size"],
      "same_glossary_definition_with_ocr_spacing_variation",
    ),
    merge(
      "semantic-candidate:76c5754bf941d743ae4a",
      "canonical:negative-modifier-direction",
      "definition",
      ["core:11:negative-modifier", "core:3.4:negative-modifier"],
      "same_target_number_modifier_direction",
    ),
    merge(
      "semantic-candidate:794d17941d1222d83410",
      "canonical:independent-terrain-cover-assessment",
      "constraint",
      ["core:11:line-of-sight-independent-terrain-assessment", "core:7.1.1:independent-terrain-cover"],
      "same_independent_terrain_cover_rule",
    ),
    merge(
      "semantic-candidate:7b4086cf8198bc8c4c0e",
      "canonical:flying-base-pass-through",
      "permission",
      ["core:11:flying-base-pass-through", "core:8.5.3:ground-flying-base-passage"],
      "same_bidirectional_flying_base_passage_permission",
    ),
    merge(
      "semantic-candidate:7dd003912f2e37e42753",
      "canonical:mid-ground-cross-elevation-engagement",
      "constraint",
      ["core:11:mid-ground-access-point-engagement", "core:7.2.1:mid-ground-access-engagement"],
      "same_shared_access_point_engagement_constraint",
    ),
    merge(
      "semantic-candidate:83606777e12457243b3d",
      "canonical:combat-tag-targeting-restriction",
      "constraint",
      ["core:11:combat-tag-targeting", "core:2.4.2:tag-targeting"],
      "same_tag_restricted_weapon_targeting_rule",
    ),
    keep(
      "semantic-candidate:8c64f67030e95ab133c4",
      [
        one("canonical:tactical-card-resource-field", "definition", "core:5.3:tactical-card-resource"),
        one("canonical:faction-card-resource-field", "definition", "core:5.4:faction-card-resource"),
      ],
      "same_field_wording_but_different_card_type_scope",
    ),
    merge(
      "semantic-candidate:98651672c747f2e6da9d",
      "canonical:positive-modifier-direction",
      "definition",
      ["core:11:positive-modifier", "core:3.4:positive-modifier"],
      "same_target_number_modifier_direction",
    ),
    merge(
      "semantic-candidate:ad18a9e351b2688662a1",
      "canonical:ground-tag-elevation-terminology-distinction",
      "terminology_note",
      ["core:11:ground-tag-elevation-distinction", "core:2.7.1:ground-terminology-note"],
      "same_terminology_disambiguation_with_ocr_spacing_variation",
    ),
    merge(
      "semantic-candidate:b64d8d71b69144b5d1b3",
      "canonical:line-of-sight-direct-cover",
      "constraint",
      ["core:11:line-of-sight-direct-cover", "core:7.1.1:direct-cover"],
      "same_direct_cover_condition_and_result",
    ),
    merge(
      "semantic-candidate:c5a0e3fa6a76dbd549ea",
      "canonical:high-ground-ground-level-engagement-prohibition",
      "constraint",
      ["core:11:high-ground-engagement-prohibition", "core:7.2.1:elevation-engagement"],
      "same_bidirectional_elevation_engagement_prohibition",
    ),
    merge(
      "semantic-candidate:cc89b2cc7aace0457bd4",
      "canonical:flying-cannot-be-engaged",
      "constraint",
      ["core:11:flying-cannot-be-engaged", "core:7.2.1:flying-not-engaged"],
      "same_flying_engagement_exclusion",
    ),
    keep(
      "semantic-candidate:d0f9e2a59663f483ab74",
      [
        one("canonical:general-unit-activation-alternation", "timing", "core:8.2:unit-activation-alternation"),
        one("canonical:engaged-combat-activation-alternation", "timing", "core:8.8:alternating-combat-activation"),
      ],
      "same_alternation_shape_but_combat_rule_has_engaged_unit_scope",
    ),
    merge(
      "semantic-candidate:d47ee2ff8777833ce3bc",
      "canonical:unit-wholly-within-definition",
      "definition",
      ["core:11:wholly-within-unit", "core:4.2:unit-wholly-within"],
      "same_all_models_wholly_within_definition",
    ),
    keep(
      "semantic-candidate:de9c8b78cebbc9cb5731",
      [
        one("canonical:tactical-card-special-ability-field", "classification", "core:5.3:tactical-card-abilities"),
        one("canonical:faction-card-special-ability-field", "classification", "core:5.4:faction-card-abilities"),
      ],
      "same_field_wording_but_different_card_type_scope",
    ),
    merge(
      "semantic-candidate:eb8a5ee640027b576299",
      "canonical:named-active-ability-per-unit-round-limit",
      "constraint",
      ["core:11:active-ability-use-limit", "core:2.7.1:active-per-unit-round-limit"],
      "same_named_active_ability_frequency_and_repeatable_exception",
    ),
    merge(
      "semantic-candidate:f45978fa04cad634fec2",
      "canonical:engagement-range-horizontal-distance",
      "definition",
      ["core:11:engagement-range-distance", "core:7.2:engagement-range"],
      "same_engagement_range_definition",
    ),
    merge(
      "semantic-candidate:f917e7091c697607b897",
      "canonical:battlefield-elevation-band-map",
      "definition",
      ["core:11:elevation-level-map", "core:8.5.3:elevation-bands"],
      "same_three_elevation_band_definition",
    ),
    merge(
      "semantic-candidate:fa924ef4d46a49df58af",
      "canonical:engaged-non-contact-casualty-priority",
      "priority",
      ["core:12.7:engaged-casualty-priority-two", "core:8.7.5:casualty-priority-two"],
      "same_second_casualty_removal_priority",
    ),
  ]),
});
