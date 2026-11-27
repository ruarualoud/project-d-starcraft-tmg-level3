import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createOfficialAbilityEffectIrCatalogueV1, createOfficialAbilitySourcePhasePolicyV1 }
  from '../packages/source-data/official-ability-effect-ir-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1, commitWave3RangedBatchV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { root, makeScene, runtimeFor, poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const output = 'build/ticket-28-terran-wave3-20261116-v1/source-phase-policy/';
const directory = path.join(root, output);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const releaseId = 'wave3-explicit-source-phases-v1';
const roomId = 'wave3-explicit-source-phases';
const spec = { id: 'canonical-source-phase', phase: 'assault', actor: 'marine', target: 'enemy-marine',
  weapon: 'C-14 rifle', precision: 1, bindCombatEligibility: true, bindAbilitySourcePhases: true };
const previous = 'build/ticket-28-terran-wave3-20261116-v1/lethal-hologram/melee-in-eligibility/';
const phaseMap = { 'Any Phase': 'any', 'Movement Phase': 'movement', 'Assault Phase': 'assault', 'Combat Phase': 'combat' };
const expectedChanges = ['unit:holo_decoy/surprise-any-phase@1', 'unit:nova_assault_mode/battle-preparation-any-phase@1',
  'unit:nova_stealth_mode/battle-preparation-any-phase@1', 'unit:siege_tank/large-any-phase@1'];
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n'); return output + name;
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
async function openProduct() {
  const product = registry();
  try {
    const authority = await read(output + 'native/authority.json');
    const context = await product.resolver.resolve({ releaseId, purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(output + 'native/runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory: path.join(directory, 'native'), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { authority, context, runtime, native, close() { native.close(); product.close(); } };
  } catch (error) { product.close(); throw error; }
}
async function checkpoint(product) {
  const current = await product.native.store.loadRoom(roomId);
  const name = 'native/checkpoint-r' + current.stateRevision + '.json';
  try { assert.deepEqual((await read(output + name)).envelope, current.envelope); }
  catch (error) { if (error.code !== 'ENOENT') throw error; await save(name, { envelope: current.envelope }); }
  return current;
}
async function replay(native, id, checkpointRef) {
  const current = await native.store.loadRoom(id); const journal = await native.store.loadReplayBundle(id);
  const receipts = journal.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let revision = 0; revision <= current.stateRevision; revision++) {
    const actual = native.engine.replay({ initialEnvelope: journal.initialEnvelope, journal: receipts.slice(0, revision) });
    assert.equal(actual.ok, true, JSON.stringify(actual));
    assert.deepEqual(actual.envelope, (await read(checkpointRef + revision + '.json')).envelope);
  }
  assert.deepEqual(await native.store.loadRoom(id), current);
  return { receipts: receipts.length, checkpoints: current.stateRevision + 1, exact: true };
}

await fs.mkdir(directory, { recursive: true });
const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
  factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
  sourceRef, contractVersion: 'T28-W3-08-explicit-source-phase-factory-native-and-old-replay-v1',
}, steps: [
  { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
    const input = { dataset: context.dataset, identityCatalogue: context.resources.abilityIdentities };
    const legacy = createOfficialAbilityEffectIrCatalogueV1(input);
    const policy = createOfficialAbilitySourcePhasePolicyV1(input);
    const current = createOfficialAbilityEffectIrCatalogueV1({ ...input, sourcePhasePolicy: policy });
    assert.equal(legacy.semanticVersion, '1.2.0'); assert.equal(current.semanticVersion, '1.3.0');
    const oldState = (await read(previous + 'authority.json')).state;
    assert.equal(legacy.catalogueHash, oldState.officialCharacteristicStatusFamilySourceBundle.sourceCatalogueHash);
    const changes = []; let explicit = 0, inferred = 0;
    for (const definition of current.definitions) {
      const old = legacy.definitions.find(row => row.definitionId === definition.definitionId);
      assert.equal(definition.sourceFeatureHash, old.sourceFeatureHash);
      assert.equal(definition.sourceRecordHash, old.sourceRecordHash); assert.equal(definition.payloadHash, old.payloadHash);
      const record = context.dataset.recordsByKey[definition.recordKey];
      const feature = (record.collectionId === 'army_units' ? record.payload.upgrades : record.payload.boosts)[definition.sourceIndex];
      if (feature.phase) {
        assert.equal(definition.phase, phaseMap[feature.phase]); assert.equal(definition.phaseOrigin, 'explicit_source_field'); explicit++;
      } else { assert.equal(definition.phase, old.phase); assert.equal(definition.phaseOrigin, 'description_inference'); inferred++; }
      if (definition.phase !== old.phase) changes.push({ definitionId: definition.definitionId,
        old: old.phase, current: definition.phase, sourcePhase: feature.phase });
    }
    assert.deepEqual(changes.map(row => row.definitionId), expectedChanges);
    assert.equal(explicit, 322); assert.equal(inferred, 92);
    const forged = structuredClone(policy); forged.precedence = 'description_first';
    forged.policyHash = hash(Object.fromEntries(Object.entries(forged).filter(([key]) => key !== 'policyHash')));
    assert.throws(() => createOfficialAbilityEffectIrCatalogueV1({ ...input, sourcePhasePolicy: forged }), /ABILITY_SOURCE_PHASE_POLICY_INVALID/);
    const stale = structuredClone(policy); stale.normalizedDatasetHash = '0'.repeat(64);
    stale.policyHash = hash(Object.fromEntries(Object.entries(stale).filter(([key]) => key !== 'policyHash')));
    assert.throws(() => createOfficialAbilityEffectIrCatalogueV1({ ...input, sourcePhasePolicy: stale }), /ABILITY_SOURCE_PHASE_POLICY_INVALID/);
    const scene = await makeScene(context, spec); const runtime = runtimeFor(context, scene.state);
    assert.equal(runtime.descriptor.runtimeVersion, '3.79.0');
    assert.deepEqual(scene.state.officialAbilitySourcePhasePolicy, policy);
    const bundles = ['officialCharacteristicStatusFamilySourceBundle', 'officialUnitLifecycleFamilySourceBundle', 'officialMeleeWeaponSourceBundle'];
    for (const key of bundles) assert.equal(scene.state[key].sourceCatalogueHash, current.catalogueHash, key);
    assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === expectedChanges[0]).phase, 'any');
    const bad = structuredClone(scene.state); bad.officialAbilitySourcePhasePolicy = forged;
    assert.throws(() => runtimeFor(context, bad), /CHARACTERISTIC_ABILITY_PHASE_POLICY_MISMATCH/);
    const runtimeRef = await save('native/runtime.json', runtime.descriptor); const m = context.manifest;
    const product = registry();
    try {
      product.resolver.register(createOfficialReleaseManifestV2({ releaseId, dataset: context.dataset, snapshot: context.snapshot,
        sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef, snapshotRef: m.source.snapshotRef,
        sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references, sourcePolicy: m.source.policy,
        components: { ...m.components, rulesRuntime: { ref: runtimeRef, version: runtime.descriptor.runtimeVersion,
          integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
      const resolved = await product.resolver.resolve({ releaseId, purpose: 'area_ability_component' });
      await save('native/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved, state: scene.state,
        scenario: { ...scene.scenario, currentSourcePhasePolicy: true } }));
    } finally { product.close(); }
    const ref = await save('compile.json', { definitions: current.definitions.length, explicit, inferred, changes, policy,
      sourceIdentitiesPreserved: true, legacyRawCatalogueHashPreserved: true, allFactoryBundlesShareCatalogue: bundles,
      forgedAndWrongDatasetPoliciesRejected: true, runtimeVersion: runtime.descriptor.runtimeVersion });
    return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'consume', repairRef, openProduct, check: async product => {
    const credentials = await product.native.create(roomId, product.authority); await checkpoint(product);
    const before = await product.native.store.loadRoom(roomId);
    const result = await commitWave3RangedBatchV1({ directory: path.join(directory, 'native'), native: product.native,
      runtime: product.runtime, roomId, credentials, attackerSideKey: 'player1', attackerPieceId: 'marine',
      targetPieceId: 'enemy-marine', weaponName: 'C-14 rifle', operationKey: 'shot', selectPoolParameters: poolParameters });
    for (const name of await fs.readdir(path.join(directory, 'native'))) {
      if (!name.startsWith('shot-') || !name.endsWith('.json')) continue;
      const value = await read(output + 'native/' + name); if (!value.envelope) continue;
      await save('native/checkpoint-r' + value.envelope.stateRevision + '.json', { envelope: value.envelope });
    }
    assert.equal(result.event.stages.effects.precisionValue, 1); await checkpoint(product);
    const ref = await save('consume.json', { event: result.event, query: result.query, initialRevision: before.stateRevision,
      actualCurrentFactoryAndRuntime: true, queryEqualsNativeAction: true, modelCalls: 0 });
    return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'successor', repairRef, openProduct, check: async product => {
    const credentials = await product.native.create(roomId, product.authority);
    let current = await checkpoint(product);
    if (current.envelope.state.pendingCurrentProductRangedSequence) {
      await product.native.commit({ roomId, credential: credentials.player1, operationKey: 'finish-shot', kind: 'finite',
        select: row => row.action.actionType === 'finish_ranged_attack_sequence' }); await checkpoint(product);
    }
    await product.native.commit({ roomId, credential: credentials.player1, operationKey: 'finish-activation',
      select: row => row.actionType === 'finish_activation' && row.pieceId === 'marine', parameters: () => ({}) });
    current = await checkpoint(product); assert.equal(current.envelope.state.activeSideKey, 'player2');
    const ref = await save('successor.json', { revision: current.stateRevision, nextSide: 'player2' });
    return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'coldRecovery', repairRef, openProduct, check: async product => {
    await product.native.restoreDependencies(roomId, product.authority);
    const current = await replay(product.native, roomId, output + 'native/checkpoint-r');
    const registryProduct = registry(); let native;
    try {
      const authority = await read(previous + 'authority.json');
      registryProduct.resolver.register(authority.dependencies.dataSnapshot.content.releaseManifest);
      const context = await registryProduct.resolver.resolve({ releaseId: authority.releaseId, purpose: 'area_ability_component' });
      const runtime = runtimeFor(context, authority.state);
      assert.equal(runtime.descriptor.runtimeVersion, '3.78.0');
      assert.deepEqual(runtime.descriptor, await read(previous + 'runtime.json'));
      const sourcePath = path.join(root, previous, 'room.sqlite'); const bytes = await fs.readFile(sourcePath);
      const target = path.join(directory, 'legacy-room.sqlite');
      try { await fs.access(target); }
      catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(target, bytes, { flag: 'wx' }); }
      native = openWave3EngineeringRoomV1({ directory, filename: 'legacy-room.sqlite',
        rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
      const id = 'wave3-lethal-hologram-melee-in-eligibility'; await native.restoreDependencies(id, authority);
      const legacy = await replay(native, id, previous + 'checkpoint-r');
      assert.equal(sha256(await fs.readFile(sourcePath)), sha256(bytes));
      const ref = await save('cold-recovery.json', { current, legacy: { ...legacy, runtimeVersion: '3.78.0',
        descriptorExact: true, originalDatabaseSha256: sha256(bytes), originalDatabaseUnchanged: true } });
      return { evidenceRef: ref, checkpointRef: ref };
    } finally { native?.close(); registryProduct.close(); }
  } },
] });
console.log(JSON.stringify({ gate: 'source-phase-policy', status: gate.status, failures: gate.failures.length }));
