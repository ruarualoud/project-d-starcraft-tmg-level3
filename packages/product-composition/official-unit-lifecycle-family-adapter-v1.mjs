import { quoteOfficialUnitAbilityModifiersV1, consumeOfficialUnitAbilityModifiersV1 } from './official-unit-ability-payment-modifiers-v1.mjs';
import { canOfficialUnitBeAbilityTargetV1 } from '../rule-atoms/official-decoy-rules-v1.mjs';
import { projectOfficialUnitRestrictionsV1 } from '../rule-atoms/official-unit-restrictions-v1.mjs';
import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { resolveOfficialAbilityResourcePaymentV1 } from
  "../rule-atoms/official-card-build-payment-rules-kernel-v1.mjs";
import {
  createOfficialBattlefieldMarkerV1,
  createOfficialBattlefieldTokenV1,
} from "../rule-atoms/official-battlefield-token-marker-rules-kernel-v1.mjs";
import {
  createOfficialPhysicalFootprintV1,
  createOfficialModelBaseFootprintV1,
  evaluateOfficialBaseMeasurementV1,
  evaluateOfficialCoherencyPlacementV1, evaluateOfficialPsionicTransferSetCoherencyV1,
  measureOfficialFootprintBoundaryToPointV1,
} from "../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";
import { deriveOfficialEngagementGraphV2, deriveOfficialModelSurfacePlacementV2 } from
  "../rule-atoms/official-engagement-graph-v2.mjs";
import { resolveOfficialCurrentSupplyValueV1 } from "../rule-atoms/official-unit-card-supply-rules-kernel-v1.mjs";
import { alternateOfficialPhaseActivationV1 } from "../rule-atoms/official-phase-activation-availability-v1.mjs";
import { projectOfficialMorphPrerequisitesV2, resolveOfficialMorphUnitV2, resolveOfficialRespawnModelsV1 } from
  "../rule-atoms/official-respawn-morph-rules-kernel-v1.mjs";
import { verifyOfficialAbilityEffectIrCatalogueV1 } from
  "../source-data/official-ability-effect-ir-v1.mjs";
import { getOfficialBattlefieldAssetComponentFootprintV1 } from
  "../source-data/official-battlefield-asset-component-profile-v1.mjs";
import { getOfficialCardBuildPaymentProfileV1 } from
  "../source-data/official-card-build-payment-data-bundle-v1.mjs";
import { getOfficialModelBaseGeometryProfileV1 } from
  "../source-data/official-model-base-geometry-data-bundle-v1.mjs";
import {
  getOfficialRespawnCarrierV1,
  isOfficialUnitReconstitutionSourceV1, OFFICIAL_COMBINED_UNIT_RECONSTITUTION_SCOPE,
  OFFICIAL_SWARMLING_RECONSTITUTION_DEFINITION_ID, OFFICIAL_VILELING_RECONSTITUTION_DEFINITION_ID,
  verifyOfficialRespawnMorphDataBundleV1,
} from "../source-data/official-respawn-morph-data-bundle-v1.mjs";
import {
  verifyOfficialSummonDataBundleV1,
} from "../source-data/official-summon-data-bundle-v1.mjs";
import { getOfficialGeneratedUnitProfileV2 } from '../source-data/official-generated-unit-data-bundle-v2.mjs';
import { getOfficialUnitCardSupplyProfileV1 } from '../source-data/official-unit-card-supply-data-bundle-v1.mjs';
import { assertOfficialReserveArrivalOutsideOpponentZoneV1, resolveOfficialSummonSupplyV1, resolveOfficialSummonDeploymentV1 }
  from '../rule-atoms/official-summon-rules-kernel-v1.mjs';
import { projectOfficialDeploymentSupplyV1 } from '../rule-atoms/official-deployment-supply-projection-v1.mjs';
import { OFFICIAL_ROACHLING_INFESTATION_DEFINITION_ID, OFFICIAL_ROACHLING_INFESTATION_DESCRIPTION }
  from '../source-data/official-summon-data-bundle-v1.mjs';
import { refreshOfficialRoundSupplyOccupancyV1 } from '../rule-atoms/official-round-supply-state-v1.mjs';
import { allocateOfficialSingletonSummonPieceIdV1 } from './official-singleton-summon-identity-v1.mjs';
import {
  isOfficialCurrentProductUnitOnCreepV1,
  resolveOfficialCurrentProductSideCapabilityV1,
} from "./official-current-product-state-facts-v1.mjs";
import {
  projectOfficialCharacteristicStatusFamilyModifiersV1,
} from "./official-characteristic-status-family-adapter-v1.mjs";
import { verifyOfficialCurrentProductAbilityDenominatorV1 } from
  "./official-current-product-ability-denominator-v1.mjs";
import { resolveOfficialMatchLifecycleAbilityResourceCostV1, quoteOfficialSelectedUnitPsionicLinkV1 } from
  "./official-match-lifecycle-family-adapter-v1.mjs";
import { assertOfficialSelectedRosterSpecialAbilityWindowV1, openOfficialSelectedRosterSpecialAbilityWindowV1 }
  from './official-selected-roster-ability-runtime-v1.mjs';

export const OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_ID =
  "official-unit-lifecycle-family-adapter-v1";
export const OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_VERSION = "1.0.1";
export const OFFICIAL_UNIT_LIFECYCLE_FAMILY_BUNDLE_SCHEMA =
  "starcraft_tmg_official_unit_lifecycle_family_source_bundle_v1";
export const OFFICIAL_UNIT_LIFECYCLE_FAMILY_PARAMETER_KIND =
  "official_unit_lifecycle_family_plan_v1";

const SIDE_KEYS = new Set(["player1", "player2"]);
const ACTIVE_EFFECTS = new Set([
  "mass_recall", "phase_prism_swap", "respawn_models",
  "return_active_ground_to_reserves", "set_special_unit",
  "spawn_creep_tumor", "summon_roachling", "morph_model", "summon_unit",
]);
const EXPECTED_ARCHETYPE_COUNTS = Object.freeze({
  mass_recall: 1,
  omega_network: 1,
  phase_prism_swap: 1,
  respawn_models: 1,
  return_active_ground_to_reserves: 3,
  set_special_unit: 2,
  spawn_creep_tumor: 1,
  summon_roachling: 1,
});

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function seal(body, field) {
  return freezeDeep({ ...body, [field]: hashStarcraftTmgContract(body) });
}
function normalized(value) {
  return String(value || "").normalize("NFC").trim().toLowerCase();
}
function activePiece(piece) {
  return piece?.isOnField === true && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}
function reservePiece(piece) {
  return piece?.isOnField !== true && piece?.isInReserves === true
    && piece?.isDestroyed !== true && Number(piece?.currentModels || 0) > 0;
}
function liveModels(piece) {
  return (piece?.models || []).filter((model) => model?.isDestroyed !== true
    && (piece.isOnField !== true || model?.isOnField !== false));
}
function tags(piece) {
  return new Set([piece?.combatTag, ...(piece?.combatTags || [])]
    .map(normalized).filter(Boolean));
}
function fieldedFeature(piece, route) {
  const selected = new Set((piece.selectedUpgradeNames || []).map(normalized));
  const equipment = new Set((piece.equipment || []).map((entry) => normalized(
    entry.equipmentName || entry.name)).filter(Boolean));
  const cost = piece.compositionKind === "large"
    ? Number(route.costByComposition?.large || 0)
    : Number(route.costByComposition?.small || 0);
  return cost === 0 || selected.has(normalized(route.abilityName))
    || equipment.has(normalized(route.abilityName));
}
function routeBase(definition, spec) {
  const match = String(definition.activationText || "").match(
    /\((\d+)\s+(Command Point|Biomass|Psionic Energy)\)/iu);
  const resourceType = !match ? null
    : normalized(match[2]) === "command point" ? "CP"
      : normalized(match[2]) === "biomass" ? "BM" : "PE";
  return {
    schema: "starcraft_tmg_official_unit_lifecycle_definition_route_v1",
    semanticVersion: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_VERSION,
    definitionId: definition.definitionId,
    sourceFeatureHash: definition.sourceFeatureHash,
    recordKey: definition.recordKey,
    sourceKind: definition.sourceKind,
    sourceProductKind: definition.sourceProductKind,
    sourceName: definition.sourceName,
    abilityName: definition.definitionName,
    activationKind: definition.activationKind,
    runtimeRole: definition.runtimeRole,
    phase: definition.phase,
    timingHooks: [...definition.timingHooks],
    activationText: definition.activationText,
    costByComposition: definition.costByComposition
      ? { ...definition.costByComposition } : null,
    sourceText: definition.sourceText,
    resourceType,
    resourceCost: Number(match?.[1] || 0),
    ...spec,
    exactSourcePatternCompiled: true,
    arbitraryProseExecutionClaimed: false,
    trainingTruth: false,
  };
}
function compileRoute(definition) {
  const name = definition.definitionName;
  const text = definition.sourceText;
  let spec = null;
  if (name === "Phase Prism"
    && /nominated to deploy from Reserves.+PLACE \(0\).+returned to Reserves/isu.test(text)) {
    spec = { effectKind: "phase_prism_swap", actionKind: "optional_deploy_replacement",
      placementDistanceMilliInches: 0, activationEnds: true };
  } else if (name === "Pylon Warp-In"
    && /no Friendly Pylon.+more than 10.+Special Abilities/isu.test(text)) {
    spec = { effectKind: "set_special_unit", actionKind: "active_ability",
      createdUnitRecordKey: "army_units:pylon", minimumEnemyGapMilliInchesExclusive: 10000,
      groundLevelRequired: true, suppressSpecialAbilitiesThisRound: true,
      removeAtRoundEnd: false };
  } else if (name === "Mass Recall"
    && /Once per Game.+Faction Indicator.+Within 6.+returned to Reserves/isu.test(text)) {
    spec = { effectKind: "mass_recall", actionKind: "active_ability",
      rangeMilliInches: 6000, requiredFaction: "Protoss", oncePerGame: true };
  } else if (isCurrentRoachlingSummonSource(definition)) {
    spec = { effectKind: 'summon_unit', actionKind: 'active_ability', createdUnitRecordKey: 'army_units:roachling',
      oncePerGame: true, parentBaseContactRequired: true, opponentZoneOfInfluenceExcluded: true,
      immediateOptionalMove: false, completeSummonPlacement: true };
  } else if (name === "Roachling Infestation" && /SUMMON \(Roachling\)/iu.test(text)) {
    spec = { effectKind: "summon_roachling", actionKind: "active_ability",
      createdUnitRecordKey: "army_units:roachling", oncePerGame: true,
      parentBaseContactRequired: true, opponentZoneOfInfluenceExcluded: true };
  } else if (isCurrentHoloSummonSource(definition)) {
    spec = { effectKind: 'summon_unit', actionKind: 'active_ability', createdUnitRecordKey: 'army_units:holo_decoy',
      parentBaseContactRequired: true, opponentZoneOfInfluenceExcluded: true, immediateOptionalMove: true };
  } else if (["Strap in!", "Strategic Recall", "Tunnel Network"].includes(name)
    && /active,? Unengaged Ground Unit.+returned to Reserves instead of/iu.test(text)) {
    spec = { effectKind: "return_active_ground_to_reserves",
      actionKind: "active_ability", requiredActorTag: "ground",
      unengagedRequired: true, replacesAction: true };
  } else if (isCurrentGriffinSupportSource(definition)) {
    spec = { effectKind: 'set_special_unit', actionKind: 'active_ability',
      createdUnitRecordKey: 'army_units:sabotage_drone', minimumEnemyGapMilliInchesExclusive: 1000,
      friendlyAnchorRangeMilliInches: 12000, allowMultipleCreatedUnits: true,
      groundLevelRequired: false, suppressSpecialAbilitiesThisRound: false, removeAtRoundEnd: true };
  } else if (definition.definitionId === OFFICIAL_RAVEN_DEPLOY_AUTO_TURRET_DEFINITION_ID
    && definition.recordKey === 'army_units:raven' && definition.sourceKind === 'unit_feature'
    && name === 'Deploy Auto-Turret' && definition.phase === 'movement' && definition.activationKind === 'active'
    && definition.activationText === '<Active>\n(1 Command Point)'
    && text === 'Set a Friendly Auto-Turret Unit Within 6", and not Within the Engagement Range of any Enemy Unit.') {
    spec = { effectKind: 'set_special_unit', actionKind: 'active_ability', createdUnitRecordKey: 'army_units:auto_turret',
      minimumEnemyGapMilliInchesExclusive: 1000, friendlyAnchorRangeMilliInches: 6000,
      friendlyAnchorCasterOnly: true, allowMultipleCreatedUnits: true, groundLevelRequired: false,
      suppressSpecialAbilitiesThisRound: false, removeAtRoundEnd: false };
  } else if (name === "Rapid Ingress"
    && /Point Defence Drone.+more than 1.+Remove this Unit at the End/isu.test(text)) {
    spec = { effectKind: "set_special_unit", actionKind: "active_ability",
      createdUnitRecordKey: "army_units:point_defense_drone",
      minimumEnemyGapMilliInchesExclusive: 1000, groundLevelRequired: false,
      suppressSpecialAbilitiesThisRound: false, removeAtRoundEnd: true };
  } else if (definition.recordKey === "tactical_cards:cocoon" && name === "Spawn Larva"
    && definition.phase === "movement" && definition.activationKind === "active"
    && text === "Spawn Larva <Active> <Movement Phase>: The active Friendly non-Unique Biological Unit with a Size Characteristic of 1 resolves the RESPAWN (2) effect.") {
    spec = { effectKind: "respawn_models", actionKind: "active_ability",
      baseRespawnValue: 2, onCreepRespawnValue: 2, requiredActorTag: "biological",
      excludedActorTag: "unique", requiredSizeCharacteristic: 1, existingModelBaseContactRequired: true };
  } else if (definition.recordKey === "tactical_cards:cocoon" && name === "Ravager Morph"
    && definition.phase === "movement" && definition.activationKind === "active"
    && text === "Ravager Morph <Active> <Movement Phase>: Once per Game. The active Friendly Roach Unit performs MORPH (Ravager) 1.") {
    spec = { effectKind: "morph_model", actionKind: "active_ability", createdUnitRecordKey: "army_units:ravager",
      createdModels: 1, parentBaseContactRequired: true, minimumEnemyGapMilliInchesExclusive: 1000,
      oncePerGame: true, activationLockedForRemainderOfRound: true };
  } else if (name === "Zergling Reconstitution"
    && /RESPAWN \(2\).+RESPAWN \(3\).+ON CREEP/isu.test(text)) {
    spec = { effectKind: "respawn_models", actionKind: "active_ability",
      baseRespawnValue: 2, onCreepRespawnValue: 3,
      existingModelBaseContactRequired: true };
  } else if (name === "Spawn Creep Tumor"
    && /Creep Tumor token in base-to-base contact/iu.test(text)) {
    spec = { effectKind: "spawn_creep_tumor", actionKind: "active_ability",
      tokenKind: "creep_tumor", parentBaseContactRequired: true };
  } else if (name === "Omega Network" && definition.sourceProductKind === "unit"
    && /base of the Omega Worm counts as an Entry Edge.+combined Supply cost of 2/isu.test(text)) {
    spec = { effectKind: "omega_network", actionKind: "optional_lifecycle_consumer",
      roundSupplyCap: 2, reserveUnitTag: "ground", sourceBaseIsEntryEdge: true,
      returnTriggerActions: ["move", "disengage", "run"] };
  }
  if (!spec) {
    fail("UNIT_LIFECYCLE_DEFINITION_COMPILER_UNRECOGNIZED",
      `${definition.recordKey}:${name}`);
  }
  return seal(routeBase(definition, spec), "routeHash");
}

export function createOfficialUnitLifecycleFamilySourceBundleV1(input = {}) {
  const { catalogue, denominator, summonDataBundle, respawnMorphDataBundle } = input;
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  verifyOfficialCurrentProductAbilityDenominatorV1(denominator);
  verifyOfficialSummonDataBundleV1(summonDataBundle);
  verifyOfficialRespawnMorphDataBundleV1(respawnMorphDataBundle);
  if (denominator.sourceCatalogueHash !== catalogue.catalogueHash) {
    fail("UNIT_LIFECYCLE_SOURCE_CATALOGUE_DENOMINATOR_DRIFT");
  }
  const pending = new Set(denominator.gapDefinitionIds);
  const owned = denominator.definitions.filter((entry) => (
    entry.plannedOwnerSlice === 238 && pending.has(entry.definitionId)));
  const definitions = owned.map((entry) => catalogue.definitions.find((candidate) => (
    candidate.definitionId === entry.definitionId)));
  if (definitions.length !== 11 || definitions.some((entry) => !entry)) {
    fail("UNIT_LIFECYCLE_SOURCE_DENOMINATOR_INVALID", String(definitions.length));
  }
  const routes = definitions.map(compileRoute).sort((left, right) => (
    left.definitionId.localeCompare(right.definitionId)));
  const archetypeCounts = Object.fromEntries([...new Set(routes.map((entry) => (
    entry.effectKind)))].sort().map((kind) => [kind, routes.filter((entry) => (
    entry.effectKind === kind)).length]));
  const body = {
    schema: OFFICIAL_UNIT_LIFECYCLE_FAMILY_BUNDLE_SCHEMA,
    semanticVersion: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_VERSION,
    sourceCatalogueHash: catalogue.catalogueHash,
    sourceDenominatorHash: denominator.denominatorHash,
    sourceSnapshotHash: catalogue.sourceSnapshotHash,
    normalizedDatasetHash: catalogue.normalizedDatasetHash,
    dataVersions: { ...catalogue.dataVersions },
    summonDataBundleHash: summonDataBundle.bundleHash,
    respawnMorphDataBundleHash: respawnMorphDataBundle.bundleHash,
    summonedUnitRecordKeys: summonDataBundle.summonedUnitProfiles.map((entry) => (
      entry.recordKey)).sort(),
    routeCount: routes.length,
    archetypeCounts,
    routes,
    definitionIds: routes.map((entry) => entry.definitionId),
    coveredSourceFeatureHashes: routes.map((entry) => entry.sourceFeatureHash).sort(),
    compilerDenominatorComplete: true,
    exactSourcePatternsRequired: true,
    lowerKernelContractsReused: ["respawn_morph", "model_base_geometry",
      "card_build_payment", "battlefield_token_marker"],
    crossFamilyConsumers: ["shade_round_end", "reserve_indicator_round_end",
      "pylon_warp_conduit"],
    sourceRefreshPerformed: false,
    rulesTruth: "official_current_product_unit_lifecycle_source_compiler",
    trainingTruth: false,
  };
  const bundle = seal(body, "bundleHash");
  verifyOfficialUnitLifecycleFamilySourceBundleV1(bundle);
  return bundle;
}

export function verifyOfficialUnitLifecycleFamilySourceBundleV1(bundle) {
  if (bundle?.schema === 'starcraft_tmg_official_unit_lifecycle_family_source_bundle_v2') {
    return verifyCurrentReleaseSubset(bundle);
  }
  if (!object(bundle)
    || bundle.schema !== OFFICIAL_UNIT_LIFECYCLE_FAMILY_BUNDLE_SCHEMA
    || bundle.semanticVersion !== OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_VERSION
    || bundle.routeCount !== 11 || bundle.routes?.length !== 11
    || new Set(bundle.definitionIds || []).size !== 11
    || new Set(bundle.coveredSourceFeatureHashes || []).size !== 11
    || new Set(bundle.routes.map((entry) => entry.routeHash)).size !== 11
    || bundle.routes.some((entry) => entry.exactSourcePatternCompiled !== true
      || entry.arbitraryProseExecutionClaimed !== false
      || entry.routeHash !== hashStarcraftTmgContract(without(entry, ["routeHash"])))
    || !isDeepStrictEqual(bundle.archetypeCounts, EXPECTED_ARCHETYPE_COUNTS)
    || bundle.summonedUnitRecordKeys?.length !== 3
    || bundle.lowerKernelContractsReused?.length !== 4
    || bundle.crossFamilyConsumers?.length !== 3
    || bundle.compilerDenominatorComplete !== true
    || bundle.sourceRefreshPerformed !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("UNIT_LIFECYCLE_SOURCE_BUNDLE_INVALID");
  }
  return true;
}

export const OFFICIAL_RAPID_INGRESS_DEFINITION_ID = 'card:raynor_s_raiders/rapid-ingress-any@1';
export const OFFICIAL_POINT_DEFENSE_LASER_DEFINITION_ID = 'unit:point_defense_drone/point-defense-laser-any-phase@1';
export const OFFICIAL_RAVEN_DEPLOY_AUTO_TURRET_DEFINITION_ID = 'unit:raven/deploy-auto-turret-movement-phase@1';
export const OFFICIAL_GRIFFIN_SUPPORT_DEFINITION_ID = 'card:nova_covert_ops/griffin-support-any@1';
export const OFFICIAL_QUEEN_SPAWN_CREEP_DEFINITION_ID = 'unit:queen/spawn-creep-tumor-any-phase@1';
export const OFFICIAL_OMEGA_WORM_NETWORK_DEFINITION_ID = 'unit:omega_worm/omega-network-any-phase@1';
export const OFFICIAL_DROPSHIP_STRAP_IN_DEFINITION_ID = 'card:dropship/strap-in-any@1';
export const OFFICIAL_PYLON_WARP_IN_DEFINITION_ID = 'card:khalai/pylon-warp-in-any@1';
const omegaNetworkScope = 'current_release_omega_network_subset';
const roachlingLifecycleScope = 'current_release_roachling_lifecycle_subset';
const massRecallLifecycleScope = 'current_release_mass_recall_lifecycle_subset';
const swarmlingLifecycleScope = 'current_release_swarmling_lifecycle_subset';
const dropshipLifecycleScope = 'current_release_dropship_lifecycle_subset';
const pylonLifecycleScope = 'current_release_pylon_lifecycle_subset';
const vilelingLifecycleScope = 'current_release_vileling_shared_lifecycle_subset';
const cocoonSharedLifecycleScope = 'current_release_cocoon_shared_lifecycle_subset';
const cocoonMorphId = 'card:cocoon/ravager-morph-any@1';
const cocoonRespawnId = 'card:cocoon/spawn-larva-any@1';
const raidersLifecycleScope = 'current_release_raiders_shared_lifecycle_subset';
const novaLifecycleScope = 'current_release_nova_shared_lifecycle_subset';
const holoSummonIds = ['unit:nova_assault_mode/holo-decoy-movement-phase@1', 'unit:nova_stealth_mode/holo-decoy-movement-phase@1'];
function isCurrentHoloSummonSource(row) {
  return holoSummonIds.includes(row?.definitionId)
    && row.definitionId === 'unit:' + row.recordKey?.slice('army_units:'.length) + '/holo-decoy-movement-phase@1'
    && row.sourceKind === 'unit_feature' && (row.definitionName ?? row.abilityName) === 'Holo Decoy'
    && row.phase === 'movement' && row.activationKind === 'active' && row.activationText === '<Active>\n(1 Command Point)'
    && row.sourceText === 'Resolve the SUMMON (Holo Decoy) effect. Then, Holo Decoy may immediately perform a Move action.';
}
export const OFFICIAL_DEFILER_TUNNEL_NETWORK_ID = 'card:defiler_mound/tunnel-network-any@1';
const moundLifecycleScope = 'current_release_defiler_mound_shared_lifecycle_subset';
const artanisPrismId = 'unit:artanis/phase-prism-movement-phase@1';
const artanisScope = 'current_release_artanis_phase_prism';
const strategicRecallScope = 'current_release_strategic_recall_subset';
const strategicRecallIds = ['card:nexus/strategic-recall-any@1','card:overcharged_nexus/strategic-recall-any@1'];
const sharedLifecycleScopes = [strategicRecallScope, artanisScope, moundLifecycleScope, novaLifecycleScope, raidersLifecycleScope, cocoonSharedLifecycleScope, omegaNetworkScope, roachlingLifecycleScope, massRecallLifecycleScope,
  swarmlingLifecycleScope, dropshipLifecycleScope, pylonLifecycleScope, vilelingLifecycleScope];
const massRecallId = 'card:daelaam/mass-recall-any@1';

function isCurrentRoachlingSummonSource(row) {
  return row?.definitionId === OFFICIAL_ROACHLING_INFESTATION_DEFINITION_ID
    && row.recordKey === 'army_units:corpser__roach_' && row.sourceKind === 'unit_feature'
    && row.phase === 'movement' && row.activationKind === 'active' && row.activationText === '<Active>\n(2 Biomass)'
    && row.sourceText === OFFICIAL_ROACHLING_INFESTATION_DESCRIPTION;
}

function sharedLifecycleProfile(definitionIds) {
  if (definitionIds.some(id => strategicRecallIds.includes(id))) return { scope: strategicRecallScope, version: '2.22.0', limit: 20 };
  if (definitionIds.includes(artanisPrismId)) return { scope: artanisScope, version: '2.21.0', limit: 18 };
  if (definitionIds.length > 1 && definitionIds.includes(OFFICIAL_DEFILER_TUNNEL_NETWORK_ID)) {
    return { scope: moundLifecycleScope, version: '2.20.0', limit: 17 };
  }
  if (definitionIds.some(id => holoSummonIds.includes(id)) && definitionIds.some(id => !holoSummonIds.includes(id))) {
    return { scope: novaLifecycleScope, version: '2.19.0', limit: 16 };
  }
  if (definitionIds.length > 1 && definitionIds.includes(OFFICIAL_GRIFFIN_SUPPORT_DEFINITION_ID)) {
    return { scope: novaLifecycleScope, version: '2.18.0', limit: 14 };
  }
  if (definitionIds.length > 1 && definitionIds.includes(OFFICIAL_RAVEN_DEPLOY_AUTO_TURRET_DEFINITION_ID)) {
    return { scope: raidersLifecycleScope, version: '2.17.0', limit: 13 };
  }
  if (definitionIds.length > 1 && definitionIds.includes(OFFICIAL_RAPID_INGRESS_DEFINITION_ID)) {
    return { scope: raidersLifecycleScope, version: '2.16.0', limit: 12 };
  }
  if (definitionIds.includes(cocoonMorphId) && definitionIds.some(id => id !== cocoonMorphId && id !== cocoonRespawnId)) {
    return { scope: cocoonSharedLifecycleScope, version: '2.15.0', limit: 10 };
  }
  if (definitionIds.length > 1 && definitionIds.includes(OFFICIAL_VILELING_RECONSTITUTION_DEFINITION_ID)) {
    return { scope: vilelingLifecycleScope, version: '2.14.0', limit: 8 };
  }
  if (definitionIds.includes(OFFICIAL_PYLON_WARP_IN_DEFINITION_ID)) {
    return { scope: pylonLifecycleScope, version: '2.13.0', limit: 7 };
  }
  if (definitionIds.includes(OFFICIAL_DROPSHIP_STRAP_IN_DEFINITION_ID)) {
    return { scope: dropshipLifecycleScope, version: '2.12.0', limit: 6 };
  }
  if (definitionIds.includes(OFFICIAL_SWARMLING_RECONSTITUTION_DEFINITION_ID)) {
    return { scope: swarmlingLifecycleScope, version: '2.11.0', limit: 5 };
  }
  if (definitionIds.includes(massRecallId)) return { scope: massRecallLifecycleScope, version: '2.10.0', limit: 4 };
  if (definitionIds.includes(OFFICIAL_ROACHLING_INFESTATION_DEFINITION_ID)) {
    return { scope: roachlingLifecycleScope, version: '2.9.0', limit: 3 };
  }
  if (definitionIds.includes(OFFICIAL_OMEGA_WORM_NETWORK_DEFINITION_ID)) {
    return { scope: omegaNetworkScope, version: '2.8.0', limit: 2 };
  }
  return null;
}

function supportsScopedOmegaNetwork(bundle) {
  return sharedLifecycleScopes.includes(bundle?.compilerScope)
    && bundle.definitionIds.includes(OFFICIAL_OMEGA_WORM_NETWORK_DEFINITION_ID);
}

function isCurrentMassRecallSource(row) {
  return row?.definitionId === massRecallId
    && row.recordKey === 'tactical_cards:daelaam' && row.sourceKind === 'card_feature'
    && row.phase === 'movement' && row.activationKind === 'active'
    && row.sourceText === "Mass Recall <Active> <Movement Phase>: Once per Game. Set a Faction Indicator anywhere on the battlefield. All Friendly Protoss Units Within 6\" of this Faction Indicator are removed from the battlefield and returned to Reserves.";
}

function isCurrentPylonWarpInSource(row) {
  return row?.definitionId === OFFICIAL_PYLON_WARP_IN_DEFINITION_ID
    && row.recordKey === 'tactical_cards:khalai' && row.sourceKind === 'card_feature'
    && row.phase === 'movement' && row.activationKind === 'active'
    && row.sourceText === 'Pylon Warp-In <Active> <Movement Phase>: If there is no Friendly Pylon on the battlefield, set a Friendly Pylon Unit anywhere on the GROUND LEVEL of the battlefield more than 10" away from any Enemy model. This Round, the Pylon is not eligible to use its Special Abilities (excluding Structure).';
}

function isCurrentGriffinSupportSource(row) {
  return row?.definitionId === OFFICIAL_GRIFFIN_SUPPORT_DEFINITION_ID && row.recordKey === 'tactical_cards:nova_covert_ops'
    && row.sourceKind === 'card_feature' && row.activationKind === 'active' && row.phase === 'movement'
    && row.sourceText === 'Griffin Support <Active> <Movement Phase>: Set a Friendly Sabotage Drone Unit Within 12" of a Friendly Unit, more than 1" away from any Enemy model. Remove this Unit at the End of the Round.';
}

function isTunnelNetworkSource(row) {
  return row?.definitionId === OFFICIAL_DEFILER_TUNNEL_NETWORK_ID && row.recordKey === 'tactical_cards:defiler_mound'
    && row.sourceKind === 'card_feature' && row.activationKind === 'active' && row.phase === 'movement'
    && (row.definitionName ?? row.abilityName) === 'Tunnel Network'
    && row.sourceText === 'Tunnel Network <Active> <Movement Phase>: The active, Unengaged Ground Unit is returned to Reserves instead of performing an action.';
}

function isSharedLifecycleSource(row) {
  if (strategicRecallIds.includes(row?.definitionId)) return row.recordKey === 'tactical_cards:' + row.definitionId.split('/')[0].slice(5)
    && row.sourceKind === 'card_feature' && row.phase === 'movement' && row.activationKind === 'active'
    && row.sourceText === 'Strategic Recall <Active> <Movement Phase>: The active, Unengaged Ground Unit is returned to Reserves instead of performing an action.';
  if (row?.definitionId === artanisPrismId) return row.recordKey === 'army_units:artanis' && row.phase === 'movement'
    && row.sourceKind === 'unit_feature' && row.activationKind === 'passive' && row.sourceText === "When Artanis is nominated to deploy from Reserves, it may resolve the PLACE (0) effect from another Friendly Unit. That Friendly Unit is removed from the battlefield and returned to Reserves. Artanis' Activation ends.";
  if (row?.definitionId === OFFICIAL_DEFILER_TUNNEL_NETWORK_ID) return isTunnelNetworkSource(row);
  if (holoSummonIds.includes(row?.definitionId)) return isCurrentHoloSummonSource(row);
  if (row?.definitionId === OFFICIAL_GRIFFIN_SUPPORT_DEFINITION_ID) return isCurrentGriffinSupportSource(row);
  if (row?.definitionId === OFFICIAL_RAVEN_DEPLOY_AUTO_TURRET_DEFINITION_ID) return row.recordKey === 'army_units:raven'
    && row.sourceKind === 'unit_feature' && row.phase === 'movement' && row.activationKind === 'active'
    && row.activationText === '<Active>\n(1 Command Point)'
    && row.sourceText === 'Set a Friendly Auto-Turret Unit Within 6", and not Within the Engagement Range of any Enemy Unit.';
  if (row?.definitionId === OFFICIAL_RAPID_INGRESS_DEFINITION_ID) return row.recordKey === 'tactical_cards:raynor_s_raiders'
    && row.sourceKind === 'card_feature' && row.phase === 'movement' && row.activationKind === 'active'
    && row.sourceText === 'Rapid Ingress <Active> <Movement Phase>: Set a Friendly Point Defence Drone Unit anywhere on the battlefield, more than 1" away from any Enemy model. Remove this Unit at the End of the Round.';
  return (row?.definitionId === cocoonMorphId || row?.definitionId === cocoonRespawnId)
    && row.recordKey === 'tactical_cards:cocoon' && row.sourceKind === 'card_feature'
    && row.phase === 'movement' && row.activationKind === 'active'
    || isCurrentRoachlingSummonSource(row) || isCurrentOmegaNetworkSource(row)
    || isQueenSpawnCreepSource(row) || isCurrentMassRecallSource(row) || isOfficialUnitReconstitutionSourceV1(row)
    || isCurrentPylonWarpInSource(row)
    || (row?.definitionId === OFFICIAL_DROPSHIP_STRAP_IN_DEFINITION_ID
      && row.recordKey === 'tactical_cards:dropship' && row.sourceKind === 'card_feature'
      && row.phase === 'movement' && row.activationKind === 'active'
      && row.sourceText === 'Strap in! <Active> <Movement Phase>: The active, Unengaged Ground Unit is returned to Reserves instead of performing an action.');
}

function sharedLifecycleArchetypeCounts(routes) {
  const counts = {};
  for (const route of routes) counts[route.effectKind] = (counts[route.effectKind] ?? 0) + 1;
  return counts;
}

function sharedLifecycleGeneratedKeys(routes) {
  return [...new Set(routes.flatMap(route => [
    ...(isCurrentHoloSummonSource(route) ? [route.createdUnitRecordKey] : []),
    ...(isCurrentOmegaNetworkSource(route) ? ['army_units:omega_worm'] : []),
    ...(isCurrentRoachlingSummonSource(route) ? [route.createdUnitRecordKey] : []),
    ...(isCurrentPylonWarpInSource(route) ? ['army_units:pylon'] : []),
    ...(route.definitionId === OFFICIAL_GRIFFIN_SUPPORT_DEFINITION_ID ? ['army_units:sabotage_drone'] : []),
    ...(route.definitionId === OFFICIAL_RAPID_INGRESS_DEFINITION_ID ? ['army_units:point_defense_drone'] : []),
    ...(route.definitionId === OFFICIAL_RAVEN_DEPLOY_AUTO_TURRET_DEFINITION_ID ? ['army_units:auto_turret'] : []),
    ...(route.definitionId === cocoonMorphId ? ['army_units:ravager'] : []),
  ]))];
}

function isCurrentOmegaNetworkSource(row) {
  return row?.definitionId === OFFICIAL_OMEGA_WORM_NETWORK_DEFINITION_ID
    && row.recordKey === 'army_units:omega_worm' && row.sourceProductKind === 'unit'
    && row.phase === 'any' && row.activationKind === 'passive' && row.activationText === '<Passive>'
    && row.sourceText === 'The base of the Omega Worm counts as an Entry Edge. Each Round, Friendly Units with a combined Supply cost of 2 or less may be Deployed via this Entry Edge.\n\nIf a Friendly Leading model finishes a Move, Disengage, or Run action in base-to-base contact with the Omega Worm, the controlling player may remove that Unit from the battlefield and return it to Reserves.';
}

function isQueenSpawnCreepSource(row) {
  return row?.definitionId === OFFICIAL_QUEEN_SPAWN_CREEP_DEFINITION_ID
    && row.recordKey === 'army_units:queen' && row.phase === 'any'
    && row.activationKind === 'active' && row.activationText === '<Active>\n(1 Biomass)'
    && row.sourceText === 'Set a Creep Tumor token in base-to-base contact with this Unit.';
}

const singleUnitLifecycleSources = Object.freeze({
  [OFFICIAL_QUEEN_SPAWN_CREEP_DEFINITION_ID]: { version: '2.7.0',
    scope: 'current_release_queen_creep_tumor_subset', effectKind: 'spawn_creep_tumor',
    verifySource: isQueenSpawnCreepSource },
  [OFFICIAL_GRIFFIN_SUPPORT_DEFINITION_ID]: { version: '2.3.0',
    scope: 'current_release_griffin_support_subset', unit: 'army_units:sabotage_drone' },
  [OFFICIAL_RAVEN_DEPLOY_AUTO_TURRET_DEFINITION_ID]: { version: '2.6.0',
    scope: 'current_release_raven_auto_turret_subset', unit: 'army_units:auto_turret' },
});

export function createOfficialUnitLifecycleFamilySourceBundleV2({ catalogue, definitionIds }) {
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  const shared = Array.isArray(definitionIds) ? sharedLifecycleProfile(definitionIds) : null;
  if (!Array.isArray(definitionIds) || !definitionIds.length || definitionIds.length > (shared?.limit ?? 2)
    || new Set(definitionIds).size !== definitionIds.length) fail('UNIT_LIFECYCLE_EXPLICIT_SUBSET_REQUIRED');
  if (shared) {
    const routes = [...definitionIds].sort().map(id => {
      const definition = catalogue.definitions.find(row => row.definitionId === id);
      if (!isSharedLifecycleSource(definition)) {
        fail('UNIT_LIFECYCLE_CURRENT_RELEASE_SOURCE_UNSUPPORTED', id);
      }
      return compileRoute(definition);
    });
    const bundle = seal({ schema: 'starcraft_tmg_official_unit_lifecycle_family_source_bundle_v2',
      semanticVersion: shared.version,
      sourceCatalogueHash: catalogue.catalogueHash, sourceSnapshotHash: catalogue.sourceSnapshotHash,
      normalizedDatasetHash: catalogue.normalizedDatasetHash, dataVersions: clone(catalogue.dataVersions),
      routeCount: routes.length, routes, definitionIds: routes.map(row => row.definitionId),
      coveredSourceFeatureHashes: routes.map(row => row.sourceFeatureHash),
      archetypeCounts: sharedLifecycleArchetypeCounts(routes),
      generatedUnitRecordKeys: sharedLifecycleGeneratedKeys(routes),
      generatedRangedDefinitionIds: definitionIds.includes(OFFICIAL_RAPID_INGRESS_DEFINITION_ID) ? [OFFICIAL_POINT_DEFENSE_LASER_DEFINITION_ID] : [],
      compilerScope: shared.scope,
      fullMatchCoverage: false, sourceRefreshPerformed: false, trainingTruth: false,
    }, 'bundleHash');
    verifyCurrentReleaseSubset(bundle);
    return bundle;
  }
  if (definitionIds.length === 1 && definitionIds[0] === 'card:defiler_mound/tunnel-network-any@1') {
    const definition = catalogue.definitions.find(row => row.definitionId === definitionIds[0]);
    if (!definition || definition.recordKey !== 'tactical_cards:defiler_mound'
      || definition.definitionName !== 'Tunnel Network' || definition.phase !== 'movement'
      || definition.sourceText !== 'Tunnel Network <Active> <Movement Phase>: The active, Unengaged Ground Unit is returned to Reserves instead of performing an action.') {
      fail('UNIT_LIFECYCLE_CURRENT_RELEASE_SOURCE_UNSUPPORTED');
    }
    const route = compileRoute(definition);
    const bundle = seal({ schema: 'starcraft_tmg_official_unit_lifecycle_family_source_bundle_v2', semanticVersion: '2.5.0',
      sourceCatalogueHash: catalogue.catalogueHash, sourceSnapshotHash: catalogue.sourceSnapshotHash,
      normalizedDatasetHash: catalogue.normalizedDatasetHash, dataVersions: clone(catalogue.dataVersions),
      routeCount: 1, routes: [route], definitionIds: [route.definitionId], coveredSourceFeatureHashes: [route.sourceFeatureHash],
      archetypeCounts: { return_active_ground_to_reserves: 1 }, generatedUnitRecordKeys: [], generatedRangedDefinitionIds: [],
      compilerScope: 'current_release_tunnel_network_subset', fullMatchCoverage: false,
      sourceRefreshPerformed: false, trainingTruth: false }, 'bundleHash');
    verifyCurrentReleaseSubset(bundle);
    return bundle;
  }
  const singleSet = definitionIds.length === 1 && Object.hasOwn(singleUnitLifecycleSources, definitionIds[0])
    ? singleUnitLifecycleSources[definitionIds[0]] : null;
  if (singleSet) {
    const definition = catalogue.definitions.find(row => row.definitionId === definitionIds[0]);
    if (!definition || (singleSet.verifySource && !singleSet.verifySource(definition))) {
      fail('UNIT_LIFECYCLE_CURRENT_RELEASE_SOURCE_UNSUPPORTED');
    }
    const route = compileRoute(definition);
    const bundle = seal({ schema: 'starcraft_tmg_official_unit_lifecycle_family_source_bundle_v2', semanticVersion: singleSet.version,
      sourceCatalogueHash: catalogue.catalogueHash, sourceSnapshotHash: catalogue.sourceSnapshotHash,
      normalizedDatasetHash: catalogue.normalizedDatasetHash, dataVersions: clone(catalogue.dataVersions),
      routeCount: 1, routes: [route], definitionIds: [route.definitionId], coveredSourceFeatureHashes: [route.sourceFeatureHash],
      archetypeCounts: { [singleSet.effectKind ?? 'set_special_unit']: 1 },
      generatedUnitRecordKeys: singleSet.unit ? [singleSet.unit] : [], generatedRangedDefinitionIds: [],
      compilerScope: singleSet.scope, fullMatchCoverage: false,
      sourceRefreshPerformed: false, trainingTruth: false }, 'bundleHash');
    verifyCurrentReleaseSubset(bundle);
    return bundle;
  }
  if (definitionIds.every(id => holoSummonIds.includes(id))) {
    const routes = [...definitionIds].sort().map(id => {
      const definition = catalogue.definitions.find(row => row.definitionId === id);
      if (!definition) fail('UNIT_LIFECYCLE_CURRENT_RELEASE_SOURCE_UNSUPPORTED');
      return compileRoute(definition);
    });
    const bundle = seal({ schema: 'starcraft_tmg_official_unit_lifecycle_family_source_bundle_v2', semanticVersion: '2.2.0',
      sourceCatalogueHash: catalogue.catalogueHash, sourceSnapshotHash: catalogue.sourceSnapshotHash,
      normalizedDatasetHash: catalogue.normalizedDatasetHash, dataVersions: clone(catalogue.dataVersions),
      routeCount: routes.length, routes, definitionIds: routes.map(row => row.definitionId),
      coveredSourceFeatureHashes: routes.map(row => row.sourceFeatureHash), archetypeCounts: { summon_unit: routes.length },
      generatedUnitRecordKeys: ['army_units:holo_decoy'], generatedRangedDefinitionIds: [],
      compilerScope: 'current_release_holo_decoy_summon_subset', fullMatchCoverage: false,
      sourceRefreshPerformed: false, trainingTruth: false }, 'bundleHash');
    verifyCurrentReleaseSubset(bundle);
    return bundle;
  }
  if (definitionIds.includes('card:cocoon/ravager-morph-any@1')) {
    if (definitionIds.some(id => !['card:cocoon/ravager-morph-any@1', 'card:cocoon/spawn-larva-any@1'].includes(id))) fail('UNIT_LIFECYCLE_CURRENT_RELEASE_SOURCE_UNSUPPORTED');
    const routes = definitionIds.map(id => catalogue.definitions.find(row => row.definitionId === id))
      .map(row => { if (!row) fail('UNIT_LIFECYCLE_CURRENT_RELEASE_SOURCE_UNSUPPORTED'); return compileRoute(row); })
      .sort((a, b) => a.definitionId.localeCompare(b.definitionId));
    const bundle = seal({ schema: 'starcraft_tmg_official_unit_lifecycle_family_source_bundle_v2', semanticVersion: '2.1.0',
      sourceCatalogueHash: catalogue.catalogueHash, sourceSnapshotHash: catalogue.sourceSnapshotHash,
      normalizedDatasetHash: catalogue.normalizedDatasetHash, dataVersions: clone(catalogue.dataVersions),
      routeCount: routes.length, routes, definitionIds: routes.map(row => row.definitionId),
      coveredSourceFeatureHashes: routes.map(row => row.sourceFeatureHash),
      archetypeCounts: Object.fromEntries(routes.map(row => [row.effectKind, 1])),
      generatedUnitRecordKeys: ['army_units:ravager'], generatedRangedDefinitionIds: [],
      compilerScope: 'current_release_cocoon_morph_subset', fullMatchCoverage: false,
      sourceRefreshPerformed: false, trainingTruth: false }, 'bundleHash');
    verifyCurrentReleaseSubset(bundle);
    return bundle;
  }
  if (definitionIds.length !== 1) fail('UNIT_LIFECYCLE_EXPLICIT_SUBSET_REQUIRED');
  const definition = catalogue.definitions.find(row => row.definitionId === definitionIds[0]);
  const unitRespawn = definition?.definitionId === 'unit:vileling__zergling_/zergling-reconstitution-movement-phase@1';
  if (definition?.definitionId === 'card:cocoon/spawn-larva-any@1' || unitRespawn) {
    const route = compileRoute(definition);
    const bundle = seal({ schema: 'starcraft_tmg_official_unit_lifecycle_family_source_bundle_v2', semanticVersion: unitRespawn ? '2.4.0' : '2.0.0',
      sourceCatalogueHash: catalogue.catalogueHash, sourceSnapshotHash: catalogue.sourceSnapshotHash,
      normalizedDatasetHash: catalogue.normalizedDatasetHash, dataVersions: clone(catalogue.dataVersions),
      routeCount: 1, routes: [route], definitionIds: [route.definitionId], coveredSourceFeatureHashes: [route.sourceFeatureHash],
      archetypeCounts: { respawn_models: 1 }, generatedUnitRecordKeys: [], generatedRangedDefinitionIds: [],
      compilerScope: unitRespawn ? 'current_release_vileling_reconstitution_subset' : 'current_release_cocoon_spawn_larva_subset', fullMatchCoverage: false,
      sourceRefreshPerformed: false, trainingTruth: false }, 'bundleHash');
    verifyCurrentReleaseSubset(bundle);
    return bundle;
  }
  if (!definition || definition.recordKey !== 'tactical_cards:raynor_s_raiders'
    || definition.definitionName !== 'Rapid Ingress' || definition.phase !== 'movement') {
    fail('UNIT_LIFECYCLE_CURRENT_RELEASE_SOURCE_UNSUPPORTED');
  }
  const route = compileRoute(definition);
  const passive = catalogue.definitions.find(row => row.recordKey === route.createdUnitRecordKey
    && row.definitionName === 'Point Defense Laser');
  if (!passive) fail('UNIT_LIFECYCLE_GENERATED_PASSIVE_REQUIRED');
  const bundle = seal({ schema: 'starcraft_tmg_official_unit_lifecycle_family_source_bundle_v2', semanticVersion: '2.0.0',
    sourceCatalogueHash: catalogue.catalogueHash, sourceSnapshotHash: catalogue.sourceSnapshotHash,
    normalizedDatasetHash: catalogue.normalizedDatasetHash, dataVersions: clone(catalogue.dataVersions),
    routeCount: 1, routes: [route], definitionIds: [route.definitionId], coveredSourceFeatureHashes: [route.sourceFeatureHash],
    archetypeCounts: { set_special_unit: 1 }, generatedUnitRecordKeys: [route.createdUnitRecordKey],
    generatedRangedDefinitionIds: [passive.definitionId], compilerScope: 'current_release_rapid_ingress_subset',
    fullMatchCoverage: false, sourceRefreshPerformed: false, trainingTruth: false }, 'bundleHash');
  verifyCurrentReleaseSubset(bundle);
  return bundle;
}
function verifyCurrentReleaseSubset(bundle) {
  if (sharedLifecycleScopes.includes(bundle.compilerScope)) {
    const routes = bundle.routes || [];
    const shared = sharedLifecycleProfile(routes.map(row => row.definitionId));
    if (!shared || bundle.compilerScope !== shared.scope || bundle.semanticVersion !== shared.version
      || !routes.length || routes.length > shared.limit || bundle.routeCount !== routes.length
      || new Set(routes.map(row => row.definitionId)).size !== routes.length
      || routes.some(row => !isSharedLifecycleSource(row)
        || !isDeepStrictEqual(compileRoute({ ...row, definitionName: row.abilityName }), row))
      || !isDeepStrictEqual(bundle.definitionIds, routes.map(row => row.definitionId))
      || !isDeepStrictEqual(bundle.coveredSourceFeatureHashes, routes.map(row => row.sourceFeatureHash))
      || !isDeepStrictEqual(bundle.archetypeCounts, sharedLifecycleArchetypeCounts(routes))
      || !isDeepStrictEqual(bundle.generatedUnitRecordKeys, sharedLifecycleGeneratedKeys(routes))
      || !isDeepStrictEqual(bundle.generatedRangedDefinitionIds, bundle.definitionIds.includes(OFFICIAL_RAPID_INGRESS_DEFINITION_ID)
        ? [OFFICIAL_POINT_DEFENSE_LASER_DEFINITION_ID] : [])
      || bundle.fullMatchCoverage !== false || bundle.sourceRefreshPerformed !== false || bundle.trainingTruth !== false
      || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ['bundleHash']))) fail('UNIT_LIFECYCLE_SOURCE_BUNDLE_INVALID');
    return true;
  }
  const route = bundle.routes?.[0];
  if (bundle.compilerScope === 'current_release_tunnel_network_subset') {
    if (bundle.semanticVersion !== '2.5.0' || bundle.routeCount !== 1 || bundle.routes?.length !== 1
      || route?.definitionId !== 'card:defiler_mound/tunnel-network-any@1'
      || route.recordKey !== 'tactical_cards:defiler_mound' || route.phase !== 'movement'
      || route.sourceText !== 'Tunnel Network <Active> <Movement Phase>: The active, Unengaged Ground Unit is returned to Reserves instead of performing an action.'
      || route.effectKind !== 'return_active_ground_to_reserves'
      || !isDeepStrictEqual(compileRoute({ ...route, definitionName: route.abilityName }), route)
      || !isDeepStrictEqual(bundle.definitionIds, [route.definitionId])
      || !isDeepStrictEqual(bundle.coveredSourceFeatureHashes, [route.sourceFeatureHash])
      || !isDeepStrictEqual(bundle.archetypeCounts, { return_active_ground_to_reserves: 1 })
      || !isDeepStrictEqual(bundle.generatedUnitRecordKeys, []) || !isDeepStrictEqual(bundle.generatedRangedDefinitionIds, [])
      || bundle.fullMatchCoverage !== false || bundle.sourceRefreshPerformed !== false || bundle.trainingTruth !== false
      || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ['bundleHash']))) fail('UNIT_LIFECYCLE_SOURCE_BUNDLE_INVALID');
    return true;
  }
  if (Object.hasOwn(singleUnitLifecycleSources, route?.definitionId) && bundle.compilerScope === singleUnitLifecycleSources[route.definitionId].scope) {
    const singleSet = singleUnitLifecycleSources[route.definitionId];
    if (bundle.semanticVersion !== singleSet.version || bundle.routeCount !== 1 || bundle.routes?.length !== 1
      || (singleSet.verifySource && !singleSet.verifySource(route))
      || !isDeepStrictEqual(compileRoute({ ...route, definitionName: route.abilityName }), route)
      || !isDeepStrictEqual(bundle.definitionIds, [route.definitionId])
      || !isDeepStrictEqual(bundle.coveredSourceFeatureHashes, [route.sourceFeatureHash])
      || !isDeepStrictEqual(bundle.archetypeCounts, { [singleSet.effectKind ?? 'set_special_unit']: 1 })
      || !isDeepStrictEqual(bundle.generatedUnitRecordKeys, singleSet.unit ? [singleSet.unit] : [])
      || !isDeepStrictEqual(bundle.generatedRangedDefinitionIds, []) || bundle.fullMatchCoverage !== false
      || bundle.sourceRefreshPerformed !== false || bundle.trainingTruth !== false
      || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ['bundleHash']))) fail('UNIT_LIFECYCLE_SOURCE_BUNDLE_INVALID');
    return true;
  }
  if (bundle.compilerScope === 'current_release_holo_decoy_summon_subset') {
    const ids = ['unit:nova_assault_mode/holo-decoy-movement-phase@1', 'unit:nova_stealth_mode/holo-decoy-movement-phase@1'];
    const routes = bundle.routes || [];
    if (bundle.semanticVersion !== '2.2.0' || !routes.length || routes.length > 2 || bundle.routeCount !== routes.length
      || new Set(routes.map(row => row.definitionId)).size !== routes.length
      || routes.some(row => !ids.includes(row.definitionId) || row.effectKind !== 'summon_unit'
        || !isDeepStrictEqual(compileRoute({ ...row, definitionName: row.abilityName }), row))
      || !isDeepStrictEqual(bundle.definitionIds, routes.map(row => row.definitionId))
      || !isDeepStrictEqual(bundle.coveredSourceFeatureHashes, routes.map(row => row.sourceFeatureHash))
      || !isDeepStrictEqual(bundle.archetypeCounts, { summon_unit: routes.length })
      || !isDeepStrictEqual(bundle.generatedUnitRecordKeys, ['army_units:holo_decoy'])
      || !isDeepStrictEqual(bundle.generatedRangedDefinitionIds, []) || bundle.fullMatchCoverage !== false
      || bundle.sourceRefreshPerformed !== false || bundle.trainingTruth !== false
      || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ['bundleHash']))) fail('UNIT_LIFECYCLE_SOURCE_BUNDLE_INVALID');
    return true;
  }
  if (bundle.compilerScope === 'current_release_cocoon_morph_subset') {
    const routes = bundle.routes || [];
    if (bundle.semanticVersion !== '2.1.0' || routes.length < 1 || routes.length > 2 || bundle.routeCount !== routes.length
      || !routes.some(row => row.definitionId === 'card:cocoon/ravager-morph-any@1')
      || new Set(routes.map(row => row.definitionId)).size !== routes.length
      || routes.some(row => !['card:cocoon/ravager-morph-any@1', 'card:cocoon/spawn-larva-any@1'].includes(row.definitionId)
        || !isDeepStrictEqual(compileRoute({ ...row, definitionName: row.abilityName }), row))
      || !isDeepStrictEqual(bundle.definitionIds, routes.map(row => row.definitionId))
      || !isDeepStrictEqual(bundle.coveredSourceFeatureHashes, routes.map(row => row.sourceFeatureHash))
      || !isDeepStrictEqual(bundle.archetypeCounts, Object.fromEntries(routes.map(row => [row.effectKind, 1])))
      || !isDeepStrictEqual(bundle.generatedUnitRecordKeys, ['army_units:ravager'])
      || !isDeepStrictEqual(bundle.generatedRangedDefinitionIds, [])
      || bundle.fullMatchCoverage !== false || bundle.sourceRefreshPerformed !== false || bundle.trainingTruth !== false
      || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ['bundleHash']))) fail('UNIT_LIFECYCLE_SOURCE_BUNDLE_INVALID');
    return true;
  }
  const unitRespawn = bundle.compilerScope === 'current_release_vileling_reconstitution_subset';
  if (bundle.compilerScope === 'current_release_cocoon_spawn_larva_subset' || unitRespawn) {
    if (bundle.semanticVersion !== (unitRespawn ? '2.4.0' : '2.0.0') || bundle.routeCount !== 1 || bundle.routes?.length !== 1
      || !object(route) || route.definitionId !== (unitRespawn ? 'unit:vileling__zergling_/zergling-reconstitution-movement-phase@1' : 'card:cocoon/spawn-larva-any@1')
      || !isDeepStrictEqual(bundle.definitionIds, [route.definitionId])
      || !isDeepStrictEqual(bundle.coveredSourceFeatureHashes, [route.sourceFeatureHash])
      || route.recordKey !== (unitRespawn ? 'army_units:vileling__zergling_' : 'tactical_cards:cocoon')
      || route.abilityName !== (unitRespawn ? 'Zergling Reconstitution' : 'Spawn Larva')
      || route.phase !== 'movement' || route.activationKind !== 'active' || route.effectKind !== 'respawn_models'
      || route.baseRespawnValue !== 2 || route.onCreepRespawnValue !== (unitRespawn ? 3 : 2)
      || (!unitRespawn && (route.requiredActorTag !== 'biological' || route.excludedActorTag !== 'unique'
        || route.requiredSizeCharacteristic !== 1)) || route.existingModelBaseContactRequired !== true
      || route.routeHash !== hashStarcraftTmgContract(without(route, ['routeHash']))
      || !isDeepStrictEqual(bundle.archetypeCounts, { respawn_models: 1 })
      || !isDeepStrictEqual(bundle.generatedUnitRecordKeys, []) || !isDeepStrictEqual(bundle.generatedRangedDefinitionIds, [])
      || bundle.fullMatchCoverage !== false || bundle.sourceRefreshPerformed !== false || bundle.trainingTruth !== false
      || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ['bundleHash']))) fail('UNIT_LIFECYCLE_SOURCE_BUNDLE_INVALID');
    return true;
  }
  if (!object(route) || bundle.semanticVersion !== '2.0.0' || bundle.routeCount !== 1 || bundle.routes?.length !== 1
    || bundle.definitionIds?.length !== 1 || bundle.definitionIds[0] !== route?.definitionId
    || bundle.coveredSourceFeatureHashes?.length !== 1 || bundle.coveredSourceFeatureHashes[0] !== route?.sourceFeatureHash
    || route.recordKey !== 'tactical_cards:raynor_s_raiders' || route.abilityName !== 'Rapid Ingress'
    || route.phase !== 'movement' || route.effectKind !== 'set_special_unit'
    || route.createdUnitRecordKey !== 'army_units:point_defense_drone' || route.removeAtRoundEnd !== true
    || route.routeHash !== hashStarcraftTmgContract(without(route, ['routeHash']))
    || !isDeepStrictEqual(bundle.archetypeCounts, { set_special_unit: 1 })
    || !isDeepStrictEqual(bundle.generatedUnitRecordKeys, [route.createdUnitRecordKey])
    || bundle.generatedRangedDefinitionIds?.length !== 1
    || bundle.compilerScope !== 'current_release_rapid_ingress_subset' || bundle.fullMatchCoverage !== false
    || bundle.sourceRefreshPerformed !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ['bundleHash']))) fail('UNIT_LIFECYCLE_SOURCE_BUNDLE_INVALID');
  return true;
}

export function createOfficialUnitLifecycleFamilyDefinitionBindingsV1(bundle) {
  verifyOfficialUnitLifecycleFamilySourceBundleV1(bundle);
  return freezeDeep(bundle.routes.map((route) => ({
    sourceFeatureHash: route.sourceFeatureHash,
    adapterId: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_ID,
    adapterVersion: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_VERSION,
    capability: ACTIVE_EFFECTS.has(route.effectKind)
      ? "authoritative_action" : "automatic_consumer",
  })).sort((left, right) => left.sourceFeatureHash.localeCompare(right.sourceFeatureHash)));
}

function cardById(state, sideKey, id) {
  return (state.cardResources?.[sideKey] || []).find((entry) => entry.cardInstanceId === id);
}
function paymentRef(state, card) {
  const profile = getOfficialCardBuildPaymentProfileV1(
    state.officialCardBuildPaymentDataBundle, card.officialCardRecordKey);
  return { cardInstanceId: card.cardInstanceId, recordKey: card.officialCardRecordKey,
    sourceRecordHash: card.sourceRecordHash, payloadHash: card.officialPayloadHash,
    profileHash: profile.profileHash, isReady: card.readiness === "ready" };
}
function resourceCostContract(state, sideKey, pieceId, route, options = {}) {
  const { resourceType, resourceCost: printedResourceCost } = route;
  if (options.usePsionicLink) {
    const quote = quoteOfficialSelectedUnitPsionicLinkV1(state, {
      sideKey, pieceId, resourceType, printedResourceCost, planHash: options.planHash,
    }, { consume: options.consume === true });
    if (!quote) fail('UNIT_LIFECYCLE_PSIONIC_LINK_PAYMENT_UNAVAILABLE');
    return quote;
  }
  const cost = !resourceType ? freezeDeep({ resourceType: null,
    printedResourceCost: 0, resourceCostReduction: 0,
    effectiveResourceCost: 0, discountSourcePieceId: null,
    trainingTruth: false })
    : state.officialMatchLifecycleFamilySourceBundle
    ? resolveOfficialMatchLifecycleAbilityResourceCostV1(
      state.officialMatchLifecycleFamilySourceBundle, state,
      { sideKey, pieceId, resourceType, printedResourceCost,
        planHash: options.planHash || null },
      { consume: options.consume === true })
    : freezeDeep({ resourceType, printedResourceCost,
      resourceCostReduction: 0, effectiveResourceCost: printedResourceCost,
      discountSourcePieceId: null, trainingTruth: false });
  return quoteOfficialUnitAbilityModifiersV1(state, pieceId, route.sourceKind, cost);
}
function paymentSelections(state, sideKey, resourceType, effectiveResourceCost) {
  if (!resourceType || effectiveResourceCost === 0) return [[]];
  const cards = (state.cardResources?.[sideKey] || []).filter((entry) => (
    entry.readiness === "ready"));
  const rows = [];
  for (let mask = 0; mask < (1 << cards.length); mask += 1) {
    const selected = cards.filter((_, index) => (mask & (1 << index)) !== 0);
    try {
      resolveOfficialAbilityResourcePaymentV1({
        cardDataBundle: state.officialCardBuildPaymentDataBundle,
        resourceType, resourceCost: effectiveResourceCost,
        selectedCardInstanceSetComplete: true,
        selectedCardInstances: selected.map((card) => paymentRef(state, card)),
      });
      rows.push(selected.map((entry) => entry.cardInstanceId).sort());
    } catch { /* Invalid payments do not enter LegalSpace. */ }
  }
  return rows.sort((left, right) => left.join("|").localeCompare(right.join("|")));
}
function routeInstances(state, route) {
  if (route.sourceKind === "unit_feature") {
    return (state.pieces || []).filter((piece) => (
      piece.officialUnitRecordKey === route.recordKey
        && (route.effectKind === "phase_prism_swap" ? reservePiece(piece) : activePiece(piece))
        && fieldedFeature(piece, route))).map((piece) => ({
      sourceInstanceId: piece.id, sideKey: piece.sideKey, sourcePiece: piece,
    }));
  }
  return Object.entries(state.cardResources || {}).flatMap(([sideKey, cards]) => (
    (cards || []).filter((card) => card.officialCardRecordKey === route.recordKey)
      .map((card) => ({ sourceInstanceId: card.cardInstanceId, sideKey, card }))
  ));
}
function combatProfile(state, recordKey) {
  const profile = state.officialCombatProfileBundle?.profilesByRecordKey?.[recordKey]
    || state.officialGameplayDataBundle?.combatProfileBundle?.profilesByRecordKey?.[recordKey];
  if (!profile) fail("UNIT_LIFECYCLE_COMBAT_PROFILE_MISSING", recordKey);
  return profile;
}
function minimumUnitGap(state, left, right) {
  const values = liveModels(left).flatMap((leftModel) => liveModels(right).map((rightModel) => (
    evaluateOfficialBaseMeasurementV1({ state,
      source: { kind: "model", unitId: left.id, modelId: leftModel.id },
      target: { kind: "model", unitId: right.id, modelId: rightModel.id },
      dataBundle: state.officialModelBaseGeometryDataBundle }).distanceMilliInches
  )));
  return values.length > 0 ? Math.min(...values) : Infinity;
}
function engaged(state, piece) {
  return (state.pieces || []).some((enemy) => enemy.sideKey !== piece.sideKey
    && activePiece(enemy) && minimumUnitGap(state, piece, enemy) <= 1001);
}
function isCurrentDropshipReturn(bundle, route) {
  return [raidersLifecycleScope, dropshipLifecycleScope, pylonLifecycleScope, vilelingLifecycleScope, cocoonSharedLifecycleScope, moundLifecycleScope].includes(bundle?.compilerScope)
    && route?.definitionId === OFFICIAL_DROPSHIP_STRAP_IN_DEFINITION_ID;
}
function isFormalTunnelReturn(state, route) {
  return route?.definitionId === OFFICIAL_DEFILER_TUNNEL_NETWORK_ID && state.officialReleaseMoundAssaultTiming && state.officialReleaseMoundAssaultTiming === state.officialPoisonousEssencePolicy?.policyHash;
}
function actionActors(state, route, instance, checkEngagementWithGraph) {
  if (route.effectKind === "phase_prism_swap") return [instance.sourcePiece];
  if (route.sourceKind === "unit_feature") return [instance.sourcePiece];
  return (state.pieces || []).filter((piece) => piece.sideKey === instance.sideKey
    && activePiece(piece) && piece.isStructure !== true
    && (route.effectKind !== "return_active_ground_to_reserves"
      || (tags(piece).has("ground") && (checkEngagementWithGraph || !engaged(state, piece))
        && !projectOfficialUnitRestrictionsV1(state, piece.id).cannotReturnToReserves)));
}
function used(state, route, sourceInstanceId, scope) {
  return (state.unitLifecycleUseHistory || []).some((entry) => (
    entry.definitionId === route.definitionId
      && entry.sourceInstanceId === sourceInstanceId
      && (scope === "game" || Number(entry.round) === Number(state.round))));
}
function repeatableNamedActive(route) {
  return /\bREPEATABLE\b/iu.test(`${route.activationText || ""}\n${route.sourceText || ""}`);
}
function namedActiveUsedThisRound(state, route, pieceId) {
  const name = normalized(route.abilityName);
  const currentUse = (entry) => Number(entry.round) === Number(state.round)
    && entry.pieceId === pieceId;
  if ((state.activeAbilityUseHistory || []).some((entry) => currentUse(entry)
    && normalized(entry.abilityName) === name)) return true;
  // Old persisted lifecycle entries did not carry abilityName. Resolve their
  // immutable definition binding, rather than resetting history on restart or
  // treating a second card copy as a different unit's named ability.
  return (state.unitLifecycleUseHistory || []).some((entry) => {
    if (!currentUse(entry)) return false;
    const priorRoute = state.officialUnitLifecycleFamilySourceBundle?.routes
      ?.find((candidate) => candidate.definitionId === entry.definitionId);
    return priorRoute?.actionKind === "active_ability"
      && normalized(priorRoute.abilityName) === name;
  });
}
function available(state, route, instance, actor, bundle, isEngaged) {
  if (!SIDE_KEYS.has(instance.sideKey) || state.activeSideKey !== instance.sideKey
    || (route.phase !== "any" && route.phase !== state.phase)) {
    fail("UNIT_LIFECYCLE_ROUTE_WINDOW_INVALID", route.definitionId);
  }
  if (instance.card && instance.card.readiness !== "ready") {
    fail("UNIT_LIFECYCLE_SOURCE_CARD_NOT_READY", instance.sourceInstanceId);
  }
  if (bundle?.schema === 'starcraft_tmg_official_unit_lifecycle_family_source_bundle_v2') {
    assertOfficialSelectedRosterSpecialAbilityWindowV1(state, instance.sideKey, actor.id, state.phase);
    const initiative = state.phaseFirstActorByRound?.[`${state.round}:${state.phase}`];
    if (!initiative || initiative.round !== Number(state.round) || initiative.phase !== state.phase
      || !SIDE_KEYS.has(initiative.chosenFirstActorSideKey)) fail('UNIT_LIFECYCLE_PHASE_INITIATIVE_UNRESOLVED');
  }
  if (route.oncePerGame && used(state, route, instance.sourceInstanceId, "game")) {
    fail("UNIT_LIFECYCLE_ONCE_PER_GAME_USED", route.definitionId);
  }
  if (route.actionKind === "active_ability" && !repeatableNamedActive(route)
    && namedActiveUsedThisRound(state, route, actor.id)) {
    fail("UNIT_LIFECYCLE_ONCE_PER_ROUND_USED", route.abilityName);
  }
  if (route.effectKind === "phase_prism_swap") {
    if (!reservePiece(actor)) fail("UNIT_LIFECYCLE_PHASE_PRISM_NOT_IN_RESERVES");
  } else if (!activePiece(actor) || actor.sideKey !== instance.sideKey
    || actor.isStructure === true) {
    fail("UNIT_LIFECYCLE_ACTIVE_UNIT_INVALID", actor?.id || "");
  }
  if (route.effectKind === "return_active_ground_to_reserves"
    && projectOfficialUnitRestrictionsV1(state, actor.id).cannotReturnToReserves) {
    fail('UNIT_RESTRICTION_RESERVE_RETURN_PROHIBITED', actor.id);
  }
  if (route.effectKind === "return_active_ground_to_reserves"
    && (!tags(actor).has("ground") || isEngaged(actor))) {
    fail("UNIT_LIFECYCLE_RECALL_TARGET_INVALID", actor.id);
  }
  if (isFormalTunnelReturn(state, route) && state.selectedRosterActivationWindow?.stage === 'after_action') {
    fail('TUNNEL_NETWORK_REPLACES_ACTION');
  }
  if (isCurrentDropshipReturn(bundle, route) && state.selectedRosterActivationWindow?.stage === 'after_action') {
    fail('DROPSHIP_RETURN_REPLACES_ACTION');
  }
  if (route.effectKind === "set_special_unit" && route.allowMultipleCreatedUnits !== true
    && (state.pieces || []).some((piece) => (
    piece.sideKey === instance.sideKey && activePiece(piece)
      && piece.officialUnitRecordKey === route.createdUnitRecordKey))) {
    fail("UNIT_LIFECYCLE_SPECIAL_UNIT_ALREADY_PRESENT", route.createdUnitRecordKey);
  }
  const targets = route.effectKind === "phase_prism_swap"
    ? (state.pieces || []).filter((piece) => piece.sideKey === actor.sideKey
      && activePiece(piece) && piece.id !== actor.id && canOfficialUnitBeAbilityTargetV1(state, piece)
      && !projectOfficialUnitRestrictionsV1(state, piece.id).cannotReturnToReserves).map((entry) => entry.id).sort()
    : [];
  if (route.effectKind === "phase_prism_swap" && targets.length === 0) {
    fail("UNIT_LIFECYCLE_PHASE_PRISM_TARGET_UNAVAILABLE");
  }
  if (route.effectKind === "respawn_models"
    && !(actor.destroyedModelIds || []).length) fail("UNIT_LIFECYCLE_NO_MODELS_TO_RESPAWN");
  let summon;
  if (route.effectKind === 'summon_unit') {
    const prepared = prepareCurrentSummon(state, actor.sideKey, route);
    const supply = resolveOfficialSummonSupplyV1({ state: prepared.state, summonDataBundle: state.officialSummonDataBundle,
      sideKey: actor.sideKey, summonedPieceId: prepared.piece.id, rulesOwnedSupplyRequested: true });
    if (!supply.summonAllowed) fail('SUMMON_INSUFFICIENT_AVAILABLE_SUPPLY');
    if (route.completeSummonPlacement) {
      summon = { createdPieceId: prepared.piece.id, modelIds: prepared.piece.models.map(model => model.id),
        parentContactModelIds: liveModels(actor).map(model => model.id) };
    }
  }
  if (route.definitionId === 'card:cocoon/spawn-larva-any@1'
    || (bundle?.schema === 'starcraft_tmg_official_unit_lifecycle_family_source_bundle_v2' && route.effectKind === 'respawn_models')) {
    const actorTags = tags(actor);
    if (route.definitionId === 'card:cocoon/spawn-larva-any@1'
      && (!actorTags.has(route.requiredActorTag) || actorTags.has(route.excludedActorTag)
        || Number(actor.sizeCharacteristic) !== route.requiredSizeCharacteristic)) fail('UNIT_LIFECYCLE_RESPAWN_TARGET_INVALID');
    const carrier = getOfficialRespawnCarrierV1(state.officialRespawnMorphDataBundle, actor.officialUnitRecordKey, route.definitionId);
    if ((instance.card && (instance.card.sourceRecordHash !== carrier.sourceRecordHash || instance.card.officialPayloadHash !== carrier.payloadHash))
      || actor.sourceRecordHash !== carrier.targetUnitProfile.sourceRecordHash
      || actor.officialPayloadHash !== carrier.targetUnitProfile.payloadHash) fail('UNIT_LIFECYCLE_RESPAWN_SOURCE_DRIFT');
    const afterOne = resolveOfficialCurrentSupplyValueV1({
      unitCardSupplyDataBundle: state.officialRespawnMorphDataBundle.unitCardSupplyDataBundle,
      recordKey: actor.officialUnitRecordKey, currentModels: Number(actor.currentModels) + 1,
      isDestroyed: false, rulesOwnedCurrentModelCountRequested: true });
    if (afterOne.currentSupplyValue > Number(actor.currentSupply)) fail('RESPAWN_SUPPLY_BRACKET_INCREASE');
  }
  const morph = route.effectKind === 'morph_model' ? projectOfficialMorphPrerequisitesV2({
    state, pieceId: actor.id, respawnMorphDataBundle: state.officialRespawnMorphDataBundle }) : null;
  if (morph) {
    const carrier = state.officialRespawnMorphDataBundle.currentMorphCarriers[0];
    if (instance.card?.sourceRecordHash !== carrier.sourceRecordHash || instance.card?.officialPayloadHash !== carrier.payloadHash) {
      fail('UNIT_LIFECYCLE_MORPH_SOURCE_DRIFT');
    }
  }
  const resourceCost = resourceCostContract(state, instance.sideKey, actor.id, route);
  const discounted = state.officialQueenPsionicLinkSource && route.sourceKind === 'unit_feature'
    && resourceCost.effectiveResourceCost === route.resourceCost
    ? quoteOfficialSelectedUnitPsionicLinkV1(state, { sideKey: instance.sideKey, pieceId: actor.id,
      resourceType: route.resourceType, printedResourceCost: route.resourceCost })
    : null;
  const choices = [resourceCost, ...(discounted ? [discounted] : [])].map(cost => ({
    targets, ...(morph ? { morph } : {}), ...(summon ? { summon } : {}),
    payments: paymentSelections(state, instance.sideKey, route.resourceType, cost.effectiveResourceCost),
    resourceCostsByChoice: { default: cost },
  })).filter(choice => choice.payments.length);
  if (!choices.length) fail("UNIT_LIFECYCLE_PAYMENT_UNAVAILABLE");
  return choices;
}
function requiredParameters(route) {
  const required = ["activeUnitId", "paymentCardInstanceIds"];
  if (route.effectKind === "morph_model") required.push("sourceModelId");
  if (!route.completeSummonPlacement && ["set_special_unit", "mass_recall", "spawn_creep_tumor", "morph_model", "summon_unit"].includes(
    route.effectKind)) required.push("coordinate");
  if (route.completeSummonPlacement || ["phase_prism_swap", "summon_roachling", "respawn_models"].includes(
    route.effectKind)) required.push("placementPlan");
  if (route.completeSummonPlacement) required.push("parentContactModelId");
  if (route.effectKind === "phase_prism_swap") {
    required.push("targetUnitId", "targetContactModelId");
  }
  return required;
}
function domainFor(state, route, instance, actor, context) {
  return seal({
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.0.0",
    parameterKind: OFFICIAL_UNIT_LIFECYCLE_FAMILY_PARAMETER_KIND,
    actionType: "resolve_unit_lifecycle_ability",
    executorId: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_VERSION,
    definitionId: route.definitionId,
    sourceFeatureHash: route.sourceFeatureHash,
    sourceInstanceId: instance.sourceInstanceId,
    sourceKind: route.sourceKind,
    sideKey: actor.sideKey,
    phase: state.phase,
    pieceId: actor.id,
    abilityName: route.abilityName,
    effectKind: route.effectKind,
    parameterSchema: {
      type: "object",
      required: requiredParameters(route),
      activeUnitId: { const: actor.id },
      ...(context.morph ? { sourceModelId: { enum: context.morph.sourceModelIds } } : {}),
      targetUnitId: context.targets.length > 0 ? { enum: context.targets } : null,
      paymentCardInstanceIds: { enum: clone(context.payments) },
      coordinate: !route.completeSummonPlacement && ["set_special_unit", "mass_recall", "spawn_creep_tumor", "morph_model", "summon_unit"].includes(
        route.effectKind) ? { type: "world_point_milli_inches" } : null,
      placementPlan: route.completeSummonPlacement || ["phase_prism_swap", "summon_roachling", "respawn_models"].includes(
        route.effectKind) ? { type: "complete_model_placement_plan" } : null,
      ...(context.summon ? { parentContactModelId: { enum: context.summon.parentContactModelIds } } : {}),
    },
    constraints: {
      sourceRouteHash: route.routeHash,
      createdUnitRecordKey: route.createdUnitRecordKey || null,
      minimumEnemyGapMilliInchesExclusive:
        route.minimumEnemyGapMilliInchesExclusive || null,
      rangeMilliInches: route.rangeMilliInches || null,
      ...(route.friendlyAnchorRangeMilliInches ? { friendlyAnchorRangeMilliInches: route.friendlyAnchorRangeMilliInches,
        anyExistingFriendlyUnitMayAnchor: !route.friendlyAnchorCasterOnly,
        ...(route.friendlyAnchorCasterOnly ? { friendlyAnchorPieceId: actor.id } : {}) } : {}),
      resourceCostsByChoice: clone(context.resourceCostsByChoice),
      ...(context.morph ? { morphPrerequisites: context.morph } : {}),
      ...(context.summon ? { summonPlacement: context.summon } : {}),
      fullBaseGeometryRequired: true,
      continuousCoordinatesNotClientCertified: true,
    },
    confirmationClass: "rules_owned_direct_action",
    rulesTruth: "official_current_product_unit_lifecycle_parameter_domain",
    trainingTruth: false,
  }, "domainId");
}
function enumeratePrimary(bundle, state, options) {
  const sideKey = String(options.sideKey || state.activeSideKey || "");
  const domains = [];
  const disabled = [];
  const catalogueScope = options.scope === "catalogue";
  let engagedUnitIds;
  for (const route of bundle.routes.filter((entry) => ACTIVE_EFFECTS.has(entry.effectKind))) {
    const checkEngagementWithGraph = isCurrentDropshipReturn(bundle, route) || isFormalTunnelReturn(state, route);
    const isEngaged = checkEngagementWithGraph
      ? actor => (engagedUnitIds ??= new Set(deriveOfficialEngagementGraphV2(state).engagedUnitIds)).has(actor.id)
      : actor => engaged(state, actor);
    for (const instance of routeInstances(state, route).filter((entry) => (
      catalogueScope || entry.sideKey === sideKey))) {
      for (const actor of actionActors(state, route, instance, checkEngagementWithGraph)) {
        try {
          for (const choice of available(state, route, instance, actor, bundle, isEngaged)) {
            domains.push(domainFor(state, route, instance, actor, choice));
          }
        } catch (error) {
          if (options.includeDisabled === true) disabled.push({
            actionType: "resolve_unit_lifecycle_ability",
            definitionId: route.definitionId,
            sourceInstanceId: instance.sourceInstanceId,
            pieceId: actor.id,
            sideKey: actor.sideKey,
            effectKind: route.effectKind,
            executorId: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_ID,
            executorVersion: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_VERSION,
            isEnabled: false,
            disabledReason: String(error?.message || error).split(":")[0],
            score: 0,
            details: { trainingTruth: false },
          });
        }
      }
    }
  }
  return { domains, disabled };
}
export function resolveOfficialCurrentOmegaEntrySourcesV2(state, sideKey) {
  const bundle = state.officialUnitLifecycleFamilySourceBundle;
  if (!supportsScopedOmegaNetwork(bundle)) return [];
  verifyOfficialUnitLifecycleFamilySourceBundleV1(bundle);
  const route = bundle.routes.find(entry => entry.definitionId === OFFICIAL_OMEGA_WORM_NETWORK_DEFINITION_ID);
  return routeInstances(state, route).filter(({ sourcePiece }) => sourcePiece.sideKey === sideKey
    && sourcePiece.isStructure === true
    && Number(sourcePiece.structureRules?.specialAbilitiesDisabledThroughRound) < Number(state.round))
    .map(({ sourcePiece }) => ({ piece: sourcePiece, route }));
}

function currentOmegaReturnWitness(state, target, omega, route) {
  const window = state.selectedRosterActivationWindow;
  const move = state.spatialActionHistory?.at(-1);
  if (window?.stage !== 'after_action' || window.pieceId !== target.id || window.round !== Number(state.round)
    || window.phase !== state.phase || move?.round !== Number(state.round) || move.phase !== state.phase
    || !route.returnTriggerActions.includes(move.actionType) || move.pieceId !== target.id
    || !move.event?.leadingModelId || !move.spatialPlanHash
    || state.log?.at(-1)?.action?.spatialPlan?.spatialPlanHash !== move.spatialPlanHash) return null;
  const touch = evaluateOfficialBaseMeasurementV1({ state,
    source: { kind: 'model', unitId: target.id, modelId: move.event.leadingModelId },
    target: { kind: 'model', unitId: omega.id, modelId: liveModels(omega)[0].id },
    dataBundle: state.officialModelBaseGeometryDataBundle });
  return touch.baseToBaseContact ? move.event : null;
}

function omegaDomains(bundle, state, sideKey) {
  const route = bundle.routes.find((entry) => entry.effectKind === "omega_network");
  if (!route || state.activeSideKey !== sideKey) return [];
  const result = [];
  const currentScope = supportsScopedOmegaNetwork(bundle);
  const sources = currentScope ? resolveOfficialCurrentOmegaEntrySourcesV2(state, sideKey).map(entry => entry.piece)
    : routeInstances(state, route).filter(entry => entry.sideKey === sideKey).map(entry => entry.sourcePiece);
  for (const omega of sources) {
    if (Number(omega?.structureRules?.specialAbilitiesDisabledThroughRound
      ?? Number.NEGATIVE_INFINITY) >= Number(state.round)) continue;
    // Current releases use native Deploy with the worm base as its entry edge.
    if (!currentScope && state.phase === "movement") {
      const spent = (state.unitLifecycleUseHistory || []).filter((entry) => (
        entry.effectKind === "omega_network_deploy" && entry.sourceInstanceId === omega.id
          && Number(entry.round) === Number(state.round)))
        .reduce((sum, entry) => sum + Number(entry.currentSupply || 0), 0);
      for (const target of (state.pieces || []).filter((piece) => piece.sideKey === sideKey
        && reservePiece(piece) && tags(piece).has("ground")
        && Number(piece.currentSupply) + spent <= route.roundSupplyCap)) {
        result.push(systemDomain(state, route, omega, target,
          "omega_network_deploy", { roundSupplyCap: route.roundSupplyCap,
            spentSupply: spent, placementPlanRequired: true }));
      }
    }
    for (const target of (state.pieces || []).filter((piece) => piece.sideKey === sideKey
      && activePiece(piece) && piece.id !== omega.id
      && (currentScope || minimumUnitGap(state, piece, omega) <= 1)
      && !projectOfficialUnitRestrictionsV1(state, piece.id).cannotReturnToReserves)) {
      const witness = currentScope
        ? currentOmegaReturnWitness(state, target, omega, route)
        : [...(state.log || [])].reverse().flatMap(entry => entry.events || [])
          .find(event => event.pieceId === target.id
            && route.returnTriggerActions.includes(normalized(event.actionType || event.type)));
      if (witness) result.push(systemDomain(state, route, omega, target,
        "omega_network_return", { triggerEventHash: hashStarcraftTmgContract(witness) }));
    }
  }
  return result;
}
function systemDomain(state, route, source, target, effectKind, extra = {}) {
  return seal({
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.0.0",
    parameterKind: OFFICIAL_UNIT_LIFECYCLE_FAMILY_PARAMETER_KIND,
    actionType: "resolve_unit_lifecycle_consumer",
    executorId: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_VERSION,
    definitionId: route.definitionId,
    sourceFeatureHash: route.sourceFeatureHash,
    sourceInstanceId: source.id,
    sideKey: target.sideKey,
    phase: state.phase,
    pieceId: target.id,
    abilityName: route.abilityName,
    effectKind,
    parameterSchema: { type: "object",
      required: ["activeUnitId", ...(extra.placementPlanRequired ? ["placementPlan"] : [])],
      activeUnitId: { const: target.id },
      placementPlan: extra.placementPlanRequired
        ? { type: "complete_model_placement_plan" } : null },
    constraints: { sourceRouteHash: route.routeHash, sourcePieceId: source.id,
      fullBaseGeometryRequired: true, ...extra },
    confirmationClass: "rules_owned_optional_lifecycle",
    rulesTruth: "official_current_product_unit_lifecycle_parameter_domain",
    trainingTruth: false,
  }, "domainId");
}
function crossFamilyDomains(state, sideKey) {
  const rows = [];
  for (const opportunity of state.pendingBattlefieldAssetOpportunities || []) {
    if (opportunity.sideKey !== sideKey) continue;
    const binding = (state.officialBattlefieldAssetBindings || []).find((entry) => (
      entry.assetId === opportunity.assetId));
    if (!binding) continue;
    const route = { definitionId: binding.sourceDefinitionId,
      sourceFeatureHash: binding.sourceFeatureHash, routeHash: binding.bindingHash,
      abilityName: opportunity.opportunityKind };
    const targets = opportunity.opportunityKind.startsWith("set_adept")
      ? (state.pieces || []).filter((piece) => piece.sideKey === sideKey && activePiece(piece)
        && piece.id === binding.sourcePieceId
        && piece.officialUnitRecordKey === "army_units:adept")
      : (state.pieces || []).filter((piece) => piece.sideKey === sideKey && reservePiece(piece)
        && tags(piece).has("ground"));
    for (const target of targets) rows.push(systemDomain(state, route,
      { id: opportunity.assetId }, target,
      opportunity.opportunityKind.startsWith("set_adept")
        ? "shade_round_end_place" : "reserve_indicator_deploy",
      { opportunityId: opportunity.opportunityId, assetId: opportunity.assetId,
        placementPlanRequired: true,
        ...(opportunity.opportunityKind.startsWith("set_adept")
          ? { sourceUnitId: binding.sourcePieceId, coherencyLeaderAssetId: binding.assetId } : {}) }));
  }
  const pylonRoute = state.officialBattlefieldAssetFamilySourceBundle?.routes?.find((entry) => (
    entry.effectKind === "pylon_reserve_deploy"));
  if (pylonRoute && state.phase === "movement") {
    for (const pylon of (state.pieces || []).filter((piece) => piece.sideKey === sideKey
      && activePiece(piece) && piece.officialUnitRecordKey === "army_units:pylon")) {
      const already = (state.unitLifecycleUseHistory || []).some((entry) => (
        entry.effectKind === "pylon_warp_conduit_deploy" && entry.sourceInstanceId === pylon.id
          && Number(entry.round) === Number(state.round)));
      if (already) continue;
      for (const target of (state.pieces || []).filter((piece) => piece.sideKey === sideKey
        && reservePiece(piece) && tags(piece).has("ground"))) {
        rows.push(systemDomain(state, pylonRoute, pylon, target,
          "pylon_warp_conduit_deploy", { placementPlanRequired: true }));
      }
    }
  }
  return rows;
}
function enumerate(bundle, state, options = {}) {
  const sideKey = String(options.sideKey || state.activeSideKey || "");
  if (!SIDE_KEYS.has(sideKey)) fail("UNIT_LIFECYCLE_SIDE_INVALID", sideKey);
  const primary = enumeratePrimary(bundle, state, options);
  const parameterDomains = [...primary.domains, ...omegaDomains(bundle, state, sideKey),
    ...(bundle.schema === OFFICIAL_UNIT_LIFECYCLE_FAMILY_BUNDLE_SCHEMA ? crossFamilyDomains(state, sideKey) : [])].sort((left, right) => (
    left.domainId.localeCompare(right.domainId)));
  return freezeDeep({
    schemaVersion: "starcraft_tmg_official_unit_lifecycle_legal_space_v1",
    runtimeId: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_VERSION,
    candidates: primary.disabled,
    parameterDomains,
    automaticDefinitionIds: bundle.routes.filter((entry) => !ACTIVE_EFFECTS.has(
      entry.effectKind)).map((entry) => entry.definitionId).sort(),
    crossFamilyConsumerDomainCount: parameterDomains.filter((entry) => (
      ["shade_round_end_place", "reserve_indicator_deploy",
        "pylon_warp_conduit_deploy"].includes(entry.effectKind))).length,
    continuousCoordinatesRequireInstantiation: true,
    rulesTruth: "official_current_product_unit_lifecycle_legal_space",
    trainingTruth: false,
  });
}

function canonicalPoint(value) {
  if (!object(value) || !Number.isSafeInteger(Number(value.xMilliInches))
    || !Number.isSafeInteger(Number(value.yMilliInches))) {
    fail("UNIT_LIFECYCLE_COORDINATE_INVALID");
  }
  return { xMilliInches: Number(value.xMilliInches),
    yMilliInches: Number(value.yMilliInches) };
}
function respawnKeywords(state, actor, route) {
  const onCreep = isOfficialCurrentProductUnitOnCreepV1(state, actor);
  const derived = actor.derivedKeywords || [];
  const liveCreep = route.definitionId === OFFICIAL_SWARMLING_RECONSTITUTION_DEFINITION_ID
    || state.officialRespawnMorphDataBundle?.compilerScope === OFFICIAL_COMBINED_UNIT_RECONSTITUTION_SCOPE;
  const keywords = liveCreep ? derived.filter(value => value !== 'on_creep') : derived;
  return [...new Set([...keywords, ...(onCreep ? ['on_creep'] : [])])];
}

function canonicalPlacement(value) {
  if (!object(value) || !Array.isArray(value.placements)
    || !String(value.leadingModelId || "")) fail("UNIT_LIFECYCLE_PLACEMENT_PLAN_INVALID");
  const placements = value.placements.map((entry) => {
    if (!String(entry?.modelId || "")
      || !Number.isSafeInteger(Number(entry.xMilliInches))
      || !Number.isSafeInteger(Number(entry.yMilliInches))) {
      fail("UNIT_LIFECYCLE_PLACEMENT_PLAN_INVALID");
    }
    return { modelId: String(entry.modelId), outcome: "placed",
      xMilliInches: Number(entry.xMilliInches), yMilliInches: Number(entry.yMilliInches),
      rotationDegrees: Number(entry.rotationDegrees || 0),
      ...(entry.contactModelId ? { contactModelId: String(entry.contactModelId) } : {}) };
  }).sort((left, right) => left.modelId.localeCompare(right.modelId));
  return { leadingModelId: String(value.leadingModelId), placements };
}
function paymentAllowed(domain, ids) {
  return domain.parameterSchema.paymentCardInstanceIds?.enum?.some((entry) => (
    isDeepStrictEqual(entry, ids)));
}
export function createOfficialSpecialUnitPieceV1(state, sideKey, recordKey, pieceId) {
  const profile = combatProfile(state, recordKey);
  const geometry = getOfficialModelBaseGeometryProfileV1(
    state.officialModelBaseGeometryDataBundle, recordKey);
  const tier = profile.squadProfile.find((entry) => entry.maximumModels !== null);
  if (!tier) fail("UNIT_LIFECYCLE_SPECIAL_UNIT_COMPOSITION_MISSING", recordKey);
  const modelIds = Array.from({ length: tier.maximumModels }, (_, index) => (
    `${pieceId}-model-${index + 1}`));
  const generatedBundle = recordKey === 'army_units:roachling'
    && state.officialSummonDataBundle?.currentDeploymentDefinitions?.some(row => row.sourceDefinitionId === OFFICIAL_ROACHLING_INFESTATION_DEFINITION_ID)
    ? state.officialSummonDataBundle.generatedUnitDataBundle : state.officialGeneratedUnitDataBundle;
  const generated = generatedBundle && recordKey !== 'army_units:ravager'
    ? getOfficialGeneratedUnitProfileV2(generatedBundle, recordKey) : null;
  if (generated && (generated.sourceRecordHash !== profile.sourceRecordHash || generated.payloadHash !== profile.payloadHash
    || generated.unitCardSupplyProfileHash !== getOfficialUnitCardSupplyProfileV1(state.officialUnitCardSupplyDataBundle, recordKey).profileHash
    || generated.geometryProfileHash !== hashStarcraftTmgContract(geometry) || generated.startingModelCount !== modelIds.length)) {
    fail('UNIT_LIFECYCLE_GENERATED_PROFILE_BINDING_MISMATCH', recordKey);
  }
  const isStructure = generated ? generated.isStructure : ["army_units:pylon", "army_units:point_defense_drone",
    "army_units:omega_worm"].includes(recordKey);
  const sizeCharacteristic = generated ? generated.sizeCharacteristic : recordKey === "army_units:ravager"
    ? state.officialRespawnMorphDataBundle?.currentMorphCarriers?.[0]?.createdUnitProfile?.sizeCharacteristic : ({
    "army_units:point_defense_drone": 0,
    "army_units:pylon": 3,
    "army_units:roachling": 1,
    "army_units:omega_worm": 3,
  })[recordKey];
  if (!Number.isSafeInteger(sizeCharacteristic)) {
    fail("UNIT_LIFECYCLE_SPECIAL_UNIT_SIZE_MISSING", recordKey);
  }
  return {
    id: pieceId, unitInstanceId: pieceId, name: profile.unitName, unitName: profile.unitName,
    unitId: profile.unitId, sideKey, officialUnitRecordKey: recordKey,
    sourceRecordHash: profile.sourceRecordHash, officialPayloadHash: profile.payloadHash,
    formationSize: "small", compositionKind: "small", armySlotType: null,
    currentModels: modelIds.length, maxModels: modelIds.length,
    currentSupply: tier.supply, sizeCharacteristic,
    destroyedModelIds: [], isOnField: false, isInReserves: false,
    isDestroyed: false, isStructure,
    combatTag: profile.combatTags.includes("flying") ? "flying" : "ground",
    combatTags: [...profile.combatTags],
    coherencyStatus: { schemaVersion: "starcraft_tmg_unit_coherency_status_v1",
      status: "special_deployment", isOutOfCoherency: false },
    statuses: profile.shield > 0 ? ["Shielded"] : [],
    firstModelShieldCapacityApplied: profile.shield > 0,
    selectedUpgradeNames: [], selectedUpgrades: [], equipment: [], weaponChoices: [],
    assignedUpgradeByModelId: Object.fromEntries(modelIds.map((id) => [id, []])),
    combatEffects: [], assaultEffects: [], damageMarker: 0,
    activatedPhases: { movement: false, assault: false, combat: false },
    deploymentStatus: "special_ability_pending_placement",
    models: modelIds.map((id) => ({ id, baseShape: geometry.baseShape,
      baseWidthInches: geometry.baseWidthMilliInches / 1000,
      baseDepthInches: geometry.baseDepthMilliInches / 1000,
      baseRotationDegrees: 0, elevation: "ground", supportTerrainIds: [],
      adjacentAccessPointIds: [], damage: 0, remainingWounds: profile.hitPoints,
      isOnField: false, isDestroyed: false })),
    includedInArmyListDuringArmyBuilding: false,
    includedInFinalScore: false, trainingTruth: false,
    ...(generated ? { officialGeneratedUnitProfileBinding: {
      bundleHash: generatedBundle.bundleHash, profileHash: generated.profileHash } } : {}),
  };
}

const makeSpecialPiece = createOfficialSpecialUnitPieceV1;
function prepareCurrentSummon(state, sideKey, route) {
  const pieceId = allocateOfficialSingletonSummonPieceIdV1(state,
    `summoned:${state.round}:${route.createdUnitRecordKey.split(':').at(-1)}`);
  const piece = makeSpecialPiece(state, sideKey, route.createdUnitRecordKey, pieceId);
  const temp = clone(state);
  temp.pieces.push(piece);
  return { state: temp, piece };
}
function shadePlacementResolution(state, target, plan, assetId) {
  const binding = (state.officialBattlefieldAssetBindings || [])
    .find(entry => entry.assetId === assetId && entry.assetKind === "shade");
  const token = (state.board?.tokens || []).find(entry =>
    String(entry.tokenId || entry.id) === assetId);
  if (!binding || !token) fail("UNIT_LIFECYCLE_SHADE_TOKEN_MISSING");
  if (binding.sourcePieceId !== target.id || binding.sideKey !== target.sideKey
    || token.createdByPieceId !== target.id) fail("UNIT_LIFECYCLE_SHADE_SOURCE_UNIT_REQUIRED");
  return prepareOfficialTokenLeadingUnitPlacementV1({ state, pieceId: target.id, tokenId: assetId, placementPlan: plan });
}
export function prepareOfficialTokenLeadingUnitPlacementV1({ state, pieceId, tokenId, placementPlan, shadeEffectHash }) {
  const target = state.pieces.find(piece => piece.id === pieceId);
  const token = state.board.tokens.find(row => String(row.tokenId || row.id) === tokenId);
  const source = state.officialPsionicTransferSourceBundle;
  const burrow = token?.tokenKind === 'ravager_burrow'
    && source?.schema === 'starcraft_tmg_token_leading_transfer_source_v2'
    && source.routes.some(route => route.tokenKind === token.tokenKind && route.recordKey === target?.officialUnitRecordKey);
  if (!activePiece(target) || token?.tokenKind !== 'shade' && !burrow || token.createdByPieceId !== pieceId) {
    fail('UNIT_LIFECYCLE_SHADE_SOURCE_UNIT_REQUIRED');
  }
  const diameter = Math.round(Number(token.baseDiameterInches) * 1000);
  const externalLeadingFootprint = createOfficialPhysicalFootprintV1({
    objectId: tokenId, kind: burrow ? 'burrow_leading_token' : 'shade_leading_token', shape: "round",
    center: { xMilliInches: Math.round(token.coordinate.x * 1000),
      yMilliInches: Math.round(token.coordinate.y * 1000) },
    widthMilliInches: diameter, depthMilliInches: diameter,
  });
  return placementResolution(state, target, placementPlan, { externalLeadingFootprint, shadeEffectHash });
}
export function prepareOfficialUnitRelativeCoherencyPlacementV1({ state, pieceId, anchorPieceId, placementPlan }) {
  const piece = state.pieces.find(row => row.id === pieceId);
  const anchor = state.pieces.find(row => row.id === anchorPieceId);
  if (!activePiece(piece) || !activePiece(anchor) || anchor.id === piece.id || piece.sideKey !== anchor.sideKey
    || liveModels(anchor).length !== 1) fail('UNIT_LIFECYCLE_UNIT_ANCHOR_INVALID');
  const externalLeadingFootprint = createOfficialModelBaseFootprintV1({ piece: anchor, model: liveModels(anchor)[0],
    dataBundle: state.officialModelBaseGeometryDataBundle });
  return placementResolution(state, piece, placementPlan, { externalLeadingFootprint });
}
function placementResolution(state, pieceInput, placementPlan, options = {}) {
  const piece = clone(pieceInput);
  piece.isOnField = true; piece.isInReserves = false;
  piece.models = piece.models.map((model) => ({ ...model,
    isOnField: model.isDestroyed !== true }));
  const projected = clone(state);
  projected.pieces = projected.pieces.filter((entry) => entry.id !== piece.id).concat(piece);
  const coherency = state.officialCharacteristicStatusFamilySourceBundle
    ? projectOfficialCharacteristicStatusFamilyModifiersV1(
      state.officialCharacteristicStatusFamilySourceBundle, projected,
      { pieceId: piece.id }).horizontalCoherencyMilliInches
    : 3000;
  const evaluate = options.shadeEffectHash ? evaluateOfficialPsionicTransferSetCoherencyV1 : evaluateOfficialCoherencyPlacementV1;
  const geometry = evaluate({ state: projected, actor: piece, shadeEffectHash: options.shadeEffectHash,
    plan: { planId: `lifecycle-placement:${piece.id}`,
      leadingModelId: placementPlan.leadingModelId,
      placements: placementPlan.placements,
      currentlyEngagedEnemyUnitIds: [] },
    coherencyRangeMilliInches: coherency,
    ...(options.externalLeadingFootprint
      ? { externalLeadingFootprint: options.externalLeadingFootprint } : {}),
    dataBundle: state.officialModelBaseGeometryDataBundle });
  if (geometry.casualtyModelIds.length !== 0 || geometry.inCoherency !== true) {
    fail("UNIT_LIFECYCLE_ALL_MODELS_MUST_BE_PLACED_IN_COHERENCY");
  }
  const positions = new Map(geometry.placements.map((entry) => [entry.modelId, entry]));
  for (const model of piece.models) {
    if (model.isDestroyed === true) continue;
    const row = positions.get(model.id);
    model.xInches = row.footprint.center.xMilliInches / 1000;
    model.yInches = row.footprint.center.yMilliInches / 1000;
    model.baseRotationDegrees = row.footprint.rotationDegrees;
    const surface = deriveOfficialModelSurfacePlacementV2(projected, {
      pieceId: piece.id,
      modelId: model.id,
    });
    if (options.groundLevelRequired && surface.elevation !== "ground") {
      fail("UNIT_LIFECYCLE_GROUND_LEVEL_REQUIRED", model.id);
    }
    model.elevation = surface.elevation;
    model.supportTerrainIds = [...surface.supportTerrainIds];
    model.adjacentAccessPointIds = [...surface.adjacentAccessPointIds];
  }
  const leading = positions.get(placementPlan.leadingModelId);
  piece.xInches = leading.footprint.center.xMilliInches / 1000;
  piece.yInches = leading.footprint.center.yMilliInches / 1000;
  piece.inCoherency = true;
  piece.coherencyStatus = {
    schemaVersion: "starcraft_tmg_unit_coherency_status_v1",
    status: "in_coherency",
    isOutOfCoherency: false,
    coherencyRangeMilliInches: coherency,
    derivedFromLifecyclePlacement: true,
  };
  piece.lastLeadingModelId = placementPlan.leadingModelId;
  piece.lastLifecyclePlacementGeometryHash = geometry.resultHash;
  projected.pieces = projected.pieces.map((entry) => entry.id === piece.id ? piece : entry);
  if (Number(options.minimumEnemyGapMilliInchesExclusive || 0) > 0) {
    const enemyGap = Math.min(Infinity, ...(projected.pieces || []).filter((entry) => (
      entry.sideKey !== piece.sideKey && activePiece(entry))).map((enemy) => (
      minimumUnitGap(projected, piece, enemy))));
    if (enemyGap <= Number(options.minimumEnemyGapMilliInchesExclusive)) {
      fail("UNIT_LIFECYCLE_ENEMY_SEPARATION_REQUIRED", String(enemyGap));
    }
  }
  if (options.anchorPieceId) {
    const anchor = projected.pieces.find((entry) => entry.id === options.anchorPieceId);
    const source = { kind: "model", unitId: piece.id,
      modelId: placementPlan.leadingModelId };
    const target = { kind: "model", unitId: anchor.id,
      modelId: options.anchorContactModelId };
    const contact = evaluateOfficialBaseMeasurementV1({ state: projected, source, target,
      dataBundle: state.officialModelBaseGeometryDataBundle });
    if (contact.baseToBaseContact !== true) {
      fail("UNIT_LIFECYCLE_PARENT_BASE_CONTACT_REQUIRED");
    }
  }
  let friendlyRangeProof;
  if (options.friendlyAnchorRangeMilliInches) {
    const qualifyingFriendlyUnits = projected.pieces.filter(anchor => anchor.id !== piece.id
      && (!options.friendlyAnchorPieceId || anchor.id === options.friendlyAnchorPieceId)
      && anchor.sideKey === piece.sideKey && activePiece(anchor)).map(anchor => ({
      pieceId: anchor.id, minimumDistanceMilliInches: minimumUnitGap(projected, piece, anchor),
    })).filter(anchor => anchor.minimumDistanceMilliInches <= options.friendlyAnchorRangeMilliInches)
      .sort((left, right) => left.pieceId.localeCompare(right.pieceId));
    if (!qualifyingFriendlyUnits.length) fail('UNIT_LIFECYCLE_FRIENDLY_ANCHOR_RANGE_REQUIRED');
    friendlyRangeProof = seal({ rangeMilliInches: options.friendlyAnchorRangeMilliInches,
      qualifyingFriendlyUnits }, 'proofHash');
  }
  return { piece, geometryHash: geometry.resultHash, ...(friendlyRangeProof ? { friendlyRangeProof } : {}) };
}
export function prepareOfficialReserveBeaconPlacementV1(state, target, marker, placementPlan) {
  if (!reservePiece(target) || !tags(target).has('ground') || target.isStructure === true
    || target.sideKey !== marker.sideKey || marker.physicalPresence !== false || !marker.coordinate) {
    fail('RESERVE_BEACON_TARGET_UNAVAILABLE');
  }
  const supply = projectOfficialDeploymentSupplyV1(state, target.sideKey, target.id);
  if (!supply.poolRequirementSatisfied) fail('RESERVE_BEACON_SUPPLY_UNAVAILABLE', target.id);
  const plan = canonicalPlacement(placementPlan);
  const { piece, geometryHash } = placementResolution(state, target, plan);
  const placements = liveModels(piece).map(model => ({ modelId: model.id,
    footprint: createOfficialModelBaseFootprintV1({ piece, model, dataBundle: state.officialModelBaseGeometryDataBundle }) }));
  const zone = assertOfficialReserveArrivalOutsideOpponentZoneV1(state, target.sideKey, placements);
  const leading = placements.find(row => row.modelId === plan.leadingModelId);
  const referencePoint = { xMilliInches: Math.round(marker.coordinate.x * 1000),
    yMilliInches: Math.round(marker.coordinate.y * 1000) };
  const markerGap = measureOfficialFootprintBoundaryToPointV1(leading.footprint, referencePoint);
  if (markerGap > 1) fail('RESERVE_BEACON_LEADING_BASE_MUST_TOUCH_MARKER', leading.modelId);
  return { piece, plan, geometryHash, zone, markerGap, supply };
}

function validatePointInBoard(state, point, radius) {
  const x = point.xMilliInches / 1000; const y = point.yMilliInches / 1000;
  if (x - radius < 0 || y - radius < 0
    || x + radius > Number(state.board.widthInches)
    || y + radius > Number(state.board.heightInches)) {
    fail("UNIT_LIFECYCLE_FULL_BASE_OUTSIDE_BATTLEFIELD");
  }
}
function tumorPlan(state, actor, point) {
  const profile = getOfficialBattlefieldAssetComponentFootprintV1(
    state.officialBattlefieldAssetComponentProfile, "creep_tumor");
  const radius = profile.baseDiameterMm / 25.4 / 2;
  validatePointInBoard(state, point, radius);
  const center = { xInches: point.xMilliInches / 1000,
    yInches: point.yMilliInches / 1000 };
  const contact = liveModels(actor).some((model) => {
    const modelRadius = Math.max(Number(model.baseWidthInches),
      Number(model.baseDepthInches)) / 2;
    return Math.abs(Math.hypot(Number(model.xInches) - center.xInches,
      Number(model.yInches) - center.yInches) - modelRadius - radius) <= 0.002;
  });
  if (!contact) fail("UNIT_LIFECYCLE_PARENT_BASE_CONTACT_REQUIRED");
  const overlapsModel = (state.pieces || []).filter(activePiece).flatMap(liveModels)
    .some((model) => {
      const modelRadius = Math.max(Number(model.baseWidthInches),
        Number(model.baseDepthInches)) / 2;
      return Math.hypot(Number(model.xInches) - center.xInches,
        Number(model.yInches) - center.yInches) < modelRadius + radius - 0.001;
    });
  if (overlapsModel) fail("UNIT_LIFECYCLE_TUMOR_OVERLAP");
  const overlapsToken = (state.board?.tokens || []).some((token) => {
    if (token.isRemoved === true) return false;
    const tokenX = Number(token.coordinate?.x);
    const tokenY = Number(token.coordinate?.y);
    if (!Number.isFinite(tokenX) || !Number.isFinite(tokenY)) return false;
    if (token.baseShape === "square") {
      const halfWidth = Number(token.baseWidthInches) / 2;
      const halfDepth = Number(token.baseDepthInches) / 2;
      const dx = Math.max(0, Math.abs(center.xInches - tokenX) - halfWidth);
      const dy = Math.max(0, Math.abs(center.yInches - tokenY) - halfDepth);
      return Math.hypot(dx, dy) < radius - 0.001;
    }
    const tokenRadius = Number(token.baseDiameterInches) / 2;
    return Number.isFinite(tokenRadius) && tokenRadius > 0
      && Math.hypot(center.xInches - tokenX,
        center.yInches - tokenY) < radius + tokenRadius - 0.001;
  });
  if (overlapsToken) fail("UNIT_LIFECYCLE_TUMOR_OVERLAP");
  return { profile, coordinate: { x: center.xInches, y: center.yInches } };
}
function validateMassRecallPoint(state, point) {
  validatePointInBoard(state, point, 0);
  return { x: point.xMilliInches / 1000, y: point.yMilliInches / 1000 };
}
function canonicalize(bundle, state, domain, parameters) {
  if (!object(parameters) || parameters.activeUnitId !== domain.pieceId) {
    fail("UNIT_LIFECYCLE_ACTION_INPUT_INVALID");
  }
  const result = { activeUnitId: domain.pieceId };
  if (domain.parameterSchema.paymentCardInstanceIds) {
    const paymentIds = [...new Set((parameters.paymentCardInstanceIds || []).map(String))].sort();
    if (!paymentAllowed(domain, paymentIds)) fail("UNIT_LIFECYCLE_PAYMENT_INVALID");
    result.paymentCardInstanceIds = paymentIds;
  }
  if (domain.parameterSchema.coordinate) result.coordinate = canonicalPoint(parameters.coordinate);
  if (domain.parameterSchema.sourceModelId) {
    if (!domain.parameterSchema.sourceModelId.enum.includes(parameters.sourceModelId)) fail("MORPH_SOURCE_MODEL_INVALID");
    result.sourceModelId = parameters.sourceModelId;
  }
  if (domain.parameterSchema.placementPlan) {
    result.placementPlan = canonicalPlacement(parameters.placementPlan);
  }
  if (domain.parameterSchema.targetUnitId) {
    const targetUnitId = String(parameters.targetUnitId || "");
    if (!domain.parameterSchema.targetUnitId.enum.includes(targetUnitId)) {
      fail("UNIT_LIFECYCLE_TARGET_INVALID", targetUnitId);
    }
    result.targetUnitId = targetUnitId;
    result.targetContactModelId = String(parameters.targetContactModelId || "");
    if (!result.targetContactModelId) fail("UNIT_LIFECYCLE_CONTACT_MODEL_REQUIRED");
  }
  const route = bundle.routes.find((entry) => entry.definitionId === domain.definitionId);
  const actor = state.pieces.find((entry) => entry.id === domain.pieceId);
  if (route?.effectKind === 'summon_unit') {
    const prepared = prepareCurrentSummon(state, domain.sideKey, route);
    result.createdPieceId = prepared.piece.id;
    if (route.completeSummonPlacement) {
      if (!domain.parameterSchema.parentContactModelId.enum.includes(parameters.parentContactModelId)) {
        fail('UNIT_LIFECYCLE_CONTACT_MODEL_INVALID');
      }
      result.parentContactModelId = parameters.parentContactModelId;
    } else {
      const liveParents = liveModels(actor);
      if (prepared.piece.models.length !== 1 || liveParents.length !== 1) fail('UNIT_LIFECYCLE_SINGLE_MODEL_SUMMON_REQUIRED');
      result.parentContactModelId = liveParents[0].id;
      result.placementPlan = canonicalPlacement({ leadingModelId: prepared.piece.models[0].id,
        placements: [{ modelId: prepared.piece.models[0].id, ...result.coordinate, rotationDegrees: 0 }] });
    }
    result.placementPlan.planId = 'summon-placement:' + prepared.piece.id;
    result.placementPlan.currentlyEngagedEnemyUnitIds = [];
    const definition = state.officialSummonDataBundle.currentDeploymentDefinitions.find(row => row.sourceDefinitionId === route.definitionId);
    if (!definition) fail('UNIT_LIFECYCLE_SUMMON_SOURCE_REQUIRED');
    result.triggerEvent = { type: 'special_ability_resolved', sideKey: actor.sideKey, pieceId: actor.id,
      abilityName: route.abilityName, abilityDefinitionHash: definition.definitionHash,
      sourceDefinitionId: route.definitionId, summonedUnitRecordKey: route.createdUnitRecordKey, trainingTruth: false };
    result.triggerEventHash = hashStarcraftTmgContract(result.triggerEvent);
    prepared.state.log = [...(prepared.state.log || []), { events: [result.triggerEvent] }];
    result.summonResolution = resolveOfficialSummonDeploymentV1({ state: prepared.state,
      summonDataBundle: state.officialSummonDataBundle, sideKey: actor.sideKey, parentPieceId: actor.id,
      summonedPieceId: prepared.piece.id, sourceDefinitionId: route.definitionId, triggerEventHash: result.triggerEventHash,
      parentContactModelId: result.parentContactModelId, placementPlan: result.placementPlan });
  }
  if (route?.effectKind === "set_special_unit") {
    const ordinal = (state.pieces || []).filter((entry) => entry.specialDeployment === true).length + 1;
    const pieceId = route.allowMultipleCreatedUnits === true
      ? allocateOfficialSingletonSummonPieceIdV1(state, `special:${state.round}:${route.createdUnitRecordKey.split(':').at(-1)}`)
      : `special:${state.round}:${route.createdUnitRecordKey.split(':').at(-1)}:${ordinal}`;
    const piece = makeSpecialPiece(state, domain.sideKey, route.createdUnitRecordKey,
      pieceId);
    const placement = canonicalPlacement({ leadingModelId: piece.models[0].id,
      placements: [{ modelId: piece.models[0].id,
        xMilliInches: result.coordinate.xMilliInches,
        yMilliInches: result.coordinate.yMilliInches, rotationDegrees: 0 }] });
    result.createdPieceId = piece.id;
    result.placementPlan = placement;
    const placed = placementResolution(state, piece, placement, setPlacementOptions(route, actor));
    if (placed.friendlyRangeProof) result.friendlyRangeProof = placed.friendlyRangeProof;
  }
  if (route?.effectKind === "morph_model") {
    const ordinal = state.pieces.filter(row => row.isMorphed === true).length + 1;
    const piece = makeSpecialPiece(state, actor.sideKey, route.createdUnitRecordKey,
      `morphed:${actor.sideKey}:${state.round}:ravager:${ordinal}`);
    const placementPlan = canonicalPlacement({ leadingModelId: piece.models[0].id,
      placements: [{ modelId: piece.models[0].id, xMilliInches: result.coordinate.xMilliInches,
        yMilliInches: result.coordinate.yMilliInches, rotationDegrees: 0 }] });
    const placed = placementResolution(state, piece, placementPlan, { ...route,
      anchorPieceId: actor.id, anchorContactModelId: result.sourceModelId }).piece;
    Object.assign(placed, { isMorphed: true, isSummoned: false, includedInFinalScore: true,
      deploymentStatus: "morphed_on_battlefield", morphSourcePieceId: actor.id, morphSourceModelId: result.sourceModelId,
      officialMorphActivationLock: { round: Number(state.round), sourceDefinitionId: route.definitionId, sourcePieceId: actor.id },
      activatedPhases: { movement: true, assault: true, combat: true } });
    result.createdPieceId = placed.id;
    result.morphResolution = resolveOfficialMorphUnitV2({ state, respawnMorphDataBundle: state.officialRespawnMorphDataBundle,
      pieceId: actor.id, sourceModelId: result.sourceModelId, createdPiece: placed });
  }
  if (route?.effectKind === "mass_recall") validateMassRecallPoint(state, result.coordinate);
  if (route?.effectKind === "spawn_creep_tumor") tumorPlan(state, actor, result.coordinate);
  if (route?.effectKind === "phase_prism_swap") {
    const target = state.pieces.find((entry) => entry.id === result.targetUnitId);
    if (!target?.models?.some((entry) => entry.id === result.targetContactModelId
      && entry.isDestroyed !== true)) fail("UNIT_LIFECYCLE_CONTACT_MODEL_INVALID");
    placementResolution(state, actor, result.placementPlan, {
      anchorPieceId: target.id, anchorContactModelId: result.targetContactModelId });
  }
  if (route?.effectKind === "summon_roachling") {
    const ordinal = (state.pieces || []).filter((entry) => entry.isSummoned === true).length + 1;
    const piece = makeSpecialPiece(state, domain.sideKey, route.createdUnitRecordKey,
      `summoned:${state.round}:roachling:${ordinal}`);
    if (result.placementPlan.placements.map((entry) => entry.modelId).join("|")
      !== piece.models.map((entry) => entry.id).sort().join("|")) {
      fail("UNIT_LIFECYCLE_SUMMON_MODEL_DENOMINATOR_INVALID");
    }
    result.createdPieceId = piece.id;
    const parentContactModelId = String(parameters.parentContactModelId || "");
    if (!actor.models.some((entry) => entry.id === parentContactModelId
      && entry.isDestroyed !== true)) fail("UNIT_LIFECYCLE_CONTACT_MODEL_INVALID");
    result.parentContactModelId = parentContactModelId;
    placementResolution(state, piece, result.placementPlan, {
      anchorPieceId: actor.id, anchorContactModelId: parentContactModelId });
  }
  if (route?.effectKind === "respawn_models") {
    const returnedModelIds = result.placementPlan.placements.map((entry) => entry.modelId);
    const temp = clone(state);
    const tempActor = temp.pieces.find((entry) => entry.id === actor.id);
    tempActor.derivedKeywords = respawnKeywords(state, actor, route);
    const carrier = getOfficialRespawnCarrierV1(state.officialRespawnMorphDataBundle, actor.officialUnitRecordKey, route.definitionId);
    const event = { type: "special_ability_resolved", sideKey: actor.sideKey,
      pieceId: actor.id, abilityName: route.abilityName,
      abilityDefinitionHash: carrier.definitionHash, effectKeyword: "RESPAWN",
      ...(carrier.definitionId ? { sourceDefinitionId: carrier.definitionId } : {}),
      baseRespawnValue: route.baseRespawnValue,
      onCreepRespawnValue: route.onCreepRespawnValue, trainingTruth: false };
    temp.log = [...(temp.log || []), { id: `preview-trigger:${temp.log?.length || 0}`,
      events: [event] }];
    const triggerEventHash = hashStarcraftTmgContract(event);
    const resolution = resolveOfficialRespawnModelsV1({
      respawnMorphDataBundle: state.officialRespawnMorphDataBundle,
      state: temp, pieceId: actor.id, procedureKind: "respawn_models",
      ...(carrier.definitionId ? { sourceDefinitionId: carrier.definitionId } : {}),
      triggerEventHash, rulesOwnedRespawnRequested: true,
      placementPlan: { returnedModelIds, placements: result.placementPlan.placements },
    });
    result.triggerEvent = event; result.triggerEventHash = triggerEventHash;
    result.respawnResolution = resolution;
  }
  if (domain.actionType === "resolve_unit_lifecycle_consumer"
    && domain.parameterSchema.placementPlan) {
    const target = state.pieces.find((entry) => entry.id === domain.pieceId);
    if (domain.effectKind === "shade_round_end_place") {
      shadePlacementResolution(state, target, result.placementPlan, domain.sourceInstanceId);
    } else if (domain.effectKind === "reserve_indicator_deploy") {
      const marker = (state.board?.markers || []).find((entry) => (
        String(entry.markerId || entry.id) === domain.sourceInstanceId));
      if (!marker) fail("UNIT_LIFECYCLE_RESERVE_INDICATOR_MISSING");
      const placed = placementResolution(state, target, result.placementPlan, {}).piece;
      const leading = placed.models.find((entry) => (
        entry.id === result.placementPlan.leadingModelId));
      if (Math.hypot(Number(leading.xInches) - Number(marker.coordinate.x),
        Number(leading.yInches) - Number(marker.coordinate.y)) > 0.001) {
        fail("UNIT_LIFECYCLE_RESERVE_INDICATOR_ENTRY_POINT_REQUIRED");
      }
    } else {
      const source = state.pieces.find((entry) => entry.id === domain.constraints.sourcePieceId);
      if (!source) fail("UNIT_LIFECYCLE_ENTRY_SOURCE_MISSING");
      placementResolution(state, target, result.placementPlan, {
        anchorPieceId: source.id,
        anchorContactModelId: String(parameters.sourceContactModelId || source.models?.[0]?.id),
      });
      result.sourceContactModelId = String(parameters.sourceContactModelId
        || source.models?.[0]?.id);
    }
  }
  return result;
}
function instantiate(bundle, state, domain, parameters) {
  if (!object(domain) || domain.executorId !== OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_ID) {
    fail("UNIT_LIFECYCLE_PARAMETER_DOMAIN_INVALID");
  }
  const fresh = enumerate(bundle, state, { sideKey: domain.sideKey,
    includeDisabled: true }).parameterDomains.find((entry) => entry.domainId === domain.domainId);
  if (!fresh || !isDeepStrictEqual(fresh, domain)) fail("UNIT_LIFECYCLE_PARAMETER_DOMAIN_STALE");
  const canonicalParameters = canonicalize(bundle, state, domain, parameters);
  const route = bundle.routes.find((entry) => entry.definitionId === domain.definitionId);
  const plan = seal({
    schema: "starcraft_tmg_official_unit_lifecycle_plan_v1",
    semanticVersion: "1.0.0",
    domainId: domain.domainId,
    definitionId: domain.definitionId,
    sourceFeatureHash: domain.sourceFeatureHash,
    sourceInstanceId: domain.sourceInstanceId,
    sideKey: domain.sideKey,
    pieceId: domain.pieceId,
    effectKind: domain.effectKind,
    canonicalParameters,
    domainConstraints: clone(domain.constraints),
    sourceRouteHash: route?.routeHash || domain.constraints.sourceRouteHash,
    stateHashBefore: hashStarcraftTmgContract(state),
    rulesTruth: "official_current_product_unit_lifecycle_plan",
    trainingTruth: false,
  }, "planHash");
  const action = freezeDeep({
    actionType: domain.actionType,
    sideKey: domain.sideKey,
    phase: state.phase,
    pieceId: domain.pieceId,
    definitionId: domain.definitionId,
    sourceFeatureHash: domain.sourceFeatureHash,
    effectKind: domain.effectKind,
    unitLifecyclePlan: plan,
    executorId: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_VERSION,
  });
  return freezeDeep({
    schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters, action,
    rulesTruth: "official_current_product_unit_lifecycle_instantiation",
    trainingTruth: false,
  });
}
function preview(bundle, state, request = {}) {
  if (bundle.schema === 'starcraft_tmg_official_unit_lifecycle_family_source_bundle_v2') {
    const parameters = request.parameters || {};
    const route = bundle.routes.find(row => row.definitionId === request.domain?.definitionId);
    const semanticKeys = route?.completeSummonPlacement ? requiredParameters(route) : ['activeUnitId', 'paymentCardInstanceIds',
      ...(request.domain?.effectKind === 'respawn_models' ? ['placementPlan']
        : request.domain?.effectKind === 'morph_model' ? ['sourceModelId', 'coordinate'] : ['coordinate'])];
    if (!object(parameters) || Object.keys(parameters).some((key) => !semanticKeys.includes(key))) {
      fail('UNIT_LIFECYCLE_SEMANTIC_PARAMETERS_REQUIRED');
    }
  }
  const result = instantiate(bundle, state, request.domain, request.parameters || {});
  return freezeDeep({ ok: true,
    schema: "starcraft_tmg_official_unit_lifecycle_preview_v1",
    runtimeId: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_VERSION,
    action: result.action,
    deltas: [{ kind: result.action.effectKind,
      pieceId: result.action.pieceId,
      createdPieceId: result.canonicalParameters.createdPieceId || null,
      reversibleBeforeApply: true }],
    rulesTruth: "official_current_product_unit_lifecycle_preview",
    trainingTruth: false });
}
function pay(state, route, plan, events) {
  const ids = plan.canonicalParameters.paymentCardInstanceIds || [];
  if (!route) return;
  const cost = resourceCostContract(state, plan.sideKey, plan.pieceId, route,
    { planHash: plan.planHash, consume: true,
      usePsionicLink: Boolean(plan.domainConstraints?.resourceCostsByChoice?.default?.psionicLinkDefinitionId) });
  if (route.resourceType) {
    const cards = ids.map((id) => cardById(state, plan.sideKey, id));
    if (cards.some((entry) => !entry)) fail("UNIT_LIFECYCLE_PAYMENT_CARD_UNKNOWN");
    const payment = resolveOfficialAbilityResourcePaymentV1({
      cardDataBundle: state.officialCardBuildPaymentDataBundle,
      resourceType: route.resourceType, resourceCost: cost.effectiveResourceCost,
      selectedCardInstanceSetComplete: true,
      selectedCardInstances: cards.map((card) => paymentRef(state, card)),
    });
    for (const id of payment.selectedCardsExhaustOnCommit) {
      cardById(state, plan.sideKey, id).readiness = "exhausted";
    }
    events.push({ type: "ability_resource_paid", resourceType: route.resourceType,
      resourceCost: cost.effectiveResourceCost,
      printedResourceCost: route.resourceCost,
      resourceCostReduction: cost.resourceCostReduction,
      discountSourcePieceId: cost.discountSourcePieceId,
      paymentResultHash: payment.resultHash,
      exhaustedCardInstanceIds: payment.selectedCardsExhaustOnCommit,
      trainingTruth: false });
  } else if (route?.sourceKind === "card_feature") {
    const card = cardById(state, plan.sideKey, plan.sourceInstanceId);
    if (!card || card.readiness !== "ready") fail("UNIT_LIFECYCLE_SOURCE_CARD_NOT_READY");
    card.readiness = "exhausted";
    events.push({ type: "tactical_card_exhausted", cardInstanceId: card.cardInstanceId,
      trainingTruth: false });
  }
  consumeOfficialUnitAbilityModifiersV1(state, cost, { definitionId: route.definitionId, planHash: plan.planHash }, events);
}
function returnToReserves(state, piece, reason, events) {
  if (projectOfficialUnitRestrictionsV1(state, piece.id).cannotReturnToReserves) {
    fail('UNIT_RESTRICTION_RESERVE_RETURN_PROHIBITED', piece.id);
  }
  piece.isOnField = false; piece.isInReserves = true; piece.deploymentStatus = "in_reserves";
  for (const model of piece.models || []) {
    if (model.isDestroyed !== true) model.isOnField = false;
    delete model.xInches; delete model.yInches;
  }
  const battlefieldAssets = [...(state.board.tokens || []), ...(state.board.markers || [])];
  const removedAssets = (state.officialBattlefieldAssetBindings || []).filter((entry) => {
    const asset = battlefieldAssets.find((candidate) => String(
      candidate.tokenId || candidate.markerId || candidate.id) === entry.assetId);
    return entry.sourcePieceId === piece.id && asset?.stayInPlay !== true;
  }).map((entry) => entry.assetId);
  state.board.tokens = (state.board.tokens || []).filter((entry) => !removedAssets.includes(
    String(entry.tokenId || entry.id)));
  state.board.markers = (state.board.markers || []).filter((entry) => !removedAssets.includes(
    String(entry.markerId || entry.id)));
  state.officialBattlefieldAssetBindings = (state.officialBattlefieldAssetBindings || [])
    .filter((entry) => !removedAssets.includes(entry.assetId));
  events.push({ type: "unit_returned_to_reserves", pieceId: piece.id,
    currentSupplyReleased: Number(piece.currentSupply), reason,
    equipmentDamageAndTimedEffectsRetained: true, removedAssetIds: removedAssets,
    trainingTruth: false });
}
function addPlacedPiece(state, pieceInput, placementPlan, options, events) {
  const resolution = placementResolution(state, pieceInput, placementPlan, options);
  const placed = resolution.piece;
  placed.isOnField = true; placed.isInReserves = false;
  placed.deploymentStatus = "deployed_by_special_ability";
  state.pieces = state.pieces.filter((entry) => entry.id !== placed.id).concat(placed);
  events.push({ type: "special_unit_deployed", pieceId: placed.id,
    recordKey: placed.officialUnitRecordKey, modelIds: liveModels(placed).map((entry) => entry.id),
    ...(resolution.friendlyRangeProof ? { friendlyRangeProof: resolution.friendlyRangeProof } : {}),
    trainingTruth: false });
  return placed;
}
function setPlacementOptions(route, actor) {
  return route.friendlyAnchorCasterOnly ? { ...route, friendlyAnchorPieceId: actor.id } : route;
}
function applyPrimary(state, route, action, events) {
  const plan = action.unitLifecyclePlan;
  const parameters = plan.canonicalParameters;
  const actor = state.pieces.find((entry) => entry.id === action.pieceId);
  if (route.effectKind === "set_special_unit") {
    const piece = makeSpecialPiece(state, action.sideKey, route.createdUnitRecordKey,
      parameters.createdPieceId);
    const placed = addPlacedPiece(state, piece, parameters.placementPlan, setPlacementOptions(route, actor), events);
    placed.specialDeployment = true;
    placed.specialDeploymentSourceDefinitionId = route.definitionId;
    if (route.friendlyAnchorCasterOnly) placed.specialDeploymentSourcePieceId = actor.id;
    placed.specialAbilitiesSuppressedUntilRoundEnd = route.suppressSpecialAbilitiesThisRound;
    placed.removeAtRoundEnd = route.removeAtRoundEnd;
  } else if (route.effectKind === 'summon_unit') {
    const piece = makeSpecialPiece(state, action.sideKey, route.createdUnitRecordKey, parameters.createdPieceId);
    const patch = parameters.summonResolution.mutation.piecePatches[0];
    if (hashStarcraftTmgContract(piece) !== patch.expectedBeforePieceHash) fail('UNIT_LIFECYCLE_SUMMON_PRECONDITION_DRIFT');
    Object.assign(piece, clone(patch.set));
    piece.summonSourceDefinitionId = route.definitionId;
    piece.lastLeadingModelId = parameters.placementPlan.leadingModelId;
    const leadingModel = piece.models.find(model => model.id === piece.lastLeadingModelId);
    piece.xInches = leadingModel.xInches;
    piece.yInches = leadingModel.yInches;
    piece.inCoherency = true;
    piece.coherencyStatus = { schemaVersion: 'starcraft_tmg_unit_coherency_status_v1',
      status: 'in_coherency', isOutOfCoherency: false, derivedFromSummon: true };
    state.pieces.push(piece);
    state.officialRoundSupplyState = refreshOfficialRoundSupplyOccupancyV1({ state });
    events.push(parameters.triggerEvent, { type: 'summoned_unit_deployed', sideKey: action.sideKey,
      pieceId: piece.id, parentPieceId: actor.id, sourceDefinitionId: route.definitionId,
      summonResolutionHash: parameters.summonResolution.resultHash, immediateOptionalMove: route.immediateOptionalMove,
      trainingTruth: false });
  } else if (route.effectKind === "summon_roachling") {
    const piece = makeSpecialPiece(state, action.sideKey, route.createdUnitRecordKey,
      parameters.createdPieceId);
    const placed = addPlacedPiece(state, piece, parameters.placementPlan, {
      anchorPieceId: actor.id, anchorContactModelId: parameters.parentContactModelId,
    }, events);
    placed.isSummoned = true; placed.summonParentPieceId = actor.id;
    placed.summonedInRound = Number(state.round); placed.summonedInPhase = state.phase;
    placed.activatedPhases[state.phase] = true;
  } else if (route.effectKind === "morph_model") {
    const resolution = parameters.morphResolution;
    const patch = resolution.mutation.sourcePiecePatch;
    if (hashStarcraftTmgContract(actor) !== patch.expectedBeforePieceHash) fail("MORPH_SOURCE_PRECONDITION_DRIFT");
    Object.assign(actor, clone(patch.set));
    const piece = clone(resolution.mutation.createdPiece);
    state.pieces.push(piece);
    events.push({ type: "model_morphed", sideKey: actor.sideKey, pieceId: actor.id,
      sourceDefinitionId: route.definitionId, sourceModelId: resolution.removedModelId, createdPieceId: piece.id,
      createdRecordKey: piece.officialUnitRecordKey, sourceSupplyBefore: resolution.sourceSupplyBefore,
      sourceSupplyAfter: resolution.sourceSupplyAfter, createdSupply: resolution.createdSupply,
      enemyKillCredit: 0, sourceRemovalCause: "morph", resolutionHash: resolution.resultHash, trainingTruth: false });
  } else if (route.effectKind === "respawn_models") {
    const patch = parameters.respawnResolution.mutation.piecePatches[0];
    if (hashStarcraftTmgContract(actor) !== patch.expectedBeforePieceHash) {
      const adjusted = clone(actor);
      adjusted.derivedKeywords = respawnKeywords(state, actor, route);
      if (hashStarcraftTmgContract(adjusted) !== patch.expectedBeforePieceHash) {
        fail("UNIT_LIFECYCLE_RESPAWN_PRECONDITION_DRIFT");
      }
    }
    Object.assign(actor, clone(patch.set));
    events.push(parameters.triggerEvent, { type: "models_respawned", pieceId: actor.id,
      returnedModelIds: parameters.respawnResolution.returnedModelIds,
      onCreep: parameters.respawnResolution.onCreep,
      resolutionHash: parameters.respawnResolution.resultHash, trainingTruth: false });
  } else if (route.effectKind === "return_active_ground_to_reserves") {
    actor.activatedPhases[state.phase] = true;
    returnToReserves(state, actor, route.abilityName, events);
  } else if (route.effectKind === "phase_prism_swap") {
    const target = state.pieces.find((entry) => entry.id === parameters.targetUnitId);
    returnToReserves(state, target, "Phase Prism", events);
    const placed = addPlacedPiece(state, actor, parameters.placementPlan, {}, events);
    placed.activatedPhases[state.phase] = true;
  } else if (route.effectKind === "mass_recall") {
    const coordinate = validateMassRecallPoint(state, parameters.coordinate);
    const markerId = `marker:${state.round}:mass-recall:${state.board.markers.length + 1}`;
    const marker = createOfficialBattlefieldMarkerV1({
      registry: state.officialBattlefieldTokenMarkerRegistry,
      markerId, markerKind: "faction_indicator", markerRole: "mass_recall",
      coordinate, sideKey: action.sideKey, stayInPlay: false,
    });
    state.board.markers.push(marker);
    const returned = [];
    for (const piece of (state.pieces || []).filter((entry) => entry.sideKey === action.sideKey
      && activePiece(entry) && combatProfile(state, entry.officialUnitRecordKey).faction === "Protoss")) {
      const within = liveModels(piece).some((model) => {
        const radius = Math.max(Number(model.baseWidthInches),
          Number(model.baseDepthInches)) / 2;
        return Math.max(0, Math.hypot(Number(model.xInches) - coordinate.x,
          Number(model.yInches) - coordinate.y) - radius) <= route.rangeMilliInches / 1000;
      });
      if (within) { returnToReserves(state, piece, "Mass Recall", events); returned.push(piece.id); }
    }
    events.push({ type: "mass_recall_resolved", markerId,
      returnedPieceIds: returned.sort(), trainingTruth: false });
  } else if (route.effectKind === "spawn_creep_tumor") {
    const planValue = tumorPlan(state, actor, parameters.coordinate);
    const prefix = `asset:${state.round}:creep-tumor:`;
    let ordinal = state.board.tokens.length + 1;
    if (["current_release_queen_creep_tumor_subset", raidersLifecycleScope, omegaNetworkScope, roachlingLifecycleScope,
      pylonLifecycleScope, vilelingLifecycleScope, cocoonSharedLifecycleScope, moundLifecycleScope]
      .includes(state.officialUnitLifecycleFamilySourceBundle?.compilerScope)) {
      const usedIds = new Set([...state.board.tokens.map(row => row.tokenId),
        ...(state.officialBattlefieldAssetBindings || []).map(row => row.assetId)]);
      while (usedIds.has(prefix + ordinal)) ordinal += 1;
    }
    const tokenId = prefix + ordinal;
    const stayInPlay = resolveOfficialCurrentProductSideCapabilityV1(state, {
      sideKey: action.sideKey,
      capability: "creep_tumor_stay_in_play_and_displacement",
    }).enabled;
    const token = createOfficialBattlefieldTokenV1({
      registry: state.officialBattlefieldTokenMarkerRegistry,
      tokenId, tokenKind: "creep_tumor", coordinate: planValue.coordinate,
      baseShape: "round", baseDiameterMm: planValue.profile.baseDiameterMm,
      stayInPlay, createdByPieceId: actor.id, createdRound: state.round,
    });
    state.board.tokens.push(token);
    const binding = seal({
      schema: "starcraft_tmg_official_battlefield_asset_binding_v1",
      assetId: tokenId, assetKind: "creep_tumor", assetSchema: token.schema,
      assetHash: token.tokenHash, sideKey: action.sideKey, sourcePieceId: actor.id,
      sourceInstanceId: plan.sourceInstanceId, sourceDefinitionId: route.definitionId,
      sourceFeatureHash: route.sourceFeatureHash, effectKind: route.effectKind,
      createdRound: Number(state.round), displacement: stayInPlay, stayInPlay,
      lifecycleEvent: null, consumed: false, trainingTruth: false,
    }, "bindingHash");
    state.officialBattlefieldAssetBindings = state.officialBattlefieldAssetBindings || [];
    state.officialBattlefieldAssetBindings.push(binding);
    events.push({ type: "battlefield_asset_created", assetId: tokenId,
      assetKind: "creep_tumor", assetHash: token.tokenHash,
      bindingHash: binding.bindingHash, coordinate: planValue.coordinate,
      trainingTruth: false });
  }
}
function applyConsumer(state, action, events) {
  const plan = action.unitLifecyclePlan;
  const target = state.pieces.find((entry) => entry.id === action.pieceId);
  const source = state.pieces.find((entry) => entry.id === plan.sourceInstanceId);
  if (["omega_network_return"].includes(action.effectKind)) {
    returnToReserves(state, target, "Omega Network", events);
    return;
  }
  if (action.effectKind === "shade_round_end_place") {
    const placement = shadePlacementResolution(state, target,
      plan.canonicalParameters.placementPlan, plan.sourceInstanceId).piece;
    state.pieces = state.pieces.map((entry) => entry.id === target.id ? placement : entry);
    state.pendingBattlefieldAssetOpportunities = (state.pendingBattlefieldAssetOpportunities || [])
      .filter((entry) => entry.opportunityId !== plan.domainConstraints?.opportunityId);
    events.push({ type: "shade_round_end_place_resolved", pieceId: target.id,
      assetId: plan.sourceInstanceId, trainingTruth: false });
    return;
  }
  let placed;
  if (action.effectKind === "reserve_indicator_deploy") {
    placed = placementResolution(state, target,
      plan.canonicalParameters.placementPlan, {}).piece;
    state.pendingBattlefieldAssetOpportunities = (state.pendingBattlefieldAssetOpportunities || [])
      .filter((entry) => entry.opportunityId !== plan.domainConstraints?.opportunityId);
  } else {
    if (!source) fail("UNIT_LIFECYCLE_ENTRY_SOURCE_MISSING");
    placed = placementResolution(state, target,
      plan.canonicalParameters.placementPlan, {
        anchorPieceId: source.id,
        anchorContactModelId: plan.canonicalParameters.sourceContactModelId,
      }).piece;
  }
  placed.isOnField = true; placed.isInReserves = false;
  placed.deploymentStatus = "deployed_by_lifecycle_consumer";
  placed.activatedPhases[state.phase] = true;
  state.pieces = state.pieces.map((entry) => entry.id === target.id ? placed : entry);
  events.push({ type: "reserve_deployed_via_special_entry", pieceId: target.id,
    sourcePieceId: source?.id || null, sourceAssetId: source ? null : plan.sourceInstanceId,
    effectKind: action.effectKind,
    currentSupply: Number(target.currentSupply), trainingTruth: false });
}
function apply(bundle, stateInput, request = {}) {
  const action = request.action;
  const domain = enumerate(bundle, stateInput, { sideKey: action?.sideKey,
    includeDisabled: true }).parameterDomains.find((entry) => (
    entry.domainId === action?.unitLifecyclePlan?.domainId));
  if (!domain) fail("UNIT_LIFECYCLE_PARAMETER_DOMAIN_STALE");
  const expected = instantiate(bundle, stateInput, domain,
    action.unitLifecyclePlan.canonicalParameters);
  if (!isDeepStrictEqual(expected.action, action)) fail("UNIT_LIFECYCLE_ACTION_STALE");
  const route = bundle.routes.find((entry) => entry.definitionId === action.definitionId);
  const state = clone(stateInput); const events = [];
  pay(state, route, action.unitLifecyclePlan, events);
  if (route && ACTIVE_EFFECTS.has(route.effectKind)) applyPrimary(state, route, action, events);
  else applyConsumer(state, action, events);
  if (bundle.schema === 'starcraft_tmg_official_unit_lifecycle_family_source_bundle_v2') {
    const actor = state.pieces.find(row => row.id === action.pieceId);
    const omegaReturn = supportsScopedOmegaNetwork(bundle) && action.effectKind === 'omega_network_return';
    if (omegaReturn || (['morph_model', 'return_active_ground_to_reserves'].includes(route?.effectKind) && !activePiece(actor))) {
      if (omegaReturn || isCurrentDropshipReturn(bundle, route) || isFormalTunnelReturn(state, route)) {
        const reserve = state.reserveManifestBySide?.[action.sideKey]?.find(row => row.pieceId === actor.id);
        if (reserve) reserve.deploymentStatus = 'in_reserves';
        if (state.officialRoundSupplyState) state.officialRoundSupplyState = refreshOfficialRoundSupplyOccupancyV1({ state });
      }
      actor.activatedPhases[state.phase] = true;
      actor.officialAbilityEffects = (actor.officialAbilityEffects || []).filter(row => row.expiresAt !== 'activation_end');
      if (state.selectedRosterActivationWindow?.pieceId === actor.id) delete state.selectedRosterActivationWindow;
      alternateOfficialPhaseActivationV1(state, action.sideKey, state.phase);
      events.push({ type: 'unit_activation_finished', sideKey: action.sideKey, pieceId: actor.id, phase: state.phase,
        reason: route.effectKind === 'morph_model' ? 'source_fully_morphed' : 'source_returned_to_reserves', trainingTruth: false });
    } else openOfficialSelectedRosterSpecialAbilityWindowV1(state, action.sideKey, action.pieceId, state.phase);
  }
  state.unitLifecycleUseHistory = state.unitLifecycleUseHistory || [];
  state.unitLifecycleUseHistory.push({ round: Number(state.round), phase: state.phase,
    sideKey: action.sideKey, pieceId: action.pieceId,
    definitionId: action.definitionId,
    sourceInstanceId: action.unitLifecyclePlan.sourceInstanceId,
    effectKind: action.effectKind,
    currentSupply: Number(state.pieces.find((entry) => entry.id === action.pieceId)
      ?.currentSupply || 0),
    planHash: action.unitLifecyclePlan.planHash, trainingTruth: false });
  state.log = state.log || [];
  state.log.push({ id: `log-${state.log.length + 1}`, round: Number(state.round),
    phase: state.phase, action: clone(action), events: clone(events) });
  return freezeDeep({ ok: true,
    schema: "starcraft_tmg_official_unit_lifecycle_transition_v1",
    runtimeId: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_VERSION,
    postRevision: Number(request.options?.postRevision || 0),
    state: freezeDeep(state), action: clone(action), events,
    rulesTruth: "official_current_product_unit_lifecycle_transition",
    trainingTruth: false });
}
function lifecycle(bundle, stateInput, request = {}) {
  const eventKind = String(request.eventKind || "");
  if (!["round_end", "cleanup_and_refresh"].includes(eventKind)) return null;
  const state = clone(stateInput); const events = [];
  if (eventKind === "round_end") {
    for (const piece of state.pieces || []) {
      if (bundle.schema === 'starcraft_tmg_official_unit_lifecycle_family_source_bundle_v2'
        && !bundle.definitionIds.includes(piece.specialDeploymentSourceDefinitionId)) continue;
      if (activePiece(piece) && piece.removeAtRoundEnd === true) {
        piece.isOnField = false; piece.isInReserves = false; piece.isDestroyed = true;
        piece.currentModels = 0; piece.currentSupply = 0;
        if (piece.specialDeploymentSourceDefinitionId === OFFICIAL_GRIFFIN_SUPPORT_DEFINITION_ID) {
          piece.destroyedModelIds = piece.models.map(model => model.id).sort();
        }
        for (const model of piece.models || []) {
          model.isOnField = false; model.isDestroyed = true; model.remainingWounds = 0;
        }
        events.push({ type: "special_unit_removed_at_round_end", pieceId: piece.id,
          trainingTruth: false });
      }
      if (piece.specialAbilitiesSuppressedUntilRoundEnd === true) {
        piece.specialAbilitiesSuppressedUntilRoundEnd = false;
        events.push({ type: "special_unit_abilities_restored", pieceId: piece.id,
          structureAbilityRemainedActive: true, trainingTruth: false });
      }
    }
  }
  if (eventKind === "cleanup_and_refresh" && bundle.schema === OFFICIAL_UNIT_LIFECYCLE_FAMILY_BUNDLE_SCHEMA) {
    state.pendingBattlefieldAssetOpportunities = [];
  }
  if (events.length === 0) return state;
  state.unitLifecycleHistory = state.unitLifecycleHistory || [];
  state.unitLifecycleHistory.push({ round: Number(state.round), phase: state.phase,
    eventKind, events: clone(events), trainingTruth: false });
  state.log = state.log || [];
  state.log.push({ id: `log-${state.log.length + 1}`, round: Number(state.round),
    phase: state.phase, action: { actionType: "unit_lifecycle", eventKind },
    events: clone(events) });
  return state;
}
function query(bundle, state, request = {}) {
  const queryKind = String(request.queryKind || request.kind || "");
  let result;
  if (queryKind === "instantiate_parameterized_action") {
    const domain = enumerate(bundle, state, { sideKey: request.sideKey
      || state.activeSideKey, includeDisabled: true }).parameterDomains.find((entry) => (
      entry.domainId === request.domainId));
    if (!domain) fail("UNIT_LIFECYCLE_QUERY_DOMAIN_STALE");
    const value = preview(bundle, state, { domain, parameters: request.parameters || {} });
    result = { preview: value, action: value.action };
  } else if (queryKind === "definition_routes") {
    result = { routes: clone(bundle.routes), routeCount: bundle.routeCount };
  } else if (queryKind === "reserve_inventory") {
    result = { bySide: Object.fromEntries([...SIDE_KEYS].map((sideKey) => [sideKey,
      (state.pieces || []).filter((piece) => piece.sideKey === sideKey && reservePiece(piece))
        .map((piece) => ({ pieceId: piece.id, recordKey: piece.officialUnitRecordKey,
          currentModels: piece.currentModels, currentSupply: piece.currentSupply,
          retainedDamage: piece.damageMarker || 0 })).sort((left, right) => (
          left.pieceId.localeCompare(right.pieceId)))])),
      pendingOpportunities: clone(state.pendingBattlefieldAssetOpportunities || []) };
  } else fail("UNIT_LIFECYCLE_QUERY_KIND_UNSUPPORTED", queryKind);
  return seal({ schema: "starcraft_tmg_official_unit_lifecycle_query_v1",
    semanticVersion: "1.0.0", queryKind, precision: "exact", result,
    source: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_ID,
    rulesAuthority: true, mutationAuthority: false,
    sourceRefreshPerformed: false, trainingTruth: false }, "queryReceiptHash");
}

export function createOfficialUnitLifecycleFamilyAdapterV1(bundle) {
  verifyOfficialUnitLifecycleFamilySourceBundleV1(bundle);
  const descriptor = freezeDeep({
    adapterId: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_ID,
    adapterVersion: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_VERSION,
    adapterKind: "exact_runtime",
    coveredDefinitionCount: bundle.routeCount,
    coveredSourceFeatureHashes: [...bundle.coveredSourceFeatureHashes],
    supportedOperations: ["legal_space", "preview", "apply", "query", "lifecycle"],
    archetypeCounts: { ...bundle.archetypeCounts },
    sourceBundleHash: bundle.bundleHash,
    completeModelDenominatorsRequired: true,
    fullBaseGeometryAndCoherencyOwnedByRules: true,
    reserveStateRetainsDamageLoadoutAndTimedEffects: true,
    optionalCrossFamilyLifecycleOpportunitiesExposed: bundle.schema === OFFICIAL_UNIT_LIFECYCLE_FAMILY_BUNDLE_SCHEMA,
    legalSpacePreviewApplyReplaySequencePreserved: true,
    rulesAuthority: true, trainingTruth: false,
  });
  return freezeDeep({ descriptor,
    legalSpace: (state, options = {}) => enumerate(bundle, state, options),
    preview: (state, request = {}) => preview(bundle, state, request),
    apply: (state, request = {}) => apply(bundle, state, request),
    query: (state, request = {}) => query(bundle, state, request),
    lifecycle: (state, request = {}) => lifecycle(bundle, state, request),
  });
}
