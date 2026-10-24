// Actual A v264 interruption, through the same HTTP Run used by clients.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createPresetRosterJourneyV1 } from '../packages/roster-planning-workspace/preset-roster-journey-v1.mjs';
import { createRosterPlanningWorkspaceHttpAdapterV1, ROSTER_PLANNING_WORKSPACE_API_PREFIX as prefix } from '../packages/roster-planning-workspace/roster-planning-workspace-http-v1.mjs';
const saved = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
const interrupted = saved.dispatches.at(-1);
assert.equal(interrupted.roundKind, 'final_plan_review');
assert.equal(interrupted.status, 'ambiguous');
let state, reviews = 0, teaches = 0, applications = 0;
const view = { sessionId: saved.sessionId, status: 'planned', lockedRoster: {},
  plan: { planHash: interrupted.planHash, openingDeploymentSchedule: {} },
  planReview: { status: 'failed', planHash: interrupted.planHash },
  providerDispatches: [structuredClone(interrupted)], claimRepairBacklog: [] };
const service = { descriptor: () => ({}), readSession: () => structuredClone({ ...view, presetJourney: state }),
  startPlanning: () => { throw Error('do_not_regenerate'); },
  reviewFinalPlan: async (_id, request) => {
    assert.equal(request.resumeAfterNetworkInterrupt, true);
    assert.equal(request.expectedRequestId, interrupted.requestId);
    reviews++;
    view.providerDispatches[0].status = 'completed';
    view.planReview = { status: 'completed', planHash: interrupted.planHash, review: { findings: [] } };
  }, teachPlanFramework: async (_id, request) => {
    assert.equal(request.resumeAfterNetworkInterrupt, undefined, 'Review recovery is not a Teach retry');
    teaches++;
    view.teachFramework = { status: 'completed', planHash: interrupted.planHash,
      investigationCompleted: true, coverage: [] };
  }, revisePlan: async () => {
    applications++;
    view.teachFramework.appliedToPlanHash = interrupted.planHash;
  } };
const journey = createPresetRosterJourneyV1({ service, readState: () => state,
  saveState: async (_id, value) => { state = structuredClone(value); } });
service.runPresetJourney = journey.run;
const http = createRosterPlanningWorkspaceHttpAdapterV1({ service });
const pathname = prefix + '/sessions/' + saved.sessionId + '/run';
const response = await http.handle({ method: 'POST', pathname,
  body: { resumeAfterNetworkInterrupt: true, expectedRequestId: interrupted.requestId } });
assert.equal(response.status, 202, JSON.stringify(response.response));
for (let n = 0; state?.status === 'running' && n < 100; n++) await new Promise(r => setImmediate(r));
assert.equal(state.status, 'completed', JSON.stringify(state));
assert.equal(reviews, 1); assert.equal(teaches, 1); assert.equal(applications, 1);
console.log(JSON.stringify({ pass: true, exactReviewRecovery: reviews, subsequentTeach: teaches,
  newPlans: 0, providerCalls: 0, scope: 'actual-stop HTTP/coordinator regression; live end-to-end still required' }));
