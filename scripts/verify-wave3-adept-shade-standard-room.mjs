import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import {
  assertWave3StandardRoomColdReplayV1, bindWave3StandardActionRoom, restoreOrPreparePositionedStandardOpening,
} from './support/wave3-standard-action-room-v1.mjs';

const version = '2.84.0';
const root = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const roomId = 'adept-own-shade-standard-2.84';
const dir = root + '/' + roomId;
const reference = await read(root + '/khassar-supply-standard-' + version + '/coverage.json');
const actor = 'adept', shooter = 'high_templar', near = 'zealot', far = 'twilight_templar__high_templar_';
const scene = {
  deploymentConditioned: true, providerCalls: 0,
  positions: { [actor]: [12,4], [shooter]: [19,7], [near]: [23,4], [far]: [31,4] },
  shadeCenter: { xMilliInches: 19000, yMilliInches: 4000 },
};
const record = (name, data) => save(dir + '/' + name + '.json', data);
function measure(runtime, state) {
  const query = (from,to) => runtime.queryAdeptShadePrecision(state,from,to).result.precision;
  return { nearEnemy: query(shooter,near), farEnemy: query(shooter,far),
    friendly: query(actor,shooter), otherSide: query(near,shooter) };
}
let revision, stage = 'formal-opening';
try {
  assert.equal(reference.total,reference.exact);
  const initial = await restoreOrPreparePositionedStandardOpening({dir,roomId,reference,candidateVersion:version,scene});
  const bound = await bindWave3StandardActionRoom({manifestRef:reference.manifestRef,initial,dir,candidateVersion:version,scenario:scene});
  const room = bound.open();
  try {
    const seats = await room.create(roomId,bound.authority);
    for (;;) {
      const head = await room.store.loadRoom(roomId);
      const state = head.envelope.state, side = state.activeSideKey;
      revision = head.stateRevision;
      const effect = state.pendingPsionicTransferEffects?.find(e => e.sourcePieceId === actor && !e.consumed);
      if (effect && !state.selectedRosterActivationWindow) {
        stage = 'target-measurements-and-cold-replay';
        assert.equal(side,'player2');
        const values = measure(bound.runtime,state);
        assert.deepEqual(values, { nearEnemy: 1, farEnemy: 0, friendly: 0, otherSide: 0 });
        const token = state.board.tokens.find(t => t.tokenId === effect.tokenId);
        assert.equal(token.createdByPieceId,actor);
        assert.equal(effect.definitionId,'unit:adept/psionic-transfer-movement-phase@1');
        assert.equal(token.baseDiameterMm,40);
        const actions = await assertWave3StandardRoomColdReplayV1(bound,bound.authority,roomId,head.envelope);
        await record('result',{ version,revision,round:state.round,phase:state.phase,nextSeat:side,
          actions, tokenId:token.tokenId,baseDiameterMm:token.baseDiameterMm,values,coldExact:true,providerCalls:0 });
        break;
      }
      stage = 'legal-space-r' + revision;
      const menu = await room.room.legalSpace({roomId,seatToken:seats[side].seatToken});
      assert(menu.ok, menu.message);
      const {finiteActions,parameterDomains} = menu.legalSpace;
      let row = finiteActions.find(f => f.action.actionType === 'resolve_mission_start_of_round'
        || f.action.actionType === 'choose_first_actor' && f.action.chosenFirstActorSideKey === 'player1');
      let parameters = {};
      if (!row && !effect) {
        row = parameterDomains.find(d => d.actionType === 'set_psionic_transfer_shade' && d.pieceId === actor);
        assert(row,'Adept Shade must be in the first player’s signed menu');
        const spec = row.parameterSchema.paymentCardInstanceIds ?? row.parameterSchema.properties?.paymentCardInstanceIds;
        const cards = spec.const ?? (spec.choices ?? spec.enum)[0];
        assert(Array.isArray(cards));
        parameters = { coordinate: scene.shadeCenter, paymentCardInstanceIds: cards };
        const values = measure(bound.runtime,state);
        assert.deepEqual(values, { nearEnemy: 0, farEnemy: 0, friendly: 0, otherSide: 0 });
        await record('before',{revision,stateHash:head.envelope.stateHash,values});
      } else if (!row && effect) {
        row = parameterDomains.find(d => d.actionType === 'finish_activation' && d.pieceId === actor);
      }
      assert(row && revision < 6, 'missing product successor at r' + revision);
      stage = (row.action ?? row).actionType + '-r' + revision;
      await room.commit({roomId,credential:seats[side],operationKey:stage,...(row.domainId
        ? {select:d => d.domainId === row.domainId, parameters:() => parameters}
        : {kind:'finite', select:f => f.actionKey === row.actionKey})});
      const next = await room.store.loadRoom(roomId);
      assert.equal(next.stateRevision,revision+1);
      await record('r'+next.stateRevision,{action:(row.action ?? row).actionType,side,stateHash:next.envelope.stateHash});
      console.log('signed',next.stateRevision,stage);
    }
  } finally { room.close(); }
} catch(e) {
  await record('stop-'+Date.now(),{stage,revision,reason:e.message,stack:e.stack?.split('\n').slice(1,6)});
  throw e;
}
