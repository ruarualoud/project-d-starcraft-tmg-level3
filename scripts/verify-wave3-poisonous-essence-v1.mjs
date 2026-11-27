import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';
import { root, arrange } from './verify-wave3-lethal-hologram-v1.mjs';
import { sourceProduct } from './verify-wave3-gestate-dark-swarm-v1.mjs';
import { sceneFor } from './verify-wave3-plague-cast-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, declareWave3EngineeringCoherencyV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const prefix = 'build/ticket-28-zerg-wave3-20261118-v1/poisonous-essence/';
const directory = path.join(root, prefix), sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const definitionId = 'card:defiler_mound/poisonous-essence-any@1';
const phaseEndIds = ['engaged', 'departed', 'shield-equal', 'shield-overflow'];
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const piece = (state, id) => state.pieces.find(row => row.id === id);
const roomId = id => 'wave3-poisonous-essence-' + id, releaseId = id => roomId(id) + '-v1';
const runtimeFor = (context, state) => createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
  definitionIds: [definitionId], includeMelee: true, includeRanged: true, includePrecisionChoices: true, includeArmourChoices: true });
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n'); return prefix + name;
}
async function cached(name) {
  try { return await read(prefix + name); } catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
function registry() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'releases.sqlite') });
  return { resolver: createOfficialReleaseResolverV2({ store, loadArtifact: read }), close: () => store.close() };
}
async function makeScene(context, shieldedPriorDamage = null) {
  const environment = (await sceneFor(context)).state;
  const unit = (unitInstanceId, key) => ({ unitInstanceId, recordKey: 'army_units:' + key, compositionKind: 'small', upgrades: [] });
  const setup = createOfficialReleaseRosterStateV2({ context, includeMelee: true, includeConsumePaymentQuotes: true,
    characteristicDefinitionIds: [definitionId], includeCharacteristicConsumers: true,
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json'))
      .state.officialRosterDisclosureDataBundle, candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:zagara_s_swarm', tacticalCardRecordKeys: ['tactical_cards:accelerating_creep', 'tactical_cards:defiler_mound'],
        units: [unit('marked', 'defiler'), unit('friend', 'defiler')] },
      player2: shieldedPriorDamage === null
        ? { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
          factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: ['tactical_cards:armory'],
          units: [unit('bio', 'marine'), unit('mechanical', 'goliath'), unit('far-bio', 'marine')] }
        : { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
          factionRecordKey: 'tactical_cards:nerazim', tacticalCardRecordKeys: ['tactical_cards:robotics_facility'],
          units: [unit('bio', 'nerazim_watchers__adept_')] },
    } });
  const fields = ['board', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle', 'officialMissionRuntimeDescriptor',
    'officialMissionSupplyProfile', 'supplyLossLedger', 'engagementScale', 'armyBuildingEngagementScale',
    'officialDeploymentGeometryBinding', 'officialBattlefieldTokenMarkerRulesDataBundle', 'officialBattlefieldTokenMarkerRegistry'];
  let state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(environment[key])])), ...setup.state,
    round: 1, phase: 'movement', activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
    phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player1' } } };
  arrange(piece(state, 'marked'), 20, 26); arrange(piece(state, 'friend'), 16.5, 26);
  if (shieldedPriorDamage === null) {
    arrange(piece(state, 'mechanical'), 20, 22.5); arrange(piece(state, 'far-bio'), 40, 26);
  }
  const target = piece(state, 'bio'); arrange(target, 22.5, 26);
  const step = target.models[0].baseWidthInches + 0.1;
  const offsets = shieldedPriorDamage === null
    ? [[1, 0], [0, 0], [2, 0], [0, 1], [1, 1], [2, 1]]
    : [[0, 0], [1, 0], [0.5, Math.sqrt(3) / 2], [0.5, -Math.sqrt(3) / 2]];
  const anchorX = shieldedPriorDamage === null ? 22.5
    : 20 + (piece(state, 'marked').models[0].baseWidthInches + target.models[0].baseWidthInches) / 2 + 0.4;
  target.models.forEach((model, index) => Object.assign(model, { xInches: anchorX + offsets[index][0] * step,
    yInches: 26 + offsets[index][1] * step }));
  target.damageMarker = shieldedPriorDamage === null ? 2 : shieldedPriorDamage;
  declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'hologram-declared-' });
  state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
  state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
    missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtimeFor(context, state).descriptor.runtimeHash });
  return { state, scenario: { declaredMovementEntryAndEngagementGeometry: true, priorNonLethalMarkerDeclared: target.damageMarker,
    shieldedProducedByRosterFactory: shieldedPriorDamage !== null,
    partialLegalRosters: true, fullRound: false, fullMatch: false, modelCalls: 0 } };
}
async function registerScene(context, id, scene) {
  if (await cached(id + '/authority.json')) return;
  const runtime = runtimeFor(context, scene.state); assert.equal(runtime.descriptor.runtimeVersion, '3.124.0');
  const runtimeRef = await save(id + '/runtime.json', runtime.descriptor), product = registry(), m = context.manifest;
  try {
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset, snapshot: context.snapshot,
      sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef, snapshotRef: m.source.snapshotRef,
      sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references, sourcePolicy: m.source.policy,
      components: { ...m.components, rulesRuntime: { ref: runtimeRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const bound = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    await save(id + '/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: bound, ...scene }));
  } finally { product.close(); }
}
function openProduct() {
  const product = registry();
  return { ...product, async branch(id) {
    const authority = await read(prefix + id + '/authority.json');
    const context = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state); assert.deepEqual(runtime.descriptor, await read(prefix + id + '/runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory: path.join(directory, id), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { id, authority, context, runtime, native, roomId: roomId(id), close: () => native.close() };
  } };
}
async function checkpoint(branch) {
  const current = await branch.native.store.loadRoom(branch.roomId), name = branch.id + '/checkpoint-r' + current.stateRevision + '.json';
  const old = await cached(name);
  if (old) assert.deepEqual(old.envelope, current.envelope); else await save(name, { envelope: current.envelope });
  return current;
}
async function invoke(branch, credentials, operationKey, choice, parameters, kind) {
  // This gate's source and phase-end operations are all owned by player1.
  // Retries must retain the original grant even after activation alternates.
  const sideKey = 'player1';
  const result = await branch.native.commit({ roomId: branch.roomId, credential: credentials[sideKey], operationKey, choice, parameters, kind });
  await checkpoint(branch); return result;
}
async function produceMark(product, sourceId = 'source') {
  const branch = await product.branch(sourceId);
  try {
    const credentials = await branch.native.create(branch.roomId, branch.authority); await checkpoint(branch);
    const before = (await read(prefix + sourceId + '/checkpoint-r0.json')).envelope.state;
    const domain = branch.runtime.enumerate(before).parameterDomains.find(row => row.definitionId === definitionId && row.pieceId === 'marked');
    assert(domain); assert.equal(domain.sourceDomain.constraints.resourceType, null);
    assert.throws(() => branch.runtime.instantiate(before, domain,
      { activeUnitId: 'marked', paymentCardInstanceIds: [], sacrificePieceId: 'friend' }), /CHARACTERISTIC_COMPONENT_SEMANTIC_PARAMETERS_REQUIRED/);
    assert.throws(() => branch.runtime.query(before, { queryKind: 'consume_payment_options', sourcePieceId: 'marked',
      abilityDefinitionId: definitionId }), /CONSUME_PAYMENT_ABILITY_NOT_SELECTED/);
    await invoke(branch, credentials, 'mark', { actionType: 'resolve_characteristic_status_ability', definitionId, pieceId: 'marked' },
      () => ({ activeUnitId: 'marked', paymentCardInstanceIds: [] }));
    const marked = (await read(prefix + sourceId + '/checkpoint-r1.json')).envelope.state;
    const card = marked.cardResources.player1.find(row => row.officialCardRecordKey === 'tactical_cards:defiler_mound');
    assert.equal(card.readiness, 'exhausted'); assert.equal(marked.officialConsumePaymentHistory, undefined);
    assert.equal(piece(marked, 'friend').currentModels, piece(before, 'friend').currentModels);
    assert(piece(marked, 'marked').statuses.some(row => row.sourceDefinitionId === definitionId && row.statusKind === 'faction_indicator'));
    assert(!branch.runtime.enumerate(marked).parameterDomains.some(row => row.definitionId === definitionId));
    await invoke(branch, credentials, 'finish-marking', { actionType: 'finish_activation', pieceId: 'marked' }, () => ({}));
    const after = await checkpoint(branch); assert.equal(after.envelope.state.activeSideKey, 'player2');
    const childIds = sourceId === 'source' ? ['engaged', 'departed'] : [sourceId.replace(/-source$/u, '')];
    for (const id of childIds) {
      if (await cached(id + '/authority.json')) continue;
      const state = structuredClone(after.envelope.state);
      Object.assign(state, { phase: 'assault', activeSideKey: 'player1' });
      state.phaseFirstActorByRound['1:assault'] = { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player1' };
      for (const side of ['player1', 'player2']) state.players[side].passedPhases.assault = true;
      for (const actor of state.pieces) actor.activatedPhases.assault = true;
      if (id === 'departed') arrange(piece(state, 'bio'), 35, 26);
      declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'hologram-declared-' });
      await registerScene(branch.context, id, { state: refreshOfficialReleaseRosterDerivedStateV2({ context: branch.context, state }),
        scenario: { actualMarkAndExhaustedCardRetained: true, sourceCheckpointRef: prefix + sourceId + '/checkpoint-r2.json',
          declaredAssaultPhaseEnd: true, declaredEnemyDeparture: id === 'departed', fullRound: false, fullMatch: false, modelCalls: 0 } });
    }
    return { originalCardExhausted: true, consumeNotAllowed: true, actualMarkSaved: true,
      activationFinished: true, sourceCheckpointRef: prefix + sourceId + '/checkpoint-r2.json', modelCalls: 0 };
  } finally { branch.close(); }
}
async function resolveEnd(product, id) {
  const old = await cached(id + '/result.json'); if (old) return old;
  const branch = await product.branch(id);
  try {
    const credentials = await branch.native.create(branch.roomId, branch.authority); await checkpoint(branch);
    const current = await read(prefix + id + '/checkpoint-r0.json'), before = current.envelope.state;
    const stored = await branch.native.store.loadRoom(branch.roomId);
    const query = branch.runtime.query(before, { queryKind: 'poisonous_essence_phase_end' });
    assert.equal(query.canStart, true); assert.deepEqual(query.scope.groups[0].targetUnitIds, id === 'departed' ? [] : ['bio']);
    assert.deepEqual(await branch.native.store.loadRoom(branch.roomId), stored);
    const unpassed = structuredClone(before); unpassed.players.player2.passedPhases.assault = false;
    assert.equal(branch.runtime.query(unpassed, { queryKind: 'poisonous_essence_phase_end' }).canStart, false);
    assert.throws(() => branch.runtime.lifecycle(before, { eventKind: 'cleanup_and_refresh' }), /POISONOUS_ESSENCE_PHASE_END_CONTINUATION_REQUIRED/);
    const applied = await invoke(branch, credentials, 'end-effect',
      { actionType: 'resolve_poisonous_essence_phase_end' }, undefined, 'finite');
    assert.equal(applied.preview.core.chanceTicket, null);
    assert.equal(applied.preview.core.action.sourceAction.scopeHash, query.scope.scopeHash);
    const after = await checkpoint(branch), state = after.envelope.state;
    assert.equal(piece(state, 'bio').damageMarker, piece(before, 'bio').damageMarker + (id === 'departed' ? 0 : 2));
    for (const pid of before.pieces.map(row => row.id)) {
      assert.equal(piece(state, pid).currentModels, piece(before, pid).currentModels);
      assert.equal(piece(state, pid).currentSupply, piece(before, pid).currentSupply);
      assert.equal(piece(state, pid).isDestroyed, piece(before, pid).isDestroyed);
      if (pid !== 'bio') assert.equal(piece(state, pid).damageMarker, piece(before, pid).damageMarker);
    }
    assert.equal(state.poisonousEssencePhaseEndHistory.length, 1);
    assert.equal(branch.runtime.query(state, { queryKind: 'poisonous_essence_phase_end' }).canStart, false);
    assert.equal(piece(state, 'marked').statuses.filter(row => row.sourceDefinitionId === definitionId).length, 1);
    let shieldedAfter = null;
    if (id.startsWith('shield-')) {
      const hasShielded = actor => actor.statuses.some(row => String(typeof row === 'string'
        ? row : row.statusName || row.name).toLowerCase() === 'shielded');
      assert.equal(hasShielded(piece(before, 'bio')), true);
      assert.equal(piece(before, 'bio').officialUnitRecordKey, 'army_units:nerazim_watchers__adept_');
      shieldedAfter = hasShielded(piece(state, 'bio'));
      assert.equal(shieldedAfter, id === 'shield-equal');
      assert.equal(state.officialShieldedLifecycleHistory?.length || 0, id === 'shield-equal' ? 0 : 1);
      assert.equal(state.officialShieldedLifecycleHistory?.[0]?.reason,
        id === 'shield-equal' ? undefined : 'total_damage_exceeds_shield_value');
    }
    const result = { id, queryScopeEqualsNative: true, currentEngagementUsed: true, queryNoWrite: true,
      noDice: true, markerRetainedUntilCleanup: true, damageBefore: piece(before, 'bio').damageMarker,
      damageAfter: piece(state, 'bio').damageMarker, shieldedAfter, currentModels: piece(state, 'bio').currentModels,
      currentSupply: piece(state, 'bio').currentSupply, checkpointRef: prefix + id + '/checkpoint-r1.json', modelCalls: 0 };
    await save(id + '/result.json', result); return result;
  } finally { branch.close(); }
}
async function verifyCleanup(product, id) {
  const branch = await product.branch(id);
  try {
    await branch.native.restoreDependencies(branch.roomId, branch.authority);
    const current = await branch.native.store.loadRoom(branch.roomId), state = current.envelope.state;
    const cleaned = branch.runtime.lifecycle(state, { eventKind: 'cleanup_and_refresh' });
    assert(!piece(cleaned.state, 'marked').statuses.some(row => row.sourceDefinitionId === definitionId));
    assert(!cleaned.state.board.effectMarkers.some(row => row.sourceDefinitionId === definitionId));
    assert.equal(piece(cleaned.state, 'bio').damageMarker, piece(state, 'bio').damageMarker);
    assert.equal(branch.runtime.query(cleaned.state, { queryKind: 'poisonous_essence_phase_end' }).canStart, false);
    assert.deepEqual(await branch.native.store.loadRoom(branch.roomId), current);
    const ref = await save(id + '/cleanup-projection.json', { state: cleaned.state,
      actualProductLifecycle: true, newNativePhaseTransitionClaimed: false, originalRoomUnchanged: true });
    return { id, cleanupRef: ref, effectClosed: true, exactDamagePreserved: true, modelCalls: 0 };
  } finally { branch.close(); }
}
async function replay(native, rid, sourcePrefix) {
  const bundle = await native.store.loadReplayBundle(rid);
  const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let index = 0; index <= receipts.length; index++) {
    const result = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, index) });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.deepEqual(result.envelope, (await read(sourcePrefix + 'checkpoint-r' + index + '.json')).envelope);
  }
  return { receipts: receipts.length, checkpoints: receipts.length + 1, exact: true };
}
async function legacy(product, spec) {
  const authority = await read(spec.prefix + spec.id + '/authority.json');
  let manifest = authority.dependencies.dataSnapshot.content.releaseManifest;
  if (!manifest) {
    const db = new DatabaseSync(path.join(root, spec.prefix, 'releases.sqlite'), { readOnly: true });
    try { manifest = JSON.parse(db.prepare('SELECT manifest_json FROM sc_official_releases WHERE release_id = ?').get(authority.releaseId).manifest_json); }
    finally { db.close(); }
  }
  product.resolver.register(manifest);
  const context = await product.resolver.resolve({ releaseId: authority.releaseId, purpose: 'area_ability_component' });
  const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state, ...spec.options });
  assert.deepEqual(runtime.descriptor, await read(spec.prefix + spec.id + '/runtime.json'));
  const original = path.join(root, spec.prefix, spec.id, 'room.sqlite'), bytes = await fs.readFile(original);
  const local = path.join(directory, 'legacy-' + spec.id); await fs.mkdir(local, { recursive: true });
  try { await fs.copyFile(original, path.join(local, 'room.sqlite'), fs.constants.COPYFILE_EXCL); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  const native = openWave3EngineeringRoomV1({ directory: local, filename: 'room.sqlite',
    rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
  try {
    await native.restoreDependencies(spec.roomId, authority);
    const result = await replay(native, spec.roomId, spec.prefix + spec.id + '/');
    assert.equal(createHash('sha256').update(await fs.readFile(original)).digest('hex'), createHash('sha256').update(bytes).digest('hex'));
    return { id: spec.id, ...result, originalHashUnchanged: true };
  } finally { native.close(); }
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
    sourceRef, contractVersion: 'T28-W3-09-Poisonous-Essence-v1' }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      const scene = await makeScene(context), runtime = runtimeFor(context, scene.state);
      const definition = runtime.catalogue.definitions.find(row => row.definitionId === definitionId);
      assert.equal(definition.execution.status, 'executable_exact');
      const route = runtime.bundle.routes.find(row => row.definitionId === definitionId);
      assert.equal(route.resourceType, null); assert.equal(route.resourceCost, 0);
      assert.equal(scene.state.officialPoisonousEssencePolicy.consumeAlternativeAllowed, false);
      const invalid = structuredClone(scene.state); delete invalid.officialPoisonousEssencePolicy;
      assert.throws(() => runtimeFor(context, invalid), /POISONOUS_ESSENCE_POLICY_MISMATCH/);
      await registerScene(context, 'source', scene);
      const ref = await save('compile.json', { definition, route, actualRosterFactory: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: prefix + 'source/authority.json' };
    } },
    { name: 'consume', repairRef, openProduct, check: async (product, _passed, { saveCheckpoint }) => {
      const source = await produceMark(product), cases = [], shieldSources = [];
      await saveCheckpoint(source.sourceCheckpointRef, 'mark_and_activation_finished');
      for (const [id, priorDamage] of [['shield-equal', 0], ['shield-overflow', 1]]) {
        if (!await cached(id + '-source/authority.json')) {
          const context = await sourceProduct(), scene = await makeScene(context, priorDamage);
          assert(scene.state.officialShieldedLifecyclePolicy, 'new factory must bind the shield-dependent cleanup consumer');
          await registerScene(context, id + '-source', scene);
        }
        const shieldSource = await produceMark(product, id + '-source');
        shieldSources.push(shieldSource);
        await saveCheckpoint(shieldSource.sourceCheckpointRef, id + '-mark-and-activation');
      }
      for (const id of phaseEndIds) {
        const result = await resolveEnd(product, id);
        cases.push(result);
        await saveCheckpoint(result.checkpointRef, id);
      }
      const ref = await save('consume.json', { source, shieldSources, cases, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: cases.at(-1).checkpointRef };
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const cases = []; for (const id of phaseEndIds) cases.push(await verifyCleanup(product, id));
      const ref = await save('successor.json', { cases, fullMatchSchedulerVerified: false, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const current = [], prior = [];
      for (const id of ['source', 'shield-equal-source', 'shield-overflow-source', ...phaseEndIds]) {
        const branch = await product.branch(id);
        try { await branch.native.restoreDependencies(branch.roomId, branch.authority);
          current.push({ id, ...await replay(branch.native, branch.roomId, prefix + id + '/') }); }
        finally { branch.close(); }
      }
      for (const spec of [
        { prefix: 'build/ticket-28-zerg-wave3-20261118-v1/defiler-sidearm/', id: 'claws-first',
          roomId: 'wave3-defiler-sidearm-claws-first', options: { definitionIds: [], includeMelee: true,
            includeRanged: true, includePrecisionChoices: true, includeArmourChoices: true } },
        { prefix: 'build/ticket-28-zerg-wave3-20261118-v1/plague-hidden-reactions/', id: 'hidden-source',
          roomId: 'wave3-plague-hidden-hidden-source', options: { definitionIds: ['unit:nerazim_watchers__adept_/path-of-shadows-any-phase@1'],
            includeRanged: true, includePrecisionChoices: true, includeArmourChoices: true } },
      ]) prior.push(await legacy(product, spec));
      const ref = await save('cold-recovery.json', { current, legacy: prior, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ status: gate.status, passed: Object.keys(gate.passed), failures: gate.failures.length, modelCalls: 0 }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.stack); process.exitCode = 1; });
}
