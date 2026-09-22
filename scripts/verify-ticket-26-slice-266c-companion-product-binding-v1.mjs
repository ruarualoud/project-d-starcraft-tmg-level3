#!/usr/bin/env node

/**
 * Ticket 26 / Slice 266c — live companion product binding browser gate
 * (claim-to-pixel + claim-to-interaction).
 *
 * Self-contained verifier (K3 guardrails v1, same harness discipline as the
 * Slice 264/265/266b gates):
 *   1. exports the CURRENT worktree Expo Web bundle when any frontend source
 *      (now INCLUDING packages/client-domain, whose companion entry point and
 *      character-projection binding registry feed the bundle) is newer than
 *      the existing export (current-main, never stale-export);
 *   2. creates a TWO-SEAT demo room (host player1 + guest player2, both human
 *      player seats) from the unchanged legacy sample-state adapter input,
 *      instantiated from THIS worktree; every loaded backend module is
 *      hash-recorded and backend drift outside the slice-owned paths is
 *      rejected against the slice base commit;
 *   3. composes the REAL companion product module
 *      (packages/product-composition/companion-product-module-v1.mjs) around
 *      the same room runtime facade with the injected in-memory persistence
 *      port and an injected verifier-controlled provider responder (NO real
 *      Provider, NO network, NO credentials), and serves the worktree bundle
 *      plus the unmodified Level3 room HTTP API plus the companion product
 *      API on one loopback origin; the online-Agent and secure-provider
 *      prefixes receive honest fixture envelopes — ZERO Provider calls;
 *   4. wraps the room runtime in a mutation-counting facade: previewAction,
 *      confirmPreview, applyAction, claimControl, selectCharacterPersona,
 *      setCharacterSpoilerAccess, issueInvite and issueSeatRecovery are
 *      counted; the whole companion journey must leave them at ZERO and the
 *      room stateRevision unchanged;
 *   5. drives real Chromium (desktop 1500×1050 and narrow/touch 390×844,
 *      reduced motion) through the live companion product journey:
 *        - bind player1 via recovery URL; the live Field-comms identity
 *          renders "Sarah Kerrigan" (the CHARACTER_PACKAGE_HASH_PIN_STALE fix
 *          proven in the browser, not allowlisted);
 *        - open the floating Tactical Adjutant → Companion group chat:
 *          explicit Provider status card (injected port), BYOK honesty note;
 *        - select 2 registered companions (Kerrigan + Zagara), open the
 *          conversation, deterministic speaker order chips with next-turn
 *          highlight;
 *        - send one user turn with an @Kerrigan mention → deterministic
 *          user → Kerrigan → Zagara cycle; transcript order, mention label
 *          and server-side providerAccounting.calls === 2 are asserted;
 *        - checkpoint → verifier arms a one-shot provider outage → send →
 *          explicit interrupted card (accepted history preserved, NO
 *          fabricated reply, explicit-continue-only, never automatic retry)
 *          → explicit Continue completes Kerrigan + Zagara;
 *        - more turns, then Resume to the checkpoint → checkpoint isolation
 *          (turnCounter rolls back to 3);
 *        - full page reload → the chat resumes the persisted transcript via
 *          readActive (3 messages, turn 3);
 *        - wrong-seat rejection: guest player2 Bearer token cannot read or
 *          post to player1's conversation (COMPANION_CONVERSATION_SCOPE_MISMATCH);
 *          no token at all → 401 authentication_required;
 *        - current-speaker portrait claim-to-pixel proof at desktop AND at
 *          390px: decoded 1254px committed keyframe, canvas luminance
 *          variance, labelled asset path sha256 == committed file == served
 *          bundled bytes;
 *        - narrow journey closes the conversation and the selector honestly
 *          returns;
 *   6. every visual claim is recorded as a claim-to-pixel row (screenshot,
 *      viewport, precondition, interaction, expected, observed, contract)
 *      plus sha256-hashed PNG evidence under
 *      build/ticket-26-slice-266c-companion-product-binding-v1/.
 *
 * Slice 266d extension (same gate, extended — no second verifier):
 *   7. durable Tavern-equivalent contracts are proven headlessly over the
 *      SAME live HTTP surface after the browser journeys: versioned seat-bound
 *      user persona (put/rollback append-only), four-tier worldbook triggers
 *      (keyword/regex, chat/persona/character/global, bounded recursion with
 *      firedAtDepth provenance), layered memory ops (summary edit + append-only
 *      rollback, episodic, typed relationship events), swipe reroll + accept
 *      lineage and edit-as-branch (accepted history hashes never rewritten),
 *      Author's Note depth/frequency injection proven inside the captured
 *      provider request, integrity-hashed export/tamper/cross-seat/never-
 *      overwrite restore, package + worldbook export/import, hash-chained
 *      audit export verified by verifyCompanionAuditExport with replay
 *      candidates that can never auto-promote, and the four live permission
 *      surfaces (opponent-private denied everywhere, observer/review cannot
 *      speak, no Preview/Confirm/Apply anywhere);
 *   8. durable process-restart resume: the product is composed twice over the
 *      encrypted SQLite port (file under the build evidence dir, 32-byte
 *      managed key); the second composition (simulated restart) resumes the
 *      transcript, persona, author's note, summary versions and open branch;
 *      a wrong/missing key fails closed;
 *   9. all SIX companion portraits are proven as real pixels in the catalogue
 *      section (decoded 1254px keyframes, canvas variance, served-bytes sha256
 *      == committed file == server registry contentHash), and the new chat
 *      cards are driven in the real browser at desktop AND 390px with zero
 *      horizontal overflow.
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
const PROJECT_D_ROOT = path.resolve(ROOT, "..");
const EXPO_DIR = path.join(ROOT, "apps/starcraft-tmg-expo");
const DIST_DIR = path.join(EXPO_DIR, "dist");
const BUILD_ROOT = path.join(ROOT, "build/ticket-26-slice-266c-companion-product-binding-v1");
const EVIDENCE_ROOT = path.join(BUILD_ROOT, "browser-evidence");
const REPORT_PATH = path.join(BUILD_ROOT, "browser-report.json");
const SLICE_266C_BASE_COMMIT = "e5ab22f267e85120862926682c9f331b1299c74e";
const SLICE_266D_CLOSURE_COMMIT = "77d532dc6bd3b240934ec690ce3a1abb337ad133";
const GENERATED_AT = "2026-09-22T00:00:00.000Z";
const ROOM_ID = "ticket26-slice266c-companion-product";
const AGENT_API_PREFIX = "/starcraft-tmg-level3/agent/api/v2";
const PROVIDER_API_PREFIX = "/starcraft-tmg-level3/provider/api/v1";
const LEGACY_ADAPTER_PATH = path.join(PROJECT_D_ROOT, "scripts/starcraft-tmg-rules-v0.mjs");
const SCREENSHOT_EXPLANATIONS = {
  "01-desktop-bound-live-identity.png": "Room bound via recovery URL: the live Field-comms identity renders Sarah Kerrigan — the CHARACTER_PACKAGE_HASH_PIN_STALE fix proven in the browser (registry-derived current binding validates the sealed package; fail-closed integrity preserved).",
  "02-desktop-chat-open-two-companions.png": "Companion group chat opened: explicit Provider status card (injected port, BYOK honesty note), Kerrigan + Zagara selected, conversation opened with deterministic speaker order chips and next-turn highlight on the player.",
  "03-desktop-first-cycle-transcript.png": "First cycle complete: user turn with @Sarah Kerrigan mention, then Kerrigan, then Zagara — deterministic order, persisted transcript, server providerAccounting.calls === 2.",
  "04-desktop-checkpoint-recorded.png": "Manual checkpoint recorded (sessckpt-1-…, turn 3) with a Resume-to-checkpoint control.",
  "05-desktop-provider-interrupted.png": "Verifier-armed provider outage: the turn stops with an explicit interrupted card — accepted history preserved, no fabricated reply, explicit-continue-only; the transcript shows only the accepted user turn.",
  "06-desktop-explicit-continue-complete.png": "After the human presses Continue explicitly, Kerrigan and Zagara complete turns 5 and 6 — no automatic retry anywhere.",
  "07-desktop-resumed-to-checkpoint.png": "Resume to the checkpoint rolls the conversation back to turn 3 / 3 messages — checkpoint isolation proven in the UI.",
  "08-desktop-reload-persisted-transcript.png": "Full page reload: the chat section re-opens and readActive resumes the persisted server transcript (3 messages, turn 3) — the UI holds no transcript state.",
  "09-desktop-chat-speaker-pixels.png": "Current-speaker portrait (Zagara speaking): real committed 1254px keyframe, canvas variance proof, labelled asset sha256 equals the committed file and the served bundled bytes.",
  "10-desktop-byok-honest.png": "Secure BYOK console: the server approved 0 Provider profiles — BYOK honestly unavailable, not hidden; loading the catalogue never calls a model.",
  "11-narrow-chat-resumed.png": "390px touch: the same conversation resumes in the chat section with the persisted transcript; zero horizontal overflow.",
  "12-narrow-chat-speaker-pixels.png": "390px touch: current-speaker portrait pixel proof repeated at narrow width (real keyframe, served-bytes sha256 match).",
  "13-narrow-chat-closed.png": "390px touch: conversation closed; the 1..6 companion selector honestly returns for a new conversation.",
  "14-desktop-266d-persona-worldbook.png": "Slice 266d: versioned seat-bound persona saved from the UI (Commander Vale v1) and a chat-tier worldbook entry registered with a keyword trigger; the four-tier listing is visible.",
  "15-desktop-266d-branch-accepted.png": "Slice 266d: swipe of the last companion reply rerolled through the real provider path and ACCEPTED as a NEW appended turn (lineage shown; accepted history never rewritten), plus edit-as-branch on the user's own turn.",
  "16-desktop-266d-memory-authors-note.png": "Slice 266d: layered memory card (summary saved as v1 then rolled back append-only) and the Author's Note card (depth/frequency saved, versioned).",
  "17-desktop-266d-audit-permissions.png": "Slice 266d: audit chain verified + exported + replay candidate built (automatic promotion forbidden), and the four live permission surfaces each denying opponent-private with no Preview/Confirm/Apply.",
  "18-narrow-266d-cards.png": "390px touch: the Slice 266d chat cards (persona/worldbook/memory/branches/author's note/import-export/audit/permissions) render inside the floating panel with zero horizontal overflow.",
  "19-desktop-catalogue-six-portraits.png": "All six registered companion portraits in the catalogue section: every one decoded from its committed 1254px keyframe with canvas variance and served-bytes sha256 equal to the committed file and the server registry contentHash.",
};
const BACKEND_MODULES_RECORDED = [
  "packages/authoritative-engine/transition-v1.mjs",
  "packages/client-domain/character-presentation-projection-v2.mjs",
  "packages/client-domain/client-domain-v1.mjs",
  "packages/client-domain/portable-contract-hash-v1.mjs",
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
];
const SLICE_OWNED_BACKEND_PREFIXES = [
  "packages/client-domain/character-presentation-projection-v2.mjs",
  "packages/client-domain/client-domain-v1.mjs",
  "packages/product-composition/",
  "packages/companion-backend-module-v1/",
  "scripts/support/ticket20-human-agent-demo-fixture-v1.mjs",
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

async function assertBackendScope() {
  const closureIsIntegrated = spawnSync(
    "git",
    ["merge-base", "--is-ancestor", SLICE_266D_CLOSURE_COMMIT, "HEAD"],
    { cwd: ROOT, encoding: "utf8" },
  );
  ensure(closureIsIntegrated.status === 0, "COMPANION_SLICE_CLOSURE_NOT_INTEGRATED", {
    closureCommit: SLICE_266D_CLOSURE_COMMIT,
    stderr: String(closureIsIntegrated.stderr || "").slice(-800),
  });
  const drift = runGit(
    [
      "diff",
      "--name-only",
      SLICE_266C_BASE_COMMIT,
      SLICE_266D_CLOSURE_COMMIT,
      "--",
      "packages/",
      "scripts/support/",
    ],
    ROOT,
  ).trim().split("\n").filter(Boolean).filter((relative) => (
    !SLICE_OWNED_BACKEND_PREFIXES.some((owned) => (
      relative === owned || relative.startsWith(owned)
    ))
  ));
  ensure(!drift.length, "BACKEND_CONTRACT_DRIFT_OUTSIDE_SLICE", { drift });
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
  return modules;
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
    // Presentation-only companion content feeds the bundle.
    path.join(ROOT, "content/characters"),
    // Committed admitted portrait keyframes feed the bundle.
    path.join(ROOT, "assets/characters"),
    // Slice 266c: the Client Domain module (companion entry point and the
    // registry-derived character binding) is bundled into the Web export.
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
  const force = process.env.TICKET26_266C_FORCE_EXPORT === "1";
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

async function startServer(fixture, api, requestLog) {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://fixture.local");
      const hasBody = ["POST", "PUT", "PATCH"].includes(request.method || "GET");
      const body = hasBody ? await readRequestBody(request) : { body: {} };
      if (url.pathname.startsWith(api.companionPrefix)) {
        requestLog.push({
          prefix: "companion",
          method: request.method,
          pathname: url.pathname,
          authorized: Boolean(request.headers.authorization),
        });
        const result = await fixture.companionModule.handle({
          method: request.method,
          pathname: url.pathname,
          query: Object.fromEntries(url.searchParams),
          headers: request.headers,
          body: body.body,
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
        // The browser binds by exchanging a recovery capability; the exchange
        // derives a NEW principal scope, so fixture-side headless assertions
        // must present the browser's live seat credential. Capture it from the
        // authoritative response (server-side only; it is added to the secrets
        // list and never written to the report).
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

function sectionButton(page, name) {
  return companionChip(page).getByRole("button", { name });
}

function chatSection(page) {
  return companionChip(page).getByTestId("companion-chat-section");
}

async function documentOverflow(page) {
  return page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
}

/**
 * Claim-to-pixel proof for the current chat speaker portrait:
 *   - the <img> exists (not the glyph fallback), is decoded at the committed
 *     1254×1254 source size, and is rendered inside the viewport;
 *   - canvas luminance variance is far above a flat/glyph placeholder;
 *   - the asset path LABELLED in the DOM resolves to a committed repo file
 *     whose sha256 matches the hash prefix the UI displays;
 *   - the SERVED bundled bytes hash to that same sha256.
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
  ensure(["contain", "cover"].includes(renderInfo.backgroundSize),
    "CHAT_PORTRAIT_ASPECT_NOT_PRESERVED", { assetPath, backgroundSize: renderInfo.backgroundSize });

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

  ensure(decoded.src === renderInfo.backgroundImage,
    "RENDERED_LAYER_AND_DECODED_SRC_DIVERGE", { src: decoded.src, rendered: renderInfo.backgroundImage });
  const served = await request.get(renderInfo.backgroundImage);
  ensure(served.ok(), "CHAT_PORTRAIT_SERVE_FAILED", { src: renderInfo.backgroundImage, status: served.status() });
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

/**
 * Slice 266d: the same claim-to-pixel discipline for EACH of the six
 * registered companion portraits in the catalogue section. The expected
 * asset + content hash come from the SERVER registry
 * (content/characters/companion-portrait-asset-registry-v1.mjs); the rendered
 * <img> must decode the committed 1254px keyframe with real luminance
 * variance, and the served bundled bytes must hash to the same sha256 as the
 * committed file and the registry pin.
 */
async function proveCataloguePortraitPixels(page, request, characterId, viewportWidth, registry) {
  const slug = characterId.split(".")[1] || characterId;
  const registryEntry = registry.entries
    .find((candidate) => candidate.characterId === characterId);
  ensure(registryEntry, "REGISTRY_ENTRY_MISSING", { characterId });
  const idle = registryEntry.states.find((state) => state.stateId === "idle");
  ensure(idle, "REGISTRY_IDLE_STATE_MISSING", { characterId });
  const committedFile = safeFile(ROOT, idle.assetId);
  ensure(committedFile && existsSync(committedFile), "LABELLED_ASSET_NOT_COMMITTED",
    { assetId: idle.assetId });
  const committedHash = await sha256File(committedFile);
  ensure(committedHash === idle.contentHash, "REGISTRY_HASH_DRIFT",
    { characterId, assetId: idle.assetId, committedHash, registryHash: idle.contentHash });

  const testId = `companion-card-portrait-${slug}-img`;
  const frame = page.getByTestId(testId);
  await frame.waitFor({ timeout: 30_000 });
  const img = frame.locator("img").first();
  await img.waitFor({ state: "attached", timeout: 30_000 });
  await page.waitForFunction((id) => {
    const el = document.querySelector(`[data-testid="${id}"] img`);
    return el && el.complete && el.naturalWidth > 0;
  }, testId, { timeout: 30_000 });
  const decoded = await img.evaluate((el) => ({
    naturalWidth: el.naturalWidth,
    naturalHeight: el.naturalHeight,
    src: el.currentSrc || el.src,
  }));
  ensure(decoded.naturalWidth === 1254 && decoded.naturalHeight === 1254,
    "CATALOGUE_PORTRAIT_NOT_COMMITTED_SOURCE", { characterId, decoded });

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
  ensure(renderInfo.backgroundImage, "CATALOGUE_PORTRAIT_NOT_RENDERED", { characterId });

  const box = await frame.boundingBox();
  ensure(box && box.width >= 40 && box.height >= 40
    && box.x >= -1 && box.x + box.width <= viewportWidth + 1,
  "CATALOGUE_PORTRAIT_NOT_SAFE_OR_NOT_CONTAINED", { characterId, box, viewportWidth });

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
  ensure(variance.stdev > 12, "CATALOGUE_PORTRAIT_FLAT_OR_GLYPH", { characterId, variance });

  const served = await request.get(renderInfo.backgroundImage);
  ensure(served.ok(), "CATALOGUE_PORTRAIT_SERVE_FAILED",
    { characterId, status: served.status() });
  const servedHash = sha256Buffer(await served.body());
  ensure(servedHash === committedHash, "CATALOGUE_SERVED_BYTES_NOT_COMMITTED_ASSET",
    { characterId, servedHash, committedHash });

  return {
    characterId,
    assetId: idle.assetId,
    contentHash: committedHash,
    registryPinMatchesCommittedFile: true,
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
  const backendModules = await assertBackendScope();
  const worktreeHead = runGit(["rev-parse", "HEAD"], ROOT).trim();

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
  const { COMPANION_PORTRAIT_ASSET_REGISTRY_V1 } = await importWorktree(
    "content/characters/companion-portrait-asset-registry-v1.mjs");

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
    title: "Ticket 26 · Slice 266c · Companion product binding browser fixture",
    initialStateAuthority: {
      source: "server_factory",
      state: sampleState,
      dataVersion: data.version,
      receiptHash: hashStarcraftTmgContract({
        source: "ticket-26-slice-266c-companion-product-binding-v1",
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

  // Mutation-counting facade: the companion module and the room adapter only
  // ever receive this view. Any Room mutation the companion path attempted
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

  // Verifier-controlled deterministic responder. NO real Provider, NO
  // network, NO credentials; `failNext` arms a one-shot outage so the
  // interrupted-turn journey is exercised honestly. Every request's messages
  // are recorded so the Slice 266d worldbook/Author's-Note injection can be
  // proven INSIDE the provider request, not inferred.
  const providerProbe = { calls: 0, failNext: 0, interruptions: 0, requests: [] };
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
    return {
      content: `[${slug}] deterministic fixture reply #${providerProbe.calls} to "${String(lastUser?.content || "").slice(0, 48)}"`,
      rationale: "public deterministic fixture rationale (no hidden chain-of-thought exists)",
      uncertainty: 0.1,
      usage: { promptTokens: 128, completionTokens: 32, reportedCostUnits: 0 },
    };
  };
  // Slice 266d: packages are sealed with their receipt/hash-bound portrait
  // presentation assets, and the product receives the committed asset catalog
  // plus one provenance-complete global-tier worldbook entry; trigger
  // recursion is bounded at product depth 2 (engine maximum 4).
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

  const liveSeatTokens = [];
  const fixture = {
    roomId: ROOM_ID,
    roomRuntime,
    companionModule,
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

  const secrets = [hostSeatToken, guestSeatToken];
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
    const toggle = chipToggleButton(page);
    if (touch) await toggle.tap();
    else {
      await toggle.focus();
      await page.keyboard.press("Enter");
    }
    await waitBody(page, "Field comms", 30_000);
    const section = sectionButton(page, /Companion group chat/iu);
    if (touch) await section.tap();
    else {
      await section.focus();
      await page.keyboard.press("Enter");
    }
    await chatSection(page).getByTestId("companion-chat-provider-status").waitFor({ timeout: 60_000 });
  }

  async function conversationMeta(page) {
    return chatSection(page).getByTestId("companion-chat-conversation-meta").innerText();
  }

  async function messageCount(page) {
    return chatSection(page).locator('[data-testid^="companion-chat-message-"]').count();
  }

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
    // The stale-pin fix, proven in the browser: the live identity renders.
    await waitBody(page, "Sarah Kerrigan", 120_000);
    const bodyText0 = await page.locator("body").innerText();
    ensure(!bodyText0.includes("projection withheld")
      && !bodyText0.includes("CHARACTER_PROJECTION_INVALID"),
    "LIVE_IDENTITY_STILL_FAIL_CLOSED");
    await capture(page, "01-desktop-bound-live-identity.png", artifacts);
    claim({
      claimId: "live_identity_renders_after_pin_fix",
      screenshot: "01-desktop-bound-live-identity.png",
      viewport: "1500x1050",
      precondition: "room bound via recovery URL",
      interaction: "none (first paint)",
      expected: "live Field-comms identity renders Sarah Kerrigan; no fail-closed withheld state",
      observed: { identity: "Sarah Kerrigan" },
      contract: "STARCRAFT_TMG_CHARACTER_PACKAGE_BINDING_REGISTRY_V1 current epoch (packages/client-domain/character-presentation-projection-v2.mjs)",
    });
    checks.push({ id: "desktop_live_identity_pin_fix", passed: true });

    // Mutation/stateRevision baseline: the entire chat journey must not move
    // the Room by a single mutation or revision.
    const mutationsBaseline = { ...roomMutations };
    const roomBefore = await roomRuntime.readRoom({ roomId: ROOM_ID, seatToken: fixture.liveSeatToken() });
    ensure(roomBefore?.ok, "ROOM_READ_BEFORE_FAILED");
    const stateRevisionBefore = roomBefore.projection.room.stateRevision;

    // Open the floating chat section.
    await openChatSection(page);
    await waitBody(page, "injected Provider port", 60_000);
    const providerCardText = await chatSection(page)
      .getByTestId("companion-chat-provider-status").innerText();
    ensure(providerCardText.includes("injected_port")
      && providerCardText.includes("injected Provider port"),
    "CHAT_PROVIDER_STATUS_NOT_EXPLICIT", { providerCardText });
    ensure(providerCardText.includes("BYOK"),
      "CHAT_BYOK_HONESTY_NOTE_MISSING", { providerCardText });
    checks.push({ id: "desktop_chat_provider_status_explicit", passed: true });

    // Select Kerrigan (preselected default) + Zagara, then open.
    const chat = chatSection(page);
    await chat.getByTestId("companion-chat-select-sarah_kerrigan").waitFor({ timeout: 30_000 });
    await chat.getByTestId("companion-chat-select-zagara").click();
    await chat.getByTestId("companion-chat-open").click();
    await chat.getByTestId("companion-chat-conversation-meta").waitFor({ timeout: 60_000 });
    const meta0 = await conversationMeta(page);
    const conversationId = meta0.match(/conversation:\s*(\S+)/u)?.[1];
    ensure(conversationId, "CONVERSATION_ID_NOT_RENDERED", { meta0 });
    ensure(meta0.includes("turn 0") && meta0.includes("player1"),
      "CONVERSATION_META_INCOMPLETE", { meta0 });
    for (const slug of ["player", "sarah_kerrigan", "zagara"]) {
      await chat.getByTestId(`companion-chat-order-${slug}`).waitFor({ timeout: 30_000 });
    }
    const orderText = await chat.getByTestId("companion-chat-speaker-order").innerText();
    ensure(orderText.indexOf("Player") < orderText.indexOf("Sarah Kerrigan")
      && orderText.indexOf("Sarah Kerrigan") < orderText.indexOf("Zagara"),
    "SPEAKER_ORDER_NOT_DETERMINISTIC", { orderText });
    ensure(orderText.includes("▶"), "NEXT_TURN_NOT_HIGHLIGHTED", { orderText });
    await capture(page, "02-desktop-chat-open-two-companions.png", artifacts);
    claim({
      claimId: "chat_open_two_companions_deterministic_order",
      screenshot: "02-desktop-chat-open-two-companions.png",
      viewport: "1500x1050",
      precondition: "chat section open, provider status explicit",
      interaction: "click Zagara selection chip, click Open or resume conversation",
      expected: "conversation for seat player1 with 2 registered companions; deterministic speaker order Player → Kerrigan → Zagara with next-turn highlight",
      observed: { conversationId, meta: meta0, order: orderText },
      contract: "MULTI_COMPANION_SIMULTANEOUS_SESSION via companion product module (Slice 266c)",
    });
    checks.push({ id: "desktop_chat_open_two_companions", passed: true });

    // First cycle: user → Kerrigan (mentioned) → Zagara.
    await chat.getByTestId("companion-chat-mention-sarah_kerrigan").click();
    await chat.getByTestId("companion-chat-input").fill(
      "Kerrigan, take the left flank report. Zagara, hold the right.",
    );
    await chat.getByTestId("companion-chat-send").click();
    await chat.getByTestId("companion-chat-message-3").waitFor({ timeout: 90_000 });
    ensure(await messageCount(page) === 3, "FIRST_CYCLE_MESSAGE_COUNT_WRONG",
      { count: await messageCount(page) });
    const message1 = await chat.getByTestId("companion-chat-message-1").innerText();
    const message2 = await chat.getByTestId("companion-chat-message-2").innerText();
    const message3 = await chat.getByTestId("companion-chat-message-3").innerText();
    ensure(message1.includes("Player") && message1.includes("@Sarah Kerrigan"),
      "USER_TURN_MENTION_NOT_RENDERED", { message1 });
    ensure(message2.includes("Sarah Kerrigan") && message2.includes("[sarah_kerrigan]"),
      "KERRIGAN_REPLY_MISSING", { message2 });
    ensure(message3.includes("Zagara") && message3.includes("[zagara]"),
      "ZAGARA_REPLY_MISSING", { message3 });
    const readAfterCycle = await companionFetch(
      `conversations/${encodeURIComponent(conversationId)}?roomId=${encodeURIComponent(ROOM_ID)}`,
      { seatToken: fixture.liveSeatToken() },
    );
    ensure(readAfterCycle.envelope?.result?.ok === true
      && readAfterCycle.envelope.result.providerAccounting?.calls === 2,
    "PROVIDER_ACCOUNTING_NOT_TWO_CALLS", {
      accounting: readAfterCycle.envelope?.result?.providerAccounting,
    });
    await capture(page, "03-desktop-first-cycle-transcript.png", artifacts);
    claim({
      claimId: "first_cycle_user_kerrigan_zagara",
      screenshot: "03-desktop-first-cycle-transcript.png",
      viewport: "1500x1050",
      precondition: "conversation open (2 companions)",
      interaction: "toggle @Kerrigan mention, fill composer, click Send",
      expected: "deterministic user → Kerrigan → Zagara cycle; mention label on the user turn; server providerAccounting.calls === 2",
      observed: {
        messageCount: 3,
        mention: "@Sarah Kerrigan",
        providerCalls: readAfterCycle.envelope.result.providerAccounting.calls,
      },
      contract: "companion-room-session-service-v1 send + drainCompanionReplies (deterministic rotation + mention queue)",
    });
    checks.push({ id: "desktop_first_cycle_mention_accounting", passed: true });

    // Checkpoint at turn 3.
    await chat.getByTestId("companion-chat-checkpoint").click();
    await page.waitForFunction(() => (
      document.querySelector('[data-testid="companion-chat-section"]')
        ?.innerText.includes("sessckpt-")
    ), null, { timeout: 60_000 });
    const chatTextAfterCheckpoint = await chat.innerText();
    const checkpointId = chatTextAfterCheckpoint.match(/sessckpt-\d+-[0-9a-f]{12}/u)?.[0];
    ensure(checkpointId, "CHECKPOINT_NOT_RECORDED_IN_UI");
    await capture(page, "04-desktop-checkpoint-recorded.png", artifacts);
    checks.push({ id: "desktop_checkpoint_recorded", passed: true, checkpointId });

    // Interrupted provider turn: arm a one-shot outage, send, and prove the
    // explicit no-fabrication / explicit-continue-only contract.
    providerProbe.failNext = 1;
    await chat.getByTestId("companion-chat-input").fill("Second order: advance cautiously.");
    await chat.getByTestId("companion-chat-send").click();
    await chat.getByTestId("companion-chat-interrupted").waitFor({ timeout: 90_000 });
    const interruptText = await chat.getByTestId("companion-chat-interrupted").innerText();
    ensure(interruptText.includes("PROVIDER_RESPONDER_ERROR")
      && interruptText.includes("Sarah Kerrigan")
      && /never an automatic retry/iu.test(interruptText),
    "INTERRUPTED_CARD_NOT_EXPLICIT", { interruptText });
    ensure(await messageCount(page) === 4,
      "FABRICATED_REPLY_AFTER_INTERRUPTION", { count: await messageCount(page) });
    const message4 = await chat.getByTestId("companion-chat-message-4").innerText();
    ensure(message4.includes("Player") && !message4.includes("[sarah_kerrigan]"),
      "INTERRUPTED_TURN_FABRICATED_COMPANION_CONTENT", { message4 });
    await capture(page, "05-desktop-provider-interrupted.png", artifacts);
    claim({
      claimId: "interrupted_provider_turn_explicit_no_fabrication",
      screenshot: "05-desktop-provider-interrupted.png",
      viewport: "1500x1050",
      precondition: "checkpoint at turn 3; verifier armed a one-shot provider outage",
      interaction: "send a second user turn",
      expected: "explicit interrupted card (reason + pending companion + explicit-continue-only); accepted history preserved; NO fabricated companion reply",
      observed: { interrupt: "PROVIDER_RESPONDER_ERROR", messageCount: 4 },
      contract: "retryPolicy explicit_continue_only_never_automatic (companion-room-session-service-v1)",
    });
    checks.push({ id: "desktop_interrupted_turn_no_fabrication", passed: true });

    // Explicit Continue completes the turn.
    await chat.getByTestId("companion-chat-continue").click();
    await chat.getByTestId("companion-chat-message-6").waitFor({ timeout: 90_000 });
    ensure(await messageCount(page) === 6, "CONTINUE_DID_NOT_COMPLETE_CYCLE",
      { count: await messageCount(page) });
    const message5 = await chat.getByTestId("companion-chat-message-5").innerText();
    const message6 = await chat.getByTestId("companion-chat-message-6").innerText();
    ensure(message5.includes("Sarah Kerrigan") && message6.includes("Zagara"),
      "CONTINUE_REPLIES_WRONG_ORDER", { message5, message6 });
    ensure(providerProbe.interruptions === 1 && providerProbe.calls === 5,
      "PROVIDER_PROBE_UNEXPECTED", { probe: { ...providerProbe } });
    await capture(page, "06-desktop-explicit-continue-complete.png", artifacts);
    claim({
      claimId: "explicit_continue_completes_interrupted_turn",
      screenshot: "06-desktop-explicit-continue-complete.png",
      viewport: "1500x1050",
      precondition: "interrupted card visible",
      interaction: "click Explicitly continue turn (the only retry path)",
      expected: "Kerrigan (5) then Zagara (6) complete; exactly one armed interruption and 5 provider calls total",
      observed: { messageCount: 6, probe: { ...providerProbe } },
      contract: "continueConversation → drainCompanionReplies (explicit human action only)",
    });
    checks.push({ id: "desktop_explicit_continue", passed: true });

    // A third cycle, then resume to the checkpoint → isolation.
    await chat.getByTestId("companion-chat-input").fill("Third order: regroup at the ridge.");
    await chat.getByTestId("companion-chat-send").click();
    await chat.getByTestId("companion-chat-message-9").waitFor({ timeout: 90_000 });
    const metaBeforeResume = await conversationMeta(page);
    ensure(metaBeforeResume.includes("turn 9"), "THIRD_CYCLE_NOT_ACCEPTED", { metaBeforeResume });
    await chat.getByTestId(`companion-chat-resume-${checkpointId}`).click();
    await page.waitForFunction(() => (
      document.querySelector('[data-testid="companion-chat-conversation-meta"]')
        ?.innerText.includes("turn 3")
    ), null, { timeout: 60_000 });
    ensure(await messageCount(page) === 3, "CHECKPOINT_ISOLATION_FAILED",
      { count: await messageCount(page) });
    await capture(page, "07-desktop-resumed-to-checkpoint.png", artifacts);
    claim({
      claimId: "checkpoint_resume_isolation",
      screenshot: "07-desktop-resumed-to-checkpoint.png",
      viewport: "1500x1050",
      precondition: "9 accepted turns; checkpoint recorded at turn 3",
      interaction: "click Resume to checkpoint",
      expected: "conversation rolls back to turn 3 / 3 messages; later turns isolated",
      observed: { turnCounter: 3, messageCount: 3 },
      contract: "COMPANION_LONG_SESSION_RESUME_CONTRACT (session checkpoint snapshot restore)",
    });
    checks.push({ id: "desktop_checkpoint_isolation", passed: true });

    // Wrong-seat rejection (headless, same HTTP surface the UI uses): guest
    // player2 cannot read or post to player1's conversation; no token → 401.
    const wrongSeatRead = await companionFetch(
      `conversations/${encodeURIComponent(conversationId)}?roomId=${encodeURIComponent(ROOM_ID)}`,
      { seatToken: guestSeatToken },
    );
    ensure(wrongSeatRead.envelope?.result?.ok === false
      && wrongSeatRead.envelope.result.reason === "COMPANION_CONVERSATION_SCOPE_MISMATCH",
    "WRONG_SEAT_READ_NOT_REJECTED", { result: wrongSeatRead.envelope?.result });
    const wrongSeatSend = await companionFetch(
      `conversations/${encodeURIComponent(conversationId)}/turns`,
      {
        method: "POST",
        seatToken: guestSeatToken,
        body: { roomId: ROOM_ID, content: "guest injection attempt" },
      },
    );
    ensure(wrongSeatSend.envelope?.result?.ok === false
      && wrongSeatSend.envelope.result.reason === "COMPANION_CONVERSATION_SCOPE_MISMATCH",
    "WRONG_SEAT_SEND_NOT_REJECTED", { result: wrongSeatSend.envelope?.result });
    const noAuth = await companionFetch(
      `conversations/active?roomId=${encodeURIComponent(ROOM_ID)}`,
    );
    ensure(noAuth.status === 401
      && noAuth.envelope?.result?.reason === "authentication_required",
    "NO_AUTH_NOT_REJECTED", { status: noAuth.status, result: noAuth.envelope?.result });
    checks.push({
      id: "headless_wrong_seat_and_no_auth_rejected",
      passed: true,
      wrongSeatRead: wrongSeatRead.envelope.result.reason,
      wrongSeatSend: wrongSeatSend.envelope.result.reason,
      noAuthStatus: noAuth.status,
    });

    // Full reload: the chat resumes the persisted transcript (readActive).
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
    const persistedMessage2 = await chat.getByTestId("companion-chat-message-2").innerText();
    ensure(persistedMessage2.includes("[sarah_kerrigan]"),
      "PERSISTED_COMPANION_REPLY_MISSING", { persistedMessage2 });
    await capture(page, "08-desktop-reload-persisted-transcript.png", artifacts);
    claim({
      claimId: "reload_resumes_persisted_transcript",
      screenshot: "08-desktop-reload-persisted-transcript.png",
      viewport: "1500x1050",
      precondition: "conversation resumed to checkpoint (turn 3), full page reload with a fresh recovery URL",
      interaction: "expand chip, open chat section",
      expected: "readActive resumes the same conversation; persisted transcript (3 messages incl. companion replies) renders; the UI held no transcript state",
      observed: { meta: metaReloaded, messageCount: 3 },
      contract: "open_or_resume + read_active through the companion product HTTP surface",
    });
    checks.push({ id: "desktop_reload_resume_persisted_transcript", passed: true });

    // Current-speaker portrait pixel proof (desktop).
    const desktopProof = await proveChatSpeakerPixels(page, desktop.request, 1500);
    await capture(page, "09-desktop-chat-speaker-pixels.png", artifacts);
    claim({
      claimId: "chat_speaker_portrait_real_pixels_desktop",
      screenshot: "09-desktop-chat-speaker-pixels.png",
      viewport: "1500x1050",
      precondition: "resumed conversation; current speaker portrait visible",
      interaction: "none (assertion on rendered pixels)",
      expected: "real committed 1254px keyframe, canvas variance, labelled asset sha256 == committed file == served bytes",
      observed: desktopProof,
      contract: "lib/level3/companion-portrait-assets-v1.ts admitted keyframes",
    });
    checks.push({ id: "desktop_chat_speaker_real_pixels", passed: true });

    // ── Slice 266d: drive the Tavern-equivalent chat cards in the real
    // browser (desktop). Every click below exercises the live server
    // contract through the Client Domain facade; no card is a static claim.
    // Persona (versioned, seat-bound): save v1 from the UI.
    await chat.getByTestId("companion-chat-persona-name-input").fill("Commander Vale");
    await chat.getByTestId("companion-chat-persona-description-input")
      .fill("A cautious terran commander who scouts before engaging.");
    await chat.getByTestId("companion-chat-persona-save").click();
    await page.waitForFunction(() => (
      document.querySelector('[data-testid="companion-chat-persona-status"]')
        ?.innerText.includes("Commander Vale · v1/1")
    ), null, { timeout: 60_000 });
    checks.push({ id: "desktop_266d_persona_saved_v1", passed: true });

    // Worldbook: register a chat-tier keyword entry from the UI; the merged
    // four-tier listing shows it.
    await chat.getByTestId("companion-chat-worldbook-id-input").fill("ui-raiders");
    await chat.getByTestId("companion-chat-worldbook-keyword-input").fill("raiders");
    await chat.getByTestId("companion-chat-worldbook-content-input")
      .fill("Raynor's Raiders operate from the Hyperion.");
    await chat.getByTestId("companion-chat-worldbook-register").click();
    await page.waitForFunction(() => (
      document.querySelector('[data-testid="companion-chat-worldbook-list"]')
        ?.innerText.includes("[chat] ui-raiders")
    ), null, { timeout: 60_000 });
    const worldbookListText = await chat.getByTestId("companion-chat-worldbook-list").innerText();
    ensure(worldbookListText.includes("[persona]") && worldbookListText.includes("[character]")
      && worldbookListText.includes("[global]"),
    "WORLDBOOK_TIERS_NOT_ALL_LISTED", { worldbookListText });
    await capture(page, "14-desktop-266d-persona-worldbook.png", artifacts);
    checks.push({ id: "desktop_266d_worldbook_registered_four_tiers", passed: true });

    // Layered memory: save a summary version, then roll back append-only.
    await chat.getByTestId("companion-chat-memory-summary-input")
      .fill("The commander regrouped at the ridge and held the line.");
    await chat.getByTestId("companion-chat-memory-summary-save").click();
    await page.waitForFunction(() => (
      document.querySelector('[data-testid="companion-chat-memory-status"]')
        ?.innerText.includes("summary versions: 1")
    ), null, { timeout: 60_000 });
    await chat.getByTestId("companion-chat-memory-episodic-input")
      .fill("The user prefers defensive siege positions.");
    await chat.getByTestId("companion-chat-memory-episodic-add").click();
    await page.waitForFunction(() => (
      document.querySelector('[data-testid="companion-chat-memory-status"]')
        ?.innerText.includes("episodic facts: 1")
    ), null, { timeout: 60_000 });
    await chat.getByTestId("companion-chat-memory-summary-rollback").click();
    await page.waitForFunction(() => (
      document.querySelector('[data-testid="companion-chat-memory-status"]')
        ?.innerText.includes("summary versions: 2")
    ), null, { timeout: 60_000 });
    checks.push({ id: "desktop_266d_memory_summary_episodic_rollback", passed: true });

    // Author's note: depth 2 / every companion turn, versioned.
    await chat.getByTestId("companion-chat-authors-note-input")
      .fill("Keep answers under three sentences.");
    await chat.getByTestId("companion-chat-authors-note-depth-input").fill("2");
    await chat.getByTestId("companion-chat-authors-note-frequency-input").fill("1");
    await chat.getByTestId("companion-chat-authors-note-save").click();
    await page.waitForFunction(() => (
      document.querySelector('[data-testid="companion-chat-authors-note-status"]')
        ?.innerText.includes("v1")
    ), null, { timeout: 60_000 });
    await capture(page, "16-desktop-266d-memory-authors-note.png", artifacts);
    checks.push({ id: "desktop_266d_authors_note_saved", passed: true });

    // Swipe the last companion reply: reroll through the real provider path,
    // then ACCEPT — the candidate appends a NEW turn (turn 3 → 4); the
    // accepted history is never rewritten.
    await chat.getByTestId("companion-chat-branch-swipe").click();
    await page.waitForFunction(() => (
      document.querySelector('[data-testid="companion-chat-branches-status"]')
        ?.innerText.includes("candidate ready")
    ), null, { timeout: 90_000 });
    await chat.getByTestId("companion-chat-branch-accept").click();
    await page.waitForFunction(() => (
      document.querySelector('[data-testid="companion-chat-conversation-meta"]')
        ?.innerText.includes("turn 4")
    ), null, { timeout: 60_000 });
    // Edit-as-branch on the user's own last turn: submit then accept (turn 5).
    await chat.getByTestId("companion-chat-branch-edit").click();
    await chat.getByTestId("companion-chat-branch-edit-input").waitFor({ timeout: 60_000 });
    await chat.getByTestId("companion-chat-branch-edit-submit").click();
    await page.waitForFunction(() => (
      document.querySelector('[data-testid="companion-chat-branches-status"]')
        ?.innerText.includes("candidate ready")
    ), null, { timeout: 60_000 });
    await chat.getByTestId("companion-chat-branch-accept").click();
    await page.waitForFunction(() => (
      document.querySelector('[data-testid="companion-chat-conversation-meta"]')
        ?.innerText.includes("turn 5")
    ), null, { timeout: 60_000 });
    await capture(page, "15-desktop-266d-branch-accepted.png", artifacts);
    checks.push({ id: "desktop_266d_swipe_and_edit_branches_accepted", passed: true });

    // Import/export: export succeeds with an integrity hash; restore into the
    // live id is honestly rejected (restore never overwrites).
    await chat.getByTestId("companion-chat-export").click();
    await page.waitForFunction(() => (
      document.querySelector('[data-testid="companion-chat-transfer-note"]')
        ?.innerText.includes("export ok · integrity")
    ), null, { timeout: 60_000 });
    await chat.getByTestId("companion-chat-restore").click();
    await page.waitForFunction(() => (
      document.querySelector('[data-testid="companion-chat-transfer-note"]')
        ?.innerText.includes("COMPANION_CONVERSATION_ALREADY_EXISTS")
    ), null, { timeout: 60_000 });
    checks.push({ id: "desktop_266d_export_ok_restore_never_overwrites", passed: true });

    // Audit + permission surfaces, live from the UI.
    await chat.getByTestId("companion-chat-audit-verify").click();
    await page.waitForFunction(() => (
      document.querySelector('[data-testid="companion-chat-audit-result"]')
        ?.innerText.includes("verify · ok")
    ), null, { timeout: 60_000 });
    await chat.getByTestId("companion-chat-audit-replay").click();
    await page.waitForFunction(() => (
      document.querySelector('[data-testid="companion-chat-audit-result"]')
        ?.innerText.includes("automatic promotion: forbidden")
    ), null, { timeout: 60_000 });
    await chat.getByTestId("companion-chat-permissions-load").click();
    await chat.getByTestId("companion-chat-permission-human_vs_agent").waitFor({ timeout: 60_000 });
    await chat.getByTestId("companion-chat-permission-human_vs_human").waitFor({ timeout: 60_000 });
    await chat.getByTestId("companion-chat-permission-agent_vs_agent_observer").waitFor({ timeout: 60_000 });
    await chat.getByTestId("companion-chat-permission-review_mode").waitFor({ timeout: 60_000 });
    const permissionText = await chat.getByTestId("companion-chat-permissions-list").innerText();
    ensure((permissionText.match(/opponent-private: denied/gu) || []).length === 4,
      "PERMISSION_SURFACES_NOT_ALL_DENYING_OPPONENT_PRIVATE", { permissionText });
    ensure((permissionText.match(/Preview\/Confirm\/Apply: false/gu) || []).length === 4,
      "PERMISSION_SURFACES_PREVIEW_CONFIRM_APPLY_NOT_FALSE", { permissionText });
    await capture(page, "17-desktop-266d-audit-permissions.png", artifacts);
    checks.push({ id: "desktop_266d_audit_replay_permission_surfaces", passed: true });

    // Restore the checkpointed state (turn 3) server-side so the narrow
    // journey resumes the same persisted conversation the 266c flow expects.
    const resumeAfter266d = await companionFetch(
      `conversations/${encodeURIComponent(conversationId)}/resume`,
      {
        method: "POST",
        seatToken: fixture.liveSeatToken(),
        body: { roomId: ROOM_ID, checkpointId },
      },
    );
    ensure(resumeAfter266d.envelope?.result?.ok === true
      && resumeAfter266d.envelope.result.turnCounter === 3,
    "RESUME_AFTER_266D_UI_FLOW_FAILED", { result: resumeAfter266d.envelope?.result });
    checks.push({ id: "desktop_266d_resume_to_checkpoint_restored", passed: true });

    const desktopOverflow = await documentOverflow(page);
    ensure(desktopOverflow.documentWidth <= desktopOverflow.viewportWidth + 1,
      "DESKTOP_CHAT_HORIZONTAL_OVERFLOW", desktopOverflow);
    checks.push({ id: "desktop_chat_no_horizontal_overflow", passed: true });

    // BYOK honesty: zero approved profiles, catalogue load calls no model.
    const providerSection = sectionButton(page, /Secure Provider setup/iu);
    await providerSection.focus();
    await page.keyboard.press("Enter");
    await waitBody(page, "Load Provider catalogue", 30_000);
    await sectionButton(page, /Load Provider catalogue/iu).click();
    await waitBody(page, "the server approved 0 Provider profiles", 30_000);
    await capture(page, "10-desktop-byok-honest.png", artifacts);
    checks.push({ id: "desktop_byok_honestly_unavailable", passed: true });

    // ── Slice 266d: all SIX registered companion portraits as real pixels ──
    const catalogueSection = sectionButton(page, /Companion catalogue & parity/iu);
    await catalogueSection.focus();
    await page.keyboard.press("Enter");
    await page.getByTestId("companion-catalogue-panel").waitFor({ timeout: 60_000 });
    const portraitProofs = [];
    for (const entry of COMPANION_CATALOGUE_V1.entries) {
      portraitProofs.push(await proveCataloguePortraitPixels(
        page, desktop.request, entry.characterId, 1500,
        COMPANION_PORTRAIT_ASSET_REGISTRY_V1,
      ));
    }
    ensure(portraitProofs.length === 6
      && portraitProofs.every((proof) => proof.servedSha256MatchesCommitted
        && proof.registryPinMatchesCommittedFile),
    "SIX_PORTRAIT_PROOFS_INCOMPLETE", { count: portraitProofs.length });
    // Parity matrix honesty: the 266d rows read connected; animation/pack
    // sealing rows stay honestly pending.
    const worldbookGap = await page.getByTestId("companion-gap-WORLDBOOK_DYNAMIC_TRIGGER_CONTRACT").innerText();
    const branchGap = await page.getByTestId("companion-gap-COMPANION_SWIPE_BRANCH_CONTRACT").innerText();
    const personaGap = await page.getByTestId("companion-gap-USER_PERSONA_CONTRACT").innerText();
    const animationGap = await page.getByTestId("companion-gap-COMPANION_PORTRAIT_CONTINUOUS_ANIMATION").innerText();
    ensure(worldbookGap.includes("connected (Slice 266c/266d)")
      && branchGap.includes("connected (Slice 266c/266d)")
      && personaGap.includes("connected (Slice 266c/266d)"),
    "PARITY_266D_ROWS_NOT_CONNECTED", { worldbookGap, branchGap, personaGap });
    ensure(animationGap.includes("pending"), "PARITY_ANIMATION_NOT_HONESTLY_PENDING",
      { animationGap });
    await capture(page, "19-desktop-catalogue-six-portraits.png", artifacts);
    claim({
      claimId: "six_companion_portraits_real_pixels",
      screenshot: "19-desktop-catalogue-six-portraits.png",
      viewport: "1500x1050",
      precondition: "catalogue section open; all six companions registered",
      interaction: "none (assertion on rendered pixels per portrait)",
      expected: "each portrait decodes its committed 1254px keyframe with real variance; served-bytes sha256 == committed file == server registry contentHash; parity rows honest",
      observed: portraitProofs.map((proof) => ({
        characterId: proof.characterId,
        contentHash: proof.contentHash.slice(0, 12),
        luminanceStdev: Math.round(proof.luminance.stdev * 100) / 100,
      })),
      contract: "COMPANION_PORTRAIT_ASSET_REGISTRY_V1 + lib/level3/companion-portrait-assets-v1.ts (six approved portrait packages)",
    });
    checks.push({
      id: "desktop_six_companion_portraits_real_pixels",
      passed: true,
      portraits: portraitProofs.map((proof) => proof.characterId),
    });

    await desktop.close();

    // ── Narrow / touch journey ─────────────────────────────────────────
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

    await openChatSection(narrowPage, { touch: true });
    const narrowChat = chatSection(narrowPage);
    await narrowChat.getByTestId("companion-chat-conversation-meta").waitFor({ timeout: 60_000 });
    const narrowMeta = await conversationMeta(narrowPage);
    ensure(narrowMeta.includes(conversationId) && narrowMeta.includes("turn 3"),
      "NARROW_DID_NOT_RESUME_CONVERSATION", { narrowMeta });
    ensure(await messageCount(narrowPage) === 3,
      "NARROW_TRANSCRIPT_INCOMPLETE", { count: await messageCount(narrowPage) });
    const narrowOverflow = await documentOverflow(narrowPage);
    ensure(narrowOverflow.documentWidth <= narrowOverflow.viewportWidth + 1,
      "NARROW_CHAT_HORIZONTAL_OVERFLOW", narrowOverflow);
    await capture(narrowPage, "11-narrow-chat-resumed.png", artifacts);
    claim({
      claimId: "narrow_chat_resume_no_overflow",
      screenshot: "11-narrow-chat-resumed.png",
      viewport: "390x844 touch",
      precondition: "same conversation active; narrow touch viewport",
      interaction: "tap chip, tap chat section",
      expected: "persisted conversation resumes at 390px with zero horizontal overflow",
      observed: { meta: narrowMeta, overflow: narrowOverflow },
      contract: "mobile safe areas (guardrail §9) + persisted session resume",
    });
    checks.push({ id: "narrow_chat_resume_no_overflow", passed: true });

    const narrowProof = await proveChatSpeakerPixels(narrowPage, narrow.request, 390);
    await capture(narrowPage, "12-narrow-chat-speaker-pixels.png", artifacts);
    claim({
      claimId: "chat_speaker_portrait_real_pixels_narrow",
      screenshot: "12-narrow-chat-speaker-pixels.png",
      viewport: "390x844 touch",
      precondition: "chat open at 390px",
      interaction: "none (assertion on rendered pixels)",
      expected: "same real keyframe proof at narrow width; served bytes hash equals committed file",
      observed: narrowProof,
      contract: "guardrail §7 real media paths at touch width",
    });
    checks.push({ id: "narrow_chat_speaker_real_pixels", passed: true });

    // Slice 266d at 390px: every Tavern-equivalent card renders inside the
    // floating panel; zero horizontal overflow with them all present.
    for (const cardTestId of [
      "companion-chat-persona",
      "companion-chat-worldbook",
      "companion-chat-memory",
      "companion-chat-branches",
      "companion-chat-authors-note",
      "companion-chat-import-export",
      "companion-chat-audit",
      "companion-chat-permissions",
    ]) {
      await narrowChat.getByTestId(cardTestId).waitFor({ timeout: 30_000 });
    }
    // Drive one live 266d interaction at touch width: read the permission
    // surfaces and confirm all four render, opponent-private denied.
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
    const narrowOverflow266d = await documentOverflow(narrowPage);
    ensure(narrowOverflow266d.documentWidth <= narrowOverflow266d.viewportWidth + 1,
      "NARROW_266D_CARDS_HORIZONTAL_OVERFLOW", narrowOverflow266d);
    await capture(narrowPage, "18-narrow-266d-cards.png", artifacts);
    claim({
      claimId: "narrow_266d_cards_no_overflow",
      screenshot: "18-narrow-266d-cards.png",
      viewport: "390x844 touch",
      precondition: "chat open at 390px with all Slice 266d cards rendered",
      interaction: "scroll to the permission card, tap Read the four surfaces",
      expected: "all eight 266d cards render; four live permission surfaces list with opponent-private denied everywhere; zero horizontal overflow",
      observed: { overflow: narrowOverflow266d, surfaces: 4 },
      contract: "responsive floating Web/App interaction (guardrail §9) at 390px",
    });
    checks.push({ id: "narrow_266d_cards_render_no_overflow", passed: true });

    // Close the conversation at 390px: the selector honestly returns.
    await narrowChat.getByTestId("companion-chat-close").tap();
    await narrowChat.getByTestId("companion-chat-selector").waitFor({ timeout: 60_000 });
    await capture(narrowPage, "13-narrow-chat-closed.png", artifacts);
    claim({
      claimId: "narrow_close_returns_selector",
      screenshot: "13-narrow-chat-closed.png",
      viewport: "390x844 touch",
      precondition: "conversation open at 390px",
      interaction: "tap Close conversation",
      expected: "conversation closes server-side; the 1..6 companion selector honestly returns",
      observed: { selectorVisible: true },
      contract: "closeConversation + open_or_resume lifecycle",
    });
    checks.push({ id: "narrow_close_conversation", passed: true });

    await narrow.close();

    // ── Slice 266d headless contract phase (same live HTTP surface) ──────
    // Opens a FRESH conversation (the narrow journey closed the first one)
    // and proves every Tavern-equivalent contract end-to-end. Rejections are
    // asserted as rejections; nothing is inferred from UI copy.
    const seat266d = fixture.liveSeatToken();
    const roomQuery266d = `roomId=${encodeURIComponent(ROOM_ID)}`;
    const get266d = (sub) => companionFetch(
      `${sub}${sub.includes("?") ? "&" : "?"}${roomQuery266d}`,
      { seatToken: seat266d },
    );
    const post266d = (sub, body, method = "POST") => companionFetch(sub, {
      method,
      seatToken: seat266d,
      body: { roomId: ROOM_ID, ...body },
    });
    const ok266d = (response, code) => {
      ensure(response.envelope?.result?.ok === true, code, {
        result: response.envelope?.result,
      });
      return response.envelope.result;
    };
    const rejected266d = (response, reason, code) => {
      ensure(response.envelope?.result?.ok === false
        && response.envelope.result.reason === reason, code, {
        expected: reason,
        result: response.envelope?.result,
      });
    };

    // (2) Versioned user persona bound to the authenticated seat.
    const personaBefore = ok266d(await get266d("persona"), "PERSONA_READ_266D_FAILED");
    ensure(personaBefore.configured === true && personaBefore.boundSeat === "player1",
      "PERSONA_NOT_SEAT_BOUND", { persona: personaBefore });
    const personaPut = ok266d(await post266d("persona", {
      displayName: "Commander Vale II",
      description: "Renamed, still cautious.",
    }, "PUT"), "PERSONA_PUT_266D_FAILED");
    ensure(personaPut.currentVersion === personaBefore.currentVersion + 1,
      "PERSONA_VERSION_NOT_INCREMENTED", { personaPut });
    const personaRolled = ok266d(await post266d("persona/rollback", { version: 1 }),
      "PERSONA_ROLLBACK_266D_FAILED");
    ensure(personaRolled.currentVersion === personaBefore.currentVersion + 2
      && personaRolled.versionCount === personaBefore.versionCount + 2
      && personaRolled.displayName === "Commander Vale",
    "PERSONA_ROLLBACK_NOT_APPEND_ONLY", { personaRolled });
    checks.push({
      id: "headless_266d_persona_versioned_seat_bound_append_only_rollback",
      passed: true,
      currentVersion: personaRolled.currentVersion,
      versionCount: personaRolled.versionCount,
    });

    // Fresh conversation for the remaining contract proofs.
    const opened266d = ok266d(await post266d("conversations", {
      packageIds: [
        "starcraft-tmg.companion.sarah_kerrigan",
        "starcraft-tmg.companion.zagara",
      ],
    }), "CONVERSATION_266D_OPEN_FAILED");
    const conv266d = opened266d.conversationId;
    const convPath266d = `conversations/${encodeURIComponent(conv266d)}`;
    ensure(conv266d !== conversationId, "SECOND_CONVERSATION_NOT_FRESH");

    // (3) Deterministic worldbook triggers: keyword + regex + recursion pair.
    const wbEntry = (entry) => post266d(`${convPath266d}/worldbook`, { entry });
    ok266d(await wbEntry({
      entryId: "chat-raiders",
      label: "Raiders",
      content: "Raynor's Raiders raid Dominion supply lines.",
      triggers: [{ kind: "keyword", keywords: ["raiders"] }],
      priority: 9,
      tokenBudget: 64,
    }), "WB_KEYWORD_REGISTER_FAILED");
    ok266d(await wbEntry({
      entryId: "chat-hyperion",
      label: "Hyperion",
      content: "The Hyperion is the Raiders' flagship.",
      triggers: [{ kind: "regex", pattern: "hyperion", flags: "i" }],
      priority: 8,
      tokenBudget: 64,
    }), "WB_REGEX_REGISTER_FAILED");
    ok266d(await wbEntry({
      entryId: "rec-alpha",
      label: "Alpha",
      content: "Alpha lore that mentions beta.",
      triggers: [{ kind: "keyword", keywords: ["alpha"] }],
      priority: 7,
      tokenBudget: 64,
    }), "WB_RECURSION_A_REGISTER_FAILED");
    ok266d(await wbEntry({
      entryId: "rec-beta",
      label: "Beta",
      content: "Beta deep lore.",
      triggers: [{ kind: "keyword", keywords: ["beta"] }],
      priority: 6,
      tokenBudget: 64,
    }), "WB_RECURSION_B_REGISTER_FAILED");
    const wbRead = ok266d(await get266d(`${convPath266d}/worldbook`),
      "WB_READ_266D_FAILED");
    const tierSet = new Set(wbRead.entries.map((entry) => entry.scopeTier));
    ensure(["chat", "persona", "character", "global"].every((tier) => tierSet.has(tier)),
      "WB_SCOPE_TIERS_MISSING", { tiers: [...tierSet] });
    ensure(wbRead.recursion?.maxDepth === 2 && wbRead.recursion?.bounded === true,
      "WB_RECURSION_NOT_BOUNDED", { recursion: wbRead.recursion });

    const sent266d = ok266d(await post266d(`${convPath266d}/turns`, {
      content: "Commanders, tell me of the Koprulu raiders and the Hyperion alpha strike.",
    }), "SEND_266D_FAILED");
    ensure(sent266d.replies?.length === 2, "REPLIES_266D_WRONG_COUNT",
      { replies: sent266d.replies?.length });
    const fired = sent266d.replies[0].contextAssembly?.worldbookFired || [];
    const firedById = Object.fromEntries(fired.map((row) => [row.entryId, row]));
    const personaEntryId = `persona.current.v${personaRolled.currentVersion}`;
    const expectedFired = [
      ["chat-raiders", "chat", 0, "keyword:raiders"],
      ["chat-hyperion", "chat", 0, "regex:hyperion"],
      ["rec-alpha", "chat", 0, "keyword:alpha"],
      ["rec-beta", "chat", 1, "keyword:beta"],
      ["global-koprulu-sector", "global", 0, "keyword:koprulu"],
      [personaEntryId, "persona", 0, "always"],
    ];
    for (const [entryId, scopeTier, firedAtDepth, matchedBy] of expectedFired) {
      const row = firedById[entryId];
      ensure(row, "WORLDBOOK_ENTRY_NOT_FIRED", {
        entryId,
        fired: fired.map((candidate) => candidate.entryId),
      });
      ensure(row.scopeTier === scopeTier && row.firedAtDepth === firedAtDepth,
        "WORLDBOOK_FIRED_TIER_OR_DEPTH_WRONG", { entryId, row });
      ensure((row.matchedBy || []).includes(matchedBy),
        "WORLDBOOK_MATCHED_BY_WRONG", { entryId, matchedBy: row.matchedBy, expected: matchedBy });
    }
    // Deterministic insertion priority: among the verifier's own entries the
    // order is strictly priority-desc (persona 10 → raiders 9 → hyperion 8 →
    // rec-alpha 7 → rec-beta 6 → global 5), independent of fire depth.
    const knownPriority = {
      [personaEntryId]: 10,
      "chat-raiders": 9,
      "chat-hyperion": 8,
      "rec-alpha": 7,
      "rec-beta": 6,
      "global-koprulu-sector": 5,
    };
    const knownSequence = fired.filter((row) => knownPriority[row.entryId] !== undefined)
      .map((row) => knownPriority[row.entryId]);
    ensure(knownSequence.length === 6
      && knownSequence.every((value, index) => index === 0 || value < knownSequence[index - 1]),
    "WORLDBOOK_INSERTION_ORDER_NOT_DETERMINISTIC", { knownSequence });
    // Cross-companion determinism: the shared tiers (persona/chat/global)
    // assemble byte-identically on every companion's context, while
    // character-tier entries are sealed per companion package and fire only
    // on that companion's own assembly (Kerrigan's reference pack carries
    // none; Zagara's sealed pack carries three always-active entries). The
    // second reply still fires the verifier's own six entries with identical
    // tier/depth/match provenance.
    const firedSecond = sent266d.replies[1].contextAssembly?.worldbookFired || [];
    const firedSecondById = Object.fromEntries(firedSecond.map((row) => [row.entryId, row]));
    for (const [entryId, scopeTier, firedAtDepth, matchedBy] of expectedFired) {
      const row = firedSecondById[entryId];
      ensure(row && row.scopeTier === scopeTier && row.firedAtDepth === firedAtDepth
        && (row.matchedBy || []).includes(matchedBy),
      "WORLDBOOK_ASSEMBLY_NOT_DETERMINISTIC_ACROSS_COMPANIONS", { entryId, row });
    }
    const sharedView = (rows) => rows.filter((row) => row.scopeTier !== "character")
      .map((row) => [row.entryId, row.scopeTier, row.firedAtDepth, row.matchedBy]);
    ensure(JSON.stringify(sharedView(firedSecond)) === JSON.stringify(sharedView(fired)),
      "WORLDBOOK_SHARED_TIERS_NOT_IDENTICAL_ACROSS_COMPANIONS");
    const characterTierScoped = (rows, prefix) => rows
      .filter((row) => row.scopeTier === "character")
      .every((row) => row.entryId.startsWith(prefix) && (row.matchedBy || []).includes("always"));
    ensure(characterTierScoped(fired, "kerrigan.") && characterTierScoped(firedSecond, "zagara.")
      && firedSecond.filter((row) => row.scopeTier === "character").length === 3,
    "WORLDBOOK_CHARACTER_TIER_NOT_COMPANION_SCOPED", {
      first: fired.filter((row) => row.scopeTier === "character").map((row) => row.entryId),
      second: firedSecond.filter((row) => row.scopeTier === "character").map((row) => row.entryId),
    });
    checks.push({
      id: "headless_266d_worldbook_triggers_scopes_recursion_priority_provenance",
      passed: true,
      fired: fired.map((row) => [row.entryId, row.scopeTier, row.firedAtDepth]),
    });

    // (6) Author's Note depth/frequency injection — proven inside the
    // captured provider request at the exact injected position.
    ok266d(await post266d(`${convPath266d}/authors-note`, {
      note: "Stay terse.",
      depth: 2,
      frequency: 1,
    }, "PUT"), "AUTHORS_NOTE_PUT_FAILED");
    // Slice 266e repair: the capture window is indexed by the REQUESTS array
    // length, not the call counter. `calls` also counts the one verifier-armed
    // outage earlier in the journey, which throws BEFORE its request is
    // recorded, so `requests.length === calls - 1` here; slicing by `calls`
    // silently dropped the first note-injected request (the 266d integrating
    // run's NOTE_REQUESTS_NOT_CAPTURED with captured: 1). The denominator is
    // unchanged: two companions × frequency 1 = exactly two requests.
    const requestsBeforeNote = providerProbe.requests.length;
    const noteSend = ok266d(await post266d(`${convPath266d}/turns`, {
      content: "Status report please.",
    }), "AUTHORS_NOTE_SEND_FAILED");
    ensure(noteSend.replies.every((reply) => reply.authorsNoteInjected
      && reply.authorsNoteInjected.depth === 2
      && reply.authorsNoteInjected.frequency === 1
      && reply.authorsNoteInjected.position >= 2),
    "AUTHORS_NOTE_INJECTION_FLAGS_WRONG", {
      injected: noteSend.replies.map((reply) => reply.authorsNoteInjected),
    });
    const noteRequests = providerProbe.requests.slice(requestsBeforeNote);
    ensure(noteRequests.length === 2, "NOTE_REQUESTS_NOT_CAPTURED",
      { captured: noteRequests.length });
    for (const [index, request] of noteRequests.entries()) {
      const injectedAt = request.messages
        .findIndex((message) => message.content.includes("Stay terse."));
      ensure(injectedAt === noteSend.replies[index].authorsNoteInjected.position
        && request.messages[injectedAt].role === "system",
      "AUTHORS_NOTE_POSITION_WRONG", {
        companion: request.companionRef,
        injectedAt,
        expected: noteSend.replies[index].authorsNoteInjected.position,
      });
    }
    checks.push({ id: "headless_266d_authors_note_depth_frequency_injected", passed: true });

    // (4) Layered memory: editable + append-only-rollback summary, episodic,
    // typed relationship events; missing-version rollback fails closed.
    ok266d(await post266d(`${convPath266d}/memory/summary`, { content: "Summary one." }),
      "SUMMARY_ONE_FAILED");
    ok266d(await post266d(`${convPath266d}/memory/summary`, { content: "Summary two." }),
      "SUMMARY_TWO_FAILED");
    ok266d(await post266d(`${convPath266d}/memory/summary/rollback`, { summaryVersion: 1 }),
      "SUMMARY_ROLLBACK_FAILED");
    ok266d(await post266d(`${convPath266d}/memory/episodic`, {
      content: "The user scouted before engaging.",
    }), "EPISODIC_ADD_FAILED");
    ok266d(await post266d(`${convPath266d}/memory/relationship`, {
      eventType: "observed_match_outcome",
      deltas: [{ axis: "trust", delta: 5 }],
    }), "RELATIONSHIP_EVENT_FAILED");
    const memory266d = ok266d(await get266d(`${convPath266d}/memory`), "MEMORY_READ_FAILED");
    ensure(memory266d.layers.rollingSummaryVersions?.length === 3
      && memory266d.layers.rollingSummary?.content === "Summary one.",
    "SUMMARY_APPEND_ONLY_ROLLBACK_WRONG", {
      versions: memory266d.layers.rollingSummaryVersions,
      current: memory266d.layers.rollingSummary,
    });
    ensure(memory266d.layers.episodicFacts?.length === 1, "EPISODIC_LAYER_WRONG");
    ensure(memory266d.layers.relationshipState?.axes?.trust?.status === "known"
      && memory266d.layers.relationshipState.axes.trust.value === 5,
    "RELATIONSHIP_LAYER_WRONG", { axes: memory266d.layers.relationshipState?.axes });
    rejected266d(
      await post266d(`${convPath266d}/memory/summary/rollback`, { summaryVersion: 99 }),
      "SUMMARY_VERSION_NOT_FOUND",
      "MISSING_SUMMARY_VERSION_NOT_REJECTED",
    );
    checks.push({ id: "headless_266d_layered_memory_edit_rollback_episodic_relationship", passed: true });

    // (5) Swipe reroll + accept lineage; edit-as-branch; kind validation.
    const convBeforeSwipe = ok266d(await get266d(convPath266d), "READ_BEFORE_SWIPE_FAILED");
    const swipeOpen = ok266d(await post266d(`${convPath266d}/branches`, { kind: "swipe" }),
      "SWIPE_OPEN_FAILED");
    const rerolled = ok266d(await post266d(
      `${convPath266d}/branches/${swipeOpen.branch.branchId}/reroll`, {},
    ), "SWIPE_REROLL_FAILED");
    ensure(rerolled.entry?.entryId && rerolled.contextAssembly?.worldbookFired,
      "REROLL_ENTRY_OR_ASSEMBLY_MISSING");
    const acceptedSwipe = ok266d(await post266d(
      `${convPath266d}/branches/${swipeOpen.branch.branchId}/accept`,
      { entryId: rerolled.entry.entryId },
    ), "SWIPE_ACCEPT_FAILED");
    ensure(acceptedSwipe.turnCounter === convBeforeSwipe.turnCounter + 1
      && acceptedSwipe.acceptedBranch?.lineage
      && acceptedSwipe.messages.length === convBeforeSwipe.messages.length + 1
      && acceptedSwipe.messages.slice(0, convBeforeSwipe.messages.length)
        .every((message, index) => message.turnHash === convBeforeSwipe.messages[index].turnHash),
    "SWIPE_ACCEPT_REWROTE_HISTORY_OR_DID_NOT_APPEND", {
      before: convBeforeSwipe.turnCounter,
      after: acceptedSwipe.turnCounter,
    });
    const editOpen = ok266d(await post266d(`${convPath266d}/branches`, {
      kind: "edit",
      baseTurnSequence: 1,
    }), "EDIT_OPEN_FAILED");
    const editSubmitted = ok266d(await post266d(
      `${convPath266d}/branches/${editOpen.branch.branchId}/entries`,
      { content: "Edited first order." },
    ), "EDIT_SUBMIT_FAILED");
    const acceptedEdit = ok266d(await post266d(
      `${convPath266d}/branches/${editOpen.branch.branchId}/accept`,
      { entryId: editSubmitted.entry.entryId },
    ), "EDIT_ACCEPT_FAILED");
    ensure(acceptedEdit.turnCounter === convBeforeSwipe.turnCounter + 2
      && acceptedEdit.messages.at(-1).content === "Edited first order.",
    "EDIT_ACCEPT_WRONG", { last: acceptedEdit.messages.at(-1) });
    rejected266d(
      await post266d(`${convPath266d}/branches`, { kind: "edit", baseTurnSequence: 2 }),
      "COMPANION_BRANCH_EDIT_REQUIRES_OWN_USER_TURN",
      "EDIT_ON_COMPANION_TURN_NOT_REJECTED",
    );
    rejected266d(
      await post266d(`${convPath266d}/branches`, { kind: "swipe", baseTurnSequence: 1 }),
      "COMPANION_BRANCH_SWIPE_REQUIRES_COMPANION_TURN",
      "SWIPE_ON_USER_TURN_NOT_REJECTED",
    );
    const branchList = ok266d(await get266d(`${convPath266d}/branches`), "BRANCH_LIST_FAILED");
    ensure(branchList.branches?.length === 2
      && branchList.branches.every((branch) => branch.status === "accepted"),
    "BRANCH_LIST_WRONG", { branches: branchList.branches });
    checks.push({ id: "headless_266d_swipe_reroll_edit_branch_lineage", passed: true });

    // (7) Safe import/export/restore: integrity, tamper, cross-seat,
    // never-overwrite; no credentials in either direction.
    const exported266d = ok266d(await get266d(`${convPath266d}/export`), "EXPORT_266D_FAILED");
    ensure(exported266d.export?.integrity?.hash === exported266d.exportHash
      && exported266d.credentialsIncluded === false,
    "EXPORT_INTEGRITY_OR_CREDENTIAL_FLAG_WRONG");
    const exportJson = JSON.stringify(exported266d.export);
    for (const secret of secrets) {
      ensure(!exportJson.includes(secret), "SECRET_IN_CONVERSATION_EXPORT");
    }
    rejected266d(
      await post266d("conversations/restore", { export: exported266d.export }),
      "COMPANION_CONVERSATION_ALREADY_EXISTS",
      "RESTORE_OVERWRITE_NOT_REJECTED",
    );
    const tamperedExport = JSON.parse(exportJson);
    tamperedExport.memory.episodicFacts[0].content = "tampered by verifier";
    rejected266d(
      await post266d("conversations/restore", { export: tamperedExport }),
      "COMPANION_IMPORT_INTEGRITY_MISMATCH",
      "TAMPERED_EXPORT_NOT_REJECTED",
    );
    rejected266d(
      await companionFetch("conversations/restore", {
        method: "POST",
        seatToken: guestSeatToken,
        body: { roomId: ROOM_ID, export: exported266d.export },
      }),
      "COMPANION_EXPORT_SCOPE_MISMATCH",
      "CROSS_SEAT_RESTORE_NOT_REJECTED",
    );
    // Package (character card) export/import with sealed portrait assets.
    const pkgExport = ok266d(await get266d(
      `packages/${encodeURIComponent("starcraft-tmg.companion.sarah_kerrigan")}/export`,
    ), "PACKAGE_EXPORT_FAILED");
    const pkgAssets = pkgExport.export?.contract?.presentationAssets;
    ensure(pkgExport.export?.integrity?.hash
      && pkgAssets && Object.keys(pkgAssets).length === 6
      && Object.values(pkgAssets).every((asset) => (
        typeof asset?.contentHash === "string" && asset.contentHash.length === 64
      )),
    "PACKAGE_PORTRAIT_ASSETS_NOT_SEALED", { states: pkgAssets && Object.keys(pkgAssets) });
    const pkgReimport = ok266d(await post266d("packages/import", {
      contract: pkgExport.export.contract,
    }), "PACKAGE_REIMPORT_FAILED");
    ensure(pkgReimport.registered?.duplicate === true, "PACKAGE_REIMPORT_NOT_DUPLICATE");
    const tamperedContract = JSON.parse(JSON.stringify(pkgExport.export.contract));
    tamperedContract.displayName = "Tampered Kerrigan";
    const tamperedImport = await post266d("packages/import", { contract: tamperedContract });
    ensure(tamperedImport.envelope?.result?.ok === false, "TAMPERED_PACKAGE_NOT_REJECTED",
      { result: tamperedImport.envelope?.result });
    // Worldbook export/import (raw entries get honest user-authorship defaults).
    const wbExport = ok266d(await get266d(`${convPath266d}/worldbook/export`),
      "WB_EXPORT_FAILED");
    ensure(wbExport.entryCount >= 4 && wbExport.export?.integrity?.hash,
      "WB_EXPORT_INCOMPLETE", { entryCount: wbExport.entryCount });
    const wbImport = ok266d(await post266d(`${convPath266d}/worldbook/import`, {
      entries: [{
        entryId: "imported-raw",
        label: "Raw import",
        content: "Imported lore about marines.",
        triggers: [{ kind: "keyword", keywords: ["marines"] }],
        priority: 3,
        tokenBudget: 32,
      }],
    }), "WB_IMPORT_FAILED");
    ensure(wbImport.registered?.length === 1, "WB_IMPORT_COUNT_WRONG");
    checks.push({ id: "headless_266d_import_export_restore_integrity_no_credentials", passed: true });

    // (8) Audit export/verify/replay: hash chain independently verified;
    // replay candidates can never request automatic promotion.
    const auditExport = ok266d(await get266d("audit/export"), "AUDIT_EXPORT_FAILED");
    ensure(Array.isArray(auditExport.export?.entries) && auditExport.export.entries.length > 0,
      "AUDIT_EXPORT_EMPTY");
    const auditVerify = ok266d(await get266d("audit/verify"), "AUDIT_VERIFY_FAILED");
    ensure(auditVerify.verify?.ok === true, "AUDIT_VERIFY_NOT_OK");
    const independentAudit = verifyCompanionAuditExport(
      `${JSON.stringify(auditExport.export, null, 2)}\n`,
    );
    ensure(independentAudit?.ok === true
      && independentAudit.entryCount === auditExport.export.entries.length,
    "AUDIT_INDEPENDENT_VERIFY_FAILED", { independentAudit });
    const replay = ok266d(await post266d("audit/replay-candidate", {
      sessionRef: { sessionId: conv266d },
    }), "REPLAY_CANDIDATE_FAILED");
    ensure(replay.candidate?.trainingTruth === false
      && replay.candidate?.promotion?.automatic === "forbidden",
    "REPLAY_CANDIDATE_BOUNDARY_WRONG", { candidate: replay.candidate });
    rejected266d(
      await post266d("audit/replay-candidate", { promote: true }),
      "COMPANION_AUDIT_AUTOMATIC_PROMOTION_FORBIDDEN",
      "PROMOTE_FLAG_NOT_REJECTED",
    );
    checks.push({ id: "headless_266d_audit_export_verify_replay_candidate", passed: true });

    // (9) Four explicit permission surfaces, computed live.
    const surfaces = ok266d(await get266d("permissions/surfaces"), "PERMISSION_SURFACES_FAILED");
    ensure(surfaces.surfaces?.length === 4, "PERMISSION_SURFACE_COUNT_WRONG",
      { surfaces: surfaces.surfaces?.map((surface) => surface.surfaceId) });
    for (const surface of surfaces.surfaces) {
      ensure(surface.previewConfirmApplyAuthority === false
        && surface.roomMutationAuthority === false,
      "PERMISSION_SURFACE_AUTHORITY_WRONG", { surface: surface.surfaceId });
      const opponent = surface.decisions
        .find((decision) => decision.resourceId === "opponent-private-plan");
      ensure(opponent && opponent.ok === false, "OPPONENT_PRIVATE_NOT_DENIED",
        { surface: surface.surfaceId });
      for (const unknown of surface.decisions
        .filter((decision) => decision.resourceId === "unknown-visibility")) {
        ensure(unknown.ok === false, "UNKNOWN_VISIBILITY_NOT_FAIL_CLOSED",
          { surface: surface.surfaceId });
      }
    }
    ensure(surfaces.surfaces.find((surface) => surface.surfaceId === "agent_vs_agent_observer")
      ?.canSpeak === false
      && surfaces.surfaces.find((surface) => surface.surfaceId === "review_mode")
        ?.canSpeak === false,
    "READ_ONLY_SURFACES_CAN_SPEAK");
    checks.push({ id: "headless_266d_four_permission_surfaces_live", passed: true });

    // ── Slice 266d: durable encrypted-SQLite process-restart resume ──────
    const durableDir = path.join(BUILD_ROOT, "durable");
    await mkdir(durableDir, { recursive: true });
    const durableFile = path.join(durableDir, "companion-product.sqlite");
    const durableKey = createHash("sha256")
      .update("ticket26-266d-durable-verifier-key").digest("base64");
    const durableProbe = { calls: 0 };
    const durableResponder = async (request) => {
      durableProbe.calls += 1;
      const slug = String(request.companionRef?.id || "companion")
        .replace(/^starcraft-tmg\.companion\./u, "");
      return {
        content: `[${slug}] durable reply #${durableProbe.calls}`,
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
      headers: { authorization: `Bearer ${seat266d}` },
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
      displayName: "Durable Commander",
      description: "Persisted across restarts.",
    })).ok === true, "DURABLE_PERSONA_PUT_FAILED");
    const dOpen = await durableCall(moduleA, "POST", "conversations", {
      packageIds: [
        "starcraft-tmg.companion.sarah_kerrigan",
        "starcraft-tmg.companion.zagara",
      ],
    });
    ensure(dOpen.ok === true, "DURABLE_OPEN_FAILED", { reason: dOpen.reason });
    const dConv = dOpen.conversationId;
    const dSent = await durableCall(moduleA, "POST", `conversations/${dConv}/turns`, {
      content: "Durable hello.",
    });
    ensure(dSent.ok === true && dSent.turnCounter === 3, "DURABLE_SEND_FAILED",
      { reason: dSent.reason, turnCounter: dSent.turnCounter });
    ensure((await durableCall(moduleA, "PUT", `conversations/${dConv}/authors-note`, {
      note: "Durable note.",
      depth: 2,
      frequency: 1,
    })).ok === true, "DURABLE_NOTE_PUT_FAILED");
    ensure((await durableCall(moduleA, "POST", `conversations/${dConv}/memory/summary`, {
      content: "Durable summary.",
    })).ok === true, "DURABLE_SUMMARY_FAILED");
    const dBranch = await durableCall(moduleA, "POST", `conversations/${dConv}/branches`, {
      kind: "swipe",
    });
    ensure(dBranch.ok === true, "DURABLE_BRANCH_OPEN_FAILED", { reason: dBranch.reason });
    ensure((await durableCall(
      moduleA, "POST", `conversations/${dConv}/branches/${dBranch.branch.branchId}/reroll`, {},
    )).ok === true, "DURABLE_REROLL_FAILED");
    await persistenceA.close();

    // Simulated process restart: a NEW adapter + module over the same file.
    const persistenceB = createStarcraftTmgCompanionProductPersistenceV1({
      kind: "sqlite",
      filename: durableFile,
      encryption: { key: durableKey },
    });
    const moduleB = createStarcraftTmgCompanionProductModuleV1(
      durableModuleOptions(persistenceB),
    );
    const dActive = await durableCall(moduleB, "GET", "conversations/active");
    ensure(dActive.ok === true && dActive.conversationId === dConv
      && dActive.turnCounter === 3 && dActive.messages?.length === 3
      && dActive.messages[1]?.content.includes("[sarah_kerrigan]"),
    "DURABLE_RESTART_TRANSCRIPT_RESUME_FAILED", {
      conversationId: dActive.conversationId,
      turnCounter: dActive.turnCounter,
      messages: dActive.messages?.length,
      reason: dActive.reason,
    });
    const dPersona = await durableCall(moduleB, "GET", "persona");
    ensure(dPersona.ok === true && dPersona.displayName === "Durable Commander"
      && dPersona.currentVersion === 1,
    "DURABLE_PERSONA_RESUME_FAILED", { persona: dPersona });
    const dNote = await durableCall(moduleB, "GET", `conversations/${dConv}/authors-note`);
    ensure(dNote.ok === true && dNote.note === "Durable note.", "DURABLE_NOTE_RESUME_FAILED");
    const dMemory = await durableCall(moduleB, "GET", `conversations/${dConv}/memory`);
    ensure(dMemory.ok === true && dMemory.layers?.rollingSummaryVersions?.length === 1
      && dMemory.layers?.rollingSummary?.content === "Durable summary.",
    "DURABLE_MEMORY_RESUME_FAILED");
    const dBranches = await durableCall(moduleB, "GET", `conversations/${dConv}/branches`);
    ensure(dBranches.ok === true && dBranches.branches?.length === 1
      && dBranches.branches[0].status === "open"
      && dBranches.branches[0].entryCount === 1,
    "DURABLE_BRANCH_RESUME_FAILED", { branches: dBranches.branches });
    await persistenceB.close();
    const durableFileRecord = await artifactRecord(durableFile,
      "Encrypted SQLite durable store (WAL, synchronous=FULL, AES-256-GCM private payload codec): the second composition (simulated process restart) resumed transcript, persona, author's note, summary versions and the open swipe branch from this file.");
    artifacts.push(durableFileRecord);

    // Wrong key fails closed; missing key fails closed; unknown kind fails closed.
    const wrongKey = createHash("sha256").update("ticket26-266d-wrong-key").digest("base64");
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
    let missingKeyCode = null;
    try {
      createStarcraftTmgCompanionProductPersistenceV1({
        kind: "sqlite",
        filename: path.join(durableDir, "other.sqlite"),
      });
    } catch (error) {
      missingKeyCode = String(error?.code || "");
    }
    ensure(missingKeyCode.includes("DEPENDENCY_MISSING"), "MISSING_KEY_NOT_FAIL_CLOSED",
      { code: missingKeyCode });
    let unknownKindCode = null;
    try {
      createStarcraftTmgCompanionProductPersistenceV1({ kind: "tape-drive" });
    } catch (error) {
      unknownKindCode = String(error?.code || "");
    }
    ensure(unknownKindCode === "COMPANION_PRODUCT_PERSISTENCE_KIND_UNKNOWN",
      "UNKNOWN_PERSISTENCE_KIND_NOT_FAIL_CLOSED", { code: unknownKindCode });
    checks.push({
      id: "headless_266d_durable_sqlite_process_restart_resume_fail_closed_keys",
      passed: true,
      durableFile: durableFileRecord.path,
      durableFileSha256: durableFileRecord.sha256,
      providerCalls: durableProbe.calls,
    });

    // ── Final headless contract assertions ─────────────────────────────
    // Provider unavailable honesty: the same module composed WITHOUT a
    // provider port reports an explicit fail-closed unavailable state.
    const noProviderModule = createStarcraftTmgCompanionProductModuleV1({
      roomRuntime: roomFacade,
      persistence: createInMemoryPersistenceAdapter(),
      packages: packagesForProduct(),
      now: () => GENERATED_AT,
    });
    const noProviderStatus = await noProviderModule.handle({
      method: "GET",
      pathname: `${STARCRAFT_TMG_COMPANION_PRODUCT_API_PREFIX}/status`,
      query: { roomId: ROOM_ID },
      headers: { authorization: `Bearer ${fixture.liveSeatToken()}` },
      body: {},
    });
    ensure(noProviderStatus.response?.result?.provider?.state === "unavailable"
      && noProviderStatus.response.result.provider.reason === "provider_not_injected"
      && noProviderStatus.response.result.provider.failClosed === true,
    "PROVIDER_UNAVAILABLE_STATE_NOT_EXPLICIT", {
      provider: noProviderStatus.response?.result?.provider,
    });
    checks.push({ id: "headless_provider_unavailable_explicit_fail_closed", passed: true });

    // Module status: no room mutation / Preview-Confirm-Apply authority, seat
    // tokens never persisted, no hidden chain-of-thought.
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

    // Zero Room mutations across the whole journey; stateRevision unchanged.
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

    // Request-log hygiene: provider prefix only ever saw metadata GETs; the
    // only unauthorized companion request is our deliberate no-auth probe.
    const providerOps = requestLog.filter((entry) => entry.prefix === "provider");
    ensure(providerOps.every((entry) => /metadata/u.test(entry.pathname)),
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
    schemaVersion: "starcraft_tmg_ticket_26_slice_266c_browser_report_v1",
    generatedAt: GENERATED_AT,
    ticket: 26,
    slice: "266c",
    sliceExtensions: ["266d"],
    subSlice: "companion-product-binding + tavern-completion",
    status: "passed",
    assertionsPassed: checks.length,
    checks,
    claimToPixel: claims,
    artifacts,
    screenshotExplanations: SCREENSHOT_EXPLANATIONS,
    requestLog,
    slice266dContracts: {
      durablePersistence: "encrypted SQLite port wired into product construction; two compositions over one file = simulated process restart; transcript/persona/author's note/summary versions/open branch resumed; wrong and missing keys fail closed",
      userPersona: "versioned (append-only, 32-version bound), bound to the authenticated seat inside the exact match binding",
      worldbook: "keyword/regex triggers across chat/persona/character/global tiers, bounded recursion (depth 2, engine max 4), priority-ordered insertion, per-entry provenance; firedAtDepth proven in the provider-facing assembly",
      layeredMemory: "transcript / rolling summary (editable, append-only rollback) / episodic facts / typed observed relationship state; context budgeting disclosed; no hidden chain-of-thought",
      branches: "swipe reroll + accept appends a NEW turn (accepted history hashes unchanged); edit-as-branch restricted to the user's own turns; kind validation fail-closed",
      authorsNote: "depth/frequency system-message injection proven at the exact position inside the captured provider request",
      importExportRestore: "schema-validated integrity-hashed exports; tamper, cross-seat and never-overwrite all rejected; zero credentials in exports",
      auditReplay: "hash-chained audit export independently verified by verifyCompanionAuditExport; replay candidates are evidence only, automatic promotion forbidden at both the service and HTTP boundary",
      permissionSurfaces: "human_vs_agent / human_vs_human / agent_vs_agent_observer / review_mode computed live; opponent-private denied everywhere; observer and review cannot speak; no Preview/Confirm/Apply",
      portraitPackages: "all six companions bound with receipt/hash-pinned presentation assets; six real-pixel browser proofs against committed 1254px keyframes",
      notImplemented: "third-party extension marketplace (out of scope by contract)",
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
      fixture: "two-seat legacy sample-state demo room (host player1 + guest player2, both human player seats); companion product module composed around injected in-memory persistence and a verifier-controlled deterministic provider responder; no hosted bot, no live agent, zero approved BYOK profiles; no real Provider",
      legacyAdapterInput: {
        path: path.relative(ROOT, LEGACY_ADAPTER_PATH),
        note: "read-only adapter input outside the workspace",
      },
      roomId: ROOM_ID,
      worktreeHead,
      backendModules,
      baseCommit: SLICE_266C_BASE_COMMIT,
      closureCommit: SLICE_266D_CLOSURE_COMMIT,
      scopeRule: "the integrated K3 closure is proven as a HEAD ancestor; backend drift is audited only across the fixed slice base-to-closure range so parallel mainline work is not attributed to K3; every loaded backend module is hash-recorded",
      stalePinFix: "CHARACTER_PACKAGE_HASH_PIN_STALE closed by the registry-derived binding contract (current epoch validates the exact sealed CharacterPackage/catalogue/handoff/visual manifest; legacy projections readable only through the explicit assertStarcraftTmgClientCharacterProjectionV2Legacy path) — proven live in the browser by the rendered Sarah Kerrigan identity",
    },
    boundaries: {
      currentProductCodeServed: true,
      backendModulesEditedOutsideSlice: false,
      realProviderCalls: 0,
      paidProviderUsed: false,
      fixtureProviderCalls: providerProbe.calls,
      fixtureProviderInterruptions: providerProbe.interruptions,
      sourceRefreshPerformed: false,
      roomMutationsByCompanionPath: 0,
      previewConfirmApplyAuthority: false,
      seatTokenPersistedByCompanionPath: false,
      opponentPrivateAccess: false,
      hiddenChainOfThoughtCollected: false,
      modelReplyFabricated: false,
      gameplayTruthComputedInUi: false,
      companionStateFabricated: false,
      fakePersistenceImplemented: "the in-memory persistence adapter is honestly declared volatile in the browser fixture; the durable path is proven separately in this same gate via two compositions over one encrypted SQLite file (simulated process restart) with fail-closed key handling",
      forceClickUsed: false,
      portraitPixelsProvenReal: true,
      sixCompanionPortraitPixelsProvenReal: true,
      durableProcessRestartResumeProven: true,
      extensionMarketplaceImplemented: false,
      trainingTruth: false,
    },
    elapsedSeconds: Math.round((Date.now() - started) / 100) / 10,
  };
  secrets.push(...liveSeatTokens);
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
