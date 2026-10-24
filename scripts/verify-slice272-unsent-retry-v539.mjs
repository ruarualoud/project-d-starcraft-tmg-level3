// Actual75 DNS never sent; exact retry77 was rejected before egress because
// the explicit retry classifier accepted only ambiguous/selected HTTP failures.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {isExplicitlyRecoverableProviderDispatchV1} from '../packages/secure-provider-runtime/provider-dispatch-recovery-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/p4-from-empty');
const original=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const work=original.work.find(w=>w.failure?.code==='ROSTER_WORKSPACE_RETRY_REQUEST_CHANGED');
assert.ok(work);const dispatch=work.operationState.retryProviderDispatch;
assert.equal(dispatch.status,'definitely_not_sent');
assert.equal(isExplicitlyRecoverableProviderDispatchV1(dispatch),true,'BUG: proven DNS-not-sent rejected as changed request');
assert.equal(isExplicitlyRecoverableProviderDispatchV1({status:'definitely_not_sent'}),false,'status without transport proof is insufficient');
assert.equal(isExplicitlyRecoverableProviderDispatchV1({status:'completed'}),false);
let state=structuredClone(original);const store={load:async()=>structuredClone(state),save:async s=>{state=structuredClone(s);},
  get:async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'))};
const flow=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('no dispatch');}});
const command={type:'retry_provider_dispatch',workId:work.id,dispatch,
  authorizationId:dispatch.retryAuthorizationId,allowUnknownCharge:true,
  reason:'Exact request was rejected before egress; source classifier now accepts proved DNS-not-sent, preserving the same single authorization.'};
await flow.dispatch(command);
const resumed=(await flow.inspect()).work.find(w=>w.id===work.id);
assert.equal(resumed.status,'ready');
assert.deepEqual(resumed.operationState,work.operationState,'no request/counter/auth reset');
assert.equal(resumed.failureHistory.at(-1).preEgressRetryResumed,true);
await assert.rejects(()=>flow.dispatch(command));
assert.deepEqual(JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8')),original);
console.log(JSON.stringify({pass:true,actualUnsentRetryAccepted:true,sameAuthorizationPreserved:true,providerCalls:0,productionWrites:0}));
