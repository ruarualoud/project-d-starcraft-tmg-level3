import { DatabaseSync } from 'node:sqlite';
import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { validateFactionBudgetExtensionV1 } from './faction-budget-extension-v1.mjs';
import { validateFactionReviewTransactionMigrationV1 } from './faction-review-transaction-migration-v1.mjs';

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

export function validateFactionStructuredReviewMigrationV1({
  parentRunId, parent, parentReport, next, migration,
}) {
  [parent, parentReport, next].forEach(verifySeal);
  if (parent.structuredReviewBinding
    && hash(parent.structuredReviewBinding)
      !== hash(next.structuredReviewBinding || null)) {
    fail('FACTION_STRUCTURED_REVIEW_BINDING_DRIFT');
  }
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
  if (!readiness.passed || readiness.checks.length !== 9
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
    policy: 'all_new_target_reviews_use_schema_slots_then_host_identity_materialization_and_existing_semantic_validation',
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

export function inspectFactionContinuationV1({ filename, parentRunId, parent, parentReport, next, normalizationMigration, correctionMigration, fieldRepairMigration, unitRoleRepairMigration, sourceCorrectionMigration, additionalCommandRecoveryMigration, phaseSeedMigration, budgetExtensionReadiness, reviewTransactionMigration, structuredGenerationMigration, reviewFocusNormalizationMigration, structuredReviewMigration }) {
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
    structuredReviewReadinessHash, limits, continuation, ...body } = r;
    return budgetProof ? body : { ...body, limits }; };
  if (hash(strip(parent)) !== hash(strip(next))) fail('FACTION_CONTINUATION_CONTRACT_DRIFT');
  const additionalRecoveryProof = validateAdditionalFactionCommandRecoveryV1({ parent, next, gates: additionalCommandRecoveryMigration });
  const allowed = new Set(['packages/skill-production-v3/faction-strategy-workflow-v1.mjs',
    'packages/skill-production-v3/faction-continuation-v1.mjs', 'scripts/run-ticket-18-faction-strategy-production-v1.mjs']);
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
    const attempts = db.prepare('SELECT usage,settled,reserve,state,token_reserve FROM attempts WHERE run=?').all(parentRunId);
    const rows = db.prepare("SELECT id,input_hash,artifact FROM steps WHERE run=? AND state='complete'").all(parentRunId)
      .map(r => ({ id: r.id, inputHash: r.input_hash, artifact: verifySeal(JSON.parse(r.artifact)).value }));
    const began = rows.find(r => r.id === 'production-start')?.artifact.began;
    if (!Number.isSafeInteger(began)) fail('FACTION_CONTINUATION_START_MISSING');
    const ancestor = parent.continuation; if (ancestor) verifySeal(ancestor);
    const accounting = { calls: (ancestor?.accounting.calls || 0) + attempts.length,
      costMicros: (ancestor?.accounting.costMicros || 0) + attempts.reduce((n, r) => n + (r.settled ?? r.reserve), 0),
      tokens: (ancestor?.accounting.tokens || 0) + attempts.reduce((n, r) => n + (r.usage ? verifySeal(JSON.parse(r.usage)).value.totalUnits : r.state === 'not_sent' ? 0 : r.token_reserve), 0) };
    if (accounting.calls >= next.limits.maxCalls || accounting.costMicros >= next.limits.maxCostMicros
      || accounting.tokens >= next.limits.maxTokens) fail('FACTION_CONTINUATION_BUDGET_EXHAUSTED');
    // Reuse paid raw role outputs only. Candidate/review decisions and typed
    // issue journals are reconstructed under the current validators.
    const steps = rows.filter(r => r.artifact?.roleId === r.id && r.artifact?.loop?.transcript);
    const manifest = seal({ parentRunId, parentRecipeHash: parent.hash, nextBaseRecipeHash: next.hash,
      parentStart: began, accounting, changes, ...(migrationProof ? { normalizationMigration: migrationProof } : {}),
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
      reusable: steps.map(r => ({ id: r.id, inputHash: r.inputHash, artifactHash: hash(r.artifact) })),
      policy: 'exact_input_raw_roles_only_no_attempt_copy_no_acceptance_inheritance', trainingTruth: false });
    return { manifest, steps };
  } finally { db.close(); }
}
