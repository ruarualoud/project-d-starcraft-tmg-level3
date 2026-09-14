import { DatabaseSync } from 'node:sqlite';
import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { FACTION_DRAFT_ENVELOPE_BINDING_V2 as envelope } from './faction-draft-envelope-v2.mjs';
import { FACTION_INITIAL_SOURCE_CORRECTION_BINDING_V2 as correction } from './faction-initial-source-correction-v2.mjs';
import { FACTION_EDITOR_DRAFT_ENVELOPE_BINDING_V2 as editor } from './faction-editor-draft-envelope-v2.mjs';
import { readFactionTeachFailureEvidenceV1 } from '../skill-evaluation/faction-teach-failure-evidence-v1.mjs';

const originRunId = 'faction-v1-b624e21a2da88377b410';
const originAttempts = ['structured-e02c9380e6d7854cee5d6bd61e63dc11d9ada2c582780394',
  'structured-39255b466f2a163e09b220011291e0b2b9e5e26cf892ace6'];

export function validateFactionDraftPolicyMigrationV2({ filename, parentRunId, parent, next, readiness }) {
  const fields = ['draftEnvelopeBinding', 'initialSourceCorrectionBinding', 'editorEnvelopeBinding', 'draftPolicyReadinessHash'];
  if (!fields.some(f => parent[f] !== undefined || next[f] !== undefined)) {
    if (readiness) fail('FACTION_DRAFT_POLICY_MIGRATION_UNSCOPED'); return null;
  }
  if (fields.some(f => next[f] === undefined) || fields.some(f => parent[f] !== undefined) && fields.some(f => parent[f] === undefined))
    fail('FACTION_DRAFT_POLICY_MIGRATION_PARTIAL');
  [next.draftEnvelopeBinding, next.initialSourceCorrectionBinding, next.editorEnvelopeBinding, readiness].forEach(verifySeal);
  if (next.draftEnvelopeBinding.hash !== envelope.hash || next.initialSourceCorrectionBinding.hash !== correction.hash
    || parent.draftEnvelopeBinding && parent.draftEnvelopeBinding.hash !== envelope.hash
    || parent.initialSourceCorrectionBinding && parent.initialSourceCorrectionBinding.hash !== correction.hash
    || next.editorEnvelopeBinding.hash !== editor.hash || parent.editorEnvelopeBinding && parent.editorEnvelopeBinding.hash !== editor.hash
    || !parent.draftEnvelopeBinding && parentRunId !== originRunId
    || !readiness.passed || readiness.hash !== next.draftPolicyReadinessHash
    || readiness.binding?.hash !== envelope.hash || readiness.sourceBinding?.hash !== correction.hash
    || readiness.providerCalls !== 0 || readiness.actualDshSessions !== 6
    || readiness.editorBinding?.hash !== editor.hash || !readiness.editorEnvelope?.passed
    || readiness.editorEnvelope.actualDshSessions !== 2 || !readiness.editorEnvelope.currentFailureBranchTested
    || !readiness.editorEnvelope.independentConsumerPassed || !readiness.editorEnvelope.hostPatchPassed
    || !readiness.editorEnvelope.zeroProviderRestartImportPassed || !readiness.editorEnvelope.durableDescendantImportsPassed
    || !readiness.fullPaidRequestAndInvocationRebuilt || !readiness.nativeImportAndConsumerWired
    || !readiness.currentFaults?.passed || readiness.currentFaults.actualDshSessions !== 2
    || !readiness.initialSourceWorkflow?.passed || !readiness.initialSourceWorkflow.wholeSectionFreshReviewRequired
    || !readiness.initialSourceWorkflow.newNegativeBlocksCompletion || !readiness.initialSourceWorkflow.allKnownFieldsAppliedAtomically
    || !readiness.runnerParametersBound || readiness.acceptanceInherited !== false || readiness.accountingReset !== false
    || hash(next.inputHashes) !== hash(parent.inputHashes)
    || hash(next.nativeOutputCapacityBinding) !== hash(parent.nativeOutputCapacityBinding)
    || hash(next.nativeTargetReconstructionBinding) !== hash(parent.nativeTargetReconstructionBinding)
    || !Array.isArray(readiness.origins) || hash(readiness.origins.map(r => r.originAttemptId)) !== hash(originAttempts))
    fail('FACTION_DRAFT_POLICY_MIGRATION_INVALID');
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare("SELECT count(*) AS n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    for (const run of new Set([originRunId, parentRunId]))
      if (db.prepare("SELECT count(*) AS n FROM attempts WHERE run=? AND state='intent'").get(run).n
        || db.prepare("SELECT count(*) AS n FROM steps WHERE run=? AND state='running'").get(run).n)
        fail('FACTION_DRAFT_POLICY_ORIGIN_NOT_TERMINAL');
  } finally { db.close(); }
  for (const row of readiness.origins) {
    const evidence = readFactionTeachFailureEvidenceV1({ filename, runId: row.originRunId, attemptId: row.originAttemptId });
    const receipt = verifySeal(JSON.parse(evidence.attempt.response)).value;
    if (row.originRunId !== originRunId || !next.inputHashes.includes(row.inputHash)
      || evidence.attempt.state !== 'failed' || evidence.attempt.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
      || receipt.receiptHash !== row.originalFailureReceiptHash || evidence.rejected.hash !== row.rejectedCandidateHash
      || receipt.status !== 200 || receipt.incompleteReason !== null || hash(receipt.usage) !== hash(row.originalUsage)
      || evidence.attempt.settled !== row.originalSettledMicros || evidence.rejected.contextManifestRef.hash !== row.contextHash)
      fail('FACTION_DRAFT_POLICY_ORIGIN_DRIFT');
  }
  for (const row of readiness.codeHashes)
    if (next.codeHashes.find(r => r.file === row.file)?.hash !== row.hash) fail('FACTION_DRAFT_POLICY_CODE_DRIFT');
  return seal({ version: 'faction_draft_policy_migration_v2', readinessHash: readiness.hash,
    bindingHash: envelope.hash, sourceBindingHash: correction.hash, editorBindingHash: editor.hash, originRunId, originAttempts,
    files: readiness.codeHashes.map(r => r.file),
    policy: 'lossless_explicit_draft_envelope_and_source_adjudicated_initial_repair_followed_by_fresh_review',
    acceptanceInherited: false, accountingReset: false, trainingTruth: false });
}
