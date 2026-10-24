// Actual A v120: scenario/control succeeded, candidate-coherency query failed.
// A failed aggregate must not erase the independently scoped successful facts.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { projectRosterTeachPromptEvidenceV1, refreshRosterTeachPartialEvidenceSynthesisV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';

const saved = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
const before = JSON.stringify(saved);
assert.equal(saved.status, 'unknown');
assert.equal(saved.unknownReasonCode, 'CURRENT_ACTION_QUERY_DOMAIN_REFERENCE_REQUIRED');
assert.equal(saved.sourceReceipt.resultStatus, 'ok');
const control = saved.followUpReceipts.find(row => row.receipt?.queryKind === 'mission_marker_control');
assert.equal(control.receipt.resultStatus, 'ok');
const failure = saved.followUpReceipts.find(row => row.status === 'unknown');
assert.equal(failure.index, 0);
const nodes = projectRosterTeachPromptEvidenceV1([{ kind: 'actual_tool_results', evidence: [saved] }]);
const projected = nodes[0].evidence[0];
assert.equal(projected.status, 'unknown', 'partial evidence is not overall query success');
assert.equal(projected.unknownReasonCode, saved.unknownReasonCode);
assert.equal(projected.sourceReceipt?.receiptHash, saved.sourceReceipt.receiptHash,
  'the successfully constructed scenario must reach the synthesis consumer');
assert.deepEqual(projected.sourceReceipt.hypotheticalPlacementAssessment,
  saved.sourceReceipt.hypotheticalPlacementAssessment);
const deliveredControl = projected.followUpReceipts?.find(row => row.index === control.index);
assert(deliveredControl, 'the successful native control receipt must reach the synthesis consumer');
assert.deepEqual(deliveredControl, control, 'preserve exact native facts and conditional-scene boundaries');
assert.equal(deliveredControl.receipt.sceneScope.placementsLegalityProven, false);
assert.deepEqual(projected.failedFollowUps.map(row => row.index), [failure.index]);
assert.equal(projected.queryRepair.reasonCode, saved.unknownReasonCode);
assert.equal(projected.originalQueryNotAnswered, true);
assert.equal(JSON.stringify(saved), before, 'never alter the saved paid execution evidence');
const oldAnswer = { answers: [{ questionId: saved.questionId, disposition: 'unresolved' }] };
const state = { synthesis: structuredClone(oldAnswer), synthesisRaw: structuredClone(oldAnswer),
  queryRecovery: { operations: [{ result: saved, choices: [{}, {}, {}], maximumAttempts: 3, completed: true }] } };
assert.equal(refreshRosterTeachPartialEvidenceSynthesisV1(state), true);
assert.equal(state.synthesis, undefined);
assert.deepEqual(state.synthesisHistory[0].synthesis, oldAnswer);
assert.deepEqual(state.synthesisHistory[0].affectedReceiptHashes, [saved.receiptHash]);
assert.equal(state.queryRecovery.operations[0].choices.length, 3);
assert.equal(state.queryRecovery.operations[0].maximumAttempts, 3);
state.synthesis = { answers: [{ questionId: saved.questionId, disposition: 'unresolved', partialFactsVisible: true }] };
const newAnswer = JSON.stringify(state.synthesis);
assert.equal(refreshRosterTeachPartialEvidenceSynthesisV1(state), false);
assert.equal(JSON.stringify(state.synthesis), newAnswer, 'resume must not buy the refreshed synthesis again');
console.log(JSON.stringify({ status: 'PASS', actualPartialQueryEvidence: true,
  aggregateStillUnknown: true, nativeControlAndGeometryDelivered: true,
  originalFailureRetained: true, providerCalls: 0, roomActions: 0,
  queryReexecutions: 0, migrationRetainsPaidHistoryAndAttempts: true, routeOrArrivalProven: false }));
