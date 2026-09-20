import { DatabaseSync } from "node:sqlite";

export const STARCRAFT_TMG_DURABLE_AGENT_ACTION_BOUNDARY_VERSION =
  "starcraft_tmg_durable_agent_action_boundary_v1";

function integer(value, field) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 0) {
    throw new TypeError(`${field} must be a non-negative safe integer`);
  }
  return normalized;
}

function readRoom(filename) {
  const database = new DatabaseSync(String(filename), { readOnly: true });
  try {
    const row = database.prepare(`
      SELECT room_id, room_revision, state_revision, updated_at_audit
        FROM sc_rooms
       LIMIT 1
    `).get();
    if (!row) throw new Error("DURABLE_ACTION_ROOM_RECORD_MISSING");
    const accepted = database.prepare(`
      SELECT COUNT(*) AS count
        FROM sc_public_journal
       WHERE json_extract(payload_json, '$.type') = 'accepted_transition'
    `).get();
    return {
      roomId: String(row.room_id),
      roomRevision: integer(row.room_revision, "room.roomRevision"),
      stateRevision: integer(row.state_revision, "room.stateRevision"),
      acceptedTransitionCount: integer(accepted?.count || 0,
        "room.acceptedTransitionCount"),
      updatedAt: String(row.updated_at_audit),
    };
  } finally {
    database.close();
  }
}

function readSeat(seatKey, filename) {
  const database = new DatabaseSync(String(filename), { readOnly: true });
  try {
    const row = database.prepare(`
      SELECT record_json
        FROM sc_hosted_bot_seat_records
       LIMIT 1
    `).get();
    if (!row) throw new Error(`DURABLE_ACTION_SEAT_RECORD_MISSING:${seatKey}`);
    const record = JSON.parse(String(row.record_json));
    return {
      seatKey: String(seatKey),
      actionCount: integer(record.actionCount || 0,
        `${seatKey}.actionCount`),
      replayVerifiedCount: integer(record.replayVerifiedCount || 0,
        `${seatKey}.replayVerifiedCount`),
      lastAppliedStateRevision: record.lastAppliedStateRevision === null
        || record.lastAppliedStateRevision === undefined ? null
        : integer(record.lastAppliedStateRevision,
          `${seatKey}.lastAppliedStateRevision`),
      lastReceiptHash: record.lastReceiptHash
        ? String(record.lastReceiptHash) : null,
      lastReplayMatchesCurrent: record.lastReplayMatchesCurrent === true,
      inflightStage: record.inflight?.stage
        ? String(record.inflight.stage) : null,
      inflightApplyPending: Boolean(record.inflight?.applyRequest),
      driveStatus: String(record.driveStatus || ""),
      updatedAt: String(record.updatedAt || ""),
    };
  } finally {
    database.close();
  }
}

export function readStarcraftTmgDurableAgentActionBoundaryV1(input = {}) {
  const previousStateRevision = integer(input.previousStateRevision || 0,
    "previousStateRevision");
  const previousActionCount = integer(input.previousActionCount || 0,
    "previousActionCount");
  const room = readRoom(input.roomDatabaseFilename);
  const seatEntries = Object.entries(input.seatDatabaseFilenames || {})
    .map(([seatKey, filename]) => readSeat(seatKey, filename))
    .sort((left, right) => left.seatKey.localeCompare(right.seatKey));
  if (seatEntries.length < 2) {
    throw new TypeError("at least two durable Bot Seat stores are required");
  }
  const totalActionCount = seatEntries.reduce((sum, entry) =>
    sum + entry.actionCount, 0);
  const totalReplayVerifiedCount = seatEntries.reduce((sum, entry) =>
    sum + entry.replayVerifiedCount, 0);
  const latestAppliedSeat = seatEntries.find((entry) =>
    entry.lastAppliedStateRevision === room.stateRevision
      && entry.lastReplayMatchesCurrent
      && Boolean(entry.lastReceiptHash)) || null;
  const durableAdvanceObserved = room.stateRevision > previousStateRevision
    || totalActionCount > previousActionCount;
  const atomicBoundarySatisfied = durableAdvanceObserved
    && room.acceptedTransitionCount === room.stateRevision
    && totalActionCount === room.stateRevision
    && totalReplayVerifiedCount === room.stateRevision
    && seatEntries.every((entry) => !entry.inflightApplyPending)
    && Boolean(latestAppliedSeat);
  const disposition = !durableAdvanceObserved
    ? "no_durable_advance"
    : atomicBoundarySatisfied
      ? "restart_control_plane_without_replay"
      : "durable_advance_settling";
  return Object.freeze({
    schemaVersion: STARCRAFT_TMG_DURABLE_AGENT_ACTION_BOUNDARY_VERSION,
    previousStateRevision,
    previousActionCount,
    room,
    seats: seatEntries,
    totalActionCount,
    totalReplayVerifiedCount,
    durableAdvanceObserved,
    atomicBoundarySatisfied,
    latestAppliedSeatKey: latestAppliedSeat?.seatKey || null,
    latestReceiptHash: latestAppliedSeat?.lastReceiptHash || null,
    disposition,
    duplicateDriveAuthorized: false,
    providerCallAuthorized: false,
    trainingTruth: false,
  });
}
