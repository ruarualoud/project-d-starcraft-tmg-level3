// Reproduce actual fresh B r6: four new units, byte-identical old strategy.
// Exercise the product session scheduler, not a string-only Plan validator.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createIterativeRosterPlanSessionV1 } from '../packages/roster-strategist/iterative-roster-plan-session-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const sourceFile = process.argv[2];
const original = JSON.parse(await fs.readFile(sourceFile, 'utf8')).value;
const atSix = original.iterations.find(row => row.revision === 6);
const atTwo = original.iterations.find(row => row.revision === 2);
assert.notEqual(atSix.currentCandidateHash, atTwo.currentCandidateHash);
assert.deepEqual(atSix.planSnapshot.strategy, atTwo.planSnapshot.strategy);
let saved = { schema: original.schema, sessionId: original.sessionId,
  contextHash: original.contextHash, frozenContext: original.frozenContext,
  mineralBudget: original.mineralBudget, modelContextVersion: original.modelContextVersion,
  teachFeedbackPolicy: original.teachFeedbackPolicy, modelDecisionReceiptCount: original.modelDecisionReceiptCount,
  observations: original.observations.filter(row => row.query.kind === 'map_summary'
    || row.query.kind === 'map_route' && row.query.candidateHash === atSix.currentCandidateHash),
  status: 'active', pauseRequested: false,
  pendingDecision: null, revision: 6, blockingFinding: null,
  currentCandidate: structuredClone(atSix.candidateSnapshot), plan: structuredClone(atSix.planSnapshot),
  iterations: [atTwo, atSix] };
const calls = [];
let adjustment;
const service = createIterativeRosterPlanSessionV1({
  store: { load: async () => structuredClone(saved), save: async (_id, value) => { saved = structuredClone(value); } },
  builder: { evaluate: async () => { throw Error('unexpected Builder write'); } },
  tools: { query: async () => { throw Error('unexpected query; retained current map evidence must suffice'); } },
  model: { decide: async ({ state }) => {
    calls.push('selecting'); adjustment = state.planAlignment;
    const plan = structuredClone(state.plan);
    plan.strategy.rosterRationale = 'Diagnostic revised rationale for the current eight-unit army; not strategic acceptance.';
    plan.strategy.revisionReason = 'Account for the added units before asking Teach to review this draft.';
    return { outcome: 'completed', receiptHash: hash(plan), decision: { kind: 'revise_plan', plan, assumptionDisposition: 'revise' } };
  } },
  review: { final: async () => { throw Error('unexpected final acceptance'); },
    draft: async state => { calls.push('teach'); return state; } },
});
await service.resume(saved.sessionId);
assert.equal(calls[0], 'selecting', 'A changed roster with verbatim old Plan must return to its author before another Teach');
assert.equal(calls.filter(c => c === 'teach').length, 0);
assert.equal(adjustment.status, 'needs_plan_alignment');
assert.equal(adjustment.addedUnitIds.length, 4);
assert.equal(adjustment.strategyChosenByHost, false);
assert.deepEqual(saved.currentCandidate, atSix.candidateSnapshot);
assert.notEqual(saved.status, 'ready_for_match');
calls.length = 0;
await service.resume(saved.sessionId);
assert.equal(calls[0], 'teach', 'An actually revised Plan must enter the existing Teach, not bypass it');
console.log(JSON.stringify({ status: 'pass', case: 'actual_B_r6_stale_plan_handoff',
  providerCalls: 0, nativeCalls: 0, noFinalAcceptance: true, productionWrites: 0 }));
