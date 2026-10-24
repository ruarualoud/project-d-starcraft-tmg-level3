import { Worker } from "node:worker_threads";
import { availableParallelism } from "node:os";
import { acquireStarcraftTmgCpuAdmissionV1 } from "./shared-cpu-admission-v1.mjs";
import { projectStarcraftTmgFormationRelationshipComparisonV1 } from
  "./legal-formation-search-v1.mjs";

export async function compareStarcraftTmgFormationBatchInWorkersV1(
  jobs, { observeProgress, profileCpu = false } = {},
) {
  if (!Array.isArray(jobs)) {
    throw new TypeError("FORMATION_COMPARISON_JOBS_INVALID");
  }
  if (!jobs.length) return [];
  const state = jobs[0].state;
  if (!state || jobs.some(job => job.state !== state)) {
    throw new TypeError("FORMATION_COMPARISON_SNAPSHOT_MISMATCH");
  }
  const observe = event => {
    try { observeProgress?.(event); } catch { /* telemetry cannot reject facts */ }
  };
  const admission = await acquireStarcraftTmgCpuAdmissionV1({
    requestedWorkers: Math.min(jobs.length, 4, Math.max(1, availableParallelism())),
    family: "formation_comparison", observeProgress: observe });
  const workerCount = admission.workerCount;
  const results = new Array(jobs.length);
  const workers = [];
  const failures = [];
  let nextJob = 0;
  const runWorker = () => new Promise(resolve => {
    let worker;
    let currentJob = null;
    let finished = false;
    const finish = () => { if (!finished) { finished = true; resolve(); } };
    const failed = code => {
      if (currentJob !== null) failures.push({ index: currentJob, code });
      currentJob = null;
      finish();
    };
    const dispatch = () => {
      if (nextJob >= jobs.length) { finish(); return; }
      currentJob = nextJob++;
      const { state: _state, ...job } = jobs[currentJob];
      observe({ stage: "worker_comparison_dispatched", index: currentJob });
      try { worker.postMessage({ jobId: currentJob, job }); }
      catch (error) { failed(String(error?.code || error?.name || "WORKER_SEND_FAILED")); }
    };
    try {
      worker = new Worker(new URL("./formation-comparison-worker-v1.mjs", import.meta.url), {
        workerData: { state, profileCpu: profileCpu === true }, execArgv: [],
      });
      workers.push(worker);
    } catch (error) {
      failed(String(error?.code || error?.name || "WORKER_START_FAILED"));
      return;
    }
    worker.once("online", dispatch);
    worker.on("message", message => {
      if (finished || message?.jobId !== currentJob) return;
      for (const event of message.diagnostics || []) observe({ ...event, index: currentJob });
      if (message.cpuProfileSummary) observe({ stage: "formation_comparison_cpu_profile",
        index: currentJob, ...message.cpuProfileSummary });
      observe({ stage: "worker_comparison_completed", index: currentJob,
        startedAtMs: message.startedAtMs, completedAtMs: message.completedAtMs });
      if (message.ok === true) results[currentJob] = message.result;
      else failures.push({ index: currentJob,
        code: String(message.code || "WORKER_COMPARISON_FAILED") });
      currentJob = null;
      dispatch();
    });
    worker.once("error", error => failed(String(error?.code || error?.name
      || "WORKER_FAILED")));
    worker.once("exit", () => {
      if (!finished) failed("WORKER_EXIT_BEFORE_RESULT");
    });
  });
  try {
    await Promise.all(Array.from({ length: workerCount }, runWorker));
    // A worker transport/resource failure is not a rules verdict. Recover only
    // missing read-only comparisons with the exact same pure implementation;
    // never turn missing results into zero threat or silently drop an option.
    for (let index = 0; index < jobs.length; index += 1) {
      if (results[index] !== undefined) continue;
      observe({ stage: "worker_comparison_local_recovery", index,
        code: failures.find(entry => entry.index === index)?.code
          || "WORKER_UNDISPATCHED" });
      results[index] = projectStarcraftTmgFormationRelationshipComparisonV1(jobs[index]);
    }
    return results;
  } finally {
    await Promise.all(workers.map(worker => worker.terminate().catch(() => {})));
    await admission.release();
    observe({ stage: "worker_batch_closed", workerCount, jobCount: jobs.length });
  }
}
