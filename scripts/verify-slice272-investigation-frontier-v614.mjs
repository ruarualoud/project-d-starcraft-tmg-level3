// Regression for actual865 -> 867 -> 869: a completed factual batch must
// return to joint strategy instead of spawning another self-authorized owner.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRosterExperimentOwnerContinuationV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {assessRosterWorkflowReadinessV1} from '../packages/roster-strategist/roster-workflow-readiness-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/projection-owner');
const source=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const original=JSON.stringify(source),artifacts=new Map();
const get=async ref=>artifacts.has(ref)?structuredClone(artifacts.get(ref)):
  JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const request=JSON.parse(await fs.readFile(path.resolve(process.argv[2],'865.request.json'),'utf8'));
const ownerId=request.request.promptNodes[0].workId,owner=source.work.find(w=>w.id===ownerId);
assert(owner);const result=await get(owner.resultRef),summaryIds=result.value.workOrders.map((_,i)=>`${owner.id}:order${i}:summary`);
assert(summaryIds.every(id=>source.work.find(w=>w.id===id)?.status==='evidence_ready'));
// Remove only later work from this isolated call-site fixture, never edit the
// actual state, original replies or Native sources.
const state=structuredClone(source);state.work=state.work.filter(w=>w.id!==`${owner.id}:owner`);
const draft=await get(state.draftRef);
const frontier=createRosterExperimentOwnerContinuationV1({state,owner,result,summaryIds,tools:{},draft,requirements:{acceptanceGranted:false}});
assert(frontier,'completed actual batch must have a return path');
assert.equal(frontier.role,'roster_workflow_strategy_decision','BUG: factual owner still self-authorizes the next inquiry');
assert.equal(frontier.investigationFrontierOf,owner.experimentGoalId);
assert.equal(frontier.experimentGoalId,undefined,'strategy is not another fact-owner generation');
assert.deepEqual(frontier.inputs.wholeDraft.value.plan,draft.plan);
assert.deepEqual(frontier.inputs.wholeDraft.value.candidateInput,draft.candidateInput);
assert.deepEqual(frontier.inputs.investigationFrontier.value.unresolvedQuestions,result.value.unresolvedQuestions);
assert.equal(frontier.inputs.investigationFrontier.value.acceptanceGranted,false);
assert(summaryIds.every(id=>Object.values(frontier.inputs).some(i=>i.source==='evidence'&&i.id===`role:${id}`)));
let saved=structuredClone(source);const executed=[];
const store={load:async()=>structuredClone(saved),save:async s=>{saved=structuredClone(s);},get,
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');artifacts.set(ref,structuredClone(value));return ref;}};
const create=()=>createRosterDecisionWorkflowV1({store,execute:async a=>{executed.push(a.workId);return {kind:'proposal',value:{publicReason:'Isolated scheduler observation only; not a real strategy decision.'}};}});
let workflow=await create();
await workflow.dispatch({type:'enqueue',work:[frontier]});
const command={type:'hold_experiment_for_strategy',goalId:owner.experimentGoalId,decisionId:frontier.id,
  reason:'Actual repeated inquiry must return to a joint decision; necessary unknowns and original sources remain.'};
const held=await workflow.dispatch(command);assert.equal(held.planApproved,false);
const afterHold=await workflow.inspect();
assert.deepEqual(afterHold.work.find(w=>w.id===owner.id).operationState,owner.operationState,'paid history/counters unchanged');
assert.equal(afterHold.draftRef,source.draftRef);
assert.equal((await workflow.dispatch(command)).alreadyHeld,true,'same boundary is idempotent');
const ran=await workflow.dispatch({type:'run_ready',concurrency:2,workIds:[frontier.id]});
assert.deepEqual(ran.map(w=>w.id),[frontier.id]);assert.deepEqual(executed,[frontier.id]);
assert(!executed.some(id=>id.includes(':order')),'no Native query or old repair may execute beside strategy');
workflow=await create();
const cold=await workflow.inspect();assert.equal(cold.work.find(w=>w.id===owner.experimentGoalId).investigationHandoff.decisionId,frontier.id);
const pending=saved.work.find(w=>w.id===owner.experimentGoalId);pending.investigationHandoff=null;
const child=saved.work.find(w=>w.id.startsWith(owner.experimentGoalId+':')&&w.role==='roster_workflow_tool');
child.operationState={...child.operationState,pending:{contextHash:'unreconciled-paid-dispatch'}};
workflow=await create();await assert.rejects(workflow.dispatch(command),{code:'ROSTER_WORKFLOW_GOAL_HAS_UNRECONCILED_DISPATCH'});
const read=assessRosterWorkflowReadinessV1({draft,verdict:await get(draft.builderVerdictRef),work:cold.work});
assert(read.activeWork.some(w=>w.status==='awaiting_strategy_resolution'&&w.id===owner.experimentGoalId),'handoff must not make necessary inquiry disappear from release inventory');
assert.equal(JSON.stringify(source),original);
console.log(JSON.stringify({passed:true,actualOwner:owner.id,realProviderCalls:0,realNativeCalls:0,productionWrites:0,
  checks:['actual batch returns joint strategy','whole army/Plan and unknowns preserved','same-goal held and cold-stable','only selected decision runs','unreconciled dispatch protected','open question still blocks release']}));
