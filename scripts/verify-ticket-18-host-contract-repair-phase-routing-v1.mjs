import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { verifySeal } from '../packages/skill-production/common.mjs';
import { prepareFactionHostContractRepairPhaseV2 } from
  '../packages/skill-production-v3/faction-structural-json-schema-bridge-v2.mjs';

const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const runId = 'faction-v1-6fb3850f59642566130f';
const roleId = 'faction.zerg_swarm.faction.zerg_swarm.threat_tradeoffs.1.'
  + 'review-target-batch-v1.adversarial.0.0.source-evidence-v1.'
  + '3cd990702ff2ba8b4acc';
const db = new DatabaseSync(filename, { readOnly: true });
try {
  const roleRow = db.prepare(
    "SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'",
  ).get(runId, roleId);
  assert.ok(roleRow, 'saved Host-repair role must exist');
  const value = verifySeal(JSON.parse(roleRow.artifact)).value;
  const record = value.parsedReviewValues[0];
  const rejectedRef = value.initialStructuredIssueRef.rejectedCandidateRef;
  const rejectedRow = db.prepare(
    "SELECT artifact FROM steps WHERE id=? AND state='complete'",
  ).get(rejectedRef.id);
  const rejected = verifySeal(JSON.parse(rejectedRow.artifact)).value;
  let resolveCalls = 0;
  const prepared = prepareFactionHostContractRepairPhaseV2({
    phase: {
      capsule: { hash: value.initialContextCapsuleHash,
        roleRef: rejected.roleRef },
      result: value,
    },
    resolveArtifact: artifactHash => {
      resolveCalls++;
      assert.equal(artifactHash, rejectedRef.hash);
      return rejected;
    },
  });

  assert.equal(prepared.rejected.hash, rejectedRef.hash);
  assert.equal(prepared.repairScope.hash, value.hostContractRepairScope.hash);
  assert.equal(prepared.roleRef.hash,
    record.authenticatedProof.invocation.roleRef.hash);
  assert.equal(record.originalContextHash, value.contextCapsuleHash);
  assert.equal(resolveCalls, 1);
  console.log(JSON.stringify({ ticket: 18, slice: 174, passed: true,
    roleId, resolveCalls, providerCalls: 0,
    repairedContextHash: record.originalContextHash }));
} finally {
  db.close();
}
