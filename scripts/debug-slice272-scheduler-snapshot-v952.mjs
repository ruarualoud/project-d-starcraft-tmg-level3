// Reproduce repeated full-history copies in one real, isolated Run sync.
// Frozen input and artifacts are read-only; no model, Native or production writes.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const [directory,fixture,output]=process.argv.slice(2);
const report={providerCalls:0,nativeCalls:0,productionWrites:0,checks:[]};
const nativeClone=globalThis.structuredClone;
let measuring=false,workCopies=0,workCopyMs=0;
globalThis.structuredClone=(value,...args)=>{
  const isWork=measuring&&Array.isArray(value)&&value.length>100&&value.every(w=>w?.id&&w?.role);
  const start=performance.now(),result=nativeClone(value,...args);
  if(isWork){workCopies++;workCopyMs+=performance.now()-start;}
  return result;
};
try{
  let compressed;
  try{compressed=await fs.readFile(fixture);}catch(e){
    if(e.code!=='ENOENT')throw e;
    compressed=gzipSync(await fs.readFile(directory+'/workflow.json'));
    await fs.writeFile(fixture,compressed,{flag:'wx'});
  }
  const bytes=gunzipSync(compressed),source=JSON.parse(bytes);
  report.inputHash=createHash('sha256').update(bytes).digest('hex');
  report.event=source.events.at(-1)?.sequence;report.workCount=source.work.length;
  report.workBytes=Buffer.byteLength(JSON.stringify(source.work));
  const memory=new Map(),cache=new Map();let state=nativeClone(source);
  const store={load:async()=>nativeClone(state),save:async value=>{state=nativeClone(value);},
    put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,nativeClone(value));return ref;},
    get:async ref=>{
      if(memory.has(ref))return nativeClone(memory.get(ref));
      if(!cache.has(ref))cache.set(ref,JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8')));
      return nativeClone(cache.get(ref));
    }};
  const laboratory={labDescriptor:()=>({schema:'starcraft_tmg_pregame_scene_laboratory_descriptor_v1',
    // No recorded branch belongs to this diagnostic lab; do not rehydrate
    // Native state just to measure the scheduler's read-only observation seam.
    laboratoryId:'v952-no-native',sourceStateHash:'0'.repeat(64),rulesRuntimeHash:state.scope.rules}),
    describeQueryContext(){report.nativeCalls++;throw Error('NO_NATIVE_EXECUTION');}};
  const run=await createRosterDecisionWorkspaceRunV1({workflowStore:store,laboratory,scope:state.scope,
    sessionId:'v952-snapshot-only',deliberation:{deliberate:async()=>{report.providerCalls++;throw Error('NO_PROVIDER');}}});
  const before=await run.inspect();
  measuring=true;const start=performance.now();
  await run.summarizeExperiment({id:'v952:unexecuted-sync-probe',question:'No execution; synchronization only',toolWorkIds:[]});
  report.syncMs=performance.now()-start;measuring=false;
  report.workCopies=workCopies;report.workCopyMs=workCopyMs;
  const after=await run.inspect();
  assert.equal(after.draftRef,before.draftRef);assert.equal(after.draftRevision,before.draftRevision);
  assert.deepEqual(after.scope,before.scope);
  assert.equal(report.providerCalls,0);assert.equal(report.nativeCalls,0);
  assert.ok(after.work.some(w=>w.id==='v952:unexecuted-sync-probe'));
  report.checks.push('actual_Run_sync_preserves_draft_scope_and_does_not_execute_roles_or_tools');
  assert.ok(workCopies<=2,`Unchanged scheduler view cloned full ${report.workBytes}-byte work graph ${workCopies} times`);
  report.checks.push('one_sync_does_not_reclone_unchanged_history_per_reader');
  const core=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('NO_EXECUTION');}});
  const first=await core.inspectReadOnly(),again=await core.inspectReadOnly();
  assert.equal(first,again);assert.ok(Object.isFrozen(first.work[0].inputs));
  assert.throws(()=>{first.work[0].status='corrupted';},TypeError);
  const mutable=await core.inspect();mutable.work[0].status='caller-only';
  assert.notEqual((await core.inspectReadOnly()).work[0].status,'caller-only');
  const originalStatus=first.work[0].status;
  await core.dispatch({type:'enqueue',work:[{id:'v952:new',role:'roster_workflow_fact_summary',bindings:state.scope,
    inputs:{question:{source:'literal',value:'Not executed'}}}]});
  const next=await core.inspectReadOnly();assert.notEqual(first,next);
  assert.equal(first.work[0].status,originalStatus);assert.ok(!first.work.some(w=>w.id==='v952:new'));
  assert.ok(next.work.some(w=>w.id==='v952:new'));
  assert.deepEqual(await core.inspect(),next);
  report.checks.push('read_only_views_are_immutable_isolated_and_invalidated_after_dispatch');
  report.pass=true;
}catch(error){report.pass=false;report.error=error.message;report.stack=error.stack?.split('\n').slice(0,6);process.exitCode=1;}
finally{globalThis.structuredClone=nativeClone;}
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
