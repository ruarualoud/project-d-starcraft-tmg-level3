import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { verifyOfficialStructureSourceV1 } from '../source-data/official-structure-source-v1.mjs';
import { officialStructureDefinitionForPieceV1 } from '../rule-atoms/official-structure-rules-v1.mjs';

const adapterId = 'official-structure-family-adapter-v1';
export function createOfficialStructureFamilyAdapterV1(source) {
  verifyOfficialStructureSourceV1(source);
  return Object.freeze({
    descriptor: { adapterId, adapterVersion: '1.0.0', adapterKind: 'exact_runtime',
      coveredDefinitionCount: source.definitions.length,
      coveredSourceFeatureHashes: source.definitions.map(row => row.sourceFeatureHash),
      supportedOperations: ['legal_space', 'query'], rulesAuthority: true, trainingTruth: false },
    definitionBindings: source.definitions.map(row => ({ sourceFeatureHash: row.sourceFeatureHash,
      adapterId, adapterVersion: '1.0.0', capability: 'automatic_consumer' })),
    legalSpace() { return { candidates: [], parameterDomains: [] }; },
    query(state, request = {}) {
      if (!request.pieceId || Object.keys(request).some(key => key !== 'pieceId')
        || !isDeepStrictEqual(source, state.officialStructureSourceBundle)) throw Error('STRUCTURE_QUERY_BINDING_INVALID');
      const piece = state.pieces.find(row => row.id === request.pieceId);
      if (!piece) throw Error('STRUCTURE_QUERY_UNIT_MISSING');
      const definition = officialStructureDefinitionForPieceV1(state, piece);
      const structure = definition !== null;
      const body = { schema: 'starcraft_tmg_structure_constraints_v1', pieceId: piece.id,
        sourceDefinitionId: definition?.definitionId || null, sourceFeatureHash: definition?.sourceFeatureHash || null,
        stateHash: hash(state), constraints: { activationProhibited: structure, ordinaryActionsProhibited: structure,
          currentSupplyReplacement: structure ? 0 : null, missionControlProhibited: structure,
          missionContestProhibited: structure, abilityUnitTargetProhibitedUnlessExplicitException: structure },
        scope: 'Source-bound Structure restrictions. Explicit source-authorized reaction actions and effect recipients are handled by their own Rules owners.',
        mutationAuthority: false, trainingTruth: false };
      return { ...body, queryReceiptHash: hash(body) };
    },
  });
}
