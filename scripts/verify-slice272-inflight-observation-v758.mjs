// Concrete production fault: events3822/3823 dispatched the identical frozen
// threat query before either result was saved (3824/3825). Only the Native port
// is a controlled asynchronous spy; the shared product executor is real.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const root=path.resolve(process.argv[2]);
const original=await fs.readFile(path.join(root,'workflow.json'),'utf8'),state=JSON.parse(original);
const refs=['77101005e32512b02ad456b7c22c08f7d480d8b5a293922978e587ae1a3b1558',
  '6925e9a9aaec55bce1e83cc76365e0f312d7b3e0224f7fa01f1a22ed80e0f184'];
const saved=await Promise.all(refs.map(ref=>fs.readFile(path.join(root,'artifacts',ref+'.json'),'utf8').then(JSON.parse)));
const withoutId=({queryId,...args})=>args;
assert.deepEqual(withoutId(saved[0].value.request),withoutId(saved[1].value.request));
const prior=state.work.find(work=>work.resultRef===refs[0]);
async function run({secondChange={},secondScope={},unknown=false,guard=false,operation='threat_exchange'}={}){
  const artifacts=new Map(),checkpoints=new Map();
  let calls=0,released=false,release;
  const barrier=new Promise(resolve=>{release=()=>{released=true;resolve();};});
  const store={load:async()=>({scope:prior.bindings,work:[],evidence:[]}),
    get:async ref=>structuredClone(artifacts.get(ref)),
    put:async value=>{const ref=`memory:${artifacts.size}`;artifacts.set(ref,structuredClone(value));return ref;}};
  const native=async args=>{
    calls++;await barrier;
    return {...structuredClone(saved[0].value.receipt),queryId:args.queryId,
      resultStatus:unknown?'unknown':'ok'};
  };
  // Isolated fixture: this laboratory IS the real query's selected candidate
  // source, so it is the fixture root. No production context is changed.
  const executor=createRosterWorkflowLaboratoryExecutorV1({store,laboratory:{
    labDescriptor:()=>({sourceStateHash:saved[0].value.receipt.sourceStateHash,
      rulesRuntimeHash:saved[0].value.receipt.rulesRuntimeHash,
      builderBundleHash:saved[0].value.receipt.builderBundleHash,
      version:saved[0].value.receipt.laboratoryVersion}),
    queryThreatExchange:native,queryProbability:native,querySpatial:native,
    describeQueryContext:native}});
  const request=(index)=>executor.execute({workId:`v758:${index}`,scope:{...prior.bindings,...(index?secondScope:{})},
    inputs:{request:{value:{operation,
      args:{...withoutId(saved[index].value.request),...(index?secondChange:{})},
      bindings:[],guards:[],resultGuards:index&&guard
        ?[{pointer:'/value/receipt/resultStatus',expected:'NOT_OK'}]:[]}}}},
    {operationState:{},checkpointOperation:async value=>{checkpoints.set(index,structuredClone(value));}});
  const first=request(0),second=request(1);
  // Both execution paths reach their async Native/cache boundary before release.
  await new Promise(resolve=>setImmediate(resolve));
  assert(calls>=1);release();
  const results=await Promise.all([first,second]);
  assert(released);
  return {calls,results,checkpoints,artifacts};
}
if(!process.argv.includes('--persistence-only')){
const main=await run();
assert.equal(main.calls,1,'same in-flight frozen query must execute Native once, not once per work ID');
const peer=main.results.find(result=>result.value.queryReuse),owner=main.results.find(result=>!result.value.queryReuse);
assert(owner&&peer);
assert.equal(peer.value.queryReuse.newObservation,false);
assert.equal(peer.value.executed,false);
assert.deepEqual(peer.value.receipt,owner.value.receipt);
assert.equal(main.artifacts.get(peer.value.queryReuse.originalResultRef).value.receipt.queryId,owner.value.receipt.queryId);
assert.equal(main.checkpoints.size,2,'each caller retains its own durable completion');
assert.equal((await run({secondChange:{sampleBudget:97}})).calls,2,'different actual parameters are not shared');
assert.equal((await run({secondScope:{army:'another-authoritative-army'}})).calls,2,'different bindings are not shared');
const guarded=await run({guard:true});
assert.equal(guarded.calls,1);
assert.equal(guarded.results[1].value.reason,'postcondition_mismatch','follower guards must still execute');
const unresolved=await run({unknown:true});
assert(unresolved.results.every(result=>result.continuation&&result.value.status==='returned_to_model'));
assert(unresolved.results.every(result=>!result.value.queryReuse),'unknown is not a reusable answer');
assert.equal((await run({operation:'inspect'})).calls,2,'discovery remains current, not shared by this policy');
console.log(JSON.stringify({passed:true,productionDispatchEvents:[3822,3823],productionResultEvents:[3824,3825],
  exactConcurrentNativeCalls:main.calls,independentRequestsAndGuardsPreserved:true,
  changedInputsRemainIndependent:true,unknownIsNotAnswer:true,providerCalls:0,realNativeCalls:0,productionWrites:0}));
}
// workflow.json belongs to the concurrently running product and may advance.
// This test's store is memory-only; check its input and the immutable originals,
// not that another legitimate writer has stopped.
assert.deepEqual(state,JSON.parse(original));
for(const [index,ref] of refs.entries())
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(root,'artifacts',ref+'.json'),'utf8')),saved[index]);
console.log(JSON.stringify({persistencePassed:true,immutableOriginalsUnchanged:refs.length,
  memoryInputUnchanged:true,functionalAssertionsSkipped:process.argv.includes('--persistence-only'),
  providerCalls:0,realNativeCalls:0,productionWrites:0}));
