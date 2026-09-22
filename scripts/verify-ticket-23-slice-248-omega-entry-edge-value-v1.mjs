#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgRefereeCrypto } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { searchStarcraftTmgLegalAssetPlacementOptionsV1 } from
  "../packages/online-agent-session/legal-asset-placement-search-v1.mjs";
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
const targetRevision = 6;

const privateState = JSON.parse(await readFile(
  path.join(runDirectory, "runner-private.json"), "utf8"));
const runId = path.basename(runDirectory);
const codec = createStarcraftTmgPrivatePayloadCodec({
  key: privateState.storeEncryptionKeyBase64,
  keyId: `ticket23-slice248-room-store-${runId}`,
  trustLevel: "development_persistent",
});
const roomStore = createSqliteStarcraftTmgRoomStore({
  filename: path.join(runDirectory, "room.sqlite"),
  privatePayloadCodec: codec,
});

try {
  const refereeCrypto = createStarcraftTmgRefereeCrypto({
    privateKey: privateState.refereePrivateKeyPem,
    publicKey: privateState.refereePublicKeyPem,
    hmacSecret: privateState.refereeHmacSecret,
    keyId: `ticket23-slice248-referee-${runId}`,
    trustLevel: "development_persistent",
  });
  const fixture = await createTicket20HumanAgentDemoFixtureV1({
    root: ROOT,
    roomId: privateState.roomId,
    roomProfile: "standard_2000_live",
    mapConfiguration: {
      seedId: "sc1_lost_temple_v1",
      elementSelections: [], passageSelections: [],
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
  const bundle = await roomStore.loadReplayBundle(privateState.roomId);
  const replayCheckpoint = Number(bundle.latestCheckpoint?.stateRevision)
    <= targetRevision ? bundle.latestCheckpoint : null;
  const replayBaseRevision = Number(replayCheckpoint?.stateRevision
    ?? bundle.initialEnvelope.stateRevision);
  const receipts = bundle.privateJournal
    .filter((entry) => entry.payload?.type === "accepted_transition")
    .map((entry) => entry.payload.payload.receipt)
    .filter((receipt) => Number(receipt.postStateRevision) > replayBaseRevision
      && Number(receipt.postStateRevision) <= targetRevision)
    .sort((left, right) => Number(left.postStateRevision)
      - Number(right.postStateRevision));
  assert.deepEqual(receipts.map((receipt) => receipt.postStateRevision),
    Array.from({ length: targetRevision - replayBaseRevision },
      (_, index) => replayBaseRevision + index + 1),
    "contiguous revision-6 replay history is required");
  const replay = fixture.authorityEngine.replay({
    initialEnvelope: bundle.initialEnvelope,
    journal: receipts,
    ...(replayCheckpoint ? { checkpoint: replayCheckpoint } : {}),
  });
  assert.equal(replay.ok, true, replay.reason || "authority replay failed");
  assert.equal(replay.envelope.stateRevision, targetRevision);

  const legalSpace = fixture.rulesRuntime.enumerate(replay.envelope.state, {
    sideKey: "player2", includeDisabled: false,
  });
  const domain = (legalSpace.parameterDomains || []).find((entry) =>
    entry.effectKind === "omega_network");
  assert(domain, "revision-6 Omega Network domain is required");
  const result = searchStarcraftTmgLegalAssetPlacementOptionsV1({
    state: replay.envelope.state,
    domain,
    request: {
      maximumOptions: 6,
      maximumCandidateAttempts: 32,
      preferredAnchor: { xMilliInches: 20_000, yMilliInches: 16_000 },
      tacticalPurpose:
        "Create a later-round Ground-reserve Entry Edge toward marker lanes.",
    },
    instantiate: (...args) => fixture.rulesRuntime.instantiate(...args),
    instantiateOptions: { matchBinding: replay.envelope.matchBinding },
  });
  const lowFire = result.placementOptions.find((entry) =>
    entry.selectionFacet === "lowest_projected_incoming_fire");
  const bestGain = result.placementOptions.find((entry) =>
    entry.selectionFacet === "largest_entry_edge_approach_gain");
  const rows = result.placementOptions.map((entry) => ({
    placementOptionId: entry.placementOptionId,
    coordinate: entry.coordinate,
    selectionFacet: entry.selectionFacet,
    maximumObjectiveApproachGainMilliInches:
      entry.tacticalMetrics?.entryEdgeUtility
        ?.maximumObjectiveApproachGainMilliInches ?? null,
    improvedObjectiveCount:
      entry.tacticalMetrics?.entryEdgeUtility?.improvedObjectiveCount ?? null,
  }));
  const report = {
    schema: "ticket23_slice248_omega_entry_edge_value_v1",
    targetRevision,
    optionCount: result.optionCount,
    lowFireOption: rows.find((entry) => entry.placementOptionId
      === lowFire?.placementOptionId) || null,
    bestGainOption: rows.find((entry) => entry.placementOptionId
      === bestGain?.placementOptionId) || null,
    options: rows,
    providerCalls: 0,
    roomMutations: 0,
    trainingTruth: false,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  assert.equal(result.optionCount, 6,
    "Omega Network search must retain six diverse exact options");
  assert(result.placementOptions.every((entry) =>
    entry.tacticalMetrics?.entryEdgeUtility?.baselineKind
      === "official_player_entry_edge"),
  "every Omega option must compare against the official player Entry Edge");
  assert(bestGain,
    "returned options must include the largest Entry Edge approach gain facet");
  assert(Number(bestGain.tacticalMetrics.entryEdgeUtility
    .maximumObjectiveApproachGainMilliInches) > 0,
  "at least one Omega option must add positive objective approach value");
  assert(Number(bestGain.tacticalMetrics.entryEdgeUtility
    .maximumObjectiveApproachGainMilliInches)
    > Number(lowFire.tacticalMetrics.entryEdgeUtility
      .maximumObjectiveApproachGainMilliInches),
  "the decision material must expose the safety-versus-entry-value tradeoff");
} finally {
  roomStore.close();
}
