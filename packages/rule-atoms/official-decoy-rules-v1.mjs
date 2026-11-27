import { verifyOfficialDecoySourceV1 } from '../source-data/official-decoy-source-v1.mjs';
import { isOfficialSourceBoundStructureV1 } from './official-structure-rules-v1.mjs';

export function isOfficialDecoyUnitV1(state, piece) {
  const source = state?.officialDecoySourceBundle;
  if (source === undefined) return false;
  verifyOfficialDecoySourceV1(source);
  if (piece?.officialUnitRecordKey !== source.recordKey) return false;
  if (piece.sourceRecordHash !== source.sourceRecordHash || piece.officialPayloadHash !== source.payloadHash) {
    throw Error('DECOY_UNIT_SOURCE_MISMATCH');
  }
  return true;
}

export function canOfficialUnitsEngageV1(state, left, right) {
  return !isOfficialDecoyUnitV1(state, left) && !isOfficialDecoyUnitV1(state, right);
}

export function canOfficialUnitChargeV1(state, piece) {
  return !isOfficialDecoyUnitV1(state, piece);
}

export function canOfficialUnitControlOrContestV1(state, piece) {
  return !isOfficialDecoyUnitV1(state, piece) && !isOfficialSourceBoundStructureV1(state, piece);
}

// Actual Unit recipients only. This does not prohibit attacks, measurements,
// placement references, or untargeted effects that use their own consumers.
export function canOfficialUnitBeAbilityTargetV1(state, piece) {
  return !isOfficialDecoyUnitV1(state, piece) && !isOfficialSourceBoundStructureV1(state, piece);
}
