import {createWave4StukovUnitScene} from './wave4-stukov-unit-room-v1.mjs';
import {createOfficialReleaseRosterStateV2} from '../../packages/product-composition/official-release-roster-state-v2.mjs';
import {declareWave3EngineeringCoherencyV1} from './wave3-room-boundary-fixture-v1.mjs';
import {DETONATION_IDS} from './wave4-detonation-room-v1.mjs';
export function createWave4DetonationHeadShotScene(inputs,{woundedAttacker=true,beforeCasualtyPolicyVersion='1.5.0'}={}){
 const template=createWave4StukovUnitScene(inputs,{phase:'assault',preactivateMarine:false}),characteristics=['unit:infested_marine/live-for-the-swarm-any-phase@1'],
  headshot='unit:nova_stealth_mode/head-shot-assault-phase@1',weapon='unit:nova_stealth_mode/c-20a-canister-rifle-assault-phase@1',
  sourceDefinitionIds=[...DETONATION_IDS,...characteristics,headshot,weapon];
 const unit=(id,key)=>({unitInstanceId:id,recordKey:'army_units:'+key,compositionKind:'small',upgrades:[]});
 const built=createOfficialReleaseRosterStateV2({context:inputs.context,sourceDefinitionIds,includeBeforeCasualtyBatch:true,beforeCasualtyPolicyVersion,
  reactionDefinitionIds:[...DETONATION_IDS,headshot],characteristicDefinitionIds:characteristics,rangedWeaponDefinitionIds:[weapon],
  canonicalResourceTypes:true,includeAbilitySourcePhases:true,includeCharacteristicConsumers:true,includeMelee:true,includeActionPerformedStatusLifecycle:true,
  candidatesBySide:{player1:{sideKey:'player1',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:nova_covert_ops',
    tacticalCardRecordKeys:['tactical_cards:barracks'],units:[unit('attacker','nova_stealth_mode')]},
   player2:{sideKey:'player2',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:stukov_s_forces',
    tacticalCardRecordKeys:['tactical_cards:healing_pathogen'],units:[unit('defender','infested_marine'),unit('survivor','stukov')]}}});
 const keys=['round','phase','stage','activeSideKey','firstPlayerSideKey','phaseFirstActorByRound','firstPassSideByPhase','engagementScale','armyBuildingEngagementScale',
  'board','officialModelGapTransitPolicy','officialMissionRuntimeDescriptor','officialMissionSupplyProfile','supplyLossLedger'];
 const state={...Object.fromEntries(keys.filter(k=>k in template.state).map(k=>[k,structuredClone(template.state[k])])),...built.state,log:[]},
  attacker=state.pieces.find(p=>p.id==='attacker'),defender=state.pieces.find(p=>p.id==='defender'),x=15+(attacker.models[0].baseWidthInches+defender.models[0].baseWidthInches)/2+1.5;
 for(const p of state.pieces){Object.assign(p,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',leadingModelId:p.models[0].id});
  p.models.forEach((m,i)=>Object.assign(m,{isOnField:true,xInches:p.id==='attacker'?15:p.id==='survivor'?36:x+(i%3)*(m.baseWidthInches+0.05),
   yInches:(p.id==='survivor'?20:10)+Math.floor(i/3)*(m.baseDepthInches+0.05),elevation:'ground_level'}));}
 attacker.statuses.push('stationary');
 for(const p of [attacker,defender]){const profile=state.officialCombatProfileBundle.profiles.find(r=>r.recordKey===p.officialUnitRecordKey);
  p.damageMarker=p===attacker?(woundedAttacker?profile.hitPoints-1:0):profile.hitPoints*(p.currentModels-1);
  Object.assign(p.models[0],{damage:p.damageMarker,remainingWounds:Math.max(0,profile.hitPoints-p.damageMarker)});}
 declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'wave4-detonation-headshot'});
 return{state,sourceDefinitionIds,characteristicRuntimeDefinitionIds:characteristics,runtimeOptions:{includeRanged:true,includeMelee:true,includeHits:true,includePrecisionChoices:true,
   includeArmourChoices:true,weaponDefinitionIds:[weapon],includeReleasePhaseControl:true},scenario:{kind:'wave4_detonation_headshot',declaredStationary:true,
   declaredPositionsAndNonLethalMarkers:true,estimatedInfantryGeometry:true,fullMatchAdmission:false}};
}
