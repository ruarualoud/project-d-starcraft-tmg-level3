import { exact, text, seal, verifySeal, safe, fail, hash } from '../skill-production/common.mjs';
import { resolveSpan } from '../skill-production/spans.mjs';
import { globalSourceAddresses } from './context.mjs';

export const DIAGNOSIS_KINDS = Object.freeze(['content_error', 'citation_error', 'missing_dependency', 'verifier_error', 'source_uncertain']);

// Diagnoses provide a repair hypothesis, never permission to erase a failed
// judgment. Every reference is independently materialized by the host.
export function validateDiagnosis(output, combined, { reader, context }) {
  verifySeal(combined); verifySeal(context); safe(output); exact(output, ['issues']);
  if (combined.contextHash !== context.hash || !Array.isArray(output.issues)
    || output.issues.length !== combined.issues.length) fail('V3_DIAGNOSIS_DENOMINATOR_INVALID');
  const pending = new Map(combined.issues.map(i => [i.fingerprint, i]));
  const allowed = globalSourceAddresses(context);
  const issues = output.issues.map(row => {
    exact(row, ['fingerprint', 'kind', 'reason', 'repairPlan', 'evidence']);
    if (!pending.delete(row.fingerprint) || !DIAGNOSIS_KINDS.includes(row.kind)) fail('V3_DIAGNOSIS_ISSUE_INVALID');
    text(row.reason, 900); text(row.repairPlan, 1200);
    if (!Array.isArray(row.evidence) || !row.evidence.length || row.evidence.length > 4) fail('V3_DIAGNOSIS_EVIDENCE_INVALID');
    const evidence = row.evidence.map(address => {
      exact(address, ['ref', 'spanId']);
      if (!allowed.has(address.ref + '/' + address.spanId)) fail('V3_DIAGNOSIS_SOURCE_INVALID');
      return resolveSpan(reader, address);
    });
    return { ...row, evidence };
  });
  return seal({ schema: 'starcraft_issue_diagnosis_v3', combinedHash: combined.hash,
    candidateHash: combined.issues[0]?.candidateHash || null, contextHash: context.hash, issues,
    canResolveIssues: false, canChangeRules: false, trainingTruth: false });
}

export function advanceIssueJournal(previous, combined, { packetHash, revision, transition }) {
  verifySeal(combined);
  if (combined.packetHash !== packetHash) fail('V3_JOURNAL_PACKET_DRIFT');
  if (previous) {
    verifySeal(previous);
    if (previous.packetHash !== packetHash || previous.contextHash !== combined.contextHash
      || previous.revision + 1 !== revision) fail('V3_JOURNAL_LINEAGE_INVALID');
  } else if (revision !== 0) fail('V3_JOURNAL_START_INVALID');
  const current = new Map(combined.issues.map(i => [i.fingerprint, i]));
  const records = (previous?.records || []).map(record => {
    const next = current.get(record.fingerprint);
    current.delete(record.fingerprint);
    return { ...record, state: next ? 'open' : 'cleared_by_fresh_source_reviews',
      occurrences: record.occurrences + (next ? 1 : 0),
      history: [...record.history, { revision, combinedHash: combined.hash,
        candidateHash: next?.candidateHash || null, state: next ? 'open' : 'cleared_by_fresh_source_reviews',
        issue: next || null }] };
  });
  for (const issue of current.values()) records.push({ fingerprint: issue.fingerprint, state: 'open', occurrences: 1,
    history: [{ revision, combinedHash: combined.hash, candidateHash: issue.candidateHash, state: 'open', issue }] });
  return seal({ schema: 'starcraft_issue_journal_v3', packetHash, contextHash: combined.contextHash, revision,
    parentJournalHash: previous?.hash || null, combinedHash: combined.hash, transition,
    records, openIssues: records.filter(r => r.state === 'open').length,
    semanticEvidenceOnly: true, trainingTruth: false });
}

export function persistIssueJournal(store, packetId, journal) {
  verifySeal(journal);
  const lease = store.acquire(packetId + '.issues.' + journal.revision,
    { journalHash: journal.hash, parentJournalHash: journal.parentJournalHash });
  const result = lease.cached ? lease.artifact : store.finish(lease, journal);
  if (hash(result) !== hash(journal)) fail('V3_JOURNAL_CHECKPOINT_DRIFT');
  return result;
}
