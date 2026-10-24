import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

// Reproduce the r35 fourth formation: one unsupported elevated LOS pair
// discarded every successful pair and forced a full-map scalar fallback.
const [seedPath, optionPath, capturePath] = process.argv.slice(2);
assert.ok(seedPath && optionPath && capturePath);
const specialUrl = new URL(
  "../packages/rule-atoms/official-special-terrain-rules-kernel-v1.mjs", import.meta.url);
const graphUrl = new URL(
  "../packages/online-agent-session/tactical-relationship-graph-v1.mjs", import.meta.url);
function dataModule(source) {
  return `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
}
function imports(source, url, override = new Map()) {
  return source.replace(/(\bfrom\s+["'])(\.[^"']+)(["'])/gu,
    (_, before, relative, after) => {
      const resolved = new URL(relative, url).href;
      return `${before}${override.get(resolved) || resolved}${after}`;
    });
}
const specialSource = imports(await readFile(specialUrl, "utf8"), specialUrl)
  .replace("export function certifyOfficialSpecialTerrainPlanV1(input = {}) {",
    "export function certifyOfficialSpecialTerrainPlanV1(input = {}) { scalarCalls += 1;")
  + "\nlet scalarCalls = 0; export function scalarCount() { return scalarCalls; }\n";
const specialDataUrl = dataModule(specialSource);
assert.ok(specialSource.includes("scalarCalls += 1;"), "instrument the actual scalar fallback");
const special = await import(specialDataUrl);
let capture;
try { capture = JSON.parse(await readFile(capturePath, "utf8")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  const seed = JSON.parse(await readFile(seedPath, "utf8"));
  const option = JSON.parse(await readFile(optionPath, "utf8"));
  assert.equal(option.relationshipComparison.sourceReceipts.specialTerrainLosBatchFailure,
    "TERRAIN_LOS_ELEVATION_EFFECTIVE_SIZE_DELEGATION_REQUIRED");
  const formationUrl = new URL(
    "../packages/online-agent-session/legal-formation-search-v1.mjs", import.meta.url);
  const stub = dataModule("export function buildStarcraftTmgTacticalRelationshipGraphV1(input) { globalThis.__capturedLosState = input.state; throw new Error('CAPTURE_ONLY_STOP'); }");
  const formation = await import(dataModule(imports(
    await readFile(formationUrl, "utf8"), formationUrl, new Map([[graphUrl.href, stub]]))));
  formation.projectStarcraftTmgFormationRelationshipComparisonV1({
    state: seed.state, source: seed.domain.sourceDomain || seed.domain,
    slots: option.slots, objectives: option.formationObjectives, baseline: null,
  });
  const state = globalThis.__capturedLosState;
  delete globalThis.__capturedLosState;
  assert.ok(state, "capture the actual production surface-normalized projection");
  const actor = state.pieces.find(piece => piece.id === "player2-swarmling");
  const target = state.pieces.find(piece => piece.id === "player1-marine-2");
  const pairs = actor.models.flatMap(left => target.models.map(right => ({ left, right })));
  pairs.sort((a, b) => Number(Boolean(b.left.supportTerrainIds?.length
      || b.right.supportTerrainIds?.length))
    - Number(Boolean(a.left.supportTerrainIds?.length || a.right.supportTerrainIds?.length)));
  const rows = [];
  for (const { left, right } of pairs) {
    const query = { queryId: `r35:${left.id}->${right.id}`,
      planId: `r35:${left.id}->${right.id}`, actorUnitId: actor.id,
      attackerModelId: left.id, targetUnitId: target.id, targetModelId: right.id };
    let result = null, failure = null;
    try {
      result = special.certifyOfficialSpecialTerrainPlanV1({ state, actor,
        procedureKind: "grass_line_of_sight_check", plan: query,
        dataBundle: state.officialTerrainLosDataBundle }).result;
    } catch (error) { failure = String(error.message).split(":")[0]; }
    if (failure && failure !== "TERRAIN_LOS_ELEVATION_EFFECTIVE_SIZE_DELEGATION_REQUIRED") continue;
    if (failure ? rows.some(row => row.failure) : rows.filter(row => !row.failure).length >= 2) continue;
    rows.push({ query, resultHash: result?.resultHash || null,
      assessmentCount: result?.assessments.length || 0, visible: result?.visible ?? null, failure });
    if (rows.length === 3) break;
  }
  assert.equal(rows.length, 3, "retain two actual successful pairs and one actual unknown pair");
  capture = { state, rows, sourcePlannerOutputHash: seed.publicPlannerOutputHash,
    formationOptionId: option.formationOptionId, historicalBatchFailure: option.relationshipComparison.sourceReceipts.specialTerrainLosBatchFailure };
  await writeFile(capturePath, JSON.stringify(capture), { flag: "wx", mode: 0o600 });
}
const before = JSON.stringify(capture);
const queries = capture.rows.map(row => row.query);
const started = performance.now();
let batch;
assert.doesNotThrow(() => {
  batch = special.evaluateOfficialSpecialTerrainLineOfSightBatchV1({
    state: capture.state, dataBundle: capture.state.officialTerrainLosDataBundle,
    queries, isolatePairFailures: true,
  });
}, "one per-pair geometry unknown must not discard successful exact LOS pairs");
assert.equal(batch.results.length, 3);
assert.equal(batch.isolatedPairFailureCount, 1);
for (const original of capture.rows) {
  const row = batch.results.find(entry => entry.queryId === original.query.queryId);
  if (original.failure) {
    assert.equal(row.result, null);
    assert.equal(row.failure, original.failure);
  } else {
    assert.equal(row.result.resultHash, original.resultHash);
    assert.equal(row.result.assessments.length, original.assessmentCount);
    assert.equal(row.result.visible, original.visible);
  }
}
assert.throws(() => special.evaluateOfficialSpecialTerrainLineOfSightBatchV1({
  state: capture.state, dataBundle: capture.state.officialTerrainLosDataBundle, queries,
}), /TERRAIN_LOS_ELEVATION_EFFECTIVE_SIZE_DELEGATION_REQUIRED/u,
"the existing strict Rules API retains its rejection behavior");
const graph = await import(dataModule(imports(await readFile(graphUrl, "utf8"),
  graphUrl, new Map([[specialUrl.href, specialDataUrl]]))
  + "\nexport { specialTerrainLineOfSightLookup, lineOfSightPairs };\n"));
const actor = capture.state.pieces.find(piece => piece.id === "player2-swarmling");
const target = capture.state.pieces.find(piece => piece.id === "player1-marine-2");
const pairs = queries.map(query => ({
  left: { model: actor.models.find(model => model.id === query.attackerModelId) },
  right: { model: target.models.find(model => model.id === query.targetModelId) },
}));
const scalarBefore = special.scalarCount();
const lookup = graph.specialTerrainLineOfSightLookup(capture.state, [{ left: actor,
  right: target, stationaryRangedLineOfSightRequired: true, pairSearch: { pairs } }]);
const rows = graph.lineOfSightPairs(capture.state, actor, target, pairs, lookup);
assert.equal(special.scalarCount() - scalarBefore, 0,
  "the production graph must not recertify any pair through scalar full-map fallback");
assert.equal(rows.filter(row => row.visible === null).length, 1);
assert.equal(rows.find(row => row.visible === null).reason,
  "TERRAIN_LOS_ELEVATION_EFFECTIVE_SIZE_DELEGATION_REQUIRED");
assert.equal(JSON.stringify(capture), before, "do not mutate the paid case or state");
console.log(JSON.stringify({ successfulPairs: 2, unknownPairs: 1,
  allAssessmentCounts: capture.rows.filter(row => !row.failure).map(row => row.assessmentCount),
  scalarFallbackCalls: 0, strictApiStillRejects: true,
  durationMs: Math.round(performance.now() - started), providerCalls: 0, roomMutations: 0 }));
console.log("CAPTURED_LOS_PAIR_ISOLATION_OK");
