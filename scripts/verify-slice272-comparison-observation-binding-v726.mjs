// Actual missing identity seam: source539 is an ordinary concentrated-arm
// control observation, not a design or proof of the post-pressure endpoint.
// Controlled new metadata exercises the product compiler; historical artifacts
// and Native results are read only, never retroactively labelled in production.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {projectRosterExperimentOriginV1} from '../packages/roster-strategist/roster-experiment-scope-v1.mjs';
import {projectRosterWorkflowExperimentAssetsV1} from '../packages/roster-strategist/roster-workflow-experiment-assets-v1.mjs';
import {projectRosterWorkflowReceiptViewV1} from '../packages/roster-strategist/roster-workflow-receipt-view-v1.mjs';
const root=path.resolve(process.argv[2]);
const state=JSON.parse(await fs.readFile(path.join(root,'workflow.json'),'utf8'));
const read=async ref=>JSON.parse(await fs.readFile(path.join(root,'artifacts',ref+'.json'),'utf8'));
const originalState=JSON.stringify(state);
const source=state.evidence[538],raw=await read(source.artifactRef);
const tool=state.work.find(work=>work.id===raw.experimentOrigin.sourceWorkId);
const owner=state.work.find(work=>work.id===tool.experimentOwnerId);
const result=await read(owner.resultRef);
const oldOrder=result.value.workOrders.find(order=>order.orderId===tool.inputs.request.value.orderId);
const purposeSource=state.evidence[172];
const purpose=(await read(purposeSource.artifactRef)).proposals[0].comparisonPurpose;
const purposeInput={source:'evidence',status:'read',evidenceId:purposeSource.id,
  evidenceNumber:173,value:purpose};
const order=structuredClone(oldOrder);
order.experimentScope.comparisonBinding={purposeEvidenceNumber:173,arm:'alternative',
  stage:'baseline',measurementNumbers:[1,2],observationStepIds:['query-concentrated-control']};
const compile=(selected=order,extra={})=>compileRosterWorkflowExperimentV1({
  order:selected,scope:state.scope,namespace:'v726-controlled',evidenceDirectory:state.evidence,
  comparisonPurpose:purposeInput,...extra});
// RED on the old source: the normal interface cannot represent this relation.
const jobs=compile();
const setup=jobs[0].inputs.request.value.comparisonBinding;
const observation=jobs[1].inputs.request.value.comparisonBinding;
assert.equal(setup.role,'supporting_step');
assert.equal(observation.role,'observation_candidate');
assert.equal(observation.arm,'alternative');
assert.equal(observation.stage,'baseline');
assert.equal(observation.comparisonId,purposeSource.id);
assert.deepEqual(observation.measurements,[1,2].map(number=>({number,description:purpose.measurements[number-1]})));
assert.equal(observation.observationEndpoint,purpose.observationEndpoint);
assert.equal(observation.endpointReached,null);
assert.equal(observation.sourceApproved,false);
assert.ok(observation.toolProofScope.doesNotProve.includes('future enemy actions'));
assert.equal(observation.toolProofScope.queryKind,'mission_marker_control');
assert.equal(observation.toolProofScope.origin,'native_query_contract');
assert.equal(setup.toolProofScope,null,'unknown proof scope is not fabricated');

// Invalid identities reject before dispatch, without dropping the request.
for(const changed of [
  {purposeEvidenceNumber:539},
  {measurementNumbers:[5]},
  {observationStepIds:['not-an-order-step']},
]){
  const invalid=structuredClone(order);
  Object.assign(invalid.experimentScope.comparisonBinding,changed);
  assert.throws(()=>compile(invalid),error=>error.code==='ROSTER_COMPARISON_BINDING_INVALID');
}
assert.throws(()=>compile(order,{comparisonPurpose:null}),
  error=>error.code==='ROSTER_COMPARISON_BINDING_INVALID');
const legacyJobs=compile(oldOrder);
assert.equal(legacyJobs[1].inputs.request.value.comparisonBinding,undefined,
  'old unlabelled observation remains unlabelled');
const retained=compile(order,{retainedWork:jobs});
assert.deepEqual(retained,jobs,'cold compile reuses exact bound work');

const origin=projectRosterExperimentOriginV1({scope:order.experimentScope,
  workId:tool.id,bindings:state.scope,comparisonBinding:observation});
const controlled={...structuredClone(raw),experimentOrigin:origin};
const view=projectRosterWorkflowReceiptViewV1({evidenceId:source.id,value:controlled,conditions:source.conditions});
assert.deepEqual(view.experimentOrigin.comparisonBinding,observation);
const storedReads=[];
// The published source539 is the repaired operation's public alias. The actual
// failed consumer read that alias; the low-level executor owns another source.
const paid=await read('3809e516dca520f326d0bf620011a50f4b7a86c22ba94b2a93a1aef9f8f3ca9a');
const consumer=paid.promptNodes.find(node=>node.kind==='workflow_role_assignment').workId;
const assets=await projectRosterWorkflowExperimentAssetsV1({state,workId:consumer,
  readArtifact:async ref=>{storedReads.push(ref);return ref===source.artifactRef?controlled:read(ref);}});
const row=assets.catalogue.observations.find(entry=>entry.sourceEvidenceNumber===539);
assert.ok(row,'actual published source stays discoverable from its recorded consumer');
assert.equal(row.comparisonBinding.arm,'alternative');
assert.equal(row.comparisonBinding.stage,'baseline');
assert.equal(row.comparisonBinding.endpointReached,null);
assert.equal(row.sourceStatus,raw.status);
assert.deepEqual(row.stateRef,raw.stateRef);
assert.equal(row.nativeResultReadByModel,false);
assert.ok(storedReads.includes(source.artifactRef));
assert.equal(assets.catalogue.observationsAreApproved,false);
assert.equal(JSON.stringify(state),originalState);
assert.equal(JSON.stringify(await read(source.artifactRef)),JSON.stringify(raw));
console.log(JSON.stringify({passed:true,source:539,purpose:173,normalProductCompiler:true,
  scopeToReceiptViewToAssetCatalogue:true,arm:'alternative',stage:'baseline',
  endpointAndApprovalNotInvented:true,coldRestoreExact:true,legacyUnchanged:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,formalPlanAccepted:false}));
