function batch(batchId, anchorIds) {
  return Object.freeze({ batchId, anchorIds: Object.freeze(anchorIds) });
}

export const OFFICIAL_PART_9_SEMANTIC_BATCH_PLAN_V1 = Object.freeze({
  schema: "starcraft_tmg_part_semantic_review_batch_plan_binding_v1",
  sourcePart: "9",
  coreClauseCandidateDenominatorHash: "64cf70a7af278cdc603cd05a2a2a997c7658ef27a7705ff91ed3afdbc86905aa",
  reviewPacketHash: "5efca96c848666c2df30a0ca0eecb86daa0e78d7633f1e4119ca9e15e6ce7623",
  reviewAuthority: "development_evidence_only",
  batches: Object.freeze([
    batch("part-9a", [
      "core:numbered:9.1",
      "core:numbered:9.1.1",
      "core:numbered:9.1.2",
      "core:numbered:9.1.3",
      "core:numbered:9.1.4",
      "core:numbered:9.1.5",
    ]),
    batch("part-9b", [
      "core:numbered:9.1.6",
      "core:numbered:9.1.7",
      "core:numbered:9.1.8",
      "core:numbered:9.1.9",
      "core:numbered:9.1.10",
      "core:numbered:9.1.11",
    ]),
    batch("part-9c", [
      "core:numbered:9.2",
      "core:numbered:9.2.1",
      "core:numbered:9.3",
    ]),
  ]),
});
