import assert from 'node:assert/strict';
import { createAccountedModel } from '../packages/skill-production/model.mjs';
const observed = { system: '', messages: [{ role: 'user', content: 'x'.repeat(370000) }], tools: [] };
let reservations = 0, completions = 0;
const store = {
  reserve(id, request, forecast, tokens) { reservations++; assert(forecast > 0); assert(tokens > 370000); return { cached: false }; },
  settle() {}, summary() { return {}; },
};
const complete = async () => { completions++; return {
  output: { channels: { skill: { action: 'finish', content: { fixture: true } } } },
  usageReceipt: { requestedModel: 'deepseek-v4-flash', reportedModel: 'deepseek-v4-flash',
    receiptHash: 'injected-capacity-test-not-live', usage: { inputUnits: 1, outputUnits: 1, totalUnits: 2 } },
}; };
await assert.rejects(createAccountedModel({ store, complete })({ stageId: 'default', call: 0, observed }), { code: 'PROMPT_SIZE_LIMIT' });
assert.equal(reservations, 0); assert.equal(completions, 0);
const bounded = createAccountedModel({ store, complete, maxInputBytes: 786432 });
assert.equal((await bounded({ stageId: 'full', call: 0, observed })).command.content.fixture, true);
assert.equal(completions, 1);
await assert.rejects(bounded({ stageId: 'too-large', call: 0,
  observed: { ...observed, messages: [{ role: 'user', content: 'x'.repeat(800000) }] } }), { code: 'PROMPT_SIZE_LIMIT' });
assert.equal(completions, 1);
assert.throws(() => createAccountedModel({ store, complete, maxInputBytes: Infinity }));
assert.throws(() => createAccountedModel({ store, complete, maxInputBytes: 2000001 }));
assert.throws(() => createAccountedModel({ store, complete, maxInputBytes: -1 }));
console.log(JSON.stringify({ passed: true, checkGroups: 5, actualProviderCalls: 0, simulatedCompletions: completions }));
