// Actual a79add36 repeated a scope refusal while repairing obsolete coordinates.
// Replay only that captured role boundary; no Provider, Native or production writes.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {prepareRosterWorkOrderEditCommandV1} from '../packages/roster-strategist/roster-work-order-edit-command-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {projectRosterWorkflowRoleSourceInputsV1} from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
import {rosterRepeatedWorkOrderFailureV1} from '../packages/roster-strategist/roster-workflow-order-failure-v1.mjs';
const dir=process.argv[2],memory=new Map(),copy=structuredClone;
const get=async ref=>memory.has(ref)?copy(memory.get(ref)):JSON.parse(await fs.readFile(dir+'/artifacts/'+ref+'.json','utf8'));
const put=async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;};
const state=JSON.parse(await fs.readFile(dir+'/workflow.json','utf8')),before=hash(state);
const saved=await get('9d7beda29daf60966b4af4d18f684aec64dcb5b97de37b85a04a3a4523a04db1');
const oldReply=await get('a79add368fa0ac515eb03d7cb298ed7b04305f27e92887e4822f48fac76e4bad');
const input=await get('b3fd259b44f18fdcde2037fe45116522f1bfbd3ed2abb9691263b8e01d8e6824');
const request=prepareRosterWorkOrderEditCommandV1({...saved,
  responseFormat:saved.strategyRepairState.originalResponseFormat,
  promptNodes:saved.promptNodes.filter(n=>n.kind!=='work_order_edit_command')});
const command=request.promptNodes.find(n=>n.kind==='work_order_edit_command');
if(!process.argv.includes('--remaining')){
assert(command.currentRejection,'Current rejection must be a first-class edit-command input, not buried in historical context');
assert.equal(command.currentRejection.code,'ROSTER_WORKFLOW_CHOICE_SCOPE_EXCEEDED');
assert.equal(command.currentRejection.detail.stepId,'inspect-after-deploy');
assert.equal(command.proposalAuthority,false);
assert.equal(hash(command.retainedOrder),hash(input.inputs.task.value.failedOrder),'Do not silently drop the offending step');
const task=input.inputs.task.value,failed=(await get('40e76c40ac28e6fbf72c6714119c4bbdb28720292652d1ef28eb95d70ae9d8f8')).value.failedWorkOrders;
assert(rosterRepeatedWorkOrderFailureV1({task,failures:failed}),'Actual repeated refusal must stop');
assert.equal(rosterRepeatedWorkOrderFailureV1({task,failures:[]}),null,'Successful correction must proceed');
const changed=copy(failed);changed[0].error.detail.issue='different_failure';
assert.equal(rosterRepeatedWorkOrderFailureV1({task,failures:changed}),null,'New compiler outcome is not the same loop');
const moved=copy(failed);moved[0].order.steps.reverse();moved[0].error.detail.issue='different_failure';
assert.equal(rosterRepeatedWorkOrderFailureV1({task,failures:moved}),null);
}

input.inputs=await projectRosterWorkflowRoleSourceInputsV1({assignment:input,state,readArtifact:get});
let operation={version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:0},calls=0;
const execute=createRosterWorkflowReadRoleExecutorV1({store:{get,put,load:async()=>state},sessionId:'offline-v987',
  deliberation:{deliberate:async request=>{calls++;return {output:copy(oldReply.output),receipt:{
    providerKind:'offline_injected_saved_output',contextHash:request.contextHash,roundKind:request.roundKind,
    sessionId:request.sessionId,roundIndex:request.roundIndex,outputHash:hash(oldReply.output),
    outputContractRef:copy(request.responseFormat.outputContractRef),paidProviderCall:false}};}}});
const control={get operationState(){return copy(operation);},checkpointOperation:async value=>{operation=copy(value);},
  readEvidence:async(id,pointer)=>{const entry=input.evidenceDirectory.find(e=>e.id===id);assert(entry);
    let value=await get(entry.artifactRef);for(const token of pointer.split('/').slice(1)){
      const key=token.replaceAll('~1','/').replaceAll('~0','~');assert(Object.hasOwn(value,key));value=value[key];}
    return {status:'read',evidenceId:id,pointer,kind:entry.kind,conditions:entry.conditions??[],validity:entry.validity,value};},
  publishContext:async(value,metadata={})=>{const ref=await put(value),id='offline-v987:'+ref;
    let index=input.evidenceDirectory.findIndex(e=>e.id===id);
    if(index<0){index=input.evidenceDirectory.length;input.evidenceDirectory.push({id,artifactRef:ref,
      title:metadata.title??'Saved context',kind:metadata.kind??'interpretation',validity:'current',bindings:copy(state.scope),
      conditions:metadata.conditions??[],availability:'available',readPaths:[]});}
    return {...input.evidenceDirectory[index],evidenceNumber:index+1,
      ...(metadata.includeDirectory?{evidenceDirectory:copy(input.evidenceDirectory)}:{})};}};
await assert.rejects(()=>execute(input,control),error=>error.message==='ROSTER_WORKFLOW_ROLE_NO_PROGRESS');
assert.equal(operation.noProgressStop.reason,'unchanged_compiler_rejection');
assert.equal(calls,1,'No second injected reply may be requested');
await assert.rejects(()=>execute(input,control),error=>error.message==='ROSTER_WORKFLOW_ROLE_NO_PROGRESS');
assert.equal(calls,1,'Persisted stop must survive cold role continuation');
assert.equal(operation.calls.length,1,'Original reply and receipt retained');
assert.equal(hash(state),before);
assert.equal(hash(oldReply),hash(await get('a79add368fa0ac515eb03d7cb298ed7b04305f27e92887e4822f48fac76e4bad')));
console.log(JSON.stringify({ok:true,mode:process.argv.includes('--remaining')?'remaining_only':'full',checks:[
  ...(process.argv.includes('--remaining')?[]:['current_rejection_explicit','original_order_unchanged']),
  'actual_product_role_same_failure_stopped','cold_stop_no_second_call','old_reply_state_unchanged'],
  injectedCalls:calls,providerCalls:0,nativeCalls:0,productionWrites:0}));
