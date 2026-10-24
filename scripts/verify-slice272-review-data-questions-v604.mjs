// Actual round4 coverage said supported but mixed future frequency/opponent
// choices and optional measurements into the hard necessary-fact string lane.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as roles from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/projection-owner');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const owner=state.work.findLast(w=>w.experimentGoalId==='p5-current-obligations-v577:r2:component_choices');
const review=state.work.findLast(w=>w.experimentSourceReviewOf===owner.id);
const coverage=(await read(review.resultRef)).value.checks.find(c=>c.checkId==='question_coverage');
assert.equal(coverage.verdict,'supported');assert.equal(coverage.requiredData.length,3);
assert(roles.ROSTER_WORKFLOW_CLASSIFIED_REVIEW_CONTRACT_V1,'typed review contract must separate facts, future conditions and optional probes');
const {projectRosterReviewDataQuestionsV1,createRosterCoverageClarificationV1,assessRosterCoverageClarificationV1}=
  await import('../packages/roster-strategist/roster-review-data-questions-v1.mjs');
const prior=structuredClone(coverage),questions=coverage.requiredData.map((question,index)=>({question,
  classification:['necessary_fact','future_condition','optional_probe'][index],publicReason:'FIXTURE classification; not actual model evidence'}));
const normalized=projectRosterReviewDataQuestionsV1({...coverage,dataQuestions:questions});
assert.deepEqual(coverage,prior);assert.deepEqual(normalized.requiredData,[questions[0].question]);
assert(normalized.conditions.includes(questions[1].question));assert.equal(normalized.optionalData[0].question,questions[2].question);
const source={checkId:'source_fidelity',verdict:'supported',requiredData:[]};
const assessment={checks:[source,coverage],failedClaimReviewIds:[]};
const job=createRosterCoverageClarificationV1({state,owner,review,assessment,coverage});
assert.equal(job.sourceFidelityMode,'classified_coverage_v1');assert.equal(job.parentSourceReviewId,review.id);
assert.deepEqual(job.coverageQuestions,coverage.requiredData);assert.equal(job.inputs.review.value.requirementClassificationVersion,1);
assert.equal(assessRosterCoverageClarificationV1({parentAssessment:assessment,review:job,checks:[normalized]}).acceptedForStrategy,false);
const conditionalOnly=projectRosterReviewDataQuestionsV1({...coverage,dataQuestions:questions.map(q=>({...q,classification:'future_condition'}))});
assert.equal(assessRosterCoverageClarificationV1({parentAssessment:assessment,review:job,checks:[conditionalOnly]}).acceptedForStrategy,true,
  'fixture demonstrates classification composition only, not correctness of these labels');
assert.equal(assessRosterCoverageClarificationV1({parentAssessment:assessment,review:job,
  checks:[{...conditionalOnly,dataQuestions:conditionalOnly.dataQuestions.slice(1)}]}).acceptedForStrategy,false,'no dropped question');
assert.equal(assessRosterCoverageClarificationV1({parentAssessment:{...assessment,checks:[{...source,verdict:'requires_revision'},coverage]},
  review:job,checks:[conditionalOnly]}).acceptedForStrategy,false,'no waived source conflict');
console.log(JSON.stringify({status:'passed',actualAmbiguousFollowUps:3,typedLanes:3,necessaryStillBlocks:true,
  allQuestionsPreserved:true,sourceConflictsStillBlock:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
