import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAccountedModel, MODEL_PROTOCOL, FINISH_ONLY_MODEL_PROTOCOL } from '../packages/skill-production/model.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { hash, seal, sha256 } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = await mkdtemp(path.join(root, 'build/ticket-18-production-v3/reader-protocol-test-'));
const stores = [], makeStore = name => {
  const s = openProductionStore(path.join(temp, name + '.sqlite'), { runId: 'fixture-' + name, recipeHash: hash(name) }); stores.push(s); return s;
};
const observed = { system: 'injected reader', tools: [], messages: [{ role: 'user', content: 'Injected answer fixture.' }] };
const response = command => ({ output: { channels: { skill: command } }, usageReceipt: {
  requestedModel: 'deepseek-v4-flash', reportedModel: 'deepseek-v4-flash', receiptHash: hash(command),
  usage: { inputUnits: 10, outputUnits: 10, totalUnits: 20 } } });
let calls = 0;
const finishStore = makeStore('finish');
const reader = createAccountedModel({ store: finishStore, commandPolicy: 'finish_only', complete: async request => {
  calls++; assert.equal(request.promptNodes[0].text, FINISH_ONLY_MODEL_PROTOCOL);
  assert(!request.promptNodes[0].text.includes('"action":"read"'));
  assert(request.userMessage.includes('action=finish'));
  return response({ action: 'finish', content: { answer: false } });
} });
const result = await reader({ stageId: 'reader', call: 1, observed });
assert.equal(result.command.content.answer, false);
await reader({ stageId: 'reader', call: 1, observed }); assert.equal(calls, 1);
await assert.rejects(() => reader({ stageId: 'tools', call: 1, observed: { ...observed, tools: [{ name: 'read' }] } }), { code: 'MODEL_FINISH_ONLY_TOOLS_DECLARED' });
assert.equal(calls, 1);
const forbiddenStore = makeStore('forbidden'); let forbiddenCalls = 0;
const forbidden = createAccountedModel({ store: forbiddenStore, commandPolicy: 'finish_only', complete: async () => {
  forbiddenCalls++; return response({ action: 'read', args: { refs: ['faq-v1:07'] } });
} });
await assert.rejects(() => forbidden({ stageId: 'bad', call: 1, observed }), { code: 'MODEL_FINISH_ONLY_ACTION_FORBIDDEN' });
assert.equal(forbiddenCalls, 1); assert.equal(forbiddenStore.summary().knownTokens, 20);
await assert.rejects(() => forbidden({ stageId: 'bad', call: 1, observed }), { code: 'MODEL_FINISH_ONLY_ACTION_FORBIDDEN' });
assert.equal(forbiddenCalls, 1, 'persist invalid command, do not repeat paid call');
const production = createAccountedModel({ store: makeStore('production'), complete: async request => {
  assert.equal(request.promptNodes[0].text, MODEL_PROTOCOL);
  assert.equal(request.userMessage, 'Continue the actual agent conversation. Return the next JSON command.');
  return response({ action: 'read', args: { refs: ['faq-v1:07'] } });
} });
assert.equal((await production({ stageId: 'old', call: 1, observed })).command.action, 'read');
assert.throws(() => createAccountedModel({ store: finishStore, commandPolicy: 'unknown' }), { code: 'MODEL_COMMAND_POLICY_INVALID' });
for (const s of stores) s.close();
const files = ['packages/skill-production/model.mjs', 'scripts/verify-ticket-18-reader-command-policy-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 8, codeHashes, providerCalls: 0, actualModelComplianceProven: false,
  productionProtocolUnchanged: true, injectedOnly: true, trainingTruth: false });
await writeFile(path.join(root, 'build/ticket-18-production-v3/reader-command-policy-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 8, providerCalls: 0, hash: report.hash }));
