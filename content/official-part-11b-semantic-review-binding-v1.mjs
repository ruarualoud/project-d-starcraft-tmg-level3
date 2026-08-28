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
  "core:glossary:013:745b4006efd0",
  "core:glossary:014:210360ec02ed",
  "core:glossary:015:bc76670d9ea0",
  "core:glossary:016:9c7addeaf9bc",
  "core:glossary:017:0f463aae2f25",
  "core:glossary:018:5fb28e1026ef",
  "core:glossary:019:61805f9ab6e3",
  "core:glossary:020:2437a9f8e626",
  "core:glossary:021:4ce07020be14",
  "core:glossary:022:a826cb99d518",
  "core:glossary:023:be040a0c9907",
  "core:glossary:024:39cf2e8714d4",
]);

export const OFFICIAL_PART_11B_SEMANTIC_REVIEW_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_part_semantic_clause_batch_review_binding_v1",
  sourcePart: "11",
  batchId: "part-11b",
  coreClauseCandidateDenominatorHash: "64cf70a7af278cdc603cd05a2a2a997c7658ef27a7705ff91ed3afdbc86905aa",
  reviewPacketHash: "7faa59920f1baf28bd40fb6703f9b3f2828a70a867b5aebcbe6f126333a2e8c7",
  batchPlanHash: "f6ddbe26782a39f838ad9b2a550d0e49f10f829dbac88024c4a55999f005a9ef",
  anchorIds: ANCHOR_IDS,
  reviewMethod: "semantic_review_against_gitignored_official_source_packet",
  reviewAuthority: "development_evidence_only",
  clauses: Object.freeze([
    reviewed("core:11:controlling-player-definition", "core:glossary:013:745b4006efd0", 1, 1, "definition", "Controlling player definition"),
    reviewed("core:11:controlling-player-decision-authority", "core:glossary:013:745b4006efd0", 2, 2, "definition", "Controller owns decisions and dice rolls"),
    reviewed("core:11:control-transfer-equivalence", "core:glossary:013:745b4006efd0", 3, 3, "definition", "Transferred controller acts as unit owner"),

    reviewed("core:11:critical-hit-resolution", "core:glossary:014:210360ec02ed", 1, 2, "constraint", "Critical hit bypasses armour up to the armour-pool count"),

    reviewed("core:11:current-supply-definition", "core:glossary:015:bc76670d9ea0", 1, 1, "definition", "Current supply follows remaining-model supply profile"),
    reviewed("core:11:current-supply-casualty-update", "core:glossary:015:bc76670d9ea0", 2, 2, "timing", "Casualty bracket change immediately updates current supply"),
    reviewed("core:11:current-supply-rule-uses", "core:glossary:015:bc76670d9ea0", 3, 3, "cross_reference", "Current supply deployment, control, disengage, and scoring uses"),

    reviewed("core:11:debuff-duration", "core:glossary:016:9c7addeaf9bc", 1, 1, "timing", "Characteristic debuff duration"),
    reviewed("core:11:debuff-target-number", "core:glossary:016:9c7addeaf9bc", 2, 2, "definition", "Debuff increases a target-number characteristic"),
    reviewed("core:11:debuff-value", "core:glossary:016:9c7addeaf9bc", 3, 3, "definition", "Debuff decreases a value characteristic to a zero minimum"),

    reviewed("core:11:displacement-overlap-permission", "core:glossary:017:0f463aae2f25", 1, 1, "permission", "Leading model may end movement overlapping displacement object"),
    reviewed("core:11:displacement-contact-resolution", "core:glossary:017:0f463aae2f25", 2, 3, "timing", "Movement overlap immediately places displacement object in contact or nearest position"),

    reviewed("core:11:dodge-surge-reduction", "core:glossary:018:5fb28e1026ef", 1, 2, "timing", "Dodge reduces surge or critical-hit transfer during surge resolution"),

    reviewed("core:11:effective-size-formula", "core:glossary:019:61805f9ab6e3", 1, 1, "definition", "Model effective-size formula"),
    reviewed("core:11:effective-size-ground-level-restatement", "core:glossary:019:61805f9ab6e3", 2, 2, "definition", "Ground-level effective size equals model size"),
    reviewed("core:11:elevated-model-effective-size", "core:glossary:019:61805f9ab6e3", 3, 3, "definition", "Elevated model adds supporting terrain size"),
    reviewed("core:11:stacked-terrain-effective-size", "core:glossary:019:61805f9ab6e3", 4, 4, "definition", "Stacked terrain adds supporting terrain size"),
    reviewed("core:11:effective-size-cover-use", "core:glossary:019:61805f9ab6e3", 5, 5, "constraint", "Effective size determines cover line-of-sight blocking"),
    reviewed("core:11:flying-cover-effective-size", "core:glossary:019:61805f9ab6e3", 6, 6, "definition", "Flying effective size exceeds terrain for cover"),

    reviewed("core:11:elevation-level-map", "core:glossary:020:2437a9f8e626", 1, 3, "definition", "Ground, middle, and high elevation map"),
    reviewed("core:11:model-base-elevation", "core:glossary:020:2437a9f8e626", 4, 4, "definition", "Model base determines occupied elevation"),
    reviewed("core:11:multiple-elevation-highest", "core:glossary:020:2437a9f8e626", 5, 5, "priority", "Model spanning elevations uses the highest"),

    reviewed("core:11:enemy-definition", "core:glossary:021:4ce07020be14", 1, 1, "definition", "Enemy ownership definition including team games"),
    reviewed(
      "core:11:enemy-targeting-and-rule-use",
      "core:glossary:021:4ce07020be14",
      2,
      2,
      "rule_summary",
      "Friendly attack prohibition and enemy rule uses",
      "compound_enemy_semantics_mapping_pending",
    ),

    reviewed("core:11:engaged-ground-condition", "core:glossary:022:a826cb99d518", 1, 1, "constraint", "Enemy ground models within engagement range engage"),
    reviewed("core:11:flying-cannot-be-engaged", "core:glossary:022:a826cb99d518", 2, 2, "constraint", "Flying models cannot be engaged"),
    reviewed("core:11:engaged-terrain-block", "core:glossary:022:a826cb99d518", 3, 3, "constraint", "Large intervening terrain prevents engagement"),
    reviewed("core:11:engaged-elevation-separation", "core:glossary:022:a826cb99d518", 4, 4, "constraint", "High and ground elevation models do not engage across levels"),
    reviewed("core:11:engaged-unit-propagation", "core:glossary:022:a826cb99d518", 5, 5, "definition", "One engaged model makes the whole unit engaged"),
    reviewed("core:11:engaged-movement-restriction", "core:glossary:022:a826cb99d518", 6, 6, "constraint", "Engaged unit must disengage or hold instead of standard move"),
    reviewed("core:11:engaged-ranged-restrictions", "core:glossary:022:a826cb99d518", 7, 7, "constraint", "Engaged unit receives ranged-attack restrictions"),

    reviewed("core:11:engagement-range-distance", "core:glossary:023:be040a0c9907", 1, 1, "definition", "Engagement range horizontal distance"),
    reviewed("core:11:mutual-engagement-range", "core:glossary:023:be040a0c9907", 2, 2, "constraint", "Enemy ground models mutually within range are engaged"),
    reviewed("core:11:engagement-range-top-down-measurement", "core:glossary:023:be040a0c9907", 3, 3, "definition", "Engagement range uses top-down horizontal measurement"),
    reviewed("core:11:engagement-range-rule-uses", "core:glossary:023:be040a0c9907", 4, 4, "cross_reference", "Engagement range movement and combat uses"),
    reviewed("core:11:melee-engagement-range", "core:glossary:023:be040a0c9907", 5, 5, "definition", "Melee range symbol requires engagement-range target"),

    reviewed("core:11:entry-edge-definition", "core:glossary:024:39cf2e8714d4", 1, 1, "definition", "Deployment card assigns a player entry edge"),
    reviewed("core:11:entry-edge-reserve-deployment", "core:glossary:024:39cf2e8714d4", 2, 2, "constraint", "Reserve units deploy from assigned entry edge"),
  ]),
});
