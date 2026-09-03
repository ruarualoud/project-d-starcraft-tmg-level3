#!/usr/bin/env node

import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createStarcraftTmgAuthoritativeEngine,
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/transition-v1.mjs";
import {
  createStarcraftTmgLevel3HttpAdapter,
  STARCRAFT_TMG_LEVEL3_API_PREFIX,
} from "../packages/http-adapter/handler-v1.mjs";
import { createStarcraftTmgRoomRuntime } from
  "../packages/room-runtime/in-memory-room-v1.mjs";
import {
  createStarcraftTmgSampleState,
  loadStarcraftTmgData,
} from "../../scripts/starcraft-tmg-rules-v0.mjs";
import { projectRotatedBaseBoundsV1 } from
  "../packages/client-domain/battlefield-presentation-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_ROOT = path.resolve(ROOT, "..");
const MODE = process.argv.includes("--production") ? "production" : "acceptance";
const EXPORT_ROOT = path.join(
  ROOT,
  "build/ticket-14-slice-136-web-static-v1",
  MODE === "production" ? "export-production" : "export-acceptance",
);
const OCCURRED_AT = "2026-09-03T08:00:00.000Z";
const ROOM_IDS = Object.freeze({
  productionObserver: "slice136-production-observer",
  desktop: "slice136-desktop",
  tablet: "slice136-tablet",
  mobile: "slice136-mobile",
  battleLab: "slice136-battle-lab",
});

const MIME_TYPES = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
});
const PUBLIC_BROWSER_CONTENT_MODULES = new Set([
  "official-faq-f3-movement-battlefield-deployment-binding-v1.mjs",
  "official-faq-f4-ability-tactical-keyword-binding-v1.mjs",
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function safeFile(root, relativePath) {
  const target = path.resolve(root, relativePath);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) return null;
  return target;
}

function staticCandidate(pathname) {
  if (pathname === "/") return { root: EXPORT_ROOT, relativePath: "index.html" };
  if (pathname === "/room" || pathname.startsWith("/room/")) {
    return { root: EXPORT_ROOT, relativePath: "room/[roomId].html" };
  }
  if (["/army", "/match", "/settings", "/tools"].includes(pathname)) {
    return { root: EXPORT_ROOT, relativePath: `${pathname.slice(1)}.html` };
  }
  if (pathname === "/apps/starcraft-tmg-battle-lab") {
    return { root: path.join(ROOT, "apps/starcraft-tmg-battle-lab"), relativePath: "index.html" };
  }
  if (pathname.startsWith("/apps/starcraft-tmg-battle-lab/")) {
    return {
      root: path.join(ROOT, "apps/starcraft-tmg-battle-lab"),
      relativePath: pathname.slice("/apps/starcraft-tmg-battle-lab/".length) || "index.html",
    };
  }
  if (pathname.startsWith("/packages/")) {
    return { root: path.join(ROOT, "packages"), relativePath: pathname.slice("/packages/".length) };
  }
  if (pathname.startsWith("/content/")) {
    const relativePath = pathname.slice("/content/".length);
    if (!PUBLIC_BROWSER_CONTENT_MODULES.has(relativePath)) return null;
    return { root: path.join(ROOT, "content"), relativePath };
  }
  if (pathname.startsWith("/assets/client/")) {
    return { root: path.join(ROOT, "assets/client"), relativePath: pathname.slice("/assets/client/".length) };
  }
  return { root: EXPORT_ROOT, relativePath: pathname.replace(/^\/+/, "") };
}

async function serveFile(response, descriptor) {
  let target;
  try {
    target = safeFile(descriptor.root, decodeURIComponent(descriptor.relativePath));
  } catch {
    target = null;
  }
  if (!target) return false;
  try {
    const fileStat = await stat(target);
    if (!fileStat.isFile()) return false;
    const body = await readFile(target);
    response.writeHead(200, {
      "cache-control": "no-store, max-age=0",
      "content-length": String(body.byteLength),
      "content-type": MIME_TYPES[path.extname(target).toLowerCase()] || "application/octet-stream",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
    });
    response.end(body);
    return true;
  } catch {
    return false;
  }
}

async function readRequestBody(request) {
  const chunks = [];
  let byteLength = 0;
  for await (const chunk of request) {
    byteLength += chunk.byteLength;
    if (byteLength > 256 * 1024) throw new Error("PAYLOAD_TOO_LARGE");
    chunks.push(chunk);
  }
  const rawBody = Buffer.concat(chunks).toString("utf8");
  return { rawBody, body: rawBody ? JSON.parse(rawBody) : {}, bodyBytes: byteLength };
}

function authorityFor(data, roomId) {
  const state = createStarcraftTmgSampleState(data);
  state.activeSideKey = "player1";
  const formations = [];
  for (const piece of state.pieces || []) {
    const count = Math.max(0, Math.trunc(Number(piece.currentModels || 0)));
    if (!count || Array.isArray(piece.models)) continue;
    const columns = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(count))));
    const rows = Math.ceil(count / columns);
    const baseWidth = Number(piece.baseWidthInches || 1.25);
    const baseDepth = Number(piece.baseDepthInches || baseWidth);
    const stepX = Math.max(baseWidth + 0.2, 1.45);
    const stepY = Math.max(baseDepth + 0.2, 1.45);
    const baseShape = piece.baseShape || "round";
    const baseRotationDegrees = Number(piece.baseRotationDegrees || 0);
    const offsets = Array.from({ length: count }, (_, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      return {
        x: (column - ((columns - 1) / 2)) * stepX,
        y: (row - ((rows - 1) / 2)) * stepY,
      };
    });
    const rotatedBounds = projectRotatedBaseBoundsV1({
      xMilliInches: 0,
      yMilliInches: 0,
      baseShape,
      baseWidthMilliInches: Math.round(baseWidth * 1000),
      baseDepthMilliInches: Math.round(baseDepth * 1000),
      baseRotationDegrees,
    });
    assert(rotatedBounds, `base bounds unavailable for ${piece.id}`);
    const extentX = rotatedBounds.extentXMilliInches / 1000;
    const extentY = rotatedBounds.extentYMilliInches / 1000;
    const minOffsetX = Math.min(...offsets.map((offset) => offset.x - extentX));
    const maxOffsetX = Math.max(...offsets.map((offset) => offset.x + extentX));
    const minOffsetY = Math.min(...offsets.map((offset) => offset.y - extentY));
    const maxOffsetY = Math.max(...offsets.map((offset) => offset.y + extentY));
    formations.push({
      piece,
      offsets,
      baseRotationDegrees,
      minOffsetX,
      maxOffsetX,
      minOffsetY,
      maxOffsetY,
    });
  }

  // Pack each army as a vertical sequence of complete formation bounds. This
  // fixture must demonstrate two independent invariants: every full base is
  // inside the board, and no two model base bounding boxes overlap.
  const baseEdgeSafetyMargin = 0.6;
  const formationGap = 0.6;
  for (const sideKey of [...new Set(formations.map(({ piece }) => piece.sideKey))]) {
    const sideFormations = formations
      .filter(({ piece }) => piece.sideKey === sideKey)
      .sort((left, right) => left.piece.yInches - right.piece.yInches);
    const totalHeight = sideFormations.reduce(
      (sum, formation) => sum + formation.maxOffsetY - formation.minOffsetY,
      Math.max(0, sideFormations.length - 1) * formationGap,
    );
    assert(
      totalHeight <= state.board.heightInches - (2 * baseEdgeSafetyMargin),
      `formation stack exceeds board height for ${sideKey}`,
    );
    let cursorY = (state.board.heightInches - totalHeight) / 2;
    for (const formation of sideFormations) {
      const {
        piece,
        offsets,
        baseRotationDegrees,
        minOffsetX,
        maxOffsetX,
        minOffsetY,
        maxOffsetY,
      } = formation;
      const anchorX = Math.max(baseEdgeSafetyMargin - minOffsetX, Math.min(
        state.board.widthInches - baseEdgeSafetyMargin - maxOffsetX,
        piece.xInches,
      ));
      const anchorY = cursorY - minOffsetY;
      piece.models = offsets.map((offset, index) => ({
        id: `${piece.id}-model-${index + 1}`,
        xInches: anchorX + offset.x,
        yInches: anchorY + offset.y,
        baseRotationDegrees,
        isOnField: true,
        isDestroyed: false,
      }));
      cursorY += maxOffsetY - minOffsetY + formationGap;
    }
  }

  const modelBounds = formations.flatMap(({ piece }) => (piece.models || []).map((model) => {
    const bounds = projectRotatedBaseBoundsV1({
      xMilliInches: Math.round(model.xInches * 1000),
      yMilliInches: Math.round(model.yInches * 1000),
      baseShape: piece.baseShape || "round",
      baseWidthMilliInches: Math.round(Number(piece.baseWidthInches || 1.25) * 1000),
      baseDepthMilliInches: Math.round(
        Number(piece.baseDepthInches || piece.baseWidthInches || 1.25) * 1000,
      ),
      baseRotationDegrees: Number(model.baseRotationDegrees || 0),
    });
    assert(bounds, `fixture base bounds unavailable for ${model.id}`);
    assert(
      bounds.minXMilliInches >= 0
        && bounds.maxXMilliInches <= state.board.widthInches * 1000
        && bounds.minYMilliInches >= 0
        && bounds.maxYMilliInches <= state.board.heightInches * 1000,
      `fixture base edge outside board for ${model.id}`,
    );
    return { id: model.id, bounds };
  }));
  for (let index = 0; index < modelBounds.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < modelBounds.length; otherIndex += 1) {
      const left = modelBounds[index];
      const right = modelBounds[otherIndex];
      const overlap = left.bounds.minXMilliInches < right.bounds.maxXMilliInches
        && left.bounds.maxXMilliInches > right.bounds.minXMilliInches
        && left.bounds.minYMilliInches < right.bounds.maxYMilliInches
        && left.bounds.maxYMilliInches > right.bounds.minYMilliInches;
      assert(!overlap, `fixture model bases overlap:${left.id}:${right.id}`);
    }
  }
  return {
    source: "server_factory",
    state,
    dataVersion: data.version,
    receiptHash: hashStarcraftTmgContract({
      source: "ticket-14-slice-136-browser-acceptance",
      roomId,
      state,
    }),
    serverSeatPlan: [
      { label: "host", seatKey: "player1", roleMode: "player", principalType: "human" },
    ],
  };
}

async function createFixture() {
  const data = await loadStarcraftTmgData(PROJECT_ROOT);
  const engine = createStarcraftTmgAuthoritativeEngine({ now: () => OCCURRED_AT });
  const runtime = createStarcraftTmgRoomRuntime({
    authorityEngine: engine,
    characterReleaseChannel: "development_internal",
    now: () => OCCURRED_AT,
  });
  const credentials = {};
  for (const roomId of Object.values(ROOM_IDS)) {
    const authority = authorityFor(data, roomId);
    const created = await runtime.createRoom({
      roomId,
      gameId: "starcraft-tmg",
      surfaceMode: "classic",
      title: `Ticket 14 browser acceptance · ${roomId}`,
      initialStateAuthority: authority,
      serverSeatPlan: authority.serverSeatPlan,
    });
    assert(created.ok, `FIXTURE_ROOM_CREATE_FAILED:${roomId}:${created.reason || "unknown"}`);
    credentials[roomId] = { seatToken: created.credentials.host.seatToken };
    if ([ROOM_IDS.desktop, ROOM_IDS.tablet, ROOM_IDS.mobile].includes(roomId)) {
      const recovery = await runtime.issueSeatRecovery({
        roomId,
        seatToken: created.credentials.host.seatToken,
        expectedRoomRevision: 0,
      });
      assert(recovery.ok, `FIXTURE_RECOVERY_CREATE_FAILED:${roomId}:${recovery.reason || "unknown"}`);
      credentials[roomId].recoveryToken = recovery.recovery.recoveryToken;
    }
  }
  return {
    adapter: createStarcraftTmgLevel3HttpAdapter({ roomRuntime: runtime, assetRoot: ROOT }),
    credentials,
  };
}

async function main() {
  assert((await stat(EXPORT_ROOT)).isDirectory(), `WEB_EXPORT_MISSING:${MODE}`);
  const fixture = await createFixture();
  const server = http.createServer(async (request, response) => {
    try {
      const origin = `http://${request.headers.host || "127.0.0.1"}`;
      const url = new URL(request.url || "/", origin);
      if (url.pathname.startsWith(STARCRAFT_TMG_LEVEL3_API_PREFIX)
        || url.pathname.startsWith("/starcraft-tmg-level3/assets/v1/character/")) {
        const requestBody = ["POST", "PUT", "PATCH"].includes(request.method || "GET")
          ? await readRequestBody(request)
          : { rawBody: "", body: {}, bodyBytes: 0 };
        const result = await fixture.adapter.handle({
          method: request.method,
          pathname: url.pathname,
          query: url.searchParams,
          headers: request.headers,
          ...requestBody,
        });
        if (result.binary) {
          response.writeHead(result.status, result.headers);
          response.end(result.body);
          return;
        }
        const body = Buffer.from(JSON.stringify(result.response), "utf8");
        response.writeHead(result.status, {
          "cache-control": "no-store, max-age=0",
          "content-length": String(body.byteLength),
          "content-type": "application/json; charset=utf-8",
          "referrer-policy": "no-referrer",
          "x-content-type-options": "nosniff",
        });
        response.end(body);
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
      const body = Buffer.from(JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }), "utf8");
      response.writeHead(500, {
        "content-length": String(body.byteLength),
        "content-type": "application/json; charset=utf-8",
      });
      response.end(body);
    }
  });
  server.on("error", (error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
    process.exitCode = 1;
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(address && typeof address === "object", "FIXTURE_LISTEN_FAILED");
  // This single line is consumed in-process by the verifier. It must never be
  // copied into a report because it contains one-use and seat capabilities.
  process.stdout.write(`${JSON.stringify({
    schemaVersion: "starcraft_tmg_ticket_14_slice_136_browser_fixture_v1",
    mode: MODE,
    origin: `http://127.0.0.1:${address.port}`,
    roomIds: ROOM_IDS,
    credentials: fixture.credentials,
  })}\n`);

  const close = () => server.close(() => process.exit(0));
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
  process.exitCode = 1;
});
