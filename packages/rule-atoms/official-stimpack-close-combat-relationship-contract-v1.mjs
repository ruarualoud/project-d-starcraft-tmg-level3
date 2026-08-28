import {
  createOfficialRuleRelationshipExtensionV1,
  OFFICIAL_RULE_RELATIONSHIP_NODE_IDS_V1,
} from "./official-rule-relationship-contract-v1.mjs";
import {
  OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_EXECUTOR_ID,
  OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_EXECUTOR_VERSION,
} from "./official-marine-stimpack-active-executor-v2.mjs";
import {
  OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ATOM_IDS,
  OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID,
  OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_VERSION,
} from "./official-stimpack-close-combat-consumer-executor-v1.mjs";

export const OFFICIAL_STIMPACK_CLOSE_COMBAT_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-44-stimpack-close-combat-precision";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;

function fail(code) {
  throw new Error(code);
}

function node(nodeId, kind, label) {
  return {
    nodeId,
    kind,
    label,
    provenance: OFFICIAL_STIMPACK_CLOSE_COMBAT_RELATIONSHIP_SCOPE_ID,
  };
}

function edge(from, relationship, to, provenance) {
  return {
    from,
    relationship,
    to,
    scopeId: OFFICIAL_STIMPACK_CLOSE_COMBAT_RELATIONSHIP_SCOPE_ID,
    provenance,
  };
}

export function createOfficialStimpackCloseCombatRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (!HASH_PATTERN.test(catalogueHash) || !HASH_PATTERN.test(runtimeHash)) {
    fail("STIMPACK_CLOSE_COMBAT_RELATIONSHIP_RELEASE_HASH_REQUIRED");
  }
  const previous = createOfficialRuleRelationshipExtensionV1();
  const previousId = OFFICIAL_RULE_RELATIONSHIP_NODE_IDS_V1;
  const id = {
    source: "official_characteristic:Marine.Stimpack.closeCombatPrecision3",
    selectedUpgrades: "state_field:pieces[].selectedUpgradeNames",
    combatActivation: "state_field:pieces[].activatedPhases.combat",
    pendingAction: "state_field:pendingAction.closeCombatPrecision",
    strike: "official_characteristic:Marine.CloseCombat.Strike",
    bayonet: "official_characteristic:Marine.CloseCombat.Bayonet",
    loadout: "derived_value:marine.closeCombatWeaponLoadout",
    grant: "derived_value:marine.stimpackCloseCombatPrecisionGrant",
    hitReveal: "derived_value:closeCombat.failedHitDieIndices",
    choiceDomain: "parameter_domain:stimpack.closeCombatPrecision.failedDiceSubsets",
    resolution: "derived_value:stimpack.closeCombatPrecisionResolution",
    ordinaryVariant: "action_variant:marine.ordinaryCloseCombat",
    stimpackVariant: "action_variant:marine.stimpackCloseCombat",
    cleanup: "state_event:stimpackCleanupRemovesStatus",
    unknownMaterial: "state_event:unknownCloseCombatWeaponStatusOrHistory",
    bayonetReachableTest: "judge_test:stimpack-bayonet-loadout-reachable",
    ordinaryNoPrecisionTest: "judge_test:ordinary-close-combat-has-no-precision",
    strikeDomainTest: "judge_test:stimpack-strike-precision-domain",
    bayonetDomainTest: "judge_test:stimpack-bayonet-precision-domain",
    cleanupInvalidationTest: "judge_test:cleanup-invalidates-close-combat-precision-domain",
    unknownFailClosedTest: "judge_test:unknown-close-combat-material-fails-closed",
    replayTest: "judge_test:stimpack-close-combat-two-seat-replay",
    oldRuntimeTest: "judge_test:slice43-runtime-remains-frozen",
    currentSliceRelease: "slice_release:slice-44-stimpack-close-combat-v1",
    currentCatalogueRelease: `catalogue_release:slice-44@${catalogueHash}`,
    currentRuntimeRelease: `runtime_release:slice-44@${runtimeHash}`,
  };
  const activeExecutor = `executor:${OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_EXECUTOR_ID}`
    + `@${OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_EXECUTOR_VERSION}`;
  const combatExecutor = `executor:${OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID}`
    + `@${OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_VERSION}`;
  const nodes = [
    node(id.source, "official_characteristic", "Stimpack grants Precision (3) to all Close Combat Weapons"),
    node(id.selectedUpgrades, "state_field", "Selected Marine upgrades"),
    node(id.combatActivation, "state_field", "Combat activation marker"),
    node(id.pendingAction, "state_field", "Pending close-combat Precision choice"),
    node(id.strike, "official_characteristic", "Marine Strike close-combat profile"),
    node(id.bayonet, "official_characteristic", "Marine Bayonet replacement profile"),
    node(id.loadout, "derived_value", "Current Marine close-combat weapon loadout"),
    node(id.grant, "derived_value", "Status-bound close-combat Precision grant"),
    node(id.hitReveal, "derived_value", "Failed Close Combat hit-die indices"),
    node(id.choiceDomain, "parameter_domain", "All failed-die subsets up to Precision 3"),
    node(id.resolution, "derived_value", "Close Combat Precision resolution"),
    node(id.ordinaryVariant, "action_variant", "Ordinary Marine Close Combat"),
    node(id.stimpackVariant, "action_variant", "Stimpacked Marine Close Combat"),
    node(id.cleanup, "state_event", "Cleanup removes Stimpack status and marker"),
    node(id.unknownMaterial, "state_event", "Unknown weapon, status, marker, or history material"),
    node(id.bayonetReachableTest, "judge_test", "Stimpack plus Bayonet is authority-reachable"),
    node(id.ordinaryNoPrecisionTest, "judge_test", "Ordinary Close Combat exposes no Precision choice"),
    node(id.strikeDomainTest, "judge_test", "Strike exact post-hit Precision domain"),
    node(id.bayonetDomainTest, "judge_test", "Bayonet exact post-hit Precision domain"),
    node(id.cleanupInvalidationTest, "judge_test", "Cleanup invalidates old Precision domain"),
    node(id.unknownFailClosedTest, "judge_test", "Unknown close-combat material fails closed"),
    node(id.replayTest, "judge_test", "Both seats and authoritative replay stay exact"),
    node(id.oldRuntimeTest, "judge_test", "Slice 43 runtime remains frozen"),
    node(id.currentSliceRelease, "slice_release", "Slice 44 Stimpack Close Combat release"),
    node(id.currentCatalogueRelease, "catalogue_release", `Slice 44 catalogue ${catalogueHash}`),
    node(id.currentRuntimeRelease, "runtime_release", `Slice 44 runtime ${runtimeHash}`),
  ];
  const relations = [
    edge(activeExecutor, "reads", id.selectedUpgrades, "stimpack_active_v2_state_contract"),
    edge(activeExecutor, "reads", previousId.paymentCardReadiness, "stimpack_active_v2_state_contract"),
    edge(activeExecutor, "reads", previousId.paymentCardResource, "stimpack_active_v2_state_contract"),
    edge(activeExecutor, "writes", previousId.damageMarker, "stimpack_active_v2_state_contract"),
    edge(activeExecutor, "writes", previousId.statuses, "stimpack_active_v2_state_contract"),
    edge(activeExecutor, "writes", previousId.effectMarkers, "stimpack_active_v2_state_contract"),
    edge(activeExecutor, "writes", previousId.abilityHistory, "stimpack_active_v2_state_contract"),
    edge(id.selectedUpgrades, "derives", id.loadout, "marine_close_combat_loadout"),
    edge(id.strike, "defines", id.loadout, "marine_close_combat_loadout"),
    edge(id.bayonet, "defines", id.loadout, "marine_close_combat_loadout"),
    edge(id.loadout, "verified_by", id.bayonetReachableTest, "slice44_judge_test"),
    edge(id.source, "derives", previousId.statuses, "official_stimpack_source"),
    edge(previousId.statuses, "derives", id.grant, "typed_stimpack_status"),
    edge(id.loadout, "constrains", id.grant, "selected_close_combat_weapon"),
    edge(combatExecutor, "reads", id.selectedUpgrades, "close_combat_precision_state_contract"),
    edge(combatExecutor, "reads", previousId.statuses, "close_combat_precision_state_contract"),
    edge(combatExecutor, "reads", previousId.effectMarkers, "close_combat_precision_state_contract"),
    edge(combatExecutor, "reads", previousId.modelPositions, "close_combat_precision_state_contract"),
    edge(combatExecutor, "reads", previousId.currentModels, "close_combat_precision_state_contract"),
    edge(combatExecutor, "reads", previousId.damageMarker, "close_combat_precision_state_contract"),
    edge(combatExecutor, "reads", id.combatActivation, "close_combat_precision_state_contract"),
    edge(combatExecutor, "exposes", id.stimpackVariant, "close_combat_precision_executor"),
    edge(id.stimpackVariant, "includes", id.choiceDomain, "post_hit_precision_choice"),
    edge(id.grant, "parameterized_by", id.choiceDomain, "precision_three_limit"),
    edge(id.hitReveal, "parameterized_by", id.choiceDomain, "failed_hit_dice_only"),
    edge(id.loadout, "constrains", id.choiceDomain, "weapon_rate_of_attack"),
    edge(id.choiceDomain, "writes", id.pendingAction, "precision_pending_open"),
    edge(id.choiceDomain, "derives", id.resolution, "precision_choice_resolution"),
    edge(id.resolution, "writes", previousId.damageMarker, "close_combat_damage_apply"),
    edge(id.resolution, "writes", previousId.currentModels, "close_combat_casualty_apply"),
    edge(id.resolution, "writes", id.combatActivation, "close_combat_activation_apply"),
    edge(id.cleanup, "writes", previousId.statuses, "stimpack_cleanup"),
    edge(id.cleanup, "writes", previousId.effectMarkers, "stimpack_cleanup"),
    edge(previousId.statuses, "invalidates", id.choiceDomain, "status_bound_choice_domain"),
    edge(previousId.effectMarkers, "invalidates", id.choiceDomain, "marker_bound_choice_domain"),
    edge(id.ordinaryVariant, "verified_by", id.ordinaryNoPrecisionTest, "slice44_judge_test"),
    edge(id.choiceDomain, "verified_by", id.strikeDomainTest, "slice44_judge_test"),
    edge(id.choiceDomain, "verified_by", id.bayonetDomainTest, "slice44_judge_test"),
    edge(id.choiceDomain, "verified_by", id.cleanupInvalidationTest, "slice44_judge_test"),
    edge(id.choiceDomain, "verified_by", id.replayTest, "slice44_judge_test"),
    edge(id.unknownMaterial, "invalidates", id.choiceDomain, "unknown_material_fail_closed"),
    edge(id.unknownMaterial, "verified_by", id.unknownFailClosedTest, "slice44_judge_test"),
    edge(previousId.currentSliceRelease, "superseded_by", id.currentSliceRelease, "slice_version_ancestry"),
    edge(previousId.currentCatalogueRelease, "superseded_by", id.currentCatalogueRelease, "catalogue_version_ancestry"),
    edge(previousId.currentRuntimeRelease, "superseded_by", id.currentRuntimeRelease, "runtime_version_ancestry"),
    edge(id.currentRuntimeRelease, "verified_by", id.oldRuntimeTest, "slice44_judge_test"),
  ];
  const requiredEdges = relations.filter((relation) => [
    "official_stimpack_source",
    "typed_stimpack_status",
    "selected_close_combat_weapon",
    "post_hit_precision_choice",
    "precision_three_limit",
    "failed_hit_dice_only",
    "weapon_rate_of_attack",
    "status_bound_choice_domain",
    "marker_bound_choice_domain",
    "slice_version_ancestry",
    "catalogue_version_ancestry",
    "runtime_version_ancestry",
  ].includes(relation.provenance));
  const tests = [
    id.bayonetReachableTest,
    id.ordinaryNoPrecisionTest,
    id.strikeDomainTest,
    id.bayonetDomainTest,
    id.cleanupInvalidationTest,
    id.unknownFailClosedTest,
    id.replayTest,
    id.oldRuntimeTest,
  ];
  return {
    nodes: [...previous.nodes, ...nodes],
    edges: [...previous.edges, ...relations],
    executorLineages: [
      ...previous.executorLineages,
      {
        executorId: OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_EXECUTOR_ID,
        ruleAtomIds: [...OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_EXECUTOR_ATOM_IDS],
        provenance: "runtime_action_lineage:marine_stimpack_active_v2",
      },
      {
        executorId: OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID,
        ruleAtomIds: [...OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ATOM_IDS],
        provenance: "runtime_action_lineage:stimpack_close_combat_consumer_v1",
      },
    ],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds,
      OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_EXECUTOR_ID,
      OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID,
    ],
    coverageScopes: [
      ...previous.coverageScopes,
      {
        scopeId: `${OFFICIAL_STIMPACK_CLOSE_COMBAT_RELATIONSHIP_SCOPE_ID}:active-v2`,
        executorId: OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_EXECUTOR_ID,
        requiredNodeIds: [
          id.source,
          id.selectedUpgrades,
          id.loadout,
          id.bayonet,
          id.bayonetReachableTest,
          id.currentSliceRelease,
          id.currentCatalogueRelease,
          id.currentRuntimeRelease,
        ],
        requiredEdges,
        requiredPaths: [{
          from: id.selectedUpgrades,
          to: id.bayonetReachableTest,
          relationships: ["derives", "verified_by"],
          maxDepth: 3,
        }],
        forbiddenPaths: [],
        evidenceTestNodeIds: [id.bayonetReachableTest],
      },
      {
        scopeId: `${OFFICIAL_STIMPACK_CLOSE_COMBAT_RELATIONSHIP_SCOPE_ID}:consumer`,
        executorId: OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID,
        requiredNodeIds: [
          id.source,
          id.strike,
          id.bayonet,
          id.grant,
          id.hitReveal,
          id.choiceDomain,
          id.resolution,
          id.cleanup,
          id.unknownMaterial,
          ...tests,
        ],
        requiredEdges,
        requiredPaths: [
          {
            from: id.source,
            to: id.resolution,
            relationships: ["derives", "parameterized_by"],
            maxDepth: 5,
          },
          {
            from: id.cleanup,
            to: id.cleanupInvalidationTest,
            relationships: ["writes", "invalidates", "verified_by"],
            maxDepth: 4,
          },
          {
            from: id.loadout,
            to: id.bayonetDomainTest,
            relationships: ["constrains", "verified_by"],
            maxDepth: 3,
          },
          {
            from: id.unknownMaterial,
            to: id.unknownFailClosedTest,
            relationships: ["verified_by"],
            maxDepth: 1,
          },
        ],
        forbiddenPaths: [{
          from: id.ordinaryVariant,
          to: id.choiceDomain,
          relationships: ["includes", "parameterized_by", "derives"],
          maxDepth: 4,
        }],
        evidenceTestNodeIds: tests,
      },
    ],
  };
}
