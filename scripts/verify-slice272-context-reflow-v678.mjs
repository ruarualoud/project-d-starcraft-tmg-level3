// Real HTTP400 context refusal -> typed same-work recovery, not an identical
// network retry, fabricated paid output, erased bill or new generation.
import fs from 'node:fs/promises';import {createReadStream} from 'node:fs';import {createInterface} from 'node:readline';
import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'build/slice272-product-generation-v645-I7zekC/workspace');
const id='decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34',base=path.join(dir,'decision-workflows',id);
const original=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const target=original.work.find(w=>w.id.endsWith('method:2d6d2da07d4cf306'));
assert.equal(target.failure.code,'ROSTER_WORKSPACE_PROVIDER_RESPONSE_REJECTED');
const originalRequest=await read(target.operationState.pending.requestRef);
let dispatch;
for await(const line of createInterface({input:createReadStream(path.join(dir,'decision-product-journeys',id,'trace.jsonl')),crlfDelay:Infinity})){
  if(!line.includes(target.operationState.pending.contextHash))continue;
  const d=JSON.parse(line).value?.dispatch;if(d?.status==='response_rejected')dispatch=d;
}
assert.equal(dispatch.rejection.contextLengthExceeded,true);
async function fixture(deliberation){
  let state=structuredClone(original);const memory=new Map();
  const store={load:async()=>structuredClone(state),save:async next=>{state=structuredClone(next);},
    get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):read(ref),
    put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
  const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:id,deliberation});
  const flow=await createRosterDecisionWorkflowV1({store,execute:executor});
  return {flow,store,state:()=>state};
}
const command={type:'reflow_provider_context',workId:target.id,dispatch,
  inputDeliveryVersion:'exact_json_children_v1',reason:'Source delivery now uses exact JSON children and explicit not-delivered navigation.'};
const f=await fixture({deliberate:async()=>{throw Error('NO_PROVIDER');}});
await f.flow.dispatch(command);
const recovered=f.state().work.find(w=>w.id===target.id);
assert.equal(recovered.status,'ready');assert.equal(recovered.operationState.pending,null);
assert.equal(recovered.operationState.calls.length,target.operationState.calls.length);
assert.equal(recovered.operationState.turn,target.operationState.turn);
assert.equal(recovered.operationState.contextReflows[0].dispatch.costStatus,'unknown');
assert.deepEqual(recovered.operationState.contextReflows[0].originalPending,target.operationState.pending);
assert.deepEqual(await read(target.operationState.pending.requestRef),originalRequest);
for(const rejected of [{...dispatch,rejection:{...dispatch.rejection,httpStatus:403}},
  {...dispatch,rejection:{...dispatch.rejection,contextLengthExceeded:false}},
  {...dispatch,contextHash:'another-request'}, {...dispatch,status:'ambiguous'}]){
  const bad=await fixture({deliberate:async()=>{throw Error('NO_PROVIDER');}});
  await assert.rejects(bad.flow.dispatch({...command,dispatch:rejected}),e=>e.code==='ROSTER_WORKFLOW_CONTEXT_REFLOW_INVALID');
  assert.deepEqual(bad.state().work.find(w=>w.id===target.id).operationState.pending,target.operationState.pending);
}
// The first successor goes through the ACTUAL read-role executor and control.
// An observer failure is intentional: no output/whole-source delivery invented.
let successor;
const live=await fixture({deliberate:async request=>{successor=request;throw Object.assign(Error('CONTROLLED_REQUEST_OBSERVED'),{dispatchOutcome:'not_dispatched'});}});
await live.flow.dispatch(command);
await live.flow.dispatch({type:'run_ready',concurrency:1,workIds:[target.id]});
assert(successor,'the recovered same-work role must actually construct the successor request');
const before=JSON.stringify(originalRequest).length,after=JSON.stringify(successor).length;
assert(after<before/2,'normal role request must actually use the repaired source delivery, not just a standalone projection');
assert.notEqual(successor.contextHash,originalRequest.contextHash);
const exact=successor.promptNodes.find(n=>n.kind==='exact_read_results').results;
assert(!exact.some(r=>r.evidenceNumber===930&&r.pointer==='/receipt/queryReceipt/result'));
assert(exact.some(r=>r.evidenceNumber===930&&r.pointer==='/receipt/queryReceipt/result/optionCount'));
const interrupted=live.state().work.find(w=>w.id===target.id);
assert.equal(interrupted.operationState.deliveredReads?.length??0,0,'no reply means no new model-delivery grants');
assert.equal(interrupted.operationState.calls.length,target.operationState.calls.length);
console.log(JSON.stringify({status:'passed',sameWorkRecovered:true,oldPendingAndUnknownBillPreserved:true,
  authAmbiguousWrongContextNotReflowed:true,beforeRequestCharacters:before,afterRequestCharacters:after,
  actualReadRoleUsesChunks:true,providerFailureDoesNotGrantDelivery:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,modelStrategyAndProviderAcceptanceStillPending:true}));
