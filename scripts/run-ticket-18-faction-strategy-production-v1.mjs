import { DatabaseSync } from 'node:sqlite';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createProductionRuntimeV3 } from '../packages/skill-production-v3/runtime.mjs';
import { createFactionWritingPlanV1, produceFactionStrategyV1, renderFactionStrategyV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { compileFactionProductionInputV1 } from '../packages/skill-production-v3/faction-production-input-v1.mjs';
import { FACTION_OBSERVED_SOURCE_REPAIR_BINDING_V1 as observedSourceRepairBinding } from '../packages/skill-production-v3/faction-observed-source-repair-v1.mjs';
import { FACTION_PROPOSER_BATCH_BINDING_V1 as proposerBatchBinding,
  FACTION_PROPOSER_BATCH_CONTRACT_V1 as proposerBatchContract } from '../packages/skill-production-v3/faction-proposer-batches-v1.mjs';
import { FACTION_PROPOSER_ENVELOPE_CAPACITY_BINDING_V2 as proposerAuxiliaryCapacityBinding } from '../packages/skill-production-v3/faction-proposer-auxiliary-capacity-v1.mjs';
import { FACTION_NATIVE_TARGET_RECONSTRUCTION_BINDING_V1 as nativeTargetReconstructionBinding } from '../packages/skill-production-v3/faction-native-target-reconstruction-v1.mjs';
import { FACTION_DRAFT_ENVELOPE_BINDING_V2 as draftEnvelopeBinding } from '../packages/skill-production-v3/faction-draft-envelope-v2.mjs';
import { FACTION_INITIAL_SOURCE_CORRECTION_BINDING_V2 as initialSourceCorrectionBinding } from '../packages/skill-production-v3/faction-initial-source-correction-v2.mjs';
import { FACTION_ZERG_UNIT_TIMING_BINDING_V1 as zergUnitTimingBinding } from '../packages/skill-evaluation/faction-zerg-unit-timing-audit-v1.mjs';
import { FACTION_EDITOR_DRAFT_ENVELOPE_BINDING_V2 as editorEnvelopeBinding } from '../packages/skill-production-v3/faction-editor-draft-envelope-v2.mjs';
import { FACTION_UNIQUE_RISK_CLAUSE_BINDING_V2 as uniqueRiskClauseBinding } from '../packages/skill-evaluation/faction-unique-risk-clause-v2.mjs';
import { readFactionPlanningOriginV1 } from '../packages/skill-production-v3/faction-planning-migration-v1.mjs';
import { createFactionObservedRosterFactsV1 } from '../packages/skill-evaluation/faction-observed-roster-facts-v1.mjs';
import { inspectFactionContinuationV1 } from '../packages/skill-production-v3/faction-continuation-v1.mjs';
import { FACTION_PARALLEL_BINDING_V1, createFactionParallelControlV1,
  bindFactionLaneRuntimeV1, runFactionLanesV1, renewFactionCapabilityV1 } from '../packages/skill-production-v3/faction-parallel-v1.mjs';
import { createFactionTeachRecoveryV1 } from '../packages/skill-production-v3/faction-teach-recovery-v1.mjs';
import { createFactionCatalogueReviewRuntimeV1 } from '../packages/skill-production-v3/faction-catalogue-review-runtime-v1.mjs';
import { createFactionSlotReviewRuntimeV1 } from '../packages/skill-production-v3/faction-slot-review-runtime-v1.mjs';
import { createFactionStructuralReviewLaneV1 } from '../packages/skill-production-v3/faction-structural-json-lane-v1.mjs';
import { loadFactionStructuralJsonScopeV1 } from '../packages/skill-production-v3/faction-structural-json-scope-v1.mjs';
import { loadFactionFieldRecoveryScopeV1 } from '../packages/skill-production-v3/faction-field-recovery-scope-v1.mjs';
import { createFactionFieldRecoveryLaneV1 } from '../packages/skill-production-v3/faction-field-recovery-lane-v1.mjs';
import { factionFieldValueRecipeV1, createFactionFieldValueCompleterV1, createFactionFieldValueCapabilityResolverV1 }
  from '../packages/skill-production-v3/faction-field-value-integration-v1.mjs';
import { createFactionParsedWireRecoveryReaderV2 } from '../packages/skill-production-v3/faction-structural-json-environment-v1.mjs';
import { factionParsedWireRecipeV2 } from '../packages/skill-production-v3/faction-parsed-wire-scope-v2.mjs';
import { observeFactionStructuredWireFailureV1 } from '../packages/skill-production-v3/faction-wire-observation-v1.mjs';
import { loadFactionSlotReviewEnvironmentV1 } from '../packages/skill-production-v3/faction-slot-review-environment-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V6 as slotReviewContract } from '../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';
import { withFactionEventLoopYieldV1 } from '../packages/skill-production-v3/faction-event-loop-fairness-v1.mjs';
import { inspectFactionFieldRepairEvidenceV1 } from '../packages/skill-evaluation/faction-field-repair-evidence-v1.mjs';
import { validateFactionFieldRepairSeedV1 } from '../packages/skill-production-v3/faction-field-repair-seed-v1.mjs';
import { inspectFactionPhaseFieldEvidenceV1 } from '../packages/skill-evaluation/faction-phase-field-evidence-v1.mjs';
import { validateFactionPhaseFieldSeedV1 } from '../packages/skill-production-v3/faction-phase-field-seed-v1.mjs';
import { isFactionBudgetEpochV1, factionBudgetEpochProgressV1 } from '../packages/skill-production-v3/faction-budget-epoch-v1.mjs';
import { createFactionBudgetExtensionV1, createFactionBudgetExtensionV2, createFactionBudgetExtensionV3,
  projectFactionCumulativeCostV1, verifyFactionCostNotificationV1 } from '../packages/skill-production-v3/faction-budget-extension-v1.mjs';
import { createFactionReviewTransactionBindingV1, createFactionReviewTransactionRuntimeV1 } from '../packages/skill-production-v3/faction-review-transaction-runtime-v1.mjs';
import { createFactionStructuredLocalEditorImportV1, createFactionStructuredLocalEditorRuntimeV1,
  deriveFactionLegacyPromptRoleIdsV1 } from '../packages/skill-production-v3/faction-structured-local-editor-runtime-v1.mjs';
import { createFactionStructuredReviewRuntimeV1,
  deriveFactionLegacyStructuredReviewRoleIdsV1 } from '../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs';
import { createFactionKnownRulePolicyV1 } from '../packages/skill-production-v3/faction-known-rule-findings-v1.mjs';
import { createFactionRosterChoiceDrillsV1 } from '../packages/skill-evaluation/faction-roster-choice-drills-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { withFactionCheckpointInventoryV1 as withCheckpointContinuation } from '../packages/skill-production-v3/faction-checkpoint-inventory-v1.mjs';
import { factionResumeReliabilityRecipeV1 } from '../packages/skill-production-v3/faction-resume-reliability-v1.mjs';
import { factionContractProjectionRecipeV1, createFactionContractProjectionResolverV1,
  createFactionContractProjectionLaneV1, withFactionContractProjectionCompleterV1 }
  from '../packages/skill-production-v3/faction-review-contract-projection-integration-v1.mjs';
import { readFactionReviewArtifactByHashV1 } from '../packages/skill-production-v3/faction-parsed-review-value-v1.mjs';
import { factionReviewSourceExpansionRecipeV1, createFactionPriorReviewAttemptReaderV1 }
  from '../packages/skill-production-v3/faction-review-source-expansion-scope-v1.mjs';
import { prepareDshLoop, runDirectLoop } from '../packages/skill-production/loops.mjs';
import { PRODUCTION_EXECUTION_POLICY_V1, withProductionExecutionPolicyV1 } from '../packages/skill-production/execution-policy-v1.mjs';
import { createProductionFailureRouterV1 } from '../packages/skill-production/production-failure-routing-v1.mjs';
import { verifyProductionReadiness } from '../packages/skill-production/recipe.mjs';
import { createFactionAccountedModelV1, inspectFactionCommandRecoveryV1 } from '../packages/skill-production-v3/faction-command-envelope-v1.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, verifySeal, hash, sha256, fail } from '../packages/skill-production/common.mjs';
import { createStarcraftTmgProviderProfileRegistryV1 } from '../packages/secure-provider-runtime/provider-profile-registry-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';
import { createStarcraftTmgProviderEgressWorkerPortV2 } from '../packages/secure-provider-runtime/provider-egress-worker-port-v2.mjs';
import { createStarcraftTmgStructuredProviderWorkerPortV1 } from '../packages/secure-provider-runtime/structured-provider-worker-port-v1.mjs';
import { priceStarcraftTmgDeepSeekV4FlashUsageV1 } from '../packages/secure-provider-runtime/provider-pricing-v1.mjs';
import { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } from '../packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';
import { STARCRAFT_TMG_FACTION_ADVICE_EDITOR_OUTPUT_CONTRACT_V1 as structuredEditorContract } from '../content/skill-generation/ticket-18-faction-advice-editor-output-contract-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V4 as structuredReviewContract } from '../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V5 as catalogueReviewContract,
  STARCRAFT_TMG_FACTION_REVIEW_CATALOGUE_BINDING_V1 as catalogueReviewBinding } from '../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { STRUCTURED_WIRE_RUNTIME_BINDING_V2 as wireRuntimeBinding } from '../packages/structured-generation/structured-generation-runtime-v2.mjs';
import { FACTION_REVIEW_DECOMPOSITION_BINDING_V1 as reviewDecompositionBinding, readFactionWireReviewFailureV1,
  prepareFactionReviewDecompositionV1 } from '../packages/skill-production-v3/faction-review-decomposition-v1.mjs';
import { createFactionReviewDecompositionRuntimeV1 } from '../packages/skill-production-v3/faction-review-decomposition-runtime-v1.mjs';
import { FACTION_REVIEW_FRAGMENT_CONTRACTS_V1 as reviewFragmentContracts } from '../content/skill-generation/ticket-18-faction-review-fragment-contracts-v1.mjs';
import { inspectFactionWireKeyHelperV2, createFactionWireRecoveryEnvironmentV2 } from '../packages/skill-production-v3/faction-wire-recovery-environment-v2.mjs';
import { verifyStarcraftTmgProviderCapabilityCurrentV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { FACTION_STRUCTURED_TEACH_BINDING_V1 as structuredTeachBinding, createFactionStructuredTeachRuntimeV1 } from '../packages/skill-production-v3/faction-structured-teach-runtime-v1.mjs';
import { FACTION_TEACH_OUTPUT_CONTRACT_V1 as structuredTeachContract } from '../content/skill-generation/ticket-18-faction-teach-output-contract-v1.mjs';
import { FACTION_REVIEW_RECOVERY_BUDGET_BINDING_V2 as reviewRecoveryBudgetBinding } from '../packages/skill-production-v3/faction-review-recovery-budget-v2.mjs';
import { FACTION_TEACH_OUTPUT_BUDGET_BINDING_V1 as teachOutputBudgetBinding,
  withFactionTeachOutputBudgetV1 } from '../packages/skill-production-v3/faction-teach-output-budget-v1.mjs';
import { FACTION_NATIVE_PRODUCTION_BINDING_V1 as nativeProductionBinding,
  FACTION_NATIVE_PRODUCTION_CONTRACTS_V1 as nativeProductionContracts,
  FACTION_NATIVE_PRODUCTION_PROBE_SAMPLES_V1 as nativeProbeSamples } from '../content/skill-generation/ticket-18-faction-native-production-contracts-v1.mjs';
import { createFactionNativeProductionRuntimeV1, usesFactionNativeProductionInputV1 } from '../packages/skill-production-v3/faction-native-production-runtime-v1.mjs';
import { FACTION_TEACH_UNCERTAINTY_RECOVERY_BINDING_V1 as teachUncertaintyRecoveryBinding,
  withFactionTeachUncertaintyRecoveryV1 } from '../packages/skill-production-v3/faction-teach-uncertainty-recovery-v1.mjs';
import { readFactionTeachFailureEvidenceV1 } from '../packages/skill-evaluation/faction-teach-failure-evidence-v1.mjs';
import { FACTION_REVIEW_FOCUS_CAPACITY_RECOVERY_BINDING_V1 as reviewFocusCapacityRecoveryBinding } from '../packages/skill-production-v3/faction-review-focus-capacity-recovery-v1.mjs';
import { FACTION_METADATA_RECOVERY_BINDING_V1 as metadataRecoveryBinding } from '../packages/skill-production-v3/faction-metadata-recovery-binding-v1.mjs';
import { FACTION_TARGET_COMPLETION_BINDING_V1 as targetCompletionBinding } from '../packages/skill-production-v3/faction-target-completion-binding-v1.mjs';
import { FACTION_NATIVE_OUTPUT_CAPACITY_BINDING_V2 as nativeOutputCapacityBinding,
  frozenFactionNativeOutputRolesV2 } from '../packages/skill-production-v3/faction-native-output-capacity-v2.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V2 as capacityProfile } from '../content/skill-generation/offline-provider-profile-v2.mjs';
import { FACTION_TARGET_ID_REVIEW_BINDING_V1 as targetIdReviewBinding } from '../packages/skill-production-v3/faction-target-id-review-binding-v1.mjs';
import { FACTION_EXPLICIT_SLOT_REVIEW_BINDING_V1 as explicitSlotReviewBinding } from '../packages/skill-production-v3/faction-explicit-slot-review-binding-v1.mjs';
import { prepareFactionWireAddressRecoveryV1 } from '../packages/skill-production-v3/faction-wire-address-recovery-v1.mjs';
import { readFactionStructuredSuccessEvidenceV1 } from '../packages/skill-evaluation/faction-structured-success-evidence-v1.mjs';
import { factionFieldSourceRecipeV1, createFactionFieldSourceReaderV1, withFactionFieldSourceCompletionV1,
  completeFactionFieldSourceContextV1 } from '../packages/skill-production-v3/faction-field-source-integration-v1.mjs';
import { factionMixedReviewRecipeV1, createFactionMixedProductionRuntimeV1 } from '../packages/skill-production-v3/faction-mixed-review-integration-v1.mjs';
import { openFactionMixedReviewEnvironmentV1, factionMixedReviewLegacyRoleIdsV1 } from '../packages/skill-production-v3/faction-mixed-review-environment-v1.mjs';
import { factionReviewDecompositionArgsV1 } from '../packages/skill-production-v3/faction-review-decomposition-continuation-v1.mjs';
import { FACTION_EXECUTION_MODEL_BINDING_V1, FACTION_EXECUTION_MODEL_FILES_V1, factionExecutionProfileV1,
  factionExecutionEgressV1, assertFactionExecutionModelNewSendV1, estimateFactionBetaUsageCnyMicrosV1 } from '../packages/skill-production-v3/faction-execution-model-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), args = process.argv.slice(2);
const requestBudgetEpoch = args.includes('--reset-faction-budget-v4');
if (requestBudgetEpoch) args.splice(args.indexOf('--reset-faction-budget-v4'), 1);
const requestBetaModel = args.at(-1) === '--model-v41-beta';
if (requestBetaModel) args.pop();
const requestBudgetExtensionV3 = args.at(-1) === '--extend-faction-budget-v3';
if (requestBudgetExtensionV3) args.pop();
const requestBudgetExtensionV2 = args.at(-1) === '--extend-faction-budget-v2';
if (requestBudgetExtensionV2) args.pop();
const requestReviewTransaction = args.at(-1) === '--review-transaction-v1';
if (requestReviewTransaction) args.pop();
if (![3, 5, 7, 8].includes(args.length) || !['--preflight', '--live'].includes(args[0]) || args[1] !== '--overall-run'
  || !/^guide-repair-[a-f0-9]{20}$/.test(args[2]) || args.length >= 5 && (args[3] !== '--continue-from' || !/^faction-v1-[a-f0-9]{20}$/.test(args[4]))
  || args.length >= 7 && !(args[5] === '--field-repair-run' && /^field-repair-[a-f0-9]{20}$/.test(args[6])
    || args[5] === '--review-recovery-run' && /^faction-v1-[a-f0-9]{20}$/.test(args[6])
    || args[5] === '--phase-repair-run' && /^phase-repair-[a-f0-9]{20}$/.test(args[6]))
  || args.length === 8 && args[7] !== '--extend-faction-budget-v1') fail('FACTION_RUN_ARGUMENTS_INVALID');
const base = path.join(root, 'build/ticket-18-faction-production-v1'), filename = path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite');
const json = async file => verifySeal(JSON.parse(await readFile(path.join(root, file), 'utf8')));
const rawJson = async file => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const executionModelReadiness = requestBetaModel
  ? await json('build/ticket-18-faction-production-v1/execution-model-readiness-v1.json') : null;
if (requestBetaModel) {
  assertFactionExecutionModelNewSendV1(FACTION_EXECUTION_MODEL_BINDING_V1);
  if (!executionModelReadiness.passed || executionModelReadiness.bindingHash !== FACTION_EXECUTION_MODEL_BINDING_V1.hash)
    fail('FACTION_EXECUTION_MODEL_NOT_READY');
  for (const row of executionModelReadiness.codeHashes)
    if (sha256(await readFile(path.join(root,row.file))) !== row.hash) fail('FACTION_EXECUTION_MODEL_READINESS_CODE_DRIFT');
}
const db = new DatabaseSync(filename, { readOnly: true });
try {
  if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (db.prepare("SELECT count(*) n FROM attempts WHERE state='intent'").get().n) fail('AMBIGUOUS_EGRESS_NO_RETRY');
} finally { db.close(); }
// Inspect actual base production and actual guide requests/answers before any
// Keychain access. Uploaded or model-authored qualification flags are not used.
console.log(JSON.stringify({ event: 'production-preparation', stage: 'overall_dependency_check', ticket: 18, slice: 174, providerCalls: 0 }));
const inspected = JSON.parse((await promisify(execFile)(process.execPath,
  [path.join(root, 'scripts/qualify-ticket-18-overall-dependency-v1.mjs'), args[2]],
  { cwd: root, timeout: 240000, maxBuffer: 64 * 1024 })).stdout.trim());
if (!inspected.offlineGenerationQualified) fail('FACTION_OVERALL_NOT_QUALIFIED');
const overallPath = 'build/ticket-18-production-v3/' + args[2] + '/';
const overallDependency = await json(overallPath + 'overall-production-dependency.json'), qualificationReceipt = await json(overallPath + 'overall-dependency-qualification.json');
if (inspected.dependencyHash !== overallDependency.hash || inspected.receiptHash !== qualificationReceipt.hash) fail('FACTION_OVERALL_RECEIPT_DRIFT');
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue);
const inputs = [];
for (const name of ['terran_armed_forces', 'zerg_swarm']) {
  const factionEvidence = await json('build/ticket-18-faction-evidence-v1/' + name + '.json');
  const input = compileFactionProductionInputV1({ catalogue, factionEvidence, overallDependency, qualificationReceipt });
  const saved = await json('build/ticket-18-faction-production-v1/' + name + '-input.json');
  if (input.hash !== saved.hash) fail('FACTION_SAVED_INPUT_DRIFT'); inputs.push(input);
}
const structuredCanaryReport = await json('build/ticket-18-structured-generation-v1/r5-live-canary-report.json');
if (!structuredCanaryReport.passed
  || !/^structured-canary-[a-f0-9]{32}$/u.test(structuredCanaryReport.runId))
  fail('FACTION_STRUCTURED_CANARY_NOT_READY');
const structuredCanaryBase = 'build/ticket-18-structured-generation-v1/' + structuredCanaryReport.runId + '/';
const [structuredCanaryRecipe, structuredCanaryCapsule,
  structuredCanaryHost, structuredCanaryRaw, structuredCapabilityReceipt,
  structuredGenerationReadiness] = await Promise.all([
  json(structuredCanaryBase + 'recipe.json'),
  json(structuredCanaryBase + 'context-capsule.json'),
  json(structuredCanaryBase + 'host-materialization.json'),
  rawJson(structuredCanaryBase + 'raw-structured-advice.json'),
  rawJson(structuredCanaryBase + 'capability-receipt.json'),
  json('build/ticket-18-structured-generation-v1/r6-structured-local-editor-runtime-readiness.json'),
]);
const structuredEditorImport = createFactionStructuredLocalEditorImportV1({
  recipeRunId: structuredCanaryReport.runId,
  recipe: structuredCanaryRecipe,
  report: structuredCanaryReport,
  capsule: structuredCanaryCapsule,
  hostMaterialization: structuredCanaryHost,
  rawAdvice: structuredCanaryRaw,
  outputContract: structuredEditorContract,
});
if (!structuredGenerationReadiness.passed
  || structuredGenerationReadiness.actualImportHash !== structuredEditorImport.hash)
  fail('FACTION_STRUCTURED_GENERATION_READINESS_DRIFT');
const reviewFocusNormalizationReadiness = await json(
  'build/ticket-18-faction-production-v1/review-focus-normalization-readiness.json');
if (!reviewFocusNormalizationReadiness.passed
  || reviewFocusNormalizationReadiness.providerCalls !== 0) {
  fail('FACTION_REVIEW_FOCUS_NORMALIZATION_READINESS_DRIFT');
}
for (const row of reviewFocusNormalizationReadiness.codeHashes) {
  if (sha256(await readFile(path.join(root, row.file))) !== row.hash) {
    fail('FACTION_REVIEW_FOCUS_NORMALIZATION_CODE_DRIFT');
  }
}
const structuredGenerationBinding = seal({
  version: 'faction_structured_generation_binding_v1',
  canaryRunId: structuredCanaryReport.runId,
  canaryReportHash: structuredCanaryReport.hash,
  capabilityReceiptHash: structuredCapabilityReceipt.receiptHash,
  outputContractRef: structuredEditorImport.outputContractRef,
  contextCapsuleHash: structuredEditorImport.contextCapsuleHash,
  importHash: structuredEditorImport.hash,
  localEditorProviderPath: 'responses_json_schema_only',
  legacyWireSyntaxRetryAllowedForNewCalls: false,
  semanticAcceptanceInherited: false,
  trainingTruth: false,
});
const structuredProviderRegistry = createStarcraftTmgProviderProfileRegistryV2({
  entries: [{ providerProfile: profile, responsePath: '/responses' }],
  allowedProviders: ['deepseek-openai-compatible-direct'],
});
const structuredEgressBinding = structuredProviderRegistry.resolveEgressBinding({
  profileRef: { id: profile.providerProfileId, version: profile.version,
    hash: profile.integrity.hash },
}).egressBinding;
const capacityProviderRegistry = createStarcraftTmgProviderProfileRegistryV2({
  entries: [{ providerProfile: capacityProfile, responsePath: '/responses' }],
  allowedProviders: ['deepseek-openai-compatible-direct'],
});
const capacityEgressBinding = capacityProviderRegistry.resolveEgressBinding({ profileRef: nativeOutputCapacityBinding.profileRef }).egressBinding;
const structuredCapabilityCurrent = verifyStarcraftTmgProviderCapabilityCurrentV1({
  receipt: structuredCapabilityReceipt,
  providerProfileRef: structuredEgressBinding.providerProfileRef,
  endpointPath: structuredEgressBinding.endpoint.path,
  endpointDialect: structuredEgressBinding.endpointDialect,
  model: structuredEgressBinding.model,
  capability: 'responses_json_schema',
  outputContractRef: structuredEditorImport.outputContractRef,
  now: new Date().toISOString(),
});
if (!structuredCapabilityCurrent.ok) {
  if (structuredCapabilityCurrent.reasons.some(reason => reason !== 'capability_receipt_expired')) fail('FACTION_STRUCTURED_CAPABILITY_NOT_CURRENT');
  console.log(JSON.stringify({ event: 'capability-renewal-required', kind: 'editor' }));
}
const structuredReviewCapabilityReport = await json(
  'build/ticket-18-structured-generation-v1/r6-structured-review-capability-report.json');
if (!structuredReviewCapabilityReport.passed
  || structuredReviewCapabilityReport.paidCallsThisExecution !== 1
  || structuredReviewCapabilityReport.automaticRetries !== 0) {
  fail('FACTION_STRUCTURED_REVIEW_CAPABILITY_NOT_READY');
}
const structuredReviewCapabilityBase = 'build/ticket-18-structured-generation-v1/'
  + structuredReviewCapabilityReport.runId + '/';
const structuredReviewCapabilityReceipt = await rawJson(
  structuredReviewCapabilityBase + 'capability-receipt.json');
const structuredReviewReadiness = await json(
  'build/ticket-18-structured-generation-v1/r6-structured-review-runtime-readiness.json');
if (!structuredReviewReadiness.passed
  || structuredReviewReadiness.actualCapabilityReportHash
    !== structuredReviewCapabilityReport.hash
  || structuredReviewReadiness.actualCapabilityReceiptHash
    !== structuredReviewCapabilityReceipt.receiptHash) {
  fail('FACTION_STRUCTURED_REVIEW_READINESS_DRIFT');
}
for (const row of structuredReviewReadiness.codeHashes) {
  if (sha256(await readFile(path.join(root, row.file))) !== row.hash) {
    fail('FACTION_STRUCTURED_REVIEW_CODE_DRIFT');
  }
}
const structuredReviewBinding = seal({
  version: 'faction_structured_review_binding_v1',
  capabilityRunId: structuredReviewCapabilityReport.runId,
  capabilityReportHash: structuredReviewCapabilityReport.hash,
  capabilityReceiptHash: structuredReviewCapabilityReceipt.receiptHash,
  outputContractRef: structuredReviewReadiness.outputContractRef,
  providerPath: 'responses_json_schema_only',
  modelAuthoredIdentityFields: false,
  semanticAcceptanceInherited: false,
  trainingTruth: false,
});
const structuredReviewValidationBinding = seal({
  version: 'faction_review_validation_binding_v1',
  outputContractRef: structuredReviewBinding.outputContractRef,
  reviewReasonMaximum: Math.max(
    structuredReviewContract.providerSchema.properties.verdicts.items
      .properties.reason.maxLength,
    structuredReviewContract.providerSchema.properties.coverage.items
      .properties.reason.maxLength),
  legacyReasonMaximum: 1200,
  trainingTruth: false,
});
const structuredReviewCapabilityCurrent =
  verifyStarcraftTmgProviderCapabilityCurrentV1({
    receipt: structuredReviewCapabilityReceipt,
    providerProfileRef: structuredEgressBinding.providerProfileRef,
    endpointPath: structuredEgressBinding.endpoint.path,
    endpointDialect: structuredEgressBinding.endpointDialect,
    model: structuredEgressBinding.model,
    capability: 'responses_json_schema',
    outputContractRef: structuredReviewBinding.outputContractRef,
    now: new Date().toISOString(),
  });
if (!structuredReviewCapabilityCurrent.ok) {
  if (structuredReviewCapabilityCurrent.reasons.some(reason => reason !== 'capability_receipt_expired')) fail('FACTION_STRUCTURED_REVIEW_CAPABILITY_NOT_CURRENT');
  console.log(JSON.stringify({ event: 'capability-renewal-required', kind: 'review' }));
}
const priceStructuredUsage = (usage, receipt = {}) => {
  if (requestBetaModel) return estimateFactionBetaUsageCnyMicrosV1(usage);
  try {
    const priced = priceStarcraftTmgDeepSeekV4FlashUsageV1({
      providerId: 'deepseek-openai-compatible-direct',
      requestedModel: receipt.requestedModel || profile.model,
      reportedModel: receipt.reportedModel || profile.model,
      startedAt: receipt.startedAt,
      usage,
    });
    return Math.ceil(priced.calculatedCostNanoUsd * 8 / 1000);
  } catch {
    return Math.ceil((usage.inputUnits * 440 + usage.outputUnits * 1320) * 8 / 1000);
  }
};
const structuredEditorPolicy = Object.freeze({ maxOutputUnits: 2048,
  attemptEstimateMicros: 500000, attemptTokenReserve: 90000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false,
  idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false });
const structuredReviewPolicy = Object.freeze({ maxOutputUnits: 4096,
  attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false,
  idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false });
// Recompute the calibrated kernel finding, never trust a saved model verdict or
// a readiness flag as rule truth. Only the already-known diagnostic is exposed.
const { dataset } = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
const observedRosterFacts = inputs.map(input => createFactionObservedRosterFactsV1({ input, dataset }));
const drills = await createFactionRosterChoiceDrillsV1({ catalogue, dataset });
const knownRulePolicies = inputs.map(input => createFactionKnownRulePolicyV1({ input, drills }));
const unitRoleRepairGates = await Promise.all(['unit-role-field-repair-readiness', 'unit-role-repair-workflow-readiness', 'unit-role-field-dsh-readiness']
  .map(name => json('build/ticket-18-faction-production-v1/' + name + '.json')));
for (const gate of unitRoleRepairGates) {
  if (!gate.passed || gate.inputHash !== inputs[0].hash) fail('FACTION_UNIT_REPAIR_READINESS_FAILED');
  for (const r of gate.codeHashes) if (sha256(await readFile(path.join(root, r.file))) !== r.hash) fail('FACTION_UNIT_REPAIR_READINESS_CODE_DRIFT');
}
const parentRecipe = args[4] ? await json('build/ticket-18-faction-production-v1/' + args[4] + '/recipe.json') : null;
if (!parentRecipe) fail('FACTION_SOURCE_CORRECTION_PARENT_REQUIRED');
let nativeOutputCapacityFrozenRoleIds = parentRecipe.nativeOutputCapacityFrozenRoleIds;
if (!parentRecipe.nativeOutputCapacityBinding) {
  const cutoverDb = new DatabaseSync(filename, { readOnly: true });
  try {
    nativeOutputCapacityFrozenRoleIds = frozenFactionNativeOutputRolesV2(cutoverDb.prepare(
      "SELECT id,artifact FROM steps WHERE run=? AND state='complete'").all(args[4])
      .map(row => ({ id: row.id, artifact: verifySeal(JSON.parse(row.artifact)).value })));
  } finally { cutoverDb.close(); }
}
const budgetExtension = requestBudgetEpoch
  ? await json('build/ticket-18-faction-production-v1/budget-epoch-2026-09-09-reset-v1.json')
  : requestBudgetExtensionV3 ? createFactionBudgetExtensionV3(parentRecipe) : requestBudgetExtensionV2
  ? createFactionBudgetExtensionV2(parentRecipe)
  : args[7] ? createFactionBudgetExtensionV1(parentRecipe)
    : parentRecipe.budgetExtension || null;
const budgetReadiness = budgetExtension ? await json('build/ticket-18-faction-production-v1/budget-extension-readiness.json') : null;
if (budgetReadiness) {
  if (!budgetReadiness.passed || budgetReadiness.providerCalls !== 0) fail('FACTION_BUDGET_READINESS_INVALID');
  for (const row of budgetReadiness.codeHashes) if (sha256(await readFile(path.join(root, row.file))) !== row.hash)
    fail('FACTION_BUDGET_READINESS_CODE_DRIFT');
}
const recoveryParentRunId = parentRecipe.commandRecoveryBinding?.parentRunId || args[4];
const recoveryParent = recoveryParentRunId === args[4] ? parentRecipe : await json('build/ticket-18-faction-production-v1/' + recoveryParentRunId + '/recipe.json');
const commandRecovery = inspectFactionCommandRecoveryV1({ filename, parentRunId: recoveryParentRunId, parent: recoveryParent });
const teachRecoveryReadiness = await json('build/ticket-18-faction-production-v1/teach-recovery-readiness.json');
const catalogueReviewReadiness = await json('build/ticket-18-faction-production-v1/catalogue-review-readiness.json');
const slotReviewRuntimeProof = await json('build/ticket-18-faction-production-v1/slot-review-dsh-runtime-v1.json');
const slotReviewReadiness = await json('build/ticket-18-faction-production-v1/slot-review-readiness-v1.json');
if (!slotReviewReadiness.passed || slotReviewReadiness.runtimeProofHash !== slotReviewRuntimeProof.hash)
  fail('FACTION_SLOT_REVIEW_READINESS_INVALID');
for (const row of [...slotReviewRuntimeProof.codeHashes, ...slotReviewReadiness.codeHashes])
  if (sha256(await readFile(path.join(root, row.file))) !== row.hash) fail('FACTION_SLOT_REVIEW_READINESS_CODE_DRIFT');
const slotReviewEnvironment = await loadFactionSlotReviewEnvironmentV1({ root, filename, parentRunId: args[4], readiness: slotReviewRuntimeProof });
const fieldRecoveryReadiness = await json('build/ticket-18-faction-production-v1/field-recovery-readiness-v1.json');
for (const row of fieldRecoveryReadiness.codeHashes)
  if (sha256(await readFile(path.join(root, row.file))) !== row.hash) fail('FACTION_FIELD_RECOVERY_CODE_DRIFT');
const fieldRecoveryScope = await loadFactionFieldRecoveryScopeV1({ root, filename, parentRunId: args[4],
  lineage: slotReviewEnvironment.lineage, readiness: fieldRecoveryReadiness });
const fieldValueReadiness = await json('build/ticket-18-faction-production-v1/field-value-readiness-v1.json');
for (const row of fieldValueReadiness.codeHashes)
  if (sha256(await readFile(path.join(root, row.file))) !== row.hash) fail('FACTION_FIELD_VALUE_CODE_DRIFT');
const fieldValueRecipe = factionFieldValueRecipeV1(fieldValueReadiness);
const fieldSourceReadiness = await json('build/ticket-18-faction-production-v1/field-source-readiness-v1.json');
for (const row of fieldSourceReadiness.codeHashes)
  if (sha256(await readFile(path.join(root, row.file))) !== row.hash) fail('FACTION_FIELD_SOURCE_CODE_DRIFT');
const fieldSourceRecipe = factionFieldSourceRecipeV1(fieldSourceReadiness);
const mixedReviewReadiness = await json('build/ticket-18-faction-production-v1/mixed-review-readiness-v1.json');
for (const row of mixedReviewReadiness.codeHashes)
  if (sha256(await readFile(path.join(root, row.file))) !== row.hash) fail('FACTION_MIXED_REVIEW_CODE_DRIFT');
const mixedReviewRecipe = factionMixedReviewRecipeV1(mixedReviewReadiness);
const resumeReadiness = await json('build/ticket-18-faction-production-v1/resume-reliability-readiness-v1.json');
for (const row of resumeReadiness.codeHashes)
  if (sha256(await readFile(path.join(root, row.file))) !== row.hash) fail('FACTION_RESUME_RELIABILITY_CODE_DRIFT');
const resumeRecipe = factionResumeReliabilityRecipeV1(resumeReadiness);
const contractProjectionReadiness = await json('build/ticket-18-faction-production-v1/contract-projection-readiness-v1.json');
for (const row of contractProjectionReadiness.codeHashes)
  if (sha256(await readFile(path.join(root, row.file))) !== row.hash) fail('FACTION_CONTRACT_PROJECTION_CODE_DRIFT');
const contractProjectionRecipe = factionContractProjectionRecipeV1(contractProjectionReadiness);
const structuralJsonReadiness = await json('build/ticket-18-faction-production-v1/structural-json-readiness-v1.json');
for (const row of structuralJsonReadiness.codeHashes)
  if (sha256(await readFile(path.join(root, row.file))) !== row.hash) fail('FACTION_STRUCTURAL_JSON_READINESS_CODE_DRIFT');
const structuralJsonScope = await loadFactionStructuralJsonScopeV1({ root, filename, parentRunId: args[4],
  lineage: slotReviewEnvironment.lineage, readiness: structuralJsonReadiness });
const sourceExpansionReadiness = await json('build/ticket-18-faction-production-v1/source-expansion-readiness-v1.json');
const sourceExpansionRecipeFields = factionReviewSourceExpansionRecipeV1(sourceExpansionReadiness);
for (const row of sourceExpansionReadiness.codeHashes)
  if (sha256(await readFile(path.join(root, row.file))) !== row.hash) fail('FACTION_REVIEW_SOURCE_EXPANSION_READINESS_CODE_DRIFT');
const parsedWireReadiness = await json('build/ticket-18-faction-production-v1/parsed-wire-schema-readiness-v2.json');
const parsedWireDshProof = await json('build/ticket-18-faction-production-v1/parsed-wire-dsh-runtime-v2.json');
const parsedWireRecipeFields = factionParsedWireRecipeV2(parsedWireReadiness);
if (!parsedWireDshProof.passed || parsedWireDshProof.actualDshSessions < 1 || parsedWireDshProof.providerCalls !== 0
  || parsedWireReadiness.runtimeDshProofHash !== parsedWireDshProof.hash) fail('FACTION_PARSED_WIRE_SCHEMA_DSH_PROOF_REQUIRED');
for (const row of [...parsedWireReadiness.codeHashes, ...parsedWireDshProof.codeHashes])
  if (sha256(await readFile(path.join(root, row.file))) !== row.hash) fail('FACTION_PARSED_WIRE_SCHEMA_READINESS_CODE_DRIFT');
const readPriorReviewAttempt = await createFactionPriorReviewAttemptReaderV1({ root, filename,
  lineage: slotReviewEnvironment.lineage });
const fairnessReadiness = await json('build/ticket-18-faction-production-v1/event-loop-fairness-readiness.json');
const structuredTeachReadiness = await json('build/ticket-18-faction-production-v1/structured-teach-readiness.json');
const reviewRecoveryBudgetReadiness = await json('build/ticket-18-faction-production-v1/review-recovery-budget-readiness.json');
const teachOutputBudgetReadiness = await json('build/ticket-18-faction-production-v1/teach-output-budget-readiness.json');
const nativeProductionReadiness = await json('build/ticket-18-faction-production-v1/native-production-readiness.json');
const teachUncertaintyReadiness = await json('build/ticket-18-faction-production-v1/teach-uncertainty-recovery-readiness.json');
const reviewFocusCapacityReadiness = await json('build/ticket-18-faction-production-v1/review-focus-capacity-readiness.json');
const metadataRecoveryReadiness = await json('build/ticket-18-faction-production-v1/metadata-recovery-readiness.json');
const targetCompletionReadiness = await json('build/ticket-18-faction-production-v1/target-completion-readiness.json');
const nativeOutputCapacityReadiness = await json('build/ticket-18-faction-production-v1/native-output-capacity-readiness.json');
const targetIdReviewReadiness = await json('build/ticket-18-faction-production-v1/target-id-review-readiness.json');
const explicitSlotReviewReadiness = await json('build/ticket-18-faction-production-v1/explicit-slot-review-readiness-v1.json');
const wireRuntimeReadiness = await json('build/ticket-18-faction-production-v1/wire-runtime-readiness-v2.json');
const reviewDecompositionReadiness = await json('build/ticket-18-faction-production-v1/review-decomposition-readiness-v1.json');
const reviewDecompositionDiagnosis = await json('build/ticket-18-faction-production-v1/terran-wire-context-diagnosis-v2.json');
if (reviewDecompositionReadiness.diagnosisHash !== reviewDecompositionDiagnosis.hash
  || reviewDecompositionReadiness.binding.hash !== reviewDecompositionBinding.hash) fail('FACTION_REVIEW_DECOMPOSITION_READINESS_DRIFT');
const reviewDecompositionEvidence = readFactionWireReviewFailureV1({ filename,
  runId: reviewDecompositionDiagnosis.originRunId, attemptId: reviewDecompositionDiagnosis.originAttemptId,
  capsule: reviewDecompositionDiagnosis.capsule, invocation: reviewDecompositionDiagnosis.invocation,
  providerRequest: reviewDecompositionDiagnosis.providerRequest });
const reviewDecompositionOrigins = [{ inputHash: reviewDecompositionDiagnosis.inputHash,
  runId: reviewDecompositionEvidence.runId, attemptId: reviewDecompositionEvidence.attemptId,
  evidenceHash: reviewDecompositionEvidence.hash, contextHash: reviewDecompositionEvidence.originalContextHash }];
const wireKeyHelperRef = await inspectFactionWireKeyHelperV2();
if (wireRuntimeReadiness.helperRef.hash !== wireKeyHelperRef.hash) fail('FACTION_WIRE_KEY_HELPER_READINESS_DRIFT');
const wireAddressRecoveryReadiness = await json('build/ticket-18-faction-production-v1/wire-address-recovery-readiness-v1.json');
const actualResumeDiagnosis = await json('build/ticket-18-faction-production-v1/faction-v1-6d345a142fa24636bab7/actual-resume-diagnosis-7fb9531534ff84cd30f0.json');
const wireAddressRecovery = await prepareFactionWireAddressRecoveryV1({ filename, inputs, reviewDiagnosis: reviewDecompositionDiagnosis,
  actualDiagnosis: actualResumeDiagnosis, egressBinding: structuredEgressBinding, helperRef: wireKeyHelperRef });
if (!wireAddressRecoveryReadiness.passed || wireAddressRecoveryReadiness.providerCalls !== 0
  || wireAddressRecoveryReadiness.recipeFieldsHash !== hash(wireAddressRecovery.recipeFields))
  fail('FACTION_WIRE_ADDRESS_READINESS_INVALID');
for (const row of wireAddressRecoveryReadiness.codeHashes)
  if (sha256(await readFile(path.join(root, row.file))) !== row.hash) fail('FACTION_WIRE_ADDRESS_READINESS_CODE_DRIFT');
const observedSourceRepairReadiness = await json('build/ticket-18-faction-production-v1/observed-source-repair-readiness.json');
const planningRepairReadiness = await json('build/ticket-18-faction-production-v1/planning-repair-readiness.json');
const proposerAuxiliaryReadiness = await json('build/ticket-18-faction-production-v1/bounded-generation-readiness-v2.json');
const draftPolicyReadiness = await json('build/ticket-18-faction-production-v1/draft-policy-readiness-v2.json');
const zergUnitTimingReadiness = await json('build/ticket-18-faction-production-v1/zerg-unit-timing-readiness-v1.json');
const zergUnitTimingDiagnosis = await json('build/ticket-18-faction-production-v1/zerg-explicit-slot-address-diagnosis-v4.json');
if (zergUnitTimingReadiness.binding?.hash !== zergUnitTimingBinding.hash
  || !zergUnitTimingReadiness.passed || zergUnitTimingReadiness.providerCalls !== 0)
  fail('FACTION_ZERG_UNIT_READINESS_INVALID');
for (const row of zergUnitTimingReadiness.codeHashes)
  if (sha256(await readFile(path.join(root, row.file))) !== row.hash) fail('FACTION_ZERG_UNIT_READINESS_CODE_DRIFT');
const draftEnvelopeImports = draftPolicyReadiness.origins.map(row => readFactionTeachFailureEvidenceV1({ filename,
  runId: row.originRunId, attemptId: row.originAttemptId }));
const proposerBatchFrozenRoleIds = parentRecipe.proposerBatchFrozenRoleIds || readFactionPlanningOriginV1({ filename }).frozenRoleIds;
if (hash(observedSourceRepairReadiness.factsHashes) !== hash(observedRosterFacts.map(f => f.hash)))
  fail('FACTION_OBSERVED_ROSTER_FACTS_READINESS_DRIFT');
for (const gate of [teachRecoveryReadiness, catalogueReviewReadiness, fairnessReadiness, structuredTeachReadiness, reviewRecoveryBudgetReadiness, teachOutputBudgetReadiness, nativeProductionReadiness, teachUncertaintyReadiness, reviewFocusCapacityReadiness, metadataRecoveryReadiness, targetCompletionReadiness, nativeOutputCapacityReadiness, targetIdReviewReadiness, explicitSlotReviewReadiness, wireRuntimeReadiness, reviewDecompositionReadiness, observedSourceRepairReadiness, planningRepairReadiness, proposerAuxiliaryReadiness, draftPolicyReadiness]) {
  if (!gate.passed || gate.providerCalls !== 0) fail('FACTION_CAPACITY_READINESS_INVALID');
  for (const row of gate.codeHashes) if (sha256(await readFile(path.join(root, row.file))) !== row.hash) fail('FACTION_CAPACITY_READINESS_CODE_DRIFT');
}
if (catalogueReviewReadiness.binding.hash !== catalogueReviewBinding.hash) fail('FACTION_CATALOGUE_REVIEW_READINESS_DRIFT');
if (!catalogueReviewReadiness.sharedScenarioSourceFailureReproduced
  || !catalogueReviewReadiness.sharedScenarioContextRepairPassed
  || fairnessReadiness.fair.state !== 'ready' || fairnessReadiness.starved.state !== 'timeout') fail('FACTION_PARALLEL_CONTEXT_NOT_READY');
const teachRecoveryBindings = [];
const failureDb = new DatabaseSync(filename, { readOnly: true });
try {
  for (const input of inputs) {
    const prior = parentRecipe.teachRecoveryBindings?.find(row => row.inputHash === input.hash);
    const originRunId = prior?.originRunId || args[4];
    const attempt = failureDb.prepare("SELECT * FROM attempts WHERE run=? AND id=? AND state='failed' AND code='PROVIDER_RESPONSE_OUTPUT_TRUNCATED'")
      .get(originRunId, 'faction.' + input.factionRecordKey.split(':')[1] + '.tutor.call-1.format-0');
    if (!attempt) { if (prior) fail('FACTION_TEACH_RECOVERY_ORIGIN_MISSING'); continue; }
    const origin = await json('build/ticket-18-faction-production-v1/' + originRunId + '/recipe.json');
    if (!origin.inputHashes.includes(input.hash) || origin.contextHash !== context.hash
      || origin.modelHash !== profile.integrity.hash) fail('FACTION_TEACH_RECOVERY_ORIGIN_DRIFT');
    const recovered = createFactionTeachRecoveryV1({ input, runId: originRunId, attempt });
    if (prior && prior.hash !== recovered.hash) fail('FACTION_TEACH_RECOVERY_BINDING_DRIFT');
    teachRecoveryBindings.push(recovered);
  }
} finally { failureDb.close(); }
const sourceCorrectionGates = await Promise.all(['source-field-repair-v2-readiness', 'source-field-dsh-v2-readiness',
  'source-repair-workflow-v2-readiness', 'command-envelope-readiness'].map(name => json('build/ticket-18-faction-production-v1/' + name + '.json')));
for (const gate of sourceCorrectionGates) {
  if (!gate.passed || gate.inputHash !== inputs[0].hash) fail('FACTION_SOURCE_CORRECTION_READINESS_FAILED');
  for (const row of gate.codeHashes) if (sha256(await readFile(path.join(root, row.file))) !== row.hash) fail('FACTION_SOURCE_CORRECTION_READINESS_CODE_DRIFT');
}
const fieldRepairRunId = (args[5] === '--field-repair-run' ? args[6] : null) || parentRecipe?.fieldRepairBinding?.runId;
const fieldRepairSeed = fieldRepairRunId ? await inspectFactionFieldRepairEvidenceV1({ root, runId: fieldRepairRunId }) : null;
const fieldRepairBinding = fieldRepairSeed ? validateFactionFieldRepairSeedV1({ input: inputs[0], knownRulePolicy: knownRulePolicies[0], seed: fieldRepairSeed }) : null;
const main = await verifyProductionReadiness(root, catalogue);
const parallelReadiness = await json('build/ticket-18-faction-production-v1/parallel-readiness.json');
if (!parallelReadiness.passed || parallelReadiness.maximumConcurrentLanes !== 2
  || !parallelReadiness.atomicBudgetTested || !parallelReadiness.paymentStopsNewCalls
  || !parallelReadiness.actualOutlineOmissionReproduced) fail('FACTION_PARALLEL_NOT_READY');
for (const row of parallelReadiness.codeHashes) {
  if (sha256(await readFile(path.join(root, row.file))) !== row.hash) fail('FACTION_PARALLEL_CODE_DRIFT');
}
const gates = [];
for (const name of ['input-readiness', 'workflow-readiness', 'dsh-context-readiness', 'continuation-readiness', 'json-recovery-readiness', 'targeted-corrections-readiness', 'review-evidence-readiness']) {
  const gate = await json('build/ticket-18-faction-production-v1/' + name + '.json');
  if (!gate.passed) fail('FACTION_READINESS_FAILED');
  for (const r of gate.codeHashes) if (sha256(await readFile(path.join(root, r.file))) !== r.hash) fail('FACTION_READINESS_CODE_DRIFT');
  gates.push(gate);
}
if (hash(gates[1].inputHashes) !== hash(inputs.map(i => i.hash)) || hash(gates[2].inputHashes) !== hash(inputs.map(i => i.hash))
  || gates[2].contextHash !== context.hash) fail('FACTION_READINESS_INPUT_DRIFT');
if (hash(gates[5].inputHashes) !== hash(inputs.map(i => i.hash))
  || hash(gates[5].policyHashes) !== hash(knownRulePolicies.map(p => p.hash))
  || hash(gates[1].policyHashes) !== hash(knownRulePolicies.map(p => p.hash))) fail('FACTION_KNOWN_RULE_READINESS_DRIFT');
const repairConflictHistoryReadiness = gates[1].repairConflictHistoryReadiness;
verifySeal(repairConflictHistoryReadiness);
const repairConflictHistoryBinding = seal({
  version: 'faction_repair_conflict_history_binding_v1',
  minimumRepeatedNegativeRounds:
    repairConflictHistoryReadiness.minimumRepeatedNegativeRounds,
  resolutionPolicy:
    'three_round_escalation_preserve_all_findings_forbid_rejected_versions_remove_disputed_certainty_then_fresh_whole_section_review',
  trainingTruth: false,
});
let fieldRepairReadiness = null;
if (fieldRepairBinding) {
  fieldRepairReadiness = await json('build/ticket-18-faction-production-v1/field-seed-readiness.json');
  if (!fieldRepairReadiness.passed || fieldRepairReadiness.bindingHash !== fieldRepairBinding.hash) fail('FACTION_FIELD_SEED_READINESS_DRIFT');
  for (const r of fieldRepairReadiness.codeHashes) if (sha256(await readFile(path.join(root, r.file))) !== r.hash) fail('FACTION_FIELD_SEED_READINESS_CODE_DRIFT');
  gates.push(fieldRepairReadiness);
}
const additionalRecoveryRunIds = (parentRecipe.additionalCommandRecoveryBindings || []).map(binding => binding.parentRunId);
if (args[5] === '--review-recovery-run') {
  if (args[6] !== args[4] || additionalRecoveryRunIds.includes(args[6])) fail('FACTION_ADDITIONAL_COMMAND_RECOVERY_SCOPE');
  additionalRecoveryRunIds.push(args[6]);
}
const additionalRecoveries = [], additionalRecoveryGates = [];
for (const parentRunId of additionalRecoveryRunIds) {
  const parent = await json('build/ticket-18-faction-production-v1/' + parentRunId + '/recipe.json');
  const recovery = inspectFactionCommandRecoveryV1({ filename, parentRunId, parent });
  const gate = await json('build/ticket-18-faction-production-v1/' + parentRunId + '/review-metadata-recovery-readiness.json');
  if (!gate.passed || gate.recoveryManifest.hash !== recovery.manifest.hash) fail('FACTION_ADDITIONAL_COMMAND_RECOVERY_PROOF_INVALID');
  for (const row of gate.codeHashes) if (sha256(await readFile(path.join(root, row.file))) !== row.hash)
    fail('FACTION_ADDITIONAL_COMMAND_RECOVERY_CODE_DRIFT');
  additionalRecoveries.push(recovery); additionalRecoveryGates.push(gate);
}
gates.push(...additionalRecoveryGates);
const phaseRunId = (args[5] === '--phase-repair-run' ? args[6] : null) || parentRecipe?.phaseFieldBinding?.runId;
const phaseFieldSeed = phaseRunId ? await inspectFactionPhaseFieldEvidenceV1({ root, runId: phaseRunId }) : null;
const phaseFieldBinding = phaseFieldSeed ? validateFactionPhaseFieldSeedV1({ input: inputs[0], seed: phaseFieldSeed }) : null;
const phaseFieldReadiness = phaseFieldBinding ? await json('build/ticket-18-faction-production-v1/phase-field-seed-readiness.json') : null;
if (phaseFieldReadiness) {
  if (!phaseFieldReadiness.passed || phaseFieldReadiness.bindingHash !== phaseFieldBinding.hash) fail('FACTION_PHASE_SEED_READINESS_DRIFT');
  for (const row of phaseFieldReadiness.codeHashes) if (sha256(await readFile(path.join(root, row.file))) !== row.hash)
    fail('FACTION_PHASE_SEED_READINESS_CODE_DRIFT');
  gates.push(phaseFieldReadiness);
}
const useReviewTransaction = requestReviewTransaction || !!parentRecipe?.reviewTransactionBindings;
const reviewTransactionBindings = useReviewTransaction ? inputs.map((input, index) =>
  createFactionReviewTransactionBindingV1({ input, phaseFieldSeed: index === 0 ? phaseFieldSeed : null })) : null;
const reviewTransactionReadiness = useReviewTransaction ? await json('build/ticket-18-faction-production-v1/review-transaction-readiness.json') : null;
const reviewTransactionEvidence = useReviewTransaction ? await json('build/ticket-18-faction-production-v1/'
  + reviewTransactionReadiness.actualRecheckRunId + '/verified-evidence.json') : null;
if (useReviewTransaction) {
  if (!args[4] || !reviewTransactionReadiness.passed
    || hash(reviewTransactionReadiness.bindingHashes) !== hash(reviewTransactionBindings.map(b => b.hash))
    || reviewTransactionReadiness.actualRecheckEvidenceHash !== reviewTransactionEvidence.hash)
    fail('FACTION_REVIEW_TRANSACTION_READINESS_DRIFT');
  for (const row of reviewTransactionReadiness.codeHashes)
    if (sha256(await readFile(path.join(root, row.file))) !== row.hash) fail('FACTION_REVIEW_TRANSACTION_CODE_DRIFT');
  gates.push(reviewTransactionReadiness);
}
const files = ['packages/skill-production-v3/faction-strategy-workflow-v1.mjs', 'packages/skill-production-v3/faction-production-input-v1.mjs',
  'packages/skill-production-v3/faction-parallel-v1.mjs',
  'packages/skill-production-v3/faction-review-targets-v1.mjs', 'packages/skill-production-v3/faction-known-rule-findings-v1.mjs',
  'packages/skill-production-v3/faction-source-scope-adjudication-v1.mjs',
  'packages/skill-production-v3/faction-unit-role-field-repair-v1.mjs', 'packages/skill-evaluation/faction-unit-role-debt-v1.mjs',
  'packages/skill-production-v3/faction-source-field-repair-v2.mjs', 'packages/skill-evaluation/faction-cross-field-source-audit-v1.mjs',
  'packages/skill-production-v3/faction-command-envelope-v1.mjs',
  'packages/skill-evaluation/faction-roster-choice-drills-v1.mjs',
  'packages/skill-production-v3/faction-continuation-v1.mjs', 'packages/skill-production-v3/runtime.mjs',
  'packages/skill-production-v3/context.mjs', 'scripts/run-ticket-18-faction-strategy-production-v1.mjs',
  'packages/skill-production/loops.mjs', 'packages/skill-production/model.mjs', 'packages/skill-production/store.mjs',
  'packages/secure-provider-runtime/provider-response-outcome-v1.mjs', 'packages/secure-provider-runtime/provider-egress-transport-v1.mjs',
  'packages/secure-provider-runtime/provider-worker-success-classifier-v1.mjs',
  'packages/skill-production-v3/faction-local-editor-context-capsule-v1.mjs',
  'packages/skill-production-v3/faction-repair-conflict-history-v1.mjs',
  'packages/skill-production-v3/faction-structured-local-editor-runtime-v1.mjs',
  'packages/skill-production-v3/faction-prompt-lineage-v1.mjs',
  'packages/structured-generation/output-contract-registry-v1.mjs',
  'packages/structured-generation/provider-capability-receipt-v1.mjs',
  'packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs',
  'packages/structured-generation/structured-generation-runtime-v1.mjs',
  'packages/structured-generation/dsh-command-mapper-v1.mjs',
  'packages/structured-generation/context-capsule-v1.mjs',
  'packages/structured-generation/failure-classifier-v1.mjs',
  'packages/secure-provider-runtime/provider-egress-contract-v2.mjs',
  'packages/secure-provider-runtime/provider-profile-registry-v2.mjs',
  'packages/secure-provider-runtime/structured-provider-egress-transport-v1.mjs',
  'packages/secure-provider-runtime/structured-provider-worker-child-v1.mjs',
  'packages/secure-provider-runtime/structured-provider-worker-port-v1.mjs',
  'content/skill-generation/ticket-18-faction-advice-editor-output-contract-v1.mjs',
  'scripts/verify-ticket-18-faction-structured-local-editor-runtime-v1.mjs',
  'scripts/verify-ticket-18-faction-review-focus-normalization-v1.mjs',
  'content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs',
  'packages/skill-production-v3/faction-review-context-capsule-v1.mjs',
  'packages/skill-production-v3/faction-structured-review-runtime-v1.mjs',
  'scripts/run-ticket-18-structured-review-capability-canary-v1.mjs',
  'scripts/verify-ticket-18-faction-structured-review-runtime-v1.mjs'];
if (fieldRepairBinding) files.push('packages/skill-production-v3/faction-field-repair-seed-v1.mjs',
  'packages/skill-production-v3/faction-field-repair-v1.mjs', 'packages/skill-evaluation/faction-field-repair-evidence-v1.mjs',
  'packages/skill-evaluation/faction-semantic-debt-v1.mjs', 'packages/skill-evaluation/read-only-production-replay-v1.mjs');
if (phaseFieldBinding) files.push('packages/skill-production-v3/faction-phase-field-seed-v1.mjs',
  'packages/skill-production-v3/faction-phase-seed-clarification-v1.mjs', 'packages/skill-production-v3/faction-phase-field-repair-v1.mjs',
  'packages/skill-evaluation/faction-phase-field-evidence-v1.mjs', 'packages/skill-evaluation/faction-phase-source-debt-v1.mjs');
if (budgetExtension) files.push('packages/skill-production-v3/faction-budget-extension-v1.mjs',
  'packages/skill-production-v3/faction-budget-epoch-v1.mjs');
if (useReviewTransaction) files.push('packages/skill-production-v3/faction-review-transaction-runtime-v1.mjs',
  'packages/skill-production-v3/faction-review-transaction-migration-v1.mjs',
  'packages/skill-production-v3/faction-source-dependency-context-v1.mjs',
  'packages/skill-production-v3/faction-repair-regression-guard-v1.mjs');
files.push('packages/skill-production-v3/faction-teach-recovery-v1.mjs',
  'packages/skill-production-v3/faction-target-completion-binding-v1.mjs',
  'packages/skill-production-v3/faction-reasoner-answer-gap-v1.mjs',
  'packages/skill-production-v3/faction-reasoner-answer-completion-v1.mjs',
  'packages/skill-production-v3/faction-review-coverage-address-v2.mjs',
  'scripts/verify-ticket-18-faction-target-completion-v1.mjs',
  'scripts/verify-ticket-18-faction-target-completion-wiring-v1.mjs',
  'packages/skill-production-v3/faction-metadata-recovery-binding-v1.mjs',
  'packages/skill-production-v3/faction-native-reference-set-recovery-v1.mjs',
  'packages/skill-production-v3/faction-review-coverage-address-v1.mjs',
  'packages/skill-production-v3/faction-review-complete-output-import-v1.mjs',
  'packages/skill-evaluation/faction-structured-success-evidence-v1.mjs',
  'scripts/diagnose-ticket-18-faction-review-coverage-v1.mjs',
  'scripts/verify-ticket-18-faction-native-reference-set-v1.mjs',
  'scripts/verify-ticket-18-faction-metadata-recovery-wiring-v1.mjs',
  'packages/skill-production-v3/faction-review-focus-capacity-recovery-v1.mjs',
  'scripts/verify-ticket-18-faction-review-focus-capacity-v1.mjs',
  'packages/skill-production-v3/faction-teach-uncertainty-recovery-v1.mjs',
  'packages/skill-evaluation/faction-teach-failure-evidence-v1.mjs',
  'packages/skill-evaluation/faction-production-replay-v1.mjs',
  'scripts/verify-ticket-18-faction-teach-uncertainty-recovery-v1.mjs',
  'packages/skill-production-v3/faction-native-production-runtime-v1.mjs',
  'content/skill-generation/ticket-18-faction-native-production-contracts-v1.mjs',
  'scripts/verify-ticket-18-faction-native-production-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs',
  'packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs',
  'packages/skill-production-v3/faction-teach-output-budget-v1.mjs',
  'scripts/verify-ticket-18-faction-teach-output-budget-v1.mjs',
  'packages/skill-production-v3/faction-structured-teach-runtime-v1.mjs',
  'content/skill-generation/ticket-18-faction-teach-output-contract-v1.mjs',
  'scripts/verify-ticket-18-faction-structured-teach-v1.mjs',
  'packages/skill-production-v3/faction-review-recovery-budget-v2.mjs',
  'scripts/verify-ticket-18-faction-review-recovery-budget-v2.mjs',
  'packages/skill-production-v3/faction-catalogue-review-runtime-v1.mjs',
  'scripts/verify-ticket-18-faction-teach-recovery-v1.mjs',
  'scripts/verify-ticket-18-faction-catalogue-review-v1.mjs',
  'packages/skill-production-v3/faction-event-loop-fairness-v1.mjs',
  'scripts/verify-ticket-18-faction-event-loop-fairness-v1.mjs');
files.push('packages/skill-production-v3/faction-native-output-capacity-v2.mjs',
  'content/skill-generation/offline-provider-profile-v2.mjs', 'packages/skill-production-v3/faction-output-capacity-policy-v2.mjs',
  'scripts/verify-ticket-18-faction-native-output-capacity-v2.mjs', 'scripts/diagnose-ticket-18-faction-native-output-capacity-v2.mjs');
files.push('packages/skill-production-v3/faction-review-coverage-address-v3.mjs',
  'packages/skill-production-v3/faction-target-id-review-binding-v1.mjs',
  'scripts/diagnose-ticket-18-faction-target-id-address-v3.mjs', 'scripts/verify-ticket-18-faction-target-id-review-v1.mjs');
for (const row of observedSourceRepairReadiness.codeHashes) if (!files.includes(row.file)) files.push(row.file);
for (const row of planningRepairReadiness.codeHashes) if (!files.includes(row.file)) files.push(row.file);
for (const row of proposerAuxiliaryReadiness.codeHashes) if (!files.includes(row.file)) files.push(row.file);
for (const row of draftPolicyReadiness.codeHashes) if (!files.includes(row.file)) files.push(row.file);
for (const row of explicitSlotReviewReadiness.codeHashes) if (!files.includes(row.file)) files.push(row.file);
for (const row of wireRuntimeReadiness.codeHashes) if (!files.includes(row.file)) files.push(row.file);
for (const row of reviewDecompositionReadiness.codeHashes) if (!files.includes(row.file)) files.push(row.file);
for (const row of zergUnitTimingReadiness.codeHashes) if (!files.includes(row.file)) files.push(row.file);
for (const row of wireAddressRecoveryReadiness.codeHashes) if (!files.includes(row.file)) files.push(row.file);
for (const row of slotReviewReadiness.codeHashes) if (!files.includes(row.file)) files.push(row.file);
for (const row of structuralJsonReadiness.codeHashes) if (!files.includes(row.file)) files.push(row.file);
for (const row of fieldRecoveryReadiness.codeHashes) if (!files.includes(row.file)) files.push(row.file);
for (const row of fieldValueReadiness.codeHashes) if (!files.includes(row.file)) files.push(row.file);
for (const row of fieldSourceReadiness.codeHashes) if (!files.includes(row.file)) files.push(row.file);
for (const row of mixedReviewReadiness.codeHashes) if (!files.includes(row.file)) files.push(row.file);
for (const row of resumeReadiness.codeHashes) if (!files.includes(row.file)) files.push(row.file);
for (const row of contractProjectionReadiness.codeHashes) if (!files.includes(row.file)) files.push(row.file);
for (const row of sourceExpansionReadiness.codeHashes) if (!files.includes(row.file)) files.push(row.file);
for (const row of parsedWireReadiness.codeHashes) if (!files.includes(row.file)) files.push(row.file);
const executionPolicyReadiness = await json('build/ticket-18-faction-production-v1/execution-policy-readiness-v1.json');
if (!executionPolicyReadiness.passed || executionPolicyReadiness.bindingHash !== PRODUCTION_EXECUTION_POLICY_V1.hash)
  fail('FACTION_EXECUTION_POLICY_NOT_READY');
for (const row of executionPolicyReadiness.codeHashes) {
  if (sha256(await readFile(path.join(root, row.file))) !== row.hash) fail('FACTION_EXECUTION_POLICY_CODE_DRIFT');
  if (!files.includes(row.file)) files.push(row.file);
}
if (requestBetaModel) for (const file of FACTION_EXECUTION_MODEL_FILES_V1) if (!files.includes(file)) files.push(file);
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const limits = budgetExtension?.nextLimits || { maxCalls: 400, maxCostMicros: 20_000_000, maxTokens: 60_000_000, maxWallMs: 8 * 60 * 60 * 1000, maxInputBytes: 1_000_000, maxRevisions: 3 };
const next = seal({ version: 'faction_strategy_production_v1', overallRunId: args[2], overallDependencyHash: overallDependency.hash,
  ...(requestBetaModel ? {executionModelBinding:FACTION_EXECUTION_MODEL_BINDING_V1,
    executionModelReadinessHash:executionModelReadiness.hash} : {}),
  executionPolicyBinding: PRODUCTION_EXECUTION_POLICY_V1, executionPolicyReadinessHash: executionPolicyReadiness.hash,
  parallelBinding: FACTION_PARALLEL_BINDING_V1,
  teachRecoveryBindings, teachRecoveryReadinessHash: teachRecoveryReadiness.hash,
  catalogueReviewBinding, catalogueReviewReadinessHash: catalogueReviewReadiness.hash,
  ...slotReviewEnvironment.recipeFields, slotReviewReadinessHash: slotReviewReadiness.hash,
  ...structuralJsonScope.recipeFields,
  ...fieldRecoveryScope.recipeFields,
  ...fieldValueRecipe,
  ...fieldSourceRecipe,
  ...mixedReviewRecipe,
  ...resumeRecipe,
  ...contractProjectionRecipe,
  ...sourceExpansionRecipeFields,
  ...parsedWireRecipeFields,
  structuredTeachBinding, structuredTeachReadinessHash: structuredTeachReadiness.hash,
  reviewRecoveryBudgetBinding, reviewRecoveryBudgetReadinessHash: reviewRecoveryBudgetReadiness.hash,
  teachOutputBudgetBinding, teachOutputBudgetReadinessHash: teachOutputBudgetReadiness.hash,
  nativeProductionBinding, nativeProductionReadinessHash: nativeProductionReadiness.hash,
  teachUncertaintyRecoveryBinding, teachUncertaintyReadinessHash: teachUncertaintyReadiness.hash,
  reviewFocusCapacityRecoveryBinding, reviewFocusCapacityReadinessHash: reviewFocusCapacityReadiness.hash,
  metadataRecoveryBinding, metadataRecoveryReadinessHash: metadataRecoveryReadiness.hash,
  targetCompletionBinding, targetCompletionReadinessHash: targetCompletionReadiness.hash,
  nativeOutputCapacityBinding, nativeOutputCapacityReadinessHash: nativeOutputCapacityReadiness.hash,
  nativeOutputCapacityFrozenRoleIds,
  targetIdReviewBinding, targetIdReviewReadinessHash: targetIdReviewReadiness.hash,
  explicitSlotReviewBinding, explicitSlotReviewReadinessHash: explicitSlotReviewReadiness.hash,
  wireRuntimeBinding, wireRuntimeReadinessHash: wireRuntimeReadiness.hash, wireKeyHelperRef,
  reviewDecompositionBinding, reviewDecompositionReadinessHash: reviewDecompositionReadiness.hash, reviewDecompositionOrigins,
  ...wireAddressRecovery.recipeFields, wireAddressRecoveryReadinessHash: wireAddressRecoveryReadiness.hash,
  observedSourceRepairBinding, observedSourceRepairReadinessHash: observedSourceRepairReadiness.hash,
  observedRosterFactsHashes: observedRosterFacts.map(f => f.hash),
  proposerBatchBinding, proposerBatchFrozenRoleIds, uniqueRiskClauseBinding, planningRepairReadinessHash: planningRepairReadiness.hash,
  proposerAuxiliaryCapacityBinding, proposerAuxiliaryReadinessHash: proposerAuxiliaryReadiness.hash, nativeTargetReconstructionBinding,
  draftEnvelopeBinding, initialSourceCorrectionBinding, editorEnvelopeBinding, draftPolicyReadinessHash: draftPolicyReadiness.hash,
  zergUnitTimingBinding, zergUnitTimingReadinessHash: zergUnitTimingReadiness.hash,
  sharedScenarioReviewContext: true, eventLoopFairnessReadinessHash: fairnessReadiness.hash,
  qualificationReceiptHash: qualificationReceipt.hash, inputHashes: inputs.map(i => i.hash), planHashes: inputs.map(i => createFactionWritingPlanV1(i).hash),
  catalogueHash: catalogue.hash, sourceBinding: catalogue.sourceBinding, contextHash: context.hash, modelHash: profile.integrity.hash,
  mainReadinessHash: main.hash, workflowReadinessHash: gates[1].hash, dshContextReadinessHash: gates[2].hash, jsonRecoveryReadinessHash: gates[4].hash,
  targetedCorrectionsReadinessHash: gates[5].hash, knownRulePolicyHashes: knownRulePolicies.map(p => p.hash),
  dshBindingHash: gates[2].dshBinding.hash, codeHashes, limits, ...(fieldRepairBinding ? { fieldRepairBinding } : {}),
  unitRoleRepairReadinessHashes: unitRoleRepairGates.map(g => g.hash),
  registeredSourceFieldRepair: true, commandRecoveryBinding: commandRecovery.manifest,
  sourceCorrectionReadinessHashes: sourceCorrectionGates.map(g => g.hash),
  structuredGenerationBinding,
  structuredGenerationReadinessHash: structuredGenerationReadiness.hash,
  reviewFocusNormalizationReadinessHash: reviewFocusNormalizationReadiness.hash,
  structuredReviewBinding,
  structuredReviewReadinessHash: structuredReviewReadiness.hash,
  repairConflictHistoryBinding,
  ...(phaseFieldBinding ? { phaseFieldBinding, phaseFieldReadinessHash: phaseFieldReadiness.hash } : {}),
  ...(budgetExtension ? { budgetExtension, budgetExtensionReadinessHash: budgetReadiness.hash } : {}),
  ...(useReviewTransaction ? { reviewTransactionBindings, reviewTransactionReadinessHash: reviewTransactionReadiness.hash,
    reviewTransactionEvidenceHash: reviewTransactionEvidence.hash } : {}),
  ...(additionalRecoveries.length ? { additionalCommandRecoveryBindings: additionalRecoveries.map(row => row.manifest),
    additionalCommandRecoveryReadinessHashes: additionalRecoveryGates.map(gate => gate.hash) } : {}),
  target: 'two_complete_conditional_faction_strategy_candidates_with_source_review_not_runtime_promotion',
  independentEvaluationAnswersExposed: false, sourceRefreshPerformed: false, trainingTruth: false });
let continuation = null;
if (args[4]) {
  console.log(JSON.stringify({ event: 'production-preparation', stage: 'checkpoint_and_migration_check', parentRunId: args[4], providerCalls: 0 }));
  const parent = parentRecipe;
  const parentReport = await json('build/ticket-18-faction-production-v1/' + args[4] + '/report.json');
  const before = await json('build/ticket-17-production-redesign-v1/readiness-' + parent.mainReadinessHash + '.json');
  continuation = inspectFactionContinuationV1({ filename, parentRunId: args[4], parent, parentReport, next,
    executionPolicyReadiness, executionModelReadiness,
    capacityMigration: { teach: teachRecoveryReadiness, catalogue: catalogueReviewReadiness, fairness: fairnessReadiness, inputs,
      structuredTeach: structuredTeachReadiness, recoveryBudget: reviewRecoveryBudgetReadiness,
      outputBudget: teachOutputBudgetReadiness, nativeProduction: nativeProductionReadiness,
      teachUncertainty: teachUncertaintyReadiness, reviewFocusCapacity: reviewFocusCapacityReadiness,
      metadataRecovery: metadataRecoveryReadiness, targetCompletion: targetCompletionReadiness,
      nativeOutputCapacity: nativeOutputCapacityReadiness, targetIdReview: targetIdReviewReadiness,
      explicitSlotReview: explicitSlotReviewReadiness,
      slotReview: { readiness: slotReviewReadiness, environment: slotReviewEnvironment },
      structuralJson: { readiness: structuralJsonReadiness, scope: structuralJsonScope },
      fieldRecovery: { readiness: fieldRecoveryReadiness, scope: fieldRecoveryScope },
      fieldValues: fieldValueReadiness,
      fieldSource: fieldSourceReadiness,
      mixedReview: mixedReviewReadiness,
      resumeReliability: resumeReadiness,
      contractProjection: contractProjectionReadiness,
      sourceExpansion: sourceExpansionReadiness,
      parsedWire: parsedWireReadiness,
      wireRuntime: wireRuntimeReadiness,
      reviewDecomposition: reviewDecompositionReadiness, reviewDecompositionDiagnosis,
      wireAddressRecovery: { gate: wireAddressRecoveryReadiness, prepared: wireAddressRecovery },
      observedSourceRepair: observedSourceRepairReadiness, planningRepair: planningRepairReadiness,
      proposerAuxiliary: proposerAuxiliaryReadiness, draftPolicy: draftPolicyReadiness,
      zergUnitTiming: zergUnitTimingReadiness, zergUnitTimingDiagnosis },
    normalizationMigration: { before, after: main, recovery: gates[4] }, correctionMigration: gates[5],
    fieldRepairMigration: fieldRepairBinding ? { binding: fieldRepairBinding, readiness: fieldRepairReadiness } : null,
    unitRoleRepairMigration: unitRoleRepairGates, sourceCorrectionMigration: sourceCorrectionGates,
    additionalCommandRecoveryMigration: additionalRecoveryGates,
    phaseSeedMigration: phaseFieldBinding ? { binding: phaseFieldBinding, readiness: phaseFieldReadiness } : null,
    budgetExtensionReadiness: budgetReadiness,
    structuredGenerationMigration: { readiness: structuredGenerationReadiness,
      imported: structuredEditorImport },
    reviewFocusNormalizationMigration: reviewFocusNormalizationReadiness,
    structuredReviewMigration: { readiness: structuredReviewReadiness,
      capabilityReport: structuredReviewCapabilityReport },
    repairConflictHistoryMigration: gates[1],
    reviewTransactionMigration: useReviewTransaction ? { readiness: reviewTransactionReadiness, actualEvidence: reviewTransactionEvidence } : null });
}
const { hash: ignored, ...nextBody } = next;
const recipe = continuation ? seal({ ...nextBody, continuation: continuation.manifest }) : next;
const quarantinedTasks = continuation?.manifest.reviewDecompositionMigration?.childContinuation?.quarantinedTasks || [];
const quarantinesForInput = input => quarantinedTasks.filter(row => row.fullRoleId.startsWith(
  'faction.' + input.factionRecordKey.split(':')[1] + '.'));
const isMixedLane = input => recipe.mixedReviewBinding && input.hash === reviewDecompositionDiagnosis.inputHash
  && quarantinesForInput(input).length === 1
  && quarantinesForInput(input)[0].fullRoleId === reviewDecompositionDiagnosis.request.packet.id + '.' + reviewDecompositionDiagnosis.request.roleId;
// Verify the actual old fragment before any paid lane/probe. This is a new
// authorized replacement, not clearing or reconciling the old quarantine.
for (const input of inputs.filter(isMixedLane)) {
  const environment = openFactionMixedReviewEnvironmentV1({ filename, recipe, parentRunId: args[4], parentRecipe,
    args: factionReviewDecompositionArgsV1({ filename, input, diagnosis: reviewDecompositionDiagnosis }),
    openingFenceRecovery: wireAddressRecovery.openingFenceRecovery });
  try {
    const jobs = environment.resolveJobs();
    for (const job of jobs.filter(j => j.kind === 'inherited')) environment.verifyPart(environment.readFragment(job.ref));
    console.log(JSON.stringify({ event: 'mixed-review-preflight', faction: input.factionRecordKey,
      jobs: jobs.map(j => ({ job: j.jobId, route: j.kind })), originalUnknownSendReconciled: false, providerCalls: 0 }));
  } finally { environment.close(); }
}
const canonicalPromptRoleId = id => id.replace(/\.source-evidence-v1\.[a-f0-9]{20}$/u, '');
const promptLineage = continuation ? await (await import('../packages/skill-production-v3/faction-prompt-lineage-v1.mjs'))
  .resolveFactionPromptLineageV1({ steps: continuation.steps, parentRunId: args[4],
    checkpointInventory: continuation.manifest.checkpointInventory,
    readRecipe: runId => json('build/ticket-18-faction-production-v1/' + runId + '/recipe.json') }) : null;
const legacyPromptRoleIds = continuation
  ? deriveFactionLegacyPromptRoleIdsV1(continuation.steps, promptLineage) : [];
const legacyStructuredReviewRoleIds = continuation
  ? deriveFactionLegacyStructuredReviewRoleIdsV1(continuation.steps, recipe.checkpointInventoryBinding) : [];
const catalogueLegacyRoleIds = (continuation?.steps || []).filter(row =>
  row.artifact.structuredDecodePassed !== true
  || row.artifact.outputContractRef?.hash === catalogueReviewBinding.prior.hash)
  .map(row => canonicalPromptRoleId(row.id));
const catalogueFrozenCurrentRoleIds = (continuation?.steps || []).filter(row =>
  row.artifact.outputContractRef?.hash === catalogueReviewBinding.current.hash
  && row.artifact.sharedScenarioSourcesIncluded !== true).map(row => canonicalPromptRoleId(row.id));
const schemaRepairImportRows = new Map((continuation?.schemaRepairCandidates || [])
  .map((row) => [row.id, row]));
const structuredReviewSchemaRepairImports =
  (continuation?.manifest.schemaRepairImports || []).map((permit) => {
    const row = schemaRepairImportRows.get(permit.id);
    if (!row || hash(row.artifact) !== permit.artifactHash
      || row.artifact?.roleRef?.hash !== permit.roleRefHash
      || row.artifact?.contextManifestRef?.hash
        !== permit.contextManifestHash
      || row.artifact?.outputContractRef?.hash
        !== permit.outputContractHash) {
      fail('FACTION_STRUCTURED_REVIEW_SCHEMA_REPAIR_IMPORT_TAMPERED');
    }
    return row.artifact;
  });
const structuredReviewOutputCapRecoveryImports =
  continuation?.outputCapRecoveryFailureImports || [];
const outputCapImportPermits =
  continuation?.manifest.outputCapRecoveryImports || [];
if (structuredReviewOutputCapRecoveryImports.length
    !== outputCapImportPermits.length
  || structuredReviewOutputCapRecoveryImports.some((row, index) => {
    const permit = outputCapImportPermits[index];
    return row.hash !== permit?.hash
      || row.fullRoleId !== permit.fullRoleId
      || row.originAttemptId !== permit.originAttemptId
      || row.originInvocationHash !== permit.originInvocationHash
      || row.originIssue.hash !== permit.originIssueHash
      || row.failureReceipt.receiptHash !== permit.failureReceiptHash;
  })) {
  fail('FACTION_STRUCTURED_REVIEW_OUTPUT_CAP_IMPORT_TAMPERED');
}
const structuredReviewOutputCapSuccessImports =
  continuation?.outputCapRecoverySuccessImports || [];
const outputCapSuccessImportPermits =
  continuation?.manifest.outputCapRecoverySuccessImports || [];
if (structuredReviewOutputCapSuccessImports.length
    !== outputCapSuccessImportPermits.length
  || structuredReviewOutputCapSuccessImports.some((row, index) => {
    const permit = outputCapSuccessImportPermits[index];
    return row.hash !== permit?.hash
      || row.fullRoleId !== permit.fullRoleId
      || row.originIssueHash !== permit.originIssueHash
      || row.originAttemptId !== permit.originAttemptId
      || row.originInvocationHash !== permit.originInvocationHash
      || row.candidate.hash !== permit.candidateHash
      || row.runtimeReceipt.hash !== permit.runtimeReceiptHash
      || hash(row.originalUsage) !== permit.originalUsageHash;
  })) {
  fail('FACTION_STRUCTURED_REVIEW_OUTPUT_CAP_SUCCESS_IMPORT_TAMPERED');
}
if (args[0] === '--preflight') {
  const dryIndex = inputs.findIndex(input => quarantinesForInput(input).length === 0 || isMixedLane(input));
  if (dryIndex < 0) fail('FACTION_ALL_TASKS_QUARANTINED');
  const dryInput = inputs[dryIndex];
  // Exercise exact inherited role input hashes without credentials or egress.
  // Initial cutover has one exact expected editor. Later continuations derive
  // the next miss from the sealed lineage and must never reissue a reusable role.
  let firstUncachedRole = null, firstUncachedRoute = null;
  let firstUncachedObservedHash = null, inheritedObservedHashes = [];
  let firstInheritedInputDrift = null;
  const dryLocal = openProductionStore(':memory:', { runId: 'faction-cutover-' + recipe.hash.slice(0, 20), recipeHash: recipe.hash,
    maxCalls: limits.maxCalls - (continuation?.manifest.accounting.calls || 0),
    maxTokens: limits.maxTokens - (continuation?.manifest.accounting.tokens || 0),
    maxCostMicros: limits.maxCostMicros - (continuation?.manifest.accounting.costMicros || 0) });
  const inheritedInputHashes = new Map((continuation?.manifest.reusable || [])
    .map(row => [row.id, row.inputHash]));
  const inheritedSteps = new Map((continuation?.steps || [])
    .map(row => [row.id, row]));
  const summarizeTask = task => {
    if (typeof task !== 'string') return null;
    const roleMarker = '\nROLE TASK\n';
    const workspaceMarker = '\nLOCAL WORKSPACE\n';
    const roleAt = task.indexOf(roleMarker);
    const workspaceAt = task.indexOf(workspaceMarker);
    if (roleAt < 0 || workspaceAt < roleAt) return { taskShape: 'unknown' };
    const instruction = task.slice(roleAt + roleMarker.length, workspaceAt);
    const workspaceText = task.slice(workspaceAt + workspaceMarker.length);
    let workspace = null;
    try { workspace = JSON.parse(workspaceText); } catch {}
    return {
      instructionHash: hash(instruction),
      instructionBytes: Buffer.byteLength(instruction),
      workspaceHash: hash(workspaceText),
      workspaceBytes: Buffer.byteLength(workspaceText),
      workspaceKeys: workspace ? Object.keys(workspace).sort() : [],
      sourceDependencyContextHash:
        workspace?.sourceDependencyContextAtEnd?.hash || null,
      repairConflictHistoryHash: workspace?.repairConflictHistory?.hash || null,
      containsConflictInstruction:
        instruction.includes('该对象已连续多轮来源审查失败'),
    };
  };
  const diagnosticDryLocal = Object.freeze({ ...dryLocal,
    acquire(id, input, ttl) {
      const lease = dryLocal.acquire(id, input, ttl);
      const expectedInputHash = inheritedInputHashes.get(id);
      if (!firstInheritedInputDrift && expectedInputHash
        && lease.inputHash !== expectedInputHash) {
        firstInheritedInputDrift = {
          id, expectedInputHash, actualInputHash: lease.inputHash,
          inputKeys: Object.keys(input).sort(),
          ...(typeof input.task === 'string' ? {
            taskHash: hash(input.task),
            taskBytes: Buffer.byteLength(input.task),
            taskParts: summarizeTask(input.task),
          } : {}),
          packetHash: input.packetHash || null,
          contextHash: input.contextHash || null,
          maxOutput: input.maxOutput || null,
          arm: input.arm || null,
          limitsHash: input.limits ? hash(input.limits) : null,
        };
      }
      return lease;
    },
  });
  const dryStore = continuation
    ? withCheckpointContinuation(diagnosticDryLocal, continuation)
    : diagnosticDryLocal;
  const recordLegacyMiss = request => {
    firstUncachedRole = request.stageId;
    firstUncachedRoute = 'legacy_typed_validation';
    firstUncachedObservedHash = hash(request.observed);
    inheritedObservedHashes = inheritedSteps.get(request.stageId)
      ?.artifact?.loop?.transcript?.map(row => row.observedHash) || [];
  };
  try {
    const dryRuntime = createProductionRuntimeV3({ store: dryStore, reader: createEvidenceReader(catalogue), context, verifier: {},
      model: async request => { recordLegacyMiss(request);
        fail('FACTION_PREFLIGHT_FIRST_LEGACY_UNCACHED_ROLE'); },
      dsh: { run: runDirectLoop } });
    const dryStructuredRuntime = createFactionStructuredLocalEditorRuntimeV1({
      input: dryInput, runtime: dryRuntime, store: dryStore,
      editorEnvelopeBinding, draftEnvelopeBinding,
      editorEnvelopeImports: continuation?.editorEnvelopeFailureImports || [],
      dry: true, onEnvelopeImport: ({ roleId }) => { firstUncachedRole = roleId; firstUncachedRoute = 'dsh_saved_output_import_no_provider'; },
      dsh: { run: runDirectLoop },
      providerAdapter: { complete: async ({ providerRequest }) => {
        firstUncachedRole = providerRequest.roleRef.id;
        firstUncachedRoute = 'responses_json_schema';
        const error = new Error('FACTION_PREFLIGHT_FIRST_STRUCTURED_UNCACHED_ROLE');
        error.code = 'FACTION_PREFLIGHT_FIRST_STRUCTURED_UNCACHED_ROLE';
        error.safeReceipt = { requestDefinitelyNotSent: true,
          requestMayHaveBeenSent: false, usageKnown: false, physicalAttempts: 0 };
        throw error;
      } },
      egressBinding: structuredEgressBinding,
      capabilityReceipt: structuredCapabilityReceipt,
      outputContract: structuredEditorContract,
      executionPolicy: structuredEditorPolicy,
      priceUsage: priceStructuredUsage,
      imports: [structuredEditorImport],
      legacyPromptRoleIds,
    });
    const dryStructuredReviewRuntime = createFactionStructuredReviewRuntimeV1({
      input: dryInput, runtime: dryStructuredRuntime, store: dryStore,
      dsh: { run: runDirectLoop },
      providerAdapter: { complete: async ({ providerRequest }) => {
        firstUncachedRole = providerRequest.roleRef.id;
        firstUncachedRoute = 'responses_json_schema';
        const error = new Error('FACTION_PREFLIGHT_FIRST_STRUCTURED_UNCACHED_ROLE');
        error.code = 'FACTION_PREFLIGHT_FIRST_STRUCTURED_UNCACHED_ROLE';
        error.safeReceipt = { requestDefinitelyNotSent: true,
          requestMayHaveBeenSent: false, usageKnown: false, physicalAttempts: 0 };
        throw error;
      } },
      egressBinding: structuredEgressBinding,
      capabilityReceipt: structuredReviewCapabilityReceipt,
      outputContract: structuredReviewContract,
      executionPolicy: structuredReviewPolicy,
      priceUsage: priceStructuredUsage,
      legacyStructuredReviewRoleIds,
      schemaRepairImports: structuredReviewSchemaRepairImports,
      allowBoundedOutputCapRecovery: true,
      outputCapRecoveryImports: structuredReviewOutputCapRecoveryImports,
      outputCapRecoverySuccessImports:
        structuredReviewOutputCapSuccessImports,
    });
    const dryCatalogueRuntime = createFactionCatalogueReviewRuntimeV1({ input: dryInput,
      legacyRuntime: dryStructuredReviewRuntime, legacyRoleIds: catalogueLegacyRoleIds,
      frozenCurrentRoleIds: catalogueFrozenCurrentRoleIds, includeSharedScenarioSources: true,
      store: dryStore, executionPolicy: structuredReviewPolicy,
      onUncached: ({ roleId, capsule }) => {
        firstUncachedRole = roleId; firstUncachedRoute = 'responses_json_schema';
        if (capsule?.hash === reviewDecompositionEvidence.originalContextHash) {
          const w = reviewDecompositionDiagnosis.request.workspace;
          const plan = prepareFactionReviewDecompositionV1({ input: dryInput, capsule, evidence: reviewDecompositionEvidence,
            originalContract: catalogueReviewContract, mapping: { section: w.section, draft: w.draft,
              reviewIndices: w.reviewIndices, requiredSourceRefs: w.coverageRequiredSourceRefs, targets: w.outputRequestAtEnd.targetContract } });
          firstUncachedRoute = 'explicit_decomposed_full_context_review';
          console.log(JSON.stringify({ event: 'review-decomposition-preflight', planHash: plan.hash,
            fragments: plan.jobs.length, newContractProbeKinds: Object.keys(reviewFragmentContracts), providerCalls: 0 }));
        }
      } });
    const drySlotBaseRuntime = createFactionSlotReviewRuntimeV1({ input: dryInput, legacyRuntime: dryCatalogueRuntime,
      store: dryStore, executionPolicy: structuredReviewPolicy,
      legacyRoleIds: factionMixedReviewLegacyRoleIdsV1(recipe, recipe.slotReviewLegacyRoleIds), recoveryOrigins: recipe.slotReviewRecoveryOrigins,
      readRecoveryEvidence: slotReviewEnvironment.readRecoveryEvidence,
      reviewSlotNamespaceBinding: recipe.reviewSlotNamespaceBinding,
      onUncached: ({ roleId }) => { firstUncachedRole = roleId; firstUncachedRoute = 'responses_json_schema'; } });
    const drySlotRuntime = createFactionStructuralReviewLaneV1({ root, filename, recipe, input: dryInput,
      runtime: drySlotBaseRuntime, store: dryStore, executionPolicy: structuredReviewPolicy, dry: true,
      onUncached: ({ roleId }) => { firstUncachedRole = roleId; firstUncachedRoute = 'authenticated_structural_json_recovery'; } });
    const dryFieldRuntime = createFactionFieldRecoveryLaneV1({ filename, recipe, ancestors: fieldRecoveryScope.ancestors,
      input: dryInput, runtime: drySlotRuntime, store: dryStore, executionPolicy: structuredReviewPolicy, dry: true,
      onUncached: ({ roleId, route }) => { firstUncachedRole = roleId; firstUncachedRoute = route || 'authenticated_field_projection_no_provider'; } });
    const dryProjectionResolver = createFactionContractProjectionResolverV1({ filename, recipe, ancestors: fieldRecoveryScope.ancestors,
      input: dryInput, store: dryStore, dry: true });
    const dryProjectionRuntime = createFactionContractProjectionLaneV1({ recipe, input: dryInput, runtime: dryFieldRuntime,
      store: dryStore, resolver: dryProjectionResolver, executionPolicy: structuredReviewPolicy, dry: true,
      onUncached: ({ roleId, route }) => { firstUncachedRole = roleId; firstUncachedRoute = route; } });
    const dryTeachRuntime = createFactionStructuredTeachRuntimeV1({ input: dryInput, runtime: dryProjectionRuntime,
      store: dryStore, executionPolicy: structuredReviewPolicy, dry: true });
    const dryNativeRuntime = createFactionNativeProductionRuntimeV1({ input: dryInput,
      runtime: withFactionTeachOutputBudgetV1(dryTeachRuntime, teachOutputBudgetBinding),
      store: dryStore, executionPolicy: structuredReviewPolicy, dry: true,
      proposerBatchBinding, proposerAuxiliaryCapacityBinding, targetReconstructionBinding: nativeTargetReconstructionBinding,
      draftEnvelopeBinding, draftEnvelopeImports,
      outputCapacity: { binding: nativeOutputCapacityBinding, frozenRoleIds: nativeOutputCapacityFrozenRoleIds },
      legacyRoleIds: (continuation?.steps || []).filter(row => !usesFactionNativeProductionInputV1(row.artifact)).map(row => row.id) });
    const dryDispatch = { async role(request) {
      try { return await dryNativeRuntime.role(request); }
      catch (error) {
        if (['FACTION_PREFLIGHT_FIRST_NATIVE_PRODUCTION_UNCACHED_ROLE', 'FACTION_PREFLIGHT_FIRST_STRUCTURED_TEACH_UNCACHED_ROLE'].includes(error.code)) {
          firstUncachedRole = request.packet.id + '.' + request.roleId; firstUncachedRoute = 'responses_json_schema';
        }
        throw error;
      }
    } };
    const dryFactionRuntime = useReviewTransaction ? createFactionReviewTransactionRuntimeV1({ input: dryInput, runtime: dryDispatch,
      store: dryStore, phaseFieldSeed: dryIndex === 0 ? phaseFieldSeed : null, draftEnvelopeBinding }) : dryDispatch;
    await produceFactionStrategyV1({ input: dryInput, runtime: dryFactionRuntime, store: dryStore,
      knownRulePolicy: knownRulePolicies[dryIndex], registeredSourceFieldRepair: true,
      fieldRepairSeed: dryIndex === 0 ? fieldRepairSeed : null, phaseFieldSeed: dryIndex === 0 ? phaseFieldSeed : null,
      observedSourceRepair: { binding: observedSourceRepairBinding, facts: observedRosterFacts[dryIndex] },
      proposerBatches: { binding: proposerBatchBinding, frozenRoleIds: proposerBatchFrozenRoleIds,
        auxiliaryCapacityBinding: proposerAuxiliaryCapacityBinding }, uniqueRiskClauseBinding, draftEnvelopeBinding, initialSourceCorrectionBinding, zergUnitTimingBinding,
      legacyPromptRoleIds, structuredReviewValidationBinding, catalogueReviewBinding,
      reviewSlotNamespaceBinding: recipe.reviewSlotNamespaceBinding,
      tutorRecovery: teachRecoveryBindings.find(row => row.inputHash === dryInput.hash) || null });
    fail('FACTION_PREFLIGHT_CUTOVER_MISSING');
  } catch (error) {
    if (!['STRUCTURED_DSH_MODEL_OUTCOME_NOT_ACCEPTED', 'FACTION_PREFLIGHT_FIRST_CATALOGUE_UNCACHED_ROLE', 'FACTION_PREFLIGHT_FIRST_EDITOR_ENVELOPE_IMPORT',
      'FACTION_PREFLIGHT_FIRST_LEGACY_UNCACHED_ROLE', 'FACTION_PREFLIGHT_FIRST_NATIVE_PRODUCTION_UNCACHED_ROLE',
      'FACTION_PREFLIGHT_FIRST_STRUCTURED_TEACH_UNCACHED_ROLE', 'FACTION_PREFLIGHT_FIRST_SLOT_REVIEW_UNCACHED_ROLE',
      'FACTION_PREFLIGHT_SLOT_REVIEW_RECOVERY_REQUIRED', 'FACTION_PREFLIGHT_STRUCTURAL_JSON_RECOVERY_REQUIRED',
      'FACTION_PREFLIGHT_PARSED_WIRE_SCHEMA_CORRECTION_REQUIRED', 'FACTION_PREFLIGHT_FIELD_RECOVERY_REQUIRED',
      'FACTION_PREFLIGHT_FIELD_VALUE_COMPLETION_REQUIRED'].includes(error.code)) throw error;
  } finally { dryLocal.close(); }
  const factionPrefix = 'faction.' + dryInput.factionRecordKey.split(':')[1];
  const canonicalUncachedRole = canonicalPromptRoleId(firstUncachedRole || '');
  const fullUncachedRole = canonicalUncachedRole.startsWith(factionPrefix + '.' + factionPrefix + '.')
    ? canonicalUncachedRole : factionPrefix + '.' + canonicalUncachedRole;
  const reusableRoleIds = new Set((continuation?.manifest.reusable || [])
    .map(row => canonicalPromptRoleId(row.id)));
  const initialStructuredCutover = !parentRecipe.structuredGenerationBinding;
  const initialStructuredReviewCutover = !parentRecipe.structuredReviewBinding;
  const structuredReviewContractChanged = Boolean(
    parentRecipe.structuredReviewBinding
      && hash(parentRecipe.structuredReviewBinding.outputContractRef)
        !== hash(structuredReviewBinding.outputContractRef));
  const repairConflictHistoryIntroduced =
    !parentRecipe.repairConflictHistoryBinding;
  const repairConflictCutover = repairConflictHistoryIntroduced
    && firstUncachedRoute === 'responses_json_schema'
    && firstUncachedRole
      === repairConflictHistoryReadiness.expectedFirstCutoverRole;
  if (!firstUncachedRole || !fullUncachedRole.startsWith(factionPrefix + '.' + factionPrefix + '.')
    || !/^[a-z0-9._-]+$/u.test(fullUncachedRole)
    || reusableRoleIds.has(fullUncachedRole)
      && !structuredReviewContractChanged && !repairConflictCutover
    || initialStructuredCutover && (firstUncachedRoute !== 'responses_json_schema'
      || firstUncachedRole !== 'faction.terran_armed_forces.objectives.1.editor.0.2')
    || initialStructuredReviewCutover
      && (firstUncachedRoute !== 'responses_json_schema'
        || firstUncachedRole !== 'faction.terran_armed_forces.objectives.1.review-target-batch-v1.supportive.2.0')
    || structuredReviewContractChanged
      && firstUncachedRoute !== 'responses_json_schema') {
    const diagnostic = { firstUncachedRole, firstUncachedRoute,
      firstUncachedObservedHash, inheritedObservedHashes,
      firstInheritedInputDrift };
    console.error(JSON.stringify({ event: 'FACTION_PREFLIGHT_CUTOVER_DRIFT',
      diagnostic }));
    fail('FACTION_PREFLIGHT_CUTOVER_DRIFT', diagnostic);
  }
  console.log(JSON.stringify({ ready: true, recipeHash: recipe.hash, providerCalls: 0, factions: inputs.map(i => i.factionRecordKey),
    sections: inputs.map(i => createFactionWritingPlanV1(i).sections.length), overallQualified: true, limits,
    reusableRoles: continuation?.manifest.reusable.length || 0, inheritedAccounting: continuation?.manifest.accounting || null,
    legacyPromptRoles: legacyPromptRoleIds.length, structuredCanaryImport: structuredEditorImport.hash,
    legacyStructuredReviewRoles: legacyStructuredReviewRoleIds.length,
    structuredReviewSchemaRepairImports:
      structuredReviewSchemaRepairImports.length,
    structuredReviewOutputCapRecoveryImports:
      structuredReviewOutputCapRecoveryImports.length,
    structuredReviewOutputCapSuccessImports:
      structuredReviewOutputCapSuccessImports.length,
    structuredReviewCapabilityRunId: structuredReviewCapabilityReport.runId,
    firstUncachedRole, firstUncachedRoute, initialStructuredCutover,
    initialStructuredReviewCutover, structuredReviewContractChanged,
    repairConflictHistoryIntroduced, repairConflictCutover,
    additionalCommandRecoveries: additionalRecoveries.length, quarantinedTasks,
    firstEligibleFaction: dryInput.factionRecordKey,
    newExecutionModel: recipe.executionModelBinding?.model || profile.model })); process.exit(0);
}
const runId = 'faction-v1-' + recipe.hash.slice(0, 20), out = path.join(base, runId); await mkdir(out, { recursive: true });
const inherited = continuation?.manifest.accounting || { calls: 0, tokens: 0, costMicros: 0 };
const localStore = openProductionStore(filename, { runId, recipeHash: recipe.hash,
  maxCalls: limits.maxCalls - inherited.calls, maxTokens: limits.maxTokens - inherited.tokens, maxCostMicros: limits.maxCostMicros - inherited.costMicros });
const routingDb = new DatabaseSync(filename, { readOnly: true });
const failureRouter = createProductionFailureRouterV1({
  observeWireFailure: recipe.structuralJsonReviewBinding ? observeFactionStructuredWireFailureV1 : null,
  readArtifact: id => localStore.artifact(id),
  readAttempt: id => routingDb.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(runId, id),
});
const policyStore = withProductionExecutionPolicyV1(localStore, recipe.executionPolicyBinding,
  { inherited: continuation?.manifest.reusable || [] });
const parallelControl = createFactionParallelControlV1(continuation
  ? withCheckpointContinuation(policyStore, continuation) : policyStore, { failureRouter });
const store = parallelControl.store;
const start = store.acquire('production-start', { recipeHash: recipe.hash });
const began = start.cached ? start.artifact.began : store.finish(start, { began: continuation?.manifest.parentStart || Date.now() }).began;
const historyTokens = 2_864_424, historyMicros = 5_052_393 + 28_961_350;
const put = (name, value) => writeFile(path.join(out, name + '.json'), JSON.stringify(value, null, 2));
let failure = null, parallelReceipt = null, costNotificationReceipt = null;
const candidates = [];
try {
  const global = store.globalSummary();
  const local = store.summary();
  if (global.attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED')) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (global.attempts.some(a => a.state === 'intent')) fail('AMBIGUOUS_EGRESS_NO_RETRY');
  const costProjection = projectFactionCumulativeCostV1({ historyMicros,
    globalSpentMicros: global.reservedOrSettledMicros,
    inheritedCostMicros: inherited.costMicros,
    currentRunCostMicros: local.reservedOrSettledMicros,
    chainLimitMicros: limits.maxCostMicros });
  if (!isFactionBudgetEpochV1(recipe.budgetExtension) && costProjection.projectedMaximumCumulativeMicros >= 100_000_000) {
    costNotificationReceipt = await json(
      'build/ticket-18-faction-production-v1/cny-100-notification-receipt.json');
    verifyFactionCostNotificationV1({ projection: costProjection,
      notification: costNotificationReceipt, budgetExtension: recipe.budgetExtension });
  }
  const budgetClockStart = isFactionBudgetEpochV1(recipe.budgetExtension) ? Date.parse(recipe.budgetExtension.startedAt) : began;
  if (Date.now() - budgetClockStart >= limits.maxWallMs) fail('FACTION_RUN_WALL_EXHAUSTED');
  // Immutable legacy variables above are for exact historical reconstruction.
  // All new live workers below use these explicitly selected execution profiles.
  const liveProfiles = {base:factionExecutionProfileV1({binding:recipe.executionModelBinding || null}),
    capacity:factionExecutionProfileV1({binding:recipe.executionModelBinding || null,legacyProfileRef:nativeOutputCapacityBinding.profileRef})};
  const profile = liveProfiles.base, capacityProfile = liveProfiles.capacity;
  const structuredProviderRegistry = createStarcraftTmgProviderProfileRegistryV2({entries:[{providerProfile:profile,responsePath:'/responses'}]});
  const capacityProviderRegistry = createStarcraftTmgProviderProfileRegistryV2({entries:[{providerProfile:capacityProfile,responsePath:'/responses'}]});
  const structuredEgressBinding = factionExecutionEgressV1(profile), capacityEgressBinding = factionExecutionEgressV1(capacityProfile);
  const beforeNewProviderSend = () => {if(recipe.executionModelBinding) assertFactionExecutionModelNewSendV1(recipe.executionModelBinding);};
  await put('recipe', recipe);
  console.log(JSON.stringify({ event: 'production-preparation', stage: 'dsh_environment_prepare', runId }));
  const dsh = await prepareDshLoop(root, { sessionPolicy: recipe.executionPolicyBinding.sessionPolicy });
  if (dsh.binding.hash !== recipe.dshBindingHash) fail('FACTION_DSH_BINDING_DRIFT');
  console.log(JSON.stringify({ event: 'production-preparation', stage: 'dsh_environment_ready', runId }));
  let activeEditorCapability = structuredCapabilityReceipt;
  let activeReviewCapability = structuredReviewCapabilityReceipt;
  let activeCatalogueCapability;
  let activeSlotReviewCapability;
  let activeTeachCapability;
  const activeNativeCapabilities = {}, activeCapacityCapabilities = {}, activeReviewFragmentCapabilities = {};
  let inheritedCapabilities = null;
  try { inheritedCapabilities = await json('build/ticket-18-faction-production-v1/' + args[4] + '/active-capabilities.json'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (inheritedCapabilities) {
    const capabilityDb = new DatabaseSync(filename, { readOnly: true });
    try {
      for (const [kind, prior] of Object.entries(inheritedCapabilities).filter(([key]) => ['editor', 'review', 'catalogueReview', 'slotReview', 'teach'].includes(key))) {
        if ([structuredCapabilityReceipt.receiptHash, structuredReviewCapabilityReceipt.receiptHash].includes(prior.receiptHash)) continue;
        const paid = capabilityDb.prepare("SELECT response FROM attempts WHERE state='received' AND json_extract(response,'$.value.capabilityReceipt.receiptHash')=? LIMIT 1").get(prior.receiptHash);
        if (!paid || hash(verifySeal(JSON.parse(paid.response)).value.capabilityReceipt) !== hash(prior)) fail('FACTION_CAPABILITY_PARENT_RECEIPT_DRIFT');
      }
      for (const prior of [...Object.values(inheritedCapabilities.nativeProduction || {}),
        ...Object.values(inheritedCapabilities.reviewFragments || {}),
        ...Object.values(inheritedCapabilities.nativeOutputCapacity || {})]) {
        const paid = capabilityDb.prepare("SELECT response FROM attempts WHERE state='received' AND json_extract(response,'$.value.capabilityReceipt.receiptHash')=? LIMIT 1").get(prior.receiptHash);
        if (!paid || hash(verifySeal(JSON.parse(paid.response)).value.capabilityReceipt) !== hash(prior)) fail('FACTION_CAPABILITY_PARENT_RECEIPT_DRIFT');
      }
    } finally { capabilityDb.close(); }
  }
  {
    const renewalWorker = createStarcraftTmgStructuredProviderWorkerPortV1({ providerProfileRegistry: structuredProviderRegistry });
    let renewalAttached;
    try {
      const ingress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
      try { renewalAttached = await renewalWorker.attachCredential({ attachmentId: 'faction-renewal-' + randomUUID(),
        providerProfile: profile, credentialBytes: ingress.credentialBytes }); }
      finally { ingress.credentialBytes.fill(0); }
      if (!renewalAttached.ok) fail('PROVIDER_ATTACHMENT_FAILED');
      const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ maxProbeOutputUnits: 512,
        send: request => {beforeNewProviderSend();return renewalWorker.send({ workerRef: renewalAttached.workerRef, ...request });} });
      activeEditorCapability = await renewFactionCapabilityV1({ store, adapter, binding: structuredEgressBinding,
        contract: structuredEditorContract, prior: inheritedCapabilities?.editor || structuredCapabilityReceipt, priceUsage: priceStructuredUsage });
      activeReviewCapability = await renewFactionCapabilityV1({ store, adapter, binding: structuredEgressBinding,
        contract: structuredReviewContract, prior: inheritedCapabilities?.review || structuredReviewCapabilityReceipt, priceUsage: priceStructuredUsage });
      activeCatalogueCapability = await renewFactionCapabilityV1({ store, adapter, binding: structuredEgressBinding,
        contract: catalogueReviewContract, prior: inheritedCapabilities?.catalogueReview || structuredReviewCapabilityReceipt, priceUsage: priceStructuredUsage });
      activeSlotReviewCapability = await renewFactionCapabilityV1({ store, adapter, binding: structuredEgressBinding,
        contract: slotReviewContract, prior: inheritedCapabilities?.slotReview || activeCatalogueCapability,
        probeSample: { verdicts: [{ targetSlot: 0, focus: [{ path: 'risk', quote: 'probe quote' }],
          verdict: 'uncertain', reason: 'schema probe only', sourceSlots: [0] }],
          coverage: [{ coverageSlot: 0, verdict: 'uncertain', recommendationSlots: [], reason: 'schema probe only' }] },
        priceUsage: priceStructuredUsage });
      activeTeachCapability = await renewFactionCapabilityV1({ store, adapter, binding: structuredEgressBinding,
        contract: structuredTeachContract, prior: inheritedCapabilities?.teach || structuredReviewCapabilityReceipt, priceUsage: priceStructuredUsage });
      for (const [kind, contract] of Object.entries(reviewFragmentContracts)) {
        activeReviewFragmentCapabilities[kind] = await renewFactionCapabilityV1({ store, adapter, binding: structuredEgressBinding,
          contract, prior: inheritedCapabilities?.reviewFragments?.[kind] || activeCatalogueCapability,
          probeSample: kind === 'target' ? { focusPaths: ['risk'], verdict: 'uncertain', reason: 'probe', sourceSlots: [0] }
            : { verdict: 'uncertain', reason: 'probe', recommendationSlots: [] }, priceUsage: priceStructuredUsage });
      }
      for (const [kind, contract] of Object.entries({ ...nativeProductionContracts, proposer_batch: proposerBatchContract })) {
        activeNativeCapabilities[kind] = await renewFactionCapabilityV1({ store, adapter, binding: structuredEgressBinding,
          contract, prior: inheritedCapabilities?.nativeProduction?.[kind] || activeTeachCapability,
          probeSample: kind === 'proposer_batch' ? { plans: [{ index: 0, text: 'x', sourceRefs: ['x'] }], uncertainties: [] }
            : nativeProbeSamples[kind], priceUsage: priceStructuredUsage });
      }
    } finally { await renewalWorker.close().catch(() => {}); }
  }
  {
    const capacityWorker = createStarcraftTmgStructuredProviderWorkerPortV1({ providerProfileRegistry: capacityProviderRegistry });
    try {
      const ingress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
      let attachment;
      try { attachment = await capacityWorker.attachCredential({ attachmentId: 'faction-capacity-probe-' + randomUUID(),
        providerProfile: capacityProfile, credentialBytes: ingress.credentialBytes }); }
      finally { ingress.credentialBytes.fill(0); }
      if (!attachment.ok) fail('PROVIDER_ATTACHMENT_FAILED');
      const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ maxProbeOutputUnits: 512,
        send: request => {beforeNewProviderSend();return capacityWorker.send({ workerRef: attachment.workerRef, ...request });} });
      for (const kind of nativeOutputCapacityBinding.kinds) {
        activeCapacityCapabilities[kind] = await renewFactionCapabilityV1({ store, adapter, binding: capacityEgressBinding,
          contract: nativeProductionContracts[kind], prior: inheritedCapabilities?.nativeOutputCapacity?.[kind] || activeNativeCapabilities[kind],
          probeSample: nativeProbeSamples[kind], priceUsage: priceStructuredUsage, bindingScopedIdentity: true, probeMaxOutputUnits: 512 });
      }
      await put('active-capabilities', seal({ editor: activeEditorCapability, review: activeReviewCapability,
        catalogueReview: activeCatalogueCapability, slotReview: activeSlotReviewCapability, teach: activeTeachCapability, nativeProduction: activeNativeCapabilities,
        reviewFragments: activeReviewFragmentCapabilities,
        nativeOutputCapacity: activeCapacityCapabilities }));
    } finally { await capacityWorker.close().catch(() => {}); }
  }
  const fieldCapabilityPending = new Map();
  const laneRun = await runFactionLanesV1({ inputs, control: parallelControl, failureRouter,
    onProgress: row => console.log(JSON.stringify({ event: 'parallel-lane', ticket: 18, slice: 174, ...row })),
    runLane: async (input, index) => {
  if (quarantinesForInput(input).length && !isMixedLane(input)) throw Object.assign(new Error('Unresolved original delivery; independent lane remains eligible'),
    { code: 'AMBIGUOUS_EGRESS_NO_RETRY' });
  let worker, attached, structuredWorker, structuredAttached, capacityWorker, capacityAttached, mixedRuntime;
  try {
  const name = input.factionRecordKey.split(':')[1];
  await put(name + '-input', input);
  const registry = createStarcraftTmgProviderProfileRegistryV1({ entries: [{ providerProfile: profile, completionPath: '/chat/completions' }], allowedProviders: ['deepseek-openai-compatible-direct'] });
  worker = createStarcraftTmgProviderEgressWorkerPortV2({ providerProfileRegistry: registry, maxWorkers: 1, maxOutputBytes: 256 * 1024 });
  const ingress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
  try { attached = await worker.attachCredential({ attachmentId: 'faction-' + randomUUID(), providerProfile: profile, credentialBytes: ingress.credentialBytes }); }
  finally { ingress.credentialBytes.fill(0); }
  if (!attached.ok) fail('PROVIDER_ATTACHMENT_FAILED');
  structuredWorker = createStarcraftTmgStructuredProviderWorkerPortV1({
    providerProfileRegistry: structuredProviderRegistry,
  });
  const structuredIngress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
  try {
    structuredAttached = await structuredWorker.attachCredential({
      attachmentId: 'faction-structured-' + randomUUID(),
      providerProfile: profile,
      credentialBytes: structuredIngress.credentialBytes,
    });
  } finally { structuredIngress.credentialBytes.fill(0); }
  if (!structuredAttached.ok) fail('STRUCTURED_PROVIDER_ATTACHMENT_FAILED');
  const structuredProviderAdapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({
    maxProbeOutputUnits: 512,
    send: request => {beforeNewProviderSend();return structuredWorker.send({
      workerRef: structuredAttached.workerRef,
      ...request,
    });},
  });
  capacityWorker = createStarcraftTmgStructuredProviderWorkerPortV1({ providerProfileRegistry: capacityProviderRegistry });
  const capacityIngress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
  try { capacityAttached = await capacityWorker.attachCredential({ attachmentId: 'faction-native-capacity-' + randomUUID(),
    providerProfile: capacityProfile, credentialBytes: capacityIngress.credentialBytes }); }
  finally { capacityIngress.credentialBytes.fill(0); }
  if (!capacityAttached.ok) fail('STRUCTURED_PROVIDER_ATTACHMENT_FAILED');
  const capacityAdapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({
    send: request => {beforeNewProviderSend();return capacityWorker.send({ workerRef: capacityAttached.workerRef, ...request });} });
  const wireRecovery = await createFactionWireRecoveryEnvironmentV2({ filename, runId, helperRef: recipe.wireKeyHelperRef,
    providers: [{ egressBinding: structuredEgressBinding,
      send: request => {beforeNewProviderSend();return structuredWorker.send({ workerRef: structuredAttached.workerRef, ...request });} },
    { egressBinding: capacityEgressBinding,
      send: request => {beforeNewProviderSend();return capacityWorker.send({ workerRef: capacityAttached.workerRef, ...request });} }] });
  const model = createFactionAccountedModelV1({ store, recovery: commandRecovery, additionalRecoveries,
    executionModelBinding:recipe.executionModelBinding || null,
    maxInputBytes: limits.maxInputBytes, outputRecoveryLimit: 4096,
    wireSyntaxRetryAllowed: false,
    complete: (providerRequest, { signal } = {}) => {
      beforeNewProviderSend();
      if (Date.now() - began >= limits.maxWallMs) fail('FACTION_RUN_WALL_EXHAUSTED');
      return worker.complete({ workerRef: attached.workerRef, providerRequest, signal });
    }, onUsage: ledger => console.log(JSON.stringify({ event: 'usage', calls: ledger.calls, tokens: ledger.knownTokens,
      runEstimateOrReserveCny: ledger.reservedOrSettledMicros / 1e6,
      cumulativeEstimateOrReserveCny: (historyMicros + store.globalSummary().reservedOrSettledMicros) / 1e6 })) });
  const runtime = bindFactionLaneRuntimeV1(createProductionRuntimeV3({ store,
    reader: createEvidenceReader(catalogue), context, verifier: {}, model, dsh,
    onProgress: row => console.log(JSON.stringify({ event: 'role', ticket: 18, slice: 174, faction: name, ...row })) }), input);
    const structuredRuntime = createFactionStructuredLocalEditorRuntimeV1({
      input, runtime, store, dsh, wireRecovery, providerAdapter: structuredProviderAdapter,
      editorEnvelopeBinding, draftEnvelopeBinding,
      editorEnvelopeImports: continuation?.editorEnvelopeFailureImports || [],
      readEditorEnvelopeFailure: ({ prepared, failureReceiptHash }) => readFactionTeachFailureEvidenceV1({ filename,
        runId, fullRoleId: prepared.roleRef.id, failureReceiptHash }),
      egressBinding: structuredEgressBinding,
      capabilityReceipt: activeEditorCapability,
      outputContract: structuredEditorContract,
      executionPolicy: structuredEditorPolicy,
      priceUsage: priceStructuredUsage,
      imports: index === 0 ? [structuredEditorImport] : [],
      legacyPromptRoleIds,
      onProgress: row => console.log(JSON.stringify({ event: 'structured-role',
        ticket: 18, slice: 174, faction: name, ...row,
        cumulativeEstimateOrReserveCny: (historyMicros
          + store.globalSummary().reservedOrSettledMicros) / 1e6 })),
    });
    const structuredReviewRuntime = createFactionStructuredReviewRuntimeV1({
      input, runtime: structuredRuntime, store, dsh, wireRecovery,
      providerAdapter: structuredProviderAdapter,
      egressBinding: structuredEgressBinding,
      capabilityReceipt: activeReviewCapability,
      outputContract: structuredReviewContract,
      executionPolicy: structuredReviewPolicy,
      priceUsage: priceStructuredUsage,
      legacyStructuredReviewRoleIds,
      schemaRepairImports: structuredReviewSchemaRepairImports,
      allowBoundedOutputCapRecovery: true,
      outputCapRecoveryImports: structuredReviewOutputCapRecoveryImports,
      outputCapRecoverySuccessImports:
        structuredReviewOutputCapSuccessImports,
      onProgress: row => console.log(JSON.stringify({ event: 'structured-role',
        ticket: 18, slice: 174, faction: name, ...row,
        cumulativeEstimateOrReserveCny: (historyMicros
          + store.globalSummary().reservedOrSettledMicros) / 1e6 })),
    });
    if (isMixedLane(input)) mixedRuntime = createFactionMixedProductionRuntimeV1({ filename, recipe,
      parentRunId: args[4], parentRecipe, input, diagnosis: reviewDecompositionDiagnosis,
      openingFenceRecovery: wireAddressRecovery.openingFenceRecovery, store, dsh, wireRecovery,
      providerAdapter: structuredProviderAdapter, egressBinding: structuredEgressBinding, capabilities: activeReviewFragmentCapabilities,
      priceUsage: priceStructuredUsage, onProgress: row => console.log(JSON.stringify({ event: 'mixed-review', ticket: 18, slice: 174,
        faction: name, ...row, cumulativeEstimateOrReserveCny: (historyMicros + store.globalSummary().reservedOrSettledMicros) / 1e6 })) });
    const reviewDecompositionRuntime = mixedRuntime || createFactionReviewDecompositionRuntimeV1({ store, dsh, wireRecovery,
      providerAdapter: structuredProviderAdapter, egressBinding: structuredEgressBinding, capabilities: activeReviewFragmentCapabilities,
      openingFenceRecovery: wireAddressRecovery.openingFenceRecovery,
      priceUsage: priceStructuredUsage,
      readOrigin: q => readFactionWireReviewFailureV1({ filename, runId: q.evidence.runId, attemptId: q.evidence.attemptId,
        capsule: q.capsule, invocation: q.evidence.originalInvocation, providerRequest: reviewDecompositionDiagnosis.providerRequest }),
      readSuccessEvidence: q => readFactionStructuredSuccessEvidenceV1({ filename, ...q }),
      onProgress: row => console.log(JSON.stringify({ event: 'review-decomposition', ticket: 18, slice: 174, faction: name, ...row,
        cumulativeEstimateOrReserveCny: (historyMicros + store.globalSummary().reservedOrSettledMicros) / 1e6 })) });
    const makeCurrentReviewRuntime = includeSharedScenarioSources => createFactionStructuredReviewRuntimeV1({ input, runtime: structuredRuntime, store, dsh, wireRecovery,
      providerAdapter: structuredProviderAdapter, egressBinding: structuredEgressBinding,
      capabilityReceipt: activeCatalogueCapability, outputContract: catalogueReviewContract,
      executionPolicy: structuredReviewPolicy, priceUsage: priceStructuredUsage,
      reviewDecomposition: { binding: reviewDecompositionBinding,
        origins: input.hash === reviewDecompositionDiagnosis.inputHash ? [reviewDecompositionEvidence] : [], runtime: reviewDecompositionRuntime },
      allowBoundedOutputCapRecovery: true,
      recoveryBudgetBinding: reviewRecoveryBudgetBinding,
      completeReviewImports: [...[metadataRecoveryReadiness, targetCompletionReadiness, targetIdReviewReadiness, explicitSlotReviewReadiness].filter(g => input.hash === g.reviewInputHash)
        .map(g => readFactionStructuredSuccessEvidenceV1({ filename, runId: g.originRunId, attemptId: g.reviewOriginAttemptId })),
        ...wireAddressRecovery.completeReviewImports.filter(row => row.inputHash === input.hash).map(row => row.evidence)],
      coverageAddressBinding: wireAddressRecovery.recipeFields.dualCoordinateReviewBinding.coverageAddress,
      completeReviewImportBinding: wireAddressRecovery.recipeFields.dualCoordinateReviewBinding.reviewImport,
      focusCapacityImports: input.hash === reviewFocusCapacityReadiness.inputHash ? [readFactionTeachFailureEvidenceV1({ filename,
        runId: reviewFocusCapacityReadiness.originRunId, attemptId: reviewFocusCapacityReadiness.originAttemptId })] : [],
      readFocusCapacityFailure: ({ roleRef, failureReceiptHash }) => readFactionTeachFailureEvidenceV1({ filename,
        runId, fullRoleId: roleRef.id, failureReceiptHash }),
      outputCapRecoverySuccessImports: structuredReviewOutputCapSuccessImports,
      includeSharedScenarioSources,
      onProgress: row => console.log(JSON.stringify({ event: 'structured-role', ticket: 18, slice: 174, faction: name, ...row,
        cumulativeEstimateOrReserveCny: (historyMicros + store.globalSummary().reservedOrSettledMicros) / 1e6 })) });
    const catalogueRuntime = createFactionCatalogueReviewRuntimeV1({ input, legacyRuntime: structuredReviewRuntime,
      currentRuntime: makeCurrentReviewRuntime(true), frozenCurrentRuntime: makeCurrentReviewRuntime(false),
      frozenCurrentRoleIds: catalogueFrozenCurrentRoleIds, includeSharedScenarioSources: true,
      legacyRoleIds: catalogueLegacyRoleIds, store, executionPolicy: structuredReviewPolicy });
    const readParsedWireRecovery = await createFactionParsedWireRecoveryReaderV2({ root, filename, runId, recipe });
    const ensureFieldCapability = createFactionFieldValueCapabilityResolverV1({ filename, store,
      allowedRunIds: [runId, ...fieldRecoveryScope.ancestors.map(r => 'faction-v1-' + r.hash.slice(0, 20))],
      adapter: structuredProviderAdapter, egressBinding: structuredEgressBinding, seedCapability: activeSlotReviewCapability,
      priceUsage: priceStructuredUsage, pending: fieldCapabilityPending });
    const readFieldSourceHandoff = createFactionFieldSourceReaderV1({ filename, recipe, ancestors: fieldRecoveryScope.ancestors,
      runId, input, allowCurrentRunning: true });
    const baseCompleteFieldValues = createFactionFieldValueCompleterV1({ filename, recipe, ancestors: fieldRecoveryScope.ancestors,
      runId, input, store, dsh, providerAdapter: structuredProviderAdapter, wireRecovery,
      egressBinding: structuredEgressBinding, ensureCapability: ensureFieldCapability, priceUsage: priceStructuredUsage,
      stopForSourceContext: true,
      onProgress: row => console.log(JSON.stringify({ event: 'field-value-completion', ticket: 18, slice: 174, faction: name, ...row,
        cumulativeEstimateOrReserveCny: (historyMicros + store.globalSummary().reservedOrSettledMicros) / 1e6 })) });
    const sourceCompleteFieldValues = withFactionFieldSourceCompletionV1({ baseCompleter: baseCompleteFieldValues,
      readHandoff: readFieldSourceHandoff,
      completeSourceContext: (prepared, handoff) => completeFactionFieldSourceContextV1({ prepared, handoff,
        readHandoff: readFieldSourceHandoff, runtimeOptions: nativeSlotOptions }),
      onProgress: row => console.log(JSON.stringify({ event: 'field-source-handoff', ticket: 18, slice: 174, faction: name, ...row })) });
    const contractProjectionResolver = createFactionContractProjectionResolverV1({ filename, recipe, ancestors: fieldRecoveryScope.ancestors,
      runId, input, store, dsh });
    const completeFieldValues = withFactionContractProjectionCompleterV1({ resolver: contractProjectionResolver,
      baseCompleter: sourceCompleteFieldValues });
    const nativeSlotOptions = { input, runtime: catalogueRuntime, store, dsh, wireRecovery,
      providerAdapter: structuredProviderAdapter, egressBinding: structuredEgressBinding,
      capabilityReceipt: activeSlotReviewCapability, outputContract: slotReviewContract,
      executionPolicy: structuredReviewPolicy, priceUsage: priceStructuredUsage,
      includeSharedScenarioSources: true, reviewSlotNamespaceBinding: recipe.reviewSlotNamespaceBinding,
      reviewSourceExpansionBinding: recipe.reviewSourceExpansionBinding, readPriorReviewAttempt,
      parsedWireSchemaBridgeBinding: recipe.parsedWireSchemaBridgeBinding, readParsedWireRecovery,
      parsedReviewValueBinding: recipe.parsedReviewValueBinding,
      readReviewArtifact: artifactHash => readFactionReviewArtifactByHashV1({ filename, artifactHash,
        allowedRunIds: [runId, ...(recipe.continuation?.checkpointInventory?.ancestors || []).map(r => r.runId)] }),
      fieldValueBinding: recipe.fieldValueBinding, completeFieldValues,
      onProgress: row => console.log(JSON.stringify({ event: 'structured-slot-review', ticket: 18, slice: 174, faction: name, ...row,
        cumulativeEstimateOrReserveCny: (historyMicros + store.globalSummary().reservedOrSettledMicros) / 1e6 })) };
    const nativeSlotBaseRuntime = createFactionStructuredReviewRuntimeV1(nativeSlotOptions);
    const nativeSlotRuntime = createFactionStructuralReviewLaneV1({ root, filename, runId, recipe, input,
      runtime: nativeSlotBaseRuntime, store, dsh, executionPolicy: structuredReviewPolicy,
      onProgress: row => console.log(JSON.stringify({ event: 'structural-json-recovery', ticket: 18, slice: 174, faction: name, ...row })) });
    const slotRuntime = createFactionSlotReviewRuntimeV1({ input, legacyRuntime: catalogueRuntime, nativeRuntime: nativeSlotRuntime,
      store, dsh, executionPolicy: structuredReviewPolicy, legacyRoleIds: factionMixedReviewLegacyRoleIdsV1(recipe, recipe.slotReviewLegacyRoleIds),
      recoveryOrigins: recipe.slotReviewRecoveryOrigins, readRecoveryEvidence: slotReviewEnvironment.readRecoveryEvidence,
      reviewSlotNamespaceBinding: recipe.reviewSlotNamespaceBinding,
      onProgress: row => console.log(JSON.stringify({ event: 'slot-review-recovery', ticket: 18, slice: 174, faction: name, ...row })) });
    const fieldRuntime = createFactionFieldRecoveryLaneV1({ filename, recipe, ancestors: fieldRecoveryScope.ancestors,
      runId, input, runtime: slotRuntime, store, dsh, executionPolicy: structuredReviewPolicy, completeFieldValues,
      onProgress: row => console.log(JSON.stringify({ event: 'field-recovery', ticket: 18, slice: 174, faction: name, ...row })) });
    const contractProjectionRuntime = createFactionContractProjectionLaneV1({ recipe, input, runtime: fieldRuntime, store,
      resolver: contractProjectionResolver, executionPolicy: structuredReviewPolicy,
      onProgress: row => console.log(JSON.stringify({ event: 'contract-projection', ticket: 18, slice: 174, faction: name, ...row })) });
    const nativeTeachRuntime = createFactionStructuredTeachRuntimeV1({ input, runtime: contractProjectionRuntime, store, dsh, wireRecovery,
      providerAdapter: structuredProviderAdapter, egressBinding: structuredEgressBinding,
      capabilityReceipt: activeTeachCapability, executionPolicy: structuredReviewPolicy, priceUsage: priceStructuredUsage,
      onProgress: row => console.log(JSON.stringify({ event: 'structured-teach', ticket: 18, slice: 174, faction: name, ...row,
        cumulativeEstimateOrReserveCny: (historyMicros + store.globalSummary().reservedOrSettledMicros) / 1e6 })) });
    const uncertainTeachRuntime = withFactionTeachUncertaintyRecoveryV1({ input, runtime: nativeTeachRuntime, store, dsh,
      executionPolicy: structuredReviewPolicy,
      importedEvidence: input.hash === teachUncertaintyReadiness.inputHash ? [readFactionTeachFailureEvidenceV1({ filename,
        runId: teachUncertaintyReadiness.originRunId, attemptId: teachUncertaintyReadiness.originAttemptId })] : [],
      readCurrentFailure: ({ prepared, failureReceiptHash }) => readFactionTeachFailureEvidenceV1({ filename,
        runId, fullRoleId: prepared.fullRoleId, failureReceiptHash }),
      onProgress: row => console.log(JSON.stringify({ event: 'teach-recovery', ticket: 18, slice: 174, faction: name, ...row })) });
    const teachRuntime = createFactionNativeProductionRuntimeV1({ input,
      executionModelBinding:recipe.executionModelBinding || null,
      runtime: withFactionTeachOutputBudgetV1(uncertainTeachRuntime, teachOutputBudgetBinding), store, dsh, wireRecovery,
      providerAdapter: structuredProviderAdapter, egressBinding: structuredEgressBinding,
      capabilities: activeNativeCapabilities, executionPolicy: structuredReviewPolicy, priceUsage: priceStructuredUsage,
      proposerBatchBinding, proposerAuxiliaryCapacityBinding, targetReconstructionBinding: nativeTargetReconstructionBinding,
      draftEnvelopeBinding, draftEnvelopeImports: draftEnvelopeImports.filter(e =>
        e.rejected.roleRef.id.startsWith('faction.' + name + '.')),
      proposerAuxiliaryImports: proposerAuxiliaryReadiness.origins.filter(row => row.inputHash === input.hash)
        .map(row => readFactionTeachFailureEvidenceV1({ filename, runId: row.originRunId, attemptId: row.originAttemptId })),
      readProposerAuxiliaryFailure: ({ prepared, failureReceiptHash }) => readFactionTeachFailureEvidenceV1({ filename,
        runId, fullRoleId: prepared.fullRoleId, failureReceiptHash }),
      outputCapacity: { binding: nativeOutputCapacityBinding, frozenRoleIds: nativeOutputCapacityFrozenRoleIds,
        providerAdapter: capacityAdapter, egressBinding: capacityEgressBinding, capabilities: activeCapacityCapabilities },
      answerCompletionEnabled: true,
      answerCompletionImports: input.hash === targetCompletionReadiness.nativeInputHash ? [readFactionTeachFailureEvidenceV1({ filename,
        runId: targetCompletionReadiness.originRunId, attemptId: targetCompletionReadiness.nativeOriginAttemptId })] : [],
      referenceSetImports: input.hash === metadataRecoveryReadiness.nativeInputHash ? [readFactionTeachFailureEvidenceV1({ filename,
        runId: metadataRecoveryReadiness.originRunId, attemptId: metadataRecoveryReadiness.nativeOriginAttemptId })] : [],
      readReferenceSetFailure: ({ prepared, failureReceiptHash }) => readFactionTeachFailureEvidenceV1({ filename,
        runId, fullRoleId: prepared.fullRoleId, failureReceiptHash }),
      legacyRoleIds: (continuation?.steps || []).filter(row => !usesFactionNativeProductionInputV1(row.artifact)).map(row => row.id),
      onProgress: row => console.log(JSON.stringify({ event: 'native-production', ticket: 18, slice: 174, faction: name, ...row })) });
    const factionRuntime = useReviewTransaction ? createFactionReviewTransactionRuntimeV1({ input, runtime: teachRuntime, store,
      phaseFieldSeed: index === 0 ? phaseFieldSeed : null, draftEnvelopeBinding }) : teachRuntime;
    if (useReviewTransaction && factionRuntime.binding.hash !== reviewTransactionBindings[index].hash)
      fail('FACTION_REVIEW_TRANSACTION_RUNTIME_DRIFT');
    const candidate = await produceFactionStrategyV1({ input, runtime: withFactionEventLoopYieldV1(factionRuntime), store, knownRulePolicy: knownRulePolicies[index],
      observedSourceRepair: { binding: observedSourceRepairBinding, facts: observedRosterFacts[index] },
      proposerBatches: { binding: proposerBatchBinding, frozenRoleIds: proposerBatchFrozenRoleIds,
        auxiliaryCapacityBinding: proposerAuxiliaryCapacityBinding }, uniqueRiskClauseBinding, draftEnvelopeBinding, initialSourceCorrectionBinding, zergUnitTimingBinding,
      registeredSourceFieldRepair: true,
      legacyPromptRoleIds,
      structuredReviewValidationBinding,
      catalogueReviewBinding, reviewSlotNamespaceBinding: recipe.reviewSlotNamespaceBinding,
      tutorRecovery: teachRecoveryBindings.find(row => row.inputHash === input.hash) || null,
      fieldRepairSeed: index === 0 ? fieldRepairSeed : null,
      phaseFieldSeed: index === 0 ? phaseFieldSeed : null,
      onProgress: row => console.log(JSON.stringify({ event: 'faction-progress', ticket: 18, slice: 174, faction: name, ...row })) });
    candidates[index] = candidate; await put(name + '-candidate', candidate);
    await writeFile(path.join(out, name + '-candidate.md'), renderFactionStrategyV1(candidate));
    console.log(JSON.stringify({ event: 'faction-generated', faction: name, hash: candidate.hash, sections: candidate.sections.length, semanticReviewPassed: candidate.semanticReviewPassed }));
    if (!candidate.semanticReviewPassed) fail('FACTION_SOURCE_REVIEW_NOT_PASSED');
    return candidate;
  } finally {
    mixedRuntime?.close();
    if (capacityAttached?.workerRef) await capacityWorker.detachCredential({ workerRef: capacityAttached.workerRef, reason: 'faction_lane_finished' }).catch(() => {});
    await capacityWorker?.close().catch(() => {});
    if (structuredAttached?.workerRef) await structuredWorker.detachCredential({ workerRef: structuredAttached.workerRef, reason: 'faction_lane_finished' }).catch(() => {});
    await structuredWorker?.close().catch(() => {});
    if (attached?.workerRef) await worker.detachCredential({ workerRef: attached.workerRef, reason: 'faction_lane_finished' }).catch(() => {});
    await worker?.close().catch(() => {});
  }
  } });
  parallelReceipt = laneRun.receipt;
  await put('parallel-execution', parallelReceipt);
  const rejected = laneRun.results.find(row => row.status === 'rejected');
  if (rejected) throw rejected.reason;
} catch (error) { failure = { code: /^[A-Z0-9_]{3,100}$/.test(error.code || '') ? error.code : 'FACTION_RUN_FAILURE', diagnosticHash: hash(String(error.message)),
  failureRouting: error.diagnostic?.failureRouting || failureRouter.route(error) }; }
finally {
  const completedCandidates = candidates.filter(Boolean);
  const ledger = store.summary(), global = store.globalSummary();
  const report = seal({ runId, recipeHash: recipe.hash, overallDependencyHash: overallDependency.hash,
    readinessHashes: [structuredGenerationReadiness,
      structuredReviewReadiness,
      reviewFocusNormalizationReadiness, draftPolicyReadiness, ...gates,
      ...unitRoleRepairGates, ...sourceCorrectionGates].map(g => g.hash),
    parallelReceipt, quarantinedTasks,
    candidateHashes: completedCandidates.map(c => c.hash), factionsGenerated: completedCandidates.length,
    sourceReviewPassed: !failure && completedCandidates.length === 2 && completedCandidates.every(c => c.semanticReviewPassed), failure, ledger,
    continuation: continuation?.manifest || null, cumulativeKnownTokensLowerBound: historyTokens + global.knownTokens,
    cumulativeEstimateOrReserveCny: (historyMicros + global.reservedOrSettledMicros) / 1e6,
    budgetEpoch: factionBudgetEpochProgressV1({ extension: recipe.budgetExtension, global }),
    ctx2skillLoopUsed: true, harnessLoopUsed: true, targetGames: ['starcraft-tmg'],
    roleRoutes: ['Teach', 'Ctx2Skill', 'Challenger', 'Reasoner', 'Judge', 'Proposer', 'Generator', 'structured_source_reviewer', 'structured_local_editor'],
    independentEvaluationPerformed: false, actualRoomReplayPerformed: false, strategyEffectivenessProven: false,
    formalSkillsAccepted: 0, promotions: [],
    costNotificationReceiptHash: costNotificationReceipt?.hash || null,
    nextCostNotificationThresholdMicros:
      costNotificationReceipt?.nextThresholdMicros || 100_000_000,
    sourceRefreshPerformed: false, trainingTruth: false, elapsedMs: Date.now() - began });
  await put('report', report);
  console.log(JSON.stringify({ event: 'report', runId, factionsGenerated: report.factionsGenerated,
    sourceReviewPassed: report.sourceReviewPassed, failure, tokens: ledger.knownTokens,
    cumulativeTokens: report.cumulativeKnownTokensLowerBound, cumulativeCny: report.cumulativeEstimateOrReserveCny, hash: report.hash })); routingDb.close(); store.close();
}
if (failure) process.exitCode = 1;
