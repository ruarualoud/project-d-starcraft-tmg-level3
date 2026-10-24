// Actual811/814 woke an older map inquiry after the new explicit goal owned
// its replacement. Exercise the real state machine, not a hand-edited checkpoint.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowOwnershipIndexV1} from '../packages/roster-strategist/roster-workflow-ownership-v1.mjs';
import {createRosterWorkflowCompletedMethodHandoffsV1} from '../packages/roster-strategist/roster-workflow-completed-method-handoff-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/projection-owner');
const source=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8')),before=JSON.stringify(source);
const goalId='review-resolution:r2:map_and_arrival',replacementGoalId='p5-current-obligations-v577:r2:map_and_arrival';
const owns=createRosterWorkflowOwnershipIndexV1(source),members=source.work.filter(w=>owns(w.id)?.goalId===goalId);assert(members.length);
assert(members.some(w=>w.status==='ready'&&w.id.includes('completed-method-handoff')),'actual old follow-up remains ready');
let saved=structuredClone(source),executions=0;const artifacts=new Map();
const store={load:async()=>structuredClone(saved),save:async value=>{saved=structuredClone(value);},
  get:async ref=>artifacts.has(ref)?structuredClone(artifacts.get(ref)):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8')),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');artifacts.set(ref,structuredClone(value));return ref;}};
const create=()=>createRosterDecisionWorkflowV1({store,execute:async()=>{executions++;throw Error('EXECUTION_FORBIDDEN');}});
let workflow=await create();
const command={type:'supersede_experiment_goal',goalId,replacementGoalId,
  reason:'Explicit replacement of the prior map investigation; retain its immutable sources and counters without executing its stopped descendants.'};
const receipt=await workflow.dispatch(command);
assert.equal(receipt.replacementGoalId,replacementGoalId);assert.equal(receipt.affectedCount,members.length);
let state=await workflow.inspect();assert(members.every(w=>state.work.find(v=>v.id===w.id).status==='superseded'));
for(const member of members){const after=state.work.find(w=>w.id===member.id);assert.equal(after.resultRef,member.resultRef);
  assert.equal(after.attempt,member.attempt);assert.deepEqual(after.operationState,member.operationState);}
assert.equal(state.draftRef,source.draftRef);assert.deepEqual(state.evidence.map(e=>e.artifactRef),source.evidence.map(e=>e.artifactRef));
assert.equal(state.work.find(w=>w.id===replacementGoalId).status,source.work.find(w=>w.id===replacementGoalId).status);
const eventCount=state.events.length;assert.equal((await workflow.dispatch(command)).alreadySuperseded,true);
assert.equal((await workflow.inspect()).events.length,eventCount);
await assert.rejects(workflow.dispatch({...command,replacementGoalId:'missing-goal'}),{code:'ROSTER_WORKFLOW_GOAL_SUPERSESSION_INVALID'});
workflow=await create();state=await workflow.inspect();
assert(members.every(w=>state.work.find(v=>v.id===w.id).status==='superseded'),'cold fact retention must not revive retired tools');
const handoffs=await createRosterWorkflowCompletedMethodHandoffsV1({state,readArtifact:store.get,tools:{}});
assert(!handoffs.some(w=>owns(w.repairOf)?.goalId===goalId),'superseded question cannot gain a new handoff');
const report=await store.get(receipt.reportRef);assert.equal(report.planApproved,false);assert.equal(report.nativeQueryAutomaticallyResolved,false);
saved=structuredClone(source);const pending=saved.work.find(w=>w.id===members.find(w=>w.role==='roster_workflow_experiment_planner').id);
pending.operationState={...pending.operationState,pending:{contextHash:'unreconciled-paid-dispatch'}};
workflow=await create();await assert.rejects(workflow.dispatch(command),{code:'ROSTER_WORKFLOW_GOAL_HAS_UNRECONCILED_DISPATCH'});
assert.equal(JSON.stringify(source),before);assert.equal(executions,0);
console.log(JSON.stringify({status:'passed',actualOldGoalStopped:true,affected:members.length,coldNoRevival:true,
  newGoalUnaffected:true,sourceEvidenceAndCountersRetained:true,idempotent:true,pendingDispatchProtected:true,
  providerCalls:0,nativeCalls:0,productionWrites:0}));
