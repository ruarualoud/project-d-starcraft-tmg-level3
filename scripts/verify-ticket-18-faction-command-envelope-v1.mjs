import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectFactionCommandRecoveryV1, normalizeFactionReviewCommandEnvelopeV1, createFactionAccountedModelV1 } from '../packages/skill-production-v3/faction-command-envelope-v1.mjs';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext, compileGlobalTask } from '../packages/skill-production-v3/context.mjs';
import { createProductionRuntimeV3 } from '../packages/skill-production-v3/runtime.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, verifySeal, hash, sha256, fail } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const json = async n => verifySeal(JSON.parse(await readFile(path.join(base, n + '.json'), 'utf8')));
const parentRunId = 'faction-v1-907961cf3b449dd64c64', parent = await json(parentRunId + '/recipe');
const captured = await json(parentRunId + '/failed-review-role-input');
assert.equal(captured.recipeHash, parent.hash);
const recovery = inspectFactionCommandRecoveryV1({ filename: path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), parentRunId, parent });
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue);
const task = compileGlobalTask(context, captured.request.instruction, captured.request.workspace);
const observed = { messages: [{ role: 'user', content: task }], tools: [] };
const output = recovery.attempts[1].response.output;
const normalizeArgs = { stageId: captured.stageId, observed, output };
assert.equal(Object.keys(output).sort().join(','), 'coverage,verdicts');
const normalized = normalizeFactionReviewCommandEnvelopeV1(normalizeArgs);
assert.equal(hash(normalized.command.content), hash(output));
assert.equal(normalized.command.content.verdicts.filter(v => v.verdict === 'unsupported').length, 2);
assert.equal(normalized.semanticReviewPassed, false); assert.equal(normalized.judgmentsChanged, false);
for (const change of [
  { output: { ...output, action: 'apply' } }, { stageId: 'faction.other.generator' },
  { output: { ...output, verdicts: [] } },
  { output: { ...output, verdicts: [output.verdicts[0], output.verdicts[0]] } },
  { output: { ...output, verdicts: output.verdicts.map((v, n) => n ? v : { ...v, title: 'foreign' }) } },
  { observed: { messages: [{ content: 'summary only' }] } },
]) assert.throws(() => normalizeFactionReviewCommandEnvelopeV1({ ...normalizeArgs, ...change }));
const temp = await mkdtemp(path.join(base, 'command-envelope-test-'));
const store = openProductionStore(path.join(temp, 'fixture.sqlite'), { runId: 'command-envelope', recipeHash: hash(recovery.manifest) });
let paidCalls = 0;
try {
  const dsh = await prepareDshLoop(root);
  const model = createFactionAccountedModelV1({ store, recovery, maxInputBytes: 1_000_000, outputRecoveryLimit: 4096,
    complete: () => { paidCalls++; fail('FORBIDDEN_NEW_PROVIDER_CALL'); } });
  const runtime = createProductionRuntimeV3({ store, reader: createEvidenceReader(catalogue), context, verifier: {}, model, dsh });
  const result = await runtime.role(captured.request);
  assert.equal(paidCalls, 0); assert.equal(store.summary().calls, 0);
  assert.equal(hash(result.output), hash(output)); assert.equal(result.loop.calls, 1);
  assert.equal(result.loop.transcript[0].receiptHash, recovery.attempts[1].receiptHash);
  const receipt = store.artifact(captured.stageId + '.command-envelope.call-1');
  assert.equal(receipt.requestHash, recovery.attempts[1].requestHash);
  assert.equal(receipt.originRunId, parentRunId); assert.equal(receipt.rawReceiptHash, recovery.attempts[1].receiptHash);
  assert.equal(receipt.normalized.normalizedCommandWireHash, result.loop.transcript[0].commandHash);
  assert.equal((await runtime.role(captured.request)).hash, result.hash);
  const files = ['packages/skill-production-v3/faction-command-envelope-v1.mjs', 'packages/skill-production/model.mjs',
    'packages/skill-production-v3/runtime.mjs', 'scripts/verify-ticket-18-faction-command-envelope-v1.mjs'];
  const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
  const report = seal({ passed: true, checks: 18, codeHashes, inputHash: captured.request.workspace.inputHash,
    recoveryManifest: recovery.manifest, capturedRoleHash: captured.hash, actualRoleReplayHash: result.hash, envelopeReceipt: receipt,
    dshBinding: dsh.binding, actualDshSessions: 1, exactPriorProviderRequestsMatched: true,
    originalNegativeJudgmentsPreserved: 2, noAttemptCopy: true, providerCalls: 0, semanticReviewPassed: false, trainingTruth: false });
  await writeFile(path.join(base, 'command-envelope-readiness.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: true, checks: 18, actualDshSessions: 1, exactPriorProviderRequestsMatched: true,
    negativeJudgments: 2, providerCalls: 0, hash: report.hash }));
} finally { store.close(); }
