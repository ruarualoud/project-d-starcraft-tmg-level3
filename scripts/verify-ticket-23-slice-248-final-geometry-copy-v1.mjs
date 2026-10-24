import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const [deployCapturePath, runCapturePath, baselinePath, reportPath] = process.argv.slice(2);
const deployCapture = JSON.parse(await readFile(deployCapturePath, "utf8"));
const runCapture = JSON.parse(await readFile(runCapturePath, "utf8"));
function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
const cases = [
  { id: "original-r69-goliath-deploy", state: deployCapture.state,
    domain: deployCapture.domain.sourceDomain,
    parameters: deployCapture.parameters[16] },
  { id: "original-r26-marine-run", state: runCapture.state,
    domain: runCapture.domain.sourceDomain || runCapture.domain,
    path: runCapture.path, placements: runCapture.placements,
    pieceId: runCapture.pieceId, leadingModelId: runCapture.leadingModelId },
];
for (const entry of cases) { deepFreeze(entry.state); deepFreeze(entry.domain); }
const sourceUrl = new URL(
  "../packages/product-composition/official-selected-roster-spatial-action-runtime-v1.mjs",
  import.meta.url);
let source = await readFile(sourceUrl, "utf8");
const cloneSeam = "function clone(value) { return structuredClone(value); }";
const projectionSeam = "return { state: projected, actor };";
assert.ok(source.includes(cloneSeam) && source.includes(projectionSeam));
source = source.replace(cloneSeam,
  "function clone(value) { if (value === probedState) fullStateClones += 1; return structuredClone(value); }")
  .replace(projectionSeam, "lastProjection = { state: projected, actor }; return lastProjection;")
  .replace(/(\bfrom\s+["'])(\.[^"']+)(["'])/gu,
    (_, before, relative, after) =>
      `${before}${new URL(relative, sourceUrl).href}${after}`);
source += `
let probedState, fullStateClones = 0, lastProjection;
export function probeOriginalFinalGeometry(input) {
  const { state, domain } = input;
  const piece = state.pieces.find(entry => entry.id ===
    (input.pieceId || domain.pieceId));
  const leadingModelId = input.leadingModelId || input.parameters.leadingModelId;
  let placements = input.placements;
  if (!placements) {
    const parameters = input.parameters;
    const profile = domain.constraints.modelProfiles.find(entry =>
      entry.modelId === leadingModelId);
    const segment = segmentById(domain, parameters.entrySegmentId);
    const start = deployStart(domain, segment,
      parameters.entryAlongEdgeMilliInches, profile);
    const path = canonicalPath(start, parameters.path, domain, "deploy");
    placements = canonicalPlacements(domain, leadingModelId,
      parameters.placements, path.points.at(-1));
  }
  probedState = state; fullStateClones = 0; lastProjection = null;
  const result = validateFinalGeometry(state, piece, domain, placements,
    leadingModelId, domain.constraints.engagedEnemyUnitIds);
  return { result, projection: lastProjection, fullStateClones };
}
`;
const { probeOriginalFinalGeometry } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const inputHashes = cases.map(entry => hashStarcraftTmgContract(entry.state));
const observed = cases.map(entry => {
  const startedAt = performance.now();
  const probe = probeOriginalFinalGeometry(entry);
  return { id: entry.id, probe,
    result: probe.result,
    projectionStateHash: hashStarcraftTmgContract(probe.projection.state),
    fullStateClones: probe.fullStateClones,
    elapsedMs: Math.round(performance.now() - startedAt) };
});
let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, "utf8")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  baseline = observed.map(({ probe, ...row }) => row);
  await writeFile(baselinePath, JSON.stringify(baseline) + "\n",
    { flag: "wx", mode: 0o600 });
}
const report = { schemaVersion: "s248_original_final_geometry_copy_gate_v1",
  cases: observed.map(({ probe, ...row }, index) => ({ ...row,
    baselineFullStateClones: baseline[index].fullStateClones,
    baselineElapsedMs: baseline[index].elapsedMs })),
  providerCalls: 0, realRoomMutations: 0, wholeActionOneMinuteAccepted: false };
try {
  assert.deepEqual(observed.map(({ result, projectionStateHash }) =>
    ({ result, projectionStateHash })), baseline.map(({ result, projectionStateHash }) =>
    ({ result, projectionStateHash })), "retain the entire projected state and exact Rules result");
  assert.ok(observed.every(row => row.fullStateClones === 0),
    "read-only final formation evaluation must not deep-copy the whole immutable match");
  for (let index = 0; index < cases.length; index += 1) {
    const input = cases[index], projection = observed[index].probe.projection;
    const originalActor = input.state.pieces.find(piece => piece.id === projection.actor.id);
    assert.notStrictEqual(projection.state, input.state);
    assert.notStrictEqual(projection.state.board, input.state.board);
    assert.notStrictEqual(projection.state.pieces, input.state.pieces);
    assert.notStrictEqual(projection.actor, originalActor);
    assert.notStrictEqual(projection.actor.models, originalActor.models);
    assert.strictEqual(projection.state.officialGameplayDataBundle,
      input.state.officialGameplayDataBundle);
    const otherIndex = input.state.pieces.findIndex(piece => piece.id !== projection.actor.id);
    assert.strictEqual(projection.state.pieces[otherIndex], input.state.pieces[otherIndex]);
    projection.actor.models[0].xInches = 987;
    assert.equal(hashStarcraftTmgContract(input.state), inputHashes[index]);
  }
  const mutable = { ...cases[0], state: structuredClone(cases[0].state) };
  Object.freeze(mutable.state); // Shallow freezing is not enough to share children.
  const mutableHash = hashStarcraftTmgContract(mutable.state);
  const mutableProbe = probeOriginalFinalGeometry(mutable);
  assert.equal(mutableProbe.fullStateClones, 1);
  assert.notStrictEqual(mutableProbe.projection.state.officialGameplayDataBundle,
    mutable.state.officialGameplayDataBundle);
  mutableProbe.projection.state.players.player1.supply = -123;
  mutableProbe.projection.actor.models[0].xInches = 456;
  assert.equal(hashStarcraftTmgContract(mutable.state), mutableHash);
  report.originalInputAndMutableFallbackIsolated = true;
  report.status = "passed";
} catch (error) {
  report.status = "failed"; report.message = error.message; process.exitCode = 1;
}
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
