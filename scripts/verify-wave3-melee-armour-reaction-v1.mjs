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
import { createOfficialSupplyLossLedgerV1 } from '../packages/rule-atoms/official-supply-loss-ledger-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const parent = 'build/ticket-28-wave2-capabilities-20261113-v1/';
const output = parent + 'melee-armour-reaction/';
const directory = path.join(root, output);
const ids = ['single', 'split'];
const weaponId = 'unit:immortal/stomp-combat-phase@1';
const reactionId = 'unit:immortal/shield-overcharge-any-phase@1';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const roomId = id => 'wave3-melee-armour-reaction-' + id;
const releaseId = id => 'wave3-u83-c84-r50-melee-armour-reaction-' + id + '-v1';
const parametersFor = id => ({ closeRanksMode: 'decline', allocations: id === 'single'
  ? [{ targetUnitId: 'z-immortal', dice: 3 }]
  : [{ targetUnitId: 'a-zealots', dice: 1 }, { targetUnitId: 'z-immortal', dice: 2 }] });
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
  const product = registry(path.join(root, parent, 'immortal-stomp'));
  try { return await product.resolver.resolve({ releaseId: 'wave3-u83-c84-r50-immortal-stomp-single-v1',
    purpose: 'ability_component' }); } finally { product.close(); }
}
function runtimeFor(context, state) {
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state, definitionIds: [],
    includeMelee: true, includeArmourReactions: true });
}
async function sceneFor(context) {
  const base = (await read(parent + 'immortal-stomp/single/authority.json')).state;
  const candidatesBySide = {
    player1: { sideKey: 'player1', scaleId: 'Skirmish', mineralBudget: 500,
      factionRecordKey: 'tactical_cards:khalai', tacticalCardRecordKeys: [],
      units: [{ unitInstanceId: 'actor', recordKey: 'army_units:immortal', compositionKind: 'small', upgrades: [] }] },
    player2: { sideKey: 'player2', scaleId: 'Skirmish', mineralBudget: 500,
      factionRecordKey: 'tactical_cards:khalai', tacticalCardRecordKeys: [],
      units: [{ unitInstanceId: 'z-immortal', recordKey: 'army_units:immortal', compositionKind: 'small',
        upgrades: [{ upgradeName: 'Shield Overcharge' }] },
      { unitInstanceId: 'a-zealots', recordKey: 'army_units:zealot', compositionKind: 'small', upgrades: [] }] },
  };
  const setup = createOfficialReleaseRosterStateV2({ context, candidatesBySide,
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state.officialRosterDisclosureDataBundle,
    includeMelee: true, meleeWeaponDefinitionIds: [weaponId], reactionDefinitionIds: [reactionId] });
  const state = { ...structuredClone(base), ...setup.state, round: 1, phase: 'combat',
    activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
    phaseFirstActorByRound: { '1:combat': { round: 1, phase: 'combat', chosenFirstActorSideKey: 'player1' } },
    supplyLossLedger: createOfficialSupplyLossLedgerV1({ round: 1, rulesRuntimeHash: base.officialMissionRuntimeDescriptor.runtimeHash }),
    officialFaqReactionPolicy: structuredClone(OFFICIAL_FAQ_REACTION_POLICY_V13) };
  const actor = state.pieces.find(piece => piece.id === 'actor');
  const target = state.pieces.find(piece => piece.id === 'z-immortal');
  const zealots = state.pieces.find(piece => piece.id === 'a-zealots');
  const right = 16 + (actor.models[0].baseWidthInches + target.models[0].baseWidthInches) / 2 + 0.5;
  const left = 16 - (actor.models[0].baseWidthInches + zealots.models[0].baseWidthInches) / 2 - 0.5;
  for (const piece of state.pieces) {
    piece.isOnField = true; piece.isInReserves = false; piece.statuses = ['Shielded'];
    piece.models.forEach((model, index) => Object.assign(model, { isOnField: true,
      xInches: piece.id === 'actor' ? 16 : piece.id === 'z-immortal' ? right : left - Math.floor(index / 2) * (model.baseWidthInches + 0.1),
      yInches: piece.id === 'a-zealots' ? 12 + index % 2 * (model.baseDepthInches + 0.1) : 12 }));
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
function selected(runtime, state, use) {
  const menu = runtime.enumerate(state);
  if (state.pendingOfficialReactionWindow) {
    const choose = use && state.activeSideKey === 'player2';
    const domain = menu.parameterDomains.find(row => choose
      ? row.actionType === 'resolve_reaction_family_ability' && row.sourceDomain.abilityName === 'Shield Overcharge'
      : row.actionType === 'pass_reaction_family_window');
    assert.ok(domain, 'expected current target reaction missing');
    return { domain, parameters: choose
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
function rawFight(action) {
  let value = action;
  while (value && !value.meleePlan) value = value.attackAction || value.sourceAction;
  assert.ok(value?.meleePlan);
  return value;
}
function fixedWalk(runtime, initial, id, use, noHits = false) {
  let state = structuredClone(initial);
  const domain = runtime.enumerate(state).parameterDomains.find(row => row.pieceId === 'actor' && row.weaponName === 'Stomp');
  let action = runtime.instantiate(state, domain, parametersFor(id)).action;
  const trace = [];
  for (let step = 0; step < 24; step++) {
    const rolls = [];
    if (action.chance) for (const kind of action.chance.revealOrder) {
      rolls.push(...Array(action.chance.layout[kind]).fill(kind === 'hit' && !noHits ? 6 : 1));
    }
    const result = runtime.apply(state, action, { chanceReveals: rolls });
    state = result.state;
    trace.push({ actionType: action.actionType, rolls, events: result.events });
    if (!state.pendingOfficialMeleePoolChoice) return { state, trace,
      events: state.log.flatMap(row => row.events || []).filter(row => row.type === 'close_combat_attack') };
    const choice = selected(runtime, state, use);
    action = choice.candidate ? Object.fromEntries(Object.entries(choice.candidate)
      .filter(([key]) => !['isEnabled', 'disabledReason', 'score', 'details'].includes(key)))
      : runtime.instantiate(state, choice.domain, choice.parameters).action;
  }
  assert.fail('fixed melee continuation exceeded its declared target stages');
}

await fs.mkdir(directory, { recursive: true });
if (process.argv.includes('--capture-red')) {
  const context = await sourceProduct();
  const scene = await sceneFor(context);
  assert.throws(() => runtimeFor(context, scene.state), /CHARACTERISTIC_NUMERIC_ARMOUR_REACTION_CONSUMERS_REQUIRED/);
  const ref = await save('red.json', { rejection: 'CHARACTERISTIC_NUMERIC_ARMOUR_REACTION_CONSUMERS_REQUIRED',
    requiredConsumer: 'per_target_melee_before_armour_reaction', candidatesBySide: scene.candidatesBySide,
    nativeActions: 0, modelCalls: 0 });
  console.log(JSON.stringify({ reproduced: true, evidenceRef: ref }));
} else {
  const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
    factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2',
    sourceRef: parent + 'immortal-stomp/read.json', contractVersion: 'T28-W3-07-melee-per-target-armour-reaction-v1',
  }, steps: [
    { name: 'read', openProduct: sourceProduct, check: async context => {
      const unit = context.dataset.recordsByKey['army_units:immortal'].payload;
      const source = unit.upgrades.filter(row => ['Stomp', 'Shield Overcharge'].includes(row.name));
      assert.equal(source.length, 2);
      const ref = await save('read.json', { source, scope: 'per_target_fight_before_armour', modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'compile', openProduct: sourceProduct, check: async context => {
      const scene = await sceneFor(context);
      const runtime = runtimeFor(context, scene.state);
      assert.equal(runtime.descriptor.runtimeVersion, '3.18.0');
      const comparisons = [];
      for (const id of ids) {
        const use = fixedWalk(runtime, scene.state, id, true);
        const decline = fixedWalk(runtime, scene.state, id, false);
        const used = use.events.find(row => row.targetId === 'z-immortal');
        const plain = decline.events.find(row => row.targetId === 'z-immortal');
        assert.equal(used.stages.convertedFailedArmourDieIndices.length, 2);
        assert.equal(plain.stages.totalDamage - used.stages.totalDamage, 2);
        assert.deepEqual(use.state.officialReactionHistory.map(row => row.abilityName), ['Shield Overcharge']);
        assert.ok(use.state.officialReactionResolutionHistory.every(row => row.consumedByHost));
        const zero = fixedWalk(runtime, scene.state, id, true, true);
        assert.equal(zero.state.officialReactionHistory?.length || 0, 0);
        const ref = await save(id + '/fixed-walk.json', { counterfactualOnly: true, nativeReceiptsCreated: false, use, decline, zero });
        comparisons.push({ id, evidenceRef: ref, toughConversions: 2, damageDifference: 2 });
        const product = registry();
        try {
          const descriptorRef = await save(id + '/runtime.json', runtime.descriptor);
          const m = context.manifest;
          product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset,
            snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef),
            datasetRef: m.source.datasetRef, snapshotRef: m.source.snapshotRef, sourceRevisionRef: m.source.sourceRevisionRef,
            referenceSources: m.source.references, sourcePolicy: m.source.policy,
            components: { ...m.components, rulesRuntime: { ref: descriptorRef, version: '3.18.0',
              integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
          const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'ability_component' });
          await save(id + '/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved, state: scene.state,
            scenario: { scale: 500, fullMatch: false, round: 1, phase: 'combat', placementAndPhaseDeclared: true,
              targetCount: id === 'single' ? 1 : 2, nativeBeforeArmourReaction: true } }));
        } finally { product.close(); }
      }
      const ref = await save('compile.json', { candidatesBySide: scene.candidatesBySide, audits: scene.audits, comparisons });
      return { evidenceRef: ref, checkpointRef: output + 'single/authority.json' };
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
            pieceId: 'actor', weaponName: 'Stomp', parameters: parametersFor(id) });
          const first = await native.commit({ roomId: roomId(id), credential: credentials.player1,
            operationKey: 'first-hit', select: row => row.actionType === 'fight' && row.pieceId === 'actor',
            parameters: () => parametersFor(id) });
          assert.deepEqual(first.preview.core.action, query.result.action);
          const current = await native.store.loadRoom(roomId(id)); await checkpoint(id, current);
          await save(id + '/source-action.json', rawFight(first.preview.core.action));
          const ref = await save(id + '/consume.json', { id, revision: current.stateRevision, queryEqualsNativePreview: true });
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
          for (let step = 0; step < 24; step++) {
            const current = await native.store.loadRoom(roomId(id)); await checkpoint(id, current);
            if (!current.envelope.state.pendingOfficialMeleePoolChoice) break;
            const choice = selected(runtime, current.envelope.state, true);
            await native.commit({ roomId: roomId(id), credential: credentials[current.envelope.state.activeSideKey],
              operationKey: 'continuation-' + current.stateRevision,
              ...(choice.candidate ? { kind: 'finite', select: row => row.action.sourceActionHash === choice.candidate.sourceActionHash }
                : { select: row => row.domainId === choice.domain.domainId, parameters: () => choice.parameters }) });
          }
          const current = await native.store.loadRoom(roomId(id)); await checkpoint(id, current);
          assert.equal(current.envelope.state.pendingOfficialMeleePoolChoice, undefined);
          assert.equal(current.envelope.state.pendingOfficialReactionWindow, undefined);
          const events = current.envelope.state.log.flatMap(row => row.events || []).filter(row => row.type === 'close_combat_attack');
          assert.equal(events.length, id === 'single' ? 1 : 2);
          const reactions = current.envelope.state.officialReactionHistory || [];
          assert.ok(reactions.every(row => row.abilityName === 'Shield Overcharge' && row.sourceInstanceId === 'z-immortal'));
          assert.ok((current.envelope.state.officialReactionResolutionHistory || []).every(row => row.consumedByHost));
          const legal = await native.room.legalSpace({ roomId: roomId(id), seatToken: credentials[current.envelope.state.activeSideKey].seatToken });
          assert.equal(legal.ok, true, JSON.stringify(legal));
          assert.ok(legal.legalSpace.finiteActions.length || legal.legalSpace.parameterDomains.length);
          await save(id + '/checkpoint.json', { envelope: current.envelope });
          const value = { id, revision: current.stateRevision, events, reactions, nextSide: current.envelope.state.activeSideKey,
            nextMenuAvailable: true };
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
          cases.push({ id, revision: before.stateRevision, receipts: receipts.length, checkpoints: checkpoints.length, replayExact: true });
        } finally { branch.close(); }
      }
      const ref = await save('cold-recovery.json', { cases }); return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ status: result.status, passed: Object.keys(result.passed), failures: result.failures }));
  if (result.status !== 'passed') process.exitCode = 1;
  if (result.status === 'passed' && process.argv.includes('--coverage-control')) {
    const coverage = await runProductBoundaryCheck({ directory: path.join(directory, 'coverage-control'), identity: {
      factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
      factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: output + 'single/authority.json',
      contractVersion: 'T28-W3-07-armour-reaction-explicit-hits-gap-v1',
    }, steps: [{ name: 'compile', openProduct, check: async product => {
      const branch = await product.branch('single');
      try {
        assert.throws(() => createOfficialCharacteristicStatusComponentRuntimeV2({ context: branch.context,
          spatialState: branch.authority.state, definitionIds: [], includeMelee: true,
          includeArmourReactions: true, includeHits: true }), /CHARACTERISTIC_HITS_ARMOUR_REACTION_CONSUMER_REQUIRED/);
        const ref = await save('coverage-control.json', { unmigratedAutomaticHitsConsumerRejected: true,
          meleeArmourRuntimeVersion: branch.runtime.descriptor.runtimeVersion, nativeActions: 0, modelCalls: 0 });
        return { evidenceRef: ref, checkpointRef: ref };
      } finally { branch.close(); }
    } }] });
    console.log(JSON.stringify({ coverageControl: coverage.status, failures: coverage.failures }));
    if (coverage.status !== 'passed') process.exitCode = 1;
  }
  if (result.status === 'passed' && process.argv.includes('--facts-control')) {
    const control = await runProductBoundaryCheck({ directory: path.join(directory, 'facts-control'), identity: {
      factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
      factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: output + 'single/source-action.json',
      contractVersion: 'T28-W3-07-melee-armour-source-query-facts-v1',
    }, steps: [{ name: 'consume', repairRef: 'scripts/verify-wave3-melee-armour-reaction-v1.mjs#actual-card-readiness', openProduct, check: async product => {
      const branch = await product.branch('single');
      try {
        const { runtime, native, context } = branch;
        const before = await native.store.loadRoom(roomId('single'));
        const scene = await sceneFor(context);
        const unshielded = structuredClone(scene.state);
        unshielded.pieces.find(row => row.id === 'z-immortal').statuses = [];
        const noShield = fixedWalk(runtime, unshielded, 'single', true);
        assert.equal(noShield.state.officialReactionHistory?.length || 0, 0);
        const depleted = structuredClone(scene.state);
        depleted.cardResources.player2.forEach(card => { card.readiness = 'exhausted'; });
        const noEnergy = fixedWalk(runtime, depleted, 'single', true);
        assert.equal(noEnergy.state.officialReactionHistory?.length || 0, 0);
        const files = (await fs.readdir(path.join(directory, 'single'))).filter(name => /^checkpoint-r\d+\.json$/u.test(name));
        let saved;
        for (const file of files) {
          const state = (await read(output + 'single/' + file)).envelope.state;
          if (state.pendingOfficialMeleePoolChoice?.stage === 'armour'
            && state.pendingOfficialMeleePoolChoice.current.armourReactionTriggerHash) { saved = state; break; }
        }
        assert.ok(saved, 'actual Native reaction must have a saved defence continuation');
        const parent = saved.pendingOfficialMeleePoolChoice;
        const sourceState = structuredClone(saved);
        delete sourceState.pendingOfficialMeleePoolChoice;
        sourceState.activeSideKey = parent.sideKey;
        const sourceBefore = JSON.stringify(sourceState);
        const event = (await read(output + 'single/successor.json')).events.find(row => row.targetId === 'z-immortal');
        const stages = event.stages;
        const demand = runtime.melee.inspectArmourDemand(sourceState, parent.attackAction, {
          targetUnitId: 'z-immortal', hitRolls: parent.current.hitRolls, surgeRolls: parent.current.surgeRolls,
          convertedFailedHitDieIndices: parent.current.convertedFailedHitDieIndices });
        assert.equal(demand.armourDice, stages.armourDice);
        const reveals = [...stages.hitRolls, ...stages.surgeRolls, ...stages.armourRolls,
          ...stages.unusedPreallocatedArmourRolls, ...stages.evadeRolls];
        const options = { chanceReveals: reveals,
          precisionConvertedFailedDieIndicesByTarget: { 'z-immortal': stages.convertedFailedHitDieIndices },
          toughConvertedFailedDieIndicesByTarget: { 'z-immortal': stages.convertedFailedArmourDieIndices },
          beforeArmourReactionTriggerHashesByTarget: { 'z-immortal': parent.current.armourReactionTriggerHash } };
        const query = runtime.melee.resolveChance(sourceState, parent.attackAction, options);
        assert.deepEqual(query.rows[0].resolution, stages);
        const wrong = { ...options, beforeArmourReactionTriggerHashesByTarget: { 'z-immortal': '0'.repeat(64) } };
        assert.throws(() => runtime.melee.resolveChance(sourceState, parent.attackAction, wrong), /ARMOUR_REACTION_BINDING_INVALID/);
        assert.equal(JSON.stringify(sourceState), sourceBefore);
        assert.deepEqual(await native.store.loadRoom(roomId('single')), before);
        const ref = await save('facts-control.json', { demand, exactSameNativeRollsAndResolution: true,
          wrongReactionHashRejected: true, unshieldedSkipped: true, depletedPaymentSkipped: true,
          sourceStateAndRoomUnchanged: true, nativeActions: 0, modelCalls: 0 });
        return { evidenceRef: ref, checkpointRef: ref };
      } finally { branch.close(); }
    } }] });
    console.log(JSON.stringify({ factsControl: control.status, failures: control.failures }));
    if (control.status !== 'passed') process.exitCode = 1;
  }
  if (result.status === 'passed' && process.argv.includes('--legacy-control')) {
    const legacy = await runProductBoundaryCheck({ directory: path.join(directory, 'legacy-control'), identity: {
      factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
      factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: parent + 'immortal-stomp/cold-recovery.json',
      contractVersion: 'T28-W3-07-melee-armour-legacy-pools-v1',
    }, steps: [{ name: 'coldRecovery', repairRef: 'scripts/verify-wave3-melee-armour-reaction-v1.mjs#actual-legacy-checkpoint-names', openProduct: sourceProduct, check: async () => {
      const cases = [];
      const specs = [
        ...['single', 'split'].map(id => ({ folder: 'immortal-stomp', id,
          releaseId: 'wave3-u83-c84-r50-immortal-stomp-' + id + '-v1', roomId: 'wave2-immortal-stomp-' + id,
          options: { definitionIds: [], includeMelee: true } })),
        ...['single', 'multiple'].map(id => ({ folder: 'heavy-plating-hits', id,
          releaseId: 'wave3-u83-c84-r50-heavy-plating-hits-' + id + '-v1', roomId: 'wave2-heavy-plating-hits-' + id,
          options: { definitionIds: ['unit:siege_tank/heavy-plating-any-phase@1', 'unit:zeratul/shadow-strike-combat-phase@1'],
            includeMelee: true, includeHits: true } })),
        { folder: 'immortal-impact', id: '', releaseId: 'wave3-u83-c84-r50-immortal-impact-v1', roomId: 'wave2-immortal-impact',
          options: { definitionIds: [], includeMelee: true } },
        { folder: 'template-target-reaction', id: 'spillover-first',
          releaseId: 'wave3-u83-c84-r50-template-target-reaction-spillover-first-v1', roomId: 'wave3-template-target-reaction-spillover-first',
          options: { definitionIds: (await read(parent + 'tank-spatial/selection.json')).definitionIds,
            includeRanged: true, includeTemplateAttacks: true, includeTemplateBatchOrder: true,
            includeTargetReactions: true, includePrecisionChoices: true, includeArmourChoices: true, includeArmourReactions: true } },
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
            const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
              .map(row => row.payload.payload.receipt);
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
}
