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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const parent = 'build/ticket-28-wave2-capabilities-20261113-v1/';
const output = parent + 'hits-armour-reaction/';
const directory = path.join(root, output);
const definitionIds = ['unit:zeratul/shadow-strike-combat-phase@1'];
const specs = [
  { id: 'first', targets: ['target', 'zealots'], use: true },
  { id: 'last', targets: ['zealots', 'target'], use: true },
  { id: 'pass', targets: ['target'], use: false },
];
const roomId = id => 'wave3-hits-armour-reaction-' + id;
const releaseId = id => 'wave3-u83-c84-r50-hits-armour-reaction-' + id + '-v1';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
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
  const product = registry(path.join(root, parent, 'melee-target-reaction'));
  try { return await product.resolver.resolve({ releaseId: 'wave3-u83-c84-r50-melee-target-reaction-first-v1',
    purpose: 'ability_component' }); } finally { product.close(); }
}
const runtimeFor = (context, state) => createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
  definitionIds, includeMelee: true, includeHits: true, includeArmourReactions: true });
async function sceneFor(context, spec) {
  const base = (await read(parent + 'melee-armour-reaction/single/authority.json')).state;
  const candidatesBySide = {
    player1: { sideKey: 'player1', scaleId: 'Skirmish', mineralBudget: 500, factionRecordKey: 'tactical_cards:nerazim',
      tacticalCardRecordKeys: [], units: [{ unitInstanceId: 'actor', recordKey: 'army_units:zeratul', compositionKind: 'small', upgrades: [] }] },
    player2: { sideKey: 'player2', scaleId: 'Skirmish', mineralBudget: 500, factionRecordKey: 'tactical_cards:khalai',
      tacticalCardRecordKeys: [], units: [
        { unitInstanceId: 'target', recordKey: 'army_units:immortal', compositionKind: 'small', upgrades: [{ upgradeName: 'Shield Overcharge' }] },
        { unitInstanceId: 'zealots', recordKey: 'army_units:zealot', compositionKind: 'small', upgrades: [] },
      ] },
  };
  const setup = createOfficialReleaseRosterStateV2({ context, candidatesBySide,
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state.officialRosterDisclosureDataBundle,
    includeMelee: true, characteristicDefinitionIds: definitionIds, canonicalResourceTypes: true,
    reactionDefinitionIds: ['unit:immortal/shield-overcharge-any-phase@1'] });
  const fields = ['round', 'phase', 'activeSideKey', 'firstPlayerSideKey', 'engagementScale', 'armyBuildingEngagementScale',
    'board', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle', 'officialMissionRuntimeDescriptor',
    'supplyLossLedger', 'phaseFirstActorByRound'];
  const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(base[key])])), ...setup.state, log: [],
    officialFaqReactionPolicy: structuredClone(OFFICIAL_FAQ_REACTION_POLICY_V13) };
  const actor = state.pieces.find(piece => piece.id === 'actor');
  for (const piece of state.pieces) {
    piece.isOnField = true; piece.isInReserves = false; piece.statuses = ['Shielded'];
    const radiusSum = (actor.models[0].baseWidthInches + piece.models[0].baseWidthInches) / 2;
    piece.models.forEach((model, index) => Object.assign(model, { isOnField: true,
      xInches: piece.id === 'actor' ? 12 : piece.id === 'target' ? 12 + radiusSum + 0.5
        : spec.targets.length > 1 ? 12 - radiusSum - 0.5 - index % 3 * (model.baseWidthInches + 0.1)
          : 28 + index % 3 * (model.baseWidthInches + 0.1),
      yInches: piece.id !== 'zealots' ? 12 : spec.targets.length > 1
        ? 12 + Math.floor(index / 3) * (model.baseDepthInches + 0.1) : 25 + Math.floor(index / 3) * (model.baseDepthInches + 0.1) }));
  }
  return { state, candidatesBySide, audits: setup.state.armyCompositionUpgradeAuditsBySide };
}
function declarationParameters(domain, spec) {
  return { activeUnitId: 'actor', paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.enum[0],
    ...(spec.targets.length > 1 ? { targetOrder: spec.targets } : {}) };
}
function selected(runtime, state, spec) {
  const menu = runtime.enumerate(state);
  if (state.pendingOfficialReactionWindow) {
    const use = spec.use && state.activeSideKey === 'player2';
    const domain = menu.parameterDomains.find(row => row.actionType === (use ? 'resolve_reaction_family_ability' : 'pass_reaction_family_window'));
    assert.ok(domain);
    return { domain, parameters: use ? { paymentCardInstanceIds: domain.sourceDomain.parameterSchema.paymentCardInstanceIds.const } : {} };
  }
  if (menu.parameterDomains.length) {
    const domain = menu.parameterDomains[0];
    const field = domain.sourceDomain.parameterSchema.required[0];
    const value = domain.sourceDomain.parameterSchema[field];
    return { domain, parameters: { [field]: value.items ? value.items.enum.slice(0, value.maxItems) : value.enum[0] } };
  }
  assert.equal(menu.candidates.length, 1);
  return { candidate: menu.candidates[0] };
}
function fixedWalk(runtime, initial, spec) {
  let state = structuredClone(initial);
  const domain = runtime.enumerate(state).parameterDomains.find(row => row.abilityName === 'Shadow Strike');
  let action = runtime.instantiate(state, domain, declarationParameters(domain, spec)).action;
  const trace = [];
  for (let step = 0; step < 40; step++) {
    const rolls = Array(action.chance?.count || 0).fill(1);
    const applied = runtime.apply(state, action, { chanceReveals: rolls });
    state = applied.state;
    trace.push({ actionType: action.actionType, sideKey: action.sideKey, chance: action.chance || null, events: applied.events });
    const done = state.log.flatMap(row => row.events || []).some(row => row.type === 'automatic_hits_complete');
    if (done) return { state, trace, damage: state.log.flatMap(row => row.events || []).filter(row => row.type === 'automatic_hits_damage') };
    const choice = selected(runtime, state, spec);
    action = choice.candidate ? Object.fromEntries(Object.entries(choice.candidate)
      .filter(([key]) => !['isEnabled', 'disabledReason', 'score', 'details'].includes(key)))
      : runtime.instantiate(state, choice.domain, choice.parameters).action;
  }
  assert.fail('HITS continuation exceeded its stages');
}
async function openProduct() {
  const product = registry();
  return { ...product, async branch(spec) {
    const context = await product.resolver.resolve({ releaseId: releaseId(spec.id), purpose: 'ability_component' });
    const authority = await read(output + spec.id + '/authority.json');
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(output + spec.id + '/runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory: path.join(directory, spec.id), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { context, authority, runtime, native, close: () => native.close() };
  } };
}
async function checkpoint(native, spec) {
  const current = await native.store.loadRoom(roomId(spec.id));
  await save(spec.id + '/checkpoint-r' + current.stateRevision + '.json', { envelope: current.envelope });
  return current;
}

await fs.mkdir(directory, { recursive: true });
if (process.argv.includes('--capture-gap')) {
  assert.equal(await saved('source-gap.json'), null, 'preserve original source gap');
  const context = await sourceProduct();
  const scene = await sceneFor(context, specs[0]);
  let error;
  try { runtimeFor(context, scene.state); } catch (failure) { error = failure.message; }
  assert.equal(error, 'CHARACTERISTIC_HITS_ARMOUR_REACTION_CONSUMER_REQUIRED');
  await save('source-gap.json', { error, actualFactoryInvoked: true, source: 'current component constructor',
    candidatesBySide: scene.candidatesBySide, modelCalls: 0 });
  console.log(JSON.stringify({ captured: error }));
} else {
  const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
    factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: output + 'source-gap.json',
    contractVersion: 'T28-W3-07-native-hits-before-armour-reaction-v1',
  }, steps: [
    { name: 'read', openProduct: sourceProduct, check: async context => {
      const source = context.dataset.recordsByKey['army_units:zeratul'].payload.upgrades.find(row => row.name === 'Shadow Strike');
      assert.equal(source.description, 'All Enemy Units Engaged with this Unit suffer HITS 4 (1).');
      assert.equal((await read(output + 'source-gap.json')).actualFactoryInvoked, true);
      const ref = await save('read.json', { source, shield: context.dataset.recordsByKey['army_units:immortal'].payload.upgrades
        .find(row => row.name === 'Shield Overcharge'), modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'compile', openProduct: sourceProduct, check: async context => {
      const cases = [];
      for (const spec of specs) {
        const scene = await sceneFor(context, spec);
        const runtime = runtimeFor(context, scene.state);
        assert.equal(runtime.descriptor.runtimeVersion, '3.20.0');
        const fixed = fixedWalk(runtime, scene.state, spec);
        assert.deepEqual(fixed.damage.map(row => row.targetId), spec.targets);
        const target = fixed.damage.find(row => row.targetId === 'target');
        assert.equal(target.stages.totalDamage, spec.use ? 2 : 4);
        assert.equal(target.stages.convertedFailedArmourDieIndices.length, spec.use ? 2 : 0);
        assert.ok(fixed.trace.every(row => !row.chance || Object.keys(row.chance.layout).join(',') === 'armour'));
        await save(spec.id + '/fixed-walk.json', { counterfactualOnly: true, nativeReceiptsCreated: false, ...fixed });
        const product = registry();
        try {
          const descriptorRef = await save(spec.id + '/runtime.json', runtime.descriptor);
          const m = context.manifest;
          product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(spec.id), dataset: context.dataset,
            snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef,
            snapshotRef: m.source.snapshotRef, sourceRevisionRef: m.source.sourceRevisionRef,
            referenceSources: m.source.references, sourcePolicy: m.source.policy,
            components: { ...m.components, rulesRuntime: { ref: descriptorRef, version: '3.20.0',
              integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
          const resolved = await product.resolver.resolve({ releaseId: releaseId(spec.id), purpose: 'ability_component' });
          await save(spec.id + '/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved, state: scene.state,
            scenario: { scale: 500, round: 1, phase: 'combat', placementAndPhaseDeclared: true, fullMatch: false, targets: spec.targets } }));
        } finally { product.close(); }
        cases.push({ spec, candidatesBySide: scene.candidatesBySide, audits: scene.audits });
      }
      const ref = await save('compile.json', { cases, fixedTargetDamage: { use: 2, pass: 4 }, onlyArmourChance: true });
      return { evidenceRef: ref, checkpointRef: output + 'first/authority.json' };
    } },
    { name: 'consume', openProduct, check: async product => {
      const cases = [];
      for (const spec of specs) {
        const prior = await saved(spec.id + '/consume.json'); if (prior) { cases.push(prior); continue; }
        const branch = await product.branch(spec);
        try {
          const { native, runtime, authority } = branch;
          const credentials = await native.create(roomId(spec.id), authority);
          const initial = await native.store.loadRoom(roomId(spec.id));
          const domain = runtime.enumerate(initial.envelope.state).parameterDomains.find(row => row.abilityName === 'Shadow Strike');
          const query = runtime.query(initial.envelope.state, { queryKind: 'characteristic_status_projection', pieceId: 'actor' });
          assert.deepEqual(await native.store.loadRoom(roomId(spec.id)), initial);
          const declared = await native.commit({ roomId: roomId(spec.id), credential: credentials.player1, operationKey: 'declare-shadow-strike',
            select: row => row.domainId === domain.domainId, parameters: row => declarationParameters(row, spec) });
          assert.equal(declared.preview.core.chanceTicket, null);
          const current = await checkpoint(native, spec);
          assert.equal(current.envelope.state.pendingOfficialAutomaticHits.automaticHits.hits, 4);
          const next = runtime.enumerate(current.envelope.state).candidates;
          assert.equal(next.length, 1);
          assert.equal(next[0].actionType, 'prepare_automatic_hits_armour_pool');
          assert.equal(next[0].chance, undefined);
          const ref = await save(spec.id + '/consume.json', { id: spec.id, revision: current.stateRevision,
            queryReadOnly: true, queryReceipt: query, nextPreparationHasNoChance: true });
          cases.push({ id: spec.id, evidenceRef: ref });
        } finally { branch.close(); }
      }
      const ref = await save('consume.json', { cases }); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'successor', openProduct, check: async product => {
      const cases = [];
      for (const spec of specs) {
        const prior = await saved(spec.id + '/successor.json'); if (prior) { cases.push(prior); continue; }
        const branch = await product.branch(spec);
        try {
          const { native, runtime, authority } = branch;
          const credentials = await native.create(roomId(spec.id), authority);
          const steps = [];
          for (let count = 0; count < 40; count++) {
            const current = await checkpoint(native, spec);
            const state = current.envelope.state;
            if (!state.pendingOfficialAutomaticHits && !state.pendingOfficialHitsPoolChoice) break;
            const choice = selected(runtime, state, spec);
            const applied = await native.commit({ roomId: roomId(spec.id), credential: credentials[state.activeSideKey],
              operationKey: 'continuation-' + current.stateRevision,
              ...(choice.candidate ? { kind: 'finite', select: row => row.action.sourceActionHash === choice.candidate.sourceActionHash }
                : { select: row => row.domainId === choice.domain.domainId, parameters: () => choice.parameters }) });
            const chance = applied.preview.core.action.chance;
            assert.ok(!chance || Object.keys(chance.layout).join(',') === 'armour');
            steps.push({ revision: current.stateRevision, actionType: applied.preview.core.action.actionType,
              activeSideKey: state.activeSideKey, chance: chance || null });
          }
          const current = await checkpoint(native, spec);
          const state = current.envelope.state;
          assert.equal(state.pendingOfficialAutomaticHits, undefined);
          assert.equal(state.pendingOfficialHitsPoolChoice, undefined);
          assert.equal(state.pendingOfficialReactionWindow, undefined);
          assert.equal(state.activeSideKey, 'player1');
          assert.equal(state.selectedRosterActivationWindow.pieceId, 'actor');
          const events = state.log.flatMap(row => row.events || []);
          const damage = events.filter(row => row.type === 'automatic_hits_damage');
          assert.deepEqual(damage.map(row => row.targetId), spec.targets);
          const history = state.officialReactionHistory || [];
          assert.equal(history.length, spec.use ? 1 : 0);
          assert.ok((state.officialReactionResolutionHistory || []).every(row => row.consumedByHost));
          assert.equal(events.filter(row => row.type === 'ability_resource_paid').length, 1);
          const menu = await native.room.legalSpace({ roomId: roomId(spec.id), seatToken: credentials.player1.seatToken });
          assert.equal(menu.ok, true, JSON.stringify(menu));
          assert.ok(menu.legalSpace.finiteActions.length || menu.legalSpace.parameterDomains.length);
          const value = { id: spec.id, revision: current.stateRevision, steps, damage, reactions: history,
            originalActivationPreserved: true, nextMenuAvailable: true };
          await save(spec.id + '/successor.json', value); cases.push(value);
        } finally { branch.close(); }
      }
      const ref = await save('successor.json', { cases }); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'coldRecovery', openProduct, check: async product => {
      const cases = [];
      for (const spec of specs) {
        const branch = await product.branch(spec);
        try {
          const { native, authority } = branch; await native.restoreDependencies(roomId(spec.id), authority);
          const before = await native.store.loadRoom(roomId(spec.id));
          const bundle = await native.store.loadReplayBundle(roomId(spec.id));
          const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
          const checkpoints = (await fs.readdir(path.join(directory, spec.id))).filter(name => /^checkpoint-r\d+\.json$/u.test(name));
          for (const name of checkpoints) {
            const expected = (await read(output + spec.id + '/' + name)).envelope;
            const replay = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, expected.stateRevision) });
            assert.equal(replay.ok, true, JSON.stringify(replay)); assert.deepEqual(replay.envelope, expected);
          }
          assert.deepEqual(await native.store.loadRoom(roomId(spec.id)), before);
          cases.push({ id: spec.id, receipts: receipts.length, checkpoints: checkpoints.length, replayExact: true });
        } finally { branch.close(); }
      }
      const ref = await save('cold-recovery.json', { cases }); return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ status: result.status, passed: Object.keys(result.passed), failures: result.failures }));
  if (result.status !== 'passed') process.exitCode = 1;
  if (result.status === 'passed' && process.argv.includes('--facts-control')) {
    const facts = await runProductBoundaryCheck({ directory: path.join(directory, 'facts-control'), identity: {
      factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
      factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: output + 'cold-recovery.json',
      contractVersion: 'T28-W3-07-hits-reaction-same-roll-and-facts-v1',
    }, steps: [{ name: 'consume', openProduct, check: async product => {
      const spec = specs.find(row => row.id === 'last');
      const branch = await product.branch(spec);
      try {
        const before = await branch.native.store.loadRoom(roomId(spec.id));
        const files = (await fs.readdir(path.join(directory, spec.id))).filter(name => /^checkpoint-r\d+\.json$/u.test(name));
        const snapshots = await Promise.all(files.map(async file => (await read(output + spec.id + '/' + file)).envelope.state));
        const finalPool = snapshots.find(state => state.pendingOfficialHitsPoolChoice?.stage === 'evade'
          && state.pendingOfficialHitsPoolChoice.targetIndex === spec.targets.length - 1);
        assert.ok(finalPool);
        const parent = finalPool.pendingOfficialHitsPoolChoice;
        const completed = [...parent.completed, { ...parent.current,
          targetUnitId: parent.targets[parent.targetIndex].targetUnitId, evadeRolls: [] }];
        const source = structuredClone(finalPool);
        delete source.pendingOfficialHitsPoolChoice;
        source.activeSideKey = parent.sideKey;
        const triggers = Object.fromEntries(completed.filter(row => row.armourReactionTriggerHash)
          .map(row => [row.targetUnitId, row.armourReactionTriggerHash]));
        const resolved = branch.runtime.hits.apply(source, parent.attackAction, {
          chanceReveals: completed.flatMap(row => row.armourRolls),
          toughConvertedFailedDieIndicesByTarget: Object.fromEntries(completed.map(row =>
            [row.targetUnitId, row.convertedFailedArmourDieIndices])), beforeArmourReactionTriggerHashesByTarget: triggers });
        const expected = (await read(output + spec.id + '/successor.json')).damage;
        assert.deepEqual(resolved.events.filter(row => row.type === 'automatic_hits_damage'), expected);
        assert.throws(() => branch.runtime.hits.inspectArmour(source, parent.attackAction, {
          targetUnitId: 'target', hitRolls: [], surgeRolls: [], armourRolls: parent.current.armourRolls,
          convertedFailedHitDieIndices: [], beforeArmourReactionTriggerHash: '0'.repeat(64) }), /ARMOUR_REACTION_BINDING_INVALID/);
        const missing = structuredClone(finalPool);
        delete missing.pendingOfficialAutomaticHits;
        assert.throws(() => branch.runtime.enumerate(missing), /MELEE_POOL_PARENT_INVALID/);
        const reacting = snapshots.find(state => state.pendingOfficialHitsPoolChoice?.stage === 'reaction');
        assert.ok(reacting);
        const domain = branch.runtime.enumerate(reacting).parameterDomains[0];
        const extra = { paymentCardInstanceIds: [], triggerHash: '0'.repeat(64) };
        assert.throws(() => branch.runtime.instantiate(reacting, domain, extra), /MELEE_REACTION_SEMANTIC_PARAMETERS_REQUIRED/);
        const selectedChoice = selected(branch.runtime, reacting, spec);
        const actual = branch.runtime.instantiate(reacting, selectedChoice.domain, selectedChoice.parameters).action;
        assert.throws(() => branch.runtime.apply(reacting, { ...actual, sourceRuntimeKind: 'reaction' }), /REACTION_WINDOW_REQUIRED/);
        const query = branch.runtime.query(reacting, { queryKind: 'reaction_window' });
        assert.ok(query);
        for (const condition of ['unshielded', 'exhausted']) {
          const scene = structuredClone(branch.authority.state);
          if (condition === 'unshielded') scene.pieces.find(piece => piece.id === 'target').statuses = [];
          else scene.cardResources.player2.forEach(card => { card.readiness = 'exhausted'; });
          const fixed = fixedWalk(runtimeFor(branch.context, scene), scene, spec);
          assert.equal(fixed.state.officialReactionHistory?.length || 0, 0);
          assert.equal(fixed.damage.find(row => row.targetId === 'target').stages.totalDamage, 4);
        }
        assert.deepEqual(await branch.native.store.loadRoom(roomId(spec.id)), before);
        const ref = await save('facts-control.json', { sameNativeRollDamageExact: true,
          wrongTriggerRejected: true, missingSourceOwnerRejected: true, callerTriggerRejected: true,
          wrongReactionOwnerRejected: true, unshieldedAndExhaustedNoReaction: true,
          queryRoomUnchanged: true, queryReceipt: query, nativeActions: 0, modelCalls: 0 });
        return { evidenceRef: ref, checkpointRef: ref };
      } finally { branch.close(); }
    } }] });
    console.log(JSON.stringify({ factsControl: facts.status, failures: facts.failures }));
    if (facts.status !== 'passed') process.exitCode = 1;
  }
  if (result.status === 'passed' && process.argv.includes('--legacy-control')) {
    const legacy = await runProductBoundaryCheck({ directory: path.join(directory, 'legacy-control'), identity: {
      factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
      factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: parent + 'melee-target-reaction/legacy-control.json',
      contractVersion: 'T28-W3-07-hits-reaction-legacy-native-control-v1',
    }, steps: [{ name: 'coldRecovery', openProduct: sourceProduct, check: async () => {
      const cases = [];
      const all = [
        ...['single', 'multiple'].map(id => ({ folder: 'heavy-plating-hits', id,
          releaseId: 'wave3-u83-c84-r50-heavy-plating-hits-' + id + '-v1', roomId: 'wave2-heavy-plating-hits-' + id,
          options: { definitionIds: ['unit:siege_tank/heavy-plating-any-phase@1', 'unit:zeratul/shadow-strike-combat-phase@1'],
            includeMelee: true, includeHits: true } })),
        ...['single', 'split'].map(id => ({ folder: 'melee-armour-reaction', id,
          releaseId: 'wave3-u83-c84-r50-melee-armour-reaction-' + id + '-v1', roomId: 'wave3-melee-armour-reaction-' + id,
          options: { definitionIds: [], includeMelee: true, includeArmourReactions: true } })),
        ...['use', 'pass'].map(id => ({ folder: 'impact-armour-reaction', id,
          releaseId: 'wave3-u83-c84-r50-impact-armour-reaction-' + id + '-v1', roomId: 'wave3-impact-armour-reaction-' + id,
          options: { definitionIds: [], includeMelee: true, includeArmourReactions: true } })),
        ...['first', 'second', 'shield'].map(id => ({ folder: 'melee-target-reaction', id,
          releaseId: 'wave3-u83-c84-r50-melee-target-reaction-' + id + '-v1', roomId: 'wave3-melee-target-reaction-' + id,
          options: { definitionIds: [], includeMelee: true, includeArmourReactions: true, includeTargetReactions: true } })),
        { folder: 'template-target-reaction', id: 'spillover-first',
          releaseId: 'wave3-u83-c84-r50-template-target-reaction-spillover-first-v1', roomId: 'wave3-template-target-reaction-spillover-first',
          options: { definitionIds: (await read(parent + 'tank-spatial/selection.json')).definitionIds,
            includeRanged: true, includeTemplateAttacks: true, includeTemplateBatchOrder: true,
            includeTargetReactions: true, includePrecisionChoices: true, includeArmourChoices: true, includeArmourReactions: true } },
        { folder: 'immortal-reaction-composition', id: 'shield',
          releaseId: 'wave3-u83-c84-r50-immortal-reaction-composition-shield-v1', roomId: 'wave2-immortal-reaction-composition-shield',
          options: { definitionIds: ['unit:immortal/for-the-ancients-assault-phase@1'], includeRanged: true,
            includeTargetReactions: true, includePrecisionChoices: true, includeArmourChoices: true, includeArmourReactions: true } },
      ];
      for (const spec of all) {
        const cache = 'legacy/' + spec.folder + '-' + spec.id + '.json';
        const prior = await saved(cache);
        if (prior) { cases.push(prior); continue; }
        const prefix = parent + spec.folder + '/' + spec.id + '/';
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
            const value = { roomId: spec.roomId, receipts: receipts.length, checkpoints: checkpoints.length,
              runtimeVersion: runtime.descriptor.runtimeVersion, descriptorExact: true, replayExact: true, currentUnchanged: true };
            await save(cache, value); cases.push(value);
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
