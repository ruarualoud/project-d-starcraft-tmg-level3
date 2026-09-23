#!/usr/bin/env node

// Ticket 27 / Slice 271 — THE manifest-named secure live runner and browser
// acceptance gate for the roster-planning workspace.
//
//   node scripts/verify-ticket-27-slice-271-roster-workspace-browser-v1.mjs \
//     --live-flash-authorized
//
// Discipline (per the slice manifest and brief):
//   - The ONLY live lane: macOS Keychain ingress -> isolated structured
//     Provider Worker (DeepSeek Responses json_schema, flash profile), all
//     inside this process; the raw credential is never printed, logged,
//     persisted, placed in an argument/env/file, or shown to the agent. The
//     parent-side bytes are verified zeroed after attach; detachCredential
//     runs in a finally path.
//   - Hard maximum 12 physical Provider calls (acceptance safety bound),
//     enforced locally BEFORE any byte is sent. The planned journey uses 4
//     (3-round initial plan + 1 revision). No Pro fallback, no automatic
//     retry. Stop immediately on 401/402/403, ambiguous dispatch or a missing
//     secure attachment.
//   - One targeted real desktop (1500x1050) and 390px journey through the
//     CURRENT Web export: army entry + preserved manual builder, setup,
//     real generate with async progress, real plan, legal/illegal candidate
//     compare, manual override + stale marking, revision, persisted reload,
//     export + import round-trip, zero-call retained-reply replay resume,
//     plus honest unavailable (separate offline server) and disconnected
//     (static-only server) states. Screenshots prove every UI claim.
//   - Redacted receipts only (hashes, usage, latency); sanitized public
//     round outputs are retained by the workspace service itself; report and
//     artifacts are scanned for credential-shaped strings.
//   - trainingTruth:false everywhere; no Room mutation route exists in the
//     workspace server, and the laboratory mutation-zero proof is asserted.
//
// Closure mode (added for the S271 UI state repair):
//
//   node scripts/verify-ticket-27-slice-271-roster-workspace-browser-v1.mjs \
//     --replay-retained-authorized
//
//   - ZERO Provider/API calls and no credential ingress: the workspace server
//     runs with deliberationFactory null and the journey reuses the RETAINED
//     run-3 paid session (drafts copied, originals preserved read-only). It
//     proves the repaired disconnected state plus the full UI journey —
//     manual builder, retained plan/candidates/evidence/cost rendering,
//     zero-call replay resume, manual override -> stale, explicit zero-call
//     restoration to the plan candidate, retained revision history, reload,
//     export/import, mobile 390px, unavailable and disconnected states.
//   - Output goes to build/ticket-27-slice-271-roster-workspace-closure-v1/;
//     the run-3 live report, receipts and drafts are never overwritten.

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { chromium } from "playwright";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createRosterWorkspaceServerV1 } from
  "./serve-ticket-27-slice-271-roster-workspace-v1.mjs";
import { ROSTER_PLANNING_WORKSPACE_API_PREFIX } from
  "../packages/roster-planning-workspace/roster-planning-workspace-http-v1.mjs";
import { deriveRosterWorkspaceCandidateInputV1 } from
  "../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs";
import { STARCRAFT_TMG_TICKET_23_LIVE_FLASH_PROVIDER_PROFILE_V1 as
  providerProfile } from "../content/provider/ticket-23-live-provider-profiles-v1.mjs";
import {
  rosterStrategistRoundOutputContractV1,
} from "../packages/roster-strategist/roster-strategist-output-schemas-v1.mjs";
import {
  outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1,
  STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION,
} from "../packages/structured-generation/output-contract-registry-v1.mjs";
import { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } from
  "../packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs";
import { createStarcraftTmgStructuredProviderWorkerPortV1 } from
  "../packages/secure-provider-runtime/structured-provider-worker-port-v1.mjs";
import { createStarcraftTmgProviderProfileRegistryV2 } from
  "../packages/secure-provider-runtime/provider-profile-registry-v2.mjs";
import { normalizeProviderJsonDocumentV1 } from
  "../packages/secure-provider-runtime/provider-response-outcome-v1.mjs";
import { priceStarcraftTmgDeepSeekCurrentUsageV2 } from
  "../packages/secure-provider-runtime/provider-pricing-v2.mjs";
import { ROSTER_STRATEGIST_PROMPT_PACK_V1 } from
  "../packages/roster-strategist/roster-strategist-runtime-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXPO_DIR = path.join(ROOT, "apps/starcraft-tmg-expo");
const DIST_DIR = path.join(EXPO_DIR, "dist");
const LIVE_BUILD_ROOT =
  path.join(ROOT, "build/ticket-27-slice-271-roster-workspace-v1");
const CLOSURE_BUILD_ROOT =
  path.join(ROOT, "build/ticket-27-slice-271-roster-workspace-closure-v1");
let BUILD_ROOT = LIVE_BUILD_ROOT;
let EVIDENCE_ROOT = path.join(BUILD_ROOT, "browser-evidence");
let REPORT_PATH = path.join(BUILD_ROOT, "roster-workspace-acceptance-report.json");
let RECEIPTS_PATH = path.join(BUILD_ROOT, "provider-receipts-redacted.json");
const BASE_COMMIT = "1ee509f";
const MAX_PHYSICAL_CALLS = 12;
const MANIFEST_ALLOWED_PATHS = [
  "packages/roster-planning-workspace/",
  "packages/product-composition/roster-planning-product-module-v1.mjs",
  "apps/starcraft-tmg-expo/components/roster-planning/",
  "apps/starcraft-tmg-expo/lib/roster-planning/",
  "apps/starcraft-tmg-expo/app/(tabs)/army.tsx",
  "scripts/serve-ticket-20-human-agent-web-v1.mjs",
  "scripts/serve-ticket-27-slice-271-roster-workspace-v1.mjs",
  "scripts/verify-ticket-27-slice-271-roster-workspace-browser-v1.mjs",
  "docs/ticket-27-slice-271-roster-planning-workspace-v1-2026-09-23.md",
];
const AUTH_STOP_CODES = new Set([401, 402, 403]);
// Read-only frozen artifact root: the hash-locked source-intake cache lives
// in the integration checkout (gitignored, absent from a fresh worktree).
const FIXTURE_ROOT = (() => {
  const candidate = path.resolve(ROOT, "..", "..");
  return existsSync(path.join(candidate, "build/source-intake"))
    ? candidate : ROOT;
})();

const SCREENSHOT_EXPLANATIONS = {
  "01-desktop-army-entry-manual-builder.png": "Army tab entry: the manual builder list with both 智能规划 entry points; the manual builder is untouched.",
  "02-desktop-manual-builder-edit.png": "Manual builder still works: +Terran opens the real edit view with the command/roster tabs and resource bar.",
  "03-desktop-workspace-live-ready.png": "Workspace session list with the live Flash lane attached (付费调用) and the new-session control.",
  "04-desktop-setup.png": "Match setup: own/opponent faction chips constrained by available Skill routes, opponent-information boundary, frozen mission/map provenance.",
  "05-desktop-planning-running.png": "Real asynchronous progress: the strategy-foundation round running against live Flash (round timeline).",
  "06-desktop-plan-overview.png": "The actual generated plan: win/score route with the mission-grounded VP schedule, budget/loss intent, deployment concept.",
  "07-desktop-candidate-compare.png": "Candidate compare: one Rules-LEGAL candidate and three ILLEGAL candidates with the real Rules error codes plus component/cost diffs.",
  "08-desktop-evidence-provenance-cost.png": "Query/simulation evidence (tool receipts, unknown never zero), provenance hashes and redacted usage/cost.",
  "09-desktop-manual-override-stale.png": "Manual override: a unit removed from the working list, the authoritative Builder verdict recomputed, and the explicit stale-evidence banner.",
  "10-desktop-revised-plan.png": "The requested revision: plan v2 with the revision event in history and the stale banner cleared.",
  "11-desktop-reload-resumed.png": "After a full page reload the persisted draft resumes from the server-side store with the plan intact.",
  "12-desktop-export.png": "Export: the actual list + attached plan as a secret-free JSON document (export text displayed; clipboard copy is best-effort under headless browsers), import round-trip proven API-side.",
  "13-mobile-army-entry.png": "390px: army tab with the top 智能规划 entry (the floating companion dock overlays the bottom bar; the top entry stays reachable).",
  "14-mobile-plan.png": "390px touch: the persisted real plan renders in the narrow viewport with zero horizontal overflow.",
  "15-mobile-candidates-working.png": "390px touch: candidate compare and the working-list editor scroll within the viewport; no clipping.",
  "16-offline-unavailable.png": "Honest unavailable state (separate server without the secure lane): generate returns the typed ROSTER_WORKSPACE_DELIBERATION_UNAVAILABLE error. 0 Provider calls.",
  "17-offline-disconnected.png": "Honest disconnected state (static-only server, no API): the explicit 无法连接规划服务 card with a reconnect action.",
  "03-desktop-workspace-retained.png": "Closure mode: workspace session list loaded from the RETAINED run-3 store (no live lane attached): the paid plan session is listed and the honest 实时规划不可用 banner shows; closure reuses artifacts with 0 new calls.",
  "05-desktop-replay-progress.png": "Closure mode: zero-call retained-reply replay resume — every generation round is marked ⟲ replayed (本地回放 · 0 调用) and the reconstructed plan hash matches the run-3 paid generation.",
  "10-desktop-revision-history-retained.png": "Closure mode: retained revision evidence — plan v2 carries the run-3 paid revision event in its history; the manual edit above was restored to the exact plan candidate (stale cleared) at 0 calls.",
};

const checks = [];
function check(id, ok, evidence = {}) {
  checks.push({ id, ok: ok === true, evidence });
  if (ok !== true) {
    throw Object.assign(new Error(`S271_CHECK_FAILED:${id}`),
      { code: "S271_CHECK_FAILED", checkId: id });
  }
}
function ensure(condition, code, details = {}) {
  if (!condition) throw Object.assign(new Error(code), { code, ...details });
}
async function sha256File(filename) {
  return createHash("sha256").update(await readFile(filename)).digest("hex");
}
async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return hashStarcraftTmgContract(value);
}

// ── source freshness → one web export (reused when already fresh) ─────────
async function newestMtime(target) {
  let newest = 0;
  const info = await stat(target).catch(() => null);
  if (!info) return 0;
  if (!info.isDirectory()) return info.mtimeMs;
  for (const entry of await readdir(target, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    newest = Math.max(newest, await newestMtime(path.join(target, entry.name)));
  }
  return newest;
}
async function oldestMtime(target) {
  let oldest = Number.POSITIVE_INFINITY;
  for (const entry of await readdir(target, { withFileTypes: true })) {
    const full = path.join(target, entry.name);
    if (entry.isDirectory()) oldest = Math.min(oldest, await oldestMtime(full));
    else oldest = Math.min(oldest, (await stat(full)).mtimeMs);
  }
  return oldest;
}
async function ensureWebExport() {
  if (existsSync(path.join(DIST_DIR, "index.html"))) {
    const sources = Math.max(
      await newestMtime(path.join(EXPO_DIR, "app")),
      await newestMtime(path.join(EXPO_DIR, "components")),
      await newestMtime(path.join(EXPO_DIR, "lib")),
    );
    if (await oldestMtime(DIST_DIR) > sources) {
      return { exported: false, reason: "existing export fresher than frontend sources" };
    }
  }
  const generatedDir = path.join(BUILD_ROOT, "generated");
  await mkdir(generatedDir, { recursive: true });
  const staticCss = path.join(generatedDir, "static-web.css");
  for (const args of [
    ["--dir", EXPO_DIR, "exec", "tailwindcss", "-i", "global.css",
      "-o", staticCss, "--minify"],
    ["--dir", EXPO_DIR, "exec", "expo", "export", "--platform", "web",
      "--output-dir", DIST_DIR, "--clear"],
  ]) {
    const result = spawnSync("corepack", ["pnpm@9.12.0", ...args], {
      cwd: ROOT, encoding: "utf8",
      env: {
        ...process.env,
        COREPACK_ENABLE_PROJECT_SPEC: "0",
        BROWSERSLIST: "last 1 version",
        BROWSERSLIST_ENV: "native",
        CI: "1",
        EXPO_OFFLINE: "1",
        NODE_ENV: "production",
        PROJECT_D_LOCAL_WEB_EXPORT: "1",
        PROJECT_D_STATIC_WEB_CSS_INPUT: staticCss,
        EXPO_PUBLIC_STARCRAFT_TMG_LOCAL_WEB_EXPORT: "1",
        EXPO_PUBLIC_STARCRAFT_TMG_MEDIA_RELEASE_CHANNEL: "development_internal",
      },
    });
    ensure(result.status === 0, "S271_WEB_EXPORT_FAILED",
      { tail: `${result.stdout || ""}${result.stderr || ""}`.slice(-800) });
  }
  ensure(existsSync(path.join(DIST_DIR, "index.html")), "S271_WEB_EXPORT_MISSING");
  return { exported: true };
}

// ── scope audit ────────────────────────────────────────────────────────────
function auditScope() {
  const diff = spawnSync("git", ["diff", "--name-only", `${BASE_COMMIT}..HEAD`],
    { cwd: ROOT, encoding: "utf8" });
  ensure(diff.status === 0, "S271_SCOPE_AUDIT_FAILED");
  const changed = diff.stdout.split("\n").filter(Boolean);
  const outside = changed.filter((name) => !MANIFEST_ALLOWED_PATHS.some(
    (allowed) => allowed.endsWith("/")
      ? name.startsWith(allowed) : name === allowed));
  const untracked = spawnSync("git", ["status", "--porcelain"],
    { cwd: ROOT, encoding: "utf8" });
  const untrackedOutside = untracked.stdout.split("\n")
    .filter((line) => line.startsWith("??"))
    .map((line) => line.slice(3).trim())
    .filter((name) => !name.startsWith("build/") && !name.startsWith("tmp/")
      && !MANIFEST_ALLOWED_PATHS.some((allowed) => allowed.endsWith("/")
        ? name.startsWith(allowed) : name === allowed));
  return { changed, outside, untrackedOutside };
}

// ── DeepSeek Responses helpers (same extraction discipline as the runner) ──
function responsesUsage(value) {
  const integer = (candidate) => Number.isSafeInteger(candidate) && candidate >= 0;
  const inputUnits = value?.input_tokens;
  const outputUnits = value?.output_tokens;
  const totalUnits = value?.total_tokens;
  if (![inputUnits, outputUnits, totalUnits].every(integer)
    || totalUnits !== inputUnits + outputUnits) return null;
  const cached = value?.input_tokens_details?.cached_tokens;
  const reasoning = value?.output_tokens_details?.reasoning_tokens;
  const result = { inputUnits, outputUnits, totalUnits };
  if (integer(cached) && cached <= inputUnits) {
    result.inputCacheHitUnits = cached;
    result.inputCacheMissUnits = inputUnits - cached;
  }
  if (integer(reasoning) && reasoning <= outputUnits) {
    result.reasoningOutputUnits = reasoning;
  }
  return result;
}
function responsesOutputText(payload) {
  if (!Array.isArray(payload?.output)) return { text: null, refusal: false };
  const messages = payload.output.filter((item) => item?.type === "message");
  if (messages.length !== 1 || messages[0].status !== "completed"
    || messages[0].role !== "assistant"
    || !Array.isArray(messages[0].content)) return { text: null, refusal: false };
  const refusals = messages[0].content.filter((part) => part?.type === "refusal");
  const texts = messages[0].content.filter((part) => (
    part?.type === "output_text" && typeof part.text === "string"));
  return {
    text: texts.length === 1 && messages[0].content.length === 1
      ? texts[0].text : null,
    refusal: refusals.length > 0,
  };
}
const FORBIDDEN_PUBLIC_OUTPUT_KEYS = new Set([
  "hidden", "chainofthought", "cot", "scratchpad", "reasoning",
  "reasoningtrace", "internalmonologue", "privatereasoning", "thinking",
  "internalnotes",
]);
function sanitizePublicOutput(value, dropped, atPath) {
  if (Array.isArray(value)) {
    return value.map((entry, index) => sanitizePublicOutput(
      entry, dropped, `${atPath}[${index}]`));
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      const normalized = key.toLowerCase().replace(/[-_]/gu, "");
      if (FORBIDDEN_PUBLIC_OUTPUT_KEYS.has(normalized)) {
        dropped.push(`${atPath}.${key}`);
        continue;
      }
      out[key] = sanitizePublicOutput(child, dropped, `${atPath}.${key}`);
    }
    return out;
  }
  return value;
}
function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

const LIVE_INSTRUCTIONS = [
  "You are the StarCraft TMG Roster Strategist answering one bounded "
    + "pregame roster-planning deliberation round.",
  "Answer with a single JSON object that conforms EXACTLY to the JSON "
    + "schema attached to this request. Emit every required field, including "
    + "the request-owned constants schemaVersion and roundKind, with exactly "
    + "the values declared in the input. Emit ONLY the fields this round's "
    + "attached schema declares: a field named in these instructions belongs "
    + "exclusively to the round whose schema declares it, and any additional "
    + "property is a hard failure.",
  "All output is public strategy. Never emit hidden chain-of-thought, "
    + "scratchpads or private reasoning fields; the schema forbids them.",
  "Strategy must come from the supplied Skills and your own deliberation. "
    + "The Rules-owned Army Builder menu in the input is the sole legality "
    + "authority: use only recordKeys, compositionKinds and upgradeNames "
    + "from that menu.",
  "Unknown stays unknown: use the declared unknown enums/statuses and "
    + "empty placeholders instead of inventing values.",
  "Unspent minerals are lost (no carryover, no later spend): treat budget "
    + "residue as an explicit opportunity cost. ONLY the comparison/selection "
    + "round schema declares the resourceUtilization field: in that round, "
    + "when a near-cap Rules-legal candidate is available, select a near-cap "
    + "candidate or declare the public justification in resourceUtilization. "
    + "Never emit resourceUtilization in any other round.",
  "Ground the public VP schedule in the sealed mission-scoring authority "
    + "when it is derivable (scheduleStatus declared, scoreRouteAuthority "
    + "mission_grounded); when the authority is missing, keep the schedule "
    + "unknown and identify the missing authority. Never fabricate scoring "
    + "data.",
  "Schedule-window labels and other narrative fields have display targets "
    + "(64 characters for window labels): keep them concise, but never omit "
    + "content to fit — exceeding a display target is only a soft warning "
    + "and the full public text is preserved.",
].join("\n");

// ── live deliberation factory (the only credential-holding component) ──────
function createLiveFlashDeliberationFactory(live) {
  let sentAttempts = 0;
  return {
    availability: () => ({
      available: true,
      kind: "live_keychain_isolated_worker_byok_structured_json_schema",
      modelVersion: providerProfile.model,
      paidProvider: true,
    }),
    sentAttempts: () => sentAttempts,
    async createForRun({ sessionId, runKind, control, onEvent }) {
      return Object.freeze({
        descriptor: () => Object.freeze({
          kind: "live_keychain_isolated_worker_byok_structured_json_schema",
          modelVersion: providerProfile.model,
          promptVersion: ROSTER_STRATEGIST_PROMPT_PACK_V1,
          providerProfileId: providerProfile.providerProfileId,
          paidProviderCalls: true,
          trainingTruth: false,
        }),
        async deliberate(request) {
          await onEvent?.({ type: "round_started", roundKind: request.roundKind,
            roundIndex: request.roundIndex, replayed: false,
            at: new Date().toISOString() });
          // Cancellation is checked BEFORE the send: a cancelled round never
          // reaches the Provider (no duplicate, no late paid call).
          if (control?.cancelled?.() === true) {
            throw Object.assign(new Error("ROSTER_WORKSPACE_CANCELLED"),
              { code: "ROSTER_WORKSPACE_CANCELLED" });
          }
          // Hard physical-call cap enforced before any byte is sent.
          if (sentAttempts >= MAX_PHYSICAL_CALLS) {
            throw Object.assign(
              new Error("S271_PHYSICAL_CALL_CAP_REACHED"),
              { code: "S271_PHYSICAL_CALL_CAP_REACHED" });
          }
          sentAttempts += 1;
          const contract = rosterStrategistRoundOutputContractV1(
            request.roundKind);
          const contractRef = outputContractRefStarcraftTmgV1(contract);
          const body = {
            model: live.egressBinding.model,
            instructions: LIVE_INSTRUCTIONS,
            input: JSON.stringify({
              promptPack: request.promptPack,
              promptNodes: request.promptNodes,
              userMessage: request.userMessage,
              responseContract: request.responseContract,
            }),
            reasoning: { effort: "none" },
            temperature: live.egressBinding.temperature,
            top_p: live.egressBinding.topP,
            max_output_tokens: Math.min(
              Number(request.maxOutputUnits)
                || live.egressBinding.maxOutputUnits,
              live.egressBinding.maxOutputUnits),
            stream: false,
            text: { format: { type: "json_schema", name: contract.schemaName,
              schema: clone(contract.providerSchema) } },
          };
          const callStarted = Date.now();
          let result;
          try {
            result = await live.workerPort.send({
              workerRef: live.workerRef,
              requestId: `s271-${runKind}-${sessionId}-round-${request.roundIndex}`,
              endpoint: clone(live.egressBinding.endpoint),
              body,
              outputContractRef: clone(contractRef),
            });
          } catch (error) {
            const receipt = error?.safeReceipt || null;
            await onEvent?.({ type: "round_failed",
              roundKind: request.roundKind, roundIndex: request.roundIndex,
              code: String(error?.code || error?.message || ""),
              paidProviderCall: false, at: new Date().toISOString() });
            if (receipt && AUTH_STOP_CODES.has(Number(receipt.status))) {
              throw Object.assign(new Error("S271_PROVIDER_AUTH_STOP"),
                { code: "S271_PROVIDER_AUTH_STOP",
                  safeStatus: receipt.status });
            }
            if (receipt?.requestMayHaveBeenSent === true
              || receipt?.requestDefinitelyNotSent !== true) {
              throw Object.assign(new Error("S271_AMBIGUOUS_DISPATCH_STOP"),
                { code: "S271_AMBIGUOUS_DISPATCH_STOP",
                  safeReceipt: clone(receipt) });
            }
            throw error;
          }
          const latencyMs = Date.now() - callStarted;
          const payload = result.payload;
          const usage = responsesUsage(payload?.usage);
          const recordReceipt = (output, validation, normalization) => {
            if (!usage) return;
            live.receipts.push({
              receiptHash: result.transportReceipt.receiptHash,
              providerId: providerProfile.provider,
              requestedModel: result.transportReceipt.requestedModel,
              reportedModel: typeof payload?.model === "string"
                ? payload.model : null,
              status: result.status,
              usage: clone(usage),
              latencyMs,
              physicalAttempts: result.physicalAttempts,
              automaticRetries: 0,
              startedAt: result.transportReceipt.startedAt,
              finishedAt: result.transportReceipt.finishedAt,
              outputContractRef: clone(contractRef),
              schemaHash: result.transportReceipt.schemaHash,
              requestBodyHash: result.transportReceipt.requestBodyHash,
              responseFingerprint: output
                ? hashStarcraftTmgContract(output) : null,
              localSchemaValidation: validation ? {
                ok: validation.ok === true,
                valueHash: validation.valueHash,
                schemaHash: validation.schemaHash,
              } : null,
              responseNormalization: normalization ? {
                kind: normalization.kind,
                changed: normalization.changed,
              } : null,
              rawPayloadPersisted: false,
              rawOutputTextPersisted: false,
              trainingTruth: false,
            });
            // Persist redacted receipts after EVERY call so an interrupted
            // acceptance still leaves honest paid evidence on disk.
            void writeJson(RECEIPTS_PATH, {
              schemaVersion: "starcraft_tmg_s271_redacted_provider_receipts_v1",
              receipts: live.receipts,
              rawCredentialPersisted: false,
              trainingTruth: false,
            }).catch(() => {});
          };
          const failRound = async (code, output, validation,
            normalization) => {
            recordReceipt(output, validation, normalization);
            await onEvent?.({ type: "round_failed",
              roundKind: request.roundKind, roundIndex: request.roundIndex,
              code, paidProviderCall: Boolean(usage), usage: usage || null,
              latencyMs, receiptHash: result.transportReceipt.receiptHash,
              at: new Date().toISOString() });
            throw Object.assign(new Error(code), { code });
          };
          if (AUTH_STOP_CODES.has(Number(result.status))) {
            throw Object.assign(new Error("S271_PROVIDER_AUTH_STOP"),
              { code: "S271_PROVIDER_AUTH_STOP", safeStatus: result.status });
          }
          if (result.status < 200 || result.status >= 300) {
            await failRound("ROSTER_STRATEGIST_STRUCTURED_HTTP_REJECTED",
              null, null, null);
          }
          if (!usage) {
            await failRound("ROSTER_STRATEGIST_STRUCTURED_USAGE_UNKNOWN",
              null, null, null);
          }
          if (payload.status === "incomplete") {
            await failRound("ROSTER_STRATEGIST_STRUCTURED_OUTPUT_INCOMPLETE",
              null, null, null);
          }
          if (payload.status === "failed" || payload.status !== "completed") {
            await failRound("ROSTER_STRATEGIST_STRUCTURED_OUTPUT_NOT_COMPLETED",
              null, null, null);
          }
          const extracted = responsesOutputText(payload);
          if (extracted.refusal) {
            await failRound("ROSTER_STRATEGIST_STRUCTURED_OUTPUT_REFUSED",
              null, null, null);
          }
          if (!extracted.text) {
            await failRound("ROSTER_STRATEGIST_STRUCTURED_OUTPUT_MISSING",
              null, null, null);
          }
          const normalized = normalizeProviderJsonDocumentV1(extracted.text);
          let output;
          try {
            output = JSON.parse(normalized.text);
          } catch {
            await failRound("ROSTER_STRATEGIST_STRUCTURED_OUTPUT_UNPARSEABLE",
              null, null,
              { kind: normalized.kind,
                changed: normalized.text !== extracted.text });
          }
          const validation = validateStarcraftTmgProviderJsonSchemaValueV1(
            contract.providerSchema, output);
          if (!validation.ok) {
            const detail = validation.issues.slice(0, 8)
              .map((issue) => `${issue.path}:${issue.code}`).join(",");
            await failRound(
              `ROSTER_STRATEGIST_STRUCTURED_OUTPUT_SCHEMA_INVALID:${detail}`,
              output, validation, { kind: normalized.kind,
                changed: normalized.text !== extracted.text });
          }
          recordReceipt(output, validation, {
            kind: normalized.kind, changed: normalized.text !== extracted.text,
          });
          const droppedForbiddenKeyPaths = [];
          const sanitizedOutput = sanitizePublicOutput(
            output, droppedForbiddenKeyPaths, "$");
          const sanitizedRecord = {
            roundKind: request.roundKind,
            roundIndex: request.roundIndex,
            outputHash: hashStarcraftTmgContract(output),
            omittedForSizeCap: false,
            droppedForbiddenKeyPaths,
            sanitizedOutput,
          };
          const receiptBody = {
            providerKind:
              "live_keychain_isolated_worker_byok_structured_json_schema",
            modelVersion: typeof payload.model === "string"
              ? payload.model : providerProfile.model,
            promptVersion: ROSTER_STRATEGIST_PROMPT_PACK_V1,
            roundKind: request.roundKind,
            contextHash: request.contextHash,
            outputHash: hashStarcraftTmgContract(output),
            outputContractRef: clone(contractRef),
            usage: clone(usage),
            latencyMs,
            providerReceiptHash: result.transportReceipt.receiptHash,
            paidProviderCall: true,
            trainingTruth: false,
          };
          const receipt = Object.freeze({ ...receiptBody,
            receiptHash: hashStarcraftTmgContract(receiptBody) });
          await onEvent?.({ type: "round_completed",
            roundKind: request.roundKind, roundIndex: request.roundIndex,
            replayed: false, paidProviderCall: true,
            usage: clone(usage), latencyMs,
            receiptHash: receipt.receiptHash,
            sanitizedOutputRecord: sanitizedRecord,
            at: new Date().toISOString() });
          return Object.freeze({ output: clone(output), receipt });
        },
      });
    },
  };
}

// ── tiny static-only server for the honest disconnected state ──────────────
async function startStaticOnlyServer() {
  const MIME = { ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8", ".png": "image/png",
    ".svg": "image/svg+xml", ".webp": "image/webp", ".woff": "font/woff",
    ".woff2": "font/woff2" };
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://static.local");
      const relative = url.pathname === "/" || url.pathname === "/army"
        ? "(tabs)/army.html" : url.pathname.replace(/^\/+/, "");
      const filename = path.resolve(DIST_DIR, relative);
      if (!filename.startsWith(DIST_DIR)) {
        response.writeHead(404); response.end(); return;
      }
      const body = await readFile(filename);
      response.writeHead(200, {
        "content-type": MIME[path.extname(filename)]
          || "application/octet-stream",
        "cache-control": "no-store" });
      response.end(body);
    } catch {
      response.writeHead(404); response.end();
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  return { server, origin: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)) };
}

// ── browser helpers ────────────────────────────────────────────────────────
async function shot(page, name) {
  const file = path.join(EVIDENCE_ROOT, name);
  await page.screenshot({ path: file });
  return { name, hash: await sha256File(file),
    explanation: SCREENSHOT_EXPLANATIONS[name] || "" };
}
async function waitForTestId(page, id, timeoutMs = 60_000) {
  const locator = page.getByTestId(id);
  await locator.waitFor({ state: "visible", timeout: timeoutMs });
  return locator;
}
// Every HTTP failure carries stage/method/route plus the SAFE nested error
// code (workspace `reason` or transport cause code — never a credential), so a
// transport or dispatch failure identifies the actual operation and is
// retained as precise stop evidence instead of being blindly retried.
async function waitForSession(origin, sessionId, predicate, timeoutMs = 240_000,
  stage = "poll_session") {
  const route =
    `${ROSTER_PLANNING_WORKSPACE_API_PREFIX}/sessions/${sessionId}`;
  const started = Date.now();
  let lastSession = null;
  for (;;) {
    let body = null;
    try {
      // `connection: close`: synchronous Rules evaluation between paid rounds
      // blocks the event loop far beyond the server's 5s keep-alive idle
      // timeout; reusing that pooled-but-closing socket is the measured
      // ECONNRESET race. A fresh socket per poll removes it.
      const response = await fetch(`${origin}${route}`,
        { headers: { connection: "close" } });
      body = await response.json().catch(() => null);
    } catch (error) {
      throw Object.assign(new Error(`S271_HTTP_TRANSPORT_FAILURE:${stage}`), {
        code: "S271_HTTP_TRANSPORT_FAILURE",
        http: { stage, method: "GET", route,
          transportCode: error?.cause?.code || error?.code || null },
        cause: error,
      });
    }
    if (body?.ok) {
      lastSession = body.session;
      if (predicate(body.session)) return body.session;
    }
    if (Date.now() - started > timeoutMs) {
      throw Object.assign(new Error("S271_SESSION_WAIT_TIMEOUT"), {
        code: "S271_SESSION_WAIT_TIMEOUT",
        http: { stage, method: "GET", route,
          lastStatus: lastSession?.status ?? null,
          lastFailureCode: lastSession?.failure?.code ?? null,
          lastPhase: lastSession?.progress?.phase ?? null },
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
}
async function api(origin, method, subpath, body, opts = {}) {
  const stage = opts.stage || `${method} ${subpath}`;
  const route = `${ROSTER_PLANNING_WORKSPACE_API_PREFIX}/${subpath}`;
  let response;
  try {
    response = await fetch(`${origin}${route}`, {
      method,
      headers: {
        connection: "close",
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw Object.assign(new Error(`S271_HTTP_TRANSPORT_FAILURE:${stage}`), {
      code: "S271_HTTP_TRANSPORT_FAILURE",
      http: { stage, method, route,
        transportCode: error?.cause?.code || error?.code || null },
      cause: error,
    });
  }
  const parsed = await response.json().catch(() => null);
  return { status: response.status, body: parsed,
    http: { stage, method, route } };
}
function requireOk(result, code) {
  if (result?.body?.ok !== true) {
    throw Object.assign(new Error(
      `${code}:${result?.body?.reason ?? result?.status ?? "no_response"}`),
      { code,
        http: { ...(result?.http || {}), status: result?.status ?? null,
          nestedCode: result?.body?.reason ?? null } });
  }
  return result.body;
}

// ── replay-retained closure journey (0 Provider calls) ─────────────────────
// Drives the same product surface over the RETAINED run-3 paid session. The
// workspace server has no deliberation factory, so every planning-evidence
// claim below comes from the retained drafts; the journey adds zero new paid
// calls and says so in each check's evidence.
async function runReplayRetainedJourney({
  desktop, browser, workspace, screenshots, pageErrors }) {
  // 03 — sessions view from the retained store; no live lane (honest banner)
  await desktop.getByTestId("army-open-roster-planning-top").click();
  await waitForTestId(desktop, "roster-workspace-new-session");
  await waitForTestId(desktop, "roster-workspace-unavailable");
  const sessionList = requireOk(await api(workspace.origin, "GET", "sessions",
    undefined, { stage: "retained_list_sessions" }),
    "S271_SESSION_LIST_FAILED");
  const retainedEntry = sessionList.sessions.find((entry) => (
    entry.status === "planned" && entry.planVersion === 2
      && entry.providerCalls === 4));
  ensure(retainedEntry, "S271_RETAINED_SESSION_MISSING", {
    sessions: sessionList.sessions.map((entry) => ({
      sessionId: entry.sessionId, status: entry.status,
      planVersion: entry.planVersion, providerCalls: entry.providerCalls })) });
  const sessionId = retainedEntry.sessionId;
  screenshots.push(await shot(desktop, "03-desktop-workspace-retained.png"));
  check("ui.workspace_sessions_from_retained_store", true, {
    retainedSessionId: sessionId,
    planVersion: retainedEntry.planVersion,
    providerCalls: retainedEntry.providerCalls,
    liveLaneAttached: false,
    unavailableBannerHonest: true });

  // 06 — retained plan rendered (run-3 paid generation, 0 new calls)
  await desktop.getByTestId(`roster-session-${sessionId.slice(0, 12)}`)
    .click();
  await waitForTestId(desktop, "session-plan");
  const retainedView = requireOk(await api(workspace.origin, "GET",
    `sessions/${sessionId}`, undefined, { stage: "read_retained_session" }),
    "S271_SESSION_READ_FAILED");
  const retainedPlanHash = retainedView.session.plan.planHash;
  screenshots.push(await shot(desktop, "06-desktop-plan-overview.png"));
  check("ui.plan_rendered", true, {
    routeKind: retainedView.session.plan.scoreRoute.routeKind,
    scheduleStatus: retainedView.session.plan.scoreRoute.scheduleStatus,
    evidenceOrigin: "retained_s271_run3_paid_generation" });

  // 07 — candidate compare (retained real verdicts incl. the illegal one)
  const candidatesCard = await waitForTestId(desktop, "session-candidates");
  await candidatesCard.scrollIntoViewIfNeeded();
  screenshots.push(await shot(desktop, "07-desktop-candidate-compare.png"));
  const selectedCandidateId =
    retainedView.session.plan.rosterCandidate?.candidateId ?? null;
  const candidateStatuses = retainedView.session.candidates.map((c) => ({
    id: c.candidate.candidateId,
    legality: c.candidate.legalityStatus,
    rulesError: c.candidate.legalityReceipt?.rulesErrorCode || null,
    rejectionKind: c.candidate.legalityReceipt?.rejectionKind || null,
    minerals: c.verdictSummary?.mineralSpent ?? null,
  }));
  const legalCandidates = candidateStatuses.filter(
    (c) => c.legality === "legal");
  const illegalCandidates = candidateStatuses.filter(
    (c) => c.legality === "illegal");
  check("live.candidate_compare_real_verdicts",
    candidateStatuses.length > 0
      && candidateStatuses.every((c) => (c.legality === "legal"
        ? typeof c.minerals === "number"
        : (typeof c.rulesError === "string" && c.rulesError.length > 0)
          || (typeof c.rejectionKind === "string"
            && c.rejectionKind.length > 0)))
      && legalCandidates.some((c) => c.id === selectedCandidateId),
    { candidateCount: candidateStatuses.length,
      legalCount: legalCandidates.length,
      illegalCount: illegalCandidates.length,
      selectedCandidateId,
      candidateStatuses,
      evidenceOrigin: "retained_s271_run3_paid_generation" });

  // 08 — tool evidence + provenance/cost (retained usage; 0 new calls)
  const evidence = await waitForTestId(desktop, "session-tool-evidence");
  await evidence.scrollIntoViewIfNeeded();
  const provenance = await waitForTestId(desktop, "session-provenance");
  await provenance.scrollIntoViewIfNeeded();
  screenshots.push(await shot(desktop, "08-desktop-evidence-provenance-cost.png"));
  check("live.tool_evidence_and_usage",
    retainedView.session.plan.toolReceiptReferences.length > 0
      && retainedView.session.usage.calls === 4
      && retainedView.session.evidence.mutationZeroProof
        .sourceStateMutationCount === 0,
    { toolReceipts: retainedView.session.plan.toolReceiptReferences.length,
      calls: retainedView.session.usage.calls,
      mutationZero: retainedView.session.evidence.mutationZeroProof
        .sourceStateMutationCount,
      evidenceOrigin: "retained_s271_run3_paid_generation" });

  // 05 — zero-call retained replay resume; rounds marked replayed in the UI
  requireOk(await api(workspace.origin, "POST",
    `sessions/${sessionId}/generate`, { resume: true, replayOnly: true },
    { stage: "retained_replay_resume" }), "S271_REPLAY_RESUME_REJECTED");
  const replayed = await waitForSession(workspace.origin, sessionId,
    (session) => session.status !== "running", 300_000,
    "retained_replay_resume");
  check("live.retained_replay_resume_zero_call",
    replayed.status === "planned"
      && replayed.plan.planHash === retainedPlanHash
      && replayed.usage.calls === 4
      && replayed.progress.rounds.length > 0
      && replayed.progress.rounds.every(
        (round) => round.status === "replayed"),
    { planHash: retainedPlanHash,
      replayedHash: replayed.plan?.planHash,
      calls: replayed.usage?.calls,
      replayedRounds: replayed.progress?.rounds?.length });
  await desktop.reload({ waitUntil: "networkidle" });
  await desktop.getByTestId("army-open-roster-planning-top").click();
  await desktop.getByTestId(`roster-session-${sessionId.slice(0, 12)}`)
    .click();
  const progressCard = await waitForTestId(desktop, "session-progress");
  await progressCard.scrollIntoViewIfNeeded();
  screenshots.push(await shot(desktop, "05-desktop-replay-progress.png"));

  // 09 — manual override (remove the last unit) → Builder verdict + stale
  const workingCard = await waitForTestId(desktop, "session-working-list");
  await workingCard.scrollIntoViewIfNeeded();
  const unitCount = replayed.working.candidateInput.units.length;
  const historyBefore = replayed.working.overrideHistory.length;
  await desktop.getByTestId(`working-remove-${unitCount - 1}`).click();
  await waitForTestId(desktop, "session-stale-banner");
  const afterOverride = requireOk(await api(workspace.origin, "GET",
    `sessions/${sessionId}`, undefined,
    { stage: "read_after_manual_override" }), "S271_SESSION_READ_FAILED");
  screenshots.push(await shot(desktop, "09-desktop-manual-override-stale.png"));
  check("ui.manual_override_builder_verdict_and_stale",
    afterOverride.session.planEvidenceStale === true
      && afterOverride.session.working.verdictSummary !== null
      && afterOverride.session.working.overrideHistory.length
        === historyBefore + 1,
    { verdict: afterOverride.session.working.verdictSummary?.status,
      minerals: afterOverride.session.working.verdictSummary?.mineralSpent });

  // 10 — explicit zero-call restoration: override the working list back to
  // the EXACT plan-selected candidate (derived through the same shared
  // mapping the service uses); the Rules kernel verdict must clear stale.
  const restorationInput = deriveRosterWorkspaceCandidateInputV1(
    retainedView.session.plan.rosterCandidate);
  const restored = requireOk(await api(workspace.origin, "POST",
    `sessions/${sessionId}/override`, { candidateInput: restorationInput },
    { stage: "manual_restoration_override" }), "S271_RESTORATION_FAILED");
  check("live.manual_restoration_zero_call",
    restored.session.planEvidenceStale === false
      && restored.session.working.verdictSummary?.status === "legal"
      && restored.session.working.overrideHistory.length
        === historyBefore + 2,
    { staleCleared: restored.session.planEvidenceStale === false,
      verdict: restored.session.working.verdictSummary?.status,
      minerals: restored.session.working.verdictSummary?.mineralSpent,
      newPaidCalls: 0 });

  // 10 — retained revision evidence (run-3 paid revision produced plan v2)
  await desktop.reload({ waitUntil: "networkidle" });
  await desktop.getByTestId("army-open-roster-planning-top").click();
  await desktop.getByTestId(`roster-session-${sessionId.slice(0, 12)}`)
    .click();
  await waitForTestId(desktop, "session-plan");
  const revisionsCard = await waitForTestId(desktop, "session-revisions");
  await revisionsCard.scrollIntoViewIfNeeded();
  screenshots.push(await shot(desktop, "10-desktop-revision-history-retained.png"));
  check("live.revision_evidence_retained_v2",
    restored.session.plan.planVersion === 2
      && Array.isArray(restored.session.plan.revisions)
      && restored.session.plan.revisions.length > 0
      && restored.session.plan.revisions.every((entry) => (
        typeof entry.reasonText === "string" && entry.reasonText.length > 0)),
    { planVersion: restored.session.plan.planVersion,
      revisionCount: restored.session.plan.revisions.length,
      revisionReasons: restored.session.plan.revisions.map(
        (entry) => entry.reasonText),
      evidenceOrigin: "retained_s271_run3_paid_revision" });

  // 11 — persisted reload resume (the reload above rendered the plan again)
  screenshots.push(await shot(desktop, "11-desktop-reload-resumed.png"));
  check("ui.persisted_reload_resume", true);

  // 12 — export + API-side import round-trip (0 calls) + secret probe
  const provenanceCard = await waitForTestId(desktop, "session-provenance");
  await provenanceCard.scrollIntoViewIfNeeded();
  await desktop.getByTestId("session-export").click();
  await waitForTestId(desktop, "session-export-text");
  screenshots.push(await shot(desktop, "12-desktop-export.png"));
  const exported = requireOk(await api(workspace.origin, "POST",
    `sessions/${sessionId}/export`, {}, { stage: "export_session" }),
    "S271_EXPORT_FAILED");
  const imported = requireOk(await api(workspace.origin, "POST",
    "sessions/import",
    { exportDocument: exported.export.exportDocument },
    { stage: "import_round_trip" }), "S271_IMPORT_FAILED");
  check("live.export_import_round_trip",
    imported.session.plan.planHash === retainedPlanHash
      && exported.export.exportDocument.credentialMaterialIncluded === false,
    { roundTripPlanHashMatch: true });
  const secretProbe = await api(workspace.origin, "POST", "sessions/import", {
    exportDocument: { ...clone(exported.export.exportDocument),
      setup: { ...exported.export.exportDocument.setup },
      bearerToken: "sk-probe-never-accepted" } },
    { stage: "import_secret_probe_expect_reject" });
  check("security.import_secret_rejected_fail_closed",
    secretProbe.body?.ok === false
      && secretProbe.body?.reason === "ROSTER_WORKSPACE_IMPORT_SECRET_REJECTED",
    { reason: secretProbe.body?.reason ?? null,
      status: secretProbe.status });

  // Deliberately INVALID manual edit — only needed when the retained
  // generation contains no illegal candidate (it contains one; fallback kept
  // for parity with the live journey, still 0 Provider calls).
  let deliberateInvalidEdit = {
    exercised: false,
    reason: "not_needed_retained_generation_included_illegal_candidate",
  };
  if (illegalCandidates.length === 0) {
    const current = requireOk(await api(workspace.origin, "GET",
      `sessions/${sessionId}`, undefined,
      { stage: "read_before_deliberate_invalid_edit" }),
      "S271_SESSION_READ_FAILED").session;
    const baseInput = current.working.candidateInput;
    const spent = Number(current.working.verdictSummary?.mineralSpent) || 0;
    const budget = Number(current.setup.mineralBudget) || 2000;
    const copies = Math.min(40, Math.max(2,
      Math.ceil(budget / Math.max(1, spent)) + 1));
    const invalidUnits = [];
    for (let copy = 0; copy < copies; copy += 1) {
      for (const unit of baseInput.units) {
        invalidUnits.push({ ...clone(unit),
          unitInstanceId:
            `deliberate-invalid-${copy}-${invalidUnits.length}` });
      }
    }
    const invalidResult = requireOk(await api(workspace.origin, "POST",
      `sessions/${sessionId}/override`,
      { candidateInput: { ...clone(baseInput), units: invalidUnits } },
      { stage: "deliberate_invalid_manual_edit" }),
      "S271_DELIBERATE_INVALID_EDIT_DISPATCH_FAILED");
    const invalidVerdict = invalidResult.session.working?.verdictSummary;
    deliberateInvalidEdit = {
      exercised: true,
      deliberate: true,
      reason: "retained_candidate_set_contained_no_illegal_candidate",
      edit: `duplicated_the_working_list_${copies}x_to_exceed_the_`
        + `${budget}_mineral_budget`,
      verdictStatus: invalidVerdict?.status ?? null,
      rulesErrorCode: invalidVerdict?.rulesErrorCode ?? null,
    };
    check("live.deliberate_invalid_edit_rules_error",
      Boolean(invalidVerdict) && invalidVerdict.status !== "legal"
        && typeof invalidVerdict.rulesErrorCode === "string"
        && invalidVerdict.rulesErrorCode.length > 0,
      deliberateInvalidEdit);
  }

  // 13-15 — mobile 390px journey over the retained draft (0 calls)
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 }, hasTouch: true,
    reducedMotion: "reduce",
  });
  mobile.on("pageerror", (error) => pageErrors.push(String(error)));
  await mobile.goto(`${workspace.origin}/army`,
    { waitUntil: "networkidle", timeout: 90_000 });
  await waitForTestId(mobile, "army-open-roster-planning-top");
  screenshots.push(await shot(mobile, "13-mobile-army-entry.png"));
  await mobile.getByTestId("army-open-roster-planning-top").click();
  await waitForTestId(mobile, "roster-workspace-new-session");
  // Explicit session: the import round-trip created a second session card.
  await mobile.getByTestId(`roster-session-${sessionId.slice(0, 12)}`)
    .click();
  await waitForTestId(mobile, "session-plan");
  screenshots.push(await shot(mobile, "14-mobile-plan.png"));
  const mobileCandidates = await waitForTestId(mobile, "session-candidates");
  await mobileCandidates.scrollIntoViewIfNeeded();
  const mobileWorking = await waitForTestId(mobile, "session-working-list");
  await mobileWorking.scrollIntoViewIfNeeded();
  screenshots.push(await shot(mobile, "15-mobile-candidates-working.png"));
  const overflow = await mobile.evaluate(() => (
    document.documentElement.scrollWidth
      > document.documentElement.clientWidth + 1));
  check("ui.mobile_390_no_horizontal_overflow", overflow === false, { overflow });
  check("ui.no_page_errors", pageErrors.length === 0,
    { pageErrors: pageErrors.slice(0, 3) });
  await mobile.close();
  await desktop.close();

  return { sessionId, deliberateInvalidEdit };
}

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
  const flags = process.argv.slice(2);
  if (flags.length !== 1 || (flags[0] !== "--live-flash-authorized"
    && flags[0] !== "--replay-retained-authorized")) {
    console.error("S271_LIVE_FLASH_AUTHORIZATION_REQUIRED");
    process.exitCode = 2;
    return;
  }
  const replayRetained = flags[0] === "--replay-retained-authorized";
  if (replayRetained) {
    BUILD_ROOT = CLOSURE_BUILD_ROOT;
    EVIDENCE_ROOT = path.join(BUILD_ROOT, "browser-evidence");
    REPORT_PATH = path.join(BUILD_ROOT,
      "roster-workspace-acceptance-report.json");
    RECEIPTS_PATH = path.join(BUILD_ROOT, "provider-receipts-redacted.json");
    // Retained artifacts are copied, never mutated: the run-3 live build
    // directory (report, receipts, drafts) stays exactly as retained.
    const retainedSource = path.join(LIVE_BUILD_ROOT, "workspace-data");
    ensure(existsSync(path.join(retainedSource, "drafts")),
      "S271_RETAINED_DATA_MISSING", { retainedSource });
    await rm(path.join(BUILD_ROOT, "workspace-data"),
      { recursive: true, force: true });
    await cp(retainedSource, path.join(BUILD_ROOT, "workspace-data"),
      { recursive: true });
  }
  await mkdir(EVIDENCE_ROOT, { recursive: true });

  const scope = auditScope();
  check("scope.commits_within_allowed_paths", scope.outside.length === 0,
    { outside: scope.outside });
  check("scope.no_untracked_outside_allowed_paths",
    scope.untrackedOutside.length === 0,
    { untrackedOutside: scope.untrackedOutside });

  const exportInfo = await ensureWebExport();
  const screenshots = [];

  // ticket-20 mount coexistence check runs concurrently with the journeys.
  const ticket20 = spawn(process.execPath, [
    path.join(ROOT, "scripts/serve-ticket-20-human-agent-web-v1.mjs"),
  ], {
    cwd: ROOT,
    env: { ...process.env, TICKET27_S271_FIXTURE_ROOT: FIXTURE_ROOT },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let ticket20Entry = null;
  let ticket20Stdout = "";
  ticket20.stdout.on("data", (chunk) => {
    ticket20Stdout += chunk;
    if (!ticket20Entry) {
      const line = ticket20Stdout.split("\n")[0];
      try { ticket20Entry = JSON.parse(line); } catch { /* partial line */ }
    }
  });
  let ticket20Stderr = "";
  ticket20.stderr.on("data", (chunk) => { ticket20Stderr += chunk; });

  // ---- secure attachment (Keychain -> isolated Worker, in-memory only)
  let credentialBytes = null;
  let workerPort = null;
  let attached = null;
  let keychainReceipt = null;
  let egressBinding = null;
  let parentCredentialZeroed = "not_applicable_no_credential_loaded";
  let detached = false;
  let browser = null; // closed on every exit path so failures never linger
  let workspace = null; // closed in finally AFTER any active run settles
  let acceptanceSessionId = null; // used by the finally settle-before-detach
  const factory = { current: null };
  try {
    const receipts = [];
    if (!replayRetained) {
      const keychainIngress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
      credentialBytes = keychainIngress.credentialBytes;
      keychainReceipt = clone(keychainIngress.receipt);
      const registry = createStarcraftTmgProviderProfileRegistryV2({
        entries: [{ providerProfile, responsePath: "/responses" }],
        allowedProviders: ["deepseek-openai-compatible-direct"],
      });
      const resolved = await registry.resolveEgressBinding({
        profileRef: {
          id: providerProfile.providerProfileId,
          version: providerProfile.version,
          hash: providerProfile.integrity.hash,
        },
      });
      ensure(resolved.ok === true, "S271_PROFILE_RESOLUTION_FAILED");
      egressBinding = resolved.egressBinding;
      workerPort = createStarcraftTmgStructuredProviderWorkerPortV1({
        providerProfileRegistry: registry, handshakeTimeoutMs: 5_000 });
      attached = await workerPort.attachCredential({
        attachmentId: `s271-workspace-attachment-${Date.now()}`,
        providerProfile,
        credentialBytes,
      });
      ensure(attached?.ok === true && attached.workerRef,
        "S271_SECURE_ATTACHMENT_MISSING");
      ensure(credentialBytes.every((byte) => byte === 0),
        "S271_PARENT_CREDENTIAL_NOT_ZEROED");
      parentCredentialZeroed = true;
      credentialBytes = null;
      factory.current = createLiveFlashDeliberationFactory({
        workerPort, workerRef: attached.workerRef, egressBinding, receipts });
    }

    // ---- workspace server with the live factory
    workspace = await createRosterWorkspaceServerV1({
      fixtureRoot: FIXTURE_ROOT,
      dataDirectory: path.join(BUILD_ROOT, "workspace-data"),
      deliberationFactory: factory.current,
    });

    browser = await chromium.launch();
    const desktop = await browser.newPage({
      viewport: { width: 1500, height: 1050 },
      reducedMotion: "reduce",
    });
    const pageErrors = [];
    desktop.on("pageerror", (error) => pageErrors.push(String(error)));

    // 01 — army entry + manual builder preserved
    await desktop.goto(`${workspace.origin}/army`,
      { waitUntil: "networkidle", timeout: 90_000 });
    await waitForTestId(desktop, "army-open-roster-planning-top");
    await waitForTestId(desktop, "army-new-Terran");
    screenshots.push(await shot(desktop, "01-desktop-army-entry-manual-builder.png"));
    check("ui.entry_points_visible", true);

    // 02 — manual builder still works
    await desktop.getByTestId("army-new-Terran").click();
    await desktop.locator("text=/指挥|Command/").first()
      .waitFor({ state: "visible", timeout: 30_000 });
    screenshots.push(await shot(desktop, "02-desktop-manual-builder-edit.png"));
    check("ui.manual_builder_preserved", true);
    await desktop.goto(`${workspace.origin}/army`,
      { waitUntil: "networkidle", timeout: 90_000 });

    let deliberateInvalidEdit = { exercised: false,
      reason: "not_applicable" };
    if (replayRetained) {
      const replayResult = await runReplayRetainedJourney({
        desktop, browser, workspace, screenshots, pageErrors });
      acceptanceSessionId = replayResult.sessionId;
      deliberateInvalidEdit = replayResult.deliberateInvalidEdit;
    } else {
      // 03 — workspace sessions view (live lane attached)
      await desktop.getByTestId("army-open-roster-planning-top").click();
      await waitForTestId(desktop, "roster-workspace-new-session");
      screenshots.push(await shot(desktop, "03-desktop-workspace-live-ready.png"));
      check("ui.workspace_connected_live", true);

      // 04 — setup
      await desktop.getByTestId("roster-workspace-new-session").click();
      await waitForTestId(desktop, "setup-create-session");
      screenshots.push(await shot(desktop, "04-desktop-setup.png"));
      await desktop.getByTestId("setup-create-session").click();
      await waitForTestId(desktop, "session-generate");
      const sessionListBody = requireOk(await api(workspace.origin, "GET",
        "sessions", undefined, { stage: "list_sessions_after_create" }),
        "S271_SESSION_LIST_FAILED");
      const sessionId = sessionListBody.sessions[0].sessionId;
      acceptanceSessionId = sessionId;

      // 05 — generate: real async progress against live Flash
      await desktop.getByTestId("session-generate").click();
      await waitForTestId(desktop, "session-progress");
      screenshots.push(await shot(desktop, "05-desktop-planning-running.png"));
      // Live Flash rounds are slow (initialization/restart plus the paid rounds
      // is measured in minutes); the wait budget reflects that, strategy is
      // never trimmed to accelerate it.
      const planned = await waitForSession(workspace.origin, sessionId,
        (session) => session.status !== "running", 1_200_000,
        "initial_generate");
      ensure(planned.status === "planned",
        "S271_PLANNING_FAILED",
        { stage: "initial_generate", failure: planned.failure });
      check("live.initial_plan_completed", true, {
        calls: planned.usage?.calls,
        units: planned.usage?.totalUnits,
      });
      const plannedView = requireOk(await api(workspace.origin, "GET",
        `sessions/${sessionId}`, undefined, { stage: "read_planned_session" }),
        "S271_SESSION_READ_FAILED");
      const planHash = plannedView.session.plan.planHash;

      // 06 — plan overview (open THIS session explicitly: a later step creates
      // an additional imported session, so positional selection is not stable)
      await desktop.reload({ waitUntil: "networkidle" });
      await desktop.getByTestId("army-open-roster-planning-top").click();
      await desktop.getByTestId(`roster-session-${sessionId.slice(0, 12)}`)
        .click();
      await waitForTestId(desktop, "session-plan");
      screenshots.push(await shot(desktop, "06-desktop-plan-overview.png"));
      check("ui.plan_rendered", true, {
        routeKind: plannedView.session.plan.scoreRoute.routeKind,
        scheduleStatus: plannedView.session.plan.scoreRoute.scheduleStatus,
      });

      // 07 — candidate compare: report the REAL counts/statuses of this
      // generation. A valid newly generated set must not fail just because it
      // contains no illegal candidate; an illegal-verdict path is exercised
      // separately below via a labelled, deliberately invalid manual edit.
      const candidatesCard = await waitForTestId(desktop, "session-candidates");
      await candidatesCard.scrollIntoViewIfNeeded();
      screenshots.push(await shot(desktop, "07-desktop-candidate-compare.png"));
      const selectedCandidateId =
        plannedView.session.plan.rosterCandidate?.candidateId ?? null;
      const candidateStatuses = plannedView.session.candidates.map((c) => ({
        id: c.candidate.candidateId,
        legality: c.candidate.legalityStatus,
        rulesError: c.candidate.legalityReceipt?.rulesErrorCode || null,
        rejectionKind: c.candidate.legalityReceipt?.rejectionKind || null,
        minerals: c.verdictSummary?.mineralSpent ?? null,
      }));
      const legalCandidates = candidateStatuses.filter(
        (c) => c.legality === "legal");
      const illegalCandidates = candidateStatuses.filter(
        (c) => c.legality === "illegal");
      check("live.candidate_compare_real_verdicts",
        candidateStatuses.length > 0
          && candidateStatuses.every((c) => (c.legality === "legal"
            ? typeof c.minerals === "number"
            : (typeof c.rulesError === "string" && c.rulesError.length > 0)
              || (typeof c.rejectionKind === "string"
                && c.rejectionKind.length > 0)))
          && legalCandidates.some((c) => c.id === selectedCandidateId),
        { candidateCount: candidateStatuses.length,
          legalCount: legalCandidates.length,
          illegalCount: illegalCandidates.length,
          selectedCandidateId,
          candidateStatuses });

      // 08 — tool evidence + provenance/cost
      const evidence = await waitForTestId(desktop, "session-tool-evidence");
      await evidence.scrollIntoViewIfNeeded();
      const provenance = await waitForTestId(desktop, "session-provenance");
      await provenance.scrollIntoViewIfNeeded();
      screenshots.push(await shot(desktop, "08-desktop-evidence-provenance-cost.png"));
      check("live.tool_evidence_and_usage",
        plannedView.session.plan.toolReceiptReferences.length > 0
          && plannedView.session.usage.calls >= 3
          && plannedView.session.evidence.mutationZeroProof
            .sourceStateMutationCount === 0,
        { toolReceipts: plannedView.session.plan.toolReceiptReferences.length,
          calls: plannedView.session.usage.calls,
          mutationZero: plannedView.session.evidence.mutationZeroProof
            .sourceStateMutationCount });

      // zero-call replay resume (retained replies reconstruct the exact plan)
      requireOk(await api(workspace.origin, "POST",
        `sessions/${sessionId}/generate`, { resume: true, replayOnly: true },
        { stage: "retained_replay_resume" }), "S271_REPLAY_RESUME_REJECTED");
      const replayed = await waitForSession(workspace.origin, sessionId,
        (session) => session.status !== "running", 300_000,
        "retained_replay_resume");
      check("live.retained_replay_resume_zero_call",
        replayed.status === "planned"
          && replayed.plan.planHash === planHash
          && replayed.usage.calls === planned.usage.calls,
        { planHash, replayedHash: replayed.plan?.planHash,
          calls: replayed.usage?.calls });

      // 09 — manual override (remove the last unit) → Builder verdict + stale
      const workingCard = await waitForTestId(desktop, "session-working-list");
      await workingCard.scrollIntoViewIfNeeded();
      const unitCount = plannedView.session.working.candidateInput.units.length;
      await desktop.getByTestId(`working-remove-${unitCount - 1}`).click();
      await waitForTestId(desktop, "session-stale-banner");
      const afterOverride = requireOk(await api(workspace.origin, "GET",
        `sessions/${sessionId}`, undefined,
        { stage: "read_after_manual_override" }), "S271_SESSION_READ_FAILED");
      screenshots.push(await shot(desktop, "09-desktop-manual-override-stale.png"));
      check("ui.manual_override_builder_verdict_and_stale",
        afterOverride.session.planEvidenceStale === true
          && afterOverride.session.working.verdictSummary !== null
          && afterOverride.session.working.overrideHistory.length === 1,
        { verdict: afterOverride.session.working.verdictSummary?.status,
          minerals: afterOverride.session.working.verdictSummary?.mineralSpent });

      // 10 — requested revision (1 paid call). The revision reason is derived
      // from the CURRENT working list (unit count and actual Rules-computed
      // spend after the manual edit), never from a historical budget figure.
      const workingAfter = afterOverride.session.working;
      const revisionReasonText = "手动精简了 1 个单位;当前工作清单 "
        + `${workingAfter.candidateInput.units.length} 个单位`
        + (typeof workingAfter.verdictSummary?.mineralSpent === "number"
          ? `,规则内核核定已用 ${workingAfter.verdictSummary.mineralSpent}`
            + `/${afterOverride.session.setup.mineralBudget} 矿物`
          : "")
        + "。请按当前工作清单的实际组成更新得分路线与部署构想。";
      await desktop.getByTestId("session-show-revise").click();
      await waitForTestId(desktop, "session-revise-form");
      await desktop.getByTestId("revision-reason").fill(revisionReasonText);
      await desktop.getByTestId("revision-submit").click();
      const revised = await waitForSession(workspace.origin, sessionId,
        (session) => session.status === "failed" || session.status === "cancelled"
          || (session.status === "planned" && session.plan
            && session.plan.planVersion >= 2),
        600_000, "explicit_revision");
      ensure(revised.status === "planned" && revised.plan.planVersion === 2,
        "S271_REVISION_FAILED",
        { stage: "explicit_revision", failure: revised.failure });
      const revisionsCard = await waitForTestId(desktop, "session-revisions");
      await revisionsCard.scrollIntoViewIfNeeded();
      screenshots.push(await shot(desktop, "10-desktop-revised-plan.png"));
      check("live.revision_completed_v2", true, {
        planVersion: revised.plan.planVersion,
        planStatus: revised.plan.planStatus,
        calls: revised.usage?.calls,
        staleCleared: revised.planEvidenceStale === false,
      });
      check("live.revision_reason_from_current_working_list",
        Array.isArray(revised.plan.revisions)
          && revised.plan.revisions.some(
            (entry) => entry.reasonText === revisionReasonText),
        { reasonText: revisionReasonText });

      // 11 — persisted reload resume (same explicit session)
      await desktop.reload({ waitUntil: "networkidle" });
      await desktop.getByTestId("army-open-roster-planning-top").click();
      await desktop.getByTestId(`roster-session-${sessionId.slice(0, 12)}`)
        .click();
      await waitForTestId(desktop, "session-plan");
      screenshots.push(await shot(desktop, "11-desktop-reload-resumed.png"));
      check("ui.persisted_reload_resume", true);

      // 12 — export + API-side import round-trip
      const provenanceCard = await waitForTestId(desktop, "session-provenance");
      await provenanceCard.scrollIntoViewIfNeeded();
      await desktop.getByTestId("session-export").click();
      await waitForTestId(desktop, "session-export-text");
      screenshots.push(await shot(desktop, "12-desktop-export.png"));
      const exported = requireOk(await api(workspace.origin, "POST",
        `sessions/${sessionId}/export`, {}, { stage: "export_session" }),
        "S271_EXPORT_FAILED");
      const imported = requireOk(await api(workspace.origin, "POST",
        "sessions/import",
        { exportDocument: exported.export.exportDocument },
        { stage: "import_round_trip" }), "S271_IMPORT_FAILED");
      check("live.export_import_round_trip",
        imported.session.plan.planHash === revised.plan.planHash
          && exported.export.exportDocument.credentialMaterialIncluded === false,
        { roundTripPlanHashMatch: true });
      const secretProbe = await api(workspace.origin, "POST", "sessions/import", {
        exportDocument: { ...clone(exported.export.exportDocument),
          setup: { ...exported.export.exportDocument.setup },
          bearerToken: "sk-probe-never-accepted" } },
        { stage: "import_secret_probe_expect_reject" });
      check("security.import_secret_rejected_fail_closed",
        secretProbe.body?.ok === false
          && secretProbe.body?.reason === "ROSTER_WORKSPACE_IMPORT_SECRET_REJECTED",
        { reason: secretProbe.body?.reason ?? null,
          status: secretProbe.status });

      // Deliberately INVALID manual edit — exercised separately and labelled as
      // such. Only needed when the real generation produced no illegal
      // candidate: the illegal-verdict evidence path must still be proven
      // against the authoritative Builder port, never assumed.
      deliberateInvalidEdit = {
        exercised: false,
        reason: "not_needed_generation_included_illegal_candidate",
      };
      if (illegalCandidates.length === 0) {
        const current = requireOk(await api(workspace.origin, "GET",
          `sessions/${sessionId}`, undefined,
          { stage: "read_before_deliberate_invalid_edit" }),
          "S271_SESSION_READ_FAILED").session;
        const baseInput = current.working.candidateInput;
        const spent = Number(current.working.verdictSummary?.mineralSpent) || 0;
        const budget = Number(current.setup.mineralBudget) || 2000;
        const copies = Math.min(40, Math.max(2,
          Math.ceil(budget / Math.max(1, spent)) + 1));
        const invalidUnits = [];
        for (let copy = 0; copy < copies; copy += 1) {
          for (const unit of baseInput.units) {
            invalidUnits.push({ ...clone(unit),
              unitInstanceId:
                `deliberate-invalid-${copy}-${invalidUnits.length}` });
          }
        }
        const invalidResult = requireOk(await api(workspace.origin, "POST",
          `sessions/${sessionId}/override`,
          { candidateInput: { ...clone(baseInput), units: invalidUnits } },
          { stage: "deliberate_invalid_manual_edit" }),
          "S271_DELIBERATE_INVALID_EDIT_DISPATCH_FAILED");
        const invalidVerdict = invalidResult.session.working?.verdictSummary;
        deliberateInvalidEdit = {
          exercised: true,
          deliberate: true,
          reason: "generated_candidate_set_contained_no_illegal_candidate",
          edit: `duplicated_the_working_list_${copies}x_to_exceed_the_`
            + `${budget}_mineral_budget`,
          verdictStatus: invalidVerdict?.status ?? null,
          rulesErrorCode: invalidVerdict?.rulesErrorCode ?? null,
        };
        check("live.deliberate_invalid_edit_rules_error",
          Boolean(invalidVerdict) && invalidVerdict.status !== "legal"
            && typeof invalidVerdict.rulesErrorCode === "string"
            && invalidVerdict.rulesErrorCode.length > 0,
          deliberateInvalidEdit);
      }

      // 13-15 — mobile 390px journey over the persisted draft (no new calls)
      const mobile = await browser.newPage({
        viewport: { width: 390, height: 844 }, hasTouch: true,
        reducedMotion: "reduce",
      });
      mobile.on("pageerror", (error) => pageErrors.push(String(error)));
      await mobile.goto(`${workspace.origin}/army`,
        { waitUntil: "networkidle", timeout: 90_000 });
      await waitForTestId(mobile, "army-open-roster-planning-top");
      screenshots.push(await shot(mobile, "13-mobile-army-entry.png"));
      await mobile.getByTestId("army-open-roster-planning-top").click();
      await waitForTestId(mobile, "roster-workspace-new-session");
      // Explicit session: the import round-trip created a second session card.
      await mobile.getByTestId(`roster-session-${sessionId.slice(0, 12)}`)
        .click();
      await waitForTestId(mobile, "session-plan");
      screenshots.push(await shot(mobile, "14-mobile-plan.png"));
      const mobileCandidates = await waitForTestId(mobile, "session-candidates");
      await mobileCandidates.scrollIntoViewIfNeeded();
      const mobileWorking = await waitForTestId(mobile, "session-working-list");
      await mobileWorking.scrollIntoViewIfNeeded();
      screenshots.push(await shot(mobile, "15-mobile-candidates-working.png"));
      const overflow = await mobile.evaluate(() => (
        document.documentElement.scrollWidth
          > document.documentElement.clientWidth + 1));
      check("ui.mobile_390_no_horizontal_overflow", overflow === false, { overflow });
      check("ui.no_page_errors", pageErrors.length === 0,
        { pageErrors: pageErrors.slice(0, 3) });
      await mobile.close();
      await desktop.close();
    }

    // 16 — honest unavailable state (separate server, no secure lane, 0 calls)
    const offlineServer = await createRosterWorkspaceServerV1({
      fixtureRoot: FIXTURE_ROOT,
      dataDirectory: path.join(BUILD_ROOT, "workspace-data-offline"),
      deliberationFactory: null,
    });
    const offlinePage = await browser.newPage({
      viewport: { width: 1500, height: 1050 }, reducedMotion: "reduce" });
    await offlinePage.goto(`${offlineServer.origin}/army`,
      { waitUntil: "networkidle", timeout: 90_000 });
    await offlinePage.getByTestId("army-open-roster-planning-top").click();
    await waitForTestId(offlinePage, "roster-workspace-unavailable");
    await offlinePage.getByTestId("roster-workspace-new-session").click();
    await offlinePage.getByTestId("setup-create-session").click();
    await offlinePage.getByTestId("session-generate").click();
    const offlineError = await waitForTestId(offlinePage, "roster-workspace-error");
    const offlineErrorText = await offlineError.textContent();
    screenshots.push(await shot(offlinePage, "16-offline-unavailable.png"));
    check("ui.unavailable_state_explicit",
      String(offlineErrorText).includes("ROSTER_WORKSPACE_DELIBERATION_UNAVAILABLE"),
      { offlineErrorText: String(offlineErrorText).slice(0, 120) });
    await offlinePage.close();
    await offlineServer.close();

    // 17 — honest disconnected state (static-only server, no API)
    const staticOnly = await startStaticOnlyServer();
    const disconnectedPage = await browser.newPage({
      viewport: { width: 1500, height: 1050 }, reducedMotion: "reduce" });
    await disconnectedPage.goto(`${staticOnly.origin}/army`,
      { waitUntil: "networkidle", timeout: 90_000 });
    await disconnectedPage.getByTestId("army-open-roster-planning-top").click();
    await waitForTestId(disconnectedPage, "roster-workspace-disconnected");
    screenshots.push(await shot(disconnectedPage, "17-offline-disconnected.png"));
    check("ui.disconnected_state_explicit", true);
    await disconnectedPage.close();
    await staticOnly.close();
    await browser.close();

    // ---- ticket-20 additive mount coexistence (spawned concurrently)
    const ticket20WaitStart = Date.now();
    while (!ticket20Entry && Date.now() - ticket20WaitStart < 300_000) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    ensure(ticket20Entry?.origin, "S271_TICKET20_ENTRY_MISSING",
      { stderr: ticket20Stderr.slice(-300) });
    const fetchJson = async (url, stage) => {
      try {
        const response = await fetch(url,
          { headers: { connection: "close" } });
        return await response.json();
      } catch (error) {
        throw Object.assign(
          new Error(`S271_HTTP_TRANSPORT_FAILURE:${stage}`), {
            code: "S271_HTTP_TRANSPORT_FAILURE",
            http: { stage, method: "GET", route: url,
              transportCode: error?.cause?.code || error?.code || null },
            cause: error,
          });
      }
    };
    const mountedHealth = await fetchJson(
      `${ticket20Entry.origin}${ROSTER_PLANNING_WORKSPACE_API_PREFIX}/health`,
      "ticket20_mount_workspace_health");
    const existingManifest = await fetchJson(
      `${ticket20Entry.origin}/__ticket20/manifest`,
      "ticket20_existing_manifest");
    check("integration.ticket20_additive_mount",
      mountedHealth.ok === true
        && mountedHealth.descriptor?.sourceRoomMutationPossible === false
        && mountedHealth.descriptor?.deliberation?.available === false
        && typeof existingManifest.schemaVersion === "string"
        && existingManifest.roomId === ticket20Entry.roomId,
      { mountOk: mountedHealth.ok,
        deliberationAvailable:
          mountedHealth.descriptor?.deliberation?.available });
    ticket20.kill("SIGTERM");

    // ---- usage/cost accounting
    const totals = receipts.reduce((sum, receipt) => ({
      inputUnits: sum.inputUnits + receipt.usage.inputUnits,
      outputUnits: sum.outputUnits + receipt.usage.outputUnits,
      totalUnits: sum.totalUnits + receipt.usage.totalUnits,
      latencyMs: sum.latencyMs + receipt.latencyMs,
    }), { inputUnits: 0, outputUnits: 0, totalUnits: 0, latencyMs: 0 });
    const pricingReceipts = receipts.map((receipt) => (
      priceStarcraftTmgDeepSeekCurrentUsageV2({
        providerId: receipt.providerId,
        requestedModel: receipt.requestedModel,
        reportedModel: receipt.reportedModel,
        startedAt: receipt.startedAt,
        usage: {
          inputUnits: receipt.usage.inputUnits,
          outputUnits: receipt.usage.outputUnits,
          totalUnits: receipt.usage.totalUnits,
          inputCacheHitUnits: Number(receipt.usage.inputCacheHitUnits || 0),
          inputCacheMissUnits: Number(
            receipt.usage.inputCacheMissUnits ?? receipt.usage.inputUnits),
          reasoningOutputUnits: Number(receipt.usage.reasoningOutputUnits || 0),
        },
      })));
    const totalCostNanoUsd = pricingReceipts.reduce((sum, receipt) => (
      sum + receipt.calculatedCostNanoUsd), 0);
    const totalCostCnyMicros = pricingReceipts.reduce((sum, receipt) => (
      sum + (receipt.calculatedCostCnyMicros
        ?? Math.ceil(receipt.calculatedCostNanoUsd * 8 / 1_000))), 0);
    let retainedEvidence = null;
    if (replayRetained) {
      check("live.zero_new_paid_calls", receipts.length === 0,
        { calls: receipts.length });
      const retainedReceiptsPath =
        path.join(LIVE_BUILD_ROOT, "provider-receipts-redacted.json");
      const retainedReportPath =
        path.join(LIVE_BUILD_ROOT, "roster-workspace-acceptance-report.json");
      const retainedReceipts = JSON.parse(
        await readFile(retainedReceiptsPath, "utf8"));
      const retainedReport = JSON.parse(
        await readFile(retainedReportPath, "utf8"));
      retainedEvidence = {
        origin: "s271_run3_live_flash_paid_generation_and_revision",
        acceptanceSessionId,
        sourceDataPreservedReadOnly:
          "build/ticket-27-slice-271-roster-workspace-v1/workspace-data",
        sourceReceiptsFile:
          "build/ticket-27-slice-271-roster-workspace-v1/provider-receipts-redacted.json",
        sourceReceiptsSha256: await sha256File(retainedReceiptsPath),
        sourceReportFile:
          "build/ticket-27-slice-271-roster-workspace-v1/roster-workspace-acceptance-report.json",
        sourceReportStatus: retainedReport.status,
        sourceReportChecksPassed:
          retainedReport.checks.filter((entry) => entry.ok).length,
        sourceReportFailureCode: retainedReport.failureCode ?? null,
        retainedPhysicalCalls: retainedReceipts.receipts.length,
        retainedTotalUnits: retainedReceipts.receipts.reduce(
          (sum, receipt) => sum + receipt.usage.totalUnits, 0),
        retainedModel:
          retainedReceipts.receipts[0]?.reportedModel ?? null,
        evidenceDistinction:
          "S269-270 produced the separately retained Rules-legal live plan; "
          + "S271 run-3 produced this workspace session's 4-call paid "
          + "generation+revision. This closure run adds 0 paid calls and "
          + "proves the repaired UI over those retained artifacts; no failed "
          + "paid run is relabelled as passed.",
      };
    } else {
      check("live.call_cap_respected",
        receipts.length >= 4 && receipts.length <= MAX_PHYSICAL_CALLS
          && receipts.every((receipt) => receipt.physicalAttempts === 1
            && receipt.automaticRetries === 0
            && receipt.status >= 200 && receipt.status < 300
            && receipt.reportedModel === providerProfile.model),
        { calls: receipts.length, model: providerProfile.model });
    }

    await workspace.close();

    const reportBody = {
      schemaVersion: "starcraft_tmg_s271_roster_workspace_acceptance_report_v1",
      ticket: 27, slice: 271,
      mode: replayRetained
        ? "replay_retained_ui_closure_zero_call" : "live_flash_paid_acceptance",
      status: "passed",
      generatedAt: new Date().toISOString(),
      baseCommit: BASE_COMMIT,
      webExport: exportInfo,
      fixtureRootReadOnly: FIXTURE_ROOT,
      checks,
      screenshots: screenshots.map((entry) => ({
        file: `browser-evidence/${entry.name}`,
        sha256: entry.hash,
        explanation: entry.explanation,
      })),
      live: replayRetained ? {
        newPhysicalCalls: 0,
        evidenceOrigin: "retained_s271_run3_paid_session_reused_zero_new_calls",
        journey: "manual_builder_retained_plan_candidates_evidence_cost_"
          + "replay_resume_manual_override_stale_zero_call_restoration_"
          + "retained_revision_history_reload_export_import_mobile_"
          + "unavailable_disconnected",
        deliberateInvalidEdit,
      } : {
        model: providerProfile.model,
        providerProfileId: providerProfile.providerProfileId,
        providerProfileHash: providerProfile.integrity.hash,
        egressPolicyHash: egressBinding.policyHash,
        workerIsolation: "structured-provider-worker-port-v1",
        endpointDialect: "deepseek_responses_v1",
        structuredOutputCapability: "responses_json_schema",
        schemaSubsetVersion: STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION,
        physicalCalls: receipts.length,
        hardMaximumPhysicalCalls: MAX_PHYSICAL_CALLS,
        automaticRetries: 0,
        usage: totals,
        perCall: receipts.map((receipt) => ({
          receiptHash: receipt.receiptHash,
          status: receipt.status,
          usage: receipt.usage,
          latencyMs: receipt.latencyMs,
        })),
        estimatedCost: {
          snapshotHash: pricingReceipts[0]?.snapshotHash ?? null,
          totalCalculatedCostNanoUsd: totalCostNanoUsd,
          totalCalculatedCostCnyMicros: totalCostCnyMicros,
          note: "provider_pricing_v2_snapshot_estimate_cache_conservative",
        },
        journey: "one_initial_three_round_plan_plus_one_requested_revision",
        replayResume: "zero_call_retained_reply_reconstruction_plan_hash_match",
        deliberateInvalidEdit,
      },
      retained: retainedEvidence,
      credentialHygiene: replayRetained ? {
        ingress: "none_replay_retained_mode_no_credential_loaded",
        secureAttachment: false,
        rawCredentialPersisted: false,
        rawPromptPersisted: false,
        rawResponsePersisted: false,
        credentialInArgumentsOrEnvironment: false,
      } : {
        ingress: "macos_login_keychain_via_existing_ingress_function",
        keychainReceiptHash: keychainReceipt.receiptHash,
        secureAttachment: true,
        parentCredentialZeroed,
        detachCalled: "finally_path",
        rawCredentialPersisted: false,
        rawPromptPersisted: false,
        rawResponsePersisted: false,
        credentialInArgumentsOrEnvironment: false,
      },
      roomMutation: {
        workspaceServerHasNoRoomRoutes: true,
        laboratoryMutationZeroProofAsserted: true,
      },
      honestStates: {
        unavailableState: "typed_deliberation_unavailable_503",
        disconnectedState: "explicit_offline_card",
        stubUsedForRealReply: false,
      },
      trainingTruth: false,
    };
    const report = { ...reportBody,
      reportHash: hashStarcraftTmgContract(reportBody) };
    await writeJson(REPORT_PATH, report);

    // Credential-shaped string scan over report, receipts and evidence names.
    const leakScanTargets = [
      JSON.stringify(report),
      JSON.stringify(receipts),
      screenshots.map((entry) => entry.name).join("\n"),
    ];
    const leakPattern = /sk-[A-Za-z0-9_-]{12,}/u;
    check("security.no_credential_shaped_strings_in_artifacts",
      leakScanTargets.every((target) => !leakPattern.test(target)));

    console.log(replayRetained
      ? `S271 roster workspace closure acceptance passed: `
        + `${checks.length} checks, 0 new physical calls `
        + `(retained run-3 evidence: `
        + `${retainedEvidence.retainedPhysicalCalls} calls / `
        + `${retainedEvidence.retainedTotalUnits} units), `
        + `${screenshots.length} screenshots`
      : `S271 roster workspace acceptance passed: `
        + `${checks.length} checks, ${receipts.length} physical calls `
        + `(cap ${MAX_PHYSICAL_CALLS}), ${totals.totalUnits} reported units, `
        + `~¥${(totalCostCnyMicros / 1_000_000).toFixed(6)}, `
        + `${screenshots.length} screenshots`);
  } catch (error) {
    const code = String(error?.code || "S271_ACCEPTANCE_FAILED");
    // Retain the precise operation evidence (stage/method/route/status and
    // the safe nested error/transport/session-failure code) and stop — no
    // blind restart and no automatic paid or ambiguous POST replay.
    const httpEvidence = error?.http ? clone(error.http) : null;
    await writeJson(REPORT_PATH, {
      schemaVersion: "starcraft_tmg_s271_roster_workspace_acceptance_report_v1",
      ticket: 27, slice: 271,
      status: "failed",
      failureCode: code,
      failureDetail: String(error?.message || "").slice(0, 300),
      safeStatus: error?.safeStatus ?? null,
      stage: typeof error?.stage === "string" ? error.stage : null,
      nestedSessionFailure: error?.failure ? clone(error.failure) : null,
      http: httpEvidence,
      checks,
      automaticRetries: 0,
      rawCredentialPersisted: false,
      trainingTruth: false,
    }).catch(() => {});
    console.error(code, error?.checkId || "", String(error?.message || "").slice(0, 300));
    // Failure path must not leave the concurrent mount-check child alive.
    try { ticket20.kill("SIGTERM"); } catch { /* already exited */ }
    process.exitCode = 1;
  } finally {
    credentialBytes?.fill(0);
    await browser?.close().catch(() => {});
    // NEVER tear down the credential lane while a paid round may still be in
    // flight: the workspace's asynchronous planning task keeps running inside
    // this process even after a journey failure, so give the active session a
    // bounded chance to settle before detach. Otherwise closing the worker
    // port mid-send converts a read-side failure into an ambiguous paid
    // dispatch (measured: PROVIDER_WORKER_EXITED -> S271_AMBIGUOUS_DISPATCH_STOP).
    if (workspace && acceptanceSessionId) {
      const settleDeadline = Date.now() + 240_000;
      for (;;) {
        try {
          const response = await fetch(
            `${workspace.origin}${ROSTER_PLANNING_WORKSPACE_API_PREFIX}`
              + `/sessions/${acceptanceSessionId}`,
            { headers: { connection: "close" } });
          const body = await response.json().catch(() => null);
          if (body?.ok && body.session?.status !== "running") break;
        } catch { /* keep waiting within the bound */ }
        if (Date.now() > settleDeadline) break;
        await new Promise((resolve) => setTimeout(resolve, 2_000));
      }
    }
    await workspace?.close().catch(() => {});
    if (workerPort && attached?.workerRef) {
      await workerPort.detachCredential({
        workerRef: attached.workerRef,
        reason: "ticket-27-s271-acceptance-finished",
      }).then(() => { detached = true; }).catch(() => {});
    }
    await workerPort?.close().catch(() => {});
    // Replay-retained mode never loads a credential; record that explicitly
    // instead of a misleading detached:false.
    await writeJson(path.join(BUILD_ROOT, "credential-detach-status.json"), {
      schemaVersion: "starcraft_tmg_s271_credential_detach_status_v1",
      detached: replayRetained ? "not_applicable_no_credential_attached" : detached,
      recordedAt: new Date().toISOString(),
      trainingTruth: false,
    }).catch(() => {});
  }
}

if (process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
