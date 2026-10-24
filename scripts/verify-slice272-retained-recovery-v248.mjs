// Concrete B r29: a zero-send invalid retained answer must not become an
// ambiguous in-flight Provider request. Unknown network dispatch stays blocked.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createIterativeRosterPlanSessionV1 } from '../packages/roster-strategist/iterative-roster-plan-session-v1.mjs';
let saved, failure = 'ITERATIVE_ROSTER_RECONCILIATION_LIMIT_REACHED', sends = 0;
const port = createIterativeRosterPlanSessionV1({
  store: { load: async () => structuredClone(saved), save: async (_id, value) => { saved = structuredClone(value); } },
  model: { decide: async () => { sends++; throw Error('unexpected dispatch'); },
    reconcile: async () => { throw Object.assign(Error(failure), { code: failure }); } },
  builder: { evaluate: async () => {} }, tools: { query: async () => {} }, review: { final: async () => {} },
});
const seed = await port.start({ sessionId: 'recovery-fixture-248', mineralBudget: 2000,
  frozenContext: { mapHash: 'map-frozen-248', taskHash: 'task-frozen-248', sourceHash: 'source-frozen-248' } });
seed.status = 'requires_reconciliation'; seed.revision = 29; seed.modelDecisionReceiptCount = 28;
seed.iterations.push({ requestKey: 'retained-paid-request', decisionKind: 'repair_needed',
  modelContextVersion: 10, receiptHash: 'original-paid-receipt' });
const checks = [], failures = [];
for (const [code, pending] of [['ITERATIVE_ROSTER_RECONCILIATION_LIMIT_REACHED', false], ['PROVIDER_REPLY_UNKNOWN', true]]) {
  if (process.argv[3] === '--known-only' && pending) continue;
  failure = code; saved = structuredClone(seed);
  try {
    await assert.rejects(port.resume(seed.sessionId, { preferRetainedRepair: true }), { code });
    assert.equal(Boolean(saved.pendingDecision), pending);
    assert.equal(saved.modelDecisionReceiptCount, 28); assert.deepEqual(saved.iterations, seed.iterations);
    if (!pending) assert.equal(saved.retainedRevalidation.paidProviderCall, false);
    checks.push(code);
  } catch(e) { failures.push({ code, message: e.message }); }
}
const result = { status: failures.length ? 'fail' : 'pass', checks, failures, newDispatches: sends };
await fs.writeFile(process.argv[2] + `/retained-recovery-v248-${result.status}.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result)); process.exitCode = failures.length ? 1 : 0;
