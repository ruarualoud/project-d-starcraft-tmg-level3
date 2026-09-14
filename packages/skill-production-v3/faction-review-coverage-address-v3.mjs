import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { resolveFactionReviewCoverageAddressesV2, FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V2 as prior } from './faction-review-coverage-address-v2.mjs';

export const FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V3 = seal({
  version: 'faction_review_coverage_address_v3', priorBindingHash: prior.hash,
  proof: 'exact_host_owned_target_id_plus_batch_local_slot_plus_same_source',
  targetIdBoundToWholeRecommendationHash: true, fuzzyTitleMatchingAllowed: false,
  priorValidReceiptsPreserved: true, originalJudgmentsAndReasonsPreserved: true,
  semanticAcceptanceInherited: false, trainingTruth: false });

const unresolved = error => ['FACTION_REVIEW_COVERAGE_ADDRESS_UNRESOLVED',
  'FACTION_REVIEW_COVERAGE_SHORT_TITLE_UNRESOLVED'].includes(error.code);

export function resolveFactionReviewCoverageAddressesV3({ coverage, targets, draft, binding }) {
  [targets, binding].forEach(verifySeal);
  if (binding.hash !== FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V3.hash || targets.draftHash !== hash(draft))
    fail('FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_DRIFT');
  try { return resolveFactionReviewCoverageAddressesV2({ coverage, targets, draft, binding: prior }); }
  catch (error) { if (!unresolved(error)) throw error; }
  const repairs = [];
  const output = coverage.map((row, rowIndex) => {
    try {
      const previous = resolveFactionReviewCoverageAddressesV2({ coverage: [row], targets, draft, binding: prior });
      if (previous.receipt.repairs.length) repairs.push(seal({ rowIndex, priorResolution: previous.receipt }));
      return previous.coverage[0];
    } catch (error) { if (!unresolved(error)) throw error; }
    const identifiers = [...new Set(row.reason.match(/(?<![A-Za-z0-9_-])advice-\d+-[a-f0-9]{12}(?![A-Za-z0-9_-])/gu) || [])];
    const resolved = row.recommendationIndices.map(slot => {
      const target = Number.isInteger(slot) && slot >= 0 && targets.targets[slot];
      if (!target || !identifiers.includes(target.targetId)
        || target.recommendationHash !== hash(draft.recommendations[target.index])
        || target.targetId !== 'advice-' + target.index + '-' + target.recommendationHash.slice(0, 12)
        || !target.recommendation.sourceRefs.includes(row.sourceRef))
        fail('FACTION_REVIEW_COVERAGE_TARGET_ID_UNRESOLVED');
      return { originalSlot: slot, resolvedIndex: target.index, targetId: target.targetId,
        recommendationHash: target.recommendationHash, declaredSourceRef: row.sourceRef };
    });
    if (identifiers.length !== resolved.length || new Set(resolved.map(r => r.targetId)).size !== resolved.length)
      fail('FACTION_REVIEW_COVERAGE_TARGET_ID_UNRESOLVED');
    const normalized = { ...structuredClone(row), recommendationIndices: resolved.map(r => r.resolvedIndex) };
    repairs.push(seal({ rowIndex, originalRowHash: hash(row), resolvedRowHash: hash(normalized), evidence: resolved,
      verdictChanged: false, reasonChanged: false, sourceRefChanged: false, trainingTruth: false }));
    return normalized;
  });
  return { coverage: output, receipt: seal({ version: 'faction_review_coverage_address_resolution_v3', bindingHash: binding.hash,
    targetContractHash: targets.hash, draftHash: hash(draft), originalCoverageHash: hash(coverage), resolvedCoverageHash: hash(output),
    repairs, semanticAcceptanceInherited: false, trainingTruth: false }) };
}
