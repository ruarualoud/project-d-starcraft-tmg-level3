#!/usr/bin/env node
// Reproduce redundant whole-view projection at the shared production query
// boundary, including delegated queries and already completed cache hits.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { Session } from "node:inspector";
import { createStarcraftTmgSpatialActionQueryRuntimeV1 } from
  "../packages/online-agent-session/spatial-action-query-runtime-v1.mjs";
import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from
  "../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs";
import { projectStarcraftTmgViewerStateShapeV3 } from
  "../packages/client-domain/viewer-projection-v3.mjs";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const [capturePath, baselinePath] = process.argv.slice(2);
assert(capturePath && baselinePath);
const capture = JSON.parse(await readFile(capturePath, "utf8"));
const aggregate = capture.aggregate;
const state = aggregate.envelope.state;
assert.equal(state.board.terrain.length, 1804);
const originalHash = hash(aggregate);
const bindingHash = aggregate.envelope.matchBindingHash;
const authority = { roomId: capture.roomId,
  stateRevision: aggregate.stateRevision, stateHash: aggregate.envelope.stateHash,
  matchBindingHash: bindingHash, legalSpaceHash: hash("local-lazy-view-menu") };
const input = {
  roomProjection: { room: authority, matchBinding: { bindingHash },
    viewer: { seatKey: "player1", visibilityScope: "seat" },
    state: projectStarcraftTmgViewerStateShapeV3(state) },
  legalSpace: { ...authority, finiteActions: [], parameterDomains: [] },
  spatialObservation: { ...authority, observationHash: hash("local-lazy-view-observation") },
};
const originalInputHash = hash(input);
let roomLoads = 0;
const adapter = createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({
  seatKey: "player1",
  roomStore: { async loadRoom(roomId) {
    assert.equal(roomId, capture.roomId); roomLoads += 1; return aggregate;
  } },
  rulesRuntime: { instantiate() { throw Error("read-only query probe"); } },
});
const runtime = createStarcraftTmgSpatialActionQueryRuntimeV1({ rulesQuery: adapter.query });
const relationship = { requestId: "relationship-1", queryKind: "space.inspect_relationships",
  arguments: { subjectUnitIds: ["player1-marine-3"],
    targetIds: ["player2-hydralisk"], intent: "inspect" } };
const measurement = { requestId: "measurement-1", queryKind: "base_edge_distance",
  arguments: { source: { unitId: "player1-marine-3", modelId: "player1-marine-3-model-1" },
    target: { unitId: "player2-hydralisk", modelId: "player2-hydralisk-model-1" } } };
const session = new Session(); session.connect();
const post = (method, parameters = {}) => new Promise((resolve, reject) =>
  session.post(method, parameters, (error, result) => error ? reject(error) : resolve(result)));
const projectionCalls = coverage => coverage.result
  .find(script => script.url.endsWith("/client-domain/viewer-projection-v3.mjs"))
  ?.functions.find(fn => fn.functionName === "projectStarcraftTmgViewerStateShapeV3")
  ?.ranges[0]?.count ?? 0;
const result = {};
let unusedProjectionCalls;
let directProjectionCalls;
let changedAuthorityProjectionCalls;
const started = performance.now();
try {
  await post("Profiler.enable");
  await post("Profiler.startPreciseCoverage", { callCount: true, detailed: true });
  result.delegated = await runtime.query({ ...input, request: relationship });
  result.delegatedCached = await runtime.query({ ...input,
    request: { ...relationship, requestId: "relationship-cached" } });
  result.unsupported = await runtime.query({ ...input,
    request: { queryKind: "not_a_supported_query", arguments: {} } });
  result.invalidDirect = await runtime.query({ ...input,
    request: { queryKind: "base_edge_distance", arguments: {} } });
  unusedProjectionCalls = projectionCalls(await post("Profiler.takePreciseCoverage"));
  result.direct = await runtime.query({ ...input, request: measurement });
  result.directCached = await runtime.query({ ...input,
    request: { ...measurement, requestId: "measurement-cached" } });
  directProjectionCalls = projectionCalls(await post("Profiler.takePreciseCoverage"));
  result.changedAuthority = await runtime.query({ ...input,
    legalSpace: { ...input.legalSpace, legalSpaceHash: hash("local-lazy-view-new-menu") },
    request: measurement });
  changedAuthorityProjectionCalls = projectionCalls(await post("Profiler.takePreciseCoverage"));
  await assert.rejects(runtime.query({ ...input,
    spatialObservation: { ...input.spatialObservation,
      stateRevision: aggregate.stateRevision + 1 }, request: relationship }),
  /spatial observation is stale/);
} finally { await post("Profiler.stopPreciseCoverage"); session.disconnect(); }
assert.equal(result.delegated.status, "advisory_estimate");
assert(result.delegated.result.relationshipGraphHash);
assert.equal(result.direct.status, "exact");
assert.deepEqual(result.delegatedCached, result.delegated);
assert.deepEqual(result.directCached, result.direct);
assert.equal(result.unsupported.reason, "unsupported_query_kind");
assert.equal(result.invalidDirect.reason, "DIRECT_SPATIAL_QUERY_ARGUMENTS_INVALID");
assert.equal(roomLoads, 1, "completed delegated cache remains active");
assert.equal(hash(aggregate), originalHash);
assert.equal(hash(input), originalInputHash);
assert(Object.values(result).every(receipt => receipt.mayApply === false
  && receipt.trainingTruth === false));
let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, "utf8")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  baseline = { originalHash, originalInputHash, unusedProjectionCalls,
    directProjectionCalls, changedAuthorityProjectionCalls, result };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
}
assert.equal(baseline.originalHash, originalHash);
assert.equal(baseline.originalInputHash, originalInputHash);
assert.deepEqual(result, baseline.result, "entire original geometry/unknown/authority/receipt hashes unchanged");
console.log(JSON.stringify({ operation: "query_lazy_viewer_projection",
  revision: aggregate.stateRevision, terrainRows: 1804,
  originalUnusedProjectionCalls: baseline.unusedProjectionCalls, unusedProjectionCalls,
  originalDirectProjectionCalls: baseline.directProjectionCalls, directProjectionCalls,
  changedAuthorityProjectionCalls, roomLoads,
  entireOriginalEvidenceEqual: true, inputUnchanged: true,
  staleObservationRejected: true, instrumentedMs: performance.now() - started,
  fullActionPerformanceCertification: false, providerCalls: 0, originalRoomWrites: 0,
  trainingTruth: false }));
assert.equal(unusedProjectionCalls, 0, "UNUSED_WHOLE_VIEWER_PROJECTION_FOR_DELEGATED_OR_CACHED_QUERY");
assert.equal(directProjectionCalls, 1, "cached direct result must not reproject the whole view");
assert.equal(changedAuthorityProjectionCalls, 1, "new LegalSpace authority must recompute direct geometry");
