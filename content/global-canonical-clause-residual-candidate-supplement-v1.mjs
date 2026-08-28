const pair = (left, right, reviewBasisCode) => ({
  localClauseIds: [left, right],
  reviewBasisCode,
});

export const GLOBAL_CANONICAL_CLAUSE_RESIDUAL_CANDIDATE_SUPPLEMENT_V1 = Object.freeze({
  schema: "starcraft_tmg_global_canonical_clause_residual_candidate_supplement_v1",
  globalMergePlanHash: "8068f9635e473d3a4c72849aacb997a87365d46c8e5479d877bf1c68bbee4618",
  previousBatchHash: "1c99facab4bca696ea97927e9f6ff788ff0efd7bd960f5decbf1887dbea27d97",
  pairSpecs: Object.freeze([
    pair(
      "core:11:active-ability-timing",
      "core:2.7.1:active-ability-timing",
      "glossary_and_numbered_active_timing_late_alias_probe",
    ),
    pair(
      "core:10.2:named-active-frequency",
      "core:10.4:named-reaction-frequency",
      "same_shape_different_ability_type_frequency_probe",
    ),
    pair(
      "core:10.5.2:exhausted-card-lockout-and-refresh",
      "core:8.9.5:refresh-exhausted-cards",
      "composite_lockout_and_cleanup_refresh_overlap_probe",
    ),
    pair(
      "core:8.3.3:arrival-zone-of-influence",
      "core:11:zone-of-influence-arrival-restriction",
      "arrival_zone_of_influence_cross_section_alias_probe",
    ),
    pair(
      "core:11:flying-high-ground-cover-prohibition",
      "core:7.1.3:flying-no-high-ground-cover",
      "flying_high_ground_cover_cross_section_alias_probe",
    ),
  ]),
});
