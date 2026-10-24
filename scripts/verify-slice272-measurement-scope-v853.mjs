// Reproduce the actual v851/v852 inference from Host's fixed false markers.
// Saved Native inputs/replies are fixtures, not new measurements or verdicts.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {projectRosterWorkflowRoleSourceInputsV1 as project} from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
import {createRosterExperimentSourceReviewV1 as createReview} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
import {projectRosterSourceReviewRepairHandoffV1 as handoff} from '../packages/roster-strategist/roster-source-review-repair-handoff-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const root=process.argv[2],copy=structuredClone;
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8')),before=hash(state);
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const owner=state.work.find(w=>w.resultRef==='d7ce1e7127ec12065d7b65a5787dfdc72d797d37be0dacc7e8851d8014db7cd0');
assert(owner);
const assignment=await get(owner.inputRef),request=await get(owner.operationState.calls.at(-1).requestRef);
const old=request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
const comparisons=old.measurementConditions.value.comparisons;
const compareSceneConditions=async pair=>{
  const saved=comparisons.find(c=>JSON.stringify(c.referenceStateRef)===JSON.stringify(pair.referenceStateRef)
    &&JSON.stringify(c.targetStateRef)===JSON.stringify(pair.targetStateRef));
  assert(saved?.status==='observed');return copy(saved.receipt);
};
const oldReply=(await get('a7d283bf0ca6749122f2da2f8cea7d26068e92d0036142d66c9db957b62f7e0d')).output;
assert(oldReply.publicReason.includes('causalBenefitProven=false'));
const output=await project({assignment,state,readArtifact:get,compareSceneConditions});
const surfaces=['measurementScenes','measurementRowDifferences','measurementConfigurations'];
if(!process.argv.includes('--handoff-only')){
for(const key of surfaces){
  assert(output[key]);
  assert(!JSON.stringify(output[key].value).includes('"causalBenefitProven":false'),
    `${key}: an unperformed assessment must not be emitted as a false causal predicate`);
  assert.equal(output[key].value.assessmentScope.causalAttribution,'not_assessed_by_this_projection');
  assert.equal(output[key].value.assessmentScope.strategicPreference,'not_assessed_by_this_projection');
}
assert(!JSON.stringify(output.measurementScenes.value.relations).includes('"nonGeometryEqualityProven":false'));
// Only remove ambiguous Host metadata; preserve every operand/configuration and
// the full Native observations, including equal/different/unavailable facts.
const sanitize=value=>{
  if(Array.isArray(value))return value.map(sanitize);
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).filter(([k])=>!['assessmentScope','instruction','version',
    'nonGeometryEqualityProven','causalBenefitProven','arrivalOrMovementLegalityProven','strategyImprovementProven'].includes(k))
    .map(([k,v])=>[k,sanitize(v)]));
};
for(const key of surfaces)assert.deepEqual(sanitize(output[key]),sanitize(old[key]),key+' facts preserved');
assert.deepEqual(output.measurementConditions,old.measurementConditions);
for(const key of Object.keys(output).filter(k=>/^measurementScene\d+$/.test(k)))assert.deepEqual(output[key],old[key]);
for(const role of ['roster_workflow_strategy_decision','roster_workflow_fact_summary','roster_workflow_local_teach','roster_workflow_final_review']){
  const next=await project({assignment:{...assignment,role},state,readArtifact:get,compareSceneConditions});
  for(const key of surfaces)assert.deepEqual(next[key],output[key],role);
}
}
const {rosterSavedMeasurementScopeGapV1:gap}=await import('../packages/roster-strategist/roster-measurement-assessment-scope-v1.mjs');
// v852 has now completed all five actual checks. Its numeric-only verdict is
// the relevant current cache entry; the older numeric verdict also cited the
// ambiguous flags and was not a pure numeric fixture.
const review=state.work.find(w=>w.id===owner.id+':source-recheck:measurement-scenes-v3');
const affected=[];
for(const id of review.materialClaimReviewIds){const work=state.work.find(w=>w.id===id);
  if(await gap({work,readArtifact:get}))affected.push(id);}
assert(affected.length>0);
const numeric=state.work.find(w=>w.id===review.materialClaims[2].reviewId);
assert.equal(await gap({work:numeric,readArtifact:get}),null,'pure numerical checks remain reusable');
const tested=state.work.find(w=>w.id===affected[0]);
const upgraded=async ref=>{const value=await get(ref);
  if(ref===tested.operationState.calls.at(-1).requestRef){const inputs=value.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
    for(const key of surfaces)if(inputs[key])inputs[key]=copy(output[key]);}
  return value;};
assert.equal(await gap({work:tested,readArtifact:upgraded}),null,'already corrected delivery is not stale');
assert.equal(await gap({work:{...tested,operationState:{...tested.operationState,pending:{requestRef:'inflight'}}},readArtifact:get}),null);
// Reproduce the actual safe migration boundary in memory. No product writes.
let saved=copy(state);saved.work=saved.work.slice(0,saved.work.findIndex(w=>w.id===review.id)+1);
const previous=saved.work.find(w=>w.id===review.id);previous.status='ready';
const migration=await handoff({state:saved,owner,review:previous,failedClaimReviewIds:[],readArtifact:get});
assert(migration.staleRequests.some(r=>r.ambiguousMeasurementScope&&r.measurementScopeMarkers.length));
const memory=new Map(),store={get:async ref=>memory.has(ref)?copy(memory.get(ref)):get(ref),
  load:async()=>copy(saved),save:async s=>{saved=copy(s);},put:async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;}};
const next=await createReview({state:saved,owner,result:await get(owner.resultRef),store});
assert(next.id.endsWith('measurement-scenes-v4'));
assert(!next.materialClaims.some(c=>affected.includes(c.reviewId)),'affected passes not reused');
const workflow=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('unexpected execution');}});
const {sourceProjections,claimReviews,ruleFieldReviews,...job}=next;
for(const p of sourceProjections)if(!saved.evidence.some(e=>e.id===p.id))await workflow.dispatch({type:'publish_evidence',...p});
await workflow.dispatch({type:'enqueue',work:[...claimReviews,...ruleFieldReviews,job]});
const after=await workflow.inspect();
assert.equal(await createReview({state:after,owner,result:await get(owner.resultRef),store}),null);
assert.equal(after.draftRef,state.draftRef);assert.equal(after.draftRevision,state.draftRevision);
for(const id of affected){const a=state.work.find(w=>w.id===id),b=after.work.find(w=>w.id===id);
  assert.equal(b.resultRef,a.resultRef);assert.deepEqual(b.operationState,a.operationState);}
assert.equal(hash(state),before);
console.log(JSON.stringify({passed:true,sharedRoles:5,hostSurfaces:3,affectedJudgments:affected.length,
  mode:process.argv.includes('--handoff-only')?'remaining_handoff_only':'full',
  numericCachePreserved:true,originalsUnchanged:true,normalMigrationAndColdSync:true,
  providerCalls:0,nativeQueries:0,productionWrites:0,causalApproval:false}));
