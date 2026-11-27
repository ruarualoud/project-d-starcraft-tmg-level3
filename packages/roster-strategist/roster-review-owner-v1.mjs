import {isDeepStrictEqual} from 'node:util';

// Shared by new review owners and the outgoing view of explicitly corrected
// owner assignments. Review provenance is not a second source of task policy.
export const ROSTER_REVIEW_OWNER_AUTHORITY_INSTRUCTION_V1='The review issues are proposals to resolve, not experimental authorizations. Reuse actual completed evidence. Decide which current claim needs a fact, an author choice or a correction; preserve unresolved required questions. Any new query MUST use nextInvestigation with its exact proof/time/spatial contract and current executable capabilities. Independent unit paths are not a joint state. Missing proof capability requires an explicit engineering blocker or a justified actual claim/Plan decision, not another initialization or relabelling the same unsupported query. Host does not choose a strategy or approve an unknown. The current assignment question supplies the task-specific limits; this review-return record cannot extend those limits or prohibit the author from proposing an operation allowed by that current assignment. Proposing an inquiry is distinct from Native execution, which remains subject to the normal authorization and capability checks.';

// Review rounds belong to domains, not to competing authors of one draft.
export function nextRosterReviewOwnerGroupIdV1(state){
  const base=`review-resolution:r${state.draftRevision}`;
  if(!state.work.some(w=>w.id===base+':decision'))return base;
  let n=1;while(state.work.some(w=>w.id===`${base}:joint:${n}:decision`))n++;
  return `${base}:joint:${n}`;
}
export function createRosterWorkflowReviewOwnerV1({state,groupId,groups,readiness}){
  const issues=groups.flatMap(group=>group.issues);
  const inputs={draft:{source:'evidence',id:`draft:r${state.draftRevision}:summary`,pointer:''},
    requirements:{source:'literal',value:readiness},
    reviewIssues:{source:'literal',value:issues},
    mechanics:{source:'literal',value:readiness.mechanicalFacts},
    reviewResolutionAuthorization:{source:'literal',value:{version:1,groupId,
      domains:groups.map(g=>({domain:g.domain,reviewId:g.reviewId,reviewRound:g.reviewRound})),
      reviewerAuthorizesExperiments:false,authorChoosesInquiry:true,factsApproved:false,planApproved:false,
      instruction:ROSTER_REVIEW_OWNER_AUTHORITY_INSTRUCTION_V1}},
    question:{source:'literal',value:'Resolve these review domains in ONE joint army/Plan decision. Retain with grounded reasons, revise affected blocks, or authorize one necessary supported inquiry through the normal decision contract. Fixed-army constraints still apply. Reviewers do not force an experimental method or strategic preference; necessary factual contradictions remain to resolve. Do not start global Teach again or simulate a complete match.'}};
  groups.forEach((group,i)=>{inputs[`domainReview${i}`]={source:'work',id:group.reviewId,pointer:'/value'};});
  return {id:groupId+':decision',role:'roster_workflow_strategy_decision',
    reviewResolutionOwnerVersion:1,reviewResolutionGroupId:groupId,
    reviewResolutionDomains:groups.map(g=>g.domain),draftRevision:state.draftRevision,bindings:state.scope,inputs};
}

// Exact replacement of legacy, entirely unissued parallel owners. Never merge
// paid/running decisions or change an original review's counter.
export function projectRosterUnissuedReviewOwnerMergeV1({state}){
  const owners=state.work.filter(w=>w.reviewResolutionOwnerVersion===1&&w.draftRevision===state.draftRevision
    &&!['superseded','evidence_ready'].includes(w.status));
  if(owners.length<2||state.work.some(w=>w.status==='running'||w.operationState?.pending)
    ||owners.some(w=>w.role!=='roster_workflow_strategy_decision'||!['ready','waiting_dependency'].includes(w.status)
      ||w.resultRef||w.inputRef||w.operationState||w.attempt||!isDeepStrictEqual(w.bindings,state.scope)))return null;
  const readiness=owners[0].inputs.requirements?.value,groups=new Map();
  if(!readiness||owners.some(w=>!isDeepStrictEqual(w.inputs.requirements?.value,readiness)))return null;
  for(const owner of owners){
    const domains=owner.inputs.reviewResolutionAuthorization?.value?.domains,issues=owner.inputs.reviewIssues?.value;
    if(!Array.isArray(domains)||!domains.length||!Array.isArray(issues)
      ||issues.some(i=>!domains.some(d=>d.reviewId===i.workId)))return null;
    for(const d of domains){
      const review=state.work.find(w=>w.id===d.reviewId);
      if(!review||review.role!=='roster_workflow_final_review'||review.status!=='evidence_ready'||!review.resultRef
        ||review.draftRevision!==state.draftRevision||review.reviewDomain!==d.domain||(review.reviewRound??1)!==d.reviewRound
        ||!Object.values(owner.inputs).some(v=>v.source==='work'&&v.id===review.id))return null;
      const existing=groups.get(d.domain);
      if(existing&&existing.reviewId!==d.reviewId)return null;
      const local=issues.filter(i=>i.workId===d.reviewId);
      if(!local.length)return null;
      if(existing){for(const issue of local)if(!existing.issues.some(i=>isDeepStrictEqual(i,issue)))existing.issues.push(issue);}
      else groups.set(d.domain,{...d,issues:structuredClone(local)});
    }
  }
  const job=createRosterWorkflowReviewOwnerV1({state,groupId:nextRosterReviewOwnerGroupIdV1(state),groups:[...groups.values()],readiness});
  job.supersedesUnissuedReviewOwners=owners.map(w=>w.id);
  job.inputs.reviewOwnerMerge={source:'literal',value:{version:1,sourceWorkIds:[...job.supersedesUnissuedReviewOwners],
    originalRecordsPreserved:true,reviewCountersReset:false,factsApproved:false,planApproved:false,
    instruction:'These same-draft review domains previously created separate unissued authors only because their review rounds differ. They now share one strategic decision. Each domain retains its original review and round; no reviewed fact or pending obligation was removed.'}};
  return job;
}
