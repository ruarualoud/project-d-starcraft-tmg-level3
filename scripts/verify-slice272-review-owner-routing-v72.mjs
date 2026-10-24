// Actual D-v6 reviewer/Plan ownership bug. No paid call or mutable Room.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { reconcileRosterFinalPlanReviewV1 } from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
import { collectRosterClaimRepairBacklogV1 } from '../packages/roster-strategist/roster-claim-repair-backlog-v1.mjs';
import { runReviewedRosterPlanRepairV1 } from '../packages/roster-planning-workspace/reviewed-plan-auto-repair-v1.mjs';

const draft = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
const plan = JSON.parse(draft.planSerialized);
const current = { ...draft, plan,
  planVersionHistory: draft.planVersionHistory.map(JSON.parse) };
const failures = [];
let correctionRequest = null;
try {
  await reconcileRosterFinalPlanReviewV1({ plan, review: draft.planReview.review,
    sessionId: draft.sessionId, toolReceipts: draft.toolReceipts,
    selectedCandidateInputHash: hash(draft.selectedCandidateInput),
    armyAudit: draft.working.verdict.audit,
    retainedOutputs: draft.publicOutputs,
    deliberation: { async deliberate(request) {
      correctionRequest = request;
      throw Object.assign(new Error('CAPTURE_REVIEW_CORRECTION'), { code: 'CAPTURE_REVIEW_CORRECTION' });
    } } });
} catch (error) { if (error.code !== 'CAPTURE_REVIEW_CORRECTION') throw error; }
try {
  assert(correctionRequest, 'a saved reviewer/fact conflict must re-enter reviewer correction');
  assert.deepEqual(correctionRequest.promptNodes.find(n => n.kind === 'literal-claims-to-qualify')
    .targets.map(t => t.findingIndex), [94], 'already accepted item 88 must not be reasked');
  assert(correctionRequest.promptNodes.find(n => n.kind === 'failed-item-feedback')
    .items.some(i => i.bindingIssues.some(b => b.code === 'FACT_ASSESSMENT_CONFLICT')));
} catch (e) { failures.push(e.message); }

let planWrites = 0, stopCode;
try {
  await runReviewedRosterPlanRepairV1({ sessionId: draft.sessionId,
    expectedPlanHash: plan.planHash, authorizeAdditionalCycle: true,
    service: { readSession: () => current, reconcileReviewFindings: async () => current,
      revisePlan: async () => { planWrites++; throw Object.assign(new Error('WRONG_OWNER'), { code: 'WRONG_OWNER' }); } } });
} catch (e) { stopCode = e.code; }
try {
  assert.equal(planWrites, 0, 'unresolved reviewer contradiction must not mutate Plan');
  assert.equal(stopCode, 'ROSTER_WORKSPACE_REVIEW_JUDGMENT_RECOVERY_REQUIRED');
} catch (e) { failures.push(e.message); }

const backlog = collectRosterClaimRepairBacklogV1(current);
try {
  for (const path of ['scoreRoute.routeText',
    'opponentHypotheses.H4-race-player2-markers.hypothesisText',
    'opponentHypotheses.H4-race-player2-markers.expectedCounterTexts.1']) {
    assert(backlog.some(e => e.claimPath === path), 'retain unchanged cross-claim dependency: ' + path);
  }
} catch (e) { failures.push(e.message); }
console.log(JSON.stringify({ status: failures.length ? 'FAIL' : 'PASS', failures,
  reviewerCorrectionRequested: !!correctionRequest, planWrites, providerCalls: 0,
  retainedCrossClaimPaths: backlog.map(e => e.claimPath) }));
process.exitCode = failures.length ? 1 : 0;
