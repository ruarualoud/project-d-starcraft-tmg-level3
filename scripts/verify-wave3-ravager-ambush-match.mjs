import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { restoreOrPreparePositionedStandardOpening, bindWave3StandardActionRoom, assertWave3StandardRoomColdReplayV1 } from './support/wave3-standard-action-room-v1.mjs';
import { wave3HumanMapConfiguration } from '../packages/product-composition/wave3-human-match-v1.mjs';

const version = '2.88.0', actor = 'ravager';
const ability = 'unit:ravager/burrow-ambush-movement-phase@1';
const base = 'build/ticket-28-wave3-human-lobby-v1/zerg-definitions-288';
const admission = await read(base+'/ravager.public.json');
const setup = (await read('content/wave3-human-match-setups-v1.json')).find(s=>s.scale==='Standard');
assert.equal(admission.version,version);
assert.equal(admission.manifestHash,setup.sourceHash);
const roomId = 'zerg-bindings-287-ravager', dir = base+'/ambush';
const reference = {...admission, manifestRef:setup.releaseRef, total:admission.definitions.length};
const scene = {positions:{}, providerCalls:0, purchasedAbility:ability};

function chooseGroundPlacement(state, domain, runtime) {
  const [id] = domain.parameterSchema.placements.exactModelIds;
  assert.deepEqual(domain.parameterSchema.placements.exactModelIds,[id]);
  const previousErrors = new Set();
  for (const segment of state.officialDeploymentGeometryBinding.entryEdgesByPlayer.player2.segments) {
    if (!domain.parameterSchema.entrySegmentId.enum.includes(segment.segmentId)) continue;
    const horizontal = ['top','bottom'].includes(segment.side);
    for (const fraction of [0.5,0.25,0.75]) {
      const along = segment.startInches + fraction*(segment.endInches-segment.startInches);
      for (const distance of [4,8,12,15]) {
        const x = horizontal ? along : segment.side==='left' ? distance : state.board.widthInches-distance;
        const y = !horizontal ? along : segment.side==='bottom' ? distance : state.board.heightInches-distance;
        const params = {leadingModelId:id,entrySegmentId:segment.segmentId,
          placements:[{modelId:id,xMilliInches:Math.round(1000*x),yMilliInches:Math.round(1000*y),elevation:'ground'}]};
        try {
          runtime.instantiate(state,domain,params,{sideKey:'player2'});
          return params;
        } catch(e) {
          if (!/PLACEMENT_OVERLAP|PLACEMENT.*TERRAIN|OUTSIDE_BOARD|ENTRY_SEGMENT_EXCEEDED|PLACEMENT_OUT_OF_BOUNDS/.test(e.message)) throw e;
          previousErrors.add(e.message);
        }
      }
    }
  }
  throw Error('No legal point in the sampled entry positions: '+[...previousErrors].join(', '));
}

let revision;
try {
  const initial = await restoreOrPreparePositionedStandardOpening({dir,roomId,reference,candidateVersion:version,scene,mapConfiguration:wave3HumanMapConfiguration(setup)});
  const bound = await bindWave3StandardActionRoom({dir,initial,manifestRef:setup.releaseRef,candidateVersion:version,scenario:scene});
  const native = bound.open();
  try {
    const seats = await native.create(roomId,bound.authority);
    for (;;) {
      const head = (await native.store.loadRoom(roomId)).envelope, state = head.state;
      revision = head.stateRevision;
      const sideKey = state.activeSideKey, credential = seats[sideKey], target = state.pieces.find(u=>u.id===actor);
      const menu = await native.room.legalSpace({roomId,seatToken:credential.seatToken});
      assert(menu.ok,menu.message);
      const {parameterDomains,finiteActions} = menu.legalSpace;
      if (target.isOnField) {
        const proof = await read(dir+'/selected.public.json');
        const [p] = proof.parameters.placements;
        assert.equal(revision,3);
        assert.equal(sideKey,'player1');
        assert.equal(target.isInReserves,false);
        assert.equal(target.activatedPhases.movement,true);
        assert.equal(target.models[0].xInches,p.xMilliInches/1000);
        assert.equal(target.models[0].yInches,p.yMilliInches/1000);
        assert(parameterDomains.length || finiteActions.length);
        const actions = await assertWave3StandardRoomColdReplayV1(bound,bound.authority,roomId,head);
        await save(dir+'/result.public.json',{roomId,version,ability,revision,actions,coldExact:true,nextSeat:sideKey,providerCalls:0,
          stateHash:head.stateHash,source:proof.source,entry:proof.parameters,remainingModels:target.currentModels,
          supply:target.currentSupply,activated:target.activatedPhases.movement,occupancy:state.officialRoundSupplyState.onTableSupplyBySide});
        console.log('r'+revision,'reserve placement and cold replay passed');
        break;
      }
      assert(revision<3);
      const operationKey = 'ambush-r'+revision;
      if (revision<2) {
        const wanted = revision===0?'resolve_mission_start_of_round':'choose_first_actor';
        await native.commit({roomId,credential,operationKey,kind:'finite',select:f=>f.action.actionType===wanted &&
          (revision===0 || (f.action.chosenFirstActorSideKey??f.action.sourceAction?.chosenFirstActorSideKey)==='player2')});
      } else {
        assert.equal(sideKey,'player2');
        const offered = parameterDomains.find(d=>d.definitionId===ability && d.pieceId===actor);
        assert(offered,'purchased Burrow Ambush not offered to Ravager');
        assert.equal(offered.constraints.maxDistanceMilliInches,18000);
        assert.equal(offered.constraints.minimumEnemyGapMilliInchesExclusive,10000);
        const domain = bound.runtime.enumerate(state,{sideKey}).parameterDomains.find(d=>d.domainId===offered.domainId);
        assert(domain);
        const parameters = chooseGroundPlacement(state,domain,bound.runtime);
        const source = admission.definitions.find(d=>d.id===ability).hash;
        assert.equal(state.officialRelocationFamilySourceBundle.routes.find(r=>r.definitionId===ability).sourceFeatureHash,source);
        await save(dir+'/selected.public.json',{revision,source,parameters,constraints:offered.constraints});
        await native.commit({roomId,credential,operationKey,select:d=>d.domainId===offered.domainId,parameters:()=>parameters});
      }
      console.log('signed r'+(revision+1));
    }
  } finally {native.close();}
} catch(e) {
  await save(dir+'/stop-'+Date.now()+'.public.json',{revision,reason:e.message});
  throw e;
}
