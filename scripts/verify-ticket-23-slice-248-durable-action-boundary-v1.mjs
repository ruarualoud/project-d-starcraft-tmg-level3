#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { isStarcraftTmgTransientControlPlaneReadFailureV1,
  readStarcraftTmgDurableAgentActionBoundaryV1 } from
  "../packages/online-agent-session/durable-agent-action-boundary-v1.mjs";
import { reconcileStarcraftTmgBotSeatReplayIssuesV1 } from
  "../packages/online-agent-session/hosted-bot-seat-runtime-v1.mjs";
import { isStarcraftTmgHistoricalResumeFindingV1,
  STARCRAFT_TMG_RECOVERABLE_PROVIDER_FINDING_CODES_V1 } from
  "../packages/online-agent-session/decision-recovery-policy-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argument = process.argv.find((entry) =>
  entry.startsWith("--run-directory="));
assert(argument, "--run-directory is required");
const runDirectory = path.resolve(ROOT,
  argument.slice("--run-directory=".length));
if (process.argv.includes("--provider-timeout-recovery-only")) {
  const db = new DatabaseSync(path.join(runDirectory,
    "seats/player2/bot-seat.sqlite"), { readOnly: true });
  let record;
  try {
    record = JSON.parse(db.prepare(
      "SELECT record_json FROM sc_hosted_bot_seat_records LIMIT 1",
    ).get().record_json);
  } finally { db.close(); }
  const finding = record.issues.find((entry) =>
    entry.code === "provider_transport_timeout" && !entry.resolvedAt);
  assert(finding, "reproduce the actual unresolved r7 transport timeout");
  assert.equal(record.lastAppliedStateRevision, 7);
  assert.equal(record.inflight, null);
  const options = { allowExistingRetryableFinding: true,
    startedAt: new Date(Date.parse(finding.occurredAt) + 1000).toISOString() };
  const regressions = [];
  if (!isStarcraftTmgHistoricalResumeFindingV1(finding, options)) {
    regressions.push("settled_historical_timeout_cannot_resume");
  }
  const lastTrace = record.traces.at(-1);
  const recovered = { ...record, driveStatus: "action_applied_replay_verified",
    lastAppliedStateRevision: 8, lastReplayMatchesCurrent: true,
    lastReceiptHash: "timeout-recovery-verification-receipt",
    traces: [...record.traces, { ...lastTrace,
      stateHash: record.lastAttemptedStateHash, postStateRevision: 8,
      applyReceiptHash: "timeout-recovery-verification-receipt",
      replayMatchesCurrent: true }] };
  if (!reconcileStarcraftTmgBotSeatReplayIssuesV1(recovered, options.startedAt)
    .find((entry) => entry.code === finding.code)?.resolvedAt) {
    regressions.push("verified_retry_does_not_close_timeout");
  }
  console.log(JSON.stringify({ regressionFailures: regressions }));
  assert.deepEqual(regressions, []);
  assert.equal(isStarcraftTmgHistoricalResumeFindingV1(finding, {
    ...options, allowExistingRetryableFinding: false }), false);
  assert.equal(isStarcraftTmgHistoricalResumeFindingV1(finding, {
    ...options, startedAt: finding.occurredAt }), false);
  assert.equal(isStarcraftTmgHistoricalResumeFindingV1({ ...finding,
    occurredAt: "invalid" }, options), false);
  for (const code of ["provider_http_403", "provider_budget_exceeded",
    "provider_remote_address_drift", "SEAT_GRANT_INVALID"]) {
    assert.equal(isStarcraftTmgHistoricalResumeFindingV1({ ...finding, code }, options), false);
    assert.equal(reconcileStarcraftTmgBotSeatReplayIssuesV1({ ...recovered,
      issues: [{ ...finding, code }] }, options.startedAt)[0].resolvedAt, undefined);
  }
  assert.equal(isStarcraftTmgHistoricalResumeFindingV1({ ...finding,
    code: "REPLAY_MISMATCH" }, options), false);
  assert.equal(reconcileStarcraftTmgBotSeatReplayIssuesV1(record, options.startedAt)
    .find((entry) => entry.code === finding.code).resolvedAt, undefined,
  "the preceding r7 success cannot resolve its subsequent failed request");
  for (const code of STARCRAFT_TMG_RECOVERABLE_PROVIDER_FINDING_CODES_V1) {
    assert(isStarcraftTmgHistoricalResumeFindingV1({ ...finding, code }, options));
    assert(reconcileStarcraftTmgBotSeatReplayIssuesV1({ ...recovered,
      issues: [{ ...finding, code }] }, options.startedAt)[0].resolvedAt);
  }
  console.log(JSON.stringify({ ok: true, stateRevision: 7,
    recoveredCodes: STARCRAFT_TMG_RECOVERABLE_PROVIDER_FINDING_CODES_V1,
    newFailuresStillBlock: true, historicalSuccessCannotClearLaterFailure: true,
    providerCalls: 0, roomMutations: 0, existingPassedModesRepeated: false }));
  process.exit(0);
}
if (process.argv.includes("--transport-recovery-only")) {
  const db = new DatabaseSync(path.join(runDirectory,
    "seats/player2/bot-seat.sqlite"), { readOnly: true });
  let record;
  try {
    record = JSON.parse(db.prepare(
      "SELECT record_json FROM sc_hosted_bot_seat_records LIMIT 1",
    ).get().record_json);
  } finally { db.close(); }
  assert.equal(record.lastAppliedStateRevision, 6);
  assert.equal(record.lastReplayMatchesCurrent, true);
  assert.equal(record.inflight, null);
  const at = "2026-09-23T00:00:00.000Z";
  const issues = reconcileStarcraftTmgBotSeatReplayIssuesV1(record, at);
  const transportCodes = ["provider_worker_protocol_rejected", "provider_transport_failed"];
  const failures = [];
  if (!transportCodes.every((code) => issues.some((issue) =>
    issue.code === code && issue.resolvedAt))) failures.push("successful_retry_keeps_old_transport_blockers");
  if (isStarcraftTmgTransientControlPlaneReadFailureV1({
    code: "SLICE248_CRITICAL_OR_HIGH_FINDING" })) failures.push("semantic_failure_is_retried_forever");
  console.log(JSON.stringify({ regressionFailures: failures }));
  assert.deepEqual(failures, []);
  const withNewFailure = { ...record, driveStatus: "blocked_high_finding" };
  assert(reconcileStarcraftTmgBotSeatReplayIssuesV1(withNewFailure, at)
    .filter((issue) => transportCodes.includes(issue.code)).every((issue) => !issue.resolvedAt),
  "an older successful action cannot clear a later failed attempt");
  const withoutReplay = { ...record, lastReplayMatchesCurrent: false };
  assert(reconcileStarcraftTmgBotSeatReplayIssuesV1(withoutReplay, at)
    .filter((issue) => transportCodes.includes(issue.code)).every((issue) => !issue.resolvedAt));
  const withSecurityIssue = { ...record,
    issues: [...record.issues, { code: "SEAT_GRANT_INVALID", severity: "High" }] };
  assert.equal(reconcileStarcraftTmgBotSeatReplayIssuesV1(withSecurityIssue, at)
    .find((issue) => issue.code === "SEAT_GRANT_INVALID").resolvedAt, undefined);
  assert.equal(issues.length, record.issues.length, "resolution preserves history");
  assert.equal(isStarcraftTmgTransientControlPlaneReadFailureV1({ name: "AbortError" }), true);
  assert.equal(isStarcraftTmgTransientControlPlaneReadFailureV1({
    name: "TypeError", message: "fetch failed", cause: { code: "ECONNRESET" } }), true);
  assert.equal(isStarcraftTmgTransientControlPlaneReadFailureV1({
    code: "SLICE248_AA_BUDGET_EXCEEDED" }), false);
  assert.equal(isStarcraftTmgTransientControlPlaneReadFailureV1({
    code: "SLICE248_MANIFEST_HTTP_FAILED", status: 503 }), true);
  assert.equal(isStarcraftTmgTransientControlPlaneReadFailureV1({
    code: "SLICE248_MANIFEST_HTTP_FAILED", status: 403 }), false);
  console.log(JSON.stringify({ ok: true, stateRevision: 6,
    recoveredCodes: transportCodes, historyPreserved: true,
    newFailuresStillBlock: true, semanticReadFailuresStop: true,
    providerCalls: 0, roomMutations: 0 }));
  process.exit(0);
}
const failure = JSON.parse(await readFile(path.join(runDirectory,
  "failure.json"), "utf8"));
const previousStateRevision = Number(
  failure.lastManifest?.room?.stateRevision || 0);
const previousActionCount = Number(failure.actionCount || 0);
const boundary = readStarcraftTmgDurableAgentActionBoundaryV1({
  previousStateRevision,
  previousActionCount,
  roomDatabaseFilename: path.join(runDirectory, "room.sqlite"),
  seatDatabaseFilenames: {
    player1: path.join(runDirectory, "seats/player1/bot-seat.sqlite"),
    player2: path.join(runDirectory, "seats/player2/bot-seat.sqlite"),
  },
});

assert.equal(failure.code, "20");
assert.equal(previousStateRevision, 18);
assert.equal(previousActionCount, 18);
assert.equal(boundary.room.stateRevision, 19);
assert.equal(boundary.room.acceptedTransitionCount, 19);
assert.equal(boundary.totalActionCount, 19);
assert.equal(boundary.totalReplayVerifiedCount, 19);
assert.equal(boundary.atomicBoundarySatisfied, true);
assert.equal(boundary.disposition,
  "restart_control_plane_without_replay");
assert.equal(boundary.duplicateDriveAuthorized, false);
assert.equal(boundary.providerCallAuthorized, false);

process.stdout.write(`${JSON.stringify({
  schema: "ticket23_slice248_durable_action_boundary_verification_v1",
  ok: true,
  reproducedFailure: {
    runnerFailureCode: failure.code,
    runnerObservedStateRevision: previousStateRevision,
    runnerObservedActionCount: previousActionCount,
  },
  boundary,
  providerCalls: 0,
  roomMutations: 0,
  trainingTruth: false,
}, null, 2)}\n`);
