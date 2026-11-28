import {createWave4StukovUnitScene} from './wave4-stukov-unit-room-v1.mjs';
import {createOfficialReleaseRosterStateV2} from '../../packages/product-composition/official-release-roster-state-v2.mjs';
import {declareWave3EngineeringCoherencyV1} from './wave3-room-boundary-fixture-v1.mjs';
import {bindWave4TokenBoard} from './wave4-token-board-v1.mjs';
import {getOfficialReleaseBattlefieldAssetComponentProfileV2} from '../../packages/source-data/official-battlefield-asset-component-profile-v1.mjs';
import {DETONATION_IDS} from './wave4-detonation-room-v1.mjs';
export const PHOTON_ID='card:overcharged_nexus/photon-overcharge-any@1',VENTRAL_ID='card:overlord/ventral-sacs-any@1';
export function createWave4DetonationPhotonScene(inputs,{beforeCasualtyPolicyVersion='1.7.0'}={}){
 const template=createWave4StukovUnitScene(inputs,{phase:'movement',preactivateMarine:false}),
  live='unit:infested_trooper/live-for-the-swarm-any-phase@1',
  sourceDefinitionIds=[...DETONATION_IDS,live,PHOTON_ID,VENTRAL_ID],
  unit=(id,key)=>({unitInstanceId:id,recordKey:'army_units:'+key,compositionKind:'small',upgrades:[]}),
  built=createOfficialReleaseRosterStateV2({context:inputs.context,sourceDefinitionIds,includeBeforeCasualtyBatch:true,beforeCasualtyPolicyVersion,
   reactionDefinitionIds:[...DETONATION_IDS,PHOTON_ID],characteristicDefinitionIds:[live],
   battlefieldModifierDefinitionIds:[VENTRAL_ID],
   includeArmourOrdinals:true,armourRollOrdinalPolicyVersion:beforeCasualtyPolicyVersion==='1.7.0'?'1.1.0':'1.0.0',includeMelee:true,includeAbilitySourcePhases:true,includeCharacteristicConsumers:true,canonicalResourceTypes:true,
   candidatesBySide:{player1:{sideKey:'player1',scaleId:'Standard',mineralBudget:2000,
    factionRecordKey:'tactical_cards:stukov_s_forces',tacticalCardRecordKeys:['tactical_cards:healing_pathogen','tactical_cards:overlord'],
    units:[unit('actor','infested_trooper'),unit('builder','ravager')]},
   player2:{sideKey:'player2',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:daelaam',
    tacticalCardRecordKeys:['tactical_cards:overcharged_nexus'],units:[unit('defender','zealot')]}}}),
  keys=['round','firstPassSideByPhase','scores','gameOver','terminal','engagementScale','armyBuildingEngagementScale',
   'board','officialModelGapTransitPolicy','officialMissionRuntimeDescriptor','officialMissionSupplyProfile','supplyLossLedger',
   'officialMissionRuntimeState','officialMissionDeploymentDraftDataBundle','officialMissionEffectCatalogue'],
  state={...Object.fromEntries(keys.map(k=>[k,structuredClone(template.state[k])])),...built.state,
   phase:'start_of_round',stage:'mission_start_of_round',activeSideKey:'player1',firstPlayerSideKey:'player1',phaseFirstActorByRound:{},log:[]};
 for(const p of state.pieces){const reserve=p.id==='actor',enemy=p.id==='defender';
  Object.assign(p,{isOnField:!reserve,isInReserves:reserve,deploymentStatus:reserve?'reserves':'deployed',leadingModelId:p.models[0].id});
  p.models.forEach((m,i)=>Object.assign(m,{isOnField:!reserve,elevation:'ground_level',
   xInches:enemy?11.5-(i===2?0.5:i)*(m.baseWidthInches+0.05):5,
   yInches:enemy?10-(i===2?(m.baseDepthInches+0.05)*Math.sqrt(3)/2:0):25+i*(m.baseDepthInches+0.05)}));
  if(p.id!=='builder'){const profile=state.officialCombatProfileBundle.profiles.find(r=>r.recordKey===p.officialUnitRecordKey);
   p.statuses=p.statuses.filter(s=>String(typeof s==='string'?s:s.statusName||s.name).toLowerCase()!=='shielded');
   p.damageMarker=profile.hitPoints*p.currentModels-1;Object.assign(p.models[0],{damage:p.damageMarker,remainingWounds:1});}
 }
 // Same initial-reserve projection used by the Standard room factory; the
 // engineering poses do not replace the purchased roster's reserve identity.
 state.reserveManifestBySide=Object.fromEntries(['player1','player2'].map(side=>[side,state.pieces.filter(p=>p.sideKey===side).map(p=>({
  pieceId:p.id,currentSupply:p.currentSupply,deploymentStatus:p.deploymentStatus,selectedUpgradeNames:[...p.selectedUpgradeNames]}))]));
 const tokenBoard=bindWave4TokenBoard(inputs,state);state.officialBattlefieldAssetComponentProfile=getOfficialReleaseBattlefieldAssetComponentProfileV2(inputs.context);state.officialEngineeringBeaconRoundEnd=state.officialBattlefieldAssetFamilySourceBundle.bundleHash;declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'wave4-photon-ventral'});
 return{state,sourceDefinitionIds,characteristicRuntimeDefinitionIds:[live],roundControl:true,roundDefinitionIds:sourceDefinitionIds,
  runtimeOptions:{includeRanged:true,includeMelee:true,includeHits:true,includePrecisionChoices:true,includeArmourChoices:true,
   includeArmourOrdinals:true,includeReleasePhaseControl:true,includeReleaseBeaconLifecycle:true,includeExternalBeaconEntryObservation:beforeCasualtyPolicyVersion==='1.7.0'},
  beaconCoordinate:{xMilliInches:23000,yMilliInches:10000},
  scenario:{kind:'wave4_detonation_photon_ventral',tokenBoard,declaredEngineeringPositions:true,conditionalInitialDamageAndDepletedShields:true,
   initialActorInReserves:true,actualBeaconSetRound:1,actualBeaconEntryRound:1,fullMatchAdmission:false,estimatedInfantryGeometry:true}};
}
