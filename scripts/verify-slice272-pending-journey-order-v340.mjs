import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { createAgentSelectedRosterJourneyV1 } from '../packages/roster-planning-workspace/agent-selected-roster-journey-v1.mjs';
async function check(pending) {
  const state = { status: 'active', sessionId: 'same-product-session', revision: 5,
    frozenContext: {}, mineralBudget: 2000, iterations: [],
    pendingDecision: pending ? { requestKey: 'unsent-at-input-boundary', nextRevision: 6 } : null };
  const calls = [];
  const journey = createAgentSelectedRosterJourneyV1({
    iterativeDraft: { start() {}, listSessions() {}, read: async () => structuredClone(state),
      prepare: async () => { calls.push('prepare'); if (state.pendingDecision) throw Error('ITERATIVE_ROSTER_SESSION_BUSY'); return structuredClone(state); },
      resume: async () => { calls.push('recover_or_decide'); throw Error('STOP_AT_ACTUAL_MODEL_BOUNDARY'); } },
    workspaceService: { createAgentSelectedTeachSession() {}, listSessions() {}, reviewFinalPlan() {}, revisePlan() {} },
    promoteTeachPlan() {},
  });
  await journey.run(state.sessionId);
  for (let i = 0; i < 20 && (await journey.read(state.sessionId)).running; i++) await setImmediate();
  assert.equal((await journey.read(state.sessionId)).stoppedReason, 'STOP_AT_ACTUAL_MODEL_BOUNDARY',
    'A reserved decision must reach its existing recover method, not settled-input preparation');
  assert.deepEqual(calls, pending ? ['recover_or_decide'] : ['prepare', 'recover_or_decide']);
}
await check(true);
await check(false);
console.log(JSON.stringify({ pass: true, checks: 2, pendingRecoveryBeforePrepare: true,
  settledPreparationPreserved: true, providerCalls: 0, nativeCalls: 0 }));
