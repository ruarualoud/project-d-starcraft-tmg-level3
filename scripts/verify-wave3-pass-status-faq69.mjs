import assert from 'node:assert/strict';
import path from 'node:path';
import { read, root, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { openWave3EngineeringStoreV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { bindWave3StandardActionRoom, assertWave3StandardRoomColdReplayV1 } from './support/wave3-standard-action-room-v1.mjs';
import { enumerateOfficialMovementHoldActionsV1, applyOfficialMovementHoldV1 } from '../packages/rule-atoms/official-movement-hold-executor-v1.mjs';
import { enumerateOfficialAssaultHoldActionsV1, applyOfficialAssaultHoldV1 } from '../packages/rule-atoms/official-assault-hold-executor-v1.mjs';

const version = '2.99.4';
const sourceDir = 'build/ticket-28-wave3-hold-faq68/purchased/' + version;
const sourceResult = await read(sourceDir + '/result.public.json');
const roomId = 'wave3-faq69-markers-only';
const dir = 'build/ticket-28-wave3-hold-faq68/pass-control';
const coverage = await read('build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nerazim-standard-2.81.0/coverage.json');
const store = openWave3EngineeringStoreV1({ directory:path.join(root, sourceDir), filename:'room.sqlite', readOnly:true });
let saved;
try { saved = await store.loadReplayBundle(sourceResult.roomId); } finally { store.close(); }
const options = { initial:saved.initialEnvelope.state, manifestRef:coverage.manifestRef, candidateVersion:version };
const parent = await bindWave3StandardActionRoom({ ...options, dir:sourceDir, frozenRuntimeRef:sourceDir + '/runtime.json',
  scenario:{ positions:{stalker1:[12,8],watchers2:[36,25]}, providerCalls:0 } });
const reader = parent.open({readOnly:true});
let prefix;
try {
  await reader.restoreDependencies(sourceResult.roomId, parent.authority);
  const receipts = saved.privateJournal.filter(row => row.payload.type === 'accepted_transition').slice(0,3).map(row => row.payload.payload.receipt);
  assert.equal(receipts.at(-1).action.actionType, 'resolve_characteristic_status_ability');
  const replay = reader.engine.replay({ initialEnvelope:saved.initialEnvelope, journal:receipts });
  assert(replay.ok, replay.reason);
  prefix = replay.envelope;
  assert.equal(prefix.stateHash, receipts.at(-1).postStateHash);
} finally { reader.close(); }

const unit = state => state.pieces.find(piece => piece.id === 'stalker1');
const hidden = state => unit(state).statuses.find(status => status.statusName === 'hidden');
assert(hidden(prefix.state)?.statusEffectHash);
assert.equal(prefix.state.officialHoldActionFaq, 'faq-v1.3:68');

// Preserve the purchased effect and the original board. Only the phase and open activation
// are conditioned: the player must be free to pass at the start of the tested activation.
function beforeChoice(phase) {
  const state = structuredClone(prefix.state);
  assert.equal(state.selectedRosterActivationWindow.pieceId, 'stalker1');
  delete state.selectedRosterActivationWindow;
  state.phase = phase;
  state.phaseFirstActorByRound[state.round + ':' + phase] = {round:state.round,phase,chosenFirstActorSideKey:'player1',markerHolderSideKey:'player1'};
  assert.equal(state.activeSideKey, 'player1');
  assert.notEqual(unit(state).activatedPhases[phase], true);
  assert.notEqual(state.players.player1.passedPhases[phase], true);
  return state;
}
const holds = [];
for (const [phase, enumerate, apply] of [
  ['movement', enumerateOfficialMovementHoldActionsV1, applyOfficialMovementHoldV1],
  ['assault', enumerateOfficialAssaultHoldActionsV1, applyOfficialAssaultHoldV1],
]) {
  const state = beforeChoice(phase);
  const action = enumerate(state).find(row => row.isEnabled && row.pieceId === 'stalker1');
  assert(action);
  const applied = apply(state, action);
  assert(applied.ok && !hidden(applied.state));
  const expiry = applied.state.actionPerformedStatusHistory.at(-1);
  assert.deepEqual(expiry.removedStatusEffectHashes, [hidden(state).statusEffectHash]);
  assert.equal(expiry.cause, 'declared_hold');
  holds.push({phase, executor:applied.executorId, expiry:expiry.cause});
}

const state = beforeChoice('assault');
const scenario = {source:sourceResult.roomId,sourceRevision:prefix.stateRevision,sourceHash:prefix.stateHash,
  conditioned:'Fresh Assault decision with the original paid Hidden effect, no activation in progress',providerCalls:0};
const branch = await bindWave3StandardActionRoom({...options,dir,scenario});
const authority = branch.authorityFor(state,scenario);
const app = branch.open();
try {
  const seats = await app.create(roomId, authority);
  await app.commit({roomId,credential:seats.player1,kind:'finite',operationKey:'pass-with-purchased-hidden',
    select:row => row.action.actionType === 'pass' && row.action.phase === 'assault'});
  const head = (await app.store.loadRoom(roomId)).envelope;
  assert.equal(head.stateRevision, 1);
  const events = head.state.log.slice(state.log.length).flatMap(row => row.events ?? []);
  assert.deepEqual(events.map(event => event.type), ['pass']);
  assert(events[0].markedPieceIds.includes('stalker1'));
  assert.equal(head.state.players.player1.passedPhases.assault,true);
  assert.equal(unit(head.state).activatedPhases.assault,true);
  assert.equal(head.state.activeSideKey,'player2');
  assert.deepEqual(hidden(head.state),hidden(state));
  assert.deepEqual(head.state.actionPerformedStatusHistory,state.actionPerformedStatusHistory);
  assert.deepEqual(head.state.board.effectMarkers,state.board.effectMarkers);
  const journal = await assertWave3StandardRoomColdReplayV1(branch,authority,roomId,head);
  await save(dir+'/result.public.json',{...scenario,roomId,holds,events,preservedStatusHash:hidden(head.state).statusEffectHash,
    historyUnchanged:true,markersUnchanged:true,nextSide:head.state.activeSideKey,revision:head.stateRevision,journal,cold:true});
} finally { app.close(); }
