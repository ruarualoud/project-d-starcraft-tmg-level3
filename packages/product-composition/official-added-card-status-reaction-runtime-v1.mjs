import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {resolveOfficialArmourRollActivationIdV1} from '../rule-atoms/official-armour-roll-ordinal-v1.mjs';
import {hasOfficialFaqReactionPolicyV13} from '../rule-atoms/official-faq-reaction-policy-v13.mjs';
import {createOfficialReactionWindowOpportunityBatchV1,openOfficialReactionFamilyWindowV1,
  consumeOfficialReactionFamilyResolutionV1} from './official-reaction-family-adapter-v1.mjs';
import {OFFICIAL_BRUTAL_INSTINCT_ID,OFFICIAL_PARASITIC_BIO_TOXINS_ID} from './official-added-card-reaction-facts-v1.mjs';

const key='pendingOfficialAddedCardStatusReaction',clone=x=>structuredClone(x),
  body=x=>Object.fromEntries(Object.entries(x).filter(([k])=>k!=='parentHash')),
  seal=x=>({...x,parentHash:hash(x)});
export function createOfficialAddedCardStatusReactionRuntimeV1({reactionBundle,state:initial}){
  const routes=reactionBundle.routes.filter(r=>r.addedCardStatusOwner);
  if(!routes.length||!hasOfficialFaqReactionPolicyV13(initial))throw Error('ADDED_CARD_STATUS_REACTION_SOURCE_REQUIRED');
  function pending(state){const p=state[key];if(!p)return null;
    if(p.parentHash!==hash(body(p))||p.sourceBundleHash!==reactionBundle.bundleHash||p.round!==Number(state.round)
      ||p.phase!==state.phase||!['primary','restoration'].includes(p.stage)
      ||state.pendingOfficialReactionWindow&&state.pendingOfficialReactionWindow.triggerHash!==p.triggerHash)
      throw Error('ADDED_CARD_STATUS_REACTION_PARENT_INVALID');return p;
  }
  function open(result,input,parent,stage,wanted){
    const projected=createOfficialReactionWindowOpportunityBatchV1({state:result.state,bundle:reactionBundle}).projectWindow(input);
    if(![projected.activeLegal,projected.defenderLegal].some(m=>m.parameterDomains.some(wanted)))return null;
    const opened=openOfficialReactionFamilyWindowV1(reactionBundle,result.state,input),state=clone(opened.state);
    state[key]=seal({...parent,stage,triggerHash:state.pendingOfficialReactionWindow.triggerHash});
    state.activeSideKey=state.pendingOfficialReactionWindow.prioritySideKeys[0];
    return{...result,state,events:[...result.events,...opened.events]};
  }
  function afterTransition(before,result,action){
    if(pending(result.state)||result.state.pendingOfficialReactionWindow||before.phase!==result.state.phase
      ||before.round!==result.state.round||result.state.phase!=='movement')return result;
    const ended=result.events.find(e=>e.type==='unit_activation_finished'&&e.phase==='movement');
    const current=result.state.selectedRosterActivationWindow,old=before.selectedRosterActivationWindow;
    // A transition into the framework's after-action checkpoint is an ordinary
    // completed action. A source-owned extra Move is also an action, even when
    // its source explicitly preserves the normal action limit/window.
    const extra=result.events.find(e=>e.type==='relocation_ability_resolved'&&e.effectKind==='extra_move');
    const completed=current?.stage==='after_action'&&(old?.stage!=='after_action'||old.pieceId!==current.pieceId);
    const route=ended&&routes.find(r=>r.definitionId===OFFICIAL_BRUTAL_INSTINCT_ID)
      ||(completed||extra)&&routes.find(r=>r.definitionId===OFFICIAL_PARASITIC_BIO_TOXINS_ID);
    if(!route)return result;
    const pieceId=ended?.pieceId||extra?.pieceId||current.pieceId,actor=result.state.pieces.find(p=>p.id===pieceId);
    if(!actor)return result;
    const witnessBody={round:Number(result.state.round),phase:result.state.phase,triggerKind:route.triggerKind,
      pieceId,sideKey:actor.sideKey,sourceActionHash:hash(action),
      boundary:ended?'committed_activation_finished':extra?'committed_extra_move':'committed_framework_after_action',trainingTruth:false},
      addedCardTrigger={...witnessBody,witnessHash:hash(witnessBody)},
      input={triggerKind:route.triggerKind,phase:result.state.phase,activeSideKey:actor.sideKey,
        activationId:ended?null:resolveOfficialArmourRollActivationIdV1(before,pieceId),sourceActionHash:hash(action),
        context:{actorPieceId:pieceId,addedCardTrigger}},
      parent={round:Number(result.state.round),phase:result.state.phase,sourceBundleHash:reactionBundle.bundleHash,
        primaryInput:input,resumeSideKey:result.state.activeSideKey,trainingTruth:false};
    return open(result,input,parent,'primary',d=>d.definitionId===route.definitionId)||result;
  }
  function complete(before,result,action){
    const prior=pending(before);if(!prior)throw Error('ADDED_CARD_STATUS_REACTION_PARENT_REQUIRED');
    let state=clone(result.state),parent=pending(state),events=[...result.events];
    if(parent.stage==='primary'&&action.definitionId===OFFICIAL_PARASITIC_BIO_TOXINS_ID){
      const targetId=action.reactionPlan.canonicalParameters.targetUnitId,
        previous=new Set((before.pieces.find(p=>p.id===targetId).statuses||[]).map(s=>s.statusEffectHash)),
        status=state.pieces.find(p=>p.id===targetId).statuses.find(s=>s.sourceDefinitionId===OFFICIAL_PARASITIC_BIO_TOXINS_ID&&!previous.has(s.statusEffectHash));
      if(status){
        const suspendedWindow=clone(state.pendingOfficialReactionWindow||null);delete state.pendingOfficialReactionWindow;
        const input={triggerKind:'debuff_received',phase:state.phase,activeSideKey:parent.primaryInput.activeSideKey,
          activationId:parent.primaryInput.activationId,sourceActionHash:status.statusEffectHash,
          context:{actorPieceId:status.sourcePieceId,targetPieceId:targetId,affectedPieceId:targetId,
            statusEffectHash:status.statusEffectHash,sourceDefinitionId:status.sourceDefinitionId}},
          nested=open({...result,state,events},input,{...body(parent),originalTriggerHash:parent.triggerHash,suspendedWindow},
            'restoration',d=>d.effectKind==='remove_debuffs');
        if(nested)return nested;
        if(suspendedWindow)state.pendingOfficialReactionWindow=suspendedWindow;
      }
    }
    if(state.pendingOfficialReactionWindow){
      state.activeSideKey=state.pendingOfficialReactionWindow.prioritySideKeys[state.pendingOfficialReactionWindow.priorityIndex];
      return{...result,state,events};
    }
    state=clone(consumeOfficialReactionFamilyResolutionV1(state,parent.triggerHash).state);
    if(parent.stage==='restoration'){
      const primaryParent={...body(parent),stage:'primary',triggerHash:parent.originalTriggerHash};
      delete primaryParent.originalTriggerHash;delete primaryParent.suspendedWindow;
      state[key]=seal(primaryParent);parent=state[key];
      if(prior.suspendedWindow){state.pendingOfficialReactionWindow=clone(prior.suspendedWindow);
        state.activeSideKey=prior.suspendedWindow.prioritySideKeys[prior.suspendedWindow.priorityIndex];
        return{...result,state,events};}
      state=clone(consumeOfficialReactionFamilyResolutionV1(state,parent.triggerHash).state);
    }
    state.activeSideKey=parent.resumeSideKey;delete state[key];
    const event={type:'added_card_status_reaction_completed',triggerHash:parent.triggerHash,
      resumedSideKey:state.activeSideKey,trainingTruth:false};events.push(event);state.log.at(-1)?.events.push(event);
    return{...result,state,events};
  }
  return{pending,afterTransition,complete,descriptor:{runtimeId:'official-added-card-status-reaction-runtime-v1',runtimeVersion:'1.0.0',
    sourceBundleHash:reactionBundle.bundleHash,definitionIds:routes.map(r=>r.definitionId).sort(),
    triggerAuthority:'committed_native_action_or_activation_boundary',nestedRestoration:true,newGameAtoms:0,trainingTruth:false}};
}
