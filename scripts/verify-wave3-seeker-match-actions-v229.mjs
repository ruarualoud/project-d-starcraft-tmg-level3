import assert from 'node:assert/strict';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { createOfficialSupplyLossLedgerV1 } from '../packages/rule-atoms/official-supply-loss-ledger-v1.mjs';
import { poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';
import path from 'node:path';
import {root, registry, read, save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2} from '../packages/source-data/official-release-context-v2.mjs';
import {createOfficialReleaseMatchRuntimeV2} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {declareWave3EngineeringCoherencyV1,createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1} from './support/wave3-room-boundary-fixture-v1.mjs';

const integration='build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const out=integration+'/raven-seeker-standard-v229';
const branch=process.argv.at(-1);
assert(['near','far','stationary','outside'].includes(branch));
const dir=out+'/'+branch, roomId='seeker-v229-'+branch, cast='unit:raven/seeker-missile-movement-phase@1';
const cost=branch==='near'?0:1;
async function resolve(manifest,purpose) {
  const product = registry();
  try {
    product.resolver.register(manifest);
    const [base,mission] = await Promise.all([purpose,'mission_source'].map(purpose=>product.resolver.resolve({releaseId:manifest.releaseId,purpose})));
    return {...base,resources:{...base.resources,...mission.resources}};
  } finally { product.close(); }
}
const original=await read(integration+'/tabletop-raven-m01-v1/manifest.json');
const state=await read(out+'/factory-state.json');
state.phase='movement';state.stage='activation_phases';state.firstPlayerSideKey=state.activeSideKey='player1';
state.phaseFirstActorByRound['1:movement']={round:1,phase:'movement',chosenFirstActorSideKey:'player1',markerHolderSideKey:'player1'};
for(const piece of state.pieces.filter(p=>p.id==='raven'||p.id==='zergling')){
  Object.assign(piece,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',leadingModelId:piece.models[0].id});
  const x=piece.id==='raven'?8.5:branch==='near'?20.5:branch==='outside'?28.5:24.4, y=10;
  for(const [i,model] of piece.models.entries()){
    const angle=2*Math.PI*(i-1)/(piece.models.length-1);
    Object.assign(model,{xInches:x+(i?Math.round(2700*Math.cos(angle))/1000:0),
      yInches:y+(i?Math.round(2700*Math.sin(angle))/1000:0),isOnField:true});
  }
  if(branch==='stationary'&&piece.id==='zergling') piece.statuses=[...piece.statuses||[],'STATIONARY'];
  state.reserveManifestBySide[piece.sideKey].find(entry=>entry.pieceId===piece.id).deploymentStatus='deployed';
}
declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'seeker-v229-'+branch+'-'});
state.officialRoundSupplyState=createOfficialRoundSupplyStateV1({state,gameplayDataBundle:state.officialGameplayDataBundle,
  rulesRuntimeHash:state.officialMissionRuntimeDescriptor.runtimeHash});
state.supplyLossLedger=createOfficialSupplyLossLedgerV1({round:state.round,rulesRuntimeHash:state.officialMissionRuntimeDescriptor.runtimeHash});
for(const side of ['player1','player2']) state.players[side].supply=state.officialRoundSupplyState.supplyPoolBySide[side];
const source=await resolve(original,'area_ability_inputs');
const descriptor=createOfficialReleaseMatchRuntimeV2({context:source,state,candidateVersion:'2.29.0'}).descriptor;
await save(dir+'/runtime.json',descriptor);
const frozen=original.source;
const manifest=createOfficialReleaseManifestV2({releaseId:original.releaseId,dataset:source.dataset,snapshot:source.snapshot,
  sourceRevision:await read(frozen.sourceRevisionRef),sourceRevisionRef:frozen.sourceRevisionRef,
  snapshotRef:frozen.snapshotRef,datasetRef:frozen.datasetRef,sourcePolicy:frozen.policy,referenceSources:frozen.references,
  components:{...original.components,rulesRuntime:{ref:dir+'/runtime.json',version:descriptor.runtimeVersion,
    integrity:{field:'runtimeHash',value:descriptor.runtimeHash}}}});
const context=await resolve(manifest,'area_ability_component');
const runtime=createOfficialReleaseMatchRuntimeV2({context,state,boundRuntimeManifest:manifest});
assert.deepEqual(runtime.descriptor,descriptor);
const authority=createWave3ComponentEngineeringAuthorityV1({context,state,scenario:{scope:'formal_standard_seeker',source:out+'/factory-state.json',declaredPositions:true,stationary:branch==='stationary',branch}});
const open=()=>openWave3EngineeringRoomV1({directory:path.join(root,dir),filename:branch==='outside'?':memory:':'room.sqlite',rulesRuntime:bindOfficialReleaseRulesRuntimeV2({context,runtime})});

const nested=(row,key)=>{for(let r=row;r;r=r.sourceAction??r.sourceDomain){if(r[key]!==undefined)return r[key];}};
async function verifyRoom() {
const app=open();
if (branch === 'outside') {
  try {
    const seats = await app.create(roomId,authority);
    const menu = await app.room.legalSpace({roomId,seatToken:seats.player1.seatToken});
    assert.equal(menu.ok,true);
    const offered = menu.legalSpace.parameterDomains.filter(d=>nested(d,'definitionId')===cast);
    for (const domain of offered) {
      assert(Array.isArray(domain.parameterSchema.targetUnitId.enum));
      assert(!domain.parameterSchema.targetUnitId.enum.includes('zergling'));
    }
    assert(!menu.legalSpace.finiteActions.some(row=>nested(row.action,'definitionId')===cast));
    const room=await app.store.loadRoom(roomId);
    assert.equal(room.stateRevision,0);
    await save(dir+'/excluded-target.json',{target:'zergling',ravenCenterXInches:8.5,formationCenterXInches:28.5,offeredCastDomains:offered.length,selectable:false,revision:room.stateRevision});
  } finally {app.close();}
  return;
}
try {
  const seats=await app.create(roomId,authority);
  let room=await app.store.loadRoom(roomId), trace=[];
  if(room.stateRevision) trace=await read(dir+'/trace.json');
  for(let n=0;n<26;n++){
    const current=room.envelope.state;
    if(current.phase==='combat')break;
    const side=current.activeSideKey??current.firstPlayerSideKey;
    const l=await app.room.legalSpace({roomId,seatToken:seats[side].seatToken});
    assert(l.ok,l.reason??l.code);
    const domains=l.legalSpace.parameterDomains;
    const options=l.legalSpace.finiteActions.map(row=>row.action);
    const evidence={revision:room.stateRevision,side,phase:current.phase,options:options.map(a=>a.actionType),
      domains:domains.map(d=>({type:d.actionType,kind:nested(d,'definitionId'),piece:d.pieceId,required:d.parameterSchema.required}))};
    await save(dir+'/menu-r'+room.stateRevision+'.json',evidence);
    const history=current.characteristicStatusAbilityHistory?.find(r=>r.definitionId===cast);
    let command;
    if(!history){
      const domain=domains.find(d=>nested(d,'definitionId')===cast&&nested(d,'constraints')?.resourceCostsByChoice?.default?.effectiveResourceCost===cost);
      assert(domain,'printed or discounted Seeker domain unavailable');
      command={select:r=>r.domainId===domain.domainId,parameters:()=>({activeUnitId:'raven',targetUnitId:'zergling',paymentCardInstanceIds:cost?['faction:player1']:[]})};
    } else if(current.phase==='movement'&&current.selectedRosterActivationWindow?.pieceId==='raven'){
      command={choice:{actionType:'finish_activation',pieceId:'raven'},parameters:()=>({})};
    } else {
      const impact=options.find(a=>a.actionType==='resolve_raven_seeker_phase_end');
      if(impact) {
        const receipt=runtime.querySeekerImpact(current,history.planHash),{declaration,impact:condition}=receipt.result;
        assert.equal(declaration.targetUnitId,'zergling');assert.equal(declaration.paidCommandPoints,cost);
        assert.equal(condition.qualifies,branch!=='far');assert.equal(condition.withinRange,branch==='near');
        assert.equal(condition.stationary,branch==='stationary');
        await save(dir+'/impact.json',{declaration,condition,hash:receipt.queryReceiptHash});
      }
      const first=impact??options.find(a=>a.actionType==='choose_first_actor'&&a.chosenFirstActorSideKey==='player1')
        ??options.find(a=>a.actionType==='pass_reaction_family_window')
        ??options.find(a=>a.actionType==='pass')
        ??(options.length===1?options[0]:null);
      if(first) command={kind:'finite',select:r=>r.action.sourceActionHash===first.sourceActionHash};
      else{
        const d=domains.find(d=>d.parameterSchema.required.some(k=>k==='casualtySelectionHash'||k==='casualtyModelIds'||k==='convertedFailedArmourDieIndices'));
        assert(d,'unexpected pool menu at r'+room.stateRevision);
        command={select:r=>r.domainId===d.domainId,parameters:r=>poolParameters(r)};
      }
    }
    const action=await app.commit({roomId,credential:seats[side],operationKey:'r'+room.stateRevision,...command});
    room=await app.store.loadRoom(roomId);
    const effects=action.preview.core.result.events;
    trace.push({revision:room.stateRevision,side,action:action.preview.core.action.actionType,phase:room.envelope.state.phase,
      events:effects.map(e=>e.type),payment:effects.find(e=>e.type==='ability_resource_paid')?.resourceCost,stateHash:room.envelope.stateHash});
    await save(dir+'/trace.json',trace);
  }
  const end=room.envelope.state;
  assert.equal(end.phase,'combat');assert.equal(trace[0].payment,cost);
  assert.equal(end.officialRavenSeekerPhaseEndHistory.length,1);
  const outcome=end.officialRavenSeekerPhaseEndHistory[0].outcome;
  assert.equal(outcome,branch==='far'?'condition_not_met':'resolved');
  assert.equal(trace.filter(r=>r.events.includes('phase_advanced')&&r.phase==='combat').length,1);
  const receipts=trace.filter(r=>r.events.includes('raven_seeker_missile_hits_declared'));
  assert.equal(receipts.length,branch==='far'?0:1);
  const target=end.pieces.find(p=>p.id==='zergling');
  await save(dir+'/result.json',{branch,modelsBefore:12,modelsAfter:target.currentModels,cost,outcome,
    phase:end.phase,revision:room.stateRevision,stateHash:room.envelope.stateHash});
} finally {app.close();}
const cold=open();
try {
  await cold.restoreDependencies(roomId,authority);
  const bundle=await cold.store.loadReplayBundle(roomId);
  const receipts=bundle.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
  const replay=cold.engine.replay({initialEnvelope:bundle.initialEnvelope,journal:receipts});
  const end=await cold.store.loadRoom(roomId);
  assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,end.envelope);
  await save(dir+'/cold.json',{exact:true,receipts:receipts.length,stateHash:end.envelope.stateHash});
} finally {cold.close();}
}
await verifyRoom();
