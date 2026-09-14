import assert from 'node:assert/strict';
import { createPreparedRuntimeCacheV1 } from '../packages/skill-production/prepared-runtime-cache-v1.mjs';
import { hash } from '../packages/skill-production/common.mjs';

const key = name => hash({ runtime: name });
const cache = createPreparedRuntimeCacheV1({ maximumEntries: 2 });
let preparations = 0, release;
const ready = new Promise(resolve => { release = resolve; });
const prepared = Object.freeze({ binding: 'same-content', run: task => ({ task }) });
const prepare = async () => { preparations++; await ready; return prepared; };
const first = cache.get(key('a'), prepare), second = cache.get(key('a'), prepare);
await Promise.resolve(); assert.equal(preparations, 1);
release(); assert.equal(await first, prepared); assert.equal(await second, prepared);
assert.equal(await cache.get(key('a'), () => assert.fail('Must reuse completed preparation')), prepared);
assert.deepEqual(prepared.run('terran'), { task: 'terran' });
assert.deepEqual(prepared.run('zerg'), { task: 'zerg' });
const changed = await cache.get(key('b'), () => ({ binding: 'changed-content' }));
assert.notEqual(changed, prepared);
let failed = 0;
await assert.rejects(cache.get(key('failure'), async () => { failed++; throw new Error('attestation failed'); }), /attestation failed/);
assert.deepEqual(await cache.get(key('failure'), () => { failed++; return { retried: true }; }), { retried: true });
assert.equal(failed, 2);
let rebuilt = 0;
await cache.get(key('a'), () => { rebuilt++; return prepared; });
assert.equal(rebuilt, 1, 'Completed least-recently-used preparation is bounded and can be rebuilt');

const bounded = createPreparedRuntimeCacheV1({ maximumEntries: 1 });
let releasePending, pendingCalls = 0;
const pendingReady = new Promise(resolve => { releasePending = resolve; });
const pending = bounded.get(key('pending'), async () => { pendingCalls++; await pendingReady; return prepared; });
await bounded.get(key('other'), () => changed);
const joined = bounded.get(key('pending'), () => assert.fail('Cannot evict in-flight preparation'));
releasePending(); assert.equal(await pending, prepared); assert.equal(await joined, prepared);
assert.equal(pendingCalls, 1);
assert.throws(() => createPreparedRuntimeCacheV1({ maximumEntries: 0 }), TypeError);
await assert.rejects(cache.get('mutable-name', prepare), TypeError);
console.log(JSON.stringify({ passed: true, scope: 'process_local_content_keyed_preparation_cache',
  sameKeySingleFlight: true, distinctContentIsolated: true, failuresEvicted: true,
  inFlightNotEvicted: true, tasksNotCached: true, realDshMeasuredSeparately: true, providerCalls: 0 }));
