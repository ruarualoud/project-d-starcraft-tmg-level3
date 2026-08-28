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

export const OFFICIAL_PART_2_SEMANTIC_REVIEW_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_part_semantic_clause_review_binding_v1",
  sourcePart: "2",
  coreClauseCandidateDenominatorHash: "64cf70a7af278cdc603cd05a2a2a997c7658ef27a7705ff91ed3afdbc86905aa",
  reviewPacketHash: "77be645cc83af8ec825ac155a4f19d0353152d7fee7dd0b28ef5b9a2ffa524a4",
  reviewMethod: "semantic_review_against_gitignored_official_source_packet",
  reviewAuthority: "development_evidence_only",
  clauses: Object.freeze([
    reviewed("core:2.1:model-definition", "core:numbered:2.1", 1, 1, "definition", "Model definition"),
    reviewed("core:2.1:base-rules-interface", "core:numbered:2.1", 2, 2, "definition", "Base as rules interface"),
    reviewed("core:2.1:miniature-aesthetic-exclusion", "core:numbered:2.1", 3, 3, "constraint", "Miniature excluded from rules geometry"),

    reviewed("core:2.2:army-unit-definition", "core:numbered:2.2", 1, 2, "definition", "Army and unit relationship"),
    reviewed("core:2.2:composition-card-count", "core:numbered:2.2", 3, 3, "definition", "Unit composition source"),
    display("core:2.2:composition-example", "core:numbered:2.2", 4, 4, "example", "Unit composition example", "non_normative_example"),
    reviewed("core:2.2:cohesion-and-coherency", "core:numbered:2.2", 5, 6, "constraint", "Unit cohesion and coherency"),
    reviewed("core:2.2:friendly-unit-definition", "core:numbered:2.2", 7, 7, "definition", "Friendly unit definition"),
    reviewed("core:2.2:enemy-unit-definition", "core:numbered:2.2", 8, 8, "definition", "Enemy unit definition"),

    reviewed("core:2.3:base-rules-interface", "core:numbered:2.3", 1, 3, "definition", "Base measurement and geometry interface"),
    reviewed("core:2.3:correct-base-size", "core:numbered:2.3", 4, 4, "constraint", "Correct base size requirement"),
    display("core:2.3:base-size-rationale", "core:numbered:2.3", 5, 5, "rationale", "Base size consistency rationale", "non_normative_rationale"),
    reviewed("core:2.3:no-base-overlap", "core:numbered:2.3", 6, 7, "constraint", "Base overlap prohibition"),
    reviewed("core:2.3:scenic-customization-boundary", "core:numbered:2.3", 8, 9, "permission", "Scenic customization rules boundary"),
    display("core:2.3:scenic-examples", "core:numbered:2.3", 10, 11, "example", "Scenic size examples", "non_normative_example"),
    reviewed("core:2.3:flight-stand-base", "core:numbered:2.3", 12, 12, "definition", "Flight stand measurement base"),
    reviewed("core:2.3:wobbly-model-position", "core:numbered:2.3", 13, 15, "constraint", "Agreed position for unstable placement"),

    reviewed("core:2.4:tag-definition", "core:numbered:2.4", 1, 2, "definition", "Tag keyword purpose"),

    reviewed("core:2.4.1:faction-tag-definition", "core:numbered:2.4.1", 1, 1, "definition", "Faction tag definition"),
    reviewed("core:2.4.1:race-tags", "core:numbered:2.4.1", 2, 2, "classification", "Race tag categories"),
    reviewed("core:2.4.1:sub-faction-tags", "core:numbered:2.4.1", 3, 3, "classification", "Sub-faction tag categories"),
    reviewed("core:2.4.1:army-building-faction-match", "core:numbered:2.4.1", 4, 4, "constraint", "Army-building faction tag match"),

    reviewed("core:2.4.2:combat-tag-definition", "core:numbered:2.4.2", 1, 1, "definition", "Combat tag definition"),
    reviewed("core:2.4.2:combat-tag-list", "core:numbered:2.4.2", 2, 2, "classification", "Combat tag categories"),
    reviewed("core:2.4.2:tag-targeting", "core:numbered:2.4.2", 3, 3, "constraint", "Tag-based weapon targeting"),
    reviewed("core:2.4.2:surge-type-match", "core:numbered:2.4.2", 4, 4, "constraint", "Surge type tag match"),
    reviewed("core:2.4.2:tag-conditional-bonuses", "core:numbered:2.4.2", 5, 5, "rule_summary", "Tag-conditional ability summary", "cross_keyword_reconciliation_pending"),

    reviewed("core:2.5:role-taxonomy", "core:numbered:2.5", 1, 2, "definition", "Player role taxonomy"),
    reviewed("core:2.5:active-player-definition", "core:numbered:2.5", 3, 4, "definition", "Active player and response priority context"),
    reviewed("core:2.5:controlling-player-definition", "core:numbered:2.5", 5, 6, "definition", "Controlling player decisions"),
    reviewed("core:2.5:control-transfer", "core:numbered:2.5", 7, 7, "constraint", "Transferred control behavior"),
    reviewed("core:2.5:friendly-enemy-definition", "core:numbered:2.5", 8, 9, "definition", "Friendly and enemy ownership"),
    reviewed("core:2.5:team-friendly-status", "core:numbered:2.5", 10, 10, "definition", "Team friendly status"),

    reviewed("core:2.6.1:keyword-format", "core:numbered:2.6.1", 1, 2, "definition", "Keyword presentation format"),
    reviewed("core:2.6.1:keyword-meaning", "core:numbered:2.6.1", 3, 3, "definition", "Keyword meaning invariance"),
    display("core:2.6.1:glossary-cross-reference", "core:numbered:2.6.1", 4, 4, "cross_reference", "Keyword glossary cross-reference", "source_cross_reference_only"),
    reviewed("core:2.6.1:keyword-no-stack", "core:numbered:2.6.1", 5, 6, "constraint", "Same keyword non-stacking"),
    reviewed("core:2.6.1:numeric-keyword-highest", "core:numbered:2.6.1", 7, 7, "priority", "Highest numeric keyword value"),

    reviewed("core:2.6.2:specific-over-general", "core:numbered:2.6.2", 1, 2, "priority", "Specific rule precedence"),

    reviewed("core:2.7:ability-category-summary", "core:numbered:2.7", 1, 2, "classification", "Special ability category summary"),
    display("core:2.7:part-10-cross-reference", "core:numbered:2.7", 3, 3, "cross_reference", "Detailed ability rules cross-reference", "source_cross_reference_only"),

    reviewed("core:2.7.1:active-ability-timing", "core:numbered:2.7.1", 1, 1, "timing", "Active ability timing summary"),
    reviewed("core:2.7.1:active-no-mid-action", "core:numbered:2.7.1", 2, 2, "constraint", "Active ability interruption prohibition"),
    reviewed("core:2.7.1:active-reserves", "core:numbered:2.7.1", 3, 3, "constraint", "Active ability reserve restriction"),
    reviewed("core:2.7.1:active-per-unit-round-limit", "core:numbered:2.7.1", 4, 4, "constraint", "Active ability per-unit round limit"),
    reviewed("core:2.7.1:active-expiry", "core:numbered:2.7.1", 5, 5, "timing", "Active ability default expiry"),
    reviewed("core:2.7.1:ground-terminology-note", "core:numbered:2.7.1", 6, 6, "terminology_note", "Ground tag and elevation distinction", "cross_part_semantic_reconciliation_pending"),

    reviewed("core:2.7.2:passive-ability-definition", "core:numbered:2.7.2", 1, 2, "definition", "Passive ability behavior"),
    reviewed("core:2.7.2:passive-reserves", "core:numbered:2.7.2", 3, 3, "constraint", "Passive ability reserve restriction"),

    reviewed("core:2.7.3:reaction-ability-definition", "core:numbered:2.7.3", 1, 2, "definition", "Reaction ability behavior"),
    reviewed("core:2.7.3:reaction-trigger-window", "core:numbered:2.7.3", 3, 4, "timing", "Reaction trigger declaration window"),
    reviewed("core:2.7.3:one-reaction-per-player-activation", "core:numbered:2.7.3", 5, 5, "constraint", "One reaction per player per activation"),
    reviewed("core:2.7.3:same-name-reaction-limit", "core:numbered:2.7.3", 6, 9, "constraint", "Same-name reaction per-unit round limit"),
    reviewed("core:2.7.3:reaction-priority", "core:numbered:2.7.3", 10, 10, "priority", "Reaction priority for a shared trigger"),
    reviewed("core:2.7.3:reaction-reserves", "core:numbered:2.7.3", 11, 11, "constraint", "Reaction reserve restriction"),
    display("core:2.7.3:reaction-examples", "core:numbered:2.7.3", 12, 13, "example", "Reaction limit examples", "non_normative_example"),
  ]),
});
