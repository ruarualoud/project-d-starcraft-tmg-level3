import assert from 'node:assert/strict';
import path from 'node:path';
import { root, read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom, resolveWave3StandardContext } from './support/wave3-standard-action-room-v1.mjs';
import { declareWave3EngineeringCoherencyV1, openWave3EngineeringStoreV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { createOfficialReleaseMatchRuntimeV2 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY }
  from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { verifyOfficialBattlefieldTokenV1 } from '../packages/rule-atoms/official-battlefield-token-marker-rules-kernel-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const previous = base + '/ravager-deep-tunnel-v242';
const dir = base + '/ravager-bile-placement-v243';
const gate = await read(previous + '/opening.json');
const wallSource = 'build/ticket-28-protoss-wave3-20261120-v1/force-wall-cast/checkpoint-r1.json';
const baseline = process.argv[2] === 'baseline';
assert(baseline || process.argv[2] === 'candidate');
const store = openWave3EngineeringStoreV1({ directory: path.join(root,previous,'movement'), filename:'room.sqlite' });
let initial;
try { initial = (await store.loadReplayBundle('ravager-tunnel-direct-movement')).initialEnvelope; }
finally { store.close(); }
assert.equal(hash(initial.state), initial.stateHash);
const wallRoom = await read(wallSource);
assert.equal(hash(wallRoom.state), wallRoom.stateHash);
const context = await resolveWave3StandardContext(await read(gate.sourceManifest), 'area_ability_inputs');
const version = baseline ? gate.version : '2.43.0';
let state = structuredClone(initial.state);
if (!baseline) {
  const { state: fresh } = prepareOfficialStandardReleaseOpeningV2({
    releaseContext: context, dataset: context.dataset, snapshot: context.snapshot, releaseMatchVersion: version,
    recipes: await read(gate.recipesRef), armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
    missionRecordKey: state.officialMissionRuntimeState.missionRecordKey,
    deploymentRecordKey: state.officialDeploymentGeometryBinding.deploymentRecordKey,
  });
  assert.deepEqual(fresh.pieces.map(p => [p.id,p.officialUnitRecordKey]),state.pieces.map(p => [p.id,p.officialUnitRecordKey]));
  for (const key of ['phase','stage','firstPlayerSideKey','activeSideKey','phaseFirstActorByRound']) fresh[key]=structuredClone(state[key]);
  const ravager=fresh.pieces.find(p=>p.id==='ravager');
  const sourceActor=state.pieces.find(p=>p.id===ravager.id);
  for (const key of ['isOnField','isInReserves','deploymentStatus','leadingModelId']) ravager[key]=sourceActor[key];
  for (const model of ravager.models) model.isOnField=sourceActor.models.find(m=>m.id===model.id).isOnField;
  fresh.reserveManifestBySide[ravager.sideKey].find(row=>row.pieceId===ravager.id).deploymentStatus=ravager.deploymentStatus;
  fresh.officialRoundSupplyState=createOfficialRoundSupplyStateV1({ state:fresh, missionSupplyProfile:fresh.officialMissionSupplyProfile,
    rulesRuntimeHash:fresh.officialMissionRuntimeDescriptor.runtimeHash });
  for (const seat of ['player1','player2']) fresh.players[seat].supply=fresh.officialRoundSupplyState.supplyPoolBySide[seat];
  state=fresh;
}
const actor = state.pieces.find(p => p.id === 'ravager');
const side = actor.sideKey;
assert.equal(actor.models.length, 1);
Object.assign(actor, { xInches:18,yInches:18 });
Object.assign(actor.models[0], { xInches:18,yInches:18 });
declareWave3EngineeringCoherencyV1(state, { planIdPrefix:'bile-map-geometry' });
assert.deepEqual(state.board.tokens, []);
const walls = wallRoom.state.board.tokens.filter(t => t.tokenKind === 'force_wall');
assert.deepEqual(walls.map(t => [t.coordinate.x,t.coordinate.y,t.baseWidthMm,t.baseDepthMm,t.baseRotationDegrees]),
  [[22,28,100,40,90],[24,25,100,40,0]]);
for (const t of walls) verifyOfficialBattlefieldTokenV1(t, state.officialBattlefieldTokenMarkerRegistry);
state.board.tokens = structuredClone(walls);
state.officialBattlefieldAssetBindings = [...(state.officialBattlefieldAssetBindings || []),
  ...wallRoom.state.officialBattlefieldAssetBindings.filter(b => walls.some(t => t.tokenId === b.assetId))];
const wall = state.board.terrain.find(t => t.id === 'std-ordinary-west');
assert.deepEqual([wall.footprint.minXMilliInches,wall.footprint.maxXMilliInches,wall.footprint.minYMilliInches,wall.footprint.maxYMilliInches],
  [14000,16000,16000,18000]);
// The two strips are a declared conditional scene using the product's terrain-cell format.
// A 32 mm token fits in the 1.6 inch opening between them.
// Ordinary terrain is otherwise passable. Declare this controlled obstacle as impassable.
wall.blocksPlacement = true;
wall.footprintCells = [{ ...wall.footprint,maxXMilliInches:14200 },{ ...wall.footprint,minXMilliInches:15800 }];
const scenario = { actorPositionInches:[18,18],cells:wall.footprintCells,sourceRoom:initial.roomId,
  sourceHash:initial.stateHash,wallSource,wallStateHash:wallRoom.stateHash,scope:'isolated_placement_geometry' };
const runtime = baseline ? createOfficialReleaseMatchRuntimeV2({context,state:initial.state,candidateVersion:version}) : null;
function parameters(menu,x,y) {
  return { placements:[{modelId:actor.models[0].id,xMilliInches:x,yMilliInches:y}],
    paymentCardInstanceIds:menu.parameterSchema.paymentCardInstanceIds.choices[0] };
}
const samples = [
  {name:'oval_clear',x:24000,y:26650},
  {name:'rotated_wall_overlap',x:22000,y:30000,error:'CORROSIVE_BILE_TOKEN_OVERLAP'},
  {name:'terrain_gap',x:15000,y:17000},
  {name:'terrain_cell_overlap',x:14300,y:17000,error:'CORROSIVE_BILE_TERRAIN_OVERLAP'},
];
if (baseline) {
  assert.equal(runtime.descriptor.runtimeHash,gate.runtimeHash);
  const evidence=[];
  for (const [label,current,subset] of [['with_walls',state,samples.slice(0,2)],['terrain_only',{...state,board:{...state.board,tokens:[]}},samples.slice(2)]]) {
    const domain=runtime.enumerate(current).parameterDomains.find(d=>d.actionType==='set_corrosive_bile'&&d.pieceId===actor.id);
    for (const s of subset) {
      let reason=null;
      try { runtime.queryCorrosiveBilePlacement(current,actor.id,parameters(domain,s.x,s.y)); } catch(error) { reason=error.message; }
      evidence.push({scene:label,sample:s.name,x:s.x,y:s.y,reason});
    }
  }
  console.log(JSON.stringify(evidence));
  assert(evidence[0].reason?.startsWith('MODEL_BASE_GEOMETRY_ROUND_BASE_INVALID'));
  assert.equal(evidence[2].reason,'CORROSIVE_BILE_TERRAIN_OVERLAP');
  await save(dir+'/baseline.json',{version,runtimeHash:runtime.descriptor.runtimeHash,scenario,evidence});
} else {
  const bound=await bindWave3StandardActionRoom({manifestRef:gate.sourceManifest,initial:state,dir,candidateVersion:version,scenario});
  const authority=bound.authorityFor(state,scenario);
  const roomId='ravager-bile-physical-geometry';
  const native=bound.open();
  try {
    const seats=await native.create(roomId,authority);
    const original=(await native.store.loadReplayBundle(roomId)).initialEnvelope;
    const expectedTerrain = initial.state.board.terrain.map(piece => piece.id === wall.id
      ? { ...piece, blocksPlacement: true, footprintCells: wall.footprintCells } : piece);
    assert.deepEqual(original.state.board.terrain, expectedTerrain, 'compare both boards after Room normalization');
    const input={roomId,seatToken:seats[side].seatToken};
    const checkpointRef=dir+'/previews.json';
    const checkpoint=await read(checkpointRef).catch(error=>{
      if (error.code!=='ENOENT') throw error;
      return {version,runtimeHash:bound.runtime.descriptor.runtimeHash,sourceHash:original.stateHash,observed:[]};
    });
    assert.equal(checkpoint.sourceHash,original.stateHash);
    assert.equal(checkpoint.runtimeHash,bound.runtime.descriptor.runtimeHash);
    const observed=checkpoint.observed;
    const space=await native.room.legalSpace(input);
    assert(space.ok,space.message);
    const domain=space.legalSpace.parameterDomains.find(d=>d.actionType==='set_corrosive_bile'&&d.pieceId===actor.id);
    for(const s of samples){
      if (observed.some(row=>row.sample===s.name)) continue;
      const p=parameters(domain,s.x,s.y);
      const query=()=>bound.runtime.queryCorrosiveBilePlacement(original.state,actor.id,p);
      const preview=await native.room.previewAction({...input,proposal:{kind:'parameterized',domainId:domain.domainId,parameters:p},
        expectedStateRevision:original.stateRevision,expectedStateHash:original.stateHash,
        expectedMatchBindingHash:original.matchBindingHash,expectedLegalSpaceHash:space.legalSpace.legalSpaceHash});
      if(s.error){
        assert.throws(query,error=>error.message===s.error);
        assert.equal(preview.ok,false);
        assert((preview.message||preview.reason).includes(s.error),JSON.stringify(preview));
      }else{
        assert(preview.ok,preview.message);
        assert.deepEqual(preview.preview.core.action.sourceAction,query().result.action);
      }
      observed.push({sample:s.name,coordinate:[s.x,s.y],accepted:preview.ok,reason:preview.ok?null:preview.message});
      assert.equal((await native.store.loadRoom(roomId)).envelope.stateHash,original.stateHash);
      await save(checkpointRef,checkpoint);
    }
    const placed=await native.commit({roomId,credential:seats[side],operationKey:'bile-on-free-ground',
      choice:{pieceId:actor.id,actionType:'set_corrosive_bile'},parameters:d=>parameters(d,24000,26650)});
    const final=(await native.store.loadRoom(roomId)).envelope;
    const token=final.state.board.tokens.find(t=>t.tokenKind==='corrosive_bile');
    assert.deepEqual(token.coordinate,{x:24,y:26.65});
    assert.deepEqual(final.state.board.tokens.filter(t=>t.tokenKind==='force_wall'),walls);
    const paidCards=placed.preview.core.action.sourceAction.sourceAction.canonicalParameters.paymentCardInstanceIds;
    assert(paidCards.length>0 && paidCards.every(id=>final.state.cardResources[side].find(c=>c.cardInstanceId===id)?.readiness==='exhausted'));
    const next=await native.room.legalSpace(input);
    assert(next.ok&&next.legalSpace.parameterDomains.some(d=>d.actionType==='move'));
    await save(dir+'/placed.json',{stateHash:final.stateHash,revision:final.stateRevision,token:token.tokenId,
      coordinate:token.coordinate,successor:'move',paid:true,idempotent:placed.idempotentReplayVerified});
    const cold=bound.open();
    try{
      await cold.restoreDependencies(roomId,authority);
      const replay=await cold.store.loadReplayBundle(roomId);
      const journal=replay.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
      const rebuilt=cold.engine.replay({initialEnvelope:replay.initialEnvelope,journal});
      assert(rebuilt.ok,rebuilt.reason);assert.deepEqual(rebuilt.envelope,final);
      await save(dir+'/result.json',{version,runtimeHash:bound.runtime.descriptor.runtimeHash,samples:observed,roomId,
        stateHash:final.stateHash,receipts:journal.length,coldExact:true,modelCalls:0});
    }finally{cold.close();}
  }catch(error){
    await save(dir+'/stop-'+Date.now()+'.json',{roomId,version,message:error.message});
    throw error;
  }finally{native.close();}
}
