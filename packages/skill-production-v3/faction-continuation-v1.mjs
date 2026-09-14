import { DatabaseSync } from 'node:sqlite';
import { validateFactionParsedWireMigrationV2 } from './faction-parsed-wire-scope-v2.mjs';
import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { validateFactionBudgetExtensionV1 } from './faction-budget-extension-v1.mjs';
import { isFactionBudgetEpochV1 } from './faction-budget-epoch-v1.mjs';
import { validateFactionReviewTransactionMigrationV1 } from './faction-review-transaction-migration-v1.mjs';
import { createFactionStructuredReviewOutputCapFailureImportV1 } from
  './faction-structured-review-runtime-v1.mjs';
import { createFactionStructuredReviewOutputCapSuccessImportV1 } from
  './faction-structured-review-runtime-v1.mjs';
import { FACTION_PARALLEL_BINDING_V1 } from './faction-parallel-v1.mjs';
import { createFactionTeachRecoveryV1 } from './faction-teach-recovery-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_CATALOGUE_BINDING_V1 } from '../../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs';
import { FACTION_REVIEW_RECOVERY_BUDGET_BINDING_V2 } from './faction-review-recovery-budget-v2.mjs';
import { FACTION_STRUCTURED_TEACH_BINDING_V1 } from './faction-structured-teach-runtime-v1.mjs';
import { FACTION_TEACH_OUTPUT_BUDGET_BINDING_V1,
  verifyFactionNativeTeachCapacityFailureV1 } from './faction-teach-output-budget-v1.mjs';
import { FACTION_NATIVE_PRODUCTION_BINDING_V1 } from '../../content/skill-generation/ticket-18-faction-native-production-contracts-v1.mjs';
import { FACTION_TEACH_UNCERTAINTY_RECOVERY_BINDING_V1 } from './faction-teach-uncertainty-recovery-v1.mjs';
import { readFactionTeachFailureEvidenceV1 } from '../skill-evaluation/faction-teach-failure-evidence-v1.mjs';
import { FACTION_REVIEW_FOCUS_CAPACITY_RECOVERY_BINDING_V1 } from './faction-review-focus-capacity-recovery-v1.mjs';
import { FACTION_METADATA_RECOVERY_BINDING_V1 } from './faction-metadata-recovery-binding-v1.mjs';
import { FACTION_TARGET_COMPLETION_BINDING_V1 } from './faction-target-completion-binding-v1.mjs';
import { FACTION_NATIVE_OUTPUT_CAPACITY_BINDING_V2, frozenFactionNativeOutputRolesV2 } from './faction-native-output-capacity-v2.mjs';
import { FACTION_TARGET_ID_REVIEW_BINDING_V1 } from './faction-target-id-review-binding-v1.mjs';
import { FACTION_EXPLICIT_SLOT_REVIEW_BINDING_V1 } from './faction-explicit-slot-review-binding-v1.mjs';
import { validateFactionExplicitSlotReviewMigrationV1 } from './faction-explicit-slot-review-migration-v1.mjs';
import { FACTION_OBSERVED_SOURCE_REPAIR_BINDING_V1 } from './faction-observed-source-repair-v1.mjs';
import { readFactionStructuredSuccessEvidenceV1 } from '../skill-evaluation/faction-structured-success-evidence-v1.mjs';
import { validateFactionPlanningMigrationV1 } from './faction-planning-migration-v1.mjs';
import { validateFactionProposerAuxiliaryMigrationV1 } from './faction-proposer-auxiliary-migration-v1.mjs';
import { validateFactionDraftPolicyMigrationV2 } from './faction-draft-policy-migration-v2.mjs';
import { validateFactionWireRuntimeMigrationV2 } from './faction-wire-runtime-migration-v2.mjs';
import { validateFactionReviewDecompositionMigrationV1 } from './faction-review-decomposition-continuation-v1.mjs';
import { readFactionCheckpointInventoryV1 } from './faction-checkpoint-inventory-v1.mjs';
import { validateFactionResumeReliabilityMigrationV1 } from './faction-resume-reliability-v1.mjs';
import { validateFactionContractProjectionMigrationV1 } from './faction-review-contract-projection-integration-v1.mjs';
import { collectFactionEditorEnvelopeFailureImportsV2 } from './faction-editor-envelope-failure-imports-v2.mjs';
import { validateFactionZergUnitTimingMigrationV1 } from './faction-zerg-unit-timing-migration-v1.mjs';
import { validateFactionWireAddressRecoveryMigrationV1 } from './faction-wire-address-recovery-migration-v1.mjs';
import { verifyProductionExecutionMigrationV1 } from '../skill-production/execution-policy-v1.mjs';
import { verifyFactionExecutionModelMigrationV1 } from './faction-execution-model-v1.mjs';
import { validateFactionSlotReviewMigrationV1 } from './faction-slot-review-migration-v1.mjs';
import { validateFactionStructuralJsonMigrationV1 } from './faction-structural-json-scope-v1.mjs';
import { validateFactionFieldRecoveryMigrationV1 } from './faction-field-recovery-scope-v1.mjs';
import { validateFactionFieldValueMigrationV1 } from './faction-field-value-integration-v1.mjs';
import { validateFactionFieldSourceMigrationV1 } from './faction-field-source-integration-v1.mjs';
import { validateFactionMixedReviewMigrationV1 } from './faction-mixed-review-integration-v1.mjs';
import { validateFactionReviewSourceExpansionMigrationV1 } from './faction-review-source-expansion-scope-v1.mjs';

export function validateFactionReviewFocusNormalizationMigrationV1({
  parentRunId, parent, parentReport, next, readiness,
}) {
  [parent, parentReport, next].forEach(verifySeal);
  if (parent.reviewFocusNormalizationReadinessHash
    && parent.reviewFocusNormalizationReadinessHash
      !== next.reviewFocusNormalizationReadinessHash) {
    fail('FACTION_REVIEW_FOCUS_NORMALIZATION_REMOVED');
  }
  if (!next.reviewFocusNormalizationReadinessHash) {
    if (readiness) fail('FACTION_REVIEW_FOCUS_NORMALIZATION_UNSCOPED');
    return null;
  }
  verifySeal(readiness);
  const introduced = !parent.reviewFocusNormalizationReadinessHash;
  const files = [
    'packages/skill-production-v3/faction-review-targets-v1.mjs',
    'scripts/verify-ticket-18-faction-review-focus-normalization-v1.mjs',
  ];
  if (readiness.hash !== next.reviewFocusNormalizationReadinessHash
    || !readiness.passed || readiness.checks !== 7 || readiness.providerCalls !== 0
    || readiness.focusRepairs !== 2
    || readiness.originalReviewHash !== readiness.redundantSchemaRepairHash
    || hash(readiness.originalLengths) !== hash([333, 254])
    || hash(readiness.normalizedLengths) !== hash([240, 240])
    || !readiness.exactOriginalBindingsVerified || !readiness.judgmentsUnchanged
    || readiness.rawProviderOutputOverwritten !== false
    || readiness.sourceRefreshPerformed !== false
    || readiness.semanticCorrectnessProven !== false
    || readiness.trainingTruth !== false
    || introduced && (readiness.parentRunId !== parentRunId
      || readiness.parentFailureCode !== parentReport.failure?.code
      || parentReport.failure?.code !== 'FACTION_SCHEMA_REPAIR_NO_PROGRESS')
    || files.some(file => next.codeHashes.find(row => row.file === file)?.hash
      !== readiness.codeHashes.find(row => row.file === file)?.hash)) {
    fail('FACTION_REVIEW_FOCUS_NORMALIZATION_PROOF_INVALID');
  }
  return seal({ files, readinessHash: readiness.hash,
    originRunId: readiness.parentRunId,
    originalReviewHash: readiness.originalReviewHash,
    policy: 'layout_only_exact_source_binding_then_bounded_quote_metadata_no_judgment_change',
    trainingTruth: false });
}

export function validateFactionRepairConflictHistoryMigrationV1({
  parentRunId, parent, parentReport, next, readiness,
}) {
  [parent, parentReport, next].forEach(verifySeal);
  if (parent.repairConflictHistoryBinding
    && hash(parent.repairConflictHistoryBinding)
      !== hash(next.repairConflictHistoryBinding || null)) {
    fail('FACTION_REPAIR_CONFLICT_HISTORY_BINDING_DRIFT');
  }
  if (!next.repairConflictHistoryBinding) {
    if (readiness?.repairConflictHistoryReadiness) {
      fail('FACTION_REPAIR_CONFLICT_HISTORY_UNSCOPED');
    }
    return null;
  }
  verifySeal(next.repairConflictHistoryBinding);
  verifySeal(readiness);
  const proof = readiness.repairConflictHistoryReadiness;
  verifySeal(proof);
  const binding = next.repairConflictHistoryBinding;
  const introduced = !parent.repairConflictHistoryBinding;
  const files = [
    'packages/skill-production-v3/faction-strategy-workflow-v1.mjs',
    'packages/skill-production-v3/faction-repair-conflict-history-v1.mjs',
  ];
  if (readiness.hash !== next.workflowReadinessHash
    || binding.version !== 'faction_repair_conflict_history_binding_v1'
    || binding.minimumRepeatedNegativeRounds !== 3
    || binding.minimumRepeatedNegativeRounds
      !== proof.minimumRepeatedNegativeRounds
    || binding.resolutionPolicy
      !== 'three_round_escalation_preserve_all_findings_forbid_rejected_versions_remove_disputed_certainty_then_fresh_whole_section_review'
    || binding.trainingTruth !== false
    || proof.actualFailureCode !== 'FACTION_SOURCE_REVIEW_NOT_PASSED'
    || proof.actualRepeatedNegativeRounds !== 4
    || proof.rejectedRecommendationVersions !== 4
    || proof.expectedFirstCutoverRole
      !== 'faction.terran_armed_forces.objectives.1.editor.2.2'
    || !proof.oldVersionRestorationRejected
    || !proof.ordinaryTwoRoundRepairPreservesExactReuse
    || !proof.conservativeRepairDoesNotProveSemanticResolution
    || proof.providerCalls !== 0 || proof.trainingTruth !== false
    || introduced && (proof.actualFailureRunId !== parentRunId
      || parentReport.failure?.code !== proof.actualFailureCode
      || !parentReport.candidateHashes?.includes(proof.actualCandidateHash))
    || files.some(file => next.codeHashes.find(row => row.file === file)?.hash
      !== readiness.codeHashes.find(row => row.file === file)?.hash)) {
    fail('FACTION_REPAIR_CONFLICT_HISTORY_PROOF_INVALID');
  }
  return seal({ files, readinessHash: readiness.hash,
    bindingHash: binding.hash, introduced,
    expectedFirstCutoverRole: proof.expectedFirstCutoverRole,
    policy: binding.resolutionPolicy,
    semanticConflictResolved: false, trainingTruth: false });
}

export function validateFactionStructuredReviewMigrationV1({
  parentRunId, parent, parentReport, next, migration,
}) {
  [parent, parentReport, next].forEach(verifySeal);
  const bindingChanged = Boolean(parent.structuredReviewBinding
    && hash(parent.structuredReviewBinding)
      !== hash(next.structuredReviewBinding || null));
  if (!next.structuredReviewBinding) {
    if (migration || next.structuredReviewReadinessHash) {
      fail('FACTION_STRUCTURED_REVIEW_MIGRATION_UNSCOPED');
    }
    return null;
  }
  const { readiness, capabilityReport } = migration || {};
  [next.structuredReviewBinding, readiness, capabilityReport].forEach(verifySeal);
  const binding = next.structuredReviewBinding;
  const introduced = !parent.structuredReviewBinding;
  const contractMigration = readiness.contractMigration;
  const capacityMigration = readiness.capacityMigration;
  const wireSyntaxRecovery = readiness.wireSyntaxRecovery;
  if (!readiness.passed || readiness.checks.length !== 19
    || readiness.hash !== next.structuredReviewReadinessHash
    || readiness.providerCalls !== 0
    || readiness.actualCapabilityRunId !== binding.capabilityRunId
    || readiness.actualCapabilityReportHash !== binding.capabilityReportHash
    || readiness.actualCapabilityReceiptHash !== binding.capabilityReceiptHash
    || readiness.outputContractRef.hash !== binding.outputContractRef.hash
    || capabilityReport.hash !== binding.capabilityReportHash
    || capabilityReport.runId !== binding.capabilityRunId
    || capabilityReport.capabilityReceiptHash !== binding.capabilityReceiptHash
    || capabilityReport.outputContractRef.hash !== binding.outputContractRef.hash
    || !capabilityReport.passed || capabilityReport.paidCallsThisExecution !== 1
    || capabilityReport.automaticRetries !== 0
    || capabilityReport.ledger.knownTokens > capabilityReport.limits.maxTokens
    || capabilityReport.ledger.reservedOrSettledMicros
      > capabilityReport.limits.maxCostMicros
    || !readiness.completeCoreFaqIncluded
    || !readiness.completeCurrentFactionProductsIncluded
    || !readiness.hostOwnedIdentityMaterialization
    || !readiness.onePhysicalAttemptPerInvocation
    || !capacityMigration
    || capacityMigration.failureClass !== 'output_incomplete'
    || capacityMigration.incompleteReason !== 'max_output_tokens'
    || capacityMigration.previousMaxOutputUnits !== 2048
    || capacityMigration.nextMaxOutputUnits !== 4096
    || capacityMigration.exactOutputContractRetained !== true
    || capacityMigration.oneExplicitContinuationOnly !== true
    || capacityMigration.automaticRetries !== 0
    || capacityMigration.profileCeilingOutputUnits !== 4096
    || capacityMigration.atProfileCeilingRoute
      !== 'one_explicit_same_task_compact_recovery_with_new_attempt_identity'
    || capacityMigration.maximumFocusRowsPerTarget !== 4
    || capacityMigration.maximumSourceSlotsPerTarget !== 4
    || capacityMigration.maximumReasonCharacters !== 600
    || capacityMigration.hardMaximumReasonCharacters !== 800
    || capacityMigration.hardMaximumRecoveryOutputUnits !== 3072
    || capacityMigration.settledFailureImportSupported !== true
    || capacityMigration.settledSuccessImportSupported !== true
    || capacityMigration.settledSuccessCurrentUsageZero !== true
    || capacityMigration.strictDshImportTested !== true
    || capacityMigration.actualSettledSuccessRunId
      !== 'faction-v1-cd070778679108170434'
    || capacityMigration.actualSettledSuccessAttemptId
      !== 'structured-9e994853747efff1c1e2323ca16304c41ca538bcbe78b7df'
    || capacityMigration.actualSettledSuccessCandidateHash
      !== '9b3aa4a5d7f0a7dfa82a12693937cc9e37a40d18dd848a1f8062c789ada54ec7'
    || capacityMigration.actualSettledSuccessOutputUnits !== 1065
    || capacityMigration.actualSettledSuccessLongestReasonCharacters !== 629
    || capacityMigration.originalAttemptReplayAllowed !== false
    || capacityMigration.rejectedPartialOutputUsed !== false
    || capacityMigration.furtherRecoveryAllowed !== false
    || readiness.actualCapacityFailureRunId
      !== 'faction-v1-ad5d16565e2b118d830a'
    || !readiness.actualCapacityFailureReceiptHash
    || readiness.actualOutputCeilingFailureRunId
      !== 'faction-v1-64dfe1d35c4921569be7'
    || !readiness.actualOutputCeilingFailureReceiptHash
    || !wireSyntaxRecovery
    || wireSyntaxRecovery.policy
      !== 'lossless_unique_json_normalization_before_schema_validation'
    || hash(wireSyntaxRecovery.allowedKinds) !== hash([
      'outer_object_close', 'single_json_fence',
      'single_json_fence_and_outer_object_close',
      'redundant_array_object_closers_v1', 'single_unescaped_quote_v1'])
    || wireSyntaxRecovery.originalActualTextRecoverable !== false
    || wireSyntaxRecovery.promptOnlyRetryAllowed !== false
    || wireSyntaxRecovery.schemaValidationAfterNormalization !== true
    || wireSyntaxRecovery.semanticAcceptanceInherited !== false
    || readiness.actualWireFailureRunId
      !== 'faction-v1-58dc727c7ae7ce8cece5'
    || !readiness.actualWireFailureReceiptHash
    || bindingChanged && (!contractMigration
      || contractMigration.from?.hash
        !== parent.structuredReviewBinding.outputContractRef.hash
      || contractMigration.to?.hash !== binding.outputContractRef.hash
      || contractMigration.changes?.length !== 2
      || contractMigration.changes[0].path
        !== '$.properties.verdicts.items.properties.reason.maxLength'
      || contractMigration.changes[0].before !== 1200
      || contractMigration.changes[0].after !== 16384
      || contractMigration.changes[1].path
        !== '$.properties.coverage.items.properties.reason.maxLength'
      || contractMigration.changes[1].before !== 400
      || contractMigration.changes[1].after !== 16384
      || contractMigration.wholeResponseMaxOutputUnits !== 4096
      || contractMigration.legacyPromptReasonMaximumUnchanged !== 1200
      || contractMigration.oldContractFrozen !== true
      || contractMigration.hostOwnedFieldsChanged !== false
      || contractMigration.semanticValidatorChanged !== true
      || contractMigration.mapperChanged !== false
      || contractMigration.semanticAcceptanceInherited !== false
      || readiness.previousOutputContractRef?.hash
        !== parent.structuredReviewBinding.outputContractRef.hash
      || readiness.actualBoundaryFailureRunId
        !== 'faction-v1-540b0fa661c00b3d3bdc'
      || !readiness.actualBoundaryRejectedCandidateHash)
    || introduced && (readiness.actualFailureRunId !== parentRunId
      || readiness.actualFailureCode !== parentReport.failure?.code
      || readiness.actualFailureDiagnosticHash
        !== parentReport.failure?.diagnosticHash
      || parentReport.failure?.code !== 'PROVIDER_RESPONSE_JSON_INVALID')) {
    fail('FACTION_STRUCTURED_REVIEW_MIGRATION_INVALID');
  }
  const files = readiness.codeHashes.map((row) => row.file);
  for (const row of readiness.codeHashes) {
    if (next.codeHashes.find((entry) => entry.file === row.file)?.hash
      !== row.hash) fail('FACTION_STRUCTURED_REVIEW_CODE_DRIFT');
  }
  return seal({ files, readinessHash: readiness.hash,
    capabilityRunId: binding.capabilityRunId,
    capabilityReceiptHash: binding.capabilityReceiptHash,
    outputContractHash: binding.outputContractRef.hash,
    originFailureRunId: readiness.actualFailureRunId,
    ...(bindingChanged ? { contractMigrationHash: contractMigration.hash } : {}),
    policy: 'all_new_target_reviews_use_schema_slots_then_host_identity_materialization_and_existing_semantic_validation_with_explicit_bounded_contract_migration',
    trainingTruth: false });
}

export function validateFactionPhaseSeedMigrationV1({ parent, next, migration }) {
  [parent, next].forEach(verifySeal);
  if (parent.phaseFieldBinding && hash(parent.phaseFieldBinding) !== hash(next.phaseFieldBinding || null))
    fail('FACTION_PHASE_SEED_BINDING_DRIFT');
  if (!next.phaseFieldBinding) {
    if (migration || next.phaseFieldReadinessHash) fail('FACTION_PHASE_SEED_POLICY_INVALID');
    return null;
  }
  const { binding, readiness } = migration || {};
  if (!binding || !readiness) fail('FACTION_PHASE_SEED_MIGRATION_PROOF_MISSING');
  [binding, readiness, next.phaseFieldBinding].forEach(verifySeal);
  const files = ['packages/skill-production-v3/faction-phase-field-seed-v1.mjs',
    'packages/skill-production-v3/faction-phase-seed-clarification-v1.mjs',
    'packages/skill-production-v3/faction-phase-field-repair-v1.mjs',
    'packages/skill-evaluation/faction-phase-field-evidence-v1.mjs', 'packages/skill-evaluation/faction-phase-source-debt-v1.mjs'];
  if (binding.hash !== next.phaseFieldBinding.hash || !next.inputHashes.includes(binding.inputHash)
    || !parent.phaseFieldBinding && binding.sourceRecipeHash !== parent.hash
    || readiness.hash !== next.phaseFieldReadinessHash || !readiness.passed || readiness.bindingHash !== binding.hash
    || readiness.evidenceHash !== binding.evidenceHash || !readiness.actualRepairReapplied
    || !readiness.freshReviewRequired || !readiness.freshNegativeRetained || !readiness.freshRequestNamespace
    || !readiness.previousRawRolesRetained || readiness.injectedReviews !== 16 || readiness.importedFields !== 11
    || readiness.disclosedHostClarifications !== 1 || readiness.providerCalls !== 0
    || binding.semanticAcceptanceInherited !== false || binding.importBeforeRevision >= next.limits.maxRevisions
    || [...files, 'packages/skill-production-v3/faction-strategy-workflow-v1.mjs'].some(file =>
      !next.codeHashes.find(row => row.file === file)
      || next.codeHashes.find(row => row.file === file)?.hash !== readiness.codeHashes.find(row => row.file === file)?.hash))
    fail('FACTION_PHASE_SEED_MIGRATION_PROOF_INVALID');
  return seal({ files, bindingHash: binding.hash, readinessHash: readiness.hash, evidenceHash: binding.evidenceHash,
    policy: 'reproduce_exact_parent_import_actual_patch_disclose_host_clarification_use_fresh_review_epoch_no_budget_reset', trainingTruth: false });
}

export function validateAdditionalFactionCommandRecoveryV1({ parent, next, gates = [] }) {
  [parent, next].forEach(verifySeal);
  const before = parent.additionalCommandRecoveryBindings || [], after = next.additionalCommandRecoveryBindings || [];
  if (!Array.isArray(before) || !Array.isArray(after) || !Array.isArray(gates)
    || after.length < before.length || after.length > before.length + 1)
    fail('FACTION_ADDITIONAL_COMMAND_RECOVERY_SCOPE');
  if (!after.length) {
    if (next.additionalCommandRecoveryReadinessHashes || gates.length) fail('FACTION_ADDITIONAL_COMMAND_RECOVERY_SCOPE');
    return null;
  }
  if (gates.length !== after.length || new Set(after.map(row => row.hash)).size !== after.length)
    fail('FACTION_ADDITIONAL_COMMAND_RECOVERY_PROOF_MISSING');
  [...before, ...after, ...gates].forEach(verifySeal);
  if (before.some((row, index) => row.hash !== after[index].hash)) fail('FACTION_ADDITIONAL_COMMAND_RECOVERY_PREFIX_DRIFT');
  if (hash(gates.map(gate => gate.hash)) !== hash(next.additionalCommandRecoveryReadinessHashes))
    fail('FACTION_ADDITIONAL_COMMAND_RECOVERY_PROOF_DRIFT');
  for (const [index, binding] of after.entries()) {
    const gate = gates[index];
    if (binding.modelHash !== next.modelHash || binding.contextHash !== next.contextHash
      || hash(binding.sourceBinding) !== hash(next.sourceBinding)
      || index >= before.length && (binding.parentRecipeHash !== parent.hash || binding.parentRunId !== 'faction-v1-' + parent.hash.slice(0, 20))
      || !gate.passed || gate.recoveryManifest?.hash !== binding.hash
      || gate.primaryRecoveryManifestHash !== next.commandRecoveryBinding?.hash
      || !next.inputHashes.includes(gate.inputHash) || gate.dshBinding?.hash !== next.dshBindingHash
      || gate.actualDshSessions !== 1 || gate.providerCalls !== 0 || !gate.exactPriorProviderRequestsMatched
      || !gate.rawOutputPreserved || !gate.originalNegativeJudgmentsPreserved || !gate.nonemptyMetadataRejected
      || !gate.prefixRecoveryRetained || gate.attemptsCopied !== 0
      || ['packages/skill-production-v3/faction-command-envelope-v1.mjs', 'packages/skill-production-v3/faction-review-targets-v1.mjs']
        .some(file => !next.codeHashes.find(row => row.file === file)
          || next.codeHashes.find(row => row.file === file)?.hash !== gate.codeHashes?.find(row => row.file === file)?.hash))
      fail('FACTION_ADDITIONAL_COMMAND_RECOVERY_PROOF_INVALID');
  }
  return seal({ priorBindings: before.map(row => row.hash), bindings: after.map(row => row.hash),
    readinessHashes: gates.map(gate => gate.hash), originalPrimaryBindingPreserved: true,
    policy: 'append_source_bound_exact_paid_request_recoveries_no_attempt_copy_no_judgment_change', trainingTruth: false });
}

export function validateFactionSourceCorrectionMigrationV1({ parent, next, sourceCorrectionMigration }) {
  [parent, next].forEach(verifySeal);
  if (parent.registeredSourceFieldRepair && !next.registeredSourceFieldRepair) fail('FACTION_SOURCE_CORRECTION_REMOVED');
  if (parent.commandRecoveryBinding && hash(parent.commandRecoveryBinding) !== hash(next.commandRecoveryBinding || null)) fail('FACTION_COMMAND_RECOVERY_BINDING_DRIFT');
  if (!next.registeredSourceFieldRepair) {
    if (next.commandRecoveryBinding || next.sourceCorrectionReadinessHashes) fail('FACTION_SOURCE_CORRECTION_POLICY_INVALID');
    return null;
  }
  const gates = sourceCorrectionMigration;
  if (!Array.isArray(gates) || gates.length !== 4) fail('FACTION_SOURCE_CORRECTION_PROOF_MISSING');
  gates.forEach(verifySeal); verifySeal(next.commandRecoveryBinding);
  const [unit, dsh, workflow, command] = gates;
  const files = ['packages/skill-production-v3/faction-source-field-repair-v2.mjs',
    'packages/skill-evaluation/faction-cross-field-source-audit-v1.mjs', 'packages/skill-production-v3/faction-command-envelope-v1.mjs'];
  if (next.registeredSourceFieldRepair !== true || hash(gates.map(g => g.hash)) !== hash(next.sourceCorrectionReadinessHashes)
    || gates.some(g => !g.passed || g.inputHash !== next.inputHashes[0])
    || unit.actualKnownCounterexamples !== 7 || !unit.atomicApplicationAcrossBatches || !unit.fullDraftEachBatch || !unit.completedBatchReused
    || !dsh.fullSourceDeliveryVerified || dsh.actualDshSessions !== 3 || dsh.providerCalls !== 0 || dsh.dshBinding.hash !== next.dshBindingHash
    || workflow.knownCounterexamples !== 4 || !workflow.repairsIntegrated || !workflow.freshNegativeRetained || workflow.freshWholeSectionReviews !== 16
    || command.actualDshSessions !== 1 || !command.exactPriorProviderRequestsMatched || command.originalNegativeJudgmentsPreserved !== 2
    || command.providerCalls !== 0 || command.dshBinding.hash !== next.dshBindingHash
    || command.recoveryManifest.hash !== next.commandRecoveryBinding.hash
    || next.commandRecoveryBinding.modelHash !== next.modelHash || next.commandRecoveryBinding.contextHash !== next.contextHash
    || hash(next.commandRecoveryBinding.sourceBinding) !== hash(next.sourceBinding)
    || [...files, 'packages/skill-production-v3/faction-strategy-workflow-v1.mjs'].some(file => {
      const target = next.codeHashes.find(r => r.file === file);
      const matches = gates.flatMap(g => g.codeHashes || []).filter(r => r.file === file);
      return !target || !matches.length || matches.some(r => r.hash !== target.hash);
    })) fail('FACTION_SOURCE_CORRECTION_PROOF_INVALID');
  return seal({ files, readinessHashes: gates.map(g => g.hash), commandRecoveryBindingHash: next.commandRecoveryBinding.hash,
    policy: 'registered_source_fields_then_fresh_review_and_exact_paid_request_bare_review_envelope_no_judgment_change', trainingTruth: false });
}

export function inspectFactionContinuationV1({ filename, parentRunId, parent, parentReport, next, normalizationMigration, correctionMigration, fieldRepairMigration, unitRoleRepairMigration, sourceCorrectionMigration, additionalCommandRecoveryMigration, phaseSeedMigration, budgetExtensionReadiness, reviewTransactionMigration, structuredGenerationMigration, reviewFocusNormalizationMigration, structuredReviewMigration, repairConflictHistoryMigration, capacityMigration, executionPolicyReadiness, executionModelReadiness }) {
  [parent, parentReport, next].forEach(verifySeal);
  if (parent.version !== 'faction_strategy_production_v1' || parentRunId !== 'faction-v1-' + parent.hash.slice(0, 20)
    || parentReport.runId !== parentRunId || parentReport.recipeHash !== parent.hash || !parentReport.failure) fail('FACTION_CONTINUATION_PARENT_INVALID');
  const budgetProof = parent.budgetExtension || next.budgetExtension ? validateFactionBudgetExtensionV1({ parent, next }) : null;
  const budgetFile = 'packages/skill-production-v3/faction-budget-extension-v1.mjs';
  if (budgetProof) {
    if (!budgetExtensionReadiness) fail('FACTION_BUDGET_READINESS_REQUIRED');
    verifySeal(budgetExtensionReadiness);
    if (!budgetExtensionReadiness.passed || budgetExtensionReadiness.hash !== next.budgetExtensionReadinessHash
      || budgetExtensionReadiness.providerCalls !== 0 || !next.codeHashes.find(row => row.file === budgetFile)
      || next.codeHashes.find(row => row.file === budgetFile)?.hash !== budgetExtensionReadiness.codeHashes.find(row => row.file === budgetFile)?.hash)
      fail('FACTION_BUDGET_READINESS_INVALID');
  } else if (budgetExtensionReadiness || next.budgetExtensionReadinessHash) fail('FACTION_BUDGET_READINESS_UNSCOPED');
  const strip = r => { const { hash: ignored, codeHashes, workflowReadinessHash, dshContextReadinessHash, mainReadinessHash, jsonRecoveryReadinessHash,
    targetedCorrectionsReadinessHash, knownRulePolicyHashes, fieldRepairBinding, unitRoleRepairReadinessHashes,
    registeredSourceFieldRepair, commandRecoveryBinding, sourceCorrectionReadinessHashes,
    additionalCommandRecoveryBindings, additionalCommandRecoveryReadinessHashes, phaseFieldBinding, phaseFieldReadinessHash,
    budgetExtension, budgetExtensionReadinessHash, reviewTransactionBindings, reviewTransactionReadinessHash,
    reviewTransactionEvidenceHash, structuredGenerationBinding,
    reviewFocusNormalizationReadinessHash,
    structuredGenerationReadinessHash, structuredReviewBinding,
    structuredReviewReadinessHash, repairConflictHistoryBinding,
    limits, continuation, parallelBinding, teachRecoveryBindings, teachRecoveryReadinessHash,
    catalogueReviewBinding, catalogueReviewReadinessHash, sharedScenarioReviewContext,
    eventLoopFairnessReadinessHash, structuredTeachBinding, structuredTeachReadinessHash,
    reviewRecoveryBudgetBinding, reviewRecoveryBudgetReadinessHash,
    teachOutputBudgetBinding, teachOutputBudgetReadinessHash,
    teachUncertaintyRecoveryBinding, teachUncertaintyReadinessHash,
    reviewFocusCapacityRecoveryBinding, reviewFocusCapacityReadinessHash,
    metadataRecoveryBinding, metadataRecoveryReadinessHash,
    targetCompletionBinding, targetCompletionReadinessHash,
    nativeOutputCapacityBinding, nativeOutputCapacityReadinessHash, nativeOutputCapacityFrozenRoleIds,
    targetIdReviewBinding, targetIdReviewReadinessHash,
    explicitSlotReviewBinding, explicitSlotReviewReadinessHash,
    wireRuntimeBinding, wireRuntimeReadinessHash, wireKeyHelperRef,
    reviewDecompositionBinding, reviewDecompositionReadinessHash, reviewDecompositionOrigins,
    openingFenceRecoveryBinding, openingFenceRecoveryOrigins, dualCoordinateReviewBinding, dualCoordinateReviewOrigins,
    wireAddressRecoveryReadinessHash,
    observedSourceRepairBinding, observedSourceRepairReadinessHash, observedRosterFactsHashes,
    proposerBatchBinding, proposerBatchFrozenRoleIds, uniqueRiskClauseBinding, planningRepairReadinessHash,
    proposerAuxiliaryCapacityBinding, proposerAuxiliaryReadinessHash, nativeTargetReconstructionBinding,
    draftEnvelopeBinding, initialSourceCorrectionBinding, editorEnvelopeBinding, draftPolicyReadinessHash,
    zergUnitTimingBinding, zergUnitTimingReadinessHash,
    executionPolicyBinding, executionPolicyReadinessHash, executionModelBinding, executionModelReadinessHash,
    reviewSlotNamespaceBinding, slotReviewLegacyRoleIds, slotReviewRecoveryOrigins, slotReviewReadinessHash,
    structuralJsonReviewBinding, structuralJsonReviewOrigins, structuralJsonReviewReadinessHash,
    fieldRecoveryBinding, fieldRecoveryOrigins, fieldRecoveryReadinessHash,
    fieldValueBinding, fieldValueReadinessHash,
    fieldValueSourceBinding, fieldValueSourceReadinessHash,
    mixedReviewBinding, ambiguousReplacementBinding, mixedReviewReadinessHash, mixedReviewLegacyRoleIds,
    checkpointInventoryBinding, checkpointRestorationWindows, parsedReviewValueBinding, resumeReliabilityReadinessHash,
    contractProjectionBinding, contractProjectionReadinessHash,
    reviewSourceExpansionBinding, reviewSourceExpansionReadinessHash,
    parsedWireSchemaBridgeBinding, parsedWireSchemaBridgeReadinessHash,
    nativeProductionBinding, nativeProductionReadinessHash, ...body } = r;
    return budgetProof ? body : { ...body, limits }; };
  if (hash(strip(parent)) !== hash(strip(next))) fail('FACTION_CONTINUATION_CONTRACT_DRIFT');
  if (parent.parallelBinding && !next.parallelBinding
    || next.parallelBinding && hash(next.parallelBinding) !== hash(FACTION_PARALLEL_BINDING_V1)
    || parent.parallelBinding && hash(parent.parallelBinding) !== hash(next.parallelBinding)) {
    fail('FACTION_PARALLEL_BINDING_DRIFT');
  }
  const additionalRecoveryProof = validateAdditionalFactionCommandRecoveryV1({ parent, next, gates: additionalCommandRecoveryMigration });
  const allowed = new Set(['packages/skill-production-v3/faction-strategy-workflow-v1.mjs',
    'packages/skill-production-v3/faction-continuation-v1.mjs', 'scripts/run-ticket-18-faction-strategy-production-v1.mjs']);
  if (next.parallelBinding) allowed.add('packages/skill-production-v3/faction-parallel-v1.mjs');
  const executionPolicyProof = verifyProductionExecutionMigrationV1({ parent, next, readiness: executionPolicyReadiness });
  executionPolicyProof?.files.forEach(file => allowed.add(file));
  const executionModelProof = verifyFactionExecutionModelMigrationV1({parent,next,readiness:executionModelReadiness});
  executionModelProof?.files.forEach(file => allowed.add(file));
  const slotReviewProof = validateFactionSlotReviewMigrationV1({ parentRunId, parent, next,
    readiness: capacityMigration?.slotReview?.readiness, environment: capacityMigration?.slotReview?.environment });
  slotReviewProof?.files.forEach(file => allowed.add(file));
  const structuralJsonProof = validateFactionStructuralJsonMigrationV1({ parent, next,
    readiness: capacityMigration?.structuralJson?.readiness, scope: capacityMigration?.structuralJson?.scope });
  structuralJsonProof?.files.forEach(file => allowed.add(file));
  const fieldRecoveryProof = validateFactionFieldRecoveryMigrationV1({ parent, next,
    readiness: capacityMigration?.fieldRecovery?.readiness, scope: capacityMigration?.fieldRecovery?.scope });
  fieldRecoveryProof?.files.forEach(file => allowed.add(file));
  const fieldValueProof = validateFactionFieldValueMigrationV1({ parent, next, readiness: capacityMigration?.fieldValues });
  fieldValueProof?.files.forEach(file => allowed.add(file));
  const fieldSourceProof = validateFactionFieldSourceMigrationV1({ parent, next, readiness: capacityMigration?.fieldSource });
  fieldSourceProof?.files.forEach(file => allowed.add(file));
  const mixedReviewProof = validateFactionMixedReviewMigrationV1({ parent, next, readiness: capacityMigration?.mixedReview });
  mixedReviewProof?.files.forEach(file => allowed.add(file));
  const resumeProof = validateFactionResumeReliabilityMigrationV1({ parent, next, readiness: capacityMigration?.resumeReliability });
  resumeProof?.files.forEach(file => allowed.add(file));
  const contractProjectionProof = validateFactionContractProjectionMigrationV1({ parent, next, readiness: capacityMigration?.contractProjection });
  contractProjectionProof?.files.forEach(file => allowed.add(file));
  const sourceExpansionProof = validateFactionReviewSourceExpansionMigrationV1({ parent, next,
    readiness: capacityMigration?.sourceExpansion });
  sourceExpansionProof?.files.forEach(file => allowed.add(file));
  const parsedWireProof = validateFactionParsedWireMigrationV2({ parent, next, readiness: capacityMigration?.parsedWire });
  parsedWireProof?.files.forEach(file => allowed.add(file));
  const planningRepairProof = validateFactionPlanningMigrationV1({ filename, parentRunId, parent, next,
    readiness: capacityMigration?.planningRepair });
  planningRepairProof?.files.forEach(file => allowed.add(file));
  const proposerAuxiliaryProof = validateFactionProposerAuxiliaryMigrationV1({ filename, parentRunId, parent, next,
    readiness: capacityMigration?.proposerAuxiliary });
  proposerAuxiliaryProof?.files.forEach(file => allowed.add(file));
  const draftPolicyProof = validateFactionDraftPolicyMigrationV2({ filename, parentRunId, parent, next,
    readiness: capacityMigration?.draftPolicy });
  draftPolicyProof?.files.forEach(file => allowed.add(file));
  const zergUnitTimingProof = validateFactionZergUnitTimingMigrationV1({ filename, parentRunId, parent, next,
    gate: capacityMigration?.zergUnitTiming, diagnosis: capacityMigration?.zergUnitTimingDiagnosis,
    inputs: capacityMigration?.inputs });
  zergUnitTimingProof?.files.forEach(file => allowed.add(file));
  const wireRuntimeProof = validateFactionWireRuntimeMigrationV2({ filename, parentRunId, parent, next,
    readiness: capacityMigration?.wireRuntime });
  wireRuntimeProof?.files.forEach(file => allowed.add(file));
  const wireAddressRecoveryProof = validateFactionWireAddressRecoveryMigrationV1({ filename, parentRunId, parent, next,
    gate: capacityMigration?.wireAddressRecovery?.gate, prepared: capacityMigration?.wireAddressRecovery?.prepared });
  wireAddressRecoveryProof?.files.forEach(file => allowed.add(file));
  const reviewDecomposition = validateFactionReviewDecompositionMigrationV1({ filename, parentRunId, parent, next,
    readiness: capacityMigration?.reviewDecomposition, diagnosis: capacityMigration?.reviewDecompositionDiagnosis,
    inputs: capacityMigration?.inputs,
    openingFenceRecovery: capacityMigration?.wireAddressRecovery?.prepared?.openingFenceRecovery });
  reviewDecomposition?.proof.files.forEach(file => allowed.add(file));
  if (!next.observedSourceRepairBinding && next.observedRosterFactsHashes) fail('FACTION_OBSERVED_SOURCE_REPAIR_UNBOUND');
  for (const [field, gateField, reference, gate] of [
    ['structuredTeachBinding', 'structuredTeachReadinessHash', FACTION_STRUCTURED_TEACH_BINDING_V1, capacityMigration?.structuredTeach],
    ['reviewRecoveryBudgetBinding', 'reviewRecoveryBudgetReadinessHash', FACTION_REVIEW_RECOVERY_BUDGET_BINDING_V2, capacityMigration?.recoveryBudget],
    ['teachOutputBudgetBinding', 'teachOutputBudgetReadinessHash', FACTION_TEACH_OUTPUT_BUDGET_BINDING_V1, capacityMigration?.outputBudget],
    ['nativeProductionBinding', 'nativeProductionReadinessHash', FACTION_NATIVE_PRODUCTION_BINDING_V1, capacityMigration?.nativeProduction],
    ['teachUncertaintyRecoveryBinding', 'teachUncertaintyReadinessHash', FACTION_TEACH_UNCERTAINTY_RECOVERY_BINDING_V1, capacityMigration?.teachUncertainty],
    ['reviewFocusCapacityRecoveryBinding', 'reviewFocusCapacityReadinessHash', FACTION_REVIEW_FOCUS_CAPACITY_RECOVERY_BINDING_V1, capacityMigration?.reviewFocusCapacity],
    ['metadataRecoveryBinding', 'metadataRecoveryReadinessHash', FACTION_METADATA_RECOVERY_BINDING_V1, capacityMigration?.metadataRecovery],
    ['targetCompletionBinding', 'targetCompletionReadinessHash', FACTION_TARGET_COMPLETION_BINDING_V1, capacityMigration?.targetCompletion],
    ['nativeOutputCapacityBinding', 'nativeOutputCapacityReadinessHash', FACTION_NATIVE_OUTPUT_CAPACITY_BINDING_V2, capacityMigration?.nativeOutputCapacity],
    ['targetIdReviewBinding', 'targetIdReviewReadinessHash', FACTION_TARGET_ID_REVIEW_BINDING_V1, capacityMigration?.targetIdReview],
    ['explicitSlotReviewBinding', 'explicitSlotReviewReadinessHash', FACTION_EXPLICIT_SLOT_REVIEW_BINDING_V1, capacityMigration?.explicitSlotReview],
    ['observedSourceRepairBinding', 'observedSourceRepairReadinessHash', FACTION_OBSERVED_SOURCE_REPAIR_BINDING_V1, capacityMigration?.observedSourceRepair],
  ]) {
    if (parent[field] && !next[field]) fail('FACTION_NATIVE_RECOVERY_BINDING_REMOVED');
    if (!next[field]) { if (gate || next[gateField]) fail('FACTION_NATIVE_RECOVERY_UNSCOPED'); continue; }
    [next[field], gate].forEach(verifySeal);
    if (next[field].hash !== reference.hash || gate.binding.hash !== reference.hash
      || !gate.passed || gate.providerCalls !== 0 || gate.hash !== next[gateField]) fail('FACTION_NATIVE_RECOVERY_MIGRATION_INVALID');
    for (const row of gate.codeHashes) {
      if (next.codeHashes.find(c => c.file === row.file)?.hash !== row.hash) fail('FACTION_NATIVE_RECOVERY_CODE_DRIFT');
      allowed.add(row.file);
    }
    if (field === 'nativeOutputCapacityBinding') {
      if (parent[field] && parent[field].hash !== next[field].hash
        || !gate.actualRequestRebuilt || !gate.consumerReplayPassed || !gate.fullSourcesPreserved
        || !gate.oldV1RolePreserved || !gate.automaticRetryForbidden || gate.actualDshSessions !== 1
        || !next.inputHashes.includes(gate.inputHash)
        || !parent[field] && parentRunId !== gate.originRunId)
        fail('FACTION_NATIVE_OUTPUT_CAPACITY_MIGRATION_INVALID');
      const evidenceDb = new DatabaseSync(filename, { readOnly: true });
      try {
        const attempt = evidenceDb.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(gate.originRunId, gate.originAttemptId);
        const issueRow = evidenceDb.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
          .get(gate.originRunId, gate.originAttemptId + '.issue');
        if (!attempt || attempt.state !== 'failed' || attempt.code !== 'STRUCTURED_PROVIDER_INCOMPLETE'
          || !attempt.settled || !issueRow) fail('FACTION_NATIVE_OUTPUT_CAPACITY_ORIGIN_INVALID');
        const receipt = verifySeal(JSON.parse(attempt.response)).value;
        const issue = verifySeal(verifySeal(JSON.parse(issueRow.artifact)).value);
        if (receipt.receiptHash !== gate.originalReceiptHash || receipt.status !== 200
          || receipt.incompleteReason !== 'max_output_tokens' || receipt.usage?.outputUnits !== 4096
          || issue.hash !== gate.originalIssueHash || issue.invocationHash !== gate.originalInvocationHash
          || receipt.outputTextHash !== null || issue.rejectedCandidateRef !== null)
          fail('FACTION_NATIVE_OUTPUT_CAPACITY_ORIGIN_INVALID');
      } finally { evidenceDb.close(); }
    }
    if (field === 'observedSourceRepairBinding') {
      if (parent[field] && (parent[field].hash !== next[field].hash
          || hash(parent.observedRosterFactsHashes) !== hash(next.observedRosterFactsHashes))
        || !parent[field] && parentRunId !== gate.originRunId
        || hash(gate.factsHashes) !== hash(next.observedRosterFactsHashes)
        || !gate.actualAnswerContextRebuilt || !gate.freshWholeAnswerJudgeRequired
        || !gate.negativeJudgmentPreserved || !gate.uniqueWholeSectionReviewVerified
        || gate.actualRulesCases !== 9 || !gate.oldRoleInputsUnchanged)
        fail('FACTION_OBSERVED_SOURCE_REPAIR_MIGRATION_INVALID');
      const evidenceDb = new DatabaseSync(filename, { readOnly: true });
      try {
        for (const [suffix, expected] of [['reasoner', reference.originalAnswersHash], ['judge', reference.originalJudgeHash]]) {
          const row = evidenceDb.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
            .get(gate.originRunId, 'faction.zerg_swarm.faction.zerg_swarm.army_resources.1.' + suffix);
          if (!row || hash(verifySeal(JSON.parse(row.artifact)).value.output) !== expected)
            fail('FACTION_OBSERVED_SOURCE_REPAIR_ORIGIN_INVALID');
        }
      } finally { evidenceDb.close(); }
    }
    if (field === 'explicitSlotReviewBinding') {
      validateFactionExplicitSlotReviewMigrationV1({ filename, parentRunId, parent, next, gate });
    }
    if (field === 'targetIdReviewBinding') {
      const evidence = readFactionStructuredSuccessEvidenceV1({ filename, runId: gate.originRunId, attemptId: gate.reviewOriginAttemptId });
      if (parent[field] && parent[field].hash !== next[field].hash
        || !gate.actualContextRebuilt || !gate.consumerReplayPassed || !gate.originalJudgmentsPreserved
        || !gate.exactHostTargetIdOnly || !gate.oldAddressReceiptsPreserved || gate.actualDshSessions !== 1
        || evidence.candidate.providerReceiptHash !== gate.originalReceiptHash
        || evidence.candidate.hash !== gate.originalCandidateHash
        || !next.inputHashes.includes(gate.reviewInputHash)
        || !parent[field] && parentRunId !== gate.originRunId) fail('FACTION_TARGET_ID_REVIEW_MIGRATION_INVALID');
    }
    if (field === 'metadataRecoveryBinding') {
      const native = readFactionTeachFailureEvidenceV1({ filename, runId: gate.originRunId, attemptId: gate.nativeOriginAttemptId });
      const reviewed = readFactionStructuredSuccessEvidenceV1({ filename, runId: gate.originRunId, attemptId: gate.reviewOriginAttemptId });
      if (parent[field] && parent[field].hash !== next[field].hash
        || !gate.completeContextRebuilt || !gate.nativeActualConsumerReplayPassed || !gate.reviewActualConsumerReplayPassed
        || !gate.sourceDuplicateRemovedOnly || !gate.exactTitleAddressResolutionOnly
        || native.attempt.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
        || verifySeal(JSON.parse(native.attempt.response)).value.receiptHash !== gate.nativeOriginalReceiptHash
        || verifySeal(JSON.parse(reviewed.attempt.response)).value.usageReceipt.receiptHash !== gate.reviewOriginalReceiptHash
        || !next.inputHashes.includes(gate.nativeInputHash) || !next.inputHashes.includes(gate.reviewInputHash)
        || gate.actualDshSessions !== 1 || !parent[field] && parentRunId !== gate.originRunId)
        fail('FACTION_METADATA_RECOVERY_MIGRATION_INVALID');
    }
    if (field === 'targetCompletionBinding') {
      const native = readFactionTeachFailureEvidenceV1({ filename, runId: gate.originRunId, attemptId: gate.nativeOriginAttemptId });
      const reviewed = readFactionStructuredSuccessEvidenceV1({ filename, runId: gate.originRunId, attemptId: gate.reviewOriginAttemptId });
      if (parent[field] && parent[field].hash !== next[field].hash
        || native.attempt.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
        || verifySeal(JSON.parse(native.attempt.response)).value.receiptHash !== gate.nativeOriginalReceiptHash
        || verifySeal(JSON.parse(reviewed.attempt.response)).value.usageReceipt.receiptHash !== gate.reviewOriginalReceiptHash
        || !next.inputHashes.includes(gate.nativeInputHash) || !next.inputHashes.includes(gate.reviewInputHash)
        || !gate.actualContextRebuilt || !gate.nativeActualConsumerReplayPassed || !gate.reviewActualConsumerReplayPassed
        || !gate.originalTwoAnswersPreserved || !gate.fullSourcesAndPriorContextPreserved || !gate.oldAddressV1Preserved
        || gate.actualDshSessions !== 3 || gate.injectedNativeCalls !== 2
        || !parent[field] && parentRunId !== gate.originRunId) fail('FACTION_TARGET_COMPLETION_MIGRATION_INVALID');
    }
    if (field === 'reviewFocusCapacityRecoveryBinding') {
      const evidence = readFactionTeachFailureEvidenceV1({ filename, runId: gate.originRunId, attemptId: gate.originAttemptId });
      const receipt = verifySeal(JSON.parse(evidence.attempt.response)).value;
      if (parent[field] && parent[field].hash !== next[field].hash
        || !gate.actualSourceContextRebuilt || !gate.actualStructuredConsumerReplayPassed || !gate.productionImportTested
        || !gate.allEvidencePreserved || gate.judgmentsChanged !== false
        || gate.originalFailureReceiptHash !== receipt.receiptHash || gate.originalRejectedCandidateHash !== evidence.rejected.hash
        || evidence.attempt.state !== 'failed' || evidence.attempt.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
        || !next.inputHashes.includes(gate.inputHash) || gate.actualDshSessions !== 1
        || !parent[field] && parentRunId !== gate.originRunId) fail('FACTION_REVIEW_FOCUS_CAPACITY_MIGRATION_INVALID');
    }
    if (field === 'teachUncertaintyRecoveryBinding') {
      const evidence = readFactionTeachFailureEvidenceV1({ filename, runId: gate.originRunId, attemptId: gate.originAttemptId });
      const receipt = verifySeal(JSON.parse(evidence.attempt.response)).value;
      if (parent[field] && parent[field].hash !== next[field].hash
        || !gate.actualRequestContextRebuilt || !gate.actualStructuredConsumerReplayPassed || !gate.productionWrapperTested
        || gate.materialization.originalFailureReceiptHash !== receipt.receiptHash
        || gate.materialization.rejectedCandidateHash !== evidence.rejected.hash
        || gate.materialization.originalIssueHash !== evidence.issue.hash
        || evidence.attempt.state !== 'failed' || evidence.attempt.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
        || !next.inputHashes.includes(gate.inputHash) || gate.actualDshSessions !== 1
        || !parent[field] && parentRunId !== gate.originRunId) fail('FACTION_TEACH_UNCERTAINTY_MIGRATION_INVALID');
    }
    if (field === 'structuredTeachBinding') {
      const evidenceDb = new DatabaseSync(filename, { readOnly: true });
      try {
        const raw = evidenceDb.prepare('SELECT state,code,response FROM attempts WHERE run=? AND id=?').get(gate.originRunId, gate.originAttemptId);
        const receipt = raw?.response && verifySeal(JSON.parse(raw.response)).value;
        if (raw?.state !== 'failed' || raw.code !== 'PROVIDER_RESPONSE_JSON_INVALID'
          || receipt.receiptHash !== gate.actualFailureReceiptHash || receipt.responseOutcome?.finishReason !== 'stop'
          || !next.inputHashes.includes(gate.inputHash) || gate.actualDshSessions !== 1 || !gate.fullSourceAndPriorPartsPreserved)
          fail('FACTION_NATIVE_TEACH_FAILURE_PROOF_INVALID');
      } finally { evidenceDb.close(); }
    }
    if (field === 'teachOutputBudgetBinding') {
      if (parent[field] && parent[field].hash !== next[field].hash
        || !next.structuredTeachBinding || gate.actualDshSessions !== 1
        || !gate.actualStructuredConsumerReplayPassed || !gate.fullSourceAndPriorPartsPreserved
        || !next.inputHashes.includes(gate.failure.inputHash)) fail('FACTION_NATIVE_TEACH_BUDGET_PROOF_INVALID');
      const evidenceDb = new DatabaseSync(filename, { readOnly: true });
      try {
        const attempt = evidenceDb.prepare('SELECT * FROM attempts WHERE run=? AND id=?')
          .get(gate.failure.originRunId, gate.failure.originAttemptId);
        const row = evidenceDb.prepare('SELECT artifact FROM steps WHERE run=? AND id=? AND state=?')
          .get(gate.failure.originRunId, gate.failure.originAttemptId + '.issue', 'complete');
        const issue = row && verifySeal(JSON.parse(row.artifact)).value;
        const proof = verifyFactionNativeTeachCapacityFailureV1({ attempt, issue, inputHash: gate.failure.inputHash });
        if (proof.hash !== gate.failure.hash) fail('FACTION_NATIVE_TEACH_BUDGET_PROOF_DRIFT');
      } finally { evidenceDb.close(); }
    }
    if (field === 'nativeProductionBinding') {
      if (parent[field] && parent[field].hash !== next[field].hash
        || gate.actualDshSessions !== 1 || !gate.actualStructuredConsumerReplayPassed
        || !gate.completeSourcesAndPriorWorkspacePreserved || !gate.historicalCompletedRolesDelegatedUnchanged
        || hash(gate.kindsTested) !== hash(Object.keys(FACTION_NATIVE_PRODUCTION_BINDING_V1.contracts))
        || !next.inputHashes.includes(gate.inputHash)) fail('FACTION_NATIVE_PRODUCTION_PROOF_INVALID');
      const evidenceDb = new DatabaseSync(filename, { readOnly: true });
      try {
        const row = evidenceDb.prepare('SELECT state,code,response FROM attempts WHERE run=? AND id=?')
          .get(gate.originRunId, gate.originAttemptId);
        const receipt = row?.response && verifySeal(JSON.parse(row.response)).value;
        if (row?.state !== 'failed' || row.code !== 'PROVIDER_RESPONSE_JSON_INVALID'
          || receipt.receiptHash !== gate.actualFailureReceiptHash || receipt.responseOutcome?.finishReason !== 'stop'
          || receipt.responseOutcome?.syntaxIssue !== 'separator') fail('FACTION_NATIVE_PRODUCTION_FAILURE_PROOF_INVALID');
      } finally { evidenceDb.close(); }
    }
  }
  if (parent.catalogueReviewBinding && !next.catalogueReviewBinding) fail('FACTION_CATALOGUE_REVIEW_BINDING_REMOVED');
  if (next.catalogueReviewBinding) {
    const { teach, catalogue, fairness } = capacityMigration || {};
    [teach, catalogue, next.catalogueReviewBinding].forEach(verifySeal);
    if (next.catalogueReviewBinding.hash !== STARCRAFT_TMG_FACTION_REVIEW_CATALOGUE_BINDING_V1.hash
      || catalogue.binding.hash !== next.catalogueReviewBinding.hash
      || !catalogue.passed || !teach.passed || catalogue.providerCalls !== 0 || teach.providerCalls !== 0
      || catalogue.hash !== next.catalogueReviewReadinessHash || teach.hash !== next.teachRecoveryReadinessHash
      || !catalogue.oldContractStillRejects || !catalogue.exactSchemaChangeTested
      || !catalogue.unknownSourcesRejected || !catalogue.negativeJudgmentsPreserved
      || !teach.sixDisjointOutputAxes || !teach.losslessAssembly || !teach.furtherTruncationStops
      || !Array.isArray(next.teachRecoveryBindings)
      || (parent.teachRecoveryBindings || []).some(p => !next.teachRecoveryBindings.some(n => n.hash === p.hash))) {
      fail('FACTION_CAPACITY_MIGRATION_INVALID');
    }
    for (const gate of [teach, catalogue]) for (const row of gate.codeHashes) {
      if (next.codeHashes.find(c => c.file === row.file)?.hash !== row.hash) fail('FACTION_CAPACITY_MIGRATION_CODE_DRIFT');
      allowed.add(row.file);
    }
    if (parent.sharedScenarioReviewContext && !next.sharedScenarioReviewContext) fail('FACTION_SHARED_SCENARIO_CONTEXT_REMOVED');
    if (next.sharedScenarioReviewContext) {
      verifySeal(fairness);
      if (!catalogue.sharedScenarioSourceFailureReproduced || !catalogue.sharedScenarioContextRepairPassed
        || !fairness.passed || fairness.hash !== next.eventLoopFairnessReadinessHash
        || fairness.providerCalls !== 0 || fairness.fair.state !== 'ready' || fairness.starved.state !== 'timeout') fail('FACTION_PARALLEL_CONTEXT_MIGRATION_INVALID');
      for (const row of fairness.codeHashes) {
        if (next.codeHashes.find(c => c.file === row.file)?.hash !== row.hash) fail('FACTION_FAIRNESS_CODE_DRIFT');
        allowed.add(row.file);
      }
    } else if (fairness || next.eventLoopFairnessReadinessHash) fail('FACTION_FAIRNESS_UNSCOPED');
    const evidenceDb = new DatabaseSync(filename, { readOnly: true });
    try {
      for (const recovery of next.teachRecoveryBindings) {
        verifySeal(recovery);
        if (!next.inputHashes.includes(recovery.inputHash) || recovery.profileHash !== next.modelHash
          || hash(recovery.sourceBinding) !== hash(next.sourceBinding)) fail('FACTION_TEACH_RECOVERY_BINDING_DRIFT');
        const attempt = evidenceDb.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(recovery.originRunId, recovery.originAttemptId);
        const suppliedInput = capacityMigration.inputs?.find(input => input.hash === recovery.inputHash);
        if (!suppliedInput || createFactionTeachRecoveryV1({ input: suppliedInput,
          runId: recovery.originRunId, attempt }).hash !== recovery.hash) fail('FACTION_TEACH_RECOVERY_BINDING_DRIFT');
      }
    } finally { evidenceDb.close(); }
  } else if (capacityMigration || next.teachRecoveryBindings || next.teachRecoveryReadinessHash
    || next.catalogueReviewReadinessHash) fail('FACTION_CAPACITY_MIGRATION_UNSCOPED');
  const repairConflictHistoryProof =
    validateFactionRepairConflictHistoryMigrationV1({ parentRunId, parent,
      parentReport, next, readiness: repairConflictHistoryMigration });
  repairConflictHistoryProof?.files.forEach(file => allowed.add(file));
  let structuredGenerationProof = null;
  if (parent.structuredGenerationBinding
    && hash(parent.structuredGenerationBinding)
      !== hash(next.structuredGenerationBinding || null)) {
    fail('FACTION_STRUCTURED_GENERATION_BINDING_DRIFT');
  }
  if (next.structuredGenerationBinding) {
    const { readiness, imported } = structuredGenerationMigration || {};
    [next.structuredGenerationBinding, readiness, imported].forEach(verifySeal);
    const binding = next.structuredGenerationBinding;
    if (!readiness.passed
      || readiness.hash !== next.structuredGenerationReadinessHash
      || readiness.actualImportHash !== imported.hash
      || readiness.actualCanaryRunId !== binding.canaryRunId
      || readiness.actualCanaryReportHash !== binding.canaryReportHash
      || readiness.actualCapabilityReceiptHash !== binding.capabilityReceiptHash
      || readiness.outputContractRef.hash !== binding.outputContractRef.hash
      || imported.hash !== binding.importHash
      || imported.contextCapsuleHash !== binding.contextCapsuleHash
      || imported.outputContractRef.hash !== binding.outputContractRef.hash
      || imported.semanticAcceptanceInherited !== false
      || imported.freshWholeSectionReviewRequired !== true
      || readiness.providerCalls !== 0) {
      fail('FACTION_STRUCTURED_GENERATION_MIGRATION_INVALID');
    }
    for (const row of readiness.codeHashes) {
      if (next.codeHashes.find((entry) => entry.file === row.file)?.hash
        !== row.hash) fail('FACTION_STRUCTURED_GENERATION_CODE_DRIFT');
      allowed.add(row.file);
    }
    structuredGenerationProof = {
      readinessHash: readiness.hash,
      importHash: imported.hash,
      canaryRunId: binding.canaryRunId,
      outputContractHash: binding.outputContractRef.hash,
      policy: 'exact_r5_canary_import_then_all_new_local_editors_cross_structured_runtime_and_fresh_review',
    };
  } else if (structuredGenerationMigration
    || next.structuredGenerationReadinessHash) {
    fail('FACTION_STRUCTURED_GENERATION_MIGRATION_UNSCOPED');
  }
  const reviewFocusNormalizationProof =
    validateFactionReviewFocusNormalizationMigrationV1({ parentRunId,
      parent, parentReport, next,
      readiness: reviewFocusNormalizationMigration });
  reviewFocusNormalizationProof?.files.forEach(file => allowed.add(file));
  const structuredReviewProof = validateFactionStructuredReviewMigrationV1({
    parentRunId, parent, parentReport, next,
    migration: structuredReviewMigration,
  });
  structuredReviewProof?.files.forEach(file => allowed.add(file));
  if (budgetProof) allowed.add(budgetFile);
  const reviewTransactionProof = validateFactionReviewTransactionMigrationV1({ parent, next, ...reviewTransactionMigration });
  reviewTransactionProof?.files.forEach(file => allowed.add(file));
  const phaseSeedProof = validateFactionPhaseSeedMigrationV1({ parent, next, migration: phaseSeedMigration });
  phaseSeedProof?.files.forEach(file => allowed.add(file));
  const sourceCorrectionProof = validateFactionSourceCorrectionMigrationV1({ parent, next, sourceCorrectionMigration });
  sourceCorrectionProof?.files.forEach(file => allowed.add(file));
  let unitRoleRepairProof = null;
  if (parent.unitRoleRepairReadinessHashes && !next.unitRoleRepairReadinessHashes) fail('FACTION_CONTINUATION_UNIT_REPAIR_REMOVED');
  if (next.unitRoleRepairReadinessHashes) {
    const gates = unitRoleRepairMigration;
    if (!Array.isArray(gates) || gates.length !== 3) fail('FACTION_UNIT_REPAIR_MIGRATION_PROOF_MISSING');
    gates.forEach(verifySeal);
    const [unit, workflow, dsh] = gates;
    const files = ['packages/skill-production-v3/faction-unit-role-field-repair-v1.mjs', 'packages/skill-evaluation/faction-unit-role-debt-v1.mjs'];
    if (hash(gates.map(g => g.hash)) !== hash(next.unitRoleRepairReadinessHashes)
      || gates.some(g => !g.passed || g.inputHash !== next.inputHashes[0])
      || unit.actualKnownCounterexamples !== 3 || !unit.unaffectedFieldsPreserved || !unit.freshReviewRequired
      || !workflow.repairsIntegrated || !workflow.freshNegativeRetained || workflow.freshWholeSectionReviews !== 16
      || !dsh.fullSourceDeliveryVerified || dsh.actualDshSessions !== 1 || dsh.providerCalls !== 0
      || dsh.dshBinding.hash !== next.dshBindingHash
      || [...files, 'packages/skill-production-v3/faction-strategy-workflow-v1.mjs'].some(file =>
        !next.codeHashes.find(r => r.file === file) || [unit, workflow].some(g =>
          g.codeHashes.find(r => r.file === file)?.hash !== next.codeHashes.find(r => r.file === file)?.hash)))
      fail('FACTION_UNIT_REPAIR_MIGRATION_PROOF_INVALID');
    files.forEach(file => allowed.add(file));
    unitRoleRepairProof = { readinessHashes: next.unitRoleRepairReadinessHashes,
      policy: 'independent_known_source_fields_repair_then_fresh_whole_section_review_no_source_model_budget_reset' };
  }
  let fieldRepairProof = null;
  if (parent.fieldRepairBinding && hash(parent.fieldRepairBinding) !== hash(next.fieldRepairBinding || null))
    fail('FACTION_CONTINUATION_FIELD_REPAIR_DRIFT');
  if (next.fieldRepairBinding) {
    const { binding, readiness } = fieldRepairMigration || {};
    if (!binding || !readiness) fail('FACTION_FIELD_REPAIR_MIGRATION_PROOF_MISSING');
    [binding, readiness, next.fieldRepairBinding].forEach(verifySeal);
    const files = ['packages/skill-production-v3/faction-field-repair-seed-v1.mjs',
      'packages/skill-production-v3/faction-field-repair-v1.mjs', 'packages/skill-evaluation/faction-field-repair-evidence-v1.mjs',
      'packages/skill-evaluation/faction-semantic-debt-v1.mjs', 'packages/skill-evaluation/read-only-production-replay-v1.mjs'];
    if (binding.hash !== next.fieldRepairBinding.hash || !next.inputHashes.includes(binding.inputHash)
      || !readiness.passed || readiness.bindingHash !== binding.hash || readiness.evidenceHash !== binding.evidenceHash
      || !readiness.actualRepairReapplied || !readiness.freshReviewRequired || !readiness.freshNegativeRetained
      || binding.semanticAcceptanceInherited !== false
      || [...files, 'packages/skill-production-v3/faction-strategy-workflow-v1.mjs'].some(file =>
        !next.codeHashes.find(r => r.file === file) || next.codeHashes.find(r => r.file === file)?.hash !== readiness.codeHashes.find(r => r.file === file)?.hash))
      fail('FACTION_FIELD_REPAIR_MIGRATION_PROOF_INVALID');
    files.forEach(file => allowed.add(file));
    fieldRepairProof = { bindingHash: binding.hash, readinessHash: readiness.hash,
      evidenceHash: binding.evidenceHash, policy: 'exact_actual_patch_after_reproduced_parent_draft_then_fresh_whole_section_review' };
  }
  const correctionFiles = ['packages/skill-production-v3/faction-review-targets-v1.mjs',
    'packages/skill-production-v3/faction-known-rule-findings-v1.mjs', 'packages/skill-production-v3/faction-source-scope-adjudication-v1.mjs',
    'packages/skill-evaluation/faction-roster-choice-drills-v1.mjs'];
  let correctionProof = null;
  if (parent.knownRulePolicyHashes && hash(parent.knownRulePolicyHashes) !== hash(next.knownRulePolicyHashes || null)) fail('FACTION_CONTINUATION_KNOWN_RULE_POLICY_DRIFT');
  if (next.knownRulePolicyHashes || parent.targetedCorrectionsReadinessHash || next.targetedCorrectionsReadinessHash) {
    if (!correctionMigration) fail('FACTION_CORRECTION_MIGRATION_PROOF_MISSING');
    verifySeal(correctionMigration);
    if (!correctionMigration.passed || correctionMigration.hash !== next.targetedCorrectionsReadinessHash
      || !correctionMigration.actualShiftedQuotesRejected || !correctionMigration.rawHistoricalFailurePreserved
      || hash(correctionMigration.inputHashes) !== hash(next.inputHashes)
      || hash(correctionMigration.policyHashes) !== hash(next.knownRulePolicyHashes || null)
      || [...correctionFiles, 'packages/skill-production-v3/faction-strategy-workflow-v1.mjs'].some(file =>
        !next.codeHashes.find(r => r.file === file) || next.codeHashes.find(r => r.file === file)?.hash !== correctionMigration.codeHashes.find(r => r.file === file)?.hash)) fail('FACTION_CORRECTION_MIGRATION_PROOF_INVALID');
    correctionFiles.forEach(file => allowed.add(file));
    correctionProof = { readinessHash: correctionMigration.hash, policyHashes: next.knownRulePolicyHashes,
      priorPolicyHashes: parent.knownRulePolicyHashes || null, policy: 'known_kernel_fact_and_explicit_review_target_binding_no_source_or_budget_change' };
  }
  let migrationProof = null;
  if (parent.mainReadinessHash !== next.mainReadinessHash || parent.jsonRecoveryReadinessHash !== next.jsonRecoveryReadinessHash) {
    const { before, after, recovery } = normalizationMigration || {};
    if (!before || !after || !recovery) fail('FACTION_NORMALIZATION_MIGRATION_PROOF_MISSING');
    [before, after, recovery].forEach(verifySeal);
    if (before.hash !== parent.mainReadinessHash || after.hash !== next.mainReadinessHash || recovery.hash !== next.jsonRecoveryReadinessHash
      || !before.passed || !after.passed || !recovery.passed
      || !['redundant_array_object_closers_v1', 'bounded_grammar_recovery_v2'].includes(recovery.policy)
      || before.catalogueHash !== after.catalogueHash || hash(before.dshBinding) !== hash(after.dshBinding)) fail('FACTION_NORMALIZATION_MIGRATION_PROOF_INVALID');
    const providerFiles = ['packages/secure-provider-runtime/provider-response-outcome-v1.mjs',
      'packages/secure-provider-runtime/provider-egress-transport-v1.mjs', 'packages/secure-provider-runtime/provider-worker-success-classifier-v1.mjs'];
    const migrationAllowed = new Set([...providerFiles, 'scripts/verify-ticket-17-production-redesign-v1.mjs']);
    executionPolicyProof?.files.forEach(file => migrationAllowed.add(file));
    executionModelProof?.files.forEach(file => migrationAllowed.add(file));
    if (structuredGenerationProof) migrationAllowed.add('packages/skill-production/model.mjs');
    const mainChanges = [...new Set([...before.codeHashes, ...after.codeHashes].map(r => r.file))].filter(file =>
      before.codeHashes.find(r => r.file === file)?.hash !== after.codeHashes.find(r => r.file === file)?.hash);
    if (mainChanges.some(file => !migrationAllowed.has(file)) || providerFiles.some(file =>
      after.codeHashes.find(r => r.file === file)?.hash !== recovery.codeHashes.find(r => r.file === file)?.hash)) fail('FACTION_NORMALIZATION_DEPENDENCY_DRIFT');
    providerFiles.forEach(file => allowed.add(file));
    migrationProof = { policy: recovery.policy, beforeHash: before.hash, afterHash: after.hash, recoveryHash: recovery.hash, changes: mainChanges };
  }
  const changes = [...new Set([...parent.codeHashes, ...next.codeHashes].map(r => r.file))].filter(file =>
    parent.codeHashes.find(r => r.file === file)?.hash !== next.codeHashes.find(r => r.file === file)?.hash);
  if (changes.some(f => !allowed.has(f))) fail('FACTION_CONTINUATION_DEPENDENCY_DRIFT');
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare('SELECT recipe FROM runs WHERE id=?').get(parentRunId)?.recipe !== parent.hash) fail('FACTION_CONTINUATION_JOURNAL_DRIFT');
    if (db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'").get(parentRunId).n) fail('FACTION_CONTINUATION_PARENT_RUNNING');
    if (db.prepare("SELECT count(*) n FROM attempts WHERE state='intent'").get().n) fail('AMBIGUOUS_EGRESS_NO_RETRY');
    if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    const attempts = db.prepare('SELECT id,request_hash,usage,response,code,settled,reserve,state,token_reserve FROM attempts WHERE run=?').all(parentRunId);
    const rows = db.prepare("SELECT id,input_hash,artifact FROM steps WHERE run=? AND state='complete'").all(parentRunId)
      .map(r => ({ id: r.id, inputHash: r.input_hash, artifact: verifySeal(JSON.parse(r.artifact)).value }));
    const began = rows.find(r => r.id === 'production-start')?.artifact.began;
    if (!Number.isSafeInteger(began)) fail('FACTION_CONTINUATION_START_MISSING');
    const ancestor = parent.continuation; if (ancestor) verifySeal(ancestor);
    const accounting = { calls: (ancestor?.accounting.calls || 0) + attempts.length,
      costMicros: (ancestor?.accounting.costMicros || 0) + attempts.reduce((n, r) => n + (r.settled ?? r.reserve), 0),
      tokens: (ancestor?.accounting.tokens || 0) + attempts.reduce((n, r) => n + (r.usage ? verifySeal(JSON.parse(r.usage)).value.totalUnits : r.state === 'not_sent' ? 0 : r.token_reserve), 0) };
    if (isFactionBudgetEpochV1(next.budgetExtension) && !isFactionBudgetEpochV1(parent.budgetExtension)
      && hash(next.budgetExtension.chainBaseline) !== hash(accounting)) fail('FACTION_BUDGET_EPOCH_BASELINE_DRIFT');
    if (isFactionBudgetEpochV1(next.budgetExtension) && !isFactionBudgetEpochV1(parent.budgetExtension)
      && hash(db.prepare('SELECT * FROM attempts ORDER BY run,id').all()) !== next.budgetExtension.historicalAttemptRowsHash)
      fail('FACTION_BUDGET_EPOCH_GLOBAL_BASELINE_DRIFT');
    if (accounting.calls >= next.limits.maxCalls || accounting.costMicros >= next.limits.maxCostMicros
      || accounting.tokens >= next.limits.maxTokens) fail('FACTION_CONTINUATION_BUDGET_EXHAUSTED');
    // Reuse paid raw role outputs only. Candidate/review decisions and typed
    // issue journals are reconstructed under the current validators. A
    // parseable rejected structured-review candidate is not a role result: it
    // may be carried only as an explicitly hashed repair input and must be
    // revalidated against the unchanged output contract before use.
    const inventory = next.checkpointInventoryBinding ? readFactionCheckpointInventoryV1({ filename, parentRunId,
      parentRecipe: parent, lanePrefixes: ['faction.terran_armed_forces.', 'faction.zerg_swarm.'],
      restorationWindows: next.checkpointRestorationWindows }) : null;
    const steps = inventory?.steps || rows.filter(r => r.artifact?.roleId === r.id && r.artifact?.loop?.transcript);
    for (const row of reviewDecomposition?.steps || []) if (!steps.some(s => s.id === row.id)) steps.push(row);
    if (next.nativeOutputCapacityBinding) {
      const expectedFrozenRoles = parent.nativeOutputCapacityBinding ? parent.nativeOutputCapacityFrozenRoleIds
        : frozenFactionNativeOutputRolesV2(steps);
      if (!expectedFrozenRoles || hash(expectedFrozenRoles) !== hash(next.nativeOutputCapacityFrozenRoleIds || null))
        fail('FACTION_NATIVE_OUTPUT_CAPACITY_FROZEN_ROLES_DRIFT');
    } else if (next.nativeOutputCapacityFrozenRoleIds || parent.nativeOutputCapacityBinding)
      fail('FACTION_NATIVE_OUTPUT_CAPACITY_FREEZE_UNSCOPED');
    const schemaRepairCandidates = rows.filter((row) =>
      String(row.artifact?.version || "").endsWith(".rejected-candidate")
      && row.artifact?.outputContractRef?.id
        === "starcraft-tmg.faction-target-review"
      && /\.review-target-batch-v1\./u.test(row.artifact?.roleRef?.id || "")
      && !/\.schema-repair\./u.test(row.artifact?.roleRef?.id || ""));
    const schemaRepairImports = schemaRepairCandidates
      .map((row) => ({ id: row.id, artifactHash: hash(row.artifact),
        roleRefHash: row.artifact.roleRef.hash,
        contextManifestHash: row.artifact.contextManifestRef.hash,
        outputContractHash: row.artifact.outputContractRef.hash }));
    let outputCapRecoveryFailureImports = [];
    if (parentReport.failure.code === 'STRUCTURED_DSH_MODEL_OUTCOME_NOT_ACCEPTED'
      && attempts.some(row => row.code === 'STRUCTURED_PROVIDER_INCOMPLETE')) {
      const failed = attempts.filter((row) =>
        row.code === 'STRUCTURED_PROVIDER_INCOMPLETE');
      const pending = db.prepare("SELECT id FROM steps WHERE run=? AND state='pending' AND id LIKE '%review-target-batch-v1.%'").all(parentRunId);
      if (failed.length !== 1 || pending.length !== 1
        || !failed[0].usage || !failed[0].response) {
        fail('FACTION_STRUCTURED_REVIEW_OUTPUT_CAP_IMPORT_AMBIGUOUS');
      }
      const issueRow = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
        .get(parentRunId, `${failed[0].id}.issue`);
      if (!issueRow?.artifact) {
        fail('FACTION_STRUCTURED_REVIEW_OUTPUT_CAP_IMPORT_MISSING');
      }
      const usageEnvelope = JSON.parse(failed[0].usage);
      const responseEnvelope = JSON.parse(failed[0].response);
      const issueEnvelope = JSON.parse(issueRow.artifact);
      [usageEnvelope, responseEnvelope, issueEnvelope].forEach(verifySeal);
      outputCapRecoveryFailureImports = [
        createFactionStructuredReviewOutputCapFailureImportV1({
          parentRunId,
          fullRoleId: pending[0].id,
          originAttemptId: failed[0].id,
          originRequestHash: failed[0].request_hash,
          originIssue: issueEnvelope.value,
          failureReceipt: responseEnvelope.value,
          usage: usageEnvelope.value,
          usageHash: usageEnvelope.hash,
        }),
      ];
    }
    let outputCapRecoverySuccessImports = [];
    if (parentReport.failure.code
        === 'FACTION_STRUCTURED_REVIEW_OUTPUT_CAP_RECOVERY_NOT_COMPACT') {
      const pending = db.prepare("SELECT id FROM steps WHERE run=? AND state='pending' AND id LIKE '%review-target-batch-v1.%'").all(parentRunId);
      let received = attempts.filter((row) => row.state === 'received'
        && !row.code && row.usage && row.response
        && /^structured-[a-f0-9]{48}$/u.test(row.id));
      let originPermits = parent.continuation?.outputCapRecoveryImports || [];
      if (next.reviewRecoveryBudgetBinding && pending.length === 1) {
        const recoveryId = pending[0].id.replace(/^faction\.[a-z0-9_]+\./u, '')
          .replace(/\.source-evidence-v1\.[a-f0-9]{20}$/u, '') + '.output-cap-recovery.1';
        received = received.filter(row => {
          const candidate = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
            .get(parentRunId, row.id + '.candidate');
          return candidate && verifySeal(JSON.parse(candidate.artifact)).value.roleRef?.id === recoveryId;
        });
        if (!originPermits.length) {
          const incomplete = attempts.filter(row => row.state === 'failed' && row.code === 'STRUCTURED_PROVIDER_INCOMPLETE');
          if (incomplete.length !== 1) fail('FACTION_STRUCTURED_REVIEW_OUTPUT_CAP_SUCCESS_IMPORT_AMBIGUOUS');
          const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(parentRunId, incomplete[0].id + '.issue');
          const issue = row && verifySeal(JSON.parse(row.artifact)).value;
          if (!issue || issue.safeReceiptHash !== verifySeal(JSON.parse(incomplete[0].response)).value.receiptHash)
            fail('FACTION_STRUCTURED_REVIEW_OUTPUT_CAP_SUCCESS_IMPORT_MISSING');
          originPermits = [{ fullRoleId: pending[0].id, originIssueHash: issue.hash }];
        }
      }
      if (pending.length !== 1 || received.length !== 1
        || originPermits.length !== 1
        || originPermits[0].fullRoleId !== pending[0].id) {
        fail('FACTION_STRUCTURED_REVIEW_OUTPUT_CAP_SUCCESS_IMPORT_AMBIGUOUS');
      }
      const attempt = received[0];
      const candidateRow = db.prepare(
        "SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'",
      ).get(parentRunId, `${attempt.id}.candidate`);
      const receiptRow = db.prepare(
        "SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'",
      ).get(parentRunId, `${attempt.id}.runtime-receipt`);
      if (!candidateRow?.artifact || !receiptRow?.artifact) {
        fail('FACTION_STRUCTURED_REVIEW_OUTPUT_CAP_SUCCESS_IMPORT_MISSING');
      }
      const candidateEnvelope = JSON.parse(candidateRow.artifact);
      const receiptEnvelope = JSON.parse(receiptRow.artifact);
      const responseEnvelope = JSON.parse(attempt.response);
      const usageEnvelope = JSON.parse(attempt.usage);
      [candidateEnvelope, receiptEnvelope, responseEnvelope,
        usageEnvelope].forEach(verifySeal);
      outputCapRecoverySuccessImports = [
        createFactionStructuredReviewOutputCapSuccessImportV1({
          parentRunId,
          fullRoleId: pending[0].id,
          originIssueHash: originPermits[0].originIssueHash,
          originAttemptId: attempt.id,
          originRequestHash: attempt.request_hash,
          candidate: candidateEnvelope.value,
          runtimeReceipt: receiptEnvelope.value,
          providerResponse: responseEnvelope.value,
          usage: usageEnvelope.value,
          usageHash: usageEnvelope.hash,
        }),
      ];
    }
    const outputCapRecoveryImports = outputCapRecoveryFailureImports.map(
      (row) => ({ hash: row.hash, fullRoleId: row.fullRoleId,
        originAttemptId: row.originAttemptId,
        originInvocationHash: row.originInvocationHash,
        originIssueHash: row.originIssue.hash,
        failureReceiptHash: row.failureReceipt.receiptHash }));
    const outputCapRecoverySuccessPermits =
      outputCapRecoverySuccessImports.map((row) => ({
        hash: row.hash,
        fullRoleId: row.fullRoleId,
        originIssueHash: row.originIssueHash,
        originAttemptId: row.originAttemptId,
        originInvocationHash: row.originInvocationHash,
        candidateHash: row.candidate.hash,
        runtimeReceiptHash: row.runtimeReceipt.hash,
        originalUsageHash: hash(row.originalUsage),
      }));
    const editorFailures = next.editorEnvelopeBinding
      ? collectFactionEditorEnvelopeFailureImportsV2({ filename, parentRunId, parent }) : { evidence: [], permits: [] };
    const manifest = seal({ parentRunId, parentRecipeHash: parent.hash, nextBaseRecipeHash: next.hash,
      parentStart: began, accounting, changes, ...(migrationProof ? { normalizationMigration: migrationProof } : {}),
      ...(executionPolicyProof ? { executionPolicyMigration: executionPolicyProof } : {}),
      ...(executionModelProof ? { executionModelMigration: executionModelProof } : {}),
      ...(slotReviewProof ? { slotReviewMigration: slotReviewProof } : {}),
      ...(structuralJsonProof ? { structuralJsonMigration: structuralJsonProof } : {}),
      ...(fieldRecoveryProof ? { fieldRecoveryMigration: fieldRecoveryProof } : {}),
      ...(fieldSourceProof ? { fieldSourceMigration: fieldSourceProof } : {}),
      ...(mixedReviewProof ? { mixedReviewMigration: mixedReviewProof } : {}),
      ...(resumeProof ? { resumeReliabilityMigration: resumeProof, checkpointInventory: inventory.proof } : {}),
      ...(contractProjectionProof ? { contractProjectionMigration: contractProjectionProof } : {}),
      ...(fieldValueProof ? { fieldValueMigration: fieldValueProof } : {}),
      ...(sourceExpansionProof ? { sourceExpansionMigration: sourceExpansionProof } : {}),
      ...(parsedWireProof ? { parsedWireSchemaMigration: parsedWireProof } : {}),
      ...(planningRepairProof ? { planningRepairMigration: planningRepairProof } : {}),
      ...(proposerAuxiliaryProof ? { proposerAuxiliaryMigration: proposerAuxiliaryProof } : {}),
      ...(draftPolicyProof ? { draftPolicyMigration: draftPolicyProof } : {}),
      ...(zergUnitTimingProof ? { zergUnitTimingMigration: zergUnitTimingProof } : {}),
      ...(wireRuntimeProof ? { wireRuntimeMigration: wireRuntimeProof } : {}),
      ...(reviewDecomposition ? { reviewDecompositionMigration: reviewDecomposition.proof } : {}),
      ...(wireAddressRecoveryProof ? { wireAddressRecoveryMigration: wireAddressRecoveryProof } : {}),
      ...(correctionProof ? { correctionMigration: correctionProof } : {}),
      ...(fieldRepairProof ? { fieldRepairMigration: fieldRepairProof } : {}),
      ...(unitRoleRepairProof ? { unitRoleRepairMigration: unitRoleRepairProof } : {}),
      ...(sourceCorrectionProof ? { sourceCorrectionMigration: sourceCorrectionProof } : {}),
      ...(additionalRecoveryProof ? { additionalCommandRecoveryMigration: additionalRecoveryProof } : {}),
      ...(phaseSeedProof ? { phaseSeedMigration: phaseSeedProof } : {}),
      ...(budgetProof ? { budgetExtensionProof: budgetProof } : {}),
      ...(reviewTransactionProof ? { reviewTransactionMigration: reviewTransactionProof } : {}),
      ...(structuredGenerationProof
        ? { structuredGenerationMigration: structuredGenerationProof } : {}),
      ...(reviewFocusNormalizationProof
        ? { reviewFocusNormalizationMigration: reviewFocusNormalizationProof }
        : {}),
      ...(structuredReviewProof
        ? { structuredReviewMigration: structuredReviewProof } : {}),
      ...(repairConflictHistoryProof
        ? { repairConflictHistoryMigration: repairConflictHistoryProof }
        : {}),
      reusable: steps.map(r => ({ id: r.id, inputHash: r.inputHash, artifactHash: hash(r.artifact) })),
      ...(schemaRepairImports.length ? { schemaRepairImports } : {}),
      ...(editorFailures.permits.length ? { editorEnvelopeFailureImports: editorFailures.permits } : {}),
      ...(outputCapRecoveryImports.length ? { outputCapRecoveryImports } : {}),
      ...(outputCapRecoverySuccessPermits.length
        ? { outputCapRecoverySuccessImports:
          outputCapRecoverySuccessPermits } : {}),
      policy: 'exact_input_raw_roles_plus_explicit_schema_repair_output_cap_failure_or_settled_recovery_success_import_no_attempt_copy_no_semantic_acceptance_inheritance', trainingTruth: false });
    return { manifest, steps, schemaRepairCandidates, editorEnvelopeFailureImports: editorFailures.evidence,
      outputCapRecoveryFailureImports, outputCapRecoverySuccessImports };
  } finally { db.close(); }
}
