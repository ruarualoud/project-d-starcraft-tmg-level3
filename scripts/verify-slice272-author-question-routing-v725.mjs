// The paid failure repeatedly queried three unfilled Plan declarations. The
// protocol could not represent "the author must decide", so it routed all such
// unresolved work to a factual laboratory.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as questions from '../packages/roster-strategist/roster-review-data-questions-v1.mjs';
import {rosterSourceReviewRepairStageV1} from '../packages/roster-strategist/roster-experiment-source-repair-v1.mjs';
import {projectRosterWorkflowFactInquiryV1} from '../packages/roster-strategist/roster-workflow-fact-inquiry-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {projectRosterWorkflowQuestionRouteV1} from '../packages/roster-strategist/roster-workflow-question-routing-v1.mjs';
import {createRosterWorkflowReviewAssignmentsV1,assessRosterWorkflowFinalReviewsV1} from '../packages/roster-strategist/roster-workflow-readiness-v1.mjs';

const root=path.resolve(process.argv[2]);
const read=async ref=>JSON.parse(await fs.readFile(path.join(root,'artifacts',ref+'.json'),'utf8'));
const state=JSON.parse(await fs.readFile(path.join(root,'workflow.json'),'utf8'));
const original=JSON.stringify(state);
const paid=await read('83060bb6a69f122b32d1b517f154f7cdb59a7af66dfed3a37054819c32b5cc39');
const request=await read('3809e516dca520f326d0bf620011a50f4b7a86c22ba94b2a93a1aef9f8f3ca9a');
const actual=request.promptNodes.find(node=>node.kind==='workflow_role_assignment');
const pending=paid.output.unresolvedQuestions;
assert.equal(pending.length,2);
const typed=[
  {question:pending[0],classification:'necessary_fact',publicReason:'Controlled classification fixture: geometry remains unmeasured.',evidenceNumbers:[]},
  {question:pending[1],classification:'author_decision',publicReason:'Controlled classification fixture: choose intended schedule, loss contingency and activation order; no tool can choose these for the author.',evidenceNumbers:[]},
];
// A controlled corrected classification is not a claim that the live model has
// produced it. Its question text comes from the real immutable failed reply.
const check=questions.projectRosterReviewDataQuestionsV1({
  checkId:'question_coverage',verdict:'supported',publicReason:'Do not accept either outstanding obligation.',
  evidenceNumbers:[],conditions:[],dataQuestions:typed,
});
assert.deepEqual(check.requiredData,[pending[0]]);
assert.deepEqual(check.requiredDecisions,[pending[1]]);
assert.equal(questions.rosterReviewCheckPassedV1(check),false);
assert.equal(questions.rosterReviewCheckPassedV1({...check,requiredData:[],
  dataQuestions:typed.slice(1)}),false,'author-only gaps must not pass');
const roleWork=state.work.find(work=>work.id===actual.workId);
const scheduled=await read(roleWork.inputRef);
const reviewSource=actual.inputs.sourceReview;
assert.ok(reviewSource.evidenceId);
const assignment={...scheduled,inputs:{...structuredClone(actual.inputs),
  sourceReview:{...reviewSource,value:{checks:[check]}}}};
for(const key of Object.keys(assignment.inputs))if(/^failedSourceClaim\d+$/.test(key))delete assignment.inputs[key];
const stage=rosterSourceReviewRepairStageV1(assignment.inputs);
assert.equal(stage.phase,'missing_fact_investigation');
assert.deepEqual(stage.necessaryQuestions.map(q=>q.question),[pending[0]]);
assert.deepEqual(stage.authorDecisions.map(q=>q.question),[pending[1]]);
const inquiry=await projectRosterWorkflowFactInquiryV1({state,readArtifact:read,work:{
  ...roleWork,inputs:{decision:{source:'literal',value:{decisions:[check]}}}}});
assert.deepEqual(inquiry.question.value.necessaryQuestions,[pending[0]]);
assert.deepEqual(inquiry.question.value.authorDecisions.map(q=>q.question),[pending[1]]);
assert.equal(projectRosterWorkflowQuestionRouteV1(assignment.inputs).kind,'fact_query',
  'a real unresolved measurement is not skipped just because an author choice also exists');
// Isolate the author-only route as a controlled state transition. The earlier
// measurement remains in the real saved checkpoint; this is not a live verdict.
assignment.inputs.sourceReview.value.checks=[questions.projectRosterReviewDataQuestionsV1({
  ...check,dataQuestions:typed.slice(1),
})];
assert.equal(projectRosterWorkflowQuestionRouteV1(assignment.inputs).kind,'author_decision');

let providerRequests=0,checkpoint;
const operationState={version:1,turn:2,reads:[],calls:[],correction:null,consecutiveCorrections:1};
const execute=createRosterWorkflowReadRoleExecutorV1({store:{load:async()=>state,get:read,
  put:async()=>{throw Error('NO_NEW_PROVIDER_OR_ARTIFACT_EXPECTED');}},sessionId:'author-route-verification',deliberation:{},
  onRequest:async()=>{providerRequests++;throw Error('AUTHOR_CHOICE_WAS_MISROUTED_TO_FACT_PROVIDER');}});
const result=await execute(assignment,{operationState,checkpointOperation:async value=>{checkpoint=structuredClone(value);}});
assert.equal(providerRequests,0);
assert.equal(result.value.coordination.kind,'author_decision_return');
assert.equal(result.value.modelInterpretationNotRulesTruth,false,'Host route must not pretend to be an LLM reply');
assert.equal(result.value.experimentConclusion.status,'strategy_required');
assert.deepEqual(result.value.workOrders,[]);
assert.deepEqual(result.value.unresolvedQuestions,[pending[1]]);
assert.equal(result.value.coordination.factApprovalGranted,false);
assert.equal(result.value.coordination.planApprovalGranted,false);
assert.equal(checkpoint.turn,operationState.turn);
assert.equal(checkpoint.consecutiveCorrections,operationState.consecutiveCorrections);
assert.equal(checkpoint.controlReturns.length,1);
const readiness={mechanicalReady:true,mechanicalBlockers:[],activeWork:[],strategyQuestions:[]};
const reviewState={scope:state.scope,draftRevision:state.draftRevision,work:[],evidence:[]};
const assignments=createRosterWorkflowReviewAssignmentsV1({state:reviewState,readiness});
const reviews=assignments.map(item=>({workId:item.id,resultRef:'controlled-review',
  value:{checks:item.inputs.review.value.obligations.map(obligation=>({
    checkId:obligation.checkId,verdict:'supported',requiredData:[],evidenceRefs:[],
  }))}}));
Object.assign(reviews[0].value.checks[0],{dataQuestions:typed.slice(1),requiredDecisions:[pending[1]]});
const final=assessRosterWorkflowFinalReviewsV1({state:reviewState,readiness,reviews});
assert.equal(final.readyForRelease,false,'the actual product release check must retain author obligations');
assert.deepEqual(final.semanticIssues[0].requiredDecisions,[pending[1]]);
// A pending Provider request must be reconciled, never replaced by this route.
await assert.rejects(execute(assignment,{operationState:{...operationState,pending:{requestRef:'already-sent'}},
  checkpointOperation:async()=>{}}),/DISPATCH_UNRECONCILED/);
const legacy=questions.projectRosterReviewDataQuestionsV1({requiredData:pending});
assert.deepEqual(legacy.requiredData,pending,'do not reclassify saved untyped history by keywords');
assert.equal(JSON.stringify(state),original);
console.log(JSON.stringify({passed:true,actualQuestionText:true,classificationIsControlledFixture:true,
  factAndAuthorLanesSeparated:true,normalRoleExecutorReturnsToAuthor:true,pendingDispatchPreserved:true,
  noFalseAcceptance:true,providerCalls:0,nativeCalls:0,productionWrites:0,realModelClassificationStillRequired:true}));
