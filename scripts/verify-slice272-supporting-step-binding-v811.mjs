// Real v810 delegated geometry reply inherited a baseline order's supporting
// step, but the binding resolver mistook order stage for step responsibility.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {resolveRosterComparisonBindingV1,bindRosterComparisonStepV1} from '../packages/roster-strategist/roster-comparison-observation-v1.mjs';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {prepareRosterWorkflowMethodCompilationV1,projectRosterUnissuedOrderRecoveryV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const root=process.argv[2],get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const work=state.work.find(w=>w.resultRef==='77f1bd7ba027791c1c93ea3f3a321391514b0560266071caf35763c073bde164');
assert.ok(work);const result=await get(work.resultRef),failure=result.value.failedWorkOrders[0],order=failure.order;
const frozen=JSON.stringify(order),context=await prepareRosterWorkflowMethodCompilationV1({state,work,result,readArtifact:get});
const delegated=context.choiceContract.delegatedComparison;
assert.equal(delegated.binding.stage,'baseline');assert.equal(delegated.binding.role,'supporting_step');
assert.equal(order.experimentScope.comparisonBinding,null);
const input={order,scope:work.bindings,evidenceDirectory:state.evidence,comparisonPurpose:context.comparisonPurpose,delegatedComparison:delegated};
const resolved=resolveRosterComparisonBindingV1(input);
assert.equal(resolved.stage,'prerequisite');assert.deepEqual(resolved.observationStepIds,[]);
assert.equal(resolved.inheritedFromWorkId,delegated.targetWorkId);assert.equal(resolved.arm,delegated.binding.arm);
assert.deepEqual(resolved.purposeSource,delegated.binding.purposeSource);assert.deepEqual(resolved.measurements,delegated.binding.measurements);
assert.equal(resolved.sourceApproved,false);assert.equal(resolved.endpointReached,null);
for(const stage of ['prerequisite','baseline','effect_endpoint']){
  const d=structuredClone(delegated);d.binding.stage=stage;
  const r=resolveRosterComparisonBindingV1({...input,delegatedComparison:d});assert.equal(r.stage,'prerequisite');
  const step=bindRosterComparisonStepV1(r,order.steps[0],JSON.parse(order.steps[0].argumentsJson));
  assert.equal(step.role,'supporting_step');assert.equal(step.endpointReached,null);
}
const bad=structuredClone(delegated);bad.binding.role='observation_candidate';
assert.throws(()=>resolveRosterComparisonBindingV1({...input,delegatedComparison:bad}),e=>e.detail?.reason==='assigned_comparison_requires_binding');
const conflict=structuredClone(order);conflict.experimentScope.comparisonBinding={purposeEvidenceNumber:1159,arm:'alternative',stage:'prerequisite',measurementNumbers:[1],observationStepIds:[]};
assert.throws(()=>resolveRosterComparisonBindingV1({...input,order:conflict}),e=>e.detail?.reason==='delegated_prerequisite_identity_conflict');
const wrongSource=structuredClone(delegated);wrongSource.binding.purposeSource.artifactRef='wrong';
assert.throws(()=>resolveRosterComparisonBindingV1({...input,delegatedComparison:wrongSource}),e=>e.detail?.reason==='delegated_purpose_source_mismatch');
// The same saved order has a separate shape error. Do NOT hide it or fill it:
// unitId exists, but at the wrong envelope level. Report that exact layout.
const compile=o=>compileRosterWorkflowExperimentV1({order:o,scope:work.bindings,namespace:'v811-not-dispatched',evidenceDirectory:state.evidence,...context});
let nextError;try{compile(order);}catch(e){nextError=e;}
assert.equal(nextError?.code,'ROSTER_WORKFLOW_SPATIAL_ARGUMENT_CONTRACT');
assert.ok(nextError.detail.misplacedTopLevelFields.includes('unitId'));
assert.equal(nextError.detail.expectedEnvelope,'queryArguments');
const recovery=projectRosterUnissuedOrderRecoveryV1({state,work,failure,index:0,limit:3,validateOrder:compile});
assert.equal(recovery?.contractRecovery.kind,'supporting_step_identity_repaired_v811');
assert.equal(recovery.contractRecovery.additionalConfirmationLimit,1);assert.equal(recovery.contractRecovery.historyReset,false);
assert.equal(recovery.contractRecovery.remainingInputError.code,'ROSTER_WORKFLOW_SPATIAL_ARGUMENT_CONTRACT');
assert.equal(projectRosterUnissuedOrderRecoveryV1({state,work:{...work,contractRecovery:recovery.contractRecovery},failure,index:0,limit:3,validateOrder:compile}),null);
assert.equal(JSON.stringify(order),frozen,'no model-authored arguments changed');
console.log(JSON.stringify({pass:true,actualPaidOrder:true,sharedCompiler:true,supportingStageIndependent:true,
  noObservationPromotion:true,identityConflictsRejected:true,nextInputErrorVisible:true,oneBoundedRecovery:true,
  providerCalls:0,nativeCalls:0,productionWrites:0}));
