// Exact current A geometry answer: object/array/null observations are not
// unknown merely because the old native-fact verifier accepted only scalars.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {verifyRosterNativeFactsV1} from '../packages/roster-strategist/roster-native-fact-claims-v1.mjs';
import {projectRosterWorkflowSavedSchemaRevalidationV1,createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const [root,out,previous]=process.argv.slice(2),copy=structuredClone;
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const saved=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const work=saved.work.find(w=>w.id.endsWith(':method:a08d17571de04bc1'));
assert.equal(work.status,'needs_repair');
const call=work.operationState.calls.at(-1),reply=await get(call.replyRef),request=await get(call.requestRef);
const conclusion=reply.output.conclusion;
const verify=(c=conclusion,reader=get)=>verifyRosterNativeFactsV1({conclusion:c,required:true,
  lookup:n=>({...saved.evidence[n-1],validity:'current'}),readArtifact:reader,isRead:()=>true});
const prior=previous?JSON.parse(await fs.readFile(previous,'utf8')):null,checks=[];
async function check(name,fn){const old=prior?.checks.find(c=>c.name===name&&c.pass);
  if(old){checks.push({...old,inheritedFrom:previous});return;}
  try{checks.push({name,pass:true,...await fn()});}catch(e){checks.push({name,pass:false,error:{code:e.code,message:e.message}});}
  await fs.writeFile(out,JSON.stringify({complete:false,checks},null,2)+'\n');
  console.log(JSON.stringify(checks.at(-1)));
}
await check('exact-map-objects-array-neutral-null-are-observed-values',async()=>{
  const before=JSON.stringify(conclusion),r=await verify();assert.deepEqual(r.errors,[]);
  assert.equal(r.facts.length,6);assert.equal(r.facts.at(-1).observedValue,null);
  assert.ok(r.facts.every(f=>!f.questionCoverageApproved));
  assert.equal(JSON.stringify(conclusion),before);return {facts:6,replyUnchanged:true};
});
await check('changed-coordinate-missing-pointer-and-unknown-result-reject',async()=>{
  const changed=copy(conclusion),v=JSON.parse(changed.nativeFacts[0].expectedValueJson);
  v.widthInches=55;changed.nativeFacts[0].expectedValueJson=JSON.stringify(v);
  assert.ok((await verify(changed)).errors.some(e=>e.code==='native_fact_value_mismatch'));
  const missing=copy(conclusion);missing.nativeFacts[0].pointer='/receipt/not-present';
  assert.ok((await verify(missing)).errors.length);
  const unknownReader=async ref=>{const b=copy(await get(ref)),body=b.kind==='tool_receipt'?b.value:b;
    if(body.receipt)body.receipt.resultStatus='unknown';return b;};
  assert.ok((await verify(conclusion,unknownReader)).errors.length);
});
await check('exact-paid-answer-revalidates-through-role-without-provider',async()=>{
  const p=projectRosterWorkflowSavedSchemaRevalidationV1({work,reply,request});
  assert.equal(p?.repairKind,'native_fact_json_value');
  let state=copy(saved),providerCalls=0;const memory=new Map();
  const store={load:async()=>copy(state),save:async s=>{state=copy(s);},
    get:async ref=>memory.has(ref)?copy(memory.get(ref)):get(ref),
    put:async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;}};
  const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v872-exact-paid-revalidation',
    deliberation:{deliberate:async()=>{providerCalls++;throw Error('No Provider retry');}}});
  const workflow=await createRosterDecisionWorkflowV1({store,execute:executor});
  await workflow.dispatch({type:'revalidate_role_reply',workId:work.id,reason:'Exact JSON native observations through normal current role'});
  await workflow.dispatch({type:'run_ready',workIds:[work.id],concurrency:1});
  const after=state.work.find(w=>w.id===work.id),result=await store.get(after.resultRef);
  assert.equal(after.status,'evidence_ready',JSON.stringify(after.operationState.correction));
  assert.equal(result.value.experimentConclusion.verifiedNativeFacts.length,6);
  assert.equal(providerCalls,0);assert.equal(after.operationState.calls.length,work.operationState.calls.length);
  assert.equal(state.draftRef,saved.draftRef);assert.equal(state.acceptanceGranted,false);
  return {facts:6,providerCalls,draftUnchanged:true,independentReviewStillRequired:true};
});
await fs.writeFile(out,JSON.stringify({pass:checks.every(x=>x.pass),complete:true,checks,
  source:{root,workId:work.id,replyRef:call.replyRef,requestRef:call.requestRef},
  providerCalls:0,nativeCalls:0,productionWrites:0,trainingTruth:false},null,2)+'\n');
process.exitCode=checks.every(x=>x.pass)?0:1;
