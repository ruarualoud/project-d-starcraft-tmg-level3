import { createWave4TurretScene } from './wave4-turret-room-v1.mjs';
import { createOfficialMissionDeploymentDraftDataBundleV1 } from '../../packages/source-data/official-mission-deployment-draft-data-bundle-v1.mjs';
import { createOfficialMissionEffectCatalogueV1 } from '../../packages/source-data/official-mission-effect-ir-v1.mjs';
import { createOfficialMissionRuntimeV2 } from '../../packages/rule-atoms/official-mission-runtime-v2.mjs';
import { createOfficialMissionSupplyProfileV2 } from '../../packages/source-data/official-mission-supply-profile-v2.mjs';
import { createOfficialSupplyLossLedgerV1 } from '../../packages/rule-atoms/official-supply-loss-ledger-v1.mjs';
import { declareWave3EngineeringCoherencyV1 } from './wave3-room-boundary-fixture-v1.mjs';

export function createWave4TurretRoundScene(inputs) {
  const scene = createWave4TurretScene(inputs, { round:1,includeMelee:true });
  let state=scene.state;
  state.pieces=state.pieces.filter(piece=>piece.id!=='turret');
  Object.assign(state,{round:1,phase:'start_of_round',stage:'mission_start_of_round',activeSideKey:'player1',
    firstPassSideByPhase:{},phaseFirstActorByRound:{},scores:{player1:0,player2:0},gameOver:false,terminal:false});
  // Condition only the initial positions. Every subsequent phase, cleanup,
  // marker activation, initiative and round number is mutated by shared owners.
  state.pieces.find(piece=>piece.id==='enemy').models[0].xInches=29;
  for (const model of state.pieces.find(piece=>piece.id==='actor').models) {
    model.xInches+=3;model.yInches+=4;
  }
  declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'wave4-turret-round-initial'});
  state.officialFactionArmyEligibilityDataBundle=inputs.artifacts.armyBuilder.armyResourceBudgetDataBundle.factionArmyEligibilityDataBundle;
  const draft=createOfficialMissionDeploymentDraftDataBundleV1({dataset:inputs.dataset,snapshot:inputs.snapshot,releaseContext:inputs.context});
  const catalogue=createOfficialMissionEffectCatalogueV1({missionDeploymentDraftDataBundle:draft});
  const mission=createOfficialMissionRuntimeV2({missionEffectCatalogue:catalogue});
  const missionRecordKey='faction_cards:mission_hold_position';
  state.officialMissionDeploymentDraftDataBundle=draft;
  state.officialMissionEffectCatalogue=catalogue;
  state.officialMissionRuntimeDescriptor=mission.descriptor;
  state.officialMissionSupplyProfile=createOfficialMissionSupplyProfileV2({context:inputs.context,missionRecordKey});
  state.supplyLossLedger=createOfficialSupplyLossLedgerV1({round:1,rulesRuntimeHash:mission.descriptor.runtimeHash});
  state=structuredClone(mission.initialize({state,missionRecordKey,
    markerAffinityByNumber:{1:'player1',2:'player2',3:'player1',4:'player2',5:null}}).state);
  return {...scene,state,roundControl:true,scenario:{...scene.scenario,kind:'scoped_native_round_progression',
    priorTurretSetAndLockDeclared:false,initialPositionsDeclared:true,fullRound:true,
    fullMatchAdmission:false,missionRecordKey,missionSetupSource:'current_release_mission_compiler'}};
}
