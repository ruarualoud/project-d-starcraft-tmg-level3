import {createWave4StukovUnitScene} from './wave4-stukov-unit-room-v1.mjs';
import {createOfficialReleaseRosterStateV2} from '../../packages/product-composition/official-release-roster-state-v2.mjs';
import {declareWave3EngineeringCoherencyV1} from './wave3-room-boundary-fixture-v1.mjs';
import {bindWave4TokenBoard} from './wave4-token-board-v1.mjs';
import {DETONATION_IDS} from './wave4-detonation-room-v1.mjs';
import {resolveOfficialCurrentSupplyValueV1} from '../../packages/rule-atoms/official-unit-card-supply-rules-kernel-v1.mjs';

export function createWave4DetonationDisengageScene(inputs,{kind='leading',unitKey='infested_trooper',beforeCasualtyPolicyVersion='1.8.0'}={}){
  const template=createWave4StukovUnitScene(inputs,{phase:'movement',preactivateMarine:false}),
    characteristics=['unit:'+unitKey+'/live-for-the-swarm-any-phase@1'],sourceDefinitionIds=[...DETONATION_IDS,...characteristics],
    unit=(id,key)=>({unitInstanceId:id,recordKey:'army_units:'+key,compositionKind:'small',upgrades:[]}),
    built=createOfficialReleaseRosterStateV2({context:inputs.context,sourceDefinitionIds,includeBeforeCasualtyBatch:true,beforeCasualtyPolicyVersion,
      reactionDefinitionIds:DETONATION_IDS,characteristicDefinitionIds:characteristics,
      includeArmourOrdinals:true,armourRollOrdinalPolicyVersion:'1.1.0',includeMelee:true,includeAbilitySourcePhases:true,
      includeCharacteristicConsumers:true,canonicalResourceTypes:true,
      candidatesBySide:{player1:{sideKey:'player1',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:stukov_s_forces',
        tacticalCardRecordKeys:['tactical_cards:healing_pathogen'],units:[unit('actor',unitKey),unit('p1-anchor','stukov')]},
      player2:{sideKey:'player2',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:daelaam',
        tacticalCardRecordKeys:['tactical_cards:gateway'],units:[unit('enemy-a','zealot'),unit('enemy-b','zealot'),unit('anchor','high_templar')]}}});
  const keys=['round','firstPassSideByPhase','scores','gameOver','terminal','engagementScale','armyBuildingEngagementScale',
    'board','officialModelGapTransitPolicy','officialMissionRuntimeDescriptor','officialMissionSupplyProfile','supplyLossLedger',
    'officialMissionRuntimeState','officialMissionDeploymentDraftDataBundle','officialMissionEffectCatalogue'];
  const state={...Object.fromEntries(keys.map(k=>[k,structuredClone(template.state[k])])),...built.state,
    phase:'start_of_round',stage:'mission_start_of_round',activeSideKey:'player1',firstPlayerSideKey:'player1',phaseFirstActorByRound:{},log:[]};
  const positions=kind==='last'?{actor:[[0.64,0.64]],'enemy-a':[[3.4,3.4],[2.2,2.2],[5.8,1.8]],'enemy-b':[[3.6,5.8],[1.8,5.8],[5.6,3.8]]}:kind==='leading'?{
    actor:[[0.64,0.64],[1.95,0.64],[0.64,1.95]],
    'enemy-a':[[3.8,2.4],[2.2,2.2],[3.8,0.8]],
    'enemy-b':[[2.4,3.8],[0.8,3.8],[4,4]]
  }:{actor:[[7,7],[7,8.28],[8.28,7]],
    'enemy-a':[60,0,120].map(d=>[7+2.7*Math.cos(d*Math.PI/180),7+2.7*Math.sin(d*Math.PI/180)]),
    'enemy-b':[240,180,300].map(d=>[7+2.7*Math.cos(d*Math.PI/180),7+2.7*Math.sin(d*Math.PI/180)])};
  for(const p of state.pieces){
    const profile=state.officialCombatProfileBundle.profiles.find(r=>r.recordKey===p.officialUnitRecordKey);
    Object.assign(p,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',leadingModelId:p.models[0].id});
    p.models.forEach((m,i)=>{
      const pos=p.id==='p1-anchor'?[40,26]:p.id==='anchor'?[40+(i===2?0.5:i)*1.65,20+(i===2?1.43:0)]:positions[p.id][i];Object.assign(m,{isOnField:Boolean(pos),isDestroyed:!pos,elevation:'ground_level',
        xInches:pos?.[0]||0,yInches:pos?.[1]||0,damage:pos?0:profile.hitPoints,remainingWounds:pos?profile.hitPoints:0});
    });
    p.currentModels=p.models.filter(m=>!m.isDestroyed).length;
    p.destroyedModelIds=p.models.filter(m=>m.isDestroyed).map(m=>m.id).sort();
    p.currentSupply=resolveOfficialCurrentSupplyValueV1({unitCardSupplyDataBundle:state.officialUnitCardSupplyDataBundle,
      recordKey:p.officialUnitRecordKey,sourceRecordHash:p.sourceRecordHash,payloadHash:p.officialPayloadHash,
      currentModels:p.currentModels,isDestroyed:false,rulesOwnedCurrentModelCountRequested:true}).currentSupplyValue;
    p.xInches=p.models[0].xInches;p.yInches=p.models[0].yInches;
    if(!['actor','anchor','p1-anchor'].includes(p.id)){
      p.statuses=p.statuses.filter(s=>String(typeof s==='string'?s:s.statusName||s.name).toLowerCase()!=='shielded');
      p.damageMarker=profile.hitPoints*p.currentModels-1;Object.assign(p.models[0],{damage:p.damageMarker,remainingWounds:1});
    }
  }
  const tokenBoard=bindWave4TokenBoard(inputs,state);
  declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'wave4-disengage-'+kind});
  const actor=state.pieces.find(p=>p.id==='actor');
  const disengageParameters=kind!=='other'?{leadingModelId:actor.models[0].id,leadingOutcome:'casualty',path:[],placements:[]}
    :{leadingModelId:actor.models[0].id,leadingOutcome:'placed',path:[{xMilliInches:7010,yMilliInches:7000,elevation:'ground_level',supportTerrainIds:[]}],
      placements:actor.models.filter(m=>!m.isDestroyed&&m.id!==actor.models[0].id).map(m=>({modelId:m.id,outcome:'casualty'}))};
  return{state,sourceDefinitionIds,characteristicRuntimeDefinitionIds:characteristics,roundControl:true,roundDefinitionIds:sourceDefinitionIds,
    runtimeOptions:{includeRanged:true,includeMelee:true,includeHits:true,includePrecisionChoices:true,includeArmourChoices:true,
      includeArmourOrdinals:true,includeReleasePhaseControl:true},disengageParameters,
    scenario:{kind:'wave4_detonation_disengage_'+kind,tokenBoard,declaredEngineeringPositions:true,
      declaredPriorMarineAttrition:unitKey==='infested_marine',...(kind==='last'?{declaredPriorTrooperAttrition:unitKey==='infested_trooper'}:{}),declaredEnemyInitialDamageAndDepletedShields:true,
      estimatedInfantryGeometry:true,fullMatchAdmission:false}};
}
