import { createOfficialBattlefieldTokenPhysicalFootprintV1, createOfficialModelBaseFootprintV1,
  createOfficialTerrainCellFootprintsV1, doOfficialPhysicalFootprintsOverlapV1, evaluateOfficialBaseMeasurementV1,
  officialTerrainBlocksModelPlacementV1 } from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { verifyOfficialBattlefieldTokenV1 } from '../rule-atoms/official-battlefield-token-marker-rules-kernel-v1.mjs';

export const listOfficialOnFieldModelFootprintsV1 = (piece, dataBundle) => (piece.models || [])
  .filter(model => model.isOnField !== false && model.isDestroyed !== true)
  .map(model => createOfficialModelBaseFootprintV1({ piece, model, dataBundle }));

export function assertOfficialTokenPlacementSpaceV1(state, casterBases, placements, occupiedError, ignoredTokenIds = new Set()) {
  const dataBundle = state.officialModelBaseGeometryDataBundle;
  const occupiedByModels = state.pieces.filter(piece => piece.isOnField === true && piece.isDestroyed !== true)
    .flatMap(piece => listOfficialOnFieldModelFootprintsV1(piece, dataBundle));
  const occupiedByTerrain = (state.board.terrain || []).filter(terrain =>
    !terrain.isRemoved && !terrain.isDestroyed && officialTerrainBlocksModelPlacementV1(terrain))
    .flatMap(createOfficialTerrainCellFootprintsV1);
  const blockers = [...occupiedByModels, ...occupiedByTerrain];
  for (const placement of placements) {
    if (blockers.some(blocker => doOfficialPhysicalFootprintsOverlapV1(placement, blocker))) {
      throw Error(occupiedError);
    }
  }
  // Some older official board tokens are data-backed legacy shapes. Resolve
  // them through the same reference reader as the host's base-edge query.
  for (const token of state.board.tokens || []) {
    if (token.isRemoved || token.isDestroyed || ignoredTokenIds.has(token.tokenId || token.id)) continue;
    const registry = state.officialBattlefieldTokenMarkerRegistry;
    let blocker;
    if (token.tokenId) {
      verifyOfficialBattlefieldTokenV1(token, registry);
      blocker = createOfficialBattlefieldTokenPhysicalFootprintV1(token);
    } else {
      const source = casterBases[0];
      const measurement = evaluateOfficialBaseMeasurementV1({ state, dataBundle,
        source: { kind: 'model', unitId: source.unitId, modelId: source.objectId },
        target: { kind: 'token', id: token.id } });
      blocker = measurement.target.footprint;
    }
    if (placements.some(placement => doOfficialPhysicalFootprintsOverlapV1(placement, blocker))) {
      throw Error(occupiedError);
    }
  }
}
