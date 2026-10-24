// Ticket 27 / Slice 271 — file-backed draft store for the roster-planning
// workspace. Persists one JSON document per planning session so completed
// sessions, retained sanitized public deliberation replies and manual
// override history survive server restarts (resumable drafts). Completed but
// unparseable Provider output text is retained privately for diagnosis; full
// Provider response envelopes, credentials and Room state are not stored.
// Every record carries trainingTruth:false. Writes are atomic (tmp + rename)
// and file-per-session, mode 0o600.

import { mkdir, open, readFile, readdir, rename, rm, writeFile } from
  "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const ROSTER_PLANNING_DRAFT_STORE_MODULE =
  "packages/roster-planning-workspace/roster-planning-draft-store-v1.mjs";
export const ROSTER_PLANNING_DRAFT_STORE_VERSION = "1.0.1";
export const ROSTER_PLANNING_SESSION_SCHEMA =
  "starcraft_tmg_roster_workspace_session_v1";

const SESSION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$/u;

function fail(code, detail = "") {
  throw Object.assign(new Error(detail ? `${code}:${detail}` : code),
    { code });
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function createRosterPlanningDraftStoreV1(input = {}) {
  const directory = path.resolve(String(input.directory || ""));
  if (!directory || directory === path.parse(directory).root) {
    fail("ROSTER_WORKSPACE_DRAFT_STORE_INVALID", "directory");
  }

  function sessionPath(sessionId) {
    if (!SESSION_ID_PATTERN.test(String(sessionId || ""))) {
      fail("ROSTER_WORKSPACE_SESSION_ID_INVALID", String(sessionId || ""));
    }
    return path.join(directory, "drafts", `${sessionId}.json`);
  }

  async function ensureReady() {
    await mkdir(path.join(directory, "drafts"), { recursive: true,
      mode: 0o700 });
  }

  async function save(session, options = {}) {
    if (!object(session) || session.schema !== ROSTER_PLANNING_SESSION_SCHEMA
      || !SESSION_ID_PATTERN.test(String(session.sessionId || ""))
      || session.trainingTruth !== false) {
      fail("ROSTER_WORKSPACE_DRAFT_RECORD_INVALID");
    }
    const target = sessionPath(session.sessionId);
    const temporary = path.join(directory, "drafts",
      `.${session.sessionId}.${randomBytes(6).toString("hex")}.tmp`);
    // Capture the immutable bytes and matching hash before yielding. This is
    // the ownership boundary; a second full-history deep clone adds no safety.
    const payload = `${JSON.stringify(session, null, options.compact === true ? 0 : 2)}\n`;
    const recordHash = options.includeRecordHash === false ? null
      : hashStarcraftTmgContract(session);
    await ensureReady();
    const handle = await open(temporary, "w", 0o600);
    try {
      await handle.writeFile(payload, "utf8");
    } finally {
      await handle.close();
    }
    await rename(temporary, target);
    return { path: target, recordHash };
  }

  async function load(sessionId) {
    try {
      const value = JSON.parse(await readFile(sessionPath(sessionId), "utf8"));
      if (!object(value) || value.schema !== ROSTER_PLANNING_SESSION_SCHEMA
        || value.sessionId !== sessionId) {
        fail("ROSTER_WORKSPACE_DRAFT_RECORD_INVALID", sessionId);
      }
      return value;
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      throw error;
    }
  }

  async function loadAll() {
    await ensureReady();
    const draftsDirectory = path.join(directory, "drafts");
    const entries = await readdir(draftsDirectory, { withFileTypes: true });
    const sessions = [];
    const quarantined = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")
        || entry.name.startsWith(".")) continue;
      const sessionId = entry.name.slice(0, -".json".length);
      try {
        const session = await load(sessionId);
        if (session) sessions.push(session);
      } catch (error) {
        // A corrupt draft never blocks the workspace: quarantine it aside and
        // report it honestly instead of silently dropping user work.
        const quarantineName = `${entry.name}.quarantined`;
        await rename(path.join(draftsDirectory, entry.name),
          path.join(draftsDirectory, quarantineName)).catch(() => {});
        quarantined.push({ sessionId,
          reason: String(error?.code || error?.message || error) });
      }
    }
    sessions.sort((left, right) => String(right.updatedAt || "")
      .localeCompare(String(left.updatedAt || "")));
    return { sessions, quarantined };
  }

  async function remove(sessionId) {
    try {
      await rm(sessionPath(sessionId));
      return true;
    } catch (error) {
      if (error?.code === "ENOENT") return false;
      throw error;
    }
  }

  return Object.freeze({
    storeDescriptor: () => Object.freeze({
      schema: "starcraft_tmg_roster_workspace_draft_store_descriptor_v1",
      module: ROSTER_PLANNING_DRAFT_STORE_MODULE,
      version: ROSTER_PLANNING_DRAFT_STORE_VERSION,
      filePerSessionAtomicWrite: true,
      capturesCallTimeSnapshot: true,
      holdsNoCredentials: true,
      holdsNoRawProviderPayloads: true,
      retainsUnparseableOutputTextPrivately: true,
      holdsNoRoomState: true,
      trainingTruth: false,
    }),
    save,
    load,
    loadAll,
    remove,
  });
}
