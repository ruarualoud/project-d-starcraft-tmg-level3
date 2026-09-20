#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
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
const SELF = fileURLToPath(import.meta.url);
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

function parent() {
  const child = spawn(process.execPath, [SELF, `--run-directory=${runDirectory}`,
    `--max-ms=${maximumDurationMs}`, "--worker"], {
    cwd: ROOT, stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  let lineBuffer = "";
  let timer = null;
  let timedOut = false;
  child.stdout.on("data", (chunk) => {
    const value = chunk.toString("utf8");
    stdout += value;
    lineBuffer += value;
    const lines = lineBuffer.split(/\n/u);
    lineBuffer = lines.pop() || "";
    for (const line of lines) {
      try {
        if (JSON.parse(line).event === "search_started" && !timer) {
          timer = setTimeout(() => {
            timedOut = true;
            child.kill("SIGTERM");
          }, maximumDurationMs);
        }
      } catch {}
    }
  });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
  child.once("exit", (code, signal) => {
    if (timer) clearTimeout(timer);
    if (timedOut) {
      process.stdout.write(`${JSON.stringify({
        schema: "ticket23_slice248_creep_asset_search_diagnosis_v1",
        ok: false,
        reproduced: true,
        reason: "ASSET_SEARCH_TIMEOUT",
        maximumDurationMs,
        signal,
        providerCalls: 0,
        roomMutations: 0,
        trainingTruth: false,
      }, null, 2)}\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
    process.exitCode = code ?? 1;
  });
}

async function worker() {
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
  const decisions = new DatabaseSync(path.join(runDirectory,
    "seats/player2/provider/live-decisions.sqlite"), { readOnly: true });
  try {
    const record = JSON.parse(String(decisions.prepare(
      "SELECT record_json FROM sc_live_decision_records LIMIT 1",
    ).get()?.record_json || "{}"));
    const decision = Object.values(record.decisions || {}).find((entry) =>
      Number(entry?.authority?.stateRevision) === 19);
    assert(decision, "revision-19 player2 decision is required");
    const lastPlanningAttempt = [...(decision.attemptKeys || [])].reverse()
      .map((key) => decision.attempts?.[key])
      .find((attempt) => attempt?.status === "completed"
        && attempt.safeOutput?.providerTurn?.toolCalls?.[0]?.name
          === "submit_planning");
    const planning = lastPlanningAttempt?.safeOutput?.providerTurn
      ?.toolCalls?.[0]?.arguments;
    assert(planning?.recommendedCandidateId,
      "completed revision-19 planning submission is required");
    const aggregate = await roomStore.loadRoom(privateState.roomId);
    assert(Number(aggregate.stateRevision) >= 19,
      "current room must include revision 19");
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
    const replayCheckpoint = Number(bundle.latestCheckpoint?.stateRevision) <= 19
      ? bundle.latestCheckpoint : null;
    const replayBaseRevision = Number(replayCheckpoint?.stateRevision
      ?? bundle.initialEnvelope.stateRevision);
    const receipts = bundle.privateJournal
      .filter((entry) => entry.payload?.type === "accepted_transition")
      .map((entry) => entry.payload.payload.receipt)
      .filter((receipt) => Number(receipt.postStateRevision) > replayBaseRevision
        && Number(receipt.postStateRevision) <= 19)
      .sort((left, right) => Number(left.postStateRevision)
        - Number(right.postStateRevision));
    assert.deepEqual(receipts.map((receipt) => receipt.postStateRevision),
      Array.from({ length: 19 - replayBaseRevision },
        (_, index) => replayBaseRevision + index + 1),
      "contiguous revision-19 replay history is required");
    const replay = fixture.authorityEngine.replay({
      initialEnvelope: bundle.initialEnvelope,
      journal: receipts,
      ...(replayCheckpoint ? { checkpoint: replayCheckpoint } : {}),
    });
    assert.equal(replay.ok, true, replay.reason || "authority replay failed");
    assert.equal(replay.envelope.stateRevision, 19,
      "replayed decision revision must match");
    assert.equal(replay.envelope.stateHash, decision.authority.stateHash,
      "decision and replayed authority must match");
    const targetEnvelope = replay.envelope;
    const legalSpace = fixture.rulesRuntime.enumerate(
      targetEnvelope.state, {
        sideKey: "player2", includeDisabled: false,
      });
    const domain = (legalSpace.parameterDomains || []).find((entry) =>
      entry.domainId === planning.recommendedCandidateId);
    assert.equal(domain?.actionType, "resolve_battlefield_asset_ability");
    assert.equal(domain?.effectKind, "creep_token_place");
    const search = planning.assetPlacementSearchRequest || {};
    const request = {
      maximumOptions: Number(search.maximumOptions || 4),
      preferredAnchor: {
        xMilliInches: Number(search.preferredAnchor?.xMilliInches),
        yMilliInches: Number(search.preferredAnchor?.yMilliInches),
      },
      tacticalPurpose: String(search.tacticalPurpose || ""),
    };
    process.stdout.write(`${JSON.stringify({
      event: "search_started",
      stateRevision: 19,
      domainId: domain.domainId,
      pieceId: domain.pieceId,
      effectKind: domain.effectKind,
      maximumOptions: request.maximumOptions,
    })}\n`);
    const started = performance.now();
    const result = searchStarcraftTmgLegalAssetPlacementOptionsV1({
      state: targetEnvelope.state,
      domain,
      request,
      instantiate: (...args) => fixture.rulesRuntime.instantiate(...args),
      instantiateOptions: {
        matchBinding: targetEnvelope.matchBinding,
      },
    });
    const durationMs = Math.round(performance.now() - started);
    const report = {
      schema: "ticket23_slice248_creep_asset_search_diagnosis_v1",
      ok: durationMs <= maximumDurationMs && result.optionCount === 4,
      reproduced: durationMs > maximumDurationMs,
      stateRevision: 19,
      domainId: domain.domainId,
      pieceId: domain.pieceId,
      effectKind: domain.effectKind,
      durationMs,
      maximumDurationMs,
      optionCount: result.optionCount,
      attemptedCandidateCount: result.attemptedCandidateCount,
      prefilteredCandidateCount: result.prefilteredCandidateCount || 0,
      instantiatedCandidateCount: result.instantiatedCandidateCount
        || result.attemptedCandidateCount,
      failureCounts: result.failureCounts,
      optionIds: result.placementOptions.map((entry) => entry.placementOptionId),
      providerCalls: 0,
      roomMutations: 0,
      trainingTruth: false,
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    assert.equal(report.ok, true,
      `asset search exceeded ${maximumDurationMs}ms or lost options`);
  } finally {
    decisions.close();
    roomStore.close();
  }
}

if (process.argv.includes("--worker")) await worker();
else parent();
