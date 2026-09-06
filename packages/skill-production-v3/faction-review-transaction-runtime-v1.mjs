import { createFactionWritingPlanV1, normalizeFactionStrategyPatchEnvelopeV1,
  applyFactionStrategyPatchV1 } from './faction-strategy-workflow-v1.mjs';
import { materializeFactionPhaseFieldSeedV1 } from './faction-phase-field-seed-v1.mjs';
import { createFactionSourceDependencyContextV1 } from './faction-source-dependency-context-v1.mjs';
import { createFactionRepairRegressionGuardV1, inspectFactionRepairRegressionV1 } from './faction-repair-regression-guard-v1.mjs';
import { seal, verifySeal, hash, clone, fail } from '../skill-production/common.mjs';

export function createFactionReviewTransactionBindingV1({ input, phaseFieldSeed = null }) {
  verifySeal(input);
  const plan = createFactionWritingPlanV1(input);
  const terran = input.factionRecordKey === 'tactical_cards:terran_armed_forces';
  if (terran !== !!phaseFieldSeed) fail('FACTION_REVIEW_TRANSACTION_SEED_REQUIRED');
  const materialized = phaseFieldSeed ? materializeFactionPhaseFieldSeedV1({ input, seed: phaseFieldSeed }) : null;
  const startSectionIndex = materialized ? plan.sections.findIndex(s => s.id === materialized.binding.sectionId) : 0;
  if (startSectionIndex < 0 || !terran && input.factionRecordKey !== 'tactical_cards:zerg_swarm')
    fail('FACTION_REVIEW_TRANSACTION_SCOPE_INVALID');
  return seal({ version: 'faction_review_transaction_binding_v1', inputHash: input.hash,
    contextHash: input.frozenSources.hash, planHash: plan.hash, sourceBinding: input.sourceBinding,
    factionRecordKey: input.factionRecordKey, startSectionIndex,
    phaseFieldBindingHash: materialized?.binding.hash || null,
    startSectionId: plan.sections[startSectionIndex].id,
    firstSectionRoleEpoch: materialized ? '.phase-seed-v1.' + materialized.binding.hash.slice(0, 20) : null,
    oldSourceReviewRolesReusedOnlyBeforeIntervention: true,
    changedContextCreatesNewPhysicalRoleNamespace: true, guardBeforePatchApplication: true,
    sourcePolicy: 'whole_original_context_plus_source_derived_dependency_reading_packet',
    protectedFieldPolicy: 'changed_source_repair_checkpoint_requires_explicit_source_revalidation',
    modelNegativeJudgmentWaived: false, revisionBudgetReset: false, trainingTruth: false });
}

// One Adapter at the existing runtime.role seam. The old workflow remains
// replayable byte-for-byte; new role requests have an explicit namespace and
// changed source context. Persist the raw proposal and guard finding before
// returning an editor result to the workflow's patch-application code.
export function createFactionReviewTransactionRuntimeV1({ input, runtime, store, phaseFieldSeed = null }) {
  const binding = createFactionReviewTransactionBindingV1({ input, phaseFieldSeed });
  const plan = createFactionWritingPlanV1(input), editorContexts = new Map();
  let guard = null;
  if (phaseFieldSeed) {
    const m = materializeFactionPhaseFieldSeedV1({ input, seed: phaseFieldSeed });
    const imported = seal({ version: 'verified_phase_field_import_v1', parentHash: m.binding.parentDraftHash,
      resultHash: m.binding.repairedDraftHash, binding: m.binding, actualPatch: phaseFieldSeed.candidate.patch,
      hostClarification: m.clarification, oldProviderOutputOverwritten: false, oldReviewAcceptanceInherited: false,
      priorPendingReviewPreservedInEvidence: true, freshWholeSectionReviewRequired: true, trainingTruth: false });
    guard = createFactionRepairRegressionGuardV1({ input, imported });
  }
  return Object.freeze({ binding, async role(request) {
    const sectionIndex = plan.sections.findIndex(s => s.id === request.workspace?.section?.id);
    const isReview = request.roleId.includes('.review-target-batch-v1.');
    const isEditor = request.roleId.includes('.editor.') || request.roleId.includes('.source-reconstruction.');
    const eligible = (isReview || isEditor) && sectionIndex >= binding.startSectionIndex
      && (sectionIndex !== binding.startSectionIndex || !binding.firstSectionRoleEpoch
        || request.roleId.includes(binding.firstSectionRoleEpoch));
    if (!eligible) return runtime.role(request);
    if (request.workspace.inputHash !== input.hash) fail('FACTION_REVIEW_TRANSACTION_INPUT_DRIFT');
    const workspace = request.workspace;
    let editContext = null;
    if (isEditor) {
      const issue = workspace.localIssue || workspace.repairScopes?.[0];
      const key = workspace.parentHash + ':' + (issue?.index ?? 'omission:' + issue?.sourceRef);
      if (workspace.draft && workspace.issues) {
        editContext = { draft: workspace.draft, issues: workspace.issues }; editorContexts.set(key, editContext);
      } else editContext = editorContexts.get(key);
      if (!editContext || hash(editContext.draft) !== workspace.parentHash)
        fail('FACTION_REVIEW_TRANSACTION_EDIT_CONTEXT_MISSING');
    }
    const roots = isReview
      ? workspace.outputRequestAtEnd.targetContract.targets.flatMap(t => t.recommendation.sourceRefs)
      : editContext.issues.issues.flatMap(issue => issue.index === undefined ? [issue.sourceRef]
        : editContext.draft.recommendations[issue.index].sourceRefs);
    const sourceDependencyContext = createFactionSourceDependencyContextV1({ input, sourceRefs: [...new Set(roots)] });
    const transformed = { ...clone(request), roleId: request.roleId + '.source-evidence-v1.' + binding.hash.slice(0, 20),
      workspace: { ...clone(workspace), sourceDependencyContextAtEnd: sourceDependencyContext,
        ...(isEditor && sectionIndex === binding.startSectionIndex && guard ? {
          sourceRepairCheckpointsAtEnd: { guardHash: guard.hash, protectedFields: guard.protectedFields,
            policy: 'Do not rewrite these source-repaired fields merely to satisfy a reviewer. Any change requires source revalidation before application; a supported model verdict is not a waiver.' },
        } : {}) } };
    const artifact = await runtime.role(transformed);
    if (isEditor && guard && sectionIndex === binding.startSectionIndex) {
      let normalized;
      try { normalized = normalizeFactionStrategyPatchEnvelopeV1(artifact.output, { input, ...editContext }).output; }
      catch { return artifact; } // Old workflow retains its exact schema/no-progress handling.
      const proposed = applyFactionStrategyPatchV1(normalized, { input, ...editContext });
      const inspection = inspectFactionRepairRegressionV1({ input, guard, draft: proposed });
      const receipt = seal({ version: 'faction_review_transaction_patch_guard_v1', bindingHash: binding.hash,
        rawArtifactHash: artifact.hash, originalRoleId: request.roleId, actualRoleId: transformed.roleId,
        parentDraftHash: hash(editContext.draft), inspection, rawProviderOutputPreserved: true,
        applied: false, trainingTruth: false });
      const lease = store.acquire(artifact.roleId + '.repair-checkpoint-guard', { receiptHash: receipt.hash });
      if (!lease.cached) store.finish(lease, receipt);
      if (inspection.requiresRevalidation) fail('FACTION_PRODUCTION_REPAIR_REVALIDATION_REQUIRED', {
        receiptHash: receipt.hash, changedFields: inspection.changes });
    }
    return artifact;
  } });
}
