#!/usr/bin/env node
// Concrete serial-query/repeated-snapshot bug at the ordinary Live Planner
// boundary. Model replies are a local diagnostic, not a paid strategy trial.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { Session } from "node:inspector";
import { createStarcraftTmgLiveFlashDecisionPortV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { createStarcraftTmgSpatialActionQueryRuntimeV1 } from
  "../packages/online-agent-session/spatial-action-query-runtime-v1.mjs";
import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from
  "../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs";
import { createInMemoryStarcraftTmgPromptArtifactStoreV1 } from
  "../packages/online-agent-session/prompt-artifact-store-v1.mjs";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { projectStarcraftTmgViewerStateShapeV3 } from
  "../packages/client-domain/viewer-projection-v3.mjs";

const [capturePath, baselinePath] = process.argv.slice(2);
assert(capturePath && baselinePath);
const capture = JSON.parse(await readFile(capturePath, "utf8"));
const aggregate = capture.aggregate;
const state = aggregate.envelope.state;
assert.equal(state.board.terrain.length, 1804);
const bindingHash = aggregate.envelope.matchBindingHash;
const stateHash = aggregate.envelope.stateHash;
const legalSpaceHash = hash("readonly-query-batch-local-menu");
const scope = { gameId: "starcraft-tmg", roomId: capture.roomId,
  matchBindingHash: bindingHash, seatKey: "player1" };
const authority = { roomId: scope.roomId, stateRevision: aggregate.stateRevision,
  stateHash, matchBindingHash: bindingHash, legalSpaceHash };
const input = { scope, promptPack: "selfplay_agent_prompt",
  roomProjection: { room: authority, matchBinding: { bindingHash },
    viewer: { seatKey: scope.seatKey, visibilityScope: "seat" },
    state: projectStarcraftTmgViewerStateShapeV3(state) },
  legalSpace: { ...authority, finiteActions: [], parameterDomains: [] },
  spatialActionSpace: { authority, actionSpaceHash: hash("readonly-local-menu"),
    finiteActions: [{ candidateId: "pass", action: { actionType: "pass" } },
      { candidateId: "local-nonsingleton", action: { actionType: "finish_activation" } }],
    parameterDomains: [] },
  spatialObservation: { ...authority, observationHash: hash("readonly-local-observation") },
  matchMemory: null, planState: null };
const subjectUnitIds = ["player1-marine-3"];
const targetIds = ["player2-hydralisk", "player2-kerrigan-raptor",
  state.board.missionMarkers[0].id];
assert(subjectUnitIds.every(id => state.pieces.some(p => p.id === id)));
const requests = [...targetIds, targetIds[0]].map((id, index) => ({
  requestId: `local-readonly-${index + 1}`, queryKind: "space.inspect_relationships",
  arguments: { subjectUnitIds, targetIds: [id], intent: "inspect" },
}));
const originalHash = hash(aggregate);
let roomLoads = 0;
const events = [];
const adapter = createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({
  seatKey: scope.seatKey,
  roomStore: { async loadRoom(roomId) {
    assert.equal(roomId, scope.roomId); roomLoads += 1; return aggregate;
  } },
  rulesRuntime: { instantiate() { throw Error("no action instantiation in this probe"); } },
  observeQueryBatchDiagnostic: event => events.push(structuredClone(event)),
});
const spatialQueryPort = createStarcraftTmgSpatialActionQueryRuntimeV1({
  rulesQuery: adapter.query, rulesQueryBatch: adapter.queryBatch,
});
let record = null;
const prompts = [];
// Match the ordinary production provider stack, not this store's smaller
// standalone default. This fixture correction is pending an allowed focused
// continuation after the three invalid fixture attempts recorded in S248.
const artifacts = createInMemoryStarcraftTmgPromptArtifactStoreV1({
  maxArtifacts: 8, maxArtifactBytes: 8 * 1024 * 1024,
});
let localCalls = 0;
const decisionPort = createStarcraftTmgLiveFlashDecisionPortV1({
  providerInteractionMode: "native_tools",
  providerSupervisor: {
    async readState() { return {}; },
    async sendTurn() {
      localCalls += 1;
      if (localCalls !== 1) return { ok: false, reason: "LOCAL_PROBE_END_NO_EGRESS" };
      return { ok: true, output: { providerTurn: { kind: "tool_calls",
        toolCalls: requests.map((request, index) => ({
          callId: `local-call-${index + 1}`, name: "query_spatial_rules",
          arguments: { requestId: request.requestId, queryKind: request.queryKind,
            argumentsJson: JSON.stringify(request.arguments) }, argumentIssue: null,
        })) } }, usageReceipt: { inputUnits: 10, outputUnits: 5, totalUnits: 15 },
        providerEvidence: { reportedModel: "deepseek-flash" } };
    },
  },
  promptArtifactStore: { put(value) {
    prompts.push(structuredClone(value.artifact)); return artifacts.put(value);
  }, release(value) { return artifacts.release(value); } },
  profileAvailabilityPort: { async check() { return { ok: true, available: true }; } },
  strategySkillPort: { async resolve() { return { ok: true, snapshot: {
    skillSetHash: bindingHash, skillRefs: [{ skillId: "general", hash: bindingHash }],
    skills: [{ skillId: "general", hash: bindingHash, procedure: [], knowledge: [] }],
  } }; } },
  spatialQueryPort,
  store: { durability: "local_probe",
    async load() { return record ? structuredClone(record) : null; },
    async commit(_key, expected, next) {
      assert.equal(expected, record?.revision ?? null); record = structuredClone(next);
      return { ok: true };
    } },
  profileCandidates: [{ providerId: "deepseek-openai-compatible-direct",
    model: "deepseek-flash", profileRef: { id: "readonly-batch-local", version: "1", hash: bindingHash },
    maxOutputUnits: 1024 }],
  now: () => "2026-10-09T10:20:00.000Z",
});
const preflight = await decisionPort.preflight({ scope, matchMode: "agent_vs_agent" });
assert.equal(preflight.ok, true);
assert.equal((await decisionPort.openMatch({ scope, preflightReceipt: preflight,
  providerSession: { sessionId: "readonly-batch-local-session", connectionEpoch: 1,
    sessionBindingHash: bindingHash } })).ok, true);
const session = new Session(); session.connect();
const post = (method, parameters = {}) => new Promise((resolve, reject) =>
  session.post(method, parameters, (error, result) => error ? reject(error) : resolve(result)));
let coverage;
const started = performance.now();
try {
  await post("Profiler.enable");
  await post("Profiler.startPreciseCoverage", { callCount: true, detailed: true });
  const decision = await decisionPort.decide(input);
  console.log(JSON.stringify({ probeBoundary: "after_local_query_turn",
    reason: decision.reason, localCalls, roomLoads,
    choice: Object.values(record.decisions).map(c => ({ status: c.status,
      receiptCount: c.queryReceipts?.length, warnings: c.warnings,
      attemptFailures: Object.values(c.attempts || {}).map(a => a.failure) })) }));
  assert.equal(decision.ok, false, "probe stops before a terminal model decision, no live action");
  coverage = await post("Profiler.takePreciseCoverage");
} finally { await post("Profiler.stopPreciseCoverage"); session.disconnect(); }
const instrumentedMs = performance.now() - started;
assert.equal(localCalls, 2, "ordinary Planner must consume all queries then continue once");
const choice = Object.values(record.decisions)[0];
const toolContinuation = prompts[1]?.agentLoop?.continuationMessages;
const toolReplies = toolContinuation?.filter(m => m.role === "tool");
assert.equal(toolReplies?.length, requests.length);
const receipts = choice.queryReceipts;
assert.equal(receipts.length, 3, "durable choice already deduplicates identical receipt hashes");
assert(receipts.every(r => r.status === "advisory_estimate" && r.result.relationshipGraphHash));
assert(receipts.every(r => r.mayApply === false && r.trainingTruth === false));
assert.equal(JSON.parse(toolReplies[0].content).queryReceiptHash,
  JSON.parse(toolReplies[3].content).queryReceiptHash,
  "duplicate args retain their own tool replies with identical mathematical evidence");
const viewerScript = coverage.result.find(r => r.url.endsWith("/client-domain/viewer-projection-v3.mjs"));
const viewerProjectionCalls = viewerScript?.functions.find(f =>
  f.functionName === "projectStarcraftTmgViewerStateShapeV3")?.ranges[0]?.count ?? 0;
const result = { receipts, toolContinuation };
let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, "utf8")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  baseline = { originalHash, roomLoads, viewerProjectionCalls, instrumentedMs, result };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
}
assert.equal(hash(aggregate), originalHash);
assert.equal(baseline.originalHash, originalHash);
assert.deepEqual(result, baseline.result, "all original tool replies, order, geometry and hashes unchanged");
const completed = events.filter(e => e.stage === "query_worker_completed");
const workerIds = new Set(completed.map(e => e.threadId));
const overlaps = completed.some((a, i) => completed.some((b, j) => i !== j
  && a.threadId !== b.threadId && Math.max(a.startedAtMs, b.startedAtMs)
    < Math.min(a.completedAtMs, b.completedAtMs)));
console.log(JSON.stringify({ operation: "live_planner_readonly_batch",
  revision: aggregate.stateRevision, terrainRows: 1804, requestedQueries: 4, distinctQueries: 3,
  originalRoomLoads: baseline.roomLoads, roomLoads,
  originalViewerProjectionCalls: baseline.viewerProjectionCalls, viewerProjectionCalls,
  workerCount: workerIds.size, computationIntervalsOverlap: overlaps,
  entireOriginalToolEvidenceEqual: true, inputUnchanged: true,
  instrumentedMs, fullActionPerformanceCertification: false,
  localSupervisorCalls: localCalls, realProviderCalls: 0, originalRoomWrites: 0,
  trainingTruth: false }));
assert(workerIds.size >= 2 && overlaps, "LIVE_PLANNER_INDEPENDENT_QUERIES_STILL_SERIAL");
assert.equal(roomLoads, 2, "one batch snapshot read plus one final revision check");
assert.equal(viewerProjectionCalls, 0, "delegated queries must not clone an unused viewer state");

// A changed authority after workers return invalidates every result, even if
// geometry itself was correctly computed on the earlier immutable snapshot.
let staleReads = 0;
const staleAdapter = createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({
  seatKey: scope.seatKey,
  roomStore: { async loadRoom() {
    staleReads += 1;
    return staleReads === 1 ? aggregate : { ...aggregate, stateRevision: aggregate.stateRevision + 1 };
  } },
  rulesRuntime: { instantiate() { throw Error("not used"); } },
});
const staleRuntime = createStarcraftTmgSpatialActionQueryRuntimeV1({
  rulesQuery: staleAdapter.query, rulesQueryBatch: staleAdapter.queryBatch,
});
const stale = await staleRuntime.queryBatch({ ...input, requests: [requests[0], requests[1]] });
assert(stale.every(r => r.status === "unknown" && r.findingSeverity === "High"
  && r.reason === "RULES_QUERY_AUTHORITY_CHANGED_DURING_COMPUTATION"));
assert.equal(hash(aggregate), originalHash);
console.log(JSON.stringify({ staleBatchNeverReturnedAsCurrent: true,
  realProviderCalls: 0, originalRoomWrites: 0, trainingTruth: false }));
