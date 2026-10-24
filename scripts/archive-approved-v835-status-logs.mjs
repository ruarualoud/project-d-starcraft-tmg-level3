// One-off, explicitly authorized cleanup. No recursive deletion or glob targets.
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const build = path.join(root, 'build');
const targets = [
  ['slice272-product-generation-v645-lqMWaS/observations.jsonl', 192676139],
  ['slice272-v810-live-1792561512104.log', 6370820],
  ['slice272-v811-live-1792562995492.log', 4579305],
  ['slice272-v812-live-1792564023656.log', 4420826],
  ['slice272-v813-live-1792564752733.log', 5980926],
  ['slice272-v814-live-1792566202538.log', 5169143],
  ['slice272-v816-live-1792569191367.log', 4778370],
  ['slice272-v817-live-1792570533023.log', 4148894],
  ['slice272-v818-live-1792572016111.log', 1967816],
  ['slice272-v819-live-1792573316556.log', 5055422],
  ['slice272-v820-live-1792575121265.log', 2211340],
  ['slice272-v821-live-1792576368498.log', 1337313],
  ['slice272-v823-live-1792577228885.log', 1117994],
  ['slice272-v825-live-1792579357177.log', 1569970],
  ['slice272-v826-live-1792580034395.log', 4965081],
  ['slice272-v828-live-1792583567876.log', 1365763],
  ['slice272-v829-live-1792584733756.log', 6395830],
  ['slice272-v830-live-1792587053051.log', 5521589],
  ['slice272-v831-live-1792593430438.log', 3960283],
  ['slice272-v832-live-1792594627427.log', 9842348],
  ['slice272-v834-live-1792597982583.log', 1649468],
  ['slice272-v835-live-1792599730391.log', 472237],
];
const output = path.join(build, 'slice272-v835-approved-status-cleanup-20261022.json');
const deleted = path.join(build, 'slice272-v835-approved-status-cleanup-20261022.deleted.jsonl');
const records = [];
for (const [relative, expectedBytes] of targets) {
  const target = path.join(build, relative);
  const before = await fs.lstat(target);
  if (!before.isFile() || before.isSymbolicLink() || before.size !== expectedBytes) {
    throw new Error(`Target changed; do not delete: ${relative}`);
  }
  const record = { relative, bytes: before.size, inode: before.ino, mtimeMs: before.mtimeMs,
    sha256: null, stages: {}, lifecycle: [], diagnostics: [], firstStatus: null, lastStatus: null, failures: [] };
  const failures = new Map();
  const stream = createReadStream(target);
  const hash = createHash('sha256');
  stream.on('data', chunk => hash.update(chunk));
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of lines) {
    let value;
    try { value = JSON.parse(line); }
    catch { record.diagnostics.push(line); continue; }
    const stage = value.stage;
    if (!['initializing', 'product_status', 'stop_requested', 'finished'].includes(stage)) {
      throw new Error(`Unexpected record; preserve file: ${relative}`);
    }
    record.stages[stage] = (record.stages[stage] ?? 0) + 1;
    if (stage !== 'product_status') { record.lifecycle.push(value); continue; }
    const { work, ...status } = value;
    status.workStatusCounts = {};
    for (const item of work ?? []) {
      status.workStatusCounts[item.status] = (status.workStatusCounts[item.status] ?? 0) + 1;
      if (item.failure) failures.set(JSON.stringify(item), item);
    }
    record.firstStatus ??= status;
    record.lastStatus = status;
  }
  record.sha256 = hash.digest('hex');
  record.failures = [...failures.values()];
  records.push(record);
}
// Save and fsync the full summary before removing any authorized duplicate file.
const summary = { createdAt: new Date().toISOString(), authorization: 'user 2026-10-22 exact duplicate status log cleanup',
  preserved: ['workflow.json', 'artifacts', 'provider requests/replies', 'billing', 'reports', 'screenshots', 'test results'],
  records, totalBytes: records.reduce((sum, entry) => sum + entry.bytes, 0) };
const bytes = JSON.stringify(summary, null, 2) + '\n';
const handle = await fs.open(output, 'wx');
try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
if (await fs.readFile(output, 'utf8') !== bytes) throw new Error('Summary readback mismatch');
const journal = await fs.open(deleted, 'wx');
let removedBytes = 0;
try {
  for (const entry of records) {
    const target = path.join(build, entry.relative);
    const current = await fs.lstat(target);
    if (!current.isFile() || current.isSymbolicLink() || current.ino !== entry.inode ||
        current.size !== entry.bytes || current.mtimeMs !== entry.mtimeMs) {
      throw new Error(`File changed after summary; preserve it: ${entry.relative}`);
    }
    await fs.unlink(target);
    removedBytes += entry.bytes;
    await journal.writeFile(JSON.stringify({ relative: entry.relative, removedBytes: entry.bytes, sha256: entry.sha256 }) + '\n');
    await journal.sync();
  }
} finally { await journal.close(); }
console.log(JSON.stringify({ summary: output, deletedJournal: deleted, filesRemoved: records.length, removedBytes }));
