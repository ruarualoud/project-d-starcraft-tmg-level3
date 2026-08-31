import {
  OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_ACTION_TYPE,
  OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_EXECUTOR_ID,
  OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_EXECUTOR_VERSION,
  OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_NEW_ATOM_IDS,
  OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_PARAMETER_KIND,
  OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_TRANSITION_SCHEMA,
} from "./official-direct-movement-displacement-executor-v1.mjs";
import { createOfficialDirectMovementDisplacementRelationshipExtensionV1 } from
  "./official-direct-movement-displacement-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { createOfficialCloseCombatLifecycleRelationshipExtensionV1 } from
  "./official-close-combat-lifecycle-relationship-contract-v1.mjs";

const CONFIG = Object.freeze({
  prefix: "DIRECT_MOVEMENT_DISPLACEMENT",
  schema: "starcraft_tmg_official_direct_movement_displacement_rule_slice_v1",
  catalogueVersion: "0.81.0-official-direct-movement-displacement",
  ordinal: 81,
  previous: {
    schema: "starcraft_tmg_official_close_combat_lifecycle_rule_slice_v1",
    sliceHash: "72419eee486fe03bc11e7391cb63d5e7fc7f06ba6e02de1d80ab2487119a4f85",
    catalogueHash: "00108a2738d7b20edd5b9848edb7a080d1d328fab96e072dda477c8a3e05628f",
    runtimeHash: "c860bc9305abbdc615e8d4aab6b6a23ad54624f5effbe42863756f1b911cf270",
    graphHash: "9e9a9c0f879cc196abc3de87cab59a6c47395c096cfb04f8244f1f593f85fb0a",
    relationship: createOfficialCloseCombatLifecycleRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "1638c6c7521ad15fe874cf34fcbc4afa01eb2064203c437c64385c1c72935feb",
    catalogueHash: "6383216ec3ff3704ac8ce865f3b135b750dccd367be82f3cb1810c8b74206bcd",
    runtimeHash: "f312f141d77dcb6415aca3f78db455e9fb11e76495b815253f87c18a4af1af11",
    graphHash: "b7e502bea3ed2b29901fbd2113c7ee201314dd693005840ed8735440e5dabfcf",
  },
  counts: { previousExecutable: 501, previousReview: 411,
    executable: 510, review: 402, displayOnly: 114, executors: 50 },
  remainingSlices: 30,
  newAtomIds: OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_NEW_ATOM_IDS,
  executor: { id: OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_EXECUTOR_ID,
    version: OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_ACTION_TYPE],
    transitionSchema: OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_TRANSITION_SCHEMA },
  actionType: OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_ACTION_TYPE,
  parameterKind: OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_PARAMETER_KIND,
  relationship: createOfficialDirectMovementDisplacementRelationshipExtensionV1,
  timing: { phase: "any_effect_window", window: "involuntary_direct_movement", priority: 181 },
  preconditions: [{ predicateId: "direct_movement.complete_content_bound_geometry_certificate",
    inputSchema: "starcraft_tmg_official_direct_movement_displacement_pending_v1",
    failureCode: "DIRECT_MOVEMENT_PROCEDURE_CERTIFICATE_REQUIRED" },
  { predicateId: "direct_movement.uses_pinned_official_rule_source",
    inputSchema: "starcraft_tmg_official_development_tranche_source_lock_audit_v1",
    failureCode: "DIRECT_MOVEMENT_SOURCE_LOCK_BINDING_INVALID" }],
  chance: { kind: "none" },
  rejectionCodes: ["DIRECT_MOVEMENT_ACTION_INVALID", "DIRECT_MOVEMENT_ACTION_STALE",
    "DIRECT_MOVEMENT_PENDING_INVALID", "DIRECT_MOVEMENT_CHOICE_INVALID",
    "DIRECT_MOVEMENT_PARAMETER_DOMAIN_STALE",
    "DIRECT_MOVEMENT_SOURCE_LOCK_BINDING_INVALID"],
  evidenceSlug: "direct-movement-displacement-v1",
  evidenceFixtures: { positive: "towards-away-leading-reference-and-edge",
    negative: "longer-route-endpoint-overlap-source-and-stale-reject",
    interaction: "shortest-bypass-and-arbitrary-multi-model-pareto-placement",
    lifecycle: "displacement-contact-or-nearest-immediate-resolution" },
  executableScope:
    "official_direct_movement_displacement_procedure_conformance_current_source_lock",
  progressKey: "directMovementDisplacementProgress",
  progress: { promotedAtomCount: 9, directVectorExecutable: true,
    closestTowardsAndFurthestAwayReferenceExecutable: true,
    shortestBypassAndControllerTieChoiceExecutable: true,
    towardsAwayEndpointRelationExecutable: true,
    involuntaryBattlefieldEdgeStopExecutable: true,
    arbitraryMultiModelDenominatorSupported: true,
    leadingModelShortestRouteExecutable: true,
    remainingPlacementParetoPriorityExecutable: true,
    displacementLeadingOverlapExecutable: true,
    displacementContactBeforeNearestExecutable: true,
    continuousGeometryRequiresCompleteBoundCertificate: true,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false },
  contractGroup: "direct_movement_displacement_v1",
  frozenExecutorIds: ["authority.close-combat-lifecycle-v1",
    "authority.marine-move-geometry-v2"],
  judgeTests: 20,
  agentDecisionEvidence:
    "rules_owned_leading_reference_route_placement_and_displacement_choice",
  userVisibleChecks: ["every_shortest_equal_bypass_is_shown_to_the_controlling_player",
    "displacement_contact_priority_and_edge_stop_are_explained_in_the_receipt"],
  blocks: ["four_hundred_two_actionable_atoms_remain_non_executable",
    "general_continuous_geometry_waits_for_slices_82_and_87",
    "production_room_ui_agent_skill_selfplay_muzero_pending"],
});
export function createOfficialDirectMovementDisplacementRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialDirectMovementDisplacementRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
