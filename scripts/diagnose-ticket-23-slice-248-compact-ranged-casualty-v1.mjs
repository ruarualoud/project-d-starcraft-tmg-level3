#!/usr/bin/env node

import { DatabaseSync } from "node:sqlite";
import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
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
const DEFAULT_RUN = path.join(ROOT,
  "build/ticket-23-slice-248-standard-2000-aa-live-v1",
  "recovery-r32-marine-redecision/20260916223306152");

function ensure(condition, code) {
  if (!condition) throw new Error(code);
}

function readSeatRecord(filename) {
  const database = new DatabaseSync(filename, { readOnly: true });
  try {
    const row = database.prepare(`
      SELECT record_json
        FROM sc_hosted_bot_seat_records
       ORDER BY updated_at DESC
       LIMIT 1
    `).get();
    return row ? JSON.parse(String(row.record_json)) : null;
  } finally {
    database.close();
  }
}

async function main() {
  const runDirectory = path.resolve(process.argv[2] || DEFAULT_RUN);
  const privateState = JSON.parse(await readFile(path.join(
    runDirectory, "runner-private.json"), "utf8"));
  const codec = createStarcraftTmgPrivatePayloadCodec({
    key: privateState.storeEncryptionKeyBase64,
    keyId: `ticket23-slice248-room-store-${path.basename(runDirectory)}`,
    trustLevel: "development_persistent",
  });
  const seatRecord = readSeatRecord(path.join(
    runDirectory, "seats/player1/bot-seat.sqlite"));
  ensure(seatRecord?.inflight?.stage === "decision_selected",
    "DIAGNOSIS_EXPECTED_CACHED_DECISION");
  ensure(seatRecord.inflight.decision?.action?.actionType === "ranged_attack",
    "DIAGNOSIS_EXPECTED_RANGED_ATTACK");

  const temporaryDirectory = await mkdtemp(path.join(
    os.tmpdir(), "starcraft-tmg-slice248-compact-casualty-"));
  const clonedRoomFilename = path.join(temporaryDirectory, "room.sqlite");
  await copyFile(path.join(runDirectory, "room.sqlite"), clonedRoomFilename);
  const clonedStore = createSqliteStarcraftTmgRoomStore({
    filename: clonedRoomFilename,
    privatePayloadCodec: codec,
  });
  const refereeCrypto = createStarcraftTmgRefereeCrypto({
    privateKey: privateState.refereePrivateKeyPem,
    publicKey: privateState.refereePublicKeyPem,
    hmacSecret: privateState.refereeHmacSecret,
    keyId: `ticket23-slice248-referee-${path.basename(runDirectory)}`,
    trustLevel: "development_persistent",
  });
  const inertDecisionPort = Object.freeze({
    async decide() {
      throw new Error("DIAGNOSIS_MUST_NOT_CALL_PROVIDER");
    },
  });
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
    roomStore: clonedStore,
    refereeCrypto,
    resumeRoom: true,
    resumeCredentials: privateState.resumeCredentials,
    botDecisionPort: inertDecisionPort,
    player1DecisionPort: inertDecisionPort,
  });
  const aggregate = await clonedStore.loadRoom(privateState.roomId);
  ensure(aggregate?.stateRevision === 32, "DIAGNOSIS_EXPECTED_REVISION_32");
  const player1Grant = Object.values(aggregate.grants || {}).find((entry) => (
    entry.seatKey === "player1" && entry.revoked !== true
  ));
  ensure(player1Grant?.authority, "DIAGNOSIS_PLAYER1_AUTHORITY_MISSING");
  const legalSpace = fixture.authorityEngine.legalSpace(
    aggregate.envelope,
    { seatAuthority: player1Grant.authority },
  );
  const preview = fixture.authorityEngine.preview({
    envelope: aggregate.envelope,
    seatAuthority: player1Grant.authority,
    proposal: seatRecord.inflight.decision.proposal,
    expectedMatchBindingHash: aggregate.envelope.matchBindingHash,
    expectedLegalSpaceHash: legalSpace.legalSpaceHash,
    expectedStateRevision: aggregate.envelope.stateRevision,
    expectedStateHash: aggregate.envelope.stateHash,
    occurredAt: "2026-09-17T12:30:00.000Z",
  });
  ensure(preview.ok === true, `DIAGNOSIS_PREVIEW_FAILED:${preview.message}`);
  const confirmation = preview.preview.core.confirmationPolicy
    .requiresExplicitHuman
    ? fixture.authorityEngine.confirmPreview({
      envelope: aggregate.envelope,
      preview: preview.preview,
      seatAuthority: player1Grant.authority,
      occurredAt: "2026-09-17T12:30:01.000Z",
    }) : null;
  ensure(!confirmation || confirmation.ok,
    "DIAGNOSIS_CONFIRMATION_FAILED");
  const controlLease = fixture.authorityEngine.issueControlLease({
    seatAuthority: player1Grant.authority,
    sessionId: "slice248-compact-casualty-diagnosis",
    leaseFence: 1,
    issuedAtRoomRevision: aggregate.roomRevision,
  });
  const applied = fixture.authorityEngine.apply({
    envelope: aggregate.envelope,
    seatAuthority: player1Grant.authority,
    controlLease,
    preview: preview.preview,
    confirmation: confirmation?.confirmation,
    expectedStateRevision: aggregate.envelope.stateRevision,
    idempotencyKey: "slice248-compact-casualty-diagnosis",
    occurredAt: "2026-09-17T12:30:02.000Z",
  });
  ensure(applied.ok === true, `DIAGNOSIS_APPLY_FAILED:${applied.message}`);
  const pending = applied.envelope?.state
    ?.pendingCurrentProductRangedCasualtyChoice;
  ensure(pending, "DIAGNOSIS_PENDING_CASUALTY_MISSING");
  const domain = pending.casualtyDomain;
  ensure(domain.selectionMode === "explicit_model_ids",
    "DIAGNOSIS_EXPECTED_COMPACT_SELECTION_MODE");
  ensure(domain.legalSelections.length === 0,
    "DIAGNOSIS_COMPACT_DOMAIN_MATERIALIZED_SELECTIONS");
  ensure(domain.selectionContract?.exactLegalityCheckedOnInstantiation === true,
    "DIAGNOSIS_COMPACT_LEGALITY_CONTRACT_MISSING");

  process.stdout.write(`${JSON.stringify({
    schemaVersion: "ticket23_slice248_compact_ranged_casualty_diagnosis_v1",
    roomId: privateState.roomId,
    preStateRevision: aggregate.stateRevision,
    proposal: seatRecord.inflight.decision.proposal,
    previewOk: true,
    applyOk: true,
    postStateRevision: applied.envelope.stateRevision,
    casualtyCount: domain.casualtyCount,
    candidateModelCount: domain.selectionContract.candidateModelIds.length,
    selectionMode: domain.selectionMode,
    selectionCountUpperBound:
      domain.selectionContract.selectionCountUpperBound,
    materializedSelectionCount: domain.legalSelections.length,
    exactLegalityCheckedOnInstantiation:
      domain.selectionContract.exactLegalityCheckedOnInstantiation,
    providerCalls: 0,
    isolatedRoomMutations: 1,
    liveRoomMutations: 0,
    trainingTruth: false,
  }, null, 2)}\n`);

  await fixture.player1Runtime.close();
  await fixture.botRuntime.close();
  clonedStore.close?.();
  await rm(temporaryDirectory, { recursive: true, force: true });
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    code: String(error?.code || error?.message || error),
    message: String(error?.message || error),
  })}\n`);
  process.exitCode = 1;
});
