// Actual r21 compile-repair assignment. Offline injected replies, no Provider,
// Native execution or production writes. Omission must not erase pending steps.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {projectRosterStrategyRepairOutputV1} from '../packages/roster-strategist/roster-workflow-semantic-repair-v1.mjs';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const directory=process.argv[2],memory=new Map(),copy=structuredClone;
const get=async ref=>memory.has(ref)?copy(memory.get(ref)):JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const put=async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;};
const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
const assignment=await get('3ffad81a8e8f6d90dc3526428835ecd9dddc1d4f4bc04a7bd5fb0718b18dbc67');
const original=copy(assignment.inputs.task.value.failedOrder),unchanged=hash(original),checks=[];
let request,saved,calls=0;
const patch=(edits,overrides={})=>({action:'patch',publicReason:'Offline explicit local edit, not a Native observation.',
  reads:[],catalogueQueries:[],stepEdits:edits,completionStepId:null,conclusion:null,unresolvedQuestions:[],...overrides});
const first=copy(original.steps[0]);first.publicReason+=' Read only this pending prerequisite; retain the remaining steps.';
const execute=createRosterWorkflowReadRoleExecutorV1({sessionId:'offline-v956',store:{get,put,load:async()=>state},deliberation:{deliberate:async value=>{
  calls++;request=value;
  assert.equal(value.responseFormat.schemaName,'roster_work_order_edit_command_v1',
    'compile repair must edit its retained work order, not replace it with an incomplete batch');
  const output=patch({upsert:[{step:first,beforeStepId:null}],remove:[]});
  return {output,receipt:{providerKind:'offline_injection',contextHash:value.contextHash,roundKind:value.roundKind,
    sessionId:value.sessionId,roundIndex:value.roundIndex,outputHash:hash(output),outputContractRef:value.responseFormat.outputContractRef}};
}}});
const result=await execute(assignment,{operationState:null,checkpointOperation:async op=>{saved=copy(op);},
  readEvidence:async()=>{throw Error('Unexpected read: this test only edits an already supplied pending step');},
  publishContext:async(value,metadata={})=>{
    const ref=await put(value),id='offline-v956:'+ref;
    let index=assignment.evidenceDirectory.findIndex(e=>e.id===id);
    if(index<0){index=assignment.evidenceDirectory.length;assignment.evidenceDirectory.push({id,artifactRef:ref,
      title:metadata.title??'Offline context',kind:metadata.kind??'interpretation',validity:'current',
      bindings:copy(assignment.scope),conditions:metadata.conditions??[],availability:'available',readPaths:[]});}
    return {...assignment.evidenceDirectory[index],evidenceNumber:index+1,
      ...(metadata.includeDirectory?{evidenceDirectory:copy(assignment.evidenceDirectory)}:{})};
  }});
assert.equal(calls,1);assert.equal(saved.correction,null);
assert.equal(result.value.workOrders.length,0,'untouched invalid Native input must still fail compilation');
const retained=result.value.failedWorkOrders[0].order;
assert.equal(retained.orderId,original.orderId);assert.deepEqual(retained.steps,[first,...original.steps.slice(1)]);
assert.equal(retained.completionStepId,original.completionStepId);
assert.equal(result.value.failedWorkOrders[0].error.code,'ROSTER_WORKFLOW_NATIVE_SELECTION_INVALID');
checks.push('actual_role_retains_unmentioned_tail_and_original_compiler_rejects_unchanged_error');
const project=output=>projectRosterStrategyRepairOutputV1({request:JSON.parse(JSON.stringify(request)),output});
const fixed=copy(original.steps[1]);
fixed.argumentsJson=JSON.stringify({selection:{fromStepId:original.steps[0].stepId,kind:'domain',
  match:{actionType:'deploy',pieceId:'marine-1'},parameters:{leadingModelId:'marine-1-model-1',
    entrySegmentId:'red-entry-1',entryAlongEdgeMilliInches:12000,path:[{x:12000,y:36000}],placements:[]}}});
fixed.bindings=[];
const repaired=project(patch({upsert:[{step:fixed,beforeStepId:null}],remove:[]}));
assert.deepEqual(repaired.errors,[]);
const order=repaired.output.workOrders[0];
assert.deepEqual(order.steps,[original.steps[0],fixed,original.steps[2]]);
assert.deepEqual(order.experimentScope,original.experimentScope);
const jobs=compileRosterWorkflowExperimentV1({order,scope:assignment.scope,namespace:'offline-v956',evidenceDirectory:assignment.evidenceDirectory});
assert.equal(jobs.length,3);assert.equal(jobs[2].inputs.request.value.operation,'inspect');
checks.push('one_step_patch_cold_decode_and_three_step_compile_without_native_execution');
const added={...copy(first),stepId:'explicit-prerequisite'};
const inserted=project(patch({upsert:[{step:added,beforeStepId:original.steps[1].stepId}],remove:[]}));
assert.deepEqual(inserted.errors,[]);
assert.deepEqual(inserted.output.workOrders[0].steps.map(s=>s.stepId),[original.steps[0].stepId,added.stepId,...original.steps.slice(1).map(s=>s.stepId)]);
const removed=project(patch({upsert:[],remove:[{stepId:original.steps[2].stepId,reason:'Explicitly stop after the action.'}]},
  {completionStepId:original.steps[1].stepId}));
assert.deepEqual(removed.errors,[]);assert.deepEqual(removed.output.workOrders[0].steps,original.steps.slice(0,2));
checks.push('explicit_insertion_and_removal_only');
for(const output of [
  patch({upsert:[{step:first,beforeStepId:null},{step:first,beforeStepId:null}],remove:[]}),
  patch({upsert:[],remove:[{stepId:'missing',reason:'not an existing command'}]}),
  patch({upsert:[],remove:[{stepId:original.steps[2].stepId,reason:'must also update completion'}]}),
  patch({upsert:[],remove:[{stepId:first.stepId,reason:''}]}),
  patch({upsert:[{step:added,beforeStepId:'missing'}],remove:[]}),
  patch({upsert:[{step:first,beforeStepId:null}],remove:[]},{reads:[{evidenceNumber:1,pointer:''}]}),
  patch({upsert:[],remove:[]},{completionStepId:'missing'}),
]) assert.ok(project(output).errors.length,'invalid/ambiguous explicit edits must not silently mutate commands');
checks.push('conflicts_missing_ids_dangling_completion_and_mixed_commands_rejected');
const read=project(patch(null,{action:'read',reads:[{evidenceNumber:1,pointer:''}]}));
assert.deepEqual(read.errors,[]);assert.deepEqual(read.output.workOrders,[]);
const conclusion=project(patch(null,{action:'conclude',conclusion:{status:'strategy_required',answer:'A different objective needs the owner.',
  evidenceNumbers:[],nativeFacts:[],conditions:[],hypothesisAssessments:[]},unresolvedQuestions:['Pending deploy remains unproved.']}));
assert.deepEqual(conclusion.errors,[]);assert.deepEqual(conclusion.output.workOrders,[]);
assert.equal(conclusion.output.unresolvedQuestions.length,1);
assert.equal(hash(original),unchanged);assert.equal(hash(assignment.inputs.task.value.failedOrder),unchanged);
const old=await get('73f63a69b35e82cdea7eb5d5c5dadf0de407ea2fabb5a375ffc43a724488aa40');
const legacy={promptNodes:[],responseFormat:{schema:{}}};
assert.deepEqual(projectRosterStrategyRepairOutputV1({request:legacy,output:old.value}).output,old.value);
checks.push('read_control_return_original_immutability_and_paid_legacy_unchanged');
console.log(JSON.stringify({pass:true,checks,providerCalls:0,nativeCalls:0,productionWrites:0,
  scope:'Compile-failed unexecuted method edits. Does not prove Native deployment legality, final Plan, or all query transitions.'}));
