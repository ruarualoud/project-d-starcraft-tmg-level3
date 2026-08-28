export const OFFICIAL_FAQ_EXACT_RECONCILIATION_BINDING_V2 = Object.freeze({
  schema: "starcraft_tmg_official_faq_exact_reconciliation_binding_v2",
  faqReceiptHash: "18bdfbd2e298eb7c6a360ca47d30e61ab4ba59b198ce1df0d082d28780f9984d",
  anchorLinkageHash: "25cab29b57034b384f2e94ceb686e52a28e2dc39500324da14f294ad56c02a71",
  coreClauseCandidateDenominatorHash: "64cf70a7af278cdc603cd05a2a2a997c7658ef27a7705ff91ed3afdbc86905aa",
  coreSemanticCoverageIndexHash: "dc9c33554c796d7ca545e756746ea9065d6dbe79084e4d54ebd3466e8bb3d7a0",
  anchorLinkageTreatment: "superseded_by_exact_clause_review",
  precedence: "pdf_primary_faq_supplemental_no_auto_override",
  reconciliations: Object.freeze([
    Object.freeze({
      entryId: "faq_9_42",
      relation: "consistent_core_summary",
      reviewBasisCode: "supply_reserves_phases_alternation_and_pass_summary",
      localClauseIds: Object.freeze([
        "core:6.2:supply-pool",
        "core:6.2:available-supply",
        "core:6.2:battlefield-supply-cap",
        "core:8.1:phase-order",
        "core:8.2:alternating-activation-phases",
        "core:8.2:unit-activation-alternation",
        "core:8.2.1:optional-pass",
        "core:8.2.1:first-passer-marker",
        "core:8.3:army-starts-in-reserves",
        "core:8.3:supply-limited-deployment",
      ]),
      unmatchedSupplementalClaimCodes: Object.freeze([]),
    }),
    Object.freeze({
      entryId: "faq_9_43",
      relation: "supplemental_product_fact_no_rule_override",
      reviewBasisCode: "engagement_scale_and_deployment_dimension_summary",
      localClauseIds: Object.freeze([
        "core:9.1.1:engagement-scale-agreement",
        "core:9.3:deployment-table-dimensions",
        "core:9.3:terrain-guideline-scaling",
      ]),
      unmatchedSupplementalClaimCodes: Object.freeze([
        "metric_dimension_equivalents_current_data_binding_pending",
        "small_engagement_dimensions_current_data_binding_pending",
      ]),
    }),
    Object.freeze({
      entryId: "faq_9_46",
      relation: "consistent_core_summary_with_unmatched_setup_detail",
      reviewBasisCode: "top_down_base_trace_and_terrain_setup_summary",
      localClauseIds: Object.freeze([
        "core:7.1:top-down-method",
        "core:7.1:base-to-base-trace",
      ]),
      unmatchedSupplementalClaimCodes: Object.freeze([
        "terrain_height_tier_setup_detail_not_exact_core_clause",
      ]),
    }),
  ]),
  displayOnlyEntryIds: Object.freeze([
    "faq_9_41",
    "faq_9_44",
    "faq_9_45",
    "faq_9_47",
  ]),
});
