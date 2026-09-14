import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { resolveFactionReviewCoverageAddressesV4 as priorResolve,
  FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V4 as prior } from './faction-review-coverage-address-v4.mjs';

export const FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V5 = seal({
  version: 'faction_review_coverage_address_v5', priorBindingHash: prior.hash,
  proof: 'host_coverage_source_and_explicit_global_local_pair_and_whole_recommendation_hash',
  sourceRefEchoInProseRequired: false, fuzzyEntityMatchingAllowed: false,
  contradictoryOrAmbiguousAddressesRejected: true, originalReasonsAndJudgmentsPreserved: true,
  semanticAcceptanceInherited: false, trainingTruth: false });
const binding = FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V5;
const invalid = () => fail('FACTION_REVIEW_COVERAGE_DUAL_COORDINATE_UNRESOLVED');
const pairs = reason => [...reason.matchAll(/(?<![A-Za-z0-9_])recommendation index (0|[1-9][0-9]*) \(target slot (0|[1-9][0-9]*)\)/gu)]
  .map(m => ({ index: Number(m[1]), slot: Number(m[2]), offset: m.index, text: m[0] }));
const sameSet = (a, b) => hash([...a].sort((x, y) => x - y)) === hash([...b].sort((x, y) => x - y));

// coverageSourceRefs is the Host's ordered coverageSlot catalogue, not text
// extracted from a reason. The structured caller must validate its slot set
// before materialization; this module never fabricates a missing source echo.
export function resolveFactionReviewCoverageAddressesV5({ coverage, targets, draft, binding: selected, coverageSourceRefs }) {
  [targets, selected].forEach(verifySeal);
  if (selected.hash !== binding.hash || targets.draftHash !== hash(draft)
    || !Array.isArray(coverage) || !Array.isArray(coverageSourceRefs)
    || coverage.length !== coverageSourceRefs.length || new Set(coverageSourceRefs).size !== coverageSourceRefs.length
    || coverage.some((r, i) => r.sourceRef !== coverageSourceRefs[i])
    || new Set(targets.targets.map(t => t.index)).size !== targets.targets.length)
    fail('FACTION_REVIEW_COVERAGE_DUAL_COORDINATE_BINDING_DRIFT');
  for (const t of targets.targets) {
    if (!Number.isSafeInteger(t.index) || t.index < 0 || !draft.recommendations[t.index]
      || hash(t.recommendation) !== hash(draft.recommendations[t.index])
      || t.recommendationHash !== hash(t.recommendation) || t.title !== t.recommendation.title
      || t.targetId !== 'advice-' + t.index + '-' + t.recommendationHash.slice(0, 12))
      fail('FACTION_REVIEW_COVERAGE_DUAL_COORDINATE_BINDING_DRIFT');
  }
  const repairs = [], confirmations = [], inherited = [];
  const output = coverage.map((row, rowIndex) => {
    const declared = typeof row.reason === 'string' ? pairs(row.reason) : [];
    if (!declared.length || row.verdict !== 'covered') {
      const old = priorResolve({ coverage: [row], targets, draft, binding: prior });
      inherited.push({ rowIndex, receipt: old.receipt });
      return old.coverage[0];
    }
    if (!Array.isArray(row.recommendationIndices) || !row.recommendationIndices.length
      || row.recommendationIndices.some(i => !Number.isSafeInteger(i) || i < 0)
      || new Set(row.recommendationIndices).size !== row.recommendationIndices.length
      || declared.length !== row.recommendationIndices.length
      || new Set(declared.map(d => d.index)).size !== declared.length
      || new Set(declared.map(d => d.slot)).size !== declared.length
      || (row.reason.match(/recommendation\s+(?:index|indices)/giu) || []).length !== declared.length
      || (row.reason.match(/target\s+slots?/giu) || []).length !== declared.length) invalid();
    const chosen = declared.map(d => {
      const target = targets.targets[d.slot];
      if (!target || target.index !== d.index || !target.recommendation.sourceRefs.includes(row.sourceRef)) invalid();
      return target;
    });
    const ids = row.reason.match(/(?<![A-Za-z0-9_-])advice-\d+-[a-f0-9]{12}(?![A-Za-z0-9_-])/gu) || [];
    if (ids.some(id => !chosen.some(t => t.targetId === id))
      || draft.recommendations.some((r, i) => row.reason.includes(r.title) && !chosen.some(t => t.index === i))) invalid();
    const global = declared.map(d => d.index), local = declared.map(d => d.slot);
    const alreadyGlobal = sameSet(row.recommendationIndices, global);
    if (!alreadyGlobal && !sameSet(row.recommendationIndices, local)) invalid();
    const competingGlobal = row.recommendationIndices.every(i => draft.recommendations[i])
      && row.recommendationIndices.some(i => draft.recommendations[i].sourceRefs.includes(row.sourceRef));
    if (competingGlobal && !alreadyGlobal) invalid();
    const normalized = { ...structuredClone(row), recommendationIndices: alreadyGlobal ? [...row.recommendationIndices]
      : row.recommendationIndices.map(slot => targets.targets[slot].index) };
    const proof = seal({ rowIndex, originalRowHash: hash(row), resolvedRowHash: hash(normalized),
      hostCoverageSlot: rowIndex, hostSourceRef: coverageSourceRefs[rowIndex],
      evidence: chosen.map((t, i) => ({ declaration: declared[i], targetId: t.targetId,
        recommendationHash: t.recommendationHash, sourceRef: row.sourceRef })),
      verdictChanged: false, reasonChanged: false, sourceRefChanged: false, trainingTruth: false });
    (alreadyGlobal ? confirmations : repairs).push(proof);
    return normalized;
  });
  // No newly understood declaration: retain the exact old aggregate receipt.
  if (!repairs.length && !confirmations.length) return priorResolve({ coverage, targets, draft, binding: prior });
  return { coverage: output, receipt: seal({ version: 'faction_review_coverage_address_resolution_v5',
    bindingHash: binding.hash, targetContractHash: targets.hash, draftHash: hash(draft),
    coverageSourceCatalogueHash: hash(coverageSourceRefs), originalCoverageHash: hash(coverage), resolvedCoverageHash: hash(output),
    repairs, confirmations, inherited, semanticAcceptanceInherited: false, trainingTruth: false }) };
}
