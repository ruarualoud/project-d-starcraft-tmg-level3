#!/usr/bin/env node

// Specific performance bug: immutable map evidence and non-authoritative lookup
// keys are rebuilt for every native ray, even a repeated factory-owned query.
// Retain all 1804 assessments, complete native hashes and actual moved queries.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createOfficialElevatedLineOfSightBatchV1 } from
  "../packages/rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const [capturePath, baselinePath, evidencePath] = process.argv.slice(2);
assert(capturePath && baselinePath && evidencePath);
const capture = JSON.parse(await readFile(capturePath, "utf8"));
assert.equal(capture.aggregate.stateRevision, 82);
const source = structuredClone(capture.aggregate.envelope.state);
assert.equal(source.board.terrain.length, 1804);
const terrain = source.board.terrain.map(entry => {
  if (entry.isRemoved === true || entry.terrainKind === "ordinary") return entry;
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
});
const state = { board: { terrain,
  terrainElevationAgreement: source.board.terrainElevationAgreement }, pieces: source.pieces };
const dataBundle = source.officialTerrainLosDataBundle;
const attacker = state.pieces.find(piece => piece.id === "player1-marine-3");
const target = state.pieces.find(piece => piece.id === "player2-kerrigan-raptor");
assert(attacker && target);
const queries = attacker.models.slice(0, 2).flatMap(attackerModel =>
  target.models.slice(0, 2).map(targetModel => ({ attacker,
    attackerModelId: attackerModel.id, target, targetModelId: targetModel.id })));
const input = { state, dataBundle };
const inputHash = hash({ input, queries });
const originalMap = Array.prototype.map;
const originalSort = Array.prototype.sort;
let staticEvidenceBuilds = 0;
let overrideKeySorts = 0;
let results;
let elapsedMs;
let movedQuery;
try {
  Array.prototype.map = function (...args) {
    if (this.length === 1804 && this[0]?.terrainId && this[0]?.footprint
      && new Error().stack.includes("at terrainEffectiveSizeEvidence (")) {
      staticEvidenceBuilds += 1;
    }
    return Reflect.apply(originalMap, this, args);
  };
  Array.prototype.sort = function (...args) {
    if (this.length === 12 && this.includes("fullCoverBlocks")
      && this.includes("terrainSupportChain") && !this.includes("terrainId")) {
      overrideKeySorts += 1;
    }
    return Reflect.apply(originalSort, this, args);
  };
  const start = performance.now();
  const batch = createOfficialElevatedLineOfSightBatchV1(input);
  const first = batch.evaluate(queries);
  const repeated = batch.evaluate(queries);
  assert.deepEqual(repeated, first, "identical repeated rays preserve full native facts");
  const movedAttacker = structuredClone(attacker);
  movedAttacker.models[0].xInches += 0.125;
  movedQuery = { ...queries[0], attacker: movedAttacker };
  const moved = batch.project([movedQuery], result => result);
  results = { first, repeated, moved };
  elapsedMs = performance.now() - start;
} finally {
  Array.prototype.map = originalMap;
  Array.prototype.sort = originalSort;
}
assert.equal(hash({ input, queries }), inputHash, "caller inputs remain unchanged");
assert.equal(movedQuery.attacker.models[0].xInches,
  attacker.models[0].xInches + 0.125, "use actual native coordinates");
assert.deepEqual(results.moved,
  createOfficialElevatedLineOfSightBatchV1(input).evaluate([movedQuery]),
  "changed actual coordinates equal a fresh uncached native owner, not a guessed hash change");
for (const rows of Object.values(results)) {
  assert(rows.every(row => row.assessments.length === 1804 && Object.isFrozen(row)));
}
let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, "utf8")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  baseline = { inputHash, results, staticEvidenceBuilds, overrideKeySorts, elapsedMs };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
}
assert.equal(inputHash, baseline.inputHash);
assert.deepEqual(results, baseline.results, "ALL complete original 1804-row native outputs equal");
const evidence = { operation: "owned_los_static_evidence_and_lookup_key",
  sourceRevision: 82, terrainRows: 1804, rayCount: 9,
  completeOriginalResultsEqual: true, callerInputsUnchanged: true,
  changedCoordinatesEqualFreshNativeOwner: true,
  staticEvidenceBuilds, originalStaticEvidenceBuilds: baseline.staticEvidenceBuilds,
  overrideKeySorts, originalOverrideKeySorts: baseline.overrideKeySorts,
  elapsedMs, originalElapsedMs: baseline.elapsedMs,
  providerCalls: 0, originalRoomWrites: 0, trainingTruth: false };
await writeFile(evidencePath, JSON.stringify(evidence), { mode: 0o600 });
console.log(JSON.stringify(evidence));
assert.equal(staticEvidenceBuilds, 1,
  "OWNED_LOS_REBUILDS_IMMUTABLE_MAP_EVIDENCE_PER_RAY");
assert.equal(overrideKeySorts, 0,
  "OWNED_LOS_SORTS_COMPLETE_NONAUTHORITATIVE_LOOKUP_FIELDS_PER_TERRAIN_RAY");
