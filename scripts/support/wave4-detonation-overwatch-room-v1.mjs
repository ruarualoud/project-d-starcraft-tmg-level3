import {createWave4StukovUnitScene} from './wave4-stukov-unit-room-v1.mjs';
import {createOfficialReleaseRosterStateV2} from '../../packages/product-composition/official-release-roster-state-v2.mjs';
import {createOfficialSpecialUnitPieceV1} from '../../packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs';
import {declareWave3EngineeringCoherencyV1} from './wave3-room-boundary-fixture-v1.mjs';
import {DETONATION_IDS} from './wave4-detonation-room-v1.mjs';
import {OFFICIAL_FAQ_REACTION_POLICY_V13} from '../../packages/rule-atoms/official-faq-reaction-policy-v13.mjs';
import {bindOfficialSpawnRoundAbilityLockV1} from '../../packages/rule-atoms/official-spawn-round-ability-lock-v1.mjs';
import {createOfficialSupplyLossLedgerV1} from '../../packages/rule-atoms/official-supply-loss-ledger-v1.mjs';
export function createWave4DetonationOverwatchScene(inputs,{unitKey='infested_marine',woundedTurret=true,coexistingOcular=false}={}){
 const template=createWave4StukovUnitScene(inputs,{phase:'assault',preactivateMarine:false});
 const characteristics=['unit:'+unitKey+'/live-for-the-swarm-any-phase@1'],watch='unit:auto_turret/overwatch-assault-phase@1',
  weapon='unit:auto_turret/gauss-cannon-assault-phase@1',structure='unit:auto_turret/structure-any-phase@1';
 const ocular='unit:infested_missile_turret/ocular-overwatch-assault-phase@1',firefly='unit:infested_missile_turret/firefly-missiles-assault-phase@1',
  ocularStructure='unit:infested_missile_turret/structure-any-phase@1';
 const sourceDefinitionIds=[...DETONATION_IDS,...characteristics,watch,weapon,structure,...(coexistingOcular?[ocular,firefly,ocularStructure,'card:stukov_s_forces/hostile-incubation-any@1']:[])];
 const unit=(id,key)=>({unitInstanceId:id,recordKey:'army_units:'+key,compositionKind:'small',upgrades:[]});
 const built=createOfficialReleaseRosterStateV2({context:inputs.context,sourceDefinitionIds,includeBeforeCasualtyBatch:true,beforeCasualtyPolicyVersion:'1.3.0',
  ...(coexistingOcular?{unitLifecycleDefinitionIds:['card:stukov_s_forces/hostile-incubation-any@1']}:{}),
  reactionDefinitionIds:[...DETONATION_IDS,watch,...(coexistingOcular?[ocular]:[])],characteristicDefinitionIds:characteristics,
  rangedWeaponDefinitionIds:[weapon,...(coexistingOcular?[firefly]:[])],structureDefinitionIds:[structure,...(coexistingOcular?[ocularStructure]:[])],
  canonicalResourceTypes:true,includeAbilitySourcePhases:true,includeCharacteristicConsumers:true,includeMelee:true,
  candidatesBySide:{player1:{sideKey:'player1',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:stukov_s_forces',
    tacticalCardRecordKeys:['tactical_cards:healing_pathogen'],units:[unit('defender',unitKey),unit('survivor','stukov')]},
   player2:{sideKey:'player2',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:terran_armed_forces',
    tacticalCardRecordKeys:['tactical_cards:armory'],units:[unit('creator','raven')]}}});
 const keys=['round','phase','stage','activeSideKey','firstPlayerSideKey','phaseFirstActorByRound','firstPassSideByPhase',
  'engagementScale','armyBuildingEngagementScale','board','officialModelGapTransitPolicy','officialMissionRuntimeDescriptor','officialMissionSupplyProfile','supplyLossLedger'];
 const state={...Object.fromEntries(keys.filter(k=>k in template.state).map(k=>[k,structuredClone(template.state[k])])),...built.state,
  firstPlayerSideKey:'player2',officialFaqReactionPolicy:structuredClone(OFFICIAL_FAQ_REACTION_POLICY_V13),log:[]};
 const turret=createOfficialSpecialUnitPieceV1(state,'player2','army_units:auto_turret','turret');state.pieces.push(turret);
 if(coexistingOcular){
  state.round=2;state.supplyLossLedger=createOfficialSupplyLossLedgerV1({round:2,rulesRuntimeHash:state.officialMissionRuntimeDescriptor.runtimeHash});
  const ocularPiece=createOfficialSpecialUnitPieceV1(state,'player1','army_units:infested_missile_turret','ocular');
  bindOfficialSpawnRoundAbilityLockV1(ocularPiece,inputs.lifecycle.routes.find(r=>r.spawnRoundAbilityLockPolicy).spawnRoundAbilityLockPolicy,Math.max(1,state.round-1));
  state.pieces.push(ocularPiece);state.activeSideKey='player2';
  state.phaseFirstActorByRound={'2:assault':{round:2,phase:'assault',markerHolderSideKey:'player2',chosenFirstActorSideKey:'player2'}};
 }
 const defender=state.pieces.find(p=>p.id==='defender'),x=20+2*(defender.models[0].baseWidthInches+0.05)
  +(defender.models[0].baseWidthInches+turret.models[0].baseWidthInches)/2+1.5;
 for(const piece of state.pieces){Object.assign(piece,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',leadingModelId:piece.models[0].id});
  const [px,py]=({defender:[20,10],survivor:[6,6],creator:[32,20],turret:[x,10],ocular:[24,18]})[piece.id];
  piece.models.forEach((m,i)=>Object.assign(m,{isOnField:true,xInches:px+(i%3)*(m.baseWidthInches+0.05),
   yInches:py+Math.floor(i/3)*(m.baseDepthInches+0.05),elevation:'ground_level'}));}
 for(const p of state.pieces.filter(p=>['defender','creator'].includes(p.id)))p.activatedPhases={movement:true};
 for(const p of [turret,defender]){const profile=state.officialCombatProfileBundle.profiles.find(r=>r.recordKey===p.officialUnitRecordKey);
  p.damageMarker=p===turret?(woundedTurret?profile.hitPoints-1:0):profile.hitPoints*(p.currentModels-1);
  Object.assign(p.models[0],{damage:p.damageMarker,remainingWounds:Math.max(0,profile.hitPoints-p.damageMarker)});}
 declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'wave4-detonation-overwatch'});
 return{state,sourceDefinitionIds,characteristicRuntimeDefinitionIds:characteristics,
  runtimeOptions:{includeRanged:true,includeMelee:true,includeHits:true,includePrecisionChoices:true,includeArmourChoices:true,
   weaponDefinitionIds:[weapon,...(coexistingOcular?[firefly]:[])],includeReleasePhaseControl:true},
  scenario:{kind:'wave4_detonation_auto_turret_overwatch',declaredPositionsAndNonLethalMarkers:true,priorTurretDeploymentDeclared:true,priorMovementActivationDeclared:true,
   ocularDirectConsumerExcluded:'Firefly Missiles target Flying, both Detonation infantry are Ground',
   ...(coexistingOcular?{coexistingOverwatchSources:true,priorOcularDeploymentDeclared:true}:{}),estimatedUnitGeometry:true,fullMatchAdmission:false}};
}
