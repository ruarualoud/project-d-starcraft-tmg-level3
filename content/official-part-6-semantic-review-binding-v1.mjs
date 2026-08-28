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

export const OFFICIAL_PART_6_SEMANTIC_REVIEW_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_part_semantic_clause_review_binding_v1",
  sourcePart: "6",
  coreClauseCandidateDenominatorHash: "64cf70a7af278cdc603cd05a2a2a997c7658ef27a7705ff91ed3afdbc86905aa",
  reviewPacketHash: "5a678a9a040bd6abce2618db860ec45a48850c8183a037389cb34f1a19824725",
  reviewMethod: "semantic_review_against_gitignored_official_source_packet",
  reviewAuthority: "development_evidence_only",
  clauses: Object.freeze([
    reviewed("core:6.1:supply-profile", "core:numbered:6.1", 1, 1, "definition", "Current supply profile"),
    reviewed("core:6.1:supply-update", "core:numbered:6.1", 2, 2, "timing", "Immediate supply update"),
    display("core:6.1:supply-example", "core:numbered:6.1", 3, 5, "example", "Supply profile example", "non_normative_example"),

    reviewed("core:6.2:supply-pool", "core:numbered:6.2", 1, 2, "definition", "Supply pool and escalation"),
    reviewed("core:6.2:available-supply", "core:numbered:6.2", 3, 3, "constraint", "Reserve deployment available supply"),
    reviewed("core:6.2:battlefield-supply-cap", "core:numbered:6.2", 4, 4, "constraint", "Battlefield supply cap"),
    reviewed("core:6.2:final-round-unlimited-supply", "core:numbered:6.2", 5, 6, "permission", "Final-round unlimited supply"),
    reviewed("core:6.2:marker-control", "core:numbered:6.2", 7, 9, "constraint", "Mission marker supply control"),
    reviewed("core:6.2:supply-zero-control", "core:numbered:6.2", 10, 10, "permission", "Uncontested supply-zero control"),
    reviewed("core:6.2:coherency-control-restriction", "core:numbered:6.2", 11, 11, "constraint", "Out-of-coherency marker restriction"),
    reviewed("core:6.2:flying-control-restriction", "core:numbered:6.2", 12, 12, "constraint", "Flying marker restriction"),
    display("core:6.2:tactical-mass-intro", "core:numbered:6.2", 13, 13, "rationale", "Tactical mass narrative introduction", "non_normative_rationale"),
    reviewed("core:6.2:disengage-penalty", "core:numbered:6.2", 14, 14, "constraint", "Disengage follow-up penalty"),
    display("core:6.2:disengage-rationale", "core:numbered:6.2", 15, 15, "rationale", "Disengage penalty rationale", "non_normative_rationale"),
    reviewed("core:6.2:tactical-mass-exception", "core:numbered:6.2", 16, 16, "constraint", "Superior-supply disengage exception"),
    display("core:6.2:tactical-mass-rationale", "core:numbered:6.2", 17, 17, "rationale", "Tactical mass exception rationale", "non_normative_rationale"),
    reviewed("core:6.2:destroyed-supply-scoring", "core:numbered:6.2", 18, 19, "constraint", "Destroyed supply scoring"),
    display("core:6.2:supply-designer-note", "core:numbered:6.2", 20, 22, "rationale", "Supply system designer note", "designer_commentary"),
    display("core:6.2:los-diagram", "core:numbered:6.2", 23, 25, "example", "Line-of-sight terrain diagram", "non_normative_example"),
  ]),
});
