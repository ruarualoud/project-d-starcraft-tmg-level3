import { OFFICIAL_KHALAS_GIFT_DEFINITION_ID } from './official-khalas-gift-v1.mjs';
import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { assertOfficialReleaseSourceV2 } from '../source-data/official-release-context-v2.mjs';

const sectionKey = 'rules_sections:H3Fn8YSvEvpJZpT57qw1';
const sourceClause = 'The target must be Within Range and Line of Sight (unless the ability explicitly states otherwise).';
export const OFFICIAL_FARSIGHT_ACTIVE_DEFINITION_ID = 'unit:high_templar/farsight-movement-phase@1';
export const OFFICIAL_RAVEN_ANTI_ARMOUR_MISSILE_DEFINITION_ID = 'unit:raven/anti-armour-missile-movement-phase@1';
export const OFFICIAL_RAVEN_SEEKER_MISSILE_DEFINITION_ID = 'unit:raven/seeker-missile-movement-phase@1';
export const OFFICIAL_FEEDBACK_DEFINITION_IDS = Object.freeze([
  'unit:high_templar/feedback-movement-phase@1',
  'unit:twilight_templar__high_templar_/feedback-movement-phase@1',
]);
export const OFFICIAL_MEDPACK_DEFINITION_ID = 'unit:medic/medpack-movement-phase@1';
export const OFFICIAL_OPTICAL_FLARE_DEFINITION_ID = 'unit:medic/optical-flare-movement-phase@1';
export const OFFICIAL_KERRIGAN_TARGETED_ACTIVE_DEFINITION_IDS = Object.freeze([
  'unit:kerrigan/crushing-grip-movement-phase@1',
  'unit:kerrigan/mutating-carapace-movement-phase@1',
]);
const targetedDefinitionIds = new Set([OFFICIAL_FARSIGHT_ACTIVE_DEFINITION_ID, OFFICIAL_KHALAS_GIFT_DEFINITION_ID,
  OFFICIAL_RAVEN_ANTI_ARMOUR_MISSILE_DEFINITION_ID, OFFICIAL_RAVEN_SEEKER_MISSILE_DEFINITION_ID,
  OFFICIAL_MEDPACK_DEFINITION_ID, OFFICIAL_OPTICAL_FLARE_DEFINITION_ID, ...OFFICIAL_FEEDBACK_DEFINITION_IDS,
  ...OFFICIAL_KERRIGAN_TARGETED_ACTIVE_DEFINITION_IDS]);

export function selectOfficialTargetedActiveDefinitionIdsV1(definitionIds = []) {
  return definitionIds.filter(id => targetedDefinitionIds.has(id));
}

export function selectOfficialBoundTargetedActiveDefinitionIdsV1(state) {
  const characteristicIds = state.officialCharacteristicStatusFamilySourceBundle?.definitionIds ?? [];
  const selectedIds = state.officialSelectedRosterAbilitySourceBundle?.routes.map(route => route.definitionId) ?? [];
  return selectOfficialTargetedActiveDefinitionIdsV1([...characteristicIds, ...selectedIds]);
}

export function createOfficialTargetedActiveAbilityPolicyV1({ context, definitionIds }) {
  assertOfficialReleaseSourceV2(context, context || {});
  const source = context.dataset.recordsByKey[sectionKey];
  const rules = source?.payload.items.find(row => row.title === '10.1 Special Abilities');
  const text = rules?.content.filter(row => row.type === 'text').map(row => row.value).join('\n')
    .replace(/<[^>]*>/gu, '');
  if (!text?.includes(sourceClause)) throw Error('TARGETED_ACTIVE_ABILITY_LOS_SOURCE_REQUIRED');
  const body = { schema: 'starcraft_tmg_targeted_active_ability_policy_v1', version: '1.0.0',
    normalizedDatasetHash: context.dataset.datasetHash, sourceSnapshotHash: context.snapshot.snapshotHash,
    rulesRecordHash: source.sourceRecordHash, rulesPayloadHash: source.payloadHash,
    definitionIds: [...new Set(definitionIds)].sort(), requireRangeAndLineOfSight: true, trainingTruth: false };
  return { ...body, policyHash: hash(body) };
}

export function verifyOfficialTargetedActiveAbilityPolicyV1(context, state) {
  const policy = state.officialTargetedActiveAbilityPolicy;
  if (policy === undefined) return null;
  const ids = selectOfficialBoundTargetedActiveDefinitionIdsV1(state);
  if (!ids.length
    || !isDeepStrictEqual(policy, createOfficialTargetedActiveAbilityPolicyV1({
      context, definitionIds: ids,
    }))) throw Error('TARGETED_ACTIVE_ABILITY_LOS_POLICY_MISMATCH');
  return policy;
}
