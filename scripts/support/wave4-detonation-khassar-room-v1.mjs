import {createWave4StukovUnitScene} from './wave4-stukov-unit-room-v1.mjs';
import {createOfficialReleaseRosterStateV2} from '../../packages/product-composition/official-release-roster-state-v2.mjs';
import {declareWave3EngineeringCoherencyV1} from './wave3-room-boundary-fixture-v1.mjs';
import {DETONATION_IDS} from './wave4-detonation-room-v1.mjs';
import {OFFICIAL_FAQ_REACTION_POLICY_V13} from '../../packages/rule-atoms/official-faq-reaction-policy-v13.mjs';
export function createWave4DetonationKhassarScene(inputs,{kind='shot',woundedRecipient=true,woundedActor=false,unitKey='infested_marine',beforeCasualtyPolicyVersion='1.4.0'}={}){
 const phase=kind==='fight'?'combat':'assault',template=createWave4StukovUnitScene(inputs,{phase,preactivateMarine:false});
 const characteristics=['unit:'+unitKey+'/live-for-the-swarm-any-phase@1'],khassar='card:templar_caste/khassar-de-templari-any@1',
  ranged='unit:adept/glaive-cannon-assault-phase@1',strike='unit:adept/strike-combat-phase@1',impact='unit:zealot/devastating-charge-assault-phase@1';
 const weapons=kind==='shot'?[ranged]:kind==='fight'?[strike]:[impact],sourceDefinitionIds=[...DETONATION_IDS,...characteristics,khassar,...weapons];
 const unit=(id,key)=>({unitInstanceId:id,recordKey:'army_units:'+key,compositionKind:'small',upgrades:[]});
 const built=createOfficialReleaseRosterStateV2({context:inputs.context,sourceDefinitionIds,includeBeforeCasualtyBatch:true,beforeCasualtyPolicyVersion,
  reactionDefinitionIds:DETONATION_IDS,characteristicDefinitionIds:characteristics,
  ...(kind==='shot'?{rangedWeaponDefinitionIds:[ranged]}:kind==='fight'?{meleeWeaponDefinitionIds:[strike]}:{meleeModifierDefinitionIds:[impact],includeImpactAllocation:true}),
  canonicalResourceTypes:true,includeAbilitySourcePhases:true,includeCharacteristicConsumers:true,includeMelee:true,includeKhassarMovement:true,
  candidatesBySide:{player1:{sideKey:'player1',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:templar_caste',
    tacticalCardRecordKeys:['tactical_cards:templar_archives'],units:[unit('actor','high_templar'),unit('recipient',kind==='charge'?'zealot':'adept')]},
   player2:{sideKey:'player2',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:stukov_s_forces',
    tacticalCardRecordKeys:['tactical_cards:healing_pathogen'],units:[unit('defender',unitKey),unit('survivor','stukov')]}}});
 const keys=['round','phase','stage','activeSideKey','firstPlayerSideKey','phaseFirstActorByRound','firstPassSideByPhase',
  'engagementScale','armyBuildingEngagementScale','board','officialModelGapTransitPolicy','officialMissionRuntimeDescriptor','officialMissionSupplyProfile','supplyLossLedger'];
 const state={...Object.fromEntries(keys.filter(k=>k in template.state).map(k=>[k,structuredClone(template.state[k])])),...built.state,
  officialFaqReactionPolicy:structuredClone(OFFICIAL_FAQ_REACTION_POLICY_V13),log:[]};
 const recipient=state.pieces.find(p=>p.id==='recipient'),defender=state.pieces.find(p=>p.id==='defender'),
  x=20+(recipient.models[0].baseWidthInches+0.05)+(recipient.models[0].baseWidthInches+defender.models[0].baseWidthInches)/2+(kind==='fight'?0.4:1.5);
 for(const piece of state.pieces){Object.assign(piece,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',leadingModelId:piece.models[0].id});
  const [px,py]=({actor:woundedActor?[x,7.3]:[10,10],recipient:[20,10],defender:[x,10],survivor:[36,20]})[piece.id];
  const triangle=piece.models.length===3;
  piece.models.forEach((m,i)=>Object.assign(m,{isOnField:true,xInches:px+(triangle&&i===2?(m.baseWidthInches+0.05)/2:(i%(piece===recipient?2:3))*(m.baseWidthInches+0.05)),
   yInches:py+(triangle&&i===2?(m.baseDepthInches+0.05)*Math.sqrt(3)/2:Math.floor(i/(piece===recipient?2:3))*(m.baseDepthInches+0.05)),elevation:'ground_level'}));}
 recipient.activatedPhases={movement:true,assault:true,combat:true};
 for(const p of [recipient,defender,...(woundedActor?[state.pieces.find(p=>p.id==='actor')]:[])]){const profile=state.officialCombatProfileBundle.profiles.find(r=>r.recordKey===p.officialUnitRecordKey);
  p.damageMarker=p===defender?profile.hitPoints*(p.currentModels-1):p===recipient&&!woundedRecipient?0:profile.hitPoints*p.currentModels-1;
  if(p!==defender&&p.damageMarker)p.statuses=p.statuses.filter(row=>String(typeof row==='string'?row:row.statusName||row.name).toLowerCase()!=='shielded');
  Object.assign(p.models[0],{damage:p.damageMarker,remainingWounds:Math.max(0,profile.hitPoints-p.damageMarker)});}
 declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'wave4-detonation-khassar'});
 return{state,sourceDefinitionIds,characteristicRuntimeDefinitionIds:characteristics,
  runtimeOptions:{includeRanged:true,includeMelee:true,includeHits:true,includePrecisionChoices:true,includeArmourChoices:true,
   ...(kind==='fight'?{includeKhassarFight:true}:kind==='charge'?{includeKhassarCharge:true}:{includeKhassarShot:true}),
   ...(kind==='shot'?{weaponDefinitionIds:[ranged]}:{}),includeReleasePhaseControl:true},
  scenario:{kind:'wave4_detonation_khassar',declaredPositionsAndNonLethalMarkers:true,priorRecipientActivationDeclared:true,priorWoundedProtossShieldSpentDeclared:true,
   estimatedInfantryGeometry:true,fullMatchAdmission:false}};
}
