// Actual B rejected a truthful no-repeat return. Inject that immutable reply
// through the product role, then check dispatch and release separately.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as inquiry from '../packages/roster-strategist/roster-workflow-fact-inquiry-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1,projectRosterWorkflowFeedbackRecoveryV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowNonRevisionOutcomeV1} from '../packages/roster-strategist/roster-workflow-decision-records-v1.mjs';
import {assessRosterWorkflowReadinessV1} from '../packages/roster-strategist/roster-workflow-readiness-v1.mjs';
const [root,out,previous]=process.argv.slice(2),clone=structuredClone;
const original=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
let state=clone(original);const memory=new Map();
const get=async ref=>memory.has(ref)?clone(memory.get(ref)):JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const paidRef='13e80dfb80512841def60dc103eac502f6764b307790b5d0b8a2b31bfa0e369e';
const paid=await get(paidRef),decision=paid.output.decisions[0];
const stopped=original.work.find(w=>w.operationState?.calls?.some(c=>c.replyRef===paidRef));
const call=stopped.operationState.calls.find(c=>c.replyRef===paidRef),request=await get(call.requestRef);
const continuation=request.promptNodes.find(n=>n.kind==='investigation_continuation_contract');
const result={pass:false,checks:[],actualProviderCalls:0,nativeCalls:0,productionWrites:0};
const prior=previous?JSON.parse(await fs.readFile(previous,'utf8')):null;
try{
  const completed=prior?.checks.find(c=>c.name==='ledger-is-not-dispatch'&&c.pass);
  if(completed)result.checks.push({...completed,inheritedFrom:previous});
  else{
  assert.equal(inquiry.rosterDecisionInvestigationErrorV1(decision,{continuation}),null,
    'retaining unresolved facts must not force an identical unavailable inquiry');
  const held=inquiry.rosterDecisionInquiryDispatchV1(decision);
  assert.equal(held.dispatch,false);assert.equal(held.kind,'unresolved_return');
  assert.equal(held.pendingFacts.length,3);assert.equal(held.pendingAuthorDecisions.length,2);
  const bad=clone(decision);bad.disposition='investigate';
  assert.equal(inquiry.rosterDecisionInvestigationErrorV1(bad)?.code,'pending_questions_are_not_investigation_authorization');
  const same=clone(decision);same.disposition='investigate';same.nextInvestigation=clone(continuation.previousAuthorization);
  assert.equal(inquiry.rosterDecisionInvestigationErrorV1(same,{continuation})?.code,'unchanged_investigation_authorization');
  const next=clone(same);next.nextInvestigation.questionNumbers=[9];
  assert.equal(inquiry.rosterDecisionInvestigationErrorV1(next,{continuation}),null);
  assert.equal(inquiry.rosterDecisionInquiryDispatchV1(next).dispatch,true);
  assert.deepEqual(inquiry.rosterDecisionInquiryDispatchV1(next).authorizedQuestionNumbers,[9]);
  const legacy=clone(decision);delete legacy.nextInvestigation;
  assert.equal(inquiry.rosterDecisionInquiryDispatchV1(legacy).dispatch,true,'old immutable contract retains legacy routing');
  const malformed=clone(next);malformed.nextInvestigation.questionNumbers=[10];
  assert.equal(inquiry.rosterDecisionInvestigationErrorV1(malformed)?.code,'bounded_investigation_authorization_invalid');
  result.checks.push({name:'ledger-is-not-dispatch',pass:true,pendingFacts:3,pendingAuthorDecisions:2,negativeCases:3});
  }
  const last=stopped.operationState.calls.at(-1);
  if(!prior?.error?.message?.includes('needs_model_choice')){
  const recovery=projectRosterWorkflowFeedbackRecoveryV1({work:stopped,reply:await get(last.replyRef),request:await get(last.requestRef)});
  assert.equal(recovery?.repairKind,'explicit_inquiry_dispatch');
  const newRequest=clone(await get(last.requestRef));
  newRequest.promptNodes.push({kind:'investigation_dispatch_contract',version:2});
  assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:stopped,reply:await get(last.replyRef),request:newRequest}),null);
  }
  // Keep actual delivered evidence and full pending ledger, not hand-authored answers.
  const work=state.work.find(w=>w.id===stopped.id);
  work.status='ready';work.failure=null;delete work.resultRef;
  work.operationState.calls=work.operationState.calls.slice(0,2);
  work.operationState.pending=null;work.operationState.correction=null;
  work.operationState.consecutiveCorrections=0;
  const store={load:async()=>clone(state),save:async value=>{state=clone(value);},get,
    put:async value=>{const ref=hash(value);memory.set(ref,clone(value));return ref;}};
  let captured;
  const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:request.sessionId,
    deliberation:{deliberate:async q=>{captured=q;return {output:clone(paid.output),receipt:{fixture:true,
      contextHash:q.contextHash,roundKind:q.roundKind,sessionId:q.sessionId,roundIndex:q.roundIndex,outputHash:hash(paid.output)}};}}});
  const inputs=request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
  const workflow=await createRosterDecisionWorkflowV1({store,execute:(assignment,control)=>executor({...assignment,inputs:clone(inputs)},control)});
  await workflow.dispatch({type:'run_ready',workIds:[work.id],concurrency:1});
  let after=state.work.find(w=>w.id===work.id);
  // A normal source-body delivery is a separate product step, not a failed
  // semantic correction. The fixture must acknowledge that boundary as a model
  // would, rather than incorrectly demanding one-dispatch acceptance.
  if(after.status==='needs_model_choice'){
    const handoff=await get(after.resultRef);
    assert.equal(handoff.value.status,'evidence_reads_pending_recheck',JSON.stringify(handoff));
    assert.equal(after.operationState.correction,null);
    result.checks.push({name:'actual-source-read-confirmation-boundary',pass:true,readCount:handoff.value.readCount});
    await workflow.dispatch({type:'continue_work',workId:work.id});
    await workflow.dispatch({type:'run_ready',workIds:[work.id],concurrency:1});
    after=state.work.find(w=>w.id===work.id);
  }
  assert.equal(after.status,'evidence_ready',JSON.stringify(after.operationState.correction));
  assert(captured.promptNodes.some(n=>n.kind==='investigation_dispatch_contract'&&n.version===2));
  const accepted=await get(after.resultRef),actual=accepted.value.decisions[0];
  assert.deepEqual(actual.dataQuestions.map(q=>[q.question,q.classification]),decision.dataQuestions.map(q=>[q.question,q.classification]));
  assert.equal(actual.nextInvestigation,null);
  const outcome=createRosterWorkflowNonRevisionOutcomeV1(actual);
  assert.equal(outcome.inquiryDispatch.kind,'unresolved_return');assert.equal(outcome.inquiryDispatch.dispatch,false);
  assert.equal(outcome.applied,false);assert.equal(outcome.draftUnchanged,true);
  const draft=await get(state.draftRef),verdict=await get(draft.builderVerdictRef);
  const readiness=assessRosterWorkflowReadinessV1({draft,verdict,work:state.work,
    acceptedDecisions:[{workId:work.id,revision:state.draftRevision,resultRef:after.resultRef,decision:actual}]});
  assert(readiness.strategyQuestions.some(q=>q.question===decision.dataQuestions[7].question));
  assert(readiness.strategyQuestions.some(q=>q.question===decision.dataQuestions[8].question));
  assert.equal(readiness.mechanicalReady,false);assert.equal(readiness.acceptanceGranted,false);
  assert(readiness.mechanicalBlockers.some(b=>b.code==='requested_mineral_target_unmet'&&b.detail.shortfall===20));
  assert.equal(state.draftRef,original.draftRef);assert.equal(state.acceptanceGranted,false);
  assert.deepEqual((await get(paidRef)).output,paid.output);
  result.checks.push({name:'actual-paid-role-return-without-false-publication',pass:true,
    questionsRetained:actual.dataQuestions.length,releaseQuestions:readiness.strategyQuestions.length,
    shortfall:20,originalReplyUnchanged:true,oneOldContractRecovery:true});
  result.pass=true;
}catch(error){result.error={name:error.name,message:error.message,stack:error.stack?.split('\n').slice(0,5)};process.exitCode=1;}
await fs.writeFile(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
