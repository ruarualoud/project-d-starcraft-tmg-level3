import {createWave4TurretRoundScene} from './wave4-turret-round-v1.mjs';
import {createOfficialReleaseRosterStateV2} from '../../packages/product-composition/official-release-roster-state-v2.mjs';
import {declareWave3EngineeringCoherencyV1} from './wave3-room-boundary-fixture-v1.mjs';
import {applyOfficialSelectedRosterResolvedDamageV1} from '../../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import {resolveOfficialEffectiveCombatProfileV1} from '../../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
export const TAL_DARIM_THRESHOLD_IDS=['chain-of-ascension','4-or-more','6-or-more'].map(s=>'card:tal_darim/'+s+'-any@1');
export function createWave4TalDarimThresholdScene(inputs,{lostSupply=4,kind='ranged',dynamic=false,variant=0}={}){
  if(![3,4,5,6].includes(lostSupply)||!['ranged','melee'].includes(kind)
    ||dynamic&&![3,5].includes(lostSupply)||!Number.isSafeInteger(variant)||variant<0||variant>16)
    throw Error('TAL_DARIM_THRESHOLD_SCENE_INVALID');
  const template=createWave4TurretRoundScene(inputs),ids=TAL_DARIM_THRESHOLD_IDS,
    unit=(id,key)=>({unitInstanceId:id,recordKey:'army_units:'+key,compositionKind:'small',upgrades:[]});
  const built=createOfficialReleaseRosterStateV2({context:inputs.context,sourceDefinitionIds:ids,characteristicDefinitionIds:ids,
    includeTalDarimThresholds:true,includeCharacteristicConsumers:true,includeAbilitySourcePhases:true,canonicalResourceTypes:true,includeMelee:true,
    candidatesBySide:{player1:{sideKey:'player1',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:tal_darim',
      tacticalCardRecordKeys:['tactical_cards:gateway','tactical_cards:gateway'],units:[unit('actor','stalker'),...['ally-a','ally-b','ally-c'].map(id=>unit(id,'zealot'))]},
      player2:{sideKey:'player2',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:terran_armed_forces',
        tacticalCardRecordKeys:['tactical_cards:armory'],units:[unit('enemy','goliath'),...(dynamic?[unit('target','marauder')]:[])]}}});
  const keys=['round','firstPassSideByPhase','scores','gameOver','terminal','engagementScale','armyBuildingEngagementScale',
    'board','officialModelGapTransitPolicy','officialMissionRuntimeDescriptor','officialMissionSupplyProfile','supplyLossLedger',
    'officialMissionRuntimeState','officialMissionDeploymentDraftDataBundle','officialMissionEffectCatalogue'];
  const state={...Object.fromEntries(keys.map(k=>[k,structuredClone(template.state[k])])),...built.state,
    phase:'start_of_round',stage:'mission_start_of_round',activeSideKey:'player1',firstPlayerSideKey:'player1',phaseFirstActorByRound:{},log:[]};
  const get=id=>state.pieces.find(p=>p.id===id),gap=(get('actor').models[0].baseWidthInches+get('enemy').models[0].baseWidthInches)/2+1,
    positions={actor:[12,12],enemy:[kind==='melee'?12+gap:dynamic?26:21,12],
      'ally-a':[34,7],'ally-b':[34,15],'ally-c':dynamic&&lostSupply===5?[34,15]:[42,24],target:[21,22]};
  for(const p of state.pieces){
    Object.assign(p,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',leadingModelId:p.models[0].id});
    const [x,y]=positions[p.id];p.models.forEach((m,i)=>Object.assign(m,{isOnField:true,elevation:'ground_level',
      xInches:x+variant/100+(i===2?0.5:i)*(m.baseWidthInches+0.05),
      yInches:y+(i===2?Math.sqrt(3)/2:0)*(m.baseDepthInches+0.05)}));
  }
  let remaining=lostSupply,lossVictim=null;
  for(const id of ['ally-a','ally-b','ally-c']){
    const p=get(id),lose=Math.min(2,remaining),keep=lose===2?0:lose===1?1:p.models.length;
    applyOfficialSelectedRosterResolvedDamageV1(state,p,resolveOfficialEffectiveCombatProfileV1(state,p),{
      casualtyModelIds:p.models.slice(keep).map(m=>m.id),remainingModelIds:p.models.slice(0,keep).map(m=>m.id),
      targetDestroyed:keep===0,postDamageMarker:0,shieldedBefore:true,shieldedAfter:lose===0});
    remaining-=lose;if(lose===1)lossVictim=id;
  }
  if(remaining)throw Error('TAL_DARIM_THRESHOLD_ATTRITION_UNAVAILABLE');
  if(dynamic){
    const p=get(lossVictim),profile=resolveOfficialEffectiveCombatProfileV1(state,p);
    applyOfficialSelectedRosterResolvedDamageV1(state,p,profile,{casualtyModelIds:[],remainingModelIds:p.models.filter(m=>!m.isDestroyed).map(m=>m.id),
      targetDestroyed:false,postDamageMarker:profile.hitPoints-1,shieldedBefore:false,shieldedAfter:false});
  }
  if(!dynamic&&lostSupply===3){
    const reserve=get('ally-b');Object.assign(reserve,{isOnField:false,isInReserves:true,deploymentStatus:'reserves'});
    reserve.models.forEach(m=>{m.isOnField=false;});
  }
  declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'wave4-tal-darim-threshold'});
  return{state,sourceDefinitionIds:ids,characteristicRuntimeDefinitionIds:ids,roundControl:true,roundDefinitionIds:ids,
    runtimeOptions:{includeRanged:true,includeMelee:true,includePrecisionChoices:true,includeArmourChoices:true,includeReleasePhaseControl:true},
    lossVictim,scenario:{kind:'wave4_tal_darim_threshold_'+kind,lostSupply,dynamic,
      declaredPriorAttrition:true,pristineSourceBoundSupplyBaselineBeforeAttrition:true,declaredEngineeringPositions:true,
      engineeringTranslationInches:variant/100,proxyPylonIncluded:false,fullMatchAdmission:false}};
}
