function reviewed(clauseId, anchorId, candidateOrdinalStart, candidateOrdinalEnd, semanticClass, title, reasonCode = "rule_atom_mapping_pending") {
  return Object.freeze({
    clauseId,
    anchorId,
    candidateOrdinalStart,
    candidateOrdinalEnd,
    semanticClass,
    title,
    disposition: "review_required",
    reasonCode,
  });
}

function display(clauseId, anchorId, candidateOrdinalStart, candidateOrdinalEnd, semanticClass, title, reasonCode) {
  return Object.freeze({
    clauseId,
    anchorId,
    candidateOrdinalStart,
    candidateOrdinalEnd,
    semanticClass,
    title,
    disposition: "display_only",
    reasonCode,
  });
}

export const OFFICIAL_PART_4_SEMANTIC_REVIEW_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_part_semantic_clause_review_binding_v1",
  sourcePart: "4",
  coreClauseCandidateDenominatorHash: "64cf70a7af278cdc603cd05a2a2a997c7658ef27a7705ff91ed3afdbc86905aa",
  reviewPacketHash: "bd504e954021ef54350e967c103380b4969265292cc8aec8654a84a26416a17d",
  reviewMethod: "semantic_review_against_gitignored_official_source_packet",
  reviewAuthority: "development_evidence_only",
  clauses: Object.freeze([
    reviewed("core:4.1:measurement-unit", "core:numbered:4.1", 1, 1, "definition", "Distance measurement unit"),
    reviewed("core:4.1:premeasurement", "core:numbered:4.1", 2, 2, "permission", "Unrestricted premeasurement"),
    display("core:4.1:measurement-agreement-guidance", "core:numbered:4.1", 3, 3, "rationale", "Measurement agreement guidance", "non_normative_guidance"),
    reviewed("core:4.1:model-distance", "core:numbered:4.1", 4, 4, "definition", "Nearest-base model distance"),
    reviewed("core:4.1:flight-stand-distance", "core:numbered:4.1", 5, 5, "definition", "Flight stand distance reference"),
    reviewed("core:4.1:ignore-overhang", "core:numbered:4.1", 6, 6, "constraint", "Base overhang exclusion"),
    reviewed("core:4.1:base-contact-zero", "core:numbered:4.1", 7, 7, "definition", "Base contact distance"),
    reviewed("core:4.1:token-marker-distance", "core:numbered:4.1", 8, 8, "definition", "Token and marker distance"),
    reviewed("core:4.1:elevation-distance", "core:numbered:4.1", 9, 11, "constraint", "Horizontal elevation distance"),
    reviewed("core:4.1:movement-distance-routing", "core:numbered:4.1", 12, 12, "cross_reference", "Movement-specific distance routing", "cross_part_semantic_reconciliation_pending"),
    display("core:4.1:distance-examples", "core:numbered:4.1", 13, 15, "example", "Distance measurement diagrams", "non_normative_example"),
    display("core:4.1:elevation-designer-note", "core:numbered:4.1", 16, 17, "rationale", "Elevation measurement design note", "designer_commentary"),
    display("core:4.1:range-examples", "core:numbered:4.1", 18, 22, "example", "Within and wholly-within diagrams", "non_normative_example"),

    reviewed("core:4.2:model-within", "core:numbered:4.2", 1, 1, "definition", "Model within definition"),
    reviewed("core:4.2:unit-within", "core:numbered:4.2", 2, 2, "definition", "Unit within definition"),
    reviewed("core:4.2:model-wholly-within", "core:numbered:4.2", 3, 3, "definition", "Model wholly-within definition"),
    reviewed("core:4.2:unit-wholly-within", "core:numbered:4.2", 4, 4, "definition", "Unit wholly-within definition"),

    reviewed("core:4.3:leading-model-nomination", "core:numbered:4.3", 1, 1, "timing", "Leading model nomination scope"),
    reviewed("core:4.3:leading-model-first", "core:numbered:4.3", 2, 2, "constraint", "Leading model moves first"),
    reviewed("core:4.3:remaining-model-placement", "core:numbered:4.3", 3, 3, "constraint", "Remaining model placement and nomination expiry"),

    reviewed("core:4.4:coherency-check-trigger", "core:numbered:4.4", 1, 1, "timing", "Coherency check trigger"),
    reviewed("core:4.4:in-coherency", "core:numbered:4.4", 2, 3, "definition", "In-coherency conditions"),
    display("core:4.4:coherency-obstacle-rationale", "core:numbered:4.4", 4, 5, "rationale", "Coherency obstacle context", "non_normative_rationale"),
    reviewed("core:4.4:closest-legal-coherency", "core:numbered:4.4", 6, 7, "constraint", "Closest legal coherency fallback"),
    reviewed("core:4.4:no-link-casualty", "core:numbered:4.4", 8, 8, "constraint", "No legal coherency link casualty"),
    reviewed("core:4.4:coherency-lifecycle", "core:numbered:4.4", 9, 11, "timing", "Coherency lifecycle and casualty exclusion"),
    reviewed("core:4.4:in-coherency-mission-capability", "core:numbered:4.4", 12, 12, "constraint", "In-coherency mission capability"),
    reviewed("core:4.4:coherency-placement-sequence", "core:numbered:4.4", 13, 14, "constraint", "Coherency placement sequence"),
    reviewed("core:4.4:coherency-link-path", "core:numbered:4.4", 15, 16, "definition", "Coherency link path and exceptions"),
    reviewed("core:4.4:placement-link-casualty", "core:numbered:4.4", 17, 17, "constraint", "Invalid placement link casualty"),
    reviewed("core:4.4:flying-coherency-links", "core:numbered:4.4", 18, 19, "permission", "Flying coherency link bypass"),
    reviewed("core:4.4:out-of-coherency", "core:numbered:4.4", 20, 20, "definition", "Out-of-coherency condition"),
    reviewed("core:4.4:out-of-coherency-mission-restriction", "core:numbered:4.4", 21, 21, "constraint", "Out-of-coherency mission restriction"),
    display("core:4.4:coherency-examples", "core:numbered:4.4", 22, 24, "example", "Coherency placement diagrams", "non_normative_example"),

    reviewed("core:4.5:direct-movement-vector", "core:numbered:4.5", 1, 3, "definition", "Direct movement vector"),
    reviewed("core:4.5:blocked-direct-movement", "core:numbered:4.5", 4, 4, "constraint", "Blocked direct movement bypass"),
    reviewed("core:4.5:direct-movement-endpoints", "core:numbered:4.5", 5, 6, "constraint", "Direct movement endpoint constraints"),
    reviewed("core:4.5:multi-model-towards", "core:numbered:4.5", 7, 9, "constraint", "Multi-model directly-towards sequence"),
    reviewed("core:4.5:multi-model-away", "core:numbered:4.5", 10, 12, "constraint", "Multi-model directly-away sequence"),
    reviewed("core:4.5:multi-model-target-reference", "core:numbered:4.5", 13, 13, "definition", "Target-unit reference model"),
    reviewed("core:4.5:battlefield-edge-stop", "core:numbered:4.5", 14, 14, "constraint", "Involuntary movement battlefield edge"),

    display("core:4.6:size-flavour", "core:numbered:4.6", 1, 1, "rationale", "Model size and gap flavour", "non_normative_rationale"),
    reviewed("core:4.6:gap-definition", "core:numbered:4.6", 2, 2, "definition", "Movement gap definition"),
    reviewed("core:4.6:small-size-clearance", "core:numbered:4.6", 3, 3, "constraint", "Small-size gap clearance"),
    display("core:4.6:narrow-unit-rationale", "core:numbered:4.6", 4, 4, "rationale", "Narrow-unit clearance rationale", "non_normative_rationale"),
    reviewed("core:4.6:large-size-clearance", "core:numbered:4.6", 5, 5, "constraint", "Large-size gap clearance"),
    reviewed("core:4.6:clearance-versus-placement", "core:numbered:4.6", 6, 7, "constraint", "Gap clearance versus legal placement"),
    reviewed("core:4.6:terrain-opening-gap", "core:numbered:4.6", 8, 9, "definition", "Terrain opening as gap"),
    reviewed("core:4.6:passable-opening-agreement", "core:numbered:4.6", 10, 10, "constraint", "Passable opening setup agreement"),
    reviewed("core:4.6:gap-clearance-movement-scope", "core:numbered:4.6", 11, 11, "classification", "Gap clearance movement scope"),
    reviewed("core:4.6:flying-gap-bypass", "core:numbered:4.6", 12, 13, "permission", "Flying gap-clearance bypass"),
    reviewed("core:4.6:flying-legal-endpoint", "core:numbered:4.6", 14, 14, "constraint", "Flying legal endpoint"),
  ]),
});
