// Real D reply has a correct literal judgment plus an irrelevant extra check.
// Real A references correct counterexamples, not additional erroneous claims.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { reconcileRosterFinalPlanReviewV1, effectiveRosterFinalPlanReviewFindingsV1 } from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
import { collectRosterClaimRepairBacklogV1 } from '../packages/roster-strategist/roster-claim-repair-backlog-v1.mjs';

const [d, a] = await Promise.all(process.argv.slice(2, 4).map(async p => JSON.parse(await fs.readFile(p, 'utf8'))));
const remainingOnly = process.argv.includes('--remaining-dependency-only');
const plan = JSON.parse(d.planSerialized);
let calls = 0;
let qualified = d.planReview.review;
if (!remainingOnly) {
qualified = await reconcileRosterFinalPlanReviewV1({ plan, review: d.planReview.review,
  sessionId: d.sessionId, toolReceipts: d.toolReceipts, retainedOutputs: d.publicOutputs,
  selectedCandidateInputHash: hash(d.selectedCandidateInput), armyAudit: d.working.verdict.audit,
  deliberation: { async deliberate() { calls++; throw Error('Must reuse the correct paid reply'); } } });
assert.equal(calls, 0);
assert.equal(qualified.reviewAdjudication.reconciliation.unresolvedJudgments.length, 0);
assert.equal(effectiveRosterFinalPlanReviewFindingsV1({ plan, review: qualified }).filter(f => f.severity === 'high').length, 0);
}
const record = x => ({ ...x, plan: JSON.parse(x.planSerialized), planVersionHistory: x.planVersionHistory.map(JSON.parse) });
if (!remainingOnly) assert.deepEqual(collectRosterClaimRepairBacklogV1(record(a)), [], 'correct A counterexamples must not become a new block');
const backlog = collectRosterClaimRepairBacklogV1({ ...record(d), planReview: { ...d.planReview, review: qualified } });
for (const p of remainingOnly ? ['opponentHypotheses.H4-race-player2-markers.expectedCounterTexts.1']
  : ['scoreRoute.routeText', 'opponentHypotheses.H4-race-player2-markers.hypothesisText',
    'opponentHypotheses.H4-race-player2-markers.expectedCounterTexts.1']) {
  assert(backlog.some(e => e.claimPath === p), p);
}
console.log(JSON.stringify({ status: 'PASS', providerCalls: calls, originalPlanUnchanged: true,
  remainingOnly, passedChecksNotRepeated: remainingOnly, DActualRelatedClaimsRetained: backlog.map(e => e.claimPath) }));
