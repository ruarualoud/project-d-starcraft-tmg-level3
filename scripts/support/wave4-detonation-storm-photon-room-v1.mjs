import {createWave4StukovUnitScene} from './wave4-stukov-unit-room-v1.mjs';
import {createOfficialReleaseRosterStateV2} from '../../packages/product-composition/official-release-roster-state-v2.mjs';
import {createOfficialCleanupContinuationPolicyV1} from '../../packages/product-composition/official-cleanup-continuation-runtime-v1.mjs';
import {declareWave3EngineeringCoherencyV1} from './wave3-room-boundary-fixture-v1.mjs';
import {bindWave4TokenBoard} from './wave4-token-board-v1.mjs';
import {DETONATION_IDS} from './wave4-detonation-room-v1.mjs';
export const STORM_ID='unit:high_templar/psionic-storm-movement-phase@1',PHOTON_ID='card:overcharged_nexus/photon-overcharge-any@1',
 AMBUSH_ID='unit:infested_trooper/burrow-ambush-movement-phase@1';
export function createWave4DetonationStormPhotonScene(inputs,{kind='storm',beforeCasualtyPolicyVersion='1.7.0'}={}){
 const storm=kind==='storm',template=createWave4StukovUnitScene(inputs,{phase:'movement',preactivateMarine:false}),
  live='unit:infested_'+(storm?'marine':'trooper')+'/live-for-the-swarm-any-phase@1',
  minds='unit:high_templar/our-minds-as-one-any-phase@1',
  characteristics=[live,...(storm?[minds]:[])],
  sourceDefinitionIds=[...DETONATION_IDS,...characteristics,...(storm?[STORM_ID,'unit:twilight_templar__high_templar_/psionic-gale-movement-phase@1']:[PHOTON_ID,AMBUSH_ID])],
  unit=(id,key)=>({unitInstanceId:id,recordKey:'army_units:'+key,compositionKind:'small',upgrades:storm&&id==='actor'?[{upgradeName:'Psionic Storm'}]:[]}),
  built=createOfficialReleaseRosterStateV2({context:inputs.context,sourceDefinitionIds,includeBeforeCasualtyBatch:true,beforeCasualtyPolicyVersion,
   reactionDefinitionIds:[...DETONATION_IDS,...(!storm?[PHOTON_ID]:[])],characteristicDefinitionIds:characteristics,
   ...(!storm?{relocationDefinitionIds:[AMBUSH_ID]}:{includePsionicStormAssaultDamage:true}),
   includeArmourOrdinals:true,includeMelee:true,includeAbilitySourcePhases:true,includeCharacteristicConsumers:true,canonicalResourceTypes:true,
   candidatesBySide:{player1:{sideKey:'player1',scaleId:'Standard',mineralBudget:2000,
    factionRecordKey:storm?'tactical_cards:daelaam':'tactical_cards:stukov_s_forces',
    tacticalCardRecordKeys:storm?['tactical_cards:gateway']:['tactical_cards:healing_pathogen'],
    units:[unit('actor',storm?'high_templar':'infested_trooper')]},
   player2:{sideKey:'player2',scaleId:'Standard',mineralBudget:2000,
    factionRecordKey:storm?'tactical_cards:stukov_s_forces':'tactical_cards:daelaam',
    tacticalCardRecordKeys:storm?['tactical_cards:healing_pathogen']:['tactical_cards:overcharged_nexus'],
    units:[unit('defender',storm?'infested_marine':'zealot')]}}}),
  keys=['round','firstPassSideByPhase','scores','gameOver','terminal','engagementScale','armyBuildingEngagementScale',
   'board','officialModelGapTransitPolicy','officialMissionRuntimeDescriptor','officialMissionSupplyProfile','supplyLossLedger',
   'officialMissionRuntimeState','officialMissionDeploymentDraftDataBundle','officialMissionEffectCatalogue'],
  state={...Object.fromEntries(keys.map(k=>[k,structuredClone(template.state[k])])),...built.state,
   phase:'start_of_round',stage:'mission_start_of_round',activeSideKey:'player1',firstPlayerSideKey:'player1',phaseFirstActorByRound:{},log:[]};
 for(const p of state.pieces){const actor=p.id==='actor',reserve=!storm&&actor;
  Object.assign(p,{isOnField:!reserve,isInReserves:reserve,deploymentStatus:reserve?'reserves':'deployed',leadingModelId:p.models[0].id});
  p.models.forEach((m,i)=>Object.assign(m,{isOnField:!reserve,elevation:'ground_level',
   xInches:storm?(actor?15:18+(i%3)*(m.baseWidthInches+0.05)):actor?35+(i%3)*(m.baseWidthInches+0.05):10+(i===2?0.5:i)*(m.baseWidthInches+0.05),
   yInches:storm?10+(actor?i:Math.floor(i/3))*(m.baseDepthInches+0.05):actor?27+Math.floor(i/3)*(m.baseDepthInches+0.05):10+(i===2?(m.baseDepthInches+0.05)*Math.sqrt(3)/2:0)}));
  if(storm){const profile=state.officialCombatProfileBundle.profiles.find(r=>r.recordKey===p.officialUnitRecordKey);
   p.statuses=p.statuses.filter(s=>String(typeof s==='string'?s:s.statusName||s.name).toLowerCase()!=='shielded');
   p.damageMarker=profile.hitPoints*p.currentModels-1;Object.assign(p.models[0],{damage:p.damageMarker,remainingWounds:1});}
 }
 const tokenBoard=bindWave4TokenBoard(inputs,state);
 if(storm)state.officialCleanupContinuationPolicy=createOfficialCleanupContinuationPolicyV1({context:inputs.context});
 declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'wave4-detonation-'+kind});
 return{state,sourceDefinitionIds,characteristicRuntimeDefinitionIds:characteristics,roundControl:true,roundDefinitionIds:sourceDefinitionIds,
  runtimeOptions:{includeRanged:true,includeMelee:true,includeHits:true,includePrecisionChoices:true,includeArmourChoices:true,
   includeArmourOrdinals:true,includeReleasePhaseControl:true,
   ...(storm?{selectedStormDefinitionIds:[STORM_ID],includePsionicStormSourceRules:true,includePsionicStormGeometryEvidence:true,
    includePsionicStormPhaseEnd:true,includePsionicStormPhaseEndDefence:true,includePsionicStormAssaultDamage:true,
    includePsionicStormAssaultOrder:true,includePsionicStormMovementPass:true,includePsionicStormEquivalentNameOverlap:true,
    includePsionicStormNamedOverlapChoices:true,includePsionicStormAssaultSameName:true,includePsionicStormCast:true,
    includePsionicStormTokenCleanup:true}:{})},
  stormCoordinate:{xMilliInches:19400,yMilliInches:13200},
  scenario:{kind:'wave4_detonation_'+kind,tokenBoard,declaredEngineeringPositions:true,
   conditionalInitialDamageAndDepletedShields:storm,initialActorInReserves:!storm,
   estimatedInfantryGeometry:true,fullMatchAdmission:false}};
}
