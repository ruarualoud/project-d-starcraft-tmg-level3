// Regression boundaries of v860's reproduced NO_READY_WORK failure.
// Reuse the completed injected trace; never replay passed Provider/tool work.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {assessRosterProductHypothesisCycleV1} from '../packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [directory]=process.argv.slice(2),source=JSON.parse(await fs.readFile(path.join(directory,'fixture-checkpoint.json'),'utf8'));
const originalArtifacts=new Map(source.artifacts),draft=originalArtifacts.get(source.state.draftRef);
const records=[];let executionCalls=0;
async function open(){
  let state=structuredClone(source.state);const artifacts=new Map(source.artifacts);
  const store={load:async()=>structuredClone(state),save:async value=>{state=structuredClone(value);},
    get:async ref=>{assert.ok(artifacts.has(ref));return structuredClone(artifacts.get(ref));},
    put:async value=>{const id=hash(value);artifacts.set(id,structuredClone(value));return id;}};
  const workflow=await createRosterDecisionWorkflowV1({store,execute:async()=>{executionCalls++;throw Error('REPLAY_FORBIDDEN');}});
  return {workflow,store};
}
const cold=await open(),coldState=await cold.workflow.inspect();
const cycle=await assessRosterProductHypothesisCycleV1({state:coldState,draft,readArtifact:cold.store.get});
assert.equal(cycle.comparisonExperimentAccepted,true);assert.equal(cycle.comparisonResolved,true);
records.push({case:'cold_restore_completed_comparison',passed:true,ownerWorkId:cycle.ownerWorkId,experiment:cycle.comparisonExperimentId});
const planOnly=await open();
await planOnly.workflow.dispatch({type:'enqueue',work:[{id:'boundary:ordinary-plan-inquiry',role:'roster_workflow_experiment_planner',
  bindings:source.state.scope,inputs:{question:{source:'literal',value:'Explicit Plan-dependent inquiry; not a frozen comparison.'}}}]});
await planOnly.workflow.dispatch({type:'revise_scope',scope:{...source.state.scope,plan:hash('changed-plan')}});
const planState=await planOnly.workflow.inspect();
assert.equal(planState.work.find(w=>w.id===cycle.comparisonExperimentId).status,'evidence_ready');
assert.equal(planState.work.find(w=>w.id===cycle.comparisonExperimentOwnerWorkId).status,'evidence_ready');
assert.equal(planState.work.find(w=>w.id===cycle.comparisonExperimentReviewId).status,'evidence_ready');
assert.equal(planState.work.find(w=>w.id===cycle.comparisonReviewWorkId).status,'superseded');
assert.equal(planState.work.find(w=>w.id==='boundary:ordinary-plan-inquiry').status,'superseded');
records.push({case:'plan_change_keeps_measurement_not_strategy_approval',passed:true});
for(const key of ['army','map','rules','source']){
  const {workflow}=await open();await workflow.dispatch({type:'revise_scope',scope:{...source.state.scope,[key]:hash('changed-'+key)}});
  const state=await workflow.inspect();
  for(const id of [cycle.comparisonExperimentId,cycle.comparisonExperimentOwnerWorkId,cycle.comparisonExperimentReviewId])
    assert.equal(state.work.find(w=>w.id===id).status,'superseded',key+':'+id);
  records.push({case:key+'_change_invalidates_old_comparison',passed:true});
}
assert.equal(executionCalls,0);
const report={schema:'slice272_comparison_scope_v861',source:directory,records,passed:records.length,
  executionCalls,actualProviderCalls:0,productionWrites:0,oldResultsReplayed:false,strategyImprovementProven:false};
await fs.writeFile(path.resolve('build/slice272-comparison-retention-v861.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
