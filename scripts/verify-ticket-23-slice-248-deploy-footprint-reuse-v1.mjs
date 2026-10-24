import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const [capturePath, baselinePath, reportPath] = process.argv.slice(2);
assert.ok(capturePath && baselinePath && reportPath);
const capture = JSON.parse(await readFile(capturePath, "utf8"));
assert.equal(capture.schemaVersion, "r69_original_deploy_callsite_capture_v1");
assert.equal(capture.parameters.length, 164);
assert.equal(capture.domain.actionType, "deploy");
const sourceUrl = new URL(
  "../packages/product-composition/official-selected-roster-spatial-action-runtime-v1.mjs",
  import.meta.url);
const source = await readFile(sourceUrl, "utf8");
// Reach the real private deployment terrain function with the actual solver
// inputs. Only imported base construction is counted; geometry is not copied.
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
export function probeOriginalDeploymentTerrain(state, domain, parameters) {
  const piece = state.pieces.find(entry => entry.id === domain.pieceId);
  const leadingProfile = domain.constraints.modelProfiles.find(entry =>
    entry.modelId === parameters.leadingModelId);
  const segment = segmentById(domain, parameters.entrySegmentId);
  const start = deployStart(domain, segment,
    parameters.entryAlongEdgeMilliInches, leadingProfile);
  const path = canonicalPath(start, parameters.path, domain, "deploy");
  const before = footprintCalls;
  let outcome;
  try {
    outcome = { status: "accepted_terrain_only", result: deployTerrainResult(
      state, piece, { leadingModelId: parameters.leadingModelId,
        canonicalPath: path }) };
  } catch (error) {
    outcome = { status: "rejected", code: error.code || error.name,
      message: error.message };
  }
  return { outcome, footprintCalls: footprintCalls - before,
    pathPointCount: path.points.length };
}
`;
const { probeOriginalDeploymentTerrain } = await import(
  `data:text/javascript;base64,${Buffer.from(instrumented).toString("base64")}`);
const inputHashBefore = JSON.stringify(capture);
const startedAt = performance.now();
const observed = capture.parameters.map(parameters =>
  probeOriginalDeploymentTerrain(capture.state, capture.domain, parameters));
assert.equal(JSON.stringify(capture), inputHashBefore,
  "do not mutate original state, Rules domain or solver parameters");
let baseline;
try {
  baseline = JSON.parse(await readFile(baselinePath, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  baseline = { observed, elapsedMs: Math.round(performance.now() - startedAt) };
  await writeFile(baselinePath, JSON.stringify(baseline) + "\n",
    { flag: "wx", mode: 0o600 });
}
const report = {
  schemaVersion: "r69_deploy_footprint_reuse_gate_v1",
  stateRevision: capture.authority.stateRevision,
  terrainCount: capture.state.board.terrain.length,
  originalCandidateCount: observed.length,
  elapsedMs: Math.round(performance.now() - startedAt),
  baselineElapsedMs: baseline.elapsedMs,
  footprintCalls: observed.reduce((n, row) => n + row.footprintCalls, 0),
  baselineFootprintCalls: baseline.observed.reduce((n, row) => n + row.footprintCalls, 0),
  outcomeScope: "isolated original deployment terrain seam, not full legality",
  providerCalls: 0, realRoomMutations: 0,
  wholeActionOneMinuteAccepted: false,
};
try {
  assert.deepEqual(observed.map(row => row.outcome),
    baseline.observed.map(row => row.outcome),
    "retain all original terrain interactions, seals and exact failure details");
  assert.ok(observed.every(row => row.footprintCalls <= row.pathPointCount),
    "one deployment evaluation must construct each visited path base at most once");
  report.status = "passed";
} catch (error) {
  report.status = "failed";
  report.message = error.message;
  process.exitCode = 1;
}
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
