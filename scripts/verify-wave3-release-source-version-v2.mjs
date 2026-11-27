import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseManifestV2, createOfficialReleaseResolverV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'build/ticket-28-wave3-release-context-20261112-v1');
const intake = 'build/ticket-28-wave3-source-candidate-20261112-v1';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const [snapshot, dataset, sourceRevision, sourceIndex, identities] = await Promise.all([
  read(intake + '/compiled/snapshot.json'), read(intake + '/compiled/dataset.json'),
  read(intake + '/compiled/candidate-revision.json'), read(intake + '/source-index.json'),
  read('build/ticket-28-wave3-release-context-20261112-v1/ability-identities-v2.json'),
]);
const reference = (sourceId, version) => {
  const entry = sourceIndex.entries.find(item => item.sourceId === sourceId);
  assert.ok(entry, sourceId);
  return { version, ref: entry.path, byteHash: entry.byteHash, role: 'reference' };
};
const costId = sourceIndex.entries.find(item => item.url.includes('Cost-Table-10.2026_EN')).sourceId;
const manifest = createOfficialReleaseManifestV2({ releaseId: 'wave3-u83-c84-r50-catalogue-v2',
  snapshot, dataset, sourceRevision, sourceRevisionRef: intake + '/compiled/candidate-revision.json',
  snapshotRef: intake + '/compiled/snapshot.json', datasetRef: intake + '/compiled/dataset.json',
  sourcePolicy: sourceIndex.primaryDataPolicy,
  referenceSources: { faq: reference('faq_v1_3', '1.3'), core: reference('core_rulebook', 'frozen-byte-version'),
    costs: reference(costId, '10.2026') },
  components: { abilityIdentities: { ref: 'build/ticket-28-wave3-release-context-20261112-v1/ability-identities-v2.json',
    version: '2', integrity: { field: 'identityCatalogueHash', value: identities.identityCatalogueHash } } },
});
const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'source-version.sqlite') });
try {
  const resolver = createOfficialReleaseResolverV2({ store, loadArtifact: read });
  resolver.register(manifest);
  const resolved = await resolver.resolve({ releaseId: manifest.releaseId });
  assert.equal(resolved.manifest.source.references.faq.version, '1.3');
  assert.equal(resolved.manifest.source.sourceRevisionHash, sourceRevision.revisionHash);
  const conflict = structuredClone(manifest);
  conflict.releaseId += '-fault-injection';
  conflict.source.sourceRevisionHash = '0'.repeat(64);
  const { manifestHash, ...body } = conflict;
  conflict.manifestHash = hashStarcraftTmgContract(body);
  resolver.register(conflict);
  await assert.rejects(resolver.resolve({ releaseId: conflict.releaseId }), /OFFICIAL_RELEASE_SOURCE_MISMATCH/);
  await atomicWrite(path.join(root, 'content/source-releases/wave3-20261112-catalogue-release-v2.json'), JSON.stringify(manifest, null, 2));
  const report = { status: 'passed', releaseId: manifest.releaseId, sourceRevisionPinned: true,
    faqVersion: resolved.manifest.source.references.faq.version, conflictingRevisionRejected: true,
    primaryDataSource: resolved.manifest.source.policy.source, modelCalls: 0 };
  await atomicWrite(path.join(directory, 'source-version-result.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { store.close(); }
