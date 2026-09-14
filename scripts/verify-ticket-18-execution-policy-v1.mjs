import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
import { withPhasedSessionDeadlineV1 } from '../packages/skill-production/session-lifecycle-v1.mjs';
import { PRODUCTION_EXECUTION_POLICY_V1 as policy, withProductionExecutionPolicyV1,
  verifyProductionArtifactPolicyV1, auditProductionExecutionRowsV1,
  verifyProductionExecutionMigrationV1 } from '../packages/skill-production/execution-policy-v1.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { withCheckpointContinuation } from '../packages/skill-production/continuation.mjs';
import { factionReviewDecompositionArgsV1, collectFactionReviewDecompositionStepsV1 }
  from '../packages/skill-production-v3/faction-review-decomposition-continuation-v1.mjs';

const [mode, timingPath] = process.argv.slice(2);
assert.ok(mode === '--component' && !timingPath || mode === '--qualify' && timingPath);
const base = 'build/ticket-18-faction-production-v1/';
const json = async file => verifySeal(JSON.parse(await readFile(file, 'utf8')));
const body = value => { const { hash: ignored, ...rest } = value; return rest; };
let checks = 0;
for (const script of ['verify-ticket-18-session-lifecycle-v1.mjs', 'verify-ticket-18-production-failure-routing-v1.mjs',
  'verify-ticket-18-recipe-journal-resolution-v1.mjs']) {
  const result = JSON.parse(execFileSync(process.execPath, ['scripts/' + script], { encoding: 'utf8', maxBuffer: 100000 }).trim());
  assert.equal(result.passed, true); assert.equal(result.providerCalls, 0); checks += result.checks;
}
const originRunId = 'faction-v1-27ef94cd6f32462ec36a';
const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
const attempts = () => db.prepare('SELECT * FROM attempts ORDER BY run,id').all();
const before = hash(attempts());
const decode = row => ({ id: row.id, inputHash: row.input_hash, artifact: verifySeal(JSON.parse(row.artifact)).value });
const rows = db.prepare("SELECT id,input_hash,artifact FROM steps WHERE run=? AND state='complete'").all(originRunId).map(decode);
const old = rows.find(row => row.artifact?.loop?.runtimeBinding && !row.artifact.loop.lifecycle);
assert.ok(old); checks++;
const permit = { id: old.id, inputHash: old.inputHash, artifactHash: hash(old.artifact) };
const local = openProductionStore(':memory:', { runId: 'execution-policy-test', recipeHash: hash('execution-policy-test') });
const wrapped = withProductionExecutionPolicyV1(local, policy, { inherited: [permit] });
const continued = withCheckpointContinuation(wrapped, { manifest: seal({ parentRunId: originRunId,
  parentRecipeHash: hash('fixture-parent'), reusable: [permit] }), steps: [old] });
// Use the actual input hash as a lease: the policy accepts precisely that
// frozen artifact, while the continuation wrapper's separate test proves CAS.
const savedLease = local.acquire(old.id, { test: 'old' });
assert.throws(() => wrapped.finish(savedLease, old.artifact)); checks++;
local.release(savedLease);
const actualLease = { ...savedLease, inputHash: old.inputHash };
let writes = 0;
const boundary = withProductionExecutionPolicyV1({ finish: (_lease, value) => { writes++; return value; } }, policy, { inherited: [permit] });
assert.deepEqual(boundary.finish(actualLease, old.artifact), old.artifact); checks++;
assert.throws(() => boundary.finish({ ...actualLease, id: 'new-role' }, old.artifact)); checks++;
assert.equal(writes, 1); checks++;
const inheritedAudit = { recipe: seal({ executionPolicyBinding: policy,
  continuation: seal({ parentRunId: originRunId, reusable: [permit] }) }), rows: [old],
  readInheritedRow: (owner, id) => owner === originRunId && id === old.id ? old : null };
assert.equal(auditProductionExecutionRowsV1(inheritedAudit).inheritedRows, 1); checks++;
assert.throws(() => auditProductionExecutionRowsV1({ ...inheritedAudit, readInheritedRow: () => null })); checks++;
assert.throws(() => auditProductionExecutionRowsV1({ ...inheritedAudit,
  recipe: seal({ executionPolicyBinding: policy }) })); checks++;
let time = 0;
const clock = { now: () => time, setTimer: () => 1, clearTimer: () => {} };
const completed = await withPhasedSessionDeadlineV1({ maxWallMs: 100, clock }, async life => {
  time += 3; await life.guard(async () => { time += 2; })(); life.beginFinalization(); time++;
  return { runtimeBinding: old.artifact.loop.runtimeBinding, sandboxReceipt: { injected: true }, transcript: [] };
});
const fresh = seal({ loop: seal(completed) });
assert.equal(verifyProductionArtifactPolicyV1(fresh, policy), 1); checks++;
assert.equal(verifyProductionArtifactPolicyV1({ fragment: { record: fresh } }, policy), 1); checks++;
for (const delta of [{ policyHash: hash('wrong') }, { operationDrained: false }, { finalCommandObserved: false },
  { status: 'failed' }, { timeoutPhase: 'execution' }, { totalMs: -1 },
  { limitsMs: { ...completed.lifecycle.limitsMs, execution: 180001 } },
  { durationsMs: { ...completed.lifecycle.durationsMs, execution: 1000000 } }]) {
  const invalid = seal({ loop: seal({ ...body(fresh.loop), lifecycle: seal({ ...body(completed.lifecycle), ...delta }) }) });
  assert.throws(() => verifyProductionArtifactPolicyV1(invalid, policy)); checks++;
}
const diagnosis = await json(base + 'terran-wire-context-diagnosis-v2.json');
const input = await json(base + diagnosis.originRunId + '/terran_armed_forces-input.json');
const args = factionReviewDecompositionArgsV1({ filename: 'build/ticket-17-production-redesign-v1/production.sqlite', input, diagnosis });
const unknown = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(originRunId,
  'structured-7b7d33f4d14ac43082f54c8fcd251ad74afa7a754d69ece2');
const collectorArgs = { args, rows: rows.filter(row => row.id.startsWith(unknown.id)), attempts: [unknown],
  dshBindingHash: old.artifact.loop.runtimeBinding.hash, egressBinding: {},
  resolveCapability: () => assert.fail('No capability needed to isolate unknown delivery'),
  readSuccessEvidence: () => assert.fail('Unknown delivery is not success'),
  fullRoleId: diagnosis.request.packet.id + '.' + diagnosis.request.roleId,
  packetHash: diagnosis.request.packet.hash, allowedRunIds: [originRunId] };
assert.throws(() => collectFactionReviewDecompositionStepsV1(collectorArgs),
  { code: 'FACTION_REVIEW_FRAGMENT_UNMATERIALIZED_ATTEMPT_STOP' }); checks++;
const isolated = collectFactionReviewDecompositionStepsV1({ ...collectorArgs, executionPolicyBinding: policy });
assert.equal(isolated.proof.quarantinedTasks.length, 1); checks++;
assert.equal(isolated.proof.quarantinedTasks[0].originAttemptId, unknown.id); checks++;
assert.equal(isolated.proof.quarantinedTasks[0].newProviderCallsPermitted, 0); checks++;
assert.equal(isolated.steps.length, 0); checks++;
assert.equal(hash(attempts()), before); checks++;
local.close(); db.close();

const files = ['packages/skill-production/loops.mjs', 'packages/skill-production/prepared-runtime-cache-v1.mjs',
  'packages/skill-production/session-lifecycle-v1.mjs', 'packages/skill-production/production-failure-routing-v1.mjs',
  'packages/skill-production/execution-policy-v1.mjs',
  'packages/skill-production-v3/faction-parallel-v1.mjs', 'packages/skill-production-v3/faction-continuation-v1.mjs',
  'packages/skill-production-v3/faction-review-decomposition-continuation-v1.mjs',
  'packages/skill-evaluation/faction-production-replay-v1.mjs',
  'scripts/run-ticket-18-faction-strategy-production-v1.mjs', 'scripts/verify-ticket-18-execution-policy-v1.mjs',
  'scripts/verify-ticket-18-session-lifecycle-v1.mjs', 'scripts/verify-ticket-18-production-failure-routing-v1.mjs',
  'scripts/diagnose-ticket-18-dsh-recovery-timing-v1.mjs'];
files.push('scripts/check-ticket-18-faction-launch-readiness-v1.mjs', 'scripts/verify-ticket-18-recipe-journal-resolution-v1.mjs');
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) })));
const readiness = seal({ passed: true, bindingHash: policy.hash, providerCalls: 0, oldArtifactsPreserved: true,
  newMissingLifecycleRejected: true, actualFailureRoutingPassed: true, codeHashes });
const parent = await json(base + originRunId + '/recipe.json');
const next = seal({ ...body(parent), executionPolicyBinding: policy, executionPolicyReadinessHash: readiness.hash,
  codeHashes: [...parent.codeHashes.filter(r => !files.includes(r.file)), ...codeHashes] });
assert.equal(verifyProductionExecutionMigrationV1({ parent, next, readiness }).accountingReset, false); checks++;
for (const delta of [{ dshBindingHash: hash('changed runtime') }, { contextHash: hash('changed source') },
  { executionPolicyReadinessHash: hash('forged') }, { executionPolicyBinding: null }]) {
  assert.throws(() => verifyProductionExecutionMigrationV1({ parent, next: seal({ ...body(next), ...delta }), readiness })); checks++;
}
let timing = null;
if (mode === '--qualify') {
  assert.ok(timingPath.startsWith(base + 'dsh-recovery-timing-') && timingPath.endsWith('/report.json'));
  timing = await json(timingPath);
  assert.equal(timing.providerCalls, 0); assert.equal(timing.originalAttemptsUnchanged, true);
  assert.equal(timing.dshBindingHash, parent.dshBindingHash);
  assert.equal(timing.sessionPolicy, 'phased-v1');
  assert.ok(timing.lanes.length && timing.lanes.every(row => row.status === 'recovered' && row.actualInputMatched
    && row.lifecycle?.policyHash === policy.sessionPolicyHash)); checks += 5;
}
const report = seal({ ...body(readiness), checks, actualTaskQuarantinePassed: true,
  historicalAttemptHash: before, actualOriginRunId: originRunId, actualDshRecoveryReportHash: timing?.hash || null,
  actualDshSessions: timing?.lanes.length || 0, scope: 'shared_execution_and_journal_boundary_not_skill_quality',
  sourceRefreshPerformed: false, runtimeAccepted: false, trainingTruth: false });
if (timing) await writeFile(base + 'execution-policy-readiness-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, providerCalls: 0, readinessWritten: !!timing, hash: report.hash }));
