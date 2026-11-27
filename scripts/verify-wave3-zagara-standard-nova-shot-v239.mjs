import assert from 'node:assert/strict';
import path from 'node:path';
import { read, root, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { declareWave3EngineeringCoherencyV1, openWave3EngineeringStoreV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { bindWave3StandardActionRoom } from './support/wave3-standard-action-room-v1.mjs';
import { refreshOfficialRoundSupplyOccupancyV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const source = base + '/zagara-standard-admission-v239', dir = source + '/numeric-shot';
const proof = await read(source + '/swarm/cold.json');
assert(proof.exact);
const store = openWave3EngineeringStoreV1({ directory: path.join(root, source, 'swarm'), filename: 'room.sqlite' });
let initial;
try {
  const parent = await store.loadRoom('zagara-standard-swarm');
  assert.equal(parent.envelope.stateHash, proof.stateHash);
  initial = parent.envelope.state;
} finally { store.close(); }
const attacker = 'nova_stealth_mode', target = 'defiler', owner = 'player1', defender = 'player2';
const swarmId = 'unit:defiler/dark-swarm-assault-phase@1';
const roomId = 'zagara-standard-headshot-reactions';
function assertReactionLedger(state, reduction) {
  const used = state.officialReactionHistory.filter(row => row.activationId
    === [state.round, state.phase, owner, attacker].join(':'));
  assert.deepEqual(used.map(row => [row.sideKey, row.definitionId]), [[owner,
    'unit:nova_stealth_mode/head-shot-assault-phase@1'], [defender, swarmId]]);
  assert.equal(reduction, undefined, 'Dark Swarm uses the defender reaction for this activation');
  return used.map(({ sideKey, activationId, definitionId }) => ({ sideKey, activationId, definitionId }));
}

if (process.argv.includes('--inspect-committed')) {
  const store = openWave3EngineeringStoreV1({ directory: path.join(root, dir), filename: 'room.sqlite' });
  try {
    const { envelope, stateRevision } = await store.loadRoom(roomId);
    const shot = await read(dir + '/shot.json');
    assert.equal(shot.stateHash, envelope.stateHash);
    const events = envelope.state.log.flatMap(row => row.events || []);
    const reactions = assertReactionLedger(envelope.state, events.find(row => row.type === 'ranged_damage_reaction_resumed'));
    await save(dir + '/reaction-limit.json', { revision: stateRevision, stateHash: envelope.stateHash, reactions,
      damagePool: shot.actualDamage, transfusionUsed: false, reason: 'defender_used_dark_swarm_this_activation' });
  } finally { store.close(); }
  process.exit(0);
}
const piece = (state, id) => state.pieces.find(p => p.id === id);
const defiler = piece(initial, target).models[0], dest = { x: defiler.xInches, y: defiler.yInches };
for (const [id, x, y] of [[attacker, dest.x - 7, dest.y], ['zagara', dest.x, dest.y + 5]]) {
  const actor = piece(initial, id);
  Object.assign(actor, { isOnField: true, isInReserves: false, deploymentStatus: 'deployed',
    xInches: x, yInches: y, leadingModelId: actor.models[0].id });
  Object.assign(actor.models[0], { isOnField: true, xInches: x, yInches: y });
  initial.reserveManifestBySide[actor.sideKey].find(r => r.pieceId === id).deploymentStatus = 'deployed';
}
Object.assign(initial, { stage: 'activation_phases', phase: 'assault', activeSideKey: owner, firstPlayerSideKey: owner });
initial.phaseFirstActorByRound['1:assault'] = { round: 1, phase: 'assault', chosenFirstActorSideKey: owner, markerHolderSideKey: owner };
delete initial.selectedRosterActivationWindow;
piece(initial, attacker).statuses.push('stationary');
declareWave3EngineeringCoherencyV1(initial, { planIdPrefix: roomId });
initial.officialRoundSupplyState = refreshOfficialRoundSupplyOccupancyV1({ state: initial });
const { open, authority } = await bindWave3StandardActionRoom({ manifestRef: base + '/tabletop-raven-m01-v1/manifest.json',
  initial, dir, candidateVersion: '2.39.0', scenario: { sourceStateHash: proof.stateHash, signedSwarmMovement: true,
    declaredAssaultAndTwoModelPositions: true, fullRound: false } });
const native = open();
try {
  const seats = await native.create(roomId, authority);
  for (;;) {
    const { stateRevision, envelope } = await native.store.loadRoom(roomId);
    assert(stateRevision < 30, 'shot sequence exceeded the fixture bound');
    const state = envelope.state, side = state.activeSideKey;
    const menu = await native.room.legalSpace({ roomId, seatToken: seats[side].seatToken });
    assert(menu.ok, menu.reason ?? menu.code);
    const { parameterDomains, finiteActions } = menu.legalSpace;
    const events = state.log.flatMap(r => r.events || []);
    const shot = events.find(e => e.type === 'ranged_attack' && e.pieceId === attacker && e.targetId === target);
    const reduction = events.find(e => e.type === 'ranged_damage_reaction_resumed');
    const trigger = state.pendingOfficialReactionWindow?.triggerKind;
    await save(dir + '/menu-r' + stateRevision + '.json', { revision: stateRevision, stateHash: envelope.stateHash, side, trigger,
      finite: finiteActions.map(r => r.action.actionType), domains: parameterDomains.map(r => ({
        id: r.definitionId, type: r.actionType, piece: r.pieceId, required: r.parameterSchema?.required,
        payment: r.parameterSchema?.paymentCardInstanceIds?.const })) });
    if (shot && !trigger && !state.pendingCurrentProductRangedDamageReaction && !state.pendingCurrentProductRangedCasualtyChoice) {
      assert(events.some(e => e.type === 'reaction_ability_resolved' && e.definitionId === swarmId),
        'Dark Swarm reaction never applied');
      assertReactionLedger(state, reduction);
      await save(dir + '/shot.json', { revision: stateRevision, stateHash: envelope.stateHash, weapon: shot.weaponName,
        resolvedReactionIds: events.filter(e => e.type === 'reaction_ability_resolved').map(e => e.definitionId),
        actualDamage: shot.stages.damage, damageReduction: reduction?.damagePool ?? null,
        next: parameterDomains.map(d => d.actionType), finiteNext: finiteActions.map(d => d.action.actionType) });
      break;
    }
    let domain, parameters;
    if (stateRevision === 0) {
      domain = parameterDomains.find(r => r.actionType === 'declare_ranged_attack' && r.pieceId === attacker);
      assert(domain?.parameterSchema.reactionAbilityName.enum.includes('Head Shot'));
      const choice = domain.constraints.choices.find(row => row.reactionAbilityName === 'Head Shot');
      assert(choice, 'Head Shot must have a legal source-bound payment');
      parameters = { reactionAbilityName: choice.reactionAbilityName, paymentCardInstanceIds: choice.paymentCardInstanceIds };
    } else if (trigger) {
      const wanted = trigger === 'attack_target_selected' ? swarmId : null;
      if (trigger === 'damage_received' && side === defender) assert(!parameterDomains.some(r =>
        r.definitionId === 'unit:zagara/transfusion-any-phase@1'), 'defender already used Dark Swarm');
      const choices = side === defender && wanted ? parameterDomains.filter(r => r.definitionId === wanted) : [];
      domain = choices.find(r => r.parameterSchema.required.length === 1
        && r.parameterSchema.required.includes('paymentCardInstanceIds'));
      if (choices.length) assert(domain, 'expected ordinary card payment for ' + wanted);
      if (domain) {
        parameters = { paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.const };
        await save(dir + '/choice-r' + stateRevision + '.json', { id: wanted, side, trigger, payment: parameters.paymentCardInstanceIds });
      } else {
        domain = parameterDomains.find(r => r.actionType === 'pass_reaction_family_window');
        assert(domain, 'unexpected reaction domain for ' + trigger + ' at r' + stateRevision);
        parameters = {};
      }
    } else if (stateRevision === 1) {
      domain = parameterDomains.find(r => r.actionType === 'ranged_attack' && r.pieceId === attacker);
      assert(domain);
      parameters = { targetUnitId: target };
    } else if (parameterDomains.length === 1) {
      [domain] = parameterDomains;
      parameters = poolParameters(domain);
    } else {
      assert.equal(parameterDomains.length, 0);
      assert.equal(finiteActions.length, 1);
    }
    const choice = domain ? { select: r => r.domainId === domain.domainId, parameters: () => parameters }
      : { kind: 'finite', select: r => r.actionKey === finiteActions[0].actionKey };
    await native.commit({ roomId, credential: seats[side], operationKey: 'r' + stateRevision, ...choice });
  }
} finally { native.close(); }
const cold = open();
try {
  await cold.restoreDependencies(roomId, authority);
  const end = await cold.store.loadRoom(roomId), bundle = await cold.store.loadReplayBundle(roomId);
  const receipts = bundle.privateJournal.filter(r => r.payload.type === 'accepted_transition').map(r => r.payload.payload.receipt);
  const replay = cold.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts });
  assert.equal(replay.ok, true);
  assert.deepEqual(replay.envelope, end.envelope);
  await save(dir + '/cold.json', { revision: end.stateRevision, receipts: receipts.length, stateHash: end.envelope.stateHash, exact: true });
} finally { cold.close(); }
