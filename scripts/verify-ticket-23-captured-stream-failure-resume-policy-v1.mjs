// Concrete C108 capture: settled stream failure is missing from the shared
// explicit-later-run taxonomy. No dispatch, Room write, or automatic retry.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { isStarcraftTmgHistoricalResumeFindingV1,
  STARCRAFT_TMG_RECOVERABLE_PROVIDER_FINDING_CODES_V1 } from
  "../packages/online-agent-session/decision-recovery-policy-v1.mjs";

const workerTimeoutOnly = process.argv[2] === "--worker-timeout-only";
const [capturePath, reportPath] = process.argv.slice(workerTimeoutOnly ? 3 : 2);
const capture = JSON.parse(await readFile(capturePath, "utf8"));
const choice = capture.choices[0];
assert.equal(choice.status, "provider_failed_requires_explicit_retry");
if (!workerTimeoutOnly) assert.equal(choice.attempts.length, 1);
const failedReply = choice.attempts.at(-1);
assert.equal(failedReply.safeOutputPresent, false);
assert.equal(failedReply.usage, null);
if (workerTimeoutOnly) {
  assert.equal(failedReply.status, "provider_failed_after_possible_egress");
  assert.equal(failedReply.failure, "provider_worker_result_timeout");
  assert(failedReply.completedAt, "original attempt must already be settled");
  assert.equal(capture.failedAttempts[0].usageKnown, 0);
  assert.equal(capture.failedAttempts[0].providerMayHaveBeenCalled, 1);
  assert.equal(capture.authority.stateRevision, 7);
  assert(capture.allStopClosedAt, "all original hosts must be sealed before repair");
}
assert(capture.failedAttempts.every(x => x.status === "failed" && x.settledAt));
assert(capture.bots.every(x => x.inflight === null));
const finding = capture.bots.flatMap(x => x.issues).find(x =>
  x.code === (workerTimeoutOnly ? "provider_worker_result_timeout"
    : "provider_response_stream_failed"));
assert(finding, "must use the actual captured High finding");
if (workerTimeoutOnly) {
  assert.equal(finding.code, capture.startupBlockingFinding.code);
  assert.equal(finding.occurredAt, capture.startupBlockingFinding.occurredAt);
}
const input = { allowExistingRetryableFinding: true,
  startedAt: workerTimeoutOnly ? capture.runStartedAt : capture.observedAt };
assert.equal(isStarcraftTmgHistoricalResumeFindingV1(finding, input), true,
  "settled historical transport failure must admit an explicit later run");
assert(STARCRAFT_TMG_RECOVERABLE_PROVIDER_FINDING_CODES_V1.includes(finding.code));
assert.equal(isStarcraftTmgHistoricalResumeFindingV1(finding,
  { ...input, allowExistingRetryableFinding: false }), false);
assert.equal(isStarcraftTmgHistoricalResumeFindingV1(finding,
  { ...input, startedAt: finding.occurredAt }), false,
  "a fresh failure in the new run still blocks");
assert.equal(isStarcraftTmgHistoricalResumeFindingV1(
  { ...finding, resolvedAt: capture.observedAt }, input), false);
for (const code of ["LIVE_DECISION_PROVIDER_COMMIT_UNKNOWN",
  "RULES_QUERY_AUTHORITY_CHANGED_DURING_COMPUTATION",
  "PROVIDER_BUDGET_EXHAUSTED", "ROOM_SEAT_AUTHORIZATION_INVALID"]) {
  assert.equal(isStarcraftTmgHistoricalResumeFindingV1({ ...finding, code }, input),
    false, `${code} must not be waived by transport classification`);
}
const report = { passed: true, originalCode: finding.code,
  mode: workerTimeoutOnly ? "captured_worker_timeout_only" : "captured_stream_failure",
  historicalExplicitResumeClassified: true, freshRunFailureStillBlocks: true,
  noCompletePaidReplyExists: true, originalUsageRemainsUnknown: true,
  settlementAndRetryConsentStillSeparate: true, providerCalls: 0, roomWrites: 0,
  scope: "shared_resume_taxonomy_not_dispatch_settlement_or_game_legality",
  trainingTruth: false };
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n",
  { mode: 0o600 });
console.log(JSON.stringify(report));
