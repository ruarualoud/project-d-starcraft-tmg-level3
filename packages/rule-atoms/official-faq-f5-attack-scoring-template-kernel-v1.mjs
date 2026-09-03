const ENTRY_NUMBERS = Object.freeze([
  1, 2, 3, 4, 28, 29, 30, 31, 32, 33, 60, 61, 62, 63, 65, 66, 67, 68,
]);
const ENTRY_IDS = Object.freeze(ENTRY_NUMBERS.map((entry) => (
  `faq-v1:${String(entry).padStart(2, "0")}`
)));

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function shape(value, keys, code) {
  if (!object(value)) fail(code);
  const allowed = new Set(keys);
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length) fail(`${code}_UNKNOWN_FIELD`, unknown[0]);
  return value;
}
function bool(value, code) {
  if (typeof value !== "boolean") fail(code);
  return value;
}
function text(value, code) {
  const normalized = String(value || "").trim();
  if (!normalized) fail(code);
  return normalized;
}
function number(value, code, min = 0) {
  if (!Number.isFinite(value) || value < min) fail(code);
  return value;
}
function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}
function decision(entryId, legal, values = {}, reasonCodes = []) {
  return freeze({
    schema: "starcraft_tmg_official_faq_f5_rule_decision_v1",
    entryId,
    legal,
    values,
    reasonCodes,
    rulesAuthority: true,
    trainingTruth: false,
  });
}

const handlers = Object.freeze({
  "faq-v1:01": (raw) => {
    const input = shape(raw, ["firstModelHitPoints", "shieldValue", "totalDamage", "heal"],
      "FAQ_F5_01_INPUT_INVALID");
    const hitPoints = number(input.firstModelHitPoints, "FAQ_F5_01_HP_INVALID", 1);
    const shield = number(input.shieldValue, "FAQ_F5_01_SHIELD_INVALID");
    const damage = number(input.totalDamage, "FAQ_F5_01_DAMAGE_INVALID");
    const heal = number(input.heal, "FAQ_F5_01_HEAL_INVALID");
    return decision("faq-v1:01", true, { firstModelCombinedHitPoints: hitPoints + shield,
      totalDamageAfterHeal: Math.max(0, damage - heal) });
  },
  "faq-v1:02": (raw) => {
    const input = shape(raw, ["shieldValue", "finalTotalDamage", "firstModelPresent",
      "shieldedPreviously"], "FAQ_F5_02_INPUT_INVALID");
    const shield = number(input.shieldValue, "FAQ_F5_02_SHIELD_INVALID");
    const damage = number(input.finalTotalDamage, "FAQ_F5_02_DAMAGE_INVALID");
    const first = bool(input.firstModelPresent, "FAQ_F5_02_FIRST_MODEL_STATE_REQUIRED");
    const previous = bool(input.shieldedPreviously, "FAQ_F5_02_PREVIOUS_STATUS_REQUIRED");
    const shielded = previous && first && damage <= shield;
    return decision("faq-v1:02", true, { shielded,
      lostByDamage: previous && damage > shield,
      lostByFirstModelRemoval: previous && !first,
      healMayRestoreShielded: false,
      checkTiming: "after_damage_reduction_and_assignment" });
  },
  "faq-v1:03": (raw) => {
    const input = shape(raw, ["priorTotalDamage", "nonlethalDamage", "shieldValue"],
      "FAQ_F5_03_INPUT_INVALID");
    const prior = number(input.priorTotalDamage, "FAQ_F5_03_PRIOR_DAMAGE_INVALID");
    const nonlethal = number(input.nonlethalDamage, "FAQ_F5_03_NONLETHAL_INVALID");
    const shield = number(input.shieldValue, "FAQ_F5_03_SHIELD_INVALID");
    const total = prior + nonlethal;
    return decision("faq-v1:03", true, { totalDamage: total,
      shieldedLost: total > shield, casualtiesRemovedByNonlethal: 0 });
  },
  "faq-v1:04": (raw) => {
    const input = shape(raw, ["unitDestroyed", "explicitReturnPermission"],
      "FAQ_F5_04_INPUT_INVALID");
    const destroyed = bool(input.unitDestroyed, "FAQ_F5_04_DESTROYED_STATE_REQUIRED");
    const permission = bool(input.explicitReturnPermission, "FAQ_F5_04_PERMISSION_REQUIRED");
    const legal = !destroyed || permission;
    return decision("faq-v1:04", legal, { returnToPlayAllowed: legal,
      explicitExceptionUsed: destroyed && permission }, legal ? []
      : ["DESTROYED_UNIT_RETURN_FORBIDDEN"]);
  },
  "faq-v1:28": (raw) => {
    const input = shape(raw, ["armourDamage", "surgeDamage"],
      "FAQ_F5_28_INPUT_INVALID");
    const armour = number(input.armourDamage, "FAQ_F5_28_ARMOUR_DAMAGE_INVALID");
    const surge = number(input.surgeDamage, "FAQ_F5_28_SURGE_DAMAGE_INVALID");
    const finalPoolBeforeEvade = armour + surge;
    return decision("faq-v1:28", true, { finalPoolBeforeEvade,
      evadeInputDamagePool: finalPoolBeforeEvade,
      surgeIncludedBeforeEvade: true });
  },
  "faq-v1:29": (raw) => {
    const input = shape(raw, ["baseTargetNumber", "modifier"], "FAQ_F5_29_INPUT_INVALID");
    const base = number(input.baseTargetNumber, "FAQ_F5_29_BASE_TARGET_INVALID");
    if (!Number.isFinite(input.modifier)) fail("FAQ_F5_29_MODIFIER_INVALID");
    const modified = base + input.modifier;
    return decision("faq-v1:29", true, { targetNumber: Math.max(2, Math.min(6, modified)),
      checkStillRequired: true });
  },
  "faq-v1:30": (raw) => {
    const input = shape(raw, ["weaponRange", "targetModels"], "FAQ_F5_30_INPUT_INVALID");
    number(input.weaponRange, "FAQ_F5_30_RANGE_INVALID");
    if (!Array.isArray(input.targetModels) || input.targetModels.length === 0) {
      fail("FAQ_F5_30_TARGET_MODELS_REQUIRED");
    }
    const eligibleModelIds = [];
    for (const model of input.targetModels) {
      shape(model, ["modelId", "visibleToAnyAttacker", "distance"],
        "FAQ_F5_30_MODEL_INVALID");
      const modelId = text(model.modelId, "FAQ_F5_30_MODEL_ID_REQUIRED");
      const visible = bool(model.visibleToAnyAttacker, "FAQ_F5_30_VISIBILITY_REQUIRED");
      number(model.distance, "FAQ_F5_30_DISTANCE_INVALID");
      if (visible) eligibleModelIds.push(modelId);
    }
    return decision("faq-v1:30", true, { eligibleModelIds,
      casualtyRangeFilterApplied: false });
  },
  "faq-v1:31": (raw) => {
    const input = shape(raw, ["allModelsInEnemyBaseContact", "leadingStartDistance",
      "leadingEndDistance"], "FAQ_F5_31_INPUT_INVALID");
    const allContact = bool(input.allModelsInEnemyBaseContact,
      "FAQ_F5_31_CONTACT_STATE_REQUIRED");
    const start = number(input.leadingStartDistance, "FAQ_F5_31_START_DISTANCE_INVALID");
    const end = number(input.leadingEndDistance, "FAQ_F5_31_END_DISTANCE_INVALID");
    const legal = !allContact && end < start;
    return decision("faq-v1:31", legal, { leadingEndsCloser: end < start }, legal ? []
      : [allContact ? "CLOSE_RANKS_ALL_MODELS_ALREADY_IN_BASE_CONTACT"
        : "CLOSE_RANKS_LEADER_MUST_END_CLOSER"]);
  },
  "faq-v1:32": (raw) => {
    const input = shape(raw, ["enemyUnitIds", "candidates"], "FAQ_F5_32_INPUT_INVALID");
    if (!Array.isArray(input.enemyUnitIds) || input.enemyUnitIds.length < 2
      || !Array.isArray(input.candidates) || input.candidates.length === 0) {
      fail("FAQ_F5_32_MULTI_ENEMY_CANDIDATES_REQUIRED");
    }
    const enemyIds = [...new Set(input.enemyUnitIds.map((id) => text(id,
      "FAQ_F5_32_ENEMY_ID_INVALID")))];
    if (enemyIds.length !== input.enemyUnitIds.length) fail("FAQ_F5_32_ENEMY_IDS_DUPLICATE");
    const candidates = input.candidates.map((candidate) => {
      shape(candidate, ["modelId", "priority", "engagedEnemyUnitIdsAfter"],
        "FAQ_F5_32_CANDIDATE_INVALID");
      if (!Array.isArray(candidate.engagedEnemyUnitIdsAfter)) {
        fail("FAQ_F5_32_ENGAGEMENT_SET_REQUIRED");
      }
      return { modelId: text(candidate.modelId, "FAQ_F5_32_MODEL_ID_REQUIRED"),
        priority: number(candidate.priority, "FAQ_F5_32_PRIORITY_INVALID", 1),
        preservesAll: enemyIds.every((id) => candidate.engagedEnemyUnitIdsAfter.includes(id)) };
    });
    const preserving = candidates.filter((candidate) => candidate.preservesAll);
    const pool = preserving.length ? preserving : candidates;
    const bestPriority = Math.min(...pool.map((candidate) => candidate.priority));
    return decision("faq-v1:32", true, { eligibleModelIds: pool
      .filter((candidate) => candidate.priority === bestPriority)
      .map((candidate) => candidate.modelId), preserveAllAlternativeExists: preserving.length > 0 });
  },
  "faq-v1:33": (raw) => {
    const input = shape(raw, ["weaponProfileIds", "completedBatchCount",
      "currentBatchResolved"], "FAQ_F5_33_INPUT_INVALID");
    if (!Array.isArray(input.weaponProfileIds) || input.weaponProfileIds.length < 2
      || new Set(input.weaponProfileIds).size !== input.weaponProfileIds.length) {
      fail("FAQ_F5_33_DIFFERENT_WEAPON_PROFILES_REQUIRED");
    }
    const completed = number(input.completedBatchCount, "FAQ_F5_33_COMPLETED_COUNT_INVALID");
    const resolved = bool(input.currentBatchResolved, "FAQ_F5_33_RESOLUTION_STATE_REQUIRED");
    const legal = completed === 0 || resolved;
    return decision("faq-v1:33", legal, { nextTargetDeclarationAllowed: legal,
      allTargetsDeclaredUpfront: false }, legal ? [] : ["PREVIOUS_WEAPON_BATCH_NOT_RESOLVED"]);
  },
  "faq-v1:60": (raw) => {
    const input = shape(raw, ["weaponBatchId", "modelCount", "precision", "surge", "critical"],
      "FAQ_F5_60_INPUT_INVALID");
    text(input.weaponBatchId, "FAQ_F5_60_BATCH_ID_REQUIRED");
    number(input.modelCount, "FAQ_F5_60_MODEL_COUNT_INVALID", 1);
    const modifiers = ["precision", "surge", "critical"].filter((key) => (
      bool(input[key], `FAQ_F5_60_${key.toUpperCase()}_REQUIRED`)
    ));
    return decision("faq-v1:60", true, { modifierScope: "weapon_batch",
      appliedOncePerBatch: true, activeModifiers: modifiers });
  },
  "faq-v1:61": (raw) => {
    const input = shape(raw, ["weaponProfileId", "targetAllocations", "precisionSuccesses"],
      "FAQ_F5_61_INPUT_INVALID");
    text(input.weaponProfileId, "FAQ_F5_61_PROFILE_REQUIRED");
    const successes = number(input.precisionSuccesses, "FAQ_F5_61_SUCCESSES_INVALID");
    if (!Array.isArray(input.targetAllocations) || input.targetAllocations.length < 2) {
      fail("FAQ_F5_61_SPLIT_TARGETS_REQUIRED");
    }
    let allocated = 0;
    const targetDamagePools = input.targetAllocations.map((allocation) => {
      shape(allocation, ["targetUnitId", "successes"], "FAQ_F5_61_ALLOCATION_INVALID");
      const row = { targetUnitId: text(allocation.targetUnitId,
        "FAQ_F5_61_TARGET_REQUIRED"), successes: number(allocation.successes,
        "FAQ_F5_61_ALLOCATION_COUNT_INVALID") };
      allocated += row.successes;
      return row;
    });
    const legal = allocated === successes;
    return decision("faq-v1:61", legal, { simultaneousBatch: true, targetDamagePools },
      legal ? [] : ["PRECISION_RESULT_ALLOCATION_MISMATCH"]);
  },
  "faq-v1:62": (raw) => {
    const input = shape(raw, ["supplyBeforeMorph", "supplyAfterMorph", "opponentVictoryPoints"],
      "FAQ_F5_62_INPUT_INVALID");
    const before = number(input.supplyBeforeMorph, "FAQ_F5_62_SUPPLY_BEFORE_INVALID");
    const after = number(input.supplyAfterMorph, "FAQ_F5_62_SUPPLY_AFTER_INVALID");
    const priorVp = number(input.opponentVictoryPoints, "FAQ_F5_62_VP_INVALID");
    const lost = Math.max(0, before - after);
    return decision("faq-v1:62", true, { supplyLost: lost,
      opponentVictoryPointsAfter: priorVp + lost });
  },
  "faq-v1:63": (raw) => {
    const input = shape(raw, ["unitMorphed", "supplyBefore", "supplyAfter"],
      "FAQ_F5_63_INPUT_INVALID");
    const morphed = bool(input.unitMorphed, "FAQ_F5_63_MORPHED_REQUIRED");
    const before = number(input.supplyBefore, "FAQ_F5_63_SUPPLY_BEFORE_INVALID");
    const after = number(input.supplyAfter, "FAQ_F5_63_SUPPLY_AFTER_INVALID");
    return decision("faq-v1:63", true, { opponentVictoryPointDelta:
      morphed ? Math.max(0, before - after) : 0 });
  },
  "faq-v1:65": (raw) => {
    const input = shape(raw, ["actingUnitId", "hasPhysicalPrimaryModel", "targetPointElevation",
      "coveredModels"], "FAQ_F5_65_INPUT_INVALID");
    const actor = text(input.actingUnitId, "FAQ_F5_65_ACTOR_REQUIRED");
    const primary = bool(input.hasPhysicalPrimaryModel, "FAQ_F5_65_PRIMARY_STATE_REQUIRED");
    const elevation = text(input.targetPointElevation, "FAQ_F5_65_ELEVATION_REQUIRED");
    if (primary || !Array.isArray(input.coveredModels)) {
      fail("FAQ_F5_65_MODEL_LESS_BLAST_REQUIRED");
    }
    const affectedModelIds = [];
    for (const model of input.coveredModels) {
      shape(model, ["modelId", "elevation", "flying", "baseCovered"],
        "FAQ_F5_65_MODEL_INVALID");
      const modelId = text(model.modelId, "FAQ_F5_65_MODEL_ID_REQUIRED");
      bool(model.flying, "FAQ_F5_65_FLYING_REQUIRED");
      const covered = bool(model.baseCovered, "FAQ_F5_65_COVERAGE_REQUIRED");
      if (covered && text(model.elevation, "FAQ_F5_65_MODEL_ELEVATION_REQUIRED")
        === elevation) affectedModelIds.push(modelId);
    }
    return decision("faq-v1:65", true, { attackingUnitId: actor,
      primaryTargetKind: "ground_point", primaryTargetCombatTags: [],
      targetPointElevation: elevation, affectedModelIds,
      flyingUsesPhysicalBaseElevation: true });
  },
  "faq-v1:66": (raw) => {
    const input = shape(raw, ["primaryCombatTags", "targetCombatTags", "primaryElevation",
      "targetElevation", "targetFlying"], "FAQ_F5_66_INPUT_INVALID");
    if (!Array.isArray(input.primaryCombatTags) || !Array.isArray(input.targetCombatTags)) {
      fail("FAQ_F5_66_COMBAT_TAGS_REQUIRED");
    }
    const primaryTags = new Set(input.primaryCombatTags.map((tag) => text(tag,
      "FAQ_F5_66_PRIMARY_TAG_INVALID")));
    const sharedTag = input.targetCombatTags.some((tag) => primaryTags.has(text(tag,
      "FAQ_F5_66_TARGET_TAG_INVALID")));
    const sameElevation = text(input.primaryElevation, "FAQ_F5_66_PRIMARY_ELEVATION_REQUIRED")
      === text(input.targetElevation, "FAQ_F5_66_TARGET_ELEVATION_REQUIRED");
    const flying = bool(input.targetFlying, "FAQ_F5_66_FLYING_REQUIRED");
    const legal = sharedTag && sameElevation && !flying;
    return decision("faq-v1:66", legal, { sharedCombatTag: sharedTag,
      sameElevation, flyingExcludedFromStandardElevation: flying }, legal ? [] : [!sharedTag
      ? "SPILLOVER_SHARED_COMBAT_TAG_REQUIRED" : !sameElevation
        ? "SPILLOVER_ELEVATION_MISMATCH" : "FLYING_NOT_ON_STANDARD_TEMPLATE_ELEVATION"]);
  },
  "faq-v1:67": (raw) => {
    const input = shape(raw, ["guardianShieldApplies", "batches"], "FAQ_F5_67_INPUT_INVALID");
    const applies = bool(input.guardianShieldApplies, "FAQ_F5_67_SHIELD_STATE_REQUIRED");
    if (!Array.isArray(input.batches) || input.batches.length === 0) {
      fail("FAQ_F5_67_BATCHES_REQUIRED");
    }
    const batchDice = input.batches.map((batch) => {
      shape(batch, ["batchId", "kind", "attackDice"], "FAQ_F5_67_BATCH_INVALID");
      const kind = text(batch.kind, "FAQ_F5_67_BATCH_KIND_REQUIRED");
      if (!kind.startsWith("main") && !kind.startsWith("spillover")) {
        fail("FAQ_F5_67_BATCH_KIND_INVALID");
      }
      const dice = number(batch.attackDice, "FAQ_F5_67_DICE_INVALID");
      return { batchId: text(batch.batchId, "FAQ_F5_67_BATCH_ID_REQUIRED"), kind,
        attackDice: applies ? Math.max(0, dice - 1) : dice };
    });
    return decision("faq-v1:67", true, { batchDice, reductionAppliedPerBatch: applies });
  },
  "faq-v1:68": (raw) => {
    const input = shape(raw, ["batchKind", "weaponHasPrecision", "weaponHasCritical"],
      "FAQ_F5_68_INPUT_INVALID");
    const batchKind = text(input.batchKind, "FAQ_F5_68_BATCH_KIND_REQUIRED");
    if (!batchKind.startsWith("main") && !batchKind.startsWith("spillover")) {
      fail("FAQ_F5_68_BATCH_KIND_INVALID");
    }
    const precision = bool(input.weaponHasPrecision, "FAQ_F5_68_PRECISION_REQUIRED");
    const critical = bool(input.weaponHasCritical, "FAQ_F5_68_CRITICAL_REQUIRED");
    const main = batchKind.startsWith("main");
    return decision("faq-v1:68", true, { precisionApplies: main && precision,
      criticalApplies: main && critical, spilloverIsBasicUnmodifiedBatch: !main });
  },
});

export const OFFICIAL_FAQ_F5_BEHAVIOR_KEYS_V1 = Object.freeze(
  Object.fromEntries(ENTRY_IDS.map((entryId) => [
    entryId.replace("faq-v1:", "faq_f5_"), entryId,
  ])),
);

export function evaluateOfficialFaqF5RuleV1(entryId, input = {}) {
  if (!ENTRY_IDS.includes(entryId) || !handlers[entryId]) {
    fail("FAQ_F5_ENTRY_NOT_EXECUTABLE", String(entryId));
  }
  return handlers[entryId](input);
}
