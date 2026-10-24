// Replay a request for an ALREADY SAVED real combat observation through the
// product executor. The underlying port is a spy, not another Native run.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {projectRosterExperimentBatchProgressV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
const root=path.resolve(process.argv[2]);
const original=await fs.readFile(path.join(root,'workflow.json'),'utf8'),state=JSON.parse(original);
const refs=['beb63d2728d824bc9addede29e924b0555725ab6a3ba4d146ed46060fb08fd55',
  '33caf499d673490d42dc945124f305b8cf9718e8698e2022e8e81978d180e3f9'];
const failures=[],evidence=[];
for(const ref of refs){
  const saved=JSON.parse(await fs.readFile(path.join(root,'artifacts',ref+'.json'),'utf8'));
  const prior=state.work.find(work=>work.resultRef===ref);
  assert(prior);assert.equal(saved.value.receipt.resultStatus,'ok');
  async function execute({change={},version=saved.value.receipt.laboratoryVersion,unknown=false}={}){
    const artifacts=new Map([[ref,structuredClone(saved)]]);
    if(unknown){artifacts.get(ref).value.status='returned_to_model';artifacts.get(ref).value.receipt.resultStatus='unknown';}
    const snapshot={scope:state.scope,evidence:[],work:[structuredClone(prior)]};
    let nativeCalls=0;
    const spy=async()=>{nativeCalls++;return {resultStatus:'ok',fixtureOnly:true};};
    const store={load:async()=>snapshot,get:async key=>artifacts.get(key),
      put:async value=>{const key='memory:'+artifacts.size;artifacts.set(key,structuredClone(value));return key;}};
    const {queryId,...args}=saved.value.request;
    const executor=createRosterWorkflowLaboratoryExecutorV1({
      laboratory:{labDescriptor:()=>({sourceStateHash:saved.value.receipt.sourceStateHash,
        rulesRuntimeHash:saved.value.receipt.rulesRuntimeHash,builderBundleHash:saved.value.receipt.builderBundleHash,
        version}),queryProbability:spy,queryThreatExchange:spy},store});
    const result=await executor.execute({workId:'v739:repeat',scope:prior.bindings,inputs:{
      request:{value:{operation:saved.value.operation,args:{...args,...change},bindings:[],guards:[],resultGuards:[],
        experimentScope:prior.inputs.request.value.experimentScope}}}},
      {operationState:{},checkpointOperation:async()=>{}});
    return {result,nativeCalls,store,snapshot,artifacts};
  }
  try{
    const repeated=await execute();
    assert.equal(repeated.nativeCalls,0,'exact saved read must not run Native again');
    assert.deepEqual(repeated.result.value.receipt,saved.value.receipt);
    assert.equal(repeated.result.value.executed,false);
    assert.equal(repeated.result.value.queryReuse.newObservation,false);
    assert.equal(repeated.result.value.queryReuse.originalResultRef,ref);
    const repeatedRef=await repeated.store.put(repeated.result);
    repeated.snapshot.work.push({id:'v739:repeat',role:'roster_workflow_tool',resultRef:repeatedRef});
    repeated.snapshot.work.push({id:'v739:summary',inputs:{observation:{source:'work',id:'v739:repeat'}}});
    const progress=await projectRosterExperimentBatchProgressV1({state:repeated.snapshot,summaryIds:['v739:summary'],store:repeated.store});
    assert.equal(progress.noNewObservation,true,'existing progress router must see reuse, not fictitious new evidence');
    assert.equal((await execute({change:{sampleBudget:97}})).nativeCalls,1,'a changed estimator request is not a cache hit');
    assert.equal((await execute({version:'different-calculator-version'})).nativeCalls,1,'changed implementation is not old evidence');
    assert.equal((await execute({unknown:true})).nativeCalls,1,'unresolved facts must not become a successful cached answer');
    evidence.push({operation:saved.value.operation,originalResultRef:ref,exactReceiptPreserved:true,
      repeatedNativeCalls:0,progressReturn:'no_new_observation'});
  }catch(error){failures.push({operation:saved.value.operation,error:error.code??error.message});}
}
assert.equal(await fs.readFile(path.join(root,'workflow.json'),'utf8'),original);
console.log(JSON.stringify({passed:failures.length===0,failures,evidence,providerCalls:0,realNativeCalls:0,productionWrites:0}));
if(failures.length)process.exitCode=1;
