import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { root, arrange, declareCoherency, poolParameters, runtimeFor as previousRuntimeFor }
  from './verify-wave3-lethal-hologram-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialSpecialTerrainAgreementV1 } from '../packages/rule-atoms/official-special-terrain-rules-kernel-v1.mjs';
import { createOfficialTerrainElevationAgreementV1 } from '../packages/rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1, commitWave3RangedBatchV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const output = 'build/ticket-28-terran-wave3-20261117-v1/nova-weapons/';
const directory = path.join(root, output);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const previous = 'build/ticket-28-terran-wave3-20261116-v1/holo-round-end/injured-place/';
const specs = [
  { id: 'shotgun-burst', mode: 'assault', phase: 'assault', targetX: 14, dice: 6, hit: 4, damage: 2, burst: true },
  { id: 'shotgun-normal', mode: 'assault', phase: 'assault', targetX: 16, dice: 3, hit: 4, damage: 2, burst: false },
  { id: 'rifle-normal', mode: 'stealth', phase: 'assault', targetX: 18, dice: 4, hit: 3, damage: 2 },
  { id: 'rifle-long', mode: 'stealth', phase: 'assault', targetX: 26, dice: 4, hit: 4, damage: 2 },
  { id: 'monomolecular-blade', mode: 'assault', phase: 'combat', dice: 8, hit: 3, damage: 1 },
  { id: 'combat-knife', mode: 'stealth', phase: 'combat', dice: 3, hit: 5, damage: 1 },
];
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const roomId = id => 'wave3-nova-weapons-' + id;
const releaseId = id => roomId(id) + '-v1';
const recordKey = mode => 'army_units:nova_' + mode + '_mode';
const rangedId = mode => 'unit:nova_' + mode + '_mode/' + (mode === 'assault' ? 'hellfire-shotgun' : 'c-20a-canister-rifle') + '-assault-phase@1';
const meleeId = mode => 'unit:nova_' + mode + '_mode/' + (mode === 'assault' ? 'monomolecular-blade' : 'combat-knife') + '-combat-phase@1';
const weaponName = spec => spec.phase === 'combat'
  ? spec.mode === 'assault' ? 'Monomolecular Blade' : 'Combat Knife'
  : spec.mode === 'assault' ? 'Hellfire Shotgun' : 'C-20A Canister Rifle';
const pieceOf = (state, id) => state.pieces.find(row => row.id === id);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n'); return output + name;
}
async function cached(name) {
  try { return await read(output + name); } catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
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
  const mode = pieceOf(state, 'nova').officialUnitRecordKey === recordKey('assault') ? 'assault' : 'stealth';
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
    definitionIds: state.officialCharacteristicStatusFamilySourceBundle.definitionIds,
    weaponDefinitionIds: [rangedId(mode)], includeRanged: true, includeMelee: true,
    includePrecisionChoices: true, includeArmourChoices: true });
}
async function makeScene(context, spec) {
  const base = (await read(previous + 'authority.json')).state;
  const characteristicIds = ['unit:nova_' + spec.mode + '_mode/ghost-visor-any-phase@1'];
  if (spec.mode === 'stealth') characteristicIds.push('unit:nova_stealth_mode/tactical-stealth-suit-any-phase@1');
  characteristicIds.push(...(spec.extraCharacteristicDefinitionIds || []));
  const setup = createOfficialReleaseRosterStateV2({ context, includeAbilitySourcePhases: true,
    candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:nova_covert_ops', tacticalCardRecordKeys: spec.tacticalCardRecordKeys || [], units: [
          { unitInstanceId: 'nova', recordKey: recordKey(spec.mode), compositionKind: 'small', upgrades: [] }] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: spec.targetTacticalCardRecordKeys || [], units: [
          { unitInstanceId: 'target', recordKey: spec.targetRecordKey || 'army_units:marine', compositionKind: 'small', upgrades: [] }] },
    }, legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json'))
      .state.officialRosterDisclosureDataBundle,
    characteristicDefinitionIds: characteristicIds, canonicalResourceTypes: true, includeCharacteristicConsumers: true,
    ...(spec.reactionDefinitionIds ? { reactionDefinitionIds: spec.reactionDefinitionIds } : {}),
    includeMelee: true, meleeWeaponDefinitionIds: [meleeId(spec.mode)],
    ...(spec.meleeModifierDefinitionIds ? { meleeModifierDefinitionIds: spec.meleeModifierDefinitionIds,
      includeImpactAllocation: true } : {}),
    includeHiddenRangedAndEvade: true, includeDetectionHiddenLoss: true,
    includeActionPerformedStatusLifecycle: spec.mode === 'stealth' });
  const fields = ['board', 'officialDeploymentGeometryBinding', 'engagementScale', 'armyBuildingEngagementScale',
    'officialMissionRuntimeDescriptor', 'supplyLossLedger', 'officialModelGapTransitPolicy', 'officialMissionSupplyProfile'];
  let state = { ...Object.fromEntries(fields.filter(key => base[key] !== undefined).map(key => [key, structuredClone(base[key])])),
    ...setup.state, phase: spec.phase, round: 1, activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
    phaseFirstActorByRound: { ['1:' + spec.phase]: { round: 1, phase: spec.phase, chosenFirstActorSideKey: 'player1' } } };
  state.board = { widthInches: base.board.widthInches, heightInches: base.board.heightInches,
    tokens: [], effectMarkers: [], markers: [],
    terrain: [structuredClone(base.board.terrain.find(row => row.id === 'std-ordinary-east'))], accessPoints: [],
    engagementGeometry: structuredClone(base.board.engagementGeometry),
    terrainElevationAgreement: createOfficialTerrainElevationAgreementV1({ supportRelations: [] }),
    specialTerrainAgreement: createOfficialSpecialTerrainAgreementV1({ terrainEntries: [
      base.board.specialTerrainAgreement.terrainEntries.find(row => row.terrainId === 'std-ordinary-east')] }),
    scenarioMapId: 'nova-weapon-engineering-clear-lane', trainingTruth: false };
  arrange(pieceOf(state, 'nova'), 10, 10);
  const target = pieceOf(state, 'target'); arrange(target, 20, 10);
  const targetX = spec.targetX ?? 10 + (pieceOf(state, 'nova').models[0].baseWidthInches + target.models[0].baseWidthInches) / 2 + 0.5;
  target.models.forEach((model, index) => Object.assign(model, { xInches: targetX + index % 3 * 1.3,
    yInches: 10 + Math.floor(index / 3) * 1.3 }));
  const coherencyProofs = declareCoherency(state);
  state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
  return { state, scenario: { spec, declaredPhaseAndPositions: true, coherencyProofs,
    scale: 'Standard2000-budget partial rosters', fullRound: false, fullMatch: false, modelCalls: 0 } };
}
async function registerScene(context, spec, scene) {
  const runtime = runtimeFor(context, scene.state); assert.equal(runtime.descriptor.runtimeVersion, '3.82.0');
  const ref = await save(spec.id + '/runtime.json', runtime.descriptor), product = registry();
  try {
    const m = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(spec.id), dataset: context.dataset,
      snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef,
      snapshotRef: m.source.snapshotRef, sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references,
      sourcePolicy: m.source.policy, components: { ...m.components, rulesRuntime: { ref,
        version: runtime.descriptor.runtimeVersion, integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId: releaseId(spec.id), purpose: 'area_ability_component' });
    await save(spec.id + '/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved,
      state: scene.state, scenario: scene.scenario }));
  } finally { product.close(); }
}
function openProduct() {
  const product = registry();
  return { ...product, async branch(id) {
    const authority = await read(output + id + '/authority.json');
    const context = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state); assert.deepEqual(runtime.descriptor, await read(output + id + '/runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory: path.join(directory, id), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { id, authority, context, runtime, native, close: () => native.close() };
  } };
}
async function checkpoint(branch) {
  const current = await branch.native.store.loadRoom(roomId(branch.id));
  const name = branch.id + '/checkpoint-r' + current.stateRevision + '.json', old = await cached(name);
  if (old) assert.deepEqual(old.envelope, current.envelope); else await save(name, { envelope: current.envelope });
  return current;
}
async function invoke(branch, credentials, operationKey, select, parameters, kind = 'parameterized') {
  const current = await checkpoint(branch);
  const result = await branch.native.commit({ roomId: roomId(branch.id), credential: credentials[current.envelope.state.activeSideKey],
    operationKey, select, parameters, kind });
  await checkpoint(branch); return result;
}
async function settleMelee(branch, credentials) {
  for (let step = 0; step < 32; step++) {
    const current = await checkpoint(branch), state = current.envelope.state;
    if (!state.pendingOfficialMeleePoolChoice && !state.pendingAction) return current;
    const menu = branch.runtime.enumerate(state), domain = menu.parameterDomains[0];
    if (domain) await invoke(branch, credentials, 'pool-' + current.stateRevision,
      row => row.domainId === domain.domainId, () => poolParameters(domain));
    else {
      assert.equal(menu.candidates.length, 1);
      await invoke(branch, credentials, 'pool-' + current.stateRevision, () => true, null, 'finite');
    }
  }
  assert.fail('bounded native melee continuation did not settle');
}
async function replay(native, id, prefix) {
  const current = await native.store.loadRoom(id), journal = await native.store.loadReplayBundle(id);
  const receipts = journal.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let revision = 0; revision <= current.stateRevision; revision++) {
    const result = native.engine.replay({ initialEnvelope: journal.initialEnvelope, journal: receipts.slice(0, revision) });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.deepEqual(result.envelope, (await read(prefix + revision + '.json')).envelope);
  }
  return { receipts: receipts.length, checkpoints: current.stateRevision + 1, exact: true };
}

async function main() {
await fs.mkdir(directory, { recursive: true });
const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
  factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
  sourceRef, contractVersion: 'T28-W3-08-nova-four-weapons-formal-native-v1',
}, steps: [
  { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
    const results = [];
    for (const spec of specs) {
      const scene = await makeScene(context, spec), runtime = runtimeFor(context, scene.state);
      for (const id of [rangedId(spec.mode), meleeId(spec.mode)]) {
        const definition = runtime.catalogue.definitions.find(row => row.definitionId === id);
        assert.equal(definition.execution.status, 'executable_exact');
      }
      const weapon = runtime.catalogue.definitions.find(row => row.definitionId === (spec.phase === 'combat' ? meleeId(spec.mode) : rangedId(spec.mode)));
      assert.equal(weapon.definitionName, weaponName(spec));
      const queryState = structuredClone(scene.state);
      if (spec.phase === 'assault') {
        const projection = runtime.query(queryState, { queryKind: 'ranged_attack_preview', pieceId: 'nova',
          weaponName: weaponName(spec), parameters: { targetUnitId: 'target' } });
        assert(projection.result.action); assert.deepEqual(queryState, scene.state);
        const outside = structuredClone(scene.state);
        const offset = 45 - pieceOf(outside, 'target').models[0].xInches;
        pieceOf(outside, 'target').models.forEach(model => { model.xInches += offset; });
        assert.throws(() => runtime.query(outside, { queryKind: 'ranged_attack_preview', pieceId: 'nova',
          weaponName: weaponName(spec), parameters: { targetUnitId: 'target' } }));
      }
      await registerScene(context, spec, scene); results.push({ spec, weapon, formalBindings: [rangedId(spec.mode), meleeId(spec.mode)] });
    }
    const ref = await save('compile.json', results); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'consume', repairRef, openProduct, check: async product => {
    const results = [];
    for (const spec of specs) {
      const prior = await cached(spec.id + '/consumed.json'); if (prior) { results.push(prior); continue; }
      const branch = await product.branch(spec.id);
      try {
        const credentials = await branch.native.create(roomId(spec.id), branch.authority); await checkpoint(branch);
        let event, query;
        if (spec.phase === 'assault') {
          const shot = await commitWave3RangedBatchV1({ directory: path.join(directory, spec.id), native: branch.native,
            runtime: branch.runtime, roomId: roomId(spec.id), credentials, attackerSideKey: 'player1', attackerPieceId: 'nova',
            targetPieceId: 'target', weaponName: weaponName(spec), operationKey: 'shot', selectPoolParameters: poolParameters });
          for (const name of await fs.readdir(path.join(directory, spec.id))) {
            if (!name.startsWith('shot-') || !name.endsWith('.json')) continue;
            const value = await read(output + spec.id + '/' + name); if (!value.envelope) continue;
            await save(spec.id + '/checkpoint-r' + value.envelope.stateRevision + '.json', { envelope: value.envelope });
          }
          await checkpoint(branch); event = shot.event; query = shot.query;
          assert.equal(event.stages.hit.dice, spec.dice);
          assert(event.stages.hit.thresholdByDieIndex.every(value => value === spec.hit));
          assert.equal(event.stages.damage.damagePerDie, spec.damage);
          if (spec.mode === 'assault') assert.equal(event.stages.effects.burstFireApplied, spec.burst);
          else assert.equal(event.stages.effects.bypassedArmourHits, Math.min(2, event.stages.hit.hits));
        } else {
          const state = branch.authority.state;
          const domain = branch.runtime.enumerate(state).parameterDomains.find(row => row.actionType === 'fight' && row.pieceId === 'nova');
          assert(domain);
          const parameters = { closeRanksMode: 'decline', allocations: [{ targetUnitId: 'target', dice: spec.dice }],
            ...(domain.sourceDomain.parameterSchema.required.includes('surgeTargetUnitId') ? { surgeTargetUnitId: 'target' } : {}) };
          query = branch.runtime.query(state, { queryKind: 'melee_action_preview', actionType: 'fight', pieceId: 'nova',
            weaponName: weaponName(spec), parameters });
          const committed = await invoke(branch, credentials, 'fight', row => row.domainId === domain.domainId, () => parameters);
          assert.deepEqual(committed.preview.core.action, query.result.action);
          const current = await settleMelee(branch, credentials);
          event = current.envelope.state.log.flatMap(row => row.events || []).find(row => row.type === 'close_combat_attack');
          assert(event);
          assert.equal(event.stages.hitRolls.length, spec.dice);
          assert.equal(event.stages.hitThreshold, spec.hit);
          assert.equal(event.stages.damagePerDie, spec.damage);
        }
        const current = await checkpoint(branch), value = { spec, revision: current.stateRevision, event, query,
          formalIRBindingPresent: true, queryEqualsNative: true, modelCalls: 0 };
        await save(spec.id + '/consumed.json', value); results.push(value);
      } finally { branch.close(); }
    }
    const ref = await save('consume.json', results); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'successor', repairRef, openProduct, check: async product => {
    const results = [];
    for (const spec of specs) {
      const branch = await product.branch(spec.id);
      try {
        const credentials = await branch.native.create(roomId(spec.id), branch.authority);
        let current = await checkpoint(branch);
        if (current.envelope.state.pendingCurrentProductRangedSequence) {
          await invoke(branch, credentials, 'finish-shot', row => row.action.actionType === 'finish_ranged_attack_sequence', null, 'finite');
        }
        await invoke(branch, credentials, 'finish', row => row.actionType === 'finish_activation' && row.pieceId === 'nova', () => ({}));
        current = await checkpoint(branch); assert.equal(current.envelope.state.activeSideKey, 'player2');
        const value = { id: spec.id, revision: current.stateRevision, nextSide: 'player2' };
        await save(spec.id + '/successor.json', value); results.push(value);
      } finally { branch.close(); }
    }
    const ref = await save('successor.json', results); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'coldRecovery', repairRef, openProduct, check: async product => {
    const results = [];
    for (const spec of specs) {
      const branch = await product.branch(spec.id);
      try {
        await branch.native.restoreDependencies(roomId(spec.id), branch.authority);
        const before = await branch.native.store.loadRoom(roomId(spec.id));
        results.push({ id: spec.id, ...await replay(branch.native, roomId(spec.id), output + spec.id + '/checkpoint-r') });
        assert.deepEqual(await branch.native.store.loadRoom(roomId(spec.id)), before);
      } finally { branch.close(); }
    }
    const previousProduct = registry(); let native;
    try {
      const authority = await read(previous + 'authority.json');
      previousProduct.resolver.register(authority.dependencies.dataSnapshot.content.releaseManifest);
      const context = await previousProduct.resolver.resolve({ releaseId: authority.releaseId, purpose: 'area_ability_component' });
      const runtime = previousRuntimeFor(context, authority.state); assert.equal(runtime.descriptor.runtimeVersion, '3.80.0');
      assert.deepEqual(runtime.descriptor, await read(previous + 'runtime.json'));
      const sourcePath = path.join(root, previous, 'room.sqlite'), bytes = await fs.readFile(sourcePath);
      const target = path.join(directory, 'legacy-room.sqlite');
      try { await fs.access(target); } catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(target, bytes, { flag: 'wx' }); }
      native = openWave3EngineeringRoomV1({ directory, filename: 'legacy-room.sqlite',
        rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
      const id = 'wave3-holo-round-end-injured-place'; await native.restoreDependencies(id, authority);
      const legacy = await replay(native, id, previous + 'checkpoint-r'); assert.equal(sha256(await fs.readFile(sourcePath)), sha256(bytes));
      const ref = await save('cold-recovery.json', { current: results, legacy: { ...legacy, runtimeVersion: '3.80.0',
        descriptorExact: true, originalDatabaseSha256: sha256(bytes), originalDatabaseUnchanged: true } });
      return { evidenceRef: ref, checkpointRef: ref };
    } finally { native?.close(); previousProduct.close(); }
  } },
] });
console.log(JSON.stringify({ gate: 'nova-four-weapons', status: gate.status, failures: gate.failures.length }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
export { root, makeScene };
