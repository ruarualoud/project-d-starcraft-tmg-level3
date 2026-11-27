import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { openWave3EngineeringStoreV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { bindWave3StandardActionRoom, assertWave3StandardRoomColdReplayV1 } from './support/wave3-standard-action-room-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const sourceId = 'adept-own-shade-standard-2.84';
const sourceDir = base + '/' + sourceId;
const roomId = 'adept-round-end-place';
const dir = 'build/ticket-28-wave3-human-lobby-v1/remaining-six/' + roomId;
const source = openWave3EngineeringStoreV1({directory: sourceDir, filename:'room.sqlite', readOnly:true});
let head, initial;
try {
  head = (await source.loadRoom(sourceId)).envelope;
  initial = (await source.loadReplayBundle(sourceId)).initialEnvelope.state;
} finally {source.close();}
const signed = await read(sourceDir + '/r4.json');
assert.equal(head.stateHash, signed.stateHash);
const prior = await read(sourceDir + '/result.json');
const roster = await read(base + '/khassar-supply-standard-2.84.0/coverage.json');
const scenario = {parent:sourceId, revision:head.stateRevision, stateHash:head.stateHash, condition:'cleanup entrance; paid shade and all piece positions from r4'};
const bound = await bindWave3StandardActionRoom({manifestRef:roster.manifestRef, initial, dir, candidateVersion:prior.version, scenario, frozenRuntimeRef:sourceDir+'/runtime.json'});
const start = structuredClone(head.state);
start.phase='cleanup';start.stage='activation_phases';start.activeSideKey=start.firstPlayerSideKey;
delete start.currentProductMatchLifecycle;
assert(!start.selectedRosterActivationWindow);
const authority = bound.authorityFor(start, scenario);
const room=bound.open();
const pose = state=>state.pieces.find(p=>p.id==='adept').models.filter(m=>m.isOnField&&!m.isDestroyed).map(m=>({modelId:m.id,xMilliInches:Math.round(1000*m.xInches),yMilliInches:Math.round(1000*m.yInches)}));
let revision;
try {
  const seats=await room.create(roomId,authority);
  for(;;){
    const current=(await room.store.loadRoom(roomId)).envelope;
    const state=current.state, side=state.activeSideKey??state.firstPlayerSideKey;
    revision=current.stateRevision;
    const {legalSpace:menu}=await room.room.legalSpace({roomId,seatToken:seats[side].seatToken});
    const names=menu.finiteActions.map(f=>f.action.actionType);
    const selection=state.resolvedPsionicTransferRoundEnd?.find(x=>x.tokenId===prior.tokenId);
    if(selection && !state.board.tokens.some(t=>t.tokenId===prior.tokenId)){
      const placement=await read(dir+'/placement.json');
      assert.equal(selection.choice,'place');
      assert.deepEqual(pose(state),placement.placements);
      assert.notDeepEqual(pose(start),pose(state));
      assert(state.psionicTransferCleanupHistory.some(x=>x.tokenIds.includes(prior.tokenId)));
      assert(menu.finiteActions.length+menu.parameterDomains.length>0);
      const actions=await assertWave3StandardRoomColdReplayV1(bound,authority,roomId,current);
      await save(dir+'/result.public.json',{scenario,roomId,version:prior.version,revision,actions,from:pose(start),to:pose(state),
        tokenId:prior.tokenId,removed:true,successor:names,coldExact:true,stateHash:current.stateHash,providerCalls:0});
      break;
    }
    assert(revision<16);
    const domain=menu.parameterDomains.find(d=>d.actionType==='choose_psionic_transfer_round_end'&&d.pieceId==='adept');
    if(domain){
      const token=state.board.tokens.find(t=>t.tokenId===prior.tokenId);
      const actor=state.pieces.find(p=>p.id==='adept');
      const old=pose(state);
      const pitch=Math.ceil(1000*Math.max(...actor.models.filter(m=>m.isOnField&&!m.isDestroyed)
        .map(m=>Math.max(m.baseWidthInches,m.baseDepthInches))))+100;
      const raw=bound.runtime.enumerate(state,{sideKey:side}).parameterDomains.find(d=>d.domainId===domain.domainId);
      let chosen;
      const refusals=new Set();
      // Keep every base within coherency of the token, including the fourth model.
      const step=Math.PI/4;
      const minRadius=Math.ceil(pitch/(2*Math.sin(step/2)));
      for(const radius of [minRadius,minRadius+150,minRadius+300]){
        for(const startAngle of [Math.PI,0,Math.PI/2,3*Math.PI/2]){
          const placements=old.map((m,i)=>({modelId:m.modelId,
            xMilliInches:Math.round(token.coordinate.x*1000+radius*Math.cos(startAngle+i*step)),
            yMilliInches:Math.round(token.coordinate.y*1000+radius*Math.sin(startAngle+i*step))}));
          const candidate={choice:'place',placementPlan:{leadingModelId:actor.models[0].id,placements}};
          try{bound.runtime.instantiate(state,raw,candidate,{sideKey:side});chosen=candidate;break;}
          catch(error){if(!/COHERENCY|GEOMETRY|OVERLAP|COLLISION|PLACEMENT|ENDPOINT/.test(error.message))throw error;refusals.add(error.message);}
        }
        if(chosen)break;
      }
      assert(chosen,'sampled positions unavailable: '+[...refusals].join(','));
      await save(dir+'/placement.json',chosen.placementPlan);
      await room.commit({roomId,credential:seats[side],operationKey:'place',select:d=>d.domainId===domain.domainId,parameters:()=>chosen});
      continue;
    }
    const preference=['begin_psionic_transfer_round_end','complete_psionic_transfer_round_end','determine_current_product_mission_marker_control',
      'resolve_mission_scorable_objectives','resolve_mission_end_game_check','resolve_current_product_end_of_round_effects','resolve_current_product_cleanup_refresh'];
    const row=preference.map(name=>menu.finiteActions.find(f=>f.action.actionType===name)).find(Boolean)
      ??menu.finiteActions.find(f=>f.action.actionType.includes('decline')&&f.action.actionType.includes('round_end'))
      ??(menu.finiteActions.length===1&&!menu.parameterDomains.length?menu.finiteActions[0]:null);
    assert(row,'unexpected actions '+JSON.stringify(names));
    await room.commit({roomId,credential:seats[side],operationKey:'r'+revision,kind:'finite',select:f=>f.actionKey===row.actionKey});
  }
}catch(error){await save(dir+'/stop-'+Date.now()+'.public.json',{revision,reason:error.message});throw error;}
finally {room.close();}
