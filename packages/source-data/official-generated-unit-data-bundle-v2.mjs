import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { assertOfficialReleaseSourceV2 } from './official-release-context-v2.mjs';
import { getOfficialModelBaseGeometryProfileV1,
  getOfficialReleaseModelBaseGeometryBundleV2 } from './official-model-base-geometry-data-bundle-v1.mjs';
import { getOfficialUnitCardSupplyProfileV1 } from './official-unit-card-supply-data-bundle-v1.mjs';

const schema = 'starcraft_tmg_official_generated_unit_data_bundle_v2';
const without = (value, field) => Object.fromEntries(Object.entries(value).filter(([key]) => key !== field));
function fail(code, detail = '') { throw Error(detail ? code + ':' + detail : code); }
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

// Construction facts only. Ability execution and permission to set a unit are
// owned by the source-bound producer, not by this catalogue.
export function createOfficialGeneratedUnitDataBundleV2({ context, recordKeys } = {}) {
  assertOfficialReleaseSourceV2(context, context || {});
  if (!Array.isArray(recordKeys) || !recordKeys.length || new Set(recordKeys).size !== recordKeys.length
    || recordKeys.some(key => typeof key !== 'string' || !key.startsWith('army_units:'))) {
    fail('GENERATED_UNIT_EXPLICIT_RECORDS_REQUIRED');
  }
  const geometry = getOfficialReleaseModelBaseGeometryBundleV2(context);
  const profiles = [...recordKeys].sort().map(recordKey => {
    const record = context.dataset.recordsByKey[recordKey];
    const unit = record?.payload;
    const supply = getOfficialUnitCardSupplyProfileV1(context.resources.unitCharacteristics, recordKey);
    const base = getOfficialModelBaseGeometryProfileV1(geometry, recordKey);
    if (supply.sourceRecordHash !== record?.sourceRecordHash || supply.payloadHash !== record?.payloadHash
      || base.sourceRecordHash !== record?.sourceRecordHash || base.payloadHash !== record?.payloadHash) {
      fail('GENERATED_UNIT_SOURCE_BINDING_MISMATCH', recordKey);
    }
    if (!recordKey.startsWith('army_units:') || unit?.unitType !== 'Other'
      || supply.fieldableDuringArmyBuilding !== false || supply.armySlotType !== null
      || Number(unit.small?.cost) !== 0 || Number(unit.large?.models) !== 0
      || !Number.isSafeInteger(unit.small?.models) || unit.small.models < 1) {
      fail('GENERATED_UNIT_SOURCE_CLASSIFICATION_INVALID', recordKey);
    }
    const printedSize = String(unit.stats?.size ?? '').trim();
    if (!/^(?:-|\d+)$/u.test(printedSize)) fail('GENERATED_UNIT_SIZE_SOURCE_UNSUPPORTED', recordKey);
    const sizeCharacteristic = printedSize === '-' ? 0 : Number(printedSize);
    if (!Number.isSafeInteger(sizeCharacteristic)) fail('GENERATED_UNIT_SIZE_SOURCE_UNSUPPORTED', recordKey);
    const structureFeatures = (unit.upgrades || []).flatMap((feature, index) => {
      if (String(feature.name).normalize('NFC').trim().toLowerCase() !== 'structure') return [];
      if (feature.activation !== '<Passive>') fail('GENERATED_UNIT_STRUCTURE_SOURCE_UNSUPPORTED', recordKey);
      return [{ sourceIndex: index, sourceFeatureHash: hash({ recordKey, sourceRecordHash: record.sourceRecordHash,
        payloadHash: record.payloadHash, index, feature }) }];
    });
    const body = { recordKey, unitName: unit.name, sourceRecordHash: record.sourceRecordHash,
      payloadHash: record.payloadHash, unitCardSupplyProfileHash: supply.profileHash,
      geometryProfileHash: hash(base), printedSize, sizeCharacteristic,
      isStructure: structureFeatures.length > 0, structureFeatures,
      defaultCompositionKind: 'small', startingModelCount: unit.small.models,
      fieldableDuringArmyBuilding: false, sourceUnitType: 'Other', trainingTruth: false };
    return { ...body, profileHash: hash(body) };
  });
  const body = { schema, semanticVersion: '2.0.0', sourceSnapshotHash: context.dataset.sourceSnapshotHash,
    normalizedDatasetHash: context.dataset.datasetHash, recordCount: profiles.length, profiles,
    grantsDeploymentAuthority: false, implementsUnitAbilities: false, trainingTruth: false };
  const bundle = freeze({ ...body, bundleHash: hash(body) });
  verifyOfficialGeneratedUnitDataBundleV2(bundle);
  return bundle;
}

export function verifyOfficialGeneratedUnitDataBundleV2(bundle) {
  const profiles = bundle?.profiles;
  const hashPattern = /^[a-f0-9]{64}$/u;
  const validRows = Array.isArray(profiles) && profiles.every(row => row && typeof row === 'object'
    && !Array.isArray(row) && typeof row.recordKey === 'string');
  const sortedKeys = validRows ? profiles.map(row => row.recordKey).sort() : [];
  if (bundle?.schema !== schema || bundle.semanticVersion !== '2.0.0'
    || !validRows || !profiles.length || bundle.recordCount !== profiles.length
    || !hashPattern.test(bundle.sourceSnapshotHash) || !hashPattern.test(bundle.normalizedDatasetHash)
    || new Set(profiles.map(row => row.recordKey)).size !== profiles.length
    || profiles.some((row, index) => row.recordKey !== sortedKeys[index]
      || row.sourceUnitType !== 'Other' || row.fieldableDuringArmyBuilding !== false
      || !['sourceRecordHash', 'payloadHash', 'unitCardSupplyProfileHash', 'geometryProfileHash'].every(key => hashPattern.test(row[key]))
      || !/^(?:-|\d+)$/u.test(row.printedSize)
      || !Number.isSafeInteger(row.sizeCharacteristic) || row.sizeCharacteristic < 0
      || row.sizeCharacteristic !== (row.printedSize === '-' ? 0 : Number(row.printedSize))
      || row.defaultCompositionKind !== 'small' || !Number.isSafeInteger(row.startingModelCount) || row.startingModelCount < 1
      || !Array.isArray(row.structureFeatures) || row.isStructure !== (row.structureFeatures.length > 0)
      || row.structureFeatures.some(feature => !Number.isSafeInteger(feature.sourceIndex) || feature.sourceIndex < 0
        || !hashPattern.test(feature.sourceFeatureHash))
      || row.profileHash !== hash(without(row, 'profileHash')) || row.trainingTruth !== false)
    || bundle.grantsDeploymentAuthority !== false || bundle.implementsUnitAbilities !== false
    || bundle.trainingTruth !== false || bundle.bundleHash !== hash(without(bundle, 'bundleHash'))) {
    fail('GENERATED_UNIT_DATA_BUNDLE_INVALID');
  }
  return true;
}

export function getOfficialGeneratedUnitProfileV2(bundle, recordKey) {
  verifyOfficialGeneratedUnitDataBundleV2(bundle);
  const profile = bundle.profiles.find(row => row.recordKey === recordKey);
  if (!profile) fail('GENERATED_UNIT_PROFILE_MISSING', recordKey);
  return profile;
}
