import {createWave4StukovUnitScene} from './wave4-stukov-unit-room-v1.mjs';
import {createOfficialReleaseRosterStateV2} from '../../packages/product-composition/official-release-roster-state-v2.mjs';
import {declareWave3EngineeringCoherencyV1} from './wave3-room-boundary-fixture-v1.mjs';
import {DETONATION_IDS} from './wave4-detonation-room-v1.mjs';
export function createWave4NestedDetonationScene(inputs,{unitKey='infested_marine',woundedActor=true,allyKind=null}={}){
 const template=createWave4StukovUnitScene(inputs,{phase:'combat',preactivateMarine:false});
 const characteristics=['unit:'+unitKey+'/live-for-the-swarm-any-phase@1','unit:'+unitKey+'/plagued-munitions-assault-phase@1'];
 const weapon='unit:'+unitKey+'/'+(unitKey==='infested_marine'?'strike':'bayonet')+'-combat-phase@1';
 const sourceDefinitionIds=[...DETONATION_IDS,...characteristics,weapon];
 const candidatesBySide=Object.fromEntries(['player1','player2'].map((sideKey,index)=>[sideKey,{sideKey,scaleId:'Standard',mineralBudget:2000,
  factionRecordKey:'tactical_cards:stukov_s_forces',tacticalCardRecordKeys:['tactical_cards:healing_pathogen',...(!index&&allyKind==='allocation-only'?['tactical_cards:hatchery']:[])],
  units:[{unitInstanceId:index?'defender':'attacker',recordKey:'army_units:'+unitKey,compositionKind:'small',
   upgrades:unitKey==='infested_marine'?[{upgradeName:'Plagued Munitions'}]:[]},
   ...(!index&&allyKind?[{unitInstanceId:'ally',recordKey:'army_units:'+(allyKind==='allocation-only'?'queen':unitKey),compositionKind:'small',
    upgrades:allyKind!=='allocation-only'&&unitKey==='infested_marine'?[{upgradeName:'Plagued Munitions'}]:[]}]:[])]}]));
 const built=createOfficialReleaseRosterStateV2({context:inputs.context,sourceDefinitionIds,candidatesBySide,
  includeBeforeCasualtyBatch:true,beforeCasualtyPolicyVersion:'1.1.0',reactionDefinitionIds:DETONATION_IDS,
  characteristicDefinitionIds:characteristics,meleeWeaponDefinitionIds:[weapon],canonicalResourceTypes:true,
  includeAbilitySourcePhases:true,includeCharacteristicConsumers:true,includeMelee:true});
 const keys=['round','phase','stage','activeSideKey','firstPlayerSideKey','phaseFirstActorByRound','firstPassSideByPhase',
  'engagementScale','armyBuildingEngagementScale','board','officialModelGapTransitPolicy',
  'officialMissionRuntimeDescriptor','officialMissionSupplyProfile','supplyLossLedger'];
 const state={...Object.fromEntries(keys.filter(k=>k in template.state).map(k=>[k,structuredClone(template.state[k])])),...built.state,log:[]};
 for(const piece of state.pieces){Object.assign(piece,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',leadingModelId:piece.models[0].id});
  const sign=piece.id==='attacker'?-1:1,profile=state.officialCombatProfileBundle.profiles.find(p=>p.recordKey===piece.officialUnitRecordKey);
  piece.models.forEach((m,i)=>Object.assign(m,{isOnField:true,xInches:(sign===-1?19.2:21)+sign*(i%3)*(m.baseWidthInches+0.05),
   yInches:(piece.id==='ally'?14.5:10)+Math.floor(i/3)*(m.baseDepthInches+0.05),elevation:'ground_level'}));
  piece.damageMarker=piece.id==='attacker'&&!woundedActor||piece.id==='ally'&&allyKind==='allocation-only'?0:profile.hitPoints*piece.currentModels-1;
  Object.assign(piece.models[0],{damage:piece.damageMarker,remainingWounds:Math.max(0,profile.hitPoints-piece.damageMarker)});
  piece.statuses.push({statusName:'INFESTATION',statusKind:'DEBUFF',conditionalInitialStatus:true});
 }
 declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'wave4-nested-detonation'});
 return{state,sourceDefinitionIds,characteristicRuntimeDefinitionIds:characteristics,
  runtimeOptions:{includeRanged:true,includeMelee:true,includeHits:true,includePrecisionChoices:true,includeArmourChoices:true},
  scenario:{kind:'wave4_detonation_melee_hits_nested',declaredInitialPositions:true,declaredInitialNonLethalMarkers:true,
   estimatedUnitGeometry:true,fullMatchAdmission:false}};
}
