import { DatabaseSync } from "node:sqlite";
import { availableParallelism } from "node:os";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

// One coordinator for this product's independent rooms AND native processes.
// It schedules computation only: no state, credentials, verdicts or strategy
// material enters this database, and no Provider wait holds a CPU allocation.
const capacity = Math.max(1, availableParallelism() - 2);
const owner = randomUUID();
const localWaiters = [];
let localUsed = 0;
let database;
let unavailable = false;
const pendingReleases = new Set();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

function observe(callback, event) {
  try {
    const result = callback?.(event);
    if (result?.then) result.catch(() => undefined);
  } catch { /* Scheduling observations cannot reject Rules facts. */ }
}

function coordinator() {
  if (database || unavailable) return database;
  try {
    const directory = new URL("../../build/cpu-admission-v1/", import.meta.url);
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    database = new DatabaseSync(fileURLToPath(new URL("coordinator.sqlite", directory)));
    database.exec("PRAGMA busy_timeout = 5000");
    database.exec("PRAGMA journal_mode = WAL");
    database.exec(`CREATE TABLE IF NOT EXISTS cpu_allocations (
      allocation_id TEXT PRIMARY KEY, owner_id TEXT NOT NULL,
      pid INTEGER NOT NULL, family TEXT NOT NULL, workers INTEGER NOT NULL
    ) STRICT`);
    process.once("exit", () => {
      try { database.prepare("DELETE FROM cpu_allocations WHERE owner_id = ?").run(owner); }
      catch { /* A following process recovers allocations of a dead PID. */ }
    });
  } catch {
    try { database?.close(); } catch {}
    database = undefined;
    unavailable = true;
  }
  return database;
}

function processIsAlive(pid) {
  try { process.kill(pid, 0); return true; }
  catch (error) { return error.code !== "ESRCH"; }
}

function reserve(db, requestedWorkers, family, allocationId) {
  try {
    db.exec("BEGIN IMMEDIATE");
    for (const id of pendingReleases) {
      db.prepare("DELETE FROM cpu_allocations WHERE allocation_id = ? AND owner_id = ?")
        .run(id, owner);
    }
    pendingReleases.clear();
    const rows = db.prepare("SELECT allocation_id, pid, workers FROM cpu_allocations").all();
    let used = 0;
    for (const row of rows) {
      if (!processIsAlive(row.pid)) {
        db.prepare("DELETE FROM cpu_allocations WHERE allocation_id = ?")
          .run(row.allocation_id);
      } else used += row.workers;
    }
    const workerCount = Math.min(requestedWorkers, Math.max(0, capacity - used));
    if (workerCount) db.prepare("INSERT INTO cpu_allocations VALUES (?, ?, ?, ?, ?)")
      .run(allocationId, owner, process.pid, family, workerCount);
    db.exec("COMMIT");
    return workerCount;
  } catch (error) {
    try { db.exec("ROLLBACK"); } catch {}
    throw error;
  }
}

function reserveLocal() {
  // Coordinator I/O failure is not an illegal move. Degrade to one shared
  // in-process worker, not to an unbounded pool or an incomplete query result.
  return new Promise(resolve => {
    localWaiters.push(resolve);
    dispatchLocal();
  });
}

function dispatchLocal() {
  if (localUsed || !localWaiters.length) return;
  localUsed = 1;
  let released = false;
  localWaiters.shift()({ workerCount: 1, async reduceTo() { return 1; }, release() {
    if (released) return;
    released = true;
    localUsed = 0;
    dispatchLocal();
  } });
}

export async function acquireStarcraftTmgCpuAdmissionV1({ requestedWorkers,
  family, observeProgress } = {}) {
  if (!Number.isSafeInteger(requestedWorkers) || requestedWorkers < 1) {
    throw new TypeError("CPU_ADMISSION_REQUEST_INVALID");
  }
  const startedAtMs = Date.now();
  const allocationId = randomUUID();
  const db = coordinator();
  if (!db) {
    observe(observeProgress, { stage: "shared_cpu_coordinator_local_fallback", family });
    return reserveLocal();
  }
  let workerCount = 0;
  while (!workerCount) {
    try { workerCount = reserve(db, requestedWorkers, String(family || "readonly"), allocationId); }
    catch (error) {
      observe(observeProgress, { stage: "shared_cpu_coordinator_local_fallback", family,
        code: String(error.code || error.name || "CPU_COORDINATOR_IO") });
      return reserveLocal();
    }
    if (!workerCount) await pause(25);
  }
  observe(observeProgress, { stage: "shared_cpu_admitted", family,
    workerCount, capacity, queueElapsedMs: Date.now() - startedAtMs });
  let released = false;
  return { get workerCount() { return workerCount; }, async reduceTo(count) {
    if (!Number.isSafeInteger(count) || count < 1) {
      throw new TypeError("CPU_ADMISSION_REDUCTION_INVALID");
    }
    if (released || count >= workerCount) return workerCount;
    try {
      const updated = db.prepare(`UPDATE cpu_allocations SET workers = ?
        WHERE allocation_id = ? AND owner_id = ? AND workers = ?`)
        .run(count, allocationId, owner, workerCount);
      if (Number(updated.changes) !== 1) throw new Error("CPU_ADMISSION_REDUCTION_NOT_APPLIED");
      const previousWorkerCount = workerCount;
      workerCount = count;
      observe(observeProgress, { stage: "shared_cpu_reduced", family,
        previousWorkerCount, workerCount, capacity });
    } catch (error) {
      // Keep the conservative old reservation on I/O failure. Never advertise
      // released capacity unless the coordinator actually persisted it.
      observe(observeProgress, { stage: "shared_cpu_reduction_deferred", family,
        workerCount, code: String(error.code || error.message || "CPU_COORDINATOR_IO") });
    }
    return workerCount;
  }, async release() {
    if (released) return;
    released = true;
    pendingReleases.add(allocationId);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        db.prepare("DELETE FROM cpu_allocations WHERE allocation_id = ? AND owner_id = ?")
          .run(allocationId, owner);
        pendingReleases.delete(allocationId);
        return;
      } catch { await pause(25); }
    }
    observe(observeProgress, { stage: "shared_cpu_release_deferred", family });
  } };
}
