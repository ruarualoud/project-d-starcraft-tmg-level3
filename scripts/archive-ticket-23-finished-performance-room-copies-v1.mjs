// Exact finished diagnostic copies only. Original rooms, providers and evidence stay.
import assert from 'node:assert/strict';
import { readFile, writeFile, lstat, realpath, unlink, mkdir, statfs } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { gzip, gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import path from 'node:path';

const [worktree, ...matrixRoots] = process.argv.slice(2);
const allowed = new Set(['real-model-action-matrix-20261010-v1', 'real-model-four-plan-batch-20261010-v1']);
const root = await realpath(worktree);
const zip = promisify(gzip), unzip = promisify(gunzip);
const ledger = { schemaVersion: 'starcraft_tmg_finished_performance_copy_cleanup_v1',
  startedAt: new Date().toISOString(), status: 'running', removed: [], keptAllProviderAndEvidenceFiles: true };
const ledgerPath = path.join(root, 'build/ticket23-performance-copy-cleanup-20261010.private.json');
const save = () => writeFile(ledgerPath, JSON.stringify(ledger, null, 2), { mode: 0o600 });
const space = async () => { const s = await statfs(root); return Number(s.bavail) * Number(s.bsize); };
ledger.freeBytesBefore = await space();
await save();
try {
  for (const matrixRootInput of matrixRoots) {
    const matrixRoot = await realpath(matrixRootInput);
    assert(matrixRoot.startsWith(root + path.sep) && allowed.has(path.basename(matrixRoot)));
    const matrix = JSON.parse(await readFile(path.join(matrixRoot, 'matrix.private.json'), 'utf8'));
    const progress = JSON.parse(await readFile(path.join(matrixRoot, 'progress.private.json'), 'utf8'));
    assert.equal(progress.current, null, 'matrix must have no in-flight child');
    assert.equal(progress.completed.length, matrix.groupCount, 'all matrix attempts must be terminal');
    const archiveDirectory = path.join(matrixRoot, 'retained-room-deltas');
    await mkdir(archiveDirectory, { recursive: true, mode: 0o700 });
    for (const group of matrix.groups) {
      const directory = await realpath(path.join(matrixRoot, group.groupId));
      assert.equal(path.dirname(directory), matrixRoot);
      const exit = JSON.parse(await readFile(path.join(matrixRoot, group.groupId + '.exit.json'), 'utf8'));
      assert(exit.completedAt && Number.isInteger(exit.exitCode), 'native terminal required');
      const report = JSON.parse(await readFile(path.join(directory, 'report.private.json'), 'utf8'));
      assert.equal(report.originalRoomWrites, 0);
      const filename = path.join(directory, 'isolated-room.sqlite');
      const before = await lstat(filename).catch(e => { if (e.code === 'ENOENT') return null; throw e; });
      if (!before) continue;
      assert(before.isFile() && !before.isSymbolicLink());
      const sourceFilename = await realpath(path.join(group.source, 'room.sqlite'));
      assert(sourceFilename.startsWith(root + path.sep) && sourceFilename !== filename);
      const original = new DatabaseSync(sourceFilename, { readOnly: true });
      const copy = new DatabaseSync(filename, { readOnly: true });
      let archive;
      try {
        original.exec('BEGIN'); copy.exec('BEGIN');
        const roomId = report.roomId;
        const sourceRoom = original.prepare('SELECT * FROM sc_rooms WHERE room_id = ?').get(roomId);
        const currentRoom = copy.prepare('SELECT * FROM sc_rooms WHERE room_id = ?').get(roomId);
        assert(sourceRoom && currentRoom);
        assert.equal(currentRoom.initial_envelope_cipher, sourceRoom.initial_envelope_cipher);
        const sourcePrivate = original.prepare('SELECT count(*) AS n,max(sequence) AS maximum FROM sc_private_journal WHERE room_id = ?').get(roomId);
        const sourcePublic = original.prepare('SELECT count(*) AS n,max(sequence) AS maximum FROM sc_public_journal WHERE room_id = ?').get(roomId);
        assert.equal(copy.prepare('SELECT count(*) AS n FROM sc_private_journal WHERE room_id = ? AND sequence <= ?')
          .get(roomId, sourcePrivate.maximum || 0).n, sourcePrivate.n, 'original private append-only prefix must be retained');
        // These diagnostic copies intentionally copied three tables, not the
        // old public/idempotency/recovery prefixes. Archive that sparse shape.
        const originalPublicSequenceReferences = copy.prepare('SELECT sequence FROM sc_public_journal WHERE room_id = ? AND sequence <= ?')
          .all(roomId, sourcePublic.maximum || 0).map(row => row.sequence);
        const checkpoints = [], originalCheckpointReferences = [];
        for (const key of copy.prepare('SELECT state_revision FROM sc_checkpoints WHERE room_id = ?').all(roomId)) {
          const row = copy.prepare('SELECT * FROM sc_checkpoints WHERE room_id = ? AND state_revision = ?').get(roomId, key.state_revision);
          const source = original.prepare('SELECT * FROM sc_checkpoints WHERE room_id = ? AND state_revision = ?').get(roomId, key.state_revision);
          if (source && JSON.stringify(source) === JSON.stringify(row)) originalCheckpointReferences.push(key.state_revision);
          else checkpoints.push(row);
        }
        const idempotency = [], recovery = [], originalIdempotencyReferences = [], originalRecoveryReferences = [];
        for (const key of copy.prepare('SELECT key_hash FROM sc_idempotency WHERE room_id = ?').all(roomId)) {
          const row = copy.prepare('SELECT * FROM sc_idempotency WHERE room_id = ? AND key_hash = ?').get(roomId, key.key_hash);
          const source = original.prepare('SELECT * FROM sc_idempotency WHERE room_id = ? AND key_hash = ?').get(roomId, key.key_hash);
          if (!source || JSON.stringify(source) !== JSON.stringify(row)) idempotency.push(row);
          else originalIdempotencyReferences.push(key.key_hash);
        }
        for (const key of copy.prepare('SELECT recovery_revision FROM sc_seat_recovery WHERE room_id = ?').all(roomId)) {
          const row = copy.prepare('SELECT * FROM sc_seat_recovery WHERE room_id = ? AND recovery_revision = ?').get(roomId, key.recovery_revision);
          const source = original.prepare('SELECT * FROM sc_seat_recovery WHERE room_id = ? AND recovery_revision = ?').get(roomId, key.recovery_revision);
          if (!source || JSON.stringify(source) !== JSON.stringify(row)) recovery.push(row);
          else originalRecoveryReferences.push(key.recovery_revision);
        }
        const tables = copy.prepare("SELECT name,sql FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all();
        assert(tables.every(t => ['sc_rooms', 'sc_private_journal', 'sc_public_journal', 'sc_checkpoints', 'sc_idempotency', 'sc_seat_recovery'].includes(t.name)), 'unknown table must not be discarded');
        const { initial_envelope_cipher, ...roomDelta } = currentRoom;
        archive = { schemaVersion: 'starcraft_tmg_performance_room_delta_archive_v1',
          groupId: group.groupId, roomId, sourceFilename, reportPath: path.join(directory, 'report.private.json'),
          signedPrestatePath: path.join(directory, 'signed-prestate.private.json'),
          sourceInitialEnvelopeCipherSha256: createHash('sha256').update(initial_envelope_cipher).digest('hex'),
          sourcePrivate, sourcePublic, originalCheckpointReferences, originalPublicSequenceReferences,
          originalIdempotencyReferences, originalRecoveryReferences, tables,
          reconstruction: 'Copy original source tables; keep only referenced original checkpoint/public/idempotency/recovery rows (empty references mean empty prefix); replace current room fields except original initial envelope; append/replace retained delta rows. Preserve original observer historical-prefix replay filtering.',
          roomDelta,
          privateJournal: copy.prepare('SELECT * FROM sc_private_journal WHERE room_id = ? AND sequence > ? ORDER BY sequence').all(roomId, sourcePrivate.maximum || 0),
          publicJournal: copy.prepare('SELECT * FROM sc_public_journal WHERE room_id = ? AND sequence > ? ORDER BY sequence').all(roomId, sourcePublic.maximum || 0),
          checkpoints, idempotency, recovery };
        assert.equal(original.prepare('SELECT total_changes() AS n').get().n, 0);
        assert.equal(copy.prepare('SELECT total_changes() AS n').get().n, 0);
        original.exec('COMMIT'); copy.exec('COMMIT');
      } finally { original.close(); copy.close(); }
      const text = JSON.stringify(archive);
      const archiveFilename = path.join(archiveDirectory, group.groupId + '.room-delta.private.json.gz');
      const zipped = await zip(text, { level: 6 });
      await writeFile(archiveFilename, zipped, { mode: 0o600, flag: 'wx' });
      assert.equal((await unzip(await readFile(archiveFilename))).toString('utf8'), text, 'complete retained branch delta must roundtrip BEFORE deletion');
      const after = await lstat(filename);
      assert.equal(after.ino, before.ino); assert.equal(after.size, before.size); assert.equal(after.mtimeMs, before.mtimeMs);
      const removedFiles = [];
      for (const suffix of ['-wal', '-shm', '']) {
        const target = filename + suffix;
        const stat = await lstat(target).catch(e => { if (e.code === 'ENOENT') return null; throw e; });
        if (!stat) continue;
        assert(stat.isFile() && !stat.isSymbolicLink());
        await unlink(target);
        removedFiles.push({ path: target, bytes: stat.size });
      }
      const record = { groupId: group.groupId, matrix: path.basename(matrixRoot), archiveFilename,
        removedFiles, archiveBytes: zipped.length, originalRoomKept: sourceFilename,
        retainedPrivateEventCount: archive.privateJournal.length, retainedIdempotencyCount: archive.idempotency.length };
      ledger.removed.push(record); await save();
      console.log(JSON.stringify({ event: 'finished_copy_archived_and_pruned', groupId: group.groupId,
        matrix: record.matrix, removedBytes: removedFiles.reduce((n, f) => n + f.bytes, 0), archiveBytes: zipped.length }));
    }
  }
  ledger.status = 'complete';
} catch (error) { ledger.status = 'stopped'; ledger.failure = {
  code: String(error.code || error.name), message: String(error.message).split('\n')[0].slice(0,200),
  location: String(error.stack).split('\n').find(line=>line.includes('archive-ticket-23-finished'))?.trim() };
  process.exitCode = 1; }
finally { ledger.freeBytesAfter = await space(); ledger.completedAt = new Date().toISOString(); await save();
  console.log(JSON.stringify({ event: 'cleanup_terminal', status: ledger.status, copies: ledger.removed.length,
    freeBytesBefore: ledger.freeBytesBefore, freeBytesAfter: ledger.freeBytesAfter, failure: ledger.failure || null })); }
