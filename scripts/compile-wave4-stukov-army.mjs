import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { compileWave4AbilityDiff } from './compile-wave4-ability-diff.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { createOfficialArmyBuilderCatalogueV2 } from '../packages/source-data/official-army-builder-catalogue-v2.mjs';
import { createOfficialReleaseManifestV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { rebindOfficialUnchangedModelGeometryV2 } from '../packages/source-data/official-model-base-geometry-data-bundle-v1.mjs';
import { createOfficialUnitCardSupplyDataBundleV2 } from '../packages/source-data/official-unit-card-supply-data-bundle-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';

export const STUKOV_DIRECTORY = 'build/wave4-web/stukov-army/candidate';
export async function compileWave4StukovArmy(root) {
  const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
  const compiled = await compileWave4AbilityDiff(root);
  const { dataset, snapshot, manifest: original } = compiled;
  const scope = await read('content/source-releases/wave4-20261127/stukov-army-scope-v1.json');
  const { scopeHash, ...scopeBody } = scope;
  const review = await read('content/source-releases/wave4-20261127/review/source-review.json');
  if (scopeHash !== hash(scopeBody) || scope.sourceManifestHash !== original.manifestHash
    || scope.datasetHash !== dataset.datasetHash || scope.sourceSnapshotHash !== snapshot.snapshotHash
    || scope.sourceReviewHash !== hash(review) || scope.fullReleaseAdmission !== false
    || scope.productionRoomEligible !== false || !Array.isArray(scope.sourceRecordKeys)
    || compiled.inventory.definitions.some(row => row.sourceHolds.length && scope.sourceRecordKeys.includes(row.recordKey))) {
    throw Error('WAVE4_STUKOV_ARMY_SCOPE_INVALID');
  }
  const sourceRevision = await read(original.source.sourceRevisionRef);
  const seed = await read('build/wave4-web/armour-reaction-components/factory-Standard.json');
  const priorManifest = await read(seed.setup.releaseRef);
  const core = priorManifest.source.references.core;
  if (createHash('sha256').update(await fs.readFile(path.join(root, core.ref))).digest('hex') !== core.byteHash) {
    throw Error('STUKOV_FROZEN_CORE_BYTES_CHANGED');
  }
  const manifestFor = components => createOfficialReleaseManifestV2({ releaseId: 'wave4-u98-c88-r50-stukov-army-v1',
    dataset, snapshot, sourceRevision, sourceRevisionRef: original.source.sourceRevisionRef,
    datasetRef: original.source.datasetRef, snapshotRef: original.source.snapshotRef,
    sourcePolicy: original.source.policy, referenceSources: { ...original.source.references, core }, components });
  const context = { dataset, snapshot, manifest: manifestFor({}) };
  const builder = createOfficialArmyBuilderCatalogueV2({ dataset, snapshot, releaseContext: context,
    legacyPolicyBundle: await read('content/source-releases/wave3-20261112-army-builder-v2.json'), sourceRecordKeys: scope.sourceRecordKeys });
  const geometry = rebindOfficialUnchangedModelGeometryV2({ context, previousBundle: seed.state.officialModelBaseGeometryDataBundle });
  const unitCharacteristics = createOfficialUnitCardSupplyDataBundleV2({ dataset, snapshot, releaseContext: context,
    modelBaseGeometryDataBundle: geometry,
    armyBuilderUnitDataBundle: builder.armyResourceBudgetDataBundle.factionArmyEligibilityDataBundle.unitDataBundle });
  const artifacts = { armyBuilder: builder, geometry, unitCharacteristics, abilityIdentities: compiled.identities };
  const components = Object.fromEntries(Object.entries(artifacts).map(([key, value]) => [key, {
    ref: STUKOV_DIRECTORY + '/' + key + '.json', version: key === 'abilityIdentities' ? '2' : value.version || '2.0.0',
    integrity: { field: key === 'abilityIdentities' ? 'identityCatalogueHash' : 'bundleHash',
      value: value.bundleHash || value.identityCatalogueHash } }]));
  return { ...compiled, scope, seed, artifacts, read,
    context: { ...context, manifest: manifestFor(components), resources: artifacts } };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const result = await compileWave4StukovArmy(root);
  for (const [name, value] of Object.entries({ ...result.artifacts, 'release-manifest': result.context.manifest })) {
    await atomicWrite(path.join(root, STUKOV_DIRECTORY, name + '.json'), JSON.stringify(value, null, 2) + '\n');
  }
  console.log(JSON.stringify({ releaseId: result.context.manifest.releaseId, manifestHash: result.context.manifest.manifestHash,
    selectedRecords: result.scope.sourceRecordKeys.length, newAtoms: 2, fullReleaseAdmission: false }));
}
