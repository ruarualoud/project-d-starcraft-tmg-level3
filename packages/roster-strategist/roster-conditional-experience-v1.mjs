// Conditional observations are durable evidence, not accepted strategy skills.
// Preserve declared intent separately from the exact executed request/result;
// neither a successful tool call nor a numeric comparison approves a hypothesis.
import {rosterWorkflowBindingsMatchV1} from './roster-decision-workflow-v1.mjs';
import {projectRosterMeasuredComparisonMeaningV1} from './roster-measured-comparison-v1.mjs';

const copy=structuredClone;
const prefix='conditional-experience:';
const scalar=value=>value===null||['string','number','boolean'].includes(typeof value);
const scalarEntries=value=>Object.fromEntries(Object.entries(value??{}).filter(([,v])=>scalar(v)));

export function projectRosterConditionalExperienceObservationV1({work,result}){
  const value=result?.value,origin=value?.experimentOrigin,receipt=value?.receipt;
  if(work?.role!=='roster_workflow_tool'||work.status!=='evidence_ready'||!work.resultRef
    ||result?.kind!=='tool_receipt'||result.continuation===true||value?.status!=='completed'
    ||origin?.schema!=='roster_conditional_scenario_origin_v1'||origin.sourceWorkId!==work.id
    ||!receipt||typeof receipt!=='object')return null;
  const estimate=receipt.estimate,metrics=estimate?.outcomes??estimate;
  const source={workId:work.id,resultRef:work.resultRef,resultPointer:'/value/receipt',
    evidenceId:`tool:${work.id}`,evidencePointer:'/receipt'};
  const comparisonMeaning=projectRosterMeasuredComparisonMeaningV1(receipt);
  return {
    schema:'roster_conditional_experience_observation_v1',version:1,
    recordKind:'conditional_observation_candidate',
    declaredConditions:{origin:copy(origin),verifiedByThisRecord:false},
    actualObservation:{
      source,operation:value.operation,contextRef:value.contextRef??null,
      stateRef:copy(value.stateRef??null),bindings:copy(work.bindings),
      inputBindings:copy(value.inputBindings??null),
      participantConfigurationCheck:copy(value.participantConfigurationCheck??null),
      submittedArguments:copy(value.submittedArguments??null),request:copy(value.request??null),
      // Unknown and failed Native outcomes remain unknown/failed, never zero.
      resultStatus:receipt.resultStatus??'not_classified',unknownReason:receipt.unknownReason??null,
      participants:{attackerUnitId:receipt.attackerUnitId??null,targetUnitId:receipt.targetUnitId??null},
      attackProfile:estimate?{queryKind:estimate.queryKind??null,weaponName:estimate.weaponName??null,
        profileKey:estimate.profileKey??null,canonicalParameters:copy(estimate.canonicalParameters??null),
        contributingModelIds:copy(estimate.contributingModelIds??[]),
        visibleTargetModelIds:copy(estimate.visibleTargetModelIds??[])}:null,
      metricValues:receipt.resultStatus==='ok'?scalarEntries(metrics):{},
      metricSourcePointer:estimate?`/value/receipt/estimate${estimate.outcomes?'/outcomes':''}`:null,
      comparisonMeaning,
      // Large distributions and full Native geometry stay at the immutable
      // source, not duplicated into every model input or experience record.
      assumptions:copy(estimate?.assumptions??[]),uncertainty:copy(estimate?.uncertainty??null),
      toolProofScope:copy(value.toolProofScope??null),conditions:copy(result.conditions),
    },
    review:{status:'unreviewed',sourceReviewRef:null,applicabilityReviewRef:null},
    conclusion:null,advisorySkillEligible:false,humanReviewed:false,
    canAffectRules:false,trainingTruth:false,realMatchHistory:false,mayWriteLiveRoomMemory:false,
    instruction:'This is a retrievable conditional observation, not a proven hypothesis or an accepted Skill. '+
      'The declared conditions may differ from the actual request/state. Read the source and check configurations, '+
      'controls, uncertainty and coverage before drawing a conclusion. A false comparison answers only its named direction. '+
      'Offline source/applicability review and evaluation are required before strategy promotion; no live memory mutation.',
  };
}

export async function publishRosterConditionalExperienceObservationV1({workflow,state,work,result}){
  const id=`${prefix}${work.id}:${work.resultRef}`;
  const existing=state.evidence.find(entry=>entry.id===id);
  if(existing)return existing;
  const record=projectRosterConditionalExperienceObservationV1({work,result});
  if(!record)return null;
  const origin=record.declaredConditions.origin,participants=record.actualObservation.participants;
  return workflow.dispatch({type:'publish_evidence',id,kind:'hypothesis',bindings:work.bindings,
    title:`Conditional observation (unreviewed): ${origin.kind} / ${record.actualObservation.operation} / `+
      `${participants.attackerUnitId??''} → ${participants.targetUnitId??''} / ${origin.question}`,
    conditions:[...record.actualObservation.conditions,
      'Declared scenario is not automatically verified; unreviewed observation, not approved strategy or real-match history'],
    value:record});
}

export async function queryRosterConditionalExperienceObservationsV1({state,store,query=''}){
  const terms=String(query).toLocaleLowerCase().split(/\s+/u).filter(Boolean),entries=[];
  // Filter the small searchable catalogue before loading immutable records.
  for(const entry of state.evidence.filter(entry=>entry.id.startsWith(prefix)
    &&terms.every(term=>`${entry.id} ${entry.title}`.toLocaleLowerCase().includes(term)))){
    const record=await store.get(entry.artifactRef);
    if(record?.schema!=='roster_conditional_experience_observation_v1')continue;
    entries.push({evidenceId:entry.id,artifactRef:entry.artifactRef,
      sourceBindingsMatchCurrent:rosterWorkflowBindingsMatchV1(entry.bindings,state.scope),record});
  }
  return {schema:'roster_conditional_experience_query_v1',entries,
    strategyApprovalGranted:false,canAffectRules:false,trainingTruth:false};
}
