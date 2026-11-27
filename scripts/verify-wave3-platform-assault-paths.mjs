import assert from 'node:assert/strict';
import { savedRoom } from './support/wave3-faq-room-v1.mjs';
import { save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { validateOfficialSelectedRosterRelocationGeometryV1 }
  from '../packages/product-composition/official-selected-roster-spatial-action-runtime-v1.mjs';
import { createOfficialModelBaseFootprintV1 }
  from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { deriveOfficialFinalPlacementSurfaceSupportV13 }
  from '../packages/rule-atoms/official-semantic-surface-support-v1.mjs';

const directory = 'build/ticket-28-wave3-premade-flight-and-platform';
const { head } = await savedRoom(directory, 'wave3-flight-and-platform');
assert.equal(head.stateRevision, 6);
const state = head.state;
const unit = state.pieces.find(piece => piece.id === 'hydralisk');
function point(model, x) {
  const position = { xMilliInches: x, yMilliInches: Math.round(model.yInches * 1000),
    rotationDegrees: model.baseRotationDegrees };
  const footprint = createOfficialModelBaseFootprintV1({ dataBundle: state.officialModelBaseGeometryDataBundle,
    piece: unit, model, position });
  const { elevation, supportTerrainIds } = deriveOfficialFinalPlacementSurfaceSupportV13(state, footprint);
  return { ...position, elevation, supportTerrainIds };
}
const finish = unit.models.map(model => point(model, 24800));
assert(finish.every(p => p.elevation === 'high' && p.rotationDegrees === 90));
const checks = [];
for (const actionType of ['charge', 'close_ranks']) {
  const verify = path => validateOfficialSelectedRosterRelocationGeometryV1({ state, pieceId: unit.id,
    actionType, maxDistanceMilliInches: 3000, coherencyRangeMilliInches: 3000,
    parameters: { leadingModelId: unit.models[0].id, path,
      placements: [{ modelId: unit.models[1].id, ...finish[1] }] } });
  const accepted = verify([finish[0]]);
  assert.equal(accepted.distanceTravelledMilliInches, 200);
  const detour = point(unit.models[0], 23400);
  const returned = verify([point(unit.models[0], 24500), finish[0]]);
  assert.equal(returned.distanceTravelledMilliInches, 400);
  let rejection;
  assert.throws(() => verify([detour, finish[0]]), error => {
    rejection = error.message;
    return rejection.startsWith('SELECTED_SPATIAL_TERRAIN_PATH_BLOCKED:ramp-west');
  });
  checks.push({ actionType, directMilliInches: accepted.distanceTravelledMilliInches,
    returnMilliInches: returned.distanceTravelledMilliInches, terrainResultHash: accepted.terrainResultHash, rejection });
}
await save(directory + '/assault-paths.public.json', { roomId: head.roomId, sourceRevision: head.stateRevision,
  sourceStateHash: head.stateHash, checks, scope: 'shared Native charge and close ranks geometry only; no target, roll or action committed',
  providerCalls: 0 });
