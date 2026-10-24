// Reproduce A's paid Teach interruption: ordinary Run must carry one exact
// recovery request to the existing service, not start a new Plan or lose fees.
import assert from 'node:assert/strict';
import { createPresetRosterJourneyV1 } from '../packages/roster-planning-workspace/preset-roster-journey-v1.mjs';
import { createRosterPlanningWorkspaceHttpAdapterV1, ROSTER_PLANNING_WORKSPACE_API_PREFIX as prefix } from '../packages/roster-planning-workspace/roster-planning-workspace-http-v1.mjs';
let saved, calls = 0;
const view = { sessionId: 'resume-A-262', status: 'planned', lockedRoster: {},
  plan: { planHash: 'unchanged-plan', openingDeploymentSchedule: {} },
  planReview: { status: 'completed', planHash: 'unchanged-plan', review: { findings: [] } },
  providerDispatches: [{ requestId: 'old-request', planHash: 'unchanged-plan', status: 'ambiguous', roundKind: 'teach_framework_investigate' }],
  teachFramework: { status: 'failed', planHash: 'unchanged-plan' }, claimRepairBacklog: [] };
const service = { descriptor: () => ({}), startPlanning: async () => { throw Error('Must resume existing Teach'); }, readSession: () => structuredClone({ ...view, presetJourney: saved }),
  teachPlanFramework: async (_id, request) => {
    assert.equal(request.resumeAfterNetworkInterrupt, true);
    assert.equal(request.expectedRequestId, 'old-request');
    assert.equal(request.expectedPlanHash, 'unchanged-plan'); calls++;
    // The real service owns dispatch reconciliation, exact-body verification
    // and old cost preservation. This fixture proves coordinator forwarding.
    view.providerDispatches[0].status = 'completed';
    view.teachFramework = { status: 'completed', planHash: 'unchanged-plan', appliedToPlanHash: 'unchanged-plan', investigationCompleted: true, coverage: [] };
  } };
const journey = createPresetRosterJourneyV1({ service, readState: () => saved,
  saveState: async (_id, state) => { saved = structuredClone(state); } });
service.runPresetJourney = journey.run;
const http = createRosterPlanningWorkspaceHttpAdapterV1({ service });
const pathname = prefix + '/sessions/' + view.sessionId + '/run';
assert.notEqual((await http.handle({ method: 'POST', pathname })).status, 202);
const result = await http.handle({ method: 'POST', pathname,
  body: { resumeAfterNetworkInterrupt: true, expectedRequestId: 'old-request' } });
assert.equal(result.status, 202, JSON.stringify(result.response));
for (let i = 0; saved?.status === 'running' && i < 100; i++) await new Promise(r => setImmediate(r));
assert.equal(saved.status, 'completed', JSON.stringify(saved));
assert.equal(calls, 1);
await journey.run(view.sessionId); assert.equal(calls, 1);
console.log(JSON.stringify({ status: 'pass', exactRecoveryCalls: calls, newPlans: 0, providerCalls: 0, scope: 'HTTP/coordinator forwarding, no live Provider' }));
