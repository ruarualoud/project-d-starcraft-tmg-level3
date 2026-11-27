import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { verifyOfficialAbilityEffectIrCatalogueV1 } from './official-ability-effect-ir-v1.mjs';

const records = new Map([
  ['unit:auto_turret/structure-any-phase@1', 'army_units:auto_turret'],
  ['unit:pylon/structure-any-phase@1', 'army_units:pylon'],
  ['unit:omega_worm/structure-any-phase@1', 'army_units:omega_worm'],
  ['unit:sabotage_drone/structure-any-phase@1', 'army_units:sabotage_drone'],
  ['unit:infested_missile_turret/structure-any-phase@1', 'army_units:infested_missile_turret'],
]);
const text = 'This Unit cannot be Activated in any Phase and cannot perform actions. Additionally, its Current Supply Value is treated as 0, and it can never Control or Contest Mission Markers, ignoring the standard Zero Supply Exception. This Unit cannot be a target of an ability, unless stated otherwise.';
export const OFFICIAL_STRUCTURE_RULE_ATOM_IDS = Object.freeze([
  'rule-atom:source-bound-structure-activation-prohibition-v1',
  'rule-atom:source-bound-structure-supply-control-prohibition-v1',
  'rule-atom:source-bound-structure-ability-target-prohibition-v1',
]);
const withoutHash = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'bundleHash'));

export function createOfficialStructureSourceV1({ catalogue, definitionIds } = {}) {
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  if (!Array.isArray(definitionIds) || !definitionIds.length || definitionIds.length > records.size
    || new Set(definitionIds).size !== definitionIds.length || definitionIds.some(id => !records.has(id))) {
    throw Error('STRUCTURE_EXPLICIT_DEFINITIONS_REQUIRED');
  }
  const definitions = [...definitionIds].sort().map(definitionId => {
    const source = catalogue.definitions.find(row => row.definitionId === definitionId);
    if (source?.recordKey !== records.get(definitionId) || source.definitionName !== 'Structure'
      || source.sourceKind !== 'unit_feature' || source.activationKind !== 'passive'
      || source.phase !== 'any' || source.sourceText !== text) throw Error('STRUCTURE_SOURCE_UNSUPPORTED');
    return { definitionId, recordKey: source.recordKey, sourceFeatureHash: source.sourceFeatureHash,
      sourceRecordHash: source.sourceRecordHash, payloadHash: source.payloadHash };
  });
  const body = { schema: 'starcraft_tmg_official_structure_source_v1', version: '1.0.0',
    sourceSnapshotHash: catalogue.sourceSnapshotHash, normalizedDatasetHash: catalogue.normalizedDatasetHash,
    definitionIds: definitions.map(row => row.definitionId), definitions, sourceText: text,
    ruleAtomIds: OFFICIAL_STRUCTURE_RULE_ATOM_IDS, trainingTruth: false };
  return Object.freeze({ ...body, bundleHash: hash(body) });
}

export function verifyOfficialStructureSourceV1(source) {
  const definitions = source?.definitions;
  if (source?.schema !== 'starcraft_tmg_official_structure_source_v1' || source.version !== '1.0.0'
    || !Array.isArray(definitions) || !definitions.length || definitions.length > records.size
    || !isDeepStrictEqual(source.definitionIds, definitions.map(row => row.definitionId).sort())
    || new Set(source.definitionIds).size !== definitions.length || source.sourceText !== text
    || !isDeepStrictEqual(source.ruleAtomIds, OFFICIAL_STRUCTURE_RULE_ATOM_IDS)
    || !['sourceSnapshotHash', 'normalizedDatasetHash'].every(key => /^[a-f0-9]{64}$/u.test(source[key]))
    || definitions.some(row => records.get(row.definitionId) !== row.recordKey
      || !['sourceFeatureHash', 'sourceRecordHash', 'payloadHash'].every(key => /^[a-f0-9]{64}$/u.test(row[key])))
    || source.trainingTruth !== false || source.bundleHash !== hash(withoutHash(source))) {
    throw Error('STRUCTURE_SOURCE_INVALID');
  }
  return true;
}
