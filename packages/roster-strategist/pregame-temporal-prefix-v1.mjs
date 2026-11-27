// Source-derived execution context for a FAILED joint schedule. It selects no
// strategy, never combines paths, and does not turn partial execution into control.
import {isDeepStrictEqual} from 'node:util';
const spatial=new Set(['deploy','move','run','resolve_relocation_ability']);
function recordedPrefix(receipt,failure,rows){
 const root=receipt.isolatedSearchSourceHash??receipt.conditions?.startStateHash??receipt.baseStateHash;
 const absent=reason=>({complete:false,reason,sourceRootHash:root??null,failedStateHash:failure.stateHash??null});
 if(typeof root!=='string'||typeof failure.stateHash!=='string')return absent('missing_recorded_state_identity');
 const path=[],seen=new Set();let cursor=failure.stateHash;
 while(cursor!==root){
  if(seen.has(cursor))return absent('cyclic_native_predecessor');seen.add(cursor);
  const matches=rows.get(cursor);if(!matches?.length)return absent('missing_native_predecessor');
  const selected=matches[0],first=selected.transition;
  if(matches.some(({transition:t})=>t.parentStateHash!==first.parentStateHash
   ||t.round!==first.round||t.phase!==first.phase||!isDeepStrictEqual(t.nativeAction,first.nativeAction)))
   return absent('ambiguous_native_predecessor');
  path.unshift(selected);cursor=first.parentStateHash;
  if(path.length>(receipt.nativeTransitions?.length??0))return absent('cyclic_native_predecessor');
 }
 const executed=[];
 for(const {transition:t,index}of path){
  const a=t.nativeAction;if(!spatial.has(a?.actionType))continue;
  const scheduleIndex=executed.length,expected=receipt.actionSchedule[scheduleIndex];
  const actorSide=receipt.evaluation?.kind==='native_assault_setup_checkpoint'
   ?receipt.participants?.find(p=>p.unitId===expected?.unitId)?.sideKey:receipt.seatKey;
  if(!expected||expected.unitId!==a.pieceId||expected.actionType!==a.actionType
   ||expected.round!==t.round||expected.phase!==t.phase||a.sideKey!==actorSide)
   return absent('recorded_schedule_prefix_mismatch');
  executed.push({scheduleIndex,unitId:a.pieceId,actionType:a.actionType,round:t.round,phase:t.phase,
   transitionIndex:index,parentStateHash:t.parentStateHash,stateHash:t.stateHash,
   nativeActionPointer:'/receipt/nativeTransitions/'+index+'/nativeAction',
   transitionPointer:'/receipt/nativeTransitions/'+index,schedulePointer:'/receipt/actionSchedule/'+scheduleIndex});
 }
 if(executed.length!==failure.scheduleIndex)return absent('recorded_schedule_prefix_length_mismatch');
 return {complete:true,sourceRootHash:root,failedStateHash:failure.stateHash,recordedNativeStepCount:path.length,
  nativeTransitionPointers:path.map(s=>'/receipt/nativeTransitions/'+s.index),executedScheduledSteps:executed,
  representativeOnly:true,initialSnapshotIsNotFailureState:true,controlProven:false,realMatchHistory:false};
}
export function projectRecordedJointFailurePrefixesV1(receipt){
 if(receipt?.schema!=='pregame_joint_temporal_receipt_v1'||!Array.isArray(receipt.actionSchedule))return [];
 const rows=new Map();(receipt.nativeTransitions??[]).forEach((transition,index)=>{
  if(typeof transition.stateHash!=='string')return;
  if(!rows.has(transition.stateHash))rows.set(transition.stateHash,[]);rows.get(transition.stateHash).push({transition,index});
 });
 const groups=new Map();(receipt.failures??[]).forEach((failure,index)=>{
  if(!Number.isSafeInteger(failure.scheduleIndex)||failure.scheduleIndex<0||failure.scheduleIndex>=receipt.actionSchedule.length)return;
  const key=JSON.stringify([failure.reason,failure.scheduleIndex,failure.round,failure.phase]);
  if(!groups.has(key))groups.set(key,{reason:failure.reason,scheduleIndex:failure.scheduleIndex,failureCount:0,
   failurePointers:[],representativeFailurePointer:'/receipt/failures/'+index,
   failedStateHash:failure.stateHash??null,round:failure.round??null,phase:failure.phase??null,
   scheduledStep:structuredClone(receipt.actionSchedule[failure.scheduleIndex]),
   scheduledStepPointer:'/receipt/actionSchedule/'+failure.scheduleIndex,
   recordedPrefix:recordedPrefix(receipt,failure,rows),
   interpretation:'A recorded prefix of this representative failed branch only. Original source/menu describes the starting snapshot, not this failure state. Completed actions are not proof of reaching the target or future control. Exact raw arrays remain independently readable; no whole-array read permission or strategic choice is granted.'});
  const group=groups.get(key);group.failureCount++;group.failurePointers.push('/receipt/failures/'+index);
 });
 return [...groups.values()];
}
