import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
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
import { createOfficialSpecialUnitPieceV1 } from '../packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs';
import { OFFICIAL_SABOTAGE_DRONE_PHASE_END_DEFINITION_ID as definitionId }
  from '../packages/product-composition/official-sabotage-drone-phase-end-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const output = 'build/ticket-28-terran-wave3-20261117-v1/sabotage-drone-phase-end/';
const directory = path.join(root, output);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const roomId = id => 'wave3-sabotage-drone-' + id;
const releaseId = id => roomId(id) + '-v1';
const pieceOf = (state, id) => state.pieces.find(piece => piece.id === id);
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
async function save(name, value) {
  const ref = output + name;
  await atomicWrite(path.join(root, ref), JSON.stringify(value, null, 2) + '\n'); return ref;
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
    const manifest = await read(sourceRef); product.resolver.register(manifest);
    return await product.resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' });
  } finally { product.close(); }
}
function runtimeFor(context, state) {
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
    definitionIds: [definitionId], includeHits: true, includeMelee: true });
}
function arrangeMarine(piece, x, y) {
  arrange(piece, x, y);
  piece.models.forEach((model, index) => Object.assign(model, {
    xInches: x + index % 3 * (model.baseWidthInches + 0.02),
    yInches: y + Math.floor(index / 3) * (model.baseDepthInches + 0.02) }));
}
function candidate(sideKey, dual) {
  return { sideKey, scaleId: 'Standard', mineralBudget: 2000,
    factionRecordKey: dual || sideKey === 'player1' ? 'tactical_cards:nova_covert_ops' : 'tactical_cards:zerg_swarm',
    tacticalCardRecordKeys: !dual && sideKey === 'player2' ? ['tactical_cards:accelerating_creep'] : [],
    units: dual || sideKey === 'player1' ? [
      { unitInstanceId: sideKey + '-nova', recordKey: 'army_units:nova_assault_mode', compositionKind: 'small', upgrades: [] },
      { unitInstanceId: sideKey + '-marine', recordKey: 'army_units:marine', compositionKind: 'small', upgrades: [] },
    ] : [{ unitInstanceId: 'bile-launcher', recordKey: 'army_units:bile_launcher', compositionKind: 'small', upgrades: [] }] };
}
async function sceneFor(context, id) {
  const original = (await read('build/ticket-28-terran-wave3-20261117-v1/griffin-support/native/checkpoint-r5.json')).envelope.state;
  const dual = id === 'priority';
  const setup = createOfficialReleaseRosterStateV2({ context, characteristicDefinitionIds: [definitionId], includeMelee: true,
    additionalGeneratedUnitRecordKeys: dual ? [] : ['army_units:omega_worm', 'army_units:holo_decoy'],
    includeHoloDecoyRules: !dual,
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json'))
      .state.officialRosterDisclosureDataBundle,
    candidatesBySide: { player1: candidate('player1', dual), player2: candidate('player2', dual) } });
  const fields = ['board', 'officialDeploymentGeometryBinding', 'engagementScale', 'armyBuildingEngagementScale',
    'officialMissionRuntimeDescriptor', 'supplyLossLedger', 'officialModelGapTransitPolicy', 'officialMissionSupplyProfile'];
  const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(original[key])])), ...setup.state,
    round: 1, phase: 'assault', activeSideKey: 'player1', firstPlayerSideKey: 'player2', log: [],
    phaseFirstActorByRound: { '1:assault': { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player2' } } };
  state.board.tokens = []; state.board.markers = []; state.board.effectMarkers = [];
  for (const side of ['player1', 'player2']) state.players[side].passedPhases.assault = true;
  for (const piece of state.pieces) {
    if (piece.officialUnitRecordKey === 'army_units:marine') {
      arrangeMarine(piece, piece.sideKey === 'player1' ? dual ? 8 : 16 : 44, dual ? 30 : 12);
    } else arrange(piece, piece.id === 'bile-launcher' ? 20 : piece.sideKey === 'player1' ? 8 : 46,
      piece.id === 'bile-launcher' ? 19 : 5);
    piece.activatedPhases.assault = true;
  }
  const drone = createOfficialSpecialUnitPieceV1(state, 'player1', 'army_units:sabotage_drone', 'drone-a');
  arrange(drone, dual ? 18 : 20, 15); state.pieces.push(drone);
  if (dual) {
    const enemy = createOfficialSpecialUnitPieceV1(state, 'player2', 'army_units:sabotage_drone', 'drone-b');
    arrange(enemy, 32, 15); state.pieces.push(enemy);
  } else {
    const worm = createOfficialSpecialUnitPieceV1(state, 'player1', 'army_units:omega_worm', 'worm');
    arrange(worm, 24, 15); state.pieces.push(worm);
    const holo = createOfficialSpecialUnitPieceV1(state, 'player1', 'army_units:holo_decoy', 'holo');
    arrange(holo, 18, 16); state.pieces.push(holo);
  }
  const coherency = declareCoherency(state);
  return { state: refreshOfficialReleaseRosterDerivedStateV2({ context, state }), scenario: {
    scale: 'Standard2000-budget partial legal rosters', phaseAndPositionsDeclared: true, generatedEntitiesDeclaredFromFormalFactory: true,
    coherency, bothPlayersPassedAssault: true, activePlayerOppositeFirstPlayerMarker: true,
    fullRound: false, fullMatch: false, modelCalls: 0 } };
}
async function registerScene(context, id, scene) {
  const runtime = runtimeFor(context, scene.state); assert.equal(runtime.descriptor.runtimeVersion, '3.91.0');
  const runtimeRef = await save(id + '/runtime.json', runtime.descriptor);
  const product = registry();
  try {
    const manifest = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset,
      snapshot: context.snapshot, sourceRevision: await read(manifest.source.sourceRevisionRef),
      datasetRef: manifest.source.datasetRef, snapshotRef: manifest.source.snapshotRef,
      sourceRevisionRef: manifest.source.sourceRevisionRef, referenceSources: manifest.source.references,
      sourcePolicy: manifest.source.policy, components: { ...manifest.components,
        rulesRuntime: { ref: runtimeRef, version: runtime.descriptor.runtimeVersion,
          integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: resolved, ...scene });
    const old = await cached(id + '/authority.json');
    if (old) assert.deepEqual(old, authority); else await save(id + '/authority.json', authority);
  } finally { product.close(); }
}
function openProduct() {
  const product = registry();
  return { ...product, async branch(id) {
    const authority = await read(output + id + '/authority.json');
    const context = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(output + id + '/runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory: path.join(directory, id), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { id, authority, context, runtime, native, close: () => native.close() };
  } };
}
async function checkpoint(branch) {
  const current = await branch.native.store.loadRoom(roomId(branch.id));
  const ref = branch.id + '/checkpoint-r' + current.stateRevision + '.json'; const old = await cached(ref);
  if (old) assert.deepEqual(old.envelope, current.envelope); else await save(ref, { envelope: current.envelope });
  return current;
}
function semanticChoice(runtime, state) {
  const menu = runtime.enumerate(state); const domain = menu.parameterDomains[0];
  if (domain) return { domain, parameters: poolParameters(domain) };
  assert.equal(menu.candidates.length, 1, 'expected unique automatic continuation');
  return { finite: menu.candidates[0] };
}
async function commitNext(branch, credentials) {
  const current = await checkpoint(branch); const state = current.envelope.state;
  const choice = semanticChoice(branch.runtime, state);
  const result = await branch.native.commit({ roomId: roomId(branch.id), credential: credentials[state.activeSideKey],
    operationKey: 'resolve-r' + current.stateRevision,
    ...(choice.domain ? { select: row => row.domainId === choice.domain.domainId, parameters: () => choice.parameters }
      : { kind: 'finite', select: row => row.action.actionType === choice.finite.actionType }) });
  await checkpoint(branch);
  const chance = result.preview.core.action.chance;
  if (chance) {
    assert.equal(chance.layout.hit || 0, 0); assert.equal(chance.layout.surge || 0, 0);
    assert.equal(chance.layout.armour, 5);
  }
  return result;
}
function fixedWalk(runtime, initial, roll) {
  let state = structuredClone(initial); const events = [];
  for (let step = 0; step < 100; step++) {
    if (state.pendingSabotageDronePhaseEnd?.stage === 'complete') return { state, events };
    const choice = semanticChoice(runtime, state);
    const action = choice.domain ? runtime.instantiate(state, choice.domain, choice.parameters).action
      : Object.fromEntries(Object.entries(choice.finite).filter(([key]) => !['isEnabled', 'disabledReason', 'score', 'details'].includes(key)));
    const result = runtime.apply(state, action, { chanceReveals: Array(action.chance?.count || 0).fill(roll) });
    state = result.state; events.push(...result.events);
  }
  assert.fail('finite phase-end work did not complete');
}
function sourceScope(runtime, state) {
  return runtime.query(state, { queryKind: 'sabotage_drone_phase_end', sourcePieceId: 'drone-a' }).scope;
}
function controls(context, runtime, state) {
  const original = JSON.stringify(state); const scope = sourceScope(runtime, state);
  const bileProfiles = state.officialAttackProfileCatalogue.profiles.filter(row => row.recordKey === 'army_units:bile_launcher');
  assert.deepEqual(bileProfiles.map(row => row.weaponName), ['Bile Bomb']);
  const immobile = state.officialActionRouteCatalogue.units.find(row => row.pieceId === 'bile-launcher');
  assert.equal(immobile.movementProfile, null); assert.equal(immobile.coreMovementProhibitedByNullSpeed, true);
  const immobileTurn = structuredClone(state);
  immobileTurn.activeSideKey = 'player2'; immobileTurn.players.player2.passedPhases.assault = false;
  pieceOf(immobileTurn, 'bile-launcher').activatedPhases.assault = false;
  const immobileMenu = runtime.enumerate(immobileTurn, { includeDisabled: true });
  assert(!immobileMenu.parameterDomains.some(row => row.actionType === 'charge' && row.pieceId === 'bile-launcher'));
  const immobileDetails = runtime.melee.enumerate(immobileTurn, { includeDisabled: true });
  assert(immobileDetails.candidates.some(row => row.pieceId === 'bile-launcher'
    && row.disabledReason === 'SELECTED_MELEE_NULL_SPEED_CHARGE_PROHIBITED'));
  assert(scope.targets.some(row => row.targetUnitId === 'drone-a' && row.additionalHits === 5));
  assert(scope.targets.some(row => row.targetUnitId === 'worm' && row.additionalHits === 5));
  assert(scope.targets.some(row => row.targetUnitId === 'bile-launcher' && row.additionalHits === 0));
  assert(scope.targets.some(row => row.targetUnitId === 'player1-marine' && row.baseHits === 5));
  assert(!scope.targets.some(row => row.targetUnitId === 'holo'));
  const wrongPhase = structuredClone(state); wrongPhase.phase = 'movement';
  assert.equal(runtime.query(wrongPhase, { queryKind: 'sabotage_drone_phase_end' }).canStart, false);
  const unpassed = structuredClone(state); unpassed.players.player2.passedPhases.assault = false;
  assert.equal(runtime.query(unpassed, { queryKind: 'sabotage_drone_phase_end' }).canStart, false);
  const absent = structuredClone(state); pieceOf(absent, 'drone-a').isOnField = false;
  assert.equal(runtime.query(absent, { queryKind: 'sabotage_drone_phase_end' }).canStart, false);
  assert.throws(() => runtime.lifecycle(state, { eventKind: 'cleanup_and_refresh' }), /PHASE_END_CONTINUATION_REQUIRED/);
  const hidden = structuredClone(state);
  arrange(pieceOf(hidden, 'worm'), 40, 30); arrange(pieceOf(hidden, 'bile-launcher'), 24.6, 15);
  assert(sourceScope(runtime, hidden).targets.some(row => row.targetUnitId === 'bile-launcher'));
  addWall(hidden, 22);
  assert(!sourceScope(runtime, hidden).targets.some(row => row.targetUnitId === 'bile-launcher'));
  const boundary = structuredClone(state); arrange(pieceOf(boundary, 'worm'), 40, 30);
  const nova = pieceOf(boundary, 'player1-nova'); const source = pieceOf(boundary, 'drone-a');
  const x = 20 + (source.models[0].baseWidthInches + nova.models[0].baseWidthInches) / 2 + 2.99;
  arrange(nova, x, 15);
  assert(sourceScope(runtime, boundary).targets.some(row => row.targetUnitId === nova.id));
  arrange(nova, x + 0.02, 15);
  assert(!sourceScope(runtime, boundary).targets.some(row => row.targetUnitId === nova.id));
  const fixed = fixedWalk(runtime, state, 1);
  const declarations = fixed.events.filter(event => event.type === 'sabotage_drone_hits_declared');
  assert.equal(declarations[0].batchKind, 'base'); assert.equal(declarations[1].batchKind, 'structure_bonus');
  assert(declarations[1].targetUnitIds.includes('worm')); assert(!declarations[1].targetUnitIds.includes('bile-launcher'));
  assert.equal(pieceOf(fixed.state, 'drone-a').isDestroyed, true);
  assert.equal(pieceOf(fixed.state, 'worm').isDestroyed, true);
  assert.equal(pieceOf(fixed.state, 'bile-launcher').damageMarker, 5);
  assert.equal(JSON.stringify(state), original);
  const forged = structuredClone(state); forged.officialSabotageDronePhaseEndPolicy.activePlayerEffectsFirst = false;
  assert.throws(() => runtimeFor(context, forged), /POLICY_MISMATCH/);
  return { scope, fixedAllFailedArmour: { declarations, sourceRemovedAndCurrentEffectCompleted: true,
    bileLauncherDamage: 5 }, selfIncluded: true, structureException: true, holoExcluded: true,
    friendlyAndEnemyIncluded: true, withinThreeBoundary: true, losRequired: true, sourceTamperRejected: true,
    wrongWindowExcluded: true, cleanupBypassRejected: true, sourceStateUnchanged: true };
}
async function replay(native, id, prefix) {
  const before = await native.store.loadRoom(id); const bundle = await native.store.loadReplayBundle(id);
  const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let revision = 0; revision <= before.stateRevision; revision++) {
    const result = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, revision) });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.deepEqual(result.envelope, (await read(prefix + revision + '.json')).envelope);
  }
  assert.deepEqual(await native.store.loadRoom(id), before);
  return { receipts: receipts.length, checkpoints: before.stateRevision + 1, exact: true };
}
async function verifyLegacy(product) {
  const results = [];
  for (const spec of [
    { id: 'structure', prefix: 'build/ticket-28-terran-wave3-20261117-v1/generated-structure/', branch: 'ranged',
      roomId: 'wave3-generated-structure-ranged', options: { definitionIds: [], includeRanged: true, includePrecisionChoices: true, includeArmourChoices: true } },
    { id: 'bile', prefix: 'build/ticket-28-wave2-capabilities-20261113-v1/corrosive-bile-resolution/', branch: 'destroyed-source/end',
      roomId: 'wave2-bile-resolution-destroyed-source-end', options: { definitionIds: ['unit:ravager/squadron-any-phase@1'], includeHits: true } },
  ]) {
    const old = await cached('legacy/' + spec.id + '.json'); if (old) { results.push(old); continue; }
    const prefix = spec.prefix + spec.branch + '/'; const authority = await read(prefix + 'authority.json');
    let manifest = authority.dependencies.dataSnapshot.content.releaseManifest;
    if (!manifest) {
      const database = new DatabaseSync(path.join(root, spec.prefix, 'releases.sqlite'), { readOnly: true });
      try { manifest = JSON.parse(database.prepare('SELECT manifest_json FROM sc_official_releases WHERE release_id = ?')
        .get(authority.releaseId).manifest_json); } finally { database.close(); }
    }
    product.resolver.register(manifest);
    const context = await product.resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' });
    const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state, ...spec.options });
    assert.deepEqual(runtime.descriptor, await read(prefix + 'runtime.json'));
    const folder = path.join(directory, 'legacy', spec.id); await fs.mkdir(folder, { recursive: true });
    let sourceFile = path.join(root, prefix, 'room.sqlite'); let original; let bytes;
    try { original = await fs.readFile(sourceFile); bytes = original; }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      sourceFile += '.gz'; original = await fs.readFile(sourceFile); bytes = gunzipSync(original);
    }
    const copy = path.join(folder, 'room.sqlite');
    try { await fs.access(copy); } catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(copy, bytes, { flag: 'wx' }); }
    const native = openWave3EngineeringRoomV1({ directory: folder, filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    try {
      await native.restoreDependencies(spec.roomId, authority);
      const result = await replay(native, spec.roomId, prefix + 'checkpoint-r');
      assert.equal(sha256(await fs.readFile(sourceFile)), sha256(original));
      const value = { id: spec.id, ...result, runtimeVersion: runtime.descriptor.runtimeVersion,
        descriptorExact: true, originalStoredArtifactSha256: sha256(original), databaseSha256: sha256(bytes),
        originalArtifactUnchanged: true, modelCalls: 0 };
      await save('legacy/' + spec.id + '.json', value); results.push(value);
    } finally { native.close(); }
  }
  return results;
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
    sourceRef, contractVersion: 'T28-W3-08-Have-a-Nice-Day-source-priority-and-automatic-hits-v1',
  }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      for (const id of ['blast', 'priority']) await registerScene(context, id, await sceneFor(context, id));
      const state = (await read(output + 'blast/authority.json')).state; const runtime = runtimeFor(context, state);
      const tested = controls(context, runtime, state);
      const definition = runtime.catalogue.definitions.find(row => row.definitionId === definitionId);
      assert.equal(definition.execution.status, 'executable_exact');
      const ref = await save('compile.json', { definition, controls: tested, policy: state.officialSabotageDronePhaseEndPolicy, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const results = [];
      for (const id of ['blast', 'priority']) {
        const old = await cached(id + '/consumed.json'); if (old) { results.push(old); continue; }
        const branch = await product.branch(id);
        try {
          const credentials = await branch.native.create(roomId(id), branch.authority); await checkpoint(branch);
          await commitNext(branch, credentials);
          const selected = await checkpoint(branch);
          assert.equal(selected.envelope.state.pendingSabotageDronePhaseEnd.ownerSideKey, 'player1');
          const query = branch.runtime.query(selected.envelope.state, { queryKind: 'sabotage_drone_phase_end', sourcePieceId: 'drone-a' });
          assert.deepEqual(await branch.native.store.loadRoom(roomId(id)), selected);
          const declared = await commitNext(branch, credentials);
          assert.equal(declared.preview.core.chanceTicket, null);
          const current = await checkpoint(branch);
          assert.equal(current.envelope.state.pendingOfficialAutomaticHits.sourcePlanHash, query.scope.scopeHash);
          assert.equal(current.envelope.state.pendingOfficialAutomaticHits.automaticHits.hits, 5);
          const value = { id, revision: current.stateRevision, query, queryMatchesNativeScope: true,
            activePlayerPriorityVerified: true, currentStage: 'hits', modelCalls: 0 };
          await save(id + '/consumed.json', value); results.push(value);
        } finally { branch.close(); }
      }
      const ref = await save('consume.json', results); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const results = [];
      for (const id of ['blast', 'priority']) {
        const old = await cached(id + '/completed.json'); if (old) { results.push(old); continue; }
        const branch = await product.branch(id);
        try {
          const credentials = await branch.native.create(roomId(id), branch.authority);
          for (let step = 0; step < 100; step++) {
            const current = await checkpoint(branch);
            if (current.envelope.state.sabotageDronePhaseEndCompletedRound === 1) break;
            await commitNext(branch, credentials);
          }
          const current = await checkpoint(branch); const state = current.envelope.state;
          assert.equal(state.sabotageDronePhaseEndCompletedRound, 1); assert.equal(state.pendingSabotageDronePhaseEnd, undefined);
          assert.equal(state.pendingOfficialAutomaticHits, undefined); assert.equal(state.pendingOfficialHitsPoolChoice, undefined);
          assert.equal(branch.runtime.query(state, { queryKind: 'sabotage_drone_phase_end' }).canStart, false);
          const events = state.log.flatMap(row => row.events || []);
          const completed = events.filter(event => event.type === 'sabotage_drone_source_effect_completed');
          assert.deepEqual(completed.map(event => event.sourcePieceId), id === 'blast' ? ['drone-a'] : ['drone-a', 'drone-b']);
          const declarations = events.filter(event => event.type === 'sabotage_drone_hits_declared');
          if (id === 'blast') {
            assert(declarations.some(event => event.batchKind === 'structure_bonus' && event.targetUnitIds.includes('worm')));
            assert(!declarations.some(event => event.batchKind === 'structure_bonus' && event.targetUnitIds.includes('bile-launcher')));
          }
          const value = { id, revision: current.stateRevision, sourceOrder: completed.map(event => event.sourcePieceId),
            declarations, armourOnlyDiceVerified: true, originalActiveSideRestored: state.activeSideKey,
            scope: 'source-bound Assault-end component; full Match phase scheduling pending', modelCalls: 0 };
          await save(id + '/completed.json', value); results.push(value);
        } finally { branch.close(); }
      }
      const ref = await save('successor.json', results); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const current = [];
      for (const id of ['blast', 'priority']) {
        const branch = await product.branch(id);
        try {
          await branch.native.restoreDependencies(roomId(id), branch.authority);
          current.push({ id, ...await replay(branch.native, roomId(id), output + id + '/checkpoint-r') });
        } finally { branch.close(); }
      }
      const legacy = await verifyLegacy(product);
      const ref = await save('cold-recovery.json', { current, legacy, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ gate: 'sabotage-drone-phase-end', status: result.status, failures: result.failures.length }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
export { sourceProduct, runtimeFor, sceneFor, registry, verifyLegacy };
