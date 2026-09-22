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

function identityOf(value) {
  return `${String(value?.sourceRecordHash || "")}:${String(
    value?.payloadHash || value?.officialPayloadHash || "")}`;
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function normalizedSquadProfile(profile) {
  return (profile || []).map((entry) => ({
    tier: Number(entry?.tier),
    minimumModels: entry?.applicable === false
      ? null : entry?.minimumModels ?? null,
    maximumModels: entry?.applicable === false
      ? null : entry?.maximumModels ?? null,
    supply: Number(entry?.supply || 0),
  })).sort((left, right) => left.tier - right.tier);
}

function recordKeys(rows) {
  return (rows || []).map((entry) => String(entry?.recordKey || ""))
    .filter(Boolean).sort();
}

function duplicateKeys(rows, key = "recordKey") {
  const values = (rows || []).map((entry) => String(entry?.[key] || ""))
    .filter(Boolean);
  return [...new Set(values.filter((value, index) => (
    values.indexOf(value) !== index
  )))].sort();
}

function auditUnitCatalogueData(state, blockingFindings) {
  const supplyProfiles = state?.officialUnitCardSupplyDataBundle
    ?.unitProfiles || [];
  const combatProfiles = state?.officialCombatProfileBundle?.profiles || [];
  const geometryProfiles = state?.officialModelBaseGeometryDataBundle
    ?.profiles || [];
  const attackCatalogue = state?.officialAttackProfileCatalogueV2 || {};
  const attackProfiles = attackCatalogue.profiles || [];
  const supplyKeys = recordKeys(supplyProfiles);
  const combatKeys = recordKeys(combatProfiles);
  const geometryKeys = recordKeys(geometryProfiles);
  const attackUnitKeys = [...(attackCatalogue.unitRecordKeys || [])]
    .map(String).sort();
  const denominatorMismatches = [];
  for (const [name, keys] of [["combat", combatKeys],
    ["geometry", geometryKeys], ["attack", attackUnitKeys]]) {
    if (!sameJson(supplyKeys, keys)) denominatorMismatches.push(name);
  }
  const duplicateProfileKeys = {
    supply: duplicateKeys(supplyProfiles),
    combat: duplicateKeys(combatProfiles),
    geometry: duplicateKeys(geometryProfiles),
    attack: duplicateKeys(attackProfiles, "profileKey"),
  };
  const supplyByKey = new Map(supplyProfiles.map((entry) => [
    entry.recordKey, entry,
  ]));
  const combatByKey = new Map(combatProfiles.map((entry) => [
    entry.recordKey, entry,
  ]));
  const geometryByKey = new Map(geometryProfiles.map((entry) => [
    entry.recordKey, entry,
  ]));
  const attacksByKey = new Map();
  for (const attack of attackProfiles) {
    const rows = attacksByKey.get(attack.recordKey) || [];
    rows.push(attack);
    attacksByKey.set(attack.recordKey, rows);
  }
  const sourceIdentityMismatches = [];
  const unitIdentityMismatches = [];
  const supplyProfileMismatches = [];
  const baseGeometryMismatches = [];
  const combatIndexMismatches = [];
  for (const recordKey of supplyKeys) {
    const supply = supplyByKey.get(recordKey);
    const combat = combatByKey.get(recordKey);
    const geometry = geometryByKey.get(recordKey);
    const attacks = attacksByKey.get(recordKey) || [];
    const rows = [supply, combat, geometry, ...attacks].filter(Boolean);
    const identities = [...new Set(rows.map(identityOf))];
    if (rows.some((entry) => identityOf(entry) === ":")
      || identities.length !== 1) {
      sourceIdentityMismatches.push({ recordKey, identities });
    }
    if (!combat || !geometry
      || supply.unitId !== combat?.unitId
      || supply.unitName !== combat?.unitName
      || supply.unitName !== geometry?.unitName
      || supply.factionTag !== combat?.faction
      || attacks.some((attack) => attack.unitId !== supply.unitId
        || attack.unitName !== supply.unitName)) {
      unitIdentityMismatches.push(recordKey);
    }
    if (!combat || !sameJson(
      normalizedSquadProfile(supply.supplyProfile),
      normalizedSquadProfile(combat.squadProfile))) {
      supplyProfileMismatches.push(recordKey);
    }
    if (!geometry
      || supply.base?.shape !== geometry.baseShape
      || Number(supply.base?.widthMillimetres)
        !== Number(geometry.baseWidthMillimetres)
      || Number(supply.base?.depthMillimetres)
        !== Number(geometry.baseDepthMillimetres)) {
      baseGeometryMismatches.push(recordKey);
    }
    const indexedCombat = state?.officialCombatProfileBundle
      ?.profilesByRecordKey?.[recordKey];
    if (!indexedCombat || identityOf(indexedCombat) !== identityOf(combat)
      || indexedCombat.unitId !== combat?.unitId
      || indexedCombat.unitName !== combat?.unitName) {
      combatIndexMismatches.push(recordKey);
    }
  }
  for (const name of denominatorMismatches) {
    blockingFindings.push(finding("critical",
      "UNIT_CATALOGUE_DENOMINATOR_MISMATCH", name));
  }
  for (const [family, keys] of Object.entries(duplicateProfileKeys)) {
    for (const key of keys) {
      blockingFindings.push(finding("critical",
        "UNIT_CATALOGUE_PROFILE_KEY_DUPLICATE", `${family}:${key}`));
    }
  }
  for (const [code, rows] of [["UNIT_CATALOGUE_SOURCE_IDENTITY_MISMATCH",
    sourceIdentityMismatches.map((entry) => entry.recordKey)],
  ["UNIT_CATALOGUE_IDENTITY_MISMATCH", unitIdentityMismatches],
  ["UNIT_CATALOGUE_SUPPLY_PROFILE_MISMATCH", supplyProfileMismatches],
  ["UNIT_CATALOGUE_BASE_GEOMETRY_MISMATCH", baseGeometryMismatches],
  ["UNIT_CATALOGUE_COMBAT_INDEX_MISMATCH", combatIndexMismatches]]) {
    for (const recordKey of rows) {
      blockingFindings.push(finding("high", code, recordKey));
    }
  }
  return Object.freeze({
    unitRecordCount: supplyKeys.length,
    supplyProfileCount: supplyProfiles.length,
    combatProfileCount: combatProfiles.length,
    geometryProfileCount: geometryProfiles.length,
    attackUnitRecordCount: attackUnitKeys.length,
    attackProfileCount: attackProfiles.length,
    denominatorMismatchCount: denominatorMismatches.length,
    duplicateProfileKeyCount: Object.values(duplicateProfileKeys)
      .reduce((sum, keys) => sum + keys.length, 0),
    sourceIdentityMismatchCount: sourceIdentityMismatches.length,
    unitIdentityMismatchCount: unitIdentityMismatches.length,
    supplyProfileMismatchCount: supplyProfileMismatches.length,
    baseGeometryMismatchCount: baseGeometryMismatches.length,
    combatIndexMismatchCount: combatIndexMismatches.length,
    denominatorMismatches: Object.freeze(denominatorMismatches),
    duplicateProfileKeys: Object.freeze(duplicateProfileKeys),
    sourceIdentityMismatches: Object.freeze(sourceIdentityMismatches),
    unitIdentityMismatches: Object.freeze(unitIdentityMismatches),
    supplyProfileMismatches: Object.freeze(supplyProfileMismatches),
    baseGeometryMismatches: Object.freeze(baseGeometryMismatches),
    combatIndexMismatches: Object.freeze(combatIndexMismatches),
  });
}

function auditOfficialBundleLineage(state, blockingFindings) {
  const lineageRows = Object.entries(state || {}).filter(([key, value]) => (
    key.startsWith("official") && value && typeof value === "object"
      && !Array.isArray(value)
      && (value.normalizedDatasetHash || value.sourceSnapshotHash)
  )).map(([stateKey, value]) => ({
    stateKey,
    normalizedDatasetHash: value.normalizedDatasetHash || null,
    sourceSnapshotHash: value.sourceSnapshotHash || null,
  }));
  const datasetHashes = [...new Set(lineageRows.map((entry) => (
    entry.normalizedDatasetHash)).filter(Boolean))];
  const snapshotHashes = [...new Set(lineageRows.map((entry) => (
    entry.sourceSnapshotHash)).filter(Boolean))];
  const missingLineage = lineageRows.filter((entry) => (
    !entry.normalizedDatasetHash || !entry.sourceSnapshotHash));
  if (datasetHashes.length !== 1) {
    blockingFindings.push(finding("critical", "OFFICIAL_DATASET_LINEAGE_SPLIT",
      String(datasetHashes.length)));
  }
  if (snapshotHashes.length !== 1) {
    blockingFindings.push(finding("critical", "OFFICIAL_SNAPSHOT_LINEAGE_SPLIT",
      String(snapshotHashes.length)));
  }
  for (const entry of missingLineage) {
    blockingFindings.push(finding("high", "OFFICIAL_BUNDLE_LINEAGE_INCOMPLETE",
      entry.stateKey));
  }

  const edges = [{
    edge: "current_product_gameplay_to_combat",
    actual: state?.officialCurrentProductGameplayDataBundle
      ?.combatProfileBundle?.bundleHash,
    expected: state?.officialCombatProfileBundle?.bundleHash,
  }, {
    edge: "attack_catalogue_v2_to_v1",
    actual: state?.officialAttackProfileCatalogueV2?.previousCatalogueHash,
    expected: state?.officialAttackProfileCatalogue?.catalogueHash,
  }, {
    edge: "ranged_family_to_attack_catalogue_v1",
    actual: state?.officialRangedFamilySourceBundle?.attackProfileCatalogueHash,
    expected: state?.officialAttackProfileCatalogue?.catalogueHash,
  }, {
    edge: "melee_family_to_attack_catalogue_v2",
    actual: state?.officialMeleeFamilySourceBundle?.attackProfileCatalogueHash,
    expected: state?.officialAttackProfileCatalogueV2?.catalogueHash,
  }, {
    edge: "respawn_to_supply",
    actual: state?.officialRespawnMorphDataBundle
      ?.unitCardSupplyDataBundle?.bundleHash,
    expected: state?.officialUnitCardSupplyDataBundle?.bundleHash,
  }, {
    edge: "respawn_to_geometry",
    actual: state?.officialRespawnMorphDataBundle
      ?.modelBaseGeometryDataBundle?.bundleHash,
    expected: state?.officialModelBaseGeometryDataBundle?.bundleHash,
  }, {
    edge: "summon_to_supply",
    actual: state?.officialSummonDataBundle?.unitCardSupplyDataBundle?.bundleHash,
    expected: state?.officialUnitCardSupplyDataBundle?.bundleHash,
  }, {
    edge: "summon_to_geometry",
    actual: state?.officialSummonDataBundle
      ?.modelBaseGeometryDataBundle?.bundleHash,
    expected: state?.officialModelBaseGeometryDataBundle?.bundleHash,
  }, {
    edge: "terrain_to_geometry",
    actual: state?.officialBalancedTerrainRulesDataBundle
      ?.modelBaseGeometryDataBundleHash,
    expected: state?.officialModelBaseGeometryDataBundle?.bundleHash,
  }].map((entry) => ({
    ...entry,
    present: Boolean(entry.actual && entry.expected),
    matches: Boolean(entry.actual && entry.expected
      && entry.actual === entry.expected),
  }));
  for (const entry of edges.filter((candidate) => !candidate.matches)) {
    blockingFindings.push(finding("high", "OFFICIAL_BUNDLE_EDGE_MISMATCH",
      entry.edge));
  }

  const attackV1 = state?.officialAttackProfileCatalogue?.profiles || [];
  const attackV2 = state?.officialAttackProfileCatalogueV2?.profiles || [];
  const attackV1ByKey = new Map(attackV1.map((entry) => [
    entry.profileKey, entry,
  ]));
  const attackV2ByKey = new Map(attackV2.map((entry) => [
    entry.profileKey, entry,
  ]));
  const attackCatalogueMismatches = [];
  for (const profile of attackV1) {
    const successor = attackV2ByKey.get(profile.profileKey);
    if (!successor || successor.previousProfileHash !== profile.profileHash
      || successor.recordKey !== profile.recordKey
      || successor.sourceRecordHash !== profile.sourceRecordHash
      || successor.payloadHash !== profile.payloadHash
      || successor.sourceTextHash !== profile.sourceTextHash) {
      attackCatalogueMismatches.push(profile.profileKey);
    }
  }
  for (const profile of attackV2) {
    if (!attackV1ByKey.has(profile.profileKey)) {
      attackCatalogueMismatches.push(profile.profileKey);
    }
  }
  if (!sameJson(
    [...(state?.officialAttackProfileCatalogue?.unitRecordKeys || [])].sort(),
    [...(state?.officialAttackProfileCatalogueV2?.unitRecordKeys || [])].sort())) {
    attackCatalogueMismatches.push("unit_record_key_denominator");
  }
  for (const profileKey of [...new Set(attackCatalogueMismatches)]) {
    blockingFindings.push(finding("high",
      "ATTACK_CATALOGUE_MIGRATION_LINEAGE_MISMATCH", profileKey));
  }

  const selectedRecordKeys = [...new Set((state?.pieces || []).map((entry) => (
    String(entry?.officialUnitRecordKey || ""))).filter(Boolean))];
  const legacyCombatRecords = new Set(state?.officialGameplayDataBundle
    ?.combatProfileBundle?.profiles?.map((entry) => entry.recordKey) || []);
  const missingLegacySelectedRecords = selectedRecordKeys.filter((recordKey) => (
    !legacyCombatRecords.has(recordKey)
      && !(state?.officialSummonDataBundle?.summonedUnitProfiles || [])
        .some((entry) => entry.recordKey === recordKey)
  ));
  for (const recordKey of missingLegacySelectedRecords) {
    blockingFindings.push(finding("high",
      "SELECTED_RECORD_LEGACY_GAMEPLAY_PROFILE_MISSING", recordKey));
  }
  return Object.freeze({
    officialBundleCount: lineageRows.length,
    normalizedDatasetHashCount: datasetHashes.length,
    sourceSnapshotHashCount: snapshotHashes.length,
    missingLineageCount: missingLineage.length,
    edgeCount: edges.length,
    edgeMismatchCount: edges.filter((entry) => !entry.matches).length,
    missingLegacySelectedRecordCount: missingLegacySelectedRecords.length,
    attackV1ProfileCount: attackV1.length,
    attackV2ProfileCount: attackV2.length,
    attackCatalogueMismatchCount:
      new Set(attackCatalogueMismatches).size,
    edges: Object.freeze(edges),
    missingLegacySelectedRecords: Object.freeze(missingLegacySelectedRecords),
    attackCatalogueMismatches: Object.freeze(
      [...new Set(attackCatalogueMismatches)]),
  });
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
  const sourceIdentityMismatches = [];
  const unitIdentityMismatches = [];
  const supplyProfileMismatches = [];
  const modelLedgerMismatches = [];
  const baseGeometryMismatches = [];
  const woundStateMismatches = [];
  const attackProfileMismatches = [];
  const geometryByRecordKey = new Map((
    state?.officialModelBaseGeometryDataBundle?.profiles || []
  ).map((entry) => [entry.recordKey, entry]));
  const attacksByRecordKey = new Map();
  for (const attack of state?.officialAttackProfileCatalogueV2?.profiles || []) {
    const rows = attacksByRecordKey.get(attack.recordKey) || [];
    rows.push(attack);
    attacksByRecordKey.set(attack.recordKey, rows);
  }
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
    const combatProfile = combatByRecordKey[recordKey];
    const geometryProfile = geometryByRecordKey.get(recordKey);
    const attackProfiles = attacksByRecordKey.get(recordKey) || [];
    const identityRows = [piece, supplyProfile, combatProfile, geometryProfile,
      ...attackProfiles].filter(Boolean);
    const identities = [...new Set(identityRows.map(identityOf))];
    if (identityRows.some((entry) => identityOf(entry) === ":")
      || identities.length !== 1) {
      sourceIdentityMismatches.push({ pieceId: piece.id, recordKey, identities });
    }
    if (supplyProfile && combatProfile && (
      piece.unitId !== supplyProfile.unitId
      || piece.unitId !== combatProfile.unitId
      || piece.unitName !== supplyProfile.unitName
      || piece.unitName !== combatProfile.unitName
      || piece.armySlotType !== supplyProfile.armySlotType
      || !sameJson([...(piece.combatTags || [])].sort(),
        [...(combatProfile.combatTags || [])].sort())
    )) {
      unitIdentityMismatches.push({ pieceId: piece.id, recordKey });
    }
    if (supplyProfile && combatProfile && !sameJson(
      normalizedSquadProfile(supplyProfile.supplyProfile),
      normalizedSquadProfile(combatProfile.squadProfile))) {
      supplyProfileMismatches.push({ pieceId: piece.id, recordKey });
    }
    const aliveModelIds = (piece.models || []).filter((model) => (
      model?.isDestroyed !== true)).map((model) => String(model.id)).sort();
    const destroyedModelIds = (piece.models || []).filter((model) => (
      model?.isDestroyed === true)).map((model) => String(model.id)).sort();
    if (Number(piece.currentModels) !== aliveModelIds.length
      || Number(piece.maxModels) !== (piece.models || []).length
      || !sameJson(destroyedModelIds,
        [...(piece.destroyedModelIds || [])].map(String).sort())) {
      modelLedgerMismatches.push({
        pieceId: piece.id,
        recordKey,
        currentModels: Number(piece.currentModels),
        aliveModels: aliveModelIds.length,
        maxModels: Number(piece.maxModels),
        modelRows: (piece.models || []).length,
      });
    }
    if (!geometryProfile) {
      baseGeometryMismatches.push({ pieceId: piece.id, recordKey,
        reason: "profile_missing" });
    } else {
      const expectedWidth = geometryProfile.baseWidthMilliInches / 1000;
      const expectedDepth = geometryProfile.baseDepthMilliInches / 1000;
      for (const model of piece.models || []) {
        if (model.baseShape !== geometryProfile.baseShape
          || Number(model.baseWidthInches) !== expectedWidth
          || Number(model.baseDepthInches) !== expectedDepth) {
          baseGeometryMismatches.push({ pieceId: piece.id, modelId: model.id,
            recordKey, reason: "model_base_drift" });
        }
      }
      if (supplyProfile && (
        supplyProfile.base?.shape !== geometryProfile.baseShape
        || Number(supplyProfile.base?.widthMillimetres)
          !== Number(geometryProfile.baseWidthMillimetres)
        || Number(supplyProfile.base?.depthMillimetres)
          !== Number(geometryProfile.baseDepthMillimetres))) {
        baseGeometryMismatches.push({ pieceId: piece.id, recordKey,
          reason: "supply_geometry_drift" });
      }
    }
    if (combatProfile) {
      for (const model of piece.models || []) {
        const wounds = Number(model.remainingWounds);
        if (!Number.isFinite(wounds) || wounds < 0
          || wounds > Number(combatProfile.hitPoints)
          || (model.isDestroyed === true && wounds !== 0)
          || (model.isDestroyed !== true && wounds <= 0)) {
          woundStateMismatches.push({ pieceId: piece.id, modelId: model.id,
            recordKey, remainingWounds: model.remainingWounds,
            hitPoints: combatProfile.hitPoints });
        }
      }
    }
    for (const attack of attackProfiles) {
      if (attack.recordKey !== recordKey
        || attack.unitId !== piece.unitId
        || attack.unitName !== piece.unitName
        || identityOf(attack) !== identityOf(piece)) {
        attackProfileMismatches.push({ pieceId: piece.id, recordKey,
          profileKey: attack.profileKey });
      }
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
  for (const [code, rows] of [["SELECTED_PIECE_SOURCE_IDENTITY_MISMATCH",
    sourceIdentityMismatches], ["SELECTED_PIECE_UNIT_IDENTITY_MISMATCH",
    unitIdentityMismatches], ["SELECTED_PIECE_SUPPLY_PROFILE_MISMATCH",
    supplyProfileMismatches], ["SELECTED_PIECE_MODEL_LEDGER_MISMATCH",
    modelLedgerMismatches], ["SELECTED_PIECE_BASE_GEOMETRY_MISMATCH",
    baseGeometryMismatches], ["SELECTED_PIECE_WOUND_STATE_MISMATCH",
    woundStateMismatches], ["SELECTED_PIECE_ATTACK_PROFILE_MISMATCH",
    attackProfileMismatches]]) {
    for (const entry of rows) {
      blockingFindings.push(finding("high", code,
        `${entry.pieceId}:${entry.recordKey}${entry.modelId
          ? `:${entry.modelId}` : ""}${entry.profileKey
          ? `:${entry.profileKey}` : ""}`));
    }
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
    sourceIdentityMismatchCount: sourceIdentityMismatches.length,
    unitIdentityMismatchCount: unitIdentityMismatches.length,
    supplyProfileMismatchCount: supplyProfileMismatches.length,
    modelLedgerMismatchCount: modelLedgerMismatches.length,
    baseGeometryMismatchCount: baseGeometryMismatches.length,
    woundStateMismatchCount: woundStateMismatches.length,
    attackProfileMismatchCount: attackProfileMismatches.length,
    missingSupplyProfiles: Object.freeze(missingSupplyProfiles),
    supplyStateMismatches: Object.freeze(supplyStateMismatches),
    missingCombatProfiles: Object.freeze(missingCombatProfiles),
    sourceIdentityMismatches: Object.freeze(sourceIdentityMismatches),
    unitIdentityMismatches: Object.freeze(unitIdentityMismatches),
    supplyProfileMismatches: Object.freeze(supplyProfileMismatches),
    modelLedgerMismatches: Object.freeze(modelLedgerMismatches),
    baseGeometryMismatches: Object.freeze(baseGeometryMismatches),
    woundStateMismatches: Object.freeze(woundStateMismatches),
    attackProfileMismatches: Object.freeze(attackProfileMismatches),
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
  const unitCatalogueData = auditUnitCatalogueData(state, blockingFindings);
  const publicCardData = auditPublicCardData(state, blockingFindings);
  const officialBundleLineage = auditOfficialBundleLineage(
    state, blockingFindings);

  return Object.freeze({
    schema: OFFICIAL_CURRENT_PRODUCT_DATA_WIRING_AUDIT_VERSION,
    definitionCount: definitions.length,
    sourceRecordCount: denominator?.sourceRecords?.length || 0,
    executionBindingCount: executionBindings.length,
    uniqueExecutionBindingCount: bindingsByHash.size,
    runtimeInstanceCount: runtimeInstances.length,
    semanticDuplicateGroupCount: duplicates.length,
    crossAdapterSemanticGroups: Object.freeze(crossAdapterSemanticGroups),
    unitCatalogueData,
    selectedPieceData,
    publicCardData,
    officialBundleLineage,
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
