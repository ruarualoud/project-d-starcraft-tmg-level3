#!/usr/bin/env node

// Ticket 27 / Slices 269-270 — one bounded live 2000-point Agent
// roster-planning session through the existing macOS Keychain -> isolated
// Provider egress Worker BYOK path. Raw credentials never enter the prompt,
// repository, command line, stdout/stderr, report or logs. Stops immediately
// on 401/402/403, ambiguous dispatch or missing secure attachment; never
// silently retries.
//
// Round 6 generation-side repair (sub-slice 269.8+270.7): the deliberation
// port now uses the existing structured Provider Worker
// (structured-provider-worker-port-v1, DeepSeek Responses dialect
// `deepseek_responses_v1`, capability `responses_json_schema`) with the
// roster-strategist strict JSON-schema output contract set v1.0.0, so the
// contracted public field set is enforced at generation time. The runtime's
// normalization boundary and full schema/Rules validation still run on the
// decoded output; nothing is invented, filled or waived.
//
// Reopened list-quality lane (sub-slices 269.13-269.15) and the round-10
// narrative-capacity repair (269.17): the manifest authorized exactly one new
// three-round cycle (repair round 10), which failed closed on a wire-level
// narrative-length bound; the round-10 report is preserved and the original
// ledger and lock are never rewritten. The user then authorized at most
// three additional physical calls recorded OUTSIDE that original ledger and
// lock — one narrative-recovery attempt (recovery round 11) writing its own
// recovery-* artifacts and lock, with local schema checks still first and no
// automatic retry. No twelfth flag exists. Each attempt is separately locked,
// costed and retained with zero automatic retry; 401 / 402 / 403, ambiguous
// dispatch and missing secure attachment still stop immediately and are never
// repairable.

import { mkdir, open, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  buildOfficialRoomArmyAuditV1,
  createOfficialStandardRoomInitialStateAuthorityV1,
  OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1,
} from "../packages/product-composition/official-standard-room-factory-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV1 } from
  "../packages/product-composition/official-current-product-match-runtime-v1.mjs";
import { createOfficialUnitCompositionUpgradeDataBundleV1 } from
  "../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";
import { loadPortableFoundationalStrategyPackV2 } from
  "../packages/strategy-skills/portable-foundational-skill-pack-loader-v2.mjs";
import { STARCRAFT_TMG_TICKET_18_PORTABLE_STRATEGY_PACK_V2 as packManifest } from
  "../content/skill-generation/ticket-18-portable-strategy-pack-v2.mjs";
import { STARCRAFT_TMG_TICKET_23_LIVE_FLASH_PROVIDER_PROFILE_V1 as
  providerProfile } from "../content/provider/ticket-23-live-provider-profiles-v1.mjs";
import {
  createOfficialArmyBuilderQueryPortV1,
} from "../packages/roster-strategist/army-builder-query-port-v1.mjs";
import {
  createPregameSceneLaboratoryV1,
} from "../packages/roster-strategist/pregame-scene-laboratory-v1.mjs";
import {
  createRosterStrategistRuntimeV1,
  ROSTER_STRATEGIST_PROMPT_PACK_V1,
  verifyRosterStrategistSessionReceiptV1,
} from "../packages/roster-strategist/roster-strategist-runtime-v1.mjs";
import {
  ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1,
  rosterStrategistRoundOutputContractRefV1,
  rosterStrategistRoundOutputContractV1,
} from "../packages/roster-strategist/roster-strategist-output-schemas-v1.mjs";
import {
  outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1,
  STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION,
} from "../packages/structured-generation/output-contract-registry-v1.mjs";
import {
  createPresetRosterNoPregamePlanV1,
  serializeRosterPlanV1,
  verifyRosterPlanRoundTripV1,
} from "../packages/roster-strategist/roster-plan-contracts-v1.mjs";
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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_ROOT = path.join(ROOT,
  "build/ticket-27-slices-269-270-live-roster-plan-v1");
const REPORT_PATH = path.join(REPORT_ROOT, "live-report.json");
const LOCK_PATH = path.join(REPORT_ROOT, "one-attempt.lock.json");
const PLAN_PATH = path.join(REPORT_ROOT, "roster-plan.json");
const TRACE_PATH = path.join(REPORT_ROOT, "planning-trace.json");
const TOOL_RECEIPTS_PATH = path.join(REPORT_ROOT, "tool-receipts.json");
const PROVIDER_RECEIPTS_PATH = path.join(REPORT_ROOT,
  "provider-receipts-redacted.json");
const COMPARISON_PATH = path.join(REPORT_ROOT, "preset-comparison.json");
const PUBLIC_OUTPUTS_PATH = path.join(REPORT_ROOT,
  "public-round-outputs.json");
const ROOM_ID = "ticket27-slices-269-270-live-roster-room";
// Narrative-recovery lane (269.17 follow-up): separate ledger and lock, never
// rewriting the original round-series artifacts.
const RECOVERY_FLAG = "--narrative-recovery-after-capacity-policy";
const RECOVERY_ROUND = 11;
// Persisted-round resume (269.19+270.10): zero new Provider calls — the
// round-11 paid public answers are replayed byte-identically through the
// repaired normalization boundary and the full schema/Rules validation, so
// the session can complete without re-asking the model.
const RESUME_FLAG = "--resume-round-11-persisted-outputs";
const RESUME_ROUND = 12;
const RESUME_PATHS = {
  report: path.join(REPORT_ROOT, "resume-report.json"),
  lock: path.join(REPORT_ROOT, "resume-lock.json"),
  plan: path.join(REPORT_ROOT, "resume-roster-plan.json"),
  trace: path.join(REPORT_ROOT, "resume-planning-trace.json"),
  toolReceipts: path.join(REPORT_ROOT, "resume-tool-receipts.json"),
  providerReceipts: path.join(REPORT_ROOT,
    "resume-provider-receipts-redacted.json"),
  comparison: path.join(REPORT_ROOT, "resume-preset-comparison.json"),
  publicOutputs: path.join(REPORT_ROOT, "resume-public-round-outputs.json"),
};
const RECOVERY_PATHS = {
  report: path.join(REPORT_ROOT, "recovery-report.json"),
  lock: path.join(REPORT_ROOT, "recovery-lock.json"),
  plan: path.join(REPORT_ROOT, "recovery-roster-plan.json"),
  trace: path.join(REPORT_ROOT, "recovery-planning-trace.json"),
  toolReceipts: path.join(REPORT_ROOT, "recovery-tool-receipts.json"),
  providerReceipts: path.join(REPORT_ROOT,
    "recovery-provider-receipts-redacted.json"),
  comparison: path.join(REPORT_ROOT, "recovery-preset-comparison.json"),
  publicOutputs: path.join(REPORT_ROOT,
    "recovery-public-round-outputs.json"),
};
const DEFAULT_PATHS = {
  report: REPORT_PATH, lock: LOCK_PATH, plan: PLAN_PATH, trace: TRACE_PATH,
  toolReceipts: TOOL_RECEIPTS_PATH, providerReceipts: PROVIDER_RECEIPTS_PATH,
  comparison: COMPARISON_PATH, publicOutputs: PUBLIC_OUTPUTS_PATH,
};
let activePaths = DEFAULT_PATHS;
const REQUIRED_FLAGS = new Set([
  "--ticket-27-slices-269-270-live-roster-plan-authorized",
  "--paid-deepseek-calls-accepted",
]);
const REPAIR_FLAGS = new Map([
  ["--repair-round-2-after-output-contract-repair", 2],
  ["--repair-round-3-after-envelope-diagnostics", 3],
  ["--repair-round-4-final-envelope-stamp", 4],
  ["--repair-round-5-after-output-alias-normalization", 5],
  ["--repair-round-6-after-strict-schema-generation", 6],
  ["--repair-round-7-after-domain-integer-bounds", 7],
  ["--repair-round-8-after-generation-contract-repair", 8],
  ["--repair-round-9-after-generation-contract-repair", 9],
  ["--repair-round-10-after-list-quality-contracts", 10],
]);
// Failure classes a subsequent explicitly flagged repair attempt may chain
// from: public-output contract violations only (typed validation on the
// decoded output). Auth stops (401/402/403), ambiguous dispatch, missing
// attachment, HTTP rejections, refusals, incomplete output and usage gaps
// are never repairable — they stop the lane immediately.
const REPAIRABLE_FAILURE_CODES = new Set([
  "ROSTER_STRATEGIST_OUTPUT_INVALID",
  "ROSTER_STRATEGIST_FOUNDATION_INVALID",
  "ROSTER_STRATEGIST_PROPOSALS_INVALID",
  "ROSTER_STRATEGIST_COMPARISON_INVALID",
  "ROSTER_STRATEGIST_REVISION_INVALID",
  "ROSTER_STRATEGIST_STRUCTURED_OUTPUT_SCHEMA_INVALID",
]);
const AUTH_STOP_CODES = new Set([401, 402, 403]);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}
function safeCode(error, fallback = "LIVE_ROSTER_PLAN_FAILED") {
  const value = String(error?.code || "").toUpperCase();
  if (/^[A-Z][A-Z0-9_]{2,95}$/u.test(value)) return value;
  const message = String(error?.message || "").split(":")[0];
  return /^[A-Z][A-Z0-9_]{2,95}$/u.test(message) ? message : fallback;
}
function requireCondition(condition, code) {
  if (!condition) throw Object.assign(new Error(code), { code });
}
function flagsAuthorized() {
  const flags = process.argv.slice(2);
  if (flags.includes(RESUME_FLAG)) {
    // The resume lane makes zero Provider calls by construction; it never
    // carries the paid-call authorization flags.
    return flags.length === 1;
  }
  if (flags.includes(RECOVERY_FLAG)) {
    return flags.length === REQUIRED_FLAGS.size + 1
      && flags.every((flag) => REQUIRED_FLAGS.has(flag)
        || flag === RECOVERY_FLAG);
  }
  const base = flags.filter((flag) => REQUIRED_FLAGS.has(flag));
  const repairs = flags.filter((flag) => REPAIR_FLAGS.has(flag));
  return base.length === REQUIRED_FLAGS.size
    && flags.length === base.length + repairs.length
    && repairs.length <= 1;
}
function repairRoundRequested() {
  const flag = process.argv.slice(2).find((entry) => REPAIR_FLAGS.has(entry));
  return flag ? REPAIR_FLAGS.get(flag) : null;
}

async function priorSuccessExists() {
  try {
    const report = JSON.parse(await readFile(REPORT_PATH, "utf8"));
    return report?.status === "passed";
  } catch {
    return false;
  }
}
async function priorAttemptClaimed() {
  try {
    await readFile(LOCK_PATH);
    return true;
  } catch (error) {
    return error?.code !== "ENOENT";
  }
}
async function claimAttempt(runId, startedAt, { repairRound = 1 } = {}) {
  await mkdir(REPORT_ROOT, { recursive: true, mode: 0o700 });
  let handle;
  try {
    // The recovery lock is exclusive-create: exactly one recovery attempt is
    // admitted, ever. The original lane rewrites its lock per admitted
    // repair round.
    const exclusive = activePaths.lock !== LOCK_PATH || repairRound === 1;
    handle = await open(activePaths.lock, exclusive ? "wx" : "w", 0o600);
  } catch (error) {
    throw Object.assign(new Error("LIVE_ROSTER_PLAN_ATTEMPT_ALREADY_CLAIMED"), {
      code: "LIVE_ROSTER_PLAN_ATTEMPT_ALREADY_CLAIMED", cause: error });
  }
  const body = {
    schemaVersion: "starcraft_tmg_ticket_27_live_roster_plan_attempt_lock_v1",
    runId, startedAt, repairRound,
    automaticRetryAllowed: false,
    ambiguousOutcomeNeedsNewUserAuthorization: true,
    trainingTruth: false,
  };
  await handle.writeFile(`${JSON.stringify({
    ...body, lockHash: hashStarcraftTmgContract(body) }, null, 2)}\n`, "utf8");
  await handle.close();
}

async function repairablePriorFailure() {
  try {
    const report = JSON.parse(await readFile(REPORT_PATH, "utf8"));
    return report?.status === "failed"
      && REPAIRABLE_FAILURE_CODES.has(report?.failureCode)
      && report?.automaticRetries === 0
      && Number(report?.providerCallsObserved || 0) >= 0
      ? report : null;
  } catch {
    return null;
  }
}

// Preserve every attempt report instead of overwriting: before a new attempt
// rewrites the single live-report path, the admitted prior failure report is
// copied to its own repair-round file. Idempotent; an already-preserved round
// is never overwritten.
async function preserveAttemptReport(report) {
  const round = Number(report?.repairRound || 1);
  const fileName = `repair-round-${round}-report.json`;
  try {
    await writeFile(path.join(REPORT_ROOT, fileName),
      `${JSON.stringify(report, null, 2)}\n`,
      { encoding: "utf8", mode: 0o600, flag: "wx" });
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
  }
  return `build/ticket-27-slices-269-270-live-roster-plan-v1/${fileName}`;
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8", mode: 0o600 });
  return hashStarcraftTmgContract(value);
}

async function writeSafeFailure(code, runId, startedAt, extra = {}) {
  const { failureDetail, ...rest } = extra;
  const body = {
    schemaVersion: "starcraft_tmg_ticket_27_live_roster_plan_report_v1",
    ticket: 27, slices: [269, 270],
    status: "failed",
    runId, startedAt, failedAt: new Date().toISOString(),
    failureCode: code,
    failureDetail: String(failureDetail || "").slice(0, 200) || null,
    automaticRetries: 0,
    silentRetryPerformed: false,
    rawCredentialPersisted: false,
    rawPromptPersisted: false,
    rawResponsePersisted: false,
    hiddenChainOfThoughtPersisted: false,
    trainingTruth: false,
    ...rest,
  };
  await mkdir(REPORT_ROOT, { recursive: true, mode: 0o700 });
  await writeFile(activePaths.report, `${JSON.stringify({
    ...body, reportHash: hashStarcraftTmgContract(body) }, null, 2)}\n`, {
    encoding: "utf8", mode: 0o600 });
}

// Redacted receipt for one structured-path call: transport receipt metadata,
// parsed usage, schema/contract binding and output fingerprint only. Raw
// payloads and raw output text are never persisted.
function redactedStructuredReceipt({ result, payload, usage, latencyMs,
  output, contractRef, validation, normalization }) {
  return {
    receiptHash: result.transportReceipt.receiptHash,
    providerId: providerProfile.provider,
    requestedModel: result.transportReceipt.requestedModel,
    reportedModel: typeof payload?.model === "string" ? payload.model : null,
    providerRequestIdHash:
      result.transportReceipt.providerRequestIdHash ?? null,
    providerSystemFingerprintHash: null,
    status: result.status,
    usage: clone(usage),
    dnsAddressSetHash: result.transportReceipt.dnsAddressSetHash,
    tlsServerName: result.transportReceipt.tlsServerName,
    tlsCertificateVerificationDisabled: false,
    redirectFollowed: false,
    proxyUsed: false,
    physicalAttempts: result.physicalAttempts,
    automaticRetries: 0,
    startedAt: result.transportReceipt.startedAt,
    finishedAt: result.transportReceipt.finishedAt,
    latencyMs,
    responseFingerprint: output
      ? hashStarcraftTmgContract(output) : null,
    endpointDialect: result.transportReceipt.endpointDialect,
    outputContractRef: clone(contractRef),
    requestBodyHash: result.transportReceipt.requestBodyHash,
    schemaHash: result.transportReceipt.schemaHash,
    payloadHash: result.transportReceipt.payloadHash,
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
  };
}

// Sanitized public deliberation output, persisted so a failure can be
// revalidated offline at zero new Provider cost (sub-slice 269.17
// follow-up). Only the decoded public JSON answer is stored, with any
// hidden-reasoning-shaped key dropped recursively and a per-round byte cap;
// the Provider request body, the raw response text and credentials are
// never persisted. Full public narrative text is preserved by policy.
const FORBIDDEN_PUBLIC_OUTPUT_KEYS = new Set([
  "hidden", "chainofthought", "cot", "scratchpad", "reasoning",
  "reasoningtrace", "internalmonologue", "privatereasoning", "thinking",
  "internalnotes",
]);
const PUBLIC_OUTPUT_MAX_BYTES_PER_ROUND = 262_144;
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
function sanitizedPublicOutputRecord(request, output) {
  const droppedForbiddenKeyPaths = [];
  let sanitizedOutput = sanitizePublicOutput(
    output, droppedForbiddenKeyPaths, "$");
  let omittedForSizeCap = false;
  if (Buffer.byteLength(JSON.stringify(sanitizedOutput), "utf8")
    > PUBLIC_OUTPUT_MAX_BYTES_PER_ROUND) {
    sanitizedOutput = null;
    omittedForSizeCap = true;
  }
  return {
    roundKind: request.roundKind,
    roundIndex: request.roundIndex,
    outputHash: hashStarcraftTmgContract(output),
    omittedForSizeCap,
    droppedForbiddenKeyPaths,
    sanitizedOutput,
  };
}

// DeepSeek Responses usage mapping (same fields as the structured adapter):
// input_tokens/output_tokens/total_tokens plus optional cache and reasoning
// breakdowns. Unknown stays unknown — a missing or inconsistent usage block
// fails the call instead of inventing a zero.
function responsesUsage(value) {
  const integer = (candidate) => Number.isSafeInteger(candidate)
    && candidate >= 0;
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

// Single completed assistant message with exactly one output_text part —
// the same extraction discipline as the structured adapter v1.
function responsesOutputText(payload) {
  if (!Array.isArray(payload?.output)) return { text: null, refusal: false };
  const messages = payload.output.filter((item) => item?.type === "message");
  if (messages.length !== 1 || messages[0].status !== "completed"
    || messages[0].role !== "assistant"
    || !Array.isArray(messages[0].content)) {
    return { text: null, refusal: false };
  }
  const refusals = messages[0].content.filter((part) => (
    part?.type === "refusal"));
  const texts = messages[0].content.filter((part) => (
    part?.type === "output_text" && typeof part.text === "string"));
  return {
    text: texts.length === 1 && messages[0].content.length === 1
      ? texts[0].text : null,
    refusal: refusals.length > 0,
  };
}

const LIVE_INSTRUCTIONS = [
  "You are the StarCraft TMG Roster Strategist answering one bounded "
    + "pregame roster-planning deliberation round.",
  "Answer with a single JSON object that conforms EXACTLY to the JSON "
    + "schema attached to this request. Emit every required field, including "
    + "the request-owned constants schemaVersion and roundKind, with exactly "
    + "the values declared in the input.",
  "All output is public strategy. Never emit hidden chain-of-thought, "
    + "scratchpads or private reasoning fields; the schema forbids them.",
  "Strategy must come from the supplied Skills and your own deliberation. "
    + "The Rules-owned Army Builder menu in the input is the sole legality "
    + "authority: use only recordKeys, compositionKinds and upgradeNames "
    + "from that menu.",
  "Unknown stays unknown: use the declared unknown enums/statuses and "
    + "empty placeholders instead of inventing values.",
  "Unspent minerals are lost (no carryover, no later spend): treat budget "
    + "residue as an explicit opportunity cost. When a near-cap Rules-legal "
    + "candidate is available, select a near-cap candidate or declare the "
    + "public justification in resourceUtilization.",
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

function estimatePricing(receipt) {
  const usage = receipt.usage || {};
  const inputUnits = Number(usage.inputUnits || 0);
  const outputUnits = Number(usage.outputUnits || 0);
  return priceStarcraftTmgDeepSeekCurrentUsageV2({
    providerId: receipt.providerId,
    requestedModel: receipt.requestedModel,
    reportedModel: receipt.reportedModel,
    startedAt: receipt.startedAt,
    usage: {
      inputUnits,
      outputUnits,
      totalUnits: Number(usage.totalUnits || inputUnits + outputUnits),
      inputCacheHitUnits: Number(usage.inputCacheHitUnits || 0),
      inputCacheMissUnits: Number(
        usage.inputCacheMissUnits ?? inputUnits),
      reasoningOutputUnits: Number(usage.reasoningOutputUnits || 0),
    },
  });
}

async function main() {
  if (!flagsAuthorized()) {
    console.error("LIVE_ROSTER_PLAN_EXPLICIT_AUTHORIZATION_REQUIRED");
    process.exitCode = 2;
    return;
  }
  let repairRound = 1;
  let priorFailureReport = null;
  let priorPreservedPath = null;
  const recoveryMode = process.argv.includes(RECOVERY_FLAG);
  const resumeMode = process.argv.includes(RESUME_FLAG);
  let resumeSource = null;
  let callCap = 4;
  if (resumeMode) {
    // Persisted-round resume (269.19+270.10): zero new Provider calls. The
    // round-11 paid public answers are replayed byte-identically through the
    // repaired normalization boundary and full schema/Rules validation.
    // Admitted only while the recovery ledger holds the round-11 nesting
    // failure, the persisted outputs are intact (hash fidelity, nothing
    // dropped) and were generated against the current contract set; the
    // resume lock is exclusive-create — one resume attempt, no retry.
    callCap = 0;
    let recoveryReport = null;
    let recoveryOutputs = null;
    try {
      recoveryReport = JSON.parse(await readFile(
        RECOVERY_PATHS.report, "utf8"));
      recoveryOutputs = JSON.parse(await readFile(
        RECOVERY_PATHS.publicOutputs, "utf8"));
    } catch {
      recoveryReport = null;
    }
    const ROUND_ORDER = ["strategy_foundation", "candidate_proposals",
      "comparison_selection"];
    let wireBindingOk = false;
    if (Array.isArray(recoveryOutputs?.publicOutputs)
      && recoveryOutputs.publicOutputs.length === 3) {
      // Behavioral binding: each persisted answer is revalidated against the
      // CURRENT contract set and must reproduce the round-11 outcome exactly
      // (foundation and proposals pass; the comparison fails with the saved
      // detail byte-identically). This binds the artifact to this code state
      // without trusting any report-level hash field.
      wireBindingOk = recoveryOutputs.publicOutputs.every((entry, index) => {
        const contract = rosterStrategistRoundOutputContractV1(
          entry.roundKind);
        const validation = validateStarcraftTmgProviderJsonSchemaValueV1(
          contract.providerSchema, entry.sanitizedOutput);
        if (index < 2) return validation.ok === true;
        if (validation.ok !== false) return false;
        const detail = "ROSTER_STRATEGIST_STRUCTURED_OUTPUT_SCHEMA_INVALID:"
          + validation.issues.slice(0, 8)
            .map((issue) => `${issue.path}:${issue.code}`).join(",");
        return detail === recoveryReport?.failureDetail;
      });
    }
    if (recoveryReport?.status !== "failed"
      || Number(recoveryReport?.repairRound || 0) !== RECOVERY_ROUND
      || recoveryReport?.failureCode
        !== "ROSTER_STRATEGIST_STRUCTURED_OUTPUT_SCHEMA_INVALID"
      || !Array.isArray(recoveryOutputs?.publicOutputs)
      || recoveryOutputs.publicOutputs.length !== 3
      || recoveryOutputs.publicOutputs.some((entry, index) => (
        entry.roundKind !== ROUND_ORDER[index]
          || entry.droppedForbiddenKeyPaths.length !== 0
          || hashStarcraftTmgContract(entry.sanitizedOutput)
            !== entry.outputHash))
      || wireBindingOk !== true) {
      console.error("LIVE_ROSTER_PLAN_RESUME_NOT_ADMITTED");
      process.exitCode = 2;
      return;
    }
    try {
      await readFile(RESUME_PATHS.report);
      console.error("LIVE_ROSTER_PLAN_RESUME_ALREADY_RECORDED");
      process.exitCode = 2;
      return;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    activePaths = RESUME_PATHS;
    repairRound = RESUME_ROUND;
    priorFailureReport = recoveryReport;
    resumeSource = {
      outputs: recoveryOutputs,
      outputsArtifactHash: recoveryReport.publicOutputsArtifact?.hash ?? null,
      providerReceiptHashesByRoundKind: Object.fromEntries(
        ROUND_ORDER.map((roundKind, index) => [roundKind,
          recoveryReport.providerReceipts?.[index]?.receiptHash ?? null])),
      reportedModel: recoveryReport.provider?.reportedModel
        ?? recoveryReport.providerReceipts?.[0]?.reportedModel ?? null,
    };
  } else if (recoveryMode) {
    // New authorization (269.17 follow-up): at most three additional
    // physical calls recorded outside the original ledger and lock, to
    // produce one valid complete plan after the narrative-capacity repair.
    // Admitted only while the original ledger holds the repairable round-10
    // failure; that report is preserved to repair-round-10-report.json and
    // never rewritten, and the recovery lock is exclusive-create — no
    // automatic retry, no twelfth flag.
    callCap = 3;
    let priorReport = null;
    try {
      priorReport = JSON.parse(await readFile(REPORT_PATH, "utf8"));
    } catch {
      priorReport = null;
    }
    if (priorReport?.status !== "failed"
      || Number(priorReport?.repairRound || 1) !== 10
      || !REPAIRABLE_FAILURE_CODES.has(priorReport?.failureCode)) {
      console.error("LIVE_ROSTER_PLAN_RECOVERY_NOT_ADMITTED");
      process.exitCode = 2;
      return;
    }
    try {
      await readFile(RECOVERY_PATHS.report);
      console.error("LIVE_ROSTER_PLAN_RECOVERY_ALREADY_RECORDED");
      process.exitCode = 2;
      return;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    activePaths = RECOVERY_PATHS;
    repairRound = RECOVERY_ROUND;
    priorFailureReport = priorReport;
    priorPreservedPath = await preserveAttemptReport(priorReport);
  } else if (await priorSuccessExists()) {
    // Reopened list-quality lane (sub-slice 269.16+270.9): the manifest
    // authorizes exactly one new three-round BYOK generation cycle after
    // the round-9 legality pass (940/2000 minerals, unknown VP schedule),
    // chained to the preserved round-9 success report. No eleventh flag
    // exists; any other state still stops the lane.
    const priorReport = JSON.parse(await readFile(REPORT_PATH, "utf8"));
    const requestedRound = repairRoundRequested();
    if (requestedRound !== 10
      || Number(priorReport?.repairRound || 1) !== 9) {
      console.error("LIVE_ROSTER_PLAN_SUCCESS_ALREADY_RECORDED");
      process.exitCode = 2;
      return;
    }
    repairRound = 10;
    priorFailureReport = priorReport;
    priorPreservedPath = await preserveAttemptReport(priorReport);
  } else if (await priorAttemptClaimed()) {
    const requestedRound = repairRoundRequested();
    if (!requestedRound) {
      console.error("LIVE_ROSTER_PLAN_ATTEMPT_ALREADY_CLAIMED");
      process.exitCode = 2;
      return;
    }
    priorFailureReport = await repairablePriorFailure();
    if (!priorFailureReport
      || Number(priorFailureReport.repairRound || 1) !== requestedRound - 1) {
      console.error("LIVE_ROSTER_PLAN_REPAIR_ROUND_NOT_ADMITTED");
      process.exitCode = 2;
      return;
    }
    repairRound = requestedRound;
    priorPreservedPath = await preserveAttemptReport(priorFailureReport);
  }
  const startedAt = new Date().toISOString();
  const runId = `ticket27-269-270-live-${randomUUID()}`;
  let credentialBytes = null;
  let coreWorker = null;
  let attached = null;
  const providerReceipts = [];
  const publicOutputs = [];
  let sentAttempts = 0;
  try {
    await claimAttempt(runId, startedAt, { repairRound });

    // ---- Rules/source/Skill infrastructure (read-only, zero Provider cost)
    const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({
      root: ROOT });
    const bundle = createOfficialUnitCompositionUpgradeDataBundleV1({
      dataset: source.dataset });
    const builderPort = createOfficialArmyBuilderQueryPortV1({
      unitCompositionUpgradeDataBundle: bundle });
    const seatPlan = [
      { label: "player1", seatKey: "player1", roleMode: "supervisor",
        principalType: "human" },
      { label: "player2", seatKey: "player2", roleMode: "supervisor",
        principalType: "human" },
    ];
    const authority = createOfficialStandardRoomInitialStateAuthorityV1({
      dataset: source.dataset, snapshot: source.snapshot,
      serverSeatPlan: seatPlan, roomId: ROOM_ID });
    const rulesRuntime = createOfficialCurrentProductMatchRuntimeV1({
      dataset: source.dataset, state: structuredClone(authority.state) });
    const mapTopologyHash = hashStarcraftTmgContract({
      widthInches: authority.state.board.widthInches,
      heightInches: authority.state.board.heightInches,
      terrain: authority.state.board.terrain,
      accessPoints: authority.state.board.accessPoints,
      battlefieldMapManifestHash:
        authority.compositionEvidence.battlefieldMapManifestHash,
    });
    const laboratoryCore = createPregameSceneLaboratoryV1({
      laboratoryId: "ticket27-s269-270-live-lab",
      sourceState: authority.state,
      sourceRoomRef: { roomId: ROOM_ID, stateRevision: 0 },
      rulesRuntime,
      armyBuilderPort: builderPort,
      matchBinding: authority.matchBinding,
    });
    const toolReceipts = [];
    const laboratory = Object.freeze({
      ...Object.fromEntries(Object.entries({
        labDescriptor: laboratoryCore.labDescriptor,
        proveMutationZero: laboratoryCore.proveMutationZero,
      })),
      ...Object.fromEntries(["querySpatial", "queryProbability",
        "queryThreatExchange", "queryMath", "runScenarioBranch",
        "compareCandidatesSameState", "missionScoringAuthority"].map(
        (name) => [name, (...args) => {
        const receipt = laboratoryCore[name](...args);
        toolReceipts.push(clone(receipt));
        return receipt;
      }])),
    });
    const pack = await loadPortableFoundationalStrategyPackV2({
      root: ROOT, manifest: packManifest });
    const strategist = createRosterStrategistRuntimeV1({
      armyBuilderPort: builderPort, laboratory, strategyPack: pack });
    const skillRoute = strategist.selectSkillRoute({
      ownFactionRecordKey: "tactical_cards:terran_armed_forces",
      opponentFactionRecordKey: "tactical_cards:kerrigan_s_swarm" });

    // ---- Keychain -> isolated Worker BYOK attachment (live lanes only; the
    // resume lane never touches the Keychain, a credential or a Worker)
    let keychainReceipt = null;
    let egressBinding = null;
    let resolved = null;
    let workerRef = null;
    if (!resumeMode) {
      const keychainIngress =
        await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
      credentialBytes = keychainIngress.credentialBytes;
      keychainReceipt = clone(keychainIngress.receipt);
      const registry = createStarcraftTmgProviderProfileRegistryV2({
        entries: [{ providerProfile, responsePath: "/responses" }],
        allowedProviders: ["deepseek-openai-compatible-direct"],
      });
      resolved = await registry.resolveEgressBinding({
        profileRef: {
          id: providerProfile.providerProfileId,
          version: providerProfile.version,
          hash: providerProfile.integrity.hash,
        },
      });
      requireCondition(resolved.ok === true,
        "LIVE_ROSTER_PLAN_PROFILE_RESOLUTION_FAILED");
      egressBinding = resolved.egressBinding;
      coreWorker = createStarcraftTmgStructuredProviderWorkerPortV1({
        providerProfileRegistry: registry,
        handshakeTimeoutMs: 5_000,
      });
      attached = await coreWorker.attachCredential({
        attachmentId: `ticket27-roster-attachment-${runId}`,
        providerProfile,
        credentialBytes,
      });
      requireCondition(attached?.ok === true && attached.workerRef,
        "LIVE_ROSTER_PLAN_SECURE_ATTACHMENT_MISSING");
      requireCondition(credentialBytes.every((byte) => byte === 0),
        "LIVE_ROSTER_PLAN_PARENT_CREDENTIAL_NOT_ZEROED");
      credentialBytes = null;
      workerRef = attached.workerRef;
    }

    // ---- deliberation port
    // Live lanes: strict native schema output through the structured
    // Provider Worker (single flight, never retried), the round's strict
    // JSON schema in `text.format` (DeepSeek Responses `json_schema`).
    // Resume lane: the persisted round-11 paid public answers are replayed
    // byte-identically (fidelity re-hashed per round), zero Provider calls
    // by construction. In both lanes the runtime's normalization boundary
    // and full schema/Rules validation still run on every output; nothing
    // is invented, filled or repaired.
    const liveDeliberation = Object.freeze({
      descriptor: () => Object.freeze({
        kind: "live_keychain_isolated_worker_byok_structured_json_schema",
        modelVersion: providerProfile.model,
        promptVersion: ROSTER_STRATEGIST_PROMPT_PACK_V1,
        providerProfileId: providerProfile.providerProfileId,
        outputContractSetHash:
          ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1.contractSetHash,
        paidProviderCalls: true,
        trainingTruth: false,
      }),
      async deliberate(request) {
        const contract = rosterStrategistRoundOutputContractV1(
          request.roundKind);
        const contractRef = outputContractRefStarcraftTmgV1(contract);
        const body = {
          model: egressBinding.model,
          instructions: LIVE_INSTRUCTIONS,
          input: JSON.stringify({
            promptPack: request.promptPack,
            promptNodes: request.promptNodes,
            userMessage: request.userMessage,
            responseContract: request.responseContract,
          }),
          reasoning: { effort: "none" },
          temperature: egressBinding.temperature,
          top_p: egressBinding.topP,
          max_output_tokens: Math.min(
            Number(request.maxOutputUnits) || egressBinding.maxOutputUnits,
            egressBinding.maxOutputUnits),
          stream: false,
          text: {
            format: {
              type: "json_schema",
              name: contract.schemaName,
              schema: clone(contract.providerSchema),
            },
          },
        };
        const callStarted = Date.now();
        // Hard physical-call cap for this lane (4 for the original repair
        // lane, 3 for the narrative-recovery lane): the cap is enforced
        // locally before any byte is sent, so an over-cap round can never
        // become a paid call.
        if (sentAttempts >= callCap) {
          throw Object.assign(new Error("LIVE_ROSTER_PLAN_PHYSICAL_CALL_CAP"),
            { code: "LIVE_ROSTER_PLAN_PHYSICAL_CALL_CAP" });
        }
        sentAttempts += 1;
        let result;
        try {
          result = await coreWorker.send({
            workerRef,
            requestId: `ticket27-roster-${runId}-round-${request.roundIndex}`,
            endpoint: clone(egressBinding.endpoint),
            body,
            outputContractRef: clone(contractRef),
          });
        } catch (error) {
          const receipt = error?.safeReceipt || null;
          if (receipt && AUTH_STOP_CODES.has(Number(receipt.status))) {
            throw Object.assign(new Error(
              "LIVE_ROSTER_PLAN_PROVIDER_AUTH_STOP"), {
              code: "LIVE_ROSTER_PLAN_PROVIDER_AUTH_STOP",
              safeStatus: receipt.status });
          }
          if (receipt?.requestMayHaveBeenSent === true
            || receipt?.requestDefinitelyNotSent !== true) {
            throw Object.assign(new Error(
              "LIVE_ROSTER_PLAN_AMBIGUOUS_DISPATCH_STOP"), {
              code: "LIVE_ROSTER_PLAN_AMBIGUOUS_DISPATCH_STOP",
              safeReceipt: clone(receipt) });
          }
          throw error;
        }
        const latencyMs = Date.now() - callStarted;
        const payload = result.payload;
        const usage = responsesUsage(payload?.usage);
        const recordUsage = (output, validation, normalization) => {
          if (usage) {
            providerReceipts.push(redactedStructuredReceipt({
              result, payload, usage, latencyMs, output,
              contractRef, validation, normalization }));
          }
        };
        if (AUTH_STOP_CODES.has(Number(result.status))) {
          throw Object.assign(new Error(
            "LIVE_ROSTER_PLAN_PROVIDER_AUTH_STOP"), {
            code: "LIVE_ROSTER_PLAN_PROVIDER_AUTH_STOP",
            safeStatus: result.status });
        }
        if (result.status < 200 || result.status >= 300) {
          recordUsage(null, null, null);
          throw Object.assign(new Error(
            "ROSTER_STRATEGIST_STRUCTURED_HTTP_REJECTED"), {
            code: "ROSTER_STRATEGIST_STRUCTURED_HTTP_REJECTED",
            safeStatus: result.status });
        }
        if (!usage) {
          throw Object.assign(new Error(
            "ROSTER_STRATEGIST_STRUCTURED_USAGE_UNKNOWN"), {
            code: "ROSTER_STRATEGIST_STRUCTURED_USAGE_UNKNOWN" });
        }
        if (payload.status === "incomplete") {
          recordUsage(null, null, null);
          throw Object.assign(new Error(
            "ROSTER_STRATEGIST_STRUCTURED_OUTPUT_INCOMPLETE"), {
            code: "ROSTER_STRATEGIST_STRUCTURED_OUTPUT_INCOMPLETE",
          });
        }
        if (payload.status === "failed" || payload.status !== "completed") {
          recordUsage(null, null, null);
          throw Object.assign(new Error(
            "ROSTER_STRATEGIST_STRUCTURED_OUTPUT_NOT_COMPLETED"), {
            code: "ROSTER_STRATEGIST_STRUCTURED_OUTPUT_NOT_COMPLETED" });
        }
        const extracted = responsesOutputText(payload);
        if (extracted.refusal) {
          recordUsage(null, null, null);
          throw Object.assign(new Error(
            "ROSTER_STRATEGIST_STRUCTURED_OUTPUT_REFUSED"), {
            code: "ROSTER_STRATEGIST_STRUCTURED_OUTPUT_REFUSED" });
        }
        if (!extracted.text) {
          recordUsage(null, null, null);
          throw Object.assign(new Error(
            "ROSTER_STRATEGIST_STRUCTURED_OUTPUT_MISSING"), {
            code: "ROSTER_STRATEGIST_STRUCTURED_OUTPUT_MISSING" });
        }
        // Lossless transport-level JSON normalization only (fence/trailing
        // delimiter repair); semantic content is never altered.
        const normalized = normalizeProviderJsonDocumentV1(extracted.text);
        let output;
        try {
          output = JSON.parse(normalized.text);
        } catch {
          recordUsage(null, null, {
            kind: normalized.kind, changed: normalized.text !== extracted.text,
          });
          throw Object.assign(new Error(
            "ROSTER_STRATEGIST_STRUCTURED_OUTPUT_UNPARSEABLE"), {
            code: "ROSTER_STRATEGIST_STRUCTURED_OUTPUT_UNPARSEABLE" });
        }
        // Persist the sanitized public answer immediately — including when
        // the strict schema below rejects it — so the failure can be
        // revalidated offline at zero new Provider cost. Never the request
        // body, the raw response text or any credential.
        publicOutputs.push(sanitizedPublicOutputRecord(request, output));
        const validation = validateStarcraftTmgProviderJsonSchemaValueV1(
          contract.providerSchema, output);
        if (!validation.ok) {
          recordUsage(output, validation, {
            kind: normalized.kind, changed: normalized.text !== extracted.text,
          });
          const detail = validation.issues.slice(0, 8)
            .map((issue) => `${issue.path}:${issue.code}`).join(",");
          throw Object.assign(new Error(
            `ROSTER_STRATEGIST_STRUCTURED_OUTPUT_SCHEMA_INVALID:${detail}`), {
            code: "ROSTER_STRATEGIST_STRUCTURED_OUTPUT_SCHEMA_INVALID" });
        }
        recordUsage(output, validation, {
          kind: normalized.kind, changed: normalized.text !== extracted.text,
        });
        return Object.freeze({
          output: clone(output),
          receipt: Object.freeze({
            providerKind:
              "live_keychain_isolated_worker_byok_structured_json_schema",
            modelVersion: typeof payload.model === "string"
              ? payload.model : providerProfile.model,
            promptVersion: ROSTER_STRATEGIST_PROMPT_PACK_V1,
            roundKind: request.roundKind,
            contextHash: request.contextHash,
            outputHash: hashStarcraftTmgContract(output),
            outputContractRef: clone(contractRef),
            localSchemaValidationHash: hashStarcraftTmgContract(validation),
            normalizationBoundary:
              "runtime_public_output_normalization_alias_registry_v1",
            usage: clone(usage),
            latencyMs,
            providerReceiptHash: result.transportReceipt.receiptHash,
            paidProviderCall: true,
            trainingTruth: false,
            receiptHash: hashStarcraftTmgContract({
              providerKind:
                "live_keychain_isolated_worker_byok_structured_json_schema",
              roundKind: request.roundKind,
              contextHash: request.contextHash,
              outputHash: hashStarcraftTmgContract(output),
              providerReceiptHash: result.transportReceipt.receiptHash,
            }),
          }),
        });
      },
    });

    // ---- persisted-round replay port (resume lane; zero Provider calls)
    const persistedDeliberation = !resumeMode ? null : Object.freeze({
      descriptor: () => Object.freeze({
        kind: "persisted_round_replay_zero_provider",
        modelVersion: resumeSource.reportedModel || providerProfile.model,
        promptVersion: ROSTER_STRATEGIST_PROMPT_PACK_V1,
        outputContractSetHash:
          ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1.contractSetHash,
        paidProviderCalls: 0,
        realProviderCalls: 0,
        resumedFromRepairRound: RECOVERY_ROUND,
        sourcePublicOutputsArtifactHash: resumeSource.outputsArtifactHash,
        trainingTruth: false,
      }),
      async deliberate(request) {
        const entry = resumeSource.outputs.publicOutputs.find((candidate) => (
          candidate.roundKind === request.roundKind));
        requireCondition(entry, "LIVE_ROSTER_PLAN_RESUME_ROUND_MISSING");
        // Fidelity: the replayed answer must re-hash to the exact bytes the
        // paid call produced (the sanitizer dropped nothing — verified at
        // admission), and the contract-set binding checked at admission
        // proves the answer was generated against the current schema set.
        requireCondition(hashStarcraftTmgContract(entry.sanitizedOutput)
          === entry.outputHash, "LIVE_ROSTER_PLAN_RESUME_FIDELITY_FAILED");
        const receiptBody = {
          providerKind: "persisted_round_replay_zero_provider",
          modelVersion: resumeSource.reportedModel || providerProfile.model,
          promptVersion: ROSTER_STRATEGIST_PROMPT_PACK_V1,
          roundKind: request.roundKind,
          contextHash: request.contextHash,
          outputHash: entry.outputHash,
          sourceProviderReceiptHash: resumeSource
            .providerReceiptHashesByRoundKind[request.roundKind] ?? null,
          usage: null,
          usageStatus: "not_applicable_persisted_replay",
          latencyMs: null,
          paidProviderCall: false,
          trainingTruth: false,
        };
        return Object.freeze({
          output: clone(entry.sanitizedOutput),
          receipt: Object.freeze({ ...receiptBody,
            receiptHash: hashStarcraftTmgContract(receiptBody) }),
        });
      },
    });
    const deliberation = resumeMode ? persistedDeliberation : liveDeliberation;

    // ---- one bounded planning session (live lane or persisted resume)
    const session = await strategist.planRoster({
      sessionId: `ticket27-269-270-${resumeMode ? "resume" : "live"}-${runId}`,
      sideKey: "player1",
      factionRecordKey: "tactical_cards:terran_armed_forces",
      opponentFactionRecordKey: "tactical_cards:kerrigan_s_swarm",
      engagementScale: "Standard",
      mineralBudget: 2000,
      missionBinding: {
        missionRecordKey:
          authority.compositionEvidence.selectedMissionRecordKey,
        deploymentRecordKey:
          authority.compositionEvidence.selectedDeploymentRecordKey,
        mapTopologyHash,
      },
      opponentInformationBoundary: "open_roster",
      versionPins: {
        sourceLockHash: bundle.sourceLockHash,
        sourceSnapshotHash: bundle.sourceSnapshotHash,
        normalizedDatasetHash: bundle.normalizedDatasetHash,
        officialRulesVersion: bundle.officialRulesVersion,
        officialUnitsVersion: bundle.officialUnitsVersion,
        officialCardsVersion: bundle.officialCardsVersion,
      },
    }, { deliberation, maxProposalRounds: 2 });

    if (resumeMode) {
      // Zero new Provider calls by construction: no receipt may exist and
      // the send path was never reachable (no credential was attached).
      requireCondition(providerReceipts.length === 0 && sentAttempts === 0,
        "LIVE_ROSTER_PLAN_RESUME_PROVIDER_CALL_FORBIDDEN");
    } else {
      requireCondition(providerReceipts.length >= 3
        && providerReceipts.length <= callCap,
        "LIVE_ROSTER_PLAN_CALL_DENOMINATOR_DRIFT");
      requireCondition(providerReceipts.every((receipt) => (
        receipt.physicalAttempts === 1 && receipt.automaticRetries === 0
          && receipt.status >= 200 && receipt.status < 300)),
        "LIVE_ROSTER_PLAN_PHYSICAL_ATTEMPT_DRIFT");
      requireCondition(providerReceipts.every((receipt) => (
        receipt.reportedModel === providerProfile.model)),
        "LIVE_ROSTER_PLAN_REPORTED_MODEL_DRIFT");
    }
    requireCondition(verifyRosterStrategistSessionReceiptV1(
      session.sessionReceipt) === true
      && verifyRosterPlanRoundTripV1(session.plan) === true,
      "LIVE_ROSTER_PLAN_SESSION_RECEIPT_INVALID");

    // ---- final roster re-validated through the Rules-owned port
    const selectedInput = session.candidateInputs.find((entry, index) => (
      session.candidates[index].candidateId
        === session.plan.rosterCandidate.candidateId));
    requireCondition(selectedInput, "LIVE_ROSTER_PLAN_SELECTION_INPUT_MISSING");
    const finalValidation = builderPort.evaluateRosterCandidate(
      clone(selectedInput));
    requireCondition(
      finalValidation.schema === "starcraft_tmg_army_builder_roster_verdict_v1"
        && finalValidation.auditResultHash
          === session.plan.rosterCandidate.legalityReceipt.auditResultHash
        && finalValidation.summary.mineralSpent <= 2000,
      "LIVE_ROSTER_PLAN_FINAL_LEGALITY_FAILED");

    // ---- fixed preset roster comparison (explicitly no_pregame_plan)
    const presetAudit = buildOfficialRoomArmyAuditV1(bundle, "player1",
      OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1.player1);
    const presetPlan = createPresetRosterNoPregamePlanV1({
      planId: "preset-standard-2000-player1-live-comparison",
      sideKey: "player1",
      presetBinding: {
        rosterHash: hashStarcraftTmgContract({
          sideKey: "player1",
          recipe: OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1.player1 }),
        armyAuditResultHash: presetAudit.resultHash,
        presetSource: "fixed_standard_2000_recipe",
      },
    });
    const comparison = {
      schemaVersion: "starcraft_tmg_ticket_27_live_preset_comparison_v1",
      matchedConditions: {
        missionRecordKey:
          authority.compositionEvidence.selectedMissionRecordKey,
        deploymentRecordKey:
          authority.compositionEvidence.selectedDeploymentRecordKey,
        mapTopologyHash,
        engagementScale: "Standard",
        mineralBudget: 2000,
        opponentFactionRecordKey: "tactical_cards:kerrigan_s_swarm",
        opponentRoster: "fixed_standard_2000_recipe",
        modelVersion: providerProfile.model,
        skillRouteReceiptHash: skillRoute.receipt.receiptHash,
      },
      presetArm: {
        planStatus: presetPlan.planStatus,
        presetRoster: true,
        planFabricated: false,
        planHash: presetPlan.planHash,
        armyAuditResultHash: presetAudit.resultHash,
        mineralSpent: presetAudit.armyResourceBudgetResult.mineralSpent,
        vespeneSpent: presetAudit.armyResourceBudgetResult.vespeneSpent,
      },
      agentArm: {
        planStatus: session.plan.planStatus,
        planHash: session.plan.planHash,
        sessionReceiptHash: session.sessionReceipt.receiptHash,
        armyAuditResultHash: finalValidation.auditResultHash,
        mineralSpent: finalValidation.summary.mineralSpent,
        vespeneSpent: finalValidation.summary.vespeneSpent,
        selectedCandidateId: session.plan.rosterCandidate.candidateId,
        scoreRouteKind: session.plan.scoreRoute.routeKind,
        toolReceiptReferenceCount:
          session.plan.toolReceiptReferences.length,
      },
      comparisonSeparatedListQualityFromPlayQuality:
        "pregame_list_construction_only_no_match_played",
      trainingTruth: false,
    };

    const mutationProof = laboratoryCore.proveMutationZero();
    requireCondition(mutationProof.sourceStateMutationCount === 0,
      "LIVE_ROSTER_PLAN_SOURCE_MUTATION_DETECTED");

    // ---- artifacts
    const planHashOnDisk = await writeJson(activePaths.plan,
      JSON.parse(serializeRosterPlanV1(session.plan)));
    const traceHash = await writeJson(activePaths.trace, {
      planningTrace: session.planningTrace,
      deliberationReceipts: session.deliberationReceipts,
      sessionReceipt: session.sessionReceipt,
      skillRouteReceipt: skillRoute.receipt,
    });
    const toolReceiptsHash = await writeJson(activePaths.toolReceipts, {
      toolReceipts,
      mutationZeroProof: mutationProof,
    });
    const providerReceiptsHash = await writeJson(activePaths.providerReceipts, {
      providerReceipts,
      keychainReceipt,
      egressPolicyHash: resolved ? resolved.egressBinding.policyHash : null,
      resumeBinding: resumeMode ? {
        providerCalls: 0,
        replayedFromRepairRound: RECOVERY_ROUND,
        sourcePublicOutputsArtifactHash: resumeSource.outputsArtifactHash,
        sourceProviderReceiptHashesByRoundKind:
          resumeSource.providerReceiptHashesByRoundKind,
      } : null,
    });
    const comparisonHash = await writeJson(activePaths.comparison, comparison);
    const publicOutputsHash = await writeJson(activePaths.publicOutputs, {
      schemaVersion: "starcraft_tmg_ticket_27_public_round_outputs_v1",
      status: "passed",
      publicOutputs,
      sanitizedPublicOutputOnly: true,
      hiddenReasoningKeyPathsDropped: publicOutputs.flatMap((entry) => (
        entry.droppedForbiddenKeyPaths)),
      rawRequestPersisted: false,
      rawResponseTextPersisted: false,
      rawCredentialPersisted: false,
      fullPublicNarrativeTextPreserved: true,
      trainingTruth: false,
    });

    const pricingReceipts = providerReceipts.map((receipt) => (
      estimatePricing(receipt)));
    const totals = providerReceipts.reduce((sum, receipt) => ({
      inputUnits: sum.inputUnits + receipt.usage.inputUnits,
      outputUnits: sum.outputUnits + receipt.usage.outputUnits,
      totalUnits: sum.totalUnits + receipt.usage.totalUnits,
      latencyMs: sum.latencyMs + receipt.latencyMs,
    }), { inputUnits: 0, outputUnits: 0, totalUnits: 0, latencyMs: 0 });
    const totalCostNanoUsd = pricingReceipts.reduce((sum, receipt) => (
      sum + receipt.calculatedCostNanoUsd), 0);
    const totalCostCnyMicros = pricingReceipts.reduce((sum, receipt) => (
      sum + (receipt.calculatedCostCnyMicros
        ?? Math.ceil(receipt.calculatedCostNanoUsd * 8 / 1_000))), 0);
    // The resume lane makes no paid call; its cost is exactly zero and the
    // round-11 paid usage stays recorded in the recovery report only.
    const pricingSnapshotHash = pricingReceipts[0]?.snapshotHash ?? null;

    const reportBody = {
      schemaVersion: "starcraft_tmg_ticket_27_live_roster_plan_report_v1",
      ticket: 27, slices: [269, 270],
      status: "passed",
      runId, startedAt, finishedAt: new Date().toISOString(),
      repairRound,
      priorAttemptsChain: priorFailureReport ? {
        admittedRepairFlag: repairRound === RESUME_ROUND
          ? RESUME_FLAG.slice(2) : repairRound === RECOVERY_ROUND
            ? RECOVERY_FLAG.slice(2) : `repair-round-${repairRound}`,
        immediatePriorReport: {
          runId: priorFailureReport.runId,
          reportHash: priorFailureReport.reportHash,
          priorStatus: priorFailureReport.status ?? null,
          failureCode: priorFailureReport.failureCode ?? null,
          failureDetail: priorFailureReport.failureDetail ?? null,
          repairRound: priorFailureReport.repairRound ?? null,
          providerCallsObserved: priorFailureReport.providerCallsObserved,
          providerReceipts: priorFailureReport.providerReceipts ?? null,
          preservedCopyPath: priorPreservedPath,
        },
        earlierRoundsEvidence: {
          round1ProviderReceiptHash:
            "9fe615c205cd69aeb406fb2e342d39969461668d921ccdcb942c9ee1c8ecd9aa",
          round1And2Note:
            "single-report-path design overwrote the round-1/round-2 failure "
            + "reports; round-1 receipt hash retained, round-2 receipt detail "
            + "not retained (honest gap)",
        },
      } : null,
      userAuthorization: { explicitFlags: resumeMode
          ? [RESUME_FLAG] : [...REQUIRED_FLAGS],
        repairRoundFlag: repairRound > 1
          ? (repairRound === RESUME_ROUND
            ? RESUME_FLAG : repairRound === RECOVERY_ROUND
              ? RECOVERY_FLAG : `repair-round-${repairRound}`)
          : null },
      credentialHygiene: resumeMode ? {
        ingress: "none_resume_lane_never_touches_keychain_or_credential",
        keychainReceiptHash: null,
        secretInArguments: false, secretInEnvironment: false,
        rawCredentialPersisted: false, credentialHashPersisted: false,
        parentCredentialZeroed: "not_applicable_no_credential_loaded",
        credentialEnteredPrompt: false,
      } : {
        ingress: "macos_login_keychain_generic_password_via_security_binary",
        keychainReceiptHash: keychainReceipt.receiptHash,
        secretInArguments: false, secretInEnvironment: false,
        rawCredentialPersisted: false, credentialHashPersisted: false,
        parentCredentialZeroed: true,
        credentialEnteredPrompt: false,
      },
      provider: resumeMode ? {
        providerId: providerProfile.provider,
        requestedModel: providerProfile.model,
        reportedModel: resumeSource.reportedModel,
        providerProfileId: providerProfile.providerProfileId,
        providerProfileHash: providerProfile.integrity.hash,
        egressPolicyHash: null,
        workerIsolation: "none_persisted_round_replay",
        endpointDialect: "deepseek_responses_v1",
        structuredOutputCapability: "responses_json_schema",
        deliberationTransport: "persisted_round_replay_zero_provider",
        newProviderCalls: 0,
      } : {
        providerId: providerReceipts[0].providerId,
        requestedModel: providerReceipts[0].requestedModel,
        reportedModel: providerReceipts[0].reportedModel,
        providerProfileId: providerProfile.providerProfileId,
        providerProfileHash: providerProfile.integrity.hash,
        egressPolicyHash: resolved.egressBinding.policyHash,
        workerIsolation: "structured-provider-worker-port-v1",
        endpointDialect: "deepseek_responses_v1",
        structuredOutputCapability: "responses_json_schema",
      },
      generationContract: {
        kind: "deepseek_responses_json_schema_strict",
        contractSetSchema: ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1.schema,
        contractSetVersion:
          ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1.version,
        contractSetHash:
          ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1.contractSetHash,
        schemaSubsetVersion: STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION,
        perRound: Object.fromEntries(Object.entries(
          ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1.contracts)
          .map(([roundKind, entry]) => [roundKind, {
            schemaName: entry.schemaName,
            outputContractHash: entry.outputContractRef.hash,
          }])),
        maxOutputUnitsPerRound: 8_192,
        outputBudgetJustification:
          "8192 units equals the frozen profile outputBudget ceiling and is "
          + "about 6x the largest observed round output (1372 units in the "
          + "round-3 attempt); schema-required fields are bounded text, so "
          + "the budget is sufficient without inviting unbounded prose",
        normalizationBoundaryStillRuns: true,
        fullSchemaAndRulesValidationStillRuns: true,
      },
      usage: {
        calls: providerReceipts.length,
        reportedInputUnits: totals.inputUnits,
        reportedOutputUnits: totals.outputUnits,
        reportedTotalUnits: totals.totalUnits,
        totalLatencyMs: totals.latencyMs,
        perCall: providerReceipts.map((receipt) => ({
          receiptHash: receipt.receiptHash,
          status: receipt.status,
          usage: receipt.usage,
          latencyMs: receipt.latencyMs,
          startedAt: receipt.startedAt,
          finishedAt: receipt.finishedAt,
        })),
      },
      pricing: {
        estimated: !resumeMode,
        estimationNote: resumeMode
          ? "resume lane: zero new Provider calls, zero new cost; the "
            + "round-11 paid usage and cost stay recorded in "
            + "recovery-report.json only"
          : "cache-hit/miss fields filled conservatively (all miss) when the "
            + "provider omits the breakdown",
        snapshotHash: pricingSnapshotHash,
        totalCalculatedCostNanoUsd: totalCostNanoUsd,
        totalCalculatedCostCnyMicros: totalCostCnyMicros,
        pricingReceiptHashes: pricingReceipts.map((receipt) => (
          receipt.receiptHash ?? receipt.pricingHash ?? null)),
      },
      promptPack: ROSTER_STRATEGIST_PROMPT_PACK_V1,
      skillRoute: {
        receiptHash: skillRoute.receipt.receiptHash,
        skillRefs: skillRoute.skillRefs.map((entry) => ({
          role: entry.role, skillId: entry.skillId,
          version: entry.version, skillHash: entry.skillHash })),
      },
      rosterPlan: {
        planHash: session.plan.planHash,
        planStatus: session.plan.planStatus,
        selectedCandidateId: session.plan.rosterCandidate.candidateId,
        finalAuditResultHash: finalValidation.auditResultHash,
        finalVerdictHash: finalValidation.verdictHash,
        mineralSpent: finalValidation.summary.mineralSpent,
        vespeneSpent: finalValidation.summary.vespeneSpent,
        scaleId: finalValidation.summary.scaleId,
        rulesAuthority:
          "official-unit-composition-upgrade-rules-kernel-v1 via the "
          + "read-only Army Builder query port",
        toolReceiptReferenceCount: session.plan.toolReceiptReferences.length,
        hiddenChainOfThoughtIncluded: false,
        planFabricated: false,
      },
      // Reopened list-quality binding (sub-slices 269.13-269.15): the
      // schedule-grounding and budget-utilization outcomes of this actual
      // generated plan, bound from the session receipt.
      listQuality: {
        mineralBudget: 2_000,
        mineralSpent: finalValidation.summary.mineralSpent,
        mineralUnspent: 2_000 - finalValidation.summary.mineralSpent,
        unspentResourceDisposition: "lost",
        nearCapThresholdMinerals:
          session.sessionReceipt.nearCapThresholdMinerals,
        nearCapLegalCandidateAvailable:
          session.sessionReceipt.nearCapLegalCandidateAvailable,
        selectedCandidateNearCap:
          session.sessionReceipt.selectedCandidateNearCap,
        retainedResourceJustificationStatus:
          session.sessionReceipt.retainedResourceJustificationStatus,
        missionScoringAuthorityStatus:
          session.sessionReceipt.missionScoringAuthorityStatus,
        missionScoringAuthorityReceiptHash:
          session.sessionReceipt.missionScoringAuthorityReceiptHash,
        scoreRouteAuthorityStatus:
          session.sessionReceipt.scoreRouteAuthorityStatus,
        scheduleStatus: session.plan.scoreRoute.scheduleStatus,
        narrativeCapacityPolicy:
          session.sessionReceipt.narrativeCapacityPolicy,
        narrativeDisplayWarningCount:
          session.sessionReceipt.narrativeDisplayWarningCount,
      },
      laboratory: {
        descriptorHash: laboratoryCore.labDescriptor().descriptorHash,
        sourceStateHash: mutationProof.sourceStateHash,
        sourceStateMutationCount: mutationProof.sourceStateMutationCount,
        operationCount: mutationProof.operationCount,
        unknownNotZero: true,
      },
      presetComparison: comparison,
      artifacts: {
        rosterPlanJson: { path: path.relative(ROOT, activePaths.plan),
          hash: planHashOnDisk },
        planningTraceJson: { path: path.relative(ROOT, activePaths.trace),
          hash: traceHash },
        toolReceiptsJson: { path: path.relative(ROOT, activePaths.toolReceipts),
          hash: toolReceiptsHash },
        providerReceiptsJson: {
          path: path.relative(ROOT, activePaths.providerReceipts),
          hash: providerReceiptsHash },
        presetComparisonJson: {
          path: path.relative(ROOT, activePaths.comparison),
          hash: comparisonHash },
        publicRoundOutputsJson: {
          path: path.relative(ROOT, activePaths.publicOutputs),
          hash: publicOutputsHash },
      },
      honestGaps: [
        "pregame list construction only: no match was played, so play-quality "
          + "and calibration evidence remain Slice 272 scope",
        "scenario branches are advisory hypothetical geometry; Rules legality "
          + "of placements is not claimed",
        "provider usage cache breakdown is filled conservatively when the "
          + "provider omits it; currency cost is an estimate",
        "strict schema output constrains field presence, types and bounds; "
          + "it cannot judge the strategic quality of the public prose",
      ],
      automaticRetries: 0,
      silentRetryPerformed: false,
      rawPromptPersisted: false,
      rawResponsePersisted: false,
      hiddenChainOfThoughtPersisted: false,
      sourceRefreshPerformed: false,
      trainingTruth: false,
    };
    const report = { ...reportBody,
      reportHash: hashStarcraftTmgContract(reportBody) };
    await writeFile(activePaths.report, `${JSON.stringify(report, null, 2)}\n`, {
      encoding: "utf8", mode: 0o600 });
    console.log(`Ticket 27 Slices 269-270 roster plan passed `
      + `(${resumeMode ? "persisted-resume" : "live"}); `
      + `calls=${providerReceipts.length}; model=${resumeMode
        ? resumeSource.reportedModel : providerReceipts[0].reportedModel}; `
      + `input=${totals.inputUnits}; output=${totals.outputUnits}; `
      + `costCnyMicros=${totalCostCnyMicros}; planHash=${session.plan.planHash}`);
  } catch (error) {
    const code = safeCode(error);
    // Persist the sanitized public answers captured before the failure
    // (including a schema-rejected final answer) so the failure can be
    // revalidated offline at zero new Provider cost. Never the request
    // body, the raw response text or any credential.
    let failurePublicOutputsArtifact = null;
    if (publicOutputs.length > 0) {
      try {
        const failureOutputsHash = await writeJson(activePaths.publicOutputs, {
          schemaVersion: "starcraft_tmg_ticket_27_public_round_outputs_v1",
          status: "failed_partial",
          failureCode: code,
          failureDetail: String(error?.message || "").slice(0, 200) || null,
          publicOutputs,
          sanitizedPublicOutputOnly: true,
          hiddenReasoningKeyPathsDropped: publicOutputs.flatMap((entry) => (
            entry.droppedForbiddenKeyPaths)),
          rawRequestPersisted: false,
          rawResponseTextPersisted: false,
          rawCredentialPersisted: false,
          fullPublicNarrativeTextPreserved: true,
          trainingTruth: false,
        });
        failurePublicOutputsArtifact = {
          path: path.relative(ROOT, activePaths.publicOutputs),
          hash: failureOutputsHash,
        };
      } catch { /* best-effort evidence retention only */ }
    }
    await writeSafeFailure(code, runId, startedAt, {
      failureDetail: String(error?.message || ""),
      repairRound,
      providerCallsObserved: providerReceipts.length,
      providerReceipts: providerReceipts.map((receipt) => ({
        receiptHash: receipt.receiptHash,
        status: receipt.status,
        usage: receipt.usage,
        latencyMs: receipt.latencyMs,
        reportedModel: receipt.reportedModel,
      })),
      publicOutputsArtifact: failurePublicOutputsArtifact,
      safeStatus: error?.safeStatus ?? null,
    }).catch(() => {});
    console.error(code);
    process.exitCode = 1;
  } finally {
    credentialBytes?.fill(0);
    if (coreWorker && attached?.workerRef) {
      await coreWorker.detachCredential({
        workerRef: attached.workerRef, reason: "ticket-27-live-run-finished",
      }).catch(() => {});
    }
    await coreWorker?.close().catch(() => {});
  }
}

if (process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
