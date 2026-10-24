// The paid Native error already contains repairContext, but the old Teach
// wrapper does not. Re-project that evidence without executing its queries.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as evidence from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import { recoverRosterTeachQueriesV1 } from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
const base = process.argv[2];
const saved = JSON.parse(await fs.readFile(base + '/common-v133-native-query-repair-fixture.private.json', 'utf8'));
const old = saved.receipt;
const project = () => evidence.reprojectRosterTeachNativeQueryRepairV1?.({
  request: saved.request, receipt: old, queryContext: saved.context }) || old;
const projected = project();
assert.equal(projected.queryRepair?.correctable, true, 'Retained Native repair context must reach Teach without repeating the query');
assert.equal(projected.nativeRepairProjection.originalReceiptHash, old.receiptHash);
assert.equal(projected.nativeRepairProjection.nativeExecutions, 0);
assert.deepEqual(projected.sourceReceipt, old.sourceReceipt);
assert.deepEqual(projected.followUpReceipts, old.followUpReceipts);
assert.deepEqual(evidence.reprojectRosterTeachNativeQueryRepairV1({ request: saved.request,
  receipt: projected, queryContext: saved.context }), projected);
assert.throws(() => evidence.reprojectRosterTeachNativeQueryRepairV1({ request: saved.request,
  receipt: old, queryContext: { ...saved.context, baseStateHash: 'e'.repeat(64) } }), /RETAINED_NATIVE_QUERY_CONTEXT_CHANGED/);

const draft = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json', 'utf8'));
const state = draft.teachFramework.state;
const op = state.queryRecovery.operations.find(o => o.originalQueryId === saved.queryId);
assert.equal(op.choices.length, 6);
state.queryRecovery.selection = { queryIds: [op.originalQueryId], reexecuteSavedQuery: true };
const choices = structuredClone(op.choices);
let asks = 0;
const options = { state, plan: {}, context: draft.teachFramework.context, sourceHash: state.sourceHash,
  completedBeforeRun: true, checkpoint: async () => {}, retainEvidence: () => ({ testReference: true }),
  evidencePort: { descriptor: () => ({ descriptorHash: old.evidencePortDescriptorHash }),
    reprojectSavedNativeQueryFailure: ({ request, receipt }) => evidence.reprojectRosterTeachNativeQueryRepairV1({
      request, receipt, queryContext: saved.context }),
    query() { throw Error('No query re-execution to recover feedback'); } },
  ask: async (_kind, nodes) => { asks++;
    assert.deepEqual(nodes[0].result.queryRepair.failureTargets[0].nativeQueryRepair.repairContext,
      old.followUpReceipts[0].receipt.queryReceipt.repairContext);
    return { disposition: 'defer', kind: 'spatial', toolRequestJson: '{}', publicReason: 'Gate supplies no new spatial choice.' }; },
};
await recoverRosterTeachQueriesV1(options);
assert.equal(asks, 1);
assert.equal(op.maximumAttempts, 7);
assert.deepEqual(op.choices.slice(0, 6), choices);
assert(op.previousResults.some(r => r.receiptHash === old.receiptHash));
assert.equal(op.nativeRepairFeedbackRecovery.historyReset, false);
await recoverRosterTeachQueriesV1(options);
assert.equal(asks, 1, 'Re-projecting the same error cannot grant another attempt');
console.log(JSON.stringify({ status: 'PASS', retainedNativeFeedbackConsumed: true,
  originalAndSuccessfulReceiptsPreserved: true, changedContextRejected: true,
  originalSixChoicesPreserved: true, oneConcreteFixContinuation: true,
  providerCalls: 0, roomActions: 0, nativeExecutions: 0, actualModelCorrectionProven: false }));
