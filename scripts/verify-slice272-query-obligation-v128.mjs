// Concrete paid failure: recovery deleted the failed coherency query, retained
// an already-successful control query, and was incorrectly marked advisory.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { recoverRosterTeachQueriesV1 } from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
import { qualifyRosterTeachFrameworkSynthesisV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';

const { operation: saved, answers } = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
assert.equal(saved.result.status, 'advisory');
assert.equal(saved.currentFailure.queryRepair.failureTargets[0].request.queryKind, 'coherency_after_candidate_placement');
assert.deepEqual(saved.request.toolRequest.followUps.map(q => q.queryKind), ['mission_marker_control']);
const makeState = op => ({ framework: {},
  agenda: { questions: [{ questionId: op.questionId, evidenceRequest: op.originalRequest }] },
  evidence: [], investigation: { operations: [{ queryId: op.originalQueryId,
    questionId: op.questionId, request: op.originalRequest }], evidence: [] },
  queryRecovery: { selection: { queryIds: [op.originalQueryId], reexecuteSavedQuery: true }, operations: [op] },
  synthesis: { answers: structuredClone(answers), frameworkFeedback: [] },
});
let queries = 0, asks = 0;
const run = state => recoverRosterTeachQueriesV1({ state, plan: {}, context: {}, sourceHash: 'c'.repeat(64),
  completedBeforeRun: true, checkpoint: async () => {},
  evidencePort: { descriptor: () => ({ descriptorHash: saved.result.evidencePortDescriptorHash }),
    query() { queries++; return structuredClone(saved.result); } },
  ask: async () => { asks++; return { disposition: 'defer', kind: 'spatial', toolRequestJson: '{}',
    publicReason: 'Gate does not supply a valid placement decision.' }; },
});
const pending = structuredClone(saved);
pending.completed = false; pending.pendingChoice = true;
pending.result = structuredClone(saved.currentFailure);
const pendingState = makeState(pending);
await run(pendingState);
assert.equal(queries, 0, 'Do not execute a replacement query that drops the failed native predicate');
assert.equal(asks, 0, 'The paid pending choice must be assessed without buying another reply');
assert.equal(pending.result.unknownReasonCode, 'ROSTER_TEACH_RECOVERY_QUERY_PREDICATE_DROPPED');
assert.equal(pending.result.originalQueryNotAnswered, true);
assert.deepEqual(pending.result.queryRepair.missingQueryPredicates.map(p => p.queryKind), ['coherency_after_candidate_placement']);
assert.equal(pending.result.queryRepair.failureTargets[0].request.queryKind, 'coherency_after_candidate_placement');

// A restart must also demote the previously paid false success locally, keep
// all evidence/attempts, and grant only the standing single concrete-fix retry.
const legacy = structuredClone(saved), legacyState = makeState(legacy);
await run(legacyState);
assert.equal(queries, 0);
assert.equal(asks, 1);
assert.equal(legacy.maximumAttempts, 5);
assert.deepEqual(legacy.choices.slice(0, 4), saved.choices);
assert(legacy.previousResults.some(r => r.receiptHash === saved.result.receiptHash));
assert.equal(legacy.result.unknownReasonCode, 'ROSTER_TEACH_RECOVERY_QUERY_PREDICATE_DROPPED');
assert.equal(legacy.predicateAcceptanceRecovery.historyReset, false);
assert.equal(legacyState.synthesis, undefined);
await run(legacyState);
assert.equal(asks, 1, 'The same migration cannot grant repeated attempts');
assert.equal(queries, 0);

// Other successful facts for this question cannot hide the dropped obligation.
const synthesis = { answers: [{ ...answers[0], disposition: 'supported' }], frameworkFeedback: [] };
const qualified = qualifyRosterTeachFrameworkSynthesisV1({ synthesis,
  evidence: [saved.result, legacy.result] });
assert.equal(qualified.answers[0].disposition, 'unresolved');
assert.equal(qualified.answers[0].hostEvidenceStatus, 'unknown');
assert.deepEqual(qualified.answers[0].unresolvedQueryIds, [saved.originalQueryId]);
console.log(JSON.stringify({ status: 'PASS', paidDroppedPredicateRejected: true,
  legacyPaidReceiptRetained: true, independentSuccessCannotClearObligation: true,
  attemptsReset: false, additionalChoices: 1, queryExecutions: queries,
  providerCalls: 0, roomActions: 0, actualModelOrRouteCompletionProven: false }));
