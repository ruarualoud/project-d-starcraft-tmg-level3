import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const capture = JSON.parse(await readFile(process.argv[2], "utf8"));
const baselinePath = process.argv[3];
assert.ok(baselinePath, "a retained baseline artifact is required");
const sourceUrl = new URL(
  "../packages/product-composition/official-selected-roster-spatial-action-runtime-v1.mjs",
  import.meta.url);
const source = await readFile(sourceUrl, "utf8");
// Exercise the existing private function, not a copied geometry algorithm.
// Instrument only its imported footprint constructor; no production export
// or API is added for this concrete CPU/read-amplification regression.
const instrumented = source.replace(
  "  createOfficialModelBaseFootprintV1,",
  "  createOfficialModelBaseFootprintV1 as rawBaseFootprint,")
  .replace(/(\bfrom\s+["'])(\.[^"']+)(["'])/gu,
    (_, before, relative, after) =>
      `${before}${new URL(relative, sourceUrl).href}${after}`)
  + `
let footprintCalls = 0;
function createOfficialModelBaseFootprintV1(input) {
  footprintCalls += 1;
  return rawBaseFootprint(input);
}
export function probeCapturedTerrainMovement(input) {
  const before = footprintCalls;
  const piece = input.state.pieces.find(p => p.id === input.pieceId);
  const result = specialTerrainResult(input.state, piece, "run", input.domain,
    input.leadingModelId, input.path, input.placements, input.parameters);
  return { result, footprintCalls: footprintCalls - before };
}
`;
const { probeCapturedTerrainMovement } = await import(
  `data:text/javascript;base64,${Buffer.from(instrumented).toString("base64")}`);
const started = performance.now();
const observed = probeCapturedTerrainMovement(capture);
const durationMs = Math.round(performance.now() - started);
assert.equal(observed.result.planHash, capture.expectedPlanHash);
assert.equal(observed.result.result.resultHash, capture.expectedResultHash);
assert.equal(observed.result.result.interactions.length,
  capture.state.board.terrain.filter(t => !t.isRemoved && !t.isDestroyed).length);
let baseline;
try {
  baseline = JSON.parse(await readFile(baselinePath, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  baseline = { ...observed, durationMs };
  await writeFile(baselinePath, JSON.stringify(baseline),
    { flag: "wx", mode: 0o600 });
}
console.log(JSON.stringify({ durationMs, footprintCalls: observed.footprintCalls,
  baselineDurationMs: baseline.durationMs,
  baselineFootprintCalls: baseline.footprintCalls,
  terrainCount: observed.result.result.interactions.length,
  planHash: observed.result.planHash, providerCalls: 0, roomMutations: 0 }));
assert.deepEqual(observed.result, baseline.result,
  "retain every interaction and the exact original Rules hashes");
assert.ok(observed.footprintCalls
  <= capture.placements.length + capture.path.points.length,
"unchanged path/endpoint footprints must not be rebuilt for every terrain cell");
const unsupported = structuredClone(capture);
unsupported.placements[0].supportTerrainIds = ["missing-support"];
assert.throws(() => probeCapturedTerrainMovement(unsupported),
  /SELECTED_SPATIAL_TERRAIN_SUPPORT_DECLARATION_MISMATCH/u);
console.log("CAPTURED_TERRAIN_FOOTPRINT_REUSE_OK");
