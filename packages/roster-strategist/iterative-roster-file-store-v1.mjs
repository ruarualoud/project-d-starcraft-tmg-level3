import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
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
  return structuredClone(record.value);
}

async function write(filenameValue, id, value) {
  if (!value || typeof value !== "object") {
    fail("ITERATIVE_ROSTER_STORE_VALUE_INVALID");
  }
  await mkdir(path.dirname(filenameValue), { recursive: true, mode: 0o700 });
  const temporary = `${filenameValue}.${randomUUID()}.next`;
  const record = { schema: ITERATIVE_ROSTER_FILE_STORE_V1,
    version: 1, id, value: structuredClone(value) };
  await writeFile(temporary, `${JSON.stringify(record)}\n`, {
    encoding: "utf8", mode: 0o600, flag: "wx",
  });
  await rename(temporary, filenameValue);
}

export function createIterativeRosterFileStoreV1({ directory } = {}) {
  if (typeof directory !== "string" || !path.isAbsolute(directory)) {
    fail("ITERATIVE_ROSTER_STORE_DIRECTORY_INVALID");
  }
  return Object.freeze({
    load: (sessionId) => read(filename(directory, "sessions", sessionId),
      sessionId),
    save: (sessionId, state) => write(
      filename(directory, "sessions", sessionId), sessionId, state),
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
