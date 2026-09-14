#!/usr/bin/env node

import http from "node:http";
import { readFile, stat } from "node:fs/promises";
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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOM_ID = "ticket20-human-agent-demo";
const PRODUCT_WEB_ROOT = path.join(ROOT, "apps/starcraft-tmg-expo/dist");
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
  const fixture = await createTicket20HumanAgentDemoFixtureV1({
    root: ROOT,
    roomId: ROOM_ID,
    autoDrive: true,
  });
  const roomAdapter = createStarcraftTmgLevel3HttpAdapter({
    roomRuntime: fixture.roomRuntime,
    assetRoot: ROOT,
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
        `^${STARCRAFT_TMG_HOSTED_BOT_SEAT_API_PREFIX}/rooms/([^/]+)$`, "u"));
      if (botMatch) {
        if (request.method !== "GET") {
          sendJson(response, 405, {
            schemaVersion: STARCRAFT_TMG_HOSTED_BOT_SEAT_HTTP_VERSION,
            result: { ok: false, reason: "METHOD_NOT_ALLOWED" },
          });
          return;
        }
        const roomId = decodeURIComponent(botMatch[1]);
        if (roomId !== fixture.roomId) {
          sendJson(response, 404, {
            schemaVersion: STARCRAFT_TMG_HOSTED_BOT_SEAT_HTTP_VERSION,
            result: { ok: false, reason: "BOT_SEAT_NOT_FOUND" },
          });
          return;
        }
        const result = await fixture.botRuntime.read({ scope: fixture.botScope });
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
        const botRead = await fixture.botRuntime.read({ scope: fixture.botScope });
        sendJson(response, 200, {
          schemaVersion: "ticket20_slice193_human_agent_demo_manifest_v1",
          roomId: fixture.roomId,
          room: roomRead.projection.room,
          bot: botRead.projection,
          coverage: fixture.coverage,
          strategySkillRefs: fixture.strategySkillRefs,
          providerCalls: 0,
          paidProviderUsed: false,
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
    schemaVersion: "ticket20_slice193_human_agent_web_entry_v1",
    origin,
    url: `${origin}/room/${encodeURIComponent(fixture.roomId)}#recovery=${encodeURIComponent(fixture.humanRecoveryToken)}`,
    productSurface: "starcraft_tmg_expo_web",
    diagnosticUrl: `${origin}/dev/battle-lab/?room=${encodeURIComponent(fixture.roomId)}`,
    roomId: fixture.roomId,
    humanSeat: "player1",
    botSeat: "player2",
    humanSeatToken: fixture.createdRoom.credentials.human.seatToken,
    botCredentialExposed: false,
    currentOfficialSourceBinding: fixture.sourceBinding,
    coverage: fixture.coverage,
    providerCalls: 0,
    costCny: 0,
  })}\n`);
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    try { await fixture.botRuntime.close(); } catch {}
    server.close(() => process.exit(0));
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
