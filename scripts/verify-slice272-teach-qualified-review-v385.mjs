import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { prepareRosterTeachContextV1 } from '../packages/roster-strategist/roster-planning-workflow-v1.mjs';
const saved = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
const plan = JSON.parse(saved.planSerialized);
const review = saved.planReview;
const before = JSON.stringify(review);
const original = review.review.findings[46];
assert.equal(original.severity, 'high');
assert.equal(review.review.reviewAdjudication.reconciliation.judgments[0].claimAssessment, 'source_supported');
const context = prepareRosterTeachContextV1({framework:{state:{}}, plan, freshContext:{}, review});
assert(context.sourceReview.settledFindings?.some(f => f.findingIndex === 46
  && f.claimAssessment === 'source_supported'),
  'Actual163 rejects the allegation, but actual164/165 Teach receives only the old allegation and repeats it');
assert(!context.sourceReview.findings.some(f => f.claimPath === original.claimPath
  && f.claimQuote === original.claimQuote), 'Settled exact finding is not an open allegation');
assert(context.sourceReview.findings.some(f => f.severity === 'low'
  && f.claimQuote.includes('exactly 12')), 'Unsettled low factual contradiction stays present');
assert.equal(JSON.stringify(review), before, 'Paid review and adjudication are not rewritten');
const { pendingRosterTeachReviewHandoffV1, commitRosterTeachReviewHandoffV1 } =
  await import('../packages/roster-strategist/roster-teach-source-review-v1.mjs');
const state = {agenda:{questions:[{questionId:'existing'}]},evidence:[],calls:[{paid:true}]};
const originalState = structuredClone(state);
const pending = pendingRosterTeachReviewHandoffV1({state,context:{sourceReview:{findings:[original]}},
  sourceReview:context.sourceReview,plan});
assert(pending);
const corrected = {questions:[{questionId:'existing',question:'model corrected public question'}]};
commitRosterTeachReviewHandoffV1(state,pending,corrected);
assert.deepEqual(state.agendaHistory[0].agenda,originalState.agenda);
assert.deepEqual(state.calls, originalState.calls);
assert.deepEqual(state.agenda,corrected);
assert.equal(pendingRosterTeachReviewHandoffV1({state,context:{},sourceReview:context.sourceReview,plan}),null);
assert.equal(pendingRosterTeachReviewHandoffV1({state:originalState,
  context:{sourceReview:context.sourceReview},sourceReview:context.sourceReview,plan}),null);
console.log(JSON.stringify({passed:true,actualFinding:46,originalReviewPreserved:true,
  legacyPaidAgendaCorrectedWithoutReset:true,freshContextNeedsNoExtraRound:true,providerCalls:0}));
