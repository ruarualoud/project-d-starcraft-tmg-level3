import {isDeepStrictEqual} from 'node:util';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
export const OFFICIAL_BEFORE_CASUALTY_BATCH_ATOM_V1='rule-atom:wave4/before-casualty-batch-detonation@1';
export const OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V1=Object.freeze({
 schema:'starcraft_tmg_before_casualty_batch_policy_v1',version:'1.0.0',
 ruleAtomId:OFFICIAL_BEFORE_CASUALTY_BATCH_ATOM_V1,
 sourceDefinitionIds:Object.freeze(['unit:infested_marine/detonation-any-phase@1','unit:infested_trooper/detonation-any-phase@1']),
 allocationBeforeDestruction:true,pendingModelsRemainOnBattlefield:true,alreadyAllocatedModelsCannotBeAllocatedAgain:true,
 trainingTruth:false});
export const OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V2=Object.freeze({...OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V1,
 version:'1.1.0',damageHosts:Object.freeze(['ranged','melee','automatic_hits']),allocationOnlyReservations:true});
export const OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V3=Object.freeze({...OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V2,
 version:'1.2.0',damageHosts:Object.freeze(['ranged','melee','automatic_hits','blast_template']),preserveOutsideActivationTiming:true,
 sealedHostCompletionDeferred:true});
export const OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V4=Object.freeze({...OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V3,
 version:'1.3.0',delegatedAttackOwners:Object.freeze(['auto_turret_overwatch']),preserveRangedWeaponSequence:true});
export const OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V5=Object.freeze({...OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V4,
 version:'1.4.0',delegatedAttackOwners:Object.freeze(['auto_turret_overwatch','khassar_shot','khassar_fight','khassar_charge']),
 preserveDelegatedCompletionAfterParticipantDeath:true});
export const OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V6=Object.freeze({...OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V5,
 version:'1.5.0',delegatedAttackOwners:Object.freeze([...OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V5.delegatedAttackOwners,'attack_target_reaction','ranged_declaration']),
 preserveDeclaredAttackCompletionAfterSourceDeath:true});
export const OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V7=Object.freeze({...OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V6,
 version:'1.6.0',externalHitsOwners:Object.freeze(['corrosive_bile','sabotage_drone']),preserveDelayedEffectAfterSourceDeath:true});
export const OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V8=Object.freeze({...OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V7,
 version:'1.7.0',externalHitsOwners:Object.freeze([...OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V7.externalHitsOwners,'psionic_storm','photon_overcharge']),
 preserveReserveEntryActivationContext:true});
export const OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V9=Object.freeze({...OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V8,
 version:'1.8.0',damageHosts:Object.freeze([...OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V8.damageHosts,'direct_removal']),
 directRemovalOwners:Object.freeze(['disengage']),preserveRemovalProofAfterReactions:true});
const without=(x,k)=>Object.fromEntries(Object.entries(x).filter(([name])=>name!==k));
const seal=(x,k)=>({...x,[k]:hash(x)});
const digest=x=>/^[a-f0-9]{64}$/u.test(x||'');
export function hasOfficialBeforeCasualtyBatchPolicyV1(state){
 const policy=state?.officialBeforeCasualtyBatchPolicy;if(policy===undefined)return false;
 if(!isDeepStrictEqual(policy,OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V1)&&!isDeepStrictEqual(policy,OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V2)
  &&!isDeepStrictEqual(policy,OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V3)&&!isDeepStrictEqual(policy,OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V4)&&!isDeepStrictEqual(policy,OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V5)&&!isDeepStrictEqual(policy,OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V6)&&!isDeepStrictEqual(policy,OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V7)&&!isDeepStrictEqual(policy,OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V8)&&!isDeepStrictEqual(policy,OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V9))
  throw Error('BEFORE_CASUALTY_BATCH_POLICY_INVALID');return true;
}
export function hasOfficialExtendedBeforeCasualtyPolicyV1(state){return hasOfficialBeforeCasualtyBatchPolicyV1(state)
 &&['1.1.0','1.2.0','1.3.0','1.4.0','1.5.0','1.6.0','1.7.0','1.8.0'].includes(state.officialBeforeCasualtyBatchPolicy.version);}
export function hasOfficialTemplateBeforeCasualtyPolicyV1(state){return hasOfficialBeforeCasualtyBatchPolicyV1(state)
 &&['1.2.0','1.3.0','1.4.0','1.5.0','1.6.0','1.7.0','1.8.0'].includes(state.officialBeforeCasualtyBatchPolicy.version);}
export function hasOfficialOverwatchBeforeCasualtyPolicyV1(state){return hasOfficialBeforeCasualtyBatchPolicyV1(state)
 &&['1.3.0','1.4.0','1.5.0','1.6.0','1.7.0','1.8.0'].includes(state.officialBeforeCasualtyBatchPolicy.version);}
export function hasOfficialKhassarBeforeCasualtyPolicyV1(state){return hasOfficialBeforeCasualtyBatchPolicyV1(state)
 &&['1.4.0','1.5.0','1.6.0','1.7.0','1.8.0'].includes(state.officialBeforeCasualtyBatchPolicy.version);}
export function hasOfficialDeclaredAttackBeforeCasualtyPolicyV1(state){return hasOfficialBeforeCasualtyBatchPolicyV1(state)
 &&['1.5.0','1.6.0','1.7.0','1.8.0'].includes(state.officialBeforeCasualtyBatchPolicy.version);}
export function hasOfficialDelayedHitsBeforeCasualtyPolicyV1(state){return hasOfficialBeforeCasualtyBatchPolicyV1(state)
 &&['1.6.0','1.7.0','1.8.0'].includes(state.officialBeforeCasualtyBatchPolicy.version);}
export function hasOfficialStormPhotonBeforeCasualtyPolicyV1(state){return hasOfficialBeforeCasualtyBatchPolicyV1(state)
 &&['1.7.0','1.8.0'].includes(state.officialBeforeCasualtyBatchPolicy.version);}
export function hasOfficialDirectRemovalBeforeCasualtyPolicyV1(state){return hasOfficialBeforeCasualtyBatchPolicyV1(state)
 &&state.officialBeforeCasualtyBatchPolicy.version==='1.8.0';}
function reservations(state,piece){
 const rows=piece.officialBeforeCasualtyReservations||[];
 if(!rows.length)return[];
 if(!hasOfficialBeforeCasualtyBatchPolicyV1(state))throw Error('BEFORE_CASUALTY_RESERVATION_POLICY_REQUIRED');
 const ids=new Set();
 for(const row of rows){
  if(row.schema!=='starcraft_tmg_before_casualty_reservation_v1'||row.reservationHash!==hash(without(row,'reservationHash'))||row.targetPieceId!==piece.id
   ||row.round!==Number(state.round)||row.phase!==state.phase||!digest(row.sourceActionHash)
   ||!digest(row.attackResolutionHash)||!digest(row.casualtyResolutionHash)||!Array.isArray(row.modelIds)
   ||!row.modelIds.length&&!(row.allocationOnly===true&&hasOfficialExtendedBeforeCasualtyPolicyV1(state))
   ||row.policyHash!==hash(state.officialBeforeCasualtyBatchPolicy))throw Error('BEFORE_CASUALTY_RESERVATION_INVALID');
  for(const id of row.modelIds){const model=piece.models.find(m=>m.id===id);
   if(ids.has(id)||!model||model.isDestroyed||model.isOnField===false)throw Error('BEFORE_CASUALTY_RESERVED_MODEL_INVALID');ids.add(id);}
 }
 return rows;
}
export function projectOfficialAllocatedCasualtyModelIdsV1(state,piece){
 return reservations(state,piece).flatMap(r=>r.modelIds).sort();
}
// Allocation is already settled. Keep its doomed models physically present for
// the exact before-destruction trigger while reserving them from nested damage.
// This does not pay or execute Detonation and cannot complete a Native action.
export function reserveOfficialBeforeCasualtyBatchV1({state,piece,casualty,sourceActionHash,attackResolutionHash}){
 if(!hasOfficialBeforeCasualtyBatchPolicyV1(state)||!digest(sourceActionHash)||!digest(attackResolutionHash)
  ||!digest(casualty?.resolutionHash)||!Number.isSafeInteger(casualty.postDamageMarker)||casualty.postDamageMarker<0
  ||!Array.isArray(casualty.casualtyModelIds)||!casualty.casualtyModelIds.length&&!hasOfficialExtendedBeforeCasualtyPolicyV1(state)
  ||new Set(casualty.casualtyModelIds).size!==casualty.casualtyModelIds.length)
  throw Error('BEFORE_CASUALTY_BATCH_INPUT_INVALID');
 const previous=reservations(state,piece),reserved=new Set(previous.flatMap(r=>r.modelIds));
 if(casualty.casualtyModelIds.some(id=>reserved.has(id)||!piece.models.some(m=>m.id===id&&!m.isDestroyed&&m.isOnField!==false)))
  throw Error('BEFORE_CASUALTY_BATCH_MODEL_UNAVAILABLE');
 const row=seal({schema:'starcraft_tmg_before_casualty_reservation_v1',round:Number(state.round),phase:state.phase,
  targetPieceId:piece.id,sourceActionHash,attackResolutionHash,casualtyResolutionHash:casualty.resolutionHash,
  modelIds:[...casualty.casualtyModelIds],priorDamageMarker:Number(piece.damageMarker||0),allocatedRemainder:casualty.postDamageMarker,
  ...(!casualty.casualtyModelIds.length?{allocationOnly:true}:{}),
  policyHash:hash(state.officialBeforeCasualtyBatchPolicy),trainingTruth:false},'reservationHash');
 piece.officialBeforeCasualtyReservations=[...previous,row];piece.damageMarker=casualty.postDamageMarker;
 return row;
}
// The host applies this rebased settlement through the existing damage owner.
// Nested effects may have damaged other models, changed the marker, or opened a
// second reservation; the original batch never overwrites those later facts.
export function consumeOfficialBeforeCasualtyReservationV1({state,piece,reservationHash}){
 const rows=reservations(state,piece),row=rows.find(r=>r.reservationHash===reservationHash);
 if(!row)throw Error('BEFORE_CASUALTY_RESERVATION_NOT_PENDING');
 const removed=new Set(row.modelIds),remaining=piece.models.filter(m=>!m.isDestroyed&&m.isOnField!==false&&!removed.has(m.id)).map(m=>m.id);
 const body={schema:'starcraft_tmg_before_casualty_rebased_settlement_v1',reservationHash,
  targetPieceId:piece.id,casualtyModelIds:[...row.modelIds],remainingModelIds:remaining,
  targetDestroyed:remaining.length===0,postDamageMarker:remaining.length?Number(piece.damageMarker||0):0,
  originalCasualtyResolutionHash:row.casualtyResolutionHash,originalAttackResolutionHash:row.attackResolutionHash,
  originalCasualtyChoicePreserved:true,nestedDamagePreserved:true,trainingTruth:false};
 const rest=rows.filter(r=>r.reservationHash!==reservationHash);
 if(rest.length)piece.officialBeforeCasualtyReservations=rest;else delete piece.officialBeforeCasualtyReservations;
 return seal(body,'resolutionHash');
}
