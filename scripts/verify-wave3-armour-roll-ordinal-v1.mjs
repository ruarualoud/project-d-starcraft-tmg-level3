import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 } from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialSupplyLossLedgerV1 } from '../packages/rule-atoms/official-supply-loss-ledger-v1.mjs';
import { inspectOfficialArmourRollOrdinalsV1, recordOfficialArmourRollV1 } from '../packages/rule-atoms/official-armour-roll-ordinal-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const parent = 'build/ticket-28-wave2-capabilities-20261113-v1/';
const directory = path.join(root, parent, 'armour-ordinals');
const specs = [
  { id: 'activation', definitionId: 'unit:hydralisk/ancillary-carapace-any-phase@1', firstTough: 1 },
  { id: 'round', definitionId: 'unit:praetor_guard__zealot_/shield-overcharge-any-phase@1', firstTough: 2 },
  { id: 'cross-kind', definitionId: 'unit:hydralisk/ancillary-carapace-any-phase@1', firstTough: 1 },
];
const roomId = id => 'wave3-armour-ordinal-' + id;
const releaseId = id => 'wave3-u83-c84-r50-armour-ordinal-' + id + '-v1';
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
  const cross = spec.id === 'cross-kind';
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
    definitionIds: [spec.definitionId, ...(cross ? ['unit:zeratul/shadow-strike-combat-phase@1'] : [])],
    includeArmourOrdinals: true, includeRanged: !cross, includePrecisionChoices: !cross,
    includeArmourChoices: !cross, includeMelee: cross, includeHits: cross });
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
function projection(runtime, state, actorId) {
  return runtime.query(state, { queryKind: 'characteristic_status_projection', pieceId: 'target',
    context: { attackerPieceId: actorId, targetPieceId: 'target',
      armourRollOrdinalInRound: 999, armourRollOrdinalInActivation: 999 } }).result;
}
function isResolving(state) {
  return Boolean(state.pendingOfficialRangedPrecisionChoice || state.pendingCurrentProductRangedCasualtyChoice
    || state.pendingOfficialHitsPoolChoice || state.pendingOfficialAutomaticHits
    || state.pendingOfficialMeleePoolChoice || state.pendingAction);
}
async function drain(branch, spec, credentials) {
  for (let step = 0; step < 24; step++) {
    const current = await branch.native.store.loadRoom(roomId(spec.id));
    const state = current.envelope.state;
    if (!isResolving(state)) return current;
    const menu = branch.runtime.enumerate(state);
    const common = { roomId: roomId(spec.id), credential: credentials[state.activeSideKey], operationKey: 'resolve-' + current.stateRevision };
    const domain = menu.parameterDomains[0];
    if (!domain) {
      assert.equal(menu.candidates.length, 1);
      await branch.native.commit({ ...common, kind: 'finite', select: () => true });
    } else {
      const field = domain.parameterSchema.required[0];
      let selected;
      if (field === 'convertedFailedArmourDieIndices') {
        selected = domain.parameterSchema[field].items.enum.slice(0, domain.parameterSchema[field].maxItems);
      } else if (field === 'convertedFailedHitDieIndices') selected = [];
      else if (field === 'casualtySelectionHash') selected = domain.parameterSchema[field].enum[0];
      else assert.fail('unexpected defence choice ' + field);
      await save(spec.id + '/defence-checkpoint.json', { envelope: current.envelope });
      const committed = await branch.native.commit({ ...common, select: row => row.domainId === domain.domainId,
        parameters: () => ({ [field]: selected }) });
      assert.equal(committed.preview.core.chanceTicket, null);
    }
  }
  assert.fail('finite defence stages did not settle');
}

await fs.mkdir(directory, { recursive: true });
const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
  factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
  factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: parent + 'heavy-plating-hits/read.json',
  contractVersion: 'T28-W3-07-actual-armour-roll-ordinals-v1',
}, steps: [
  { name: 'read', openProduct: sourceProduct, check: async context => {
    const sources = ['army_units:hydralisk', 'army_units:praetor_guard__zealot_'].map(key => ({ recordKey: key,
      feature: context.dataset.recordsByKey[key].payload.upgrades.find(row => /first Armour Roll/.test(row.description)) }));
    assert.equal(sources[0].feature.description, 'This Unit gains TOUGH (1) on the first Armour Roll of each Activation.');
    assert.equal(sources[1].feature.description, 'This Unit gains TOUGH (2) on the first Armour Roll each Round.');
    const evidenceRef = await save('read.json', { sources, dataVersions: context.dataset.dataVersions });
    return { evidenceRef, checkpointRef: evidenceRef };
  } },
  { name: 'compile', repairRef: 'scripts/verify-wave3-armour-roll-ordinal-v1.mjs#faction-source-preaudit', openProduct: sourceProduct, check: async context => {
    const base = (await read(parent + 'heavy-plating/numeric/authority.json')).state;
    const disclosure = (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state.officialRosterDisclosureDataBundle;
    const candidates = [];
    for (const spec of specs) {
      const priorAuthority = await saved(spec.id + '/authority.json');
      if (priorAuthority) {
        candidates.push({ id: spec.id, reusedCompiledAuthority: true });
        continue;
      }
      const cross = spec.id === 'cross-kind';
      const praetor = spec.id === 'round';
      const candidatesBySide = {
        player1: { sideKey: 'player1', scaleId: 'Skirmish', mineralBudget: 500,
          factionRecordKey: cross ? 'tactical_cards:nerazim' : 'tactical_cards:terran_armed_forces',
          tacticalCardRecordKeys: cross ? [] : ['tactical_cards:factory__tech_lab_'],
          units: cross ? [{ unitInstanceId: 'actor', recordKey: 'army_units:zeratul', compositionKind: 'small', upgrades: [] }]
            : [{ unitInstanceId: 'actor', recordKey: 'army_units:goliath', compositionKind: 'small', upgrades: [] },
              { unitInstanceId: 'next-actor', recordKey: 'army_units:marine', compositionKind: 'small', upgrades: [] }] },
        player2: { sideKey: 'player2', scaleId: 'Skirmish', mineralBudget: 500,
          factionRecordKey: praetor ? 'tactical_cards:khalai' : 'tactical_cards:kerrigan_s_swarm',
          tacticalCardRecordKeys: praetor ? ['tactical_cards:forge'] : ['tactical_cards:accelerating_creep', 'tactical_cards:hydralisk_den'],
          units: [{ unitInstanceId: 'target', recordKey: praetor ? 'army_units:praetor_guard__zealot_' : 'army_units:hydralisk',
            compositionKind: praetor ? 'small' : 'large', upgrades: praetor ? [] : [{ upgradeName: 'Ancillary Carapace' }] }] },
      };
      const setup = createOfficialReleaseRosterStateV2({ context, candidatesBySide, legacyDisclosurePolicy: disclosure,
        includeArmourOrdinals: true, includeMelee: cross });
      const phase = cross ? 'combat' : 'assault';
      const state = { ...setup.state, round: 1, phase, activeSideKey: 'player1', log: [],
        engagementScale: 'Skirmish', armyBuildingEngagementScale: 'Skirmish', board: structuredClone(base.board),
        officialModelGapTransitPolicy: structuredClone(base.officialModelGapTransitPolicy),
        officialStatusStayInPlayDataBundle: structuredClone(base.officialStatusStayInPlayDataBundle),
        officialMissionRuntimeDescriptor: structuredClone(base.officialMissionRuntimeDescriptor),
        supplyLossLedger: createOfficialSupplyLossLedgerV1({ round: 1, rulesRuntimeHash: base.officialMissionRuntimeDescriptor.runtimeHash }),
        phaseFirstActorByRound: { ['1:' + phase]: { round: 1, phase, chosenFirstActorSideKey: 'player1' } } };
      const actor = state.pieces.find(row => row.id === 'actor');
      const target = state.pieces.find(row => row.id === 'target');
      const startX = cross ? 12 + actor.models[0].baseWidthInches / 2 + target.models[0].baseWidthInches / 2 + 0.5 : 16;
      for (const piece of state.pieces) {
        piece.isOnField = true; piece.isInReserves = false;
        for (const [index, model] of piece.models.entries()) {
          model.isOnField = true;
          if (piece.id === 'actor') Object.assign(model, cross ? { xInches: 12, yInches: 12 } : { xInches: 8, yInches: 10 });
          else if (piece.id === 'target') Object.assign(model, { xInches: startX + index % 2 * (model.baseWidthInches + 0.25),
            yInches: (cross ? 12 : 10) + Math.floor(index / 2) * (model.baseDepthInches + 0.25) });
          else Object.assign(model, { xInches: 3 + index % 3 * (model.baseWidthInches + 0.1),
            yInches: 29 + Math.floor(index / 3) * (model.baseDepthInches + 0.1) });
        }
      }
      const runtime = runtimeFor(context, state, spec);
      state.officialCharacteristicStatusFamilySourceBundle = runtime.bundle;
      assert.equal(runtime.descriptor.runtimeVersion, '3.4.0');
      assert.equal(projection(runtime, state, 'actor').tough, spec.firstTough);
      assert.equal(state.officialArmourRollHistory, undefined);
      const m = context.manifest;
      await save(spec.id + '/runtime.json', runtime.descriptor);
      const manifest = createOfficialReleaseManifestV2({ releaseId: releaseId(spec.id), dataset: context.dataset, snapshot: context.snapshot,
        sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef, snapshotRef: m.source.snapshotRef,
        sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references, sourcePolicy: m.source.policy,
        components: { ...m.components, rulesRuntime: { ref: ref(spec.id + '/runtime.json'), version: '3.4.0',
          integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } });
      const product = registry();
      try {
        product.resolver.register(manifest);
        const resolved = await product.resolver.resolve({ releaseId: releaseId(spec.id), purpose: 'ability_component' });
        await save(spec.id + '/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved, state,
          scenario: { fullMatch: false, placementAndPhaseDeclared: true, scale: 500, firstArmourScope: praetor ? 'round' : 'activation' } }));
      } finally { product.close(); }
      candidates.push({ id: spec.id, candidatesBySide });
    }
    const evidenceRef = await save('compile.json', { candidates, forgedOrdinalsIgnored: true, sourceQueryDidNotConsume: true });
    return { evidenceRef, checkpointRef: ref('activation/authority.json') };
  } },
  { name: 'consume', openProduct, check: async product => {
    const cases = [];
    for (const spec of specs) {
      const prior = await saved(spec.id + '/consume.json');
      if (prior) { cases.push(prior); continue; }
      const branch = await product.branch(spec);
      try {
        const { native, authority, runtime } = branch;
        const credentials = await native.create(roomId(spec.id), authority);
        const initial = (await native.store.loadRoom(roomId(spec.id))).envelope;
        assert.equal(projection(runtime, initial.state, 'actor').tough, spec.firstTough);
        if (spec.id === 'cross-kind') await native.commit({ roomId: roomId(spec.id), credential: credentials.player1,
          operationKey: 'first-ability', select: row => row.abilityName === 'Shadow Strike', parameters: row => ({ activeUnitId: 'actor',
            paymentCardInstanceIds: row.parameterSchema.paymentCardInstanceIds.enum[0] }) });
        else await native.commit({ roomId: roomId(spec.id), credential: credentials.player1, operationKey: 'first-weapon',
          select: row => row.weaponName === 'Autocannon', parameters: () => ({ targetUnitId: 'target' }) });
        const first = await drain(branch, spec, credentials);
        const history = first.envelope.state.officialArmourRollHistory;
        assert.ok(history && history.rolls.length === 1, 'this actual first pool must contain Armour dice');
        assert.equal(history.rolls[0].armourRollOrdinalInRound, 1);
        assert.equal(history.rolls[0].armourRollOrdinalInActivation, 1);
        assert.equal(projection(runtime, first.envelope.state, 'actor').tough, 0);
        assert.equal(inspectOfficialArmourRollOrdinalsV1(first.envelope.state,
          { targetPieceId: 'target', attackerPieceId: 'actor' }).armourRollOrdinalInActivation, 2);
        await save(spec.id + '/first-checkpoint.json', { envelope: first.envelope });
        const value = { id: spec.id, revision: first.stateRevision, firstTough: spec.firstTough,
          afterFirstTough: 0, roll: history.rolls[0] };
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
        const { native, authority, runtime } = branch;
        const credentials = await native.create(roomId(spec.id), authority);
        const before = await native.store.loadRoom(roomId(spec.id));
        assert.equal(projection(runtime, before.envelope.state, 'actor').tough, 0);
        if (spec.id === 'cross-kind') await native.commit({ roomId: roomId(spec.id), credential: credentials.player1,
          operationKey: 'next-core-fight', select: row => row.actionType === 'fight' && row.pieceId === 'actor', parameters: row => ({
            closeRanksMode: 'decline', allocations: [{ targetUnitId: 'target', dice: row.constraints.declineCloseRanksAttackDice }],
            ...(row.parameterSchema.required.includes('surgeTargetUnitId') ? { surgeTargetUnitId: 'target' } : {}) }) });
        else await native.commit({ roomId: roomId(spec.id), credential: credentials.player1, operationKey: 'second-weapon',
          select: row => row.weaponName === 'Underbelly Machine Gun', parameters: () => ({ targetUnitId: 'target' }) });
        const current = await drain(branch, spec, credentials);
        const history = current.envelope.state.officialArmourRollHistory;
        const damage = current.envelope.state.log.flatMap(row => row.events || [])
          .filter(row => ['ranged_attack', 'automatic_hits_damage', 'close_combat_attack'].includes(row.type));
        assert.equal(damage.length, 2);
        const last = damage.at(-1).stages;
        const secondArmourDice = last.armour?.dice ?? last.armourDice;
        assert.equal(history.rolls.length, secondArmourDice > 0 ? 2 : 1);
        if (secondArmourDice > 0) {
          assert.equal(history.rolls[1].armourRollOrdinalInActivation, 2);
          assert.equal(history.rolls[1].armourRollOrdinalInRound, 2);
        }
        const nextActivation = structuredClone(current.envelope.state);
        delete nextActivation.selectedRosterActivationWindow;
        delete nextActivation.pendingCurrentProductRangedSequence;
        if (spec.id !== 'cross-kind') assert.equal(projection(runtime, nextActivation, 'next-actor').tough,
          spec.id === 'round' ? 0 : 1);
        const nextRound = structuredClone(nextActivation);
        nextRound.round = 2;
        assert.equal(projection(runtime, nextRound, 'actor').tough, spec.firstTough);
        const unchanged = structuredClone(current.envelope.state);
        const empty = structuredClone(unchanged);
        recordOfficialArmourRollV1(empty, { action: { pieceId: 'actor' }, targetPieceId: 'target', poolDice: 0 });
        assert.deepEqual(empty, unchanged);
        assert.throws(() => recordOfficialArmourRollV1(empty, { action: { pieceId: 'actor' }, targetPieceId: 'target', poolDice: -1 }), /POOL_INVALID/);
        await save(spec.id + '/checkpoint.json', { envelope: current.envelope });
        const value = { id: spec.id, revision: current.stateRevision, damage, history,
          queryOnlyScopeResetChecks: { nextActivation: true, nextRound: true, fullRoundNativeNotExecuted: true },
          emptyPoolDidNotConsume: true, invalidCountRejected: true };
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
        for (const name of ['first-checkpoint.json', 'defence-checkpoint.json']) {
          const checkpoint = await saved(spec.id + '/' + name);
          if (!checkpoint) continue;
          const expected = checkpoint.envelope;
          const replay = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, expected.stateRevision) });
          assert.equal(replay.ok, true, JSON.stringify(replay)); assert.deepEqual(replay.envelope, expected);
        }
        const replay = await native.room.replayRoom({ roomId: roomId(spec.id), seatToken: credentials.player1.seatToken });
        assert.equal(replay.ok, true, JSON.stringify(replay)); assert.equal(replay.matchesCurrent, true);
        assert.deepEqual((await native.store.loadRoom(roomId(spec.id))).envelope, current.envelope);
        cases.push({ id: spec.id, revision: current.stateRevision, receiptCount: receipts.length, fullReplayExact: true, historyPreserved: true });
      } finally { branch.close(); }
    }
    const evidenceRef = await save('cold-recovery.json', { cases });
    return { evidenceRef, checkpointRef: evidenceRef };
  } },
] });
console.log(JSON.stringify({ status: result.status, passed: Object.keys(result.passed), failures: result.failures }));

const legacy = await runProductBoundaryCheck({ directory: path.join(directory, 'legacy-compatibility'), identity: {
  factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
  factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: parent + 'heavy-plating/numeric/authority.json',
  contractVersion: 'T28-W3-07-opt-in-armour-count-legacy-default-replay-v1',
}, steps: [{ name: 'coldRecovery', openProduct: async () => ({ close() {} }), check: async () => {
  const cases = [];
  for (const family of ['heavy-plating', 'heavy-plating-melee', 'heavy-plating-hits']) {
    const ids = family === 'heavy-plating' ? ['numeric', 'blast'] : family === 'heavy-plating-melee' ? ['single', 'split'] : ['single', 'multiple'];
    const previous = path.join(root, parent, family);
    const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(previous, 'releases.sqlite') });
    try {
      const resolver = createOfficialReleaseResolverV2({ store, loadArtifact: read });
      for (const id of ids) {
        const context = await resolver.resolve({ releaseId: 'wave3-u83-c84-r50-' + family + '-' + id + '-v1', purpose: 'ability_component' });
        const authority = await read(parent + family + '/' + id + '/authority.json');
        const ranged = family === 'heavy-plating';
        const hits = family === 'heavy-plating-hits';
        const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state,
          definitionIds: ['unit:siege_tank/heavy-plating-any-phase@1', ...(ranged
            ? ['unit:siege_tank/mode-transformation-movement-phase@1', 'unit:goliath/ares-class-targeting-system-any-phase@1']
            : hits ? ['unit:zeratul/shadow-strike-combat-phase@1'] : [])],
          includeRanged: ranged, includeTemplateAttacks: ranged, includePrecisionChoices: ranged,
          includePointDefenseChoices: ranged, includeArmourChoices: ranged, includeMelee: !ranged, includeHits: hits,
          ...(ranged && id === 'blast' ? { weaponDefinitionIds: ['unit:siege_tank/twin-cannon-assault-phase@1',
            'unit:siege_tank/shock-cannon-assault-phase@1'] } : {}) });
        assert.equal(runtime.descriptor.runtimeHash, context.resources.rulesRuntime.runtimeHash);
        const native = openWave3EngineeringRoomV1({ directory: path.join(previous, id), filename: 'room.sqlite',
          rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
        try {
          const oldRoomId = 'wave2-' + family + '-' + id;
          const before = await native.store.loadRoom(oldRoomId);
          assert.ok(before);
          await native.restoreDependencies(oldRoomId, authority);
          const bundle = await native.store.loadReplayBundle(oldRoomId);
          const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
          const replay = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts });
          assert.equal(replay.ok, true, JSON.stringify(replay)); assert.deepEqual(replay.envelope, before.envelope);
          assert.deepEqual((await native.store.loadRoom(oldRoomId)).envelope, before.envelope);
          cases.push({ family, id, receiptCount: receipts.length, fullReplayExact: true, originalRoomUnchanged: true });
        } finally { native.close(); }
      }
    } finally { store.close(); }
  }
  const evidenceRef = await save('legacy-compatibility.json', { cases });
  return { evidenceRef, checkpointRef: evidenceRef };
} }] });
console.log(JSON.stringify({ legacyCompatibility: legacy.status }));

const integrity = await runProductBoundaryCheck({ directory: path.join(directory, 'history-integrity'), identity: {
  factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
  factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: ref('activation/checkpoint.json'),
  contractVersion: 'T28-W3-07-saved-armour-history-idempotency-and-invalid-input-v1',
}, steps: [{ name: 'consume', openProduct, check: async product => {
  const branch = await product.branch(specs[0]);
  try {
    const { native, authority, runtime } = branch;
    await native.create(roomId('activation'), authority);
    const before = await native.store.loadRoom(roomId('activation'));
    const state = before.envelope.state;
    assert.equal(projection(runtime, state, 'next-actor').tough, 0, 'current ranged sequence owns activation scope');
    const firstAction = state.log[0].action.attackAction;
    const roll = state.officialArmourRollHistory.rolls[0];
    const duplicate = structuredClone(state);
    recordOfficialArmourRollV1(duplicate, { action: firstAction, targetPieceId: 'target', poolDice: roll.poolDice });
    assert.deepEqual(duplicate, state);
    assert.throws(() => recordOfficialArmourRollV1(duplicate, {
      action: firstAction, targetPieceId: 'target', poolDice: roll.poolDice + 1 }), /DUPLICATE_DRIFT/);
    const badHistory = structuredClone(state);
    badHistory.officialArmourRollHistory.historyHash = '0'.repeat(64);
    assert.throws(() => projection(runtime, badHistory, 'actor'), /HISTORY_INVALID/);
    const badPolicy = structuredClone(state);
    badPolicy.officialArmourRollOrdinalPolicy.version = 'invalid';
    assert.throws(() => projection(runtime, badPolicy, 'actor'), /POLICY_INVALID/);
    const stale = structuredClone(state);
    stale.selectedRosterActivationWindow = { round: Number(state.round), phase: 'movement',
      sideKey: 'player1', pieceId: 'actor', stage: 'before_action' };
    assert.throws(() => projection(runtime, stale, 'actor'), /ACTIVATION_STALE/);
    const additional = structuredClone(state);
    delete additional.pendingCurrentProductRangedSequence;
    additional.selectedRosterActivationWindow = { round: Number(state.round), phase: state.phase, sideKey: 'player1',
      pieceId: 'actor', stage: 'before_action', activationId: 'declared-extra-activation-engineering-query' };
    assert.equal(projection(runtime, additional, 'actor').tough, 1);
    const next = structuredClone(state);
    delete next.selectedRosterActivationWindow;
    delete next.pendingCurrentProductRangedSequence;
    assert.equal(projection(runtime, next, 'next-actor').tough, 1);
    next.round = 2;
    assert.equal(inspectOfficialArmourRollOrdinalsV1(next, { targetPieceId: 'target', attackerPieceId: 'actor' }).armourRollOrdinalInRound, 1);
    assert.deepEqual((await native.store.loadRoom(roomId('activation'))).envelope, before.envelope);
    const evidenceRef = await save('history-integrity.json', { nativeRoomUnchanged: true,
      actualSourceActionDuplicateIsNoOp: true, duplicateWithDifferentPoolRejected: true,
      alteredHistoryHashRejected: true, alteredPolicyRejected: true, staleActivationRejected: true,
      currentRangedParentOwnsScope: true, nextActivationWithParentClosedResets: true, nextRoundQueryResets: true,
      explicitAdditionalActivationQueryResets: true, additionalActivationWasNotExecuted: true });
    return { evidenceRef, checkpointRef: evidenceRef };
  } finally { branch.close(); }
} }] });
console.log(JSON.stringify({ historyIntegrity: integrity.status }));
const scopeReplay = await runProductBoundaryCheck({ directory: path.join(directory, 'activation-parent-compatibility'), identity: {
  factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
  factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: ref('cold-recovery.json'),
  contractVersion: 'T28-W3-07-ranged-parent-scope-identity-compatibility-v1',
}, steps: [{ name: 'coldRecovery', openProduct, check: async product => {
  const cases = [];
  for (const spec of specs) {
    const branch = await product.branch(spec);
    try {
      const { native, authority } = branch;
      const credentials = await native.create(roomId(spec.id), authority);
      const before = await native.store.loadRoom(roomId(spec.id));
      const replay = await native.room.replayRoom({ roomId: roomId(spec.id), seatToken: credentials.player1.seatToken });
      assert.equal(replay.ok, true, JSON.stringify(replay));
      assert.equal(replay.matchesCurrent, true);
      assert.deepEqual((await native.store.loadRoom(roomId(spec.id))).envelope, before.envelope);
      cases.push({ id: spec.id, revision: before.stateRevision, fullReplayExact: true, originalRoomUnchanged: true });
    } finally { branch.close(); }
  }
  const evidenceRef = await save('activation-parent-compatibility.json', { cases });
  return { evidenceRef, checkpointRef: evidenceRef };
} }] });
console.log(JSON.stringify({ activationParentCompatibility: scopeReplay.status }));
