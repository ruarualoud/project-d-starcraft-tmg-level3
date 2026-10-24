import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { decodeStarcraftTmgLiveDecisionRecordV1 } from
  "../../packages/online-agent-session/sqlite-live-decision-store-v1.mjs";

const MODES = new Set(["native_tools", "json_channels_v1"]);
const SEATS = ["player1", "player2"];

function fail(code) {
  throw Object.assign(new Error(code), { code });
}

export function resolveTicket23AgentAgentInteractionModeV1({
  resumeDirectory = null,
  requestedMode = null,
  allowFailedInteractionModeMigration = false,
} = {}) {
  if (requestedMode !== null && !MODES.has(requestedMode)) {
    fail("SLICE248_PROVIDER_INTERACTION_MODE_INVALID");
  }
  if (!resumeDirectory) return requestedMode || "native_tools";

  let evidenceDirectory = path.resolve(resumeDirectory);
  let expectedRoomId = null;
  const seen = new Set();
  for (let depth = 0; depth < 8; depth += 1) {
    if (seen.has(evidenceDirectory)) {
      fail("SLICE248_RESUME_INTERACTION_MODE_ANCESTRY_CYCLE");
    }
    seen.add(evidenceDirectory);
    const bothPresent = SEATS.every((seatKey) => existsSync(path.join(
      evidenceDirectory, "seats", seatKey, "provider",
      "live-decisions.sqlite")));
    if (bothPresent) break;
    const privatePath = path.join(evidenceDirectory, "fork-private.json");
    const receiptPath = path.join(evidenceDirectory, "fork-receipt.json");
    if (!existsSync(privatePath) || !existsSync(receiptPath)) {
      fail("SLICE248_RESUME_INTERACTION_MODE_MISSING");
    }
    const fork = JSON.parse(readFileSync(privatePath, "utf8"));
    const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
    if (fork.targetRoomId !== receipt.targetRoomId
      || fork.sourceRoomId !== receipt.sourceRoomId
      || (expectedRoomId && fork.targetRoomId !== expectedRoomId)) {
      fail("SLICE248_RESUME_INTERACTION_MODE_ANCESTRY_INVALID");
    }
    expectedRoomId = fork.sourceRoomId;
    evidenceDirectory = path.resolve(fork.sourceDirectory || "");
  }

  const modes = SEATS.map((seatKey) => {
    const filename = path.join(evidenceDirectory, "seats", seatKey,
      "provider", "live-decisions.sqlite");
    if (!existsSync(filename)) fail("SLICE248_RESUME_INTERACTION_MODE_MISSING");
    const database = new DatabaseSync(filename, { readOnly: true });
    try {
      const rows = database.prepare(`SELECT revision, record_json
        FROM sc_live_decision_records`).all();
      if (rows.length !== 1) {
        fail("SLICE248_RESUME_INTERACTION_MODE_INVALID");
      }
      const record = decodeStarcraftTmgLiveDecisionRecordV1(
        rows[0].record_json);
      if (record?.revision !== Number(rows[0].revision)
        || !MODES.has(record?.providerInteractionMode)
        || typeof record?.scope?.roomId !== "string") {
        fail("SLICE248_RESUME_INTERACTION_MODE_INVALID");
      }
      if (expectedRoomId && record.scope.roomId !== expectedRoomId) {
        fail("SLICE248_RESUME_INTERACTION_MODE_ANCESTRY_INVALID");
      }
      return { mode: record.providerInteractionMode,
        room_id: record.scope.roomId };
    } finally {
      database.close();
    }
  });
  if (modes[0].room_id !== modes[1].room_id
    || modes[0].mode !== modes[1].mode) {
    fail("SLICE248_RESUME_INTERACTION_MODE_SEAT_MISMATCH");
  }
  if (requestedMode && requestedMode !== modes[0].mode
    && !allowFailedInteractionModeMigration) {
    fail("SLICE248_RESUME_INTERACTION_MODE_OVERRIDE_MISMATCH");
  }
  return requestedMode || modes[0].mode;
}
