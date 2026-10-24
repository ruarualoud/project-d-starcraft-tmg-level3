// A batch is a transport grouping, never one indivisible tool outcome.
// Keep complete native receipts per slot; resume only unfinished read-only work.
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';

const clone = value => structuredClone(value);
const schema = 'starcraft_tmg_roster_query_batch_checkpoint_v1';
function fail(code) { throw Object.assign(Error(code), { code }); }
function validReceipt(value) {
  return value && typeof value === 'object' && typeof value.receiptHash === 'string'
    && value.receiptHash.length >= 8 && value.receiptHash.length <= 200;
}

export async function executeRosterQueryBatchV1({ requestKey, candidateHash,
  frozenContext, queries, load, save, execute }) {
  const binding = { requestKey, candidateHash, frozenContextHash: hash(frozenContext) };
  let batch = await load(requestKey);
  if (batch) {
    if (batch.schema !== schema || hash(batch.binding) !== hash(binding)
      || hash(batch.operations.map(row => row.query)) !== hash(queries)) {
      fail('ITERATIVE_ROSTER_QUERY_BATCH_CONTEXT_MISMATCH');
    }
    if (batch.operations.some((row, index) => row.index !== index
      || !['pending', 'running', 'completed', 'failed'].includes(row.status)
      || row.status === 'completed' && !validReceipt(row.receipt))) {
      fail('ITERATIVE_ROSTER_QUERY_BATCH_RECORD_INVALID');
    }
  } else {
    batch = { schema, binding, operations: queries.map((query, index) => ({
      index, query: clone(query), status: 'pending', attempts: [], receipt: null,
    })) };
  }
  let writes = Promise.resolve();
  const checkpoint = () => {
    // Capture before yielding; concurrent completions must not alter an older write.
    const snapshot = clone(batch);
    const next = writes.then(() => save(requestKey, snapshot));
    writes = next;
    return next;
  };
  await checkpoint();
  const settled = await Promise.allSettled(batch.operations.map(async operation => {
    if (operation.status === 'completed') return clone(operation.receipt);
    const attempt = { number: operation.attempts.length + 1, status: 'running' };
    operation.attempts.push(attempt);
    operation.status = 'running';
    let receipt;
    try {
      receipt = await execute(clone(operation.query));
      if (!validReceipt(receipt)) fail('ITERATIVE_ROSTER_TOOL_RECEIPT_INVALID');
    } catch (error) {
      operation.status = 'failed';
      attempt.status = 'failed';
      // Diagnostics are not a tool answer, and do not imply an empty/false result.
      attempt.failure = { code: String(error.code || error.message).split(':')[0],
        ...(error.capabilityReceipt ? { capabilityReceipt: clone(error.capabilityReceipt) } : {}) };
      await checkpoint();
      throw error;
    }
    operation.status = 'completed';
    operation.receipt = clone(receipt);
    attempt.status = 'completed';
    await checkpoint();
    return clone(receipt);
  }));
  // Wait for every independent sibling to settle/save before releasing the Run.
  const failed = settled.find(row => row.status === 'rejected');
  if (failed) {
    const error = failed.reason;
    error.queryBatchFailure = { schema, requestKey,
      operations: batch.operations.map(row => ({ index: row.index, status: row.status,
        failure: row.status === 'failed' ? row.attempts.at(-1).failure : null })),
      completedResultsRetained: batch.operations.filter(row => row.status === 'completed').length };
    throw error;
  }
  return settled.map(row => row.value);
}
