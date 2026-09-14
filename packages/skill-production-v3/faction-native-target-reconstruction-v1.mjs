import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';

export const FACTION_NATIVE_TARGET_RECONSTRUCTION_BINDING_V1 = seal({ version: 'faction_native_target_reconstruction_v1',
  suffix: '.target-reconstruction.v1', outputKind: 'items', maximumTargets: 2,
  providerContractReused: 'faction-native-items-v1',
  preserveFullSourcesAndSuccessfulContext: true, preserveWrongTargetArtifactAndIssue: true,
  legacySuccessesFrozen: true, automaticWholeSectionRetries: 0,
  freshTargetSourceChecksAndWholeSectionReviewRequired: true, semanticAcceptanceInherited: false, trainingTruth: false });

export function validateFactionNativeTargetReconstructionBindingV1(binding) {
  if (verifySeal(binding).hash !== FACTION_NATIVE_TARGET_RECONSTRUCTION_BINDING_V1.hash)
    fail('FACTION_NATIVE_TARGET_RECONSTRUCTION_BINDING_INVALID');
  return binding;
}

// This is the exact Host target contract, not semantic acceptance. The wrong
// draft remains in the store; no rejected prose is copied into the new prompt.
export function validateFactionNativeTargetReconstructionRequestV1({ request, binding }) {
  validateFactionNativeTargetReconstructionBindingV1(binding);
  const w = request.workspace, issue = verifySeal(w.targetIssue), end = w.outputRequestAtEnd;
  const match = /\.generator-items\.(\d+)(?:\.planning-v1\.[a-f0-9]{20})?\.target-reconstruction\.v1$/u.exec(request.roleId);
  if (!match || issue.version !== 'faction_batch_target_issues_v1'
    || !['FACTION_BATCH_SOURCE_OMISSION', 'FACTION_BATCH_DUPLICATE_RECOMMENDATION'].includes(issue.failureCode)
    || !/^[a-f0-9]{64}$/u.test(issue.rejectedArtifactHash || '') || !/^[a-f0-9]{64}$/u.test(issue.rejectedOutputHash || '')
    || issue.sourceReviewStillRequired !== true || issue.trainingTruth !== false
    || !Array.isArray(w.indices) || w.indices.length < 1 || w.indices.length > binding.maximumTargets
    || !Array.isArray(w.outline) || !Array.isArray(w.completedRecommendations)
    || w.completedRecommendations.length !== Number(match[1])
    || hash(issue.completedRecommendationHashes) !== hash(w.completedRecommendations.map(hash))
    || hash(w.indices) !== hash(w.outline.slice(Number(match[1]), Number(match[1]) + 2).map((_, i) => Number(match[1]) + i))
    || hash(issue.targets.map(t => t.index)) !== hash(w.indices)
    || !end || end.action !== 'write_only_these_new_outline_items' || hash(end.targets) !== hash(issue.targets)
    || !issue.targets.some(t => t.missingSourceRefs.length || t.duplicatesCompletedIndices.length))
    fail('FACTION_NATIVE_TARGET_RECONSTRUCTION_SCOPE_INVALID');
  for (const target of issue.targets) {
    const outline = w.outline[target.index];
    if (target.focus !== outline.focus || hash(target.requiredSourceRefs) !== hash(outline.sourceRefs)
      || target.missingSourceRefs.some(ref => !outline.sourceRefs.includes(ref))
      || target.duplicatesCompletedIndices.some(index => !Number.isSafeInteger(index) || !w.completedRecommendations[index]))
      fail('FACTION_NATIVE_TARGET_RECONSTRUCTION_SCOPE_INVALID');
  }
  return issue;
}
