import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom } from './support/wave3-standard-action-room-v1.mjs';
import { openWave3EngineeringStoreV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { createOfficialRoomRosterDisclosureDataBundleV1 } from '../packages/source-data/official-roster-disclosure-data-bundle-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import { createRosterPlanningBoardLaboratoryV1 } from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import { createStarcraftTmgSceneQueryServiceV1 } from '../packages/online-agent-session/scene-query-service-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';

const evidence='build/ticket-28-wave3-human-lobby-v1/remaining-six';
const dir=evidence+'/raider-reserve-on-human-map';
const source=await read(dir+'/result.public.json');
const {roomId}=source;
const opening=await read(dir+'/opening.json');
const store=openWave3EngineeringStoreV1({directory:dir,filename:'room.sqlite',readOnly:true});
let initial;
try {initial=(await store.loadReplayBundle(roomId)).initialEnvelope.state;} finally {store.close();}
const bound=await bindWave3StandardActionRoom({manifestRef:source.releaseRef,initial,dir,
  candidateVersion:source.version,scenario:opening.scene,frozenRuntimeRef:dir+'/runtime.json'});
const native=bound.open();
try {
  await native.restoreDependencies(roomId,bound.authority);
  const head=(await native.store.loadRoom(roomId)).envelope;
  assert.equal(head.stateHash,source.stateHash);
  const side=head.state.activeSideKey;
  const seats=await read(dir+'/'+roomId+'.seats.private.json');
  const credential={roomId,seatToken:seats[side].seatToken};
  const {projection}=await native.room.readRoom(credential);
  const {legalSpace}=await native.room.legalSpace(credential);
  const live=createStarcraftTmgSceneQueryServiceV1({roomStore:native.store,rulesRuntime:bound.rulesRuntime,seatKey:side});
  const {context}=bound;
  const {unitCompositionUpgradeDataBundle}=createOfficialRoomRosterDisclosureDataBundleV1({
    releaseContext:context,dataset:context.dataset,snapshot:context.snapshot});
  const port=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle,releaseContext:context});
  const lab=createRosterPlanningBoardLaboratoryV1({sourceState:head.state,
    sourceRoomRef:{roomId,stateRevision:head.stateRevision},rulesRuntime:bound.rulesRuntime,
    armyBuilderPort:port,matchBinding:head.matchBinding});
  const teach=createRosterTeachEvidencePortV1(lab);
  const receipts=[];
  async function compare(kind,args) {
    const [room,assessment]=await Promise.all([
      live.query({roomProjection:projection,legalSpace,request:{queryKind:kind,arguments:args}}),
      teach.query({challengeId:'web-map-'+kind.replaceAll('.','-'),mutationAuthority:false,initialFoundationHash:head.stateHash,
        sourceHashes:[context.dataset.datasetHash],request:{kind:'spatial',
          toolRequest:{queryKind:kind,argumentsJson:JSON.stringify(args),seatKey:side}}})]);
    const plan=assessment.sourceReceipt?.queryReceipt;
    assert.equal(room.authority.stateHash,source.stateHash);
    assert.equal(plan?.status,room.status,JSON.stringify([room.reason,assessment.unknownReasonCode]));
    assert(['exact','advisory_estimate'].includes(room.status),JSON.stringify([kind,room.reason,room.details]));
    assert.deepEqual(plan.result,room.result);
    receipts.push({kind,args,precision:room.status,resultHash:hash(room.result),roomReceipt:room.queryReceiptHash,
      teachReceipt:assessment.receiptHash});
    return room.result;
  }
  const map=await compare('map.inspect',{});
  assert(map.terrain.length && map.baseProfileIds.length && map.missionMarkers.length);
  const route=await compare('map.route_access',{sideId:side,baseId:map.baseProfileIds[0],targetId:map.missionMarkers[0].targetId});
  assert.equal(route.resultStatus,'certified_reachability_audit');
  assert.equal(route.exactMoveOrDeploymentLegality,false);
  await save(evidence+'/planning-web-map.public.json',{roomId,revision:head.stateRevision,stateHash:head.stateHash,
    openingManifest:source.sourceManifest,roomManifest:context.manifest.manifestHash,terrain:map.terrain.length,
    markerCount:map.missionMarkers.length,receipts,providerCalls:0});
} catch(error) {
  await save(evidence+'/planning-web-map-stop-'+Date.now()+'.public.json',{roomId,stateHash:source.stateHash,reason:error.message});
  throw error;
} finally {native.close();}
