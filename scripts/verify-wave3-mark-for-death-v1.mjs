import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { root, arrange, declareCoherency, poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';
import { addWall } from './verify-wave3-spec-ops-suppression-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1,
  commitWave3RangedBatchV1, completeWave3MeleePoolsV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { openProduct as openOverwatchProduct } from './verify-wave3-auto-turret-overwatch-v1.mjs';

const output = 'build/ticket-28-terran-wave3-20261117-v1/mark-for-death/';
const directory = path.join(root, output);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const definitionId = 'card:nova_covert_ops/mark-for-death-any@1';
const bladeId = 'unit:nova_assault_mode/monomolecular-blade-combat-phase@1';
const ids = ['source', 'first-marked', 'first-unmarked', 'melee'];
const roomId = id => 'wave3-mark-for-death-' + id;
const releaseId = id => roomId(id) + '-v1';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const pieceOf = (state, id) => state.pieces.find(piece => piece.id === id);
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
async function save(name, value) {
  const ref = output + name;
  await atomicWrite(path.join(root, ref), JSON.stringify(value, null, 2) + '\n');
  return ref;
}
async function cached(name) {
  try { return await read(output + name); }
  catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
function registry() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'releases.sqlite') });
  return { resolver: createOfficialReleaseResolverV2({ store, loadArtifact: read }), close: () => store.close() };
}
async function sourceProduct() {
  const product = registry();
  try {
    const manifest = await read(sourceRef);
    product.resolver.register(manifest);
    return await product.resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' });
  } finally { product.close(); }
}
function runtimeFor(context, state, options = {}) {
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
    definitionIds: [definitionId], includeRanged: true, includeMelee: true,
    includePrecisionChoices: true, includeArmourChoices: true, ...options });
}
function projection(runtime, state, actor, target, kind = 'ranged', weapon = 'Autocannon') {
  return runtime.query(state, { queryKind: 'characteristic_status_projection', pieceId: actor,
    context: { targetPieceId: target, attackKind: kind, weaponName: weapon } }).result;
}
function declaredAttack(action, actionType) {
  const delegated = action.sourceAction;
  const attack = delegated.actionType === actionType ? delegated : delegated.attackAction;
  assert.equal(attack?.actionType, actionType);
  return attack;
}
function markParameters(domain) {
  const source = domain.sourceDomain || domain;
  assert(source.parameterSchema.targetUnitId.enum.includes('marked'));
  return { activeUnitId: source.parameterSchema.activeUnitId.const,
    targetUnitId: 'marked', paymentCardInstanceIds: [] };
}
function arrangeMarine(piece, x, y) {
  arrange(piece, x, y);
  piece.models.forEach((model, index) => Object.assign(model, {
    xInches: x + index % 3 * (model.baseWidthInches + 0.02),
    yInches: y + Math.floor(index / 3) * (model.baseDepthInches + 0.02) }));
}
async function makeScene(context, id, markedState = null) {
  const original = (await read('build/ticket-28-terran-wave3-20261117-v1/generated-structure/movement/authority.json')).state;
  const setup = createOfficialReleaseRosterStateV2({ context, includeMelee: true,
    characteristicDefinitionIds: [definitionId], meleeWeaponDefinitionIds: [bladeId],
    includeCharacteristicConsumers: true, canonicalResourceTypes: true,
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json'))
      .state.officialRosterDisclosureDataBundle,
    candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:nova_covert_ops', tacticalCardRecordKeys: ['tactical_cards:armory'], units: [
          { unitInstanceId: 'nova', recordKey: 'army_units:nova_assault_mode', compositionKind: 'small', upgrades: [] },
          { unitInstanceId: 'goliath', recordKey: 'army_units:goliath', compositionKind: 'small', upgrades: [] },
          { unitInstanceId: 'marine', recordKey: 'army_units:marine', compositionKind: 'small', upgrades: [] }] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:terran_armed_forces',
        tacticalCardRecordKeys: ['tactical_cards:factory', 'tactical_cards:armory'], units: [
          { unitInstanceId: 'marked', recordKey: 'army_units:goliath', compositionKind: 'small', upgrades: [] },
          { unitInstanceId: 'unmarked', recordKey: 'army_units:goliath', compositionKind: 'small', upgrades: [] }] },
    } });
  const fields = ['board', 'officialDeploymentGeometryBinding', 'engagementScale', 'armyBuildingEngagementScale',
    'officialMissionRuntimeDescriptor', 'supplyLossLedger', 'officialModelGapTransitPolicy', 'officialMissionSupplyProfile'];
  const phase = id === 'source' ? 'movement' : id === 'melee' ? 'combat' : 'assault';
  let state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(original[key])])), ...setup.state,
    round: 1, phase, activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
    phaseFirstActorByRound: { ['1:' + phase]: { round: 1, phase, chosenFirstActorSideKey: 'player1' } } };
  state.board.tokens = []; state.board.markers = []; state.board.effectMarkers = [];
  arrange(pieceOf(state, 'nova'), id === 'melee' ? 16 : 6, id === 'melee' ? 10 : 6);
  arrange(pieceOf(state, 'goliath'), 10, 10);
  arrangeMarine(pieceOf(state, 'marine'), 10, 18);
  arrange(pieceOf(state, 'marked'), 18, 10);
  arrange(pieceOf(state, 'unmarked'), 18, 18);
  if (id === 'melee') {
    const nova = pieceOf(state, 'nova');
    const target = pieceOf(state, 'marked');
    const edgeSeparation = 0.1;
    const centerSeparation = (nova.models[0].baseWidthInches + target.models[0].baseWidthInches) / 2 + edgeSeparation;
    arrange(nova, target.models[0].xInches - centerSeparation, target.models[0].yInches);
  }
  for (const piece of state.pieces) {
    piece.activatedPhases[phase] = false;
    if (markedState) {
      const source = pieceOf(markedState, piece.id);
      piece.statuses = structuredClone(source.statuses);
      if (source.officialAbilityEffects) piece.officialAbilityEffects = structuredClone(source.officialAbilityEffects);
    }
  }
  if (markedState) {
    state.cardResources = structuredClone(markedState.cardResources);
    state.board.effectMarkers = structuredClone(markedState.board.effectMarkers);
    state.activeAbilityUseHistory = structuredClone(markedState.activeAbilityUseHistory);
  }
  if (phase !== 'movement') state.players.player2.passedPhases[phase] = true;
  const coherency = declareCoherency(state);
  state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
  return { state, scenario: { phaseAndPositionsDeclared: true, coherency,
    nativeMarkSourceRef: markedState ? output + 'source/checkpoint-r2.json' : null,
    scale: 'Standard', mineralBudget: 2000, partialLegalRosters: true,
    opponentPassedDeclaredPhase: phase !== 'movement', fullRound: false, fullMatch: false, modelCalls: 0 } };
}
async function registerScene(context, id, scene) {
  const runtime = runtimeFor(context, scene.state);
  assert.equal(runtime.descriptor.runtimeVersion, '3.94.0');
  const runtimeRef = await save(id + '/runtime.json', runtime.descriptor);
  const product = registry();
  try {
    const manifest = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset,
      snapshot: context.snapshot, sourceRevision: await read(manifest.source.sourceRevisionRef),
      datasetRef: manifest.source.datasetRef, snapshotRef: manifest.source.snapshotRef,
      sourceRevisionRef: manifest.source.sourceRevisionRef, referenceSources: manifest.source.references,
      sourcePolicy: manifest.source.policy, components: { ...manifest.components, rulesRuntime: {
        ref: runtimeRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    await save(id + '/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved,
      state: scene.state, scenario: scene.scenario }));
  } finally { product.close(); }
}
async function openProduct() {
  const product = registry();
  return { ...product, async branch(id) {
    const authority = await read(output + id + '/authority.json');
    const context = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(output + id + '/runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory: path.join(directory, id), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { id, context, authority, runtime, native, close: () => native.close() };
  } };
}
async function checkpoint(branch) {
  const current = await branch.native.store.loadRoom(roomId(branch.id));
  await save(branch.id + '/checkpoint-r' + current.stateRevision + '.json', { envelope: current.envelope });
  return current;
}
async function invoke(branch, credentials, key, select, parameters, kind = 'parameterized') {
  const result = await branch.native.commit({ roomId: roomId(branch.id), credential: credentials.player1,
    operationKey: key, select, parameters, kind });
  await checkpoint(branch);
  return result;
}
async function savePrefixes(branch) {
  const bundle = await branch.native.store.loadReplayBundle(roomId(branch.id));
  const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
    .map(row => row.payload.payload.receipt);
  for (let revision = 0; revision <= receipts.length; revision++) {
    if (await cached(branch.id + '/checkpoint-r' + revision + '.json')) continue;
    const replayed = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, revision) });
    assert.equal(replayed.ok, true, JSON.stringify(replayed));
    await save(branch.id + '/checkpoint-r' + revision + '.json', { envelope: replayed.envelope });
  }
}
async function rangedBatch(branch, credentials, actor, target, weapon, key) {
  const result = await commitWave3RangedBatchV1({ directory: path.join(directory, branch.id),
    native: branch.native, runtime: branch.runtime, roomId: roomId(branch.id), credentials,
    attackerSideKey: 'player1', attackerPieceId: actor, targetPieceId: target, weaponName: weapon,
    operationKey: key, selectPoolParameters: poolParameters });
  await checkpoint(branch);
  return result;
}
async function replay(branch) {
  await branch.native.restoreDependencies(roomId(branch.id), branch.authority);
  const before = await branch.native.store.loadRoom(roomId(branch.id));
  const bundle = await branch.native.store.loadReplayBundle(roomId(branch.id));
  const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
    .map(row => row.payload.payload.receipt);
  for (let revision = 0; revision <= receipts.length; revision++) {
    const expected = (await read(output + branch.id + '/checkpoint-r' + revision + '.json')).envelope;
    const result = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, revision) });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.deepEqual(result.envelope, expected);
  }
  assert.deepEqual(await branch.native.store.loadRoom(roomId(branch.id)), before);
  return { id: branch.id, receipts: receipts.length, checkpoints: receipts.length + 1, exact: true };
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs',
    factoryExport: 'createOfficialReleaseRosterStateV2', sourceRef,
    contractVersion: 'T28-W3-08-Mark-for-Death-first-weapon-each-attack-v1',
  }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      const scene = await makeScene(context, 'source');
      const runtime = runtimeFor(context, scene.state);
      const route = runtime.bundle.routes.find(row => row.definitionId === definitionId);
      assert(route); assert.equal(route.phase, 'movement');
      assert.equal(route.criticalHit, 1); assert.equal(route.precision, 1);
      assert.equal(route.expiresAt, 'cleanup_and_refresh');
      for (const [options, expectedError] of [
        [{ includeRanged: false, includePrecisionChoices: false, includeArmourChoices: false }, /MARK_FOR_DEATH_ALL_WEAPONS_CONSUMER_REQUIRED/],
        [{ includeMelee: false }, /CHARACTERISTIC_MELEE_WEAPON_CONSUMER_REQUIRED/],
        [{ includePrecisionChoices: false, includeArmourChoices: false }, /MARK_FOR_DEATH_ALL_WEAPONS_CONSUMER_REQUIRED/],
      ]) {
        assert.throws(() => runtimeFor(context, scene.state, options), expectedError);
      }
      const domain = runtime.enumerate(scene.state).parameterDomains.find(row => row.definitionId === definitionId && row.pieceId === 'nova');
      assert(domain);
      const query = runtime.query(scene.state, { queryKind: 'instantiate_parameterized_action',
        domainId: domain.sourceDomain.domainId, parameters: markParameters(domain) });
      assert.deepEqual(query.result.action, runtime.instantiate(scene.state, domain, markParameters(domain)).action.sourceAction);
      assert.throws(() => runtime.instantiate(scene.state, domain,
        { ...markParameters(domain), targetUnitId: 'marine' }), /TARGET|PARAMETER/);
      for (const reason of ['phase', 'card', 'reserves']) {
        const invalid = structuredClone(scene.state);
        if (reason === 'phase') invalid.phase = 'assault';
        if (reason === 'card') for (const card of invalid.cardResources.player1) card.readiness = 'exhausted';
        if (reason === 'reserves') {
          pieceOf(invalid, 'nova').isOnField = false; pieceOf(invalid, 'nova').isInReserves = true;
          for (const model of pieceOf(invalid, 'nova').models) model.isOnField = false;
        }
        assert(!runtime.enumerate(invalid).parameterDomains.some(row => row.definitionId === definitionId
          && row.pieceId === 'nova'), reason);
      }
      const blocked = structuredClone(scene.state);
      addWall(blocked, 13);
      const blockedDomain = runtime.enumerate(blocked).parameterDomains.find(row => row.definitionId === definitionId && row.pieceId === 'nova');
      assert(!blockedDomain || !blockedDomain.sourceDomain.parameterSchema.targetUnitId.enum.includes('marked'));
      await registerScene(context, 'source', scene);
      const ref = await save('compile.json', { route, query, source: context.dataset.recordsByKey['tactical_cards:nova_covert_ops'],
        consumerGuardsVerified: true, invalidSourceAndTargetVerified: true, fullBaseLosVerified: true });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const branch = await product.branch('source');
      try {
        const credentials = await branch.native.create(roomId(branch.id), branch.authority);
        await checkpoint(branch);
        await invoke(branch, credentials, 'mark', row => row.definitionId === definitionId && row.pieceId === 'nova', markParameters);
        const marked = await checkpoint(branch);
        const state = marked.envelope.state;
        const effect = pieceOf(state, 'marked').officialAbilityEffects.find(row => row.sourceDefinitionId === definitionId);
        assert.equal(effect.criticalHit, 1); assert.equal(effect.precision, 1);
        assert.equal(state.cardResources.player1.find(row => row.officialCardRecordKey === 'tactical_cards:nova_covert_ops').readiness, 'exhausted');
        assert(!branch.runtime.enumerate(state).parameterDomains.some(row => row.definitionId === definitionId));
        await invoke(branch, credentials, 'finish', row => row.actionType === 'finish_activation' && row.pieceId === 'nova', () => ({}));
        const final = await checkpoint(branch);
        for (const id of ids.filter(id => id !== 'source')) {
          const scene = await makeScene(branch.context, id, final.envelope.state);
          const kind = id === 'melee' ? 'close_combat' : 'ranged';
          const actor = id === 'melee' ? 'nova' : 'goliath';
          const weapon = id === 'melee' ? 'Monomolecular Blade' : 'Autocannon';
          const runtime = runtimeFor(branch.context, scene.state);
          const modifiers = projection(runtime, scene.state, actor, 'marked', kind, weapon);
          assert.equal(modifiers.criticalHit, 1); assert.equal(modifiers.precision, 1);
          assert.equal(projection(runtime, scene.state, actor, 'unmarked', kind, weapon).criticalHit, 0);
          const duplicated = structuredClone(scene.state);
          const target = pieceOf(duplicated, 'marked');
          target.officialAbilityEffects.push(structuredClone(target.officialAbilityEffects.find(row => row.sourceDefinitionId === definitionId)));
          assert.equal(projection(runtime, duplicated, actor, 'marked', kind, weapon).criticalHit, 1);
          assert.equal(projection(runtime, duplicated, actor, 'marked', kind, weapon).precision, 1);
          const lostSource = structuredClone(scene.state);
          Object.assign(pieceOf(lostSource, 'nova'), { isDestroyed: true, isOnField: false,
            isInReserves: false, currentModels: 0, currentSupply: 0 });
          for (const model of pieceOf(lostSource, 'nova').models) Object.assign(model,
            { isDestroyed: true, isOnField: false, remainingWounds: 0 });
          assert.equal(projection(runtime, lostSource, 'goliath', 'marked', 'ranged').criticalHit, 1);
          const end = runtime.lifecycle(scene.state, { eventKind: 'round_end' });
          assert.equal(projection(runtime, end.state, actor, 'marked', kind, weapon).criticalHit, 1);
          const cleaned = runtime.lifecycle(scene.state, { eventKind: 'cleanup_and_refresh' });
          assert.equal(projection(runtime, cleaned.state, actor, 'marked', kind, weapon).criticalHit, 0);
          assert(!pieceOf(cleaned.state, 'marked').officialAbilityEffects.some(row => row.sourceDefinitionId === definitionId));
          assert(!cleaned.state.board.effectMarkers.some(row => row.sourceDefinitionId === definitionId));
          await registerScene(branch.context, id, scene);
        }
        const ref = await save('consume.json', { markEffect: effect, revision: final.stateRevision,
          sourceCardExhausted: true, markSurvivesSourceLoss: true, defaultCleanupVerified: true,
          declaredPhaseBranches: ids.filter(id => id !== 'source'), modelCalls: 0 });
        return { evidenceRef: ref, checkpointRef: ref };
      } finally { branch.close(); }
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const id of ids.filter(id => id !== 'source')) {
        const saved = await cached(id + '/completed.json');
        if (saved) { cases.push(saved); continue; }
        const branch = await product.branch(id);
        try {
          const credentials = await branch.native.create(roomId(id), branch.authority);
          await checkpoint(branch);
          if (id === 'melee') {
            const before = branch.authority.state;
            const domain = branch.runtime.enumerate(before).parameterDomains.find(row => row.actionType === 'fight' && row.pieceId === 'nova');
            assert(domain);
            const source = domain.sourceDomain;
            const attackDice = source.constraints.declineCloseRanksAttackDice;
            const parameters = { closeRanksMode: 'decline', allocations: [{ targetUnitId: 'marked', dice: attackDice }],
              surgeTargetUnitId: 'marked', criticalTargetUnitId: 'marked' };
            const action = branch.runtime.instantiate(before, domain, parameters).action;
            const fightPlan = declaredAttack(action, 'fight').meleePlan.fightChancePlan;
            assert.equal(fightPlan.activePrecisionValue, 1);
            assert.equal(fightPlan.criticalTargetUnitId, 'marked');
            await save(id + '/declared-fight.json', action);
            await invoke(branch, credentials, 'fight', row => row.domainId === domain.domainId, () => parameters);
            await completeWave3MeleePoolsV1({ directory: path.join(directory, id), native: branch.native,
              runtime: branch.runtime, roomId: roomId(id), credentials, operationPrefix: 'melee-pool', selectPoolParameters: poolParameters });
            await checkpoint(branch);
          } else {
            const firstTarget = id === 'first-marked' ? 'marked' : 'unmarked';
            const shot = await rangedBatch(branch, credentials, 'goliath', firstTarget, 'Autocannon', 'first');
            const expected = id === 'first-marked' ? 1 : 0;
            const firstPlan = declaredAttack(shot.query.result.action, 'ranged_attack').rangedPlan;
            assert.equal(firstPlan.activeCriticalHitValue, expected);
            assert.equal(firstPlan.activePrecisionValue, expected);
            const second = await rangedBatch(branch, credentials, 'goliath', 'marked', 'Underbelly Machine Gun', 'second');
            const secondPlan = declaredAttack(second.query.result.action, 'ranged_attack').rangedPlan;
            assert.equal(secondPlan.activeCriticalHitValue, 0);
            assert.equal(secondPlan.activePrecisionValue, 0);
            const between = second.before.envelope.state;
            assert.equal(projection(branch.runtime, between, 'goliath', 'marked', 'ranged', 'Underbelly Machine Gun').criticalHit, 0);
            assert.equal(projection(branch.runtime, between, 'marine', 'marked', 'ranged', 'C-14 rifle').criticalHit, 1);
            if (second.after.envelope.state.pendingCurrentProductRangedSequence?.pieceId === 'goliath') {
              await invoke(branch, credentials, 'finish-ranged', row => row.action.actionType === 'finish_ranged_attack_sequence', null, 'finite');
            }
            await invoke(branch, credentials, 'finish-goliath', row => row.actionType === 'finish_activation'
              && row.pieceId === 'goliath', () => ({}));
            if (id === 'first-unmarked') {
              const other = await rangedBatch(branch, credentials, 'marine', 'marked', 'C-14 rifle', 'other-friendly');
              const otherPlan = declaredAttack(other.query.result.action, 'ranged_attack').rangedPlan;
              assert.equal(otherPlan.activeCriticalHitValue, 1);
              assert.equal(otherPlan.activePrecisionValue, 1);
            }
          }
          await savePrefixes(branch);
          const final = await checkpoint(branch);
          assert(!branch.runtime.precisionChoices?.hasPending(final.envelope.state));
          assert(!branch.runtime.meleeChoices?.hasPending(final.envelope.state));
          const value = { id, revision: final.stateRevision, events: final.envelope.state.log.flatMap(row => row.events || [])
            .filter(row => ['ranged_attack', 'close_combat_attack'].includes(row.type)), queryApplyEqual: true, modelCalls: 0 };
          await save(id + '/completed.json', value); cases.push(value);
        } finally { branch.close(); }
      }
      const ref = await save('successor.json', cases);
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const current = [];
      for (const id of ids) {
        const branch = await product.branch(id);
        try { current.push(await replay(branch)); }
        finally { branch.close(); }
      }
      const oldProduct = await openOverwatchProduct();
      const legacy = [];
      try {
        for (const id of ['use', 'skip']) {
          const file = path.join(root, 'build/ticket-28-terran-wave3-20261117-v1/auto-turret-overwatch', id, 'room.sqlite');
          const hash = async () => createHash('sha256').update(await fs.readFile(file)).digest('hex');
          const beforeHash = await hash();
          const branch = await oldProduct.branch(id);
          try {
            const oldId = 'wave3-auto-turret-overwatch-' + id;
            await branch.native.restoreDependencies(oldId, branch.authority);
            const bundle = await branch.native.store.loadReplayBundle(oldId);
            const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
              .map(row => row.payload.payload.receipt);
            for (let revision = 0; revision <= receipts.length; revision++) {
              const expected = await read('build/ticket-28-terran-wave3-20261117-v1/auto-turret-overwatch/' + id
                + '/checkpoint-r' + revision + '.json');
              const result = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, revision) });
              assert.equal(result.ok, true, JSON.stringify(result)); assert.deepEqual(result.envelope, expected.envelope);
            }
            legacy.push({ id, runtimeVersion: branch.runtime.descriptor.runtimeVersion,
              receipts: receipts.length, checkpoints: receipts.length + 1, exact: true });
          } finally { branch.close(); }
          assert.equal(await hash(), beforeHash);
        }
      } finally { oldProduct.close(); }
      const ref = await save('cold-recovery.json', { current, legacy, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify(result));
}
export { openProduct, sourceProduct, runtimeFor };
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
