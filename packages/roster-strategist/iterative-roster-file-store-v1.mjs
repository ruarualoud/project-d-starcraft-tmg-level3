import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export const ITERATIVE_ROSTER_FILE_STORE_V1 =
  "starcraft_tmg_iterative_roster_file_store_v1";

function fail(code) {
  throw Object.assign(new Error(code), { code });
}

function filename(directory, kind, id) {
  if (typeof id !== "string" || !/^[A-Za-z0-9._:-]{8,200}$/u.test(id)) {
    fail("ITERATIVE_ROSTER_STORE_ID_INVALID");
  }
  const digest = createHash("sha256").update(id).digest("hex");
  return path.join(directory, kind, `${digest}.json`);
}

async function read(filenameValue, id) {
  let raw;
  try { raw = await readFile(filenameValue, "utf8"); }
  catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
  let record;
  try { record = JSON.parse(raw); }
  catch { fail("ITERATIVE_ROSTER_STORE_RECORD_INVALID"); }
  if (record?.schema !== ITERATIVE_ROSTER_FILE_STORE_V1
    || record.id !== id || record.version !== 1
    || !record.value || typeof record.value !== "object") {
    fail("ITERATIVE_ROSTER_STORE_RECORD_INVALID");
  }
  // JSON.parse already gave this caller an independent graph; no cache or
  // other caller retains this decoded record.
  return record.value;
}

function encode(id, value) {
  if (!value || typeof value !== "object") {
    fail("ITERATIVE_ROSTER_STORE_VALUE_INVALID");
  }
  const record = { schema: ITERATIVE_ROSTER_FILE_STORE_V1,
    version: 1, id, value };
  // Snapshot before mkdir/write yield: later mutations cannot change these
  // bytes. Avoid allocating another full copy of retained Teach history.
  return `${JSON.stringify(record)}\n`;
}

async function writePayload(filenameValue, payload) {
  const temporary = `${filenameValue}.${randomUUID()}.next`;
  await mkdir(path.dirname(filenameValue), { recursive: true, mode: 0o700 });
  await writeFile(temporary, payload, {
    encoding: "utf8", mode: 0o600, flag: "wx",
  });
  await rename(temporary, filenameValue);
}

function write(filenameValue, id, value) {
  return writePayload(filenameValue, encode(id, value));
}

export function createIterativeRosterFileStoreV1({ directory } = {}) {
  if (typeof directory !== "string" || !path.isAbsolute(directory)) {
    fail("ITERATIVE_ROSTER_STORE_DIRECTORY_INVALID");
  }
  return Object.freeze({
    // Every load parses fresh bytes; the caller owns the decoded graph.
    // Other store implementations must opt in explicitly to this contract.
    loadReturnsOwnedValue: true,
    prepareSave: (sessionId, state) => {
      const target = filename(directory, 'sessions', sessionId);
      const payload = encode(sessionId, state);
      const capturedPause = state.pauseRequested === true;
      return Object.freeze({ commit: ({ forcePause = false } = {}) => {
        if (!forcePause || capturedPause) return writePayload(target, payload);
        // Pause can arrive while an older snapshot waits in the write queue.
        // Only this uncommon control race needs a decode/re-encode; normal
        // checkpoints persist their already-captured immutable bytes directly.
        const record = JSON.parse(payload);
        record.value.pauseRequested = true;
        return writePayload(target, `${JSON.stringify(record)}\n`);
      } });
    },
    listSessions: async () => {
      let names;
      try {
        names = await readdir(path.join(directory, "sessions"));
      } catch (error) {
        if (error?.code === "ENOENT") return [];
        throw error;
      }
      const sessions = [];
      for (const name of names.filter((entry) =>
        /^[a-f0-9]{64}\.json$/u.test(entry)).sort()) {
        let record;
        try {
          record = JSON.parse(await readFile(path.join(directory,
            "sessions", name), "utf8"));
        } catch { fail("ITERATIVE_ROSTER_STORE_RECORD_INVALID"); }
        if (record?.schema !== ITERATIVE_ROSTER_FILE_STORE_V1
          || record.version !== 1
          || typeof record.id !== "string"
          || path.basename(filename(directory, "sessions", record.id))
            !== name
          || record.value?.sessionId !== record.id) {
          fail("ITERATIVE_ROSTER_STORE_RECORD_INVALID");
        }
        sessions.push(record.value);
      }
      return sessions;
    },
    load: (sessionId) => read(filename(directory, "sessions", sessionId),
      sessionId),
    save: (sessionId, state) => write(
      filename(directory, "sessions", sessionId), sessionId, state),
    // Per-tool completion must not rewrite the entire retained Teach archive.
    loadQueryBatch: (requestKey) => read(filename(directory, 'query-batches', requestKey), requestKey),
    saveQueryBatch: (requestKey, batch) => write(filename(directory, 'query-batches', requestKey), requestKey, batch),
    loadRetainedReply: (requestKey) => read(
      filename(directory, "replies", requestKey), requestKey),
    retainReply: async (requestKey, reply) => {
      const target = filename(directory, "replies", requestKey);
      const previous = await read(target, requestKey);
      if (previous) {
        if (JSON.stringify(previous) !== JSON.stringify(reply)) {
          fail("ITERATIVE_ROSTER_RETAINED_REPLY_CONFLICT");
        }
        return;
      }
      await write(target, requestKey, reply);
    },
  });
}
