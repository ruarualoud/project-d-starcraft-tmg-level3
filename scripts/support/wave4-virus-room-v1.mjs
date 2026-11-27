import { createOfficialReleaseRosterStateV2 } from '../../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialSupplyLossLedgerV1 } from '../../packages/rule-atoms/official-supply-loss-ledger-v1.mjs';
import { declareWave3EngineeringCoherencyV1 } from './wave3-room-boundary-fixture-v1.mjs';
import { createWave4TurretScene } from './wave4-turret-room-v1.mjs';
export const GROWING = 'card:hungering_infestation/growing-infestation-any@1';
export const FETID = 'card:weighted_pustule/fetid-touch-any@1';
export const BLINK = 'unit:stalker/blink-movement-phase@1';
export const RECALL = 'card:nexus/strategic-recall-any@1';
export function createWave4VirusMovementScene(inputs, { infected = true, massRecall = false } = {}) {
  const template = createWave4TurretScene(inputs);
  const unit = (id,key) => ({ unitInstanceId:id,recordKey:'army_units:'+key,compositionKind:'small',upgrades:[] });
  const sourceDefinitionIds = [FETID,BLINK,RECALL,...(massRecall?['card:daelaam/mass-recall-any@1']:[])];
  const built = createOfficialReleaseRosterStateV2({context:inputs.context,sourceDefinitionIds,
    candidatesBySide:{player1:{sideKey:'player1',scaleId:'Standard',mineralBudget:2000,
      factionRecordKey:'tactical_cards:stukov_s_forces',tacticalCardRecordKeys:['tactical_cards:weighted_pustule'],units:[unit('actor','goliath')]},
      player2:{sideKey:'player2',scaleId:'Standard',mineralBudget:2000,
      factionRecordKey:'tactical_cards:daelaam',tacticalCardRecordKeys:['tactical_cards:nexus'],units:[unit('enemy','stalker'),...(massRecall?[unit('ally','zealot')]:[])]}},
    characteristicDefinitionIds:[FETID],relocationDefinitionIds:[BLINK],unitLifecycleDefinitionIds:[RECALL,...(massRecall?['card:daelaam/mass-recall-any@1']:[])],
    includeAbilitySourcePhases:true,canonicalResourceTypes:true});
  const keys=['round','stage','engagementScale','armyBuildingEngagementScale','board','officialMissionRuntimeDescriptor','officialModelGapTransitPolicy'];
  const state={...Object.fromEntries(keys.map(key=>[key,structuredClone(template.state[key])])),...built.state,
    phase:'movement',round:2,stage:'activation_phases',activeSideKey:'player2',firstPlayerSideKey:'player1',log:[],
    phaseFirstActorByRound:{'2:movement':{round:2,phase:'movement',chosenFirstActorSideKey:'player2'}}};
  // The unchanged token/marker kernel retains one complete frozen source binding.
  if(massRecall)for(const key of ['officialBattlefieldTokenMarkerRulesDataBundle','officialBattlefieldTokenMarkerRegistry','officialDeploymentGeometryBinding'])state[key]=structuredClone(inputs.seed.state[key]);
  state.supplyLossLedger=createOfficialSupplyLossLedgerV1({round:2,rulesRuntimeHash:state.officialMissionRuntimeDescriptor.runtimeHash});
  for(const piece of state.pieces) {
    Object.assign(piece,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',leadingModelId:piece.models[0].id});
    piece.models.forEach((model,i)=>Object.assign(model,{isOnField:true,xInches:(piece.sideKey==='player1'?10:24)+(i===1?model.baseWidthInches+0.05:i===2?(model.baseWidthInches+0.05)/2:0),
      yInches:(piece.id==='ally'?14:10)+(i===2?(model.baseDepthInches+0.05)*Math.sqrt(3)/2:0),elevation:'ground_level'}));
  }
  if(infected)state.pieces.find(piece=>piece.id==='enemy').statuses.push({statusName:'INFESTATION',statusKind:'DEBUFF',conditionalInitialStatus:true});
  declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'wave4-virus-movement'});
  return{state,sourceDefinitionIds,characteristicRuntimeDefinitionIds:[FETID],runtimeOptions:{includeReleasePhaseControl:true},
    scenario:{kind:'wave4_virus_movement',declaredPositions:true,conditionalInitialInfestation:infected,
      estimatedGeometryObjectsUsed:[],fullMatchAdmission:false}};
}
