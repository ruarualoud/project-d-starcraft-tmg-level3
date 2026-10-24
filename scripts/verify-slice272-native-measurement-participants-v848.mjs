// Actual e9414: optional request filters hid a successfully measured arm from
// the shared source projection; the numerical reviewer falsely accepted equality.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {projectRosterWorkflowRoleSourceInputsV1} from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
import {createRosterExperimentSourceReviewV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const root=process.argv[2],copy=structuredClone;
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8')),before=hash(state);
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const owner=state.work.find(w=>w.id.endsWith('method:bc3be6dbdce4486c'));
const review=state.work.find(w=>w.id===owner.id+':source-review:v2');
const claim=state.work.find(w=>w.id===review.id+':claim:3');
const assignment=await get(claim.inputRef);
const old=await get(claim.operationState.calls.at(-1).requestRef);
assert.equal(old.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.measurementRowDifferences,undefined);
const project=(readArtifact=get)=>projectRosterWorkflowRoleSourceInputsV1({assignment,state,readArtifact});
const inputs=await project();
const measurements=inputs.measurementConfigurations?.value.measurements??[];
const present=measurements.find(m=>m.evidenceNumber===1429);
assert.ok(present,'executed arm with omitted optional request filters must not disappear');
assert.deepEqual(present.subjectUnitIds,['goliath-1']);
assert.deepEqual(present.targetIds,['player2-kerrigan-raptor']);
assert.equal(present.participantSource,'native_attack_estimates');
assert.deepEqual(present.requestedFilters.targetIds,[],'old unconsumed filters must not be relabelled as consumed');
assert.equal(present.configurationStatus,'resolved');
const difference=inputs.measurementRowDifferences.value.comparisons.find(c=>c.referenceMeasurement===1429&&c.targetMeasurement===1410);
const row=difference.rows.find(r=>r.identity.weaponName==='Underbelly Machine Gun');
const casualties=row.metrics.find(m=>m.metric==='expectedCasualties');
assert.equal(casualties.reference,1.7777777777777777);
assert.equal(casualties.target,1.4722222222222223);
assert.equal(casualties.referenceMinusTarget,casualties.reference-casualties.target);
assert.equal(inputs.measurementScenes.value.relations.find(r=>r.referenceMeasurement===1429&&r.targetMeasurement===1410).geometryStatus,'exact_participants_preserved');
assert.equal(inputs.measurementRowDifferences.value.causalBenefitProven,false);

// The receipt, not guessed filters or a differently named participant, owns
// the measured scope. Injections remain in memory; paid sources are unchanged.
const source=state.evidence[1428],original=await get(source.artifactRef);
for(const fault of ['misleading_request_filter','missing_native_attacker','missing_native_target','empty_native_rows','different_native_target','wrong_native_source','wrong_native_state']){
  const altered=copy(original),v=altered.value??altered;
  if(fault==='misleading_request_filter')v.request.subjectUnitIds=['not-measured'];
  if(fault==='missing_native_attacker')delete v.receipt.exchange.attackEstimates[0].attackerUnitId;
  if(fault==='missing_native_target')delete v.receipt.exchange.attackEstimates[0].targetUnitId;
  if(fault==='empty_native_rows')v.receipt.exchange.attackEstimates=[];
  if(fault==='different_native_target')for(const r of v.receipt.exchange.attackEstimates)r.targetUnitId='other-target';
  if(fault==='wrong_native_source')v.receipt.sourceStateHash='f'.repeat(64);
  if(fault==='wrong_native_state')v.receipt.baseStateHash='f'.repeat(64);
  const projected=await project(async ref=>ref===source.artifactRef?altered:get(ref));
  const m=projected.measurementConfigurations.value.measurements.find(m=>m.evidenceNumber===1429);
  if(fault==='misleading_request_filter')assert.deepEqual(m.subjectUnitIds,['goliath-1']);
  else assert(!projected.measurementRowDifferences?.value.comparisons.some(c=>c.referenceMeasurement===1429&&c.targetMeasurement===1410),fault);
}
console.log(JSON.stringify({stage:'actual omitted arm and seven participant/identity faults verified'}));

// Normal product synchronization must invalidate a proven incomplete input
// even when that old model verdict was "supported". It never overwrites it.
const next=await createRosterExperimentSourceReviewV1({state,owner,result:await get(owner.resultRef),store:{get}});
assert.ok(next?.sourceReviewRepairHandoff.staleRequests.some(r=>r.workId===claim.id));
assert.equal(next.sourceReviewRepairHandoff.nativeReplay,false);
assert.equal(next.sourceReviewRepairHandoff.factsApproved,false);
assert(next.claimReviews.some(w=>w.inputs.claim.value.exactText===claim.inputs.claim.value.exactText));
let saved=copy(state);const memory=new Map();
const localStore={get:async ref=>memory.has(ref)?copy(memory.get(ref)):get(ref),load:async()=>copy(saved),
  save:async s=>{saved=copy(s);},put:async a=>{const ref=hash(a);memory.set(ref,copy(a));return ref;}};
const workflow=await createRosterDecisionWorkflowV1({store:localStore,execute:async()=>{throw Error('unexpected execution');}});
const {sourceProjections,claimReviews,ruleFieldReviews,...job}=next;
for(const p of sourceProjections)if(!saved.evidence.some(e=>e.id===p.id))await workflow.dispatch({type:'publish_evidence',...p});
await workflow.dispatch({type:'enqueue',work:[...claimReviews,...ruleFieldReviews,job]});
const after=await workflow.inspect();
assert.equal(await createRosterExperimentSourceReviewV1({state:after,owner,result:await get(owner.resultRef),store:localStore}),null);
assert.equal(after.draftRef,state.draftRef);assert.equal(after.draftRevision,state.draftRevision);
for(const w of state.work.filter(w=>w.id.startsWith(review.id+':claim:'))){
  const retained=after.work.find(n=>n.id===w.id);
  assert.equal(retained.resultRef,w.resultRef);assert.deepEqual(retained.operationState,w.operationState);
}
assert.equal(hash(state),before);
console.log(JSON.stringify({passed:true,affectedReviews:next.claimReviews.length,
  reusedReviews:next.materialClaims.filter(c=>c.reusedResultRef).length,
  oldJudgmentsPreserved:true,coldSyncIdempotent:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
