// Observer only: one already-owned Host and its existing computation workers.
// No Runtime/Debugger evaluation, imports in the Host, Room or Provider calls.
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const [entryPath, outputDirectory, prefix] = process.argv.slice(2);
if (!entryPath || !outputDirectory || !/^[a-zA-Z0-9-]+$/u.test(prefix || "")) {
  throw new Error("private owned entry, output directory and prefix required");
}
const entry = JSON.parse(await readFile(entryPath, "utf8"));
if (!Number.isSafeInteger(entry.pid)
  || !/^ws:\/\/127\.0\.0\.1:\d+\/[a-f0-9-]+$/u.test(entry.endpoint || "")) {
  throw new Error("owned loopback debugger entry required");
}
const socket = new WebSocket(entry.endpoint);
const pending = new Map();
const workerPending = new Map();
const workers = new Map();
const profiles = [];
let nextId = 0;
const methods = new Set(["NodeWorker.enable", "NodeWorker.disable",
  "NodeWorker.sendMessageToWorker", "Profiler.enable", "Profiler.disable",
  "Profiler.setSamplingInterval", "Profiler.start", "Profiler.stop"]);
function request(method, params = {}) {
  if (!methods.has(method)) throw new Error("observer method outside allowlist");
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => {
      pending.delete(id); reject(new Error(`observer timeout: ${method}`));
    }, 15000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
function workerRequest(worker, method, params = {}) {
  if (!method.startsWith("Profiler.") || !methods.has(method)) {
    throw new Error("worker observer method outside allowlist");
  }
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    const key = `${worker.sessionId}:${id}`;
    const timer = setTimeout(() => {
      workerPending.delete(key); reject(new Error(`worker timeout: ${method}`));
    }, 15000);
    workerPending.set(key, { resolve, reject, timer });
    request("NodeWorker.sendMessageToWorker", { sessionId: worker.sessionId,
      message: JSON.stringify({ id, method, params }) }).catch(error => {
      clearTimeout(timer); workerPending.delete(key); reject(error);
    });
  });
}
socket.addEventListener("message", event => {
  const message = JSON.parse(String(event.data));
  let waiter;
  if (message.id) {
    waiter = pending.get(message.id); pending.delete(message.id);
  } else if (message.method === "NodeWorker.receivedMessageFromWorker") {
    const inner = JSON.parse(message.params.message);
    const key = `${message.params.sessionId}:${inner.id}`;
    waiter = workerPending.get(key); workerPending.delete(key);
    if (waiter) {
      clearTimeout(waiter.timer);
      inner.error ? waiter.reject(new Error(inner.error.message))
        : waiter.resolve(inner.result || {});
    }
    return;
  } else if (message.method === "NodeWorker.attachedToWorker") {
    const worker = { sessionId: message.params.sessionId,
      name: `worker-${workers.size + 1}`, started: false, detached: false };
    workers.set(worker.sessionId, worker);
    worker.armed = (async () => {
      await workerRequest(worker, "Profiler.enable");
      await workerRequest(worker, "Profiler.setSamplingInterval", { interval: 10000 });
      await workerRequest(worker, "Profiler.start"); worker.started = true;
    })().catch(error => { worker.failure = String(error.message); });
  } else if (message.method === "NodeWorker.detachedFromWorker") {
    const worker = workers.get(message.params.sessionId);
    if (worker) worker.detached = true;
  }
  if (waiter) {
    clearTimeout(waiter.timer);
    message.error ? waiter.reject(new Error(message.error.message))
      : waiter.resolve(message.result || {});
  }
});
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", () => reject(new Error("owned socket failed")),
    { once: true });
});
let parentStarted = false;
try {
  await request("NodeWorker.enable", { waitForDebuggerOnStart: false });
  await request("Profiler.enable");
  await request("Profiler.setSamplingInterval", { interval: 10000 });
  await request("Profiler.start"); parentStarted = true;
  await new Promise(resolve => setTimeout(resolve, 15000));
  await Promise.all([...workers.values()].map(worker => worker.armed));
  await Promise.all([...workers.values()].filter(worker => worker.started
    && !worker.detached).map(async worker => {
    try {
      const { profile } = await workerRequest(worker, "Profiler.stop");
      worker.started = false; profiles.push({ name: worker.name, profile });
    } catch (error) { worker.failure = String(error.message); }
  }));
  const { profile } = await request("Profiler.stop"); parentStarted = false;
  profiles.push({ name: "parent", profile });
} finally {
  // Close observer sessions only; leave the original service running.
  if (parentStarted) await request("Profiler.stop").catch(() => {});
  await Promise.all([...workers.values()].filter(worker => !worker.detached)
    .map(worker => workerRequest(worker, "Profiler.disable").catch(() => {})));
  await request("Profiler.disable").catch(() => {});
  await request("NodeWorker.disable").catch(() => {});
  socket.close();
}
const rows = [];
for (const { name, profile } of profiles) {
  const filename = join(outputDirectory, `${prefix}-${name}.cpuprofile`);
  await writeFile(filename, JSON.stringify(profile), { mode: 0o600 });
  const counts = new Map();
  for (const id of profile.samples || []) counts.set(id, (counts.get(id) || 0) + 1);
  const nodes = new Map(profile.nodes.map(node => [node.id, node]));
  rows.push({ name, filename, samples: (profile.samples || []).length,
    top: [...counts].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([id, samples]) =>
      ({ function: nodes.get(id).callFrame.functionName,
        url: nodes.get(id).callFrame.url,
        line: nodes.get(id).callFrame.lineNumber, samples })) });
}
const report = { pid: entry.pid, recordedAt: new Date().toISOString(),
  rows, workersWithoutProfile: [...workers.values()].filter(worker =>
    !profiles.some(profile => profile.name === worker.name)).map(worker =>
    ({ name: worker.name, detached: worker.detached, failure: worker.failure })),
  cleanup: "Profiler.disable, NodeWorker.disable, observer socket close",
  runtimeEvaluation: false, roomWrites: 0, providerCalls: 0, trainingTruth: false };
await writeFile(join(outputDirectory, `${prefix}-summary.json`),
  JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ pid: entry.pid,
  sampled: rows.map(row => ({ name: row.name, samples: row.samples })),
  roomWrites: 0, providerCalls: 0, runtimeEvaluation: false }));
