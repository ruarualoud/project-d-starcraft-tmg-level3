import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { compileWave4StukovArmy } from './compile-wave4-stukov-army.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { createOfficialArmyBuilderCatalogueV2 } from '../packages/source-data/official-army-builder-catalogue-v2.mjs';
import { createOfficialUnitCardSupplyDataBundleV2 } from '../packages/source-data/official-unit-card-supply-data-bundle-v1.mjs';
import { createOfficialReleaseManifestV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createOfficialEngineeringImageGeometryV1 } from '../packages/source-data/official-model-base-geometry-data-bundle-v1.mjs';
import { createOfficialAbilityEffectIrCatalogueV1, createOfficialAbilitySourcePhasePolicyV1 } from '../packages/source-data/official-ability-effect-ir-v1.mjs';
import { createOfficialUnitLifecycleFamilySourceBundleV2 } from '../packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs';
import { OFFICIAL_HOSTILE_INCUBATION_DEFINITION_ID } from '../packages/rule-atoms/official-spawn-round-ability-lock-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';

export const HOSTILE_DIRECTORY = 'build/wave4-web/hostile-incubation/candidate';
export const HOSTILE_ESTIMATED_DIRECTORY = 'build/wave4-web/hostile-incubation/estimated-candidate';
export async function compileWave4HostileIncubation(root, { geometryEstimate = false } = {}) {
  const inputs = await compileWave4StukovArmy(root);
  const { dataset, snapshot, read } = inputs;
  const scope = await read('content/source-releases/wave4-20261127/hostile-incubation-scope-v1.json');
  const { scopeHash, ...scopeBody } = scope;
  if (scopeHash !== hash(scopeBody) || scope.sourceManifestHash !== inputs.scope.sourceManifestHash
    || scope.datasetHash !== dataset.datasetHash || scope.sourceSnapshotHash !== snapshot.snapshotHash
    || scope.sourceReviewHash !== inputs.scope.sourceReviewHash || scope.fullReleaseAdmission !== false
    || !Array.isArray(scope.sourceRecordKeys) || inputs.inventory.definitions.some(row =>
      row.sourceHolds.length && scope.sourceRecordKeys.includes(row.recordKey))) throw Error('HOSTILE_SCOPE_INVALID');
  const parentManifest = inputs.context.manifest;
  const sourceRevision = await read(parentManifest.source.sourceRevisionRef);
  const directory = geometryEstimate ? HOSTILE_ESTIMATED_DIRECTORY : HOSTILE_DIRECTORY;
  const manifestFor = components => createOfficialReleaseManifestV2({ releaseId: geometryEstimate
    ? 'wave4-u98-c88-r50-hostile-incubation-image-estimate-v1' : 'wave4-u98-c88-r50-hostile-incubation-v1',
    dataset, snapshot, sourceRevision, sourceRevisionRef: parentManifest.source.sourceRevisionRef,
    datasetRef: parentManifest.source.datasetRef, snapshotRef: parentManifest.source.snapshotRef,
    sourcePolicy: parentManifest.source.policy, referenceSources: parentManifest.source.references, components });
  const context = { dataset, snapshot, manifest: manifestFor({}), ...(geometryEstimate ? { allowEngineeringEstimatedGeometry: true } : {}) };
  const armyBuilder = createOfficialArmyBuilderCatalogueV2({ dataset, snapshot, releaseContext: context,
    legacyPolicyBundle: await read('content/source-releases/wave3-20261112-army-builder-v2.json'), sourceRecordKeys: scope.sourceRecordKeys });
  const estimate = geometryEstimate ? await read('content/source-releases/wave4-20261127/infested-turret-base-estimate-v1.json') : null;
  if (estimate && createHash('sha256').update(await fs.readFile(path.join(root, estimate.sourceImage.ref))).digest('hex') !== estimate.sourceImage.byteHash) {
    throw Error('HOSTILE_ESTIMATE_IMAGE_BYTES_CHANGED');
  }
  const geometry = geometryEstimate ? createOfficialEngineeringImageGeometryV1({ context, baseGeometry: inputs.artifacts.geometry, estimate })
    : inputs.artifacts.geometry;
  const unitCharacteristics = createOfficialUnitCardSupplyDataBundleV2({ dataset, snapshot, releaseContext: context,
    modelBaseGeometryDataBundle: geometry, armyBuilderUnitDataBundle: armyBuilder.armyResourceBudgetDataBundle
      .factionArmyEligibilityDataBundle.unitDataBundle });
  const artifacts = { armyBuilder, geometry, unitCharacteristics, abilityIdentities: inputs.identities };
  const components = Object.fromEntries(Object.entries(artifacts).map(([key, value]) => [key, {
    ref: directory + '/' + key + '.json', version: key === 'abilityIdentities' ? '2' : value.version || '2.0.0',
    integrity: { field: key === 'abilityIdentities' ? 'identityCatalogueHash' : 'bundleHash',
      value: value.bundleHash || value.identityCatalogueHash } }]));
  const catalogue = createOfficialAbilityEffectIrCatalogueV1({ dataset, identityCatalogue: inputs.identities,
    sourceDefinitionIds: scope.definitionIds,
    sourcePhasePolicy: createOfficialAbilitySourcePhasePolicyV1({ dataset, includeInlineCardPhases: true }) });
  const lifecycle = createOfficialUnitLifecycleFamilySourceBundleV2({ catalogue, definitionIds: [OFFICIAL_HOSTILE_INCUBATION_DEFINITION_ID] });
  return { ...inputs, scope, catalogue, lifecycle, artifacts, directory, estimate,
    context: { ...context, manifest: manifestFor(components), resources: artifacts } };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const result = await compileWave4HostileIncubation(root, { geometryEstimate: process.argv.includes('--estimated-geometry') });
  for (const [name, value] of Object.entries({ ...result.artifacts, lifecycle: result.lifecycle, 'release-manifest': result.context.manifest })) {
    await atomicWrite(path.join(root, result.directory, name + '.json'), JSON.stringify(value, null, 2) + '\n');
  }
  console.log(JSON.stringify({ releaseId: result.context.manifest.releaseId, sourceDefinitions: result.catalogue.definitions.length,
    selectedRecords: result.scope.sourceRecordKeys.length,
    geometryAvailable: result.artifacts.geometry.profiles.some(row => row.recordKey === 'army_units:infested_missile_turret'),
    fullReleaseAdmission: false }));
}
