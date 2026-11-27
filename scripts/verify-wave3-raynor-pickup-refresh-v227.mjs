import assert from 'node:assert/strict';
import {registry,read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY} from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import {createOfficialReleaseMatchRuntimeV2} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {OFFICIAL_RAYNOR_PICKUP_DEFINITION_ID as pickup} from '../packages/product-composition/official-relocation-family-adapter-v1.mjs';
import {declareWave3EngineeringCoherencyV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {createOfficialRoundSupplyStateV1} from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import {createOfficialSupplyLossLedgerV1} from '../packages/rule-atoms/official-supply-loss-ledger-v1.mjs';
import {openWave3EngineeringRoomV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {bindOfficialReleaseRulesRuntimeV2} from '../packages/source-data/official-release-context-v2.mjs';
import {root} from './support/wave3-raven-tabletop-room-v1.mjs';
import path from 'node:path';

const parent='build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const output=parent+'/raynor-match-v227';
async function context(manifest,purpose) {
  const product=registry();
  try {
    product.resolver.register(manifest);
    const [a,m]=await Promise.all([purpose,'mission_source'].map(purpose=>product.resolver.resolve({releaseId:manifest.releaseId,purpose})));
    return {...a,resources:{...a.resources,...m.resources}};
  } finally {product.close();}
}
const authority=await read(output+'/pickup/authority.json');
const bound=await read(output+'/pickup/manifest.json');
const original=await context(bound,'area_ability_component');
const first=createOfficialReleaseMatchRuntimeV2({context:original,state:authority.state,boundRuntimeManifest:bound});
const room=openWave3EngineeringRoomV1({directory:path.join(root,output,'pickup'),filename:'room.sqlite',
  rulesRuntime:bindOfficialReleaseRulesRuntimeV2({context:original,runtime:first})});
let use;
try {
  const end=await room.store.loadRoom('raynor-v227-pickup');
  assert.equal(end.envelope.stateHash,(await read(output+'/pickup/handoff-cold.json')).stateHash);
  use=end.envelope.state.activeAbilityUseHistory.find(row=>row.routeId===pickup);
  assert.equal(use.pieceId,'marine');assert.equal(use.sourceInstanceId,'faction:player1');
} finally {room.close();}
const manifest=await read(parent+'/tabletop-raven-m01-v1/manifest.json');
const input=await context(manifest,'area_ability_inputs');
const unit=(id,type)=>({unitInstanceId:id,recordKey:'army_units:'+type,compositionKind:'small',upgradeNames:[]});
const base=authority.state;
const opening=prepareOfficialStandardReleaseOpeningV2({releaseContext:input,dataset:input.dataset,snapshot:input.snapshot,releaseMatchVersion:'2.27.0',
  recipes:{player1:{factionRecordKey:'tactical_cards:raynor_s_raiders',tacticalCardRecordKeys:[],units:[unit('marine','marine'),unit('marine-2','marine')]},
    player2:{factionRecordKey:'tactical_cards:zerg_swarm',tacticalCardRecordKeys:['tactical_cards:accelerating_creep'],units:[unit('zergling','zergling')]}},
  armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,missionRecordKey:base.officialMissionSetupBinding.missionRecordKey,deploymentRecordKey:base.officialDeploymentGeometryBinding.deploymentRecordKey});
const state=structuredClone(opening.state);
Object.assign(state,{round:2,phase:'movement',stage:'activation_phases',firstPlayerSideKey:'player1',activeSideKey:'player1',
  phaseFirstActorByRound:{'2:movement':{round:2,phase:'movement',markerHolderSideKey:'player1',chosenFirstActorSideKey:'player1'}}});
for(const piece of state.pieces) {
  const donor=base.pieces.find(row=>row.officialUnitRecordKey===piece.officialUnitRecordKey);
  Object.assign(piece,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',leadingModelId:piece.models[0].id});
  piece.models.forEach((model,i)=>Object.assign(model,{xInches:donor.models[i].xInches+(piece.id==='marine-2'?9:0),yInches:donor.models[i].yInches,isOnField:true}));
  state.reserveManifestBySide[piece.sideKey].find(row=>row.pieceId===piece.id).deploymentStatus='deployed';
}
declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'raynor-refresh-'});
const rulesRuntimeHash=state.officialMissionRuntimeDescriptor.runtimeHash;
state.officialRoundSupplyState=createOfficialRoundSupplyStateV1({state,gameplayDataBundle:state.officialGameplayDataBundle,rulesRuntimeHash});
state.supplyLossLedger=createOfficialSupplyLossLedgerV1({round:2,rulesRuntimeHash});
for(const side of ['player1','player2']) state.players[side].supply=state.officialRoundSupplyState.supplyPoolBySide[side];
assert.equal(state.cardResources.player1.find(c=>c.cardInstanceId===use.sourceInstanceId).readiness,'ready');
const runtime=createOfficialReleaseMatchRuntimeV2({context:input,state,candidateVersion:'2.27.0'});
const eligible=sample=>runtime.enumerate(sample,{sideKey:'player1'}).parameterDomains.filter(row=>(row.sourceDomain?.definitionId??row.definitionId)===pickup).map(r=>r.pieceId).sort();
const before=eligible(state);assert.deepEqual(before,['marine','marine-2']);
const withHistory={...state,activeAbilityUseHistory:[...state.activeAbilityUseHistory,use]};
const after=eligible(withHistory);assert.deepEqual(after,[]);
await save(output+'/pickup-refresh-control.json',{controlledRound:2,cardReadiness:'ready',before,after,priorActor:use.pieceId,
  sourceCard:use.sourceInstanceId,usesSignedHistory:true,roomWrites:0,comparison:'identical two-squad Match menu with and without the signed use',modelCalls:0});
