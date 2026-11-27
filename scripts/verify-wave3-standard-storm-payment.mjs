import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { assertWave3StandardRoomColdReplayV1, bindWave3StandardActionRoom,
  restoreOrPreparePositionedStandardOpening } from './support/wave3-standard-action-room-v1.mjs';

const version = '2.76.0';
const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const roomId = 'templar-storm-payment-standard-2.76';
const dir = base + '/' + roomId;
const reference = await read(base + '/templar-storm-gale-standard-' + version + '/coverage.json');
const storm = 'unit:high_templar/psionic-storm-movement-phase@1';
const twilight = 'twilight_templar__high_templar_';
const gale = 'unit:' + twilight + '/psionic-gale-movement-phase@1';
const scene = { deploymentConditioned: true, providerCalls: 0, coordinate: { xMilliInches: 20000, yMilliInches: 4000 },
  positions: { high_templar: [16,4], [twilight]: [11,4], marine: [23,4] },
  formationOffsets: { marine: [[0,0],[-1,0],[1,0],[0,1],[-1,1],[1,1]] } };
const record = (name, data) => save(dir + '/' + name + '.json', data);
async function verifyMovementEnd(bound, room, seats) {
  const paid = await read(dir + '/result.json');
  const first = await room.store.loadRoom(roomId);
  const checkpointRef = dir + '/payment-checkpoint.json';
  let checkpoint;
  if (first.stateRevision === paid.revision) {
    assert.equal(first.envelope.stateHash, paid.stateHash);
    const sealed = room.engine.createCheckpoint(first.envelope);
    assert(sealed.ok,sealed.reason);
    checkpoint = sealed.checkpoint;
    await save(checkpointRef, checkpoint);
  } else {
    checkpoint = await read(checkpointRef);
    assert.equal(checkpoint.stateHash, paid.stateHash);
  }
  for (;;) {
    const head = await room.store.loadRoom(roomId), state = head.envelope.state;
    revision = head.stateRevision;
    const side = state.activeSideKey;
    if (state.phase === 'assault') {
      const resolved = state.log.flatMap(entry => entry.events || []).filter(event =>
        event.type === 'psionic_storm_movement_damage_resolved' && event.targetPieceId === 'marine');
      assert.equal(resolved.length, 1);
      const [damage] = resolved;
      assert.deepEqual([...damage.coveredModelIds].sort(), [...paid.coveredMarineModels].sort());
      assert.equal(damage.hitThreshold, paid.hitThreshold);
      assert.equal(damage.rolls.length, 3 + damage.coveredModelIds.length);
      assert.equal(damage.amount, damage.rolls.filter(die => die >= damage.hitThreshold).length - damage.evaded);
      assert.deepEqual(damage.resolution.casualtyModelIds, []);
      assert.equal(state.pieces.find(piece => piece.id === 'marine').damageMarker ?? 0, damage.resolution.postDamageMarker);
      assert.equal(state.officialPsionicStormPhaseEndHistory.filter(row => row.phase === 'movement').length,1);
      stage = 'cold-replay-movement-suffix';
      const actions = await assertWave3StandardRoomColdReplayV1(bound,bound.authority,roomId,head.envelope,checkpoint);
      await record('movement-result',{ revision, phase: state.phase, fromRevision: paid.revision, actions: actions.slice(paid.revision),
        damage, stateHash: head.envelope.stateHash, coldExact: true, providerCalls: 0 });
      console.log('signed and cold-replayed movement end',revision);
      return;
    }
    assert.equal(state.phase,'movement');
    assert(revision < paid.revision + 6, 'movement must finish after both players pass and the storm resolves');
    stage = 'movement-end-menu-r' + revision;
    const menu = await room.room.legalSpace({roomId,seatToken:seats[side].seatToken});
    assert(menu.ok,menu.message);
    const type = state.pendingOfficialPsionicStormMovementEnd ? 'resolve_psionic_storm_movement_end' : 'pass';
    const choices = menu.legalSpace.finiteActions.filter(row => row.action.actionType === type);
    assert.equal(choices.length,1,'unique legal '+type+' at r'+revision);
    stage = type+'-r'+revision;
    await room.commit({roomId,credential:seats[side],kind:'finite',operationKey:stage,
      select:row => row.actionKey === choices[0].actionKey});
    const next = await room.store.loadRoom(roomId);
    assert.equal(next.stateRevision,revision+1);
    await record('r'+next.stateRevision,{action:type,side,stateHash:next.envelope.stateHash});
    console.log('signed',next.stateRevision,type);
  }
}

let stage = 'opening', revision;
try {
  const initial = await restoreOrPreparePositionedStandardOpening({ dir, roomId, reference, candidateVersion: version, scene });
  stage = 'runtime';
  const bound = await bindWave3StandardActionRoom({ manifestRef: reference.manifestRef, initial, dir, candidateVersion: version, scenario: scene });
  const room = bound.open();
  try {
    const seats = await room.create(roomId, bound.authority);
    if (process.argv.includes('--movement-end')) {
      await verifyMovementEnd(bound, room, seats);
    } else for (;;) {
      const head = await room.store.loadRoom(roomId), state = head.envelope.state;
      revision = head.stateRevision;
      const side = state.activeSideKey;
      const anchor = state.officialPsionicStormCenters?.find(row => row.definitionId === storm);
      if (anchor) {
        stage = 'actual-payment-and-coverage-r' + revision;
        const log = state.log.find(row => row.events?.some(e => e.type === 'psionic_storm_token_set' && e.definitionId === storm));
        const paid = log.events.find(e => e.type === 'ability_resource_paid');
        assert.equal(paid.printedResourceCost, 2);
        assert.equal(paid.resourceCost, 1);
        assert(paid.exhaustedCardInstanceIds.length);
        assert(paid.exhaustedCardInstanceIds.every(id => state.cardResources.player2.some(c => c.cardInstanceId === id && c.readiness === 'exhausted')));
        assert(log.events.some(e => e.type === 'our_minds_as_one_first_ability_resolved' && e.reduction === 1));
        const post = bound.runtime.queryPsionicStormRules(state,'player2','high_templar',storm,'movement').result;
        assert.equal(post.resourceCost.effectiveResourceCost, 2);
        const coverage = bound.runtime.queryPsionicStormPhaseEnd(state,anchor.id);
        const affected = coverage.result.batches.find(row => row.targetPieceId === 'marine');
        assert(affected?.coveredModelIds.length && affected.hitThreshold === 4);
        await record('signed-cast', { anchor, paid, nextCastCost: post.resourceCost.effectiveResourceCost,
          affected, projectionHash: coverage.queryReceiptHash, sourceStateHash: head.envelope.stateHash });
        if (!state.selectedRosterActivationWindow) {
          assert.equal(side, 'player1');
          stage = 'cold-replay';
          const actions = await assertWave3StandardRoomColdReplayV1(bound,bound.authority,roomId,head.envelope);
          await record('result',{ version, revision, actions, nextSeat: side, printedPE: 2, paidPE: paid.resourceCost,
            nextCastCost: post.resourceCost.effectiveResourceCost, galePE: 2, coveredMarineModels: affected.coveredModelIds,
            hitThreshold: affected.hitThreshold, stateHash: head.envelope.stateHash, coldExact: true, providerCalls: 0 });
          console.log('verified formal Storm payment and cold replay',revision);
          break;
        }
      }
      stage = 'legal-space-r' + revision;
      const response = await room.room.legalSpace({roomId,seatToken: seats[side].seatToken});
      assert(response.ok,response.message);
      const {finiteActions,parameterDomains} = response.legalSpace;
      const choose = type => finiteActions.find(row => row.action.actionType === type &&
        (type !== 'choose_first_actor' || row.action.chosenFirstActorSideKey === 'player2'));
      let row = choose('resolve_mission_start_of_round') || choose('choose_first_actor');
      let parameters = {};
      if (!row && !anchor) {
        stage = 'compare-caster-quotes-r' + revision;
        const source = bound.runtime.queryPsionicStormRules(state,'player2','high_templar',storm,'movement').result;
        const other = bound.runtime.queryPsionicStormRules(state,'player2',twilight,gale,'movement').result;
        assert.equal(source.currentSupply,2);
        assert.equal(source.resourceCost.effectiveResourceCost,1);
        assert.equal(other.resourceCost.effectiveResourceCost,2);
        assert.equal(source.rawDieSuccessThreshold,4);
        assert.equal(other.rollModifier,0);
        assert.throws(() => bound.runtime.queryPsionicStormRules(state,'player2',twilight,storm,'movement'),/CASTER_MISMATCH/);
        row = parameterDomains.find(d => d.actionType === 'cast_psionic_storm' && d.pieceId === 'high_templar');
        assert(row && row.constraints.resourceCost.effectiveResourceCost === 1);
        const payment = row.constraints.payments.find(cards => cards.length);
        assert(payment);
        parameters = {coordinate:scene.coordinate,paymentCardInstanceIds:payment};
        const preview = bound.runtime.queryPsionicStormCast(state,'high_templar',parameters);
        assert.deepEqual(preview.result.canonicalParameters,parameters);
        await record('cast-query',{ source, other, domainId:row.domainId, payment, previewHash:preview.queryReceiptHash });
      } else if (!row && anchor) {
        row = parameterDomains.find(d => d.actionType === 'finish_activation' && d.pieceId === 'high_templar');
      }
      assert(row && revision < 7, 'expected phase or activation successor at r'+revision);
      const action = (row.action || row).actionType;
      stage = action + '-r' + revision;
      await room.commit({roomId,credential:seats[side],operationKey:stage,...(row.domainId
        ? {select:d => d.domainId === row.domainId,parameters:() => parameters} : {kind:'finite',select:f=>f.actionKey === row.actionKey})});
      const next = await room.store.loadRoom(roomId);
      assert.equal(next.stateRevision,revision+1);
      await record('r'+next.stateRevision,{ action, side, stateHash:next.envelope.stateHash });
      console.log('signed', next.stateRevision, action);
    }
  } finally { room.close(); }
} catch(error) {
  await record('stop-'+Date.now(), {stage,revision,reason:error.message,stack:error.stack?.split('\n').slice(1,5)});
  throw error;
}
