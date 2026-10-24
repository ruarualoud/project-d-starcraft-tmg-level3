// The actual v961 reply selected a new domain. Its automatic source read must
// retain the incrementally merged method, not fall back to a full author reply.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {projectRosterWorkOrderEditCommandV1} from '../packages/roster-strategist/roster-work-order-edit-command-v1.mjs';
const [directory]=process.argv.slice(2),copy=structuredClone,memory=new Map();
const get=async ref=>memory.has(ref)?copy(memory.get(ref)):JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const put=async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;};
const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8')),before=hash(state);
const input=await get('3a13140fd676f52722f01a42efc19568a59f099f2ebe5507e0668820db441531');
const request=await get('5ba462e24d76116dd0fca6f41668a0ba4e925180eb40b12eff65ed8b4fa84951');
const replyRef='7f2b1d53dfc9dceba92372b616e56f784158f2bb0297adca8c26d567f8c7c8a0',paid=await get(replyRef);
const live=state.work.find(w=>w.id===input.workId);
// Exact checkpoint after the real implicit source read, before its next model
// turn. Later live calls cannot change this frozen test boundary.
const oldCallIndex=live.operationState.calls.findIndex(c=>c.replyRef===replyRef);
let operation={...copy(live.operationState),turn:live.operationState.calls[oldCallIndex].turn,
  calls:copy(live.operationState.calls.slice(0,oldCallIndex+1)),pending:null,correction:null,
  evidenceDelivery:{version:1,originalReplyRef:replyRef,conclusionAccepted:false,reads:[{
    evidenceId:'tool-view:product:after-teach:r21:subject-v1:investigation:strategy-frontier:investigation:order0:inspect-successor',
    pointer:'/receipt/actionSpace/parameterDomains/5',resultRef:'54da98496af2972471b2f783b157a7ba98aa5b995d9b4cc87a95ffbdb75b3f2e'}]}};
delete operation.workOrderEditPreparation;
const oldReads=copy(operation.reads),oldCalls=copy(operation.calls),sentinel=Error('capture'),captures=[];
const executor=()=>createRosterWorkflowReadRoleExecutorV1({sessionId:'offline-v962',store:{get,put,load:async()=>state},
  deliberation:{deliberate:async req=>{captures.push(copy(req));throw sentinel;}}});
async function capture(){try{await executor()(copy(input),{operationState:copy(operation),
  checkpointOperation:async op=>{operation=copy(op);},readEvidence:async()=>assert.fail('No requery'),
  publishContext:async()=>assert.fail('No new scene/context')});assert.fail('Expected capture');}catch(e){if(e!==sentinel)throw e;}
  operation.pending=null;return captures.at(-1);
}
const captured=await capture();
assert.equal(captured.responseFormat.schemaName,'roster_work_order_edit_command_v1',
  'Implicit source delivery must retain the command ledger and exact unconfirmed proposal');
assert.ok(captured.responseFormat.schema.properties.action.enum.includes('confirm'));
const expected=projectRosterWorkOrderEditCommandV1({request,output:paid.output});assert.deepEqual(expected.errors,[]);
assert.deepEqual(operation.workOrderEditPreparation.order,expected.output.workOrders[0]);
assert.equal(operation.workOrderEditPreparation.sourceReplyRef,replyRef);
assert.equal(operation.workOrderEditPreparation.approved,false);
assert.deepEqual(operation.reads,oldReads);assert.deepEqual(operation.calls,oldCalls);
assert.deepEqual(operation.workOrderEditPreparation.order.steps[1],request.strategyRepairState.failedOrder.steps[1]);
const next=await capture();
assert.deepEqual(next.strategyRepairState.preparation.order,captured.strategyRepairState.preparation.order);
assert.equal(operation.workOrderEditPreparation.previousProposalRefs.length,0);
const confirm={action:'confirm',publicReason:'Injected confirmation only; no Native execution.',reads:[],catalogueQueries:[],
  stepEdits:null,completionStepId:null,conclusion:null,unresolvedQuestions:copy(paid.output.unresolvedQuestions)};
const submitted=projectRosterWorkOrderEditCommandV1({request:next,output:confirm});
assert.deepEqual(submitted.errors,[]);assert.deepEqual(submitted.output.workOrders,expected.output.workOrders);
assert.equal(hash(state),before);assert.deepEqual((await get(replyRef)).output,paid.output);
console.log(JSON.stringify({pass:true,checks:['actual_implicit_read_recovers_exact_pending_order','cold_restore_is_idempotent',
  'original_tail_reads_and_calls_retained','explicit_confirmation_preserves_selected_parameters_without_approval'],
  realProviderCalls:0,nativeCalls:0,productionWrites:0}));
