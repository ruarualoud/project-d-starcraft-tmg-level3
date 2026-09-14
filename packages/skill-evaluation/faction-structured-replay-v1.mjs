import { fail, hash, sha256, verifySeal, seal } from '../skill-production/common.mjs';
import { FACTION_REVIEW_CONTRACT_PROJECTION_BINDING_V1 } from '../skill-production-v3/faction-review-contract-projection-v1.mjs';
import { assertFactionContractProjectionRecipeV1 } from '../skill-production-v3/faction-review-contract-projection-integration-v1.mjs';
import { verifyFactionReviewContractProjectionRoleV1 } from '../skill-production-v3/faction-review-contract-projection-runtime-v1.mjs';
import { FACTION_PARSED_REVIEW_VALUE_BINDING_V1, FACTION_PARSED_REVIEW_VALUE_BINDING_V2,
  verifyFactionParsedReviewValueRecordV1, verifyFactionParsedReviewValueRecordV2 }
  from '../skill-production-v3/faction-parsed-review-value-v1.mjs';
import { FACTION_FIELD_RECOVERY_BINDING_V1,
  verifyFactionFieldRecoveredRoleV1 } from '../skill-production-v3/faction-field-recovery-v1.mjs';
import { assertFactionFieldRecoveryRecipeV1 } from '../skill-production-v3/faction-field-recovery-scope-v1.mjs';
import { assertFactionFieldValueRecipeV1 } from '../skill-production-v3/faction-field-value-integration-v1.mjs';
import { FACTION_FIELD_VALUE_BINDING_V1, verifyFactionFieldValueRoleV1 } from '../skill-production-v3/faction-field-value-runtime-v1.mjs';
import { inspectFactionBatchScopeV1, validateFactionDraftBatchV1 } from '../skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionReviewContextCapsuleV1, createFactionReviewSchemaRepairContextCapsuleV1 } from '../skill-production-v3/faction-review-context-capsule-v1.mjs';
import { materializeFactionStructuredReviewV1, verifyFactionStructuredReviewSchemaRepairScopeV1 } from '../skill-production-v3/faction-structured-review-runtime-v1.mjs';
import { createFactionSlotReviewContextV1, materializeFactionSlotReviewV1,
  recoverFactionExplicitSlotReviewV1, verifyFactionNativeSlotPaidV1 } from '../skill-production-v3/faction-review-slot-namespace-v1.mjs';
import { verifyFactionNativeSlotSchemaFailureV1 } from '../skill-production-v3/faction-review-slot-namespace-v1.mjs';
import { createFactionReviewSourceExpansionV1, FACTION_REVIEW_SOURCE_EXPANSION_BINDING_V1 }
  from '../skill-production-v3/faction-review-source-expansion-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V6,
  FACTION_REVIEW_SLOT_NAMESPACE_BINDING_V1 } from '../../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V4,
  STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V5 } from '../../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs';
import { STARCRAFT_TMG_FACTION_ADVICE_EDITOR_OUTPUT_CONTRACT_V1 } from '../../content/skill-generation/ticket-18-faction-advice-editor-output-contract-v1.mjs';
import { outputContractRefStarcraftTmgV1, validateStarcraftTmgProviderJsonSchemaValueV1 } from '../structured-generation/output-contract-registry-v1.mjs';
import { FACTION_TEACH_OUTPUT_CONTRACT_V1 } from '../../content/skill-generation/ticket-18-faction-teach-output-contract-v1.mjs';
import { prepareFactionStructuredTeachV1, FACTION_STRUCTURED_TEACH_BINDING_V1 } from '../skill-production-v3/faction-structured-teach-runtime-v1.mjs';
import { applyFactionTeachOutputBudgetV1 } from '../skill-production-v3/faction-teach-output-budget-v1.mjs';
import { FACTION_NATIVE_PRODUCTION_CONTRACTS_V1, FACTION_NATIVE_PRODUCTION_BINDING_V1 } from '../../content/skill-generation/ticket-18-faction-native-production-contracts-v1.mjs';
import { prepareFactionNativeProductionRoleV1 } from '../skill-production-v3/faction-native-production-runtime-v1.mjs';
import { validateTutorLessonV3 } from '../skill-production-v3/runtime.mjs';
import { FACTION_TEACH_UNCERTAINTY_RECOVERY_BINDING_V1, verifyTeachUncertaintyImportedRoleV1 } from '../skill-production-v3/faction-teach-uncertainty-recovery-v1.mjs';
import { FACTION_REVIEW_FOCUS_CAPACITY_RECOVERY_BINDING_V1, verifyReviewFocusCapacityImportedRoleV1 } from '../skill-production-v3/faction-review-focus-capacity-recovery-v1.mjs';
import { FACTION_NATIVE_REFERENCE_SET_RECOVERY_BINDING_V1, verifyFactionNativeReferenceSetRoleV1 } from '../skill-production-v3/faction-native-reference-set-recovery-v1.mjs';
import { FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V1 } from '../skill-production-v3/faction-review-coverage-address-v1.mjs';
import { FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V1, verifyFactionReviewCompleteOutputImportV1 } from '../skill-production-v3/faction-review-complete-output-import-v1.mjs';
import { FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V2 } from '../skill-production-v3/faction-review-complete-output-import-v1.mjs';
import { FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V2 } from '../skill-production-v3/faction-review-coverage-address-v2.mjs';
import { FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V3 } from '../skill-production-v3/faction-review-coverage-address-v3.mjs';
import { FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V3 } from '../skill-production-v3/faction-review-complete-output-import-v1.mjs';
import { FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V4 } from '../skill-production-v3/faction-review-complete-output-import-v1.mjs';
import { FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V4 } from '../skill-production-v3/faction-review-coverage-address-v4.mjs';
import { FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V5 } from '../skill-production-v3/faction-review-complete-output-import-v1.mjs';
import { FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V5 } from '../skill-production-v3/faction-review-coverage-address-v5.mjs';
import { FACTION_REASONER_ANSWER_COMPLETION_BINDING_V1, prepareFactionReasonerAnswerCompletionV1,
  factionReasonerCompletionRequestV1, assembleFactionReasonerAnswerCompletionV1 } from '../skill-production-v3/faction-reasoner-answer-completion-v1.mjs';
import { usesFactionNativeOutputCapacityV2, applyFactionNativeOutputCapacityV2 } from '../skill-production-v3/faction-native-output-capacity-v2.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V2 as capacityProfile } from '../../content/skill-generation/offline-provider-profile-v2.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as baseProfile } from '../../content/skill-generation/offline-provider-profile-v1.mjs';
import { verifyFactionExecutionModelReceiptV1, factionProfileRefV1 } from '../skill-production-v3/faction-execution-model-v1.mjs';
import { FACTION_PROPOSER_BATCH_BINDING_V1, FACTION_PROPOSER_BATCH_CONTRACT_V1 } from '../skill-production-v3/faction-proposer-batches-v1.mjs';
import { verifyStarcraftTmgProviderCapabilityCurrentV1 } from '../structured-generation/provider-capability-receipt-v1.mjs';
import { FACTION_PROPOSER_AUXILIARY_CAPACITY_BINDING_V1, FACTION_PROPOSER_ENVELOPE_CAPACITY_BINDING_V2,
  validateFactionProposerAuxiliaryCapacityV1 } from '../skill-production-v3/faction-proposer-auxiliary-capacity-v1.mjs';
import { verifyFactionProposerAuxiliaryRoleV1 } from '../skill-production-v3/faction-proposer-auxiliary-recovery-v1.mjs';
import { FACTION_DRAFT_ENVELOPE_BINDING_V2 } from '../skill-production-v3/faction-draft-envelope-v2.mjs';
import { verifyFactionDraftEnvelopeRoleV2 } from '../skill-production-v3/faction-draft-envelope-recovery-v2.mjs';
import { prepareFactionStructuredLocalEditorRoleV1 } from '../skill-production-v3/faction-structured-local-editor-runtime-v1.mjs';
import { FACTION_EDITOR_DRAFT_ENVELOPE_BINDING_V2, FACTION_EDITOR_ENVELOPE_EXECUTION_POLICY_V2,
  verifyFactionEditorDraftEnvelopeRoleV2 } from '../skill-production-v3/faction-editor-draft-envelope-v2.mjs';
import { FACTION_REVIEW_DECOMPOSITION_BINDING_V1 } from '../skill-production-v3/faction-review-decomposition-v1.mjs';
import { verifyFactionReviewDecompositionRuntimeV1 } from '../skill-production-v3/faction-review-decomposition-runtime-v1.mjs';
import { FACTION_MIXED_REVIEW_ASSEMBLY_BINDING_V1 } from '../skill-production-v3/faction-mixed-review-assembly-v1.mjs';
import { verifyFactionMixedReviewRoleV1 } from '../skill-production-v3/faction-mixed-review-role-v1.mjs';
import { FACTION_FIELD_VALUE_SOURCE_HANDOFF_BINDING_V1,
  verifyFactionFieldValueSourceHandoffV1 } from '../skill-production-v3/faction-field-value-source-handoff-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../secure-provider-runtime/provider-profile-registry-v2.mjs';
import { assertFactionWireAddressRecipeScopeV1 } from '../skill-production-v3/faction-wire-address-recovery-v1.mjs';
import { prepareFactionSlotReviewRoleV1 } from '../skill-production-v3/faction-slot-review-runtime-v1.mjs';
import { FACTION_STRUCTURAL_JSON_REVIEW_BINDING_V1, verifyFactionStructuralReviewRoleV1 } from '../skill-production-v3/faction-structural-json-runtime-v1.mjs';
import { assertFactionStructuralJsonRecipeV1 } from '../skill-production-v3/faction-structural-json-scope-v1.mjs';
import { verifyFactionNativeReviewAmbiguousReplacementV1 }
  from '../skill-production-v3/faction-native-review-ambiguous-replacement-v1.mjs';
import { FACTION_REVIEW_SOFT_LIMIT_BINDING_V1,
  authenticateFactionReviewSoftLimitV1,
  verifyFactionReviewSoftLimitRecordV1 }
  from '../skill-production-v3/faction-review-soft-limit-v1.mjs';

const nativePolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
function coverageBindingFor(value, recipe) {
  const resolution = value.hostMaterializationReceipt?.coverageAddressResolution;
  if (!resolution) return null;
  const binding = resolution.bindingHash === FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V5.hash ? recipe.dualCoordinateReviewBinding?.coverageAddress
    : resolution.bindingHash === FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V4.hash ? recipe.explicitSlotReviewBinding?.coverageAddress
    : resolution.bindingHash === FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V3.hash ? recipe.targetIdReviewBinding?.coverageAddress
    : resolution.bindingHash === FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V2.hash
      ? recipe.targetCompletionBinding?.coverageAddress : recipe.metadataRecoveryBinding?.coverageAddress;
  if (binding?.hash !== resolution.bindingHash) fail('FACTION_REVIEW_COVERAGE_ADDRESS_CONSUMER_BINDING_REQUIRED');
  return binding;
}

const contracts = [STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V4,
  STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V6,
  STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V5, STARCRAFT_TMG_FACTION_ADVICE_EDITOR_OUTPUT_CONTRACT_V1,
  FACTION_TEACH_OUTPUT_CONTRACT_V1, FACTION_PROPOSER_BATCH_CONTRACT_V1, ...Object.values(FACTION_NATIVE_PRODUCTION_CONTRACTS_V1)];

import { FACTION_STRUCTURAL_JSON_SCHEMA_BRIDGE_BINDING_V2,
  verifyFactionParsedWireCorrectionRecordV2 } from '../skill-production-v3/faction-structural-json-schema-bridge-v2.mjs';

function verifyStructuredLoop(loop, candidate, runtimeReceipt, dshBindingHash) {
  verifySeal(loop);
  const command = { action: 'finish', content: candidate.providerValue }, transcript = loop.transcript;
  if (loop.runtimeBinding?.hash !== dshBindingHash || !loop.sandboxReceipt
    || loop.directNetworkUsed !== false || loop.trainingTruth !== false
    || loop.calls !== 1 || loop.toolTrace.length !== 0 || transcript.length !== 1 || transcript[0].call !== 1
    || transcript[0].receiptHash !== runtimeReceipt.hash
    || transcript[0].commandHash !== sha256(JSON.stringify(command))
    || hash(loop.final) !== hash(candidate.providerValue)) fail('FACTION_STRUCTURED_REPLAY_DSH_DRIFT');
}

// Read-only consumer proof. Decode/schema acceptance, paid provenance, exact
// Host mapping, and downstream source review remain separate checks.
export function verifyFactionStructuredRoleReplayV1({ value, roleInput,
  request, input, recipe, resolveArtifact, resolveResponse, editorImport, resolveTeachFailureEvidence = null,
  resolveCompleteReviewImportEvidence = null, resolveCapabilityReceipt = null,
  resolveReviewWireEvidence = null, resolveStructuredSuccessEvidence = null, openingFenceRecovery = null,
  resolveStructuralReviewAuthentication = null, resolveStructuredSchemaFailureEvidence = null,
  resolveParsedWireRecoveryAuthentication = null, resolveFieldRecoveryEvidence = null, resolveFieldValuePaidEvidence = null,
  resolveFieldValueSourceHandoff = null, resolveMixedReviewEnvironment = null,
  resolveNativeReviewAmbiguousOrigin = null }) {
  verifySeal(value);
  const parsedValues = value.parsedReviewValues || [];
  const softLimitValues = value.reviewSoftLimitValues || [];
  const parsedV1 = parsedValues.filter(record => record.version === FACTION_PARSED_REVIEW_VALUE_BINDING_V1.version);
  const parsedV2 = parsedValues.filter(record => record.version === FACTION_PARSED_REVIEW_VALUE_BINDING_V2.version);
  if (value.parsedReviewValues && (value.sourceDelivery !== 'proof_carrying_whole_section_review_capsule'
    || !Array.isArray(parsedValues) || !parsedValues.length || parsedValues.length > 4
    || new Set(parsedValues.map(r => r.originalContextHash)).size !== parsedValues.length
    || parsedV1.length + parsedV2.length !== parsedValues.length
    || parsedV1.length && recipe.parsedReviewValueBinding?.hash !== FACTION_PARSED_REVIEW_VALUE_BINDING_V1.hash
    || parsedV2.length && value.parsedReviewNarrativeBindingHash !== FACTION_PARSED_REVIEW_VALUE_BINDING_V2.hash
    || !parsedV2.length && value.parsedReviewNarrativeBindingHash
    || !resolveParsedWireRecoveryAuthentication || value.semanticAcceptance !== false
    || value.runtimeAccepted === true)) fail('FACTION_PARSED_REVIEW_VALUE_CONSUMER_BINDING_REQUIRED');
  const finalParsed = value.parsedReviewValueRef && parsedValues.find(r => r.hash === value.parsedReviewValueRef.hash);
  if (value.parsedReviewValueRef && (!finalParsed || value.structuredCandidateRef || value.structuredRuntimeReceiptRef
    || value.protocol || value.completeReviewImportProof || value.schemaRepairImportReceipt
    || value.executionModelBindingHash || value.executionProviderProfileRef)) fail('FACTION_PARSED_REVIEW_VALUE_FINAL_DRIFT');
  if (value.reviewSoftLimitValues && (value.sourceDelivery !== 'proof_carrying_whole_section_review_capsule'
    || !Array.isArray(softLimitValues) || !softLimitValues.length || softLimitValues.length > 4
    || new Set(softLimitValues.map(r => r.originalContextHash)).size !== softLimitValues.length
    || softLimitValues.some(r => r.bindingHash !== FACTION_REVIEW_SOFT_LIMIT_BINDING_V1.hash)
    || value.reviewSoftLimitBindingHash !== FACTION_REVIEW_SOFT_LIMIT_BINDING_V1.hash
    || !resolveStructuredSchemaFailureEvidence || value.semanticAcceptance !== false
    || value.runtimeAccepted === true)) fail('FACTION_REVIEW_SOFT_LIMIT_CONSUMER_BINDING_REQUIRED');
  const finalSoftLimit = value.reviewSoftLimitValueRef
    && softLimitValues.find(r => r.hash === value.reviewSoftLimitValueRef.hash);
  if (value.reviewSoftLimitValueRef && (!finalSoftLimit || value.parsedReviewValueRef
    || value.structuredCandidateRef || value.structuredRuntimeReceiptRef
    || value.protocol || value.completeReviewImportProof || value.schemaRepairImportReceipt
    || value.executionModelBindingHash || value.executionProviderProfileRef))
    fail('FACTION_REVIEW_SOFT_LIMIT_FINAL_DRIFT');
  if (value.parsedWireRecoveries && (value.sourceDelivery !== 'proof_carrying_whole_section_review_capsule'
    || !Array.isArray(value.parsedWireRecoveries) || !value.parsedWireRecoveries.length || value.parsedWireRecoveries.length > 2
    || new Set(value.parsedWireRecoveries.map(r => r.originalContextHash)).size !== value.parsedWireRecoveries.length
    || recipe.parsedWireSchemaBridgeBinding?.hash !== FACTION_STRUCTURAL_JSON_SCHEMA_BRIDGE_BINDING_V2.hash
    || !resolveParsedWireRecoveryAuthentication)) fail('FACTION_PARSED_WIRE_SCHEMA_CONSUMER_BINDING_REQUIRED');
  const additionalReceiptHashes = [];
  const observedContextHash = value.contextCapsuleHash || value.contextManifestRef?.hash;
  const contract = contracts.find(c => outputContractRefStarcraftTmgV1(c).hash === value.outputContractRef?.hash);
  if (!contract || !request || value.roleId !== request.packet.id + '.' + request.roleId
    || value.structuredDecodePassed !== true || value.trainingTruth !== false
    || hash(value.outputContractRef) !== hash(roleInput.outputContractRef)
    || (value.initialContextCapsuleHash || observedContextHash) !== roleInput.contextManifestRef?.hash) {
    fail('FACTION_STRUCTURED_REPLAY_ROLE_BINDING_INVALID');
  }
  if (value.protocol === FACTION_REVIEW_CONTRACT_PROJECTION_BINDING_V1.version) {
    if (!assertFactionContractProjectionRecipeV1(recipe) || typeof resolveFieldRecoveryEvidence !== 'function')
      fail('FACTION_CONTRACT_PROJECTION_CONSUMER_AUTHENTICATION_REQUIRED');
    const prepared = prepareFactionSlotReviewRoleV1({ input, request, executionPolicy: nativePolicy });
    if (!prepared || hash(prepared.roleInput) !== hash(roleInput)) fail('FACTION_CONTRACT_PROJECTION_CONSUMER_INPUT_DRIFT');
    const evidence = resolveFieldRecoveryEvidence({ value, prepared });
    return verifyFactionReviewContractProjectionRoleV1({ value, input, prepared, ...evidence, dshBindingHash: recipe.dshBindingHash });
  }
  if (value.protocol === FACTION_FIELD_VALUE_BINDING_V1.version) {
    if (!assertFactionFieldValueRecipeV1(recipe) || !resolveFieldRecoveryEvidence
      || !resolveFieldValuePaidEvidence || !resolveCapabilityReceipt)
      fail('FACTION_FIELD_VALUE_CONSUMER_AUTHENTICATION_REQUIRED');
    const prepared = prepareFactionSlotReviewRoleV1({ input, request, executionPolicy: nativePolicy });
    if (!prepared || hash(prepared.roleInput) !== hash(roleInput)) fail('FACTION_FIELD_VALUE_CONSUMER_INPUT_DRIFT');
    const evidence = resolveFieldRecoveryEvidence({ value, prepared });
    return verifyFactionFieldValueRoleV1({ value, input, prepared, originalEvidence: evidence.originalEvidence,
      readPaidEvidence: choice => {
        const capability = resolveCapabilityReceipt(choice.capability.receiptHash);
        if (!capability || hash(capability) !== hash(choice.capability)) fail('FACTION_FIELD_VALUE_ACTUAL_CAPABILITY_MISSING');
        return resolveFieldValuePaidEvidence(choice);
      }, dshBindingHash: recipe.dshBindingHash });
  }
  if (value.protocol === FACTION_FIELD_RECOVERY_BINDING_V1.version) {
    if (!assertFactionFieldRecoveryRecipeV1(recipe) || typeof resolveFieldRecoveryEvidence !== 'function')
      fail('FACTION_FIELD_RECOVERY_CONSUMER_AUTHENTICATION_REQUIRED');
    const prepared = prepareFactionSlotReviewRoleV1({ input, request, executionPolicy: nativePolicy });
    if (!prepared || hash(prepared.roleInput) !== hash(roleInput)) fail('FACTION_FIELD_RECOVERY_CONSUMER_INPUT_DRIFT');
    const evidence = resolveFieldRecoveryEvidence({ value, prepared });
    return verifyFactionFieldRecoveredRoleV1({ value, input, prepared, ...evidence, dshBindingHash: recipe.dshBindingHash });
  }
  if (value.protocol === FACTION_STRUCTURAL_JSON_REVIEW_BINDING_V1.version) {
    if (!assertFactionStructuralJsonRecipeV1(recipe) || typeof resolveStructuralReviewAuthentication !== 'function')
      fail('FACTION_STRUCTURAL_JSON_CONSUMER_AUTHENTICATION_REQUIRED');
    const prepared = prepareFactionSlotReviewRoleV1({ input, request, executionPolicy: nativePolicy });
    if (!prepared || hash(prepared.roleInput) !== hash(roleInput)) fail('FACTION_STRUCTURAL_JSON_CONSUMER_INPUT_DRIFT');
    const authenticated = resolveStructuralReviewAuthentication(value);
    return verifyFactionStructuralReviewRoleV1({ value, prepared, authenticated,
      dshBindingHash: recipe.dshBindingHash, selectedBinding: recipe.structuralJsonReviewBinding });
  }
  if (value.protocol === FACTION_REVIEW_DECOMPOSITION_BINDING_V1.version) {
    const boundRecovery = assertFactionWireAddressRecipeScopeV1(recipe);
    const origins = boundRecovery ? recipe.openingFenceRecoveryOrigins.filter(o => o.inputHash === input.hash) : [];
    if (origins.length || openingFenceRecovery) {
      if (!boundRecovery || openingFenceRecovery?.binding?.hash !== recipe.openingFenceRecoveryBinding.hash
        || hash((openingFenceRecovery?.proofs || []).map(p => ({ inputHash: input.hash, runId: p.originRunId,
          attemptId: p.originAttemptId, contextHash: p.contextManifestRef.hash, proofHash: p.hash }))) !== hash(origins))
        fail('FACTION_OPENING_FENCE_CONSUMER_BINDING_REQUIRED');
    }
    if (recipe.reviewDecompositionBinding?.hash !== FACTION_REVIEW_DECOMPOSITION_BINDING_V1.hash
      || !resolveReviewWireEvidence || !resolveStructuredSuccessEvidence || !resolveCapabilityReceipt)
      fail('FACTION_REVIEW_DECOMPOSITION_CONSUMER_BINDING_REQUIRED');
    const w = request.workspace;
    const capsule = createFactionReviewContextCapsuleV1({ factionInput: input, section: w.section, draft: w.draft,
      reviewIndices: w.reviewIndices, coverageRequiredSourceRefs: w.coverageRequiredSourceRefs,
      targets: w.outputRequestAtEnd.targetContract, roleRef: roleInput.roleRef, outputContractRef: roleInput.outputContractRef,
      route: /\.review-target-batch-v1\.(supportive|adversarial)\./u.exec(request.roleId)?.[1],
      includeSharedScenarioSources: value.sharedScenarioSourcesIncluded === true });
    const evidence = resolveReviewWireEvidence({ value, capsule });
    if (capsule.hash !== value.initialContextCapsuleHash || evidence.hash !== value.wireFailureEvidence.hash
      || hash(value.output) !== hash(value.decomposition.output) || value.semanticAcceptance !== false
      || value.sourceDelivery !== 'proof_carrying_decomposed_whole_section_review') fail('FACTION_REVIEW_DECOMPOSITION_CONSUMER_ROLE_DRIFT');
    if (value.decomposition.protocol === FACTION_MIXED_REVIEW_ASSEMBLY_BINDING_V1.version) {
      if (!resolveMixedReviewEnvironment) fail('FACTION_MIXED_REVIEW_CONSUMER_ENVIRONMENT_REQUIRED');
      const args = { input, capsule, evidence, originalContract: contract, mapping: { section: w.section, draft: w.draft,
        reviewIndices: w.reviewIndices, requiredSourceRefs: w.coverageRequiredSourceRefs, targets: w.outputRequestAtEnd.targetContract } };
      const environment = resolveMixedReviewEnvironment(args);
      try {
        const proof = verifyFactionMixedReviewRoleV1({ args, value, roleInput, packetHash: request.packet.hash, recipe, environment });
        return { providerReceiptHashes: proof.providerReceiptHashes, importedCanaryHash: null };
      } finally { environment.close(); }
    }
    const registry = createStarcraftTmgProviderProfileRegistryV2({ entries: [{ providerProfile: baseProfile, responsePath: '/responses' }],
      allowedProviders: ['deepseek-openai-compatible-direct'] });
    const egressBinding = registry.resolveEgressBinding({ profileRef: { id: baseProfile.providerProfileId,
      version: baseProfile.version, hash: baseProfile.integrity.hash } }).egressBinding;
    const capabilities = Object.fromEntries(Object.entries(value.decomposition.capabilityReceiptHashes)
      .map(([kind, identity]) => [kind, resolveCapabilityReceipt(identity)]));
    const proof = verifyFactionReviewDecompositionRuntimeV1({ value: value.decomposition, input, capsule, evidence,
      originalContract: contract, mapping: { section: w.section, draft: w.draft, reviewIndices: w.reviewIndices,
        requiredSourceRefs: w.coverageRequiredSourceRefs, targets: w.outputRequestAtEnd.targetContract },
      egressBinding, capabilities, dshBindingHash: recipe.dshBindingHash,
      resolveFragment: id => resolveArtifact(value.decomposition.fragmentRefs.find(r => r.id === id)?.hash),
      readSuccessEvidence: resolveStructuredSuccessEvidence, openingFenceRecovery });
    return { providerReceiptHashes: proof.providerReceiptHashes, importedCanaryHash: null };
  }
  if ([FACTION_PROPOSER_AUXILIARY_CAPACITY_BINDING_V1.version, FACTION_PROPOSER_ENVELOPE_CAPACITY_BINDING_V2.version].includes(value.protocol)) {
    const activeBinding = recipe.proposerAuxiliaryCapacityBinding;
    const auxiliaryCapacityBinding = value.protocol === FACTION_PROPOSER_AUXILIARY_CAPACITY_BINDING_V1.version
      ? FACTION_PROPOSER_AUXILIARY_CAPACITY_BINDING_V1 : FACTION_PROPOSER_ENVELOPE_CAPACITY_BINDING_V2;
    if (!activeBinding || auxiliaryCapacityBinding.maximumPlanTextLength && activeBinding.hash !== auxiliaryCapacityBinding.hash
      || !resolveTeachFailureEvidence) fail('FACTION_PROPOSER_AUXILIARY_CONSUMER_BINDING_REQUIRED');
    validateFactionProposerAuxiliaryCapacityV1(activeBinding);
    const prepared = prepareFactionNativeProductionRoleV1({ input, request, executionPolicy: nativePolicy,
      proposerBatchBinding: recipe.proposerBatchBinding, proposerAuxiliaryCapacityBinding: auxiliaryCapacityBinding });
    if (hash(prepared.roleInput) !== hash(roleInput)) fail('FACTION_PROPOSER_AUXILIARY_CONSUMER_DRIFT');
    return verifyFactionProposerAuxiliaryRoleV1({ value, input, request, prepared, auxiliaryCapacityBinding,
      evidence: resolveTeachFailureEvidence(value.hostMaterialization), dshBindingHash: recipe.dshBindingHash });
  }
  if (value.protocol === FACTION_DRAFT_ENVELOPE_BINDING_V2.version) {
    const binding = recipe.draftEnvelopeBinding;
    if (binding?.hash !== FACTION_DRAFT_ENVELOPE_BINDING_V2.hash || !resolveTeachFailureEvidence)
      fail('FACTION_DRAFT_ENVELOPE_CONSUMER_BINDING_REQUIRED');
    const capacity = recipe.nativeOutputCapacityBinding || null;
    const selected = capacity && usesFactionNativeOutputCapacityV2({ roleId: value.roleId, kind: value.nativeKind,
      binding: capacity, frozenRoleIds: recipe.nativeOutputCapacityFrozenRoleIds });
    const prepared = prepareFactionNativeProductionRoleV1({ input,
      request: selected ? applyFactionNativeOutputCapacityV2(request, capacity) : request,
      executionPolicy: selected ? capacity.executionPolicy : nativePolicy, outputCapacityBinding: selected ? capacity : null,
      proposerBatchBinding: recipe.proposerBatchBinding || null, proposerAuxiliaryCapacityBinding: recipe.proposerAuxiliaryCapacityBinding || null,
      targetReconstructionBinding: recipe.nativeTargetReconstructionBinding || null });
    if (hash(prepared.roleInput) !== hash(roleInput)) fail('FACTION_DRAFT_ENVELOPE_CONSUMER_DRIFT');
    const proof = verifyFactionDraftEnvelopeRoleV2({ value, input, request, prepared, binding,
      evidence: resolveTeachFailureEvidence(value.hostMaterialization), dshBindingHash: recipe.dshBindingHash });
    if (prepared.roleInput.targetReconstructionBindingHash) {
      if (!resolveArtifact) fail('FACTION_NATIVE_TARGET_RECONSTRUCTION_CONSUMER_BINDING_REQUIRED');
      const w = request.workspace, issue = w.targetIssue, original = verifySeal(resolveArtifact(issue.rejectedArtifactHash));
      const scope = { input, outline: w.outline, indices: w.indices, completedRecommendations: w.completedRecommendations,
        draftEnvelopeBinding: binding };
      const { hash: ignored, ...body } = inspectFactionBatchScopeV1(original.output, scope);
      if (original.roleId !== value.roleId.slice(0, -'.target-reconstruction.v1'.length)
        || seal({ ...body, rejectedArtifactHash: original.hash, failureCode: issue.failureCode }).hash !== issue.hash
        || hash(original.output) === hash(value.output)) fail('FACTION_NATIVE_TARGET_RECONSTRUCTION_CONSUMER_ISSUE_DRIFT');
      let actualCode = null;
      try { validateFactionDraftBatchV1(original.output, scope); } catch (error) { actualCode = error.code; }
      if (actualCode !== issue.failureCode) fail('FACTION_NATIVE_TARGET_RECONSTRUCTION_CONSUMER_ISSUE_DRIFT');
      validateFactionDraftBatchV1(value.output, scope);
    }
    return proof;
  }
  if (value.protocol === FACTION_REASONER_ANSWER_COMPLETION_BINDING_V1.version) {
    if (recipe.targetCompletionBinding?.reasoner?.hash !== FACTION_REASONER_ANSWER_COMPLETION_BINDING_V1.hash
      || !resolveTeachFailureEvidence || !resolveArtifact) fail('FACTION_ANSWER_COMPLETION_CONSUMER_BINDING_REQUIRED');
    const prepared = prepareFactionNativeProductionRoleV1({ input, request, executionPolicy: nativePolicy });
    if (hash(prepared.roleInput) !== hash(roleInput) || value.sourceContextHash !== input.frozenSources.hash)
      fail('FACTION_ANSWER_COMPLETION_CONSUMER_DRIFT');
    const evidence = resolveTeachFailureEvidence(value.hostMaterialization);
    const materialization = prepareFactionReasonerAnswerCompletionV1({ input, request, prepared, evidence });
    if (materialization.hash !== value.hostMaterialization.hash) fail('FACTION_ANSWER_COMPLETION_CONSUMER_DRIFT');
    const parts = [], receipts = [materialization.originalFailureReceiptHash];
    for (const [batchIndex, ref] of value.completionPartRefs.entries()) {
      const childRequest = factionReasonerCompletionRequestV1({ request, materialization, batchIndex, priorParts: parts });
      const part = verifySeal(resolveArtifact(ref.hash));
      if (part.roleId !== ref.id || part.protocol === value.protocol) fail('FACTION_ANSWER_COMPLETION_RECURSIVE_OR_FOREIGN_PART');
      const childPrepared = prepareFactionNativeProductionRoleV1({ input, request: childRequest, executionPolicy: nativePolicy });
      const proof = verifyFactionStructuredRoleReplayV1({ value: part, roleInput: childPrepared.roleInput,
        request: childRequest, input, recipe, resolveArtifact, resolveResponse, editorImport,
        resolveTeachFailureEvidence, resolveCompleteReviewImportEvidence });
      receipts.push(...proof.providerReceiptHashes); parts.push(part);
    }
    const rebuilt = assembleFactionReasonerAnswerCompletionV1({ input, request, prepared, materialization, parts });
    if (rebuilt.hash !== value.hash) fail('FACTION_ANSWER_COMPLETION_CONSUMER_DRIFT');
    return { providerReceiptHashes: receipts, importedCanaryHash: null };
  }
  if (value.protocol === FACTION_NATIVE_REFERENCE_SET_RECOVERY_BINDING_V1.version) {
    if (recipe.metadataRecoveryBinding?.nativeReferenceSet?.hash !== FACTION_NATIVE_REFERENCE_SET_RECOVERY_BINDING_V1.hash
      || !resolveTeachFailureEvidence) fail('FACTION_NATIVE_REFERENCE_SET_CONSUMER_BINDING_REQUIRED');
    const capacity = recipe.nativeOutputCapacityBinding || null;
    const selected = capacity && usesFactionNativeOutputCapacityV2({ roleId: value.roleId, kind: value.nativeKind,
      binding: capacity, frozenRoleIds: recipe.nativeOutputCapacityFrozenRoleIds });
    const prepared = prepareFactionNativeProductionRoleV1({ input,
      request: selected ? applyFactionNativeOutputCapacityV2(request, capacity) : request,
      executionPolicy: selected ? capacity.executionPolicy : nativePolicy,
      outputCapacityBinding: selected ? capacity : null,
      proposerBatchBinding: recipe.proposerBatchBinding || null,
      proposerAuxiliaryCapacityBinding: recipe.proposerAuxiliaryCapacityBinding || null,
      targetReconstructionBinding: recipe.nativeTargetReconstructionBinding || null });
    if (hash(prepared.roleInput) !== hash(roleInput) || value.sourceContextHash !== input.frozenSources.hash)
      fail('FACTION_NATIVE_REFERENCE_SET_CONSUMER_DRIFT');
    const evidence = resolveTeachFailureEvidence(value.hostMaterialization);
    const receipt = verifySeal(JSON.parse(evidence.attempt.response)).value;
    const invocation = { schemaVersion: 'starcraft_tmg_structured_generation_runtime_v1.invocation',
      roleRef: prepared.roleRef, contextManifestRef: prepared.contextManifestRef, outputContractRef: prepared.outputContractRef,
      executionPolicyRef: prepared.executionPolicyRef, continuationRef: null,
      contextPayloadHash: hash({ instructions: prepared.instructions, input: prepared.payload }),
      capabilityReceiptHash: receipt.capabilityReceiptHash, trainingTruth: false };
    if (hash(invocation) !== evidence.rejected.invocationHash) fail('FACTION_NATIVE_REFERENCE_SET_CONSUMER_INVOCATION_DRIFT');
    const proof = verifyFactionNativeReferenceSetRoleV1({ value, prepared, input, dshBindingHash: recipe.dshBindingHash, evidence });
    if (prepared.roleInput.targetReconstructionBindingHash) {
      if (!resolveArtifact) fail('FACTION_NATIVE_TARGET_RECONSTRUCTION_CONSUMER_BINDING_REQUIRED');
      const w = request.workspace, issue = w.targetIssue, original = verifySeal(resolveArtifact(issue.rejectedArtifactHash));
      const scope = { input, outline: w.outline, indices: w.indices, completedRecommendations: w.completedRecommendations,
        draftEnvelopeBinding: recipe.draftEnvelopeBinding || null };
      const { hash: ignored, ...body } = inspectFactionBatchScopeV1(original.output, scope);
      if (original.roleId !== value.roleId.slice(0, -'.target-reconstruction.v1'.length)
        || seal({ ...body, rejectedArtifactHash: original.hash, failureCode: issue.failureCode }).hash !== issue.hash
        || hash(original.output) === hash(value.output)) fail('FACTION_NATIVE_TARGET_RECONSTRUCTION_CONSUMER_ISSUE_DRIFT');
      let actualCode = null;
      try { validateFactionDraftBatchV1(original.output, scope); } catch (error) { actualCode = error.code; }
      if (actualCode !== issue.failureCode) fail('FACTION_NATIVE_TARGET_RECONSTRUCTION_CONSUMER_ISSUE_DRIFT');
      validateFactionDraftBatchV1(value.output, scope);
    }
    return proof;
  }
  if (value.protocol === FACTION_REVIEW_FOCUS_CAPACITY_RECOVERY_BINDING_V1.version) {
    if (recipe.reviewFocusCapacityRecoveryBinding?.hash !== FACTION_REVIEW_FOCUS_CAPACITY_RECOVERY_BINDING_V1.hash
      || !resolveTeachFailureEvidence) fail('FACTION_REVIEW_FOCUS_CAPACITY_CONSUMER_BINDING_REQUIRED');
    const w = request.workspace, includeSharedScenarioSources = value.sharedScenarioSourcesIncluded === true;
    const capsule = createFactionReviewContextCapsuleV1({ factionInput: input,
      section: w.section, draft: w.draft, reviewIndices: w.reviewIndices,
      coverageRequiredSourceRefs: w.coverageRequiredSourceRefs, targets: w.outputRequestAtEnd.targetContract,
      roleRef: roleInput.roleRef, outputContractRef: roleInput.outputContractRef,
      route: /\.review-target-batch-v1\.(supportive|adversarial)\./u.exec(request.roleId)?.[1], includeSharedScenarioSources });
    return verifyReviewFocusCapacityImportedRoleV1({ value, input, dshBindingHash: recipe.dshBindingHash,
      evidence: resolveTeachFailureEvidence(value.hostMaterialization),
      prepared: { fullRoleId: value.roleId, roleInput, capsule, includeSharedScenarioSources,
        coverageAddressBinding: coverageBindingFor(value, recipe),
        mapping: { section: w.section, draft: w.draft, reviewIndices: w.reviewIndices,
          requiredSourceRefs: w.coverageRequiredSourceRefs, targets: w.outputRequestAtEnd.targetContract } } });
  }
  if (value.protocol === FACTION_TEACH_UNCERTAINTY_RECOVERY_BINDING_V1.version) {
    if (recipe.teachUncertaintyRecoveryBinding?.hash !== FACTION_TEACH_UNCERTAINTY_RECOVERY_BINDING_V1.hash
      || !resolveTeachFailureEvidence) fail('FACTION_TEACH_UNCERTAINTY_CONSUMER_BINDING_REQUIRED');
    const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
      allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
    const prepared = prepareFactionStructuredTeachV1({ input,
      request: applyFactionTeachOutputBudgetV1(request, recipe.teachOutputBudgetBinding), executionPolicy });
    if (hash(prepared.roleInput) !== hash(roleInput)) fail('FACTION_TEACH_UNCERTAINTY_CONSUMER_DRIFT');
    return verifyTeachUncertaintyImportedRoleV1({ value, prepared, input, dshBindingHash: recipe.dshBindingHash,
      evidence: resolveTeachFailureEvidence(value.hostMaterialization) });
  }
  if (value.protocol === FACTION_EDITOR_DRAFT_ENVELOPE_BINDING_V2.version) {
    const binding = recipe.editorEnvelopeBinding, draftEnvelopeBinding = recipe.draftEnvelopeBinding;
    if (binding?.hash !== FACTION_EDITOR_DRAFT_ENVELOPE_BINDING_V2.hash
      || draftEnvelopeBinding?.hash !== FACTION_DRAFT_ENVELOPE_BINDING_V2.hash || !resolveTeachFailureEvidence)
      fail('FACTION_EDITOR_ENVELOPE_CONSUMER_BINDING_REQUIRED');
    const prepared = prepareFactionStructuredLocalEditorRoleV1({ input, request,
      outputContract: STARCRAFT_TMG_FACTION_ADVICE_EDITOR_OUTPUT_CONTRACT_V1,
      executionPolicy: FACTION_EDITOR_ENVELOPE_EXECUTION_POLICY_V2 });
    if (hash(prepared.roleInput) !== hash(roleInput)) fail('FACTION_EDITOR_ENVELOPE_CONSUMER_INPUT_DRIFT');
    return verifyFactionEditorDraftEnvelopeRoleV2({ value, input, request, prepared, binding, draftEnvelopeBinding,
      evidence: resolveTeachFailureEvidence(value.hostMaterialization), dshBindingHash: recipe.dshBindingHash });
  }
  if (value.sourceDelivery === 'proof_carrying_local_capsule_import') {
    verifySeal(editorImport);
    if (value.structuredImportHash !== editorImport.hash
      || value.contextCapsuleHash !== editorImport.contextCapsuleHash
      || hash(value.output) !== editorImport.rawAdviceHash
      || !validateStarcraftTmgProviderJsonSchemaValueV1(contract.providerSchema, value.output).ok) {
      fail('FACTION_STRUCTURED_REPLAY_IMPORT_DRIFT');
    }
    return { importedCanaryHash: editorImport.hash, providerReceiptHashes: [] };
  }
  const locallyMaterialized = finalParsed || finalSoftLimit;
  const candidate = locallyMaterialized ? null : verifySeal(resolveArtifact(value.structuredCandidateRef?.hash));
  const runtimeReceipt = locallyMaterialized ? null : verifySeal(resolveArtifact(value.structuredRuntimeReceiptRef?.hash));
  const resolved = candidate && resolveResponse(candidate.providerReceiptHash);
  const response = resolved?.response, receipt = response?.usageReceipt;
  const providerValue = locallyMaterialized ? locallyMaterialized.loop.final : candidate.providerValue;
  let paidProfile, paidOwnerRecipe, receiptHash;
  if (!locallyMaterialized) {
  if (!receipt) fail('FACTION_STRUCTURED_REPLAY_RECEIPT_MISSING');
  // Physical model identity comes from the verified paid-attempt owner, not
  // from the latest recipe that merely reuses a historical role artifact.
  if (recipe.executionModelBinding && !resolved.originRecipe) fail('FACTION_EXECUTION_MODEL_ORIGIN_RECIPE_REQUIRED');
  paidOwnerRecipe = resolved.originRecipe || recipe;
  paidProfile = verifyFactionExecutionModelReceiptV1({receipt, ownerRecipe:paidOwnerRecipe,
    capability:resolveCapabilityReceipt?.(receipt.capabilityReceiptHash),
    legacyProfileRef:factionProfileRefV1(value.outputCapacityBindingHash ? capacityProfile : baseProfile)});
  if (value.protocol === FACTION_NATIVE_PRODUCTION_BINDING_V1.version && paidOwnerRecipe.executionModelBinding) {
    if (value.executionModelBindingHash !== paidOwnerRecipe.executionModelBinding.hash
      || hash(value.executionProviderProfileRef) !== hash(factionProfileRefV1(paidProfile)))
      fail('FACTION_EXECUTION_MODEL_ROLE_METADATA_MISMATCH');
  } else if (value.executionModelBindingHash || value.executionProviderProfileRef)
    fail('FACTION_EXECUTION_MODEL_ROLE_METADATA_UNSCOPED');
  if (value.completeReviewImportProof) {
    const binding = value.completeReviewImportProof.bindingHash === FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V5.hash ? recipe.dualCoordinateReviewBinding?.reviewImport
      : value.completeReviewImportProof.bindingHash === FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V4.hash ? recipe.explicitSlotReviewBinding?.reviewImport
      : value.completeReviewImportProof.bindingHash === FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V3.hash ? recipe.targetIdReviewBinding?.reviewImport
      : value.completeReviewImportProof.bindingHash === FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V2.hash
        ? recipe.targetCompletionBinding?.reviewImport : recipe.metadataRecoveryBinding?.completeReviewImport;
    if (![FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V1.hash, FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V2.hash,
      FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V3.hash, FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V4.hash,
      FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V5.hash].includes(binding?.hash)
      || binding.hash !== value.completeReviewImportProof.bindingHash
      || !resolveCompleteReviewImportEvidence) fail('FACTION_REVIEW_COMPLETE_IMPORT_CONSUMER_BINDING_REQUIRED');
    const proof = verifyFactionReviewCompleteOutputImportV1({ evidence: resolveCompleteReviewImportEvidence(value.completeReviewImportProof),
      roleInput, fullRoleId: value.roleId, contract, binding });
    if (proof.hash !== value.completeReviewImportProof.hash) fail('FACTION_REVIEW_COMPLETE_IMPORT_CONSUMER_DRIFT');
  }
  const { receiptHash: actualReceiptHash, ...body } = receipt;
  receiptHash = actualReceiptHash;
  if (hash(body) !== receiptHash || receipt.physicalAttempts !== 1 || receipt.automaticRetries !== 0
    || receipt.responseFingerprint !== hash(response.output)
    || hash(response.output) !== hash(candidate.providerValue)
    || hash(candidate.outputContractRef) !== hash(value.outputContractRef)
    || hash(receipt.outputContractRef) !== hash(value.outputContractRef)
    || hash(receipt.roleRef) !== hash(candidate.roleRef)
    || !validateStarcraftTmgProviderJsonSchemaValueV1(contract.providerSchema, candidate.providerValue).ok
    || runtimeReceipt.status !== 'accepted' || runtimeReceipt.candidateHash !== candidate.hash
    || runtimeReceipt.providerReceiptHash !== receiptHash
    || runtimeReceipt.invocationHash !== candidate.invocationHash
    || candidate.contextManifestRef.hash !== observedContextHash) {
    fail('FACTION_STRUCTURED_REPLAY_RECEIPT_INVALID');
  }
  verifyStructuredLoop(value.loop, candidate, runtimeReceipt, recipe.dshBindingHash);
  }
  if (value.protocol === FACTION_NATIVE_PRODUCTION_BINDING_V1.version) {
    if (recipe.nativeProductionBinding?.hash !== FACTION_NATIVE_PRODUCTION_BINDING_V1.hash)
      fail('FACTION_STRUCTURED_REPLAY_NATIVE_PROTOCOL_DRIFT');
    const outputCapacityBinding = recipe.nativeOutputCapacityBinding || null;
    const selected = outputCapacityBinding && usesFactionNativeOutputCapacityV2({ roleId: value.roleId, kind: value.nativeKind,
      binding: outputCapacityBinding, frozenRoleIds: recipe.nativeOutputCapacityFrozenRoleIds });
    if (selected ? value.outputCapacityBindingHash !== outputCapacityBinding.hash
      : value.outputCapacityBindingHash !== undefined) fail('FACTION_NATIVE_OUTPUT_CAPACITY_CONSUMER_BINDING_REQUIRED');
    if (selected && (!value.providerProfileRef || !roleInput.providerProfileRef
      || hash(value.providerProfileRef) !== hash(outputCapacityBinding.profileRef)
      || hash(roleInput.providerProfileRef) !== hash(outputCapacityBinding.profileRef)))
      fail('FACTION_NATIVE_OUTPUT_CAPACITY_CONSUMER_PROFILE_DRIFT');
    const prepared = prepareFactionNativeProductionRoleV1({ input,
      request: selected ? applyFactionNativeOutputCapacityV2(request, outputCapacityBinding) : request,
      executionPolicy: selected ? outputCapacityBinding.executionPolicy : nativePolicy,
      outputCapacityBinding: selected ? outputCapacityBinding : null,
      proposerBatchBinding: recipe.proposerBatchBinding || null,
      proposerAuxiliaryCapacityBinding: recipe.proposerAuxiliaryCapacityBinding || null,
      targetReconstructionBinding: recipe.nativeTargetReconstructionBinding || null });
    if (prepared.roleInput.targetReconstructionBindingHash) {
      if (value.targetReconstructionBindingHash !== prepared.roleInput.targetReconstructionBindingHash || !resolveArtifact)
        fail('FACTION_NATIVE_TARGET_RECONSTRUCTION_CONSUMER_BINDING_REQUIRED');
      const w = request.workspace, issue = w.targetIssue, original = verifySeal(resolveArtifact(issue.rejectedArtifactHash));
      const originalRoleId = value.roleId.slice(0, -'.target-reconstruction.v1'.length);
      const scope = { input, outline: w.outline, indices: w.indices, completedRecommendations: w.completedRecommendations,
        draftEnvelopeBinding: recipe.draftEnvelopeBinding || null };
      const { hash: ignored, ...body } = inspectFactionBatchScopeV1(original.output, scope);
      if (original.roleId !== originalRoleId || seal({ ...body, rejectedArtifactHash: original.hash, failureCode: issue.failureCode }).hash !== issue.hash
        || hash(original.output) === hash(value.output)) fail('FACTION_NATIVE_TARGET_RECONSTRUCTION_CONSUMER_ISSUE_DRIFT');
      let actualCode = null;
      try { validateFactionDraftBatchV1(original.output, scope); } catch (error) { actualCode = error.code; }
      if (actualCode !== issue.failureCode) fail('FACTION_NATIVE_TARGET_RECONSTRUCTION_CONSUMER_ISSUE_DRIFT');
      validateFactionDraftBatchV1(value.output, scope);
    } else if (value.targetReconstructionBindingHash !== undefined)
      fail('FACTION_NATIVE_TARGET_RECONSTRUCTION_CONSUMER_BINDING_REQUIRED');
    if (prepared.roleInput.proposerBatchBindingHash) {
      if (recipe.proposerBatchBinding?.hash !== FACTION_PROPOSER_BATCH_BINDING_V1.hash
        || value.proposerBatchBindingHash !== prepared.roleInput.proposerBatchBindingHash)
        fail('FACTION_PROPOSER_BATCH_CONSUMER_BINDING_REQUIRED');
      const profile = paidProfile;
      const wire = { model: profile.model, instructions: prepared.instructions, input: prepared.payload,
        reasoning: { effort: 'none' }, temperature: profile.temperature, top_p: profile.topP,
        max_output_tokens: selected ? outputCapacityBinding.executionPolicy.maxOutputUnits : nativePolicy.maxOutputUnits, stream: false,
        text: { format: { type: 'json_schema', name: contract.schemaName, schema: contract.providerSchema } } };
      if (hash(wire) !== receipt.requestBodyHash) fail('FACTION_PROPOSER_BATCH_CONSUMER_WIRE_DRIFT');
    } else if (value.proposerBatchBindingHash !== undefined) fail('FACTION_PROPOSER_BATCH_CONSUMER_BINDING_REQUIRED');
    if (selected) {
      const capability = resolveCapabilityReceipt?.(receipt.capabilityReceiptHash);
      if (!capability || capability.receiptHash !== receipt.capabilityReceiptHash
        || !verifyStarcraftTmgProviderCapabilityCurrentV1({ receipt: capability,
        providerProfileRef: factionProfileRefV1(paidProfile), endpointPath: '/responses', endpointDialect: 'deepseek_responses_v1',
        model: paidProfile.model, capability: 'responses_json_schema', outputContractRef: value.outputContractRef,
        now: receipt.startedAt }).ok) fail('FACTION_NATIVE_OUTPUT_CAPACITY_CONSUMER_CAPABILITY_MISSING');
      // Independent reconstruction verifies the actual paid transport's 8192
      // boundary, not merely the Host's requested execution-policy label.
      const wire = { model: paidProfile.model, instructions: prepared.instructions, input: prepared.payload,
        reasoning: { effort: 'none' }, temperature: paidProfile.temperature, top_p: paidProfile.topP,
        max_output_tokens: outputCapacityBinding.executionPolicy.maxOutputUnits, stream: false,
        text: { format: { type: 'json_schema', name: contract.schemaName, schema: contract.providerSchema } } };
      if (hash(wire) !== receipt.requestBodyHash) fail('FACTION_NATIVE_OUTPUT_CAPACITY_CONSUMER_WIRE_DRIFT');
    }
    if (hash(prepared.roleInput) !== hash(roleInput) || value.sourceContextHash !== input.frozenSources.hash
      || prepared.kind !== value.nativeKind || hash(value.output) !== hash(candidate.providerValue))
      fail('FACTION_STRUCTURED_REPLAY_NATIVE_CONTEXT_DRIFT');
  } else if (value.protocol === 'faction_structured_teach_v1') {
    if (recipe.structuredTeachBinding?.hash !== FACTION_STRUCTURED_TEACH_BINDING_V1.hash)
      fail('FACTION_STRUCTURED_REPLAY_TEACH_PROTOCOL_DRIFT');
    const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
      allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
    const budgetedRequest = recipe.teachOutputBudgetBinding
      ? applyFactionTeachOutputBudgetV1(request, recipe.teachOutputBudgetBinding) : request;
    const prepared = prepareFactionStructuredTeachV1({ input, request: budgetedRequest, executionPolicy });
    if (hash(prepared.roleInput) !== hash(roleInput) || value.sourceContextHash !== input.frozenSources.hash
      || hash(value.output) !== hash(candidate.providerValue)) fail('FACTION_STRUCTURED_REPLAY_TEACH_CONTEXT_DRIFT');
    validateTutorLessonV3(value.output);
  } else if (value.sourceDelivery === 'proof_carrying_whole_section_review_capsule') {
    const w = request.workspace;
    const nativeSlots = contract.contractHash === STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V6.contractHash;
    const recoveredSlots = value.hostMaterializationReceipt?.version === 'faction_review_explicit_slot_recovery_v1';
    if (nativeSlots || recoveredSlots || value.reviewSlotNamespaceBindingHash) {
      if (!(nativeSlots || recoveredSlots) || nativeSlots && recoveredSlots
        || !recipe.reviewSlotNamespaceBinding
        || verifySeal(recipe.reviewSlotNamespaceBinding).hash !== FACTION_REVIEW_SLOT_NAMESPACE_BINDING_V1.hash
        || value.reviewSlotNamespaceBindingHash !== FACTION_REVIEW_SLOT_NAMESPACE_BINDING_V1.hash)
        fail('FACTION_REVIEW_SLOT_NAMESPACE_CONSUMER_BINDING_REQUIRED');
    }
    const route = /\.review-target-batch-v1\.(supportive|adversarial)\./u.exec(request.roleId)?.[1];
    let capsule = (nativeSlots ? createFactionSlotReviewContextV1 : createFactionReviewContextCapsuleV1)({ factionInput: input,
      section: w.section, draft: w.draft, reviewIndices: w.reviewIndices,
      coverageRequiredSourceRefs: w.coverageRequiredSourceRefs,
      targets: w.outputRequestAtEnd.targetContract, roleRef: roleInput.roleRef,
      outputContractRef: roleInput.outputContractRef, route,
      includeSharedScenarioSources: value.sharedScenarioSourcesIncluded === true });
    if (capsule.hash !== value.initialContextCapsuleHash) fail('FACTION_STRUCTURED_REPLAY_SOURCE_CONTEXT_DRIFT');
    let expansionMapping = null;
    const baseMapping = { input, section: w.section, draft: w.draft, reviewIndices: w.reviewIndices,
      requiredSourceRefs: w.coverageRequiredSourceRefs, targets: w.outputRequestAtEnd.targetContract };
    const parsedRecords = new Map((value.parsedWireRecoveries || []).map(r => [r.originalContextHash, r]));
    const parsedMappings = new Map(), parsedPhasesConsumed = new Set();
    const parsedValuesConsumed = new Set();
    const softLimitValuesConsumed = new Set();
    function verifyParsedValuePhase(base, phase, output) {
      if (!phase.parsedReviewValueRef) return;
      const record = parsedValues.find(r => r.hash === phase.parsedReviewValueRef.hash);
      if (!record || record.originalContextHash !== base.hash || phase.structuredCandidateRef
        || phase.structuredRuntimeReceiptRef || hash(record.loop) !== hash(phase.loop)
        || hash(record.loop.final) !== hash(output)) fail('FACTION_PARSED_REVIEW_VALUE_PHASE_DRIFT');
      const authenticated = resolveParsedWireRecoveryAuthentication(value, base.hash);
      const verified = record.version === FACTION_PARSED_REVIEW_VALUE_BINDING_V1.version
        ? verifyFactionParsedReviewValueRecordV1({ record, capsule: base,
          authenticated, dshBindingHash: recipe.dshBindingHash })
        : verifyFactionParsedReviewValueRecordV2({ record, capsule: base,
          authenticated, dshBindingHash: recipe.dshBindingHash });
      parsedValuesConsumed.add(record.hash); additionalReceiptHashes.push(...verified.providerReceiptHashes);
    }
    function verifySoftLimitPhase(base, phase, output,
      sourceContextExpansion = null) {
      if (!phase.reviewSoftLimitValueRef) return;
      const record = softLimitValues.find(r =>
        r.hash === phase.reviewSoftLimitValueRef.hash);
      if (!record || record.originalContextHash !== base.hash
        || phase.parsedReviewValueRef || phase.structuredCandidateRef
        || phase.structuredRuntimeReceiptRef
        || hash(record.loop) !== hash(phase.loop)
        || hash(record.loop.final) !== hash(output)
        || !resolveStructuredSchemaFailureEvidence)
        fail('FACTION_REVIEW_SOFT_LIMIT_PHASE_DRIFT');
      const evidence = resolveStructuredSchemaFailureEvidence(
        record.rejectedCandidateRef.hash);
      const failureReceipt = verifySeal(JSON.parse(evidence.attempt.response)).value;
      const nativeFailureProof = verifyFactionNativeSlotSchemaFailureV1({
        ...baseMapping, capsule: base, sourceContextExpansion,
        nativeReviewAmbiguousReplacement:
          phase.nativeReviewAmbiguousReplacement
          || value.nativeReviewAmbiguousReplacement || null,
        evidence: { ...evidence,
          capability: resolveCapabilityReceipt?.(
            failureReceipt.capabilityReceiptHash) } });
      const authentication = authenticateFactionReviewSoftLimitV1({
        capsule: base, evidence: { ...evidence,
          capability: resolveCapabilityReceipt?.(
            failureReceipt.capabilityReceiptHash) }, nativeFailureProof });
      const verified = verifyFactionReviewSoftLimitRecordV1({ record,
        capsule: base, providerOutput: output, authentication,
        dshBindingHash: recipe.dshBindingHash });
      softLimitValuesConsumed.add(record.hash);
      additionalReceiptHashes.push(...verified.providerReceiptHashes);
    }
    function reconstructParsedPhase(base, phase, output) {
      const record = parsedRecords.get(base.hash);
      if (!record) return null;
      if (!nativeSlots || recoveredSlots) fail('FACTION_PARSED_WIRE_SCHEMA_CONSUMER_CONTRACT_DRIFT');
      const authenticated = resolveParsedWireRecoveryAuthentication(value, base.hash);
      const verified = verifyFactionParsedWireCorrectionRecordV2({ record, capsule: base,
        authenticated, dshBindingHash: recipe.dshBindingHash,
        parsedReviewValue: parsedValues.find(r => r.hash === record.correctedParsedReviewValueRef?.hash) });
      if (hash(record.loop.final) !== hash(output) || hash(record.loop) !== hash(phase.loop)
        || (record.correctedParsedReviewValueRef
          ? record.correctedParsedReviewValueRef.hash !== phase.parsedReviewValueRef?.hash
          : record.correctedCandidateRef.hash !== phase.structuredCandidateRef?.hash
            || record.correctedRuntimeReceiptRef.hash !== phase.structuredRuntimeReceiptRef?.hash)
        || record.correction.scope.hash !== phase.schemaRepairScope?.hash
        || authenticated.originalWireIssueHash !== phase.initialStructuredIssueRef?.hash
        || phase.initialStructuredIssueRef.originalClass !== 'wire_syntax'
        || phase.initialStructuredIssueRef.parsedRecoveryProofHash !== authenticated.hash)
        fail('FACTION_PARSED_WIRE_SCHEMA_CONSUMER_PHASE_DRIFT');
      additionalReceiptHashes.push(authenticated.originalProviderReceiptHash);
      parsedMappings.set(verified.context.hash, verified.mapping); parsedPhasesConsumed.add(base.hash);
      return verified.context;
    }
    function reconstructSchemaPhase(base, phase, output, sourceContextExpansion = null) {
      const parsed = reconstructParsedPhase(base, phase, output);
      if (parsed) return parsed;
      if (!phase.schemaRepairScope) return base;
      const rejected = verifySeal(resolveArtifact(phase.schemaRepairScope.rejectedCandidateHash));
      const scope = verifyFactionStructuredReviewSchemaRepairScopeV1({ rejectedCandidate: rejected, repairedOutput: output });
      if (scope.hash !== phase.schemaRepairScope.hash || !resolveStructuredSchemaFailureEvidence)
        fail('FACTION_REVIEW_SOURCE_EXPANSION_SCHEMA_ORIGIN_REQUIRED');
      const evidence = resolveStructuredSchemaFailureEvidence(rejected.hash);
      const failureReceipt = verifySeal(JSON.parse(evidence.attempt.response)).value;
      const failureProof = verifyFactionNativeSlotSchemaFailureV1({ ...baseMapping, capsule: base,
        sourceContextExpansion, evidence: { ...evidence,
          capability: resolveCapabilityReceipt?.(failureReceipt.capabilityReceiptHash) } });
      if (evidence.rejected.hash !== rejected.hash || evidence.issue.hash !== phase.initialStructuredIssueRef?.hash)
        fail('FACTION_REVIEW_SOURCE_EXPANSION_SCHEMA_ORIGIN_DRIFT');
      additionalReceiptHashes.push(failureProof.providerReceiptHash);
      const id = base.roleRef.id + '.schema-repair.1';
      return createFactionReviewSchemaRepairContextCapsuleV1({ capsule: base, rejectedCandidate: rejected,
        roleRef: { id, version: 'structured-review-v1', hash: hash(id + '.structured-review-v1') } });
    }
    if (value.sourceContextExpansion) {
      const expansion = verifySeal(value.sourceContextExpansion);
      if (!nativeSlots || recoveredSlots || expansion.bindingHash !== FACTION_REVIEW_SOURCE_EXPANSION_BINDING_V1.hash
        || !recipe.reviewSourceExpansionBinding
        || verifySeal(recipe.reviewSourceExpansionBinding).hash !== expansion.bindingHash
        || expansion.originalReviewAccepted !== false || expansion.freshWholeBatchReviewRequired !== true
        || expansion.trainingTruth !== false || !resolveStructuredSuccessEvidence)
        fail('FACTION_REVIEW_SOURCE_EXPANSION_CONSUMER_BINDING_REQUIRED');
      const trigger = expansion.trigger;
      let triggerOutput;
      if (trigger.fieldValueSourceHandoff) {
        if (recipe.fieldValueSourceBinding?.hash !== FACTION_FIELD_VALUE_SOURCE_HANDOFF_BINDING_V1.hash
          || !resolveFieldValueSourceHandoff || trigger.contextCapsuleHash !== capsule.hash
          || value.semanticAcceptance !== false || value.runtimeAccepted === true || value.trainingTruth !== false)
          fail('FACTION_FIELD_SOURCE_CONSUMER_BINDING_REQUIRED');
        const prepared = { fullRoleId: value.roleId, capsule, roleInput, mapping: { ...baseMapping, input } };
        const handoff = verifyFactionFieldValueSourceHandoffV1({ handoff: trigger.fieldValueSourceHandoff,
          readAuthenticated: () => resolveFieldValueSourceHandoff({ value, prepared }) });
        if (handoff.roleInputHash !== hash(roleInput) || handoff.fullRoleId !== value.roleId
          || handoff.originalContextHash !== capsule.hash) fail('FACTION_FIELD_SOURCE_CONSUMER_CONTEXT_DRIFT');
        triggerOutput = handoff.completion.value;
        additionalReceiptHashes.push(...handoff.providerReceiptHashes);
      } else if (trigger.parsedReviewValueRef) {
        const triggerCapsule = reconstructSchemaPhase(capsule, trigger, trigger.loop.final);
        verifyParsedValuePhase(triggerCapsule, trigger, trigger.loop.final);
        const triggerParsed = parsedValues.find(r => r.hash === trigger.parsedReviewValueRef.hash);
        if (trigger.contextCapsuleHash !== triggerCapsule.hash) fail('FACTION_PARSED_REVIEW_VALUE_TRIGGER_CONTEXT_DRIFT');
        let code = null;
        try { materializeFactionSlotReviewV1({ ...baseMapping, capsule: triggerCapsule,
          providerOutput: trigger.loop.final, reviewReasonMaximum: 16384, reviewSourceMaximum: 128,
          narrativeCapacityRecord: triggerParsed?.version === FACTION_PARSED_REVIEW_VALUE_BINDING_V2.version
            ? triggerParsed : null }); }
        catch (error) { code = error.code; }
        if (code !== 'FACTION_STRUCTURED_REVIEW_SOURCE_SLOT_INVALID') fail('FACTION_REVIEW_SOURCE_EXPANSION_TRIGGER_NOT_REJECTED');
        triggerOutput = trigger.loop.final;
      } else if (trigger.reviewSoftLimitValueRef) {
        const triggerCapsule = reconstructSchemaPhase(capsule, trigger,
          trigger.loop.final);
        verifySoftLimitPhase(triggerCapsule, trigger, trigger.loop.final);
        const triggerSoft = softLimitValues.find(r =>
          r.hash === trigger.reviewSoftLimitValueRef.hash);
        let code = null;
        try { materializeFactionSlotReviewV1({ ...baseMapping,
          capsule: triggerCapsule, providerOutput: trigger.loop.final,
          structuralJsonSchemaRepair:
            parsedMappings.get(triggerCapsule.hash) || null,
          reviewReasonMaximum: null, reviewSourceMaximum: 128,
          narrativeCapacityRecord: triggerSoft }); }
        catch (error) { code = error.code; }
        if (code !== 'FACTION_STRUCTURED_REVIEW_SOURCE_SLOT_INVALID')
          fail('FACTION_REVIEW_SOURCE_EXPANSION_TRIGGER_NOT_REJECTED');
        triggerOutput = trigger.loop.final;
      } else {
      const triggerCandidate = verifySeal(resolveArtifact(trigger.structuredCandidateRef?.hash));
      const triggerReceipt = verifySeal(resolveArtifact(trigger.structuredRuntimeReceiptRef?.hash));
      const triggerOwner = resolveResponse(triggerCandidate.providerReceiptHash);
      if (!triggerOwner?.originRunId || !triggerOwner.originRecipe)
        fail('FACTION_REVIEW_SOURCE_EXPANSION_TRIGGER_OWNER_REQUIRED');
      const triggerCapsule = reconstructSchemaPhase(capsule, trigger, triggerCandidate.providerValue);
      if (trigger.contextCapsuleHash !== triggerCapsule.hash)
        fail('FACTION_REVIEW_SOURCE_EXPANSION_TRIGGER_CONTEXT_DRIFT');
      const evidence = resolveStructuredSuccessEvidence({ runId: triggerOwner.originRunId, attemptId: triggerReceipt.attemptId });
      const paid = verifyFactionNativeSlotPaidV1({ ...baseMapping, capsule: triggerCapsule,
        structuralJsonSchemaRepair: parsedMappings.get(triggerCapsule.hash) || null,
        providerOutput: triggerCandidate.providerValue, evidence: { ...evidence,
          ownerRecipe: triggerOwner.originRecipe,
          capability: resolveCapabilityReceipt?.(triggerOwner.response.usageReceipt.capabilityReceiptHash) } });
      if (paid.candidateHash !== triggerCandidate.hash || paid.runtimeReceiptHash !== triggerReceipt.hash)
        fail('FACTION_REVIEW_SOURCE_EXPANSION_TRIGGER_RECEIPT_DRIFT');
      verifyStructuredLoop(trigger.loop, triggerCandidate, triggerReceipt, recipe.dshBindingHash);
      additionalReceiptHashes.push(paid.receiptHash);
      // Reproduce the original Host rejection before supplying the missing
      // body. An arbitrary accepted review may not manufacture an expansion.
      let rejectedCode = null;
      try { materializeFactionSlotReviewV1({ ...baseMapping, capsule: triggerCapsule,
        structuralJsonSchemaRepair: parsedMappings.get(triggerCapsule.hash) || null,
        providerOutput: triggerCandidate.providerValue, reviewReasonMaximum: 16384, reviewSourceMaximum: 128 }); }
      catch (error) { rejectedCode = error.code; }
      if (rejectedCode !== 'FACTION_STRUCTURED_REVIEW_SOURCE_SLOT_INVALID')
        fail('FACTION_REVIEW_SOURCE_EXPANSION_TRIGGER_NOT_REJECTED');
      triggerOutput = triggerCandidate.providerValue;
      }
      const prepared = createFactionReviewSourceExpansionV1({ input, baseCapsule: capsule,
        triggerOutput,
        narrativeCapacityProof: trigger.parsedReviewValueRef
          ? parsedValues.find(record => record.hash === trigger.parsedReviewValueRef.hash)?.capacityProof || null
          : trigger.reviewSoftLimitValueRef
            ? softLimitValues.find(record => record.hash === trigger.reviewSoftLimitValueRef.hash)?.capacityProof || null
            : null });
      if (!prepared || prepared.hash !== expansion.preparationHash)
        fail('FACTION_REVIEW_SOURCE_EXPANSION_PROOF_DRIFT');
      expansionMapping = { baseCapsule: capsule, triggerOutput,
        preparationHash: prepared.hash,
        ...((trigger.parsedReviewValueRef || trigger.reviewSoftLimitValueRef)
          ? { narrativeCapacityProof: trigger.parsedReviewValueRef
            ? parsedValues.find(record => record.hash === trigger.parsedReviewValueRef.hash)?.capacityProof || null
            : softLimitValues.find(record => record.hash === trigger.reviewSoftLimitValueRef.hash)?.capacityProof || null }
          : {}) };
      capsule = reconstructSchemaPhase(prepared.context, value, providerValue, expansionMapping);
    }
    if (nativeSlots && value.schemaRepairScope && !value.sourceContextExpansion) {
      const parsed = reconstructParsedPhase(capsule, value, providerValue);
      if (parsed) capsule = parsed;
      else {
      const rejectedCandidate = verifySeal(resolveArtifact(value.schemaRepairScope.rejectedCandidateHash));
      const verifiedScope = verifyFactionStructuredReviewSchemaRepairScopeV1({ rejectedCandidate,
        repairedOutput: providerValue });
      if (verifiedScope.hash !== value.schemaRepairScope.hash)
        fail('FACTION_REVIEW_SLOT_NAMESPACE_SCHEMA_REPAIR_DRIFT');
      const id = roleInput.roleRef.id + '.schema-repair.1';
      capsule = createFactionReviewSchemaRepairContextCapsuleV1({ capsule, rejectedCandidate,
        roleRef: { id, version: 'structured-review-v1', hash: hash(id + '.structured-review-v1') } });
      }
    }
    if (parsedPhasesConsumed.size !== parsedRecords.size) fail('FACTION_PARSED_WIRE_SCHEMA_CONSUMER_UNUSED_PHASE');
    verifyParsedValuePhase(capsule, value, providerValue);
    if (parsedValuesConsumed.size !== parsedValues.length) fail('FACTION_PARSED_REVIEW_VALUE_UNUSED_PHASE');
    verifySoftLimitPhase(capsule, value, providerValue, expansionMapping);
    if (softLimitValuesConsumed.size !== softLimitValues.length)
      fail('FACTION_REVIEW_SOFT_LIMIT_UNUSED_PHASE');
    if ((nativeSlots || recoveredSlots) && capsule.hash !== observedContextHash)
      fail('FACTION_REVIEW_SLOT_NAMESPACE_ACTIVE_CONTEXT_DRIFT');
    if (value.nativeReviewAmbiguousReplacement) {
      if (!nativeSlots || typeof resolveNativeReviewAmbiguousOrigin !== 'function'
        || recipe.ambiguousReplacementBinding?.version !== 'faction_ambiguous_replacement_v1')
        fail('FACTION_NATIVE_REVIEW_AMBIGUOUS_REPLACEMENT_CONSUMER_REQUIRED');
      const replacement = verifySeal(value.nativeReviewAmbiguousReplacement);
      verifyFactionNativeReviewAmbiguousReplacementV1({ record: replacement,
        authorizationBinding: recipe.ambiguousReplacementBinding,
        capsule, roleRef: capsule.roleRef, outputContractRef: capsule.outputContractRef,
        executionPolicyRef: { id: 'policy.faction-target-review.production',
          version: '2026.09.06.1', hash: hash(nativePolicy) },
        maxOutputUnits: nativePolicy.maxOutputUnits,
        originalEvidence: resolveNativeReviewAmbiguousOrigin(replacement),
        replacementCapability: replacement.replacementCapability });
      additionalReceiptHashes.push(replacement.grant.originalReceiptHash);
    }
    const coverageAddressBinding = coverageBindingFor(value, recipe);
    const mapping = { providerOutput: providerValue,
      capsule, input, section: w.section, draft: w.draft, reviewIndices: w.reviewIndices,
      requiredSourceRefs: w.coverageRequiredSourceRefs, targets: w.outputRequestAtEnd.targetContract,
      reviewReasonMaximum: contract.providerSchema.properties.verdicts.items.properties.reason.maxLength,
      sourceContextExpansion: expansionMapping,
      structuralJsonSchemaRepair: parsedMappings.get(capsule.hash) || null,
      narrativeCapacityRecord: finalParsed?.version === FACTION_PARSED_REVIEW_VALUE_BINDING_V2.version
        ? finalParsed : finalSoftLimit || null,
      nativeReviewAmbiguousReplacement: value.nativeReviewAmbiguousReplacement || null,
      coverageAddressBinding,
      reviewSourceMaximum: contract.providerSchema.properties.verdicts.items.properties.sourceSlots.maxItems };
    let mapped;
    if (recoveredSlots) {
      if (!value.slotRecoveryOrigin || !recipe.slotReviewRecoveryOrigins?.some(row => hash(row) === hash(value.slotRecoveryOrigin))
        || !value.completeReviewImportProof || !resolveCompleteReviewImportEvidence)
        fail('FACTION_REVIEW_SLOT_NAMESPACE_CONSUMER_ORIGIN_REQUIRED');
      const evidence = resolveCompleteReviewImportEvidence(value.completeReviewImportProof);
      if (evidence.attempt.run !== value.slotRecoveryOrigin.ownerRunId
        || evidence.attempt.id !== value.slotRecoveryOrigin.attemptId
        || value.slotRecoveryOrigin.contextHash !== capsule.hash
        || value.slotRecoveryOrigin.roleRefHash !== capsule.roleRef.hash)
        fail('FACTION_REVIEW_SLOT_NAMESPACE_CONSUMER_ORIGIN_DRIFT');
      mapped = recoverFactionExplicitSlotReviewV1({ ...mapping, evidence: { ...evidence,
        ownerRecipe: paidOwnerRecipe, capability: resolveCapabilityReceipt?.(receipt.capabilityReceiptHash) } });
    } else if (nativeSlots) {
      if (!locallyMaterialized) {
      if (!resolveStructuredSuccessEvidence || !resolved.originRunId || !resolved.originRecipe)
        fail('FACTION_REVIEW_SLOT_NAMESPACE_CONSUMER_PAID_READER_REQUIRED');
      const evidence = resolveStructuredSuccessEvidence({ runId: resolved.originRunId, attemptId: runtimeReceipt.attemptId });
      verifyFactionNativeSlotPaidV1({ ...mapping, evidence: { ...evidence,
        ownerRecipe: paidOwnerRecipe, capability: resolveCapabilityReceipt?.(receipt.capabilityReceiptHash) } });
      }
      mapped = materializeFactionSlotReviewV1(mapping);
    } else mapped = materializeFactionStructuredReviewV1(mapping);
    verifySeal(value.hostMaterializationReceipt);
    if (hash(mapped.output) !== hash(value.output)
      || (nativeSlots || recoveredSlots) && mapped.receipt.hash !== value.hostMaterializationReceipt.hash
      || hash(mapped.receipt.coverageAddressResolution || null) !== hash(value.hostMaterializationReceipt.coverageAddressResolution || null)
      || value.hostMaterializationReceipt.providerOutputHash !== hash(providerValue)
      || value.hostMaterializationReceipt.materializedOutputHash !== hash(mapped.output)
      || value.hostMaterializationReceipt.targetContractHash !== w.outputRequestAtEnd.targetContract.hash
      || value.hostMaterializationReceipt.contextCapsuleHash !== value.contextCapsuleHash
      || value.hostMaterializationReceipt.judgmentsChanged !== false) fail('FACTION_STRUCTURED_REPLAY_HOST_MAPPING_DRIFT');
  } else if (value.sourceDelivery !== 'proof_carrying_local_capsule'
    || hash(value.output) !== hash(candidate.providerValue)) fail('FACTION_STRUCTURED_REPLAY_OUTPUT_DRIFT');
  return { providerReceiptHashes: [...new Set([receiptHash, ...additionalReceiptHashes].filter(Boolean))], importedCanaryHash: null };
}
