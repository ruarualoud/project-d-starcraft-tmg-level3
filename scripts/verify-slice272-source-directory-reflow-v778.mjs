// Actual context-rejected input already consumed the old reflow, which rebuilt
// the same 3.9M-char request. A changed delivery contract may rebuild once;
// transport failures and requests already on that contract may not.
import assert from 'node:assert/strict';
import {createReadStream} from 'node:fs';
import {readFile as readText} from 'node:fs/promises';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const root=process.argv[2],read=async ref=>JSON.parse(await readText(`${root}/artifacts/${ref}.json`,'utf8'));
const original=JSON.parse(await readText(`${root}/workflow.json`,'utf8'));
const target=original.work.at(-1),pending=target.operationState.pending;
assert.equal(target.failure.code,'ROSTER_WORKSPACE_PROVIDER_RESPONSE_REJECTED');
assert(target.operationState.contextReflows.some(r=>r.inputDeliveryVersion==='exact_json_children_v1'));
const request=await read(pending.requestRef),version='source_directories_v2';
let dispatch;
const trace=root.replace('/decision-workflows/','/decision-product-journeys/')+'/trace.jsonl';
for await(const line of createInterface({input:createReadStream(trace),crlfDelay:Infinity})){
  if(!line.includes(pending.contextHash))continue;
  const d=JSON.parse(line).value?.dispatch;
  if(d?.status==='response_rejected'&&d.contextHash===pending.contextHash)dispatch=d;
}
assert.equal(dispatch.rejection.contextLengthExceeded,true);
async function fixture(){
  let state=structuredClone(original),observed;const memory=new Map();
  const store={load:async()=>structuredClone(state),save:async next=>{state=structuredClone(next);},
    get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):read(ref),
    put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
  const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:request.sessionId,
    deliberation:{deliberate:async next=>{observed=next;throw Object.assign(Error('REQUEST_CAPTURED_WITHOUT_PROVIDER'),{dispatchOutcome:'not_dispatched'});}}});
  const flow=await createRosterDecisionWorkflowV1({store,execute});
  return {flow,store,state:()=>state,request:()=>observed};
}
const command={type:'reflow_provider_context',workId:target.id,dispatch,inputDeliveryVersion:version,
  reason:'Shared source directories replace automatically copied geometry history; no semantic or fee reset.'};
const f=await fixture();
await f.flow.dispatch(command);
const changed=f.state().work.find(w=>w.id===target.id);
assert.equal(changed.status,'ready');assert.equal(changed.operationState.pending,null);
assert.equal(changed.operationState.calls.length,target.operationState.calls.length);
assert.equal(changed.operationState.turn,target.operationState.turn);
assert.equal(changed.operationState.contextReflows.length,target.operationState.contextReflows.length+1);
assert.deepEqual(changed.operationState.contextReflows.at(-1).originalPending,pending);
assert.equal(changed.operationState.contextReflows.at(-1).dispatch.costStatus,'unknown');
await assert.rejects(f.flow.dispatch(command),e=>e.code==='ROSTER_WORKFLOW_CONTEXT_REFLOW_INVALID');
await f.flow.dispatch({type:'run_ready',concurrency:1,workIds:[target.id]});
const next=f.request();assert(next,'normal product role constructs the successor input');
assert.equal(next.promptNodes.find(n=>n.kind==='workflow_input_delivery').version,version);
const before=JSON.stringify(request).length,after=JSON.stringify(next).length;
assert(after<before*0.2);
assert.notEqual(next.contextHash,request.contextHash);
assert.deepEqual(next.promptNodes.find(n=>n.kind==='current_experiment_geometry_decision').currentSceneSpec,
  request.promptNodes.find(n=>n.kind==='current_experiment_geometry_decision').currentSceneSpec);
for(const bad of [{...dispatch,rejection:{...dispatch.rejection,httpStatus:503}},
  {...dispatch,rejection:{...dispatch.rejection,contextLengthExceeded:false}},
  {...dispatch,contextHash:'unrelated'}]){
  const isolated=await fixture();
  await assert.rejects(isolated.flow.dispatch({...command,dispatch:bad}),e=>e.code==='ROSTER_WORKFLOW_CONTEXT_REFLOW_INVALID');
}
// Even a first 400 on the CURRENT delivery version is not permission to retry
// the identical input. Reproduce that boundary without issuing a request.
const current=await fixture(),state=current.state(),w=state.work.find(w=>w.id===target.id);
const ref=await current.store.put(next);w.operationState.pending={requestRef:ref,contextHash:next.contextHash};
w.operationState.contextReflows=[];await current.store.save(state);
const cold=await createRosterDecisionWorkflowV1({store:current.store,execute:async()=>{throw Error('NO_EXECUTION');}});
await assert.rejects(cold.dispatch({...command,dispatch:{...dispatch,contextHash:next.contextHash}}),
  e=>e.code==='ROSTER_WORKFLOW_CONTEXT_REFLOW_INVALID');
assert.deepEqual(original,JSON.parse(await readText(`${root}/workflow.json`,'utf8')));
assert.deepEqual(request,await read(pending.requestRef));
console.log(JSON.stringify({pass:true,beforeRequestCharacters:before,afterRequestCharacters:after,
  originalUnknownFeesAndCountersPreserved:true,sameVersionAndNonCapacityRejected:true,
  providerCalls:0,nativeCalls:0,productionWrites:0}));
