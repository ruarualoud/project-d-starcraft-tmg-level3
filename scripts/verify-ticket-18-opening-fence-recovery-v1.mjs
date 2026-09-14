import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { seal, hash } from '../packages/skill-production/common.mjs';
import { decodeOpeningFenceV1, recoverOpeningFenceResponseV1 } from '../packages/structured-generation/adapters/opening-fence-recovery-v1.mjs';
import { PARENT_RUN, FAILED_ATTEMPT, FAILED_ROLE, prepareOpeningFenceContinuationV1, withStrategyOpeningFenceContinuationV1 } from './support/strategy-opening-fence-continuation-v1.mjs';
import { BUILD, DB_PATH, json, providerRegistry, ledgerSnapshot, codeHashes } from './support/strategy-live-production-support-v1.mjs';
const checks = [];
async function check(name, fn) { await fn(); checks.push(name); console.log('PASS ' + name); }
const prior = ledgerSnapshot();
const input = await json('build/ticket-18-general-strategy-live-v1/' + PARENT_RUN + '/production-input.json');
const wire = await json('build/ticket-18-general-strategy-live-v1/' + PARENT_RUN + '/wire/' + FAILED_ATTEMPT + '.json');
const capabilities = await json('build/ticket-18-general-strategy-live-v1/capabilities.json');
let prepared;
await check('actual paid failure reproduced then recovered without network', async () => {
  prepared = await prepareOpeningFenceContinuationV1({ databasePath: DB_PATH, input, wire, capabilities, binding: providerRegistry().binding });
  assert.equal(prepared.recovery.additionalProviderCalls, 0);
  assert.equal(prepared.recovery.negativeFindingsPreserved, 8);
  assert.equal(prepared.artifact.value.limitations.length, 6);
});
await check('all original values preserved including every negative finding', () => {
  const raw = wire.response.payload.output[0].content[0].text;
  assert.deepEqual(prepared.artifact.value, JSON.parse(raw.slice(raw.indexOf('\n') + 1)));
  assert.equal(prepared.recovery.response.usageReceipt.responseNormalization.visibleScalarEdits, 0);
});
await check('reject truncated, ambiguous, prose-wrapped, scalar, extra-document and oversized output', () => {
  for (const text of ['```json\n{"a":', '```json\n{"a":1}\n```', 'prefix\n```json\n{}',
    '```json\n{} suffix', '```json\n{}{}', '```json\n[1]', '```json\nnull', '```json\n{"a":1,}', '```json\n{"a":"' + 'x'.repeat(65536) + '"}']) {
    assert.throws(() => decodeOpeningFenceV1(text));
  }
  assert.deepEqual(decodeOpeningFenceV1('```json\n{"text":"keep ``` inside scalar"}').value, { text: 'keep ``` inside scalar' });
});
await check('explicit continuation preserves old quarantine and exact seven-role cache', () => {
  const writes = new Map(); let delegated = 0;
  const store = { acquire(id, body) {
    if (id === FAILED_ROLE) return { cached: true, artifact: { hash: prepared.recovery.parentQuarantineHash } };
    if (id.endsWith('.opening-fence-v1')) return writes.has(id) ? { cached: true, artifact: writes.get(id) } : { id };
    delegated++; return { cached: true, artifact: { id } };
  }, finish(lease, value) { writes.set(lease.id, value); return value; } };
  const resumed = withStrategyOpeningFenceContinuationV1(store, prepared);
  assert.equal(resumed.acquire(FAILED_ROLE, prepared.body).artifact.hash, prepared.artifact.hash);
  assert.equal(resumed.acquire(FAILED_ROLE, prepared.body).artifact.hash, prepared.artifact.hash);
  assert.equal(writes.size, 1);
  for (let i = 0; i < 7; i++) resumed.acquire('successful-role-' + i, {});
  assert.equal(delegated, 7);
  assert.throws(() => resumed.acquire(FAILED_ROLE, { ...prepared.body, payloadHash: hash('drift') }));
});
await check('altered sealed input cannot reuse failed response', async () => {
  const { hash: omitted, ...body } = input;
  await assert.rejects(() => prepareOpeningFenceContinuationV1({ databasePath: DB_PATH,
    input: seal({ ...body, hypothesisOnly: false }), wire, capabilities, binding: providerRegistry().binding }));
});
await check('billing unchanged and no pending or payment-required requests', () => {
  const after = ledgerSnapshot(); assert.equal(after.hash, prior.hash);
  assert.equal(after.intentCount, 0); assert.equal(after.paymentRequiredCount, 0);
});
const report = seal({ schema: 'ticket18_opening_fence_recovery_readiness_v1', passed: true, checks,
  recoveryHash: prepared.recovery.hash, codeHashes: await codeHashes([
    'packages/structured-generation/adapters/opening-fence-recovery-v1.mjs',
    'scripts/support/strategy-opening-fence-continuation-v1.mjs',
    'scripts/verify-ticket-18-opening-fence-recovery-v1.mjs']),
  providerCalls: 0, trainingTruth: false });
await mkdir(BUILD, { recursive: true });
await writeFile(path.join(BUILD, 'opening-fence-readiness.json'), JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ passed: true, checks: checks.length, hash: report.hash }));
