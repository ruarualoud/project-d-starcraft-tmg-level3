import { exact, text, hash, seal, verifySeal, fail, clone, safe } from './common.mjs';
import { resolveSpan } from './spans.mjs';
import { validateSemanticReview, combineSemanticReviews } from './validation.mjs';

export const PACKET_OUTPUT_SHAPE = { claims: [{ kind: 'rule', text: 'Complete conditions and conclusion in Chinese.',
  evidence: [{ ref: 'source ID', spanId: 'p1' }] }] };

export function inspectPacket(draft, { packet, reader, readRefs }) {
  verifySeal(packet); safe(draft); exact(draft, ['claims']);
  if (!Array.isArray(draft.claims) || !draft.claims.length || draft.claims.length > 24) fail('PACKET_CLAIM_COUNT_INVALID');
  const required = new Map(packet.passages.map(p => [p.ref + '/' + p.spanId, p]));
  const allowed = new Map([...packet.passages, ...(packet.contextPassages || [])].map(p => [p.ref + '/' + p.spanId, p]));
  const covered = new Set(), findings = [];
  const claims = draft.claims.map((c, i) => {
    exact(c, ['kind', 'text', 'evidence']); text(c.text, 1500);
    if (!['rule', 'strategy', 'caution'].includes(c.kind)) fail('PACKET_CLAIM_KIND_INVALID');
    if (!Array.isArray(c.evidence) || !c.evidence.length || c.evidence.length > 4) fail('PACKET_EVIDENCE_COUNT_INVALID');
    const claimId = 'claims.' + i;
    const evidence = c.evidence.map(address => {
      exact(address, ['ref', 'spanId']);
      const key = address.ref + '/' + address.spanId, expected = allowed.get(key);
      if (!expected) fail('PACKET_EVIDENCE_OUT_OF_SCOPE');
      if (!readRefs.includes(address.ref)) fail('PACKET_SOURCE_NOT_READ');
      const resolved = resolveSpan(reader, address);
      if (resolved.evidenceHash !== expected.sourceHash || hash(resolved.quote) !== expected.textHash) fail('PACKET_SOURCE_DRIFT');
      covered.add(key); return resolved;
    });
    return { claimId, field: c.kind, text: c.text, evidence };
  });
  for (const [key, address] of required) if (!covered.has(key)) findings.push({ claimId: 'coverage',
    code: 'PACKET_PASSAGE_UNCOVERED', ref: address.ref, spanId: address.spanId });
  return seal({ chapterId: packet.id, draftHash: hash(draft), claims, findings,
    structuralAndProvenancePassed: !findings.length, factsVerified: false, currentBinding: reader.binding, trainingTruth: false });
}

// A localized revision can fix existing claims AND add an omitted passage.
// Stable parent CAS and append-only claim indices preserve unrelated output.
export function applyPacketPatch(draft, patch, findings) {
  safe(patch); exact(patch, ['parentHash', 'replacements', 'additions']);
  if (patch.parentHash !== hash(draft)) fail('PACKET_PATCH_STALE');
  if (!Array.isArray(patch.replacements) || !Array.isArray(patch.additions)
    || !patch.replacements.length && !patch.additions.length) fail('PACKET_PATCH_EMPTY');
  const allowed = new Set(findings.filter(f => f.claimId !== 'coverage').map(f => f.claimId));
  const gaps = new Set(findings.filter(f => f.claimId === 'coverage').map(f => f.ref + '/' + f.spanId));
  const copy = clone(draft), seen = new Set();
  for (const replacement of patch.replacements) {
    exact(replacement, ['claimId', 'value']);
    if (!allowed.has(replacement.claimId) || seen.has(replacement.claimId)) fail('PACKET_PATCH_PATH_REJECTED');
    const matched = /^claims\.(\d+)$/.exec(replacement.claimId);
    if (!matched || !copy.claims[Number(matched[1])]) fail('PACKET_PATCH_PATH_REJECTED');
    seen.add(replacement.claimId);
    if (hash(copy.claims[Number(matched[1])]) === hash(replacement.value)) fail('PACKET_PATCH_NO_CHANGE');
    copy.claims[Number(matched[1])] = clone(replacement.value);
  }
  for (const addition of patch.additions) {
    if (!addition.evidence?.some(a => gaps.has(a.ref + '/' + a.spanId))) fail('PACKET_PATCH_ADDITION_UNAUTHORIZED');
    copy.claims.push(clone(addition));
  }
  // No publication here. Every claim and source gap must be re-inspected and
  // independently reviewed, including additions and changed conditions.
  return copy;
}

export function validatePacketReview(output, inventory, { packet, reader, reviewId, role }) {
  exact(output, ['verdicts', 'passageCoverage']);
  const review = validateSemanticReview({ verdicts: output.verdicts }, inventory, { reader, reviewId, role });
  const remaining = new Set(packet.passages.map(p => p.ref + '/' + p.spanId));
  if (!Array.isArray(output.passageCoverage) || output.passageCoverage.length !== remaining.size) fail('PASSAGE_REVIEW_DENOMINATOR_INVALID');
  const passageCoverage = output.passageCoverage.map(row => {
    exact(row, ['ref', 'spanId', 'verdict', 'reason']);
    if (!remaining.delete(row.ref + '/' + row.spanId) || !['covered', 'omission', 'unknown'].includes(row.verdict)) fail('PASSAGE_REVIEW_INVALID');
    text(row.reason, 900); return clone(row);
  });
  const { hash: ignored, ...body } = review;
  return seal({ ...body, packetHash: packet.hash, passageCoverage });
}

export function combinePacketReviews(inventory, packet, reviews) {
  if (reviews.length !== 2 || reviews.some(r => r.packetHash !== packet.hash)) fail('PACKET_REVIEW_BINDING_INVALID');
  const combined = combineSemanticReviews(inventory, ...reviews);
  const findings = [...combined.findings];
  for (const review of reviews) for (const coverage of review.passageCoverage) {
    if (coverage.verdict !== 'covered') findings.push({ claimId: 'coverage', code: 'SEMANTIC_SOURCE_OMISSION_OR_UNKNOWN',
      ref: coverage.ref, spanId: coverage.spanId, reason: coverage.reason });
  }
  const { hash: ignored, ...body } = combined;
  return seal({ ...body, findings, passed: findings.length === 0,
    coverageEvidence: 'two_independent_source_completeness_reviews_not_formal_proof' });
}
