// Archive an ALREADY reviewed local comparison; never commission another model
// review, reconstruct a verdict from numbers, or promote it to a production Skill.
import {loadRosterProductHypothesisChallengeV1} from './roster-hypothesis-cycle-v1.mjs';
import {createRosterWorkflowOwnershipIndexV1} from '../roster-strategist/roster-workflow-ownership-v1.mjs';
import {rosterExperienceApplicabilityV1} from '../roster-strategist/roster-conditional-experience-bindings-v1.mjs';
const copy=structuredClone;
const prefix='conditional-conclusion:';

export function projectRosterConditionalConclusionV1({memory,purpose,purposeSource,sourceReview,scope,observations=[]}){
  if(!memory?.comparisonResolved||!memory.ownerReturned||['reviewed_optional_retention','reviewed_deferred_hypothesis'].includes(memory.comparisonResolutionKind)||memory.staleDependencyWorkIds?.length
    ||!memory.experiment?.acceptedForStrategy||memory.experiment.unresolvedQuestions?.length
    ||!memory.experiment.conclusion||!memory.owner?.outcomeRef||!memory.owner.decision
    ||!memory.review?.resultRef||!purpose||!purposeSource?.resultRef||!sourceReview?.resultRef)return null;
  return {
    schema:'roster_conditional_experience_conclusion_v1',version:1,
    recordKind:'reviewed_conditional_conclusion',cycleId:memory.cycleId,
    // Plan-only wording changes do not change Rules/army/map facts. A different
    // factual scope requires applicability review; no silent version coercion.
    sourceBindings:copy(Object.fromEntries(Object.entries(scope).filter(([key])=>key!=='plan'))),
    purpose:copy(purpose),
    observations:copy(observations),
    observationMeaning:'Related original observations, not blanket approval of every result. The conclusion and its exact source review define which claims are supported. Failed/unknown/control-only results are not zero measurements.',
    conclusion:copy(memory.experiment.conclusion),
    authorDecision:copy(memory.owner.decision),
    conditions:{experiment:copy(memory.experiment.conditions??[]),comparisonReview:copy(memory.review.conditions??[]),
      invalidIf:copy(purpose.invalidIf??[]),
      applicability:'Only the stated participants/configurations, scene, mechanism endpoint and opponent assumptions. Read the exact observation sources; no whole-match superiority or transfer to a new situation is inferred.'},
    proof:{purpose:copy(purposeSource),experiment:copy(memory.experiment),sourceReview:copy(sourceReview),
      owner:copy(memory.owner),comparisonReview:copy(memory.review)},
    reviewStatus:'source_and_conditional_comparison_reviewed',
    promotionStatus:'awaiting_held_out_evaluation',advisorySkillEligible:false,
    strategyImprovementProven:false,canAffectRules:false,trainingTruth:false,
    realMatchHistory:false,mayWriteLiveRoomMemory:false,
    instruction:'A durable, searchable conditional experience candidate. Preserve support, refutation or inconclusiveness exactly as reviewed. Future Skill promotion requires applicability and held-out evaluation; retrieval does not approve an action or alter Rules. Experimental events are not live-match memory.',
  };
}

export async function publishRosterConditionalConclusionV1({workflow,state,record}){
  if(!record)return null;
  const id=`${prefix}${record.cycleId}:${record.proof.owner.outcomeRef}:${record.proof.comparisonReview.resultRef}`;
  const existing=state.evidence.find(entry=>entry.id===id);if(existing)return existing;
  return workflow.dispatch({type:'publish_evidence',id,kind:'hypothesis',bindings:record.sourceBindings,
    title:`Reviewed conditional experience: ${record.purpose.decisionQuestion} / ${record.purpose.currentChoice} / ${record.purpose.alternative}`,
    conditions:[...record.conditions.experiment,...record.conditions.comparisonReview,
      'Local reviewed conclusion only; not a released Skill or real-match event'],value:record});
}

export async function archiveRosterConditionalConclusionV1({workflow,store}){
  const state=await workflow.inspect();if(!state.draftRef)return null;
  // Same assessor and source lineage as product scheduling/role delivery. No
  // caller-supplied "passed" flags or new archive-specific model judge.
  const challenge=await loadRosterProductHypothesisChallengeV1({state,draft:await store.get(state.draftRef),readArtifact:store.get,includeArchiveSources:true});
  const memory=challenge?.comparisonMemory;
  if(!memory?.comparisonResolved||!memory.ownerReturned||['reviewed_optional_retention','reviewed_deferred_hypothesis'].includes(memory.comparisonResolutionKind))return null;
  const id=`${prefix}${memory.cycleId}:${memory.owner?.outcomeRef}:${memory.review?.resultRef}`;
  const existing=state.evidence.find(entry=>entry.id===id);if(existing)return existing;
  const observations=[],owner=createRosterWorkflowOwnershipIndexV1(state);
  const goalId=state.work.find(work=>work.id===memory.experiment?.workId)?.experimentGoalId;
  for(const entry of state.evidence){
    if(!entry.id.startsWith('conditional-experience:'))continue;
    const record=await store.get(entry.artifactRef);
    const ownership=owner(record.actualObservation?.source?.workId);
    if(!goalId||ownership?.goalId!==goalId&&!ownership?.lineage?.includes(goalId))continue;
    observations.push({evidenceId:entry.id,artifactRef:entry.artifactRef,record});
  }
  const record=projectRosterConditionalConclusionV1({memory,purpose:memory.purpose?.value,
    purposeSource:memory.purpose,sourceReview:memory.experiment?.sourceReview,scope:state.scope,observations});
  return publishRosterConditionalConclusionV1({workflow,state,record});
}

export async function queryRosterConditionalConclusionsV1({state,store,query=''}){
  const terms=String(query).toLocaleLowerCase().split(/\s+/u).filter(Boolean),entries=[];
  for(const entry of state.evidence.filter(entry=>entry.id.startsWith(prefix)
    &&terms.every(term=>`${entry.id} ${entry.title}`.toLocaleLowerCase().includes(term)))){
    const record=await store.get(entry.artifactRef);
    if(record?.schema!=='roster_conditional_experience_conclusion_v1')continue;
    entries.push({evidenceId:entry.id,artifactRef:entry.artifactRef,
      ...rosterExperienceApplicabilityV1(entry.bindings,state.scope),
      usableWithoutApplicabilityReview:false,record});
  }
  return {schema:'roster_conditional_conclusion_query_v1',entries,
    strategyApprovalGranted:false,canAffectRules:false,trainingTruth:false};
}
