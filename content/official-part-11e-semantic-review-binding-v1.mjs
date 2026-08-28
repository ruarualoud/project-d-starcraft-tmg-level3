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
  "core:glossary:049:e1214b7df32e",
  "core:glossary:050:6e0b48420328",
  "core:glossary:051:32e39d5c3165",
  "core:glossary:052:c2e3ac47f4a3",
  "core:glossary:053:0b4ab43e9dfa",
  "core:glossary:054:92025c91d533",
  "core:glossary:055:07458b8c6cba",
  "core:glossary:056:2fe9ef1c9054",
  "core:glossary:057:827941996eba",
  "core:glossary:058:e8745eb7f7e8",
  "core:glossary:059:d761f8bae82d",
  "core:glossary:060:25f3ee34ecc4",
]);

export const OFFICIAL_PART_11E_SEMANTIC_REVIEW_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_part_semantic_clause_batch_review_binding_v1",
  sourcePart: "11",
  batchId: "part-11e",
  coreClauseCandidateDenominatorHash: "64cf70a7af278cdc603cd05a2a2a997c7658ef27a7705ff91ed3afdbc86905aa",
  reviewPacketHash: "7faa59920f1baf28bd40fb6703f9b3f2828a70a867b5aebcbe6f126333a2e8c7",
  batchPlanHash: "f6ddbe26782a39f838ad9b2a550d0e49f10f829dbac88024c4a55999f005a9ef",
  anchorIds: ANCHOR_IDS,
  reviewMethod: "semantic_review_against_gitignored_official_source_packet",
  reviewAuthority: "development_evidence_only",
  clauses: Object.freeze([
    reviewed("core:11:pinpoint-engaged-ranged-targeting", "core:glossary:049:e1214b7df32e", 1, 1, "permission", "Pinpoint permits ranged targeting of engaged enemies"),

    reviewed("core:11:place-leading-model-nomination", "core:glossary:050:6e0b48420328", 1, 1, "timing", "Place begins by choosing a leading model"),
    reviewed("core:11:place-leading-model-range", "core:glossary:050:6e0b48420328", 2, 2, "constraint", "Place resets the leading model within its stated distance"),
    reviewed("core:11:place-unit-coherency", "core:glossary:050:6e0b48420328", 3, 3, "constraint", "Place resets remaining models in coherency"),
    reviewed("core:11:place-nonmovement-geometry", "core:glossary:050:6e0b48420328", 4, 5, "permission", "Place ignores path, gap-clearance and elevation requirements"),
    reviewed("core:11:place-legal-endpoint", "core:glossary:050:6e0b48420328", 6, 6, "constraint", "Place requires legal enemy-separated endpoints"),
    reviewed("core:11:place-assault-engagement-exception", "core:glossary:050:6e0b48420328", 7, 7, "permission", "Assault-phase place may end in enemy engagement range"),

    reviewed("core:11:precision-failed-dice-conversion", "core:glossary:051:32e39d5c3165", 1, 2, "timing", "Precision converts failed attack dice into successful armour-pool hits"),

    reviewed("core:11:ready-card-definition", "core:glossary:052:c2e3ac47f4a3", 1, 1, "definition", "Ready is the default card state"),
    reviewed("core:11:ready-card-capabilities", "core:glossary:052:c2e3ac47f4a3", 2, 2, "permission", "Ready cards expose abilities and may pay exhaustion costs"),
    reviewed("core:11:ready-round-start", "core:glossary:052:c2e3ac47f4a3", 3, 3, "timing", "Applicable cards begin each round ready"),
    reviewed("core:11:ready-cleanup-refresh", "core:glossary:052:c2e3ac47f4a3", 4, 4, "timing", "Cleanup refreshes exhausted cards"),

    reviewed("core:11:repeatable-use-permission", "core:glossary:053:0b4ab43e9dfa", 1, 2, "permission", "Repeatable abilities bypass normal use limits while satisfying each cost and trigger"),

    reviewed("core:11:reserves-definition", "core:glossary:054:92025c91d533", 1, 1, "definition", "Reserves is an off-battlefield holding area"),
    reviewed("core:11:reserves-initial-state", "core:glossary:054:92025c91d533", 2, 2, "timing", "Units begin the game in reserves"),
    reviewed("core:11:reserves-targeting-restriction", "core:glossary:054:92025c91d533", 3, 3, "constraint", "Reserve units cannot be targeted without an explicit exception"),
    reviewed("core:11:reserves-ability-restriction", "core:glossary:054:92025c91d533", 4, 4, "constraint", "Reserve units cannot use abilities without an explicit exception"),
    reviewed("core:11:reserves-mission-marker-restriction", "core:glossary:054:92025c91d533", 5, 5, "constraint", "Reserve units cannot control or contest mission markers"),
    reviewed("core:11:reserves-supply-exclusion", "core:glossary:054:92025c91d533", 6, 6, "constraint", "Reserve supply does not count on the battlefield"),
    reviewed("core:11:reserves-loadout-retention", "core:glossary:054:92025c91d533", 7, 7, "definition", "Reserve units retain their army-building selections"),
    reviewed("core:11:reserves-deploy-exit", "core:glossary:054:92025c91d533", 8, 8, "timing", "Deploy moves a unit out of reserves"),
    reviewed(
      "core:11:reserves-return-and-final-round",
      "core:glossary:054:92025c91d533",
      9,
      9,
      "rule_summary",
      "Returned reserve units follow damage and supply rules and undeployed final-round scoring",
      "compound_reserve_lifecycle_mapping_pending",
    ),

    reviewed("core:11:respawn-return-destroyed-models", "core:glossary:055:07458b8c6cba", 1, 1, "permission", "Respawn returns a bounded number of destroyed models"),
    reviewed("core:11:respawn-supply-bracket-limit", "core:glossary:055:07458b8c6cba", 2, 3, "constraint", "Respawn cannot increase current-supply bracket"),
    reviewed("core:11:respawn-base-contact", "core:glossary:055:07458b8c6cba", 4, 4, "constraint", "Respawn places returned models in base contact"),
    reviewed("core:11:respawn-enemy-separation", "core:glossary:055:07458b8c6cba", 5, 5, "constraint", "Respawn keeps returned models outside enemy engagement"),
    reviewed("core:11:respawn-illegal-placement", "core:glossary:055:07458b8c6cba", 6, 6, "constraint", "Illegally placeable models cannot respawn"),

    reviewed(
      "core:11:shielded-initial-hit-points",
      "core:glossary:056:2fe9ef1c9054",
      1,
      1,
      "definition",
      "Shield value augments the first model and grants shielded status",
      "compound_shield_initialization_mapping_pending",
    ),
    reviewed("core:11:shielded-loss-conditions", "core:glossary:056:2fe9ef1c9054", 2, 2, "timing", "Damage threshold or first-model removal ends shielded"),
    reviewed("core:11:shielded-dependent-abilities", "core:glossary:056:2fe9ef1c9054", 3, 3, "cross_reference", "Other abilities may depend on shielded status"),
    reviewed("core:11:shielded-loss-preserves-hit-points", "core:glossary:056:2fe9ef1c9054", 4, 4, "constraint", "Losing shielded ends dependent effects without removing hit points"),
    reviewed("core:11:shielded-heal-no-restore", "core:glossary:056:2fe9ef1c9054", 5, 5, "constraint", "Heal cannot restore shielded status"),

    reviewed("core:11:sidearm-weapon-limit-override", "core:glossary:057:827941996eba", 1, 1, "permission", "Sidearms bypass the normal one-weapon attack limit"),
    reviewed("core:11:multiple-sidearm-use", "core:glossary:057:827941996eba", 2, 2, "permission", "A model may use every equipped sidearm"),
    reviewed("core:11:sidearm-separate-batches", "core:glossary:057:827941996eba", 3, 3, "constraint", "Each sidearm resolves in its own batch"),
    reviewed("core:11:sidearm-independent-target", "core:glossary:057:827941996eba", 4, 4, "permission", "Separate sidearm batches may select another eligible target"),

    reviewed("core:11:siege-mode-action-restrictions", "core:glossary:058:e8745eb7f7e8", 1, 1, "constraint", "Siege mode prohibits listed movement actions"),
    reviewed("core:11:siege-mode-profile-eligibility", "core:glossary:058:e8745eb7f7e8", 2, 2, "constraint", "Siege weapon profiles require siege status"),
    reviewed("core:11:siege-mode-other-weapons", "core:glossary:058:e8745eb7f7e8", 3, 3, "constraint", "Siege mode disables other weapons"),
    reviewed("core:11:siege-mode-reserve-removal", "core:glossary:058:e8745eb7f7e8", 4, 4, "timing", "Returning to reserves removes siege mode"),

    reviewed("core:11:special-ability-definition", "core:glossary:059:d761f8bae82d", 1, 1, "definition", "A special ability is a named card ability"),
    reviewed("core:11:special-ability-categories", "core:glossary:059:d761f8bae82d", 2, 2, "classification", "Special abilities have three categories"),
    reviewed("core:11:active-ability-timing", "core:glossary:059:d761f8bae82d", 3, 3, "timing", "Active abilities require activation and action-adjacent timing"),
    reviewed("core:11:active-ability-use-limit", "core:glossary:059:d761f8bae82d", 4, 4, "constraint", "Named active abilities have a per-unit round limit unless repeatable"),
    reviewed("core:11:passive-ability-battlefield-duration", "core:glossary:059:d761f8bae82d", 5, 5, "timing", "Passive abilities operate while their unit is on the battlefield"),
    reviewed("core:11:reaction-ability-trigger", "core:glossary:059:d761f8bae82d", 6, 6, "timing", "Reaction abilities answer their specified trigger"),
    reviewed(
      "core:11:reaction-ability-use-limits",
      "core:glossary:059:d761f8bae82d",
      7,
      7,
      "constraint",
      "Reactions have per-activation and named per-unit round limits",
      "compound_reaction_limit_mapping_pending",
    ),
    reviewed("core:11:special-ability-reserve-inactivity", "core:glossary:059:d761f8bae82d", 8, 8, "constraint", "Reserve units' abilities are inactive without an explicit exception"),
    reviewed("core:11:same-named-special-ability-nonstack", "core:glossary:059:d761f8bae82d", 9, 9, "constraint", "Simultaneous same-named special abilities do not stack"),

    reviewed("core:11:specialist-single-weapon-limit", "core:glossary:060:25f3ee34ecc4", 1, 2, "constraint", "Specialist limits a unit to one model with the weapon"),
  ]),
});
