// Actual e8805: a complete one-option choice used selection instead of selections.
// Compile the unchanged saved reply at the real compiler boundary, no live replay.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {rosterWorkflowChoiceContractV1} from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';
const root=process.argv[2],read=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const saved=await read('b03b762eed20baff1da5520a09a1ee9ccb07a5b1e722240efd8c17661e938943');
const order=saved.value.failedWorkOrders[0].order,original=JSON.stringify(order);
const owner=state.work.find(w=>w.resultRef==='b03b762eed20baff1da5520a09a1ee9ccb07a5b1e722240efd8c17661e938943');
assert.ok(owner);
const options={scope:state.scope,namespace:owner.id+':wire-proof',evidenceDirectory:state.evidence,
  choiceContract:rosterWorkflowChoiceContractV1({state,workId:owner.id})};
let jobs;
assert.doesNotThrow(()=>{jobs=compileRosterWorkflowExperimentV1({...options,order});},
  'A complete unambiguous single formation selector must not require another model round');
const originalArgs=JSON.parse(order.steps[0].argumentsJson),request=jobs[0].inputs.request.value;
assert.deepEqual(request.args.selections,[originalArgs.selection]);
assert.equal(Object.hasOwn(request.args,'selection'),false);
assert.deepEqual(request.args.stateRef,originalArgs.stateRef);
assert.equal(request.argumentProjection[0].rule,'formation_single_selection_v1');
assert.deepEqual(request.argumentProjection[0].original,originalArgs.selection);
assert.equal(request.argumentProjection[0].from,'/selection');
assert.equal(request.argumentProjection[0].to,'/selections');
assert.equal(JSON.stringify(order),original,'The paid proposal is not rewritten');
assert.deepEqual(compileRosterWorkflowExperimentV1({...options,order,retainedWork:jobs}),jobs,
  'Cold resume retains the exact canonical compiled work, without replay or identity drift');
const canonical=structuredClone(order),canonicalArgs={...originalArgs,selections:[originalArgs.selection]};
delete canonicalArgs.selection;canonical.steps[0].argumentsJson=JSON.stringify(canonicalArgs);
const canonicalJobs=compileRosterWorkflowExperimentV1({...options,order:canonical});
assert.deepEqual(canonicalJobs.map(w=>w.inputs.request.value.args),jobs.map(w=>w.inputs.request.value.args));
assert.deepEqual(canonicalJobs.map(w=>w.inputs.request.value.bindings),jobs.map(w=>w.inputs.request.value.bindings));
function changedArgs(args){const next=structuredClone(order);next.steps[0].argumentsJson=JSON.stringify(args);return next;}
assert.throws(()=>compileRosterWorkflowExperimentV1({...options,order:changedArgs({...originalArgs,selections:[{sourceEvidenceNumber:1174,optionIndex:1}]})}),
  e=>e.code==='ROSTER_WORKFLOW_FORMATION_SELECTOR_AMBIGUOUS');
for(const selection of [null,{},[],{sourceEvidenceNumber:0,optionIndex:0},{sourceEvidenceNumber:1360},
  {sourceEvidenceNumber:1360,optionIndex:-1},{sourceEvidenceNumber:1360,fromStepId:'both',optionIndex:0},
  {sourceEvidenceNumber:1360,optionIndex:0,unitId:'invented'}]){
  assert.throws(()=>compileRosterWorkflowExperimentV1({...options,order:changedArgs({...originalArgs,selection})}),
    'Incomplete or ambiguous selection must not be silently filled or executed');
}
const unrelated=changedArgs(originalArgs);unrelated.steps[0].operation='inspect';
const unrelatedJobs=compileRosterWorkflowExperimentV1({...options,order:unrelated});
assert.deepEqual(unrelatedJobs[0].inputs.request.value.args,originalArgs,'Other operations are not reinterpreted');
const mismatch=structuredClone(jobs);mismatch[0].inputs.request.value.args.selections[0].optionIndex=2;
assert.throws(()=>compileRosterWorkflowExperimentV1({...options,order,retainedWork:mismatch}),
  e=>e.code==='ROSTER_WORKFLOW_RETAINED_ORDER_MISMATCH');
console.log(JSON.stringify({pass:true,actualFailure:'e8805',singleChoiceUnchanged:true,sourceAndParentUnchanged:true,
  explicitProjectionRecorded:true,rawReplyUnchanged:true,coldResumeExact:true,ambiguousOrInvalidRejected:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,actualGeometryOrStrategySuccess:'not_claimed'}));
