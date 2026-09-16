#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgRefereeCrypto } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { searchStarcraftTmgLegalFormationOptionsV1 } from
  "../packages/online-agent-session/legal-formation-search-v1.mjs";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { createSqliteStarcraftTmgRoomStore } from
  "../packages/room-store/sqlite-room-store-v1.mjs";
import { createTicket20HumanAgentDemoFixtureV1 } from
  "./support/ticket20-human-agent-demo-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runArgument = process.argv.find((value) =>
  value.startsWith("--run-directory="));
const maxArgument = process.argv.find((value) => value.startsWith("--max-ms="));
assert(runArgument, "--run-directory is required");
const runDirectory = path.resolve(ROOT,
  runArgument.slice("--run-directory=".length));
const maximumDurationMs = Number(maxArgument?.slice("--max-ms=".length)
  || 60_000);
assert(Number.isFinite(maximumDurationMs) && maximumDurationMs > 0,
  "--max-ms must be positive");

const privateState = JSON.parse(await readFile(
  path.join(runDirectory, "runner-private.json"), "utf8"));
const liveRunId = path.basename(runDirectory);
const privatePayloadCodec = createStarcraftTmgPrivatePayloadCodec({
  key: privateState.storeEncryptionKeyBase64,
  keyId: `ticket23-slice247-room-store-${liveRunId}`,
  trustLevel: "development_persistent",
});
const roomStore = createSqliteStarcraftTmgRoomStore({
  filename: path.join(runDirectory, "room.sqlite"),
  privatePayloadCodec,
});
const decisionDatabase = new DatabaseSync(path.join(
  runDirectory, "provider", "live-decisions.sqlite"), { readOnly: true });
const roomDatabase = new DatabaseSync(path.join(runDirectory, "room.sqlite"),
  { readOnly: true });

try {
  const row = decisionDatabase.prepare(
    "SELECT record_json FROM sc_live_decision_records LIMIT 1",
  ).get();
  const record = JSON.parse(String(row?.record_json || "{}"));
  const decision = Object.values(record.decisions || {}).find((candidate) =>
    Number(candidate?.authority?.stateRevision) === 36
      && candidate?.completedDecision?.formationSelection);
  assert(decision, "recorded revision-36 formation decision is required");
  const candidateId = decision.completedDecision.candidateId;
  const recordedReceipt = (decision.queryReceipts || []).find((receipt) =>
    receipt.queryKind === "legal_formation_options"
      && receipt.status === "exact"
      && receipt.result?.domainId === candidateId);
  assert(recordedReceipt?.result?.formationOptions?.length === 6,
    "recorded six-option baseline is required");

  const bundle = await roomStore.loadReplayBundle(privateState.roomId);
  const targetStateRevision = 36;
  const checkpointRow = roomDatabase.prepare(`
    SELECT state_revision, checkpoint_cipher
      FROM sc_checkpoints
     WHERE room_id = ? AND state_revision <= ?
     ORDER BY state_revision DESC LIMIT 1
  `).get(privateState.roomId, targetStateRevision);
  const replayCheckpoint = checkpointRow
    ? privatePayloadCodec.decode(checkpointRow.checkpoint_cipher,
      `room:${privateState.roomId}:checkpoint:${checkpointRow.state_revision}`)
    : Number(bundle.latestCheckpoint?.stateRevision) <= targetStateRevision
      ? bundle.latestCheckpoint : null;
  const replayBaseRevision = Number(replayCheckpoint?.stateRevision
    ?? bundle.initialEnvelope.stateRevision);
  const refereeCrypto = createStarcraftTmgRefereeCrypto({
    privateKey: privateState.refereePrivateKeyPem,
    publicKey: privateState.refereePublicKeyPem,
    hmacSecret: privateState.refereeHmacSecret,
    keyId: `ticket23-slice247-referee-${liveRunId}`,
    trustLevel: "development_persistent",
  });
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
  const receipts = bundle.privateJournal
    .filter((entry) => entry.payload?.type === "accepted_transition")
    .map((entry) => entry.payload.payload.receipt)
    .filter((receipt) =>
      Number(receipt.postStateRevision) > replayBaseRevision
        && Number(receipt.postStateRevision) <= targetStateRevision)
    .sort((left, right) => Number(left.postStateRevision)
      - Number(right.postStateRevision));
  assert.deepEqual(receipts.map((receipt) => receipt.postStateRevision),
    Array.from({ length: targetStateRevision - replayBaseRevision },
      (_, index) => replayBaseRevision + index + 1),
    "contiguous replay history is required");
  const replayInput = {
    initialEnvelope: bundle.initialEnvelope,
    journal: receipts,
    ...(replayCheckpoint ? { checkpoint: replayCheckpoint } : {}),
  };
  const replay = fixture.authorityEngine.replay(replayInput);
  assert.equal(replay.ok, true, replay.reason || "authority replay failed");
  assert.equal(replay.envelope.stateRevision, 36,
    "replayed decision revision must match");
  assert.equal(replay.envelope.stateHash, decision.authority.stateHash,
    "replayed decision state must match recorded authority");
  const state = replay.envelope.state;
  const legalSpace = fixture.rulesRuntime.enumerate(state, {
    sideKey: decision.authority.seatKey,
    includeDisabled: false,
  });
  const domain = (legalSpace.parameterDomains || []).find((candidate) =>
    candidate.domainId === candidateId);
  assert(domain?.domainId === candidateId,
    "authoritative replayed parameter domain is required");

  const startedAt = performance.now();
  const result = searchStarcraftTmgLegalFormationOptionsV1({
    state,
    domain,
    request: decision.plannerResult.formationSearchRequest,
    instantiate: (...args) => fixture.rulesRuntime.instantiate(...args),
    instantiateOptions: {
      matchBinding: bundle.currentAggregate.envelope.matchBinding,
    },
  });
  const durationMs = Math.round(performance.now() - startedAt);
  const recordedOptionIds = recordedReceipt.result.formationOptions.map(
    (option) => option.formationOptionId);
  const actualOptionIds = result.formationOptions.map(
    (option) => option.formationOptionId);
  assert.deepEqual(actualOptionIds, recordedOptionIds,
    "optimization must preserve every accepted formation option and order");

  const report = {
    schema: "ticket24_slice258_formation_search_performance_v1",
    ok: durationMs <= maximumDurationMs,
    stateRevision: 36,
    replayBaseRevision,
    latestStoredCheckpointRevision:
      bundle.latestCheckpoint?.stateRevision ?? null,
    candidateId,
    durationMs,
    maximumDurationMs,
    optionCount: result.optionCount,
    attemptedCandidateCount: result.attemptedCandidateCount,
    instantiatedCandidateCount: result.instantiatedCandidateCount
      ?? result.attemptedCandidateCount,
    prefilteredCandidateCount: result.prefilteredCandidateCount || 0,
    failureCounts: result.failureCounts,
    optionIdsPreserved: true,
    providerCalls: 0,
    trainingTruth: false,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  assert(report.ok,
    `formation search ${durationMs}ms exceeded ${maximumDurationMs}ms`);
} finally {
  roomDatabase.close();
  decisionDatabase.close();
  roomStore.close();
}
