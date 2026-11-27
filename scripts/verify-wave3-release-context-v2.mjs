import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialAbilityEffectIrCatalogueV1 } from '../packages/source-data/official-ability-effect-ir-v1.mjs';
import { createOfficialAbilityIdentityRegistryV2, compileOfficialAbilityIdentityCatalogueV2,
  resolveOfficialAbilityIdentityV2, reviseOfficialAbilityIdentityRegistryV2 } from '../packages/source-data/official-ability-identity-v2.mjs';
import { createOfficialReleaseManifestV2, createOfficialReleaseResolverV2,
  officialReleaseQueryScopeV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createRosterPlanningProductModuleV1 } from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import { createOfficialSelectedRosterAbilityImplementationBindingsV1 } from '../packages/product-composition/official-selected-roster-ability-runtime-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'build/ticket-28-wave3-release-context-20261112-v1');
const intake = 'build/ticket-28-wave3-source-candidate-20261112-v1';
const registryFile = 'content/source-releases/wave3-20261112-feature-registry-v2.json';
const local = relative => path.join(root, relative);
const read = async relative => JSON.parse(await fs.readFile(local(relative), 'utf8'));
const save = async (name, value) => {
  const file = path.join(output, name);
  await atomicWrite(file, JSON.stringify(value, null, 2) + '\n');
  return file;
};
const artifact = async ref => JSON.parse(await fs.readFile(local(ref), 'utf8'));
const ids = { old: 'legacy-u71-c69-r48-catalogue-v1', current: 'wave3-u83-c84-r50-catalogue-v1' };
function openRegistry() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(output, 'releases.sqlite') });
  return { store, resolver: createOfficialReleaseResolverV2({ store, loadArtifact: artifact }), close: () => store.close() };
}
function syntheticDataset(dataset, mutate) {
  const value = structuredClone(dataset);
  mutate(value);
  for (const record of Object.values(value.recordsByKey)) {
    record.payloadHash = hashStarcraftTmgContract(record.payload);
    record.sourceRecordHash = hashStarcraftTmgContract({ faultInjectionOnly: true, payload: record.payload });
    const row = value.recordIndex.find(item => item.recordKey === record.recordKey);
    row.payloadHash = record.payloadHash;
    row.sourceRecordHash = record.sourceRecordHash;
  }
  value.recordIndexHash = hashStarcraftTmgContract(value.recordIndex);
  const { datasetHash, recordsByKey, ...body } = value;
  value.datasetHash = hashStarcraftTmgContract(body);
  return value;
}

const boundary = await runProductBoundaryCheck({
  directory: path.join(output, 'verification'),
  identity: { factoryModule: 'packages/source-data/official-release-context-v2.mjs',
    factoryExport: 'createOfficialReleaseResolverV2',
    sourceRef: intake + '/source-index.json', contractVersion: 'T28-W3-02-source-identity-v1' },
  steps: [
    { name: 'read', openProduct: async () => ({
      frozen: await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: path.resolve(root, '../..') }),
      current: await read(intake + '/compiled/dataset.json'),
    }), check: async ({ frozen, current }) => {
      const ledger = await read(intake + '/compiled/import-ledger.json');
      const previousRevision = ledger.revisions.find(item => item.normalizedDatasetHash === frozen.dataset.datasetHash);
      assert.ok(previousRevision);
      await save('legacy-dataset.json', frozen.dataset);
      await save('legacy-snapshot.json', frozen.snapshot);
      await save('legacy-revision.json', previousRevision);
      const evidenceRef = await save('read.json', { oldDatasetHash: frozen.dataset.datasetHash,
        newDatasetHash: current.datasetHash, oldUnits: frozen.dataset.recordIndex.filter(row => row.collectionId === 'army_units').length,
        newUnits: current.recordIndex.filter(row => row.collectionId === 'army_units').length });
      return { evidenceRef, checkpointRef: evidenceRef };
    } },
    { name: 'compile', repairRef: 'T28-W3-02-semantic-linkedTo-coverage', openProduct: async () => ({
      previous: await read(path.relative(root, path.join(output, 'legacy-dataset.json'))),
      current: await read(intake + '/compiled/dataset.json'),
    }), check: async ({ previous, current }) => {
      const registry = createOfficialAbilityIdentityRegistryV2({ dataset: current, classificationOverrides: [{
        recordKey: 'army_units:bile_launcher', name: 'Indomitable', phase: 'Assault Phase', activationKind: 'passive',
        reason: 'Source text modifies targeting while Engaged and declares no action or payment.',
      }] });
      const catalogue = compileOfficialAbilityIdentityCatalogueV2({ dataset: current, registry, historicalDatasets: [previous] });
      assert.equal(catalogue.definitions.length, 414);
      const oldBindings = createOfficialSelectedRosterAbilityImplementationBindingsV1(previous);
      const baselineText = (await fs.readFile(path.join(output, 'legacy-ability-ir-baseline.mjs'), 'utf8'))
        .replace('"../authoritative-engine/referee-crypto-v1.mjs"', JSON.stringify(pathToFileURL(local('packages/authoritative-engine/referee-crypto-v1.mjs')).href));
      const baseline = await import('data:text/javascript;base64,' + Buffer.from(baselineText).toString('base64'));
      const oldIr = baseline.createOfficialAbilityEffectIrCatalogueV1({ dataset: previous, executionBindings: oldBindings });
      assert.deepEqual(createOfficialAbilityEffectIrCatalogueV1({ dataset: previous, executionBindings: oldBindings }), oldIr);
      for (const definition of oldIr.definitions) {
        assert.ok(resolveOfficialAbilityIdentityV2(catalogue, {
          definitionId: definition.definitionId, sourceSnapshotHash: previous.sourceSnapshotHash,
        }));
      }
      const queen = catalogue.definitions.filter(item => item.recordKey === 'army_units:queen' && item.semanticId.includes('/talons-'));
      assert.equal(queen.length, 2);
      assert.notEqual(queen[0].definitionId, queen[1].definitionId);
      const nativeBindings = createOfficialSelectedRosterAbilityImplementationBindingsV1(current);
      const byHash = new Map(catalogue.definitions.map(item => [item.sourceFeatureHash, item]));
      const stableBindings = nativeBindings.map(({ sourceFeatureHash, ...binding }) => ({
        ...binding, definitionId: byHash.get(sourceFeatureHash).definitionId,
      }));
      const stableIr = createOfficialAbilityEffectIrCatalogueV1({ dataset: current, identityCatalogue: catalogue,
        executionBindings: stableBindings });
      assert.equal(stableIr.definitions.length, 414);
      assert.equal(stableIr.denominator.executableExact, nativeBindings.length);
      const reordered = syntheticDataset(current, value => {
        value.recordsByKey['army_units:marine'].payload.small.cost += 5;
        value.recordsByKey['army_units:queen'].payload.upgrades.reverse();
      });
      const reorderedCatalogue = compileOfficialAbilityIdentityCatalogueV2({ dataset: reordered, registry });
      assert.deepEqual(reorderedCatalogue.definitions.map(item => item.definitionId).sort(),
        catalogue.definitions.map(item => item.definitionId).sort());
      const reorderedIr = createOfficialAbilityEffectIrCatalogueV1({ dataset: reordered,
        identityCatalogue: reorderedCatalogue, executionBindings: stableBindings });
      assert.equal(reorderedIr.denominator.executableExact, nativeBindings.length);
      const linkedChange = syntheticDataset(current, value => {
        value.recordsByKey['army_units:marine'].payload.upgrades[0].linkedTo = 'test-only changed linked equipment';
      });
      assert.throws(() => compileOfficialAbilityIdentityCatalogueV2({ dataset: linkedChange, registry }),
        /OFFICIAL_ABILITY_SEMANTIC_VERSION_REVIEW_REQUIRED/);
      const changed = syntheticDataset(current, value => {
        value.recordsByKey['army_units:marine'].payload.upgrades[0].description += ' Test-only changed behavior.';
      });
      assert.throws(() => compileOfficialAbilityIdentityCatalogueV2({ dataset: changed, registry }),
        /OFFICIAL_ABILITY_SEMANTIC_VERSION_REVIEW_REQUIRED/);
      const feature = changed.recordsByKey['army_units:marine'].payload.upgrades[0];
      const entry = catalogue.definitions.find(item => item.recordKey === 'army_units:marine' && item.sourceIndex === 0);
      const revised = reviseOfficialAbilityIdentityRegistryV2({ registry, semanticId: entry.semanticId, feature });
      const revisedCatalogue = compileOfficialAbilityIdentityCatalogueV2({ dataset: changed, registry: revised });
      assert.equal(revisedCatalogue.definitions.find(item => item.semanticId === entry.semanticId).semanticVersion, 2);
      try { assert.deepEqual(await read(registryFile), registry); }
      catch (error) {
        if (error.code !== 'ENOENT') throw error;
        await atomicWrite(local(registryFile), JSON.stringify(registry, null, 2) + '\n');
      }
      await save('ability-identities-v2.json', catalogue);
      await save('stable-ir-v2.json', stableIr);
      const evidenceRef = await save('compile-v2.json', { definitions: 414, oldAliasesVerified: oldIr.definitions.length,
        oldIrByteEquivalent: true, queenTalonsIds: queen.map(item => item.definitionId),
        actualAdapterRegistrations: nativeBindings.length, priceAndReorderStable: true,
        changedBehaviorRequiresRevision: true, changedLinkedEquipmentRequiresRevision: true, faultInjectionScope: 'identity invariants only, no official source claims' });
      return { evidenceRef, checkpointRef: evidenceRef };
    } },
    { name: 'consume', openProduct: async () => openRegistry(), check: async ({ store, resolver }) => {
      const current = await read(intake + '/compiled/dataset.json');
      const oldDataset = await artifact(path.relative(root, path.join(output, 'legacy-dataset.json')));
      const oldSnapshot = await artifact(path.relative(root, path.join(output, 'legacy-snapshot.json')));
      const currentSnapshot = await read(intake + '/compiled/snapshot.json');
      const sourcePolicy = (await read(intake + '/source-index.json')).primaryDataPolicy;
      const oldManifest = createOfficialReleaseManifestV2({ releaseId: ids.old,
        dataset: oldDataset, snapshot: oldSnapshot,
        snapshotRef: path.relative(root, path.join(output, 'legacy-snapshot.json')),
        datasetRef: path.relative(root, path.join(output, 'legacy-dataset.json')),
        sourceRevisionRef: path.relative(root, path.join(output, 'legacy-revision.json')),
        sourcePolicy });
      const currentManifest = createOfficialReleaseManifestV2({ releaseId: ids.current,
        dataset: current, snapshot: currentSnapshot,
        snapshotRef: intake + '/compiled/snapshot.json', datasetRef: intake + '/compiled/dataset.json',
        sourceRevisionRef: intake + '/compiled/candidate-revision.json', sourcePolicy,
        components: { abilityIdentities: { ref: path.relative(root, path.join(output, 'ability-identities-v2.json')), version: '2' } } });
      resolver.register(oldManifest);
      resolver.register(currentManifest);
      await save('legacy-release.json', oldManifest);
      await save('wave3-release.json', currentManifest);
      const initial = store.readDefault('catalogue');
      if (!initial.releaseId) resolver.setDefault({ releaseId: ids.old, expectedGeneration: initial.generation });
      await resolver.bind({ subjectKind: 'catalogue_session', subjectId: 'old', releaseId: ids.old, purpose: 'catalogue' });
      const selected = store.readDefault('catalogue');
      if (selected.releaseId !== ids.current) resolver.setDefault({ releaseId: ids.current, expectedGeneration: selected.generation });
      await resolver.bind({ subjectKind: 'catalogue_session', subjectId: 'new', releaseId: ids.current, purpose: 'catalogue' });
      assert.equal((await resolver.resolve()).manifest.releaseId, ids.current);
      assert.equal((await resolver.resolveSubject({ subjectKind: 'catalogue_session', subjectId: 'old' })).dataset.recordsByKey['army_units:marine'].payload.small.cost, 160);
      assert.equal((await resolver.resolveSubject({ subjectKind: 'catalogue_session', subjectId: 'new' })).dataset.recordsByKey['army_units:marine'].payload.small.cost, 170);
      await assert.rejects(createRosterPlanningProductModuleV1({ root,
        dataDirectory: path.join(output, 'product-guard'), fixtureRoot: path.join(output, 'missing-fixture'),
        releaseResolver: resolver, releaseId: ids.current }), error => error.code === 'OFFICIAL_RELEASE_COMPONENTS_MISSING'
          && error.detail.includes('roomFactory') && error.detail.includes('armyBuilder'));
      const before = officialReleaseQueryScopeV2({ manifest: oldManifest, stateRevision: 1, queryKind: 'base_edge_distance', parameters: {} });
      const after = officialReleaseQueryScopeV2({ manifest: currentManifest, stateRevision: 1, queryKind: 'base_edge_distance', parameters: {} });
      assert.notEqual(before, after);
      const evidenceRef = await save('consume.json', { releases: ids, marinePrices: [160, 170],
        subjects: ['old', 'new'], formalProductMissingComponentsReturned: true,
        crossReleaseCacheScopesDiffer: true, purpose: 'catalogue, not live rooms' });
      return { evidenceRef, checkpointRef: path.join(output, 'releases.sqlite') };
    } },
    { name: 'successor', openProduct: async () => openRegistry(), check: async ({ store, resolver }) => {
      const second = openRegistry();
      try {
        const prior = second.store.readDefault('catalogue');
        resolver.setDefault({ releaseId: ids.old, expectedGeneration: prior.generation });
        assert.throws(() => second.resolver.setDefault({ releaseId: ids.current, expectedGeneration: prior.generation }),
          /OFFICIAL_RELEASE_POINTER_STALE/);
      } finally { second.close(); }
      const binding = await resolver.resolveSubject({ subjectKind: 'catalogue_session', subjectId: 'new' });
      assert.equal(binding.manifest.releaseId, ids.current);
      await assert.rejects(resolver.bind({ subjectKind: 'catalogue_session', subjectId: 'new', releaseId: ids.old }),
        /OFFICIAL_RELEASE_SUBJECT_ALREADY_BOUND/);
      const evidenceRef = await save('successor.json', { pointer: store.readDefault('catalogue'),
        boundNewReleaseAfterDefaultRollback: binding.manifest.releaseId, staleWriteRejected: true });
      return { evidenceRef, checkpointRef: path.join(output, 'releases.sqlite') };
    } },
    { name: 'coldRecovery', openProduct: async () => openRegistry(), check: async ({ store, resolver }) => {
      const previous = await resolver.resolveSubject({ subjectKind: 'catalogue_session', subjectId: 'old' });
      const current = await resolver.resolveSubject({ subjectKind: 'catalogue_session', subjectId: 'new' });
      assert.equal(previous.dataset.recordsByKey['army_units:marine'].payload.small.cost, 160);
      assert.equal(current.dataset.recordsByKey['army_units:marine'].payload.small.cost, 170);
      const historical = await resolver.resolveHistoricalSource({ snapshotHash: previous.dataset.sourceSnapshotHash,
        datasetHash: previous.dataset.datasetHash });
      assert.equal(historical.manifest.releaseId, ids.old);
      await assert.rejects(resolver.resolveHistoricalSource({ snapshotHash: 'missing', datasetHash: 'missing' }),
        /OFFICIAL_RELEASE_HISTORICAL_SOURCE_UNRESOLVED/);
      const evidenceRef = await save('coldRecovery.json', { default: store.readDefault('catalogue'),
        boundVersions: [previous.manifest.source.versions, current.manifest.source.versions],
        oldSourceExact: true, unknownSourceRejected: true });
      return { evidenceRef, checkpointRef: path.join(output, 'releases.sqlite') };
    } },
  ],
});
console.log(JSON.stringify({ status: boundary.status, passed: Object.keys(boundary.passed),
  paidCalls: 0, liveRoomActions: 0, remaining: ['Room/Query/worker/Skill full consumers', 'available Wave3 runtime dependencies'] }, null, 2));
