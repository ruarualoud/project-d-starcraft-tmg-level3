import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal } from '../packages/skill-production/common.mjs';
import { withPhasedSessionDeadlineV1 } from '../packages/skill-production/session-lifecycle-v1.mjs';
import { createProductionFailureRouterV1 } from '../packages/skill-production/production-failure-routing-v1.mjs';
import { createFactionParallelControlV1, runFactionLanesV1 } from '../packages/skill-production-v3/faction-parallel-v1.mjs';

const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
const rows = () => db.prepare('SELECT * FROM attempts ORDER BY run,id').all();
assert.equal(rows().filter(row => row.code === 'PROVIDER_PAYMENT_REQUIRED').length, 0);
const originalHash = hash(rows()), originRunId = 'faction-v1-27ef94cd6f32462ec36a';
const attemptId = 'structured-7b7d33f4d14ac43082f54c8fcd251ad74afa7a754d69ece2';
const actualArtifact = id => {
  const row = db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?').get(originRunId, id);
  return row?.artifact ? verifySeal(JSON.parse(row.artifact)).value : null;
};
const actualIssue = actualArtifact(attemptId + '.issue'); verifySeal(actualIssue);
const router = createProductionFailureRouterV1({ readArtifact: actualArtifact,
  readAttempt: id => db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(originRunId, id) });
const error = Object.assign(new Error('wrapper hides root cause'), { code: 'STRUCTURED_DSH_MODEL_OUTCOME_NOT_ACCEPTED',
  outcome: { status: 'stopped', issueRef: { id: attemptId + '.issue', hash: actualIssue.hash, class: actualIssue.class } } });
let checks = 0;
const actual = router.route(error);
assert.equal(actual.rootCode, 'STRUCTURED_PROVIDER_AMBIGUOUS_SEND'); checks++;
assert.equal(actual.class, 'ambiguous_egress'); checks++;
assert.equal(actual.scope, 'task'); checks++;
assert.equal(actual.maxAdditionalProviderAttempts, 0); checks++;
assert.equal(actual.retryRoute, 'manual_provider_reconciliation'); checks++;
assert.equal(actual.usageKnown, false); checks++;
assert.equal(actual.originalAttemptId, attemptId); checks++;
assert.equal(actual.providerRequestsReissued, 0); checks++;
const wrong = Object.assign(new Error('wrong issue'), { ...error, outcome: { ...error.outcome,
  issueRef: { ...error.outcome.issueRef, hash: hash('wrong') } } });
assert.equal(router.route(wrong).class, 'routing_evidence_invalid'); checks++;
const payment = router.route(Object.assign(new Error('payment'), { code: 'PROVIDER_PAYMENT_REQUIRED' }));
assert.equal(payment.scope, 'global'); checks++;
assert.equal(payment.class, 'payment_exhausted'); checks++;
assert.equal(router.route(Object.assign(new Error('budget'), { code: 'PRODUCTION_BUDGET_EXHAUSTED' })).scope, 'run'); checks++;

let time = 0;
const clock = { now: () => time, setTimer: () => 1, clearTimer: () => {} };
let preparationError;
try {
  await withPhasedSessionDeadlineV1({ maxWallMs: 5, preparationMaxWallMs: 5, finalizationMaxWallMs: 5, clock }, async lifecycle => {
    time = 6; await lifecycle.guard(() => assert.fail('No model during expired preparation'))();
  });
} catch (caught) { preparationError = caught; }
const preparation = router.route(preparationError);
assert.equal(preparation.class, 'local_preparation_timeout'); checks++;
assert.equal(preparation.retryRoute, 'reprepare_same_task_without_provider'); checks++;
assert.equal(preparation.maxAdditionalProviderAttempts, 0); checks++;
assert.equal(preparation.phase, 'preparation'); checks++;
const badLifecycle = { ...preparationError.lifecycle, policyHash: hash('wrong-policy') };
const { hash: ignored, ...body } = badLifecycle;
assert.equal(router.route(Object.assign(new Error('bad phase'), { code: preparationError.code, lifecycle: seal(body) })).class,
  'routing_evidence_invalid'); checks++;
const missing = router.route(Object.assign(new Error('missing'), { code: 'DSH_PREPARATION_TIME_EXHAUSTED' }));
assert.equal(missing.class, 'unclassified'); checks++;

const events = [], control = createFactionParallelControlV1({ reserve: () => assert.fail('No Provider'), settle: () => assert.fail('No Provider') }, { failureRouter: router });
const lanes = await runFactionLanesV1({ inputs: [{ factionRecordKey: 'terran' }, { factionRecordKey: 'zerg' }], control,
  failureRouter: router, onProgress: row => events.push(row),
  async runLane(input) { if (input.factionRecordKey === 'terran') throw error; return { independentlyFinished: true }; } });
assert.equal(lanes.results[0].status, 'rejected'); checks++;
assert.equal(lanes.results[1].status, 'fulfilled'); checks++;
assert.equal(control.stoppedCode, null); checks++;
assert.equal(events.find(row => row.stage === 'lane_failed').failureRouting.rootCode, actual.rootCode); checks++;
assert.equal(lanes.receipt.lanes[0].failureRouting.originalAttemptId, attemptId); checks++;
assert.equal(lanes.receipt.failureRoutingBindingHash, router.binding.hash); checks++;
{
  const admission = createFactionParallelControlV1({
    reserve(id) {
      if (id === 'unknown-delivery') throw Object.assign(new Error('ambiguous'), { code: 'AMBIGUOUS_EGRESS_NO_RETRY' });
      return { admitted: true };
    }, settle() {},
  }, { failureRouter: router });
  assert.throws(() => admission.store.reserve('unknown-delivery'), { code: 'AMBIGUOUS_EGRESS_NO_RETRY' }); checks++;
  assert.equal(admission.stoppedCode, null); checks++;
  assert.deepEqual(admission.store.reserve('independent-task'), { admitted: true }); checks++;
  admission.noteFailure(Object.assign(new Error('payment'), { code: 'PROVIDER_PAYMENT_REQUIRED' }));
  assert.throws(() => admission.store.reserve('after-payment'), { code: 'PROVIDER_PAYMENT_REQUIRED' }); checks++;
}
assert.equal(hash(rows()), originalHash); checks++; db.close();
console.log(JSON.stringify({ passed: true, checks, actualFailureReclassified: actual.rootCode,
  originalAttemptId: attemptId, actualProductionAttemptsUnchanged: true, providerCalls: 0,
  scope: 'actual_failure_receipt_and_shared_lane_interface_not_formal_generation' }));
