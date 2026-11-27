import {createWave4StukovUnitScene} from './wave4-stukov-unit-room-v1.mjs';
import {createOfficialReleaseRosterStateV2} from '../../packages/product-composition/official-release-roster-state-v2.mjs';
import {declareWave3EngineeringCoherencyV1} from './wave3-room-boundary-fixture-v1.mjs';
import {DETONATION_IDS} from './wave4-detonation-room-v1.mjs';
export const BIO_KILL_SWITCH_ID='unit:stukov/bio-kill-switch-assault-phase@1';
export const STUKOV_COMBAT_IDS=['unit:stukov/corrosive-blast-assault-phase@1','unit:stukov/infested-arm-combat-phase@1',
 'unit:stukov/devastating-charge-assault-phase@1'];
export function createWave4BioKillSwitchScene(inputs,{empty=false,woundedCaster=true,combatWeapons=false,charge=false,phase='assault',targetKey='infested_marine',transfusion=false,farHidden=false}={}){
 const template=createWave4StukovUnitScene(inputs,{phase,preactivateMarine:false});
 const characteristics=[BIO_KILL_SWITCH_ID,'unit:infested_marine/plagued-munitions-assault-phase@1'];
 const reactionIds=[...DETONATION_IDS,...(transfusion?['unit:queen/transfusion-any-phase@1']:[])];
 const sourceDefinitionIds=[...characteristics,...reactionIds,...(combatWeapons?STUKOV_COMBAT_IDS:[])];
 const unit=(id,key,upgrades=[])=>({unitInstanceId:id,recordKey:'army_units:'+key,compositionKind:'small',upgrades});
 const marine=id=>unit(id,'infested_marine',[{upgradeName:'Plagued Munitions'}]);
 const built=createOfficialReleaseRosterStateV2({context:inputs.context,sourceDefinitionIds,
  includeBeforeCasualtyBatch:true,beforeCasualtyPolicyVersion:'1.1.0',reactionDefinitionIds:reactionIds,
  characteristicDefinitionIds:characteristics,includeAbilitySourcePhases:true,includeCharacteristicConsumers:true,canonicalResourceTypes:true,includeMelee:true,
  ...(combatWeapons?{rangedWeaponDefinitionIds:[STUKOV_COMBAT_IDS[0]],meleeWeaponDefinitionIds:[STUKOV_COMBAT_IDS[1]],
    meleeModifierDefinitionIds:[STUKOV_COMBAT_IDS[2]],includeImpactAllocation:charge}:{}),
  candidatesBySide:{player1:{sideKey:'player1',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:stukov_s_forces',
   tacticalCardRecordKeys:['tactical_cards:healing_pathogen'],units:[unit('stukov','stukov'),marine('friendly')]},
   player2:{sideKey:'player2',scaleId:'Standard',mineralBudget:2000,
    factionRecordKey:targetKey==='goliath'?'tactical_cards:terran_armed_forces':'tactical_cards:stukov_s_forces',
    tacticalCardRecordKeys:[targetKey==='goliath'?'tactical_cards:armory':'tactical_cards:healing_pathogen',...(transfusion?['tactical_cards:hatchery']:[])],
    units:targetKey==='goliath'?[unit('infected','goliath')]:[marine('infected'),marine('reserve'),unit('clean','infested_trooper'),
     ...(transfusion?[unit('queen','queen')]:[])]}}});
 const keys=['round','phase','stage','activeSideKey','firstPlayerSideKey','phaseFirstActorByRound','firstPassSideByPhase',
  'engagementScale','armyBuildingEngagementScale','board','officialModelGapTransitPolicy',
  'officialMissionRuntimeDescriptor','officialMissionSupplyProfile','supplyLossLedger'];
 const state={...Object.fromEntries(keys.filter(k=>k in template.state).map(k=>[k,structuredClone(template.state[k])])),...built.state,log:[]};
 const caster=state.pieces.find(p=>p.id==='stukov'),target=state.pieces.find(p=>p.id==='infected');
 const targetX=farHidden?32:12+(caster.models[0].baseWidthInches+target.models[0].baseWidthInches)/2+(phase==='combat'?0.5:1.5);
 for(const piece of state.pieces){
  const reserve=piece.id==='reserve',positions={stukov:[12,10],friendly:[6,10],infected:[targetX,farHidden?22:10],clean:[32,10],reserve:[34,16],queen:[20,15]};
  Object.assign(piece,{isOnField:!reserve,isInReserves:reserve,deploymentStatus:reserve?'reserves':'deployed',leadingModelId:piece.models[0].id});
  const [x,y]=positions[piece.id];piece.models.forEach((m,i)=>Object.assign(m,{isOnField:!reserve,xInches:x+i%3*(m.baseWidthInches+0.05),
   yInches:y+Math.floor(i/3)*(m.baseDepthInches+0.05),elevation:'ground_level'}));
  if(['friendly','reserve'].includes(piece.id)||piece.id==='infected'&&!empty)
   piece.statuses.push({statusName:'INFESTATION',statusKind:'DEBUFF',conditionalInitialStatus:true});
 }
 const profile=p=>state.officialCombatProfileBundle.profiles.find(row=>row.recordKey===p.officialUnitRecordKey);
 if(farHidden)target.statuses.push({statusName:'hidden',statusKind:'status',conditionalInitialStatus:true});
 target.damageMarker=transfusion?0:profile(target).hitPoints*target.currentModels-1;
 caster.damageMarker=woundedCaster?profile(caster).hitPoints-1:0;
 for(const p of [caster,target])Object.assign(p.models[0],{damage:p.damageMarker,remainingWounds:Math.max(0,profile(p).hitPoints-p.damageMarker)});
 declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'wave4-bio-kill-switch'});
 return{state,sourceDefinitionIds,characteristicRuntimeDefinitionIds:characteristics,
  runtimeOptions:{includeRanged:true,includeMelee:true,includeHits:true,includePrecisionChoices:true,includeArmourChoices:true,
   ...(combatWeapons?{weaponDefinitionIds:[STUKOV_COMBAT_IDS[0]]}:{}),
   ...(transfusion?{includeReleaseInheritedHitsReactions:true,includeIndependentSupportReactions:true}:{})},
  scenario:{kind:'wave4_bio_kill_switch_direct_damage',declaredInitialPositions:true,declaredInitialStatusesAndMarkers:true,
   estimatedUnitGeometry:true,fullMatchAdmission:false}};
}
