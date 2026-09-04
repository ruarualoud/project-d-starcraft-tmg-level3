import { randomUUID } from "node:crypto";
import { realpath } from "node:fs/promises";
import path from "node:path";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  assertStarcraftTmgSkillGenerationContract,
  assertStarcraftTmgSkillGenerationCredentialFree,
  createStarcraftTmgCandidateSkillBundle,
  createStarcraftTmgSkillGenerationRunReceipt,
} from "../skill-generation/contracts-v1.mjs";
import {
  DSH_NPM_TARBALL_SHA256,
  DSH_PLUGIN_LOCK_HASH,
  DSH_RUNTIME_TREE_HASH,
  DSH_VERSION,
  attestPinnedDshRuntimeV1,
  parseDshSessionJsonlV1,
  verifyDshSessionParseReceiptV1,
} from "./dsh-pinned-runtime-v1.mjs";
import {
  createDisposableOsSkillRunnerV1,
  verifyDisposableOsJobReceiptV1,
  verifyDisposableOsMediatedJobReceiptV1,
} from "./disposable-os-runner-v1.mjs";
import {
  STARCRAFT_TMG_DIRECT_CONTROL_MODEL_ROLES_V1,
} from "./provider-broker-v1.mjs";
import {
  TEACH_CTX2SKILL_EMISSION_ACK_SCHEMA,
  verifyTeachCtx2SkillRunResultV1,
} from "./teach-ctx2skill-role-graph-v1.mjs";

export const STARCRAFT_TMG_DSH_SKILL_EXECUTOR_VERSION =
  "starcraft_tmg_dsh_skill_executor_v1";
export const STARCRAFT_TMG_DSH_EXECUTION_SESSION_SCHEMA =
  "starcraft_tmg_dsh_execution_session_v1";

const HASH = /^[a-f0-9]{64}$/u;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,199}$/u;
const PROVIDER_ROUTE = "project-d-offline-broker";
const MODEL_ROUTE = "project-d-frozen-job-model";
const AGENT_PRESET = "starcraft-tmg-skill-v1";
const ROLE_TIMEOUT_MS = 60_000;

const CONFIG_ROWS = Object.freeze([
  { id: "llm", name: "@deepseek-ai/dsh-llm" },
  { id: "session", name: "@deepseek-ai/dsh-session" },
  { id: "agent", name: "@deepseek-ai/dsh-agent" },
  {
    id: "system-prompt",
    name: "@deepseek-ai/dsh-system-prompt",
    config: {
      persona: "Project D offline Skill candidate generation. Use only the sealed role request and return only the requested structured output.",
    },
  },
  {
    id: "tools",
    name: "@deepseek-ai/dsh-tools",
    config: { mode: "native" },
  },
  {
    id: "session-persistence-jsonl",
    name: "@deepseek-ai/dsh-session-persistence-jsonl",
    config: {
      root: "__DSH_SESSION_ROOT__",
      packChunks: false,
      compression: "none",
    },
  },
  {
    id: "agent-loop",
    name: "@deepseek-ai/dsh-agent-loop",
    config: { maxParallelToolCalls: 1, agents: [] },
  },
]);

export const STARCRAFT_TMG_DSH_EXECUTOR_CONFIG_V1 = Object.freeze({
  rows: CONFIG_ROWS,
  providerRoute: PROVIDER_ROUTE,
  modelRoute: MODEL_ROUTE,
  agentPreset: AGENT_PRESET,
  internalRetries: 0,
  directProviderPlugins: [],
  processTools: [],
  filesystemTools: [],
  networkTools: [],
  subagents: [],
});

export const STARCRAFT_TMG_DSH_EXECUTOR_CONFIG_HASH =
  hashStarcraftTmgContract(STARCRAFT_TMG_DSH_EXECUTOR_CONFIG_V1);

export const STARCRAFT_TMG_DSH_CANDIDATE_TOOL_SCHEMA_V1 = Object.freeze({
  name: "emit_candidate_skill",
  parameters: {
    emissionHash: { type: "string", required: true },
    candidateHash: { type: "string", required: true },
    ordinal: { type: "integer", required: true, const: 1 },
  },
  result: {
    accepted: true,
    candidateOnly: true,
    mayPublishSkill: false,
    canAffectRules: false,
    trainingTruth: false,
  },
  cardinality: "exactly_one_after_cross_time",
});

export const STARCRAFT_TMG_DSH_CANDIDATE_TOOL_SCHEMA_HASH =
  hashStarcraftTmgContract(STARCRAFT_TMG_DSH_CANDIDATE_TOOL_SCHEMA_V1);

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function safeId(value, field) {
  const normalized = String(value || "");
  if (!ID.test(normalized)) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function verifyEnvelope(value, field, label) {
  if (!object(value) || !HASH.test(String(value[field] || ""))) {
    throw new TypeError(`${label} hash is invalid`);
  }
  const copy = clone(value);
  const observed = copy[field];
  delete copy[field];
  if (observed !== hashStarcraftTmgContract(copy)) {
    throw new TypeError(`${label} hash mismatch`);
  }
}

function envelope(body, field) {
  return freeze({ ...body, [field]: hashStarcraftTmgContract(body) });
}

function costGrant(value) {
  verifyEnvelope(value, "authorizationHash", "cost authorization");
  const { authorizationHash, ...body } = clone(value);
  return freeze({ ...body, grantHash: authorizationHash });
}

function verifyCostGrant(value) {
  if (!object(value) || !HASH.test(String(value.grantHash || ""))) {
    throw new TypeError("cost grant hash is invalid");
  }
  const { grantHash, ...body } = clone(value);
  if (grantHash !== hashStarcraftTmgContract(body)) {
    throw new TypeError("cost grant hash mismatch");
  }
  return value;
}

function costSettlement(value) {
  verifyEnvelope(value, "settlementHash", "cost settlement");
  const { authorizationHash, ...rest } = clone(value);
  if (!HASH.test(String(authorizationHash || ""))) {
    throw new TypeError("cost settlement grant hash is invalid");
  }
  return freeze({ ...rest, grantHash: authorizationHash });
}

function verifyCostSettlement(value) {
  if (!object(value) || !HASH.test(String(value.grantHash || ""))) {
    throw new TypeError("cost settlement grant hash is invalid");
  }
  const { grantHash, settlementHash, ...body } = clone(value);
  if (!HASH.test(String(settlementHash || ""))
    || settlementHash !== hashStarcraftTmgContract({
      ...body,
      authorizationHash: grantHash,
    })) {
    throw new TypeError("cost settlement hash mismatch");
  }
  return value;
}

function assertDshJob(job) {
  assertStarcraftTmgSkillGenerationContract(job, "job-manifest");
  if (job.executionArm !== "dsh"
    || job.runtime.packageName !== "@deepseek-ai/dsh"
    || job.runtime.version !== DSH_VERSION
    || job.runtime.packageIntegrityHash !== DSH_NPM_TARBALL_SHA256
    || job.runtime.effectiveConfigHash !== STARCRAFT_TMG_DSH_EXECUTOR_CONFIG_HASH
    || job.runtime.pluginLockHash !== DSH_PLUGIN_LOCK_HASH
    || job.runtime.internalRetries !== 0
    || job.toolContract.candidateEmissionTool !== "emit_candidate_skill"
    || job.toolContract.candidateEmissionCardinality !== "exactly_one"
    || job.toolContract.schemaHash
      !== STARCRAFT_TMG_DSH_CANDIDATE_TOOL_SCHEMA_HASH
    || job.permissionProfile.repositoryMounted !== false
    || job.permissionProfile.productionCredentialsMounted !== false
    || job.permissionProfile.roomApiAccess !== false
    || job.permissionProfile.rulesMutationAccess !== false
    || job.permissionProfile.trainingTruthAccess !== false) {
    throw new TypeError("DSH Skill job does not match the isolated executor");
  }
  return job;
}

function zeroAuthority() {
  return {
    canAffectRules: false,
    canOperateRoom: false,
    canReadSkillRegistry: false,
    canPublishSkill: false,
    canWriteMemory: false,
    canCreateTrainingTruth: false,
  };
}

export const STARCRAFT_TMG_DSH_EXECUTOR_WORKER_SOURCE = String.raw`import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, realpath, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [requestPath, responsePath] = process.argv.slice(2);
const request = JSON.parse(await readFile(requestPath, "utf8"));
const jobRoot = path.resolve(path.dirname(requestPath), "..");
const runtimeRoot = path.join(jobRoot, "runtime", "vendor");
const tmpRoot = path.join(jobRoot, "tmp");
const outputRoot = path.dirname(responsePath);
const bridgeRoot = path.join(outputRoot, "bridge");
const dshPackagePath = path.join(runtimeRoot, "node_modules", "@deepseek-ai", "dsh", "package.json");
const dshPackage = JSON.parse(await readFile(dshPackagePath, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}
const canonicalHash = (value) => sha256(JSON.stringify(stable(value)) ?? "null");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function bridgeName(kind, ordinal) {
  return kind + "-" + String(ordinal).padStart(6, "0") + ".json";
}
async function relay(value, ordinal) {
  const requestName = bridgeName("request", ordinal);
  const temporary = path.join(bridgeRoot, "." + requestName + ".tmp");
  const target = path.join(bridgeRoot, requestName);
  await writeFile(temporary, JSON.stringify(value) + "\n", { mode: 384 });
  await rename(temporary, target);
  const responseTarget = path.join(bridgeRoot, bridgeName("response", ordinal));
  for (;;) {
    try {
      return JSON.parse(await readFile(responseTarget, "utf8"));
    } catch (error) {
      if (error && error.code !== "ENOENT") throw error;
      await sleep(5);
    }
  }
}
function redactedText(value) {
  return "[redacted-sha256:" + canonicalHash(value) + "]";
}
function safeMessage(message) {
  const source = message && message.source || {};
  const safeSource = source.kind === "model"
    ? { kind: "model", provider: source.provider, model: source.model }
    : source.kind === "tool"
      ? { kind: "tool", callId: source.callId }
      : { kind: source.kind || "user" };
  return {
    id: message && message.id,
    role: message && message.role,
    content: [{ type: "text", text: redactedText(message && message.content) }],
    source: safeSource,
  };
}
function safeEvent(event) {
  const common = {
    type: event.type,
    seq: event.seq,
    time: event.time,
    ...(event.surfaceOp === undefined ? {} : { surfaceOp: event.surfaceOp }),
    ...(event.sourceEventSeqs === undefined ? {} : { sourceEventSeqs: event.sourceEventSeqs }),
    ...(event.ignorable === undefined ? {} : { ignorable: event.ignorable }),
  };
  const data = event.data || {};
  if (event.type === "turn/start") return { ...common, data: { turn: data.turn } };
  if (event.type === "turn/end") return { ...common, data: { turn: data.turn, reason: { kind: data.reason && data.reason.kind || "completed" } } };
  if (event.type === "step/start" || event.type === "step/end") {
    return { ...common, data: { turn: data.turn, step: data.step } };
  }
  if (event.type === "assistant/chunk") {
    const chunk = data.chunk || {};
    return {
      ...common,
      data: {
        turn: data.turn,
        step: data.step,
        chunk: chunk.type === "usage"
          ? { type: "usage", usage: chunk.usage }
          : { type: "redacted", contentHash: canonicalHash(chunk) },
      },
    };
  }
  if (event.type === "assistant/message") {
    return {
      ...common,
      data: {
        turn: data.turn,
        step: data.step,
        message: safeMessage(data.message),
        ...(data.usage === undefined ? {} : { usage: data.usage }),
        ...(data.interrupted === undefined ? {} : { interrupted: data.interrupted }),
      },
    };
  }
  if (event.type === "user/message") {
    return { ...common, data: safeMessage(data) };
  }
  if (event.type === "tool/call") {
    return {
      ...common,
      data: {
        turn: data.turn,
        step: data.step,
        callId: data.callId,
        name: data.name,
        arguments: JSON.stringify({ redactedHash: canonicalHash(data.arguments) }),
      },
    };
  }
  if (event.type === "tool/result") {
    return {
      ...common,
      data: {
        turn: data.turn,
        step: data.step,
        message: safeMessage(data.message),
      },
    };
  }
  return { ...common, data: { redactedHash: canonicalHash(data) } };
}
function safeSessionJsonl(session) {
  const header = {
    type: "session",
    version: session.header.version,
    id: session.header.id,
    createdAt: session.header.createdAt,
    cwd: "/__project_d_isolated__/input",
    ...(session.header.parentSession === undefined ? {} : { parentSession: session.header.parentSession }),
    ...(session.header.seedLength === undefined ? {} : { seedLength: session.header.seedLength }),
    ...(session.header.origin === undefined ? {} : { origin: session.header.origin }),
    delegationDepth: session.header.delegationDepth || 0,
    agentPreset: session.header.agentPreset,
  };
  return [JSON.stringify(header), ...session.events.map((event) => JSON.stringify(safeEvent(event)))].join("\n") + "\n";
}
function streamText(text, usage) {
  return async function* () {
    yield { type: "block-start", index: 0, blockType: "text" };
    yield { type: "text-delta", index: 0, text };
    yield { type: "block-end", index: 0, block: { type: "text", text } };
    yield { type: "usage", usage };
    yield { type: "finish", reason: { kind: "stop" } };
  };
}

try {
  if (request.runtimeTreeHash !== "${DSH_RUNTIME_TREE_HASH}"
    || request.expectedVersion !== "${DSH_VERSION}"
    || request.executorConfigHash !== "${STARCRAFT_TMG_DSH_EXECUTOR_CONFIG_HASH}"
    || canonicalHash(request.executorConfig) !== request.executorConfigHash
    || dshPackage.version !== request.expectedVersion) {
    throw new Error("DSH_EXECUTOR_RUNTIME_BINDING_INVALID");
  }
  process.env.DSH_HOME = path.join(tmpRoot, "dsh-home");
  process.env.DSH_TELEMETRY_DISABLED = "1";
  process.env.DSH_CWD = path.join(jobRoot, "input");
  await mkdir(process.env.DSH_HOME, { recursive: true });
  const sessionRoot = path.join(tmpRoot, "sessions");
  const dshRequire = createRequire(await realpath(dshPackagePath));
  const rows = request.executorConfig.rows.map((row) => ({
    ...row,
    name: dshRequire.resolve(row.name),
    ...(row.id === "session-persistence-jsonl"
      ? { config: { ...row.config, root: sessionRoot } }
      : {}),
  }));
  const configPath = path.join(tmpRoot, "executor.cordis.json");
  await writeFile(configPath, JSON.stringify(rows), "utf8");
  const [{ boot }, llmModule, sessionModule, toolsModule] = await Promise.all([
    import(pathToFileURL(dshRequire.resolve("@deepseek-ai/dsh-app-boot")).href),
    import(pathToFileURL(dshRequire.resolve("@deepseek-ai/dsh-llm")).href),
    import(pathToFileURL(dshRequire.resolve("@deepseek-ai/dsh-session")).href),
    import(pathToFileURL(dshRequire.resolve("@deepseek-ai/dsh-tools")).href),
  ]);
  const ctx = await boot(
    "project-d-starcraft-skill",
    configPath,
    [],
    undefined,
    pathToFileURL(dshPackagePath).href,
  );
  let adapterCalls = 0;
  let candidateToolCalls = 0;
  let toolAck = null;
  let agentRequestEvidence = null;
  class ProjectDAdapter extends llmModule.LlmAdapter {
    providerRetryPolicy() {
      return { maxAttempts: 1 };
    }
    async *stream(options) {
      adapterCalls += 1;
      const common = {
        provider: options.provider,
        model: options.model,
        sessionIdHash: sha256(String(options.sessionId || "")),
        messageCount: options.messages.length,
        systemHash: sha256(String(options.system || "")),
        toolNames: (options.tools || []).map((tool) => tool.name),
        requestHash: canonicalHash({
          provider: options.provider,
          model: options.model,
          messages: options.messages,
          system: options.system || null,
          tools: options.tools || [],
          maxTokens: options.maxTokens || null,
        }),
      };
      if (options.provider !== request.executorConfig.providerRoute
        || options.model !== request.executorConfig.modelRoute) {
        throw new Error("DSH_AGENT_MODEL_ROUTE_INVALID");
      }
      if (request.mode === "role") {
        if (adapterCalls !== 1 || common.toolNames.length !== 0) {
          throw new Error("DSH_ROLE_ADAPTER_CARDINALITY_INVALID");
        }
        const bridgeRequest = {
          schemaVersion: "starcraft_tmg_dsh_provider_bridge_request_v1",
          ordinal: 1,
          role: request.role,
          roleRequestHash: request.roleRequestHash,
          rolePacketHash: request.rolePacketHash,
          dshAgentRequestHash: common.requestHash,
        };
        const bridged = await relay(bridgeRequest, 1);
        if (bridged.schemaVersion !== "starcraft_tmg_dsh_provider_bridge_response_v1"
          || bridged.role !== request.role
          || bridged.roleRequestHash !== request.roleRequestHash
          || bridged.rolePacketHash !== request.rolePacketHash
          || bridged.roleOutputHash !== canonicalHash(bridged.roleOutput)) {
          throw new Error("DSH_PROVIDER_BRIDGE_RESPONSE_INVALID");
        }
        agentRequestEvidence = { ...common, bridgeRequestHash: canonicalHash(bridgeRequest) };
        const text = JSON.stringify(bridged.roleOutput);
        yield* streamText(text, {
          inputTokens: bridged.usage.cacheMissTokens,
          outputTokens: bridged.usage.outputTokens,
          cacheReadTokens: bridged.usage.cacheHitTokens,
          cacheWriteTokens: 0,
          reasoningTokens: bridged.usage.reasoningTokens,
        })();
        return;
      }
      if (request.mode !== "candidate" || common.toolNames.length !== 1
        || common.toolNames[0] !== "emit_candidate_skill") {
        throw new Error("DSH_CANDIDATE_TOOL_SURFACE_INVALID");
      }
      agentRequestEvidence = common;
      if (adapterCalls === 1) {
        const args = JSON.stringify({
          emissionHash: request.emissionHash,
          candidateHash: request.candidateHash,
          ordinal: 1,
        });
        const callId = "emit-candidate-call-1";
        yield { type: "block-start", index: 0, blockType: "tool-call" };
        yield { type: "tool-call-delta", index: 0, id: callId, name: "emit_candidate_skill", argumentsDelta: args };
        yield { type: "block-end", index: 0, block: { type: "tool-call", id: callId, name: "emit_candidate_skill", arguments: args } };
        yield { type: "usage", usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0 } };
        yield { type: "finish", reason: { kind: "tool-calls" } };
        return;
      }
      if (adapterCalls !== 2 || !toolAck) {
        throw new Error("DSH_CANDIDATE_COMPLETION_SEQUENCE_INVALID");
      }
      yield* streamText("candidate emission acknowledged", {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        reasoningTokens: 0,
      })();
    }
  }
  ctx.llm.registerAdapter([request.executorConfig.providerRoute], new ProjectDAdapter());
  if (request.mode === "candidate") {
    ctx.tools.register(toolsModule.defineTool({
      name: "emit_candidate_skill",
      description: "Emit exactly one unreviewed candidate after deterministic gates pass.",
      parameters: request.candidateToolSchema.parameters,
      output: {
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            schemaVersion: { type: "string", required: true },
            accepted: { type: "boolean", required: true, const: true },
            emissionId: { type: "string", required: true },
            emissionHash: { type: "string", required: true },
            candidateHash: { type: "string", required: true },
            candidateOnly: { type: "boolean", required: true, const: true },
          },
        },
        render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }],
      },
      async execute(args) {
        candidateToolCalls += 1;
        if (candidateToolCalls !== 1 || args.ordinal !== 1
          || args.emissionHash !== request.emissionHash
          || args.candidateHash !== request.candidateHash) {
          throw new Error("DSH_CANDIDATE_TOOL_AUTHORITY_INVALID");
        }
        toolAck = {
          schemaVersion: request.emissionAckSchema,
          accepted: true,
          emissionId: request.emissionId,
          emissionHash: request.emissionHash,
          candidateHash: request.candidateHash,
          candidateOnly: true,
        };
        return toolAck;
      },
    }));
  }
  const sessionId = sessionModule.SessionId(request.sessionId);
  const handle = await ctx.agents.create({
    sessionId,
    meta: {
      cwd: path.join(jobRoot, "input"),
      delegationDepth: 0,
      agentPreset: request.executorConfig.agentPreset,
    },
    agentOptions: {
      provider: request.executorConfig.providerRoute,
      model: request.executorConfig.modelRoute,
      maxTokens: request.maxTokens,
    },
  });
  handle.agent.followup(llmModule.createUserMessage({
    content: [{
      type: "text",
      text: request.mode === "role"
        ? "Execute sealed role " + request.role + " for request " + request.roleRequestHash + ". Return only JSON."
        : "Invoke emit_candidate_skill exactly once for the gated candidate.",
    }],
    source: { kind: "user" },
  }));
  await handle.agent.whenIdle();
  await ctx.sessions.flush(handle.agent.session);
  const rawSession = handle.agent.session;
  let roleOutput = null;
  if (request.mode === "role") {
    const assistant = [...rawSession.events].reverse().find((event) => event.type === "assistant/message");
    const text = assistant && assistant.data && assistant.data.message
      && assistant.data.message.content && assistant.data.message.content[0]
      && assistant.data.message.content[0].text;
    roleOutput = JSON.parse(text);
  }
  const output = {
    schemaVersion: "starcraft_tmg_dsh_executor_output_v1",
    mode: request.mode,
    runtimeTreeHash: request.runtimeTreeHash,
    dshVersion: dshPackage.version,
    executorConfigHash: request.executorConfigHash,
    role: request.role || null,
    roleRequestHash: request.roleRequestHash || null,
    rolePacketHash: request.rolePacketHash || null,
    roleOutput,
    roleOutputHash: roleOutput ? canonicalHash(roleOutput) : null,
    candidateToolCalls,
    toolAck,
    adapterCalls,
    agentRequestEvidence,
    sessionJsonl: safeSessionJsonl(rawSession),
    directNetworkUsed: false,
    providerIdentityMaterialMounted: false,
    repositoryMounted: false,
    rawPromptPersisted: false,
    rawResponsePersisted: false,
    rawReasoningPersisted: false,
    trainingTruth: false,
  };
  await writeFile(responsePath, JSON.stringify(output), "utf8");
  await handle.dispose();
  await ctx.fiber.dispose();
} catch (error) {
  function errorText(value, depth) {
    if (depth > 5) return "";
    const head = value && (value.stack || value.message) || String(value);
    const aggregate = Array.isArray(value && value.errors)
      ? value.errors.map((child) => errorText(child, depth + 1)).join("\n")
      : "";
    const cause = value && value.cause ? errorText(value.cause, depth + 1) : "";
    return [head, aggregate, cause].filter(Boolean).join("\n");
  }
  const diagnostic = errorText(error, 0)
    .split(jobRoot).join("__JOB_ROOT__")
    .slice(0, 4_000);
  await writeFile(responsePath, JSON.stringify({
    schemaVersion: "starcraft_tmg_dsh_executor_error_v1",
    diagnostic,
  }), "utf8");
}
`;

function expectedDshUsage(receipt) {
  return {
    inputTokens: receipt.usage.cacheMissTokens,
    outputTokens: receipt.usage.outputTokens,
    cacheReadTokens: receipt.usage.cacheHitTokens,
    cacheWriteTokens: 0,
    reasoningTokens: receipt.usage.reasoningTokens,
    totalTokens: receipt.usage.totalTokens,
  };
}

function assertSafeWorkerOutput(output, mode) {
  if (!object(output) || output.schemaVersion
      !== "starcraft_tmg_dsh_executor_output_v1"
    || output.mode !== mode
    || output.runtimeTreeHash !== DSH_RUNTIME_TREE_HASH
    || output.dshVersion !== DSH_VERSION
    || output.executorConfigHash !== STARCRAFT_TMG_DSH_EXECUTOR_CONFIG_HASH
    || output.directNetworkUsed !== false
    || output.providerIdentityMaterialMounted !== false
    || output.repositoryMounted !== false
    || output.rawPromptPersisted !== false
    || output.rawResponsePersisted !== false
    || output.rawReasoningPersisted !== false
    || output.trainingTruth !== false) {
    throw new TypeError("DSH executor output is invalid");
  }
  assertStarcraftTmgSkillGenerationCredentialFree(output, "DSH executor output");
}

function sumUsage(executions) {
  return executions.reduce((total, execution) => {
    for (const key of Object.keys(total)) {
      total[key] += execution.providerReceipt.usage[key];
    }
    return total;
  }, {
    inputTokens: 0,
    outputTokens: 0,
    cacheHitTokens: 0,
    cacheMissTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
  });
}

function renderCandidateMarkdown(candidate) {
  const artifact = candidate.skillArtifact;
  return [
    `# ${artifact.title}`,
    "",
    artifact.summary,
    "",
    "## Procedure",
    "",
    ...artifact.procedure.map((entry) => `- ${entry}`),
    "",
    "## Legality checks",
    "",
    ...artifact.legalityChecks.map((entry) => `- ${entry}`),
    "",
    "Candidate only. Human review and Ticket 18 promotion are required.",
  ].join("\n");
}

export function verifyStarcraftTmgDshExecutionSessionV1(
  value,
  jobManifest,
  isolationAttestation,
) {
  const job = assertDshJob(jobManifest);
  verifyEnvelope(value, "sessionHash", "DSH execution session");
  assertStarcraftTmgSkillGenerationCredentialFree(
    value,
    "DSH execution session",
  );
  if (!Array.isArray(value.roleExecutions)
    || value.roleExecutions.length
      !== STARCRAFT_TMG_DIRECT_CONTROL_MODEL_ROLES_V1.length) {
    throw new TypeError("DSH role executions are invalid");
  }
  value.roleExecutions.forEach((execution, index) => {
    const expectedRole = STARCRAFT_TMG_DIRECT_CONTROL_MODEL_ROLES_V1[index];
    verifyEnvelope(execution.providerReceipt, "receiptHash", "Provider receipt");
    verifyCostGrant(execution.costGrant);
    verifyEnvelope(execution.pricingReceipt, "receiptHash", "pricing receipt");
    verifyCostSettlement(execution.costSettlement);
    verifyDshSessionParseReceiptV1(execution.dshSession);
    verifyDisposableOsMediatedJobReceiptV1(
      execution.osIsolationReceipt,
      isolationAttestation,
    );
    if (execution.role !== expectedRole
      || execution.providerReceipt.role !== expectedRole
      || execution.providerReceipt.jobHash !== job.integrity.hash
      || execution.providerReceipt.physicalAttempts !== 1
      || execution.providerReceipt.automaticRetries !== 0
      || execution.costGrant.grantHash !== execution.costSettlement.grantHash
      || execution.osIsolationReceipt.bridge.requestCount !== 1
      || execution.roleOutputHash.length !== 64
      || execution.dshAgentRequestHash.length !== 64
      || hashStarcraftTmgContract(execution.dshSession.usage)
        !== hashStarcraftTmgContract(expectedDshUsage(execution.providerReceipt))) {
      throw new TypeError("DSH role execution binding is invalid");
    }
  });
  verifyDshSessionParseReceiptV1(value.candidateEmission.dshSession);
  verifyDisposableOsJobReceiptV1(
    value.candidateEmission.osIsolationReceipt,
    isolationAttestation,
  );
  verifyEnvelope(value.candidateEmission.toolAck, "ackHash", "candidate tool ack");
  const usage = sumUsage(value.roleExecutions);
  const costNanoUsd = value.roleExecutions.reduce((sum, execution) => (
    sum + execution.providerReceipt.calculatedCostNanoUsd
  ), 0);
  const costCnyMicros = value.roleExecutions.reduce((sum, execution) => (
    sum + execution.providerReceipt.calculatedCostCnyMicros
  ), 0);
  if (value.schemaVersion !== STARCRAFT_TMG_DSH_EXECUTION_SESSION_SCHEMA
    || value.jobRef?.id !== job.jobId
    || value.jobRef?.hash !== job.integrity.hash
    || value.executionArm !== "dsh"
    || value.runtimeTreeHash !== DSH_RUNTIME_TREE_HASH
    || value.executorConfigHash !== STARCRAFT_TMG_DSH_EXECUTOR_CONFIG_HASH
    || value.providerAttempts !== 7 || value.retryEvents !== 0
    || hashStarcraftTmgContract(value.usage) !== hashStarcraftTmgContract(usage)
    || value.calculatedCostNanoUsd !== costNanoUsd
    || value.calculatedCostCnyMicros !== costCnyMicros
    || value.candidateEmission.invocationCount !== 1
    || value.candidateEmission.providerAttempts !== 0
    || value.candidateEmission.dshSession.usage.totalTokens !== 0
    || value.directNetworkAllowed !== false
    || value.credentialsMountedInDsh !== false
    || value.repositoryMounted !== false
    || value.rawPromptPersisted !== false
    || value.rawResponsePersisted !== false
    || value.rawReasoningPersisted !== false
    || value.humanReviewed !== false
    || value.canAffectStrategy !== false
    || value.canAffectRules !== false
    || value.mayPublishSkill !== false
    || value.promotionEligible !== false
    || value.trainingTruth !== false) {
    throw new TypeError("DSH execution session is invalid");
  }
  return true;
}

export async function createStarcraftTmgDshSkillExecutorV1(options = {}) {
  const job = assertDshJob(options.jobManifest);
  if (typeof options.broker?.completeRole !== "function") {
    throw new TypeError("offline Provider broker is required");
  }
  const workerRef = safeId(options.workerRef, "workerRef");
  const repositoryRoot = await realpath(options.repositoryRoot);
  const pinned = await attestPinnedDshRuntimeV1({ repositoryRoot });
  const runner = createDisposableOsSkillRunnerV1({ repositoryRoot });
  const isolationAttestation = await runner.attest();
  const createId = typeof options.createId === "function"
    ? options.createId : () => randomUUID();
  const now = typeof options.now === "function"
    ? options.now : () => new Date().toISOString();
  const startedAt = new Date(options.startedAt || now()).toISOString();
  const roleExecutions = [];
  let candidateEmission;
  let state = "open";

  function workerInput(input) {
    return {
      schemaVersion: "starcraft_tmg_dsh_executor_request_v1",
      runtimeTreeHash: pinned.receipt.runtimeTreeHash,
      expectedVersion: DSH_VERSION,
      executorConfig: STARCRAFT_TMG_DSH_EXECUTOR_CONFIG_V1,
      executorConfigHash: STARCRAFT_TMG_DSH_EXECUTOR_CONFIG_HASH,
      maxTokens: Math.floor(job.budget.maxOutputTokens / 7),
      ...input,
    };
  }

  async function executeRole(packet) {
    if (state !== "open") throw new Error("DSH_EXECUTOR_CLOSED");
    const expectedRole = STARCRAFT_TMG_DIRECT_CONTROL_MODEL_ROLES_V1[
      roleExecutions.length
    ];
    if (!expectedRole || packet?.request?.role !== expectedRole) {
      state = "failed";
      throw new Error("DSH_EXECUTOR_ROLE_SEQUENCE_REJECTED");
    }
    const rolePacketHash = hashStarcraftTmgContract(packet);
    const sessionId = safeId(
      `dsh-role-${expectedRole}-${createId(expectedRole)}`,
      "sessionId",
    );
    let brokerResult;
    try {
      const execution = await runner.runMediated({
        jobId: `ticket17-slice169-${expectedRole}`,
        attestationHash: isolationAttestation.attestationHash,
        entrySource: STARCRAFT_TMG_DSH_EXECUTOR_WORKER_SOURCE,
        stagedInput: workerInput({
          mode: "role",
          sessionId,
          role: expectedRole,
          roleRequestHash: packet.request.requestHash,
          rolePacketHash,
        }),
        runtimeTree: {
          sourceRoot: pinned.runtimeRoot,
          expectedManifestHash: pinned.receipt.runtimeTreeHash,
        },
        bridge: {
          maximumRequests: 1,
          async handler(bridgeRequest, bridgeContext) {
            if (bridgeContext.ordinal !== 1
              || bridgeRequest.schemaVersion
                !== "starcraft_tmg_dsh_provider_bridge_request_v1"
              || bridgeRequest.ordinal !== 1
              || bridgeRequest.role !== expectedRole
              || bridgeRequest.roleRequestHash !== packet.request.requestHash
              || bridgeRequest.rolePacketHash !== rolePacketHash
              || !HASH.test(bridgeRequest.dshAgentRequestHash)) {
              throw new Error("DSH_PROVIDER_BRIDGE_REQUEST_INVALID");
            }
            brokerResult = await options.broker.completeRole({
              jobManifest: job,
              workerRef,
              rolePacket: packet,
              attemptId: safeId(
                `skill-provider-${createId(`${expectedRole}.attempt`)}`,
                "attemptId",
              ),
              signal: bridgeContext.signal,
            });
            return {
              schemaVersion: "starcraft_tmg_dsh_provider_bridge_response_v1",
              role: expectedRole,
              roleRequestHash: packet.request.requestHash,
              rolePacketHash,
              roleOutput: brokerResult.roleOutput,
              roleOutputHash: hashStarcraftTmgContract(brokerResult.roleOutput),
              providerReceiptHash: brokerResult.receipt.receiptHash,
              usage: brokerResult.receipt.usage,
            };
          },
        },
        timeoutMs: ROLE_TIMEOUT_MS,
      });
      const output = execution.output;
      if (output.schemaVersion === "starcraft_tmg_dsh_executor_error_v1") {
        throw new Error(`DSH_EXECUTOR_WORKER_REJECTED:${output.diagnostic}`);
      }
      assertSafeWorkerOutput(output, "role");
      if (!brokerResult || output.role !== expectedRole
        || output.roleRequestHash !== packet.request.requestHash
        || output.rolePacketHash !== rolePacketHash
        || output.roleOutputHash
          !== hashStarcraftTmgContract(brokerResult.roleOutput)
        || hashStarcraftTmgContract(output.roleOutput)
          !== hashStarcraftTmgContract(brokerResult.roleOutput)
        || output.candidateToolCalls !== 0 || output.toolAck !== null
        || output.adapterCalls !== 1
        || output.agentRequestEvidence?.toolNames?.length !== 0) {
        throw new TypeError("DSH role output is not bound to the broker");
      }
      const dshSession = parseDshSessionJsonlV1(output.sessionJsonl, {
        expectedSessionId: sessionId,
        expectedAgentPreset: AGENT_PRESET,
      });
      if (hashStarcraftTmgContract(dshSession.usage)
        !== hashStarcraftTmgContract(expectedDshUsage(brokerResult.receipt))) {
        throw new TypeError("DSH and Provider usage disagree");
      }
      roleExecutions.push(freeze({
        role: expectedRole,
        roleOutputHash: output.roleOutputHash,
        dshAgentRequestHash: output.agentRequestEvidence.requestHash,
        providerReceipt: brokerResult.receipt,
        costGrant: costGrant(brokerResult.costAuthorization),
        pricingReceipt: brokerResult.pricingReceipt,
        costSettlement: costSettlement(brokerResult.costSettlement),
        dshSession,
        osIsolationReceipt: execution.receipt,
      }));
      return clone(output.roleOutput);
    } catch (error) {
      state = "failed";
      throw error;
    }
  }

  async function emitCandidate(emission) {
    if (state !== "open" || roleExecutions.length !== 7 || candidateEmission) {
      state = "failed";
      throw new Error("DSH_CANDIDATE_EMISSION_CARDINALITY_INVALID");
    }
    if (emission?.tool !== "emit_candidate_skill"
      || emission.cardinality?.maximum !== 1
      || emission.cardinality?.ordinal !== 1
      || emission.authority?.candidateOnly !== true
      || emission.authority?.mayPublishSkill !== false
      || emission.authority?.canAffectRules !== false
      || emission.authority?.trainingTruth !== false
      || !HASH.test(emission.emissionHash)
      || !HASH.test(emission.candidate?.candidateHash)) {
      state = "failed";
      throw new Error("DSH_CANDIDATE_EMISSION_AUTHORITY_INVALID");
    }
    const emissionId = safeId(
      `emission-${createId("candidate.emission")}`,
      "emissionId",
    );
    const sessionId = safeId(
      `dsh-candidate-${createId("candidate.session")}`,
      "sessionId",
    );
    try {
      const execution = await runner.run({
        jobId: "ticket17-slice169-candidate-emission",
        attestationHash: isolationAttestation.attestationHash,
        entrySource: STARCRAFT_TMG_DSH_EXECUTOR_WORKER_SOURCE,
        stagedInput: workerInput({
          mode: "candidate",
          sessionId,
          role: null,
          roleRequestHash: null,
          rolePacketHash: null,
          emissionHash: emission.emissionHash,
          candidateHash: emission.candidate.candidateHash,
          emissionId,
          emissionAckSchema: TEACH_CTX2SKILL_EMISSION_ACK_SCHEMA,
          candidateToolSchema: STARCRAFT_TMG_DSH_CANDIDATE_TOOL_SCHEMA_V1,
        }),
        runtimeTree: {
          sourceRoot: pinned.runtimeRoot,
          expectedManifestHash: pinned.receipt.runtimeTreeHash,
        },
        timeoutMs: ROLE_TIMEOUT_MS,
      });
      const output = execution.output;
      if (output.schemaVersion === "starcraft_tmg_dsh_executor_error_v1") {
        throw new Error(`DSH_EXECUTOR_WORKER_REJECTED:${output.diagnostic}`);
      }
      assertSafeWorkerOutput(output, "candidate");
      if (output.role !== null || output.roleOutput !== null
        || output.roleOutputHash !== null || output.candidateToolCalls !== 1
        || output.adapterCalls !== 2
        || output.toolAck?.schemaVersion !== TEACH_CTX2SKILL_EMISSION_ACK_SCHEMA
        || output.toolAck?.emissionId !== emissionId
        || output.toolAck?.emissionHash !== emission.emissionHash
        || output.toolAck?.candidateHash !== emission.candidate.candidateHash
        || output.toolAck?.candidateOnly !== true
        || output.agentRequestEvidence?.toolNames?.join(",")
          !== "emit_candidate_skill") {
        throw new TypeError("DSH candidate tool result is invalid");
      }
      const dshSession = parseDshSessionJsonlV1(output.sessionJsonl, {
        expectedSessionId: sessionId,
        expectedAgentPreset: AGENT_PRESET,
      });
      if (dshSession.eventTypeCounts["tool/call"] !== 1
        || dshSession.eventTypeCounts["tool/result"] !== 1
        || dshSession.usage.totalTokens !== 0) {
        throw new TypeError("DSH candidate tool Session is invalid");
      }
      const toolAck = envelope({
        ...output.toolAck,
        toolSchemaHash: STARCRAFT_TMG_DSH_CANDIDATE_TOOL_SCHEMA_HASH,
        sessionReceiptHash: dshSession.receiptHash,
        osIsolationReceiptHash: execution.receipt.receiptHash,
        candidateOnly: true,
        mayPublishSkill: false,
        canAffectRules: false,
        trainingTruth: false,
      }, "ackHash");
      candidateEmission = freeze({
        invocationCount: 1,
        providerAttempts: 0,
        toolAck,
        dshSession,
        osIsolationReceipt: execution.receipt,
      });
      state = "emitted";
      return clone(output.toolAck);
    } catch (error) {
      state = "failed";
      throw error;
    }
  }

  function finalize({ roleGraphResult, stagedInput }) {
    if (state !== "emitted" || roleExecutions.length !== 7
      || !candidateEmission) {
      throw new Error("DSH_EXECUTION_INCOMPLETE");
    }
    verifyTeachCtx2SkillRunResultV1(roleGraphResult, stagedInput);
    if (roleGraphResult.candidate.candidateHash
      !== candidateEmission.toolAck.candidateHash
      || roleGraphResult.emissionReceipt.emissionHash
        !== candidateEmission.toolAck.emissionHash) {
      throw new TypeError("DSH candidate closure is invalid");
    }
    const usage = sumUsage(roleExecutions);
    const calculatedCostNanoUsd = roleExecutions.reduce((sum, execution) => (
      sum + execution.providerReceipt.calculatedCostNanoUsd
    ), 0);
    const calculatedCostCnyMicros = roleExecutions.reduce((sum, execution) => (
      sum + execution.providerReceipt.calculatedCostCnyMicros
    ), 0);
    const endedAt = new Date(now()).toISOString();
    const sessionLogHash = hashStarcraftTmgContract({
      roleSessionReceiptHashes: roleExecutions.map((execution) => (
        execution.dshSession.receiptHash
      )),
      candidateSessionReceiptHash: candidateEmission.dshSession.receiptHash,
    });
    const session = envelope({
      schemaVersion: STARCRAFT_TMG_DSH_EXECUTION_SESSION_SCHEMA,
      sessionId: safeId(`dsh-run-${createId("run.session")}`, "sessionId"),
      jobRef: { id: job.jobId, hash: job.integrity.hash },
      executionArm: "dsh",
      runtimeTreeHash: DSH_RUNTIME_TREE_HASH,
      executorConfigHash: STARCRAFT_TMG_DSH_EXECUTOR_CONFIG_HASH,
      roleExecutions: clone(roleExecutions),
      candidateEmission: clone(candidateEmission),
      startedAt,
      endedAt,
      providerAttempts: 7,
      retryEvents: 0,
      usage,
      calculatedCostNanoUsd,
      calculatedCostUsd: (calculatedCostNanoUsd / 1_000_000_000).toFixed(9),
      calculatedCostCnyMicros,
      sessionLogHash,
      directNetworkAllowed: false,
      credentialsMountedInDsh: false,
      repositoryMounted: false,
      rawPromptPersisted: false,
      rawResponsePersisted: false,
      rawReasoningPersisted: false,
      humanReviewed: false,
      canAffectStrategy: false,
      canAffectRules: false,
      mayPublishSkill: false,
      promotionEligible: false,
      trainingTruth: false,
    }, "sessionHash");
    verifyStarcraftTmgDshExecutionSessionV1(
      session,
      job,
      isolationAttestation,
    );
    const candidate = roleGraphResult.candidate;
    const candidateBundle = createStarcraftTmgCandidateSkillBundle({
      jobManifest: job,
      skillArtifact: {
        skillId: candidate.skillArtifact.skillId,
        version: candidate.skillArtifact.version,
        skillType: candidate.skillArtifact.skillType,
        sourceRefs: job.sourceSnapshotRefs,
        appRuleEndpoints: [],
        phase: "multi_phase",
        preconditions: [],
        procedure: candidate.skillArtifact.procedure,
        legalityChecks: candidate.skillArtifact.legalityChecks,
        illegalPatterns: candidate.skillArtifact.illegalPatterns,
        examples: candidate.skillArtifact.examples,
        counterExamples: candidate.skillArtifact.counterExamples,
        judgeTests: candidate.skillArtifact.judgeTests,
        confidence: "unreviewed",
      },
      skillMarkdown: renderCandidateMarkdown(candidate),
      provenance: {
        roleGraphRunHash: roleGraphResult.runHash,
        roleGraphCandidateHash: candidate.candidateHash,
        dshExecutionSessionHash: session.sessionHash,
        currentBinding: candidate.currentBinding,
      },
      unresolvedClaims: candidate.skillArtifact.unresolvedClaims,
      promotionBlockers: [
        "human_review_required",
        "ticket_18_evaluation_and_promotion_required",
      ],
      emittedAt: endedAt,
    });
    const runReceipt = createStarcraftTmgSkillGenerationRunReceipt({
      jobManifest: job,
      candidateBundle,
      executionSessionId: session.sessionId,
      startedAt,
      endedAt,
      disposition: "candidate_emitted",
      finishReason: "cross_time_passed_candidate_tool_emitted",
      exitStatus: 0,
      providerAttempts: 7,
      retryEvents: 0,
      usage: {
        inputTokens: usage.cacheMissTokens,
        cacheReadTokens: usage.cacheHitTokens,
        cacheWriteTokens: 0,
        outputTokens: usage.outputTokens,
        reasoningTokens: usage.reasoningTokens,
      },
      estimatedCost: calculatedCostNanoUsd / 1_000_000_000,
      sessionLogRef: `dsh-redacted://${session.sessionId}`,
      sessionLogHash,
      outputCredentialScanPassed: true,
    });
    state = "complete";
    return freeze({
      roleGraphResult,
      executionSession: session,
      candidateBundle,
      runReceipt,
      isolationAttestation,
    });
  }

  return freeze({
    metadata() {
      return freeze({
        schemaVersion: `${STARCRAFT_TMG_DSH_SKILL_EXECUTOR_VERSION}.metadata`,
        executionArm: "dsh",
        dshVersion: DSH_VERSION,
        runtimeTreeHash: DSH_RUNTIME_TREE_HASH,
        executorConfigHash: STARCRAFT_TMG_DSH_EXECUTOR_CONFIG_HASH,
        candidateToolSchemaHash:
          STARCRAFT_TMG_DSH_CANDIDATE_TOOL_SCHEMA_HASH,
        roleSequence: clone(STARCRAFT_TMG_DIRECT_CONTROL_MODEL_ROLES_V1),
        providerBridge: "host_mediated_file_relay",
        directNetworkAllowed: false,
        credentialsMountedInDsh: false,
        internalRetryAllowed: false,
        candidateEmissionOwner: "post_cross_time_dsh_tool",
        canAffectRules: false,
        mayPublishSkill: false,
        trainingTruth: false,
      });
    },
    isolationAttestation,
    executeRole,
    emitCandidate,
    finalize,
    readState() {
      return freeze({
        state,
        completedRoles: roleExecutions.map((execution) => execution.role),
        candidateEmissions: candidateEmission ? 1 : 0,
        providerAttempts: roleExecutions.length,
        retryEvents: 0,
        trainingTruth: false,
      });
    },
  });
}
