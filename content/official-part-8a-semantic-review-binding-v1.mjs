function reviewed(
  clauseId,
  anchorId,
  candidateOrdinalStart,
  candidateOrdinalEnd,
  semanticClass,
  title,
  reasonCode = "rule_atom_mapping_pending",
) {
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

function display(
  clauseId,
  anchorId,
  candidateOrdinalStart,
  candidateOrdinalEnd,
  semanticClass,
  title,
  reasonCode,
) {
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

const ANCHOR_IDS = Object.freeze([
  "core:numbered:8.1",
  "core:numbered:8.2",
  "core:numbered:8.2.1",
  "core:numbered:8.2.2",
  "core:numbered:8.3",
  "core:numbered:8.3.1",
  "core:numbered:8.3.2",
  "core:numbered:8.3.3",
  "core:numbered:8.4",
  "core:numbered:8.4.1",
  "core:numbered:8.4.2",
]);

export const OFFICIAL_PART_8A_SEMANTIC_REVIEW_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_part_semantic_clause_batch_review_binding_v1",
  sourcePart: "8",
  batchId: "part-8a",
  coreClauseCandidateDenominatorHash: "64cf70a7af278cdc603cd05a2a2a997c7658ef27a7705ff91ed3afdbc86905aa",
  reviewPacketHash: "072caf7f883672611ddea74d9f22df573a835c23a4326a975a04d4752f52c6aa",
  batchPlanHash: "6ffb8d4fbbac87990c74aa8acca787dc772517c0c993a109e3174919fbfad74b",
  anchorIds: ANCHOR_IDS,
  reviewMethod: "semantic_review_against_gitignored_official_source_packet",
  reviewAuthority: "development_evidence_only",
  clauses: Object.freeze([
    reviewed("core:8.1:round-limit", "core:numbered:8.1", 1, 1, "constraint", "Game round limit"),
    reviewed("core:8.1:phase-order", "core:numbered:8.1", 2, 2, "timing", "Round phase order"),

    reviewed("core:8.2:alternating-activation-phases", "core:numbered:8.2", 1, 1, "timing", "Alternating activation phases"),
    reviewed("core:8.2:first-player-phase-priority", "core:numbered:8.2", 2, 2, "priority", "First-player phase priority"),
    reviewed("core:8.2:unit-activation-alternation", "core:numbered:8.2", 3, 3, "timing", "Alternating unit activations"),
    reviewed("core:8.2:one-action-per-activation", "core:numbered:8.2", 4, 4, "constraint", "One phase action per activation"),
    display("core:8.2:phase-action-summary", "core:numbered:8.2", 5, 5, "rule_summary", "Phase action table with adjacent strategy summary", "mixed_layout_display_summary"),
    display("core:8.2:deployment-strategy-tip", "core:numbered:8.2", 6, 7, "rationale", "Deployment strategy tip", "non_normative_strategy_advice"),

    reviewed("core:8.2.1:optional-pass", "core:numbered:8.2.1", 1, 1, "permission", "Optional pass"),
    reviewed("core:8.2.1:mandatory-pass", "core:numbered:8.2.1", 2, 2, "constraint", "Mandatory pass without eligible units"),
    reviewed("core:8.2.1:first-passer-marker", "core:numbered:8.2.1", 3, 3, "timing", "First passer takes next-phase marker"),
    reviewed("core:8.2.1:pass-lockout-and-completion", "core:numbered:8.2.1", 4, 5, "constraint", "Pass lockout and opponent completion"),

    reviewed("core:8.2.2:round-one-first-player-assignment", "core:numbered:8.2.2", 1, 2, "priority", "Round-one first-player assignment"),

    reviewed("core:8.3:army-starts-in-reserves", "core:numbered:8.3", 1, 2, "constraint", "Army starts in reserves"),
    reviewed("core:8.3:supply-limited-deployment", "core:numbered:8.3", 3, 3, "constraint", "Movement-phase supply-limited deployment"),

    display("core:8.3.1:reinforcement-flavour", "core:numbered:8.3.1", 1, 1, "rationale", "Reinforcement logistics flavour", "non_normative_flavour"),
    reviewed("core:8.3.1:supply-pool-definition", "core:numbered:8.3.1", 2, 2, "definition", "Supply pool definition"),
    reviewed("core:8.3.1:round-one-supply", "core:numbered:8.3.1", 3, 3, "constraint", "Round-one supply pool"),
    reviewed("core:8.3.1:later-round-escalation", "core:numbered:8.3.1", 4, 4, "constraint", "Later-round supply escalation"),
    reviewed("core:8.3.1:final-round-unlimited-supply", "core:numbered:8.3.1", 5, 6, "permission", "Final-round unlimited supply"),
    reviewed("core:8.3.1:on-table-supply-hard-cap", "core:numbered:8.3.1", 7, 7, "constraint", "On-table supply hard cap"),

    display("core:8.3.2:supply-management-rationale", "core:numbered:8.3.2", 1, 4, "rationale", "Supply management rationale", "non_normative_flavour"),
    reviewed("core:8.3.2:available-supply-formula", "core:numbered:8.3.2", 5, 5, "definition", "Available supply formula"),
    reviewed("core:8.3.2:fielding-supply-eligibility", "core:numbered:8.3.2", 6, 6, "constraint", "Unit fielding supply eligibility"),
    reviewed("core:8.3.2:casualties-free-supply", "core:numbered:8.3.2", 7, 7, "timing", "Casualties free available supply"),

    reviewed("core:8.3.3:arrival-zone-of-influence", "core:numbered:8.3.3", 1, 2, "constraint", "Arrival zone-of-influence restriction"),
    reviewed("core:8.3.3:deploy-coherency", "core:numbered:8.3.3", 3, 4, "constraint", "Deploy coherency restriction"),
    reviewed("core:8.3.3:deployment-card-cross-reference", "core:numbered:8.3.3", 5, 5, "cross_reference", "Deployment-card influence-zone reference"),
    display("core:8.3.3:first-player-designer-note", "core:numbered:8.3.3", 6, 6, "rationale", "First-player assignment designer note", "designer_commentary"),
    display("core:8.3.3:reserve-deployment-designer-note", "core:numbered:8.3.3", 7, 9, "rationale", "Reserve deployment designer note", "designer_commentary"),
    display("core:8.3.3:strategy-tip-heading", "core:numbered:8.3.3", 10, 10, "terminology_note", "Strategy tip heading", "display_section_heading"),

    display("core:8.4:movement-phase-flavour", "core:numbered:8.4", 1, 3, "rationale", "Movement-phase battlefield flavour", "non_normative_flavour"),
    reviewed("core:8.4:start-of-round-effects", "core:numbered:8.4", 4, 4, "timing", "Start-of-round effect window"),
    reviewed("core:8.4:start-effect-order", "core:numbered:8.4", 5, 7, "priority", "Start-of-round effect order"),
    reviewed("core:8.4:available-supply-verification", "core:numbered:8.4", 8, 8, "timing", "Available supply verification"),

    display("core:8.4.1:activation-flavour", "core:numbered:8.4.1", 1, 3, "rationale", "Movement activation flavour", "non_normative_flavour"),
    reviewed("core:8.4.1:on-table-action-choice", "core:numbered:8.4.1", 4, 4, "permission", "On-table movement action choice"),
    reviewed("core:8.4.1:reserve-deploy-choice", "core:numbered:8.4.1", 5, 5, "permission", "Reserve deploy action choice"),
    reviewed("core:8.4.1:movement-activation-marker", "core:numbered:8.4.1", 6, 6, "timing", "Movement activation marker placement"),

    reviewed("core:8.4.2:first-passer-phase-two-marker", "core:numbered:8.4.2", 1, 1, "timing", "First passer takes phase-two marker"),
    reviewed("core:8.4.2:unactivated-unit-markers", "core:numbered:8.4.2", 2, 2, "timing", "Unactivated on-table unit markers"),
  ]),
});
