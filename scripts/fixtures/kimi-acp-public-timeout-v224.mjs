#!/usr/bin/env node
// Concrete timeout reproduction only; no network, authentication or model.
import fs from 'node:fs/promises';
import readline from 'node:readline';
import { join } from 'node:path';
const cwd = process.cwd();
const id = 'public-timeout-fixture';
const sessionDir = join(cwd, 'fixture-session');
if (process.argv[2] === 'session') {
  console.log(JSON.stringify([{ id, workDir: cwd, sessionDir }]));
} else {
  const send = value => console.log(JSON.stringify(value));
  for await (const line of readline.createInterface({ input: process.stdin })) {
    const message = JSON.parse(line);
    if (message.method === 'initialize') {
      send({ id: message.id, result: { protocolVersion: 1 } });
    } else if (message.method === 'session/new') {
      await fs.mkdir(join(sessionDir, 'agents/main'), { recursive: true });
      await fs.writeFile(join(sessionDir, 'agents/main/wire.jsonl'), JSON.stringify({
        type: 'profile.bind', modelAlias: 'kimi-code/k3', profileName: 'agent',
        systemPrompt: await fs.readFile(join(cwd, '.kimi-code/agents/agent.md'), 'utf8'),
        activeToolNames: [], subagents: [],
      }) + '\n');
      send({ id: message.id, result: { sessionId: id } });
    } else if (message.method === 'session/prompt') {
      const payload = JSON.parse(message.params.prompt[0].text).input.userMessage;
      const update = (kind, text) => send({ method: 'session/update', params: {
        sessionId: id, update: { sessionUpdate: kind, content: { type: 'text', text } },
      } });
      update('agent_thought_chunk', 'PRIVATE_FIXTURE_THOUGHT_DO_NOT_SAVE');
      update('agent_message_chunk', payload.slice(0, 100));
      setTimeout(() => update('agent_message_chunk', payload.slice(100)), 20);
      // Deliberately never return the prompt result: the real host deadline fires.
    } else if (message.id !== undefined) {
      send({ id: message.id, result: {} });
    }
  }
}
