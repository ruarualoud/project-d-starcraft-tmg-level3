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
if (process.argv.includes("--proposal-recovery-parity-only")) {
  const db = new DatabaseSync(path.join(runDirectory,
    "seats/player2/bot-seat.sqlite"), { readOnly: true });
  let record;
  try {
    record = JSON.parse(db.prepare(
      "SELECT record_json FROM sc_hosted_bot_seat_records LIMIT 1").get().record_json);
  } finally { db.close(); }
  const finding = record.issues.find((entry) => entry.code
    === "LIVE_DECISION_PARAMETERIZED_PROPOSAL_DID_NOT_CONVERGE" && !entry.resolvedAt);
  assert(finding, "actual r54 unresolved proposal finding required");
  assert.equal(record.lastAppliedStateRevision, 54);
  assert.equal(record.inflight?.applyRequest ?? null, null);
  const options = { allowExistingRetryableFinding: true,
    startedAt: new Date(Date.parse(finding.occurredAt) + 1000).toISOString() };
  assert.equal(isStarcraftTmgHistoricalResumeFindingV1(finding, options), true,
    "explicit resume must reach the repaired proposal path, not block on its old finding");
  assert.equal(isStarcraftTmgHistoricalResumeFindingV1(finding,
    { ...options, allowExistingRetryableFinding: false }), false);
  assert.equal(isStarcraftTmgHistoricalResumeFindingV1(finding,
    { ...options, startedAt: finding.occurredAt }), false,
  "a new same-run failure still blocks");
  for (const code of ["REPLAY_MISMATCH", "SEAT_GRANT_INVALID",
    "provider_http_403", "provider_budget_exceeded", "UNKNOWN_HIGH_FAILURE"]) {
    assert.equal(isStarcraftTmgHistoricalResumeFindingV1({ ...finding, code }, options), false);
  }
  assert.equal(reconcileStarcraftTmgBotSeatReplayIssuesV1(record, options.startedAt)
    .find((entry) => entry.code === finding.code).resolvedAt, undefined,
  "resume admission is not successful recovery evidence");
  const lastTrace = record.traces.at(-1);
  const recovered = { ...record, driveStatus: "action_applied_replay_verified",
    lastAppliedStateRevision: 55, lastReplayMatchesCurrent: true,
    lastReceiptHash: "contact-recovery-fixture-receipt",
    traces: [...record.traces, { ...lastTrace,
      stateHash: record.lastAttemptedStateHash, postStateRevision: 55,
      applyReceiptHash: "contact-recovery-fixture-receipt", replayMatchesCurrent: true }] };
  assert(reconcileStarcraftTmgBotSeatReplayIssuesV1(recovered, options.startedAt)
    .find((entry) => entry.code === finding.code).resolvedAt,
  "a subsequent verified Apply closes but preserves the historical issue");
  console.log(JSON.stringify({ passed: true, revision: 54,
    explicitHistoricalResumeOnly: true, newAndAuthorityFailuresStillBlock: true,
    noPrematureIssueResolution: true, providerCalls: 0, roomMutations: 0, costCny: 0 }));
  process.exit(0);
}
if (process.argv.includes("--fork-prefix-accounting-only")) {
  const { backup } = await import("node:sqlite");
  const { mkdir, access } = await import("node:fs/promises");
  const fixtureDirectory = path.join(runDirectory, "fork-prefix-boundary-regression");
  await mkdir(fixtureDirectory, { recursive: true, mode: 0o700 });
  const files = ["room.sqlite", "seats/player1/bot-seat.sqlite",
    "seats/player2/bot-seat.sqlite"];
  const fixtures = [];
  for (const [index, relative] of files.entries()) {
    const destination = path.join(fixtureDirectory, `${index}.sqlite`);
    try { await access(destination); }
    catch (error) {
      if (error.code !== "ENOENT") throw error;
      const source = new DatabaseSync(path.join(runDirectory, relative), { readOnly: true });
      try { await backup(source, destination); } finally { source.close(); }
    }
    fixtures.push(destination);
  }
  const db = new DatabaseSync(fixtures[0], { readOnly: true });
  const revision = Number(db.prepare("SELECT state_revision FROM sc_rooms LIMIT 1").get().state_revision);
  db.close();
  const prefix = JSON.parse(await readFile(path.join(runDirectory, "fork-provenance.json"), "utf8"));
  const input = { previousStateRevision: revision - 1, previousActionCount: 0,
    roomDatabaseFilename: fixtures[0], replayedPrefix: prefix,
    seatDatabaseFilenames: { player1: fixtures[1], player2: fixtures[2] } };
  const boundary = readStarcraftTmgDurableAgentActionBoundaryV1(input);
  console.log(JSON.stringify({ revision, replayedPrefixCount: prefix.throughStateRevision,
    botActionCount: boundary.totalActionCount, replayCount: boundary.totalReplayVerifiedCount,
    atomicBoundarySatisfied: boundary.atomicBoundarySatisfied }));
  assert.equal(boundary.totalActionCount + prefix.throughStateRevision, revision,
    "the captured real fixture must contain a settled prefix plus new Bot actions");
  assert.equal(boundary.atomicBoundarySatisfied, true,
    "verified replayed prefix is not a missing Bot execution");
  assert.equal(boundary.replayedPrefixTransitionCount, prefix.throughStateRevision);
  assert.equal(boundary.accountedTransitionCount, revision);
  assert.equal(boundary.disposition, "restart_control_plane_without_replay");
  assert.equal(boundary.providerCallAuthorized, false);
  assert.equal(boundary.duplicateDriveAuthorized, false);
  assert.equal(readStarcraftTmgDurableAgentActionBoundaryV1({ ...input,
    replayedPrefix: null }).atomicBoundarySatisfied, false,
  "never infer a valid prefix from the count discrepancy alone");
  for (const mutate of [
    (copy) => { copy.throughStateRevision += 1; },
    (copy) => { copy.replayedTransitions[0].branchJournalHash = "wrong-room-receipt"; },
    (copy) => { copy.replayedTransitions[1].branchStateRevision = 1; },
    (copy) => { copy.replayedTransitions[0].branchStateHash = "wrong-state"; },
  ]) {
    const invalid = structuredClone(prefix); mutate(invalid);
    assert.equal(readStarcraftTmgDurableAgentActionBoundaryV1({ ...input,
      replayedPrefix: invalid }).atomicBoundarySatisfied, false);
  }
  const runner = await readFile(path.join(ROOT,
    "scripts/run-ticket-23-slice-248-agent-agent-web-v1.mjs"), "utf8");
  assert.match(runner, /replayedPrefix:\s*readDurableReplayPrefix\(runDirectory\)/u);
  console.log(JSON.stringify({ ok: true, sourceRevision: revision,
    prefixCount: boundary.replayedPrefixTransitionCount,
    noMissingActionsForgiven: true, providerCalls: 0, roomMutations: 0,
    existingPassedModesRepeated: false }));
  process.exit(0);
}
if (process.argv.includes("--startup-model-recovery-only")) {
  const { createStarcraftTmgLiveFlashDecisionPortV1 } = await import(
    "../packages/online-agent-session/live-flash-decision-port-v1.mjs");
  const { spawn } = await import("node:child_process");
  const records = ["player1", "player2"].map((seat) => {
    const db = new DatabaseSync(path.join(runDirectory,
      `seats/${seat}/provider/live-decisions.sqlite`), { readOnly: true });
    try { return JSON.parse(db.prepare(
      "SELECT record_json FROM sc_live_decision_records LIMIT 1").get().record_json);
    } finally { db.close(); }
  });
  assert.notEqual(records[0].selectedProfile.model, records[1].selectedProfile.model,
    "exercise the real divergent preflight startup failure");
  const failures = [];
  let networkProbes = 0;
  for (const record of records) {
    const port = createStarcraftTmgLiveFlashDecisionPortV1({
      providerSupervisor: { sendTurn() { throw Error("no generation"); }, readState() {} },
      promptArtifactStore: { put() {}, release() {} },
      profileAvailabilityPort: { async check() {
        networkProbes += 1; return { ok: false, reason: "MODEL_AVAILABILITY_TIMEOUT" };
      } },
      strategySkillPort: { async resolve() {
        return { ok: true, snapshot: record.strategySkillSnapshot };
      } },
      spatialQueryPort: { query() { throw Error("no Rules query"); } },
      store: { async load(key) {
        return key === record.scope.scopeKey ? structuredClone(record) : null;
      }, commit() { throw Error("read-only reproduction"); } },
      profileCandidates: records.map((entry) => entry.selectedProfile),
    });
    const result = await port.preflight({ scope: record.scope, matchMode: record.matchMode });
    if (!result.ok || result.selectedProfile?.model !== record.selectedProfile.model) {
      failures.push(`${record.scope.seatKey}:resume_reselects_frozen_model`);
    }
    if (result.selectionSource !== "persisted_match") {
      failures.push(`${record.scope.seatKey}:missing_resume_provenance`);
    }
  }
  if (networkProbes) failures.push("resume_repeats_model_discovery");
  const flash = records.find((entry) => entry.selectedProfile.model === "deepseek-flash");
  for (const alreadyCalled of [false, true]) {
    let record = structuredClone(records[0]);
    if (alreadyCalled) record.usage.providerCalls = 1;
    const port = createStarcraftTmgLiveFlashDecisionPortV1({
      providerSupervisor: { sendTurn() { throw Error("no generation"); }, readState() {} },
      promptArtifactStore: { put() {}, release() {} },
      profileAvailabilityPort: { async check() { return { ok: true, available: true }; } },
      strategySkillPort: { async resolve() {
        return { ok: true, snapshot: record.strategySkillSnapshot };
      } },
      spatialQueryPort: { query() { throw Error("no Rules query"); } },
      store: { async load() { return structuredClone(record); },
        async commit(key, revision, next) {
          assert.equal(revision, record.revision);
          record = structuredClone(next); return { ok: true };
        } },
      profileCandidates: [flash.selectedProfile], allowUnstartedProfileReselection: true,
    });
    const receipt = await port.preflight({ scope: record.scope, matchMode: record.matchMode });
    if (alreadyCalled) {
      assert.equal(receipt.ok, false, "never relabel an existing paid request");
    } else {
      assert.equal(receipt.ok, true);
      const opened = await port.openMatch({ scope: record.scope,
        preflightReceipt: receipt, providerSession: record.providerSession });
      assert.equal(opened.ok, true);
      assert.equal(record.selectedProfile.model, "deepseek-flash");
      assert.equal(record.usage.providerCalls, 0);
      assert(record.issues.some((issue) =>
        issue.code === "LIVE_DECISION_UNSTARTED_PROFILE_RESELECTED"));
    }
  }
  const serverSource = await readFile(path.join(ROOT,
    "scripts/serve-ticket-23-slice-248-agent-agent-web-v1.mjs"), "utf8");
  const runnerSource = await readFile(path.join(ROOT,
    "scripts/run-ticket-23-slice-248-agent-agent-web-v1.mjs"), "utf8");
  if (serverSource.includes('throw new Error("SLICE248_PROVIDER_MODEL_PARITY_FAILED")')
    || runnerSource.includes('"SLICE248_MODEL_PARITY_MISSING"')) {
    failures.push("authorized_seat_models_block_integration");
  }
  assert.equal((serverSource.match(
    /providerProfiles: \[STARCRAFT_TMG_TICKET_23_LIVE_FLASH_PROVIDER_PROFILE_V1\]/gu) || []).length, 2,
  "both live seats use only the user-selected Flash model");
  const fatalHandler = serverSource.slice(serverSource.lastIndexOf("main().catch("));
  assert(fatalHandler.startsWith("main().catch("));
  const outcome = await new Promise((resolve) => {
    const child = spawn(process.execPath, ["--input-type=module", "-e",
      `setInterval(() => {}, 1000); async function main() { throw Error("STARTUP_REPRO"); }\n${fatalHandler}`],
    { stdio: "ignore" });
    const timer = setTimeout(() => { child.kill("SIGTERM"); }, 1500);
    child.once("exit", (code, signal) => { clearTimeout(timer); resolve({ code, signal }); });
  });
  if (outcome.code !== 1 || outcome.signal) failures.push("fatal_startup_keeps_process_alive");
  console.log(JSON.stringify({ regressionFailures: failures, networkProbes,
    modelSnapshots: records.map((entry) => entry.selectedProfile.model),
    providerCalls: 0, roomMutations: 0 }));
  assert.deepEqual(failures, []);
  process.exit(0);
}
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
