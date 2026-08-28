import {
  STARCRAFT_TMG_ROOM_STORE_VERSION,
  assertStarcraftTmgRoomStore,
  cloneRoomStoreValue,
  createStarcraftTmgPrivatePayloadCodec,
} from "./room-store-v1.mjs";

export const STARCRAFT_TMG_POSTGRES_ROOM_STORE_CONTRACT = Object.freeze({
  schemaVersion: "starcraft_tmg_postgres_room_store_contract_v1",
  roomStoreContract: STARCRAFT_TMG_ROOM_STORE_VERSION,
  methods: ["createRoom", "loadRoom", "commit", "readJournal", "loadReplayBundle", "health"],
  transactionIsolation: "serializable",
  lock: "room_row_for_update",
  compareAndSwap: ["roomRevision", "stateRevision"],
  atomicWrites: ["aggregate", "privateJournal", "publicJournal", "seatRecovery", "idempotency", "checkpoint"],
  privatePayloadEncryption: "aes-256-gcm",
  silentCompatibility: false,
});

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

function requirePool(pool) {
  if (!pool || typeof pool.connect !== "function" || typeof pool.query !== "function") {
    throw new Error("PostgreSQL RoomStore requires an injected pool with connect() and query()");
  }
  return pool;
}

function decodePublic(value) {
  return typeof value === "string" ? JSON.parse(value) : cloneRoomStoreValue(value);
}

export function createPostgresStarcraftTmgRoomStore(options = {}) {
  const pool = requirePool(options.pool);
  const codec = options.privatePayloadCodec || createStarcraftTmgPrivatePayloadCodec(options.encryption || {});
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();

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
    const client = await pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      await client.query(`
        INSERT INTO sc_rooms (
          room_id, room_revision, state_revision, private_sequence, public_sequence,
          recovery_revision, aggregate_cipher, initial_envelope_cipher, created_at_audit, updated_at_audit
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
      `, [
        roomId,
        initial.roomRevision,
        initial.stateRevision,
        initial.privateJournalSequence,
        initial.publicJournalSequence,
        initial.seatRecoveryRevision,
        codec.encode(bundle.aggregate, `room:${roomId}:aggregate`),
        codec.encode(bundle.initialEnvelope, `room:${roomId}:initial-envelope`),
        now(),
      ]);
      for (const [index, payload] of privateEvents.entries()) {
        const sequence = index + 1;
        await client.query(
          "INSERT INTO sc_private_journal (room_id, sequence, payload_cipher) VALUES ($1,$2,$3)",
          [roomId, sequence, codec.encode(payload, `room:${roomId}:private:${sequence}`)],
        );
      }
      for (const [index, payload] of publicEvents.entries()) {
        await client.query(
          "INSERT INTO sc_public_journal (room_id, sequence, payload_json) VALUES ($1,$2,$3::jsonb)",
          [roomId, index + 1, JSON.stringify(payload)],
        );
      }
      for (const [index, payload] of recoveryUpdates.entries()) {
        const revision = index + 1;
        await client.query(
          "INSERT INTO sc_seat_recovery (room_id, recovery_revision, seat_key, payload_cipher) VALUES ($1,$2,$3,$4)",
          [roomId, revision, String(payload.seatKey || ""), codec.encode(payload, `room:${roomId}:recovery:${revision}`)],
        );
      }
      await client.query("COMMIT");
      return cloneRoomStoreValue(bundle.aggregate);
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      if (error?.code === "23505") error.code = "ROOM_ALREADY_EXISTS";
      throw error;
    } finally {
      client.release();
    }
  }

  async function loadRoom(roomIdInput) {
    const roomId = String(roomIdInput || "");
    const result = await pool.query(`
      SELECT room_id, aggregate_cipher FROM sc_rooms WHERE room_id = $1
    `, [roomId]);
    return result.rows[0] ? decodeAggregate(result.rows[0]) : null;
  }

  async function commit(roomIdInput, expected = {}, bundle = {}) {
    const roomId = String(roomIdInput || "");
    const client = await pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      const selected = await client.query(`
        SELECT room_id, aggregate_cipher FROM sc_rooms WHERE room_id = $1 FOR UPDATE
      `, [roomId]);
      if (!selected.rows[0]) {
        const error = new Error("room not found");
        error.code = "ROOM_NOT_FOUND";
        throw error;
      }
      const currentAggregate = decodeAggregate(selected.rows[0]);
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
      for (const [index, payload] of privateEvents.entries()) {
        const sequence = observed.privateJournalSequence + index + 1;
        await client.query(
          "INSERT INTO sc_private_journal (room_id, sequence, payload_cipher) VALUES ($1,$2,$3)",
          [roomId, sequence, codec.encode(payload, `room:${roomId}:private:${sequence}`)],
        );
      }
      for (const [index, payload] of publicEvents.entries()) {
        await client.query(
          "INSERT INTO sc_public_journal (room_id, sequence, payload_json) VALUES ($1,$2,$3::jsonb)",
          [roomId, observed.publicJournalSequence + index + 1, JSON.stringify(payload)],
        );
      }
      for (const [index, payload] of recoveryUpdates.entries()) {
        const revision = observed.seatRecoveryRevision + index + 1;
        await client.query(
          "INSERT INTO sc_seat_recovery (room_id, recovery_revision, seat_key, payload_cipher) VALUES ($1,$2,$3,$4)",
          [roomId, revision, String(payload.seatKey || ""), codec.encode(payload, `room:${roomId}:recovery:${revision}`)],
        );
      }
      for (const item of bundle.idempotencyRecords || []) {
        const existing = await client.query(
          "SELECT result_cipher FROM sc_idempotency WHERE room_id = $1 AND key_hash = $2 FOR UPDATE",
          [roomId, item.keyHash],
        );
        if (existing.rows[0]) {
          const prior = codec.decode(existing.rows[0].result_cipher, `room:${roomId}:idempotency:${item.keyHash}`);
          if (JSON.stringify(prior) !== JSON.stringify(item.result)) {
            const error = new Error("idempotency identity already has another result");
            error.code = "IDEMPOTENCY_CONFLICT";
            throw error;
          }
        } else {
          await client.query(
            "INSERT INTO sc_idempotency (room_id, key_hash, result_cipher) VALUES ($1,$2,$3)",
            [roomId, item.keyHash, codec.encode(item.result, `room:${roomId}:idempotency:${item.keyHash}`)],
          );
        }
      }
      if (bundle.checkpoint) {
        await client.query(`
          INSERT INTO sc_checkpoints (room_id, state_revision, private_sequence, checkpoint_cipher, checkpoint_hash)
          VALUES ($1,$2,$3,$4,$5)
        `, [
          roomId,
          next.stateRevision,
          next.privateJournalSequence,
          codec.encode(bundle.checkpoint, `room:${roomId}:checkpoint:${next.stateRevision}`),
          String(bundle.checkpoint.checkpointHash || ""),
        ]);
      }
      const updated = await client.query(`
        UPDATE sc_rooms
           SET room_revision = $1, state_revision = $2, private_sequence = $3,
               public_sequence = $4, recovery_revision = $5, aggregate_cipher = $6,
               updated_at_audit = $7
         WHERE room_id = $8 AND room_revision = $9 AND state_revision = $10
      `, [
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
      ]);
      if (updated.rowCount !== 1) {
        const error = new Error("RoomStore compare-and-swap conflict");
        error.code = "REVISION_CONFLICT";
        throw error;
      }
      await client.query("COMMIT");
      return cloneRoomStoreValue(bundle.nextAggregate);
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      if (error?.code === "40001") error.code = "REVISION_CONFLICT";
      throw error;
    } finally {
      client.release();
    }
  }

  async function readJournal(roomIdInput, view = "public", cursor = 0) {
    const roomId = String(roomIdInput || "");
    const minimum = integer(cursor, "cursor");
    if (view === "public") {
      const result = await pool.query(
        "SELECT sequence, payload_json FROM sc_public_journal WHERE room_id = $1 AND sequence > $2 ORDER BY sequence",
        [roomId, minimum],
      );
      return result.rows.map((row) => ({ sequence: Number(row.sequence), payload: decodePublic(row.payload_json) }));
    }
    if (view === "private") {
      const result = await pool.query(
        "SELECT sequence, payload_cipher FROM sc_private_journal WHERE room_id = $1 AND sequence > $2 ORDER BY sequence",
        [roomId, minimum],
      );
      return result.rows.map((row) => ({
        sequence: Number(row.sequence),
        payload: codec.decode(row.payload_cipher, `room:${roomId}:private:${row.sequence}`),
      }));
    }
    if (view === "seat_recovery") {
      const result = await pool.query(`
        SELECT recovery_revision, seat_key, payload_cipher FROM sc_seat_recovery
         WHERE room_id = $1 AND recovery_revision > $2 ORDER BY recovery_revision
      `, [roomId, minimum]);
      return result.rows.map((row) => ({
        revision: Number(row.recovery_revision),
        seatKey: row.seat_key,
        payload: codec.decode(row.payload_cipher, `room:${roomId}:recovery:${row.recovery_revision}`),
      }));
    }
    throw new Error(`unsupported journal view: ${view}`);
  }

  async function loadReplayBundle(roomIdInput) {
    const roomId = String(roomIdInput || "");
    const room = await pool.query(`
      SELECT room_id, aggregate_cipher, initial_envelope_cipher FROM sc_rooms WHERE room_id = $1
    `, [roomId]);
    if (!room.rows[0]) return null;
    const checkpoint = await pool.query(`
      SELECT state_revision, checkpoint_cipher FROM sc_checkpoints
       WHERE room_id = $1 ORDER BY state_revision DESC LIMIT 1
    `, [roomId]);
    return {
      initialEnvelope: codec.decode(room.rows[0].initial_envelope_cipher, `room:${roomId}:initial-envelope`),
      latestCheckpoint: checkpoint.rows[0]
        ? codec.decode(checkpoint.rows[0].checkpoint_cipher, `room:${roomId}:checkpoint:${checkpoint.rows[0].state_revision}`)
        : null,
      privateJournal: await readJournal(roomId, "private", 0),
      currentAggregate: decodeAggregate(room.rows[0]),
    };
  }

  async function health() {
    const schema = await pool.query(`
      SELECT to_regclass('public.sc_rooms') AS rooms,
             to_regclass('public.sc_private_journal') AS private_journal,
             to_regclass('public.sc_public_journal') AS public_journal,
             to_regclass('public.sc_seat_recovery') AS seat_recovery
    `);
    const row = schema.rows[0] || {};
    const schemaReady = Boolean(row.rooms && row.private_journal && row.public_journal && row.seat_recovery);
    return {
      schemaVersion: `${STARCRAFT_TMG_ROOM_STORE_VERSION}.health`,
      healthy: schemaReady,
      adapter: "postgresql",
      schemaReady,
      privatePayloadCodec: codec.descriptor,
      atomicCasContract: STARCRAFT_TMG_ROOM_STORE_VERSION,
      transactionIsolation: "serializable_with_row_lock_and_revision_cas",
      durability: "postgresql",
      productionReady: schemaReady && codec.descriptor.productionReady,
    };
  }

  return assertStarcraftTmgRoomStore(Object.freeze({ createRoom, loadRoom, commit, readJournal, loadReplayBundle, health }));
}
