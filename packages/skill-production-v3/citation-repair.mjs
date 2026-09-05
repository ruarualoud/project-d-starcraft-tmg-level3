import { verifySeal, seal, hash, fail } from '../skill-production/common.mjs';
import { resolveSpan } from '../skill-production/spans.mjs';
import { applyIssuePatch } from './contracts.mjs';

// Citation-only gaps already identify their source address. When the fresh
// reviewers also identify exactly one existing claim, no model must retype the
// address or invent the repair. This edits metadata, never claim prose/truth.
export function planAddressBoundCitationRepair(draft, combined, { reader, context }) {
  verifySeal(combined); verifySeal(context);
  if (combined.contextHash !== context.hash) fail('V3_CITATION_PLAN_CONTEXT_DRIFT');
  const selected = combined.issues.filter(i => i.kind === 'citation_missing' && i.claimId);
  if (!selected.length) return null;
  const grouped = new Map(), evidence = [];
  for (const issue of selected) {
    if (issue.candidateHash !== hash(draft)) fail('V3_CITATION_PLAN_STALE');
    const address = { ref: issue.ref, spanId: issue.spanId };
    evidence.push({ fingerprint: issue.fingerprint, claimId: issue.claimId, source: resolveSpan(reader, address) });
    if (!grouped.has(issue.claimId)) grouped.set(issue.claimId, []);
    grouped.get(issue.claimId).push(address);
  }
  const patch = { parentHash: hash(draft), replacements: [], additions: [],
    citationAdditions: [...grouped].map(([claimId, addresses]) => ({ claimId, evidence: addresses })) };
  const result = applyIssuePatch(draft, patch, combined.issues);
  if (!result.changed) fail('V3_CITATION_PLAN_INCONSISTENT');
  return seal({ kind: 'host_address_bound_citation_patch', combinedHash: combined.hash, patch, evidence,
    parentHash: hash(draft), resultHash: hash(result.draft), draft: result.draft,
    changedProse: false, reReviewRequired: true, trainingTruth: false });
}
