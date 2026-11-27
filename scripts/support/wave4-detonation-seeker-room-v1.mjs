import {createWave4StukovUnitScene} from './wave4-stukov-unit-room-v1.mjs';
import {createOfficialReleaseRosterStateV2} from '../../packages/product-composition/official-release-roster-state-v2.mjs';
import {declareWave3EngineeringCoherencyV1} from './wave3-room-boundary-fixture-v1.mjs';
import {DETONATION_IDS} from './wave4-detonation-room-v1.mjs';
import {OFFICIAL_FAQ_REACTION_POLICY_V13} from '../../packages/rule-atoms/official-faq-reaction-policy-v13.mjs';
export const SEEKER_ID='unit:raven/seeker-missile-movement-phase@1';
export function createWave4DetonationSeekerScene(inputs,{use=true}={}){
 const template=createWave4StukovUnitScene(inputs,{phase:'movement',preactivateMarine:false});
 const characteristics=[SEEKER_ID],weapon='unit:raven/railguns-assault-phase@1',sourceDefinitionIds=[...DETONATION_IDS,...characteristics,weapon];
 const unit=(id,key,upgrades=[])=>({unitInstanceId:id,recordKey:'army_units:'+key,compositionKind:'small',upgrades});
 const built=createOfficialReleaseRosterStateV2({context:inputs.context,sourceDefinitionIds,includeBeforeCasualtyBatch:true,beforeCasualtyPolicyVersion:'1.2.0',
  reactionDefinitionIds:DETONATION_IDS,characteristicDefinitionIds:characteristics,rangedWeaponDefinitionIds:[weapon],
  canonicalResourceTypes:true,includeAbilitySourcePhases:true,includeCharacteristicConsumers:true,includeMelee:true,includeStructureTargeting:true,
  candidatesBySide:{player1:{sideKey:'player1',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:terran_armed_forces',
    tacticalCardRecordKeys:['tactical_cards:armory','tactical_cards:engineering_bay'],units:[unit('attacker','raven',[{upgradeName:'Seeker Missile'}])]},
   player2:{sideKey:'player2',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:stukov_s_forces',
    tacticalCardRecordKeys:['tactical_cards:healing_pathogen'],units:[unit('defender','infested_marine')]}}});
 const keys=['round','phase','stage','activeSideKey','firstPlayerSideKey','phaseFirstActorByRound','firstPassSideByPhase',
  'engagementScale','armyBuildingEngagementScale','board','officialModelGapTransitPolicy','officialMissionRuntimeDescriptor','officialMissionSupplyProfile','supplyLossLedger',
  'scores','gameOver','terminal','officialMissionDeploymentDraftDataBundle','officialMissionEffectCatalogue','officialMissionRuntimeState','officialFactionArmyEligibilityDataBundle'];
 const state={...Object.fromEntries(keys.filter(k=>k in template.state).map(k=>[k,structuredClone(template.state[k])])),...built.state,
  phase:'start_of_round',stage:'mission_start_of_round',activeSideKey:'player2',firstPlayerSideKey:'player2',phaseFirstActorByRound:{},
  officialFaqReactionPolicy:structuredClone(OFFICIAL_FAQ_REACTION_POLICY_V13),log:[]};
 state.officialSeekerAssaultTiming={definitionId:SEEKER_ID,sourceBundleHash:state.officialCharacteristicStatusFamilySourceBundle.bundleHash};
 const attacker=state.pieces.find(p=>p.id==='attacker'),defender=state.pieces.find(p=>p.id==='defender');
 const x=12+(attacker.models[0].baseWidthInches+defender.models[0].baseWidthInches)/2+1.5;
 for(const piece of state.pieces){Object.assign(piece,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',leadingModelId:piece.models[0].id});
  piece.models.forEach((m,i)=>Object.assign(m,{isOnField:true,xInches:piece.id==='attacker'?12:x+(i%3)*(m.baseWidthInches+0.05),
   yInches:10+Math.floor(i/3)*(m.baseDepthInches+0.05),elevation:'ground_level'}));
  const profile=state.officialCombatProfileBundle.profiles.find(r=>r.recordKey===piece.officialUnitRecordKey);
  piece.damageMarker=piece.id==='attacker'?profile.hitPoints-1:profile.hitPoints*(piece.currentModels-1);
  Object.assign(piece.models[0],{damage:piece.damageMarker,remainingWounds:Math.max(0,profile.hitPoints-piece.damageMarker)});}
 declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'wave4-detonation-seeker'});
 return{state,sourceDefinitionIds,characteristicRuntimeDefinitionIds:characteristics,roundControl:true,roundDefinitionIds:sourceDefinitionIds,
  runtimeOptions:{includeRanged:true,includeMelee:true,includeHits:true,includePrecisionChoices:true,includeArmourChoices:true,weaponDefinitionIds:[weapon],
   includeRavenSeekerMissileRules:true,includeRavenSeekerPaidImpact:true,includeRavenSeekerPhaseEnd:true,includeReleasePhaseControl:true},
  scenario:{kind:'wave4_detonation_seeker_outside_activation',use,declaredPositionsAndNonLethalMarkers:true,
   firstPlayerMarkerHolder:'player2',seekerController:'player1',estimatedUnitGeometry:true,fullMatchAdmission:false}};
}
