import {
  createOfficialStimpackCloseCombatRelationshipExtensionV1,
} from "./official-stimpack-close-combat-relationship-contract-v1.mjs";
import {
  OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_DENOMINATOR_ID,
} from "./official-marine-multi-model-close-combat-denominator-v1.mjs";

export const OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-45-marine-multi-model-close-combat-denominator";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;

function fail(code) {
  throw new Error(code);
}

function node(nodeId, kind, label) {
  return {
    nodeId,
    kind,
    label,
    provenance: OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_RELATIONSHIP_SCOPE_ID,
  };
}

function edge(from, relationship, to, provenance) {
  return {
    from,
    relationship,
    to,
    scopeId: OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_RELATIONSHIP_SCOPE_ID,
    provenance,
  };
}

export function createOfficialMarineMultiModelCloseCombatRelationshipExtensionV1(
  input = {},
) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (!HASH_PATTERN.test(catalogueHash) || !HASH_PATTERN.test(runtimeHash)) {
    fail("MARINE_MULTI_MODEL_RELATIONSHIP_RELEASE_HASH_REQUIRED");
  }
  const previous = createOfficialStimpackCloseCombatRelationshipExtensionV1({
    catalogueHash,
    runtimeHash,
  });
  const id = {
    part8: "official_document:rules-v48.part8.close-combat-ranks",
    part9: "official_document:rules-v48.part9.unit-wide-replacement",
    part12: "official_document:rules-v48.part12.marine-compositions",
    maxModels: "state_field:pieces[].maxModels",
    currentModels: "state_field:pieces[].currentModels",
    currentSupply: "state_field:pieces[].currentSupply",
    modelLedger: "derived_value:marine.modelLedger",
    activeModels: "derived_value:marine.activeModelIds",
    destroyedModels: "state_field:pieces[].destroyedModelIds",
    engagementGraph: "derived_value:officialEngagementGraphV2",
    fightingRank: "derived_value:marine.closeCombatFightingRank",
    supportingRank: "derived_value:marine.closeCombatSupportingRank",
    unitWideLoadout: "derived_value:marine.unitWideCloseCombatLoadout",
    strikeCarrierSet: "derived_value:marine.unitWideStrikeCarrierSet",
    bayonetCarrierSet: "derived_value:marine.unitWideBayonetCarrierSet",
    mixedCarrier: "forbidden_state:marine.mixedStrikeBayonetCarriers",
    specialistBayonet: "forbidden_state:marine.bayonetAsSpecialist",
    eligibleModels: "derived_value:marine.closeCombatEligibleModelIds",
    rateOfAttack: "derived_value:marine.unitWideCloseCombatRateOfAttack",
    attackPool: "derived_value:marine.multiModelCloseCombatAttackPool",
    denominator: `denominator:${OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_DENOMINATOR_ID}`,
    futureExecutor: "planned_executor:marine-multi-model-stimpack-close-combat",
    compositionTest: "judge_test:marine-six-and-nine-model-composition-denominator",
    strikeRankTest: "judge_test:marine-multi-model-strike-rank-pool",
    bayonetUnitWideTest: "judge_test:marine-bayonet-unit-wide-replacement-pool",
    mixedCarrierTest: "judge_test:marine-mixed-strike-bayonet-carrier-forbidden",
    casualtyTest: "judge_test:marine-casualty-rederives-rank-pool-and-supply",
    geometryTest: "judge_test:marine-geometry-rederives-rank-pool",
    historyTest: "judge_test:marine-stimpack-status-marker-history-chain",
    currentSourceTest: "judge_test:marine-multi-model-live-official-source-binding",
    runtimeBlockTest: "judge_test:marine-multi-model-runtime-promotion-remains-blocked",
    currentSliceRelease: "slice_release:slice-45-marine-multi-model-denominator-v1",
    currentCatalogueRelease: `catalogue_release:slice-45@${catalogueHash}`,
    currentRuntimeRelease: `runtime_release:slice-45@${runtimeHash}`,
  };
  const previousSliceRelease = "slice_release:slice-44-stimpack-close-combat-v1";
  const previousCatalogueRelease = `catalogue_release:slice-44@${catalogueHash}`;
  const previousRuntimeRelease = `runtime_release:slice-44@${runtimeHash}`;
  const oldLoadout = "derived_value:marine.closeCombatWeaponLoadout";
  const precisionDomain =
    "parameter_domain:stimpack.closeCombatPrecision.failedDiceSubsets";
  const nodes = [
    node(id.part8, "source_snapshot", "Rules v48 Part 8 close-combat rank and pool source"),
    node(id.part9, "source_snapshot", "Rules v48 Part 9 unit-wide replacement source"),
    node(id.part12, "source_snapshot", "Rules v48 Part 12 Marine composition source"),
    node(id.currentSupply, "state_field", "Supply derived from current model count"),
    node(id.modelLedger, "derived_value", "Hash-bound Marine roster/live/destroyed model ledger"),
    node(id.activeModels, "derived_value", "Current active model identifiers"),
    node(id.engagementGraph, "derived_value", "Official engagement graph v2"),
    node(id.fightingRank, "derived_value", "Live models within enemy Engagement Range"),
    node(id.supportingRank, "derived_value", "Live models touching a friendly Fighting Rank model"),
    node(id.unitWideLoadout, "derived_value", "Unit-wide Strike or Bayonet replacement loadout"),
    node(id.strikeCarrierSet, "derived_value", "All live models carry Strike when Bayonet is absent"),
    node(id.bayonetCarrierSet, "derived_value", "All live models carry Bayonet when selected"),
    node(id.mixedCarrier, "state_event", "Per-model mixed Strike and Bayonet carrier state"),
    node(id.specialistBayonet, "state_event", "Bayonet treated as Specialist"),
    node(id.eligibleModels, "derived_value", "Union of Fighting and Supporting Rank live models"),
    node(id.rateOfAttack, "derived_value", "Unit-wide selected Combat weapon RoA"),
    node(id.attackPool, "derived_value", "Eligible model count multiplied by selected weapon RoA"),
    node(id.denominator, "semantic_projection", "Slice 45 finite multi-model Close Combat denominator"),
    node(id.futureExecutor, "semantic_projection", "Future Authority consumer; not promoted in Slice 45"),
    node(id.compositionTest, "judge_test", "Six/nine roster with arbitrary legal live counts"),
    node(id.strikeRankTest, "judge_test", "Strike rank count produces exact pool"),
    node(id.bayonetUnitWideTest, "judge_test", "Bayonet replaces Strike for the full Unit"),
    node(id.mixedCarrierTest, "judge_test", "Mixed per-model Strike/Bayonet fails closed"),
    node(id.casualtyTest, "judge_test", "Casualty rederives Supply, ranks and pool"),
    node(id.geometryTest, "judge_test", "Geometry change rederives ranks and pool"),
    node(id.historyTest, "judge_test", "Stimpack status, marker and history remain hash-bound"),
    node(id.currentSourceTest, "judge_test", "Live units71/cards69/rules48 source documents match"),
    node(id.runtimeBlockTest, "judge_test", "Denominator proof does not imply runtime promotion"),
    node(id.currentSliceRelease, "slice_release", "Slice 45 multi-model denominator release"),
    node(id.currentCatalogueRelease, "catalogue_release", `Slice 45 catalogue ${catalogueHash}`),
    node(id.currentRuntimeRelease, "runtime_release", `Slice 45 runtime ${runtimeHash}`),
  ];
  const relations = [
    edge(id.part12, "defines", id.maxModels, "official_marine_composition"),
    edge(id.maxModels, "constrains", id.currentModels, "roster_bounds_live_models"),
    edge(id.currentModels, "derives", id.currentSupply, "official_supply_tiers"),
    edge(id.maxModels, "constrains", id.modelLedger, "model_ledger_roster"),
    edge(id.currentModels, "constrains", id.modelLedger, "model_ledger_live_count"),
    edge(id.destroyedModels, "constrains", id.modelLedger, "model_ledger_destroyed_count"),
    edge(id.modelLedger, "derives", id.activeModels, "model_ledger_active_ids"),
    edge(id.part9, "defines", id.unitWideLoadout, "official_unit_wide_upgrade"),
    edge(oldLoadout, "projects_to", id.unitWideLoadout, "single_to_multi_model_loadout"),
    edge(id.unitWideLoadout, "derives", id.strikeCarrierSet, "strike_unit_wide_carriers"),
    edge(id.unitWideLoadout, "derives", id.bayonetCarrierSet, "bayonet_unit_wide_carriers"),
    edge(id.part9, "invalidates", id.mixedCarrier, "non_specialist_unit_wide_rule"),
    edge(id.part9, "invalidates", id.specialistBayonet, "bayonet_has_no_specialist_keyword"),
    edge(id.part8, "defines", id.fightingRank, "official_close_combat_fighting_rank"),
    edge(id.part8, "defines", id.supportingRank, "official_close_combat_supporting_rank"),
    edge(id.engagementGraph, "derives", id.fightingRank, "engagement_rank_derivation"),
    edge(id.activeModels, "constrains", id.fightingRank, "live_fighting_models_only"),
    edge(id.activeModels, "constrains", id.supportingRank, "live_supporting_models_only"),
    edge(id.fightingRank, "derives", id.eligibleModels, "fighting_rank_eligibility"),
    edge(id.supportingRank, "derives", id.eligibleModels, "supporting_rank_eligibility"),
    edge(id.unitWideLoadout, "derives", id.rateOfAttack, "selected_weapon_roa"),
    edge(id.eligibleModels, "parameterized_by", id.rateOfAttack, "attack_pool_formula"),
    edge(id.rateOfAttack, "derives", id.attackPool, "attack_pool_formula"),
    edge(id.eligibleModels, "derives", id.attackPool, "attack_pool_formula"),
    edge(id.attackPool, "constrains", precisionDomain, "precision_choice_denominator"),
    edge(id.modelLedger, "invalidates", id.attackPool, "casualty_stale_pool_rejection"),
    edge(id.engagementGraph, "invalidates", id.attackPool, "geometry_stale_pool_rejection"),
    edge(id.denominator, "includes", id.modelLedger, "slice45_denominator_contract"),
    edge(id.denominator, "includes", id.unitWideLoadout, "slice45_denominator_contract"),
    edge(id.denominator, "includes", id.attackPool, "slice45_denominator_contract"),
    edge(id.denominator, "gates", id.futureExecutor, "runtime_not_promoted"),
    edge(id.maxModels, "verified_by", id.compositionTest, "slice45_judge_test"),
    edge(id.attackPool, "verified_by", id.strikeRankTest, "slice45_judge_test"),
    edge(id.unitWideLoadout, "verified_by", id.bayonetUnitWideTest, "slice45_judge_test"),
    edge(id.mixedCarrier, "verified_by", id.mixedCarrierTest, "slice45_judge_test"),
    edge(id.modelLedger, "verified_by", id.casualtyTest, "slice45_judge_test"),
    edge(id.engagementGraph, "verified_by", id.geometryTest, "slice45_judge_test"),
    edge(id.denominator, "verified_by", id.historyTest, "slice45_judge_test"),
    edge(id.denominator, "verified_by", id.currentSourceTest, "slice45_judge_test"),
    edge(id.futureExecutor, "verified_by", id.runtimeBlockTest, "slice45_judge_test"),
    edge(previousSliceRelease, "superseded_by", id.currentSliceRelease, "slice_version_ancestry"),
    edge(previousCatalogueRelease, "superseded_by", id.currentCatalogueRelease,
      "catalogue_version_ancestry"),
    edge(previousRuntimeRelease, "superseded_by", id.currentRuntimeRelease,
      "runtime_version_ancestry"),
  ];
  return {
    nodes: [...previous.nodes, ...nodes],
    edges: [...previous.edges, ...relations],
    executorLineages: [...previous.executorLineages],
    declaredStateContractExecutorIds: [...previous.declaredStateContractExecutorIds],
    coverageScopes: [...previous.coverageScopes],
  };
}
