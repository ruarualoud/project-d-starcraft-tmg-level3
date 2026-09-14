import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { resolveFactionReviewCoverageAddressesV1, FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V1 as prior } from './faction-review-coverage-address-v1.mjs';

export const FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V2 = seal({
  version: 'faction_review_coverage_address_v2', priorBindingHash: prior.hash,
  scope: 'invalid_covered_row_addresses_only',
  proof: 'batch_local_slot_plus_unique_exact_delimited_title_head_plus_same_source_membership',
  titleHeadDelimiter: 'first_colon', minimumTitleHeadCodepoints: 8,
  acceptedReasonDelimiters: ['()', '（）', '“”'], fuzzyMatchingAllowed: false,
  globalAddressesPreservedWhenValid: true, ambiguousAddressRejected: true,
  originalJudgmentsAndReasonsPreserved: true, semanticAcceptanceInherited: false, trainingTruth: false });

const head = title => /^[^:：]+[:：]/u.test(title) ? title.split(/[:：]/u)[0].trim() : null;
const anchored = (reason, titleHead) => titleHead && [...titleHead].length >= 8
  && [['(', ')'], ['（', '）'], ['“', '”']].some(([a, b]) => reason.includes(a + titleHead + b));

export function resolveFactionReviewCoverageAddressesV2({ coverage, targets, draft, binding }) {
  [targets, binding].forEach(verifySeal);
  if (binding.hash !== FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V2.hash || targets.draftHash !== hash(draft))
    fail('FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_DRIFT');
  // Exact V1 success retains its original receipt byte-for-byte.
  try { return resolveFactionReviewCoverageAddressesV1({ coverage, targets, draft, binding: prior }); }
  catch (error) { if (error.code !== 'FACTION_REVIEW_COVERAGE_ADDRESS_UNRESOLVED') throw error; }
  const repairs = [];
  const output = coverage.map((row, rowIndex) => {
    try {
      const v1 = resolveFactionReviewCoverageAddressesV1({ coverage: [row], targets, draft, binding: prior });
      if (v1.receipt.repairs.length) repairs.push(seal({ rowIndex, priorResolution: v1.receipt }));
      return v1.coverage[0];
    } catch (error) { if (error.code !== 'FACTION_REVIEW_COVERAGE_ADDRESS_UNRESOLVED') throw error; }
    const named = draft.recommendations.map((r, index) => ({ index, titleHead: head(r.title) }))
      .filter(r => anchored(row.reason, r.titleHead));
    if (named.length !== 1) fail('FACTION_REVIEW_COVERAGE_SHORT_TITLE_UNRESOLVED');
    const chosen = named[0];
    const resolved = row.recommendationIndices.map(slot => {
      const target = Number.isInteger(slot) && slot >= 0 && targets.targets[slot];
      if (!target || target.index !== chosen.index || !target.recommendation.sourceRefs.includes(row.sourceRef))
        fail('FACTION_REVIEW_COVERAGE_SHORT_TITLE_UNRESOLVED');
      return { originalSlot: slot, resolvedIndex: target.index, targetId: target.targetId,
        recommendationHash: target.recommendationHash, exactTitleHeadHash: hash(chosen.titleHead),
        wholeDraftHeadMultiplicity: named.length, declaredSourceRef: row.sourceRef };
    });
    const recommendationIndices = resolved.map(r => r.resolvedIndex);
    if (new Set(recommendationIndices).size !== recommendationIndices.length) fail('FACTION_REVIEW_COVERAGE_SHORT_TITLE_UNRESOLVED');
    const normalized = { ...structuredClone(row), recommendationIndices };
    repairs.push(seal({ rowIndex, originalRowHash: hash(row), resolvedRowHash: hash(normalized), evidence: resolved,
      verdictChanged: false, reasonChanged: false, sourceRefChanged: false, trainingTruth: false }));
    return normalized;
  });
  return { coverage: output, receipt: seal({ version: 'faction_review_coverage_address_resolution_v2', bindingHash: binding.hash,
    targetContractHash: targets.hash, draftHash: hash(draft), originalCoverageHash: hash(coverage), resolvedCoverageHash: hash(output),
    repairs, semanticAcceptanceInherited: false, trainingTruth: false }) };
}
