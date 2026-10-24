// Concrete P2 regression: a local Plan edit published every block with a full
// 45MB work-graph checkpoint. Use the same frozen real graph, no live writes.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {publishRosterWorkflowPlanBlocksV1} from '../packages/roster-strategist/roster-workflow-plan-blocks-v1.mjs';
const [directory,fixture,output,baselineFile]=process.argv.slice(2);
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const report={providerCalls:0,nativeCalls:0,productionWrites:0,checks:[]};
const originalClone=globalThis.structuredClone;
let measuring=false,checkpointCopies=0,copyMs=0;
globalThis.structuredClone=(value,...args)=>{
  const tracked=measuring&&value?.schema==='roster_decision_workflow_v1'&&Array.isArray(value.work);
  const start=performance.now(),result=originalClone(value,...args);
  if(tracked){checkpointCopies++;copyMs+=performance.now()-start;}
  return result;
};
const neverExecute=async()=>{throw Error('NO_PROVIDER_OR_NATIVE_EXECUTION');};
try{
  let saved=JSON.parse(gunzipSync(await fs.readFile(fixture))),saveCount=0,serializeMs=0,serializedBytes=0;
  report.fixtureHash=hash(saved);report.sourceEvent=saved.events.at(-1).sequence;
  const memory=new Map(),cache=new Map();
  const store={load:async()=>originalClone(saved),save:async value=>{
    const start=performance.now(),text=JSON.stringify(value);
    if(measuring){saveCount++;serializeMs+=performance.now()-start;serializedBytes+=Buffer.byteLength(text);}
    saved=value;
  },put:async value=>{const ref=hash(value);memory.set(ref,originalClone(value));return ref;},
  get:async ref=>{
    if(memory.has(ref))return originalClone(memory.get(ref));
    if(!cache.has(ref))cache.set(ref,JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8')));
    return originalClone(cache.get(ref));
  }};
  const core=await createRosterDecisionWorkflowV1({store,execute:neverExecute});
  const draft=await store.get('35c18da1f3f25dce0b8e4587a31e4397f7ed778ec54868ad1c11be71b5fc96e4');
  // A separate publication namespace on the real stopped r19 graph. The r21
  // Plan is data under test, not a real commit or an upgraded source authority.
  const input={plan:draft.plan,bindings:saved.scope,prefix:'v955:isolated:r21:plan'};
  const before=await core.inspect();measuring=true;const start=performance.now();
  const split=await publishRosterWorkflowPlanBlocksV1(core,input);
  report.publishMs=performance.now()-start;measuring=false;
  const after=await core.inspect();
  Object.assign(report,{blocks:split.blocks.length+1,saveCount,checkpointCopies,copyMs,serializeMs,serializedBytes,
    finalStateHash:hash(after),splitHash:hash(split)});
  assert.equal(after.draftRef,before.draftRef);assert.deepEqual(after.scope,before.scope);
  assert.equal(after.evidence.length-before.evidence.length,split.blocks.length+1);
  assert.equal(after.events.length-before.events.length,split.blocks.length+1);
  for(const block of split.blocks)assert.deepEqual(await store.get(after.evidence.find(e=>e.id===block.id).artifactRef),block.value);
  assert.deepEqual(after.work,before.work);assert.deepEqual(after.reads,before.reads);
  report.checks.push('all_actual_Plan_blocks_events_work_and_sources_preserved');
  if(baselineFile){
    const baseline=JSON.parse(await fs.readFile(baselineFile,'utf8'));
    assert.equal(report.fixtureHash,baseline.fixtureHash);assert.equal(report.splitHash,baseline.splitHash);
    assert.equal(report.finalStateHash,baseline.finalStateHash,'Batch final observation must equal the pre-fix single-publication result');
    report.baselineMs=baseline.publishMs;report.reduction=1-report.publishMs/baseline.publishMs;
    report.checks.push('complete_final_observation_identical_to_pre_fix_baseline');
  }
  assert.equal(saveCount,1,`Plan publication rewrote the full graph ${saveCount} times`);
  assert.equal(checkpointCopies,1);report.checks.push('one_full_graph_checkpoint_for_complete_Plan');

  // New batch failure semantics at the same real dispatcher, no live store.
  let smallSaved=null,smallSaves=0,putFailure=null,saveFailure=false;
  const smallMemory=new Map();
  const smallStore={load:async()=>originalClone(smallSaved),save:async value=>{
    smallSaves++;if(saveFailure)throw Object.assign(Error('injected disk full'),{code:'ENOSPC'});
    smallSaved=originalClone(value);
  },put:async value=>{if(value?.failPut===putFailure&&putFailure)throw Error('injected artifact write');
    const ref=hash(value);smallMemory.set(ref,originalClone(value));return ref;},get:async ref=>originalClone(smallMemory.get(ref))};
  const small=await createRosterDecisionWorkflowV1({store:smallStore,execute:neverExecute});
  await small.dispatch({type:'initialize',scope:before.scope});
  const entry=(id,value)=>({id,title:id,kind:'proposal',bindings:before.scope,conditions:['isolated'],value});
  const batch=entries=>({type:'publish_evidence_batch',entries});
  await small.dispatch(batch([entry('a',{v:1}),entry('b',{v:2})]));
  const settled=await small.inspect(),settledSaves=smallSaves;
  await small.dispatch(batch([entry('a',{v:1}),entry('b',{v:2})]));
  assert.deepEqual(await small.inspect(),settled);assert.equal(smallSaves,settledSaves);
  for(const entries of [
    [entry('new',{v:3}),entry('a',{v:99})],
    [entry('new',{v:3}),entry('new',{v:4})],
    [entry('new',{v:3}),{...entry('bad',{v:4}),bindings:{army:'wrong'}}],
    [entry('new',{v:3}),{...entry('bad',{v:4}),kind:'invalid'}],
  ]){await assert.rejects(small.dispatch(batch(entries)));assert.deepEqual(await small.inspect(),settled);assert.equal(smallSaves,settledSaves);}
  putFailure='artifact';await assert.rejects(small.dispatch(batch([entry('new',{v:3}),entry('bad',{failPut:'artifact'})])));
  assert.deepEqual(await small.inspect(),settled);assert.equal(smallSaves,settledSaves);putFailure=null;
  report.checks.push('idempotent_republish_and_validation_artifact_failures_leave_registry_unchanged');
  const priorDisk=originalClone(smallSaved);saveFailure=true;
  await assert.rejects(small.dispatch(batch([entry('new',{v:3}),entry('next',{v:4})])));
  assert.deepEqual(smallSaved,priorDisk);assert.deepEqual(await small.inspect(),settled);
  saveFailure=false;
  const resumed=await createRosterDecisionWorkflowV1({store:smallStore,execute:neverExecute});
  await resumed.dispatch(batch([entry('new',{v:3}),entry('next',{v:4})]));
  assert.deepEqual((await resumed.inspect()).evidence.map(e=>e.id),['a','b','new','next']);
  report.checks.push('failed_checkpoint_has_no_partial_live_or_durable_batch_and_cold_resume_completes');
  report.pass=true;
}catch(error){report.pass=false;report.error=error.message;report.stack=error.stack?.split('\n').slice(0,6);process.exitCode=1;}
finally{globalThis.structuredClone=originalClone;}
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
