import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {projectRecordedMissionScoreV1} from './pregame-temporal-outcome-v1.mjs';

export const ROSTER_MISSION_SCORE_METRIC_V1='awardedObjectiveVp';
export const ROSTER_MISSION_SCORE_DEFINITION_V1={
  valueType:'number',unit:'vp',aggregation:'conditional_native_award',
  sourceOperations:['native_action','bounded_joint_temporal'],
  observationDomain:{id:'native_mission_scoring_event',terminalBranches:['mission_victory_points_scored'],
    description:'Objective VP awarded in one exact Native round and branch. Excludes destroyed-enemy Supply VP.'},
  supportedInference:'difference_of_conditional_awards',
};

const scoringActions=new Set(['score_mission','score_standard_mission']);
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/u.test(value);
const unknown=reason=>({status:'source_unresolved',reason});

export function extractRosterMissionScoreV1(source,{seatKey,awardNumber}){
  const body=source?.value,receipt=body?.receipt;
  if(!receipt||!['completed','returned_to_model'].includes(body.status))return unknown('saved_native_scoring_receipt_required');
  const {receiptHash,...payload}=receipt;
  if(!digest(receiptHash)||hash(payload)!==receiptHash||receipt.mutatesSourceState!==false
    ||receipt.trainingTruth!==false||!digest(receipt.rulesRuntimeHash))return unknown('invalid_native_scoring_receipt');
  let sample;
  if(body.operation==='bounded_joint_temporal'){
    const selected=projectRecordedMissionScoreV1(receipt,awardNumber);
    if(!selected)return unknown('no_award_at_selected_observation');
    const {event,pointer,observation,transition}=selected;
    sample={event,pointer,conditions:structuredClone(observation.conditions),stateHash:transition.stateHash,
      parentStateHash:transition.parentStateHash,nativeReceiptHash:transition.nativeReceiptHash};
  }else if(body.operation==='native_action'){
    if(receipt.schema!=='starcraft_tmg_pregame_lab_scenario_branch_receipt_v1'||receipt.branchKind!=='native_action'
      ||receipt.resultStatus!=='ok'||!scoringActions.has(receipt.nativeAction?.actionType)||receipt.nativeTransitionsApplied!==1)
      return unknown('native_scoring_action_required');
    const events=receipt.nativeEvents??[];
    const matches=events.flatMap((event,index)=>event.type==='mission_victory_points_scored'?[index]:[]);
    if(awardNumber!==1||matches.length!==1)return unknown('one_native_award_required');
    sample={event:events[matches[0]],pointer:`/receipt/nativeEvents/${matches[0]}`,conditions:null,
      stateHash:receipt.branchStateHash,parentStateHash:receipt.parentStateHash,nativeReceiptHash:receiptHash};
  }else return unknown('native_scoring_source_required');
  const {event,...identity}=sample,value=event.breakdowns?.[seatKey]?.objectiveVp;
  if(!Number.isFinite(value)||value<0||!Number.isSafeInteger(event.round)||event.round<1
    ||![identity.stateHash,identity.parentStateHash,identity.nativeReceiptHash].every(digest))
    return unknown('native_award_for_selected_seat_missing');
  return {status:'observed',seatKey,awardNumber,round:event.round,value,unit:ROSTER_MISSION_SCORE_DEFINITION_V1.unit,
    ...identity,operation:body.operation,rulesRuntimeHash:receipt.rulesRuntimeHash,sourceStateHash:receipt.sourceStateHash,
    sourceWorkId:source.workId??null,sourceEvidenceId:source.evidenceId??null,sourceResultRef:source.resultRef??source.artifactRef??null};
}
