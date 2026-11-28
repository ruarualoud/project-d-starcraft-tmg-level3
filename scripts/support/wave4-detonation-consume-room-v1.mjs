import fs from 'node:fs/promises';
import path from 'node:path';
import {hashStarcraftTmgContract as hash} from '../../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createWave4StukovUnitScene} from './wave4-stukov-unit-room-v1.mjs';
import {createOfficialReleaseRosterStateV2} from '../../packages/product-composition/official-release-roster-state-v2.mjs';
import {declareWave3EngineeringCoherencyV1} from './wave3-room-boundary-fixture-v1.mjs';
import {bindWave4TokenBoard} from './wave4-token-board-v1.mjs';
import {DETONATION_IDS} from './wave4-detonation-room-v1.mjs';
import {applyOfficialSelectedRosterResolvedDamageV1} from '../../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import {resolveOfficialEffectiveCombatProfileV1} from '../../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';

export const CONSUME_IDS=['unit:defiler/consume-any-phase@1','unit:defiler/plague-assault-phase@1','unit:defiler/dark-swarm-assault-phase@1'];
export async function createWave4DetonationConsumeScene(inputs,{root,unitKey='infested_marine',cost=2,kind='plague',variant=0}={}){
  if(!Number.isSafeInteger(variant)||variant<0||variant>16)throw Error('CONSUME_SCENE_VARIANT_INVALID');
  const template=createWave4StukovUnitScene(inputs,{phase:'movement',preactivateMarine:false});
  const characteristics=['unit:infested_marine/live-for-the-swarm-any-phase@1','unit:infested_trooper/live-for-the-swarm-any-phase@1'];
  const dark=kind==='dark_swarm',sourceDefinitionIds=[...DETONATION_IDS,...CONSUME_IDS,...characteristics,
    ...(dark?['unit:defiler/gestate-dark-swarm-movement-phase@1']:[])];
  const {assetHash,...oldAsset}=JSON.parse(await fs.readFile(path.join(root,'content/source-releases/wave3-20261113-blast-template-v1.json'),'utf8'));
  const body={...oldAsset,sourceSnapshotHash:inputs.dataset.sourceSnapshotHash,normalizedDatasetHash:inputs.dataset.datasetHash};
  const asset={...body,assetHash:hash(body)},enemyKey=unitKey==='infested_marine'?'infested_trooper':'infested_marine';
  const unit=(id,key,upgrades=[])=>({unitInstanceId:id,recordKey:'army_units:'+key,compositionKind:'small',upgrades});
  const built=createOfficialReleaseRosterStateV2({context:inputs.context,sourceDefinitionIds,
    includeBeforeCasualtyBatch:true,beforeCasualtyPolicyVersion:'1.9.0',reactionDefinitionIds:[...DETONATION_IDS,...(dark?['unit:defiler/dark-swarm-assault-phase@1']:[])],
    characteristicDefinitionIds:characteristics,includePlague:true,includeGestateDarkSwarm:dark,includeDarkSwarmLifecycle:dark,
    includeBattlefieldDisplacement:dark,blastTemplateGeometryAsset:asset,
    includeMelee:true,includeArmourOrdinals:true,armourRollOrdinalPolicyVersion:'1.1.0',
    includeAbilitySourcePhases:true,includeCharacteristicConsumers:true,canonicalResourceTypes:true,
    candidatesBySide:{player1:{sideKey:'player1',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:stukov_s_forces',
      tacticalCardRecordKeys:['tactical_cards:healing_pathogen','tactical_cards:defiler_mound'],
      units:[unit('defiler','defiler',[{upgradeName:'Plague'}]),unit('victim',unitKey),unit('p1-anchor','stukov')]},
      player2:dark?{sideKey:'player2',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:terran_armed_forces',
        tacticalCardRecordKeys:['tactical_cards:armory'],units:[unit('shooter','goliath')]}:{sideKey:'player2',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:stukov_s_forces',
        tacticalCardRecordKeys:['tactical_cards:healing_pathogen'],units:[unit('enemy',enemyKey),unit('target','roach'),unit('p2-anchor','stukov')]}}});
  const keys=['round','firstPassSideByPhase','scores','gameOver','terminal','engagementScale','armyBuildingEngagementScale',
    'board','officialModelGapTransitPolicy','officialMissionRuntimeDescriptor','officialMissionSupplyProfile','supplyLossLedger',
    'officialMissionRuntimeState','officialMissionDeploymentDraftDataBundle','officialMissionEffectCatalogue'];
  const state={...Object.fromEntries(keys.map(k=>[k,structuredClone(template.state[k])])),...built.state,
    phase:'start_of_round',stage:'mission_start_of_round',activeSideKey:'player1',firstPlayerSideKey:'player1',phaseFirstActorByRound:{},log:[]};
  const byId=id=>state.pieces.find(p=>p.id===id),victimRadius=byId('victim').models[0].baseWidthInches/2,
    defilerRadius=byId('defiler').models[0].baseWidthInches/2,
    enemyRadius=dark?victimRadius:byId('enemy').models[0].baseWidthInches/2,
    enemyX=12+victimRadius+enemyRadius+1.5,defilerY=12+enemyRadius+defilerRadius+1.5;
  const positions={defiler:[enemyX,defilerY],victim:[12,12],enemy:[enemyX,12],target:[enemyX+5,12],shooter:[20,13],
    'p1-anchor':[40,25],'p2-anchor':[40,20]};
  for(const piece of state.pieces){
    Object.assign(piece,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',leadingModelId:piece.models[0].id});
    const profile=resolveOfficialEffectiveCombatProfileV1(state,piece),[originalX,y]=positions[piece.id],x=originalX+variant/100;
    piece.models.forEach((m,i)=>Object.assign(m,{isOnField:true,elevation:'ground_level',
      xInches:x+(piece.models.length===3?(i===2?0.5:i):i%3)*(m.baseWidthInches+0.05),
      yInches:y+(piece.models.length===3?(i===2?Math.sqrt(3)/2:0):Math.floor(i/3))*(m.baseDepthInches+0.05)}));
    const initialAttrition=['victim','enemy'].includes(piece.id);
    applyOfficialSelectedRosterResolvedDamageV1(state,piece,profile,{
      casualtyModelIds:initialAttrition?piece.models.slice(1).map(m=>m.id):[],
      remainingModelIds:initialAttrition?[piece.models[0].id]:piece.models.map(m=>m.id),targetDestroyed:false,
      postDamageMarker:['defiler','enemy'].includes(piece.id)?profile.hitPoints-1:0,shieldedBefore:false,shieldedAfter:false});
  }
  const tokenBoard=bindWave4TokenBoard(inputs,state);
  declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'wave4-consume-'+unitKey});
  return{state,sourceDefinitionIds,characteristicRuntimeDefinitionIds:characteristics,roundControl:true,roundDefinitionIds:sourceDefinitionIds,
    runtimeOptions:{includeRanged:true,includeMelee:true,includeHits:true,includePrecisionChoices:true,includeArmourChoices:true,
      includeArmourOrdinals:true,includeReleasePhaseControl:true,...(dark?{includeTargetReactions:true,includeReleaseZergTargetReactions:true,includeArmourReactions:true}:{} )},
    gestateParameters:{coordinate:{xMilliInches:12000,yMilliInches:15000}},
    plagueParameters:{coordinate:{xMilliInches:Math.round((enemyX+2.5+variant/100)*1000),yMilliInches:12000},biomassToSpend:cost},
    scenario:{kind:'wave4_detonation_consume_'+kind,tokenBoard,declaredEngineeringPositions:true,declaredPriorInfantryAttrition:true,
      declaredPriorDefilerAndEnemyDamage:true,...(variant?{engineeringTranslationInches:variant/100}:{}),estimatedInfantryGeometry:true,fullMatchAdmission:false}};
}
