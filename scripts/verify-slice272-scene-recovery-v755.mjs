// The actual exhausted query has a deterministic repaired source binding.
// Retry this read-only query once in the product state machine, not a paid
// model rewrite, counter reset, hand-edited checkpoint or action replay.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const root=path.resolve(process.argv[2]),bytes=await fs.readFile(path.join(root,'workflow.json'),'utf8');
const original=JSON.parse(bytes),memory=new Map();
const get=async ref=>memory.get(ref)??JSON.parse(await fs.readFile(path.join(root,'artifacts',ref+'.json'),'utf8'));
const fault=original.work.find(w=>w.resultRef==='dfa59fec1c7a4a35fbedc57989d420777555a2d3a19a40c7be0db2d968c8a832');
assert.equal(fault.repairGeneration,4);
async function flow(snapshot){
  let saved=structuredClone(snapshot);
  return createRosterDecisionWorkflowV1({store:{load:async()=>structuredClone(saved),get,
    put:async value=>{const key=hash(value);memory.set(key,structuredClone(value));return key;},
    save:async value=>{saved=structuredClone(value);}},
    execute:async()=>{throw Error('RECONCILIATION_MUST_NOT_EXECUTE');}});
}
const workflow=await flow(original);
const resumed=await workflow.dispatch({type:'reconcile_delegated_scene_identity'});
assert.deepEqual(resumed.resumed,[fault.id],'only the actual missing-qualifier read is eligible');
const current=(await workflow.inspect()).work.find(w=>w.id===fault.id);
assert.equal(current.status,'ready');
assert.equal(current.repairGeneration,4);
assert.equal(current.attempt,fault.attempt);
assert.equal(current.resultRef,fault.resultRef);
assert.deepEqual(current.inputs,fault.inputs);
assert.deepEqual(current.operationState,fault.operationState);
assert.equal(current.failureHistory.at(-1).originalResultRef,fault.resultRef);
assert.equal(current.failureHistory.at(-1).change,'delegated_scene_identity_v1');
assert.deepEqual((await workflow.dispatch({type:'reconcile_delegated_scene_identity'})).resumed,[]);
const cold=await flow(await workflow.inspect());
assert.deepEqual((await cold.dispatch({type:'reconcile_delegated_scene_identity'})).resumed,[]);
for(const kind of ['pending','completed','action','explicit_root','already_attempted','stale']){
  const state=structuredClone(original),work=state.work.find(w=>w.id===fault.id);
  if(kind==='pending')work.operationState.pending={requestRef:'unknown-outcome'};
  if(kind==='completed')work.operationState.completedRef='completed';
  if(kind==='action')work.inputs.request.value.operation='native_action';
  if(kind==='explicit_root')work.inputs.request.value.args.contextRef=null;
  if(kind==='already_attempted')work.failureHistory=[{change:'delegated_scene_identity_v1'}];
  if(kind==='stale')work.bindings.source='f'.repeat(64);
  const guarded=await flow(state);
  assert.deepEqual((await guarded.dispatch({type:'reconcile_delegated_scene_identity'})).resumed,[],kind);
}
assert.equal(await fs.readFile(path.join(root,'workflow.json'),'utf8'),bytes);
console.log(JSON.stringify({pass:true,originalQueryResumableWithoutModel:true,historyAndCountersPreserved:true,
  coldResumeIdempotent:true,sideEffectsAndAmbiguityNotReplayed:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
