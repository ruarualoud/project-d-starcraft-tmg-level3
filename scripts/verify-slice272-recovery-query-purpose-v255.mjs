// Concrete fresh-B failure: the corrected marker query was read three times as
// a prerequisite, then closed unresolved. Exercise the actual recovery seam
// with its retained public reply/Native receipt; no Provider or Native rerun.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { recoverRosterTeachQueriesV1 } from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
const base = process.argv[2];
const store = JSON.parse(await fs.readFile(base + '/B/fresh-generation-v249/workspace/iterative-draft/sessions/000b494bcc4efb11a17dcc7cb02fb3b47806481b87b93dd4fb10c28fe5a92f57.json', 'utf8'));
const snapshot = store.value.draftTeachSnapshots.find(s => s.state.queryRecovery?.operations.some(o =>
  o.originalQueryId === 'q-victory-route-control' && o.status === 'context_read_budget_exhausted_query_unresolved'));
assert(snapshot, 'Retain the concrete stopped B recovery');
const original = snapshot.state.queryRecovery.operations.find(o => o.originalQueryId === 'q-victory-route-control');
const question = snapshot.state.agenda.questions.find(q => q.questionId === original.questionId);
const inspection = original.inspections[0];
assert.notEqual(inspection.result.queryReceipt.status, 'unknown');
const corrected = inspection.request.toolRequest;
const direct = { disposition: 'retry', kind: corrected.kind,
  toolRequestJson: JSON.stringify(corrected.toolRequest), publicReason: 'Submit the same corrected query; keep its conditional scope.' };
let nativeCalls = 0, totalAsks = 0;
for (const legacyCompleted of [false, true]) {
  const op = structuredClone(original);
  if (!legacyCompleted) { op.completed = false; op.choices = op.choices.slice(0, 3); }
  const history = structuredClone(op.choices);
  const state = { agenda: { questions: [question] }, evidence: [original.originalResult],
    investigation: { operations: [], evidence: [] }, queryRecovery: { version: 1, operations: [op] } };
  let asks = 0;
  const options = { state, plan: snapshot.plan, context: snapshot.context,
    sourceHash: snapshot.state.sourceHash, completedBeforeRun: false, checkpoint: async () => {},
    evidencePort: { describeQueryContext: () => ({ sourceStateHash: original.currentFailure.queryRepair.sourceStateHash,
      baseStateHash: original.currentFailure.queryRepair.baseStateHash }), query: async () => {
        nativeCalls++; throw Error('Already successful identical Native query must be reused');
      } },
    ask: async (_kind, nodes, _instruction, semantic) => {
      asks++; totalAsks++;
      // The real paid choice used the wrong purpose, not wrong query arguments.
      assert.throws(() => semantic(original.choices[0]), /ROSTER_TEACH_RECOVERY_CONTEXT_ALREADY_READ/,
        'Repeated auxiliary reads must receive actionable feedback before spending another read');
      const protocol = nodes.find(n => n.kind === 'query_recovery_action_protocol');
      assert.equal(protocol.directCorrection.kind, 'spatial');
      semantic(direct); return direct;
    } };
  const results = await recoverRosterTeachQueriesV1(options);
  assert.equal(asks, 1, 'An exhausted legacy read loop gets one correction, not a new Teach cycle');
  assert.equal(results.length, 1);
  assert.equal(results[0].sourceReceiptHash, inspection.result.queryReceipt.sourceReceiptHash);
  assert.equal(results[0].status, inspection.result.queryReceipt.status);
  assert.equal(results[0].queryRecoveryOf, original.originalQueryId);
  assert.deepEqual(op.choices.slice(0, history.length), history);
  assert.deepEqual(op.originalResult, original.originalResult);
  assert.equal(op.result.evidenceReuse.originalReceiptHash, inspection.result.queryReceipt.receiptHash);
  assert.equal(op.result.evidenceReuse.strategyConclusionPromoted, false);
  // Reusing the receipt is NOT proving intended future positions or arrival.
  assert.deepEqual(op.result.evidenceReadiness, inspection.result.queryReceipt.evidenceReadiness);
  if (legacyCompleted) assert.equal(op.queryPurposeRecovery.historyReset, false);
}
console.log(JSON.stringify({ status: 'PASS', checks: 2, actualFailure: original.status,
  repeatedReadFeedback: true, explicitModelSubmissionRequired: true,
  exactStoredReceiptReused: true, conditionalScopePreserved: true,
  providerCalls: 0, nativeCalls, totalAsks, gamesStarted: 0 }));
