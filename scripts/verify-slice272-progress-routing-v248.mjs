// Reproduce mixed-error counting and late High being trapped in prose repair.
// Actual session/journey interfaces, deterministic external ports; no Provider.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createIterativeRosterPlanSessionV1 } from '../packages/roster-strategist/iterative-roster-plan-session-v1.mjs';
import { createAgentSelectedRosterJourneyV1 } from '../packages/roster-planning-workspace/agent-selected-roster-journey-v1.mjs';
const checks = [], failures = [];
const check = async (name, run) => { if (process.argv[3] === '--remaining-red' && !name.startsWith('High feedback') && !name.startsWith('ordinary journey')) return; try { await run(); checks.push(name); }
  catch (e) { failures.push({ name, code: e.code, message: e.message }); } };
const make = () => {
  let saved, decision;
  const session = createIterativeRosterPlanSessionV1({
    store: { load: async () => structuredClone(saved), save: async (_id, value) => { saved = structuredClone(value); } },
    model: { decide: async () => ({ outcome: 'completed', receiptHash: hash(decision), decision }) },
    tools: { query: async () => { throw Error('Unexpected tool call'); } },
    builder: { evaluate: async () => { throw Error('Unexpected army mutation'); } },
    review: { draft: async state => state, final: async () => { throw Error('Unexpected acceptance'); } },
  });
  return { session, set: value => { saved = structuredClone(value); }, get: () => saved,
    decide: value => { decision = value; } };
};
const context = { mapHash: 'map-fixed-hash', taskHash: 'task-fixed-hash', sourceHash: 'source-fixed-hash' };
await check('different errors do not consume the same issue retry allowance', async () => {
  const p = make(), id = 'progress-fixture-248';
  await p.session.start({ sessionId: id, mineralBudget: 2000, frozenContext: context });
  for (const code of ['FORMAT_INVALID', 'UNCHANGED_QUERY', 'UNCHANGED_QUERY']) {
    p.decide({ kind: 'repair_needed', failureCode: code });
    await p.session.resume(id);
  }
  assert.equal(p.get().status, 'active');
  p.decide({ kind: 'repair_needed', failureCode: 'UNCHANGED_QUERY' });
  await p.session.resume(id);
  assert.equal(p.get().status, 'requires_reconciliation');
  assert.equal(p.get().iterations.length, 4);
});
const setupFeedback = async () => {
  const p = make(), id = 'feedback-fixture-248';
  let state = await p.session.start({ sessionId: id, mineralBudget: 2000, frozenContext: context });
  const input = { units: [{ unitInstanceId: 'unit-fixed' }] };
  state.currentCandidate = { input, candidateHash: hash(input), mineralSpent: 2000 };
  state.plan = { victoryRoute: 'Conditional route', candidateHash: hash(input), mapEvidenceHash: 'map-fixed-hash' };
  state.observations.push({ query: { kind: 'map_route', candidateHash: hash(input) },
    receipt: { status: 'certified', receiptHash: 'map-fixed-hash' } });
  const teach = { sessionId: 'teach-fixture-248', status: 'planned',
    plan: { planHash: 'taught-plan-248' }, agentSelectedCandidateHash: hash(input),
    agentSelectedStrategySource: { planHash: hash(state.plan), iterativeSessionId: id },
    planReview: { status: 'completed', planHash: 'taught-plan-248',
      review: { findings: [{ severity: 'high', claimPath: 'scoreRoute.claim', code: 'SOURCE_CONTRADICTION' }] } },
  };
  p.set(state); return { p, id, state, teach };
};
await check('late High returns to editable feedback even before justification is complete', async () => {
  const { p, id, teach } = await setupFeedback();
  const state = await p.session.attachTeachFeedback(id, teach);
  assert.equal(state.status, 'active');
  assert.equal(state.teachFeedback.acceptanceBlocked, true);
  assert.equal(state.teachFeedback.sourceReview.review.findings[0].severity, 'high');
});
await check('High feedback can never be accepted as final Teach', async () => {
  const { p, id, teach } = await setupFeedback();
  teach.selectionJustification = { coverageComplete: true, referencesResolved: true };
  await p.session.attachTeachFeedback(id, teach);
  p.decide({ kind: 'accept_teach', publicReason: 'Fixture attempts to ignore source High.' });
  await assert.rejects(p.session.resume(id), { code: 'ITERATIVE_ROSTER_TEACH_SOURCE_REPAIR_REQUIRED' });
  assert.notEqual(p.get().teachFeedback.disposition, 'accepted');
});
await check('ordinary journey routes qualified High to selection, not forced text-only revision', async () => {
  const { p, id, state, teach } = await setupFeedback();
  state.status = 'paused'; state.blockingFinding = 'ITERATIVE_ROSTER_FINAL_REVIEW_BLOCKED';
  state.openingDeploymentSchedule = {}; state.arrivalPublicRevision = { publicAudit: { status: 'unit_references_verified' } };
  teach.planningMode = 'locked_roster_teach_v1';
  teach.setup = { factionRecordKey: undefined, mineralBudget: 2000 };
  teach.plan.schema = 'starcraft_tmg_agent_scheduled_roster_plan_v1';
  teach.plan.planId = `agent-selected-${id}`;
  p.set(state);
  let attached = 0, textRepairs = 0;
  const journey = createAgentSelectedRosterJourneyV1({
    iterativeDraft: { ...p.session, listSessions: async () => [p.get()],
      proposeSchedule: async () => ({ status: 'rules_audited' }),
      reviseSchedulePublicPlan: async () => ({ status: 'unit_references_verified' }),
      attachTeachFeedback: async () => { attached++; throw Object.assign(Error('fixture stop'), { code: 'FIXTURE_STOP_AFTER_ROUTING' }); } },
    workspaceService: { listSessions: async () => ({ sessions: [teach] }), readSession: () => teach,
      createAgentSelectedTeachSession: async () => teach, reviewFinalPlan: async () => {},
      reconcileReviewFindings: async () => teach,
      readPlanningExperience: () => ({ publicRounds: [], teachFramework: null }),
      revisePlan: async () => { textRepairs++; throw Error('Forced text repair'); } },
    promoteTeachPlan: async () => {},
  });
  await journey.run(id);
  while ((await journey.read(id)).running) await new Promise(resolve => setTimeout(resolve, 1));
  assert.equal(attached, 1); assert.equal(textRepairs, 0);
});
const result = { status: failures.length ? 'fail' : 'pass', checks, failures, providerCalls: 0, roomMutations: 0 };
await fs.writeFile(process.argv[2] + `/progress-routing-v248-${process.argv[3] === '--remaining-red' ? 'remaining-' : ''}${result.status}.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result)); process.exitCode = failures.length ? 1 : 0;
