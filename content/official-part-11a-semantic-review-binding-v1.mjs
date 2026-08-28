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
  "core:glossary:001:e2f9ef2e9909",
  "core:glossary:002:ed05b51322f7",
  "core:glossary:003:237491ee8de8",
  "core:glossary:004:e04649a86fd7",
  "core:glossary:005:14a2171240bc",
  "core:glossary:006:d1231ff00821",
  "core:glossary:007:376609a72790",
  "core:glossary:008:2f00c77475cd",
  "core:glossary:009:962200ebce93",
  "core:glossary:010:82545854a3d9",
  "core:glossary:011:73db7dcc0f99",
  "core:glossary:012:70e8843ed0b3",
]);

export const OFFICIAL_PART_11A_SEMANTIC_REVIEW_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_part_semantic_clause_batch_review_binding_v1",
  sourcePart: "11",
  batchId: "part-11a",
  coreClauseCandidateDenominatorHash: "64cf70a7af278cdc603cd05a2a2a997c7658ef27a7705ff91ed3afdbc86905aa",
  reviewPacketHash: "7faa59920f1baf28bd40fb6703f9b3f2828a70a867b5aebcbe6f126333a2e8c7",
  batchPlanHash: "f6ddbe26782a39f838ad9b2a550d0e49f10f829dbac88024c4a55999f005a9ef",
  anchorIds: ANCHOR_IDS,
  reviewMethod: "semantic_review_against_gitignored_official_source_packet",
  reviewAuthority: "development_evidence_only",
  clauses: Object.freeze([
    reviewed("core:11:access-point-definition", "core:glossary:001:e2f9ef2e9909", 1, 1, "definition", "Access point terrain definition"),
    reviewed("core:11:access-point-elevation-change", "core:glossary:001:e2f9ef2e9909", 2, 2, "permission", "Access points permit elevation changes"),

    reviewed("core:11:active-player-definition", "core:glossary:002:ed05b51322f7", 1, 1, "definition", "Active player definition"),

    reviewed("core:11:anti-evade-modifier", "core:glossary:003:237491ee8de8", 1, 1, "definition", "Anti-evade weapon modifier"),

    reviewed("core:11:army-slot-capacity", "core:glossary:004:e04649a86fd7", 1, 1, "definition", "Army slots constrain unit count and type"),
    reviewed("core:11:army-slot-types", "core:glossary:004:e04649a86fd7", 2, 2, "classification", "Army slot type set"),
    reviewed("core:11:unit-army-slot-occupancy", "core:glossary:004:e04649a86fd7", 3, 3, "definition", "Unit starting supply determines designated slot occupancy"),
    reviewed("core:11:faction-initial-army-slots", "core:glossary:004:e04649a86fd7", 4, 4, "definition", "Faction card provides initial army slots"),
    reviewed("core:11:tactical-extra-army-slots", "core:glossary:004:e04649a86fd7", 5, 5, "definition", "Tactical card purchases unlock additional army slots"),
    reviewed("core:11:unused-army-slots-lost", "core:glossary:004:e04649a86fd7", 6, 6, "constraint", "Unused army slots cannot be retained or converted"),

    reviewed("core:11:available-supply-definition", "core:glossary:005:14a2171240bc", 1, 1, "definition", "Available supply definition"),
    reviewed("core:11:available-supply-formula", "core:glossary:005:14a2171240bc", 2, 2, "definition", "Available supply formula"),
    reviewed("core:11:deployment-available-supply", "core:glossary:005:14a2171240bc", 3, 3, "constraint", "Reserve deployment must fit available supply"),
    reviewed("core:11:on-table-supply-cap", "core:glossary:005:14a2171240bc", 4, 4, "constraint", "On-table current supply cannot exceed supply pool"),
    reviewed(
      "core:11:available-supply-casualty-final-round",
      "core:glossary:005:14a2171240bc",
      5,
      5,
      "rule_summary",
      "Casualties free supply and final round removes the restriction",
      "compound_supply_lifecycle_mapping_pending",
    ),

    reviewed("core:11:blocking-terrain-definition", "core:glossary:006:d1231ff00821", 1, 1, "definition", "Blocking terrain effective-size definition"),
    reviewed("core:11:blocking-terrain-los", "core:glossary:006:d1231ff00821", 2, 2, "constraint", "Blocking terrain obstructs line of sight through cover rules"),
    reviewed("core:11:blocking-terrain-movement-independent", "core:glossary:006:d1231ff00821", 3, 3, "constraint", "Blocking classification does not determine movement permission"),

    reviewed("core:11:buff-duration", "core:glossary:007:376609a72790", 1, 1, "timing", "Characteristic buff duration"),
    reviewed("core:11:buff-target-number", "core:glossary:007:376609a72790", 2, 3, "definition", "Buff reduces a target-number characteristic"),
    reviewed("core:11:buff-value", "core:glossary:007:376609a72790", 4, 5, "definition", "Buff increases a value characteristic"),

    reviewed("core:11:bulky-engaged-ranged-prohibition", "core:glossary:008:2f00c77475cd", 1, 1, "constraint", "Bulky weapon cannot make ranged attacks while engaged"),

    reviewed("core:11:burrowed-status-classification", "core:glossary:009:962200ebce93", 1, 1, "classification", "Burrowed is a status"),
    reviewed("core:11:burrowed-gains-hidden", "core:glossary:009:962200ebce93", 2, 2, "timing", "Gaining burrowed also grants hidden"),
    reviewed("core:11:burrowed-start-round-hidden", "core:glossary:009:962200ebce93", 3, 3, "timing", "Burrowed units gain hidden at round start"),
    reviewed("core:11:burrowed-removal-loses-hidden", "core:glossary:009:962200ebce93", 4, 4, "timing", "Removing burrowed also removes hidden"),
    reviewed("core:11:burrowed-size-zero", "core:glossary:009:962200ebce93", 5, 5, "definition", "Burrowed effective size is zero"),
    reviewed("core:11:burrowed-disengage-supply-zero", "core:glossary:009:962200ebce93", 6, 6, "definition", "Burrowed current supply is zero for disengage checks"),
    reviewed("core:11:burrowed-no-mission-control", "core:glossary:009:962200ebce93", 7, 7, "constraint", "Burrowed units cannot control or contest mission markers"),
    reviewed("core:11:burrowed-action-whitelist", "core:glossary:009:962200ebce93", 8, 8, "constraint", "Burrowed action whitelist"),
    reviewed("core:11:burrowed-action-removes-status", "core:glossary:009:962200ebce93", 9, 9, "timing", "Non-hold permitted actions remove burrowed"),
    reviewed("core:11:burrowed-special-abilities", "core:glossary:009:962200ebce93", 10, 10, "permission", "Burrowed units normally retain special abilities"),
    reviewed("core:11:burrowed-evade", "core:glossary:009:962200ebce93", 11, 11, "permission", "Burrowed units may evade every targeting attack"),
    reviewed("core:11:burrowed-model-pass-through", "core:glossary:009:962200ebce93", 12, 12, "constraint", "Models may pass through burrowed models with endpoint restriction"),
    reviewed(
      "core:11:burrowed-engaged-combat-sequence",
      "core:glossary:009:962200ebce93",
      13,
      16,
      "timing",
      "Engaged burrowed unit activation and close-ranks attack sequence",
    ),
    reviewed("core:11:burrowed-enemy-attacks", "core:glossary:009:962200ebce93", 17, 17, "permission", "Engaged enemies may attack a burrowed unit normally"),

    reviewed("core:11:burst-fire-close-range-roa", "core:glossary:010:82545854a3d9", 1, 1, "definition", "Burst fire increases rate of attack within its range"),

    reviewed("core:11:combat-tags-definition", "core:glossary:011:73db7dcc0f99", 1, 1, "definition", "Combat tag definition"),
    reviewed("core:11:combat-tag-list", "core:glossary:011:73db7dcc0f99", 2, 2, "classification", "Combat tag type set"),
    reviewed("core:11:combat-tag-targeting", "core:glossary:011:73db7dcc0f99", 3, 3, "constraint", "Weapon targeting may require combat tags"),
    reviewed("core:11:combat-tag-surge", "core:glossary:011:73db7dcc0f99", 4, 4, "constraint", "Surge efficiency checks target combat tag"),
    reviewed("core:11:combat-tag-bonus-eligibility", "core:glossary:011:73db7dcc0f99", 5, 5, "constraint", "Ability bonuses may require combat tags"),
    reviewed("core:11:ground-tag-elevation-distinction", "core:glossary:011:73db7dcc0f99", 6, 8, "terminology_note", "Ground combat tag is distinct from ground-level elevation"),

    reviewed("core:11:concentrated-fire-casualty-cap", "core:glossary:012:70e8843ed0b3", 1, 1, "constraint", "Concentrated fire caps casualties and discards excess damage"),
  ]),
});
