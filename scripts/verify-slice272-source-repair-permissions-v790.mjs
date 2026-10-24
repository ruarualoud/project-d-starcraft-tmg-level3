// Real e5463: the source explicitly asks for formation_scene, but the local
// repair permission only allows inspect/spatial/probability.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {rosterWorkflowChoiceContractV1} from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const root=process.argv[2],state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const ref='fedb220b3e50b0d17c5ab5ba49f4892a694c2d5d6453b281d5a46f24a3093e0b';
const owner=state.work.find(w=>w.resultRef===ref),result=(await get(ref)).value;
const order=result.failedWorkOrders[0].order,entry=state.evidence[569];
assert.equal(result.failedWorkOrders[0].error.code,'ROSTER_WORKFLOW_CHOICE_SCOPE_EXCEEDED');
const context={scope:state.scope,namespace:'v790',evidenceDirectory:state.evidence,
  comparisonPurpose:{status:'read',evidenceId:entry.id,evidenceNumber:570,
    value:(await get(entry.artifactRef)).proposals[0].comparisonPurpose}};
const before=structuredClone(order);
const contract=rosterWorkflowChoiceContractV1({state,workId:owner.id});
if(!process.argv.includes('--remaining-only')){
  assert(contract.allowedOperations.includes('formation_scene'),
    'source-owned geometry repair must permit explicitly selecting its static option');
  assert(!contract.allowedOperations.includes('scenario'));
  assert(!contract.allowedOperations.includes('native_action'));
}
// The unchanged paid order has another genuine error: selection instead of
// selections. The repaired scope must expose that precise input error, not
// silently fix it or grant the order success.
assert.throws(()=>compileRosterWorkflowExperimentV1({...context,order,choiceContract:contract}),
  error=>error.code==='ROSTER_WORKFLOW_FORMATION_SOURCE_SELECTION_INVALID');
assert.deepEqual(order,before,'do not rewrite the saved model order');
const unrelated=structuredClone(state),other=unrelated.work.find(w=>w.id===owner.id);
other.inputs.task.value.failure.queryRepair.sourceContract='unrelated_input_error';
assert(!rosterWorkflowChoiceContractV1({state:unrelated,workId:owner.id}).allowedOperations.includes('formation_scene'));
const after=structuredClone(order);after.steps.reverse();
assert.throws(()=>compileRosterWorkflowExperimentV1({...context,order:after,choiceContract:contract}),
  error=>error.code==='ROSTER_WORKFLOW_CHOICE_SCOPE_EXCEEDED'
    &&error.detail.issue==='work_after_delegated_completion');
console.log(JSON.stringify({pass:true,actualOrderReachesPreciseInputValidation:true,
  geometryOnlyBeforeCompletion:true,noScenarioOrNativeActionGrant:true,
  providerCalls:0,nativeCalls:0,productionWrites:0}));
