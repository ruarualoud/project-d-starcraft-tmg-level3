import assert from 'node:assert/strict';
import path from 'node:path';
import { root, registry, read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { moveParameters } from './verify-wave3-nova-holo-decoy-v1.mjs';
import { createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createOfficialReleaseMatchRuntimeV2 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { declareWave3EngineeringCoherencyV1, createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';

const base='build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const out=base+'/nova-holo-standard-v233';
const branch=process.argv.at(-1);
const fixed=process.argv.includes('--fixed-catalogue');
assert((fixed?['menu','place','skip','remove']:['prefix','place','skip','remove']).includes(branch));
const version=fixed?'2.34.0':'2.33.0';
const dir=out+(fixed?'/catalogue-v234/':'/')+branch;
const roomId='wave3-nova-formal-round-end-'+branch;
const hero='nova_assault_mode';
const ability='unit:nova_assault_mode/holo-decoy-movement-phase@1';
const transport={player1:'card:dropship/ready-for-dust-off-any@1',player2:'card:overlord/ventral-sacs-any@1'};
const factory=await read(out+'/assets/factory-state.json');
const initial=structuredClone(factory);
for (const id of [hero,'zergling']) {
  const piece=initial.pieces.find(row=>row.id===id);
  Object.assign(piece,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',leadingModelId:piece.models[0].id});
  initial.reserveManifestBySide[piece.sideKey].find(row=>row.pieceId===id).deploymentStatus='deployed';
  for(const [index,model] of piece.models.entries()){
    const angle=2*Math.PI*(index-1)/Math.max(1,piece.models.length-1);
    Object.assign(model,{isOnField:true,xInches:(id===hero?10:39)+(index?Math.round(2700*Math.cos(angle))/1000:0),
      yInches:10+(index?Math.round(2700*Math.sin(angle))/1000:0)});
  }
}
declareWave3EngineeringCoherencyV1(initial,{planIdPrefix:'v233-m01-'});
initial.officialRoundSupplyState=createOfficialRoundSupplyStateV1({state:initial,missionSupplyProfile:initial.officialMissionSupplyProfile,rulesRuntimeHash:initial.supplyLossLedger.rulesRuntimeHash});
for(const side of ['player1','player2']) initial.players[side].supply=initial.officialRoundSupplyState.supplyPoolBySide[side];
async function resolve(manifest,purpose) {
  const product=registry();
  try {
    product.resolver.register(manifest);
    const [current,mission]=await Promise.all([purpose,'mission_source'].map(purpose=>product.resolver.resolve({releaseId:manifest.releaseId,purpose})));
    return {...current,resources:{...current.resources,...mission.resources}};
  } finally {product.close();}
}
const original=await read(base+'/tabletop-raven-m01-v1/manifest.json');
const source=await resolve(original,'area_ability_inputs');
const runtimeDescriptor=createOfficialReleaseMatchRuntimeV2({context:source,state:initial,candidateVersion:version}).descriptor;
const ref=await save(dir+'/runtime.json',runtimeDescriptor);
const manifest=createOfficialReleaseManifestV2({releaseId:original.releaseId,dataset:source.dataset,snapshot:source.snapshot,
  datasetRef:original.source.datasetRef,snapshotRef:original.source.snapshotRef,sourceRevisionRef:original.source.sourceRevisionRef,
  sourceRevision:await read(original.source.sourceRevisionRef),sourcePolicy:original.source.policy,referenceSources:original.source.references,
  components:{...original.components,rulesRuntime:{ref,version:runtimeDescriptor.runtimeVersion,integrity:{field:'runtimeHash',value:runtimeDescriptor.runtimeHash}}}});
const context=await resolve(manifest,'area_ability_component');
const runtime=createOfficialReleaseMatchRuntimeV2({context,state:initial,boundRuntimeManifest:manifest});
assert.deepEqual(runtime.descriptor,runtimeDescriptor);
let fork=null;
if (fixed) {
  const prior=await read(out+'/prefix/runtime.json');
  assert.deepEqual(createOfficialReleaseMatchRuntimeV2({context:source,state:initial,candidateVersion:'2.33.0'}).descriptor,prior);
  const originalRoom=openWave3EngineeringRoomV1({directory:path.join(root,out,'prefix'),filename:'room.sqlite',rulesRuntime:bindOfficialReleaseRulesRuntimeV2({context,runtime})});
  try { fork=await originalRoom.store.loadRoom('wave3-nova-formal-round-end-prefix'); } finally { originalRoom.close(); }
  const stop=await read(out+'/prefix/r20-catalogue-stop.json');
  assert.equal(fork.stateRevision,stop.revision); assert.equal(fork.envelope.stateHash,stop.stateHash);
} else if (branch!=='prefix') { fork=await read(out+'/prefix/choice.json'); }
const start=fork?fork.envelope.state:initial;
const authority=createWave3ComponentEngineeringAuthorityV1({context,state:start,scenario:{scope:'standard_nova_holo_2.33',branch,
  source:out+'/assets/factory-state.json',declaredStartingPositions:[hero,'zergling'],forkStateHash:fork?.envelope.stateHash??null}});
const open=()=>openWave3EngineeringRoomV1({directory:path.join(root,dir),filename:branch==='menu'?':memory:':'room.sqlite',
  rulesRuntime:bindOfficialReleaseRulesRuntimeV2({context,runtime})});
const native=open();
function semantic(domain,parameters) {return {select:row=>row.domainId===domain.domainId,parameters:()=>parameters};}
function finite(action) {
  assert(action?.sourceActionHash,'expected a finite action from the current public menu');
  return {kind:'finite',select:row=>row.action.sourceActionHash===action.sourceActionHash};
}
function nextPrefix(state,options,domains) {
  const side=state.activeSideKey ?? state.firstPlayerSideKey;
  const card=transport[side];
  const marker=domains.find(row=>row.definitionId===card);
  const placed=state.officialBattlefieldAssetBindings?.some(row=>row.sourceDefinitionId===card);
  if (state.phase==='movement' && marker && !placed) return semantic(marker,{activeUnitId:marker.pieceId,paymentCardInstanceIds:[],
    coordinate:{xMilliInches:side==='player1'?12000:38000,yMilliInches:24000}});
  const cast=domains.find(row=>row.definitionId===ability);
  const child=state.pieces.find(row=>row.officialUnitRecordKey==='army_units:holo_decoy');
  if (state.phase==='movement' && cast && !child) {
    const actor=state.pieces.find(row=>row.id===hero).models[0];
    const profile=state.officialModelBaseGeometryDataBundle.profiles.find(row=>row.recordKey==='army_units:holo_decoy');
    return semantic(cast,{activeUnitId:hero,paymentCardInstanceIds:cast.parameterSchema.paymentCardInstanceIds.enum[0],
      coordinate:{xMilliInches:Math.round(actor.xInches*1000+(actor.baseWidthInches*1000+profile.baseWidthMilliInches)/2),
        yMilliInches:Math.round(actor.yInches*1000)}});
  }
  const decline=options.find(a=>a.actionType==='decline_summoned_move');
  if (decline) return finite(decline);
  const window=state.selectedRosterActivationWindow;
  const finish=domains.find(d=>d.actionType==='finish_activation'&&d.pieceId===window?.pieceId);
  if (finish) return semantic(finish,{});
  const move=domains.find(d=>d.actionType==='move'&&d.pieceId===hero&&d.pieceId===window?.pieceId);
  if (move) return semantic(move,moveParameters(state.pieces.find(row=>row.id===hero),-1000,0));
  const first=options.find(a=>a.actionType==='choose_first_actor'&&a.chosenFirstActorSideKey==='player1')
    ??options.find(a=>a.actionType==='pass_reaction_family_window')??options.find(a=>a.actionType==='pass')
    ??(options.length===1?options[0]:null);
  assert(first,'unexpected menu: '+JSON.stringify(options.map(a=>a.actionType)));
  return finite(first);
}
try {
  const seats=await native.create(roomId,authority);
  for(let count=0;count<36;count++) {
    const room=await native.store.loadRoom(roomId),state=room.envelope.state,side=state.activeSideKey ?? state.firstPlayerSideKey;
    const reply=await native.room.legalSpace({roomId,seatToken:seats[side].seatToken});
    assert(reply.ok,JSON.stringify(reply));
    const domains=reply.legalSpace.parameterDomains;
    const options=reply.legalSpace.finiteActions.map(row=>row.action);
    await save(dir+'/last-menu.json',{revision:room.stateRevision,phase:state.phase,side,
      choices:options.map(a=>[a.actionType,a.pieceId]),domains:domains.map(d=>[d.actionType,d.definitionId,d.pieceId]),
      units:state.pieces.map(p=>[p.id,p.officialUnitRecordKey]),assets:state.officialBattlefieldAssetBindings?.map(b=>b.sourceDefinitionId)});
    const surprise=domains.find(d=>d.actionType==='choose_holo_surprise');
    const remove=options.find(a=>a.actionType==='resolve_unit_timed_life');
    const decline=options.find(a=>a.actionType==='decline_current_product_round_end_opportunity');
    let command;
    if (branch==='menu') {
      assert(surprise && remove && decline,'both Holo effects and the owner’s transport must be selectable');
      await save(dir+'/public-menu.json',{version,sourceRevision:fork.stateRevision,sourceHash:fork.envelope.stateHash,finite:options.map(a=>a.actionType),domains:domains.map(d=>d.actionType),oldDescriptorExact:true});
      break;
    }
    if (branch==='prefix') {
      if(state.currentProductMatchLifecycle?.step==='round_end_choices'){
        assert.equal(side,state.firstPlayerSideKey);
        assert(state.pieces.some(p=>p.summonParentPieceId===hero && p.officialUnitRecordKey==='army_units:holo_decoy'));
        assert.deepEqual(state.pendingBattlefieldAssetOpportunities.map(v=>v.sourceDefinitionId).sort(),Object.values(transport).sort());
        await save(dir+'/choice.json',{revision:room.stateRevision,envelope:room.envelope});
        break;
      }
      command=nextPrefix(state,options,domains);
    } else if(state.currentProductMatchLifecycle?.step==='cleanup_and_refresh'){
      command=finite(options.find(a=>a.actionType==='resolve_current_product_cleanup_refresh'));
    } else if(state.round>1 || state.currentProductMatchLifecycle?.step==='determine_initiative'){
      assert((state.officialHoloRoundEndHistory || []).some(h=>h.outcome==='timed_life_removed'));
      break;
    } else if (side==='player1' && (remove||surprise)) {
      const child=state.pieces.find(row=>row.officialUnitRecordKey==='army_units:holo_decoy');
      if (remove && surprise) {
        assert(decline,'own asset should remain selectable alongside both Holo effects');
        const p=child.models[0];
        const place={choice:'place',targetUnitId:hero,coordinate:{xMilliInches:Math.round(p.xInches*1000)+1600,yMilliInches:Math.round(p.yInches*1000)}};
        if (branch==='remove') {
          const prepared=await native.room.previewAction({roomId,seatToken:seats[side].seatToken,
            proposal:{kind:'parameterized',domainId:surprise.domainId,parameters:place},expectedStateRevision:room.stateRevision,
            expectedStateHash:room.envelope.stateHash,expectedMatchBindingHash:room.envelope.matchBindingHash,
            expectedLegalSpaceHash:reply.legalSpace.legalSpaceHash});
          assert(prepared.ok,JSON.stringify(prepared));
          await save(dir+'/stale-action.json',prepared.preview.core.action);
          command=finite(remove);
        } else command=semantic(surprise,branch==='place'?place:{choice:'skip'});
      } else {assert(remove && !surprise);command=finite(remove);}
    } else {
      assert(!surprise && !remove && decline);
      if(branch==='remove' && side==='player1'){
        const stale=await read(dir+'/stale-action.json');
        assert.throws(()=>runtime.apply(state,stale),/STALE|UNAVAILABLE/);
      }
      command=finite(decline);
    }
    await native.commit({roomId,credential:seats[side],operationKey:'r'+room.stateRevision,...command});
  }
  const end=await native.store.loadRoom(roomId),state=end.envelope.state;
  assert(branch==='menu' || (branch==='prefix'?Boolean(await read(dir+'/choice.json')):state.round>1||state.currentProductMatchLifecycle?.step==='determine_initiative'));
  const child=state.pieces.find(p=>p.officialUnitRecordKey==='army_units:holo_decoy');
  const heroX=state.pieces.find(p=>p.id===hero).models[0].xInches;
  if (branch!=='prefix' && branch!=='menu') {
    assert(child.isDestroyed && child.currentSupply===0);
    const originalX=start.pieces.find(p=>p.id===hero).models[0].xInches;
    assert.equal(heroX,branch==='place'?(Math.round(child.models[0].xInches*1000)+1600)/1000:originalX);
    assert.deepEqual(state.officialHoloRoundEndHistory.map(h=>h.outcome).sort(),
      ['timed_life_removed',branch==='remove'?'source_not_on_battlefield':branch].sort());
    const events=state.log.flatMap(row=>row.events || []);
    assert.equal(events.filter(event=>event.type==='holo_timed_life_removed').at(-1)?.opponentKillAttribution,false);
    const choices=events.filter(event=>event.type==='holo_surprise_resolved');
    assert.deepEqual(choices.map(event=>event.choice),branch==='remove'?[]:[branch]);
  }
  await save(dir+'/result.json',{branch,revision:end.stateRevision,stateHash:end.envelope.stateHash,heroX,round:state.round,
    outcomes:state.officialHoloRoundEndHistory?.map(row=>row.outcome)??[]});
} finally { native.close(); }
if (branch==='menu') process.exit(0);
const cold=open();
try {
  await cold.restoreDependencies(roomId,authority);
  const bundle=await cold.store.loadReplayBundle(roomId);
  const receipts=bundle.privateJournal.filter(row=>row.payload.type==='accepted_transition').map(row=>row.payload.payload.receipt);
  const end=await cold.store.loadRoom(roomId);
  const replay=cold.engine.replay({initialEnvelope:bundle.initialEnvelope,journal:receipts});
  assert(replay.ok);assert.deepEqual(replay.envelope,end.envelope);
  await save(dir+'/cold.json',{receipts:receipts.length,exact:true,stateHash:end.envelope.stateHash});
} finally {cold.close();}
