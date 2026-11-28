import fs from 'node:fs/promises';
import path from 'node:path';
import {hashStarcraftTmgContract as hash} from '../../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createWave4StukovUnitScene} from './wave4-stukov-unit-room-v1.mjs';
import {createOfficialReleaseRosterStateV2} from '../../packages/product-composition/official-release-roster-state-v2.mjs';
import {declareWave3EngineeringCoherencyV1} from './wave3-room-boundary-fixture-v1.mjs';
import {DETONATION_IDS} from './wave4-detonation-room-v1.mjs';
import {OFFICIAL_TEMPLATE_ADAPTIVE_BATCH_ORDER_POLICY_V13} from '../../packages/rule-atoms/official-template-batch-order-policy-v13.mjs';
import {OFFICIAL_FAQ_REACTION_POLICY_V13} from '../../packages/rule-atoms/official-faq-reaction-policy-v13.mjs';
export async function createWave4DetonationTemplateScene(inputs,{root,woundedAttacker=true,spilloverFirst=false,declarationAbility=null,beforeCasualtyPolicyVersion='1.2.0'}={}){
 const template=createWave4StukovUnitScene(inputs,{phase:'assault',preactivateMarine:false});
 const characteristics=['unit:siege_tank/mode-transformation-movement-phase@1'];
 const declarationId=declarationAbility?'unit:siege_tank/'+declarationAbility.toLowerCase().replaceAll(' ','-')+'-assault-phase@1':null;
 const weapon='unit:siege_tank/shock-cannon-assault-phase@1',sourceDefinitionIds=[...DETONATION_IDS,...characteristics,weapon,...(declarationId?[declarationId]:[])];
 const {assetHash,...assetBody}=JSON.parse(await fs.readFile(path.join(root,'content/source-releases/wave3-20261113-blast-template-v1.json'),'utf8'));
 const body={...assetBody,sourceSnapshotHash:inputs.dataset.sourceSnapshotHash,normalizedDatasetHash:inputs.dataset.datasetHash};
 const asset={...body,assetHash:hash(body)};
 const unit=(id,key,upgrades=[])=>({unitInstanceId:id,recordKey:'army_units:'+key,compositionKind:'small',upgrades});
 const built=createOfficialReleaseRosterStateV2({context:inputs.context,sourceDefinitionIds,includeBeforeCasualtyBatch:true,beforeCasualtyPolicyVersion,
  reactionDefinitionIds:[...DETONATION_IDS,...(declarationId?[declarationId]:[])],characteristicDefinitionIds:characteristics,
  canonicalResourceTypes:true,includeAbilitySourcePhases:true,includeCharacteristicConsumers:true,includeMelee:true,
  blastTemplateGeometryAsset:asset,includeTemplateBatchOrder:true,templateBatchOrderPolicy:OFFICIAL_TEMPLATE_ADAPTIVE_BATCH_ORDER_POLICY_V13,
  candidatesBySide:{player1:{sideKey:'player1',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:terran_armed_forces',
    tacticalCardRecordKeys:['tactical_cards:armory'],units:[unit('attacker','siege_tank',[{upgradeName:'Mode Transformation'},...(declarationAbility?[{upgradeName:declarationAbility}]:[])])]},
   player2:{sideKey:'player2',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:stukov_s_forces',
    tacticalCardRecordKeys:['tactical_cards:healing_pathogen'],units:[unit('defender','infested_marine'),unit('spillover','infested_trooper')]}}});
 const keys=['round','phase','stage','activeSideKey','firstPlayerSideKey','phaseFirstActorByRound','firstPassSideByPhase',
  'engagementScale','armyBuildingEngagementScale','board','officialModelGapTransitPolicy','officialMissionRuntimeDescriptor','officialMissionSupplyProfile','supplyLossLedger'];
 const state={...Object.fromEntries(keys.filter(k=>k in template.state).map(k=>[k,structuredClone(template.state[k])])),...built.state,
  officialFaqReactionPolicy:structuredClone(OFFICIAL_FAQ_REACTION_POLICY_V13),log:[]};
 const attacker=state.pieces.find(p=>p.id==='attacker'),defender=state.pieces.find(p=>p.id==='defender');
 const x=12+(attacker.models[0].baseWidthInches+defender.models[0].baseWidthInches)/2+1.1;
 for(const piece of state.pieces){Object.assign(piece,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',leadingModelId:piece.models[0].id});
  piece.models.forEach((m,i)=>Object.assign(m,{isOnField:true,xInches:piece.id==='attacker'?12:x+(i%3)*(m.baseWidthInches+0.05),
   yInches:(piece.id==='spillover'?12.7:10)+Math.floor(i/3)*(m.baseDepthInches+0.05),elevation:'ground_level'}));}
 attacker.statuses.push({statusName:'siege_mode',statusKind:'status',conditionalInitialStatus:true});
 for(const p of state.pieces){const profile=state.officialCombatProfileBundle.profiles.find(r=>r.recordKey===p.officialUnitRecordKey);
  p.damageMarker=p.id==='attacker'?(woundedAttacker?profile.hitPoints-1:0):profile.hitPoints*(p.currentModels-1);
  Object.assign(p.models[0],{damage:p.damageMarker,remainingWounds:Math.max(0,profile.hitPoints-p.damageMarker)});}
 declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'wave4-detonation-template'});
 return{state,sourceDefinitionIds,characteristicRuntimeDefinitionIds:characteristics,
  runtimeOptions:{includeRanged:true,includeMelee:true,includeHits:true,includeTemplateAttacks:true,includeTemplateBatchOrder:true,
   includePrecisionChoices:true,includeArmourChoices:true},
  templateParameters:{primaryTargetUnitId:'defender',primaryTargetModelId:defender.models[0].id,
   templateCenter:{xInches:x,yInches:11},batchOrderUnitIds:spilloverFirst?['spillover','defender','attacker']:['defender','spillover','attacker']},
  scenario:{kind:'wave4_detonation_template',declaredSiegeMode:true,declaredPositionsAndNonLethalMarkers:true,...(declarationAbility?{declarationAbility}:{}),
   templateGeometry:'existing_user_confirmed_5_inch_rebound_to_same_rules',estimatedUnitGeometry:true,fullMatchAdmission:false}};
}
