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

const ANCHOR_IDS = Object.freeze([
  "core:glossary:061:92bb1f8027f3",
  "core:glossary:062:8020b886b66e",
  "core:glossary:063:8c2e4a035f5f",
  "core:glossary:064:c6bcee712f22",
  "core:glossary:065:61041b202546",
  "core:glossary:066:db0f287bbdf9",
  "core:glossary:067:7b161e5843c5",
  "core:glossary:068:9bf84ab3bf37",
  "core:glossary:069:99fe9308dadf",
  "core:glossary:070:5cea256d1b64",
  "core:glossary:071:cf0908df867f",
  "core:glossary:072:360bac1e6650",
  "core:glossary:073:73cc9813d858",
]);

export const OFFICIAL_PART_11F_SEMANTIC_REVIEW_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_part_semantic_clause_batch_review_binding_v1",
  sourcePart: "11",
  batchId: "part-11f",
  coreClauseCandidateDenominatorHash: "64cf70a7af278cdc603cd05a2a2a997c7658ef27a7705ff91ed3afdbc86905aa",
  reviewPacketHash: "7faa59920f1baf28bd40fb6703f9b3f2828a70a867b5aebcbe6f126333a2e8c7",
  batchPlanHash: "f6ddbe26782a39f838ad9b2a550d0e49f10f829dbac88024c4a55999f005a9ef",
  anchorIds: ANCHOR_IDS,
  reviewMethod: "semantic_review_against_gitignored_official_source_packet",
  reviewAuthority: "development_evidence_only",
  clauses: Object.freeze([
    reviewed("core:11:spillover-definition", "core:glossary:061:92bb1f8027f3", 1, 1, "definition", "Spillover is a template hit outside the primary target unit"),
    reviewed("core:11:spillover-template-coverage", "core:glossary:061:92bb1f8027f3", 2, 2, "timing", "Template coverage of another unit creates spillover"),
    reviewed("core:11:spillover-separate-batch", "core:glossary:061:92bb1f8027f3", 3, 3, "constraint", "Each spillover unit resolves as a separate batch"),
    reviewed(
      "core:11:spillover-batch-restrictions",
      "core:glossary:061:92bb1f8027f3",
      4,
      4,
      "constraint",
      "Spillover batches exclude rate modifiers and surge",
      "compound_spillover_restriction_mapping_pending",
    ),
    reviewed("core:11:spillover-friendly-enemy-scope", "core:glossary:061:92bb1f8027f3", 5, 5, "permission", "Spillover may affect friendly and enemy units"),
    reviewed("core:11:spillover-template-procedure-cross-reference", "core:glossary:061:92bb1f8027f3", 6, 6, "cross_reference", "Spillover uses the template-weapon procedure"),

    reviewed("core:11:stationary-round-start", "core:glossary:062:8020b886b66e", 1, 1, "timing", "Every unit gains stationary at round start"),
    reviewed("core:11:stationary-movement-loss", "core:glossary:062:8020b886b66e", 2, 2, "timing", "Any movement or placement removes stationary"),

    reviewed("core:11:status-definition", "core:glossary:063:8c2e4a035f5f", 1, 2, "definition", "Status represents a unit mode, condition or statistic modifier"),
    reviewed("core:11:status-cleanup-persistence", "core:glossary:063:8c2e4a035f5f", 3, 3, "timing", "Statuses persist through cleanup by default"),
    reviewed("core:11:status-mode-markers", "core:glossary:063:8c2e4a035f5f", 4, 5, "classification", "Operational modes use plastic status markers"),
    reviewed("core:11:status-mode-stay-in-play", "core:glossary:063:8c2e4a035f5f", 6, 6, "classification", "Operational-mode status markers have Stay in Play"),
    reviewed("core:11:status-effect-markers", "core:glossary:063:8c2e4a035f5f", 7, 8, "classification", "Other statuses use typed buff and debuff markers"),
    reviewed("core:11:status-effect-stay-in-play", "core:glossary:063:8c2e4a035f5f", 9, 9, "classification", "Other status markers have Stay in Play"),

    reviewed("core:11:stay-in-play-persistence", "core:glossary:064:c6bcee712f22", 1, 2, "timing", "Stay-in-play effects survive cleanup until their removal condition"),
    reviewed("core:11:summon-placement-and-coherency", "core:glossary:064:c6bcee712f22", 3, 4, "constraint", "Summon places a named unit beside its parent in coherency"),
    reviewed("core:11:summon-enemy-separation", "core:glossary:064:c6bcee712f22", 5, 5, "constraint", "Summoned models stay outside enemy engagement range"),
    reviewed("core:11:summon-initial-phase-activation-lock", "core:glossary:064:c6bcee712f22", 6, 6, "timing", "Summoned unit cannot activate in its summon phase"),
    reviewed("core:11:summon-parent-linked-activation", "core:glossary:064:c6bcee712f22", 7, 7, "timing", "Later summon activations immediately follow the parent"),
    reviewed("core:11:summon-zone-of-influence", "core:glossary:064:c6bcee712f22", 8, 8, "constraint", "Summoned units stay outside the opposing influence zone"),
    reviewed("core:11:summon-supply-limit", "core:glossary:064:c6bcee712f22", 9, 10, "constraint", "Summon requires available supply and cannot exceed the pool"),
    reviewed("core:11:summon-parent-absent-activation", "core:glossary:064:c6bcee712f22", 11, 11, "permission", "A summoned unit activates normally while its parent is absent"),

    reviewed("core:11:supply-value-current-model-count", "core:glossary:065:61041b202546", 1, 1, "definition", "Current model count selects a unit's supply value"),
    reviewed(
      "core:11:supply-value-starting-slots",
      "core:glossary:065:61041b202546",
      2,
      2,
      "definition",
      "Army composition sets starting supply and slot occupancy",
      "compound_starting_supply_mapping_pending",
    ),
    reviewed("core:11:supply-value-casualty-update", "core:glossary:065:61041b202546", 3, 4, "timing", "Casualty bracket changes immediately reduce supply value"),
    reviewed("core:11:supply-value-rule-uses", "core:glossary:065:61041b202546", 5, 5, "cross_reference", "Supply value feeds deployment, control, mass and scoring"),

    reviewed("core:11:supporting-rank-membership", "core:glossary:066:db0f287bbdf9", 1, 1, "definition", "Supporting rank requires same-unit contact behind a fighting model"),
    reviewed("core:11:supporting-rank-strike-permission", "core:glossary:066:db0f287bbdf9", 2, 3, "permission", "Supporting-rank models may strike in combat"),

    reviewed("core:11:tactical-mass-definition", "core:glossary:067:7b161e5843c5", 1, 1, "definition", "Tactical mass compares own supply against engaged enemies"),
    reviewed("core:11:tactical-mass-disengage-benefit", "core:glossary:067:7b161e5843c5", 2, 2, "permission", "Tactical mass removes the following assault disengage penalty"),

    reviewed("core:11:tough-failed-armour-conversion", "core:glossary:068:9bf84ab3bf37", 1, 2, "timing", "Tough converts failed armour results into discarded successes"),

    reviewed("core:11:unengaged-ground-condition", "core:glossary:069:99fe9308dadf", 1, 1, "definition", "Ground units are unengaged without valid enemy ground engagement"),
    reviewed("core:11:unengaged-flying", "core:glossary:069:99fe9308dadf", 2, 2, "definition", "Flying units are always unengaged"),
    reviewed("core:11:unengaged-action-permissions", "core:glossary:069:99fe9308dadf", 3, 3, "permission", "Unengaged units may use standard movement and attacks"),
    reviewed("core:11:unengaged-move-requirement", "core:glossary:069:99fe9308dadf", 4, 4, "constraint", "Move action requires an unengaged unit"),

    reviewed("core:11:visible-definition", "core:glossary:070:5cea256d1b64", 1, 1, "definition", "Visibility requires a valid line-of-sight trace"),
    reviewed("core:11:visible-unobstructed-trace", "core:glossary:070:5cea256d1b64", 2, 2, "definition", "Unobstructed traces establish visibility directly"),
    reviewed("core:11:visible-cover-assessment", "core:glossary:070:5cea256d1b64", 3, 3, "constraint", "Blocking-terrain traces remain visible unless qualifying cover blocks"),
    reviewed("core:11:visible-hidden-distance-override", "core:glossary:070:5cea256d1b64", 4, 4, "priority", "Hidden distance restriction overrides line-of-sight visibility"),

    reviewed("core:11:wholly-within-model", "core:glossary:071:cf0908df867f", 1, 1, "definition", "A model is wholly within only when its entire base is inside"),
    reviewed("core:11:wholly-within-unit", "core:glossary:071:cf0908df867f", 2, 2, "definition", "A unit is wholly within only when every model qualifies"),
    reviewed("core:11:wholly-within-rule-uses", "core:glossary:071:cf0908df867f", 3, 3, "cross_reference", "Wholly within is the stricter distance relation used by dependent rules"),
    reviewed("core:11:wholly-within-no-partial-overlap", "core:glossary:071:cf0908df867f", 4, 4, "constraint", "Partial overlap does not satisfy wholly within"),

    reviewed("core:11:within-model", "core:glossary:072:360bac1e6650", 1, 1, "definition", "A model is within when any base portion reaches the range"),
    reviewed("core:11:within-unit", "core:glossary:072:360bac1e6650", 2, 2, "definition", "A unit is within when at least one model qualifies"),
    reviewed("core:11:within-wholly-distinction", "core:glossary:072:360bac1e6650", 3, 3, "terminology_note", "Within is less restrictive than wholly within"),
    reviewed("core:11:within-allows-partial-overlap", "core:glossary:072:360bac1e6650", 4, 4, "permission", "Partial overlap satisfies within"),

    reviewed(
      "core:11:zone-of-influence-definition",
      "core:glossary:073:73cc9813d858",
      1,
      1,
      "definition",
      "Influence zone extends inward from a deployment-defined entry edge",
      "compound_zone_geometry_mapping_pending",
    ),
    reviewed("core:11:zone-of-influence-arrival-restriction", "core:glossary:073:73cc9813d858", 2, 3, "constraint", "All reserve arrival forms avoid the opposing influence zone"),
    reviewed("core:11:zone-of-influence-post-arrival", "core:glossary:073:73cc9813d858", 4, 5, "constraint", "Influence zone has no effect after a unit completes arrival"),
  ]),
});
