// Only the observed v227 failed-turn/empty-JSON misclassification.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createKimiCodeShadowDeliberationV1 } from '../packages/roster-planning-workspace/kimi-code-shadow-deliberation-v1.mjs';
const [base, phase] = process.argv.slice(2);
assert.ok(base && ['red', 'green'].includes(phase));
const dest = base + '/common-v228-terminal-' + phase + '.private.json';
await (await fs.open(dest, 'wx', 0o600)).close();
const report = { phase, modelCalls: 0, nativeCalls: 0, originalWrites: 0, ok: false };
let adapter;
try {
  const parent = await fs.mkdtemp(base + '/v228-terminal-' + phase + '-');
  const target = parent + '/shadow';
  const executable = fileURLToPath(new URL('./fixtures/kimi-acp-failed-turn-v228.mjs', import.meta.url));
  await fs.chmod(executable, 0o700);
  const request = JSON.parse(await fs.readFile(base + '/B/kimi-code-candidate-review-v227/turn-03.request.private.json', 'utf8'));
  const events = [];
  adapter = await createKimiCodeShadowDeliberationV1({ directory: target,
    instructions: 'Concrete failed-turn reproduction.', executable, maxCalls: 1 });
  const port = await adapter.factory.createForRun({ sessionId: 'fixture', runKind: 'final-plan-review',
    planHash: 'a'.repeat(64), onEvent: async e => events.push(e) });
  let failure;
  try { await port.deliberate(request); } catch (e) { failure = e; }
  assert.equal(failure?.code, 'ROSTER_WORKSPACE_KIMI_TURN_FAILED',
    'provider terminal must not become Unexpected end of JSON input');
  const terminal = JSON.parse(await fs.readFile(target + '/turn-01.terminal.private.json', 'utf8'));
  assert.equal(terminal.turnReason, 'failed');
  assert.equal(terminal.errorCode, 'provider.connection_error');
  assert.equal(terminal.errorName, 'APITimeoutError');
  assert.equal(terminal.recordedModelRequests, 3);
  assert.equal(terminal.retryEvents.length, 2);
  assert.equal(terminal.usage, null);
  assert.equal(terminal.chargeStatus, 'unknown');
  assert.equal(terminal.contextHash, request.contextHash);
  assert.equal(terminal.publicCharacters, 0);
  assert.equal(terminal.hostAutomaticRetry, false);
  assert.ok(!JSON.stringify(terminal).includes('PRIVATE_SENTINEL'));
  assert.equal(events.filter(e => e.type === 'round_failed').length, 1);
  assert.equal(events.filter(e => e.type === 'round_completed').length, 0);
  assert.equal(adapter.metadata().logicalCalls, 1);
  assert.equal(adapter.metadata().interruptions[0].terminal.errorCode, 'provider.connection_error');
  report.ok = true; report.terminal = terminal;
} catch (e) { report.failure = String(e.stack || e).slice(0, 1600); process.exitCode = 1; }
finally {
  if (adapter) await adapter.close();
  await fs.writeFile(dest, JSON.stringify(report, null, 2), { mode: 0o600 });
}
console.log(JSON.stringify(report));
