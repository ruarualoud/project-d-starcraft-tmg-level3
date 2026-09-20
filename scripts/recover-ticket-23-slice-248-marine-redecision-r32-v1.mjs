#!/usr/bin/env node

import { DatabaseSync } from "node:sqlite";
import {
  cp, mkdir, readFile, readdir, rename, writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgRefereeCrypto } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { createSqliteStarcraftTmgRoomStore } from
  "../packages/room-store/sqlite-room-store-v1.mjs";
import { createTicket20AgentAgentDemoFixtureV1 } from
  "./support/ticket20-human-agent-demo-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIVE_ROOT = path.join(ROOT,
  "build/ticket-23-slice-248-standard-2000-aa-live-v1");
const RUN_ID = "20260916223306152";
const TARGET_STATE_REVISION = 32;
const TARGET_PRIVATE_SEQUENCE = 162;
const TARGET_PUBLIC_SEQUENCE = 33;
const TARGET_RECOVERY_REVISION = 53;
const TARGET_ROOM_REVISION = 161;

function ensure(condition, code, details = {}) {
  if (!condition) throw Object.assign(new Error(code), { code, ...details });
}

function codecFor(directory, privateState) {
  return createStarcraftTmgPrivatePayloadCodec({
    key: privateState.storeEncryptionKeyBase64,
    keyId: `ticket23-slice248-room-store-${path.basename(directory)}`,
    trustLevel: "development_persistent",
  });
}

function refereeCryptoFor(directory, privateState) {
  return createStarcraftTmgRefereeCrypto({
    privateKey: privateState.refereePrivateKeyPem,
    publicKey: privateState.refereePublicKeyPem,
    hmacSecret: privateState.refereeHmacSecret,
    keyId: `ticket23-slice248-referee-${path.basename(directory)}`,
    trustLevel: "development_persistent",
  });
}

function receiptFrom(entry) {
  return entry?.payload?.type === "accepted_transition"
    ? entry.payload.payload?.receipt || null : null;
}

function patchBotSeat(filename, seatKey, stateHash) {
  const database = new DatabaseSync(filename);
  try {
    const row = database.prepare(`
      SELECT scope_key, revision, record_json
        FROM sc_hosted_bot_seat_records
    `).get();
    ensure(row, "SLICE248_R32_BOT_RECORD_MISSING", { seatKey });
    const record = JSON.parse(String(row.record_json));
    const traces = (record.traces || []).filter((trace) =>
      Number(trace.postStateRevision || 0) <= TARGET_STATE_REVISION);
    const expected = seatKey === "player1" ? 17 : 15;
    ensure(traces.length === expected,
      "SLICE248_R32_BOT_TRACE_DENOMINATOR_CHANGED", {
        seatKey, expected, observed: traces.length,
      });
    const lastTrace = traces.at(-1);
    Object.assign(record, {
      lifecycle: "active",
      driveStatus: "attached",
      actionCount: traces.length,
      replayVerifiedCount: traces.length,
      lastObservedStateRevision: TARGET_STATE_REVISION,
      lastObservedStateHash: stateHash,
      lastAttemptedStateHash: null,
      preexecutionDeferralStateHash: null,
      lastAppliedStateRevision: Number(lastTrace.postStateRevision),
      lastDecision: null,
      lastReceiptHash: lastTrace.applyReceiptHash,
      lastReplayMatchesCurrent: true,
      inflight: null,
      traces,
      lastPreviewFailure: null,
      updatedAt: new Date().toISOString(),
    });
    const result = database.prepare(`
      UPDATE sc_hosted_bot_seat_records
         SET record_json = ?, updated_at = ?
       WHERE scope_key = ? AND revision = ?
    `).run(JSON.stringify(record), record.updatedAt, row.scope_key,
      row.revision);
    ensure(Number(result.changes) === 1,
      "SLICE248_R32_BOT_RECORD_UPDATE_FAILED", { seatKey });
    return {
      actionCount: record.actionCount,
      lastAppliedStateRevision: record.lastAppliedStateRevision,
      traceCount: traces.length,
    };
  } finally {
    database.close();
  }
}

function truncateMemory(filename, seatKey) {
  const database = new DatabaseSync(filename);
  try {
    const rows = database.prepare(`
      SELECT sequence, record_json
        FROM sc_match_decision_journal
       ORDER BY sequence
    `).all();
    const firstInvalid = rows.find((row) => {
      const record = JSON.parse(String(row.record_json));
      return record.kind !== "decision_outcome"
        && Number(record.authority?.stateRevision || -1)
          >= TARGET_STATE_REVISION;
    });
    ensure(firstInvalid, "SLICE248_R32_MEMORY_BOUNDARY_MISSING", { seatKey });
    const deleted = database.prepare(`
      DELETE FROM sc_match_decision_journal WHERE sequence >= ?
    `).run(Number(firstInvalid.sequence));
    const remaining = database.prepare(`
      SELECT COUNT(*) AS count, MAX(sequence) AS maximum_sequence
        FROM sc_match_decision_journal
    `).get();
    return {
      firstRemovedSequence: Number(firstInvalid.sequence),
      deletedCount: Number(deleted.changes),
      remainingCount: Number(remaining.count),
      maximumSequence: Number(remaining.maximum_sequence),
    };
  } finally {
    database.close();
  }
}

function removeDecisionCacheAtOrAfter(filename, seatKey) {
  const database = new DatabaseSync(filename);
  try {
    const row = database.prepare(`
      SELECT scope_key, revision, record_json
        FROM sc_live_decision_records
    `).get();
    ensure(row, "SLICE248_R32_DECISION_RECORD_MISSING", { seatKey });
    const record = JSON.parse(String(row.record_json));
    const entries = Object.entries(record.decisions || {});
    const retained = entries.filter(([, decision]) =>
      Number(decision.authority?.stateRevision || -1)
        < TARGET_STATE_REVISION);
    const removed = entries.length - retained.length;
    ensure(removed > 0, "SLICE248_R32_DECISION_CACHE_BOUNDARY_MISSING", {
      seatKey,
    });
    record.decisions = Object.fromEntries(retained);
    record.updatedAt = new Date().toISOString();
    const result = database.prepare(`
      UPDATE sc_live_decision_records
         SET record_json = ?, updated_at = ?
       WHERE scope_key = ? AND revision = ?
    `).run(JSON.stringify(record), record.updatedAt, row.scope_key,
      row.revision);
    ensure(Number(result.changes) === 1,
      "SLICE248_R32_DECISION_CACHE_UPDATE_FAILED", { seatKey });
    return { removedDecisionCount: removed,
      retainedDecisionCount: retained.length };
  } finally {
    database.close();
  }
}

async function main() {
  const sourceDirectory = path.join(LIVE_ROOT, RUN_ID);
  const targetDirectory = path.join(LIVE_ROOT,
    "recovery-r32-marine-redecision", RUN_ID);
  await mkdir(path.dirname(targetDirectory), { recursive: true, mode: 0o700 });
  await cp(sourceDirectory, targetDirectory, {
    recursive: true,
    errorOnExist: true,
    force: false,
    preserveTimestamps: true,
  });
  const privateState = JSON.parse(await readFile(path.join(
    targetDirectory, "runner-private.json"), "utf8"));
  const codec = codecFor(targetDirectory, privateState);
  let roomStore = createSqliteStarcraftTmgRoomStore({
    filename: path.join(targetDirectory, "room.sqlite"),
    privatePayloadCodec: codec,
  });
  const sourceStore = createSqliteStarcraftTmgRoomStore({
    filename: path.join(sourceDirectory, "room.sqlite"),
    privatePayloadCodec: codecFor(sourceDirectory, privateState),
  });
  const sourceBefore = await sourceStore.loadRoom(privateState.roomId);
  ensure(Number(sourceBefore?.stateRevision) === 35,
    "SLICE248_R32_SOURCE_NOT_R35");
  const bundle = await roomStore.loadReplayBundle(privateState.roomId);
  ensure(Number(bundle.latestCheckpoint?.stateRevision) === 32,
    "SLICE248_R32_CHECKPOINT_CHANGED");
  const fixture = await createTicket20AgentAgentDemoFixtureV1({
    root: ROOT,
    roomId: privateState.roomId,
    roomProfile: "standard_2000_live",
    mapConfiguration: {
      seedId: "sc1_lost_temple_v1",
      elementSelections: [], passageSelections: [],
    },
    maxAppliedActions: 180,
    enableSpatialPreexecution: false,
    autoDrive: false,
    attachBot: false,
    issueHumanRecovery: false,
    roomStore,
    refereeCrypto: refereeCryptoFor(targetDirectory, privateState),
    resumeRoom: true,
    resumeCredentials: privateState.resumeCredentials,
  });
  const replay = fixture.authorityEngine.replay({
    initialEnvelope: bundle.initialEnvelope,
    checkpoint: bundle.latestCheckpoint,
    journal: [],
  });
  ensure(replay.ok === true
    && Number(replay.envelope.stateRevision) === TARGET_STATE_REVISION,
  "SLICE248_R32_CHECKPOINT_REPLAY_FAILED");

  const tail = bundle.privateJournal.filter((entry) =>
    entry.sequence > TARGET_PRIVATE_SEQUENCE);
  const recoveryIds = tail.filter((entry) =>
    entry.payload?.type === "seat_recovery_issued")
    .map((entry) => entry.payload.payload.recoveryTicketId);
  const previewIds = tail.filter((entry) =>
    entry.payload?.type === "preview_sealed")
    .map((entry) => entry.payload.payload.previewId);
  const confirmationIds = tail.filter((entry) =>
    entry.payload?.type === "preview_confirmed")
    .map((entry) => entry.payload.payload.confirmationId);
  ensure(recoveryIds.length === 2 && previewIds.length === 3
    && confirmationIds.length === 2,
  "SLICE248_R32_TAIL_SHAPE_CHANGED", {
    recoveryCount: recoveryIds.length,
    previewCount: previewIds.length,
    confirmationCount: confirmationIds.length,
  });
  const aggregate = structuredClone(bundle.currentAggregate);
  Object.assign(aggregate, {
    roomRevision: TARGET_ROOM_REVISION,
    stateRevision: TARGET_STATE_REVISION,
    privateJournalSequence: TARGET_PRIVATE_SEQUENCE,
    publicJournalSequence: TARGET_PUBLIC_SEQUENCE,
    seatRecoveryRevision: TARGET_RECOVERY_REVISION,
    acceptedReceiptCount: TARGET_STATE_REVISION,
    envelope: structuredClone(replay.envelope),
  });
  for (const id of recoveryIds) delete aggregate.recoveryTickets[id];
  for (const id of previewIds) delete aggregate.previews[id];
  for (const id of confirmationIds) delete aggregate.confirmations[id];
  for (const seatKey of ["player1", "player2"]) {
    const futureFences = tail.filter((entry) =>
      entry.payload?.type === "control_lease_claimed"
        && entry.payload.payload.seatKey === seatKey)
      .map((entry) => Number(entry.payload.payload.leaseFence));
    if (!futureFences.length) continue;
    delete aggregate.leases[seatKey];
    aggregate.leaseFences[seatKey] = Math.min(...futureFences) - 1;
  }
  const removedIdempotencyKeys = Object.entries(aggregate.idempotency || {})
    .filter(([, value]) => Number(value?.result?.receipt?.postStateRevision)
      > TARGET_STATE_REVISION)
    .map(([key]) => key);
  ensure(removedIdempotencyKeys.length === 3,
    "SLICE248_R32_IDEMPOTENCY_BOUNDARY_CHANGED", {
      observed: removedIdempotencyKeys.length,
    });
  for (const key of removedIdempotencyKeys) delete aggregate.idempotency[key];

  await fixture.player1Runtime.close();
  await fixture.botRuntime.close();
  roomStore.close();
  const database = new DatabaseSync(path.join(targetDirectory, "room.sqlite"));
  try {
    database.exec("BEGIN IMMEDIATE");
    database.prepare(`DELETE FROM sc_private_journal
      WHERE room_id = ? AND sequence > ?`)
      .run(privateState.roomId, TARGET_PRIVATE_SEQUENCE);
    database.prepare(`DELETE FROM sc_public_journal
      WHERE room_id = ? AND sequence > ?`)
      .run(privateState.roomId, TARGET_PUBLIC_SEQUENCE);
    database.prepare(`DELETE FROM sc_seat_recovery
      WHERE room_id = ? AND recovery_revision > ?`)
      .run(privateState.roomId, TARGET_RECOVERY_REVISION);
    database.prepare(`DELETE FROM sc_checkpoints
      WHERE room_id = ? AND state_revision > ?`)
      .run(privateState.roomId, TARGET_STATE_REVISION);
    const deleteIdempotency = database.prepare(`DELETE FROM sc_idempotency
      WHERE room_id = ? AND key_hash = ?`);
    for (const key of removedIdempotencyKeys) {
      deleteIdempotency.run(privateState.roomId, key);
    }
    const updated = database.prepare(`
      UPDATE sc_rooms
         SET room_revision = ?, state_revision = ?, private_sequence = ?,
             public_sequence = ?, recovery_revision = ?, aggregate_cipher = ?,
             updated_at_audit = ?
       WHERE room_id = ? AND state_revision = 35
    `).run(TARGET_ROOM_REVISION, TARGET_STATE_REVISION,
      TARGET_PRIVATE_SEQUENCE, TARGET_PUBLIC_SEQUENCE,
      TARGET_RECOVERY_REVISION,
      codec.encode(aggregate, `room:${privateState.roomId}:aggregate`),
      new Date().toISOString(), privateState.roomId);
    ensure(Number(updated.changes) === 1,
      "SLICE248_R32_ROOM_UPDATE_FAILED");
    database.exec("COMMIT");
  } catch (error) {
    try { database.exec("ROLLBACK"); } catch {}
    throw error;
  } finally {
    database.close();
  }

  const seatRecovery = Object.fromEntries(["player1", "player2"].map(
    (seatKey) => [seatKey, patchBotSeat(path.join(targetDirectory,
      `seats/${seatKey}/bot-seat.sqlite`), seatKey,
    replay.envelope.stateHash)],
  ));
  const memoryRecovery = Object.fromEntries(["player1", "player2"].map(
    (seatKey) => [seatKey, truncateMemory(path.join(targetDirectory,
      `seats/${seatKey}/match-memory.sqlite`), seatKey)],
  ));
  const decisionCacheRecovery = Object.fromEntries(
    ["player1", "player2"].map((seatKey) => [seatKey,
      removeDecisionCacheAtOrAfter(path.join(targetDirectory,
        `seats/${seatKey}/provider/live-decisions.sqlite`), seatKey)]),
  );

  const actionPath = path.join(targetDirectory, "actions.ndjson");
  const actionLines = (await readFile(actionPath, "utf8"))
    .split(/\n/u).filter(Boolean);
  const retainedActions = actionLines.map((line) => JSON.parse(line))
    .filter((action) => Number(action.postStateRevision)
      <= TARGET_STATE_REVISION);
  ensure(retainedActions.length === TARGET_STATE_REVISION,
    "SLICE248_R32_ACTION_DENOMINATOR_CHANGED", {
      observed: retainedActions.length,
    });
  const defectDirectory = path.join(targetDirectory,
    "source-after-r32-evidence");
  await mkdir(defectDirectory, { recursive: true, mode: 0o700 });
  await writeFile(path.join(defectDirectory, "removed-actions.ndjson"),
    `${actionLines.slice(retainedActions.length).join("\n")}\n`, {
      encoding: "utf8", mode: 0o600,
    });
  await writeFile(actionPath,
    `${retainedActions.map((entry) => JSON.stringify(entry)).join("\n")}\n`, {
      encoding: "utf8", mode: 0o644,
    });
  const screenshotDirectory = path.join(targetDirectory, "screenshots");
  for (const filename of await readdir(screenshotDirectory)) {
    const revision = Number(/-r(\d{3})-/u.exec(filename)?.[1] || 0);
    if (revision > TARGET_STATE_REVISION) {
      await rename(path.join(screenshotDirectory, filename),
        path.join(defectDirectory, filename));
    }
  }
  await rename(path.join(targetDirectory, "failure.json"),
    path.join(defectDirectory, "prior-run-failure.json"));
  await rename(path.join(targetDirectory, "progress.json"),
    path.join(defectDirectory, "pre-recovery-progress.json"));

  roomStore = createSqliteStarcraftTmgRoomStore({
    filename: path.join(targetDirectory, "room.sqlite"),
    privatePayloadCodec: codec,
  });
  const recovered = await roomStore.loadRoom(privateState.roomId);
  const privateJournal = await roomStore.readJournal(
    privateState.roomId, "private", 0);
  const publicJournal = await roomStore.readJournal(
    privateState.roomId, "public", 0);
  const player1Grant = Object.values(recovered.grants || {}).find((grant) =>
    grant.seatKey === "player1" && grant.revoked !== true);
  const legalSpace = fixture.authorityEngine.legalSpace(recovered.envelope, {
    seatAuthority: player1Grant.authority,
  });
  const marineRangedDomains = legalSpace.parameterDomains.filter((domain) =>
    domain.actionType === "ranged_attack"
      && domain.pieceId === "player1-marine-1");
  ensure(Number(recovered.stateRevision) === TARGET_STATE_REVISION
    && recovered.envelope.stateHash === replay.envelope.stateHash
    && privateJournal.length === TARGET_PRIVATE_SEQUENCE
    && publicJournal.length === TARGET_PUBLIC_SEQUENCE
    && marineRangedDomains.length >= 2,
  "SLICE248_R32_RECOVERY_VALIDATION_FAILED", {
    stateRevision: recovered.stateRevision,
    privateCount: privateJournal.length,
    publicCount: publicJournal.length,
    marineRangedDomainCount: marineRangedDomains.length,
  });
  const sourceAfter = await sourceStore.loadRoom(privateState.roomId);
  ensure(Number(sourceAfter.stateRevision) === 35,
    "SLICE248_R32_SOURCE_MUTATED");

  const manifest = {
    schemaVersion:
      "ticket23_slice248_marine_redecision_r32_recovery_manifest_v1",
    ticket: 23,
    slice: 248,
    purpose:
      "re-run the Marine choice with Planner prompt v7 contribution evidence",
    sourceDirectory: path.relative(ROOT, sourceDirectory),
    recoveryDirectory: path.relative(ROOT, targetDirectory),
    sourcePreservedStateRevision: Number(sourceAfter.stateRevision),
    recoveredStateRevision: Number(recovered.stateRevision),
    recoveredStateHash: recovered.envelope.stateHash,
    recoveredPrivateJournalSequence: privateJournal.length,
    recoveredPublicJournalSequence: publicJournal.length,
    recoveredActionCount: retainedActions.length,
    marineRangedDomainCount: marineRangedDomains.length,
    oldDecisionsRetainedAsPaidProviderEvidence: true,
    oldState32PlusDecisionResultsRemovedFromLiveChoiceCache: true,
    oldState32PlusPlanMemoryRemoved: true,
    eligibleForTraining: false,
    seatRecovery,
    memoryRecovery,
    decisionCacheRecovery,
    sourceRefreshPerformed: false,
    trainingTruth: false,
    recoveredAt: new Date().toISOString(),
  };
  await writeFile(path.join(targetDirectory, "recovery-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`, {
      encoding: "utf8", mode: 0o644,
    });
  await writeFile(path.join(targetDirectory, "progress.json"),
    `${JSON.stringify({
      schema: "ticket23_slice248_agent_agent_web_progress_v1",
      ticket: 23,
      slice: 248,
      status: "recovered_r32_ready_for_marine_redecision",
      actionCount: retainedActions.length,
      screenshotCount: 45,
      stateRevision: TARGET_STATE_REVISION,
      round: recovered.envelope.state.round,
      phase: recovered.envelope.state.phase,
      roomId: privateState.roomId,
      updatedAt: new Date().toISOString(),
    }, null, 2)}\n`, { encoding: "utf8", mode: 0o644 });
  roomStore.close();
  sourceStore.close();
  process.stdout.write(`${JSON.stringify({
    ok: true,
    ticket: 23,
    slice: 248,
    sourceStateRevision: Number(sourceAfter.stateRevision),
    recoveredStateRevision: Number(recovered.stateRevision),
    actionCount: retainedActions.length,
    marineRangedDomainCount: marineRangedDomains.length,
    removedPlayer1DecisionCount:
      decisionCacheRecovery.player1.removedDecisionCount,
    recoveryDirectory: path.relative(ROOT, targetDirectory),
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    code: String(error?.code || error?.message || error),
    message: String(error?.message || error),
    details: Object.fromEntries(Object.entries(error || {}).filter(([key]) =>
      key !== "stack")),
  })}\n`);
  process.exitCode = 1;
});
