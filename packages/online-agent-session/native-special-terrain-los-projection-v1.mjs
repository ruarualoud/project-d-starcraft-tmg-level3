import { canonicalStarcraftTmgJson } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { projectStarcraftTmgTacticalLosPairRowV1 } from "./tactical-los-pair-row-v1.mjs";
import { deflateRawSync } from "node:zlib";
import { canonicalNativeSpecialTerrainLosEntryV1 } from
  "../rule-atoms/official-special-terrain-rules-kernel-v1.mjs";

// Called only on actual native completion observations. No public query can
// supply these lengths, identities or rows as prepared evidence.
export function projectNativeSpecialTerrainLosCompletionV1(entry, query) {
  const wrapper = { queryId: entry.queryId, result: null,
    ...(entry.failure ? { failure: entry.failure } : {}) };
  const characterLength = entry.result && Number.isSafeInteger(
    entry.nativeResultJsonCharacterLength)
    ? canonicalStarcraftTmgJson(wrapper).length - 4 + entry.nativeResultJsonCharacterLength
    : canonicalStarcraftTmgJson({ ...wrapper, result: entry.result }).length;
  if (!entry.result) return { queryId: entry.queryId, characterLength,
    failure: entry.failure || null, primaryRow: null, scalarRow: null };
  const scalar = entry.scalarEquivalentResult;
  if (!scalar || scalar.planId !== query.scalarFallbackPlanId) {
    throw new Error("NATIVE_LOS_SCALAR_IDENTITY_MISSING");
  }
  return {
    queryId: entry.queryId, characterLength, failure: entry.failure || null,
    primaryRow: projectStarcraftTmgTacticalLosPairRowV1(entry.result,
      query.attackerModelId, query.targetModelId,
      "official_special_terrain_grass_los_batch_adapter_v1"),
    scalarRow: projectStarcraftTmgTacticalLosPairRowV1(scalar,
      query.attackerModelId, query.targetModelId,
      "official_special_terrain_grass_los_adapter_v1"),
  };
}

export function packNativeSpecialTerrainLosCompletionV1(entry, query) {
  const completion = projectNativeSpecialTerrainLosCompletionV1(entry, query);
  const text = canonicalNativeSpecialTerrainLosEntryV1({
    queryId: entry.queryId, result: entry.result,
    ...(entry.failure ? { failure: entry.failure } : {}),
  });
  if (text.length !== completion.characterLength) {
    throw new Error("NATIVE_LOS_CANONICAL_LENGTH_MISMATCH");
  }
  // Preserve exact canonical bytes even if the worker later exits. Low-level
  // compression saves copying the full assessment trees; it changes no facts
  // or identity bytes. An owned ArrayBuffer is transferred, never shared.
  const compressedEntry = Uint8Array.from(deflateRawSync(text, { level: 1 }));
  return { ...completion, compressedEntry };
}
