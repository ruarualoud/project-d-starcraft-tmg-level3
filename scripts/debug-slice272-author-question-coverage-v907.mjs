// Actual B omitted one of its two delegated source questions. Exercise the
// real product role/core with the paid reply; never call a Provider or Native.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {projectRosterAuthorQuestionReconsiderationV1} from '../packages/roster-strategist/roster-author-question-contract-v1.mjs';
const [root,out,mode]=process.argv.slice(2),clone=structuredClone;
const original=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const actual=original.work.find(w=>w.resultRef==='84678ea6322031ab97247b16125435beff766517ad3bff1683e6a9948764e585');
const disk=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const result=await disk(actual.resultRef),paid=await disk(result.value.originalReplyRef);
const last=actual.operationState.calls.find(c=>c.replyRef===result.value.originalReplyRef),request=await disk(last.requestRef);
const questions=actual.inputs.investigationFrontier.value.unresolvedQuestions;
const missing=questions.filter(q=>!paid.output.decisions[0].dataQuestions.some(item=>item.question===q));
const report={passed:false,providerCalls:0,nativeCalls:0,productionWrites:0,checks:[]};
async function inject(output,{revalidate=false}={}){
  let state=clone(original);const memory=new Map();let captured;
  const get=async ref=>memory.has(ref)?clone(memory.get(ref)):disk(ref);
  const store={load:async()=>clone(state),save:async v=>{state=clone(v);},get,
    put:async v=>{const ref=hash(v);memory.set(ref,clone(v));return ref;}};
  const item=state.work.find(w=>w.id===actual.id);item.status='ready';item.failure=null;
  delete item.resultRef;delete item.draftOutcomeRef;
  if(revalidate)item.operationState.revalidateReplyRef=last.replyRef;
  else item.operationState.calls=item.operationState.calls.slice(0,item.operationState.calls.findIndex(c=>c.replyRef===last.replyRef));
  item.operationState.pending=null;item.operationState.correction=null;item.operationState.consecutiveCorrections=0;
  const role=createRosterWorkflowReadRoleExecutorV1({store,sessionId:request.sessionId,
    deliberation:{deliberate:async q=>{assert.equal(revalidate,false,'historical revalidation must not call the Provider');captured=q;return {output:clone(output),receipt:{fixture:true,
      contextHash:q.contextHash,roundKind:q.roundKind,sessionId:q.sessionId,roundIndex:q.roundIndex,outputHash:hash(output)}};}}});
  const inputs=request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
  const core=await createRosterDecisionWorkflowV1({store,execute:(a,c)=>role({...a,inputs:clone(inputs)},c)});
  await core.dispatch({type:'run_ready',workIds:[item.id],concurrency:1});
  let after=state.work.find(w=>w.id===item.id),reply=await get(after.resultRef);
  if(after.status==='needs_model_choice'&&reply.value.status==='evidence_reads_pending_recheck'){
    await core.dispatch({type:'continue_work',workId:item.id});
    await core.dispatch({type:'run_ready',workIds:[item.id],concurrency:1});
    after=state.work.find(w=>w.id===item.id);reply=await get(after.resultRef);
  }
  assert.equal(state.draftRef,original.draftRef);
  assert.equal(state.acceptanceGranted,false);
  return {state,after,reply,captured,get};
}
try{
  assert.equal(questions.length,2);assert.equal(missing.length,1);
  if(mode==='historical-revalidation'){
    assert.ok(!request.promptNodes.some(n=>n.kind==='author_original_question_contract'));
    const historical=await inject(paid.output,{revalidate:true});
    assert.ok(!historical.reply.value.errors?.some(e=>e.code==='author_original_question_coverage'),
      'historical paid reply was rejected under an original-question contract it never received');
    assert.equal(historical.after.status,'evidence_ready',JSON.stringify(historical.reply.value.errors));
    assert.deepEqual(historical.reply.value.decisions[0].dataQuestions,paid.output.decisions[0].dataQuestions);
    assert.equal(historical.captured,undefined);
    assert.deepEqual(await disk(result.value.originalReplyRef),paid);
    assert.deepEqual(JSON.parse(await fs.readFile(root+'/workflow.json','utf8')),original);
    report.checks.push('old paid reply uses its actual delivered coverage contract; immutable original and pending facts retained, no Provider or final approval');
  }else{
  const bad=await inject(paid.output);
  const error=bad.reply.value.errors?.find(e=>e.code==='author_original_question_coverage');
  assert.ok(error,'actual source-resolution reply omitted an original question but was accepted as a completed decision');
  assert.deepEqual(error.missingQuestions,missing);
  assert.ok(bad.captured.promptNodes.some(n=>n.kind==='author_original_question_contract'&&n.version===1));
  report.checks.push('actual paid omission is a scoped correction; no decision/mutation/Native dispatch');
  const complete=clone(paid.output);
  complete.decisions[0].dataQuestions.push({question:missing[0],classification:'necessary_fact',
    publicReason:'Explicit test fixture: this original question still needs its configuration source; do not invent an answer.',evidenceNumbers:[]});
  const normal=await inject(complete);
  assert.equal(normal.after.status,'evidence_ready',JSON.stringify(normal.reply.value.errors));
  assert.deepEqual(normal.reply.value.decisions[0].dataQuestions.map(q=>[q.question,q.classification]),
    complete.decisions[0].dataQuestions.map(q=>[q.question,q.classification]));
  assert.equal(normal.reply.value.decisions[0].nextInvestigation,null);
  assert.equal(normal.reply.value.decisions[0].requiredData.length,5);
  report.checks.push('complete accounting preserves unrelated ledger and local unknown; coverage is not factual or Plan acceptance');
  const duplicate=clone(complete);duplicate.decisions[0].dataQuestions.push(clone(complete.decisions[0].dataQuestions.at(-1)));
  const doubled=await inject(duplicate);
  assert.ok(doubled.reply.value.errors.some(e=>e.code==='author_original_question_coverage'&&e.duplicateQuestions.includes(missing[0])));
  assert.deepEqual(await disk(result.value.originalReplyRef),paid);
  assert.deepEqual(JSON.parse(await fs.readFile(root+'/workflow.json','utf8')),original);
  report.checks.push('duplicate original question rejected; actual saved state and paid reply unchanged');
  let recovered=clone(original);const memory=new Map();
  const recoveryStore={load:async()=>clone(recovered),save:async v=>{recovered=clone(v);},
    get:async ref=>memory.has(ref)?clone(memory.get(ref)):disk(ref),
    put:async v=>{const ref=hash(v);memory.set(ref,clone(v));return ref;}};
  const job=await projectRosterAuthorQuestionReconsiderationV1({state:recovered,readArtifact:recoveryStore.get});
  assert.ok(job);assert.equal(job.reconsidersFrontierOf,actual.id);
  assert.deepEqual(job.inputs.authorQuestionContractChange.value.error.missingQuestions,missing);
  const recoveryCore=await createRosterDecisionWorkflowV1({store:recoveryStore,execute:async()=>{throw Error('no model execution');}});
  const forged=clone(job);delete forged.inputs.authorQuestionContractChange;
  await assert.rejects(recoveryCore.dispatch({type:'enqueue',work:[forged]}),/RECONSIDERATION_INVALID/);
  await recoveryCore.dispatch({type:'enqueue',work:[job]});
  assert.equal(recovered.work.find(w=>w.id===job.investigationFrontierOf).investigationHandoff.decisionId,job.id);
  assert.equal(recovered.work.find(w=>w.id===actual.id).resultRef,actual.resultRef);
  const reopened=await createRosterDecisionWorkflowV1({store:recoveryStore,execute:async()=>{throw Error('no model execution');}});
  assert.equal((await reopened.inspect()).work.find(w=>w.id===job.id).status,'ready');
  assert.equal(await projectRosterAuthorQuestionReconsiderationV1({state:recovered,readArtifact:recoveryStore.get}),null);
  report.checks.push('same product atomic owner update, cold restore and exactly-once repair; forged/missing contract denied');
  }
  report.passed=true;
}catch(error){report.error={message:error.message,stack:error.stack?.split('\n').slice(0,6)};process.exitCode=1;}
await fs.writeFile(out,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
