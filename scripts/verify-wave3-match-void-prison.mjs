import assert from 'node:assert/strict';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {restoreOrPreparePositionedStandardOpening,bindWave3StandardActionRoom,assertWave3StandardRoomColdReplayV1} from './support/wave3-standard-action-room-v1.mjs';
const dir='build/ticket-28-wave3-release-wide-phases/void-prison';
const base='build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const reference=await read(base+'/nerazim-standard-2.81.0/coverage.json');
const roomId='standard-void-prison-duration',version='2.99.2';
const scene={positions:{zeratul1:[26,4],watchers2:[20,4]},formationOffsets:{watchers2:[[0,0],[1,0],[0,1],[-1,0]]},
  purpose:'signed cast and end-of-round cleanup; opposing seat passes optional actions'};
const initial=await restoreOrPreparePositionedStandardOpening({dir,roomId,reference,candidateVersion:version,scene});
const bound=await bindWave3StandardActionRoom({manifestRef:reference.manifestRef,initial,dir,candidateVersion:version,scenario:scene});
const native=bound.open();
let stage='opening',revision;
try {
  const seats=await native.create(roomId,bound.authority);
  const otherPhase=bound.runtime.queryAbilityTiming('army_units:nova_assault_mode');
  const skirmish=await read('build/ticket-28-wave3-release-wide-phases/ability-timing.public.json');
  assert.deepEqual(otherPhase.definitions.find(d=>d.name==='Battle Preparation'),skirmish.example);
  await save(dir+'/phase.public.json',{roomId,definition:skirmish.example,army:reference.recipes.player1.factionRecordKey,
    opponent:reference.recipes.player2.factionRecordKey,otherRoom:skirmish.roomId});
  for (;;) {
    const head=await native.store.loadRoom(roomId),state=head.envelope.state;
    revision=head.stateRevision;
    let side=state.activeSideKey;
    let previous;
    try {previous=await read(dir+'/cast.public.json');} catch(e){if(e.code!=='ENOENT')throw e;}
    if (previous && (state.currentProductMatchLifecycle?.step==='determine_initiative'||Number(state.round)>1)) {
      assert(!state.board.markers.some(m=>m.markerId===previous.markerId));
      assert(!state.characteristicAreaEffects?.some(e=>e.markerId===previous.markerId));
      const {latestCheckpoint}=await native.store.loadReplayBundle(roomId);
      assert.equal(latestCheckpoint.stateRevision,revision-1);
      assert(latestCheckpoint.state.board.markers.some(m=>m.markerId===previous.markerId));
      assert(latestCheckpoint.state.characteristicAreaEffects.some(e=>e.markerId===previous.markerId));
      await assertWave3StandardRoomColdReplayV1(bound,bound.authority,roomId,head.envelope,latestCheckpoint);
      await save(dir+'/result.public.json',{roomId,cast:previous,revision,stateHash:head.envelope.stateHash,
        retainedAtRevision:latestCheckpoint.stateRevision,nextStep:state.currentProductMatchLifecycle?.step,
        round:state.round,coldExact:true,providerCalls:0});break;
    }
    let menu;
    for(const owner of (seats[side]?[side]:Object.keys(seats))) {
      const response=await native.room.legalSpace({roomId,seatToken:seats[owner].seatToken});
      assert(response.ok,response.message);
      if(response.legalSpace.parameterDomains.length || response.legalSpace.finiteActions.length) {
        side=owner;menu=response.legalSpace;break;
      }
    }
    assert(menu,'expected an actionable seat');
    const {parameterDomains:d,finiteActions:f}=menu;
    let row, params={};
    const pick=kind=>f.find(r=>r.action.actionType===kind);
    const choose=f.find(r=>r.action.actionType==='choose_first_actor'&&r.action.chosenFirstActorSideKey==='player1');
    if(!previous) {
      row=pick('resolve_mission_start_of_round')??choose;
      if (!row) {
        row=d.find(r=>r.definitionId==='unit:zeratul/void-prison-movement-phase@1'||r.abilityName==='Void Prison');
        if(row) {
          const schema=row.parameterSchema.properties??row.parameterSchema;
          const card=schema.paymentCardInstanceIds;
          params={activeUnitId:'zeratul1',coordinate:{xMilliInches:20000,yMilliInches:4000},
            paymentCardInstanceIds:card.const??(card.choices??card.enum)[0]};
        }
      }
    } else {
      row=d.find(r=>r.actionType==='pass_reaction_family_window')
        ??d.find(r=>r.actionType==='finish_activation')
        ??choose??pick('pass')??pick('pass_phase')??(f.length===1?f[0]:null);
    }
    if (!row||revision>36) throw Error(JSON.stringify({phase:state.phase,side,step:state.currentProductMatchLifecycle?.step,
      domains:d.map(x=>[x.actionType,x.abilityName??x.pieceId]).slice(0,20),finite:f.map(x=>x.action.actionType).slice(0,20)}));
    const type=(row.action??row).actionType;stage=type;
    await native.commit({roomId,credential:seats[side],operationKey:'r'+revision+'-'+type,...(row.domainId?
      {select:r=>r.domainId===row.domainId,parameters:()=>params}:{kind:'finite',select:r=>r.actionKey===row.actionKey})});
    const next=await native.store.loadRoom(roomId);
    if(type==='resolve_characteristic_status_ability' && !previous) {
      const effect=next.envelope.state.characteristicAreaEffects.find(e=>e.sourcePieceId==='zeratul1')??
        next.envelope.state.characteristicAreaEffects.at(-1);
      const marker=next.envelope.state.board.markers.find(m=>m.markerId===effect.markerId);
      assert(marker?.markerId);
      await save(dir+'/cast.public.json',{revision:next.stateRevision,stateHash:next.envelope.stateHash,markerId:marker.markerId});
    }
    console.log('signed',next.stateRevision,type);
  }
} catch(e) {await save(dir+'/stop-'+Date.now()+'.public.json',{revision,stage,error:e.message.slice(0,1200)});throw e;}
finally{native.close();}
