// The complete immutable laboratory root, not just its identity, survives a
// product restart. Existing sessions never silently rebuild a damaged root.
import { closeSync, fsyncSync, linkSync, mkdirSync, openSync, readFileSync,
  unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { verifyOfficialStandardRoomInitialStateAuthorityV1 } from
  '../product-composition/official-standard-room-factory-v1.mjs';

const SCHEMA = 'starcraft_tmg_planning_laboratory_source_snapshot_v1';

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

export function createPlanningLaboratorySourceStoreV1({ directory }) {
  if (typeof directory !== 'string' || !directory.trim()) {
    throw new Error('PLANNING_LAB_SOURCE_DIRECTORY_REQUIRED');
  }
  const root = path.resolve(directory);
  const loaded = new Map();

  function read(file, scopeHash) {
    let bytes;
    try { bytes = readFileSync(file); }
    catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
    try {
      const envelope = JSON.parse(gunzipSync(bytes).toString('utf8'));
      if (envelope.schema !== SCHEMA || hash(envelope.scope) !== scopeHash) {
        throw new Error('SOURCE_SCOPE_MISMATCH');
      }
      verifyOfficialStandardRoomInitialStateAuthorityV1(envelope.authority);
      return freeze(envelope.authority);
    } catch (cause) {
      throw Object.assign(new Error('PLANNING_LAB_SOURCE_SNAPSHOT_INVALID', { cause }), {
        code: 'PLANNING_LAB_SOURCE_SNAPSHOT_INVALID',
        detail: { scopeHash, snapshotPath: file, originalPreserved: true },
      });
    }
  }

  return Object.freeze({
    get({ scope, create }) {
      const scopeHash = hash(scope);
      if (loaded.has(scopeHash)) return loaded.get(scopeHash);
      const file = path.join(root, `${scopeHash}.json.gz`);
      let authority = read(file, scopeHash);
      if (!authority) {
        authority = create();
        verifyOfficialStandardRoomInitialStateAuthorityV1(authority);
        const bytes = gzipSync(JSON.stringify({ schema: SCHEMA, scope, authority }));
        mkdirSync(root, { recursive: true, mode: 0o700 });
        const temporary = path.join(root, `.${scopeHash}.${randomUUID()}.tmp`);
        const fd = openSync(temporary, 'wx', 0o600);
        try {
          writeFileSync(fd, bytes);
          fsyncSync(fd);
        } finally { closeSync(fd); }
        try {
          // Publish without overwriting another process's already pinned root.
          // If two constructors race, both consume the first complete snapshot.
          linkSync(temporary, file);
        } catch (error) {
          if (error.code !== 'EEXIST') throw error;
          authority = read(file, scopeHash);
          if (!authority) throw new Error('PLANNING_LAB_SOURCE_PUBLICATION_LOST');
        } finally { unlinkSync(temporary); }
      }
      authority = freeze(authority);
      loaded.set(scopeHash, authority);
      return authority;
    },
  });
}
