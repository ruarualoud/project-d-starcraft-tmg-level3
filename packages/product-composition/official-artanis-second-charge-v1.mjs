import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { resolveOfficialArmourRollActivationIdV1 } from '../rule-atoms/official-armour-roll-ordinal-v1.mjs';
import { ARTANIS_DASH_DEFINITION_ID, consumeOfficialReactionFamilyResolutionV1 } from './official-reaction-family-adapter-v1.mjs';

const key='officialLightningDashContinuation';
const seal=body=>({...body,checkpointHash:hash(body)});
function read(state) {
  const stored=state[key];
  if (!stored) return null;
  const {checkpointHash,...body}=stored;
  if (hash(body)!==checkpointHash || !Array.isArray(body.previousTargets) || body.round!==Number(state.round)
    || body.phase!=='assault' || state.phase!==body.phase
    || !state.officialReactionFamilySourceBundle?.routes.some(r=>r.definitionId===ARTANIS_DASH_DEFINITION_ID
      && r.sourceFeatureHash===body.sourceFeatureHash)) throw Error('LIGHTNING_DASH_CHECKPOINT_INVALID');
  return body;
}
export function officialSecondChargeGrantV1(state,piece) {
  const parent=read(state);
  return parent?.pieceId===piece.id && ['finding_targets','chosen'].includes(parent.stage) ? parent : null;
}
export function isOfficialSecondChargeResolutionV1(state,pieceId) {
  const parent=read(state);
  return parent?.pieceId===pieceId && parent.stage==='chosen' && state.pendingAction?.stage==='resolve_charge_after_roll';
}
export function createOfficialArtanisDashContinuationV1({route,melee,reactionAdapter}) {
  if(route?.definitionId!==ARTANIS_DASH_DEFINITION_ID || !melee || !reactionAdapter) throw Error('LIGHTNING_DASH_SOURCE_AND_CHARGE_REQUIRED');
  function declaration(state,side) {
    return melee.enumerate(state,{sideKey:side}).parameterDomains.find(d=>d.actionType==='charge' && d.pieceId===state[key].pieceId);
  }
  function afterTransition(before,result) {
    if(!result?.state || (!before[key] && !result.events?.some(e=>e.type==='charge_succeeded'))) return result;
    const prior=read(before);
    if(prior?.stage==='chosen') {
      if(!result.events?.some(e=>['charge_succeeded','charge_failed'].includes(e.type) && e.pieceId===prior.pieceId))return result;
      const state=structuredClone(result.state);
      delete state[key];
      return {...result,state};
    }
    if(prior && prior.stage!=='awaiting_first_settlement')return result;
    const state=structuredClone(result.state);
    let parent=prior;
    if(!parent) {
      const event=result.events.find(e=>e.type==='charge_succeeded'
        && state.pieces.some(p=>p.id===e.pieceId && p.officialUnitRecordKey===route.recordKey));
      if(!event)return result;
      parent={round:Number(state.round),phase:'assault',sideKey:event.sideKey,pieceId:event.pieceId,
        sourceFeatureHash:route.sourceFeatureHash,firstChargeHash:event.chargeResolutionPlanHash,
        previousTargets:[...event.declaredTargetUnitIds],stage:'awaiting_first_settlement'};
    }
    if(state.pendingAction || state.pendingOfficialReactionWindow || state.pendingOfficialMeleeDamageReaction) {
      state[key]=seal(parent);return {...result,state};
    }
    const actor=state.pieces.find(p=>p.id===parent.pieceId);
    const resumeSide=state.activeSideKey;
    if(!actor?.isOnField || actor.isDestroyed || state.phase!==parent.phase || Number(state.round)!==parent.round) {
      delete state[key];return {...result,state};
    }
    state.activeSideKey=parent.sideKey;
    state[key]=seal({...parent,stage:'finding_targets'});
    const domain=declaration(state,parent.sideKey);
    const targets=Object.keys(domain?.constraints.eligibleTargetModelIdsByUnitId??{});
    delete state[key];
    if(targets.length){
      const input={triggerKind:'after_successful_charge',phase:parent.phase,activeSideKey:parent.sideKey,
        activationId:resolveOfficialArmourRollActivationIdV1(state,actor.id),sourceActionHash:parent.firstChargeHash,
        context:{chargingPieceId:actor.id,targetPieceId:actor.id,alternateEnemyUnitIds:targets}};
      const opened=reactionAdapter.openReactionWindow(state,input);
      if(reactionAdapter.legalSpace(opened.state,{sideKey:parent.sideKey}).parameterDomains.some(d=>d.definitionId===route.definitionId)) {
        const fresh=structuredClone(opened.state);
        fresh[key]=seal({...parent,stage:'reaction',triggerHash:fresh.pendingOfficialReactionWindow.triggerHash,resumeSide});
        return {...result,state:fresh,events:[...result.events,...opened.events]};
      }
    }
    state.activeSideKey=resumeSide;
    return {...result,state};
  }
  function finishReaction(before,result){
    const parent=read(before);
    if(parent?.stage!=='reaction' || result.state.pendingOfficialReactionWindow)return result;
    const consumed=consumeOfficialReactionFamilyResolutionV1(result.state,parent.triggerHash);
    const effect=consumed.projection.effects.find(e=>e.definitionId===route.definitionId && e.sourceFeatureHash===route.sourceFeatureHash);
    const state=structuredClone(consumed.state);
    if(effect) {
      if(effect.followup?.actorPieceId!==parent.pieceId || !effect.followup.targetPieceId
        || parent.previousTargets.includes(effect.followup.targetPieceId)) throw Error('LIGHTNING_DASH_FOLLOWUP_TARGET_INVALID');
      state[key]=seal({...parent,stage:'chosen',targetId:effect.followup.targetPieceId});
      state.activeSideKey=parent.sideKey;
    }else{delete state[key];state.activeSideKey=parent.resumeSide;}
    return {...result,state};
  }
  function ownsDeclaration(state){return state[key]?.stage==='chosen' && !state.pendingAction && !state.pendingOfficialReactionWindow;}
  return {afterTransition,finishReaction,ownsDeclaration,
    enumerate(state,options){const side=options.sideKey??state.activeSideKey;
      const domain=side===state.activeSideKey?declaration(state,side):null;
      return {candidates:[], parameterDomains:domain?[domain]:[]};},
    assertAction(state,action){if(ownsDeclaration(state) && (action.sourceRuntimeKind!=='melee'
      || action.actionType!=='charge' || action.pieceId!==read(state).pieceId))throw Error('LIGHTNING_DASH_DECLARED_CHARGE_REQUIRED');}};
}
