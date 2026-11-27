// A reviewed current retention ends the old request to revisit comparison
// history. Retire only unused navigation, never facts or paid/in-flight work.
import {isDeepStrictEqual} from 'node:util';
import {assessRosterInitialRetentionV1} from './roster-initial-retention-v1.mjs';
import {rosterWorkflowBindingsMatchV1} from './roster-decision-workflow-v1.mjs';
import {rosterWorkflowWorkDependenciesV1} from './roster-workflow-graph-v1.mjs';

export async function projectRosterCompletedComparisonNavigationV1({state,readArtifact}){
  const candidates=state.work.filter(w=>w.role==='roster_workflow_strategy_decision'
    &&w.status==='ready'&&!w.resultRef&&!w.draftOutcomeRef&&!w.operationState?.pending
    &&!(w.operationState?.calls?.length)&&!w.attempt
    &&w.inputs?.comparisonProgress?.source==='literal'
    &&w.inputs.comparisonProgress.value?.version===1
    &&w.draftRevision===state.draftRevision&&rosterWorkflowBindingsMatchV1(w.bindings,state.scope));
  const settlements=[];
  for(const cycleId of new Set(candidates.map(w=>w.inputs.comparisonProgress.value.cycleId))){
    if(!cycleId)continue;
    const retained=await assessRosterInitialRetentionV1({state,cycleId,readArtifact});
    if(!retained?.accepted)continue;
    const ownerIndex=state.work.findIndex(w=>w.id===retained.authorWorkId);
    for(const work of candidates.filter(w=>w.inputs.comparisonProgress.value.cycleId===cycleId)){
      const progress=work.inputs.comparisonProgress.value;
      if(state.work.indexOf(work)>=ownerIndex
        ||work.inputs.strategicHypothesisCycle?.value?.id!==cycleId
        ||!isDeepStrictEqual(work.inputs.initialComparisonQuestion?.value,retained.initialQuestion)
        ||!progress.sourceContext||!rosterWorkflowBindingsMatchV1(progress.sourceContext,state.scope))continue;
      // Another unfinished consumer would require its own explicit handoff.
      if(state.work.some(w=>w.id!==work.id&&!['evidence_ready','superseded','returned_to_owner'].includes(w.status)
        &&rosterWorkflowWorkDependenciesV1(w).includes(work.id)))continue;
      settlements.push({version:1,cycleId,workId:work.id,authorWorkId:retained.authorWorkId,
        authorResultRef:retained.authorResultRef,authorOutcomeRef:retained.authorOutcomeRef,
        reviewId:retained.reviewId,reviewResultRef:retained.reviewResultRef,
        previousStatus:work.status,originalResultRef:work.resultRef??null,
        reason:'Current independently reviewed retention supersedes this earlier unissued comparison-history navigation.',
        factsApproved:false,planApproved:false,strategyImprovementProven:false,
        historyReset:false,providerReplay:false});
    }
  }
  return settlements;
}
