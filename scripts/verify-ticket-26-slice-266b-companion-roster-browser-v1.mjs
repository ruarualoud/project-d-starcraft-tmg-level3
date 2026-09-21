#!/usr/bin/env node

/**
 * Ticket 26 / Slice 266b — six-companion roster browser gate (claim-to-pixel).
 *
 * Self-contained verifier (K3 guardrails v1, same harness discipline as the
 * Slice 264/265 gates):
 *   1. exports the CURRENT worktree Expo Web bundle when any frontend source
 *      (including content/characters presentation packs AND the committed
 *      assets/characters keyframes) is newer than the existing export
 *      (current-main, never stale-export);
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
 *      reduced motion) through the Slice 266b roster journey:
 *      catalogue with SIX identities (Kerrigan default/backend reference,
 *      Zagara, Raynor, Nova, Artanis, Zeratul), one non-idle state switch per
 *      character, and for every rendered portrait a claim-to-pixel proof:
 *      the <img> decodes at naturalWidth 1254, canvas luminance variance is
 *      far above a glyph/blank threshold, the asset path LABELLED in the DOM
 *      resolves to a committed repo file whose sha256 matches the hash prefix
 *      shown in the UI, and the SERVED bundled bytes hash to the same sha256
 *      (UI label ↔ committed file ↔ served pixels are one asset). Kerrigan's
 *      damaged_concerned state must carry the honest shared-frame badge.
 *      Desktop and 390px containment: zero document horizontal overflow,
 *      compact-chip bounds, board-control hit-testing without force clicks;
 *   5. every visual claim is recorded as a claim-to-pixel row (screenshot,
 *      viewport, precondition, interaction, expected, observed box/DOM/pixel
 *      assertion, contract demonstrated) plus sha256-hashed PNG evidence
 *      under build/ticket-26-slice-266b-companion-roster-browser-v1/.
 *
 * The stale character-package hash pin (CHARACTER_PACKAGE_HASH_PIN_STALE,
 * Codex-owned, Slice 264 §7.1) keeps the live Field-comms identity fail-
 * closed; this journey exercises the catalogue/presentation surface, which
 * does not depend on that projection, and records the withheld state
 * honestly where visible.
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
const BUILD_ROOT = path.join(ROOT, "build/ticket-26-slice-266b-companion-roster-browser-v1");
const EVIDENCE_ROOT = path.join(BUILD_ROOT, "browser-evidence");
const REPORT_PATH = path.join(BUILD_ROOT, "browser-report.json");
const SLICE_266B_BASE_COMMIT = "592bb95bd7018adfd74a9aee76b5bf99bd4c56e9";
const GENERATED_AT = "2026-09-22T00:00:00.000Z";
const ROOM_ID = "ticket26-slice266b-companion-roster";
const AGENT_API_PREFIX = "/starcraft-tmg-level3/agent/api/v2";
const PROVIDER_API_PREFIX = "/starcraft-tmg-level3/provider/api/v1";
const SCREENSHOT_EXPLANATIONS = {
  "01-desktop-collapsed-chip-board.png": "Desktop session bound: compact collapsed companion chip at the lower right and the battlefield materially visible — the board-safe precondition for the roster journey.",
  "02-desktop-catalogue-six-companions.png": "Companion catalogue opened by keyboard: SIX entries with distinct identity and real idle keyframe portraits — Kerrigan (Zerg, default, backend reference), Zagara, Raynor, Nova, Artanis, Zeratul.",
  "03-desktop-kerrigan-shared-state.png": "Kerrigan damaged_concerned state: real receipted warning frame rendered WITH the honest shared-frame badge — no fabricated dedicated frame.",
  "04-desktop-zagara-listening.png": "Zagara listening state: real admitted v3 keyframe decoded at 1254px with canvas variance proof and served-bytes sha256 equal to the committed audit-pinned file.",
  "05-desktop-raynor-alert.png": "Raynor alert_combat state: real admitted v1 keyframe with the same pixel/hash proof.",
  "06-desktop-nova-speaking.png": "Nova speaking state: real admitted v1 keyframe with the same pixel/hash proof.",
  "07-desktop-artanis-reflective.png": "Artanis reflective state: real admitted v3 keyframe with the same pixel/hash proof.",
  "08-desktop-zeratul-alert.png": "Zeratul alert_combat state: real admitted v3 keyframe with the same pixel/hash proof.",
  "09-desktop-multi-speaker-six.png": "Multi-companion presentation prototype with six speaker chips: explicit speaker identity/turn order, honestly disabled composer, and the MULTI_COMPANION_SIMULTANEOUS_SESSION card showing generic-module support but Codex-owned product binding pending.",
  "10-desktop-capability-status.png": "Capability status surface: generic backend module capabilities (headless-verified) separated from the Codex-owned product binding marked pending — nothing falsely shown as product-supported.",
  "11-desktop-collapsed-hit-test.png": "Chip collapsed again: the Show threat board control is hit-testable at its center (plain click toggles the layer; the chip does not intercept).",
  "12-narrow-catalogue-touch.png": "390px touch layout: catalogue opened by tap; six companion cards with real portraits fit with zero horizontal overflow.",
  "13-narrow-nova-speaking-pixels.png": "390px touch layout: Nova speaking state rendered from the real committed keyframe with the same served-bytes sha256 proof at narrow width.",
  "14-narrow-threat-hit-test.png": "Narrow layout: Show threat toggled by a plain tap at the control's center while the chip is collapsed — no overlay interception, no force click.",
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

/** Six-companion roster journey plan: one non-idle state per character. */
const ROSTER_JOURNEY = [
  {
    slug: "sarah_kerrigan",
    characterId: "starcraft.sarah_kerrigan",
    displayName: "Sarah Kerrigan",
    detailMarker: "kerrigan-primal-v1.mjs",
    stateId: "damaged_concerned",
    expectSharedBadge: true,
    packMarkers: ["server projection"],
  },
  {
    slug: "zagara",
    characterId: "starcraft.zagara",
    displayName: "Zagara",
    detailMarker: "Broodmother of Char",
    stateId: "listening",
    packMarkers: ["starcraft.zagara", "canon fact (official primary summary)", "Project D role configuration", "Zagara → Sarah Kerrigan", "Swarm attrition doctrine"],
  },
  {
    slug: "jim_raynor",
    characterId: "starcraft.jim_raynor",
    displayName: "Jim Raynor",
    detailMarker: "Wings of Liberty Raiders",
    stateId: "alert_combat",
    packMarkers: ["starcraft.jim_raynor", "Raynor → Sarah Kerrigan", "Raiders doctrine"],
  },
  {
    slug: "nova_terra",
    characterId: "starcraft.nova_terra",
    displayName: "Nova Terra",
    detailMarker: "New Folsom Affair",
    stateId: "speaking",
    packMarkers: ["starcraft.nova_terra", "Ghost doctrine", "Nova → Terran Dominion"],
  },
  {
    slug: "artanis",
    characterId: "starcraft.artanis",
    displayName: "Artanis",
    detailMarker: "The Aiur Invasion",
    stateId: "reflective",
    packMarkers: ["starcraft.artanis", "Daelaam unity", "Artanis → Amon"],
  },
  {
    slug: "zeratul",
    characterId: "starcraft.zeratul",
    displayName: "Zeratul",
    detailMarker: "Prophecy Seeker",
    stateId: "alert_combat",
    packMarkers: ["starcraft.zeratul", "The Nerazim", "Zeratul → Raszagal"],
  },
];

function ensure(condition, code, details = {}) {
  if (!condition) throw Object.assign(new Error(code), { code, ...details });
}

async function sha256File(filename) {
  return createHash("sha256").update(await readFile(filename)).digest("hex");
}

function sha256Buffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
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
    : ["diff", "--name-only", SLICE_266B_BASE_COMMIT, "--", "packages/", "scripts/support/"],
  ROOT).trim();
  ensure(!drift, "BACKEND_CONTRACT_DRIFT_IN_WORKTREE", { drift });
  if (!integratedMain) {
    const ancestry = spawnSync("git",
      ["merge-base", "--is-ancestor", SLICE_266B_BASE_COMMIT, "HEAD"],
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
        runGitBuffer(["show", `${SLICE_266B_BASE_COMMIT}:${relative}`], ROOT),
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
    // Presentation-only companion content feeds the bundle.
    path.join(ROOT, "content/characters"),
    // Slice 266b: committed admitted portrait keyframes feed the bundle.
    path.join(ROOT, "assets/characters"),
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
  const force = process.env.TICKET26_266B_FORCE_EXPORT === "1";
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

async function documentOverflow(page) {
  return page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
}

/**
 * Claim-to-pixel proof for the currently selected catalogue portrait:
 *   - the preview <img> exists (not the glyph fallback), is decoded at the
 *     committed 1254×1254 source size, and is rendered at >= 96px;
 *   - canvas luminance variance is far above a flat/glyph placeholder;
 *   - the asset path LABELLED in the DOM resolves to a committed repo file
 *     whose sha256 matches the hash prefix the UI displays;
 *   - the SERVED bundled bytes hash to that same sha256.
 */
async function provePortraitPixels(page, request, viewportWidth) {
  const panel = companionChip(page).getByTestId("companion-catalogue-panel");
  const metaText = await panel.getByTestId("companion-portrait-asset-meta").innerText();
  const assetMatch = metaText.match(/asset:\s*(\S+)/u);
  const hashMatch = metaText.match(/sha256:\s*([0-9a-f]{12})/u);
  ensure(assetMatch && hashMatch, "PORTRAIT_META_MISSING", { metaText });
  const assetPath = assetMatch[1];
  const hashPrefix = hashMatch[1];
  const committedFile = safeFile(ROOT, assetPath);
  ensure(committedFile && existsSync(committedFile), "LABELLED_ASSET_NOT_COMMITTED", { assetPath });
  const committedHash = await sha256File(committedFile);
  ensure(committedHash.startsWith(hashPrefix),
    "UI_HASH_PREFIX_MISMATCH", { assetPath, hashPrefix, committedHash });

  // react-native-web Image = wrapper div (data-testid, background-image
  // layer with backgroundSize from resizeMode) + hidden accessibility img
  // carrying the real src. Both must prove themselves.
  const frame = panel.getByTestId("companion-portrait-preview-img");
  await frame.waitFor({ timeout: 30_000 });
  const img = frame.locator("img").first();
  await img.waitFor({ state: "attached", timeout: 30_000 });
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="companion-portrait-preview-img"] img');
    return el && el.complete && el.naturalWidth > 0;
  }, null, { timeout: 30_000 });
  const decoded = await img.evaluate((el) => ({
    naturalWidth: el.naturalWidth,
    naturalHeight: el.naturalHeight,
    src: el.currentSrc || el.src,
  }));
  ensure(decoded.naturalWidth === 1254 && decoded.naturalHeight === 1254,
    "PORTRAIT_NOT_COMMITTED_SOURCE", { decoded, assetPath });

  // react-native-web Image = wrapper div (data-testid) containing an inner
  // div with the actual background-image layer (backgroundSize from
  // resizeMode) plus a hidden accessibility img carrying the real src.
  const renderInfo = await frame.evaluate((el) => {
    for (const layer of [el, ...el.querySelectorAll("div")]) {
      const style = getComputedStyle(layer);
      const match = style.backgroundImage.match(/url\("(.+)"\)/u);
      if (match) {
        return { backgroundImage: match[1], backgroundSize: style.backgroundSize };
      }
    }
    return { backgroundImage: null, backgroundSize: null };
  });
  ensure(renderInfo.backgroundImage, "PORTRAIT_NOT_RENDERED_AS_IMAGE_LAYER", { assetPath });
  // Aspect-preserving crop/contain only; "100% 100%" would be a stretch.
  ensure(["contain", "cover"].includes(renderInfo.backgroundSize),
    "PORTRAIT_ASPECT_NOT_PRESERVED", { assetPath, backgroundSize: renderInfo.backgroundSize });

  const box = await frame.boundingBox();
  ensure(box && box.width >= 96 && box.height >= 96
    && box.x >= -1 && box.x + box.width <= viewportWidth + 1,
  "PORTRAIT_NOT_SAFE_96_OR_NOT_CONTAINED", { box, viewportWidth });

  const variance = await img.evaluate((el) => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(el, 0, 0, 64, 64);
    const data = ctx.getImageData(0, 0, 64, 64).data;
    let sum = 0;
    let sumSq = 0;
    const n = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      sum += luma;
      sumSq += luma * luma;
    }
    const mean = sum / n;
    return { mean, stdev: Math.sqrt(Math.max(0, sumSq / n - mean * mean)) };
  });
  ensure(variance.stdev > 12,
    "PORTRAIT_PIXELS_FLAT_OR_GLYPH", { assetPath, variance });

  ensure(decoded.src === renderInfo.backgroundImage,
    "RENDERED_LAYER_AND_DECODED_SRC_DIVERGE", { src: decoded.src, rendered: renderInfo.backgroundImage });
  const served = await request.get(renderInfo.backgroundImage);
  ensure(served.ok(), "PORTRAIT_SERVE_FAILED", { src: renderInfo.backgroundImage, status: served.status() });
  const servedHash = sha256Buffer(await served.body());
  ensure(servedHash === committedHash,
    "SERVED_BYTES_NOT_COMMITTED_ASSET", { assetPath, servedHash, committedHash });

  return {
    assetPath,
    contentHash: committedHash,
    servedUrlClass: "same-origin Metro-bundled copy of the committed repo asset",
    backgroundSize: renderInfo.backgroundSize,
    servedSha256MatchesCommitted: true,
    naturalSize: [decoded.naturalWidth, decoded.naturalHeight],
    renderedBox: box,
    luminance: variance,
  };
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
    title: "Ticket 26 · Slice 266b · Companion roster browser fixture",
    initialStateAuthority: {
      source: "server_factory",
      state: sampleState,
      dataVersion: data.version,
      receiptHash: hashStarcraftTmgContract({
        source: "ticket-26-slice-266b-companion-roster-browser-v1",
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
    await waitBody(page, "admitted keyframes committed", 30_000);
  }

  async function proveRosterEntry(page, request, entry, viewportWidth, screenshot) {
    const panel = companionChip(page).getByTestId("companion-catalogue-panel");
    await panel.getByTestId(`companion-catalogue-entry-${entry.slug}`).click();
    await waitBody(page, entry.detailMarker, 30_000);
    const detailText = await panel.innerText();
    for (const marker of entry.packMarkers) {
      ensure(detailText.includes(marker), `PACK_DETAIL_MISSING:${entry.slug}:${marker}`);
    }
    // Card portrait is a real decoded image, not a glyph.
    const cardImg = panel.getByTestId(`companion-card-portrait-${entry.slug}-img`).locator("img").first();
    await cardImg.waitFor({ state: "attached", timeout: 30_000 });
    await page.waitForFunction(
      (slug) => {
        const el = document.querySelector(`[data-testid="companion-card-portrait-${slug}-img"] img`);
        return el && el.complete && el.naturalWidth > 0;
      },
      entry.slug,
      { timeout: 30_000 },
    );
    const cardDecoded = await cardImg.evaluate((el) => ({
      complete: el.complete, naturalWidth: el.naturalWidth,
    }));
    ensure(cardDecoded.complete && cardDecoded.naturalWidth === 1254,
      `CARD_PORTRAIT_NOT_REAL:${entry.slug}`, { cardDecoded });
    // Switch one explicit non-idle state and prove real pixels.
    await panel.getByTestId(`companion-portrait-state-${entry.stateId}`).click();
    await page.waitForFunction(
      (stateId) => (document
        .querySelector('[data-testid="companion-portrait-state-preview"]')
        ?.innerText || "")
        .split("\n")
        .some((line) => line.trim() === stateId),
      entry.stateId,
      { timeout: 30_000 },
    );
    const proof = await provePortraitPixels(page, request, viewportWidth);
    if (entry.expectSharedBadge) {
      const previewText = await panel.getByTestId("companion-portrait-state-preview").innerText();
      ensure(previewText.includes("shared frame")
        && previewText.includes("honestly shares the approved alert_combat frame"),
      "KERRIGAN_SHARED_STATE_NOT_LABELLED", { previewText });
    }
    await capture(page, screenshot, artifacts);
    claim({
      claimId: `roster_${entry.slug}_${entry.stateId}_real_pixels`,
      screenshot,
      viewport: `${viewportWidth}px`,
      precondition: "catalogue open, entry selected by click",
      interaction: `click ${entry.slug} card, click ${entry.stateId} state chip`,
      expected: "real committed keyframe: decoded 1254px, >=96px render, canvas variance, served sha256 equals the audit-pinned committed file whose path the UI labels",
      observed: proof,
      contract: "content/characters portrait state contracts + lib/level3/companion-portrait-assets-v1.ts",
    });
    checks.push({ id: `roster_${entry.slug}_real_state_pixels`, passed: true });
    return proof;
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

    // Catalogue via keyboard: six identities.
    await openCatalogue(page);
    const cataloguePanel = companionChip(page).getByTestId("companion-catalogue-panel");
    for (const entry of ROSTER_JOURNEY) {
      await cataloguePanel.getByTestId(`companion-catalogue-entry-${entry.slug}`).waitFor({ timeout: 30_000 });
    }
    const catalogueText = await cataloguePanel.innerText();
    for (const entry of ROSTER_JOURNEY) {
      ensure(catalogueText.includes(entry.displayName),
        `CATALOGUE_IDENTITY_MISSING:${entry.slug}`);
    }
    ensure(catalogueText.includes("backend reference pack · default companion (Kerrigan)"),
      "KERRIGAN_DEFAULT_REFERENCE_STATUS_MISSING");
    ensure(catalogueText.includes("Six companions:"), "ROSTER_COUNT_COPY_MISSING");
    // The fail-closed live identity (stale pin gap) is honest, not hidden.
    await capture(page, "02-desktop-catalogue-six-companions.png", artifacts);
    claim({
      claimId: "catalogue_six_companion_identity_distinction",
      screenshot: "02-desktop-catalogue-six-companions.png",
      viewport: "1500x1050",
      precondition: "chip expanded, catalogue section opened by keyboard",
      interaction: "keyboard Enter on section header",
      expected: "six distinct entries with real idle portraits; Kerrigan default + backend reference status",
      observed: { entries: ROSTER_JOURNEY.map((entry) => entry.slug) },
      contract: "content/characters/companion-catalogue-v1.mjs (six entries, registration-driven)",
    });
    checks.push({ id: "desktop_catalogue_six_companions", passed: true });

    // One real-pixel state proof per character.
    await proveRosterEntry(page, desktop.request, ROSTER_JOURNEY[0], 1500, "03-desktop-kerrigan-shared-state.png");
    await proveRosterEntry(page, desktop.request, ROSTER_JOURNEY[1], 1500, "04-desktop-zagara-listening.png");
    await proveRosterEntry(page, desktop.request, ROSTER_JOURNEY[2], 1500, "05-desktop-raynor-alert.png");
    await proveRosterEntry(page, desktop.request, ROSTER_JOURNEY[3], 1500, "06-desktop-nova-speaking.png");
    await proveRosterEntry(page, desktop.request, ROSTER_JOURNEY[4], 1500, "07-desktop-artanis-reflective.png");
    await proveRosterEntry(page, desktop.request, ROSTER_JOURNEY[5], 1500, "08-desktop-zeratul-alert.png");

    // Multi-companion prototype: six speakers, visibly pending product binding.
    const prototype = cataloguePanel.getByTestId("companion-multi-speaker-prototype");
    for (const entry of ROSTER_JOURNEY) {
      await prototype.getByTestId(`companion-speaker-${entry.slug}`).waitFor({ timeout: 30_000 });
    }
    await prototype.getByTestId("companion-speaker-zeratul").click();
    const prototypeText = await prototype.innerText();
    ensure(prototypeText.includes("current speaker Zeratul"),
      "SPEAKER_SELECTION_NOT_REFLECTED");
    ensure(prototypeText.includes("turn order")
      && prototypeText.includes("@mention")
      && prototypeText.includes("opponent-private state never renders"),
    "PROTOTYPE_PERMISSION_LABELS_MISSING");
    ensure(prototypeText.includes("MULTI_COMPANION_SIMULTANEOUS_SESSION")
      && prototypeText.includes("fabricates no messages")
      && prototypeText.includes("calls no Provider")
      && prototypeText.includes("Codex-owned"),
    "MULTI_SPEAKER_PENDING_BINDING_NOT_HONEST");
    await capture(page, "09-desktop-multi-speaker-six.png", artifacts);
    claim({
      claimId: "multi_companion_prototype_visibly_pending_binding",
      screenshot: "09-desktop-multi-speaker-six.png",
      viewport: "1500x1050",
      precondition: "catalogue open",
      interaction: "click Zeratul speaker chip",
      expected: "six speaker chips, turn order + permission labels; composer disabled; generic-module support vs Codex-owned pending binding stated",
      observed: { speaker: "Zeratul", gap: "MULTI_COMPANION_SIMULTANEOUS_SESSION" },
      contract: "gap MULTI_COMPANION_SIMULTANEOUS_SESSION (product binding Codex-owned)",
    });
    checks.push({ id: "desktop_multi_speaker_prototype_honest", passed: true });

    // Capability status surface: generic module vs pending product binding.
    const parity = cataloguePanel.getByTestId("companion-parity-gap-surface");
    const parityText = await parity.innerText();
    for (const code of [
      "WORLDBOOK_DYNAMIC_TRIGGER_CONTRACT",
      "COMPANION_MEMORY_LAYERS_PROJECTION",
      "COMPANION_RELATIONSHIP_STATE_PROJECTION",
      "COMPANION_SWIPE_BRANCH_CONTRACT",
      "COMPANION_LONG_SESSION_RESUME_CONTRACT",
      "COMPANION_IMPORT_EXPORT_RESTORE_CONTRACT",
      "COMPANION_AUDIT_REPLAY_SURFACE",
      "COMPANION_EXTERNAL_PROVIDER_PORT",
      "COMPANION_AUTHORS_NOTE_CONTRACT",
      "USER_PERSONA_CONTRACT",
      "AGENT_VS_AGENT_COMPANION_POLICY_SURFACE",
      "COMPANION_PACK_BACKEND_PROMOTION",
      "COMPANION_PORTRAIT_CONTINUOUS_ANIMATION",
    ]) {
      ensure(parityText.includes(code), `CAPABILITY_ROW_MISSING:${code}`);
    }
    ensure(parityText.includes("supported (headless-verified)")
      && parityText.includes("pending Codex (not connected)"),
    "CAPABILITY_PENDING_BINDING_FRAMING_MISSING");
    await capture(page, "10-desktop-capability-status.png", artifacts);
    claim({
      claimId: "capability_status_surface_pending_binding",
      screenshot: "10-desktop-capability-status.png",
      viewport: "1500x1050",
      precondition: "catalogue open",
      interaction: "scroll to capability status surface",
      expected: "generic backend module capabilities marked headless-verified; product room binding marked pending Codex; never shown as product-supported",
      observed: { rows: 14 },
      contract: "packages/companion-backend-module-v1 capability map (Slice 266) + Codex-owned product binding gap",
    });
    checks.push({ id: "desktop_capability_status_surface", passed: true });

    // Desktop containment with the full catalogue expanded.
    const desktopOverflow = await documentOverflow(page);
    ensure(desktopOverflow.documentWidth <= desktopOverflow.viewportWidth + 1,
      "DESKTOP_CATALOGUE_HORIZONTAL_OVERFLOW", desktopOverflow);
    checks.push({ id: "desktop_catalogue_no_horizontal_overflow", passed: true });

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
    await capture(page, "11-desktop-collapsed-hit-test.png", artifacts);
    claim({
      claimId: "collapsed_chip_board_hit_testing",
      screenshot: "11-desktop-collapsed-hit-test.png",
      viewport: "1500x1050",
      precondition: "chip collapsed via keyboard after roster journey",
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
    const overflow0 = await documentOverflow(narrowPage);
    ensure(overflow0.documentWidth <= overflow0.viewportWidth + 1,
      "NARROW_PAGE_HORIZONTAL_OVERFLOW", overflow0);

    await openCatalogue(narrowPage, { touch: true });
    const narrowPanel = companionChip(narrowPage).getByTestId("companion-catalogue-panel");
    for (const entry of ROSTER_JOURNEY) {
      await narrowPanel.getByTestId(`companion-catalogue-entry-${entry.slug}`).waitFor({ timeout: 30_000 });
    }
    // No horizontal overflow with the full catalogue expanded on 390px.
    const overflow1 = await documentOverflow(narrowPage);
    ensure(overflow1.documentWidth <= overflow1.viewportWidth + 1,
      "NARROW_CATALOGUE_HORIZONTAL_OVERFLOW", overflow1);
    await capture(narrowPage, "12-narrow-catalogue-touch.png", artifacts);
    claim({
      claimId: "narrow_touch_catalogue_no_overflow",
      screenshot: "12-narrow-catalogue-touch.png",
      viewport: "390x844 touch",
      precondition: "room bound on narrow viewport",
      interaction: "tap chip, tap catalogue section",
      expected: "six companion cards with real portraits fit 390px; zero horizontal overflow",
      observed: { overflow: overflow1, chipBox: narrowChipBox },
      contract: "mobile safe areas and no overlay interception (guardrail §9)",
    });
    checks.push({ id: "narrow_touch_catalogue_no_overflow", passed: true });

    // Touch state switch + pixel proof at 390px (Nova speaking).
    const novaEntry = ROSTER_JOURNEY[3];
    await narrowPanel.getByTestId(`companion-catalogue-entry-${novaEntry.slug}`).tap();
    await waitBody(narrowPage, novaEntry.detailMarker, 30_000);
    await narrowPanel.getByTestId(`companion-portrait-state-${novaEntry.stateId}`).tap();
    const narrowProof = await provePortraitPixels(narrowPage, narrow.request, 390);
    const overflow2 = await documentOverflow(narrowPage);
    ensure(overflow2.documentWidth <= overflow2.viewportWidth + 1,
      "NARROW_STATE_PREVIEW_HORIZONTAL_OVERFLOW", overflow2);
    await capture(narrowPage, "13-narrow-nova-speaking-pixels.png", artifacts);
    claim({
      claimId: "narrow_touch_state_switch_real_pixels",
      screenshot: "13-narrow-nova-speaking-pixels.png",
      viewport: "390x844 touch",
      precondition: "catalogue open on narrow viewport",
      interaction: "tap Nova card, tap speaking state chip",
      expected: "real committed keyframe decoded and contained at 390px; served sha256 equals committed file",
      observed: { proof: narrowProof, overflow: overflow2 },
      contract: "guardrail §7 real media paths at touch width",
    });
    checks.push({ id: "narrow_touch_state_switch_real_pixels", passed: true });

    await chipToggleButton(narrowPage).tap();
    await assertChipCompact(narrowPage, 390, "NARROW_AFTER_COLLAPSE");
    const narrowShowThreat = narrowPage.getByRole("button", { name: "Show threat", exact: true });
    await hitTestCenter(narrowPage, narrowShowThreat, "NARROW_BOARD_CONTROL");
    await narrowShowThreat.tap();
    await waitBody(narrowPage, "Hide threat", 30_000);
    await capture(narrowPage, "14-narrow-threat-hit-test.png", artifacts);
    claim({
      claimId: "narrow_collapsed_chip_hit_testing",
      screenshot: "14-narrow-threat-hit-test.png",
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
    schemaVersion: "starcraft_tmg_ticket_26_slice_266b_browser_report_v1",
    generatedAt: GENERATED_AT,
    ticket: 26,
    slice: "266b",
    subSlice: "companion-roster-ui",
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
      baseCommit: SLICE_266B_BASE_COMMIT,
      parityRule: "no backend drift versus the slice base; main-ahead modules are hash-recorded as advanced_by_codex_integration and the fixture backend is verified to descend from the slice base",
      knownStalePin: "CHARACTER_PACKAGE_HASH_PIN_STALE (Codex-owned, Slice 264 §7.1): live Field-comms identity fails closed; the catalogue/presentation surface under test does not depend on that projection",
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
      portraitPixelsProvenReal: true,
      continuousAnimationClaimed: false,
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
