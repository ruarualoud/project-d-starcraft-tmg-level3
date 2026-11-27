import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialReleaseManifestV2, createOfficialReleaseResolverV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialModelBaseGeometryDataBundleV1, createOfficialModelBaseGeometryDataBundleV2,
  getOfficialModelBaseGeometryProfileV1, getOfficialReleaseModelBaseGeometryBundleV2,
  verifyOfficialModelBaseGeometryDataBundleV1 } from '../packages/source-data/official-model-base-geometry-data-bundle-v1.mjs';
import { createOfficialModelBaseFootprintV1, evaluateOfficialBaseMeasurementV1,
  isOfficialPhysicalFootprintInsideBoardV1 } from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'build/ticket-28-wave3-geometry-20261112-v1/catalogue');
const referencesRef = 'content/source-releases/wave3-20261112-geometry-references-v1.json';
const bundleRef = 'content/source-releases/wave3-20261112-geometry-v2.json';
const manifestRef = 'content/source-releases/wave3-20261112-geometry-release-v2.json';
const releaseId = 'wave3-u83-c84-r50-geometry-v1';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const save = async (name, value) => {
  const file = path.join(directory, name);
  await atomicWrite(file, JSON.stringify(value, null, 2) + '\n');
  return file;
};
const references = await read(referencesRef);
const sourceIndex = await read('build/ticket-28-wave3-source-candidate-20261112-v1/source-index.json');
const baseManifest = await read('content/source-releases/wave3-20261112-army-builder-release-v2.json');
const [legacyDataset, nativeAuthority] = await Promise.all(['legacy-dataset.json', 'native-authority.json']
  .map(name => read('build/ticket-28-wave3-release-context-20261112-v1/' + name)));
const legacyBundle = nativeAuthority.state.officialModelBaseGeometryDataBundle;
await fs.mkdir(directory, { recursive: true });
function openProduct() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'releases.sqlite') });
  const resolver = createOfficialReleaseResolverV2({ store, loadArtifact: read });
  resolver.register(baseManifest);
  return { store, resolver, close: () => store.close() };
}
function modelScenePiece(dataset, bundle, recordKey, id, x, y) {
  const record = dataset.recordsByKey[recordKey];
  const profile = getOfficialModelBaseGeometryProfileV1(bundle, recordKey);
  // Host-derived identities and exact base dimensions, for a declared geometry probe.
  return { id, officialUnitRecordKey: recordKey, sourceRecordHash: record.sourceRecordHash,
    officialPayloadHash: record.payloadHash, isOnField: true, isDestroyed: false, currentModels: 1,
    models: [{ id: id + '-model', isOnField: true, isDestroyed: false, xInches: x, yInches: y,
      baseShape: profile.baseShape, baseWidthInches: profile.baseWidthMilliInches / 1000,
      baseDepthInches: profile.baseDepthMilliInches / 1000, baseRotationDegrees: 0 }] };
}
const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'),
  identity: { factoryModule: 'packages/source-data/official-release-context-v2.mjs',
    factoryExport: 'createOfficialReleaseResolverV2', sourceRef: referencesRef,
    contractVersion: 'T28-W3-06-geometry-catalogue-v1' }, steps: [
    { name: 'read', openProduct, check: async () => {
      assert.equal(createOfficialModelBaseGeometryDataBundleV1({ dataset: legacyDataset }).bundleHash, legacyBundle.bundleHash);
      const run = promisify(execFile);
      const pagesBySource = new Map();
      for (const [id, source] of Object.entries(references.sourceFiles)) {
        const intake = sourceIndex.entries.find(entry => entry.path === source.ref);
        assert.equal(source.byteHash, intake.byteHash);
        assert.equal(source.byteLength, intake.byteLength);
        const output = await run('pdftotext', ['-layout', path.join(root, source.ref), '-'], { maxBuffer: 4 * 1024 * 1024 });
        pagesBySource.set(id, output.stdout.split('\f'));
      }
      for (const profile of references.profiles) {
        const text = pagesBySource.get(profile.sourceId)[profile.pdfPage - 1];
        assert(text.includes(profile.printedBase), profile.recordKey + ' physical label absent');
      }
      await fs.access(path.join(root, references.visualReviewRef));
      assert.equal(references.profiles.length, 18);
      assert.deepEqual(references.missingProfiles.map(entry => entry.recordKey), ['army_units:raven']);
      const evidenceRef = await save('sources.json', { frozenSourcesReused: true, legacyBundleUnchanged: legacyBundle.bundleHash,
        labelledNewProfiles: 18, missing: references.missingProfiles, visuallyReviewed: references.visualReviewRef,
        modelCalls: 0, sourceRefreshPerformed: false });
      return { evidenceRef, checkpointRef: referencesRef };
    } },
    { name: 'compile', openProduct, check: async product => {
      const context = await product.resolver.resolve({ releaseId: baseManifest.releaseId, purpose: 'catalogue' });
      const bundle = createOfficialModelBaseGeometryDataBundleV2({ context, legacyBundle, references });
      assert.equal(bundle.profiles.length, 44);
      assert.equal(bundle.unitRecordKeys.length, 45);
      assert.equal(bundle.profileDenominatorComplete, false);
      assert.equal(bundle.profiles.filter(profile => profile.baseShape === 'rectangle').length, 1);
      assert.throws(() => getOfficialModelBaseGeometryProfileV1(bundle, 'army_units:raven'), /MODEL_BASE_GEOMETRY_SOURCE_MISSING/);
      const conflict = structuredClone(references);
      conflict.sourceDatasetHash = legacyDataset.datasetHash;
      const { manifestHash: omitted, ...conflictBody } = conflict;
      conflict.manifestHash = hashStarcraftTmgContract(conflictBody);
      assert.throws(() => createOfficialModelBaseGeometryDataBundleV2({ context, legacyBundle, references: conflict }),
        /MODEL_BASE_GEOMETRY_REFERENCES_INVALID/);
      await atomicWrite(path.join(root, bundleRef), JSON.stringify(bundle, null, 2) + '\n');
      const revision = await read(baseManifest.source.sourceRevisionRef);
      const manifest = createOfficialReleaseManifestV2({ releaseId, status: 'candidate',
        snapshot: context.snapshot, dataset: context.dataset, sourceRevision: revision,
        snapshotRef: baseManifest.source.snapshotRef, datasetRef: baseManifest.source.datasetRef,
        sourceRevisionRef: baseManifest.source.sourceRevisionRef, referenceSources: baseManifest.source.references,
        sourcePolicy: baseManifest.source.policy, components: { ...baseManifest.components,
          geometry: { ref: bundleRef, version: bundle.version, integrity: { field: 'bundleHash', value: bundle.bundleHash } } } });
      await atomicWrite(path.join(root, manifestRef), JSON.stringify(manifest, null, 2) + '\n');
      product.resolver.register(manifest);
      const evidenceRef = await save('compile.json', { bundleHash: bundle.bundleHash, manifestHash: manifest.manifestHash,
        profiles: 44, explicitMissingProfiles: 1, sourceConflictRejected: true, legacyReboundIdentities: 26, newProfiles: 18,
        fullWave3BattleRelease: false, providerCalls: 0 });
      return { evidenceRef, checkpointRef: manifestRef };
    } },
    { name: 'consume', openProduct, check: async product => {
      product.resolver.register(await read(manifestRef));
      const context = await product.resolver.resolve({ releaseId, purpose: 'geometry' });
      const bundle = getOfficialReleaseModelBaseGeometryBundleV2(context);
      const tank = modelScenePiece(context.dataset, bundle, 'army_units:siege_tank', 'tank', 10, 10);
      const marine = modelScenePiece(context.dataset, bundle, 'army_units:marine', 'marine', 20, 10);
      const state = { pieces: [tank, marine] };
      const measured = evaluateOfficialBaseMeasurementV1({ state, dataBundle: bundle,
        source: { kind: 'model', unitId: 'tank', modelId: 'tank-model' },
        target: { kind: 'model', unitId: 'marine', modelId: 'marine-model' } });
      assert.equal(measured.distanceMilliInches, 6417);
      const footprint = createOfficialModelBaseFootprintV1({ piece: tank, model: tank.models[0], dataBundle: bundle,
        position: { xMilliInches: 2900, yMilliInches: 10000 } });
      assert.equal(isOfficialPhysicalFootprintInsideBoardV1({ footprint, widthMilliInches: 54000, heightMilliInches: 36000 }), false);
      const inside = createOfficialModelBaseFootprintV1({ piece: tank, model: tank.models[0], dataBundle: bundle,
        position: { xMilliInches: 3000, yMilliInches: 10000 } });
      assert.equal(isOfficialPhysicalFootprintInsideBoardV1({ footprint: inside, widthMilliInches: 54000, heightMilliInches: 36000 }), true);
      const hydralisk = modelScenePiece(context.dataset, bundle, 'army_units:hydralisk', 'hydralisk', 20, 20);
      const rectangle = createOfficialModelBaseFootprintV1({ piece: hydralisk, model: hydralisk.models[0], dataBundle: bundle,
        position: { xMilliInches: 20000, yMilliInches: 20000, rotationDegrees: 90 } });
      assert.equal(rectangle.shape, 'rectangle');
      for (const profile of bundle.profiles) {
        const piece = modelScenePiece(context.dataset, bundle, profile.recordKey, profile.recordKey, 20, 20);
        createOfficialModelBaseFootprintV1({ piece, model: piece.models[0], dataBundle: bundle });
      }
      const oldMarine = nativeAuthority.state.pieces.find(piece => piece.officialUnitRecordKey === 'army_units:marine');
      assert.throws(() => createOfficialModelBaseFootprintV1({ piece: oldMarine, model: oldMarine.models[0], dataBundle: bundle }),
        /MODEL_BASE_GEOMETRY_OFFICIAL_PROFILE_INVALID/);
      assert.throws(() => getOfficialReleaseModelBaseGeometryBundleV2({ ...context, dataset: legacyDataset }),
        /OFFICIAL_RELEASE_SOURCE_MISMATCH/);
      const tampered = structuredClone(bundle);
      tampered.profiles[0].baseWidthMilliInches += 1;
      assert.throws(() => verifyOfficialModelBaseGeometryDataBundleV1(tampered), /MODEL_BASE_GEOMETRY_DATA_BUNDLE_V2_INVALID/);
      await assert.rejects(product.resolver.resolve({ releaseId, purpose: 'battle' }), /OFFICIAL_RELEASE_COMPONENTS_MISSING/);
      const evidenceRef = await save('consumer.json', { outerReleaseResolutionUsed: true,
        nativeGeometryKernelConsumedAllProfiles: 44, nearestBaseDistance: measured, fullBaseContainment: [false, true],
        rectangularProfileRetained: rectangle, staleUnitIdentityAndMixedReleaseRejected: true,
        missingRavenDoesNotBecome40mm: true, incompleteBattleEntryRejected: true, providerCalls: 0 });
      return { evidenceRef, checkpointRef: path.join(directory, 'releases.sqlite') };
    } },
    { name: 'successor', openProduct, check: async product => {
      const manifest = await read(manifestRef);
      product.resolver.register(manifest);
      const binding = await product.resolver.bind({ subjectKind: 'geometry_probe', subjectId: 'large-base-boundary',
        releaseId, purpose: 'geometry' });
      const resolved = await product.resolver.resolveSubject({ subjectKind: 'geometry_probe', subjectId: 'large-base-boundary' });
      const bundle = getOfficialReleaseModelBaseGeometryBundleV2(resolved);
      assert.equal(binding.manifestHash, manifest.manifestHash);
      assert.equal(product.store.readDefault('battle').releaseId, null);
      assert.equal(product.store.readDefault('geometry').releaseId, null);
      const evidenceRef = await save('successor.json', { binding, bundleHash: bundle.bundleHash,
        subjectResolvedThroughOuterProduct: true, defaultPointersNotWritten: true,
        proofScope: 'release_component_loading_and_geometry_queries_only', providerCalls: 0 });
      return { evidenceRef, checkpointRef: path.join(directory, 'releases.sqlite') };
    } },
    { name: 'coldRecovery', openProduct, check: async product => {
      const resolved = await product.resolver.resolveSubject({ subjectKind: 'geometry_probe', subjectId: 'large-base-boundary' });
      const bundle = getOfficialReleaseModelBaseGeometryBundleV2(resolved);
      const successor = JSON.parse(await fs.readFile(path.join(directory, 'successor.json'), 'utf8'));
      assert.equal(bundle.bundleHash, successor.bundleHash);
      assert.deepEqual(resolved.binding, successor.binding);
      assert.throws(() => getOfficialModelBaseGeometryProfileV1(bundle, 'army_units:raven'), /FLIGHT_STAND_PHYSICAL_FOOTPRINT_UNSPECIFIED/);
      const evidenceRef = await save('cold-recovery.json', { explicitReleaseAndGeometryPreserved: true,
        profiles: bundle.profiles.length, missingProfiles: bundle.missingProfiles, providerCalls: 0 });
      return { evidenceRef, checkpointRef: path.join(directory, 'releases.sqlite') };
    } },
  ] });
console.log(JSON.stringify({ status: result.status, passed: Object.keys(result.passed), profiles: 44, missing: 1, providerCalls: 0 }));
