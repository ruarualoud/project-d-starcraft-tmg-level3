import { DatabaseSync } from 'node:sqlite';
import { verifySeal, hash, fail } from '../skill-production/common.mjs';
import { readFactionTeachFailureEvidenceV1 } from '../skill-evaluation/faction-teach-failure-evidence-v1.mjs';
import { FACTION_EDITOR_DRAFT_ENVELOPE_BINDING_V2 as binding } from './faction-editor-draft-envelope-v2.mjs';

// Carry the original failed attempt across descendants even if another lane
// fails before this local edit is revisited. No attempts/fees are copied.
export function collectFactionEditorEnvelopeFailureImportsV2({ filename, parentRunId, parent }) {
  verifySeal(parent);
  const db = new DatabaseSync(filename, { readOnly: true }), evidenceByOrigin = new Map();
  const add = (evidence, permit = null) => {
    const { attempt, issue, rejected } = evidence;
    const key = attempt.run + ':' + attempt.id;
    if (attempt.state !== 'failed' || attempt.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
      || rejected.outputContractRef?.hash !== binding.providerContractRef.hash
      || rejected.roleRef?.version !== 'structured-v1' || !rejected.roleRef.id.includes('.editor.')
      || !Number.isSafeInteger(attempt.settled) || !issue.safeReceiptHash
      || permit && (permit.evidenceHash !== hash(evidence) || permit.rejectedCandidateHash !== rejected.hash))
      fail('FACTION_EDITOR_ENVELOPE_IMPORT_ORIGIN_DRIFT');
    if (evidenceByOrigin.has(key) && hash(evidenceByOrigin.get(key)) !== hash(evidence))
      fail('FACTION_EDITOR_ENVELOPE_IMPORT_ORIGIN_DRIFT');
    evidenceByOrigin.set(key, evidence);
  };
  try {
    if (db.prepare('SELECT recipe FROM runs WHERE id=?').get(parentRunId)?.recipe !== parent.hash)
      fail('FACTION_EDITOR_ENVELOPE_IMPORT_PARENT_DRIFT');
    if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    for (const permit of parent.continuation?.editorEnvelopeFailureImports || [])
      add(readFactionTeachFailureEvidenceV1({ filename, runId: permit.originRunId, attemptId: permit.originAttemptId }), permit);
    const rows = db.prepare("SELECT id,artifact FROM steps WHERE run=? AND state='complete' AND id LIKE '%.rejected-candidate' AND json_extract(artifact,'$.value.outputContractRef.hash')=?")
      .all(parentRunId, binding.providerContractRef.hash);
    for (const row of rows) add(readFactionTeachFailureEvidenceV1({ filename, runId: parentRunId,
      attemptId: row.id.slice(0, -'.rejected-candidate'.length) }));
    const evidence = [...evidenceByOrigin.values()];
    return { evidence, permits: evidence.map(e => ({ originRunId: e.attempt.run, originAttemptId: e.attempt.id,
      evidenceHash: hash(e), rejectedCandidateHash: e.rejected.hash, roleRefHash: e.rejected.roleRef.hash,
      contextManifestHash: e.rejected.contextManifestRef.hash, originalFailureReceiptHash: e.issue.safeReceiptHash,
      acceptanceInherited: false, accountingReset: false })) };
  } finally { db.close(); }
}
