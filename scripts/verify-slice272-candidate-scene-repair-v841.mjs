// e8851: the selected candidate and reference scene differ by roster context.
// The existing project_scene tool is a required prerequisite, not a new study.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {rosterWorkflowChoiceContractV1} from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const root=process.argv[2],state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const owner=state.work.find(w=>w.id.endsWith('inquiry-v2:order0:exchange-ares-absent:input-repair'));
assert.ok(owner);
const task=owner.inputs.task.value,failure=task.failure;
assert.equal(failure.code,'ROSTER_WORKFLOW_STATE_REF_CONFLICT');
const reference=failure.inputBindings.find(b=>b.argumentPointer==='/stateRef');
const candidate=failure.inputBindings.find(b=>b.argumentPointer==='/contextRef');
const numberFor=workId=>{const i=state.evidence.findIndex(e=>e.id==='tool-view:'+workId);assert.ok(i>=0);return state.evidence[i].number??i+1;};
const binding=(pointer,work)=>({argumentPointer:pointer,fromStepId:'',fromEvidenceNumber:numberFor(work),resultPointer:'/stateRef'});
const order={orderId:'same-selected-candidate-scene',purpose:task.originalWork.purpose,
  scenarioAssumptions:task.originalWork.scenarioAssumptions,experimentScope:task.originalWork.experimentScope,
  steps:[{stepId:'project',operation:'project_scene',argumentsJson:JSON.stringify({changedUnits:[],unlistedUnits:'off_table'}),
    bindings:[binding('/referenceStateRef',reference.sourceWorkId),binding('/stateRef',candidate.sourceWorkId)],guards:[],
    publicReason:'Preserve the already selected reference positions in the already selected candidate; no repacking.'},
  {stepId:'exchange',operation:'threat_exchange',argumentsJson:JSON.stringify(task.originalWork.args),
    bindings:[{argumentPointer:'/stateRef',fromStepId:'project',fromEvidenceNumber:0,resultPointer:'/stateRef'}],guards:[],
    publicReason:task.originalWork.publicReason}],
  completionStepId:'exchange',stopAndReturnToModelWhen:task.originalWork.stopAndReturnToModelWhen};
const contract=rosterWorkflowChoiceContractV1({state,workId:owner.id});
const options={scope:state.scope,namespace:owner.id+':proof',evidenceDirectory:state.evidence,choiceContract:contract};
let compiled;
assert.doesNotThrow(()=>{compiled=compileRosterWorkflowExperimentV1({...options,order});},
  'The actual selected-candidate/reference-scene conflict must permit its existing Native projection prerequisite');
assert.ok(contract.allowedOperations.includes('project_scene'));
assert.equal(contract.operation,'threat_exchange');
assert.equal(contract.preparationScope.kind,'selected_candidate_scene_projection');
assert.deepEqual(compiled.map(w=>w.inputs.request.value.operation),['project_scene','threat_exchange']);
assert.equal(compiled[0].inputs.binding0.id,reference.sourceWorkId);
assert.equal(compiled[0].inputs.binding1.id,candidate.sourceWorkId);
assert.equal(compiled[1].inputs.binding0.id,compiled[0].id);
assert.deepEqual(compileRosterWorkflowExperimentV1({...options,order,retainedWork:compiled}),compiled);
for(const mutation of [o=>o.steps[0].operation='native_action',o=>o.steps[0].operation='candidate_context',
  o=>o.steps[0].operation='scenario',o=>o.steps.push({...o.steps[0],stepId:'extra'})]){
  const invalid=structuredClone(order);mutation(invalid);
  assert.throws(()=>compileRosterWorkflowExperimentV1({...options,order:invalid}),e=>e.code==='ROSTER_WORKFLOW_CHOICE_SCOPE_EXCEEDED');
}
const repack=structuredClone(order);repack.steps[0].argumentsJson=JSON.stringify({changedUnits:[{unitId:'goliath-1',mode:'repack_at_reference_anchor'}],unlistedUnits:'off_table'});
assert.throws(()=>compileRosterWorkflowExperimentV1({...options,order:repack}),e=>e.code==='ROSTER_WORKFLOW_PROJECTION_REPAIR_ADAPTATION_NOT_DELEGATED');
const other=structuredClone(state),otherOwner=other.work.find(w=>w.id===owner.id);
otherOwner.inputs.task.value.failure.code='OTHER_INPUT_ERROR';
assert.equal(rosterWorkflowChoiceContractV1({state:other,workId:owner.id}).allowedOperations.includes('project_scene'),false);
console.log(JSON.stringify({pass:true,actualFailure:'e8851',referenceAndCandidateBound:true,
  prerequisiteCannotCompleteCaller:true,unrelatedWorkRejected:true,geometryAdaptationNotDelegated:true,
  coldResumeExact:true,providerCalls:0,nativeCalls:0,productionWrites:0,actualAutomaticRecovery:'not_claimed'}));
