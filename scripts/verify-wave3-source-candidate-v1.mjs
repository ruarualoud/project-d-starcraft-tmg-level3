import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createCommandCenterSnapshot } from '../packages/rule-atoms/official-live-source-snapshots-v1.mjs';
import { createOfficialCommandCenterDataset, verifyOfficialCommandCenterDataset } from '../packages/source-data/official-command-center-adapter-v1.mjs';
import { replayStarcraftTmgSourceImportLedgerV4 } from '../packages/source-data/official-source-import-workflow-v4.mjs';
import { stageOfficialWave3SourceCandidateV1 } from './support/official-wave3-source-candidate-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const intake = path.join(root, 'build/ticket-28-wave3-source-candidate-20261112-v1');
const read = async relative => JSON.parse(await fs.readFile(path.join(intake, relative), 'utf8'));
const index = await read('source-index.json');
const snapshot = await read('compiled/snapshot.json');
const dataset = await read('compiled/dataset.json');
const candidate = await read('compiled/candidate-revision.json');
const ledger = await read('compiled/import-ledger.json');
const result = await read('compiled/result.json');
const semanticDiff = await read('compiled/semantic-diff.json');
const oldObservation = JSON.parse(await fs.readFile(path.join(root,
  'build/ticket-28-wave3-assessment-20261112/normalized-diff.json'), 'utf8'));
const sourceBytes = new Map(await Promise.all(index.entries.filter(entry => entry.sourceClass !== 'binary')
  .map(async entry => [entry.sourceId, await fs.readFile(path.resolve(root, entry.path))])));
const firestorePayloads = Object.fromEntries(['army_units', 'tactical_cards', 'faction_cards', 'rules_sections']
  .map(key => [key, JSON.parse(sourceBytes.get(key).toString('utf8'))]));
const snapshotInput = {
  capturedAt: index.capturedAt,
  sourceUrl: index.sourceUrl,
  projectId: index.projectId,
  databaseId: index.databaseId,
  shellHtml: sourceBytes.get('command_center_shell').toString('utf8'),
  firebaseInitJs: sourceBytes.get('command_center_firebase_init'),
  staticAssets: index.entries.filter(entry => entry.assetId).map(entry => ({
    assetId: entry.assetId, content: sourceBytes.get(entry.sourceId),
  })),
  versionsPayload: JSON.parse(sourceBytes.get('system_metadata_versions').toString('utf8')),
};
const checks = [];
async function check(id, operation) {
  try { checks.push({ id, passed: true, evidence: await operation() }); }
  catch (error) { checks.push({ id, passed: false, error: error.message }); }
}
function normalizeInjected(payloads) {
  const injectedSnapshot = createCommandCenterSnapshot({ ...snapshotInput, firestorePayloads: payloads });
  return createOfficialCommandCenterDataset({ snapshot: injectedSnapshot, firestorePayloads: payloads });
}

await check('cold_read_adapter_scope_and_counts', () => {
  const audit = verifyOfficialCommandCenterDataset({ snapshot, dataset });
  assert.deepEqual(audit.counts.officialProductByType,
    { deployment: 13, mission: 14, tactical_card: 49, unit: 45 });
  assert.equal(audit.counts.byAuthorityDisposition.community_display_only, 197);
  assert.equal(audit.counts.unclassified, 0);
  return { records: audit.counts.records, datasetHash: audit.datasetHash };
});
await check('stage_successor_and_cold_ledger_keep_legacy_pointer', () => {
  const replay = replayStarcraftTmgSourceImportLedgerV4(ledger);
  assert.equal(replay.currentRevisionHash, result.initialRevisionHash);
  assert.equal(replay.pointerEventCount, 0);
  assert.equal(replay.revisionCount, 2);
  const item = ledger.reviews.find(item => item.reviewItemHash === result.pendingReviewHash);
  assert.equal(item.status, 'pending');
  assert.equal(item.candidateRevisionHash, candidate.revisionHash);
  assert.equal(candidate.productionRoomEligible, false);
  return { replay, pendingReview: item.reviewItemHash };
});
await check('official_builder_values_and_semantic_diff_match_observation', () => {
  for (const [collection, diff] of Object.entries(semanticDiff)) {
    const observed = oldObservation.collections[collection];
    assert.deepEqual(diff.added.map(row => row.id).sort(), observed.added.map(row => row.id).sort());
    assert.deepEqual(diff.removed.map(row => row.id).sort(), observed.removed.map(row => row.id).sort());
    for (const row of observed.added) assert.deepEqual(dataset.recordsByKey[collection + ':' + row.id].payload, row.value);
    for (const row of observed.modified) assert.deepEqual(dataset.recordsByKey[collection + ':' + row.id].payload, row.after);
  }
  const marine = dataset.recordsByKey['army_units:marine'].payload;
  assert.equal(marine.small.cost, 170);
  const features = Object.values(dataset.recordsByKey)
    .filter(row => row.authorityDisposition === 'official_current_product_candidate')
    .reduce((sum, row) => sum + (row.payload.upgrades?.length || row.payload.boosts?.length || 0), 0);
  assert.equal(features, 414);
  const queenChanges = semanticDiff.army_units.modified.find(row => row.name === 'Queen');
  assert.deepEqual(queenChanges.fields.map(change => change.field), ['small.cost']);
  return { marineSmallCost: marine.small.cost, sourceEffects: features };
});
await check('new_fields_survive_and_community_stays_display_only', () => {
  const deployment = dataset.recordsByKey['faction_cards:EyCV5SmTPXTrpqS6iy3e'];
  assert.equal(deployment.payload.status, 'approved');
  assert.equal(deployment.payload.isOfficial, true);
  assert.equal(deployment.authorityDisposition, 'official_current_product_candidate');
  const community = dataset.recordsByKey['faction_cards:zgWIZQYywDlhLjxr2K53'];
  assert.equal(community.authorityDisposition, 'community_display_only');
  assert.ok(community.payload.studioState);
  return { official: deployment.recordKey, community: community.recordKey };
});
await check('unknown_field_and_wrong_type_remain_rejected', () => {
  const unknown = structuredClone(firestorePayloads);
  unknown.army_units.documents[0].fields.unreviewedSyntheticField = { stringValue: 'fault injection' };
  assert.throws(() => normalizeInjected(unknown), /command_center_unreviewed_field_drift/);
  const wrongType = structuredClone(firestorePayloads);
  const deployment = wrongType.faction_cards.documents.find(row => row.name.endsWith('/EyCV5SmTPXTrpqS6iy3e'));
  deployment.fields.isOfficial = { stringValue: 'true' };
  assert.throws(() => normalizeInjected(wrongType), /command_center_field_type_drift/);
  return { unknownFieldRejected: true, wrongTypeRejected: true };
});
await check('contradictory_publication_flags_are_rejected', () => {
  const payloads = structuredClone(firestorePayloads);
  const deployment = payloads.faction_cards.documents.find(row => row.name.endsWith('/EyCV5SmTPXTrpqS6iy3e'));
  deployment.fields.isOfficial = { booleanValue: false };
  assert.throws(() => normalizeInjected(payloads), /command_center_official_deployment_publication_conflict/);
  return { conflictingOfficialFlagRejected: true };
});
await check('incomplete_pagination_is_rejected', () => {
  const payloads = structuredClone(firestorePayloads);
  payloads.army_units.nextPageToken = 'synthetic-unfetched-page';
  assert.throws(() => normalizeInjected(payloads), /paginated_firestore_collection_not_complete/);
  return { incompletePaginationRejected: true };
});
await check('tampered_source_and_duplicate_id_fail_before_stage', async () => {
  const directory = path.join(intake, 'verification-inputs');
  await fs.mkdir(directory, { recursive: true });
  const tampered = structuredClone(index);
  tampered.entries[0].byteHash = '0'.repeat(64);
  const duplicate = structuredClone(index);
  duplicate.entries.splice(1, 0, duplicate.entries[0]);
  for (const [name, value, expected] of [
    ['tampered.json', tampered, /WAVE3_SOURCE_BYTES_MISMATCH/],
    ['duplicate.json', duplicate, /WAVE3_DUPLICATE_SOURCE_ID/],
  ]) {
    const file = path.join(directory, name);
    await fs.writeFile(file, JSON.stringify(value, null, 2), { flag: 'wx' });
    await assert.rejects(stageOfficialWave3SourceCandidateV1({
      worktreeRoot: root, fixtureRoot: path.resolve(root, '../..'),
      sourceIndexFile: file, outputDirectory: path.join(directory, 'must-not-stage'),
    }), expected);
  }
  return { sourceBytesRejected: true, duplicateIdRejected: true };
});
const report = { schemaVersion: 1, scope: 'T28-W3-01 actual source stage, cold read and affected source schema',
  status: checks.every(check => check.passed) ? 'passed' : 'failed', checks,
  modelCalls: 0, nativeGameActions: 0, productionPromotion: false };
await fs.writeFile(path.join(intake, 'verification.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: report.status, checks: checks.map(({ id, passed, error }) => ({ id, passed, error })) }, null, 2));
if (report.status === 'failed') process.exitCode = 1;
