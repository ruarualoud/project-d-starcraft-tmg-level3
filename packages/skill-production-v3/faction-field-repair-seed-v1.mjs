import { applyFactionFieldRepairV1 } from './faction-field-repair-v1.mjs';
import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';

// This is a repair-seed contract, not publication authority. The live runner
// reconstructs evidence from read-only paid request replay before calling it.
export function validateFactionFieldRepairSeedV1({ input, knownRulePolicy, seed }) {
  const { sourceSection, candidate, evidence } = seed || {};
  [input, knownRulePolicy, sourceSection, candidate, evidence].forEach(verifySeal);
  if (candidate.version !== 'faction_section_field_repair_candidate_v1'
    || candidate.inputHash !== input.hash || candidate.parentSectionResultHash !== sourceSection.hash
    || candidate.sourceReviewPassed !== false || candidate.independentEvaluationPassed !== false
    || candidate.runtimeAccepted !== false || candidate.trainingTruth !== false
    || evidence.version !== 'actual_faction_field_repair_evidence_v1' || evidence.inputHash !== input.hash
    || evidence.knownRulePolicyHash !== knownRulePolicy.hash || evidence.candidateHash !== candidate.hash
    || evidence.sourceSectionHash !== sourceSection.hash || evidence.planHash !== candidate.plan.hash
    || evidence.parentDraftHash !== hash(sourceSection.draft) || evidence.repairedDraftHash !== candidate.patch.draftHash
    || !evidence.actualProviderRequestsReplayed || !evidence.actualProviderOutputReapplied
    || !evidence.delivery.completeRequestsMatchedByHash || !evidence.delivery.rawResponsesMatchedByFingerprint
    || !evidence.delivery.receiptHashes.length || evidence.newProviderCalls !== 0
    || evidence.independentSourceReviewPassed !== false || evidence.runtimeAccepted !== false || evidence.trainingTruth !== false)
    fail('FACTION_FIELD_SEED_EVIDENCE_DRIFT');
  const replacements = candidate.plan.targets.map(t => ({ targetId: t.targetId,
    text: candidate.patch.draft.recommendations[t.index].reviseIf[Number(t.path.slice('reviseIf.'.length))] }));
  const patch = applyFactionFieldRepairV1({ replacements }, { input, sectionResult: sourceSection, knownRulePolicy, plan: candidate.plan });
  if (patch.hash !== candidate.patch.hash) fail('FACTION_FIELD_SEED_PATCH_DRIFT');
  return seal({ version: 'faction_field_repair_seed_binding_v1', inputHash: input.hash,
    runId: evidence.runId, sourceRunId: evidence.sourceRunId, sourceRecipeHash: evidence.sourceRecipeHash,
    sourceSectionHash: sourceSection.hash, sectionId: sourceSection.section.id, evidenceHash: evidence.hash,
    candidateHash: candidate.hash, knownRulePolicyHash: knownRulePolicy.hash,
    parentDraftHash: patch.parentDraftHash, repairedDraftHash: patch.draftHash,
    patchHash: patch.hash, semanticAcceptanceInherited: false, trainingTruth: false });
}
