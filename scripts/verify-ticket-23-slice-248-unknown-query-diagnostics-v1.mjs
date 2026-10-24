// Concrete r70 bug: the Room adapter's zero-option counts disappear at
// delegatedResult(unknown). Keep diagnostics private; paid receipt bytes stay
// unchanged. Counts below are explicitly synthetic, not recovered game facts.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createStarcraftTmgSpatialActionQueryRuntimeV1 } from
  "../packages/online-agent-session/spatial-action-query-runtime-v1.mjs";

const [capturePath, reportPath] = process.argv.slice(2);
const capture = JSON.parse(await readFile(capturePath, "utf8"));
const savedReceipt = capture.savedReceipt;
const authority = savedReceipt.authority;
const input = {
  roomProjection: {
    room: { roomId: authority.roomId, stateRevision: authority.stateRevision,
      stateHash: authority.stateHash },
    matchBinding: { bindingHash: authority.matchBindingHash },
    viewer: { seatKey: authority.seatKey,
      visibilityScope: authority.visibilityScope },
    state: {},
  },
  legalSpace: { roomId: authority.roomId,
    matchBindingHash: authority.matchBindingHash,
    stateRevision: authority.stateRevision, stateHash: authority.stateHash,
    legalSpaceHash: authority.legalSpaceHash, parameterDomains: [] },
  spatialObservation: { roomId: authority.roomId,
    matchBindingHash: authority.matchBindingHash,
    stateRevision: authority.stateRevision, stateHash: authority.stateHash,
    observationHash: authority.spatialObservationHash },
  request: { queryKind: savedReceipt.queryKind, arguments: {} },
};
const diagnosticFixture = { attemptedCandidateCount: 7,
  failureCounts: { RULES_FIXTURE_PLACEMENT_REJECTED: 7 } };
const adapterResponse = { ok: true, authority, precision: "unknown",
  reason: savedReceipt.reason, findingSeverity: savedReceipt.findingSeverity,
  failureStage: savedReceipt.failureStage,
  safeFailureClass: savedReceipt.safeFailureClass,
  mayRepairSameChoice: savedReceipt.mayRepairSameChoice,
  repairContext: savedReceipt.repairContext, ...diagnosticFixture,
  secretOutsideDiagnostics: "fixture-only-not-for-observer" };
const adapterBytes = JSON.stringify(adapterResponse);
const events = [];
let adapterCalls = 0;
const runtime = createStarcraftTmgSpatialActionQueryRuntimeV1({
  rulesQuery: async () => { adapterCalls += 1; return adapterResponse; },
  observeQueryDiagnostic: event => { events.push(event); },
});
const report = { schemaVersion: "unknown_query_private_diagnostics_regression_v1",
  capturedStateRevision: authority.stateRevision,
  diagnosticCountsAreSynthetic: true, originalReceiptUnchanged: false,
  backendDiagnosticsObserved: false, observerCannotChangeReceipt: false,
  cacheDoesNotRepeatAdapter: false, adapterResponseUnchanged: false,
  providerCalls: 0, roomMutations: 0 };
try {
  const receipt = await runtime.query(input);
  assert.deepEqual(receipt, savedReceipt,
    "private diagnostics must not change already-paid query receipt bytes/hash");
  report.originalReceiptUnchanged = true;
  assert.equal(events.length, 1,
    "zero-option adapter diagnostics must survive in a backend-only observer");
  assert.equal(events[0].attemptedCandidateCount,
    diagnosticFixture.attemptedCandidateCount);
  assert.deepEqual(events[0].failureCounts, diagnosticFixture.failureCounts);
  assert.equal(events[0].queryReceiptHash, savedReceipt.queryReceiptHash);
  assert.equal(events[0].operation, "spatial_query_backend");
  assert.equal(events[0].secretOutsideDiagnostics, undefined);
  assert.equal(events[0].result, undefined);
  assert.equal(Object.isFrozen(events[0]), true);
  assert.equal(Object.isFrozen(events[0].failureCounts), true);
  report.backendDiagnosticsObserved = true;
  const cached = await runtime.query(input);
  assert.deepEqual(cached, savedReceipt);
  assert.equal(adapterCalls, 1);
  assert.equal(events.length, 1);
  report.cacheDoesNotRepeatAdapter = true;
  const throwing = createStarcraftTmgSpatialActionQueryRuntimeV1({
    rulesQuery: async () => adapterResponse,
    observeQueryDiagnostic: () => { throw new Error("fixture-observer-failed"); },
  });
  assert.deepEqual(await throwing.query(input), savedReceipt);
  report.observerCannotChangeReceipt = true;
  assert.equal(JSON.stringify(adapterResponse), adapterBytes);
  report.adapterResponseUnchanged = true;
  report.status = "passed";
} catch (error) {
  report.status = "failed";
  report.errorCode = error.code || error.name;
  report.message = error.message;
  process.exitCode = 1;
} finally {
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
}
