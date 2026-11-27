import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileWave4AbilityDiff } from './compile-wave4-ability-diff.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { createOfficialArmyBuilderCatalogueV2 } from '../packages/source-data/official-army-builder-catalogue-v2.mjs';
import { createOfficialReleaseManifestV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';

export const WAVE4_CREEP_BUILDER_SCOPE_REF = 'content/source-releases/wave4-20261127/creep-builder-scope-v1.json';
export const WAVE4_CREEP_BUILDER_DIRECTORY = 'build/wave4-web/creep-builder/candidate';

// This is an army-building candidate, never a default match release. Selected
// records are compiled from the complete frozen dataset, without rewriting it.
export async function compileWave4CreepBuilder(root) {
  const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
  const compiled = await compileWave4AbilityDiff(root);
  const { dataset, snapshot, manifest: original } = compiled;
  const scope = await read(WAVE4_CREEP_BUILDER_SCOPE_REF);
  const { scopeHash, ...scopeBody } = scope;
  const review = await read('content/source-releases/wave4-20261127/review/source-review.json');
  if (scope.schema !== 'starcraft_tmg_wave4_creep_builder_scope_v1'
    || scope.purpose !== 'army_building_scoped_component'
    || scope.policy?.allSelectedFactsRecompiledFromWave4 !== true
    || scope.policy?.repositoryFallbackAllowed !== false || scope.policy?.refreshDuringDevelopment !== false
    || scopeHash !== hash(scopeBody) || scope.sourceManifestHash !== original.manifestHash
    || scope.datasetHash !== dataset.datasetHash || scope.sourceSnapshotHash !== snapshot.snapshotHash
    || scope.sourceReviewHash !== hash(review) || scope.fullReleaseAdmission !== false
    || scope.productionRoomEligible !== false) throw Error('WAVE4_CREEP_BUILDER_SCOPE_INVALID');
  if (!Array.isArray(scope.sourceRecordKeys) || compiled.inventory.definitions.some(row =>
    row.sourceHolds.length > 0 && scope.sourceRecordKeys.includes(row.recordKey))) {
    throw Error('WAVE4_CREEP_BUILDER_SOURCE_HELD_RECORD');
  }
  const legacyPolicyBundle = await read('content/source-releases/wave3-20261112-army-builder-v2.json');
  const sourceRevision = await read(original.source.sourceRevisionRef);
  const manifestFor = components => createOfficialReleaseManifestV2({
    releaseId: 'wave4-u98-c88-r50-creep-builder-v1', dataset, snapshot,
    datasetRef: original.source.datasetRef, snapshotRef: original.source.snapshotRef,
    sourceRevisionRef: original.source.sourceRevisionRef, sourceRevision,
    referenceSources: original.source.references, sourcePolicy: original.source.policy, components });
  const context = { dataset, snapshot, manifest: manifestFor({}) };
  const builder = createOfficialArmyBuilderCatalogueV2({ dataset, snapshot, releaseContext: context,
    legacyPolicyBundle, sourceRecordKeys: scope.sourceRecordKeys });
  if (hash(builder.catalogueSelection.excludedRecordKeys) !== hash(scope.excludedRecordKeys)) {
    throw Error('WAVE4_CREEP_BUILDER_EXCLUSION_MISMATCH');
  }
  const builderRef = WAVE4_CREEP_BUILDER_DIRECTORY + '/army-builder.json';
  const manifest = manifestFor({ armyBuilder: { ref: builderRef, version: '2.0.0',
    integrity: { field: 'bundleHash', value: builder.bundleHash } } });
  return { ...compiled, scope, builderRef, builder, legacyPolicyBundle,
    context: { ...context, manifest, resources: { armyBuilder: builder } } };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const result = await compileWave4CreepBuilder(root);
  await atomicWrite(path.join(root, result.builderRef), JSON.stringify(result.builder, null, 2) + '\n');
  await atomicWrite(path.join(root, WAVE4_CREEP_BUILDER_DIRECTORY, 'release-manifest.json'),
    JSON.stringify(result.context.manifest, null, 2) + '\n');
  console.log(JSON.stringify({ releaseId: result.context.manifest.releaseId,
    builderHash: result.builder.bundleHash, manifestHash: result.context.manifest.manifestHash,
    scopeHash: result.scope.scopeHash, fullReleaseAdmission: false }));
}
