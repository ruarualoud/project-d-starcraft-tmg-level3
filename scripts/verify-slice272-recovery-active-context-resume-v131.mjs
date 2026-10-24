import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { recoverRosterTeachQueriesV1 } from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
const draft = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
const state = draft.teachFramework.state;
const op = state.queryRecovery.operations.find(o => o.originalQueryId === 'query-r4-b4c5d6e7f8091a2b3c4d5e6f');
assert.equal(op.choices.length, 5);
assert.equal(op.maximumAttempts, 5);
assert.equal(op.result.unknownReasonCode, 'ROSTER_TEACH_RECOVERY_QUERY_PREDICATE_DROPPED');
assert.notEqual(op.currentFailure.queryRepair.baseStateHash, draft.teachFramework.context.queryContext.baseStateHash);
state.queryRecovery.selection = { queryIds: [op.originalQueryId], reexecuteSavedQuery: true };
const paidChoices = structuredClone(op.choices), paidResult = structuredClone(op.result);
let asks = 0;
const options = { state, plan: {}, context: draft.teachFramework.context, sourceHash: state.sourceHash,
  completedBeforeRun: true, checkpoint: async () => {}, retainEvidence: () => ({ testReference: true }),
  evidencePort: { descriptor: () => ({ descriptorHash: paidResult.evidencePortDescriptorHash }),
    query() { throw Error('Do not repeat paid or successful queries'); } },
  ask: async () => { asks++; return { disposition: 'defer', kind: 'spatial', toolRequestJson: '{}',
    publicReason: 'Gate supplies no placement decision.' }; },
};
await recoverRosterTeachQueriesV1(options);
assert.equal(asks, 1, 'The proven competing-context defect must not strand the paid operation');
assert.equal(op.maximumAttempts, 6);
assert.deepEqual(op.choices.slice(0, 5), paidChoices);
assert.deepEqual(op.result, paidResult);
assert.equal(op.activeContextProjectionRecovery.historyReset, false);
await recoverRosterTeachQueriesV1(options);
assert.equal(asks, 1, 'Repeated resume cannot keep granting attempts');
console.log(JSON.stringify({ status: 'PASS', oneRecordedContinuation: true, originalFiveChoicesPreserved: true,
  providerCalls: 0, roomActions: 0, queryExecutions: 0, actualModelCorrectionProven: false }));
