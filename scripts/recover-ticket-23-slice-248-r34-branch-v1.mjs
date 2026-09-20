#!/usr/bin/env node

import { DatabaseSync } from "node:sqlite";
import {
  cp, mkdir, readFile, rename, writeFile,
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
const DEFAULT_RUN_ID = "20260916223306152";
const TARGET_STATE_REVISION = 34;
const TARGET_PRIVATE_SEQUENCE = 171;
const TARGET_PUBLIC_SEQUENCE = 35;
const TARGET_RECOVERY_REVISION = 54;
const TARGET_ROOM_REVISION = 170;
const INVALID_SCREENSHOT =
  "0048-r035-player2-run-applied.png";

function ensure(condition, code, details = {}) {
  if (!condition) throw Object.assign(new Error(code), { code, ...details });
}

function codecFor(runDirectory, privateState) {
  return createStarcraftTmgPrivatePayloadCodec({
    key: privateState.storeEncryptionKeyBase64,
    keyId: `ticket23-slice248-room-store-${path.basename(runDirectory)}`,
    trustLevel: "development_persistent",
  });
}

function refereeCryptoFor(runDirectory, privateState) {
  return createStarcraftTmgRefereeCrypto({
    privateKey: privateState.refereePrivateKeyPem,
    publicKey: privateState.refereePublicKeyPem,
    hmacSecret: privateState.refereeHmacSecret,
    keyId: `ticket23-slice248-referee-${path.basename(runDirectory)}`,
    trustLevel: "development_persistent",
  });
}

function receiptFrom(entry) {
  return entry?.payload?.type === "accepted_transition"
    ? entry.payload.payload?.receipt || null : null;
}

function patchBotSeatRecord(filename, seatKey, stateHash) {
  const database = new DatabaseSync(filename);
  try {
    const row = database.prepare(`
      SELECT scope_key, revision, record_json
        FROM sc_hosted_bot_seat_records
    `).get();
    ensure(row, "SLICE248_RECOVERY_BOT_RECORD_MISSING", { seatKey });
    const record = JSON.parse(String(row.record_json));
    const validTraces = (record.traces || []).filter((trace) =>
      Number(trace.postStateRevision || 0) <= TARGET_STATE_REVISION);
    if (seatKey === "player2") {
      ensure(validTraces.length === 15,
        "SLICE248_RECOVERY_PLAYER2_TRACE_DENOMINATOR_INVALID", {
          traceCount: validTraces.length,
        });
      const lastTrace = validTraces.at(-1);
      Object.assign(record, {
        lifecycle: "active",
        driveStatus: "attached",
        actionCount: validTraces.length,
        replayVerifiedCount: validTraces.length,
        lastObservedStateRevision: TARGET_STATE_REVISION,
        lastObservedStateHash: stateHash,
        lastAttemptedStateHash: null,
        preexecutionDeferralStateHash: null,
        lastAppliedStateRevision: Number(lastTrace.postStateRevision),
        lastDecision: null,
        lastReceiptHash: lastTrace.applyReceiptHash,
        lastReplayMatchesCurrent: true,
        inflight: null,
        traces: validTraces,
        lastPreviewFailure: null,
      });
    } else {
      ensure(validTraces.length === 19,
        "SLICE248_RECOVERY_PLAYER1_TRACE_DENOMINATOR_INVALID", {
          traceCount: validTraces.length,
        });
      Object.assign(record, {
        lastObservedStateRevision: TARGET_STATE_REVISION,
        lastObservedStateHash: stateHash,
        inflight: null,
        traces: validTraces,
      });
    }
    const updated = database.prepare(`
      UPDATE sc_hosted_bot_seat_records
         SET record_json = ?, updated_at = ?
       WHERE scope_key = ? AND revision = ?
    `).run(JSON.stringify(record), new Date().toISOString(), row.scope_key,
      row.revision);
    ensure(Number(updated.changes) === 1,
      "SLICE248_RECOVERY_BOT_RECORD_UPDATE_FAILED", { seatKey });
    return {
      actionCount: record.actionCount,
      replayVerifiedCount: record.replayVerifiedCount,
      lastAppliedStateRevision: record.lastAppliedStateRevision,
      traceCount: record.traces.length,
    };
  } finally {
    database.close();
  }
}

function truncatePlayer2Memory(filename) {
  const database = new DatabaseSync(filename);
  try {
    const firstInvalid = database.prepare(`
      SELECT MIN(sequence) AS sequence
        FROM sc_match_decision_journal
       WHERE json_extract(record_json, '$.authority.stateRevision') >= ?
    `).get(TARGET_STATE_REVISION);
    ensure(Number(firstInvalid?.sequence) === 106,
      "SLICE248_RECOVERY_MEMORY_BOUNDARY_CHANGED", {
        firstInvalidSequence: firstInvalid?.sequence ?? null,
      });
    const deleted = database.prepare(`
      DELETE FROM sc_match_decision_journal WHERE sequence >= ?
    `).run(Number(firstInvalid.sequence));
    const remaining = database.prepare(`
      SELECT COUNT(*) AS count, MAX(sequence) AS maximum_sequence
        FROM sc_match_decision_journal
    `).get();
    return {
      deletedCount: Number(deleted.changes),
      remainingCount: Number(remaining.count),
      maximumSequence: Number(remaining.maximum_sequence),
    };
  } finally {
    database.close();
  }
}

async function main() {
  const runId = String(process.argv[2] || DEFAULT_RUN_ID);
  ensure(/^[0-9]{17}$/u.test(runId), "SLICE248_RECOVERY_RUN_ID_INVALID");
  const sourceDirectory = path.join(LIVE_ROOT, runId);
  const targetDirectory = path.join(LIVE_ROOT, "recovery-r34", runId);
  const targetParent = path.dirname(targetDirectory);
  await mkdir(targetParent, { recursive: true, mode: 0o700 });
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
  const sourceCodec = codecFor(sourceDirectory, privateState);
  const sourceStore = createSqliteStarcraftTmgRoomStore({
    filename: path.join(sourceDirectory, "room.sqlite"),
    privatePayloadCodec: sourceCodec,
  });
  const sourceBefore = await sourceStore.loadRoom(privateState.roomId);
  ensure(Number(sourceBefore?.stateRevision) === 35,
    "SLICE248_RECOVERY_SOURCE_NOT_R35");
  const bundle = await roomStore.loadReplayBundle(privateState.roomId);
  ensure(Number(bundle?.currentAggregate?.stateRevision) === 35,
    "SLICE248_RECOVERY_COPY_NOT_R35");

  const fixture = await createTicket20AgentAgentDemoFixtureV1({
    root: ROOT,
    roomId: privateState.roomId,
    roomProfile: "standard_2000_live",
    mapConfiguration: {
      seedId: "sc1_lost_temple_v1",
      elementSelections: [],
      passageSelections: [],
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
  const checkpointRevision = Number(bundle.latestCheckpoint?.stateRevision);
  ensure(checkpointRevision === 32,
    "SLICE248_RECOVERY_CHECKPOINT_BOUNDARY_CHANGED", {
      checkpointRevision,
    });
  const replayReceipts = bundle.privateJournal
    .filter((entry) => entry.sequence <= TARGET_PRIVATE_SEQUENCE)
    .map(receiptFrom).filter(Boolean)
    .filter((receipt) => Number(receipt.postStateRevision)
      > checkpointRevision);
  const replay = fixture.authorityEngine.replay({
    initialEnvelope: bundle.initialEnvelope,
    checkpoint: bundle.latestCheckpoint,
    journal: replayReceipts,
  });
  ensure(replay.ok === true
    && Number(replay.envelope.stateRevision) === TARGET_STATE_REVISION,
  "SLICE248_RECOVERY_R34_REPLAY_FAILED", {
    reason: replay.reason || null,
    stateRevision: replay.envelope?.stateRevision ?? null,
  });

  const tail = Object.fromEntries(bundle.privateJournal
    .filter((entry) => entry.sequence > TARGET_PRIVATE_SEQUENCE)
    .map((entry) => [entry.sequence, entry]));
  ensure(tail[172]?.payload?.type === "seat_recovery_issued"
    && tail[173]?.payload?.type === "preview_sealed"
    && tail[174]?.payload?.type === "control_lease_claimed"
    && tail[175]?.payload?.type === "accepted_transition",
  "SLICE248_RECOVERY_TAIL_SHAPE_CHANGED");
  const invalidRecoveryId = tail[172].payload.payload.recoveryTicketId;
  const invalidPreviewId = tail[173].payload.payload.previewId;
  const invalidReceipt = receiptFrom(tail[175]);
  ensure(Number(invalidReceipt?.postStateRevision) === 35,
    "SLICE248_RECOVERY_INVALID_RECEIPT_MISSING");

  const aggregate = structuredClone(bundle.currentAggregate);
  aggregate.roomRevision = TARGET_ROOM_REVISION;
  aggregate.stateRevision = TARGET_STATE_REVISION;
  aggregate.privateJournalSequence = TARGET_PRIVATE_SEQUENCE;
  aggregate.publicJournalSequence = TARGET_PUBLIC_SEQUENCE;
  aggregate.seatRecoveryRevision = TARGET_RECOVERY_REVISION;
  aggregate.acceptedReceiptCount = TARGET_STATE_REVISION;
  aggregate.envelope = structuredClone(replay.envelope);
  delete aggregate.recoveryTickets[invalidRecoveryId];
  delete aggregate.previews[invalidPreviewId];
  delete aggregate.leases.player2;
  aggregate.leaseFences.player2 = Number(
    tail[174].payload.payload.leaseFence) - 1;
  const invalidIdempotencyKeys = Object.entries(aggregate.idempotency || {})
    .filter(([, value]) => Number(value?.result?.receipt?.postStateRevision)
      > TARGET_STATE_REVISION)
    .map(([key]) => key);
  ensure(invalidIdempotencyKeys.length === 1,
    "SLICE248_RECOVERY_IDEMPOTENCY_BOUNDARY_CHANGED", {
      invalidIdempotencyCount: invalidIdempotencyKeys.length,
    });
  for (const key of invalidIdempotencyKeys) delete aggregate.idempotency[key];

  await fixture.player1Runtime.close();
  await fixture.botRuntime.close();
  roomStore.close();
  const roomDatabase = new DatabaseSync(path.join(
    targetDirectory, "room.sqlite"));
  try {
    roomDatabase.exec("BEGIN IMMEDIATE");
    roomDatabase.prepare(`DELETE FROM sc_private_journal
      WHERE room_id = ? AND sequence > ?`)
      .run(privateState.roomId, TARGET_PRIVATE_SEQUENCE);
    roomDatabase.prepare(`DELETE FROM sc_public_journal
      WHERE room_id = ? AND sequence > ?`)
      .run(privateState.roomId, TARGET_PUBLIC_SEQUENCE);
    roomDatabase.prepare(`DELETE FROM sc_seat_recovery
      WHERE room_id = ? AND recovery_revision > ?`)
      .run(privateState.roomId, TARGET_RECOVERY_REVISION);
    roomDatabase.prepare(`DELETE FROM sc_checkpoints
      WHERE room_id = ? AND state_revision > ?`)
      .run(privateState.roomId, TARGET_STATE_REVISION);
    const deleteIdempotency = roomDatabase.prepare(`DELETE FROM sc_idempotency
      WHERE room_id = ? AND key_hash = ?`);
    for (const key of invalidIdempotencyKeys) {
      deleteIdempotency.run(privateState.roomId, key);
    }
    const updated = roomDatabase.prepare(`
      UPDATE sc_rooms
         SET room_revision = ?, state_revision = ?, private_sequence = ?,
             public_sequence = ?, recovery_revision = ?, aggregate_cipher = ?,
             updated_at_audit = ?
       WHERE room_id = ? AND state_revision = 35
    `).run(
      TARGET_ROOM_REVISION,
      TARGET_STATE_REVISION,
      TARGET_PRIVATE_SEQUENCE,
      TARGET_PUBLIC_SEQUENCE,
      TARGET_RECOVERY_REVISION,
      codec.encode(aggregate, `room:${privateState.roomId}:aggregate`),
      new Date().toISOString(),
      privateState.roomId,
    );
    ensure(Number(updated.changes) === 1,
      "SLICE248_RECOVERY_ROOM_UPDATE_FAILED");
    roomDatabase.exec("COMMIT");
  } catch (error) {
    try { roomDatabase.exec("ROLLBACK"); } catch {}
    throw error;
  } finally {
    roomDatabase.close();
  }

  const seatRecovery = {
    player1: patchBotSeatRecord(path.join(targetDirectory,
      "seats/player1/bot-seat.sqlite"), "player1", replay.envelope.stateHash),
    player2: patchBotSeatRecord(path.join(targetDirectory,
      "seats/player2/bot-seat.sqlite"), "player2", replay.envelope.stateHash),
  };
  const memoryRecovery = truncatePlayer2Memory(path.join(targetDirectory,
    "seats/player2/match-memory.sqlite"));

  const actionPath = path.join(targetDirectory, "actions.ndjson");
  const actionLines = (await readFile(actionPath, "utf8"))
    .split(/\n/u).filter(Boolean);
  ensure(actionLines.length === 35,
    "SLICE248_RECOVERY_ACTION_DENOMINATOR_CHANGED", {
      actionCount: actionLines.length,
    });
  const invalidAction = JSON.parse(actionLines.at(-1));
  ensure(Number(invalidAction.postStateRevision) === 35,
    "SLICE248_RECOVERY_INVALID_ACTION_MISSING");
  const defectDirectory = path.join(targetDirectory,
    "source-defect-evidence");
  await mkdir(defectDirectory, { recursive: true, mode: 0o700 });
  await writeFile(path.join(defectDirectory, "invalid-r35-action.json"),
    `${JSON.stringify(invalidAction, null, 2)}\n`, {
      encoding: "utf8", mode: 0o600,
    });
  await writeFile(actionPath, `${actionLines.slice(0, 34).join("\n")}\n`, {
    encoding: "utf8", mode: 0o644,
  });
  await rename(path.join(targetDirectory, "screenshots", INVALID_SCREENSHOT),
    path.join(defectDirectory, INVALID_SCREENSHOT));
  await rename(path.join(targetDirectory, "failure.json"),
    path.join(defectDirectory, "prior-run-failure.json"));
  await rename(path.join(targetDirectory, "progress.json"),
    path.join(defectDirectory, "pre-recovery-progress.json"));

  roomStore = createSqliteStarcraftTmgRoomStore({
    filename: path.join(targetDirectory, "room.sqlite"),
    privatePayloadCodec: codec,
  });
  const recoveredBundle = await roomStore.loadReplayBundle(privateState.roomId);
  const recovered = recoveredBundle.currentAggregate;
  const recoveredPrivate = await roomStore.readJournal(
    privateState.roomId, "private", 0);
  const recoveredPublic = await roomStore.readJournal(
    privateState.roomId, "public", 0);
  const defenderGrant = Object.values(recovered.grants || {}).find((grant) =>
    grant.seatKey === "player2" && grant.revoked !== true);
  const legalSpace = fixture.authorityEngine.legalSpace(recovered.envelope, {
    seatAuthority: defenderGrant.authority,
  });
  const casualtyDomains = legalSpace.parameterDomains.filter((domain) =>
    domain.parameterKind
      === "official_selected_roster_ranged_casualty_selection_v1");
  ensure(Number(recovered.stateRevision) === TARGET_STATE_REVISION
    && recovered.envelope.stateHash === replay.envelope.stateHash
    && recoveredPrivate.length === TARGET_PRIVATE_SEQUENCE
    && recoveredPublic.length === TARGET_PUBLIC_SEQUENCE
    && casualtyDomains.length === 1
    && legalSpace.finiteActions.length === 0
    && legalSpace.parameterDomains.length === 1,
  "SLICE248_RECOVERY_VALIDATION_FAILED", {
    stateRevision: recovered.stateRevision,
    privateCount: recoveredPrivate.length,
    publicCount: recoveredPublic.length,
    casualtyDomainCount: casualtyDomains.length,
    finiteActionCount: legalSpace.finiteActions.length,
    parameterDomainCount: legalSpace.parameterDomains.length,
  });
  const sourceAfter = await sourceStore.loadRoom(privateState.roomId);
  ensure(Number(sourceAfter.stateRevision) === 35,
    "SLICE248_RECOVERY_SOURCE_MUTATED");

  const manifest = {
    schemaVersion: "ticket23_slice248_r34_recovery_manifest_v1",
    ticket: 23,
    slice: 248,
    sourceDirectory: path.relative(ROOT, sourceDirectory),
    recoveryDirectory: path.relative(ROOT, targetDirectory),
    sourcePreservedStateRevision: Number(sourceAfter.stateRevision),
    recoveredStateRevision: Number(recovered.stateRevision),
    recoveredStateHash: recovered.envelope.stateHash,
    recoveredRoomRevision: Number(recovered.roomRevision),
    recoveredPrivateJournalSequence: recoveredPrivate.length,
    recoveredPublicJournalSequence: recoveredPublic.length,
    recoveredSeatRecoveryRevision: Number(recovered.seatRecoveryRevision),
    recoveredAcceptedReceiptCount: Number(recovered.acceptedReceiptCount),
    replayCheckpointStateRevision: checkpointRevision,
    replayedTailReceiptCount: replayReceipts.length,
    pendingCasualtyDomainCount: casualtyDomains.length,
    leakedFiniteActionCount: legalSpace.finiteActions.length,
    leakedParameterizedActionCount:
      legalSpace.parameterDomains.length - casualtyDomains.length,
    removedInvalidReceiptHash: invalidReceipt.journalHash,
    removedInvalidActionType: invalidReceipt.action?.actionType || null,
    invalidPaidProviderEvidenceRetainedInProviderStores: true,
    invalidActionExcludedFromTraining: true,
    seatRecovery,
    memoryRecovery,
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
      status: "recovered_r34_ready_to_resume",
      actionCount: 34,
      screenshotCount: 47,
      round: recovered.envelope.state.round,
      phase: recovered.envelope.state.phase,
      stateRevision: TARGET_STATE_REVISION,
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
    pendingCasualtyDomainCount: casualtyDomains.length,
    actionCount: 34,
    player2MemoryMaximumSequence: memoryRecovery.maximumSequence,
    recoveryDirectory: path.relative(ROOT, targetDirectory),
    recoveryManifest: path.relative(ROOT,
      path.join(targetDirectory, "recovery-manifest.json")),
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
