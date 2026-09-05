import { inspectDraft } from './contracts.mjs';
import { seal, hash, safe, exact, clone } from '../skill-production/common.mjs';

// Mechanical normalization, never semantic repair. No text is rewritten,
// removed, reordered or selected by "importance". A merged claim retains the
// exact same source associations and kind; fresh review remains mandatory.
export function planLosslessClaimPackingV3(draft, dependencies) {
  safe(draft); exact(draft, ['claims']);
  if (!Array.isArray(draft.claims) || draft.claims.length <= 24) return null;
  if (Buffer.byteLength(JSON.stringify(draft)) > 65536) return null;
  // Validate every original claim against the UNCHANGED semantic input
  // contract. Chunking here only checks structure/provenance, not coverage or
  // acceptance; no original clause can escape checking because it is >24.
  for (let i = 0; i < draft.claims.length; i += 24) inspectDraft({ claims: draft.claims.slice(i, i + 24) }, dependencies);
  const groups = draft.claims.map((claim, index) => ({ claim: clone(claim), originalIndices: [index] }));
  const delimiter = '\n\n';
  while (groups.length > 24) {
    const index = groups.findIndex((left, i) => {
      const right = groups[i + 1];
      return right && left.claim.kind === right.claim.kind
        && hash(left.claim.evidence) === hash(right.claim.evidence)
        && left.claim.text.length + delimiter.length + right.claim.text.length <= 1500;
    });
    if (index < 0) return null;
    const [left, right] = groups.slice(index, index + 2);
    groups.splice(index, 2, { claim: { ...left.claim, text: left.claim.text + delimiter + right.claim.text },
      originalIndices: [...left.originalIndices, ...right.originalIndices] });
  }
  const packed = { claims: groups.map(g => g.claim) };
  inspectDraft(packed, dependencies);
  return seal({ schema: 'starcraft_lossless_claim_packing_v3', policy: 'adjacent_same_kind_same_ordered_evidence',
    originalDraftHash: hash(draft), originalClaimCount: draft.claims.length, resultDraftHash: hash(packed),
    resultClaimCount: packed.claims.length, delimiter, draft: packed,
    groups: groups.map((g, index) => ({ claimId: 'claims.' + index,
      originalClaimIds: g.originalIndices.map(i => 'claims.' + i),
      fragmentHashes: g.originalIndices.map(i => hash(draft.claims[i].text)),
      textHash: hash(g.claim.text), evidenceHash: hash(g.claim.evidence) })),
    textBytesRemoved: 0, sourceAssociationsChanged: false, reReviewRequired: true,
    semanticAcceptanceInherited: false, trainingTruth: false });
}
