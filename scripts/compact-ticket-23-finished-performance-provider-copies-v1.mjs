// Owner-authorized cleanup: completed diagnostic copies only, never live sources.
import assert from 'node:assert/strict';
import { readFile, writeFile, lstat, realpath, rename, unlink, open, statfs } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import path from 'node:path';

const [worktree, ...matrixInputs] = process.argv.slice(2);
const root = await realpath(worktree);
const allowed = new Set(['real-model-action-matrix-20261010-v1', 'real-model-four-plan-batch-20261010-v1']);
const ledgerPath = path.join(root, 'build/ticket23-provider-copy-compaction-20261010.private.json');
const ledger = { schemaVersion: 'starcraft_tmg_finished_provider_copy_compaction_v1',
  startedAt: new Date().toISOString(), status: 'running', compacted: [],
  originalSourceWrites: 0, providerCalls: 0, removedModelRecords: 0 };
const space = async () => { const s = await statfs(root); return s.bavail * s.bsize; };
const save = () => writeFile(ledgerPath, JSON.stringify(ledger, null, 2), { mode: 0o600 });
const optionalStat = filename => lstat(filename).catch(error => {
  if (error.code === 'ENOENT') return null;
  throw error;
});
const digest = rows => createHash('sha256').update(JSON.stringify(rows)).digest('hex');
ledger.freeBytesBefore = await space();
await save();
try {
  for (const input of matrixInputs) {
    const matrixRoot = await realpath(input);
    assert(matrixRoot.startsWith(root + path.sep) && allowed.has(path.basename(matrixRoot)));
    const matrix = JSON.parse(await readFile(path.join(matrixRoot, 'matrix.private.json'), 'utf8'));
    const progress = JSON.parse(await readFile(path.join(matrixRoot, 'progress.private.json'), 'utf8'));
    assert.equal(progress.current, null);
    assert.equal(progress.completed.length, matrix.groupCount);
    for (const group of matrix.groups) {
      const directory = await realpath(path.join(matrixRoot, group.groupId));
      assert.equal(path.dirname(directory), matrixRoot);
      const exit = JSON.parse(await readFile(path.join(matrixRoot, group.groupId + '.exit.json'), 'utf8'));
      assert(exit.completedAt && Number.isInteger(exit.exitCode));
      const filename = await realpath(path.join(directory, 'provider/live-decisions.sqlite'));
      assert.equal(filename, path.join(directory, 'provider/live-decisions.sqlite'));
      const before = await lstat(filename);
      assert(before.isFile() && !before.isSymbolicLink());
      const wal = await optionalStat(filename + '-wal');
      assert(!wal || wal.size === 0, 'nonempty WAL is outside this cleanup scope');
      const source = new DatabaseSync(filename, { readOnly: true });
      let rows, schema, freeBytes;
      try {
        source.exec('BEGIN');
        schema = source.prepare("SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all();
        assert.equal(schema.length, 1, 'unknown schema must be preserved by another workflow');
        assert.equal(schema[0].name, 'sc_live_decision_records');
        assert.equal(schema[0].type, 'table');
        const free = source.prepare('PRAGMA freelist_count').get().freelist_count;
        const pageSize = source.prepare('PRAGMA page_size').get().page_size;
        freeBytes = free * pageSize;
        rows = source.prepare('SELECT scope_key,revision,record_json,updated_at FROM sc_live_decision_records ORDER BY scope_key').all();
        assert.equal(source.prepare('SELECT total_changes() AS n').get().n, 0);
        source.exec('COMMIT');
      } finally { source.close(); }
      if (freeBytes < 1024 * 1024) continue;
      const rowDigest = digest(rows);
      const temporary = filename + '.compact-20261010.tmp';
      const handle = await open(temporary, 'wx', 0o600);
      await handle.close();
      const compact = new DatabaseSync(temporary);
      try {
        compact.exec('PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; BEGIN IMMEDIATE');
        compact.exec(schema[0].sql);
        const insert = compact.prepare('INSERT INTO sc_live_decision_records (scope_key,revision,record_json,updated_at) VALUES (?,?,?,?)');
        for (const row of rows) insert.run(row.scope_key, row.revision, row.record_json, row.updated_at);
        compact.exec('COMMIT');
        const retained = compact.prepare('SELECT scope_key,revision,record_json,updated_at FROM sc_live_decision_records ORDER BY scope_key').all();
        assert.equal(digest(retained), rowDigest, 'every model-record byte and metadata field must be unchanged');
        assert.deepEqual(compact.prepare("SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all(), schema);
        assert.equal(compact.prepare('PRAGMA quick_check').get().quick_check, 'ok');
        compact.exec('PRAGMA journal_mode=WAL');
      } finally { compact.close(); }
      const staged = await lstat(temporary);
      assert(staged.size < before.size);
      const after = await lstat(filename);
      assert.equal(after.ino, before.ino);
      assert.equal(after.size, before.size);
      assert.equal(after.mtimeMs, before.mtimeMs);
      const finalWal = await optionalStat(filename + '-wal');
      assert(!finalWal || finalWal.size === 0);
      // No model history is discarded: replace only after complete row/schema
      // equality. Native matrix exits and empty WAL establish a closed copy.
      for (const suffix of ['-wal', '-shm']) {
        const companion = await optionalStat(filename + suffix);
        if (!companion) continue;
        assert(companion.isFile() && !companion.isSymbolicLink());
        if (suffix === '-wal') assert.equal(companion.size, 0);
        await unlink(filename + suffix);
      }
      await rename(temporary, filename);
      const record = { matrix: path.basename(matrixRoot), groupId: group.groupId,
        filename, bytesBefore: before.size, bytesAfter: staged.size,
        reclaimedBytes: before.size - staged.size, recordCount: rows.length,
        completeRowsSha256: rowDigest, pathPreserved: true };
      ledger.compacted.push(record);
      await save();
      console.log(JSON.stringify({ event: 'finished_provider_copy_compacted',
        groupId: group.groupId, matrix: record.matrix, reclaimedBytes: record.reclaimedBytes }));
    }
  }
  ledger.status = 'complete';
} catch (error) {
  ledger.status = 'stopped';
  ledger.failure = { code: String(error.code || error.name), message: String(error.message).split('\n')[0].slice(0, 200) };
  process.exitCode = 1;
} finally {
  ledger.freeBytesAfter = await space();
  ledger.completedAt = new Date().toISOString();
  await save();
  console.log(JSON.stringify({ event: 'cleanup_terminal', status: ledger.status,
    copies: ledger.compacted.length, reclaimedBytes: ledger.compacted.reduce((n,r) => n + r.reclaimedBytes, 0),
    freeBytesAfter: ledger.freeBytesAfter, failure: ledger.failure || null }));
}
