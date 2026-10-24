// Reproduce one failed sibling discarding a completed read-only tool result.
// Real session and atomic file store, injected tool fault; no Provider/Rules calls.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createIterativeRosterFileStoreV1 } from '../packages/roster-strategist/iterative-roster-file-store-v1.mjs';
import { createIterativeRosterPlanSessionV1 } from '../packages/roster-strategist/iterative-roster-plan-session-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { executeRosterQueryBatchV1 } from '../packages/roster-strategist/roster-query-batch-checkpoint-v1.mjs';

const directory = await fs.mkdtemp(path.join(process.argv[2], 'query-batch-v313-'));
const sessionId = 'query-batch-recovery-v313';
const queries = [{ kind: 'map_summary' }, { kind: 'candidate_menu' }];
const counts = { decide: 0, recover: 0, first: 0, second: 0 };
let failSecond = true;
const results = queries.map((query, index) => {
  const body = { status: 'advisory', query, exactOriginalResult: { value: index, unknown: null } };
  return { ...body, receiptHash: hash(body) };
});
const reply = { outcome: 'completed', receiptHash: hash('retained-paid-reply-v313'),
  decision: { kind: 'query', question: 'independent read-only tool batch', queries } };
function product() {
  const store = createIterativeRosterFileStoreV1({ directory });
  const session = createIterativeRosterPlanSessionV1({ store,
    model: { async decide() { counts.decide++; return reply; },
      async recover() { counts.recover++; return reply; } },
    builder: { async evaluate() { throw Error('UNEXPECTED_BUILDER'); } },
    review: { async final() { throw Error('UNEXPECTED_FINAL_REVIEW'); } },
    tools: { async query(query) {
      if (query.kind === 'map_summary') { counts.first++; return structuredClone(results[0]); }
      counts.second++;
      if (failSecond) {
        // Return the same source-owned failure category as the production tool port.
        const receipt = { status: 'error', unknownReason: 'INJECTED_EXECUTION_FAILURE',
          capabilityOutcome: { category: 'execution_failure', questionAnswered: false } };
        receipt.receiptHash = hash(receipt);
        throw Object.assign(Error('INJECTED_EXECUTION_FAILURE'), {
          code: 'INJECTED_EXECUTION_FAILURE', capabilityQuery: query, capabilityReceipt: receipt });
      }
      return structuredClone(results[1]);
    } },
  });
  return { store, session };
}
let { store, session } = product();
await session.start({ sessionId, mineralBudget: 2000,
  frozenContext: { mapHash: hash('map'), taskHash: hash('task'), sourceHash: hash('source') } });
await assert.rejects(session.resume(sessionId), { code: 'INJECTED_EXECUTION_FAILURE' });
const stopped = await store.load(sessionId);
assert.equal(stopped.status, 'requires_reconciliation');
assert.equal(stopped.revision, 0);
assert.equal(stopped.observations.length, 0, 'Partial results must not alter the retained model request context');
assert(stopped.pendingDecision);
assert.equal(counts.decide, 1);
const stoppedBatch = await store.loadQueryBatch(stopped.pendingDecision.requestKey);
assert.deepEqual(stoppedBatch.operations.map(row => row.status), ['completed', 'failed']);
assert.deepEqual(stoppedBatch.operations[0].receipt, results[0]);
failSecond = false;
({ store, session } = product()); // No in-memory cache survives recovery.
const recovered = await session.resume(sessionId);
assert.equal(counts.first, 1, 'A completed sibling result must survive a different query failing and must not execute again');
assert.equal(counts.second, 2);
assert.equal(counts.decide, 1, 'Recovery must reuse the original paid decision');
assert.equal(counts.recover, 1);
assert.equal(recovered.revision, 1);
assert.equal(recovered.pendingDecision, null);
assert.deepEqual(recovered.observations.map(row => row.receipt), results);
assert.deepEqual(recovered.iterations[0].toolReceiptHashes, results.map(row => row.receiptHash));
assert.equal(recovered.toolExecutionFailures.length, 1, 'The prior failure remains an execution diagnostic, not tool fact');
assert.equal(recovered.queryBatchFailure, null, 'Resolved batch failure must not remain the active task');
const completedBatch = await store.loadQueryBatch(stopped.pendingDecision.requestKey);
assert.deepEqual(completedBatch.operations.map(row => row.attempts.length), [1, 2]);
assert.equal(completedBatch.operations[1].attempts[0].failure.code, 'INJECTED_EXECUTION_FAILURE');
let forbiddenExecutions = 0;
await assert.rejects(executeRosterQueryBatchV1({
  requestKey: stopped.pendingDecision.requestKey, candidateHash: null,
  frozenContext: stopped.frozenContext, queries: [...queries].reverse(),
  load: store.loadQueryBatch, save: store.saveQueryBatch,
  execute() { forbiddenExecutions++; throw Error('MUST_NOT_RUN'); },
}), { code: 'ITERATIVE_ROSTER_QUERY_BATCH_CONTEXT_MISMATCH' });
assert.equal(forbiddenExecutions, 0);

// A malformed tool response is not a normal unknown answer. Its successful
// sibling still survives, and recovery stores the original unknown unchanged.
const requestKey = 'malformed-response-v313';
let malformed = true;
const calls = [0, 0];
const unknown = { status: 'unknown', queryRepair: { correctable: true,
  failureTargets: [{ requestPointer: '/argumentsJson', correctionInstruction: 'Use the source contract' }] } };
unknown.receiptHash = hash(unknown);
const run = () => executeRosterQueryBatchV1({ requestKey, candidateHash: null,
  frozenContext: stopped.frozenContext, queries, load: store.loadQueryBatch, save: store.saveQueryBatch,
  async execute(query) {
    const index = query.kind === 'map_summary' ? 0 : 1;
    calls[index]++;
    return index === 0 ? results[0] : malformed ? { status: 'ok' } : unknown;
  } });
await assert.rejects(run(), { code: 'ITERATIVE_ROSTER_TOOL_RECEIPT_INVALID' });
malformed = false;
assert.deepEqual(await run(), [results[0], unknown]);
assert.deepEqual(calls, [1, 2]);
console.log(JSON.stringify({ pass: true, scenario: 'one_sibling_failure_and_process_restart',
  counts, directory, malformedReceiptRecovery: true, mismatchedInputRejected: true,
  nativeUnknownNotPromoted: true, providerCalls: 0, nativeActions: 0, finalAdmission: false }));
