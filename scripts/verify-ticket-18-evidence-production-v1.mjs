import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { seal, hash } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { createEvidenceReviewedStrategyProductionV1 } from '../packages/strategy-skills/strategy-evidence-production-v1.mjs';
import { materializeStrategyEvidenceReviewV2 } from '../packages/strategy-skills/strategy-evidence-review-v2.mjs';
import { createGeneralStrategySeedV1 } from '../packages/strategy-skills/general-strategy-layer-v1.mjs';
import { createStrategyLayerV1 } from '../packages/strategy-skills/strategy-contract-v1.mjs';
import { prepareStrategyReflectionInputV1 } from '../packages/strategy-skills/strategy-structured-workflow-v1.mjs';
import { gradeStrategyDecisionV1 } from '../packages/strategy-skills/strategy-case-compiler-v1.mjs';
import { loadEvidenceReviewFixtureV1 } from './support/strategy-evidence-review-fixture-v1.mjs';
import { BUILD, json, ledgerSnapshot, codeHashes } from './support/strategy-live-production-support-v1.mjs';
const fixture = await loadEvidenceReviewFixtureV1(), checks = [], ledger = ledgerSnapshot();
async function check(name, fn) { await fn(); checks.push(name); console.log('PASS ' + name); }
function testRun({ input = fixture.input, defect = false } = {}) {
  const store = openProductionStore(':memory:', { runId: 'evidence-production-test', recipeHash: hash('evidence-production-test') });
  const requests = [], reviewRequests = [];
  const generator = { async role(args) {
    const lease = store.acquire('test-role.' + hash(args).slice(0, 48), args);
    if (lease.cached) return lease.artifact;
    requests.push(args);
    const value = args.kind === 'policy' ? { policy: args.stage === 'targeted-repair'
      ? { ...args.currentPolicy, risk: '仅依据已绑定开发失败修订，仍需独立留出与整局验证。', title: 'unrequested edit must not apply' }
      : { ...fixture.policy, axis: args.axis } } : { observations: ['Injected test, no provider.'] };
    return store.finish(lease, seal({ schema: 'synthetic_role_for_wiring_test', inputHash: input.hash, value }));
  } };
  const reviewer = { async review(prepared) {
    const lease = store.acquire('test-review.' + prepared.hash.slice(0, 48), { preparedHash: prepared.hash });
    if (lease.cached) return lease.artifact;
    reviewRequests.push(prepared);
    const value = { checks: prepared.targets.map(t => ({ targetId: t.targetId,
      verdict: defect && t.field === 'risk' ? 'defect' : 'no_defect',
      currentSpanIds: [prepared.currentSpans.find(s => s.field === t.field).id], sourceSpanIds: [], explanation: 'Injected test only.' })) };
    return store.finish(lease, seal({ preparedHash: prepared.hash, evidence: materializeStrategyEvidenceReviewV2(prepared, value) }));
  } };
  return { store, requests, reviewRequests, workflow: createEvidenceReviewedStrategyProductionV1({ input, store, generator, reviewer }) };
}
await check('seven-role production routes all eleven fields through new review with exact restart reuse', async () => {
  const run = testRun();
  try {
    const first = await run.workflow.produceAxis('objective_plan');
    const second = await run.workflow.produceAxis('objective_plan');
    assert.equal(first.hash, second.hash); assert.equal(run.requests.length, 7); assert.equal(run.reviewRequests.length, 3);
    assert.equal(first.lifecycle.modelReportedClear, 11); assert.equal(first.sourceReviewIndependentlyVerified, false);
    for (const p of run.reviewRequests) assert.equal(hash(JSON.parse(p.payload).workspace), hash(fixture.input.workspace));
  } finally { run.store.close(); }
});
await check('negative model opinion blocks for adjudication instead of editing or discarding it', async () => {
  const run = testRun({ defect: true });
  try {
    const result = await run.workflow.produceAxis('objective_plan');
    assert.equal(result.status, 'needs_independent_adjudication'); assert.equal(result.lifecycle.open, 1);
    assert(!run.requests.some(r => r.stage === 'targeted-repair')); assert.equal(result.automaticRepairPerformed, false);
  } finally { run.store.close(); }
});
await check('actual paid materialization resumes without regeneration; wrong lineage rejects', async () => {
  const run = testRun();
  try {
    const result = await run.workflow.resumeMaterialized({ artifact: fixture.materialized, history: fixture.history });
    assert.equal(hash(result.policy), hash(fixture.policy)); assert.equal(run.requests.length, 0);
    await assert.rejects(() => run.workflow.resumeMaterialized({ artifact: fixture.materialized, history: [] }));
  } finally { run.store.close(); }
});
const seed = createGeneralStrategySeedV1({ sourceBinding: fixture.input.contract.sourceBinding, referenceHash: fixture.input.contract.referenceHash });
const parentLayer = createStrategyLayerV1({ contract: fixture.input.contract, draft: seed.draft, author: 'model_candidate' });
const corpus = await json('build/ticket-18-general-strategy-live-v1/general-case-corpus-v1.json');
const compiled = corpus.cases.find(c => c.prompt.caseId === 'movement.far');
const policy = parentLayer.draft.policies.find(p => p.axis === 'movement_position');
const decision = { candidateId: 'ordinary', comparisons: compiled.prompt.candidates.map(c => ({ candidateId: c.candidateId, tradeoff: 'Injected wrong decision test.' })),
  opponentResponse: 'Test only.', reviseIf: 'Test only.' };
const artifact = seal({ value: decision, trainingTruth: false });
const consumerResult = seal({ inputHash: fixture.input.hash, policyHash: hash(policy), artifact,
  grade: gradeStrategyDecisionV1(compiled, decision), evaluationSplit: compiled.evaluation.split, trainingTruth: false });
const reflected = prepareStrategyReflectionInputV1({ input: fixture.input, parentLayer, compiled, consumerResult,
  findings: [{ field: 'risk', evidence: '开发案例中普通移动未到达声明的远目标。', ruleRefs: [] }] });
await check('bound development reflection uses host patch plus new reviewer and preserves other axes', async () => {
  const run = testRun({ input: reflected });
  try {
    const result = await run.workflow.revisePolicy();
    assert.equal(result.layer.draft.policies.find(p => p.axis === policy.axis).title, policy.title);
    assert.notEqual(result.layer.draft.policies.find(p => p.axis === policy.axis).risk, policy.risk);
    for (const old of parentLayer.draft.policies.filter(p => p.axis !== policy.axis)) {
      assert.deepEqual(result.layer.draft.policies.find(p => p.axis === old.axis), old);
    }
    assert.equal(result.allPriorAcceptanceInvalidated, true); assert.equal(result.layer.assessment.decisionCasesPassed, false);
    assert.equal(run.requests.length, 1); assert.equal(run.reviewRequests.length, 3);
    assert.equal((await run.workflow.revisePolicy()).hash, result.hash);
    assert.equal(run.requests.length, 1); assert.equal(run.reviewRequests.length, 3);
  } finally { run.store.close(); }
});
await check('heldout feedback cannot enter reflection even with a resealed input', async () => {
  const { hash: omitted, ...body } = reflected;
  const bad = seal({ ...body, workspace: { ...reflected.workspace, reflection: { ...reflected.workspace.reflection,
    feedback: { ...consumerResult, evaluationSplit: 'heldout' } } } });
  const run = testRun({ input: bad });
  try { await assert.rejects(() => run.workflow.revisePolicy()); assert.equal(run.requests.length, 0); }
  finally { run.store.close(); }
});
await check('no shared ledger changes', () => assert.equal(ledgerSnapshot().hash, ledger.hash));
const report = seal({ schema: 'ticket18_evidence_production_readiness_v1', passed: true, checks,
  codeHashes: await codeHashes(['packages/strategy-skills/strategy-evidence-production-v1.mjs', 'scripts/verify-ticket-18-evidence-production-v1.mjs']),
  providerCalls: 0, realReflectionOrBattleClaimed: false, trainingTruth: false });
await writeFile(path.join(BUILD, 'evidence-production-readiness-v1.json'), JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ passed: true, checks: checks.length, hash: report.hash }));
