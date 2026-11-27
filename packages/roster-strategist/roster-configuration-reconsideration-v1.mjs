// One source-contract notification to a retained, unresolved author. This is
// not permission to replay Native, clear reviews or choose a different army.
import {createRosterWorkflowOwnershipIndexV1} from './roster-workflow-ownership-v1.mjs';
import {needsRosterParticipantConfigurationV1,ROSTER_PARTICIPANT_CONFIGURATIONS_SCHEMA_V1} from './roster-participant-configuration-v1.mjs';
import {projectRosterAuthorQuestionReconsiderationV1} from './roster-author-question-contract-v1.mjs';
import {projectRosterStrategyProgressReconsiderationV1} from './roster-strategy-progress-contract-v1.mjs';
import {projectRosterActionAvailabilityReconsiderationV1} from './roster-action-availability-reconsideration-v1.mjs';
import {projectRosterInquiryHandoffReconsiderationV1} from './roster-completed-inquiry-handoff-v1.mjs';
const copy=structuredClone;
export async function projectRosterConfigurationReconsiderationV1({state,readArtifact}){
  if(state.work.some(w=>w.status==='running'||w.status==='ready'||w.operationState?.pending))return null;
  const inquiryHandoff=await projectRosterInquiryHandoffReconsiderationV1({state,readArtifact});
  if(inquiryHandoff)return inquiryHandoff;
  const progressRepair=await projectRosterStrategyProgressReconsiderationV1({state,readArtifact});
  if(progressRepair)return progressRepair;
  const availabilityRepair=await projectRosterActionAvailabilityReconsiderationV1({state,readArtifact});
  if(availabilityRepair)return availabilityRepair;
  const coverageRepair=await projectRosterAuthorQuestionReconsiderationV1({state,readArtifact});
  if(coverageRepair)return coverageRepair;
  const owns=createRosterWorkflowOwnershipIndexV1(state);
  const current=w=>w&&w.status!=='superseded'&&Object.entries(w.bindings??{}).every(([k,v])=>state.scope[k]===v);
  for(const goal of [...state.work].reverse()){
    const previous=state.work.find(w=>w.id===goal.investigationHandoff?.decisionId);
    if(!current(goal)||!current(previous)||previous.role!=='roster_workflow_strategy_decision'
      ||previous.investigationFrontierOf!==goal.id||previous.status!=='evidence_ready'
      ||!previous.resultRef||!previous.draftOutcomeRef||previous.inputs.configurationContractChange)continue;
    const id=previous.id+':configuration-contract-v1';
    if(state.work.some(w=>w.id===id))continue;
    if(!previous.inputs.sourceInterpretationChallenges?.value?.some(c=>
      c.kind==='source_interpretation_challenge'&&c.diagnostic?.code==='necessary_fact_has_no_new_material_evidence'))continue;
    const outcome=await readArtifact(previous.draftOutcomeRef),decision=outcome.decision;
    if(!['retain','retained'].includes(outcome.status)||decision?.disposition!=='retain'
      ||decision.nextInvestigation||!decision.requiredData?.length)continue;
    const unboundSources=[];
    for(const work of state.work){
      if(work.role!=='roster_workflow_tool'||work.status!=='evidence_ready'||!work.resultRef
        ||owns(work.id)?.goalId!==goal.id)continue;
      const request=work.inputs.request?.value,binding=request?.comparisonBinding;
      if(!binding||!needsRosterParticipantConfigurationV1({scope:request.experimentScope,binding,operation:request.operation})
        ||request.experimentScope?.participantConfigurations?.length||binding.participantConfigurations?.length)continue;
      const result=await readArtifact(work.resultRef),value=result.value;
      if(result.kind!=='tool_receipt'||value?.status!=='completed'||value.contextRef!==null
        ||value.participantConfigurationCheck||value.experimentOrigin?.sourceWorkId!==work.id)continue;
      unboundSources.push({workId:work.id,resultRef:work.resultRef,operation:value.operation,
        selectedContextRef:value.contextRef,comparisonId:binding.comparisonId,arm:binding.arm,
        declaredArmDescription:binding.armDescription,participantUnitIds:copy(request.experimentScope.participantUnitIds),
        conclusion:'No typed participant configuration was checked; prose did not change the selected root army'});
    }
    if(!unboundSources.length)continue;
    const change={version:1,sourceContract:'roster_participant_configuration_v1',sourceWorkId:previous.id,
      sourceResultRef:previous.resultRef,unboundSources,configurationSchema:copy(ROSTER_PARTICIPANT_CONFIGURATIONS_SCHEMA_V1),
      nativeReplayed:false,historyReset:false,planApproved:false,
      instruction:'The previous method described an arm in prose without a typed configuration selection/check. '+
        'The product now compares declared participantConfigurations with the exact selected candidate before measurement. '+
        'candidate_context creates an explicitly chosen legal alternative; a scenario changes geometry, not composition/upgrades. '+
        'Reconsider the still-unresolved original question once using this corrected contract. Choose the needed bounded method, '+
        'or a reasoned revision/retain with its unresolved obligations. Do not repeat an identical wrong measurement, copy actual '+
        'configuration into an incompatible intention merely to pass, or treat this engineering notification as evidence of superiority. '+
        'No strategy is selected by Host and prior reviews/costs/replies remain unchanged.'};
    return {id,role:previous.role,bindings:copy(previous.bindings),draftRevision:state.draftRevision,
      investigationFrontierOf:goal.id,investigationOwnerId:previous.investigationOwnerId,reconsidersFrontierOf:previous.id,
      inputs:{...copy(previous.inputs),
        previousStrategicDecision:{source:'evidence',id:'role:'+previous.id,pointer:'',scopeUsage:'historical_reference'},
        configurationContractChange:{source:'literal',value:change},
        question:{source:'literal',value:{goal:'配置选择合同已修复，请重新决定原未完成实验如何继续；不是再次提交相同测量。',
          originalAssignment:copy(previous.inputs.question?.value??null),instruction:change.instruction}}}};
  }
  return null;
}
