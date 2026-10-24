import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { performance } from "node:perf_hooks";
import { createStarcraftTmgLiveFlashDecisionPortV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { decodeStarcraftTmgLiveDecisionRecordV1 } from
  "../packages/online-agent-session/sqlite-live-decision-store-v1.mjs";

// Read the real long-match payload without writing to its database. Only the
// isolated fixture's attempt status is changed to reach the recovery interface;
// this does NOT claim that the captured paid attempt had an unknown outcome.
const [databasePath, choiceKey, reportPath] = process.argv.slice(2);
const database = new DatabaseSync(databasePath, { readOnly: true });
let record;
try {
  const rows = database.prepare(
    "SELECT record_json FROM sc_live_decision_records").all();
  assert.equal(rows.length, 1, "capture must identify one seat record");
  record = decodeStarcraftTmgLiveDecisionRecordV1(rows[0].record_json);
} finally {
  database.close();
}
const choice = record.decisions[choiceKey];
assert(choice, "captured current decision must exist");
const attemptKey = choice.attemptKeys.at(-1);
assert(choice.attempts[attemptKey], "captured attempt must exist");
choice.status = "provider_call_may_have_started";
choice.attempts[attemptKey].status = "provider_call_may_have_started";
const fixedNow = new Date(Date.parse(record.updatedAt) + 1).toISOString();
const bytes = Buffer.byteLength(JSON.stringify(record));
const digest = value => createHash("sha256")
  .update(JSON.stringify(value)).digest("hex");
const inputHash = digest(record);
const originalRevision = record.revision;
const expectedChoice = JSON.parse(JSON.stringify(choice));
expectedChoice.attempts[attemptKey].status = "manually_resolved_not_sent";
expectedChoice.attempts[attemptKey].completedAt = fixedNow;
expectedChoice.status = "retry_ready";
expectedChoice.warnings.push("COMMIT_UNKNOWN_MANUALLY_RESOLVED_NOT_SENT");
const expectedRecovery = { ...record, decisions: {
  ...record.decisions, [choiceKey]: expectedChoice },
  revision: originalRevision + 1, updatedAt: fixedNow };
const recoveryHash = digest(expectedRecovery);
const expectedClosed = { ...expectedRecovery, lifecycle: "closed",
  closedAt: fixedNow, revision: originalRevision + 2 };
const closedHash = digest(expectedClosed);
let forbiddenCalls = 0;
const unused = async () => {
  forbiddenCalls += 1;
  throw new Error("No Provider, query, prompt or discovery is allowed in this gate");
};
const makePort = store => createStarcraftTmgLiveFlashDecisionPortV1({
  store, profileCandidates: [record.selectedProfile], now: () => fixedNow,
  providerSupervisor: { sendTurn: unused, readState: unused },
  promptArtifactStore: { put: unused, release: unused },
  profileAvailabilityPort: { check: unused },
  strategySkillPort: { resolve: unused }, spatialQueryPort: { query: unused },
});
let current = record;
let commitCount = 0;
const store = {
  durability: "captured_private_graph_test_only",
  async load(key) { assert.equal(key, record.scope.scopeKey); return current; },
  async commit(key, revision, next) {
    assert.equal(key, record.scope.scopeKey);
    assert.equal(revision, current.revision);
    assert.equal(next.revision, revision + 1);
    current = next;
    commitCount += 1;
    return { ok: true, revision: next.revision };
  },
};
const nativeClone = globalThis.structuredClone;
const copies = [];
globalThis.structuredClone = value => {
  const start = performance.now();
  const cloned = nativeClone(value);
  copies.push({ decisionCount: value?.decisions
    ? Object.keys(value.decisions).length : 0,
  selectedChoice: value?.choiceKey === choiceKey,
  durationMs: performance.now() - start });
  return cloned;
};
let recovery;
let closed;
let recoveryMs;
let closeMs;
let failure;
let failedRead;
try {
  const port = makePort(store);
  let start = performance.now();
  recovery = await port.resolveCommitUnknown({ scope: record.scope,
    choiceKey, attemptKey, resolution: "definitely_not_sent" });
  recoveryMs = performance.now() - start;
  assert.equal(recovery.ok, true);
  assert.equal(recovery.automaticRetryPerformed, false);
  assert.equal(digest(current), recoveryHash, "complete recovery bytes preserved");
  assert.equal(digest(record), inputHash, "previous private graph not mutated");
  const recoveredRecord = current;
  start = performance.now();
  closed = await port.closeMatch({ scope: record.scope });
  closeMs = performance.now() - start;
  assert.equal(closed.ok, true);
  assert.equal(digest(current), closedHash, "complete close bytes preserved");
  assert.equal(digest(recoveredRecord), recoveryHash);
  assert.equal(current.usage.totalUnits, record.usage.totalUnits);
  assert.equal(current.usage.estimatedCostCnyMicros,
    record.usage.estimatedCostCnyMicros);
  const failedPort = makePort({ ...store,
    async load() { return record; },
    async commit() {
      return { ok: false, reason: "LIVE_DECISION_STORE_REVISION_CONFLICT" };
    },
  });
  failure = await failedPort.resolveCommitUnknown({ scope: record.scope,
    choiceKey, attemptKey, resolution: "definitely_not_sent" });
  failedRead = await failedPort.read({ scope: record.scope });
  assert.equal(failure.reason, "LIVE_DECISION_STORE_REVISION_CONFLICT");
  assert.equal(failure.findingSeverity, "High");
  assert.equal(failedRead.projection.revision, originalRevision);
  assert.equal(digest(record), inputHash, "failed CAS cannot mutate cached input");
} finally {
  globalThis.structuredClone = nativeClone;
}
const coldKeys = Object.keys(record.decisions).filter(key => key !== choiceKey);
const sharedColdDecisions = coldKeys.filter(key =>
  current.decisions[key] === record.decisions[key]).length;
const immutableColdDecisions = coldKeys.filter(key =>
  Object.isFrozen(current.decisions[key])
    && Object.isFrozen(current.decisions[key].attemptKeys)).length;
const report = {
  schemaVersion: "captured_live_history_copy_regression_v1",
  status: copies.some(entry => entry.decisionCount > 0) ? "failed" : "passed",
  captureBytes: bytes, decisionCount: Object.keys(record.decisions).length,
  fixtureOnlyUnknownStatus: true, liveAttemptOutcomeUnchanged: true,
  completeRecoveryHash: recoveryHash, completeCloseHash: closedHash,
  completeSerializedRecordsPreserved: true, previousPrivateGraphPreserved: true,
  failedCompareAndSwapPreserved: true, sharedColdDecisions, immutableColdDecisions,
  selectedChoiceCopied: current.decisions[choiceKey] !== record.decisions[choiceKey],
  copies, recoveryMs, closeMs, committedUpdates: commitCount,
  providerCalls: forbiddenCalls, roomMutations: 0, databaseWrites: 0,
  performanceScope: "local commit copying only; not whole-action acceptance",
};
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
assert.equal(forbiddenCalls, 0);
assert.equal(copies.some(entry => entry.decisionCount > 0), false,
  "BUG: single-decision/root-only updates copy the entire long-match history");
assert.equal(sharedColdDecisions, coldKeys.length);
assert.equal(immutableColdDecisions, coldKeys.length);
assert.notEqual(current.decisions[choiceKey], record.decisions[choiceKey]);
console.log(JSON.stringify({ passed: true, captureBytes: bytes,
  sharedColdDecisions, recoveryMs, closeMs, providerCalls: 0 }));
