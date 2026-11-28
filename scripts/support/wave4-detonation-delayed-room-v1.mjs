import {createWave4StukovUnitScene} from './wave4-stukov-unit-room-v1.mjs';
import {createOfficialReleaseRosterStateV2} from '../../packages/product-composition/official-release-roster-state-v2.mjs';
import {declareWave3EngineeringCoherencyV1} from './wave3-room-boundary-fixture-v1.mjs';
import {bindWave4TokenBoard} from './wave4-token-board-v1.mjs';
import {DETONATION_IDS} from './wave4-detonation-room-v1.mjs';
import {createOfficialSpecialUnitPieceV1} from '../../packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs';
export const BILE_ID='unit:ravager/corrosive-bile-movement-phase@1',DRONE_ID='unit:sabotage_drone/have-a-nice-day-assault-phase@1',GRIFFIN_ID='card:nova_covert_ops/griffin-support-any@1';
export function createWave4DetonationDelayedScene(inputs,{kind='bile',beforeCasualtyPolicyVersion='1.6.0',protectDroneSource=false,targetInstanceId='defender'}={}){
 const drone=kind==='drone',template=createWave4StukovUnitScene(inputs,{phase:'movement',preactivateMarine:false}),
  targetKey=drone?'infested_trooper':'infested_marine',characteristics=drone?[DRONE_ID]:['unit:infested_marine/live-for-the-swarm-any-phase@1'],
  plating='card:armory/vehicle-plating-any@2',
  sourceDefinitionIds=[...DETONATION_IDS,...characteristics,...(drone?[GRIFFIN_ID,'unit:sabotage_drone/structure-any-phase@1']:[BILE_ID]),...(protectDroneSource?[plating]:[])],unit=(id,key)=>({unitInstanceId:id,recordKey:'army_units:'+key,compositionKind:'small',upgrades:[]});
 const built=createOfficialReleaseRosterStateV2({context:inputs.context,sourceDefinitionIds,includeBeforeCasualtyBatch:true,beforeCasualtyPolicyVersion,
  reactionDefinitionIds:[...DETONATION_IDS,...(protectDroneSource?[plating]:[])],includeArmourOrdinals:protectDroneSource,
  characteristicDefinitionIds:characteristics,...(drone?{unitLifecycleDefinitionIds:[GRIFFIN_ID]}:{includeCorrosiveBile:true,includeCorrosiveBileDamage:true}),
  canonicalResourceTypes:true,includeAbilitySourcePhases:true,includeCharacteristicConsumers:true,includeMelee:true,
  candidatesBySide:{player1:{sideKey:'player1',scaleId:'Standard',mineralBudget:2000,
    factionRecordKey:drone?'tactical_cards:nova_covert_ops':'tactical_cards:zerg_swarm',tacticalCardRecordKeys:drone?(protectDroneSource?['tactical_cards:armory']:[]):['tactical_cards:accelerating_creep','tactical_cards:hatchery'],
    units:[unit('actor',drone?'nova_assault_mode':'ravager')]},
   player2:{sideKey:'player2',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:stukov_s_forces',
    tacticalCardRecordKeys:['tactical_cards:healing_pathogen'],units:[unit(targetInstanceId,targetKey)]}}});
 const keys=['round','firstPassSideByPhase','scores','gameOver','terminal','engagementScale','armyBuildingEngagementScale',
  'board','officialModelGapTransitPolicy','officialMissionRuntimeDescriptor','officialMissionSupplyProfile','supplyLossLedger',
  'officialMissionRuntimeState','officialMissionDeploymentDraftDataBundle','officialMissionEffectCatalogue'];
 const state={...Object.fromEntries(keys.map(k=>[k,structuredClone(template.state[k])])),...built.state,phase:'start_of_round',stage:'mission_start_of_round',
  activeSideKey:'player2',firstPlayerSideKey:'player2',phaseFirstActorByRound:{},log:[]},actor=state.pieces.find(p=>p.id==='actor'),defender=state.pieces.find(p=>p.id===targetInstanceId),
  x=drone?22:15+(actor.models[0].baseWidthInches+defender.models[0].baseWidthInches)/2+1.5;
 for(const p of state.pieces){Object.assign(p,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',leadingModelId:p.models[0].id});
  p.models.forEach((m,i)=>Object.assign(m,{isOnField:true,xInches:p.id==='actor'?(drone?10:15):x+(i%3)*(m.baseWidthInches+0.05),
   yInches:10+Math.floor(i/3)*(m.baseDepthInches+0.05),elevation:'ground_level'}));}
 for(const p of state.pieces){const profile=state.officialCombatProfileBundle.profiles.find(r=>r.recordKey===p.officialUnitRecordKey);
  p.damageMarker=p.id==='actor'?(drone?0:profile.hitPoints-1):profile.hitPoints*(p.currentModels-1);
  Object.assign(p.models[0],{damage:p.damageMarker,remainingWounds:Math.max(0,profile.hitPoints-p.damageMarker)});}
 if(drone)state.officialReleaseDroneAssaultTiming=state.officialSabotageDronePhaseEndPolicy.policyHash;
 else state.officialReleaseBileAssaultTiming=state.officialCorrosiveBileDamagePolicy.policyHash;
 const tokenBoard=bindWave4TokenBoard(inputs,state);declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'wave4-detonation-delayed-'+kind});
 const droneWidth=drone?createOfficialSpecialUnitPieceV1(state,'player1','army_units:sabotage_drone','geometry-query').models[0].baseWidthInches:0;
 return{state,sourceDefinitionIds,characteristicRuntimeDefinitionIds:characteristics,roundControl:true,roundDefinitionIds:sourceDefinitionIds,
  runtimeOptions:{includeRanged:true,includeMelee:true,includeHits:true,includePrecisionChoices:true,includeArmourChoices:true,includeReleasePhaseControl:true,
   ...(!drone?{includeBilePhysicalPlacement:true,includeReleaseBileAssaultOrder:true}:{}),...(protectDroneSource?{includeArmourReactions:true,includeArmourOrdinals:true}:{})},
  bileCoordinate:{xMilliInches:Math.round((x+1.3)*1000),yMilliInches:13400},
  droneCoordinate:{xMilliInches:Math.round((x-(droneWidth+defender.models[0].baseWidthInches)/2-1.5)*1000),yMilliInches:10000},
  scenario:{kind:'wave4_detonation_delayed_'+kind,tokenBoard,declaredPositionsAndNonLethalMarkers:true,
   actualMovementProducerRequired:true,sourceGeneratedInitially:false,targetRecordKey:'army_units:'+targetKey,
   estimatedInfantryGeometry:true,...(protectDroneSource?{sourceProtectionRequested:'actual Vehicle Plating reaction, TOUGH(1) for own Armour Roll'}:{}),fullMatchAdmission:false}};
}
