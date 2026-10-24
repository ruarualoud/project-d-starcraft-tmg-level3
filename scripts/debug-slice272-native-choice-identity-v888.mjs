// The real Native menu exposes candidateId outside action. Both preflight and
// execution must resolve that exact observed ID, without guessing an actionKey.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {resolveRosterWorkflowNativeSelectionV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1,projectRosterWorkflowSavedSchemaRevalidationV1}
  from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const [root,out,only,priorResult]=process.argv.slice(2),clone=structuredClone,checks=[];
if(only&&priorResult)checks.push(...JSON.parse(await fs.readFile(priorResult,'utf8')).checks
  .filter(c=>c.pass&&c.name!==only).map(c=>({...c,inheritedFrom:priorResult})));
let state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const original=clone(state),memory=new Map(),get=async ref=>memory.has(ref)?clone(memory.get(ref))
  :JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const store={load:async()=>clone(state),save:async s=>{state=clone(s);},get,
  put:async v=>{const ref=hash(v);memory.set(ref,clone(v));return ref;}};
async function check(name,fn){if(only&&name!==only)return;try{checks.push({name,pass:true,...await fn()});}
  catch(error){checks.push({name,pass:false,error:error.message});}console.log(JSON.stringify(checks.at(-1)));}
const work=state.work.find(w=>w.operationState?.correction?.originalReplyRef==='266753ec75abed4aece3917ebb529941f20da96267e4e2de9a4e1404d0f13220');
const call=work.operationState.calls.at(-1),reply=await get(call.replyRef),request=await get(call.requestRef);
const sourceValue=(await get('1ae702ed67c3a2b38fca4e5d2ac06174d8e8d4983b22fe849ef78af5a81bef27')).value;
const source={workId:'actual-post-start-inspect',value:sourceValue},entries=sourceValue.receipt.actionSpace.finiteActions;
await check('same-native-menu-identities-select-exact-candidate',async()=>{
  const originalSource=clone(source),select=match=>resolveRosterWorkflowNativeSelectionV1({selection:{sourceEvidenceNumber:439,kind:'finite',match}},source);
  const selected=[];
  for(const [index,entry] of entries.entries()){
    const resolved=select({candidateId:entry.candidateId});
    assert.equal(resolved.index,index);assert.equal(resolved.action.actionKey,entry.proposal.actionKey);
    assert.equal(resolved.item.action.chosenFirstActorSideKey,entry.action.chosenFirstActorSideKey);
    selected.push({index,actionKey:resolved.action.actionKey,firstActor:resolved.item.action.chosenFirstActorSideKey});
  }
  assert.throws(()=>select({candidateId:'not-in-this-menu'}),/MATCH_NOT_UNIQUE/);
  assert.throws(()=>select({candidateId:entries[0].candidateId,chosenFirstActorSideKey:'player2'}),/MATCH_NOT_UNIQUE/);
  let ambiguous;try{select({actionType:'choose_first_actor'});}catch(error){ambiguous=error;}
  assert.equal(ambiguous?.detail?.matchCount,2);
  assert.deepEqual(ambiguous.detail.availableIdentities.map(x=>x.candidateId),entries.map(x=>x.candidateId));
  const duplicate=clone(source);duplicate.value.receipt.actionSpace.finiteActions[1].candidateId=entries[0].candidateId;
  assert.throws(()=>resolveRosterWorkflowNativeSelectionV1({selection:{sourceEvidenceNumber:439,kind:'finite',match:{candidateId:entries[0].candidateId}}},duplicate),/MATCH_NOT_UNIQUE/);
  assert.deepEqual(source,originalSource);return {selected,negativeCases:4};
});
await check('actual-paid-selection-through-role-cold-revalidation',async()=>{
  const plan=projectRosterWorkflowSavedSchemaRevalidationV1({work,reply,request});
  assert.equal(plan?.repairKind,'native_menu_candidate_identity');
  const semantic=clone(work);semantic.operationState.correction.errors.push({code:'native_fact_value_mismatch'});
  assert.equal(projectRosterWorkflowSavedSchemaRevalidationV1({work:semantic,reply,request}),null);
  let scriptedReplies=0;
  const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:request.sessionId,
    deliberation:{deliberate:async q=>{scriptedReplies++;const output=clone(reply.output);
      return {output,receipt:{fixture:true,contextHash:q.contextHash,roundKind:q.roundKind,
        sessionId:q.sessionId,roundIndex:q.roundIndex,outputHash:hash(output)}};}}});
  const inputs=request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
  const workflow=await createRosterDecisionWorkflowV1({store,execute:(a,c)=>executor({...a,inputs:clone(inputs)},c)});
  await workflow.dispatch({type:'revalidate_role_reply',workId:work.id,reason:'v888 published Native candidate identity fix'});
  await workflow.dispatch({type:'run_ready',workIds:[work.id],concurrency:1});
  let after=await workflow.inspect(),item=after.work.find(w=>w.id===work.id),result=await get(item.resultRef);
  // Actual history contains the directory, not the selected entry body. Cold
  // revalidation must fetch it and wait for author confirmation, never auto-apply.
  assert.equal(scriptedReplies,0);assert.equal(item.status,'needs_model_choice');
  assert.equal(result.value.status,'evidence_reads_pending_recheck');
  assert.equal(result.value.conclusionAccepted,false);assert.equal(item.operationState.correction,null);
  assert.deepEqual(item.operationState.calls,work.operationState.calls);
  await workflow.dispatch({type:'continue_work',workId:work.id});
  await workflow.dispatch({type:'run_ready',workIds:[work.id],concurrency:1});
  after=await workflow.inspect();item=after.work.find(w=>w.id===work.id);result=await get(item.resultRef);
  assert.equal(item.status,'evidence_ready',JSON.stringify(item.failure));
  assert.equal(result.value.failedWorkOrders.length,0);assert.deepEqual(result.value.workOrders,reply.output.workOrders);
  assert.equal(scriptedReplies,1);assert.deepEqual(item.operationState.calls.slice(0,-1),work.operationState.calls);
  assert.equal(after.draftRef,original.draftRef);assert.equal(after.acceptanceGranted,false);
  return {actualProviderCalls:0,scriptedReplies,entryReadBeforeConfirmation:true,originalReplyRef:call.replyRef,
    workStatus:item.status,selectedWorkPreserved:true,negativeCases:1};
});
await fs.writeFile(out,JSON.stringify({pass:checks.every(x=>x.pass),checks,actualProviderCalls:0,nativeExecutions:0,productionWrites:0,formalPlans:0},null,2));
process.exitCode=checks.every(x=>x.pass)?0:1;
