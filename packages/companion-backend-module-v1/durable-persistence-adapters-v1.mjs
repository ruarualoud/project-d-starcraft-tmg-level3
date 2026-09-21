import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgPrivatePayloadCodec } from "../room-store/room-store-v1.mjs";
import {
  COMPANION_BACKEND_CONTRACT_VERSION,
  COMPANION_BACKEND_ERROR_CODES,
  COMPANION_PERSISTENCE_PORT_V1,
  CompanionBackendError,
} from "./contracts-v1.mjs";

export const COMPANION_DURABLE_PERSISTENCE_CONTRACT_V1 = Object.freeze({
  schemaVersion: `${COMPANION_BACKEND_CONTRACT_VERSION}.durable-persistence`,
  portId: COMPANION_PERSISTENCE_PORT_V1.portId,
  adapters: Object.freeze(["sqlite", "postgresql"]),
  methods: COMPANION_PERSISTENCE_PORT_V1.requiredMethods,
  payloadProtection: "aes-256-gcm_via_injected_managed_codec_or_key",
  durableKeyPolicy: "managed_codec_or_32_byte_key_required_for_file_sqlite_and_postgresql",
  checkpointSemantics: "full_namespace_snapshot_atomic_restore",
  silentCompatibility: false,
});

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function fail(code, message, details = {}) {
  throw new CompanionBackendError(code, message, details);
}

function identity(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) fail(COMPANION_BACKEND_ERROR_CODES.PACKAGE_INVALID, `${field} is required`);
  return normalized;
}

function context(namespace, key) {
  return `companion:${namespace}:${key}`;
}

function snapshotHash(snapshot) {
  return hashStarcraftTmgContract(snapshot);
}

function validManagedKey(value) {
  if (Buffer.isBuffer(value)) return value.length === 32;
  if (value instanceof Uint8Array) return value.byteLength === 32;
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    return Buffer.from(value, "base64").length === 32;
  } catch {
    return false;
  }
}

function durableCodec(options, persistenceKind, durableTarget = true) {
  if (options.privatePayloadCodec) {
    if (typeof options.privatePayloadCodec.encode !== "function"
      || typeof options.privatePayloadCodec.decode !== "function") {
      fail(COMPANION_BACKEND_ERROR_CODES.PORT_CONFORMANCE_FAILURE,
        `${persistenceKind} privatePayloadCodec must provide encode() and decode()`);
    }
    return options.privatePayloadCodec;
  }
  if (options.encryption?.key !== undefined) {
    if (!validManagedKey(options.encryption.key)) {
      fail(COMPANION_BACKEND_ERROR_CODES.DEPENDENCY_MISSING,
        `${persistenceKind} companion persistence encryption.key must decode to exactly 32 bytes`);
    }
    return createStarcraftTmgPrivatePayloadCodec(options.encryption);
  }
  if (durableTarget) {
    fail(COMPANION_BACKEND_ERROR_CODES.DEPENDENCY_MISSING,
      `${persistenceKind} companion persistence requires an injected privatePayloadCodec or encryption.key`);
  }
  return createStarcraftTmgPrivatePayloadCodec(options.encryption || {});
}

function snapshotFromRows(rows, decode) {
  const snapshot = {};
  for (const row of rows) {
    const namespace = String(row.namespace);
    const key = String(row.entry_key);
    snapshot[namespace] ||= {};
    const value = decode(row.value_cipher, context(namespace, key));
    if (hashStarcraftTmgContract(value === undefined ? null : value) !== String(row.value_hash)) {
      fail(COMPANION_BACKEND_ERROR_CODES.CONTRACT_INTEGRITY_MISMATCH,
        `companion persistence value integrity mismatch: ${namespace}/${key}`);
    }
    snapshot[namespace][key] = value;
  }
  return snapshot;
}

function exportPayload(adapterId, durability, snapshot) {
  return `${JSON.stringify({
    schemaVersion: `${COMPANION_BACKEND_CONTRACT_VERSION}.persistence-snapshot`,
    adapterId,
    durable: true,
    durability,
    data: snapshot,
  }, null, 2)}\n`;
}

export function createSqliteCompanionPersistenceAdapter(options = {}) {
  const filename = String(options.filename || "").trim();
  if ((!options.database && (!filename || filename === ":memory:"))
    || (options.database && options.databaseDurable !== true)) {
    fail(COMPANION_BACKEND_ERROR_CODES.PERSISTENCE_FAKE_DURABLE,
      "SQLite companion persistence requires a file-backed filename, or an injected database with databaseDurable=true");
  }
  const adapterId = String(options.adapterId || "sqlite-companion-persistence-v1");
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();
  const codec = durableCodec(options, "SQLite");
  const database = options.database || new DatabaseSync(filename);
  const ownsDatabase = !options.database;
  let closed = false;

  database.exec("PRAGMA foreign_keys = ON");
  database.exec("PRAGMA journal_mode = WAL");
  database.exec("PRAGMA synchronous = FULL");
  database.exec(`
    CREATE TABLE IF NOT EXISTS sc_companion_values (
      namespace TEXT NOT NULL,
      entry_key TEXT NOT NULL,
      value_cipher TEXT NOT NULL,
      value_hash TEXT NOT NULL,
      updated_at_audit TEXT NOT NULL,
      PRIMARY KEY (namespace, entry_key)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS sc_companion_checkpoints (
      checkpoint_id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      snapshot_cipher TEXT NOT NULL,
      created_at_audit TEXT NOT NULL
    ) STRICT;
  `);

  const selectValue = database.prepare(`
    SELECT value_cipher, value_hash
      FROM sc_companion_values WHERE namespace = ? AND entry_key = ?
  `);
  const selectNamespace = database.prepare(`
    SELECT entry_key FROM sc_companion_values WHERE namespace = ? ORDER BY entry_key
  `);
  const selectAll = database.prepare(`
    SELECT namespace, entry_key, value_cipher, value_hash
      FROM sc_companion_values ORDER BY namespace, entry_key
  `);
  const upsertValue = database.prepare(`
    INSERT INTO sc_companion_values (
      namespace, entry_key, value_cipher, value_hash, updated_at_audit
    ) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(namespace, entry_key) DO UPDATE SET
      value_cipher = excluded.value_cipher,
      value_hash = excluded.value_hash,
      updated_at_audit = excluded.updated_at_audit
  `);

  function ensureOpen() {
    if (closed) fail(COMPANION_BACKEND_ERROR_CODES.PERSISTENCE_CLOSED,
      `persistence adapter is closed: ${adapterId}`);
  }

  function readSnapshot() {
    return snapshotFromRows(selectAll.all(), (cipher, aad) => codec.decode(cipher, aad));
  }

  async function put(namespaceInput, keyInput, value) {
    ensureOpen();
    const namespace = identity(namespaceInput, "namespace");
    const key = identity(keyInput, "key");
    if (value === undefined) {
      fail(COMPANION_BACKEND_ERROR_CODES.PACKAGE_INVALID,
        "durable companion persistence cannot store undefined; use null or delete the key");
    }
    const stored = clone(value);
    const valueHash = hashStarcraftTmgContract(stored === undefined ? null : stored);
    upsertValue.run(namespace, key, codec.encode(stored, context(namespace, key)), valueHash, now());
    return deepFreeze({ ok: true, namespace, key, valueHash, durable: true });
  }

  async function get(namespaceInput, keyInput) {
    ensureOpen();
    const namespace = identity(namespaceInput, "namespace");
    const key = identity(keyInput, "key");
    const row = selectValue.get(namespace, key);
    if (!row) return deepFreeze({ ok: true, found: false, value: undefined, durable: true });
    const value = codec.decode(row.value_cipher, context(namespace, key));
    if (hashStarcraftTmgContract(value === undefined ? null : value) !== row.value_hash) {
      fail(COMPANION_BACKEND_ERROR_CODES.CONTRACT_INTEGRITY_MISMATCH,
        `companion persistence value integrity mismatch: ${namespace}/${key}`);
    }
    return deepFreeze({ ok: true, found: true, value: clone(value), durable: true });
  }

  async function deleteEntry(namespaceInput, keyInput) {
    ensureOpen();
    const namespace = identity(namespaceInput, "namespace");
    const key = identity(keyInput, "key");
    const result = database.prepare(
      "DELETE FROM sc_companion_values WHERE namespace = ? AND entry_key = ?",
    ).run(namespace, key);
    return deepFreeze({ ok: true, deleted: Number(result.changes) === 1, durable: true });
  }

  async function list(namespaceInput, filter = {}) {
    ensureOpen();
    const namespace = identity(namespaceInput, "namespace");
    const prefix = filter.prefix === undefined ? null : String(filter.prefix);
    return deepFreeze(selectNamespace.all(namespace)
      .map((row) => String(row.entry_key))
      .filter((key) => prefix === null || key.startsWith(prefix)));
  }

  async function checkpoint(label = "") {
    ensureOpen();
    const snapshot = readSnapshot();
    const contentHash = snapshotHash(snapshot);
    const checkpointId = `ckpt-${adapterId}-${randomUUID()}`;
    database.prepare(`
      INSERT INTO sc_companion_checkpoints (
        checkpoint_id, label, content_hash, snapshot_cipher, created_at_audit
      ) VALUES (?, ?, ?, ?, ?)
    `).run(
      checkpointId,
      String(label || ""),
      contentHash,
      codec.encode(snapshot, `companion:checkpoint:${checkpointId}`),
      now(),
    );
    return deepFreeze({ ok: true, checkpointId, contentHash, durable: true });
  }

  async function restore(checkpointIdInput) {
    ensureOpen();
    const checkpointId = identity(checkpointIdInput, "checkpointId");
    const row = database.prepare(`
      SELECT content_hash, snapshot_cipher FROM sc_companion_checkpoints
       WHERE checkpoint_id = ?
    `).get(checkpointId);
    if (!row) return deepFreeze({
      ok: false,
      reason: "checkpoint_not_found",
      checkpointId,
      durable: true,
    });
    const snapshot = codec.decode(row.snapshot_cipher, `companion:checkpoint:${checkpointId}`);
    if (snapshotHash(snapshot) !== row.content_hash) {
      fail(COMPANION_BACKEND_ERROR_CODES.CONTRACT_INTEGRITY_MISMATCH,
        `checkpoint integrity mismatch: ${checkpointId}`);
    }
    try {
      database.exec("BEGIN IMMEDIATE");
      database.exec("DELETE FROM sc_companion_values");
      for (const [namespace, bucket] of Object.entries(snapshot)) {
        for (const [key, value] of Object.entries(bucket)) {
          const valueHash = hashStarcraftTmgContract(value === undefined ? null : value);
          upsertValue.run(namespace, key, codec.encode(value, context(namespace, key)), valueHash, now());
        }
      }
      database.exec("COMMIT");
    } catch (error) {
      try { database.exec("ROLLBACK"); } catch {}
      throw error;
    }
    return deepFreeze({ ok: true, checkpointId, contentHash: row.content_hash, durable: true });
  }

  async function exportSnapshot() {
    ensureOpen();
    return exportPayload(adapterId, "sqlite_wal_file", readSnapshot());
  }

  async function close() {
    if (!closed && ownsDatabase) database.close();
    closed = true;
    return deepFreeze({ ok: true, durable: true });
  }

  return Object.freeze({
    portId: COMPANION_PERSISTENCE_PORT_V1.portId,
    adapterId,
    durable: true,
    durability: "sqlite_wal_file",
    get,
    put,
    delete: deleteEntry,
    list,
    checkpoint,
    restore,
    exportSnapshot,
    close,
  });
}

function requirePool(pool) {
  if (!pool || typeof pool.connect !== "function" || typeof pool.query !== "function") {
    fail(COMPANION_BACKEND_ERROR_CODES.PORT_CONFORMANCE_FAILURE,
      "PostgreSQL companion persistence requires an injected pool with connect() and query()");
  }
  return pool;
}

export function createPostgresCompanionPersistenceAdapter(options = {}) {
  const pool = requirePool(options.pool);
  const adapterId = String(options.adapterId || "postgres-companion-persistence-v1");
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();
  const codec = durableCodec(options, "PostgreSQL");
  let closed = false;
  const ready = pool.query(`
    CREATE TABLE IF NOT EXISTS sc_companion_values (
      namespace TEXT NOT NULL,
      entry_key TEXT NOT NULL,
      value_cipher TEXT NOT NULL,
      value_hash TEXT NOT NULL,
      updated_at_audit TEXT NOT NULL,
      PRIMARY KEY (namespace, entry_key)
    );
    CREATE TABLE IF NOT EXISTS sc_companion_checkpoints (
      checkpoint_id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      snapshot_cipher TEXT NOT NULL,
      created_at_audit TEXT NOT NULL
    );
  `);

  function ensureOpen() {
    if (closed) fail(COMPANION_BACKEND_ERROR_CODES.PERSISTENCE_CLOSED,
      `persistence adapter is closed: ${adapterId}`);
  }

  async function initialized() {
    ensureOpen();
    await ready;
  }

  async function readSnapshot(executor = pool) {
    const result = await executor.query(`
      SELECT namespace, entry_key, value_cipher, value_hash
        FROM sc_companion_values ORDER BY namespace, entry_key
    `);
    return snapshotFromRows(result.rows, (cipher, aad) => codec.decode(cipher, aad));
  }

  async function put(namespaceInput, keyInput, value) {
    await initialized();
    const namespace = identity(namespaceInput, "namespace");
    const key = identity(keyInput, "key");
    if (value === undefined) {
      fail(COMPANION_BACKEND_ERROR_CODES.PACKAGE_INVALID,
        "durable companion persistence cannot store undefined; use null or delete the key");
    }
    const stored = clone(value);
    const valueHash = hashStarcraftTmgContract(stored === undefined ? null : stored);
    await pool.query(`
      INSERT INTO sc_companion_values (
        namespace, entry_key, value_cipher, value_hash, updated_at_audit
      ) VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT(namespace, entry_key) DO UPDATE SET
        value_cipher = EXCLUDED.value_cipher,
        value_hash = EXCLUDED.value_hash,
        updated_at_audit = EXCLUDED.updated_at_audit
    `, [namespace, key, codec.encode(stored, context(namespace, key)), valueHash, now()]);
    return deepFreeze({ ok: true, namespace, key, valueHash, durable: true });
  }

  async function get(namespaceInput, keyInput) {
    await initialized();
    const namespace = identity(namespaceInput, "namespace");
    const key = identity(keyInput, "key");
    const result = await pool.query(`
      SELECT value_cipher, value_hash FROM sc_companion_values
       WHERE namespace = $1 AND entry_key = $2
    `, [namespace, key]);
    const row = result.rows[0];
    if (!row) return deepFreeze({ ok: true, found: false, value: undefined, durable: true });
    const value = codec.decode(row.value_cipher, context(namespace, key));
    if (hashStarcraftTmgContract(value === undefined ? null : value) !== row.value_hash) {
      fail(COMPANION_BACKEND_ERROR_CODES.CONTRACT_INTEGRITY_MISMATCH,
        `companion persistence value integrity mismatch: ${namespace}/${key}`);
    }
    return deepFreeze({ ok: true, found: true, value: clone(value), durable: true });
  }

  async function deleteEntry(namespaceInput, keyInput) {
    await initialized();
    const namespace = identity(namespaceInput, "namespace");
    const key = identity(keyInput, "key");
    const result = await pool.query(
      "DELETE FROM sc_companion_values WHERE namespace = $1 AND entry_key = $2",
      [namespace, key],
    );
    return deepFreeze({ ok: true, deleted: Number(result.rowCount) === 1, durable: true });
  }

  async function list(namespaceInput, filter = {}) {
    await initialized();
    const namespace = identity(namespaceInput, "namespace");
    const prefix = filter.prefix === undefined ? null : String(filter.prefix);
    const result = await pool.query(
      "SELECT entry_key FROM sc_companion_values WHERE namespace = $1 ORDER BY entry_key",
      [namespace],
    );
    return deepFreeze(result.rows.map((row) => String(row.entry_key))
      .filter((key) => prefix === null || key.startsWith(prefix)));
  }

  async function checkpoint(label = "") {
    await initialized();
    const client = await pool.connect();
    const checkpointId = `ckpt-${adapterId}-${randomUUID()}`;
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      const snapshot = await readSnapshot(client);
      const contentHash = snapshotHash(snapshot);
      await client.query(`
        INSERT INTO sc_companion_checkpoints (
          checkpoint_id, label, content_hash, snapshot_cipher, created_at_audit
        ) VALUES ($1,$2,$3,$4,$5)
      `, [
        checkpointId,
        String(label || ""),
        contentHash,
        codec.encode(snapshot, `companion:checkpoint:${checkpointId}`),
        now(),
      ]);
      await client.query("COMMIT");
      return deepFreeze({ ok: true, checkpointId, contentHash, durable: true });
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      throw error;
    } finally {
      client.release();
    }
  }

  async function restore(checkpointIdInput) {
    await initialized();
    const checkpointId = identity(checkpointIdInput, "checkpointId");
    const client = await pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      const selected = await client.query(`
        SELECT content_hash, snapshot_cipher FROM sc_companion_checkpoints
         WHERE checkpoint_id = $1 FOR SHARE
      `, [checkpointId]);
      const row = selected.rows[0];
      if (!row) {
        await client.query("ROLLBACK");
        return deepFreeze({ ok: false, reason: "checkpoint_not_found", checkpointId, durable: true });
      }
      const snapshot = codec.decode(row.snapshot_cipher, `companion:checkpoint:${checkpointId}`);
      if (snapshotHash(snapshot) !== row.content_hash) {
        fail(COMPANION_BACKEND_ERROR_CODES.CONTRACT_INTEGRITY_MISMATCH,
          `checkpoint integrity mismatch: ${checkpointId}`);
      }
      await client.query("DELETE FROM sc_companion_values");
      for (const [namespace, bucket] of Object.entries(snapshot)) {
        for (const [key, value] of Object.entries(bucket)) {
          const valueHash = hashStarcraftTmgContract(value === undefined ? null : value);
          await client.query(`
            INSERT INTO sc_companion_values (
              namespace, entry_key, value_cipher, value_hash, updated_at_audit
            ) VALUES ($1,$2,$3,$4,$5)
          `, [namespace, key, codec.encode(value, context(namespace, key)), valueHash, now()]);
        }
      }
      await client.query("COMMIT");
      return deepFreeze({ ok: true, checkpointId, contentHash: row.content_hash, durable: true });
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      throw error;
    } finally {
      client.release();
    }
  }

  async function exportSnapshot() {
    await initialized();
    return exportPayload(adapterId, "postgresql_serializable", await readSnapshot());
  }

  async function close() {
    closed = true;
    return deepFreeze({ ok: true, durable: true });
  }

  return Object.freeze({
    portId: COMPANION_PERSISTENCE_PORT_V1.portId,
    adapterId,
    durable: true,
    durability: "postgresql_serializable",
    get,
    put,
    delete: deleteEntry,
    list,
    checkpoint,
    restore,
    exportSnapshot,
    close,
  });
}
