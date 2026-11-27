import {isDeepStrictEqual} from 'node:util';

// Shared classification for observations, not scene construction or Provider
// requests. Temporal queries explore a disposable laboratory, never the parent.
const observations=new Set(['spatial','probability','threat_exchange','bounded_arrival_control','bounded_unit_temporal','bounded_joint_temporal']);
export const isRosterReadOnlyObservationV1=operation=>observations.has(operation);

// A completed failed observation is NOT an interrupted pending call or a bad
// model response. Notify its current strategic owner once after this verified
// source fix; only a new author decision may authorize another measurement.
export async function projectRosterReadOnlyToolFixV1({state,readArtifact}){
  if(state.work.some(w=>w.status==='running'||w.operationState?.pending))return null;
  const current=w=>w&&w.status!=='superseded'&&Object.entries(w.bindings??{})
    .every(([key,value])=>state.scope[key]===value);
  const owner=[...state.work].reverse().find(w=>w.role==='roster_workflow_strategy_decision'
    &&w.status==='evidence_ready'&&w.draftRevision===state.draftRevision&&w.resultRef&&w.draftOutcomeRef&&current(w));
  if(!owner)return null;
  const outcome=await readArtifact(owner.draftOutcomeRef);
  if(outcome.status!=='retain'||outcome.inquiryDispatch?.kind!=='unresolved_return')return null;
  const decision=(await readArtifact(owner.resultRef)).value;
  const cited=new Set((decision?.decisions??[]).flatMap(d=>(d.evidenceRefs??[]).map(e=>e.artifactRef)));
  const ownerSource=state.evidence.find(e=>e.id==='role:'+owner.id&&e.availability==='available'&&current(e));
  if(!ownerSource)return null;
  for(const work of [...state.work].reverse()){
    if(work.role!=='roster_workflow_tool'||work.status!=='returned_to_owner'||!work.resultRef||!current(work))continue;
    const saved=(await readArtifact(work.resultRef)).value,r=saved?.receipt;
    if(saved?.operation!=='bounded_unit_temporal'||r?.resultStatus!=='unknown'
      ||r.laboratoryVersion!=='1.4.13'||!['1.6.0','1.6.1'].includes(r.version))continue;
    if(!r.failures?.length||!r.failures.every(f=>f.reason==='PREGAME_LAB_NATIVE_ACTION_REJECTED'
      &&f.selected?.actionType==='resolve_current_product_next_round_initiative'
      &&Array.isArray(f.selected.action?.outcome?.chanceReveals)
      &&f.selected.action.outcome.chanceReveals.length===4
      &&f.selected.action.outcome.chanceReveals.every(n=>Number.isSafeInteger(n)&&n>=1&&n<=6)))continue;
    const source=state.evidence.find(e=>e.artifactRef&&cited.has(e.artifactRef)&&e.availability==='available'
      &&e.id.startsWith('tool-attempt:'+work.id+':')&&current(e));
    if(!source||!isDeepStrictEqual(await readArtifact(source.artifactRef),saved))continue;
    const change='native-integer-chance-transport-v1';
    const id=`tool-fix:${change}:${work.resultRef}`;
    if(state.work.some(w=>w.id===id))return null;
    return {id,engineeringChangeId:change,sourceWorkId:work.id,sourceResultRef:work.resultRef,
      ownerWorkId:owner.id,ownerResultRef:owner.resultRef,ownerEvidenceId:ownerSource.id,sourceEvidenceId:source.id,
      originalRequest:structuredClone(work.inputs.request.value),
      previousLaboratoryVersion:r.laboratoryVersion,correctedLaboratoryVersion:'1.4.14',
      factAnswered:false,nativeReplay:false,historyReset:false,planApprovalGranted:false,
      reason:'The old laboratory advertised integer dice but forwarded those integers to Native where reveal.outcome was required. Its valid four-integer initiative input was therefore rejected before probability branches. The shared adapter now compiles the SAME supplied values using the selected Native faces; normal temporal queries enumerate both initiative outcomes without model dice. The old failure remains unknown, not evidence of unreachable geometry or a bad strategic premise. A real new query is still needed to answer the original predicate.',
      instruction:'Reconsider the retained necessary question using the current tool contract and this source correction. Keep original participants, map and horizon unless YOU explicitly change the experiment. You may authorize one meaningful corrected read through the normal method planner or revise/retain with a justified alternative. Do not keep changing dice, broaden budgets to repair input, replay completed scene mutations, simulate a whole match, or treat this engineering notification as a successful Native result.'};
  }
  return null;
}

export function assertRosterInterruptedQueryReplayV1({pending,recovery,savedRequest,actualRequest,sourceStateHash}){
  if(!pending||recovery?.version!==1||recovery.requestRef!==pending.requestRef
    ||recovery.sourceStateHash!==pending.sourceStateHash||pending.sourceStateHash!==sourceStateHash
    ||!isRosterReadOnlyObservationV1(savedRequest?.operation)
    ||!isDeepStrictEqual(savedRequest,actualRequest)){
    throw Object.assign(Error('ROSTER_WORKFLOW_INTERRUPTED_QUERY_INPUT_CHANGED'),{
      code:'ROSTER_WORKFLOW_INTERRUPTED_QUERY_INPUT_CHANGED'});
  }
  return {version:1,originalPending:structuredClone(pending),reason:recovery.reason,
    sameFrozenRequest:true,completedResultReplayed:false,providerReplayed:false,
    liveRoomMutation:false,countersReset:false,historyReset:false};
}
