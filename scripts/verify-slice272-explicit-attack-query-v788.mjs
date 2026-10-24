// Real e5383: a model declared melee but omitted domainId and flattened Native
// fight parameters. The permissive query silently took the legacy ranged path.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {compileRosterWorkflowExperimentV1,createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const root=process.argv[2],get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const bad=(await get('1b26b7291825a947c8c00930584f3d7211672533e5013bc63088cfea019be3e9')).value.workOrders[0];
const good=(await get('89d683fc725ba11363c33d83233ffb95908d1d80b72857c11d32b44037c0ddac')).value.workOrders[0];
const badArgs=JSON.parse(bad.steps[0].argumentsJson),goodArgs=JSON.parse(good.steps[0].argumentsJson);
const saved=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const purposeEntry=saved.evidence[569],purpose=(await get(purposeEntry.artifactRef)).proposals[0].comparisonPurpose;
const compile=(order,namespace)=>compileRosterWorkflowExperimentV1({order,scope:saved.scope,namespace,
  evidenceDirectory:saved.evidence,...(order.experimentScope.comparisonBinding?{comparisonPurpose:{status:'read',
    evidenceId:purposeEntry.id,evidenceNumber:570,value:purpose}}:{})});
const failures=[];async function check(name,fn){try{await fn();console.log('PASS '+name);}catch(e){failures.push({name,error:e.message});console.log('FAIL '+name+': '+e.message);}}
await check('compile rejects actual missing domain and wrong nesting together',()=>{
  assert.throws(()=>compile(bad,'v788:bad'),error=>{
    assert.equal(error.code,'PREGAME_LAB_PROBABILITY_INPUT_INVALID');
    assert.deepEqual(error.detail.missingArguments,['domainId']);
    assert.deepEqual(error.detail.unsupportedArguments,['closeRanksMode','allocations','surgeTargetUnitId']);return true;
  });
});
const memory=new Map();let queryCalls=0,lastQuery;
const store={load:async()=>({scope:{source:badArgs.stateRef.sourceStateHash},work:[],evidence:[]}),
  get:async ref=>structuredClone(memory.get(ref)),put:async value=>{const ref='test:'+memory.size;memory.set(ref,structuredClone(value));return ref;}};
const executor=createRosterWorkflowLaboratoryExecutorV1({store,laboratory:{labDescriptor:()=>({sourceStateHash:badArgs.stateRef.sourceStateHash}),
  queryProbability:async args=>{queryCalls++;lastQuery=structuredClone(args);return {resultStatus:'ok',fixtureOnly:true};}}});
const execute=args=>executor.execute({workId:'v788',scope:{source:badArgs.stateRef.sourceStateHash},
  inputs:{request:{value:{operation:'probability',args,bindings:[],guards:[]}}}},
  {operationState:{},checkpointOperation:async()=>{}});
await check('retained work crosses same strict validation before source dispatch',async()=>{
  queryCalls=0;const result=await execute(badArgs);
  assert.equal(result.value.code,'PREGAME_LAB_PROBABILITY_INPUT_INVALID');
  assert.deepEqual(result.value.detail.missingArguments,['domainId']);
  assert.deepEqual(result.value.detail.unsupportedArguments,['closeRanksMode','allocations','surgeTargetUnitId']);
  assert.equal(result.value.queryRepair.correctable,true);assert.equal(queryCalls,0);
});
await check('current discovery requires an explicit inspected domain',()=>{
  const descriptor=executor.descriptor().operations.find(o=>o.operation==='probability');
  assert.ok(descriptor.requiredArguments.includes('domainId'));assert.doesNotMatch(descriptor.argumentsShape.domainId,/omission is legacy/);
});
if(!process.argv.includes('--remaining-only'))await check('actual successful explicit query stays unmodified',async()=>{
  compile(good,'v788:good');
  queryCalls=0;const result=await execute(goodArgs);
  assert.equal(result.value.status,'completed');assert.equal(queryCalls,1);
  assert.equal(lastQuery.domainId,goodArgs.domainId);assert.deepEqual(lastQuery.parameters,goodArgs.parameters);
});
console.log(JSON.stringify({failures,providerCalls:0,realNativeCalls:0,productionWrites:0}));assert.equal(failures.length,0);
