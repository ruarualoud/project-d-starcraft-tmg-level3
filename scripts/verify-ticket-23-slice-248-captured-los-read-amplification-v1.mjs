import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const { state } = JSON.parse(await readFile(process.argv[2], "utf8"));
const baselinePath = process.argv[3];
assert.ok(baselinePath);
const ordinaryUrl = new URL(
  "../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs", import.meta.url);
const specialUrl = new URL(
  "../packages/rule-atoms/official-special-terrain-rules-kernel-v1.mjs", import.meta.url);
function imports(source, url, override = null) {
  return source.replace(/(\bfrom\s+["'])(\.[^"']+)(["'])/gu,
    (_, before, relative, after) => {
      const resolved = new URL(relative, url).href;
      return `${before}${resolved === ordinaryUrl.href && override
        ? override : resolved}${after}`;
    });
}
const ordinarySource = imports(await readFile(ordinaryUrl, "utf8"), ordinaryUrl)
  .replace("function verifyTerrain(raw) {",
    "function verifyTerrain(raw) { terrainVerificationCalls += 1;")
  .replace("function baseEdgeToTerrain(model, terrain) {",
    "function baseEdgeToTerrain(model, terrain) { expensiveNearCalls += 1;")
  + "\nlet terrainVerificationCalls = 0, expensiveNearCalls = 0; export function counts() { return { terrainVerificationCalls, expensiveNearCalls }; }\n";
const ordinaryDataUrl = `data:text/javascript;base64,${Buffer.from(ordinarySource)
  .toString("base64")}`;
const specialSource = imports(await readFile(specialUrl, "utf8"), specialUrl,
  ordinaryDataUrl);
const special = await import(`data:text/javascript;base64,${Buffer.from(specialSource)
  .toString("base64")}`);
const ordinary = await import(ordinaryDataUrl);
const actor = state.pieces.find(piece => piece.id === "player2-swarmling");
const target = state.pieces.find(piece => piece.id === "player1-marine-2");
const queries = [0, 1].map(index => ({ queryId: `r35-pair-${index}`,
  planId: `r35-pair-${index}`, actorUnitId: actor.id,
  attackerModelId: actor.models[index].id, targetUnitId: target.id,
  targetModelId: target.models[index].id }));
const started = performance.now();
const batch = special.evaluateOfficialSpecialTerrainLineOfSightBatchV1({ state,
  dataBundle: state.officialTerrainLosDataBundle, queries });
const observed = { batchHash: batch.batchHash,
  resultHashes: batch.results.map(row => row.result.resultHash),
  assessmentCounts: batch.results.map(row => row.result.assessments.length),
  counts: ordinary.counts(), durationMs: Math.round(performance.now() - started) };
let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, "utf8")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  baseline = observed;
  await writeFile(baselinePath, JSON.stringify(baseline), { flag: "wx", mode: 0o600 });
}
for (const key of ["batchHash", "resultHashes", "assessmentCounts"])
  assert.deepEqual(observed[key], baseline[key], "retain all exact LOS results/hashes");
console.log(JSON.stringify({ ...observed, baselineCounts: baseline.counts,
  baselineDurationMs: baseline.durationMs, providerCalls: 0, roomMutations: 0 }));
// Converted special pieces validate their construction once as well;
// one additional complete LOS-context verification is independent of pairs.
assert.ok(observed.counts.terrainVerificationCalls <= observed.assessmentCounts[0] * 2,
  "verify the fixed terrain only once for the batch, not for each model pair");
assert.ok(observed.counts.expensiveNearCalls <= baseline.counts.expensiveNearCalls / 4,
  "use exact bounding-distance rejection for terrain beyond one inch");
const corrupted = structuredClone(state);
corrupted.board.terrain.find(t => !t.isRemoved && !t.isDestroyed).size = 99;
assert.throws(() => special.evaluateOfficialSpecialTerrainLineOfSightBatchV1({
  state: corrupted, dataBundle: state.officialTerrainLosDataBundle, queries }),
  /TERRAIN/u, "never reuse another state's verified terrain");
console.log("CAPTURED_LOS_READ_AMPLIFICATION_OK");
