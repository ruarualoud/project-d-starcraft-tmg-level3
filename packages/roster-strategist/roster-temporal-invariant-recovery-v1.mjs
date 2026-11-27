// Explicit recovery of a completed, source-fixed read-only temporal query.
// Keep its author request and original artifacts; never retry arbitrary unknowns.
import {JOINT_TEMPORAL_VERSION} from './pregame-joint-temporal-v1.mjs';
import {SINGLE_UNIT_TEMPORAL_VERSION} from './pregame-single-unit-temporal-v1.mjs';
import {isDeepStrictEqual} from 'node:util';
const fixes={bounded_joint_temporal:{previous:'1.0.3',current:JOINT_TEMPORAL_VERSION,reason:'PREGAME_JOINT_TEMPORAL_TERRAIN_CHANGED'},bounded_unit_temporal:{previous:'1.6.5',current:SINGLE_UNIT_TEMPORAL_VERSION,reason:'PREGAME_TEMPORAL_TERRAIN_CHANGED'}};
export async function projectCompletedTemporalInvariantRecoveryV1({state,workId,expectedResultRef,reason,readArtifact}){
 const reject=()=>{throw Error('ROSTER_TEMPORAL_INVARIANT_RECOVERY_INVALID');};
 const original=state.work.find(w=>w.id===workId),operation=original?.inputs?.request?.value?.operation,fix=fixes[operation];
 if(!reason?.trim()||!fix||original.role!=='roster_workflow_tool'||original.resultRef!==expectedResultRef||!isDeepStrictEqual(original.bindings,state.scope))reject();
 const id=workId+':native-scope:'+fix.current,existing=state.work.find(w=>w.id===id);
 if(existing){if(existing.nativeTemporalRecovery?.sourceResultRef!==expectedResultRef)reject();return {alreadyScheduled:true,replacementWorkId:id};}
 if(original.status!=='needs_model_choice'||state.work.some(w=>w.status==='running'||w.operationState?.pending))reject();
 const result=await readArtifact(expectedResultRef),r=result.value?.receipt;
 if(result.kind!=='tool_receipt'||result.value?.operation!==operation||r?.version!==fix.previous||r.outcome!=='bounded_search_no_witness'
   ||r.sourceStateHash!==original.bindings.source||r.witnesses?.length||!r.failures?.length||r.failures.some(f=>f.reason!==fix.reason))reject();
 const repairs=state.work.filter(w=>w.repairOf===workId);
 if(repairs.length!==1)reject();const repair=repairs[0];
 if(!['ready','waiting_dependency'].includes(repair.status)||repair.attempt||repair.inputRef||repair.dispatchKey||repair.resultRef||repair.operationState)reject();
 // Neither an issued reader nor an already-used interpretation may be replaced.
 const evidenceIds=state.evidence.filter(e=>e.workId===workId||e.id===('tool:'+workId)||e.id.startsWith('tool-attempt:'+workId+':')).map(e=>e.id);
 if(state.reads?.some(read=>evidenceIds.includes(read.evidenceId)))reject();
 const recovery={version:1,changeId:'native_temporal_grass_effect_scope_v1',sourceWorkId:workId,sourceResultRef:expectedResultRef,
  previousVersion:fix.previous,currentVersion:fix.current,sourceReason:fix.reason,reason,retiredRepairId:repair.id,originalArtifactsPreserved:true,countersReset:false,planApproved:false};
 const job={id,role:original.role,bindings:structuredClone(original.bindings),inputs:structuredClone(original.inputs),
  experimentOwnerId:original.experimentOwnerId,repairFor:workId,repairCompletionExplicit:true,
  repairGeneration:original.repairGeneration??0,nativeTemporalRecovery:recovery};
 return {alreadyScheduled:false,replacementWorkId:id,job,recovery,retiredRepairId:repair.id};
}
