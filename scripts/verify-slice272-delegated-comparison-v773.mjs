// Actual local geometry reply omitted a duplicate parent comparison identity.
// The existing delegated operation already owns that identity; no new strategy
// choice, arm, measurement or endpoint may be inferred by the compiler.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {rosterWorkflowChoiceContractV1} from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const root=process.argv[2],read=async ref=>JSON.parse(await readFile(`${root}/artifacts/${ref}.json`,'utf8'));
const state=JSON.parse(await readFile(`${root}/workflow.json`,'utf8'));
const work=state.work.find(w=>w.id.endsWith('prob-mmm:input-repair:order0:apply-formation:observed-choice:order0:repair-choice'));
assert.ok(work);
const result=await read(work.resultRef),order=result.value.failedWorkOrders[0].order;
assert.equal(result.value.failedWorkOrders[0].error.detail.reason,'assigned_comparison_requires_binding');
const original=structuredClone(order),choice=rosterWorkflowChoiceContractV1({state,workId:work.id});
const parent=state.work.find(w=>w.id===choice.targetWorkId).inputs.request.value.comparisonBinding;
const evidence=state.evidence.find(e=>e.id===parent.comparisonId);
const comparisonPurpose={status:'read',evidenceId:evidence.id,
  value:(await read(evidence.artifactRef)).proposals[0].comparisonPurpose};
const compile=(value,contract=choice)=>compileRosterWorkflowExperimentV1({order:value,
  scope:work.bindings,namespace:'v773-delegated-geometry',evidenceDirectory:state.evidence,
  comparisonPurpose,choiceContract:contract});
let jobs;
assert.doesNotThrow(()=>{jobs=compile(order);},'parent-owned prerequisite identity must not require another model repair');
assert.equal(jobs.length,1);
const inherited=jobs[0].inputs.request.value.comparisonBinding;
assert.equal(inherited.comparisonId,parent.comparisonId);
assert.equal(inherited.arm,parent.arm);
assert.deepEqual(inherited.measurements,parent.measurements);
assert.equal(inherited.stage,'prerequisite');
assert.equal(inherited.role,'supporting_step');
assert.deepEqual(inherited.observationStepIds,[]);
assert.equal(inherited.inheritedFromWorkId,choice.targetWorkId);
assert.equal(inherited.sourceApproved,false);
assert.deepEqual(order,original,'immutable model reply is not patched');
assert.throws(()=>compile(order,null),e=>e.code==='ROSTER_COMPARISON_BINDING_INVALID',
  'new experimental designs still need an explicit model-owned comparison binding');
const observation=structuredClone(choice);observation.delegatedComparison.binding.role='observation_candidate';
assert.throws(()=>compile(order,observation),e=>e.code==='ROSTER_COMPARISON_BINDING_INVALID',
  'do not invent observation identities from a parent measurement');
const mismatch=structuredClone(choice);mismatch.delegatedComparison.binding.purposeSource.artifactRef='different-purpose';
assert.throws(()=>compile(order,mismatch),e=>e.code==='ROSTER_COMPARISON_BINDING_INVALID');
const explicit=structuredClone(order);
explicit.experimentScope.comparisonBinding={purposeEvidenceNumber:parent.purposeSource.evidenceNumber,
  arm:parent.arm,stage:'prerequisite',measurementNumbers:parent.measurements.map(x=>x.number),observationStepIds:[]};
assert.equal(compile(explicit)[0].inputs.request.value.comparisonBinding.arm,parent.arm);
explicit.experimentScope.comparisonBinding.arm=parent.arm==='current'?'alternative':'current';
assert.throws(()=>compile(explicit),e=>e.code==='ROSTER_COMPARISON_BINDING_INVALID',
  'a chooser cannot silently reassign its parent comparison arm');
const extra=structuredClone(order);extra.steps.push({stepId:'unowned-fire',operation:'threat_exchange',argumentsJson:'{}',bindings:[],guards:[],publicReason:'extra'});
assert.throws(()=>compile(extra),e=>e.code==='ROSTER_WORKFLOW_CHOICE_SCOPE_EXCEEDED');
console.log(JSON.stringify({pass:true,parentIdentityInherited:true,noObservationInvented:true,
  explicitConflictRejected:true,paidOrderUnchanged:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
