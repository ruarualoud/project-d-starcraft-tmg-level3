// Two observed r21 failures: empty Native selector diagnostics and a typed
// command repair trying to dereference a legacy feedback node that never existed.
// Offline real artifacts; no Provider, Native execution or production writes.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {resolveRosterWorkflowNativeSelectionV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1,projectRosterUnissuedReadRoleRecoveryV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [directory,mode]=process.argv.slice(2),memory=new Map(),copy=structuredClone;
const get=async ref=>memory.has(ref)?copy(memory.get(ref)):JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const put=async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;};
const checks=[];
if(mode==='selection'){
  const failure=(await get('af0cc15b8a362d8166a9eddb21ae24cc5f61dd7c59e1c1efe9d71959403ffb4c')).value.failedWorkOrders[0].error;
  assert.equal(failure.code,'ROSTER_WORKFLOW_NATIVE_SELECTION_INVALID');
  assert.deepEqual(failure.detail.issues,[],'retain the original empty diagnostic as failure evidence');
  const reject=selection=>{let caught;try{resolveRosterWorkflowNativeSelectionV1({selection},null);}catch(e){caught=e;}
    assert.equal(caught?.code,'ROSTER_WORKFLOW_NATIVE_SELECTION_INVALID');
    assert.ok(caught.detail.issues.length,'A rejected selector must identify the offending field, not return issues:[]');
    assert.ok(caught.detail.issues.every(i=>typeof i.pointer==='string'&&i.code));return caught.detail.issues;};
  const issues=reject(failure.detail.receivedSelection);
  assert.ok(issues.some(i=>i.pointer==='/selection/optionIndex'));
  assert.ok(issues.some(i=>i.code==='exactly_one_selection_selector_required'));
  for(const selection of [null,[],4,'bad',{},
    {kind:'invalid',sourceEvidenceNumber:1,index:0},
    {kind:'finite',sourceEvidenceNumber:0,index:0},
    {kind:'finite',fromStepId:'',index:0},
    {kind:'finite',fromStepId:'x',sourceEvidenceNumber:1,index:0},
    {kind:'finite',fromStepId:'x',index:-1},
    {kind:'finite',fromStepId:'x',index:0,match:{actionType:'move'}},
    {kind:'finite',fromStepId:'x',match:{}},
    {kind:'finite',fromStepId:'x',match:{pieceId:{value:'marine-1'}}},
    {kind:'finite',fromStepId:'x',match:JSON.parse('{"__proto__":"bad"}')},
    {kind:'formation',fromStepId:'x',index:0,parameters:{}},
    {kind:'domain',fromStepId:'x',index:0},
    {kind:'domain',fromStepId:'x',index:0,parameters:[]},
  ])reject(selection);
  checks.push('actual_empty_diagnostic_and_all_selector_rejection_branches_have_field_issues');
  const source=await get('37ff98c506af4000e318b2ce01be43a953965f6d0dc380e0c7ab42f565c7a7be');
  const before=hash(source),option=source.value.receipt.queryReceipt.result.formationOptions[3];
  const resolved=resolveRosterWorkflowNativeSelectionV1({selection:{sourceEvidenceNumber:2041,kind:'formation',index:3}},
    {workId:'saved-solver',value:source.value});
  assert.deepEqual(resolved.action.parameters,option.canonicalParameters);
  assert.equal(hash(source),before);
  checks.push('saved_valid_formation_still_copies_exact_parameters_without_source_mutation');
}else if(mode==='recovery'){
  const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
  const assignment=await get('a4ee474601cc3e5824d12d8a0ef01de28d42dfebe6c1b3dc2dc3f215987fab2c');
  const live=state.work.find(w=>w.id===assignment.workId),originalOperation=copy(live.operationState);
  assert.equal(originalOperation.correction.originalReplyRef,'11259d8a521caa071fbf90f15fa6b48e8252efe78915c05e0bc36d6fb79f1b60');
  const raw=(await get(originalOperation.correction.originalReplyRef)).output,before=hash(assignment),beforeState=hash(state);
  let captured,saved,modeReply='capture';const sentinel=Error('offline-provider-boundary');
  const executor=createRosterWorkflowReadRoleExecutorV1({sessionId:'offline-v958',store:{get,put,load:async()=>state},
    deliberation:{deliberate:async request=>{captured=request;if(modeReply==='capture')throw sentinel;
      return {output:copy(raw),receipt:{providerKind:'offline_injection',contextHash:request.contextHash,
        roundKind:request.roundKind,sessionId:request.sessionId,roundIndex:request.roundIndex,
        outputHash:hash(raw),outputContractRef:request.responseFormat.outputContractRef}};}}});
  const control=operationState=>({operationState:copy(operationState),checkpointOperation:async op=>{saved=copy(op);},
    readEvidence:async(id,pointer)=>{const row=originalOperation.reads.find(r=>r.evidenceId===id&&r.pointer===pointer);
      assert.ok(row,'Only original retained reads may be reused');return get(row.resultRef);},
    publishContext:async()=>assert.fail('No context publication is expected for this rejected command')});
  try{await executor(copy(assignment),control(originalOperation));assert.fail('Expected provider capture');}
  catch(e){if(e!==sentinel)throw e;}
  assert.equal(captured.responseFormat.schemaName,'roster_work_order_edit_command_v1');
  assert.deepEqual(captured.promptNodes.find(n=>n.kind==='local_contract_feedback').originalOutput,raw);
  assert.deepEqual(captured.strategyRepairState.failedOrder,assignment.inputs.task.value.failedOrder);
  checks.push('actual_cold_resume_reaches_same_typed_provider_with_unmodified_rejected_command');
  modeReply='bad';
  const result=await executor(copy(assignment),control(originalOperation));
  assert.equal(result.value.status,'needs_local_correction');
  assert.deepEqual(result.value.errors.map(e=>e.code),['work_order_edit_requires_patch_only']);
  assert.equal(saved.correction.originalReplyRef,await put({output:copy(raw),receipt:captured&&saved.calls.at(-1).receipt}));
  assert.deepEqual(assignment.inputs.task.value.failedOrder,captured.strategyRepairState.failedOrder);
  checks.push('rejected_patch_remains_unapplied_and_does_not_generate_null_role_schema_error');
  modeReply='capture';
  try{await executor(copy(assignment),control(saved));assert.fail('Expected resumed provider capture');}
  catch(e){if(e!==sentinel)throw e;}
  assert.deepEqual(captured.promptNodes.find(n=>n.kind==='local_contract_feedback').originalOutput,raw);
  assert.equal(hash(assignment),before);assert.equal(hash(state),beforeState);
  checks.push('second_cold_resume_retains_original_order_evidence_and_history');
}else if(mode==='reentry'){
  const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
  const input=await get('8db687659950654f0ad51ed43fe1b4081a5399f200de570a43d2789178ded423');
  const work=state.work.find(w=>w.id===input.workId),before=hash(state),oldOperation=copy(work.operationState);
  const proof=await projectRosterUnissuedReadRoleRecoveryV1({state,work,readArtifact:get});
  assert.ok(proof,'The proven local typed-command construction failure must resume without replaying paid calls');
  assert.equal(proof.engineeringChangeId,'typed_command_feedback_v958');
  assert.equal(proof.providerReplayed,false);assert.equal(proof.countersReset,false);
  for(const change of [{failure:{...work.failure,code:'unrelated unknown failure'}},
    {operationState:{...work.operationState,pending:{requestRef:'unknown'}}},
    {role:'roster_workflow_tool'},
    {failure:{...work.failure,dispatchOutcome:'not_dispatched'}}])
    assert.equal(await projectRosterUnissuedReadRoleRecoveryV1({state,work:{...work,...change},readArtifact:get}),null);
  let saved;
  const workflow=await createRosterDecisionWorkflowV1({store:{get,put,load:async()=>copy(state),save:async s=>{saved=copy(s);}},
    execute:async()=>assert.fail('No model/tool dispatch in reentry verification'),
    reconcileReadOnlyInterruption:projectRosterUnissuedReadRoleRecoveryV1});
  const resumed=(await workflow.inspect()).work.find(w=>w.id===work.id);
  assert.equal(resumed.status,'ready');assert.equal(resumed.failure,null);
  assert.deepEqual(resumed.operationState,oldOperation);
  assert.deepEqual(resumed.failureHistory.at(-1).failure,work.failure);
  assert.equal(saved.events.filter(e=>e.type==='unissued_read_role_resumed'&&e.workId===work.id).length,1);
  const cold=await createRosterDecisionWorkflowV1({store:{get,put,load:async()=>copy(saved),save:async()=>assert.fail('No duplicate recovery save')},
    execute:async()=>assert.fail('No dispatch'),reconcileReadOnlyInterruption:projectRosterUnissuedReadRoleRecoveryV1});
  assert.equal((await cold.inspect()).work.find(w=>w.id===work.id).interruptionRecoveries.length,resumed.interruptionRecoveries.length);
  assert.equal(hash(state),before);
  checks.push('actual_unknown_label_proved_pre_provider_and_resumed_once_without_counter_or_history_reset');
}else throw Error('mode must be selection, recovery or reentry');
console.log(JSON.stringify({pass:true,mode,checks,providerCalls:0,nativeCalls:0,productionWrites:0}));
