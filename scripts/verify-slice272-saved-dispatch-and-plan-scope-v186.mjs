import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as guide from '../packages/roster-strategist/roster-teach-capability-guide-v1.mjs';
import { normalizeRosterTeachSavedRecoveryRequestV1, recoverRosterTeachQueriesV1 } from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
const [base, output] = process.argv.slice(2);
const report = { checks: [], providerCalls: 0, sourceDraftWrites: 0 };
const check = async (name, run) => { try { await run(); report.checks.push({ name, ok: true }); }
  catch (error) { report.checks.push({ name, ok: false, failure: error.message }); } };
const a = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json'));
const b = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json'));
const op = b.teachFramework.state.investigation.operations.find(x => x.queryId === 'q-timing-synergy-enabling-order-control-shape');
await check('saved wrapper preserves the corrected native dispatch', () => {
  const normalized = normalizeRosterTeachSavedRecoveryRequestV1(op.request);
  assert.equal(normalized.request.kind, 'spatial');
  assert.deepEqual(normalized.request.toolRequest, op.request.toolRequest);
});
await check('fixed roster procurement question is not Plan acceptance scope', () => {
  assert(a.teachFramework.state.agenda.questions.some(q => q.questionId.startsWith('Q3-') && q.question.includes('budget')));
  assert.equal(typeof guide.projectRosterTeachDecisionScopeV1, 'function');
  const fixed = guide.projectRosterTeachDecisionScopeV1(a.teachFramework.context);
  const editable = guide.projectRosterTeachDecisionScopeV1(b.teachFramework.context);
  assert.equal(fixed.requireProcurementComparison, false);
  assert.equal(editable.requireProcurementComparison, true);
  assert.deepEqual(fixed.requiredPlanEvidence, editable.requiredPlanEvidence);
  assert.equal(fixed.autoResolveUnknown, false);
  assert.equal(fixed.rosterChangesAllowed, false);
  assert.equal(editable.rosterChangesAllowed, true);
});
await check('old falsely advisory inspection enters normal focused recovery', async () => {
  const old = b.teachFramework.state.investigation.evidence.find(e => e.challengeId === op.queryId);
  const state = { agenda: { questions: b.teachFramework.state.agenda.questions }, evidence: [],
    investigation: { operations: [structuredClone(op)], evidence: [structuredClone(old)] },
    queryRecovery: { operations: [], selection: { queryIds: [op.queryId], reexecuteSavedQuery: true } } };
  let executed = 0, correctionAsked = 0;
  const evidencePort = { describeQueryContext: () => ({}), descriptor: () => ({ descriptorHash: 'test' }),
    query: async ({ request }) => { executed++; assert.deepEqual(request.toolRequest, op.request.toolRequest);
      return { status: 'unknown', receiptHash: 'native-invalid-reference', unknownReasonCode: 'MARKER_CONTROL_QUERY_REFERENCE_INVALID',
        queryRepair: { correctable: true, failureTargets: [], capabilities: {}, scenarioContinuation: {} } }; } };
  await recoverRosterTeachQueriesV1({ state, plan: {}, context: {}, evidencePort, sourceHash: 'test', completedBeforeRun: true,
    checkpoint: async () => {}, retainEvidence: () => ({}), readRetainedEvidence: () => ({}),
    ask: async () => { correctionAsked++; return { disposition: 'defer', publicReason: 'Preserve unresolved Native argument error.' }; } });
  assert.equal(executed, 1);
  assert.equal(correctionAsked, 1);
  assert.equal(state.queryRecovery.operations[0].originalRequest.kind, 'inspect');
  assert.equal(state.queryRecovery.operations[0].originalResult.receiptHash, old.receiptHash);
  assert.equal(state.queryRecovery.operations[0].currentFailure.unknownReasonCode, 'MARKER_CONTROL_QUERY_REFERENCE_INVALID');
});
report.ok = report.checks.every(c => c.ok);
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report)); if (!report.ok) process.exitCode = 1;
