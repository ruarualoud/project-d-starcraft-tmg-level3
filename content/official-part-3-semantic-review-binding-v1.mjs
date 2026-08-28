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

export const OFFICIAL_PART_3_SEMANTIC_REVIEW_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_part_semantic_clause_review_binding_v1",
  sourcePart: "3",
  coreClauseCandidateDenominatorHash: "64cf70a7af278cdc603cd05a2a2a997c7658ef27a7705ff91ed3afdbc86905aa",
  reviewPacketHash: "8578945cecb696103532d6d265b608df0712b9f349dca9c3ec1865ebb53114e1",
  reviewMethod: "semantic_review_against_gitignored_official_source_packet",
  reviewAuthority: "development_evidence_only",
  clauses: Object.freeze([
    reviewed("core:3.1:dice-system", "core:numbered:3.1", 1, 1, "definition", "Core dice type"),
    reviewed("core:3.1:d6-resolution", "core:numbered:3.1", 2, 3, "definition", "D6 result generation"),
    reviewed("core:3.1:d3-resolution", "core:numbered:3.1", 4, 4, "definition", "D3 result mapping"),
    reviewed("core:3.1:multiple-dice-resolution", "core:numbered:3.1", 5, 5, "definition", "Multiple-dice result generation"),

    reviewed("core:3.2:roll-off", "core:numbered:3.2", 1, 3, "constraint", "Roll-off resolution and tie handling"),

    reviewed("core:3.3:reroll-replacement", "core:numbered:3.3", 1, 3, "constraint", "Re-roll replaces original result"),
    reviewed("core:3.3:reroll-scope", "core:numbered:3.3", 4, 5, "constraint", "Default and specified re-roll scope"),

    reviewed("core:3.4:modifier-target-and-timing", "core:numbered:3.4", 1, 2, "timing", "Target-number modifier application"),
    reviewed("core:3.4:positive-modifier", "core:numbered:3.4", 3, 3, "definition", "Positive modifier direction"),
    reviewed("core:3.4:negative-modifier", "core:numbered:3.4", 4, 4, "definition", "Negative modifier direction"),
    reviewed("core:3.4:named-source-stacking", "core:numbered:3.4", 5, 5, "constraint", "Different named modifier source stacking"),
    display("core:3.4:modifier-example", "core:numbered:3.4", 6, 10, "example", "Target-number modifier example", "non_normative_example"),
    reviewed("core:3.4:ability-modifier-interpretation", "core:numbered:3.4", 11, 11, "rule_summary", "Ability modifier direction examples", "cross_profile_terminology_reconciliation_pending"),
    reviewed("core:3.4:target-number-bounds", "core:numbered:3.4", 12, 12, "constraint", "Modified target-number bounds"),
    reviewed("core:3.4:null-capability", "core:numbered:3.4", 13, 14, "constraint", "Null capability cannot gain a roll"),

    reviewed("core:3.5:generated-value-expression", "core:numbered:3.5", 1, 3, "definition", "Generated-value arithmetic expression"),

    display("core:3.6:uncertainty-rationale", "core:numbered:3.6", 1, 2, "rationale", "Dice uncertainty rationale", "non_normative_rationale"),
    reviewed("core:3.6:natural-roll-boundaries", "core:numbered:3.6", 3, 4, "constraint", "Natural success and failure boundaries"),

    reviewed("core:3.7:test-definition", "core:numbered:3.7", 1, 2, "definition", "Test and target-number definition"),
    display("core:3.7:modifier-designer-note", "core:numbered:3.7", 3, 3, "rationale", "Target-number modifier design note", "designer_commentary"),
    reviewed("core:3.7:characteristic-test", "core:numbered:3.7", 4, 4, "classification", "Characteristic test classification"),
    display("core:3.7:characteristic-test-example", "core:numbered:3.7", 5, 5, "example", "Characteristic test example", "non_normative_example"),
    reviewed("core:3.7:attribute-test", "core:numbered:3.7", 6, 6, "classification", "Attribute test classification"),
    display("core:3.7:attribute-test-example", "core:numbered:3.7", 7, 7, "example", "Attribute test example", "non_normative_example"),
    reviewed("core:3.7:value-generation-is-not-test", "core:numbered:3.7", 8, 11, "classification", "Value generation excluded from tests"),
    reviewed("core:3.7:test-resolution", "core:numbered:3.7", 12, 14, "constraint", "Test resolution sequence"),

    reviewed("core:3.8:invalid-die-reroll", "core:numbered:3.8", 1, 2, "constraint", "Invalid die reroll"),
    reviewed("core:3.8:cocked-die-agreement", "core:numbered:3.8", 3, 4, "constraint", "Cocked die agreement and default test"),
  ]),
});
