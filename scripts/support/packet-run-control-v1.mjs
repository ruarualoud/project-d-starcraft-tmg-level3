import { DatabaseSync } from 'node:sqlite';
import { seal, hash, verifySeal, fail } from '../../packages/skill-production/common.mjs';

// Administrative cooperative stop for the existing durable runner. Fence the
// current role's completion lease, NOT its billable attempt. The role continues
// to settle any in-flight usage, then finish() rejects and its normal catch
// releases the lease. No process kill, lost intent or invented cost entry.
export function pausePacketRunAfterCurrentRole({ filename, runId, recipeHash, now = Date.now }) {
  if (!/^rules-v2-[a-f0-9]{20}$/.test(runId) || runId !== 'rules-v2-' + recipeHash.slice(0, 20)) fail('PACKET_PAUSE_RUN_INVALID');
  const db = new DatabaseSync(filename);
  try {
    db.exec('PRAGMA busy_timeout=5000; BEGIN IMMEDIATE');
    if (db.prepare('SELECT recipe FROM runs WHERE id=?').get(runId)?.recipe !== recipeHash) fail('PACKET_PAUSE_RECIPE_DRIFT');
    const leases = db.prepare("SELECT * FROM steps WHERE run=? AND state='running'").all(runId);
    if (leases.length !== 1 || !/^rules-reading-\d{3}\./.test(leases[0].id)) fail('PACKET_PAUSE_ROLE_BOUNDARY_UNAVAILABLE');
    const lease = leases[0], id = 'operator-pause.' + hash({ runId, stageId: lease.id, generation: lease.generation }).slice(0, 24);
    const existing = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(runId, id);
    if (existing) { db.exec('COMMIT'); return verifySeal(JSON.parse(existing.artifact)).value; }
    const receipt = seal({ runId, recipeHash, stageId: lease.id, generation: lease.generation,
      requestedAt: now(), originalExpiry: lease.expires, policy: 'settle_current_role_then_fenced_completion',
      providerAttemptMutated: false, processKilled: false, trainingTruth: false });
    const updated = db.prepare("UPDATE steps SET expires=0 WHERE run=? AND id=? AND generation=? AND owner=? AND state='running'")
      .run(runId, lease.id, lease.generation, lease.owner);
    if (updated.changes !== 1) fail('PACKET_PAUSE_LEASE_CONFLICT');
    db.prepare("INSERT INTO steps VALUES(?,?,?,1,NULL,0,'complete',?)")
      .run(runId, id, hash({ recipeHash, stageId: lease.id, generation: lease.generation }), JSON.stringify(seal({ value: receipt })));
    db.exec('COMMIT'); return receipt;
  } catch (error) { try { db.exec('ROLLBACK'); } catch {} throw error; }
  finally { db.close(); }
}
