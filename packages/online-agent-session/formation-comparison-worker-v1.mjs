import { parentPort, workerData } from "node:worker_threads";
import { Session } from "node:inspector";
import { projectStarcraftTmgFormationRelationshipComparisonV1 } from
  "./legal-formation-search-v1.mjs";

// Only a private, read-only snapshot and pure Rules/geometry functions live in
// this worker. There are no Room writes, Provider calls or model credentials.
const state = workerData.state;
function currentThreadCpuClock() {
  try { return process.threadCpuUsage?.() || null; }
  catch { return null; }
}

function elapsedThreadCpuMilliseconds(start) {
  if (!start) return null;
  try {
    const usage = process.threadCpuUsage(start);
    return (usage.user + usage.system) / 1000;
  } catch { return null; }
}

async function startDiagnosticProfiler() {
  if (workerData.profileCpu !== true) return null;
  const session = new Session();
  try {
    session.connect();
    const post = (method, params = {}) => new Promise((resolve, reject) =>
      session.post(method, params, (error, result) => error ? reject(error) : resolve(result)));
    await post("Profiler.enable");
    await post("Profiler.setSamplingInterval", { interval: 1000 });
    await post("Profiler.start");
    let threadCpuStart;
    try { threadCpuStart = process.threadCpuUsage?.(); } catch {}
    return { session, post, threadCpuStart };
  } catch { try { session.disconnect(); } catch {} return null; }
}

async function stopDiagnosticProfiler(profiler) {
  if (!profiler) return null;
  try {
    const { profile } = await profiler.post("Profiler.stop");
    const parentById = new Map(profile.nodes.flatMap(node =>
      (node.children || []).map(id => [id, node.id])));
    const selfMicros = new Map();
    const inclusiveMicros = new Map();
    for (let index = 0; index < (profile.samples || []).length; index += 1) {
      const id = profile.samples[index];
      const micros = profile.timeDeltas?.[index] || 0;
      selfMicros.set(id, (selfMicros.get(id) || 0) + micros);
      for (let cursor = id; cursor !== undefined; cursor = parentById.get(cursor)) {
        inclusiveMicros.set(cursor, (inclusiveMicros.get(cursor) || 0) + micros);
      }
    }
    const rows = profile.nodes.map(node => ({
      functionName: node.callFrame.functionName,
      sourceUrl: node.callFrame.url,
      sourceLine: node.callFrame.lineNumber + 1,
      selfSampledMs: (selfMicros.get(node.id) || 0) / 1000,
      inclusiveSampledMs: (inclusiveMicros.get(node.id) || 0) / 1000,
    }));
    let threadCpuMs;
    try { if (profiler.threadCpuStart) {
      const usage = process.threadCpuUsage(profiler.threadCpuStart);
      threadCpuMs = (usage.user + usage.system) / 1000;
    } } catch {}
    return { diagnosticOnly: true, sampleCount: profile.samples?.length || 0,
      profilerDurationMs: (profile.endTime - profile.startTime) / 1000,
      ...(threadCpuMs !== undefined ? { threadCpuMs } : {}),
      topSelf: rows.sort((a, b) => b.selfSampledMs - a.selfSampledMs).slice(0, 24),
      topInclusive: rows.sort((a, b) => b.inclusiveSampledMs - a.inclusiveSampledMs).slice(0, 24),
      rulesAuthority: false, trainingTruth: false };
  } catch { return { diagnosticOnly: true, profilerUnavailable: true }; }
  finally { try { profiler.session.disconnect(); } catch {} }
}

parentPort.on("message", async ({ jobId, job }) => {
  const startedAtMs = Date.now();
  const diagnostics = [];
  const profiler = await startDiagnosticProfiler();
  const threadCpuStart = currentThreadCpuClock();
  try {
    const result = projectStarcraftTmgFormationRelationshipComparisonV1({
      ...job, state,
      observeProgress: event => {
        const threadCpuElapsedMs = elapsedThreadCpuMilliseconds(threadCpuStart);
        diagnostics.push({ ...event,
          ...(threadCpuElapsedMs !== null ? { threadCpuElapsedMs } : {}) });
      },
    });
    const cpuProfileSummary = await stopDiagnosticProfiler(profiler);
    parentPort.postMessage({ jobId, ok: true, result, startedAtMs, diagnostics, cpuProfileSummary,
      completedAtMs: Date.now() });
  } catch (error) {
    const cpuProfileSummary = await stopDiagnosticProfiler(profiler);
    parentPort.postMessage({ jobId, ok: false,
      code: String(error?.message || error).split(":")[0], startedAtMs, cpuProfileSummary,
      completedAtMs: Date.now() });
  }
});
