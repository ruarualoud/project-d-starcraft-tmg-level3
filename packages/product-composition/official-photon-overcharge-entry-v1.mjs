import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {resolveOfficialArmourRollActivationIdV1} from '../rule-atoms/official-armour-roll-ordinal-v1.mjs';
import {createOfficialReactionWindowOpportunityBatchV1, consumeOfficialReactionFamilyResolutionV1} from './official-reaction-family-adapter-v1.mjs';
import {OFFICIAL_FAQ_REACTION_POLICY_V13} from '../rule-atoms/official-faq-reaction-policy-v13.mjs';

export const PHOTON_OVERCHARGE_ID = 'card:overcharged_nexus/photon-overcharge-any@1';
const key = 'pendingOfficialPhotonOvercharge';
const seal = body => ({...body, parentHash:hash(body)});
function stored(state) {
  const item=state[key];
  if (!item) return null;
  const {parentHash,...body}=item;
  if (hash(body)!==parentHash || body.round!==Number(state.round) || body.phase!==state.phase) throw Error('PHOTON_ENTRY_CHECKPOINT_INVALID');
  return body;
}
export function identifyPhotonReserveEntryV1(before,result,action,{friendlyEntryEdgesImmune=false}={}) {
  for (const event of result.events ?? []) {
    const id=event.pieceId;
    if (!id) continue;
    const was=before.pieces.find(p=>p.id===id);
    const now=result.state.pieces.find(p=>p.id===id);
    if (!was || was.isOnField || was.isDestroyed || !now?.isOnField || now.isDestroyed) continue;
    const reserve=before.reserveManifestBySide?.[now.sideKey]?.some(p=>p.pieceId===id);
    if (!reserve) continue;
    const entrySource=event.entrySource;
    // FAQ 1.3: a friendly unit base explicitly used as an Entry Edge is
    // the player's own Entry Edge. Temporary transport beacons are not.
    if(friendlyEntryEdgesImmune&&entrySource?.sourceFootprintHash&&entrySource.sourcePieceId
      &&before.pieces.some(p=>p.id===entrySource.sourcePieceId&&p.sideKey===now.sideKey))continue;
    // Native movement emits entrySource only for a local conduit or a neutral edge.
    // An ordinary entry through the player's own edge has no such source.
    if (event.type==='unit_deploy_resolved' && event.entrySource?.definitionId && event.entrySource.sourceRouteHash
      || event.type==='reserve_deployed_via_special_entry' || event.type==='non_entry_edge_ground_deployed'
      || event.type==='relocation_ability_resolved' && event.deploymentResolved && ['non_entry_edge_deploy','friendly_anchor_place'].includes(event.effectKind)
      || event.type==='special_unit_deployed' && (action.sourceAction?.effectKind??action.effectKind)==='phase_prism_swap') return {piece:now,event};
  }
  return null;
}

export function createPhotonOverchargeEntryV1(bundle,route,adapter,{includeSealedCompletion=false,faqSourceByteHash,includeSourceArmourContext=false}={}) {
  if(includeSealedCompletion&&faqSourceByteHash!==OFFICIAL_FAQ_REACTION_POLICY_V13.sourceByteHash)
    throw Error('PHOTON_ENTRY_FAQ_SOURCE_REQUIRED');
  function afterTransition(before,result,action) {
    let parent=stored(before);
    if (parent?.stage==='reaction') return result;
    if (parent?.stage==='hits') {
      if (!result.events?.some(e=>e.type==='automatic_hits_complete' && e.sourcePlanHash===parent.triggerHash)) return result;
      const state=structuredClone(result.state);
      delete state[key]; state.activeSideKey=parent.resumeSide;
      return {...result,state};
    }
    if (!parent) {
      const entry=identifyPhotonReserveEntryV1(before,result,action,{friendlyEntryEdgesImmune:includeSealedCompletion});
      if (!entry) return result;
      parent={stage:'entry',round:Number(before.round),phase:before.phase,pieceId:entry.piece.id,side:entry.piece.sideKey,
        activationId:includeSealedCompletion&&before.phase==='cleanup'?null:resolveOfficialArmourRollActivationIdV1(before,entry.piece.id),entryHash:hash({action,event:entry.event})};
    }
    const state=structuredClone(result.state);
    if (state.pendingOfficialReactionWindow || state.pendingAction || state.pendingOfficialAutomaticHits) {
      state[key]=seal(parent); return {...result,state};
    }
    delete state[key];
    const input={triggerKind:'reserve_entered_non_entry',activeSideKey:parent.side,phase:parent.phase,
      activationId:parent.activationId,sourceActionHash:parent.entryHash,context:{targetPieceId:parent.pieceId,
        enteredFromReserves:true,enteredViaOwnEntryEdge:false}};
    const {activeLegal,defenderLegal}=createOfficialReactionWindowOpportunityBatchV1({state,bundle}).projectWindow(input);
    const windows=includeSealedCompletion&&parent.activationId===null?[activeLegal,defenderLegal]:[defenderLegal];
    if (!windows.some(menu=>menu.parameterDomains.some(d=>d.definitionId===route.definitionId))) return {...result,state};
    const opened=adapter.openReactionWindow(state,input);
    const next=structuredClone(opened.state);
    next[key]=seal({...parent,stage:'reaction',triggerHash:next.pendingOfficialReactionWindow.triggerHash,resumeSide:state.activeSideKey});
    next.activeSideKey=next.pendingOfficialReactionWindow.prioritySideKeys[0];
    return {...result,state:next,events:[...result.events,...opened.events]};
  }
  function finish(before,result) {
    const p=stored(before);
    if (p?.stage!=='reaction' || result.state.pendingOfficialReactionWindow) return result;
    const consumed=consumeOfficialReactionFamilyResolutionV1(result.state,p.triggerHash);
    const e=consumed.projection.effects.find(e=>e.definitionId===route.definitionId);
    const state=structuredClone(consumed.state);
    if (!e) {delete state[key];state.activeSideKey=p.resumeSide;return {...result,state};}
    if (e.targetPieceId!==p.pieceId || e.sideKey===p.side || e.sourceFeatureHash!==route.sourceFeatureHash) throw Error('PHOTON_ENTRY_RECEIPT_MISMATCH');
    state[key]=seal({...p,stage:'hits',effectHash:e.effectHash,sourceId:e.sourceInstanceId});
    state.activeSideKey=e.sideKey;
    state.pendingOfficialAutomaticHits=seal({schema:'starcraft_tmg_automatic_hits_source_checkpoint_v1',
      round:p.round,phase:p.phase,sideKey:e.sideKey,pieceId:e.sourceInstanceId,definitionId:route.definitionId,
      sourceFeatureHash:route.sourceFeatureHash,sourceRouteHash:route.routeHash,abilityName:route.abilityName,
      sourcePlanHash:p.triggerHash,stage:'ready',automaticHits:{hits:e.automaticHits,damagePerHit:e.damagePerHit,targetUnitIds:[p.pieceId]},
      ...(includeSealedCompletion?{reactionTiming:p.activationId===null?'outside_activation':'inside_activation'}:{}),
      ...(includeSourceArmourContext?{reactionActivationContext:{activeSideKey:p.side,activationId:p.activationId}}:{}),trainingTruth:false});
    return {...result,state};
  }
  const sourceAuthority={schema:'starcraft_tmg_automatic_hits_source_authority_v1',sourceBundleHash:route.routeHash,
    owns:parent=>parent.definitionId===route.definitionId,
    ...(includeSealedCompletion?{timingFor:hits=>hits.reactionTiming,reactionContextFor(state,hits){
      const p=stored(state);
      if(p?.stage!=='hits'||p.sourceId!==hits.pieceId||p.triggerHash!==hits.sourcePlanHash)
        throw Error('PHOTON_ENTRY_ACTIVATION_CONTEXT_REQUIRED');
      return{activeSideKey:p.side,activationId:p.activationId};
    }}:{}),
    validate(state,hits) {
      const p=stored(state);
      const receipt=state.officialReactionResolutionHistory?.find(r=>r.triggerHash===p?.triggerHash && r.consumedByHost);
      const e=receipt?.effects.find(e=>e.effectHash===p?.effectHash);
      return Boolean(p?.stage==='hits' && e?.definitionId===route.definitionId && e.targetPieceId===p.pieceId && e.sourceInstanceId===p.sourceId
        && e.sideKey===hits.sideKey && e.sideKey!==p.side && hits.sourcePlanHash===receipt.triggerHash && hits.pieceId===p.sourceId
        && hits.sourceFeatureHash===route.sourceFeatureHash && hits.sourceRouteHash===route.routeHash
        &&(!includeSourceArmourContext||hits.reactionActivationContext?.activeSideKey===p.side&&hits.reactionActivationContext?.activationId===p.activationId)
        && hits.automaticHits?.hits===route.automaticHits && hits.automaticHits.damagePerHit===route.damagePerHit
        && hits.automaticHits.targetUnitIds.length===1 && hits.automaticHits.targetUnitIds[0]===p.pieceId);
    }};
  function afterSealedHits(result,sealedParent){
    if(!includeSealedCompletion||!sealedParent||hash(result.state[key])!==hash(sealedParent)
      ||stored(result.state)?.stage!=='hits')throw Error('PHOTON_ENTRY_SEALED_PARENT_MISMATCH');
    return afterTransition(result.state,result,{});
  }
  return {afterTransition,finish,sourceAuthority,...(includeSealedCompletion?{afterSealedHits}:{})};
}
