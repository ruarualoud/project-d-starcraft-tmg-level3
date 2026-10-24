// Real recovery input advertises branch inspection and retained geometry, but
// its former output contract could not request either read. No game simulation.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { rosterTeachFrameworkContractV1, readRosterTeachRetainedEvidenceV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { recoverRosterTeachQueriesV1 } from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';

const saved = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
assert.equal(saved.unknownReasonCode, 'CURRENT_ACTION_QUERY_DOMAIN_REFERENCE_REQUIRED');
const kinds = rosterTeachFrameworkContractV1('teach_framework_query_recovery').providerSchema.properties.kind.enum;
assert(kinds.includes('inspect'), 'recovery must be able to inspect the branch it is instructed to inspect');
assert(kinds.includes('retained_evidence'), 'recovery must be able to read archived exact geometry');
const branchIdRef = saved.queryRepair.scenarioContinuation.branchIdRef;
const request = { kind: 'spatial', toolRequest: { queryKind: 'legal_full_path_movement',
  subjectUnitIds: ['player1-marine-1'], targetIds: ['mission-marker-1'] } };
const state = { framework: {}, agenda: { questions: [{ questionId: 'actual-route-question', evidenceRequest: request }] },
  evidence: [{ ...saved, challengeId: 'actual-route-question' }], investigation: { operations: [], evidence: [] } };
let asks = 0, reads = 0, queries = 0, paused = false;
const archive = new Map([[saved.receiptHash, saved]]);
const options = { state, plan: {}, context: {}, sourceHash: 'c'.repeat(64), completedBeforeRun: false,
  evidencePort: {
    describeQueryContext(ref) { reads++; assert.equal(ref, branchIdRef); return saved.queryRepair; },
    query() { queries++; throw Error('Inspection must not execute or reconstruct a query'); },
  },
  readRetainedEvidence: args => readRosterTeachRetainedEvidenceV1([], args, archive),
  checkpoint: async () => {
    if (!paused && state.queryRecovery?.operations[0]?.inspections?.length === 1) {
      paused = true; throw Error('SCRIPTED_STOP_AFTER_DURABLE_INSPECTION');
    }
  },
  ask: async (_kind, nodes) => {
    const index = asks++;
    if (index === 0) return { disposition: 'retry', kind: 'inspect', toolRequestJson: JSON.stringify({ branchIdRef }), publicReason: 'Read the native domain before choosing a candidate.' };
    const inspections = nodes.find(n => n.kind === 'query_inspection_results')?.inspections;
    assert(inspections?.[0]?.result?.queryContext?.actionSpace?.parameterDomains.some(d => d.actionType === 'move'));
    if (index === 1) return { disposition: 'retry', kind: 'retained_evidence', toolRequestJson: JSON.stringify({ receiptHash: saved.receiptHash, path: 'sourceReceipt.hypotheticalPlacementAssessment' }), publicReason: 'Read the actual scoped placement assessment, not a route assertion.' };
    assert.equal(inspections[1].result.contextOnlyNotStrategyProof, true);
    assert.deepEqual(inspections[1].result.retrievedEvidence.value, saved.sourceReceipt.hypotheticalPlacementAssessment);
    return { disposition: 'defer', kind: 'spatial', toolRequestJson: '{}', publicReason: 'This scripted test supplies no movement choice; inspection is not route proof.' };
  },
};
await assert.rejects(recoverRosterTeachQueriesV1(options), /SCRIPTED_STOP_AFTER_DURABLE_INSPECTION/);
assert.equal(state.queryRecovery.operations[0].choices.length, 1);
assert.equal(state.queryRecovery.operations[0].pendingChoice, false);
await recoverRosterTeachQueriesV1(options);
const op = state.queryRecovery.operations[0];
assert.equal(asks, 3, 'reads retain the existing three-choice bound');
assert.equal(reads, 1, 'resume must reuse the durable branch inspection');
assert.equal(queries, 0);
assert.equal(op.choices.length, 3);
assert.equal(op.maximumAttempts, 3);
assert.equal(op.status, 'model_deferred');
assert.equal(op.currentFailure.receiptHash, saved.receiptHash, 'inspection cannot replace the original failure');
assert(op.inspections.every(row => row.result.contextOnlyNotStrategyProof));
console.log(JSON.stringify({ status: 'PASS', actualMissingReadContractFixed: true,
  branchAndRetainedEvidenceReachNextChoice: true, savedReadResumedWithoutRepeat: true,
  originalBound: 3, attemptsReset: false, providerCalls: 0, roomActions: 0,
  queryExecutions: 0, actualModelOrRouteCompletionProven: false }));
