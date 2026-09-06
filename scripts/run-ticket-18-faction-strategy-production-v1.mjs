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
import { inspectFactionContinuationV1 } from '../packages/skill-production-v3/faction-continuation-v1.mjs';
import { inspectFactionFieldRepairEvidenceV1 } from '../packages/skill-evaluation/faction-field-repair-evidence-v1.mjs';
import { validateFactionFieldRepairSeedV1 } from '../packages/skill-production-v3/faction-field-repair-seed-v1.mjs';
import { inspectFactionPhaseFieldEvidenceV1 } from '../packages/skill-evaluation/faction-phase-field-evidence-v1.mjs';
import { validateFactionPhaseFieldSeedV1 } from '../packages/skill-production-v3/faction-phase-field-seed-v1.mjs';
import { createFactionBudgetExtensionV1, projectFactionCumulativeCostV1 } from '../packages/skill-production-v3/faction-budget-extension-v1.mjs';
import { createFactionReviewTransactionBindingV1, createFactionReviewTransactionRuntimeV1 } from '../packages/skill-production-v3/faction-review-transaction-runtime-v1.mjs';
import { createFactionStructuredLocalEditorImportV1, createFactionStructuredLocalEditorRuntimeV1,
  deriveFactionLegacyPromptRoleIdsV1 } from '../packages/skill-production-v3/faction-structured-local-editor-runtime-v1.mjs';
import { createFactionStructuredReviewRuntimeV1,
  deriveFactionLegacyStructuredReviewRoleIdsV1 } from '../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs';
import { createFactionKnownRulePolicyV1 } from '../packages/skill-production-v3/faction-known-rule-findings-v1.mjs';
import { createFactionRosterChoiceDrillsV1 } from '../packages/skill-evaluation/faction-roster-choice-drills-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { withCheckpointContinuation } from '../packages/skill-production/continuation.mjs';
import { prepareDshLoop, runDirectLoop } from '../packages/skill-production/loops.mjs';
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
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { verifyStarcraftTmgProviderCapabilityCurrentV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), args = process.argv.slice(2);
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
const db = new DatabaseSync(filename, { readOnly: true });
try {
  if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (db.prepare("SELECT count(*) n FROM attempts WHERE state='intent'").get().n) fail('AMBIGUOUS_EGRESS_NO_RETRY');
} finally { db.close(); }
// Inspect actual base production and actual guide requests/answers before any
// Keychain access. Uploaded or model-authored qualification flags are not used.
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
if (!structuredCapabilityCurrent.ok) fail('FACTION_STRUCTURED_CAPABILITY_NOT_CURRENT');
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
  fail('FACTION_STRUCTURED_REVIEW_CAPABILITY_NOT_CURRENT');
}
const priceStructuredUsage = (usage, receipt = {}) => {
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
const budgetExtension = args[7] ? createFactionBudgetExtensionV1(parentRecipe) : parentRecipe.budgetExtension || null;
const budgetReadiness = budgetExtension ? await json('build/ticket-18-faction-production-v1/budget-extension-readiness.json') : null;
if (budgetReadiness) {
  if (!budgetReadiness.passed || budgetReadiness.providerCalls !== 0) fail('FACTION_BUDGET_READINESS_INVALID');
  for (const row of budgetReadiness.codeHashes) if (sha256(await readFile(path.join(root, row.file))) !== row.hash)
    fail('FACTION_BUDGET_READINESS_CODE_DRIFT');
}
const recoveryParentRunId = parentRecipe.commandRecoveryBinding?.parentRunId || args[4];
const recoveryParent = recoveryParentRunId === args[4] ? parentRecipe : await json('build/ticket-18-faction-production-v1/' + recoveryParentRunId + '/recipe.json');
const commandRecovery = inspectFactionCommandRecoveryV1({ filename, parentRunId: recoveryParentRunId, parent: recoveryParent });
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
  'packages/skill-production-v3/faction-structured-local-editor-runtime-v1.mjs',
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
if (budgetExtension) files.push('packages/skill-production-v3/faction-budget-extension-v1.mjs');
if (useReviewTransaction) files.push('packages/skill-production-v3/faction-review-transaction-runtime-v1.mjs',
  'packages/skill-production-v3/faction-review-transaction-migration-v1.mjs',
  'packages/skill-production-v3/faction-source-dependency-context-v1.mjs',
  'packages/skill-production-v3/faction-repair-regression-guard-v1.mjs');
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const limits = budgetExtension?.nextLimits || { maxCalls: 400, maxCostMicros: 20_000_000, maxTokens: 60_000_000, maxWallMs: 8 * 60 * 60 * 1000, maxInputBytes: 1_000_000, maxRevisions: 3 };
const next = seal({ version: 'faction_strategy_production_v1', overallRunId: args[2], overallDependencyHash: overallDependency.hash,
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
  const parent = parentRecipe;
  const parentReport = await json('build/ticket-18-faction-production-v1/' + args[4] + '/report.json');
  const before = await json('build/ticket-17-production-redesign-v1/readiness-' + parent.mainReadinessHash + '.json');
  continuation = inspectFactionContinuationV1({ filename, parentRunId: args[4], parent, parentReport, next,
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
    reviewTransactionMigration: useReviewTransaction ? { readiness: reviewTransactionReadiness, actualEvidence: reviewTransactionEvidence } : null });
}
const { hash: ignored, ...nextBody } = next;
const recipe = continuation ? seal({ ...nextBody, continuation: continuation.manifest }) : next;
const canonicalPromptRoleId = id => id.replace(/\.source-evidence-v1\.[a-f0-9]{20}$/u, '');
const legacyPromptRoleIds = continuation
  ? deriveFactionLegacyPromptRoleIdsV1(continuation.steps) : [];
const legacyStructuredReviewRoleIds = continuation
  ? deriveFactionLegacyStructuredReviewRoleIdsV1(continuation.steps) : [];
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
if (args[0] === '--preflight') {
  // Exercise exact inherited role input hashes without credentials or egress.
  // Initial cutover has one exact expected editor. Later continuations derive
  // the next miss from the sealed lineage and must never reissue a reusable role.
  let firstUncachedRole = null, firstUncachedRoute = null;
  const dryLocal = openProductionStore(':memory:', { runId: 'faction-cutover-' + recipe.hash.slice(0, 20), recipeHash: recipe.hash,
    maxCalls: limits.maxCalls - (continuation?.manifest.accounting.calls || 0),
    maxTokens: limits.maxTokens - (continuation?.manifest.accounting.tokens || 0),
    maxCostMicros: limits.maxCostMicros - (continuation?.manifest.accounting.costMicros || 0) });
  const dryStore = continuation ? withCheckpointContinuation(dryLocal, continuation) : dryLocal;
  try {
    const dryRuntime = createProductionRuntimeV3({ store: dryStore, reader: createEvidenceReader(catalogue), context, verifier: {},
      model: async request => { firstUncachedRole = request.stageId; firstUncachedRoute = 'legacy_typed_validation';
        fail('FACTION_PREFLIGHT_FIRST_LEGACY_UNCACHED_ROLE'); },
      dsh: { run: runDirectLoop } });
    const dryStructuredRuntime = createFactionStructuredLocalEditorRuntimeV1({
      input: inputs[0], runtime: dryRuntime, store: dryStore,
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
      input: inputs[0], runtime: dryStructuredRuntime, store: dryStore,
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
    });
    const dryFactionRuntime = useReviewTransaction ? createFactionReviewTransactionRuntimeV1({ input: inputs[0], runtime: dryStructuredReviewRuntime,
      store: dryStore, phaseFieldSeed }) : dryStructuredReviewRuntime;
    await produceFactionStrategyV1({ input: inputs[0], runtime: dryFactionRuntime, store: dryStore,
      knownRulePolicy: knownRulePolicies[0], registeredSourceFieldRepair: true, fieldRepairSeed, phaseFieldSeed,
      legacyPromptRoleIds });
    fail('FACTION_PREFLIGHT_CUTOVER_MISSING');
  } catch (error) {
    if (!['STRUCTURED_DSH_MODEL_OUTCOME_NOT_ACCEPTED',
      'FACTION_PREFLIGHT_FIRST_LEGACY_UNCACHED_ROLE'].includes(error.code)) throw error;
  } finally { dryLocal.close(); }
  const factionPrefix = 'faction.terran_armed_forces';
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
  if (!firstUncachedRole || !fullUncachedRole.startsWith(factionPrefix + '.' + factionPrefix + '.')
    || !/^[a-z0-9._-]+$/u.test(fullUncachedRole)
    || reusableRoleIds.has(fullUncachedRole)
      && !structuredReviewContractChanged
    || initialStructuredCutover && (firstUncachedRoute !== 'responses_json_schema'
      || firstUncachedRole !== 'faction.terran_armed_forces.objectives.1.editor.0.2')
    || initialStructuredReviewCutover
      && (firstUncachedRoute !== 'responses_json_schema'
        || firstUncachedRole !== 'faction.terran_armed_forces.objectives.1.review-target-batch-v1.supportive.2.0')
    || structuredReviewContractChanged
      && firstUncachedRoute !== 'responses_json_schema') {
    fail('FACTION_PREFLIGHT_CUTOVER_DRIFT', { firstUncachedRole, firstUncachedRoute });
  }
  console.log(JSON.stringify({ ready: true, recipeHash: recipe.hash, providerCalls: 0, factions: inputs.map(i => i.factionRecordKey),
    sections: inputs.map(i => createFactionWritingPlanV1(i).sections.length), overallQualified: true, limits,
    reusableRoles: continuation?.manifest.reusable.length || 0, inheritedAccounting: continuation?.manifest.accounting || null,
    legacyPromptRoles: legacyPromptRoleIds.length, structuredCanaryImport: structuredEditorImport.hash,
    legacyStructuredReviewRoles: legacyStructuredReviewRoleIds.length,
    structuredReviewSchemaRepairImports:
      structuredReviewSchemaRepairImports.length,
    structuredReviewCapabilityRunId: structuredReviewCapabilityReport.runId,
    firstUncachedRole, firstUncachedRoute, initialStructuredCutover,
    initialStructuredReviewCutover, structuredReviewContractChanged,
    additionalCommandRecoveries: additionalRecoveries.length })); process.exit(0);
}
const runId = 'faction-v1-' + recipe.hash.slice(0, 20), out = path.join(base, runId); await mkdir(out, { recursive: true });
const inherited = continuation?.manifest.accounting || { calls: 0, tokens: 0, costMicros: 0 };
const localStore = openProductionStore(filename, { runId, recipeHash: recipe.hash,
  maxCalls: limits.maxCalls - inherited.calls, maxTokens: limits.maxTokens - inherited.tokens, maxCostMicros: limits.maxCostMicros - inherited.costMicros });
const store = continuation ? withCheckpointContinuation(localStore, continuation) : localStore;
const start = store.acquire('production-start', { recipeHash: recipe.hash });
const began = start.cached ? start.artifact.began : store.finish(start, { began: continuation?.manifest.parentStart || Date.now() }).began;
const historyTokens = 2_864_424, historyMicros = 5_052_393 + 28_961_350;
const put = (name, value) => writeFile(path.join(out, name + '.json'), JSON.stringify(value, null, 2));
let worker, attached, structuredWorker, structuredAttached, failure = null;
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
  if (costProjection.projectedMaximumCumulativeMicros >= 100_000_000)
    fail('CNY_100_NOTIFICATION_REQUIRED');
  if (Date.now() - began >= limits.maxWallMs) fail('FACTION_RUN_WALL_EXHAUSTED');
  await put('recipe', recipe);
  const dsh = await prepareDshLoop(root);
  if (dsh.binding.hash !== recipe.dshBindingHash) fail('FACTION_DSH_BINDING_DRIFT');
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
    send: request => structuredWorker.send({
      workerRef: structuredAttached.workerRef,
      ...request,
    }),
  });
  const model = createFactionAccountedModelV1({ store, recovery: commandRecovery, additionalRecoveries,
    maxInputBytes: limits.maxInputBytes, outputRecoveryLimit: 4096,
    wireSyntaxRetryAllowed: false,
    complete: (providerRequest, { signal } = {}) => {
      if (Date.now() - began >= limits.maxWallMs) fail('FACTION_RUN_WALL_EXHAUSTED');
      return worker.complete({ workerRef: attached.workerRef, providerRequest, signal });
    }, onUsage: ledger => console.log(JSON.stringify({ event: 'usage', calls: ledger.calls, tokens: ledger.knownTokens,
      runEstimateOrReserveCny: ledger.reservedOrSettledMicros / 1e6,
      cumulativeEstimateOrReserveCny: (historyMicros + store.globalSummary().reservedOrSettledMicros) / 1e6 })) });
  const runtime = createProductionRuntimeV3({ store, reader: createEvidenceReader(catalogue), context, verifier: {}, model, dsh,
    onProgress: row => console.log(JSON.stringify({ event: 'role', ticket: 18, slice: 174, ...row })) });
  for (const [index, input] of inputs.entries()) {
    const name = input.factionRecordKey.split(':')[1]; await put(name + '-input', input);
    const structuredRuntime = createFactionStructuredLocalEditorRuntimeV1({
      input, runtime, store, dsh, providerAdapter: structuredProviderAdapter,
      egressBinding: structuredEgressBinding,
      capabilityReceipt: structuredCapabilityReceipt,
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
      input, runtime: structuredRuntime, store, dsh,
      providerAdapter: structuredProviderAdapter,
      egressBinding: structuredEgressBinding,
      capabilityReceipt: structuredReviewCapabilityReceipt,
      outputContract: structuredReviewContract,
      executionPolicy: structuredReviewPolicy,
      priceUsage: priceStructuredUsage,
      legacyStructuredReviewRoleIds,
      schemaRepairImports: structuredReviewSchemaRepairImports,
      onProgress: row => console.log(JSON.stringify({ event: 'structured-role',
        ticket: 18, slice: 174, faction: name, ...row,
        cumulativeEstimateOrReserveCny: (historyMicros
          + store.globalSummary().reservedOrSettledMicros) / 1e6 })),
    });
    const factionRuntime = useReviewTransaction ? createFactionReviewTransactionRuntimeV1({ input, runtime: structuredReviewRuntime, store,
      phaseFieldSeed: index === 0 ? phaseFieldSeed : null }) : structuredReviewRuntime;
    if (useReviewTransaction && factionRuntime.binding.hash !== reviewTransactionBindings[index].hash)
      fail('FACTION_REVIEW_TRANSACTION_RUNTIME_DRIFT');
    const candidate = await produceFactionStrategyV1({ input, runtime: factionRuntime, store, knownRulePolicy: knownRulePolicies[index],
      registeredSourceFieldRepair: true,
      legacyPromptRoleIds,
      fieldRepairSeed: index === 0 ? fieldRepairSeed : null,
      phaseFieldSeed: index === 0 ? phaseFieldSeed : null,
      onProgress: row => console.log(JSON.stringify({ event: 'faction-progress', ticket: 18, slice: 174, faction: name, ...row })) });
    candidates.push(candidate); await put(name + '-candidate', candidate);
    await writeFile(path.join(out, name + '-candidate.md'), renderFactionStrategyV1(candidate));
    console.log(JSON.stringify({ event: 'faction-generated', faction: name, hash: candidate.hash, sections: candidate.sections.length, semanticReviewPassed: candidate.semanticReviewPassed }));
    if (!candidate.semanticReviewPassed) fail('FACTION_SOURCE_REVIEW_NOT_PASSED');
  }
} catch (error) { failure = { code: /^[A-Z0-9_]{3,100}$/.test(error.code || '') ? error.code : 'FACTION_RUN_FAILURE', diagnosticHash: hash(String(error.message)) }; }
finally {
  if (structuredAttached?.workerRef) await structuredWorker.detachCredential({ workerRef: structuredAttached.workerRef, reason: 'faction_structured_production_finished' }).catch(() => {});
  await structuredWorker?.close().catch(() => {});
  if (attached?.workerRef) await worker.detachCredential({ workerRef: attached.workerRef, reason: 'faction_production_finished' }).catch(() => {});
  await worker?.close().catch(() => {});
  const ledger = store.summary(), global = store.globalSummary();
  const report = seal({ runId, recipeHash: recipe.hash, overallDependencyHash: overallDependency.hash,
    readinessHashes: [structuredGenerationReadiness,
      structuredReviewReadiness,
      reviewFocusNormalizationReadiness, ...gates,
      ...unitRoleRepairGates, ...sourceCorrectionGates].map(g => g.hash),
    candidateHashes: candidates.map(c => c.hash), factionsGenerated: candidates.length,
    sourceReviewPassed: !failure && candidates.length === 2 && candidates.every(c => c.semanticReviewPassed), failure, ledger,
    continuation: continuation?.manifest || null, cumulativeKnownTokensLowerBound: historyTokens + global.knownTokens,
    cumulativeEstimateOrReserveCny: (historyMicros + global.reservedOrSettledMicros) / 1e6,
    ctx2skillLoopUsed: true, harnessLoopUsed: true, targetGames: ['starcraft-tmg'],
    roleRoutes: ['Teach', 'Ctx2Skill', 'Challenger', 'Reasoner', 'Judge', 'Proposer', 'Generator', 'structured_source_reviewer', 'structured_local_editor'],
    independentEvaluationPerformed: false, actualRoomReplayPerformed: false, strategyEffectivenessProven: false,
    formalSkillsAccepted: 0, promotions: [], sourceRefreshPerformed: false, trainingTruth: false, elapsedMs: Date.now() - began });
  await put('report', report);
  console.log(JSON.stringify({ event: 'report', runId, factionsGenerated: report.factionsGenerated,
    sourceReviewPassed: report.sourceReviewPassed, failure, tokens: ledger.knownTokens,
    cumulativeTokens: report.cumulativeKnownTokensLowerBound, cumulativeCny: report.cumulativeEstimateOrReserveCny, hash: report.hash })); store.close();
}
if (failure) process.exitCode = 1;
