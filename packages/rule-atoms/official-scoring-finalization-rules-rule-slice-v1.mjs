import {
  OFFICIAL_SCORING_FINALIZATION_RULES_ACTION_TYPE,
  OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_ID,
  OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_VERSION,
  OFFICIAL_SCORING_FINALIZATION_RULES_NEW_ATOM_IDS,
  OFFICIAL_SCORING_FINALIZATION_RULES_TRANSITION_SCHEMA,
} from "./official-scoring-finalization-rules-executor-v1.mjs";
import { createOfficialScoringFinalizationRulesRelationshipExtensionV1 } from
  "./official-scoring-finalization-rules-relationship-contract-v1.mjs";
import { createOfficialBattlefieldTokenMarkerRulesRelationshipExtensionV1 } from
  "./official-battlefield-token-marker-rules-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH } from
  "./official-remaining-rule-atom-route-v2.mjs";

const CONFIG = Object.freeze({
  prefix: "SCORING_FINALIZATION_RULES",
  schema: "starcraft_tmg_official_scoring_finalization_rules_rule_slice_v1",
  catalogueVersion: "0.110.0-official-scoring-finalization-rules",
  ordinal: 110,
  actionSchemaVersion: "hybrid_legal_space_v48",
  previousActionSchemaVersion: "hybrid_legal_space_v47",
  previous: {
    schema: "starcraft_tmg_official_battlefield_token_marker_rules_rule_slice_v1",
    sliceHash: "139a4f04c79b6ac38bb5becf4a9250331a10b633021c6793f0ac20d0a45e670f",
    catalogueHash: "a72cd596d12b656aad71521ae8c95925a52aac7d48d3f69f289454347a7160d8",
    runtimeHash: "1b59d0467d49145fa81f2ffb7de70a33f1db033d76078f439dbdef64775579c8",
    graphHash: "6612a5f597990381f2b896f84f29fe816fba6dcf46bcd06ed6c952035776f897",
    relationship: createOfficialBattlefieldTokenMarkerRulesRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "283c21b9aa3f7d9220c89cf62f63a73baec4eaa0d8b9890adcc05f965e6be39a",
    catalogueHash: "7488a01ac487b4544fc7c09080dcf8242b50bf701577154cd5b806a5d52d0777",
    runtimeHash: "d0aebfd5de012a3eb7821a3cb5c698304551c641d38b6ce9ef8a0cbc4481c413",
    graphHash: "07ccc04786a2e0845a8e3147c715cfb44563efb3ab1acdf13e433dadbfaa5753",
  },
  counts: { previousExecutable: 894, previousReview: 18,
    executable: 908, review: 4, displayOnly: 114, executors: 79 },
  remainingSlices: 1,
  newAtomIds: OFFICIAL_SCORING_FINALIZATION_RULES_NEW_ATOM_IDS,
  executor: { id: OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_ID,
    version: OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_SCORING_FINALIZATION_RULES_ACTION_TYPE],
    transitionSchema: OFFICIAL_SCORING_FINALIZATION_RULES_TRANSITION_SCHEMA },
  actionType: OFFICIAL_SCORING_FINALIZATION_RULES_ACTION_TYPE,
  parameterKind: "official_scoring_finalization_procedure_v1",
  relationship: createOfficialScoringFinalizationRulesRelationshipExtensionV1,
  actor: "first_player_or_roll_off_winner",
  timing: { phase: "pre_game_or_cleanup", window: "initiative_or_end_game", priority: 210 },
  preconditions: [{
    predicateId: "scoring_finalization.frozen_source_and_data_lineage",
    inputSchema: "starcraft_tmg_official_scoring_finalization_rules_data_bundle_v1",
    failureCode: "SCORING_FINALIZATION_SOURCE_LOCK_BINDING_INVALID",
  }, {
    predicateId: "scoring_finalization.atomic_marker_control_output_only",
    inputSchema: "starcraft_tmg_official_mission_marker_control_transition_v3",
    failureCode: "FINAL_SCORE_CONTROL_RESOLUTION_STALE",
  }, {
    predicateId: "scoring_finalization.world_inches_not_frontend_pixels",
    inputSchema: "starcraft_tmg_official_battlefield_token_marker_registry_v1",
    failureCode: "SCORING_FINALIZATION_DATA_LINEAGE_INVALID",
  }],
  chance: { kind: "chance_ticket", ticketSchema: "starcraft_tmg_chance_bundle_v1" },
  rejectionCodes: ["SCORING_FINALIZATION_ACTION_INVALID",
    "SCORING_FINALIZATION_ACTION_STALE",
    "INITIAL_FIRST_PLAYER_ROLL_OFF_REVEALS_REQUIRED",
    "FINAL_SCORE_CONTROL_RESOLUTION_STALE",
    "ARMY_ELIMINATION_SIMULTANEOUS_OUTCOME_UNRESOLVED",
    "ROUND_LIMIT_MISSION_TIEBREAKER_EXECUTOR_REQUIRED",
    "SCORING_FINALIZATION_DATA_LINEAGE_INVALID"],
  evidenceSlug: "scoring-finalization-rules-v1",
  evidenceFixtures: { positive: "rolloff-control-elimination-and-final-score",
    negative: "forged-rolls-pixels-stale-control-and-simultaneous-elimination",
    interaction: "slice78-control-slice96-reserve-slice109-marker-views",
    lifecycle: "pregame-assignment-cleanup-terminal-and-authority-replay" },
  executableScope:
    "official_initial_first_player_marker_atomic_control_consumption_army_elimination_round_limit_and_final_score",
  progressKey: "scoringFinalizationRulesProgress",
  progress: { promotedAtomCount: 14,
    routeV2Hash: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH,
    routeV2ExactSliceAtomCount: 14,
    initialTwoD6EachRollOffExecutable: true,
    tieRequiresFreshRollOffExecutable: true,
    rollOffWinnerAssignsEitherParticipantExecutable: true,
    firstPlayerMarkerStateReprojectionExecutable: true,
    frozenAtomicMarkerControlConsumedExecutable: true,
    higherSupplyAndTieContestedSemanticsBound: true,
    noFieldModelsAndNoReserveUnitsEliminationExecutable: true,
    survivorTenVpAwardExecutable: true,
    finalReserveDestructionConsumedExecutable: true,
    roundLimitFinalScoreExecutable: true,
    highestVpAndDrawFallbackExecutable: true,
    worldInchMapModelScaleInvariant: true,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false },
  contractGroup: "scoring_finalization_rules_v1",
  frozenExecutorIds: ["authority.mission-marker-control-v3",
    "authority.reserve-lifecycle-rules-v1",
    "authority.battlefield-token-marker-rules-v1",
    "authority.victory-point-scoring-v2",
    "authority.hold-position-end-game-check-v2"],
  judgeTests: 60,
  agentDecisionEvidence:
    "rules_owned_rolloff_finite_assignment_and_terminal_outcome_without_pixel_geometry",
  userVisibleChecks: [
    "map_zoom_pan_and_device_pixel_ratio_do_not_change_marker_control",
    "token_and_model_visual_size_never_replace_official_base_dimensions",
    "first_player_assignment_final_score_and_draw_reason_are_explainable",
  ],
  blocks: ["four_actionable_atoms_remain_non_executable",
    "simultaneous_army_elimination_requires_slice111_post_match_dispute_policy",
    "non_hold_position_arbitrary_mission_effect_execution_remains_fail_closed",
    "production_room_ui_agent_skill_selfplay_muzero_pending"],
});

export function createOfficialScoringFinalizationRulesRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialScoringFinalizationRulesRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
