// Concrete bug: the real model observation repeats all1804 terrain IDs in
// objectId and footprint.objectId even after the existing V1 column encoding.
// Exact signed inputs; no Room/model calls; old codec remains untouched.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createStarcraftTmgPlayerSpatialObservationV1 } from
  '../packages/online-agent-session/player-spatial-observation-v1.mjs';
import { projectStarcraftTmgStateForViewerV3 } from
  '../packages/room-runtime/in-memory-room-v1.mjs';
import { decodeStarcraftTmgGeometryTableV1 } from
  '../packages/online-agent-session/exact-geometry-column-table-v1.mjs';
import { hashStarcraftTmgContract as hash } from
  '../packages/authoritative-engine/referee-crypto-v1.mjs';

const [caseDirectory, baselinePath, reportPath] = process.argv.slice(2);
assert(caseDirectory && baselinePath && reportPath);
const prestate = JSON.parse(await readFile(caseDirectory + '/signed-prestate.private.json', 'utf8'));
const decision = JSON.parse(await readFile(caseDirectory + '/decision.private.json', 'utf8'));
const originalInputsHash = hash({ prestate, decision });
const projection = {
  room: { roomId: prestate.roomId, stateRevision: prestate.stateRevision,
    stateHash: prestate.stateHash },
  matchBinding: prestate.matchBinding,
  viewer: { seatKey: decision.authority.seatKey, visibilityScope: 'seat' },
  state: projectStarcraftTmgStateForViewerV3(prestate.state, decision.authority.seatKey),
};
const legal = { ...projection.room, matchBindingHash: prestate.matchBindingHash,
  legalSpaceHash: decision.authority.legalSpaceHash };
const observation = createStarcraftTmgPlayerSpatialObservationV1({
  roomProjection: projection, legalSpace: legal,
});
assert.equal(observation.observationHash, decision.authority.spatialObservationHash,
  'must be the actual signed observation the paid model received');
assert.equal(observation.terrain.length, 1804);
const observationHash = hash(observation);
const portUrl = new URL('../packages/online-agent-session/live-flash-decision-port-v1.mjs', import.meta.url);
const codecUrl = new URL('../packages/online-agent-session/exact-geometry-column-table-v1.mjs', import.meta.url);
const oldCodecHash = hash(await readFile(codecUrl, 'utf8'));
const source = (await readFile(portUrl, 'utf8')).replace(
  /(\bfrom\s+["'])(\.[^"']+)(["'])/gu, (_, before, relative, after) =>
    before + new URL(relative, portUrl).href + after)
  + '\nexport { compactSpatialObservation as probeActualCurrentObservation };\n';
const native = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const projected = native.probeActualCurrentObservation(observation);
let decode = decodeStarcraftTmgGeometryTableV1;
try {
  const codec = await import('../packages/online-agent-session/exact-geometry-column-reuse-v2.mjs');
  decode = codec.decodeStarcraftTmgGeometryColumnReuseV2;
} catch (error) {
  // The red run intentionally exercises the original producer before the V2
  // implementation exists. Other import/runtime faults are never hidden.
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
}
let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, 'utf8')); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  baseline = { originalInputsHash, observationHash, oldCodecHash, projected };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
}
assert.equal(originalInputsHash, baseline.originalInputsHash);
assert.equal(observationHash, baseline.observationHash);
assert.equal(oldCodecHash, baseline.oldCodecHash, 'published V1 codec remains byte-identical');
const priorTerrain = decodeStarcraftTmgGeometryTableV1(baseline.projected.terrain);
assert.deepEqual(decode(projected.terrain), priorTerrain,
  'every original field/value/order/unknown must be exactly recoverable');
assert.deepEqual(decode(baseline.projected.terrain), priorTerrain,
  'new reader still reads saved V1 tables');
const expected = { ...baseline.projected, terrain: projected.terrain };
assert.deepEqual(projected, expected, 'only terrain transport representation changes');
assert.equal(hash(observation), observationHash);
assert.equal(hash({ prestate, decision }), originalInputsHash);
let duplicateVariableColumns = 0;
for (const group of projected.terrain.groups || []) {
  group.columns.forEach((column, index) => {
    if (group.columns.slice(0, index).some((_, earlier) =>
      group.rows.every(row => JSON.stringify(row[index]) === JSON.stringify(row[earlier])))) {
      duplicateVariableColumns++;
    }
  });
}
const originalBytes = Buffer.byteLength(JSON.stringify(baseline.projected));
const projectedBytes = Buffer.byteLength(JSON.stringify(projected));
const report = { operation: 'current_observation_repeated_terrain_identity_column',
  stateRevision: prestate.stateRevision, terrainRows: observation.terrain.length,
  originalInputsHash, observationHash, oldCodecHash,
  duplicateVariableColumns, encoding: projected.terrain.encoding,
  originalBytes, projectedBytes, bytesSaved: originalBytes - projectedBytes,
  allFieldsRecoverable: true, allOtherObservationFieldsEqual: true,
  oldCodecUnchanged: true, sourceUnchanged: true,
  providerCalls: 0, originalRoomWrites: 0,
  measuredModelLatencyOrStrategyImprovement: false, trainingTruth: false };
await writeFile(reportPath, JSON.stringify(report), { mode: 0o600 });
console.log(JSON.stringify(report));
assert.equal(duplicateVariableColumns, 0,
  'CURRENT_SPATIAL_OBSERVATION_REPEATS_IDENTICAL_TERRAIN_IDENTITY_COLUMNS');
assert(projectedBytes < originalBytes, 'actual complete projected observation must be smaller');
