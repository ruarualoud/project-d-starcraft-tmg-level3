// Concrete fresh fixed journey stopped with one ambiguous and two proved
// not-sent requests. Verify normal HTTP recovery, not a new generation engine.
import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createRosterPlanningWorkspaceHttpAdapterV1,
  ROSTER_PLANNING_WORKSPACE_API_PREFIX as prefix} from '../packages/roster-planning-workspace/roster-planning-workspace-http-v1.mjs';
import {createRosterDecisionProductJourneyV1} from '../packages/roster-planning-workspace/roster-decision-product-journey-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const id='decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34';
const workspace=path.join(root,'build/slice272-product-generation-v645-I7zekC/workspace');
const source=path.join(workspace,'decision-product-journeys',id);
const base=path.join(workspace,'decision-workflows',id);
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const originalBytes=await fs.readFile(path.join(source,'journey.json'));
const state=await read(path.join(base,'workflow.json'));
const draft=await read(path.join(base,'artifacts',state.draftRef+'.json'));
const failed=state.work.filter(w=>w.status==='needs_repair'&&w.operationState?.pending);
assert.equal(failed.length,3);
const contexts=new Set(failed.map(w=>w.operationState.pending.contextHash));
const events=(await fs.readFile(path.join(source,'trace.jsonl'),'utf8')).split('\n').filter(Boolean).map(JSON.parse)
  .filter(e=>e.kind==='provider_event'&&e.value?.type==='provider_dispatch'&&contexts.has(e.value.dispatch.contextHash));
const temporary=await fs.mkdtemp(path.join(root,'build/slice272-provider-recovery-v647-'));
await fs.mkdir(path.join(temporary,id));
await fs.writeFile(path.join(temporary,id,'journey.json'),originalBytes);
await fs.writeFile(path.join(temporary,id,'trace.jsonl'),events.map(JSON.stringify).join('\n')+'\n');
const calls=[];
const fakeRun={inspect:async()=>structuredClone(state),currentDraft:async()=>structuredClone(draft),
  retryProviderDispatch:async input=>{calls.push(structuredClone(input));const work=state.work.find(w=>w.id===input.workId);
    work.status='ready';work.operationState.retryProviderDispatch={dispatch:input.dispatch};}};
const journey=await createRosterDecisionProductJourneyV1({directory:temporary,
  openWorkflow:async()=>fakeRun,prepareSeed:async()=>{throw Error('NEW_GENERATION_FORBIDDEN');},liveAvailable:()=>false});
const adapter=createRosterPlanningWorkspaceHttpAdapterV1({service:{descriptor:()=>({}),startPlanning:async()=>{}},decisionJourney:journey});
const policy={allowUnknownCharge:true,authorizationId:'standing-user-single-controlled-recovery'};
const result=await adapter.handle({method:'POST',pathname:prefix+'/workflows/'+id+'/recover-provider',body:policy});
console.log(JSON.stringify({httpStatus:result.status,recoveryCalls:calls.length,temporary,providerCalls:0,productionWrites:0}));
assert.equal(result.status,202,'normal product HTTP cannot recover its saved provider boundary');
assert.equal(calls.length,3);
assert.equal(calls.filter(c=>c.allowUnknownCharge).length,1);
assert(calls.every(c=>contexts.has(c.dispatch.contextHash)),'no other completed request may be replayed');
assert.equal(calls.filter(c=>c.dispatch.status==='definitely_not_sent').length,2);
const again=await adapter.handle({method:'POST',pathname:prefix+'/workflows/'+id+'/recover-provider',body:policy});
assert(again.status>=400,'already queued exact recovery cannot be duplicated');
assert.equal(calls.length,3);
assert((await fs.readFile(path.join(source,'journey.json'))).equals(originalBytes));
console.log(JSON.stringify({status:'passed',exactPendingRequests:3,unknownChargeAuthorizations:1,
  notSentRecoveries:2,duplicateRecoveryRejected:true,oldMetadataUnchanged:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,
  existingCoreRetryPortStubbed:true,actualProviderRecoveryStillPending:true}));
