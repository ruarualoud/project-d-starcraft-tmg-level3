// Exact saved B EPIPE: product draft Teach must prepare one durable recovery,
// not reconstruct its army/Plan or silently resend an unbound request.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createIterativeRosterDraftTeachV1 } from '../packages/roster-strategist/iterative-roster-draft-teach-v1.mjs';
const saved = JSON.parse(await fs.readFile(process.argv[2], 'utf8')).value;
const state = structuredClone(saved);
const record = state.draftTeachSnapshots.at(-1);
const failed = record.dispatches.at(-1);
assert.equal(failed.transportFailure.networkErrorCode, 'EPIPE');
let prepared, callback, event, checkpoints = 0;
const stop = Error('stop_after_factory_boundary');
const investigate = createIterativeRosterDraftTeachV1({
  createSceneLaboratory: () => ({}), selectSkillGuidance: () => ({}),
  deliberationFactory: { createForRun: async options => {
    prepared = options.retryDispatch;
    callback = options.recoverNetworkDispatch; event = options.onEvent;
    assert.equal(prepared?.requestId, failed.requestId);
    assert.equal(prepared?.requestBodyHash, failed.requestBodyHash);
    assert.equal(prepared?.contextHash, failed.contextHash);
    assert.ok(prepared?.retryAuthorizationId);
    assert.equal(typeof callback, 'function');
    throw stop;
  } } });
await assert.rejects(() => investigate(state, async () => { checkpoints++; }), error => error === stop);
assert.ok(checkpoints > 0);
assert.equal(record.dispatchRetryAuthorizations.length, 1);
assert.equal(record.dispatchRetryAuthorizations[0].status, 'authorized');
await event({ type: 'provider_dispatch', dispatch: { ...failed, requestId: 'test-retry',
  status: 'reserved', retryOfRequestId: failed.requestId, retryAuthorizationId: prepared.retryAuthorizationId } });
assert.equal(record.dispatchRetryAuthorizations[0].status, 'consumed');
assert.equal(await callback(failed), null, 'One persisted reservation prevents restart duplicate');
assert.deepEqual(state.currentCandidate, saved.currentCandidate);
assert.deepEqual(state.plan, saved.plan);
assert.equal(record.dispatches.find(d => d.requestId === failed.requestId).costStatus, 'unknown');
console.log(JSON.stringify({ pass: true, exactSavedNetworkFailure: true, oneDurableAuthorization: true,
  consumedBeforeSend: true, noRosterOrPlanEdit: true, providerCalls: 0, trainingTruth: false }));
