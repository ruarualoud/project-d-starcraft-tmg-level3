#!/usr/bin/env node

import http from "node:http";
import { generateKeyPairSync, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createStarcraftTmgLevel3HttpAdapter,
  STARCRAFT_TMG_LEVEL3_API_PREFIX,
} from "../packages/http-adapter/handler-v1.mjs";
import {
  STARCRAFT_TMG_HOSTED_BOT_SEAT_API_PREFIX,
  STARCRAFT_TMG_HOSTED_BOT_SEAT_HTTP_VERSION,
} from "../packages/client-domain/hosted-bot-seat-transport-v1.mjs";
import { createStarcraftTmgRefereeCrypto } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgLiveOpponentProviderStackV1 } from
  "../packages/online-agent-session/live-opponent-provider-stack-v1.mjs";
import { createSqliteStarcraftTmgHostedBotSeatStoreV1 } from
  "../packages/online-agent-session/sqlite-hosted-bot-seat-store-v1.mjs";
import { createSqliteStarcraftTmgMatchDecisionJournalV1 } from
  "../packages/online-agent-session/sqlite-match-decision-journal-v1.mjs";
import { createOfficialCompetitiveMapConfiguratorV1 } from
  "../packages/product-composition/official-competitive-map-configurator-v1.mjs";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { createSqliteStarcraftTmgRoomStore } from
  "../packages/room-store/sqlite-room-store-v1.mjs";
import { createStarcraftTmgLiveMatchEvolutionExportV1 } from
  "../packages/training-data/live-match-evolution-export-v1.mjs";
import { createTicket20AgentAgentDemoFixtureV1 } from
  "./support/ticket20-human-agent-demo-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIVE_ROOT = path.join(ROOT,
  "build/ticket-23-slice-248-standard-2000-aa-live-v1");
const VERIFIED_WEB_ROOT = path.join(ROOT,
  "build/ticket-14-slice-136-web-static-v1/export-acceptance");
const CURRENT_WEB_ROOT = path.join(ROOT, "apps/starcraft-tmg-expo/dist");
const PRODUCT_WEB_ROOT = existsSync(CURRENT_WEB_ROOT)
  ? CURRENT_WEB_ROOT : VERIFIED_WEB_ROOT;
const PRODUCT_WEB_DOCUMENTS = new Map([
  ["/", "index.html"], ["/index.html", "index.html"],
  ["/army", "army.html"], ["/match", "match.html"],
  ["/tools", "tools.html"], ["/settings", "settings.html"],
  ["/(tabs)", "(tabs)/index.html"],
  ["/(tabs)/army", "(tabs)/army.html"],
  ["/(tabs)/match", "(tabs)/match.html"],
  ["/(tabs)/tools", "(tabs)/tools.html"],
  ["/(tabs)/settings", "(tabs)/settings.html"],
]);
const MIME_TYPES = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp",
  ".woff": "font/woff", ".woff2": "font/woff2",
});
const PUBLIC_BROWSER_CONTENT_MODULES = new Set([
  "official-faq-f3-movement-battlefield-deployment-binding-v1.mjs",
  "official-faq-f4-ability-tactical-keyword-binding-v1.mjs",
]);
const MAX_BODY_BYTES = 256 * 1024;
const SEATS = Object.freeze(["player1", "player2"]);

function safeFile(root, relativePath) {
  const target = path.resolve(root, relativePath);
  return target === root || target.startsWith(`${root}${path.sep}`)
    ? target : null;
}

function staticCandidate(pathname) {
  if (pathname.startsWith("/packages/")) return {
    root: path.join(ROOT, "packages"),
    relativePath: pathname.slice("/packages/".length),
  };
  if (pathname.startsWith("/content/")) {
    const relativePath = pathname.slice("/content/".length);
    return PUBLIC_BROWSER_CONTENT_MODULES.has(relativePath)
      ? { root: path.join(ROOT, "content"), relativePath } : null;
  }
  if (pathname.startsWith("/assets/client/")) return {
    root: path.join(ROOT, "assets/client"),
    relativePath: pathname.slice("/assets/client/".length),
  };
  if (PRODUCT_WEB_DOCUMENTS.has(pathname)) return {
    root: PRODUCT_WEB_ROOT,
    relativePath: PRODUCT_WEB_DOCUMENTS.get(pathname),
  };
  if (pathname === "/room" || pathname.startsWith("/room/")) return {
    root: PRODUCT_WEB_ROOT, relativePath: "room/[roomId].html",
  };
  return { root: PRODUCT_WEB_ROOT,
    relativePath: pathname.replace(/^\/+/, "") };
}

async function serveFile(response, descriptor) {
  if (!descriptor) return false;
  const filename = safeFile(descriptor.root, descriptor.relativePath);
  if (!filename) return false;
  try {
    const info = await stat(filename);
    if (!info.isFile()) return false;
    const body = await readFile(filename);
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-length": String(body.byteLength),
      "content-type": MIME_TYPES[path.extname(filename)]
        || "application/octet-stream",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
    });
    response.end(body);
    return true;
  } catch {
    return false;
  }
}

function sendJson(response, status, body) {
  const bytes = Buffer.from(JSON.stringify(body), "utf8");
  response.writeHead(status, {
    "cache-control": "private, no-store, max-age=0",
    "content-length": String(bytes.byteLength),
    "content-type": "application/json; charset=utf-8",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
  });
  response.end(bytes);
}

async function readRequestBody(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.byteLength;
    if (bytes > MAX_BODY_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
    chunks.push(chunk);
  }
  const rawBody = Buffer.concat(chunks);
  return { rawBody, body: rawBody.byteLength
    ? JSON.parse(rawBody.toString("utf8")) : {}, bodyBytes: rawBody.byteLength };
}

function authorizeRunner(request, runnerToken) {
  const supplied = Buffer.from(String(
    request.headers["x-ticket23-runner-token"] || ""), "utf8");
  const expected = Buffer.from(runnerToken, "utf8");
  return supplied.byteLength === expected.byteLength
    && timingSafeEqual(supplied, expected);
}

function sumUsage(projections) {
  const rows = Object.values(projections).map((entry) => entry?.usage || {});
  return {
    providerCalls: rows.reduce((sum, entry) =>
      sum + Number(entry.providerCalls || 0), 0),
    inputUnits: rows.reduce((sum, entry) =>
      sum + Number(entry.inputUnits || 0), 0),
    outputUnits: rows.reduce((sum, entry) =>
      sum + Number(entry.outputUnits || 0), 0),
    totalUnits: rows.reduce((sum, entry) =>
      sum + Number(entry.totalUnits || 0), 0),
    estimatedCostCnyMicros: rows.reduce((sum, entry) =>
      sum + Number(entry.estimatedCostCnyMicros || 0), 0),
  };
}

function compactTrace(trace = {}) {
  return Object.fromEntries([
    "applyReceiptHash", "actionType", "authorityActionType", "candidateId",
    "pieceId", "postStateRevision", "postStateHash",
    "publicDecisionSummary", "plan", "assessment", "planRevision", "intent",
    "plannerResult", "lifecycleAssessment",
    "formationSelection", "assetPlacementSelection", "placementRationales",
    "selectedReason", "risk", "providerCalls", "providerInputUnits",
    "providerOutputUnits", "providerTotalUnits", "matchEstimatedCostCnyMicros",
    "replayMatchesCurrent",
  ].filter((key) => trace[key] !== undefined).map((key) => [key, trace[key]]));
}

function compactSeatProjection(projection = {}) {
  const bot = projection.bot || projection;
  return {
    bot: {
      lifecycle: bot.lifecycle || null,
      driveStatus: bot.driveStatus || null,
      actionCount: Number(bot.actionCount || 0),
      issues: Array.isArray(bot.issues) ? bot.issues : [],
      recentTraces: (bot.recentTraces || []).slice(-4).map(compactTrace),
    },
    notificationIssues: Array.isArray(projection.notificationIssues)
      ? projection.notificationIssues : [],
  };
}

function compactProviderProjection(projection = {}) {
  return {
    lifecycle: projection.lifecycle || null,
    issues: Array.isArray(projection.issues) ? projection.issues : [],
    usage: projection.usage || {},
  };
}

async function main() {
  const resumeArgument = process.argv.find((entry) =>
    entry.startsWith("--resume-directory="));
  const requestedResumeDirectory = resumeArgument
    ? path.resolve(resumeArgument.slice("--resume-directory=".length)) : null;
  if (requestedResumeDirectory
    && requestedResumeDirectory !== LIVE_ROOT
    && !requestedResumeDirectory.startsWith(`${LIVE_ROOT}${path.sep}`)) {
    throw new Error("SLICE248_RESUME_DIRECTORY_OUTSIDE_LIVE_ROOT");
  }
  const retryProviderOnResume = process.argv.includes(
    "--retry-provider-on-resume");
  const runId = requestedResumeDirectory
    ? path.basename(requestedResumeDirectory)
    : new Date().toISOString().replace(/[^0-9]/gu, "");
  const dataDirectory = requestedResumeDirectory || path.join(LIVE_ROOT, runId);
  await mkdir(dataDirectory, { recursive: true, mode: 0o700 });
  let privateState = null;
  if (requestedResumeDirectory) {
    privateState = JSON.parse(await readFile(path.join(dataDirectory,
      "runner-private.json"), "utf8"));
    if (!privateState?.roomId
      || !privateState?.resumeCredentials?.human?.seatToken
      || !privateState?.resumeCredentials?.bot?.seatToken) {
      throw new Error("SLICE248_RESUME_CREDENTIALS_UNAVAILABLE");
    }
  }
  const roomId = privateState?.roomId || `ticket23-slice248-aa-${runId}`;
  if (!privateState) {
    const keyPair = generateKeyPairSync("ed25519");
    privateState = {
      schema: "ticket23_slice248_live_server_private_state_v1",
      roomId,
      refereePrivateKeyPem: keyPair.privateKey.export({
        type: "pkcs8", format: "pem",
      }).toString(),
      refereePublicKeyPem: keyPair.publicKey.export({
        type: "spki", format: "pem",
      }).toString(),
      refereeHmacSecret: randomBytes(32).toString("base64url"),
      storeEncryptionKeyBase64: randomBytes(32).toString("base64"),
      resumeCredentials: null,
      apiCredentialStored: false,
      trainingTruth: false,
    };
    await writeFile(path.join(dataDirectory, "runner-private.json"),
      `${JSON.stringify(privateState, null, 2)}\n`, {
        encoding: "utf8", mode: 0o600,
      });
  }
  const runnerToken = randomBytes(32).toString("base64url");
  const refereeCrypto = createStarcraftTmgRefereeCrypto({
    privateKey: privateState.refereePrivateKeyPem,
    publicKey: privateState.refereePublicKeyPem,
    hmacSecret: privateState.refereeHmacSecret,
    keyId: `ticket23-slice248-referee-${runId}`,
    trustLevel: "development_persistent",
  });
  const privatePayloadCodec = createStarcraftTmgPrivatePayloadCodec({
    key: privateState.storeEncryptionKeyBase64,
    keyId: `ticket23-slice248-room-store-${runId}`,
    trustLevel: "development_persistent",
  });
  const roomStore = createSqliteStarcraftTmgRoomStore({
    filename: path.join(dataDirectory, "room.sqlite"),
    privatePayloadCodec,
  });
  const seatRoots = Object.fromEntries(SEATS.map((seatKey) => [seatKey,
    path.join(dataDirectory, "seats", seatKey)]));
  await Promise.all(Object.values(seatRoots).map((directory) =>
    mkdir(directory, { recursive: true, mode: 0o700 })));
  const botStores = Object.fromEntries(SEATS.map((seatKey) => [seatKey,
    createSqliteStarcraftTmgHostedBotSeatStoreV1({
      filename: path.join(seatRoots[seatKey], "bot-seat.sqlite"),
    })]));
  const memoryJournals = Object.fromEntries(SEATS.map((seatKey) => [seatKey,
    createSqliteStarcraftTmgMatchDecisionJournalV1({
      filename: path.join(seatRoots[seatKey], "match-memory.sqlite"),
    })]));
  const providerPorts = { player1: null, player2: null };
  const deferred = Object.fromEntries(SEATS.map((seatKey) => [seatKey,
    Object.freeze({
      async decide(input) {
        if (!providerPorts[seatKey]) return { ok: false,
          reason: "LIVE_SELFPLAY_PROVIDER_NOT_READY",
          findingSeverity: "High", trainingTruth: false };
        return providerPorts[seatKey].decide(input);
      },
    })]));
  const physicalAgentPort = Object.freeze({
    async execute(task) {
      return { completed: true,
        evidenceRefs: [`web-virtual-table:${task.taskId}:authoritative-projection`] };
    },
  });
  const fixture = await createTicket20AgentAgentDemoFixtureV1({
    root: ROOT,
    roomId,
    roomProfile: "standard_2000_live",
    mapConfiguration: {
      seedId: "sc1_lost_temple_v1",
      elementSelections: [], passageSelections: [],
    },
    maxAppliedActions: 180,
    enableSpatialPreexecution: true,
    autoDriveIntervalMs: 2_500,
    attachBot: false,
    autoDrive: false,
    roomStore,
    refereeCrypto,
    resumeRoom: Boolean(requestedResumeDirectory),
    resumeCredentials: privateState.resumeCredentials,
    botDecisionPort: deferred.player2,
    botStore: botStores.player2,
    matchDecisionJournal: memoryJournals.player2,
    physicalAgentPort,
    player1DecisionPort: deferred.player1,
    player1BotStore: botStores.player1,
    player1MatchDecisionJournal: memoryJournals.player1,
    player1PhysicalAgentPort: physicalAgentPort,
    title: "Ticket 23 · Standard 2000 · Agent vs Agent",
    surfaceMode: "agent_agent_live_evidence",
  });
  if (!requestedResumeDirectory) {
    privateState.resumeCredentials = {
      human: { seatToken: fixture.createdRoom.credentials.human.seatToken },
      bot: { seatToken: fixture.createdRoom.credentials.bot.seatToken },
    };
    await writeFile(path.join(dataDirectory, "runner-private.json"),
      `${JSON.stringify(privateState, null, 2)}\n`, {
        encoding: "utf8", mode: 0o600,
      });
  }
  const providerStacks = {
    player1: await createStarcraftTmgLiveOpponentProviderStackV1({
      roomId, seatKey: "player1",
      matchBinding: fixture.createdRoom.matchBinding,
      spatialQueryPort: fixture.player1SpatialRuntime,
      memoryQueryPort: fixture.player1Continuity,
      strategyEntries: fixture.strategySkillEntries,
      ownFaction: "tactical_cards:terran_armed_forces",
      opponentFaction: "tactical_cards:zerg_swarm",
      dataDirectory: path.join(seatRoots.player1, "provider"),
      matchMode: "agent_vs_agent",
      budgetLimitCnyMicros: 80_000_000,
      maxProviderCalls: 1_024,
    }),
    player2: await createStarcraftTmgLiveOpponentProviderStackV1({
      roomId, seatKey: "player2",
      matchBinding: fixture.createdRoom.matchBinding,
      spatialQueryPort: fixture.spatialRuntime,
      memoryQueryPort: fixture.continuity,
      strategyEntries: fixture.strategySkillEntries,
      ownFaction: "tactical_cards:zerg_swarm",
      opponentFaction: "tactical_cards:terran_armed_forces",
      dataDirectory: path.join(seatRoots.player2, "provider"),
      matchMode: "agent_vs_agent",
      budgetLimitCnyMicros: 80_000_000,
      maxProviderCalls: 1_024,
    }),
  };
  providerPorts.player1 = providerStacks.player1.decisionPort;
  providerPorts.player2 = providerStacks.player2.decisionPort;
  const evolutionExportRuntime =
    createStarcraftTmgLiveMatchEvolutionExportV1({
      authorityEngine: fixture.authorityEngine,
      roomStore: fixture.roomRuntime.roomStore,
    });
  const selectedModels = Object.fromEntries(SEATS.map((seatKey) => [seatKey,
    providerStacks[seatKey].selectedProfile.model]));
  if (selectedModels.player1 !== selectedModels.player2) {
    throw new Error("SLICE248_PROVIDER_MODEL_PARITY_FAILED");
  }
  await fixture.orchestrator.start();
  let providerMatchesFinalized = false;
  const existingEvolutionSummaryPath = path.join(dataDirectory,
    "training/summary.json");
  let evolutionExportSummary = existsSync(existingEvolutionSummaryPath)
    ? JSON.parse(await readFile(existingEvolutionSummaryPath, "utf8")) : null;
  if (evolutionExportSummary?.roomId !== roomId
    || evolutionExportSummary?.terminal !== true) {
    evolutionExportSummary = null;
  }
  let evolutionExportPromise = null;
  let driveJobSequence = 0;
  let driveJob = null;

  async function writeTerminalEvolutionArtifacts(orchestratorResult) {
    if (evolutionExportSummary) return evolutionExportSummary;
    if (evolutionExportPromise) return evolutionExportPromise;
    evolutionExportPromise = (async () => {
      if (orchestratorResult?.status !== "completed"
        || orchestratorResult?.replayMatchesCurrent !== true
        || orchestratorResult?.state?.terminal !== true) {
        throw Object.assign(new Error(
          "terminal replay-verified orchestrator result is required"), {
          code: "SLICE263_TERMINAL_EVOLUTION_SOURCE_INVALID",
          severity: "High",
        });
      }
      const compiled = await evolutionExportRuntime.compile({
        roomId,
        episodeId: `${roomId}:terminal`,
        decisionBindings: orchestratorResult.trajectory,
        experimentCell: orchestratorResult.experimentCell,
        reviewContext: {
          evaluationSplit: "development",
          scalePoints: orchestratorResult.experimentCell.scenario.scalePoints,
          modelSnapshotsBySeat: selectedModels,
          promptPackSnapshotsBySeat: {
            player1: "selfplay_agent_prompt",
            player2: "selfplay_agent_prompt",
          },
        },
        requireTerminal: true,
      });
      const directory = path.join(dataDirectory, "training");
      await mkdir(directory, { recursive: true, mode: 0o700 });
      const files = {
        trajectory: "training/trajectory.json",
        ndjson: "training/trajectory.ndjson",
        muzero: "training/trajectory.muzero.json",
        rlds: "training/trajectory.rlds.json",
        audit: "training/leak-audit.json",
        eligibility: "training/eligibility.json",
        roundTrips: "training/round-trips.json",
        postgameReviewEpisode: "training/postgame-review-episode.json",
        summary: "training/summary.json",
      };
      await Promise.all([
        writeFile(path.join(dataDirectory, files.trajectory),
          `${JSON.stringify(compiled.trajectory)}\n`, { mode: 0o600 }),
        writeFile(path.join(dataDirectory, files.ndjson),
          compiled.exports.ndjson, { mode: 0o600 }),
        writeFile(path.join(dataDirectory, files.muzero),
          `${JSON.stringify(compiled.exports.muzero)}\n`, { mode: 0o600 }),
        writeFile(path.join(dataDirectory, files.rlds),
          `${JSON.stringify(compiled.exports.rlds)}\n`, { mode: 0o600 }),
        writeFile(path.join(dataDirectory, files.audit),
          `${JSON.stringify(compiled.audit, null, 2)}\n`, { mode: 0o600 }),
        writeFile(path.join(dataDirectory, files.eligibility),
          `${JSON.stringify(compiled.eligibility, null, 2)}\n`, { mode: 0o600 }),
        writeFile(path.join(dataDirectory, files.roundTrips),
          `${JSON.stringify(compiled.roundTrips, null, 2)}\n`, { mode: 0o600 }),
        writeFile(path.join(dataDirectory, files.postgameReviewEpisode),
          `${JSON.stringify(compiled.reviewEpisode, null, 2)}\n`, { mode: 0o600 }),
      ]);
      evolutionExportSummary = {
        ...compiled.summary,
        files,
      };
      await writeFile(path.join(dataDirectory, files.summary),
        `${JSON.stringify(evolutionExportSummary, null, 2)}\n`, { mode: 0o600 });
      return evolutionExportSummary;
    })();
    try {
      return await evolutionExportPromise;
    } catch (error) {
      evolutionExportPromise = null;
      throw error;
    }
  }

  async function completePendingPhysicalTasks() {
    const runtimes = { player1: fixture.player1Runtime,
      player2: fixture.botRuntime };
    for (const seatKey of SEATS) {
      const read = await runtimes[seatKey].read({
        scope: seatKey === "player1" ? fixture.player1Scope : fixture.botScope,
      });
      for (const task of read?.projection?.physicalOperation?.tasks || []) {
        if (task.status !== "pending_human") continue;
        await runtimes[seatKey].delegatePhysicalTask({
          scope: seatKey === "player1" ? fixture.player1Scope : fixture.botScope,
          taskId: task.taskId,
        });
      }
    }
  }

  async function driveOne() {
    const before = await fixture.orchestrator.read();
    let result = before;
    if (before.status === "paused") {
      result = await fixture.orchestrator.resume({
        maxAdditionalActions: 1, pauseAfterAppliedActions: 1,
      });
    } else if (before.status === "running") {
      result = await fixture.orchestrator.run({
        maxAdditionalActions: 1, pauseAfterAppliedActions: 1,
      });
    }
    await completePendingPhysicalTasks();
    if (result.status === "completed" && !providerMatchesFinalized) {
      providerMatchesFinalized = true;
      await Promise.all(SEATS.map((seatKey) =>
        providerStacks[seatKey].finalizeMatch()));
    }
    if (result.status === "completed") {
      await writeTerminalEvolutionArtifacts(result);
    }
    return result;
  }

  function publicDriveJob() {
    if (!driveJob) return null;
    return {
      schemaVersion: "ticket23_slice248_async_drive_job_v1",
      jobId: driveJob.jobId,
      status: driveJob.status,
      requestedAt: driveJob.requestedAt,
      startedAt: driveJob.startedAt,
      completedAt: driveJob.completedAt,
      result: driveJob.result,
      failure: driveJob.failure,
      trainingTruth: false,
    };
  }

  function queueDrive() {
    if (driveJob?.status === "queued" || driveJob?.status === "running") {
      return publicDriveJob();
    }
    driveJobSequence += 1;
    driveJob = {
      jobId: `slice248-drive-${String(driveJobSequence).padStart(4, "0")}`,
      status: "queued",
      requestedAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      result: null,
      failure: null,
    };
    setImmediate(async () => {
      driveJob.status = "running";
      driveJob.startedAt = new Date().toISOString();
      try {
        const result = await driveOne();
        driveJob.result = {
          status: result.status,
          appliedActionCount: result.appliedActionCount,
          failureAccounting: result.failureAccounting,
        };
        driveJob.status = "completed";
      } catch (error) {
        driveJob.failure = {
          code: String(error?.code || error?.name || "SLICE248_DRIVE_FAILED"),
          message: String(error?.message || error),
          severity: String(error?.severity || "High"),
        };
        driveJob.status = "failed";
      } finally {
        driveJob.completedAt = new Date().toISOString();
      }
    });
    return publicDriveJob();
  }

  async function buildManifest() {
    const roomRead = await fixture.roomRuntime.readRoom({ roomId });
    const seatReads = {
      player1: await fixture.player1Runtime.read({ scope: fixture.player1Scope }),
      player2: await fixture.botRuntime.read({ scope: fixture.botScope }),
    };
    const providerReads = {
      player1: await providerStacks.player1.decisionPort.read({
        scope: fixture.player1Scope,
      }),
      player2: await providerStacks.player2.decisionPort.read({
        scope: fixture.botScope,
      }),
    };
    const providers = Object.fromEntries(SEATS.map((seatKey) => [seatKey,
      compactProviderProjection(providerReads[seatKey]?.projection || {})]));
    const recentAcceptedTransitions = (await fixture.roomRuntime.roomStore
      .readJournal(roomId, "public", 0))
      .filter((entry) => entry.payload?.type === "accepted_transition")
      .map((entry) => entry.payload.payload).slice(-64);
    const state = roomRead.projection.state || {};
    return {
      schemaVersion: "ticket23_slice248_standard_2000_aa_live_manifest_v1",
      roomId,
      room: roomRead.projection.room,
      state: {
        round: state.round ?? null,
        phase: state.phase ?? null,
        activeSideKey: state.activeSideKey ?? null,
        terminal: state.terminal === true,
        gameOver: state.gameOver === true,
        winner: state.winner || "",
        terminalReason: state.terminalReason || "",
        scores: state.scores || null,
      },
      map: state.board?.battlefieldMapManifest ? {
        ...state.board.battlefieldMapManifest,
        roomFreezeSummary: state.board.competitiveMapRoomFreezeSummary || null,
      } : null,
      coverage: fixture.coverage,
      orchestrator: ((orchestrator) => ({
        status: orchestrator.status || null,
        experimentCell: orchestrator.experimentCell || null,
        failureAccounting: orchestrator.failureAccounting || null,
      }))(await fixture.orchestrator.read()),
      driveJob: publicDriveJob(),
      seats: Object.fromEntries(SEATS.map((seatKey) => [seatKey,
        compactSeatProjection(seatReads[seatKey]?.projection || {})])),
      providers,
      usage: sumUsage(providers),
      selectedModels,
      strategySkillRefsBySeat: fixture.routedSkillRefsBySeat,
      recentAcceptedTransitions,
      isolation: {
        independentScopeKeys:
          fixture.player1Scope.seatKey !== fixture.botScope.seatKey,
        independentBotStores: true,
        independentMatchDecisionJournals: true,
        independentProviderAttemptAndDecisionStores: true,
        independentBudgetLimitCnyMicrosBySeat: {
          player1: 80_000_000, player2: 80_000_000,
        },
        sharedRoomOnly: true,
      },
      promptPackBySeat: {
        player1: "selfplay_agent_prompt", player2: "selfplay_agent_prompt",
      },
      evolutionExport: evolutionExportSummary,
      serviceProcess: {
        pid: process.pid,
        uptimeSeconds: Number(process.uptime().toFixed(3)),
        memoryUsageBytes: process.memoryUsage(),
        resourceUsage: process.resourceUsage(),
      },
      sourceRefreshPerformed: false,
      trainingTruth: false,
    };
  }

  const roomAdapter = createStarcraftTmgLevel3HttpAdapter({
    roomRuntime: fixture.roomRuntime,
    assetRoot: ROOT,
    mapConfigurationPort: createOfficialCompetitiveMapConfiguratorV1(),
  });
  const server = http.createServer(async (request, response) => {
    try {
      const origin = `http://${request.headers.host || "127.0.0.1"}`;
      const url = new URL(request.url || "/", origin);
      const hasBody = ["POST", "PUT", "PATCH"].includes(
        request.method || "GET");
      const requestBody = hasBody ? await readRequestBody(request)
        : { rawBody: Buffer.alloc(0), body: {}, bodyBytes: 0 };
      if (url.pathname === "/__ticket23/a2a/drive") {
        if (request.method !== "POST") {
          sendJson(response, 405, { ok: false, reason: "METHOD_NOT_ALLOWED" });
          return;
        }
        if (!authorizeRunner(request, runnerToken)) {
          sendJson(response, 403, { ok: false,
            reason: "RUNNER_A2A_DRIVE_FORBIDDEN" });
          return;
        }
        const job = queueDrive({
          retry: retryProviderOnResume || requestBody.body.retry === true,
        });
        sendJson(response, 202, { ok: true, job });
        return;
      }
      if (url.pathname === "/__ticket23/a2a/drive-status") {
        if (request.method !== "GET") {
          sendJson(response, 405, { ok: false, reason: "METHOD_NOT_ALLOWED" });
          return;
        }
        if (!authorizeRunner(request, runnerToken)) {
          sendJson(response, 403, { ok: false,
            reason: "RUNNER_A2A_DRIVE_STATUS_FORBIDDEN" });
          return;
        }
        sendJson(response, 200, { ok: true, job: publicDriveJob() });
        return;
      }
      if (url.pathname === "/__ticket23/a2a/manifest") {
        sendJson(response, 200, await buildManifest());
        return;
      }
      if (url.pathname.startsWith(STARCRAFT_TMG_LEVEL3_API_PREFIX)
        || url.pathname.startsWith(
          "/starcraft-tmg-level3/assets/v1/character/")) {
        const result = await roomAdapter.handle({
          method: request.method, pathname: url.pathname,
          query: url.searchParams, headers: request.headers, ...requestBody,
        });
        if (result.binary) {
          response.writeHead(result.status, result.headers);
          response.end(result.body);
        } else sendJson(response, result.status, result.response);
        return;
      }
      const botMatch = url.pathname.match(new RegExp(
        `^${STARCRAFT_TMG_HOSTED_BOT_SEAT_API_PREFIX}/rooms/([^/]+)$`, "u"));
      if (botMatch) {
        const requestedRoomId = decodeURIComponent(botMatch[1]);
        if (request.method !== "GET" || requestedRoomId !== roomId) {
          sendJson(response, request.method === "GET" ? 404 : 405, {
            schemaVersion: STARCRAFT_TMG_HOSTED_BOT_SEAT_HTTP_VERSION,
            result: { ok: false, reason: request.method === "GET"
              ? "BOT_SEAT_NOT_FOUND" : "METHOD_NOT_ALLOWED" },
          });
          return;
        }
        const result = await fixture.botRuntime.read({ scope: fixture.botScope });
        sendJson(response, 200, {
          schemaVersion: STARCRAFT_TMG_HOSTED_BOT_SEAT_HTTP_VERSION,
          result,
        });
        return;
      }
      if (await serveFile(response, staticCandidate(url.pathname))) return;
      const body = Buffer.from("Not found", "utf8");
      response.writeHead(404, { "content-length": String(body.byteLength),
        "content-type": "text/plain; charset=utf-8" });
      response.end(body);
    } catch (error) {
      sendJson(response, error?.message === "PAYLOAD_TOO_LARGE" ? 413 : 500, {
        ok: false, error: error instanceof Error ? error.message : String(error),
      });
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address !== "object") {
    throw new Error("SLICE248_SERVER_LISTEN_FAILED");
  }
  const origin = `http://127.0.0.1:${address.port}`;
  const startupProviderReads = await Promise.all(SEATS.map((seatKey) => (
    providerStacks[seatKey].decisionPort.read({
      scope: seatKey === "player1" ? fixture.player1Scope : fixture.botScope,
    })
  )));
  const startupUsage = sumUsage(Object.fromEntries(SEATS.map(
    (seatKey, index) => [seatKey,
      startupProviderReads[index]?.projection || null],
  )));
  process.stdout.write(`${JSON.stringify({
    schemaVersion: "ticket23_slice248_standard_2000_aa_live_entry_v1",
    origin,
    url: `${origin}/room/${encodeURIComponent(roomId)}`,
    productSurface: "starcraft_tmg_expo_web_public_observer",
    roomId,
    runnerToken,
    dataDirectory,
    selectedModels,
    budgetLimitCny: 160,
    providerCalls: startupUsage.providerCalls,
    totalUnits: startupUsage.totalUnits,
    costCny: startupUsage.estimatedCostCnyMicros / 1_000_000,
    resumed: Boolean(requestedResumeDirectory),
  })}\n`);
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    try { await fixture.player1Runtime.close(); } catch {}
    try { await fixture.botRuntime.close(); } catch {}
    for (const seatKey of SEATS) {
      try { await providerStacks[seatKey].close(); } catch {}
      try { memoryJournals[seatKey].close(); } catch {}
      try { botStores[seatKey].close(); } catch {}
    }
    try { roomStore.close(); } catch {}
    server.close(() => process.exit(0));
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
