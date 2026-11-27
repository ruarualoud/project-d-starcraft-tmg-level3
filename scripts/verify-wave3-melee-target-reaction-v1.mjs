import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { OFFICIAL_FAQ_REACTION_POLICY_V13 } from '../packages/rule-atoms/official-faq-reaction-policy-v13.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialMeleeTargetAttackContextV1 }
  from '../packages/product-composition/official-melee-target-reaction-context-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const parent = 'build/ticket-28-wave2-capabilities-20261113-v1/';
const currentDefense = process.argv.includes('--current-defense');
const scope = currentDefense ? 'immortal-defense-current/melee' : 'melee-target-reaction';
const output = parent + scope + '/';
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const directory = path.join(root, output);
const ids = ['first', 'second', 'shield'];
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const roomId = id => 'wave3-' + scope.replaceAll('/', '-') + '-' + id;
const releaseId = id => 'wave3-u83-c84-r50-' + scope.replaceAll('/', '-') + '-' + id + '-v1';
const parameters = { closeRanksMode: 'decline', allocations: [
  { targetUnitId: 'a-immortal', dice: 1 }, { targetUnitId: 'b-immortal', dice: 1 }], surgeTargetUnitId: 'a-immortal' };
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n');
  return output + name;
}
async function saved(name) {
  try { return await read(output + name); }
  catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
function registry(folder = directory) {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(folder, 'releases.sqlite') });
  return { resolver: createOfficialReleaseResolverV2({ store, loadArtifact: read }), close: () => store.close() };
}
async function sourceProduct() {
  const product = registry(path.join(root, parent, 'melee-armour-reaction'));
  try { return await product.resolver.resolve({ releaseId: 'wave3-u83-c84-r50-melee-armour-reaction-single-v1',
    purpose: 'ability_component' }); } finally { product.close(); }
}
function runtimeFor(context, state) {
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
    definitionIds: [], includeMelee: true, includeArmourReactions: true, includeTargetReactions: true });
}
async function sceneFor(context) {
  const base = (await read(parent + 'melee-armour-reaction/single/authority.json')).state;
  const candidatesBySide = {
    player1: { sideKey: 'player1', scaleId: 'Skirmish', mineralBudget: 1000,
      factionRecordKey: 'tactical_cards:khalai', tacticalCardRecordKeys: [],
      units: [{ unitInstanceId: 'actor', recordKey: 'army_units:artanis', compositionKind: 'small', upgrades: [] }] },
    player2: { sideKey: 'player2', scaleId: 'Skirmish', mineralBudget: 1000,
      factionRecordKey: 'tactical_cards:khalai', tacticalCardRecordKeys: ['tactical_cards:robotics_facility'],
      units: ['a-immortal', 'b-immortal'].map(unitInstanceId => ({ unitInstanceId, recordKey: 'army_units:immortal',
        compositionKind: 'small', upgrades: [{ upgradeName: 'Shield Overcharge' }] })) },
  };
  const setup = createOfficialReleaseRosterStateV2({ context, candidatesBySide,
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state.officialRosterDisclosureDataBundle,
    includeMelee: true, ...(currentDefense ? { includeShieldedLifecycle: true } : {}), reactionDefinitionIds: ['unit:immortal/improved-barrier-any-phase@1', 'unit:immortal/shield-overcharge-any-phase@1'] });
  const scaffoldFields = ['round', 'phase', 'activeSideKey', 'firstPlayerSideKey',
    'engagementScale', 'armyBuildingEngagementScale', 'board', 'officialModelGapTransitPolicy',
    'officialStatusStayInPlayDataBundle', 'officialMissionRuntimeDescriptor', 'supplyLossLedger',
    'phaseFirstActorByRound'];
  const scaffold = Object.fromEntries(scaffoldFields.map(key => [key, structuredClone(base[key])]));
  const state = { ...scaffold, ...setup.state, log: [], officialFaqReactionPolicy: structuredClone(OFFICIAL_FAQ_REACTION_POLICY_V13) };
  const actor = state.pieces.find(piece => piece.id === 'actor');
  for (const piece of state.pieces) {
    piece.isOnField = true; piece.isInReserves = false; piece.statuses = ['Shielded'];
    const distance = (actor.models[0].baseWidthInches + piece.models[0].baseWidthInches) / 2 + 0.5;
    piece.models.forEach(model => Object.assign(model, { isOnField: true, yInches: 12,
      xInches: piece.id === 'actor' ? 16 : 16 + (piece.id === 'a-immortal' ? -distance : distance) }));
  }
  return { state, candidatesBySide, audits: setup.state.armyCompositionUpgradeAuditsBySide };
}
async function openProduct() {
  const product = registry();
  return { ...product, async branch(id) {
    const context = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'ability_component' });
    const authority = await read(output + id + '/authority.json');
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(output + id + '/runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory: path.join(directory, id), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { context, authority, runtime, native, close: () => native.close() };
  } };
}
async function checkpoint(id, current) {
  return save(id + '/checkpoint-r' + current.stateRevision + '.json', { envelope: current.envelope });
}
function selected(runtime, state, id) {
  const menu = runtime.enumerate(state);
  const window = state.pendingOfficialReactionWindow;
  if (window) {
    const owner = state.pendingOfficialAttackTargetReaction;
    const targetWindow = window.triggerKind === 'attack_target_selected';
    const targetId = targetWindow ? owner.targetId : state.pendingOfficialMeleePoolChoice.targets[state.pendingOfficialMeleePoolChoice.targetIndex].targetUnitId;
    const use = state.activeSideKey === 'player2' && (targetWindow
      ? id === 'first' && targetId === 'a-immortal' || id === 'second' && targetId === 'b-immortal' || currentDefense && id === 'combined'
      : id === 'shield' || currentDefense && id === 'combined');
    const name = targetWindow ? 'Improved Barrier' : 'Shield Overcharge';
    const domain = menu.parameterDomains.find(row => use
      ? row.actionType === 'resolve_reaction_family_ability' && row.sourceDomain.abilityName === name
      : row.actionType === 'pass_reaction_family_window');
    assert.ok(domain, 'expected declared target choice absent');
    return { domain, parameters: use
      ? { paymentCardInstanceIds: domain.sourceDomain.parameterSchema.paymentCardInstanceIds.const } : {} };
  }
  if (menu.parameterDomains.length) {
    const domain = menu.parameterDomains[0];
    const field = domain.sourceDomain.parameterSchema.required[0];
    const spec = domain.sourceDomain.parameterSchema[field];
    return { domain, parameters: { [field]: spec.items.enum.slice(0, spec.maxItems) } };
  }
  assert.equal(menu.candidates.length, 1);
  return { candidate: menu.candidates[0] };
}
function fixedWalk(runtime, initial, id) {
  let state = structuredClone(initial);
  const domain = runtime.enumerate(state).parameterDomains.find(row => row.pieceId === 'actor' && row.weaponName === 'Twilight Blades Strike');
  let action = runtime.instantiate(state, domain, parameters).action;
  const trace = [];
  for (let step = 0; step < 40; step++) {
    const rolls = [];
    if (action.chance) for (const kind of action.chance.revealOrder) {
      rolls.push(...Array(action.chance.layout[kind]).fill(kind === 'hit' ? 6 : 1));
    }
    const source = action.sourceAction.attackAction || state.pendingOfficialMeleePoolChoice?.attackAction;
    const result = runtime.apply(state, action, { chanceReveals: rolls });
    state = result.state;
    trace.push({ actionType: action.actionType, sideKey: action.sideKey, rolls, events: result.events,
      attackTargets: source?.meleePlan.fightChancePlan.targets.map(row => ({ id: row.targetUnitId,
        damage: row.damagePerDie, cap: row.weaponDamageCap || null })) || null,
      targetOwner: state.pendingOfficialAttackTargetReaction ? {
        targetId: state.pendingOfficialAttackTargetReaction.targetId,
        stage: state.pendingOfficialAttackTargetReaction.stage,
        processedTargets: state.pendingOfficialAttackTargetReaction.targetResolutions.map(row => row.targetId),
        skippedTargets: state.pendingOfficialAttackTargetReaction.skippedTargetUnitIds } : null });
    if (!state.pendingOfficialAttackTargetReaction && !state.pendingOfficialMeleePoolChoice) {
      return { state, trace, events: state.log.flatMap(row => row.events || []).filter(row => row.type === 'close_combat_attack') };
    }
    const choice = selected(runtime, state, id);
    action = choice.candidate ? Object.fromEntries(Object.entries(choice.candidate)
      .filter(([key]) => !['isEnabled', 'disabledReason', 'score', 'details'].includes(key)))
      : runtime.instantiate(state, choice.domain, choice.parameters).action;
  }
  assert.fail('declared two-target continuation exceeded its stages');
}

await fs.mkdir(directory, { recursive: true });
const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
  factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
  factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2',
  sourceRef: parent + 'melee-armour-reaction/read.json', contractVersion: currentDefense ? 'T28-W3-07-current-immortal-melee-defense-v1' : 'T28-W3-07-declared-melee-target-queue-v1',
}, steps: [
  { name: 'read', openProduct: sourceProduct, check: async context => {
    const weapon = context.dataset.recordsByKey['army_units:artanis'].payload.upgrades.find(row => row.name === 'Twilight Blades Strike');
    assert.match(weapon.description, /DMG: 3/);
    assert.doesNotMatch(weapon.description, /INSTANT/);
    const ref = await save('read.json', { weapon, source: context.dataset.recordsByKey['army_units:immortal'].payload.upgrades
      .filter(row => ['Improved Barrier', 'Shield Overcharge'].includes(row.name)), modelCalls: 0,
      legacyGapEstablishedBy: 'prior component factory excluded includeMelee for target reactions',
      legacyRuntimeRedCaptured: false });
    return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'compile', repairRef: repairRef || output + 'fixture-source-repair.json', openProduct: sourceProduct, check: async context => {
    const scene = await sceneFor(context);
    const runtime = runtimeFor(context, scene.state);
    assert.equal(runtime.descriptor.runtimeVersion, currentDefense ? '3.23.0' : '3.19.0');
    if (currentDefense) {
      assert.ok(scene.state.officialShieldedLifecyclePolicy);
      assert.ok(scene.state.pieces.filter(row => row.id.endsWith('immortal')).every(row => row.models[0].remainingWounds === 14));
    }
    const baseline = fixedWalk(runtime, scene.state, 'pass');
    assert.equal(baseline.state.officialReactionHistory?.length || 0, 0);
    await save('baseline.json', { counterfactualOnly: true, nativeReceiptsCreated: false, ...baseline });
    const comparisons = [];
    if (currentDefense) {
      const combined = fixedWalk(runtime, scene.state, 'combined');
      await save('combined-fixed.json', { counterfactualOnly: true, nativeReceiptsCreated: false, ...combined });
      assert.equal(combined.events.find(row => row.targetId === 'a-immortal').stages.damagePerDie, 1);
      assert.equal(combined.events.find(row => row.targetId === 'b-immortal').stages.damagePerDie, 3);
      assert.deepEqual(combined.state.officialReactionHistory.map(row => row.abilityName), ['Improved Barrier']);
      assert.ok(combined.events.every(row => row.stages.convertedFailedArmourDieIndices.length === 0));
    }
    for (const id of ids) {
      const fixed = fixedWalk(runtime, scene.state, id);
      assert.equal(fixed.events.length, 2);
      const cappedId = id === 'first' ? 'a-immortal' : 'b-immortal';
      if (id !== 'shield') {
        const capped = fixed.events.find(row => row.targetId === cappedId);
        const plain = baseline.events.find(row => row.targetId === cappedId);
        assert.equal(capped.stages.damagePerDie, 1); assert.equal(plain.stages.damagePerDie, 3);
        assert.equal(plain.stages.totalDamage - capped.stages.totalDamage, 2);
        assert.equal(fixed.events.find(row => row.targetId !== cappedId).stages.damagePerDie, 3);
        assert.deepEqual(fixed.state.officialReactionHistory.map(row => row.sourceInstanceId), [cappedId]);
      } else {
        assert.deepEqual(fixed.state.officialReactionHistory.map(row => row.abilityName), ['Shield Overcharge']);
        assert.equal(fixed.events.find(row => row.targetId === 'b-immortal').stages.convertedFailedArmourDieIndices.length, 1);
      }
      assert.ok(fixed.state.officialReactionResolutionHistory.every(row => row.consumedByHost));
      const ref = await save(id + '/fixed-walk.json', { counterfactualOnly: true, nativeReceiptsCreated: false, ...fixed });
      comparisons.push({ id, evidenceRef: ref });
      const product = registry();
      try {
        const descriptorRef = await save(id + '/runtime.json', runtime.descriptor);
        const m = context.manifest;
        product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset,
          snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef),
          datasetRef: m.source.datasetRef, snapshotRef: m.source.snapshotRef, sourceRevisionRef: m.source.sourceRevisionRef,
          referenceSources: m.source.references, sourcePolicy: m.source.policy,
          components: { ...m.components, rulesRuntime: { ref: descriptorRef, version: runtime.descriptor.runtimeVersion,
            integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
        const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'ability_component' });
        await save(id + '/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved, state: scene.state,
          scenario: { scale: 1000, fullMatch: false, round: 1, phase: 'combat', placementAndPhaseDeclared: true,
            sourceWeaponDamage: 3, declaredTargets: ['a-immortal', 'b-immortal'] } }));
      } finally { product.close(); }
    }
    const ref = await save('compile.json', { candidatesBySide: scene.candidatesBySide, audits: scene.audits, comparisons });
    return { evidenceRef: ref, checkpointRef: output + 'first/authority.json' };
  } },
  { name: 'consume', openProduct, check: async product => {
    const cases = [];
    for (const id of ids) {
      const prior = await saved(id + '/consume.json'); if (prior) { cases.push(prior); continue; }
      const branch = await product.branch(id);
      try {
        const { native, authority, runtime } = branch;
        const credentials = await native.create(roomId(id), authority);
        const before = await native.store.loadRoom(roomId(id));
        const query = runtime.query(before.envelope.state, { queryKind: 'melee_action_preview', actionType: 'fight',
          pieceId: 'actor', weaponName: 'Twilight Blades Strike', parameters });
        const first = await native.commit({ roomId: roomId(id), credential: credentials.player1, operationKey: 'declare-targets',
          select: row => row.actionType === 'fight' && row.weaponName === 'Twilight Blades Strike', parameters: () => parameters });
        assert.equal(first.preview.core.chanceTicket, null);
        assert.deepEqual(first.preview.core.action, query.result.action);
        const current = await native.store.loadRoom(roomId(id)); await checkpoint(id, current);
        assert.equal(current.envelope.state.pendingOfficialMeleePoolChoice, undefined);
        const ref = await save(id + '/consume.json', { id, revision: current.stateRevision,
          declaredBeforeAttackDice: true, queryEqualsNativePreview: true });
        cases.push({ id, evidenceRef: ref });
      } finally { branch.close(); }
    }
    const ref = await save('consume.json', { cases }); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'successor', openProduct, check: async product => {
    const cases = [];
    for (const id of ids) {
      const prior = await saved(id + '/successor.json'); if (prior) { cases.push(prior); continue; }
      const branch = await product.branch(id);
      try {
        const { native, authority, runtime } = branch;
        const credentials = await native.create(roomId(id), authority);
        for (let step = 0; step < 40; step++) {
          const current = await native.store.loadRoom(roomId(id)); await checkpoint(id, current);
          if (!current.envelope.state.pendingOfficialAttackTargetReaction && !current.envelope.state.pendingOfficialMeleePoolChoice) break;
          const choice = selected(runtime, current.envelope.state, id);
          await native.commit({ roomId: roomId(id), credential: credentials[current.envelope.state.activeSideKey],
            operationKey: 'continuation-' + current.stateRevision,
            ...(choice.candidate ? { kind: 'finite', select: row => row.action.sourceActionHash === choice.candidate.sourceActionHash }
              : { select: row => row.domainId === choice.domain.domainId, parameters: () => choice.parameters }) });
        }
        const current = await native.store.loadRoom(roomId(id)); await checkpoint(id, current);
        assert.equal(current.envelope.state.pendingOfficialMeleePoolChoice, undefined);
        assert.equal(current.envelope.state.pendingOfficialAttackTargetReaction, undefined);
        assert.equal(current.envelope.state.pendingOfficialReactionWindow, undefined);
        const events = current.envelope.state.log.flatMap(row => row.events || []).filter(row => row.type === 'close_combat_attack');
        assert.deepEqual(events.map(row => row.targetId), ['a-immortal', 'b-immortal']);
        const reactions = current.envelope.state.officialReactionHistory || [];
        if (id !== 'shield') {
          assert.deepEqual(reactions.map(row => row.abilityName), ['Improved Barrier']);
          assert.equal(events.find(row => row.targetId === (id === 'first' ? 'a-immortal' : 'b-immortal')).stages.damagePerDie, 1);
        }
        assert.ok(current.envelope.state.officialReactionResolutionHistory.every(row => row.consumedByHost));
        const legal = await native.room.legalSpace({ roomId: roomId(id), seatToken: credentials[current.envelope.state.activeSideKey].seatToken });
        assert.equal(legal.ok, true, JSON.stringify(legal));
        assert.ok(legal.legalSpace.finiteActions.length || legal.legalSpace.parameterDomains.length);
        await save(id + '/checkpoint.json', { envelope: current.envelope });
        const value = { id, revision: current.stateRevision, events, reactions, nextMenuAvailable: true };
        await save(id + '/successor.json', value); cases.push(value);
      } finally { branch.close(); }
    }
    const ref = await save('successor.json', { cases }); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'coldRecovery', openProduct, check: async product => {
    const cases = [];
    for (const id of ids) {
      const branch = await product.branch(id);
      try {
        const { native, authority } = branch; await native.restoreDependencies(roomId(id), authority);
        const before = await native.store.loadRoom(roomId(id));
        const bundle = await native.store.loadReplayBundle(roomId(id));
        const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
        const checkpoints = (await fs.readdir(path.join(directory, id))).filter(name => /^checkpoint-r\d+\.json$/u.test(name));
        for (const file of checkpoints) {
          const expected = (await read(output + id + '/' + file)).envelope;
          const replay = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, expected.stateRevision) });
          assert.equal(replay.ok, true, JSON.stringify(replay)); assert.deepEqual(replay.envelope, expected);
        }
        assert.deepEqual(await native.store.loadRoom(roomId(id)), before);
        cases.push({ id, receipts: receipts.length, checkpoints: checkpoints.length, revision: before.stateRevision, replayExact: true });
      } finally { branch.close(); }
    }
    const ref = await save('cold-recovery.json', { cases }); return { evidenceRef: ref, checkpointRef: ref };
  } },
] });
console.log(JSON.stringify({ status: result.status, passed: Object.keys(result.passed), failures: result.failures }));
if (result.status !== 'passed') process.exitCode = 1;

if (result.status === 'passed' && process.argv.includes('--integrity-control')) {
  const integrity = await runProductBoundaryCheck({ directory: path.join(directory, 'integrity-control'), identity: {
    factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
    factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: output + 'cold-recovery.json',
    contractVersion: 'T28-W3-07-melee-target-owner-integrity-v1',
  }, steps: [{ name: 'consume', openProduct, check: async product => {
    const cases = [];
    let readyState;
    let childState;
    for (const id of ids) {
      const branch = await product.branch(id);
      try {
        const before = await branch.native.store.loadRoom(roomId(id));
        const checkpoints = (await fs.readdir(path.join(directory, id))).filter(name => /^checkpoint-r\d+\.json$/u.test(name));
        for (const file of checkpoints) {
          const { envelope } = await read(output + id + '/' + file);
          const state = envelope.state;
          const owner = state.pendingOfficialAttackTargetReaction;
          if (!owner) continue;
          const original = structuredClone(state);
          const legal = branch.runtime.enumerate(state);
          assert.ok(legal.candidates.length || legal.parameterDomains.length);
          if (owner.stage === 'reaction') assert.equal(state.pendingOfficialMeleePoolChoice, undefined);
          if (owner.stage === 'ready' && !state.pendingOfficialMeleePoolChoice && id === 'second') readyState = state;
          if (state.pendingOfficialMeleePoolChoice) {
            childState = state;
            const child = state.pendingOfficialMeleePoolChoice;
            const view = JSON.parse(JSON.stringify(createOfficialMeleeTargetAttackContextV1(state)));
            assert.ok(branch.runtime.melee.inspectContext(view, child.attackAction));
            assert.throws(() => branch.runtime.enumerate(view), /ATTACK_TARGET_REACTION_PARENT_INVALID/);
            const missing = structuredClone(state);
            delete missing.pendingOfficialAttackTargetReaction;
            assert.throws(() => branch.runtime.enumerate(missing), /MELEE_POOL_PARENT_INVALID/);
          }
          assert.deepEqual(state, original);
          cases.push({ id, revision: envelope.stateRevision, stage: owner.stage,
            childStage: state.pendingOfficialMeleePoolChoice?.stage || null, menuAvailable: true });
        }
        assert.deepEqual(await branch.native.store.loadRoom(roomId(id)), before);
      } finally { branch.close(); }
    }
    assert.ok(readyState && childState);
    const branch = await product.branch('second');
    try {
      for (const mutate of [
        state => { state.pendingOfficialAttackTargetReaction.childParentHash = '0'.repeat(64); },
        state => { state.pendingOfficialAttackTargetReaction.targetUnitIds.reverse(); },
      ]) {
        const state = structuredClone(childState);
        mutate(state);
        const owner = state.pendingOfficialAttackTargetReaction;
        owner.parentHash = hash(Object.fromEntries(Object.entries(owner).filter(([key]) => key !== 'parentHash')));
        assert.throws(() => branch.runtime.enumerate(state), /ATTACK_TARGET_REACTION_PARENT_INVALID/);
      }
      const swapped = structuredClone(readyState);
      const owner = swapped.pendingOfficialAttackTargetReaction;
      owner.targetResolutions.forEach(row => { row.targetId = row.targetId === 'a-immortal' ? 'b-immortal' : 'a-immortal'; });
      owner.parentHash = hash(Object.fromEntries(Object.entries(owner).filter(([key]) => key !== 'parentHash')));
      assert.throws(() => branch.runtime.enumerate(swapped), /ATTACK_TARGET_REACTION_RESOLUTION_INVALID/);
    } finally { branch.close(); }
    const ref = await save('integrity-control.json', { cases, missingOwnerRejected: true,
      rehashedWrongChildRejected: true, rehashedTargetOrderRejected: true, rehashedWrongResolutionTargetRejected: true,
      serializedContextReadonlyOnly: true, currentRoomsUnchanged: true, nativeActions: 0, modelCalls: 0 });
    return { evidenceRef: ref, checkpointRef: ref };
  } }] });
  console.log(JSON.stringify({ integrityControl: integrity.status, failures: integrity.failures }));
  if (integrity.status !== 'passed') process.exitCode = 1;
}

if (result.status === 'passed' && process.argv.includes('--legacy-control')) {
  const legacy = await runProductBoundaryCheck({ directory: path.join(directory, 'legacy-control'), identity: {
    factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
    factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: parent + 'melee-armour-reaction/cold-recovery.json',
    contractVersion: 'T28-W3-07-melee-target-legacy-native-control-v1',
  }, steps: [{ name: 'coldRecovery', openProduct: sourceProduct, check: async () => {
    const cases = [];
    const templateDefinitions = (await read(parent + 'tank-spatial/selection.json')).definitionIds;
    const specs = [
      ...['single', 'split'].map(id => ({ folder: 'melee-armour-reaction', id,
        releaseId: 'wave3-u83-c84-r50-melee-armour-reaction-' + id + '-v1', roomId: 'wave3-melee-armour-reaction-' + id,
        options: { definitionIds: [], includeMelee: true, includeArmourReactions: true } })),
      ...['single', 'split'].map(id => ({ folder: 'immortal-stomp', id,
        releaseId: 'wave3-u83-c84-r50-immortal-stomp-' + id + '-v1', roomId: 'wave2-immortal-stomp-' + id,
        options: { definitionIds: [], includeMelee: true } })),
      ...['single', 'multiple'].map(id => ({ folder: 'heavy-plating-hits', id,
        releaseId: 'wave3-u83-c84-r50-heavy-plating-hits-' + id + '-v1', roomId: 'wave2-heavy-plating-hits-' + id,
        options: { definitionIds: ['unit:siege_tank/heavy-plating-any-phase@1', 'unit:zeratul/shadow-strike-combat-phase@1'],
          includeMelee: true, includeHits: true } })),
      { folder: 'immortal-impact', id: '', releaseId: 'wave3-u83-c84-r50-immortal-impact-v1', roomId: 'wave2-immortal-impact',
        options: { definitionIds: [], includeMelee: true } },
      ...['main-first', 'spillover-first'].map(id => ({ folder: 'template-target-reaction', id,
        releaseId: 'wave3-u83-c84-r50-template-target-reaction-' + id + '-v1', roomId: 'wave3-template-target-reaction-' + id,
        options: { definitionIds: templateDefinitions, includeRanged: true, includeTemplateAttacks: true, includeTemplateBatchOrder: true,
          includeTargetReactions: true, includePrecisionChoices: true, includeArmourChoices: true, includeArmourReactions: true } })),
      ...['barrier', 'shield'].map(id => ({ folder: 'immortal-reaction-composition', id,
        releaseId: 'wave3-u83-c84-r50-immortal-reaction-composition-' + id + '-v1', roomId: 'wave2-immortal-reaction-composition-' + id,
        options: { definitionIds: ['unit:immortal/for-the-ancients-assault-phase@1'], includeRanged: true,
          includeTargetReactions: true, includePrecisionChoices: true, includeArmourChoices: true, includeArmourReactions: true } })),
    ];
    for (const spec of specs) {
      const prefix = parent + spec.folder + '/' + (spec.id ? spec.id + '/' : '');
      const product = registry(path.join(root, parent, spec.folder));
      try {
        const context = await product.resolver.resolve({ releaseId: spec.releaseId, purpose: 'ability_component' });
        const authority = await read(prefix + 'authority.json');
        const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state, ...spec.options });
        assert.deepEqual(runtime.descriptor, await read(prefix + 'runtime.json'));
        const native = openWave3EngineeringRoomV1({ directory: path.join(root, prefix), filename: 'room.sqlite',
          rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
        try {
          const before = await native.store.loadRoom(spec.roomId);
          await native.restoreDependencies(spec.roomId, authority);
          const bundle = await native.store.loadReplayBundle(spec.roomId);
          const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
          const checkpoints = (await fs.readdir(path.join(root, prefix)))
            .filter(name => /^checkpoint-r\d+\.json$/u.test(name) || name.endsWith('checkpoint.json'));
          assert.ok(checkpoints.length);
          for (const file of checkpoints) {
            const expected = (await read(prefix + file)).envelope;
            const replay = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, expected.stateRevision) });
            assert.equal(replay.ok, true, JSON.stringify(replay)); assert.deepEqual(replay.envelope, expected);
          }
          assert.deepEqual(await native.store.loadRoom(spec.roomId), before);
          cases.push({ roomId: spec.roomId, receipts: receipts.length, checkpoints: checkpoints.length,
            runtimeVersion: runtime.descriptor.runtimeVersion, descriptorExact: true, replayExact: true, currentUnchanged: true });
        } finally { native.close(); }
      } finally { product.close(); }
    }
    const ref = await save('legacy-control.json', { cases, modelCalls: 0 });
    return { evidenceRef: ref, checkpointRef: ref };
  } }] });
  console.log(JSON.stringify({ legacyControl: legacy.status, failures: legacy.failures }));
  if (legacy.status !== 'passed') process.exitCode = 1;
}
