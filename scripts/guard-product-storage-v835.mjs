// Operator-side guard only: no prompt, budget, workflow or model-output changes.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pid = Number(process.argv[2]);
if (!Number.isSafeInteger(pid) || pid < 2) throw new Error('Exact product PID required');
const expectedRun = root + '/build/slice272-product-generation-v645-lqMWaS';
async function identity() {
  return new Promise((resolve, reject) => {
    const p = spawn('/bin/ps', ['-p', String(pid), '-o', 'lstart=,command=']);
    let out = '';
    p.stdout.setEncoding('utf8');
    p.stdout.on('data', chunk => out += chunk);
    p.on('error', reject);
    p.on('close', code => resolve(code === 0 ? out.trim() : null));
  });
}
const original = await identity();
if (!original?.includes('run-slice272-product-generation-v645.mjs') || !original.includes(expectedRun)) {
  throw new Error('PID does not identify the authorized original product run');
}
const receipt = root + '/build/slice272-v835-storage-guard-' + pid + '.json';
for (;;) {
  const current = await identity();
  if (current !== original) {
    console.log(JSON.stringify({ stopped: true, reason: current ? 'identity_changed' : 'product_exited', pid }));
    break;
  }
  const disk = await fs.statfs(root);
  const availableBytes = disk.bavail * disk.bsize;
  if (availableBytes < 200 * 1048576) {
    // The existing product handler waits for its current operation; no SIGKILL.
    process.kill(pid, 'SIGTERM');
    const result = { at: new Date().toISOString(), pid, identity: original, availableBytes,
      thresholdBytes: 200 * 1048576, action: 'SIGTERM_afterCurrentOperation',
      modelBudgetChanged: false, workflowReset: false, filesDeleted: false };
    await fs.writeFile(receipt, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify(result));
    break;
  }
  await sleep(5000);
}
