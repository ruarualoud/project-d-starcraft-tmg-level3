// Concrete v907 B failure: retain + mandatory unresolved predicates + no next
// operation was accepted as a completed owner turn. Real role/core, fake transport.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const [root,out]=process.argv.slice(2),copy=structuredClone;
const original=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const disk=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const originalWork=original.work.find(w=>w.resultRef==='978614bb7c90f3a934d0366f6a2cede330c0e36b7d94bc0961f39eae0dc463b8');
const result=await disk(originalWork.resultRef),paid=await disk(result.value.originalReplyRef);
const call=originalWork.operationState.calls.find(c=>c.replyRef===result.value.originalReplyRef),request=await disk(call.requestRef);
const index=paid.output.decisions[0].dataQuestions.findIndex(q=>q.question===originalWork.inputs.investigationFrontier.value.unresolvedQuestions[0]);
const authorization={questionNumbers:[index+1],decisionToEnable:'Fixture: complete the originally authorized slot comparison',
  whyExistingEvidenceInsufficient:'Fixture: previous small-arm measurement does not measure the selected large-arm candidate context',
  expectedNewObservation:'Fixture: use explicit candidate_context and matching participantConfigurations before measuring the large-arm outcomes',
  stopWhen:'Fixture: return the original three metrics and their exact configuration sources; no full match'};
const report={passed:false,providerCalls:0,nativeCalls:0,productionWrites:0,checks:[]};
async function harness({answer=paid.output,oldReply=false}={}){
  let state=copy(original),requests=[];const memory=new Map();
  const store={load:async()=>copy(state),save:async v=>{state=copy(v);},
    get:async ref=>memory.has(ref)?copy(memory.get(ref)):disk(ref),
    put:async v=>{const ref=hash(v);memory.set(ref,copy(v));return ref;}};
  const item=state.work.find(w=>w.id===originalWork.id);item.status='ready';item.failure=null;
  delete item.resultRef;delete item.draftOutcomeRef;
  item.operationState.pending=null;item.operationState.correction=null;item.operationState.consecutiveCorrections=0;
  if(oldReply)item.operationState.revalidateReplyRef=call.replyRef;
  else item.operationState.calls=item.operationState.calls.slice(0,item.operationState.calls.findIndex(c=>c.replyRef===call.replyRef));
  const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:request.sessionId,deliberation:{deliberate:async q=>{
    assert.equal(oldReply,false,'historical reply must not be re-bought');requests.push(q);
    let output=typeof answer==='function'?answer(q,requests.length):copy(answer);
    if(q.responseFormat.schema.properties.decisions?.items.properties.workflowBlocker)
      for(const d of output.decisions??[])if(!Object.hasOwn(d,'workflowBlocker'))d.workflowBlocker=null;
    return {output,receipt:{fixture:true,contextHash:q.contextHash,roundKind:q.roundKind,
      sessionId:q.sessionId,roundIndex:q.roundIndex,outputHash:hash(output)}};
  }}});
  const inputs=request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
  let core=await createRosterDecisionWorkflowV1({store,execute:(a,c)=>execute({...a,inputs:copy(inputs)},c)});
  const run=async()=>{
    await core.dispatch({type:'run_ready',workIds:[item.id],concurrency:1});
    const w=state.work.find(w=>w.id===item.id);return {work:w,result:await store.get(w.resultRef)};
  };
  return {run,store,requests,get state(){return state;},async continue(){
    // Cold reopen between correction turns: same saved responsibilities.
    core=await createRosterDecisionWorkflowV1({store,execute:(a,c)=>execute({...a,inputs:copy(inputs)},c)});
    await core.dispatch({type:'continue_work',workId:item.id});return run();}};
}
try{
  const stalled=await harness();let observed=await stalled.run();
  if(observed.result.value.status==='evidence_reads_pending_recheck')observed=await stalled.continue();
  assert.ok(observed.result.value.errors?.some(e=>e.code==='strategy_required_work_has_no_next_step'),
    'actual retain leaves required work pending without a next operation or explicit blocker but is accepted');
  assert.equal(stalled.state.draftRef,original.draftRef);assert.equal(stalled.state.acceptanceGranted,false);
  report.checks.push('actual B unresolved retain is an owner-control correction, not a completed decision');
  const fixed=await harness({answer:(q,n)=>{
    if(n===1)return copy(paid.output);
    const prior=copy(paid.output.decisions[0]);prior.disposition='investigate';prior.nextInvestigation=authorization;
    prior.workflowBlocker=null;prior.publicReason='Fixture: explicitly choose a changed method for the unresolved original predicate.';
    if(q.responseFormat.schema.properties.decision){const {dataQuestions,...decision}=prior;
      return {action:'decide',publicReason:prior.publicReason,reads:[],catalogueQueries:[],questionUpdates:[],newQuestions:[],decision};}
    if(q.responseFormat.schema.properties.inquiryAuthorization)return {action:'authorize_inquiry',publicReason:prior.publicReason,
      reads:[],catalogueQueries:[],questionRepairs:null,decisionPublicReason:prior.publicReason,alternatives:null,
      replacementDecision:null,inquiryAuthorization:authorization};
    return {...copy(paid.output),decisions:[prior]};
  }});
  let repaired=await fixed.run();
  for(let n=0;n<2&&repaired.work.status==='needs_model_choice';n++)repaired=await fixed.continue();
  assert.equal(repaired.work.status,'evidence_ready',JSON.stringify(repaired.result.value.errors));
  assert.equal(repaired.result.value.decisions[0].disposition,'investigate');
  assert.deepEqual(repaired.result.value.decisions[0].nextInvestigation,authorization);
  assert.deepEqual(repaired.result.value.decisions[0].dataQuestions,paid.output.decisions[0].dataQuestions);
  assert.equal(fixed.state.draftRef,original.draftRef);assert.equal(fixed.state.acceptanceGranted,false);
  report.checks.push('same-role automatic command correction survives cold restore; exact ledger retained, no facts invented or experiment executed');
  const old=await harness({oldReply:true});const historical=await old.run();
  assert.ok(!historical.result.value.errors?.some(e=>e.code==='strategy_required_work_has_no_next_step'));
  assert.equal(old.requests.length,0);report.checks.push('old paid reply is not retroactively judged by the new progress contract');
  const {rosterStrategyProgressErrorsV1,rosterStrategyProgressContractV1}=await import('../packages/roster-strategist/roster-strategy-progress-contract-v1.mjs');
  const contract=rosterStrategyProgressContractV1({role:originalWork.role,inputs:originalWork.inputs});
  const blocked=copy(paid.output.decisions[0]);blocked.workflowBlocker={kind:'external_input_required',questionNumbers:[index+1],
    explanation:'Explicit synthetic case: required external opponent setup has not been supplied.',evidenceNumbers:[]};
  assert.deepEqual(rosterStrategyProgressErrorsV1({contract,decision:blocked}),[]);
  blocked.nextInvestigation=authorization;assert.ok(rosterStrategyProgressErrorsV1({contract,decision:blocked}).length);
  blocked.nextInvestigation=null;blocked.workflowBlocker.kind='capability_unavailable';
  assert.ok(rosterStrategyProgressErrorsV1({contract,decision:blocked}).length,'missing-capability claim requires actual cited evidence');
  blocked.workflowBlocker.questionNumbers=[999];assert.ok(rosterStrategyProgressErrorsV1({contract,decision:blocked}).length);
  report.checks.push('explicit unverified blocker stays distinct from authorization; missing source and invalid question references rejected');
  const {projectRosterQuestionSourceUnionV1}=await import('../packages/roster-strategist/roster-review-data-questions-v1.mjs');
  const explicit={decisions:[{evidenceNumbers:[1],dataQuestions:[],workflowBlocker:{evidenceNumbers:[2]}}]};
  assert.deepEqual(projectRosterQuestionSourceUnionV1(explicit,'decisions').output.decisions[0].evidenceNumbers,[1,2]);
  assert.deepEqual(explicit.decisions[0].evidenceNumbers,[1]);
  report.checks.push('blocker citations use the shared exact source-union/read validator without rewriting originals');
  const {projectRosterStrategyProgressReconsiderationV1}=await import('../packages/roster-strategist/roster-strategy-progress-contract-v1.mjs');
  const job=await projectRosterStrategyProgressReconsiderationV1({state:original,readArtifact:disk});assert.ok(job);
  let recovery=copy(original);const saved=new Map();const recoveryStore={load:async()=>copy(recovery),save:async s=>{recovery=copy(s);},
    get:async ref=>saved.has(ref)?copy(saved.get(ref)):disk(ref),put:async v=>{const ref=hash(v);saved.set(ref,copy(v));return ref;}};
  const core=await createRosterDecisionWorkflowV1({store:recoveryStore,execute:async()=>{throw Error('no paid dispatch');}});
  const forged=copy(job);delete forged.inputs.strategyProgressContractChange;
  await assert.rejects(core.dispatch({type:'enqueue',work:[forged]}),/RECONSIDERATION_INVALID/);
  await core.dispatch({type:'enqueue',work:[job]});
  assert.equal(recovery.work.find(w=>w.id===job.investigationFrontierOf).investigationHandoff.decisionId,job.id);
  assert.equal(await projectRosterStrategyProgressReconsiderationV1({state:recovery,readArtifact:recoveryStore.get}),null);
  assert.deepEqual(await disk(result.value.originalReplyRef),paid);
  assert.deepEqual(JSON.parse(await fs.readFile(root+'/workflow.json','utf8')),original);
  report.checks.push('one product-owned contract upgrade atomically replaces the active owner; no original rewrite or repeat grant');
  report.passed=true;
}catch(error){report.error={message:error.message,stack:error.stack?.split('\n').slice(0,6)};process.exitCode=1;}
await fs.writeFile(out,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
