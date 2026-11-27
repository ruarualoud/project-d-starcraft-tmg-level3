// Additive source-correction scope: reuse exact old proofs only behind explicit
// new-condition dependencies. No prose equivalence, deleted premise or new goal.
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {rosterWorkflowBindingsMatchV1 as sameBindings} from './roster-decision-workflow-v1.mjs';
export async function rosterSourceScopeExtensionV1({state,owner,root,conclusion,readArtifact}){
  if(owner.inputs?.sourceRepairStage?.value?.phase!=='source_claim_correction'
    ||!owner.experimentReviewOf||!owner.resultRef)return null;
  const priorOwner=state.work.find(w=>w.id===owner.experimentReviewOf);
  const reviewId=owner.inputs?.sourceReview?.id?.replace(/^role:/u,'');
  const prior=state.work.find(w=>w.id===reviewId);
  if(!priorOwner?.resultRef||priorOwner.experimentGoalId!==owner.experimentGoalId
    ||!sameBindings(priorOwner.bindings,owner.bindings)
    ||prior?.experimentSourceReviewOf!==priorOwner.id||prior.status!=='evidence_ready'
    ||!prior.resultRef||prior.sourceFidelityMode!=='atomic_claims_v1'
    ||!sameBindings(prior.bindings,owner.bindings))return null;
  for(const key of ['question','comparisonPurpose','comparisonDecisionContract'])
    if(hash(prior.inputs[key]??null)!==hash(root.inputs[key]??null))return null;
  const old=(await readArtifact(priorOwner.resultRef)).value?.experimentConclusion;
  const before=old?.conditions,after=conclusion?.conditions;
  if(!Array.isArray(before)||!Array.isArray(after)||!after.every(c=>typeof c==='string')
    ||!before.every(c=>typeof c==='string')||after.length<=before.length)return null;
  let cursor=0;const addedConditions=[];
  for(const [index,text]of after.entries()){
    if(cursor<before.length&&text===before[cursor])cursor++;
    else addedConditions.push({index,text});
  }
  if(cursor!==before.length||!addedConditions.length)return null;
  return {version:1,previousReviewId:prior.id,previousOwnerId:priorOwner.id,
    previousResultRef:priorOwner.resultRef,ownerResultRef:owner.resultRef,
    previousConditions:structuredClone(before),addedConditions,
    inheritedChecksAreConditional:true,authorScopeApproved:false};
}
export const rosterSourceScopeConditionHashV1=({scope,condition,sourceHash})=>hash({
  version:1,kind:'scope_extension_condition',previousResultRef:scope.previousResultRef,
  previousConditions:scope.previousConditions,condition,sourceHash
});
export async function rosterSourceScopeRefreshMatchesV1({state,next,readArtifact,jobs=[]}){
  const owner=state.work.find(w=>w.id===next.experimentSourceReviewOf);
  if(!owner?.resultRef||next.sourceScopeExtension?.version!==1)return false;
  const conclusion=(await readArtifact(owner.resultRef)).value?.experimentConclusion;
  const scope=await rosterSourceScopeExtensionV1({state,owner,root:next,conclusion,readArtifact});
  if(!scope||hash(scope)!==hash(next.sourceScopeExtension))return false;
  const prior=state.work.find(w=>w.id===scope.previousReviewId);
  const inherited=next.materialClaims.filter(c=>c.scopeExtensionInherited===true);
  if(!inherited.length||inherited.some(c=>!c.reusedResultRef||!prior.materialClaims.some(p=>
    p.text===c.text&&p.reviewId===c.reviewId&&hash(p.checkBinding)===hash(c.checkBinding))))return false;
  for(const condition of scope.addedConditions){
    const claim=next.materialClaims.find(c=>c.kind==='scope_extension_condition'
      &&c.sourcePointer==='/experimentConclusion/conditions/'+condition.index);
    if(!claim||claim.text!==condition.text||claim.hash!==rosterSourceScopeConditionHashV1({
      scope,condition,sourceHash:next.materialClaimSourceHash}))return false;
    if(!next.materialClaimReviewIds.includes(claim.reviewId)
      ||!Object.values(next.inputs).some(i=>i.source==='work'&&i.id===claim.reviewId))return false;
    // Product enqueues flattened child jobs beside their root, not nested inside it.
    const job=jobs.find(w=>w.id===claim.reviewId)??next.claimReviews?.find(w=>w.id===claim.reviewId)??state.work.find(w=>w.id===claim.reviewId);
    if(!job||hash(job.inputs.claimScope?.value?.conditions)!==hash(scope.previousConditions)
      ||job.inputs.claim?.value?.exactText!==condition.text)return false;
  }
  return true;
}

// A correction's "earlier inference" has an exact subject. Supply that subject,
// not a reviewer verdict or a newly broadened parent obligation.
export function projectRosterSourceCorrectionTargetContextV1({state,workId}){
  const work=state.work.find(w=>w.id===workId);
  if(work?.role!=='roster_workflow_final_review'
    ||work.inputs?.question?.value?.scope!=='one_added_scope_condition')return null;
  const owner=state.work.find(w=>w.id===work.materialClaimReviewOf);
  const stage=owner?.inputs?.sourceRepairStage?.value;
  if(stage?.phase!=='source_claim_correction'||!owner.experimentReviewOf
    ||!sameBindings(work.bindings,owner.bindings))return null;
  const priorOwner=state.work.find(w=>w.id===owner.experimentReviewOf);
  if(!priorOwner?.resultRef||!sameBindings(priorOwner.bindings,owner.bindings))return null;
  const corrections=stage.pendingClaimCorrections??[];
  if(!corrections.length)return null;
  const assertions=[];
  for(const correction of corrections){
    const old=state.work.find(w=>'role:'+w.id===correction.reviewEvidenceId);
    // A failed parent's roll-up has no exact sentence. When its actual child
    // correction is explicitly present, only that child is a correction object.
    if(old?.experimentSourceReviewOf===priorOwner.id&&old.sourceFidelityMode==='atomic_claims_v1'
      &&sameBindings(old.bindings,owner.bindings)&&corrections.some(c=>{
        const child=state.work.find(w=>'role:'+w.id===c.reviewEvidenceId);
        return child?.materialClaimReviewOf===priorOwner.id&&old.materialClaimReviewIds?.includes(child.id)
          &&sameBindings(child.bindings,owner.bindings);
      }))continue;
    if(old?.materialClaimReviewOf!==priorOwner.id||!sameBindings(old.bindings,owner.bindings))return null;
    const subject=old.inputs.claimBatch?.value?.assertions?.find(c=>c.checkId===correction.checkId)
      ??(correction.checkId==='source_fidelity'?old.inputs.claim?.value:null);
    if(typeof subject?.exactText!=='string'||!subject.exactText.trim())return null;
    assertions.push({exactText:subject.exactText,sourceEvidenceId:'role:'+priorOwner.id,
      originalAnswerRef:priorOwner.resultRef,sourcePointer:'/experimentConclusion/answer',
      ...(Number.isSafeInteger(subject.start)&&Number.isSafeInteger(subject.end)?{start:subject.start,end:subject.end}:{}),
      originalReviewWorkId:old.id,checkId:correction.checkId,assertionIsVerifiedFact:false});
  }
  if(!assertions.length)return null;
  return {kind:'source_correction_target_context',version:1,assertions,
    independentEvidence:false,prescribedVerdict:null,addsObligations:false,
    instruction:'These exact prior assertions are the objects assigned for correction, NOT verified facts, Native receipts or prescribed reviewer verdicts. Resolve references to an earlier inference against these literal subjects and predicates. Do not silently substitute the broader parent question. Capability availability, an actually executed transition and joint-goal success are distinct claims: verify the exact claim with the appropriate original evidence. Preserve the original limits and judge the new wording independently; this context does not require support, authorize experiments or approve the Plan.'};
}
