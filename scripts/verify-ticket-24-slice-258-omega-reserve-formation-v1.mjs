#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgRefereeCrypto } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  searchStarcraftTmgLegalFormationOptionsV1,
  STARCRAFT_TMG_FORMATION_SOLVER_TOOL_NAME,
} from
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
    Number(candidate?.authority?.stateRevision) === 39);
  assert(decision?.plannerResult?.recommendedCandidateId,
    "revision-39 Planner selection is required");
  const selected = decision.actionIndex.find((candidate) =>
    candidate.id === decision.plannerResult.recommendedCandidateId);
  assert.equal(selected?.action?.effectKind, "omega_network_deploy",
    "the selected Omega Network reserve deployment is required");

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
      && Number(receipt.postStateRevision) <= 39)
    .sort((left, right) => Number(left.postStateRevision)
      - Number(right.postStateRevision));
  const replay = fixture.authorityEngine.replay({
    initialEnvelope: bundle.initialEnvelope,
    checkpoint: bundle.latestCheckpoint,
    journal: receipts,
  });
  assert.equal(replay.ok, true, replay.reason || "authority replay failed");
  assert.equal(replay.envelope.stateRevision, 39,
    "revision-39 authority state is required");
  assert.equal(replay.envelope.stateHash, decision.authority.stateHash,
    "decision authority must match replayed state");

  const legalSpace = fixture.rulesRuntime.enumerate(replay.envelope.state, {
    sideKey: decision.authority.seatKey,
    includeDisabled: false,
  });
  const domain = (legalSpace.parameterDomains || []).find((candidate) =>
    candidate.domainId === decision.plannerResult.recommendedCandidateId);
  assert.equal(domain?.pieceId, "player2-raptor",
    "the selected reserve Raptor domain is required");
  const search = searchStarcraftTmgLegalFormationOptionsV1({
    state: replay.envelope.state,
    domain,
    request: decision.plannerResult.formationSearchRequest || {
      maximumOptions: 6,
    },
    instantiate: (...args) => fixture.rulesRuntime.instantiate(...args),
    instantiateOptions: {
      matchBinding: bundle.currentAggregate.envelope.matchBinding,
    },
  });
  const report = {
    schema: "ticket24_slice258_omega_reserve_formation_v1",
    ok: search.optionCount > 0,
    stateRevision: replay.envelope.stateRevision,
    candidateId: domain.domainId,
    pieceId: domain.pieceId,
    sourcePieceId: domain.constraints.sourcePieceId,
    optionCount: search.optionCount,
    toolName: search.toolName,
    objectiveKinds: [...new Set(search.formationOptions.flatMap((entry) =>
      entry.formationObjectives.map((objective) => objective.kind)))],
    everyOptionHasTacticalMetrics: search.formationOptions.every((entry) =>
      entry.tacticalMetrics?.physicalGeometryMetricsExact === true),
    everyOptionUsesIntentSolver: search.formationOptions.every((entry) =>
      String(entry.solverPolicyId || "").length > 0
        && String(entry.patternId || "").startsWith("intent-solver:")),
    attemptedCandidateCount: search.attemptedCandidateCount,
    instantiatedCandidateCount: search.instantiatedCandidateCount,
    prefilteredCandidateCount: search.prefilteredCandidateCount,
    failureCounts: search.failureCounts,
    providerCalls: 0,
    trainingTruth: false,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  assert.equal(report.toolName, STARCRAFT_TMG_FORMATION_SOLVER_TOOL_NAME);
  assert.equal(report.everyOptionHasTacticalMetrics, true);
  assert.equal(report.everyOptionUsesIntentSolver, true);
  assert.equal(report.ok, true,
    "Host must find a full legal Raptor formation at the Omega Worm");
} finally {
  decisionDatabase.close();
  roomStore.close();
}
