import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { assertOfficialReleaseSourceV2 } from './official-release-context-v2.mjs';
import { verifyOfficialAbilityEffectIrCatalogueV1 } from './official-ability-effect-ir-v1.mjs';

const routes = {
  'unit:holo_decoy/timed-life-any-phase@1': { recordKey: 'army_units:holo_decoy', name: 'Timed Life', kind: 'remove_source', optional: false,
    text: 'Remove this Unit at the End of the Round.' },
  'unit:holo_decoy/surprise-any-phase@1': { recordKey: 'army_units:holo_decoy', name: 'Surprise!', kind: 'set_nova', optional: true,
    text: 'At the End of the Round, you can set a Friendly Nova Stealth Mode or Nova Assault Mode in Coherency with this Unit.' },
  'unit:auto_turret/timed-life-any-phase@1': { recordKey: 'army_units:auto_turret', name: 'Timed Life', kind: 'remove_source', optional: false,
    text: 'Remove this Unit at the End of the Round.' },
};
const novaRecords = ['army_units:nova_assault_mode', 'army_units:nova_stealth_mode'];
const ruleAtomIds = ['rule-atom:holo-round-end-controller-order-v1', 'rule-atom:holo-timed-life-removal-v1',
  'rule-atom:holo-surprise-source-relative-coherency-v1'];
const withoutHash = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'bundleHash'));

export function createOfficialHoloRoundEndSourceV1({ context, catalogue, definitionIds } = {}) {
  assertOfficialReleaseSourceV2(context, context || {}); verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  if (!['1.3.0', '1.4.0'].includes(catalogue.semanticVersion) || catalogue.sourceSnapshotHash !== context.snapshot.snapshotHash
    || catalogue.normalizedDatasetHash !== context.dataset.datasetHash
    || !Array.isArray(definitionIds) || !definitionIds.length || new Set(definitionIds).size !== definitionIds.length
    || definitionIds.some(id => !routes[id])) throw Error('HOLO_ROUND_END_SOURCE_SELECTION_INVALID');
  const definitions = [...definitionIds].sort().map(id => {
    const definition = catalogue.definitions.find(row => row.definitionId === id), route = routes[id];
    if (!definition || definition.recordKey !== route.recordKey || definition.sourceText !== route.text
      || definition.definitionName !== route.name || definition.phase !== 'any' || definition.activationKind !== 'passive'
      || !definition.timingHooks.includes('round_end')) throw Error('HOLO_ROUND_END_DEFINITION_DRIFT');
    return { definitionId: id, definitionName: route.name, effectKind: route.kind, optional: route.optional,
      recordKey: route.recordKey, sourceText: route.text, sourceFeatureHash: definition.sourceFeatureHash,
      sourceRecordHash: definition.sourceRecordHash, payloadHash: definition.payloadHash };
  });
  const core = context.dataset.recordsByKey['rules_sections:iuUyObNTQ2M8xK4IUqzC'];
  const order = core.payload.items.find(row => row.title === '8.9 PHASE 4: THE SCORING & CLEANUP PHASE')
    ?.subItems.find(row => row.title === '8.9.4 Resolve End of the Round Effects');
  const orderText = order?.content.filter(row => row.type === 'text').map(row => row.value).join('\n');
  if (!orderText?.includes('First Player Marker') || !orderText.includes('Each effect is fully resolved before the next begins.')) {
    throw Error('HOLO_ROUND_END_ORDER_SOURCE_MISSING');
  }
  const ruleSources = [
    ['rules_sections:H3Fn8YSvEvpJZpT57qw1', '10.1 Special Abilities'],
    ['rules_sections:I03mzBYujgXw6xN2qXhH', '4.4 Unit Coherency'],
  ].map(([key, title]) => {
    const record = context.dataset.recordsByKey[key], item = record?.payload.items.find(row => row.title === title);
    if (!item?.content?.length) throw Error('HOLO_ROUND_END_REQUIREMENTS_SOURCE_MISSING');
    return { recordKey: key, sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash,
      section: title, textHash: hash(item.content) };
  });
  const reservesRecord = context.dataset.recordsByKey['rules_sections:FuahgilWtc8nccVSp2Vv'];
  const reserves = reservesRecord?.payload.items[0].subItems.find(row => row.title === 'RESERVES');
  if (!reserves?.content?.length) throw Error('HOLO_ROUND_END_RESERVES_SOURCE_MISSING');
  ruleSources.push({ recordKey: reservesRecord.recordKey, sourceRecordHash: reservesRecord.sourceRecordHash,
    payloadHash: reservesRecord.payloadHash, section: 'RESERVES', textHash: hash(reserves.content) });
  const generalized = definitions.some(row => row.recordKey === 'army_units:auto_turret');
  const hasSurprise = definitions.some(row => row.effectKind === 'set_nova');
  const selectedNovaRecords = generalized && !hasSurprise ? [] : novaRecords;
  const selectedAtomIds = generalized && !hasSurprise ? ruleAtomIds.slice(0, 2) : ruleAtomIds;
  const novaProfiles = selectedNovaRecords.map(key => {
    const record = context.dataset.recordsByKey[key];
    if (record?.payload.small.models !== 1) throw Error('HOLO_SURPRISE_NOVA_PROFILE_UNSUPPORTED');
    return { recordKey: key, sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash, models: 1 };
  });
  const body = { schema: 'starcraft_tmg_holo_round_end_source_v1', version: generalized ? '1.1.0' : '1.0.0',
    sourceCatalogueHash: catalogue.catalogueHash, sourceSnapshotHash: context.snapshot.snapshotHash,
    normalizedDatasetHash: context.dataset.datasetHash, definitionIds: definitions.map(row => row.definitionId), definitions,
    generatedUnitRecordKeys: [...new Set(definitions.map(row => row.recordKey))].sort(),
    novaRecordKeys: selectedNovaRecords, novaProfiles, ruleSources,
    orderSource: { recordKey: core.recordKey, sourceRecordHash: core.sourceRecordHash,
      payloadHash: core.payloadHash, section: order.title, textHash: hash(orderText) },
    firstPlayerEffectsFirst: true, controllerChoosesEffectOrder: true, sourceMustBeOnField: true,
    targetPolicy: { onFieldOnly: true, sameSide: true, existingIdentityOnly: true, lineOfSightRequired: true },
    ruleAtomIds: selectedAtomIds, compilerScope: generalized ? 'current_unit_end_round_subset' : 'current_holo_end_round_subset',
    productionRoomEligible: false, trainingTruth: false };
  return Object.freeze({ ...body, bundleHash: hash(body) });
}

export function verifyOfficialHoloRoundEndSourceV1(source) {
  const generalized = source?.definitions?.some(row => row.recordKey === 'army_units:auto_turret') === true;
  const hasSurprise = source?.definitions?.some(row => row.effectKind === 'set_nova') === true;
  if (source?.schema !== 'starcraft_tmg_holo_round_end_source_v1' || source.version !== (generalized ? '1.1.0' : '1.0.0')
    || !Array.isArray(source.definitions) || !source.definitions.length
    || !isDeepStrictEqual(source.definitionIds, source.definitions.map(row => row.definitionId))
    || new Set(source.definitionIds).size !== source.definitionIds.length
    || source.definitions.some(row => !routes[row.definitionId] || row.recordKey !== routes[row.definitionId].recordKey
      || row.sourceText !== routes[row.definitionId].text || row.effectKind !== routes[row.definitionId].kind
      || row.optional !== routes[row.definitionId].optional)
    || !isDeepStrictEqual(source.novaRecordKeys, generalized && !hasSurprise ? [] : novaRecords)
    || !isDeepStrictEqual(source.generatedUnitRecordKeys, [...new Set(source.definitions.map(row => row.recordKey))].sort())
    || !isDeepStrictEqual(source.ruleAtomIds, generalized && !hasSurprise ? ruleAtomIds.slice(0, 2) : ruleAtomIds)
    || source.bundleHash !== hash(withoutHash(source)) || source.trainingTruth !== false) throw Error('HOLO_ROUND_END_SOURCE_INVALID');
  return true;
}
