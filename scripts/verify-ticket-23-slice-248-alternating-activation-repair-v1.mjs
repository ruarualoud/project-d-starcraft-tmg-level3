#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgRefereeCrypto } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { createSqliteStarcraftTmgRoomStore } from
  "../packages/room-store/sqlite-room-store-v1.mjs";
import { createTicket20HumanAgentDemoFixtureV1 } from
  "./support/ticket20-human-agent-demo-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runArgument = process.argv.find((value) =>
  value.startsWith("--run-directory="));
assert(runArgument, "--run-directory is required");
const runDirectory = path.resolve(ROOT,
  runArgument.slice("--run-directory=".length));
const privateState = JSON.parse(await readFile(
  path.join(runDirectory, "runner-private.json"), "utf8"));
const liveRunId = path.basename(runDirectory);
const privatePayloadCodec = createStarcraftTmgPrivatePayloadCodec({
  key: privateState.storeEncryptionKeyBase64,
  keyId: `ticket23-slice248-room-store-${liveRunId}`,
  trustLevel: "development_persistent",
});
const roomStore = createSqliteStarcraftTmgRoomStore({
  filename: path.join(runDirectory, "room.sqlite"),
  privatePayloadCodec,
});
const refereeCrypto = createStarcraftTmgRefereeCrypto({
  privateKey: privateState.refereePrivateKeyPem,
  publicKey: privateState.refereePublicKeyPem,
  hmacSecret: privateState.refereeHmacSecret,
  keyId: `ticket23-slice248-referee-${liveRunId}`,
  trustLevel: "development_persistent",
});

try {
  const bundle = await roomStore.loadReplayBundle(privateState.roomId);
  const fixture = await createTicket20HumanAgentDemoFixtureV1({
    root: ROOT,
    roomId: privateState.roomId,
    roomProfile: "standard_2000_live",
    mapConfiguration: {
      seedId: "sc1_lost_temple_v1",
      elementSelections: [],
      passageSelections: [],
    },
    autoDrive: false,
    attachBot: false,
    enableSpatialPreexecution: false,
    roomStore,
    resumeRoom: true,
    resumeCredentials: privateState.resumeCredentials,
    refereeCrypto,
    issueHumanRecovery: false,
  });
  const targetRevision = 3;
  const receipts = bundle.privateJournal
    .filter((entry) => entry.payload?.type === "accepted_transition")
    .map((entry) => entry.payload.payload.receipt)
    .filter((receipt) => Number(receipt.postStateRevision) <= targetRevision)
    .sort((left, right) => Number(left.postStateRevision)
      - Number(right.postStateRevision));
  assert.deepEqual(receipts.map((receipt) => receipt.postStateRevision),
    [1, 2, 3], "historical invalid-run prefix must contain revisions 1-3");
  const replay = fixture.authorityEngine.replay({
    initialEnvelope: bundle.initialEnvelope,
    journal: receipts,
  });
  assert.equal(replay.ok, true, replay.reason || "authority replay failed");
  const state = replay.envelope.state;
  const window = state.selectedRosterActivationWindow;
  assert.equal(window?.pieceId, "player1-goliath-1",
    "the deployed Goliath must own the open activation window");

  const legal = fixture.rulesRuntime.enumerate(state, {
    sideKey: "player1",
    includeDisabled: false,
    matchBinding: replay.envelope.matchBinding,
  });
  const crossUnitDomains = legal.parameterDomains.filter((domain) => (
    domain.pieceId && domain.pieceId !== window.pieceId
  ));
  assert.deepEqual(crossUnitDomains.map((domain) => ({
    actionType: domain.actionType,
    pieceId: domain.pieceId,
    abilityName: domain.abilityName || null,
  })), [], "an open activation window must not leak actions from another unit");
  const finish = legal.parameterDomains.find((domain) => (
    domain.actionType === "finish_activation" && domain.pieceId === window.pieceId
  ));
  assert(finish, "the window owner must be able to finish its activation");
  const instantiated = fixture.rulesRuntime.instantiate(
    state, finish, {}, { matchBinding: replay.envelope.matchBinding },
  );
  const transition = fixture.rulesRuntime.apply(
    state, instantiated.action, { matchBinding: replay.envelope.matchBinding },
  );
  assert.equal(transition.state.activeSideKey, "player2",
    "finishing must alternate to an opponent that still has live reserves");

  process.stdout.write(`${JSON.stringify({
    schema: "ticket23_slice248_alternating_activation_repair_v1",
    ok: true,
    replayedRevision: targetRevision,
    activationWindowPieceId: window.pieceId,
    legalPieceIds: [...new Set(legal.parameterDomains.map((domain) =>
      domain.pieceId).filter(Boolean))].sort(),
    nextActiveSideKey: transition.state.activeSideKey,
    providerCalls: 0,
    trainingTruth: false,
  }, null, 2)}\n`);
} finally {
  roomStore.close();
}
