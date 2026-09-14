import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialAbilityEffectIrCatalogueV1 } from
  "../source-data/official-ability-effect-ir-v1.mjs";
import {
  createOfficialAbilityEffectRuntimeV1,
  createOfficialSelectedRosterAbilityAdapterV1,
  createOfficialSelectedRosterAbilityDefinitionBindingsV1,
  verifyOfficialAbilityEffectRuntimeDescriptorV1,
} from "./official-ability-effect-runtime-v1.mjs";
import {
  createOfficialBattlefieldAssetFamilyAdapterV1,
  createOfficialBattlefieldAssetFamilyDefinitionBindingsV1,
  createOfficialBattlefieldAssetFamilySourceBundleV1,
  verifyOfficialBattlefieldAssetFamilySourceBundleV1,
} from "./official-battlefield-asset-family-adapter-v1.mjs";
import {
  createOfficialCharacteristicStatusFamilyAdapterV1,
  createOfficialCharacteristicStatusFamilyDefinitionBindingsV1,
  createOfficialCharacteristicStatusFamilySourceBundleV1,
  verifyOfficialCharacteristicStatusFamilySourceBundleV1,
} from "./official-characteristic-status-family-adapter-v1.mjs";
import {
  createOfficialCurrentProductAbilityCoverageReleaseV1,
  verifyOfficialCurrentProductAbilityCoverageReleaseV1,
} from "./official-current-product-ability-coverage-release-v1.mjs";
import {
  createOfficialCurrentProductAbilityDenominatorV1,
  verifyOfficialCurrentProductAbilityDenominatorV1,
} from "./official-current-product-ability-denominator-v1.mjs";
import {
  createOfficialMatchLifecycleFamilyAdapterV1,
  createOfficialMatchLifecycleFamilyDefinitionBindingsV1,
  createOfficialMatchLifecycleFamilySourceBundleV1,
  verifyOfficialMatchLifecycleFamilySourceBundleV1,
} from "./official-match-lifecycle-family-adapter-v1.mjs";
import {
  createOfficialMeleeFamilyAdapterV1,
  createOfficialMeleeFamilyDefinitionBindingsV1,
  createOfficialMeleeFamilySourceBundleV1,
  verifyOfficialMeleeFamilySourceBundleV1,
} from "./official-melee-family-adapter-v1.mjs";
import {
  createOfficialProtossUniqueFamilyAdapterV1,
  createOfficialProtossUniqueFamilyDefinitionBindingsV1,
  createOfficialProtossUniqueFamilySourceBundleV1,
  verifyOfficialProtossUniqueFamilySourceBundleV1,
} from "./official-protoss-unique-family-adapter-v1.mjs";
import {
  createOfficialRangedFamilyAdapterV1,
  createOfficialRangedFamilyDefinitionBindingsV1,
  createOfficialRangedFamilySourceBundleV1,
  verifyOfficialRangedFamilySourceBundleV1,
} from "./official-ranged-family-adapter-v1.mjs";
import {
  createOfficialReactionFamilyAdapterV1,
  createOfficialReactionFamilyDefinitionBindingsV1,
  createOfficialReactionFamilySourceBundleV1,
  verifyOfficialReactionFamilySourceBundleV1,
} from "./official-reaction-family-adapter-v1.mjs";
import {
  createOfficialRelocationFamilyAdapterV1,
  createOfficialRelocationFamilyDefinitionBindingsV1,
  createOfficialRelocationFamilySourceBundleV1,
  verifyOfficialRelocationFamilySourceBundleV1,
} from "./official-relocation-family-adapter-v1.mjs";
import {
  createOfficialSelectedRosterAbilityRuntimeV1,
  createOfficialSelectedRosterAbilitySourceBundleV1,
  verifyOfficialSelectedRosterAbilityRuntimeDescriptorV1,
} from "./official-selected-roster-ability-runtime-v1.mjs";
import {
  createOfficialSelectedRosterMeleeActionRuntimeV1,
  verifyOfficialSelectedRosterMeleeRuntimeDescriptorV1,
} from "./official-selected-roster-melee-action-runtime-v1.mjs";
import {
  createOfficialSelectedRosterRangedActionRuntimeV1,
  verifyOfficialSelectedRosterRangedRuntimeDescriptorV1,
} from "./official-selected-roster-ranged-action-runtime-v1.mjs";
import {
  createOfficialSelectedRosterSpatialActionRuntimeV1,
  verifyOfficialSelectedRosterSpatialRuntimeDescriptorV1,
} from "./official-selected-roster-spatial-action-runtime-v1.mjs";
import {
  createOfficialTerranUniqueFamilyAdapterV1,
  createOfficialTerranUniqueFamilyDefinitionBindingsV1,
  createOfficialTerranUniqueFamilySourceBundleV1,
  verifyOfficialTerranUniqueFamilySourceBundleV1,
} from "./official-terran-unique-family-adapter-v1.mjs";
import {
  createOfficialUnitLifecycleFamilyAdapterV1,
  createOfficialUnitLifecycleFamilyDefinitionBindingsV1,
  createOfficialUnitLifecycleFamilySourceBundleV1,
  verifyOfficialUnitLifecycleFamilySourceBundleV1,
} from "./official-unit-lifecycle-family-adapter-v1.mjs";
import {
  createOfficialZergUniqueFamilyAdapterV1,
  createOfficialZergUniqueFamilyDefinitionBindingsV1,
  createOfficialZergUniqueFamilySourceBundleV1,
  verifyOfficialZergUniqueFamilySourceBundleV1,
} from "./official-zerg-unique-family-adapter-v1.mjs";

export const OFFICIAL_CURRENT_PRODUCT_ACTION_RUNTIME_COMPOSITION_SCHEMA =
  "starcraft_tmg_official_current_product_action_runtime_composition_v1";
export const OFFICIAL_CURRENT_PRODUCT_ACTION_RUNTIME_COMPOSITION_VERSION = "1.0.0";

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function catalogue(dataset, bindings) {
  return createOfficialAbilityEffectIrCatalogueV1({
    dataset, executionBindings: bindings,
  });
}
function denominator(sourceCatalogue) {
  return createOfficialCurrentProductAbilityDenominatorV1({
    catalogue: sourceCatalogue,
  });
}
function bindingStage(dataset, bindings, createBundle, options = {}) {
  const baselineCatalogue = catalogue(dataset, bindings);
  const baselineDenominator = denominator(baselineCatalogue);
  const bundle = createBundle({
    catalogue: baselineCatalogue,
    denominator: baselineDenominator,
    ...options,
  });
  return { bundle, catalogue: baselineCatalogue, denominator: baselineDenominator };
}

function evidenceFor(state) {
  const body = {
    schema: OFFICIAL_CURRENT_PRODUCT_ACTION_RUNTIME_COMPOSITION_SCHEMA,
    semanticVersion: OFFICIAL_CURRENT_PRODUCT_ACTION_RUNTIME_COMPOSITION_VERSION,
    selectedUnitCount: state.pieces.length,
    spatialRuntimeHash: state.officialSelectedRosterSpatialRuntimeDescriptor.runtimeHash,
    rangedRuntimeHash: state.officialSelectedRosterRangedRuntimeDescriptor.runtimeHash,
    meleeRuntimeHash: state.officialSelectedRosterMeleeRuntimeDescriptor.runtimeHash,
    selectedAbilityRuntimeHash:
      state.officialSelectedRosterAbilityRuntimeDescriptor.runtimeHash,
    abilityCatalogueHash: state.officialAbilityEffectIrCatalogue.catalogueHash,
    abilityRuntimeHash: state.officialAbilityEffectRuntimeDescriptor.runtimeHash,
    abilityDenominatorHash: state.officialCurrentProductAbilityDenominator.denominatorHash,
    abilityCoverageReleaseHash:
      state.officialCurrentProductAbilityCoverageRelease.releaseHash,
    exactDefinitionCount:
      state.officialCurrentProductAbilityDenominator.summary.executableExact,
    pendingDefinitionCount:
      state.officialCurrentProductAbilityDenominator.summary.pendingFamilyAdapter,
    unsupportedDefinitionCount: 0,
    sourceRefreshPerformed: false,
    rulesTruth: "official_current_product_action_runtime_composition",
    trainingTruth: false,
  };
  return Object.freeze({ ...body,
    compositionHash: hashStarcraftTmgContract(body) });
}

export function composeOfficialCurrentProductActionRuntimeV1(input = {}) {
  const dataset = input.dataset;
  const state = input.state;
  if (!object(dataset) || !object(state) || !Array.isArray(state.pieces)
    || state.pieces.length < 1) {
    fail("CURRENT_PRODUCT_ACTION_RUNTIME_COMPOSITION_INPUT_INVALID");
  }

  const spatialRuntime = createOfficialSelectedRosterSpatialActionRuntimeV1(state);
  state.officialSelectedRosterSpatialRuntimeDescriptor = spatialRuntime.descriptor;
  const rangedRuntime = createOfficialSelectedRosterRangedActionRuntimeV1(state);
  state.officialSelectedRosterRangedRuntimeDescriptor = rangedRuntime.descriptor;
  const meleeRuntime = createOfficialSelectedRosterMeleeActionRuntimeV1(state);
  state.officialSelectedRosterMeleeRuntimeDescriptor = meleeRuntime.descriptor;

  state.officialSelectedRosterAbilitySourceBundle =
    createOfficialSelectedRosterAbilitySourceBundleV1({ dataset, state });
  const selectedAbilityRuntime = createOfficialSelectedRosterAbilityRuntimeV1(state);
  state.officialSelectedRosterAbilityRuntimeDescriptor =
    selectedAbilityRuntime.descriptor;
  const selectedBindings = createOfficialSelectedRosterAbilityDefinitionBindingsV1(
    state.officialSelectedRosterAbilitySourceBundle,
  );

  const relocation = bindingStage(dataset, selectedBindings,
    createOfficialRelocationFamilySourceBundleV1);
  state.officialRelocationFamilySourceBundle = relocation.bundle;
  const relocationBindings = createOfficialRelocationFamilyDefinitionBindingsV1(
    relocation.bundle,
  );

  const characteristic = bindingStage(dataset,
    [...selectedBindings, ...relocationBindings],
    createOfficialCharacteristicStatusFamilySourceBundleV1);
  state.officialCharacteristicStatusFamilySourceBundle = characteristic.bundle;
  const characteristicBindings =
    createOfficialCharacteristicStatusFamilyDefinitionBindingsV1(characteristic.bundle);

  const ranged = bindingStage(dataset,
    [...selectedBindings, ...relocationBindings, ...characteristicBindings],
    createOfficialRangedFamilySourceBundleV1,
    { attackProfileCatalogue: state.officialAttackProfileCatalogue });
  state.officialRangedFamilySourceBundle = ranged.bundle;
  const rangedBindings = createOfficialRangedFamilyDefinitionBindingsV1(ranged.bundle);

  const melee = bindingStage(dataset,
    [...selectedBindings, ...relocationBindings, ...characteristicBindings,
      ...rangedBindings], createOfficialMeleeFamilySourceBundleV1,
    { attackProfileCatalogueV2: state.officialAttackProfileCatalogueV2 });
  state.officialMeleeFamilySourceBundle = melee.bundle;
  const meleeBindings = createOfficialMeleeFamilyDefinitionBindingsV1(melee.bundle);

  const reaction = bindingStage(dataset,
    [...selectedBindings, ...relocationBindings, ...characteristicBindings,
      ...rangedBindings, ...meleeBindings], createOfficialReactionFamilySourceBundleV1);
  state.officialReactionFamilySourceBundle = reaction.bundle;
  const reactionBindings = createOfficialReactionFamilyDefinitionBindingsV1(
    reaction.bundle,
  );

  const battlefield = bindingStage(dataset,
    [...selectedBindings, ...relocationBindings, ...characteristicBindings,
      ...rangedBindings, ...meleeBindings, ...reactionBindings],
    createOfficialBattlefieldAssetFamilySourceBundleV1);
  state.officialBattlefieldAssetFamilySourceBundle = battlefield.bundle;
  const battlefieldBindings = createOfficialBattlefieldAssetFamilyDefinitionBindingsV1(
    battlefield.bundle,
  );

  const unitLifecycle = bindingStage(dataset,
    [...selectedBindings, ...relocationBindings, ...characteristicBindings,
      ...rangedBindings, ...meleeBindings, ...reactionBindings,
      ...battlefieldBindings], createOfficialUnitLifecycleFamilySourceBundleV1,
    { summonDataBundle: state.officialSummonDataBundle,
      respawnMorphDataBundle: state.officialRespawnMorphDataBundle });
  state.officialUnitLifecycleFamilySourceBundle = unitLifecycle.bundle;
  const unitLifecycleBindings = createOfficialUnitLifecycleFamilyDefinitionBindingsV1(
    unitLifecycle.bundle,
  );

  const matchLifecycle = bindingStage(dataset,
    [...selectedBindings, ...relocationBindings, ...characteristicBindings,
      ...rangedBindings, ...meleeBindings, ...reactionBindings,
      ...battlefieldBindings, ...unitLifecycleBindings],
    createOfficialMatchLifecycleFamilySourceBundleV1);
  state.officialMatchLifecycleFamilySourceBundle = matchLifecycle.bundle;
  const matchLifecycleBindings = createOfficialMatchLifecycleFamilyDefinitionBindingsV1(
    matchLifecycle.bundle,
  );

  const terran = bindingStage(dataset,
    [...selectedBindings, ...relocationBindings, ...characteristicBindings,
      ...rangedBindings, ...meleeBindings, ...reactionBindings,
      ...battlefieldBindings, ...unitLifecycleBindings, ...matchLifecycleBindings],
    createOfficialTerranUniqueFamilySourceBundleV1);
  state.officialTerranUniqueFamilySourceBundle = terran.bundle;
  const terranBindings = createOfficialTerranUniqueFamilyDefinitionBindingsV1(
    terran.bundle,
  );

  const zerg = bindingStage(dataset,
    [...selectedBindings, ...relocationBindings, ...characteristicBindings,
      ...rangedBindings, ...meleeBindings, ...reactionBindings,
      ...battlefieldBindings, ...unitLifecycleBindings, ...matchLifecycleBindings,
      ...terranBindings], createOfficialZergUniqueFamilySourceBundleV1);
  state.officialZergUniqueFamilySourceBundle = zerg.bundle;
  const zergBindings = createOfficialZergUniqueFamilyDefinitionBindingsV1(zerg.bundle);

  const protoss = bindingStage(dataset,
    [...selectedBindings, ...relocationBindings, ...characteristicBindings,
      ...rangedBindings, ...meleeBindings, ...reactionBindings,
      ...battlefieldBindings, ...unitLifecycleBindings, ...matchLifecycleBindings,
      ...terranBindings, ...zergBindings],
    createOfficialProtossUniqueFamilySourceBundleV1);
  state.officialProtossUniqueFamilySourceBundle = protoss.bundle;
  const protossBindings = createOfficialProtossUniqueFamilyDefinitionBindingsV1(
    protoss.bundle,
  );
  state.officialContextualSupplyModifierRoutes = [
    ...terran.bundle.routes,
    ...protoss.bundle.routes.filter((route) => (
      route.effectKind === "commander_supply_bonus")),
  ];

  const allBindings = [...selectedBindings, ...relocationBindings,
    ...characteristicBindings, ...rangedBindings, ...meleeBindings,
    ...reactionBindings, ...battlefieldBindings, ...unitLifecycleBindings,
    ...matchLifecycleBindings, ...terranBindings, ...zergBindings,
    ...protossBindings];
  state.officialAbilityEffectIrCatalogue = catalogue(dataset, allBindings);
  const abilityRuntime = createOfficialAbilityEffectRuntimeV1({
    catalogue: state.officialAbilityEffectIrCatalogue,
    adapters: [
      createOfficialSelectedRosterAbilityAdapterV1(
        state.officialSelectedRosterAbilitySourceBundle),
      createOfficialRelocationFamilyAdapterV1(relocation.bundle),
      createOfficialCharacteristicStatusFamilyAdapterV1(characteristic.bundle),
      createOfficialRangedFamilyAdapterV1(ranged.bundle),
      createOfficialMeleeFamilyAdapterV1(melee.bundle),
      createOfficialReactionFamilyAdapterV1(reaction.bundle),
      createOfficialBattlefieldAssetFamilyAdapterV1(battlefield.bundle),
      createOfficialUnitLifecycleFamilyAdapterV1(unitLifecycle.bundle),
      createOfficialMatchLifecycleFamilyAdapterV1(matchLifecycle.bundle),
      createOfficialTerranUniqueFamilyAdapterV1(terran.bundle),
      createOfficialZergUniqueFamilyAdapterV1(zerg.bundle),
      createOfficialProtossUniqueFamilyAdapterV1(protoss.bundle),
    ],
  });
  state.officialAbilityEffectRuntimeDescriptor = abilityRuntime.descriptor;
  state.officialCurrentProductAbilityDenominator = denominator(
    state.officialAbilityEffectIrCatalogue,
  );
  state.officialCurrentProductAbilityCoverageRelease =
    createOfficialCurrentProductAbilityCoverageReleaseV1({
      catalogue: state.officialAbilityEffectIrCatalogue,
      denominator: state.officialCurrentProductAbilityDenominator,
      runtimeDescriptor: state.officialAbilityEffectRuntimeDescriptor,
    });
  const evidence = evidenceFor(state);
  return { state, evidence };
}

export function verifyOfficialCurrentProductActionRuntimeCompositionV1(state,
  evidence) {
  if (!object(state) || !object(evidence)
    || evidence.schema !== OFFICIAL_CURRENT_PRODUCT_ACTION_RUNTIME_COMPOSITION_SCHEMA
    || evidence.semanticVersion
      !== OFFICIAL_CURRENT_PRODUCT_ACTION_RUNTIME_COMPOSITION_VERSION
    || evidence.selectedUnitCount !== state.pieces?.length
    || evidence.exactDefinitionCount !== 252
    || evidence.pendingDefinitionCount !== 0
    || evidence.unsupportedDefinitionCount !== 0
    || evidence.spatialRuntimeHash
      !== state.officialSelectedRosterSpatialRuntimeDescriptor?.runtimeHash
    || evidence.rangedRuntimeHash
      !== state.officialSelectedRosterRangedRuntimeDescriptor?.runtimeHash
    || evidence.meleeRuntimeHash
      !== state.officialSelectedRosterMeleeRuntimeDescriptor?.runtimeHash
    || evidence.selectedAbilityRuntimeHash
      !== state.officialSelectedRosterAbilityRuntimeDescriptor?.runtimeHash
    || evidence.abilityCatalogueHash
      !== state.officialAbilityEffectIrCatalogue?.catalogueHash
    || evidence.abilityRuntimeHash
      !== state.officialAbilityEffectRuntimeDescriptor?.runtimeHash
    || evidence.abilityDenominatorHash
      !== state.officialCurrentProductAbilityDenominator?.denominatorHash
    || evidence.abilityCoverageReleaseHash
      !== state.officialCurrentProductAbilityCoverageRelease?.releaseHash
    || evidence.sourceRefreshPerformed !== false || evidence.trainingTruth !== false
    || evidence.compositionHash !== hashStarcraftTmgContract(without(evidence,
      ["compositionHash"]))) {
    fail("CURRENT_PRODUCT_ACTION_RUNTIME_COMPOSITION_INVALID");
  }
  verifyOfficialSelectedRosterSpatialRuntimeDescriptorV1(
    state.officialSelectedRosterSpatialRuntimeDescriptor);
  verifyOfficialSelectedRosterRangedRuntimeDescriptorV1(
    state.officialSelectedRosterRangedRuntimeDescriptor);
  verifyOfficialSelectedRosterMeleeRuntimeDescriptorV1(
    state.officialSelectedRosterMeleeRuntimeDescriptor);
  verifyOfficialSelectedRosterAbilityRuntimeDescriptorV1(
    state.officialSelectedRosterAbilityRuntimeDescriptor);
  verifyOfficialAbilityEffectRuntimeDescriptorV1(
    state.officialAbilityEffectRuntimeDescriptor);
  verifyOfficialCurrentProductAbilityDenominatorV1(
    state.officialCurrentProductAbilityDenominator);
  verifyOfficialCurrentProductAbilityCoverageReleaseV1(
    state.officialCurrentProductAbilityCoverageRelease);
  verifyOfficialRelocationFamilySourceBundleV1(
    state.officialRelocationFamilySourceBundle);
  verifyOfficialCharacteristicStatusFamilySourceBundleV1(
    state.officialCharacteristicStatusFamilySourceBundle);
  verifyOfficialRangedFamilySourceBundleV1(state.officialRangedFamilySourceBundle);
  verifyOfficialMeleeFamilySourceBundleV1(state.officialMeleeFamilySourceBundle);
  verifyOfficialReactionFamilySourceBundleV1(state.officialReactionFamilySourceBundle);
  verifyOfficialBattlefieldAssetFamilySourceBundleV1(
    state.officialBattlefieldAssetFamilySourceBundle);
  verifyOfficialUnitLifecycleFamilySourceBundleV1(
    state.officialUnitLifecycleFamilySourceBundle);
  verifyOfficialMatchLifecycleFamilySourceBundleV1(
    state.officialMatchLifecycleFamilySourceBundle);
  verifyOfficialTerranUniqueFamilySourceBundleV1(
    state.officialTerranUniqueFamilySourceBundle);
  verifyOfficialZergUniqueFamilySourceBundleV1(
    state.officialZergUniqueFamilySourceBundle);
  verifyOfficialProtossUniqueFamilySourceBundleV1(
    state.officialProtossUniqueFamilySourceBundle);
  return true;
}
