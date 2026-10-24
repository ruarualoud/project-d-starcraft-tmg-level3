// Actual claim7 read Host instructions but had no eligible source number.
// Exercise the normal workflow publisher/role/reader with scripted replies.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1,projectRosterWorkflowFeedbackRecoveryV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {rosterReviewProofCitationErrorsV1} from '../packages/roster-strategist/roster-review-proof-context-v1.mjs';
const root=process.argv[2],copy=structuredClone;
const original=JSON.parse(await fs.readFile(root+'/workflow.json','utf8')),originalHash=hash(original);
const read=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const fixture=await read('1541de18844cb7400dd07b48e528c65105b18fe1d0c0d2f704ba7fdcee8f83e7');
const originalReply=await read('0a18898b48c24bb66da0d9d86e0344eceff754dbdcd77dbc58dc46a6f1cc9607');
assert.deepEqual(originalReply.output.checkPatches[0].replacement.evidenceNumbers,[]);
const assigned=fixture.promptNodes.find(n=>n.kind==='workflow_role_assignment');
if(process.argv.includes('--recovery-only')){
  const stopped=original.work.find(w=>w.id===assigned.workId),last=stopped.operationState.calls.at(-1);
  const request=await read(last.requestRef),reply=await read(last.replyRef);
  const recovery=projectRosterWorkflowFeedbackRecoveryV1({work:stopped,request,reply});
  assert.equal(recovery?.repairKind,'host_projection_source_citation');
  assert.equal(recovery.additionalInvalidResultLimit,1);assert.equal(recovery.historyReset,false);
  const delivered=copy(request);delivered.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.hostProjectionSource={
    source:'evidence',status:'read',value:{schema:'roster_host_projection_context_v1'}};
  assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:stopped,request:delivered,reply}),null);
  assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:{...stopped,operationState:{...stopped.operationState,pending:{}}},request,reply}),null);
  assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:{...stopped,role:'roster_workflow_strategy_decision'},request,reply}),null);
  await import('../packages/roster-planning-workspace/roster-decision-product-journey-v1.mjs');
  assert.equal(hash(original),originalHash);
  console.log(JSON.stringify({passed:true,mode:'remaining_recovery_only',oneBoundedRecovery:true,
    repairedInputCannotRenew:true,inFlightProtected:true,otherRoleCannotRenew:true,paidProviderCalls:0,nativeQueries:0,productionWrites:0}));
}else{
let state=copy(original),captured,sourceNumber,calls=0;
const memory=new Map(),store={load:async()=>copy(state),save:async s=>{state=copy(s);},
  get:async ref=>memory.has(ref)?copy(memory.get(ref)):read(ref),
  put:async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;}};
const id=assigned.workId,work=state.work.find(w=>w.id===id);
work.status='ready';work.failure=null;work.operationState={version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:0};
const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'synthetic-host-source-v854',deliberation:{deliberate:async request=>{
  captured=request;calls++;
  const inputs=request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
  sourceNumber=inputs.hostProjectionSource?.evidenceNumber;
  // A scope-only fixture verdict, not a claim that the original sentence or
  // army is correct. The test must not certify the historical model's prose.
  const output={action:'finish',reads:[],publicReason:'Synthetic scope-only citation check, no strategy approval.',checks:[{
    checkId:'q1',verdict:sourceNumber?'supported':'needs_evidence',
    publicReason:'The delivered Host projection labels causal attribution not assessed by this projection; that is not a measured effect.',
    evidenceNumbers:sourceNumber?[sourceNumber]:[],conditions:['Host interface wording only, not Native measurements.'],dataQuestions:[]}]};
  return {output,receipt:{contextHash:request.contextHash,roundKind:request.roundKind,sessionId:request.sessionId,
    roundIndex:request.roundIndex,outputHash:hash(output),outputContractRef:copy(request.responseFormat.outputContractRef),paidProviderCall:false,trainingTruth:false}};
}}});
const workflow=await createRosterDecisionWorkflowV1({store,execute:(assignment,control)=>executor({...assignment,
  inputs:{...copy(assigned.inputs),claim:{source:'literal',value:{...copy(assigned.inputs.claim.value),
    exactText:'The current Host source projection labels causal attribution not assessed by this projection.'}}}},control)});
await workflow.dispatch({type:'run_ready',workIds:[id],concurrency:1});
assert(sourceNumber,'actual inline Host scope must have an eligible immutable source number');
const input=captured.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
const entry=state.evidence[sourceNumber-1];assert.equal(entry.id,input.hostProjectionSource.evidenceId);
const body=await store.get(entry.artifactRef);
assert.equal(body.schema,'roster_host_projection_context_v1');assert.equal(body.rulesAuthority,false);
for(const name of ['measurementScenes','measurementRowDifferences','measurementConfigurations']){
  assert.deepEqual(body.projections[name].assessmentScope,assigned.inputs[name].value.assessmentScope);
  assert.equal(body.projections[name].instruction,assigned.inputs[name].value.instruction);
  assert.equal(body.projections[name].comparisons,undefined,'scope source must not duplicate whole measurement data');
  assert.equal(input[name].sourceContext.evidenceNumber,sourceNumber);
  const fetched=await workflow.dispatch({type:'read_evidence',consumer:id,evidenceId:entry.id,pointer:'/projections/'+name});
  assert.equal(fetched.status,'read');assert.deepEqual(fetched.value,body.projections[name]);
}
assert(captured.promptNodes.find(n=>n.kind==='citation_access').directlyReadEvidenceNumbers.includes(sourceNumber));
assert(captured.promptNodes.find(n=>n.kind==='assigned_evidence_references').entries.some(e=>e.evidenceNumber===sourceNumber));
const after=state.work.find(w=>w.id===id);
assert.equal(after.status,'evidence_ready','valid scope citation passes unchanged role gate');
assert.equal(state.acceptanceGranted,false);assert.equal(state.draftRef,original.draftRef);
const subject=input.reviewProofContext.value.subjectEvidenceNumbers[0];
const errors=await rosterReviewProofCitationErrorsV1({inputs:input,directory:state.evidence,readArtifact:store.get,
  checks:[{checkId:'source_fidelity',verdict:'supported',evidenceNumbers:[sourceNumber,subject]}]});
assert(errors.some(e=>e.code==='review_subject_is_not_evidence'),'adding a Host source cannot launder self-citation');
const {publishRosterHostProjectionContextV1:publish}=await import('../packages/roster-strategist/roster-host-projection-context-v1.mjs');
let publications=0;
const control={publishContext:async()=>{publications++;return {...copy(entry),evidenceNumber:sourceNumber,evidenceDirectory:copy(state.evidence)};}};
const upgraded=await publish({assignment:{...assigned,evidenceDirectory:copy(original.evidence)},control});
assert.equal(upgraded.inputs.hostProjectionSource.artifactRef,entry.artifactRef);
assert.equal(await publish({assignment:upgraded,control}),upgraded,'same delivery is idempotent');
assert.equal(publications,1);
for(const inputs of [{},{unrelated:{source:'literal',value:{instruction:'untrusted prose'}}}]){
  const a={...assigned,inputs};assert.equal(await publish({assignment:a,control}),a);
}
assert.equal(publications,1,'only recognized Host projection contracts are registered');
const stopped=original.work.find(w=>w.id===id),last=stopped.operationState.calls.at(-1);
const recovery=projectRosterWorkflowFeedbackRecoveryV1({work:stopped,request:await read(last.requestRef),reply:await read(last.replyRef)});
assert.equal(recovery?.repairKind,'host_projection_source_citation');
assert.equal(recovery.additionalInvalidResultLimit,1);assert.equal(recovery.historyReset,false);
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:stopped,request:captured,reply:await read(last.replyRef)}),null);
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:{...stopped,operationState:{...stopped.operationState,pending:{}}},
  request:await read(last.requestRef),reply:await read(last.replyRef)}),null);
assert.equal(hash(original),originalHash);assert.equal(calls,1);
console.log(JSON.stringify({passed:true,scriptedProviderCalls:calls,paidProviderCalls:0,nativeQueries:0,productionWrites:0,
  normalPublisherAndReader:true,scopeOnlySource:true,selfCitationStillRejected:true,originalsUnchanged:true,oneBoundedRecovery:true}));
}
