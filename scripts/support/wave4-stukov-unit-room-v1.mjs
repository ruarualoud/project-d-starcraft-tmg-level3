import {createWave4TurretRoundScene} from './wave4-turret-round-v1.mjs';
import {createOfficialReleaseRosterStateV2} from '../../packages/product-composition/official-release-roster-state-v2.mjs';
import {declareWave3EngineeringCoherencyV1} from './wave3-room-boundary-fixture-v1.mjs';
export const STUKOV_INFESTATION_IDS=['unit:stukov/commander-any-phase@1','unit:stukov/plague-warden-any-phase@1',
 'unit:stukov/spread-infestation-movement-phase@1','unit:stukov/admiral-of-the-infested-movement-phase@1',
 'unit:infested_trooper/spread-infestation-any-phase@1'];
const restoration='unit:medic/restoration-any-phase@1';
export function createWave4StukovUnitScene(inputs,{phase='movement',preactivateMarine=true}={}){
 const template=createWave4TurretRoundScene(inputs);
 const unit=(id,key,compositionKind='small')=>({unitInstanceId:id,recordKey:'army_units:'+key,compositionKind,upgrades:[]});
 const sourceDefinitionIds=[...STUKOV_INFESTATION_IDS,restoration];
 const built=createOfficialReleaseRosterStateV2({context:inputs.context,sourceDefinitionIds,
  characteristicDefinitionIds:STUKOV_INFESTATION_IDS,reactionDefinitionIds:[restoration],includeAbilitySourcePhases:true,
  canonicalResourceTypes:true,includeMelee:true,candidatesBySide:{
   player1:{sideKey:'player1',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:stukov_s_forces',
    tacticalCardRecordKeys:['tactical_cards:healing_pathogen','tactical_cards:hatchery'],
    units:[unit('stukov','stukov'),unit('trooper','infested_trooper'),unit('marine','infested_marine')]},
   player2:{sideKey:'player2',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:terran_armed_forces',
    tacticalCardRecordKeys:['tactical_cards:armory'],units:[unit('enemy','marine','large'),unit('medic','medic')]}}});
 const keys=['round','firstPlayerSideKey','firstPassSideByPhase','scores','gameOver','terminal','engagementScale',
  'armyBuildingEngagementScale','board','officialModelGapTransitPolicy','officialMissionRuntimeDescriptor',
  'officialMissionDeploymentDraftDataBundle','officialMissionEffectCatalogue','officialMissionSupplyProfile',
  'officialMissionRuntimeState','supplyLossLedger','officialFactionArmyEligibilityDataBundle'];
 const state={...Object.fromEntries(keys.map(k=>[k,structuredClone(template.state[k])])),...built.state,
  phase,stage:'activation_phases',activeSideKey:'player1',phaseFirstActorByRound:{['1:'+phase]:{round:1,phase,
   markerHolderSideKey:'player1',chosenFirstActorSideKey:'player1'}},log:[]};
 const marker=state.board.missionMarkers.find(m=>m.number===1)||state.board.missionMarkers[0];
 const x=marker.xInches,y=marker.yInches;
 const locations={stukov:[x+6,y+1],trooper:[x+6,y+6],marine:[x-2,y-2],enemy:[x,y+1],medic:[x+1,y+5.5]};
 for(const piece of state.pieces){
  Object.assign(piece,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',leadingModelId:piece.models[0].id});
  const [px,py]=locations[piece.id],triangle=piece.models.length===3,sign=piece.id==='marine'?-1:1;
  piece.models.forEach((m,i)=>{const slot=piece.models.length===9?[4,0,1,2,3,5,6,7,8][i]:i;
   Object.assign(m,{isOnField:true,elevation:'ground_level',
    xInches:px+sign*(triangle?(i===2?(m.baseWidthInches+0.05)/2:i*(m.baseWidthInches+0.05)):(slot%3)*(m.baseWidthInches+0.05)),
    yInches:py+(triangle&&i===2?(m.baseDepthInches+0.05)*Math.sqrt(3)/2:triangle?0:Math.floor(slot/3)*(m.baseDepthInches+0.05))});});
 }
 if(preactivateMarine)state.pieces.find(p=>p.id==='marine').activatedPhases={movement:true};
 declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'wave4-stukov-units'});
 return{state,sourceDefinitionIds,characteristicRuntimeDefinitionIds:STUKOV_INFESTATION_IDS,roundControl:true,roundDefinitionIds:sourceDefinitionIds,
  runtimeOptions:{includeRanged:true,includeMelee:true,includeReleasePhaseControl:true,includeIndependentSupportReactions:true,
   includeReleaseOpticalFlareRestoration:true},scenario:{kind:'wave4_stukov_units_infestation',declaredInitialPositions:true,
    engineeringEstimatedUnitBases:inputs.estimates.map(e=>({recordKey:e.recordKey,diameterMillimetres:e.diameterMillimetres,estimateHash:e.estimateHash})),
    conditionalInitialMarineActivation:preactivateMarine,fullMatchAdmission:false},markerId:marker.id};
}
