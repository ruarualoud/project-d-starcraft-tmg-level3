// Real paid A answer/Builder audit; no new model call or production mutation.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {verifyRosterNativeFactsV1} from '../packages/roster-strategist/roster-native-fact-claims-v1.mjs';
import {projectRosterWorkflowSavedSchemaRevalidationV1,createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const [root,out,previous]=process.argv.slice(2),copy=structuredClone;
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const saved=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const work=saved.work.find(w=>w.id==='product:initial-army-and-plan:followup:r1');
assert.equal(work.status,'needs_repair');
const call=work.operationState.calls.at(-1),reply=await get(call.replyRef),request=await get(call.requestRef);
const conclusion=reply.output.conclusion,number=conclusion.nativeFacts[0].evidenceNumber;
const entry={...saved.evidence[number-1],validity:'current'},body=await get(entry.artifactRef);
const verify=(c=conclusion,e=entry,b=body)=>verifyRosterNativeFactsV1({conclusion:c,required:true,
  lookup:n=>n===number?e:null,readArtifact:async()=>b,isRead:()=>true});
const prior=previous?JSON.parse(await fs.readFile(previous,'utf8')):null,checks=[];
async function check(name,fn){const old=prior?.checks.find(c=>c.name===name&&c.pass);
  if(old){checks.push({...old,inheritedFrom:previous});return;}
  try{checks.push({name,pass:true,...await fn()});}catch(e){checks.push({name,pass:false,error:{code:e.code,message:e.message}});}
  await fs.writeFile(out,JSON.stringify({complete:false,checks},null,2)+'\n');
  console.log(JSON.stringify(checks.at(-1)));
}
await check('actual-builder-paid-facts-accepted-without-value-rewrite',async()=>{
  const bytes=JSON.stringify({conclusion,body}),r=await verify();
  assert.deepEqual(r.errors,[]);assert.equal(r.facts.length,12);
  assert.equal(r.facts.find(f=>f.pointer==='/summary/mineralSpent').observedValue,2000);
  assert.ok(r.facts.every(f=>f.sourceOperation==='builder_audit'&&!f.questionCoverageApproved));
  assert.equal(JSON.stringify({conclusion,body}),bytes);
  return {verifiedValues:r.facts.length,mineralSpent:2000,sourceUnchanged:true};
});
await check('one-paid-revalidation-selected-not-new-provider-retry',()=>{
  const p=projectRosterWorkflowSavedSchemaRevalidationV1({work,reply,request});
  assert.equal(p?.repairKind,'native_fact_receipt_envelope');
  assert.equal(p.providerReplayed,false);assert.equal(p.nativeReplayed,false);
  assert.equal(p.finalApprovalGranted,false);
  return {plan:p};
});
await check('false-values-stale-and-model-prose-still-rejected',async()=>{
  const wrong=copy(conclusion);wrong.nativeFacts[0].expectedValueJson='"not-legal"';
  assert.ok((await verify(wrong)).errors.some(e=>e.code==='native_fact_value_mismatch'));
  assert.ok((await verify(conclusion,{...entry,validity:'stale'})).errors.length);
  assert.ok((await verify(conclusion,{...entry,kind:'interpretation'})).errors.length);
  const fake={...body,schema:'model_roster_claim'};
  assert.ok((await verify(conclusion,entry,fake)).errors.length);
  const metadata=copy(conclusion);metadata.nativeFacts=[{...metadata.nativeFacts[0],pointer:'/rulesAuthority',expectedValueJson:JSON.stringify(body.rulesAuthority)}];
  assert.ok((await verify(metadata)).errors.length,'Producer metadata is not a calculated Rules fact');
});
await check('same-role-paid-revalidation-keeps-full-semantic-checks',async()=>{
  let state=copy(saved),providerCalls=0;const memory=new Map();
  const store={load:async()=>copy(state),save:async s=>{state=copy(s);},
    get:async ref=>memory.has(ref)?copy(memory.get(ref)):get(ref),
    put:async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;}};
  const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v871-exact-paid-revalidation',
    deliberation:{deliberate:async()=>{providerCalls++;throw Error('No paid retry authorized in this debug');}}});
  const workflow=await createRosterDecisionWorkflowV1({store,execute:executor});
  await workflow.dispatch({type:'revalidate_role_reply',workId:work.id,reason:'Concrete Builder envelope repair; exact paid answer through normal checks'});
  await workflow.dispatch({type:'run_ready',workIds:[work.id],concurrency:1});
  const after=state.work.find(w=>w.id===work.id);
  assert.equal(providerCalls,0);assert.equal(after.status,'evidence_ready',JSON.stringify(after.operationState.correction));
  const result=await store.get(after.resultRef);
  assert.equal(result.value.experimentConclusion.verifiedNativeFacts.length,12);
  assert.equal(state.draftRef,saved.draftRef);assert.equal(state.acceptanceGranted,false);
  assert.equal(after.operationState.calls.length,work.operationState.calls.length);
  return {providerCalls,values:12,draftUnchanged:true,independentReviewStillRequired:true};
});
await fs.writeFile(out,JSON.stringify({pass:checks.every(x=>x.pass),complete:true,checks,
  source:{root,workId:work.id,replyRef:call.replyRef,requestRef:call.requestRef,artifactRef:entry.artifactRef},
  providerCalls:0,nativeCalls:0,productionWrites:0,trainingTruth:false},null,2)+'\n');
process.exitCode=checks.every(x=>x.pass)?0:1;
