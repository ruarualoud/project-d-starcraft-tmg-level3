import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const STARCRAFT_TMG_ROOM_STORE_VERSION = "starcraft_tmg_room_store_v1";
export const STARCRAFT_TMG_ROOM_STORE_METHODS = Object.freeze([
  "createRoom",
  "loadRoom",
  "commit",
  "readJournal",
  "loadReplayBundle",
  "health",
]);

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function cloneRoomStoreValue(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function nonEmpty(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

function integer(value, field) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 0) throw new Error(`${field} must be a non-negative safe integer`);
  return normalized;
}

function expectedCounters(aggregate) {
  return {
    roomRevision: integer(aggregate.roomRevision, "aggregate.roomRevision"),
    stateRevision: integer(aggregate.stateRevision, "aggregate.stateRevision"),
    privateJournalSequence: integer(aggregate.privateJournalSequence, "aggregate.privateJournalSequence"),
    publicJournalSequence: integer(aggregate.publicJournalSequence, "aggregate.publicJournalSequence"),
    seatRecoveryRevision: integer(aggregate.seatRecoveryRevision, "aggregate.seatRecoveryRevision"),
  };
}

export function assertStarcraftTmgRoomStore(store) {
  for (const method of STARCRAFT_TMG_ROOM_STORE_METHODS) {
    if (!store || typeof store[method] !== "function") throw new Error(`RoomStore.${method} is required`);
  }
  return store;
}

function normalizedEncryptionKey(value) {
  if (Buffer.isBuffer(value) && value.length === 32) return Buffer.from(value);
  if (value instanceof Uint8Array && value.byteLength === 32) return Buffer.from(value);
  if (typeof value === "string" && value.trim()) {
    const decoded = Buffer.from(value, "base64");
    if (decoded.length === 32) return decoded;
  }
  return randomBytes(32);
}

export function createStarcraftTmgPrivatePayloadCodec(options = {}) {
  const key = normalizedEncryptionKey(options.key);
  const keyFingerprint = createHash("sha256").update(key).digest("hex");
  const keyId = String(options.keyId || `sc-room-data-${keyFingerprint.slice(0, 20)}`);
  const trustLevel = String(options.trustLevel || (options.key ? "externally_managed" : "development_ephemeral"));

  function encode(value, aadIdentity) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const aad = Buffer.from(String(aadIdentity || "starcraft-tmg-private-payload"), "utf8");
    cipher.setAAD(aad);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return JSON.stringify({
      schemaVersion: "starcraft_tmg_aes_256_gcm_payload_v1",
      keyId,
      algorithm: "aes-256-gcm",
      iv: iv.toString("base64url"),
      tag: tag.toString("base64url"),
      ciphertext: ciphertext.toString("base64url"),
    });
  }

  function decode(encoded, aadIdentity) {
    const payload = typeof encoded === "string" ? JSON.parse(encoded) : encoded;
    if (!object(payload)
      || payload.schemaVersion !== "starcraft_tmg_aes_256_gcm_payload_v1"
      || payload.keyId !== keyId
      || payload.algorithm !== "aes-256-gcm") throw new Error("private payload encryption metadata is invalid");
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64url"));
    decipher.setAAD(Buffer.from(String(aadIdentity || "starcraft-tmg-private-payload"), "utf8"));
    decipher.setAuthTag(Buffer.from(payload.tag, "base64url"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, "base64url")),
      decipher.final(),
    ]);
    return JSON.parse(plaintext.toString("utf8"));
  }

  return Object.freeze({
    descriptor: Object.freeze({
      schemaVersion: "starcraft_tmg_private_payload_codec_v1",
      algorithm: "aes-256-gcm",
      keyId,
      trustLevel,
      productionReady: trustLevel !== "development_ephemeral",
    }),
    encode,
    decode,
  });
}

function validateCreationBundle(bundle) {
  if (!object(bundle) || !object(bundle.aggregate) || !object(bundle.initialEnvelope)) throw new Error("RoomStore creation bundle is invalid");
  const roomId = nonEmpty(bundle.roomId || bundle.aggregate.roomId, "roomId");
  const counters = expectedCounters(bundle.aggregate);
  const privateEvents = Array.isArray(bundle.privateEvents) ? bundle.privateEvents : [];
  const publicEvents = Array.isArray(bundle.publicEvents) ? bundle.publicEvents : [];
  const recoveryUpdates = Array.isArray(bundle.recoveryUpdates) ? bundle.recoveryUpdates : [];
  if (counters.roomRevision !== 0 || counters.stateRevision !== 0
    || counters.privateJournalSequence !== privateEvents.length
    || counters.publicJournalSequence !== publicEvents.length
    || counters.seatRecoveryRevision !== recoveryUpdates.length) {
    throw new Error("new room counters must exactly match the atomic creation ledgers");
  }
  return { roomId, counters, privateEvents, publicEvents, recoveryUpdates };
}

function validateCommitBundle(current, expected, bundle) {
  if (!object(expected) || !object(bundle) || !object(bundle.nextAggregate)) throw new Error("RoomStore commit bundle is invalid");
  const observed = expectedCounters(current);
  const compare = {
    roomRevision: integer(expected.roomRevision, "expected.roomRevision"),
    stateRevision: integer(expected.stateRevision, "expected.stateRevision"),
  };
  if (compare.roomRevision !== observed.roomRevision || compare.stateRevision !== observed.stateRevision) {
    const error = new Error("RoomStore compare-and-swap conflict");
    error.code = "REVISION_CONFLICT";
    error.observed = observed;
    throw error;
  }
  const privateEvents = Array.isArray(bundle.privateEvents) ? bundle.privateEvents : [];
  const publicEvents = Array.isArray(bundle.publicEvents) ? bundle.publicEvents : [];
  const recoveryUpdates = Array.isArray(bundle.recoveryUpdates) ? bundle.recoveryUpdates : [];
  const next = expectedCounters(bundle.nextAggregate);
  if (next.roomRevision !== observed.roomRevision + 1
    || next.stateRevision < observed.stateRevision
    || next.stateRevision > observed.stateRevision + 1
    || next.privateJournalSequence !== observed.privateJournalSequence + privateEvents.length
    || next.publicJournalSequence !== observed.publicJournalSequence + publicEvents.length
    || next.seatRecoveryRevision !== observed.seatRecoveryRevision + recoveryUpdates.length) {
    throw new Error("RoomStore atomic bundle counters do not match its writes");
  }
  return { observed, next, privateEvents, publicEvents, recoveryUpdates };
}

export function createInMemoryStarcraftTmgRoomStore(options = {}) {
  const rooms = new Map();
  const adapterId = String(options.adapterId || "in-memory-room-store-v1");

  async function createRoom(bundle) {
    const { roomId, privateEvents, publicEvents, recoveryUpdates } = validateCreationBundle(bundle);
    if (rooms.has(roomId)) {
      const error = new Error("room already exists");
      error.code = "ROOM_ALREADY_EXISTS";
      throw error;
    }
    rooms.set(roomId, {
      aggregate: cloneRoomStoreValue(bundle.aggregate),
      initialEnvelope: cloneRoomStoreValue(bundle.initialEnvelope),
      privateJournal: privateEvents.map((payload, index) => ({ sequence: index + 1, payload: cloneRoomStoreValue(payload) })),
      publicJournal: publicEvents.map((payload, index) => ({ sequence: index + 1, payload: cloneRoomStoreValue(payload) })),
      recovery: recoveryUpdates.map((payload, index) => ({ revision: index + 1, seatKey: String(payload.seatKey || ""), payload: cloneRoomStoreValue(payload) })),
      idempotency: new Map(),
      checkpoints: [],
    });
    return cloneRoomStoreValue(bundle.aggregate);
  }

  async function loadRoom(roomId) {
    const record = rooms.get(String(roomId || ""));
    return record ? cloneRoomStoreValue(record.aggregate) : null;
  }

  async function commit(roomId, expected, bundle) {
    const record = rooms.get(String(roomId || ""));
    if (!record) {
      const error = new Error("room not found");
      error.code = "ROOM_NOT_FOUND";
      throw error;
    }
    const validated = validateCommitBundle(record.aggregate, expected, bundle);
    for (const item of bundle.idempotencyRecords || []) {
      const existing = record.idempotency.get(item.keyHash);
      if (existing && JSON.stringify(existing) !== JSON.stringify(item.result)) {
        const error = new Error("idempotency identity already has another result");
        error.code = "IDEMPOTENCY_CONFLICT";
        throw error;
      }
    }
    validated.privateEvents.forEach((payload, index) => record.privateJournal.push({
      sequence: validated.observed.privateJournalSequence + index + 1,
      payload: cloneRoomStoreValue(payload),
    }));
    validated.publicEvents.forEach((payload, index) => record.publicJournal.push({
      sequence: validated.observed.publicJournalSequence + index + 1,
      payload: cloneRoomStoreValue(payload),
    }));
    validated.recoveryUpdates.forEach((payload, index) => record.recovery.push({
      revision: validated.observed.seatRecoveryRevision + index + 1,
      seatKey: String(payload.seatKey || ""),
      payload: cloneRoomStoreValue(payload),
    }));
    for (const item of bundle.idempotencyRecords || []) record.idempotency.set(item.keyHash, cloneRoomStoreValue(item.result));
    if (bundle.checkpoint) record.checkpoints.push(cloneRoomStoreValue(bundle.checkpoint));
    record.aggregate = cloneRoomStoreValue(bundle.nextAggregate);
    return cloneRoomStoreValue(record.aggregate);
  }

  async function readJournal(roomId, view = "public", cursor = 0) {
    const record = rooms.get(String(roomId || ""));
    if (!record) return null;
    const minimum = integer(cursor, "cursor");
    if (view === "private") return cloneRoomStoreValue(record.privateJournal.filter((entry) => entry.sequence > minimum));
    if (view === "public") return cloneRoomStoreValue(record.publicJournal.filter((entry) => entry.sequence > minimum));
    if (view === "seat_recovery") return cloneRoomStoreValue(record.recovery.filter((entry) => entry.revision > minimum));
    throw new Error(`unsupported journal view: ${view}`);
  }

  async function loadReplayBundle(roomId) {
    const record = rooms.get(String(roomId || ""));
    if (!record) return null;
    return cloneRoomStoreValue({
      initialEnvelope: record.initialEnvelope,
      latestCheckpoint: record.checkpoints.at(-1) || null,
      privateJournal: record.privateJournal,
      currentAggregate: record.aggregate,
    });
  }

  async function health() {
    return {
      schemaVersion: `${STARCRAFT_TMG_ROOM_STORE_VERSION}.health`,
      healthy: true,
      adapter: "memory",
      adapterId,
      roomCount: rooms.size,
      atomicCasContract: STARCRAFT_TMG_ROOM_STORE_VERSION,
      durability: "process_memory_test_only",
      productionReady: false,
    };
  }

  return assertStarcraftTmgRoomStore(Object.freeze({ createRoom, loadRoom, commit, readJournal, loadReplayBundle, health }));
}
