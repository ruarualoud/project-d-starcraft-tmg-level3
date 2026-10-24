import { parentPort, workerData, threadId } from "node:worker_threads";
import { visitNativeSpecialTerrainLosEntriesV1 } from
  "../rule-atoms/official-special-terrain-rules-kernel-v1.mjs";
import { packNativeSpecialTerrainLosCompletionV1 } from
  "./native-special-terrain-los-projection-v1.mjs";

parentPort.on("message", message => {
  if (message?.operation !== "evaluate") return;
  const startedAtMs = Date.now();
  const queries = workerData.queries;
  const indexById = new Map(queries.map((query, index) =>
    [String(query.queryId).trim(), workerData.startIndex + index]));
  try {
    visitNativeSpecialTerrainLosEntriesV1({ state: workerData.state,
      dataBundle: workerData.state.officialTerrainLosDataBundle,
      queries, isolatePairFailures: true,
      observeCompletedPair: entry => {
        const index = indexById.get(entry.queryId);
        const completion = packNativeSpecialTerrainLosCompletionV1(entry,
          queries[index - workerData.startIndex]);
        parentPort.postMessage({ operation: "pair_completed", index, completion },
          [completion.compressedEntry.buffer]);
      },
    });
    parentPort.postMessage({ operation: "group_completed", threadId,
      startedAtMs, completedAtMs: Date.now() });
  } catch (error) {
    parentPort.postMessage({ operation: "group_failed", threadId,
      startedAtMs, completedAtMs: Date.now(), error: String(error?.message || error) });
  }
});
