// Actual e9019/e9031: the review sees two state identities, but loses the
// Native exact-geometry projection already in its assigned source closure.
// Read-only real artifacts plus injected interface faults; no paid calls.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {projectRosterWorkflowRoleSourceInputsV1} from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
import {createRosterExperimentSourceReviewV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const root=process.argv[2],copy=structuredClone;
let completed=false;
process.on('exit',()=>{if(!completed){console.error('v844 verification incomplete');process.exitCode=1;}});
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8')),before=hash(state);
const cache=new Map(),get=async ref=>{
  if(!cache.has(ref))cache.set(ref,JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8')));
  return copy(cache.get(ref));
};
const owner=state.work.find(w=>w.id.endsWith(':method:d27292cc6165af44'));
const review=state.work.find(w=>w.id===owner.id+':source-review:v2');
const failed=state.work.find(w=>w.id===review.id+':claim:0');
const request=await get(failed.operationState.calls.at(-1).requestRef);
const old=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
assert(!old.inputs.measurementScenes,'real request unexpectedly already contains scene proof');
const assignment=await get(failed.inputRef);
const project=(getArtifact=get,s=state)=>projectRosterWorkflowRoleSourceInputsV1({assignment,state:s,readArtifact:getArtifact});
if(!process.argv.includes('--recovery-only')){
const inputs=await project();
const relation=inputs.measurementScenes?.value.relations.find(r=>r.referenceMeasurement===1372&&r.targetMeasurement===1383);
assert.equal(relation?.geometryStatus,'exact_participants_preserved','actual Native scene proof omitted from source review');
assert.deepEqual(relation.participantUnitIds,['goliath-1','player2-kerrigan-raptor']);
assert.equal(relation.source.evidenceNumber,1377);
assert.equal(relation.nonGeometryEqualityProven,false);
assert.equal(relation.causalBenefitProven,false);
const original=await get(state.evidence[1376].artifactRef);
const delivered=Object.values(inputs).find(i=>i.source==='evidence'&&i.evidenceNumber===1377&&i.pointer==='/receipt/sceneProjection');
assert.deepEqual(delivered.value,original.receipt.sceneProjection);
assert.equal(delivered.status,'read');
const pair=inputs.measurementConfigurations.value.comparisons.find(p=>p.left===1372&&p.right===1383);
assert.equal(pair.geometryAssessment,'separate_scene_evidence');
assert(!Object.hasOwn(pair,'sameGeometryProven'),'configuration projection must not assert an unperformed geometry check');
console.log(JSON.stringify({case:'actual claim source closure delivers exact Native scene proof without causal approval',pass:true}));

// Tamper every relevant identity/fact at the public projection seam. These are
// isolated injected sources, never rewritten production artifacts.
for(const fault of ['wrong_reference_source','wrong_reference_state','wrong_target_source','wrong_target_parent',
  'wrong_target_context','failed_projection','terrain_not_preserved','missing_participant','adapted_participant']){
  const bad=copy(original),p=bad.receipt.sceneProjection;
  if(fault==='wrong_reference_source')p.referenceSourceStateHash='0'.repeat(64);
  if(fault==='wrong_reference_state')p.referenceStateHash='0'.repeat(64);
  if(fault==='wrong_target_source')p.targetSourceStateHash='0'.repeat(64);
  if(fault==='wrong_target_parent')p.targetParentStateHash='0'.repeat(64);
  if(fault==='wrong_target_context')bad.contextRef='candidate:unrelated';
  if(fault==='failed_projection')bad.receipt.resultStatus='unknown';
  if(fault==='terrain_not_preserved')p.terrainPreserved=false;
  if(fault==='missing_participant')p.exactUnits=p.exactUnits.filter(u=>u!=='player2-kerrigan-raptor');
  if(fault==='adapted_participant')p.adaptedUnits=[{unitId:'goliath-1'}];
  const out=await project(async ref=>ref===state.evidence[1376].artifactRef?bad:get(ref));
  assert(!out.measurementScenes?.value.relations.some(r=>r.referenceMeasurement===1372&&r.targetMeasurement===1383
    &&r.geometryStatus==='exact_participants_preserved'),fault);
}
console.log(JSON.stringify({case:'identity, failed execution, terrain and participant changes cannot acquire geometry proof',pass:true}));
}

console.log(JSON.stringify({stage:'normal recovery projection'}));
const next=await createRosterExperimentSourceReviewV1({state,owner,result:await get(owner.resultRef),store:{get}});
assert.equal(next?.sourceReviewRecheckOf,review.id,'normal synchronization must recover missing scene delivery');
assert.equal(next.claimReviews.length,2,'five valid source checks must not be repeated');
assert.equal(next.materialClaims.filter(c=>c.reusedResultRef).length,5);
assert.deepEqual(next.sourceReviewRepairHandoff.staleRequests.map(r=>r.workId).sort(),[review.id+':claim:0',review.id+':claim:3']);
assert(next.sourceReviewRepairHandoff.staleRequests.every(r=>r.missingMeasurementSceneDelivery));
assert.equal(next.sourceReviewRepairHandoff.nativeReplay,false);
assert.equal(next.sourceReviewRepairHandoff.factsApproved,false);
console.log(JSON.stringify({stage:'two failed checks renewed; five passes reused'}));
let saved=copy(state);const memory=new Map(),localStore={get:async ref=>memory.has(ref)?copy(memory.get(ref)):get(ref),
  load:async()=>copy(saved),save:async s=>{saved=copy(s);},put:async a=>{const ref=hash(a);memory.set(ref,copy(a));return ref;}};
const workflow=await createRosterDecisionWorkflowV1({store:localStore,execute:async()=>{throw Error('unexpected execution');}});
const {sourceProjections,claimReviews,ruleFieldReviews,...job}=next;
for(const p of sourceProjections)if(!saved.evidence.some(e=>e.id===p.id))await workflow.dispatch({type:'publish_evidence',...p});
await workflow.dispatch({type:'enqueue',work:[...claimReviews,...ruleFieldReviews,job]});
console.log(JSON.stringify({stage:'normal enqueue completed'}));
const after=await workflow.inspect();
assert.equal(await createRosterExperimentSourceReviewV1({state:after,owner,result:await get(owner.resultRef),store:localStore}),null);
assert.equal(after.draftRef,state.draftRef);assert.equal(after.draftRevision,state.draftRevision);
for(const oldWork of state.work.filter(w=>w.id.startsWith(review.id+':claim:'))){
  const w=after.work.find(w=>w.id===oldWork.id);assert.equal(w.resultRef,oldWork.resultRef);assert.deepEqual(w.operationState,oldWork.operationState);
}
const busy={...state,work:state.work.map(w=>w.id===review.id?{...w,operationState:{...w.operationState,pending:{requestRef:'in-flight'}}}:w)};
assert.equal(await createRosterExperimentSourceReviewV1({state:busy,owner,result:await get(owner.resultRef),store:{get}}),null);
assert.equal(hash(state),before);
console.log(JSON.stringify({case:'only two affected judgments recovered through normal enqueue; passes, old replies, draft and pending calls protected',pass:true}));
console.log(JSON.stringify({pass:true,providerCalls:0,nativeCalls:0,productionWrites:0,planApproved:false}));
completed=true;
