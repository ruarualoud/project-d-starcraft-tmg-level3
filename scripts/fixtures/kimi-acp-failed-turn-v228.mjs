#!/usr/bin/env node
// Reproduce v227: Kimi reports failed internally but ACP returns end_turn.
// No authentication, model or network; terminal fields are from the saved run.
import fs from 'node:fs/promises';
import readline from 'node:readline';
import { join } from 'node:path';
const cwd = process.cwd(), id = 'failed-turn-fixture';
const sessionDir = join(cwd, 'fixture-session');
const wirePath = join(sessionDir, 'agents/main/wire.jsonl');
if (process.argv[2] === 'session') {
  console.log(JSON.stringify([{ id, workDir: cwd, sessionDir }]));
} else {
  const send = value => console.log(JSON.stringify(value));
  for await (const line of readline.createInterface({ input: process.stdin })) {
    const message = JSON.parse(line);
    if (message.method === 'initialize') send({ id: message.id, result: { protocolVersion: 1 } });
    else if (message.method === 'session/new') {
      await fs.mkdir(join(sessionDir, 'agents/main'), { recursive: true });
      await fs.writeFile(wirePath, JSON.stringify({ type: 'profile.bind',
        modelAlias: 'kimi-code/k3', profileName: 'agent',
        systemPrompt: await fs.readFile(join(cwd, '.kimi-code/agents/agent.md'), 'utf8'),
        activeToolNames: [], subagents: [] }) + '\n');
      send({ id: message.id, result: { sessionId: id } });
    } else if (message.method === 'session/prompt') {
      const events = [
        { type: 'llm.request' },
        { type: 'turn.step.retrying', failedAttempt: 1, nextAttempt: 2, maxAttempts: 3,
          errorName: 'APIConnectionError', errorMessage: 'terminated' },
        { type: 'llm.request' },
        { type: 'turn.step.retrying', failedAttempt: 2, nextAttempt: 3, maxAttempts: 3,
          errorName: 'APITimeoutError', errorMessage: 'Request timed out.' },
        { type: 'llm.request' },
        { type: 'turn.ended', reason: 'failed', durationMs: 201027,
          error: { code: 'provider.connection_error', message: 'Request timed out.',
            name: 'APITimeoutError', retryable: true } },
        { type: 'prompt.completed', reason: 'failed' },
      ];
      await fs.appendFile(wirePath, events.map(e => JSON.stringify(e)).join('\n') + '\n');
      send({ method: 'session/update', params: { sessionId: id, update: {
        sessionUpdate: 'agent_thought_chunk', content: { type: 'text', text: 'PRIVATE_SENTINEL_NOT_PUBLIC' } } } });
      send({ id: message.id, result: { stopReason: 'end_turn' } });
    } else if (message.id !== undefined) send({ id: message.id, result: {} });
  }
}
