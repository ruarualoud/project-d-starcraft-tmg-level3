import {createWave4StukovUnitScene} from './wave4-stukov-unit-room-v1.mjs';
import {createOfficialReleaseRosterStateV2} from '../../packages/product-composition/official-release-roster-state-v2.mjs';
import {declareWave3EngineeringCoherencyV1} from './wave3-room-boundary-fixture-v1.mjs';
import {DETONATION_IDS} from './wave4-detonation-room-v1.mjs';
import {bindWave4TokenBoard} from './wave4-token-board-v1.mjs';
export function createWave4DetonationTargetScene(inputs,{beforeCasualtyPolicyVersion='1.5.0'}={}){
 const template=createWave4StukovUnitScene(inputs,{phase:'movement',preactivateMarine:false}),characteristics=['unit:infested_marine/live-for-the-swarm-any-phase@1'],
  dark='unit:defiler/dark-swarm-assault-phase@1',gestate='unit:defiler/gestate-dark-swarm-movement-phase@1',weapon='unit:goliath/autocannon-assault-phase@1',
  sourceDefinitionIds=[...DETONATION_IDS,...characteristics,dark,gestate,weapon];
 const unit=(id,key)=>({unitInstanceId:id,recordKey:'army_units:'+key,compositionKind:'small',upgrades:[]});
 const built=createOfficialReleaseRosterStateV2({context:inputs.context,sourceDefinitionIds,includeBeforeCasualtyBatch:true,beforeCasualtyPolicyVersion,
  reactionDefinitionIds:[...DETONATION_IDS,dark],characteristicDefinitionIds:characteristics,rangedWeaponDefinitionIds:[weapon],
  includeGestateDarkSwarm:true,includeDarkSwarmLifecycle:true,includeBattlefieldDisplacement:true,
  canonicalResourceTypes:true,includeAbilitySourcePhases:true,includeCharacteristicConsumers:true,includeMelee:true,
  candidatesBySide:{player1:{sideKey:'player1',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:terran_armed_forces',
    tacticalCardRecordKeys:['tactical_cards:armory'],units:[unit('attacker','goliath')]},
   player2:{sideKey:'player2',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:stukov_s_forces',
    tacticalCardRecordKeys:['tactical_cards:healing_pathogen','tactical_cards:hatchery'],units:[unit('defender','infested_marine'),unit('defiler','defiler')]}}});
 const keys=['round','phase','stage','firstPlayerSideKey','firstPassSideByPhase','scores','gameOver','terminal','engagementScale','armyBuildingEngagementScale',
  'board','officialModelGapTransitPolicy','officialMissionRuntimeDescriptor','officialMissionSupplyProfile','supplyLossLedger',
  'officialMissionRuntimeState','officialMissionDeploymentDraftDataBundle','officialMissionEffectCatalogue'];
 let state={...Object.fromEntries(keys.filter(k=>k in template.state).map(k=>[k,structuredClone(template.state[k])])),...built.state,
  phase:'start_of_round',stage:'mission_start_of_round',firstPlayerSideKey:'player1',activeSideKey:'player1',phaseFirstActorByRound:{},log:[]},
  attacker=state.pieces.find(p=>p.id==='attacker'),defender=state.pieces.find(p=>p.id==='defender'),x=15+(attacker.models[0].baseWidthInches+defender.models[0].baseWidthInches)/2+1.5;
 for(const p of state.pieces){Object.assign(p,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',leadingModelId:p.models[0].id});
  const [px,py]=p.id==='attacker'?[15,10]:p.id==='defiler'?[x+2,16]:[x,10];
  p.models.forEach((m,i)=>Object.assign(m,{isOnField:true,xInches:px+(i%3)*(m.baseWidthInches+0.05),yInches:py+Math.floor(i/3)*(m.baseDepthInches+0.05),elevation:'ground_level'}));}
 for(const p of [attacker,defender]){const profile=state.officialCombatProfileBundle.profiles.find(r=>r.recordKey===p.officialUnitRecordKey);
  p.damageMarker=p===attacker?profile.hitPoints-1:profile.hitPoints*(p.currentModels-1);Object.assign(p.models[0],{damage:p.damageMarker,remainingWounds:Math.max(0,profile.hitPoints-p.damageMarker)});}
 const tokenBoard=bindWave4TokenBoard(inputs,state);declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'wave4-detonation-target'});
 return{state,sourceDefinitionIds,characteristicRuntimeDefinitionIds:characteristics,roundControl:true,roundDefinitionIds:sourceDefinitionIds,
  runtimeOptions:{includeRanged:true,includeMelee:true,includeHits:true,includePrecisionChoices:true,includeArmourChoices:true,includeTargetReactions:true,
   includeArmourReactions:true,includeReleaseZergTargetReactions:true,
   weaponDefinitionIds:[weapon],includeReleasePhaseControl:true},tokenCoordinate:{xMilliInches:Math.round((x+1)*1000),yMilliInches:13200},
  scenario:{kind:'wave4_detonation_target',declaredPositionsAndNonLethalMarkers:true,tokenBoard,priorTokenPlacementDeclared:false,
   actualMovementTokenPlacementRequired:true,estimatedInfantryGeometry:true,fullMatchAdmission:false}};
}
