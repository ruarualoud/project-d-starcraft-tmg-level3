import {createWave4TurretRoundScene} from './wave4-turret-round-v1.mjs';
import {createOfficialReleaseRosterStateV2} from '../../packages/product-composition/official-release-roster-state-v2.mjs';
import {getOfficialReleaseBattlefieldAssetComponentProfileV2} from '../../packages/source-data/official-battlefield-asset-component-profile-v1.mjs';
import {createOfficialBattlefieldDisplacementSourceV1} from '../../packages/product-composition/official-battlefield-displacement-source-v1.mjs';
import {createOfficialBattlefieldDisplacementQueryPolicyV1} from '../../packages/product-composition/official-psionic-displacement-query-v1.mjs';
import {createOfficialBattlefieldDisplacementPolicyV1} from '../../packages/product-composition/official-psionic-displacement-runtime-v1.mjs';
import {declareWave3EngineeringCoherencyV1} from './wave3-room-boundary-fixture-v1.mjs';
export const CREEP_SPREAD='card:hatchery/creep-spread-any@1';
export function createWave4VirusCreepScene(inputs,{virusCard='healing_pathogen',enemyMoveDistance=3}={}){
 const template=createWave4TurretRoundScene(inputs);
 const creep='card:'+virusCard+'/stukov-s-creep-any@1';const sourceDefinitionIds=[CREEP_SPREAD,creep];
 const unit=(id,key)=>({unitInstanceId:id,recordKey:'army_units:'+key,compositionKind:'small',upgrades:[]});
 const built=createOfficialReleaseRosterStateV2({context:inputs.context,sourceDefinitionIds,battlefieldModifierDefinitionIds:sourceDefinitionIds,
  includeMelee:true,includeAbilitySourcePhases:true,candidatesBySide:{
   player1:{sideKey:'player1',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:stukov_s_forces',
    tacticalCardRecordKeys:['tactical_cards:'+virusCard,'tactical_cards:hatchery'],units:[unit('actor','hydralisk')]},
   player2:{sideKey:'player2',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:terran_armed_forces',
    tacticalCardRecordKeys:['tactical_cards:armory'],units:[unit('enemy','marine')]}}});
 const commonKeys=['round','phase','stage','activeSideKey','firstPlayerSideKey','phaseFirstActorByRound','firstPassSideByPhase',
  'scores','gameOver','terminal','engagementScale','armyBuildingEngagementScale','board','officialModelGapTransitPolicy',
  'officialMissionRuntimeDescriptor','officialMissionDeploymentDraftDataBundle','officialMissionEffectCatalogue',
  'officialMissionSupplyProfile','officialMissionRuntimeState','supplyLossLedger','officialFactionArmyEligibilityDataBundle'];
 const state={...Object.fromEntries(commonKeys.filter(k=>k in template.state).map(k=>[k,structuredClone(template.state[k])])),...built.state};
 for(const key of ['officialBattlefieldTokenMarkerRulesDataBundle','officialBattlefieldTokenMarkerRegistry','officialDeploymentGeometryBinding'])state[key]=structuredClone(inputs.seed.state[key]);
 state.officialBattlefieldAssetComponentProfile=getOfficialReleaseBattlefieldAssetComponentProfileV2(inputs.context);
 const side=state.officialDeploymentGeometryBinding.entryEdgesByPlayer.player1.segments[0].side;
 const horizontal=side==='top'||side==='bottom';
 const center={xMilliInches:horizontal?27000:side==='left'?2000:52000,yMilliInches:horizontal?(side==='bottom'?2000:34000):18000};
 const actor=state.pieces.find(p=>p.id==='actor'),enemy=state.pieces.find(p=>p.id==='enemy');
 for(const piece of state.pieces)Object.assign(piece,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',leadingModelId:piece.models[0].id});
 actor.models.forEach((m,i)=>Object.assign(m,{isOnField:true,xInches:10+i*(m.baseWidthInches+0.05),yInches:10,elevation:'ground_level'}));
 const token=state.officialBattlefieldAssetComponentProfile.componentEvidence.creep_tumor;
 const separation=(token.baseWidthMm/25.4+enemy.models[0].baseWidthInches)/2+0.95;
 const near=horizontal?{x:center.xMilliInches/1000+separation,y:center.yMilliInches/1000}:{x:center.xMilliInches/1000,y:center.yMilliInches/1000+separation};
 const start=horizontal?{x:near.x+enemyMoveDistance,y:near.y}:{x:near.x,y:near.y+enemyMoveDistance};
 const positions=origin=>enemy.models.map((m,i)=>({modelId:m.id,xMilliInches:Math.round(1000*(origin.x+(horizontal?i%3:Math.floor(i/3)*(side==='right'?-1:1))*(m.baseWidthInches+0.05))),
   yMilliInches:Math.round(1000*(origin.y+(horizontal?Math.floor(i/3)*(side==='top'?-1:1):i%3)*(m.baseDepthInches+0.05))),elevation:'ground',supportTerrainIds:[]}));
 const initial=positions(start);enemy.models.forEach((m,i)=>Object.assign(m,{isOnField:true,xInches:initial[i].xMilliInches/1000,yInches:initial[i].yMilliInches/1000,elevation:'ground_level'}));
 declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'wave4-virus-creep'});
 const source=createOfficialBattlefieldDisplacementSourceV1({state,includeNativeCreep:true});
 state.officialBattlefieldDisplacementSourceBundle=source;
 state.officialBattlefieldDisplacementQueryPolicy=createOfficialBattlefieldDisplacementQueryPolicyV1({context:inputs.context,source});
 state.officialBattlefieldDisplacementPolicy=createOfficialBattlefieldDisplacementPolicyV1({context:inputs.context,source,includeMovementQueries:true});
 return{state,sourceDefinitionIds,characteristicRuntimeDefinitionIds:[],roundDefinitionIds:sourceDefinitionIds,roundControl:true,
  runtimeOptions:{includeRanged:true,includeMelee:true,includeReleasePhaseControl:true},
  scenario:{kind:'wave4_virus_creep_native_round',declaredInitialPositions:true,estimatedGeometryObjectsUsed:[],fullMatchAdmission:false},
  creepId:creep,center,enemyMove:{leadingModelId:enemy.models[0].id,path:[{xMilliInches:Math.round(start.x*1000),yMilliInches:Math.round(start.y*1000)},
   {xMilliInches:Math.round(near.x*1000),yMilliInches:Math.round(near.y*1000)}],placements:positions(near).slice(1)}};
}
