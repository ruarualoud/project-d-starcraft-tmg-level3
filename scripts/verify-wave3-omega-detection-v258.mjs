import assert from 'node:assert/strict';
import {read, save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {bindWave3StandardActionRoom, resolveWave3StandardContext} from './support/wave3-standard-action-room-v1.mjs';
import {declareWave3EngineeringCoherencyV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {initializeOfficialMatchRoundSupplyV1} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {refreshOfficialRoundSupplyOccupancyV1} from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import {prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY} from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import {createOfficialModelBaseFootprintV1, evaluateOfficialPhysicalFootprintRelationV1} from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const dir = base + '/omega-detection-v258';
const mode = process.argv[2];
assert(['baseline','verify'].includes(mode));
const version = mode === 'baseline' ? '2.57.0' : '2.58.0';
const id = 'unit:omega_worm/detection-any-phase@1';
const cardId = 'card:kerrigan_s_swarm/omega-network-any@1';
const actor = 'kerrigan', target = 'nova_stealth_mode';
const lookup = (state, key) => state.pieces.find(p => p.id === key);
const getWorm = state => state.pieces.find(p => p.officialUnitRecordKey === 'army_units:omega_worm');
const hidden = p => p.statuses.some(s => String(typeof s === 'string' ? s : s.statusName || s.name).toLowerCase() === 'hidden');

function place(state, key, x) {
  const p = lookup(state, key);
  assert.equal(p.models.length, 1);
  const position = {isOnField:true, xInches:x/1000, yInches:4};
  Object.assign(p, position, {isInReserves:false, deploymentStatus:'deployed', leadingModelId:p.models[0].id});
  Object.assign(p.models[0], position);
  state.reserveManifestBySide[p.sideKey].find(r => r.pieceId === key).deploymentStatus = 'deployed';
}
function setMovement(state, side, round) {
  Object.assign(state,{stage:'activation_phases',phase:'movement',round,activeSideKey:side,firstPlayerSideKey:side});
  state.phaseFirstActorByRound[round + ':movement'] = {phase:'movement',round,chosenFirstActorSideKey:side,markerHolderSideKey:side};
  delete state.selectedRosterActivationWindow;
}
function sealPositions(state, scene) {
  declareWave3EngineeringCoherencyV1(state,{planIdPrefix:scene});
  const previous=state.officialRoundSupplyState;
  if(previous.round === state.round) state.officialRoundSupplyState = refreshOfficialRoundSupplyOccupancyV1({state});
  else initializeOfficialMatchRoundSupplyV1(state,true);
}
function footprint(state, p) {
  return createOfficialModelBaseFootprintV1({piece:p,model:p.models[0],dataBundle:state.officialModelBaseGeometryDataBundle});
}
function gap(state) {
  const left=footprint(state,getWorm(state)), right=footprint(state,lookup(state,target));
  return evaluateOfficialPhysicalFootprintRelationV1({left,right}).minimumSeparationMilliInches;
}
function positionForGap(state, desired) {
  let lo=6000,hi=26000;
  const test=structuredClone(state);
  while(hi-lo>1) {
    const x=Math.floor((hi+lo)/2);
    place(test,target,x);
    if(gap(test)<desired) lo=x; else hi=x;
  }
  place(test,target,hi);
  assert.equal(gap(test),desired);
  return hi;
}
async function replay(bound, authority, roomId, revision, envelope) {
  const cold=bound.open();
  try {
    await cold.restoreDependencies(roomId,authority);
    const bundle=await cold.store.loadReplayBundle(roomId);
    const journal=bundle.privateJournal.filter(e=>e.payload.type==='accepted_transition').map(e=>e.payload.payload.receipt);
    assert.equal(journal.length,revision);
    const replay=cold.engine.replay({initialEnvelope:bundle.initialEnvelope,journal});
    assert(replay.ok,replay.reason); assert.deepEqual(replay.envelope,envelope);
  } finally {cold.close();}
}
async function run() {
  const source=await read(base+'/inherited-zerg-standard-2.53.0/malignant.json');
  const context=await resolveWave3StandardContext(await read(source.manifestRef),'area_ability_inputs');
  const {state:opening}=prepareOfficialStandardReleaseOpeningV2({releaseMatchVersion:version,releaseContext:context,
    dataset:context.dataset,snapshot:context.snapshot, recipes:source.recipes,missionRecordKey:source.mission,
    deploymentRecordKey:source.deployment,armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY});
  const producer=opening.officialSelectedRosterAbilitySourceBundle.routes.find(r=>r.definitionId===cardId);
  assert(producer); assert(!getWorm(opening));
  const detection=opening.officialCharacteristicStatusFamilySourceBundle.routes.find(r=>r.definitionId===id);
  if(mode==='baseline') {
    assert(!detection);
    await save(dir+'/before.json',{version,producer:cardId,producerHash:producer.sourceFeatureHash,
      generatedDefinition:id,detectorRegistered:false,roomAlreadyContainsGeneratedUnit:false,modelCalls:0});
    return;
  }
  const before=await read(dir+'/before.json');
  assert.equal(producer.sourceFeatureHash,before.producerHash);
  assert.equal(detection.rangeMilliInches,6000);
  const scenario={twoHumanSeats:true,declaredPhase:'movement',baseline:before.version};
  const bound=await bindWave3StandardActionRoom({initial:opening,manifestRef:source.manifestRef,candidateVersion:version,dir:dir+'/sized',scenario});
  const native=bound.open();
  try {
    const initial=structuredClone(opening);
    setMovement(initial,'player2',1);
    place(initial,actor,12000); place(initial,target,24000); sealPositions(initial,'omega-summon-');
    const roomId='omega-detection-v258-sized-summon',authority=bound.authorityFor(initial,scenario);
    const seats=await native.create(roomId,authority);
    let head=await native.store.loadRoom(roomId);
    if(head.stateRevision===0) {
      await native.commit({roomId,credential:seats.player2,operationKey:'summon',
        select:d=>d.actionType==='use_active_ability'&&d.effectKind==='omega_network'&&d.pieceId===actor,
        parameters:d=>({activeUnitId:actor,paymentCardInstanceIds:d.parameterSchema.paymentCardInstanceIds.enum[0],
          xMilliInches:6000,yMilliInches:4000})});
      head=await native.store.loadRoom(roomId);
    }
    const state=head.envelope.state,worm=getWorm(state);
    assert.equal(head.stateRevision,1); assert(worm?.isStructure); assert.equal(worm.currentSupply,0);
    assert.equal(worm.sizeCharacteristic,opening.officialSelectedRosterAbilitySourceBundle.omegaWormTemplate.sizeCharacteristic);
    assert.equal(worm.structureRules.specialAbilitiesDisabledThroughRound,1);
    const sourceHash=head.envelope.stateHash;
    const alreadySaved=await read(dir+'/summon.json').catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
    if(alreadySaved) assert.equal(alreadySaved.stateHash,sourceHash);
    else {
      await replay(bound,authority,roomId,head.stateRevision,head.envelope);
      await save(dir+'/summon.json',{roomId,revision:head.stateRevision,stateHash:sourceHash,generatedUnitId:worm.id,generatedSource:cardId,
        detectionDefinition:id,featureHash:detection.sourceFeatureHash,creationRound:state.round,coldExact:true});
    }
    const conditional=structuredClone(state);
    const query=(s)=>bound.runtime.queryWeaponCharacteristics(s,target,{}).result;
    const savedSamples=await read(dir+'/sampled-boundaries.json').catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
    if(savedSamples) assert.equal(savedSamples.sourceHash,sourceHash);
    const samples=savedSamples?.samples ?? [];
    // The shared geometry kernel rounds to milli-inches and includes a one-milli-inch tolerance.
    if(!savedSamples) for(const [round,distance,expected] of [[1,6000,false],[2,6002,false],[2,6001,true],[2,6000,true],[2,5999,true]]) {
      setMovement(conditional,'player1',round); place(conditional,target,positionForGap(conditional,distance));
      const result=query(conditional);
      assert.equal(result.hiddenSuppressedByDetection,expected,JSON.stringify({round,distance,sources:result.detectingSourcePieceIds}));
      assert.equal(result.detectingSourcePieceIds.includes(worm.id),result.hiddenSuppressedByDetection);
      samples.push({round,measuredGapMilliInches:gap(conditional),detected:result.hiddenSuppressedByDetection});
    }
    if(!savedSamples) await save(dir+'/sampled-boundaries.json',{samples,sourceHash,rangeMilliInches:detection.rangeMilliInches});
    const start=structuredClone(state);
    setMovement(start,'player1',2); place(start,actor,28000); place(start,target,positionForGap(start,6750));
    if(!hidden(lookup(start,target))) lookup(start,target).statuses.push('hidden');
    sealPositions(start,'omega-probe-');
    const nextRoom='omega-detection-v258-next-round-'+start.supplyLossLedger.ledgerHash.slice(0,12);
    const nextAuthority=bound.authorityFor(start,{...scenario,parentRoom:roomId,parentStateHash:sourceHash,
      conditionalRound:2,summonerXMilliInches:28000,declaredHiddenTarget:target,declaredEntryGap:6750});
    const grants=await native.create(nextRoom,nextAuthority);
    let result=await native.store.loadRoom(nextRoom);
    assert(!query(start).hiddenSuppressedByDetection);
    if(result.stateRevision===0) {
      const x=positionForGap(start,5999);
      await native.commit({roomId:nextRoom,credential:grants.player1,operationKey:'move-into-detection',
        choice:{pieceId:target,actionType:'move'},parameters:()=>({leadingModelId:lookup(start,target).models[0].id,
          path:[{xMilliInches:x,yMilliInches:4000,elevation:'ground'}],placements:[]})});
      result=await native.store.loadRoom(nextRoom);
    }
    const end=result.envelope.state;
    const removed=end.officialDetectionHiddenLossHistory?.find(e=>e.targetPieceId===target&&e.detectingSources.some(s=>s.definitionId===id&&s.pieceId===worm.id));
    assert(removed);assert(!hidden(lookup(end,target)));
    assert.equal(gap(end),5999);
    const menu=await native.room.legalSpace({roomId:nextRoom,seatToken:grants[end.activeSideKey].seatToken});
    assert(menu.ok);assert(menu.legalSpace.parameterDomains.length+menu.legalSpace.finiteActions.length>0);
    await replay(bound,nextAuthority,nextRoom,result.stateRevision,result.envelope);
    await save(dir+'/result.json',{version,parentRoom:roomId,parentStateHash:sourceHash,roomId:nextRoom,
      conditionalRound:2,fromGap:6750,endGap:gap(end),samples,removed,hiddenAfter:false,
      revision:result.stateRevision,stateHash:result.envelope.stateHash,coldExact:true,modelCalls:0});
  }finally{native.close();}
}
try {await run();} catch(e) {
  await save(dir+'/'+mode+'-stop-'+Date.now()+'.json',{error:e.message,code:e.code,stage:e.failureStage,stack:e.stack?.split('\n').slice(0,6)});
  throw e;
}
