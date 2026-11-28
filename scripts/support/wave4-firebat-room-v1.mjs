import {createWave4TurretRoundScene} from './wave4-turret-round-v1.mjs';
import {createOfficialReleaseRosterStateV2} from '../../packages/product-composition/official-release-roster-state-v2.mjs';
import {declareWave3EngineeringCoherencyV1} from './wave3-room-boundary-fixture-v1.mjs';
import {OFFICIAL_FIREBAT_STIMPACK_ID} from '../../packages/source-data/official-firebat-source-v1.mjs';
export function createWave4FirebatScene(inputs,{kind='ranged',stimpack=true,compositionKind='small',upgrades=[]}={}){
  if(!['ranged','melee'].includes(kind))throw Error('FIREBAT_SCENE_KIND_INVALID');
  const template=createWave4TurretRoundScene(inputs),ids=[OFFICIAL_FIREBAT_STIMPACK_ID];
  const unit=(id,key)=>({unitInstanceId:id,recordKey:'army_units:'+key,
    compositionKind:key==='firebat'?compositionKind:'small',upgrades:key==='firebat'?upgrades:[]});
  const built=createOfficialReleaseRosterStateV2({context:inputs.context,sourceDefinitionIds:ids,
    characteristicDefinitionIds:ids,includeAbilitySourcePhases:true,includeCharacteristicConsumers:true,canonicalResourceTypes:true,
    includeMelee:true,candidatesBySide:{player1:{sideKey:'player1',scaleId:'Standard',mineralBudget:2000,
      factionRecordKey:'tactical_cards:terran_armed_forces',tacticalCardRecordKeys:['tactical_cards:armory'],units:[unit('firebat','firebat')]},
      player2:{sideKey:'player2',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:terran_armed_forces',
        tacticalCardRecordKeys:['tactical_cards:armory'],units:[unit('enemy','marine')]}}});
  const keys=['round','firstPassSideByPhase','scores','gameOver','terminal','engagementScale','armyBuildingEngagementScale',
    'board','officialModelGapTransitPolicy','officialMissionRuntimeDescriptor','officialMissionSupplyProfile','supplyLossLedger',
    'officialMissionRuntimeState','officialMissionDeploymentDraftDataBundle','officialMissionEffectCatalogue'];
  const state={...Object.fromEntries(keys.map(k=>[k,structuredClone(template.state[k])])),...built.state,
    phase:'start_of_round',stage:'mission_start_of_round',activeSideKey:'player1',firstPlayerSideKey:'player1',phaseFirstActorByRound:{},log:[]};
  for(const p of state.pieces){
    Object.assign(p,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',leadingModelId:p.models[0].id});
    const x=p.id==='firebat'?12:kind==='melee'?15.5:21;
    p.models.forEach((m,i)=>{const wide=p.id==='firebat'&&p.models.length===6,slot=wide?[1,0,2,3,4,5][i]:i,columns=wide?3:2;
      Object.assign(m,{isOnField:true,elevation:'ground_level',
        xInches:x+(slot%columns)*(m.baseWidthInches+0.05),yInches:12+Math.floor(slot/columns)*(m.baseDepthInches+0.05)});});
  }
  declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'wave4-firebat-'+kind});
  return{state,sourceDefinitionIds:ids,characteristicRuntimeDefinitionIds:ids,roundControl:true,roundDefinitionIds:ids,
    runtimeOptions:{includeRanged:true,includeMelee:true,includePrecisionChoices:true,includeArmourChoices:true,includeReleasePhaseControl:true},
    scenario:{kind:'wave4_firebat_'+kind,stimpack,declaredEngineeringPositions:true,officialFirebatRoundBaseMm:40,
      flamerSubstitutionIncluded:false,fireWallIncluded:false,fullMatchAdmission:false}};
}
