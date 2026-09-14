import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { hash, seal } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { materializeStrategyEvidenceReviewV2 } from '../packages/strategy-skills/strategy-evidence-review-v2.mjs';
import { prepareActivationTempoSourceRepairV1, createSourceAdjudicatedStrategyRepairV1,
  ACTIVATION_TEMPO_PARENT_POLICY_HASH_V1 } from '../packages/strategy-skills/strategy-source-adjudicated-repair-v1.mjs';
import { PARENT_RUN } from './support/strategy-opening-fence-continuation-v1.mjs';
import { BUILD, json, codeHashes, ledgerSnapshot } from './support/strategy-live-production-support-v1.mjs';

const base = 'build/ticket-18-general-strategy-live-v1/' + PARENT_RUN + '/';
const input = await json(base + 'production-input.json');
const candidate = await json(base + 'evidence-production-pilot-v1/axis-activation_tempo.json');
const ledger = ledgerSnapshot(), checks = [];
async function check(name, fn) { await fn(); checks.push(name); console.log('PASS ' + name); }
await check('exact actual parent and three frozen rule passages produce a two-field bounded patch', () => {
  const result = prepareActivationTempoSourceRepairV1({ input, candidate });
  assert.equal(hash(candidate.policy), ACTIVATION_TEMPO_PARENT_POLICY_HASH_V1);
  assert.deepEqual(result.patch.authorizedFields, ['decisionProcedure', 'alternatives']);
  assert.equal(result.adjudication.findings.length, 4);
  assert.match(result.policy.decisionProcedure[0], /每个被激活单位只执行该阶段允许的一个行动/u);
  assert.match(result.policy.decisionProcedure[4], /最多结算一个Reaction/u);
  assert.match(result.policy.alternatives[2].preferWhen, /选择下一阶段首个行动方/u);
  for (const field of Object.keys(candidate.policy)) if (!result.patch.authorizedFields.includes(field)) {
    assert.equal(hash(result.policy[field]), hash(candidate.policy[field]));
  }
});
await check('changed parent and changed source both fail before review dispatch', () => {
  const changed = structuredClone(candidate); changed.policy.title += ' drift'; delete changed.hash;
  assert.throws(() => prepareActivationTempoSourceRepairV1({ input, candidate: seal(changed) }), /PARENT_DRIFT/u);
  const body = structuredClone(input); delete body.hash;
  const source = body.workspace.fullFrozenSources.sources.find(row => row.ref === 'core.iuUyObNTQ2M8xK4IUqzC.items.2');
  source.passages[0].text = 'changed';
  const changedInput = seal(body), rebound = structuredClone(candidate); delete rebound.hash; rebound.inputHash = changedInput.hash;
  assert.throws(() => prepareActivationTempoSourceRepairV1({ input: changedInput, candidate: seal(rebound) }), /SOURCE_DRIFT/u);
});
await check('all eleven corrected fields receive fresh evidence review and exact restart reuse', async () => {
  const store = openProductionStore(':memory:', { runId: 'source-adjudicated-repair-test', recipeHash: hash('source-adjudicated-repair-test') });
  let calls = 0;
  const reviewer = { async review(prepared) {
    const lease = store.acquire('review.' + prepared.hash.slice(0, 48), { preparedHash: prepared.hash });
    if (lease.cached) return lease.artifact;
    calls++;
    const value = { checks: prepared.targets.map(target => ({ targetId: target.targetId, verdict: 'no_defect',
      currentSpanIds: [prepared.currentSpans.find(span => span.field === target.field).id], sourceSpanIds: [],
      explanation: 'Injected verifier result; no Provider.' })) };
    return store.finish(lease, seal({ preparedHash: prepared.hash,
      evidence: materializeStrategyEvidenceReviewV2(prepared, value) }));
  } };
  try {
    const workflow = createSourceAdjudicatedStrategyRepairV1({ input, reviewer, store });
    const first = await workflow.repairActivationTempo(candidate);
    const second = await workflow.repairActivationTempo(candidate);
    assert.equal(first.hash, second.hash); assert.equal(calls, 3);
    assert.equal(first.lifecycle.events.length, 11);
    assert.equal(first.status, 'model_review_clear_pending_independent_validation');
    assert.equal(first.sourceReviewIndependentlyVerified, false);
  } finally { store.close(); }
});
await check('shared production ledger remains unchanged', () => assert.equal(ledgerSnapshot().hash, ledger.hash));
const report = seal({ schema: 'ticket18_source_adjudicated_repair_readiness_v1', ticket: 18, slice: 174,
  passed: true, checks, codeHashes: await codeHashes([
    'packages/strategy-skills/strategy-source-adjudicated-repair-v1.mjs',
    'scripts/verify-ticket-18-source-adjudicated-repair-v1.mjs',
  ]), providerCalls: 0, targetedSourceRepairVerified: true, wholePolicySourceReviewPassed: false,
  runtimeAccepted: false, trainingTruth: false });
await writeFile(path.join(BUILD, 'source-adjudicated-repair-readiness-v1.json'), JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ passed: true, checks: checks.length, hash: report.hash }));
