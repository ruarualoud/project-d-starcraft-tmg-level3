import assert from 'node:assert/strict';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {read,save,root} from './support/wave3-raven-tabletop-room-v1.mjs';
import {createSqliteStarcraftTmgRoomStore} from '../packages/room-store/sqlite-room-store-v1.mjs';
import {createRosterPlanningProductModuleV1} from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import {createPregameMapEvidencePortV1} from '../packages/roster-strategist/pregame-map-evidence-port-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const base='build/ticket-28-wave3-human-lobby-v1';
const {roomId}=await read(base+'/standard.public.json');
const dir=base+'/rooms-standard/rooms/'+roomId;
const record=await read(dir+'/room.private.json');
const file=path.join(root,dir,'room.sqlite');
const store=createSqliteStarcraftTmgRoomStore({filename:file,database:new DatabaseSync(file,{readOnly:true}),
  encryption:{key:record.storeKey,keyId:roomId+'-store',trustLevel:'development_persistent'}});
try {
  const initial=await store.loadInitialEnvelope(roomId);
  assert.equal(initial.stateRevision,0);
  const product=await createRosterPlanningProductModuleV1({root,operation:'board_queries',wave3MatchSetup:record.releaseSetup,
    referenceArmyRecipes:record.recipes,mapConfiguration:record.mapConfiguration,roomId});
  const live=createPregameMapEvidencePortV1({sourceState:initial.state});
  const expected=live.summarizeMap({queryId:'independent-map'}),actual=product.mapEvidencePort.summarizeMap({queryId:'independent-map'});
  assert.equal(expected.terrain.length,1804);
  assert.deepEqual(actual.terrain,expected.terrain);
  assert.deepEqual(actual.missionMarkers,expected.missionMarkers);
  assert.deepEqual(actual.mapBinding,expected.mapBinding);
  const dep=product.mapEvidencePort.deploymentGeometry({queryId:'independent-deployment'});
  assert.deepEqual(dep.deploymentGeometry,initial.state.officialDeploymentGeometryBinding);
  const identity=product.armyBuilderPort.portDescriptor().releaseBinding;
  assert.equal(identity.manifestHash,product.releaseBinding.manifestHash);
  const lab=product.laboratory.labDescriptor();
  assert.equal(lab.rulesRuntimeHash,product.releaseBinding.runtimeHash);
  const map=await product.teachEvidencePort.query({challengeId:'independent-map',mutationAuthority:false,
    initialFoundationHash:lab.sourceStateHash,sourceHashes:[identity.normalizedDatasetHash],request:{kind:'spatial',
      toolRequest:{queryKind:'map.inspect',argumentsJson:'{}',seatKey:'player1'}}});
  assert.equal(map.sourceReceipt?.queryReceipt?.result.terrain.length,expected.terrain.length);
  const rules=initial.matchBinding;
  assert.equal(lab.rulesRuntimeHash,rules.rulesRuntimeBinding.runtimeHash);
  assert.equal(product.releaseBinding.manifestHash,rules.releaseBinding.manifestHash);
  assert.equal(lab.sourceStateHash,initial.stateHash);
  const report={roomId,roomRevision:0,release:product.releaseBinding,plannerRuntimeEqualsSignedRoom:true,
    signedState:initial.stateHash,laboratoryState:lab.sourceStateHash,mission:record.releaseSetup.missionRecordKey,
    deployment:record.releaseSetup.deploymentRecordKey,terrain:expected.terrain.length,markers:expected.missionMarkers.length,
    mapBindingHash:hash(expected.mapBinding),teachReceipt:map.receiptHash,providerCalls:0};
  await save(base+'/remaining-six/independent-planning-board.public.json',report);
  console.log(JSON.stringify({terrain:report.terrain,markers:report.markers,roomId}));
}finally{store.close();}
