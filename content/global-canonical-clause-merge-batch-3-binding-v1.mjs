const SCHEMA = "starcraft_tmg_global_canonical_clause_containment_merge_batch_binding_v1";
const GLOBAL_MERGE_PLAN_HASH = "8068f9635e473d3a4c72849aacb997a87365d46c8e5479d877bf1c68bbee4618";
const PREVIOUS_BATCH_HASH = "c5eda2ecb1ee817520579eba5f6d9cf364872b4d2b86c14034aa61e1bb702f5f";
const CONTAINMENT_CANDIDATE_EXPANSION_HASH = "4f3e1ea3c65553b2fa39307ebaa81127926cc62166c98f32794b14fe63b16e8e";

function merge(groupId, canonicalClauseId, canonicalSemanticClass, sourceLocalClauseIds, reviewBasisCode) {
  return {
    groupId,
    decision: "merge_equivalent",
    reviewBasisCode,
    canonicalMappings: [{ canonicalClauseId, canonicalSemanticClass, sourceLocalClauseIds }],
  };
}

function keep(groupId, canonicalSemanticClass, mappings, reviewBasisCode) {
  return {
    groupId,
    decision: "keep_distinct_context",
    reviewBasisCode,
    canonicalMappings: mappings.map(([canonicalClauseId, sourceLocalClauseId]) => ({
      canonicalClauseId,
      canonicalSemanticClass,
      sourceLocalClauseIds: [sourceLocalClauseId],
    })),
  };
}

export const GLOBAL_CANONICAL_CLAUSE_MERGE_BATCH_3_BINDING_V1 = Object.freeze({
  schema: SCHEMA,
  globalMergePlanHash: GLOBAL_MERGE_PLAN_HASH,
  previousBatchHash: PREVIOUS_BATCH_HASH,
  containmentCandidateExpansionHash: CONTAINMENT_CANDIDATE_EXPANSION_HASH,
  groupDecisions: Object.freeze([
    merge(
      "containment-candidate:03ecfb53bd3477947f60",
      "canonical:line-of-sight-top-down-projection",
      "definition",
      ["core:11:line-of-sight-top-down", "core:7.1:top-down-method"],
      "same_top_down_line_of_sight_definition",
    ),
    keep("containment-candidate:0425836c0fb96d8fed20", "timing", [
      ["canonical:shielded-loss-conditions", "core:11:shielded-loss-conditions"],
      ["canonical:shielded-lifecycle-and-effects", "core:5.1:shield-lifecycle"],
    ], "one_clause_is_only_the_loss_condition_while_the_other_adds_downstream_effects"),
    keep("containment-candidate:2105d88c3ed4e571ee01", "definition", [
      ["canonical:model-base-elevation-rule", "core:11:model-base-elevation"],
      ["canonical:multi-level-model-elevation-rule", "core:8.5.3:model-elevation-determination"],
    ], "longer_rule_adds_highest_elevation_resolution"),
    keep("containment-candidate:21b4ce9b0f05beee970b", "definition", [
      ["canonical:supply-pool-and-escalation-definition", "core:6.2:supply-pool"],
      ["canonical:supply-pool-capacity-definition", "core:8.3.1:supply-pool-definition"],
    ], "one_boundary_includes_mission_value_and_round_escalation"),
    keep("containment-candidate:24f3f08237fbcb9e15af", "definition", [
      ["canonical:mission-marker-physical-state", "core:11:mission-marker-physical-state"],
      ["canonical:mission-marker-full-specification", "core:7.3.2:mission-marker"],
    ], "physical_state_is_only_one_part_of_the_full_marker_specification"),
    keep("containment-candidate:2d073ee8f6003e8db80d", "definition", [
      ["canonical:high-ground-effective-size", "core:11:high-ground-effective-size"],
      ["canonical:mid-ground-effective-size", "core:11:mid-ground-effective-size"],
    ], "same_formula_shape_but_different_elevation_subject"),
    keep("containment-candidate:30e66038e7e9f7832dfe", "constraint", [
      ["canonical:hits-x-no-surge", "core:11:hits-x-no-surge"],
      ["canonical:impact-no-surge-damage-one", "core:11:impact-no-surge-damage-one"],
    ], "impact_rule_adds_damage_and_has_a_different_trigger"),
    keep("containment-candidate:343c468e22ce36460c58", "constraint", [
      ["canonical:ground-to-mid-access-point-engagement", "core:11:ground-mid-access-point-engagement"],
      ["canonical:high-to-mid-access-point-engagement", "core:11:high-mid-access-point-engagement"],
    ], "same_access_condition_but_different_origin_elevation"),
    merge(
      "containment-candidate:343fe7cbbdfc3c032ca8",
      "canonical:uncontested-zero-supply-control",
      "permission",
      ["core:6.2:supply-zero-control", "core:8.9.1:zero-supply-control"],
      "same_zero_supply_uncontested_control_permission",
    ),
    merge(
      "containment-candidate:42b020da04068da50f8e",
      "canonical:base-contact-casualty-priority",
      "priority",
      ["core:12.7:engaged-casualty-priority-three", "core:8.7.5:casualty-priority-three"],
      "same_third_casualty_removal_priority",
    ),
    keep("containment-candidate:58af8c64facc96ecca30", "constraint", [
      ["canonical:flying-enemy-endpoint-separation", "core:11:flying-enemy-endpoint-separation"],
      ["canonical:flying-engagement-and-endpoint-restrictions", "core:8.5.3:flying-engagement-endpoint"],
    ], "glossary_clause_is_only_the_endpoint_subset"),
    keep("containment-candidate:6727b40581c543f0c59a", "definition", [
      ["canonical:passive-ability-trait-definition", "core:10.3:passive-ability-definition"],
      ["canonical:passive-ability-behavior-and-battlefield-condition", "core:2.7.2:passive-ability-definition"],
    ], "behavior_boundary_adds_always_active_and_battlefield_conditions"),
    keep("containment-candidate:719d603d6b57e8809301", "definition", [
      ["canonical:unit-army-slot-requirement", "core:5.2:army-slot"],
      ["canonical:starting-supply-slot-cost", "core:9.1.6:starting-supply-slot-cost"],
    ], "field_requirement_and_cost_formula_are_related_but_not_equivalent"),
    keep("containment-candidate:765f7c5af078c593daa4", "priority", [
      ["canonical:general-first-player-phase-priority", "core:8.2:first-player-phase-priority"],
      ["canonical:combat-first-player-priority", "core:8.8:first-player-combat-priority"],
    ], "general_phase_priority_and_combat_application_keep_separate_scope"),
    keep("containment-candidate:7d1a419525147f59512d", "definition", [
      ["canonical:enemy-team-ownership-definition", "core:11:enemy-definition"],
      ["canonical:enemy-unit-basic-definition", "core:2.2:enemy-unit-definition"],
    ], "glossary_definition_adds_team_game_ownership"),
    keep("containment-candidate:87535b56822890e6fb51", "timing", [
      ["canonical:active-ability-action-window", "core:10.2:before-or-after-action-window"],
      ["canonical:active-ability-activation-and-window", "core:2.7.1:active-ability-timing"],
    ], "summary_boundary_adds_unit_activation_precondition"),
    keep("containment-candidate:8fe424f1dff6564fd005", "definition", [
      ["canonical:controlling-player-decision-authority", "core:11:controlling-player-decision-authority"],
      ["canonical:controlling-player-definition", "core:11:controlling-player-definition"],
      ["canonical:controlling-player-composite-definition", "core:2.5:controlling-player-definition"],
    ], "composite_source_boundary_contains_two_distinct_glossary_facts"),
    keep("containment-candidate:b19b212f6545a4b6df18", "timing", [
      ["canonical:first-passer-next-phase-marker", "core:8.2.1:first-passer-marker"],
      ["canonical:first-passer-phase-two-marker", "core:8.4.2:first-passer-phase-two-marker"],
      ["canonical:first-passer-phase-three-marker", "core:8.6.2:first-passer-phase-three-marker"],
    ], "general_and_phase_specific_marker_destinations_remain_distinct"),
    keep("containment-candidate:bcca00c2eb4d270a6bb0", "definition", [
      ["canonical:weapon-damage-characteristic", "core:5.1:weapon-damage"],
      ["canonical:weapon-damage-pool-calculation", "core:8.7.4:weapon-damage-calculation"],
    ], "characteristic_definition_is_not_the_damage_pool_formula"),
    merge(
      "containment-candidate:c32de6e63a439eb4925a",
      "canonical:active-player-definition",
      "definition",
      ["core:11:active-player-definition", "core:2.5:active-player-definition"],
      "same_active_player_definition_with_explanatory_context",
    ),
    keep("containment-candidate:c7c83ee42ed3d3911d7a", "definition", [
      ["canonical:blocking-terrain-effective-size-definition", "core:11:blocking-terrain-definition"],
      ["canonical:line-of-sight-unobstructed-visibility", "core:11:line-of-sight-unobstructed-visibility"],
    ], "character_substring_match_does_not_imply_semantic_equivalence"),
    keep("containment-candidate:c7ca501d0c464a4e2965", "constraint", [
      ["canonical:burrowed-mission-control-prohibition", "core:11:burrowed-no-mission-control"],
      ["canonical:flying-mission-control-prohibition", "core:11:flying-mission-marker-prohibition"],
      ["canonical:reserve-mission-control-prohibition", "core:11:reserves-mission-marker-restriction"],
      ["canonical:out-of-coherency-mission-control-prohibition", "core:4.4:out-of-coherency-mission-restriction"],
      ["canonical:flying-mission-control-restriction-summary", "core:6.2:flying-control-restriction"],
      ["canonical:flying-contest-prohibition", "core:8.9.1:flying-cannot-contest"],
    ], "same_result_phrase_has_distinct_preconditions_and_control_vs_contest_scope"),
    keep("containment-candidate:cca382e18f53ae087e5d", "definition", [
      ["canonical:movement-hold-no-action", "core:8.5.1:hold-no-action"],
      ["canonical:assault-hold-no-action", "core:8.7.2:assault-hold-no-action"],
    ], "same_no_action_result_but_different_phase_action"),
    merge(
      "containment-candidate:d164274ca2d23a728ce2",
      "canonical:reaction-ability-definition",
      "definition",
      ["core:10.4:reaction-ability-definition", "core:2.7.3:reaction-ability-definition"],
      "same_triggered_out_of_sequence_reaction_definition",
    ),
    keep("containment-candidate:dea6c760225c9edec136", "definition", [
      ["canonical:hits-x-damage-characteristic", "core:11:hits-x-damage-characteristic"],
      ["canonical:pierce-tag-damage", "core:11:pierce-tag-damage"],
    ], "same_damage_phrase_but_different_ability_mechanism"),
    keep("containment-candidate:e6e004a60284e9423075", "constraint", [
      ["canonical:reserve-deployment-available-supply-check", "core:11:deployment-available-supply"],
      ["canonical:reserve-deployment-and-available-supply-formula", "core:6.2:available-supply"],
    ], "longer_boundary_also_defines_available_supply"),
    merge(
      "containment-candidate:f052e3fe9410fe885532",
      "canonical:unused-army-slots-lost",
      "constraint",
      ["core:11:unused-army-slots-lost", "core:9.1.6:unused-army-slots-lost"],
      "same_unused_slot_loss_rule_with_glossary_elaboration",
    ),
    merge(
      "containment-candidate:f16971a764c18149cce0",
      "canonical:round-one-first-player-assignment",
      "priority",
      ["core:12.1:first-round-initiative-rolloff", "core:8.2.2:round-one-first-player-assignment"],
      "same_roll_off_winner_round_one_marker_assignment",
    ),
    keep("containment-candidate:fb3518775be472807167", "timing", [
      ["canonical:assault-action-activation-marker", "core:8.6.1:assault-activation-marker"],
      ["canonical:assault-hold-activation-marker", "core:8.7.2:assault-hold-marker"],
    ], "general_post_action_marker_and_hold_specific_marker_are_distinct"),
    keep("containment-candidate:fed77ead2ca946f912ba", "definition", [
      ["canonical:fighting-rank-membership", "core:11:fighting-rank-membership"],
      ["canonical:supporting-rank-glossary-membership", "core:11:supporting-rank-membership"],
      ["canonical:supporting-rank-core-eligibility", "core:8.8.1:supporting-rank"],
    ], "fighting_and_supporting_ranks_differ_and_glossary_adds_an_exclusion"),
    keep("containment-candidate:ff78c50f2ec97dc28787", "definition", [
      ["canonical:line-of-sight-terrain-footprint", "core:11:line-of-sight-terrain-footprint"],
      ["canonical:terrain-footprint-and-openings", "core:7.1:terrain-footprint"],
    ], "core_boundary_adds_opening_and_physical_shape_detail"),
  ]),
});
