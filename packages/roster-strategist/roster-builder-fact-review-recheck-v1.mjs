// Explicit, single-claim recheck after the shared Native numeric view was
// missing. No natural-language replacement, global migration or new audit.
import {isDeepStrictEqual} from 'node:util';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {projectRosterBuilderAuditNumericFactsV1,compareRosterBuilderAuditNumericFactsV1} from './roster-builder-candidate-facts-v1.mjs';
const fail=reason=>{throw Object.assign(Error(reason),{code:reason});};
const clone=structuredClone;
function jobDefinition(work){
  const {status,resultRef,inputRef,attempt,dispatchKey,failure,operationState,calls,...definition}=work;
  return clone(definition);
}
export async function createRosterBuilderFactSourceRecheckV1({state,request,readArtifact}){
  const {reviewId,claimReviewId,expectedClaimResultRef,expectedRequestRef,auditEvidenceIds,reportedIssue}=request;
  if(!reviewId||!claimReviewId||!expectedClaimResultRef||!expectedRequestRef
    ||!Array.isArray(auditEvidenceIds)||auditEvidenceIds.length!==2||new Set(auditEvidenceIds).size!==2
    ||typeof reportedIssue!=='string'||!reportedIssue.trim())fail('ROSTER_BUILDER_FACT_RECHECK_REQUEST_INVALID');
  const previous=state.work.find(w=>w.id===reviewId),claim=state.work.find(w=>w.id===claimReviewId);
  const owner=state.work.find(w=>w.id===previous?.experimentSourceReviewOf);
  const id=`${owner?.id}:source-recheck:builder-facts-v1:${hash(request).slice(0,16)}`,claimId=id+':claim';
  const existing=state.work.find(w=>w.id===id);
  if(existing){
    if(!isDeepStrictEqual(existing.sourceReviewRepairHandoff?.builderNumericFactRecheck?.request,request))
      fail('ROSTER_BUILDER_FACT_RECHECK_ID_CONFLICT');
    return {reviewId:id,claimReviewId:claimId,jobs:[]};
  }
  if(previous?.role!=='roster_workflow_final_review'||previous.sourceFidelityMode!=='atomic_claims_v1'
    ||previous.status!=='ready'||previous.resultRef||previous.operationState?.calls?.length||previous.operationState?.pending
    ||owner?.status!=='evidence_ready'||owner.operationState?.pending
    ||claim?.status!=='evidence_ready'||claim.operationState?.pending||claim.resultRef!==expectedClaimResultRef
    ||claim.materialClaimReviewOf!==owner.id||!previous.materialClaimReviewIds.includes(claim.id)
    ||!isDeepStrictEqual(claim.bindings,previous.bindings)
    ||Object.entries(previous.bindings).some(([k,v])=>state.scope[k]!==v))fail('ROSTER_BUILDER_FACT_RECHECK_TARGET_CHANGED');
  if(state.work.some(w=>w.sourceReviewRepairHandoff?.staleRequests?.some(r=>r.workId===claim.id&&r.missingBuilderNumericFacts)))
    fail('ROSTER_BUILDER_FACT_RECHECK_ALREADY_REQUESTED');
  const call=claim.operationState.calls.at(-1);
  if(call?.requestRef!==expectedRequestRef)fail('ROSTER_BUILDER_FACT_RECHECK_REQUEST_CHANGED');
  const old=await readArtifact(expectedRequestRef);
  if(old.promptNodes?.find(n=>n.kind==='workflow_role_assignment')?.workId!==claim.id
    ||old.promptNodes.some(n=>n.kind==='builder_audit_numeric_facts'))fail('ROSTER_BUILDER_FACT_RECHECK_GAP_NOT_PROVEN');
  const facts=[];
  for(const evidenceId of auditEvidenceIds){
    const e=state.evidence.find(e=>e.id===evidenceId);
    if(!e||Object.entries(e.bindings).some(([k,v])=>state.scope[k]!==v))fail('ROSTER_BUILDER_FACT_RECHECK_SOURCE_CHANGED');
    const fact=projectRosterBuilderAuditNumericFactsV1({value:await readArtifact(e.artifactRef),evidence:e});
    if(!fact)fail('ROSTER_BUILDER_FACT_RECHECK_NATIVE_AUDIT_REQUIRED');
    facts.push(fact);
  }
  const before=facts.find(f=>f.candidateHash===state.scope.army),after=facts.find(f=>f!==before);
  if(!before||!compareRosterBuilderAuditNumericFactsV1(before,after))fail('ROSTER_BUILDER_FACT_RECHECK_COMPARISON_INVALID');
  const child={...jobDefinition(claim),id:claimId,
    inputs:{...clone(claim.inputs),
      numericRecheck:{source:'literal',value:{version:1,originalRequestRef:expectedRequestRef,
        originalResultRef:expectedClaimResultRef,reportedIssue,
        instruction:'Reassess only the unchanged exact assertion using these original Native audits and their shared numeric facts. A reported defect is not a supplied verdict. Do not rerun tools, widen the inquiry or treat an old supported label as proof. Keep correct claims, reject incorrect claims with exact evidence; no Plan or army approval.'}},
      numericBefore:{source:'evidence',id:auditEvidenceIds[facts.indexOf(before)],pointer:''},
      numericAfter:{source:'evidence',id:auditEvidenceIds[facts.indexOf(after)],pointer:''}}};
  const root={...jobDefinition(previous),id,sourceReviewRecheckOf:previous.id,supersedeUnissuedReview:true,
    builderNumericFactDeliveryVersion:1,
    materialClaims:previous.materialClaims.map(c=>c.reviewId===claim.id?{...clone(c),reviewId:claimId}:clone(c)),
    materialClaimReviewIds:previous.materialClaimReviewIds.map(value=>value===claim.id?claimId:value),
    inputs:Object.fromEntries(Object.entries(previous.inputs).map(([key,input])=>[key,
      input.source==='work'&&input.id===claim.id?{...clone(input),id:claimId}:clone(input)])),
    sourceReviewRepairHandoff:{version:1,reviewId:previous.id,ownerId:owner.id,retiredRootIds:[],
      staleRequests:[{workId:claim.id,requestRef:expectedRequestRef,originalResultRef:expectedClaimResultRef,missingBuilderNumericFacts:true}],
      currentBuilderNumericFactDeliveryVersion:1,builderNumericFactRecheck:{version:1,request:clone(request)},
      reason:'An explicitly reported numeric interpretation used a request without the shared Native cost/difference contract. Reassess only that claim, reuse all other source checks, then use the existing source revision/coverage path.',
      nativeReplay:false,factsApproved:false,historyReset:false}};
  return {reviewId:id,claimReviewId:claimId,jobs:[child,root]};
}

export async function rosterBuilderFactRecheckMatchesV1({state,next,readArtifact}){
  const proof=next.sourceReviewRepairHandoff?.builderNumericFactRecheck;
  if(proof?.version!==1)return false;
  const expected=await createRosterBuilderFactSourceRecheckV1({state,request:proof.request,readArtifact});
  const root=expected.jobs.find(w=>w.id===next.id);
  return Boolean(root&&Object.entries(root).every(([key,value])=>isDeepStrictEqual(next[key],value)));
}
