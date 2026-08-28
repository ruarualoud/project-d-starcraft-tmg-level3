import {
  OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID,
  OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_CLOSE_COMBAT_EXECUTOR_VERSION,
  OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_EXECUTOR_ATOM_IDS,
} from "./official-marine-multi-enemy-stimpack-casualty-close-combat-executor-v5.mjs";
import {
  createOfficialMarineMultiEnemyCasualtyRelationshipExtensionV4,
} from "./official-marine-multi-enemy-casualty-relationship-contract-v4.mjs";

export const OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-49-marine-multi-enemy-stimpack-casualty";

const SLICE_48_CATALOGUE_HASH =
  "98312255b197471e93b8b9b0a141b694743bcbef880830b7bdb4bf60736a0cf3";
const SLICE_48_RUNTIME_HASH =
  "dfa25995e03e98ddd5b1fab855dcc9744312b2599ca3452e4364ab2db34d79d6";
const HASH_PATTERN = /^[a-f0-9]{64}$/u;

function fail(code) {
  throw new Error(code);
}

function node(nodeId, kind, label) {
  return {
    nodeId,
    kind,
    label,
    provenance:
      OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_RELATIONSHIP_SCOPE_ID,
  };
}

function edge(from, relationship, to, provenance) {
  return {
    from,
    relationship,
    to,
    scopeId:
      OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_RELATIONSHIP_SCOPE_ID,
    provenance,
  };
}

export function createOfficialMarineMultiEnemyStimpackCasualtyRelationshipExtensionV5(
  input = {},
) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (!HASH_PATTERN.test(catalogueHash) || !HASH_PATTERN.test(runtimeHash)) {
    fail("MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_RELATIONSHIP_RELEASE_HASH_REQUIRED");
  }
  const previous = createOfficialMarineMultiEnemyCasualtyRelationshipExtensionV4({
    catalogueHash: SLICE_48_CATALOGUE_HASH,
    runtimeHash: SLICE_48_RUNTIME_HASH,
  });
  const id = {
    stimpackSource:
      "official_characteristic:Marine.Stimpack.closeCombatPrecision3",
    part8Ranks: "official_document:rules-v48.part8.close-combat-ranks",
    part12Casualty:
      "official_document:rules-v48.part12.casualty-engagement-preservation",
    selectedUpgrades: "state_field:pieces[].selectedUpgradeNames",
    modelPositions: "state_field:pieces[].models[].position",
    currentModels: "state_field:pieces[].currentModels",
    currentSupply: "state_field:pieces[].currentSupply",
    destroyedModelIds: "state_field:pieces[].destroyedModelIds",
    damageMarker: "state_field:pieces[].damageMarker",
    statuses: "state_field:pieces[].statuses",
    effectMarkers: "state_field:board.effectMarkers",
    abilityHistory: "state_field:activeAbilityUseHistory",
    combatActivation: "state_field:pieces[].activatedPhases.combat",
    activeSide: "state_field:activeSideKey",
    engagementGraph: "derived_value:officialEngagementGraphV2",
    selectedLedger: "derived_value:marine.modelLedger",
    coEngagerLedger: "derived_value:marine.multiEnemy.coEngagerModelLedgerV1",
    engagedEnemyUnitSet:
      "derived_value:marine.multiEnemy.targetEngagedEnemyUnitIdsV1",
    priorThreeUnitPlan: "parameter_domain:marine.multiEnemy.closeCombatPlanV3",
    fullPlan:
      "parameter_domain:marine.multiEnemyStimpack.closeCombatPlanV4",
    selectedPairPlan:
      "derived_value:marine.multiEnemyStimpack.selectedPairPlanV2",
    coEngagerPairPlan:
      "derived_value:marine.multiEnemyStimpack.coEngagerPairPlanV2",
    selectedAttackPool:
      "derived_value:marine.multiEnemyStimpack.selectedUnitAttackPoolV4",
    precisionGrant:
      "derived_value:marine.multiEnemyStimpackPrecisionGrantV3",
    hitReveal:
      "derived_value:marine.multiEnemyStimpackFailedHitIndicesV3",
    precisionDomain:
      "parameter_domain:marine.multiEnemyStimpackPrecision.failedDiceSubsetsV3",
    precisionSelection:
      "derived_value:marine.multiEnemyStimpackPrecisionSelectionV3",
    precisionResolution:
      "derived_value:marine.multiEnemyStimpackPrecisionResolutionV3",
    precisionPending:
      "state_field:pendingAction.marineMultiEnemyStimpackPrecisionV3",
    casualtyDomain:
      "parameter_domain:marine.multiModelCasualty.orderedLegalSelectionsV1",
    casualtyPending:
      "state_field:pendingAction.marineMultiEnemyStimpackCasualtyV3",
    casualtyResolution:
      "derived_value:marine.multiModelCasualtyResolutionV1",
    postThreeUnitGraph:
      "derived_value:marine.postCasualtyThreeUnitEngagementGraphV2",
    denominatorTest:
      "judge_test:marine-multi-enemy-stimpack-selected-coengager-isolation",
    threeStageTest:
      "judge_test:marine-multi-enemy-stimpack-precision-casualty-three-stage",
    conversionTest:
      "judge_test:marine-multi-enemy-stimpack-zero-and-three-conversions",
    staleTest:
      "judge_test:marine-multi-enemy-stimpack-status-marker-history-geometry-stale",
    authorityTest:
      "judge_test:marine-multi-enemy-stimpack-authority-v17-three-receipt-replay",
    relationshipTest:
      "judge_test:marine-multi-enemy-stimpack-relationship-negative-gap-gate",
    previousSliceRelease:
      "slice_release:slice-48-marine-multi-enemy-casualty-resolution-v4",
    currentSliceRelease:
      "slice_release:slice-49-marine-multi-enemy-stimpack-casualty-v5",
    previousCatalogueRelease:
      `catalogue_release:slice-48@${SLICE_48_CATALOGUE_HASH}`,
    currentCatalogueRelease: `catalogue_release:slice-49@${catalogueHash}`,
    previousRuntimeRelease: `runtime_release:slice-48@${SLICE_48_RUNTIME_HASH}`,
    currentRuntimeRelease: `runtime_release:slice-49@${runtimeHash}`,
  };
  const executor =
    `executor:${OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID}`
      + `@${OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_CLOSE_COMBAT_EXECUTOR_VERSION}`;
  const tests = [
    id.denominatorTest,
    id.threeStageTest,
    id.conversionTest,
    id.staleTest,
    id.authorityTest,
    id.relationshipTest,
  ];
  const nodes = [
    node(id.fullPlan, "parameter_domain",
      "Three-Unit Stimpack Close Combat plan with isolated selected and co-engager pairs"),
    node(id.selectedPairPlan, "derived_value",
      "Frozen selected-attacker pair projection carrying Stimpack"),
    node(id.coEngagerPairPlan, "derived_value",
      "Frozen clean co-engager pair projection without Stimpack leakage"),
    node(id.selectedAttackPool, "derived_value",
      "Only the selected Unit's Fighting and Supporting Rank attack pool"),
    node(id.precisionGrant, "derived_value",
      "Status, marker, history, loadout and selected-pair-bound Precision 3 grant"),
    node(id.hitReveal, "derived_value", "Committed failed hit-die indices"),
    node(id.precisionDomain, "parameter_domain",
      "Empty choice and every failed-hit subset up to Precision 3"),
    node(id.precisionSelection, "derived_value", "Hash-bound attacking-player Precision choice"),
    node(id.precisionResolution, "derived_value", "Post-Precision attack resolution"),
    node(id.precisionPending, "state_field", "Attacker-owned multi-enemy Precision pending action"),
    node(id.casualtyPending, "state_field", "Defender-owned multi-enemy casualty pending action"),
    node(id.denominatorTest, "judge_test",
      "Selected Stimpack state does not contaminate the clean co-engager pair"),
    node(id.threeStageTest, "judge_test",
      "Fight, attacking Precision and defending casualty choices settle in order"),
    node(id.conversionTest, "judge_test",
      "Zero and maximum three Precision conversions preserve the finite domain"),
    node(id.staleTest, "judge_test",
      "Geometry, status, marker or ability-history drift invalidates pending choices"),
    node(id.authorityTest, "judge_test",
      "Authority v17 replays three signed receipts for both seat orientations"),
    node(id.relationshipTest, "judge_test",
      "Missing Stimpack-to-casualty relationship blocks Slice 49 freeze"),
    node(id.currentSliceRelease, "slice_release",
      "Slice 49 multi-enemy Stimpack Precision and casualty release"),
    node(id.currentCatalogueRelease, "catalogue_release",
      `Slice 49 catalogue ${catalogueHash}`),
    node(id.currentRuntimeRelease, "runtime_release", `Slice 49 runtime ${runtimeHash}`),
  ];
  const relations = [
    edge(executor, "reads", id.selectedUpgrades, "multi_enemy_stimpack_v5_state_contract"),
    edge(executor, "reads", id.modelPositions, "multi_enemy_stimpack_v5_state_contract"),
    edge(executor, "reads", id.selectedLedger, "multi_enemy_stimpack_v5_state_contract"),
    edge(executor, "reads", id.coEngagerLedger, "multi_enemy_stimpack_v5_state_contract"),
    edge(executor, "reads", id.engagementGraph, "multi_enemy_stimpack_v5_state_contract"),
    edge(executor, "reads", id.engagedEnemyUnitSet, "multi_enemy_stimpack_v5_state_contract"),
    edge(executor, "reads", id.statuses, "multi_enemy_stimpack_v5_state_contract"),
    edge(executor, "reads", id.effectMarkers, "multi_enemy_stimpack_v5_state_contract"),
    edge(executor, "reads", id.abilityHistory, "multi_enemy_stimpack_v5_state_contract"),
    edge(executor, "reads", id.damageMarker, "multi_enemy_stimpack_v5_state_contract"),
    edge(executor, "writes", id.precisionPending, "multi_enemy_stimpack_v5_state_contract"),
    edge(executor, "writes", id.casualtyPending, "multi_enemy_stimpack_v5_state_contract"),
    edge(executor, "writes", id.activeSide, "multi_enemy_stimpack_v5_state_contract"),
    edge(executor, "writes", id.currentModels, "multi_enemy_stimpack_v5_state_contract"),
    edge(executor, "writes", id.currentSupply, "multi_enemy_stimpack_v5_state_contract"),
    edge(executor, "writes", id.destroyedModelIds, "multi_enemy_stimpack_v5_state_contract"),
    edge(executor, "writes", id.damageMarker, "multi_enemy_stimpack_v5_state_contract"),
    edge(executor, "writes", id.combatActivation, "multi_enemy_stimpack_v5_state_contract"),
    edge(id.stimpackSource, "defines", id.fullPlan, "official_stimpack_precision_source_v5"),
    edge(id.part8Ranks, "defines", id.selectedAttackPool, "official_selected_rank_source_v5"),
    edge(id.part12Casualty, "constrains", id.casualtyDomain,
      "official_multi_enemy_casualty_source_v5"),
    edge(id.priorThreeUnitPlan, "projects_to", id.fullPlan,
      "ordinary_to_stimpack_three_unit_plan_v5"),
    edge(id.selectedLedger, "constrains", id.fullPlan, "selected_ledger_binding_v5"),
    edge(id.coEngagerLedger, "constrains", id.fullPlan, "coengager_ledger_binding_v5"),
    edge(id.engagedEnemyUnitSet, "constrains", id.fullPlan,
      "two_enemy_identity_binding_v5"),
    edge(id.statuses, "constrains", id.fullPlan, "stimpack_status_binding_v5"),
    edge(id.effectMarkers, "constrains", id.fullPlan, "stimpack_marker_binding_v5"),
    edge(id.abilityHistory, "constrains", id.fullPlan, "stimpack_history_binding_v5"),
    edge(id.fullPlan, "derives", id.selectedPairPlan, "selected_pair_projection_v5"),
    edge(id.fullPlan, "derives", id.coEngagerPairPlan, "clean_coengager_projection_v5"),
    edge(id.selectedPairPlan, "derives", id.selectedAttackPool,
      "selected_unit_pool_isolation_v5"),
    edge(id.coEngagerPairPlan, "verified_by", id.denominatorTest,
      "clean_coengager_isolation_test_v5"),
    edge(id.fullPlan, "derives", id.precisionGrant, "precision_grant_binding_v5"),
    edge(id.precisionGrant, "derives", id.hitReveal, "committed_hit_reveal_v5"),
    edge(id.hitReveal, "parameterized_by", id.precisionDomain,
      "precision_three_subset_domain_v5"),
    edge(id.precisionDomain, "writes", id.precisionPending,
      "attacker_precision_pending_open_v5"),
    edge(id.precisionDomain, "parameterized_by", id.precisionSelection,
      "attacker_precision_selection_v5"),
    edge(id.precisionSelection, "derives", id.precisionResolution,
      "hash_bound_precision_apply_v5"),
    edge(id.precisionResolution, "derives", id.casualtyDomain,
      "precision_damage_to_casualty_domain_v5"),
    edge(id.casualtyDomain, "writes", id.casualtyPending,
      "defender_casualty_pending_open_v5"),
    edge(id.casualtyResolution, "derives", id.postThreeUnitGraph,
      "stimpack_post_casualty_graph_rederive_v5"),
    edge(id.modelPositions, "invalidates", id.fullPlan, "three_unit_geometry_stale_v5"),
    edge(id.statuses, "invalidates", id.precisionDomain, "stimpack_status_stale_v5"),
    edge(id.effectMarkers, "invalidates", id.precisionDomain, "stimpack_marker_stale_v5"),
    edge(id.abilityHistory, "invalidates", id.precisionDomain, "stimpack_history_stale_v5"),
    edge(id.engagementGraph, "invalidates", id.casualtyDomain,
      "multi_enemy_casualty_geometry_stale_v5"),
    edge(id.fullPlan, "verified_by", id.denominatorTest, "slice49_judge_test"),
    edge(id.precisionDomain, "verified_by", id.threeStageTest, "slice49_judge_test"),
    edge(id.casualtyPending, "verified_by", id.threeStageTest, "slice49_judge_test"),
    edge(id.precisionDomain, "verified_by", id.conversionTest, "slice49_judge_test"),
    edge(id.fullPlan, "verified_by", id.staleTest, "slice49_judge_test"),
    edge(id.precisionDomain, "verified_by", id.staleTest, "slice49_judge_test"),
    edge(id.postThreeUnitGraph, "verified_by", id.authorityTest, "slice49_judge_test"),
    edge(id.currentSliceRelease, "verified_by", id.relationshipTest, "slice49_judge_test"),
    edge(id.previousSliceRelease, "superseded_by", id.currentSliceRelease,
      "slice49_version_ancestry"),
    edge(id.previousCatalogueRelease, "superseded_by", id.currentCatalogueRelease,
      "slice49_catalogue_ancestry"),
    edge(id.previousRuntimeRelease, "superseded_by", id.currentRuntimeRelease,
      "slice49_runtime_ancestry"),
  ];
  const requiredProvenance = new Set([
    "official_stimpack_precision_source_v5",
    "official_selected_rank_source_v5",
    "official_multi_enemy_casualty_source_v5",
    "ordinary_to_stimpack_three_unit_plan_v5",
    "selected_ledger_binding_v5",
    "coengager_ledger_binding_v5",
    "two_enemy_identity_binding_v5",
    "stimpack_status_binding_v5",
    "stimpack_marker_binding_v5",
    "stimpack_history_binding_v5",
    "selected_pair_projection_v5",
    "clean_coengager_projection_v5",
    "selected_unit_pool_isolation_v5",
    "clean_coengager_isolation_test_v5",
    "precision_grant_binding_v5",
    "committed_hit_reveal_v5",
    "precision_three_subset_domain_v5",
    "attacker_precision_pending_open_v5",
    "attacker_precision_selection_v5",
    "hash_bound_precision_apply_v5",
    "precision_damage_to_casualty_domain_v5",
    "defender_casualty_pending_open_v5",
    "stimpack_post_casualty_graph_rederive_v5",
    "three_unit_geometry_stale_v5",
    "stimpack_status_stale_v5",
    "stimpack_marker_stale_v5",
    "stimpack_history_stale_v5",
    "multi_enemy_casualty_geometry_stale_v5",
    "slice49_version_ancestry",
    "slice49_catalogue_ancestry",
    "slice49_runtime_ancestry",
  ]);
  const requiredEdges = relations.filter((relation) => (
    requiredProvenance.has(relation.provenance)
  ));
  return {
    nodes: [...previous.nodes, ...nodes],
    edges: [...previous.edges, ...relations],
    executorLineages: [
      ...previous.executorLineages,
      {
        executorId:
          OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID,
        ruleAtomIds: [
          ...OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_EXECUTOR_ATOM_IDS,
        ],
        provenance:
          "runtime_action_lineage:marine_multi_enemy_stimpack_casualty_v5",
      },
    ],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds,
      OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID,
    ],
    coverageScopes: [
      ...previous.coverageScopes,
      {
        scopeId:
          `${OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_RELATIONSHIP_SCOPE_ID}:combat-v5`,
        executorId:
          OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID,
        requiredNodeIds: [
          id.stimpackSource,
          id.part8Ranks,
          id.part12Casualty,
          id.selectedLedger,
          id.coEngagerLedger,
          id.engagedEnemyUnitSet,
          id.fullPlan,
          id.selectedPairPlan,
          id.coEngagerPairPlan,
          id.selectedAttackPool,
          id.precisionGrant,
          id.hitReveal,
          id.precisionDomain,
          id.precisionSelection,
          id.precisionResolution,
          id.precisionPending,
          id.casualtyDomain,
          id.casualtyPending,
          id.casualtyResolution,
          id.postThreeUnitGraph,
          ...tests,
        ],
        requiredEdges,
        requiredPaths: [
          {
            from: id.stimpackSource,
            to: id.threeStageTest,
            relationships: [
              "defines", "derives", "parameterized_by", "writes", "verified_by",
            ],
            maxDepth: 7,
          },
          {
            from: id.coEngagerLedger,
            to: id.denominatorTest,
            relationships: ["constrains", "derives", "verified_by"],
            maxDepth: 4,
          },
          {
            from: id.precisionSelection,
            to: id.casualtyPending,
            relationships: ["derives", "writes"],
            maxDepth: 4,
          },
          {
            from: id.modelPositions,
            to: id.staleTest,
            relationships: ["invalidates", "verified_by"],
            maxDepth: 3,
          },
          {
            from: id.casualtyResolution,
            to: id.authorityTest,
            relationships: ["derives", "verified_by"],
            maxDepth: 2,
          },
        ],
        forbiddenPaths: [],
        evidenceTestNodeIds: tests,
      },
    ],
  };
}
