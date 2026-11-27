import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialModelBaseGeometryDataBundleV1, createOfficialModelBaseGeometryDataBundleV2,
  verifyOfficialModelBaseGeometryDataBundleV1, verifyOfficialModelBaseGeometryDataBundleV2,
  getOfficialModelBaseGeometryProfileV1 } from '../packages/source-data/official-model-base-geometry-data-bundle-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'build/ticket-28-wave3-geometry-20261112-v1/catalogue');
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const red = await read('build/ticket-28-wave3-geometry-20261112-v1/catalogue/cache-schema-red.json');
assert.equal(red.actual, true);
const legacyDataset = await read('build/ticket-28-wave3-release-context-20261112-v1/legacy-dataset.json');
const legacyBundle = createOfficialModelBaseGeometryDataBundleV1({ dataset: legacyDataset });
assert.equal(legacyBundle.bundleHash, red.bundleHash);
assert.throws(() => verifyOfficialModelBaseGeometryDataBundleV2(legacyBundle), /MODEL_BASE_GEOMETRY_DATA_BUNDLE_V2_INVALID/);
const manifest = await read('content/source-releases/wave3-20261112-geometry-release-v2.json');
const context = { manifest, dataset: await read(manifest.source.datasetRef), snapshot: await read(manifest.source.snapshotRef) };
const bundle = createOfficialModelBaseGeometryDataBundleV2({ context, legacyBundle,
  references: await read('content/source-releases/wave3-20261112-geometry-references-v1.json') });
assert(Object.isFrozen(bundle));
assert.equal(verifyOfficialModelBaseGeometryDataBundleV2(bundle), true);
assert.equal(verifyOfficialModelBaseGeometryDataBundleV1(bundle), true);
assert.equal(verifyOfficialModelBaseGeometryDataBundleV1(legacyBundle), true);
assert.throws(() => verifyOfficialModelBaseGeometryDataBundleV2(legacyBundle), /MODEL_BASE_GEOMETRY_DATA_BUNDLE_V2_INVALID/);
assert.equal(getOfficialModelBaseGeometryProfileV1(bundle, 'army_units:siege_tank').baseWidthMillimetres, 150);
const evidence = { status: 'passed', cachedV1RejectedByV2Verifier: true, v1AndV2PublicDispatchRetained: true,
  correctedBundleHashUnchanged: bundle.bundleHash, scope: 'cache_type_isolation_only', providerCalls: 0 };
await atomicWrite(path.join(directory, 'cache-schema-green.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence));
