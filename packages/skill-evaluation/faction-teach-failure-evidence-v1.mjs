import { DatabaseSync } from 'node:sqlite';
import { verifySeal, fail } from '../skill-production/common.mjs';

export function readFactionTeachFailureEvidenceV1({ filename, runId, attemptId = null,
  fullRoleId = null, failureReceiptHash = null, roleRefHash = null,
  contextManifestRefHash = null }) {
  if (!/^faction-v1-[a-f0-9]{20}$/u.test(runId || '')) fail('FACTION_TEACH_FAILURE_RUN_INVALID');
  const db = new DatabaseSync(filename, { readOnly: true });
  const decode = raw => verifySeal(JSON.parse(raw)).value;
  try {
    if (!attemptId) {
      const receiptBound = /^[a-f0-9]{64}$/u.test(failureReceiptHash || '');
      const identityBound = /^[a-f0-9]{64}$/u.test(roleRefHash || '')
        && /^[a-f0-9]{64}$/u.test(contextManifestRefHash || '');
      if (!fullRoleId || !receiptBound && !identityBound)
        fail('FACTION_TEACH_FAILURE_ID_REQUIRED');
      const rows = (receiptBound
        ? db.prepare("SELECT id,artifact FROM steps WHERE run=? AND state='complete' AND json_extract(artifact,'$.value.roleRef.id')=? AND json_extract(artifact,'$.value.safeReceiptHash')=?")
          .all(runId, fullRoleId, failureReceiptHash)
        : db.prepare("SELECT id,artifact FROM steps WHERE run=? AND state='complete' AND json_extract(artifact,'$.value.roleRef.id')=? AND json_extract(artifact,'$.value.roleRef.hash')=? AND json_extract(artifact,'$.value.contextManifestRef.hash')=?")
          .all(runId, fullRoleId, roleRefHash, contextManifestRefHash))
        .filter(r => r.id.endsWith('.rejected-candidate'));
      if (rows.length !== 1) fail('FACTION_TEACH_FAILURE_CANDIDATE_NOT_UNIQUE');
      attemptId = rows[0].id.slice(0, -'.rejected-candidate'.length);
    }
    const attempt = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(runId, attemptId);
    const rows = ['.issue', '.rejected-candidate'].map(suffix => db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
      .get(runId, attemptId + suffix));
    if (!attempt || rows.some(r => !r)) fail('FACTION_TEACH_FAILURE_EVIDENCE_MISSING');
    const issue = decode(rows[0].artifact);
    const rejected = decode(rows[1].artifact);
    if (fullRoleId && (rejected.roleRef?.id !== fullRoleId
      || roleRefHash && rejected.roleRef?.hash !== roleRefHash
      || contextManifestRefHash
        && rejected.contextManifestRef?.hash !== contextManifestRefHash
      || failureReceiptHash
        && rejected.safeReceiptHash !== failureReceiptHash)) {
      fail('FACTION_TEACH_FAILURE_LOCATOR_DRIFT');
    }
    return { attempt, issue, rejected };
  } finally { db.close(); }
}
