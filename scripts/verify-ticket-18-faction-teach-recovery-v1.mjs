import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import { hash, seal, sha256, verifySeal } from '../packages/skill-production/common.mjs';
import { createFactionTeachRecoveryV1, produceFactionTeachRecoveryV1 } from '../packages/skill-production-v3/faction-teach-recovery-v1.mjs';
const base = 'build/ticket-18-faction-production-v1/';
const input = verifySeal(JSON.parse(await readFile(base + 'zerg_swarm-input.json', 'utf8')));
const runId = 'faction-v1-49e1f39e41163c6b0590';
const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
const attempt = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(runId, 'faction.zerg_swarm.tutor.call-1.format-0');
db.close();
const recovery = createFactionTeachRecoveryV1({ input, runId, attempt });
assert.equal(recovery.failureReceiptHash, '0d891db2a48c28a958a121be5b9c997e79f9f36be76a025050b9b2374f2ff069');
assert.equal(recovery.outputUnits, 4095);
let calls = 0;
const role = async (id, instruction, workspace, validate) => {
  assert.equal(workspace.teachCapacityRecovery.failureReceiptHash, recovery.failureReceiptHash);
  assert.deepEqual(workspace.teachCapacityRecovery.allAxes, recovery.axes);
  assert.equal(workspace.teachCapacityRecovery.completedParts.length, calls);
  assert(instruction.includes('完整官方来源'));
  const output = { lesson: ['fixture-' + calls], uncertainties: ['unknown-' + calls++] };
  return { artifact: seal({ roleId: id, output }), value: validate(output) };
};
const result = await produceFactionTeachRecoveryV1({ input, recovery, role });
assert.equal(calls, 6);
assert.deepEqual(result.value.lesson, Array.from({ length: 6 }, (_, i) => 'fixture-' + i));
assert.equal(result.value.uncertainties.length, 6);
assert.equal(result.artifact.originalFailureReplayed, false);
assert.equal(result.artifact.rawPartialOutputUsed, false);
assert.equal(result.artifact.semanticAcceptanceInherited, false);
for (const change of [{ code: 'PROVIDER_PAYMENT_REQUIRED' }, { state: 'intent' }, { id: attempt.id.replace('zerg_swarm', 'terran_armed_forces') }]) {
  assert.throws(() => createFactionTeachRecoveryV1({ input, runId, attempt: { ...attempt, ...change } }));
}
let failures = 0;
await assert.rejects(produceFactionTeachRecoveryV1({ input, recovery, role: async () => {
  failures++; throw Object.assign(new Error('injected truncation'), { code: 'PROVIDER_RESPONSE_OUTPUT_TRUNCATED' });
} }), { code: 'PROVIDER_RESPONSE_OUTPUT_TRUNCATED' });
assert.equal(failures, 1);
const files = ['packages/skill-production-v3/faction-teach-recovery-v1.mjs', 'scripts/verify-ticket-18-faction-teach-recovery-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) })));
const report = seal({ passed: true, originalRunId: runId, recovery, preservedCompleteInput: true,
  sixDisjointOutputAxes: true, losslessAssembly: true, furtherTruncationStops: true,
  providerCalls: 0, codeHashes, trainingTruth: false });
await writeFile(base + 'teach-recovery-readiness.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, axes: 6, providerCalls: 0, hash: report.hash }));
