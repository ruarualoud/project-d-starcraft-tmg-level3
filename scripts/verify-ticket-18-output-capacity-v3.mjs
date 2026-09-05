import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAccountedModel } from '../packages/skill-production/model.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, hash, sha256, verifySeal } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), out = path.join(root, 'build/ticket-18-production-v3');
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
const old = db.prepare("SELECT id,state,code,usage,response FROM attempts WHERE run=? ORDER BY id").all('overall-v3-58ddd1273138b8da321f');
db.close(); assert.equal(old.length, 2);
assert(old.every(r => r.code === 'PROVIDER_RESPONSE_OUTPUT_TRUNCATED' && verifySeal(JSON.parse(r.usage)).value.outputUnits === 1400));
const saved = verifySeal(JSON.parse(old[0].response)).value;
assert(saved.responseOutcome.usageKnown);
const originalError = () => Object.assign(new Error(old[0].code), { code: old[0].code, safeReceipt: saved });
const temp = await mkdtemp(path.join(out, 'output-capacity-'));
const makeStore = name => openProductionStore(path.join(temp, name + '.sqlite'), { runId: 'capacity-' + name, recipeHash: hash(name), maxCalls: 8 });
const observed = { system: 'capacity fixture only', messages: [{ role: 'user', content: 'All source context and task remain unchanged.' }], tools: [] };
const input = { stageId: 'rules-reading-006.tutor', call: 1, observed, maxOutput: 1400 };
const store = makeStore('recovery'), requests = [];
const complete = async request => {
  requests.push(request);
  assert.deepEqual(request.promptNodes[1].value.messages, observed.messages);
  if (request.maxOutputUnits <= 1400) throw originalError();
  return { output: { channels: { skill: { action: 'finish', content: { injected: true } } } }, usageReceipt: {
    requestedModel: 'deepseek-v4-flash', reportedModel: 'deepseek-v4-flash', startedAt: '2026-09-06T00:00:00Z',
    usage: { inputUnits: 100, outputUnits: 1600, totalUnits: 1700 }, receiptHash: hash('injected-capacity') } };
};
const model = createAccountedModel({ store, complete, outputRecoveryLimit: 4096 });
assert((await model(input)).command.content.injected);
assert.deepEqual(requests.map(r => r.maxOutputUnits), [1400, 4096]);
assert(requests[1].userMessage.includes('output capacity'));
assert(!requests[1].userMessage.startsWith('Repair output formatting only'));
assert.equal(store.summary().knownTokens, saved.responseOutcome.usage.totalUnits + 1700);
assert.equal(store.summary().calls, 2);
await model(input); assert.equal(requests.length, 2); // both failure and capacity recovery survive exact restart
const capped = makeStore('capped'); let cappedCalls = 0;
await assert.rejects(createAccountedModel({ store: capped, outputRecoveryLimit: 4096, complete: async () => {
  cappedCalls++; throw originalError();
} })({ ...input, maxOutput: 4096 }), { code: 'PROVIDER_RESPONSE_OUTPUT_TRUNCATED' });
assert.equal(cappedCalls, 1); // no useless same-capacity format retry
const unknown = makeStore('unknown'); let unknownCalls = 0;
await assert.rejects(createAccountedModel({ store: unknown, outputRecoveryLimit: 4096, complete: async () => {
  unknownCalls++; throw Object.assign(new Error('unknown'), { code: 'PROVIDER_RESPONSE_OUTPUT_TRUNCATED' });
} })(input));
assert.equal(unknownCalls, 1); assert.equal(unknown.summary().unknownCalls, 1);
const schema = makeStore('schema'); let schemaCalls = 0;
await assert.rejects(createAccountedModel({ store: schema, outputRecoveryLimit: 4096, complete: async request => {
  schemaCalls++; assert.equal(request.maxOutputUnits, 1400);
  throw Object.assign(new Error('json'), { code: 'PROVIDER_RESPONSE_JSON_INVALID', safeReceipt: saved });
} })(input));
assert.equal(schemaCalls, 2); // capacity policy does not grant semantic or extra retries
assert.throws(() => createAccountedModel({ store, complete, outputRecoveryLimit: 4097 }));
for (const s of [store, capped, unknown, schema]) s.close();
const files = ['packages/skill-production/model.mjs', 'packages/skill-production-v3/runtime.mjs', 'scripts/verify-ticket-18-output-capacity-v3.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 8, savedFailureIds: old.map(r => r.id), codeHashes,
  actualFailureUsagePreserved: true, injectedCapacityRecoveryOnly: true, actualProviderCalls: 0, trainingTruth: false });
try {
  const previous = verifySeal(JSON.parse(await readFile(path.join(out, 'output-capacity-readiness.json'), 'utf8')));
  await writeFile(path.join(out, 'output-capacity-readiness-' + previous.hash + '.json'), JSON.stringify(previous, null, 2), { flag: 'wx' });
} catch (error) { if (!['ENOENT', 'EEXIST'].includes(error.code)) throw error; }
await writeFile(path.join(out, 'output-capacity-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 8, actualProviderCalls: 0, hash: report.hash }));
