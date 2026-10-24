import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { assessRosterTeachQueryRepairPredicatesV1 as assess, recoverRosterTeachQueriesV1 as recover } from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
const [base, output] = process.argv.slice(2);
const report = { checks: [], providerCalls: 0, nativeActions: 0, sourceDraftWrites: 0 };
try {
  const d = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json', 'utf8'));
  const s = d.teachFramework.state;
  const ops = s.queryRecovery.operations.filter(o => o.adapterDeltaRecovery);
  assert.equal(ops.length, 2);
  for (const op of ops) {
    assert.equal(op.status, 'query_predicate_dropped');
    assert(assess(op.currentFailure, op.request).sameFailedPredicates, 'The paid mission_marker_control query is present, not dropped');
    assert.equal(assess(op.currentFailure, { kind: 'scenario', toolRequest: { ...op.request.toolRequest, followUps: [] } }).sameFailedPredicates, false);
  }
  report.checks.push('both_real_paid_native_queries_recognized_actual_drop_still_rejected');
  let calls = 0;
  const state = structuredClone(s);
  const old = state.queryRecovery.operations.filter(o => o.adapterDeltaRecovery).map(o => ({ id: o.originalQueryId, choices: structuredClone(o.choices), max: o.maximumAttempts }));
  state.queryRecovery.selection = { queryIds: old.map(o => o.id), reexecuteSavedQuery: true, completed: false };
  const options = { state, plan: {}, context: d.teachFramework.context, sourceHash: s.sourceHash,
    completedBeforeRun: true, checkpoint: async () => {}, ask: async () => { throw Error('PAID_CORRECTION_MUST_NOT_BE_REGENERATED'); },
    evidencePort: { descriptor: () => ({ descriptorHash: 'f'.repeat(64) }), query: async input => {
      calls++; assert(ops.some(o => JSON.stringify(o.request) === JSON.stringify(input.request)));
      return { status: 'advisory', receiptHash: String(calls).repeat(64), evidencePortDescriptorHash: 'f'.repeat(64),
        followUpReceipts: [{ status: 'advisory' }] };
    } } };
  await recover(options);
  assert.equal(calls, 2);
  for (const item of old) {
    const op = state.queryRecovery.operations.find(o => o.originalQueryId === item.id);
    assert.equal(op.status, 'advisory'); assert.deepEqual(op.choices, item.choices); assert.equal(op.maximumAttempts, item.max);
    assert.equal(op.executionRefresh.samePaidRequest, true);
  }
  await recover(options); assert.equal(calls, 2);
  report.checks.push('saved_queries_execute_once_under_changed_dispatch_contract_no_new_choice_or_budget');
  report.ok = true;
} catch (e) { report.ok = false; report.failure = e.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
