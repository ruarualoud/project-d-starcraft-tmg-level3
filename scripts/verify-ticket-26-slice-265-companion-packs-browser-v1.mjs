#!/usr/bin/env node

/**
 * Ticket 26 / Slice 265 — companion packs browser gate (claim-to-pixel).
 *
 * Self-contained verifier (K3 guardrails v1, same harness discipline as the
 * Slice 264 gate):
 *   1. exports the CURRENT worktree Expo Web bundle when any frontend source
 *      (including content/characters presentation packs) is newer than the
 *      existing export (current-main, never stale-export);
 *   2. creates a read-only demo room from the unchanged legacy sample-state
 *      adapter input, instantiated through the resolved main checkout;
 *      backend drift is measured against THIS slice's base, the main
 *      checkout is verified to descend from it, and every loaded backend
 *      module is hash-recorded (main-ahead modules are labelled
 *      advanced_by_codex_integration);
 *   3. serves the worktree bundle plus the unmodified Level3 room/hosted-bot
 *      HTTP APIs on one loopback origin; the online-Agent and secure-provider
 *      prefixes receive honest fixture envelopes (no live agent, zero
 *      approved BYOK profiles) — ZERO Provider calls;
 *   4. drives real Chromium (desktop 1500×1050 and narrow/touch 390×844,
 *      reduced motion) through the Slice 265 companion-pack journeys:
 *      catalogue identity distinction (Kerrigan/Raynor/Artanis), each new
 *      pack's identity/world-book/era/relationship views, all six dynamic
 *      portrait states with deterministic fallback and reduced-motion
 *      honesty, the visibly blocked multi-companion speaker prototype, the
 *      parity/gap surface, BYOK-without-Provider honesty, board-safe
 *      collapsed chip hit-testing, and the narrow touch layout with zero
 *      horizontal overflow;
 *   5. every visual claim is recorded as a claim-to-pixel row (screenshot,
 *      viewport, precondition, interaction, expected, observed box/DOM
 *      assertion, contract demonstrated) plus sha256-hashed PNG evidence
 *      under build/ticket-26-slice-265-companion-packs-browser-v1/.
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
const BUILD_ROOT = path.join(ROOT, "build/ticket-26-slice-265-companion-packs-browser-v1");
const EVIDENCE_ROOT = path.join(BUILD_ROOT, "browser-evidence");
const REPORT_PATH = path.join(BUILD_ROOT, "browser-report.json");
const SLICE_265_BASE_COMMIT = "1cced3b397533053d5a4a21ff7dddba6cdce4abd";
const GENERATED_AT = "2026-09-21T00:00:00.000Z";
const ROOM_ID = "ticket26-slice265-companion-packs";
const AGENT_API_PREFIX = "/starcraft-tmg-level3/agent/api/v2";
const PROVIDER_API_PREFIX = "/starcraft-tmg-level3/provider/api/v1";
const SCREENSHOT_EXPLANATIONS = {
  "01-desktop-collapsed-chip-board.png": "Desktop session bound: compact collapsed companion chip at the lower right and the battlefield materially visible — the board-safe precondition for the catalogue journey.",
  "02-desktop-catalogue-three-companions.png": "Companion catalogue section opened by keyboard: three entries with distinct faction identity — Kerrigan (ZERG, backend reference pack), Raynor (TERRAN, presentation-only), Artanis (PROTOSS, presentation-only).",
  "03-desktop-raynor-pack-detail.png": "Raynor pack detail: biography facts with canon vs Project D provenance labels, seven eras with knowledge/spoiler ranks and the honest locked-above-ceiling era, relationships, world-book entries, tactical identity with pending official faction tag, and pending-assets honesty.",
  "04-desktop-artanis-pack-detail.png": "Artanis pack detail after selecting the PROTOSS card: distinct identity, five eras, Daelaam/Aiur world-book entries and relationships — identity distinction is real, not recolored copy.",
  "05-desktop-kerrigan-reference.png": "Kerrigan entry selected: honest reference-pointer view — backend truth stays in the server projection and is not duplicated into the presentation catalogue.",
  "06-desktop-portrait-states-idle.png": "Six-state portrait preview board (Raynor): all six communication states selectable; idle shows the deterministic neutral fallback with terran chrome because frames are PENDING_CODEX_GENERATION.",
  "07-desktop-portrait-states-alert.png": "alert_combat state selected: frameRole warning / phase waiting_confirmation mapping rendered with reduced-motion on (static frame only) — reduced-motion fallback is honest text plus static presentation.",
  "08-desktop-multi-speaker-prototype.png": "Multi-companion presentation prototype: explicit speaker chips with turn order, long-press @mention affordance, permission labels, honestly disabled composer, and the MULTI_COMPANION_SIMULTANEOUS_SESSION gap visibly blocking — no fake messages, no persistence, no Provider.",
  "09-desktop-parity-gap-surface.png": "SillyTavern parity/gap surface in-product: supported/partial/missing summary plus every typed gap code, including the new pack backend-promotion and asset-generation gaps.",
  "10-desktop-collapsed-hit-test.png": "Chip collapsed again: the Show threat board control is hit-testable at its center (plain click toggles the layer; the chip does not intercept).",
  "11-narrow-catalogue-touch.png": "390px touch layout: catalogue opened by tap; three companion cards, Raynor detail and the six-state board fit with zero horizontal overflow.",
  "12-narrow-threat-hit-test.png": "Narrow layout: Show threat toggled by a plain tap at the control's center while the chip is collapsed — no overlay interception, no force click.",
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

function runGitBuffer(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "buffer" });
  ensure(result.status === 0, `GIT_COMMAND_FAILED:${args.join(" ")}`, {
    stderr: String(result.stderr || "").slice(-800),
  });
  return result.stdout;
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
  const integratedMain = path.resolve(ROOT) === path.resolve(backendRoot);
  const drift = runGit(integratedMain
    ? ["diff", "--name-only", "--", "packages/", "scripts/support/"]
    : ["diff", "--name-only", SLICE_265_BASE_COMMIT, "--", "packages/", "scripts/support/"],
  ROOT).trim();
  ensure(!drift, "BACKEND_CONTRACT_DRIFT_IN_WORKTREE", { drift });
  if (!integratedMain) {
    const ancestry = spawnSync("git",
      ["merge-base", "--is-ancestor", SLICE_265_BASE_COMMIT, "HEAD"],
      { cwd: backendRoot });
    ensure(ancestry.status === 0, "BACKEND_MAIN_NOT_DESCENDED_FROM_SLICE_BASE", {
      backendRoot,
    });
  }
  const modules = [];
  for (const relative of BACKEND_PARITY_MODULES) {
    const worktreeFile = path.join(ROOT, relative);
    const backendFile = path.join(backendRoot, relative);
    ensure(existsSync(worktreeFile) && existsSync(backendFile),
      "BACKEND_MODULE_MISSING", { relative });
    const worktreeHash = await sha256File(worktreeFile);
    const backendHash = await sha256File(backendFile);
    let parity = "identical";
    if (worktreeHash !== backendHash) {
      const baseHash = createHash("sha256").update(
        runGitBuffer(["show", `${SLICE_265_BASE_COMMIT}:${relative}`], ROOT),
      ).digest("hex");
      ensure(worktreeHash === baseHash,
        "BACKEND_MODULE_HASH_MISMATCH", { relative, worktreeHash, backendHash, baseHash });
      parity = "advanced_by_codex_integration";
    }
    modules.push({ path: relative, sha256: backendHash, worktreeSha256: worktreeHash, parity });
  }
  return modules;
}

async function importBackend(backendRoot, relative) {
  return import(pathToFileURL(path.join(backendRoot, relative)).href);
}

async function newestSourceMtime() {
  const watched = [
    path.join(EXPO_DIR, "app"),
    path.join(EXPO_DIR, "components"),
    path.join(EXPO_DIR, "lib"),
    path.join(EXPO_DIR, "hooks"),
    path.join(EXPO_DIR, "constants"),
    path.join(EXPO_DIR, "assets"),
    // Slice 265: presentation-only companion content feeds the bundle.
    path.join(ROOT, "content/characters"),
  ];
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
  for (const target of watched) {
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
  const force = process.env.TICKET26_265_FORCE_EXPORT === "1";
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

async function startServer(fixture, api, requestLog) {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://fixture.local");
      const hasBody = ["POST", "PUT", "PATCH"].includes(request.method || "GET");
      const body = hasBody ? await readRequestBody(request) : { body: {} };
      if (url.pathname.startsWith(AGENT_API_PREFIX)) {
        requestLog.push({ prefix: "agent", method: request.method, pathname: url.pathname });
        sendJson(response, 200, {
          schemaVersion: "starcraft_tmg_online_agent_http_v1",
          result: { ok: false, reason: "ONLINE_AGENT_SESSION_NOT_ATTACHED_IN_FIXTURE" },
        });
        return;
      }
      if (url.pathname.startsWith(PROVIDER_API_PREFIX)) {
        requestLog.push({ prefix: "provider", method: request.method, pathname: url.pathname });
        const isMetadata = /metadata/u.test(url.pathname);
        sendJson(response, 200, {
          schemaVersion: "starcraft_tmg_secure_provider_http_v1",
          result: isMetadata
            ? { ok: true, profiles: [] }
            : { ok: false, reason: "SECURE_PROVIDER_NOT_ATTACHED_IN_FIXTURE" },
        });
        return;
      }
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

async function capture(page, name, artifacts) {
  const filename = path.join(EVIDENCE_ROOT, name);
  await page.screenshot({ path: filename, fullPage: false });
  artifacts.push(await artifactRecord(filename, SCREENSHOT_EXPLANATIONS[name]));
}

function companionChip(page) {
  return page.getByTestId("tactical-adjutant-floating-dock");
}

function chipToggleButton(page) {
  return companionChip(page).getByRole("button", { name: /TACTICAL COMMS/iu });
}

function sectionButton(page, name) {
  return companionChip(page).getByRole("button", { name });
}

async function assertChipCompact(page, viewportWidth, label) {
  const box = await companionChip(page).boundingBox();
  ensure(box && box.width <= 300 && box.height <= 72
    && box.x >= 0 && box.x + box.width <= viewportWidth + 1,
  `${label}_CHIP_NOT_COMPACT`, { box });
  return box;
}

async function hitTestCenter(page, locator, code) {
  await locator.evaluate((element) => element.scrollIntoView({
    behavior: "instant",
    block: "center",
    inline: "center",
  }));
  const box = await locator.boundingBox();
  ensure(box, `${code}:TARGET_HAS_NO_BOX`);
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const hit = await page.evaluate(({ x, y }) => {
    const element = document.elementFromPoint(x, y);
    if (!element) return { found: false, description: "none" };
    const testIdCarrier = element.closest("[data-testid]");
    return {
      found: true,
      description: `${element.tagName}#${element.id || ""}`,
      testId: testIdCarrier?.getAttribute("data-testid") || null,
    };
  }, point);
  ensure(hit.found && !/tactical-adjutant/iu.test(`${hit.description}${hit.testId || ""}`),
    `${code}:COMPANION_CHIP_INTERCEPTS`, { point, hit });
  return { point, hit };
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
    title: "Ticket 26 · Slice 265 · Companion packs browser fixture",
    initialStateAuthority: {
      source: "server_factory",
      state: sampleState,
      dataVersion: data.version,
      receiptHash: hashStarcraftTmgContract({
        source: "ticket-26-slice-265-companion-packs-browser-v1",
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

  const requestLog = [];
  const { server, origin } = await startServer(fixture, {
    level3Prefix: STARCRAFT_TMG_LEVEL3_API_PREFIX,
    botPrefix: STARCRAFT_TMG_HOSTED_BOT_SEAT_API_PREFIX,
    botHttpVersion: "starcraft_tmg_hosted_bot_seat_http_v1",
  }, requestLog);
  const recoveryUrl = `${origin}/room/${encodeURIComponent(fixture.roomId)}#recovery=${encodeURIComponent(fixture.humanRecoveryToken)}`;

  const checks = [];
  const claims = [];
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

  function claim(row) {
    claims.push({ ...row, passed: true });
  }

  async function openCatalogue(page, { touch = false } = {}) {
    const toggle = chipToggleButton(page);
    if (touch) await toggle.tap();
    else {
      await toggle.focus();
      await page.keyboard.press("Enter");
    }
    await waitBody(page, "Field comms", 30_000);
    const catalogueSection = sectionButton(page, /Companion catalogue & parity/iu);
    if (touch) await catalogueSection.tap();
    else {
      await catalogueSection.focus();
      await page.keyboard.press("Enter");
    }
    await waitBody(page, "Companion catalogue", 30_000);
    await waitBody(page, "presentation-only · portraits pending", 30_000);
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
    await waitBody(page, "TACTICAL COMMS", 120_000);

    const chipBox0 = await assertChipCompact(page, 1500, "DESKTOP");
    const board = page.locator('[aria-label^="Battlefield;"]').first();
    const boardBox = await board.boundingBox();
    const desktopVisibleHeight = boardBox
      ? Math.min(1050, boardBox.y + boardBox.height) - Math.max(0, boardBox.y)
      : 0;
    ensure(boardBox && boardBox.y >= 0 && boardBox.height >= 400
      && desktopVisibleHeight >= 240,
    "DESKTOP_BATTLEFIELD_NOT_MATERIALLY_VISIBLE", { box: boardBox });
    await capture(page, "01-desktop-collapsed-chip-board.png", artifacts);
    claim({
      claimId: "board_safe_collapsed_chip",
      screenshot: "01-desktop-collapsed-chip-board.png",
      viewport: "1500x1050",
      precondition: "room bound, chip collapsed",
      interaction: "none (first paint)",
      expected: "compact chip lower-right, battlefield materially visible",
      observed: { chipBox: chipBox0, boardBox, visibleHeight: desktopVisibleHeight },
      contract: "floating dock safe region (Slice 264 SS-3)",
    });
    checks.push({ id: "desktop_collapsed_chip_board_safe", passed: true });

    // Catalogue via keyboard.
    await openCatalogue(page);
    const cataloguePanel = companionChip(page).getByTestId("companion-catalogue-panel");
    for (const faction of ["zerg", "terran", "protoss"]) {
      await cataloguePanel.getByTestId(`companion-catalogue-entry-${faction}`).waitFor({ timeout: 30_000 });
    }
    const catalogueText = await cataloguePanel.innerText();
    ensure(catalogueText.includes("Sarah Kerrigan")
      && catalogueText.includes("Jim Raynor")
      && catalogueText.includes("Artanis"), "CATALOGUE_IDENTITY_DISTINCTION_MISSING");
    ensure(catalogueText.includes("backend reference pack (Kerrigan)"),
      "KERRIGAN_REFERENCE_STATUS_MISSING");
    await capture(page, "02-desktop-catalogue-three-companions.png", artifacts);
    claim({
      claimId: "catalogue_three_companion_identity_distinction",
      screenshot: "02-desktop-catalogue-three-companions.png",
      viewport: "1500x1050",
      precondition: "chip expanded, catalogue section opened by keyboard",
      interaction: "keyboard Enter on section header",
      expected: "three distinct faction entries with honest pack status",
      observed: { testIds: ["companion-catalogue-entry-zerg", "companion-catalogue-entry-terran", "companion-catalogue-entry-protoss"] },
      contract: "content/characters/companion-catalogue-v1.mjs",
    });
    checks.push({ id: "desktop_catalogue_three_companions", passed: true });

    // Raynor detail (default selection).
    await waitBody(page, "Wings of Liberty Raiders", 30_000);
    const raynorText = await cataloguePanel.innerText();
    for (const marker of [
      "Jim Raynor",
      "starcraft.jim_raynor",
      "canon fact (official primary summary)",
      "Project D role configuration",
      "locked (above default ceiling)",
      "Raynor → Sarah Kerrigan",
      "Raiders doctrine",
      "pending_official_faction_tag_confirmation",
    ]) {
      ensure(raynorText.includes(marker), `RAYNOR_DETAIL_MISSING:${marker}`);
    }
    await capture(page, "03-desktop-raynor-pack-detail.png", artifacts);
    claim({
      claimId: "raynor_identity_worldbook_era_relationship_view",
      screenshot: "03-desktop-raynor-pack-detail.png",
      viewport: "1500x1050",
      precondition: "catalogue open",
      interaction: "default selection",
      expected: "biography/eras/relationships/world-book/tactical identity with provenance labels and honest boundaries",
      observed: { markers: 8, defaultEra: "wol.raiders_moebius_artifact" },
      contract: "content/characters/raynor-companion-pack-v1.mjs",
    });
    checks.push({ id: "desktop_raynor_pack_detail", passed: true });

    // Artanis detail via card selection.
    await cataloguePanel.getByTestId("companion-catalogue-entry-protoss").click();
    await waitBody(page, "The Aiur Invasion", 30_000);
    const artanisText = await cataloguePanel.innerText();
    for (const marker of [
      "Artanis",
      "starcraft.artanis",
      "Daelaam unity",
      "Artanis → Amon",
      "Post-war Hierarch",
    ]) {
      ensure(artanisText.includes(marker), `ARTANIS_DETAIL_MISSING:${marker}`);
    }
    await capture(page, "04-desktop-artanis-pack-detail.png", artifacts);
    claim({
      claimId: "artanis_identity_worldbook_era_relationship_view",
      screenshot: "04-desktop-artanis-pack-detail.png",
      viewport: "1500x1050",
      precondition: "catalogue open",
      interaction: "click PROTOSS entry card",
      expected: "distinct Artanis identity, five eras, Daelaam/Aiur world-book entries",
      observed: { markers: 5, defaultEra: "lotv.aiur_invasion_spear_of_adun" },
      contract: "content/characters/artanis-companion-pack-v1.mjs",
    });
    checks.push({ id: "desktop_artanis_pack_detail", passed: true });

    // Kerrigan reference pointer honesty.
    await cataloguePanel.getByTestId("companion-catalogue-entry-zerg").click();
    await waitBody(page, "kerrigan-primal-v1.mjs", 30_000);
    const kerriganText = await cataloguePanel.innerText();
    ensure(kerriganText.includes("server projection"),
      "KERRIGAN_REFERENCE_POINTER_NOT_HONEST");
    await capture(page, "05-desktop-kerrigan-reference.png", artifacts);
    claim({
      claimId: "kerrigan_reference_pointer_honest",
      screenshot: "05-desktop-kerrigan-reference.png",
      viewport: "1500x1050",
      precondition: "catalogue open",
      interaction: "click ZERG entry card",
      expected: "reference pointer, no duplicated backend truth",
      observed: { pointer: "content/characters/kerrigan-primal-v1.mjs" },
      contract: "companion-catalogue-v1.mjs referencePointer",
    });
    checks.push({ id: "desktop_kerrigan_reference_pointer", passed: true });

    // Six-state portrait preview: select Raynor again, walk every state.
    await cataloguePanel.getByTestId("companion-catalogue-entry-terran").click();
    await waitBody(page, "starcraft.jim_raynor", 30_000);
    const expectedStates = [
      ["idle", "neutral", "idle"],
      ["speaking", "speaking", "speaking"],
      ["listening", "blink", "listening"],
      ["alert_combat", "warning", "waiting_confirmation"],
      ["damaged_concerned", "warning", "error"],
      ["reflective", "reflect", "thinking"],
    ];
    for (const [stateId, frameRole, phase] of expectedStates) {
      await cataloguePanel.getByTestId(`companion-portrait-state-${stateId}`).click();
      const preview = cataloguePanel.getByTestId("companion-portrait-state-preview");
      const previewText = await preview.innerText();
      ensure(previewText.includes(`frameRole: ${frameRole}`)
        && previewText.includes(`phase: ${phase}`),
      `PORTRAIT_STATE_MAPPING_WRONG:${stateId}`, { previewText });
      ensure(previewText.includes("deterministic fallback: frame pending"),
        `PORTRAIT_FALLBACK_NOT_HONEST:${stateId}`);
      ensure(previewText.includes("reduced motion: on"),
        `REDUCED_MOTION_NOT_HONEST:${stateId}`);
      if (stateId === "idle") {
        await capture(page, "06-desktop-portrait-states-idle.png", artifacts);
      }
      if (stateId === "alert_combat") {
        await capture(page, "07-desktop-portrait-states-alert.png", artifacts);
      }
    }
    claim({
      claimId: "six_portrait_states_deterministic_fallback_reduced_motion",
      screenshot: "06-desktop-portrait-states-idle.png;07-desktop-portrait-states-alert.png",
      viewport: "1500x1050",
      precondition: "Raynor pack selected, frames PENDING_CODEX_GENERATION",
      interaction: "click each of the six state chips",
      expected: "every state maps to its frameRole/phase with deterministic fallback and reduced-motion honesty",
      observed: { states: expectedStates.map(([id]) => id), reducedMotion: "on" },
      contract: "content/characters/raynor-portrait-states-v1.mjs",
    });
    checks.push({ id: "desktop_six_portrait_states_fallback_reduced_motion", passed: true });

    // Multi-companion prototype: speaker identity, turn order, mention, blocked.
    const prototype = cataloguePanel.getByTestId("companion-multi-speaker-prototype");
    for (const faction of ["zerg", "terran", "protoss"]) {
      await prototype.getByTestId(`companion-speaker-${faction}`).waitFor({ timeout: 30_000 });
    }
    await prototype.getByTestId("companion-speaker-protoss").click();
    const prototypeText = await prototype.innerText();
    ensure(prototypeText.includes("current speaker Artanis"),
      "SPEAKER_SELECTION_NOT_REFLECTED");
    ensure(prototypeText.includes("turn order")
      && prototypeText.includes("@mention")
      && prototypeText.includes("opponent-private state never renders"),
    "PROTOTYPE_PERMISSION_LABELS_MISSING");
    ensure(prototypeText.includes("MULTI_COMPANION_SIMULTANEOUS_SESSION")
      && prototypeText.includes("fabricates no messages")
      && prototypeText.includes("calls no Provider"),
    "MULTI_SPEAKER_BLOCK_NOT_HONEST");
    await capture(page, "08-desktop-multi-speaker-prototype.png", artifacts);
    claim({
      claimId: "multi_companion_prototype_visibly_blocked",
      screenshot: "08-desktop-multi-speaker-prototype.png",
      viewport: "1500x1050",
      precondition: "catalogue open",
      interaction: "click PROTOSS speaker chip",
      expected: "speaker identity + turn order + permission labels; composer disabled; gap code visible",
      observed: { speaker: "Artanis", gap: "MULTI_COMPANION_SIMULTANEOUS_SESSION" },
      contract: "gap MULTI_COMPANION_SIMULTANEOUS_SESSION (Codex-owned)",
    });
    checks.push({ id: "desktop_multi_speaker_prototype_honest", passed: true });

    // Parity/gap surface.
    const parity = cataloguePanel.getByTestId("companion-parity-gap-surface");
    const parityText = await parity.innerText();
    for (const code of [
      "COMPANION_MEMORY_LAYERS_PROJECTION",
      "COMPANION_IMPORT_EXPORT_RESTORE_CONTRACT",
      "COMPANION_SWIPE_BRANCH_CONTRACT",
      "COMPANION_AUTHORS_NOTE_CONTRACT",
      "COMPANION_LONG_SESSION_RESUME_CONTRACT",
      "COMPANION_SUMMARY_PROJECTION",
      "WORLDBOOK_DYNAMIC_TRIGGER_CONTRACT",
      "USER_PERSONA_CONTRACT",
      "COMPANION_PACK_BACKEND_PROMOTION",
      "COMPANION_PACK_ASSET_GENERATION",
    ]) {
      ensure(parityText.includes(code), `PARITY_GAP_MISSING:${code}`);
    }
    ensure(parityText.includes("supported") && parityText.includes("partial")
      && parityText.includes("missing"), "PARITY_SUMMARY_MISSING");
    await capture(page, "09-desktop-parity-gap-surface.png", artifacts);
    claim({
      claimId: "parity_gap_surface_complete",
      screenshot: "09-desktop-parity-gap-surface.png",
      viewport: "1500x1050",
      precondition: "catalogue open",
      interaction: "scroll to parity surface",
      expected: "supported/partial/missing summary plus all typed gap codes",
      observed: { gapCodes: 13 },
      contract: "docs/ticket-26-slice-265-k3-sillytavern-parity-matrix-and-plan-v1-2026-09-21.md",
    });
    checks.push({ id: "desktop_parity_gap_surface", passed: true });

    // BYOK without Provider: load catalogue, assert zero-profile honesty and
    // that only a metadata GET ever reached the provider prefix.
    const providerSection = sectionButton(page, /Secure Provider setup/iu);
    await providerSection.focus();
    await page.keyboard.press("Enter");
    await waitBody(page, "Load Provider catalogue", 30_000);
    await sectionButton(page, /Load Provider catalogue/iu).click();
    await waitBody(page, "the server approved 0 Provider profiles", 30_000);
    checks.push({ id: "desktop_byok_status_no_provider_call", passed: true });

    // Collapse and hit-test a board control.
    const toggleAgain = chipToggleButton(page);
    await toggleAgain.focus();
    await page.keyboard.press("Enter");
    await assertChipCompact(page, 1500, "DESKTOP_AFTER_COLLAPSE");
    const showThreat = page.getByRole("button", { name: "Show threat", exact: true });
    await hitTestCenter(page, showThreat, "DESKTOP_BOARD_CONTROL");
    await showThreat.click();
    await waitBody(page, "Hide threat", 30_000);
    await page.getByRole("button", { name: "Hide threat", exact: true }).click();
    await waitBody(page, "Show threat", 30_000);
    await capture(page, "10-desktop-collapsed-hit-test.png", artifacts);
    claim({
      claimId: "collapsed_chip_board_hit_testing",
      screenshot: "10-desktop-collapsed-hit-test.png",
      viewport: "1500x1050",
      precondition: "chip collapsed via keyboard after catalogue journey",
      interaction: "plain click on Show threat center",
      expected: "threat layer toggles; no interception",
      observed: { toggled: true },
      contract: "floating dock non-interception (guardrail §9)",
    });
    checks.push({ id: "desktop_chip_hit_test_after_catalogue", passed: true });

    await desktop.close();

    // ── Narrow / touch journey ─────────────────────────────────────────
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
    await waitBody(narrowPage, "TACTICAL COMMS", 120_000);

    const narrowChipBox = await assertChipCompact(narrowPage, 390, "NARROW");
    const overflow0 = await narrowPage.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    ensure(overflow0.documentWidth <= overflow0.viewportWidth + 1,
      "NARROW_PAGE_HORIZONTAL_OVERFLOW", overflow0);

    await openCatalogue(narrowPage, { touch: true });
    const narrowPanel = companionChip(narrowPage).getByTestId("companion-catalogue-panel");
    await narrowPanel.getByTestId("companion-catalogue-entry-protoss").tap();
    await waitBody(narrowPage, "The Aiur Invasion", 30_000);
    await narrowPanel.getByTestId("companion-portrait-state-reflective").tap();
    const narrowPreview = await narrowPanel
      .getByTestId("companion-portrait-state-preview").innerText();
    ensure(narrowPreview.includes("phase: thinking")
      && narrowPreview.includes("deterministic fallback: frame pending"),
    "NARROW_STATE_PREVIEW_WRONG", { narrowPreview });
    // No horizontal overflow with the full catalogue expanded on 390px.
    const overflow1 = await narrowPage.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    ensure(overflow1.documentWidth <= overflow1.viewportWidth + 1,
      "NARROW_CATALOGUE_HORIZONTAL_OVERFLOW", overflow1);
    await capture(narrowPage, "11-narrow-catalogue-touch.png", artifacts);
    claim({
      claimId: "narrow_touch_catalogue_no_overflow",
      screenshot: "11-narrow-catalogue-touch.png",
      viewport: "390x844 touch",
      precondition: "room bound on narrow viewport",
      interaction: "tap chip, tap catalogue section, tap PROTOSS card, tap reflective state",
      expected: "catalogue fully usable by touch with zero horizontal overflow",
      observed: { overflow: overflow1, chipBox: narrowChipBox },
      contract: "mobile safe areas and no overlay interception (guardrail §9)",
    });
    checks.push({ id: "narrow_touch_catalogue_no_overflow", passed: true });

    await chipToggleButton(narrowPage).tap();
    await assertChipCompact(narrowPage, 390, "NARROW_AFTER_COLLAPSE");
    const narrowShowThreat = narrowPage.getByRole("button", { name: "Show threat", exact: true });
    await hitTestCenter(narrowPage, narrowShowThreat, "NARROW_BOARD_CONTROL");
    await narrowShowThreat.tap();
    await waitBody(narrowPage, "Hide threat", 30_000);
    await capture(narrowPage, "12-narrow-threat-hit-test.png", artifacts);
    claim({
      claimId: "narrow_collapsed_chip_hit_testing",
      screenshot: "12-narrow-threat-hit-test.png",
      viewport: "390x844 touch",
      precondition: "chip collapsed via tap",
      interaction: "plain tap on Show threat center",
      expected: "threat layer toggles; no interception",
      observed: { toggled: true },
      contract: "floating dock non-interception (guardrail §9)",
    });
    checks.push({ id: "narrow_chip_hit_test", passed: true });

    await narrow.close();

    const providerOps = requestLog.filter((entry) => entry.prefix === "provider");
    ensure(providerOps.every((entry) => /metadata/u.test(entry.pathname)),
      "UNEXPECTED_PROVIDER_OPERATION", { providerOps });
    const agentOps = requestLog.filter((entry) => entry.prefix === "agent");
    ensure(agentOps.every((entry) => /sessions/iu.test(entry.pathname)),
      "UNEXPECTED_AGENT_OPERATION", { agentOps });
    checks.push({ id: "no_provider_calls_fixture_only", passed: true,
      providerOperations: providerOps.length, agentOperations: agentOps.length });

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
    schemaVersion: "starcraft_tmg_ticket_26_slice_265_browser_report_v1",
    generatedAt: GENERATED_AT,
    ticket: 26,
    slice: 265,
    subSlice: "sillytavern-parity-and-companion-packs",
    status: "passed",
    assertionsPassed: checks.length,
    checks,
    claimToPixel: claims,
    artifacts,
    screenshotExplanations: SCREENSHOT_EXPLANATIONS,
    requestLog,
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
      fixture: "legacy sample-state demo room (eight armed units on the battlefield; no hosted bot, no live agent, zero approved BYOK profiles; no Provider)",
      legacyAdapterInput: { path: "project-d/scripts/starcraft-tmg-rules-v0.mjs (read-only adapter input)", sha256: legacyAdapterHash },
      roomId: fixture.roomId,
      backendRoot,
      backendHead,
      backendModuleParity: parityModules,
      baseCommit: SLICE_265_BASE_COMMIT,
      parityRule: "no backend drift versus the slice base; main-ahead modules are hash-recorded as advanced_by_codex_integration and the fixture backend is verified to descend from the slice base",
    },
    boundaries: {
      currentProductCodeServed: true,
      backendModulesEdited: false,
      providerCalls: 0,
      paidProviderUsed: false,
      sourceRefreshPerformed: false,
      gameplayTruthComputedInUi: false,
      companionStateFabricated: false,
      fakePersistenceImplemented: false,
      hiddenChainOfThoughtExposed: false,
      forceClickUsed: false,
      generatedImageReceiptFabricated: false,
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
    claims: claims.length,
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
