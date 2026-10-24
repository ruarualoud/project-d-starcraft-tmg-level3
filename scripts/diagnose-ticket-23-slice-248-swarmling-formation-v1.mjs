#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgRefereeCrypto } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { decodeStarcraftTmgLiveDecisionRecordV1 } from
  "../packages/online-agent-session/sqlite-live-decision-store-v1.mjs";
import { projectStarcraftTmgIncomingStationaryFireEstimateV1,
  searchStarcraftTmgLegalFormationOptionsV1 } from
  "../packages/online-agent-session/legal-formation-search-v1.mjs";
import { buildStarcraftTmgTacticalRelationshipGraphV1 } from
  "../packages/online-agent-session/tactical-relationship-graph-v1.mjs";
import { createOfficialSpecialTerrainAgreementV1,
  evaluateOfficialSpecialTerrainLineOfSightBatchV1 } from
  "../packages/rule-atoms/official-special-terrain-rules-kernel-v1.mjs";
import { createOfficialTerrainPieceV1 } from
  "../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { createSqliteStarcraftTmgRoomStore } from
  "../packages/room-store/sqlite-room-store-v1.mjs";
import { createTicket20HumanAgentDemoFixtureV1 } from
  "./support/ticket20-human-agent-demo-fixture-v1.mjs";
import { createTicket20AgentAgentDemoFixtureV1 } from
  "./support/ticket20-human-agent-demo-fixture-v1.mjs";
import { resolveOfficialDevelopmentTrancheFixtureRootV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SELF = fileURLToPath(import.meta.url);
const runArgument = process.argv.find((value) =>
  value.startsWith("--run-directory="));
const maxArgument = process.argv.find((value) => value.startsWith("--max-ms="));
const seatArgument = process.argv.find((value) => value.startsWith("--seat="));
const revisionArgument = process.argv.find((value) =>
  value.startsWith("--state-revision="));
assert(runArgument, "--run-directory is required");
const runDirectory = path.resolve(ROOT,
  runArgument.slice("--run-directory=".length));
const maximumDurationMs = Number(maxArgument?.slice("--max-ms=".length)
  || 60_000);
const seatKey = seatArgument?.slice("--seat=".length) || "player2";
const targetStateRevision = Number(revisionArgument
  ?.slice("--state-revision=".length) || 16);
const chargeResolutionDiagnostic = process.argv.includes(
  "--charge-resolution-diagnostic");
assert(Number.isFinite(maximumDurationMs) && maximumDurationMs > 0,
  "--max-ms must be positive");
assert(new Set(["player1", "player2"]).has(seatKey),
  "--seat must be player1 or player2");
assert(Number.isSafeInteger(targetStateRevision) && targetStateRevision > 0,
  "--state-revision must be a positive integer");

function parent() {
  const child = spawn(process.execPath, [SELF, `--run-directory=${runDirectory}`,
    `--max-ms=${maximumDurationMs}`, `--seat=${seatKey}`,
    `--state-revision=${targetStateRevision}`,
    ...(chargeResolutionDiagnostic ? ["--charge-resolution-diagnostic"] : []),
    "--worker"], {
    cwd: ROOT, stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  let lineBuffer = "";
  const progressEvents = [];
  const instantiationFailureDetails = [];
  let timer = null;
  let timedOut = false;
  child.stdout.on("data", (chunk) => {
    const text = chunk.toString("utf8");
    stdout += text;
    lineBuffer += text;
    const lines = lineBuffer.split(/\n/u);
    lineBuffer = lines.pop() || "";
    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        if (event.event === "search_started" && !timer) {
          timer = setTimeout(() => {
            timedOut = true;
            child.kill("SIGTERM");
          }, maximumDurationMs);
        }
        if (event.event === "search_progress") {
          progressEvents.push(event.progress);
          if (progressEvents.length > 24) progressEvents.shift();
        }
        if (event.event === "instantiation_failure_detail") {
          instantiationFailureDetails.push(event.message);
        }
      } catch {}
    }
  });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
  child.once("exit", (code, signal) => {
    if (timer) clearTimeout(timer);
    if (timedOut) {
      process.stdout.write(`${JSON.stringify({
        schema: "ticket23_slice248_swarmling_formation_diagnosis_v1",
        ok: false,
        reproduced: true,
        reason: "FORMATION_SEARCH_TIMEOUT",
        maximumDurationMs,
        seatKey,
        targetStateRevision,
        signal,
        progressEvents,
        instantiationFailureDetails,
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
  const forkChain = [];
  let ancestryDirectory = runDirectory;
  const visitedDirectories = new Set();
  while (true) {
    assert(!visitedDirectories.has(ancestryDirectory),
      "versioned fork ancestry cycle");
    visitedDirectories.add(ancestryDirectory);
    const fork = await readFile(path.join(ancestryDirectory,
      "fork-private.json"), "utf8").then(JSON.parse, (error) => {
      if (error?.code === "ENOENT") return null;
      throw error;
    });
    if (!fork) break;
    forkChain.push(fork);
    ancestryDirectory = path.resolve(fork.sourceDirectory || "");
    assert(forkChain.length <= 4, "versioned fork ancestry is too deep");
  }
  const forkPrivate = forkChain[0] || null;
  const sourceDirectory = forkPrivate ? ancestryDirectory : null;
  const sourcePrivate = JSON.parse(await readFile(path.join(
    ancestryDirectory, "runner-private.json"), "utf8"));
  const privateState = forkPrivate ? {
    ...sourcePrivate,
    roomId: forkPrivate.targetRoomId,
    resumeCredentials: forkPrivate.resumeCredentials,
  } : sourcePrivate;
  const runId = path.basename(runDirectory);
  const cryptoRunId = sourceDirectory
    ? path.basename(sourceDirectory) : runId;
  const codec = createStarcraftTmgPrivatePayloadCodec({
    key: privateState.storeEncryptionKeyBase64,
    keyId: `ticket23-slice248-room-store-${cryptoRunId}`,
    trustLevel: "development_persistent",
  });
  const roomStore = createSqliteStarcraftTmgRoomStore({
    filename: path.join(runDirectory, "room.sqlite"),
    privatePayloadCodec: codec,
  });
  const decisions = new DatabaseSync(path.join(runDirectory,
    `seats/${seatKey}/provider/live-decisions.sqlite`), { readOnly: true });
  const roomDatabase = new DatabaseSync(path.join(runDirectory,
    "room.sqlite"), { readOnly: true });
  try {
    const record = decodeStarcraftTmgLiveDecisionRecordV1(String(decisions.prepare(
      "SELECT record_json FROM sc_live_decision_records LIMIT 1",
    ).get()?.record_json || "{}"));
    const decision = Object.values(record.decisions || {}).find((entry) =>
      Number(entry?.authority?.stateRevision) === targetStateRevision);
    assert(decision,
      `revision-${targetStateRevision} ${seatKey} decision is required`);
    const lastAttempt = [...(decision.attemptKeys || [])].reverse()
      .map((key) => decision.attempts?.[key])
      .find((attempt) => attempt?.status === "completed"
        && attempt.safeOutput?.providerTurn?.toolCalls?.[0]?.name
          === "submit_planning");
    const lastPlanningOutput = [...(decision.attemptKeys || [])].reverse()
      .map((key) => decision.attempts?.[key]?.safeOutput)
      .find((output) => output?.recommendedCandidateId
        || output?.planning?.recommendedCandidateId);
    const planning = decision.plannerResult
      || lastPlanningOutput?.planning || lastPlanningOutput
      || lastAttempt?.safeOutput?.providerTurn?.toolCalls?.[0]?.arguments;
    assert(planning?.recommendedCandidateId,
      `completed revision-${targetStateRevision} planning submission is required`);
    const replayBundle = await roomStore.loadReplayBundle(privateState.roomId);
    const checkpointRow = roomDatabase.prepare(`
      SELECT state_revision, checkpoint_cipher
        FROM sc_checkpoints
       WHERE room_id = ? AND state_revision <= ?
       ORDER BY state_revision DESC LIMIT 1
    `).get(privateState.roomId, targetStateRevision);
    const replayCheckpoint = checkpointRow
      ? codec.decode(checkpointRow.checkpoint_cipher,
        `room:${privateState.roomId}:checkpoint:${checkpointRow.state_revision}`)
      : Number(replayBundle.latestCheckpoint?.stateRevision)
          <= targetStateRevision
        ? replayBundle.latestCheckpoint : null;
    const replayBaseRevision = Number(replayCheckpoint?.stateRevision
      ?? replayBundle.initialEnvelope.stateRevision);
    const refereeCrypto = createStarcraftTmgRefereeCrypto({
      privateKey: privateState.refereePrivateKeyPem,
      publicKey: privateState.refereePublicKeyPem,
      hmacSecret: privateState.refereeHmacSecret,
      keyId: `ticket23-slice248-referee-${cryptoRunId}`,
      trustLevel: "development_persistent",
    });
    const fixtureFactory = forkPrivate
      ? createTicket20AgentAgentDemoFixtureV1
      : createTicket20HumanAgentDemoFixtureV1;
    const fixture = await fixtureFactory({
      root: forkPrivate
        ? await resolveOfficialDevelopmentTrancheFixtureRootV1({ root: ROOT })
        : process.env.TICKET27_S271_FIXTURE_ROOT || ROOT,
      roomId: privateState.roomId,
      ...(forkPrivate ? {
        setupRoomId: forkChain.at(-1).sourceRoomId,
        currentProductRuntimeVariant: forkChain.length > 1
          ? "charge_access_v3" : "charge_endpoint_v2",
      } : {}),
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
    const receipts = replayBundle.privateJournal
      .filter((entry) => entry.payload?.type === "accepted_transition")
      .map((entry) => entry.payload.payload.receipt)
      .filter((receipt) =>
        Number(receipt.postStateRevision) > replayBaseRevision
          && Number(receipt.postStateRevision) <= targetStateRevision)
      .sort((left, right) => Number(left.postStateRevision)
        - Number(right.postStateRevision));
    const replay = fixture.authorityEngine.replay({
      initialEnvelope: replayBundle.initialEnvelope,
      journal: receipts,
      ...(replayCheckpoint ? { checkpoint: replayCheckpoint } : {}),
    });
    assert.equal(replay.ok, true, replay.reason || "authority replay failed");
    assert.equal(replay.envelope.stateRevision, targetStateRevision,
      "replayed authority revision must match requested revision");
    assert.equal(replay.envelope.stateHash, decision.authority.stateHash,
      "decision and replayed authority must match");
    const legalSpace = fixture.rulesRuntime.enumerate(
      replay.envelope.state, {
        sideKey: seatKey, includeDisabled: false,
      });
    const domain = (legalSpace.parameterDomains || []).find((entry) =>
      entry.domainId === planning.recommendedCandidateId);
    assert(domain, "selected formation parameter domain is required");
    const request = planning.formationSearchRequest || {
      maximumOptions: Number(planning.formationMaximumOptions),
      preferredAnchor: {
        xMilliInches: Number(planning.formationPreferredX),
        yMilliInches: Number(planning.formationPreferredY),
      },
      tacticalPurpose: String(planning.formationTacticalPurpose || ""),
      formationObjectives: structuredClone(planning.formationObjectives || []),
    };
    process.stdout.write(`${JSON.stringify({
      event: "search_started",
      stateRevision: targetStateRevision,
      seatKey,
      domainId: domain.domainId,
      pieceId: domain.pieceId,
      modelCount: domain.constraints?.modelProfiles?.length || 18,
      maximumOptions: request.maximumOptions,
      ...(chargeResolutionDiagnostic ? {
        maxDistanceMilliInches:
          domain.constraints?.maxDistanceMilliInches,
        leadingModelId: domain.constraints?.leadingModelId,
        leadingProfile: domain.constraints?.modelProfiles?.find((entry) =>
          entry.modelId === domain.constraints?.leadingModelId),
        declaredTargets: domain.constraints?.declaredTargets,
        targetModels: (domain.constraints?.declaredTargets || []).map((target) => {
          const piece = replay.envelope.state.pieces.find((entry) =>
            entry.id === target.unitId);
          return { unitId: target.unitId, modelId: target.modelId,
            model: piece?.models?.find((entry) =>
              entry.id === target.modelId) || null };
        }),
      } : {}),
    })}\n`);
    const started = performance.now();
    let reportedInstantiationFailures = 0;
    const result = searchStarcraftTmgLegalFormationOptionsV1({
      state: replay.envelope.state,
      domain,
      request,
      instantiate: (...args) => {
        try { return fixture.rulesRuntime.instantiate(...args); }
        catch (error) {
          if (reportedInstantiationFailures < 12) {
            reportedInstantiationFailures += 1;
            process.stdout.write(`${JSON.stringify({
              event: "instantiation_failure_detail",
              message: String(error?.message || error).slice(0, 240),
            })}\n`);
          }
          throw error;
        }
      },
      instantiateOptions: {
        matchBinding: replay.envelope.matchBinding,
      },
      observeProgress(progress) {
        process.stdout.write(`${JSON.stringify({
          event: "search_progress", progress,
        })}\n`);
      },
    });
    const durationMs = Math.round(performance.now() - started);
    const pairwiseClearances = result.formationOptions.map((entry) => Number(
      entry.tacticalMetrics?.minimumPairwiseBaseSeparationMilliInches));
    const finitePairwiseClearances = pairwiseClearances.filter(Number.isFinite);
    const pairwiseClearanceSpreadMilliInches = finitePairwiseClearances.length
      ? Math.max(...finitePairwiseClearances)
        - Math.min(...finitePairwiseClearances) : 0;
    const formationEnvelopeAreas = result.formationOptions.map((entry) =>
      Number(entry.tacticalMetrics
        ?.formationEnvelopeAreaSquareMilliInches)).filter(Number.isFinite);
    const multiModelFormationStrategyDiversity =
      Number(domain.constraints?.modelProfiles?.length || 0) <= 1
      || (new Set(pairwiseClearances).size >= 2
        && pairwiseClearanceSpreadMilliInches >= 100
        && new Set(formationEnvelopeAreas).size >= 2);
    const specialTerrainLosUnknownOptions = result.formationOptions
      .filter((entry) => entry.relationshipComparison?.sourceReceipts
        ?.specialTerrainLosBatchFailure)
      .map((entry) => {
        const relationships = entry.relationshipComparison?.relationships || [];
        const unknownRelationships = relationships.filter((relationship) =>
          Number(relationship.unknownModelPairCount || 0) > 0
            && (relationship.enemyStationaryThreatUnknownProfileKeys || [])
              .length > 0);
        const estimate = entry.relationshipComparison
          ?.incomingStationaryFireEstimate || null;
        return {
          formationOptionId: entry.formationOptionId,
          specialTerrainLosBatchFailure: entry.relationshipComparison
            .sourceReceipts.specialTerrainLosBatchFailure,
          unknownRelationshipCount: unknownRelationships.length,
          unknownEnemyStationaryProfileKeys: [...new Set(
            unknownRelationships.flatMap((relationship) =>
              relationship.enemyStationaryThreatUnknownProfileKeys || []),
          )],
          incomingStationaryFireEstimateStatus: estimate?.status || null,
          unknownNeverPromotedToSafeOrZero:
            estimate?.unknownNeverPromotedToSafeOrZero === true,
        };
      });
    const specialTerrainLosUnknownPreserved =
      specialTerrainLosUnknownOptions.length === 0
      || specialTerrainLosUnknownOptions.every((entry) =>
        entry.unknownRelationshipCount > 0
          && entry.unknownEnemyStationaryProfileKeys.length > 0
          && entry.incomingStationaryFireEstimateStatus
            === "unknown_current_position_stationary_attack_domain"
          && entry.unknownNeverPromotedToSafeOrZero);
    const report = {
      schema: "ticket23_slice248_swarmling_formation_diagnosis_v1",
      ok: durationMs <= maximumDurationMs && (chargeResolutionDiagnostic
        ? result.optionCount > 0 : result.optionCount === 4),
      reproduced: durationMs > maximumDurationMs,
      stateRevision: targetStateRevision,
      seatKey,
      domainId: domain.domainId,
      pieceId: domain.pieceId,
      modelCount: domain.constraints?.modelProfiles?.length || 18,
      durationMs,
      maximumDurationMs,
      optionCount: result.optionCount,
      attemptedCandidateCount: result.attemptedCandidateCount,
      instantiatedCandidateCount: result.instantiatedCandidateCount,
      prefilteredCandidateCount: result.prefilteredCandidateCount,
      duplicateIntentCandidateCount: result.duplicateIntentCandidateCount,
      searchCoverage: result.searchCoverage,
      failureCounts: result.failureCounts,
      optionIds: result.formationOptions.map((entry) => entry.formationOptionId),
      pairwiseClearances,
      pairwiseClearanceSpreadMilliInches,
      formationEnvelopeAreas,
      multiModelFormationStrategyDiversity,
      specialTerrainLosUnknownOptions,
      specialTerrainLosUnknownPreserved,
      providerCalls: 0,
      roomMutations: 0,
      trainingTruth: false,
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    assert.equal(report.ok, true,
      `formation search exceeded ${maximumDurationMs}ms or lost options`);
    if (!chargeResolutionDiagnostic) assert.equal(
      report.multiModelFormationStrategyDiversity, true,
      "multi-model formation options must expose materially different spacing and envelopes");
    if (!chargeResolutionDiagnostic) assert.equal(
      report.specialTerrainLosUnknownPreserved, true,
      "special-terrain LOS failure must remain unknown, never safe or zero");
  } finally {
    decisions.close();
    roomDatabase.close();
    roomStore.close();
  }
}

// This regression reads the already-applied failing scene, without rebuilding
// the full room runtime, replaying actions, or opening its database for writes.
async function specialTerrainLosRegression() {
  const started = performance.now();
  const privateState = JSON.parse(await readFile(
    path.join(runDirectory, "runner-private.json"), "utf8"));
  const codec = createStarcraftTmgPrivatePayloadCodec({
    key: privateState.storeEncryptionKeyBase64,
    keyId: `ticket23-slice248-room-store-${path.basename(runDirectory)}`,
    trustLevel: "development_persistent",
  });
  const database = new DatabaseSync(path.join(runDirectory, "room.sqlite"),
    { readOnly: true });
  try {
    const row = database.prepare(
      "SELECT aggregate_cipher FROM sc_rooms WHERE room_id = ?",
    ).get(privateState.roomId);
    const { envelope } = codec.decode(row.aggregate_cipher,
      `room:${privateState.roomId}:aggregate`);
    assert.equal(envelope.stateRevision, targetStateRevision);
    const state = envelope.state;
    const onField = state.pieces.filter((piece) => piece.isOnField
      && !piece.isDestroyed && piece.currentModels > 0);
    const attacker = onField.find((piece) => /goliath/i.test(piece.name));
    const target = onField.find((piece) => /hydralisk/i.test(piece.name));
    assert(attacker && target, "the actual failed Goliath/Hydralisk scene is required");
    const queries = attacker.models.filter((model) => !model.isDestroyed)
      .flatMap((left) => target.models.filter((model) => !model.isDestroyed)
        .map((right) => ({ queryId: `${left.id}:${right.id}`,
          actorUnitId: attacker.id, attackerModelId: left.id,
          targetUnitId: target.id, targetModelId: right.id })));
    const los = (value) => evaluateOfficialSpecialTerrainLineOfSightBatchV1({
      state: value, queries, dataBundle: value.officialTerrainLosDataBundle,
    });
    // Before repair, this exact persisted scene fails at context verification:
    // SPECIAL_TERRAIN_IMPASSABLE_DERIVATION_INVALID (flat blocking terrain).
    const batch = los(state);
    assert.equal(batch.queryCount, queries.length);
    assert(batch.results.every((entry) => typeof entry.result.visible === "boolean"));
    const graphFor = (value) => buildStarcraftTmgTacticalRelationshipGraphV1({
      state: value, seatKey: target.sideKey,
      request: { subjectUnitIds: [target.id], targetIds: [attacker.id] },
    });
    const graph = graphFor(state);
    assert.equal(graph.sourceReceipts.specialTerrainLosBatchFailure, null);
    const edge = graph.relationships.find((entry) =>
      entry.fromUnitId === target.id && entry.toUnitId === attacker.id);
    assert(edge);
    assert.equal(edge.lineOfSight.unknownModelPairCount, 0);
    const visibleCount = batch.results.filter((entry) => entry.result.visible).length;
    assert.equal(edge.lineOfSight.visibleModelPairCount, visibleCount);
    assert.equal(edge.threats.toFrom.stationaryUnknownProfileKeys.length, 0);
    if (visibleCount > 0) assert(edge.threats.toFrom.stationaryProfileKeys.length > 0,
      "actual visible in-range fire must reach the Agent relationship surface");

    const blocker = state.board.terrain.find((piece) => piece.terrainKind === "impassable"
      && !piece.standableHorizontalSurface);
    assert(blocker);
    function changeBlocker(properties, agreementChanges = {}) {
      const altered = structuredClone(state);
      altered.board.terrain = altered.board.terrain.map((piece) => piece.id === blocker.id
        ? createOfficialTerrainPieceV1({ ...piece,
          openings: piece.setupAgreement.openings, ...properties }) : piece);
      altered.board.specialTerrainAgreement = createOfficialSpecialTerrainAgreementV1({
        terrainEntries: altered.board.specialTerrainAgreement.terrainEntries.map((entry) =>
          entry.terrainId === blocker.id ? { ...entry, ...agreementChanges } : entry),
      });
      return altered;
    }
    assert.throws(() => los(changeBlocker({ standableHorizontalSurface: true })),
      /SPECIAL_TERRAIN_IMPASSABLE_DERIVATION_INVALID/,
      "an unbound standable upper surface is not a flat obstacle");
    assert.throws(() => los(changeBlocker({ size: 1 })),
      /SPECIAL_TERRAIN_IMPASSABLE_SIZE_INVALID/,
      "flat obstacle support must not permit an impassable Size 0/1");
    assert.throws(() => los(changeBlocker({}, {
      adjacentElevationPairs: [["ground", "mid"]],
      accessPoints: [{ accessPointId: "regression-access", role: "generic",
        footprint: blocker.footprint, connects: ["ground", "mid"] }],
    })), /SPECIAL_TERRAIN_IMPASSABLE_DERIVATION_INVALID/,
    "impassable and an actual elevation access connection are contradictory");

    const unresolved = changeBlocker({ standableHorizontalSurface: true });
    const unknownGraph = graphFor(unresolved);
    assert.match(unknownGraph.sourceReceipts.specialTerrainLosBatchFailure,
      /SPECIAL_TERRAIN_IMPASSABLE_DERIVATION_INVALID/);
    const unknownEstimate = projectStarcraftTmgIncomingStationaryFireEstimateV1(
      unresolved, target.id, unknownGraph);
    assert.equal(unknownEstimate.status,
      "unknown_current_position_stationary_attack_domain");
    assert.equal(unknownEstimate.unknownNeverPromotedToSafeOrZero, true);
    assert(unknownEstimate.possibleAttackProfiles.length > 0);
    const report = { schema: "ticket23_slice248_special_terrain_los_regression_v1",
      ok: true, runId: path.basename(runDirectory), stateRevision: envelope.stateRevision,
      stateHash: envelope.stateHash, terrainCount: state.board.terrain.length,
      queryCount: batch.queryCount, visibleCount,
      blockedCount: batch.queryCount - visibleCount,
      minimumBaseEdgeDistanceMilliInches: Math.min(...batch.results.map((entry) =>
        entry.result.modelEdgeDistanceMilliInches)),
      stationaryProfileKeys: edge.threats.toFrom.stationaryProfileKeys,
      specialTerrainLosBatchFailure: graph.sourceReceipts.specialTerrainLosBatchFailure,
      invalidContextStillRejected: true, unknownEstimateStatus: unknownEstimate.status,
      durationMs: Math.round(performance.now() - started),
      providerCalls: 0, roomMutations: 0, trainingTruth: false };
    await writeFile(path.join(ROOT,
      "build/ticket23-slice248-special-terrain-los-repair-v1-report.json"),
    `${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally { database.close(); }
}

if (process.argv.includes("--special-terrain-los-only")) await specialTerrainLosRegression();
else if (process.argv.includes("--worker")) await worker();
else parent();
