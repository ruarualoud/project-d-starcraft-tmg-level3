import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { FACTION_PROPOSER_AUXILIARY_CAPACITY_BINDING_V1 as binding,
  FACTION_PROPOSER_ENVELOPE_CAPACITY_BINDING_V2 as envelope } from './faction-proposer-auxiliary-capacity-v1.mjs';
import { FACTION_NATIVE_TARGET_RECONSTRUCTION_BINDING_V1 as targetBinding } from './faction-native-target-reconstruction-v1.mjs';
import { FACTION_PROPOSER_BATCH_CONTRACT_V1 as planContract } from './faction-proposer-batches-v1.mjs';
import { readFactionTeachFailureEvidenceV1 } from '../skill-evaluation/faction-teach-failure-evidence-v1.mjs';

const originRunId = 'faction-v1-c96a15b1a09894a777f7';
const originAttempts = ['structured-0bdcb5476e0a6e6b16292e4816013dc9fa63bb1d3e38d6cd',
  'structured-7534c9a380436dac92f1d0a9a269621dd3cf7162f195004e'];

export function validateFactionProposerAuxiliaryMigrationV1({ filename, parentRunId, parent, next, readiness }) {
  if (next.proposerAuxiliaryCapacityBinding?.hash === envelope.hash)
    return validateBoundedGenerationMigrationV2({ filename, parentRunId, parent, next, readiness });
  if (next.nativeTargetReconstructionBinding || parent.nativeTargetReconstructionBinding)
    fail('FACTION_BOUNDED_GENERATION_DOWNGRADE_OR_UNBOUND');
  const fields = ['proposerAuxiliaryCapacityBinding', 'proposerAuxiliaryReadinessHash'];
  if (!fields.some(f => parent[f] !== undefined || next[f] !== undefined)) {
    if (readiness) fail('FACTION_PROPOSER_AUXILIARY_MIGRATION_UNSCOPED'); return null;
  }
  if (fields.some(f => next[f] === undefined)) fail('FACTION_PROPOSER_AUXILIARY_MIGRATION_PARTIAL');
  [next.proposerAuxiliaryCapacityBinding, readiness].forEach(verifySeal);
  if (next.proposerAuxiliaryCapacityBinding.hash !== binding.hash || readiness.binding?.hash !== binding.hash
    || parent.proposerAuxiliaryCapacityBinding && parent.proposerAuxiliaryCapacityBinding.hash !== binding.hash
    || !parent.proposerAuxiliaryCapacityBinding && parentRunId !== originRunId
    || !readiness.passed || readiness.providerCalls !== 0 || readiness.actualDshSessions !== 3
    || !readiness.currentFaults?.passed || readiness.currentFaults.actualDshSessions !== 1
    || readiness.hash !== next.proposerAuxiliaryReadinessHash || !readiness.actualRequestRebuilt
    || !readiness.consumerReplayPassed || !readiness.fullContextPreserved || !readiness.allUncertaintiesPreserved
    || !readiness.subsequentBatchAndAssemblyTested || !readiness.productionImportTested
    || !readiness.strictSubstantiveChecksPreserved || !readiness.oldProviderContractPreserved
    || !next.proposerBatchBinding || hash(next.proposerBatchBinding) !== hash(parent.proposerBatchBinding))
    fail('FACTION_PROPOSER_AUXILIARY_MIGRATION_INVALID');
  if (!Array.isArray(readiness.origins) || readiness.origins.length !== 2
    || hash(readiness.origins.map(r => r.originAttemptId)) !== hash(originAttempts))
    fail('FACTION_PROPOSER_AUXILIARY_MIGRATION_ORIGIN_INVALID');
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare("SELECT count(*) AS n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    if (db.prepare("SELECT count(*) AS n FROM steps WHERE run=? AND state='running'").get(originRunId).n
      || db.prepare("SELECT count(*) AS n FROM attempts WHERE run=? AND state='intent'").get(originRunId).n)
      fail('FACTION_PROPOSER_AUXILIARY_ORIGIN_NOT_TERMINAL');
  } finally { db.close(); }
  for (const row of readiness.origins) {
    const evidence = readFactionTeachFailureEvidenceV1({ filename, runId: row.originRunId, attemptId: row.originAttemptId });
    const receipt = verifySeal(JSON.parse(evidence.attempt.response)).value;
    if (row.originRunId !== originRunId || !next.inputHashes.includes(row.inputHash)
      || evidence.attempt.state !== 'failed' || evidence.attempt.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
      || receipt.receiptHash !== row.originalFailureReceiptHash || evidence.rejected.hash !== row.rejectedCandidateHash
      || receipt.status !== 200 || receipt.incompleteReason !== null
      || hash(receipt.usage) !== hash(row.originalUsage) || evidence.attempt.settled !== row.originalSettledMicros
      || evidence.rejected.contextManifestRef.hash !== row.contextHash)
      fail('FACTION_PROPOSER_AUXILIARY_MIGRATION_EVIDENCE_DRIFT');
  }
  for (const row of readiness.codeHashes)
    if (next.codeHashes.find(r => r.file === row.file)?.hash !== row.hash) fail('FACTION_PROPOSER_AUXILIARY_MIGRATION_CODE_DRIFT');
  return seal({ version: 'faction_proposer_auxiliary_migration_v1', readinessHash: readiness.hash,
    bindingHash: binding.hash, originRunId, originAttempts, files: readiness.codeHashes.map(r => r.file),
    policy: 'retain_paid_failure_and_every_auxiliary_note_under_explicit_host_envelope_no_provider_relabel',
    acceptanceInherited: false, accountingReset: false, trainingTruth: false });
}

function validateBoundedGenerationMigrationV2({ filename, parentRunId, parent, next, readiness }) {
  [next.proposerAuxiliaryCapacityBinding, next.nativeTargetReconstructionBinding, readiness].forEach(verifySeal);
  const first = 'faction-v1-9200d037cfa6a1c4a388';
  const expected = [...originAttempts, 'structured-e7c4bc6f9aee9645f9fdc40d79592c3d69fabf2adbd9bb4b'];
  if (next.proposerAuxiliaryCapacityBinding.hash !== envelope.hash || readiness.binding?.hash !== envelope.hash
    || next.nativeTargetReconstructionBinding.hash !== targetBinding.hash || readiness.targetBinding?.hash !== targetBinding.hash
    || parent.proposerAuxiliaryCapacityBinding?.hash !== envelope.hash && (parentRunId !== first || parent.proposerAuxiliaryCapacityBinding?.hash !== binding.hash)
    || parent.nativeTargetReconstructionBinding && parent.nativeTargetReconstructionBinding.hash !== targetBinding.hash
    || readiness.hash !== next.proposerAuxiliaryReadinessHash || !readiness.passed || readiness.providerCalls !== 0
    || readiness.actualDshSessions !== 5 || !readiness.currentFaults?.passed || readiness.currentFaults.actualDshSessions !== 1
    || !readiness.actualRequestRebuilt || !readiness.consumerReplayPassed || !readiness.fullContextPreserved
    || !readiness.allPlanningTextPreserved || !readiness.allUncertaintiesPreserved || !readiness.subsequentBatchAndAssemblyTested
    || !readiness.productionImportTested || !readiness.strictSourceAndTargetChecksPreserved || readiness.oldProviderContractHash !== planContract.contractHash
    || !readiness.targetReconstruction?.actualRequestRebuilt || !readiness.targetReconstruction.nativeConsumerReplayPassed
    || !readiness.targetReconstruction.legacySuccessFrozen || readiness.semanticAcceptanceInherited !== false
    || hash(next.proposerBatchBinding) !== hash(parent.proposerBatchBinding)
    || hash(next.nativeOutputCapacityBinding) !== hash(parent.nativeOutputCapacityBinding)
    || !Array.isArray(readiness.origins) || hash(readiness.origins.map(r => r.originAttemptId)) !== hash(expected))
    fail('FACTION_BOUNDED_GENERATION_MIGRATION_INVALID');
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare("SELECT count(*) AS n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    for (const id of [originRunId, first, parentRunId])
      if (db.prepare("SELECT count(*) AS n FROM attempts WHERE run=? AND state='intent'").get(id).n
        || db.prepare("SELECT count(*) AS n FROM steps WHERE run=? AND state='running'").get(id).n)
        fail('FACTION_BOUNDED_GENERATION_ORIGIN_NOT_TERMINAL');
    const target = readiness.targetReconstruction;
    const actual = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(target.originRunId, target.originAttemptId);
    if (target.originRunId !== first || !actual || actual.state !== 'failed' || actual.code !== 'PROVIDER_RESPONSE_JSON_INVALID')
      fail('FACTION_BOUNDED_GENERATION_TARGET_ORIGIN_DRIFT');
    const receipt = verifySeal(JSON.parse(actual.response)).value;
    if (receipt.receiptHash !== target.originalFailureReceiptHash || receipt.status !== 200
      || receipt.responseOutcome?.finishReason !== 'stop' || receipt.responseOutcome.syntaxIssue !== 'separator')
      fail('FACTION_BOUNDED_GENERATION_TARGET_ORIGIN_DRIFT');
  } finally { db.close(); }
  for (const [index, row] of readiness.origins.entries()) {
    const evidence = readFactionTeachFailureEvidenceV1({ filename, runId: row.originRunId, attemptId: row.originAttemptId });
    const receipt = verifySeal(JSON.parse(evidence.attempt.response)).value;
    if (row.originRunId !== (index < 2 ? originRunId : first) || !next.inputHashes.includes(row.inputHash)
      || evidence.attempt.state !== 'failed' || evidence.attempt.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
      || receipt.receiptHash !== row.originalFailureReceiptHash || evidence.rejected.hash !== row.rejectedCandidateHash
      || receipt.status !== 200 || receipt.incompleteReason !== null || hash(receipt.usage) !== hash(row.originalUsage)
      || evidence.attempt.settled !== row.originalSettledMicros || evidence.rejected.contextManifestRef.hash !== row.contextHash)
      fail('FACTION_BOUNDED_GENERATION_ORIGIN_DRIFT');
  }
  for (const row of readiness.codeHashes)
    if (next.codeHashes.find(r => r.file === row.file)?.hash !== row.hash) fail('FACTION_BOUNDED_GENERATION_CODE_DRIFT');
  return seal({ version: 'faction_bounded_generation_migration_v2', readinessHash: readiness.hash,
    bindingHash: envelope.hash, targetBindingHash: targetBinding.hash, originRunId: first, originAttempts: expected,
    files: readiness.codeHashes.map(r => r.file),
    policy: 'explicit_full_text_host_envelope_and_native_target_rewrite_keep_prior_contracts_and_receipts',
    acceptanceInherited: false, accountingReset: false, trainingTruth: false });
}
