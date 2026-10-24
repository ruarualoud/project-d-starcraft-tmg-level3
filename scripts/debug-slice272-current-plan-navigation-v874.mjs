// Actual A r2 failure: repeated r1 citations without current-block addresses.
// Product role + persisted workflow in memory, scripted responses, no live writes.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {rosterAuthoredChoiceSourceErrorV1} from '../packages/roster-strategist/roster-review-data-questions-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1,projectRosterWorkflowFeedbackRecoveryV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const [root,out,previous]=process.argv.slice(2),copy=structuredClone;
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const saved=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const work=saved.work.findLast(w=>w.status==='needs_repair'&&w.id.endsWith(':strategy-frontier'));
assert.ok(work);const call=work.operationState.calls.at(-1),request=await get(call.requestRef),paid=await get(call.replyRef);
const questions=paid.output.decisions[0].dataQuestions.filter(q=>q.classification==='authored_choice');
const entries=saved.evidence.map((e,i)=>({...e,number:i+1}));
const prior=previous?JSON.parse(await fs.readFile(previous,'utf8')):null,checks=[];
async function check(name,fn){const old=prior?.checks.find(c=>c.name===name&&c.pass);
  if(old){checks.push({...old,inheritedFrom:previous});return;}
  try{checks.push({name,pass:true,...await fn()});}catch(e){checks.push({name,pass:false,error:e.message});}
  await fs.writeFile(out,JSON.stringify({complete:false,checks},null,2)+'\n');console.log(JSON.stringify(checks.at(-1)));}
await check('actual-old-citations-get-exact-current-navigation-not-approval',()=>{
  const errors=questions.map(question=>rosterAuthoredChoiceSourceErrorV1({question,entries,draftRevision:saved.draftRevision}));
  assert.deepEqual(errors.map(e=>e.sourceNavigation?.currentPlanSources?.[0]?.evidenceNumber),[184,195]);
  for(const e of errors){assert.equal(e.code,'authored_choice_requires_current_plan_source');
    assert.equal(e.sourceNavigation.sourcesAutomaticallyRebound,false);assert.equal(e.sourceNavigation.claimApproved,false);}
  assert.equal(errors[0].sourceNavigation.currentPlanSources[0].sameSavedContent,true);
  assert.equal(errors[1].sourceNavigation.currentPlanSources[0].sameSavedContent,false);
  const missing=rosterAuthoredChoiceSourceErrorV1({question:questions[1],entries:entries.filter(e=>e.number!==195),draftRevision:2});
  assert.deepEqual(missing.sourceNavigation.currentPlanSources,[]);
  return {unchangedBlockStillNeedsExplicitCurrentCitation:true,changedBlockNotSilentlyPromoted:true};
});
await check('actual-role-delivers-navigation-then-read-confirm-without-repeated-grant',async()=>{
  const recovery=projectRosterWorkflowFeedbackRecoveryV1({work,reply:paid,request});
  assert.equal(recovery?.repairKind,'current_plan_source_navigation');
  let state=copy(saved),calls=0;const memory=new Map(),prompts=[],originalAssignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
  const store={load:async()=>copy(state),save:async s=>{state=copy(s);},get:async ref=>memory.has(ref)?copy(memory.get(ref)):get(ref),
    put:async v=>{const ref=hash(v);memory.set(ref,copy(v));return ref;}};
  const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v874-current-plan-navigation',deliberation:{deliberate:async req=>{
    prompts.push(req);calls++;assert(calls<=2);const feedback=req.promptNodes.find(n=>n.kind==='local_contract_feedback');
    assert(feedback.errors.every(e=>e.sourceNavigation?.version===1));
    assert.deepEqual(feedback.errors.flatMap(e=>e.sourceNavigation.currentPlanSources.map(s=>s.evidenceNumber)),[184,195]);
    const output=copy(paid.output);if(calls===1){output.action='read';output.reads=[{evidenceNumber:184,pointer:''},{evidenceNumber:195,pointer:''}];output.decisions=[];}
    else for(const d of output.decisions){d.evidenceNumbers=d.evidenceNumbers.map(n=>n===115?184:n===126?195:n);
      for(const q of d.dataQuestions)q.evidenceNumbers=q.evidenceNumbers.map(n=>n===115?184:n===126?195:n);}
    return {output,receipt:{fixture:true,contextHash:req.contextHash,roundKind:req.roundKind,sessionId:req.sessionId,roundIndex:req.roundIndex,outputHash:hash(output)}};
  }}});
  const workflow=await createRosterDecisionWorkflowV1({store,execute:(a,c)=>executor({...a,inputs:{...originalAssignment.inputs,...a.inputs}},c)});
  await workflow.dispatch({type:'resume_role_correction',workId:work.id,reason:'Concrete current Plan source navigation fix; one extra correction, old history retained.'});
  await workflow.dispatch({type:'run_ready',workIds:[work.id],concurrency:1});
  const prepared=state.work.find(w=>w.id===work.id);
  assert.equal(prepared.status,'needs_model_choice',JSON.stringify({failure:prepared.failure,correction:prepared.operationState.correction}));
  await workflow.dispatch({type:'continue_work',workId:work.id});
  await workflow.dispatch({type:'run_ready',workIds:[work.id],concurrency:1});
  const after=state.work.find(w=>w.id===work.id);assert.equal(after.status,'evidence_ready',JSON.stringify({failure:after.failure,correction:after.operationState.correction}));
  assert.equal(after.operationState.calls.length,work.operationState.calls.length+2);
  assert.equal(state.draftRef,saved.draftRef);assert.equal(state.acceptanceGranted,false);
  assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work,reply:paid,request:prompts[0]}),null);
  return {scriptedReplies:calls,actualProviderCalls:0,currentSourcesRead:true,originalCallsRetained:true,
    sameArmyPlan:true,independentSemanticReviewStillRequired:true,noRepeatedGrant:true};
});
await fs.writeFile(out,JSON.stringify({pass:checks.every(c=>c.pass),complete:true,checks,
  source:{root,workId:work.id,requestRef:call.requestRef,replyRef:call.replyRef},actualProviderCalls:0,productionWrites:0,trainingTruth:false},null,2)+'\n');
process.exitCode=checks.every(c=>c.pass)?0:1;
