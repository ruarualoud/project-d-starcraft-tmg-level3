import { Worker } from "node:worker_threads";
import { availableParallelism } from "node:os";
import { acquireStarcraftTmgCpuAdmissionV1 } from "./shared-cpu-admission-v1.mjs";
import { constants as bufferConstants } from "node:buffer";
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import { canonicalStarcraftTmgJson, STARCRAFT_TMG_HASH_ALGORITHM } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { validateNativeSpecialTerrainLosBatchV1,
  visitNativeSpecialTerrainLosEntriesV1 } from
  "../rule-atoms/official-special-terrain-rules-kernel-v1.mjs";
import { packNativeSpecialTerrainLosCompletionV1 } from
  "./native-special-terrain-los-projection-v1.mjs";

// Graphs inside an outer CPU pool still use the synchronous implementation.
// Standalone graphs now share admission with formation/readonly work across
// rooms/processes, rather than reserving an independent four-worker budget.
const BUDGET = Math.min(4, Math.max(1, availableParallelism()));

// This module accepts only the graph's owned complete snapshot. It exposes no
// public prepared-result/length/hash bypass and grants no mutation authority.
export async function evaluateNativeSpecialTerrainLosInWorkersV1(
  { state, queries, observeProgress },
) {
  validateNativeSpecialTerrainLosBatchV1({ state, queries,
    dataBundle: state.officialTerrainLosDataBundle, isolatePairFailures: true });
  const completions = new Array(queries.length);
  const workers = [];
  const observe = event => {
    try { observeProgress?.(event); } catch { /* observation cannot reject facts */ }
  };
  const admission = await acquireStarcraftTmgCpuAdmissionV1({
    requestedWorkers: Math.min(BUDGET, queries.length),
    family: "native_special_terrain_los", observeProgress: observe });
  const workerCount = admission.workerCount;
  const groupSize = Math.ceil(queries.length / workerCount);
  const evaluateGroup = startIndex => new Promise(resolve => {
    let settled = false;
    const endIndex = Math.min(queries.length, startIndex + groupSize);
    const finish = () => { if (!settled) { settled = true; resolve(); } };
    try {
      const worker = new Worker(new URL("./native-special-terrain-los-worker-v1.mjs",
        import.meta.url), {
        workerData: { state, queries: queries.slice(startIndex, endIndex), startIndex },
        execArgv: [],
      });
      workers.push(worker);
      worker.on("message", message => {
        if (settled) return;
        if (message?.operation === "pair_completed") {
          const index = message.index;
          const completion = message.completion;
          if (!Number.isInteger(index) || index < startIndex || index >= endIndex
            || completion?.queryId !== String(queries[index].queryId).trim()
            || !Number.isSafeInteger(completion.characterLength)
            || !(completion.compressedEntry instanceof Uint8Array)) return;
          if (completions[index] === undefined) completions[index] = completion;
        } else if (message?.operation === "group_completed"
          || message?.operation === "group_failed") {
          observe({ stage: "special_terrain_los_pair_group_completed", startIndex,
            endIndex, threadId: message.threadId, startedAtMs: message.startedAtMs,
            completedAtMs: message.completedAtMs,
            transportFailure: message.operation === "group_failed" });
          finish();
        }
      });
      worker.once("error", finish);
      worker.once("exit", finish);
      // Queue evaluation immediately; a busy main thread must not delay the
      // other groups until it can service separate 'online' callbacks.
      worker.postMessage({ operation: "evaluate" });
    } catch { finish(); }
  });
  try {
    await Promise.all(Array.from({ length: workerCount }, (_, index) =>
      index * groupSize).filter(index => index < queries.length).map(evaluateGroup));
    const missing = queries.map((query, index) => ({ query, index }))
      .filter(entry => completions[entry.index] === undefined);
    if (missing.length) {
      const byId = new Map(missing.map(entry => [String(entry.query.queryId).trim(), entry]));
      visitNativeSpecialTerrainLosEntriesV1({ state,
        dataBundle: state.officialTerrainLosDataBundle,
        queries: missing.map(entry => entry.query), isolatePairFailures: true,
        observeCompletedPair: entry => {
          const original = byId.get(entry.queryId);
          completions[original.index] = packNativeSpecialTerrainLosCompletionV1(entry,
            original.query);
        },
      });
      observe({ stage: "special_terrain_los_missing_pairs_recovered",
        missingPairCount: missing.length, completedPairCount: completions.length });
    }
    if (Array.from(completions).some(entry => entry === undefined)) {
      throw new Error("NATIVE_LOS_COMPLETION_TRANSPORT_INCOMPLETE");
    }
    const failureCount = completions.filter(entry => entry.failure).length;
    const body = {
      schema: "starcraft_tmg_official_special_terrain_los_batch_v1",
      queryCount: completions.length,
      queryIds: completions.map(entry => entry.queryId),
      results: [],
      contextVerifiedOnce: true,
      adaptedStateBuiltOnce: true,
      ...(failureCount ? { isolatedPairFailureCount: failureCount,
        failedPairsRemainUnknown: true } : {}),
      everyModelPairStillEvaluatedByOfficialTerrainLos: true,
      rulesTruth: "official_grass_line_of_sight_batch_conformance",
      trainingTruth: false,
    };
    let resultsCharacters = 2 + Math.max(0, completions.length - 1);
    let capacityDiagnostic = null;
    for (const entry of completions) {
      resultsCharacters += entry.characterLength;
      if (resultsCharacters > bufferConstants.MAX_STRING_LENGTH) {
        capacityDiagnostic = { aggregateSealSkippedForProvenCapacity: true,
          aggregateLowerBoundChars: resultsCharacters,
          maximumStringLength: bufferConstants.MAX_STRING_LENGTH };
        break;
      }
    }
    const bodyTooLarge = Boolean(capacityDiagnostic)
      || canonicalStarcraftTmgJson(body).length - 2 + resultsCharacters
        > bufferConstants.MAX_STRING_LENGTH;
    let batchHash = null;
    if (!bodyTooLarge) {
      // Exactly the old canonical root and indexed full entries. Stream one
      // native entry at a time, never a huge duplicate assessment tree/string.
      const digest = createHash(STARCRAFT_TMG_HASH_ALGORITHM).update("{");
      let separator = "";
      for (const key of Object.keys(body).sort()) {
        digest.update(`${separator}${JSON.stringify(key)}:`);
        if (key === "results") {
          digest.update("[");
          for (const [index, entry] of completions.entries()) {
            if (index) digest.update(",");
            const text = inflateRawSync(entry.compressedEntry).toString("utf8");
            if (text.length !== entry.characterLength) {
              throw new Error("NATIVE_LOS_CANONICAL_TRANSPORT_CHANGED");
            }
            digest.update(text);
          }
          digest.update("]");
        } else digest.update(canonicalStarcraftTmgJson(body[key]));
        separator = ",";
      }
      batchHash = digest.update("}").digest("hex");
    }
    const preparedRows = new Map();
    const failures = new Map();
    for (const [index, query] of queries.entries()) {
      const entry = completions[index];
      // Preserve the historical raw-key lookup behavior, including whitespace.
      if (entry.queryId !== query.queryId) continue;
      if (entry.failure) failures.set(query.queryId, entry.failure);
      const row = bodyTooLarge ? entry.scalarRow : entry.primaryRow;
      if (row) preparedRows.set(query.queryId, row);
    }
    return { preparedRows, failures, batchHash,
      failure: bodyTooLarge ? "Invalid string length"
        : completions.find(entry => entry.failure)?.failure || null,
      ...(bodyTooLarge ? { recovery: {
        requestedPairCount: queries.length,
        completedPairCount: completions.length,
        recoveredCompletedPairCount: preparedRows.size,
        failedPairCount: failures.size,
        scalarFallbackCount: 0,
        precomputedScalarIdentityReuseCount: preparedRows.size,
        scalarIdentityRetagCount: 0,
        ...(capacityDiagnostic || {}),
      } } : {}),
    };
  } finally {
    await Promise.all(workers.map(worker => worker.terminate().catch(() => {})));
    await admission.release();
  }
}
