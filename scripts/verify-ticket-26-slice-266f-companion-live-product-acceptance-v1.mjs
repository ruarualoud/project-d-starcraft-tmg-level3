#!/usr/bin/env node

/**
 * Ticket 26 / Slice 266f — companion live product acceptance gate
 * (conversation UI polish + secure BYOK product seam + real-content
 * continuity + responsive claim-to-pixel).
 *
 * Self-contained verifier (same harness discipline as the Slice 266c–266e
 * gate, which stays untouched and valid):
 *   1. exports the CURRENT worktree Expo Web bundle when any frontend source
 *      is newer than the existing export (current-main, never stale-export);
 *   2. audits the slice scope against the manifest: the integrated 266e
 *      closure is proven as a HEAD ancestor, and `git diff --name-only
 *      <base>..HEAD` must touch only the manifest allowedPaths;
 *   3. creates a TWO-SEAT demo room from the unchanged legacy sample-state
 *      adapter input and composes the REAL companion product module around a
 *      mutation-counting room facade with an injected verifier-controlled
 *      deterministic Provider responder — NO real Provider, NO network, NO
 *      credentials anywhere in this gate;
 *   4. serves a deterministic fixture of the exact Ticket 16 secure BYOK
 *      HTTP contract (metadata / prepare / attach / read / detach with a
 *      single-use nonce and octet-stream ingress) and drives the REAL
 *      Ticket 16 session client + REAL HTTP transport against it headlessly:
 *      attached/missing/error/detached states, credential bytes proven
 *      zeroed after attach, redacted receipts proven free of credential
 *      material, no persistence;
 *   5. drives real Chromium (desktop 1500×1050, narrow/touch 390×844,
 *      reduced motion) through the polished companion journey:
 *        - wide desktop focus sheet (left-anchored, ≤ 66% viewport, the
 *          battlefield stays materially visible and the compact launcher is
 *          never covered) and the mobile full-screen sheet;
 *        - StarCraft blue/cyan communications tokens on rendered computed
 *          styles, amber only on warning surfaces, plus the source-level
 *          invariant (amber hex literals occur only inside each file's WARN
 *          palette);
 *        - a real deterministic CHINESE conversation: the transcript renders
 *          the exact Provider response strings (byte-compared against the
 *          captured responder output — never placeholder prose);
 *        - interruption → explicit-continue (no fabricated reply), checkpoint
 *          isolation, reload resume of the persisted transcript;
 *        - the session-continuity card: per-companion era state, worldbook
 *          origin classification (sealed package / persona-derived / chat
 *          session / product global incl. honestly-labelled fixture),
 *          layered memory counts, Author's Note version — real content or
 *          honest unavailable states;
 *        - the BYOK card's explicit state chip (missing) and secret-hygiene
 *          line in the browser;
 *        - the current-speaker portrait claim-to-pixel proof (committed
 *          1254px keyframe, canvas variance, served-bytes sha256);
 *   6. headless contract phases: deterministic speaker order and reply
 *      accounting for 1, 3 and 6 companions; long-session checkpoint
 *      isolation; swipe/edit branches with lineage; safe import/export/
 *      restore; audit verify + replay candidate; the four permission
 *      surfaces; the formal-versus-fixture worldbook audit (Zagara's sealed
 *      pack entries versus the honestly-labelled fixture global entry; the
 *      fixture entry never appears inside the sealed package export);
 *      durable encrypted-SQLite process-restart resume with fail-closed key
 *      handling; the full BYOK seam cycle;
 *   7. records the user-authorized ONE bounded live Chinese BYOK conversation
 *      acceptance as an explicit reservation (the implementing agent is
 *      forbidden from calling paid Providers or reading credentials; the
 *      integrating run invokes only the existing Keychain → isolated-Worker
 *      path, stops on 401/402/403 or ambiguous dispatch, never silently
 *      retries, detaches at the end, and records exact calls/tokens/cost);
 *   8. writes a claim-to-pixel index, sha256-hashed artifacts and a machine
 *      report under build/ticket-26-slice-266f-companion-live-product-acceptance-v1/,
 *      then scans the report AND every artifact for every secret handled in
 *      the gate (seat tokens, recovery tokens, the synthetic credential
 *      sentinel).
 *
 * No Provider call, no credential read, no source refresh, no Room mutation,
 * no hidden chain-of-thought, no fabricated model reply, and no gameplay
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
const BUILD_ROOT = path.join(ROOT, "build/ticket-26-slice-266f-companion-live-product-acceptance-v1");
const EVIDENCE_ROOT = path.join(BUILD_ROOT, "browser-evidence");
const REPORT_PATH = path.join(BUILD_ROOT, "browser-report.json");
const SLICE_266F_BASE_COMMIT = "fa1c83dc018ef1085b6926ddf1debe24ae65f03b";
const SLICE_266E_CLOSURE_COMMIT = "2d14ca6160a7a10697b56dfa02157329e5f16c1c";
const GENERATED_AT = "2026-09-22T00:00:00.000Z";
const ROOM_ID = "ticket26-slice266f-companion-live-product";
const AGENT_API_PREFIX = "/starcraft-tmg-level3/agent/api/v2";
const PROVIDER_API_PREFIX = "/starcraft-tmg-level3/provider/api/v1";
const LEGACY_ADAPTER_PATH = path.join(PROJECT_D_ROOT, "scripts/starcraft-tmg-rules-v0.mjs");
const SYNTHETIC_SECRET = "sk-266f-synthetic-fixture-credential-never-real";
const MANIFEST_ALLOWED_PATHS = [
  ".kimi-code/agents/project-d-live-acceptance.md",
  "packages/companion-backend-module-v1/",
  "packages/product-composition/companion-room-session-service-v1.mjs",
  "packages/product-composition/companion-product-module-v1.mjs",
  "packages/client-domain/client-domain-v1.mjs",
  "apps/starcraft-tmg-expo/lib/level3/client-domain-provider.tsx",
  "apps/starcraft-tmg-expo/components/character/tactical-adjutant-panel.tsx",
  "apps/starcraft-tmg-expo/components/character/companion-catalogue-panel.tsx",
  "apps/starcraft-tmg-expo/components/character/companion-catalogue-content.d.ts",
  "scripts/verify-ticket-26-slice-266f-companion-live-product-acceptance-v1.mjs",
  "scripts/run-ticket-26-slice-266f-live-byok-companion-v1.mjs",
  "docs/ticket-26-slice-266f-companion-live-product-acceptance-v1-2026-09-22.md",
];
const ADJUTANT_PANEL_SOURCE = "apps/starcraft-tmg-expo/components/character/tactical-adjutant-panel.tsx";
const CATALOGUE_PANEL_SOURCE = "apps/starcraft-tmg-expo/components/character/companion-catalogue-panel.tsx";
const SCREENSHOT_EXPLANATIONS = {
  "01-desktop-bound-live-identity.png": "Room bound via recovery URL: the live Field-comms identity renders Sarah Kerrigan in the polished blue/cyan communications theme.",
  "02-desktop-wide-focus-sheet.png": "Wide desktop focus mode: the expanded floating body is a left-anchored viewport-fixed sheet (two columns, ≤ 66% of the viewport); the battlefield stays materially visible on the right and the compact launcher chip at bottom-right is never covered.",
  "03-desktop-chat-cycle-real-responses.png": "Real deterministic Chinese conversation: user turn with @Kerrigan mention, then Kerrigan, then Zagara — the transcript renders the exact Provider response strings (byte-compared against the captured responder output), deterministic order, server providerAccounting.calls === 2.",
  "04-desktop-interrupted-amber-warning.png": "Verifier-armed Provider outage: the explicit interrupted card renders in amber (the only warning hue); accepted history preserved, no fabricated reply, explicit-continue-only.",
  "05-desktop-continuity-real-content.png": "Session continuity card: per-companion era state, worldbook origin classification (sealed package / persona-derived / chat session / product global with honestly-labelled fixture), layered memory counts and the Author's Note version — real server projections only.",
  "06-desktop-byok-state-missing.png": "Secure BYOK card: explicit state chip (state: missing · agent session required), the deterministic Ticket-16-contract fixture profile listed after catalogue load, and the secret-hygiene line (field cleared before network await, bytes zeroed, isolated Worker session memory only).",
  "07-desktop-chat-speaker-pixels.png": "Current-speaker portrait: real committed 1254px keyframe, canvas variance proof, labelled asset sha256 equals the committed file and the served bundled bytes.",
  "08-desktop-collapsed-compact-launcher.png": "After the sheet's own Collapse control: the compact floating launcher chip returns (emblem + TACTICAL COMMS + identity + status dot), shrink-wrapped and never spanning the viewport.",
  "09-narrow-mobile-sheet-resumed.png": "390px touch: the expanded body is a full-screen sheet; the persisted conversation resumes inside it with zero horizontal overflow.",
  "10-narrow-mobile-sheet-cards.png": "390px touch: the Tavern-equivalent cards (persona/worldbook/memory/branches/author's note/import-export/audit/permissions/promotions/continuity) render inside the full-screen sheet; four live permission surfaces deny opponent-private everywhere; zero horizontal overflow.",
  "11-narrow-collapsed-chip.png": "390px touch: after Collapse the compact launcher chip returns at the bottom-right; the battlefield is fully visible again.",
};
const BACKEND_MODULES_RECORDED = [
  "packages/authoritative-engine/transition-v1.mjs",
  "packages/client-domain/character-presentation-projection-v2.mjs",
  "packages/client-domain/client-domain-v1.mjs",
  "packages/client-domain/portable-contract-hash-v1.mjs",
  "packages/client-domain/secure-provider-session-client-v1.mjs",
  "packages/client-domain/secure-provider-transport-adapters-v1.mjs",
  "packages/companion-backend-module-v1/index.mjs",
  "packages/companion-backend-module-v1/in-memory-adapter-v1.mjs",
  "packages/companion-backend-module-v1/durable-persistence-adapters-v1.mjs",
  "packages/companion-backend-module-v1/worldbook-memory-engine-v1.mjs",
  "packages/http-adapter/handler-v1.mjs",
  "packages/product-composition/companion-product-module-v1.mjs",
  "packages/product-composition/companion-room-session-service-v1.mjs",
  "packages/product-composition/index.mjs",
  "packages/room-runtime/in-memory-room-v1.mjs",
  "content/characters/companion-catalogue-v1.mjs",
  "content/characters/companion-portrait-asset-registry-v1.mjs",
  "content/characters/companion-portrait-animation-binding-v1.mjs",
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

async function assertSliceScope() {
  const closureIsIntegrated = spawnSync(
    "git",
    ["merge-base", "--is-ancestor", SLICE_266E_CLOSURE_COMMIT, "HEAD"],
    { cwd: ROOT, encoding: "utf8" },
  );
  ensure(closureIsIntegrated.status === 0, "COMPANION_266E_CLOSURE_NOT_INTEGRATED", {
    closureCommit: SLICE_266E_CLOSURE_COMMIT,
    stderr: String(closureIsIntegrated.stderr || "").slice(-800),
  });
  const changed = runGit(
    ["diff", "--name-only", SLICE_266F_BASE_COMMIT, "HEAD"],
    ROOT,
  ).trim().split("\n").filter(Boolean);
  const outside = changed.filter((relative) => (
    !MANIFEST_ALLOWED_PATHS.some((allowed) => (
      allowed.endsWith("/") ? relative.startsWith(allowed) : relative === allowed
    ))
  ));
  ensure(!outside.length, "SLICE_SCOPE_VIOLATION_OUTSIDE_MANIFEST_PATHS", { outside });
  ensure(changed.length > 0, "SLICE_DIFF_EMPTY");
  const modules = [];
  for (const relative of BACKEND_MODULES_RECORDED) {
    const filename = path.join(ROOT, relative);
    ensure(existsSync(filename), "BACKEND_MODULE_MISSING", { relative });
    modules.push({ path: relative, sha256: await sha256File(filename) });
  }
  modules.push({
    path: path.relative(ROOT, LEGACY_ADAPTER_PATH),
    sha256: await sha256File(LEGACY_ADAPTER_PATH),
    role: "read-only legacy adapter input (outside the workspace)",
  });
  return { changed, modules };
}

async function importWorktree(relative) {
  return import(pathToFileURL(path.join(ROOT, relative)).href);
}

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
  const force = process.env.TICKET26_266F_FORCE_EXPORT === "1";
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
  return Buffer.concat(chunks);
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

/** Depth-limited scan for a seat token inside an authoritative response. */
function findSeatToken(value, depth = 0) {
  if (!value || typeof value !== "object" || depth > 8) return null;
  for (const [key, child] of Object.entries(value)) {
    if (/^seatToken$/iu.test(key) && typeof child === "string" && child.length >= 16) {
      return child;
    }
    const found = findSeatToken(child, depth + 1);
    if (found) return found;
  }
  return null;
}

/** rgb()/rgba() CSS string → HSL hue in degrees (0..360). */
function rgbToHue(value) {
  const match = String(value || "").match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/u);
  if (!match) return null;
  const [r, g, b] = [Number(match[1]) / 255, Number(match[2]) / 255, Number(match[3]) / 255];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const delta = max - min;
  let hue;
  if (max === r) hue = 60 * (((g - b) / delta) % 6);
  else if (max === g) hue = 60 * ((b - r) / delta + 2);
  else hue = 60 * ((r - g) / delta + 4);
  return (hue + 360) % 360;
}

// ── Source-level contract assertions (266f.1/266f.2) ─────────────────────

async function assertSourceContracts() {
  const panel = await readFile(path.join(ROOT, ADJUTANT_PANEL_SOURCE), "utf8");
  const catalogue = await readFile(path.join(ROOT, CATALOGUE_PANEL_SOURCE), "utf8");

  // Amber only for warnings: every amber hex literal occurs only inside each
  // file's WARN palette definition.
  for (const [label, source] of [["adjutant", panel], ["catalogue", catalogue]]) {
    const warnBlock = source.match(/const WARN = \{[\s\S]*?\} as const;/u);
    ensure(warnBlock, "WARN_PALETTE_MISSING", { label });
    const amberHexes = [...warnBlock[0].matchAll(/#[0-9a-fA-F]{6}/gu)].map((m) => m[0]);
    ensure(amberHexes.length >= 3, "WARN_PALETTE_TOO_SMALL", { label });
    const outside = source.replace(warnBlock[0], "");
    const leaks = amberHexes.filter((hex) => outside.includes(hex));
    ensure(!leaks.length, "AMBER_LITERAL_OUTSIDE_WARN_PALETTE", { label, leaks });
    const commsBlock = source.match(/const COMMS = \{[\s\S]*?\} as const;/u);
    ensure(commsBlock, "COMMS_PALETTE_MISSING", { label });
    const staleOlive = outside.match(
      /#a8bd7d|#d2ae59|#f6dda0|#080f0b|#101912|#1b291c|#4c6147|#66562d|#15150d/u);
    ensure(!staleOlive, "OLIVE_THEME_LITERAL_REMAINS", { label, hit: staleOlive?.[0] });
  }

  // Secret hygiene: the password field is cleared BEFORE the network await
  // and the mutable credential bytes are zeroed in the finally path.
  const attachBody = panel.slice(
    panel.indexOf("async function attachProviderSecret"),
  ).slice(0, 900);
  const clearAt = attachBody.indexOf('setProviderKeyDraft("");');
  const awaitAt = attachBody.indexOf("await runProviderIntent({ type: \"attach_secret\"");
  const zeroAt = attachBody.indexOf("credentialBytes.fill(0);");
  ensure(clearAt >= 0 && awaitAt > clearAt && zeroAt > awaitAt,
    "SECRET_CLEAR_OR_ZERO_ORDER_WRONG", { clearAt, awaitAt, zeroAt });

  // New 266f surfaces exist in the UI source.
  for (const testId of [
    "companion-focus-sheet",
    "companion-mobile-sheet",
    "companion-focus-sheet-close",
    "companion-mobile-sheet-close",
    "secure-provider-state-chip",
    "secure-provider-redacted-receipt",
    "secure-provider-secret-hygiene",
    "companion-chat-continuity",
    "companion-chat-continuity-era",
    "companion-chat-continuity-worldbook",
    "companion-chat-continuity-memory",
    "companion-chat-continuity-authors-note",
  ]) {
    ensure(panel.includes(testId), "UI_SURFACE_TESTID_MISSING", { testId });
  }
  return { amberInvariant: true, secretHygieneOrder: true, surfaces: 12 };
}

// ── Deterministic Ticket 16 secure BYOK HTTP fixture ─────────────────────
// Implements the exact server contract the REAL Ticket 16 client speaks:
// metadata / prepare(consent) / attach(octet-stream + single-use nonce) /
// read / detach, with safe rejection codes. Receipts record redacted facts
// only (never the credential bytes, never their hash). Everything lives in
// process memory — the fixture persists nothing.

function createSecureProviderFixture() {
  const profileHash = createHash("sha256")
    .update("ticket26-266f-fixture-provider-profile").digest("hex");
  const policyHash = createHash("sha256")
    .update("ticket26-266f-fixture-budget-policy").digest("hex");
  const profile = {
    profileRef: {
      id: "fixture.openai-compatible.v1",
      version: "1.0.0",
      hash: profileHash,
    },
    providerId: "fixture-openai-compatible",
    model: "fixture-chat-zh-v1",
    maxContextUnits: 8192,
    maxOutputUnits: 1024,
    timeoutMs: 30_000,
    trainingTruth: false,
  };
  const state = {
    profile,
    sequence: 0,
    attachment: null,
    consumedNonces: new Set(),
    receipts: [],
    failNextAttach: null,
  };
  const ok = (result) => ({ schemaVersion: "starcraft_tmg_secure_provider_http_v1", result });
  const reject = (reason, extra = {}) => ({
    schemaVersion: "starcraft_tmg_secure_provider_http_v1",
    result: { ok: false, reason, ...extra },
  });
  const budget = () => ({
    policyHash,
    maxTotalUnits: 100_000,
    maxTurns: 8,
    maxInputUnitsPerTurn: 8_192,
    maxOutputUnitsPerTurn: 1_024,
    currency: "USD",
  });
  const provider = () => ({
    profileRef: profile.profileRef,
    providerId: profile.providerId,
    requestedModel: profile.model,
  });

  async function handle({ method, pathname, query, rawBody, headers }) {
    const sub = pathname.slice(PROVIDER_API_PREFIX.length).replace(/^\/+/u, "");
    if (method === "GET" && sub === "metadata") {
      state.receipts.push({ kind: "metadata", at: GENERATED_AT });
      return { status: 200, body: ok({ ok: true, profiles: [profile] }) };
    }
    if (method === "POST" && sub === "attachments/intents") {
      let body = {};
      try { body = JSON.parse(rawBody.toString("utf8") || "{}"); } catch { body = {}; }
      if (body.consentAccepted !== true
        || body.disclosureNoticeVersion !== "starcraft_tmg_provider_data_disclosure_v1") {
        state.receipts.push({ kind: "prepare_rejected", reason: "provider_disclosure_consent_required", at: GENERATED_AT });
        return { status: 200, body: reject("provider_disclosure_consent_required") };
      }
      const ref = body.providerProfileRef || {};
      if (ref.id !== profile.profileRef.id
        || ref.version !== profile.profileRef.version
        || ref.hash !== profile.profileRef.hash) {
        state.receipts.push({ kind: "prepare_rejected", reason: "provider_profile_not_available", at: GENERATED_AT });
        return { status: 200, body: reject("provider_profile_not_available") };
      }
      if (state.attachment && state.attachment.state !== "detached") {
        state.receipts.push({ kind: "prepare_rejected", reason: "provider_attachment_already_active", at: GENERATED_AT });
        return { status: 200, body: reject("provider_attachment_already_active") };
      }
      state.sequence += 1;
      const attachmentId = `att-266f-${String(state.sequence).padStart(4, "0")}`;
      const nonce = createHash("sha256")
        .update(`ticket26-266f-ingress-nonce-${attachmentId}`).digest("base64url");
      state.attachment = {
        attachmentId,
        state: "awaiting_ingress",
        provider: provider(),
        budget: budget(),
        consentedAt: GENERATED_AT,
        ingressExpiresAt: "2026-09-22T00:05:00.000Z",
        attachmentExpiresAt: "2026-09-22T01:00:00.000Z",
        automaticRetryAllowed: false,
        sensitiveMaterialPersisted: false,
        trainingTruth: false,
      };
      state.pendingNonce = nonce;
      state.receipts.push({ kind: "prepare", attachmentId, state: "awaiting_ingress", at: GENERATED_AT });
      return {
        status: 200,
        body: ok({
          ok: true,
          attachment: state.attachment,
          ingress: {
            nonce,
            expiresAt: state.attachment.ingressExpiresAt,
            mediaType: "application/octet-stream",
            minBytes: 8,
            maxBytes: 8_192,
            singleUse: true,
          },
        }),
      };
    }
    const secretMatch = sub.match(/^attachments\/([^/]+)\/secret$/u);
    if (method === "PUT" && secretMatch) {
      const attachment = state.attachment;
      const nonce = String(headers["x-project-d-provider-ingress-nonce"] || "");
      if (!attachment || attachment.attachmentId !== secretMatch[1]
        || attachment.state !== "awaiting_ingress") {
        return { status: 200, body: reject("provider_attachment_not_found") };
      }
      if (state.failNextAttach) {
        const reason = state.failNextAttach;
        state.failNextAttach = null;
        state.receipts.push({ kind: "attach_rejected", reason, at: GENERATED_AT });
        return { status: 200, body: reject(reason) };
      }
      if (nonce !== state.pendingNonce || state.consumedNonces.has(nonce)) {
        state.receipts.push({ kind: "attach_rejected", reason: "provider_ingress_rejected", at: GENERATED_AT });
        return { status: 200, body: reject("provider_ingress_rejected") };
      }
      if (rawBody.byteLength < 8 || rawBody.byteLength > 8_192) {
        state.receipts.push({ kind: "attach_rejected", reason: "provider_secret_bytes_invalid", at: GENERATED_AT });
        return { status: 200, body: reject("provider_secret_bytes_invalid") };
      }
      state.consumedNonces.add(nonce);
      state.pendingNonce = null;
      // Redacted receipt: byte length only. The bytes themselves are zeroed
      // immediately and never stored, hashed, or logged.
      const byteLength = rawBody.byteLength;
      rawBody.fill(0);
      state.attachment = {
        ...attachment,
        state: "attached",
        attachedAt: GENERATED_AT,
      };
      state.receipts.push({ kind: "attach", attachmentId: attachment.attachmentId, byteLength, state: "attached", at: GENERATED_AT });
      return { status: 200, body: ok({ ok: true, attachment: state.attachment }) };
    }
    const attachmentMatch = sub.match(/^attachments\/([^/]+)$/u);
    if (attachmentMatch && state.attachment
      && state.attachment.attachmentId === attachmentMatch[1]
      && query.roomId && query.sessionId) {
      if (method === "GET") {
        state.receipts.push({ kind: "read", attachmentId: state.attachment.attachmentId, state: state.attachment.state, at: GENERATED_AT });
        return { status: 200, body: ok({ ok: true, attachment: state.attachment }) };
      }
      if (method === "DELETE") {
        state.attachment = {
          ...state.attachment,
          state: "detached",
          detachedAt: GENERATED_AT,
          detachReason: "explicit_user_detach",
        };
        state.receipts.push({ kind: "detach", attachmentId: state.attachment.attachmentId, state: "detached", at: GENERATED_AT });
        return { status: 200, body: ok({ ok: true, attachment: state.attachment }) };
      }
    }
    return { status: 200, body: reject("provider_control_failed") };
  }

  return { state, handle };
}

async function startServer(fixture, api, requestLog) {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://fixture.local");
      const hasBody = ["POST", "PUT", "PATCH"].includes(request.method || "GET");
      const rawBody = hasBody ? await readRequestBody(request) : Buffer.alloc(0);
      if (url.pathname.startsWith(api.companionPrefix)) {
        requestLog.push({
          prefix: "companion",
          method: request.method,
          pathname: url.pathname,
          authorized: Boolean(request.headers.authorization),
        });
        let body = {};
        try { body = rawBody.byteLength ? JSON.parse(rawBody.toString("utf8")) : {}; } catch { body = {}; }
        const result = await fixture.companionModule.handle({
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
        requestLog.push({ prefix: "agent", method: request.method, pathname: url.pathname });
        sendJson(response, 200, {
          schemaVersion: "starcraft_tmg_online_agent_http_v1",
          result: { ok: false, reason: "ONLINE_AGENT_SESSION_NOT_ATTACHED_IN_FIXTURE" },
        });
        return;
      }
      if (url.pathname.startsWith(PROVIDER_API_PREFIX)) {
        requestLog.push({
          prefix: "provider",
          method: request.method,
          pathname: url.pathname,
          queryKeys: [...url.searchParams.keys()],
        });
        const result = await fixture.secureProvider.handle({
          method: request.method,
          pathname: url.pathname,
          query: Object.fromEntries(url.searchParams),
          rawBody,
          headers: request.headers,
        });
        sendJson(response, result.status, result.body);
        return;
      }
      if (url.pathname.startsWith(api.level3Prefix)
        || url.pathname.startsWith("/starcraft-tmg-level3/assets/v1/character/")) {
        let body = {};
        try { body = rawBody.byteLength ? JSON.parse(rawBody.toString("utf8")) : {}; } catch { body = {}; }
        const result = await fixture.roomAdapter.handle({
          method: request.method,
          pathname: url.pathname,
          query: url.searchParams,
          headers: request.headers,
          rawBody,
          body,
          bodyBytes: rawBody.byteLength,
        });
        const capturedToken = findSeatToken(result.response);
        if (capturedToken) fixture.noteLiveSeatToken?.(capturedToken);
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

// Slice 266f sheet portal: the expanded sheet (and every section inside it)
// is portaled to document.body on web to escape the dock ScrollView's RNW
// compositing transform, so sheet content is queried at page scope. Only the
// collapsed/expanded launcher header chip stays inside the dock.
function sectionButton(page, name) {
  return page.getByRole("button", { name });
}

function chatSection(page) {
  return page.getByTestId("companion-chat-section");
}

async function documentOverflow(page) {
  return page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
}

async function computedColors(page, testId, properties) {
  return page.evaluate(([id, props]) => {
    const el = document.querySelector(`[data-testid="${id}"]`);
    if (!el) return null;
    const style = getComputedStyle(el);
    return Object.fromEntries(props.map((prop) => [prop, style[prop]]));
  }, [testId, properties]);
}

/**
 * Claim-to-pixel proof for the current chat speaker portrait (identical
 * discipline to the 266c–266e gate): committed 1254px source, canvas
 * luminance variance, labelled asset sha256 == committed file == served
 * bundled bytes.
 */
async function proveChatSpeakerPixels(page, request, viewportWidth) {
  const chat = chatSection(page);
  const metaText = await chat.getByTestId("companion-chat-speaker-asset-meta").innerText();
  const assetMatch = metaText.match(/asset:\s*(\S+)/u);
  const hashMatch = metaText.match(/sha256:\s*([0-9a-f]{12})/u);
  ensure(assetMatch && hashMatch, "CHAT_PORTRAIT_META_MISSING", { metaText });
  const assetPath = assetMatch[1];
  const hashPrefix = hashMatch[1];
  const committedFile = safeFile(ROOT, assetPath);
  ensure(committedFile && existsSync(committedFile), "LABELLED_ASSET_NOT_COMMITTED", { assetPath });
  const committedHash = await sha256File(committedFile);
  ensure(committedHash.startsWith(hashPrefix),
    "UI_HASH_PREFIX_MISMATCH", { assetPath, hashPrefix, committedHash });

  const frame = chat.getByTestId("companion-chat-speaker-portrait-img");
  await frame.waitFor({ timeout: 30_000 });
  const img = frame.locator("img").first();
  await img.waitFor({ state: "attached", timeout: 30_000 });
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="companion-chat-speaker-portrait-img"] img');
    return el && el.complete && el.naturalWidth > 0;
  }, null, { timeout: 30_000 });
  const decoded = await img.evaluate((el) => ({
    naturalWidth: el.naturalWidth,
    naturalHeight: el.naturalHeight,
    src: el.currentSrc || el.src,
  }));
  ensure(decoded.naturalWidth === 1254 && decoded.naturalHeight === 1254,
    "CHAT_PORTRAIT_NOT_COMMITTED_SOURCE", { decoded, assetPath });

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
  ensure(renderInfo.backgroundImage, "CHAT_PORTRAIT_NOT_RENDERED_AS_IMAGE_LAYER", { assetPath });

  const box = await frame.boundingBox();
  ensure(box && box.width >= 64 && box.height >= 64
    && box.x >= -1 && box.x + box.width <= viewportWidth + 1,
  "CHAT_PORTRAIT_NOT_SAFE_OR_NOT_CONTAINED", { box, viewportWidth });

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
    "CHAT_PORTRAIT_PIXELS_FLAT_OR_GLYPH", { assetPath, variance });

  const served = await request.get(renderInfo.backgroundImage);
  ensure(served.ok(), "CHAT_PORTRAIT_SERVE_FAILED", { src: renderInfo.backgroundImage, status: served.status() });
  const servedHash = sha256Buffer(await served.body());
  ensure(servedHash === committedHash,
    "SERVED_BYTES_NOT_COMMITTED_ASSET", { assetPath, servedHash, committedHash });

  return {
    assetPath,
    contentHash: committedHash,
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

  ensure(existsSync(LEGACY_ADAPTER_PATH), "LEGACY_ADAPTER_INPUT_MISSING", {
    path: LEGACY_ADAPTER_PATH,
  });
  const scope = await assertSliceScope();
  const worktreeHead = runGit(["rev-parse", "HEAD"], ROOT).trim();
  const sourceContracts = await assertSourceContracts();

  const exportInfo = await ensureWebExport();

  const { loadStarcraftTmgData, createStarcraftTmgSampleState } =
    await import(pathToFileURL(LEGACY_ADAPTER_PATH).href);
  const { createStarcraftTmgAuthoritativeEngine, hashStarcraftTmgContract } =
    await importWorktree("packages/authoritative-engine/transition-v1.mjs");
  const { createStarcraftTmgRoomRuntime } =
    await importWorktree("packages/room-runtime/in-memory-room-v1.mjs");
  const { createStarcraftTmgLevel3HttpAdapter, STARCRAFT_TMG_LEVEL3_API_PREFIX } =
    await importWorktree("packages/http-adapter/handler-v1.mjs");
  const { STARCRAFT_TMG_HOSTED_BOT_SEAT_API_PREFIX } = await importWorktree(
    "packages/client-domain/hosted-bot-seat-transport-v1.mjs");
  const { hashStarcraftTmgClientContract } = await importWorktree(
    "packages/client-domain/portable-contract-hash-v1.mjs");
  const { createStarcraftTmgSecureProviderSessionClientV1 } = await importWorktree(
    "packages/client-domain/secure-provider-session-client-v1.mjs");
  const { createHttpStarcraftTmgSecureProviderClientTransportV1 } = await importWorktree(
    "packages/client-domain/secure-provider-transport-adapters-v1.mjs");
  const {
    createInMemoryPersistenceAdapter,
    createInMemoryProviderAdapter,
    verifyCompanionAuditExport,
  } = await importWorktree("packages/companion-backend-module-v1/index.mjs");
  const {
    STARCRAFT_TMG_COMPANION_PRODUCT_API_PREFIX,
    companionProductPackageInputFromCatalogueEntryV1,
    companionPortraitAssetCatalogV1,
    companionPortraitPresentationAssetsV1,
    createStarcraftTmgCompanionProductModuleV1,
    createStarcraftTmgCompanionProductPersistenceV1,
  } = await importWorktree("packages/product-composition/index.mjs");
  const { COMPANION_CATALOGUE_V1 } = await importWorktree(
    "content/characters/companion-catalogue-v1.mjs");

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
  const engine = createStarcraftTmgAuthoritativeEngine({ now: () => GENERATED_AT });
  const roomRuntime = createStarcraftTmgRoomRuntime({
    authorityEngine: engine,
    characterReleaseChannel: "development_internal",
    now: () => GENERATED_AT,
  });
  const seatPlan = [
    { label: "host", seatKey: "player1", roleMode: "player", principalType: "human" },
    { label: "guest", seatKey: "player2", roleMode: "player", principalType: "human" },
  ];
  const created = await roomRuntime.createRoom({
    roomId: ROOM_ID,
    gameId: "starcraft-tmg",
    surfaceMode: "classic",
    title: "Ticket 26 · Slice 266f · Companion live product acceptance fixture",
    initialStateAuthority: {
      source: "server_factory",
      state: sampleState,
      dataVersion: data.version,
      receiptHash: hashStarcraftTmgContract({
        source: "ticket-26-slice-266f-companion-live-product-acceptance-v1",
        roomId: ROOM_ID,
        state: sampleState,
      }),
      serverSeatPlan: seatPlan,
    },
    serverSeatPlan: seatPlan,
  });
  ensure(created.ok, "FIXTURE_ROOM_CREATE_FAILED", { reason: created.reason });
  const hostSeatToken = created.credentials.host.seatToken;
  const guestSeatToken = created.credentials.guest.seatToken;

  // Mutation-counting facade: any Room mutation the companion path attempted
  // would be counted here and fail the gate.
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

  // Verifier-controlled deterministic responder (NO real Provider, NO
  // network, NO credentials). Replies are Chinese deterministic strings; the
  // exact produced content is recorded so the gate can byte-compare the
  // rendered transcript against the ACTUAL Provider responses.
  const providerProbe = { calls: 0, failNext: 0, interruptions: 0, requests: [], responses: [] };
  const responder = async (request) => {
    providerProbe.calls += 1;
    if (providerProbe.failNext > 0) {
      providerProbe.failNext -= 1;
      providerProbe.interruptions += 1;
      throw new Error("verifier-armed deterministic provider outage");
    }
    providerProbe.requests.push({
      requestId: request.requestId,
      companionRef: String(request.companionRef?.id || ""),
      messages: request.messages.map((message) => ({
        role: message.role,
        content: String(message.content),
      })),
    });
    const slug = String(request.companionRef?.id || "companion")
      .replace(/^starcraft-tmg\.companion\./u, "");
    const lastUser = [...request.messages].reverse()
      .find((message) => !message.content.startsWith("[system]")) || request.messages.at(-1);
    const content = `[${slug}] 确定性回执 #${providerProbe.calls}：已收到「${String(lastUser?.content || "").slice(0, 32)}」，仅依据席位公开信息作答。`;
    providerProbe.responses.push({ companionRef: slug, content });
    return {
      content,
      rationale: "公开确定性理由（本路径不存在隐藏思维链）",
      uncertainty: 0.1,
      usage: { promptTokens: 128, completionTokens: 32, reportedCostUnits: 0 },
    };
  };
  const packagesForProduct = () => COMPANION_CATALOGUE_V1.entries.map((entry) =>
    companionProductPackageInputFromCatalogueEntryV1(entry, {
      presentationAssets: companionPortraitPresentationAssetsV1(entry.characterId),
    }));
  const GLOBAL_WORLDBOOK_FIXTURE = [{
    entryId: "global-koprulu-sector",
    label: "Koprulu sector (global tier)",
    content: "The Koprulu sector is the shared theatre; terran, zerg and protoss factions contest it.",
    triggers: [{ kind: "keyword", keywords: ["koprulu"] }],
    priority: 5,
    tokenBudget: 96,
    provenance: {
      sourceKind: "platform_original",
      author: "Project D",
      license: "proprietary-development-internal",
      sourceRefs: ["fixture://global-worldbook/koprulu"],
      notes: "Verifier-controlled global-tier worldbook fixture; presentation framing only.",
    },
    sourceReceipts: [{
      receiptId: "global-koprulu-receipt",
      sourceRef: "fixture://global-worldbook/koprulu",
    }],
  }];
  const companionModule = createStarcraftTmgCompanionProductModuleV1({
    roomRuntime: roomFacade,
    persistence: createInMemoryPersistenceAdapter(),
    provider: createInMemoryProviderAdapter({ responder }),
    packages: packagesForProduct(),
    assetCatalog: companionPortraitAssetCatalogV1(),
    globalWorldbookEntries: GLOBAL_WORLDBOOK_FIXTURE,
    worldbookRecursionDepth: 2,
    now: () => GENERATED_AT,
  });
  const secureProvider = createSecureProviderFixture();

  const liveSeatTokens = [];
  const fixture = {
    roomId: ROOM_ID,
    roomRuntime,
    companionModule,
    secureProvider,
    roomAdapter: createStarcraftTmgLevel3HttpAdapter({
      roomRuntime: roomFacade,
      assetRoot: ROOT,
    }),
    hostSeatToken,
    guestSeatToken,
    noteLiveSeatToken(token) {
      if (!liveSeatTokens.includes(token)) liveSeatTokens.push(token);
    },
    liveSeatToken() {
      return liveSeatTokens.at(-1) || hostSeatToken;
    },
  };

  async function issueRecovery(seatToken) {
    const recovery = await roomRuntime.issueSeatRecovery({
      roomId: ROOM_ID,
      seatToken,
    });
    ensure(recovery?.ok === true && typeof recovery.recovery?.recoveryToken === "string",
      "FIXTURE_RECOVERY_ISSUE_FAILED", { reason: recovery?.reason });
    return recovery.recovery.recoveryToken;
  }

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
    companionPrefix: STARCRAFT_TMG_COMPANION_PRODUCT_API_PREFIX,
    botPrefix: STARCRAFT_TMG_HOSTED_BOT_SEAT_API_PREFIX,
    botHttpVersion: "starcraft_tmg_hosted_bot_seat_http_v1",
  }, requestLog);

  const secrets = [hostSeatToken, guestSeatToken, SYNTHETIC_SECRET];
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

  const checks = [];
  const claims = [];
  const artifacts = [];
  const browserErrors = [];
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

  async function openChatSection(page, { touch = false } = {}) {
    // Idempotent: expand the launcher only when collapsed, and open the chat
    // section only when it is not already open. (The 266f focus-sheet/mobile
    // -sheet assertions expand the panel before this helper runs; a blind
    // toggle would collapse it again.)
    const alreadyExpanded = await page.getByTestId("companion-section-comms").count() > 0;
    if (!alreadyExpanded) {
      const toggle = chipToggleButton(page);
      if (touch) await toggle.tap();
      else {
        await toggle.focus();
        await page.keyboard.press("Enter");
      }
      await waitBody(page, "Field comms", 30_000);
    }
    const chatAlreadyOpen = await page.getByTestId("companion-chat-section").count() > 0;
    if (!chatAlreadyOpen) {
      const section = sectionButton(page, /Companion group chat/iu);
      if (touch) await section.tap();
      else {
        await section.focus();
        await page.keyboard.press("Enter");
      }
    }
    await chatSection(page).getByTestId("companion-chat-provider-status").waitFor({ timeout: 60_000 });
  }

  async function conversationMeta(page) {
    return chatSection(page).getByTestId("companion-chat-conversation-meta").innerText();
  }

  async function messageCount(page) {
    return chatSection(page).locator('[data-testid^="companion-chat-message-"]').count();
  }

  // Hoisted: the final report aggregates the durable-fixture call count after
  // the try block, so this counter must live at function scope.
  const durableProbe = { calls: 0 };

  try {
    // ── Desktop journey ────────────────────────────────────────────────
    const hostRecovery1 = await issueRecovery(hostSeatToken);
    secrets.push(hostRecovery1);
    const recoveryUrl = `${origin}/room/${encodeURIComponent(ROOM_ID)}#recovery=${encodeURIComponent(hostRecovery1)}`;

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
    await waitBody(page, "TACTICAL COMMS", 120_000);
    await waitBody(page, "Sarah Kerrigan", 120_000);
    await capture(page, "01-desktop-bound-live-identity.png", artifacts);
    checks.push({ id: "desktop_live_identity_renders", passed: true });

    const mutationsBaseline = { ...roomMutations };
    const roomBefore = await roomRuntime.readRoom({ roomId: ROOM_ID, seatToken: fixture.liveSeatToken() });
    ensure(roomBefore?.ok, "ROOM_READ_BEFORE_FAILED");
    const stateRevisionBefore = roomBefore.projection.room.stateRevision;

    // ── 266f.1: wide desktop focus sheet ───────────────────────────────
    const toggle = chipToggleButton(page);
    await toggle.focus();
    await page.keyboard.press("Enter");
    const focusSheet = page.getByTestId("companion-focus-sheet");
    await focusSheet.waitFor({ timeout: 60_000 });
    const sheetBox = await focusSheet.boundingBox();
    ensure(sheetBox, "FOCUS_SHEET_NOT_VISIBLE");
    ensure(sheetBox.x <= 24, "FOCUS_SHEET_NOT_LEFT_ANCHORED", { box: sheetBox });
    ensure(sheetBox.width >= 560 && sheetBox.width <= Math.floor(1500 * 0.66),
      "FOCUS_SHEET_WIDTH_NOT_BATTLEFIELD_SAFE", { box: sheetBox });
    // The compact launcher chip stays visible and is never covered by the
    // sheet: the dock header (TACTICAL COMMS button) box must sit fully
    // outside the sheet rect.
    const chipBox = await toggle.boundingBox();
    ensure(chipBox, "LAUNCHER_CHIP_NOT_VISIBLE_WITH_SHEET");
    ensure(chipBox.x >= sheetBox.x + sheetBox.width - 1
      || chipBox.y >= sheetBox.y + sheetBox.height - 1
      || chipBox.x + chipBox.width <= sheetBox.x + 1,
    "LAUNCHER_CHIP_COVERED_BY_FOCUS_SHEET", { sheetBox, chipBox });
    // The sheet is fixed-position (viewport-anchored), not in-dock flow.
    const sheetPosition = await focusSheet.evaluate((el) => getComputedStyle(el).position);
    ensure(sheetPosition === "fixed", "FOCUS_SHEET_NOT_VIEWPORT_FIXED", { sheetPosition });
    // Blue/cyan communications tokens on rendered computed styles.
    const sheetColors = await computedColors(page, "companion-focus-sheet", ["borderColor", "backgroundColor"]);
    const sheetBorderHue = rgbToHue(sheetColors?.borderColor);
    ensure(sheetBorderHue !== null && sheetBorderHue >= 190 && sheetBorderHue <= 215,
      "FOCUS_SHEET_BORDER_NOT_STARFLEET_BLUE", { sheetColors, sheetBorderHue });
    await capture(page, "02-desktop-wide-focus-sheet.png", artifacts);
    claim({
      claimId: "wide_desktop_focus_sheet_battlefield_visible",
      screenshot: "02-desktop-wide-focus-sheet.png",
      viewport: "1500x1050",
      precondition: "floating launcher expanded on desktop web",
      interaction: "activate the launcher chip",
      expected: "left-anchored viewport-fixed wide sheet ≤ 66% of the viewport; battlefield materially visible; compact launcher never covered; blue/cyan comms tokens",
      observed: { sheetBox, chipBox, sheetPosition, sheetBorderHue },
      contract: "Slice 266f.1 wide desktop focus mode (presentation-only; testIDs unchanged; web sheet portaled to document.body)",
    });
    checks.push({ id: "desktop_wide_focus_sheet_layout_and_theme", passed: true });

    // ── Companion group chat: real deterministic Chinese responses ─────
    await openChatSection(page);
    await waitBody(page, "injected Provider port", 60_000);
    // The cyan comms accent on the chat provider-status card (the element
    // exists only once the chat section is open).
    const statusColors = await computedColors(page, "companion-chat-provider-status", ["borderColor"]);
    const statusHue = rgbToHue(statusColors?.borderColor);
    ensure(statusHue !== null && statusHue >= 190 && statusHue <= 215,
      "COMMS_ACCENT_NOT_CYAN_BLUE", { statusColors, statusHue });
    const chat = chatSection(page);
    await chat.getByTestId("companion-chat-select-sarah_kerrigan").waitFor({ timeout: 30_000 });
    await chat.getByTestId("companion-chat-select-zagara").click();
    await chat.getByTestId("companion-chat-open").click();
    await chat.getByTestId("companion-chat-conversation-meta").waitFor({ timeout: 60_000 });
    const meta0 = await conversationMeta(page);
    const conversationId = meta0.match(/conversation:\s*(\S+)/u)?.[1];
    ensure(conversationId, "CONVERSATION_ID_NOT_RENDERED", { meta0 });
    const orderText = await chat.getByTestId("companion-chat-speaker-order").innerText();
    ensure(orderText.indexOf("Player") < orderText.indexOf("Sarah Kerrigan")
      && orderText.indexOf("Sarah Kerrigan") < orderText.indexOf("Zagara"),
    "SPEAKER_ORDER_NOT_DETERMINISTIC", { orderText });

    await chat.getByTestId("companion-chat-mention-sarah_kerrigan").click();
    await chat.getByTestId("companion-chat-input").fill(
      "Kerrigan，报告左路敌情；Zagara 固守右路。",
    );
    await chat.getByTestId("companion-chat-send").click();
    await chat.getByTestId("companion-chat-message-3").waitFor({ timeout: 90_000 });
    ensure(await messageCount(page) === 3, "FIRST_CYCLE_MESSAGE_COUNT_WRONG",
      { count: await messageCount(page) });
    const message1 = await chat.getByTestId("companion-chat-message-1").innerText();
    const message2 = await chat.getByTestId("companion-chat-message-2").innerText();
    const message3 = await chat.getByTestId("companion-chat-message-3").innerText();
    ensure(message1.includes("Kerrigan，报告左路敌情"),
      "CHINESE_USER_TURN_NOT_RENDERED", { message1 });
    // The transcript renders the ACTUAL Provider responses: byte-compare the
    // rendered text against the responder's exact recorded output (never
    // placeholder assistant prose).
    ensure(providerProbe.responses.length === 2, "RESPONSES_NOT_CAPTURED",
      { responses: providerProbe.responses.length });
    ensure(providerProbe.responses[0].companionRef === "sarah_kerrigan"
      && providerProbe.responses[1].companionRef === "zagara",
    "RESPONSE_ORDER_NOT_DETERMINISTIC", { responses: providerProbe.responses });
    ensure(message2.includes(providerProbe.responses[0].content),
      "KERRIGAN_REPLY_NOT_ACTUAL_PROVIDER_RESPONSE", {
        rendered: message2,
        actual: providerProbe.responses[0].content,
      });
    ensure(message3.includes(providerProbe.responses[1].content),
      "ZAGARA_REPLY_NOT_ACTUAL_PROVIDER_RESPONSE", {
        rendered: message3,
        actual: providerProbe.responses[1].content,
      });
    const readAfterCycle = await companionFetch(
      `conversations/${encodeURIComponent(conversationId)}?roomId=${encodeURIComponent(ROOM_ID)}`,
      { seatToken: fixture.liveSeatToken() },
    );
    ensure(readAfterCycle.envelope?.result?.ok === true
      && readAfterCycle.envelope.result.providerAccounting?.calls === 2,
    "PROVIDER_ACCOUNTING_NOT_TWO_CALLS", {
      accounting: readAfterCycle.envelope?.result?.providerAccounting,
    });
    await capture(page, "03-desktop-chat-cycle-real-responses.png", artifacts);
    claim({
      claimId: "chinese_conversation_renders_actual_provider_responses",
      screenshot: "03-desktop-chat-cycle-real-responses.png",
      viewport: "1500x1050",
      precondition: "conversation open (2 companions, deterministic fixture Provider)",
      interaction: "toggle @Kerrigan mention, fill the Chinese composer line, click Send",
      expected: "deterministic user → Kerrigan → Zagara cycle; rendered replies byte-match the captured Provider responses; server providerAccounting.calls === 2",
      observed: {
        messageCount: 3,
        kerriganReply: providerProbe.responses[0].content,
        zagaraReply: providerProbe.responses[1].content,
        providerCalls: readAfterCycle.envelope.result.providerAccounting.calls,
      },
      contract: "companion-room-session-service-v1 send + drainCompanionReplies; no fabricated replies anywhere",
    });
    checks.push({ id: "desktop_chinese_cycle_actual_provider_responses", passed: true });

    // Checkpoint, interruption (amber warning), explicit continue.
    await chat.getByTestId("companion-chat-checkpoint").click();
    await page.waitForFunction(() => (
      document.querySelector('[data-testid="companion-chat-section"]')
        ?.innerText.includes("sessckpt-")
    ), null, { timeout: 60_000 });
    const checkpointId = (await chat.innerText()).match(/sessckpt-\d+-[0-9a-f]{12}/u)?.[0];
    ensure(checkpointId, "CHECKPOINT_NOT_RECORDED_IN_UI");

    providerProbe.failNext = 1;
    await chat.getByTestId("companion-chat-input").fill("第二道命令：谨慎推进。");
    await chat.getByTestId("companion-chat-send").click();
    await chat.getByTestId("companion-chat-interrupted").waitFor({ timeout: 90_000 });
    const interruptText = await chat.getByTestId("companion-chat-interrupted").innerText();
    ensure(interruptText.includes("PROVIDER_RESPONDER_ERROR")
      && /never an automatic retry/iu.test(interruptText),
    "INTERRUPTED_CARD_NOT_EXPLICIT", { interruptText });
    ensure(await messageCount(page) === 4,
      "FABRICATED_REPLY_AFTER_INTERRUPTION", { count: await messageCount(page) });
    // Amber ONLY on the warning surface.
    const interruptColors = await computedColors(page, "companion-chat-interrupted", ["borderColor", "backgroundColor"]);
    const interruptBorderHue = rgbToHue(interruptColors?.borderColor);
    const interruptBackgroundHue = rgbToHue(interruptColors?.backgroundColor);
    ensure(interruptBorderHue !== null && interruptBorderHue >= 30 && interruptBorderHue <= 50,
      "INTERRUPT_CARD_BORDER_NOT_WARNING_AMBER", { interruptColors, interruptBorderHue });
    ensure(interruptBackgroundHue !== null && interruptBackgroundHue >= 30 && interruptBackgroundHue <= 50,
      "INTERRUPT_CARD_BACKGROUND_NOT_WARNING_AMBER", { interruptColors, interruptBackgroundHue });
    await capture(page, "04-desktop-interrupted-amber-warning.png", artifacts);
    claim({
      claimId: "interrupted_turn_amber_only_warning",
      screenshot: "04-desktop-interrupted-amber-warning.png",
      viewport: "1500x1050",
      precondition: "checkpoint at turn 3; verifier armed a one-shot provider outage",
      interaction: "send a second user turn",
      expected: "explicit interrupted card in warning amber; accepted history preserved; no fabricated reply; explicit-continue-only",
      observed: { interrupt: "PROVIDER_RESPONDER_ERROR", interruptBorderHue, interruptBackgroundHue },
      contract: "retryPolicy explicit_continue_only_never_automatic + Slice 266f.1 amber-only-for-warnings",
    });
    checks.push({ id: "desktop_interrupted_turn_amber_no_fabrication", passed: true });

    await chat.getByTestId("companion-chat-continue").click();
    await chat.getByTestId("companion-chat-message-6").waitFor({ timeout: 90_000 });
    ensure(await messageCount(page) === 6, "CONTINUE_DID_NOT_COMPLETE_CYCLE",
      { count: await messageCount(page) });
    ensure(providerProbe.interruptions === 1 && providerProbe.calls === 5,
      "PROVIDER_PROBE_UNEXPECTED", { probe: { ...providerProbe, requests: undefined, responses: undefined } });
    checks.push({ id: "desktop_explicit_continue_completes_turn", passed: true });

    // Resume to checkpoint → isolation; reload → persisted transcript.
    await chat.getByTestId(`companion-chat-resume-${checkpointId}`).click();
    await page.waitForFunction(() => (
      document.querySelector('[data-testid="companion-chat-conversation-meta"]')
        ?.innerText.includes("turn 3")
    ), null, { timeout: 60_000 });
    ensure(await messageCount(page) === 3, "CHECKPOINT_ISOLATION_FAILED",
      { count: await messageCount(page) });
    checks.push({ id: "desktop_checkpoint_isolation", passed: true });

    const hostRecovery2 = await issueRecovery(hostSeatToken);
    secrets.push(hostRecovery2);
    await page.goto(
      `${origin}/room/${encodeURIComponent(ROOM_ID)}#recovery=${encodeURIComponent(hostRecovery2)}`,
      { waitUntil: "domcontentloaded", timeout: 120_000 },
    );
    await waitBody(page, "Authoritative room connected", 120_000);
    await waitBody(page, "TACTICAL COMMS", 120_000);
    await openChatSection(page);
    await chat.getByTestId("companion-chat-conversation-meta").waitFor({ timeout: 60_000 });
    const metaReloaded = await conversationMeta(page);
    ensure(metaReloaded.includes(conversationId) && metaReloaded.includes("turn 3"),
      "RELOAD_DID_NOT_RESUME_PERSISTED_CONVERSATION", { metaReloaded });
    ensure(await messageCount(page) === 3, "PERSISTED_TRANSCRIPT_NOT_RENDERED",
      { count: await messageCount(page) });
    checks.push({ id: "desktop_reload_resume_persisted_transcript", passed: true });

    // ── 266f.3: session continuity card with real content ──────────────
    const continuity = chat.getByTestId("companion-chat-continuity");
    await continuity.waitFor({ timeout: 30_000 });
    const eraText = await chat.getByTestId("companion-chat-continuity-era").innerText();
    const eraRows = eraText.split("\n").filter((line) => line.trim().length > 0);
    ensure(eraRows.length === 2, "CONTINUITY_ERA_ROWS_WRONG", { eraText });
    ensure(eraText.includes("era · Sarah Kerrigan") && eraText.includes("era · Zagara"),
      "CONTINUITY_ERA_COMPANIONS_MISSING", { eraText });
    // Zagara's pack carries a real default era; Kerrigan's reference package
    // honestly reports the registered default.
    ensure(/era · Zagara: \S+/u.test(eraText)
      && !/era · Zagara: registered default/u.test(eraText),
    "CONTINUITY_ERA_ZAGARA_NOT_REAL_PACKAGE_STATE", { eraText });
    ensure(eraText.includes("era · Sarah Kerrigan: registered default (package)"),
      "CONTINUITY_ERA_KERRIGAN_NOT_HONEST_DEFAULT", { eraText });
    // Worldbook origin classification after a live read: Zagara's three
    // sealed package entries + the honestly-labelled fixture global entry.
    await chat.getByTestId("companion-chat-worldbook-refresh").click();
    await page.waitForFunction(() => (
      document.querySelector('[data-testid="companion-chat-continuity-worldbook"]')
        ?.innerText.includes("sealed package (formal) 3")
    ), null, { timeout: 60_000 });
    const continuityWorldbook = await chat
      .getByTestId("companion-chat-continuity-worldbook").innerText();
    ensure(continuityWorldbook.includes("persona-derived 0")
      && continuityWorldbook.includes("chat session 0")
      && continuityWorldbook.includes("product global (acceptance-fixture injected, honest) 1"),
    "CONTINUITY_WORLDBOOK_ORIGINS_WRONG", { continuityWorldbook });
    // Persona save flips the persona-derived origin to real content.
    await chat.getByTestId("companion-chat-persona-name-input").fill("指挥官薇尔");
    await chat.getByTestId("companion-chat-persona-description-input")
      .fill("谨慎的人族指挥官，先侦察后接战。");
    await chat.getByTestId("companion-chat-persona-save").click();
    await page.waitForFunction(() => (
      document.querySelector('[data-testid="companion-chat-persona-status"]')
        ?.innerText.includes("指挥官薇尔 · v1/1")
    ), null, { timeout: 60_000 });
    await chat.getByTestId("companion-chat-worldbook-refresh").click();
    await page.waitForFunction(() => (
      document.querySelector('[data-testid="companion-chat-continuity-worldbook"]')
        ?.innerText.includes("persona-derived 1")
    ), null, { timeout: 60_000 });
    // Layered memory + Author's Note: save real content, then the continuity
    // card reflects the server projections.
    await chat.getByTestId("companion-chat-memory-summary-input")
      .fill("指挥官在山脊重组并守住了防线。");
    await chat.getByTestId("companion-chat-memory-summary-save").click();
    await chat.getByTestId("companion-chat-memory-episodic-input")
      .fill("用户偏好防御型攻城阵地。");
    await chat.getByTestId("companion-chat-memory-episodic-add").click();
    await page.waitForFunction(() => (
      document.querySelector('[data-testid="companion-chat-continuity-memory"]')
        ?.innerText.includes("summary versions 1")
    ), null, { timeout: 60_000 });
    const continuityMemory = await chat
      .getByTestId("companion-chat-continuity-memory").innerText();
    ensure(continuityMemory.includes("episodic facts 1")
      && continuityMemory.includes("relationship events 0"),
    "CONTINUITY_MEMORY_COUNTS_WRONG", { continuityMemory });
    await chat.getByTestId("companion-chat-authors-note-input")
      .fill("回答控制在三句话以内。");
    await chat.getByTestId("companion-chat-authors-note-depth-input").fill("2");
    await chat.getByTestId("companion-chat-authors-note-frequency-input").fill("1");
    await chat.getByTestId("companion-chat-authors-note-save").click();
    await page.waitForFunction(() => (
      document.querySelector('[data-testid="companion-chat-continuity-authors-note"]')
        ?.innerText.includes("v1")
    ), null, { timeout: 60_000 });
    await capture(page, "05-desktop-continuity-real-content.png", artifacts);
    claim({
      claimId: "session_continuity_real_package_session_content",
      screenshot: "05-desktop-continuity-real-content.png",
      viewport: "1500x1050",
      precondition: "resumed conversation; persona/summary/episodic/author's note saved through real contracts",
      interaction: "read worldbook, save persona, save summary + episodic fact, save author's note",
      expected: "continuity card shows per-companion era state, worldbook origin classification (sealed package 3 / persona-derived 1 / fixture-labelled global 1), memory counts and note version — real content or honest unavailable states, never fabricated",
      observed: { eraText, continuityWorldbook, continuityMemory },
      contract: "Slice 266f.3 real-content continuity (server projections only)",
    });
    checks.push({ id: "desktop_continuity_real_content", passed: true });

    // ── 266f.2: BYOK card in the browser (honest missing state) ────────
    const providerSection = sectionButton(page, /Secure Provider setup/iu);
    await providerSection.focus();
    await page.keyboard.press("Enter");
    const stateChip = page.getByTestId("secure-provider-state-chip");
    await stateChip.waitFor({ timeout: 30_000 });
    const chipTextBefore = await stateChip.innerText();
    ensure(chipTextBefore.startsWith("state: missing"),
      "BYOK_STATE_CHIP_NOT_HONEST_MISSING", { chipTextBefore });
    await sectionButton(page, /Load Provider catalogue/iu).click();
    await waitBody(page, "fixture-openai-compatible", 30_000);
    const chipTextAfter = await stateChip.innerText();
    ensure(chipTextAfter.startsWith("state: missing")
      && chipTextAfter.includes("agent session required"),
    "BYOK_STATE_CHIP_WRONG_AFTER_CATALOGUE", { chipTextAfter });
    const hygiene = await page.getByTestId("secure-provider-secret-hygiene").innerText();
    ensure(/clears this password field before awaiting the network/iu.test(hygiene)
      && /session memory/iu.test(hygiene),
    "SECRET_HYGIENE_LINE_MISSING", { hygiene });
    const chipColors = await computedColors(page, "secure-provider-state-chip", ["borderColor"]);
    const chipHue = rgbToHue(chipColors?.borderColor);
    ensure(chipHue !== null && chipHue >= 190 && chipHue <= 220,
      "BYOK_CHIP_NOT_COMMS_BLUE", { chipColors, chipHue });
    await capture(page, "06-desktop-byok-state-missing.png", artifacts);
    claim({
      claimId: "byok_explicit_state_surface_browser",
      screenshot: "06-desktop-byok-state-missing.png",
      viewport: "1500x1050",
      precondition: "deterministic Ticket-16-contract fixture serves one approved profile; no agent session attached (honest)",
      interaction: "open Secure Provider setup, load the Provider catalogue",
      expected: "explicit state chip (state: missing · agent session required); fixture profile listed; secret-hygiene line; blue/cyan chip; no credential control enabled without a session",
      observed: { chipTextBefore, chipTextAfter, chipHue },
      contract: "Ticket 16 Slice 160 states + Slice 266f.2 explicit attached/missing/error/detached surface",
    });
    checks.push({ id: "desktop_byok_state_surface_missing_honest", passed: true });

    // Current-speaker portrait pixel proof (desktop).
    const desktopProof = await proveChatSpeakerPixels(page, desktop.request, 1500);
    await capture(page, "07-desktop-chat-speaker-pixels.png", artifacts);
    claim({
      claimId: "chat_speaker_portrait_real_pixels_desktop",
      screenshot: "07-desktop-chat-speaker-pixels.png",
      viewport: "1500x1050",
      precondition: "resumed conversation; current speaker portrait visible inside the focus sheet",
      interaction: "none (assertion on rendered pixels)",
      expected: "real committed 1254px keyframe, canvas variance, labelled asset sha256 == committed file == served bytes",
      observed: desktopProof,
      contract: "lib/level3/companion-portrait-assets-v1 admitted keyframes",
    });
    checks.push({ id: "desktop_chat_speaker_real_pixels", passed: true });

    // Collapse from the sheet's own control → compact launcher returns.
    await page.getByTestId("companion-focus-sheet-close").click();
    await page.waitForFunction(() => (
      !document.querySelector('[data-testid="companion-focus-sheet"]')
    ), null, { timeout: 30_000 });
    const collapsedChipBox = await chipToggleButton(page).boundingBox();
    ensure(collapsedChipBox && collapsedChipBox.width <= 320,
      "COLLAPSED_LAUNCHER_NOT_COMPACT", { collapsedChipBox });
    await capture(page, "08-desktop-collapsed-compact-launcher.png", artifacts);
    claim({
      claimId: "compact_launcher_retained_after_focus_close",
      screenshot: "08-desktop-collapsed-compact-launcher.png",
      viewport: "1500x1050",
      precondition: "focus sheet open",
      interaction: "click the sheet's Collapse control",
      expected: "sheet closes; the compact shrink-wrapped launcher chip (≤ 320px) remains at bottom-right; battlefield fully visible",
      observed: { collapsedChipBox },
      contract: "Slice 266f.1 compact floating launcher retained",
    });
    checks.push({ id: "desktop_compact_launcher_retained", passed: true });

    const desktopOverflow = await documentOverflow(page);
    ensure(desktopOverflow.documentWidth <= desktopOverflow.viewportWidth + 1,
      "DESKTOP_HORIZONTAL_OVERFLOW", desktopOverflow);
    checks.push({ id: "desktop_no_horizontal_overflow", passed: true });

    await desktop.close();

    // ── Narrow / touch journey: mobile full-screen sheet ───────────────
    const hostRecovery3 = await issueRecovery(hostSeatToken);
    secrets.push(hostRecovery3);
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
    await narrowPage.goto(
      `${origin}/room/${encodeURIComponent(ROOM_ID)}#recovery=${encodeURIComponent(hostRecovery3)}`,
      { waitUntil: "domcontentloaded", timeout: 120_000 },
    );
    await waitBody(narrowPage, "Authoritative room connected", 120_000);
    await waitBody(narrowPage, "TACTICAL COMMS", 120_000);

    const narrowToggle = chipToggleButton(narrowPage);
    await narrowToggle.tap();
    const mobileSheet = narrowPage.getByTestId("companion-mobile-sheet");
    await mobileSheet.waitFor({ timeout: 60_000 });
    const mobileBox = await mobileSheet.boundingBox();
    ensure(mobileBox && mobileBox.x <= 1 && mobileBox.y <= 1
      && mobileBox.width >= 389 && mobileBox.height >= 840,
    "MOBILE_SHEET_NOT_FULL_SCREEN", { mobileBox });
    const mobilePosition = await mobileSheet.evaluate((el) => getComputedStyle(el).position);
    ensure(mobilePosition === "fixed", "MOBILE_SHEET_NOT_VIEWPORT_FIXED", { mobilePosition });

    await openChatSection(narrowPage, { touch: true });
    const narrowChat = chatSection(narrowPage);
    await narrowChat.getByTestId("companion-chat-conversation-meta").waitFor({ timeout: 60_000 });
    const narrowMeta = await conversationMeta(narrowPage);
    ensure(narrowMeta.includes(conversationId) && narrowMeta.includes("turn 3"),
      "NARROW_DID_NOT_RESUME_CONVERSATION", { narrowMeta });
    ensure(await messageCount(narrowPage) === 3,
      "NARROW_TRANSCRIPT_INCOMPLETE", { count: await messageCount(narrowPage) });
    const narrowContinuity = await narrowChat
      .getByTestId("companion-chat-continuity-era").innerText();
    ensure(narrowContinuity.includes("era · Zagara"), "NARROW_CONTINUITY_MISSING",
      { narrowContinuity });
    const narrowOverflow = await documentOverflow(narrowPage);
    ensure(narrowOverflow.documentWidth <= narrowOverflow.viewportWidth + 1,
      "NARROW_HORIZONTAL_OVERFLOW", narrowOverflow);
    await capture(narrowPage, "09-narrow-mobile-sheet-resumed.png", artifacts);
    claim({
      claimId: "mobile_full_screen_sheet_resume_no_overflow",
      screenshot: "09-narrow-mobile-sheet-resumed.png",
      viewport: "390x844 touch",
      precondition: "same conversation active; narrow touch viewport",
      interaction: "tap chip, tap chat section",
      expected: "full-screen fixed sheet; persisted conversation resumes; continuity card present; zero horizontal overflow",
      observed: { mobileBox, meta: narrowMeta, overflow: narrowOverflow },
      contract: "Slice 266f.1 mobile full-screen sheet + persisted session resume",
    });
    checks.push({ id: "narrow_mobile_sheet_resume_no_overflow", passed: true });

    // All Tavern-equivalent cards render inside the sheet at 390px; one live
    // permission-surface interaction at touch width.
    for (const cardTestId of [
      "companion-chat-persona",
      "companion-chat-continuity",
      "companion-chat-worldbook",
      "companion-chat-memory",
      "companion-chat-branches",
      "companion-chat-authors-note",
      "companion-chat-import-export",
      "companion-chat-audit",
      "companion-chat-permissions",
      "companion-chat-promotions",
    ]) {
      await narrowChat.getByTestId(cardTestId).waitFor({ timeout: 30_000 });
    }
    await narrowChat.getByTestId("companion-chat-permissions").evaluate((el) => (
      el.scrollIntoView({ block: "center" })
    ));
    await narrowChat.getByTestId("companion-chat-permissions-load").tap();
    await narrowChat.getByTestId("companion-chat-permission-review_mode")
      .waitFor({ timeout: 60_000 });
    const narrowPermissionText = await narrowChat
      .getByTestId("companion-chat-permissions-list").innerText();
    ensure((narrowPermissionText.match(/opponent-private: denied/gu) || []).length === 4,
      "NARROW_PERMISSION_SURFACES_NOT_ALL_DENYING", { narrowPermissionText });
    const narrowOverflowCards = await documentOverflow(narrowPage);
    ensure(narrowOverflowCards.documentWidth <= narrowOverflowCards.viewportWidth + 1,
      "NARROW_CARDS_HORIZONTAL_OVERFLOW", narrowOverflowCards);
    await capture(narrowPage, "10-narrow-mobile-sheet-cards.png", artifacts);
    claim({
      claimId: "narrow_cards_render_no_overflow",
      screenshot: "10-narrow-mobile-sheet-cards.png",
      viewport: "390x844 touch",
      precondition: "mobile sheet open with all chat cards rendered",
      interaction: "scroll to the permission card, tap Read the four surfaces",
      expected: "all ten cards render (incl. the 266f continuity card); four live permission surfaces deny opponent-private everywhere; zero horizontal overflow",
      observed: { overflow: narrowOverflowCards, surfaces: 4 },
      contract: "responsive floating Web/App interaction at 390px (guardrail §9)",
    });
    checks.push({ id: "narrow_cards_render_no_overflow", passed: true });

    await narrowPage.getByTestId("companion-mobile-sheet-close").tap();
    await narrowPage.waitForFunction(() => (
      !document.querySelector('[data-testid="companion-mobile-sheet"]')
    ), null, { timeout: 30_000 });
    const narrowChipBox = await chipToggleButton(narrowPage).boundingBox();
    ensure(narrowChipBox && narrowChipBox.width <= 300,
      "NARROW_COLLAPSED_CHIP_NOT_COMPACT", { narrowChipBox });
    await capture(narrowPage, "11-narrow-collapsed-chip.png", artifacts);
    claim({
      claimId: "narrow_compact_launcher_after_sheet_close",
      screenshot: "11-narrow-collapsed-chip.png",
      viewport: "390x844 touch",
      precondition: "mobile sheet open",
      interaction: "tap the sheet's Collapse control",
      expected: "the compact launcher chip returns at bottom-right; battlefield fully visible",
      observed: { narrowChipBox },
      contract: "Slice 266f.1 compact floating launcher retained at 390px",
    });
    checks.push({ id: "narrow_compact_launcher_retained", passed: true });

    await narrow.close();

    // ── Headless contract phase (same live HTTP surface) ───────────────
    const seat = fixture.liveSeatToken();
    const roomQuery = `roomId=${encodeURIComponent(ROOM_ID)}`;
    const getH = (sub) => companionFetch(
      `${sub}${sub.includes("?") ? "&" : "?"}${roomQuery}`,
      { seatToken: seat },
    );
    const postH = (sub, body, method = "POST") => companionFetch(sub, {
      method,
      seatToken: seat,
      body: { roomId: ROOM_ID, ...body },
    });
    const okH = (response, code) => {
      ensure(response.envelope?.result?.ok === true, code, {
        result: response.envelope?.result,
      });
      return response.envelope.result;
    };
    const rejectedH = (response, reason, code) => {
      ensure(response.envelope?.result?.ok === false
        && response.envelope.result.reason === reason, code, {
        expected: reason,
        result: response.envelope?.result,
      });
    };

    // (A) Deterministic speaker order + reply accounting for 1, 3 and 6
    // companions in one conversation each. providerAccounting.calls is the
    // module-gateway CUMULATIVE counter, so the gate proves each roster's
    // exact per-conversation delta against a pre-run baseline.
    const allPackageIds = COMPANION_CATALOGUE_V1.entries.map(
      (entry) => `starcraft-tmg.companion.${entry.characterId.split(".")[1] || entry.characterId}`,
    );
    const rosterRuns = [
      { count: 1, packageIds: allPackageIds.slice(0, 1) },
      { count: 3, packageIds: allPackageIds.slice(0, 3) },
      { count: 6, packageIds: allPackageIds.slice(0, 6) },
    ];
    let rosterExpected = Number(okH(await getH("status"), "ROSTER_BASELINE_STATUS_FAILED")
      .provider?.accounting?.calls ?? 0);
    for (const run of rosterRuns) {
      const opened = okH(await postH("conversations", { packageIds: run.packageIds }),
        "ROSTER_OPEN_FAILED");
      ensure(opened.companions?.length === run.count
        && opened.speakerOrder?.length === run.count + 1,
      "ROSTER_SPEAKER_ORDER_LENGTH_WRONG", { count: run.count, opened: opened.speakerOrder });
      const sent = okH(await postH(
        `conversations/${encodeURIComponent(opened.conversationId)}/turns`,
        { content: `第 ${run.count} 同伴阵容测试。` },
      ), "ROSTER_SEND_FAILED");
      const rosterMessages = sent.messages || [];
      const expectedOrder = opened.speakerOrder;
      for (let index = 0; index <= run.count; index += 1) {
        ensure(rosterMessages[index]?.participantId === expectedOrder[index],
          "ROSTER_TURN_ORDER_NOT_DETERMINISTIC", {
            count: run.count,
            index,
            expected: expectedOrder[index],
            actual: rosterMessages[index]?.participantId,
          });
      }
      rosterExpected += run.count;
      const readBack = okH(await getH(
        `conversations/${encodeURIComponent(opened.conversationId)}`),
      "ROSTER_READ_FAILED");
      ensure(readBack.providerAccounting?.calls === rosterExpected,
        "ROSTER_PROVIDER_ACCOUNTING_WRONG", {
          count: run.count,
          expected: rosterExpected,
          accounting: readBack.providerAccounting,
        });
      okH(await postH(`conversations/${encodeURIComponent(opened.conversationId)}/close`, {}),
        "ROSTER_CLOSE_FAILED");
    }
    checks.push({ id: "headless_roster_1_3_6_deterministic_order_accounting", passed: true });

    // (B) Long-session continuation: checkpoint isolation over the live
    // conversation from the browser journey (turn 3 + checkpoint recorded).
    const resumeCheck = okH(await postH(
      `conversations/${encodeURIComponent(conversationId)}/turns`,
      { content: "继续长会话：汇报当前态势。" },
    ), "LONG_SESSION_SEND_FAILED");
    ensure(resumeCheck.turnCounter === 6, "LONG_SESSION_CONTINUATION_WRONG",
      { turnCounter: resumeCheck.turnCounter });
    const resumed = okH(await postH(
      `conversations/${encodeURIComponent(conversationId)}/resume`,
      { checkpointId },
    ), "LONG_SESSION_RESUME_FAILED");
    ensure(resumed.turnCounter === 3 && resumed.messages?.length === 3,
      "LONG_SESSION_CHECKPOINT_ISOLATION_WRONG", {
        turnCounter: resumed.turnCounter,
        messages: resumed.messages?.length,
      });
    checks.push({ id: "headless_long_session_checkpoint_isolation", passed: true });

    // (C) Branches: swipe reroll + accept appends a NEW turn; edit-as-branch;
    // kind validation fail-closed.
    const convBeforeSwipe = okH(await getH(
      `conversations/${encodeURIComponent(conversationId)}`), "READ_BEFORE_SWIPE_FAILED");
    const swipeOpen = okH(await postH(
      `conversations/${encodeURIComponent(conversationId)}/branches`, { kind: "swipe" }),
    "SWIPE_OPEN_FAILED");
    const rerolled = okH(await postH(
      `conversations/${encodeURIComponent(conversationId)}/branches/${swipeOpen.branch.branchId}/reroll`,
      {},
    ), "SWIPE_REROLL_FAILED");
    const acceptedSwipe = okH(await postH(
      `conversations/${encodeURIComponent(conversationId)}/branches/${swipeOpen.branch.branchId}/accept`,
      { entryId: rerolled.entry.entryId },
    ), "SWIPE_ACCEPT_FAILED");
    ensure(acceptedSwipe.turnCounter === convBeforeSwipe.turnCounter + 1
      && acceptedSwipe.messages.slice(0, convBeforeSwipe.messages.length)
        .every((message, index) => message.turnHash === convBeforeSwipe.messages[index].turnHash),
    "SWIPE_ACCEPT_REWROTE_HISTORY_OR_DID_NOT_APPEND");
    const editOpen = okH(await postH(
      `conversations/${encodeURIComponent(conversationId)}/branches`,
      { kind: "edit", baseTurnSequence: 1 },
    ), "EDIT_OPEN_FAILED");
    const editSubmitted = okH(await postH(
      `conversations/${encodeURIComponent(conversationId)}/branches/${editOpen.branch.branchId}/entries`,
      { content: "修订后的第一道命令。" },
    ), "EDIT_SUBMIT_FAILED");
    const acceptedEdit = okH(await postH(
      `conversations/${encodeURIComponent(conversationId)}/branches/${editOpen.branch.branchId}/accept`,
      { entryId: editSubmitted.entry.entryId },
    ), "EDIT_ACCEPT_FAILED");
    ensure(acceptedEdit.messages.at(-1).content === "修订后的第一道命令。",
      "EDIT_ACCEPT_WRONG");
    rejectedH(
      await postH(`conversations/${encodeURIComponent(conversationId)}/branches`,
        { kind: "edit", baseTurnSequence: 2 }),
      "COMPANION_BRANCH_EDIT_REQUIRES_OWN_USER_TURN",
      "EDIT_ON_COMPANION_TURN_NOT_REJECTED",
    );
    checks.push({ id: "headless_branches_swipe_edit_lineage", passed: true });

    // (D) Safe import/export/restore: integrity, tamper, cross-seat,
    // never-overwrite; no credentials in either direction.
    const exported = okH(await getH(
      `conversations/${encodeURIComponent(conversationId)}/export`), "EXPORT_FAILED");
    ensure(exported.export?.integrity?.hash === exported.exportHash
      && exported.credentialsIncluded === false,
    "EXPORT_INTEGRITY_OR_CREDENTIAL_FLAG_WRONG");
    const exportJson = JSON.stringify(exported.export);
    for (const secret of secrets) {
      ensure(!exportJson.includes(secret), "SECRET_IN_CONVERSATION_EXPORT");
    }
    rejectedH(
      await postH("conversations/restore", { export: exported.export }),
      "COMPANION_CONVERSATION_ALREADY_EXISTS",
      "RESTORE_OVERWRITE_NOT_REJECTED",
    );
    const tamperedExport = JSON.parse(exportJson);
    tamperedExport.memory.episodicFacts[0].content = "tampered by verifier";
    rejectedH(
      await postH("conversations/restore", { export: tamperedExport }),
      "COMPANION_IMPORT_INTEGRITY_MISMATCH",
      "TAMPERED_EXPORT_NOT_REJECTED",
    );
    rejectedH(
      await companionFetch("conversations/restore", {
        method: "POST",
        seatToken: guestSeatToken,
        body: { roomId: ROOM_ID, export: exported.export },
      }),
      "COMPANION_EXPORT_SCOPE_MISMATCH",
      "CROSS_SEAT_RESTORE_NOT_REJECTED",
    );
    checks.push({ id: "headless_import_export_restore_safe", passed: true });

    // (E) Audit export/verify/replay: hash chain independently verified;
    // replay candidates can never request automatic promotion.
    const auditExport = okH(await getH("audit/export"), "AUDIT_EXPORT_FAILED");
    ensure(Array.isArray(auditExport.export?.entries) && auditExport.export.entries.length > 0,
      "AUDIT_EXPORT_EMPTY");
    const independentAudit = verifyCompanionAuditExport(
      `${JSON.stringify(auditExport.export, null, 2)}\n`,
    );
    ensure(independentAudit?.ok === true
      && independentAudit.entryCount === auditExport.export.entries.length,
    "AUDIT_INDEPENDENT_VERIFY_FAILED", { independentAudit });
    const replay = okH(await postH("audit/replay-candidate", {
      sessionRef: { sessionId: conversationId },
    }), "REPLAY_CANDIDATE_FAILED");
    ensure(replay.candidate?.trainingTruth === false
      && replay.candidate?.promotion?.automatic === "forbidden",
    "REPLAY_CANDIDATE_BOUNDARY_WRONG", { candidate: replay.candidate });
    rejectedH(
      await postH("audit/replay-candidate", { promote: true }),
      "COMPANION_AUDIT_AUTOMATIC_PROMOTION_FORBIDDEN",
      "PROMOTE_FLAG_NOT_REJECTED",
    );
    checks.push({ id: "headless_audit_verify_replay_candidate", passed: true });

    // (F) Four explicit permission surfaces, computed live.
    const surfaces = okH(await getH("permissions/surfaces"), "PERMISSION_SURFACES_FAILED");
    ensure(surfaces.surfaces?.length === 4, "PERMISSION_SURFACE_COUNT_WRONG");
    for (const surface of surfaces.surfaces) {
      ensure(surface.previewConfirmApplyAuthority === false
        && surface.roomMutationAuthority === false,
      "PERMISSION_SURFACE_AUTHORITY_WRONG", { surface: surface.surfaceId });
      const opponent = surface.decisions
        .find((decision) => decision.resourceId === "opponent-private-plan");
      ensure(opponent && opponent.ok === false, "OPPONENT_PRIVATE_NOT_DENIED",
        { surface: surface.surfaceId });
    }
    checks.push({ id: "headless_four_permission_surfaces_live", passed: true });

    // (G) Formal-versus-fixture worldbook audit on the live conversation.
    // Zagara's sealed character-tier entries carry package provenance and
    // fire only on her assembly; the fixture global entry is labelled by its
    // own provenance and never appears inside the sealed package export.
    const wbAuditRead = okH(await getH(
      `conversations/${encodeURIComponent(conversationId)}/worldbook`), "WB_AUDIT_READ_FAILED");
    const characterTier = wbAuditRead.entries.filter((entry) => entry.scopeTier === "character");
    ensure(characterTier.length === 3
      && characterTier.every((entry) => entry.entryId.startsWith("zagara."))
      && characterTier.every((entry) => (
        !(entry.provenance?.sourceRefs || []).some((ref) => String(ref).startsWith("fixture://"))
      )),
    "FORMAL_PACK_ENTRIES_NOT_SEALED_PROVENANCE", {
      characterTier: characterTier.map((entry) => [entry.entryId, entry.provenance]),
    });
    const globalTier = wbAuditRead.entries.filter((entry) => entry.scopeTier === "global");
    ensure(globalTier.length === 1
      && globalTier[0].entryId === "global-koprulu-sector"
      && (globalTier[0].provenance?.sourceRefs || [])
        .some((ref) => String(ref).startsWith("fixture://")),
    "FIXTURE_GLOBAL_ENTRY_NOT_LABELLED", { globalTier });
    const wbAuditSend = okH(await postH(
      `conversations/${encodeURIComponent(conversationId)}/turns`,
      { content: "Tell me of the Koprulu sector." },
    ), "WB_AUDIT_SEND_FAILED");
    const firedFirst = wbAuditSend.replies[0].contextAssembly?.worldbookFired || [];
    const firedSecond = wbAuditSend.replies[1].contextAssembly?.worldbookFired || [];
    const kerriganCharacter = firedFirst.filter((row) => row.scopeTier === "character");
    const zagaraCharacter = firedSecond.filter((row) => row.scopeTier === "character");
    ensure(kerriganCharacter.length === 0 && zagaraCharacter.length === 3
      && zagaraCharacter.every((row) => row.entryId.startsWith("zagara.")
        && (row.matchedBy || []).includes("always")),
    "CHARACTER_TIER_NOT_COMPANION_SCOPED", { kerriganCharacter, zagaraCharacter });
    const sharedView = (rows) => rows.filter((row) => row.scopeTier !== "character")
      .map((row) => [row.entryId, row.scopeTier, row.firedAtDepth, row.matchedBy]);
    ensure(JSON.stringify(sharedView(firedSecond)) === JSON.stringify(sharedView(firedFirst)),
      "SHARED_TIERS_NOT_IDENTICAL_ACROSS_COMPANIONS");
    ensure(firedFirst.some((row) => row.entryId === "global-koprulu-sector"
      && row.scopeTier === "global" && row.firedAtDepth === 0),
    "FIXTURE_GLOBAL_NOT_FIRED_AS_LABELLED", { firedFirst });
    const zagaraExport = okH(await getH(
      `packages/${encodeURIComponent("starcraft-tmg.companion.zagara")}/export`),
    "ZAGARA_PACKAGE_EXPORT_FAILED");
    const zagaraContractJson = JSON.stringify(zagaraExport.export?.contract || {});
    ensure(!zagaraContractJson.includes("fixture://")
      && !zagaraContractJson.includes("global-koprulu-sector"),
    "FIXTURE_CONTENT_LEAKED_INTO_SEALED_PACKAGE");
    ensure((zagaraExport.export?.contract?.extensions?.worldbookEntries || []).length === 3,
    "SEALED_PACKAGE_WORLDBOOK_ENTRIES_WRONG", {
      entries: zagaraExport.export?.contract?.extensions?.worldbookEntries?.map((entry) => entry.entryId),
    });
    checks.push({ id: "headless_worldbook_formal_vs_fixture_audit", passed: true });

    // ── Durable encrypted-SQLite process-restart resume (trimmed 266d
    // discipline): two compositions over one file; transcript, persona and
    // summary resume; wrong key fails closed.
    const durableDir = path.join(BUILD_ROOT, "durable");
    await mkdir(durableDir, { recursive: true });
    const durableFile = path.join(durableDir, "companion-product.sqlite");
    const durableKey = createHash("sha256")
      .update("ticket26-266f-durable-verifier-key").digest("base64");
    const durableResponder = async (request) => {
      durableProbe.calls += 1;
      const slug = String(request.companionRef?.id || "companion")
        .replace(/^starcraft-tmg\.companion\./u, "");
      return {
        content: `[${slug}] 持久化回执 #${durableProbe.calls}`,
        rationale: "durable fixture rationale",
        uncertainty: 0.1,
        usage: { promptTokens: 8, completionTokens: 4, reportedCostUnits: 0 },
      };
    };
    const durableModuleOptions = (persistence) => ({
      roomRuntime: roomFacade,
      persistence,
      provider: createInMemoryProviderAdapter({ responder: durableResponder }),
      packages: packagesForProduct(),
      assetCatalog: companionPortraitAssetCatalogV1(),
      globalWorldbookEntries: GLOBAL_WORLDBOOK_FIXTURE,
      now: () => GENERATED_AT,
    });
    const durableCall = async (module, method, sub, body) => (await module.handle({
      method,
      pathname: `${STARCRAFT_TMG_COMPANION_PRODUCT_API_PREFIX}/${sub}`,
      query: method === "GET" ? { roomId: ROOM_ID } : {},
      headers: { authorization: `Bearer ${seat}` },
      body: method === "GET" ? {} : { roomId: ROOM_ID, ...(body || {}) },
    })).response.result;

    const persistenceA = createStarcraftTmgCompanionProductPersistenceV1({
      kind: "sqlite",
      filename: durableFile,
      encryption: { key: durableKey },
    });
    const moduleA = createStarcraftTmgCompanionProductModuleV1(
      durableModuleOptions(persistenceA),
    );
    const dStatus = await durableCall(moduleA, "GET", "status");
    ensure(dStatus.ok === true && dStatus.persistence?.durable === true,
      "DURABLE_DECLARATION_NOT_HONEST", { persistence: dStatus.persistence });
    ensure((await durableCall(moduleA, "PUT", "persona", {
      displayName: "持久指挥官",
      description: "跨重启保留。",
    })).ok === true, "DURABLE_PERSONA_PUT_FAILED");
    const dOpen = await durableCall(moduleA, "POST", "conversations", {
      packageIds: [
        "starcraft-tmg.companion.sarah_kerrigan",
        "starcraft-tmg.companion.zagara",
      ],
    });
    ensure(dOpen.ok === true, "DURABLE_OPEN_FAILED", { reason: dOpen.reason });
    const dSent = await durableCall(moduleA, "POST", `conversations/${dOpen.conversationId}/turns`, {
      content: "持久化问候。",
    });
    ensure(dSent.ok === true && dSent.turnCounter === 3, "DURABLE_SEND_FAILED",
      { reason: dSent.reason });
    ensure((await durableCall(moduleA, "POST", `conversations/${dOpen.conversationId}/memory/summary`, {
      content: "持久化摘要。",
    })).ok === true, "DURABLE_SUMMARY_FAILED");
    await persistenceA.close();

    const persistenceB = createStarcraftTmgCompanionProductPersistenceV1({
      kind: "sqlite",
      filename: durableFile,
      encryption: { key: durableKey },
    });
    const moduleB = createStarcraftTmgCompanionProductModuleV1(
      durableModuleOptions(persistenceB),
    );
    const dActive = await durableCall(moduleB, "GET", "conversations/active");
    ensure(dActive.ok === true && dActive.conversationId === dOpen.conversationId
      && dActive.turnCounter === 3 && dActive.messages?.length === 3,
    "DURABLE_RESTART_TRANSCRIPT_RESUME_FAILED", {
      conversationId: dActive.conversationId,
      turnCounter: dActive.turnCounter,
    });
    const dPersona = await durableCall(moduleB, "GET", "persona");
    ensure(dPersona.ok === true && dPersona.displayName === "持久指挥官",
      "DURABLE_PERSONA_RESUME_FAILED", { persona: dPersona });
    const dMemory = await durableCall(moduleB, "GET", `conversations/${dOpen.conversationId}/memory`);
    ensure(dMemory.ok === true
      && dMemory.layers?.rollingSummary?.content === "持久化摘要。",
    "DURABLE_MEMORY_RESUME_FAILED");
    await persistenceB.close();
    const durableFileRecord = await artifactRecord(durableFile,
      "Encrypted SQLite durable store: the second composition (simulated process restart) resumed the transcript, persona and rolling summary from this file; a wrong key fails closed.");
    artifacts.push(durableFileRecord);

    const wrongKey = createHash("sha256").update("ticket26-266f-wrong-key").digest("base64");
    const persistenceWrong = createStarcraftTmgCompanionProductPersistenceV1({
      kind: "sqlite",
      filename: durableFile,
      encryption: { key: wrongKey },
    });
    const moduleWrong = createStarcraftTmgCompanionProductModuleV1(
      durableModuleOptions(persistenceWrong),
    );
    const wrongRead = await durableCall(moduleWrong, "GET", "conversations/active");
    ensure(wrongRead.ok === false, "WRONG_KEY_NOT_FAIL_CLOSED", { result: wrongRead });
    await persistenceWrong.close().catch(() => {});
    checks.push({
      id: "headless_durable_process_restart_resume_fail_closed_keys",
      passed: true,
      durableFile: durableFileRecord.path,
      durableFileSha256: durableFileRecord.sha256,
      providerCalls: durableProbe.calls,
    });

    // ── 266f.2: secure BYOK product seam — REAL Ticket 16 session client +
    // REAL HTTP transport against the deterministic Ticket-16-contract
    // fixture. Synthetic credential bytes only; they are proven zeroed after
    // attach, receipts are proven redacted, and nothing persists.
    let agentSessionActive = false;
    const byokClient = createStarcraftTmgSecureProviderSessionClientV1({
      transport: createHttpStarcraftTmgSecureProviderClientTransportV1({
        baseUrl: origin,
        fetchImpl: globalThis.fetch,
      }),
      sessionSource: {
        read: () => (agentSessionActive
          ? {
            roomId: ROOM_ID,
            sessionId: "agent-session-266f-fixture",
            connectionEpoch: 1,
            lifecycleState: "active",
          }
          : null),
        subscribe: () => () => {},
      },
    });
    ensure(byokClient.read().status === "session_required",
      "BYOK_MISSING_STATE_NOT_FIRST", { status: byokClient.read().status });
    agentSessionActive = true;
    const loadedProfiles = await byokClient.dispatch({ type: "load_profiles" });
    ensure(loadedProfiles.ok === true
      && byokClient.read().status === "ready"
      && byokClient.read().profiles.length === 1
      && byokClient.read().profiles[0].providerId === "fixture-openai-compatible",
    "BYOK_PROFILE_LOAD_FAILED", { view: byokClient.read() });
    const noConsent = await byokClient.dispatch({
      type: "prepare_attachment",
      providerProfileRef: byokClient.read().profiles[0].profileRef,
      consentAccepted: false,
    });
    ensure(noConsent.ok === false
      && noConsent.rejection?.code === "PROVIDER_EXPLICIT_CONSENT_REQUIRED",
    "BYOK_CONSENT_GATE_NOT_ENFORCED", { rejection: noConsent.rejection });
    const prepared = await byokClient.dispatch({
      type: "prepare_attachment",
      providerProfileRef: byokClient.read().profiles[0].profileRef,
      consentAccepted: true,
    });
    ensure(prepared.ok === true && byokClient.read().status === "awaiting_secret"
      && byokClient.read().ingress?.singleUse === true
      && byokClient.read().ingress?.mediaType === "application/octet-stream",
    "BYOK_PREPARE_FAILED", { view: byokClient.read() });
    const secretBytes = new TextEncoder().encode(SYNTHETIC_SECRET);
    const secretLength = secretBytes.byteLength;
    const attached = await byokClient.dispatch({
      type: "attach_secret",
      credentialBytes: secretBytes,
    });
    ensure(attached.ok === true && byokClient.read().status === "attached"
      && byokClient.read().attachment?.state === "attached",
    "BYOK_ATTACH_FAILED", { rejection: attached.rejection });
    ensure(secretBytes.every((byte) => byte === 0),
      "BYOK_CREDENTIAL_BYTES_NOT_ZEROED_AFTER_ATTACH");
    ensure(secureProvider.state.consumedNonces.size === 1,
      "BYOK_NONCE_NOT_SINGLE_USE", { consumed: secureProvider.state.consumedNonces.size });
    const attachReceipt = secureProvider.state.receipts.find((entry) => entry.kind === "attach");
    ensure(attachReceipt && attachReceipt.byteLength === secretLength
      && !("secret" in attachReceipt) && !("bytes" in attachReceipt)
      && !("credential" in attachReceipt),
    "BYOK_ATTACH_RECEIPT_NOT_REDACTED", { attachReceipt });
    const refreshed = await byokClient.dispatch({ type: "refresh_attachment" });
    ensure(refreshed.ok === true && byokClient.read().attachment?.state === "attached",
    "BYOK_REFRESH_FAILED", { rejection: refreshed.rejection });
    const detached = await byokClient.dispatch({ type: "detach_attachment" });
    ensure(detached.ok === true
      && byokClient.read().attachment?.state === "detached"
      && byokClient.read().attachment?.detachReason === "explicit_user_detach",
    "BYOK_DETACH_FAILED", { view: byokClient.read().attachment });
    // Error surface: a rejected attach is an explicit error state, never a
    // silent retry; the second synthetic buffer is zeroed as well.
    const preparedAgain = await byokClient.dispatch({
      type: "prepare_attachment",
      providerProfileRef: byokClient.read().profiles[0].profileRef,
      consentAccepted: true,
    });
    ensure(preparedAgain.ok === true && byokClient.read().status === "awaiting_secret",
    "BYOK_REPARE_AFTER_DETACH_FAILED", { rejection: preparedAgain.rejection });
    secureProvider.state.failNextAttach = "provider_ingress_rejected";
    const secretBytes2 = new TextEncoder().encode(`${SYNTHETIC_SECRET}-second`);
    const rejectedAttach = await byokClient.dispatch({
      type: "attach_secret",
      credentialBytes: secretBytes2,
    });
    ensure(rejectedAttach.ok === false
      && rejectedAttach.rejection?.code === "provider_ingress_rejected"
      && byokClient.read().status === "error",
    "BYOK_ERROR_SURFACE_WRONG", {
      rejection: rejectedAttach.rejection,
      status: byokClient.read().status,
    });
    ensure(secretBytes2.every((byte) => byte === 0),
      "BYOK_REJECTED_CREDENTIAL_BYTES_NOT_ZEROED");
    // Credential absence from every projection and receipt the gate can see.
    ensure(!JSON.stringify(byokClient.read()).includes(SYNTHETIC_SECRET),
      "SYNTHETIC_SECRET_IN_CLIENT_PROJECTION");
    ensure(!JSON.stringify(secureProvider.state.receipts).includes(SYNTHETIC_SECRET),
      "SYNTHETIC_SECRET_IN_FIXTURE_RECEIPTS");
    checks.push({
      id: "headless_byok_full_cycle_states_zeroed_redacted",
      passed: true,
      states: ["session_required", "ready", "awaiting_secret", "attached", "detached", "error"],
      receipts: secureProvider.state.receipts,
    });

    // ── Final boundary assertions ────────────────────────────────────────
    const noAuth = await companionFetch(
      `conversations/active?roomId=${encodeURIComponent(ROOM_ID)}`,
    );
    ensure(noAuth.status === 401
      && noAuth.envelope?.result?.reason === "authentication_required",
    "NO_AUTH_NOT_REJECTED", { status: noAuth.status });

    const moduleStatus = await companionFetch(
      `status?roomId=${encodeURIComponent(ROOM_ID)}`,
      { seatToken: fixture.liveSeatToken() },
    );
    const statusResult = moduleStatus.envelope?.result;
    ensure(statusResult?.ok === true
      && statusResult.roomMutationAuthority === false
      && statusResult.previewConfirmApplyAuthority === false
      && statusResult.seatTokenPersistence === "never"
      && statusResult.hiddenChainOfThought === "not_collected"
      && statusResult.registeredPackages === 6,
    "MODULE_STATUS_BOUNDARIES_WRONG", { status: statusResult });
    ensure(statusResult.provider?.accounting?.externalNetworkAttemptsKnown === 0
      && statusResult.provider?.accounting?.paidInferencePerformed === 0,
    "UNEXPECTED_PROVIDER_NETWORK_OR_PAID_INFERENCE", {
      accounting: statusResult.provider?.accounting,
    });
    checks.push({ id: "headless_module_status_boundaries", passed: true });

    const mutationDelta = Object.fromEntries(ROOM_MUTATION_METHODS.map((method) => [
      method, roomMutations[method] - mutationsBaseline[method],
    ]));
    ensure(Object.values(mutationDelta).every((count) => count === 0),
      "COMPANION_PATH_MUTATED_ROOM", { mutationDelta });
    const roomAfter = await roomRuntime.readRoom({ roomId: ROOM_ID, seatToken: fixture.liveSeatToken() });
    ensure(roomAfter?.ok
      && roomAfter.projection.room.stateRevision === stateRevisionBefore,
    "ROOM_STATE_REVISION_MOVED", {
      before: stateRevisionBefore,
      after: roomAfter?.projection?.room?.stateRevision,
    });
    checks.push({
      id: "zero_room_mutations_state_revision_unchanged",
      passed: true,
      mutationDelta,
      stateRevisionBefore,
      stateRevisionAfter: roomAfter.projection.room.stateRevision,
    });

    // Request-log hygiene: provider prefix only ever saw the documented
    // Ticket 16 operations with no credential-bearing query keys; the only
    // unauthorized companion request is our deliberate no-auth probe.
    const providerOps = requestLog.filter((entry) => entry.prefix === "provider");
    ensure(providerOps.length > 0
      && providerOps.every((entry) => (
        /\/metadata$/u.test(entry.pathname) || /\/attachments(\/|$)/u.test(entry.pathname)
      ))
      && providerOps.every((entry) => (entry.queryKeys || [])
        .every((key) => ["roomId", "sessionId", "expectedConnectionEpoch"].includes(key))),
    "UNEXPECTED_PROVIDER_OPERATION", { providerOps });
    const companionOps = requestLog.filter((entry) => entry.prefix === "companion");
    const unauthorizedCompanionOps = companionOps.filter((entry) => !entry.authorized);
    ensure(companionOps.length > 0
      && unauthorizedCompanionOps.length === 1
      && /conversations\/active/u.test(unauthorizedCompanionOps[0].pathname),
    "UNAUTHORIZED_COMPANION_REQUEST_SCOPE_WRONG", { unauthorizedCompanionOps });
    checks.push({
      id: "request_log_hygiene",
      passed: true,
      companionOperations: companionOps.length,
      providerOperations: providerOps.length,
    });

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
    schemaVersion: "starcraft_tmg_ticket_26_slice_266f_browser_report_v1",
    generatedAt: GENERATED_AT,
    ticket: 26,
    slice: "266f",
    subSlice: "companion-live-product-acceptance (ui polish + byok seam + continuity + responsive)",
    status: "passed",
    assertionsPassed: checks.length,
    checks,
    claimToPixel: claims,
    artifacts,
    screenshotExplanations: SCREENSHOT_EXPLANATIONS,
    requestLog,
    sourceContracts,
    liveByokAcceptance: {
      userAuthorized: "one bounded live Chinese BYOK conversation acceptance",
      executedInThisGate: false,
      realProviderCalls: 0,
      reason: "this deterministic gate itself never touches a real credential or paid Provider; the single authorized live step is executed separately, exactly once, by scripts/run-ticket-26-slice-266f-live-byok-companion-v1.mjs under the project-d-live-acceptance profile",
      reservedProcedure: [
        "scripts/run-ticket-26-slice-266f-live-byok-companion-v1.mjs reads the credential ONLY through the existing Keychain → isolated-Worker secure path (packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs + the Ticket 16 Slice 162 egress Worker pattern); the raw key never enters the agent prompt, repository, command line, stdout/stderr, screenshots, report, or logs",
        "attach through the same isolated Worker contract proven in this gate (single-use ingress → child-process session memory only → explicit detach with sensitiveBytesZeroed acknowledgement)",
        "run one bounded Chinese companion conversation through the real product path; inspect only redacted product receipts",
        "stop immediately on 401/402/403, missing attachment or ambiguous dispatch; never silently retry; a one-attempt dispatch lock enforces the hard maximum of one physical Provider call",
        "record exact Provider calls, reported tokens and estimated cost",
        "detach at the end and prove credential absence from persistence and artifacts",
      ],
      seamProofsInThisGate: [
        "deterministic Ticket-16-contract fixture: metadata/prepare/attach/read/detach with single-use nonce and octet-stream ingress",
        "REAL Ticket 16 session client + REAL HTTP transport: session_required → ready → awaiting_secret → attached → detached, plus the rejected-attach error state",
        "credential bytes proven zeroed after attach (accepted AND rejected)",
        "receipts proven redacted (byte length only); single-use nonce enforced",
        "browser BYOK card: explicit state chip (missing), fixture profile catalogue, secret-hygiene line, secret input cleared before network await (source-level proof)",
      ],
    },
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
      fixture: "two-seat legacy sample-state demo room (host player1 + guest player2); companion product module composed around injected in-memory persistence and a verifier-controlled deterministic Chinese Provider responder; deterministic Ticket-16-contract secure BYOK fixture; no hosted bot, no live agent; no real Provider",
      legacyAdapterInput: {
        path: path.relative(ROOT, LEGACY_ADAPTER_PATH),
        note: "read-only adapter input outside the workspace",
      },
      roomId: ROOM_ID,
      worktreeHead,
      baseCommit: SLICE_266F_BASE_COMMIT,
      closureCommit266e: SLICE_266E_CLOSURE_COMMIT,
      changedFiles: scope.changed,
      backendModules: scope.modules,
      scopeRule: "the 266e closure is proven as a HEAD ancestor; git diff base..HEAD must touch only the manifest allowedPaths; every loaded backend module (including the read-only reused Ticket 16 client modules) is hash-recorded",
    },
    boundaries: {
      currentProductCodeServed: true,
      backendModulesEditedOutsideSlice: false,
      realProviderCalls: 0,
      paidProviderUsed: false,
      liveByokExecuted: false,
      fixtureProviderCalls: providerProbe.calls + durableProbe.calls,
      fixtureProviderInterruptions: providerProbe.interruptions,
      byokFixtureOperations: secureProvider.state.receipts.length,
      sourceRefreshPerformed: false,
      roomMutationsByCompanionPath: 0,
      previewConfirmApplyAuthority: false,
      seatTokenPersistedByCompanionPath: false,
      opponentPrivateAccess: false,
      hiddenChainOfThoughtCollected: false,
      modelReplyFabricated: false,
      gameplayTruthComputedInUi: false,
      portraitAssetsModifiedOrGenerated: false,
      credentialPersistedAnywhere: false,
      trainingTruth: false,
    },
    elapsedSeconds: Math.round((Date.now() - started) / 100) / 10,
  };
  secrets.push(...liveSeatTokens);
  const serialized = JSON.stringify(reportCore);
  for (const secret of secrets) {
    ensure(!serialized.includes(secret), "PRIVATE_VALUE_IN_BROWSER_REPORT");
  }
  // Credential/secret absence from every artifact byte (screenshots, durable
  // store, report inputs): the synthetic sentinel and every seat/recovery
  // token must never appear in any evidence file.
  for (const artifact of artifacts) {
    const bytes = await readFile(path.join(ROOT, artifact.path));
    for (const secret of secrets) {
      ensure(!bytes.includes(Buffer.from(secret, "utf8")),
        "PRIVATE_VALUE_IN_ARTIFACT", { artifact: artifact.path });
    }
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
