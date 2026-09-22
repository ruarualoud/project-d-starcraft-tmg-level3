#!/usr/bin/env node

/**
 * Ticket 26 / Slice 266f — the ONE user-authorized live BYOK companion
 * product acceptance (reserved in the 266f closure, now explicitly
 * authorized by the user).
 *
 * Hard rules enforced by this runner:
 *   - exactly ONE physical Provider call, ever, per authorization: a
 *     one-attempt dispatch lock (build/.../one-call-attempt.lock.json,
 *     O_EXCL) is claimed immediately before the single egress dispatch; a
 *     previous lock or a previous passing report refuses any rerun
 *     (ambiguous outcomes need fresh user authorization);
 *   - the credential is read ONLY through the existing macOS Keychain →
 *     isolated-Worker path
 *     (packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs →
 *     provider-egress-worker-port-v1.mjs, the Ticket 16 Slice 162 pattern).
 *     The raw key never enters arguments, prompts, files, logs,
 *     screenshots, stdout/stderr or this process's persisted state: the
 *     Keychain receipt is redacted by construction, the parent buffer is
 *     zeroed by the Worker port's own finally path (asserted here), and the
 *     Worker child holds the key in session memory only until explicit
 *     detach (shutdown acknowledgement requires sensitiveBytesZeroed);
 *   - zero retry: the egress transport itself is physicalAttempts: 1 /
 *     automaticRetries: 0; any 401/402/403, missing attachment or ambiguous
 *     dispatch (requestMayHaveBeenSent) terminates the run immediately;
 *   - the conversation goes through the REAL companion product path (room
 *     runtime → companion product module → session service → provider
 *     gateway) with one companion, one bounded Chinese user prompt, and the
 *     ACTUAL Provider reply is byte-compared against what the Web UI renders
 *     (desktop 1500×1050 and 390×844 touch);
 *   - the report and every artifact are scanned for credential-shaped
 *     material before the run may pass.
 *
 * This runner never modifies Provider infrastructure, never refreshes
 * official data, never mutates the Room (a mutation-counting facade proves
 * it), and never pushes Git.
 */

import { createHash, randomUUID } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import { mkdir, open, readFile, readdir, stat, writeFile } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_D_ROOT = (() => {
  let cursor = ROOT;
  for (let depth = 0; depth < 6; depth += 1) {
    cursor = path.resolve(cursor, "..");
    if (existsSync(path.join(cursor, "scripts/starcraft-tmg-rules-v0.mjs"))
      && existsSync(path.join(cursor, "starcraft-tmg-local/data/starcraft-tmg-data.json"))) {
      return cursor;
    }
  }
  return path.resolve(ROOT, "..");
})();
const EXPO_DIR = path.join(ROOT, "apps/starcraft-tmg-expo");
const DIST_DIR = path.join(EXPO_DIR, "dist");
const BUILD_ROOT = path.join(ROOT, "build/ticket-26-slice-266f-live-byok-companion-v1");
const EVIDENCE_ROOT = path.join(BUILD_ROOT, "browser-evidence");
const REPORT_PATH = path.join(BUILD_ROOT, "live-report.json");
const LOCK_PATH = path.join(BUILD_ROOT, "one-call-attempt.lock.json");
const ROOM_ID = "ticket26-slice266f-live-byok-companion";
const AGENT_API_PREFIX = "/starcraft-tmg-level3/agent/api/v2";
const LEGACY_ADAPTER_PATH = path.join(PROJECT_D_ROOT, "scripts/starcraft-tmg-rules-v0.mjs");
const LIVE_COMPANION_PACKAGE_ID = "starcraft-tmg.companion.zagara";
const LIVE_USER_PROMPT = "Zagara，请用一句简短中文报告当前态势并给出下一步建议。";
const LIVE_MAX_OUTPUT_UNITS = 64;
const REQUIRED_FLAGS = new Set(["--authorize-live-byok-companion-once"]);
const ROOM_MUTATION_METHODS = [
  "previewAction",
  "confirmPreview",
  "applyAction",
  "claimControl",
  "selectCharacterPersona",
  "setCharacterSpoilerAccess",
  "issueInvite",
  "issueSeatRecovery",
];
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
const MIME_TYPES = {
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
};

function ensure(condition, code, details = {}) {
  if (!condition) throw Object.assign(new Error(code), { code, ...details });
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

async function sha256File(filename) {
  return createHash("sha256").update(await readFile(filename)).digest("hex");
}

async function artifactRecord(filename, explanation) {
  return {
    path: path.relative(ROOT, filename),
    byteLength: (await stat(filename)).size,
    sha256: await sha256File(filename),
    ...(explanation ? { explanation } : {}),
  };
}

function flagsAuthorized() {
  const flags = process.argv.slice(2);
  return flags.length === REQUIRED_FLAGS.size
    && flags.every((flag) => REQUIRED_FLAGS.has(flag));
}

async function priorSuccessExists() {
  try {
    const report = JSON.parse(await readFile(REPORT_PATH, "utf8"));
    return report?.status === "passed";
  } catch {
    return false;
  }
}

async function priorDispatchClaimExists() {
  try {
    await readFile(LOCK_PATH);
    return true;
  } catch (error) {
    return error?.code !== "ENOENT";
  }
}

async function claimDispatchLock(runId, startedAt) {
  await mkdir(BUILD_ROOT, { recursive: true, mode: 0o700 });
  let handle;
  try {
    handle = await open(LOCK_PATH, "wx", 0o600);
  } catch (error) {
    throw Object.assign(new Error("LIVE_PROVIDER_ATTEMPT_ALREADY_CLAIMED"), {
      code: "LIVE_PROVIDER_ATTEMPT_ALREADY_CLAIMED",
      cause: error,
    });
  }
  await handle.writeFile(`${JSON.stringify({
    schemaVersion: "starcraft_tmg_ticket_26_slice_266f_live_attempt_lock_v1",
    runId,
    startedAt,
    physicalProviderCallBudget: 1,
    automaticRetryAllowed: false,
    ambiguousOutcomeNeedsNewUserAuthorization: true,
    trainingTruth: false,
  }, null, 2)}\n`, "utf8");
  await handle.close();
}

// ── Web export freshness (the focused 266f gate owns the export itself) ────

async function newestSourceMtime() {
  const watched = [
    path.join(EXPO_DIR, "app"),
    path.join(EXPO_DIR, "components"),
    path.join(EXPO_DIR, "lib"),
    path.join(EXPO_DIR, "hooks"),
    path.join(EXPO_DIR, "constants"),
    path.join(EXPO_DIR, "assets"),
    path.join(ROOT, "content/characters"),
    path.join(ROOT, "assets/characters"),
    path.join(ROOT, "packages/client-domain"),
  ];
  let newest = 0;
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "dist") continue;
        await walk(full);
      } else {
        newest = Math.max(newest, (await stat(full)).mtimeMs);
      }
    }
  }
  for (const target of watched) {
    if (existsSync(target)) await walk(target);
  }
  return newest;
}

async function oldestPathMtime(root) {
  let oldest = Number.POSITIVE_INFINITY;
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(full);
      else oldest = Math.min(oldest, (await stat(full)).mtimeMs);
    }
  }
  await walk(root);
  return oldest;
}

async function assertFreshWebExport() {
  ensure(existsSync(path.join(DIST_DIR, "index.html")), "WEB_EXPORT_MISSING", {
    note: "run the focused 266f gate first; it owns the current-sources export",
  });
  const sourceNewest = await newestSourceMtime();
  const distOldest = await oldestPathMtime(DIST_DIR);
  ensure(distOldest > sourceNewest, "WEB_EXPORT_STALE", {
    sourceNewest: new Date(sourceNewest).toISOString(),
    distOldest: new Date(distOldest).toISOString(),
    note: "paid evidence must never render a stale UI; rerun the focused 266f gate",
  });
  return { distOldest: new Date(distOldest).toISOString() };
}

// ── Static + API server (same discipline as the focused gate) ─────────────

function safeFile(root, relativePath) {
  const target = path.resolve(root, relativePath);
  return target === root || target.startsWith(`${root}${path.sep}`) ? target : null;
}

function staticCandidate(pathname) {
  if (pathname.startsWith("/assets/client/")) {
    return {
      root: path.join(ROOT, "assets/client"),
      relativePath: pathname.slice("/assets/client/".length),
    };
  }
  if (PRODUCT_WEB_DOCUMENTS.has(pathname)) {
    return { root: DIST_DIR, relativePath: PRODUCT_WEB_DOCUMENTS.get(pathname) };
  }
  if (pathname === "/room" || pathname.startsWith("/room/")) {
    return { root: DIST_DIR, relativePath: "room/[roomId].html" };
  }
  return { root: DIST_DIR, relativePath: pathname.replace(/^\/+/, "") };
}

async function serveStatic(response, descriptor) {
  if (!descriptor) return false;
  let filename;
  try {
    filename = safeFile(descriptor.root, decodeURIComponent(descriptor.relativePath));
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
      "content-type": MIME_TYPES[path.extname(filename)] || "application/octet-stream",
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
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.byteLength;
    if (bytes > 256 * 1024) throw new Error("PAYLOAD_TOO_LARGE");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function sendJson(response, status, body) {
  const bytes = Buffer.from(JSON.stringify(body), "utf8");
  response.writeHead(status, {
    "cache-control": "private, no-store, max-age=0",
    "content-length": String(bytes.byteLength),
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
  });
  response.end(bytes);
}

// ── Live companion provider adapter (companion_provider_port_v1) ───────────
// The adapter itself performs no socket I/O: it delegates to the injected
// isolated-Worker port (the only network owner, holding the credential in
// child-process session memory). It honestly declares its real external
// execution and preserves the Provider-reported accounting verbatim.

const LIVE_ADAPTER_ID = "secure-worker-live-byok-v1";
const LIVE_ADAPTER_NETWORK = "isolated_worker_https_egress";

function liveProviderRequestFromCompanion(request) {
  const promptNodes = request.messages.map((message, index) => ({
    nodeType: `companion_${message.role}`,
    authority: message.role === "system" ? "platform" : "participant",
    sequence: index,
    content: message.content,
  }));
  const userMessage = "以上是按序排列的同伴角色设定与会话上下文（promptNodes）。"
    + "请以该同伴的身份，只用一到两句简短中文回复指挥官的最后一句话，"
    + "仅依据其中的公开信息，不要编造规则事实。"
    + "输出严格 JSON：{\"channels\":{\"companion_reply\":{\"text\":\"<回复文本>\"}}}";
  const body = {
    schemaVersion: "starcraft_tmg_direct_provider_request_v1",
    requestId: String(request.requestId),
    intent: "chat",
    promptPack: "companion_group_chat_live_v1",
    promptNodes,
    userMessage,
    responseContract: {
      allowedChannels: ["companion_reply"],
      decisionCandidateSource: "forbidden",
    },
    maxOutputUnits: LIVE_MAX_OUTPUT_UNITS,
  };
  const byteLength = Buffer.byteLength(JSON.stringify(body), "utf8");
  ensure(byteLength <= 1024 * 1024,
    "LIVE_PROVIDER_REQUEST_TOO_LARGE", { byteLength });
  return Object.freeze(body);
}

export function createLiveCompanionProviderAdapter(options = {}) {
  const {
    workerPort,
    getAttachedWorkerRef,
    claimDispatch,
    containsCredentialMaterial,
    priceUsage,
  } = options;
  const observation = {
    dispatchAttempts: 0,
    physicalProviderCalls: 0,
    success: null,
    failure: null,
  };
  let calls = 0;
  const usage = { promptTokens: 0, completionTokens: 0, reportedCostUnits: 0 };

  function rejection(reason, message) {
    return Object.freeze({
      ok: false,
      reason,
      message,
      failClosed: true,
      networkAttempts: 0,
    });
  }

  async function complete(request) {
    calls += 1;
    const workerRef = getAttachedWorkerRef();
    if (!workerRef) {
      // Missing secure attachment: stop immediately, never dispatch.
      observation.failure = { code: "PROVIDER_WORKER_NOT_ATTACHED" };
      return rejection("PROVIDER_WORKER_NOT_ATTACHED",
        "no secure Worker attachment is active; the run stops without dispatch");
    }
    observation.dispatchAttempts += 1;
    if (observation.dispatchAttempts > 1) {
      observation.failure = { code: "LIVE_CALL_DENOMINATOR_EXCEEDED" };
      return rejection("LIVE_CALL_DENOMINATOR_EXCEEDED",
        "the one-call authorization was already consumed; no retry is ever attempted");
    }
    let providerRequest;
    try {
      providerRequest = liveProviderRequestFromCompanion(request);
      if (containsCredentialMaterial(providerRequest)) {
        observation.failure = { code: "LIVE_PROVIDER_REQUEST_SENSITIVE_MATERIAL" };
        return rejection("LIVE_PROVIDER_REQUEST_SENSITIVE_MATERIAL",
          "the assembled Provider request carries credential-shaped material; not dispatched");
      }
    } catch (error) {
      observation.failure = { code: String(error?.code || "LIVE_PROVIDER_REQUEST_INVALID") };
      return rejection(String(error?.code || "LIVE_PROVIDER_REQUEST_INVALID"),
        "the Provider request failed local validation before dispatch");
    }
    // The dispatch lock is claimed only after every local pre-check passed,
    // immediately before the single physical egress attempt.
    try {
      await claimDispatch();
    } catch {
      observation.failure = { code: "LIVE_PROVIDER_ATTEMPT_ALREADY_CLAIMED" };
      return rejection("LIVE_PROVIDER_ATTEMPT_ALREADY_CLAIMED",
        "a previous run already claimed the one-call dispatch lock; rerun needs new user authorization");
    }
    let value;
    try {
      value = await workerPort.complete({ workerRef, providerRequest });
    } catch (error) {
      const safe = error?.safeReceipt || null;
      observation.failure = {
        code: String(error?.code || "PROVIDER_TRANSPORT_FAILED"),
        status: safe?.status ?? null,
        physicalAttempts: safe?.physicalAttempts ?? null,
        requestDefinitelyNotSent: safe?.requestDefinitelyNotSent ?? null,
        requestMayHaveBeenSent: safe?.requestMayHaveBeenSent ?? null,
      };
      return rejection(String(error?.code || "PROVIDER_TRANSPORT_FAILED"),
        "isolated Worker egress rejected the turn; zero automatic retry");
    }
    const receipt = value?.usageReceipt || null;
    const output = value?.output || null;
    if (output?.providerTurn || typeof output?.channels?.companion_reply?.text !== "string"
      || !output.channels.companion_reply.text.trim()) {
      // The physical call happened but the reply is not the contracted
      // channel JSON: record honestly and stop; never retry.
      observation.physicalProviderCalls = receipt?.physicalAttempts ?? 1;
      observation.failure = {
        code: "LIVE_PROVIDER_RESPONSE_CONTRACT_REJECTED",
        receipt: clone(receipt),
      };
      return rejection("LIVE_PROVIDER_RESPONSE_CONTRACT_REJECTED",
        "the Provider reply did not match the sealed channel contract; recorded, not retried");
    }
    observation.physicalProviderCalls = receipt.physicalAttempts;
    const pricing = priceUsage(receipt);
    observation.success = {
      receipt: clone(receipt),
      pricing: clone(pricing),
      replyText: output.channels.companion_reply.text,
    };
    const reportedCostUnits = pricing ? pricing.calculatedCostNanoUsd : 0;
    usage.promptTokens += receipt.usage.inputUnits;
    usage.completionTokens += receipt.usage.outputUnits;
    usage.reportedCostUnits += reportedCostUnits;
    return Object.freeze({
      ok: true,
      response: {
        content: output.channels.companion_reply.text,
        rationale: "",
        uncertainty: "unknown",
        usage: {
          promptTokens: receipt.usage.inputUnits,
          completionTokens: receipt.usage.outputUnits,
          reportedCostUnits,
        },
      },
      receipt: {
        networkAttempts: 1,
        paidInference: "performed",
        reportedCostUnits,
        costUnit: "nano_usd_calculated_not_invoice",
        providerReceiptHash: receipt.receiptHash,
      },
    });
  }

  function stats() {
    return Object.freeze({ adapterId: LIVE_ADAPTER_ID, calls, ...clone(usage) });
  }

  return Object.freeze({
    portId: "companion_provider_port_v1",
    adapterId: LIVE_ADAPTER_ID,
    implementsRealProvider: true,
    network: LIVE_ADAPTER_NETWORK,
    complete,
    stats,
    observation,
  });
}

// ── Composition (exported for the offline preflight seam) ─────────────────

export async function composeLiveCompanionStack(options = {}) {
  const { providerAdapter, now } = options;
  const { loadStarcraftTmgData, createStarcraftTmgSampleState } =
    await import(pathToFileURL(LEGACY_ADAPTER_PATH).href);
  const { createStarcraftTmgAuthoritativeEngine, hashStarcraftTmgContract } =
    await import(pathToFileURL(path.join(ROOT, "packages/authoritative-engine/transition-v1.mjs")).href);
  const { createStarcraftTmgRoomRuntime } =
    await import(pathToFileURL(path.join(ROOT, "packages/room-runtime/in-memory-room-v1.mjs")).href);
  const { createStarcraftTmgLevel3HttpAdapter, STARCRAFT_TMG_LEVEL3_API_PREFIX } =
    await import(pathToFileURL(path.join(ROOT, "packages/http-adapter/handler-v1.mjs")).href);
  const { STARCRAFT_TMG_HOSTED_BOT_SEAT_API_PREFIX } =
    await import(pathToFileURL(path.join(ROOT, "packages/client-domain/hosted-bot-seat-transport-v1.mjs")).href);
  const { createInMemoryPersistenceAdapter } =
    await import(pathToFileURL(path.join(ROOT, "packages/companion-backend-module-v1/index.mjs")).href);
  const {
    STARCRAFT_TMG_COMPANION_PRODUCT_API_PREFIX,
    companionProductPackageInputFromCatalogueEntryV1,
    companionPortraitAssetCatalogV1,
    companionPortraitPresentationAssetsV1,
    createStarcraftTmgCompanionProductModuleV1,
  } = await import(pathToFileURL(path.join(ROOT, "packages/product-composition/index.mjs")).href);
  const { COMPANION_CATALOGUE_V1 } =
    await import(pathToFileURL(path.join(ROOT, "content/characters/companion-catalogue-v1.mjs")).href);

  const data = await loadStarcraftTmgData(PROJECT_D_ROOT);
  const sampleState = createStarcraftTmgSampleState(data);
  for (const sideKey of ["player1", "player2"]) {
    const pieces = sampleState.pieces.filter((piece) => (
      piece.sideKey === sideKey && piece.isOnField !== false
    ));
    let cursorY = 3;
    for (const piece of pieces) {
      const count = Math.max(1, Number(piece.currentModels) || 1);
      const baseWidth = Number(piece.baseWidthInches) || 1.26;
      const baseDepth = Number(piece.baseDepthInches) || baseWidth;
      const columns = Math.ceil(Math.sqrt(count));
      const stepX = baseWidth + 0.3;
      const stepY = baseDepth + 0.3;
      const sideMinX = sideKey === "player1" ? 2 : 29;
      const sideMaxX = sideKey === "player1" ? 25 : 52;
      const originX = Math.max(sideMinX, Math.min(
        sideMaxX - columns * stepX,
        Number(piece.xInches) - (columns * stepX) / 2,
      ));
      piece.models = Array.from({ length: count }, (_, index) => ({
        id: `${piece.id}-model-${index + 1}`,
        xInches: originX + (index % columns) * stepX + stepX / 2,
        yInches: cursorY + Math.floor(index / columns) * stepY + stepY / 2,
        baseRotationDegrees: 0,
        isOnField: true,
        isDestroyed: false,
      }));
      cursorY += Math.ceil(count / columns) * stepY + 1.5;
    }
  }
  sampleState.board.terrain = [];
  sampleState.activeSideKey = "player1";
  const engine = createStarcraftTmgAuthoritativeEngine(now ? { now } : {});
  const roomRuntime = createStarcraftTmgRoomRuntime({
    authorityEngine: engine,
    characterReleaseChannel: "development_internal",
    ...(now ? { now } : {}),
  });
  const seatPlan = [
    { label: "host", seatKey: "player1", roleMode: "player", principalType: "human" },
    { label: "guest", seatKey: "player2", roleMode: "player", principalType: "human" },
  ];
  const created = await roomRuntime.createRoom({
    roomId: ROOM_ID,
    gameId: "starcraft-tmg",
    surfaceMode: "classic",
    title: "Ticket 26 · Slice 266f · live BYOK companion acceptance",
    initialStateAuthority: {
      source: "server_factory",
      state: sampleState,
      dataVersion: data.version,
      receiptHash: hashStarcraftTmgContract({
        source: "ticket-26-slice-266f-live-byok-companion-v1",
        roomId: ROOM_ID,
        state: sampleState,
      }),
      serverSeatPlan: seatPlan,
    },
    serverSeatPlan: seatPlan,
  });
  ensure(created.ok, "LIVE_ROOM_CREATE_FAILED", { reason: created.reason });
  const hostSeatToken = created.credentials.host.seatToken;

  // Mutation-counting facade: any Room mutation the companion path attempted
  // is counted and fails the run.
  const roomMutations = Object.fromEntries(ROOM_MUTATION_METHODS.map((method) => [method, 0]));
  const roomFacade = { ...roomRuntime };
  for (const method of ROOM_MUTATION_METHODS) {
    if (typeof roomFacade[method] !== "function") continue;
    const original = roomFacade[method];
    roomFacade[method] = async (...args) => {
      roomMutations[method] += 1;
      return original(...args);
    };
  }

  const companionModule = createStarcraftTmgCompanionProductModuleV1({
    roomRuntime: roomFacade,
    persistence: createInMemoryPersistenceAdapter(),
    provider: providerAdapter,
    packages: COMPANION_CATALOGUE_V1.entries.map((entry) =>
      companionProductPackageInputFromCatalogueEntryV1(entry, {
        presentationAssets: companionPortraitPresentationAssetsV1(entry.characterId),
      })),
    assetCatalog: companionPortraitAssetCatalogV1(),
    // No fixture worldbook content in the live acceptance: only the sealed
    // package entries and real session content exist.
    globalWorldbookEntries: [],
    worldbookRecursionDepth: 2,
    ...(now ? { now } : {}),
  });

  const roomAdapter = createStarcraftTmgLevel3HttpAdapter({
    roomRuntime: roomFacade,
    assetRoot: ROOT,
  });

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://live.local");
      const hasBody = ["POST", "PUT", "PATCH"].includes(request.method || "GET");
      const rawBody = hasBody ? await readRequestBody(request) : Buffer.alloc(0);
      if (url.pathname.startsWith(STARCRAFT_TMG_COMPANION_PRODUCT_API_PREFIX)) {
        let body = {};
        try { body = rawBody.byteLength ? JSON.parse(rawBody.toString("utf8")) : {}; } catch { body = {}; }
        const result = await companionModule.handle({
          method: request.method,
          pathname: url.pathname,
          query: Object.fromEntries(url.searchParams),
          headers: request.headers,
          body,
        });
        sendJson(response, result.status, result.response);
        return;
      }
      if (url.pathname.startsWith(AGENT_API_PREFIX)) {
        sendJson(response, 200, {
          schemaVersion: "starcraft_tmg_online_agent_http_v1",
          result: { ok: false, reason: "ONLINE_AGENT_SESSION_NOT_ATTACHED_IN_LIVE_COMPANION_RUN" },
        });
        return;
      }
      if (url.pathname.startsWith(STARCRAFT_TMG_LEVEL3_API_PREFIX)
        || url.pathname.startsWith("/starcraft-tmg-level3/assets/v1/character/")) {
        let body = {};
        try { body = rawBody.byteLength ? JSON.parse(rawBody.toString("utf8")) : {}; } catch { body = {}; }
        const result = await roomAdapter.handle({
          method: request.method,
          pathname: url.pathname,
          query: url.searchParams,
          headers: request.headers,
          rawBody,
          body,
          bodyBytes: rawBody.byteLength,
        });
        if (result.binary) {
          response.writeHead(result.status, result.headers);
          response.end(result.body);
          return;
        }
        sendJson(response, result.status, result.response);
        return;
      }
      if (url.pathname.startsWith(`${STARCRAFT_TMG_HOSTED_BOT_SEAT_API_PREFIX}/`)) {
        sendJson(response, 200, {
          schemaVersion: "starcraft_tmg_hosted_bot_seat_http_v1",
          result: { ok: false, reason: "HOSTED_BOT_NOT_ATTACHED_IN_LIVE_COMPANION_RUN" },
        });
        return;
      }
      if (await serveStatic(response, staticCandidate(url.pathname))) return;
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
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
  ensure(address && typeof address === "object", "LIVE_SERVER_LISTEN_FAILED");
  const origin = `http://127.0.0.1:${address.port}`;

  async function issueRecovery(seatToken) {
    const recovery = await roomRuntime.issueSeatRecovery({ roomId: ROOM_ID, seatToken });
    ensure(recovery?.ok === true && typeof recovery.recovery?.recoveryToken === "string",
      "LIVE_RECOVERY_ISSUE_FAILED", { reason: recovery?.reason });
    return recovery.recovery.recoveryToken;
  }

  async function companionFetch(subpath, { method = "GET", seatToken, body } = {}) {
    const response = await fetch(
      `${origin}${STARCRAFT_TMG_COMPANION_PRODUCT_API_PREFIX}/${subpath}`,
      {
        method,
        headers: {
          accept: "application/json",
          ...(body ? { "content-type": "application/json" } : {}),
          ...(seatToken ? { authorization: `Bearer ${seatToken}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
    return { status: response.status, envelope: await response.json() };
  }

  return {
    origin,
    server,
    roomRuntime,
    roomMutations,
    companionModule,
    hostSeatToken,
    issueRecovery,
    companionFetch,
    hashStarcraftTmgContract,
  };
}

// ── Browser helpers ────────────────────────────────────────────────────────

function resolveChromiumExecutable() {
  const cacheRoot = path.join(os.homedir(), "Library/Caches/ms-playwright");
  const candidates = [];
  for (const entry of readdirSync(cacheRoot, { withFileTypes: true })) {
    if (!entry.name.startsWith("chromium_headless_shell-")) continue;
    const base = path.join(cacheRoot, entry.name);
    for (const sub of readdirSync(base, { withFileTypes: true })) {
      const candidate = path.join(base, sub.name, "chrome-headless-shell");
      if (existsSync(candidate)) candidates.push(candidate);
    }
  }
  candidates.sort().reverse();
  if (candidates.length) return candidates[0];
  const systemChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  return existsSync(systemChrome) ? systemChrome : null;
}

async function waitBody(page, expected, timeout = 60_000) {
  const variants = Array.isArray(expected) ? expected : [expected];
  await page.waitForFunction(
    (texts) => texts.some((text) => (document.body?.innerText || "").includes(text)),
    variants,
    { timeout },
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

async function writeFailureReport(runId, startedAt, code, extra = {}) {
  await mkdir(BUILD_ROOT, { recursive: true, mode: 0o700 });
  const body = {
    schemaVersion: "starcraft_tmg_ticket_26_slice_266f_live_byok_companion_report_v1",
    ticket: 26,
    slice: "266f",
    status: "failed",
    runId,
    startedAt,
    failedAt: new Date().toISOString(),
    failureCode: code,
    automaticRetries: 0,
    rerunAllowedAutomatically: false,
    rawCredentialPersisted: false,
    credentialHashPersisted: false,
    trainingTruth: false,
    ...clone(extra),
  };
  await writeFile(REPORT_PATH, `${JSON.stringify({
    ...body,
    reportHash: createHash("sha256").update(JSON.stringify(body)).digest("hex"),
  }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
}

async function main() {
  if (!flagsAuthorized()) {
    console.error("LIVE_BYOK_COMPANION_EXPLICIT_AUTHORIZATION_REQUIRED");
    process.exitCode = 2;
    return;
  }
  if (await priorSuccessExists()) {
    console.error("LIVE_BYOK_COMPANION_SUCCESS_ALREADY_RECORDED");
    process.exitCode = 2;
    return;
  }
  if (await priorDispatchClaimExists()) {
    console.error("LIVE_PROVIDER_ATTEMPT_ALREADY_CLAIMED");
    process.exitCode = 2;
    return;
  }

  const runId = randomUUID();
  const startedAt = new Date().toISOString();
  await mkdir(EVIDENCE_ROOT, { recursive: true });

  const { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } =
    await import(pathToFileURL(path.join(ROOT, "packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs")).href);
  const { createStarcraftTmgProviderEgressWorkerPortV1 } =
    await import(pathToFileURL(path.join(ROOT, "packages/secure-provider-runtime/provider-egress-worker-port-v1.mjs")).href);
  const { createStarcraftTmgProviderProfileRegistryV1 } =
    await import(pathToFileURL(path.join(ROOT, "packages/secure-provider-runtime/provider-profile-registry-v1.mjs")).href);
  const {
    priceStarcraftTmgDeepSeekV4FlashUsageV1,
    verifyStarcraftTmgProviderPricingReceiptV1,
  } = await import(pathToFileURL(path.join(ROOT, "packages/secure-provider-runtime/provider-pricing-v1.mjs")).href);
  const { STARCRAFT_TMG_TICKET_16_LIVE_PROVIDER_PROFILE_V1: providerProfile } =
    await import(pathToFileURL(path.join(ROOT, "content/provider/ticket-16-live-provider-closure-v1.mjs")).href);
  const { containsStarcraftTmgOnlineCredentialMaterialV1 } =
    await import(pathToFileURL(path.join(ROOT, "packages/online-agent-session/portable-credential-material-v1.mjs")).href);
  const { hashStarcraftTmgContract } =
    await import(pathToFileURL(path.join(ROOT, "packages/authoritative-engine/referee-crypto-v1.mjs")).href);
  const { hashStarcraftTmgClientContract } =
    await import(pathToFileURL(path.join(ROOT, "packages/client-domain/portable-contract-hash-v1.mjs")).href);

  const webExport = await assertFreshWebExport();

  // ── Keychain → isolated Worker (the ONLY credential path) ─────────────
  const registry = createStarcraftTmgProviderProfileRegistryV1({
    entries: [{ providerProfile, completionPath: "/chat/completions" }],
    allowedProviders: ["deepseek-openai-compatible-direct"],
  });
  const workerPort = createStarcraftTmgProviderEgressWorkerPortV1({
    providerProfileRegistry: registry,
    maxWorkers: 1,
    maxOutputBytes: 64 * 1024,
    handshakeTimeoutMs: 5_000,
    shutdownGraceMs: 1_000,
  });

  let credentialBytes = null;
  let keychainReceipt = null;
  let workerRef = null;
  let detachProof = null;
  let stack = null;
  let adapter = null;
  let browser = null;
  const browserErrors = [];
  const artifacts = [];
  let conversationId = null;
  let replyRenderedMatch = false;
  let providerAccountingAfter = null;
  let stateRevisionBefore = null;
  const screenshots = [];

  async function capture(page, name, explanation) {
    const filename = path.join(EVIDENCE_ROOT, name);
    await page.screenshot({ path: filename, fullPage: false });
    const record = await artifactRecord(filename, explanation);
    artifacts.push(record);
    screenshots.push(record.path);
  }

  function watch(page, label) {
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const text = message.text();
      if (/favicon/iu.test(text)) return;
      browserErrors.push(`${label}:console:${text}`);
    });
    page.on("pageerror", (error) => browserErrors.push(`${label}:page:${error.message}`));
  }

  try {
    // Keychain read (attested /usr/bin/security binary, empty environment,
    // no shell, secret never in arguments/environment; the module zeroes its
    // own stdout buffer). The raw bytes stay in this local Buffer until the
    // Worker port moves them into the isolated child and zeroes the parent
    // copy in its own finally path.
    const ingress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
    credentialBytes = ingress.credentialBytes;
    keychainReceipt = ingress.receipt;
    ensure(keychainReceipt.secretInArguments === false
      && keychainReceipt.secretInEnvironment === false
      && keychainReceipt.secretPersistedByRunner === false,
    "KEYCHAIN_INGRESS_RECEIPT_UNSAFE");

    const attachmentId = `att-266f-live-${runId}`;
    const attached = await workerPort.attachCredential({
      attachmentId,
      providerProfile,
      credentialBytes,
    });
    ensure(attached?.ok === true && typeof attached.workerRef === "string",
      "LIVE_PROVIDER_ATTACH_FAILED");
    workerRef = attached.workerRef;
    ensure(credentialBytes.every((byte) => byte === 0),
      "LIVE_PARENT_CREDENTIAL_NOT_ZEROED");

    adapter = createLiveCompanionProviderAdapter({
      workerPort,
      getAttachedWorkerRef: () => workerRef,
      claimDispatch: () => claimDispatchLock(runId, startedAt),
      containsCredentialMaterial: containsStarcraftTmgOnlineCredentialMaterialV1,
      priceUsage(receipt) {
        try {
          const pricing = priceStarcraftTmgDeepSeekV4FlashUsageV1({
            providerId: receipt.providerId,
            requestedModel: receipt.requestedModel,
            reportedModel: receipt.reportedModel,
            startedAt: receipt.startedAt,
            usage: receipt.usage,
          });
          return verifyStarcraftTmgProviderPricingReceiptV1(pricing) ? pricing : null;
        } catch {
          return null; // cost honestly unknown; usage units still recorded
        }
      },
    });

    stack = await composeLiveCompanionStack({ providerAdapter: adapter });

    const roomBefore = await stack.roomRuntime.readRoom({
      roomId: ROOM_ID,
      seatToken: stack.hostSeatToken,
    });
    ensure(roomBefore?.ok, "ROOM_READ_BEFORE_FAILED");
    stateRevisionBefore = roomBefore.projection.room.stateRevision;

    // ── Desktop journey: open one-companion Chinese session, one send ────
    const executablePath = resolveChromiumExecutable();
    browser = await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
    });
    const chromiumVersion = browser.version();

    const preferenceBody = {
      schemaVersion: "starcraft_tmg_local_preferences_v1",
      language: "en",
      unitLabelOverrides: {},
      unitLabelOverrideClassification: "user_local_unreviewed_label",
      legacyUnitLabelsImported: false,
      migrationScanHash: null,
      canAffectRules: false,
      trainingTruth: false,
    };
    const preferenceRecord = JSON.stringify({
      ...preferenceBody,
      recordHash: hashStarcraftTmgClientContract(preferenceBody),
    });
    const seedPreferences = async (context) => context.addInitScript(
      ([key, value]) => {
        try {
          window.localStorage.setItem(key, value);
        } catch {}
      },
      ["@project-d/starcraft-tmg/preferences/v1", preferenceRecord],
    );

    const hostRecovery1 = await stack.issueRecovery(stack.hostSeatToken);
    const desktop = await browser.newContext({
      viewport: { width: 1500, height: 1050 },
      locale: "en-US",
      reducedMotion: "reduce",
    });
    await seedPreferences(desktop);
    const page = await desktop.newPage();
    watch(page, "desktop");
    await page.goto(
      `${stack.origin}/room/${encodeURIComponent(ROOM_ID)}#recovery=${encodeURIComponent(hostRecovery1)}`,
      { waitUntil: "domcontentloaded", timeout: 120_000 },
    );
    await waitBody(page, "Authoritative room connected", 120_000);
    await waitBody(page, "TACTICAL COMMS", 120_000);

    const dock = page.getByTestId("tactical-adjutant-floating-dock");
    const toggle = dock.getByRole("button", { name: /TACTICAL COMMS/iu });
    await toggle.focus();
    await page.keyboard.press("Enter");
    await page.getByTestId("companion-focus-sheet").waitFor({ timeout: 60_000 });
    const chatSectionButton = dock.getByRole("button", { name: /Companion group chat/iu });
    if (await page.getByTestId("companion-chat-section").count() === 0) {
      await chatSectionButton.focus();
      await page.keyboard.press("Enter");
    }
    const chat = dock.getByTestId("companion-chat-section");
    await chat.getByTestId("companion-chat-provider-status").waitFor({ timeout: 60_000 });
    const providerStatusText = await chat.getByTestId("companion-chat-provider-status").innerText();
    ensure(/injected Provider port/iu.test(providerStatusText)
      && providerStatusText.includes(`declared network ${LIVE_ADAPTER_NETWORK}`),
    "LIVE_PROVIDER_STATUS_NOT_HONEST", { providerStatusText });

    // Exactly ONE companion (Zagara — real sealed package worldbook): select
    // her, deselect the default Kerrigan, then open the conversation.
    await chat.getByTestId("companion-chat-select-zagara").waitFor({ timeout: 30_000 });
    await chat.getByTestId("companion-chat-select-zagara").click();
    await chat.getByTestId("companion-chat-select-sarah_kerrigan").click();
    await chat.getByTestId("companion-chat-open").click();
    await chat.getByTestId("companion-chat-conversation-meta").waitFor({ timeout: 60_000 });
    const meta0 = await chat.getByTestId("companion-chat-conversation-meta").innerText();
    conversationId = meta0.match(/conversation:\s*(\S+)/u)?.[1];
    ensure(conversationId, "CONVERSATION_ID_NOT_RENDERED", { meta0 });

    // Pre-send denominator proof: exactly one companion bound, zero calls.
    const preSend = await stack.companionFetch(
      `conversations/${encodeURIComponent(conversationId)}?roomId=${encodeURIComponent(ROOM_ID)}`,
      { seatToken: stack.hostSeatToken },
    );
    ensure(preSend.envelope?.result?.ok === true, "PRE_SEND_READ_FAILED");
    ensure(preSend.envelope.result.companions?.length === 1
      && preSend.envelope.result.companions[0]?.packageRef?.id === LIVE_COMPANION_PACKAGE_ID,
    "LIVE_CONVERSATION_NOT_EXACTLY_ONE_COMPANION", {
      companions: preSend.envelope.result.companions?.map((entry) => entry.packageRef?.id),
    });
    ensure(preSend.envelope.result.providerAccounting?.calls === 0,
      "PROVIDER_CALL_BEFORE_SEND", {
        accounting: preSend.envelope.result.providerAccounting,
      });
    await capture(page, "live-01-desktop-session-open.png",
      "Desktop 1500×1050: one-companion (Zagara) live BYOK session open through the real product path; zero Provider calls so far; provider status honestly declares the isolated-Worker HTTPS egress.");

    // ONE bounded Chinese prompt → the single physical Provider call.
    await chat.getByTestId("companion-chat-input").fill(LIVE_USER_PROMPT);
    await chat.getByTestId("companion-chat-send").click();
    const replyMessage = chat.getByTestId("companion-chat-message-2");
    const interrupted = chat.getByTestId("companion-chat-interrupted");
    const outcome = await Promise.race([
      replyMessage.waitFor({ timeout: 150_000 }).then(() => "replied", () => null),
      interrupted.waitFor({ timeout: 150_000 }).then(() => "interrupted", () => null),
    ]);
    ensure(outcome === "replied" || outcome === "interrupted",
      "LIVE_TURN_OUTCOME_TIMEOUT", { observation: clone(adapter.observation.failure) });
    if (outcome === "interrupted") {
      const interruptText = await interrupted.innerText();
      await capture(page, "live-failure-interrupted.png",
        "The single authorized Provider call failed; the explicit interrupted card rendered, accepted history preserved, zero retry attempted.");
      throw Object.assign(new Error("LIVE_PROVIDER_TURN_FAILED"), {
        code: "LIVE_PROVIDER_TURN_FAILED",
        providerFailure: clone(adapter.observation.failure),
        interruptText: interruptText.slice(0, 600),
      });
    }
    ensure(adapter.observation.success, "LIVE_SUCCESS_RECEIPT_MISSING", {
      failure: clone(adapter.observation.failure),
    });
    ensure(adapter.observation.physicalProviderCalls === 1
      && adapter.observation.success.receipt.physicalAttempts === 1
      && adapter.observation.success.receipt.automaticRetries === 0,
    "LIVE_PROVIDER_ATTEMPT_DENOMINATOR_DRIFT", {
      observation: {
        dispatchAttempts: adapter.observation.dispatchAttempts,
        physicalProviderCalls: adapter.observation.physicalProviderCalls,
      },
    });
    ensure(adapter.observation.success.receipt.requestedModel === providerProfile.model
      && adapter.observation.success.receipt.reportedModel === providerProfile.model,
    "LIVE_PROVIDER_REPORTED_MODEL_DRIFT", {
      requested: adapter.observation.success.receipt.requestedModel,
      reported: adapter.observation.success.receipt.reportedModel,
    });

    // The rendered transcript byte-matches the ACTUAL Provider response.
    const renderedReply = await replyMessage.innerText();
    const actualReply = adapter.observation.success.replyText;
    ensure(renderedReply.includes(actualReply),
      "RENDERED_REPLY_NOT_ACTUAL_PROVIDER_RESPONSE", {
        rendered: renderedReply.slice(0, 400),
        actual: actualReply.slice(0, 400),
      });
    replyRenderedMatch = true;
    const messageCount = await chat.locator('[data-testid^="companion-chat-message-"]').count();
    ensure(messageCount === 2, "LIVE_MESSAGE_COUNT_WRONG", { messageCount });
    const readAfter = await stack.companionFetch(
      `conversations/${encodeURIComponent(conversationId)}?roomId=${encodeURIComponent(ROOM_ID)}`,
      { seatToken: stack.hostSeatToken },
    );
    providerAccountingAfter = clone(readAfter.envelope?.result?.providerAccounting);
    ensure(readAfter.envelope?.result?.ok === true
      && providerAccountingAfter?.calls === 1
      && providerAccountingAfter?.externalNetworkAttemptsKnown === 1
      && providerAccountingAfter?.paidInferencePerformed === 1,
    "LIVE_PROVIDER_ACCOUNTING_WRONG", { accounting: providerAccountingAfter });
    await capture(page, "live-02-desktop-chinese-reply.png",
      "Desktop 1500×1050: the ACTUAL DeepSeek reply (byte-identical to the isolated-Worker output) rendered in the real companion chat; server accounting shows exactly 1 external network attempt / 1 paid inference.");

    await desktop.close();

    // ── 390px touch: resume the persisted live conversation ─────────────
    const hostRecovery2 = await stack.issueRecovery(stack.hostSeatToken);
    const narrow = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: "en-US",
      reducedMotion: "reduce",
      hasTouch: true,
      isMobile: true,
    });
    await seedPreferences(narrow);
    const narrowPage = await narrow.newPage();
    watch(narrowPage, "narrow");
    await narrowPage.goto(
      `${stack.origin}/room/${encodeURIComponent(ROOM_ID)}#recovery=${encodeURIComponent(hostRecovery2)}`,
      { waitUntil: "domcontentloaded", timeout: 120_000 },
    );
    await waitBody(narrowPage, "Authoritative room connected", 120_000);
    await waitBody(narrowPage, "TACTICAL COMMS", 120_000);
    const narrowDock = narrowPage.getByTestId("tactical-adjutant-floating-dock");
    await narrowDock.getByRole("button", { name: /TACTICAL COMMS/iu }).tap();
    await narrowPage.getByTestId("companion-mobile-sheet").waitFor({ timeout: 60_000 });
    if (await narrowPage.getByTestId("companion-chat-section").count() === 0) {
      await narrowDock.getByRole("button", { name: /Companion group chat/iu }).tap();
    }
    const narrowChat = narrowDock.getByTestId("companion-chat-section");
    await narrowChat.getByTestId("companion-chat-conversation-meta").waitFor({ timeout: 60_000 });
    const narrowMeta = await narrowChat.getByTestId("companion-chat-conversation-meta").innerText();
    ensure(narrowMeta.includes(conversationId) && narrowMeta.includes("turn 2"),
      "NARROW_DID_NOT_RESUME_LIVE_CONVERSATION", { narrowMeta });
    const narrowReply = await narrowChat.getByTestId("companion-chat-message-2").innerText();
    ensure(narrowReply.includes(actualReply),
      "NARROW_RESUME_REPLY_NOT_ACTUAL", { narrowReply: narrowReply.slice(0, 400) });
    const narrowOverflow = await narrowPage.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    ensure(narrowOverflow.documentWidth <= narrowOverflow.viewportWidth + 1,
      "NARROW_HORIZONTAL_OVERFLOW", narrowOverflow);
    await capture(narrowPage, "live-03-narrow-mobile-resumed.png",
      "390×844 touch: the full-screen mobile sheet resumes the persisted live conversation; the same actual Provider reply renders with zero horizontal overflow.");
    await narrow.close();

    // ── Detach + zero-persistence proofs ────────────────────────────────
    await workerPort.detachCredential({ workerRef, reason: "explicit_user_detach" });
    const tombstone = await workerPort.readWorkerState({ workerRef });
    ensure(tombstone?.ok === true && tombstone.worker?.state === "exited"
      && tombstone.worker?.credentialPersistence === "none_after_process_exit",
    "LIVE_DETACH_TOMBSTONE_WRONG", { worker: clone(tombstone?.worker) });
    const pid = tombstone.worker.processId;
    let processExited = null;
    if (Number.isInteger(pid)) {
      try {
        process.kill(pid, 0);
        processExited = false;
      } catch {
        processExited = true;
      }
    }
    ensure(processExited === true, "LIVE_WORKER_PROCESS_STILL_RUNNING", { pid });
    detachProof = {
      detached: true,
      detachReason: "explicit_user_detach",
      shutdownAckRequiresSensitiveBytesZeroed: true,
      workerTombstone: clone(tombstone.worker),
      workerProcessExited: processExited,
      parentCredentialBytesZeroed: credentialBytes.every((byte) => byte === 0),
      keychainStdoutZeroedByModule: true,
      sensitiveMaterialPersisted: false,
    };
    workerRef = null;

    // ── Room safety ──────────────────────────────────────────────────────
    ensure(Object.values(stack.roomMutations).every((count) => count === 0),
      "COMPANION_PATH_MUTATED_ROOM", { mutations: stack.roomMutations });
    const roomAfter = await stack.roomRuntime.readRoom({
      roomId: ROOM_ID,
      seatToken: stack.hostSeatToken,
    });
    ensure(roomAfter?.ok
      && roomAfter.projection.room.stateRevision === stateRevisionBefore,
    "ROOM_STATE_REVISION_MOVED", {
      before: stateRevisionBefore,
      after: roomAfter?.projection?.room?.stateRevision,
    });

    const unexpectedErrors = browserErrors.filter((entry) => !/favicon/iu.test(entry));
    ensure(unexpectedErrors.length === 0, "BROWSER_ERRORS", {
      unexpected: unexpectedErrors.slice(0, 10),
    });

    const receipt = adapter.observation.success.receipt;
    const pricing = adapter.observation.success.pricing;
    const reportBody = {
      schemaVersion: "starcraft_tmg_ticket_26_slice_266f_live_byok_companion_report_v1",
      ticket: 26,
      slice: "266f",
      status: "passed",
      runId,
      startedAt,
      finishedAt: new Date().toISOString(),
      userAuthorization: {
        explicitFlag: "--authorize-live-byok-companion-once",
        manifest: "ticket-26-slice-266f-companion-live-product-acceptance",
        hardMaximumPhysicalProviderCalls: 1,
      },
      webExport,
      credentialIngress: clone(keychainReceipt),
      attachment: {
        attachmentId,
        providerProfileRef: clone(receipt.providerProfileRef),
        providerId: receipt.providerId,
        requestedModel: receipt.requestedModel,
        egressIsolation: "child_process_session_memory_only",
      },
      liveCall: {
        physicalAttempts: receipt.physicalAttempts,
        automaticRetries: receipt.automaticRetries,
        dispatchAttempts: adapter.observation.dispatchAttempts,
        httpStatus: receipt.status,
        providerId: receipt.providerId,
        requestedModel: receipt.requestedModel,
        reportedModel: receipt.reportedModel,
        providerRequestIdHash: receipt.providerRequestIdHash,
        providerSystemFingerprintHash: receipt.providerSystemFingerprintHash ?? null,
        dnsAddressSetHash: receipt.dnsAddressSetHash,
        tlsServerName: receipt.tlsServerName,
        tlsCertificateVerificationDisabled: false,
        redirectFollowed: false,
        proxyUsed: false,
        responseFingerprint: receipt.responseFingerprint,
        callStartedAt: receipt.startedAt,
        callFinishedAt: receipt.finishedAt,
        usage: clone(receipt.usage),
        pricing: clone(pricing),
        safeProviderReceiptHash: receipt.receiptHash,
      },
      conversation: {
        roomId: ROOM_ID,
        conversationId,
        companions: [LIVE_COMPANION_PACKAGE_ID],
        userPrompt: LIVE_USER_PROMPT,
        actualProviderReply: adapter.observation.success.replyText,
        replyRenderedByteMatchDesktop: replyRenderedMatch,
        replyRenderedByteMatchMobile: true,
        providerAccountingAfter,
      },
      browserEvidence: {
        chromium: chromiumVersion,
        viewports: [
          { name: "desktop", width: 1500, height: 1050 },
          { name: "narrow-touch", width: 390, height: 844, hasTouch: true },
        ],
        screenshots,
      },
      detach: clone(detachProof),
      roomSafety: {
        mutations: clone(stack.roomMutations),
        stateRevisionBefore,
        stateRevisionAfter: roomAfter.projection.room.stateRevision,
      },
      boundaries: {
        realProviderCalls: 1,
        paidProviderUsed: true,
        rawCredentialPersisted: false,
        credentialHashPersisted: false,
        credentialInArgumentsOrEnvironment: false,
        automaticRetries: 0,
        silentRetry: false,
        sourceRefreshPerformed: false,
        roomMutationsByCompanionPath: 0,
        hiddenChainOfThoughtCollected: false,
        modelReplyFabricated: false,
        otherPaidProviderPathInvoked: false,
        trainingTruth: false,
      },
      artifacts,
    };
    const serialized = JSON.stringify(reportBody);
    ensure(!containsStarcraftTmgOnlineCredentialMaterialV1(serialized),
      "CREDENTIAL_SHAPED_MATERIAL_IN_REPORT");
    for (const artifact of artifacts) {
      const bytes = await readFile(path.join(ROOT, artifact.path));
      ensure(!containsStarcraftTmgOnlineCredentialMaterialV1(bytes.toString("latin1")),
        "CREDENTIAL_SHAPED_MATERIAL_IN_ARTIFACT", { artifact: artifact.path });
    }
    await writeFile(REPORT_PATH, `${JSON.stringify({
      ...reportBody,
      reportHash: createHash("sha256").update(serialized).digest("hex"),
    }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    console.log(JSON.stringify({
      ok: true,
      model: receipt.reportedModel,
      inputUnits: receipt.usage.inputUnits,
      outputUnits: receipt.usage.outputUnits,
      calculatedCostUsd: pricing?.calculatedCostUsd ?? null,
      physicalAttempts: receipt.physicalAttempts,
      detached: true,
      report: path.relative(ROOT, REPORT_PATH),
    }, null, 2));
  } catch (error) {
    const providerCode = String(adapter?.observation?.failure?.code || "");
    const thrownCode = String(error?.code || "");
    const code = /^[A-Z][A-Z0-9_]{2,79}$/u.test(providerCode)
      && ["PROVIDER_AUTHENTICATION_FAILED", "PROVIDER_PAYMENT_REQUIRED",
        "PROVIDER_WORKER_NOT_ATTACHED", "LIVE_PROVIDER_ATTEMPT_ALREADY_CLAIMED",
        "LIVE_CALL_DENOMINATOR_EXCEEDED",
        "LIVE_PROVIDER_RESPONSE_CONTRACT_REJECTED"].includes(providerCode)
      ? providerCode
      : /^[A-Z][A-Z0-9_]{2,79}$/u.test(thrownCode)
        ? thrownCode
        : "LIVE_BYOK_COMPANION_RUN_FAILED";
    await writeFailureReport(runId, startedAt, code, {
      providerFailure: clone(adapter?.observation?.failure || null),
      providerDispatchAttempts: adapter?.observation?.dispatchAttempts ?? 0,
      physicalProviderCalls: adapter?.observation?.physicalProviderCalls ?? 0,
      conversationId,
      screenshots,
    }).catch(() => {});
    console.error(code);
    process.exitCode = 1;
  } finally {
    credentialBytes?.fill(0);
    if (browser) await browser.close().catch(() => {});
    if (stack?.server) stack.server.close();
    if (workerRef) {
      await workerPort.detachCredential({ workerRef, reason: "explicit_user_detach" })
        .catch(() => {});
    }
    await workerPort.close().catch(() => {});
  }
}

if (process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
