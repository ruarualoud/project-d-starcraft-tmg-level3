import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { createFactionStructuredLocalEditorImportV1, createFactionStructuredLocalEditorRuntimeV1,
  deriveFactionLegacyPromptRoleIdsV1 } from '../skill-production-v3/faction-structured-local-editor-runtime-v1.mjs';
import { createFactionStructuredReviewRuntimeV1, deriveFactionLegacyStructuredReviewRoleIdsV1 } from '../skill-production-v3/faction-structured-review-runtime-v1.mjs';
import { createFactionCatalogueReviewRuntimeV1 } from '../skill-production-v3/faction-catalogue-review-runtime-v1.mjs';
import { createFactionSlotReviewRuntimeV1 } from '../skill-production-v3/faction-slot-review-runtime-v1.mjs';
import { assertFactionSlotReviewRecipeV1 } from '../skill-production-v3/faction-slot-review-environment-v1.mjs';
import { factionMixedReviewLegacyRoleIdsV1 } from '../skill-production-v3/faction-mixed-review-environment-v1.mjs';
import { createFactionStructuredTeachRuntimeV1 } from '../skill-production-v3/faction-structured-teach-runtime-v1.mjs';
import { withFactionTeachOutputBudgetV1 } from '../skill-production-v3/faction-teach-output-budget-v1.mjs';
import { createFactionNativeProductionRuntimeV1, usesFactionNativeProductionInputV1 } from '../skill-production-v3/faction-native-production-runtime-v1.mjs';
import { resolveFactionPromptLineageV1 } from '../skill-production-v3/faction-prompt-lineage-v1.mjs';
import { STARCRAFT_TMG_FACTION_ADVICE_EDITOR_OUTPUT_CONTRACT_V1 as editorContract } from '../../content/skill-generation/ticket-18-faction-advice-editor-output-contract-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V4 as reviewContract } from '../../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs';

export async function loadFactionStructuredReplayDependenciesV1({ root, recipe }) {
  if (!recipe.structuredGenerationBinding) return null;
  const raw = async file => JSON.parse(await readFile(path.join(root, file), 'utf8'));
  const json = async file => verifySeal(await raw(file));
  const base = 'build/ticket-18-structured-generation-v1/';
  const originRun = recipe.structuredGenerationBinding.canaryRunId;
  const report = await json(base + 'r5-live-canary-report.json');
  if (report.runId !== originRun || report.hash !== recipe.structuredGenerationBinding.canaryReportHash) fail('FACTION_REPLAY_CANARY_REPORT_DRIFT');
  const editorImport = createFactionStructuredLocalEditorImportV1({ recipeRunId: originRun,
    recipe: await json(base + originRun + '/recipe.json'), report,
    capsule: await json(base + originRun + '/context-capsule.json'),
    hostMaterialization: await json(base + originRun + '/host-materialization.json'),
    rawAdvice: await raw(base + originRun + '/raw-structured-advice.json'), outputContract: editorContract });
  if (editorImport.hash !== recipe.structuredGenerationBinding.importHash) fail('FACTION_REPLAY_CANARY_IMPORT_DRIFT');
  const editorCapability = await raw(base + originRun + '/capability-receipt.json');
  const reviewCapability = recipe.structuredReviewBinding ? await raw(base
    + recipe.structuredReviewBinding.capabilityRunId + '/capability-receipt.json') : null;
  return { editorImport, editorCapability, reviewCapability };
}

export async function createFactionReplayRuntimeStackV1({ root, runId, recipe, input, replay, runtime, dependencies }) {
  if (!dependencies) return { runtime, legacyPromptRoleIds: [], structuredReviewValidationBinding: null };
  const steps = replay.readRoleSteps().filter(row => !row.artifact.structuredImportHash);
  const lineage = await resolveFactionPromptLineageV1({ steps, parentRunId: runId,
    readRecipe: async id => verifySeal(JSON.parse(await readFile(path.join(root,
      'build/ticket-18-faction-production-v1', id, 'recipe.json'), 'utf8'))) });
  const legacyPromptRoleIds = deriveFactionLegacyPromptRoleIdsV1(steps, lineage);
  const legacyStructuredReviewRoleIds = deriveFactionLegacyStructuredReviewRoleIdsV1(steps, recipe.checkpointInventoryBinding);
  const forbidden = () => fail('FACTION_REPLAY_EGRESS_FORBIDDEN');
  const common = { input, store: replay.store, dsh: { run: forbidden },
    providerAdapter: { complete: forbidden }, egressBinding: {}, priceUsage: forbidden };
  let stack = createFactionStructuredLocalEditorRuntimeV1({ ...common, runtime,
    editorEnvelopeBinding: recipe.editorEnvelopeBinding || null, draftEnvelopeBinding: recipe.draftEnvelopeBinding || null,
    capabilityReceipt: dependencies.editorCapability, outputContract: editorContract,
    executionPolicy: { maxOutputUnits: 2048, attemptEstimateMicros: 500000, attemptTokenReserve: 90000,
      allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false },
    imports: input.factionRecordKey === 'tactical_cards:terran_armed_forces' ? [dependencies.editorImport] : [], legacyPromptRoleIds });
  let structuredReviewValidationBinding = null;
  const reviewPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
    allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
  if (dependencies.reviewCapability) {
    stack = createFactionStructuredReviewRuntimeV1({ ...common, runtime: stack,
      capabilityReceipt: dependencies.reviewCapability, outputContract: reviewContract,
      executionPolicy: reviewPolicy, legacyStructuredReviewRoleIds, allowBoundedOutputCapRecovery: true });
    structuredReviewValidationBinding = seal({ version: 'faction_review_validation_binding_v1',
      outputContractRef: recipe.structuredReviewBinding.outputContractRef,
      reviewReasonMaximum: 16384, legacyReasonMaximum: 1200, trainingTruth: false });
  }
  if (recipe.catalogueReviewBinding) {
    const canonical = id => id.replace(/\.source-evidence-v1\.[a-f0-9]{20}$/u, '');
    const legacyRoleIds = steps.filter(row => row.artifact.structuredDecodePassed !== true
      || row.artifact.outputContractRef?.hash === recipe.catalogueReviewBinding.prior.hash).map(row => canonical(row.id));
    const frozenCurrentRoleIds = steps.filter(row => row.artifact.outputContractRef?.hash === recipe.catalogueReviewBinding.current.hash
      && row.artifact.sharedScenarioSourcesIncluded !== true).map(row => canonical(row.id));
    stack = createFactionCatalogueReviewRuntimeV1({ input, legacyRuntime: stack,
      legacyRoleIds, frozenCurrentRoleIds, includeSharedScenarioSources: recipe.sharedScenarioReviewContext === true,
      store: replay.store, executionPolicy: reviewPolicy });
  }
  if (assertFactionSlotReviewRecipeV1(recipe)) stack = createFactionSlotReviewRuntimeV1({ input,
    legacyRuntime: stack, store: replay.store, executionPolicy: reviewPolicy,
    legacyRoleIds: factionMixedReviewLegacyRoleIdsV1(recipe, recipe.slotReviewLegacyRoleIds), recoveryOrigins: recipe.slotReviewRecoveryOrigins,
    reviewSlotNamespaceBinding: recipe.reviewSlotNamespaceBinding, onUncached: forbidden });
  if (recipe.structuredTeachBinding) stack = createFactionStructuredTeachRuntimeV1({ input,
    runtime: stack, store: replay.store, executionPolicy: reviewPolicy, dry: true });
  if (recipe.teachOutputBudgetBinding) stack = withFactionTeachOutputBudgetV1(stack, recipe.teachOutputBudgetBinding);
  if (recipe.nativeProductionBinding) stack = createFactionNativeProductionRuntimeV1({ input, runtime: stack,
    store: replay.store, executionPolicy: reviewPolicy, dry: true,
    proposerBatchBinding: recipe.proposerBatchBinding || null,
    proposerAuxiliaryCapacityBinding: recipe.proposerAuxiliaryCapacityBinding || null,
    draftEnvelopeBinding: recipe.draftEnvelopeBinding || null,
    targetReconstructionBinding: recipe.nativeTargetReconstructionBinding || null,
    outputCapacity: recipe.nativeOutputCapacityBinding ? { binding: recipe.nativeOutputCapacityBinding,
      frozenRoleIds: recipe.nativeOutputCapacityFrozenRoleIds } : null,
    legacyRoleIds: steps.filter(row => !usesFactionNativeProductionInputV1(row.artifact)).map(row => row.id) });
  const bound = stack;
  return { runtime: { role: async request => {
    await replay.authenticateRoleRequest?.(request);
    replay.bindRoleRequest(request); return bound.role(request);
  } },
    legacyPromptRoleIds, structuredReviewValidationBinding };
}
