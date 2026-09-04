import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import {
  createDisposableOsSkillRunnerV1,
  verifyDisposableOsJobReceiptV1,
} from "./disposable-os-runner-v1.mjs";

export const DSH_PINNED_RUNTIME_SCHEMA =
  "starcraft_tmg_dsh_pinned_runtime_v1";
export const DSH_LIFECYCLE_RECEIPT_SCHEMA =
  "starcraft_tmg_dsh_lifecycle_receipt_v1";
export const DSH_SESSION_PARSE_RECEIPT_SCHEMA =
  "starcraft_tmg_dsh_session_parse_receipt_v1";
export const DSH_VERSION = "0.1.1-rc.2";
export const DSH_NPM_INTEGRITY =
  "sha512-UP1UIh6q3Gme/yXRn/QL2P8IsVlv8Shpg22TRJIZPsCRWLm4CBiA1MUvXmJAfsOEETBMLAl+xWPtFw6ICsN3wg==";
export const DSH_NPM_SHASUM = "1a5112369f1c46b13a6e6f21de8af5e6afd45074";
export const DSH_NPM_TARBALL_SHA256 =
  "47ec05f45ada5ab87779ae18a90456b5ebff5421dc0ff5c179677d65e1c16057";
export const DSH_UPSTREAM_TAG = "dsh-v0.1.1-rc.2";
export const DSH_UPSTREAM_COMMIT =
  "b150a551b8d465e31e418e1b2eaf5e79bbb7d28e";
export const DSH_RUNTIME_PACKAGE_JSON_HASH =
  "0daf52a73affe2ff20ac49f412906626a5c6267812cbdfbb9cc8db771263284e";
export const DSH_RUNTIME_PNPM_LOCK_HASH =
  "dca7c3a75756a8c79986cc18a0c1f30567c7acb7ae9de28a9b29dacdb0510615";
export const DSH_PROFILE_PATCH_HASH =
  "86a70a68adad367f8b3f3c869ae43b00b1df5bcfd89de802c4932ed580d57d4d";
export const DSH_RUNTIME_TREE_HASH =
  "df140b79ab59199aac3141b55611c0386ce70500b897a893e14dd2b06481e1cd";
export const DSH_RUNTIME_TREE_ENTRY_COUNT = 35_962;
export const DSH_RUNTIME_TREE_BYTES = 204_121_239;
export const DSH_EFFECTIVE_CONFIG_DUMP_HASH =
  "b299aa29242140bb5e103aa6d38038c05627bbe7dd7f5a91fef6d77a9d242838";
export const DSH_EFFECTIVE_CONFIG_ROWS_HASH =
  "1da2d9cb8c4ded6c484e46c0934b7147b7dd0797aa88f60f8c745ea471d90985";
export const DSH_EFFECTIVE_CONFIG_ROW_COUNT = 81;
export const DSH_PLUGIN_LOCK_HASH =
  "e72d2353cb36f16b3c494b1d395619a8e6ccf2e4772e239283cdcb5a696f64b9";
export const DSH_PLUGIN_LOCK_PACKAGE_COUNT = 78;
export const DSH_SESSION_FORMAT_VERSION = 0;

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const SESSION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u;
const MAX_SESSION_BYTES = 8 * 1024 * 1024;
const MAX_SESSION_EVENTS = 20_000;

export const DSH_PROFILE_ACTIVE_ROWS = Object.freeze([
  "agent",
  "agent-default-model",
  "agent-loop",
  "headless-runner",
  "headless-startup",
  "llm",
  "session",
  "session-checkpoint-policy",
  "session-persistence-jsonl",
  "session-title",
  "system-prompt",
  "timeout-policy",
  "timer",
  "token-meter",
  "tools",
]);

export const DSH_PROFILE_DISABLED_ROWS = Object.freeze([
  "agent-instructions",
  "approval",
  "attachment-local",
  "bash-sandbox",
  "code-runtime",
  "command-compact",
  "command-feedback",
  "command-goal",
  "commands",
  "compaction-basic",
  "credentials",
  "fs-observation-policy",
  "fs-sandbox",
  "goal",
  "goal-round-driver",
  "hmr",
  "jobs",
  "llm-deepseek",
  "llm-pi-ai",
  "llm-retry",
  "permission",
  "plan-mode",
  "pwsh-sandbox",
  "repeat-tool-reminder",
  "sandbox",
  "sandbox-policy",
  "session-projection",
  "session-query-sqlite",
  "session-telemetry-otel",
  "session-title-llm",
  "settings",
  "shell-env",
  "skill",
  "skill-badge",
  "skill-filesystem",
  "spill-local",
  "spill-policy",
  "subagent",
  "subagent-fork-in-process",
  "subagent-spawn-in-process",
  "subprocess",
  "tool-bash",
  "tool-fs",
  "tool-fs-search",
  "tool-goal",
  "tool-jobs",
  "tool-pwsh",
  "tool-ralph",
  "tool-result-pruner",
  "tool-skill",
  "tool-str-replace-editor",
  "tool-subagent",
  "tool-subagent-control",
  "tool-subagent-fork",
  "tool-subagent-list-agents",
  "tool-subagent-report",
  "tool-todo",
  "tool-web",
  "tool-workflow",
  "typert",
  "typert-gateway",
  "typert-loader",
  "user-questions",
  "web",
  "web-search-deepseek",
  "workflow-worker-thread",
]);

export const DSH_KNOWN_SESSION_EVENT_TYPES = Object.freeze([
  "agent-preset/selected",
  "agent/inbox/spliced",
  "approval/asked",
  "approval/decided",
  "approval/policy",
  "assistant/chunk",
  "assistant/message",
  "command/done",
  "command/run",
  "compaction/end",
  "compaction/prune",
  "compaction/start",
  "compaction/summary",
  "feedback/record",
  "goal/change",
  "hook/invoked",
  "hook/result",
  "llm/retry",
  "llm/retry-started",
  "permission/preset",
  "plan/mode",
  "request/context",
  "request/header",
  "sandbox/mode",
  "schedule/change",
  "session/end-seed",
  "session/title",
  "session/title-llm-request",
  "step/end",
  "step/start",
  "subagent/descriptor",
  "team/member",
  "team/message/delivered",
  "team/message/queued",
  "team/task",
  "todo/write",
  "tool-workflow/agent-end",
  "tool-workflow/agent-start",
  "tool-workflow/run-end",
  "tool-workflow/run-start",
  "tool/call",
  "tool/code-dispatch",
  "tool/code-dispatch-start",
  "tool/result",
  "turn/end",
  "turn/start",
  "user/message",
  "web/deepseek-search-llm-request",
]);

export const DSH_KNOWN_SESSION_EVENT_TYPES_HASH =
  hashStarcraftTmgContract(DSH_KNOWN_SESSION_EVENT_TYPES);

function fail(code, detail = "") {
  const error = new Error(detail ? `${code}:${detail}` : code);
  error.code = code;
  throw error;
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function exactKeys(value, required, optional, code) {
  if (!object(value)) fail(code);
  const allowed = new Set([...required, ...optional]);
  if (required.some((key) => !Object.hasOwn(value, key))
    || Object.keys(value).some((key) => !allowed.has(key))) fail(code);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function nonnegative(value, code) {
  if (!Number.isSafeInteger(value) || value < 0) fail(code);
  return value;
}

function usageFrom(value, code) {
  exactKeys(value, ["inputTokens", "outputTokens"], [
    "cacheReadTokens", "cacheWriteTokens", "reasoningTokens",
  ], code);
  return {
    inputTokens: nonnegative(value.inputTokens, code),
    outputTokens: nonnegative(value.outputTokens, code),
    cacheReadTokens: nonnegative(value.cacheReadTokens ?? 0, code),
    cacheWriteTokens: nonnegative(value.cacheWriteTokens ?? 0, code),
    reasoningTokens: nonnegative(value.reasoningTokens ?? 0, code),
  };
}

function sameUsage(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function addUsage(total, value) {
  for (const key of Object.keys(total)) total[key] += value[key];
}

function assertEventStep(data, openTurn, openStep, code) {
  if (!object(data) || data.turn !== openTurn || data.step !== openStep) fail(code);
}

export function parseDshSessionJsonlV1(text, {
  expectedSessionId,
  expectedAgentPreset,
} = {}) {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > MAX_SESSION_BYTES
    || !text.endsWith("\n")) fail("DSH_SESSION_TEXT_INVALID");
  const lines = text.slice(0, -1).split("\n");
  if (lines.length < 1 || lines.length > MAX_SESSION_EVENTS + 1
    || lines.some((line) => line.length === 0)) fail("DSH_SESSION_LINES_INVALID");
  let header;
  try {
    header = JSON.parse(lines[0]);
  } catch {
    fail("DSH_SESSION_HEADER_JSON_INVALID");
  }
  exactKeys(header, ["type", "version", "id", "createdAt"], [
    "cwd", "parentSession", "seedLength", "origin", "delegationDepth",
    "agentPreset",
  ], "DSH_SESSION_HEADER_SHAPE_INVALID");
  if (header.type !== "session" || header.version !== DSH_SESSION_FORMAT_VERSION
    || !SESSION_ID_PATTERN.test(header.id)
    || !Number.isSafeInteger(header.createdAt) || header.createdAt < 0
    || (expectedSessionId !== undefined && header.id !== expectedSessionId)
    || (expectedAgentPreset !== undefined
      && header.agentPreset !== expectedAgentPreset)
    || (header.delegationDepth ?? 0) !== 0) {
    fail("DSH_SESSION_HEADER_IDENTITY_INVALID");
  }
  if (header.cwd !== undefined && (typeof header.cwd !== "string"
    || !path.isAbsolute(header.cwd))) fail("DSH_SESSION_HEADER_CWD_INVALID");

  const known = new Set(DSH_KNOWN_SESSION_EVENT_TYPES);
  const eventTypeCounts = {};
  const eventHashes = [];
  const ignoredUnknownTypes = [];
  const usage = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    reasoningTokens: 0,
  };
  const stepUsage = new Map();
  let openTurn;
  let openStep;
  let nextTurn = 1;
  let nextStep = 1;
  let pendingCalls = new Set();
  let lastTime = header.createdAt;

  for (let index = 1; index < lines.length; index += 1) {
    let event;
    try {
      event = JSON.parse(lines[index]);
    } catch {
      fail("DSH_SESSION_EVENT_JSON_INVALID", String(index - 1));
    }
    exactKeys(event, ["type", "seq", "time", "data"], [
      "surfaceOp", "sourceEventSeqs", "ignorable",
    ], "DSH_SESSION_EVENT_SHAPE_INVALID");
    const expectedSeq = index - 1;
    if (typeof event.type !== "string" || event.type.length < 1
      || event.seq !== expectedSeq || !Number.isSafeInteger(event.time)
      || event.time < lastTime || !object(event.data)
      || (event.ignorable !== undefined && event.ignorable !== true)) {
      fail("DSH_SESSION_EVENT_ENVELOPE_INVALID", String(expectedSeq));
    }
    lastTime = event.time;
    if (event.sourceEventSeqs !== undefined
      && (!Array.isArray(event.sourceEventSeqs)
        || new Set(event.sourceEventSeqs).size !== event.sourceEventSeqs.length
        || event.sourceEventSeqs.some((seq) => (
          !Number.isSafeInteger(seq) || seq < 0 || seq >= event.seq
        )))) fail("DSH_SESSION_EVENT_SOURCE_INVALID", String(expectedSeq));
    if (!known.has(event.type)) {
      if (event.ignorable !== true) {
        fail("DSH_SESSION_REQUIRED_EVENT_UNKNOWN", event.type);
      }
      ignoredUnknownTypes.push(event.type);
    }
    eventTypeCounts[event.type] = (eventTypeCounts[event.type] ?? 0) + 1;
    eventHashes.push(sha256(lines[index]));

    switch (event.type) {
      case "turn/start":
        if (openTurn !== undefined || !Number.isSafeInteger(event.data.turn)
          || event.data.turn !== nextTurn) fail("DSH_SESSION_TURN_START_INVALID");
        openTurn = event.data.turn;
        nextStep = 1;
        break;
      case "turn/end":
        if (openStep !== undefined || event.data.turn !== openTurn
          || !object(event.data.reason)) fail("DSH_SESSION_TURN_END_INVALID");
        openTurn = undefined;
        nextTurn += 1;
        break;
      case "step/start":
        if (openTurn === undefined || openStep !== undefined
          || event.data.turn !== openTurn || !Number.isSafeInteger(event.data.step)
          || event.data.step !== nextStep) fail("DSH_SESSION_STEP_START_INVALID");
        openStep = event.data.step;
        pendingCalls = new Set();
        break;
      case "step/end": {
        assertEventStep(event.data, openTurn, openStep,
          "DSH_SESSION_STEP_END_INVALID");
        if (pendingCalls.size > 0) fail("DSH_SESSION_TOOL_RESULT_MISSING");
        const key = `${openTurn}:${openStep}`;
        const current = stepUsage.get(key);
        if (current?.message) addUsage(usage, current.message);
        else if (current?.chunk) addUsage(usage, current.chunk);
        openStep = undefined;
        nextStep += 1;
        break;
      }
      case "assistant/chunk":
        assertEventStep(event.data, openTurn, openStep,
          "DSH_SESSION_ASSISTANT_CHUNK_INVALID");
        if (event.data.chunk?.type === "usage") {
          const key = `${openTurn}:${openStep}`;
          const current = stepUsage.get(key) ?? {};
          if (current.chunk) fail("DSH_SESSION_DUPLICATE_USAGE_CHUNK");
          current.chunk = usageFrom(event.data.chunk.usage,
            "DSH_SESSION_USAGE_INVALID");
          stepUsage.set(key, current);
        }
        break;
      case "assistant/message": {
        assertEventStep(event.data, openTurn, openStep,
          "DSH_SESSION_ASSISTANT_MESSAGE_INVALID");
        if (event.data.usage !== undefined) {
          const key = `${openTurn}:${openStep}`;
          const current = stepUsage.get(key) ?? {};
          current.message = usageFrom(event.data.usage,
            "DSH_SESSION_USAGE_INVALID");
          if (current.chunk && !sameUsage(current.chunk, current.message)) {
            fail("DSH_SESSION_USAGE_DISAGREEMENT");
          }
          stepUsage.set(key, current);
        }
        break;
      }
      case "tool/call":
        assertEventStep(event.data, openTurn, openStep,
          "DSH_SESSION_TOOL_CALL_INVALID");
        if (typeof event.data.callId !== "string" || event.data.callId.length < 1
          || typeof event.data.name !== "string" || event.data.name.length < 1
          || typeof event.data.arguments !== "string"
          || pendingCalls.has(event.data.callId)) {
          fail("DSH_SESSION_TOOL_CALL_INVALID");
        }
        pendingCalls.add(event.data.callId);
        break;
      case "tool/result": {
        assertEventStep(event.data, openTurn, openStep,
          "DSH_SESSION_TOOL_RESULT_INVALID");
        const callId = event.data.message?.source?.callId;
        if (typeof callId !== "string" || !pendingCalls.delete(callId)) {
          fail("DSH_SESSION_TOOL_RESULT_INVALID");
        }
        break;
      }
      default:
        break;
    }
  }
  if (openTurn !== undefined || openStep !== undefined) {
    fail("DSH_SESSION_BRACKET_UNCLOSED");
  }
  const totalTokens = usage.inputTokens + usage.outputTokens
    + usage.cacheReadTokens + usage.cacheWriteTokens;
  const body = {
    schemaVersion: DSH_SESSION_PARSE_RECEIPT_SCHEMA,
    sessionIdHash: sha256(header.id),
    formatVersion: header.version,
    agentPreset: header.agentPreset ?? null,
    delegationDepth: header.delegationDepth ?? 0,
    sessionLogHash: sha256(text),
    knownEventTypesHash: DSH_KNOWN_SESSION_EVENT_TYPES_HASH,
    eventCount: lines.length - 1,
    lastSeq: lines.length - 2,
    eventTypeCounts,
    eventHashes,
    ignoredUnknownTypes: [...new Set(ignoredUnknownTypes)].sort(),
    usage: { ...usage, totalTokens },
  };
  return freeze({
    ...body,
    receiptHash: hashStarcraftTmgContract(body),
  });
}

export function verifyDshSessionParseReceiptV1(value) {
  exactKeys(value, [
    "schemaVersion", "sessionIdHash", "formatVersion", "agentPreset",
    "delegationDepth", "sessionLogHash", "knownEventTypesHash",
    "eventCount", "lastSeq", "eventTypeCounts", "eventHashes",
    "ignoredUnknownTypes", "usage", "receiptHash",
  ], [], "DSH_SESSION_RECEIPT_SHAPE_INVALID");
  const { receiptHash, ...body } = value;
  if (value.schemaVersion !== DSH_SESSION_PARSE_RECEIPT_SCHEMA
    || !HASH_PATTERN.test(value.sessionIdHash)
    || !HASH_PATTERN.test(value.sessionLogHash)
    || value.knownEventTypesHash !== DSH_KNOWN_SESSION_EVENT_TYPES_HASH
    || value.formatVersion !== DSH_SESSION_FORMAT_VERSION
    || value.delegationDepth !== 0
    || !Number.isSafeInteger(value.eventCount) || value.eventCount < 0
    || value.lastSeq !== value.eventCount - 1
    || !Array.isArray(value.eventHashes)
    || value.eventHashes.length !== value.eventCount
    || value.eventHashes.some((hash) => !HASH_PATTERN.test(hash))
    || !Array.isArray(value.ignoredUnknownTypes)
    || receiptHash !== hashStarcraftTmgContract(body)) {
    fail("DSH_SESSION_RECEIPT_INVALID");
  }
  const usage = value.usage;
  exactKeys(usage, [
    "inputTokens", "outputTokens", "cacheReadTokens", "cacheWriteTokens",
    "reasoningTokens", "totalTokens",
  ], [], "DSH_SESSION_RECEIPT_USAGE_INVALID");
  for (const [key, amount] of Object.entries(usage)) {
    nonnegative(amount, `DSH_SESSION_RECEIPT_USAGE_INVALID_${key}`);
  }
  if (usage.totalTokens !== usage.inputTokens + usage.outputTokens
    + usage.cacheReadTokens + usage.cacheWriteTokens) {
    fail("DSH_SESSION_RECEIPT_USAGE_TOTAL_INVALID");
  }
  return value;
}

function zeroExternalUsage() {
  return freeze({
    providerCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheHitTokens: 0,
    cacheMissTokens: 0,
    totalTokens: 0,
    estimatedUsd: "0.00000000",
    estimatedCny: "0.00",
  });
}

export const DSH_LIFECYCLE_WORKER_SOURCE = String.raw`import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [requestPath, responsePath] = process.argv.slice(2);
const request = JSON.parse(await readFile(requestPath, "utf8"));
const jobRoot = path.resolve(path.dirname(requestPath), "..");
const runtimeRoot = path.join(jobRoot, "runtime", "vendor");
const tmpRoot = path.join(jobRoot, "tmp");
const dshPackagePath = path.join(runtimeRoot, "node_modules", "@deepseek-ai", "dsh", "package.json");
const dshPackage = JSON.parse(await readFile(dshPackagePath, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

try {
if (request.runtimeTreeHash.length !== 64
  || dshPackage.version !== request.expectedVersion
  || sha256(await readFile(path.join(runtimeRoot, "package.json"))) !== request.packageJsonHash
  || sha256(await readFile(path.join(runtimeRoot, "pnpm-lock.yaml"))) !== request.pnpmLockHash
  || sha256(request.profilePatch) !== request.profilePatchHash) {
  throw new Error("DSH_PINNED_RUNTIME_MISMATCH");
}

process.env.DSH_HOME = path.join(tmpRoot, "dsh-home");
process.env.DSH_TELEMETRY_DISABLED = "1";
process.env.DSH_CWD = path.join(jobRoot, "input");
await mkdir(process.env.DSH_HOME, { recursive: true });
const patchPath = path.join(tmpRoot, "starcraft-skill.patch.yml");
await writeFile(patchPath, request.profilePatch, "utf8");

const dshRequire = createRequire(await realpath(dshPackagePath));
const yamlPath = dshRequire.resolve("js-yaml");
const yaml = await import(pathToFileURL(yamlPath).href);
const jsType = new yaml.Type("tag:yaml.org,2002:js", {
  kind: "scalar",
  construct: (value) => ({ expression: String(value) }),
});
const schema = yaml.DEFAULT_SCHEMA.extend([jsType]);

let captured = "";
const originalWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = (chunk, encoding, callback) => {
  captured += Buffer.isBuffer(chunk) ? chunk.toString(encoding || "utf8") : String(chunk);
  if (typeof encoding === "function") encoding();
  if (typeof callback === "function") callback();
  return true;
};
const dshBin = path.join(runtimeRoot, "node_modules", "@deepseek-ai", "dsh", "lib", "bin.js");
const previousArgv = process.argv;
try {
  process.argv = [process.execPath, dshBin, "--profile", "headless", "--patch", patchPath, "--dump-config"];
  await import(pathToFileURL(dshBin).href);
} finally {
  process.argv = previousArgv;
  process.stdout.write = originalWrite;
}

const normalizedDump = captured.split(jobRoot).join("__JOB_ROOT__");
const yamlBody = normalizedDump.split("\n").filter((line) => !line.startsWith("#")).join("\n");
const parsedRows = yaml.load(yamlBody, { schema });
if (!Array.isArray(parsedRows)) throw new Error("DSH_CONFIG_DUMP_INVALID");

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}
function packageName(pluginName) {
  const parts = pluginName.split("/");
  return pluginName.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}
function findPackageManifest(name) {
  for (const searchRoot of dshRequire.resolve.paths(name) || []) {
    const candidate = path.join(searchRoot, name, "package.json");
    if (existsSync(candidate)) return candidate;
  }
  throw new Error("DSH_PLUGIN_PACKAGE_MISSING:" + name);
}

const rows = parsedRows.map((row) => ({
  id: row.id,
  name: row.name || null,
  disabled: row.disabled === true,
  configHash: sha256(JSON.stringify(stable(row.config ?? null))),
})).sort((left, right) => left.id.localeCompare(right.id));
const activeRows = rows.filter((row) => !row.disabled).map((row) => row.id);
const disabledRows = rows.filter((row) => row.disabled).map((row) => row.id);
if (JSON.stringify(activeRows) !== JSON.stringify(request.expectedActiveRows)
  || JSON.stringify(disabledRows) !== JSON.stringify(request.expectedDisabledRows)) {
  throw new Error("DSH_PROFILE_CAPABILITY_SET_INVALID");
}
const rowMap = new Map(parsedRows.map((row) => [row.id, row]));
const profileFacts = {
  persistenceCompression: rowMap.get("session-persistence-jsonl")?.config?.compression,
  persistencePackChunks: rowMap.get("session-persistence-jsonl")?.config?.packChunks,
  defaultProvider: rowMap.get("agent-default-model")?.config?.provider,
  defaultModel: rowMap.get("agent-default-model")?.config?.model,
  telemetryDisabled: rowMap.get("session-telemetry-otel")?.disabled === true,
  directProviderDisabled: rowMap.get("llm-deepseek")?.disabled === true
    && rowMap.get("llm-pi-ai")?.disabled === true,
  processToolsDisabled: ["subprocess", "tool-bash", "tool-pwsh", "code-runtime"]
    .every((id) => rowMap.get(id)?.disabled === true),
  filesystemToolsDisabled: ["tool-fs", "tool-fs-search", "fs-sandbox"]
    .every((id) => rowMap.get(id)?.disabled === true),
  networkToolsDisabled: ["web", "web-search-deepseek", "tool-web"]
    .every((id) => rowMap.get(id)?.disabled === true),
  subagentsDisabled: ["subagent", "subagent-spawn-in-process", "subagent-fork-in-process"]
    .every((id) => rowMap.get(id)?.disabled === true),
};

const pluginNames = [...new Set(rows.map((row) => row.name).filter(Boolean).map(packageName))].sort();
const plugins = [];
for (const name of pluginNames) {
  const manifestPath = findPackageManifest(name);
  const bytes = await readFile(manifestPath);
  const manifest = JSON.parse(bytes);
  if (name.startsWith("@deepseek-ai/dsh") && manifest.version !== request.expectedVersion) {
    throw new Error("DSH_PLUGIN_VERSION_INVALID:" + name);
  }
  plugins.push({ name, version: manifest.version, packageJsonHash: sha256(bytes) });
}

const sessionPath = dshRequire.resolve("@deepseek-ai/dsh-session");
const sessionModule = await import(pathToFileURL(sessionPath).href);
const sessionId = sessionModule.SessionId("slice167-dsh-session");
const session = sessionModule.Session.create(sessionId, undefined, {
  version: sessionModule.SESSION_FORMAT_VERSION,
  id: sessionId,
  createdAt: Date.now(),
  cwd: path.join(jobRoot, "input"),
  delegationDepth: 0,
  agentPreset: "starcraft-tmg-skill-v1",
});
session.append("turn/start", { turn: 1 });
session.append("step/start", { turn: 1, step: 1 });
session.append("assistant/chunk", {
  turn: 1,
  step: 1,
  chunk: {
    type: "usage",
    usage: {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      reasoningTokens: 0,
    },
  },
});
session.append("step/end", { turn: 1, step: 1 });
session.append("turn/end", { turn: 1, reason: { kind: "completed" } });
const sessionJsonl = [
  JSON.stringify({ type: "session", ...session.header }),
  ...session.events.map((event) => JSON.stringify(event)),
].join("\n") + "\n";
const knownEventTypes = [...sessionModule.KNOWN_SESSION_EVENT_TYPES].sort();

await writeFile(responsePath, JSON.stringify({
  schemaVersion: "starcraft_tmg_dsh_isolated_lifecycle_output_v1",
  runtimeTreeHash: request.runtimeTreeHash,
  dshVersion: dshPackage.version,
  configDumpHash: sha256(normalizedDump),
  configRowCount: rows.length,
  configRowsHash: sha256(JSON.stringify(rows)),
  activeRows,
  disabledRows,
  profileFacts,
  pluginLockHash: sha256(JSON.stringify(plugins)),
  plugins,
  knownEventTypes,
  sessionJsonl,
}), "utf8");
} catch (error) {
  const diagnostic = String(error && error.message || error)
    .split(jobRoot).join("__JOB_ROOT__")
    .slice(0, 400);
  await writeFile(responsePath, JSON.stringify({
    schemaVersion: "starcraft_tmg_dsh_isolated_lifecycle_error_v1",
    diagnostic,
  }), "utf8");
}
`;

export async function attestPinnedDshRuntimeV1({ repositoryRoot }) {
  const canonicalRoot = await realpath(repositoryRoot)
    .catch(() => fail("DSH_REPOSITORY_ROOT_INVALID"));
  const runtimeRoot = path.join(canonicalRoot, "vendor", "dsh-runtime-v1");
  const profilePath = path.join(canonicalRoot, "content", "skill-generation",
    "dsh-profile-v1", "cordis.patch.yml");
  const [packageBytes, lockBytes, profilePatch] = await Promise.all([
    readFile(path.join(runtimeRoot, "package.json")),
    readFile(path.join(runtimeRoot, "pnpm-lock.yaml")),
    readFile(profilePath, "utf8"),
  ]);
  if (sha256(packageBytes) !== DSH_RUNTIME_PACKAGE_JSON_HASH
    || sha256(lockBytes) !== DSH_RUNTIME_PNPM_LOCK_HASH
    || sha256(profilePatch) !== DSH_PROFILE_PATCH_HASH) {
    fail("DSH_RUNTIME_LOCK_HASH_INVALID");
  }
  const runtimePackage = JSON.parse(packageBytes);
  if (runtimePackage.dependencies?.["@deepseek-ai/dsh"] !== DSH_VERSION
    || !lockBytes.toString("utf8").includes(`integrity: ${DSH_NPM_INTEGRITY}`)) {
    fail("DSH_RUNTIME_DEPENDENCY_INVALID");
  }
  const installedManifest = JSON.parse(await readFile(path.join(
    runtimeRoot, "node_modules", "@deepseek-ai", "dsh", "package.json"), "utf8")
    .catch(() => fail("DSH_RUNTIME_NOT_INSTALLED")));
  if (installedManifest.name !== "@deepseek-ai/dsh"
    || installedManifest.version !== DSH_VERSION
    || installedManifest.repository?.url
      !== "git+https://github.com/deepseek-ai/deepseek-harness.git"
    || installedManifest.repository?.directory !== "apps/cli") {
    fail("DSH_RUNTIME_INSTALLED_IDENTITY_INVALID");
  }
  const body = {
    schemaVersion: DSH_PINNED_RUNTIME_SCHEMA,
    packageName: "@deepseek-ai/dsh",
    version: DSH_VERSION,
    npmIntegrity: DSH_NPM_INTEGRITY,
    npmShasum: DSH_NPM_SHASUM,
    npmTarballSha256: DSH_NPM_TARBALL_SHA256,
    upstreamTag: DSH_UPSTREAM_TAG,
    upstreamCommit: DSH_UPSTREAM_COMMIT,
    packageJsonHash: DSH_RUNTIME_PACKAGE_JSON_HASH,
    pnpmLockHash: DSH_RUNTIME_PNPM_LOCK_HASH,
    profilePatchHash: DSH_PROFILE_PATCH_HASH,
    lifecycleScriptsExecuted: false,
    installCommand:
      "corepack pnpm@9.12.0 install --frozen-lockfile --ignore-scripts",
    runtimeTreeHash: DSH_RUNTIME_TREE_HASH,
    runtimeTreeEntryCount: DSH_RUNTIME_TREE_ENTRY_COUNT,
    runtimeTreeBytes: DSH_RUNTIME_TREE_BYTES,
  };
  const receipt = freeze({
    ...body,
    receiptHash: hashStarcraftTmgContract(body),
  });
  verifyPinnedDshRuntimeReceiptV1(receipt);
  return freeze({
    runtimeRoot,
    profilePatch,
    receipt,
  });
}

export function verifyPinnedDshRuntimeReceiptV1(value) {
  exactKeys(value, [
    "schemaVersion", "packageName", "version", "npmIntegrity",
    "npmShasum", "npmTarballSha256", "upstreamTag", "upstreamCommit",
    "packageJsonHash", "pnpmLockHash", "profilePatchHash",
    "lifecycleScriptsExecuted", "installCommand", "runtimeTreeHash",
    "runtimeTreeEntryCount", "runtimeTreeBytes", "receiptHash",
  ], [], "DSH_RUNTIME_RECEIPT_SHAPE_INVALID");
  const { receiptHash, ...body } = value;
  if (value.schemaVersion !== DSH_PINNED_RUNTIME_SCHEMA
    || value.packageName !== "@deepseek-ai/dsh"
    || value.version !== DSH_VERSION || value.npmIntegrity !== DSH_NPM_INTEGRITY
    || value.npmShasum !== DSH_NPM_SHASUM
    || value.npmTarballSha256 !== DSH_NPM_TARBALL_SHA256
    || value.upstreamTag !== DSH_UPSTREAM_TAG
    || value.upstreamCommit !== DSH_UPSTREAM_COMMIT
    || value.packageJsonHash !== DSH_RUNTIME_PACKAGE_JSON_HASH
    || value.pnpmLockHash !== DSH_RUNTIME_PNPM_LOCK_HASH
    || value.profilePatchHash !== DSH_PROFILE_PATCH_HASH
    || value.lifecycleScriptsExecuted !== false
    || value.installCommand
      !== "corepack pnpm@9.12.0 install --frozen-lockfile --ignore-scripts"
    || value.runtimeTreeHash !== DSH_RUNTIME_TREE_HASH
    || value.runtimeTreeEntryCount !== DSH_RUNTIME_TREE_ENTRY_COUNT
    || value.runtimeTreeBytes !== DSH_RUNTIME_TREE_BYTES
    || receiptHash !== hashStarcraftTmgContract(body)) {
    fail("DSH_RUNTIME_RECEIPT_INVALID");
  }
  return value;
}

export function verifyDshLifecycleReceiptV1(value, isolationAttestation) {
  exactKeys(value, [
    "schemaVersion", "runtime", "effectiveConfig", "pluginLock",
    "session", "osIsolationReceipt", "externalUsage", "authority",
    "receiptHash",
  ], [], "DSH_LIFECYCLE_RECEIPT_SHAPE_INVALID");
  const { receiptHash, ...body } = value;
  exactKeys(value.externalUsage, [
    "providerCalls", "inputTokens", "outputTokens", "cacheHitTokens",
    "cacheMissTokens", "totalTokens", "estimatedUsd", "estimatedCny",
  ], [], "DSH_LIFECYCLE_USAGE_INVALID");
  exactKeys(value.authority, [
    "canAffectRules", "canOperateRoom", "canReadSkillRegistry",
    "canPublishSkill", "canWriteMemory", "canCreateTrainingTruth",
  ], [], "DSH_LIFECYCLE_AUTHORITY_INVALID");
  if (value.schemaVersion !== DSH_LIFECYCLE_RECEIPT_SCHEMA
    || receiptHash !== hashStarcraftTmgContract(body)
    || value.externalUsage.providerCalls !== 0
    || value.externalUsage.inputTokens !== 0
    || value.externalUsage.outputTokens !== 0
    || value.externalUsage.cacheHitTokens !== 0
    || value.externalUsage.cacheMissTokens !== 0
    || value.externalUsage.totalTokens !== 0
    || value.externalUsage.estimatedUsd !== "0.00000000"
    || value.externalUsage.estimatedCny !== "0.00"
    || Object.values(value.authority).some((entry) => entry !== false)) {
    fail("DSH_LIFECYCLE_RECEIPT_INVALID");
  }
  verifyPinnedDshRuntimeReceiptV1(value.runtime);
  verifyDshSessionParseReceiptV1(value.session);
  exactKeys(value.effectiveConfig, [
    "profilePatchHash", "configDumpHash", "configRowsHash", "rowCount",
    "activeRows", "disabledRows", "profileFacts",
  ], [], "DSH_EFFECTIVE_CONFIG_RECEIPT_INVALID");
  const expectedFacts = {
    persistenceCompression: "none",
    persistencePackChunks: false,
    defaultProvider: "project-d-offline-broker",
    defaultModel: "project-d-frozen-job-model",
    telemetryDisabled: true,
    directProviderDisabled: true,
    processToolsDisabled: true,
    filesystemToolsDisabled: true,
    networkToolsDisabled: true,
    subagentsDisabled: true,
  };
  if (value.effectiveConfig.profilePatchHash !== DSH_PROFILE_PATCH_HASH
    || value.effectiveConfig.configDumpHash !== DSH_EFFECTIVE_CONFIG_DUMP_HASH
    || value.effectiveConfig.configRowsHash !== DSH_EFFECTIVE_CONFIG_ROWS_HASH
    || value.effectiveConfig.rowCount !== DSH_EFFECTIVE_CONFIG_ROW_COUNT
    || JSON.stringify(value.effectiveConfig.activeRows)
      !== JSON.stringify([...DSH_PROFILE_ACTIVE_ROWS].sort())
    || JSON.stringify(value.effectiveConfig.disabledRows)
      !== JSON.stringify([...DSH_PROFILE_DISABLED_ROWS].sort())
    || JSON.stringify(value.effectiveConfig.profileFacts)
      !== JSON.stringify(expectedFacts)) {
    fail("DSH_EFFECTIVE_CONFIG_RECEIPT_INVALID");
  }
  exactKeys(value.pluginLock, ["pluginLockHash", "packages"], [],
    "DSH_PLUGIN_LOCK_RECEIPT_INVALID");
  if (value.pluginLock.pluginLockHash !== DSH_PLUGIN_LOCK_HASH
    || !Array.isArray(value.pluginLock.packages)
    || value.pluginLock.packages.length !== DSH_PLUGIN_LOCK_PACKAGE_COUNT
    || value.pluginLock.packages.some((entry) => (
      !object(entry) || typeof entry.name !== "string"
      || typeof entry.version !== "string"
      || !HASH_PATTERN.test(entry.packageJsonHash)
      || (entry.name.startsWith("@deepseek-ai/dsh")
        && entry.version !== DSH_VERSION)
    ))
    || sha256(JSON.stringify(value.pluginLock.packages)) !== DSH_PLUGIN_LOCK_HASH) {
    fail("DSH_PLUGIN_LOCK_RECEIPT_INVALID");
  }
  verifyDisposableOsJobReceiptV1(value.osIsolationReceipt,
    isolationAttestation);
  return value;
}

export async function runPinnedDshLifecycleSmokeV1({ repositoryRoot }) {
  const pinned = await attestPinnedDshRuntimeV1({ repositoryRoot });
  const runner = createDisposableOsSkillRunnerV1({ repositoryRoot });
  const isolationAttestation = await runner.attest();
  const execution = await runner.run({
    jobId: "ticket17-slice167-dsh-lifecycle",
    attestationHash: isolationAttestation.attestationHash,
    entrySource: DSH_LIFECYCLE_WORKER_SOURCE,
    stagedInput: {
      schemaVersion: "starcraft_tmg_dsh_isolated_lifecycle_request_v1",
      runtimeTreeHash: pinned.receipt.runtimeTreeHash,
      expectedVersion: DSH_VERSION,
      packageJsonHash: DSH_RUNTIME_PACKAGE_JSON_HASH,
      pnpmLockHash: DSH_RUNTIME_PNPM_LOCK_HASH,
      profilePatchHash: DSH_PROFILE_PATCH_HASH,
      profilePatch: pinned.profilePatch,
      expectedActiveRows: [...DSH_PROFILE_ACTIVE_ROWS].sort(),
      expectedDisabledRows: [...DSH_PROFILE_DISABLED_ROWS].sort(),
    },
    runtimeTree: {
      sourceRoot: pinned.runtimeRoot,
      expectedManifestHash: pinned.receipt.runtimeTreeHash,
    },
    timeoutMs: 60_000,
  });
  const output = execution.output;
  if (output.schemaVersion === "starcraft_tmg_dsh_isolated_lifecycle_error_v1") {
    fail("DSH_LIFECYCLE_WORKER_REJECTED", output.diagnostic);
  }
  if (output.schemaVersion !== "starcraft_tmg_dsh_isolated_lifecycle_output_v1"
    || output.runtimeTreeHash !== pinned.receipt.runtimeTreeHash
    || output.dshVersion !== DSH_VERSION
    || output.configDumpHash !== DSH_EFFECTIVE_CONFIG_DUMP_HASH
    || output.configRowsHash !== DSH_EFFECTIVE_CONFIG_ROWS_HASH
    || output.configRowCount !== DSH_EFFECTIVE_CONFIG_ROW_COUNT
    || output.pluginLockHash !== DSH_PLUGIN_LOCK_HASH
    || output.plugins.length !== DSH_PLUGIN_LOCK_PACKAGE_COUNT
    || JSON.stringify(output.knownEventTypes)
      !== JSON.stringify([...DSH_KNOWN_SESSION_EVENT_TYPES].sort())
    || JSON.stringify(output.activeRows)
      !== JSON.stringify([...DSH_PROFILE_ACTIVE_ROWS].sort())
    || JSON.stringify(output.disabledRows)
      !== JSON.stringify([...DSH_PROFILE_DISABLED_ROWS].sort())) {
    fail("DSH_LIFECYCLE_OUTPUT_INVALID");
  }
  const expectedProfileFacts = {
    persistenceCompression: "none",
    persistencePackChunks: false,
    defaultProvider: "project-d-offline-broker",
    defaultModel: "project-d-frozen-job-model",
    telemetryDisabled: true,
    directProviderDisabled: true,
    processToolsDisabled: true,
    filesystemToolsDisabled: true,
    networkToolsDisabled: true,
    subagentsDisabled: true,
  };
  if (JSON.stringify(output.profileFacts)
    !== JSON.stringify(expectedProfileFacts)) {
    fail("DSH_LIFECYCLE_PROFILE_FACTS_INVALID");
  }
  const session = parseDshSessionJsonlV1(output.sessionJsonl, {
    expectedSessionId: "slice167-dsh-session",
    expectedAgentPreset: "starcraft-tmg-skill-v1",
  });
  if (session.eventCount !== 5 || session.usage.totalTokens !== 0
    || session.eventTypeCounts["assistant/chunk"] !== 1) {
    fail("DSH_LIFECYCLE_SESSION_INVALID");
  }
  verifyDshSessionParseReceiptV1(session);
  const body = {
    schemaVersion: DSH_LIFECYCLE_RECEIPT_SCHEMA,
    runtime: pinned.receipt,
    effectiveConfig: {
      profilePatchHash: DSH_PROFILE_PATCH_HASH,
      configDumpHash: output.configDumpHash,
      configRowsHash: output.configRowsHash,
      rowCount: output.configRowCount,
      activeRows: output.activeRows,
      disabledRows: output.disabledRows,
      profileFacts: output.profileFacts,
    },
    pluginLock: {
      pluginLockHash: output.pluginLockHash,
      packages: output.plugins,
    },
    session,
    osIsolationReceipt: execution.receipt,
    externalUsage: zeroExternalUsage(),
    authority: {
      canAffectRules: false,
      canOperateRoom: false,
      canReadSkillRegistry: false,
      canPublishSkill: false,
      canWriteMemory: false,
      canCreateTrainingTruth: false,
    },
  };
  const receipt = freeze({
    ...body,
    receiptHash: hashStarcraftTmgContract(body),
  });
  verifyDshLifecycleReceiptV1(receipt, isolationAttestation);
  return freeze({ isolationAttestation, receipt });
}
