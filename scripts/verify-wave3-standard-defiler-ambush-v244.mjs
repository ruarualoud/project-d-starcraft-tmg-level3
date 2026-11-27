import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom, resolveWave3StandardContext } from './support/wave3-standard-action-room-v1.mjs';
import { prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const dir = base + '/zerg-forty-formal-admission-v244/defiler';
const roomId = 'standard-paid-defiler-ambush-v244';
const old = await read(base + '/zagara-standard-admission-v239/admission.json');
const ref = (await read(base + '/ravager-deep-tunnel-v242/opening.json')).sourceManifest;
const context = await resolveWave3StandardContext(await read(ref), 'area_ability_inputs');
const recipes = await read(base + '/zagara-standard-admission-v239/recipes.json');
const unit = recipes.player2.units.find(u => u.unitInstanceId === 'defiler');
assert.deepEqual(unit.upgradeNames, []);
unit.upgradeNames = ['Burrow Ambush'];
const input = { releaseContext: context, dataset: context.dataset, snapshot: context.snapshot, recipes,
  armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY, missionRecordKey: old.mission, deploymentRecordKey: old.deployment };
const defId = 'unit:defiler/burrow-ambush-movement-phase@1';
// Historical release continues rejecting this exact purchase; all other selections already passed.
assert.throws(() => prepareOfficialStandardReleaseOpeningV2({ ...input, releaseMatchVersion: '2.43.0' }),
  e => e.code === 'OFFICIAL_RELEASE_ROOM_ABILITY_COVERAGE_PENDING' && e.detail.pendingSelectedDefinitionIds.includes(defId));
const opening = prepareOfficialStandardReleaseOpeningV2({ ...input, releaseMatchVersion: '2.44.0' });
const bound = await bindWave3StandardActionRoom({ manifestRef: ref, initial: opening.state, dir, candidateVersion: '2.44.0',
  scenario: { purchased: defId, twoHumanSeats: true } });
const room = bound.open();
let revision;
try {
  const seats = await room.create(roomId, bound.authority);
  for (;;) {
    const head = await room.store.loadRoom(roomId);
    revision = head.stateRevision;
    const state = head.envelope.state, side = state.activeSideKey;
    const piece = state.pieces.find(p => p.id === unit.unitInstanceId);
    const menu = await room.room.legalSpace({ roomId, seatToken: seats[side].seatToken });
    assert(menu.ok, menu.message || menu.reason);
    const { parameterDomains, finiteActions } = menu.legalSpace;
    if (piece.isOnField) {
      assert.equal(revision, 3);
      assert.equal(side, 'player1');
      assert.deepEqual([piece.models[0].xInches, piece.models[0].yInches], [12, 10]);
      assert.equal(piece.currentSupply, 1);
      assert(parameterDomains.length + finiteActions.length > 0);
      const cold = bound.open();
      try {
        await cold.restoreDependencies(roomId, bound.authority);
        const b = await cold.store.loadReplayBundle(roomId);
        const receipts = b.privateJournal.filter(e => e.payload.type === 'accepted_transition').map(e => e.payload.payload.receipt);
        const recovered = cold.engine.replay({ initialEnvelope: b.initialEnvelope, journal: receipts });
        assert(recovered.ok, recovered.reason);
        assert.deepEqual(recovered.envelope, head.envelope);
        assert.equal(revision, receipts.length);
        await save(dir + '/result.json', { roomId, version: '2.44.0', rejectedIn: '2.43.0', purchased: defId,
          revision, stateHash: head.envelope.stateHash, position: [12, 10], supply: piece.currentSupply,
          nextSide: side, receipts: receipts.length, coldExact: true, modelCalls: 0 });
      } finally { cold.close(); }
      break;
    }
    const credential = seats[side];
    const operationKey = 'ambush-r' + revision;
    if (revision < 2) {
      const type = revision === 0 ? 'resolve_mission_start_of_round' : 'choose_first_actor';
      await room.commit({ roomId, credential, operationKey, kind: 'finite', select: c => c.action.actionType === type
        && (revision === 0 || (c.action.sourceAction?.chosenFirstActorSideKey ?? c.action.chosenFirstActorSideKey) === 'player2') });
      continue;
    }
    assert.equal(revision, 2);
    const ambush = parameterDomains.find(d => d.definitionId === defId && d.pieceId === unit.unitInstanceId);
    assert(ambush, 'purchased upgrade missing from reserve deployment menu');
    const [modelId] = ambush.parameterSchema.leadingModelId.enum;
    const [entrySegmentId] = ambush.parameterSchema.entrySegmentId.enum;
    const params = { leadingModelId: modelId, entrySegmentId, placements: [
      { modelId, xMilliInches: 12000, yMilliInches: 10000, elevation: 'ground' }] };
    await save(dir + '/offer.json', { revision, stateHash: head.envelope.stateHash, definitionId: defId,
      parameterKind: ambush.parameterKind, entrySegmentId, required: ambush.parameterSchema.required, params });
    await room.commit({ roomId, credential, operationKey, select: d => d.domainId === ambush.domainId, parameters: () => params });
  }
} catch (error) {
  await save(dir + '/stop-' + Date.now() + '.json', { revision, message: error.message });
  throw error;
} finally { room.close(); }
