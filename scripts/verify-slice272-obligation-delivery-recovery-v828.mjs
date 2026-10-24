// Actual e7851: completed failing hypothesis review received q1 without its
// criterion. Exercise only recovery admission/enqueue/cold-read. No models,
// Native calls, original state writes, semantic approval or old gate reruns.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterExperimentSourceReviewV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {projectRosterSourceReviewRepairHandoffV1} from '../packages/roster-strategist/roster-source-review-repair-handoff-v1.mjs';
const root=process.argv[2],resultFile=`build/slice272-v828-recovery-${Date.now()}.json`,memory=new Map();
const get=async ref=>memory.has(ref)?structuredClone(memory.get(ref)):JSON.parse(await fs.readFile(`${root}/artifacts/${ref}.json`,'utf8'));
process.on('uncaughtException',async error=>{const out={pass:false,message:error.message,stack:error.stack?.split('\n').slice(0,5)};
  await fs.writeFile(resultFile,JSON.stringify(out,null,2));console.error(JSON.stringify(out));process.exitCode=1;});
console.log(JSON.stringify({stage:'start',resultFile}));
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8')),before=hash(state);
const owner=state.work.find(w=>w.id.endsWith(':method:c8748d16f139bf05:source-revision:review-v7:presentation-v2'));
assert.ok(owner);const latest=state.work.findLast(w=>w.experimentSourceReviewOf===owner.id&&w.status!=='superseded');
assert.equal(latest.status,'ready');
const next=await createRosterExperimentSourceReviewV1({state,owner,result:await get(owner.resultRef),store:{get}});
assert.equal(next?.sourceReviewRecheckOf,latest.id,'lost original obligation must have a controlled recovery lane');
assert.equal(next.reviewObligationDeliveryVersion,2);
assert.equal(next.claimReviews.length,1,'only the failed structured hypothesis, not passed prose checks');
assert.equal(next.materialClaims.filter(c=>c.reusedResultRef).length,7);
assert.equal(next.materialClaimContractVersion,latest.materialClaimContractVersion);
assert.equal(next.comparisonValidityContractVersion,latest.comparisonValidityContractVersion);
assert.equal(next.sourceReviewPresentationVersion,latest.sourceReviewPresentationVersion);
const stale=next.sourceReviewRepairHandoff.staleRequests;
assert.equal(stale.length,1);assert.ok(stale[0].missingObligationDelivery);
assert.ok(stale[0].missingObligationFields.some(x=>x.field==='criterion'));
const badId=stale[0].workId,bad=state.work.find(w=>w.id===badId);
const actualRequest=await get(stale[0].requestRef),sent=actualRequest.promptNodes.find(n=>n.kind==='workflow_role_assignment');
assert.equal(sent.inputs.review.value.obligations[0].criterion,undefined);
// If the actual request already contained the original rubric, a negative
// verdict must NOT receive another chance just because its version is old.
const delivered=structuredClone(actualRequest);
delivered.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.review.value.obligations[0].criterion=bad.inputs.review.value.obligations[0].criterion;
assert.equal(await projectRosterSourceReviewRepairHandoffV1({state,owner,review:latest,failedClaimReviewIds:[badId],
  readArtifact:ref=>ref===stale[0].requestRef?Promise.resolve(delivered):get(ref)}),null);
for(const busyId of [latest.id,owner.id,badId]){
  const busy=structuredClone(state);busy.work.find(w=>w.id===busyId).operationState={...busy.work.find(w=>w.id===busyId).operationState,pending:{requestRef:'in-flight'}};
  assert.equal(await createRosterExperimentSourceReviewV1({state:busy,owner:busy.work.find(w=>w.id===owner.id),result:await get(owner.resultRef),store:{get}}),null,'in-flight protected: '+busyId);
}
let saved=structuredClone(state);
const store={get,load:async()=>structuredClone(saved),save:async s=>{saved=structuredClone(s);},
  put:async x=>{const ref=hash(x);memory.set(ref,structuredClone(x));return ref;}};
const noExecute=async()=>{throw Error('NO_EXECUTION_ALLOWED');};
const workflow=await createRosterDecisionWorkflowV1({store,execute:noExecute});
const {sourceProjections,claimReviews,ruleFieldReviews,...job}=next;
for(const projection of sourceProjections)if(!saved.evidence.some(e=>e.id===projection.id))await workflow.dispatch({type:'publish_evidence',...projection});
await workflow.dispatch({type:'enqueue',work:[...claimReviews,...ruleFieldReviews,job]});
const after=await workflow.inspect();assert.equal(after.work.find(w=>w.id===latest.id).status,'superseded');
for(const old of state.work.filter(w=>w.id===badId||latest.materialClaimReviewIds.includes(w.id))){
  const kept=after.work.find(w=>w.id===old.id);assert.equal(kept.resultRef,old.resultRef);assert.deepEqual(kept.operationState,old.operationState);
}
assert.equal(after.draftRef,state.draftRef);assert.equal(after.acceptanceGranted,false);
const cold=await createRosterDecisionWorkflowV1({store,execute:noExecute}),restored=await cold.inspect();
assert.equal(await createRosterExperimentSourceReviewV1({state:restored,owner:restored.work.find(w=>w.id===owner.id),result:await get(owner.resultRef),store}),null);
assert.equal(hash(JSON.parse(await fs.readFile(root+'/workflow.json','utf8'))),before);
const out={pass:true,failedChecksReopened:1,passedChecksReused:7,actualCriterionLossRequired:true,
  originalSemanticVersionsKept:true,pendingOwnerParentAndChildProtected:true,coldIdempotent:true,
  oldRequestsResultsCountersRetained:true,providerCalls:0,nativeCalls:0,productionWrites:0,sourceOrStrategyApproved:false};
await fs.writeFile(resultFile,JSON.stringify(out,null,2));console.log(JSON.stringify(out));
