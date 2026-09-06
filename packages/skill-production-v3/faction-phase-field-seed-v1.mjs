import { applyFactionPhaseFieldRepairV1 } from './faction-phase-field-repair-v1.mjs';
import { clarifyFactionPhaseSeedV1 } from './faction-phase-seed-clarification-v1.mjs';
import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';

// Only actual, exactly replayed source-bound field edits may seed a new review.
// A seed does not inherit either old model's judgments or create a new budget.
export function materializeFactionPhaseFieldSeedV1({ input, seed }) {
  const { sourceSection, candidate, evidence, capture } = seed || {};
  [input, sourceSection, candidate, evidence, capture].forEach(verifySeal);
  const stagePrefix = 'faction.' + input.factionRecordKey.split(':')[1] + '.' + sourceSection.section.id
    + '.review-target-batch-v1.supportive.';
  const stageSuffix = capture.stageId?.startsWith(stagePrefix) ? capture.stageId.slice(stagePrefix.length) : '';
  if (!/^[0-2]\.0$/.test(stageSuffix)) fail('FACTION_PHASE_SEED_REVIEW_BOUNDARY_INVALID');
  if (candidate.version !== 'faction_phase_field_repair_candidate_v1' || candidate.plan.inputHash !== input.hash
    || candidate.plan.sectionId !== sourceSection.section.id || candidate.plan.draftHash !== hash(sourceSection.draft)
    || candidate.sourceReviewPassed !== false || candidate.runtimeAccepted !== false || candidate.trainingTruth !== false
    || evidence.version !== 'actual_faction_phase_field_evidence_v1' || evidence.inputHash !== input.hash
    || evidence.candidateHash !== candidate.hash || evidence.sourceSectionHash !== sourceSection.hash
    || evidence.sourceCaptureHash !== sourceSection.captureHash || evidence.sourceCaptureHash !== capture.hash
    || evidence.sourceRunId !== capture.runId || evidence.sourceRecipeHash !== capture.recipeHash
    || hash(capture.request.workspace.draft) !== hash(sourceSection.draft) || evidence.planHash !== candidate.plan.hash
    || evidence.parentDraftHash !== hash(sourceSection.draft) || evidence.repairedDraftHash !== candidate.patch.draftHash
    || !evidence.actualProviderRequestsReplayed || !evidence.actualProviderOutputReapplied
    || !evidence.delivery.completeRequestsMatchedByHash || !evidence.delivery.rawResponsesMatchedByFingerprint
    || !evidence.delivery.receiptHashes.length || evidence.newProviderCalls !== 0
    || evidence.loopComparisons.length !== Math.ceil(candidate.plan.targets.length / candidate.plan.batchSize)
    || evidence.independentSourceReviewPassed !== false || evidence.runtimeAccepted !== false || evidence.trainingTruth !== false)
    fail('FACTION_PHASE_SEED_EVIDENCE_DRIFT');
  const replacements = candidate.plan.targets.map(t => {
    const [field, n] = t.path.split('.'), r = candidate.patch.draft.recommendations[t.index];
    return { targetId: t.targetId, text: n === undefined ? r[field] : r[field][Number(n)] };
  });
  const patch = applyFactionPhaseFieldRepairV1({ replacements }, { input, section: sourceSection.section,
    draft: sourceSection.draft, plan: candidate.plan });
  if (patch.hash !== candidate.patch.hash) fail('FACTION_PHASE_SEED_PATCH_DRIFT');
  const clarification = clarifyFactionPhaseSeedV1({ input, candidate });
  const binding = seal({ version: 'faction_phase_field_seed_binding_v1', inputHash: input.hash,
    runId: evidence.runId, sourceRunId: evidence.sourceRunId, sourceRecipeHash: evidence.sourceRecipeHash,
    sourceCaptureHash: evidence.sourceCaptureHash, priorRequestEvidenceHash: evidence.priorRequestEvidenceHash,
    importBeforeRevision: Number(stageSuffix[0]), priorPendingReviewPreservedInEvidence: true,
    sourceSectionHash: sourceSection.hash, sectionId: sourceSection.section.id, evidenceHash: evidence.hash,
    candidateHash: candidate.hash, parentDraftHash: patch.parentDraftHash, actualRepairedDraftHash: patch.draftHash,
    repairedDraftHash: clarification.draftHash, hostClarificationHash: clarification.hash,
    patchHash: patch.hash, semanticAcceptanceInherited: false, trainingTruth: false });
  return { binding, draft: clarification.draft, clarification };
}

export function validateFactionPhaseFieldSeedV1(args) {
  return materializeFactionPhaseFieldSeedV1(args).binding;
}
