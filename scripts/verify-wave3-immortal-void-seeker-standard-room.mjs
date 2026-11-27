import assert from 'node:assert/strict';
import { deploymentOptions } from './support/wave3-single-model-redeployment.mjs';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { assertWave3StandardRoomColdReplayV1, bindWave3StandardActionRoom, restoreOrPreparePositionedStandardOpening }
  from './support/wave3-standard-action-room-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const version = '2.83.0', roomId = 'immortal-void-seeker-standard-2.83', dir = base + '/' + roomId;
const reference = await read(base + '/immortal-transport-standard-' + version + '/coverage.json');
const actor = 'stalker1', phaseGuns = 'immortal2', photonGuns = 'immortal';
const scene = { deploymentConditioned: true, providerCalls: 0,
  positions: { [actor]: [12,4], [phaseGuns]: [27,4], [photonGuns]: [33,4] } };
const record = (name, value) => save(dir + '/' + name + '.json',value);
const piece = (state,id) => state.pieces.find(row => row.id===id);

let stage='opening', revision;
try {
  assert.equal(reference.total,reference.exact);
  const initial=await restoreOrPreparePositionedStandardOpening({dir,roomId,reference,candidateVersion:version,scene});
  const bound=await bindWave3StandardActionRoom({manifestRef:reference.manifestRef,initial,dir,candidateVersion:version,scenario:scene});
  const room=bound.open();
  try {
    const seats=await room.create(roomId,bound.authority);
    for (;;) {
      const head=await room.store.loadRoom(roomId), state=head.envelope.state, side=state.activeSideKey;
      revision=head.stateRevision;
      const latest=state.personalTransportHistory?.at(-1);
      const traits = (id,weaponName) => bound.runtime.queryWeaponCharacteristics(state,id,
        {targetPieceId:actor,attackKind:'ranged',weaponName}).result;
      if (latest && state.phase==='assault') {
        stage='assault-comparison-and-cold-replay';
        const after=piece(state,actor), before=piece(initial,actor);
        assert.equal(latest.pieceId,actor);
        assert.equal(latest.releasedSupply,before.currentSupply);
        assert.equal(latest.supplyAfterReturn.onTableSupplyBySide.player1,0);
        assert.equal(latest.supplyAfterDeploy.onTableSupplyBySide.player1,before.currentSupply);
        assert(after.isOnField && !after.isInReserves);
        assert.notDeepEqual([after.models[0].xInches,after.models[0].yInches],scene.positions[actor]);
        assert.equal(after.damageMarker,before.damageMarker);
        assert.equal(state.cardResources.player1.find(c=>c.officialCardRecordKey==='tactical_cards:void_seeker').readiness,'exhausted');
        const bought=traits(phaseGuns,'Left Phase Disruptor'), stock=traits(photonGuns,'Left Photon Disruptor');
        const beyond=bought.conditionalWeaponChecks.find(f=>f.conditionKind==='target_beyond');
        assert(beyond.applies && beyond.minimumDistanceMilliInches>8000,'post-deploy target must be beyond eight inches');
        assert.equal(bought.precision,1); assert.equal(stock.precision,0);
        const query=await read(dir+'/query.json');
        const journal=(await room.store.loadReplayBundle(roomId)).privateJournal;
        const signed=journal.find(e=>e.payload.type==='accepted_transition' &&
          e.payload.payload.receipt.action.actionType==='resolve_personal_transport').payload.payload.receipt.action;
        assert.equal(signed.sourceActionHash,query.expectedSourceActionHash);
        const actions=await assertWave3StandardRoomColdReplayV1(bound,bound.authority,roomId,head.envelope);
        await record('result',{version,revision,actions,round:state.round,phase:state.phase,nextSide:side,
          redeployedTo:[after.models[0].xInches,after.models[0].yInches],releasedSupply:latest.releasedSupply,
          endOnTableSupply:latest.supplyAfterDeploy.onTableSupplyBySide.player1,assaultComparison:{beyond,boughtPrecision:bought.precision,stockPrecision:stock.precision},coldExact:true,providerCalls:0});
        break;
      }
      stage='legal-space-r'+revision;
      const legal=await room.room.legalSpace({roomId,seatToken:seats[side].seatToken});
      assert(legal.ok,legal.message);
      const {finiteActions,parameterDomains}=legal.legalSpace;
      let row=finiteActions.find(f=>f.action.actionType==='resolve_mission_start_of_round'
        || f.action.actionType==='choose_first_actor' && f.action.chosenFirstActorSideKey==='player1');
      let params={}, predicted;
      if (!row && !latest) {
        assert.equal(side,'player1');
        row=parameterDomains.find(d=>d.actionType==='resolve_personal_transport' && d.pieceId===actor);
        assert(row,'Personal Transport missing from the signed menu');
        const offered=bound.runtime.queryPersonalTransport(state,actor);
        const native=offered.result.parameterDomains.find(d=>d.domainId===row.sourceDomain.domainId);
        assert.deepEqual(native,row.sourceDomain);
        const alternatives=deploymentOptions(native.sourceDomain.deploymentDomain,piece(state,actor));
        for (const candidate of alternatives) {
          try { predicted=bound.runtime.queryPersonalTransport(state,actor,candidate); params=candidate; break; }
          catch(e) { if (!/TERRAIN|COLLISION|OBSTACLE|OVERLAP|MODEL_BASE/.test(e.message)) throw e; }
        }
        assert(predicted,'no sampled legal entry among the declared edge samples');
        const invalid=structuredClone(params); invalid.deployment.path[0].yMilliInches=-100000;
        assert.throws(()=>bound.runtime.queryPersonalTransport(state,actor,invalid),/SELECTED_SPATIAL_|DEPLOY_|MODEL_BASE_/);
        const bought=traits(phaseGuns,'Left Phase Disruptor'), stock=traits(photonGuns,'Left Photon Disruptor');
        assert.equal(bought.precision,0); assert.equal(stock.precision,0);
        assert.equal(bought.conditionalWeaponChecks.find(f=>f.conditionKind==='target_beyond').reason,'outside_eligible_attack_context');
        assert.equal((await room.store.loadRoom(roomId)).envelope.stateHash,head.envelope.stateHash);
        await record('query',{revision,transportPreview:predicted.queryReceiptHash,expectedSourceActionHash:hashStarcraftTmgContract(predicted.result.action),sourceDomainId:native.domainId,
          parameters:params,actualConditions:{target:actor,upgraded:phaseGuns,stock:photonGuns,
            boughtPrecision:bought.precision,stockPrecision:stock.precision},invalidPreviewRejected:true});
      } else if (!row && latest && state.selectedRosterActivationWindow) {
        row=parameterDomains.find(d=>d.actionType==='finish_activation' && d.pieceId===actor);
      } else if (!row && latest && state.phase==='movement') {
        if (!state.players.player2.passedPhases?.movement) {
          assert.equal(side,'player2');
          assert(piece(state,actor).activatedPhases.movement);
          await record('transport-handoff',{revision,nextSeat:side,stateHash:head.envelope.stateHash});
        }
        row=finiteActions.find(f=>f.action.actionType==='pass');
      }
      assert(row && revision<8,'expected formal successor at r'+revision);
      stage=(row.action??row).actionType+'-r'+revision;
      const fill=row.domainId?{select:d=>d.domainId===row.domainId,parameters:()=>params}
        :{kind:'finite',select:f=>f.actionKey===row.actionKey};
      const receipt=await room.commit({roomId,credential:seats[side],operationKey:stage,...fill});
      if (predicted) assert.deepEqual(receipt.preview.core.action.sourceAction,predicted.result.action);
      const next=await room.store.loadRoom(roomId);
      assert.equal(next.stateRevision,revision+1);
      await record('r'+next.stateRevision,{action:(row.action??row).actionType,side,stateHash:next.envelope.stateHash});
      console.log('signed',next.stateRevision,stage);
    }
  } finally {room.close();}
} catch(e) {
  await record('stop-'+Date.now(),{stage,revision,reason:e.message,stack:e.stack?.split('\n').slice(1,5)});
  throw e;
}
