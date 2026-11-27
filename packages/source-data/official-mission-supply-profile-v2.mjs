import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { assertOfficialReleaseSourceV2 } from './official-release-context-v2.mjs';
import { resolveOfficialMissionEngagementScaleV1 } from './official-mission-deployment-draft-data-bundle-v1.mjs';

const schema = 'starcraft_tmg_official_mission_supply_profile_v2';
const withoutHash = profile => Object.fromEntries(Object.entries(profile).filter(([key]) => key !== 'profileHash'));
function numberField(value, minimum) {
  if (!/^\d+$/u.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < minimum) {
    throw Error('MISSION_SUPPLY_SOURCE_NUMBER_UNSUPPORTED');
  }
  return Number(value);
}
function pacing(fields) {
  const extra = String(fields.extraSupply).match(/^(\d+) per round$/iu);
  if (!extra) throw Error('MISSION_SUPPLY_ESCALATION_UNSUPPORTED');
  return { gameLengthRounds: numberField(fields.gameLength, 1), startingSupply: numberField(fields.startingSupply, 0),
    extraSupplyPerRound: numberField(extra[1], 0) };
}

export function createOfficialMissionSupplyProfileV2({ context, missionRecordKey } = {}) {
  assertOfficialReleaseSourceV2(context, context || {});
  const record = context.dataset.recordsByKey[missionRecordKey];
  const payload = record?.payload;
  if (payload?.type !== 'mission') throw Error('MISSION_SUPPLY_SOURCE_REQUIRED');
  const engagementScale = resolveOfficialMissionEngagementScaleV1(payload.format, 'MISSION_SUPPLY_SOURCE_REQUIRED');
  if (!['Standard', 'Skirmish'].includes(engagementScale)) throw Error('MISSION_SUPPLY_SOURCE_REQUIRED');
  const sourceFields = { gameLength: payload.gameLength, startingSupply: payload.startingSupply, extraSupply: payload.extraSupply };
  const body = { schema, semanticVersion: '2.0.0', recordKey: missionRecordKey, sourceRecordHash: record.sourceRecordHash,
    payloadHash: record.payloadHash, sourceSnapshotHash: context.snapshot.snapshotHash, normalizedDatasetHash: context.dataset.datasetHash,
    engagementScale,
    sourceFields, ...pacing(sourceFields), trainingTruth: false };
  return Object.freeze({ ...body, sourceFields: Object.freeze(sourceFields), profileHash: hash(body) });
}

export function verifyOfficialMissionSupplyProfileV2(profile) {
  if (profile?.schema !== schema || profile.semanticVersion !== '2.0.0'
    || !['Standard', 'Skirmish'].includes(profile.engagementScale)
    || !['sourceRecordHash', 'payloadHash', 'sourceSnapshotHash', 'normalizedDatasetHash'].every(key => /^[a-f0-9]{64}$/u.test(profile[key]))
    || !profile.sourceFields || profile.trainingTruth !== false || profile.profileHash !== hash(withoutHash(profile))) {
    throw Error('MISSION_SUPPLY_PROFILE_INVALID');
  }
  const values = pacing(profile.sourceFields);
  if (Object.keys(values).some(key => values[key] !== profile[key])) throw Error('MISSION_SUPPLY_PROFILE_INVALID');
  return true;
}
