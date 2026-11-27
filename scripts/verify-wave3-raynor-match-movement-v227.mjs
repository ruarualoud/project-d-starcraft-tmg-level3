import assert from 'node:assert/strict';
import path from 'node:path';
import {root, registry, read, save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2} from '../packages/source-data/official-release-context-v2.mjs';
import {createOfficialReleaseMatchRuntimeV2} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {createOfficialRoundSupplyStateV1} from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import {createOfficialSupplyLossLedgerV1} from '../packages/rule-atoms/official-supply-loss-ledger-v1.mjs';
import {declareWave3EngineeringCoherencyV1, createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1} from './support/wave3-room-boundary-fixture-v1.mjs';

const integration = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const output = integration+'/raynor-match-v227';
const branch = process.argv.at(-1);
assert(['pickup','ingress'].includes(branch));
const dir = output+'/'+branch;
const roomId = 'raynor-v227-'+branch;
const ids = {pickup:'card:raynor_s_raiders/ready-for-pickup-any@1',ingress:'card:raynor_s_raiders/rapid-ingress-any@1'};
async function resolve(manifest,purpose) {
  const product = registry();
  try {
    product.resolver.register(manifest);
    const [base,mission] = await Promise.all([purpose,'mission_source'].map(purpose=>product.resolver.resolve({releaseId:manifest.releaseId,purpose})));
    return {...base,resources:{...base.resources,...mission.resources}};
  } finally { product.close(); }
}
async function finishSavedBranch() {
  const [manifest,authority,previous]=await Promise.all(['manifest','authority','result'].map(name=>read(dir+'/'+name+'.json')));
  const context=await resolve(manifest,'area_ability_component');
  const runtime=createOfficialReleaseMatchRuntimeV2({context,state:authority.state,boundRuntimeManifest:manifest});
  const reopen=()=>openWave3EngineeringRoomV1({directory:path.join(root,dir),filename:'room.sqlite',
    rulesRuntime:bindOfficialReleaseRulesRuntimeV2({context,runtime})});
  const native=reopen();
  try {
    const creds=await native.create(roomId,authority);
    const before=await native.store.loadRoom(roomId);
    if (before.stateRevision===1) assert.equal(before.envelope.stateHash,previous.stateHash);
    const committed=await native.commit({roomId,credential:creds.player1,operationKey:'finish-'+branch,
      choice:{pieceId:'marine',actionType:'finish_activation'},parameters:()=>({})});
    const end=await native.store.loadRoom(roomId);
    assert.equal(committed.preview.core.preStateHash,previous.stateHash);
    assert.equal(end.stateRevision,2);
    assert.equal(end.envelope.state.activeSideKey,'player2');
    const menu=await native.room.legalSpace({roomId,seatToken:creds.player2.seatToken});
    assert.equal(menu.ok,true);
    const actions=[...new Set([...menu.legalSpace.finiteActions.map(row=>row.action.actionType),...menu.legalSpace.parameterDomains.map(row=>row.actionType)])];
    assert(actions.includes('pass'));
    await save(dir+'/handoff.json',{revision:end.stateRevision,stateHash:end.envelope.stateHash,nextSide:end.envelope.state.activeSideKey,actions});
  } finally {native.close();}
  const cold=reopen();
  try {
    await cold.restoreDependencies(roomId,authority);
    const journal=await cold.store.loadReplayBundle(roomId);
    const receipts=journal.privateJournal.filter(row=>row.payload.type==='accepted_transition').map(row=>row.payload.payload.receipt);
    assert.equal(receipts.length,2);
    const end=await cold.store.loadRoom(roomId);
    const replay=cold.engine.replay({initialEnvelope:journal.initialEnvelope,journal:receipts});
    assert.equal(replay.ok,true); assert.deepEqual(replay.envelope,end.envelope);
    await save(dir+'/handoff-cold.json',{...await read(dir+'/handoff.json'),receipts:receipts.length,exactColdReplay:true});
  } finally {cold.close();}
}

if(process.argv.includes('--finish')) await finishSavedBranch();
else await verifyParent();
async function verifyParent(){
const original = await read(integration+'/tabletop-raven-m01-v1/manifest.json');
const state = await read(output+'/factory-state.json');
state.phase='movement'; state.stage='activation_phases'; state.firstPlayerSideKey=state.activeSideKey='player1';
state.phaseFirstActorByRound['1:movement']={round:1,phase:'movement',chosenFirstActorSideKey:'player1',markerHolderSideKey:'player1'};
for (const piece of state.pieces) {
  const friendly=piece.sideKey==='player1', x=friendly?8:38, y=friendly?8:24;
  const radius=friendly?1.65:2.7;
  Object.assign(piece,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',leadingModelId:piece.models[0].id});
  for(const [i,model] of piece.models.entries()){
    const angle=2*Math.PI*(i-1)/(piece.models.length-1);
    Object.assign(model,{xInches:x+(i?Math.round(1000*radius*Math.cos(angle))/1000:0),
      yInches:y+(i?Math.round(1000*radius*Math.sin(angle))/1000:0),isOnField:true});
  }
  state.reserveManifestBySide[piece.sideKey].find(entry=>entry.pieceId===piece.id).deploymentStatus='deployed';
}
declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'raynor-v227-'});
const supply={state,gameplayDataBundle:state.officialGameplayDataBundle,rulesRuntimeHash:state.officialMissionRuntimeDescriptor.runtimeHash};
state.officialRoundSupplyState=createOfficialRoundSupplyStateV1(supply);
state.supplyLossLedger=createOfficialSupplyLossLedgerV1({round:state.round,rulesRuntimeHash:supply.rulesRuntimeHash});
for(const side of ['player1','player2']) state.players[side].supply=state.officialRoundSupplyState.supplyPoolBySide[side];

const source=await resolve(original,'area_ability_inputs');
const runtime=createOfficialReleaseMatchRuntimeV2({context:source,state,candidateVersion:'2.27.0'});
const ref=await save(dir+'/runtime.json',runtime.descriptor), frozen=original.source;
const manifest=createOfficialReleaseManifestV2({
  releaseId:original.releaseId,dataset:source.dataset,snapshot:source.snapshot,sourceRevision:await read(frozen.sourceRevisionRef),
  sourceRevisionRef:frozen.sourceRevisionRef,snapshotRef:frozen.snapshotRef,datasetRef:frozen.datasetRef,
  sourcePolicy:frozen.policy,referenceSources:frozen.references,components:{...original.components,rulesRuntime:{ref,version:runtime.descriptor.runtimeVersion,integrity:{field:'runtimeHash',value:runtime.descriptor.runtimeHash}}}
});
await save(dir+'/manifest.json',manifest);
async function open(){
  const context=await resolve(await read(dir+'/manifest.json'),'area_ability_component');
  const loaded=createOfficialReleaseMatchRuntimeV2({context,state,boundRuntimeManifest:manifest});
  assert.deepEqual(loaded.descriptor,runtime.descriptor);
  return {context,native:openWave3EngineeringRoomV1({directory:path.join(root,dir),filename:'room.sqlite',rulesRuntime:bindOfficialReleaseRulesRuntimeV2({context,runtime:loaded})})};
}
const {context,native}=await open();
const authority=createWave3ComponentEngineeringAuthorityV1({context,state,scenario:{scope:'standard_raynor_faction_card',phase:'movement',source:output+'/factory-state.json',declaredDeployment:true}});
await save(dir+'/authority.json',authority);
let result;
try{
  const creds=await native.create(roomId,authority);
  const actor=state.pieces.find(p=>p.id==='marine');
  const selection={select:row=>(row.sourceDomain?.definitionId??row.definitionId)===ids[branch],
    parameters:row=>branch==='ingress'?{activeUnitId:actor.id,paymentCardInstanceIds:[],coordinate:{xMilliInches:18000,yMilliInches:9500}}:
      {leadingModelId:actor.leadingModelId,placements:actor.models.map(model=>({modelId:model.id,xMilliInches:Math.round(model.xInches*1000)+5000,yMilliInches:Math.round(model.yInches*1000),rotationDegrees:0}))}};
  const committed=await native.commit({roomId,credential:creds.player1,operationKey:branch+'-card',...selection});
  const after=await native.store.loadRoom(roomId);
  const actual=after.envelope.state;
  const card=actual.cardResources.player1.find(c=>c.cardInstanceId==='faction:player1');
  assert.equal(card.readiness,'exhausted');
  const menu=await native.room.legalSpace({roomId,seatToken:creds[actual.activeSideKey].seatToken});
  assert.equal(menu.ok,true);
  const next=menu.legalSpace;
  const actions=[...new Set([...next.finiteActions.map(row=>row.action.actionType),...next.parameterDomains.map(row=>row.actionType)])];
  assert(actions.length);
  assert(!next.parameterDomains.some(row=>Object.values(ids).includes(row.sourceDomain?.definitionId??row.definitionId)));
  result={branch,revision:after.stateRevision,stateHash:after.envelope.stateHash,committed:committed.preview.core.action.actionType,readiness:card.readiness,actions};
  if(branch==='pickup') {
    const moved=actual.pieces.find(p=>p.id===actor.id);
    assert.equal(moved.activatedPhases.movement,true);
    for(const model of actor.models) {
      const dst=moved.models.find(row=>row.id===model.id);
      assert.equal(Math.round((dst.xInches-model.xInches)*1000),5000);
      assert.equal(Math.round(dst.yInches*1000),Math.round(model.yInches*1000));
    }
    assert(actual.activeAbilityUseHistory.some(row=>row.routeId===ids.pickup&&row.sourceInstanceId===card.cardInstanceId));
    result.modelsMoved=moved.models.length;
  } else {
    const drone=actual.pieces.find(p=>p.officialUnitRecordKey==='army_units:point_defense_drone');
    assert(drone?.isOnField && drone.removeAtRoundEnd);
    assert.equal(drone.models[0].xInches,18);
    assert.equal(drone.models[0].yInches,9.5);
    result.spawned=drone.id;
  }
  await save(dir+'/successor.json',result);
} finally {native.close();}
const cold=await open();
try{
  await cold.native.restoreDependencies(roomId,await read(dir+'/authority.json'));
  const bundle=await cold.native.store.loadReplayBundle(roomId);
  const receipts=bundle.privateJournal.filter(row=>row.payload.type==='accepted_transition').map(row=>row.payload.payload.receipt);
  const replay=cold.native.engine.replay({initialEnvelope:bundle.initialEnvelope,journal:receipts});
  const end=await cold.native.store.loadRoom(roomId);
  assert.equal(replay.ok,true); assert.equal(receipts.length,1);
  assert.deepEqual(replay.envelope,end.envelope); assert.equal(end.envelope.stateHash,result.stateHash);
  await save(dir+'/result.json',{...result,receipts:receipts.length,exactColdReplay:true});
} finally {cold.native.close();}
}
