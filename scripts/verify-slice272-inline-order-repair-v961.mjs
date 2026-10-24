// Reproduce the actual r21 same-role correction boundary, then exercise its
// incremental continuation. Injected model replies are NOT production evidence.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1,projectRosterWorkflowFeedbackRecoveryV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {prepareRosterWorkOrderEditCommandV1,projectRosterWorkOrderEditCommandV1} from '../packages/roster-strategist/roster-work-order-edit-command-v1.mjs';
const [directory,mode='full']=process.argv.slice(2),copy=structuredClone,memory=new Map();
const get=async ref=>memory.has(ref)?copy(memory.get(ref)):JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const put=async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;};
const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8')),before=hash(state);
const input=await get('3a13140fd676f52722f01a42efc19568a59f099f2ebe5507e0668820db441531');
const live=state.work.find(w=>w.id===input.workId),old=copy(live.operationState);
const request=await get('991be12009db0041c9140bef006d392bb96a7a88af66106a710dbc11d9d6077e');
const paid=await get('8cf1f52449adcefbd7d8cc937f35a9a170d9834c74feb516326d7bf1c0ee91da');
let operation=copy(old),captured,injected=null,reads=0;
operation.consecutiveCorrections=0;operation.correctionLimit=1;
const sentinel=Error('capture-unissued-request');
const control=()=>({operationState:copy(operation),checkpointOperation:async op=>{operation=copy(op);},
  readEvidence:async()=>{reads++;assert.fail('All selected immutable reads already exist');},
  publishContext:async()=>assert.fail('No new scene or context is needed')});
const executor=()=>createRosterWorkflowReadRoleExecutorV1({sessionId:'offline-v961',store:{get,put,load:async()=>state},
  deliberation:{deliberate:async req=>{captured=copy(req);if(injected===null)throw sentinel;
    return {output:copy(injected),receipt:{providerKind:'offline_injection',contextHash:req.contextHash,
      roundKind:req.roundKind,sessionId:req.sessionId,roundIndex:req.roundIndex,
      outputHash:hash(injected),outputContractRef:req.responseFormat.outputContractRef}};}}});
async function capture(){const checkpoint=copy(operation);injected=null;
  try{await executor()(copy(input),control());assert.fail('Expected request capture');}catch(e){if(e!==sentinel)throw e;}
  operation=checkpoint;return copy(captured);
}
const initial=mode==='remaining'?prepareRosterWorkOrderEditCommandV1(request):await capture();
if(mode!=='remaining'){
assert.equal(initial.responseFormat.schemaName,'roster_work_order_edit_command_v1',
  'Same-role selector corrections must use the incremental ledger, not re-author the whole workOrder');
assert.equal(initial.promptNodes.find(n=>n.kind==='work_order_edit_command')?.repairOrigin,'local_selection_validation');
assert.ok(!initial.responseFormat.schema.properties.workOrders);
assert.ok(initial.promptNodes.some(n=>n.kind==='local_contract_feedback'&&n.errors[0].detail.matchCount===0));
const original=paid.output.workOrders[0],changed=copy(original.steps[0]);changed.publicReason='Injected local clarification; no strategic or geometric substitution.';
const patch={action:'patch',publicReason:'Injected incremental edit with a saved read; not an executed experiment.',
  reads:[{evidenceNumber:2057,pointer:'/receipt/actionSpace'}],catalogueQueries:[],
  stepEdits:{upsert:[{step:changed,beforeStepId:null}],remove:[]},completionStepId:null,
  conclusion:null,unresolvedQuestions:copy(paid.output.unresolvedQuestions)};
injected=patch;
const prepared=await executor()(copy(input),control());
assert.equal(prepared.value.status,'reads_completed');assert.equal(reads,0);
assert.equal(operation.correction,null);assert.ok(operation.workOrderEditPreparation);
assert.deepEqual(operation.workOrderEditPreparation.order.steps[1],original.steps[1]);
assert.deepEqual(operation.workOrderEditPreparation.order.experimentScope,original.experimentScope);
assert.deepEqual(operation.reads,old.reads,'Incremental reply cannot erase prior successful reads');
const cold=await capture();
assert.equal(cold.responseFormat.schemaName,'roster_work_order_edit_command_v1');
assert.ok(cold.responseFormat.schema.properties.action.enum.includes('confirm'));
assert.deepEqual(cold.strategyRepairState.failedOrder,original);
const confirm={...patch,action:'confirm',reads:[],stepEdits:null};
const merged=projectRosterWorkOrderEditCommandV1({request:cold,output:confirm});
assert.deepEqual(merged.errors,[]);assert.deepEqual(merged.output.workOrders[0].steps,[changed,original.steps[1]]);
const stale=copy(cold);stale.strategyRepairState.preparation.scopeHash='different';
assert.equal(projectRosterWorkOrderEditCommandV1({request:stale,output:confirm}).errors[0].code,'work_order_edit_preparation_stale');
injected=confirm;
await assert.rejects(()=>executor()(copy(input),control()),/ROSTER_WORKFLOW_ROLE_CORRECTION_NOT_CONVERGED/);
assert.equal(operation.correction.errors[0].code,'ROSTER_WORKFLOW_NATIVE_SELECTION_MATCH_NOT_UNIQUE');
assert.equal(operation.correction.errors[0].detail.matchCount,0);
assert.match(operation.correction.errors[0].instruction,/not present|absent/i);
assert.equal(reads,0,'A retained invalid action must not be executed or cause a fresh query');
}
// Returning the failed method is an explicit model choice, not an empty patch
// interpreted as approval. The original factual question remains unresolved.
operation=copy(old);operation.consecutiveCorrections=0;operation.correctionLimit=1;
injected={action:'conclude',publicReason:'Injected explicit owner return; no fabricated facts or new operation.',
  reads:[],catalogueQueries:[],stepEdits:null,completionStepId:null,
  unresolvedQuestions:copy(paid.output.unresolvedQuestions),conclusion:{status:'strategy_required',nativeFacts:[],hypothesisAssessments:[],
  answer:'The selected core move is absent from the saved current menu; the method owner must choose a different bounded method.',
  evidenceNumbers:[2057],conditions:['Only the frozen deployed successor was inspected; earliest arrival remains unproven.']}};
const returned=await executor()(copy(input),control());
assert.equal(returned.value.experimentConclusion.status,'strategy_required');
assert.deepEqual(returned.value.unresolvedQuestions,paid.output.unresolvedQuestions);
assert.equal(returned.value.workOrders.length,0);assert.equal(returned.value.acceptanceGranted,false);
const proof=projectRosterWorkflowFeedbackRecoveryV1({work:live,reply:paid,request});
assert.equal(proof?.repairKind,'inline_order_incremental_correction');
assert.equal(proof.additionalInvalidResultLimit,1);assert.equal(proof.nativeReplayed,false);
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:live,reply:paid,request:initial}),null);
const unrelated=copy(request);unrelated.promptNodes.find(n=>n.kind==='local_contract_feedback').errors=[{code:'unrelated'}];
assert.equal(prepareRosterWorkOrderEditCommandV1(unrelated),null);
const multi=copy(request);multi.promptNodes.find(n=>n.kind==='local_contract_feedback').originalOutput.workOrders.push(copy(paid.output.workOrders[0]));
assert.equal(prepareRosterWorkOrderEditCommandV1(multi),null,'Never drop a sibling order to fit the single-order editor');
assert.equal(hash(state),before);assert.deepEqual((await get(old.calls.at(-1).replyRef)).output,paid.output);
console.log(JSON.stringify({pass:true,mode,checks:[...(mode==='remaining'?[]:['actual_role_emits_incremental_command','pending_steps_and_reads_survive_cold_handoff',
  'stale_scope_rejected','invalid_move_still_rejected']),'explicit_control_return_preserves_question','single_old_protocol_recovery'],
  realProviderCalls:0,nativeCalls:0,productionWrites:0}));
