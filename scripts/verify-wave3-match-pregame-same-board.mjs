import assert from 'node:assert/strict';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {openWave3EngineeringStoreV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {bindWave3StandardActionRoom,resolveWave3StandardContext} from './support/wave3-standard-action-room-v1.mjs';
import {createStarcraftTmgSnapshotSceneQueryServiceV1,createStarcraftTmgSceneQueryServiceV1} from '../packages/online-agent-session/scene-query-service-v1.mjs';
import {projectStarcraftTmgBattlefieldPresentationV1} from '../packages/client-domain/battlefield-presentation-v1.mjs';
import {createOfficialRoomRosterDisclosureDataBundleV1} from '../packages/source-data/official-roster-disclosure-data-bundle-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';

const parent='build/ticket-28-wave3-human-lobby-v1/incremental-pass',dir=parent+'/split-fight';
const roomId='standard-split-fight-w3',run=await read(dir+'/result.public.json');
const ref=await read('build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/khassar-supply-standard-2.84.0/coverage.json');
const storage=openWave3EngineeringStoreV1({directory:dir,filename:'room.sqlite',readOnly:true});
let initial;
try{initial=(await storage.loadReplayBundle(roomId)).initialEnvelope.state;}finally{storage.close();}
const bound=await bindWave3StandardActionRoom({manifestRef:ref.manifestRef,initial,dir,candidateVersion:run.version,scenario:run.scene,frozenRuntimeRef:dir+'/runtime.json'});
const native=bound.open();
try{
  await native.restoreDependencies(roomId,bound.authority);
  const head=(await native.store.loadRoom(roomId)).envelope,state=head.state,side=state.activeSideKey;
  assert.equal(head.stateHash,run.after.stateHash);
  const seats=await read(dir+'/'+roomId+'.seats.private.json');
  const input={roomId,seatToken:seats[side].seatToken};
  const {projection}=await native.room.readRoom(input),{legalSpace}=await native.room.legalSpace(input);
  const live=createStarcraftTmgSceneQueryServiceV1({roomStore:native.store,rulesRuntime:bound.rulesRuntime,seatKey:side});
  const frozenHash=hash(state);
  const pregame=createStarcraftTmgSnapshotSceneQueryServiceV1({state,rulesRuntime:bound.rulesRuntime,seatKey:side,matchBinding:head.matchBinding,sceneScope:{kind:'pregame_reference',sourceStateHash:frozenHash,baseStateHash:frozenHash}});
  const board=projectStarcraftTmgBattlefieldPresentationV1({roomProjection:projection,legalSpace});
  const checks=[];
  for(const piece of state.pieces.filter(p=>p.isOnField))for(const model of piece.models.filter(m=>m.isOnField&&!m.isDestroyed)){
    const display=board.models.find(m=>m.id===model.id);
    assert(display,model.id);
    assert.deepEqual([display.xMilliInches,display.yMilliInches],[Math.round(model.xInches*1000),Math.round(model.yInches*1000)]);
    checks.push(display.id);
  }
  assert(checks.length>0);
  async function compare(request,field){
    const [a,b]=await Promise.all([live.query({roomProjection:projection,legalSpace,request}),pregame.query(request)]);
    assert.equal(a.authority.stateHash,head.stateHash);
    assert.equal(b.authority.stateHash,frozenHash);
    assert(['exact','advisory_estimate'].includes(a.status),request.queryKind+' '+JSON.stringify([a.status,a.reason,a.details]));
    assert.equal(a.status,b.status);
    assert(a.result[field]!==undefined,field);
    assert.deepEqual(a.result[field],b.result[field]);
    return {query:request.queryKind,field,precision:a.status,dataHash:hash(a.result[field]),roomReceipt:a.queryReceiptHash,pregameReceipt:b.queryReceiptHash};
  }
  const controls=process.argv.includes('--probability-only')?null:await compare({queryKind:'mission_marker_control',arguments:{}},'markerResults');
  if(controls)assert.equal(controls.dataHash,hash(run.after.markers));
  const evidence=[controls];
  const domain=legalSpace.parameterDomains.find(d=>d.actionType==='fight'&&d.constraints?.targetUnitIds?.includes('zealot')&&d.constraints.declineCloseRanksAttackDice>0);
  assert(domain,'expected a selectable melee weapon');
  {
    const params={closeRanksMode:'decline',allocations:[{targetUnitId:'zealot',dice:domain.constraints.declineCloseRanksAttackDice}]};
    for(const key of ['surgeTargetUnitId','criticalTargetUnitId'])if(domain.parameterSchema.required.includes(key))params[key]='zealot';
    const request={queryKind:'attack_probability',arguments:{domainId:domain.domainId,parameters:params}};
    if(process.argv.includes('--probability-only')){
      const probability=await compare(request,'outcomes');
      const previous=await read(parent+'/same-board.public.json');
      assert.equal(probability.dataHash,previous.evidence.find(r=>r.query==='attack_probability').dataHash);
      await save(parent+'/final-probability.public.json',{stateHash:head.stateHash,probability,providerCalls:0});
    }else evidence.push(await compare(request,'outcomes'));
  }
  if(!process.argv.includes('--probability-only')){
  const manifest=await read(ref.manifestRef);
  const context=await resolveWave3StandardContext(manifest,'area_ability_inputs');
  const bundle=createOfficialRoomRosterDisclosureDataBundleV1({releaseContext:context,dataset:context.dataset,snapshot:context.snapshot}).unitCompositionUpgradeDataBundle;
  const builder=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:bundle,releaseContext:context});
  const menu=builder.enumerateArmyBuildingChoices({factionRecordKey:ref.recipes.player1.factionRecordKey,scaleId:'Standard',mineralBudget:2000});
  assert.equal(menu.releaseBinding.manifestHash,manifest.manifestHash);
  assert.equal(head.matchBinding.releaseBinding.releaseId,menu.releaseBinding.releaseId);
  assert.equal(head.matchBinding.releaseBinding.sourceSnapshotHash,context.dataset.sourceSnapshotHash);
  assert.equal(menu.releaseBinding.sourceSnapshotHash,context.dataset.sourceSnapshotHash);
  const record={roomId,revision:head.stateRevision,stateHash:head.stateHash,version:run.version,boardModels:checks,markers:run.after.markers.length,
    evidence,builder:menu.releaseBinding,roomRelease:head.matchBinding.releaseBinding,providerCalls:0,
    scope:'actual board presenter, live query, pregame scene service and Army Builder port. No end-to-end Plan/Teach or provider request.'};
  await save(parent+'/same-board.public.json',record);
  console.log(record.boardModels.length,record.markers,evidence.map(r=>r.query));
  }
}finally{native.close();}
