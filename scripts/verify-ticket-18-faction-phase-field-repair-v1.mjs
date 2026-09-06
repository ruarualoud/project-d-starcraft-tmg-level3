import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFactionPhaseFieldPlanV1, applyFactionPhaseFieldRepairV1, repairFactionPhaseFieldsV1 } from '../packages/skill-production-v3/faction-phase-field-repair-v1.mjs';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createProductionRuntimeV3 } from '../packages/skill-production-v3/runtime.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { createAccountedModel } from '../packages/skill-production/model.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, verifySeal, hash, sha256, fail } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const json = async n => verifySeal(JSON.parse(await readFile(path.join(base, n + '.json'), 'utf8')));
const [input, capture] = await Promise.all([json('terran_armed_forces-input'), json('faction-v1-228b8989edaaba791753/failed-review-role-input')]);
const { section, draft } = capture.request.workspace, args = { input, section, draft }, beforeHash = hash(draft);
const plan = createFactionPhaseFieldPlanV1(args);
assert.equal(plan.targets.length, 11);
const output = { replacements: plan.targets.map(t => ({ targetId: t.targetId, text: t.findings.map(f => f.reason).join(' ') })) };
// These injected texts exercise the contract, not actual model skill quality.
const patch = applyFactionPhaseFieldRepairV1(output, { ...args, plan });
assert.equal(patch.changes.length, 11); assert(patch.debtsAfter.every(a => !a.findings.length));
assert.equal(patch.sourceReviewPassed, false); assert.equal(patch.runtimeAccepted, false);
const reversed = structuredClone(patch.draft);
for (const t of plan.targets) { const [field, n] = t.path.split('.');
  if (n === undefined) reversed.recommendations[t.index][field] = t.oldText;
  else reversed.recommendations[t.index][field][Number(n)] = t.oldText;
}
assert.equal(hash(reversed), beforeHash);
for (const replacements of [[], output.replacements.slice(1), [...output.replacements, output.replacements[0]],
  output.replacements.map((r, n) => n ? r : { ...r, targetId: 'wrong' }),
  output.replacements.map((r, n) => n ? r : { ...r, text: plan.targets[0].oldText }),
  output.replacements.map((r, n) => n ? r : output.replacements[1])])
  assert.throws(() => applyFactionPhaseFieldRepairV1({ replacements }, { ...args, plan }));
const changed = structuredClone(draft); changed.recommendations[7].risk += ' changed';
assert.throws(() => applyFactionPhaseFieldRepairV1(output, { ...args, draft: changed, plan }), { code: 'FACTION_PHASE_FIELD_PLAN_DRIFT' });
const temp = await mkdtemp(path.join(base, 'phase-field-contract-'));
const store = openProductionStore(path.join(temp, 'fixture.sqlite'), { runId: 'phase-field-contract', recipeHash: hash('phase-field-contract') });
let calls = 0, failSecond = true;
const runtime = { async role(request) {
  const lease = store.acquire(request.roleId, request); if (lease.cached) return lease.artifact;
  if (request.roleId.endsWith('.batch.3') && failSecond) { store.release(lease); fail('INJECTED_BEFORE_PROVIDER'); }
  calls++; assert.equal(request.workspace.overallSkill.sections.flatMap(s => s.claims).length, 522);
  assert.equal(hash(request.workspace.draft), beforeHash); assert.equal(request.workspace.repairPlan.targets.length, 11);
  assert(request.workspace.editTargetsAtEnd.length <= 3);
  return store.finish(lease, seal({ output: { replacements: request.workspace.editTargetsAtEnd.map(t => output.replacements.find(r => r.targetId === t.targetId)) } }));
} };
try {
  await assert.rejects(() => repairFactionPhaseFieldsV1({ ...args, store, runtime }), { code: 'INJECTED_BEFORE_PROVIDER' });
  assert.equal(calls, 1); assert.equal(hash(draft), beforeHash);
  assert.equal(store.summary().steps.some(s => s.id.endsWith('.patch')), false);
  failSecond = false;
  const result = await repairFactionPhaseFieldsV1({ ...args, store, runtime });
  assert.equal(result.patch.hash, patch.hash); assert.equal(calls, 4); assert.equal(result.artifactHashes.length, 4);
  assert.equal((await repairFactionPhaseFieldsV1({ ...args, store, runtime })).hash, result.hash); assert.equal(calls, 4);
} finally { store.close(); }

const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue), dsh = await prepareDshLoop(root);
const dshTemp = await mkdtemp(path.join(base, 'phase-field-dsh-'));
const dshStore = openProductionStore(path.join(dshTemp, 'fixture.sqlite'), { runId: 'phase-field-dsh', recipeHash: hash(plan.hash), maxCalls: 4 });
let sends = 0, maxWireBytes = 0, actual;
try {
  const model = createAccountedModel({ store: dshStore, maxInputBytes: 1_000_000, outputRecoveryLimit: 4096,
    complete: async request => {
      sends++; maxWireBytes = Math.max(maxWireBytes, Buffer.byteLength(JSON.stringify(request)));
      const observed = request.promptNodes.find(n => n.type === 'actual_agent_conversation').value;
      const c = observed.messages[0].content, task = typeof c === 'string' ? c : c.map(b => b.text).join('');
      assert(task.startsWith('FROZEN GLOBAL SOURCE CONTEXT\n' + JSON.stringify(context.prompt)));
      const w = JSON.parse(task.slice(task.indexOf('\nLOCAL WORKSPACE\n') + 17));
      assert.equal(w.inputHash, input.hash); assert.equal(w.overallSkill.sections.flatMap(s => s.claims).length, 522);
      assert.equal(hash(w.draft), beforeHash); assert.equal(w.repairPlan.hash, plan.hash);
      return { output: { channels: { skill: { action: 'finish', content: {
        replacements: w.editTargetsAtEnd.map(t => output.replacements.find(r => r.targetId === t.targetId)) } } } },
        usageReceipt: { requestedModel: 'deepseek-v4-flash', reportedModel: 'deepseek-v4-flash', receiptHash: hash('injected-' + sends),
          usage: { inputUnits: 10, outputUnits: 2, totalUnits: 12 } } };
    } });
  const actualRuntime = createProductionRuntimeV3({ store: dshStore, reader: createEvidenceReader(catalogue), context, verifier: {}, model, dsh });
  actual = await repairFactionPhaseFieldsV1({ ...args, store: dshStore, runtime: actualRuntime });
  assert.equal(actual.patch.hash, patch.hash); assert.equal(sends, 4); assert(maxWireBytes <= 1_000_000);
  assert.equal((await repairFactionPhaseFieldsV1({ ...args, store: dshStore, runtime: actualRuntime })).hash, actual.hash); assert.equal(sends, 4);
} finally { dshStore.close(); }
const files = ['packages/skill-production-v3/faction-phase-field-repair-v1.mjs', 'packages/skill-evaluation/faction-phase-source-debt-v1.mjs',
  'packages/skill-evaluation/faction-unit-role-debt-v1.mjs', 'packages/skill-evaluation/faction-cross-field-source-audit-v1.mjs',
  'packages/skill-production-v3/faction-strategy-workflow-v1.mjs', 'packages/skill-production-v3/runtime.mjs',
  'packages/skill-production/loops.mjs', 'packages/skill-production/model.mjs', 'scripts/verify-ticket-18-faction-phase-field-repair-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 20, codeHashes, inputHash: input.hash, captureHash: capture.hash, planHash: plan.hash,
  knownFields: 11, fullDraftEachBatch: true, completedBatchReused: true, atomicApplicationAcrossBatches: true,
  dshBinding: dsh.binding, actualDshSessions: 4, injectedModelResponses: sends, maxProviderRequestBytes: maxWireBytes,
  deliveryBoundary: 'actual_dsh_to_accounted_model_not_https', fullSourceDeliveryVerified: true,
  fixtureResultHash: actual.hash, providerCalls: 0, actualModelRepairPerformed: false, trainingTruth: false });
await writeFile(path.join(base, 'phase-field-repair-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 20, actualDshSessions: 4, providerCalls: 0, maxWireBytes, hash: report.hash }));
