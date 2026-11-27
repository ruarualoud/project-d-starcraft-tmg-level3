import { Worker } from "node:worker_threads";
import { availableParallelism } from "node:os";
import { acquireStarcraftTmgCpuAdmissionV1 } from "./shared-cpu-admission-v1.mjs";

// A worker transport failure is not a Rules verdict. Keep indexed completed
// results, and recover only missing jobs with the same pure query/snapshot.
export async function evaluateStarcraftTmgReadonlyQueriesInWorkersV1(
  { requests, aggregate, seatKey, evaluateLocally, observeProgress,
    planFireExchange, evaluateFirePart, completeFireExchange },
) {
  if (!Array.isArray(requests) || typeof evaluateLocally !== "function") {
    throw new TypeError("READONLY_QUERY_BATCH_INVALID");
  }
  const observe = event => {
    try {
      const observed = observeProgress?.(event);
      if (observed && typeof observed.then === "function") {
        Promise.resolve(observed).catch(() => undefined);
      }
    } catch { /* diagnostics cannot alter facts */ }
  };
  // Flatten outer queries AND inner fire jobs into one bounded pool. The graph
  // has no preview dependency and can run while the parent prepares attacks.
  const planningStartedAtMs = Date.now();
  if (requests.length === 0) return [];
  const hasFirePreparation = requests.some(request => request.queryKind === "fire_zone_exchange")
    && typeof planFireExchange === "function" && typeof evaluateFirePart === "function"
    && typeof completeFireExchange === "function";
  const requestedWorkers = hasFirePreparation
    ? Math.min(5, Math.max(1, availableParallelism()))
    : Math.min(4, requests.length, Math.max(1, availableParallelism()));
  const admission = await acquireStarcraftTmgCpuAdmissionV1({
    requestedWorkers,
    family: "readonly_queries", observeProgress: observe });
  const jobs = [];
  let plans = [];
  let planningComplete = false;
  const evaluateJobLocally = job => job.fireExchangePart
    ? evaluateFirePart(job.fireExchangePart) : evaluateLocally(job.request);
  const results = [];
  const collect = async () => {
    const responses = [];
    for (const plan of plans) {
      responses.push(plan.request
        ? await completeFireExchange(plan.request, plan.error
          ? { error: plan.error } : { parts: plan.indices.map(index => results[index]) })
        : results[plan.index]);
    }
    return responses;
  };
  // Heavy parent preview preparation is real CPU work too. During that stage
  // reserve one slot for the parent; after it finishes, release surplus slots
  // and use at most four workers. One-slot fallback prepares first, then runs.
  let workerBudget = hasFirePreparation
    ? Math.max(0, admission.workerCount - 1) : admission.workerCount;
  const workers = [];
  const workerPromises = [];
  const dispatchers = [];
  const failures = new Map();
  const dispatchTimes = new Map();
  let nextJob = 0;
  const runWorker = () => new Promise(resolve => {
    let worker;
    let currentJob = null;
    let finished = false;
    const finish = () => { if (!finished) { finished = true; resolve(); } };
    const failed = code => {
      if (currentJob !== null) failures.set(currentJob, code);
      currentJob = null;
      finish();
    };
    const dispatch = () => {
      if (finished) return;
      if (nextJob >= jobs.length) {
        // Preparation may append attacks after this independent job. Do not
        // retire a worker until planning has finished and its queue is empty.
        if (planningComplete) finish();
        return;
      }
      currentJob = nextJob++;
      dispatchTimes.set(currentJob, Date.now());
      try { worker.postMessage({ jobId: currentJob, ...jobs[currentJob] }); }
      catch (error) { failed(String(error?.code || error?.name || "WORKER_SEND_FAILED")); }
    };
    try {
      // No private journal, seat grants, Provider state or credentials cross
      // into the CPU pool. Pure evaluation needs complete frozen Rules state.
      worker = new Worker(new URL("./readonly-query-worker-v1.mjs", import.meta.url), {
        workerData: { seatKey, aggregate: { stateRevision: aggregate.stateRevision,
          envelope: { matchBindingHash: aggregate.envelope.matchBindingHash,
            ...(aggregate.envelope.releaseBinding ? {releaseBinding: aggregate.envelope.releaseBinding} : {}),
            stateHash: aggregate.envelope.stateHash, state: aggregate.envelope.state } } },
        execArgv: [],
      });
      workers.push(worker);
    } catch (error) {
      failed(String(error?.code || error?.name || "WORKER_START_FAILED"));
      return;
    }
    worker.on("message", message => {
      if (finished || message?.jobId !== currentJob) return;
      if (message.ok === true) {
        results[currentJob] = message.result;
        for (const event of message.chanceDiagnostics || []) {
          observe({ ...event, index: currentJob,
            requestIndex: jobs[currentJob].requestIndex,
            workKind: jobs[currentJob].fireExchangePart?.kind || "readonly_query",
            threadId: message.threadId });
        }
        observe({ stage: "query_worker_completed", index: currentJob,
          requestIndex: jobs[currentJob].requestIndex,
          workKind: jobs[currentJob].fireExchangePart?.kind || "readonly_query",
          dispatchedAtMs: dispatchTimes.get(currentJob),
          threadId: message.threadId, startedAtMs: message.startedAtMs,
          completedAtMs: message.completedAtMs });
      } else failures.set(currentJob, String(message.code || "WORKER_QUERY_FAILED"));
      currentJob = null;
      dispatch();
    });
    worker.once("error", error => failed(String(error?.code || error?.name || "WORKER_FAILED")));
    worker.once("exit", () => { if (!finished) failed("WORKER_EXIT_BEFORE_RESULT"); });
    dispatchers.push(() => { if (currentJob === null) dispatch(); });
    // postMessage is queued while the worker initializes. Waiting for an
    // `online` callback on this CPU-busy parent would recreate the barrier.
    dispatch();
  });
  try {
    plans = requests.map((request, requestIndex) => {
      if (request.queryKind === "fire_zone_exchange"
        && typeof planFireExchange === "function"
        && typeof evaluateFirePart === "function"
        && typeof completeFireExchange === "function") {
        try {
          let headIndex = null;
          const parts = planFireExchange(request, {
            onIndependentWork(fireExchangePart) {
              if (headIndex !== null || fireExchangePart?.kind !== "fire_relationships") {
                throw new TypeError("READONLY_FIRE_INDEPENDENT_HEAD_INVALID");
              }
              jobs.push({ requestIndex, fireExchangePart });
              headIndex = jobs.length - 1;
              if (workerPromises.length < workerBudget) workerPromises.push(runWorker());
            },
          });
          const indices = parts.map((fireExchangePart, partIndex) => {
            if (partIndex === 0 && headIndex !== null) {
              if (fireExchangePart !== jobs[headIndex].fireExchangePart) {
                throw new TypeError("READONLY_FIRE_INDEPENDENT_HEAD_CHANGED");
              }
              return headIndex;
            }
            jobs.push({ requestIndex, fireExchangePart });
            return jobs.length - 1;
          });
          return { request, indices };
        } catch (error) { return { request, error }; }
      }
      jobs.push({ requestIndex, request });
      return { index: jobs.length - 1 };
    });
    planningComplete = true;
    observe({ stage: "query_work_prepared", startedAtMs: planningStartedAtMs,
      completedAtMs: Date.now(), jobCount: jobs.length, queryCount: requests.length,
      parentPreparationBudgeted: hasFirePreparation,
      preparationWorkerCount: workerBudget });
    if (jobs.length === 0) return await collect();
    const workerCount = Math.min(jobs.length, 4, admission.workerCount);
    await admission.reduceTo(Math.max(1, workerCount));
    workerBudget = workerCount;
    while (workerPromises.length < workerCount) workerPromises.push(runWorker());
    for (const dispatch of dispatchers) dispatch();
    await Promise.all(workerPromises);
    // Local transport recovery may itself use a native async CPU pool. Retire
    // all workers and release their reservation first, including one-slot I/O
    // fallback; retaining it would deadlock the nested recovery semaphore.
    await Promise.all(workers.map(worker => worker.terminate().catch(() => {})));
    await admission.release();
    for (let index = 0; index < jobs.length; index += 1) {
      if (results[index] !== undefined) continue;
      observe({ stage: "query_worker_local_recovery", index,
        code: failures.get(index) || "WORKER_UNDISPATCHED" });
      results[index] = await evaluateJobLocally(jobs[index]);
    }
    return await collect();
  } finally {
    await Promise.all(workers.map(worker => worker.terminate().catch(() => {})));
    await admission.release();
    observe({ stage: "query_worker_batch_closed", workerCount: workers.length,
      jobCount: jobs.length, queryCount: requests.length });
  }
}
