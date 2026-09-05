import { verifySeal, seal, hash, fail } from '../skill-production/common.mjs';
import { resolveSpan } from '../skill-production/spans.mjs';
import { applyIssuePatch } from './contracts.mjs';

const key = address => address.ref + '/' + address.spanId;

// Only metadata: pick an association already named by BOTH bound reviews, not
// an association guessed by this planner. Multiple valid associations are a
// capacity matching problem, not a reason to ask an LLM to duplicate citations.
export function planAddressBoundCitationRepair(draft, combined, { reader, context, reviews = [] }) {
  verifySeal(combined); verifySeal(context);
  if (combined.contextHash !== context.hash) fail('V3_CITATION_PLAN_CONTEXT_DRIFT');
  if (reviews.length) {
    reviews.forEach(verifySeal);
    if (reviews.length !== 2 || reviews[0].role !== 'supportive_reviewer' || reviews[1].role !== 'adversarial_reviewer'
      || new Set(reviews.map(r => r.reviewId)).size !== 2
      || reviews.some((r, index) => r.hash !== combined.reviewHashes?.[index]
        || r.candidateHash !== hash(draft) || r.inventoryHash !== combined.inventoryHash
        || r.contextHash !== context.hash || r.packetHash !== combined.packetHash)) fail('V3_CITATION_PLAN_REVIEW_DRIFT');
  }
  const selected = combined.issues.filter(i => i.kind === 'citation_missing').map(issue => {
    if (issue.candidateHash !== hash(draft)) fail('V3_CITATION_PLAN_STALE');
    let candidates = issue.claimId ? [issue.claimId] : [];
    if (!issue.claimId && reviews.length) {
      const rows = reviews.map(r => r.passageCoverage.find(p => key(p) === key(issue)));
      if (rows.every(r => r?.verdict === 'covered')) candidates = (rows[0].claimIds || []).filter(id =>
        rows[1].claimIds?.includes(id) && reviews.every(r => r.verdicts.some(v => v.claimId === id && v.verdict === 'supported')));
    }
    return { issue, candidates: candidates.filter(id => {
      const claim = draft.claims[Number(/^claims\.(\d+)$/.exec(id)?.[1])];
      return claim && !claim.evidence.some(e => key(e) === key(issue));
    }).sort((a, b) => Number(a.slice(7)) - Number(b.slice(7))) };
  }).filter(row => row.candidates.length);
  if (!selected.length) return null;
  const slots = draft.claims.flatMap((claim, i) => Array.from({ length: Math.max(0, 4 - claim.evidence.length) },
    (_, j) => ({ claimId: 'claims.' + i, position: j })));
  const owners = new Map();
  function assign(index, visited = new Set()) {
    for (let slot = 0; slot < slots.length; slot++) {
      if (visited.has(slot) || !selected[index].candidates.includes(slots[slot].claimId)) continue;
      visited.add(slot);
      if (!owners.has(slot) || assign(owners.get(slot), visited)) { owners.set(slot, index); return true; }
    }
    return false;
  }
  // Never emit a partial over-cap patch or drop old evidence to make room.
  if (selected.some((_, index) => !assign(index))) return null;
  const targets = new Map([...owners].map(([slot, index]) => [index, slots[slot].claimId]));
  const grouped = new Map(), evidence = [];
  for (const [index, { issue, candidates }] of selected.entries()) {
    const claimId = targets.get(index);
    const address = { ref: issue.ref, spanId: issue.spanId };
    evidence.push({ fingerprint: issue.fingerprint, claimId, candidateClaimIds: candidates, source: resolveSpan(reader, address) });
    if (!grouped.has(claimId)) grouped.set(claimId, []);
    grouped.get(claimId).push(address);
  }
  const patch = { parentHash: hash(draft), replacements: [], additions: [],
    citationAdditions: [...grouped].map(([claimId, addresses]) => ({ claimId, evidence: addresses })) };
  const result = applyIssuePatch(draft, patch, combined.issues);
  if (!result.changed) fail('V3_CITATION_PLAN_INCONSISTENT');
  return seal({ kind: 'host_address_bound_citation_patch', combinedHash: combined.hash, patch, evidence,
    parentHash: hash(draft), resultHash: hash(result.draft), draft: result.draft,
    associationReviewHashes: reviews.map(r => r.hash), maximumEvidencePerClaim: 4,
    changedProse: false, reReviewRequired: true, trainingTruth: false });
}
