// Actual nested repair chain was still progressing when a second handoff
// planner was created. Reconstruct that single dispatch boundary, no tools.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRosterWorkflowCompletedMethodHandoffsV1} from '../packages/roster-strategist/roster-workflow-completed-method-handoff-v1.mjs';
import {createRosterWorkflowGraphV1} from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';
const root=process.argv[2],read=async ref=>JSON.parse(await readFile(`${root}/artifacts/${ref}.json`,'utf8'));
const source=JSON.parse(await readFile(`${root}/workflow.json`,'utf8'));
const handoff=source.work.find(w=>w.completedMethodHandoff
  &&w.repairOf.endsWith(':exchange-marine-inrange-repaired:input-repair:order0:apply-formation'));
assert.ok(handoff);
const targetId=handoff.repairOf;
const inner=source.work.find(w=>w.id===targetId+':observed-choice:order0:repair-choice:order0:apply-formation:input-repair');
assert.ok(inner,'actual nested input-repair owner required');
const graph=createRosterWorkflowGraphV1(source);
const remove=new Set([
  ...graph.descendants(handoff.id,{kinds:['execution','repair','choice','continuation']}).map(w=>w.id),
  ...graph.descendants(inner.id,{kinds:['execution','repair','choice','continuation'],includeSelf:false}).map(w=>w.id),
]);
const state=structuredClone(source);
state.work=state.work.filter(w=>!remove.has(w.id));
// This is the captured pre-response state: the original repair is in flight.
const running=state.work.find(w=>w.id===inner.id);
running.status='running';running.operationState={...running.operationState,pending:{requestRef:'captured-inflight-boundary'}};
const handoffs=await createRosterWorkflowCompletedMethodHandoffsV1({state,readArtifact:read,tools:{}});
assert.equal(handoffs.some(w=>w.repairOf===targetId),false,
  'an active nested original repair must own the return; do not buy a competing parent handoff');
const chain=createRosterWorkflowGraphV1(state).pendingChain(inner.id);
assert.ok(chain.some(w=>w.id===targetId));
assert.ok(chain.length>=2,'do not merely special-case one direct relation');
assert.equal(createRosterWorkflowGraphV1(state).pendingTarget(inner.id).id,inner.repairOf);
console.log(JSON.stringify({pass:true,actualHandoff:handoff.id,nestedLevels:chain.length,
  competingHandoffSuppressed:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
