// Concrete paid 29a9e36c: valid Native literals were at the envelope level.
// Isolate its first query; later invalid formation selectors are NOT repaired here.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {compileRosterWorkflowExperimentV1,createRosterWorkflowLaboratoryExecutorV1}
  from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const [root,out]=process.argv.slice(2),copy=structuredClone;
const read=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const ref='29a9e36c3979b5a661a9eaa9fd9d5238bd4f3283d2f8ccf45d77da1288418375';
const saved=await read(ref),originalOrder=saved.value.failedWorkOrders[0].order;
const order={...copy(originalOrder),steps:[copy(originalOrder.steps[0])],completionStepId:''};
const original=JSON.stringify(order),raw=JSON.parse(order.steps[0].argumentsJson);
const options={scope:state.scope,namespace:'v900-wire-proof',evidenceDirectory:state.evidence};
const compile=(next=order,extra={})=>compileRosterWorkflowExperimentV1({...options,...extra,order:next});
const checks=[];
try{
  let jobs;
  assert.doesNotThrow(()=>{jobs=compile();},'Known Native fields at the wrong envelope level must not require another model call');
  const request=jobs[0].inputs.request.value,{queryKind,...native}=raw;
  assert.deepEqual(request.args,{queryKind,queryArguments:native});
  assert.deepEqual(request.bindings,[{name:'binding0',pointer:'/stateRef'}]);
  assert.equal(request.argumentProjection.length,Object.keys(native).length);
  for(const item of request.argumentProjection){
    assert.equal(item.rule,'spatial_native_envelope_v1');assert.equal(item.choiceChanged,false);
    assert.deepEqual(item.original,item.value);
    assert.deepEqual(item.value,native[item.from.slice(1)]);
    assert.equal(item.to,'/queryArguments'+item.from);
  }
  assert.equal(JSON.stringify(order),original);assert.equal((await read(ref)).value.failedWorkOrders[0].order.steps[0].argumentsJson,order.steps[0].argumentsJson);
  assert.deepEqual(compile(order,{retainedWork:jobs}),jobs);
  const changed=(args,bindings=order.steps[0].bindings)=>({...copy(order),steps:[{...copy(order.steps[0]),argumentsJson:JSON.stringify(args),bindings:copy(bindings)}]});
  const canonical=changed({queryKind,queryArguments:native}),canonicalJobs=compile(canonical);
  assert.deepEqual(canonicalJobs[0].inputs.request.value.args,request.args);
  assert.deepEqual(canonicalJobs[0].inputs.request.value.bindings,request.bindings);
  assert.equal(canonicalJobs[0].inputs.request.value.argumentProjection,undefined);
  const legacyJobs=copy(jobs);legacyJobs[0].inputs.request.value.args=copy(raw);delete legacyJobs[0].inputs.request.value.argumentProjection;
  assert.deepEqual(compile(order,{retainedWork:legacyJobs}),legacyJobs,'Already compiled old work is retained, not reinterpreted or replayed');
  const corrupted=copy(jobs);corrupted[0].inputs.request.value.args.queryArguments.unitId='different-unit';
  assert.throws(()=>compile(order,{retainedWork:corrupted}),e=>e.code==='ROSTER_WORKFLOW_RETAINED_ORDER_MISMATCH');
  checks.push({name:'actual-query-canonical-exact-and-cold-restore',pass:true});
  for(const args of [
    {...raw,queryArguments:{unitId:'different-unit'}},
    {...raw,queryArguments:{unitId:raw.unitId}},
    {...raw,argumentsJson:JSON.stringify(native)},
    {...raw,arguments:native},
    {...raw,queryArguments:null},
    {...raw,notANativeField:1},
    {queryKind,anchorRegions:native.anchorRegions},
    {queryKind,queryArguments:{...native,stateRef:{}}},
  ])assert.throws(()=>compile(changed(args)),'Ambiguous, incomplete, unknown or misplaced parent fields must not be guessed/dropped');
  for(const pointer of ['/unitId','/anchorRegions/0/minimumXInches','/queryArguments','/queryArguments/unitId','/queryKind','']){
    const bindings=[...order.steps[0].bindings,{...order.steps[0].bindings[0],argumentPointer:pointer}];
    assert.throws(()=>compile(changed(raw,bindings)),e=>e.code==='ROSTER_WORKFLOW_SPATIAL_ENVELOPE_AMBIGUOUS');
  }
  const unrelated=changed(raw);unrelated.steps[0].operation='inspect';
  assert.deepEqual(compile(unrelated)[0].inputs.request.value.args,raw);
  checks.push({name:'no-value-choice-binding-or-parent-guessing',pass:true});
  // Run the actual product executor up to an injected Native boundary. The
  // probe deliberately throws, so it cannot manufacture a geometry success.
  const parent=(await read('afc0a80770d41ca42cf459ab5045a53dbd79bd6ea868fbf065e917f62117ca85')).value.stateRef;
  assert.ok(parent);const memory=new Map();let dispatched=null,checkpoint=null;
  const store={load:async()=>({work:[],events:[],scope:state.scope}),get:async key=>copy(memory.get(key)),
    put:async value=>{const key='probe-'+memory.size;memory.set(key,copy(value));return key;}};
  const laboratory={labDescriptor:()=>({sourceStateHash:parent.sourceStateHash}),
    querySpatial:async args=>{dispatched=copy(args);throw Object.assign(Error('INJECTED_NATIVE_BOUNDARY'),{code:'INJECTED_NATIVE_BOUNDARY'});}};
  const executor=createRosterWorkflowLaboratoryExecutorV1({laboratory,store});
  const assignment={workId:jobs[0].id,scope:state.scope,inputs:{request:{value:request},
    binding0:{value:parent,workId:jobs[0].inputs.binding0.id,resultRef:'afc0a80770d41ca42cf459ab5045a53dbd79bd6ea868fbf065e917f62117ca85'}}};
  const result=await executor.execute(assignment,{operationState:{},checkpointOperation:async value=>{checkpoint=copy(value);}});
  assert.equal(result.value.code,'INJECTED_NATIVE_BOUNDARY',JSON.stringify(result));
  assert.deepEqual(JSON.parse(dispatched.argumentsJson),native);
  assert.deepEqual(dispatched.base,{kind:'branch',branchStateHash:parent.stateHash});
  assert.equal(dispatched.queryKind,queryKind);assert.equal(checkpoint.pending,null);
  assert.equal(result.value.nativeSuccess,false);
  checks.push({name:'product-executor-same-native-payload-and-parent',pass:true,injectedBoundary:true});
  const report={pass:true,checks,actualFailure:ref,isolatedStep:'s1',originalReplyUnchanged:true,
    sourceOperationsReplayed:0,providerCalls:0,nativeCalls:0,productionWrites:0,
    excludes:'Later formation selectors, actual geometry outcome, strategy improvement and whole-workflow acceptance'};
  await fs.writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}catch(error){
  const report={pass:false,checks,error:error.message,stack:error.stack?.split('\n').slice(0,7),actualFailure:ref};
  await fs.writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));process.exitCode=1;
}
