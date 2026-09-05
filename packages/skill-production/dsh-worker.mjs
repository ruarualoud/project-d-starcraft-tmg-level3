// Executed only inside the existing attested disposable OS sandbox.
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, realpath, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [requestPath, responsePath] = process.argv.slice(2);
const request = JSON.parse(await readFile(requestPath, "utf8"));
const jobRoot = path.resolve(path.dirname(requestPath), "..");
const bridgeRoot = path.join(path.dirname(responsePath), "bridge");
const hash = (value) => createHash("sha256").update(JSON.stringify(value) ?? "null").digest("hex");
let ordinal = 0, calls = 0, final = null;
const transcript = [], toolTrace = [];
async function relay(value) {
  ordinal += 1;
  const suffix = String(ordinal).padStart(6, "0") + ".json";
  const target = path.join(bridgeRoot, "request-" + suffix);
  await writeFile(target + ".tmp", JSON.stringify(value), { mode: 0o600 });
  await rename(target + ".tmp", target);
  for (;;) {
    try { return JSON.parse(await readFile(path.join(bridgeRoot, "response-" + suffix), "utf8")); }
    catch (error) {
      if (error.code !== "ENOENT") throw error;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }
}
try {
  const packagePath = path.join(jobRoot, "runtime/vendor/node_modules/@deepseek-ai/dsh/package.json");
  const requireDsh = createRequire(await realpath(packagePath));
  const tmpRoot = path.join(jobRoot, "tmp");
  process.env.DSH_HOME = path.join(tmpRoot, "dsh-home");
  process.env.DSH_TELEMETRY_DISABLED = "1";
  process.env.DSH_CWD = path.join(jobRoot, "input");
  await mkdir(process.env.DSH_HOME, { recursive: true });
  const configPath = path.join(tmpRoot, "production.cordis.json");
  await writeFile(configPath, JSON.stringify(request.config.rows.map((row) => ({
    ...row, name: requireDsh.resolve(row.name),
    ...(row.id === "session-persistence-jsonl" ? { config: { ...row.config, root: path.join(tmpRoot, "sessions") } } : {}),
  }))));
  const [{ boot }, llm, session, tools] = await Promise.all([
    "@deepseek-ai/dsh-app-boot", "@deepseek-ai/dsh-llm", "@deepseek-ai/dsh-session", "@deepseek-ai/dsh-tools",
  ].map((name) => import(pathToFileURL(requireDsh.resolve(name)).href)));
  const ctx = await boot("project-d-production", configPath, [], undefined, pathToFileURL(packagePath).href);
  class Adapter extends llm.LlmAdapter {
    providerRetryPolicy() { return { maxAttempts: 1 }; }
    async *stream(options) {
      calls += 1;
      if (calls > request.maxCalls) throw new Error("MODEL_CALL_LIMIT");
      // This is the real DSH transcript, including real tool results. It is not
      // replaced by the original host task as the legacy single relay was.
      const observed = { system: options.system || "", messages: options.messages,
        tools: (options.tools || []).map((tool) => ({ name: tool.name, description: tool.description || "" })) };
      const response = await relay({ kind: "model", call: calls, observed });
      if (response.error) throw new Error(response.error);
      const command = response.command;
      transcript.push({ call: calls, observedHash: hash(observed), commandHash: hash(command),
        action: command.action, receiptHash: response.receiptHash });
      const u = response.usage;
      const usage = { inputTokens: u.inputUnits, outputTokens: u.outputUnits,
        cacheReadTokens: u.inputCacheHitUnits || 0, cacheWriteTokens: 0, reasoningTokens: 0 };
      if (command.action === "finish") {
        final = command.content;
        const text = JSON.stringify(final);
        yield { type: "block-start", index: 0, blockType: "text" };
        yield { type: "text-delta", index: 0, text };
        yield { type: "block-end", index: 0, block: { type: "text", text } };
        yield { type: "usage", usage };
        yield { type: "finish", reason: { kind: "stop" } };
      } else {
        const id = "production-tool-" + calls;
        const args = JSON.stringify({ request: JSON.stringify(command.args) });
        yield { type: "block-start", index: 0, blockType: "tool-call" };
        yield { type: "tool-call-delta", index: 0, id, name: command.action, argumentsDelta: args };
        yield { type: "block-end", index: 0, block: { type: "tool-call", id, name: command.action, arguments: args } };
        yield { type: "usage", usage };
        yield { type: "finish", reason: { kind: "tool-calls" } };
      }
    }
  }
  ctx.llm.registerAdapter([request.config.providerRoute], new Adapter());
  for (const name of ["query", "read", "probe"]) ctx.tools.register(tools.defineTool({
    name, description: "Read-only frozen evidence or development kernel probe: " + name,
    parameters: { request: { type: "string", required: true } },
    output: { schema: { type: "object", additionalProperties: false, properties: { json: { type: "string", required: true } } },
      render: (_args, value) => [{ type: "text", text: value.json }] },
    async execute(args) {
      const input = JSON.parse(args.request);
      const result = await relay({ kind: "tool", name, args: input });
      toolTrace.push({ name, inputHash: hash(input), resultHash: hash(result) });
      return { json: JSON.stringify(result) };
    },
  }));
  const handle = await ctx.agents.create({
    sessionId: session.SessionId(request.sessionId),
    meta: { cwd: path.join(jobRoot, "input"), delegationDepth: 0, agentPreset: request.config.agentPreset },
    agentOptions: { provider: request.config.providerRoute, model: request.config.modelRoute, maxTokens: request.maxOutput },
  });
  handle.agent.followup(llm.createUserMessage({ content: [{ type: "text", text: request.task }], source: { kind: "user" } }));
  await handle.agent.whenIdle();
  await ctx.sessions.flush(handle.agent.session);
  const events = handle.agent.session.events.map((event) => ({ type: event.type, seq: event.seq,
    dataHash: hash(event.data), ...(event.type === "tool/call" ? { tool: event.data.name } : {}) }));
  await writeFile(responsePath, JSON.stringify({ final, calls, transcript, toolTrace, events,
    trainingTruth: false, directNetworkUsed: false }));
  await handle.dispose(); await ctx.fiber.dispose();
} catch (error) {
  await writeFile(responsePath, JSON.stringify({ error: /^[A-Z_]{3,100}$/.test(error.message)
    ? error.message : "DSH_SESSION_FAILED", diagnostic: String(error.message).split(jobRoot).join("__JOB__").slice(0, 800),
    diagnosticHash: hash(String(error.message)), calls, transcript, toolTrace }));
}
