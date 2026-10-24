import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { recoverRosterTeachQueriesV1 } from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
const [base, output] = process.argv.slice(2);
const d = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json'));
const original = d.teachFramework.state;
const report = { providerCalls: 0, nativeQueryExecutions: 0, sourceDraftWrites: 0 };
try {
  const focus = original.investigation.dependencyContinuation.questionIds;
  const failures = original.investigation.operations.map(op => ({ op,
    result: original.investigation.evidence.find(e => e.challengeId === op.queryId) }))
    .filter(row => row.result?.queryRepair?.correctable && row.op.request.kind !== 'inspect');
  const related = failures.find(row => focus.includes(row.op.questionId));
  const unrelated = failures.find(row => !focus.includes(row.op.questionId));
  assert(related && unrelated, 'Use retained A failures both inside and outside the current Q2 assignment');
  const rows = [unrelated, related];
  const state = { agenda: { questions: [] }, evidence: [], investigation: {
    ...structuredClone(original.investigation),
    operations: rows.map(r => structuredClone(r.op)),
    evidence: rows.map(r => structuredClone(r.result)),
  }, queryRecovery: { operations: [], selection: { completed: true, queryIds: [] } } };
  const seen = [];
  await recoverRosterTeachQueriesV1({ state, plan: {}, context: {},
    evidencePort: { describeQueryContext: () => ({}),
      descriptor: () => ({ descriptorHash: 'reproduction' }),
      query: async () => { throw Error('No Native re-execution authorized by this scope check'); } },
    sourceHash: 'reproduction', completedBeforeRun: true, investigationProducedNewEvidence: true,
    checkpoint: async () => {}, retainEvidence: () => ({}), readRetainedEvidence: () => ({}),
    ask: async (_kind, nodes) => {
      seen.push(nodes.find(n => n.kind === 'failed_query_to_correct').originalQueryId);
      return { disposition: 'defer', publicReason: 'Preserve the unresolved factual question.' };
    } });
  assert.deepEqual(seen, [related.op.queryId], 'A focused Q2 continuation must not reopen unrelated old questions');
  assert.equal(state.queryRecovery.operations.length, 1);
  assert.equal(state.queryRecovery.operations[0].questionId, related.op.questionId);
  assert.equal(state.queryRecovery.operations[0].status, 'model_deferred');
  assert.deepEqual(state.investigation.evidence, rows.map(r => r.result));
  report.focusQuestionIds = focus;
  report.untouchedHistoricalQuestionId = unrelated.op.questionId;
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 }); console.log(JSON.stringify(report));
