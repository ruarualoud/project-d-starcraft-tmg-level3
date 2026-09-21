#!/usr/bin/env node

/**
 * Ticket 26 / Slice 264 — real-browser companion experience journey.
 *
 * Self-contained verifier (K3 guardrails v1):
 *   1. exports the CURRENT worktree Expo Web bundle when any frontend source
 *      is newer than the existing export (current-main, never stale-export);
 *   2. creates a read-only demo room from the unchanged legacy sample-state
 *      adapter input, instantiated through the resolved main checkout;
 *      backend drift is measured against THIS slice's base, the main
 *      checkout is verified to descend from it, and every loaded backend
 *      module is hash-recorded (main-ahead modules are labelled
 *      advanced_by_codex_integration);
 *   3. serves the worktree bundle plus the unmodified Level3 room/hosted-bot
 *      HTTP APIs on one loopback origin; the online-Agent and secure-provider
 *      prefixes receive honest fixture envelopes (no live agent, zero
 *      approved BYOK profiles) so unavailable states are exercised for real
 *      with ZERO Provider calls;
 *   4. drives real Chromium (desktop 1500×1050 and narrow/touch 390×844,
 *      reduced motion) through the Tavern-equivalent companion journey:
 *      compact collapsed chip geometry, keyboard and touch expand/collapse,
 *      progressive-disclosure sections, explicit seat permission posture,
 *      world-book/persona honesty, relationship/memory/multi-speaker/
 *      import-export contract-gap honesty, session-open rejection rendered
 *      honestly, BYOK empty-catalogue honesty, and board-control hit-testing
 *      with the chip collapsed (no force clicks, both viewport bounds and
 *      visible board height checked);
 *   5. writes a git-ignored machine-readable report plus PNG evidence set
 *      with sha256 hashes under
 *      build/ticket-26-slice-264-companion-experience-browser-v1/.
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
const BUILD_ROOT = path.join(ROOT, "build/ticket-26-slice-264-companion-experience-browser-v1");
const EVIDENCE_ROOT = path.join(BUILD_ROOT, "browser-evidence");
const REPORT_PATH = path.join(BUILD_ROOT, "browser-report.json");
const SLICE_264_BASE_COMMIT = "1cced3b397533053d5a4a21ff7dddba6cdce4abd";
const GENERATED_AT = "2026-09-21T00:00:00.000Z";
const ROOM_ID = "ticket26-slice264-companion";
const AGENT_API_PREFIX = "/starcraft-tmg-level3/agent/api/v2";
const PROVIDER_API_PREFIX = "/starcraft-tmg-level3/provider/api/v1";
const SCREENSHOT_EXPLANATIONS = {
  "01-desktop-collapsed-chip.png": "Freshly bound desktop session: the companion is a compact collapsed chip at the lower right (shrink-wrapped, far narrower than the viewport) and the battlefield is unobstructed.",
  "02-desktop-field-comms.png": "Field comms section expanded via keyboard: portrait frame (or its honest fail-closed withheld state), persona copy and the session hint; no board control is covered.",
  "03-desktop-identity-worldbook.png": "Companion & world book section: identity/world-book facts when the projection validates, or the honest fail-closed withheld line with the rejection code; the multi-companion card explains sequential personas and names MULTI_COMPANION_SIMULTANEOUS_SESSION as not exposed.",
  "04-desktop-memory-relationship.png": "Relationship & memory section: session transcript bounds, safe memory hash-ref status, real continuity (server-held seat selection / sealed offline snapshot) and honest gap cards for relationship state, layered memory and import/export/restore.",
  "05-desktop-session-permission.png": "Session controls: explicit seat permission posture (player-visible reads only, opponent-private hidden, inference labelled, modelMayConfirm/modelMayApply false, agent-vs-agent observer/off, review separate) plus the honestly rendered session-open rejection and zero Provider calls.",
  "06-desktop-byok-empty-catalogue.png": "Secure Provider setup: disclosure text, catalogue loaded with zero server-approved profiles (honest unavailable, loading never calls a model).",
  "07-desktop-diagnostics.png": "Diagnostics: safe-trace honesty (no turn yet), session/character projection status and rejection code, rawPromptExposed/rawProviderOutputExposed false.",
  "08-desktop-collapsed-hit-test.png": "Chip collapsed again via keyboard: the Show threat board control is hit-testable at its center (the chip does not intercept), proven by a plain click toggling the layer.",
  "09-narrow-collapsed.png": "390px touch layout: compact chip, zero document horizontal overflow, and the battlefield materially visible (both viewport bounds and >= 240px visible height).",
  "10-narrow-session-touch.png": "Narrow layout: chip expanded by touch, Session controls reachable, permission posture legible; the chip never overlaps the board.",
  "11-narrow-threat-hit-test.png": "Narrow layout: Show threat toggled by a plain tap at the control's center while the chip is collapsed — no overlay interception, no force click.",
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
  // (a) This slice must not drift backend code relative to its own base.
  const drift = runGit(integratedMain
    ? ["diff", "--name-only", "--", "packages/", "scripts/support/"]
    : ["diff", "--name-only", SLICE_264_BASE_COMMIT, "--", "packages/", "scripts/support/"],
  ROOT).trim();
  ensure(!drift, "BACKEND_CONTRACT_DRIFT_IN_WORKTREE", { drift });
  // (b) The fixture backend (main checkout) must descend from the slice base.
  if (!integratedMain) {
    const ancestry = spawnSync("git",
      ["merge-base", "--is-ancestor", SLICE_264_BASE_COMMIT, "HEAD"],
      { cwd: backendRoot });
    ensure(ancestry.status === 0, "BACKEND_MAIN_NOT_DESCENDED_FROM_SLICE_BASE", {
      backendRoot,
    });
  }
  // (c) Every loaded backend module is hash-recorded; differing bytes are
  // allowed only when the worktree copy is byte-identical to the slice base.
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
        runGitBuffer(["show", `${SLICE_264_BASE_COMMIT}:${relative}`], ROOT),
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
  const force = process.env.TICKET26_264_FORCE_EXPORT === "1";
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
        // Honest fixture envelope: no live online-Agent session service is
        // attached, so the companion UI must render its unavailable state.
        requestLog.push({ prefix: "agent", method: request.method, pathname: url.pathname });
        sendJson(response, 200, {
          schemaVersion: "starcraft_tmg_online_agent_http_v1",
          result: { ok: false, reason: "ONLINE_AGENT_SESSION_NOT_ATTACHED_IN_FIXTURE" },
        });
        return;
      }
      if (url.pathname.startsWith(PROVIDER_API_PREFIX)) {
        // Honest BYOK fixture: the catalogue answers with zero approved
        // profiles (loading it never calls a model); every other operation
        // is honestly unavailable.
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

async function hitTestCenter(page, locator, expectedTestIdSubstring, code) {
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

async function resetScrollToSurfaceTop(page) {
  await page.evaluate(() => {
    const board = document.querySelector('[aria-label^="Battlefield;"]');
    let node = board ? board.parentElement : null;
    while (node) {
      const style = getComputedStyle(node);
      if (/(auto|scroll)/u.test(style.overflowY) && node.scrollHeight > node.clientHeight) {
        node.scrollTop = 0;
        node.scrollLeft = 0;
      }
      node = node.parentElement;
    }
    window.scrollTo(0, 0);
  });
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
    title: "Ticket 26 · Slice 264 · Companion experience browser fixture",
    initialStateAuthority: {
      source: "server_factory",
      state: sampleState,
      dataVersion: data.version,
      receiptHash: hashStarcraftTmgContract({
        source: "ticket-26-slice-264-companion-experience-browser-v1",
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
  const artifacts = [];
  const browserErrors = [];
  const secrets = [fixture.humanSeatToken, fixture.humanRecoveryToken];
  let diagnosticPage = null;
  let characterState = "unknown";

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

  async function openSession(page, label) {
    // Expand the chip with the keyboard exactly as a user would.
    const toggle = chipToggleButton(page);
    await toggle.focus();
    await page.keyboard.press("Enter");
    await waitBody(page, "Field comms", 30_000);
    checks.push({ id: `${label}_keyboard_enter_expands_chip`, passed: true });
  }

  async function ensureSectionOpen(page, name, marker, { touch = false } = {}) {
    // Session controls auto-opens while no session is active; only toggle
    // when the marker is not already rendered (never close by accident).
    if (!(await bodyText(page)).includes(marker)) {
      const button = sectionButton(page, name);
      if (touch) await button.tap();
      else {
        await button.focus();
        await page.keyboard.press("Enter");
      }
    }
    await waitBody(page, marker, 30_000);
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

    // The character presentation either validates (development channel) or
    // is withheld fail-closed; both are honest terminal states. Prefer the
    // terminal markers, then accept the still-unbound state.
    await waitBody(page, ["Sarah Kerrigan", "projection withheld", "awaiting room"], 60_000);
    let terminalSeen = true;
    try {
      await page.waitForFunction(
        () => {
          const text = document.body?.innerText || "";
          return text.includes("Sarah Kerrigan") || text.includes("projection withheld");
        },
        { timeout: 25_000 },
      );
    } catch {
      terminalSeen = false;
    }
    const initialText = await bodyText(page);
    characterState = initialText.includes("Sarah Kerrigan")
      ? "projection_valid"
      : initialText.includes("projection withheld")
        ? "withheld_fail_closed"
        : "unbound";
    checks.push({ id: "desktop_character_terminal_state_observed", passed: true,
      characterState, terminalSeen });

    // Collapsed chip is compact and never spans the viewport.
    await assertChipCompact(page, 1500, "DESKTOP");

    // The board is materially visible on first paint (both bounds and a
    // material visible height; full containment is not claimed on a
    // scrollable desktop page) and its center is not intercepted.
    const board = page.locator('[aria-label^="Battlefield;"]').first();
    const boardBox = await board.boundingBox();
    const desktopVisibleHeight = boardBox
      ? Math.min(1050, boardBox.y + boardBox.height) - Math.max(0, boardBox.y)
      : 0;
    ensure(boardBox && boardBox.y >= 0 && boardBox.height >= 400
      && desktopVisibleHeight >= 240,
    "DESKTOP_BATTLEFIELD_NOT_MATERIALLY_VISIBLE", { box: boardBox });
    await capture(page, "01-desktop-collapsed-chip.png", artifacts);
    checks.push({ id: "desktop_collapsed_chip_compact_and_board_unobstructed", passed: true });

    await openSession(page, "desktop");
    await capture(page, "02-desktop-field-comms.png", artifacts);
    if (characterState === "withheld_fail_closed") {
      ensure(initialText.includes("Adjutant · projection withheld")
        || (await bodyText(page)).includes("Adjutant · projection withheld"),
      "WITHHELD_STATE_NOT_HONEST_IN_HEADER");
    }
    checks.push({ id: "desktop_field_comms_section_renders", passed: true, characterState });

    // Companion & world book via keyboard.
    const identitySection = sectionButton(page, /Companion & world book/iu);
    await identitySection.focus();
    await page.keyboard.press("Enter");
    await waitBody(page, "MULTI_COMPANION_SIMULTANEOUS_SESSION", 30_000);
    const identityText = await bodyText(page);
    if (characterState === "projection_valid") {
      ensure(identityText.includes("World book / persona"),
        "IDENTITY_FACTS_MISSING_WHEN_VALID");
    } else if (characterState === "withheld_fail_closed") {
      ensure(identityText.includes("fail-closed"), "WITHHELD_STATE_NOT_FAIL_CLOSED_HONEST");
      ensure(/CHARACTER_PROJECTION_INVALID/iu.test(identityText),
        "WITHHELD_REJECTION_CODE_NOT_SURFACED");
    }
    ensure(identityText.includes("one companion speaks per session")
      || identityText.includes("exactly one companion speaks per session")
      || identityText.includes("speaks by switching"),
    "MULTI_COMPANION_HONESTY_MISSING");
    await capture(page, "03-desktop-identity-worldbook.png", artifacts);
    checks.push({ id: "desktop_identity_worldbook_honest", passed: true, characterState });

    // Relationship & memory via keyboard.
    const memorySection = sectionButton(page, /Relationship & memory/iu);
    await memorySection.focus();
    await page.keyboard.press("Enter");
    await waitBody(page, "COMPANION_RELATIONSHIP_STATE_PROJECTION", 30_000);
    const memoryText = await bodyText(page);
    ensure(memoryText.includes("COMPANION_MEMORY_LAYERS_PROJECTION"),
      "MEMORY_LAYERS_GAP_MISSING");
    ensure(memoryText.includes("COMPANION_IMPORT_EXPORT_RESTORE_CONTRACT"),
      "IMPORT_EXPORT_GAP_MISSING");
    ensure(/Session transcript 0\/64/u.test(memoryText), "TRANSCRIPT_BOUNDS_MISSING");
    ensure(memoryText.includes("hash refs only") || memoryText.includes("No safe trace yet"),
      "MEMORY_TRACE_HONESTY_MISSING");
    await capture(page, "04-desktop-memory-relationship.png", artifacts);
    checks.push({ id: "desktop_memory_relationship_gaps_honest", passed: true });

    // Session controls: permission posture + honest session-open rejection.
    await ensureSectionOpen(page, /Session controls/iu, "Seat permission posture");
    const posture = companionChip(page).getByTestId("companion-permission-posture-v1");
    const postureText = await posture.innerText();
    ensure(/Seat player1 · role player/u.test(postureText), "POSTURE_SEAT_LINE_MISSING");
    ensure(postureText.includes("player-visible state")
      && postureText.includes("opponent-private state is never shown")
      && postureText.includes("inference"), "POSTURE_READ_SCOPE_MISSING");
    ensure(postureText.includes("modelMayConfirm/modelMayApply: false"),
      "POSTURE_SUGGESTIVE_BOUNDARY_MISSING");
    ensure(postureText.includes("observer/off"), "POSTURE_AGENT_VS_AGENT_MISSING");
    ensure(postureText.includes("Review & Skill"), "POSTURE_REVIEW_SEPARATE_MISSING");
    ensure((await bodyText(page)).includes("Every mode is read-only"),
      "MODE_SEMANTICS_MISSING");

    await sectionButton(page, /Open session/iu).click();
    await page.waitForFunction(
      () => /AGENT_CHARACTER_NOT_AVAILABLE|ONLINE_AGENT_SESSION_NOT_ATTACHED_IN_FIXTURE/u
        .test(document.body?.innerText || ""),
      { timeout: 30_000 },
    );
    const rejectionText = await companionChip(page)
      .getByTestId("agent-session-rejection").innerText();
    ensure(/AGENT_CHARACTER_NOT_AVAILABLE|ONLINE_AGENT_SESSION_NOT_ATTACHED_IN_FIXTURE/u
      .test(rejectionText),
    "SESSION_REJECTION_NOT_HONEST", { rejectionText });
    await capture(page, "05-desktop-session-permission.png", artifacts);
    checks.push({ id: "desktop_session_open_rejection_honest_no_provider", passed: true,
      rejection: rejectionText.trim() });

    // BYOK: catalogue loads with zero approved profiles; no model is called.
    const providerSection = sectionButton(page, /Secure Provider setup/iu);
    await providerSection.focus();
    await page.keyboard.press("Enter");
    await waitBody(page, "Load Provider catalogue", 30_000);
    await sectionButton(page, /Load Provider catalogue/iu).click();
    await waitBody(page, "the server approved 0 Provider profiles", 30_000);
    const emptyCatalogue = await companionChip(page)
      .getByTestId("secure-provider-empty-catalogue").innerText();
    ensure(emptyCatalogue.includes("does not call a model"),
      "EMPTY_CATALOGUE_NOT_HONEST");
    await capture(page, "06-desktop-byok-empty-catalogue.png", artifacts);
    checks.push({ id: "desktop_byok_empty_catalogue_honest", passed: true });

    // Diagnostics: safe-trace and projection status honesty.
    const diagnosticsSection = sectionButton(page, /Diagnostics/iu);
    await diagnosticsSection.focus();
    await page.keyboard.press("Enter");
    await waitBody(page, "rawPromptExposed: false", 30_000);
    const diagText = await bodyText(page);
    ensure(diagText.includes("character status"), "DIAG_CHARACTER_STATUS_MISSING");
    if (characterState === "withheld_fail_closed") {
      ensure(diagText.includes("CHARACTER_PROJECTION_INVALID"),
        "DIAG_REJECTION_CODE_MISSING");
    }
    await capture(page, "07-desktop-diagnostics.png", artifacts);
    checks.push({ id: "desktop_diagnostics_honest", passed: true });

    // Collapse again with the keyboard, then prove the board display control
    // is hit-testable at its center with a plain click (no force click).
    const toggleAgain = chipToggleButton(page);
    await toggleAgain.focus();
    await page.keyboard.press("Enter");
    await assertChipCompact(page, 1500, "DESKTOP_AFTER_COLLAPSE");
    const showThreat = page.getByRole("button", { name: "Show threat", exact: true });
    await hitTestCenter(page, showThreat, "standard-match-contract",
      "DESKTOP_BOARD_CONTROL");
    await showThreat.click();
    await waitBody(page, "Hide threat", 30_000);
    await page.getByRole("button", { name: "Hide threat", exact: true }).click();
    await waitBody(page, "Show threat", 30_000);
    await capture(page, "08-desktop-collapsed-hit-test.png", artifacts);
    checks.push({ id: "desktop_chip_does_not_intercept_board_controls", passed: true });

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

    const chipBox = await assertChipCompact(narrowPage, 390, "NARROW");
    const overflow = await narrowPage.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    ensure(overflow.documentWidth <= overflow.viewportWidth + 1,
      "NARROW_PAGE_HORIZONTAL_OVERFLOW", overflow);

    await resetScrollToSurfaceTop(narrowPage);
    const narrowBoard = narrowPage.locator('[aria-label^="Battlefield;"]').first();
    const narrowBoardBox = await narrowBoard.boundingBox();
    const narrowVisibleHeight = narrowBoardBox
      ? Math.min(844, narrowBoardBox.y + narrowBoardBox.height)
        - Math.max(0, narrowBoardBox.y)
      : 0;
    ensure(narrowBoardBox && narrowBoardBox.y >= 0 && narrowBoardBox.y < 500
      && narrowVisibleHeight >= 240,
    "NARROW_BATTLEFIELD_NOT_MATERIALLY_VISIBLE", { box: narrowBoardBox });
    // The collapsed chip must not overlap the board rectangle at all.
    const overlapsBoard = chipBox && narrowBoardBox
      && chipBox.x < narrowBoardBox.x + narrowBoardBox.width
      && chipBox.x + chipBox.width > narrowBoardBox.x
      && chipBox.y < narrowBoardBox.y + narrowBoardBox.height
      && chipBox.y + chipBox.height > narrowBoardBox.y;
    ensure(!overlapsBoard, "NARROW_CHIP_OVERLAPS_BOARD", { chipBox, narrowBoardBox });
    await capture(narrowPage, "09-narrow-collapsed.png", artifacts);
    checks.push({ id: "narrow_chip_compact_board_visible_no_overflow", passed: true });

    // Touch expand: tap the chip, open Session controls, read the posture.
    await chipToggleButton(narrowPage).tap();
    await waitBody(narrowPage, "Field comms", 30_000);
    await ensureSectionOpen(narrowPage, /Session controls/iu,
      "Seat permission posture", { touch: true });
    await capture(narrowPage, "10-narrow-session-touch.png", artifacts);
    checks.push({ id: "narrow_touch_expands_sections", passed: true });

    // Collapse with touch and prove a plain tap toggles the threat layer.
    await chipToggleButton(narrowPage).tap();
    await assertChipCompact(narrowPage, 390, "NARROW_AFTER_COLLAPSE");
    const narrowShowThreat = narrowPage.getByRole("button", { name: "Show threat", exact: true });
    await hitTestCenter(narrowPage, narrowShowThreat, null, "NARROW_BOARD_CONTROL");
    await narrowShowThreat.tap();
    await waitBody(narrowPage, "Hide threat", 30_000);
    await capture(narrowPage, "11-narrow-threat-hit-test.png", artifacts);
    checks.push({ id: "narrow_chip_does_not_intercept_board_controls", passed: true });

    await narrow.close();

    // No operation beyond the honest catalogue metadata may have reached the
    // provider prefix, and the agent prefix may only carry the rejected
    // session attempt (zero live turns, zero Provider calls).
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
    schemaVersion: "starcraft_tmg_ticket_26_slice_264_browser_report_v1",
    generatedAt: GENERATED_AT,
    ticket: 26,
    slice: 264,
    subSlice: "companion-experience-ui",
    status: "passed",
    assertionsPassed: checks.length,
    checks,
    characterState,
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
      baseCommit: SLICE_264_BASE_COMMIT,
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
    characterState,
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
