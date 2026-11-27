// Plan prose changes do not erase the same-army comparison's paid decisions.
// References are historical, never automatic approval of the new Plan.
import {isDeepStrictEqual} from 'node:util';
import {previousRosterInitialRetentionV1} from './roster-initial-retention-v1.mjs';
const factualKeys=['army','rules','map','source'];
export async function projectRosterComparisonProgressInputsV1({state,cycleId,readArtifact}){
  const retention=await previousRosterInitialRetentionV1({state,cycleId,readArtifact});
  const retainedInputs=retention?{
    initialRetentionProgress:{source:'literal',value:retention},
    previousRetentionDecision:{source:'evidence',id:'role:'+retention.authorWorkId,pointer:'/decisions/0',scopeUsage:'historical_reference'},
    previousRetentionReview:{source:'evidence',id:'role:'+retention.reviewId,pointer:'',scopeUsage:'historical_reference'},
  }:{};
  const reviews=[];
  for(const work of state.work){
    if(work.comparisonValueReviewCycleId!==cycleId||work.comparisonValueContractVersion!==2
      ||!work.resultRef||!['evidence_ready','superseded'].includes(work.status)
      ||work.draftRevision>=state.draftRevision
      ||!factualKeys.every(k=>work.bindings?.[k]===state.scope[k]))continue;
    const context=work.inputs?.decisionValueContext?.value;
    const author=state.work.find(w=>w.id===context?.source?.authorWorkId);
    if(!author?.resultRef||author.resultRef!==context.source.authorResultRef)continue;
    const result=await readArtifact(author.resultRef);
    if(!isDeepStrictEqual(result?.value?.comparisonDesignHandoff?.request,context.proposal))continue;
    reviews.push({workId:work.id,resultRef:work.resultRef,draftRevision:work.draftRevision,
      authorWorkId:author.id,authorResultRef:author.resultRef,reviewRound:work.reviewRound});
  }
  if(!reviews.length)return retainedInputs;
  const latest=reviews.at(-1);
  return {...retainedInputs,
    comparisonProgress:{source:'literal',value:{version:1,cycleId,
      sourceContext:Object.fromEntries(factualKeys.map(k=>[k,state.scope[k]])),
      reviewHistory:reviews,latestReview:latest,currentPlanApproved:false,countersReset:false,
      instruction:'This is progress of the SAME factual comparison, not a new Teach task. Read the latest reviewed proposal and these exact reviews before deciding; older rejected designs must not replace a later corrected design merely because the Plan revision changed. Review opinions remain fallible and historical. Reconcile the actual current Plan, preserve valid reasoning, correct concrete remaining gaps, or justify retaining/ending the comparison. Do not repeat a single-ability experiment as proof of a different roster investment. A previously accepted question still needs current-Plan review; no strategy winner, measurement, acceptance or counter reset is granted.'}},
    previousComparisonProposal:{source:'evidence',id:'role:'+latest.authorWorkId,pointer:'/decisions/0/comparisonDesignRequest',scopeUsage:'historical_reference'},
    ...Object.fromEntries(reviews.map((r,i)=>['previousComparisonReview'+i,
      {source:'evidence',id:'role:'+r.workId,pointer:'',scopeUsage:'historical_reference'}])),
  };
}
export async function rosterComparisonProgressDeliveryRepairV1({state,source,readArtifact}){
  const author=state.work.find(w=>w.id===source.authorWorkId);
  if(author?.inputs?.initialComparisonQuestion?.value?.cycleId!==source.cycleId)return null;
  const inputs=await projectRosterComparisonProgressInputsV1({state,cycleId:source.cycleId,readArtifact});
  if(inputs.initialRetentionProgress&&!isDeepStrictEqual(author.inputs.initialRetentionProgress,inputs.initialRetentionProgress))
    return createRosterRetentionProgressOwnerInputV1({state,cycleId:source.cycleId,author,inputs});
  if(!inputs.comparisonProgress||isDeepStrictEqual(author.inputs.comparisonProgress,inputs.comparisonProgress))return null;
  // A source-bound CURRENT-Plan review already returned the latest proposal
  // and its actual findings to this author. Requiring another author solely to
  // recopy the older-Plan progress wrapper would regress that feedback loop.
  // This only removes the redundant reminder; the new proposal still needs
  // its independent value review, under the unchanged attempt allowance.
  // The feedback boundary is the author task's creation, not now: a later
  // review of this very reply cannot retroactively make its input incomplete.
  const review=state.work.slice(0,state.work.indexOf(author)).findLast(w=>w.comparisonValueReviewCycleId===source.cycleId
    &&w.comparisonValueContractVersion===2&&w.status==='evidence_ready'&&w.resultRef);
  const feedback=author.inputs.comparisonOwnerReturn?.value;
  const prior=review?.inputs?.decisionValueContext?.value;
  const predecessor=state.work.find(w=>w.id===review?.comparisonValueAuthorWorkId);
  if(review&&review.draftRevision===state.draftRevision
    &&Object.entries(state.scope).every(([key,value])=>review.bindings?.[key]===value)
    &&author.inputs.decisionValueReview?.source==='evidence'
    &&author.inputs.decisionValueReview.id==='role:'+review.id
    &&feedback?.decisionValueReviewId===review.id&&feedback.decisionValueResultRef===review.resultRef
    &&author.inputs.priorAuthorDecision?.id==='role:'+predecessor?.id
    &&author.inputs.priorDecisionProposal?.id==='role:'+predecessor?.id
    &&predecessor?.resultRef===prior?.source?.authorResultRef
    &&isDeepStrictEqual(feedback.originalDecision,prior?.proposal))return null;
  return {id:author.id+':comparison-progress:c29',inputs:{...inputs,
    initialComparisonQuestion:structuredClone(author.inputs.initialComparisonQuestion),
    priorAuthorDecision:{source:'evidence',id:'role:'+author.id,pointer:'/decisions/0',scopeUsage:'historical_reference'},
    comparisonControlSeed:{source:'literal',value:{originalReplyRef:source.authorReplyRef}},
    strategicHypothesisCycle:{source:'literal',value:{id:source.cycleId,version:4}}},
    question:{goal:'承接同一比较已经完成的设计与审核，修正跨Plan版本丢失进展造成的退步。',
      instruction:inputs.comparisonProgress.value.instruction+' 当前草案由wholeDraft提供；用正常作者操作重新确认本次真正要选择什么。仅检查变化与尚未闭合的因果/成本关系，不重演已存实验，不把旧支持标签当本版本批准。'}};
}

export function createRosterRetentionProgressOwnerInputV1({state,cycleId,author,inputs}){
  if(!inputs.initialRetentionProgress)throw Error('ROSTER_PREVIOUS_RETENTION_REQUIRED');
  return {id:author.id+':retention-context:v1',inputs:{...inputs,
    initialComparisonQuestion:structuredClone(author.inputs.initialComparisonQuestion),
    priorAuthorDecision:{source:'evidence',id:'role:'+author.id,pointer:'/decisions/0',scopeUsage:'historical_reference'},
    strategicHypothesisCycle:{source:'literal',value:{id:cycleId,version:4}},
    retentionDeliveryRepair:{source:'literal',value:{version:1,sourceWorkId:author.id,sourceResultRef:author.resultRef,
      toRevision:state.draftRevision,historyReset:false,factsApproved:false,planApproved:false}}},
    question:{goal:'承接已复核的保留决定，判断当前Plan变化是否真的需要重开比较。',
      instruction:inputs.initialRetentionProgress.value.instruction+' 当前完整Plan由wholeDraft提供。回应具体变化与原重开条件，不要求为了完成流程而新建实验。若已有比较执行目标需停止，请用正常comparisonClosureRequest并独立复审；若确要继续，明确何处新事实/新选择改变了此前决定。工程不替你选择方案。'}};
}
