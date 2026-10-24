// Paid proposal: a valid prerequisite was rejected for a redundant completion
// hint. Exercise the real compiler, role revalidation and atomic resolution.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {rosterWorkflowChoiceContractV1} from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';
import {createRosterDecisionWorkflowV1,rosterWorkflowOperationReplacementsV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import * as product from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const root=process.argv[2];assert(root);
const read=async ref=>JSON.parse(await fs.readFile(`${root}/artifacts/${ref}.json`,'utf8'));
const state=JSON.parse(await fs.readFile(`${root}/workflow.json`,'utf8'));
const resultRef='c63e84aedc4f75364fd1f7c6265226ab4d448d3f46d21218b6c535789b4f652e';
const work=state.work.find(w=>w.resultRef===resultRef),result=await read(resultRef);
const order=result.value.failedWorkOrders[0].order,original=JSON.stringify(order);
const choice=rosterWorkflowChoiceContractV1({state,workId:work.id});
const target=state.work.find(w=>w.id===choice.targetWorkId);
const source=state.evidence[order.experimentScope.comparisonBinding.purposeEvidenceNumber-1];
const comparisonPurpose={status:'read',evidenceId:source.id,value:(await read(source.artifactRef)).proposals[0].comparisonPurpose};
const compile=value=>compileRosterWorkflowExperimentV1({order:value,scope:work.bindings,
  namespace:'v770-prerequisite',evidenceDirectory:state.evidence,comparisonPurpose,choiceContract:choice});
let jobs;
assert.doesNotThrow(()=>{jobs=compile(order);},'valid prerequisite blocked by a model-owned completion hint');
assert.equal(jobs.length,1);
assert.deepEqual(rosterWorkflowOperationReplacementsV1({original:target.inputs.request.value,jobs,
  completionWorkId:jobs[0].id}),[],'the hint cannot turn geometry into a formation application');
assert.equal(JSON.stringify(order),original,'do not rewrite the paid proposal');
const extra=structuredClone(order);extra.steps.push({stepId:'unowned-fire',operation:'threat_exchange',argumentsJson:'{}',bindings:[],guards:[],publicReason:'extra'});
assert.throws(()=>compile(extra),e=>e.code==='ROSTER_WORKFLOW_CHOICE_SCOPE_EXCEEDED','downstream work remains parent-owned');
const bad=structuredClone(order);bad.completionStepId='nonexistent';
assert.throws(()=>compile(bad),e=>e.code==='ROSTER_WORKFLOW_REPAIR_COMPLETION_STEP_MISSING');

const recovery=await product.createRosterCompletionRevalidationV1({state,work,result,readArtifact:read});
assert(recovery,'saved reply must be reusable without another paid confirmation');
assert.equal(recovery.orderRepairGeneration,work.orderRepairGeneration);
assert.equal(recovery.orderRepairLimit,work.orderRepairLimit);
assert.equal(recovery.operationState.revalidateReplyRef,result.value.originalReplyRef);
assert.equal(await product.createRosterCompletionRevalidationV1({state:{...state,work:[...state.work,recovery]},work,result,readArtifact:read}),null);
assert.equal(await product.createRosterCompletionRevalidationV1({state,work:{...work,operationState:{pending:{}}},result,readArtifact:read}),null);

let checkpoint=structuredClone(state);checkpoint.work.push(recovery);
const memory=new Map(),store={load:async()=>structuredClone(checkpoint),save:async value=>{checkpoint=structuredClone(value);},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):read(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const input=await read(work.inputRef),call=work.operationState.calls.find(c=>c.replyRef===result.value.originalReplyRef);
const paidRequest=await read(call.requestRef),inputs=paidRequest.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
let providerCalls=0,operation;
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v770-offline',deliberation:{deliberate:async()=>{providerCalls++;throw Error('NO_PROVIDER');}},
  onRequest:async()=>{throw Error('NO_NEW_REQUEST');}});
const replayed=await execute({...input,workId:recovery.id,inputs},{operationState:recovery.operationState,
  checkpointOperation:async value=>{operation=structuredClone(value);},
  readEvidence:async()=>{throw Error('NO_NEW_SOURCE_NEEDED');}});
assert.equal(replayed.value.failedWorkOrders.length,0);
assert.deepEqual(replayed.value.workOrders,[order]);
assert.equal(replayed.value.originalReplyRef,result.value.originalReplyRef);
assert.equal(providerCalls,0);
assert.deepEqual(operation.calls,work.operationState.calls,'retain original paid-call references, no new dispatch');

const fake={...structuredClone(jobs[0]),id:'v770-observed-geometry',status:'evidence_ready',choiceFor:target.id,
  resultRef:await store.put({kind:'tool_receipt',value:{operation:'spatial',receipt:{resultStatus:'ok'}}})};
checkpoint.work.push(fake);
const workflow=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('NO_NATIVE');}});
await assert.rejects(workflow.dispatch({type:'resolve_choice_with_work',workId:target.id,replacementWorkId:fake.id}),
  e=>['ROSTER_WORKFLOW_REPAIR_OPERATION_MISMATCH','ROSTER_WORKFLOW_CHOICE_RESOLUTION_INVALID'].includes(e.code));
assert.equal(checkpoint.work.find(w=>w.id===target.id).status,'needs_model_choice');
assert.equal(JSON.stringify((await read(resultRef)).value.failedWorkOrders[0].order),original);
console.log(JSON.stringify({passed:true,paidOrderUnchanged:true,prerequisiteExecutable:true,parentNotCompleted:true,
  sourceRevalidationWithoutProvider:true,unauthorizedOperationRejected:true,providerCalls,nativeCalls:0,productionWrites:0}));
