import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { read, root, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom } from './support/wave3-standard-action-room-v1.mjs';
import { openWave3EngineeringStoreV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { bindCocoonRavagerBranch } from './support/wave3-cocoon-ravager-branch-v243.mjs';
import { poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const generated = process.argv.includes('--cocoon');
const from = base + (generated ? '/cocoon-ravager-charge-v243' : '/ravager-charge-v243');
const dir = base + (generated ? '/cocoon-ravager-claws-v243' : '/ravager-claws-v243');
const roomId = generated ? 'standard-cocoon-ravager-claws-v243' : 'standard-ravager-claws-signed-map-v243';
const origin = await read(from + '/result.json');
assert(origin.coldExact);
const parent = openWave3EngineeringStoreV1({ directory: path.join(root, from), filename: 'room.sqlite' });
let start, initial, recovered;
try {
  start = (await parent.loadRoom(origin.roomId)).envelope;
  const bundle = await parent.loadReplayBundle(origin.roomId);
  initial = bundle.initialEnvelope;
  if (generated) recovered = await bindCocoonRavagerBranch({base, parentDir: from, dir, source: origin, bundle, checkpoint: origin});
  assert.equal(start.stateHash, origin.stateHash);
  assert.equal(start.stateRevision, origin.revision);
} finally { parent.close(); }
await mkdir(path.join(root, dir), { recursive: true });
const source = await read(base + '/ravager-deep-tunnel-v242/opening.json');
const scenario = { sourceRoom: origin.roomId, sourceRevision: origin.revision, sourceStateHash: origin.stateHash };
const bound = recovered?.bound ?? await bindWave3StandardActionRoom({ manifestRef: source.sourceManifest, initial: initial.state, dir,
  candidateVersion: origin.version, scenario, frozenRuntimeRef: base + '/ravager-plasma-v243/runtime.json' });
const authority = recovered?.authority ?? bound.authorityFor(start.state, scenario);
const native = bound.open();
let revision;
try {
  const seats = await native.create(roomId, authority);
  for (;;) {
    const { envelope, stateRevision } = await native.store.loadRoom(roomId);
    revision = stateRevision;
    assert(revision < 28, 'unexpected number of decisions before Claws successor');
    const state = envelope.state;
    if (revision === 0) assert.equal(envelope.stateHash, origin.stateHash);
    const side = state.activeSideKey;
    const actor = state.pieces.find(p => p.id === origin.actorId);
    const target = state.pieces.find(p => p.id === origin.targetId);
    const menu = await native.room.legalSpace({ roomId, seatToken: seats[side].seatToken });
    assert(menu.ok, menu.message || menu.reason);
    const { parameterDomains, finiteActions } = menu.legalSpace;
    const domains = parameterDomains.map(d => ({ type: d.actionType, actor: d.pieceId, weapon: d.weaponName }));
    const finite = finiteActions.map(c => c.action.actionType);
    await save(dir + '/menu-r' + revision + '.json', { revision, stateHash: envelope.stateHash, phase: state.phase,
      side, pendingStage: state.pendingAction?.stage, domains, finite });
    const events = state.log.slice(start.state.log.length).flatMap(row => row.events || []);
    const attack = events.find(e => e.type === 'close_combat_attack' && e.pieceId === actor.id
      && e.weaponName === 'Claws' && e.targetId === target.id);
    const counter = parameterDomains.find(d => d.actionType === 'fight' && d.pieceId === target.id);
    if (attack && side === target.sideKey && !state.pendingAction && !state.pendingOfficialReactionWindow
        && (counter || finite.includes('pass'))) {
      assert.equal(state.phase, 'combat');
      assert.equal(attack.stages.hitRolls.length, 2);
      assert.equal(attack.stages.hitThreshold, 4);
      assert.equal(attack.stages.damagePerDie, 1);
      const cold = bound.open();
      try {
        await cold.restoreDependencies(roomId, authority);
        const replay = await cold.store.loadReplayBundle(roomId);
        const receipts = replay.privateJournal.filter(entry => entry.payload.type === 'accepted_transition')
          .map(entry => entry.payload.payload.receipt);
        assert.equal(replay.initialEnvelope.stateHash, origin.stateHash);
        const rebuilt = cold.engine.replay({ initialEnvelope: replay.initialEnvelope, journal: receipts });
        assert(rebuilt.ok, rebuilt.reason);
        assert.deepEqual(rebuilt.envelope, envelope);
        assert.equal(receipts.length, revision);
        await save(dir + '/result.json', { ...scenario, roomId, revision, stateHash: envelope.stateHash,
          round: state.round, phase: state.phase, actor: actor.id, target: target.id, weapon: attack.weaponName,
          rolls: attack.stages.hitRolls, threshold: attack.stages.hitThreshold, damage: attack.stages.totalDamage,
          casualties: attack.casualtyModelIds, nextSide: side, nextWeapons: domains.filter(d => d.type === 'fight'),
          receipts: receipts.length, coldExact: true, modelCalls: 0 });
      } finally { cold.close(); }
      break;
    }
    let domain, candidate, parameters;
    const claws = parameterDomains.find(d => d.actionType === 'fight' && d.pieceId === actor.id && d.weaponName === 'Claws');
    if (claws && !attack) {
      assert.equal(side, actor.sideKey);
      assert.equal(state.phase, 'combat');
      assert(claws.constraints.targetUnitIds.includes(target.id));
      assert.equal(claws.constraints.declineCloseRanksAttackDice, 2);
      domain = claws;
      parameters = { closeRanksMode: 'decline', allocations: [{ targetUnitId: target.id, dice: 2 }] };
      await save(dir + '/declaration.json', { revision, stateHash: envelope.stateHash, actor: actor.id,
        target: target.id, weapon: claws.weaponName, profile: claws.constraints.sourceProfileHash, parameters });
    } else {
      // All choices come from the public menu. The two seats pass Assault to reach Combat.
      for (const type of ['pass_reaction_family_window', 'resolve_ordered_corrosive_bile_effect',
        'finish_activation', 'choose_first_actor', 'pass']) {
        domain = parameterDomains.find(d => d.actionType === type);
        candidate = finiteActions.find(c => c.action.actionType === type && (type !== 'choose_first_actor'
          || (c.action.sourceAction?.chosenFirstActorSideKey ?? c.action.chosenFirstActorSideKey) === actor.sideKey));
        if (domain || candidate) break;
      }
      if (!domain && !candidate && parameterDomains.length + finiteActions.length === 1) {
        [domain] = parameterDomains;
        [candidate] = finiteActions;
      }
      assert(domain || candidate, JSON.stringify({ phase: state.phase, domains, finite }));
      if (domain) parameters = poolParameters(domain);
    }
    await native.commit({ roomId, credential: seats[side], operationKey: 'claws-r' + revision,
      ...(domain ? { select: d => d.domainId === domain.domainId, parameters: () => parameters }
        : { kind: 'finite', select: c => c.actionKey === candidate.actionKey }) });
  }
} catch (error) {
  await save(dir + '/stop-' + Date.now() + '.json', { revision, message: error.message, frame: error.stack?.split('\n')[1] });
  throw error;
} finally { native.close(); }
