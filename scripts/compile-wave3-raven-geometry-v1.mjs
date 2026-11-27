import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { atomicWrite } from './lib/development-context.mjs';
import { createOfficialReleaseManifestV2, createOfficialReleaseResolverV2 } from
  '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialWave3CommunityGeometryV1 } from '../packages/source-data/official-wave3-community-geometry-profile-v1.mjs';
import { createOfficialMeasuredRavenGeometryBundleV2 } from '../packages/source-data/official-model-base-geometry-data-bundle-v1.mjs';
import { createOfficialUnitCardSupplyDataBundleV2, getOfficialReleaseUnitCardSupplyDataBundleV2 } from
  '../packages/source-data/official-unit-card-supply-data-bundle-v1.mjs';
import {
  createOfficialBattlefieldAssetComponentProfileV1, createOfficialBattlefieldAssetComponentProfileV2,
  extendOfficialBattlefieldAssetComponentProfileWithBurrowV2, extendOfficialBattlefieldAssetComponentProfileWithForceWallV2,
  getOfficialReleaseBattlefieldAssetComponentProfileV2, verifyOfficialBattlefieldAssetComponentProfileV2,
} from '../packages/source-data/official-battlefield-asset-component-profile-v1.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const sources = 'content/source-releases/';
const extentRef = sources + 'wave3-20261121-raven-extent-geometry-release-v1.json';

function localFile(ref) {
  if (typeof ref !== 'string' || !ref || ref.includes('\\') || path.isAbsolute(ref)
    || path.posix.normalize(ref) !== ref || ref === '..' || ref.startsWith('../')) {
    throw Error('RAVEN_GEOMETRY_LOCAL_REFERENCE_REQUIRED');
  }
  return path.join(root, ref);
}

async function read(ref) {
  return JSON.parse(await fs.readFile(localFile(ref), 'utf8'));
}

export async function compileWave3RavenGeometryV1({
  settingsRef = sources + 'wave3-20261124-raven-tabletop-settings-v1.json',
  referenceManifestRef, outputRef, releaseId,
}) {
  if (!outputRef?.startsWith('build/') || !releaseId) throw Error('RAVEN_GEOMETRY_OUTPUT_AND_RELEASE_ID_REQUIRED');
  const directory = localFile(outputRef);
  const [settings, reference, extent, references, confirmation, forceWall] = await Promise.all([
    read(settingsRef), read(referenceManifestRef), read(extentRef),
    read(sources + 'wave3-20261112-battlefield-component-references-v1.json'),
    read(sources + 'wave3-20261116-deep-tunnel-dimension-v1.json'),
    read(sources + 'wave3-20261121-force-wall-assembly-reference-v1.json'),
  ]);
  if (reference.releaseId === releaseId || extent.releaseId === releaseId
    || reference.source.snapshotHash !== extent.source.snapshotHash
    || reference.source.datasetHash !== extent.source.datasetHash
    || reference.source.sourceRevisionHash !== extent.source.sourceRevisionHash
    || reference.components.armyBuilder.integrity?.value !== extent.components.armyBuilder.integrity?.value) {
    throw Error('RAVEN_GEOMETRY_REFERENCE_RELEASE_MISMATCH');
  }
  if (settings.raven?.measurement?.shape !== 'measured_contour') throw Error('RAVEN_GEOMETRY_MEASURED_CONTOUR_REQUIRED');
  const [sourceRevision, ravenContourSourceBytes, existingAssets] = await Promise.all([
    read(extent.source.sourceRevisionRef),
    fs.readFile(localFile(settings.raven.measurement.ref)),
    read(reference.components.battlefieldAssets.ref),
  ]);
  if (settings.raven.measurement.kind === 'annotated_assembly_estimate') {
    const record = JSON.parse(ravenContourSourceBytes);
    const attachment = await fs.readFile(localFile(record.source.attachmentRef));
    if (attachment.length !== record.source.byteLength
      || createHash('sha256').update(attachment).digest('hex') !== record.source.sha256
      || !isDeepStrictEqual(record.localVerticesMilliInches, settings.raven.localVerticesMilliInches)) {
      throw Error('RAVEN_ASSEMBLY_ESTIMATE_EVIDENCE_MISMATCH');
    }
  }
  verifyOfficialBattlefieldAssetComponentProfileV2(existingAssets);
  if (reference.components.battlefieldAssets.integrity?.field !== 'profileHash'
    || reference.components.battlefieldAssets.integrity.value !== existingAssets.profileHash) {
    throw Error('RAVEN_GEOMETRY_BATTLEFIELD_ASSET_REFERENCE_MISMATCH');
  }
  const artifacts = new Map();
  function component(name, version, field, value) {
    const ref = outputRef + '/' + name + '.json';
    artifacts.set(ref, value);
    return { ref, version, integrity: { field, value: value[field] } };
  }

  const store = createSqliteOfficialReleaseStoreV1({ filename: ':memory:' });
  try {
    const resolver = createOfficialReleaseResolverV2({ store, loadArtifact: ref => artifacts.has(ref) ? artifacts.get(ref) : read(ref) });
    resolver.register(extent);
    resolver.register(reference);
    const context = await resolver.resolve({ releaseId: extent.releaseId, purpose: 'geometry' });
    const builderContext = await resolver.resolve({ releaseId: extent.releaseId, purpose: 'army_building' });
    const { dataset, snapshot } = context;
    const manifestOf = (id, components) => createOfficialReleaseManifestV2({
      releaseId: id, dataset, snapshot, sourceRevision, components,
      datasetRef: extent.source.datasetRef, snapshotRef: extent.source.snapshotRef,
      sourceRevisionRef: extent.source.sourceRevisionRef, sourcePolicy: extent.source.policy,
      referenceSources: extent.source.references,
    });

    const profile = createOfficialWave3CommunityGeometryV1({ context, settings, ravenContourSourceBytes });
    const wave3CommunityGeometry = component('profile', profile.settings.revision, 'profileHash', profile);
    const compileManifest = manifestOf(releaseId + '-extent', { ...extent.components, wave3CommunityGeometry });
    resolver.register(compileManifest);
    const [baseContext, profileContext] = await Promise.all([
      resolver.resolve({ releaseId: compileManifest.releaseId, purpose: 'geometry' }),
      resolver.resolve({ releaseId: compileManifest.releaseId, purpose: 'wave3_community_geometry' }),
    ]);
    const modelGeometry = createOfficialMeasuredRavenGeometryBundleV2({ ...baseContext, resources: {
      ...baseContext.resources, wave3CommunityGeometry: profileContext.resources.wave3CommunityGeometry,
    } });
    const geometry = component('catalogue', modelGeometry.version, 'bundleHash', modelGeometry);

    const geometryManifest = manifestOf(releaseId + '-geometry', { ...extent.components, geometry, wave3CommunityGeometry });
    resolver.register(geometryManifest);
    const geometryContext = await resolver.resolve({ releaseId: geometryManifest.releaseId, purpose: 'geometry' });
    const legacyProfile = createOfficialBattlefieldAssetComponentProfileV1();
    const baseAssets = createOfficialBattlefieldAssetComponentProfileV2({ context: geometryContext, legacyProfile, references });
    const burrowAssets = extendOfficialBattlefieldAssetComponentProfileWithBurrowV2({ context: geometryContext, profile: baseAssets, confirmation });
    const assets = extendOfficialBattlefieldAssetComponentProfileWithForceWallV2({ context: geometryContext, profile: burrowAssets, reference: forceWall });
    if (!isDeepStrictEqual(assets.componentEvidence, existingAssets.componentEvidence)
      || !isDeepStrictEqual(assets.unresolvedComponentEvidence, existingAssets.unresolvedComponentEvidence)) {
      throw Error('RAVEN_GEOMETRY_BATTLEFIELD_ASSET_EVIDENCE_CHANGED');
    }
    const armyBuilderUnitDataBundle = builderContext.resources.armyBuilder.armyResourceBudgetDataBundle
      .factionArmyEligibilityDataBundle.unitDataBundle;
    const attributes = createOfficialUnitCardSupplyDataBundleV2({ dataset, snapshot,
      releaseContext: geometryContext, modelBaseGeometryDataBundle: modelGeometry, armyBuilderUnitDataBundle });

    // The rules runtime must be compiled against the new state by its own factory.
    const manifest = manifestOf(releaseId, {
      ...extent.components, geometry, wave3CommunityGeometry,
      unitCharacteristics: component('unit-characteristics', attributes.version, 'bundleHash', attributes),
      battlefieldAssets: component('battlefield-components', assets.semanticVersion, 'profileHash', assets),
    });
    resolver.register(manifest);
    getOfficialReleaseUnitCardSupplyDataBundleV2(await resolver.resolve({ releaseId, purpose: 'unit_characteristics' }));
    getOfficialReleaseBattlefieldAssetComponentProfileV2(await resolver.resolve({ releaseId, purpose: 'battlefield_assets' }));
    await fs.mkdir(path.dirname(directory), { recursive: true });
    await fs.mkdir(directory);
    for (const [ref, value] of artifacts) await atomicWrite(localFile(ref), JSON.stringify(value, null, 2) + '\n');
    await atomicWrite(localFile(outputRef + '/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    return manifest;
  } finally {
    store.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const [settingsRef, referenceManifestRef, outputRef, releaseId] = args.length === 3 ? [undefined, ...args] : args;
  const manifest = await compileWave3RavenGeometryV1({ settingsRef, referenceManifestRef, outputRef, releaseId });
  process.stdout.write(JSON.stringify({ releaseId: manifest.releaseId, manifest: outputRef + '/manifest.json' }) + '\n');
}
