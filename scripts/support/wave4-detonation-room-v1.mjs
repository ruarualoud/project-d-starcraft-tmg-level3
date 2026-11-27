import {createWave4StukovUnitScene} from './wave4-stukov-unit-room-v1.mjs';
import {createOfficialReleaseRosterStateV2} from '../../packages/product-composition/official-release-roster-state-v2.mjs';
import {declareWave3EngineeringCoherencyV1} from './wave3-room-boundary-fixture-v1.mjs';
export const DETONATION_IDS=['unit:infested_marine/detonation-any-phase@1','unit:infested_trooper/detonation-any-phase@1'];
export function createWave4DetonationScene(inputs,{unitKey='infested_marine',woundedAttacker=true}={}){
 const template=createWave4StukovUnitScene(inputs,{phase:'assault',preactivateMarine:false});
 const characteristics=['unit:'+unitKey+'/live-for-the-swarm-any-phase@1','unit:'+unitKey+'/plagued-munitions-assault-phase@1'];
 const rifle='unit:goliath/autocannon-assault-phase@1',sourceDefinitionIds=[...DETONATION_IDS,...characteristics,rifle];
 const built=createOfficialReleaseRosterStateV2({context:inputs.context,sourceDefinitionIds,includeBeforeCasualtyBatch:true,
  reactionDefinitionIds:DETONATION_IDS,characteristicDefinitionIds:characteristics,rangedWeaponDefinitionIds:[rifle],
  canonicalResourceTypes:true,includeAbilitySourcePhases:true,includeCharacteristicConsumers:true,includeMelee:true,
  candidatesBySide:{player1:{sideKey:'player1',scaleId:'Standard',mineralBudget:2000,
   factionRecordKey:'tactical_cards:terran_armed_forces',tacticalCardRecordKeys:['tactical_cards:armory'],
   units:[{unitInstanceId:'attacker',recordKey:'army_units:goliath',compositionKind:'small',upgrades:[]}]},
  player2:{sideKey:'player2',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:stukov_s_forces',
   tacticalCardRecordKeys:['tactical_cards:healing_pathogen'],units:[{unitInstanceId:'defender',recordKey:'army_units:'+unitKey,
    compositionKind:'small',upgrades:unitKey==='infested_marine'?[{upgradeName:'Plagued Munitions'}]:[]}]}}});
 const keys=['round','phase','stage','activeSideKey','firstPlayerSideKey','phaseFirstActorByRound','firstPassSideByPhase',
  'engagementScale','armyBuildingEngagementScale','board','officialModelGapTransitPolicy',
  'officialMissionRuntimeDescriptor','officialMissionSupplyProfile','supplyLossLedger'];
 const state={...Object.fromEntries(keys.filter(k=>k in template.state).map(k=>[k,structuredClone(template.state[k])])),...built.state,log:[]};
 const attacker=state.pieces.find(p=>p.id==='attacker'),defender=state.pieces.find(p=>p.id==='defender');
 const x=15+(attacker.models[0].baseWidthInches+defender.models[0].baseWidthInches)/2+1.5;
 for(const piece of state.pieces){Object.assign(piece,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',leadingModelId:piece.models[0].id});
  piece.models.forEach((m,i)=>Object.assign(m,{isOnField:true,xInches:piece.id==='attacker'?15:x+(i%3)*(m.baseWidthInches+0.05),
   yInches:10+Math.floor(i/3)*(m.baseDepthInches+0.05),elevation:'ground_level'}));}
 const actorProfile=state.officialCombatProfileBundle.profiles.find(p=>p.recordKey===attacker.officialUnitRecordKey);
 const defenderProfile=state.officialCombatProfileBundle.profiles.find(p=>p.recordKey===defender.officialUnitRecordKey);
 attacker.damageMarker=woundedAttacker?actorProfile.hitPoints-1:0;
 attacker.models[0].damage=attacker.damageMarker;attacker.models[0].remainingWounds=woundedAttacker?1:actorProfile.hitPoints;
 // A named initial NON-LETHAL marker stresses allocation before destruction.
 defender.damageMarker=defenderProfile.hitPoints*(defender.currentModels-1);
 defender.models[0].damage=defender.damageMarker;defender.models[0].remainingWounds=0;
 declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'wave4-detonation'});
 return{state,sourceDefinitionIds,characteristicRuntimeDefinitionIds:characteristics,
  runtimeOptions:{includeRanged:true,includeMelee:true,includeHits:true,includePrecisionChoices:true,includeArmourChoices:true,weaponDefinitionIds:[rifle]},
  scenario:{kind:'wave4_detonation_ranged_host_only',declaredInitialPositions:true,declaredWoundedAttacker:woundedAttacker,
   declaredInitialNonLethalMarker:defender.damageMarker,estimatedUnitGeometry:true,fullMatchAdmission:false}};
}
