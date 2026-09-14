import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { hash, seal, verifySeal } from '../packages/skill-production/common.mjs';
import { assertStrategyLocalizedRepairV1 } from '../packages/strategy-skills/strategy-structured-workflow-v1.mjs';
import { materializeStrategyFieldPatchV2, createStrategyStructuredWorkflowV2 } from '../packages/strategy-skills/strategy-structured-workflow-v2.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { runDirectLoop } from '../packages/skill-production/loops.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from '../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs';
import { PARENT_RUN } from './support/strategy-opening-fence-continuation-v1.mjs';
import { BUILD, DB_PATH, ledgerSnapshot, codeHashes, json, providerRegistry } from './support/strategy-live-production-support-v1.mjs';
const beforeLedger = ledgerSnapshot();
const db = new DatabaseSync(DB_PATH, { readOnly: true });
const rows = db.prepare("SELECT artifact FROM steps WHERE run=? AND state='complete'").all(PARENT_RUN)
  .map(r => verifySeal(JSON.parse(r.artifact)).value);
db.close();
const generated = rows.find(a => a.schema === 'strategy_role_artifact_v1' && a.stage === 'generator' && a.axis === 'objective_plan');
const repaired = rows.find(a => a.schema === 'strategy_role_artifact_v1' && a.stage === 'targeted-repair' && a.axis === 'objective_plan' && a.round === 0);
const review = rows.find(a => a.schema === 'strategy_role_artifact_v1' && a.stage === 'source-review' && a.recoveryRef);
const before = generated.value.policy, proposal = repaired.value.policy, findings = review.value.findings;
const checks = [];
function check(name, fn) { fn(); checks.push(name); console.log('PASS ' + name); }
let patch;
check('reproduce actual unauthorized reviseIf edit', () => {
  assert.throws(() => assertStrategyLocalizedRepairV1(before, proposal, findings), { code: 'STRATEGY_REPAIR_UNRELATED_FIELD_CHANGED' });
});
check('apply only authorized values without new provider request', () => {
  patch = materializeStrategyFieldPatchV2({ before, proposal, findings });
  assert.deepEqual(patch.ignoredUnrequestedEdits.map(e => e.field), ['reviseIf']);
  assert.deepEqual(patch.policy.reviseIf, before.reviseIf);
  for (const field of patch.authorizedFields) assert.deepEqual(patch.policy[field], proposal[field]);
  assert.equal(patch.proposalHash, hash(proposal));
  assertStrategyLocalizedRepairV1(before, patch.policy, findings);
});
check('reject noop, cycle, unauthorized host axis, empty targets and invalid proposal', () => {
  assert.throws(() => materializeStrategyFieldPatchV2({ before, proposal: before, findings }));
  assert.throws(() => materializeStrategyFieldPatchV2({ before, proposal, findings, priorHashes: [hash(patch.policy)] }));
  assert.throws(() => materializeStrategyFieldPatchV2({ before, proposal: { ...proposal, axis: 'uncertainty' }, findings }));
  assert.throws(() => materializeStrategyFieldPatchV2({ before, proposal, findings: [] }));
  assert.throws(() => materializeStrategyFieldPatchV2({ before, proposal, findings: [{ field: 'axis' }] }));
  assert.throws(() => materializeStrategyFieldPatchV2({ before, proposal: { ...proposal, title: '' }, findings }));
});
check('original proposal and parent unchanged; no semantic acceptance', () => {
  assert.equal(hash(generated.value.policy), patch.parentHash);
  assert.equal(hash(repaired.value.policy), patch.proposalHash);
  assert.equal(patch.semanticAcceptanceInherited, false);
  assert.equal(patch.trainingTruth, false);
});
// Exercise the full structured workflow, not just the patch utility. These are
// isolated injected responses in an in-memory ledger, never production proof.
{
  const input = await json('build/ticket-18-general-strategy-live-v1/' + PARENT_RUN + '/production-input.json');
  const caps = await json('build/ticket-18-general-strategy-live-v1/capabilities.json');
  const store = openProductionStore(':memory:', { runId: 'patch-v2-test', recipeHash: hash('patch-v2-test') });
  const requests = [];
  const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ now: () => caps.receipts[0].capabilityReceipt.probedAt,
    send: async wire => {
      const payload = JSON.parse(wire.body.input); requests.push(payload);
      const task = payload.hostTask;
      const output = task.stage === 'targeted-repair' ? { policy: task.round === 1
        ? { ...payload.currentPolicy, risk: 'Host evidence addressed in isolated test only.' } : proposal }
        : task.kind === 'policy' ? { policy: before }
          : task.kind === 'review' ? task.round === 0 ? review.value : { findings: [], limitations: ['Injected test only.'] }
            : { observations: [{ claim: 'Injected context test.', ruleRefs: [] }], questions: ['What changes the decision?'], unproven: ['No live evidence.'] };
      return createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [{ kind: 'success', output }] }).send(wire);
    } });
  const options = { input, store, dsh: { run: runDirectLoop }, providerAdapter: adapter,
    egressBinding: providerRegistry().binding,
    executionPolicy: { maxOutputUnits: 4096, attemptEstimateMicros: 1000, attemptTokenReserve: 1000 },
    priceUsage: () => 1, capabilityReceiptRegistry: { resolve: request => ({ ok: true,
      capabilityReceipt: caps.receipts.find(r => r.capabilityReceipt.outputContractRef.hash === request.outputContractRef.hash).capabilityReceipt }) } };
  try {
    const result = await createStrategyStructuredWorkflowV2(options).produceAxis('objective_plan');
    check('integrated patch retains complete negative context and original proposal', () => {
      assert.equal(result.policy.reviseIf.length, before.reviseIf.length);
      assert.equal(result.roleArtifacts.find(a => a.patch)?.parentProposal.value.policy.reviseIf.length, proposal.reviseIf.length);
      const last = requests.at(-1);
      assert.equal(last.hostTask.stage, 'source-review');
      assert(last.completeRoleHistory.some(a => a.value?.findings?.length === 8));
      assert.equal(hash(last.workspace.fullFrozenSources), hash(input.workspace.fullFrozenSources));
      assert.equal(requests.length, 10);
    });
    const again = await createStrategyStructuredWorkflowV2(options).produceAxis('objective_plan');
    check('workflow restart reuses all ten outputs without resampling', () => {
      assert.equal(again.hash, result.hash); assert.equal(requests.length, 10);
    });
    const hostStore = openProductionStore(':memory:', { runId: 'host-review-test', recipeHash: hash('host-review-test') });
    try {
      const resultWithHost = await createStrategyStructuredWorkflowV2({ ...options, store: hostStore,
        sourceReviewFindingsForPolicy: policy => hash(policy) === hash(patch.policy) ? seal({
          schema: 'test_only_host_review', policyHash: hash(policy), inputHash: input.hash,
          value: { findings: [{ field: 'risk', evidence: 'Host evidence must not disappear when model review is empty.', ruleRefs: [] }],
            limitations: ['Injected test, not production source proof.'] } }) : null }).produceAxis('objective_plan');
      check('bound host negatives require repair even when model review is empty', () => {
        assert.equal(resultWithHost.repairRounds, 2);
        assert.equal(hostStore.summary().calls, 12);
        assert.equal(resultWithHost.policy.risk, 'Host evidence addressed in isolated test only.');
        assert(resultWithHost.roleArtifacts.some(a => a.hostReview));
      });
    } finally { hostStore.close(); }
  } finally { store.close(); }
}
check('shared billing unchanged and no ambiguous request', () => {
  assert.equal(ledgerSnapshot().hash, beforeLedger.hash);
  assert.equal(beforeLedger.intentCount, 0);
});
const report = seal({ schema: 'ticket18_strategy_host_patch_readiness_v2', passed: true, checks,
  actualPatch: patch, codeHashes: await codeHashes([
    'packages/strategy-skills/strategy-structured-workflow-v2.mjs', 'scripts/verify-ticket-18-strategy-host-patch-v2.mjs']),
  providerCalls: 0, trainingTruth: false });
await writeFile(path.join(BUILD, 'host-patch-readiness-v2.json'), JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ passed: true, checks: checks.length, hash: report.hash }));
