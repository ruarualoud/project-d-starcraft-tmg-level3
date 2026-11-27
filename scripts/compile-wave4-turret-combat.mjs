import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { compileWave4HostileIncubation } from './compile-wave4-hostile-incubation.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { createOfficialReleaseManifestV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createOfficialArmyBuilderCatalogueV2 } from '../packages/source-data/official-army-builder-catalogue-v2.mjs';
import { createOfficialUnitCardSupplyDataBundleV2 } from '../packages/source-data/official-unit-card-supply-data-bundle-v1.mjs';
import { rebindOfficialUnchangedModelGeometryV2, createOfficialEngineeringImageGeometryV1 } from '../packages/source-data/official-model-base-geometry-data-bundle-v1.mjs';
import { createOfficialWave3CommunityGeometryV1 } from '../packages/source-data/official-wave3-community-geometry-profile-v1.mjs';

export const TURRET_COMBAT_DIRECTORY = 'build/wave4-web/turret-combat/candidate';
export async function compileWave4TurretCombat(root) {
  const inputs = await compileWave4HostileIncubation(root, { geometryEstimate: true });
  const { dataset, snapshot, scope, estimate, read } = inputs;
  const parent = inputs.context.manifest;
  const sourceRevision = await read(parent.source.sourceRevisionRef);
  const manifestFor = components => createOfficialReleaseManifestV2({ releaseId: 'wave4-u98-c88-r50-turret-combat-engineering-v1',
    dataset, snapshot, sourceRevision, sourceRevisionRef: parent.source.sourceRevisionRef,
    datasetRef: parent.source.datasetRef, snapshotRef: parent.source.snapshotRef, sourcePolicy: parent.source.policy,
    referenceSources: parent.source.references, components });
  const context = { dataset, snapshot, manifest: manifestFor({}), allowEngineeringEstimatedGeometry: true };
  const priorManifest = await read(inputs.seed.setup.releaseRef);
  const previousCommunity = await read(priorManifest.components.wave3CommunityGeometry.ref);
  const wave3CommunityGeometry = createOfficialWave3CommunityGeometryV1({ context, settings: previousCommunity.settings,
    ravenContourSourceBytes: await fs.readFile(path.join(root, previousCommunity.settings.raven.measurement.ref)) });
  const communityBinding = { ref: TURRET_COMBAT_DIRECTORY + '/wave3CommunityGeometry.json',
    version: priorManifest.components.wave3CommunityGeometry.version,
    integrity: { field: 'profileHash', value: wave3CommunityGeometry.profileHash } };
  context.manifest = manifestFor({ wave3CommunityGeometry: communityBinding });
  context.resources = { wave3CommunityGeometry };
  const armyBuilder = createOfficialArmyBuilderCatalogueV2({ dataset, snapshot, releaseContext: context,
    legacyPolicyBundle: await read('content/source-releases/wave3-20261112-army-builder-v2.json'), sourceRecordKeys: scope.sourceRecordKeys });
  const ordinaryAndRaven = rebindOfficialUnchangedModelGeometryV2({ context,
    previousBundle: inputs.seed.state.officialModelBaseGeometryDataBundle, retainReviewedRavenOutline: true });
  const geometry = createOfficialEngineeringImageGeometryV1({ context, baseGeometry: ordinaryAndRaven, estimate });
  const unitCharacteristics = createOfficialUnitCardSupplyDataBundleV2({ dataset, snapshot, releaseContext: context,
    modelBaseGeometryDataBundle: geometry, armyBuilderUnitDataBundle: armyBuilder.armyResourceBudgetDataBundle.factionArmyEligibilityDataBundle.unitDataBundle });
  const artifacts = { armyBuilder, geometry, unitCharacteristics, abilityIdentities: inputs.identities, wave3CommunityGeometry };
  const components = Object.fromEntries(Object.entries(artifacts).map(([key, value]) => [key, {
    ref: TURRET_COMBAT_DIRECTORY + '/' + key + '.json', version: key === 'abilityIdentities' ? '2' : value.version || '2.0.0',
    integrity: { field: key === 'abilityIdentities' ? 'identityCatalogueHash' : key === 'wave3CommunityGeometry' ? 'profileHash' : 'bundleHash',
      value: value.bundleHash || value.identityCatalogueHash || value.profileHash } }]));
  components.wave3CommunityGeometry = communityBinding;
  return { ...inputs, artifacts, directory: TURRET_COMBAT_DIRECTORY,
    context: { ...context, manifest: manifestFor(components), resources: artifacts } };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const inputs = await compileWave4TurretCombat(root);
  for (const [name, value] of Object.entries({ ...inputs.artifacts, 'release-manifest': inputs.context.manifest })) {
    await atomicWrite(path.join(root, inputs.directory, name + '.json'), JSON.stringify(value, null, 2) + '\n');
  }
  console.log(JSON.stringify({ status: 'compiled_engineering_only', releaseId: inputs.context.manifest.releaseId,
    estimatedTurretDiameterMm: 80, existingRavenContourRetained: true, fullMatchAdmission: false }));
}
