import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {OFFICIAL_CORRODE_ARMOUR_ID} from '../source-data/official-corrode-armour-source-v1.mjs';
import {createOfficialReactionWindowOpportunityBatchV1,openOfficialReactionFamilyWindowV1,
 consumeOfficialReactionFamilyResolutionV1} from './official-reaction-family-adapter-v1.mjs';
const key='pendingOfficialCorrodeRestoration';
const without=(x,k)=>Object.fromEntries(Object.entries(x).filter(([name])=>name!==k));
const clone=x=>structuredClone(x);
const seal=x=>({...x,parentHash:hash(x)});
export function createOfficialCorrodeRestorationRuntimeV1({reactionBundle}){
 const route=reactionBundle.routes.find(r=>r.definitionId===OFFICIAL_CORRODE_ARMOUR_ID);
 if(!route||!reactionBundle.routes.some(r=>r.triggerKind==='debuff_received'&&r.effectKind==='remove_debuffs'))throw Error('CORRODE_RESTORATION_SOURCE_REQUIRED');
 function pending(state){const p=state[key];if(!p)return null;
  if(p.parentHash!==hash(without(p,'parentHash'))||p.round!==Number(state.round)||p.phase!==state.phase||p.sourceBundleHash!==reactionBundle.bundleHash
   ||state.pendingOfficialReactionWindow&&state.pendingOfficialReactionWindow.triggerHash!==p.triggerHash)throw Error('CORRODE_RESTORATION_PARENT_INVALID');return p;
 }
 function afterReaction(before,result,action){
  const parent=pending(before);
  if(parent){
   if(result.state.pendingOfficialReactionWindow)return result;
   const consumed=consumeOfficialReactionFamilyResolutionV1(result.state,parent.triggerHash),state=clone(consumed.state);
   delete state[key];
   if(parent.suspendedWindow){state.pendingOfficialReactionWindow=clone(parent.suspendedWindow);
    state.activeSideKey=parent.suspendedWindow.prioritySideKeys[parent.suspendedWindow.priorityIndex];
   }else{
    const original=state.pendingOfficialRangedLungeReaction;
    if(!original||original.triggerHash!==parent.originalTriggerHash)throw Error('CORRODE_RESTORATION_ORIGINAL_HOST_REQUIRED');
    Object.assign(state,clone(consumeOfficialReactionFamilyResolutionV1(state,original.triggerHash).state));
    state.activeSideKey=original.resumeSideKey;delete state.pendingOfficialRangedLungeReaction;
   }
   const event={type:'corrode_restoration_completed',triggerHash:parent.triggerHash,originalTriggerHash:parent.originalTriggerHash,
    resumedOriginalReaction:true,trainingTruth:false};state.log.at(-1).events.push(event);
   return{...result,state,events:[...result.events,event]};
  }
  if(action.definitionId!==OFFICIAL_CORRODE_ARMOUR_ID||before.pendingOfficialReactionWindow?.triggerKind!=='after_ranged_attack_resolved')return result;
  const original=before.pendingOfficialReactionWindow,targetId=original.context.targetPieceId;
  const prior=new Set((before.pieces.find(p=>p.id===targetId).statuses||[]).map(s=>s.statusEffectHash));
  const applied=result.state.pieces.find(p=>p.id===targetId).statuses.find(s=>s.sourceDefinitionId===OFFICIAL_CORRODE_ARMOUR_ID&&!prior.has(s.statusEffectHash));
  if(!applied)return result;
  const state=clone(result.state),suspendedWindow=clone(state.pendingOfficialReactionWindow||null);delete state.pendingOfficialReactionWindow;
  const input={triggerKind:'debuff_received',activeSideKey:original.activeSideKey,phase:state.phase,activationId:original.activationId,
   sourceActionHash:hash(action),context:{actorPieceId:applied.sourcePieceId,targetPieceId:targetId,affectedPieceId:targetId,
    statusEffectHash:applied.statusEffectHash,sourceDefinitionId:OFFICIAL_CORRODE_ARMOUR_ID}};
  const opportunity=createOfficialReactionWindowOpportunityBatchV1({state,bundle:reactionBundle}).projectWindow(input);
  if(![opportunity.activeLegal,opportunity.defenderLegal].some(menu=>menu.parameterDomains.some(d=>d.effectKind==='remove_debuffs')))return result;
  const opened=openOfficialReactionFamilyWindowV1(reactionBundle,state,input),next=clone(opened.state);
  next[key]=seal({round:Number(state.round),phase:state.phase,sourceBundleHash:reactionBundle.bundleHash,
   triggerHash:next.pendingOfficialReactionWindow.triggerHash,originalTriggerHash:original.triggerHash,suspendedWindow,trainingTruth:false});
  next.activeSideKey=next.pendingOfficialReactionWindow.prioritySideKeys[0];
  return{...result,state:next,events:[...result.events,...opened.events]};
 }
 return{pending,afterReaction,descriptor:{runtimeId:'official-corrode-restoration-runtime-v1',runtimeVersion:'1.0.0',
  sourceBundleHash:reactionBundle.bundleHash,ownsNestedDebuffReaction:true,preservesOriginalAfterRangedWindow:true,newGameAtoms:0,trainingTruth:false}};
}
