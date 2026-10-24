// Actual v884 success stranded two ancestors; retain all original receipts.
// RED was reproduced with the same core in the REPL before this source change.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {settleRosterWorkflowCompletedReplacementsV1} from '../packages/roster-strategist/roster-workflow-replacement-settlement-v1.mjs';
const [root,out]=process.argv.slice(2),clone=structuredClone;
const original=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const rootId='product:strategy-hypothesis:v1:a82367e4763f5ab06a1d:purpose:v1:study:method:53323bf7cf60ab4e:order-repair0:order-repair0:order0:scene-hold';
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
let state=clone(original);const memory=new Map(),before=JSON.stringify(original);
const store={load:async()=>clone(state),save:async v=>{state=clone(v);},
  get:async ref=>memory.has(ref)?clone(memory.get(ref)):get(ref),
  put:async value=>{const ref=hash(value);memory.set(ref,clone(value));return ref;}};
const workflow=await createRosterDecisionWorkflowV1({store,execute:()=>{throw Error('No dispatch allowed');}});
let error=null,settled,rootResult;
try{
  assert.equal(state.work.find(w=>w.id===rootId).status,'needs_model_choice');
  settled=await settleRosterWorkflowCompletedReplacementsV1(workflow);
  const resolved=settled.state.work.find(w=>w.id===rootId);
  assert.equal(resolved.status,'evidence_ready');assert.equal(settled.resolved.length,2);
  rootResult=await store.get(resolved.resultRef);
  assert.equal(rootResult.value.receipt.resultStatus,'ok');
  assert.equal(rootResult.value.stateRef.stateHash,'8495063ffdbc682d0d8a076caa5d2536e8d8b7aa6f4cbd555f011f9d02603b4c');
  assert.equal(rootResult.resolution.originalWorkId,rootId);
  assert.equal(resolved.resultHistory.at(-1).resultRef,original.work.find(w=>w.id===rootId).resultRef);
  assert.equal((await settleRosterWorkflowCompletedReplacementsV1(workflow)).resolved.length,0,'cold/no-progress settlement must be idempotent');
  assert.equal(state.draftRef,original.draftRef);assert.equal(state.acceptanceGranted,false);
  assert.equal(JSON.stringify(original),before);
}catch(e){error=e.message;}
await fs.writeFile(out,JSON.stringify({pass:!error,error,resolved:settled?.resolved,rootResult,
  originalWorkflowUnchanged:JSON.stringify(original)===before,actualProviderCalls:0,nativeCalls:0,productionWrites:0},null,2));
console.log(JSON.stringify({pass:!error,error,resolved:settled?.resolved.length,originalWorkflowUnchanged:true}));process.exitCode=error?1:0;
