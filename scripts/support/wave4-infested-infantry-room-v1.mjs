import {createWave4StukovUnitScene} from './wave4-stukov-unit-room-v1.mjs';
import {createOfficialReleaseRosterStateV2} from '../../packages/product-composition/official-release-roster-state-v2.mjs';
import {createOfficialSpecialUnitPieceV1} from '../../packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs';
import {declareWave3EngineeringCoherencyV1} from './wave3-room-boundary-fixture-v1.mjs';
import {createOfficialRoundSupplyStateV1} from '../../packages/rule-atoms/official-round-supply-state-v1.mjs';
export const INFANTRY_LIVE_IDS=['infested_marine','infested_trooper'].map(u=>'unit:'+u+'/live-for-the-swarm-any-phase@1');
export const INFANTRY_BURROW_IDS=['infested_marine','infested_trooper'].map(u=>'unit:'+u+'/burrow-ambush-movement-phase@1');
export const INFANTRY_CHARGE_IDS=['infested_marine','infested_trooper'].map(u=>'unit:'+u+'/devastating-charge-assault-phase@1');
export const INFANTRY_RANGED_IDS=['unit:infested_marine/infested-c-14-rifle-assault-phase@1',
 'unit:infested_marine/infested-missile-launcher-acid-blast-assault-phase@1',
 'unit:infested_marine/infested-missile-launcher-scourgeshot-assault-phase@1','unit:infested_trooper/infested-c-14-rifle-assault-phase@1'];
export const INFANTRY_MELEE_IDS=['unit:infested_marine/wild-mutation-combat-phase@1',
 'unit:infested_marine/strike-combat-phase@1','unit:infested_trooper/bayonet-combat-phase@1'];
export const INFANTRY_BASE_IDS=[...INFANTRY_LIVE_IDS,...INFANTRY_BURROW_IDS,...INFANTRY_CHARGE_IDS,...INFANTRY_RANGED_IDS,...INFANTRY_MELEE_IDS];
const creep='unit:infested_missile_turret/source-of-creep-any-phase@1';
const structure='unit:infested_missile_turret/structure-any-phase@1';
export function createWave4InfestedInfantryScene(inputs,{unitKey='infested_marine',infected=false,creepSource=false,
 phase='assault',reserve=false,purchaseBurrow=true,upgrades=[],munitions=false,purchaseMunitions=true,medic=false,charge=false}={}){
 const template=createWave4StukovUnitScene(inputs,{phase,preactivateMarine:false});
 const munitionsIds=munitions?['unit:'+unitKey+'/plagued-munitions-assault-phase@1']:[];
 const lifeSupport='unit:medic/life-support-any-phase@1';
 const sourceDefinitionIds=[...INFANTRY_BASE_IDS,...munitionsIds,...(medic?[lifeSupport]:[]),...(creepSource?[creep,structure]:[])];
 const ownIds=ids=>ids.filter(id=>id.startsWith('unit:'+unitKey+'/'));
 const rangedIds=ownIds(INFANTRY_RANGED_IDS).filter(id=>id.includes('/infested-c-14-rifle-')
  ||upgrades.some(u=>id.includes(u.upgradeName==='Infested Missile Launcher - Acid Blast'?'/infested-missile-launcher-acid-blast-':
   u.upgradeName==='Infested Missile Launcher - Scourgeshot'?'/infested-missile-launcher-scourgeshot-':'/not-selected/')));
 const meleeIds=ownIds(INFANTRY_MELEE_IDS).filter(id=>!id.includes('/wild-mutation-')||upgrades.some(u=>u.upgradeName==='Wild Mutation'));
 const actorUpgrades=[...(unitKey==='infested_marine'&&reserve&&purchaseBurrow?[{upgradeName:'Burrow Ambush'}]:[]),
  ...(unitKey==='infested_marine'&&munitions&&purchaseMunitions?[{upgradeName:'Plagued Munitions'}]:[]),...upgrades];
 const built=createOfficialReleaseRosterStateV2({context:inputs.context,sourceDefinitionIds,
  characteristicDefinitionIds:[...INFANTRY_LIVE_IDS,...munitionsIds],relocationDefinitionIds:INFANTRY_BURROW_IDS,
  ...(medic?{reactionDefinitionIds:[lifeSupport]}:{}),
  meleeModifierDefinitionIds:ownIds(INFANTRY_CHARGE_IDS),rangedWeaponDefinitionIds:rangedIds,
  meleeWeaponDefinitionIds:meleeIds,
  ...(creepSource?{structureDefinitionIds:[structure],battlefieldModifierDefinitionIds:[creep]}:{}),
  includeMelee:true,includeImpactAllocation:charge,includeCharacteristicConsumers:true,includeAbilitySourcePhases:true,canonicalResourceTypes:true,
  candidatesBySide:{player1:{sideKey:'player1',scaleId:'Standard',mineralBudget:2000,
   factionRecordKey:'tactical_cards:stukov_s_forces',tacticalCardRecordKeys:['tactical_cards:healing_pathogen'],
   units:[{unitInstanceId:'actor',recordKey:'army_units:'+unitKey,compositionKind:'small',upgrades:actorUpgrades}]},
  player2:{sideKey:'player2',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:terran_armed_forces',
   tacticalCardRecordKeys:['tactical_cards:armory'],units:[{unitInstanceId:'enemy',recordKey:'army_units:marine',compositionKind:'large',upgrades:[]},
    ...(medic?[{unitInstanceId:'medic',recordKey:'army_units:medic',compositionKind:'small',upgrades:[]}]:[])]}}});
 const keys=['round','phase','stage','activeSideKey','firstPlayerSideKey','phaseFirstActorByRound','firstPassSideByPhase',
  'scores','gameOver','terminal','engagementScale','armyBuildingEngagementScale','board','officialModelGapTransitPolicy',
  'officialMissionRuntimeDescriptor','officialMissionDeploymentDraftDataBundle','officialMissionEffectCatalogue',
  'officialMissionSupplyProfile','officialMissionRuntimeState','supplyLossLedger','officialFactionArmyEligibilityDataBundle'];
 const state={...Object.fromEntries(keys.filter(k=>k in template.state).map(k=>[k,structuredClone(template.state[k])])),...built.state,log:[]};
 state.officialDeploymentGeometryBinding=structuredClone(inputs.seed.state.officialDeploymentGeometryBinding);
 if(reserve){
  for(const k of ['officialDeploymentGeometryDataBundle','officialMissionDeploymentDraft','officialMissionDeploymentDraftBinding',
   'selectedDeployment','selectedMission'])if(inputs.seed.state[k]!==undefined)state[k]=structuredClone(inputs.seed.state[k]);
 }
 for(const piece of state.pieces){
  Object.assign(piece,{isOnField:!(reserve&&piece.id==='actor'),isInReserves:reserve&&piece.id==='actor',
   deploymentStatus:reserve&&piece.id==='actor'?'reserves':'deployed',leadingModelId:piece.models[0].id});
  piece.models.forEach((m,i)=>{const slot=piece.models.length===9?[4,0,1,2,3,5,6,7,8][i]:i;
   Object.assign(m,{isOnField:piece.isOnField,elevation:'ground_level',
   xInches:(piece.id==='actor'?(phase==='combat'?19.2:charge?17:12):21)+(piece.id==='actor'&&(phase==='combat'||charge)?-1:1)*(slot%3)*(m.baseWidthInches+0.05),
   yInches:(piece.id==='medic'?15:10)+Math.floor(slot/3)*(m.baseDepthInches+0.05)});});
 }
 if(infected)state.pieces.find(p=>p.id==='enemy').statuses.push({statusName:'INFESTATION',statusKind:'DEBUFF',conditionalInitialStatus:true});
 if(creepSource){const turret=createOfficialSpecialUnitPieceV1(state,'player2','army_units:infested_missile_turret','creep-source');
  Object.assign(turret,{isOnField:true,isInReserves:false,deploymentStatus:'deployed'});
  Object.assign(turret.models[0],{isOnField:true,xInches:25,yInches:16,elevation:'ground_level'});state.pieces.push(turret);}
 declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'wave4-infested-infantry'});
 if(reserve)state.officialRoundSupplyState=createOfficialRoundSupplyStateV1({state,missionSupplyProfile:state.officialMissionSupplyProfile,
  rulesRuntimeHash:state.officialMissionRuntimeDescriptor.runtimeHash});
 return{state,sourceDefinitionIds,characteristicRuntimeDefinitionIds:[...INFANTRY_LIVE_IDS,...munitionsIds],
  runtimeOptions:{includeRanged:true,includeMelee:true,includePrecisionChoices:true,includeArmourChoices:true,
   includeMixedRosterReactions:medic,
   weaponDefinitionIds:rangedIds,meleeWeaponDefinitionIds:meleeIds,meleeModifierDefinitionIds:ownIds(INFANTRY_CHARGE_IDS)},
  scenario:{kind:'wave4_infested_infantry',declaredInitialPositions:true,conditionalInitialInfestation:infected,
   conditionalInitialCreepSource:creepSource,engineeringEstimatedUnitGeometry:true,fullMatchAdmission:false}};
}
