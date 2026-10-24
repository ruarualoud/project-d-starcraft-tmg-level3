// The new workflow stopped on actual transport failures although the secure
// Provider already supports one recorded exact-request retry. No network here.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterWorkflowProviderBoundaryV1} from '../packages/roster-planning-workspace/roster-workflow-provider-boundary-v1.mjs';
const run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/p4-from-empty');
const original=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const events=(await fs.readFile(path.join(run,'provider-events.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
const failures=original.work.filter(w=>w.status==='needs_repair'&&w.operationState?.pending);
assert.equal(failures.length,2,'actual two transport stops');
let state=structuredClone(original);const memory=new Map();
const store={load:async()=>structuredClone(state),save:async s=>{state=structuredClone(s);},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8')),
  put:async value=>{const ref=hash(value);memory.set(ref,structuredClone(value));return ref;}};
const flow=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('not dispatched by recovery');}});
for(const work of failures){
  const dispatch=events.findLast(e=>e.type==='provider_dispatch'&&e.dispatch.contextHash===work.operationState.pending.contextHash)?.dispatch;
  assert.ok(dispatch);
  const before=structuredClone(work.operationState);
  const command={type:'retry_provider_dispatch',workId:work.id,dispatch,authorizationId:'actual-user-standing-network-resume',allowUnknownCharge:true,reason:'Known recorded transport failure; one controlled exact-request recovery'};
  await flow.dispatch(command);
  const resumed=(await flow.inspect()).work.find(w=>w.id===work.id);
  assert.equal(resumed.status,'ready');
  assert.deepEqual(resumed.operationState.pending,before.pending);
  assert.deepEqual(resumed.operationState.calls,before.calls);
  assert.deepEqual(resumed.operationState.reads,before.reads);
  assert.equal(resumed.operationState.consecutiveCorrections,before.consecutiveCorrections);
  assert.equal(resumed.operationState.retryProviderDispatch.retryOfRequestId,dispatch.retryOfRequestId);
  assert.equal(resumed.failureHistory.at(-1).dispatch.costStatus,dispatch.costStatus);
  await assert.rejects(()=>flow.dispatch(command),'same authorization cannot be consumed twice');
  const request=await store.get(before.pending.requestRef);let exactCalls=0;
  const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:request.sessionId,
    deliberation:{deliberate:async()=>{throw Error('not a fresh request');},retry:async(r,d)=>{
      assert.deepEqual(r,request);assert.equal(d.requestId,dispatch.requestId);exactCalls++;throw Error('captured exact retry');}}});
  await assert.rejects(()=>execute({role:work.role,workId:work.id,evidenceDirectory:[],inputs:{}},
    {operationState:resumed.operationState,checkpointOperation:async()=>{}}),/captured exact retry/);
  assert.equal(exactCalls,1);
}
// Secure adapter receives the exact dispatch rather than a generic regenerated call.
const made=[];const factory={createForRun:async options=>{made.push(options);return {deliberate:async r=>({contextHash:r.contextHash})};}};
const boundary=await createRosterWorkflowProviderBoundaryV1({factory,sessionId:'test',runKind:'teach-framework',planHash:'unplanned',
  networkRecoveryPolicy:{retryDefinitelyNotSent:true,ambiguousAuthorizationId:'standing'}});
const retry={requestId:'original',contextHash:'ctx',explicitSingleRetry:true,retryAuthorizationId:'approved'};
assert.deepEqual(await boundary.retry({contextHash:'ctx'},retry),{contextHash:'ctx'});
assert.equal(made[1].retryDispatch,retry);
const recover=made[0].recoverNetworkDispatch;
assert.equal(await recover({status:'ambiguous',transportFailure:{status:401}}),null);
assert.equal(await recover({status:'ambiguous',retryOfRequestId:'previous',transportFailure:{status:null}}),null);
assert.equal((await recover({requestId:'dns',status:'definitely_not_sent',transportFailure:{requestDefinitelyNotSent:true}})).requestId,'dns');
assert.equal((await recover({requestId:'timeout',status:'ambiguous',transportFailure:{status:null}})).retryAuthorizationId,'standing');
assert.deepEqual(JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8')),original);
console.log(JSON.stringify({pass:true,actualFailedRequests:2,exactPendingPreserved:true,semanticCountersUnchanged:true,unknownFeesPreserved:true,providerCalls:0,productionWrites:0}));
