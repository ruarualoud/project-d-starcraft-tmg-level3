import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createCommandCenterDataSnapshot } from '../packages/rule-atoms/official-live-source-snapshots-v1.mjs';
import { createOfficialCommandCenterDataset, verifyOfficialCommandCenterDataset }
  from '../packages/source-data/official-command-center-adapter-v1.mjs';
import { createStarcraftTmgVerifiedSourceRevisionManifestV4,
  createStarcraftTmgExplicitSourceImportWorkflowV4, createStarcraftTmgSourceImportCommandV4 }
  from '../packages/source-data/official-source-import-workflow-v4.mjs';
import { createOfficialReleaseManifestV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { diffOfficialWave3DatasetsV1 } from './support/official-wave3-source-candidate-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';

export const WAVE4_SOURCE_DIRECTORY = 'content/source-releases/wave4-20261127';
export const WAVE4_CANDIDATE_REF = `${WAVE4_SOURCE_DIRECTORY}/release-manifest.json`;
const collections = ['army_units', 'tactical_cards', 'faction_cards', 'rules_sections'];

export async function compileWave4SourceCandidate({ root, readBytes = ref => fs.readFile(path.join(root, ref)) }) {
  const read = async ref => JSON.parse((await readBytes(ref)).toString('utf8'));
  const index = await read(`${WAVE4_SOURCE_DIRECTORY}/source-index.json`);
  const observation = await read('docs/development/wave4/command-center-observation-2026-11-27.json');
  const captures = {};
  const seen = new Set();
  for (const entry of index.entries) {
    assert.ok(!seen.has(entry.sourceId), 'WAVE4_DUPLICATE_SOURCE:' + entry.sourceId);
    seen.add(entry.sourceId);
    const bytes = await readBytes(entry.path);
    const byteHash = createHash('sha256').update(bytes).digest('hex');
    assert.equal(bytes.length, entry.byteLength, 'WAVE4_SOURCE_LENGTH:' + entry.sourceId);
    assert.equal(byteHash, entry.byteHash, 'WAVE4_SOURCE_HASH:' + entry.sourceId);
    assert.equal(entry.byteHash, observation.sources[entry.sourceId]?.sha256, 'WAVE4_OBSERVATION_HASH');
    assert.equal(entry.byteLength, observation.sources[entry.sourceId]?.bytes, 'WAVE4_OBSERVATION_LENGTH');
    assert.equal(entry.url, observation.sources[entry.sourceId]?.url, 'WAVE4_OBSERVATION_URL');
    captures[entry.sourceId] = JSON.parse(bytes.toString('utf8'));
  }
  assert.deepEqual([...seen].sort(), [...collections, 'system_metadata_versions'].sort());
  const snapshot = createCommandCenterDataSnapshot({ ...index,
    firestorePayloads: Object.fromEntries(collections.map(id => [id, captures[id]])),
    versionsPayload: captures.system_metadata_versions });
  assert.deepEqual(snapshot.dataVersions, index.dataVersions);
  const dataset = createOfficialCommandCenterDataset({ snapshot,
    firestorePayloads: Object.fromEntries(collections.map(id => [id, captures[id]])) });
  const audit = verifyOfficialCommandCenterDataset({ snapshot, dataset });
  const revision = createStarcraftTmgVerifiedSourceRevisionManifestV4({ captureId: index.captureId,
    snapshot, dataset, rawCaptures: index.entries, upstreamVerificationHash: audit.auditHash });
  const baseline = await read(index.baseline.manifestRef);
  const readBaseline = ref => read(index.baseline.artifactAliases[ref] || ref);
  const [previous, initialRevision] = await Promise.all([
    readBaseline(baseline.source.datasetRef), readBaseline(baseline.source.sourceRevisionRef),
  ]);
  assert.equal(previous.datasetHash, baseline.source.datasetHash);
  assert.equal(initialRevision.revisionHash, baseline.source.sourceRevisionHash);
  const diff = diffOfficialWave3DatasetsV1(previous, dataset);
  const cardAdditions = diff.tactical_cards.added;
  const addedTactics = cardAdditions.filter(row => !row.payload.isFactionCard).map(row => row.id).sort();
  const addedFactions = cardAdditions.filter(row => row.payload.isFactionCard).map(row => row.id).sort();
  const changedCards = diff.tactical_cards.modified.filter(row => row.fields.some(field => field.field !== 'timestamp'));
  const timestampCards = diff.tactical_cards.modified.filter(row => row.fields.every(field => field.field === 'timestamp'));
  const addedUnits = diff.army_units.added.map(row => row.id).sort();
  assert.deepEqual(addedUnits, observation.unitIds);
  assert.deepEqual(addedTactics, observation.newTacticCardIds);
  assert.deepEqual(addedFactions, observation.newFactionCardIds);
  assert.deepEqual(changedCards.map(row => row.id).sort(), observation.changedBoostDescriptionIds);
  assert.ok(changedCards.every(row => row.fields.every(field => field.field === 'timestamp'
    || /^boosts\.\d+\.description$/u.test(field.field))));
  assert.equal(diff.army_units.modified.length, 0);
  assert.equal(diff.army_units.oldCount, observation.unchangedOldUnits);
  assert.equal(diff.rules_sections.modified.length, 0);
  assert.equal(diff.rules_sections.oldCount, observation.unchangedRulesSections);
  assert.equal(diff.rules_sections.added.length, 0);
  assert.equal(timestampCards.length, observation.timestampOnlyTactics);
  for (const collection of Object.values(diff)) assert.deepEqual(collection.removed, []);
  const excludedAdditions = diff.faction_cards.added;
  assert.deepEqual(excludedAdditions.map(row => row.id).sort(),
    observation.excludedPendingCommunityCards.map(row => row.id).sort());
  for (const row of excludedAdditions) {
    assert.equal(row.authorityDisposition, 'community_display_only');
    const expected = observation.excludedPendingCommunityCards.find(item => item.id === row.id);
    assert.equal(row.payload.type, expected.type);
    assert.equal(row.payload.name, expected.name);
  }
  assert.equal(diff.faction_cards.modified.length, observation.voteOnlyChanges);
  assert.ok(diff.faction_cards.modified.every(row => row.authorityDisposition === 'community_display_only'
    && row.fields.every(field => /^upvotes(\.|$)/u.test(field.field))));
  const officialRecordKeys = dataset.recordIndex.filter(row =>
    row.authorityDisposition === 'official_current_product_candidate').map(row => row.recordKey);
  const communityRecordKeys = dataset.recordIndex.filter(row =>
    row.authorityDisposition === 'community_display_only').map(row => row.recordKey);
  const catalogue = { schema: 'starcraft_tmg_wave4_catalogue_scope_v1',
    datasetHash: dataset.datasetHash, officialRecordKeys, communityRecordKeys,
    addedUnits, addedTactics, addedFactions, changedCardIds: changedCards.map(row => row.id).sort(),
    counts: { addedUnits: addedUnits.length, addedTactics: addedTactics.length, addedFactions: addedFactions.length,
      changedCards: changedCards.length, unchangedOldUnits: diff.army_units.oldCount,
      unchangedRulesSections: diff.rules_sections.oldCount, timestampOnlyCards: timestampCards.length,
      excludedNewCommunityCards: excludedAdditions.length, voteOnlyCommunityChanges: diff.faction_cards.modified.length },
    rulesEligible: false, trainingTruth: false };
  const workflow = createStarcraftTmgExplicitSourceImportWorkflowV4({ initialRevision });
  const command = createStarcraftTmgSourceImportCommandV4({ kind: 'stage_source_revision',
    commandId: index.captureId + '-stage', principalId: 'project-d.wave4.user-authorized-offline-intake',
    issuedAt: index.capturedAt, reason: 'Wave4 candidate from five hash-checked official captures',
    expectedPointerHash: workflow.inspect().currentPointer.pointerHash, targetRevisionHash: revision.revisionHash,
    explicitUserCommand: true, trigger: 'human_cli' });
  workflow.stage({ command, candidateRevision: revision });
  assert.equal(workflow.inspect().currentPointer.revisionHash, initialRevision.revisionHash);
  const manifest = createOfficialReleaseManifestV2({ releaseId: 'wave4-u98-c88-r50-catalogue-v1',
    snapshot, dataset, sourceRevision: revision,
    snapshotRef: `${WAVE4_SOURCE_DIRECTORY}/snapshot.json`, datasetRef: `${WAVE4_SOURCE_DIRECTORY}/dataset.json`,
    sourceRevisionRef: `${WAVE4_SOURCE_DIRECTORY}/source-revision.json`, sourcePolicy: index.sourcePolicy,
    components: {} });
  return { index, manifest, snapshot, dataset, revision, audit, diff, catalogue,
    ledger: workflow.exportLedger(), baseline };
}

export async function saveWave4SourceCandidate(root, candidate) {
  const files = { 'snapshot.json': candidate.snapshot, 'dataset.json': candidate.dataset,
    'source-revision.json': candidate.revision, 'adapter-audit.json': candidate.audit,
    'semantic-diff.json': candidate.diff, 'catalogue-scope.json': candidate.catalogue,
    'import-ledger.json': candidate.ledger, 'release-manifest.json': candidate.manifest };
  for (const [name, value] of Object.entries(files)) {
    const destination = path.join(root, WAVE4_SOURCE_DIRECTORY, name);
    const serialized = JSON.stringify(value, null, 2) + '\n';
    try {
      assert.equal(await fs.readFile(destination, 'utf8'), serialized, 'WAVE4_IMMUTABLE_OUTPUT_CONFLICT:' + name);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await atomicWrite(destination, serialized);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const candidate = await compileWave4SourceCandidate({ root });
  await saveWave4SourceCandidate(root, candidate);
  console.log(JSON.stringify({ releaseId: candidate.manifest.releaseId, manifestHash: candidate.manifest.manifestHash,
    counts: candidate.catalogue.counts, status: 'candidate', modelCalls: 0 }, null, 2));
}
