import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { verifyOfficialAbilityEffectIrCatalogueV1 } from './official-ability-effect-ir-v1.mjs';

const definitionId = 'unit:holo_decoy/decoy-any-phase@1';
const sourceText = 'This Unit is never Engaged. It cannot Engage Enemy Units, cannot be Engaged by Enemy Units and cannot perform a Charge Action. This Unit cannot be the target of an ability, unless stated otherwise. It can never Control or Contest Mission Markers.';
const prohibitions = Object.freeze({ engagement: true, charge: true, abilityTarget: true, missionControlAndContest: true });
export const OFFICIAL_DECOY_RULE_ATOM_IDS = Object.freeze([
  'rule-atom:holo-decoy-never-engaged-v1', 'rule-atom:holo-decoy-charge-prohibited-v1',
  'rule-atom:holo-decoy-ability-target-prohibited-v1', 'rule-atom:holo-decoy-mission-control-prohibited-v1',
]);
const withoutHash = source => Object.fromEntries(Object.entries(source).filter(([key]) => key !== 'bundleHash'));

export function createOfficialDecoySourceV1({ catalogue } = {}) {
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  const source = catalogue.definitions.find(row => row.definitionId === definitionId);
  if (source?.recordKey !== 'army_units:holo_decoy' || source.definitionName !== 'Decoy'
    || source.activationKind !== 'passive' || source.phase !== 'any' || source.sourceText !== sourceText) {
    throw Error('DECOY_SOURCE_UNSUPPORTED');
  }
  const body = { schema: 'starcraft_tmg_official_decoy_source_v1', version: '1.0.0', definitionId,
    sourceFeatureHash: source.sourceFeatureHash, recordKey: source.recordKey,
    sourceRecordHash: source.sourceRecordHash, payloadHash: source.payloadHash, sourceText,
    sourceSnapshotHash: catalogue.sourceSnapshotHash, normalizedDatasetHash: catalogue.normalizedDatasetHash,
    prohibitions, ruleAtomIds: OFFICIAL_DECOY_RULE_ATOM_IDS, trainingTruth: false };
  return Object.freeze({ ...body, bundleHash: hash(body) });
}

export function verifyOfficialDecoySourceV1(source) {
  if (source?.schema !== 'starcraft_tmg_official_decoy_source_v1' || source.version !== '1.0.0'
    || source.definitionId !== definitionId || source.recordKey !== 'army_units:holo_decoy' || source.sourceText !== sourceText
    || !isDeepStrictEqual(source.prohibitions, prohibitions) || !isDeepStrictEqual(source.ruleAtomIds, OFFICIAL_DECOY_RULE_ATOM_IDS)
    || !['sourceFeatureHash', 'sourceRecordHash', 'payloadHash', 'sourceSnapshotHash', 'normalizedDatasetHash']
      .every(key => /^[a-f0-9]{64}$/u.test(source[key]))
    || source.trainingTruth !== false || source.bundleHash !== hash(withoutHash(source))) throw Error('DECOY_SOURCE_INVALID');
  return true;
}
