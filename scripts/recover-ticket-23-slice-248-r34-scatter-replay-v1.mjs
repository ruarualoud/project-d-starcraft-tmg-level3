#!/usr/bin/env node

import { DatabaseSync } from "node:sqlite";
import { cp, mkdir, readFile, rename, writeFile } from "node:fs/promises";
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
const SOURCE_DIRECTORY = path.join(LIVE_ROOT,
  "recovery-r32-marine-redecision", RUN_ID);
const TARGET_DIRECTORY = path.join(LIVE_ROOT,
  "recovery-r34-scatter-replay", RUN_ID);
const TARGET_STATE_REVISION = 34;
const TARGET_ROOM_REVISION = 173;
const TARGET_PRIVATE_SEQUENCE = 174;
const TARGET_PUBLIC_SEQUENCE = 35;
const TARGET_RECOVERY_REVISION = 58;

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

function patchPlayer1Bot(filename, recoveredHash) {
  const database = new DatabaseSync(filename);
  try {
    const row = database.prepare(`
      SELECT scope_key, revision, record_json
        FROM sc_hosted_bot_seat_records
    `).get();
    ensure(row, "SLICE248_SCATTER_PLAYER1_RECORD_MISSING");
    const record = JSON.parse(String(row.record_json));
    ensure(Number(record.actionCount) === 18
      && Number(record.lastAppliedStateRevision) === 33,
    "SLICE248_SCATTER_PLAYER1_BOUNDARY_CHANGED", {
      actionCount: record.actionCount,
      lastAppliedStateRevision: record.lastAppliedStateRevision,
    });
    ensure(record.inflight?.stage === "ready_to_apply"
      && Number(record.inflight.authority?.stateRevision)
        === TARGET_STATE_REVISION
      && record.inflight.authority?.stateHash === recoveredHash
      && record.inflight.decision?.proposal?.domainId
        === "sc-domain-70850fae41553c3d607eb7725f9a6acb7190c67abe98d5806d0948f127477750",
    "SLICE248_SCATTER_PAID_DECISION_MISSING", {
      stage: record.inflight?.stage || null,
      stateRevision: record.inflight?.authority?.stateRevision ?? null,
      stateHash: record.inflight?.authority?.stateHash || null,
      domainId: record.inflight?.decision?.proposal?.domainId || null,
    });
    record.inflight.stage = "decision_selected";
    delete record.inflight.applyRequest;
    Object.assign(record, {
      lifecycle: "active",
      driveStatus: "recovered_paid_decision_ready_to_preview",
      lastObservedStateRevision: TARGET_STATE_REVISION,
      lastObservedStateHash: recoveredHash,
      lastAttemptedStateHash: null,
      preexecutionDeferralStateHash: null,
      lastReplayMatchesCurrent: true,
      lastPreviewFailure: null,
      closedAt: null,
      updatedAt: new Date().toISOString(),
    });
    const updated = database.prepare(`
      UPDATE sc_hosted_bot_seat_records
         SET record_json = ?, updated_at = ?
       WHERE scope_key = ? AND revision = ?
    `).run(JSON.stringify(record), record.updatedAt, row.scope_key,
      row.revision);
    ensure(Number(updated.changes) === 1,
      "SLICE248_SCATTER_PLAYER1_UPDATE_FAILED");
    return {
      actionCount: Number(record.actionCount),
      traceCount: record.traces?.length || 0,
      inflightStage: record.inflight.stage,
      paidDecisionAuthorityRevision:
        Number(record.inflight.authority.stateRevision),
      paidDecisionDomainId: record.inflight.decision.proposal.domainId,
    };
  } finally {
    database.close();
  }
}

function patchPlayer2Bot(filename, recoveredHash) {
  const database = new DatabaseSync(filename);
  try {
    const row = database.prepare(`
      SELECT scope_key, revision, record_json
        FROM sc_hosted_bot_seat_records
    `).get();
    ensure(row, "SLICE248_SCATTER_PLAYER2_RECORD_MISSING");
    const record = JSON.parse(String(row.record_json));
    ensure(Number(record.actionCount) === 16
      && Number(record.lastAppliedStateRevision) === 34
      && !record.inflight,
    "SLICE248_SCATTER_PLAYER2_BOUNDARY_CHANGED", {
      actionCount: record.actionCount,
      lastAppliedStateRevision: record.lastAppliedStateRevision,
      hasInflight: Boolean(record.inflight),
    });
    Object.assign(record, {
      lifecycle: "active",
      driveStatus: "recovered_waiting_for_other_seat",
      lastObservedStateRevision: TARGET_STATE_REVISION,
      lastObservedStateHash: recoveredHash,
      lastAttemptedStateHash: null,
      preexecutionDeferralStateHash: null,
      lastReplayMatchesCurrent: true,
      lastPreviewFailure: null,
      closedAt: null,
      updatedAt: new Date().toISOString(),
    });
    const updated = database.prepare(`
      UPDATE sc_hosted_bot_seat_records
         SET record_json = ?, updated_at = ?
       WHERE scope_key = ? AND revision = ?
    `).run(JSON.stringify(record), record.updatedAt, row.scope_key,
      row.revision);
    ensure(Number(updated.changes) === 1,
      "SLICE248_SCATTER_PLAYER2_UPDATE_FAILED");
    return {
      actionCount: Number(record.actionCount),
      traceCount: record.traces?.length || 0,
      lastAppliedStateRevision: Number(record.lastAppliedStateRevision),
    };
  } finally {
    database.close();
  }
}

async function main() {
  await mkdir(path.dirname(TARGET_DIRECTORY), {
    recursive: true, mode: 0o700,
  });
  await cp(SOURCE_DIRECTORY, TARGET_DIRECTORY, {
    recursive: true,
    errorOnExist: true,
    force: false,
    preserveTimestamps: true,
  });
  const privateState = JSON.parse(await readFile(path.join(
    TARGET_DIRECTORY, "runner-private.json"), "utf8"));
  const codec = codecFor(TARGET_DIRECTORY, privateState);
  let roomStore = createSqliteStarcraftTmgRoomStore({
    filename: path.join(TARGET_DIRECTORY, "room.sqlite"),
    privatePayloadCodec: codec,
  });
  const sourceStore = createSqliteStarcraftTmgRoomStore({
    filename: path.join(SOURCE_DIRECTORY, "room.sqlite"),
    privatePayloadCodec: codecFor(SOURCE_DIRECTORY, privateState),
  });
  const sourceBefore = await sourceStore.loadRoom(privateState.roomId);
  ensure(Number(sourceBefore?.stateRevision) === 35,
    "SLICE248_SCATTER_SOURCE_NOT_R35");
  const bundle = await roomStore.loadReplayBundle(privateState.roomId);
  ensure(Number(bundle.currentAggregate?.stateRevision) === 35
    && Number(bundle.latestCheckpoint?.stateRevision) === 32,
  "SLICE248_SCATTER_COPY_BOUNDARY_CHANGED");

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
    refereeCrypto: refereeCryptoFor(TARGET_DIRECTORY, privateState),
    resumeRoom: true,
    resumeCredentials: privateState.resumeCredentials,
  });
  const replayReceipts = bundle.privateJournal
    .filter((entry) => entry.sequence <= TARGET_PRIVATE_SEQUENCE)
    .map(receiptFrom).filter(Boolean)
    .filter((receipt) => Number(receipt.postStateRevision) > 32);
  const replay = fixture.authorityEngine.replay({
    initialEnvelope: bundle.initialEnvelope,
    checkpoint: bundle.latestCheckpoint,
    journal: replayReceipts,
  });
  ensure(replay.ok === true
    && Number(replay.envelope.stateRevision) === TARGET_STATE_REVISION,
  "SLICE248_SCATTER_R34_REPLAY_FAILED", {
    reason: replay.reason || null,
    stateRevision: replay.envelope?.stateRevision ?? null,
  });

  const tail = Object.fromEntries(bundle.privateJournal
    .filter((entry) => entry.sequence > TARGET_PRIVATE_SEQUENCE)
    .map((entry) => [entry.sequence, entry]));
  ensure(tail[175]?.payload?.type === "seat_recovery_issued"
    && tail[176]?.payload?.type === "preview_sealed"
    && tail[177]?.payload?.type === "preview_confirmed"
    && tail[178]?.payload?.type === "control_lease_claimed"
    && tail[179]?.payload?.type === "accepted_transition",
  "SLICE248_SCATTER_TAIL_SHAPE_CHANGED");
  const invalidReceipt = receiptFrom(tail[179]);
  ensure(Number(invalidReceipt?.postStateRevision) === 35,
    "SLICE248_SCATTER_INVALID_RECEIPT_MISSING");

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
  delete aggregate.recoveryTickets[
    tail[175].payload.payload.recoveryTicketId];
  delete aggregate.previews[tail[176].payload.payload.previewId];
  delete aggregate.confirmations[tail[177].payload.payload.confirmationId];
  delete aggregate.leases.player1;
  aggregate.leaseFences.player1 =
    Number(tail[178].payload.payload.leaseFence) - 1;
  const invalidIdempotencyKeys = Object.entries(aggregate.idempotency || {})
    .filter(([, value]) => Number(value?.result?.receipt?.postStateRevision)
      > TARGET_STATE_REVISION)
    .map(([key]) => key);
  ensure(invalidIdempotencyKeys.length === 1,
    "SLICE248_SCATTER_IDEMPOTENCY_BOUNDARY_CHANGED", {
      observed: invalidIdempotencyKeys.length,
    });
  for (const key of invalidIdempotencyKeys) delete aggregate.idempotency[key];

  await fixture.player1Runtime.close();
  await fixture.botRuntime.close();
  roomStore.close();
  const database = new DatabaseSync(path.join(
    TARGET_DIRECTORY, "room.sqlite"));
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
    for (const key of invalidIdempotencyKeys) {
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
      "SLICE248_SCATTER_ROOM_UPDATE_FAILED");
    database.exec("COMMIT");
  } catch (error) {
    try { database.exec("ROLLBACK"); } catch {}
    throw error;
  } finally {
    database.close();
  }

  const player1 = patchPlayer1Bot(path.join(TARGET_DIRECTORY,
    "seats/player1/bot-seat.sqlite"), replay.envelope.stateHash);
  const player2 = patchPlayer2Bot(path.join(TARGET_DIRECTORY,
    "seats/player2/bot-seat.sqlite"), replay.envelope.stateHash);
  const defectDirectory = path.join(TARGET_DIRECTORY,
    "source-r35-replay-defect-evidence");
  await mkdir(defectDirectory, { recursive: true, mode: 0o700 });
  await writeFile(path.join(defectDirectory, "invalid-r35-receipt.json"),
    `${JSON.stringify(invalidReceipt, null, 2)}\n`, {
      encoding: "utf8", mode: 0o600,
    });
  await rename(path.join(TARGET_DIRECTORY, "progress.json"),
    path.join(defectDirectory, "pre-recovery-progress.json"));

  roomStore = createSqliteStarcraftTmgRoomStore({
    filename: path.join(TARGET_DIRECTORY, "room.sqlite"),
    privatePayloadCodec: codec,
  });
  const recoveredBundle = await roomStore.loadReplayBundle(
    privateState.roomId);
  const recovered = recoveredBundle.currentAggregate;
  const recoveredPrivate = await roomStore.readJournal(
    privateState.roomId, "private", 0);
  const recoveredPublic = await roomStore.readJournal(
    privateState.roomId, "public", 0);
  const player1Grant = Object.values(recovered.grants || {}).find((grant) =>
    grant.seatKey === "player1" && grant.revoked !== true);
  const legalSpace = fixture.authorityEngine.legalSpace(recovered.envelope, {
    seatAuthority: player1Grant.authority,
  });
  ensure(Number(recovered.stateRevision) === TARGET_STATE_REVISION
    && recovered.envelope.stateHash === replay.envelope.stateHash
    && recoveredPrivate.length === TARGET_PRIVATE_SEQUENCE
    && recoveredPublic.length === TARGET_PUBLIC_SEQUENCE
    && legalSpace.legalSpaceHash
      === "327cd9849f341a5f1f3788412ca239876c4b5630db2dd717af9f900ac011ed55",
  "SLICE248_SCATTER_RECOVERY_VALIDATION_FAILED", {
    stateRevision: recovered.stateRevision,
    stateHash: recovered.envelope.stateHash,
    privateCount: recoveredPrivate.length,
    publicCount: recoveredPublic.length,
    legalSpaceHash: legalSpace.legalSpaceHash,
  });
  const sourceAfter = await sourceStore.loadRoom(privateState.roomId);
  ensure(Number(sourceAfter.stateRevision) === 35,
    "SLICE248_SCATTER_SOURCE_MUTATED");

  const manifest = {
    schemaVersion:
      "ticket23_slice248_r34_scatter_replay_recovery_manifest_v1",
    ticket: 23,
    slice: 248,
    purpose: "remove projection-only replay defect and replay the retained paid Scatter decision",
    sourceDirectory: path.relative(ROOT, SOURCE_DIRECTORY),
    recoveryDirectory: path.relative(ROOT, TARGET_DIRECTORY),
    sourcePreservedStateRevision: Number(sourceAfter.stateRevision),
    recoveredStateRevision: Number(recovered.stateRevision),
    recoveredStateHash: recovered.envelope.stateHash,
    recoveredRoomRevision: Number(recovered.roomRevision),
    recoveredPrivateJournalSequence: recoveredPrivate.length,
    recoveredPublicJournalSequence: recoveredPublic.length,
    recoveredSeatRecoveryRevision: Number(recovered.seatRecoveryRevision),
    replayedTailReceiptCount: replayReceipts.length,
    retainedPaidProviderDecision: true,
    providerRecallRequired: false,
    player1,
    player2,
    sourceRefreshPerformed: false,
    trainingTruth: false,
    recoveredAt: new Date().toISOString(),
  };
  await writeFile(path.join(TARGET_DIRECTORY, "recovery-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`, {
      encoding: "utf8", mode: 0o644,
    });
  await writeFile(path.join(TARGET_DIRECTORY, "progress.json"),
    `${JSON.stringify({
      schema: "ticket23_slice248_agent_agent_web_progress_v1",
      ticket: 23,
      slice: 248,
      status: "recovered_r34_paid_scatter_ready_to_replay",
      actionCount: 34,
      screenshotCount: 51,
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
    retainedPaidDecision: true,
    providerRecallRequired: false,
    player1InflightStage: player1.inflightStage,
    recoveryDirectory: path.relative(ROOT, TARGET_DIRECTORY),
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
