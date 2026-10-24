#!/usr/bin/env node

// Concrete r36 regression: two real model pairs repeatedly copied and verified
// the same 1804 terrain rows during production ranged candidate enumeration.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as elevation from
  "../packages/rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const capturePath = process.argv[2];
const baselinePath = process.argv[3];
assert.ok(capturePath && baselinePath, "capture and retained baseline required");
const capture = JSON.parse(await readFile(capturePath, "utf8"));
const original = capture.current.state;
const state = { pieces: original.pieces, board: {
  terrainElevationAgreement: original.board.terrainElevationAgreement,
  terrain: original.board.terrain.map((entry) => {
    if (entry.isRemoved === true || entry.terrainKind === "ordinary") {
      return structuredClone(entry);
    }
    assert.equal(entry.terrainKind, "grass");
    const body = { schema: entry.schema, id: entry.id, terrainKind: "ordinary",
      size: entry.size, footprint: structuredClone(entry.footprint),
      standableHorizontalSurface: entry.standableHorizontalSurface === true,
      setupAgreement: structuredClone(entry.setupAgreement),
      rulesTruth: "official_core_terrain_setup_agreement", trainingTruth: false };
    return { ...body, terrainHash: hash(body), terrainId: entry.id,
      elevation: entry.elevation, heightTier: entry.heightTier,
      elevationSurface: entry.elevationSurface, impassable: false,
      openings: structuredClone(entry.openings || []),
      accessPoints: structuredClone(entry.accessPoints || []), isRemoved: false };
  }),
} };
const attacker = state.pieces.find((piece) => piece.id === "player2-hydralisk");
const target = state.pieces.find((piece) => piece.id === "player1-marine-1");
const queries = attacker.models.slice(0, 2).map((model) => ({ attacker,
  attackerModelId: model.id, target, targetModelId: target.models[0].id }));
assert.equal(queries.length, 2);
const input = { state, queries, dataBundle: original.officialTerrainLosDataBundle };
const inputHash = hash(input);
const batch = elevation.evaluateOfficialElevatedLineOfSightBatchV1;
const nativeClone = globalThis.structuredClone;
let terrainArrayCopies = 0;
globalThis.structuredClone = (value, ...args) => {
  if (Array.isArray(value) && value.length === state.board.terrain.length
    && value[0]?.schema === "starcraft_tmg_official_terrain_piece_v1") {
    terrainArrayCopies += 1;
  }
  return nativeClone(value, ...args);
};
const start = performance.now();
let results;
try {
  results = batch ? batch(input) : queries.map((query) => (
    elevation.evaluateOfficialElevatedLineOfSightV1({ ...query,
      state, dataBundle: input.dataBundle })
  ));
} finally { globalThis.structuredClone = nativeClone; }
const elapsedMs = performance.now() - start;
let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, "utf8")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  baseline = { inputHash, terrainArrayCopies, elapsedMs, results };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
}
assert.equal(inputHash, baseline.inputHash);
assert.deepEqual(results, baseline.results, "entire original LOS result must match");
assert.equal(hash(input), inputHash, "caller input must remain unchanged");
console.log(JSON.stringify({ stage: "real_pair_comparison", stateRevision:
  capture.current.stateRevision, terrain: state.board.terrain.length,
  pairCount: results.length, terrainArrayCopies, elapsedMs,
  originalTerrainArrayCopies: baseline.terrainArrayCopies,
  originalElapsedMs: baseline.elapsedMs, resultHashes: results.map(r => r.resultHash),
  fullOriginalResultsEqual: true, providerCalls: 0, roomWrites: 0 }));
assert.ok(terrainArrayCopies <= 1,
  `RANGED_LOS_REPEATED_TERRAIN_COPY:${terrainArrayCopies}`);

// New batch must not retain a context across mutable states, or trust a
// different/corrupt query piece just because it repeats a public unit id.
const corrupt = nativeClone(input);
corrupt.state.board.terrain[0].size += 1;
assert.throws(() => batch(corrupt), /ELEVATION_TERRAIN_INVALID/);
const unsupported = nativeClone(input);
unsupported.queries[0].attacker.models[0].supportTerrainIds = ["missing-support"];
assert.throws(() => batch(unsupported), /ELEVATION_MODEL_SUPPORT_INVALID/);
const duplicateIdentity = nativeClone(input);
duplicateIdentity.queries[1].attacker = nativeClone(duplicateIdentity.queries[1].attacker);
duplicateIdentity.queries[1].attacker.sourceRecordHash = "corrupt";
assert.throws(() => batch(duplicateIdentity), /ELEVATION_OFFICIAL_UNIT_PROFILE_INVALID/);
const mutable = nativeClone(input);
const before = batch(mutable);
mutable.queries[0].attacker.models[0].xInches += 0.1;
const after = batch(mutable);
assert.notEqual(after[0].resultHash, before[0].resultHash);
console.log(JSON.stringify({ status: "passed", terrainDriftRejected: true,
  invalidSupportRejected: true, sameIdCorruptQueryRejected: true,
  mutableNextBatchObserved: true, providerCalls: 0, roomWrites: 0,
  baselinePath: path.resolve(baselinePath), trainingTruth: false }));
