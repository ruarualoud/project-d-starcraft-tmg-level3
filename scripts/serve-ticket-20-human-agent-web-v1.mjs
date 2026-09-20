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
import { createTicket20HumanAgentDemoFixtureV1 } from
  "./support/ticket20-human-agent-demo-fixture-v1.mjs";
import { createTicket20LearningConsoleFixtureV1 } from
  "./support/ticket20-learning-console-fixture-v1.mjs";
import { createStarcraftTmgLiveOpponentProviderStackV1 } from
  "../packages/online-agent-session/live-opponent-provider-stack-v1.mjs";
import { createOfficialCompetitiveMapConfiguratorV1 } from
  "../packages/product-composition/official-competitive-map-configurator-v1.mjs";
import { createStarcraftTmgRefereeCrypto } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { createSqliteStarcraftTmgRoomStore } from
  "../packages/room-store/sqlite-room-store-v1.mjs";
import { createSqliteStarcraftTmgHostedBotSeatStoreV1 } from
  "../packages/online-agent-session/sqlite-hosted-bot-seat-store-v1.mjs";
import { createSqliteStarcraftTmgMatchDecisionJournalV1 } from
  "../packages/online-agent-session/sqlite-match-decision-journal-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEVELOPMENT_ROOM_ID = "ticket23-standard-2000-web";
const VERIFIED_PRODUCT_WEB_ROOT = path.join(ROOT,
  "build/ticket-14-slice-136-web-static-v1/export-acceptance");
const CURRENT_PRODUCT_WEB_ROOT = path.join(ROOT, "apps/starcraft-tmg-expo/dist");
const PRODUCT_WEB_ROOT = existsSync(CURRENT_PRODUCT_WEB_ROOT)
  ? CURRENT_PRODUCT_WEB_ROOT
  : VERIFIED_PRODUCT_WEB_ROOT;
const BATTLE_LAB_ROOT = path.join(ROOT, "apps/starcraft-tmg-battle-lab");
const PRODUCT_WEB_DOCUMENTS = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/army", "army.html"],
  ["/match", "match.html"],
  ["/tools", "tools.html"],
  ["/settings", "settings.html"],
  ["/(tabs)", "(tabs)/index.html"],
  ["/(tabs)/army", "(tabs)/army.html"],
  ["/(tabs)/match", "(tabs)/match.html"],
  ["/(tabs)/tools", "(tabs)/tools.html"],
  ["/(tabs)/settings", "(tabs)/settings.html"],
  ["/dev/theme-lab", "dev/theme-lab.html"],
]);
const MAX_BODY_BYTES = 256 * 1024;
const MIME_TYPES = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
});
const PUBLIC_BROWSER_CONTENT_MODULES = new Set([
  "official-faq-f3-movement-battlefield-deployment-binding-v1.mjs",
  "official-faq-f4-ability-tactical-keyword-binding-v1.mjs",
]);

function safeFile(root, relativePath) {
  const target = path.resolve(root, relativePath);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) return null;
  return target;
}

function staticCandidate(pathname) {
  if (pathname === "/dev/battle-lab" || pathname === "/dev/battle-lab/") {
    return { root: BATTLE_LAB_ROOT,
      relativePath: "index.html" };
  }
  if (pathname.startsWith("/dev/battle-lab/")) {
    return {
      root: BATTLE_LAB_ROOT,
      relativePath: pathname.slice("/dev/battle-lab/".length)
        || "index.html",
    };
  }
  if (pathname.startsWith("/packages/")) {
    return { root: path.join(ROOT, "packages"),
      relativePath: pathname.slice("/packages/".length) };
  }
  if (pathname.startsWith("/content/")) {
    const relativePath = pathname.slice("/content/".length);
    if (!PUBLIC_BROWSER_CONTENT_MODULES.has(relativePath)) return null;
    return { root: path.join(ROOT, "content"), relativePath };
  }
  if (pathname.startsWith("/assets/client/")) {
    return { root: path.join(ROOT, "assets/client"),
      relativePath: pathname.slice("/assets/client/".length) };
  }
  if (PRODUCT_WEB_DOCUMENTS.has(pathname)) {
    return {
      root: PRODUCT_WEB_ROOT,
      relativePath: PRODUCT_WEB_DOCUMENTS.get(pathname),
    };
  }
  if (pathname === "/room" || pathname.startsWith("/room/")) {
    return { root: PRODUCT_WEB_ROOT, relativePath: "room/[roomId].html" };
  }
  return {
    root: PRODUCT_WEB_ROOT,
    relativePath: pathname.replace(/^\/+/, ""),
  };
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
  let body = {};
  if (rawBody.byteLength) body = JSON.parse(rawBody.toString("utf8"));
  return { rawBody, body, bodyBytes: rawBody.byteLength };
}

async function main() {
  const liveMode = process.argv.includes("--live");
  const evidenceProfileArgument = process.argv.find((entry) =>
    entry.startsWith("--evidence-profile="));
  const evidenceProfile = evidenceProfileArgument
    ?.slice("--evidence-profile=".length) || "ticket23-slice247";
  if (!new Set(["ticket23-slice247", "ticket24-slice258"])
    .has(evidenceProfile)) {
    throw new Error("LIVE_EVIDENCE_PROFILE_INVALID");
  }
  const liveRoot = path.join(ROOT, evidenceProfile === "ticket24-slice258"
    ? "build/ticket-24-slice-258-standard-2000-ha-map-v1"
    : "build/ticket-23-slice-247-standard-2000-ha-live-v1");
  const resumeArgument = process.argv.find((entry) =>
    entry.startsWith("--resume-directory="));
  const retryProviderOnResume = process.argv.includes(
    "--retry-provider-on-resume");
  const requestedResumeDirectory = resumeArgument
    ? path.resolve(resumeArgument.slice("--resume-directory=".length)) : null;
  if (requestedResumeDirectory
    && requestedResumeDirectory !== liveRoot
    && !requestedResumeDirectory.startsWith(`${liveRoot}${path.sep}`)) {
    throw new Error("SLICE247_RESUME_DIRECTORY_OUTSIDE_LIVE_ROOT");
  }
  const runnerRulesQueryToken = liveMode
    ? randomBytes(32).toString("base64url") : null;
  const liveRunId = requestedResumeDirectory
    ? path.basename(requestedResumeDirectory)
    : new Date().toISOString().replace(/[^0-9]/gu, "");
  const liveDataDirectory = requestedResumeDirectory
    || path.join(liveRoot, liveRunId);
  let privateState = null;
  if (requestedResumeDirectory) {
    privateState = JSON.parse(await readFile(
      path.join(liveDataDirectory, "runner-private.json"), "utf8"));
    if (!privateState?.roomId || !privateState?.resumeCredentials?.human?.seatToken
      || !privateState?.resumeCredentials?.bot?.seatToken) {
      throw new Error("SLICE247_RESUME_CREDENTIALS_UNAVAILABLE");
    }
  }
  const roomId = liveMode
    ? privateState?.roomId || `${evidenceProfile === "ticket24-slice258"
      ? "ticket24-slice258-ha-map" : "ticket23-slice247-ha"}-${liveRunId}`
    : DEVELOPMENT_ROOM_ID;
  let roomStore = null;
  let botStore = null;
  let matchDecisionJournal = null;
  let providerStack = null;
  let providerDecisionPort = null;
  const deferredDecisionPort = Object.freeze({
    async decide(input) {
      if (!providerDecisionPort) return {
        ok: false,
        reason: "LIVE_OPPONENT_PROVIDER_NOT_READY",
        findingSeverity: "High",
        trainingTruth: false,
      };
      return providerDecisionPort.decide(input);
    },
  });
  let refereeCrypto = null;
  if (liveMode) {
    await mkdir(liveDataDirectory, { recursive: true, mode: 0o700 });
    if (!privateState) {
      const keyPair = generateKeyPairSync("ed25519");
      privateState = {
        schema: "ticket23_slice247_live_server_private_state_v2",
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
        credentialMaterialStored: "development_room_seat_tokens_only_mode_0600",
        apiCredentialStored: false,
        trainingTruth: false,
      };
      await writeFile(path.join(liveDataDirectory, "runner-private.json"),
        `${JSON.stringify(privateState, null, 2)}\n`, {
          encoding: "utf8", mode: 0o600,
        });
    }
    refereeCrypto = createStarcraftTmgRefereeCrypto({
      privateKey: privateState.refereePrivateKeyPem,
      publicKey: privateState.refereePublicKeyPem,
      hmacSecret: privateState.refereeHmacSecret,
      keyId: `ticket23-slice247-referee-${liveRunId}`,
      trustLevel: "development_persistent",
    });
    const privatePayloadCodec = createStarcraftTmgPrivatePayloadCodec({
      key: privateState.storeEncryptionKeyBase64,
      keyId: `ticket23-slice247-room-store-${liveRunId}`,
      trustLevel: "development_persistent",
    });
    roomStore = createSqliteStarcraftTmgRoomStore({
      filename: path.join(liveDataDirectory, "room.sqlite"),
      privatePayloadCodec,
    });
    await mkdir(path.join(liveDataDirectory, "provider"), {
      recursive: true, mode: 0o700,
    });
    botStore = createSqliteStarcraftTmgHostedBotSeatStoreV1({
      filename: path.join(liveDataDirectory, "provider", "bot-seat.sqlite"),
    });
    matchDecisionJournal = createSqliteStarcraftTmgMatchDecisionJournalV1({
      filename: path.join(liveDataDirectory, "provider", "match-memory.sqlite"),
    });
  }
  const fixture = await createTicket20HumanAgentDemoFixtureV1({
    root: ROOT,
    roomId,
    roomProfile: liveMode ? "standard_2000_live" : "standard_2000",
    mapConfiguration: liveMode && evidenceProfile === "ticket24-slice258" ? {
      seedId: "sc1_lost_temple_v1",
      elementSelections: [],
      passageSelections: [],
    } : null,
    autoDrive: !liveMode,
    attachBot: !liveMode,
    // Live acceptance captures the Web surface after every authoritative
    // machine Apply. This is an observability window, not human approval.
    autoDriveIntervalMs: liveMode ? 2_500 : 500,
    enableSpatialPreexecution: liveMode,
    ...(liveMode ? {
      physicalAgentPort: {
        async execute(task) {
          return {
            completed: true,
            evidenceRefs: [
              `web-virtual-table:${task.taskId}:authoritative-projection`,
            ],
          };
        },
      },
    } : {}),
    ...(liveMode ? {
      botDecisionPort: deferredDecisionPort,
      roomStore,
      botStore,
      matchDecisionJournal,
      resumeRoom: Boolean(requestedResumeDirectory),
      resumeCredentials: privateState?.resumeCredentials || null,
      refereeCrypto,
    } : {}),
  });
  if (liveMode && !requestedResumeDirectory) {
    privateState.resumeCredentials = {
      human: { seatToken: fixture.createdRoom.credentials.human.seatToken },
      bot: { seatToken: fixture.createdRoom.credentials.bot.seatToken },
    };
    await writeFile(path.join(liveDataDirectory, "runner-private.json"),
      `${JSON.stringify(privateState, null, 2)}\n`, {
        encoding: "utf8", mode: 0o600,
      });
  }
  if (liveMode) {
    providerStack = await createStarcraftTmgLiveOpponentProviderStackV1({
      roomId: fixture.roomId,
      seatKey: "player2",
      matchBinding: fixture.createdRoom.matchBinding,
      spatialQueryPort: fixture.spatialRuntime,
      memoryQueryPort: fixture.continuity,
      strategyEntries: fixture.strategySkillEntries,
      ownFaction: "tactical_cards:zerg_swarm",
      opponentFaction: "tactical_cards:terran_armed_forces",
      dataDirectory: path.join(liveDataDirectory, "provider"),
      matchMode: "user_vs_agent",
      budgetLimitCnyMicros: 80_000_000,
      maxProviderCalls: 1_024,
    });
    providerDecisionPort = providerStack.decisionPort;
    const attached = await fixture.botRuntime.attach({
      scope: fixture.botScope,
      seatToken: fixture.createdRoom.credentials.bot.seatToken,
      automationConsent: {
        approved: true,
        approvedBy: "human",
        scope: "current_match_bot_seat",
        approvedAt: new Date().toISOString(),
      },
      autoDrive: false,
    });
    if (attached?.ok !== true) {
      throw new Error(attached?.reason || "LIVE_OPPONENT_ATTACH_FAILED");
    }
  }
  const roomAdapter = createStarcraftTmgLevel3HttpAdapter({
    roomRuntime: fixture.roomRuntime,
    assetRoot: ROOT,
    mapConfigurationPort: createOfficialCompetitiveMapConfiguratorV1(),
  });
  const learning = await createTicket20LearningConsoleFixtureV1({
    root: ROOT,
    fixture,
  });
  const server = http.createServer(async (request, response) => {
    try {
      const origin = `http://${request.headers.host || "127.0.0.1"}`;
      const url = new URL(request.url || "/", origin);
      const hasBody = ["POST", "PUT", "PATCH"].includes(
        request.method || "GET");
      const requestBody = hasBody
        ? await readRequestBody(request)
        : { rawBody: Buffer.alloc(0), body: {}, bodyBytes: 0 };
      if (liveMode && url.pathname === "/__ticket23/bot/drive") {
        if (request.method !== "POST") {
          sendJson(response, 405, { ok: false, reason: "METHOD_NOT_ALLOWED" });
          return;
        }
        const provided = String(
          request.headers["x-ticket23-runner-token"] || "");
        const expectedBytes = Buffer.from(runnerRulesQueryToken, "utf8");
        const providedBytes = Buffer.from(provided, "utf8");
        if (providedBytes.byteLength !== expectedBytes.byteLength
          || !timingSafeEqual(providedBytes, expectedBytes)) {
          sendJson(response, 403, {
            ok: false,
            reason: "RUNNER_BOT_DRIVE_FORBIDDEN",
          });
          return;
        }
        let result = null;
        for (let step = 0; step < 4; step += 1) {
          result = await fixture.botRuntime.drive({
            scope: fixture.botScope,
            retry: retryProviderOnResume || requestBody.body.retry === true,
          });
          if (!["turn_handoff_observation_window",
            "preexecution_search_started"].includes(result?.outcome)) break;
        }
        // The runner reads the authoritative manifest immediately after this
        // response. Keep the drive acknowledgement bounded instead of
        // serializing the Bot projection and recent trace history twice; a
        // large failure projection must not turn a settled Provider error into
        // an HTTP connection loss.
        sendJson(response, 200, { ok: result?.ok === true, result: {
          ok: result?.ok === true,
          outcome: result?.outcome || null,
          reason: result?.reason || null,
          findingSeverity: result?.findingSeverity || null,
        } });
        return;
      }
      if (liveMode && url.pathname
        === "/__ticket23/rules-query/first-legal-parameterized") {
        if (request.method !== "POST") {
          sendJson(response, 405, { ok: false, reason: "METHOD_NOT_ALLOWED" });
          return;
        }
        const provided = String(
          request.headers["x-ticket23-runner-token"] || "");
        const expectedBytes = Buffer.from(runnerRulesQueryToken, "utf8");
        const providedBytes = Buffer.from(provided, "utf8");
        if (providedBytes.byteLength !== expectedBytes.byteLength
          || !timingSafeEqual(providedBytes, expectedBytes)) {
          sendJson(response, 403, {
            ok: false,
            reason: "RUNNER_RULES_QUERY_FORBIDDEN",
          });
          return;
        }
        const result = await fixture.humanSpatialRulesQuery.queryFirstExact(
          requestBody.body,
        );
        sendJson(response, 200, { ok: true, result });
        return;
      }
      if (url.pathname.startsWith(STARCRAFT_TMG_LEVEL3_API_PREFIX)
        || url.pathname.startsWith(
          "/starcraft-tmg-level3/assets/v1/character/")) {
        const result = await roomAdapter.handle({
          method: request.method,
          pathname: url.pathname,
          query: url.searchParams,
          headers: request.headers,
          ...requestBody,
        });
        if (result.binary) {
          response.writeHead(result.status, result.headers);
          response.end(result.body);
        } else {
          sendJson(response, result.status, result.response);
        }
        return;
      }
      const botMatch = url.pathname.match(new RegExp(
        `^${STARCRAFT_TMG_HOSTED_BOT_SEAT_API_PREFIX}/rooms/([^/]+)(?:/physical-tasks/([^/]+)/(delegate|complete|dispute))?$`, "u"));
      if (botMatch) {
        const roomId = decodeURIComponent(botMatch[1]);
        const taskId = botMatch[2] ? decodeURIComponent(botMatch[2]) : null;
        const operation = botMatch[3] || null;
        if (roomId !== fixture.roomId) {
          sendJson(response, 404, {
            schemaVersion: STARCRAFT_TMG_HOSTED_BOT_SEAT_HTTP_VERSION,
            result: { ok: false, reason: "BOT_SEAT_NOT_FOUND" },
          });
          return;
        }
        if (!taskId && request.method !== "GET") {
          sendJson(response, 405, {
            schemaVersion: STARCRAFT_TMG_HOSTED_BOT_SEAT_HTTP_VERSION,
            result: { ok: false, reason: "METHOD_NOT_ALLOWED" },
          });
          return;
        }
        if (taskId && request.method !== "POST") {
          sendJson(response, 405, {
            schemaVersion: STARCRAFT_TMG_HOSTED_BOT_SEAT_HTTP_VERSION,
            result: { ok: false, reason: "METHOD_NOT_ALLOWED" },
          });
          return;
        }
        let result;
        if (operation === "delegate") {
          result = await fixture.botRuntime.delegatePhysicalTask({
            scope: fixture.botScope,
            taskId,
          });
        } else if (operation === "complete") {
          result = await fixture.botRuntime.completePhysicalTask({
            scope: fixture.botScope,
            taskId,
            completedBy: requestBody.body.completedBy === "agent" ? "agent" : "human",
            evidenceRefs: Array.isArray(requestBody.body.evidenceRefs)
              ? requestBody.body.evidenceRefs : [],
          });
        } else if (operation === "dispute") {
          result = await fixture.botRuntime.openRulesDispute({
            scope: fixture.botScope,
            taskId,
            reason: String(requestBody.body.reason || "Web user requested rules review"),
          });
        } else {
          result = await fixture.botRuntime.read({ scope: fixture.botScope });
        }
        if (result?.projection) {
          result = { ...result, projection: {
            ...result.projection,
            notifications: fixture.notifications.slice(-32),
          } };
        }
        sendJson(response, result.ok ? 200 : 404, {
          schemaVersion: STARCRAFT_TMG_HOSTED_BOT_SEAT_HTTP_VERSION,
          result,
        });
        return;
      }
      if (url.pathname === "/__ticket20/manifest") {
        const roomRead = await fixture.roomRuntime.readRoom({
          roomId: fixture.roomId,
        });
        const recentAcceptedTransitions = (await fixture.roomRuntime.roomStore
          .readJournal(fixture.roomId, "public", 0))
          .filter((entryValue) =>
            entryValue.payload?.type === "accepted_transition")
          .map((entryValue) => entryValue.payload.payload)
          .slice(-32);
        const botRead = await fixture.botRuntime.read({ scope: fixture.botScope });
        const providerRead = providerStack
          ? await providerStack.decisionPort.read({ scope: fixture.botScope })
          : null;
        sendJson(response, 200, {
          schemaVersion: liveMode
            ? "ticket23_slice247_standard_2000_live_web_manifest_v1"
            : "ticket23_slice245_standard_2000_web_manifest_v1",
          roomId: fixture.roomId,
          room: roomRead.projection.room,
          state: {
            round: roomRead.projection.state?.round ?? null,
            phase: roomRead.projection.state?.phase ?? null,
            activeSideKey: roomRead.projection.state?.activeSideKey ?? null,
            terminal: roomRead.projection.state?.terminal === true,
            gameOver: roomRead.projection.state?.gameOver === true,
            winner: roomRead.projection.state?.winner || "",
            terminalReason:
              roomRead.projection.state?.terminalReason || "",
            scores: roomRead.projection.state?.scores || null,
          },
          map: roomRead.projection.state?.board?.battlefieldMapManifest
            ? {
              ...roomRead.projection.state.board.battlefieldMapManifest,
              roomFreezeSummary:
                roomRead.projection.state.board
                  .competitiveMapRoomFreezeSummary || null,
            }
            : null,
          bot: botRead.projection,
          notifications: fixture.notifications.slice(-32),
          recentAcceptedTransitions,
          coverage: fixture.coverage,
          strategySkillRefs: fixture.strategySkillRefs,
          liveMode,
          provider: providerRead?.projection || null,
          providerCalls: providerRead?.projection?.usage?.providerCalls || 0,
          paidProviderUsed:
            Number(providerRead?.projection?.usage?.totalUnits || 0) > 0,
          trainingTruth: false,
        });
        return;
      }
      if (url.pathname === "/__ticket20/learning") {
        if (request.method !== "GET") {
          sendJson(response, 405, { ok: false, reason: "METHOD_NOT_ALLOWED" });
          return;
        }
        sendJson(response, 200, { ok: true, projection: await learning.read() });
        return;
      }
      if (url.pathname === "/__ticket20/learning/reflection") {
        if (request.method !== "POST") {
          sendJson(response, 405, { ok: false, reason: "METHOD_NOT_ALLOWED" });
          return;
        }
        const result = await learning.triggerReflection();
        sendJson(response, 200, { ok: true, result,
          projection: await learning.read() });
        return;
      }
      if (url.pathname === "/__ticket20/learning/freshness-preview") {
        if (request.method !== "POST") {
          sendJson(response, 405, { ok: false, reason: "METHOD_NOT_ALLOWED" });
          return;
        }
        const result = learning.previewFreshness();
        sendJson(response, 200, { ok: true, result,
          projection: await learning.read() });
        return;
      }
      if (await serveFile(response, staticCandidate(url.pathname))) return;
      const body = Buffer.from("Not found", "utf8");
      response.writeHead(404, {
        "content-length": String(body.byteLength),
        "content-type": "text/plain; charset=utf-8",
      });
      response.end(body);
    } catch (error) {
      sendJson(response, error?.message === "PAYLOAD_TOO_LARGE" ? 413 : 500, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address !== "object") {
    throw new Error("TICKET20_DEMO_LISTEN_FAILED");
  }
  const origin = `http://127.0.0.1:${address.port}`;
  process.stdout.write(`${JSON.stringify({
    schemaVersion: liveMode
      ? "ticket23_slice247_standard_2000_live_web_entry_v1"
      : "ticket23_slice245_standard_2000_web_entry_v1",
    origin,
    url: `${origin}/room/${encodeURIComponent(fixture.roomId)}#recovery=${encodeURIComponent(fixture.humanRecoveryToken)}`,
    productSurface: "starcraft_tmg_expo_web",
    diagnosticUrl: `${origin}/dev/battle-lab/?room=${encodeURIComponent(fixture.roomId)}`,
    roomId: fixture.roomId,
    humanSeat: "player1",
    runnerRulesQueryToken,
    botSeat: "player2",
    humanSeatToken: fixture.createdRoom.credentials.human.seatToken,
    botCredentialExposed: false,
    currentOfficialSourceBinding: fixture.sourceBinding,
    coverage: fixture.coverage,
    liveMode,
    liveDataDirectory: liveMode ? liveDataDirectory : null,
    providerModel: providerStack?.selectedProfile?.model || null,
    evidenceProfile,
    providerCalls: 0,
    costCny: 0,
    resumed: Boolean(requestedResumeDirectory),
  })}\n`);
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    try { await fixture.botRuntime.close(); } catch {}
    try { await providerStack?.close(); } catch {}
    try { matchDecisionJournal?.close(); } catch {}
    try { botStore?.close(); } catch {}
    try { roomStore?.close(); } catch {}
    server.close(() => process.exit(0));
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
