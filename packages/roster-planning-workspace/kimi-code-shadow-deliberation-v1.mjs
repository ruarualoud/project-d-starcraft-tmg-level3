// Explicit offline shadow Adapter. Kimi Code owns authentication and inference;
// the existing Roster Strategist owns evidence queries and Plan validation.
// This module is not selected by any production room or workspace default.
import fs from 'node:fs/promises';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, resolve, isAbsolute } from 'node:path';
import { randomUUID } from 'node:crypto';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { normalizeProviderJsonDocumentV1 } from '../secure-provider-runtime/provider-response-outcome-v1.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 } from '../structured-generation/output-contract-registry-v1.mjs';

const exec = promisify(execFile);
const MODEL = 'kimi-code/k3';
// Only protocol metadata is projected. Never serialize message/thought bodies or
// arbitrary provider error messages (which can contain request data/credentials).
export function summarizeKimiCodeTerminalV1(wire, { sessionId, contextHash,
  acpStopReason = null, publicCharacters = 0 } = {}) {
  const code = value => typeof value === 'string' && /^[\w.-]{1,120}$/u.test(value) ? value : null;
  const terminal = wire.findLast(e => e.type === 'turn.ended');
  const agentEnd = wire.findLast(e => e.type === 'agent.turn.ended');
  const promptEnd = wire.findLast(e => e.type === 'prompt.completed');
  const usages = wire.filter(e => e.type === 'usage.record');
  const inputUnits = usages.reduce((n,e) => n + (e.usage.inputOther || 0)
    + (e.usage.inputCacheRead || 0) + (e.usage.inputCacheCreation || 0), 0);
  const outputUnits = usages.reduce((n,e) => n + (e.usage.output || 0), 0);
  // Cancellation's all-zero bookkeeping is not proof of a free request.
  const usage = inputUnits + outputUnits > 0
    ? { inputUnits, outputUnits, totalUnits: inputUnits + outputUnits } : null;
  const reasons = [terminal?.reason, agentEnd?.outcome, promptEnd?.reason];
  return { version: 'kimi_code_terminal_v1', sessionId, contextHash,
    acpStopReason: code(acpStopReason), turnReason: code(terminal?.reason),
    agentOutcome: code(agentEnd?.outcome), promptReason: code(promptEnd?.reason),
    failed: reasons.some(reason => ['failed', 'error', 'cancelled', 'canceled', 'interrupted'].includes(reason))
      || Boolean(terminal?.error),
    errorCode: code(terminal?.error?.code), errorName: code(terminal?.error?.name),
    retryable: terminal?.error?.retryable === true,
    durationMs: terminal?.durationMs ?? null,
    recordedModelRequests: wire.filter(e => e.type === 'llm.request').length,
    retryEvents: wire.filter(e => e.type === 'turn.step.retrying').map(e => ({
      failedAttempt: e.failedAttempt, nextAttempt: e.nextAttempt, maxAttempts: e.maxAttempts,
      errorName: code(e.errorName), delayMs: e.delayMs ?? null, time: e.time ?? null })),
    usage, chargeStatus: usage ? 'usage_reported_money_unreported' : 'unknown',
    publicCharacters, hostAutomaticRetry: false, trainingTruth: false };
}
export async function createKimiCodeShadowDeliberationV1({ directory, instructions,
  executable = '/Users/rualoud/.kimi-code/bin/kimi', maxCalls = 4,
  timeoutMs = 600000, onProgress = async () => {} }) {
  if (!isAbsolute(directory) || !instructions || !Number.isInteger(maxCalls) || maxCalls < 1) {
    throw Error('KIMI_SHADOW_CONFIG_INVALID');
  }
  await fs.mkdir(directory);
  // Project profiles are resolved from the nearest Git root, not arbitrary cwd.
  // A separate empty repository prevents the shadow override affecting the
  // integration worktree or accidentally inheriting its agent tools.
  await exec('git', ['init', '--quiet', directory], { cwd: directory, timeout: 10000 });
  // ACP session/new does not use the root command's --agent-file selection in
  // CLI2.0.2. Use the documented project-local default override, only inside
  // this isolated shadow directory, and verify its actual binding before send.
  const profileDirectory = join(directory, '.kimi-code/agents');
  await fs.mkdir(profileDirectory, { recursive: true });
  const profilePath = join(profileDirectory, 'agent.md');
  await fs.writeFile(profilePath, [
    '---', 'name: agent', 'override: true',
    'description: Produce one public roster deliberation JSON using supplied evidence.',
    'tools: []', 'subagents: []', '---', '', instructions,
    '', 'The current user input supplies the output JSON schema. Return that JSON only.',
    'This is an offline shadow candidate, not authority to change files or a live game.',
  ].join('\n'), { flag: 'wx', mode: 0o600 });
  const stderr = await fs.open(join(directory, 'acp.stderr.private.log'), 'wx', 0o600);
  const child = spawn(executable, ['--model', MODEL, 'acp'],
    { cwd: directory, stdio: ['pipe', 'pipe', stderr.fd] });
  let nextId = 0, closed = false, buffer = '', active = null, logicalCalls = 0;
  const pending = new Map(), sessions = new Set(), results = [], interruptions = [];
  // Streaming notifications and the caller's atomic report writes must not race.
  let progressQueue = Promise.resolve();
  const progress = event => {
    const next = progressQueue.then(() => onProgress(event));
    progressQueue = next.catch(() => {});
    return next;
  };
  function checkpoint(state, outcome, force = false) {
    const now = Date.now();
    if (!force && now - state.lastCheckpointMs < 1000) return state.checkpointQueue;
    state.lastCheckpointMs = now;
    const text = state.text;
    const snapshot = { version: 'kimi_public_checkpoint_v1',
      sessionId: state.sessionId, contextHash: state.contextHash, outcome,
      publicCharacters: text.length, publicBytes: Buffer.byteLength(text),
      publicTextHash: hash(text), firstOutputAt: state.firstOutputAt || null,
      lastOutputAt: state.lastOutputAt || null, recordedAt: new Date().toISOString(),
      accepted: false, chargeStatus: 'unknown', trainingTruth: false };
    state.checkpointQueue = state.checkpointQueue.then(async () => {
      await fs.writeFile(state.prefix + '.public.partial.private.txt', text, { mode: 0o600 });
      await fs.writeFile(state.prefix + '.public-progress.private.json', JSON.stringify(snapshot, null, 2), { mode: 0o600 });
      state.lastCheckpoint = snapshot;
      await progress({ type: 'public_output_checkpoint', turn: state.turn, ...snapshot });
    }).catch(error => { state.checkpointFailure = String(error.message).slice(0, 500); });
    return state.checkpointQueue;
  }
  const send = value => child.stdin.write(JSON.stringify(value) + '\n');
  const rejectAll = error => { for (const p of pending.values()) { clearTimeout(p.timer); p.reject(error); } pending.clear(); };
  child.on('error', rejectAll);
  const exited = new Promise(resolveExit => child.once('close', (code, signal) => {
    closed = true; rejectAll(Error('KIMI_ACP_EXITED:' + (code ?? signal))); resolveExit({ code, signal });
  }));
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', chunk => {
    buffer += chunk;
    for (;;) {
      const end = buffer.indexOf('\n'); if (end < 0) break;
      const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
      if (!line.trim()) continue;
      let message;
      try { message = JSON.parse(line); } catch { rejectAll(Error('KIMI_ACP_INVALID_JSON')); continue; }
      if (message.method === 'session/update') {
        const update = message.params?.update;
        if (active && message.params?.sessionId === active.sessionId) {
          if (update?.sessionUpdate === 'agent_message_chunk' && update.content?.type === 'text') {
            active.text += update.content.text;
            active.firstOutputAt ||= new Date().toISOString();
            active.lastOutputAt = new Date().toISOString();
            void checkpoint(active, 'streaming');
          }
          // Thought chunks are neither requested nor projected to public evidence.
          if (String(update?.sessionUpdate || '').startsWith('tool_call')) active.toolEvents++;
        }
      } else if (message.method && message.id !== undefined) {
        // No filesystem/terminal capabilities were advertised. Never execute a
        // reverse request, even if a future CLI/profile accidentally exposes one.
        send(message.method === 'session/request_permission'
          ? { jsonrpc: '2.0', id: message.id, result: { outcome: { outcome: 'cancelled' } } }
          : { jsonrpc: '2.0', id: message.id, error: { code: -32601, message: 'Offline shadow client exposes no tools' } });
      } else if (message.id !== undefined && pending.has(message.id)) {
        const p = pending.get(message.id); pending.delete(message.id); clearTimeout(p.timer);
        if (message.error) p.reject(Error('KIMI_ACP_RPC:' + JSON.stringify(message.error)));
        else p.resolve(message.result);
      }
    }
  });
  function rpc(method, params, deadline = 30000) {
    if (closed) return Promise.reject(Error('KIMI_ACP_CLOSED'));
    const id = ++nextId;
    return new Promise((resolveRpc, reject) => {
      const timer = setTimeout(() => { pending.delete(id);
        if (method === 'session/prompt') send({ jsonrpc: '2.0', method: 'session/cancel', params: { sessionId: params.sessionId } });
        reject(Error('KIMI_ACP_TIMEOUT:' + method));
      }, deadline);
      pending.set(id, { resolve: resolveRpc, reject, timer });
      send({ jsonrpc: '2.0', id, method, params });
    });
  }
  async function readWire(sessionId) {
    const { stdout } = await exec(executable, ['session', 'list', '--cwd', directory, '--limit', '10', '--json'],
      { cwd: directory, timeout: 20000, maxBuffer: 100000 });
    const row = JSON.parse(stdout).find(s => s.id === sessionId && resolve(s.workDir) === resolve(directory));
    if (!row?.sessionDir) throw Error('KIMI_SHADOW_SESSION_NOT_FOUND');
    const wire = (await fs.readFile(join(row.sessionDir, 'agents/main/wire.jsonl'), 'utf8'))
      .split('\n').filter(Boolean).map(line => JSON.parse(line));
    const binding = wire.find(e => e.type === 'profile.bind');
    if (binding?.modelAlias !== MODEL || binding.profileName !== 'agent'
      || !binding.systemPrompt?.includes(instructions)
      || !Array.isArray(binding.activeToolNames) || binding.activeToolNames.length
      || !Array.isArray(binding.subagents) || binding.subagents.length) {
      await fs.writeFile(join(directory, 'profile-failure.private.json'), JSON.stringify({
        sessionId, modelAlias: binding?.modelAlias, profileName: binding?.profileName,
        instructionsMatched: Boolean(binding?.systemPrompt?.includes(instructions)),
        activeToolNames: binding?.activeToolNames, subagents: binding?.subagents,
        recordedModelRequests: wire.filter(e => e.type === 'llm.request').length,
      }, null, 2), { mode: 0o600 });
      throw Error('KIMI_SHADOW_PROFILE_NOT_ISOLATED');
    }
    return { row, wire, binding };
  }
  async function newSession() {
    const s = await rpc('session/new', { cwd: directory, mcpServers: [] });
    if (!s?.sessionId) throw Error('KIMI_SHADOW_SESSION_ID_MISSING');
    sessions.add(s.sessionId);
    const observed = await readWire(s.sessionId);
    if (observed.wire.some(e => e.type === 'llm.request')) throw Error('KIMI_SHADOW_UNEXPECTED_PREFLIGHT_CALL');
    return s;
  }
  let prepared;
  try {
    const init = await rpc('initialize', { protocolVersion: 1, clientCapabilities: {},
      clientInfo: { name: 'project-d-offline-shadow', version: '1' } });
    if (init.protocolVersion !== 1) throw Error('KIMI_ACP_VERSION_UNSUPPORTED');
    prepared = await newSession();
    await progress({ type: 'preflight', pid: child.pid, sessionId: prepared.sessionId,
      agentInfo: init.agentInfo, modelAlias: MODEL, tools: [], subagents: [], modelCalls: 0 });
  } catch (error) { child.kill('SIGTERM'); await exited; await stderr.close(); throw error; }

  const factory = {
    availability: () => ({ available: !closed, kind: 'kimi_code_cli_acp_shadow', modelVersion: 'k3', paidProvider: true }),
    async createForRun({ sessionId, runKind, planHash, control, onEvent }) {
      return {
        descriptor: () => ({ kind: 'kimi_code_cli_acp_shadow', modelVersion: 'k3',
          promptVersion: 'roster_existing_prompt_via_kimi_acp_shadow_v1', trainingTruth: false }),
        async deliberate(request) {
          if (active || closed || control?.cancelled?.()) throw Error('KIMI_SHADOW_NOT_READY');
          if (logicalCalls >= maxCalls) throw Error('KIMI_SHADOW_AUTHORIZED_CALLS_EXHAUSTED');
          const format = request.responseFormat;
          if (!format?.schema || !format.outputContractRef) throw Error('KIMI_SHADOW_OUTPUT_CONTRACT_REQUIRED');
          const session = prepared || await newSession(); prepared = null;
          const turn = ++logicalCalls, prefix = join(directory, 'turn-' + String(turn).padStart(2, '0'));
          const modelInput = JSON.stringify({ promptPack: request.promptPack, promptNodes: request.promptNodes,
            userMessage: request.userMessage, responseContract: request.responseContract });
          const prompt = JSON.stringify({ input: JSON.parse(modelInput), outputJsonSchema: format.schema,
            outputInstruction: 'Return exactly one JSON object matching outputJsonSchema. The host executes evidenceRequests through the existing read-only evidence interface; do not execute external tools.' });
          await fs.writeFile(prefix + '.request.private.json', JSON.stringify(request), { flag: 'wx', mode: 0o600 });
          let dispatch = { schemaVersion: 'starcraft_tmg_provider_dispatch_record_v1',
            requestId: 'kimi-shadow-' + randomUUID(), sessionId, runKind, planHash,
            roundKind: request.roundKind, roundIndex: request.roundIndex, contextHash: request.contextHash,
            requestBodyHash: hash({ model: 'k3', instructions, prompt }), outputContractRef: format.outputContractRef,
            providerKind: 'kimi_code_cli_acp_shadow', kimiSessionId: session.sessionId,
            status: 'reserved', costStatus: 'not_sent' };
          const record = async (status, extra = {}) => { dispatch = { ...dispatch, ...extra, status };
            await onEvent?.({ type: 'provider_dispatch', dispatch, at: new Date().toISOString() }); };
          await onEvent?.({ type: 'round_started', roundKind: request.roundKind, roundIndex: request.roundIndex,
            replayed: false, at: new Date().toISOString() });
          await record('reserved'); await record('sending', { costStatus: 'unknown' });
          active = { sessionId: session.sessionId, text: '', toolEvents: 0,
            prefix, turn, contextHash: request.contextHash,
            lastCheckpointMs: 0, checkpointQueue: Promise.resolve() };
          const started = Date.now();
          await progress({ type: 'prompt_sent', turn, kimiSessionId: session.sessionId,
            contextHash: request.contextHash, modelInputBytes: Buffer.byteLength(modelInput), promptBytes: Buffer.byteLength(prompt) });
          try {
            const end = await rpc('session/prompt', { sessionId: session.sessionId, prompt: [{ type: 'text', text: prompt }] }, timeoutMs);
            active.responseEnded = true;
            await checkpoint(active, 'complete_unreviewed', true);
            const rawText = active.text, toolEvents = active.toolEvents;
            await fs.writeFile(prefix + '.response.private.txt', rawText, { flag: 'wx', mode: 0o600 });
            const observed = await readWire(session.sessionId);
            const terminal = summarizeKimiCodeTerminalV1(observed.wire, {
              sessionId: session.sessionId, contextHash: request.contextHash,
              acpStopReason: end.stopReason, publicCharacters: rawText.length });
            active.terminal = terminal;
            await fs.writeFile(prefix + '.terminal.private.json', JSON.stringify(terminal, null, 2), { flag: 'wx', mode: 0o600 });
            const usage = terminal.usage;
            await record('response_received', { costStatus: usage ? 'known' : 'unknown', usage });
            await progress({ type: 'prompt_terminal', turn, terminal });
            if (terminal.failed) throw Object.assign(Error('ROSTER_WORKSPACE_KIMI_TURN_FAILED:'
              + (terminal.errorCode || terminal.turnReason || terminal.agentOutcome)), {
              code: 'ROSTER_WORKSPACE_KIMI_TURN_FAILED', terminal });
            if (!rawText.trim()) throw Object.assign(Error('ROSTER_WORKSPACE_KIMI_EMPTY_RESPONSE'), {
              code: 'ROSTER_WORKSPACE_KIMI_EMPTY_RESPONSE', terminal });
            if (end.stopReason !== 'end_turn' || toolEvents) throw Error('KIMI_SHADOW_INCOMPLETE_OR_TOOL_USE');
            const normalized = normalizeProviderJsonDocumentV1(rawText), output = JSON.parse(normalized.text);
            const validation = validateStarcraftTmgProviderJsonSchemaValueV1(format.schema, output);
            const receipt = { providerKind: 'kimi_code_cli_acp_shadow', modelVersion: 'k3', promptVersion: request.promptPack,
              roundKind: request.roundKind, contextHash: request.contextHash, outputHash: hash(output),
              outputContractRef: format.outputContractRef, providerSchemaValid: validation.ok,
              providerSchemaIssueCount: validation.issues.length, usage, latencyMs: Date.now() - started,
              kimiSessionId: session.sessionId, recordedModelRequests: terminal.recordedModelRequests, nativeTools: [],
              providerStrictSchemaEnforced: false, schemaCheckedLocally: true, trainingTruth: false };
            receipt.receiptHash = hash(receipt);
            await fs.writeFile(prefix + '.receipt.private.json', JSON.stringify({ receipt, validation,
              normalizationKind: normalized.kind, stopReason: end.stopReason, firstOutputAt: active.firstOutputAt }, null, 2), { flag: 'wx', mode: 0o600 });
            await onEvent?.({ type: 'round_completed', roundKind: request.roundKind, roundIndex: request.roundIndex,
              replayed: false, paidProviderCall: usage ? true : null, usage, latencyMs: receipt.latencyMs,
              receiptHash: receipt.receiptHash, dispatchRequestId: dispatch.requestId,
              sanitizedOutputRecord: { roundKind: request.roundKind, roundIndex: request.roundIndex, contextHash: request.contextHash,
                outputHash: receipt.outputHash, dispatchRequestId: dispatch.requestId, outputContractRef: format.outputContractRef,
                sanitizedOutput: output, droppedForbiddenKeyPaths: [], transportSchemaIssues: validation.issues },
              at: new Date().toISOString() });
            await record('completed', { outputHash: receipt.outputHash });
            results.push(receipt); await progress({ type: 'prompt_completed', turn, receipt });
            return { output, receipt };
          } catch (error) {
            await checkpoint(active, active.responseEnded ? 'failed_complete_response' : 'interrupted', true);
            interruptions.push({ turn, ...active.lastCheckpoint,
              checkpointFailure: active.checkpointFailure || null,
              terminal: active.terminal || null,
              failure: String(error.message).slice(0, 500) });
            await onEvent?.({ type: 'round_failed', roundKind: request.roundKind,
              roundIndex: request.roundIndex, replayed: false,
              code: error.code || 'ROSTER_WORKSPACE_KIMI_INTERRUPTED',
              usage: active.terminal?.usage || null,
              paidProviderCall: active.terminal?.usage ? true : null,
              latencyMs: Date.now() - started, dispatchRequestId: dispatch.requestId,
              at: new Date().toISOString() });
            await record('shadow_failed', { failure: String(error.message).slice(0, 500) });
            throw error;
          } finally { active = null; await rpc('session/close', { sessionId: session.sessionId }).catch(() => {}); sessions.delete(session.sessionId); }
        },
      };
    },
  };
  return { factory, metadata: () => ({ pid: child.pid, logicalCalls, results, interruptions }),
    close: async () => { if (!closed) {
      for (const sessionId of sessions) await rpc('session/close', { sessionId }).catch(() => {});
      child.stdin.end(); const timer = setTimeout(() => child.kill('SIGTERM'), 1000);
      await exited; clearTimeout(timer);
    } await stderr.close(); },
  };
}
