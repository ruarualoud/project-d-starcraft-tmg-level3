import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';

export const FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V1 = seal({
  version: 'faction_review_coverage_address_v1',
  scope: 'invalid_covered_row_addresses_only',
  proof: 'batch_local_slot_plus_unique_exact_full_title_plus_same_source_membership',
  globalAddressesPreservedWhenValid: true, ambiguousAddressRejected: true,
  originalJudgmentsAndReasonsPreserved: true, sourceCoverageNotInvented: true,
  semanticAcceptanceInherited: false, trainingTruth: false });

// Resolve an address, never infer a semantic coverage verdict. A source alone
// is not enough: the real failure had TWO citing recommendations (2 and 6).
export function resolveFactionReviewCoverageAddressesV1({ coverage, targets, draft, binding }) {
  [targets, binding].forEach(verifySeal);
  if (binding.hash !== FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V1.hash || targets.draftHash !== hash(draft))
    fail('FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_DRIFT');
  const repairs = [];
  const output = coverage.map((row, rowIndex) => {
    if (row.verdict !== 'covered' || !Array.isArray(row.recommendationIndices)
      || !row.recommendationIndices.length || typeof row.reason !== 'string') return structuredClone(row);
    const indices = row.recommendationIndices;
    const validGlobal = indices.every(index => Number.isInteger(index) && draft.recommendations[index])
      && indices.some(index => draft.recommendations[index].sourceRefs.includes(row.sourceRef));
    if (validGlobal) return structuredClone(row);
    const resolved = indices.map(slot => {
      if (!Number.isInteger(slot) || slot < 0 || slot >= targets.targets.length)
        fail('FACTION_REVIEW_COVERAGE_ADDRESS_UNRESOLVED');
      const target = targets.targets[slot];
      const named = draft.recommendations.map((r, index) => ({ r, index }))
        .filter(({ r }) => row.reason.includes(r.title));
      if (named.length !== 1 || named[0].index !== target.index
        || !target.recommendation.sourceRefs.includes(row.sourceRef))
        fail('FACTION_REVIEW_COVERAGE_ADDRESS_UNRESOLVED');
      return { originalSlot: slot, resolvedIndex: target.index, targetId: target.targetId,
        recommendationHash: target.recommendationHash, exactTitleHash: hash(target.title),
        titleMultiplicityInWholeDraft: named.length, declaredSourceRef: row.sourceRef };
    });
    const recommendationIndices = resolved.map(r => r.resolvedIndex);
    if (new Set(recommendationIndices).size !== recommendationIndices.length)
      fail('FACTION_REVIEW_COVERAGE_ADDRESS_UNRESOLVED');
    const normalized = { ...structuredClone(row), recommendationIndices };
    repairs.push(seal({ rowIndex, originalRowHash: hash(row), resolvedRowHash: hash(normalized),
      evidence: resolved, originalReasonIndexNamespace: 'batch_local_as_proven_by_exact_title',
      verdictChanged: false, reasonChanged: false, sourceRefChanged: false, trainingTruth: false }));
    return normalized;
  });
  return { coverage: output, receipt: seal({ version: 'faction_review_coverage_address_resolution_v1',
    bindingHash: binding.hash, targetContractHash: targets.hash, draftHash: hash(draft),
    originalCoverageHash: hash(coverage), resolvedCoverageHash: hash(output), repairs,
    semanticAcceptanceInherited: false, trainingTruth: false }) };
}
