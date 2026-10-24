// Actual completed malformed B reply was incorrectly quarantined because the
// failure wrapper omitted roundKind already stored in its own failure record.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import * as boundary from '../packages/roster-planning-workspace/roster-workflow-provider-boundary-v1.mjs';
import {rosterRoleReplyCommunicationErrorsV1} from '../packages/roster-strategist/roster-role-communication-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const [root,out]=process.argv.slice(2),copy=structuredClone;
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const saved=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const work=saved.work.findLast(w=>w.failure?.code==='ROSTER_WORKFLOW_REPLY_IDENTITY_MISMATCH');
assert.ok(work?.operationState.pending);const {requestRef,replyRef}=work.failure.detail;
const [request,reply]=await Promise.all([get(requestRef),get(replyRef)]),checks=[];
async function check(name,fn){try{checks.push({name,pass:true,...await fn()});}
  catch(e){checks.push({name,pass:false,error:{message:e.message,stack:e.stack}});}
  await fs.writeFile(out,JSON.stringify({complete:false,checks},null,2)+'\n');
  const last=checks.at(-1);console.log(JSON.stringify({...last,...(!last.pass?{error:last.error.message.slice(0,500)}:{})}));}
await check('failure-producer-retains-native-role-identity-and-raw-paid-body',()=>{
  const event={type:'round_failed',code:reply.failureCode,failedOutputRecord:reply.providerFailure,
    roundKind:request.roundKind,roundIndex:request.roundIndex,paidProviderCall:true,
    usage:reply.receipt.usage,latencyMs:reply.receipt.latencyMs,receiptHash:reply.receipt.receiptHash};
  const projected=boundary.rosterWorkflowCompletedOutputFailureV1(event,request.contextHash);
  assert.deepEqual(rosterRoleReplyCommunicationErrorsV1(request,projected),[]);
  assert.deepEqual(projected.providerFailure,reply.providerFailure);assert.equal(projected.output,null);
  assert.deepEqual(projected.receipt.usage,reply.receipt.usage);return {rawTextUnchanged:true,notAValidDecision:true};
});
await check('cold-projection-requires-actual-failure-identity-not-request-filled-defaults',()=>{
  const before=JSON.stringify(reply),projected=boundary.projectRosterCompletedFailureIdentityV1({request,reply});
  assert.ok(projected);assert.deepEqual(rosterRoleReplyCommunicationErrorsV1(request,projected),[]);
  assert.equal(JSON.stringify(reply),before);
  for(const field of ['roundKind','roundIndex','contextHash','rawTextHash','outputContractRef']){
    const wrong=copy(reply);wrong.providerFailure[field]=field==='roundIndex'?-1:'wrong';
    assert.equal(boundary.projectRosterCompletedFailureIdentityV1({request,reply:wrong}),null,field);
  }
  const wrong=copy(reply);wrong.receipt.roundKind='wrong';
  assert.equal(boundary.projectRosterCompletedFailureIdentityV1({request,reply:wrong}),null);
  const unpaid=copy(reply);unpaid.receipt.paidProviderCall=false;
  assert.equal(boundary.projectRosterCompletedFailureIdentityV1({request,reply:unpaid}),null);
  for(const field of ['roundIndex','outputContractRef']){
    const conflict=copy(reply);conflict.receipt[field]=field==='roundIndex'?-1:'wrong';
    assert.equal(boundary.projectRosterCompletedFailureIdentityV1({request,reply:conflict}),null,field);
  }
  const negativeUsage=copy(reply);negativeUsage.receipt.usage.totalUnits=-1;
  assert.equal(boundary.projectRosterCompletedFailureIdentityV1({request,reply:negativeUsage}),null);
  return {negativeCases:10,sourceReceiptPreserved:true};
});
await check('actual-pending-work-enters-existing-content-repair-once-without-replay',async()=>{
  let state=copy(saved),calls=0;const memory=new Map();
  const store={load:async()=>copy(state),save:async value=>{state=copy(value);},
    get:async ref=>memory.has(ref)?copy(memory.get(ref)):get(ref),
    put:async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;}};
  const workflow=await createRosterDecisionWorkflowV1({store,execute:async()=>{calls++;throw Error('No Provider/tool replay');}});
  assert.deepEqual(await boundary.reconcileRosterCompletedFailureIdentityV1({workflow,store}),[work.id]);
  const after=state.work.find(w=>w.id===work.id);assert.equal(after.status,'needs_model_choice');
  assert.equal(after.operationState.pending,null);assert.equal(after.operationState.calls.length,work.operationState.calls.length+1);
  assert.equal(after.operationState.correction.errors[0].code,'provider_output_invalid');
  assert.equal(after.operationState.communicationFailures.length,work.operationState.communicationFailures.length);
  assert.equal(after.operationState.consecutiveCorrections,work.operationState.consecutiveCorrections+1);
  assert.equal(after.failureHistory.at(-1).failure.code,work.failure.code);
  assert.equal(state.draftRef,saved.draftRef);assert.equal(state.acceptanceGranted,false);assert.equal(calls,0);
  assert.deepEqual(await boundary.reconcileRosterCompletedFailureIdentityV1({workflow,store}),[]);
  return {providerCalls:0,rawReplyRetained:true,noRetryCounterReset:true,armyPlanUnchanged:true,coldIdempotent:true};
});
await fs.writeFile(out,JSON.stringify({pass:checks.every(c=>c.pass),complete:true,checks,
  source:{root,workId:work.id,requestRef,replyRef},actualProviderCalls:0,nativeCalls:0,productionWrites:0,trainingTruth:false},null,2)+'\n');
process.exitCode=checks.every(c=>c.pass)?0:1;
