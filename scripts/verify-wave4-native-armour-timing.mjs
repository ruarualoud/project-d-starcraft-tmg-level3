import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadWave4TimingInputs, createWave4AttackScene, bindWave4TimingRoom, timingParameters } from './support/wave4-timing-room-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { openWave3EngineeringStoreV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 } from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputs = await loadWave4TimingInputs(root);
const parent = path.join(root, 'build/wave4-web/native-armour-timing');
await fs.mkdir(parent, { recursive: true });
const run = process.argv[2] ? path.resolve(process.argv[2]) : await fs.mkdtemp(path.join(parent, 'run-'));
assert.ok(run.startsWith(parent + path.sep + 'run-'), 'ISOLATED_TIMING_RUN_REQUIRED');
const previous = await fs.readFile(path.join(run, 'result.public.json'), 'utf8').then(JSON.parse).catch(error => {
  if (error.code !== 'ENOENT') throw error; return null;
});
const results = [];
function select(runtime, state, spec, use) {
  const menu = runtime.enumerate(state);
  if (state.pendingOfficialReactionWindow) {
    const type = use && state.activeSideKey === 'player2' ? 'resolve_reaction_family_ability' : 'pass_reaction_family_window';
    const domain = menu.parameterDomains.find(d => d.actionType === type);
    assert.ok(domain, 'REACTION_MENU_REQUIRED:' + type);
    return { domain, parameters: timingParameters(domain) };
  }
  const fight = menu.parameterDomains.find(d => d.actionType === 'fight' && d.pieceId === state.pieces[0].id);
  if (fight) return { domain: fight, parameters: { closeRanksMode: 'decline',
    allocations: [{ targetUnitId: state.pieces[1].id, dice: fight.constraints.declineCloseRanksAttackDice }],
    ...(fight.parameterSchema.required.includes('surgeTargetUnitId') ? { surgeTargetUnitId: state.pieces[1].id } : {}),
    ...(fight.parameterSchema.required.includes('criticalTargetUnitId') ? { criticalTargetUnitId: state.pieces[1].id } : {}) } };
  if (menu.parameterDomains.length === 1) return { domain: menu.parameterDomains[0], parameters: timingParameters(menu.parameterDomains[0]) };
  const enabled = menu.candidates.filter(c => c.isEnabled !== false);
  assert.equal(enabled.length, 1, JSON.stringify({ domains: menu.parameterDomains.map(d => d.actionType), finite: enabled.map(c => c.actionType) }));
  return { candidate: enabled[0] };
}
function fixed(runtime, initial, spec, use) {
  let state = structuredClone(initial);
  const trace = [];
  for (let i = 0; i < 25; i++) {
    const choice = select(runtime, state, spec, use);
    const action = choice.candidate ? Object.fromEntries(Object.entries(choice.candidate).filter(([k]) => !['isEnabled','disabledReason','score','details'].includes(k)))
      : runtime.instantiate(state, choice.domain, choice.parameters).action;
    const rolls = (action.chance?.revealOrder || []).flatMap(kind => Array(action.chance.layout[kind]).fill(kind === 'hit' ? 6 : kind === 'armour' && spec.dodge ? 6 : 2));
    const applied = runtime.apply(state, action, { chanceReveals: rolls });
    state = applied.state; trace.push({ actionType: action.actionType, sideKey: action.sideKey, rolls, events: applied.events });
    const damage = state.log.flatMap(r => r.events || []).find(e => e.type === 'close_combat_attack');
    if (damage) return { state, damage, trace };
  }
  throw Error('NATIVE_ARMOUR_SEQUENCE_BOUNDED');
}
for (const spec of inputs.reactions.routes.filter(r => r.triggerKind === 'before_armour_roll')) {
  const state = createWave4AttackScene(inputs, spec);
  const requiredConsumerError = { 'tactical_cards:armory': 'VEHICLE_PLATING_ARMOUR_CONSUMER_REQUIRED',
    'tactical_cards:robotics_facility': 'PLASMA_SHIELDS_ARMOUR_CONSUMER_REQUIRED',
    'tactical_cards:vanadium_plating': 'CRYSTALLINE_ALLOY_ARMOUR_CONSUMER_REQUIRED' }[spec.recordKey];
  if (requiredConsumerError) assert.throws(() => createOfficialCharacteristicStatusComponentRuntimeV2({
    context: inputs.context, spatialState: state, definitionIds: [], sourceDefinitionIds: [spec.definitionId],
    includeMelee: true, includeArmourReactions: false }), new RegExp(requiredConsumerError));
  const directory = path.join(run, spec.recordKey.split(':')[1]);
  const bound = await bindWave4TimingRoom({ inputs, state, definitionId: spec.definitionId, directory });
  const control = fixed(bound.runtime, state, spec, false);
  const used = fixed(bound.runtime, state, spec, true);
  assert.ok(used.trace.some(r => r.events.some(e => e.type === 'reaction_ability_resolved')));
  assert.equal(used.damage.stages.toughValue - control.damage.stages.toughValue, spec.tough || 0);
  if (spec.dodge) {
    assert.equal(used.damage.stages.dodge, spec.dodge);
    assert.equal(used.damage.stages.bypassedArmourDice, Math.max(0, control.damage.stages.bypassedArmourDice - spec.dodge));
    assert.ok(used.damage.stages.dodgeCounts.dodgeReductionApplied > 0);
  }
  assert.ok(used.damage.stages.totalDamage < control.damage.stages.totalDamage);
  const fixedControl = { useDamage: used.damage.stages.totalDamage, passDamage: control.damage.stages.totalDamage,
    toughAdded: spec.tough || 0, dodgeAdded: spec.dodge || 0,
    dodgeTransferReduction: used.damage.stages.dodgeCounts?.dodgeReductionApplied || 0,
    damageEventHash: hash(used.damage), traceHash: hash(used.trace) };
  await atomicWrite(path.join(directory, 'fixed-control.json'), JSON.stringify({ used, control }));
  const cached = previous?.results.find(r => r.definitionId === spec.definitionId);
  if (cached) {
    const saved = JSON.parse(await fs.readFile(path.join(directory, 'checkpoint.json'), 'utf8'));
    assert.equal(saved.stateHash, cached.stateHash);
    const store = openWave3EngineeringStoreV1({ directory, filename: 'room.sqlite', readOnly: true });
    try {
      assert.deepEqual((await store.loadRoom(cached.roomId)).envelope, saved);
      assert.equal(cached.coldReplayMatched, true);
    } finally { store.close(); }
    results.push({ ...cached, fixedControl, missingConsumerRejected: Boolean(requiredConsumerError) });
    continue;
  }
  const emptyPoolBranches = [];
  // Fixed engineering Match IDs exercise both empty and nonempty real dice pools.
  // An empty Armour pool (including bypassing hits) is retained as a negative branch.
  for (let attempt = 0; attempt < 8; attempt++) {
  let native = bound.open();
  const roomId = 'wave4-native-armour-' + spec.recordKey.split(':')[1] + '-' + attempt;
  let credentials, expected;
  const checkpoints = [], trace = [];
  try {
    credentials = await native.create(roomId, bound.authority, { matchId: roomId + '-v1' });
    for (let step = 0; step < 25; step++) {
      const current = await native.store.loadRoom(roomId);
      checkpoints.push(current.envelope);
      const currentState = current.envelope.state;
      const attack = currentState.log.flatMap(r => r.events || []).find(e => e.type === 'close_combat_attack');
      if (attack) { expected = current; break; }
      const choice = select(bound.runtime, currentState, spec, true);
      const request = { roomId, credential: credentials[currentState.activeSideKey], operationKey: 'native-' + current.stateRevision,
        ...(choice.candidate ? { kind: 'finite', select: d => d.action.sourceActionHash === choice.candidate.sourceActionHash }
          : { select: d => d.domainId === choice.domain.domainId, parameters: () => choice.parameters }) };
      const committed = await native.commit(request);
      assert.equal(committed.idempotentReplayVerified, true);
      trace.push({ revision: current.stateRevision + 1, side: currentState.activeSideKey,
        actionType: choice.candidate?.actionType || choice.domain.actionType,
        trigger: currentState.pendingOfficialReactionWindow?.triggerKind || null });
    }
    assert.ok(expected, 'NATIVE_DAMAGE_REQUIRED');
    const after = expected.envelope.state;
    if (!after.officialReactionHistory?.some(r => r.definitionId === spec.definitionId)) {
      const attack = after.log.flatMap(r => r.events || []).find(e => e.type === 'close_combat_attack');
      assert.equal(attack.stages.armourDice, 0, 'NONEMPTY_POOL_MISSING_REACTION:' + spec.definitionId);
      assert.equal(after.cardResources.player2[0].readiness, 'ready');
      const replay = await native.room.replayRoom({ roomId, seatToken: credentials.player1.seatToken });
      assert.equal(replay.matchesCurrent, true);
      emptyPoolBranches.push({ roomId, signedReceipts: expected.stateRevision, stateHash: expected.envelope.stateHash,
        hits: attack.stages.hits, armourDice: 0, cardUnspent: true, replayMatched: true });
      continue;
    }
    assert.equal(after.cardResources.player2[0].readiness, 'exhausted');
    assert.ok(after.officialReactionResolutionHistory.every(r => r.consumedByHost));
    assert.equal(after.pendingOfficialReactionWindow, undefined);
    assert.equal(after.pendingOfficialMeleePoolChoice, undefined);
    const legal = await native.room.legalSpace({ roomId, seatToken: credentials[after.activeSideKey].seatToken });
    assert.equal(legal.ok, true); assert.ok(legal.legalSpace.finiteActions.length + legal.legalSpace.parameterDomains.length > 0);
    await atomicWrite(path.join(directory, 'checkpoint.json'), JSON.stringify(expected.envelope));
    results.push({ definitionId: spec.definitionId, roomId, signedReceipts: expected.stateRevision,
      sourceAction: 'fight', armourRoll: trace.some(r => r.actionType === 'roll_melee_attack_armour_pool'),
      trace, cardExhausted: true, effectConsumed: true, successorSide: after.activeSideKey, successorMenuAvailable: true,
      fixedControl,
      stateHash: expected.envelope.stateHash, bindingHash: expected.envelope.matchBindingHash,
      emptyPoolBranches, missingConsumerRejected: Boolean(requiredConsumerError), fullAttackOwnerVerified: true, fullMatchAdmission: false });
  } finally { native.close(); }
  native = bound.open();
  try {
    await native.restoreDependencies(roomId, bound.authority);
    const bundle = await native.store.loadReplayBundle(roomId);
    const receipts = bundle.privateJournal.filter(r => r.payload.type === 'accepted_transition').map(r => r.payload.payload.receipt);
    for (const checkpoint of checkpoints) {
      const replay = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, checkpoint.stateRevision) });
      assert.equal(replay.ok, true); assert.deepEqual(replay.envelope, checkpoint);
    }
    assert.deepEqual((await native.store.loadRoom(roomId)).envelope, expected.envelope);
    results.at(-1).coldReplayMatched = true;
  } finally { native.close(); }
  break;
  }
  assert.equal(results.at(-1)?.definitionId, spec.definitionId, 'NONEMPTY_NATIVE_POOL_REQUIRED');
  console.log('passed native attack ' + spec.definitionId);
}
const report = { schema: 'starcraft_tmg_wave4_native_armour_timing_v1', status: 'passed', inventoryHash: inputs.inventory.inventoryHash,
  definitionsVerified: results.length, results, scope: 'complete native melee attack producer, actual armour dice, effect consumption and successor; conditional engineering scenes',
  sourceHeldDefinitions: 39, fullWave4Admission: false, webAcceptance: 'separate_gate', modelCalls: 0, trainingTruth: false, productionPromoted: false };
await atomicWrite(path.join(run, 'result.public.json'), JSON.stringify(report, null, 2) + '\n');
await atomicWrite(path.join(root, 'docs/development/wave4/evidence/native-armour-timing.public.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, definitions: results.length, signedReceipts: results.reduce((n,r)=>n+r.signedReceipts,0), run }));
