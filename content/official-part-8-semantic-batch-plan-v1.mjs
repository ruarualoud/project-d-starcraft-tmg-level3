function batch(batchId, anchorIds) {
  return Object.freeze({ batchId, anchorIds: Object.freeze(anchorIds) });
}

export const OFFICIAL_PART_8_SEMANTIC_BATCH_PLAN_V1 = Object.freeze({
  schema: "starcraft_tmg_part_semantic_review_batch_plan_binding_v1",
  sourcePart: "8",
  coreClauseCandidateDenominatorHash: "64cf70a7af278cdc603cd05a2a2a997c7658ef27a7705ff91ed3afdbc86905aa",
  reviewPacketHash: "072caf7f883672611ddea74d9f22df573a835c23a4326a975a04d4752f52c6aa",
  reviewAuthority: "development_evidence_only",
  batches: Object.freeze([
    batch("part-8a", [
      "core:numbered:8.1", "core:numbered:8.2", "core:numbered:8.2.1",
      "core:numbered:8.2.2", "core:numbered:8.3", "core:numbered:8.3.1",
      "core:numbered:8.3.2", "core:numbered:8.3.3", "core:numbered:8.4",
      "core:numbered:8.4.1", "core:numbered:8.4.2",
    ]),
    batch("part-8b", [
      "core:numbered:8.5", "core:numbered:8.5.1", "core:numbered:8.5.2",
      "core:numbered:8.5.3", "core:numbered:8.5.4", "core:numbered:8.5.5",
      "core:numbered:8.6", "core:numbered:8.6.1", "core:numbered:8.6.2",
    ]),
    batch("part-8c", [
      "core:numbered:8.7", "core:numbered:8.7.1", "core:numbered:8.7.2",
      "core:numbered:8.7.3", "core:numbered:8.7.4",
    ]),
    batch("part-8d", [
      "core:numbered:8.7.5", "core:numbered:8.7.6", "core:numbered:8.7.7",
    ]),
    batch("part-8e", ["core:numbered:8.8", "core:numbered:8.8.1"]),
    batch("part-8f", [
      "core:numbered:8.9", "core:numbered:8.9.1", "core:numbered:8.9.2",
      "core:numbered:8.9.3", "core:numbered:8.9.4", "core:numbered:8.9.5",
      "core:numbered:8.9.6", "core:numbered:8.10",
    ]),
  ]),
});
