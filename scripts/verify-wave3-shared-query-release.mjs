import assert from 'node:assert/strict';
import {root,read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {bindWave3StandardActionRoom} from './support/wave3-standard-action-room-v1.mjs';
import {openWave3EngineeringStoreV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {createStarcraftTmgSceneQueryServiceV1} from '../packages/online-agent-session/scene-query-service-v1.mjs';
import {spatialQueryReceiptRejectionV1} from '../packages/online-agent-session/spatial-query-receipt-contract-v1.mjs';
import {createActiveSandboxSpatialQueryV1} from '../packages/strategy-skills/active-sandbox-spatial-query-v1.mjs';
import {isStarcraftTmgBattleWorkbenchSnapshotV1} from '../packages/client-domain/battle-workbench-v1.mjs';
import {projectCompanionRoomContextV1} from '../packages/product-composition/companion-room-context-v1.mjs';
import {createOfficialRoomRosterDisclosureDataBundleV1} from '../packages/source-data/official-roster-disclosure-data-bundle-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {createRosterTeachEvidencePortV1} from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import {createRosterPlanningBoardLaboratoryV1,createRosterPlanningProductModuleV1} from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import {assertOfficialReleaseQueryBindingV2} from '../packages/source-data/official-release-context-v2.mjs';
import path from 'node:path';
import {createStarcraftProductServerV1} from './serve-starcraft-product-v1.mjs';
import {ROSTER_PLANNING_WORKSPACE_API_PREFIX} from '../packages/roster-planning-workspace/roster-planning-workspace-http-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';

const roomId='photon-reserve-on-human-map-299';
const dir='build/ticket-28-wave3-human-lobby-v1/remaining-six/'+roomId;
const out='build/ticket-28-wave3-shared-query-release-v1';
const setup=(await read('content/wave3-human-match-setups-v1.json')).find(s=>s.scale==='Standard');
const opening=await read(dir+'/opening.json');
const expected=await read(dir+'/result.public.json');
const store=openWave3EngineeringStoreV1({directory:dir,filename:'room.sqlite',readOnly:true});
let initial;
try {initial=(await store.loadInitialEnvelope(roomId)).state;} finally {store.close();}
const bound=await bindWave3StandardActionRoom({manifestRef:setup.releaseRef,initial,dir,
  candidateVersion:opening.version,scenario:opening.scene,frozenRuntimeRef:dir+'/runtime.json'});
const native=bound.open({readOnly:true});
const checkpoint=out+'/steps.public.json';
const passed=process.argv.includes('--resume') ? await read(checkpoint) : {};
async function step(name,check) {
  if(Object.hasOwn(passed,name)) return;
  passed[name]=await check();
  await save(checkpoint,passed);
}
try {
  await native.restoreDependencies(roomId,bound.authority);
  const head=await native.store.loadRoom(roomId);
  assert.equal(head.envelope.stateHash,expected.stateHash);
  const side=head.envelope.state.activeSideKey;
  const token=(await read(dir+'/'+roomId+'.seats.private.json'))[side].seatToken;
  const credential={roomId,seatToken:token};
  const {projection}=await native.room.readRoom(credential);
  const {legalSpace}=await native.room.legalSpace(credential);
  const input={roomProjection:projection,legalSpace};
  const {releaseBinding}=projection.matchBinding;
  const conflict={...releaseBinding,runtimeHash:'0'.repeat(64)};
  const options={roomStore:native.store,rulesRuntime:bound.rulesRuntime,seatKey:side};
  const workerEvents=[];
  const live=createStarcraftTmgSceneQueryServiceV1({...options,observeQueryBatchDiagnostic:e=>workerEvents.push(e)});
  const request={queryKind:'mission_marker_control',arguments:{}};
  const checkReceipt = (receipt, precision = 'exact') => {
    assert.equal(receipt.status,precision,JSON.stringify([receipt.reason,receipt.details]));
    assert.deepEqual(receipt.authority.releaseBinding,releaseBinding);
    assert.equal(receipt.mayApply,false);
    return hash(receipt.result);
  };
  await step('rules_and_pregame',async()=>{
    const room=await live.query({...input,request});
    const resultHash=checkReceipt(room);
    assert.equal(spatialQueryReceiptRejectionV1({input,request,receipt:room}),null);
    const {context}=bound;
    const {unitCompositionUpgradeDataBundle}=createOfficialRoomRosterDisclosureDataBundleV1({
      releaseContext:context,dataset:context.dataset,snapshot:context.snapshot});
    const builder=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle,releaseContext:context});
    const builderRelease=builder.portDescriptor().releaseBinding;
    for(const [k,v] of Object.entries(builderRelease)) assert.equal(releaseBinding[k],v);
    const lab=createRosterPlanningBoardLaboratoryV1({rulesRuntime:bound.rulesRuntime,armyBuilderPort:builder,
      sourceState:head.envelope.state,sourceRoomRef:{roomId,stateRevision:head.stateRevision},matchBinding:head.envelope.matchBinding});
    const evidence=await createRosterTeachEvidencePortV1(lab).query({challengeId:'w3-12-marker-control',
      mutationAuthority:false,initialFoundationHash:head.envelope.stateHash,sourceHashes:[builderRelease.normalizedDatasetHash],
      request:{kind:'spatial',toolRequest:{queryKind:request.queryKind,argumentsJson:'{}',seatKey:side}}});
    const plan=evidence.sourceReceipt?.queryReceipt;
    assert.ok(plan,evidence.unknownReasonCode);
    assert.equal(checkReceipt(plan),resultHash);
    assert.equal(plan.authority.sceneScope.kind,'pregame_reference');
    return {builderRelease,resultHash,roomReceipt:room.queryReceiptHash,teachReceipt:evidence.receiptHash,scene:plan.authority.sceneScope.kind};
  });
  await step('scoped_review_and_workbench',async()=>{
    const sandbox=createActiveSandboxSpatialQueryV1(options);
    const result=await sandbox.query({projection,legalSpace,request:{kind:'spatial',...request}});
    assert.equal(checkReceipt(result),passed.rules_and_pregame.resultHash);
    assert.equal(result.authority.sceneScope.kind,'isolated_exploration');
    const {snapshot}=await native.room.readBattleWorkbench(credential);
    const companion=projectCompanionRoomContextV1(projection,snapshot);
    assert.deepEqual(companion.workbench.releaseBinding,releaseBinding);
    assert.throws(()=>projectCompanionRoomContextV1(projection,{...snapshot,stateRevision:snapshot.stateRevision-1}),/COMPANION_ROOM_CONTEXT_STALE/);
    assert.throws(()=>projectCompanionRoomContextV1(projection,{...snapshot,releaseBinding:conflict}),/RELEASE_QUERY_BINDING_MISMATCH/);
    return {scope:result.authority.sceneScope.kind,receipt:result.queryReceiptHash,workbench:snapshot.snapshotHash,seat:companion.viewer.seatKey};
  });
  await step('worker_and_stale_snapshot',async()=>{
    const state=head.envelope.state;
    const actor=state.pieces.find(p=>p.officialUnitRecordKey==='army_units:raynor_s_raider__marine_');
    const relationship={queryKind:'space.inspect_relationships',arguments:{subjectUnitIds:['anchor'],targetIds:[actor.id],intent:'measure'}};
    const [receipt,second]=await live.queryBatch({...input,requests:[relationship,{...relationship,arguments:{...relationship.arguments,subjectUnitIds:[actor.id],targetIds:['anchor']}}]});
    checkReceipt(receipt,'advisory_estimate');checkReceipt(second,'advisory_estimate');
    assert(workerEvents.some(e=>e.workerCount>0),JSON.stringify(workerEvents.map(e=>[e.stage,e.workerCount])));
    assert(!workerEvents.some(e=>e.stage==='query_worker_local_recovery'));
    let revision=head.stateRevision;
    const changingStore={async loadRoom(){return {...head,stateRevision:revision};}};
    let changed=false;
    const racing=createStarcraftTmgSceneQueryServiceV1({...options,roomStore:changingStore,observeQueryBatchDiagnostic:e=>{
      if(e.stage==='query_worker_batch_closed'){revision++;changed=true;}
    }});
    const [invalidated]=await racing.queryBatch({...input,requests:[relationship,{...relationship,arguments:{...relationship.arguments,intent:'also measure'}}]});
    assert(changed);assert.equal(invalidated.status,'unknown');
    assert.match(invalidated.reason,/AUTHORITY_CHANGED/);
    return {count:2,workerCount:Math.max(...workerEvents.map(e=>e.workerCount||0)),resultHash:hash(receipt.result),staleReason:invalidated.reason};
  });
  await step('release_and_cache_isolation',async()=>{
    const wrong={...projection,matchBinding:{...projection.matchBinding,releaseBinding:conflict}};
    assert.throws(()=>live.actionSpace({...input,roomProjection:wrong}),/RELEASE_QUERY_BINDING_MISMATCH/);
    await assert.rejects(()=>live.query({...input,roomProjection:wrong,request}),/RELEASE_QUERY_BINDING_MISMATCH/);
    assert.throws(()=>live.actionSpace({...input,roomProjection:{...projection,viewer:{...projection.viewer,seatKey:side==='player1'?'player2':'player1'}}}),/VIEWER_SEAT_MISMATCH/);
    assert.throws(()=>createStarcraftTmgSceneQueryServiceV1({...options,releaseBinding:conflict}),/RELEASE_QUERY_BINDING_MISMATCH/);
    assert.throws(()=>assertOfficialReleaseQueryBindingV2({expectedBinding:releaseBinding,aggregate:{envelope:{matchBinding:projection.matchBinding,releaseBinding:conflict}}}),/RELEASE_QUERY_BINDING_MISMATCH/);
    const receipt=await live.query({...input,request});
    assert.equal(spatialQueryReceiptRejectionV1({input,request,receipt:{...receipt,authority:{...receipt.authority,releaseBinding:conflict}}}),'authority_releaseBinding');
    let current=head;
    const service=createStarcraftTmgSceneQueryServiceV1({...options,roomStore:{async loadRoom(){return current;}}});
    checkReceipt(await service.query({...input,request}));
    current={...head,stateRevision:head.stateRevision+1};
    const stale=await service.query({...input,request});
    assert.equal(stale.status,'unknown');assert.equal(stale.reason,'RULES_QUERY_AUTHORITY_STALE');
    const local=await service.query({...input,request:{queryKind:'base_edge_distance',arguments:{}}});
    assert.equal(local.reason,stale.reason);
    assert.equal((await native.store.loadRoom(roomId)).envelope.stateHash,expected.stateHash);
    return {crossReleaseRejected:true,otherSeatRejected:true,cacheStale:stale.reason,localStale:local.reason};
  });
  await step('workspace_and_retained_scene',async()=>{
    const server=await createStarcraftProductServerV1({dataDirectory:path.join(root,out,'workspace'),
      fixtureRoot:root,mapConfiguration:{seedId:setup.seedId},offlineWave3MatchVersion:opening.version,liveEnabled:false});
    try {
      const configured=server.host.planningInputsForSetup(setup.id);
      const boardInput={root,...configured,operation:'board_queries'};
      const board=await createRosterPlanningProductModuleV1(boardInput);
      const map=board.mapEvidencePort.summarizeMap({queryId:'w3-reference-map'});
      assert.deepEqual(map.releaseBinding,board.releaseBinding);
      assert.equal(map.resultStatus,'certified_map_summary');
      assert.deepEqual(board.laboratory.labDescriptor().releaseBinding,board.releaseBinding);
      assert.equal(board.releaseBinding.normalizedDatasetHash,releaseBinding.normalizedDatasetHash);
      assert.equal(configured.wave3MatchSetup.version,opening.version);
      // No model, no Apply. Change only the phase of a hypothetical reference scene.
      const spec={kind:'hypothetical_geometry',phase:'movement',activeSideKey:'player1',preservePositions:true,placements:[]};
      const branch=board.laboratory.runScenarioBranch({branchId:'w3-reference-movement',spec});
      assert.deepEqual(branch.releaseBinding,board.releaseBinding);
      await save(out+'/reference-branch.public.json',branch);
      const cold=await createRosterPlanningProductModuleV1(boardInput);
      const saved=await read(out+'/reference-branch.public.json');
      const restored=cold.laboratory.restoreHypotheticalBranch({receipt:saved,spec});
      assert.equal(restored.receiptHash,branch.receiptHash);
      const {receiptHash:originalHash,...wrongSource}=saved;
      wrongSource.releaseBinding={...saved.releaseBinding,manifestHash:'0'.repeat(64)};
      assert.throws(()=>cold.laboratory.restoreHypotheticalBranch({receipt:{...wrongSource,
        receiptHash:hash(wrongSource)},spec}),/OFFICIAL_RELEASE_QUERY_BINDING_MISMATCH/);
      const response=await fetch(server.origin+ROSTER_PLANNING_WORKSPACE_API_PREFIX+'/catalogue');
      const body=await response.json();
      assert.equal(body.error,'WAVE3_PLANNING_QUALIFIED_STRATEGY_RELEASE_REQUIRED');
      assert.equal(server.liveDeliberationAttached,false);
      return {version:opening.version,mapReceipt:map.receiptHash,release:board.releaseBinding,
        originalHash,restoredHash:restored.receiptHash,wrongSourceRejected:true,fullPlanningBoundary:body.error};
    } finally {await server.close();}
  });
  await step('older_caller_and_web_reader',async()=>{
    const authority=live.actionSpace(input).authority;
    const {releaseBinding:original,...olderCaller}=authority;
    assert.deepEqual(original,releaseBinding);
    const result=await live.rulesQueryAdapter.query({authority:olderCaller,...request});
    assert.equal(result.precision,'exact');
    assert.deepEqual(result.authority.releaseBinding,releaseBinding);
    const {snapshot}=await native.room.readBattleWorkbench(credential);
    const scope={roomId,releaseBinding,viewerSideKey:side,stateRevision:head.stateRevision};
    assert.equal(isStarcraftTmgBattleWorkbenchSnapshotV1(snapshot,scope),true);
    assert.equal(isStarcraftTmgBattleWorkbenchSnapshotV1(snapshot,{...scope,releaseBinding:conflict}),false);
    assert.equal(isStarcraftTmgBattleWorkbenchSnapshotV1(snapshot,{...scope,viewerSideKey:side==='player1'?'player2':'player1'}),false);
    const workspace={dataDirectory:path.join(root,out,'workspace'),fixtureRoot:root,mapConfiguration:{seedId:setup.seedId},
      offlineWave3MatchVersion:opening.version,liveEnabled:false};
    await assert.rejects(()=>createStarcraftProductServerV1({...workspace,wave3MatchSetup:{...setup,version:'2.84.0'}}),
      /PRODUCT_PLANNING_SETUP_VERSION_MISMATCH/);
    const app=await createStarcraftProductServerV1(workspace);
    try {
      const response=await fetch(app.origin+ROSTER_PLANNING_WORKSPACE_API_PREFIX+'/catalogue');
      assert.equal(response.status,409);
      assert.equal((await response.json()).error,'WAVE3_PLANNING_QUALIFIED_STRATEGY_RELEASE_REQUIRED');
    } finally {await app.close();}
    return {signedMatchHash:olderCaller.matchBindingHash,resultHash:hash(result.result),webSeat:side,
      incompatibleSetupRejected:true,unqualifiedPlanningStatus:409};
  });
  await save(out+'/result.public.json',{roomId,revision:head.stateRevision,stateHash:expected.stateHash,version:opening.version,releaseBinding,passed,providerCalls:0});
  console.log(JSON.stringify({roomId,version:opening.version,revision:head.stateRevision,passed:Object.keys(passed)}));
} catch(error) {
  await save(out+'/stop-'+Date.now()+'.public.json',{passed:Object.keys(passed),reason:error.message.slice(0,1500)});
  throw error;
} finally {native.close();}
