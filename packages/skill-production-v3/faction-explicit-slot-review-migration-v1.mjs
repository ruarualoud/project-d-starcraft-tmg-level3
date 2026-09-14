import { factionLimitsCompatibleV1 } from './faction-budget-extension-v1.mjs';
import { DatabaseSync } from 'node:sqlite';
import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { FACTION_EXPLICIT_SLOT_REVIEW_BINDING_V1 as binding } from './faction-explicit-slot-review-binding-v1.mjs';
import { readFactionStructuredSuccessEvidenceV1 } from '../skill-evaluation/faction-structured-success-evidence-v1.mjs';

// Called by the full continuation validator, which separately preserves all
// other bindings, the ancestry/start, source snapshots, limits and accounting.
export function validateFactionExplicitSlotReviewMigrationV1({ filename, parentRunId, parent, next, gate }) {
  [parent, next, gate, next.explicitSlotReviewBinding].forEach(verifySeal);
  const original = parent.explicitSlotReviewBinding;
  if (next.explicitSlotReviewBinding.hash !== binding.hash || original && original.hash !== binding.hash
    || gate.binding?.hash !== binding.hash || !gate.passed || gate.providerCalls !== 0
    || next.explicitSlotReviewReadinessHash !== gate.hash
    || hash(parent.inputHashes) !== hash(next.inputHashes) || !factionLimitsCompatibleV1(parent, next)
    || !gate.actualContextRebuilt || !gate.consumerReplayPassed || !gate.originalJudgmentsPreserved
    || !gate.explicitNamespaceOnly || !gate.oldAddressReceiptsPreserved || gate.actualDshSessions !== 1
    || !gate.sqliteRestartPassed || !gate.runnerParametersBound
    || !next.inputHashes.includes(gate.reviewInputHash) || !original && parentRunId !== gate.originRunId)
    fail('FACTION_EXPLICIT_SLOT_REVIEW_MIGRATION_INVALID');
  for (const c of gate.codeHashes)
    if (next.codeHashes.find(r => r.file === c.file)?.hash !== c.hash) fail('FACTION_EXPLICIT_SLOT_REVIEW_CODE_DRIFT');
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    if (db.prepare("SELECT count(*) n FROM attempts WHERE run=? AND state='intent'").get(parentRunId).n
      || db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'").get(parentRunId).n)
      fail('FACTION_EXPLICIT_SLOT_REVIEW_PARENT_NOT_TERMINAL');
  } finally { db.close(); }
  const evidence = readFactionStructuredSuccessEvidenceV1({ filename, runId: gate.originRunId, attemptId: gate.reviewOriginAttemptId });
  if (evidence.candidate.providerReceiptHash !== gate.originalReceiptHash
    || evidence.candidate.hash !== gate.originalCandidateHash
    || gate.recoveredRole?.completeReviewImportProof?.candidateHash !== evidence.candidate.hash
    || gate.recoveredRole?.hostMaterializationReceipt?.coverageAddressResolution?.bindingHash !== binding.coverageAddress.hash)
    fail('FACTION_EXPLICIT_SLOT_REVIEW_ORIGIN_DRIFT');
  return seal({ version: 'faction_explicit_slot_review_migration_v1', readinessHash: gate.hash,
    bindingHash: binding.hash, originalCandidateHash: evidence.candidate.hash,
    originalReceiptHash: evidence.candidate.providerReceiptHash, parentRunId,
    files: gate.codeHashes.map(c => c.file), accountingReset: false, acceptanceInherited: false, trainingTruth: false });
}
