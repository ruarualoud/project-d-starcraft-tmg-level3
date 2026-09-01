import {
  OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_ACTION_TYPE,
  OFFICIAL_BATTLEFIELD_TOKEN_MARKER_CLEANUP_ACTION_TYPE,
  OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_EXECUTOR_ID,
  OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_EXECUTOR_VERSION,
  OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_NEW_ATOM_IDS,
  OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_TRANSITION_SCHEMA,
} from "./official-battlefield-token-marker-rules-executor-v1.mjs";
import { createOfficialBattlefieldTokenMarkerRulesRelationshipExtensionV1 } from
  "./official-battlefield-token-marker-rules-relationship-contract-v1.mjs";
import { createOfficialBalancedTerrainRulesRelationshipExtensionV1 } from
  "./official-balanced-terrain-rules-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH } from
  "./official-remaining-rule-atom-route-v2.mjs";

const CONFIG = Object.freeze({
  prefix: "BATTLEFIELD_TOKEN_MARKER_RULES",
  schema: "starcraft_tmg_official_battlefield_token_marker_rules_rule_slice_v1",
  catalogueVersion: "0.109.0-official-battlefield-token-marker-rules",
  ordinal: 109,
  actionSchemaVersion: "hybrid_legal_space_v47",
  previousActionSchemaVersion: "hybrid_legal_space_v46",
  previous: {
    schema: "starcraft_tmg_official_balanced_terrain_rules_rule_slice_v1",
    sliceHash: "55fbcd3ddd3cc139a41fdbfb0888a99238250fbcb3de14c6d4b69cddcc5aa5bd",
    catalogueHash: "b59551acb4f23c65520bab35b250a9bbde0ab1ff781df87ec4af92a8da0458db",
    runtimeHash: "06b7599333f098daa7741e8607ec57ceb562d1af5194661b2d18b42d5b62d1ce",
    graphHash: "0c3bb9eeda90208924cf79657cd3a2f682c422e36c5de0fc8b4adc20912eaa16",
    relationship: createOfficialBalancedTerrainRulesRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "139a4f04c79b6ac38bb5becf4a9250331a10b633021c6793f0ac20d0a45e670f",
    catalogueHash: "a72cd596d12b656aad71521ae8c95925a52aac7d48d3f69f289454347a7160d8",
    runtimeHash: "1b59d0467d49145fa81f2ffb7de70a33f1db033d76078f439dbdef64775579c8",
    graphHash: "6612a5f597990381f2b896f84f29fe816fba6dcf46bcd06ed6c952035776f897",
  },
  counts: { previousExecutable: 883, previousReview: 29,
    executable: 894, review: 18, displayOnly: 114, executors: 78 },
  remainingSlices: 2,
  newAtomIds: OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_NEW_ATOM_IDS,
  executor: { id: OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_EXECUTOR_ID,
    version: OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_ACTION_TYPE,
      OFFICIAL_BATTLEFIELD_TOKEN_MARKER_CLEANUP_ACTION_TYPE],
    transitionSchema: OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_TRANSITION_SCHEMA },
  actionType: OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_ACTION_TYPE,
  parameterKind: "official_battlefield_token_marker_registry_v1",
  relationship: createOfficialBattlefieldTokenMarkerRulesRelationshipExtensionV1,
  actor: "pregame_participant",
  timing: { phase: "pre_game", window: "token_marker_registry", priority: 209 },
  preconditions: [{
    predicateId: "battlefield_token_marker.slice108_terrain_and_markers_complete",
    inputSchema: "starcraft_tmg_official_balanced_terrain_setup_certificate_v1",
    failureCode: "BATTLEFIELD_TOKEN_MARKER_PROCEDURE_WINDOW_INVALID",
  }, {
    predicateId: "battlefield_token_marker.exact_part7_source_contract",
    inputSchema: "starcraft_tmg_official_battlefield_token_marker_rules_data_bundle_v1",
    failureCode: "BATTLEFIELD_TOKEN_MARKER_SOURCE_LOCK_BINDING_INVALID",
  }, {
    predicateId: "battlefield_token_marker.rules_derive_views_not_css_truth",
    inputSchema: "starcraft_tmg_official_deployment_geometry_binding_v1",
    failureCode: "BATTLEFIELD_TOKEN_MARKER_GEOMETRY_BINDING_MISMATCH",
  }],
  chance: { kind: "none" },
  rejectionCodes: ["BATTLEFIELD_TOKEN_MARKER_ACTION_INVALID",
    "BATTLEFIELD_TOKEN_MARKER_ACTION_STALE",
    "BATTLEFIELD_TOKEN_MARKER_PROCEDURE_WINDOW_INVALID",
    "BATTLEFIELD_TOKEN_BASE_DIAMETER_INVALID",
    "BATTLEFIELD_TOKEN_COORDINATE_INVALID",
    "BATTLEFIELD_MARKER_KIND_INVALID",
    "BATTLEFIELD_TOKEN_MARKER_DATA_LINEAGE_INVALID"],
  evidenceSlug: "battlefield-token-marker-rules-v1",
  evidenceFixtures: { positive:
      "tangible-token-and-five-derived-marker-kinds",
    negative: "forged-source-size-overlap-and-visual-truth-rejection",
    interaction: "slice107-viewport-slice108-setup-and-frozen-consumers",
    lifecycle: "cleanup-initiative-activation-control-and-authority-replay" },
  executableScope:
    "official_token_terrain_base_overlap_expiry_measurement_and_intangible_specialized_marker_primitives",
  progressKey: "battlefieldTokenMarkerRulesProgress",
  progress: { promotedAtomCount: 11,
    routeV2Hash: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH,
    routeV2ExactSliceAtomCount: 11,
    tangibleTokenOwnBaseAndSizeZeroExecutable: true,
    tokenPassThroughAndEndOverlapExecutable: true,
    tokenClosestBaseEdgeMeasurementExecutable: true,
    tokenDefaultEndRoundExpiryExecutable: true,
    intangibleMarkerNoLosOrMovementBlockingExecutable: true,
    activationMarkerMovementAndAssaultFacesExecutable: true,
    factionIndicatorRolesExecutable: true,
    modeMarkerStayInPlayExecutable: true,
    partialEntryEdgeZoiCornersExecutable: true,
    firstPlayerMarkerStateProjectionExecutable: true,
    cleanupExceptionClassificationExecutable: true,
    webAppUniformTokenMarkerProjectionExecutable: true,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false },
  contractGroup: "battlefield_token_marker_rules_v1",
  frozenExecutorIds: ["authority.balanced-terrain-rules-v1",
    "authority.cleanup-refresh-v5", "authority.phase-initiative-v1",
    "authority.round-phase-activation-rules-v1",
    "authority.mission-marker-control-v3"],
  judgeTests: 55,
  agentDecisionEvidence:
    "rules_owned_token_geometry_and_state_derived_marker_views_not_frontend_truth",
  userVisibleChecks: [
    "web_and_app_keep_map_model_token_scale_identical",
    "marker_icons_and_touch_targets_never_create_rules_footprints",
    "activation_control_mode_zone_and_first_player_markers_explain_their_state_source",
  ],
  blocks: ["eighteen_actionable_atoms_remain_non_executable",
    "ability_specific_token_creation_actions_remain_owned_by_future_ability_slices",
    "production_room_ui_agent_skill_selfplay_muzero_pending"],
});

export function createOfficialBattlefieldTokenMarkerRulesRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialBattlefieldTokenMarkerRulesRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
