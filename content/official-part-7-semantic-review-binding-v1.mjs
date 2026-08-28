function reviewed(clauseId, anchorId, candidateOrdinalStart, candidateOrdinalEnd, semanticClass, title, reasonCode = "rule_atom_mapping_pending") {
  return Object.freeze({ clauseId, anchorId, candidateOrdinalStart, candidateOrdinalEnd, semanticClass, title, disposition: "review_required", reasonCode });
}
function display(clauseId, anchorId, candidateOrdinalStart, candidateOrdinalEnd, semanticClass, title, reasonCode) {
  return Object.freeze({ clauseId, anchorId, candidateOrdinalStart, candidateOrdinalEnd, semanticClass, title, disposition: "display_only", reasonCode });
}

export const OFFICIAL_PART_7_SEMANTIC_REVIEW_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_part_semantic_clause_review_binding_v1",
  sourcePart: "7",
  coreClauseCandidateDenominatorHash: "64cf70a7af278cdc603cd05a2a2a997c7658ef27a7705ff91ed3afdbc86905aa",
  reviewPacketHash: "9c6e09aab27e80ba17c60fe05505f9567d70fbd85bc01f8f6a1575fff64be624",
  reviewMethod: "semantic_review_against_gitignored_official_source_packet",
  reviewAuthority: "development_evidence_only",
  clauses: Object.freeze([
    reviewed("core:7.1:los-purpose", "core:numbered:7.1", 1, 2, "rule_summary", "Line-of-sight purpose"),
    reviewed("core:7.1:top-down-method", "core:numbered:7.1", 3, 4, "definition", "Top-down line-of-sight method"),
    reviewed("core:7.1:base-to-base-trace", "core:numbered:7.1", 5, 5, "constraint", "Base-to-base line trace"),
    reviewed("core:7.1:clear-trace-visible", "core:numbered:7.1", 6, 7, "constraint", "Clear trace visibility"),
    reviewed("core:7.1:blocking-terrain-cover-check", "core:numbered:7.1", 8, 10, "constraint", "Blocking terrain cover check"),
    reviewed("core:7.1:terrain-footprint", "core:numbered:7.1", 11, 11, "definition", "Terrain footprint and openings"),
    reviewed("core:7.1:movement-opening-distinction", "core:numbered:7.1", 12, 12, "constraint", "Movement and sight opening distinction"),
    reviewed("core:7.1:setup-footprint-agreement", "core:numbered:7.1", 13, 13, "constraint", "Terrain footprint setup agreement"),
    display("core:7.1:los-designer-note", "core:numbered:7.1", 14, 14, "rationale", "Top-down sight designer note", "designer_commentary"),
    display("core:7.1:los-examples", "core:numbered:7.1", 15, 19, "example", "Line-of-sight terrain examples", "non_normative_example"),

    reviewed("core:7.1.1:cover-overview", "core:numbered:7.1.1", 1, 1, "rule_summary", "Terrain cover overview"),
    reviewed("core:7.1.1:full-cover", "core:numbered:7.1.1", 2, 2, "constraint", "Full cover condition"),
    reviewed("core:7.1.1:direct-cover", "core:numbered:7.1.1", 3, 3, "constraint", "Direct cover condition"),
    reviewed("core:7.1.1:independent-terrain-cover", "core:numbered:7.1.1", 4, 6, "constraint", "Independent terrain cover evaluation"),
    reviewed("core:7.1.1:elevation-dead-zone", "core:numbered:7.1.1", 7, 8, "constraint", "Elevation dead zone"),
    reviewed("core:7.1.1:close-quarters", "core:numbered:7.1.1", 9, 9, "constraint", "Close-quarters cover override"),
    display("core:7.1.1:elevation-dead-zone-example", "core:numbered:7.1.1", 10, 10, "example", "Elevation dead-zone example", "non_normative_example"),
    display("core:7.1.1:close-quarters-example", "core:numbered:7.1.1", 11, 13, "example", "Close-quarters example", "non_normative_example"),

    reviewed("core:7.1.2:model-effective-size", "core:numbered:7.1.2", 1, 1, "definition", "Elevated model effective size"),
    display("core:7.1.2:effective-size-example", "core:numbered:7.1.2", 2, 3, "example", "Elevated model size example", "non_normative_example"),
    reviewed("core:7.1.2:top-down-terrain-surface", "core:numbered:7.1.2", 4, 4, "constraint", "Top-down terrain surface exclusion"),
    reviewed("core:7.1.2:stacking-terrain", "core:numbered:7.1.2", 5, 5, "definition", "Stacked terrain effective size"),
    display("core:7.1.2:high-ground-tactical-advice", "core:numbered:7.1.2", 6, 6, "rationale", "High-ground tactical advice", "non_normative_strategy_advice"),
    display("core:7.1.2:stacked-elevation-example", "core:numbered:7.1.2", 7, 9, "example", "Stacked elevation sight example", "non_normative_example"),

    reviewed("core:7.1.3:high-ground-evade", "core:numbered:7.1.3", 1, 1, "constraint", "High-ground evade eligibility"),
    reviewed("core:7.1.3:lower-elevation-origin", "core:numbered:7.1.3", 2, 2, "definition", "Lower-elevation attack origin"),
    reviewed("core:7.1.3:flying-no-high-ground-cover", "core:numbered:7.1.3", 3, 3, "constraint", "Flying high-ground cover exclusion"),
    reviewed("core:7.1.3:flying-origin", "core:numbered:7.1.3", 4, 4, "constraint", "Flying attack elevation origin"),

    reviewed("core:7.1.4:flying-ignore-full-cover", "core:numbered:7.1.4", 1, 1, "permission", "Flying ignores full cover"),
    reviewed("core:7.1.4:flying-cover-rules-retained", "core:numbered:7.1.4", 2, 2, "constraint", "Flying retained cover rules"),
    reviewed("core:7.1.4:flying-effective-size", "core:numbered:7.1.4", 3, 4, "constraint", "Flying effective size and direct-cover interaction"),
    display("core:7.1.4:high-ground-designer-note", "core:numbered:7.1.4", 5, 5, "rationale", "High-ground cover designer note", "designer_commentary"),
    display("core:7.1.4:los-method-summary", "core:numbered:7.1.4", 6, 20, "rule_summary", "Line-of-sight method visual summary", "display_summary_table"),
    display("core:7.1.4:cover-summary-table", "core:numbered:7.1.4", 21, 30, "rule_summary", "Cover and elevation quick-reference tables", "display_summary_table"),
    display("core:7.1.4:engaged-units-heading", "core:numbered:7.1.4", 31, 31, "cross_reference", "Following engaged-units heading", "display_section_heading"),

    reviewed("core:7.2:engagement-range", "core:numbered:7.2", 1, 1, "definition", "Engagement range"),
    reviewed("core:7.2:model-engaged", "core:numbered:7.2", 2, 2, "definition", "Engaged model condition"),
    reviewed("core:7.2:movement-engagement-restriction", "core:numbered:7.2", 3, 3, "constraint", "Enemy engagement-range endpoint restriction"),
    reviewed("core:7.2:unit-engaged", "core:numbered:7.2", 4, 4, "definition", "Engaged unit propagation"),

    reviewed("core:7.2.1:ground-tag-engagement", "core:numbered:7.2.1", 1, 1, "constraint", "Ground combat-tag engagement"),
    reviewed("core:7.2.1:flying-not-engaged", "core:numbered:7.2.1", 2, 2, "constraint", "Flying engagement exclusion"),
    reviewed("core:7.2.1:terrain-engagement", "core:numbered:7.2.1", 3, 5, "constraint", "Terrain size engagement blocking"),
    reviewed("core:7.2.1:elevation-engagement", "core:numbered:7.2.1", 6, 6, "constraint", "High-to-ground engagement exclusion"),
    reviewed("core:7.2.1:mid-ground-access-engagement", "core:numbered:7.2.1", 7, 7, "constraint", "Mid-ground access-point engagement"),

    reviewed("core:7.3.1:token-definition", "core:numbered:7.3.1", 1, 1, "definition", "Battlefield token definition"),
    reviewed("core:7.3.1:token-terrain", "core:numbered:7.3.1", 2, 2, "classification", "Token terrain classification"),
    reviewed("core:7.3.1:token-movement", "core:numbered:7.3.1", 3, 3, "constraint", "Token movement and overlap"),
    reviewed("core:7.3.1:token-expiry", "core:numbered:7.3.1", 4, 4, "timing", "Token default expiry"),
    reviewed("core:7.3.1:token-measurement", "core:numbered:7.3.1", 5, 5, "definition", "Token measurement edge"),

    reviewed("core:7.3.2:marker-definition", "core:numbered:7.3.2", 1, 3, "definition", "Marker physical and blocking properties"),
    reviewed("core:7.3.2:mission-marker", "core:numbered:7.3.2", 4, 6, "definition", "Mission marker specification"),
    reviewed("core:7.3.2:activation-marker", "core:numbered:7.3.2", 7, 9, "definition", "Activation marker phase state"),
    reviewed("core:7.3.2:faction-indicator", "core:numbered:7.3.2", 10, 11, "definition", "Faction indicator uses"),
    reviewed("core:7.3.2:mode-marker", "core:numbered:7.3.2", 12, 14, "definition", "Mode marker persistence"),
    reviewed("core:7.3.2:zone-of-influence-marker", "core:numbered:7.3.2", 15, 16, "definition", "Zone-of-influence marker placement"),
    reviewed("core:7.3.2:first-player-marker", "core:numbered:7.3.2", 17, 19, "definition", "First-player marker lifecycle"),
    reviewed("core:7.3.2:buff-debuff-marker", "core:numbered:7.3.2", 20, 21, "definition", "Buff and debuff markers"),

    reviewed("core:7.4:unit-destroyed", "core:numbered:7.4", 1, 1, "definition", "Unit destroyed condition"),
    reviewed("core:7.4:destroyed-unit-effects-end", "core:numbered:7.4", 2, 2, "timing", "Destroyed unit local effects end"),
    reviewed("core:7.4:destroyed-unit-tokens", "core:numbered:7.4", 3, 3, "timing", "Destroyed unit token removal"),
    reviewed("core:7.4:outward-effects-remain", "core:numbered:7.4", 4, 4, "timing", "Destroyed unit outward effects remain"),
    reviewed("core:7.4:return-to-play", "core:numbered:7.4", 5, 5, "constraint", "Destroyed unit return restriction"),
  ]),
});
