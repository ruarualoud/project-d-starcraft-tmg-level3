#!/usr/bin/env node

// Ticket 27 / Slice 271 — standalone roster-planning workspace server.
// Serves the current Expo Web export plus the isolated roster-planning
// workspace API (additive prefix only). The optional explicit
// --enable-room-launch attaches a real, separate authoritative Room process;
// without it no Room mutation route is mounted. Live deliberation is only
// attached with the explicit CLI --enable-roster-flash flag. The
// Keychain→isolated Worker attachment itself makes zero Provider calls; paid
// requests require a subsequent explicit Generate action in the Web UI.

import http from "node:http";
import { mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createRosterPlanningProductModuleV1 } from
  "../packages/product-composition/roster-planning-product-module-v1.mjs";
import { ROSTER_PLANNING_WORKSPACE_API_PREFIX } from
  "../packages/roster-planning-workspace/roster-planning-workspace-http-v1.mjs";
import { createRosterPlanningSecureDeliberationFactoryV1 } from
  "../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs";
import { createTicket27RosterRoomProcessHostV1 } from
  "./support/ticket27-roster-room-process-host-v1.mjs";
import { STARCRAFT_TMG_TICKET_27_ROSTER_TEACH_FLASH_PROFILE_V3 } from
  '../content/provider/ticket-27-roster-teach-provider-profile-v1.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_DATA_DIRECTORY = path.join(ROOT,
  "build/ticket-27-slice-271-roster-workspace-v1/workspace-data");
const MAX_BODY_BYTES = 2 * 1024 * 1024;
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

function safeFile(root, relativePath) {
  const target = path.resolve(root, relativePath);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) return null;
  return target;
}

function staticCandidate(webRoot, pathname) {
  if (pathname.startsWith("/assets/client/")) {
    return { root: path.join(ROOT, "assets/client"),
      relativePath: pathname.slice("/assets/client/".length) };
  }
  if (PRODUCT_WEB_DOCUMENTS.has(pathname)) {
    return { root: webRoot, relativePath: PRODUCT_WEB_DOCUMENTS.get(pathname) };
  }
  if (pathname === "/room" || pathname.startsWith("/room/")) {
    return { root: webRoot, relativePath: "room/[roomId].html" };
  }
  return { root: webRoot, relativePath: pathname.replace(/^\/+/, "") };
}

async function serveFile(response, descriptor) {
  if (!descriptor) return false;
  let filename;
  try {
    filename = safeFile(descriptor.root,
      decodeURIComponent(descriptor.relativePath));
  } catch {
    return false;
  }
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

export async function createRosterWorkspaceServerV1(input = {}) {
  const webRoot = input.webRoot
    || path.join(ROOT, "apps/starcraft-tmg-expo/dist");
  const dataDirectory = input.dataDirectory || DEFAULT_DATA_DIRECTORY;
  await mkdir(dataDirectory, { recursive: true, mode: 0o700 });
  const module = await createRosterPlanningProductModuleV1({
    root: input.root || ROOT,
    fixtureRoot: input.fixtureRoot || input.root || ROOT,
    dataDirectory,
    mapConfiguration: input.mapConfiguration || null,
    deliberationFactory: input.deliberationFactory || null,
    roomLaunchPort: input.roomLaunchPort || null,
    enableIterativeDraft: Boolean(input.deliberationFactory
      && input.mapConfiguration),
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
      if (url.pathname.startsWith(ROSTER_PLANNING_WORKSPACE_API_PREFIX)) {
        const result = await module.handle({
          method: request.method,
          pathname: url.pathname,
          query: url.searchParams,
          headers: request.headers,
          ...requestBody,
        });
        sendJson(response, result.status, result.response);
        return;
      }
      if (await serveFile(response, staticCandidate(webRoot, url.pathname))) {
        return;
      }
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
    throw new Error("ROSTER_WORKSPACE_LISTEN_FAILED");
  }
  const origin = `http://127.0.0.1:${address.port}`;
  return {
    server,
    module,
    origin,
    armyUrl: `${origin}/army`,
    liveDeliberationAttached: Boolean(input.deliberationFactory),
    liveRoomLaunchAttached: Boolean(input.roomLaunchPort),
    async close() {
      await new Promise((resolve) => server.close(resolve));
      await module.closeDecisionWorkflows();
    },
  };
}

async function main() {
  const dataArgument = process.argv.find((entry) => (
    entry.startsWith("--data-directory=")));
  const dataDirectory = dataArgument
    ? path.resolve(dataArgument.slice("--data-directory=".length))
    : DEFAULT_DATA_DIRECTORY;
  const fixtureArgument = process.argv.find((entry) => (
    entry.startsWith("--fixture-root=")));
  const webRootArgument = process.argv.find((entry) => (
    entry.startsWith("--web-root=")));
  const webRoot = webRootArgument
    ? path.resolve(webRootArgument.slice("--web-root=".length))
    : undefined;
  const mapSeedArgument = process.argv.find((entry) => (
    entry.startsWith("--map-seed-id=")));
  const mapConfigurationFileArgument = process.argv.find((entry) => (
    entry.startsWith("--map-configuration-file=")));
  if (mapSeedArgument && mapConfigurationFileArgument) {
    throw new Error("ROSTER_WORKSPACE_MAP_CONFIGURATION_SOURCES_CONFLICT");
  }
  // The reviewed native setup is frozen once, then shared byte-for-byte by
  // the workspace and match host. A seed alone is not its terrain agreement.
  const mapConfiguration = mapConfigurationFileArgument
    ? JSON.parse(await readFile(path.resolve(mapConfigurationFileArgument.slice(
      "--map-configuration-file=".length)), "utf8"))
    : mapSeedArgument ? {
      seedId: mapSeedArgument.slice("--map-seed-id=".length),
      elementSelections: [], passageSelections: [],
    } : null;
  const secureFlashEnabled = process.argv.includes("--enable-roster-flash");
  const roomLaunchEnabled = process.argv.includes("--enable-room-launch");
  const offlineRecovery600s = process.argv.includes('--offline-recovery-600s');
  if (offlineRecovery600s && (roomLaunchEnabled || !secureFlashEnabled)) {
    throw Error('OFFLINE_RECOVERY_REQUIRES_FLASH_WITHOUT_ROOM_LAUNCH');
  }
  const roomInteractionModeArgument = process.argv.find((entry) =>
    entry.startsWith("--room-provider-interaction-mode="));
  const opponentSessionArgument = process.argv.find((entry) =>
    entry.startsWith("--opponent-pregame-roster-session-id="));
  const opponentHashArgument = process.argv.find((entry) =>
    entry.startsWith("--opponent-roster-plan-hash="));
  const opponentDirectoryArgument = process.argv.find((entry) =>
    entry.startsWith("--opponent-roster-plan-data-directory="));
  if (roomLaunchEnabled && !secureFlashEnabled) {
    throw new Error("ROSTER_ROOM_LAUNCH_REQUIRES_LIVE_FLASH");
  }
  const secure = secureFlashEnabled
    ? await createRosterPlanningSecureDeliberationFactoryV1(offlineRecovery600s
      ? { profile: STARCRAFT_TMG_TICKET_27_ROSTER_TEACH_FLASH_PROFILE_V3 } : {}) : null;
  const fixtureRoot = fixtureArgument
    ? path.resolve(fixtureArgument.slice("--fixture-root=".length))
    : ROOT;
  let handle;
  try {
    handle = await createRosterWorkspaceServerV1({
      dataDirectory,
      webRoot,
      fixtureRoot,
      mapConfiguration,
      deliberationFactory: secure?.factory || null,
      roomLaunchPort: roomLaunchEnabled
        ? createTicket27RosterRoomProcessHostV1({ root: ROOT,
          dataDirectory, fixtureRoot, webRoot,
          providerInteractionMode: roomInteractionModeArgument?.slice(
            "--room-provider-interaction-mode=".length) || "native_tools",
          opponentRosterPlanSessionId: opponentSessionArgument?.slice(
            "--opponent-pregame-roster-session-id=".length) || null,
          opponentRosterPlanHash: opponentHashArgument?.slice(
            "--opponent-roster-plan-hash=".length) || null,
          opponentRosterPlanDataDirectory: opponentDirectoryArgument?.slice(
            "--opponent-roster-plan-data-directory=".length) || null,
          autoDriveOnLaunch: !process.argv.includes(
            "--no-auto-drive-on-room-launch"),
        }) : null,
    });
  } catch (error) {
    await secure?.close();
    throw error;
  }
  process.stdout.write(`${JSON.stringify({
    schemaVersion: "ticket27_slice271_roster_workspace_server_entry_v1",
    origin: handle.origin,
    armyUrl: handle.armyUrl,
    apiPrefix: ROSTER_PLANNING_WORKSPACE_API_PREFIX,
    dataDirectory,
    liveDeliberationAttached: handle.liveDeliberationAttached,
    offlineRecovery600s,
    liveRoomLaunchAttached: handle.liveRoomLaunchAttached,
    planningState: handle.liveDeliberationAttached
      ? "available_explicit_generate_only"
      : "unavailable_no_live_deliberation_factory",
    productModule: handle.module.descriptor(),
    trainingTruth: false,
  })}\n`);
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    await handle.close();
    await secure?.close();
    process.exit(0);
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}

if (process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error}\n`);
    process.exitCode = 1;
  });
}
