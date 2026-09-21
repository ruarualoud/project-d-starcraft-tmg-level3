#!/usr/bin/env node

/**
 * Ticket 25 / Slice 262 — real-browser threat visualization journey.
 *
 * Self-contained verifier:
 *   1. exports the CURRENT worktree Expo Web bundle when any frontend source
 *      is newer than the existing export (canonical ticket-14 flow:
 *      precompiled static web CSS + `expo export`);
 *   2. creates a read-only demo room from the unchanged legacy sample-state
 *      adapter input (`scripts/starcraft-tmg-rules-v0.mjs` — the same factory
 *      the ticket-14/15 browser harnesses used: eight armed units already on
 *      the battlefield, zero Provider calls), instantiated through the
 *      resolved main checkout because that adapter input only resolves from
 *      the main checkout depth. Byte parity of every repository backend
 *      module loaded this way is hash-asserted against this worktree first,
 *      and the adapter input itself is hash-recorded;
 *   3. serves the worktree bundle plus the unmodified Level3 room/hosted-bot
 *      HTTP APIs on one loopback origin, so a real browser runs current
 *      frontend product code against unmodified backend code;
 *   4. drives real Chromium through the threat-visualization journey with
 *      user-visible assertions (legend text, overlay glyph geometry/colors,
 *      panel receipts) on desktop (1500×1050) and narrow/touch (390×844)
 *      viewports, both with reduced motion;
 *   5. writes a git-ignored machine-readable report plus PNG evidence set
 *      with sha256 hashes under
 *      build/ticket-25-slice-262-threat-visualization-browser-v1/.
 *
 * No Provider call, no credential read, no source refresh, and no gameplay
 * truth is computed here or in the UI under test.
 */

import { createHash } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXPO_DIR = path.join(ROOT, "apps/starcraft-tmg-expo");
const DIST_DIR = path.join(EXPO_DIR, "dist");
const BUILD_ROOT = path.join(ROOT, "build/ticket-25-slice-262-threat-visualization-browser-v1");
const EVIDENCE_ROOT = path.join(BUILD_ROOT, "browser-evidence");
const REPORT_PATH = path.join(BUILD_ROOT, "browser-report.json");
const BASE_COMMIT = "78fa68d1cdc81b77155b2de0206b54d60e29e9d8";
const GENERATED_AT = "2026-09-21T00:00:00.000Z";
const ROOM_ID = "ticket25-slice262-threat-viz";
const SCREENSHOT_EXPLANATIONS = {
  "01-desktop-threat-off-default.png": "Freshly bound desktop session: threat overlay is off by default, no threat glyphs render, the battlefield is unobstructed.",
  "02-desktop-unknown-no-selection.png": "Move+fire mode with no unit selected: the legend reports 0 projected regions with explicit select-a-unit guidance (unknown is never drawn as zero), and the predicted-interaction card honestly asks for a selection.",
  "03-desktop-stationary-fire.png": "Selected friendly Marine: stationary-fire projected regions on the board with the source/side/mode/precision legend.",
  "04-desktop-move-fire.png": "Move+fire mode: the projected envelope radius visibly grows versus stationary (projected speed branch), asserted as a rendered radius increase.",
  "05-desktop-charge.png": "Charge engagement: amber dashed advisory envelope plus the charge facts card; the d6 charge distance is never rolled by the read query.",
  "06-desktop-friendly-aggregate.png": "Friendly union layer: all P1 projected regions drawn together; overlap intensity brightens coincident fill (display count only).",
  "07-desktop-enemy-aggregate.png": "Enemy union layer: all P2 projected regions (Zergling) on the same board.",
  "08-desktop-predicted-interactions.png": "Predicted-interaction comparison for the selected unit: relationship receipts (base-edge distance, reachable weapons, charge candidate) joined with attack-probability receipts, LegalSpace action refs, the no-sealed-preview note and the honest fire-zone-exchange not-exposed line.",
  "09-narrow-enemy-aggregate.png": "390px touch layout: the battlefield stays inside the first viewport while the enemy union overlay is visible.",
  "10-narrow-stationary-selected.png": "Narrow layout: Marine selected from the accessible list with stationary-fire regions enabled from the board-adjacent mode strip.",
  "11-narrow-predicted.png": "Narrow layout: predicted-interaction card reachable below the board without losing the table from view.",
};
const BACKEND_PARITY_MODULES = [
  "packages/authoritative-engine/transition-v1.mjs",
  "packages/client-domain/battle-workbench-v1.mjs",
  "packages/client-domain/battle-workbench-threat-v1.mjs",
  "packages/client-domain/battle-workbench-probability-v1.mjs",
  "packages/client-domain/battle-workbench-write-palette-v1.mjs",
  "packages/client-domain/hosted-bot-seat-transport-v1.mjs",
  "packages/client-domain/portable-contract-hash-v1.mjs",
  "packages/http-adapter/handler-v1.mjs",
  "packages/room-runtime/in-memory-room-v1.mjs",
];
const LEGACY_ADAPTER_INPUT = "../scripts/starcraft-tmg-rules-v0.mjs";
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

async function sha256File(filename) {
  return createHash("sha256").update(await readFile(filename)).digest("hex");
}

async function artifactRecord(filename, explanation = null) {
  return {
    path: path.relative(ROOT, filename),
    byteLength: (await stat(filename)).size,
    sha256: await sha256File(filename),
    ...(explanation ? { explanation } : {}),
  };
}

function runGit(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  ensure(result.status === 0, `GIT_COMMAND_FAILED:${args.join(" ")}`, {
    stderr: String(result.stderr || "").slice(-800),
  });
  return String(result.stdout || "");
}

function resolveBackendRoot() {
  const porcelain = runGit(["worktree", "list", "--porcelain"], ROOT);
  const first = porcelain.split("\n").find((line) => line.startsWith("worktree "));
  ensure(first, "BACKEND_MAIN_WORKTREE_UNRESOLVED");
  const backendRoot = first.slice("worktree ".length).trim();
  ensure(existsSync(path.join(backendRoot, LEGACY_ADAPTER_INPUT)),
    "BACKEND_LEGACY_ADAPTER_INPUT_MISSING", { backendRoot });
  return backendRoot;
}

async function assertBackendParity(backendRoot) {
  const drift = runGit(
    ["diff", "--name-only", BASE_COMMIT, "--", "packages/", "scripts/support/"],
    ROOT,
  ).trim();
  ensure(!drift, "BACKEND_CONTRACT_DRIFT_IN_WORKTREE", { drift });
  const modules = [];
  for (const relative of BACKEND_PARITY_MODULES) {
    const worktreeFile = path.join(ROOT, relative);
    const backendFile = path.join(backendRoot, relative);
    ensure(existsSync(worktreeFile) && existsSync(backendFile),
      "BACKEND_MODULE_MISSING", { relative });
    const worktreeHash = await sha256File(worktreeFile);
    const backendHash = await sha256File(backendFile);
    ensure(worktreeHash === backendHash, "BACKEND_MODULE_HASH_MISMATCH", { relative });
    modules.push({ path: relative, sha256: backendHash });
  }
  return modules;
}

async function importBackend(backendRoot, relative) {
  return import(pathToFileURL(path.join(backendRoot, relative)).href);
}

async function newestSourceMtime() {
  const watched = ["app", "components", "lib", "hooks", "constants", "assets"];
  const files = ["app.config.ts", "babel.config.js", "metro.config.js",
    "tailwind.config.js", "global.css", "package.json"];
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
  for (const name of watched) {
    const target = path.join(EXPO_DIR, name);
    if (existsSync(target)) await walk(target);
  }
  for (const name of files) {
    const target = path.join(EXPO_DIR, name);
    if (existsSync(target)) newest = Math.max(newest, (await stat(target)).mtimeMs);
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

async function runStep(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
  let tail = "";
  child.stdout.on("data", (chunk) => { tail = `${tail}${chunk}`.slice(-4000); });
  child.stderr.on("data", (chunk) => { tail = `${tail}${chunk}`.slice(-4000); });
  const exitCode = await new Promise((resolve) => child.once("exit", resolve));
  ensure(exitCode === 0, `STEP_FAILED:${args.slice(0, 4).join(" ")}`, { tail });
}

async function ensureWebExport() {
  const force = process.env.TICKET25_262_FORCE_EXPORT === "1";
  if (!force && existsSync(path.join(DIST_DIR, "index.html"))) {
    const sourceNewest = await newestSourceMtime();
    const distOldest = await oldestPathMtime(DIST_DIR);
    if (distOldest > sourceNewest) {
      return { exported: false, reason: "existing export is fresher than all frontend sources" };
    }
  }
  const started = Date.now();
  const generatedDir = path.join(BUILD_ROOT, "generated");
  await mkdir(generatedDir, { recursive: true });
  const staticCss = path.join(generatedDir, "static-web.css");
  await runStep("corepack", [
    "pnpm@9.12.0", "--dir", EXPO_DIR, "exec", "tailwindcss",
    "-i", "global.css", "-o", staticCss, "--minify",
  ], {
    env: {
      ...process.env,
      COREPACK_ENABLE_PROJECT_SPEC: "0",
      BROWSERSLIST: "last 1 version",
      BROWSERSLIST_ENV: "native",
    },
  });
  await runStep("corepack", [
    "pnpm@9.12.0", "--dir", EXPO_DIR, "exec", "expo", "export",
    "--platform", "web", "--output-dir", DIST_DIR, "--clear",
  ], {
    env: {
      ...process.env,
      COREPACK_ENABLE_PROJECT_SPEC: "0",
      CI: "1",
      EXPO_OFFLINE: "1",
      NODE_ENV: "production",
      PROJECT_D_LOCAL_WEB_EXPORT: "1",
      PROJECT_D_STATIC_WEB_CSS_INPUT: staticCss,
      EXPO_PUBLIC_STARCRAFT_TMG_LOCAL_WEB_EXPORT: "1",
      EXPO_PUBLIC_STARCRAFT_TMG_MEDIA_RELEASE_CHANNEL: "development_internal",
    },
  });
  ensure(existsSync(path.join(DIST_DIR, "index.html")), "WEB_EXPORT_INDEX_MISSING");
  return { exported: true, elapsedSeconds: (Date.now() - started) / 1000 };
}

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
  const raw = Buffer.concat(chunks);
  return {
    rawBody: raw,
    body: raw.byteLength ? JSON.parse(raw.toString("utf8")) : {},
    bodyBytes: raw.byteLength,
  };
}

function sendJson(response, status, body, headers = {}) {
  const bytes = Buffer.from(JSON.stringify(body), "utf8");
  response.writeHead(status, {
    "cache-control": "private, no-store, max-age=0",
    "content-length": String(bytes.byteLength),
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
    ...headers,
  });
  response.end(bytes);
}

async function startServer(fixture, api) {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://fixture.local");
      const hasBody = ["POST", "PUT", "PATCH"].includes(request.method || "GET");
      const body = hasBody ? await readRequestBody(request) : { body: {} };
      if (url.pathname.startsWith(api.level3Prefix)
        || url.pathname.startsWith("/starcraft-tmg-level3/assets/v1/character/")) {
        const result = await fixture.roomAdapter.handle({
          method: request.method,
          pathname: url.pathname,
          query: url.searchParams,
          headers: request.headers,
          ...body,
        });
        if (result.binary) {
          response.writeHead(result.status, result.headers);
          response.end(result.body);
          return;
        }
        sendJson(response, result.status, result.response);
        return;
      }
      if (url.pathname.startsWith(`${api.botPrefix}/`)) {
        // No hosted bot is attached in this read-only visualization fixture;
        // answer honestly with HTTP 200 so the operations panel renders its
        // own error state without console noise.
        sendJson(response, 200, {
          schemaVersion: api.botHttpVersion,
          result: { ok: false, reason: "HOSTED_BOT_NOT_ATTACHED_IN_FIXTURE" },
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
  ensure(address && typeof address === "object", "FIXTURE_LISTEN_FAILED");
  return { server, origin: `http://127.0.0.1:${address.port}` };
}

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

async function bodyText(page) {
  return page.locator("body").innerText({ timeout: 60_000 });
}

async function waitBody(page, expected, timeout = 60_000) {
  const variants = Array.isArray(expected) ? expected : [expected];
  await page.waitForFunction(
    (texts) => texts.some((text) => (document.body?.innerText || "").includes(text)),
    variants,
    { timeout },
  );
}

async function openPredictedInteractions(page) {
  const text = await bodyText(page);
  if (text.includes("base edge")
    || text.includes("Select a battlefield unit to compare")) return;
  await page.getByRole("button", { name: "Predicted interactions", exact: true })
    .click();
}

function threatCircles(page) {
  return page.locator('circle[id^="battlefield-authoritative-threat-"]');
}

async function capture(page, name, artifacts) {
  const filename = path.join(EVIDENCE_ROOT, name);
  await page.screenshot({ path: filename, fullPage: false });
  artifacts.push(await artifactRecord(filename, SCREENSHOT_EXPLANATIONS[name]));
}

async function main() {
  const started = Date.now();
  await rm(BUILD_ROOT, { recursive: true, force: true });
  await mkdir(EVIDENCE_ROOT, { recursive: true });

  const backendRoot = resolveBackendRoot();
  const parityModules = await assertBackendParity(backendRoot);
  const backendHead = runGit(["rev-parse", "HEAD"], backendRoot).trim();

  const exportInfo = await ensureWebExport();

  const { loadStarcraftTmgData, createStarcraftTmgSampleState } =
    await importBackend(backendRoot, LEGACY_ADAPTER_INPUT);
  const { createStarcraftTmgAuthoritativeEngine, hashStarcraftTmgContract } =
    await importBackend(backendRoot, "packages/authoritative-engine/transition-v1.mjs");
  const { createStarcraftTmgRoomRuntime } =
    await importBackend(backendRoot, "packages/room-runtime/in-memory-room-v1.mjs");
  const { createStarcraftTmgLevel3HttpAdapter, STARCRAFT_TMG_LEVEL3_API_PREFIX } =
    await importBackend(backendRoot, "packages/http-adapter/handler-v1.mjs");
  const { STARCRAFT_TMG_HOSTED_BOT_SEAT_API_PREFIX } = await importBackend(
    backendRoot, "packages/client-domain/hosted-bot-seat-transport-v1.mjs");
  const { hashStarcraftTmgClientContract } = await importBackend(
    backendRoot, "packages/client-domain/portable-contract-hash-v1.mjs");
  const legacyAdapterHash = await sha256File(path.join(backendRoot, LEGACY_ADAPTER_INPUT));

  const data = await loadStarcraftTmgData(path.resolve(backendRoot, ".."));
  const sampleState = createStarcraftTmgSampleState(data);
  // The legacy sample pieces carry unit-level coordinates only. Assign each
  // on-field piece a deterministic, non-overlapping per-model formation (the
  // same fixture treatment serve-ticket-14 applied) so the battlefield
  // projection renders real model bases and the workbench emits per-model
  // threat regions. This edits only the fixture's initial state, never rules.
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
  const engine = createStarcraftTmgAuthoritativeEngine({ now: () => GENERATED_AT });
  const roomRuntime = createStarcraftTmgRoomRuntime({
    authorityEngine: engine,
    characterReleaseChannel: "development_internal",
    now: () => GENERATED_AT,
  });
  const seatPlan = [{
    label: "host",
    seatKey: "player1",
    roleMode: "player",
    principalType: "human",
  }];
  const created = await roomRuntime.createRoom({
    roomId: ROOM_ID,
    gameId: "starcraft-tmg",
    surfaceMode: "classic",
    title: "Ticket 25 · Slice 262 · Threat visualization browser fixture",
    initialStateAuthority: {
      source: "server_factory",
      state: sampleState,
      dataVersion: data.version,
      receiptHash: hashStarcraftTmgContract({
        source: "ticket-25-slice-262-threat-visualization-browser-v1",
        roomId: ROOM_ID,
        state: sampleState,
      }),
      serverSeatPlan: seatPlan,
    },
    serverSeatPlan: seatPlan,
  });
  ensure(created.ok, "FIXTURE_ROOM_CREATE_FAILED", { reason: created.reason });
  const recovery = await roomRuntime.issueSeatRecovery({
    roomId: ROOM_ID,
    seatToken: created.credentials.host.seatToken,
    expectedRoomRevision: 0,
  });
  ensure(recovery.ok && typeof recovery.recovery?.recoveryToken === "string",
    "FIXTURE_RECOVERY_ISSUE_FAILED", { reason: recovery.reason });
  const fixture = {
    roomId: ROOM_ID,
    roomRuntime,
    roomAdapter: createStarcraftTmgLevel3HttpAdapter({
      roomRuntime,
      assetRoot: backendRoot,
    }),
    humanSeatToken: created.credentials.host.seatToken,
    humanRecoveryToken: recovery.recovery.recoveryToken,
  };
  // Seed the product's own local-preference record (language "en"; the same
  // record the Settings surface writes, canAffectRules:false) so both browser
  // contexts render English copy for assertion stability.
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

  const { server, origin } = await startServer(fixture, {
    level3Prefix: STARCRAFT_TMG_LEVEL3_API_PREFIX,
    botPrefix: STARCRAFT_TMG_HOSTED_BOT_SEAT_API_PREFIX,
    botHttpVersion: "starcraft_tmg_hosted_bot_seat_http_v1",
  });
  const recoveryUrl = `${origin}/room/${encodeURIComponent(fixture.roomId)}#recovery=${encodeURIComponent(fixture.humanRecoveryToken)}`;

  const checks = [];
  const artifacts = [];
  const browserErrors = [];
  const secrets = [fixture.humanSeatToken, fixture.humanRecoveryToken];
  let diagnosticPage = null;

  const executablePath = resolveChromiumExecutable();
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
  const chromiumVersion = browser.version();

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
    // ── Desktop journey ────────────────────────────────────────────────
    const desktop = await browser.newContext({
      viewport: { width: 1500, height: 1050 },
      locale: "en-US",
      reducedMotion: "reduce",
    });
    await seedPreferences(desktop);
    const page = await desktop.newPage();
    watch(page, "desktop");
    diagnosticPage = page;

    await page.goto(recoveryUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await waitBody(page, "Authoritative room connected", 120_000);
    await waitBody(page, "Authoritative Battlefield", 120_000);
    await page.getByTestId("battlefield-map-contract-v1").waitFor({ timeout: 60_000 });

    ensure(await threatCircles(page).count() === 0, "THREAT_NOT_OFF_BY_DEFAULT");
    ensure(!(await bodyText(page)).includes("Threat layer:"),
      "THREAT_LEGEND_VISIBLE_WHILE_OFF");
    await capture(page, "01-desktop-threat-off-default.png", artifacts);
    checks.push({ id: "threat_off_by_default_has_no_overlay_glyphs", passed: true });

    // Honest no-selection/unknown state before picking a unit.
    await page.getByRole("button", { name: "Threat", exact: true }).click();
    await waitBody(page, "Threat layers", 120_000);
    await waitBody(page, "Coverage dependencies", 120_000);
    await page.getByRole("button", { name: "Move + fire", exact: true }).first().click();
    await waitBody(page, "Threat layer: Move + fire", 30_000);
    await waitBody(page, "0 projected regions", 30_000);
    ensure((await bodyText(page)).includes(
      "Select a battlefield unit to inspect its threat layer."),
      "UNKNOWN_STATE_NOT_EXPLAINED");
    await openPredictedInteractions(page);
    await waitBody(page, "Select a battlefield unit to compare", 30_000);
    ensure((await bodyText(page)).includes("not exposed by the current client projection"),
      "FIRE_ZONE_GAP_NOT_HONEST_BEFORE_SELECTION");
    await capture(page, "02-desktop-unknown-no-selection.png", artifacts);
    checks.push({ id: "unknown_no_selection_state_is_explicit_not_zero", passed: true });
    checks.push({ id: "fire_zone_exchange_gap_is_honest_unknown", passed: true });

    // Select the on-field friendly Marine from the accessible model list.
    await page.getByRole("button", { name: /^Marine( \d+)? · player1/u }).first().click();
    await page.getByRole("button", { name: "Threat", exact: true }).click();
    await waitBody(page, "Coverage dependencies", 120_000);

    const modeStrip = page.getByRole("tablist", { name: "Threat layer modes" });
    await modeStrip.waitFor({ state: "visible", timeout: 30_000 });

    await modeStrip.getByRole("button", { name: "Stationary fire", exact: true }).click();
    await waitBody(page, "Threat layer: Stationary fire", 30_000);
    const stationaryCount = await threatCircles(page).count();
    ensure(stationaryCount > 0, "STATIONARY_REGIONS_NOT_RENDERED");
    const stationaryRadius = Number(await threatCircles(page).first().getAttribute("r"));
    ensure(Number.isFinite(stationaryRadius) && stationaryRadius > 0,
      "STATIONARY_RADIUS_UNREADABLE");
    await capture(page, "03-desktop-stationary-fire.png", artifacts);
    checks.push({ id: "stationary_mode_renders_projected_regions", passed: true,
      regionCount: stationaryCount });

    await modeStrip.getByRole("button", { name: "Move + fire", exact: true }).click();
    await waitBody(page, "Threat layer: Move + fire", 30_000);
    ensure(await threatCircles(page).count() > 0, "MOVE_FIRE_REGIONS_NOT_RENDERED");
    const moveRadius = Number(await threatCircles(page).first().getAttribute("r"));
    ensure(Number.isFinite(moveRadius) && moveRadius > stationaryRadius,
      "MOVE_FIRE_RADIUS_NOT_LARGER", { stationaryRadius, moveRadius });
    await capture(page, "04-desktop-move-fire.png", artifacts);
    checks.push({ id: "move_fire_mode_visibly_enlarges_envelope", passed: true,
      stationaryRadius, moveRadius });

    await modeStrip.getByRole("button", { name: "Charge", exact: true }).click();
    await waitBody(page, "Threat layer: Charge", 30_000);
    const chargeCount = await threatCircles(page).count();
    ensure(chargeCount > 0, "CHARGE_REGIONS_NOT_RENDERED");
    const chargeStroke = await threatCircles(page).first().getAttribute("stroke");
    ensure(chargeStroke === "#fbbf24", "CHARGE_STROKE_NOT_AMBER", { chargeStroke });
    await waitBody(page, "Charge envelope", 30_000);
    await capture(page, "05-desktop-charge.png", artifacts);
    checks.push({ id: "charge_mode_uses_amber_advisory_envelope", passed: true,
      regionCount: chargeCount });

    await modeStrip.getByRole("button", { name: "Friendly union", exact: true }).click();
    await waitBody(page, "Threat layer: Friendly union", 30_000);
    const friendlyCount = await threatCircles(page).count();
    ensure(friendlyCount > 0, "FRIENDLY_AGGREGATE_EMPTY");
    ensure(/\d+ units · \d+ projected regions/u.test(await bodyText(page)),
      "FRIENDLY_AGGREGATE_FACTS_MISSING");
    await capture(page, "06-desktop-friendly-aggregate.png", artifacts);
    checks.push({ id: "friendly_aggregate_renders_projected_union", passed: true,
      regionCount: friendlyCount });

    await modeStrip.getByRole("button", { name: "Enemy union", exact: true }).click();
    await waitBody(page, "Threat layer: Enemy union", 30_000);
    const enemyCount = await threatCircles(page).count();
    ensure(enemyCount > 0, "ENEMY_AGGREGATE_EMPTY");
    await capture(page, "07-desktop-enemy-aggregate.png", artifacts);
    checks.push({ id: "enemy_aggregate_renders_projected_union", passed: true,
      regionCount: enemyCount });

    // Predicted-interaction comparison for the selected unit.
    await openPredictedInteractions(page);
    await waitBody(page, "base edge", 30_000);
    const predictedBody = await bodyText(page);
    ensure(/base edge [0-9.]+ in/u.test(predictedBody),
      "PREDICTED_RELATIONSHIP_RECEIPT_MISSING");
    ensure(predictedBody.includes("E[dmg]"), "PREDICTED_PROBABILITY_RECEIPT_MISSING");
    ensure(/LegalSpace action refs: \d+/u.test(predictedBody),
      "PREDICTED_LEGALSPACE_REFS_MISSING");
    ensure(predictedBody.includes("not exposed by the current client projection"),
      "FIRE_ZONE_GAP_NOT_HONEST");
    ensure(predictedBody.includes("No sealed Preview on this client"),
      "PREDICTED_PREVIEW_RECEIPT_STATE_MISSING");
    await capture(page, "08-desktop-predicted-interactions.png", artifacts);
    checks.push({ id: "predicted_interaction_card_joins_relationship_and_probability_receipts",
      passed: true });

    // The overlay must not prevent model selection. Three user-visible proofs:
    // (a) every rendered overlay circle computes to pointer-events:none, so
    //     taps pass through to the model glyphs underneath;
    // (b) a board tap over an overlay-covered enemy model hits the model
    //     glyph (not an overlay circle) and behaves exactly as the same tap
    //     with the overlay hidden (parity with the product's baseline tap
    //     routing);
    // (c) the accessible model list selects a unit while the overlay is on.
    const pointerStats = await page.evaluate(() => {
      const nodes = [...document.querySelectorAll(
        'circle[id^="battlefield-authoritative-threat-"]')];
      const styles = nodes.map((node) => getComputedStyle(node).pointerEvents);
      return {
        count: nodes.length,
        noneCount: styles.filter((value) => value === "none").length,
      };
    });
    ensure(pointerStats.count > 0
      && pointerStats.noneCount === pointerStats.count,
      "OVERLAY_GLYPHS_INTERCEPT_POINTER_EVENTS", pointerStats);

    await page.getByRole("button", { name: "Fit", exact: true }).click();
    const enemyGlyph = page.locator('[id^="battlefield-model-player2-"]').first();
    await enemyGlyph.waitFor({ state: "visible", timeout: 30_000 });
    await enemyGlyph.scrollIntoViewIfNeeded();
    const glyphBox = await enemyGlyph.boundingBox();
    ensure(glyphBox && glyphBox.y >= 0 && glyphBox.y + glyphBox.height < 1050,
      "ENEMY_GLYPH_NOT_ON_BOARD", { box: glyphBox });
    const clickPoint = {
      x: glyphBox.x + glyphBox.width / 2,
      y: glyphBox.y + glyphBox.height / 2,
    };
    const hitTarget = await page.evaluate((point) => {
      const element = document.elementFromPoint(point.x, point.y);
      return element
        ? `${element.tagName}#${element.id || ""}`
        : "none";
    }, clickPoint);
    ensure(!hitTarget.includes("battlefield-authoritative-threat"),
      "OVERLAY_CIRCLE_CAPTURES_TAP", { hitTarget });
    const boardSvg = page.locator('[aria-label^="Battlefield;"] svg').first();
    const viewBoxWithOverlay = await boardSvg.getAttribute("viewBox");
    await page.mouse.click(clickPoint.x, clickPoint.y);
    await page.waitForTimeout(1_000);
    const afterOverlayTap = await boardSvg.getAttribute("viewBox");
    await page.getByRole("button", { name: "Hide threat", exact: true }).click();
    ensure(await threatCircles(page).count() === 0, "HIDE_THREAT_FAILED");
    await page.mouse.click(clickPoint.x, clickPoint.y);
    await page.waitForTimeout(1_000);
    const afterBaselineTap = await boardSvg.getAttribute("viewBox");
    ensure((afterOverlayTap !== viewBoxWithOverlay)
      === (afterBaselineTap !== viewBoxWithOverlay),
      "OVERLAY_CHANGED_BASELINE_TAP_ROUTING", {
        overlayTapChangedView: afterOverlayTap !== viewBoxWithOverlay,
        baselineTapChangedView: afterBaselineTap !== viewBoxWithOverlay,
      });
    await page.getByRole("button", { name: "Show threat", exact: true }).click();
    await page.getByRole("button", { name: /· player2/u }).first().click();
    await waitBody(page, "HP/model", 30_000);
    checks.push({ id: "overlay_does_not_block_board_model_selection", passed: true,
      overlayGlyphs: pointerStats.count, hitTarget });

    // Keyboard: Enter on the focused stationary pill switches the mode back.
    await modeStrip.getByRole("button", { name: "Stationary fire", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await waitBody(page, "Threat layer: Stationary fire", 30_000);
    checks.push({ id: "keyboard_enter_switches_threat_mode", passed: true });

    await desktop.close();

    // ── Narrow / touch journey ─────────────────────────────────────────
    // Fresh one-shot recovery ticket for the second session (the first was
    // consumed by the desktop bind), issued through the unchanged runtime.
    const narrowRecovery = await fixture.roomRuntime.issueSeatRecovery({
      roomId: fixture.roomId,
      seatToken: fixture.humanSeatToken,
    });
    ensure(narrowRecovery?.ok === true
      && typeof narrowRecovery.recovery?.recoveryToken === "string",
      "NARROW_RECOVERY_TICKET_NOT_ISSUED", { reason: narrowRecovery?.reason });
    const narrowToken = narrowRecovery.recovery.recoveryToken;
    secrets.push(narrowToken);
    const narrowUrl = `${origin}/room/${encodeURIComponent(fixture.roomId)}#recovery=${encodeURIComponent(narrowToken)}`;

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
    diagnosticPage = narrowPage;
    await narrowPage.goto(narrowUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await waitBody(narrowPage, "Authoritative room connected", 120_000);
    await waitBody(narrowPage, "Authoritative Battlefield", 120_000);

    ensure(await threatCircles(narrowPage).count() === 0,
      "NARROW_THREAT_NOT_OFF_BY_DEFAULT");
    const narrowBoard = narrowPage.locator('[aria-label^="Battlefield;"]').first();
    const narrowBoardBox = await narrowBoard.boundingBox();
    ensure(narrowBoardBox && narrowBoardBox.y < 500 && narrowBoardBox.height >= 240,
      "NARROW_BATTLEFIELD_NOT_FIRST_VIEWPORT_FOCUS", { box: narrowBoardBox });

    await narrowPage.getByRole("button", { name: "Show threat", exact: true }).click();
    const narrowStrip = narrowPage.getByRole("tablist", { name: "Threat layer modes" });
    await narrowStrip.getByRole("button", { name: "Enemy union", exact: true }).click();
    await waitBody(narrowPage, "Threat layer: Enemy union", 30_000);
    ensure(await threatCircles(narrowPage).count() > 0, "NARROW_ENEMY_AGGREGATE_EMPTY");
    const narrowBoardBoxAfter = await narrowBoard.boundingBox();
    ensure(narrowBoardBoxAfter && narrowBoardBoxAfter.y < 500,
      "NARROW_BATTLEFIELD_PUSHED_OUT", { box: narrowBoardBoxAfter });
    await capture(narrowPage, "09-narrow-enemy-aggregate.png", artifacts);
    checks.push({ id: "narrow_viewport_keeps_battlefield_visible_with_overlay",
      passed: true });

    await narrowPage.getByRole("button", { name: /· player1/u }).first().click();
    await narrowStrip.getByRole("button", { name: "Stationary fire", exact: true })
      .click();
    await waitBody(narrowPage, "Threat layer: Stationary fire", 30_000);
    ensure(await threatCircles(narrowPage).count() > 0, "NARROW_STATIONARY_EMPTY");
    await capture(narrowPage, "10-narrow-stationary-selected.png", artifacts);
    checks.push({ id: "narrow_touch_selects_model_and_mode", passed: true });

    await narrowPage.getByRole("button", { name: "Threat", exact: true }).click();
    await openPredictedInteractions(narrowPage);
    await waitBody(narrowPage, "base edge", 30_000);
    await capture(narrowPage, "11-narrow-predicted.png", artifacts);
    checks.push({ id: "narrow_predicted_interaction_card_reachable", passed: true });

    await narrow.close();

    const unexpected = browserErrors.filter((entry) => !/favicon/iu.test(entry));
    ensure(unexpected.length === 0, "BROWSER_ERRORS", { unexpected });
    checks.push({ id: "no_unexpected_browser_errors", passed: true });
  } catch (error) {
    try {
      if (diagnosticPage) {
        await diagnosticPage.screenshot({
          path: path.join(EVIDENCE_ROOT, "failure.png"), fullPage: true,
        });
        error.failureBodyExcerpt = (await diagnosticPage.locator("body")
          .innerText().catch(() => "")).slice(0, 3000);
      }
    } catch {}
    error.browserErrors = browserErrors.slice(0, 20);
    error.checksPassed = checks.map((entry) => entry.id);
    throw error;
  } finally {
    await browser.close();
    server.close();
  }

  const reportCore = {
    schemaVersion: "starcraft_tmg_ticket_25_slice_262_browser_report_v1",
    generatedAt: GENERATED_AT,
    ticket: 25,
    slice: 262,
    subSlice: "threat-visualization-ui",
    status: "passed",
    assertionsPassed: checks.length,
    checks,
    artifacts,
    screenshotExplanations: SCREENSHOT_EXPLANATIONS,
    environment: {
      playwright: "1.59.1",
      chromium: chromiumVersion,
      chromiumExecutable: executablePath
        ? { path: executablePath, sha256: await sha256File(executablePath) }
        : "playwright-managed",
      viewports: [
        { name: "desktop", width: 1500, height: 1050 },
        { name: "narrow-touch", width: 390, height: 844, hasTouch: true },
      ],
      reducedMotion: "reduce",
      locale: "en-US",
    },
    backend: {
      servedFrontend: path.relative(ROOT, DIST_DIR),
      webExport: exportInfo,
      fixture: "legacy sample-state demo room (eight armed units on the battlefield; ticket-14/15 harness factory; no hosted bot, no Provider)",
      legacyAdapterInput: { path: "project-d/scripts/starcraft-tmg-rules-v0.mjs (read-only adapter input)", sha256: legacyAdapterHash },
      roomId: fixture.roomId,
      backendRoot,
      backendHead,
      backendModuleParity: parityModules,
      baseCommit: BASE_COMMIT,
    },
    boundaries: {
      currentProductCodeServed: true,
      backendModulesEdited: false,
      providerCalls: 0,
      paidProviderUsed: false,
      sourceRefreshPerformed: false,
      gameplayTruthComputedInUi: false,
      rangeInferredFromPixels: false,
      unknownRenderedAsZero: false,
      trainingTruth: false,
    },
    elapsedSeconds: Math.round((Date.now() - started) / 100) / 10,
  };
  const serialized = JSON.stringify(reportCore);
  for (const secret of secrets) {
    ensure(!serialized.includes(secret), "PRIVATE_VALUE_IN_BROWSER_REPORT");
  }
  const report = {
    ...reportCore,
    reportHash: createHash("sha256").update(serialized).digest("hex"),
  };
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    ok: true,
    checks: checks.length,
    artifacts: artifacts.length,
    report: path.relative(ROOT, REPORT_PATH),
    reportHash: report.reportHash,
    elapsedSeconds: reportCore.elapsedSeconds,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    code: error?.code || error?.name || "UNKNOWN",
    message: String(error?.message || error).slice(0, 2000),
    details: Object.fromEntries(Object.entries(error || {})
      .filter(([key]) => !["stack", "message", "name", "code"].includes(key))),
  }, null, 2));
  process.exitCode = 1;
});
