import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseResolverV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialAbilityEffectIrCatalogueV1, createOfficialAbilitySourcePhasePolicyV1 }
  from '../packages/source-data/official-ability-effect-ir-v1.mjs';
import { createOfficialCharacteristicStatusFamilySourceBundleV2 }
  from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import { createOfficialRangedFamilySourceBundleV2 } from '../packages/product-composition/official-ranged-family-adapter-v1.mjs';
import { createOfficialAttackProfileCatalogueV3 } from '../packages/source-data/official-attack-profile-catalogue-v1.mjs';
import { getOfficialReleaseModelBaseGeometryBundleV2, getOfficialModelBaseGeometryProfileV1 }
  from '../packages/source-data/official-model-base-geometry-data-bundle-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = 'build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/';
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
async function openProduct() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(root, output, 'releases.sqlite') });
  try {
    const resolver = createOfficialReleaseResolverV2({ store, loadArtifact: read });
    const manifest = await read(sourceRef); resolver.register(manifest);
    const context = await resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' });
    return { context, close: () => store.close() };
  } catch (error) { store.close(); throw error; }
}
const result = await runProductBoundaryCheck({ directory: path.join(root, output, 'source-prerequisite'), identity: {
  factoryModule: 'packages/source-data/official-release-context-v2.mjs', factoryExport: 'createOfficialReleaseResolverV2',
  sourceRef, contractVersion: 'T28-W3-08-raven-source-only-with-explicit-missing-geometry-v1',
}, steps: [{ name: 'compile', repairRef, openProduct, check: async ({ context }) => {
  const policy = createOfficialAbilitySourcePhasePolicyV1({ dataset: context.dataset });
  const catalogue = createOfficialAbilityEffectIrCatalogueV1({ dataset: context.dataset,
    identityCatalogue: context.resources.abilityIdentities, sourcePhasePolicy: policy });
  const characteristic = createOfficialCharacteristicStatusFamilySourceBundleV2({ catalogue,
    definitionIds: ['unit:raven/detection-any-phase@1'], canonicalResourceTypes: true });
  assert.equal(characteristic.routes[0].effectKind, 'detection_aura');
  assert.equal(characteristic.routes[0].rangeMilliInches, 6000);
  const attacks = createOfficialAttackProfileCatalogueV3({ context, recordKeys: ['army_units:raven'] });
  const ranged = createOfficialRangedFamilySourceBundleV2({ catalogue,
    definitionIds: ['unit:raven/railguns-assault-phase@1'], attackProfileCatalogue: attacks });
  const profile = attacks.profilesByProfileKey[ranged.routes[0].profileKey];
  assert.equal(profile.rateOfAttack, 4); assert.equal(profile.hitThreshold, 3); assert.equal(profile.damage, 1);
  assert.deepEqual(profile.targetTags, ['ground']); assert.equal(profile.range.normalRangeInches, 12);
  const geometry = getOfficialReleaseModelBaseGeometryBundleV2(context);
  assert.throws(() => getOfficialModelBaseGeometryProfileV1(geometry, 'army_units:raven'),
    /MODEL_BASE_GEOMETRY_SOURCE_MISSING:army_units:raven:FLIGHT_STAND_PHYSICAL_FOOTPRINT_UNSPECIFIED/);
  const ref = output + 'source-prerequisite.json';
  await atomicWrite(path.join(root, ref), JSON.stringify({ phasePolicy: policy, characteristic, ranged, profile,
    geometryMissing: geometry.missingProfiles.find(row => row.recordKey === 'army_units:raven'),
    sourceCompilationPassed: true, nativeProductGatePassed: false, newComponentCompletions: 0,
    state: 'source_ready_product_blocked', modelCalls: 0 }, null, 2) + '\n');
  return { evidenceRef: ref, checkpointRef: ref };
} }] });
console.log(JSON.stringify({ gate: 'raven-source-prerequisite', status: result.status, componentCompletions: 0 }));
