import { parentPort, workerData, threadId } from "node:worker_threads";
import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from
  "./room-backed-spatial-rules-query-adapter-v1.mjs";
import { STARCRAFT_TMG_INDEPENDENT_READONLY_QUERY_KINDS_V1 } from
  "./readonly-query-kinds-v1.mjs";
import { createStarcraftTmgFireExchangeWorkEvaluatorV1 } from
  "./combat-estimation-runtime-v1.mjs";

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}
const aggregate = freeze(workerData.aggregate);
let chanceDiagnostics = [];
const evaluateFirePart = createStarcraftTmgFireExchangeWorkEvaluatorV1({
  state: aggregate.envelope.state,
  observeChanceContext: event => chanceDiagnostics.push(event),
});
const allowed = new Set(STARCRAFT_TMG_INDEPENDENT_READONLY_QUERY_KINDS_V1);
const adapter = createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({
  seatKey: workerData.seatKey,
  roomStore: { async loadRoom() { return aggregate; } },
  rulesRuntime: { instantiate() { throw Error("READONLY_WORKER_INSTANTIATION_FORBIDDEN"); } },
  observeChanceContext: event => chanceDiagnostics.push(event),
});
parentPort.on("message", async ({ jobId, request, fireExchangePart }) => {
  const startedAtMs = Date.now();
  chanceDiagnostics = [];
  try {
    let result;
    if (fireExchangePart) {
      result = evaluateFirePart(freeze(fireExchangePart));
    } else {
      if (!allowed.has(request?.queryKind)) throw Error("READONLY_WORKER_QUERY_KIND_FORBIDDEN");
      // The parent flattens fire work into this same pool. A legacy pool
      // caller without that protocol may recover locally, never spawn a
      // pool from inside this Worker via the direct Adapter query route.
      if (request.queryKind === "fire_zone_exchange") {
        throw Error("READONLY_FIRE_QUERY_REQUIRES_PARENT_WORK_PLAN");
      }
      result = await adapter.query(request);
    }
    parentPort.postMessage({ jobId, ok: true, result, threadId, chanceDiagnostics,
      startedAtMs, completedAtMs: Date.now() });
  } catch (error) {
    parentPort.postMessage({ jobId, ok: false, threadId,
      code: String(error?.code || error?.name || "WORKER_QUERY_FAILED"),
      startedAtMs, completedAtMs: Date.now() });
  }
});
