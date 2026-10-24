#!/usr/bin/env node

// Actual C82 casualty/control call site: every nearby model revalidates the
// same 1804 terrain rows. This fixture is NOT a full-room or strategy proof.
import assert from "node:assert/strict";
import { Hash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolveOfficialMissionMarkerControlV2 as control } from
  "../packages/rule-atoms/official-mission-marker-control-kernel-v1.mjs";
import * as los from
  "../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const [capturePath, baselinePath] = process.argv.slice(2);
assert(capturePath && baselinePath);
const capture = JSON.parse(await readFile(capturePath, "utf8"));
const envelope = capture.aggregate.envelope;
assert.equal(capture.aggregate.stateRevision, 82);
const state = structuredClone(envelope.state);
state.phase = "cleanup";
state.pieces = state.pieces.filter(p => ["player1-marine-3", "player2-kerrigan-raptor"]
  .includes(p.id));
assert.equal(state.pieces.length, 2);
assert.equal(state.board.terrain.length, 1804);
const afterCasualty = structuredClone(state);
const raptor = afterCasualty.pieces.find(p => p.id === "player2-kerrigan-raptor");
raptor.models[0].isDestroyed = true;
raptor.models[0].isOnField = false;
raptor.currentModels -= 1;
raptor.destroyedModelIds = [...new Set([
  ...(raptor.destroyedModelIds || []), raptor.models[0].id,
])];
const profile = state.officialCombatProfileBundle.profiles
  .find(p => p.recordKey === raptor.officialUnitRecordKey);
raptor.currentSupply = profile.squadProfile.find(t => t.minimumModels !== null
  && raptor.currentModels >= t.minimumModels
  && raptor.currentModels <= t.maximumModels).supply;
const empty = structuredClone(state);
empty.pieces = [];

const nativeUpdate = Hash.prototype.update;
const results = [];
try {
  for (const [name, inputState] of [["before_casualty", state],
    ["after_casualty", afterCasualty], ["empty_field", empty]]) {
    const inputHash = hash(inputState);
    let terrainPieceHashes = 0;
    let lineOfSightResultHashes = 0;
    Hash.prototype.update = function (data, ...args) {
      if (typeof data === "string") {
        if (data.includes('"schema":"starcraft_tmg_official_terrain_piece_v1"')
          && JSON.parse(data).schema === "starcraft_tmg_official_terrain_piece_v1") {
          terrainPieceHashes += 1;
        }
        if (data.includes('"schema":"starcraft_tmg_official_terrain_line_of_sight_result_v1"')
          && JSON.parse(data).schema === "starcraft_tmg_official_terrain_line_of_sight_result_v1") {
          lineOfSightResultHashes += 1;
        }
      }
      return Reflect.apply(nativeUpdate, this, [data, ...args]);
    };
    const start = performance.now();
    const result = control({ state: inputState, matchBinding: envelope.matchBinding });
    const elapsedMs = performance.now() - start;
    Hash.prototype.update = nativeUpdate;
    assert.equal(hash(inputState), inputHash, "control must not mutate caller input");
    results.push({ name, inputHash, result, terrainPieceHashes,
      lineOfSightResultHashes, elapsedMs });
  }
} finally { Hash.prototype.update = nativeUpdate; }

const invalidResults = [];
for (const corruption of ["unit_source", "model_support", "terrain_hash"]) {
  const invalid = structuredClone(state);
  if (corruption === "unit_source") invalid.pieces[0].sourceRecordHash = "altered";
  else if (corruption === "model_support") {
    invalid.pieces[0].models[1].supportTerrainIds = ["missing-terrain"];
  } else invalid.board.terrain[0].terrainHash = "altered";
  let failure;
  try { control({ state: invalid, matchBinding: envelope.matchBinding }); }
  catch (error) { failure = String(error.message); }
  assert(failure, `${corruption}: invalid Rules input must be rejected`);
  invalidResults.push({ corruption, failure });
}
let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, "utf8")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  baseline = { sourceRevision: capture.aggregate.stateRevision, results, invalidResults };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
}
assert.equal(baseline.sourceRevision, 82);
for (const [index, result] of results.entries()) {
  const old = baseline.results[index];
  assert.equal(result.inputHash, old.inputHash);
  assert.deepEqual(result.result, old.result, "ENTIRE original control result/hash unchanged");
  assert.equal(result.lineOfSightResultHashes, old.lineOfSightResultHashes,
    "every original model-marker LOS result must still be computed");
}
assert.deepEqual(invalidResults, baseline.invalidResults);
console.log(JSON.stringify({ operation: "mission_marker_los_context_reuse",
  sourceRevision: 82, fixtureUnitIds: state.pieces.map(p => p.id), terrainRows: 1804,
  results: results.map((r, i) => ({ name: r.name,
    terrainPieceHashes: r.terrainPieceHashes,
    originalTerrainPieceHashes: baseline.results[i].terrainPieceHashes,
    lineOfSightResults: r.lineOfSightResultHashes, elapsedMs: r.elapsedMs,
    originalElapsedMs: baseline.results[i].elapsedMs,
    controlResolutionHash: r.result.controlResolutionHash })),
  completeOriginalControlResultsEqual: true, originalInputRejectionsEqual: true,
  providerCalls: 0, originalRoomWrites: 0, trainingTruth: false }));
assert(results[0].lineOfSightResultHashes > 1, "fixture must exercise repeated LOS calls");
for (const [index, result] of results.entries()) {
  if (result.lineOfSightResultHashes <= 1) continue;
  assert(result.terrainPieceHashes < baseline.results[index].terrainPieceHashes,
    "MISSION_CONTROL_REVALIDATES_FULL_TERRAIN_PER_MODEL_MARKER_RAY");
}

// The changed seam also preserves scalar validation/exclusion semantics. Small
// ordinary subset isolates that contract; the call-site fixture above keeps ALL rows.
const small = structuredClone(state);
small.board.terrain = small.board.terrain.filter(t => t.terrainKind === "ordinary").slice(0, 3);
assert.equal(small.board.terrain.length, 3);
const piece = small.pieces.find(p => p.id === "player1-marine-3");
assert(piece.models[0].supportTerrainIds.length === 0);
const printedSize = small.officialTerrainLosDataBundle.profiles
  .find(p => p.recordKey === piece.officialUnitRecordKey).printedSize;
const alternatePiece = structuredClone(piece);
alternatePiece.models[0].xInches += 0.125;
const query = { attacker: piece, attackerModelId: piece.models[0].id,
  attackerEffectiveSize: printedSize, marker: small.board.missionMarkers[0],
  excludedTerrainIds: [] };
const queries = [query,
  { ...query, attackerEffectiveSize: printedSize + 1 },
  { ...query, attacker: alternatePiece, excludedTerrainIds: [small.board.terrain[0].id] },
  { ...query, marker: small.board.missionMarkers[1],
    excludedTerrainIds: [small.board.terrain[1].id, small.board.terrain[0].id] },
  { ...query, marker: small.board.missionMarkers[1],
    excludedTerrainIds: [small.board.terrain[0].id, small.board.terrain[1].id] }];
const scalar = q => los.evaluateOfficialTerrainLineOfSightToMissionMarkerV1({
  state: small, dataBundle: small.officialTerrainLosDataBundle, ...q,
});
const smallHash = hash(small);
const expected = queries.map(scalar);
const batch = los.evaluateOfficialTerrainLineOfSightToMissionMarkerBatchV1({
  state: small, dataBundle: small.officialTerrainLosDataBundle, queries,
});
assert.deepEqual(batch, expected, "ALL scalar LOS fields/hashes and order unchanged");
assert.deepEqual(los.projectOfficialMissionMarkerVisibilityBatchV1({
  state: small, dataBundle: small.officialTerrainLosDataBundle, queries,
}), expected.map(r => ({ visible: r.visible, resultHash: r.resultHash })),
"compact control fold binds the SAME complete scalar result");
assert.equal(hash(small), smallHash);
assert(Object.isFrozen(batch) && batch.every(Object.isFrozen));
assert.notEqual(batch[0].modelEdgeDistanceMilliInches, batch[2].modelEdgeDistanceMilliInches,
  "different actual piece objects with the same public id must not alias");
const badPiece = structuredClone(piece);
badPiece.sourceRecordHash = "altered";
for (const bad of [{ ...query, attacker: badPiece },
  { ...query, attackerEffectiveSize: printedSize - 1 },
  { ...query, marker: structuredClone(query.marker) },
  { ...query, excludedTerrainIds: ["missing-terrain"] }]) {
  let scalarFailure;
  try { scalar(bad); } catch (e) { scalarFailure = e.message; }
  assert(scalarFailure);
  assert.throws(() => los.evaluateOfficialTerrainLineOfSightToMissionMarkerBatchV1({
    state: small, dataBundle: small.officialTerrainLosDataBundle, queries: [query, bad],
  }), e => e.message === scalarFailure);
}
small.board.terrain[0].terrainHash = "altered";
const excludesCorrupt = { ...query, excludedTerrainIds: [small.board.terrain[0].id] };
assert.deepEqual(los.evaluateOfficialTerrainLineOfSightToMissionMarkerBatchV1({
  state: small, dataBundle: small.officialTerrainLosDataBundle, queries: [excludesCorrupt],
}), [scalar(excludesCorrupt)], "excluded support terrain is not newly validated by LOS");
let corruptFailure;
try { scalar(query); } catch (e) { corruptFailure = e.message; }
assert(corruptFailure);
assert.throws(() => los.evaluateOfficialTerrainLineOfSightToMissionMarkerBatchV1({
  state: small, dataBundle: small.officialTerrainLosDataBundle,
  queries: [excludesCorrupt, query],
}), e => e.message === corruptFailure, "other exclusion contexts still validate that row");
console.log(JSON.stringify({ status: "passed", exactScalarResultsEqual: true,
  exclusionContextsIndependent: true, sameIdObjectsIndependent: true,
  invalidInputsRejected: true, callerInputsUnchanged: true, trainingTruth: false }));
