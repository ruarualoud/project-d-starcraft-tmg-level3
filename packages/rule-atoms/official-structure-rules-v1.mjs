import { verifyOfficialStructureSourceV1 } from '../source-data/official-structure-source-v1.mjs';

export function officialStructureDefinitionForPieceV1(state, piece) {
  const source = state?.officialStructureSourceBundle;
  if (source === undefined) return null;
  verifyOfficialStructureSourceV1(source);
  const definition = source.definitions.find(row => row.recordKey === piece?.officialUnitRecordKey);
  if (!definition) return null;
  if (piece.sourceRecordHash !== definition.sourceRecordHash || piece.officialPayloadHash !== definition.payloadHash
    || piece.isStructure !== true) throw Error('STRUCTURE_UNIT_SOURCE_MISMATCH');
  return definition;
}

export function isOfficialSourceBoundStructureV1(state, piece) {
  return officialStructureDefinitionForPieceV1(state, piece) !== null;
}
