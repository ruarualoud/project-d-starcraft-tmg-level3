// Reproduce v149's actual B Teach admission failure at the product service.
// In-memory draft and a stop at createForRun: no Provider, Native or Room call.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRosterPlanningWorkspaceServiceV1 } from '../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs';
const [base, reportPath] = process.argv.slice(2);
const cfg = JSON.parse(await fs.readFile(base + '/common-v79-plan-recovery-config.private.json', 'utf8'));
const row = cfg.rows.find(r => r.arm === 'B');
const source = JSON.parse(await fs.readFile(row.dataDirectory + '/drafts/' + row.sessionId + '.json', 'utf8'));
const plan = JSON.parse(source.planSerialized);
const failed = source.providerDispatches.at(-1);
assert.equal(failed.roundKind, 'teach_framework_agenda');
assert.equal(failed.status, 'ambiguous');
assert.equal(source.teachFramework.status, 'failed');
const checks = [];
const started = performance.now();
function workspace({ consumed = false, returned = false, failedStatus = 'ambiguous' } = {}) {
  // Keep the actual current Plan, roster binding and Teach method/context. Old
  // unrelated history is not required to reproduce this request admission.
  const d = { ...source, providerDispatches: [{ ...failed, status: failedStatus }],
    publicOutputs: [], toolReceipts: [], budgetBranchReceipts: [],
    planVersionHistory: [], planReviewHistory: [], teachFrameworkHistory: [],
    claimRepairHistory: [], revisionTeachEvidenceHistory: [], autoPlanRepairHistory: [],
    failedProviderOutputs: [], dispatchReconciliations: [],
    dispatchRetryAuthorizations: consumed ? [{ requestId: failed.requestId, status: 'consumed' }] : [],
    teachFramework: { ...source.teachFramework, state: structuredClone(source.teachFramework.state) },
    progress: { ...source.progress, rounds: [] }, usage: structuredClone(source.usage) };
  if (returned) d.publicOutputs.push({ contextHash: failed.contextHash });
  let factoryInput = null, stopReached = false, saves = 0;
  const never = () => assert.fail('No Rules or Provider operation permitted');
  const context = source.teachFramework.context;
  const service = createRosterPlanningWorkspaceServiceV1({
    armyBuilderPort: { evaluateRosterCandidate: never,
      enumerateArmyBuildingChoices: () => ({ unitCandidates: [], vespeneLimitForBudget: { numerator: 0, denominator: 1 } }),
      listFactionChoices: never, listEngagementScales: never },
    laboratoryCore: { labDescriptor: () => ({}), proveMutationZero: never, missionScoringAuthority: never },
    strategyPack: { foundational: { entries: [] }, receipt: { hash: 'a'.repeat(64) } },
    selectionUnitRules: context.sourceFacts.selectionUnitRules,
    fixture: context.fixture,
    draftStore: { loadAll: async () => ({ sessions: [d], quarantined: [] }),
      save: async () => { saves++; } },
    createRunLaboratory: () => ({}),
    createStrategist: () => ({ selectSkillRoute: () => ({ projections: context.skillGuidance, skillRefs: context.skillRefs }) }),
    deliberationFactory: { createForRun: async input => {
      factoryInput = input; stopReached = true; throw Error('RESUME_PROBE_STOP_BEFORE_PROVIDER');
    } },
  });
  return { service, d, factory: () => factoryInput, reached: () => stopReached, saves: () => saves };
}
const request = { expectedPlanHash: plan.planHash, expectedRequestId: failed.requestId,
  resumeAfterNetworkInterrupt: true };
const waitBoundary = async w => {
  for (let i = 0; !w.reached() && w.d.teachFramework.status === 'running' && i < 100; i++)
    await new Promise(r => setTimeout(r, 5));
  assert.equal(w.reached(), true, w.d.teachFramework.failure?.detail || 'factory boundary not reached');
};
try {
  const w = workspace(); await w.service.loadPersisted();
  await w.service.teachPlanFramework(w.d.sessionId, request);
  await waitBoundary(w);
  assert.equal(w.factory().retryDispatch.requestId, failed.requestId);
  assert.equal(w.factory().retryDispatch.requestBodyHash, failed.requestBodyHash);
  assert.equal(w.factory().retryDispatch.contextHash, failed.contextHash);
  assert.equal(w.factory().retryDispatch.standingNetworkResumeConsent, true);
  assert.equal(w.d.dispatchRetryAuthorizations.length, 1);
  assert.equal(w.d.dispatchRetryAuthorizations[0].status, 'authorized');
  assert.equal(w.d.dispatchRetryAuthorizations[0].maximumPhysicalRetries, 1);
  assert.equal(w.d.providerDispatches[0].costStatus, 'unknown');
  assert.equal(w.d.providerDispatches[0].requestId, failed.requestId);
  assert.deepEqual(w.d.usage, source.usage);
  assert.equal(w.d.planSerialized, source.planSerialized);
  assert.deepEqual(w.d.teachFramework.state, source.teachFramework.state);
  checks.push('actual_B_failed_Teach_reaches_existing_retry_port_with_exact_request_and_preserved_history');

  for (const [label, options, body] of [
    ['missing_consent', {}, { expectedPlanHash: plan.planHash }],
    ['foreign_request', {}, { ...request, expectedRequestId: 'foreign' }],
    ['consumed_consent', { consumed: true }, request],
  ]) {
    const denied = workspace(options); await denied.service.loadPersisted();
    await assert.rejects(denied.service.teachPlanFramework(denied.d.sessionId, body),
      /ROSTER_WORKSPACE_(AMBIGUOUS_DISPATCH_STOP|TEACH_AMBIGUOUS_DISPATCH_REQUIRES_RECONCILIATION)/);
    assert.equal(denied.reached(), false); checks.push(label + '_cannot_dispatch');
  }
  const notSent = workspace({ failedStatus: 'reserved' }); await notSent.service.loadPersisted();
  await notSent.service.teachPlanFramework(notSent.d.sessionId, { expectedPlanHash: plan.planHash });
  await waitBoundary(notSent);
  assert.equal(notSent.factory().retryDispatch, null);
  assert.equal(notSent.d.dispatchRetryAuthorizations.length, 0);
  checks.push('proven_not_sent_uses_shared_policy_without_unknown_fee_authorization');
  await fs.writeFile(reportPath, JSON.stringify({ ok: true, checks, elapsedMs: performance.now() - started,
    actualRequestId: failed.requestId, providerCalls: 0, nativeCalls: 0,
    originalWorkspaceWrites: 0, gameActions: 0, actualLiveResumeProven: false }, null, 2), { mode: 0o600 });
  console.log('TEACH_NETWORK_RESUME_V150_PASS', JSON.stringify(checks));
} catch (error) {
  await fs.writeFile(reportPath, JSON.stringify({ ok: false, checks, failure: error.message,
    elapsedMs: performance.now() - started, providerCalls: 0, originalWorkspaceWrites: 0 }, null, 2), { mode: 0o600 });
  throw error;
}
