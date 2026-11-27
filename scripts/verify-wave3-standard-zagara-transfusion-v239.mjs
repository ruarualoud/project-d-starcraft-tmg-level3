import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { read, root, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom } from './support/wave3-standard-action-room-v1.mjs';
import { openWave3EngineeringRoomV1, openWave3EngineeringStoreV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';

const integration = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const base = integration + '/zagara-standard-admission-v239';
const source = base + '/numeric-shot', dir = base + '/transfusion';
const sourceId = 'zagara-standard-headshot-reactions', roomId = 'zagara-standard-preserve-transfusion';
const swarm = 'unit:defiler/dark-swarm-assault-phase@1', heal = 'unit:zagara/transfusion-any-phase@1';
const choice = await read(source + '/menu-r3.json');
assert.equal(choice.trigger, 'attack_target_selected');
assert(choice.domains.some(d => d.id === swarm));
const database = { directory: path.join(root, source), filename: 'room.sqlite' };
const sourceStore = openWave3EngineeringStoreV1(database);
let sourceBundle;
try { sourceBundle = await sourceStore.loadReplayBundle(sourceId); } finally { sourceStore.close(); }
const nativeReceipts = bundle => bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
  .map(row => row.payload.payload.receipt);
const parentReceipts = nativeReceipts(sourceBundle);
assert.equal(parentReceipts[choice.revision - 1].postStateHash, choice.stateHash);
const bound = await bindWave3StandardActionRoom({
  manifestRef: integration + '/tabletop-raven-m01-v1/manifest.json', frozenRuntimeRef: source + '/runtime.json',
  initial: sourceBundle.initialEnvelope.state, dir, candidateVersion: '2.39.0', scenario: { sourceId }
});
const origin = { sourceId, sourceRevision: choice.revision, sourceStateHash: choice.stateHash,
  sourceBindingHash: sourceBundle.initialEnvelope.matchBindingHash, branchChoice: 'pass_at_target_selection' };
await mkdir(path.join(root, dir), { recursive: true });
const native = bound.open();
let authority;
try {
  let forkState;
  const existing = await native.store.loadReplayBundle(roomId);
  if (existing) forkState = existing.initialEnvelope.state;
  else {
    const parent = openWave3EngineeringRoomV1({ ...database, rulesRuntime: bound.rulesRuntime });
    try {
      await parent.restoreDependencies(sourceId, bound.authority);
      const replay = parent.engine.replay({ initialEnvelope: sourceBundle.initialEnvelope,
        journal: parentReceipts.slice(0, choice.revision) });
      assert(replay.ok, replay.reason);
      assert.equal(replay.envelope.stateHash, choice.stateHash);
      forkState = replay.envelope.state;
    } finally { parent.close(); }
  }
  assert.equal(hash(forkState), choice.stateHash);
  authority = bound.authorityFor(forkState, origin);
  const seats = await native.create(roomId, authority);
  const opened = await native.store.loadReplayBundle(roomId);
  assert.equal(opened.initialEnvelope.stateHash, choice.stateHash);
  await save(dir + '/origin.json', origin);
  for (;;) {
    const { stateRevision: revision, envelope } = await native.store.loadRoom(roomId);
    assert(revision <= 12, 'unexpected successor in single attack');
    const state = envelope.state, side = state.activeSideKey;
    const { ok, legalSpace, reason } = await native.room.legalSpace({ roomId, seatToken: seats[side].seatToken });
    assert(ok, reason);
    const { finiteActions: finite, parameterDomains: domains } = legalSpace;
    const window = state.pendingOfficialReactionWindow;
    const events = state.log.flatMap(row => row.events || []);
    const shot = events.find(row => row.type === 'ranged_attack' && row.pieceId === 'nova_stealth_mode' && row.targetId === 'defiler');
    if (shot && !window && !state.pendingCurrentProductRangedDamageReaction && !state.pendingCurrentProductRangedCasualtyChoice) {
      const reduced = events.find(row => row.type === 'ranged_damage_reaction_resumed');
      assert(reduced, 'positive damage and native Transfusion settlement required for this gate');
      const pending = await read(dir + '/pre-allocation.json');
      assert.equal(reduced.triggerHash, pending.triggerHash);
      assert.equal(reduced.chanceReusedWithoutReroll, true);
      const { reactionDamagePool, ...damage } = shot.stages.damage;
      assert.deepEqual(reactionDamagePool, reduced.damagePool);
      assert.equal(hash({ ...shot.stages, damage }), pending.rollStagesHash);
      assert.equal(reactionDamagePool.incomingDamage, pending.incomingDamage);
      assert.equal(reactionDamagePool.requestedReduction, 2);
      assert.equal(reactionDamagePool.reductionAppliedBeforeCasualtyAllocation, true);
      assert.equal(reactionDamagePool.totalDamageAfterReduction, Math.max(0, reactionDamagePool.totalDamageBeforeReduction - 2));
      const history = state.officialReactionHistory.filter(row => row.sideKey === 'player2'
        && row.activationId === '1:assault:player1:nova_stealth_mode');
      assert.deepEqual(history.map(row => row.definitionId), [heal]);
      assert(domains.some(d => d.actionType === 'finish_activation') || finite.some(d => d.action.actionType === 'finish_activation'));
      const defiler = state.pieces.find(p => p.id === 'defiler');
      await save(dir + '/result.json', { revision, stateHash: envelope.stateHash, rollStagesHash: pending.rollStagesHash,
        pool: reduced.damagePool, payment: await read(dir + '/payment.json'), targetDamageMarker: defiler.damageMarker,
        targetRemainingModels: defiler.currentModels, successor: 'finish_activation', chanceReusedWithoutReroll: true });
      break;
    }
    const pending = state.pendingCurrentProductRangedDamageReaction;
    if (pending && window?.triggerKind === 'damage_received') {
      const stages = pending.resolvedChance.resolution.stages;
      assert(stages.damage.totalDamage > 0);
      await save(dir + '/pre-allocation.json', { triggerHash: pending.triggerHash,
        rollStagesHash: hash(stages), incomingDamage: stages.damage.totalDamage, pendingHash: pending.checkpointHash });
    }
    let domain, parameters, selectedFinite;
    if (window) {
      if (revision === 0) {
        assert.equal(side, 'player2');
        assert.equal(window.triggerKind, 'attack_target_selected');
        assert(domains.some(d => d.definitionId === swarm));
      }
      if (window.triggerKind === 'damage_received' && side === 'player2') {
        domain = domains.find(d => d.definitionId === heal && d.parameterSchema.required.length === 1
          && d.parameterSchema.required[0] === 'paymentCardInstanceIds');
        assert(domain, 'preserved reaction must expose the Zagara Transfusion payment');
        parameters = { paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.const };
        await save(dir + '/payment.json', { definitionId: heal, side, paymentCardInstanceIds: parameters.paymentCardInstanceIds,
          resourceCost: domain.constraints.resourceCostsByChoice.default, revision, stateHash: envelope.stateHash });
      } else {
        domain = domains.find(d => d.actionType === 'pass_reaction_family_window');
        assert(domain);
        parameters = {};
      }
    } else if (finite.length === 1 && domains.length === 0) selectedFinite = finite[0];
    else {
      assert.equal(finite.length, 0);
      assert.equal(domains.length, 1);
      [domain] = domains;
      parameters = poolParameters(domain);
    }
    const action = selectedFinite
      ? { kind: 'finite', select: d => d.actionKey === selectedFinite.actionKey }
      : { select: d => d.domainId === domain.domainId, parameters: () => parameters };
    await native.commit({ roomId, credential: seats[side], operationKey: 'step-' + revision, ...action });
  }
} finally { native.close(); }
const cold = bound.open();
try {
  await cold.restoreDependencies(roomId, authority);
  const end = await cold.store.loadRoom(roomId), bundle = await cold.store.loadReplayBundle(roomId);
  const receipts = nativeReceipts(bundle);
  const replay = cold.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts });
  assert(replay.ok, replay.reason);
  assert.deepEqual(replay.envelope, end.envelope);
  await save(dir + '/cold.json', { revision: end.stateRevision, receipts: receipts.length,
    initialHash: bundle.initialEnvelope.stateHash, finalHash: end.envelope.stateHash, exact: true });
} finally { cold.close(); }
