import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 } from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialBattlefieldAssetFamilyAdapterV1, createOfficialBattlefieldAssetFamilyDefinitionBindingsV1 }
  from '../packages/product-composition/official-battlefield-asset-family-adapter-v1.mjs';
import { createOfficialSupplyLossLedgerV1 } from '../packages/rule-atoms/official-supply-loss-ledger-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const parent = 'build/ticket-28-wave2-capabilities-20261113-v1/';
const directory = path.join(root, parent, 'armour-threshold');
const modifierIds = ['unit:marauder/veteran-of-tarsonis-any-phase@1'];
const specs = [
  { id: 'melee-near', kind: 'melee', gap: 2.95, expectedThreshold: 3 },
  { id: 'melee-outside', kind: 'melee', gap: 3.05, expectedThreshold: 4 },
  { id: 'hits-near', kind: 'hits', gap: 2.95, expectedThreshold: 3 },
  { id: 'ranged-near', kind: 'ranged', gap: 2.95, expectedThreshold: 3 },
];
const roomId = id => 'wave3-armour-threshold-' + id;
const releaseId = id => 'wave3-u83-c84-r50-armour-threshold-' + id + '-v1';
const read = async name => JSON.parse(await fs.readFile(path.join(root, name), 'utf8'));
const ref = name => path.relative(root, path.join(directory, name));
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n');
  return ref(name);
}
async function saved(name) {
  try { return await read(ref(name)); } catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
async function sourceProduct() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(root, parent, 'point-defense/releases.sqlite') });
  try { return await createOfficialReleaseResolverV2({ store, loadArtifact: read }).resolve({
    releaseId: 'wave3-u83-c84-r50-point-defense-blast-v1', purpose: 'ability_component' });
  } finally { store.close(); }
}
function registry() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'releases.sqlite') });
  return { store, resolver: createOfficialReleaseResolverV2({ store, loadArtifact: read }), close: () => store.close() };
}
function runtimeFor(context, state, spec) {
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
    definitionIds: spec.kind === 'hits' ? ['unit:zeratul/shadow-strike-combat-phase@1'] : [],
    includeMelee: spec.kind === 'melee', includeHits: spec.kind === 'hits', includeRanged: spec.kind === 'ranged' });
}
async function openProduct() {
  const product = registry();
  return { ...product, async branch(spec) {
    const context = await product.resolver.resolve({ releaseId: releaseId(spec.id), purpose: 'ability_component' });
    const authority = await read(ref(spec.id + '/authority.json'));
    const runtime = runtimeFor(context, authority.state, spec);
    assert.equal(runtime.descriptor.runtimeHash, context.resources.rulesRuntime.runtimeHash);
    const native = openWave3EngineeringRoomV1({ directory: path.join(directory, spec.id), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { context, authority, runtime, native, close: () => native.close() };
  } };
}
function fightParameters(domain) {
  return { closeRanksMode: 'decline', allocations: [{ targetUnitId: 'target', dice: domain.constraints.declineCloseRanksAttackDice }] };
}
function rawFight(runtime, state) {
  const domain = runtime.enumerate(state).parameterDomains.find(row => row.actionType === 'fight' && row.pieceId === 'actor');
  assert.ok(domain);
  const action = runtime.instantiate(state, domain, fightParameters(domain)).action.sourceAction.attackAction;
  assert.deepEqual(action, JSON.parse(JSON.stringify(action)), 'Native action must retain its complete facts across JSON');
  return action;
}
function fixedFightRolls(context) {
  return context.poolPlan.targets.flatMap(row => [...Array(row.layout.hit).fill(6), ...Array(row.layout.surge || 0).fill(1),
    ...Array(row.layout.armour).fill(3), ...Array(row.layout.evade).fill(1)]);
}
function paidHitsState(runtime, state) {
  const domain = runtime.enumerate(state).parameterDomains.find(row => row.abilityName === 'Shadow Strike');
  assert.ok(domain, JSON.stringify(runtime.adapter.legalSpace(state, { includeDisabled: true })));
  assert.equal(domain.constraints.resourceCostsByChoice.default.resourceCostReduction, 0);
  const action = runtime.instantiate(state, domain, { activeUnitId: 'actor',
    paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.enum[0] }).action;
  return runtime.apply(state, action, {}).state;
}
async function drain(branch, spec, credentials) {
  for (let step = 0; step < 16; step++) {
    const current = await branch.native.store.loadRoom(roomId(spec.id));
    const state = current.envelope.state;
    if (!state.pendingOfficialMeleePoolChoice && !state.pendingOfficialHitsPoolChoice && !state.pendingOfficialAutomaticHits
      && !state.pendingAction && !state.pendingCurrentProductRangedCasualtyChoice) return current;
    const menu = branch.runtime.enumerate(state);
    const common = { roomId: roomId(spec.id), credential: credentials[state.activeSideKey], operationKey: 'defence-' + current.stateRevision };
    const choice = menu.parameterDomains[0];
    if (choice) {
      const field = choice.parameterSchema.required[0];
      assert.equal(field, 'casualtySelectionHash');
      await save(spec.id + '/casualty-checkpoint.json', { envelope: current.envelope });
      const commit = await branch.native.commit({ ...common, select: row => row.domainId === choice.domainId,
        parameters: row => ({ casualtySelectionHash: row.parameterSchema.casualtySelectionHash.enum[0] }) });
      assert.equal(commit.preview.core.chanceTicket, null);
    } else {
      assert.equal(menu.candidates.length, 1);
      await branch.native.commit({ ...common, kind: 'finite', select: () => true });
    }
  }
  assert.fail('finite defence did not settle');
}

await fs.mkdir(directory, { recursive: true });
let result;
try {
result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
  factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
  factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: 'build/ticket-28-wave3-release-context-20261112-v1/native-authority.json',
  contractVersion: 'T28-W3-07-source-armour-modifier-preparation-and-consumption-v1',
}, afterSaved(name) {
  if (name === 'compile' && process.argv.includes('--stop-after-compile')) {
    throw Object.assign(Error('SAVED_COMPILE_BOUNDARY'), { savedBoundary: true });
  }
}, steps: [
  { name: 'read', openProduct: sourceProduct, check: async context => {
    const source = context.dataset.recordsByKey['army_units:marauder'].payload.upgrades.find(row => row.name === 'Veteran of Tarsonis');
    assert.equal(source.costS, 20); assert.equal(source.costL, 40);
    assert.equal(source.description, 'While this Unit is Within 3" of a Mission Marker, its Armour characteristic is increased by 1.');
    const official = await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json');
    const marker = official.state.board.missionMarkers.find(row => row.number === 4);
    assert.equal(marker.diameterMillimeters, 32); assert.equal(marker.elevation, 'ground_level');
    const evidenceRef = await save('read.json', { source, marker, localMarkerSubsetDeclared: true });
    return { evidenceRef, checkpointRef: evidenceRef };
  } },
  { name: 'compile', repairRef: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs#canonical-measurement-import', openProduct: sourceProduct, check: async context => {
    const base = (await read(parent + 'heavy-plating/numeric/authority.json')).state;
    const official = (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state;
    const disclosure = official.officialRosterDisclosureDataBundle;
    const marker = official.board.missionMarkers.find(row => row.number === 4);
    const port = createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: context.resources.armyBuilder, releaseContext: context });
    const summaries = [];
    for (const spec of specs) {
      const existing = await saved(spec.id + '/authority.json');
      if (existing) { summaries.push({ id: spec.id, reusedCompiledAuthority: true }); continue; }
      const hits = spec.kind === 'hits';
      const candidatesBySide = {
        player1: { sideKey: 'player1', scaleId: 'Skirmish', mineralBudget: 500,
          factionRecordKey: hits ? 'tactical_cards:nerazim' : 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: [],
          units: [{ unitInstanceId: 'actor', recordKey: hits ? 'army_units:zeratul' : 'army_units:marine', compositionKind: 'small',
            upgrades: spec.kind === 'melee' ? [{ upgradeName: 'Bayonet' }] : [] }] },
        player2: { sideKey: 'player2', scaleId: 'Skirmish', mineralBudget: 500,
          factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: [],
          units: [{ unitInstanceId: 'target', recordKey: 'army_units:marauder', compositionKind: 'small',
            upgrades: [{ upgradeName: 'Veteran of Tarsonis' }] }] },
      };
      const verdicts = Object.fromEntries(Object.entries(candidatesBySide).map(([side, candidate]) => [side, port.evaluateRosterCandidate(candidate)]));
      await save(spec.id + '/candidate-audit.json', { candidatesBySide, verdicts });
      assert.ok(Object.values(verdicts).every(row => row.status === 'legal'), 'all addressing must pass actual Builder before construction');
      const setup = createOfficialReleaseRosterStateV2({ context, candidatesBySide, legacyDisclosurePolicy: disclosure,
        includeMelee: spec.kind === 'melee', battlefieldModifierDefinitionIds: modifierIds });
      const phase = spec.kind === 'ranged' ? 'assault' : 'combat';
      const state = { ...setup.state, round: 1, phase, activeSideKey: 'player1', log: [],
        engagementScale: 'Skirmish', armyBuildingEngagementScale: 'Skirmish', board: { ...structuredClone(base.board),
          missionMarkers: [structuredClone(marker)], missionMarkerControlGeometry: structuredClone(official.board.missionMarkerControlGeometry) },
        officialModelGapTransitPolicy: structuredClone(base.officialModelGapTransitPolicy),
        officialStatusStayInPlayDataBundle: structuredClone(base.officialStatusStayInPlayDataBundle),
        officialMissionRuntimeDescriptor: structuredClone(base.officialMissionRuntimeDescriptor),
        supplyLossLedger: createOfficialSupplyLossLedgerV1({ round: 1, rulesRuntimeHash: base.officialMissionRuntimeDescriptor.runtimeHash }),
        phaseFirstActorByRound: { ['1:' + phase]: { round: 1, phase, chosenFirstActorSideKey: 'player1' } } };
      const actor = state.pieces.find(row => row.id === 'actor');
      const target = state.pieces.find(row => row.id === 'target');
      const targetX = marker.xInches + marker.diameterMillimeters / 25.4 / 2 + target.models[0].baseWidthInches / 2 + spec.gap;
      const actorX = targetX - actor.models[0].baseWidthInches / 2 - target.models[0].baseWidthInches / 2
        - (spec.kind === 'ranged' ? 4 : 0.4);
      for (const piece of state.pieces) {
        piece.isOnField = true; piece.isInReserves = false;
        for (const [index, model] of piece.models.entries()) {
          model.isOnField = true;
          Object.assign(model, piece.id === 'target'
            ? { xInches: targetX + index * (model.baseWidthInches + 0.25), yInches: marker.yInches }
            : { xInches: actorX - index % 2 * (model.baseWidthInches + 0.1),
              yInches: marker.yInches + Math.floor(index / 2) * (model.baseDepthInches + 0.1) });
        }
      }
      const runtime = runtimeFor(context, state, spec);
      if (runtime.bundle) state.officialCharacteristicStatusFamilySourceBundle = runtime.bundle;
      assert.equal(runtime.descriptor.runtimeVersion, '3.5.0');
      const query = runtime.query(state, { queryKind: 'battlefield_modifiers', pieceId: 'target' });
      assert.equal(query.result.armourModifier, spec.expectedThreshold === 3 ? 1 : 0);
      assert.equal(query.result.markerArmourChecks[0].unitWithin, spec.expectedThreshold === 3);
      assert.throws(() => createOfficialBattlefieldAssetFamilyAdapterV1(state.officialBattlefieldAssetFamilySourceBundle), /LEGACY_ADAPTER_SOURCE_REQUIRED/);
      assert.throws(() => createOfficialBattlefieldAssetFamilyDefinitionBindingsV1(state.officialBattlefieldAssetFamilySourceBundle), /LEGACY_BINDING_SOURCE_REQUIRED/);
      const wrong = structuredClone(state);
      wrong.officialBattlefieldAssetFamilySourceBundle.normalizedDatasetHash = '0'.repeat(64);
      assert.throws(() => runtimeFor(context, wrong, spec), /BATTLEFIELD_MODIFIER_SOURCE_MISMATCH/);
      const m = context.manifest;
      await save(spec.id + '/runtime.json', runtime.descriptor);
      const manifest = createOfficialReleaseManifestV2({ releaseId: releaseId(spec.id), dataset: context.dataset, snapshot: context.snapshot,
        sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef, snapshotRef: m.source.snapshotRef,
        sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references, sourcePolicy: m.source.policy,
        components: { ...m.components, rulesRuntime: { ref: ref(spec.id + '/runtime.json'), version: '3.5.0',
          integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } });
      const product = registry();
      try {
        product.resolver.register(manifest);
        const resolved = await product.resolver.resolve({ releaseId: releaseId(spec.id), purpose: 'ability_component' });
        await save(spec.id + '/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved, state,
          scenario: { fullMatch: false, placementAndPhaseDeclared: true, scale: 500, localMarkerSubsetDeclared: true,
            officialMarkerSourceRef: 'build/ticket-28-wave3-release-context-20261112-v1/native-authority.json', markerEdgeGap: spec.gap } }));
      } finally { product.close(); }
      if (spec.id === 'melee-near') {
        const action = rawFight(runtime, state);
        const context = runtime.melee.inspectContext(state, action);
        const rolls = fixedFightRolls(context);
        const green = runtime.melee.resolveChance(state, action, { chanceReveals: rolls });
        assert.equal(context.poolPlan.targets[0].armourThreshold, 3);
        assert.equal(green.rows[0].resolution.armourThreshold, 3);
        assert.equal(green.rows[0].resolution.totalDamage, 0);
        // red.json preserves the pre-fix reproduction. New runs assert the repaired consumer.
        await save('compile-fixed-roll-green.json', { counterfactualOnly: true, nativeReceiptCreated: false,
          plannedThreshold: 3, resolvedThreshold: 3, fixedRolls: rolls, damage: 0 });
      }
      summaries.push({ id: spec.id, query, expectedThreshold: spec.expectedThreshold });
    }
    const evidenceRef = await save('compile.json', { cases: summaries });
    return { evidenceRef, checkpointRef: ref('melee-near/authority.json') };
  } },
  { name: 'consume', repairRef: 'packages/product-composition/official-selected-roster-melee-action-runtime-v1.mjs#optional-pylon-source', openProduct, check: async product => {
    const cases = [];
    for (const spec of specs) {
      const prior = await saved(spec.id + '/consume.json');
      if (prior) { cases.push(prior); continue; }
      const branch = await product.branch(spec);
      try {
        const { native, authority, runtime } = branch;
        const credentials = await native.create(roomId(spec.id), authority);
        const initial = (await native.store.loadRoom(roomId(spec.id))).envelope;
        const query = runtime.query(initial.state, { queryKind: 'battlefield_modifiers', pieceId: 'target' });
        assert.deepEqual((await native.store.loadRoom(roomId(spec.id))).envelope, initial);
        if (spec.kind === 'melee') {
          const action = rawFight(runtime, initial.state);
          const context = runtime.melee.inspectContext(initial.state, action);
          const green = runtime.melee.resolveChance(initial.state, action, { chanceReveals: fixedFightRolls(context) });
          assert.equal(green.rows[0].resolution.armourThreshold, spec.expectedThreshold);
          if (spec.expectedThreshold === 3) assert.equal(green.rows[0].resolution.totalDamage, 0);
          await save(spec.id + '/fixed-roll-green.json', { counterfactualOnly: true, green });
          await native.commit({ roomId: roomId(spec.id), credential: credentials.player1, operationKey: 'fight',
            select: row => row.actionType === 'fight', parameters: fightParameters });
        } else if (spec.kind === 'hits') {
          const prepared = paidHitsState(runtime, initial.state);
          const row = runtime.hits.enumerate(prepared).candidates[0];
          const action = Object.fromEntries(Object.entries(row).filter(([key]) => !['isEnabled', 'disabledReason'].includes(key)));
          assert.equal(runtime.hits.inspectContext(prepared, action).targets[0].armourThreshold, 3);
          await native.commit({ roomId: roomId(spec.id), credential: credentials.player1, operationKey: 'source-hits',
            select: row => row.abilityName === 'Shadow Strike', parameters: row => ({ activeUnitId: 'actor',
              paymentCardInstanceIds: row.parameterSchema.paymentCardInstanceIds.enum[0] }) });
        } else await native.commit({ roomId: roomId(spec.id), credential: credentials.player1, operationKey: 'ranged',
          select: row => row.actionType === 'ranged_attack', parameters: () => ({ targetUnitId: 'target' }) });
        const checkpoint = await native.store.loadRoom(roomId(spec.id));
        await save(spec.id + '/first-checkpoint.json', { envelope: checkpoint.envelope });
        const value = { id: spec.id, revision: checkpoint.stateRevision, sourceQuery: query, queryReadOnly: true };
        await save(spec.id + '/consume.json', value); cases.push(value);
      } finally { branch.close(); }
    }
    const evidenceRef = await save('consume.json', { cases });
    return { evidenceRef, checkpointRef: evidenceRef };
  } },
  { name: 'successor', openProduct, check: async product => {
    const cases = [];
    for (const spec of specs) {
      const prior = await saved(spec.id + '/successor.json');
      if (prior) { cases.push(prior); continue; }
      const branch = await product.branch(spec);
      try {
        const { native, authority } = branch;
        const credentials = await native.create(roomId(spec.id), authority);
        const current = await drain(branch, spec, credentials);
        const types = ['ranged_attack', 'close_combat_attack', 'automatic_hits_damage'];
        const event = current.envelope.state.log.flatMap(row => row.events || []).find(row => types.includes(row.type));
        assert.ok(event);
        const stages = event.stages;
        const threshold = stages.armour?.threshold ?? stages.armourThreshold;
        assert.equal(threshold, spec.expectedThreshold);
        const rolls = stages.armour?.rolls ?? stages.armourRolls;
        const saves = rolls.filter(value => value !== 1 && (value === 6 || value >= spec.expectedThreshold)).length;
        assert.equal(stages.armour?.saves ?? stages.armourSaves, saves);
        const menu = await native.room.legalSpace({ roomId: roomId(spec.id), seatToken: credentials[current.envelope.state.activeSideKey].seatToken });
        assert.equal(menu.ok, true, JSON.stringify(menu));
        assert.ok(menu.legalSpace.parameterDomains.length || menu.legalSpace.finiteActions.length);
        await save(spec.id + '/checkpoint.json', { envelope: current.envelope });
        const value = { id: spec.id, revision: current.stateRevision, event,
          plannedAndResolvedThresholdEqual: true, nextLegalSpaceAvailable: true };
        await save(spec.id + '/successor.json', value); cases.push(value);
      } finally { branch.close(); }
    }
    const evidenceRef = await save('successor.json', { cases });
    return { evidenceRef, checkpointRef: evidenceRef };
  } },
  { name: 'coldRecovery', openProduct, check: async product => {
    const cases = [];
    for (const spec of specs) {
      const branch = await product.branch(spec);
      try {
        const { native, authority } = branch;
        const credentials = await native.create(roomId(spec.id), authority);
        const current = await native.store.loadRoom(roomId(spec.id));
        assert.deepEqual(current.envelope, (await read(ref(spec.id + '/checkpoint.json'))).envelope);
        const bundle = await native.store.loadReplayBundle(roomId(spec.id));
        const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
        for (const name of ['first-checkpoint.json', 'casualty-checkpoint.json']) {
          const checkpoint = await saved(spec.id + '/' + name);
          if (!checkpoint) continue;
          const replay = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, checkpoint.envelope.stateRevision) });
          assert.equal(replay.ok, true, JSON.stringify(replay)); assert.deepEqual(replay.envelope, checkpoint.envelope);
        }
        const replay = await native.room.replayRoom({ roomId: roomId(spec.id), seatToken: credentials.player1.seatToken });
        assert.equal(replay.ok, true, JSON.stringify(replay)); assert.equal(replay.matchesCurrent, true);
        cases.push({ id: spec.id, revision: current.stateRevision, receiptCount: receipts.length, fullReplayExact: true });
      } finally { branch.close(); }
    }
    const evidenceRef = await save('cold-recovery.json', { cases });
    return { evidenceRef, checkpointRef: evidenceRef };
  } },
] });
} catch (error) {
  if (!error.savedBoundary) throw error;
  result = await read(ref('verification/boundary.json'));
}
console.log(JSON.stringify({ status: result.status, passed: Object.keys(result.passed), failuresRetained: result.failures.length }));


if (result.status === 'passed') {
  const casualtyCapChange = process.argv.includes('--concentrated-fire-compatibility');
  const armourReactionChange = process.argv.includes('--armour-reaction-compatibility');
  const compatibilityPrefix = armourReactionChange ? 'armour-reaction-compatibility'
    : casualtyCapChange ? 'concentrated-fire-compatibility' : 'legacy-compatibility';
  const legacy = await runProductBoundaryCheck({ directory: path.join(directory, compatibilityPrefix), identity: {
    factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
    factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2',
    sourceRef: parent + 'heavy-plating/numeric/authority.json',
    contractVersion: armourReactionChange ? 'T28-W3-07-before-armour-reaction-prior-source-replay-v1'
      : casualtyCapChange ? 'T28-W3-07-added-casualty-cap-prior-source-replay-v1'
      : 'T28-W3-07-armour-threshold-prior-source-replay-v1',
  }, steps: [{ name: 'coldRecovery', openProduct: async () => ({ close() {} }), check: async () => {
    const cases = [];
    const families = ['heavy-plating', 'heavy-plating-melee', 'heavy-plating-hits', 'armour-ordinals',
      ...(armourReactionChange ? ['armour-threshold', 'immortal-reaction-source'] : [])];
    for (const family of families) {
      const ordinals = family === 'armour-ordinals';
      const threshold = family === 'armour-threshold';
      const reactionSource = family === 'immortal-reaction-source';
      const ids = threshold ? ['melee-near', 'melee-outside', 'hits-near', 'ranged-near']
        : reactionSource ? ['use', 'decline'] : ordinals ? ['activation', 'round', 'cross-kind']
        : family === 'heavy-plating' ? ['numeric', 'blast']
        : family === 'heavy-plating-melee' ? ['single', 'split'] : ['single', 'multiple'];
      const previous = path.join(root, parent, family);
      const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(previous, 'releases.sqlite') });
      try {
        const resolver = createOfficialReleaseResolverV2({ store, loadArtifact: read });
        for (const id of ids) {
          const checkpointName = compatibilityPrefix + '/' + family + '-' + id + '.json';
          const prior = await saved(checkpointName);
          if (prior) { cases.push(prior); continue; }
          const prefix = ordinals ? 'wave3-u83-c84-r50-armour-ordinal-' : 'wave3-u83-c84-r50-' + family + '-';
          const context = await resolver.resolve({ releaseId: prefix + id + '-v1', purpose: 'ability_component' });
          const authority = await read(parent + family + '/' + id + '/authority.json');
          const ranged = threshold ? id === 'ranged-near' : reactionSource || family === 'heavy-plating' || (ordinals && id !== 'cross-kind');
          const hits = threshold ? id === 'hits-near' : family === 'heavy-plating-hits' || (ordinals && id === 'cross-kind');
          const definitionIds = threshold ? (hits ? ['unit:zeratul/shadow-strike-combat-phase@1'] : [])
            : reactionSource ? [] : ordinals
            ? [id === 'round' ? 'unit:praetor_guard__zealot_/shield-overcharge-any-phase@1'
              : 'unit:hydralisk/ancillary-carapace-any-phase@1',
              ...(hits ? ['unit:zeratul/shadow-strike-combat-phase@1'] : [])]
            : ['unit:siege_tank/heavy-plating-any-phase@1', ...(ranged
              ? ['unit:siege_tank/mode-transformation-movement-phase@1', 'unit:goliath/ares-class-targeting-system-any-phase@1']
              : hits ? ['unit:zeratul/shadow-strike-combat-phase@1'] : [])];
          const rangedChoices = ranged && !threshold && !reactionSource;
          const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state,
            definitionIds, includeArmourOrdinals: ordinals, includeRanged: ranged,
            includeTemplateAttacks: rangedChoices && !ordinals, includePrecisionChoices: rangedChoices,
            includePointDefenseChoices: rangedChoices && !ordinals, includeArmourChoices: rangedChoices,
            includeMelee: threshold ? id.startsWith('melee-') : !ranged, includeHits: hits,
            ...(family === 'heavy-plating' && id === 'blast' ? { weaponDefinitionIds: [
              'unit:siege_tank/twin-cannon-assault-phase@1', 'unit:siege_tank/shock-cannon-assault-phase@1'] } : {}) });
          assert.equal(runtime.descriptor.runtimeHash, context.resources.rulesRuntime.runtimeHash);
          const native = openWave3EngineeringRoomV1({ directory: path.join(previous, id), filename: 'room.sqlite',
            rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
          try {
            const oldRoomId = threshold ? 'wave3-armour-threshold-' + id
              : ordinals ? 'wave3-armour-ordinal-' + id : 'wave2-' + family + '-' + id;
            const before = await native.store.loadRoom(oldRoomId);
            assert.ok(before);
            await native.restoreDependencies(oldRoomId, authority);
            const bundle = await native.store.loadReplayBundle(oldRoomId);
            const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
              .map(row => row.payload.payload.receipt);
            const replay = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts });
            assert.equal(replay.ok, true, JSON.stringify(replay));
            assert.deepEqual(replay.envelope, before.envelope);
            assert.deepEqual(await native.store.loadRoom(oldRoomId), before);
            const value = { family, id, receiptCount: receipts.length, fullReplayExact: true,
              originalRoomUnchanged: true, descriptorMatchesFrozenRelease: true };
            await save(checkpointName, value);
            cases.push(value);
          } finally { native.close(); }
        }
      } finally { store.close(); }
    }
    const evidenceRef = await save(compatibilityPrefix + '.json', { cases });
    return { evidenceRef, checkpointRef: evidenceRef };
  } }] });
  console.log(JSON.stringify({ legacyCompatibility: legacy.status, failuresRetained: legacy.failures.length }));
  if (legacy.status !== 'passed') process.exitCode = 1;
} else process.exitCode = 1;
