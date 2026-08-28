import { DatabaseSync } from "node:sqlite";
import {
  STARCRAFT_TMG_ROOM_STORE_VERSION,
  assertStarcraftTmgRoomStore,
  cloneRoomStoreValue,
  createStarcraftTmgPrivatePayloadCodec,
} from "./room-store-v1.mjs";

function integer(value, field) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 0) throw new Error(`${field} must be a non-negative safe integer`);
  return normalized;
}

function counters(aggregate) {
  return {
    roomRevision: integer(aggregate.roomRevision, "aggregate.roomRevision"),
    stateRevision: integer(aggregate.stateRevision, "aggregate.stateRevision"),
    privateJournalSequence: integer(aggregate.privateJournalSequence, "aggregate.privateJournalSequence"),
    publicJournalSequence: integer(aggregate.publicJournalSequence, "aggregate.publicJournalSequence"),
    seatRecoveryRevision: integer(aggregate.seatRecoveryRevision, "aggregate.seatRecoveryRevision"),
  };
}

function parsePublic(value) {
  return JSON.parse(String(value));
}

export function createSqliteStarcraftTmgRoomStore(options = {}) {
  const filename = String(options.filename || ":memory:");
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();
  const codec = options.privatePayloadCodec || createStarcraftTmgPrivatePayloadCodec(options.encryption || {});
  const database = options.database || new DatabaseSync(filename);
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("PRAGMA journal_mode = WAL");
  database.exec("PRAGMA synchronous = FULL");
  database.exec(`
    CREATE TABLE IF NOT EXISTS sc_rooms (
      room_id TEXT PRIMARY KEY,
      room_revision INTEGER NOT NULL,
      state_revision INTEGER NOT NULL,
      private_sequence INTEGER NOT NULL,
      public_sequence INTEGER NOT NULL,
      recovery_revision INTEGER NOT NULL,
      aggregate_cipher TEXT NOT NULL,
      initial_envelope_cipher TEXT NOT NULL,
      created_at_audit TEXT NOT NULL,
      updated_at_audit TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS sc_private_journal (
      room_id TEXT NOT NULL REFERENCES sc_rooms(room_id) ON DELETE RESTRICT,
      sequence INTEGER NOT NULL,
      payload_cipher TEXT NOT NULL,
      PRIMARY KEY (room_id, sequence)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS sc_public_journal (
      room_id TEXT NOT NULL REFERENCES sc_rooms(room_id) ON DELETE RESTRICT,
      sequence INTEGER NOT NULL,
      payload_json TEXT NOT NULL,
      PRIMARY KEY (room_id, sequence)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS sc_seat_recovery (
      room_id TEXT NOT NULL REFERENCES sc_rooms(room_id) ON DELETE RESTRICT,
      recovery_revision INTEGER NOT NULL,
      seat_key TEXT NOT NULL,
      payload_cipher TEXT NOT NULL,
      PRIMARY KEY (room_id, recovery_revision)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS sc_idempotency (
      room_id TEXT NOT NULL REFERENCES sc_rooms(room_id) ON DELETE RESTRICT,
      key_hash TEXT NOT NULL,
      result_cipher TEXT NOT NULL,
      PRIMARY KEY (room_id, key_hash)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS sc_checkpoints (
      room_id TEXT NOT NULL REFERENCES sc_rooms(room_id) ON DELETE RESTRICT,
      state_revision INTEGER NOT NULL,
      private_sequence INTEGER NOT NULL,
      checkpoint_cipher TEXT NOT NULL,
      checkpoint_hash TEXT NOT NULL,
      PRIMARY KEY (room_id, state_revision)
    ) STRICT;
  `);

  const selectRoom = database.prepare(`
    SELECT room_id, room_revision, state_revision, private_sequence, public_sequence,
           recovery_revision, aggregate_cipher, initial_envelope_cipher
      FROM sc_rooms WHERE room_id = ?
  `);

  function decodeAggregate(row) {
    return codec.decode(row.aggregate_cipher, `room:${row.room_id}:aggregate`);
  }

  async function createRoom(bundle = {}) {
    const roomId = String(bundle.roomId || bundle.aggregate?.roomId || "").trim();
    if (!roomId || !bundle.aggregate || !bundle.initialEnvelope) throw new Error("RoomStore creation bundle is invalid");
    const initial = counters(bundle.aggregate);
    const privateEvents = Array.isArray(bundle.privateEvents) ? bundle.privateEvents : [];
    const publicEvents = Array.isArray(bundle.publicEvents) ? bundle.publicEvents : [];
    const recoveryUpdates = Array.isArray(bundle.recoveryUpdates) ? bundle.recoveryUpdates : [];
    if (initial.roomRevision !== 0 || initial.stateRevision !== 0
      || initial.privateJournalSequence !== privateEvents.length
      || initial.publicJournalSequence !== publicEvents.length
      || initial.seatRecoveryRevision !== recoveryUpdates.length) {
      throw new Error("new room counters must exactly match the atomic creation ledgers");
    }
    const auditTime = now();
    try {
      database.exec("BEGIN IMMEDIATE");
      database.prepare(`
        INSERT INTO sc_rooms (
          room_id, room_revision, state_revision, private_sequence, public_sequence,
          recovery_revision, aggregate_cipher, initial_envelope_cipher, created_at_audit, updated_at_audit
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        roomId,
        initial.roomRevision,
        initial.stateRevision,
        initial.privateJournalSequence,
        initial.publicJournalSequence,
        initial.seatRecoveryRevision,
        codec.encode(bundle.aggregate, `room:${roomId}:aggregate`),
        codec.encode(bundle.initialEnvelope, `room:${roomId}:initial-envelope`),
        auditTime,
        auditTime,
      );
      const insertPrivate = database.prepare("INSERT INTO sc_private_journal (room_id, sequence, payload_cipher) VALUES (?, ?, ?)");
      privateEvents.forEach((payload, index) => {
        const sequence = index + 1;
        insertPrivate.run(roomId, sequence, codec.encode(payload, `room:${roomId}:private:${sequence}`));
      });
      const insertPublic = database.prepare("INSERT INTO sc_public_journal (room_id, sequence, payload_json) VALUES (?, ?, ?)");
      publicEvents.forEach((payload, index) => insertPublic.run(roomId, index + 1, JSON.stringify(payload)));
      const insertRecovery = database.prepare("INSERT INTO sc_seat_recovery (room_id, recovery_revision, seat_key, payload_cipher) VALUES (?, ?, ?, ?)");
      recoveryUpdates.forEach((payload, index) => {
        const revision = index + 1;
        insertRecovery.run(roomId, revision, String(payload.seatKey || ""), codec.encode(payload, `room:${roomId}:recovery:${revision}`));
      });
      database.exec("COMMIT");
      return cloneRoomStoreValue(bundle.aggregate);
    } catch (error) {
      try { database.exec("ROLLBACK"); } catch {}
      if (String(error?.message || "").includes("UNIQUE constraint failed")) error.code = "ROOM_ALREADY_EXISTS";
      throw error;
    }
  }

  async function loadRoom(roomId) {
    const row = selectRoom.get(String(roomId || ""));
    return row ? decodeAggregate(row) : null;
  }

  async function commit(roomIdInput, expected = {}, bundle = {}) {
    const roomId = String(roomIdInput || "");
    try {
      database.exec("BEGIN IMMEDIATE");
      const row = selectRoom.get(roomId);
      if (!row) {
        const error = new Error("room not found");
        error.code = "ROOM_NOT_FOUND";
        throw error;
      }
      const currentAggregate = decodeAggregate(row);
      const observed = counters(currentAggregate);
      const expectedRoomRevision = integer(expected.roomRevision, "expected.roomRevision");
      const expectedStateRevision = integer(expected.stateRevision, "expected.stateRevision");
      if (observed.roomRevision !== expectedRoomRevision || observed.stateRevision !== expectedStateRevision) {
        const error = new Error("RoomStore compare-and-swap conflict");
        error.code = "REVISION_CONFLICT";
        error.observed = observed;
        throw error;
      }
      const privateEvents = Array.isArray(bundle.privateEvents) ? bundle.privateEvents : [];
      const publicEvents = Array.isArray(bundle.publicEvents) ? bundle.publicEvents : [];
      const recoveryUpdates = Array.isArray(bundle.recoveryUpdates) ? bundle.recoveryUpdates : [];
      const next = counters(bundle.nextAggregate || {});
      if (next.roomRevision !== observed.roomRevision + 1
        || next.stateRevision < observed.stateRevision
        || next.stateRevision > observed.stateRevision + 1
        || next.privateJournalSequence !== observed.privateJournalSequence + privateEvents.length
        || next.publicJournalSequence !== observed.publicJournalSequence + publicEvents.length
        || next.seatRecoveryRevision !== observed.seatRecoveryRevision + recoveryUpdates.length) {
        throw new Error("RoomStore atomic bundle counters do not match its writes");
      }
      const insertPrivate = database.prepare("INSERT INTO sc_private_journal (room_id, sequence, payload_cipher) VALUES (?, ?, ?)");
      privateEvents.forEach((payload, index) => {
        const sequence = observed.privateJournalSequence + index + 1;
        insertPrivate.run(roomId, sequence, codec.encode(payload, `room:${roomId}:private:${sequence}`));
      });
      const insertPublic = database.prepare("INSERT INTO sc_public_journal (room_id, sequence, payload_json) VALUES (?, ?, ?)");
      publicEvents.forEach((payload, index) => {
        insertPublic.run(roomId, observed.publicJournalSequence + index + 1, JSON.stringify(payload));
      });
      const insertRecovery = database.prepare("INSERT INTO sc_seat_recovery (room_id, recovery_revision, seat_key, payload_cipher) VALUES (?, ?, ?, ?)");
      recoveryUpdates.forEach((payload, index) => {
        const revision = observed.seatRecoveryRevision + index + 1;
        insertRecovery.run(roomId, revision, String(payload.seatKey || ""), codec.encode(payload, `room:${roomId}:recovery:${revision}`));
      });
      const selectIdempotency = database.prepare("SELECT result_cipher FROM sc_idempotency WHERE room_id = ? AND key_hash = ?");
      const insertIdempotency = database.prepare("INSERT INTO sc_idempotency (room_id, key_hash, result_cipher) VALUES (?, ?, ?)");
      for (const item of bundle.idempotencyRecords || []) {
        const existing = selectIdempotency.get(roomId, item.keyHash);
        if (existing) {
          const existingResult = codec.decode(existing.result_cipher, `room:${roomId}:idempotency:${item.keyHash}`);
          if (JSON.stringify(existingResult) !== JSON.stringify(item.result)) {
            const error = new Error("idempotency identity already has another result");
            error.code = "IDEMPOTENCY_CONFLICT";
            throw error;
          }
        } else {
          insertIdempotency.run(roomId, item.keyHash, codec.encode(item.result, `room:${roomId}:idempotency:${item.keyHash}`));
        }
      }
      if (bundle.checkpoint) {
        database.prepare(`
          INSERT INTO sc_checkpoints (room_id, state_revision, private_sequence, checkpoint_cipher, checkpoint_hash)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          roomId,
          next.stateRevision,
          next.privateJournalSequence,
          codec.encode(bundle.checkpoint, `room:${roomId}:checkpoint:${next.stateRevision}`),
          String(bundle.checkpoint.checkpointHash || ""),
        );
      }
      const updated = database.prepare(`
        UPDATE sc_rooms
           SET room_revision = ?, state_revision = ?, private_sequence = ?, public_sequence = ?,
               recovery_revision = ?, aggregate_cipher = ?, updated_at_audit = ?
         WHERE room_id = ? AND room_revision = ? AND state_revision = ?
      `).run(
        next.roomRevision,
        next.stateRevision,
        next.privateJournalSequence,
        next.publicJournalSequence,
        next.seatRecoveryRevision,
        codec.encode(bundle.nextAggregate, `room:${roomId}:aggregate`),
        now(),
        roomId,
        observed.roomRevision,
        observed.stateRevision,
      );
      if (Number(updated.changes) !== 1) {
        const error = new Error("RoomStore compare-and-swap conflict");
        error.code = "REVISION_CONFLICT";
        throw error;
      }
      database.exec("COMMIT");
      return cloneRoomStoreValue(bundle.nextAggregate);
    } catch (error) {
      try { database.exec("ROLLBACK"); } catch {}
      throw error;
    }
  }

  async function readJournal(roomIdInput, view = "public", cursor = 0) {
    const roomId = String(roomIdInput || "");
    const minimum = integer(cursor, "cursor");
    if (!selectRoom.get(roomId)) return null;
    if (view === "public") {
      return database.prepare("SELECT sequence, payload_json FROM sc_public_journal WHERE room_id = ? AND sequence > ? ORDER BY sequence")
        .all(roomId, minimum)
        .map((row) => ({ sequence: Number(row.sequence), payload: parsePublic(row.payload_json) }));
    }
    if (view === "private") {
      return database.prepare("SELECT sequence, payload_cipher FROM sc_private_journal WHERE room_id = ? AND sequence > ? ORDER BY sequence")
        .all(roomId, minimum)
        .map((row) => ({ sequence: Number(row.sequence), payload: codec.decode(row.payload_cipher, `room:${roomId}:private:${row.sequence}`) }));
    }
    if (view === "seat_recovery") {
      return database.prepare("SELECT recovery_revision, seat_key, payload_cipher FROM sc_seat_recovery WHERE room_id = ? AND recovery_revision > ? ORDER BY recovery_revision")
        .all(roomId, minimum)
        .map((row) => ({
          revision: Number(row.recovery_revision),
          seatKey: row.seat_key,
          payload: codec.decode(row.payload_cipher, `room:${roomId}:recovery:${row.recovery_revision}`),
        }));
    }
    throw new Error(`unsupported journal view: ${view}`);
  }

  async function loadReplayBundle(roomIdInput) {
    const roomId = String(roomIdInput || "");
    const row = selectRoom.get(roomId);
    if (!row) return null;
    const checkpointRow = database.prepare(`
      SELECT state_revision, private_sequence, checkpoint_cipher, checkpoint_hash
        FROM sc_checkpoints WHERE room_id = ? ORDER BY state_revision DESC LIMIT 1
    `).get(roomId);
    const latestCheckpoint = checkpointRow
      ? codec.decode(checkpointRow.checkpoint_cipher, `room:${roomId}:checkpoint:${checkpointRow.state_revision}`)
      : null;
    const privateJournal = await readJournal(roomId, "private", 0);
    return {
      initialEnvelope: codec.decode(row.initial_envelope_cipher, `room:${roomId}:initial-envelope`),
      latestCheckpoint,
      privateJournal,
      currentAggregate: decodeAggregate(row),
    };
  }

  async function health() {
    const journalMode = String(database.prepare("PRAGMA journal_mode").get()?.journal_mode || "unknown").toLowerCase();
    const roomCount = Number(database.prepare("SELECT COUNT(*) AS count FROM sc_rooms").get()?.count || 0);
    return {
      schemaVersion: `${STARCRAFT_TMG_ROOM_STORE_VERSION}.health`,
      healthy: journalMode === "wal" || filename === ":memory:",
      adapter: "sqlite",
      filenameMode: filename === ":memory:" ? "memory" : "file",
      journalMode,
      roomCount,
      privatePayloadCodec: codec.descriptor,
      atomicCasContract: STARCRAFT_TMG_ROOM_STORE_VERSION,
      durability: filename === ":memory:" ? "sqlite_memory_test_only" : "sqlite_wal",
      productionReady: filename !== ":memory:" && codec.descriptor.productionReady,
    };
  }

  function close() {
    database.close();
  }

  return assertStarcraftTmgRoomStore(Object.freeze({ createRoom, loadRoom, commit, readJournal, loadReplayBundle, health, close }));
}
