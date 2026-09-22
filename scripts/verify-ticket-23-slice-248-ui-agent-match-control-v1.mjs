#!/usr/bin/env node

/**
 * Ticket 23 / Slice 248 — real-browser formal Agent-match control journey.
 *
 * Self-contained verifier:
 *   1. proves this slice changed only its four allowed paths and drifted no
 *      backend code relative to the slice base;
 *   2. exports the CURRENT worktree Expo Web bundle when any frontend source
 *      is newer than the existing export (canonical ticket-14 flow:
 *      precompiled static web CSS + `expo export`);
 *   3. creates a read-only demo room from the unchanged legacy sample-state
 *      adapter input (the same factory the ticket-14/15/262 browser
 *      harnesses used; zero Provider calls), instantiated through the
 *      resolved main checkout with byte-parity hash-assertion;
 *   4. serves the worktree bundle, the unmodified Level3 room HTTP API and a
 *      MOCKED same-origin ticket-23 A2A endpoint pair
 *      (`GET /__ticket23/a2a/ui-status`, `POST /__ticket23/a2a/ui-drive`)
 *      on one loopback origin — the mock is scenario-driven in-process so
 *      the real browser runs current frontend product code against the exact
 *      documented backend contract without any Agent/Provider work;
 *   5. drives real Chromium through hidden-on-normal-server, ready,
 *      exactly-one-POST, running, applied-refresh, data-gate-blocked,
 *      typed-failure-recovery, terminal and responsive journeys on desktop
 *      (1500×1050) and narrow/touch (390×844), both with reduced motion;
 *   6. writes a git-ignored machine-readable report plus PNG evidence set
 *      with sha256 hashes under
 *      build/ticket-23-slice-248-ui-agent-match-control-v1/.
 *
 * No Provider call, no credential read, no source refresh, and no gameplay
 * truth is computed here or in the UI under test. The mocked manifest values
 * are display fixtures only.
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
const BUILD_ROOT = path.join(ROOT, "build/ticket-23-slice-248-ui-agent-match-control-v1");
const EVIDENCE_ROOT = path.join(BUILD_ROOT, "browser-evidence");
const REPORT_PATH = path.join(BUILD_ROOT, "browser-report.json");
const BASE_COMMIT = "fc463d2a4349f16058b1478b7667cf5c69bb9ee9";
const GENERATED_AT = "2026-09-22T00:00:00.000Z";
const ROOM_ID = "ticket23-slice248-ui-a2a-control";
const ALLOWED_PATHS = new Set([
  "apps/starcraft-tmg-expo/app/(tabs)/match.tsx",
  "apps/starcraft-tmg-expo/components/battlefield/agent-agent-match-control.tsx",
  "scripts/verify-ticket-23-slice-248-ui-agent-match-control-v1.mjs",
  "docs/ticket-23-slice-248-ui-agent-match-control-v1-2026-09-22.md",
]);
const SCREENSHOT_EXPLANATIONS = {
  "01-desktop-ready-command-strip.png": "Desktop battle surface, frame scrolled to the strip: the Agent-match command strip with gate-passed and ready chips, round/phase/active-side context, usage/cost/state-revision/last-accepted facts and the single enabled drive button. Board focus is proven geometrically: the 560px board renders above the 101px strip with zero overlap in the first viewport.",
  "02-desktop-running-thinking.png": "After one activation: the run chip reads Agent: thinking…, the drive button is disabled, and the mock POST counter proves exactly one queue request; the board is untouched.",
  "03-desktop-applied-refresh.png": "Job completed: the strip refreshes to state revision 10 with last accepted ventral_sacs → r10 and the bumped usage/cost, proving the accepted action and room revision visibly advance after a drive.",
  "04-desktop-blocked-gate.png": "Data-gate blocker: amber blocked banner with the blocking-finding count, gate chip flipped, drive button visibly disabled; a forced DOM click produced no POST.",
  "05-desktop-failed-recovery.png": "Typed failure: the failure card shows code/severity, explains that no state advanced, and the drive button is enabled again for a deliberate retry.",
  "06-narrow-collapsed.png": "390px touch layout, frame scrolled to the strip: one-line summary (gate chip, run chip, context, Details toggle, drive button) with fact chips collapsed. Board visibility/no-overflow is proven geometrically at the natural scroll top: 260px board fully in the first viewport, document width ≤ viewport width.",
  "07-narrow-expanded.png": "390px expanded inline (frame scrolled down the natural column to the strip): usage facts, revision, last accepted action, audit/model/Skill evidence and the what-will-happen helper; measured at the natural scroll top the board position is pixel-identical and the strip begins below the board's bottom edge, so expansion never covers battlefield interaction.",
  "08-normal-server-hidden.png": "Normal product server (endpoint 404): the experimental control is entirely absent, the battle surface shows no alarming error, and the board remains the focus.",
};
const BACKEND_PARITY_MODULES = [
  "packages/authoritative-engine/transition-v1.mjs",
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

function assertSliceScope() {
  const tracked = runGit(["diff", "--name-only", BASE_COMMIT], ROOT)
    .trim().split("\n").filter(Boolean);
  const status = runGit(["status", "--porcelain"], ROOT)
    .split("\n").map((line) => line.slice(3).trim()).filter(Boolean)
    .filter((line) => !line.startsWith("build/"));
  const changed = [...new Set([...tracked, ...status])];
  const violations = changed.filter((file) => !ALLOWED_PATHS.has(file)
    && !file.startsWith("apps/starcraft-tmg-expo/dist/"));
  ensure(violations.length === 0, "SLICE_PATH_VIOLATION", { violations, changed });
  const backendDrift = runGit(
    ["diff", "--name-only", BASE_COMMIT, "--", "packages/", "content/", "scripts/support/"],
    ROOT,
  ).trim();
  ensure(!backendDrift, "BACKEND_CONTRACT_DRIFT_IN_WORKTREE", { backendDrift });
  return changed;
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
      ensure(integratedMain, "BACKEND_MODULE_HASH_MISMATCH", { relative });
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
  if (existsSync(path.join(DIST_DIR, "index.html"))) {
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

/** Scenario-driven mock of the Codex-owned formal-evidence A2A contract. */
function createA2aMock() {
  const baseTransitions = [
    { action: { type: "creep_spread" }, postStateRevision: 8 },
    { action: { type: "omega_network" }, postStateRevision: 9 },
  ];
  const scenario = {
    // "normal" simulates an ordinary product server: endpoints do not exist.
    exposed: true,
    postCount: 0,
    job: null,
    manifest: {
      schemaVersion: "ticket23_slice248_standard_2000_aa_live_manifest_v1",
      roomId: ROOM_ID,
      room: { stateRevision: 9 },
      state: {
        round: 2,
        phase: "movement",
        activeSideKey: "player2",
        terminal: false,
        gameOver: false,
      },
      usage: {
        providerCalls: 20,
        totalUnits: 967898,
        estimatedCostCnyMicros: 1338574,
      },
      dataWiringAudit: {
        schema: "ticket23_slice248g_current_product_data_wiring_gate_v1",
        status: "passed",
        hash: "a94f8c2e17b34d05f6e890a1c2d3e4f5061728394a5b6c7d8e9f0a1b2c3d4e5f6",
        blockingFindingCount: 0,
      },
      selectedModels: {
        player1: "deepseek-chat · formal-seat-a",
        player2: "deepseek-chat · formal-seat-b",
      },
      strategySkillRefsBySeat: {
        player1: ["skill:zerg-openers@7"],
        player2: ["skill:terran-openers@5"],
      },
      recentAcceptedTransitions: baseTransitions.slice(),
      trainingTruth: false,
    },
  };
  return {
    scenario,
    handle(request, url, response) {
      if (!scenario.exposed) return false;
      if (url.pathname === "/__ticket23/a2a/ui-status" && request.method === "GET") {
        sendJson(response, 200, {
          ok: true,
          job: scenario.job,
          manifest: scenario.manifest,
        });
        return true;
      }
      if (url.pathname === "/__ticket23/a2a/ui-drive" && request.method === "POST") {
        scenario.postCount += 1;
        if (!scenario.job || !["queued", "running"].includes(scenario.job.status)) {
          scenario.job = {
            schemaVersion: "ticket23_slice248_async_drive_job_v1",
            jobId: `mock-drive-${String(scenario.postCount).padStart(4, "0")}`,
            status: "running",
            requestedAt: GENERATED_AT,
            startedAt: GENERATED_AT,
            completedAt: null,
            result: null,
            failure: null,
            trainingTruth: false,
          };
        }
        sendJson(response, 202, { ok: true, job: scenario.job });
        return true;
      }
      return false;
    },
    completeJobWithAppliedAction() {
      scenario.job = {
        ...scenario.job,
        status: "completed",
        completedAt: GENERATED_AT,
        result: { status: "applied", appliedActionCount: 1 },
      };
      scenario.manifest = {
        ...scenario.manifest,
        room: { stateRevision: 10 },
        usage: {
          providerCalls: 21,
          totalUnits: 1084276,
          estimatedCostCnyMicros: 1503445,
        },
        recentAcceptedTransitions: [
          ...scenario.manifest.recentAcceptedTransitions,
          { action: { type: "ventral_sacs" }, postStateRevision: 10 },
        ],
      };
    },
    blockDataGate() {
      scenario.manifest = {
        ...scenario.manifest,
        dataWiringAudit: {
          ...scenario.manifest.dataWiringAudit,
          status: "failed",
          blockingFindingCount: 1,
        },
      };
    },
    passDataGate() {
      scenario.manifest = {
        ...scenario.manifest,
        dataWiringAudit: {
          ...scenario.manifest.dataWiringAudit,
          status: "passed",
          blockingFindingCount: 0,
        },
      };
    },
    failJob() {
      scenario.job = {
        ...scenario.job,
        status: "failed",
        completedAt: GENERATED_AT,
        failure: {
          code: "LIVE_DECISION_ACTION_DID_NOT_CONVERGE",
          message: "mocked typed failure",
          severity: "High",
        },
      };
    },
    clearJob() {
      scenario.job = null;
    },
    makeTerminal() {
      scenario.manifest = {
        ...scenario.manifest,
        state: {
          ...scenario.manifest.state,
          terminal: true,
          gameOver: true,
        },
      };
    },
  };
}

async function startServer(fixture, api, a2a) {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://fixture.local");
      const hasBody = ["POST", "PUT", "PATCH"].includes(request.method || "GET");
      const body = hasBody ? await readRequestBody(request) : { body: {} };
      if (a2a.handle(request, url, response)) return;
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
        // No hosted bot is attached in this fixture; answer honestly with
        // HTTP 200 so the operations panel renders its own quiet error state.
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

async function ariaDisabled(locator) {
  return (await locator.getAttribute("aria-disabled")) === "true";
}

async function capture(page, name, artifacts) {
  const filename = path.join(EVIDENCE_ROOT, name);
  await page.screenshot({ path: filename, fullPage: false });
  artifacts.push(await artifactRecord(filename, SCREENSHOT_EXPLANATIONS[name]));
}

// Return every scrollable ancestor (and the window) to the surface's natural
// entry position. Touch taps center-scroll their target, which moves the
// board within the viewport without moving it in the layout; layout claims
// must be measured at the natural top position (Slice 262 lesson).
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

  const changedFiles = assertSliceScope();
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
  // Same deterministic per-model formation fixture treatment the ticket-14 /
  // slice-262 harnesses applied so the board renders real model bases. This
  // edits only the fixture's initial state, never rules.
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
    title: "Ticket 23 · Slice 248 · Agent-match control browser fixture",
    initialStateAuthority: {
      source: "server_factory",
      state: sampleState,
      dataVersion: data.version,
      receiptHash: hashStarcraftTmgContract({
        source: "ticket-23-slice-248-ui-agent-match-control-v1",
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

  const a2a = createA2aMock();
  const { server, origin } = await startServer(fixture, {
    level3Prefix: STARCRAFT_TMG_LEVEL3_API_PREFIX,
    botPrefix: STARCRAFT_TMG_HOSTED_BOT_SEAT_API_PREFIX,
    botHttpVersion: "starcraft_tmg_hosted_bot_seat_http_v1",
  }, a2a);

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
      // Chromium logs the optional-endpoint probe's 404 as a resource error.
      // That 404 is the asserted normal-server behavior (the control hides),
      // not an application error; filter only that exact probe.
      const url = String(message.location()?.url || "");
      if (url.includes("/__ticket23/a2a/") && /404|Failed to load resource/iu.test(text)) {
        return;
      }
      browserErrors.push(`${label}:console:${text}`);
    });
    page.on("pageerror", (error) => browserErrors.push(`${label}:page:${error.message}`));
  }

  async function issueNarrowRecoveryUrl() {
    const narrowRecovery = await fixture.roomRuntime.issueSeatRecovery({
      roomId: fixture.roomId,
      seatToken: fixture.humanSeatToken,
    });
    ensure(narrowRecovery.ok === true
      && typeof narrowRecovery.recovery?.recoveryToken === "string",
    "NARROW_RECOVERY_TICKET_NOT_ISSUED", { reason: narrowRecovery.reason });
    secrets.push(narrowRecovery.recovery.recoveryToken);
    return `${origin}/room/${encodeURIComponent(fixture.roomId)}#recovery=${encodeURIComponent(narrowRecovery.recovery.recoveryToken)}`;
  }

  try {
    // ── Desktop journey: ready → drive/running → applied → blocked →
    //    failed → recovery → terminal ──────────────────────────────────
    const desktop = await browser.newContext({
      viewport: { width: 1500, height: 1050 },
      locale: "en-US",
      reducedMotion: "reduce",
    });
    await seedPreferences(desktop);
    const page = await desktop.newPage();
    watch(page, "desktop");
    diagnosticPage = page;
    const desktopUrl = `${origin}/room/${encodeURIComponent(fixture.roomId)}#recovery=${encodeURIComponent(fixture.humanRecoveryToken)}`;
    await page.goto(desktopUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await waitBody(page, "Authoritative room connected", 120_000);
    await waitBody(page, "Authoritative Battlefield", 120_000);

    const control = page.getByTestId("agent-agent-match-control");
    await control.waitFor({ timeout: 60_000 });
    const driveButton = page.getByTestId("agent-agent-drive-next");
    await driveButton.waitFor({ timeout: 30_000 });
    checks.push({ id: "stable_test_ids_present", passed: true });

    // Ready state: gate chip, run chip, context, facts.
    await waitBody(page, "Data gate: passed", 30_000);
    await waitBody(page, "Agent: ready", 30_000);
    const readyText = await bodyText(page);
    ensure(/Round 2 · movement · player2 to act/u.test(readyText),
      "CONTEXT_LINE_MISSING", { excerpt: readyText.slice(0, 400) });
    ensure(readyText.includes("Provider calls 20"), "USAGE_CALLS_MISSING");
    ensure(readyText.includes("Units 967,898"), "USAGE_UNITS_MISSING");
    ensure(readyText.includes("Cost ¥1.338574"), "USAGE_COST_MISSING");
    ensure(readyText.includes("State revision 9"), "REVISION_MISSING");
    ensure(readyText.includes("ventral_sacs") === false
      && readyText.includes("omega_network → r9"), "LAST_ACTION_MISSING");
    ensure(!(await ariaDisabled(driveButton)), "DRIVE_DISABLED_IN_READY_STATE");
    // Board focus: the battlefield renders above the control without overlap.
    const board = page.locator('[aria-label^="Battlefield;"]').first();
    const boardBox = await board.boundingBox();
    const controlBox = await control.boundingBox();
    ensure(boardBox && controlBox
      && boardBox.y >= 0 && boardBox.y < 1050
      && controlBox.y + 2 >= boardBox.y + boardBox.height
      && controlBox.height < boardBox.height,
    "BOARD_NOT_VISUAL_FOCUS", { boardBox, controlBox });
    // Bring the strip into the evidence frame (it sits directly below the
    // tall workspace block; the geometry above already proved board focus).
    await control.scrollIntoViewIfNeeded();
    await capture(page, "01-desktop-ready-command-strip.png", artifacts);
    checks.push({ id: "ready_state_shows_gate_context_usage_and_last_action", passed: true });
    checks.push({ id: "desktop_layout_keeps_board_visual_focus", passed: true,
      boardHeight: Math.round(boardBox.height),
      controlHeight: Math.round(controlBox.height) });

    // Exactly one POST per activation; disabled while queued/running.
    await driveButton.click();
    await waitBody(page, ["Agent: thinking…", "Agent: queued"], 30_000);
    ensure(a2a.scenario.postCount === 1, "DRIVE_POST_COUNT_NOT_ONE",
      { postCount: a2a.scenario.postCount });
    ensure(await ariaDisabled(driveButton), "DRIVE_NOT_DISABLED_WHILE_BUSY");
    // Aggressive duplicate attempts: force click + raw DOM dispatch. The
    // disabled state plus the in-flight guard must keep the count at one.
    await driveButton.click({ force: true }).catch(() => {});
    await driveButton.dispatchEvent("click").catch(() => {});
    await page.waitForTimeout(600);
    ensure(a2a.scenario.postCount === 1, "DUPLICATE_POST_WHILE_BUSY",
      { postCount: a2a.scenario.postCount });
    await control.scrollIntoViewIfNeeded();
    await capture(page, "02-desktop-running-thinking.png", artifacts);
    checks.push({ id: "drive_posts_exactly_once_and_stays_disabled_while_busy", passed: true,
      postCount: a2a.scenario.postCount });

    // Applied: the accepted action and room revision visibly refresh.
    a2a.completeJobWithAppliedAction();
    await waitBody(page, "Agent: applied", 30_000);
    await waitBody(page, "State revision 10", 30_000);
    const appliedText = await bodyText(page);
    ensure(appliedText.includes("ventral_sacs → r10"), "APPLIED_LAST_ACTION_STALE");
    ensure(appliedText.includes("Provider calls 21"), "APPLIED_USAGE_STALE");
    ensure(appliedText.includes("Cost ¥1.503445"), "APPLIED_COST_STALE");
    ensure(!(await ariaDisabled(driveButton)), "DRIVE_NOT_REENABLED_AFTER_APPLY");
    await control.scrollIntoViewIfNeeded();
    await capture(page, "03-desktop-applied-refresh.png", artifacts);
    checks.push({ id: "applied_state_refreshes_revision_usage_and_last_action", passed: true });

    // Data-gate blocker visibly prevents execution.
    a2a.blockDataGate();
    await waitBody(page, "Data gate: blocked", 30_000);
    await waitBody(page, "Data gate blocked — execution disabled", 30_000);
    const blockedText = await bodyText(page);
    ensure(blockedText.includes("blocking findings: 1"), "BLOCKING_COUNT_MISSING");
    ensure(await ariaDisabled(driveButton), "DRIVE_ENABLED_UNDER_GATE_BLOCK");
    await driveButton.click({ force: true }).catch(() => {});
    await driveButton.dispatchEvent("click").catch(() => {});
    await page.waitForTimeout(600);
    ensure(a2a.scenario.postCount === 1, "POST_SENT_UNDER_GATE_BLOCK",
      { postCount: a2a.scenario.postCount });
    await control.scrollIntoViewIfNeeded();
    await capture(page, "04-desktop-blocked-gate.png", artifacts);
    checks.push({ id: "data_gate_blocker_visibly_prevents_execution", passed: true });

    // Typed failure: visible card + deliberate retry available.
    a2a.passDataGate();
    a2a.failJob();
    await waitBody(page, "Agent: failed", 30_000);
    await waitBody(page, "Last drive failed (retry available)", 30_000);
    const failedText = await bodyText(page);
    ensure(failedText.includes("LIVE_DECISION_ACTION_DID_NOT_CONVERGE"),
      "FAILURE_CODE_MISSING");
    ensure(failedText.includes("severity: High"), "FAILURE_SEVERITY_MISSING");
    await waitBody(page, "Data gate: passed", 30_000);
    ensure(!(await ariaDisabled(driveButton)), "DRIVE_NOT_REENABLED_AFTER_FAILURE");
    await control.scrollIntoViewIfNeeded();
    await capture(page, "05-desktop-failed-recovery.png", artifacts);
    checks.push({ id: "typed_failure_recovers_visibly", passed: true });

    // Terminal: no further actions can be queued.
    a2a.clearJob();
    a2a.makeTerminal();
    await waitBody(page, "Match terminal", 30_000);
    await waitBody(page, "no further Agent actions can be queued", 30_000);
    ensure(await ariaDisabled(driveButton), "DRIVE_ENABLED_IN_TERMINAL_STATE");
    checks.push({ id: "terminal_state_disables_drive", passed: true });

    await desktop.close();

    // ── Narrow / touch journey ─────────────────────────────────────────
    // Reset the mock to a fresh ready state for the narrow journey.
    a2a.clearJob();
    a2a.scenario.manifest = {
      ...a2a.scenario.manifest,
      room: { stateRevision: 10 },
      state: {
        round: 2,
        phase: "movement",
        activeSideKey: "player2",
        terminal: false,
        gameOver: false,
      },
    };
    const narrowUrl = await issueNarrowRecoveryUrl();
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

    const narrowControl = narrowPage.getByTestId("agent-agent-match-control");
    await narrowControl.waitFor({ timeout: 60_000 });
    await waitBody(narrowPage, "Data gate: passed", 30_000);
    const narrowOverflow = await narrowPage.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    ensure(narrowOverflow.documentWidth <= narrowOverflow.viewportWidth + 1,
      "NARROW_PAGE_HORIZONTAL_OVERFLOW", narrowOverflow);
    const narrowBoard = narrowPage.locator('[aria-label^="Battlefield;"]').first();
    const narrowBoardBox = await narrowBoard.boundingBox();
    ensure(narrowBoardBox && narrowBoardBox.y >= 0 && narrowBoardBox.y < 500
      && narrowBoardBox.height >= 240,
    "NARROW_BATTLEFIELD_NOT_FIRST_VIEWPORT_FOCUS", { box: narrowBoardBox });
    // Collapsed by default on narrow: the fact chips are not rendered yet.
    const narrowCollapsedText = await narrowControl.innerText();
    ensure(!narrowCollapsedText.includes("Provider calls"),
      "NARROW_FACTS_NOT_COLLAPSED", { text: narrowCollapsedText.slice(0, 300) });
    // Frame the compact strip itself; board adjacency is the geometric
    // assertion above, not a pixel claim of this frame.
    await narrowControl.scrollIntoViewIfNeeded();
    await capture(narrowPage, "06-narrow-collapsed.png", artifacts);
    checks.push({ id: "narrow_layout_compact_with_board_visible_no_overflow", passed: true });

    // Expand inline: facts + helper appear without covering the board.
    await narrowControl.getByRole("button", { name: "Toggle Agent control details" }).tap();
    const narrowExpandedText = await narrowControl.innerText();
    ensure(narrowExpandedText.includes("Provider calls 21"),
      "NARROW_EXPAND_FACTS_MISSING");
    ensure(narrowExpandedText.includes("queues exactly one authoritative Agent action")
      || narrowExpandedText.includes("exactly one authoritative Agent action"),
    "NARROW_EXPAND_HELPER_MISSING");
    ensure(narrowExpandedText.includes("audit:"), "NARROW_EXPAND_AUDIT_MISSING");
    // Measure at the natural scroll position: the tap center-scrolled its
    // target, which is test-induced viewport motion, not layout motion.
    await resetScrollToSurfaceTop(narrowPage);
    const narrowBoardBoxAfter = await narrowBoard.boundingBox();
    const narrowControlBox = await narrowControl.boundingBox();
    ensure(narrowBoardBoxAfter && Math.abs(narrowBoardBoxAfter.y - narrowBoardBox.y) < 2
      && Math.abs(narrowBoardBoxAfter.height - narrowBoardBox.height) < 2,
    "NARROW_EXPAND_MOVED_THE_BOARD", {
      before: narrowBoardBox, after: narrowBoardBoxAfter });
    ensure(narrowControlBox
      && narrowControlBox.y + 2 >= narrowBoardBoxAfter.y + narrowBoardBoxAfter.height,
    "NARROW_EXPANDED_CONTROL_COVERS_BOARD", {
      board: narrowBoardBoxAfter, control: narrowControlBox });
    // Scroll the expanded strip into view for its own evidence frame; the
    // geometry above already proved the board is never covered.
    await narrowControl.scrollIntoViewIfNeeded();
    await capture(narrowPage, "07-narrow-expanded.png", artifacts);
    checks.push({ id: "narrow_expand_is_inline_and_preserves_board", passed: true });

    // Touch drive: exactly one POST from the narrow surface too.
    const narrowDrive = narrowPage.getByTestId("agent-agent-drive-next");
    const postsBefore = a2a.scenario.postCount;
    await narrowDrive.tap();
    await waitBody(narrowPage, ["Agent: thinking…", "Agent: queued"], 30_000);
    ensure(a2a.scenario.postCount === postsBefore + 1,
      "NARROW_DRIVE_POST_COUNT_NOT_ONE",
      { before: postsBefore, after: a2a.scenario.postCount });
    await narrowDrive.tap({ force: true }).catch(() => {});
    await narrowPage.waitForTimeout(600);
    ensure(a2a.scenario.postCount === postsBefore + 1,
      "NARROW_DUPLICATE_POST_WHILE_BUSY",
      { postCount: a2a.scenario.postCount });
    checks.push({ id: "narrow_touch_drive_posts_exactly_once", passed: true });

    await narrow.close();

    // ── Normal product server: the experimental control hides silently ──
    a2a.scenario.exposed = false;
    const hiddenRecovery = await fixture.roomRuntime.issueSeatRecovery({
      roomId: fixture.roomId,
      seatToken: fixture.humanSeatToken,
    });
    ensure(hiddenRecovery.ok === true
      && typeof hiddenRecovery.recovery?.recoveryToken === "string",
    "HIDDEN_RECOVERY_TICKET_NOT_ISSUED", { reason: hiddenRecovery.reason });
    secrets.push(hiddenRecovery.recovery.recoveryToken);
    const hiddenUrl = `${origin}/room/${encodeURIComponent(fixture.roomId)}#recovery=${encodeURIComponent(hiddenRecovery.recovery.recoveryToken)}`;
    const hidden = await browser.newContext({
      viewport: { width: 1500, height: 1050 },
      locale: "en-US",
      reducedMotion: "reduce",
    });
    await seedPreferences(hidden);
    const hiddenPage = await hidden.newPage();
    watch(hiddenPage, "normal-server");
    diagnosticPage = hiddenPage;
    await hiddenPage.goto(hiddenUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await waitBody(hiddenPage, "Authoritative room connected", 120_000);
    await waitBody(hiddenPage, "Authoritative Battlefield", 120_000);
    // Give the control several poll cycles to (incorrectly) appear; it must not.
    await hiddenPage.waitForTimeout(6_000);
    ensure(await hiddenPage.getByTestId("agent-agent-match-control").count() === 0,
      "CONTROL_VISIBLE_ON_NORMAL_SERVER");
    ensure(await hiddenPage.getByTestId("agent-agent-drive-next").count() === 0,
      "DRIVE_BUTTON_VISIBLE_ON_NORMAL_SERVER");
    const hiddenText = await bodyText(hiddenPage);
    ensure(!/Data gate|Agent: |A2A_/u.test(hiddenText),
      "ALARMING_A2A_SURFACE_ON_NORMAL_SERVER",
      { excerpt: hiddenText.slice(0, 600) });
    await capture(hiddenPage, "08-normal-server-hidden.png", artifacts);
    checks.push({ id: "hidden_on_normal_server_without_alarming_error", passed: true });
    await hidden.close();

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

  const claimToPixel = [
    { claim: "The control exists only on the formal-evidence server",
      proof: "hidden_on_normal_server_without_alarming_error + 08-normal-server-hidden.png (no control pixels, no error copy)" },
    { claim: "Board stays the visual focus on desktop",
      proof: "desktop_layout_keeps_board_visual_focus (geometric: 560px board above the 101px strip, zero overlap, first viewport) + 01-desktop-ready-command-strip.png (the compact strip itself)" },
    { claim: "Preflight/data-gate is visibly separate from Agent run state",
      proof: "ready/blocked checks + 01 vs 04 screenshots (gate chip + banner are distinct zones from the run chip)" },
    { claim: "One activation sends one and only one POST and locks while busy",
      proof: "drive_posts_exactly_once_and_stays_disabled_while_busy + narrow_touch_drive_posts_exactly_once + 02-desktop-running-thinking.png" },
    { claim: "Accepted action and room revision refresh after apply",
      proof: "applied_state_refreshes_revision_usage_and_last_action + 03-desktop-applied-refresh.png (rev 9→10, omega_network → ventral_sacs)" },
    { claim: "A data-gate blocker visibly prevents execution",
      proof: "data_gate_blocker_visibly_prevents_execution + 04-desktop-blocked-gate.png (banner + disabled button + zero POSTs)" },
    { claim: "A typed failure recovers visibly",
      proof: "typed_failure_recovers_visibly + 05-desktop-failed-recovery.png (failure card with code/severity + re-enabled button)" },
    { claim: "Narrow/touch layout is compact, inline and non-covering",
      proof: "narrow_* checks + 06/07 screenshots (no horizontal overflow; expand does not move the board)" },
  ];

  const reportCore = {
    schemaVersion: "starcraft_tmg_ticket_23_slice_248_ui_agent_match_control_report_v1",
    generatedAt: GENERATED_AT,
    ticket: 23,
    slice: 248,
    subSlice: "ui-agent-match-control",
    status: "passed",
    assertionsPassed: checks.length,
    checks,
    artifacts,
    screenshotExplanations: SCREENSHOT_EXPLANATIONS,
    claimToPixel,
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
      fixture: "legacy sample-state demo room (ticket-14/15/262 harness factory; no hosted bot, no Agent, no Provider); A2A ui-status/ui-drive endpoints are same-origin in-process mocks of the documented contract",
      legacyAdapterInput: { path: "project-d/scripts/starcraft-tmg-rules-v0.mjs (read-only adapter input)", sha256: legacyAdapterHash },
      roomId: fixture.roomId,
      backendRoot,
      backendHead,
      backendModuleParity: parityModules,
      baseCommit: BASE_COMMIT,
      sliceChangedFiles: changedFiles,
      allowedPaths: [...ALLOWED_PATHS],
    },
    boundaries: {
      currentProductCodeServed: true,
      backendModulesEdited: false,
      a2aEndpointsMockedSameOrigin: true,
      providerCalls: 0,
      paidProviderUsed: false,
      sourceRefreshPerformed: false,
      gameplayTruthComputedInUi: false,
      credentialsRendered: false,
      rawModelContentRendered: false,
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
