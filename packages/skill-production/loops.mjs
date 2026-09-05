import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { attestPinnedDshRuntimeV1 } from "../skill-generation-runtime/dsh-pinned-runtime-v1.mjs";
import { createDisposableOsSkillRunnerV1, verifyDisposableOsMediatedJobReceiptV1 } from "../skill-generation-runtime/disposable-os-runner-v1.mjs";
import { STARCRAFT_TMG_DSH_EXECUTOR_CONFIG_V1 as baseConfig } from "../skill-generation-runtime/dsh-skill-executor-v1.mjs";
import { exact, safe, seal, fail, hash } from "./common.mjs";
import { modelEvidence } from "./spans.mjs";

export const LOOP_LIMITS = Object.freeze({ maxCalls: 6, maxTools: 5, maxOutput: 4096, maxWallMs: 180000 });
const config = { ...baseConfig, rows: baseConfig.rows.map((row) => row.id === "system-prompt"
  ? { ...row, config: { ...row.config, includeHarnessIdentity: false, includeRuntimeContext: false } } : row) };
export function validateCommand(command) {
  safe(command);
  if (command?.action === "finish") {
    exact(command, ["action", "content"]); if (!command.content || typeof command.content !== "object") fail("COMMAND_CONTENT_INVALID");
  } else {
    exact(command, ["action", "args"]);
    if (!["query", "read", "probe"].includes(command.action)) fail("TOOL_NOT_ALLOWED");
  }
  return command;
}
export function createToolPort(reader, verifier, chapterId) {
  const trace = []; const readRefs = new Set();
  return {
    async execute(name, args) {
      let result;
      try {
        if (name === "query") { exact(args, ["query"]); result = reader.query({ chapterId, query: args.query, limit: 40 }); }
        else if (name === "read") {
          exact(args, ["refs"]);
          result = reader.read({ refs: args.refs, maxChars: 48000 });
          if (result.rows.some((row) => !row.chapterIds.includes(chapterId))) fail("TOOL_CHAPTER_SCOPE_REJECTED");
          args.refs.forEach((id) => readRefs.add(id));
          result = modelEvidence(result);
        } else if (name === "probe") {
          exact(args, ["id"]);
          if (!verifier.list(chapterId).some((test) => test.id === args.id)) fail("TOOL_PROBE_SCOPE_REJECTED");
          result = verifier.run(args.id);
        } else fail("TOOL_NOT_ALLOWED");
      } catch (error) { result = { error: error.code || "TOOL_INPUT_INVALID" }; }
      trace.push(seal({ name, args, result }));
      return result;
    },
    trace: () => [...trace], readRefs: () => [...readRefs],
  };
}
export async function runDirectLoop({ task, callModel, toolPort, limits = LOOP_LIMITS }) {
  const messages = [{ role: "user", content: task }], transcript = [];
  for (let call = 1; call <= limits.maxCalls; call += 1) {
    const observed = { system: config.rows.find((r) => r.id === "system-prompt").config.persona,
      messages, tools: ["query", "read", "probe"].map((name) => ({ name })) };
    const response = await callModel({ call, observed });
    const command = validateCommand(response.command);
    transcript.push({ call, observedHash: hash(observed), commandHash: hash(command),
      action: command.action, receiptHash: response.receiptHash });
    if (command.action === "finish") return seal({ final: command.content, transcript, calls: call,
      toolTrace: toolPort.trace(), directNetworkUsed: false, trainingTruth: false });
    if (call >= limits.maxCalls || toolPort.trace().length >= limits.maxTools) fail("MODEL_CALL_LIMIT");
    messages.push({ role: "assistant", content: JSON.stringify(command) });
    const result = await toolPort.execute(command.action, command.args);
    messages.push({ role: "tool", name: command.action, content: JSON.stringify(result) });
  }
  fail("MODEL_CALL_LIMIT");
}
export async function prepareDshLoop(root) {
  const pinned = await attestPinnedDshRuntimeV1({ repositoryRoot: root });
  const runner = createDisposableOsSkillRunnerV1({ repositoryRoot: root });
  const attestation = await runner.attest();
  const entrySource = await readFile(new URL("./dsh-worker.mjs", import.meta.url), "utf8");
  return {
    binding: seal({ runtimeTreeHash: pinned.receipt.runtimeTreeHash, entryHash: hash(entrySource), configHash: hash(config) }),
    async run({ task, callModel, toolPort, limits = LOOP_LIMITS }) {
      let calls = 0;
      const result = await runner.runMediated({
        jobId: "production-" + randomUUID(), attestationHash: attestation.attestationHash,
        entrySource,
        stagedInput: { task, config, runtimeTreeHash: pinned.receipt.runtimeTreeHash,
          sessionId: "production-" + randomUUID(), maxCalls: limits.maxCalls, maxOutput: limits.maxOutput },
        runtimeTree: { sourceRoot: pinned.runtimeRoot, expectedManifestHash: pinned.receipt.runtimeTreeHash },
        timeoutMs: limits.maxWallMs,
        bridge: { maximumRequests: limits.maxCalls + limits.maxTools, async handler(request) {
          if (request.kind === "model") {
            exact(request, ["kind", "call", "observed"]);
            if (request.call !== ++calls || calls > limits.maxCalls) fail("MODEL_CALL_LIMIT");
            const response = await callModel(request); validateCommand(response.command); return response;
          }
          exact(request, ["kind", "name", "args"]);
          if (request.kind !== "tool" || toolPort.trace().length >= limits.maxTools) fail("TOOL_CALL_LIMIT");
          return toolPort.execute(request.name, request.args);
        } },
      });
      verifyDisposableOsMediatedJobReceiptV1(result.receipt, attestation);
      if (result.output.error || !result.output.final || result.output.calls !== calls) fail(result.output.error || "DSH_FINAL_MISSING",
        { diagnostic: result.output.diagnostic || null });
      if (result.output.toolTrace.length !== toolPort.trace().length) fail("DSH_TOOL_TRACE_MISMATCH");
      return seal({ ...result.output, sandboxReceipt: result.receipt, toolTrace: toolPort.trace(), runtimeBinding: this.binding });
    },
  };
}
