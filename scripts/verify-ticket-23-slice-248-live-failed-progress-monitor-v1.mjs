// Concrete v39 A capture: the actual monitor waited for process exit even
// though the Web driver had already persisted a High failed progress record.
// Execute the real monitor in an isolated VM; no OS signal, network or Room write.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { EventEmitter } from "node:events";
import vm from "node:vm";
import * as outcome from "../packages/online-agent-session/owned-live-driver-outcome-v1.mjs";

const [capturePath, monitorPath, reportPath] = process.argv.slice(2);
const capture = JSON.parse(await readFile(capturePath, "utf8"));
const source = await readFile(monitorPath, "utf8");
assert.equal(capture.failedProgress.status, "failed");
assert.equal(capture.failedProgress.failureCode, "SLICE248_COMPLETED_DRIVES_WITHOUT_PROGRESS");
assert.equal(capture.allProcessesStillLiveAtFailure, true);
assert.equal(capture.driverStillAliveAfterFailure, true);

async function runCapturedTick(stale = false) {
  const signals = [], writes = new Map();
  const active = new Set(capture.rows.flatMap(r => [r.hostPid, r.driverPid]));
  let fetches = 0;
  const failedProgress = { ...capture.failedProgress,
    ...(stale ? { updatedAt: "2000-01-01T00:00:00.000Z" } : {}) };
  class CapturedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [capture.launchAt])); }
    static now() { return Date.parse(capture.launchAt); }
  }
  const context = vm.createContext({
    Date: CapturedDate, AbortSignal,
    setTimeout(resolve, delay) {
      if (delay === 10000) throw Error("CAPTURED_FIRST_TICK_COMPLETE");
      queueMicrotask(resolve);
    },
    process: { execArgv: [], pid: 900001, once() {},
      kill(pid, signal) { signals.push({ pid, signal }); active.delete(pid); },
      stdout: { write() {} } },
    async fetch() {
      fetches++;
      return { ok: true, async json() { return { job: { status: "completed",
        result: { status: "paused", failureAccounting: { findings: [{
          code: "provider_dns_resolution_failed", severity: "Medium",
          integrationBlocking: false,
        }] } } } }; } };
    },
  });
  const synthetic = (exports, identifier) => new vm.SyntheticModule(
    Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context, identifier });
  const fsModule = synthetic({
    async readFile(path) {
      if (path.endsWith("live-process-handles.private.json")) {
        return JSON.stringify({ rows: capture.rows });
      }
      const row = capture.rows.find(r => r.entryPath === path || r.progressPath === path);
      if (row?.entryPath === path) return JSON.stringify({
        roomId: row.roomId, origin: "http://127.0.0.1:1", runnerToken: "vm-not-a-credential",
      });
      if (row?.progressPath === path) return JSON.stringify(row.arm === capture.failedArm
        ? failedProgress : { status: "running", actionCount: row.initialActions,
          updatedAt: capture.launchAt, estimatedCostCny: 0 });
      if (path.endsWith("failure.json")) return JSON.stringify(capture.failedOutcome);
      const error = Error("CAPTURED_FILE_NOT_AVAILABLE"); error.code = "ENOENT"; throw error;
    },
    async writeFile(path, body) { writes.set(path, JSON.parse(body)); },
  }, "captured-fs");
  const childModule = synthetic({ spawn(file, args) {
    assert.equal(file, "/bin/ps");
    const child = new EventEmitter(); child.stdout = new EventEmitter();
    queueMicrotask(() => {
      child.stdout.emit("data", [...active].map(pid =>
        `${pid} Tue Oct 13 04:52:49 2026`).join("\n") + "\n");
      child.emit("close", 0);
    });
    return child;
  } }, "captured-ps");
  const outcomeModule = synthetic(outcome, "real-outcome-contract");
  const module = new vm.SourceTextModule(source, { context, identifier: monitorPath });
  await module.link(specifier => {
    if (specifier === "node:fs/promises") return fsModule;
    if (specifier === "node:child_process") return childModule;
    if (specifier.endsWith("owned-live-driver-outcome-v1.mjs")) return outcomeModule;
    throw Error(`UNEXPECTED_MONITOR_IMPORT:${specifier}`);
  });
  try { await module.evaluate({ timeout: 2000 }); }
  catch (error) { if (error.message !== "CAPTURED_FIRST_TICK_COMPLETE") throw error; }
  const stop = [...writes].find(([path]) => path.includes("/all-stop-common-"))?.[1];
  return { stop, signals, fetches };
}

const fresh = await runCapturedTick();
assert(fresh.stop, "a persisted failed Web drive must stop the batch while its PID remains live");
assert.match(fresh.stop.reason, /LIVE_DRIVER_FAILED:SLICE248_COMPLETED_DRIVES_WITHOUT_PROGRESS/);
assert(fresh.stop.closedAt, "all hosts seal before drivers are stopped");
assert.equal(fresh.signals.length, capture.rows.length * 2);
assert(fresh.signals.every(x => x.signal === "SIGTERM"));
assert.equal(fresh.fetches, 0, "failed progress must be checked before job polling");
const stale = await runCapturedTick(true);
assert.equal(stale.stop, undefined, "old failed progress must not stop a fresh run");
assert.equal(stale.signals.length, 0);
const report = { passed: true, actualMonitorSourceExecuted: monitorPath,
  capturedFailureDetectedWithLivePid: true, allArmsSealedBeforeDriverStop: true,
  staleFailureDoesNotStopNewRun: true, providerCalls: 0, roomWrites: 0,
  realProcessSignals: 0, networkRequests: 0, trainingTruth: false };
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
console.log(JSON.stringify(report));
