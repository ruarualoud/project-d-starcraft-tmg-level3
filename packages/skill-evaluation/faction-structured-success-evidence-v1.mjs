import { DatabaseSync } from 'node:sqlite';
import { verifySeal, fail } from '../skill-production/common.mjs';

export function readFactionStructuredSuccessEvidenceV1({ filename, runId, attemptId }) {
  if (!/^faction-v1-[a-f0-9]{20}$/u.test(runId || '') || !/^structured-[a-f0-9]{48}$/u.test(attemptId || ''))
    fail('FACTION_STRUCTURED_SUCCESS_ID_INVALID');
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    const attempt = db.prepare("SELECT * FROM attempts WHERE run=? AND id=? AND state='received'").get(runId, attemptId);
    const read = suffix => { const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
      .get(runId, attemptId + suffix); if (!row) fail('FACTION_STRUCTURED_SUCCESS_EVIDENCE_MISSING');
      return verifySeal(JSON.parse(row.artifact)).value; };
    if (!attempt) fail('FACTION_STRUCTURED_SUCCESS_EVIDENCE_MISSING');
    return { attempt, candidate: read('.candidate'), runtimeReceipt: read('.runtime-receipt') };
  } finally { db.close(); }
}
