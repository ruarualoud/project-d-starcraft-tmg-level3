import assert from 'node:assert/strict';
import { runDirectLoop } from '../packages/skill-production/loops.mjs';
import { projectRuntimeManifest } from '../packages/skill-production/runtime-projection.mjs';

const limits = { maxCalls: 6, maxTools: 5, maxOutput: 100, maxWallMs: 15 };
const port = () => ({ trace: () => [], execute: async () => ({ found: true }) });
let calls = 0, cancelled = false, settled = false;
await assert.rejects(runDirectLoop({ task: 'timeout regression', limits, toolPort: port(),
  callModel: async ({ signal }) => {
    calls += 1;
    await new Promise(resolve => {
      const timer = setTimeout(resolve, 60);
      signal?.addEventListener('abort', () => { cancelled = true; clearTimeout(timer); resolve(); }, { once: true });
    });
    // A real model broker settles its durable attempt before returning/rejecting.
    settled = true;
    return { command: { action: 'finish', content: { late: true } }, receiptHash: 'fixture' };
  },
}), { code: 'SESSION_WALL_TIME_EXHAUSTED' });
assert.equal(calls, 1); assert(cancelled); assert(settled);
const result = await runDirectLoop({ task: 'normal', limits: { ...limits, maxWallMs: 500 }, toolPort: port(),
  callModel: async ({ signal }) => {
    assert(signal && !signal.aborted);
    return { command: { action: 'finish', content: { ok: true } }, receiptHash: 'fixture' };
  },
});
assert(result.final.ok);
assert.equal(result.deadline.policy, 'abort_egress_then_await_accounting_settlement');
const projection = projectRuntimeManifest({ entries: [
  ...['index.js', 'index.ts', 'index.js.map', 'index.d.ts', 'index.d.mts', 'package.json', 'plugin.md', 'native.node']
    .map(path => ({ path, type: 'file', sizeBytes: 10 })),
], entryCount: 8, totalBytes: 80 });
assert.deepEqual(projection.manifest.entries.map(e => e.path), ['index.js', 'index.ts', 'package.json', 'plugin.md', 'native.node']);
assert.equal(projection.manifest.totalBytes, 50);
assert.throws(() => projectRuntimeManifest({ entries: [{ path: 'a.d.ts', type: 'file' },
  { path: 'b', type: 'symlink', target: 'a.d.ts' }] }));
console.log('PASS session deadline: cancellation, no late acceptance, settlement drained, normal completion');
console.log('PASS execution projection: preserve runtime code/assets/metadata and reject omitted symlink targets');
