import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { resolveFactionReviewCoverageAddressesV3, FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V3 as prior } from './faction-review-coverage-address-v3.mjs';

export const FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V4 = seal({
  version: 'faction_review_coverage_address_v4', priorBindingHash: prior.hash,
  scope: 'invalid_covered_addresses_with_explicit_parenthesized_target_slot_declarations',
  proof: 'declared_local_slot_exact_source_and_hash_bound_whole_recommendation',
  ambiguousGlobalAndLocalAddressesRejected: true, conflictingIdentityRejected: true,
  originalJudgmentsAndReasonsPreserved: true, priorUnambiguousReceiptsPreserved: true,
  sourceNamesAloneNeverResolveAddresses: true, semanticAcceptanceInherited: false, trainingTruth: false });

const unresolved = new Set(['FACTION_REVIEW_COVERAGE_ADDRESS_UNRESOLVED',
  'FACTION_REVIEW_COVERAGE_SHORT_TITLE_UNRESOLVED', 'FACTION_REVIEW_COVERAGE_TARGET_ID_UNRESOLVED']);
const invalid = () => fail('FACTION_REVIEW_COVERAGE_EXPLICIT_SLOT_UNRESOLVED');
const declarations = reason => [...reason.matchAll(/\(target slot (0|[1-9][0-9]*)\)/gu)].map(m => ({ slot: Number(m[1]), offset: m.index, text: m[0] }));

// This resolves only an explicitly declared coordinate namespace, not Queen/
// other entity-name similarity or the truth of the reviewer's judgment.
export function resolveFactionReviewCoverageAddressesV4({ coverage, targets, draft, binding }) {
  [targets, binding].forEach(verifySeal);
  if (binding.hash !== FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V4.hash || targets.draftHash !== hash(draft)
    || new Set(targets.targets.map(t => t.index)).size !== targets.targets.length)
    fail('FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_DRIFT');
  for (const t of targets.targets) {
    if (!Number.isSafeInteger(t.index) || t.index < 0 || !draft.recommendations[t.index]
      || hash(t.recommendation) !== hash(draft.recommendations[t.index])
      || t.recommendationHash !== hash(t.recommendation) || t.title !== t.recommendation.title
      || t.targetId !== 'advice-' + t.index + '-' + t.recommendationHash.slice(0, 12))
      fail('FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_DRIFT');
  }
  const resolveDeclared = row => {
    if (row.verdict !== 'covered' || typeof row.reason !== 'string'
      || !Array.isArray(row.recommendationIndices) || !row.recommendationIndices.length) invalid();
    const mentions = declarations(row.reason), slots = mentions.map(m => m.slot);
    if (!slots.length || new Set(slots).size !== slots.length
      || slots.length !== row.recommendationIndices.length
      || slots.length !== (row.reason.match(/target slot/gu) || []).length
      || !row.reason.includes('(' + row.sourceRef + ')')) invalid();
    const chosen = slots.map(slot => {
      const t = Number.isSafeInteger(slot) && slot >= 0 && targets.targets[slot];
      if (!t || !t.recommendation.sourceRefs.includes(row.sourceRef)) invalid();
      return t;
    });
    const ids = row.reason.match(/(?<![A-Za-z0-9_-])advice-\d+-[a-f0-9]{12}(?![A-Za-z0-9_-])/gu) || [];
    if (ids.some(id => !chosen.some(t => t.targetId === id))
      || draft.recommendations.some((r, i) => row.reason.includes(r.title) && !chosen.some(t => t.index === i))) invalid();
    return { mentions, slots, chosen };
  };
  // A valid global address cannot silently win over a contradictory explicit
  // local declaration. An already-normalized matching global address is fine.
  for (const row of coverage) {
    if (row.verdict !== 'covered' || typeof row.reason !== 'string' || !declarations(row.reason).length) continue;
    const { chosen } = resolveDeclared(row);
    const global = row.recommendationIndices.every(i => Number.isSafeInteger(i) && i >= 0 && draft.recommendations[i])
      && row.recommendationIndices.some(i => draft.recommendations[i].sourceRefs.includes(row.sourceRef));
    if (global && hash([...row.recommendationIndices].sort((a, b) => a - b))
      !== hash(chosen.map(t => t.index).sort((a, b) => a - b))) invalid();
  }
  try { return resolveFactionReviewCoverageAddressesV3({ coverage, targets, draft, binding: prior }); }
  catch (error) { if (!unresolved.has(error.code)) throw error; }
  const repairs = [];
  const output = coverage.map((row, rowIndex) => {
    try {
      const old = resolveFactionReviewCoverageAddressesV3({ coverage: [row], targets, draft, binding: prior });
      if (old.receipt.repairs.length) repairs.push(seal({ rowIndex, priorResolution: old.receipt }));
      return old.coverage[0];
    } catch (error) { if (!unresolved.has(error.code)) throw error; }
    const { mentions, slots, chosen } = resolveDeclared(row);
    if (hash([...row.recommendationIndices].sort((a, b) => a - b)) !== hash([...slots].sort((a, b) => a - b))) invalid();
    const mapped = row.recommendationIndices.map(slot => targets.targets[slot].index);
    const normalized = { ...structuredClone(row), recommendationIndices: mapped };
    repairs.push(seal({ rowIndex, originalRowHash: hash(row), resolvedRowHash: hash(normalized),
      evidence: chosen.map((t, n) => ({ originalSlot: slots[n], resolvedIndex: t.index,
        targetId: t.targetId, recommendationHash: t.recommendationHash, declaredSourceRef: row.sourceRef,
        exactDeclaration: mentions[n], reasonHash: hash(row.reason) })),
      originalReasonIndexNamespace: 'explicit_batch_local_target_slot',
      verdictChanged: false, reasonChanged: false, sourceRefChanged: false, trainingTruth: false }));
    return normalized;
  });
  return { coverage: output, receipt: seal({ version: 'faction_review_coverage_address_resolution_v4', bindingHash: binding.hash,
    targetContractHash: targets.hash, draftHash: hash(draft), originalCoverageHash: hash(coverage), resolvedCoverageHash: hash(output),
    repairs, semanticAcceptanceInherited: false, trainingTruth: false }) };
}
