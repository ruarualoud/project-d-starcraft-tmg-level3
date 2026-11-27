import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { verifyOfficialDecoySourceV1 } from '../source-data/official-decoy-source-v1.mjs';
import { isOfficialDecoyUnitV1 } from '../rule-atoms/official-decoy-rules-v1.mjs';

const adapterId = 'official-decoy-family-adapter-v1';
export function createOfficialDecoyFamilyAdapterV1(source) {
  verifyOfficialDecoySourceV1(source);
  return Object.freeze({
    descriptor: { adapterId, adapterVersion: '1.0.0', adapterKind: 'exact_runtime',
      coveredDefinitionCount: 1, coveredSourceFeatureHashes: [source.sourceFeatureHash],
      supportedOperations: ['legal_space', 'query'], rulesAuthority: true, trainingTruth: false },
    definitionBindings: [{ sourceFeatureHash: source.sourceFeatureHash, adapterId,
      adapterVersion: '1.0.0', capability: 'automatic_consumer' }],
    legalSpace() { return { candidates: [], parameterDomains: [] }; },
    query(state, request = {}) {
      if (!request.pieceId || Object.keys(request).some(key => key !== 'pieceId')
        || !isDeepStrictEqual(source, state.officialDecoySourceBundle)) throw Error('DECOY_QUERY_BINDING_INVALID');
      const piece = state.pieces.find(row => row.id === request.pieceId);
      if (!piece) throw Error('DECOY_QUERY_UNIT_MISSING');
      const decoy = isOfficialDecoyUnitV1(state, piece);
      const body = { schema: 'starcraft_tmg_decoy_constraints_v1', pieceId: piece.id,
        sourceDefinitionId: source.definitionId, sourceFeatureHash: source.sourceFeatureHash, stateHash: hash(state),
        constraints: { neverEngaged: decoy, chargeProhibited: decoy, abilityTargetProhibited: decoy,
          missionControlProhibited: decoy, missionContestProhibited: decoy },
        scope: 'Decoy restrictions only. Other action and geometry conditions are evaluated by their own Rules owners.',
        mutationAuthority: false, trainingTruth: false };
      return { ...body, queryReceiptHash: hash(body) };
    },
  });
}
