import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { readFile, writeFile } from 'node:fs/promises';
import { seal, sha256 } from '../packages/skill-production/common.mjs';
import { withFactionEventLoopYieldV1 } from '../packages/skill-production-v3/faction-event-loop-fairness-v1.mjs';

async function trial(fair) {
  const child = spawn(process.execPath, ['--eval', 'process.send({ready:true});process.on("message",()=>{});'],
    { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
  let timer;
  const handshake = new Promise(resolve => {
    timer = setTimeout(() => resolve('timeout'), 2000);
    child.once('message', () => { clearTimeout(timer); resolve('ready'); });
  });
  const request = Object.freeze({ identicalRequest: true }); let cachedRoles = 0;
  const runtime = { async role(received) {
    assert.equal(received, request);
    const start = performance.now(); while (performance.now() - start < 10) { /* CPU-only cached validation fixture */ }
    cachedRoles++; return request;
  } };
  const wrapped = fair ? withFactionEventLoopYieldV1(runtime) : runtime;
  try {
    const replay = (async () => { for (let n = 0; n < 240; n++) assert.equal(await wrapped.role(request), request); })();
    const [state] = await Promise.all([handshake, replay]);
    return { state, cachedRoles };
  } finally {
    clearTimeout(timer);
    const stopped = new Promise(resolve => child.once('exit', resolve));
    child.kill('SIGTERM'); await stopped;
  }
}
const starved = await trial(false), fair = await trial(true);
assert.equal(starved.state, 'timeout');
assert.equal(fair.state, 'ready');
assert.equal(starved.cachedRoles, fair.cachedRoles);
const files = ['packages/skill-production-v3/faction-event-loop-fairness-v1.mjs', 'scripts/verify-ticket-18-faction-event-loop-fairness-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) })));
const report = seal({ passed: true, starved, fair, actualIpcProcesses: 2,
  requestAndOutputIdentityPreserved: true, providerCalls: 0,
  productionFailureCauseNotYetConfirmed: true, codeHashes, trainingTruth: false });
await writeFile('build/ticket-18-faction-production-v1/event-loop-fairness-readiness.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, starved, fair, providerCalls: 0, hash: report.hash }));
