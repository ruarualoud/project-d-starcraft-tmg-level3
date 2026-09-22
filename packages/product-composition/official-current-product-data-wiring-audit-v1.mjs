import { createOfficialSelectedRosterAbilityDefinitionBindingsV1 } from
  "./official-ability-effect-runtime-v1.mjs";
import { createOfficialBattlefieldAssetFamilyDefinitionBindingsV1 } from
  "./official-battlefield-asset-family-adapter-v1.mjs";
import { createOfficialCharacteristicStatusFamilyDefinitionBindingsV1 } from
  "./official-characteristic-status-family-adapter-v1.mjs";
import { createOfficialMatchLifecycleFamilyDefinitionBindingsV1 } from
  "./official-match-lifecycle-family-adapter-v1.mjs";
import { createOfficialMeleeFamilyDefinitionBindingsV1 } from
  "./official-melee-family-adapter-v1.mjs";
import { createOfficialProtossUniqueFamilyDefinitionBindingsV1 } from
  "./official-protoss-unique-family-adapter-v1.mjs";
import { createOfficialRangedFamilyDefinitionBindingsV1 } from
  "./official-ranged-family-adapter-v1.mjs";
import { createOfficialReactionFamilyDefinitionBindingsV1 } from
  "./official-reaction-family-adapter-v1.mjs";
import { createOfficialRelocationFamilyDefinitionBindingsV1 } from
  "./official-relocation-family-adapter-v1.mjs";
import { createOfficialTerranUniqueFamilyDefinitionBindingsV1 } from
  "./official-terran-unique-family-adapter-v1.mjs";
import { createOfficialUnitLifecycleFamilyDefinitionBindingsV1 } from
  "./official-unit-lifecycle-family-adapter-v1.mjs";
import { createOfficialZergUniqueFamilyDefinitionBindingsV1 } from
  "./official-zerg-unique-family-adapter-v1.mjs";

export const OFFICIAL_CURRENT_PRODUCT_DATA_WIRING_AUDIT_VERSION =
  "official_current_product_data_wiring_audit_v1";

const BUNDLE_SPECS = Object.freeze([{
  stateKey: "officialSelectedRosterAbilitySourceBundle",
  adapterFamily: "selected_roster_ability",
  createBindings: createOfficialSelectedRosterAbilityDefinitionBindingsV1,
  runtimeRows(bundle) {
    return [...(bundle.routes || []), ...(bundle.passiveBindings || [])];
  },
}, {
  stateKey: "officialRelocationFamilySourceBundle",
  adapterFamily: "relocation",
  createBindings: createOfficialRelocationFamilyDefinitionBindingsV1,
}, {
  stateKey: "officialCharacteristicStatusFamilySourceBundle",
  adapterFamily: "characteristic_status",
  createBindings: createOfficialCharacteristicStatusFamilyDefinitionBindingsV1,
}, {
  stateKey: "officialRangedFamilySourceBundle",
  adapterFamily: "ranged",
  createBindings: createOfficialRangedFamilyDefinitionBindingsV1,
}, {
  stateKey: "officialMeleeFamilySourceBundle",
  adapterFamily: "melee",
  createBindings: createOfficialMeleeFamilyDefinitionBindingsV1,
}, {
  stateKey: "officialReactionFamilySourceBundle",
  adapterFamily: "reaction",
  createBindings: createOfficialReactionFamilyDefinitionBindingsV1,
}, {
  stateKey: "officialBattlefieldAssetFamilySourceBundle",
  adapterFamily: "battlefield_asset",
  createBindings: createOfficialBattlefieldAssetFamilyDefinitionBindingsV1,
}, {
  stateKey: "officialUnitLifecycleFamilySourceBundle",
  adapterFamily: "unit_lifecycle",
  createBindings: createOfficialUnitLifecycleFamilyDefinitionBindingsV1,
}, {
  stateKey: "officialMatchLifecycleFamilySourceBundle",
  adapterFamily: "match_lifecycle",
  createBindings: createOfficialMatchLifecycleFamilyDefinitionBindingsV1,
}, {
  stateKey: "officialTerranUniqueFamilySourceBundle",
  adapterFamily: "terran_unique",
  createBindings: createOfficialTerranUniqueFamilyDefinitionBindingsV1,
}, {
  stateKey: "officialZergUniqueFamilySourceBundle",
  adapterFamily: "zerg_unique",
  createBindings: createOfficialZergUniqueFamilyDefinitionBindingsV1,
}, {
  stateKey: "officialProtossUniqueFamilySourceBundle",
  adapterFamily: "protoss_unique",
  createBindings: createOfficialProtossUniqueFamilyDefinitionBindingsV1,
}]);

const CROSS_ADAPTER_POLICIES = Object.freeze({
  "Adrenal Overload": "record_scoped_effect_with_shared_attack_consumer",
  Commander: "canonical_piece_capability_projection",
  "Creep Removal": "canonical_side_capability_projection",
  "Living Glob of Tissue": "canonical_side_capability_projection",
  "Raptor Strain": "fielded_feature_spatial_consumer",
  Squadron: "fielded_feature_coherency_consumer",
  Stimpack: "record_scoped_effect_with_shared_modifier_consumers",
  "Zerg Creep": "army_building_selection_contract",
});

function normalized(value) {
  return String(value || "").normalize("NFC").trim().toLowerCase()
    .replace(/\s+/gu, " ");
}

function finding(severity, code, detail) {
  return Object.freeze({ severity, code, detail });
}

function runtimeRowsFor(spec, bundle) {
  const rows = spec.runtimeRows ? spec.runtimeRows(bundle) : (bundle.routes || []);
  return rows.map((row, index) => Object.freeze({
    adapterFamily: spec.adapterFamily,
    sourceFeatureHash: String(row?.sourceFeatureHash || ""),
    definitionId: String(row?.definitionId || ""),
    recordKey: String(row?.recordKey || ""),
    effectKind: String(row?.effectKind || ""),
    runtimeInstanceId: String(row?.routeId || row?.bindingId
      || row?.sourceCardInstanceId || row?.pieceId || `${spec.adapterFamily}:${index}`),
  }));
}

function semanticGroups(definitions) {
  const bySemanticIdentity = new Map();
  for (const definition of definitions) {
    const identity = `${normalized(definition.definitionName)}\n${
      normalized(definition.sourceText)}`;
    const rows = bySemanticIdentity.get(identity) || [];
    rows.push(definition);
    bySemanticIdentity.set(identity, rows);
  }
  return [...bySemanticIdentity.values()].filter((rows) => rows.length > 1)
    .map((rows) => {
      const adapters = [...new Set(rows.map((row) => row.runtimeAdapterId))].sort();
      return Object.freeze({
        definitionName: rows[0].definitionName,
        sourceText: rows[0].sourceText,
        definitionCount: rows.length,
        adapters,
        records: rows.map((row) => Object.freeze({
          definitionId: row.definitionId,
          sourceFeatureHash: row.sourceFeatureHash,
          recordKey: row.recordKey,
          runtimeAdapterId: row.runtimeAdapterId,
        })).sort((left, right) => left.recordKey.localeCompare(right.recordKey)),
      });
    }).sort((left, right) => left.definitionName.localeCompare(
      right.definitionName, "en"));
}

function supplyAtModelCount(profile, modelCount) {
  if (modelCount <= 0) return 0;
  const tier = (profile?.supplyProfile || []).find((entry) =>
    entry?.applicable === true
      && modelCount >= Number(entry.minimumModels)
      && modelCount <= Number(entry.maximumModels));
  return tier ? Number(tier.supply) : null;
}

function auditSelectedPieceData(state, blockingFindings) {
  const pieces = state?.pieces || [];
  const supplyByRecordKey = new Map((
    state?.officialUnitCardSupplyDataBundle?.unitProfiles || []
  ).map((entry) => [entry.recordKey, entry]));
  const combatByRecordKey = state?.officialCombatProfileBundle
    ?.profilesByRecordKey || {};
  const missingSupplyProfiles = [];
  const supplyStateMismatches = [];
  const missingCombatProfiles = [];
  const pieceIds = pieces.map((entry) => String(entry?.id || ""));
  const modelIds = pieces.flatMap((entry) => (entry?.models || []).map((model) =>
    String(model?.id || "")));
  const duplicatePieceIdCount = pieceIds.length - new Set(pieceIds).size;
  const duplicateModelIdCount = modelIds.length - new Set(modelIds).size;
  if (duplicatePieceIdCount > 0) {
    blockingFindings.push(finding("critical", "SELECTED_PIECE_ID_DUPLICATE",
      String(duplicatePieceIdCount)));
  }
  if (duplicateModelIdCount > 0) {
    blockingFindings.push(finding("critical", "SELECTED_MODEL_ID_DUPLICATE",
      String(duplicateModelIdCount)));
  }
  for (const piece of pieces) {
    const recordKey = String(piece?.officialUnitRecordKey || "");
    const supplyProfile = supplyByRecordKey.get(recordKey);
    if (!supplyProfile) {
      missingSupplyProfiles.push({ pieceId: piece.id, recordKey });
    } else {
      const expectedSupply = supplyAtModelCount(
        supplyProfile, Number(piece.currentModels || 0));
      if (expectedSupply === null
        || expectedSupply !== Number(piece.currentSupply || 0)) {
        supplyStateMismatches.push({
          pieceId: piece.id,
          recordKey,
          currentModels: Number(piece.currentModels || 0),
          expectedSupply,
          actualSupply: Number(piece.currentSupply || 0),
        });
      }
    }
    if (!combatByRecordKey[recordKey]) {
      missingCombatProfiles.push({ pieceId: piece.id, recordKey });
    }
  }
  for (const entry of missingSupplyProfiles) {
    blockingFindings.push(finding("high", "SELECTED_PIECE_SUPPLY_PROFILE_MISSING",
      `${entry.pieceId}:${entry.recordKey}`));
  }
  for (const entry of supplyStateMismatches) {
    blockingFindings.push(finding("high", "SELECTED_PIECE_SUPPLY_STATE_MISMATCH",
      `${entry.pieceId}:${entry.actualSupply}:${entry.expectedSupply}`));
  }
  for (const entry of missingCombatProfiles) {
    blockingFindings.push(finding("high", "SELECTED_PIECE_COMBAT_PROFILE_MISSING",
      `${entry.pieceId}:${entry.recordKey}`));
  }
  return Object.freeze({
    pieceCount: pieces.length,
    uniqueUnitRecordCount: new Set(pieces.map((entry) =>
      entry.officialUnitRecordKey)).size,
    duplicatePieceIdCount,
    duplicateModelIdCount,
    missingSupplyProfileCount: missingSupplyProfiles.length,
    supplyStateMismatchCount: supplyStateMismatches.length,
    missingCombatProfileCount: missingCombatProfiles.length,
    missingSupplyProfiles: Object.freeze(missingSupplyProfiles),
    supplyStateMismatches: Object.freeze(supplyStateMismatches),
    missingCombatProfiles: Object.freeze(missingCombatProfiles),
  });
}

function cardIdentity(entry, resource = false) {
  return `${String(entry?.cardInstanceId || entry?.id || "")}:${String(resource
    ? entry?.officialCardRecordKey : entry?.recordKey || "")}`;
}

function auditPublicCardData(state, blockingFindings) {
  const resources = state?.cardResources || {};
  const disclosures = state?.publicRosterDisclosureBySide || {};
  const sideKeys = [...new Set([
    ...Object.keys(resources), ...Object.keys(disclosures),
  ])].sort();
  const identityMismatches = [];
  const factionCountMismatches = [];
  for (const sideKey of sideKeys) {
    const resourceIds = (resources[sideKey] || []).map((entry) =>
      cardIdentity(entry, true)).sort();
    const publicCards = disclosures[sideKey]?.publicCards || [];
    const disclosedIds = publicCards.map((entry) => cardIdentity(entry)).sort();
    if (JSON.stringify(resourceIds) !== JSON.stringify(disclosedIds)) {
      identityMismatches.push({ sideKey, resourceIds, disclosedIds });
    }
    const factions = publicCards.filter((entry) => entry?.cardKind === "faction"
      && entry?.faceUp === true && entry?.public === true);
    if (factions.length !== 1) {
      factionCountMismatches.push({ sideKey, count: factions.length });
    }
  }
  const instanceIds = Object.values(resources).flatMap((cards) => (cards || [])
    .map((entry) => String(entry?.cardInstanceId || entry?.id || "")));
  const duplicateCardInstanceIdCount = instanceIds.length - new Set(instanceIds).size;
  for (const entry of identityMismatches) {
    blockingFindings.push(finding("high", "PUBLIC_CARD_RESOURCE_IDENTITY_MISMATCH",
      entry.sideKey));
  }
  for (const entry of factionCountMismatches) {
    blockingFindings.push(finding("high", "PUBLIC_FACTION_CARD_CARDINALITY_INVALID",
      `${entry.sideKey}:${entry.count}`));
  }
  if (duplicateCardInstanceIdCount > 0) {
    blockingFindings.push(finding("critical", "CARD_INSTANCE_ID_DUPLICATE",
      String(duplicateCardInstanceIdCount)));
  }
  return Object.freeze({
    sideCount: sideKeys.length,
    cardInstanceCount: instanceIds.length,
    identityMismatchCount: identityMismatches.length,
    factionCountMismatchCount: factionCountMismatches.length,
    duplicateCardInstanceIdCount,
    identityMismatches: Object.freeze(identityMismatches),
    factionCountMismatches: Object.freeze(factionCountMismatches),
  });
}

export function auditOfficialCurrentProductDataWiringV1(state) {
  const denominator = state?.officialCurrentProductAbilityDenominator;
  const definitions = denominator?.definitions || [];
  const blockingFindings = [];
  const reviewFindings = [];
  if (definitions.length !== 252) {
    blockingFindings.push(finding("critical", "DEFINITION_DENOMINATOR_DRIFT",
      `expected=252 actual=${definitions.length}`));
  }
  if (new Set(definitions.map((entry) => entry.definitionId)).size
      !== definitions.length) {
    blockingFindings.push(finding("critical", "DEFINITION_ID_NOT_UNIQUE", ""));
  }
  if (new Set(definitions.map((entry) => entry.sourceFeatureHash)).size
      !== definitions.length) {
    blockingFindings.push(finding("critical", "SOURCE_FEATURE_HASH_NOT_UNIQUE", ""));
  }

  const executionBindings = [];
  const runtimeInstances = [];
  for (const spec of BUNDLE_SPECS) {
    const bundle = state?.[spec.stateKey];
    if (!bundle) {
      blockingFindings.push(finding("critical", "SOURCE_BUNDLE_MISSING",
        spec.stateKey));
      continue;
    }
    executionBindings.push(...spec.createBindings(bundle).map((entry) => ({
      ...entry, adapterFamily: spec.adapterFamily,
    })));
    runtimeInstances.push(...runtimeRowsFor(spec, bundle));
  }

  const definitionsByHash = new Map(definitions.map((entry) => [
    entry.sourceFeatureHash, entry,
  ]));
  const bindingsByHash = new Map();
  for (const binding of executionBindings) {
    const rows = bindingsByHash.get(binding.sourceFeatureHash) || [];
    rows.push(binding);
    bindingsByHash.set(binding.sourceFeatureHash, rows);
  }
  for (const definition of definitions) {
    const owners = bindingsByHash.get(definition.sourceFeatureHash) || [];
    if (owners.length !== 1) {
      blockingFindings.push(finding("critical",
        owners.length === 0 ? "EXECUTION_OWNER_MISSING" : "EXECUTION_OWNER_DUPLICATE",
        definition.definitionId));
      continue;
    }
    const owner = owners[0];
    if (owner.adapterId !== definition.runtimeAdapterId
      || owner.adapterVersion !== definition.runtimeAdapterVersion) {
      blockingFindings.push(finding("high", "EXECUTION_OWNER_CONTRACT_MISMATCH",
        definition.definitionId));
    }
  }
  for (const binding of executionBindings) {
    if (!definitionsByHash.has(binding.sourceFeatureHash)) {
      blockingFindings.push(finding("high", "ORPHAN_EXECUTION_BINDING",
        binding.sourceFeatureHash));
    }
  }
  for (const instance of runtimeInstances) {
    const definition = definitionsByHash.get(instance.sourceFeatureHash);
    if (!definition) {
      blockingFindings.push(finding("high", "ORPHAN_RUNTIME_INSTANCE",
        `${instance.adapterFamily}:${instance.runtimeInstanceId}`));
      continue;
    }
    if (instance.definitionId && instance.definitionId !== definition.definitionId) {
      blockingFindings.push(finding("high", "RUNTIME_INSTANCE_DEFINITION_MISMATCH",
        `${instance.runtimeInstanceId}:${instance.definitionId}`));
    }
    if (instance.recordKey && instance.recordKey !== definition.recordKey) {
      blockingFindings.push(finding("high", "RUNTIME_INSTANCE_RECORD_MISMATCH",
        `${instance.runtimeInstanceId}:${instance.recordKey}`));
    }
  }

  const duplicates = semanticGroups(definitions);
  const crossAdapterSemanticGroups = duplicates.filter((group) => (
    group.adapters.length > 1)).map((group) => Object.freeze({
    ...group,
    consumerPolicy: CROSS_ADAPTER_POLICIES[group.definitionName] || null,
  }));
  for (const group of crossAdapterSemanticGroups) {
    if (!group.consumerPolicy) {
      blockingFindings.push(finding("high", "CROSS_ADAPTER_SEMANTIC_SPLIT_UNREVIEWED",
        group.definitionName));
    } else {
      reviewFindings.push(finding("medium", "CROSS_ADAPTER_SEMANTIC_SPLIT_TRACKED",
        `${group.definitionName}:${group.consumerPolicy}`));
    }
  }
  for (const name of Object.keys(CROSS_ADAPTER_POLICIES)) {
    if (!crossAdapterSemanticGroups.some((group) => group.definitionName === name)) {
      blockingFindings.push(finding("high", "EXPECTED_SEMANTIC_SPLIT_DISAPPEARED",
        name));
    }
  }
  const selectedPieceData = auditSelectedPieceData(state, blockingFindings);
  const publicCardData = auditPublicCardData(state, blockingFindings);

  return Object.freeze({
    schema: OFFICIAL_CURRENT_PRODUCT_DATA_WIRING_AUDIT_VERSION,
    definitionCount: definitions.length,
    sourceRecordCount: denominator?.sourceRecords?.length || 0,
    executionBindingCount: executionBindings.length,
    uniqueExecutionBindingCount: bindingsByHash.size,
    runtimeInstanceCount: runtimeInstances.length,
    semanticDuplicateGroupCount: duplicates.length,
    crossAdapterSemanticGroups: Object.freeze(crossAdapterSemanticGroups),
    selectedPieceData,
    publicCardData,
    blockingFindings: Object.freeze(blockingFindings),
    reviewFindings: Object.freeze(reviewFindings),
    sourceDefinitionsRemainOneToOne: true,
    runtimeInstancesMayBeOneToMany: true,
    semanticEquivalenceRequiresExplicitConsumerPolicy: true,
    providerCalls: 0,
    rulesAuthority: true,
    trainingTruth: false,
  });
}
