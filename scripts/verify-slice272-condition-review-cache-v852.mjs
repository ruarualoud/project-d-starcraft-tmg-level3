// v851's real author received complete Native conditions, but four old source
// passes were reused although their real requests did not contain those facts.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterExperimentSourceReviewV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
import {projectRosterSourceReviewRepairHandoffV1} from '../packages/roster-strategist/roster-source-review-repair-handoff-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const root=process.argv[2],copy=structuredClone;
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8')),before=hash(state);
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const owner=state.work.find(w=>w.resultRef==='d7ce1e7127ec12065d7b65a5787dfdc72d797d37be0dacc7e8851d8014db7cd0');
assert.ok(owner);
const review=state.work.find(w=>w.id===owner.id+':source-review:v2');
const cached=review.materialClaims.filter(c=>c.reusedResultRef),staleIds=new Set(cached.map(c=>c.reviewId));
assert.equal(staleIds.size,4);
const result=await get(owner.resultRef),store={get};
const fresh=await createRosterExperimentSourceReviewV1({state,owner,result,store,reviewId:owner.id+':source-recheck:cache-v852-fixture'});
assert(!fresh.materialClaims.some(c=>staleIds.has(c.reviewId)),
  'passed source checks missing the new Native conditions must not be reused');

const oq=await get(owner.operationState.calls.at(-1).requestRef);
const conditions=oq.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.measurementConditions;
const staleRequestRefs=new Set([...staleIds].map(id=>state.work.find(w=>w.id===id).operationState.calls.at(-1).requestRef));
const upgradedGet=async ref=>{
  const v=await get(ref);if(staleRequestRefs.has(ref))
    v.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.measurementConditions=copy(conditions);
  return v;
};
const equivalent=await createRosterExperimentSourceReviewV1({state,owner,result,store:{get:upgradedGet},
  reviewId:owner.id+':source-recheck:equivalent-v852-fixture'});
for(const id of staleIds)assert(equivalent.materialClaims.some(c=>c.reviewId===id),'same delivered conditions preserve exact passes');

// Actual normal migration seam: only the four affected old passes, never the
// currently paid/source-complete consumers. Keep the original history intact.
const settled=copy(state);
for(const w of settled.work)if(w.status==='running')w.status='needs_model_choice';
for(const w of settled.work)if(w.operationState)w.operationState.pending=null;
const r=settled.work.find(w=>w.id===review.id);r.status='ready';
const handoff=await projectRosterSourceReviewRepairHandoffV1({state:settled,owner,review:r,failedClaimReviewIds:[],readArtifact:get});
assert(handoff);assert.deepEqual(new Set(handoff.staleRequests.map(x=>x.workId)),staleIds);
assert(handoff.staleRequests.every(x=>x.missingNativeConditionDelivery));
assert.equal(handoff.nativeReplay,false);assert.equal(handoff.factsApproved,false);
const pending=copy(settled),p=pending.work.find(w=>w.id===r.id);p.operationState={pending:{requestRef:'paid-in-flight'}};
assert.equal(await projectRosterSourceReviewRepairHandoffV1({state:pending,owner,review:p,failedClaimReviewIds:[],readArtifact:get}),null);

// Simulate the next safe synchronization boundary, without executing any role.
// The real product still waits for its currently paid checks to finish.
let saved=copy(settled);const memory=new Map();
const localStore={get:async ref=>memory.has(ref)?copy(memory.get(ref)):get(ref),load:async()=>copy(saved),
  save:async s=>{saved=copy(s);},put:async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;}};
const next=await createRosterExperimentSourceReviewV1({state:saved,owner,result,store:localStore});
assert(next?.sourceReviewRepairHandoff);
const workflow=await createRosterDecisionWorkflowV1({store:localStore,execute:async()=>{throw Error('unexpected execution');}});
const {sourceProjections,claimReviews,ruleFieldReviews,...job}=next;
for(const p of sourceProjections)if(!saved.evidence.some(e=>e.id===p.id))await workflow.dispatch({type:'publish_evidence',...p});
await workflow.dispatch({type:'enqueue',work:[...claimReviews,...ruleFieldReviews,job]});
const after=await workflow.inspect();
assert.equal(await createRosterExperimentSourceReviewV1({state:after,owner,result,store:localStore}),null);
assert.equal(after.draftRef,state.draftRef);assert.equal(after.draftRevision,state.draftRevision);
for(const id of staleIds){const old=state.work.find(w=>w.id===id),now=after.work.find(w=>w.id===id);
  assert.equal(now.resultRef,old.resultRef);assert.deepEqual(now.operationState,old.operationState);}
assert.equal(hash(state),before);
console.log(JSON.stringify({passed:true,affectedCachedPasses:4,unchangedPassesRemainReusable:true,
  inFlightProtected:true,historyUnchanged:true,normalMigrationAndColdSync:true,providerCalls:0,nativeQueries:0,productionWrites:0}));
