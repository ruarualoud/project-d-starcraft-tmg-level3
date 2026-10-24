// Reproduce the actual B r7 stranded comparison. All writes stay in memory,
// except this small diagnostic report. No model, Native action or run mutation.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowGraphV1} from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';
const root=new URL('../build/slice272-product-generation-v645-8aBuEV/workspace/decision-workflows/decision-7f410254-23ff-42dd-8470-e63d4e2c3dac/',import.meta.url);
const report={passed:false,providerCalls:0,nativeCalls:0,productionWrites:0,checks:[]};
try{
  const original=await readFile(new URL('workflow.json',root),'utf8'),saved=JSON.parse(original);
  assert.equal(saved.draftRevision,7);
  const goal=saved.work.find(w=>w.experimentScopePolicy==='frozen_comparison_v1'&&w.investigationHandoff);
  const frontier=saved.work.find(w=>w.id===goal.investigationHandoff.decisionId);
  const owner=saved.work.find(w=>w.id===frontier.investigationOwnerId);
  const commit=saved.events.findLast(e=>e.type==='draft_committed');
  assert.equal(owner.status,'superseded');assert.notEqual(commit.workId,frontier.id);
  assert.equal(owner.inputs.currentDraft.id,'draft:r6:summary');
  const cache=new Map();
  async function read(ref){if(!cache.has(ref))cache.set(ref,JSON.parse(await readFile(new URL(`artifacts/${ref}.json`,root),'utf8')));return structuredClone(cache.get(ref));}
  async function harness(input=saved){
    let snapshot=structuredClone(input);const local=new Map(),calls=[];
    const store={load:async()=>structuredClone(snapshot),save:async s=>{snapshot=structuredClone(s);},
      get:async ref=>local.has(ref)?structuredClone(local.get(ref)):read(ref),
      put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');local.set(ref,structuredClone(value));return ref;}};
    const open=()=>createRosterDecisionWorkflowV1({store,execute:async assignment=>{calls.push(assignment);return {kind:'interpretation',value:{injected:true},conditions:['not an accepted conclusion']};}});
    return {workflow:await open(),open,calls};
  }
  const h=await harness(),restored=await h.workflow.dispatch({type:'reconcile_plan_revision_handoffs'});
  assert.equal(restored.length,1,'nested r7 commit must return original comparison despite prior currentDraft invalidation');
  const state=await h.workflow.inspect(),next=state.work.find(w=>w.id===restored[0].workId);
  assert.ok(createRosterWorkflowGraphV1(state).canRun(next.id));
  assert.equal(next.methodContinuationOf,owner.id);assert.equal(next.experimentGoalId,goal.id);
  assert.equal(next.inputs.currentDraft.id,'draft:r7:summary');
  for(const key of ['question','originalNecessaryQuestions','comparisonPurpose','sourceReview','rejectedConclusion'])assert.deepEqual(next.inputs[key],owner.inputs[key]);
  assert.equal(next.experimentReviewRound,owner.experimentReviewRound);
  assert.equal(next.experimentBatchIndex,owner.experimentBatchIndex);
  assert.equal(next.inputs.planRevisionReturn.value.factApprovalGranted,false);
  assert.equal(state.acceptanceGranted,false);
  assert.equal(state.work.find(w=>w.id===goal.id).investigationHandoff,undefined);
  for(const old of saved.work){const now=state.work.find(w=>w.id===old.id);assert.equal(now.resultRef,old.resultRef);assert.deepEqual(now.operationState,old.operationState);if(old.id!==goal.id)assert.equal(now.status,old.status);}
  report.checks.push('actual nested r7 return preserves original questions, source objections, counters, old status/results and no approval');
  const cold=await h.open();assert.deepEqual(await cold.dispatch({type:'reconcile_plan_revision_handoffs'}),[]);
  const result=await cold.dispatch({type:'run_ready',workIds:[next.id],concurrency:1});
  assert.equal(result[0].status,'evidence_ready');assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].inputs.currentDraft.validity,'current');
  assert.deepEqual(h.calls[0].inputs.originalNecessaryQuestions.value,owner.inputs.originalNecessaryQuestions.value);
  report.checks.push('cold resume dispatches new current draft once; injected receiver sees original necessary questions');
  const cases={
    unrelated_writer:s=>{s.events.findLast(e=>e.type==='draft_committed').workId='unrelated';},
    pending:s=>{s.work.find(w=>w.id===owner.id).operationState.pending={requestRef:'unknown'};},
    replaced_goal:s=>{s.work.find(w=>w.id===goal.id).supersededByGoalId='replacement';},
    unrelated_retirement:s=>{delete s.work.find(w=>w.id===owner.id).inputs.currentDraft;},
    older_draft_dependency:s=>{s.work.find(w=>w.id===owner.id).inputs.currentDraft.id='draft:r5:summary';},
    different_source:s=>{s.evidence.find(e=>e.id===owner.inputs.sourceReview.id).bindings.rules='different';},
    unfinished:s=>{s.work.find(w=>w.id===commit.workId).status='ready';},
  };
  for(const key of ['army','rules','map','source'])cases['changed_'+key]=s=>{s.scope[key]='changed';};
  for(const [name,mutate]of Object.entries(cases)){const altered=structuredClone(saved);mutate(altered);const x=await harness(altered);assert.deepEqual(await x.workflow.dispatch({type:'reconcile_plan_revision_handoffs'}),[],name);report.checks.push(name+' remains ineligible');}
  assert.equal(await readFile(new URL('workflow.json',root),'utf8'),original);
  report.passed=true;
}catch(error){report.error={message:error.message,stack:error.stack};process.exitCode=1;}
await writeFile(new URL(`../build/slice272-nested-plan-return-v917-${process.argv[2]??'probe'}.json`,import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
