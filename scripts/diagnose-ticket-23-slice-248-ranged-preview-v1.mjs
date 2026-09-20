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
  "build/ticket-23-slice-248-standard-2000-aa-live-v1/20260916223306152");

function ensure(condition, code) {
  if (!condition) throw new Error(code);
}

function readOnlySeatRecord(filename) {
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

function previewAndApply(engine, envelope, seatAuthority, proposal, sequence) {
  const legalSpace = engine.legalSpace(envelope, { seatAuthority });
  const preview = engine.preview({
    envelope,
    seatAuthority,
    proposal,
    expectedMatchBindingHash: envelope.matchBindingHash,
    expectedLegalSpaceHash: legalSpace.legalSpaceHash,
    expectedStateRevision: envelope.stateRevision,
    expectedStateHash: envelope.stateHash,
    occurredAt: "2026-09-17T12:00:00.000Z",
  });
  if (!preview.ok) return { preview, applied: null, legalSpace };
  const confirmation = preview.preview.core.confirmationPolicy
    .requiresExplicitHuman
    ? engine.confirmPreview({
      envelope,
      preview: preview.preview,
      seatAuthority,
      occurredAt: "2026-09-17T12:00:01.000Z",
    }) : null;
  ensure(!confirmation || confirmation.ok,
    "DIAGNOSIS_CONFIRMATION_FAILED");
  const controlLease = engine.issueControlLease({
    seatAuthority,
    sessionId: `slice248-diagnosis-${sequence}`,
    leaseFence: sequence,
    issuedAtRoomRevision: sequence,
  });
  const applied = engine.apply({
    envelope,
    seatAuthority,
    controlLease,
    preview: preview.preview,
    confirmation: confirmation?.confirmation,
    expectedStateRevision: envelope.stateRevision,
    idempotencyKey: `slice248-diagnosis-${sequence}`,
    occurredAt: "2026-09-17T12:00:02.000Z",
  });
  return { preview, applied, legalSpace };
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
  const liveStore = createSqliteStarcraftTmgRoomStore({
    filename: path.join(runDirectory, "room.sqlite"),
    privatePayloadCodec: codec,
  });
  const before = await liveStore.loadRoom(privateState.roomId);
  const seatRecord = readOnlySeatRecord(path.join(
    runDirectory, "seats/player1/bot-seat.sqlite"));
  ensure(before?.stateRevision === 26, "DIAGNOSIS_EXPECTED_REVISION_26");
  ensure(seatRecord?.inflight?.stage === "decision_selected",
    "DIAGNOSIS_EXPECTED_CACHED_DECISION");
  ensure(seatRecord.inflight.decision?.action?.actionType === "ranged_attack",
    "DIAGNOSIS_EXPECTED_RANGED_ATTACK");

  const temporaryDirectory = await mkdtemp(path.join(
    os.tmpdir(), "starcraft-tmg-slice248-ranged-preview-"));
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
  const grants = Object.values(aggregate.grants || {});
  const player1Grant = grants.find((entry) => (
    entry.seatKey === "player1" && entry.revoked !== true
  ));
  const player2Grant = grants.find((entry) => (
    entry.seatKey === "player2" && entry.revoked !== true
  ));
  ensure(player1Grant?.authority, "DIAGNOSIS_PLAYER1_AUTHORITY_MISSING");
  ensure(player2Grant?.authority, "DIAGNOSIS_PLAYER2_AUTHORITY_MISSING");

  const proposal = seatRecord.inflight.decision.proposal;
  const attack = previewAndApply(fixture.authorityEngine,
    aggregate.envelope, player1Grant.authority, proposal, 1);
  let casualtyDomain = null;
  let casualty = null;
  if (attack.applied?.ok === true) {
    const legal = fixture.authorityEngine.legalSpace(
      attack.applied.envelope,
      { seatAuthority: player2Grant.authority },
    );
    casualtyDomain = legal.parameterDomains.find((entry) => (
      entry.parameterKind
        === "official_selected_roster_ranged_casualty_selection_v1"
    ));
    if (casualtyDomain) {
      casualty = previewAndApply(fixture.authorityEngine,
        attack.applied.envelope, player2Grant.authority, {
          kind: "parameterized",
          domainId: casualtyDomain.domainId,
          parameters: {
            casualtySelectionHash:
              casualtyDomain.parameterSchema.casualtySelectionHash.enum[0],
          },
        }, 2);
    }
  }
  const after = await liveStore.loadRoom(privateState.roomId);
  const report = {
    schemaVersion: "ticket23_slice248_ranged_preview_diagnosis_v1",
    roomId: privateState.roomId,
    stateRevision: aggregate.stateRevision,
    actionType: seatRecord.inflight.decision.action.actionType,
    targetUnitId: proposal.parameters?.targetUnitId || null,
    attack: {
      previewOk: attack.preview.ok === true,
      previewReason: attack.preview.reason || null,
      previewMessage: attack.preview.message || null,
      applyOk: attack.applied?.ok === true,
      postStateRevision: attack.applied?.envelope?.stateRevision ?? null,
      pendingDefenderCasualty: Boolean(
        attack.applied?.envelope?.state
          ?.pendingCurrentProductRangedCasualtyChoice),
    },
    casualty: {
      domainFound: Boolean(casualtyDomain),
      legalSelectionCount:
        casualtyDomain?.parameterSchema?.casualtySelectionHash?.enum?.length
          || 0,
      previewOk: casualty?.preview?.ok === true,
      previewReason: casualty?.preview?.reason || null,
      previewMessage: casualty?.preview?.message || null,
      applyOk: casualty?.applied?.ok === true,
      postStateRevision: casualty?.applied?.envelope?.stateRevision ?? null,
      pendingCleared: casualty?.applied?.envelope?.state
        ?.pendingCurrentProductRangedCasualtyChoice === undefined,
      defenderSelectionEvent: casualty?.applied?.receipt?.events?.some(
        (entry) => entry.type
          === "ranged_defender_casualty_selection_resolved") === true,
    },
    roomMutationCount: Number(after.roomRevision) - Number(before.roomRevision),
    providerCalls: 0,
    trainingTruth: false,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  await fixture.player1Runtime.close();
  await fixture.botRuntime.close();
  clonedStore.close?.();
  liveStore.close?.();
  await rm(temporaryDirectory, { recursive: true, force: true });
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    code: String(error?.code || error?.message || error),
    message: String(error?.message || error),
  })}\n`);
  process.exitCode = 1;
});
