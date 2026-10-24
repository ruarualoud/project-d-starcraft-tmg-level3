// Actual supported blocker review retained its original unanswered question.
// Test its routing without clearing that question or writing production state.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {assessRosterExperimentConclusionV1,createRosterExperimentReviewRevisionV1}
  from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
const [directory] = process.argv.slice(2);
assert.ok(directory);
const get = async ref => JSON.parse(await fs.readFile(`${directory}/artifacts/${ref}.json`, 'utf8'));
const saved = JSON.parse(await fs.readFile(`${directory}/workflow.json`, 'utf8'));
const review = saved.work.find(work => work.resultRef === 'c943518d8f69af502f286cefa41f95e7c564252cb927dfa7ef3136fc34842ccc');
assert.ok(review, 'actual supported blocker source review required');
const owner = saved.work.find(work => work.id === review.experimentSourceReviewOf);
const paidReview = await get(review.resultRef), paidOwner = await get(owner.resultRef);
const original = JSON.stringify({paidReview, paidOwner});
const question = review.inputs.question.value.necessaryQuestions[0];
assert.equal(paidOwner.value.experimentConclusion.status, 'blocked');
assert.ok(paidReview.value.checks.every(check => check.verdict === 'supported'));
assert.equal(paidReview.value.checks[1].dataQuestions[0].question, question);
const assess = async (body = paidReview, selectedReview = review) => {
  const state = {...saved, work: saved.work.map(work => work.id === review.id ? selectedReview : work)};
  const store = {get: ref => ref === review.resultRef ? structuredClone(body) : get(ref)};
  return assessRosterExperimentConclusionV1({state, owner, store});
};
const result = await assess();
assert.equal(result.status, 'blocked', 'verified blocker was reopened solely because the ORIGINAL inquiry stays unresolved');
assert.equal(result.capabilityBlockerVerified, true);
assert.equal(result.acceptedForStrategy, false);
assert.deepEqual(result.conclusion, paidOwner.value.experimentConclusion);
assert.equal(result.retainedOriginalQuestions[0].question, question);
assert.equal(result.retainedOriginalQuestions[0].classification, 'necessary_fact');
assert.equal(result.retainedOriginalQuestions[0].resolved, false);
assert.equal(result.retainedOriginalQuestions[0].reviewId, review.id);
console.log(JSON.stringify({check: 'actual-supported-blocker-returns-with-original-question-unresolved', pass: true}));

const mutated = edit => {const body = structuredClone(paidReview); edit(body.value.checks); return body;};
assert.equal((await assess(mutated(checks => checks[0].verdict = 'requires_revision'))).status, 'requires_revision');
assert.equal((await assess(mutated(checks => checks[1].dataQuestions.push({question: 'Missing prerequisite for the blocker itself',
  classification: 'necessary_fact', publicReason: 'Not the original inquiry', evidenceNumbers: []})))).status, 'requires_revision');
assert.equal((await assess(mutated(checks => checks[1].dataQuestions[0].classification = 'author_decision'))).status, 'requires_revision');
const wrong = {...review, capabilityBlockerResultRef: 'not-this-conclusion'};
assert.equal((await assess(paidReview, wrong)).status, 'awaiting_source_review');
const noIdentity = structuredClone(review); noIdentity.inputs.question = {source: 'literal', value: {task: question}};
assert.equal((await assess(paidReview, noIdentity)).status, 'requires_revision');
console.log(JSON.stringify({check: 'new-gaps-rejected-source-wrong-owner-and-untyped-identity-still-block', pass: true}));

// Exercise the actual continuation factory: do not create another fact repair.
const withoutUnusedRepair = {...saved, work: saved.work.filter(work => work.id !== owner.id + ':source-revision')};
assert.equal(await createRosterExperimentReviewRevisionV1({state: withoutUnusedRepair, owner, store: {get}}), null);
assert.equal(JSON.stringify({paidReview, paidOwner}), original);
console.log(JSON.stringify({pass: true, sourceReviewRef: review.resultRef, sourceOwnerRef: owner.resultRef,
  providerCalls: 0, nativeCalls: 0, productionWrites: 0, historyRewritten: false, originalQuestionResolved: false,
  finalPlanApproved: false, unnecessaryFactRevisionCreated: false}));
