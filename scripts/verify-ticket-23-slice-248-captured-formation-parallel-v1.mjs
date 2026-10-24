import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";
import * as formation from
  "../packages/online-agent-session/legal-formation-search-v1.mjs";
import { enumerateOfficialSelectedRosterSpatialActionsV1,
  instantiateOfficialSelectedRosterSpatialActionV1 } from
  "../packages/product-composition/official-selected-roster-spatial-action-runtime-v1.mjs";
import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from
  "../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs";

const [seedPath, baselineDirectory, reportPath] = process.argv.slice(2);
const staleOnly = process.argv.includes("--stale-only");
assert.ok(seedPath && baselineDirectory && reportPath);
const seed = JSON.parse(await readFile(seedPath, "utf8"));
const baseline = JSON.parse(await readFile(`${baselineDirectory}/result.json`, "utf8"));
const measured = JSON.parse(await readFile(`${baselineDirectory}/summary.json`, "utf8"));
let capturedActive = 0;
let capturedPeak = 0;
for (const event of measured.stages) {
  if (event.stage === "relationship_comparison_started") {
    capturedPeak = Math.max(capturedPeak, ++capturedActive);
  } else if (event.stage === "relationship_comparison_completed") {
    capturedActive -= 1;
  }
}
assert.equal(capturedActive, 0);
assert.equal(baseline.optionCount, 4);
assert.equal(seed.stateRevision, measured.stateRevision);
assert.ok(measured.elapsedMs > 60_000);

if (typeof formation.searchStarcraftTmgLegalFormationOptionsAsyncV1 !== "function") {
  // Reuse the already-recorded real slow trace instead of running its passed
  // Rules/identity checks again. The failure is four serial comparisons,
  // not the absence of an arbitrary export or a timing field.
  await writeFile(reportPath, JSON.stringify({
    schemaVersion: "captured_formation_parallel_regression_v1",
    status: "red_captured_serial_work",
    capturedElapsedMs: measured.elapsedMs,
    capturedPeakComparisons: capturedPeak,
    completeOptions: baseline.optionCount,
    providerCalls: 0,
    roomMutations: 0,
  }, null, 2) + "\n");
  assert.ok(capturedPeak >= 2,
    "four independent comparisons are serial in the actual captured search");
}

const domain = enumerateOfficialSelectedRosterSpatialActionsV1(seed.state, {
  sideKey: seed.domain.sideKey, includeDisabled: true,
}).parameterDomains.find(d => d.pieceId === seed.domain.pieceId
  && d.actionType === seed.domain.actionType);
assert.ok(domain);
const originalStateHash = hashStarcraftTmgContract(seed.state);
const events = [];
let heartbeatTicks = 0;
let result = baseline;
const started = performance.now();
if (!staleOnly) {
  const { compareStarcraftTmgFormationBatchInWorkersV1 } = await import(
    "../packages/online-agent-session/formation-comparison-worker-batch-v1.mjs");
  const heartbeat = setInterval(() => heartbeatTicks += 1, 25);
  try {
    result = await formation.searchStarcraftTmgLegalFormationOptionsAsyncV1({
      state: seed.state,
      domain,
      request: seed.request,
      instantiate: instantiateOfficialSelectedRosterSpatialActionV1,
    }, {
      compareBatch: jobs => compareStarcraftTmgFormationBatchInWorkersV1(jobs, {
        observeProgress: event => events.push(event),
      }),
    });
  } finally {
    clearInterval(heartbeat);
  }
}
const elapsedMs = performance.now() - started;
const completed = events.filter(event => event.stage === "worker_comparison_completed");
await writeFile(`${reportPath}.computed.json`, JSON.stringify({
  result, events, elapsedMs, heartbeatTicks,
  originalStateHash, inputHashAfter: hashStarcraftTmgContract(seed.state),
}, null, 2) + "\n");
let actualOverlap = 0;
for (const event of completed) {
  actualOverlap = Math.max(actualOverlap, completed.filter(other =>
    other.startedAtMs <= event.startedAtMs
      && other.completedAtMs > event.startedAtMs).length);
}
if (!staleOnly) {
  assert.equal(JSON.stringify(result), JSON.stringify(baseline),
    "parallel execution changed a complete formation result");
  assert.equal(hashStarcraftTmgContract(seed.state), originalStateHash);
  assert.ok(actualOverlap >= 2, "actual worker comparisons did not overlap");
  assert.ok(heartbeatTicks > 2, "comparison work blocked the caller event loop");
  assert.equal(completed.length, baseline.optionCount);
  assert.equal(events.filter(e => e.stage === "worker_batch_closed").length, 1);
}

// An async comparison may overlap a real human/other-seat Apply. Reproduce that
// interleaving through the production Room query interface, reusing the exact
// comparisons above rather than starting a second expensive worker batch.
const authority = { roomId: "captured-r35-readonly", seatKey: domain.sideKey,
  matchBindingHash: "a".repeat(64), stateHash: originalStateHash,
  legalSpaceHash: "b".repeat(64), stateRevision: seed.stateRevision };
let reads = 0;
let comparisonCalled = false;
const adapter = createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({
  seatKey: domain.sideKey,
  roomStore: { async loadRoom() {
    reads += 1;
    return { stateRevision: seed.stateRevision + (comparisonCalled ? 1 : 0),
      envelope: { state: seed.state, matchBindingHash: authority.matchBindingHash,
        stateHash: comparisonCalled ? "c".repeat(64) : originalStateHash,
        matchBinding: {} } };
  } },
  rulesRuntime: { instantiate: instantiateOfficialSelectedRosterSpatialActionV1 },
  formationComparisonBatch: async jobs => {
    assert.equal(jobs.length, result.optionCount);
    comparisonCalled = true;
    return result.formationOptions.map(option => option.relationshipComparison);
  },
});
const stale = await adapter.query({ authority,
  queryKind: "space.solve_formation", arguments: {
    ...seed.request,
    domainId: domain.domainId,
    currentLegalSpaceDomain: domain,
  } });
assert.equal(stale.ok, true);
assert.equal(stale.precision, "unknown");
assert.equal(stale.result, null);
assert.equal(stale.rulesAuthority, false);
assert.equal(stale.reasonCode || stale.reason || stale.code,
  "RULES_QUERY_AUTHORITY_CHANGED_DURING_COMPUTATION");
assert.equal(reads, 2);
await writeFile(reportPath, JSON.stringify({
  schemaVersion: "captured_formation_parallel_regression_v1",
  status: "passed",
  capturedSerialElapsedMs: measured.elapsedMs,
  parallelElapsedMs: staleOnly ? null : elapsedMs,
  actualWorkerOverlap: staleOnly ? null : actualOverlap,
  heartbeatTicks: staleOnly ? null : heartbeatTicks,
  alreadyPassedWorkerAssertionsReused: staleOnly,
  completeResultJsonIdentical: true,
  completeOptions: result.optionCount,
  inputUnchanged: true,
  authorityChangeDuringComputationRejected: true,
  events,
  providerCalls: 0,
  roomMutations: 0,
  wholeLiveOneMinuteAccepted: false,
}, null, 2) + "\n");
console.log(JSON.stringify({ passed: true, elapsedMs, actualOverlap,
  heartbeatTicks, completeOptions: result.optionCount }));
