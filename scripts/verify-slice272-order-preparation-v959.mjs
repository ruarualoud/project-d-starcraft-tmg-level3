// Actual r21 mixed command, injected at the product role seam. No network,
// Native dispatch, production writes or invented game evidence.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1,projectRosterWorkflowSavedSchemaRevalidationV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {prepareRosterWorkOrderEditCommandV1,projectRosterWorkOrderEditCommandV1} from '../packages/roster-strategist/roster-work-order-edit-command-v1.mjs';
const [directory,mode='lifecycle']=process.argv.slice(2),copy=structuredClone,memory=new Map();
const get=async ref=>memory.has(ref)?copy(memory.get(ref)):JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const put=async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;};
const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
const input=await get('8db687659950654f0ad51ed43fe1b4081a5399f200de570a43d2789178ded423');
const live=state.work.find(w=>w.id===input.workId),originalHash=hash(state);
const replyRefs=['11259d8a521caa071fbf90f15fa6b48e8252efe78915c05e0bc36d6fb79f1b60',
  '86f2e67cccd04d6263d78187c9dd3b2c2c1193002538d0077ccea70ea7bba1e2',
  '8961f0affc4d183a3f3681be11d895bed40f097fb022e0c7c6e4a83da614c58b'];
const savedRequest=await get('d14c2e46ce3a515942e32a5c689406483fe712ecaa934a867db354b543f799c3');
const raw=(await get(replyRefs[2])).output;
let operation=copy(live.operationState),captured,readCount=0,injected=copy(raw),providerCount=0;
const sentinel=Error('capture-provider');
const control=()=>({operationState:copy(operation),checkpointOperation:async op=>{operation=copy(op);},
  readEvidence:async(id,pointer)=>{readCount++;
    const row=input.evidenceDirectory.find(e=>e.id===id);assert.ok(row);
    // Source view pointers are authoritative original paths, not section indexes.
    const original=await get('69b496a2aa091305781e31ccb8a8feae7543b64814959d08a97ad84c6aab7888');
    const body=original.value??original;
    let value=body;for(const key of pointer.split('/').slice(1))value=value?.[key.replace(/~1/g,'/').replace(/~0/g,'~')];
    return {status:value===undefined?'missing_pointer':'read',evidenceId:id,pointer,kind:row.kind,
      conditions:row.conditions,validity:'current',value:value??null};},
  publishContext:async()=>assert.fail('Preparation cannot create an experiment/context')});
const executor=()=>createRosterWorkflowReadRoleExecutorV1({sessionId:'offline-v959',store:{get,put,load:async()=>state},
  deliberation:{deliberate:async request=>{providerCount++;captured=copy(request);if(injected===null)throw sentinel;
    return {output:copy(injected),receipt:{providerKind:'offline_injection',contextHash:request.contextHash,
      roundKind:request.roundKind,sessionId:request.sessionId,roundIndex:request.roundIndex,
      outputHash:hash(injected),outputContractRef:request.responseFormat.outputContractRef}};}}});
const checks=[];
if(mode==='lifecycle'){
  // Fresh v2 request receives the EXACT old model content; do not edit its steps.
  operation.correction=null;operation.consecutiveCorrections=0;
  const result=await executor()(copy(input),control());
  assert.equal(result.value.status,'reads_completed','Mixed request should prepare sources instead of rejecting or submitting its proposal');
  assert.equal(readCount,2);assert.ok(operation.workOrderEditPreparation,'Pending explicit edits survive a checkpoint');
  assert.equal(operation.workOrderEditPreparation.sourceReplyRef,operation.calls.at(-1).replyRef);
  assert.equal(result.kind,'interpretation');assert.equal(result.continuation,true);
  checks.push('actual_mixed_reply_reads_only_and_retains_unconfirmed_order');
  const prep=copy(operation.workOrderEditPreparation),oldReads=copy(operation.reads);
  injected=null;
  try{await executor()(copy(input),control());assert.fail('Expected capture');}catch(e){if(e!==sentinel)throw e;}
  const node=captured.promptNodes.find(n=>n.kind==='work_order_edit_preparation');assert.ok(node);
  assert.deepEqual(node.order,prep.order);assert.equal(node.approved,false);
  assert.ok(captured.responseFormat.schema.properties.action.enum.includes('confirm'));
  const delivered=captured.promptNodes.find(n=>n.kind==='exact_read_results');assert.ok(delivered.results.length);
  assert.equal(readCount,2);assert.deepEqual(operation.reads,oldReads);
  checks.push('cold_role_delivers_retained_proposal_and_read_results_without_requery');
  const confirm={action:'confirm',publicReason:'Offline explicit confirmation; compiler must still reject malformed selection.',
    reads:[],catalogueQueries:[],stepEdits:null,completionStepId:null,conclusion:null,unresolvedQuestions:[]};
  const compiled=projectRosterWorkOrderEditCommandV1({request:captured,output:confirm});
  assert.deepEqual(compiled.errors,[]);assert.deepEqual(compiled.output.workOrders,[prep.order]);
  // Explicit incremental change preserves ALL other proposed and original steps.
  const changed=copy(raw.stepEdits.upsert[0]);changed.step.publicReason+=' revised';
  const revised=projectRosterWorkOrderEditCommandV1({request:captured,output:{...raw,reads:[],stepEdits:{upsert:[changed],remove:[]},completionStepId:null}});
  assert.deepEqual(revised.errors,[]);
  assert.deepEqual(revised.output.workOrders[0].steps.filter(s=>s.stepId!==changed.step.stepId),prep.order.steps.filter(s=>s.stepId!==changed.step.stepId));
  const stale=copy(captured);stale.strategyRepairState.preparation.baseOrderHash='different';
  assert.ok(projectRosterWorkOrderEditCommandV1({request:stale,output:confirm}).errors.some(e=>e.code==='work_order_edit_preparation_stale'));
  checks.push('explicit_confirmation_and_incremental_revision_preserve_steps_but_reject_stale_base');
  // Do not reuse capture's unsent pending marker. Real confirmation runs normal compiler.
  operation.pending=null;injected=confirm;
  const submitted=await executor()(copy(input),control());
  assert.ok(submitted.value.failedWorkOrders.length,'Known optionIndex/argument bugs must NOT be approved by preparing reads');
  assert.equal(submitted.value.workOrders.length,0);assert.equal(readCount,2);
  assert.equal(operation.workOrderEditPreparation,undefined);
  assert.equal(operation.completedWorkOrderEditPreparations.at(-1).sourceReplyRef,prep.sourceReplyRef);
  checks.push('confirmation_runs_original_compiler_and_never_executes_invalid_or_unconfirmed_steps');
}else if(mode==='recovery'){
  const paid=await get(replyRefs[2]);
  const proof=projectRosterWorkflowSavedSchemaRevalidationV1({work:live,reply:paid,request:savedRequest});
  assert.equal(proof?.repairKind,'work_order_read_preparation');
  for(const variant of [{...live,operationState:{...live.operationState,pending:{requestRef:'in-flight'}}},
    {...live,failure:{dispatchOutcome:'unknown'}},
    {...live,operationState:{...live.operationState,correction:{...live.operationState.correction,errors:[{code:'unrelated'}]}}}])
    assert.equal(projectRosterWorkflowSavedSchemaRevalidationV1({work:variant,reply:paid,request:savedRequest}),null);
  // Mirror the EXISTING explicit product recovery command, retaining history.
  operation.correctionRecovery={normalLimit:3,originalReplyRef:replyRefs[2],historyReset:false};
  operation.consecutiveCorrections=0;operation.correctionLimit=1;operation.revalidateReplyRef=replyRefs[2];
  const result=await executor()(copy(input),control());
  assert.equal(providerCount,0);assert.equal(readCount,2);assert.equal(result.value.status,'reads_completed');
  assert.equal(operation.workOrderEditPreparation.sourceReplyRef,replyRefs[2]);
  assert.equal(operation.calls.length,3);assert.equal(operation.correctionRecovery.originalReplyRef,replyRefs[2]);
  assert.equal(operation.consecutiveCorrections,0);
  assert.deepEqual((await get(replyRefs[2])).output,raw);
  checks.push('old_paid_mixed_command_migrates_only_to_read_preparation_no_new_provider_or_history_reset');
  for(let i=0;i<replyRefs.length;i++){
    const oldReply=await get(replyRefs[i]),oldCall=live.operationState.calls.find(c=>c.replyRef===replyRefs[i]);
    const oldRequest=await get(oldCall.requestRef);
    assert.equal(projectRosterWorkOrderEditCommandV1({request:oldRequest,output:oldReply.output}).errors[0].code,'work_order_edit_requires_patch_only','Old contract retains its original semantics');
  }
  checks.push('all_three_original_paid_commands_still_keep_original_v1_semantics');
}else if(mode==='self-anchor'){
  const request=await get('d0b89e3f7b82614287ae3c31cd5959ab99907da1f862c4bb7095e28af6600881');
  const paid=await get('29e670082f6f31a3ab9033a5d5e5ea5d699ac750fbf9a0f6a13556fb4330153e');
  const before=hash(paid),base=request.strategyRepairState.preparation.order;
  const result=projectRosterWorkOrderEditCommandV1({request,output:paid.output});
  assert.deepEqual(result.errors,[],'Existing step anchored to itself is an in-place replacement, not an invalid move');
  assert.deepEqual(result.output.workOrders[0].steps.map(s=>s.stepId),base.steps.map(s=>s.stepId));
  for(const edit of paid.output.stepEdits.upsert)assert.deepEqual(result.output.workOrders[0].steps.find(s=>s.stepId===edit.step.stepId),edit.step);
  assert.deepEqual(result.output.workOrders[0].steps[0],base.steps[0]);
  assert.ok(result.projection.some(p=>p.rule==='existing_step_self_anchor_no_move_v1'));
  const unknown=copy(paid.output);unknown.stepEdits.upsert[0].step.stepId='new-unknown';unknown.stepEdits.upsert[0].beforeStepId='new-unknown';
  assert.equal(projectRosterWorkOrderEditCommandV1({request,output:unknown}).errors[0].code,'work_order_edit_invalid_before');
  const proof=projectRosterWorkflowSavedSchemaRevalidationV1({work:live,reply:paid,request});
  assert.equal(proof?.repairKind,'work_order_self_anchor');
  assert.equal(proof.providerReplayed,false);assert.equal(proof.nativeReplayed,false);
  assert.equal(projectRosterWorkflowSavedSchemaRevalidationV1({work:{...live,operationState:{...live.operationState,pending:{requestRef:'unknown'}}},reply:paid,request}),null);
  assert.equal(hash(paid),before);
  checks.push('actual_self_anchors_replace_in_place_without_losing_steps_or_changing_model_parameters',
    'unknown_self_anchor_rejected_and_paid_revalidation_scoped_to_exact_failure');
}else throw Error('mode must be lifecycle, recovery or self-anchor');
assert.equal(hash(state),originalHash);
console.log(JSON.stringify({pass:true,mode,checks,realProviderCalls:0,nativeCalls:0,productionWrites:0}));
