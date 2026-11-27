import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {resolveOfficialNonLethalDamageV1} from '../rule-atoms/official-non-lethal-damage-rules-kernel-v1.mjs';
import {resolveOfficialTotalDamagePoolReductionV1} from '../rule-atoms/official-total-damage-reaction-kernel-v1.mjs';
import {hasOfficialNonLethalDamagePolicyV1,hasOfficialNonLethalStandardDamagePolicyV1} from '../rule-atoms/official-non-lethal-damage-policy-v1.mjs';
import {resolveOfficialEffectiveCombatProfileV1,resolveOfficialPassiveCharacteristicRoutesForPieceV1} from './official-characteristic-status-family-adapter-v1.mjs';
import {openOfficialSelectedRosterDamageReceivedWindowV1,applyOfficialSelectedRosterResolvedDamageV1} from './official-selected-roster-ranged-action-runtime-v1.mjs';
import {consumeOfficialReactionFamilyResolutionV1,projectOfficialReactionFamilyResolutionV1} from './official-reaction-family-adapter-v1.mjs';
const key='pendingOfficialPlaguedMunitions';
const without=(x,k)=>Object.fromEntries(Object.entries(x).filter(([name])=>name!==k));
const seal=(x,k)=>({...x,[k]:hash(x)});
const live=p=>p?.isOnField===true&&!p.isDestroyed&&p.currentModels>0;
export function createOfficialPlaguedMunitionsRuntimeV1({sourceBundle,state:initial}){
 const routes=sourceBundle.routes.filter(r=>r.effectKind==='plagued_munitions');
 if(!routes.length||!hasOfficialNonLethalDamagePolicyV1(initial)||!hasOfficialNonLethalStandardDamagePolicyV1(initial))throw Error('PLAGUED_MUNITIONS_NON_LETHAL_CONSUMERS_REQUIRED');
 function pending(state){const p=state[key];if(!p)return null;
  if(p.parentHash!==hash(without(p,'parentHash'))||p.round!==Number(state.round)||p.phase!==state.phase
   ||!routes.some(r=>r.routeHash===p.sourceRouteHash&&r.definitionId===p.sourceDefinitionId))throw Error('PLAGUED_MUNITIONS_PARENT_INVALID');
  return p;}
 function settle(result,parent,projection=null){
  const state=structuredClone(result.state),target=state.pieces.find(p=>p.id===parent.targetPieceId),events=[];
  if(live(target)){
   const prior=Number(target.damageMarker||0),pool=resolveOfficialTotalDamagePoolReductionV1({priorDamageMarker:prior,incomingDamage:1,
    requestedReduction:projection?.damageReduction||0,minimumDamage:projection?.minimumDamage||0,reductionSourceHash:projection?.resolutionHash||null});
   const profile=resolveOfficialEffectiveCombatProfileV1(state,target),models=target.models.filter(m=>!m.isDestroyed&&m.isOnField!==false);
   const resolution=resolveOfficialNonLethalDamageV1({targetPieceId:target.id,targetModelId:models[0].id,
    abilityResolutionHash:parent.sourceAttackResolutionHash,priorDamageMarker:prior,amount:1,targetHitPoints:profile.hitPoints});
   const shieldedBefore=(target.statuses||[]).some(s=>String(typeof s==='string'?s:s.statusName||s.name).toLowerCase()==='shielded');
   applyOfficialSelectedRosterResolvedDamageV1(state,target,profile,{casualtyModelIds:[],remainingModelIds:models.map(m=>m.id),targetDestroyed:false,
    postDamageMarker:pool.totalDamageAfterReduction,shieldedBefore,shieldedAfter:shieldedBefore&&pool.totalDamageAfterReduction<=Number(profile.shield||0)});
   events.push({type:'plagued_munitions_non_lethal_damage',sourceDefinitionId:parent.sourceDefinitionId,sourceFeatureHash:parent.sourceFeatureHash,
    sourcePieceId:parent.sourcePieceId,targetPieceId:target.id,sourceAttackResolutionHash:parent.sourceAttackResolutionHash,
    priorDamageMarker:prior,incomingNonLethalDamage:1,damagePool:pool,nonLethalResolution:resolution,passiveNotReaction:true,trainingTruth:false});
  }
  delete state[key];
  if(parent.suspendedReactionWindow)state.pendingOfficialReactionWindow=structuredClone(parent.suspendedReactionWindow);
  state.activeSideKey=parent.resumeSideKey;
  state.officialPlaguedMunitionsHistory=[...(state.officialPlaguedMunitionsHistory||[]),...events];
  if(events.length){if(!state.log?.length)throw Error('PLAGUED_MUNITIONS_LOG_REQUIRED');state.log.at(-1).events.push(...structuredClone(events));}
  return{...result,state,events:[...(result.events||[]),...events]};
 }
 function afterTransition(before,result,action){
  if(pending(before))throw Error('PLAGUED_MUNITIONS_REACTION_CONTINUATION_REQUIRED');
  const attacks=(result.events||[]).filter(e=>e.type==='ranged_attack'&&e.weaponName==='Infested C-14 Rifle'
   &&Number(e.stages?.damage?.reactionDamagePool?Math.max(0,e.stages.damage.reactionDamagePool.incomingDamage-e.stages.damage.reactionDamagePool.appliedReduction):e.stages?.damage?.totalDamage)>0);
  const eligible=attacks.flatMap(attack=>{const source=result.state.pieces.find(p=>p.id===attack.pieceId),target=result.state.pieces.find(p=>p.id===attack.targetId);
   const route=source&&live(source)&&resolveOfficialPassiveCharacteristicRoutesForPieceV1(sourceBundle,result.state,source)
    .find(r=>r.effectKind==='plagued_munitions'&&r.phase===result.state.phase);
   return route&&live(target)&&source.sideKey!==target.sideKey?[{attack,route,source,target}]:[];});
  if(!eligible.length)return result;if(eligible.length!==1)throw Error('PLAGUED_MUNITIONS_SINGLE_ATTACK_COMPLETION_REQUIRED');
  const {attack,route,source,target}=eligible[0];
  if(!/^[a-f0-9]{64}$/.test(attack.attackResolutionHash||''))throw Error('PLAGUED_MUNITIONS_ATTACK_EVIDENCE_REQUIRED');
  const state=structuredClone(result.state),parent={round:Number(state.round),phase:state.phase,sourceDefinitionId:route.definitionId,
   sourceFeatureHash:route.sourceFeatureHash,sourceRouteHash:route.routeHash,sourcePieceId:source.id,targetPieceId:target.id,
   sourceAttackResolutionHash:attack.attackResolutionHash,resumeSideKey:state.activeSideKey,
   suspendedReactionWindow:structuredClone(state.pendingOfficialReactionWindow||null),trainingTruth:false};
  delete state.pendingOfficialReactionWindow;
  const damageAction={actionType:'resolve_plagued_munitions',sideKey:source.sideKey,pieceId:source.id,phase:state.phase,
   sourceDefinitionId:route.definitionId,sourceAttackResolutionHash:attack.attackResolutionHash};
  const opened=openOfficialSelectedRosterDamageReceivedWindowV1(state,damageAction,{targetPieceId:target.id,incomingDamage:1,
   enemyReactionAllowed:true});
  if(!opened)return settle({...result,state},parent);
  const next=structuredClone(opened.state);next[key]=seal({...parent,triggerHash:next.pendingOfficialReactionWindow.triggerHash},'parentHash');
  next.activeSideKey=next.pendingOfficialReactionWindow.prioritySideKeys[0];
  return{...result,state:next,events:[...(result.events||[]),...(opened.events||[])]};
 }
 function complete(result){const parent=pending(result.state);if(!parent)throw Error('PLAGUED_MUNITIONS_PARENT_REQUIRED');
  if(result.state.pendingOfficialReactionWindow)return result;
  const projection=projectOfficialReactionFamilyResolutionV1(result.state,parent.triggerHash);
  if(!projection)throw Error('PLAGUED_MUNITIONS_DAMAGE_REACTION_RESULT_REQUIRED');
  const consumed=consumeOfficialReactionFamilyResolutionV1(result.state,parent.triggerHash);
  return settle({...result,state:consumed.state},parent,projection);}
 return{pending,afterTransition,complete,descriptor:{runtimeId:'official-plagued-munitions-runtime-v1',runtimeVersion:'1.0.0',
  definitionIds:routes.map(r=>r.definitionId),sourceRouteHashes:routes.map(r=>r.routeHash),
  reusedContracts:['native_ranged_attack_completion','damage_received_reaction','total_damage_pool_reduction','non_lethal_damage'],
  newGameAtoms:0,trainingTruth:false}};
}
