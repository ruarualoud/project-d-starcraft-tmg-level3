#!/usr/bin/env node

/**
 * Ticket 26 / Slice 266f — the user-authorized live BYOK companion
 * product acceptance (reserved in the 266f closure, explicitly authorized
 * by the user; the second-call repair authorization after the recorded
 * 64-unit truncation is epoch 2; the two-companion layered-memory
 * continuity acceptance is epoch 3).
 *
 * Hard rules enforced by this runner:
 *   - exactly ONE physical Provider call per authorization epoch (epochs 1
 *     and 2): a
 *     one-attempt dispatch lock (build/.../one-call-attempt.lock.json for
 *     epoch 1, one-call-attempt.second.lock.json for epoch 2, O_EXCL) is
 *     claimed immediately before the single egress dispatch; a previous
 *     lock or a previous passing report refuses any rerun (ambiguous
 *     outcomes need fresh user authorization). Epoch 2 additionally refuses
 *     unless epoch 1's lock AND failure report prove the exact recorded
 *     truncation context (LIVE_PROVIDER_RESPONSE_CONTRACT_REJECTED), so the
 *     slice-wide hard maximum is two physical calls, never more;
 *   - epoch 3 (the manifest's multi-companion memory-continuity
 *     acceptance) has a hard maximum of FOUR physical Provider calls (two
 *     companions x two user turns), each separately locked with its own
 *     O_EXCL dispatch lock claimed immediately before that call's single
 *     egress dispatch (continuity-call-1..4.lock.json), separately costed,
 *     zero automatic retry; epoch 3 refuses unless the epoch-1 and epoch-2
 *     locks AND the epoch-2 PASSED report prove the lineage, and any prior
 *     epoch-3 lock or passing report refuses a rerun;
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
 *   - the output budget is the GENERAL versioned contract
 *     (packages/companion-backend-module-v1/provider-output-budget-v1.mjs,
 *     companion_output_budget_v2: sealed-envelope units + bounded reply-text
 *     floor, character-agnostic); the egress profile used for the registry
 *     is derived from the pinned Ticket 16 profile with outputBudget as the
 *     ONLY delta (Provider infrastructure itself is never modified), and
 *     truncated output is classified/recovered through the same versioned
 *     contract instead of a generic contract rejection;
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

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import { mkdir, open, readFile, readdir, stat, writeFile } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { chromium } from "playwright";

import {
  classifyCompanionProviderOutputV1,
  resolveCompanionProviderOutputBudgetV1,
} from "../packages/companion-backend-module-v1/provider-output-budget-v1.mjs";

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
const REPORT_PATH_EPOCH2 = path.join(BUILD_ROOT, "live-report.second.json");
const LOCK_PATH_EPOCH2 = path.join(BUILD_ROOT, "one-call-attempt.second.lock.json");
const ROOM_ID = "ticket26-slice266f-live-byok-companion";
const AGENT_API_PREFIX = "/starcraft-tmg-level3/agent/api/v2";
const LEGACY_ADAPTER_PATH = path.join(PROJECT_D_ROOT, "scripts/starcraft-tmg-rules-v0.mjs");
const LIVE_COMPANION_PACKAGE_ID = "starcraft-tmg.companion.zagara";
const LIVE_USER_PROMPT = "Zagara，请用一句简短中文报告当前态势并给出下一步建议。";
// The versioned, character-agnostic output budget (companion_output_budget_v2):
// sealed-envelope units + bounded reply-text floor. It supersedes the flat
// 64-unit budget that truncated the first live call's sealed channel JSON.
const LIVE_ALLOWED_CHANNELS = Object.freeze(["companion_reply"]);
const LIVE_OUTPUT_BUDGET = resolveCompanionProviderOutputBudgetV1({
  allowedChannels: [...LIVE_ALLOWED_CHANNELS],
});
const FIRST_CALL_FLAGS = new Set(["--authorize-live-byok-companion-once"]);
const SECOND_CALL_FLAGS = new Set(["--authorize-live-byok-companion-second-call"]);
// Epoch 3: the manifest's two-companion layered-memory continuity
// acceptance. Hard maximum FOUR physical Provider calls (two companions x
// two user turns), each separately locked, separately costed, zero retry.
const CONTINUITY_CALL_FLAGS = new Set(["--authorize-live-byok-companion-memory-continuity"]);
const REPORT_PATH_EPOCH3 = path.join(BUILD_ROOT, "live-report.continuity.json");
const LOCK_PATHS_EPOCH3 = Object.freeze([1, 2, 3, 4]
  .map((index) => path.join(BUILD_ROOT, `continuity-call-${index}.lock.json`)));
const EVIDENCE_ROOT_EPOCH3 = path.join(EVIDENCE_ROOT, "epoch-3");
const CONTINUITY_SQLITE_PATH = path.join(BUILD_ROOT, "continuity", "companion-product.sqlite");
const CONTINUITY_MAX_PHYSICAL_CALLS = 4;
const CONTINUITY_PACKAGE_IDS = Object.freeze([
  "starcraft-tmg.companion.sarah_kerrigan",
  "starcraft-tmg.companion.zagara",
]);
// The distinctive public plan/fact written in turn 1 and recalled in turn 2.
const CONTINUITY_PLAN_CODEWORD = "霜刃-9";
const CONTINUITY_TURN1_PROMPT = "两位同伴，请记住并确认这个公开计划：行动代号「霜刃-9」——"
  + "黎明时分将两个Marine小队部署到北侧山脊隘口，Medic随行护航。请各自用一句中文回应。";
const CONTINUITY_TURN2_PROMPT = "两位同伴，请各自用一句中文回答：我上一轮公布的行动代号"
  + "「霜刃-9」的要点是什么？你打算如何执行它？";
const CONTINUITY_CHAT_WORLDBOOK_ENTRY = Object.freeze({
  entryId: "plan-frostblade-9",
  keyword: CONTINUITY_PLAN_CODEWORD,
  content: "公开计划（第1轮由指挥官公布）：行动代号「霜刃-9」；"
    + "黎明时分将两个Marine小队部署至北侧山脊隘口，Medic随行护航。",
});
const CONTINUITY_SUMMARY = "第1轮：指挥官公布公开行动代号「霜刃-9」——"
  + "黎明将两个Marine小队部署到北侧山脊隘口、Medic随行护航；Kerrigan与Zagara均已确认。";
const CONTINUITY_EPISODIC_FACT = "第1轮指挥官公布了行动代号「霜刃-9」的北侧山脊部署计划。";
const CONTINUITY_RELATIONSHIP_EVENT = Object.freeze({
  eventType: "personal_shared",
  deltas: Object.freeze([Object.freeze({ axis: "trust", delta: 1 })]),
  note: "指挥官向两位同伴公开了作战计划「霜刃-9」。",
});
const CONTINUITY_PLAN_DETAIL_KEYWORDS = Object.freeze([
  "山脊", "隘口", "Marine", "Medic", "黎明",
]);
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

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

function authorizedEpoch() {
  const flags = process.argv.slice(2);
  if (flags.length === 1 && FIRST_CALL_FLAGS.has(flags[0])) return 1;
  if (flags.length === 1 && SECOND_CALL_FLAGS.has(flags[0])) return 2;
  if (flags.length === 1 && CONTINUITY_CALL_FLAGS.has(flags[0])) return 3;
  return 0;
}

function epochPaths(epoch) {
  return epoch === 2
    ? {
      reportPath: REPORT_PATH_EPOCH2,
      lockPath: LOCK_PATH_EPOCH2,
      evidenceRoot: path.join(EVIDENCE_ROOT, "epoch-2"),
    }
    : { reportPath: REPORT_PATH, lockPath: LOCK_PATH, evidenceRoot: EVIDENCE_ROOT };
}

async function readReport(reportPath) {
  try {
    return JSON.parse(await readFile(reportPath, "utf8"));
  } catch {
    return null;
  }
}

async function priorSuccessExists(reportPath) {
  const report = await readReport(reportPath);
  return report?.status === "passed";
}

async function priorDispatchClaimExists(lockPath) {
  try {
    await readFile(lockPath);
    return true;
  } catch (error) {
    return error?.code !== "ENOENT";
  }
}

// Epoch 2 exists only as the user-authorized repair of the exact recorded
// first-call truncation. Prove that context (epoch-1 dispatch lock consumed +
// epoch-1 failure report with the contract-rejection code) before anything
// else; otherwise the dispatch is ambiguous and the run refuses.
async function assertSecondCallContext() {
  ensure(await priorDispatchClaimExists(LOCK_PATH),
    "LIVE_BYOK_SECOND_CALL_CONTEXT_MISSING", {
      note: "the epoch-1 dispatch lock must already be consumed",
    });
  const firstReport = await readReport(REPORT_PATH);
  ensure(firstReport && firstReport.status === "failed"
    && firstReport.failureCode === "LIVE_PROVIDER_RESPONSE_CONTRACT_REJECTED",
  "LIVE_BYOK_SECOND_CALL_CONTEXT_MISSING", {
    note: "epoch 2 is authorized only as the repair of the recorded epoch-1 truncation",
    firstReportStatus: firstReport?.status ?? null,
    firstReportFailureCode: firstReport?.failureCode ?? null,
  });
  return {
    lockPath: path.relative(ROOT, LOCK_PATH),
    reportPath: path.relative(ROOT, REPORT_PATH),
    failureCode: firstReport.failureCode,
    physicalProviderCalls: firstReport.physicalProviderCalls ?? null,
    outputUnits: firstReport.providerFailure?.receipt?.usage?.outputUnits ?? null,
  };
}

// Epoch 3 exists only as the manifest-authorized multi-companion
// memory-continuity acceptance continuing from the completed single-companion
// run: prove the epoch-1/epoch-2 dispatch locks are consumed and the epoch-2
// report PASSED before anything else; otherwise the dispatch is ambiguous and
// the run refuses.
async function assertContinuityCallContext() {
  for (const [label, lockPath] of [["epoch-1", LOCK_PATH], ["epoch-2", LOCK_PATH_EPOCH2]]) {
    ensure(await priorDispatchClaimExists(lockPath),
      "LIVE_BYOK_CONTINUITY_CONTEXT_MISSING", {
        note: `the ${label} dispatch lock must already be consumed`,
      });
  }
  const secondReport = await readReport(REPORT_PATH_EPOCH2);
  ensure(secondReport && secondReport.status === "passed",
    "LIVE_BYOK_CONTINUITY_CONTEXT_MISSING", {
      note: "epoch 3 is authorized only as the continuation of the PASSED epoch-2 single-companion acceptance",
      secondReportStatus: secondReport?.status ?? null,
    });
  return {
    epoch1Lock: path.relative(ROOT, LOCK_PATH),
    epoch2Lock: path.relative(ROOT, LOCK_PATH_EPOCH2),
    epoch2Report: path.relative(ROOT, REPORT_PATH_EPOCH2),
    epoch2Status: secondReport.status,
    epoch2PhysicalProviderCalls: secondReport.liveCall?.physicalAttempts ?? null,
  };
}

async function claimDispatchLock(runId, startedAt, lockPath = LOCK_PATH, epoch = 1, extra = {}) {
  await mkdir(BUILD_ROOT, { recursive: true, mode: 0o700 });
  let handle;
  try {
    handle = await open(lockPath, "wx", 0o600);
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
    attemptEpoch: epoch,
    physicalProviderCallBudget: 1,
    sliceHardMaximumPhysicalProviderCalls: epoch === 3
      ? 2 + CONTINUITY_MAX_PHYSICAL_CALLS
      : 2,
    ...clone(extra),
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
      allowedChannels: [...LIVE_ALLOWED_CHANNELS],
      decisionCandidateSource: "forbidden",
    },
    maxOutputUnits: LIVE_OUTPUT_BUDGET.maxOutputUnits,
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
    // Epoch 1/2 keep the default one-call denominator; the epoch-3
    // continuity acceptance passes 4 (two companions x two user turns).
    // Every dispatch is separately locked via claimDispatch(dispatchIndex).
    maxDispatches = 1,
  } = options;
  const observation = {
    dispatchAttempts: 0,
    physicalProviderCalls: 0,
    maxDispatches,
    success: null,
    failure: null,
    completions: [],
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
    if (observation.dispatchAttempts > maxDispatches) {
      observation.failure = { code: "LIVE_CALL_DENOMINATOR_EXCEEDED" };
      return rejection("LIVE_CALL_DENOMINATOR_EXCEEDED",
        `the ${maxDispatches}-call authorization was already consumed; no retry is ever attempted`);
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
    // immediately before the single physical egress attempt. The dispatch
    // index is passed so multi-call epochs lock each call separately.
    try {
      await claimDispatch(observation.dispatchAttempts);
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
    // Versioned output classification (companion_output_budget_v2): the
    // egress transport's generic providerTurn protocol is classified into a
    // typed outcome. A budget-truncated envelope whose channel text string is
    // fully terminated is recovered structurally (never fabricated); a
    // mid-string cut is a typed truncation failure with budget diagnostics.
    const classification = classifyCompanionProviderOutputV1(output, {
      allowedChannels: [...LIVE_ALLOWED_CHANNELS],
      budgetUnits: LIVE_OUTPUT_BUDGET.maxOutputUnits,
    });
    if (classification.kind === "output_budget_truncated") {
      // The physical call happened but the output budget cut the sealed
      // channel JSON before the channel text could complete: record the
      // typed truncation with its diagnostics and stop; never retry.
      observation.physicalProviderCalls += receipt?.physicalAttempts ?? 1;
      observation.failure = {
        code: "LIVE_PROVIDER_OUTPUT_BUDGET_TRUNCATED",
        classification: clone(classification),
        budget: clone(LIVE_OUTPUT_BUDGET),
        receipt: clone(receipt),
      };
      return rejection("LIVE_PROVIDER_OUTPUT_BUDGET_TRUNCATED",
        "the Provider reply was cut by the output budget before the sealed channel JSON completed; typed truncation recorded, zero retry");
    }
    if (classification.kind !== "channel_text") {
      // The physical call happened but the reply is not the contracted
      // channel JSON: record honestly and stop; never retry.
      observation.physicalProviderCalls += receipt?.physicalAttempts ?? 1;
      observation.failure = {
        code: "LIVE_PROVIDER_RESPONSE_CONTRACT_REJECTED",
        classification: clone(classification),
        receipt: clone(receipt),
      };
      return rejection("LIVE_PROVIDER_RESPONSE_CONTRACT_REJECTED",
        "the Provider reply did not match the sealed channel contract; recorded, not retried");
    }
    observation.physicalProviderCalls += receipt.physicalAttempts;
    const priced = priceUsage(receipt);
    const pricing = priced?.pricing || null;
    const replyText = classification.text;
    const completion = {
      dispatchIndex: observation.dispatchAttempts,
      receipt: clone(receipt),
      pricing: clone(pricing),
      pricingAuthoritative: priced?.authoritative === true,
      replyText,
      recoveredFromTruncatedEnvelope:
        classification.recoveredFromTruncatedEnvelope === true,
      classification: clone(classification),
    };
    observation.completions.push(completion);
    observation.success = completion;
    const reportedCostUnits = pricing ? pricing.calculatedCostNanoUsd : 0;
    usage.promptTokens += receipt.usage.inputUnits;
    usage.completionTokens += receipt.usage.outputUnits;
    usage.reportedCostUnits += reportedCostUnits;
    return Object.freeze({
      ok: true,
      response: {
        content: replyText,
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
        recoveredFromTruncatedEnvelope:
          classification.recoveredFromTruncatedEnvelope === true,
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
  const { providerAdapter, now, persistence, sharedRoom } = options;
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
  // Epoch 3 restart semantics: the match binding hash is tied to the room
  // authority's referee keying, so recomposing the room would be a DIFFERENT
  // match and the persisted conversation binding would (correctly) refuse it
  // as stale. The restart therefore tears down and recomposes the companion
  // server/session stack (HTTP listener, product module, session runtime,
  // SQLite connection) while the Room authority — a separate service — stays
  // up. `sharedRoom` carries the existing room across the restart.
  let roomRuntime;
  let roomFacade;
  let roomMutations;
  let hostSeatToken;
  if (sharedRoom) {
    ({ roomRuntime, roomFacade, roomMutations, hostSeatToken } = sharedRoom);
  } else {
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
  roomRuntime = createStarcraftTmgRoomRuntime({
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
  hostSeatToken = created.credentials.host.seatToken;

  // Mutation-counting facade: any Room mutation the companion path attempted
  // is counted and fails the run.
  roomMutations = Object.fromEntries(ROOM_MUTATION_METHODS.map((method) => [method, 0]));
  roomFacade = { ...roomRuntime };
  for (const method of ROOM_MUTATION_METHODS) {
    if (typeof roomFacade[method] !== "function") continue;
    const original = roomFacade[method];
    roomFacade[method] = async (...args) => {
      roomMutations[method] += 1;
      return original(...args);
    };
  }
  }

  const companionModule = createStarcraftTmgCompanionProductModuleV1({
    roomRuntime: roomFacade,
    persistence: persistence || createInMemoryPersistenceAdapter(),
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
    roomFacade,
    roomMutations,
    companionModule,
    persistence: persistence || null,
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

// Snapshot-rate estimate factory for the honestly-recorded case where the
// Provider reports a model outside the pinned pricing snapshot (drift first
// observed on the truncated epoch-1 call). Labelled estimateOnly, never an
// invoice. Module-level so every epoch shares the exact same arithmetic.
function createSnapshotRateEstimator({ pricingSnapshot, isPeakWindow }) {
  return function estimateUsageAtSnapshotRates(receipt) {
    try {
      const usage = receipt?.usage;
      if (!object(usage) || !Number.isSafeInteger(usage.inputUnits)
        || !Number.isSafeInteger(usage.outputUnits)
        || !Number.isSafeInteger(usage.inputCacheHitUnits)
        || !Number.isSafeInteger(usage.inputCacheMissUnits)
        || usage.inputCacheHitUnits + usage.inputCacheMissUnits !== usage.inputUnits) {
        return null;
      }
      const peak = isPeakWindow(receipt.startedAt);
      const rates = peak
        ? pricingSnapshot.ratesPerTokenNanoUsd.peak
        : pricingSnapshot.ratesPerTokenNanoUsd.offPeak;
      const calculatedCostNanoUsd = usage.inputCacheHitUnits * rates.inputCacheHit
        + usage.inputCacheMissUnits * rates.inputCacheMiss
        + usage.outputUnits * rates.output;
      const whole = Math.floor(calculatedCostNanoUsd / 1_000_000_000);
      const fractional = String(calculatedCostNanoUsd % 1_000_000_000)
        .padStart(9, "0").replace(/0+$/u, "") || "0";
      return {
        schemaVersion: "starcraft_tmg_ticket_26_slice_266f_cost_estimate_v1",
        estimateOnly: true,
        authoritative: false,
        reason: "reported_model_drift_outside_pricing_snapshot",
        snapshotHash: pricingSnapshot.snapshotHash,
        pricingWindow: peak ? "peak" : "off_peak",
        ratesPerTokenNanoUsd: clone(rates),
        usage: clone(usage),
        calculatedCostNanoUsd,
        calculatedCostUsd: `${whole}.${fractional}`,
        providerInvoiceAuthoritative: true,
        calculatedCostIsInvoice: false,
        trainingTruth: false,
      };
    } catch {
      return null; // cost honestly unknown; usage units still recorded
    }
  };
}

async function writeFailureReport(runId, startedAt, code, extra = {}, reportPath = REPORT_PATH) {
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
  await writeFile(reportPath, `${JSON.stringify({
    ...body,
    reportHash: createHash("sha256").update(JSON.stringify(body)).digest("hex"),
  }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
}

async function main() {
  const epoch = authorizedEpoch();
  if (!epoch) {
    console.error("LIVE_BYOK_COMPANION_EXPLICIT_AUTHORIZATION_REQUIRED");
    process.exitCode = 2;
    return;
  }
  if (epoch === 3) {
    await mainContinuity();
    return;
  }
  const { reportPath, lockPath, evidenceRoot } = epochPaths(epoch);
  if (await priorSuccessExists(reportPath)) {
    console.error("LIVE_BYOK_COMPANION_SUCCESS_ALREADY_RECORDED");
    process.exitCode = 2;
    return;
  }
  if (await priorDispatchClaimExists(lockPath)) {
    console.error("LIVE_PROVIDER_ATTEMPT_ALREADY_CLAIMED");
    process.exitCode = 2;
    return;
  }
  // Epoch 2 is only the authorized repair of the recorded epoch-1
  // truncation; prove that context before anything else.
  const previousAttempt = epoch === 2 ? await assertSecondCallContext() : null;

  const runId = randomUUID();
  const startedAt = new Date().toISOString();
  await mkdir(evidenceRoot, { recursive: true });

  const { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } =
    await import(pathToFileURL(path.join(ROOT, "packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs")).href);
  const { createStarcraftTmgProviderEgressWorkerPortV1 } =
    await import(pathToFileURL(path.join(ROOT, "packages/secure-provider-runtime/provider-egress-worker-port-v1.mjs")).href);
  const { createStarcraftTmgProviderProfileRegistryV1 } =
    await import(pathToFileURL(path.join(ROOT, "packages/secure-provider-runtime/provider-profile-registry-v1.mjs")).href);
  const {
    priceStarcraftTmgDeepSeekV4FlashUsageV1,
    verifyStarcraftTmgProviderPricingReceiptV1,
    isStarcraftTmgDeepSeekPeakWindowV1,
    STARCRAFT_TMG_DEEPSEEK_V4_FLASH_PRICING_SNAPSHOT_V1: pricingSnapshot,
  } = await import(pathToFileURL(path.join(ROOT, "packages/secure-provider-runtime/provider-pricing-v1.mjs")).href);
  const { STARCRAFT_TMG_TICKET_16_LIVE_PROVIDER_PROFILE_V1: providerProfile } =
    await import(pathToFileURL(path.join(ROOT, "content/provider/ticket-16-live-provider-closure-v1.mjs")).href);
  const { createProviderProfile } =
    await import(pathToFileURL(path.join(ROOT, "packages/character-agent/contracts-v1.mjs")).href);
  const { containsStarcraftTmgOnlineCredentialMaterialV1 } =
    await import(pathToFileURL(path.join(ROOT, "packages/online-agent-session/portable-credential-material-v1.mjs")).href);
  const { hashStarcraftTmgContract } =
    await import(pathToFileURL(path.join(ROOT, "packages/authoritative-engine/referee-crypto-v1.mjs")).href);
  const { hashStarcraftTmgClientContract } =
    await import(pathToFileURL(path.join(ROOT, "packages/client-domain/portable-contract-hash-v1.mjs")).href);

  const webExport = await assertFreshWebExport();

  // ── Acceptance egress profile: derived from the pinned Ticket 16 profile
  // through the SAME sealed profile factory, with outputBudget as the ONLY
  // delta (the versioned companion_output_budget_v2 resolution). No Provider
  // infrastructure file is modified; the derivation is recorded in the
  // report with both profile hashes.
  const acceptanceProfile = createProviderProfile({
    providerProfileId: `${providerProfile.providerProfileId}.266f-acceptance-budget-v2`,
    version: `${providerProfile.version}.266f-output-budget-v2`,
    provider: providerProfile.provider,
    baseUrl: providerProfile.baseUrl,
    model: providerProfile.model,
    thinkingMode: providerProfile.thinkingMode,
    reasoningEffort: providerProfile.reasoningEffort,
    temperature: providerProfile.temperature,
    topP: providerProfile.topP,
    contextBudget: providerProfile.contextBudget,
    outputBudget: LIVE_OUTPUT_BUDGET.maxOutputUnits,
    toolSupport: providerProfile.toolSupport,
    timeoutMs: providerProfile.timeoutMs,
    retryPolicy: clone(providerProfile.retryPolicy),
    fallbackPolicy: providerProfile.fallbackPolicy,
    extensions: clone(providerProfile.extensions || {}),
  });

  // Snapshot-rate estimate for the honestly-recorded case where the Provider
  // reports a model outside the pinned pricing snapshot (drift first observed
  // on the truncated epoch-1 call). Labelled estimateOnly, never an invoice.
  const estimateUsageAtSnapshotRates = createSnapshotRateEstimator({
    pricingSnapshot,
    isPeakWindow: isStarcraftTmgDeepSeekPeakWindowV1,
  });

  // ── Keychain → isolated Worker (the ONLY credential path) ─────────────
  const registry = createStarcraftTmgProviderProfileRegistryV1({
    entries: [{ providerProfile: acceptanceProfile, completionPath: "/chat/completions" }],
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
    const filename = path.join(evidenceRoot, name);
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
      providerProfile: acceptanceProfile,
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
      claimDispatch: () => claimDispatchLock(runId, startedAt, lockPath, epoch),
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
          return {
            pricing,
            authoritative: verifyStarcraftTmgProviderPricingReceiptV1(pricing),
          };
        } catch {
          // Reported-model drift places the call outside the pinned pricing
          // snapshot: degrade to an explicitly-labelled snapshot-rate
          // estimate (never an invoice); usage units are still recorded.
          const estimate = estimateUsageAtSnapshotRates(receipt);
          return estimate ? { pricing: estimate, authoritative: false } : null;
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
    const chatSectionButton = page.getByRole("button", { name: /Companion group chat/iu });
    if (await page.getByTestId("companion-chat-section").count() === 0) {
      await chatSectionButton.focus();
      await page.keyboard.press("Enter");
    }
    const chat = page.getByTestId("companion-chat-section");
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

    // ONE bounded Chinese prompt → the single physical Provider call. The
    // server POST response is captured for the grounding proof (worldbook
    // firing, assembly hash, byte-exact server↔adapter reply).
    const turnResponsePromise = page.waitForResponse(
      (response) => response.request().method() === "POST"
        && /\/conversations\/[^/]+\/turns$/u.test(new URL(response.url()).pathname),
      { timeout: 150_000 },
    );
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
    const turnEnvelope = await turnResponsePromise
      .then((response) => response.json())
      .catch(() => null);
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
    // The egress must request the pinned model. A Provider-REPORTED model
    // drift (first observed on the truncated epoch-1 call) is recorded
    // honestly and degrades pricing to a labelled snapshot-rate estimate; it
    // is a Provider-side reporting fact, not a product-path failure.
    ensure(adapter.observation.success.receipt.requestedModel === providerProfile.model,
    "LIVE_PROVIDER_REQUESTED_MODEL_DRIFT", {
      requested: adapter.observation.success.receipt.requestedModel,
    });
    const modelReportingDrift = adapter.observation.success.receipt.reportedModel
      === providerProfile.model ? null : {
        requestedModel: adapter.observation.success.receipt.requestedModel,
        reportedModel: adapter.observation.success.receipt.reportedModel,
        pricingAuthoritative: false,
        note: "Provider-reported model differs from the pinned requested model; recorded honestly (first observed on the truncated epoch-1 call); pricing is a snapshot-rate estimate, not an invoice",
      };

    // The rendered transcript byte-matches the ACTUAL Provider response, and
    // the server-side turn proves persona/worldbook/memory grounding.
    const renderedReply = await replyMessage.innerText();
    const actualReply = adapter.observation.success.replyText;
    ensure(renderedReply.includes(actualReply),
      "RENDERED_REPLY_NOT_ACTUAL_PROVIDER_RESPONSE", {
        rendered: renderedReply.slice(0, 400),
        actual: actualReply.slice(0, 400),
      });
    replyRenderedMatch = true;
    ensure(/[㐀-鿿]/u.test(actualReply),
      "LIVE_REPLY_NOT_CHINESE", { actual: actualReply.slice(0, 200) });
    const serverReply = turnEnvelope?.result?.replies?.[0] || null;
    ensure(serverReply && serverReply.content === actualReply,
      "SERVER_REPLY_NOT_ACTUAL_PROVIDER_RESPONSE", {
        server: String(serverReply?.content || "").slice(0, 400),
        actual: actualReply.slice(0, 400),
      });
    const worldbookFired = Array.isArray(serverReply.contextAssembly?.worldbookFired)
      ? clone(serverReply.contextAssembly.worldbookFired) : [];
    ensure(worldbookFired.some((entry) => entry.scopeTier === "character"),
      "LIVE_WORLDBOOK_NOT_FIRED", { worldbookFired });
    const grounding = {
      replyContainsCjk: true,
      serverReplyByteMatchAdapter: true,
      contextAssemblyHash: serverReply.contextAssembly?.assemblyHash ?? null,
      layersIncluded: clone(serverReply.contextAssembly?.layersIncluded) || [],
      worldbookFired,
      authorsNoteInjected: clone(serverReply.authorsNoteInjected) ?? null,
      recoveredFromTruncatedEnvelope:
        adapter.observation.success.recoveredFromTruncatedEnvelope === true,
    };
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
      await narrowPage.getByRole("button", { name: /Companion group chat/iu }).tap();
    }
    const narrowChat = narrowPage.getByTestId("companion-chat-section");
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
      attemptEpoch: epoch,
      previousAttempt: clone(previousAttempt),
      userAuthorization: {
        explicitFlag: epoch === 2
          ? "--authorize-live-byok-companion-second-call"
          : "--authorize-live-byok-companion-once",
        manifest: "ticket-26-slice-266f-companion-live-product-acceptance",
        hardMaximumPhysicalProviderCalls: 1,
        sliceHardMaximumPhysicalProviderCalls: 2,
      },
      outputBudgetContract: clone(LIVE_OUTPUT_BUDGET),
      acceptanceProfile: {
        note: "derived through the sealed createProviderProfile factory with outputBudget as the ONLY delta; no Provider infrastructure file modified",
        derivedFromTicket16Profile: {
          id: providerProfile.providerProfileId,
          version: providerProfile.version,
          hash: providerProfile.integrity.hash,
          outputBudget: providerProfile.outputBudget,
        },
        providerProfileRef: clone(receipt.providerProfileRef),
        outputBudget: acceptanceProfile.outputBudget,
      },
      modelReportingDrift: clone(modelReportingDrift),
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
        pricingAuthoritative: adapter.observation.success.pricingAuthoritative === true,
        recoveredFromTruncatedEnvelope:
          adapter.observation.success.recoveredFromTruncatedEnvelope === true,
        outputClassification: clone(adapter.observation.success.classification),
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
        grounding: clone(grounding),
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
    await writeFile(reportPath, `${JSON.stringify({
      ...reportBody,
      reportHash: createHash("sha256").update(serialized).digest("hex"),
    }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    console.log(JSON.stringify({
      ok: true,
      epoch,
      model: receipt.reportedModel,
      modelReportingDrift: modelReportingDrift !== null,
      inputUnits: receipt.usage.inputUnits,
      outputUnits: receipt.usage.outputUnits,
      calculatedCostUsd: pricing?.calculatedCostUsd ?? null,
      pricingAuthoritative: adapter.observation.success.pricingAuthoritative === true,
      physicalAttempts: receipt.physicalAttempts,
      detached: true,
      report: path.relative(ROOT, reportPath),
    }, null, 2));
  } catch (error) {
    const providerCode = String(adapter?.observation?.failure?.code || "");
    const thrownCode = String(error?.code || "");
    const code = /^[A-Z][A-Z0-9_]{2,79}$/u.test(providerCode)
      && ["PROVIDER_AUTHENTICATION_FAILED", "PROVIDER_PAYMENT_REQUIRED",
        "PROVIDER_WORKER_NOT_ATTACHED", "LIVE_PROVIDER_ATTEMPT_ALREADY_CLAIMED",
        "LIVE_CALL_DENOMINATOR_EXCEEDED",
        "LIVE_PROVIDER_OUTPUT_BUDGET_TRUNCATED",
        "LIVE_PROVIDER_RESPONSE_CONTRACT_REJECTED"].includes(providerCode)
      ? providerCode
      : /^[A-Z][A-Z0-9_]{2,79}$/u.test(thrownCode)
        ? thrownCode
        : "LIVE_BYOK_COMPANION_RUN_FAILED";
    await writeFailureReport(runId, startedAt, code, {
      attemptEpoch: epoch,
      providerFailure: clone(adapter?.observation?.failure || null),
      providerDispatchAttempts: adapter?.observation?.dispatchAttempts ?? 0,
      physicalProviderCalls: adapter?.observation?.physicalProviderCalls ?? 0,
      conversationId,
      screenshots,
      // Redaction-checked local error message for diagnosability; never a
      // credential carrier (anything credential-shaped is replaced).
      errorMessage: (() => {
        const message = String(error?.message || "").slice(0, 500);
        return containsStarcraftTmgOnlineCredentialMaterialV1(message)
          ? "[redacted: credential-shaped]" : message;
      })(),
    }, reportPath).catch(() => {});
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

// ── Epoch 3: two-companion layered-memory continuity (manifest extension) ──
// One bounded real Chinese two-companion conversation over the durable SQLite
// adapter: turn 1 obtains both companion replies and writes a distinctive
// public plan/fact plus summary/episodic/relationship evidence; the companion
// server/session stack is then CHECKPOINTED and FULLY RESTARTED (HTTP server
// closed, SQLite connection closed, every module/session-runtime structure
// discarded and recomposed — the sealed SQLite file is the only companion
// state carrier; the Room authority is a separate service and stays up, since
// its match binding is referee-keyed and a re-keyed room would be a different
// match); turn 2 asks both companions to recall and apply the plan. Hard
// maximum FOUR physical Provider calls, each separately locked, separately
// costed, zero automatic retry. Stop immediately on 401/402/403, missing
// secure attachment or ambiguous dispatch.

async function mainContinuity() {
  if (await priorSuccessExists(REPORT_PATH_EPOCH3)) {
    console.error("LIVE_BYOK_COMPANION_SUCCESS_ALREADY_RECORDED");
    process.exitCode = 2;
    return;
  }
  for (const lockPath of LOCK_PATHS_EPOCH3) {
    if (await priorDispatchClaimExists(lockPath)) {
      console.error("LIVE_PROVIDER_ATTEMPT_ALREADY_CLAIMED");
      process.exitCode = 2;
      return;
    }
  }
  // Epoch 3 continues the completed single-companion acceptance; prove the
  // lineage before anything else.
  const previousEpochs = await assertContinuityCallContext();

  const runId = randomUUID();
  const startedAt = new Date().toISOString();
  await mkdir(EVIDENCE_ROOT_EPOCH3, { recursive: true });
  await mkdir(path.dirname(CONTINUITY_SQLITE_PATH), { recursive: true });

  const { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } =
    await import(pathToFileURL(path.join(ROOT, "packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs")).href);
  const { createStarcraftTmgProviderEgressWorkerPortV1 } =
    await import(pathToFileURL(path.join(ROOT, "packages/secure-provider-runtime/provider-egress-worker-port-v1.mjs")).href);
  const { createStarcraftTmgProviderProfileRegistryV1 } =
    await import(pathToFileURL(path.join(ROOT, "packages/secure-provider-runtime/provider-profile-registry-v1.mjs")).href);
  const {
    priceStarcraftTmgDeepSeekV4FlashUsageV1,
    verifyStarcraftTmgProviderPricingReceiptV1,
    isStarcraftTmgDeepSeekPeakWindowV1,
    STARCRAFT_TMG_DEEPSEEK_V4_FLASH_PRICING_SNAPSHOT_V1: pricingSnapshot,
  } = await import(pathToFileURL(path.join(ROOT, "packages/secure-provider-runtime/provider-pricing-v1.mjs")).href);
  const { STARCRAFT_TMG_TICKET_16_LIVE_PROVIDER_PROFILE_V1: providerProfile } =
    await import(pathToFileURL(path.join(ROOT, "content/provider/ticket-16-live-provider-closure-v1.mjs")).href);
  const { createProviderProfile } =
    await import(pathToFileURL(path.join(ROOT, "packages/character-agent/contracts-v1.mjs")).href);
  const { containsStarcraftTmgOnlineCredentialMaterialV1 } =
    await import(pathToFileURL(path.join(ROOT, "packages/online-agent-session/portable-credential-material-v1.mjs")).href);
  const { hashStarcraftTmgClientContract } =
    await import(pathToFileURL(path.join(ROOT, "packages/client-domain/portable-contract-hash-v1.mjs")).href);
  const { createStarcraftTmgCompanionProductPersistenceV1 } =
    await import(pathToFileURL(path.join(ROOT, "packages/product-composition/index.mjs")).href);

  const webExport = await assertFreshWebExport();

  // Same acceptance egress profile as epoch 2: derived from the pinned
  // Ticket 16 profile through the SAME sealed factory with outputBudget as
  // the ONLY delta (companion_output_budget_v2). No Provider infrastructure
  // file is modified.
  const acceptanceProfile = createProviderProfile({
    providerProfileId: `${providerProfile.providerProfileId}.266f-acceptance-budget-v2`,
    version: `${providerProfile.version}.266f-output-budget-v2`,
    provider: providerProfile.provider,
    baseUrl: providerProfile.baseUrl,
    model: providerProfile.model,
    thinkingMode: providerProfile.thinkingMode,
    reasoningEffort: providerProfile.reasoningEffort,
    temperature: providerProfile.temperature,
    topP: providerProfile.topP,
    contextBudget: providerProfile.contextBudget,
    outputBudget: LIVE_OUTPUT_BUDGET.maxOutputUnits,
    toolSupport: providerProfile.toolSupport,
    timeoutMs: providerProfile.timeoutMs,
    retryPolicy: clone(providerProfile.retryPolicy),
    fallbackPolicy: providerProfile.fallbackPolicy,
    extensions: clone(providerProfile.extensions || {}),
  });
  const estimateUsageAtSnapshotRates = createSnapshotRateEstimator({
    pricingSnapshot,
    isPeakWindow: isStarcraftTmgDeepSeekPeakWindowV1,
  });

  const registry = createStarcraftTmgProviderProfileRegistryV1({
    entries: [{ providerProfile: acceptanceProfile, completionPath: "/chat/completions" }],
    allowedProviders: ["deepseek-openai-compatible-direct"],
  });
  const workerPort = createStarcraftTmgProviderEgressWorkerPortV1({
    providerProfileRegistry: registry,
    maxWorkers: 1,
    maxOutputBytes: 64 * 1024,
    handshakeTimeoutMs: 5_000,
    shutdownGraceMs: 1_000,
  });

  // Local durable-store encryption key: random per run, held only in this
  // process's memory, never written to the report or any file. It is NOT the
  // Provider credential; the SQLite artifact itself is recorded by hash.
  const sqliteKey = randomBytes(32).toString("base64");
  const createPersistence = () => createStarcraftTmgCompanionProductPersistenceV1({
    kind: "sqlite",
    filename: CONTINUITY_SQLITE_PATH,
    encryption: { key: sqliteKey },
  });

  let credentialBytes = null;
  let keychainReceipt = null;
  let workerRef = null;
  let detachProof = null;
  let stackA = null;
  let stackB = null;
  let persistenceA = null;
  let persistenceB = null;
  let adapter = null;
  let browser = null;
  const browserErrors = [];
  const artifacts = [];
  const screenshots = [];
  let conversationId = null;
  let stateRevisionBefore = null;
  const continuity = {
    turn1: null,
    turn2: null,
    memoryWrites: null,
    memoryAfterWrites: null,
    restart: null,
    accounting: null,
  };

  async function capture(page, name, explanation) {
    const filename = path.join(EVIDENCE_ROOT_EPOCH3, name);
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

  const okResult = (envelope, code) => {
    ensure(envelope?.result?.ok === true, code, { result: envelope?.result });
    return envelope.result;
  };

  // A turn sent through the REAL browser UI: mention Kerrigan first so the
  // deterministic speaker order is Kerrigan → Zagara; race the final
  // companion message against the explicit interrupted card; capture the
  // server POST envelope for grounding provenance.
  async function sendTurnViaUi(page, chat, prompt, finalMessageTestId, turnLabel) {
    const turnResponsePromise = page.waitForResponse(
      (response) => response.request().method() === "POST"
        && /\/conversations\/[^/]+\/turns$/u.test(new URL(response.url()).pathname),
      { timeout: 300_000 },
    );
    await chat.getByTestId("companion-chat-mention-sarah_kerrigan").click();
    await chat.getByTestId("companion-chat-input").fill(prompt);
    await chat.getByTestId("companion-chat-send").click();
    const finalMessage = chat.getByTestId(finalMessageTestId);
    const interrupted = chat.getByTestId("companion-chat-interrupted");
    const outcome = await Promise.race([
      finalMessage.waitFor({ timeout: 300_000 }).then(() => "replied", () => null),
      interrupted.waitFor({ timeout: 300_000 }).then(() => "interrupted", () => null),
    ]);
    ensure(outcome === "replied" || outcome === "interrupted",
      "LIVE_TURN_OUTCOME_TIMEOUT", { turnLabel, observation: clone(adapter.observation.failure) });
    const turnEnvelope = await turnResponsePromise
      .then((response) => response.json())
      .catch(() => null);
    if (outcome === "interrupted") {
      const interruptText = await interrupted.innerText();
      await capture(page, `live-failure-${turnLabel}-interrupted.png`,
        `The ${turnLabel} Provider call failed; the explicit interrupted card rendered, accepted history preserved, zero retry attempted.`);
      throw Object.assign(new Error("LIVE_PROVIDER_TURN_FAILED"), {
        code: "LIVE_PROVIDER_TURN_FAILED",
        providerFailure: clone(adapter.observation.failure),
        interruptText: interruptText.slice(0, 600),
      });
    }
    return turnEnvelope;
  }

  // Prove one completed turn end-to-end: two new adapter completions, each a
  // single physical attempt with zero retries; deterministic speaker order;
  // rendered messages byte-match the ACTUAL Provider outputs; server replies
  // byte-match the adapter record; both replies are actual Chinese.
  async function proveTurnReplies(page, chat, turnEnvelope, {
    turnLabel, companions, completionsBefore, messageIndexBase,
  }) {
    const completions = adapter.observation.completions;
    ensure(completions.length === completionsBefore + 2
      && adapter.observation.dispatchAttempts === completionsBefore + 2
      && adapter.observation.physicalProviderCalls === completionsBefore + 2,
    "LIVE_PROVIDER_ATTEMPT_DENOMINATOR_DRIFT", {
      turnLabel,
      dispatchAttempts: adapter.observation.dispatchAttempts,
      physicalProviderCalls: adapter.observation.physicalProviderCalls,
      completions: completions.length,
    });
    const pair = completions.slice(completionsBefore);
    for (const [index, completion] of pair.entries()) {
      ensure(completion.receipt.physicalAttempts === 1
        && completion.receipt.automaticRetries === 0,
      "LIVE_PROVIDER_ATTEMPT_DENOMINATOR_DRIFT", { turnLabel, index });
      ensure(completion.receipt.requestedModel === providerProfile.model,
        "LIVE_PROVIDER_REQUESTED_MODEL_DRIFT", {
          requested: completion.receipt.requestedModel,
        });
      ensure(/[㐀-鿿]/u.test(completion.replyText),
        "LIVE_REPLY_NOT_CHINESE", { turnLabel, index, actual: completion.replyText.slice(0, 200) });
    }
    const replies = turnEnvelope?.result?.replies || [];
    ensure(replies.length === 2, "LIVE_TURN_REPLY_COUNT_WRONG", { turnLabel, count: replies.length });
    // Deterministic speaker order: Kerrigan (first selected package) answers
    // first, Zagara second — matching both the bound companion order and the
    // adapter dispatch order.
    ensure(replies[0].participantId === companions[0].participantId
      && replies[1].participantId === companions[1].participantId,
    "SPEAKER_ORDER_NOT_DETERMINISTIC", {
      turnLabel,
      replies: replies.map((reply) => reply.participantId),
      expected: companions.map((companion) => companion.participantId),
    });
    for (const [index, reply] of replies.entries()) {
      ensure(reply.content === pair[index].replyText,
        "SERVER_REPLY_NOT_ACTUAL_PROVIDER_RESPONSE", {
          turnLabel,
          index,
          server: String(reply.content || "").slice(0, 400),
          actual: pair[index].replyText.slice(0, 400),
        });
      const rendered = await chat.getByTestId(`companion-chat-message-${messageIndexBase + index + 1}`).innerText();
      ensure(rendered.includes(pair[index].replyText),
        "RENDERED_REPLY_NOT_ACTUAL_PROVIDER_RESPONSE", {
          turnLabel,
          index,
          rendered: rendered.slice(0, 400),
          actual: pair[index].replyText.slice(0, 400),
        });
    }
    return { replies, pair };
  }

  try {
    // Keychain read (attested /usr/bin/security binary, empty environment,
    // no shell, secret never in arguments/environment; the module zeroes its
    // own stdout buffer). Identical secure path as epochs 1–2.
    const ingress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
    credentialBytes = ingress.credentialBytes;
    keychainReceipt = ingress.receipt;
    ensure(keychainReceipt.secretInArguments === false
      && keychainReceipt.secretInEnvironment === false
      && keychainReceipt.secretPersistedByRunner === false,
    "KEYCHAIN_INGRESS_RECEIPT_UNSAFE");

    const attachmentId = `att-266f-continuity-${runId}`;
    const attached = await workerPort.attachCredential({
      attachmentId,
      providerProfile: acceptanceProfile,
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
      maxDispatches: CONTINUITY_MAX_PHYSICAL_CALLS,
      // Each of the four calls is separately locked (O_EXCL) immediately
      // before its single egress dispatch.
      claimDispatch: (dispatchIndex) => claimDispatchLock(runId, startedAt,
        LOCK_PATHS_EPOCH3[dispatchIndex - 1], 3, { callIndex: dispatchIndex }),
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
          return {
            pricing,
            authoritative: verifyStarcraftTmgProviderPricingReceiptV1(pricing),
          };
        } catch {
          // Reported-model drift places the call outside the pinned pricing
          // snapshot: degrade to an explicitly-labelled snapshot-rate
          // estimate (never an invoice); usage units are still recorded.
          const estimate = estimateUsageAtSnapshotRates(receipt);
          return estimate ? { pricing: estimate, authoritative: false } : null;
        }
      },
    });

    // ── Stack A: durable-SQLite-backed companion server/session ─────────
    persistenceA = createPersistence();
    stackA = await composeLiveCompanionStack({ providerAdapter: adapter, persistence: persistenceA });
    const roomBefore = await stackA.roomRuntime.readRoom({
      roomId: ROOM_ID,
      seatToken: stackA.hostSeatToken,
    });
    ensure(roomBefore?.ok, "ROOM_READ_BEFORE_FAILED");
    stateRevisionBefore = roomBefore.projection.room.stateRevision;
    const matchBindingHashA = roomBefore.projection.matchBinding?.bindingHash ?? null;

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

    const openSheetAndChat = async (page) => {
      const dock = page.getByTestId("tactical-adjutant-floating-dock");
      const toggle = dock.getByRole("button", { name: /TACTICAL COMMS/iu });
      await toggle.focus();
      await page.keyboard.press("Enter");
      await page.getByTestId("companion-focus-sheet").waitFor({ timeout: 60_000 });
      if (await page.getByTestId("companion-chat-section").count() === 0) {
        const chatSectionButton = page.getByRole("button", { name: /Companion group chat/iu });
        await chatSectionButton.focus();
        await page.keyboard.press("Enter");
      }
      const chat = page.getByTestId("companion-chat-section");
      await chat.getByTestId("companion-chat-provider-status").waitFor({ timeout: 60_000 });
      return chat;
    };

    // ── Desktop A: open the TWO-companion session (both sealed packages) ──
    const hostRecovery1 = await stackA.issueRecovery(stackA.hostSeatToken);
    const desktopA = await browser.newContext({
      viewport: { width: 1500, height: 1050 },
      locale: "en-US",
      reducedMotion: "reduce",
    });
    await seedPreferences(desktopA);
    const pageA = await desktopA.newPage();
    watch(pageA, "desktopA");
    await pageA.goto(
      `${stackA.origin}/room/${encodeURIComponent(ROOM_ID)}#recovery=${encodeURIComponent(hostRecovery1)}`,
      { waitUntil: "domcontentloaded", timeout: 120_000 },
    );
    await waitBody(pageA, "Authoritative room connected", 120_000);
    await waitBody(pageA, "TACTICAL COMMS", 120_000);
    const chatA = await openSheetAndChat(pageA);
    const providerStatusText = await chatA.getByTestId("companion-chat-provider-status").innerText();
    ensure(/injected Provider port/iu.test(providerStatusText)
      && providerStatusText.includes(`declared network ${LIVE_ADAPTER_NETWORK}`),
    "LIVE_PROVIDER_STATUS_NOT_HONEST", { providerStatusText });

    // Both sealed packages: Kerrigan is the default selection; add Zagara.
    await chatA.getByTestId("companion-chat-select-zagara").waitFor({ timeout: 30_000 });
    await chatA.getByTestId("companion-chat-select-zagara").click();
    await chatA.getByTestId("companion-chat-open").click();
    await chatA.getByTestId("companion-chat-conversation-meta").waitFor({ timeout: 60_000 });
    const meta0 = await chatA.getByTestId("companion-chat-conversation-meta").innerText();
    conversationId = meta0.match(/conversation:\s*(\S+)/u)?.[1];
    ensure(conversationId, "CONVERSATION_ID_NOT_RENDERED", { meta0 });
    const orderText = await chatA.getByTestId("companion-chat-speaker-order").innerText();
    ensure(orderText.indexOf("Sarah Kerrigan") > -1
      && orderText.indexOf("Sarah Kerrigan") < orderText.indexOf("Zagara"),
    "SPEAKER_ORDER_NOT_DETERMINISTIC", { orderText });

    // Pre-send denominator proof: exactly two companions bound, zero calls.
    const preSend = await stackA.companionFetch(
      `conversations/${encodeURIComponent(conversationId)}?roomId=${encodeURIComponent(ROOM_ID)}`,
      { seatToken: stackA.hostSeatToken },
    );
    const preSendResult = okResult(preSend, "PRE_SEND_READ_FAILED");
    ensure(preSendResult.companions?.length === 2
      && preSendResult.companions[0]?.packageRef?.id === CONTINUITY_PACKAGE_IDS[0]
      && preSendResult.companions[1]?.packageRef?.id === CONTINUITY_PACKAGE_IDS[1],
    "LIVE_CONVERSATION_NOT_EXACTLY_TWO_COMPANIONS", {
      companions: preSendResult.companions?.map((entry) => entry.packageRef?.id),
    });
    ensure(preSendResult.providerAccounting?.calls === 0,
      "PROVIDER_CALL_BEFORE_SEND", { accounting: preSendResult.providerAccounting });
    const companions = clone(preSendResult.companions);
    await capture(pageA, "live-01-desktop-two-companion-session-open.png",
      "Desktop 1500×1050: two-companion (Kerrigan + Zagara, both sealed packages) live BYOK session open through the real product path over durable SQLite; zero Provider calls so far; deterministic speaker order rendered.");

    // ── Turn 1 (physical calls 1–2): the distinctive public plan/fact ────
    const turn1Envelope = await sendTurnViaUi(pageA, chatA,
      CONTINUITY_TURN1_PROMPT, "companion-chat-message-3", "turn-1");
    const turn1 = await proveTurnReplies(pageA, chatA, turn1Envelope, {
      turnLabel: "turn-1",
      companions,
      completionsBefore: 0,
      messageIndexBase: 1,
    });
    const messageCount1 = await chatA.locator('[data-testid^="companion-chat-message-"]').count();
    ensure(messageCount1 === 3, "LIVE_MESSAGE_COUNT_WRONG", { turnLabel: "turn-1", messageCount1 });
    // Worldbook grounding, turn 1: Zagara's three sealed character-tier
    // entries fire only on her assembly; Kerrigan honestly has none.
    const turn1KerriganCharacter = (turn1.replies[0].contextAssembly?.worldbookFired || [])
      .filter((entry) => entry.scopeTier === "character");
    const turn1ZagaraCharacter = (turn1.replies[1].contextAssembly?.worldbookFired || [])
      .filter((entry) => entry.scopeTier === "character");
    ensure(turn1ZagaraCharacter.length === 3
      && turn1ZagaraCharacter.every((entry) => entry.entryId.startsWith("zagara."))
      && turn1KerriganCharacter.length === 0,
    "LIVE_WORLDBOOK_NOT_FIRED", {
      turnLabel: "turn-1",
      kerriganCharacter: turn1KerriganCharacter,
      zagaraCharacter: turn1ZagaraCharacter,
    });
    const accountingTurn1 = clone((await stackA.companionFetch(
      `conversations/${encodeURIComponent(conversationId)}?roomId=${encodeURIComponent(ROOM_ID)}`,
      { seatToken: stackA.hostSeatToken },
    )).envelope?.result?.providerAccounting);
    ensure(accountingTurn1?.calls === 2
      && accountingTurn1?.externalNetworkAttemptsKnown === 2
      && accountingTurn1?.paidInferencePerformed === 2,
    "LIVE_PROVIDER_ACCOUNTING_WRONG", { turnLabel: "turn-1", accounting: accountingTurn1 });
    continuity.turn1 = {
      userPrompt: CONTINUITY_TURN1_PROMPT,
      replies: turn1.replies.map((reply, index) => ({
        participantId: reply.participantId,
        packageId: companions[index].packageRef.id,
        content: reply.content,
        turnHash: reply.turnHash,
        contextAssemblyHash: reply.contextAssembly?.assemblyHash ?? null,
        layersIncluded: clone(reply.contextAssembly?.layersIncluded) || [],
        worldbookFired: clone(reply.contextAssembly?.worldbookFired) || [],
        providerReceipt: clone(reply.providerReceipt),
      })),
      accountingAfter: accountingTurn1,
    };
    await capture(pageA, "live-02-desktop-turn1-both-replies.png",
      "Desktop 1500×1050, turn 1: BOTH actual DeepSeek replies (Kerrigan then Zagara, deterministic order) rendered byte-identically to the isolated-Worker outputs; server accounting shows exactly 2 external network attempts / 2 paid inferences.");

    // ── Memory writes (real product contracts): distinctive plan/fact as a
    // chat-tier worldbook entry + rolling summary + episodic fact (UI), and
    // one typed observed relationship event (real HTTP memory contract; the
    // UI exposes no relationship input, honestly read-only there). ────────
    await chatA.getByTestId("companion-chat-worldbook-id-input")
      .fill(CONTINUITY_CHAT_WORLDBOOK_ENTRY.entryId);
    await chatA.getByTestId("companion-chat-worldbook-keyword-input")
      .fill(CONTINUITY_CHAT_WORLDBOOK_ENTRY.keyword);
    await chatA.getByTestId("companion-chat-worldbook-content-input")
      .fill(CONTINUITY_CHAT_WORLDBOOK_ENTRY.content);
    await chatA.getByTestId("companion-chat-worldbook-register").click();
    await pageA.waitForFunction((entryId) => (
      document.querySelector('[data-testid="companion-chat-worldbook-list"]')
        ?.innerText.includes(entryId)
    ), CONTINUITY_CHAT_WORLDBOOK_ENTRY.entryId, { timeout: 60_000 });
    await chatA.getByTestId("companion-chat-memory-summary-input").fill(CONTINUITY_SUMMARY);
    await chatA.getByTestId("companion-chat-memory-summary-save").click();
    await pageA.waitForFunction(() => (
      document.querySelector('[data-testid="companion-chat-memory-status"]')
        ?.innerText.includes("summary versions: 1")
    ), null, { timeout: 60_000 });
    await chatA.getByTestId("companion-chat-memory-episodic-input").fill(CONTINUITY_EPISODIC_FACT);
    await chatA.getByTestId("companion-chat-memory-episodic-add").click();
    await pageA.waitForFunction(() => (
      document.querySelector('[data-testid="companion-chat-memory-status"]')
        ?.innerText.includes("episodic facts: 1")
    ), null, { timeout: 60_000 });
    const relationshipWrite = await stackA.companionFetch(
      `conversations/${encodeURIComponent(conversationId)}/memory/relationship`,
      {
        method: "POST",
        seatToken: stackA.hostSeatToken,
        body: {
          roomId: ROOM_ID,
          eventType: CONTINUITY_RELATIONSHIP_EVENT.eventType,
          deltas: clone(CONTINUITY_RELATIONSHIP_EVENT.deltas),
          note: CONTINUITY_RELATIONSHIP_EVENT.note,
        },
      },
    );
    okResult(relationshipWrite, "LIVE_RELATIONSHIP_WRITE_FAILED");
    const memoryAfterWrites = okResult(await stackA.companionFetch(
      `conversations/${encodeURIComponent(conversationId)}/memory?roomId=${encodeURIComponent(ROOM_ID)}`,
      { seatToken: stackA.hostSeatToken },
    ), "LIVE_MEMORY_READ_FAILED");
    const layersAfterWrites = memoryAfterWrites.layers || {};
    ensure(layersAfterWrites.rollingSummary?.content === CONTINUITY_SUMMARY
      && layersAfterWrites.rollingSummaryHonesty === "persisted"
      && layersAfterWrites.rollingSummaryVersions?.length === 1
      && layersAfterWrites.episodicFacts?.length === 1
      && layersAfterWrites.episodicFacts[0]?.content === CONTINUITY_EPISODIC_FACT
      && layersAfterWrites.relationshipState?.history?.length === 1
      && layersAfterWrites.relationshipState?.axes?.trust?.status === "known"
      && layersAfterWrites.relationshipState?.axes?.trust?.value === 1
      && layersAfterWrites.chatWorldbookEntries?.some((entry) => (
        entry.entryId === CONTINUITY_CHAT_WORLDBOOK_ENTRY.entryId
        && entry.scopeTier === "chat"
      )),
    "LIVE_MEMORY_WRITE_PROOF_WRONG", {
      layers: {
        summary: layersAfterWrites.rollingSummary,
        versions: layersAfterWrites.rollingSummaryVersions,
        episodic: layersAfterWrites.episodicFacts,
        relationship: layersAfterWrites.relationshipState,
        chatWorldbook: layersAfterWrites.chatWorldbookEntries,
      },
    });
    continuity.memoryWrites = {
      chatWorldbookEntry: clone(CONTINUITY_CHAT_WORLDBOOK_ENTRY),
      rollingSummary: CONTINUITY_SUMMARY,
      episodicFact: CONTINUITY_EPISODIC_FACT,
      relationshipEvent: clone(CONTINUITY_RELATIONSHIP_EVENT),
      provenance: {
        chatWorldbookEntry: "user-authored chat-tier entry via the real UI contract (conversation:// provenance attached server-side)",
        rollingSummary: "memory/summary contract via the real UI (append-only version 1)",
        episodicFact: "memory/episodic contract via the real UI (user_statement, authenticated-seat provenance)",
        relationshipEvent: "memory/relationship real HTTP contract (typed observed event personal_shared; the UI intentionally exposes no relationship input — read-only projection there)",
      },
    };
    continuity.memoryAfterWrites = {
      rollingSummaryVersions: clone(layersAfterWrites.rollingSummaryVersions),
      episodicFactCount: layersAfterWrites.episodicFacts.length,
      episodicProvenance: clone(layersAfterWrites.episodicFacts[0]?.provenance),
      relationshipHistory: clone(layersAfterWrites.relationshipState.history),
      relationshipAxes: clone(layersAfterWrites.relationshipState.axes),
      chatWorldbookEntries: clone(layersAfterWrites.chatWorldbookEntries),
    };

    // ── Checkpoint, then FULL server/session stack restart ──────────────
    await chatA.getByTestId("companion-chat-checkpoint").click();
    await pageA.waitForFunction(() => (
      document.querySelector('[data-testid="companion-chat-section"]')
        ?.innerText.includes("sessckpt-")
    ), null, { timeout: 60_000 });
    const checkpointId = (await chatA.innerText()).match(/sessckpt-\d+-[0-9a-f]{12}/u)?.[0];
    ensure(checkpointId, "CHECKPOINT_NOT_RECORDED_IN_UI");
    const turn1Transcript = (await stackA.companionFetch(
      `conversations/${encodeURIComponent(conversationId)}?roomId=${encodeURIComponent(ROOM_ID)}`,
      { seatToken: stackA.hostSeatToken },
    )).envelope?.result?.messages?.map((message) => ({
      participantId: message.participantId,
      content: message.content,
      turnHash: message.turnHash,
    }));
    ensure(turn1Transcript?.length === 3, "TURN1_TRANSCRIPT_READ_FAILED");
    await capture(pageA, "live-03-desktop-turn1-checkpoint.png",
      "Desktop 1500×1050: checkpoint recorded after turn 1 with the distinctive plan/fact plus summary/episodic/relationship evidence persisted to durable SQLite; the server/session stack is about to be fully restarted.");
    await desktopA.close();

    // Full companion server/session restart: close the HTTP server, close
    // the SQLite connection, and recompose every companion structure (product
    // module, session runtime, memory engine, persistence connection, HTTP
    // listener) from scratch. The ONLY companion state carrier across the
    // restart is the sealed SQLite file. The Room authority is a separate
    // service and stays up: its match binding hash is tied to referee keying,
    // so recomposing the room would be a DIFFERENT match and the persisted
    // binding would (correctly) refuse it as stale — the same roomRuntime
    // instance is shared across the restart, which the run asserts.
    const stackAOrigin = stackA.origin;
    await new Promise((resolve) => stackA.server.close(resolve));
    await persistenceA.close();
    persistenceB = createPersistence();
    stackB = await composeLiveCompanionStack({
      providerAdapter: adapter,
      persistence: persistenceB,
      sharedRoom: {
        roomRuntime: stackA.roomRuntime,
        roomFacade: stackA.roomFacade,
        roomMutations: stackA.roomMutations,
        hostSeatToken: stackA.hostSeatToken,
      },
    });
    ensure(stackB.origin !== stackAOrigin, "RESTART_NOT_A_NEW_SERVER", {
      before: stackAOrigin,
      after: stackB.origin,
    });
    ensure(stackB.roomRuntime === stackA.roomRuntime
      && stackB.roomFacade === stackA.roomFacade,
    "RESTART_ROOM_AUTHORITY_NOT_PRESERVED");
    const roomRestart = await stackB.roomRuntime.readRoom({
      roomId: ROOM_ID,
      seatToken: stackB.hostSeatToken,
    });
    ensure(roomRestart?.ok
      && roomRestart.projection.matchBinding?.bindingHash === matchBindingHashA
      && roomRestart.projection.room.stateRevision === stateRevisionBefore,
    "ROOM_READ_AFTER_RESTART_FAILED", {
      matchBindingHashA,
      matchBindingHashB: roomRestart?.projection?.matchBinding?.bindingHash ?? null,
    });
    const resumedRead = okResult(await stackB.companionFetch(
      `conversations/${encodeURIComponent(conversationId)}?roomId=${encodeURIComponent(ROOM_ID)}`,
      { seatToken: stackB.hostSeatToken },
    ), "RESTART_CONVERSATION_READ_FAILED");
    ensure(resumedRead.status === "active" && resumedRead.turnCounter === 3
      && resumedRead.checkpointCount >= 1,
    "RESTART_RESUME_STATE_WRONG", {
      status: resumedRead.status,
      turnCounter: resumedRead.turnCounter,
      checkpointCount: resumedRead.checkpointCount,
    });
    const restartedTranscript = resumedRead.messages.map((message) => ({
      participantId: message.participantId,
      content: message.content,
      turnHash: message.turnHash,
    }));
    ensure(JSON.stringify(restartedTranscript) === JSON.stringify(turn1Transcript),
      "RESTART_TRANSCRIPT_NOT_BYTE_IDENTICAL", {
        before: turn1Transcript,
        after: restartedTranscript,
      });
    const memoryAfterRestart = okResult(await stackB.companionFetch(
      `conversations/${encodeURIComponent(conversationId)}/memory?roomId=${encodeURIComponent(ROOM_ID)}`,
      { seatToken: stackB.hostSeatToken },
    ), "RESTART_MEMORY_READ_FAILED");
    const layersAfterRestart = memoryAfterRestart.layers || {};
    ensure(layersAfterRestart.rollingSummary?.content === CONTINUITY_SUMMARY
      && layersAfterRestart.episodicFacts?.length === 1
      && layersAfterRestart.relationshipState?.history?.length === 1
      && layersAfterRestart.chatWorldbookEntries?.some((entry) => (
        entry.entryId === CONTINUITY_CHAT_WORLDBOOK_ENTRY.entryId
      )),
    "RESTART_MEMORY_LAYERS_NOT_RESTORED", {
      layers: {
        summary: layersAfterRestart.rollingSummary,
        episodic: layersAfterRestart.episodicFacts?.length,
        relationship: layersAfterRestart.relationshipState?.history?.length,
        chatWorldbook: layersAfterRestart.chatWorldbookEntries?.map((entry) => entry.entryId),
      },
    });
    continuity.restart = {
      discipline: "HTTP server closed + SQLite connection closed + every companion module/session-runtime/persistence structure recomposed from scratch; the sealed SQLite file is the ONLY companion state carrier; the Room authority (a separate service) is provably the same instance across the restart",
      checkpointId,
      serverOriginBefore: stackAOrigin,
      serverOriginAfter: stackB.origin,
      roomAuthorityInstancePreserved: true,
      matchBindingHashStable: true,
      transcriptByteIdentical: true,
      turnCounterRestored: resumedRead.turnCounter,
      checkpointCountRestored: resumedRead.checkpointCount,
      memoryLayersRestored: {
        rollingSummary: true,
        episodicFacts: layersAfterRestart.episodicFacts.length,
        relationshipEvents: layersAfterRestart.relationshipState.history.length,
        chatWorldbookEntries: layersAfterRestart.chatWorldbookEntries.map((entry) => entry.entryId),
      },
    };

    // ── Desktop B (post-restart): auto-resume, then turn 2 (calls 3–4) ───
    const hostRecovery2 = await stackB.issueRecovery(stackB.hostSeatToken);
    const desktopB = await browser.newContext({
      viewport: { width: 1500, height: 1050 },
      locale: "en-US",
      reducedMotion: "reduce",
    });
    await seedPreferences(desktopB);
    const pageB = await desktopB.newPage();
    watch(pageB, "desktopB");
    await pageB.goto(
      `${stackB.origin}/room/${encodeURIComponent(ROOM_ID)}#recovery=${encodeURIComponent(hostRecovery2)}`,
      { waitUntil: "domcontentloaded", timeout: 120_000 },
    );
    await waitBody(pageB, "Authoritative room connected", 120_000);
    await waitBody(pageB, "TACTICAL COMMS", 120_000);
    const chatB = await openSheetAndChat(pageB);
    await chatB.getByTestId("companion-chat-conversation-meta").waitFor({ timeout: 60_000 });
    const metaB = await chatB.getByTestId("companion-chat-conversation-meta").innerText();
    ensure(metaB.includes(conversationId) && metaB.includes("turn 3"),
      "RESTARTED_UI_DID_NOT_RESUME", { metaB });
    for (const [index, completion] of adapter.observation.completions.slice(0, 2).entries()) {
      const rendered = await chatB.getByTestId(`companion-chat-message-${index + 2}`).innerText();
      ensure(rendered.includes(completion.replyText),
        "RESTARTED_UI_TRANSCRIPT_NOT_ACTUAL", { index, rendered: rendered.slice(0, 400) });
    }

    const turn2Envelope = await sendTurnViaUi(pageB, chatB,
      CONTINUITY_TURN2_PROMPT, "companion-chat-message-6", "turn-2");
    const turn2 = await proveTurnReplies(pageB, chatB, turn2Envelope, {
      turnLabel: "turn-2",
      companions,
      completionsBefore: 2,
      messageIndexBase: 4,
    });
    const messageCount2 = await chatB.locator('[data-testid^="companion-chat-message-"]').count();
    ensure(messageCount2 === 6, "LIVE_MESSAGE_COUNT_WRONG", { turnLabel: "turn-2", messageCount2 });
    // Recall + application: BOTH companions must reference the codeword and
    // at least one plan detail (the layered memory / chat-tier entry written
    // in turn 1 is the only place the plan lives); the two replies must
    // remain character-distinct (never byte-identical), and the assembly
    // provenance must show the restored memory layers actually entered both
    // contexts (rolling summary + episodic facts + relationship state plus
    // the chat-tier worldbook entry fired on the codeword keyword).
    for (const [index, reply] of turn2.replies.entries()) {
      ensure(reply.content.includes(CONTINUITY_PLAN_CODEWORD),
        "LIVE_RECALL_CODEWORD_MISSING", { turnLabel: "turn-2", index, content: reply.content.slice(0, 400) });
      const detail = CONTINUITY_PLAN_DETAIL_KEYWORDS.find((keyword) => reply.content.includes(keyword));
      ensure(detail !== undefined, "LIVE_RECALL_PLAN_DETAIL_MISSING", {
        turnLabel: "turn-2",
        index,
        content: reply.content.slice(0, 400),
      });
      const fired = reply.contextAssembly?.worldbookFired || [];
      ensure(fired.some((entry) => entry.entryId === CONTINUITY_CHAT_WORLDBOOK_ENTRY.entryId
        && entry.scopeTier === "chat"),
      "LIVE_CHAT_WORLDBOOK_NOT_FIRED_ON_RECALL", { turnLabel: "turn-2", index, fired });
      const layersIncluded = reply.contextAssembly?.layersIncluded || [];
      // Transcript content reaches the Provider through the request messages
      // (transcriptMessages), not through the assembly's transcript layer;
      // the restored LAYERED MEMORY must be present in the assembly itself.
      for (const layer of ["rolling_summary", "episodic_facts", "relationship_state", "worldbook"]) {
        ensure(layersIncluded.includes(layer),
          "LIVE_MEMORY_LAYER_NOT_IN_RECALL_CONTEXT", { turnLabel: "turn-2", index, layer, layersIncluded });
      }
    }
    ensure(turn2.replies[0].content !== turn2.replies[1].content,
      "LIVE_REPLIES_NOT_CHARACTER_DISTINCT", {
        kerrigan: turn2.replies[0].content.slice(0, 400),
        zagara: turn2.replies[1].content.slice(0, 400),
      });
    const turn2ZagaraCharacter = (turn2.replies[1].contextAssembly?.worldbookFired || [])
      .filter((entry) => entry.scopeTier === "character");
    ensure(turn2ZagaraCharacter.length === 3
      && turn2ZagaraCharacter.every((entry) => entry.entryId.startsWith("zagara.")),
    "LIVE_WORLDBOOK_NOT_FIRED", { turnLabel: "turn-2", zagaraCharacter: turn2ZagaraCharacter });
    // The restored memory materially changed both companions' contexts.
    for (const [index, reply] of turn2.replies.entries()) {
      ensure(reply.contextAssembly?.assemblyHash
        && reply.contextAssembly.assemblyHash !== turn1.replies[index].contextAssembly?.assemblyHash,
      "LIVE_ASSEMBLY_NOT_ADVANCED_BY_MEMORY", { turnLabel: "turn-2", index });
    }
    const accountingTurn2 = clone((await stackB.companionFetch(
      `conversations/${encodeURIComponent(conversationId)}?roomId=${encodeURIComponent(ROOM_ID)}`,
      { seatToken: stackB.hostSeatToken },
    )).envelope?.result?.providerAccounting);
    // providerAccounting is module-gateway cumulative per composition; the
    // restarted module honestly reports its own 2 calls. The run-level
    // denominator (4) is the adapter's own completion record.
    ensure(accountingTurn2?.calls === 2
      && accountingTurn2?.externalNetworkAttemptsKnown === 2
      && accountingTurn2?.paidInferencePerformed === 2,
    "LIVE_PROVIDER_ACCOUNTING_WRONG", { turnLabel: "turn-2", accounting: accountingTurn2 });
    continuity.turn2 = {
      userPrompt: CONTINUITY_TURN2_PROMPT,
      replies: turn2.replies.map((reply, index) => ({
        participantId: reply.participantId,
        packageId: companions[index].packageRef.id,
        content: reply.content,
        turnHash: reply.turnHash,
        contextAssemblyHash: reply.contextAssembly?.assemblyHash ?? null,
        layersIncluded: clone(reply.contextAssembly?.layersIncluded) || [],
        worldbookFired: clone(reply.contextAssembly?.worldbookFired) || [],
        providerReceipt: clone(reply.providerReceipt),
        recall: {
          codewordEchoed: true,
          planDetailKeyword: CONTINUITY_PLAN_DETAIL_KEYWORDS
            .find((keyword) => reply.content.includes(keyword)),
        },
      })),
      accountingAfter: accountingTurn2,
    };
    continuity.accounting = {
      note: "providerAccounting is module-gateway cumulative per composition and honestly resets across the restart; the run-level physical denominator is the adapter completion record",
      stackAAfterTurn1: accountingTurn1,
      stackBAfterTurn2: accountingTurn2,
      runPhysicalProviderCalls: adapter.observation.physicalProviderCalls,
      runDispatchAttempts: adapter.observation.dispatchAttempts,
    };
    await capture(pageB, "live-04-desktop-turn2-recall-after-restart.png",
      "Desktop 1500×1050, turn 2 AFTER the full server/session restart: both companions recall and apply the turn-1 plan (「霜刃-9」) from the restored layered memory, character-distinct and worldbook-grounded; rendered replies byte-match the isolated-Worker outputs.");
    await desktopB.close();

    // ── 390px touch: resume the restarted persisted conversation ────────
    const hostRecovery3 = await stackB.issueRecovery(stackB.hostSeatToken);
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
      `${stackB.origin}/room/${encodeURIComponent(ROOM_ID)}#recovery=${encodeURIComponent(hostRecovery3)}`,
      { waitUntil: "domcontentloaded", timeout: 120_000 },
    );
    await waitBody(narrowPage, "Authoritative room connected", 120_000);
    await waitBody(narrowPage, "TACTICAL COMMS", 120_000);
    const narrowDock = narrowPage.getByTestId("tactical-adjutant-floating-dock");
    await narrowDock.getByRole("button", { name: /TACTICAL COMMS/iu }).tap();
    await narrowPage.getByTestId("companion-mobile-sheet").waitFor({ timeout: 60_000 });
    if (await narrowPage.getByTestId("companion-chat-section").count() === 0) {
      await narrowPage.getByRole("button", { name: /Companion group chat/iu }).tap();
    }
    const narrowChat = narrowPage.getByTestId("companion-chat-section");
    await narrowChat.getByTestId("companion-chat-conversation-meta").waitFor({ timeout: 60_000 });
    const narrowMeta = await narrowChat.getByTestId("companion-chat-conversation-meta").innerText();
    ensure(narrowMeta.includes(conversationId) && narrowMeta.includes("turn 6"),
      "NARROW_DID_NOT_RESUME_LIVE_CONVERSATION", { narrowMeta });
    const narrowCount = await narrowChat.locator('[data-testid^="companion-chat-message-"]').count();
    ensure(narrowCount === 6, "NARROW_TRANSCRIPT_INCOMPLETE", { narrowCount });
    for (const [index, completion] of adapter.observation.completions.entries()) {
      const rendered = await narrowChat
        .getByTestId(`companion-chat-message-${index + 2 + Math.floor(index / 2)}`)
        .innerText();
      ensure(rendered.includes(completion.replyText),
        "NARROW_RESUME_REPLY_NOT_ACTUAL", { index, rendered: rendered.slice(0, 400) });
    }
    const narrowOverflow = await narrowPage.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    ensure(narrowOverflow.documentWidth <= narrowOverflow.viewportWidth + 1,
      "NARROW_HORIZONTAL_OVERFLOW", narrowOverflow);
    await capture(narrowPage, "live-05-narrow-mobile-resumed.png",
      "390×844 touch: the full-screen mobile sheet resumes the restarted durable conversation at turn 6; all four actual Provider replies render byte-identically with zero horizontal overflow.");
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

    // ── Room safety (one shared mutation-counting facade across the restart)
    ensure(Object.values(stackA.roomMutations).every((count) => count === 0),
      "COMPANION_PATH_MUTATED_ROOM", { mutations: stackA.roomMutations });
    const roomAfter = await stackB.roomRuntime.readRoom({
      roomId: ROOM_ID,
      seatToken: stackB.hostSeatToken,
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

    // ── Durable-store artifact (hash + credential scan) ─────────────────
    await persistenceB.close();
    const persistenceClosed = persistenceB;
    persistenceB = null;
    for (const entry of await readdir(path.dirname(CONTINUITY_SQLITE_PATH))) {
      const filename = path.join(path.dirname(CONTINUITY_SQLITE_PATH), entry);
      if (!(await stat(filename)).isFile()) continue;
      artifacts.push(await artifactRecord(filename,
        "Encrypted SQLite durable store (and WAL sidecar if present): the FULLY restarted companion server/session stack resumed the two-companion transcript, checkpoint, chat-tier worldbook entry, rolling summary, episodic fact and relationship state from these bytes alone."));
    }
    void persistenceClosed;

    const completions = adapter.observation.completions;
    const perCall = completions.map((completion) => {
      const receipt = completion.receipt;
      const pricing = completion.pricing;
      return {
        dispatchIndex: completion.dispatchIndex,
        physicalAttempts: receipt.physicalAttempts,
        automaticRetries: receipt.automaticRetries,
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
        pricingAuthoritative: completion.pricingAuthoritative === true,
        recoveredFromTruncatedEnvelope: completion.recoveredFromTruncatedEnvelope === true,
        outputClassification: clone(completion.classification),
        safeProviderReceiptHash: receipt.receiptHash,
      };
    });
    const totalUsage = completions.reduce((sum, completion) => ({
      inputUnits: sum.inputUnits + completion.receipt.usage.inputUnits,
      outputUnits: sum.outputUnits + completion.receipt.usage.outputUnits,
      totalUnits: sum.totalUnits + completion.receipt.usage.totalUnits,
    }), { inputUnits: 0, outputUnits: 0, totalUnits: 0 });
    const totalEstimateNanoUsd = completions.every((completion) => (
      Number.isSafeInteger(completion.pricing?.calculatedCostNanoUsd)
    ))
      ? completions.reduce((sum, completion) => sum + completion.pricing.calculatedCostNanoUsd, 0)
      : null;
    const modelReportingDrift = completions.some((completion) => (
      completion.receipt.reportedModel !== providerProfile.model
    ))
      ? {
        requestedModel: providerProfile.model,
        reportedModels: [...new Set(completions.map((completion) => completion.receipt.reportedModel))],
        pricingAuthoritative: false,
        note: "Provider-reported model differs from the pinned requested model; recorded honestly (first observed on the truncated epoch-1 call); per-call pricing is a snapshot-rate estimate, not an invoice",
      }
      : null;

    const reportBody = {
      schemaVersion: "starcraft_tmg_ticket_26_slice_266f_live_byok_companion_report_v1",
      ticket: 26,
      slice: "266f",
      status: "passed",
      runId,
      startedAt,
      finishedAt: new Date().toISOString(),
      attemptEpoch: 3,
      acceptance: "two-companion layered-memory continuity across a full server/session restart",
      previousEpochs: clone(previousEpochs),
      userAuthorization: {
        explicitFlag: "--authorize-live-byok-companion-memory-continuity",
        manifest: "ticket-26-slice-266f-companion-live-product-acceptance",
        hardMaximumPhysicalProviderCalls: CONTINUITY_MAX_PHYSICAL_CALLS,
        sliceHardMaximumPhysicalProviderCalls: 2 + CONTINUITY_MAX_PHYSICAL_CALLS,
        perCallDispatchLocks: LOCK_PATHS_EPOCH3.map((lockPath) => path.relative(ROOT, lockPath)),
      },
      outputBudgetContract: clone(LIVE_OUTPUT_BUDGET),
      acceptanceProfile: {
        note: "derived through the sealed createProviderProfile factory with outputBudget as the ONLY delta; no Provider infrastructure file modified",
        derivedFromTicket16Profile: {
          id: providerProfile.providerProfileId,
          version: providerProfile.version,
          hash: providerProfile.integrity.hash,
          outputBudget: providerProfile.outputBudget,
        },
        providerProfileRef: clone(completions[0]?.receipt?.providerProfileRef),
        outputBudget: acceptanceProfile.outputBudget,
      },
      modelReportingDrift: clone(modelReportingDrift),
      webExport,
      credentialIngress: clone(keychainReceipt),
      attachment: {
        attachmentId,
        providerProfileRef: clone(completions[0]?.receipt?.providerProfileRef),
        providerId: completions[0]?.receipt?.providerId,
        requestedModel: completions[0]?.receipt?.requestedModel,
        egressIsolation: "child_process_session_memory_only",
      },
      liveCalls: perCall,
      usageTotals: {
        ...totalUsage,
        estimatedCostNanoUsdTotal: totalEstimateNanoUsd,
        estimatedCostUsdTotal: totalEstimateNanoUsd === null ? null : (() => {
          const whole = Math.floor(totalEstimateNanoUsd / 1_000_000_000);
          const fractional = String(totalEstimateNanoUsd % 1_000_000_000)
            .padStart(9, "0").replace(/0+$/u, "") || "0";
          return `${whole}.${fractional}`;
        })(),
        estimateOnly: true,
        providerInvoiceAuthoritative: true,
      },
      conversation: {
        roomId: ROOM_ID,
        conversationId,
        companions: companions.map((companion) => companion.packageRef.id),
        speakerOrder: "deterministic: Player → Sarah Kerrigan → Zagara (mention-first each turn)",
        turn1: clone(continuity.turn1),
        turn2: clone(continuity.turn2),
        memoryWrites: clone(continuity.memoryWrites),
        memoryAfterWrites: clone(continuity.memoryAfterWrites),
        restart: clone(continuity.restart),
        accounting: clone(continuity.accounting),
        replyRenderedByteMatchDesktop: true,
        replyRenderedByteMatchMobile: true,
        noOpponentPrivateExposure: "companion contexts carry player-visible room material only; relationship events are typed observed events, never inferred",
        hiddenChainOfThought: "not_collected",
      },
      browserEvidence: {
        chromium: chromiumVersion,
        viewports: [
          { name: "desktop", width: 1500, height: 1050 },
          { name: "desktop-post-restart", width: 1500, height: 1050 },
          { name: "narrow-touch", width: 390, height: 844, hasTouch: true },
        ],
        screenshots,
      },
      detach: clone(detachProof),
      roomSafety: {
        mutations: clone(stackA.roomMutations),
        mutationFacadeSharedAcrossRestart: stackB.roomMutations === stackA.roomMutations,
        stateRevisionBefore,
        stateRevisionAfter: roomAfter.projection.room.stateRevision,
      },
      boundaries: {
        realProviderCalls: adapter.observation.physicalProviderCalls,
        paidProviderUsed: true,
        rawCredentialPersisted: false,
        credentialHashPersisted: false,
        credentialInArgumentsOrEnvironment: false,
        sqliteKeyPersisted: false,
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
    ensure(!serialized.includes(sqliteKey), "SQLITE_KEY_IN_REPORT");
    for (const artifact of artifacts) {
      const bytes = await readFile(path.join(ROOT, artifact.path));
      ensure(!containsStarcraftTmgOnlineCredentialMaterialV1(bytes.toString("latin1")),
        "CREDENTIAL_SHAPED_MATERIAL_IN_ARTIFACT", { artifact: artifact.path });
      ensure(!bytes.includes(Buffer.from(sqliteKey, "utf8")),
        "SQLITE_KEY_IN_ARTIFACT", { artifact: artifact.path });
    }
    await writeFile(REPORT_PATH_EPOCH3, `${JSON.stringify({
      ...reportBody,
      reportHash: createHash("sha256").update(serialized).digest("hex"),
    }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    console.log(JSON.stringify({
      ok: true,
      epoch: 3,
      physicalProviderCalls: adapter.observation.physicalProviderCalls,
      dispatchAttempts: adapter.observation.dispatchAttempts,
      modelReportingDrift: modelReportingDrift !== null,
      inputUnits: totalUsage.inputUnits,
      outputUnits: totalUsage.outputUnits,
      estimatedCostUsdTotal: reportBody.usageTotals.estimatedCostUsdTotal,
      conversationId,
      restartRestored: true,
      recallProven: true,
      detached: true,
      report: path.relative(ROOT, REPORT_PATH_EPOCH3),
    }, null, 2));
  } catch (error) {
    const providerCode = String(adapter?.observation?.failure?.code || "");
    const thrownCode = String(error?.code || "");
    const code = /^[A-Z][A-Z0-9_]{2,79}$/u.test(providerCode)
      && ["PROVIDER_AUTHENTICATION_FAILED", "PROVIDER_PAYMENT_REQUIRED",
        "PROVIDER_WORKER_NOT_ATTACHED", "LIVE_PROVIDER_ATTEMPT_ALREADY_CLAIMED",
        "LIVE_CALL_DENOMINATOR_EXCEEDED",
        "LIVE_PROVIDER_OUTPUT_BUDGET_TRUNCATED",
        "LIVE_PROVIDER_RESPONSE_CONTRACT_REJECTED"].includes(providerCode)
      ? providerCode
      : /^[A-Z][A-Z0-9_]{2,79}$/u.test(thrownCode)
        ? thrownCode
        : "LIVE_BYOK_COMPANION_RUN_FAILED";
    await writeFailureReport(runId, startedAt, code, {
      attemptEpoch: 3,
      providerFailure: clone(adapter?.observation?.failure || null),
      providerDispatchAttempts: adapter?.observation?.dispatchAttempts ?? 0,
      physicalProviderCalls: adapter?.observation?.physicalProviderCalls ?? 0,
      completedCallReceipts: (adapter?.observation?.completions || []).map((completion) => ({
        dispatchIndex: completion.dispatchIndex,
        usage: clone(completion.receipt?.usage),
        safeProviderReceiptHash: completion.receipt?.receiptHash ?? null,
      })),
      conversationId,
      continuity: clone(continuity),
      screenshots,
      errorMessage: (() => {
        const message = String(error?.message || "").slice(0, 500);
        return containsStarcraftTmgOnlineCredentialMaterialV1(message)
          ? "[redacted: credential-shaped]" : message;
      })(),
    }, REPORT_PATH_EPOCH3).catch(() => {});
    console.error(code);
    process.exitCode = 1;
  } finally {
    credentialBytes?.fill(0);
    if (browser) await browser.close().catch(() => {});
    if (stackA?.server) stackA.server.close();
    if (stackB?.server) stackB.server.close();
    if (persistenceA) await persistenceA.close().catch(() => {});
    if (persistenceB) await persistenceB.close().catch(() => {});
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
