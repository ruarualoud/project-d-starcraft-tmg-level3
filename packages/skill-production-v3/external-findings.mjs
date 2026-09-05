import { verifySeal, seal, hash, fail, text, exact } from '../skill-production/common.mjs';
import { resolveSpan } from '../skill-production/spans.mjs';

export function createExternalClaimFinding({ candidate, context, reader, claimId, kind, reason, evidence }) {
  verifySeal(candidate); verifySeal(context); text(reason, 1600);
  if (!['unsupported_permission', 'invented_precedence', 'omitted_conditions', 'ambiguous_procedure'].includes(kind)
    || candidate.contextHash !== context.hash) fail('EXTERNAL_FINDING_SCOPE_INVALID');
  const index = Number(/^claims\.(\d+)$/.exec(claimId)?.[1]), claim = candidate.draft.claims[index];
  if (!claim || !Array.isArray(evidence) || !evidence.length || evidence.length > 4) fail('EXTERNAL_FINDING_TARGET_INVALID');
  const sources = evidence.map(address => { exact(address, ['ref', 'spanId']); return resolveSpan(reader, address); });
  if (sources.some(s => !context.manifest.sourceHashes.some(row => row.ref === s.ref && row.hash === s.evidenceHash))) fail('EXTERNAL_FINDING_SOURCE_DRIFT');
  return seal({ schema: 'starcraft_external_claim_finding_v1', gameId: 'starcraft-tmg', packetId: candidate.packetId,
    candidateHash: candidate.hash, draftHash: hash(candidate.draft), claimId, claimTextHash: hash(claim.text), claimText: claim.text,
    contextHash: context.hash, catalogueHash: context.catalogueHash, sourceBinding: context.sourceBinding,
    kind, reason, evidence: sources, source: 'independent_developer_source_audit_not_provider_consensus',
    status: 'open', blocksUnchangedClaim: true, canAffectRules: false, trainingTruth: false });
}

export function recordExternalClaimFinding(store, finding) {
  verifySeal(finding);
  const lease = store.acquire('external-finding.' + finding.hash, { findingHash: finding.hash });
  return lease.cached ? lease.artifact : store.finish(lease, finding);
}

export function externalBlockersForCandidate(db, candidate) {
  verifySeal(candidate);
  const findings = db.prepare("SELECT artifact FROM steps WHERE id LIKE 'external-finding.%' AND state='complete'").all()
    .map(row => verifySeal(verifySeal(JSON.parse(row.artifact)).value));
  return findings.filter(f => f.schema === 'starcraft_external_claim_finding_v1' && f.status === 'open'
    && f.packetId === candidate.packetId && f.contextHash === candidate.contextHash
    && f.claimTextHash === hash(candidate.draft.claims[Number(/^claims\.(\d+)$/.exec(f.claimId)?.[1])]?.text ?? null));
}

export function assertNoKnownExternalClaimFailure(db, candidate) {
  const blockers = externalBlockersForCandidate(db, candidate);
  if (blockers.length) fail('KNOWN_EXTERNAL_PACKET_ISSUE', { findingHashes: blockers.map(f => f.hash) });
}
