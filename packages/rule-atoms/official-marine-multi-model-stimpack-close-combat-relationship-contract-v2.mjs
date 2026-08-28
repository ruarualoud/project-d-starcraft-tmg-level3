import {
  createOfficialMarineMultiModelCloseCombatRelationshipExtensionV1,
} from "./official-marine-multi-model-close-combat-relationship-contract-v1.mjs";
import {
  OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_ATOM_IDS,
  OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_ID,
  OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_VERSION,
} from "./official-marine-multi-model-stimpack-active-executor-v3.mjs";
import {
  OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ATOM_IDS,
  OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID,
  OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_VERSION,
} from "./official-marine-multi-model-stimpack-close-combat-executor-v2.mjs";

export const OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-46-marine-multi-model-stimpack-close-combat";

const SLICE_45_CATALOGUE_HASH =
  "732fad40374c25f9acd60e35cbf17ba1e91a39efc49f226b440f992b5635a649";
const SLICE_45_RUNTIME_HASH =
  "7cdcaa4c9b7fc12c2825d154790cfe333ed99ca4da1df0e9abc8963b5c4f9acc";
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
      OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_RELATIONSHIP_SCOPE_ID,
  };
}

function edge(from, relationship, to, provenance) {
  return {
    from,
    relationship,
    to,
    scopeId:
      OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_RELATIONSHIP_SCOPE_ID,
    provenance,
  };
}

export function createOfficialMarineMultiModelStimpackCloseCombatRelationshipExtensionV2(
  input = {},
) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (!HASH_PATTERN.test(catalogueHash) || !HASH_PATTERN.test(runtimeHash)) {
    fail("MARINE_MULTI_MODEL_STIMPACK_RELATIONSHIP_RELEASE_HASH_REQUIRED");
  }
  const previous = createOfficialMarineMultiModelCloseCombatRelationshipExtensionV1({
    catalogueHash: SLICE_45_CATALOGUE_HASH,
    runtimeHash: SLICE_45_RUNTIME_HASH,
  });
  const id = {
    stimpackSource: "official_characteristic:Marine.Stimpack.closeCombatPrecision3",
    part8: "official_document:rules-v48.part8.close-combat-ranks",
    part9: "official_document:rules-v48.part9.unit-wide-replacement",
    currentModels: "state_field:pieces[].currentModels",
    maxModels: "state_field:pieces[].maxModels",
    destroyedModelIds: "state_field:pieces[].destroyedModelIds",
    modelPositions: "state_field:pieces[].models[].position",
    selectedUpgrades: "state_field:pieces[].selectedUpgradeNames",
    paymentCardReadiness: "state_field:cardResources[].readiness",
    paymentCardResource: "state_field:cardResources[].resource",
    damageMarker: "state_field:pieces[].damageMarker",
    statuses: "state_field:pieces[].statuses",
    effectMarkers: "state_field:board.effectMarkers",
    abilityHistory: "state_field:activeAbilityUseHistory",
    movementActivation: "state_field:pieces[].activatedPhases.movement",
    combatActivation: "state_field:pieces[].activatedPhases.combat",
    modelLedger: "derived_value:marine.modelLedger",
    engagementGraph: "derived_value:officialEngagementGraphV2",
    fightingRank: "derived_value:marine.closeCombatFightingRank",
    supportingRank: "derived_value:marine.closeCombatSupportingRank",
    unitWideLoadout: "derived_value:marine.unitWideCloseCombatLoadout",
    mixedCarrier: "forbidden_state:marine.mixedStrikeBayonetCarriers",
    attackPool: "derived_value:marine.multiModelCloseCombatAttackPool",
    activePlan: "derived_value:marine.multiModelStimpackActivePlanV3",
    precisionGrant: "derived_value:marine.multiModelCloseCombatPrecisionGrantV2",
    failedHits: "derived_value:marine.multiModelCloseCombatFailedHitIndicesV2",
    choiceDomain:
      "parameter_domain:marine.multiModelCloseCombatPrecision.failedDiceSubsetsV2",
    pending:
      "state_field:pendingAction.marineMultiModelCloseCombatPrecisionV2",
    resolution: "derived_value:marine.multiModelCloseCombatResolutionV2",
    casualty: "state_event:casualty_model_destroyed",
    activationTest: "judge_test:marine-multi-model-stimpack-active-ledger-loadout",
    ordinaryTest: "judge_test:marine-multi-model-ordinary-strike-bayonet-pools",
    precisionTest: "judge_test:marine-multi-model-precision-subset-domain",
    casualtyTest: "judge_test:marine-multi-model-casualty-stale-action",
    geometryTest: "judge_test:marine-multi-model-geometry-stale-pending",
    mixedCarrierTest: "judge_test:marine-multi-model-mixed-carrier-fails-closed",
    replayTest: "judge_test:marine-multi-model-authority-v14-two-seat-replay",
    relationshipGapTest:
      "judge_test:marine-multi-model-rule-relationship-gap-gate",
    previousSliceRelease: "slice_release:slice-45-marine-multi-model-denominator-v1",
    currentSliceRelease:
      "slice_release:slice-46-marine-multi-model-stimpack-close-combat-v2",
    previousCatalogueRelease:
      `catalogue_release:slice-45@${SLICE_45_CATALOGUE_HASH}`,
    currentCatalogueRelease: `catalogue_release:slice-46@${catalogueHash}`,
    previousRuntimeRelease: `runtime_release:slice-45@${SLICE_45_RUNTIME_HASH}`,
    currentRuntimeRelease: `runtime_release:slice-46@${runtimeHash}`,
  };
  const activeExecutor =
    `executor:${OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_ID}`
      + `@${OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_VERSION}`;
  const combatExecutor =
    `executor:${OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID}`
      + `@${OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_VERSION}`;
  const tests = [
    id.activationTest,
    id.ordinaryTest,
    id.precisionTest,
    id.casualtyTest,
    id.geometryTest,
    id.mixedCarrierTest,
    id.replayTest,
    id.relationshipGapTest,
  ];
  const nodes = [
    node(id.activePlan, "derived_value", "Hash-bound multi-model Stimpack activation plan"),
    node(id.precisionGrant, "derived_value", "Ledger/rank/status-bound Precision 3 grant"),
    node(id.failedHits, "derived_value", "Committed failed hit-die indices"),
    node(id.choiceDomain, "parameter_domain", "All failed-hit subsets up to Precision 3"),
    node(id.pending, "state_field", "Pending multi-model Close Combat Precision choice"),
    node(id.resolution, "derived_value", "Multi-model Close Combat resolution"),
    node(id.activationTest, "judge_test", "Activation binds complete ledger and unit-wide loadout"),
    node(id.ordinaryTest, "judge_test", "Ordinary Strike/Bayonet derive exact rank pools"),
    node(id.precisionTest, "judge_test", "Precision exposes exact finite subset domain"),
    node(id.casualtyTest, "judge_test", "Casualty invalidates old action and rederives Supply"),
    node(id.geometryTest, "judge_test", "Geometry drift invalidates pending rank choice"),
    node(id.mixedCarrierTest, "judge_test", "Per-model mixed Strike/Bayonet fails closed"),
    node(id.replayTest, "judge_test", "Authority v14 replays both action stages and seats"),
    node(id.relationshipGapTest, "judge_test", "Missing source/consumer/state/test paths block freeze"),
    node(id.currentSliceRelease, "slice_release", "Slice 46 multi-model runtime release"),
    node(id.currentCatalogueRelease, "catalogue_release", `Slice 46 catalogue ${catalogueHash}`),
    node(id.currentRuntimeRelease, "runtime_release", `Slice 46 runtime ${runtimeHash}`),
  ];
  const relations = [
    edge(activeExecutor, "reads", id.maxModels, "active_v3_state_contract"),
    edge(activeExecutor, "reads", id.currentModels, "active_v3_state_contract"),
    edge(activeExecutor, "reads", id.destroyedModelIds, "active_v3_state_contract"),
    edge(activeExecutor, "reads", id.modelPositions, "active_v3_state_contract"),
    edge(activeExecutor, "reads", id.selectedUpgrades, "active_v3_state_contract"),
    edge(activeExecutor, "reads", id.paymentCardReadiness, "active_v3_state_contract"),
    edge(activeExecutor, "reads", id.paymentCardResource, "active_v3_state_contract"),
    edge(activeExecutor, "writes", id.damageMarker, "active_v3_state_contract"),
    edge(activeExecutor, "writes", id.statuses, "active_v3_state_contract"),
    edge(activeExecutor, "writes", id.effectMarkers, "active_v3_state_contract"),
    edge(activeExecutor, "writes", id.abilityHistory, "active_v3_state_contract"),
    edge(activeExecutor, "writes", id.movementActivation, "active_v3_state_contract"),
    edge(id.stimpackSource, "defines", id.activePlan, "official_stimpack_source"),
    edge(id.modelLedger, "constrains", id.activePlan, "full_model_ledger_binding"),
    edge(id.unitWideLoadout, "constrains", id.activePlan, "unit_wide_loadout_binding"),
    edge(id.activePlan, "writes", id.statuses, "stimpack_activation_apply"),
    edge(id.activePlan, "writes", id.effectMarkers, "stimpack_activation_apply"),
    edge(id.activePlan, "writes", id.abilityHistory, "stimpack_activation_apply"),
    edge(combatExecutor, "reads", id.modelLedger, "combat_v2_state_contract"),
    edge(combatExecutor, "reads", id.engagementGraph, "combat_v2_state_contract"),
    edge(combatExecutor, "reads", id.selectedUpgrades, "combat_v2_state_contract"),
    edge(combatExecutor, "reads", id.statuses, "combat_v2_state_contract"),
    edge(combatExecutor, "reads", id.effectMarkers, "combat_v2_state_contract"),
    edge(combatExecutor, "reads", id.abilityHistory, "combat_v2_state_contract"),
    edge(combatExecutor, "reads", id.damageMarker, "combat_v2_state_contract"),
    edge(combatExecutor, "reads", id.combatActivation, "combat_v2_state_contract"),
    edge(combatExecutor, "writes", id.pending, "combat_v2_state_contract"),
    edge(combatExecutor, "writes", id.damageMarker, "combat_v2_state_contract"),
    edge(combatExecutor, "writes", id.currentModels, "combat_v2_state_contract"),
    edge(combatExecutor, "writes", id.destroyedModelIds, "combat_v2_state_contract"),
    edge(combatExecutor, "writes", id.combatActivation, "combat_v2_state_contract"),
    edge(id.part8, "defines", id.fightingRank, "official_rank_source"),
    edge(id.part8, "defines", id.supportingRank, "official_rank_source"),
    edge(id.part9, "defines", id.unitWideLoadout, "official_replacement_source"),
    edge(id.fightingRank, "derives", id.attackPool, "multi_model_pool_formula"),
    edge(id.supportingRank, "derives", id.attackPool, "multi_model_pool_formula"),
    edge(id.unitWideLoadout, "constrains", id.attackPool, "weapon_roa_binding"),
    edge(id.statuses, "derives", id.precisionGrant, "typed_stimpack_status"),
    edge(id.attackPool, "constrains", id.precisionGrant, "attack_pool_binding"),
    edge(id.precisionGrant, "derives", id.failedHits, "committed_hit_reveal"),
    edge(id.failedHits, "parameterized_by", id.choiceDomain, "precision_three_subset_domain"),
    edge(id.choiceDomain, "writes", id.pending, "pending_choice_open"),
    edge(id.choiceDomain, "derives", id.resolution, "precision_choice_resolution"),
    edge(id.attackPool, "derives", id.resolution, "ordinary_or_precision_resolution"),
    edge(id.resolution, "writes", id.damageMarker, "damage_resolution"),
    edge(id.resolution, "writes", id.currentModels, "casualty_resolution"),
    edge(id.resolution, "writes", id.destroyedModelIds, "casualty_resolution"),
    edge(id.resolution, "writes", id.combatActivation, "combat_activation_resolution"),
    edge(id.casualty, "invalidates", id.modelLedger, "casualty_stale_domain"),
    edge(id.modelLedger, "invalidates", id.choiceDomain, "ledger_stale_domain"),
    edge(id.modelPositions, "invalidates", id.engagementGraph, "geometry_stale_domain"),
    edge(id.engagementGraph, "invalidates", id.choiceDomain, "rank_stale_domain"),
    edge(id.mixedCarrier, "invalidates", id.unitWideLoadout, "mixed_carrier_forbidden"),
    edge(id.activePlan, "verified_by", id.activationTest, "slice46_judge_test"),
    edge(id.attackPool, "verified_by", id.ordinaryTest, "slice46_judge_test"),
    edge(id.choiceDomain, "verified_by", id.precisionTest, "slice46_judge_test"),
    edge(id.casualty, "verified_by", id.casualtyTest, "slice46_judge_test"),
    edge(id.modelPositions, "verified_by", id.geometryTest, "slice46_judge_test"),
    edge(id.mixedCarrier, "verified_by", id.mixedCarrierTest, "slice46_judge_test"),
    edge(id.resolution, "verified_by", id.replayTest, "slice46_judge_test"),
    edge(id.currentSliceRelease, "verified_by", id.relationshipGapTest, "slice46_judge_test"),
    edge(id.previousSliceRelease, "superseded_by", id.currentSliceRelease,
      "slice_version_ancestry"),
    edge(id.previousCatalogueRelease, "superseded_by", id.currentCatalogueRelease,
      "catalogue_version_ancestry"),
    edge(id.previousRuntimeRelease, "superseded_by", id.currentRuntimeRelease,
      "runtime_version_ancestry"),
  ];
  const requiredEdges = relations.filter((relation) => [
    "official_stimpack_source",
    "full_model_ledger_binding",
    "unit_wide_loadout_binding",
    "official_rank_source",
    "official_replacement_source",
    "multi_model_pool_formula",
    "weapon_roa_binding",
    "precision_three_subset_domain",
    "ledger_stale_domain",
    "rank_stale_domain",
    "mixed_carrier_forbidden",
    "slice_version_ancestry",
    "catalogue_version_ancestry",
    "runtime_version_ancestry",
  ].includes(relation.provenance));
  return {
    nodes: [...previous.nodes, ...nodes],
    edges: [...previous.edges, ...relations],
    executorLineages: [
      ...previous.executorLineages,
      {
        executorId: OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_ID,
        ruleAtomIds: [
          ...OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_ATOM_IDS,
        ],
        provenance: "runtime_action_lineage:marine_multi_model_stimpack_active_v3",
      },
      {
        executorId:
          OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID,
        ruleAtomIds: [
          ...OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ATOM_IDS,
        ],
        provenance:
          "runtime_action_lineage:marine_multi_model_stimpack_close_combat_v2",
      },
    ],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds,
      OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_ID,
      OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID,
    ],
    coverageScopes: [
      ...previous.coverageScopes,
      {
        scopeId:
          `${OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_RELATIONSHIP_SCOPE_ID}:active-v3`,
        executorId: OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_ID,
        requiredNodeIds: [
          id.stimpackSource,
          id.modelLedger,
          id.unitWideLoadout,
          id.activePlan,
          id.activationTest,
        ],
        requiredEdges,
        requiredPaths: [{
          from: id.stimpackSource,
          to: id.activationTest,
          relationships: ["defines", "verified_by"],
          maxDepth: 2,
        }],
        forbiddenPaths: [],
        evidenceTestNodeIds: [id.activationTest],
      },
      {
        scopeId:
          `${OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_RELATIONSHIP_SCOPE_ID}:combat-v2`,
        executorId:
          OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID,
        requiredNodeIds: [
          id.part8,
          id.part9,
          id.modelLedger,
          id.unitWideLoadout,
          id.attackPool,
          id.choiceDomain,
          id.resolution,
          ...tests,
        ],
        requiredEdges,
        requiredPaths: [
          {
            from: id.part9,
            to: id.resolution,
            relationships: ["defines", "constrains", "derives"],
            maxDepth: 4,
          },
          {
            from: id.part8,
            to: id.precisionTest,
            relationships: ["defines", "derives", "constrains", "parameterized_by", "verified_by"],
            maxDepth: 6,
          },
          {
            from: id.casualty,
            to: id.casualtyTest,
            relationships: ["invalidates", "verified_by"],
            maxDepth: 3,
          },
          {
            from: id.modelPositions,
            to: id.geometryTest,
            relationships: ["invalidates", "verified_by"],
            maxDepth: 3,
          },
        ],
        forbiddenPaths: [{
          from: id.mixedCarrier,
          to: id.resolution,
          relationships: ["derives", "constrains", "parameterized_by"],
          maxDepth: 6,
        }],
        evidenceTestNodeIds: tests,
      },
    ],
  };
}
