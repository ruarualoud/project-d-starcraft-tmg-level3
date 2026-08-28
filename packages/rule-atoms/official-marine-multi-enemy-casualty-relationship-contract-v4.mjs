import {
  OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_CLOSE_COMBAT_EXECUTOR_ATOM_IDS,
  OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID,
  OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_CLOSE_COMBAT_EXECUTOR_VERSION,
} from "./official-marine-multi-enemy-casualty-close-combat-executor-v4.mjs";
import {
  createOfficialMarineMultiModelCasualtyRelationshipExtensionV3,
} from "./official-marine-multi-model-casualty-relationship-contract-v3.mjs";

export const OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-48-marine-multi-enemy-casualty-resolution";

const SLICE_47_CATALOGUE_HASH =
  "cebc6dfffb91c73557ae23c33eea3d0bf54a79017d583a2d98348c99e95b2fac";
const SLICE_47_RUNTIME_HASH =
  "e115118c04d60794ccc0372972e98b7c6c4e1fe0d9012676c0a1408ae2e02cb7";
const HASH_PATTERN = /^[a-f0-9]{64}$/u;

function fail(code) {
  throw new Error(code);
}

function node(nodeId, kind, label) {
  return {
    nodeId,
    kind,
    label,
    provenance: OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_RELATIONSHIP_SCOPE_ID,
  };
}

function edge(from, relationship, to, provenance) {
  return {
    from,
    relationship,
    to,
    scopeId: OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_RELATIONSHIP_SCOPE_ID,
    provenance,
  };
}

export function createOfficialMarineMultiEnemyCasualtyRelationshipExtensionV4(
  input = {},
) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (!HASH_PATTERN.test(catalogueHash) || !HASH_PATTERN.test(runtimeHash)) {
    fail("MARINE_MULTI_ENEMY_CASUALTY_RELATIONSHIP_RELEASE_HASH_REQUIRED");
  }
  const previous = createOfficialMarineMultiModelCasualtyRelationshipExtensionV3({
    catalogueHash: SLICE_47_CATALOGUE_HASH,
    runtimeHash: SLICE_47_RUNTIME_HASH,
  });
  const id = {
    part12Casualty:
      "official_document:rules-v48.part12.casualty-engagement-preservation",
    modelPositions: "state_field:pieces[].models[].position",
    currentModels: "state_field:pieces[].currentModels",
    currentSupply: "state_field:pieces[].currentSupply",
    destroyedModelIds: "state_field:pieces[].destroyedModelIds",
    damageMarker: "state_field:pieces[].damageMarker",
    combatActivation: "state_field:pieces[].activatedPhases.combat",
    activeSide: "state_field:activeSideKey",
    engagementGraph: "derived_value:officialEngagementGraphV2",
    casualtyDomain:
      "parameter_domain:marine.multiModelCasualty.orderedLegalSelectionsV1",
    casualtyResolution: "derived_value:marine.multiModelCasualtyResolutionV1",
    coEngagerLedger: "derived_value:marine.multiEnemy.coEngagerModelLedgerV1",
    engagedEnemyUnitSet:
      "derived_value:marine.multiEnemy.targetEngagedEnemyUnitIdsV1",
    threeUnitPlan: "parameter_domain:marine.multiEnemy.closeCombatPlanV3",
    selectedAttackPool: "derived_value:marine.multiEnemy.selectedUnitAttackPoolV1",
    multiEnemyPending: "state_field:pendingAction.marineMultiEnemyCasualtyV2",
    postThreeUnitGraph:
      "derived_value:marine.postCasualtyThreeUnitEngagementGraphV2",
    preservationTest:
      "judge_test:marine-multi-enemy-specific-engagement-preservation-runtime",
    staleTest:
      "judge_test:marine-multi-enemy-coengager-geometry-stale-domain",
    authorityTest:
      "judge_test:marine-multi-enemy-authority-v16-two-seat-replay",
    relationshipTest:
      "judge_test:marine-multi-enemy-relationship-negative-gap-gate",
    previousSliceRelease:
      "slice_release:slice-47-marine-multi-model-casualty-resolution-v3",
    currentSliceRelease:
      "slice_release:slice-48-marine-multi-enemy-casualty-resolution-v4",
    previousCatalogueRelease:
      `catalogue_release:slice-47@${SLICE_47_CATALOGUE_HASH}`,
    currentCatalogueRelease: `catalogue_release:slice-48@${catalogueHash}`,
    previousRuntimeRelease: `runtime_release:slice-47@${SLICE_47_RUNTIME_HASH}`,
    currentRuntimeRelease: `runtime_release:slice-48@${runtimeHash}`,
  };
  const executor =
    `executor:${OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID}`
      + `@${OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_CLOSE_COMBAT_EXECUTOR_VERSION}`;
  const tests = [
    id.preservationTest,
    id.staleTest,
    id.authorityTest,
    id.relationshipTest,
  ];
  const nodes = [
    node(id.coEngagerLedger, "derived_value", "Hash-bound co-engaging Marine ledger"),
    node(id.engagedEnemyUnitSet, "derived_value",
      "Exact enemy Unit identities engaging the target"),
    node(id.threeUnitPlan, "parameter_domain",
      "Selected attacker plus co-engager and target Close Combat plan"),
    node(id.selectedAttackPool, "derived_value",
      "Selected Unit Fighting and Supporting Rank attack pool"),
    node(id.multiEnemyPending, "state_field",
      "Defender-owned multi-enemy casualty pending action"),
    node(id.postThreeUnitGraph, "derived_value",
      "Post-casualty three-Unit Engagement Graph"),
    node(id.preservationTest, "judge_test",
      "Specific second enemy engagement cannot be broken while alternatives exist"),
    node(id.staleTest, "judge_test",
      "Co-engager geometry drift invalidates an open casualty domain"),
    node(id.authorityTest, "judge_test",
      "Authority v16 two-seat confirmation and signed replay"),
    node(id.relationshipTest, "judge_test",
      "Missing multi-enemy relationship blocks Slice 48 freeze"),
    node(id.currentSliceRelease, "slice_release", "Slice 48 multi-enemy casualty release"),
    node(id.currentCatalogueRelease, "catalogue_release",
      `Slice 48 catalogue ${catalogueHash}`),
    node(id.currentRuntimeRelease, "runtime_release", `Slice 48 runtime ${runtimeHash}`),
  ];
  const relations = [
    edge(executor, "reads", id.modelPositions, "multi_enemy_v4_state_contract"),
    edge(executor, "reads", id.engagementGraph, "multi_enemy_v4_state_contract"),
    edge(executor, "reads", id.coEngagerLedger, "multi_enemy_v4_state_contract"),
    edge(executor, "reads", id.engagedEnemyUnitSet, "multi_enemy_v4_state_contract"),
    edge(executor, "reads", id.damageMarker, "multi_enemy_v4_state_contract"),
    edge(executor, "writes", id.multiEnemyPending, "multi_enemy_v4_state_contract"),
    edge(executor, "writes", id.activeSide, "multi_enemy_v4_state_contract"),
    edge(executor, "writes", id.currentModels, "multi_enemy_v4_state_contract"),
    edge(executor, "writes", id.currentSupply, "multi_enemy_v4_state_contract"),
    edge(executor, "writes", id.destroyedModelIds, "multi_enemy_v4_state_contract"),
    edge(executor, "writes", id.damageMarker, "multi_enemy_v4_state_contract"),
    edge(executor, "writes", id.combatActivation, "multi_enemy_v4_state_contract"),
    edge(id.modelPositions, "derives", id.engagementGraph,
      "three_unit_engagement_graph_derivation"),
    edge(id.engagementGraph, "derives", id.engagedEnemyUnitSet,
      "exact_target_enemy_unit_set"),
    edge(id.engagedEnemyUnitSet, "parameterized_by", id.threeUnitPlan,
      "two_specific_enemy_units_bound"),
    edge(id.coEngagerLedger, "parameterized_by", id.threeUnitPlan,
      "coengager_ledger_bound"),
    edge(id.threeUnitPlan, "derives", id.selectedAttackPool,
      "selected_unit_rank_isolation"),
    edge(id.part12Casualty, "constrains", id.casualtyDomain,
      "official_specific_enemy_engagement_preservation_v4"),
    edge(id.engagedEnemyUnitSet, "constrains", id.casualtyDomain,
      "multi_enemy_casualty_preservation_set"),
    edge(id.selectedAttackPool, "parameterized_by", id.casualtyDomain,
      "attack_damage_to_casualty_domain"),
    edge(id.casualtyDomain, "writes", id.multiEnemyPending,
      "defender_multi_enemy_choice_open"),
    edge(id.casualtyResolution, "derives", id.postThreeUnitGraph,
      "post_casualty_three_unit_graph_rederive"),
    edge(id.modelPositions, "invalidates", id.threeUnitPlan,
      "three_unit_geometry_stale_plan"),
    edge(id.coEngagerLedger, "invalidates", id.threeUnitPlan,
      "coengager_ledger_stale_plan"),
    edge(id.engagementGraph, "invalidates", id.casualtyDomain,
      "multi_enemy_geometry_stale_domain"),
    edge(id.casualtyDomain, "verified_by", id.preservationTest, "slice48_judge_test"),
    edge(id.coEngagerLedger, "verified_by", id.staleTest, "slice48_judge_test"),
    edge(id.threeUnitPlan, "verified_by", id.staleTest, "slice48_judge_test"),
    edge(id.postThreeUnitGraph, "verified_by", id.authorityTest, "slice48_judge_test"),
    edge(id.currentSliceRelease, "verified_by", id.relationshipTest, "slice48_judge_test"),
    edge(id.previousSliceRelease, "superseded_by", id.currentSliceRelease,
      "slice48_version_ancestry"),
    edge(id.previousCatalogueRelease, "superseded_by", id.currentCatalogueRelease,
      "slice48_catalogue_ancestry"),
    edge(id.previousRuntimeRelease, "superseded_by", id.currentRuntimeRelease,
      "slice48_runtime_ancestry"),
  ];
  const requiredEdges = relations.filter((relation) => [
    "three_unit_engagement_graph_derivation",
    "exact_target_enemy_unit_set",
    "two_specific_enemy_units_bound",
    "coengager_ledger_bound",
    "selected_unit_rank_isolation",
    "official_specific_enemy_engagement_preservation_v4",
    "multi_enemy_casualty_preservation_set",
    "attack_damage_to_casualty_domain",
    "defender_multi_enemy_choice_open",
    "post_casualty_three_unit_graph_rederive",
    "three_unit_geometry_stale_plan",
    "coengager_ledger_stale_plan",
    "multi_enemy_geometry_stale_domain",
    "slice48_version_ancestry",
    "slice48_catalogue_ancestry",
    "slice48_runtime_ancestry",
  ].includes(relation.provenance));
  return {
    nodes: [...previous.nodes, ...nodes],
    edges: [...previous.edges, ...relations],
    executorLineages: [
      ...previous.executorLineages,
      {
        executorId: OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID,
        ruleAtomIds: [
          ...OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_CLOSE_COMBAT_EXECUTOR_ATOM_IDS,
        ],
        provenance: "runtime_action_lineage:marine_multi_enemy_casualty_close_combat_v4",
      },
    ],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds,
      OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID,
    ],
    coverageScopes: [
      ...previous.coverageScopes,
      {
        scopeId: `${OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_RELATIONSHIP_SCOPE_ID}:combat-v4`,
        executorId: OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID,
        requiredNodeIds: [
          id.part12Casualty,
          id.engagementGraph,
          id.coEngagerLedger,
          id.engagedEnemyUnitSet,
          id.threeUnitPlan,
          id.selectedAttackPool,
          id.casualtyDomain,
          id.multiEnemyPending,
          id.casualtyResolution,
          id.postThreeUnitGraph,
          ...tests,
        ],
        requiredEdges,
        requiredPaths: [
          {
            from: id.part12Casualty,
            to: id.preservationTest,
            relationships: ["constrains", "verified_by"],
            maxDepth: 3,
          },
          {
            from: id.modelPositions,
            to: id.staleTest,
            relationships: ["derives", "invalidates", "verified_by"],
            maxDepth: 5,
          },
          {
            from: id.engagedEnemyUnitSet,
            to: id.multiEnemyPending,
            relationships: ["constrains", "parameterized_by", "writes"],
            maxDepth: 4,
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
