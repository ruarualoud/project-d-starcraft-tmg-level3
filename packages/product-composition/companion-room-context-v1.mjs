import { assertSameOfficialQueryReleaseV2 } from '../source-data/official-release-context-v2.mjs';

// A companion needs the current player-visible battlefield, not every frozen
// catalogue and compilation audit embedded in the Native execution envelope.
// Terrain is dictionary encoded without approximating its footprints.
const clone = value => structuredClone(value);
export function encodeCompanionTerrainV1(terrain) {
  const groups = [], byCommon = new Map();
  for (const [index, piece] of (terrain || []).entries()) {
    const { id, terrainId, terrainHash, footprint, originalFootprint, ...common } = piece;
    const key = JSON.stringify(common);
    let group = byCommon.get(key);
    if (!group) { group = { common: clone(common), cells: [] }; byCommon.set(key, group); groups.push(group); }
    group.cells.push([index, id, terrainId, clone(footprint),
      JSON.stringify(originalFootprint) === JSON.stringify(footprint) ? '=' : clone(originalFootprint)]);
  }
  return { encoding: 'shared_properties_and_cells_v1',
    columns: ['originalIndex', 'id', 'terrainId', 'footprint', 'originalFootprint (= means same as footprint)'],
    coordinateUnit: 'milli-inch', count: (terrain || []).length, groups,
    excludedMetadata: ['terrainHash'], geometrySimplified: false };
}
export function decodeCompanionTerrainV1(table) {
  return table.groups.flatMap(group => group.cells.map(([index, id, terrainId, footprint, original]) => ({
    index, piece: { ...clone(group.common), id, terrainId, footprint: clone(footprint),
      originalFootprint: clone(original === '=' ? footprint : original) },
  }))).sort((a, b) => a.index - b.index).map(row => row.piece);
}
export function projectCompanionRoomContextV1(roomProjection, workbench) {
  const release = roomProjection.matchBinding?.releaseBinding;
  assertSameOfficialQueryReleaseV2(release, workbench?.releaseBinding);
  if (release && (roomProjection.room.roomId !== workbench.roomId
    || roomProjection.matchBinding.bindingHash !== workbench.matchBindingHash
    || roomProjection.room.stateRevision !== workbench.stateRevision
    || roomProjection.room.stateHash !== workbench.stateHash
    || roomProjection.viewer.seatKey !== workbench.viewerSideKey)) {
    throw Object.assign(Error('COMPANION_ROOM_CONTEXT_STALE'), {code:'COMPANION_ROOM_CONTEXT_STALE'});
  }
  const source = roomProjection.state || {};
  const excluded = Object.keys(source).filter(key =>
    /(?:DataBundle|ProfileBundle|RulesHistory|GeometryHistory|DraftHistory|LifecycleHistory)$/u.test(key));
  const state = Object.fromEntries(Object.entries(source).filter(([key]) => !excluded.includes(key)));
  const { terrain, ...board } = source.board || {};
  state.board = { ...board, terrainTable: encodeCompanionTerrainV1(terrain) };
  return { room: roomProjection.room, viewer: roomProjection.viewer,
    matchBinding: roomProjection.matchBinding, state, workbench, visibility: 'player_visible',
    projectionContract: { version: 'companion_current_battlefield_v1',
      excludedStaticCatalogueAndCompilationSections: excluded,
      currentPiecesResourcesMissionAndWorkbenchPreserved: true,
      terrainCount: (terrain || []).length, terrainGeometryApproximation: false,
      instruction: 'Use current battlefield and workbench facts. Static catalogue and compilation history are not included. If these facts do not establish an answer, say it is unknown; never reconstruct rules from memory. Terrain groups apply their common properties to every listed cell, with exact footprints.' } };
}
