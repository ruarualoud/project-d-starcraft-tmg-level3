import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom, resolveWave3StandardContext } from './support/wave3-standard-action-room-v1.mjs';
import { declareWave3EngineeringCoherencyV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { refreshOfficialRoundSupplyOccupancyV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { OFFICIAL_PNEUMATIZED_CARAPACE_ID } from '../packages/product-composition/official-reaction-family-adapter-v1.mjs';

import { OFFICIAL_LAIR_PREDATION_ID } from '../packages/product-composition/official-zerg-unique-family-adapter-v1.mjs';
import { poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const dir = base + '/overseer-charge-v257';
const branch = process.argv[2] || 'prefix';
assert(['prefix', 'use', 'pass', 'predation'].includes(branch));
const roomId = 'overseer-charge-v257-' + branch;
const actor = 'hydralisk', enemy = 'nova_stealth_mode';
const version = '2.57.0';
let native, revision;

function setFielded(state, id, x, y) {
  const piece = state.pieces.find(p => p.id === id);
  Object.assign(piece, { isOnField: true, isInReserves: false, deploymentStatus: 'deployed',
    leadingModelId: piece.models[0].id, xInches: x, yInches: y });
  state.reserveManifestBySide[piece.sideKey].find(r => r.pieceId === id).deploymentStatus = 'deployed';
  piece.models.forEach((model,i) => Object.assign(model, { isOnField: true, xInches: x - i * 2.5, yInches: y }));
}

async function cold(bound, authority, envelope) {
  const stored = bound.open();
  try {
    await stored.restoreDependencies(roomId, authority);
    const b = await stored.store.loadReplayBundle(roomId);
    const journal = b.privateJournal.filter(r => r.payload.type === 'accepted_transition').map(r => r.payload.payload.receipt);
    assert.equal(journal.length, envelope.stateRevision);
    const replay = stored.engine.replay({ initialEnvelope: b.initialEnvelope, journal });
    assert(replay.ok, replay.reason);
    assert.deepEqual(replay.envelope, envelope);
  } finally { stored.close(); }
}

async function verifyPredation({ bound, authority, seats }) {
  for (;;) {
    const { envelope, stateRevision } = await native.store.loadRoom(roomId);
    revision = stateRevision;
    assert(revision < 18, 'bounded melee sequence');
    const state = envelope.state, side = state.activeSideKey;
    const menu = await native.room.legalSpace({ roomId, seatToken: seats[side].seatToken });
    assert(menu.ok, menu.message);
    const { parameterDomains: domains, finiteActions: finite } = menu.legalSpace;
    const events = state.log.flatMap(r => r.events || []);
    const attack = events.find(e => e.type === 'close_combat_attack' && e.pieceId === actor && e.targetId === enemy);
    const card = state.cardResources.player2.find(c => c.officialCardRecordKey === 'tactical_cards:lair');
    const types = [...domains.map(d => d.actionType), ...finite.map(c => c.action.actionType)];
    await save(dir + '/predation-menu-r' + revision + '.json', { revision, side, types, stateHash: envelope.stateHash });
    if (attack) {
      assert.equal(attack.enemyReactionAllowed, false);
      assert.equal(card.readiness, 'exhausted');
      assert(types.length);
      await cold(bound, authority, envelope);
      await save(dir + '/predation-result.json', { roomId, revision, stateHash: envelope.stateHash, weapon: attack.weaponName,
        target: attack.targetId, damage: attack.stages.totalDamage, enemyReactionAllowed: attack.enemyReactionAllowed,
        sourceDefinitionId: OFFICIAL_LAIR_PREDATION_ID, cardReadiness: card.readiness, nextActions: types, coldExact: true, modelCalls: 0 });
      return;
    }
    const fight = domains.find(d => d.pieceId === actor && d.actionType === 'fight');
    const common = { roomId, credential: seats[side], operationKey: 'predation-r' + revision };
    if (revision === 0) {
      assert(fight && fight.constraints.enemyReactionAllowed);
      await native.commit({ ...common, choice: { actionType:'resolve_zerg_unique_ability', pieceId:actor, definitionId:OFFICIAL_LAIR_PREDATION_ID },
        parameters: d => ({ activeUnitId:actor, paymentCardInstanceIds:d.parameterSchema.paymentCardInstanceIds.enum[0] }) });
    } else if (fight) {
      assert.equal(fight.constraints.enemyReactionAllowed, false);
      assert.equal(state.selectedRosterActivationWindow.pieceId, actor);
      const active = state.pieces.find(p => p.id === actor);
      assert(active.officialAbilityEffects.some(e => e.sourceDefinitionId === OFFICIAL_LAIR_PREDATION_ID && e.targetPieceId === actor));
      await native.commit({ ...common, select:d => d.domainId === fight.domainId, parameters: () => ({
        closeRanksMode:'decline', allocations:[{targetUnitId:enemy,dice:fight.constraints.declineCloseRanksAttackDice}],
        ...(fight.parameterSchema.required.includes('surgeTargetUnitId') ? {surgeTargetUnitId:enemy} : {}),
        ...(fight.parameterSchema.required.includes('criticalTargetUnitId') ? {criticalTargetUnitId:enemy} : {}) }) });
    } else {
      const domain = domains.find(d => d.actionType === 'pass_reaction_family_window') || (domains.length === 1 ? domains[0] : null);
      if (domain) await native.commit({ ...common, select:d => d.domainId === domain.domainId, parameters:poolParameters });
      else {
        assert.equal(finite.length, 1, 'expected a single native fight continuation: ' + types);
        await native.commit({ ...common, kind:'finite', select:c => c.actionKey === finite[0].actionKey });
      }
    }
  }
}

try {
  const source = await read(base + '/inherited-zerg-standard-2.57.0/swarm.json');
  assert.equal(source.rows.filter(r => r.registrationStatus === 'executable_exact').length, 60);
  const context = await resolveWave3StandardContext(await read(source.manifestRef), 'area_ability_inputs');
  const { state: opening } = prepareOfficialStandardReleaseOpeningV2({ releaseMatchVersion: version, releaseContext: context,
    dataset: context.dataset, snapshot: context.snapshot, recipes: source.recipes, missionRecordKey: source.mission,
    deploymentRecordKey: source.deployment, armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY });
  const route = opening.officialReactionFamilySourceBundle.routes.find(r => r.definitionId === OFFICIAL_PNEUMATIZED_CARAPACE_ID);
  assert.equal(route.sourceFeatureHash, source.rows.find(r => r.definitionId === route.definitionId).sourceFeatureHash);
  const phase = branch === 'predation' ? 'combat' : 'assault';
  const scenario = { phase, actor, enemy, branch, twoHumanSeats: true };
  const bound = await bindWave3StandardActionRoom({ initial: opening, manifestRef: source.manifestRef, candidateVersion: version,
    dir, ...(branch !== 'prefix' ? { frozenRuntimeRef: dir + '/runtime.json' } : {}), scenario });
  native = bound.open();
  let initial, prefix, authority;
  if (branch === 'prefix' || branch === 'predation') {
    initial = structuredClone(opening);
    setFielded(initial, actor, 12, 4);
    setFielded(initial, enemy, branch === 'predation' ? 14 : 16, 4);
    Object.assign(initial, { stage: 'activation_phases', phase, activeSideKey: 'player2', firstPlayerSideKey: 'player2' });
    initial.phaseFirstActorByRound['1:' + phase] = { phase, round: 1, chosenFirstActorSideKey: 'player2', markerHolderSideKey: 'player2' };
    delete initial.selectedRosterActivationWindow;
    declareWave3EngineeringCoherencyV1(initial, { planIdPrefix: roomId });
    initial.officialRoundSupplyState = refreshOfficialRoundSupplyOccupancyV1({ state: initial });
    authority = bound.authorityFor(initial, scenario);
  } else {
    prefix = await read(dir + '/prefix-result.json');
    const original = await native.store.loadRoom(prefix.roomId);
    assert.equal(original.envelope.stateHash, prefix.stateHash);
    assert.equal(original.stateRevision, prefix.revision);
    initial = original.envelope.state;
    authority = bound.authorityFor(initial, { ...scenario, prefixStateHash: prefix.stateHash });
  }
  const seats = await native.create(roomId, authority);
  if (branch === 'predation') await verifyPredation({ bound, authority, seats });
  else for (;;) {
    const aggregate = await native.store.loadRoom(roomId);
    revision = aggregate.stateRevision;
    assert(revision < 12, 'bounded charge scenario');
    const { envelope } = aggregate;
    const state = envelope.state;
    const side = state.activeSideKey;
    const legal = await native.room.legalSpace({ roomId, seatToken: seats[side].seatToken });
    assert(legal.ok, legal.message || legal.reason);
    const { parameterDomains: domains, finiteActions: finite } = legal.legalSpace;
    const types = [...domains.map(d => d.actionType), ...finite.map(c => c.action.actionType)];
    const unit = state.pieces.find(p => p.id === actor);
    const target = state.pieces.find(p => p.id === enemy);
    const card = state.cardResources.player2.find(c => c.officialCardRecordKey === 'tactical_cards:overseer');
    const pending = state.pendingAction;
    let domain, parameters, candidate;
    await save(dir + '/' + branch + '-menu-r' + revision + '.json', { branch, revision, side, types, stateHash: envelope.stateHash });
    if (state.pendingOfficialReactionWindow?.triggerKind === 'after_charge_roll') {
      assert.equal(side, 'player2');
      const use = domains.find(d => d.definitionId === route.definitionId);
      const pass = domains.find(d => d.actionType === 'pass_reaction_family_window');
      assert(use && pass && types.length === 2);
      assert.equal(use.constraints.originalChargeRoll, pending.chargeRoll);
      assert.equal(use.constraints.originalMaximumDistanceMilliInches, pending.maxDistanceMilliInches);
      assert.equal(card.readiness, 'ready');
      if (branch === 'prefix') {
        await cold(bound, authority, envelope);
        await save(dir + '/prefix-result.json', { roomId, revision, stateHash: envelope.stateHash, originalRoll: pending.chargeRoll,
          maxDistance: pending.maxDistanceMilliInches, chargePlanHash: pending.chargePlan.chargePlanHash, coldExact: true });
        break;
      }
      assert.equal(pending.chargePlan.chargePlanHash, prefix.chargePlanHash);
      domain = branch === 'use' ? use : pass;
      parameters = branch === 'use' ? { paymentCardInstanceIds: use.parameterSchema.paymentCardInstanceIds.const } : {};
    } else if (branch !== 'prefix' && (domain = domains.find(d => d.actionType === 'resolve_charge'))) {
      const rolled = state.log.flatMap(r => r.events || []).filter(e => e.type === 'additional_charge_die_resolved');
      assert.equal(rolled.length, branch === 'use' ? 1 : 0);
      const extra = rolled[0]?.additionalRoll;
      const best = branch === 'use' ? Math.max(prefix.originalRoll, extra) : prefix.originalRoll;
      const distance = prefix.maxDistance + 1000 * (best - prefix.originalRoll);
      assert.equal(pending.chargeRoll, best);
      assert.equal(domain.constraints.maxDistanceMilliInches, distance);
      assert.equal(card.readiness, branch === 'use' ? 'exhausted' : 'ready');
      assert(state.officialReactionResolutionHistory.some(r => r.triggerKind === 'after_charge_roll' && r.consumedByHost));
      await save(dir + '/' + branch + '-distance.json', { originalRoll: prefix.originalRoll, extra, kept: best, distance,
        cardReadiness: card.readiness, prefixStateHash: prefix.stateHash, revision, stateHash: envelope.stateHash });
      const lead = unit.models[0], foe = target.models[0];
      const x = Math.round(foe.xInches * 1000) - Math.round(lead.baseWidthInches * 500) - Math.round(foe.baseWidthInches * 500);
      const point = { xMilliInches: x, yMilliInches: 4000, elevation: 'ground', supportTerrainIds: [] };
      parameters = { outcome: 'success', path: [point], placements: unit.models.slice(1).map(m => ({
        ...point, modelId: m.id, xMilliInches: x + Math.round((m.xInches - lead.xInches) * 1000), rotationDegrees: 0 })) };
    } else if (branch !== 'prefix' && state.log.some(r => r.events?.some(e => e.type === 'charge_succeeded' && e.pieceId === actor))) {
      assert(types.length > 0);
      await cold(bound, authority, envelope);
      await save(dir + '/' + branch + '-result.json', { roomId, branch, revision, stateHash: envelope.stateHash,
        ...await read(dir + '/' + branch + '-distance.json').then(({ revision, stateHash, ...rest }) => rest),
        nextActions: types, positions: unit.models.map(m => [m.xInches, m.yInches]), coldExact: true, modelCalls: 0 });
      break;
    } else if (branch === 'prefix' && (domain = domains.find(d => d.actionType === 'charge' && d.pieceId === actor))) {
      parameters = { leadingModelId: unit.models[0].id, targets: [{ unitId: enemy, modelId: target.models[0].id }] };
    } else if (branch === 'prefix') {
      candidate = finite.find(c => c.action.actionType === 'roll_declared_charge');
      if (!candidate) {
        domain = domains.find(d => d.actionType === 'pass_reaction_family_window');
        assert(domain, 'missing charge declaration continuation in ' + types);
        parameters = {};
      }
    } else throw Error('unexpected charge successor ' + types);
    await native.commit({ roomId, credential: seats[side], operationKey: branch + '-r' + revision,
      ...(candidate ? { kind: 'finite', select: c => c.actionKey === candidate.actionKey }
        : { select: d => d.domainId === domain.domainId, parameters: () => parameters }) });
  }
} catch (error) {
  await save(dir + '/' + branch + '-stop-' + Date.now() + '.json', { branch, revision, reason: error.message, detail: error.detail, frames: error.stack?.split('\n').slice(0,5) });
  throw error;
} finally { native?.close(); }
