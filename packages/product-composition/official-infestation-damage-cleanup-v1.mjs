import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
const key='pendingOfficialInfestationDamageCleanup';
const without=(x,k)=>Object.fromEntries(Object.entries(x).filter(([name])=>name!==k));
const clone=x=>structuredClone(x);
const infected=s=>String(typeof s==='string'?s:s.statusName||s.name).toLowerCase()==='infestation';
export function createOfficialInfestationDamageCleanupV1({sourceBundle,hasUnsettled}){
 const routes=sourceBundle.routes.filter(r=>r.effectKind==='infestation_damage_cleanup');
 if(!routes.length||typeof hasUnsettled!=='function')throw Error('INFESTATION_DAMAGE_CONSUMERS_REQUIRED');
 function pending(state){const p=state[key];if(!p)return null;
  if(p.parentHash!==hash(without(p,'parentHash'))||p.round!==Number(state.round)||p.phase!==state.phase
   ||!routes.some(r=>r.definitionId===p.sourceDefinitionId&&r.sourceFeatureHash===p.sourceFeatureHash&&r.routeHash===p.sourceRouteHash)
   ||!state.characteristicStatusAbilityHistory?.some(h=>h.planHash===p.sourcePlanHash&&h.definitionId===p.sourceDefinitionId&&h.pieceId===p.pieceId))
   throw Error('INFESTATION_DAMAGE_CLEANUP_PARENT_INVALID');return p;
 }
 function afterTransition(result){
  const p=pending(result.state);if(!p||hasUnsettled(result.state))return result;
  const damage=result.state.log.flatMap(l=>l.events||[]).filter(e=>e.type==='ability_direct_damage'&&e.sourcePlanHash===p.sourcePlanHash);
  if(p.targetUnitIds.some(id=>damage.filter(e=>e.targetId===id).length!==1))throw Error('INFESTATION_DAMAGE_CLEANUP_SETTLEMENT_REQUIRED');
  const suffered=damage.filter(e=>Number(e.stages.reactionDamagePool
   ?Math.max(0,e.stages.reactionDamagePool.incomingDamage-e.stages.reactionDamagePool.appliedReduction):e.stages.totalDamage)>0).map(e=>e.targetId);
  const state=clone(result.state),removed=[];
  for(const id of suffered){const piece=state.pieces.find(p=>p.id===id),statuses=(piece.statuses||[]).filter(infected);
   const hashes=statuses.map(s=>s.statusEffectHash).filter(Boolean);piece.statuses=(piece.statuses||[]).filter(s=>!infected(s));
   state.board.effectMarkers=(state.board.effectMarkers||[]).filter(m=>!hashes.includes(m.statusEffectHash));
   removed.push({targetPieceId:id,removedStatusEffectHashes:hashes,hadInfestation:statuses.length>0});
  }
  delete state[key];
  const event={type:'infestation_damage_cleanup_completed',sourceDefinitionId:p.sourceDefinitionId,sourcePlanHash:p.sourcePlanHash,
   sourcePieceId:p.pieceId,damageTargetUnitIds:p.targetUnitIds,unitsThatSufferedDamage:suffered,removed,
   originalCasterMayBeDestroyed:true,trainingTruth:false};
  state.officialInfestationDamageCleanupHistory=[...(state.officialInfestationDamageCleanupHistory||[]),clone(event)];
  state.log.at(-1).events.push(clone(event));return{...result,state,events:[...(result.events||[]),event]};
 }
 return{pending,afterTransition,descriptor:{runtimeId:'official-infestation-damage-cleanup-v1',runtimeVersion:'1.0.0',
  sourceRouteHashes:routes.map(r=>r.routeHash),sourceDefinitionIds:routes.map(r=>r.definitionId),
  damageConsumer:'shared_source_bound_direct_damage',cleanupAfterAllDamageSuccessors:true,newGameAtoms:0,trainingTruth:false}};
}
