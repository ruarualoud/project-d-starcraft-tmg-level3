import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {evaluateOfficialWithinWhollyWithinV1} from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import {allowsOfficialAbilityUnitRecipientV13} from '../rule-atoms/official-structure-targeting-policy-v13.mjs';
import {allowsOfficialInfestationReactionV1} from '../rule-atoms/official-infestation-restrictions-v1.mjs';
import {cannotGainOfficialBurrowedV1} from './official-characteristic-status-family-adapter-v1.mjs';

export const OFFICIAL_BRUTAL_INSTINCT_ID='card:hive/brutal-instinct-any@1';
export const OFFICIAL_PARASITIC_BIO_TOXINS_ID='card:infested_command_center/parasitic-bio-toxins-any@1';
export const OFFICIAL_ADDED_STATUS_REACTIONS_V1=Object.freeze({
  [OFFICIAL_BRUTAL_INSTINCT_ID]:Object.freeze({recordKey:'tactical_cards:hive',sourceKind:'card_feature',
    resourceType:null,resourceCost:0,phase:'movement',abilityName:'Brutal Instinct',
    sourceText:'Brutal Instinct <Reaction> <Movement Phase>: Immediately after an Enemy Unit ends its Activation Within 12" of a Friendly, Ground Unit. That Friendly Unit gains or loses the BURROWED Status.',
    spec:Object.freeze({effectKind:'selected_unit_burrow_toggle',triggerKind:'unit_activation_ended',addedCardStatusOwner:true,rangeMilliInches:12000})}),
  [OFFICIAL_PARASITIC_BIO_TOXINS_ID]:Object.freeze({recordKey:'tactical_cards:infested_command_center',sourceKind:'card_feature',
    resourceType:null,resourceCost:0,phase:'movement',abilityName:'Parasitic Bio-Toxins',
    sourceText:'Parasitic Bio-Toxins <Reaction> <Movement Phase>: Immediately after a Friendly Infested Unit ends their action Within 8" of an Enemy Unit. That Enemy Unit gains the INFESTATION Status, this effect is treated as a DEBUFF.',
    spec:Object.freeze({effectKind:'action_end_infestation_debuff',triggerKind:'unit_action_ended',addedCardStatusOwner:true,rangeMilliInches:8000})}),
});
const live=p=>p?.isOnField===true&&!p.isDestroyed&&Number(p.currentModels)>0;
const tags=p=>new Set([p.combatTag,...(p.combatTags||[])].map(v=>String(v||'').toLowerCase()));
const named=(p,name)=>(p.statuses||[]).some(s=>String(typeof s==='string'?s:s.statusName||s.name).toLowerCase()===name);
export function resolveOfficialAddedCardReactionTargetsV1(state,window,route,sideKey){
  const witness=window.context.addedCardTrigger;
  if(!witness)return[];
  const {witnessHash,...body}=witness;
  if(witnessHash!==hash(body)||witness.round!==Number(state.round)||witness.phase!==state.phase
    ||witness.triggerKind!==window.triggerKind||state.phase!=='movement')throw Error('ADDED_CARD_TRIGGER_WITNESS_INVALID');
  const actor=state.pieces.find(p=>p.id===witness.pieceId);
  if(!live(actor)||actor.sideKey!==witness.sideKey)return[];
  if(route.definitionId===OFFICIAL_BRUTAL_INSTINCT_ID&&actor.sideKey===sideKey
    ||route.definitionId===OFFICIAL_PARASITIC_BIO_TOXINS_ID&&(actor.sideKey!==sideKey||!tags(actor).has('infested')))return[];
  return state.pieces.filter(target=>live(target)&&allowsOfficialAbilityUnitRecipientV13(state,target)
    &&(route.definitionId===OFFICIAL_BRUTAL_INSTINCT_ID
      ?target.sideKey===sideKey&&tags(target).has('ground')
        &&(named(target,'burrowed')||!cannotGainOfficialBurrowedV1(state,target))
      :target.sideKey!==sideKey)
    &&allowsOfficialInfestationReactionV1(state,{sideKey,sourcePieceId:route.definitionId===OFFICIAL_PARASITIC_BIO_TOXINS_ID?actor.id:null,
      recipientPieceId:target.id,abilityName:route.abilityName})
    &&actor.models.filter(m=>!m.isDestroyed&&m.isOnField!==false).some(m=>evaluateOfficialWithinWhollyWithinV1({state,
      dataBundle:state.officialModelBaseGeometryDataBundle,source:{kind:'model',unitId:actor.id,modelId:m.id},
      targetUnitId:target.id,rangeMilliInches:route.rangeMilliInches}).unitWithin)).map(p=>p.id).sort();
}
