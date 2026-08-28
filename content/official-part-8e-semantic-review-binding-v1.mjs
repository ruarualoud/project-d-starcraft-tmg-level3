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
  "core:numbered:8.8",
  "core:numbered:8.8.1",
]);

export const OFFICIAL_PART_8E_SEMANTIC_REVIEW_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_part_semantic_clause_batch_review_binding_v1",
  sourcePart: "8",
  batchId: "part-8e",
  coreClauseCandidateDenominatorHash: "64cf70a7af278cdc603cd05a2a2a997c7658ef27a7705ff91ed3afdbc86905aa",
  reviewPacketHash: "072caf7f883672611ddea74d9f22df573a835c23a4326a975a04d4752f52c6aa",
  batchPlanHash: "6ffb8d4fbbac87990c74aa8acca787dc772517c0c993a109e3174919fbfad74b",
  anchorIds: ANCHOR_IDS,
  reviewMethod: "semantic_review_against_gitignored_official_source_packet",
  reviewAuthority: "development_evidence_only",
  clauses: Object.freeze([
    display("core:8.8:combat-phase-flavour", "core:numbered:8.8", 1, 3, "rule_summary", "Combat-phase flavour summary", "non_normative_flavour"),
    reviewed("core:8.8:mandatory-combat-activation", "core:numbered:8.8", 4, 5, "constraint", "Mandatory engaged-unit combat activation"),
    reviewed("core:8.8:flying-combat-exclusion", "core:numbered:8.8", 6, 7, "constraint", "Flying unit combat-phase exclusion"),
    reviewed("core:8.8:one-engaged-unit-activation", "core:numbered:8.8", 8, 8, "timing", "One engaged unit per combat turn"),
    reviewed("core:8.8:first-player-combat-priority", "core:numbered:8.8", 9, 9, "priority", "First-player combat priority"),
    reviewed("core:8.8:alternating-combat-activation", "core:numbered:8.8", 10, 10, "timing", "Alternating combat activations"),
    reviewed("core:8.8:close-combat-procedure", "core:numbered:8.8", 11, 11, "cross_reference", "Close-combat attack procedure"),
    reviewed("core:8.8:engaged-unit-eligibility", "core:numbered:8.8", 12, 13, "constraint", "Combat activation engagement eligibility"),
    reviewed("core:8.8:remove-combat-marker", "core:numbered:8.8", 14, 14, "timing", "Remove marker after close combat"),
    reviewed("core:8.8:mandatory-pass-condition", "core:numbered:8.8", 15, 15, "constraint", "Combat-phase pass condition"),
    reviewed("core:8.8:both-pass-phase-end", "core:numbered:8.8", 16, 16, "timing", "Both-pass combat-phase end"),

    reviewed("core:8.8.1:close-combat-definition", "core:numbered:8.8.1", 1, 1, "definition", "Close-combat attack definition"),
    reviewed("core:8.8.1:close-ranks-leading-move", "core:numbered:8.8.1", 2, 3, "permission", "Optional Close Ranks leading move"),
    reviewed("core:8.8.1:no-new-close-ranks-engagement", "core:numbered:8.8.1", 4, 4, "constraint", "Close Ranks new-engagement restriction"),
    reviewed("core:8.8.1:close-ranks-coherency", "core:numbered:8.8.1", 5, 5, "constraint", "Close Ranks coherency placement"),
    reviewed("core:8.8.1:enemy-contact-placement", "core:numbered:8.8.1", 6, 6, "priority", "Enemy base-contact placement priority"),
    reviewed("core:8.8.1:friendly-contact-fallback", "core:numbered:8.8.1", 7, 7, "priority", "Friendly base-contact placement fallback"),
    reviewed("core:8.8.1:pinned-contact-models", "core:numbered:8.8.1", 8, 8, "constraint", "Pinned base-contact models"),
    reviewed("core:8.8.1:no-close-ranks-disengage", "core:numbered:8.8.1", 9, 9, "constraint", "Close Ranks disengage restriction"),
    reviewed("core:8.8.1:fighting-rank", "core:numbered:8.8.1", 10, 11, "definition", "Fighting Rank eligibility"),
    reviewed("core:8.8.1:supporting-rank", "core:numbered:8.8.1", 12, 12, "definition", "Supporting Rank eligibility"),
    reviewed("core:8.8.1:no-melee-line-of-sight", "core:numbered:8.8.1", 13, 13, "permission", "Close combat ignores line of sight"),
    reviewed("core:8.8.1:unit-wide-melee-target", "core:numbered:8.8.1", 14, 14, "constraint", "Eligible models strike target unit"),
    display("core:8.8.1:mandatory-combat-designer-note", "core:numbered:8.8.1", 15, 16, "rationale", "Mandatory combat designer note", "designer_commentary"),
    display("core:8.8.1:close-ranks-strategy-tip", "core:numbered:8.8.1", 17, 19, "rationale", "Close Ranks strategy tip", "non_normative_strategy_advice"),
    reviewed("core:8.8.1:close-combat-attack-sequence", "core:numbered:8.8.1", 20, 21, "constraint", "Close-combat attack sequence and weapon scope"),
    reviewed("core:8.8.1:choose-one-combat-weapon", "core:numbered:8.8.1", 22, 22, "constraint", "Choose one eligible combat weapon"),
    reviewed("core:8.8.1:close-combat-evade", "core:numbered:8.8.1", 23, 23, "constraint", "Close-combat Evade eligibility"),
    reviewed("core:8.8.1:multiple-enemy-attack-eligibility", "core:numbered:8.8.1", 24, 25, "constraint", "Multiple-enemy close-combat eligibility"),
    reviewed("core:8.8.1:melee-surge-target", "core:numbered:8.8.1", 26, 27, "constraint", "Unsplittable declared melee Surge target"),
    reviewed("core:8.8.1:engaged-casualty-removal", "core:numbered:8.8.1", 28, 29, "cross_reference", "Engaged-unit casualty removal"),
    reviewed("core:8.8.1:post-combat-unengaged", "core:numbered:8.8.1", 30, 31, "timing", "Post-combat unengaged status"),
    reviewed("core:8.8.1:freed-unit-pass-state", "core:numbered:8.8.1", 32, 33, "timing", "Freed unactivated unit pass state"),
    reviewed("core:8.8.1:freed-unit-reaction-exception", "core:numbered:8.8.1", 34, 34, "permission", "Freed-unit reaction exception"),
    display("core:8.8.1:mission-control-strategy-tip", "core:numbered:8.8.1", 35, 36, "rationale", "Mission control Supply strategy tip", "non_normative_strategy_advice"),
    display("core:8.8.1:fighting-supporting-ranks-example", "core:numbered:8.8.1", 37, 38, "example", "Fighting and Supporting Ranks example", "non_normative_example"),
  ]),
});
