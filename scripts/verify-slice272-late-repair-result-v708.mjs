// Actual fixed workflow stopped when a second successful repair arrived after
// another repair had already resolved the same logical query in that tick.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34');
const saved=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const target='product:strategy-hypothesis:v1:3621f50797e05ed31755:purpose:v1:study:order0:supply-exchange';
const lateId=target+':input-repair:order-repair0:order0:repair-choice:order0:repair-choice:order0:supply-exchange';
const prior=saved.work.find(w=>w.id===target),late=saved.work.find(w=>w.id===lateId);
assert.equal(prior.status,'evidence_ready');assert.equal(late.status,'evidence_ready');
assert.equal(late.repairFor,target);assert.notEqual(prior.resolvedByWorkId,lateId);
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const originalResolution=await read(prior.resultRef);
assert.equal(originalResolution.resolution.replacementWorkId,prior.resolvedByWorkId);
async function open(state){
  let current=structuredClone(state),sequence=0;const memory=new Map();
  return createRosterDecisionWorkflowV1({store:{load:async()=>current,save:async value=>{current=value;},
    get:async ref=>memory.has(ref)?memory.get(ref):read(ref),
    put:async value=>{const ref='fixture-'+(++sequence);memory.set(ref,structuredClone(value));return ref;}},
    execute:async()=>{throw Error('no execution authorized in this regression');}});
}
const workflow=await open(saved);
const result=await workflow.dispatch({type:'resolve_with_work',workId:target,replacementWorkId:lateId});
assert.equal(result.alreadyResolved,true);assert.equal(result.resolutionChanged,false);
assert.equal(result.resolvedByWorkId,prior.resolvedByWorkId);
assert.equal(result.lateReplacementWorkId,lateId);
const after=await workflow.inspect();
assert.equal(after.work.find(w=>w.id===target).resultRef,prior.resultRef,'first accepted binding is not overwritten');
assert.equal(after.work.find(w=>w.id===lateId).resultRef,late.resultRef,'late successful source remains independent');
assert.deepEqual(await read(prior.resultRef),originalResolution,'original receipt and resolution remain immutable');
const stale=structuredClone(saved);stale.work.find(w=>w.id===lateId).bindings.rules+='-different';
await assert.rejects((await open(stale)).dispatch({type:'resolve_with_work',workId:target,replacementWorkId:lateId}),
  /ROSTER_WORKFLOW_REPAIR_RESOLUTION_INVALID/,'different Rules context is not an idempotent late return');
const unrelated=structuredClone(saved);unrelated.work.find(w=>w.id===lateId).repairFor='different-question';
await assert.rejects((await open(unrelated)).dispatch({type:'resolve_with_work',workId:target,replacementWorkId:lateId}),
  /ROSTER_WORKFLOW_REPAIR_RESOLUTION_INVALID/,'unrelated success cannot claim the repaired question');
console.log(JSON.stringify({passed:true,actualTwoSuccessfulRepairs:true,firstBindingRetained:true,
  lateSourceNotDiscardedOrAliased:true,staleOrUnrelatedStillRejected:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,strategyRankingApplied:false}));
