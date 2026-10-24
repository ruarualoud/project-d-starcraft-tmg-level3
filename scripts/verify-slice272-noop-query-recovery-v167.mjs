import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as recovery from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
const [base, output] = process.argv.slice(2);
const report = { checks: [], providerCalls: 0, nativeActions: 0, sourceDraftWrites: 0 };
try {
  const d = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json', 'utf8'));
  const saved = d.teachFramework.state.queryRecovery.operations.find(o => o.originalQueryId === 'query-r3-58d46176213b96e1e111f839');
  const pending = d.teachFramework.state.replyCorrections.findLast(r => r.correction?.code === 'ROSTER_TEACH_QUERY_DELTA_NO_CHANGE');
  const paid = pending.correction.previousOutput;
  const request = saved.request, failure = saved.currentFailure;
  const materialize = recovery.materializeRosterTeachRecoveryDeltaV1 || recovery.applyRosterTeachQueryDeltaV1;
  const question = { questionId: saved.questionId, evidenceRequest: request };
  const state = { framework: {}, agenda: { questions: [question] }, evidence: [],
    investigation: { operations: [{ queryId: 'actual-noop', questionId: question.questionId, request }],
      evidence: [{ ...failure, challengeId: 'actual-noop' }] } };
  let asks = 0, executions = 0, feedback = false;
  await recovery.recoverRosterTeachQueriesV1({ state, plan: {}, context: {}, sourceHash: 'a'.repeat(64), completedBeforeRun: false,
    checkpoint: async () => {}, evidencePort: { descriptor: () => ({ descriptorHash: 'b'.repeat(64) }),
      query: async () => { executions++; return { status: 'advisory', receiptHash: 'c'.repeat(64) }; } },
    ask: async (_kind, nodes) => {
      asks++;
      if (asks === 1) {
        // Same semantic precheck as the production ask boundary.
        materialize({ request, failure, reply: paid });
        return paid;
      }
      feedback = nodes.some(n => n.result?.queryRepair?.unchangedRequest === true);
      return { disposition: 'retry', kind: 'patch', toolRequestJson: '', publicReason: 'Concrete fixture coordinate change',
        edits: [{ op: 'replace', path: '/toolRequest/spec/placements/3/xInches', valueJson: '26' }] };
    } });
  assert.equal(asks, 2);
  assert.equal(executions, 1, 'The no-op never re-executes the failed query');
  assert.equal(feedback, true);
  const operation = state.queryRecovery.operations[0];
  assert.equal(operation.maximumAttempts, 3);
  assert.equal(operation.choices.length, 2);
  assert.equal(operation.result.status, 'advisory');
  assert(operation.previousResults.some(r => r.unknownReasonCode === 'ROSTER_TEACH_RECOVERY_REQUEST_UNCHANGED'));
  assert.equal(operation.request.toolRequest.spec.placements[3].xInches, 26);
  assert.deepEqual(operation.request.toolRequest.followUps, request.toolRequest.followUps);
  assert.throws(() => materialize({ request, failure, reply: { ...paid,
    edits: [{ op: 'replace', path: '/unrelated', valueJson: 'true' }] } }), /OUTSIDE_FAILURE/);
  report.checks.push('actual_paid_noop_enters_existing_typed_feedback_then_corrects_within_original_bound_no_query_replay_other_failures_not_suppressed');
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
