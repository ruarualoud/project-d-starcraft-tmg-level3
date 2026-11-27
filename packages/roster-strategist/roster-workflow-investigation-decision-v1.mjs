import {rosterInvestigationDecisionWorkIdV1} from './roster-inquiry-review-stage-v1.mjs';

// Transport after the caller has assessed the actual inquiry conclusion and
// source review. This constructor grants neither fact approval nor Plan approval.
export function createRosterInvestigationDecisionWorkV1({state,investigator,summaryIds,readiness}){
  if(!summaryIds?.length)return null;
  const id=rosterInvestigationDecisionWorkIdV1({state,investigator,summaryIds});
  if(state.work.some(work=>work.id===id))return null;
  const prior=state.work.find(work=>work.id===investigator.investigationFor);
  if(!prior)throw Error('ROSTER_INVESTIGATION_AUTHOR_MISSING');
  const inheritedInputs=structuredClone(prior.inputs),historicalInputs={};
  for(const key of Object.keys(inheritedInputs))if([
    'unavailableCapabilities','delegationBoundaryRequests','sourceInterpretationChallenges','investigationFrontier',
    'unfinishedMethods','batchProgress','previousBatch','completedNativeTransitions',
    'newEvidenceTask','investigation','investigationReturn','priorInvestigationContext',
  ].includes(key)||/^(?:batchFacts|batchToolSource|newFacts)\d+$/u.test(key)){
    historicalInputs[key]=inheritedInputs[key];delete inheritedInputs[key];
  }
  const inputs={...(investigator.afterAppliedRevision?{
      question:prior.inputs.question??{source:'literal',value:'Complete the current user-target roster and coherent strategy using the returned facts.'},
      draft:{source:'evidence',id:`draft:r${state.draftRevision}:summary`,pointer:''},
      requirements:{source:'literal',value:readiness},
    }:inheritedInputs),
    priorInvestigationContext:{source:'literal',value:{version:1,ownerWorkId:prior.id,
      originalInputRef:prior.inputRef??null,inputs:historicalInputs,currentFailure:false,
      instruction:'Historical return context only. The original failure remains true about that earlier attempt; it is not the current result or an instruction to repeat that inquiry.'}},
    priorAuthorDecision:{source:'evidence',id:`role:${prior.id}`,pointer:'',scopeUsage:'historical_reference'},
    investigationReturn:{source:'literal',value:{version:1,investigationWorkId:investigator.id,
      previousAuthorWorkId:prior.id,acceptedConclusionWorkId:summaryIds[0],sourceReviewWorkId:summaryIds[1]??null,
      originalQuestionsResolvedByHost:false,planApprovalGranted:false,
      instruction:'Consume the returned conclusion AND its source/coverage review, then decide against the current draft. Preserve and explicitly classify the previous author decision questions; do not re-open the previous capability failure just because its historical record is present. A genuinely missing original predicate still requires a justified further inquiry. No automatic strategy selection or Plan approval.'}},
    newEvidenceTask:{source:'literal',value:'Your requested investigation has returned. Use actual new evidence to revise army and Plan together, retain with a strategic reason, or identify a different necessary question. Do not repeat the original request as if it had not run. Unresolved questions are not resolved by the summary.'},
    // This is the original delegation, not the returned conclusion. A numeric
    // retraction may obsolete its observations without erasing who asked what.
    // Only newFacts below carry current evidential authority.
    investigation:{source:'evidence',id:`role:${investigator.id}`,pointer:'',scopeUsage:'historical_reference'}};
  summaryIds.forEach((summary,index)=>{inputs[`newFacts${index}`]={source:'evidence',id:`role:${summary}`,pointer:''};});
  return {id,role:'roster_workflow_strategy_decision',bindings:investigator.bindings,
    draftRevision:state.draftRevision,strategyContinuationOf:prior.id,inputs};
}
