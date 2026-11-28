import {createWave4TurretRoundScene} from './wave4-turret-round-v1.mjs';
import {createOfficialReleaseRosterStateV2} from '../../packages/product-composition/official-release-roster-state-v2.mjs';
import {declareWave3EngineeringCoherencyV1} from './wave3-room-boundary-fixture-v1.mjs';
import {TAL_DARIM_THRESHOLD_IDS} from './wave4-tal-darim-threshold-room-v1.mjs';
import {getOfficialReleaseBattlefieldAssetComponentProfileV2} from '../../packages/source-data/official-battlefield-asset-component-profile-v1.mjs';
import {applyOfficialSelectedRosterResolvedDamageV1} from '../../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import {resolveOfficialEffectiveCombatProfileV1} from '../../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
export const WAVE4_ADDED_ACTIVE_CARD_SCENES={
  heal:{definitionId:'card:robotics_support_bay/master-of-robotics-any@1',card:'robotics_support_bay',faction:'daelaam',unit:'stalker',family:'characteristic'},
  reactor:{definitionId:'card:barracks__reactor_/go-go-go-any@1',card:'barracks__reactor_',faction:'terran_armed_forces',unit:'marine',family:'relocation'},
  swarm:{definitionId:'card:infested_barracks/for-the-swarm-any@1',card:'infested_barracks',faction:'zerg_swarm',unit:'zergling',family:'relocation'},
  creep:{definitionId:'card:hive/creep-spread-any@1',card:'hive',faction:'zerg_swarm',unit:'zergling',family:'battlefield'},
  scanner:{definitionId:'card:infested_command_center/scanner-sweep-any@1',card:'infested_command_center',faction:'stukov_s_forces',unit:'hydralisk',family:'battlefield'},
};
export const NERAZIM_MIGHT_ID='card:nerazim/might-of-the-nerazim-any@1';
export function createWave4AddedCardScene(inputs,{kind='heal',actorUnit,indicatorDetection=false,nerazimReaction=false,sceneSpec,enemyUnit,extraReactionIds=[],extraCharacteristicIds=[],companionRelocation,hiddenConsumers=false}={}){
  const spec=sceneSpec||WAVE4_ADDED_ACTIVE_CARD_SCENES[kind];if(!spec)throw Error('ADDED_CARD_SCENE_KIND_INVALID');
  const template=createWave4TurretRoundScene(inputs),ids=[...TAL_DARIM_THRESHOLD_IDS,spec.definitionId,...(nerazimReaction?[NERAZIM_MIGHT_ID]:[]),...extraReactionIds,...extraCharacteristicIds,...(companionRelocation?[companionRelocation.definitionId]:[])],
    characteristicIds=[...TAL_DARIM_THRESHOLD_IDS,...(spec.family==='characteristic'?[spec.definitionId]:[]),...extraCharacteristicIds],
    unit=(id,key)=>({unitInstanceId:id,recordKey:'army_units:'+key,compositionKind:'small',upgrades:[]}),
    built=createOfficialReleaseRosterStateV2({context:inputs.context,sourceDefinitionIds:ids,characteristicDefinitionIds:characteristicIds,
      includeTalDarimThresholds:true,includeCharacteristicConsumers:true,includeAbilitySourcePhases:true,canonicalResourceTypes:true,includeMelee:true,
      includeHiddenRangedAndEvade:kind==='scanner'||hiddenConsumers,
      includeIndicatorDetectionHiddenLoss:kind==='scanner'&&indicatorDetection,
      ...((nerazimReaction||spec.family==='reaction'||extraReactionIds.length)?{reactionDefinitionIds:[...(nerazimReaction?[NERAZIM_MIGHT_ID]:[]),...(spec.family==='reaction'?[spec.definitionId]:[]),...extraReactionIds]}:{}),
      ...((spec.family==='relocation'||companionRelocation)?{relocationDefinitionIds:[...(spec.family==='relocation'?[spec.definitionId]:[]),...(companionRelocation?[companionRelocation.definitionId]:[])]}:{}),
      ...(spec.family==='battlefield'?{battlefieldModifierDefinitionIds:[spec.definitionId]}:{}),
      candidatesBySide:{player1:{sideKey:'player1',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:'+spec.faction,
        tacticalCardRecordKeys:['tactical_cards:'+spec.card,...(companionRelocation?['tactical_cards:'+companionRelocation.card]:[]),
          ...(spec.faction==='zerg_swarm'?['tactical_cards:accelerating_creep']:[]),
          ...(spec.faction==='stukov_s_forces'?['tactical_cards:healing_pathogen']:[])],units:[unit('actor',actorUnit||spec.unit)]},
        player2:{sideKey:'player2',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:'+(nerazimReaction?'nerazim':'terran_armed_forces'),
          tacticalCardRecordKeys:nerazimReaction?[]:['tactical_cards:armory'],units:[unit('enemy',enemyUnit||(nerazimReaction?'stalker':'goliath'))]}}}),
    keys=['round','firstPassSideByPhase','scores','gameOver','terminal','engagementScale','armyBuildingEngagementScale',
      'board','officialModelGapTransitPolicy','officialMissionRuntimeDescriptor','officialMissionSupplyProfile','supplyLossLedger',
      'officialMissionRuntimeState','officialMissionDeploymentDraftDataBundle','officialMissionEffectCatalogue'],
    state={...Object.fromEntries(keys.map(k=>[k,structuredClone(template.state[k])])),...built.state,phase:'start_of_round',stage:'mission_start_of_round',
      activeSideKey:'player1',firstPlayerSideKey:'player1',phaseFirstActorByRound:{},log:[]};
  state.officialBattlefieldAssetComponentProfile=getOfficialReleaseBattlefieldAssetComponentProfileV2(inputs.context);
  for(const key of ['officialBattlefieldTokenMarkerRulesDataBundle','officialBattlefieldTokenMarkerRegistry','officialDeploymentGeometryBinding'])
    state[key]=structuredClone(inputs.seed.state[key]);
  for(const p of state.pieces){
    Object.assign(p,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',leadingModelId:p.models[0].id});
    p.models.forEach((m,i)=>{const columns=p.models.length===12?4:3,
      slot=p.models.length===12?[5,0,1,2,3,4,6,7,8,9,10,11][i]:p.models.length===9?[4,0,1,2,3,5,6,7,8][i]:i;
      const x=p.models.length===3&&i===2?0.5:slot%columns,y=p.models.length===3&&i===2?Math.sqrt(3)/2:Math.floor(slot/columns);
      Object.assign(m,{isOnField:true,elevation:'ground_level',xInches:(p.id==='actor'?12:21)+x*(m.baseWidthInches+0.05),
        yInches:12+y*(m.baseDepthInches+0.05)});});
  }
  const actor=state.pieces.find(p=>p.id==='actor'),enemy=state.pieces.find(p=>p.id==='enemy');
  if(kind==='heal')applyOfficialSelectedRosterResolvedDamageV1(state,actor,resolveOfficialEffectiveCombatProfileV1(state,actor),{
    casualtyModelIds:[],remainingModelIds:actor.models.map(m=>m.id),targetDestroyed:false,postDamageMarker:2,shieldedBefore:true,shieldedAfter:false});
  if(kind==='scanner')enemy.statuses.push({statusName:'hidden',source:'declared_prior_status',expiresAt:'cleanup_and_refresh'});
  const edge=state.officialDeploymentGeometryBinding.entryEdgesByPlayer.player1.segments[0].side,
    horizontal=edge==='top'||edge==='bottom',coordinate=kind==='scanner'?{xMilliInches:indicatorDetection?15000:21000,yMilliInches:12000}
      :{xMilliInches:horizontal?27000:edge==='left'?2000:52000,yMilliInches:horizontal?(edge==='bottom'?2000:34000):18000};
  declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'wave4-added-card-'+kind});
  return{state,kind,coordinate,indicatorDetection,nerazimReaction,definitionId:spec.definitionId,sourceDefinitionIds:ids,characteristicRuntimeDefinitionIds:characteristicIds,
    roundControl:true,roundDefinitionIds:ids,runtimeOptions:{includeRanged:true,includeMelee:true,includePrecisionChoices:true,
      includeArmourChoices:true,includeReleasePhaseControl:true},
    scenario:{kind:'wave4_added_card_'+kind,declaredEngineeringPositions:true,declaredPriorDamage:kind==='heal',declaredPriorHidden:kind==='scanner',
      borrowedGlobalThresholdSourcesWithoutOwningCard:true,fullMatchAdmission:false}};
}
