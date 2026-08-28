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
  "core:numbered:8.9",
  "core:numbered:8.9.1",
  "core:numbered:8.9.2",
  "core:numbered:8.9.3",
  "core:numbered:8.9.4",
  "core:numbered:8.9.5",
  "core:numbered:8.9.6",
  "core:numbered:8.10",
]);

export const OFFICIAL_PART_8F_SEMANTIC_REVIEW_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_part_semantic_clause_batch_review_binding_v1",
  sourcePart: "8",
  batchId: "part-8f",
  coreClauseCandidateDenominatorHash: "64cf70a7af278cdc603cd05a2a2a997c7658ef27a7705ff91ed3afdbc86905aa",
  reviewPacketHash: "072caf7f883672611ddea74d9f22df573a835c23a4326a975a04d4752f52c6aa",
  batchPlanHash: "6ffb8d4fbbac87990c74aa8acca787dc772517c0c993a109e3174919fbfad74b",
  anchorIds: ANCHOR_IDS,
  reviewMethod: "semantic_review_against_gitignored_official_source_packet",
  reviewAuthority: "development_evidence_only",
  clauses: Object.freeze([
    display("core:8.9:scoring-cleanup-heading", "core:numbered:8.9", 1, 1, "rule_summary", "Scoring and cleanup heading", "display_section_heading"),
    reviewed("core:8.9:scoring-cleanup-sequence", "core:numbered:8.9", 2, 8, "timing", "Scoring and cleanup ordered sequence"),

    reviewed("core:8.9.1:contest-on-battlefield", "core:numbered:8.9.1", 1, 1, "constraint", "Contesting unit must be on battlefield"),
    reviewed("core:8.9.1:contest-range-los-elevation", "core:numbered:8.9.1", 2, 2, "constraint", "Contesting model range, sight and elevation"),
    reviewed("core:8.9.1:marker-sight-size", "core:numbered:8.9.1", 3, 3, "definition", "Mission marker sight size"),
    reviewed("core:8.9.1:contest-coherency", "core:numbered:8.9.1", 4, 4, "constraint", "Contesting unit coherency"),
    reviewed("core:8.9.1:flying-cannot-contest", "core:numbered:8.9.1", 5, 5, "constraint", "Flying marker-control exclusion"),
    reviewed("core:8.9.1:sum-contesting-supply", "core:numbered:8.9.1", 6, 6, "definition", "Marker contesting Supply total"),
    reviewed("core:8.9.1:higher-supply-controls", "core:numbered:8.9.1", 7, 7, "constraint", "Higher Supply controls marker"),
    reviewed("core:8.9.1:tied-supply-control", "core:numbered:8.9.1", 8, 8, "constraint", "Tied Supply control outcome"),
    reviewed("core:8.9.1:zero-supply-control", "core:numbered:8.9.1", 9, 9, "permission", "Uncontested zero-Supply control"),
    reviewed("core:8.9.1:control-faction-indicator", "core:numbered:8.9.1", 10, 10, "timing", "Controlled-marker faction indicator"),
    reviewed("core:8.9.1:sticky-control-reclaim", "core:numbered:8.9.1", 11, 11, "constraint", "Sticky control active reclaim"),
    reviewed("core:8.9.1:sticky-control-tie-and-neutrality", "core:numbered:8.9.1", 12, 12, "constraint", "Sticky control tie and neutrality"),
    display("core:8.9.1:sticky-control-designer-note", "core:numbered:8.9.1", 13, 13, "rationale", "Sticky control designer note", "designer_commentary"),
    display("core:8.9.1:supply-control-example", "core:numbered:8.9.1", 14, 15, "example", "Supply-based marker control example", "non_normative_example"),
    display("core:8.9.1:supply-control-summary", "core:numbered:8.9.1", 16, 17, "rule_summary", "Supply-not-model-count summary", "display_summary_table"),
    display("core:8.9.1:control-quick-reference", "core:numbered:8.9.1", 18, 42, "rule_summary", "Mission marker control quick reference", "display_summary_table"),

    reviewed("core:8.9.2:simultaneous-vp-tally", "core:numbered:8.9.2", 1, 1, "timing", "Simultaneous mission VP tally"),

    reviewed("core:8.9.3:special-win-terminal", "core:numbered:8.9.3", 1, 1, "constraint", "Special winning-condition terminal"),
    reviewed("core:8.9.3:army-elimination-terminal", "core:numbered:8.9.3", 2, 2, "constraint", "Army elimination terminal"),
    reviewed("core:8.9.3:survivor-vp-award", "core:numbered:8.9.3", 3, 3, "constraint", "Surviving-player VP award"),
    reviewed("core:8.9.3:round-limit-terminal", "core:numbered:8.9.3", 4, 4, "timing", "Final-round phase terminal"),

    reviewed("core:8.9.4:end-round-effect-window", "core:numbered:8.9.4", 1, 1, "timing", "End-of-round effect window"),
    reviewed("core:8.9.4:end-round-effect-order", "core:numbered:8.9.4", 2, 4, "priority", "End-of-round effect order"),

    reviewed("core:8.9.5:cleanup-marker-exceptions", "core:numbered:8.9.5", 1, 4, "timing", "Cleanup token and marker exceptions"),
    reviewed("core:8.9.5:refresh-exhausted-cards", "core:numbered:8.9.5", 5, 5, "timing", "Refresh exhausted cards"),

    reviewed("core:8.9.6:trailing-player-initiative", "core:numbered:8.9.6", 1, 1, "priority", "Trailing player receives first-player marker"),
    reviewed("core:8.9.6:tied-vp-initiative-rolloff", "core:numbered:8.9.6", 2, 3, "priority", "Tied-VP initiative Roll-Off"),
    reviewed("core:8.9.6:begin-next-round", "core:numbered:8.9.6", 4, 4, "timing", "Begin next round movement phase"),

    display("core:8.10:game-end-flavour", "core:numbered:8.10", 1, 3, "rationale", "Game-end flavour", "non_normative_flavour"),
    reviewed("core:8.10:mission-score-total", "core:numbered:8.10", 4, 4, "definition", "Final mission score total"),
    reviewed("core:8.10:final-reserve-destruction", "core:numbered:8.10", 5, 6, "timing", "Final-round reserve destruction and scoring"),
    reviewed("core:8.10:highest-vp-winner", "core:numbered:8.10", 7, 7, "constraint", "Highest final VP wins"),
    reviewed("core:8.10:tiebreaker-and-draw", "core:numbered:8.10", 8, 9, "constraint", "Mission tiebreaker and draw fallback"),
    display("core:8.10:catch-up-initiative-designer-note", "core:numbered:8.10", 10, 11, "rationale", "Catch-up initiative designer note", "designer_commentary"),
  ]),
});
