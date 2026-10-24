// Reproduce e5002 -> e5004: a saved, successful evidence read was treated as
// blocked until advance() continued it, buying a competing method handoff.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRosterWorkflowGraphV1} from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';
import {createRosterWorkflowCompletedMethodHandoffsV1} from '../packages/roster-strategist/roster-workflow-completed-method-handoff-v1.mjs';

const root=process.argv[2];
const read=async ref=>JSON.parse(await readFile(`${root}/artifacts/${ref}.json`,'utf8'));
const saved=JSON.parse(await readFile(`${root}/workflow.json`,'utf8'));
const state=structuredClone(saved);
const summary=state.work.find(w=>w.id.endsWith(':completion-revalidation-v1:order0:summary'));
const choice=state.work.find(w=>w.id.endsWith(':completion-revalidation-v1:order0:repair-choice'));
assert.ok(summary&&choice,'actual saved continuation and dependent choice required');
const result=await read(summary.resultRef);
assert.equal(result.continuation,true);
assert.equal(result.value.status,'reads_completed');
// Reconstruct only the observed dispatch boundary, without altering any source.
summary.status='needs_model_choice';
const handoffId=choice.choiceOf+':completed-method-handoff';
state.work=state.work.filter(w=>w.id!==handoffId);
const graph=createRosterWorkflowGraphV1(state);
assert.equal(graph.canProgress(choice.id),true,
  'a resumable evidence reader must keep the original owner progressing');
assert.equal(graph.canContinue(summary.id),true);
const handoffs=await createRosterWorkflowCompletedMethodHandoffsV1({state,readArtifact:read,tools:{}});
assert.equal(handoffs.some(w=>w.repairOf===choice.choiceOf),false,
  'do not create a second planner between saving a read and continuing its role');

const blocked=structuredClone(state);
const original=blocked.work.find(w=>w.id===choice.choiceOf);
assert.equal(original.role,'roster_workflow_tool');
assert.equal(original.status,'needs_model_choice');
assert.equal(createRosterWorkflowGraphV1(blocked).canContinue(original.id),false);
assert.equal(createRosterWorkflowGraphV1(blocked).canProgress(original.id),false);
for(const [label,change] of [
  ['missing saved result',w=>{delete w.resultRef;}],
  ['failed continuation',w=>{w.failure={code:'CAPTURED_FAILURE'};}],
  ['provider request pending',w=>{w.operationState={pending:{requestRef:'unknown-outcome'}};}],
  ['returned ownership',w=>{w.branchReturnRef='retained-return';}],
  ['stale bindings',w=>{w.bindings={...w.bindings,army:'different-army'};}],
]){
  const next=structuredClone(state);change(next.work.find(w=>w.id===summary.id));
  const g=createRosterWorkflowGraphV1(next);
  assert.equal(g.canContinue(summary.id),false,label);
  assert.equal(g.canProgress(choice.id),false,label);
}
const held=structuredClone(state),heldSummary=held.work.find(w=>w.id===summary.id);
heldSummary.experimentGoalId='fixture-held-goal';
held.work.push({id:'fixture-held-goal',status:'evidence_ready',bindings:state.scope,investigationHandoff:{decisionId:'awaiting-strategy'}});
assert.equal(createRosterWorkflowGraphV1(held).canContinue(summary.id),false);
assert.equal(createRosterWorkflowGraphV1(held).canProgress(choice.id),false);
assert.deepEqual(JSON.parse(await readFile(`${root}/workflow.json`,'utf8')),saved);
console.log(JSON.stringify({pass:true,actualBoundary:'e5002-e5004',singleReturnOwner:true,
  nativeFailureStillBlocked:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
