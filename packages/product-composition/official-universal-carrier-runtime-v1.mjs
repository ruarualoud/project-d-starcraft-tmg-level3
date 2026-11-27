import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { OFFICIAL_UNIVERSAL_CARRIER_ID } from '../source-data/official-universal-carrier-source-v1.mjs';
import { createOfficialHealResolutionKernelV1 } from '../rule-atoms/official-heal-resolution-kernel-v1.mjs';
import { evaluateOfficialWithinWhollyWithinV1 } from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { evaluateOfficialElevatedLineOfSightV1 } from '../rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs';
import { allowsOfficialAbilityUnitRecipientV13 } from '../rule-atoms/official-structure-targeting-policy-v13.mjs';
import { projectOfficialRangedTerrainForLosV1 } from './official-ranged-terrain-projection-v1.mjs';
import { synchronizeOfficialEffectiveHitPointWoundsV1 } from './official-characteristic-status-family-adapter-v1.mjs';
import { officialInfestationStatusNameV1 as statusName,isOfficialInfestationTransferLiveUnitV1 as live } from './official-infestation-transfer-facts-v1.mjs';
const key='pendingOfficialUniversalCarrier';
const kind='choose_universal_carrier_heal';
const without=(x,k)=>Object.fromEntries(Object.entries(x).filter(([name])=>name!==k));
const seal=(body,k)=>({...body,[k]:hash(body)});
const heal=createOfficialHealResolutionKernelV1();
const models=piece=>(piece.models||[]).filter(model=>model.isOnField!==false&&!model.isDestroyed);
export function createOfficialUniversalCarrierRuntimeV1({sourceBundle}) {
 const route=sourceBundle.routes.find(row=>row.definitionId===OFFICIAL_UNIVERSAL_CARRIER_ID);
 if(!route||route.effectKind!=='universal_carrier'||route.healValue!==2||route.rangeMilliInches!==12000)throw Error('UNIVERSAL_CARRIER_SOURCE_REQUIRED');
 function pending(state){
  const parent=state[key];if(!parent)return null;
  if(parent.parentHash!==hash(without(parent,'parentHash'))||parent.sourceRouteHash!==route.routeHash
    ||parent.round!==Number(state.round)||parent.phase!==state.phase||!parent.opportunities?.length
    ||parent.opportunities.some(op=>op.opportunityHash!==hash(without(op,'opportunityHash'))))throw Error('UNIVERSAL_CARRIER_PARENT_INVALID');
  return parent;
 }
 function targets(state,op){
  const fallen=op.fallenPiece;
  if(!(state.cardResources?.[op.sideKey]||[]).some(card=>card.cardInstanceId===op.sourceInstanceId
    &&card.officialCardRecordKey===route.recordKey))return[];
  const measurement={...state,pieces:[...state.pieces.filter(piece=>piece.id!==fallen.id),fallen]};
  const {projected}=projectOfficialRangedTerrainForLosV1(measurement);
  return state.pieces.filter(target=>target.sideKey===op.sideKey&&live(target)
    &&target.combatTags?.some(tag=>String(tag).toLowerCase()==='biological')&&allowsOfficialAbilityUnitRecipientV13(state,target)
    &&models(fallen).some(model=>evaluateOfficialWithinWhollyWithinV1({state:measurement,dataBundle:state.officialModelBaseGeometryDataBundle,
      source:{kind:'model',unitId:fallen.id,modelId:model.id},targetUnitId:target.id,rangeMilliInches:route.rangeMilliInches}).unitWithin)
    &&models(fallen).some(model=>models(target).some(targetModel=>evaluateOfficialElevatedLineOfSightV1({state:projected,
      attacker:fallen,attackerModelId:model.id,target,targetModelId:targetModel.id,dataBundle:state.officialTerrainLosDataBundle}).visible)))
    .map(target=>target.id).sort();
 }
 function selectOwner(state,parent){
  const available=parent.opportunities.filter(op=>targets(state,op).length);
  if(!available.length){state.activeSideKey=parent.resumeSideKey;delete state[key];return;}
  const owner=available.some(op=>op.sideKey===parent.activePlayerSideKey)?parent.activePlayerSideKey:available[0].sideKey;
  state[key]=seal({...without(parent,'parentHash'),opportunities:available,ownerSideKey:owner},'parentHash');state.activeSideKey=owner;
 }
 function afterTransition(before,result,action){
  if(before.round!==result.state.round||before.phase!==result.state.phase)return result;
  const entries=(result.state.supplyLossLedger?.entries||[]).slice(before.supplyLossLedger?.entries.length||0);
  const losses=before.pieces.filter(piece=>live(piece)&&(piece.statuses||[]).some(status=>statusName(status)==='infestation')).flatMap(fallen=>{
   const after=result.state.pieces.find(piece=>piece.id===fallen.id);
   const lossEntries=entries.filter(entry=>entry.unitId===fallen.id&&entry.currentSupplyAfter<entry.currentSupplyBefore);
   const destroyed=!after||after.isDestroyed||Number(after.currentModels)===0;
   return lossEntries.length||destroyed?[{fallenPiece:structuredClone(fallen),supplyLossEntryHashes:lossEntries.map(e=>e.entryHash),destroyed:Boolean(destroyed)}]:[];
  });
  if(!losses.length)return result;
  const opportunities=Object.entries(result.state.cardResources||{}).flatMap(([sideKey,cards])=>cards.filter(card=>card.officialCardRecordKey===route.recordKey)
    .flatMap(card=>losses.filter(loss=>loss.fallenPiece.sideKey!==sideKey).map(loss=>seal({...loss,sideKey,sourceInstanceId:card.cardInstanceId,
      sourceActionHash:action.sourceActionHash||hash(action),sourceRouteHash:route.routeHash},'opportunityHash'))));
  if(!opportunities.length)return result;
  const state=structuredClone(result.state);const previous=pending(state);
  const activePlayerSideKey=before.selectedRosterActivationWindow?.sideKey||before.pendingCurrentProductRangedSequence?.sideKey
    ||before.pendingOfficialReactionWindow?.activeSideKey||before.activeSideKey;
  const parent=previous?{...without(previous,'parentHash'),opportunities:[...previous.opportunities,...opportunities]}:
    {round:Number(state.round),phase:state.phase,sourceRouteHash:route.routeHash,resumeSideKey:state.activeSideKey,activePlayerSideKey,opportunities,trainingTruth:false};
  selectOwner(state,parent);
  return{...result,state};
 }
 function enumerate(state,options={}){
  const parent=pending(state);if(!parent||(options.sideKey||state.activeSideKey)!==parent.ownerSideKey)return{candidates:[],parameterDomains:[]};
  return{candidates:[],parameterDomains:parent.opportunities.filter(op=>op.sideKey===parent.ownerSideKey).map(op=>seal({
    schemaVersion:'starcraft_tmg_official_parameter_domain_v1',parameterKind:'official_universal_carrier_heal_choice_v1',
    actionType:kind,abilityName:'Universal Carrier',definitionId:route.definitionId,sideKey:op.sideKey,phase:state.phase,
    sourceInstanceId:op.sourceInstanceId,parameterSchema:{type:'object',required:['targetUnitId'],
      targetUnitId:{enum:targets(state,op)}},
    constraints:{parentHash:parent.parentHash,opportunityHash:op.opportunityHash,sourceRouteHash:route.routeHash,fallenUnitId:op.fallenPiece.id,
      sourceActionHash:op.sourceActionHash,printedHeal:2,passiveNotReaction:true,sourceBoundRangeMilliInches:12000,
      lineOfSightRequiredByCorePart10:true,noReactionAllowanceConsumed:true},
    confirmationClass:'rules_owned_passive_target_choice',trainingTruth:false},'domainId'))};
 }
 function instantiate(state,domain,parameters){
  const current=enumerate(state).parameterDomains.find(row=>row.domainId===domain?.domainId);
  if(!current||!isDeepStrictEqual(current,domain)||!parameters||Object.keys(parameters).sort().join(',')!=='targetUnitId'
    ||!domain.parameterSchema.targetUnitId.enum.includes(parameters.targetUnitId))throw Error('UNIVERSAL_CARRIER_TARGET_CHOICE_INVALID');
  const canonicalParameters={targetUnitId:parameters.targetUnitId};
  return{canonicalParameters,action:seal({actionType:kind,definitionId:route.definitionId,sideKey:domain.sideKey,phase:state.phase,
    stateHash:hash(state),domainId:domain.domainId,parentHash:pending(state).parentHash,opportunityHash:domain.constraints.opportunityHash,canonicalParameters,trainingTruth:false},'actionHash')};
 }
 function apply(stateInput,action,options={}){
  if(options.chanceReveals?.length)throw Error('UNIVERSAL_CARRIER_CHANCE_NOT_ALLOWED');
  const expected=instantiate(stateInput,enumerate(stateInput).parameterDomains.find(row=>row.domainId===action.domainId),action.canonicalParameters).action;
  if(!isDeepStrictEqual(expected,action))throw Error('UNIVERSAL_CARRIER_ACTION_STALE');
  const state=structuredClone(stateInput);const parent=pending(state);const op=parent.opportunities.find(op=>op.opportunityHash===action.opportunityHash);
  const target=state.pieces.find(piece=>piece.id===action.canonicalParameters.targetUnitId);
  const resolution=heal.resolveHeal({currentModels:target.currentModels,maxModels:target.models.length,
    destroyedModelIds:target.models.filter(model=>model.isDestroyed).map(model=>model.id),damageMarker:target.damageMarker||0,healValue:2,
    statuses:(target.statuses||[]).some(status=>statusName(status)==='shielded')?['shielded']:[],shieldValue:target.shieldValue||0});
  target.damageMarker=resolution.damageMarkerAfter;
  synchronizeOfficialEffectiveHitPointWoundsV1(state,target,{includeUnmodifiedProfiles:true});
  const event={type:'universal_carrier_heal_resolved',definitionId:route.definitionId,sourceFeatureHash:route.sourceFeatureHash,
    sourceInstanceId:op.sourceInstanceId,sideKey:op.sideKey,targetPieceId:target.id,fallenUnitId:op.fallenPiece.id,
    opportunityHash:op.opportunityHash,healResolution:resolution,passiveNotReaction:true,trainingTruth:false};
  state.officialUniversalCarrierHistory=[...(state.officialUniversalCarrierHistory||[]),event];
  state.log.push({round:Number(state.round),phase:state.phase,action:structuredClone(action),events:[event]});
  selectOwner(state,{...without(parent,'parentHash'),opportunities:parent.opportunities.filter(row=>row.opportunityHash!==op.opportunityHash)});
  return{ok:true,state,events:[event],rulesTruth:'source_bound_universal_carrier_passive_heal',trainingTruth:false};
 }
 return{pending,enumerate,instantiate,apply,afterTransition,descriptor:{runtimeId:'official-universal-carrier-runtime-v1',runtimeVersion:'1.0.0',
   definitionId:route.definitionId,sourceRouteHash:route.routeHash,healKernelHash:heal.descriptor.kernelHash,actions:[kind],
   reusedContracts:['supply_loss_ledger','pre_removal_geometry','heal_resolution','passive_priority_core_10_3'],newGameAtoms:0,trainingTruth:false}};
}
