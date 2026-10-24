// Concrete regression: the client has no product-owned preset Run operation.
// Real HTTP adapter + orchestration, deterministic workspace/Provider boundary.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRosterPlanningWorkspaceHttpAdapterV1, ROSTER_PLANNING_WORKSPACE_API_PREFIX as prefix } from '../packages/roster-planning-workspace/roster-planning-workspace-http-v1.mjs';
let createJourney;
try { ({ createPresetRosterJourneyV1: createJourney } = await import('../packages/roster-planning-workspace/preset-roster-journey-v1.mjs')); }
catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; }
const checks = [], failures = [];
for (const scenario of ['fresh', 'unresolved', 'restart']) {
  try {
    const calls = [];
    let state = null;
    const view = { sessionId: 'preset-parity-250', planningMode: 'locked_roster_teach_v1',
      lockedRoster: { modelSelectionLocked: true }, status: 'draft', retainedReplyCount: 0,
      plan: null, claimRepairBacklog: [], providerDispatches: [],
      working: { verdictSummary: { status: 'legal' } } };
    const review = () => { view.planReview = { status: 'completed', stale: false,
      planHash: view.plan.planHash, review: { findings: [] } };
      view.planReviewRequiredForHandoff = false; view.planReviewBlockingHighFindings = false; };
    const service = {
      descriptor: () => ({}), readSession: () => structuredClone({ ...view, presetJourney: state }),
      startPlanning: async () => { calls.push('generate'); view.status = 'planned';
        view.plan = { planHash: 'plan-1', openingDeploymentSchedule: { audited: true } }; },
      reviewFinalPlan: async () => { calls.push('review'); review(); },
      reconcileReviewFindings: async () => { throw Error('No allegation to qualify'); },
      teachPlanFramework: async (_id, request) => { calls.push(request.recoverFailedQueryIds ? 'recover-query' : 'teach');
        view.teachFramework = { status: 'completed', planHash: view.plan.planHash,
          investigationCompleted: true, coverage: [{ unresolvedQuestionIds: scenario === 'unresolved' ? ['question-1'] : [] }] }; },
      revisePlan: async () => { calls.push('apply-teach'); const old = view.plan.planHash;
        view.plan = { ...view.plan, planHash: 'plan-2' };
        view.teachFramework.appliedToPlanHash = view.plan.planHash;
        assert.notEqual(old, view.plan.planHash); view.planReviewRequiredForHandoff = true; },
    };
    if (scenario === 'restart') {
      view.status = 'planned'; view.plan = { planHash: 'plan-2', openingDeploymentSchedule: {} };
      review(); view.teachFramework = { status: 'completed', investigationCompleted: true,
        planHash: 'plan-1', appliedToPlanHash: 'plan-2', coverage: [] };
      state = { status: 'interrupted', stage: 'reviewing_source', history: [] };
    }
    if (createJourney) {
      const journey = createJourney({ service, readState: () => structuredClone(state),
        saveState: async (_id, value) => { state = structuredClone(value); },
        sleep: async () => {} });
      service.runPresetJourney = journey.run;
    }
    const http = createRosterPlanningWorkspaceHttpAdapterV1({ service });
    const result = await http.handle({ method: 'POST', pathname: `${prefix}/sessions/${view.sessionId}/run` });
    assert.equal(result.status, 202, 'preset Run must be a product endpoint, not experiment-only sequencing');
    for (let i = 0; i < 200 && state?.status === 'running'; i++) await new Promise(resolve => setImmediate(resolve));
    if (scenario === 'unresolved') {
      assert.equal(state.status, 'blocked'); assert.match(state.failure.code, /UNRESOLVED|NONCONVERGENT/);
      assert.ok(!calls.includes('apply-teach')); assert.notEqual(state.acceptedPlanHash, view.plan.planHash);
    } else {
      assert.equal(state.status, 'completed'); assert.equal(state.acceptedPlanHash, 'plan-2');
      assert.deepEqual(calls, scenario === 'restart' ? [] : ['generate', 'review', 'teach', 'apply-teach', 'review']);
      await http.handle({ method: 'POST', pathname: `${prefix}/sessions/${view.sessionId}/run` });
      assert.deepEqual(calls, scenario === 'restart' ? [] : ['generate', 'review', 'teach', 'apply-teach', 'review']);
    }
    checks.push(scenario);
  } catch (e) { failures.push({ scenario, code: e.code, message: e.message }); }
}
const result = { status: failures.length ? 'fail' : 'pass', checks, failures,
  providerCalls: 0, roomMutations: 0, scope: 'product HTTP orchestration; not actual Provider/UI/Room acceptance' };
await fs.writeFile(`${process.argv[2]}/preset-product-parity-v250-${result.status}.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result)); process.exitCode = failures.length ? 1 : 0;
