import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {isDeepStrictEqual} from 'node:util';
import {OFFICIAL_CORRODE_ARMOUR_ID} from '../source-data/official-corrode-armour-source-v1.mjs';
import {resolveOfficialArmourRollActivationIdV1} from '../rule-atoms/official-armour-roll-ordinal-v1.mjs';
import {projectOfficialRangedLungeTriggerV1,openOfficialRangedLungeTriggerV1,createOfficialReactionWindowOpportunityBatchV1,
 openOfficialReactionFamilyWindowV1} from './official-reaction-family-adapter-v1.mjs';
const live=p=>p?.isOnField===true&&!p.isDestroyed&&p.currentModels>0;
const without=(x,k)=>Object.fromEntries(Object.entries(x).filter(([name])=>name!==k));
export function projectOfficialAfterRangedSourceTriggerV1(previous,result,options={}){
 const legacy=projectOfficialRangedLungeTriggerV1(previous,result,options),state=result.state;
 const route=state.officialReactionFamilySourceBundle?.routes.find(r=>r.definitionId===OFFICIAL_CORRODE_ARMOUR_ID);
 if(!route||previous.phase!==state.phase||state.phase!==route.phase||Number(previous.round)!==Number(state.round))return legacy;
 const events=result.events.filter(e=>e.type==='ranged_attack'&&state.pieces.some(p=>p.id===e.pieceId&&p.officialUnitRecordKey===route.recordKey));
 const event=events.find(e=>state.log.slice(previous.log?.length||0).some(l=>l.events?.some(row=>isDeepStrictEqual(e,row))));
 const actor=state.pieces.find(p=>p.id===event?.pieceId),target=state.pieces.find(p=>p.id===event?.targetId);
 if(!event||!live(actor)||!live(target)||actor.sideKey===target.sideKey)return legacy;
 if(events.length!==1||legacy&&legacy.context.attackResolutionHash!==event.attackResolutionHash)throw Error('AFTER_RANGED_AMBIGUOUS_BATCH');
 const body={round:Number(state.round),phase:state.phase,attackerPieceId:actor.id,targetPieceId:target.id,
  sourceFeatureHash:route.sourceFeatureHash,attackResolutionHash:event.attackResolutionHash,casualtyResolutionHash:event.casualtyResolutionHash};
 const proof={...body,proofHash:hash(body)};
 return{triggerKind:'after_ranged_attack_resolved',activeSideKey:actor.sideKey,phase:state.phase,
  activationId:legacy?legacy.activationId:resolveOfficialArmourRollActivationIdV1(previous,actor.id),
  sourceActionHash:hash({corrodeProofHash:proof.proofHash,lungeSourceActionHash:legacy?.sourceActionHash||null}),
  context:{...(legacy?.context||{}),actorPieceId:actor.id,targetPieceId:target.id,attackResolutionHash:event.attackResolutionHash,
   casualtyResolutionHash:event.casualtyResolutionHash,corrodeRangedAttack:proof}};
}
export function openOfficialAfterRangedSourceTriggerV1(state,input){
 if(!input?.context.corrodeRangedAttack)return openOfficialRangedLungeTriggerV1(state,input);
 if(state.pendingOfficialReactionWindow)return null;
 const proof=input.context.corrodeRangedAttack,bundle=state.officialReactionFamilySourceBundle;
 if(proof.proofHash!==hash(without(proof,'proofHash'))||proof.round!==Number(state.round)||proof.phase!==state.phase)
  throw Error('AFTER_RANGED_CORRODE_WITNESS_INVALID');
 const menus=createOfficialReactionWindowOpportunityBatchV1({state,bundle}).projectWindow(input);
 if(![menus.activeLegal,menus.defenderLegal].some(menu=>menu.parameterDomains.some(d=>d.actionType!=='pass_reaction_family_window')))return null;
 return{...openOfficialReactionFamilyWindowV1(bundle,state,input),resumeSideKey:state.activeSideKey};
}
