// Actual fixed r12 stop: a supported source claim carries classified follow-ups,
// but this atomic auditor did not receive the shared pre-game proof scope.
// Recheck only that actual incomplete input, never classify/delete in Host.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createRosterExperimentSourceReviewV1,assessRosterExperimentConclusionV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
import {rosterWorkflowAcceptanceStageV1,projectRosterReviewDataQuestionsV1,rosterReviewOriginalQuestionCoverageErrorV1} from '../packages/roster-strategist/roster-review-data-questions-v1.mjs';
const base=path.join(process.cwd(),'build/slice272-product-generation-v645-I7zekC/workspace/decision-workflows/decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const id='review-resolution:r12:round2:map_and_arrival:source-revision:source-revision:source-revision';
const owner=state.work.find(w=>w.id===id),previous=state.work.find(w=>w.id===id+':source-review:v2');
assert.equal(owner.experimentReviewRound,3);assert.equal(previous.status,'evidence_ready');
const before=JSON.stringify(state),old=await assessRosterExperimentConclusionV1({state,owner,store:{get}});
assert.equal(old.acceptedForStrategy,false);assert.ok(old.failedClaimReviewIds.length);
const next=await createRosterExperimentSourceReviewV1({state,owner,result:await get(owner.resultRef),store:{get}});
assert(next,'The exact completed ambiguous source check needs the shared pre-game scope, not NO_READY_WORK');
assert.equal(next.sourceReviewRecheckOf,previous.id);
assert.equal(next.materialClaimContractVersion,5);
assert.equal(next.claimReviews.length,old.failedClaimReviewIds.length,'do not re-buy passed source claims');
assert.ok(next.materialClaims.some(c=>c.reusedResultRef));
for(const job of next.claimReviews){
  assert.equal(job.inputs.review.value.requirementClassificationVersion,1);
  const stage=rosterWorkflowAcceptanceStageV1({role:job.role,inputs:job.inputs});
  assert.equal(stage.stage,'pre_game_roster_plan','atomic source review must share the pregame scope, not request a completed match');
  assert.ok(job.inputs.originalDataQuestions.value.length,'the exact old questions must reach their classifier');
  const actual=job.inputs.originalDataQuestions.value;
  const prior=(await get(state.work.find(w=>w.id===job.priorQuestionReviewId).resultRef)).value.checks[0];
  assert.deepEqual(actual,prior.dataQuestions.map(q=>q.question));
}
const question=next.claimReviews[0].inputs.originalDataQuestions.value[0];
assert.equal(rosterReviewOriginalQuestionCoverageErrorV1([question],[{dataQuestions:[]}]).code,'review_original_question_classification_coverage');
assert.equal(rosterReviewOriginalQuestionCoverageErrorV1([question],[{dataQuestions:[{question},{question}]}]).code,'review_original_question_classification_coverage');
assert.equal(rosterReviewOriginalQuestionCoverageErrorV1([question],[{dataQuestions:[{question}]}]),null);
const common={checkId:'source_fidelity',verdict:'supported',publicReason:'CONTROLLED classification fixture only',evidenceNumbers:[],conditions:[]};
const unresolved=projectRosterReviewDataQuestionsV1({...common,dataQuestions:[{question,classification:'necessary_fact',publicReason:'missing current feasibility',evidenceNumbers:[]}]});
assert.deepEqual(unresolved.requiredData,[question],'necessary facts still block; Host cannot soften them');
const conditional=projectRosterReviewDataQuestionsV1({...common,dataQuestions:[{question,classification:'future_condition',publicReason:'explicit later choice only',evidenceNumbers:[]}]});
assert.deepEqual(conditional.requiredData,[]);assert.ok(conditional.conditions.includes(question),'future question remains present, not deleted');
assert.equal(JSON.stringify(state),before,'production state and old replies remain unchanged');
console.log(JSON.stringify({passed:true,exactActualStopUsed:true,onlyFailedSourceChecksRequeued:next.claimReviews.length,
  passedSiblingsReused:next.materialClaims.filter(c=>c.reusedResultRef).length,oldQuestionsPreserved:true,
  hostClassifiesQuestions:false,necessaryFactsStillBlock:true,providerCalls:0,nativeCalls:0,productionWrites:0,
  actualModelClassificationProven:false}));
