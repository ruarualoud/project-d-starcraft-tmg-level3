import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import * as recovery from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
const read = async file => JSON.parse(gunzipSync(await fs.readFile(file)));
const request = await read(process.argv[2] + '/call-113.product-request.json.gz');
const reply = await read(process.argv[2] + '/call-113.reply.json.gz');
const failed = request.promptNodes.find(n => n.kind === 'failed_query_to_correct');
assert.deepEqual(reply.output.edits, [{ op: 'replace', path: '/toolRequest/branchIdRef', valueJson: '""' }]);
const original = failed.request;
const corrected = { ...original, toolRequest: { ...original.toolRequest, branchIdRef: '' } };
const assessment = recovery.assessRosterTeachQueryCorrectionScopeV1(original, corrected);
assert.equal(assessment.sameNamedScope, false,
  'Actual113 can silently turn a placed-scene query into an empty-source query');
assert.equal(assessment.sceneScopeDropped, true);
assert.equal(recovery.assessRosterTeachQueryCorrectionScopeV1(original, original).sameNamedScope, true);
assert.equal(recovery.assessRosterTeachQueryCorrectionScopeV1(corrected, corrected).sameNamedScope, true,
  'An originally source-scoped query remains legal');
const operation = { originalQueryId: 'actual113', queryId: 'recovery113', questionId: 'control',
  request: corrected, originalRequest: original, currentFailure: structuredClone(failed.result),
  originalResult: structuredClone(failed.result), completed: true, scopeAuditVersion: 1,
  choice: { disposition: 'retry', kind: 'spatial' }, choices: [{ disposition: 'retry', kind: 'spatial' }],
  maximumAttempts: 3, result: { status: 'advisory', receiptHash: 'saved-empty-source-result' } };
const originalResult = structuredClone(operation.result);
assert.equal(recovery.reconcileRosterTeachRecoverySceneScopeV1(operation, original), true);
assert.equal(operation.completed, false);
assert.equal(operation.result.unknownReasonCode, 'ROSTER_TEACH_RECOVERY_QUERY_SCOPE_CHANGED');
assert.equal(operation.currentFailure.queryRepair.correctable, true);
assert.equal(operation.result.queryNotExecuted, false, 'Legacy execution must not be rewritten as never executed');
assert.deepEqual(operation.previousResults, [originalResult]);
assert.equal(operation.maximumAttempts, 3);
assert(operation.scopeAuditVersion >= 2);
assert.equal(recovery.reconcileRosterTeachRecoverySceneScopeV1(operation, original), false);
assert.equal(operation.previousResults.length, 1);
console.log(JSON.stringify({ pass: true, actualPaidReplyGuarded: true,
  savedResultReclassifiedWithoutReexecution: true, originalHistoryRetained: true,
  correctionResumesWithoutCounterReset: true, providerCalls: 0, nativeExecutions: 0 }));
