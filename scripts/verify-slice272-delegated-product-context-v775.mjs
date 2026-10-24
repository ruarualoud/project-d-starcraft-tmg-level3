// Actual sibling: the parent ORDER named inspect-scene as an observation,
// but this delegated formation STEP is supporting work. Do not make the
// sibling's observation identity a condition for the local role to continue.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {rosterWorkflowChoiceContractV1} from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import * as product from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const root=process.argv[2],read=async ref=>JSON.parse(await readFile(`${root}/artifacts/${ref}.json`,'utf8'));
const state=JSON.parse(await readFile(`${root}/workflow.json`,'utf8'));
const work=state.work.find(w=>w.id.endsWith('completion-revalidation-v1:order0:repair-choice'));
const result=await read(work.resultRef),order=result.value.failedWorkOrders[0].order;
assert.equal(result.value.failedWorkOrders[0].error.detail.reason,'assigned_comparison_requires_binding');
const before=structuredClone(order),choiceContract=rosterWorkflowChoiceContractV1({state,workId:work.id});
const parent=choiceContract.delegatedComparison.binding;
assert.equal(parent.role,'supporting_step');
assert.ok(parent.observationStepIds.length>0);
assert.equal(parent.observationStepIds.includes(parent.sourceStepId),false);
const source=state.evidence.find(e=>e.id===parent.comparisonId);
const comparisonPurpose={status:'read',evidenceId:source.id,value:(await read(source.artifactRef)).proposals[0].comparisonPurpose};
const compile=context=>compileRosterWorkflowExperimentV1({order,scope:work.bindings,
  namespace:'v775-step-owned-binding',evidenceDirectory:state.evidence,...context});
let preflight;
assert.doesNotThrow(()=>{preflight=compile({choiceContract,comparisonPurpose});},
  'parent sibling observations do not turn this supporting step into an observation');
// The same production preparation used by synchronize must provide the exact
// purpose even though the immutable model order keeps comparisonBinding=null.
const context=await product.prepareRosterWorkflowMethodCompilationV1({state,work,result,readArtifact:read});
const actual=compile(context);
assert.deepEqual(actual,preflight,'role preflight and actual enqueue compilation must agree');
assert.ok(context.comparisonPurpose);
assert.equal(actual[0].inputs.request.value.comparisonBinding.role,'supporting_step');
assert.deepEqual(actual[0].inputs.request.value.comparisonBinding.observationStepIds,[]);
assert.deepEqual(order,before);
const other=structuredClone(choiceContract);
other.delegatedComparison.binding.observationStepIds.push(parent.sourceStepId);
assert.throws(()=>compile({choiceContract:other,comparisonPurpose}),e=>e.code==='ROSTER_COMPARISON_BINDING_INVALID');
console.log(JSON.stringify({pass:true,supportingStepNotSiblingObservation:true,
  productAndRoleCompilationEqual:true,paidOrderUnchanged:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
