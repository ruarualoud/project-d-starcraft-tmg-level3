#!/usr/bin/env node

// Concrete complete native ranged-LOS encoding workload, not a broad new suite.
// Count generic recursive normalizations and repeated field-layout sorting while
// preserving full rows, canonical bytes, hashes and foreign-record fallback.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createOfficialTerrainLineOfSightBatchV1,
  canonicalNativeTerrainLineOfSightAssessmentsV1 } from
  "../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs";
import { hashStarcraftTmgContract as hash, canonicalStarcraftTmgJson as canonical } from
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
const state = { board: { terrain }, pieces: source.pieces };
const dataBundle = source.officialTerrainLosDataBundle;
const attacker = state.pieces.find(piece => piece.id === "player1-marine-3");
const target = state.pieces.find(piece => piece.id === "player2-kerrigan-raptor");
assert(attacker && target);
const queries = attacker.models.slice(0, 2).flatMap(attackerModel =>
  target.models.slice(0, 2).map(targetModel => ({ attacker,
    attackerModelId: attackerModel.id, target, targetModelId: targetModel.id })));
const input = { state, dataBundle };
const inputHash = hash({ input, queries });
const originalSort = Array.prototype.sort;
let genericRecursiveRows = 0;
let assessmentLayoutSorts = 0;
let results;
let movedQuery;
let elapsedMs;
try {
  Array.prototype.sort = function (...args) {
    if (this.includes("terrainId") && this.includes("visibilityWitness")
      && this.includes("defaultAperturesBlockLineOfSight")) {
      assessmentLayoutSorts += 1;
      if (new Error().stack.includes("at normalizeCanonical (")) genericRecursiveRows += 1;
    }
    return Reflect.apply(originalSort, this, args);
  };
  const start = performance.now();
  const batch = createOfficialTerrainLineOfSightBatchV1(input);
  const first = batch.evaluate(queries);
  const repeated = batch.evaluate(queries);
  assert.deepEqual(repeated, first);
  const movedAttacker = structuredClone(attacker);
  movedAttacker.models[0].xInches += 0.125;
  movedQuery = { ...queries[0], attacker: movedAttacker };
  const operation = batch.prepareEvaluation([movedQuery]);
  const moved = [operation.evaluateAt(0)];
  results = { first, repeated, moved };
  elapsedMs = performance.now() - start;
} finally { Array.prototype.sort = originalSort; }
assert.equal(hash({ input, queries }), inputHash);
assert.deepEqual(results.moved,
  createOfficialTerrainLineOfSightBatchV1(input).evaluate([movedQuery]));
for (const rows of Object.values(results)) {
  for (const result of rows) {
    assert.equal(result.assessments.length, 1804);
    assert(Object.isFrozen(result) && Object.isFrozen(result.assessments));
    assert.equal(canonicalNativeTerrainLineOfSightAssessmentsV1(result.assessments),
      canonical(result.assessments), "entire original canonical assessment bytes retained");
    const { resultHash, ...body } = result;
    assert.equal(resultHash, hash(body), "native seal equals complete generic reference");
  }
}
const foreign = [{ ...results.first[0].assessments[0],
  extra: { nested: ["new_field", 0, false] } }];
assert.equal(canonicalNativeTerrainLineOfSightAssessmentsV1(foreign), canonical(foreign),
  "untrusted/non-flat foreign records keep the full generic path");
const malformed = [{ ...foreign[0], nonFinite: Infinity }];
const fault = operation => { try { operation(); } catch (error) { return error.message; } };
const originalFault = fault(() => canonical(malformed));
assert(originalFault);
assert.equal(fault(() => canonicalNativeTerrainLineOfSightAssessmentsV1(malformed)), originalFault);
let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, "utf8")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  baseline = { inputHash, results, genericRecursiveRows, assessmentLayoutSorts,
    originalFault, elapsedMs };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
}
assert.equal(inputHash, baseline.inputHash);
assert.deepEqual(results, baseline.results, "ALL complete original nine native results equal");
assert.equal(originalFault, baseline.originalFault);
const evidence = { operation: "native_los_flat_record_encoding", sourceRevision: 82,
  terrainRows: 1804, rayCount: 9, completeOriginalResultsEqual: true,
  completeCanonicalBytesAndGenericHashesEqual: true, callerInputsUnchanged: true,
  movedCoordinatesEqualFreshOwner: true, foreignNestedAndFaultFallbackEqual: true,
  genericRecursiveRows, originalGenericRecursiveRows: baseline.genericRecursiveRows,
  assessmentLayoutSorts, originalAssessmentLayoutSorts: baseline.assessmentLayoutSorts,
  elapsedMs, originalElapsedMs: baseline.elapsedMs,
  providerCalls: 0, originalRoomWrites: 0, trainingTruth: false };
await writeFile(evidencePath, JSON.stringify(evidence), { mode: 0o600 });
console.log(JSON.stringify(evidence));
assert.equal(genericRecursiveRows, 0,
  "NATIVE_LOS_FLAT_RECORDS_STILL_REPEAT_GENERIC_RECURSIVE_NORMALIZATION");
assert(assessmentLayoutSorts <= 1,
  "NATIVE_LOS_REPEATS_IDENTICAL_ASSESSMENT_FIELD_LAYOUT_SORTING");
