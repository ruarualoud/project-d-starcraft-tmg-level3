// Real B r6 orphan: Plan-only commit superseded its author while a frozen
// comparison retained the old held frontier. No Provider/Native/production writes.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowGraphV1} from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';
const root=new URL('../build/slice272-product-generation-v645-8aBuEV/workspace/decision-workflows/decision-7f410254-23ff-42dd-8470-e63d4e2c3dac/',import.meta.url);
const report={passed:false,providerCalls:0,nativeCalls:0,productionWrites:0,checks:[]};
try{
  const original=await readFile(new URL('workflow.json',root),'utf8'),saved=JSON.parse(original);
  const goal=saved.work.find(w=>w.experimentScopePolicy==='frozen_comparison_v1'&&w.investigationHandoff);
  const frontier=saved.work.find(w=>w.id===goal.investigationHandoff.decisionId);
  const owner=saved.work.find(w=>w.id===frontier.investigationOwnerId);
  const commit=saved.events.findLast(e=>e.type==='draft_committed');
  assert.equal(saved.draftRevision,6);assert.equal(frontier.status,'superseded');
  const artifactCache=new Map();
  const read=async ref=>{if(!artifactCache.has(ref))artifactCache.set(ref,JSON.parse(await readFile(new URL(`artifacts/${ref}.json`,root),'utf8')));return structuredClone(artifactCache.get(ref));};
  async function harness(input=saved){
    let snapshot=structuredClone(input),calls=[];const local=new Map();
    const store={load:async()=>structuredClone(snapshot),save:async s=>{snapshot=structuredClone(s);},
      get:async ref=>local.has(ref)?structuredClone(local.get(ref)):read(ref),
      put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');local.set(ref,structuredClone(value));return ref;}};
    const open=()=>createRosterDecisionWorkflowV1({store,execute:async a=>{calls.push(a);return {kind:'interpretation',value:{debugOnly:true},conditions:['Injected result; not a real conclusion']};}});
    return {workflow:await open(),open,calls,store};
  }
  const h=await harness();
  const restored=await h.workflow.dispatch({type:'reconcile_plan_revision_handoffs'});
  assert.equal(restored.length,1,'Plan-only commit must return the original held question');
  const state=await h.workflow.inspect(),next=state.work.find(w=>w.id===restored[0].workId);
  assert.ok(createRosterWorkflowGraphV1(state).canRun(next.id));
  assert.equal(next.methodContinuationOf,owner.id);assert.equal(next.experimentGoalId,goal.id);
  assert.equal(next.experimentReviewRound,owner.experimentReviewRound);
  assert.equal(next.experimentBatchIndex,owner.experimentBatchIndex);
  for(const key of ['question','originalNecessaryQuestions','comparisonPurpose','sourceReview','rejectedConclusion'])
    assert.deepEqual(next.inputs[key],owner.inputs[key]);
  assert.equal(next.inputs.currentDraft.id,'draft:r6:summary');
  assert.equal(next.inputs.planRevisionReturn.value.factApprovalGranted,false);
  assert.equal(next.inputs.planRevisionReturn.value.planApprovalGranted,false);
  assert.equal(next.inputs.sameSourceReviewRequest,undefined);assert.equal(next.inputs.scopedStrategyReturn,undefined);
  assert.equal(state.work.find(w=>w.id===goal.id).investigationHandoff,undefined);
  for(const old of saved.work){const retained=state.work.find(w=>w.id===old.id);assert.equal(retained.resultRef,old.resultRef);assert.deepEqual(retained.operationState,old.operationState);}
  assert.equal(state.work.find(w=>w.id===commit.workId).status,'superseded');
  report.checks.push('real B r6: original question/counters/sources retained; one runnable return; no fact or Plan approval');
  const reopened=await h.open();assert.deepEqual(await reopened.dispatch({type:'reconcile_plan_revision_handoffs'}),[]);
  const ran=await reopened.dispatch({type:'run_ready',workIds:[next.id],concurrency:1});
  assert.equal(ran[0].status,'evidence_ready',JSON.stringify(ran[0].failure));
  assert.equal(h.calls.length,1);assert.equal(h.calls[0].inputs.currentDraft.validity,'current');
  assert.deepEqual(h.calls[0].inputs.question.value,owner.inputs.question.value);
  report.checks.push('cold resume idempotent; real core dispatch resolves current draft plus exact original sources once');
  for(const field of ['army','rules','map','source']){
    const altered=structuredClone(saved);altered.scope[field]='changed-'+field;
    const other=await harness(altered);assert.deepEqual(await other.workflow.dispatch({type:'reconcile_plan_revision_handoffs'}),[]);
  }
  for(const kind of ['unrelated_writer','pending','replaced_goal']){
    const altered=structuredClone(saved);
    if(kind==='unrelated_writer')altered.events.findLast(e=>e.type==='draft_committed').workId='unrelated';
    if(kind==='pending')altered.work.find(w=>w.id===owner.id).operationState.pending={requestRef:'not_completed'};
    if(kind==='replaced_goal')altered.work.find(w=>w.id===goal.id).supersededByGoalId='new_goal';
    const other=await harness(altered);assert.deepEqual(await other.workflow.dispatch({type:'reconcile_plan_revision_handoffs'}),[]);
  }
  assert.equal(await readFile(new URL('workflow.json',root),'utf8'),original);
  report.checks.push('army/rules/map/source changes, unrelated writer, pending dispatch, replaced goal cannot authorize return; production unchanged');
  report.passed=true;
}catch(error){report.error={message:error.message,stack:error.stack};process.exitCode=1;}
await writeFile(new URL(`../build/slice272-plan-revision-return-v914-${process.argv[2]??'probe'}.json`,import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
