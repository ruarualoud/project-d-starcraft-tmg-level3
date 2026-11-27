import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialModelBaseFootprintV1, evaluateOfficialPhysicalFootprintRelationV1 }
  from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { createOfficialDisplacementTokenFootprintV1 } from '../rule-atoms/official-token-displacement-geometry-v1.mjs';
import { inspectOfficialDarkSwarmPlacementBindingsV1 } from './official-dark-swarm-placement-v1.mjs';

export const OFFICIAL_DARK_SWARM_REACTION_DEFINITION_ID = 'unit:defiler/dark-swarm-assault-phase@1';
export const OFFICIAL_DARK_SWARM_REACTION_ATOM_ID = 'rule-atom:shared-friendly-dark-swarm-evade-eligibility-v1';
const liveModels = piece => (piece?.models || []).filter(model => model.isOnField !== false && !model.isDestroyed);

export function projectOfficialDarkSwarmReactionFactsV1(state, source, target) {
  if (!source || !target || source.sideKey !== target.sideKey || !source.isOnField || !target.isOnField
    || source.isDestroyed || target.isDestroyed) return [];
  const size = Number(target.sizeCharacteristic);
  if (!Number.isSafeInteger(size) || size < 1) throw Error('DARK_SWARM_TARGET_SIZE_REQUIRED');
  function minimumDistance(piece, footprint) {
    return Math.min(...liveModels(piece).map(model => evaluateOfficialPhysicalFootprintRelationV1({ left: footprint,
      right: createOfficialModelBaseFootprintV1({ piece, model, dataBundle: state.officialModelBaseGeometryDataBundle }) })
      .minimumSeparationMilliInches));
  }
  return inspectOfficialDarkSwarmPlacementBindingsV1(state).filter(row => row.binding.sideKey === source.sideKey)
    .flatMap(row => {
      const footprint = createOfficialDisplacementTokenFootprintV1(row.token);
      const sourceDistanceMilliInches = minimumDistance(source, footprint);
      const targetDistanceMilliInches = minimumDistance(target, footprint);
      if (sourceDistanceMilliInches > 4000 || targetDistanceMilliInches > 4000) return [];
      const body = { tokenId: row.token.tokenId, tokenHash: row.token.tokenHash,
        sourceBindingHash: row.binding.bindingHash, sourcePieceId: source.id, targetPieceId: target.id,
        sideKey: source.sideKey, sourceDistanceMilliInches, targetDistanceMilliInches,
        targetSize: size, evadeEligible: true, evadeModifier: size === 1 ? 1 : 0, trainingTruth: false };
      return [{ ...body, factsHash: hash(body) }];
    }).sort((left, right) => left.tokenId.localeCompare(right.tokenId));
}
