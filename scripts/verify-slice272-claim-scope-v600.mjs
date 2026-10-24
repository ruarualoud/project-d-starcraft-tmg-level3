// Actual atom14 rejected a bare newline; atoms4/9 audited their section's
// overall experiment instead of the exact ability/attacker assertion.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterExperimentSourceReviewV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const base=process.cwd()+'/build/slice272-projection-owner-v565-inlKbk/workspace/decision-workflows/projection-owner';
const state=JSON.parse(await fs.readFile(base+'/workflow.json','utf8'));
const get=async ref=>JSON.parse(await fs.readFile(base+'/artifacts/'+ref+'.json','utf8'));
const owner=state.work.filter(w=>w.experimentGoalId==='p5-current-obligations-v577:r2:component_choices').at(-1);
const result=await get(owner.resultRef),id=owner.id+':source-recheck:claim-scope-v600';
const review=await createRosterExperimentSourceReviewV1({state,owner,result,store:{get},reviewId:id});
assert.ok(review.materialClaims.every(c=>c.text.trim()),'formatting alone must not become a factual proof obligation');
assert.equal(review.materialSegments.map(s=>s.text).join(''),result.value.experimentConclusion.answer,'formatting remains in the complete record');
assert.ok(review.claimReviews.length>0,'failed old-context claims need a new scoped check');
for(const job of review.claimReviews){
  assert.equal(job.inputs.question.value.scope,'one_material_source_assertion');
  assert.equal(job.inputs.question.value.goal,undefined,'global experiment goal must not leak into a local source check');
  assert.equal(job.inputs.claim.value.sectionHeading,undefined,'navigation heading is not an extra claim to audit');
}
const reused=review.materialClaims.filter(c=>c.reusedResultRef);
assert.ok(reused.length>0,'unchanged passed assertions must not be rerun after narrowing failed checks');
for(const c of reused){const old=state.work.find(w=>w.id===c.reviewId),v=(await get(old.resultRef)).value.checks[0];
  assert.ok(['supported','conditional'].includes(v.verdict)&&!v.requiredData.length,'v1 failed/global checks cannot be reused');}
const oldRoot=state.work.findLast(w=>w.sourceFidelityMode&&w.experimentSourceReviewOf===owner.id);
// Simulate the known unissued coverage point, not a Native/Provider execution.
const seed={schema:state.schema,scope:state.scope,evidence:state.evidence,reads:[],events:[],acceptanceGranted:false,
  work:state.work.filter(w=>w.materialClaimReviewOf===owner.id||w.id===oldRoot.id).map(w=>w.id===oldRoot.id
    ?{...w,status:'ready',resultRef:null,operationState:{pending:null}}:w)};
async function schedule(input){let snapshot=structuredClone(input);
  const workflow=await createRosterDecisionWorkflowV1({store:{load:async()=>snapshot,save:async s=>{snapshot=structuredClone(s);},get,
    put:async()=>{throw Error('NO_NEW_ARTIFACT_EXPECTED');}},execute:async()=>{throw Error('NO_EXECUTION_EXPECTED');}});
  const {sourceProjections,claimReviews,...root}=review;
  await workflow.dispatch({type:'enqueue',work:[...claimReviews,{...root,sourceReviewRecheckOf:oldRoot.id,supersedeUnissuedReview:true}]});
  return workflow.inspect();}
const changed=await schedule(seed);
assert.equal(changed.work.find(w=>w.id===oldRoot.id).status,'superseded','an explicitly replaced unissued root must not make an irrelevant paid call');
assert.equal(changed.work.find(w=>w.id===oldRoot.id).supersededByWorkId,id);
const pending=structuredClone(seed);pending.work.find(w=>w.id===oldRoot.id).operationState.pending={contextHash:'unreconciled'};
await assert.rejects(schedule(pending),/SOURCE_REVIEW_PENDING_DISPATCH/u,'never retire an unreconciled paid request');
console.log(JSON.stringify({passed:true,concreteAtoms:[4,9,14],noWhitespaceTasks:true,originalTextPreserved:true,
  localSourceScopeOnly:true,reusedPassedClaims:reused.length,newScopedChecks:review.claimReviews.length,
  unissuedReplacementSafe:true,unreconciledDispatchProtected:true,providerCalls:0,productionWrites:0,
  proves:'Scope/formatting/replacement contract, not final strategic production'}));
