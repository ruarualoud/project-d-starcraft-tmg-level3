// Reproduce the actual v989 repeated inspection: it can stop before summary,
// but has no explicit, source-preserving way to return the stopped method.
// In-memory workflow only; no Provider, Native, room or production writes.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowGraphV1} from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';
import {projectRepeatedInspectionOnlyBatchV1} from '../packages/roster-strategist/roster-experiment-progress-v1.mjs';
const dir=process.argv[2],copy=structuredClone,memory=new Map(),checks=[];
const original=JSON.parse(await fs.readFile(dir+'/workflow.json','utf8')),before=hash(original);
const get=async ref=>memory.has(ref)?copy(memory.get(ref)):JSON.parse(await fs.readFile(dir+'/artifacts/'+ref+'.json','utf8'));
const put=async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;};
const summary=original.work.find(w=>w.id.endsWith(':method:48db98425cf42c95:order0:summary'));
assert(summary,'actual stopped batch fixture missing');
const owner=original.work.find(w=>w.id===summary.experimentOwnerId),ownerResult=await get(owner.resultRef);
let local=copy(original),dispatched=[];
const store={get,put,load:async()=>copy(local),save:async value=>{local=copy(value);}};
const proof=await projectRepeatedInspectionOnlyBatchV1({state:local,workId:summary.id,store});assert(proof);
const command={type:'handoff_repeated_inspection',workId:summary.id,expectedOwnerResultRef:owner.resultRef,
  engineeringChangeId:'v991-explicit-no-progress-owner-return',reason:'Repair the source-preserving control return; do not retry this method'};
const make=()=>createRosterDecisionWorkflowV1({store,execute:async a=>{
  dispatched.push(a.workId);throw Object.assign(Error('CAPTURE_NO_REAL_CALL'),{dispatchOutcome:'not_dispatched'});
}});
// Write each completed gate immediately: observer/session timeout must not
// discard all already-completed evidence or require another whole replay.
const check=async(name,fn)=>{
  try{await fn();checks.push({name,ok:true});}catch(e){checks.push({name,ok:false,error:e.message});}
  console.log(JSON.stringify({completedGate:checks.at(-1)}));
};
let workflow=await make(),handoff;
await check('actual_repeat_has_explicit_owner_return_without_paid_summary',async()=>{
  handoff=await workflow.dispatch(command);
  const state=await workflow.inspect(),stopped=state.work.find(w=>w.id===summary.id);
  const next=state.work.find(w=>w.id===handoff.decisionId),graph=createRosterWorkflowGraphV1(state);
  assert.equal(next.role,'roster_workflow_strategy_decision');
  assert.equal(stopped.resultRef,summary.resultRef,'must not fabricate a summary result');
  assert.equal(stopped.operationState.noProgressStop.reason,proof.reason);
  assert.equal(stopped.noProgressHandoffRef,handoff.reportRef);
  assert.equal(graph.canRun(summary.id),false);
  assert.equal(graph.canRun(next.id),true);
  assert.deepEqual(next.inputs.investigationFrontier.value.unresolvedQuestions,ownerResult.value.unresolvedQuestions);
  assert.deepEqual(next.inputs.wholeDraft.value.plan,(await get(state.draftRef)).plan);
  assert.deepEqual(next.inputs.noProgressBoundary.value.retainedObservation,proof);
  for(const [key,id]of [['originalObservation',proof.originalWorkId],['repeatedObservation',proof.repeatedWorkId]])
    assert.equal(next.inputs[key].id,`tool:${id}`);
  assert.equal(next.inputs.noProgressBoundary.value.factsApproved,false);
  assert.equal(next.inputs.noProgressBoundary.value.planApproved,false);
  assert.equal(dispatched.length,0);
  assert.deepEqual(state.work.find(w=>w.id===owner.id),owner,'paid owner record unchanged');
});
if(handoff){
  await check('explicit_return_is_idempotent_and_cold_safe',async()=>{
    const snapshot=hash(local);workflow=await make();
    const again=await workflow.dispatch(command);
    assert.equal(again.reportRef,handoff.reportRef);assert.equal(again.alreadyHeld,true);
    assert.equal(hash(local),snapshot);
  });
  await check('only_new_owner_runs_not_the_stopped_method',async()=>{
    await workflow.dispatch({type:'run_ready',concurrency:1,workIds:[summary.id,handoff.decisionId]});
    assert.deepEqual(dispatched,[handoff.decisionId]);
  });
  await check('removing_hold_does_not_remove_the_loop_stop',async()=>{
    delete local.work.find(w=>w.id===owner.experimentGoalId).investigationHandoff;
    workflow=await make();
    await assert.rejects(()=>workflow.dispatch({type:'run_ready',workIds:[summary.id]}),e=>e.code==='ROSTER_WORKFLOW_NO_PROGRESS_STOP');
  });
  await check('changed_observation_cannot_use_repeat_handoff',async()=>{
    local=copy(original);const source=local.work.find(w=>w.id===proof.repeatedWorkId),body=copy(await get(source.resultRef));
    delete body.value.queryReuse;source.resultRef=await put(body);workflow=await make();
    await assert.rejects(()=>workflow.dispatch(command),e=>e.code==='ROSTER_WORKFLOW_NO_PROGRESS_HANDOFF_INVALID');
  });
  await check('wrong_owner_revision_and_inflight_dispatch_rejected',async()=>{
    local=copy(original);workflow=await make();
    await assert.rejects(()=>workflow.dispatch({...command,expectedOwnerResultRef:'not-the-selected-owner'}),
      e=>e.code==='ROSTER_WORKFLOW_NO_PROGRESS_HANDOFF_INVALID');
    local.work.find(w=>w.id===summary.id).operationState={pending:{contextHash:'inflight'}};workflow=await make();
    await assert.rejects(()=>workflow.dispatch(command),e=>e.code==='ROSTER_WORKFLOW_NO_PROGRESS_HANDOFF_INVALID');
  });
}
assert.equal(hash(original),before);
console.log(JSON.stringify({checks,injectedDispatches:dispatched,realProviderCalls:0,nativeCalls:0,productionWrites:0}));
assert(checks.every(c=>c.ok),'Stopped repeated method still lacks a safe owner return');
