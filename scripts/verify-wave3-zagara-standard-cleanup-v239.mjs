import assert from 'node:assert/strict';
import path from 'node:path';
import { read, root, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { openWave3EngineeringStoreV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { bindWave3StandardActionRoom } from './support/wave3-standard-action-room-v1.mjs';
import { OFFICIAL_MISSION_ACTION_TYPES as mission } from '../packages/rule-atoms/official-mission-runtime-v2.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const source = base + '/zagara-standard-admission-v239';
const dir = source + '/cleanup';
const initial = await read(source + '/factory-state.json');
const manifestRef = base + '/tabletop-raven-m01-v1/manifest.json';
const openingId = 'zagara-standard-mission-start', endingId = 'zagara-standard-swarm-end';
const proof = await read(source + '/swarm/cold.json');
assert.equal(proof.exact, true);
const store = openWave3EngineeringStoreV1({ directory: path.join(root, source, 'swarm'), filename: 'room.sqlite' });
let movement;
try {
  const parent = await store.loadRoom('zagara-standard-swarm');
  assert.equal(parent.envelope.stateHash, proof.stateHash);
  assert.equal(parent.stateRevision, proof.revision);
  movement = parent.envelope.state;
} finally { store.close(); }
const { open, authority, runtime, authorityFor } = await bindWave3StandardActionRoom({
  manifestRef, initial, dir, candidateVersion: '2.39.0', scenario: { factoryRef: source + '/factory-state.json' } });
const startSide = initial.firstPlayerSideKey;
const token = movement.board.tokens.find(row => row.tokenKind === 'dark_swarm');
assert(token);
const native = open();
let endAuthority, finalRevision;
const cleanup = 'resolve_current_product_cleanup_refresh';
const initiative = 'resolve_current_product_next_round_initiative';
const sequence = ['determine_current_product_mission_marker_control', mission.SCORE, mission.END_GAME,
  'resolve_current_product_end_of_round_effects', cleanup];
function selectFinite(native, roomId, credential, actionType, operationKey = actionType) {
  return native.commit({ roomId, credential, operationKey, kind: 'finite',
    select: row => row.action.actionType === actionType });
}
try {
  const startSeats = await native.create(openingId, authority);
  await selectFinite(native, openingId, startSeats[startSide], mission.START_ROUND);
  const started = await native.store.loadRoom(openingId);
  assert.equal(started.envelope.state.officialMissionRuntimeState.roundProgressByRound[1].startRoundApplied, true);
  // The two signed prefixes share a factory. Declare only the skip from unit activation to cleanup.
  const state = structuredClone(movement);
  state.officialMissionRuntimeState = structuredClone(started.envelope.state.officialMissionRuntimeState);
  state.board.missionMarkers = structuredClone(started.envelope.state.board.missionMarkers);
  // Keep the movement journal intact. The scenario records the independently signed mission receipt.
  state.phase = 'cleanup';
  state.stage = 'activation_phases';
  state.activeSideKey = state.firstPlayerSideKey;
  delete state.selectedRosterActivationWindow;
  delete state.currentProductMatchLifecycle;
  endAuthority = authorityFor(state, { openingRoom: openingId, openingHash: started.envelope.stateHash,
    swarmRoom: 'zagara-standard-swarm', swarmHash: proof.stateHash, declaredCleanupEntry: true, fullRound: false });
  const seats = await native.create(endingId, endAuthority);
  const side = state.firstPlayerSideKey;
  for (const action of sequence) {
    const accepted = await selectFinite(native, endingId, seats[side], action);
    assert.equal(accepted.preview.core.action.actionType, action);
  }
  const ended = await native.store.loadRoom(endingId);
  let cleanupEnvelope = ended.envelope;
  if (ended.stateRevision > sequence.length) {
    const bundle = await native.store.loadReplayBundle(endingId);
    const journal = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
      .slice(0, sequence.length).map(row => row.payload.payload.receipt);
    const prefix = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal });
    assert.equal(prefix.ok, true);
    cleanupEnvelope = prefix.envelope;
  }
  const done = cleanupEnvelope.state;
  assert.equal(done.currentProductMatchLifecycle.step, 'determine_initiative');
  assert(!done.board.tokens.some(row => row.tokenId === token.tokenId));
  assert(state.officialBattlefieldAssetBindings.some(row => row.assetId === token.tokenId && !row.consumed));
  assert(!done.officialBattlefieldAssetBindings.some(row => row.assetId === token.tokenId && !row.consumed));
  assert.deepEqual(done.officialDarkSwarmCleanupHistory.at(-1).removedTokenIds, [token.tokenId]);
  assert.equal(done.officialMissionRuntimeState.roundProgressByRound[1].endGameChecked, true);
  assert(runtime.enumerate(done, { sideKey: side }).candidates.some(row => row.actionType === initiative));
  await save(dir + '/cleanup.json', { revision: sequence.length, inputToken: token.tokenId, removed: true,
    scores: done.scores, sequence, successor: initiative, fullRound: false, sourceMovementHash: proof.stateHash,
    sourceMissionHash: started.envelope.stateHash });
  let current = ended;
  while (current.envelope.state.round === 1) {
    assert(current.stateRevision - sequence.length < 16, 'initiative roll-off remained tied');
    await selectFinite(native, endingId, seats[side], initiative, 'initiative-r' + current.stateRevision);
    current = await native.store.loadRoom(endingId);
  }
  const next = current.envelope.state;
  assert.equal(next.round, 2);
  assert.equal(next.phase, 'start_of_round');
  const available = runtime.enumerate(next, { sideKey: next.firstPlayerSideKey }).candidates.map(row => row.actionType);
  assert.deepEqual(available, [mission.START_ROUND]);
  finalRevision = current.stateRevision;
  await save(dir + '/round2.json', { revision: finalRevision, stateHash: current.envelope.stateHash, round: next.round,
    firstPlayer: next.firstPlayerSideKey, phase: next.phase, available, scores: next.scores });
} finally { native.close(); }
const cold = open();
try {
  for (const [roomId, owner, expected] of [[openingId, authority, 1], [endingId, endAuthority, finalRevision]]) {
    await cold.restoreDependencies(roomId, owner);
    const room = await cold.store.loadRoom(roomId), bundle = await cold.store.loadReplayBundle(roomId);
    const journal = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
      .map(row => row.payload.payload.receipt);
    assert.equal(journal.length, expected);
    const replay = cold.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal });
    assert.equal(replay.ok, true);
    assert.deepEqual(replay.envelope, room.envelope);
    await save(dir + '/' + roomId + '-cold.json', { stateHash: room.envelope.stateHash,
      revision: room.stateRevision, receipts: journal.length, exact: true });
  }
} finally { cold.close(); }
