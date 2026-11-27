import assert from 'node:assert/strict';
import path from 'node:path';
import { root, read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { openWave3EngineeringStoreV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { bindWave3StandardActionRoom, resolveWave3StandardContext } from './support/wave3-standard-action-room-v1.mjs';
import { OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY, prepareOfficialStandardReleaseOpeningV2 }
  from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { OFFICIAL_MISSION_ACTION_TYPES as mission } from '../packages/rule-atoms/official-mission-runtime-v2.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const parent = base + '/ravager-deep-tunnel-v242';
const dir = parent + '/round-end';
const gate = await read(parent + '/opening.json');
const cast = await read(parent + '/movement/placement.json');
const store = openWave3EngineeringStoreV1({ directory: path.join(root, parent, 'movement'), filename: 'room.sqlite' });
let paid;
try {
  paid = (await store.loadRoom(cast.roomId)).envelope;
  assert.equal(paid.stateHash, cast.stateHash);
} finally { store.close(); }
const context = await resolveWave3StandardContext(await read(gate.sourceManifest), 'area_ability_inputs');
const source = await read(base + '/zagara-standard-admission-v239/admission.json');
const { state: initial } = prepareOfficialStandardReleaseOpeningV2({ releaseContext: context, dataset: context.dataset,
  snapshot: context.snapshot, recipes: await read(gate.recipesRef), releaseMatchVersion: gate.version,
  armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY, missionRecordKey: source.mission, deploymentRecordKey: source.deployment });
const bound = await bindWave3StandardActionRoom({ manifestRef: gate.sourceManifest, initial, dir, candidateVersion: gate.version,
  scenario: { factory: parent + '/opening.json' } });
assert.equal(bound.runtime.descriptor.runtimeHash, gate.runtimeHash);
const native = bound.open();
const commit = (id, seats, side, name, key = name) => native.commit({ roomId: id, credential: seats[side],
  operationKey: key, kind: 'finite', select: row => row.action.actionType === name });
const cleanup = 'resolve_current_product_cleanup_refresh';
const begin = 'begin_psionic_transfer_round_end';
const complete = 'complete_psionic_transfer_round_end';
const depths = ['determine_current_product_mission_marker_control', mission.SCORE, mission.END_GAME, 'resolve_current_product_end_of_round_effects'];
const pose = state => state.pieces.find(p => p.id === cast.actor).models.filter(m => m.isOnField && !m.isDestroyed)
  .map(m => ({ modelId: m.id, xMilliInches: Math.round(1000*m.xInches), yMilliInches: Math.round(1000*m.yInches) }));
const verified = [];
let stage = 'mission';
try {
  const openingId = 'tunnel-factory-round-start', prefixId = 'tunnel-cleanup-prefix';
  const openingSeats = await native.create(openingId, bound.authority);
  await commit(openingId, openingSeats, initial.firstPlayerSideKey, mission.START_ROUND);
  const started = (await native.store.loadRoom(openingId)).envelope;
  assert(started.state.officialMissionRuntimeState.roundProgressByRound[1].startRoundApplied);
  const state = structuredClone(paid.state);
  state.officialMissionRuntimeState = structuredClone(started.state.officialMissionRuntimeState);
  state.board.missionMarkers = structuredClone(started.state.board.missionMarkers);
  state.phase = 'cleanup';
  state.stage = 'activation_phases';
  state.activeSideKey = state.firstPlayerSideKey;
  delete state.selectedRosterActivationWindow;
  delete state.currentProductMatchLifecycle;
  const prefixSeats = await native.create(prefixId, bound.authorityFor(state, {
    declaredCleanupEntry: true, fullRound: false, paidStateHash: paid.stateHash, missionStartHash: started.stateHash }));
  for (const action of depths) {
    stage = action;
    await commit(prefixId, prefixSeats, state.firstPlayerSideKey, action);
  }
  const shared = (await native.store.loadRoom(prefixId)).envelope;
  const owner = shared.state.pieces.find(p => p.id === cast.actor).sideKey;
  assert.equal(shared.state.currentProductMatchLifecycle.step, 'round_end_choices');
  assert.equal(shared.state.activeSideKey, owner);
  const atEnd = await native.room.legalSpace({ roomId: prefixId, seatToken: prefixSeats[owner].seatToken });
  assert(atEnd.ok, atEnd.message);
  stage = 'round-end-choice-window';
  const offered = atEnd.legalSpace.finiteActions.map(row => row.action.actionType);
  const queried = bound.runtime.queryDeepTunnelRoundEnd(shared.state).result;
  assert(queried.canStart && queried.menu.candidates.some(row => row.actionType === begin));
  assert(offered.includes(begin), JSON.stringify(offered));
  assert(!offered.includes('begin_holo_round_end') && !offered.includes('begin_unit_round_end'));
  assert(!atEnd.legalSpace.finiteActions.some(a => a.action.actionType === cleanup));
  await save(dir + '/choice-window.json', { revision: shared.stateRevision, stateHash: shared.stateHash, owner,
    castHash: paid.stateHash, missionStartHash: started.stateHash, completeRoundSimulated: false,
    actions: atEnd.legalSpace.finiteActions.map(row => row.action.actionType) });
  for (const choice of ['place', 'skip']) {
    const roomId = 'tunnel-round-end-' + choice;
    const authority = bound.authorityFor(shared.state, { parent: prefixId, parentHash: shared.stateHash, choice });
    const seats = await native.create(roomId, authority);
    stage = choice + '/begin';
    await commit(roomId, seats, owner, begin);
    const afterBegin = await native.store.loadRoom(roomId);
    let before = afterBegin.envelope.state;
    if (afterBegin.stateRevision !== 1) {
      const bundle = await native.store.loadReplayBundle(roomId);
      const firstReceipt = bundle.privateJournal.find(row => row.payload.type === 'accepted_transition').payload.payload.receipt;
      const restoredBegin = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: [firstReceipt] });
      assert(restoredBegin.ok, restoredBegin.reason);
      before = restoredBegin.envelope.state;
    }
    const token = before.board.tokens.find(t => t.tokenId === cast.tokenId);
    const old = pose(before);
    const placementPlan = { leadingModelId: old[0].modelId, placements: old.map(({ modelId }, i) => ({ modelId,
      xMilliInches: Math.round(token.coordinate.x*1000) + (i%2 ? 2300 : -2300),
      yMilliInches: Math.round(token.coordinate.y*1000) + Math.floor(i/2)*2400 })) };
    const parameters = choice === 'place' ? {choice, placementPlan} : {choice};
    const preview = bound.runtime.queryDeepTunnelRoundEndPlacement(before, cast.actor, parameters);
    stage = choice + '/selection';
    const applied = await native.commit({ roomId, credential: seats[owner], operationKey: 'choose', choice: {
      actionType: 'choose_psionic_transfer_round_end', pieceId: cast.actor }, parameters: () => parameters });
    assert.deepEqual(applied.preview.core.action.sourceAction, preview.result.action);
    stage = choice + '/complete';
    await commit(roomId, seats, owner, complete);
    const eventual = await native.store.loadRoom(roomId);
    const selection = eventual.envelope.state.resolvedPsionicTransferRoundEnd.find(row => row.tokenId === token.tokenId);
    assert.equal(selection.choice, choice);
    assert.deepEqual(pose(eventual.envelope.state), choice === 'place' ? placementPlan.placements : old);
    if (choice === 'place') assert.notDeepEqual(pose(eventual.envelope.state), old);
    stage = choice + '/cleanup';
    // Other optional end-of-round effects, if any, retain their controller's choice.
    for (let i=0; i<12; i++) {
      const current = (await native.store.loadRoom(roomId)).envelope;
      if (current.state.currentProductMatchLifecycle?.step === 'determine_initiative') break;
      const side = current.state.activeSideKey;
      const menu = await native.room.legalSpace({ roomId, seatToken: seats[side].seatToken });
      assert(menu.ok, menu.message);
      const names = menu.legalSpace.finiteActions.map(row => row.action.actionType);
      const action = names.find(name => name === cleanup || name.includes('decline') && name.includes('round_end'));
      assert(action, JSON.stringify(names));
      await commit(roomId, seats, side, action, 'tail-' + current.stateRevision);
    }
    const end = (await native.store.loadRoom(roomId)).envelope;
    assert.equal(end.state.currentProductMatchLifecycle?.step, 'determine_initiative');
    // Initiative is served to the first-player seat after cleanup clears the active unit's side.
    assert.equal(end.state.activeSideKey, null);
    const successor = await native.room.legalSpace({ roomId, seatToken: seats[end.state.firstPlayerSideKey].seatToken });
    assert(successor.ok && successor.legalSpace.finiteActions.some(row => row.action.actionType === 'resolve_current_product_next_round_initiative'));
    assert(!end.state.board.tokens.some(t => t.tokenId === cast.tokenId));
    assert(end.state.psionicTransferCleanupHistory.some(h => h.tokenIds.includes(cast.tokenId)));
    const cold = bound.open();
    try {
      await cold.restoreDependencies(roomId, authority);
      const replay = await cold.store.loadReplayBundle(roomId);
      const receipts = replay.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
      const result = cold.engine.replay({ initialEnvelope: replay.initialEnvelope, journal: receipts });
      assert(result.ok, result.reason);
      assert.deepEqual(result.envelope, end);
      verified.push({ choice, receipts: receipts.length, from: old, to: pose(end.state), stateHash: end.stateHash,
        round: end.state.round, phase: end.state.phase, coldExact: true, tokenRemoved: true, queryHash: preview.queryReceiptHash });
      await save(dir + '/' + choice + '.json', verified.at(-1));
    } finally { cold.close(); }
  }
  await save(dir + '/result.json', { version: gate.version, branches: verified, independentPaidSource: cast.stateHash, modelCalls: 0 });
} catch(error) {
  await save(dir + '/stop-' + Date.now() + '.json', { stage, message: error.message });
  throw error;
} finally { native.close(); }
