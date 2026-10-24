// Actual B stopped on a registered receipt view whose six values equal Native.
// In-memory product workflow and scripted author confirmation; no live writes.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {verifyRosterNativeFactsV1} from '../packages/roster-strategist/roster-native-fact-claims-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1,projectRosterWorkflowFeedbackRecoveryV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const [root,out,previous]=process.argv.slice(2),copy=structuredClone;
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const saved=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const work=saved.work.findLast(w=>w.status==='needs_repair'&&w.operationState?.correction?.errors
  ?.every(e=>e.code==='native_fact_receipt_path_invalid'&&e.sourceSchema==='roster_workflow_receipt_view_v1'));
assert.ok(work,'actual view failure required');
const call=work.operationState.calls.at(-1),request=await get(call.requestRef),paid=await get(call.replyRef);
const exactCall=work.operationState.calls.at(-2),exact=await get(exactCall.replyRef);
const entries=saved.evidence.map((e,i)=>({...e,number:i+1,validity:'current'}));
const verify=(conclusion=exact.output.conclusion,reader=get,lookupById=id=>entries.find(e=>e.id===id))=>
  verifyRosterNativeFactsV1({conclusion,required:true,lookup:n=>entries[n-1],lookupById,
    readArtifact:reader,isRead:()=>true});
const prior=previous?JSON.parse(await fs.readFile(previous,'utf8')):null,checks=[];
async function check(name,fn){const old=prior?.checks.find(c=>c.name===name&&c.pass);
  if(old){checks.push({...old,inheritedFrom:previous});return;}
  try{checks.push({name,pass:true,...await fn()});}catch(e){checks.push({name,pass:false,error:{message:e.message,stack:e.stack}});}
  await fs.writeFile(out,JSON.stringify({complete:false,checks},null,2)+'\n');
  const latest=checks.at(-1);console.log(JSON.stringify({...latest,...(!latest.pass?{error:latest.error.message.slice(0,500)}:{})}));}
await check('actual-six-view-facts-resolve-to-same-registered-native-source',async()=>{
  const before=JSON.stringify(exact),r=await verify();assert.deepEqual(r.errors,[]);
  assert.equal(r.facts.length,6);assert.ok(r.facts.every(f=>f.sourceResolution?.version===1&&!f.questionCoverageApproved));
  assert.deepEqual(r.facts.map(f=>f.evidenceNumber),[186,186,186,186,186,188]);
  assert.deepEqual(r.facts.map(f=>f.sourceResolution.sourceEvidenceNumber),[185,185,185,185,185,187]);
  assert.equal(JSON.stringify(exact),before);return {facts:6,originalReplyUnchanged:true};
});
await check('metadata-wrong-value-stale-missing-cycle-and-unknown-do-not-become-facts',async()=>{
  const metadata=await verify(paid.output.conclusion);
  assert.ok(metadata.errors.length);assert.ok(metadata.errors.every(e=>e.sourceNavigation?.version===1));
  assert.ok(metadata.errors.every(e=>e.sourceNavigation.handles.length>0&&e.sourceNavigation.claimApproved===false));
  const changed=copy(exact.output.conclusion);changed.nativeFacts[1].expectedValueJson='{}';
  assert.ok((await verify(changed)).errors.some(e=>e.code==='native_fact_value_mismatch'));
  assert.ok((await verify(exact.output.conclusion,get,()=>undefined)).errors.length);
  assert.ok((await verify(exact.output.conclusion,get,id=>({...entries.find(e=>e.id===id),validity:'historical'}))).errors.length);
  const cycle=async ref=>{const body=copy(await get(ref));if(body.schema==='roster_workflow_receipt_view_v1')
    body.evidenceId=entries.find(e=>e.artifactRef===ref).id;return body;};
  assert.ok((await verify(exact.output.conclusion,cycle)).errors.length);
  const unknown=async ref=>{const raw=copy(await get(ref)),body=raw.kind==='tool_receipt'?raw.value:raw;
    if(body.receipt)body.receipt.resultStatus='unknown';return raw;};
  assert.ok((await verify(exact.output.conclusion,unknown)).errors.length);
  return {negativeCases:6,viewMetadataNotNative:true};
});
await check('same-reader-and-role-recover-with-one-confirmation-no-tool-replay',async()=>{
  assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work,reply:paid,request})?.repairKind,'native_receipt_view_source');
  let state=copy(saved),calls=0;const memory=new Map(),prompts=[];
  const store={load:async()=>copy(state),save:async value=>{state=copy(value);},
    get:async ref=>memory.has(ref)?copy(memory.get(ref)):get(ref),
    put:async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;}};
  const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v876-view-native-facts',
    deliberation:{deliberate:async req=>{calls++;prompts.push(req);assert.equal(calls,1);
      const feedback=req.promptNodes.find(n=>n.kind==='local_contract_feedback');
      assert.ok(feedback.errors.every(e=>e.sourceNavigation?.version===1));
      const output=copy(exact.output);return {output,receipt:{fixture:true,contextHash:req.contextHash,
        roundKind:req.roundKind,sessionId:req.sessionId,roundIndex:req.roundIndex,outputHash:hash(output)}};}}});
  const originalAssignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
  const workflow=await createRosterDecisionWorkflowV1({store,execute:(assignment,control)=>executor({
    ...assignment,inputs:{...originalAssignment.inputs,...assignment.inputs}},control)});
  const view=await get(entries[185].artifactRef),section=view.sections.findIndex(x=>x.pointer==='/receipt/battlefield');
  const read=await workflow.dispatch({type:'read_evidence',consumer:'v876-read',evidenceId:entries[185].id,pointer:`/sections/${section}/value`});
  assert.equal(read.status,'read');assert.equal(read.resolvedEvidenceId,entries[184].id);
  assert.deepEqual(read.value,JSON.parse(exact.output.conclusion.nativeFacts[1].expectedValueJson));
  await workflow.dispatch({type:'resume_role_correction',workId:work.id,reason:'Concrete registered receipt-view resolution fix; one local confirmation, original history retained.'});
  await workflow.dispatch({type:'run_ready',workIds:[work.id],concurrency:1});
  const after=state.work.find(w=>w.id===work.id),result=await store.get(after.resultRef);
  assert.equal(after.status,'evidence_ready',JSON.stringify({failure:after.failure,correction:after.operationState.correction}));
  assert.equal(result.value.experimentConclusion.verifiedNativeFacts.length,6);
  assert.equal(after.operationState.calls.length,work.operationState.calls.length+1);
  assert.equal(state.draftRef,saved.draftRef);assert.equal(state.acceptanceGranted,false);
  assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work,reply:paid,request:prompts[0]}),null);
  return {scriptedReplies:calls,nativeCalls:0,productionWrites:0,originalHistoryRetained:true,semanticReviewStillRequired:true};
});
await fs.writeFile(out,JSON.stringify({pass:checks.every(c=>c.pass),complete:true,checks,
  source:{root,workId:work.id,requestRef:call.requestRef,replyRef:call.replyRef,exactReplyRef:exactCall.replyRef},
  actualProviderCalls:0,nativeCalls:0,productionWrites:0,trainingTruth:false},null,2)+'\n');
process.exitCode=checks.every(c=>c.pass)?0:1;
