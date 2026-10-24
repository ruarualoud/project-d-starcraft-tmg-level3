// e7222: a paid reply copied our exact same-request reference, then the shared
// executor rejected the transport handle as a malformed experimentScope.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import * as encoding from '../packages/roster-strategist/roster-prompt-evidence-encoding-v1.mjs';
const root=process.argv[2],get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const resultFile=process.cwd()+'/build/slice272-v818-gate-'+Date.now()+'.json';
process.on('uncaughtException',async error=>{
  const result={pass:false,message:error.message,stack:error.stack?.split('\n').slice(0,7)};
  await fs.writeFile(resultFile,JSON.stringify(result,null,2));console.error(JSON.stringify(result));process.exitCode=1;
});
console.log(JSON.stringify({stage:'started',resultFile}));
const requestRef='950e51c0c243a76c6e09dfbf7a97aee25d2ba4b3744e06cbfc22fa523fa1f1ad';
const replyRef='5ea0ff525423be5b21412a816ae39f81e42805a807c062567f0f3a5bf9fb9bea';
const request=await get(requestRef),reply=await get(replyRef),raw=JSON.stringify(reply);
let state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const work=state.work.find(w=>w.operationState?.calls?.some(c=>c.replyRef===replyRef));assert.ok(work);
const draftRef=state.draftRef,originalCalls=structuredClone(work.operationState.calls);
work.status='ready';work.failure=null;work.operationState.pending=null;
work.operationState.revalidateReplyRef=replyRef;work.operationState.savedRevalidationRequestRef=requestRef;
const memory=new Map();
const store={load:async()=>structuredClone(state),save:async value=>{state=structuredClone(value);},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):get(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v818-exact-paid-reply',
  deliberation:{deliberate:async()=>{throw Error('No new Provider request allowed');}}});
// Replaying an old reply requires its delivered assignment as well as its
// original request. Today's reconstructed tool/context inputs are not that turn.
const delivered=request.promptNodes.find(node=>node.kind==='workflow_role_assignment');
const graph=await createRosterDecisionWorkflowV1({store,execute:(assignment,control)=>execute({
  ...assignment,inputs:structuredClone(delivered.inputs),scope:structuredClone(delivered.scope)},control)});
await graph.dispatch({type:'run_ready',workIds:[work.id],concurrency:1});
const after=state.work.find(w=>w.id===work.id),result=await store.get(after.resultRef);
if(result.kind!=='proposal')console.log(JSON.stringify({stage:'unexpected_role_boundary',result,
  correction:after.operationState.correction}));
assert.equal(result.kind,'proposal','an issued, intact transport reference must not become schema repair');
assert.equal(result.value.failedWorkOrders.length,0);
assert.equal(result.value.workOrders.length,1);
const exact=request.promptNodes[0].inputs.task.value.originalWork.experimentScope;
assert.deepEqual(result.value.workOrders[0].experimentScope,exact);
assert.deepEqual(result.value.workOrders[0].steps,reply.output.workOrders[0].steps);
assert.ok(result.value.outputProjection.some(p=>p.rule==='same_request_evidence_reference_v1'));
assert.deepEqual(after.operationState.calls,originalCalls,'no new charge or erased call');
assert.equal(state.draftRef,draftRef);assert.equal(state.acceptanceGranted,false);assert.equal(JSON.stringify(reply),raw);
const project=encoding.projectRosterProviderOutputReferencesV1;
for(const change of [
  handle=>{handle.contentHash='0'.repeat(64);},
  handle=>{handle.targetJsonPointer='/promptNodes/0/inputs/no-such-field';},
  handle=>{handle.strategyChoice='invented';},
]){
  const output=structuredClone(reply.output);change(output.workOrders[0].experimentScope);
  const failed=project({request,output});assert.equal(failed.errors.length,1);assert.equal(failed.projection.length,0);
  assert.deepEqual(failed.output,output,'invalid references remain explicit errors, never guessed');
}
const different=structuredClone(request);different.promptNodes[0].inputs.task.value.originalWork.experimentScope.decisionImpact='different request';
assert.equal(project({request:different,output:reply.output}).errors.length,1,'cannot resolve against a different request');
const plain=structuredClone(reply.output);plain.workOrders[0].experimentScope=structuredClone(exact);
const unchanged=project({request,output:plain});assert.deepEqual(unchanged.output,plain);assert.equal(unchanged.projection.length,0);
const resultReport={pass:true,actualPaidReplyReused:true,sharedExecutor:true,scopeAndStepsExact:true,
  invalidReferencesRejected:true,rawReplyAndCallsKept:true,providerCalls:0,nativeCalls:0,productionWrites:0,strategyProven:false};
await fs.writeFile(resultFile,JSON.stringify(resultReport,null,2));console.log(JSON.stringify(resultReport));
