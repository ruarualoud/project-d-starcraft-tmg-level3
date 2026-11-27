import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { atomicWrite } from '../lib/development-context.mjs';
import { createCommandCenterSnapshot } from '../../packages/rule-atoms/official-live-source-snapshots-v1.mjs';
import { createOfficialCommandCenterDataset, verifyOfficialCommandCenterDataset } from '../../packages/source-data/official-command-center-adapter-v1.mjs';
import {
  createStarcraftTmgVerifiedSourceRevisionManifestV4,
  createStarcraftTmgExplicitSourceImportWorkflowV4,
  createStarcraftTmgSourceImportCommandV4,
} from '../../packages/source-data/official-source-import-workflow-v4.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './official-development-tranche-source-lock-fixture-v1.mjs';

const collections = ['army_units', 'tactical_cards', 'faction_cards', 'rules_sections'];

function changedFields(before, after, prefix = '') {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  const bothObjects = before !== null && after !== null
    && typeof before === 'object' && typeof after === 'object';
  if (!bothObjects) return [prefix];
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  return keys.flatMap(key => changedFields(before[key], after[key], prefix ? prefix + '.' + key : key));
}

function classifyField(field, before, after) {
  if (field === 'timestamp') return 'timestamp_only';
  if (/^(small|large)\.cost$|^cost$|^upgrades\.\d+\.cost[SL]$|^slots\.|^factionTags/.test(field)) {
    return 'cost_or_eligibility';
  }
  if (typeof before === 'string' && typeof after === 'string'
    && before.replace(/\s+/g, ' ').trim().toLowerCase()
      === after.replace(/\s+/g, ' ').trim().toLowerCase()) return 'display_only';
  return 'requires_semantic_review';
}

function atField(value, field) {
  return field.split('.').reduce((current, key) => current?.[key], value);
}

export function diffOfficialWave3DatasetsV1(previous, current) {
  return Object.fromEntries(collections.map(collectionId => {
    const select = dataset => Object.values(dataset.recordsByKey)
      .filter(record => record.collectionId === collectionId);
    const older = new Map(select(previous).map(record => [record.documentId, record]));
    const newer = new Map(select(current).map(record => [record.documentId, record]));
    const added = [...newer.values()].filter(record => !older.has(record.documentId));
    const removed = [...older.values()].filter(record => !newer.has(record.documentId));
    const modified = [];
    for (const [id, record] of newer) {
      if (!older.has(id)) continue;
      const before = older.get(id).payload;
      const after = record.payload;
      const fields = changedFields(before, after);
      if (!fields.length) continue;
      modified.push({
        id,
        recordKey: record.recordKey,
        name: after.name || after.title || id,
        authorityDisposition: record.authorityDisposition,
        fields: fields.map(field => ({
          field,
          classification: classifyField(field, atField(before, field), atField(after, field)),
          before: atField(before, field) ?? null,
          after: atField(after, field) ?? null,
        })),
      });
    }
    return [collectionId, {
      oldCount: older.size,
      currentCount: newer.size,
      added: added.map(record => ({ id: record.documentId, recordKey: record.recordKey,
        authorityDisposition: record.authorityDisposition, payload: record.payload })),
      removed: removed.map(record => ({ id: record.documentId, recordKey: record.recordKey })),
      modified,
    }];
  }));
}

// Offline stage only. The caller supplies captured bytes and an isolated output directory.
// Network acquisition, production pointer selection and room construction have separate owners.
export async function stageOfficialWave3SourceCandidateV1({
  worktreeRoot,
  fixtureRoot,
  sourceIndexFile,
  outputDirectory,
}) {
  const index = JSON.parse(await fs.readFile(sourceIndexFile, 'utf8'));
  if (index.primaryDataPolicy?.source !== 'official_command_center_army_builder_firestore') {
    throw Error('WAVE3_BUILDER_PRIMARY_SOURCE_REQUIRED');
  }
  const sourceBytes = new Map();
  const rawCaptures = [];
  for (const entry of index.entries) {
    if (sourceBytes.has(entry.sourceId)) throw Error('WAVE3_DUPLICATE_SOURCE_ID');
    const bytes = await fs.readFile(path.resolve(worktreeRoot, entry.path));
    const byteHash = createHash('sha256').update(bytes).digest('hex');
    if (bytes.length !== entry.byteLength || byteHash !== entry.byteHash) {
      throw Error('WAVE3_SOURCE_BYTES_MISMATCH:' + entry.sourceId);
    }
    sourceBytes.set(entry.sourceId, bytes);
    rawCaptures.push({ sourceId: entry.sourceId, sourceClass: entry.sourceClass,
      byteHash, byteLength: bytes.length });
  }
  const firestorePayloads = Object.fromEntries(collections.map(id => [
    id, JSON.parse(sourceBytes.get(id).toString('utf8')),
  ]));
  const snapshot = createCommandCenterSnapshot({
    capturedAt: index.capturedAt,
    sourceUrl: index.sourceUrl,
    projectId: index.projectId,
    databaseId: index.databaseId,
    shellHtml: sourceBytes.get('command_center_shell').toString('utf8'),
    firebaseInitJs: sourceBytes.get('command_center_firebase_init'),
    staticAssets: index.entries.filter(entry => entry.assetId).map(entry => ({
      assetId: entry.assetId,
      content: sourceBytes.get(entry.sourceId),
    })),
    firestorePayloads,
    versionsPayload: JSON.parse(sourceBytes.get('system_metadata_versions').toString('utf8')),
  });
  for (const [key, value] of Object.entries(index.dataVersions)) {
    if (snapshot.dataVersions[key] !== String(value)) throw Error('WAVE3_VERSION_MISMATCH:' + key);
  }
  const dataset = createOfficialCommandCenterDataset({ snapshot, firestorePayloads });
  const audit = verifyOfficialCommandCenterDataset({ snapshot, dataset });
  const candidate = createStarcraftTmgVerifiedSourceRevisionManifestV4({
    captureId: index.captureId,
    snapshot,
    dataset,
    rawCaptures,
    upstreamVerificationHash: audit.auditHash,
  });
  const frozen = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: fixtureRoot });
  const legacyCaptures = Object.entries({
    ...frozen.lock.firestore, ...frozen.lock.binaries, ...frozen.lock.texts,
  }).map(([sourceId, entry]) => ({
    sourceId,
    sourceClass: Object.hasOwn(frozen.lock.firestore, sourceId) ? 'firestore'
      : Object.hasOwn(frozen.lock.binaries, sourceId) ? 'binary' : 'text',
    byteHash: entry.byteHash,
    byteLength: entry.byteLength,
  }));
  const initialRevision = createStarcraftTmgVerifiedSourceRevisionManifestV4({
    captureId: frozen.lock.captureId,
    snapshot: frozen.snapshot,
    dataset: frozen.dataset,
    rawCaptures: legacyCaptures,
    upstreamVerificationHash: frozen.audit.auditHash,
  });
  const workflow = createStarcraftTmgExplicitSourceImportWorkflowV4({ initialRevision });
  const command = createStarcraftTmgSourceImportCommandV4({
    kind: 'stage_source_revision',
    commandId: index.captureId + '-stage',
    principalId: 'project-d.ticket28.user-authorized-source-intake',
    issuedAt: index.assembledAt,
    reason: 'Ticket28 source candidate from frozen official builder data',
    expectedPointerHash: workflow.inspect().currentPointer.pointerHash,
    targetRevisionHash: candidate.revisionHash,
    explicitUserCommand: true,
    trigger: 'human_cli',
  });
  const stagedReview = workflow.stage({ command, candidateRevision: candidate });
  const ledger = workflow.exportLedger();
  const semanticDiff = diffOfficialWave3DatasetsV1(frozen.dataset, dataset);
  const counts = audit.counts;
  const result = {
    schemaVersion: 1,
    status: 'staged_pending_rule_and_runtime_work',
    dataVersions: dataset.dataVersions,
    sourcePolicy: index.primaryDataPolicy,
    rawSourceCount: rawCaptures.length,
    counts,
    candidateRevisionHash: candidate.revisionHash,
    initialRevisionHash: initialRevision.revisionHash,
    pointerAfterStage: workflow.inspect().currentPointer,
    pendingReviewHash: stagedReview.reviewItemHash,
    productionRoomEligible: false,
    trainingTruth: false,
  };
  const files = {
    'snapshot.json': snapshot,
    'dataset.json': dataset,
    'adapter-audit.json': audit,
    'candidate-revision.json': candidate,
    'stage-command.json': command,
    'staged-review.json': stagedReview,
    'import-ledger.json': ledger,
    'semantic-diff.json': semanticDiff,
    'result.json': result,
  };
  await fs.mkdir(outputDirectory, { recursive: true });
  for (const [name, value] of Object.entries(files)) {
    const destination = path.join(outputDirectory, name);
    const serialized = JSON.stringify(value, null, 2) + '\n';
    try {
      const existing = await fs.readFile(destination, 'utf8');
      if (existing !== serialized) throw Error('WAVE3_OUTPUT_CONFLICT:' + name);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await atomicWrite(destination, serialized);
    }
  }
  return { result, candidate, snapshot, dataset, ledger, semanticDiff };
}
