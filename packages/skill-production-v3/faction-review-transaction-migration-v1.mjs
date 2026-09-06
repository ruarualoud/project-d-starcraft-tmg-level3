import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';

export function validateFactionReviewTransactionMigrationV1({ parent, next, readiness, actualEvidence }) {
  [parent, next].forEach(verifySeal);
  const before = parent.reviewTransactionBindings, after = next.reviewTransactionBindings;
  if (before && hash(before) !== hash(after || null)) fail('FACTION_REVIEW_TRANSACTION_BINDINGS_CHANGED');
  if (!after) {
    if (readiness || actualEvidence || next.reviewTransactionReadinessHash || next.reviewTransactionEvidenceHash)
      fail('FACTION_REVIEW_TRANSACTION_UNSCOPED_PROOF');
    return null;
  }
  if (!readiness || !actualEvidence) fail('FACTION_REVIEW_TRANSACTION_PROOF_MISSING');
  [readiness, actualEvidence].forEach(verifySeal);
  if (!Array.isArray(after) || after.length !== 2) fail('FACTION_REVIEW_TRANSACTION_BINDINGS_INVALID');
  after.forEach(verifySeal);
  const files = ['packages/skill-production-v3/faction-review-transaction-runtime-v1.mjs',
    'packages/skill-production-v3/faction-source-dependency-context-v1.mjs',
    'packages/skill-production-v3/faction-repair-regression-guard-v1.mjs',
    'packages/skill-production-v3/faction-review-transaction-migration-v1.mjs'];
  if (!readiness.passed || readiness.hash !== next.reviewTransactionReadinessHash
    || actualEvidence.hash !== next.reviewTransactionEvidenceHash
    || readiness.actualRecheckEvidenceHash !== actualEvidence.hash
    || hash(readiness.inputHashes) !== hash(next.inputHashes)
    || hash(readiness.bindingHashes) !== hash(after.map(b => b.hash))
    || after.some((b, n) => b.inputHash !== next.inputHashes[n] || b.contextHash !== next.contextHash
      || hash(b.sourceBinding) !== hash(next.sourceBinding) || b.revisionBudgetReset || b.modelNegativeJudgmentWaived
      || !b.changedContextCreatesNewPhysicalRoleNamespace || !b.guardBeforePatchApplication)
    || after[0].phaseFieldBindingHash !== next.phaseFieldBinding?.hash || after[1].phaseFieldBindingHash !== null
    || !readiness.fullOldWorkflowReplayed || !readiness.oldRequestsUnchangedBeforeIntervention
    || !readiness.newReviewNamespaces || !readiness.badEditBlockedBeforeApplicationAndBeforeNextReview
    || !readiness.blockedRawEditAndReceiptPersisted || !readiness.modelReviewAcceptanceNotInherited
    || !readiness.originalRevisionBudgetPreserved || readiness.newProviderCalls !== 0
    || actualEvidence.version !== 'actual_faction_dependency_recheck_evidence_v1'
    || actualEvidence.inputHash !== next.inputHashes[0] || !actualEvidence.actualProviderRequestsMatched
    || !actualEvidence.delivery.completeRequestsMatchedByHash || !actualEvidence.delivery.rawResponsesMatchedByFingerprint
    || actualEvidence.loops.length !== 2 || !actualEvidence.partialReviewNotSectionAcceptance
    || actualEvidence.newProviderCalls !== 0 || actualEvidence.trainingTruth !== false
    || files.slice(0, 3).some(file => !next.codeHashes.find(c => c.file === file)
      || next.codeHashes.find(c => c.file === file).hash !== readiness.codeHashes.find(c => c.file === file)?.hash))
    fail('FACTION_REVIEW_TRANSACTION_MIGRATION_PROOF_INVALID');
  return seal({ files, bindingHashes: after.map(b => b.hash), readinessHash: readiness.hash,
    actualRecheckEvidenceHash: actualEvidence.hash, policy: 'new_source_context_role_namespace_preserve_old_raw_requests_and_accounting_guard_edits_before_apply',
    oldNegativeJudgmentsRetained: true, acceptanceInherited: false, budgetReset: false, trainingTruth: false });
}
