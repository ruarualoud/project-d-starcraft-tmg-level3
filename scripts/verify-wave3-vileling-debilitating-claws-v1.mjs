import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { root, poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { consumeOfficialDamageWeaponHitDebuffsV1, OFFICIAL_DAMAGE_WEAPON_HIT_DEBUFF_ATOM_ID }
  from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import { inspectOfficialSelectedRosterRangedActionContextV1 }
  from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1, completeWave3MeleePoolsV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const output = 'build/ticket-28-zerg-wave3-20261117-v1/vileling-debilitating-claws/';
const directory = path.join(root, output);
const proofOutput = output + 'positive/';
const proofDirectory = path.join(root, proofOutput);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const foundation = 'build/ticket-28-zerg-wave3-20261117-v1/vileling-foundation/';
const definitionId = 'unit:vileling__zergling_/debilitating-claws-combat-phase@1';
const squadronId = 'unit:vileling__zergling_/squadron-any-phase@1';
const clawsId = 'unit:vileling__zergling_/claws-combat-phase@1';
const releaseId = 'wave3-vileling-hit-debuff-source-v1';
const roomId = 'wave3-vileling-hit-debuff-positive';
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const pieceOf = (state, id) => state.pieces.find(piece => piece.id === id);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
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
    const manifest = await read(sourceRef); product.resolver.register(manifest);
    return await product.resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' });
  } finally { product.close(); }
}
function runtimeFor(context, state) {
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
    definitionIds: [squadronId, definitionId], includeMelee: true, includeRanged: true });
}
async function sceneFor(context) {
  const original = (await read(foundation + 'combat/authority.json')).state;
  const setup = createOfficialReleaseRosterStateV2({ context, includeMelee: true,
    characteristicDefinitionIds: [squadronId, definitionId], meleeWeaponDefinitionIds: [clawsId],
    includeCharacteristicConsumers: true, canonicalResourceTypes: true,
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json'))
      .state.officialRosterDisclosureDataBundle,
    candidatesBySide: {
      player1: (await read(foundation + 'roster-preflight.json')).candidate,
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: ['tactical_cards:armory'],
        units: [{ unitInstanceId: 'target', recordKey: 'army_units:goliath', compositionKind: 'small', upgrades: [] }] },
    } });
  const keys = ['board', 'officialDeploymentGeometryBinding', 'engagementScale', 'armyBuildingEngagementScale',
    'officialMissionRuntimeDescriptor', 'supplyLossLedger', 'officialModelGapTransitPolicy', 'officialMissionSupplyProfile'];
  let state = { ...Object.fromEntries(keys.map(key => [key, structuredClone(original[key])])), ...setup.state,
    phase: 'combat', round: 1, activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
    phaseFirstActorByRound: { '1:combat': { round: 1, phase: 'combat', chosenFirstActorSideKey: 'player1' } } };
  for (const piece of state.pieces) {
    Object.assign(piece, { isOnField: true, isInReserves: false, deploymentStatus: 'hypothetical_snapshot' });
    const prior = pieceOf(original, piece.id);
    piece.models.forEach((model, i) => Object.assign(model, { isOnField: true,
      xInches: prior.models[i].xInches, yInches: prior.models[i].yInches }));
  }
  state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
  return { state, scenario: { declaredCombatAndPositions: true, positionsSourceRef: foundation + 'combat/authority.json',
    noHistoricalChargeClaim: true, partialLegalRosters: true, scale: 'Standard', budget: 2000,
    fullRound: false, fullMatch: false, modelCalls: 0 } };
}
async function registerScene(context, scene) {
  const runtime = runtimeFor(context, scene.state);
  assert.equal(runtime.descriptor.runtimeVersion, '3.98.0');
  const ref = await save('runtime.json', runtime.descriptor), product = registry();
  try {
    const m = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId, dataset: context.dataset,
      snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef,
      snapshotRef: m.source.snapshotRef, sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references,
      sourcePolicy: m.source.policy, components: { ...m.components, rulesRuntime: { ref,
        version: runtime.descriptor.runtimeVersion, integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId, purpose: 'area_ability_component' });
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: resolved, ...scene });
    const old = await cached('authority.json');
    if (old) assert.deepEqual(authority, old); else await save('authority.json', authority);
  } finally { product.close(); }
}
async function openProduct() {
  const product = registry(), authority = await read(output + 'authority.json');
  const context = await product.resolver.resolve({ releaseId, purpose: 'area_ability_component' });
  const runtime = runtimeFor(context, authority.state);
  assert.deepEqual(runtime.descriptor, await read(output + 'runtime.json'));
  await fs.mkdir(proofDirectory, { recursive: true });
  const native = openWave3EngineeringRoomV1({ directory: proofDirectory, filename: 'room.sqlite',
    rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
  return { ...product, authority, runtime, native, close() { native.close(); product.close(); } };
}
async function checkpoint(product) {
  const current = await product.native.store.loadRoom(roomId), name = 'checkpoint-r' + current.stateRevision + '.json';
  const old = await cached('positive/' + name);
  if (old) assert.deepEqual(old.envelope, current.envelope); else await save('positive/' + name, { envelope: current.envelope });
  return current;
}
async function capturePrefixes() {
  for (const name of await fs.readdir(proofDirectory)) {
    if (!name.endsWith('-checkpoint.json')) continue;
    const value = await read(proofOutput + name), target = 'positive/checkpoint-r' + value.envelope.stateRevision + '.json';
    const old = await cached(target);
    if (old) assert.deepEqual(old.envelope, value.envelope); else await save(target, { envelope: value.envelope });
  }
}
function projection(runtime, state, pieceId) {
  return runtime.query(state, { queryKind: 'characteristic_status_projection', pieceId }).result;
}
async function fight(product, credentials, pieceId, targetId, side, prefix, initial) {
  const menu = product.runtime.enumerate(initial), domain = menu.parameterDomains.find(row => row.actionType === 'fight' && row.pieceId === pieceId);
  assert(domain);
  const parameters = { closeRanksMode: 'decline', allocations: [{ targetUnitId: targetId,
    dice: domain.sourceDomain.constraints.declineCloseRanksAttackDice }], surgeTargetUnitId: null, criticalTargetUnitId: null };
  const beforeQuery = await product.native.store.loadRoom(roomId);
  const query = product.runtime.query(initial, { queryKind: 'melee_action_preview', actionType: 'fight', pieceId, parameters });
  assert.deepEqual(await product.native.store.loadRoom(roomId), beforeQuery);
  const result = await product.native.commit({ roomId, credential: credentials[side], operationKey: prefix,
    select: row => row.domainId === domain.domainId, parameters: () => parameters });
  assert.deepEqual(result.preview.core.action, query.result.action);
  await checkpoint(product);
  await completeWave3MeleePoolsV1({ directory: proofDirectory, native: product.native, runtime: product.runtime,
    roomId, credentials, operationPrefix: prefix + '-pool', selectPoolParameters: poolParameters });
  const after = await checkpoint(product); await capturePrefixes();
  const event = after.envelope.state.log.flatMap(row => row.events || []).find(row => row.type === 'close_combat_attack'
    && row.pieceId === pieceId && row.targetId === targetId);
  assert(event);
  return { query, result, after, event };
}
function eventControls(runtime, state) {
  const attack = state.log.flatMap(row => row.events || []).find(event => event.type === 'close_combat_attack' && event.pieceId === 'vileling');
  assert(attack);
  const once = { state, events: [attack] };
  const repeated = consumeOfficialDamageWeaponHitDebuffsV1(runtime.bundle, once);
  assert.deepEqual(repeated, once);
  const sourceGone = structuredClone(state); pieceOf(sourceGone, 'vileling').isDestroyed = true;
  assert.equal(projection(runtime, sourceGone, 'target').weaponHitPenalty, 1);
  const forged = structuredClone(state);
  pieceOf(forged, 'target').officialAbilityEffects.find(row => row.effectKind === 'damage_inflicted_weapon_hit_debuff').weaponHitPenalty = 2;
  assert.throws(() => projection(runtime, forged, 'target'), /WEAPON_HIT_DEBUFF_BINDING_INVALID/);
  const clean = runtime.lifecycle(state, { eventKind: 'cleanup_and_refresh' }).state;
  assert.equal(projection(runtime, clean, 'target').weaponHitPenalty, undefined);
  const roundEnd = runtime.lifecycle(state, { eventKind: 'round_end' }).state;
  assert.equal(projection(runtime, roundEnd, 'target').weaponHitPenalty, 1);
  const controls = [];
  for (const [name, mutate] of [
    ['zero_damage', (s, e) => { e.stages.totalDamage = 0; }],
    ['wrong_phase', s => { s.phase = 'assault'; }],
    ['friendly_target', (s, e) => { e.targetId = 'vileling'; }],
    ['other_source', (s, e) => { e.pieceId = 'target'; e.sideKey = 'player2'; e.targetId = 'vileling'; }],
  ]) {
    const input = { state: structuredClone(clean), events: [structuredClone(attack)] }; mutate(input.state, input.events[0]);
    const result = consumeOfficialDamageWeaponHitDebuffsV1(runtime.bundle, input);
    assert.deepEqual(result, input); controls.push(name);
  }
  return { scope: 'controlled event injections on actual saved Native result', controls,
    repeatedApplicationNoChange: true, sourceRemovalKeepsEffect: true, corruptFactRejected: true,
    roundEndPreservedAndCleanupRemoved: true };
}
function rangedControls(runtime, input) {
  const state = structuredClone(input);
  state.phase = 'assault'; state.activeSideKey = 'player2'; delete state.selectedRosterActivationWindow;
  state.phaseFirstActorByRound['1:assault'] = { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player2' };
  for (const piece of state.pieces) piece.activatedPhases.assault = false;
  for (const model of pieceOf(state, 'vileling').models) model.xInches -= 5;
  const results = [];
  for (const weaponName of ['Autocannon', 'Underbelly Machine Gun']) {
    const request = { queryKind: 'ranged_attack_preview', pieceId: 'target', weaponName, parameters: { targetUnitId: 'vileling' } };
    const affected = runtime.query(state, request);
    const clean = structuredClone(state), target = pieceOf(clean, 'target');
    const removedStatusHashes = new Set((target.statuses || []).filter(row => row.sourceDefinitionId === definitionId)
      .map(row => row.statusEffectHash));
    target.officialAbilityEffects = target.officialAbilityEffects.filter(row => row.sourceDefinitionId !== definitionId);
    target.statuses = target.statuses.filter(row => row.sourceDefinitionId !== definitionId);
    clean.board.effectMarkers = clean.board.effectMarkers.filter(row => !removedStatusHashes.has(row.statusEffectHash));
    const normal = runtime.query(clean, request);
    const profile = inspectOfficialSelectedRosterRangedActionContextV1(state, affected.result.action.sourceAction).profileForBatch;
    const baseline = inspectOfficialSelectedRosterRangedActionContextV1(clean, normal.result.action.sourceAction).profileForBatch;
    assert.equal(profile.weaponHitPenalty, 1);
    assert.deepEqual(profile.hitDice.map(row => row.hitThreshold), baseline.hitDice.map(row => Math.min(6, row.hitThreshold + 1)));
    results.push({ weaponName, baseThresholds: [...new Set(baseline.hitDice.map(row => row.hitThreshold))],
      affectedThresholds: [...new Set(profile.hitDice.map(row => row.hitThreshold))], query: affected });
  }
  return { scope: 'declared same-round Assault/position snapshot from saved Native debuff; no live phase advance', results };
}
async function replay(native, id, prefix) {
  const before = await native.store.loadRoom(id), bundle = await native.store.loadReplayBundle(id);
  const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let i = 0; i <= receipts.length; i++) {
    const result = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, i) });
    assert.equal(result.ok, true, JSON.stringify(result)); assert.deepEqual(result.envelope, (await read(prefix + i + '.json')).envelope);
  }
  assert.deepEqual(await native.store.loadRoom(id), before);
  return { receipts: receipts.length, checkpoints: receipts.length + 1, exact: true };
}
async function legacyCombat(product) {
  const prefix = foundation + 'combat/', authority = await read(prefix + 'authority.json');
  product.resolver.register(authority.dependencies.dataSnapshot.content.releaseManifest);
  const context = await product.resolver.resolve({ releaseId: authority.releaseId, purpose: 'area_ability_component' });
  const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state,
    definitionIds: authority.state.officialCharacteristicStatusFamilySourceBundle.definitionIds, includeMelee: true });
  assert.deepEqual(runtime.descriptor, await read(prefix + 'runtime.json'));
  const original = await fs.readFile(path.join(root, prefix, 'room.sqlite')), filename = path.join(directory, 'legacy-room.sqlite');
  try { await fs.access(filename); } catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(filename, original, { flag: 'wx' }); }
  const native = openWave3EngineeringRoomV1({ directory, filename: 'legacy-room.sqlite',
    rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
  try {
    const id = 'wave3-vileling-foundation-combat'; await native.restoreDependencies(id, authority);
    const result = await replay(native, id, prefix + 'checkpoint-r');
    assert.equal(sha256(await fs.readFile(path.join(root, prefix, 'room.sqlite'))), sha256(original));
    return { ...result, runtimeVersion: runtime.descriptor.runtimeVersion, descriptorExact: true, originalDatabaseUnchanged: true };
  } finally { native.close(); }
}
async function legacyRanged(product) {
  const prefix = 'build/ticket-28-terran-wave3-20261117-v1/spec-ops-foundation/quad-armoured/';
  const authority = await read(prefix + 'authority.json');
  product.resolver.register(authority.dependencies.dataSnapshot.content.releaseManifest);
  const context = await product.resolver.resolve({ releaseId: authority.releaseId, purpose: 'area_ability_component' });
  const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state,
    definitionIds: authority.state.officialCharacteristicStatusFamilySourceBundle.definitionIds,
    weaponDefinitionIds: ['unit:spec_ops_marauder__marauder_/quad-k12-assault-phase@1'],
    includeRanged: true, includeMelee: true, includePrecisionChoices: true, includeArmourChoices: true });
  assert.deepEqual(runtime.descriptor, await read(prefix + 'runtime.json'));
  const original = await fs.readFile(path.join(root, prefix, 'room.sqlite')), filename = path.join(directory, 'legacy-ranged.sqlite');
  try { await fs.access(filename); } catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(filename, original, { flag: 'wx' }); }
  const native = openWave3EngineeringRoomV1({ directory, filename: 'legacy-ranged.sqlite',
    rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
  try {
    const id = 'wave3-specops-quad-armoured'; await native.restoreDependencies(id, authority);
    const result = await replay(native, id, prefix + 'checkpoint-r');
    assert.equal(sha256(await fs.readFile(path.join(root, prefix, 'room.sqlite'))), sha256(original));
    return { ...result, runtimeVersion: runtime.descriptor.runtimeVersion, descriptorExact: true, originalDatabaseUnchanged: true };
  } finally { native.close(); }
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
    sourceRef, contractVersion: 'T28-W3-09-Debilitating-Claws-v1',
  }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      const scene = await sceneFor(context); await registerScene(context, scene);
      const runtime = runtimeFor(context, scene.state), definition = runtime.catalogue.definitions.find(row => row.definitionId === definitionId);
      assert.equal(definition.execution.status, 'executable_exact');
      assert.equal(definition.execution.capability, 'system_lifecycle');
      assert(runtime.descriptor.executableRuleAtomIds.includes(OFFICIAL_DAMAGE_WEAPON_HIT_DEBUFF_ATOM_ID));
      assert.throws(() => createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: scene.state,
        definitionIds: [squadronId, definitionId], includeMelee: true }), /HIT_DEBUFF_CONSUMERS_REQUIRED/);
      const ref = await save('compile.json', { definition, runtime: runtime.descriptor,
        newSemanticAtomIds: [OFFICIAL_DAMAGE_WEAPON_HIT_DEBUFF_ATOM_ID], missingConsumerRejected: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const negative = (await read(output + 'checkpoint-r3.json')).envelope.state;
      const negativeEvent = negative.log.flatMap(row => row.events || []).find(row => row.type === 'close_combat_attack');
      assert.equal(negativeEvent.stages.totalDamage, 0);
      assert.equal(projection(product.runtime, negative, 'target').weaponHitPenalty, undefined);
      await save('zero-damage-native.json', { sourceRef: output + 'checkpoint-r3.json', event: negativeEvent,
        effectNotApplied: true, originalRoomPreserved: true, modelCalls: 0 });
      const credentials = await product.native.create(roomId, product.authority); await checkpoint(product);
      const shot = await fight(product, credentials, 'vileling', 'target', 'player1', 'claws', product.authority.state);
      assert(shot.event.stages.totalDamage > 0, 'Native case must actually damage target to prove the positive trigger');
      const state = shot.after.envelope.state;
      assert.equal(projection(product.runtime, state, 'target').weaponHitPenalty, 1);
      const applied = state.log.flatMap(row => row.events || []).find(event => event.type === 'weapon_hit_debuff_applied');
      assert(applied); assert.equal(applied.sourceAttackResolutionHash, shot.event.resolutionHash);
      const ref = await save('consume.json', { revision: shot.after.stateRevision, event: shot.event, applied,
        savedCheckpointRef: proofOutput + 'checkpoint-r' + shot.after.stateRevision + '.json', queryEqualsNative: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const credentials = await product.native.create(roomId, product.authority);
      const consumed = await read(output + 'consume.json'), initial = (await read(consumed.savedCheckpointRef)).envelope.state;
      const beforeControls = await product.native.store.loadRoom(roomId);
      const controls = eventControls(product.runtime, initial), ranged = rangedControls(product.runtime, initial);
      assert.deepEqual(await product.native.store.loadRoom(roomId), beforeControls);
      await save('event-controls.json', controls); await save('ranged-controls.json', ranged);
      await product.native.commit({ roomId, credential: credentials.player1, operationKey: 'source-finish',
        select: row => row.actionType === 'finish_activation' && row.pieceId === 'vileling', parameters: () => ({}) });
      const ready = await checkpoint(product);
      assert.equal(ready.envelope.state.activeSideKey, 'player2');
      const refState = await cached('enemy-before.json');
      if (!refState) await save('enemy-before.json', { envelope: ready.envelope });
      const response = await fight(product, credentials, 'target', 'vileling', 'player2', 'counterattack',
        (refState || { envelope: ready.envelope }).envelope.state);
      const raw = product.authority.state.officialAttackProfileCatalogueV2.profiles.find(row => row.weaponName === 'Stomp');
      assert.equal(response.event.stages.hitThreshold, Math.min(6, Number(raw.hitThreshold) + 1));
      await product.native.commit({ roomId, credential: credentials.player2, operationKey: 'target-finish',
        select: row => row.actionType === 'finish_activation' && row.pieceId === 'target', parameters: () => ({}) });
      const after = await checkpoint(product); await capturePrefixes();
      const ref = await save('successor.json', { revision: after.stateRevision, counterattack: response.event,
        printedHitThreshold: raw.hitThreshold, effectiveHitThreshold: response.event.stages.hitThreshold,
        queryEqualsNative: true, parentCompleted: true, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      await product.native.restoreDependencies(roomId, product.authority);
      const current = await replay(product.native, roomId, proofOutput + 'checkpoint-r'), legacy = await legacyCombat(product);
      const context = await product.resolver.resolve({ releaseId, purpose: 'area_ability_component' });
      const negativeRoom = openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite',
        rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime: product.runtime }) });
      let negative;
      try {
        await negativeRoom.restoreDependencies('wave3-vileling-hit-debuff', product.authority);
        negative = await replay(negativeRoom, 'wave3-vileling-hit-debuff', output + 'checkpoint-r');
      } finally { negativeRoom.close(); }
      const ref = await save('cold-recovery.json', { current, negative, legacy, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  const compatibility = await runProductBoundaryCheck({ directory: path.join(directory, 'ranged-compatibility'), identity: {
    factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
    factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2',
    sourceRef: 'build/ticket-28-terran-wave3-20261117-v1/spec-ops-foundation/quad-armoured/authority.json',
    contractVersion: 'T28-W3-09-Debilitating-Claws-old-ranged-v1',
  }, steps: [{ name: 'coldRecovery', repairRef, openProduct, check: async product => {
    const result = await legacyRanged(product), ref = await save('ranged-compatibility.json', result);
    return { evidenceRef: ref, checkpointRef: ref };
  } }] });
  console.log(JSON.stringify({ gate: 'vileling-debilitating-claws', status: gate.status,
    rangedCompatibility: compatibility.status, failures: gate.failures.length }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
