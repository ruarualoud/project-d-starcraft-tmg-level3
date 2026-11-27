import { DatabaseSync } from 'node:sqlite';
import { canonicalStarcraftTmgJson } from '../authoritative-engine/referee-crypto-v1.mjs';
import { verifyOfficialReleaseManifestV2 } from './official-release-context-v2.mjs';

function fail(code) { throw Object.assign(new Error(code), { code }); }
export function createSqliteOfficialReleaseStoreV1({ filename }) {
  if (!filename) fail('OFFICIAL_RELEASE_STORE_FILENAME_REQUIRED');
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA synchronous = FULL;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS sc_official_releases (
      release_id TEXT PRIMARY KEY, manifest_json TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS sc_official_release_defaults (
      purpose TEXT PRIMARY KEY, release_id TEXT NOT NULL REFERENCES sc_official_releases(release_id),
      generation INTEGER NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS sc_official_release_bindings (
      subject_kind TEXT NOT NULL, subject_id TEXT NOT NULL,
      release_id TEXT NOT NULL REFERENCES sc_official_releases(release_id),
      binding_json TEXT NOT NULL, PRIMARY KEY(subject_kind, subject_id)
    ) STRICT;
  `);
  const readRelease = releaseId => {
    const row = db.prepare('SELECT manifest_json FROM sc_official_releases WHERE release_id = ?').get(releaseId);
    if (!row) fail('OFFICIAL_RELEASE_NOT_FOUND');
    return verifyOfficialReleaseManifestV2(JSON.parse(row.manifest_json));
  };
  const readDefault = purpose => {
    const row = db.prepare('SELECT release_id, generation FROM sc_official_release_defaults WHERE purpose = ?').get(purpose);
    return row ? { releaseId: row.release_id, generation: row.generation } : { releaseId: null, generation: 0 };
  };
  function transaction(operation) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = operation();
      db.exec('COMMIT');
      return result;
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  return Object.freeze({
    registerRelease(manifest) {
      verifyOfficialReleaseManifestV2(manifest);
      const text = canonicalStarcraftTmgJson(manifest);
      return transaction(() => {
        db.prepare('INSERT OR IGNORE INTO sc_official_releases VALUES (?, ?)').run(manifest.releaseId, text);
        const stored = readRelease(manifest.releaseId);
        if (canonicalStarcraftTmgJson(stored) !== text) fail('OFFICIAL_RELEASE_ID_REUSED');
        return stored;
      });
    },
    readRelease,
    listReleases() {
      return db.prepare('SELECT manifest_json FROM sc_official_releases ORDER BY release_id').all()
        .map(row => verifyOfficialReleaseManifestV2(JSON.parse(row.manifest_json)));
    },
    readDefault,
    writeDefault({ releaseId, purpose, expectedGeneration }) {
      if (!Number.isSafeInteger(expectedGeneration) || expectedGeneration < 0) fail('OFFICIAL_RELEASE_GENERATION_REQUIRED');
      return transaction(() => {
        readRelease(releaseId);
        const prior = readDefault(purpose);
        if (prior.generation !== expectedGeneration) fail('OFFICIAL_RELEASE_POINTER_STALE');
        const next = { releaseId, generation: prior.generation + 1 };
        db.prepare(`INSERT INTO sc_official_release_defaults VALUES (?, ?, ?)
          ON CONFLICT(purpose) DO UPDATE SET release_id = excluded.release_id, generation = excluded.generation`)
          .run(purpose, releaseId, next.generation);
        return next;
      });
    },
    bindSubject(binding) {
      if (!binding.subjectKind || !binding.subjectId || !binding.purpose) fail('OFFICIAL_RELEASE_SUBJECT_REQUIRED');
      const text = canonicalStarcraftTmgJson(binding);
      return transaction(() => {
        const manifest = readRelease(binding.releaseId);
        if (manifest.manifestHash !== binding.manifestHash) fail('OFFICIAL_RELEASE_BINDING_CONFLICT');
        db.prepare('INSERT OR IGNORE INTO sc_official_release_bindings VALUES (?, ?, ?, ?)')
          .run(binding.subjectKind, binding.subjectId, binding.releaseId, text);
        const row = db.prepare('SELECT binding_json FROM sc_official_release_bindings WHERE subject_kind = ? AND subject_id = ?')
          .get(binding.subjectKind, binding.subjectId);
        if (row.binding_json !== text) fail('OFFICIAL_RELEASE_SUBJECT_ALREADY_BOUND');
        return JSON.parse(row.binding_json);
      });
    },
    readBinding({ subjectKind, subjectId }) {
      const row = db.prepare('SELECT binding_json FROM sc_official_release_bindings WHERE subject_kind = ? AND subject_id = ?')
        .get(subjectKind, subjectId);
      if (!row) fail('OFFICIAL_RELEASE_SUBJECT_MISSING');
      return JSON.parse(row.binding_json);
    },
    close() { db.close(); },
  });
}
