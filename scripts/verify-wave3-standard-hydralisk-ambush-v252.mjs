import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom, resolveWave3StandardContext } from './support/wave3-standard-action-room-v1.mjs';
import { prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const out = base + '/inherited-zerg-hydralisk-ambush-v252';
const previous = await read(base + '/inherited-zerg-standard-2.51.0/hydralisk.json');
const ability = 'unit:hydralisk/burrow-ambush-movement-phase@1';
assert.deepEqual(previous.rows.filter(row => row.registrationStatus !== 'executable_exact').map(row => row.definitionId), [ability]);
const version = '2.52.0';
const roomId = 'official-hydralisk-reserve-ambush-v252';
const context = await resolveWave3StandardContext(await read(previous.manifestRef), 'area_ability_inputs');
const opening = prepareOfficialStandardReleaseOpeningV2({
  releaseContext: context, snapshot: context.snapshot, dataset: context.dataset,
  recipes: previous.recipes, releaseMatchVersion: version, armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
  missionRecordKey: previous.mission, deploymentRecordKey: previous.deployment,
});
assert.equal(opening.state.phase, 'start_of_round');
const route = opening.state.officialRelocationFamilySourceBundle.routes.find(row => row.definitionId === ability);
assert.equal(route.sourceFeatureHash, previous.rows.find(row => row.definitionId === ability).sourceFeatureHash);
const scenario = { purchased: ability, legalRoster: 'hydralisk', twoHumanSeats: true };
await save(out + '/opening-evidence.json', { version, roomId, scenario, sourceHash: route.sourceFeatureHash, phase: opening.state.phase });
const bound = await bindWave3StandardActionRoom({ manifestRef: previous.manifestRef, initial: opening.state,
  dir: out, candidateVersion: version, scenario });
const native = bound.open();
let revision;
try {
  const seats = await native.create(roomId, bound.authority);
  while (true) {
    const head = await native.store.loadRoom(roomId);
    revision = head.stateRevision;
    const state = head.envelope.state;
    const side = state.activeSideKey;
    const credential = seats[side];
    const menu = await native.room.legalSpace({ roomId, seatToken: credential.seatToken });
    assert(menu.ok, menu.message);
    const {parameterDomains, finiteActions} = menu.legalSpace;
    const actor = state.pieces.find(piece => piece.id === 'hydralisk');
    const positions = [{xMilliInches: 12000, yMilliInches: 10000}, {xMilliInches: 14500, yMilliInches: 10000}];
    if (actor.isOnField) {
      assert.equal(revision, 3);
      assert.equal(side, 'player1');
      assert.deepEqual(actor.models.map(m => [m.xInches, m.yInches]), positions.map(p => [p.xMilliInches/1000, p.yMilliInches/1000]));
      assert.equal(actor.currentSupply, 2);
      assert(parameterDomains.length || finiteActions.length);
      const cold = bound.open();
      try {
        await cold.restoreDependencies(roomId, bound.authority);
        const journal = await cold.store.loadReplayBundle(roomId);
        const receipts = journal.privateJournal.filter(e => e.payload.type === 'accepted_transition').map(e => e.payload.payload.receipt);
        const replay = cold.engine.replay({initialEnvelope: journal.initialEnvelope, journal: receipts});
        assert(replay.ok, replay.reason);
        assert.deepEqual(replay.envelope, head.envelope);
        assert.equal(receipts.length, revision);
        await save(out + '/result.json', {roomId, version, ability, revision, sourceHash: route.sourceFeatureHash,
          stateHash: head.envelope.stateHash, positions, currentSupply: actor.currentSupply, side, receipts: receipts.length, coldExact: true, modelCalls: 0});
      } finally { cold.close(); }
      break;
    }
    assert(revision >= 0 && revision <= 2);
    const operationKey = 'move-from-reserves-' + revision;
    if (revision < 2) {
      const type = revision === 0 ? 'resolve_mission_start_of_round' : 'choose_first_actor';
      await native.commit({roomId, credential, operationKey, kind: 'finite', select: choice => choice.action.actionType === type
        && (revision === 0 || (choice.action.sourceAction?.chosenFirstActorSideKey ?? choice.action.chosenFirstActorSideKey) === 'player2')});
      continue;
    }
    const offer = parameterDomains.find(d => d.pieceId === actor.id && d.definitionId === ability);
    assert(offer, 'purchased ability absent from the official deployment menu');
    assert.equal(offer.constraints.maxDistanceMilliInches, 18000);
    assert.equal(offer.constraints.minimumEnemyGapMilliInchesExclusive, 10000);
    const ids = offer.parameterSchema.placements.exactModelIds;
    assert.equal(ids.length, positions.length);
    const params = {leadingModelId: ids[0], entrySegmentId: offer.parameterSchema.entrySegmentId.enum[0],
      placements: ids.map((modelId,i) => ({modelId, ...positions[i], elevation: 'ground'}))};
    const invalid = await native.room.previewAction({roomId, seatToken: credential.seatToken,
      expectedStateRevision: revision, expectedStateHash: head.envelope.stateHash,
      expectedMatchBindingHash: head.envelope.matchBindingHash, expectedLegalSpaceHash: menu.legalSpace.legalSpaceHash,
      proposal: {kind: 'parameterized', domainId: offer.domainId, parameters: {...params, placements: params.placements.slice(0,1)}}});
    assert.equal(invalid.ok, false);
    assert.match(JSON.stringify(invalid), /RELOCATION_PLACEMENT_DENOMINATOR_INVALID/);
    assert.equal((await native.store.loadRoom(roomId)).envelope.stateHash, head.envelope.stateHash);
    await save(out + '/offer.json', {revision, params, constraints: offer.constraints, invalid});
    await native.commit({roomId, credential, operationKey, select: d => d.domainId === offer.domainId, parameters: () => params});
  }
} catch (error) {
  await save(out + '/stop-' + Date.now() + '.json', {revision, code: error.code, message: error.message});
  throw error;
} finally { native.close(); }
