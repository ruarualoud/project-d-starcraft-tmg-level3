// Reproduce the actual parent review: an old question's allegations were
// repeated as if they were current measurement premises. No paid call/state write.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const root=process.argv[2],copy=structuredClone;
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8')),before=hash(state);
const read=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const fixture=await read('c6b4eb964cf2c9378cf3047fb12eff6b448a77059ba53c91d6892134076d4978');
const assigned=copy(fixture.promptNodes.find(n=>n.kind==='workflow_role_assignment'));
for(const row of assigned.inputs.review.value.obligations)
  row.checkId=fixture.roleCommunication.reviewHandles.find(x=>x.handle===row.checkId)?.checkId??row.checkId;
assigned.evidenceDirectory=copy(state.evidence);
const originalQuestion=copy(assigned.inputs.question.value),nativeBefore=copy(assigned.inputs.measurementConditions);
assert(originalQuestion.necessaryQuestions.some(q=>q.includes('nonGeometryEqualityProven=false')));
const memory=new Map(),store={load:async()=>copy(state),
  get:async ref=>memory.has(ref)?copy(memory.get(ref)):read(ref),
  put:async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;}};
let captured,providerCalls=0;
const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'synthetic-premise-boundary-v855',
  onRequest:async request=>{captured=request;throw Error('CAPTURE_BEFORE_PROVIDER');},
  deliberation:{deliberate:async()=>{providerCalls++;throw Error('PROVIDER_MUST_NOT_RUN');}}});
await assert.rejects(executor(assigned,{operationState:{version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:0},
  checkpointOperation:async()=>{},publishContext:async()=>{throw Error('UNEXPECTED_PUBLICATION');},
  readEvidence:async()=>{throw Error('UNEXPECTED_SOURCE_READ');}}),/CAPTURE_BEFORE_PROVIDER/);
const boundary=captured.promptNodes.find(n=>n.kind==='inquiry_premise_boundary');
assert(boundary,'normal role dispatch must distinguish the original inquiry from current observed facts');
const inputs=captured.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
assert.equal(inputs.question.epistemicRole,'requested_predicates_with_unverified_premises');
assert.deepEqual(inputs.question.value,originalQuestion,'original question is preserved verbatim, not rewritten to pass');
assert.deepEqual(inputs.measurementConditions,nativeBefore,'Native observations must not change');
assert.equal(boundary.premisesApproved,false);
assert(boundary.currentObservationRefs.some(x=>x.input==='measurementConditions'));
const stage=captured.promptNodes.find(n=>n.kind==='acceptance_stage_contract');
assert.equal(stage.authorizedInquiry,undefined,'do not repeat the entire alleged history');
assert.equal(stage.authorizedInquiryRef.pointer,'/inputs/question/value');
const routing=captured.promptNodes.find(n=>n.kind==='typed_question_route');
for(const row of routing.factualQuestions){
  assert.equal(row.question,undefined);
  const i=Number(row.questionRef.pointer.split('/').at(-1));
  assert.equal(originalQuestion.necessaryQuestions[i],fixture.promptNodes.find(n=>n.kind==='typed_question_route').factualQuestions[routing.factualQuestions.indexOf(row)].question);
}
const {prepareRosterInquiryPremiseRequestV1:prepare}=await import('../packages/roster-strategist/roster-inquiry-premise-boundary-v1.mjs');
assert.deepEqual(prepare(captured),captured,'repeated preparation must be idempotent');
for(const role of ['roster_workflow_experiment_planner','roster_workflow_strategy_decision','roster_workflow_local_teach']){
  const r=copy(fixture);r.promptNodes.find(n=>n.kind==='workflow_role_assignment').role=role;
  assert(prepare(r).promptNodes.some(n=>n.kind==='inquiry_premise_boundary'));
}
const mismatch=copy(fixture);mismatch.promptNodes.find(n=>n.kind==='acceptance_stage_contract').authorizedInquiry.necessaryQuestions.push('different obligation');
assert(prepare(mismatch).promptNodes.find(n=>n.kind==='acceptance_stage_contract').authorizedInquiry,'nonidentical obligations cannot be coalesced');
const nonInquiry=copy(fixture);delete nonInquiry.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.question;
assert.deepEqual(prepare(nonInquiry),nonInquiry);
const {rosterInquiryReviewStageMismatchV1}=await import('../packages/roster-strategist/roster-inquiry-review-stage-v1.mjs');
const review={id:assigned.workId,role:assigned.role,inputs:assigned.inputs,status:'evidence_ready',resultRef:'synthetic',operationState:{calls:[{requestRef:'synthetic'}]}};
assert.equal(await rosterInquiryReviewStageMismatchV1({review,readArtifact:async()=>captured}),null,'same obligation via exact pointer is not a missing stage');
const wrong=copy(captured);wrong.promptNodes.find(n=>n.kind==='acceptance_stage_contract').authorizedInquiryRef.pointer='/inputs/review/value';
assert(await rosterInquiryReviewStageMismatchV1({review,readArtifact:async()=>wrong}),'wrong ref must not satisfy the obligation');
assert.equal(hash(state),before);assert.equal(providerCalls,0);
console.log(JSON.stringify({passed:true,normalRoleConstruction:true,originalQuestionAndNativeValuesPreserved:true,
  duplicatePremisesReferenced:true,roles:4,invalidReferenceRejected:true,paidCalls:0,nativeQueries:0,productionWrites:0,
  modelSemanticCorrectionProven:false}));
