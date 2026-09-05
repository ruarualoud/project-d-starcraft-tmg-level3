import { clone, exact, fail, hash, safe, seal, text, verifySeal } from '../skill-production/common.mjs';
import { resolveSpan } from '../skill-production/spans.mjs';
import { inspectDraft } from './contracts.mjs';

const key = address => address.ref + '/' + address.spanId;

// Unknown addresses need an evidence selection, NOT a guessed nearest ID or
// wholesale regeneration. The full sources remain in the role's prompt.
export function planDraftAddressRepairV3(draft, { context, packet, reader }) {
  verifySeal(context); verifySeal(packet); safe(draft); exact(draft, ['claims']);
  if (packet.catalogueHash !== context.catalogueHash || reader.catalogueHash !== context.catalogueHash
    || hash(packet.sourceBinding) !== hash(context.sourceBinding)) fail('V3_SOURCE_BINDING_INVALID');
  if (!Array.isArray(draft.claims) || draft.claims.length < 1 || draft.claims.length > 24) return null;
  const choices = context.prompt.sources.flatMap(source => source.passages.map(p => ({
    ref: source.ref, spanId: p.spanId, title: source.title,
  }))).map((choice, addressId) => ({ addressId, ...choice }));
  const allowed = new Set(choices.map(key)), issues = [];
  for (const [i, claim] of draft.claims.entries()) {
    exact(claim, ['kind', 'text', 'evidence']); text(claim.text, 1500);
    if (!['rule', 'strategy', 'caution'].includes(claim.kind)) fail('V3_CLAIM_KIND_INVALID');
    if (!Array.isArray(claim.evidence) || !claim.evidence.length || claim.evidence.length > 4) fail('V3_EVIDENCE_COUNT_INVALID');
    const seen = new Set();
    for (const [j, address] of claim.evidence.entries()) {
      exact(address, ['ref', 'spanId']); text(address.ref, 500); text(address.spanId, 100);
      if (seen.has(key(address))) return null; // Not an unknown-address repair.
      seen.add(key(address));
      if (!allowed.has(key(address))) issues.push({ path: `claims.${i}.evidence.${j}`,
        claimId: 'claims.' + i, evidenceIndex: j, invalidAddress: clone(address), kind: 'unknown_source_address' });
    }
  }
  if (!issues.length) return null;
  return seal({ schema: 'starcraft_draft_address_repair_plan_v3', parentHash: hash(draft),
    contextHash: context.hash, packetHash: packet.hash, issues, choices,
    policy: 'select_from_complete_source_address_table_only_flagged_paths_no_prose_edits',
    semanticAcceptanceInherited: false, trainingTruth: false });
}

export function applyDraftAddressRepairV3(draft, plan, selection, dependencies) {
  verifySeal(plan); safe(selection); exact(selection, ['parentHash', 'corrections']);
  if (planDraftAddressRepairV3(draft, dependencies)?.hash !== plan.hash || selection.parentHash !== hash(draft)) {
    fail('V3_ADDRESS_REPAIR_BINDING_INVALID');
  }
  if (Array.isArray(selection.corrections) && selection.corrections.length === 0) fail('SOURCE_UNCERTAIN_REQUIRES_EXTERNAL_EVIDENCE');
  if (!Array.isArray(selection.corrections) || selection.corrections.length !== plan.issues.length) fail('V3_ADDRESS_REPAIR_DENOMINATOR_INVALID');
  const result = clone(draft), pending = new Map(plan.issues.map(i => [i.path, i])), resolved = [];
  for (const correction of selection.corrections) {
    exact(correction, ['path', 'addressId', 'reason']); text(correction.reason, 900);
    const issue = pending.get(correction.path);
    if (!issue) fail('V3_ADDRESS_REPAIR_PATH_INVALID');
    pending.delete(correction.path);
    if (!Number.isSafeInteger(correction.addressId) || !plan.choices[correction.addressId]) fail('V3_ADDRESS_REPAIR_CHOICE_INVALID');
    const { ref, spanId } = plan.choices[correction.addressId], address = { ref, spanId };
    const claim = result.claims[Number(issue.claimId.slice(7))];
    if (claim.evidence.some(e => key(e) === key(address))) fail('V3_ADDRESS_REPAIR_DUPLICATE');
    claim.evidence[issue.evidenceIndex] = address;
    resolved.push({ path: issue.path, before: issue.invalidAddress,
      after: resolveSpan(dependencies.reader, address), reason: correction.reason });
  }
  inspectDraft(result, dependencies);
  return seal({ schema: 'starcraft_draft_address_repair_receipt_v3', planHash: plan.hash,
    parentHash: hash(draft), selectionHash: hash(selection), draft: result, resultHash: hash(result), resolved,
    proseBytesChanged: 0, unaffectedAddressesChanged: false, reReviewRequired: true,
    semanticAcceptanceInherited: false, trainingTruth: false });
}
