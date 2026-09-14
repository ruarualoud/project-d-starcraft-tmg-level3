import assert from 'node:assert/strict';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { hash, seal } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { materializeStrategyEvidenceReviewV2 } from '../packages/strategy-skills/strategy-evidence-review-v2.mjs';
import { createBoundStrategySourceAuditV1, prepareStrategySourceCorrectionV1,
  prepareOpponentResponsePassCorrectionV1, createStrategySourceCorrectionWorkflowV1 } from '../packages/strategy-skills/strategy-source-correction-v1.mjs';
import { PARENT_RUN } from './support/strategy-opening-fence-continuation-v1.mjs';
import { BUILD, json, ledgerSnapshot, codeHashes } from './support/strategy-live-production-support-v1.mjs';

const prefix = 'build/ticket-18-general-strategy-live-v1/' + PARENT_RUN + '/';
const input = await json(prefix + 'production-input.json');
const candidate = await json(prefix + 'general-strategy-batch-v1/axis-opponent_response.json');
const ledger = ledgerSnapshot(), checks = [];
async function check(name, fn) { await fn(); checks.push(name); console.log('PASS ' + name); }
await check('actual Pass wording creates a source-bound failed audit and one-field correction', () => {
  const result = prepareOpponentResponsePassCorrectionV1({ input, candidate });
  assert.equal(result.audit.route, 'exact_host_field_patch_allowed');
  assert.equal(result.audit.fullCoverage, false); assert.equal(result.audit.sourceReviewPassed, false);
  assert.deepEqual(result.correction.authorizedFields, ['opponentBranches']);
  assert.match(result.correction.policy.opponentBranches[0].response, /下一阶段/u);
  for (const field of Object.keys(candidate.policy)) if (field !== 'opponentBranches') {
    assert.equal(hash(result.correction.policy[field]), hash(candidate.policy[field]));
  }
});
await check('uncertain authority blocks Host patch and unrelated edits fail closed', () => {
  const audit = createBoundStrategySourceAuditV1({ input, candidate, checkedFields: ['opponentBranches'],
    auditorClass: 'independent_source_read', findings: [{ field: 'opponentBranches', paths: ['opponentBranches.0'],
      classification: 'source_conflict', statement: 'Injected ambiguous conflict.',
      sourceEvidence: [{ ref: 'core.iuUyObNTQ2M8xK4IUqzC.items.2.subItems.0', spanId: 'p1',
        requiredExcerpt: 'First Player Marker for the next Phase' }], resolutionAuthority: 'human_adjudication_required' }] });
  assert.throws(() => prepareStrategySourceCorrectionV1({ input, candidate, audit,
    proposedPolicy: candidate.policy }), /ADJUDICATION_REQUIRED/u);
  const exact = prepareOpponentResponsePassCorrectionV1({ input, candidate });
  const unrelated = { ...exact.correction.policy, title: exact.correction.policy.title + ' drift' };
  assert.throws(() => prepareStrategySourceCorrectionV1({ input, candidate, audit: exact.audit,
    proposedPolicy: unrelated }), /SCOPE_INVALID/u);
});
await check('corrected candidate re-audits all eleven fields and restart is exact', async () => {
  const store = openProductionStore(':memory:', { runId: 'source-correction-test', recipeHash: hash('source-correction-test') });
  let calls = 0;
  const reviewer = { async review(prepared) {
    const lease = store.acquire('review.' + prepared.hash.slice(0, 48), { preparedHash: prepared.hash });
    if (lease.cached) return lease.artifact; calls++;
    const value = { checks: prepared.targets.map(target => ({ targetId: target.targetId,
      verdict: 'no_defect', currentSpanIds: [prepared.currentSpans.find(span => span.field === target.field).id],
      sourceSpanIds: [], explanation: 'Injected verifier result; no Provider.' })) };
    return store.finish(lease, seal({ preparedHash: prepared.hash,
      evidence: materializeStrategyEvidenceReviewV2(prepared, value) }));
  } };
  try {
    const workflow = createStrategySourceCorrectionWorkflowV1({ input, reviewer, store });
    const first = await workflow.repairOpponentResponsePass(candidate);
    const second = await workflow.repairOpponentResponsePass(candidate);
    assert.equal(first.hash, second.hash); assert.equal(calls, 3); assert.equal(first.lifecycle.events.length, 11);
    assert.equal(first.sourceReviewIndependentlyVerified, false);
  } finally { store.close(); }
});
await check('shared production ledger remains unchanged', () => assert.equal(ledgerSnapshot().hash, ledger.hash));
const report = seal({ schema: 'ticket18_strategy_source_correction_readiness_v1', ticket: 18, slice: 174,
  passed: true, checks, codeHashes: await codeHashes([
    'packages/strategy-skills/strategy-source-correction-v1.mjs',
    'scripts/verify-ticket-18-strategy-source-correction-v1.mjs',
  ]), providerCalls: 0, fullSourceAuditPassed: false,
  runtimeAccepted: false, trainingTruth: false });
await writeFile(path.join(BUILD, 'strategy-source-correction-readiness-v1.json'),
  JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ passed: true, checks: checks.length, providerCalls: 0, hash: report.hash }));
