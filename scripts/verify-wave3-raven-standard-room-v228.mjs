import assert from 'node:assert/strict';
import path from 'node:path';
import {root, registry, read, save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2} from '../packages/source-data/official-release-context-v2.mjs';
import {createOfficialReleaseMatchRuntimeV2} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1} from './support/wave3-room-boundary-fixture-v1.mjs';

const integration='build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const dir=integration+'/raven-standard-v228';
const roomId='raven-standard-v228';
async function resolve(manifest,purpose) {
  const product = registry();
  try {
    product.resolver.register(manifest);
    const [base,mission] = await Promise.all([purpose,'mission_source'].map(purpose=>product.resolver.resolve({releaseId:manifest.releaseId,purpose})));
    return {...base,resources:{...base.resources,...mission.resources}};
  } finally { product.close(); }
}
const original=await read(integration+'/tabletop-raven-m01-v1/manifest.json');
const state=await read(dir+'/factory-state.json');
const descriptor=await read(dir+'/runtime.json');
const source=await resolve(original,'area_ability_inputs');
const frozen=original.source;
const manifest=createOfficialReleaseManifestV2({releaseId:original.releaseId,dataset:source.dataset,snapshot:source.snapshot,
  sourceRevision:await read(frozen.sourceRevisionRef),sourceRevisionRef:frozen.sourceRevisionRef,
  snapshotRef:frozen.snapshotRef,datasetRef:frozen.datasetRef,sourcePolicy:frozen.policy,referenceSources:frozen.references,
  components:{...original.components,rulesRuntime:{ref:dir+'/runtime.json',version:descriptor.runtimeVersion,
    integrity:{field:'runtimeHash',value:descriptor.runtimeHash}}}});
const context=await resolve(manifest,'area_ability_component');
const runtime=createOfficialReleaseMatchRuntimeV2({context,state,boundRuntimeManifest:manifest});
assert.deepEqual(runtime.descriptor,descriptor);
const authority=createWave3ComponentEngineeringAuthorityV1({context,state,scenario:{scope:'formal_standard_opening',source:dir+'/factory-state.json'}});
const open=()=>openWave3EngineeringRoomV1({directory:path.join(root,dir),filename:'room.sqlite',rulesRuntime:bindOfficialReleaseRulesRuntimeV2({context,runtime})});
if(process.argv.includes('--previous-binding')) {
  const prefix=integration+'/raynor-match-v227/pickup';
  const [previousManifest,authority,descriptor]=await Promise.all(['manifest','authority','runtime'].map(ref=>read(prefix+'/'+ref+'.json')));
  const previousContext=await resolve(previousManifest,'area_ability_component');
  const restored=createOfficialReleaseMatchRuntimeV2({context:previousContext,state:authority.state,boundRuntimeManifest:previousManifest});
  assert.deepEqual(restored.descriptor,descriptor);
  await save(dir+'/previous-binding.json',{version:descriptor.runtimeVersion,hash:descriptor.runtimeHash,identical:true});
} else if(process.argv.includes('--round-end')) await verifyRoundEnd();
else await verifyEntry();
async function verifyEntry() {
const native=open();
let trace=[];
const turretKey='unit:raven/deploy-auto-turret-movement-phase@1';
function inner(value, key) {
  for(let row=value;row;row=row.sourceAction??row.sourceDomain) if(row[key]!==undefined) return row[key];
}
try {
  await save(dir+'/manifest.json',manifest);
  const seats=await native.create(roomId,authority);
  const get=()=>native.store.loadRoom(roomId);
  const entry='raven-neutral-entry:left';
  const point={xMilliInches:4500,yMilliInches:10000,elevation:'ground',rotationDegrees:0,supportTerrainIds:[]};
  const steps=[
    {key:'start',kind:'finite',choice:{actionType:'resolve_mission_start_of_round'}},
    {key:'first',kind:'finite',select:r=>r.action.actionType==='choose_first_actor'&&r.action.chosenFirstActorSideKey==='player1'},
    {key:'deploy',choice:{pieceId:'raven',actionType:'deploy'},parameters:()=>({leadingModelId:'raven-model-1',path:[point],
      placements:[],entryAlongEdgeMilliInches:10000,entrySegmentId:entry,elevationTransitions:[],gapMouths:[],coherencyGapMouths:[]})},
    {key:'turret',select:r=>r.pieceId==='raven'&&inner(r,'definitionId')===turretKey,
      parameters:()=>({activeUnitId:'raven',paymentCardInstanceIds:['faction:player1'],coordinate:{xMilliInches:9000,yMilliInches:10000}})},
    {key:'finish',choice:{pieceId:'raven',actionType:'finish_activation'},parameters:()=>({})}
  ];
  let current=await get();
  if(current.stateRevision) trace=await read(dir+'/action-trace.json');
  for(let index=current.stateRevision;index<steps.length;index++) {
    const {key,...command}=steps[index];
    const side=current.envelope.state.activeSideKey;
    const menu=await native.room.legalSpace({roomId,seatToken:seats[side].seatToken});
    assert(menu.ok);
    const space=menu.legalSpace;
    const compact=row=>({type:row.actionType,piece:row.pieceId,definition:inner(row,'definitionId'),first:row.chosenFirstActorSideKey});
    await save(dir+'/menu-r'+index+'.json',{side,finite:space.finiteActions.map(row=>compact(row.action)),parameters:space.parameterDomains.map(compact)});
    const committed=await native.commit({roomId,credential:seats[side],operationKey:key,...command});
    current=await get();
    const after=current.envelope.state;
    const action=committed.preview.core.action;
    const plan=inner(action,'spatialPlan');
    const turret=after.pieces.find(p=>p.officialUnitRecordKey==='army_units:auto_turret');
    trace.push({key,revision:current.stateRevision,phase:after.phase,activeSide:after.activeSideKey,action:action.actionType,
      stateHash:current.envelope.stateHash,entry:plan?.entrySegmentId,entrySource:plan?.entrySource?.definitionId,
      fullBaseChecked:plan?.fullBaseBoundaryAndSweptPathChecked,definition:inner(action,'definitionId'),turret:turret&&{
        id:turret.id,source:turret.specialDeploymentSourcePieceId,supply:turret.currentSupply,structure:turret.isStructure,
        onField:turret.isOnField,xy:[turret.models[0].xInches,turret.models[0].yInches]},
      factionCard:after.cardResources.player1.find(card=>card.cardInstanceId==='faction:player1')?.readiness});
    await save(dir+'/action-trace.json',trace);
  }
  const landing=trace.find(row=>row.key==='deploy'), place=trace.find(row=>row.key==='turret');
  assert.equal(landing.entry,entry);assert.equal(landing.fullBaseChecked,true);assert(landing.entrySource);
  assert.equal(place.definition,turretKey);assert.equal(place.turret.source,'raven');assert.equal(place.turret.supply,0);
  assert(place.turret.structure&&place.turret.onField);assert.deepEqual(place.turret.xy,[9,10]);
  assert.equal(place.factionCard,'exhausted');assert.equal(trace.at(-1).activeSide,'player2');
} finally {native.close();}
const cold=open();
try {
  await cold.restoreDependencies(roomId,authority);
  const bundle=await cold.store.loadReplayBundle(roomId);
  const receipts=bundle.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
  const end=await cold.store.loadRoom(roomId);
  const replay=cold.engine.replay({initialEnvelope:bundle.initialEnvelope,journal:receipts});
  assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,end.envelope);assert.equal(receipts.length,5);
  await save(dir+'/entry-turret-cold.json',{roomId,receipts:receipts.length,exactColdReplay:true,stateHash:end.envelope.stateHash});
} finally {cold.close();}
}
async function verifyRoundEnd() {
  const traceRef=dir+'/round-end-trace.json';
  let log=[];
  try {log=await read(traceRef);} catch(e){if(e.code!=='ENOENT') throw e;}
  const prefix=await read(dir+'/entry-turret-cold.json');
  const app=open();
  let end;
  try {
    const seats=await app.create(roomId,authority);
    let room=await app.store.loadRoom(roomId);
    if (room.stateRevision===prefix.receipts) assert.equal(room.envelope.stateHash,prefix.stateHash);
    for(let i=0;i<28;i++) {
      const state=room.envelope.state;
      const currentTurret=state.pieces.find(p=>p.officialUnitRecordKey==='army_units:auto_turret');
      assert(currentTurret);
      if(state.round>1||state.gameOver||state.terminal) break;
      const owner=state.activeSideKey??state.firstPlayerSideKey;
      const legal=await app.room.legalSpace({roomId,seatToken:seats[owner].seatToken});
      assert(legal.ok,legal.reason??legal.code);
      const finite=legal.legalSpace.finiteActions.map(row=>row.action);
      const choices=finite.map(a=>({type:a.actionType,owner:a.sideKey,piece:a.pieceId,first:a.chosenFirstActorSideKey}));
      const preferred=finite.find(a=>a.actionType==='resolve_unit_timed_life'&&a.pieceId===currentTurret.id)
        ??finite.find(a=>a.actionType==='pass')
        ??finite.find(a=>a.actionType==='choose_first_actor'&&a.chosenFirstActorSideKey==='player1')
        ??(finite.length===1?finite[0]:null);
      const step=state.currentProductMatchLifecycle?.step;
      if(!preferred||preferred.actionType==='resolve_current_product_cleanup_refresh'&&currentTurret.isOnField){
        await save(dir+'/round-end-stop-r'+room.stateRevision+'.json',{revision:room.stateRevision,round:state.round,phase:state.phase,step,side:state.activeSideKey,
          turretOnField:currentTurret.isOnField,stateHash:room.envelope.stateHash,choices,domains:legal.legalSpace.parameterDomains.map(d=>({type:d.actionType,piece:d.pieceId}))});
        throw Error(preferred?'FORMAL_CLEANUP_OFFERED_BEFORE_TIMED_LIFE':'NO_DETERMINISTIC_SCENARIO_CHOICE');
      }
      if(preferred.actionType==='resolve_current_product_end_of_round_effects'&&currentTurret.isOnField){
        const preview=runtime.apply(state,preferred,{matchBinding:room.envelope.matchBinding});
        const next=runtime.enumerate(preview.state);
        if(next.candidates.some(a=>a.actionType==='resolve_current_product_cleanup_refresh')){
          await save(dir+'/timed-life-before-fix.json',{revision:room.stateRevision,phase:state.phase,preStateHash:room.envelope.stateHash,
            turretId:currentTurret.id,previewStep:preview.state.currentProductMatchLifecycle.step,nextActions:next.candidates.map(a=>a.actionType)});
          throw Error('FORMAL_END_OF_ROUND_SKIPS_TIMED_LIFE');
        }
      }
      const applied=await app.commit({roomId,credential:seats[owner],operationKey:'round-end-r'+room.stateRevision,kind:'finite',
        select:r=>r.action.sourceActionHash===preferred.sourceActionHash});
      room=await app.store.loadRoom(roomId);
      log.push({revision:room.stateRevision,round:state.round,phase:state.phase,step,side:state.activeSideKey,action:applied.preview.core.action.actionType,
        stateHash:room.envelope.stateHash,turretOnField:room.envelope.state.pieces.find(p=>p.id===currentTurret.id).isOnField});
      await save(traceRef,log);
    }
    end=await app.store.loadRoom(roomId);
    const final=end.envelope.state, turret=final.pieces.find(p=>p.officialUnitRecordKey==='army_units:auto_turret');
    assert.equal(final.round,2);assert.equal(turret.isOnField,false);assert.equal(turret.isRemoved,true);
    const effects=final.log.flatMap(x=>x.events??[]).filter(e=>e.pieceId===turret.id&&e.cause==='timed_life');
    assert.equal(effects.length,1);assert.equal(effects[0].opponentKillAttribution,false);
    assert.equal(final.officialUnitRoundEndHistory.filter(x=>x.pieceId===turret.id&&x.outcome==='timed_life_removed').length,1);
  } finally {app.close();}
  const cold=open();
  try {
    await cold.restoreDependencies(roomId,authority);
    const replay=await cold.store.loadReplayBundle(roomId);
    const receipts=replay.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
    const restored=cold.engine.replay({initialEnvelope:replay.initialEnvelope,journal:receipts});
    assert.equal(restored.ok,true);assert.deepEqual(restored.envelope,end.envelope);
    await save(dir+'/round-end-cold.json',{roomId,round:end.envelope.state.round,receipts:receipts.length,exactColdReplay:true,stateHash:end.envelope.stateHash,
      timedLife:log.find(r=>r.action==='resolve_unit_timed_life'),opponentKillAttribution:false});
  } finally {cold.close();}
}
