import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectFactionCommandRecoveryV1, createFactionAccountedModelV1, normalizeFactionReviewCommandEnvelopeV1 } from '../packages/skill-production-v3/faction-command-envelope-v1.mjs';
import { loadFrozenSkillEvidence } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext, compileGlobalTask } from '../packages/skill-production-v3/context.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const json = async n => verifySeal(JSON.parse(await readFile(path.join(base, n + '.json'), 'utf8')));
const parentRunId = 'faction-v1-907961cf3b449dd64c64', parent = await json(parentRunId + '/recipe');
const captured = await json(parentRunId + '/failed-review-role-input');
const recovery = inspectFactionCommandRecoveryV1({ filename: path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), parentRunId, parent });
const context = createGlobalProductionContext(await loadFrozenSkillEvidence(root));
const observed = { system: '', messages: [{ role: 'user', content: compileGlobalTask(context, captured.request.instruction, captured.request.workspace) }], tools: [] };
const temp = await mkdtemp(path.join(base, 'command-fast-test-'));
let serial = 0;
async function fixture(change, recoverySeed = null) {
  const store = openProductionStore(path.join(temp, serial++ + '.sqlite'), { runId: 'command-fast', recipeHash: hash('fixture') });
  let sends = 0;
  const response = structuredClone(recovery.attempts[1].response); change?.(response);
  const model = createFactionAccountedModelV1({ store, recovery: recoverySeed, maxInputBytes: 1_000_000, outputRecoveryLimit: 4096,
    complete: async () => { sends++; return response; } });
  return { store, model, sends: () => sends };
}
const request = { stageId: captured.stageId, call: 1, observed, maxOutput: 4096 };
const one = await fixture();
try {
  const result = await one.model(request);
  assert.equal(one.sends(), 1); assert.equal(one.store.summary().calls, 1);
  assert.equal(hash(result.command.content), hash(recovery.attempts[1].response.output));
  assert.equal(result.command.content.verdicts.filter(v => v.verdict === 'unsupported').length, 2);
  assert.equal(hash((await one.model(request)).command), hash(result.command)); assert.equal(one.sends(), 1);
} finally { one.store.close(); }
const invalid = await fixture(r => { r.output.verdicts[0].title = 'unrecognized target'; });
try {
  await assert.rejects(() => invalid.model(request), { code: 'FACTION_COMMAND_ENVELOPE_TARGETS' });
  assert.equal(invalid.store.summary().calls, 1); assert(invalid.store.summary().knownTokens > 0);
  assert.equal(invalid.store.summary().steps.length, 0);
} finally { invalid.store.close(); }
const drift = await fixture(null, recovery);
try {
  // This deliberately differs from the original real DSH system/tools; the
  // exact-request recovery veto must occur before any injected send.
  await assert.rejects(() => drift.model(request), { code: 'FACTION_COMMAND_RECOVERY_REQUEST_DRIFT' });
  assert.equal(drift.sends(), 0); assert.equal(drift.store.summary().calls, 0);
} finally { drift.store.close(); }
// Only the role namespace changes. Reuse the same real bare review and full
// task, so a rejection here cannot be explained by prose or target changes.
const phaseId = captured.stageId.replace(/(\.[0-3])(\.[0-9]+)$/, '$1.phase-seed-v1.' + 'a'.repeat(20) + '$2');
const sourceSuffix = '.source-evidence-v1.' + 'b'.repeat(20);
const stages = [phaseId, captured.stageId + sourceSuffix, phaseId + sourceSuffix];
let namespaceChecks = 0;
for (const stageId of stages) {
  const f = await fixture();
  try {
    const result = await f.model({ ...request, stageId });
    assert.equal(hash(result.command.content), hash(recovery.attempts[1].response.output));
    assert.equal(f.sends(), 1);
    assert.equal(f.store.summary().calls, 1);
    assert.equal(hash((await f.model({ ...request, stageId })).command), hash(result.command));
    assert.equal(f.sends(), 1); namespaceChecks += 5;
  } finally { f.store.close(); }
}
for (const stageId of [phaseId + sourceSuffix + '.field-binding', phaseId + sourceSuffix + '.schema-repair',
  phaseId.replace(/review-target-batch-v1\.(supportive|adversarial)/, 'editor'), phaseId + sourceSuffix.slice(0, -1),
  phaseId + sourceSuffix + 'a', phaseId.replace('.phase-seed-v1.', '.unknown-epoch.'),
  'faction.terran.generator' + sourceSuffix]) {
  assert.throws(() => normalizeFactionReviewCommandEnvelopeV1({ stageId, observed,
    output: recovery.attempts[1].response.output }), { code: 'FACTION_COMMAND_ENVELOPE_SCOPE' });
  namespaceChecks++;
}
const files = ['packages/skill-production-v3/faction-command-envelope-v1.mjs', 'scripts/verify-ticket-18-faction-command-envelope-fast-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 10 + namespaceChecks, codeHashes, firstBareResponseNormalizedWithoutResampling: true,
  phaseAndSourceReviewNamespacesVerified: stages, unrelatedOrMalformedRolesRejected: true,
  invalidTargetsRetainSettledUsage: true, requestDriftBeforeSend: true, providerCalls: 0, trainingTruth: false });
await writeFile(path.join(base, 'command-envelope-fast-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: report.checks, providerCalls: 0, hash: report.hash }));
