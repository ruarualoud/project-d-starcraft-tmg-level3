import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { restoreOrPreparePositionedStandardOpening, bindWave3StandardActionRoom, assertWave3StandardRoomColdReplayV1 } from './support/wave3-standard-action-room-v1.mjs';
import { OFFICIAL_KHASSAR_DE_TEMPLARI_ID } from '../packages/product-composition/official-khassar-de-templari-v1.mjs';

const version = '2.73.0';
const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const roomId = 'khassar-standard-2.73';
const dir = base + '/' + roomId;
const reference = await read(base + '/templar-standard-' + version + '/coverage.json');
const actor = 'tassadar', recipient = 'high_templar', opponent = 'nova_stealth_mode';
const scene = { deploymentConditioned: true, alreadyActivatedConditioned: false, providerCalls: 0,
  positions: { [actor]: [12,4], [recipient]: [17,4], [opponent]: [24,4] } };
const unit = (state, id) => state.pieces.find(piece => piece.id === id);
const saveStep = (key, value) => save(dir + '/' + key + '.json', value);


function halfInchMove(piece) {
  const at = model => ({ xMilliInches: Math.round(model.xInches * 1000),
    yMilliInches: Math.round(model.yInches * 1000) + 500 });
  const [leader, ...others] = piece.models;
  return { leadingModelId: leader.id, path: [at(leader)], placements: others.map(model => ({
    modelId: model.id, ...at(model), elevation: 'ground', supportTerrainIds: [], rotationDegrees: 0 })) };
}

let stage = 'opening', revision;
try {
  const initial = await restoreOrPreparePositionedStandardOpening({dir, roomId, reference, candidateVersion: version, scene});
  stage = 'release-match-binding';
  const bound = await bindWave3StandardActionRoom({ manifestRef: reference.manifestRef, initial,
    dir, candidateVersion: version, scenario: scene });
  const room = bound.open();
  try {
    const seats = await room.create(roomId, bound.authority);
    for (;;) {
      const head = await room.store.loadRoom(roomId), state = head.envelope.state;
      revision = head.stateRevision;
      const side = state.activeSideKey, target = unit(state, recipient), owner = unit(state, actor);
      const window = state.selectedRosterActivationWindow;
      const damage = state.log.flatMap(step => step.events || []).find(e => e.type === 'khassar_non_lethal_damage_after_movement');
      if (damage && !window) {
        assert.equal(side, 'player1');
        assert.equal(damage.originalActorUnitId, actor);
        assert.equal(damage.pieceId, recipient);
        assert.deepEqual(damage.damage.casualtyModelIds, []);
        assert.equal(target.damageMarker, Number(unit(initial,recipient).damageMarker ?? 0) + 3);
        assert.equal(target.currentModels, unit(initial,recipient).currentModels);
        assert.equal(target.currentSupply, unit(initial,recipient).currentSupply);
        assert.equal(target.models[0].yInches, unit(initial,recipient).models[0].yInches + 1);
        assert.equal(owner.yInches, unit(initial,actor).yInches);
        assert.equal(owner.activatedPhases.movement, true);
        assert.equal(target.activatedPhases.movement, true);
        assert.equal(state.cardResources.player2.find(c => c.officialCardRecordKey === 'tactical_cards:templar_caste').readiness,'exhausted');
        stage = 'cold-replay';
        const actions = await assertWave3StandardRoomColdReplayV1(bound, bound.authority, roomId, head.envelope);
        await saveStep('result', { version, scene, round: state.round, phase: state.phase, revision, actions, nextSeat: side,
          initialModels: unit(initial,recipient).currentModels, finalModels: target.currentModels, finalSupply: target.currentSupply,
          movedInches: 1, extraMoveInches: 0.5, damage, stateHash: head.envelope.stateHash, coldExact: true });
        console.log('verified formal delegated movement and cold replay', revision);
        break;
      }
      stage = 'legal-space-r'+revision;
      const legal = await room.room.legalSpace({roomId, seatToken: seats[side].seatToken});
      assert(legal.ok, legal.message);
      const {parameterDomains, finiteActions} = legal.legalSpace;
      const native = (type, pieceId) => parameterDomains.find(d => d.actionType === type && d.pieceId === pieceId);
      const delegate = parameterDomains.find(d => d.definitionId === OFFICIAL_KHASSAR_DE_TEMPLARI_ID
        && d.pieceId === actor && d.constraints.recipientUnitId === recipient && d.constraints.authorizedActionType === 'move');
      let row, parameters = {};
      if (state.phase === 'start_of_round') row = finiteActions.find(f => f.action.actionType === 'resolve_mission_start_of_round');
      else if (finiteActions.some(f => f.action.actionType === 'choose_first_actor')) {
        row = finiteActions.find(f => f.action.actionType === 'choose_first_actor' && f.action.chosenFirstActorSideKey === 'player2');
      } else if (window?.stage === 'after_action') {
        row = native('finish_activation',window.pieceId);
      } else if (side === 'player1') {
        row = native('move',opponent);
        parameters = halfInchMove(unit(state,opponent));
      } else if (!target.activatedPhases.movement) {
        assert.equal(delegate,undefined,'recipient must complete its ordinary activation first');
        row = native('move',recipient);
        parameters = halfInchMove(target);
      } else {
        assert(!native('move',recipient), 'ordinary second activation must remain unavailable');
        row = delegate;
        parameters = halfInchMove(target);
      }
      assert(row && revision < 12, JSON.stringify({revision,side,phase:state.phase,window,finite:finiteActions.map(f=>f.action.actionType),
        relevant:parameterDomains.filter(d=>d.pieceId===actor||d.pieceId===recipient).map(d=>d.actionType).slice(0,30)}));
      const actionType = (row.action || row).actionType;
      stage = actionType+'-r'+revision;
      const request = row.domainId ? {select: d => d.domainId === row.domainId, parameters: () => parameters}
        : {kind:'finite',select:f => f.actionKey === row.actionKey};
      await room.commit({roomId, credential:seats[side], operationKey:stage, ...request});
      const next = await room.store.loadRoom(roomId);
      assert.equal(next.stateRevision, revision+1);
      const events = next.envelope.state.log.at(-1)?.events || [];
      if(row === delegate) {
        const movement = events.findIndex(e=>e.type === 'unit_move_resolved' && e.pieceId === recipient);
        const loss = events.findIndex(e=>e.type === 'khassar_non_lethal_damage_after_movement');
        assert(movement >= 0 && loss > movement,'nonlethal damage must follow movement');
      }
      await saveStep('r'+next.stateRevision, {actionType, side, postStateHash: next.envelope.stateHash, events: events.map(e=>e.type)});
      console.log('signed',next.stateRevision,stage);
    }
  } finally { room.close(); }
} catch(e) {
  await saveStep('stop-'+Date.now(),{stage,revision,reason:e.message,code:e.code,detail:e.detail,stack:e.stack?.split('\n').slice(1,5)});
  throw e;
}
