#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
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

try {
  const row = decisionDatabase.prepare(
    "SELECT record_json FROM sc_live_decision_records LIMIT 1",
  ).get();
  const record = JSON.parse(String(row?.record_json || "{}"));
  const decision = Object.values(record.decisions || {}).find((candidate) =>
    Number(candidate?.authority?.stateRevision) === 37);
  assert(decision?.plannerResult?.recommendedCandidateId,
    "revision-37 Planner selection is required");
  const completedAttempt = [...(decision.attemptKeys || [])].reverse()
    .map((attemptKey) => decision.attempts?.[attemptKey])
    .find((attempt) => attempt?.status === "completed"
      && attempt?.safeOutput?.providerTurn?.toolCalls?.some((call) =>
        call.name === "submit_decision"
          && call.arguments?.selection?.parametersJson));
  const submission = completedAttempt.safeOutput.providerTurn.toolCalls
    .find((call) => call.name === "submit_decision").arguments;
  const parameters = JSON.parse(submission.selection.parametersJson);
  assert.equal(submission.candidateId,
    decision.plannerResult.recommendedCandidateId,
  "Action output must bind the Planner-selected candidate");

  const bundle = await roomStore.loadReplayBundle(privateState.roomId);
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
    .filter((receipt) => Number(receipt.postStateRevision)
      > Number(bundle.latestCheckpoint.stateRevision)
      && Number(receipt.postStateRevision) <= 37)
    .sort((left, right) => Number(left.postStateRevision)
      - Number(right.postStateRevision));
  const replay = fixture.authorityEngine.replay({
    initialEnvelope: bundle.initialEnvelope,
    checkpoint: bundle.latestCheckpoint,
    journal: receipts,
  });
  assert.equal(replay.ok, true, replay.reason || "authority replay failed");
  assert.equal(replay.envelope.stateRevision, 37,
    "revision-37 authority state is required");
  assert.equal(replay.envelope.stateHash, decision.authority.stateHash,
    "decision authority must match replayed state");
  const hydralisk = replay.envelope.state.pieces.find((piece) =>
    piece.id === "player2-hydralisk");
  assert.equal(hydralisk?.models?.[0]?.baseShape, "rectangle",
    "the live rectangular Hydralisk blocker is required");
  assert.equal(hydralisk.models[0].baseWidthInches, 1.575,
    "the official 40mm Hydralisk base width is required");
  assert.equal(hydralisk.models[0].baseDepthInches, 3.937,
    "the official 100mm Hydralisk base depth is required");

  const legalSpace = fixture.rulesRuntime.enumerate(replay.envelope.state, {
    sideKey: decision.authority.seatKey,
    includeDisabled: false,
  });
  const domain = (legalSpace.parameterDomains || []).find((candidate) =>
    candidate.domainId === decision.plannerResult.recommendedCandidateId);
  assert.equal(domain?.abilityName, "Omega Network",
    "the selected live Omega Network domain is required");
  let rejectedFailureCode = null;
  try {
    fixture.rulesRuntime.instantiate(replay.envelope.state,
      domain, parameters, {
        matchBinding: bundle.currentAggregate.envelope.matchBinding,
      });
  } catch (error) {
    rejectedFailureCode = String(error?.message || error).split(":")[0];
  }
  assert.equal(rejectedFailureCode, "SELECTED_ABILITY_OMEGA_BASE_OVERLAP",
    "the model-authored overlapping point must receive the exact Rules reason");
  const search = searchStarcraftTmgLegalAssetPlacementOptionsV1({
    state: replay.envelope.state,
    domain,
    request: {
      preferredAnchor: {
        xMilliInches: parameters.xMilliInches,
        yMilliInches: parameters.yMilliInches,
      },
      maximumOptions: 4,
    },
    instantiate: (...args) => fixture.rulesRuntime.instantiate(...args),
    instantiateOptions: {
      matchBinding: bundle.currentAggregate.envelope.matchBinding,
    },
  });
  const report = {
    schema: "ticket24_slice258_omega_network_rectangular_base_v1",
    ok: search.optionCount === 4
      && search.placementOptions.every((option) =>
        option.exactRulesInstantiationPassed === true),
    stateRevision: replay.envelope.stateRevision,
    candidateId: domain.domainId,
    abilityName: domain.abilityName,
    rectangularBlockerModelId: hydralisk.models[0].id,
    rejectedModelPointFailureCode: rejectedFailureCode,
    legalPlacementOptionCount: search.optionCount,
    attemptedCandidateCount: search.attemptedCandidateCount,
    failureCounts: search.failureCounts,
    placementOptionIds: search.placementOptions.map((option) =>
      option.placementOptionId),
    providerCalls: 0,
    trainingTruth: false,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  assert.equal(report.ok, true,
    "Host must produce four exact legal Omega Network placement options");
} finally {
  decisionDatabase.close();
  roomStore.close();
}
