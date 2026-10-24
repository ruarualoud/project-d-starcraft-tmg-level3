// Reproduce the actual v223 partial-output loss through the real ACP Adapter.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createKimiCodeShadowDeliberationV1 } from '../packages/roster-planning-workspace/kimi-code-shadow-deliberation-v1.mjs';
const [base, phase] = process.argv.slice(2);
assert.ok(base && ['red', 'green'].includes(phase));
const dest = base + '/common-v224-public-checkpoint-' + phase + '.private.json';
await (await fs.open(dest, 'wx', 0o600)).close();
const report = { phase, modelCalls: 0, nativeCalls: 0, sourceWrites: 0, ok: false };
let adapter;
try {
  const directory = await fs.mkdtemp(base + '/v224-checkpoint-' + phase + '-');
  // Adapter requires an exclusive new directory; keep the generated test cwd
  // as its parent rather than removing or replacing anything.
  const target = directory + '/shadow';
  const executable = fileURLToPath(new URL('./fixtures/kimi-acp-public-timeout-v224.mjs', import.meta.url));
  await fs.chmod(executable, 0o700);
  const raw = await fs.readFile(base + '/B/kimi-code-revision-shadow-v223/turn-01.public-interrupted.private.txt', 'utf8');
  const request = JSON.parse(await fs.readFile(base + '/B/kimi-code-revision-shadow-v223/turn-01.request.private.json', 'utf8'));
  const events = [];
  adapter = await createKimiCodeShadowDeliberationV1({ directory: target, instructions: 'Timeout reproduction.',
    executable, timeoutMs: 180, maxCalls: 1, onProgress: async event => { events.push(event); } });
  const port = await adapter.factory.createForRun({ sessionId: 'fixture', runKind: 'revision', planHash: 'a'.repeat(64) });
  await assert.rejects(port.deliberate({ ...request, userMessage: raw }), /KIMI_ACP_TIMEOUT:session\/prompt/);
  const saved = await fs.readFile(target + '/turn-01.public.partial.private.txt', 'utf8').catch(() => null);
  assert.equal(saved, raw, 'actual complete public prefix must survive host cancellation');
  const checkpoint = JSON.parse(await fs.readFile(target + '/turn-01.public-progress.private.json', 'utf8'));
  assert.equal(checkpoint.outcome, 'interrupted');
  assert.equal(checkpoint.publicCharacters, raw.length);
  assert.equal(checkpoint.contextHash, request.contextHash);
  assert.equal(checkpoint.chargeStatus, 'unknown');
  assert.equal(checkpoint.accepted, false);
  assert.ok(checkpoint.firstOutputAt && checkpoint.lastOutputAt);
  assert.ok(!saved.includes('PRIVATE_FIXTURE_THOUGHT_DO_NOT_SAVE'));
  assert.ok(events.some(event => event.type === 'public_output_checkpoint'));
  report.ok = true; report.publicCharacters = raw.length; report.checkpoint = checkpoint;
} catch (error) { report.failure = String(error.message).slice(0, 600); process.exitCode = 1; }
finally {
  if (adapter) await adapter.close();
  await fs.writeFile(dest, JSON.stringify(report, null, 2), { mode: 0o600 });
}
console.log(JSON.stringify(report));
