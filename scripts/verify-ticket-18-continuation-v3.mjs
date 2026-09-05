import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seal, hash } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { withCheckpointContinuation } from '../packages/skill-production/continuation.mjs';
import { inspectV3Continuation } from '../packages/skill-production-v3/continuation.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await mkdir(path.join(root, 'build/ticket-18-production-v3'), { recursive: true });
const temp = await mkdtemp(path.join(root, 'build/ticket-18-production-v3/continuation-'));
const file = path.join(temp, 'test.sqlite');
const main = seal({ passed: true, codeHashes: [{ file: 'packages/skill-production/model.mjs', hash: hash('model') }] });
const contract = seal({ passed: true, codeHashes: [{ file: 'packages/skill-production-v3/runtime.mjs', hash: hash('old') },
  { file: 'packages/skill-production-v3/contracts.mjs', hash: hash('gate') }] });
const capacity = seal({ passed: true, codeHashes: [{ file: 'packages/skill-production/loops.mjs', hash: hash('loop') }] });
const revised = seal({ passed: true, codeHashes: [{ file: 'packages/skill-production-v3/runtime.mjs', hash: hash('new') },
  { file: 'packages/skill-production-v3/contracts.mjs', hash: hash('gate') },
  { file: 'packages/skill-production-v3/citation-repair.mjs', hash: hash('repair') }] });
const overall = process.argv.includes('--overall');
const body = { version: overall ? 'overall-rules-production-v3-complete-and-exam' : 'fixture', catalogueHash: hash('frozen'), contextHash: hash('full'), modelHash: hash('provider'),
  limits: { calls: 4, wallMs: 1000 }, mainReadinessHash: main.hash, capacityReadinessHash: capacity.hash, codeHashes: [] };
const parent = seal({ ...body, contractReadinessHash: contract.hash });
const next = seal({ ...body, contractReadinessHash: revised.hash });
const parentRunId = (overall ? 'overall-v3-' : 'rules-v3-') + parent.hash.slice(0, 20);
const opts = { runId: parentRunId, recipeHash: parent.hash, maxCalls: 4, maxCostMicros: 1000000, maxTokens: 1000000 };
const store = openProductionStore(file, opts);
store.finish(store.acquire('production-start', { recipeHash: parent.hash }), { began: 100 });
const input = { task: 'exact same complete context' };
store.finish(store.acquire('packet.review', input), seal({ output: { injected: true }, roleId: 'packet.review' }));
store.finish(store.acquire('packet.candidate', {}), seal({ semanticPassed: true, candidateOnly: true }));
store.reserve('old-call', {}, 1000, 100); store.settle('old-call', { usage: { inputUnits: 10, outputUnits: 2, totalUnits: 12 }, costMicros: 120, response: { fixture: true } });
const args = { filename: file, parentRunId, parent, next, parentReports: [main, contract, capacity], nextReports: [main, revised, capacity] };
const continuation = inspectV3Continuation(args);
assert.equal(continuation.manifest.reusable.length, 1); assert.equal(continuation.manifest.reusable[0].id, 'packet.review');
assert.equal(continuation.manifest.accounting.calls, 1); assert.equal(continuation.manifest.accounting.tokens, 12);
assert.equal(continuation.manifest.accounting.costMicros, 120); assert.equal(continuation.manifest.parentStart, 100);
const child = withCheckpointContinuation(openProductionStore(file, { ...opts, runId: 'fixture-child', recipeHash: hash('child') }), continuation);
assert(child.acquire('packet.review', input).cached);
assert.equal(child.summary().calls, 0); assert.equal(child.artifact('inherited.packet.review').newPhysicalCalls, 0);
assert(!child.acquire('packet.candidate', {}).cached); child.close();
const changed = withCheckpointContinuation(openProductionStore(file, { ...opts, runId: 'fixture-changed', recipeHash: hash('changed') }), continuation);
assert(!changed.acquire('packet.review', { task: 'different' }).cached); changed.close();
assert.throws(() => inspectV3Continuation({ ...args, next: seal({ ...body, catalogueHash: hash('new-data'), contractReadinessHash: revised.hash }) }), { code: 'V3_CONTINUATION_IDENTITY_DRIFT' });
assert.throws(() => inspectV3Continuation({ ...args, next: seal({ ...body, limits: { calls: 5 }, contractReadinessHash: revised.hash }) }), { code: 'V3_CONTINUATION_IDENTITY_DRIFT' });
const alteredGate = seal({ passed: true, codeHashes: [...revised.codeHashes.filter(r => !r.file.endsWith('contracts.mjs')),
  { file: 'packages/skill-production-v3/contracts.mjs', hash: hash('unsafe-new-gate') }] });
assert.throws(() => inspectV3Continuation({ ...args, next: seal({ ...body, contractReadinessHash: alteredGate.hash }), nextReports: [main, alteredGate, capacity] }), { code: 'V3_CONTINUATION_UNAPPROVED_DEPENDENCY_DRIFT' });
const busy = store.acquire('busy', {});
assert.throws(() => inspectV3Continuation(args), { code: 'V3_CONTINUATION_PARENT_RUNNING' }); store.release(busy);
store.reserve('ambiguous', {}, 1000, 100);
assert.throws(() => inspectV3Continuation(args), { code: 'AMBIGUOUS_EGRESS_NO_RETRY' });
store.settle('ambiguous', { code: 'PROVIDER_PAYMENT_REQUIRED' });
assert.throws(() => inspectV3Continuation(args), { code: 'API_BALANCE_EXHAUSTED_STOP_ALL_WORK' });
store.close();
console.log(JSON.stringify({ passed: true, checks: 12, overall, providerCalls: 0, inheritedFinalAcceptance: false }));
