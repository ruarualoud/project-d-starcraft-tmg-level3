import { createOfficialAssaultRunRelationshipExtensionV1 } from
  "./official-assault-run-relationship-contract-v1.mjs";
import {
  OFFICIAL_TEMPLATE_WEAPON_ACTION_TYPE,
  OFFICIAL_TEMPLATE_WEAPON_EXECUTOR_ID,
  OFFICIAL_TEMPLATE_WEAPON_EXECUTOR_VERSION,
  OFFICIAL_TEMPLATE_WEAPON_NEW_ATOM_IDS,
  OFFICIAL_TEMPLATE_WEAPON_PARAMETER_KIND,
  OFFICIAL_TEMPLATE_WEAPON_TRANSITION_SCHEMA,
} from "./official-template-weapon-executor-v1.mjs";
import { createOfficialTemplateWeaponRelationshipExtensionV1 } from
  "./official-template-weapon-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";

const CONFIG = Object.freeze({
  prefix: "TEMPLATE_WEAPON",
  schema: "starcraft_tmg_official_template_weapon_rule_slice_v1",
  catalogueVersion: "0.78.0-official-template-weapon-spillover",
  ordinal: 78,
  previous: {
    schema: "starcraft_tmg_official_assault_run_rule_slice_v1",
    sliceHash: "01bde989318c5641849c737f88e4a8635b718068d3da7bb8c2a0c7041bcb7293",
    catalogueHash: "45ab1dfde093421722ba3103b88cca3d869cea5cf0f81bcd5b38a428b5932716",
    runtimeHash: "f5ee9e1257369765fc33979491904eecb5f8dd41e67fedd413c8ff8c8973bad0",
    graphHash: "9611e56d98e60c118b8df0398857525af2c2caf96e1fb6cab94c6b7cde76fce2",
    relationship: createOfficialAssaultRunRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "77f415c1b6ef8363ecde758d71bd661822ddd9eeedf0156ab7b95e70eee7165b",
    catalogueHash: "5829d562f56df54b0e57a76ae130fba0c41a2ed57de3e93b7c6147839ee986ee",
    runtimeHash: "d21b5fb901e8b50a9f9e327b3968e7d8340473c158a04c8c628f1d93c16e1e17",
    graphHash: "3aef268d73670933d979486c2558db6b7a23941db92144648d672a00f099a763",
  },
  counts: {
    previousExecutable: 457, previousReview: 455,
    executable: 480, review: 432, displayOnly: 114, executors: 47,
  },
  remainingSlices: 33,
  newAtomIds: OFFICIAL_TEMPLATE_WEAPON_NEW_ATOM_IDS,
  executor: {
    id: OFFICIAL_TEMPLATE_WEAPON_EXECUTOR_ID,
    version: OFFICIAL_TEMPLATE_WEAPON_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_TEMPLATE_WEAPON_ACTION_TYPE],
    transitionSchema: OFFICIAL_TEMPLATE_WEAPON_TRANSITION_SCHEMA,
  },
  actionType: OFFICIAL_TEMPLATE_WEAPON_ACTION_TYPE,
  parameterKind: OFFICIAL_TEMPLATE_WEAPON_PARAMETER_KIND,
  relationship: createOfficialTemplateWeaponRelationshipExtensionV1,
  timing: { phase: "assault", window: "template_weapon_resolution", priority: 178 },
  preconditions: [{
    predicateId: "assault.template_geometry_and_primary_target_are_authoritatively_bound",
    inputSchema: "starcraft_tmg_official_template_weapon_pending_v1",
    failureCode: "TEMPLATE_PENDING_INVALID",
  }, {
    predicateId: "assault.template_procedure_uses_pinned_official_rule_source",
    inputSchema: "starcraft_tmg_official_development_tranche_source_lock_audit_v1",
    failureCode: "TEMPLATE_SOURCE_LOCK_BINDING_INVALID",
  }],
  chance: { kind: "chance_ticket", ticketSchema: "starcraft_tmg_chance_bundle_v1" },
  rejectionCodes: [
    "TEMPLATE_ACTION_INVALID", "TEMPLATE_ACTION_STALE",
    "TEMPLATE_ATTACK_PROFILE_INVALID", "TEMPLATE_BASE_GEOMETRY_UNSUPPORTED",
    "TEMPLATE_GEOMETRY_ASSET_INVALID", "TEMPLATE_PENDING_INVALID",
    "TEMPLATE_PRIMARY_MODEL_NOT_COVERED", "TEMPLATE_PRIMARY_TARGET_INVALID",
    "TEMPLATE_SOURCE_LOCK_BINDING_INVALID", "TEMPLATE_TERRAIN_GEOMETRY_INVALID",
  ],
  evidenceSlug: "template-weapon-v1",
  evidenceFixtures: {
    positive: "bt-ft-alignment-coverage-hit-pools",
    negative: "stale-source-terrain-elevation-and-tag-rejected",
    interaction: "friendly-enemy-spillover-separated-by-unit",
    lifecycle: "declaration-pending-resolution-armour-pools",
  },
  executableScope:
    "official_core_template_procedure_conformance_with_content_hashed_geometry_asset_no_current_carrier",
  progressKey: "templateWeaponProgress",
  progress: {
    promotedAtomCount: 23,
    blastAndFlamerAlignmentExecutable: true,
    baseElevationTerrainAndTargetTagCoverageExecutable: true,
    mainTargetRateModifierAndModelCountPoolExecutable: true,
    mainTargetAffectedModelSurgeResultExecutable: true,
    friendlyAndEnemySpilloverExecutable: true,
    spilloverSeparatedPerUnitWithoutRateModifierOrSurge: true,
    currentOfficialTemplateCarrierAvailable: false,
    officialTemplateGeometryAssetAvailable: false,
    productionCarrierQuarantined: true,
    sourceRefreshPerformed: false,
    repositoryFallbackUsed: false,
  },
  contractGroup: "template_weapon_spillover_v1",
  frozenExecutorIds: ["authority.ranged-attack-v6"],
  judgeTests: 16,
  agentDecisionEvidence: "rules_owned_template_coverage_and_per_unit_spillover_batches",
  userVisibleChecks: [
    "template_preview_identifies_main_and_spillover_models",
    "missing_current_carrier_is_displayed_as_quarantined_not_silently_substituted",
  ],
  blocks: [
    "four_hundred_thirty_two_actionable_atoms_remain_non_executable",
    "current_official_data_has_no_bt_ft_carrier_or_content_hashed_template_geometry_asset",
    "production_room_ui_agent_skill_selfplay_muzero_pending",
  ],
});

export function createOfficialTemplateWeaponRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialTemplateWeaponRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
