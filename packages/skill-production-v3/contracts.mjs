import { exact, text, hash, seal, verifySeal, fail, clone, safe } from '../skill-production/common.mjs';
import { resolveSpan } from '../skill-production/spans.mjs';
import { validateSemanticReview } from '../skill-production/validation.mjs';
import { globalSourceAddresses } from './context.mjs';

const key = value => value.ref + '/' + value.spanId;
export const DRAFT_SHAPE = { claims: [{ kind: 'rule', text: 'Chinese claim with full conditions', evidence: [{ ref: 'source ID', spanId: 'p1' }] }] };

export function inspectDraft(draft, { packet, context, reader }) {
  verifySeal(packet); verifySeal(context); safe(draft); exact(draft, ['claims']);
  if (packet.catalogueHash !== context.catalogueHash || hash(packet.sourceBinding) !== hash(context.sourceBinding)
    || reader.catalogueHash !== context.catalogueHash) fail('V3_SOURCE_BINDING_INVALID');
  if (!Array.isArray(draft.claims) || draft.claims.length < 1 || draft.claims.length > 24) fail('V3_CLAIM_COUNT_INVALID');
  const allowed = globalSourceAddresses(context), cited = new Set();
  const claims = draft.claims.map((c, index) => {
    exact(c, ['kind', 'text', 'evidence']); text(c.text, 1500);
    if (!['rule', 'strategy', 'caution'].includes(c.kind)) fail('V3_CLAIM_KIND_INVALID');
    if (!Array.isArray(c.evidence) || c.evidence.length < 1 || c.evidence.length > 4) fail('V3_EVIDENCE_COUNT_INVALID');
    const seen = new Set();
    const evidence = c.evidence.map(address => {
      exact(address, ['ref', 'spanId']);
      if (!allowed.has(key(address)) || seen.has(key(address))) fail('V3_EVIDENCE_ADDRESS_INVALID');
      seen.add(key(address)); cited.add(key(address));
      const resolved = resolveSpan(reader, address);
      if (context.manifest.sourceHashes.find(s => s.ref === address.ref)?.hash !== resolved.evidenceHash) fail('V3_SOURCE_DRIFT');
      return resolved;
    });
    return { claimId: 'claims.' + index, field: c.kind, text: c.text, evidence };
  });
  return seal({ schema: 'starcraft_claim_inventory_v3', chapterId: packet.id, packetHash: packet.hash,
    draftHash: hash(draft), contextHash: context.hash, claims, findings: [],
    unlinkedPassages: packet.passages.filter(p => !cited.has(key(p))).map(p => ({ ref: p.ref, spanId: p.spanId })),
    structuralAndProvenancePassed: true, factsVerified: false, currentBinding: reader.binding,
    provenance: 'host_materialized_full_source_prompt_not_invented_model_tool_reads', trainingTruth: false });
}

export function validateReview(output, inventory, { packet, context, reader, reviewId, role }) {
  verifySeal(inventory); verifySeal(packet); verifySeal(context); safe(output);
  exact(output, ['verdicts', 'passageCoverage']);
  if (inventory.packetHash !== packet.hash || inventory.contextHash !== context.hash) fail('V3_REVIEW_BINDING_INVALID');
  const base = validateSemanticReview({ verdicts: output.verdicts }, inventory, { reader, reviewId, role });
  const allowed = globalSourceAddresses(context);
  if (base.verdicts.some(v => v.evidence.some(e => !allowed.has(key(e))))) fail('V3_REVIEW_EVIDENCE_OUT_OF_CONTEXT');
  const pending = new Set(packet.passages.map(key));
  if (!Array.isArray(output.passageCoverage) || output.passageCoverage.length !== pending.size) fail('V3_COVERAGE_DENOMINATOR_INVALID');
  const claimIds = new Set(inventory.claims.map(c => c.claimId));
  const passageCoverage = output.passageCoverage.map(row => {
    exact(row, ['ref', 'spanId', 'verdict', 'reason',
      ...(Object.hasOwn(row, 'claimIds') ? ['claimIds'] : []), ...(Object.hasOwn(row, 'evidence') ? ['evidence'] : [])]);
    if (!pending.delete(key(row)) || !['covered', 'non_normative', 'omission', 'unknown'].includes(row.verdict)) fail('V3_COVERAGE_ROW_INVALID');
    text(row.reason, 900);
    if (Object.hasOwn(row, 'claimIds') && (!Array.isArray(row.claimIds) || row.claimIds.some(id => !claimIds.has(id))
      || new Set(row.claimIds).size !== row.claimIds.length)) fail('V3_COVERAGE_CLAIM_INVALID');
    if (Object.hasOwn(row, 'evidence') && (!Array.isArray(row.evidence) || !row.evidence.length || row.evidence.length > 4
      || row.evidence.some(e => { exact(e, ['ref', 'spanId']); return !allowed.has(key(e)); }))) fail('V3_COVERAGE_EVIDENCE_INVALID');
    if (row.verdict === 'non_normative' && row.claimIds?.length) fail('V3_NON_NORMATIVE_CLAIM_CONTRADICTION');
    const source = resolveSpan(reader, { ref: row.ref, spanId: row.spanId });
    return { ...clone(row), sourceEvidence: source };
  });
  const { hash: ignored, ...body } = base;
  return seal({ ...body, schema: 'starcraft_packet_review_v3', packetHash: packet.hash, contextHash: context.hash, passageCoverage });
}

export function reconcileReviews(inventory, packet, reviews) {
  verifySeal(inventory); verifySeal(packet); reviews.forEach(verifySeal);
  if (reviews.length !== 2 || new Set(reviews.map(r => r.reviewId)).size !== 2
    || reviews[0].role !== 'supportive_reviewer' || reviews[1].role !== 'adversarial_reviewer'
    || reviews.some(r => r.packetHash !== packet.hash || r.contextHash !== inventory.contextHash
      || r.candidateHash !== inventory.draftHash || r.inventoryHash !== inventory.hash)) fail('V3_REVIEW_CONTEXT_INVALID');
  const issues = [], dispositions = [];
  function issue(row) { issues.push({ ...row, fingerprint: hash({ kind: row.kind, claimId: row.claimId || null,
    ref: row.ref || null, spanId: row.spanId || null }), candidateHash: inventory.draftHash }); }
  for (const claim of inventory.claims) {
    const verdicts = reviews.map(r => r.verdicts.find(v => v.claimId === claim.claimId));
    if (verdicts.some(v => !v)) fail('V3_CLAIM_REVIEW_MISSING');
    if (verdicts.some(v => v.verdict !== 'supported')) issue({ kind: verdicts[0].verdict === verdicts[1].verdict
      ? 'claim_unsupported_or_unknown' : 'claim_review_disagreement', claimId: claim.claimId,
    reason: verdicts.map(v => v.reason).join(' | '), evidence: verdicts.flatMap(v => v.evidence.map(e => ({ ref: e.ref, spanId: e.spanId }))) });
  }
  for (const passage of packet.passages) {
    const rows = reviews.map(r => r.passageCoverage.find(p => key(p) === key(passage)));
    if (rows.some(r => !r)) fail('V3_PASSAGE_REVIEW_MISSING');
    const address = { ref: passage.ref, spanId: passage.spanId };
    if (rows.every(r => r.verdict === 'non_normative')) {
      dispositions.push({ ...address, kind: 'non_normative', reasons: rows.map(r => r.reason), reviewHashes: reviews.map(r => r.hash) });
      continue;
    }
    if (rows.some(r => r.verdict !== 'covered')) {
      issue({ ...address, kind: rows.every(r => r.verdict === 'omission') ? 'source_omission' : 'source_review_disagreement',
        reason: rows.map(r => r.verdict + ': ' + r.reason).join(' | '), claimIds: [...new Set(rows.flatMap(r => r.claimIds || []))] });
      continue;
    }
    if (inventory.unlinkedPassages.some(p => key(p) === key(passage))) {
      const candidates = [...new Set(rows.flatMap(r => r.claimIds || []))];
      issue({ ...address, kind: 'citation_missing', claimId: candidates.length === 1 ? candidates[0] : null,
        reason: 'Both reviews found the material covered, but the draft has no citation to this assigned source passage. Add a correct source association without changing unrelated content.' });
    } else dispositions.push({ ...address, kind: 'rule_covered', reviewHashes: reviews.map(r => r.hash) });
  }
  return seal({ inventoryHash: inventory.hash, contextHash: inventory.contextHash, packetHash: packet.hash,
    reviewHashes: reviews.map(r => r.hash), issues, dispositions, passed: issues.length === 0,
    meaning: 'source_grounded_semantic_evidence_not_formal_truth_or_arena_proof', trainingTruth: false });
}

export function applyIssuePatch(draft, patch, issues) {
  safe(patch);
  exact(patch, ['parentHash', 'replacements', 'additions', ...(Object.hasOwn(patch, 'citationAdditions') ? ['citationAdditions'] : [])]);
  if (patch.parentHash !== hash(draft)) fail('V3_PATCH_PARENT_INVALID');
  if (![patch.replacements, patch.additions, Object.hasOwn(patch, 'citationAdditions') ? patch.citationAdditions : []].every(Array.isArray)) fail('V3_PATCH_SHAPE_INVALID');
  const result = clone(draft), changedIds = new Set();
  const replacementIds = new Set(issues.filter(i => i.kind.startsWith('claim_')).map(i => i.claimId));
  const gaps = issues.filter(i => ['source_omission', 'source_review_disagreement', 'citation_missing'].includes(i.kind));
  for (const gap of gaps.filter(g => g.kind !== 'citation_missing')) for (const id of gap.claimIds || []) replacementIds.add(id);
  for (const entry of patch.replacements) {
    exact(entry, ['claimId', 'value']);
    const index = Number(/^claims\.(\d+)$/.exec(entry.claimId)?.[1]);
    if (!replacementIds.has(entry.claimId) || !result.claims[index] || changedIds.has(entry.claimId)) fail('V3_PATCH_PATH_REJECTED');
    if (hash(result.claims[index]) === hash(entry.value)) continue;
    result.claims[index] = clone(entry.value); changedIds.add(entry.claimId);
  }
  for (const entry of patch.citationAdditions || []) {
    exact(entry, ['claimId', 'evidence']);
    const index = Number(/^claims\.(\d+)$/.exec(entry.claimId)?.[1]);
    if (!result.claims[index] || changedIds.has(entry.claimId) || !Array.isArray(entry.evidence) || !entry.evidence.length) fail('V3_CITATION_PATCH_INVALID');
    for (const address of entry.evidence) {
      exact(address, ['ref', 'spanId']);
      if (!gaps.some(g => key(g) === key(address) && (!g.claimId || g.claimId === entry.claimId))) fail('V3_CITATION_PATCH_UNAUTHORIZED');
      if (!result.claims[index].evidence.some(e => key(e) === key(address))) result.claims[index].evidence.push(clone(address));
    }
    changedIds.add(entry.claimId);
  }
  for (const addition of patch.additions) {
    if (!addition.evidence?.some(e => gaps.some(g => key(g) === key(e)))) fail('V3_PATCH_ADDITION_UNAUTHORIZED');
    result.claims.push(clone(addition));
  }
  const changed = hash(result) !== hash(draft);
  return { draft: result, changed, disposition: changed ? 'reinspect_and_independently_review'
    : 'diagnosis_required_no_progress' };
}
