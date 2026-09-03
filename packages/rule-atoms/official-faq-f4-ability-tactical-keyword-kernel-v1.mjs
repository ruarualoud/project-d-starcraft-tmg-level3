const ENTRY_NUMBERS = Object.freeze([
  ...Array.from({ length: 26 }, (_, index) => index + 34),
  64,
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
function enumeration(value, allowed, code) {
  if (!allowed.includes(value)) fail(code);
  return value;
}
function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}
function decision(entryId, legal, values = {}, reasonCodes = []) {
  return freeze({
    schema: "starcraft_tmg_official_faq_f4_rule_decision_v1",
    entryId,
    legal,
    values,
    reasonCodes,
    rulesAuthority: true,
    trainingTruth: false,
  });
}

const handlers = Object.freeze({
  "faq-v1:34": (raw) => {
    const input = shape(raw, ["requiredResourceType", "requiredAmount", "cards",
      "selectedCardIds"], "FAQ_F4_34_INPUT_INVALID");
    const type = enumeration(input.requiredResourceType, ["cp", "bm", "pe"],
      "FAQ_F4_34_RESOURCE_TYPE_INVALID");
    const amount = number(input.requiredAmount, "FAQ_F4_34_AMOUNT_INVALID", 1);
    if (!Array.isArray(input.cards) || !Array.isArray(input.selectedCardIds)
      || new Set(input.selectedCardIds).size !== input.selectedCardIds.length) {
      fail("FAQ_F4_34_CARD_SELECTION_INVALID");
    }
    const byId = new Map(input.cards.map((card) => {
      shape(card, ["cardId", "resourceType", "value", "ready"], "FAQ_F4_34_CARD_INVALID");
      return [text(card.cardId, "FAQ_F4_34_CARD_ID_REQUIRED"), card];
    }));
    const selected = input.selectedCardIds.map((id) => byId.get(id));
    const valid = selected.length > 0 && selected.every((card) => card
      && card.ready === true && card.resourceType === type && Number.isFinite(card.value)
      && card.value > 0);
    const generated = valid ? selected.reduce((sum, card) => sum + card.value, 0) : 0;
    const legal = valid && generated >= amount;
    return decision("faq-v1:34", legal, { generated, paid: legal ? amount : 0,
      excessLost: legal ? generated - amount : 0,
      exhaustedCardIds: legal ? [...input.selectedCardIds] : [] },
    legal ? [] : [valid ? "ABILITY_RESOURCE_PAYMENT_INSUFFICIENT"
      : "ABILITY_PAYMENT_CARD_NOT_READY_OR_WRONG_TYPE"]);
  },
  "faq-v1:35": (raw) => {
    const input = shape(raw, ["sourceUnitId", "subjectUnitId", "explicitSelfExclusion"],
      "FAQ_F4_35_INPUT_INVALID");
    const source = text(input.sourceUnitId, "FAQ_F4_35_SOURCE_REQUIRED");
    const subject = text(input.subjectUnitId, "FAQ_F4_35_SUBJECT_REQUIRED");
    const exclusion = bool(input.explicitSelfExclusion, "FAQ_F4_35_EXCLUSION_REQUIRED");
    const withinRange = source === subject && !exclusion;
    return decision("faq-v1:35", true, { withinRange, selfRangeDefault: source === subject,
      explicitSelfExclusionApplied: exclusion });
  },
  "faq-v1:36": (raw) => {
    const input = shape(raw, ["abilityType", "activeUnitOnBattlefield", "cardAffectsActiveUnit"],
      "FAQ_F4_36_INPUT_INVALID");
    enumeration(input.abilityType, ["tactical_card_active"], "FAQ_F4_36_ACTIVE_REQUIRED");
    const present = bool(input.activeUnitOnBattlefield, "FAQ_F4_36_UNIT_STATE_REQUIRED");
    bool(input.cardAffectsActiveUnit, "FAQ_F4_36_CARD_EFFECT_STATE_REQUIRED");
    return decision("faq-v1:36", present, { requiresActiveBattlefieldUnit: true },
      present ? [] : ["TACTICAL_ACTIVE_REQUIRES_ACTIVE_BATTLEFIELD_UNIT"]);
  },
  "faq-v1:37": (raw) => {
    const input = shape(raw, ["abilityType", "costPaid", "nameUsedByUnitThisRound",
      "repeatable", "reactionsResolvedThisActivation"], "FAQ_F4_37_INPUT_INVALID");
    const type = enumeration(input.abilityType, ["active", "tactical_active", "reaction"],
      "FAQ_F4_37_ABILITY_TYPE_INVALID");
    const paid = bool(input.costPaid, "FAQ_F4_37_COST_STATE_REQUIRED");
    const used = bool(input.nameUsedByUnitThisRound, "FAQ_F4_37_NAME_USE_REQUIRED");
    const repeatable = bool(input.repeatable, "FAQ_F4_37_REPEATABLE_REQUIRED");
    const reactions = number(input.reactionsResolvedThisActivation,
      "FAQ_F4_37_REACTION_COUNT_INVALID");
    const legal = paid && (type === "reaction" ? reactions === 0
      : (!used || repeatable));
    return decision("faq-v1:37", legal, { differentlyNamedAbilityCountCapped: false,
      namedActiveLimitApplied: type !== "reaction" && !repeatable,
      reactionLimitApplied: type === "reaction" }, legal ? [] : [!paid
      ? "ABILITY_COST_NOT_PAID" : type === "reaction" ? "REACTION_LIMIT_REACHED"
        : "NAMED_ACTIVE_ALREADY_USED_THIS_ROUND"]);
  },
  "faq-v1:38": (raw) => {
    const input = shape(raw, ["lineOfSightToFriendlyChargedUnit", "lineOfSightToEnemyCharger"],
      "FAQ_F4_38_INPUT_INVALID");
    const friendly = bool(input.lineOfSightToFriendlyChargedUnit,
      "FAQ_F4_38_FRIENDLY_LOS_REQUIRED");
    bool(input.lineOfSightToEnemyCharger, "FAQ_F4_38_ENEMY_LOS_REQUIRED");
    return decision("faq-v1:38", friendly, { lineOfSightSubject: "friendly_charged_unit" },
      friendly ? [] : ["CONCUSSIVE_SHELLS_FRIENDLY_UNIT_NOT_VISIBLE"]);
  },
  "faq-v1:39": (raw) => {
    const input = shape(raw, ["modifierSources"], "FAQ_F4_39_INPUT_INVALID");
    if (!Array.isArray(input.modifierSources) || input.modifierSources.length === 0) {
      fail("FAQ_F4_39_MODIFIERS_REQUIRED");
    }
    const names = new Set();
    let total = 0;
    for (const source of input.modifierSources) {
      shape(source, ["name", "value", "kind"], "FAQ_F4_39_MODIFIER_INVALID");
      const name = text(source.name, "FAQ_F4_39_MODIFIER_NAME_REQUIRED");
      if (names.has(name) || source.kind !== "numeric") fail("FAQ_F4_39_MODIFIER_SOURCE_INVALID");
      names.add(name);
      total += number(source.value, "FAQ_F4_39_MODIFIER_VALUE_INVALID");
    }
    return decision("faq-v1:39", true, { totalImpactModifier: total,
      stackedSourceCount: names.size });
  },
  "faq-v1:40": (raw) => {
    const input = shape(raw, ["speedModifiers"], "FAQ_F4_40_INPUT_INVALID");
    if (!Array.isArray(input.speedModifiers)) fail("FAQ_F4_40_MODIFIERS_REQUIRED");
    const flatNames = new Set();
    let flatTotal = 0;
    let buffMaximum = 0;
    for (const modifier of input.speedModifiers) {
      shape(modifier, ["name", "value", "kind"], "FAQ_F4_40_MODIFIER_INVALID");
      const name = text(modifier.name, "FAQ_F4_40_MODIFIER_NAME_REQUIRED");
      const value = number(modifier.value, "FAQ_F4_40_MODIFIER_VALUE_INVALID");
      const kind = enumeration(modifier.kind, ["flat", "buff_speed"],
        "FAQ_F4_40_MODIFIER_KIND_INVALID");
      if (kind === "flat") {
        if (flatNames.has(name)) fail("FAQ_F4_40_DUPLICATE_FLAT_SOURCE");
        flatNames.add(name);
        flatTotal += value;
      } else {
        buffMaximum = Math.max(buffMaximum, value);
      }
    }
    return decision("faq-v1:40", true, { flatTotal, buffApplied: buffMaximum,
      totalSpeedModifier: flatTotal + buffMaximum });
  },
  "faq-v1:41": (raw) => {
    const input = shape(raw, ["opponentOccupiesIndicator", "timing"],
      "FAQ_F4_41_INPUT_INVALID");
    const blocked = bool(input.opponentOccupiesIndicator, "FAQ_F4_41_BLOCKED_STATE_REQUIRED");
    const timing = enumeration(input.timing, ["deployment_attempt", "end_round"],
      "FAQ_F4_41_TIMING_INVALID");
    return decision("faq-v1:41", true, { opponentOccupationAllowed: true,
      deploymentCompleted: timing === "deployment_attempt" ? !blocked : false,
      indicatorRemoved: timing === "end_round" && blocked,
      abilityWasted: blocked }, []);
  },
  "faq-v1:42": (raw) => {
    const input = shape(raw, ["placeDistance", "artanisBaseContactSelectedModel"],
      "FAQ_F4_42_INPUT_INVALID");
    const distance = number(input.placeDistance, "FAQ_F4_42_DISTANCE_INVALID");
    const contact = bool(input.artanisBaseContactSelectedModel, "FAQ_F4_42_CONTACT_REQUIRED");
    const legal = distance === 0 && contact;
    return decision("faq-v1:42", legal, { placeZeroMeansBaseContact: true },
      legal ? [] : [distance !== 0 ? "PHASE_PRISM_PLACE_DISTANCE_NOT_ZERO"
        : "ARTANIS_NOT_IN_CONTACT_WITH_SELECTED_MODEL"]);
  },
  "faq-v1:43": (raw) => {
    const input = shape(raw, ["existingDamage", "newDamage", "damageRemoval"],
      "FAQ_F4_43_INPUT_INVALID");
    const existing = number(input.existingDamage, "FAQ_F4_43_EXISTING_DAMAGE_INVALID");
    const added = number(input.newDamage, "FAQ_F4_43_NEW_DAMAGE_INVALID");
    const removal = number(input.damageRemoval, "FAQ_F4_43_REMOVAL_INVALID");
    const combined = existing + added;
    return decision("faq-v1:43", true, { combinedDamageBeforeRemoval: combined,
      finalTotalDamage: Math.max(0, combined - removal) });
  },
  "faq-v1:44": (raw) => {
    const input = shape(raw, ["usesTunnellingClaws", "crossesForceField"],
      "FAQ_F4_44_INPUT_INVALID");
    const tunnelling = bool(input.usesTunnellingClaws, "FAQ_F4_44_TUNNELLING_REQUIRED");
    const crosses = bool(input.crossesForceField, "FAQ_F4_44_FORCE_FIELD_REQUIRED");
    const legal = !(tunnelling && crosses);
    return decision("faq-v1:44", legal, {}, legal ? [] : ["TUNNELLING_CLAWS_FORCE_FIELD_BLOCKED"]);
  },
  "faq-v1:45": (raw) => {
    const input = shape(raw, ["actionType", "modelSize", "overlapsForceField"],
      "FAQ_F4_45_INPUT_INVALID");
    enumeration(input.actionType, ["place"], "FAQ_F4_45_PLACE_REQUIRED");
    number(input.modelSize, "FAQ_F4_45_MODEL_SIZE_INVALID", 1);
    bool(input.overlapsForceField, "FAQ_F4_45_OVERLAP_REQUIRED");
    return decision("faq-v1:45", true, { countsAsMovement: false,
      forceFieldRemoved: false });
  },
  "faq-v1:46": (raw) => {
    const input = shape(raw, ["unitIsRaptor", "modelSize", "crossesForceField"],
      "FAQ_F4_46_INPUT_INVALID");
    const raptor = bool(input.unitIsRaptor, "FAQ_F4_46_RAPTOR_REQUIRED");
    const size = number(input.modelSize, "FAQ_F4_46_MODEL_SIZE_INVALID", 1);
    const crosses = bool(input.crossesForceField, "FAQ_F4_46_CROSSING_REQUIRED");
    const legal = !(raptor && crosses && size > 2);
    return decision("faq-v1:46", legal, { forceFieldPermissionMaximumSize: 2 },
      legal ? [] : ["RAPTOR_FORCE_FIELD_SIZE_RESTRICTION"]);
  },
  "faq-v1:47": (raw) => {
    const input = shape(raw, ["startedOnCreep", "endedOnCreep"], "FAQ_F4_47_INPUT_INVALID");
    const started = bool(input.startedOnCreep, "FAQ_F4_47_START_STATE_REQUIRED");
    bool(input.endedOnCreep, "FAQ_F4_47_END_STATE_REQUIRED");
    return decision("faq-v1:47", true, { creepSpeedBonusAppliedForWholeMove: started,
      evaluationTiming: "movement_start" });
  },
  "faq-v1:48": (raw) => {
    const input = shape(raw, ["academyReady", "cleanupRefreshCompleted"],
      "FAQ_F4_48_INPUT_INVALID");
    const ready = bool(input.academyReady, "FAQ_F4_48_ACADEMY_STATE_REQUIRED");
    const cleanup = bool(input.cleanupRefreshCompleted, "FAQ_F4_48_CLEANUP_STATE_REQUIRED");
    const available = ready || cleanup;
    return decision("faq-v1:48", available, { advancedTrainingAvailable: available },
      available ? [] : ["ACADEMY_EXHAUSTED_UNTIL_CLEANUP"]);
  },
  "faq-v1:49": (raw) => {
    const input = shape(raw, ["timing", "usesForTrigger", "simultaneous",
      "seatIsFirstPlayer"], "FAQ_F4_49_INPUT_INVALID");
    const timing = enumeration(input.timing, ["inside_activation", "outside_activation"],
      "FAQ_F4_49_TIMING_INVALID");
    const uses = number(input.usesForTrigger, "FAQ_F4_49_TRIGGER_USE_INVALID");
    const simultaneous = bool(input.simultaneous, "FAQ_F4_49_SIMULTANEOUS_REQUIRED");
    const first = bool(input.seatIsFirstPlayer, "FAQ_F4_49_FIRST_PLAYER_REQUIRED");
    const legal = uses === 0;
    return decision("faq-v1:49", legal, { outsideActivationAllowed: timing === "outside_activation",
      priority: simultaneous && timing === "outside_activation"
        ? (first ? 0 : 1) : null }, legal ? [] : ["REACTION_ALREADY_USED_FOR_TRIGGER"]);
  },
  "faq-v1:50": (raw) => {
    const input = shape(raw, ["targetType", "effectTargetScope", "explicitlyExcludesStructure"],
      "FAQ_F4_50_INPUT_INVALID");
    enumeration(input.targetType, ["structure"], "FAQ_F4_50_STRUCTURE_REQUIRED");
    const scope = enumeration(input.effectTargetScope, ["area", "unit"],
      "FAQ_F4_50_SCOPE_INVALID");
    const excluded = bool(input.explicitlyExcludesStructure, "FAQ_F4_50_EXCLUSION_REQUIRED");
    return decision("faq-v1:50", !excluded, { scope },
      excluded ? ["STRUCTURE_EXPLICITLY_EXCLUDED"] : []);
  },
  "faq-v1:51": (raw) => {
    const input = shape(raw, ["verb", "explicitlyDistinguished"], "FAQ_F4_51_INPUT_INVALID");
    const verb = enumeration(input.verb, ["select", "target"], "FAQ_F4_51_VERB_INVALID");
    const distinguished = bool(input.explicitlyDistinguished, "FAQ_F4_51_DISTINCTION_REQUIRED");
    return decision("faq-v1:51", true, { normalizedVerb: distinguished ? verb : "target" });
  },
  "faq-v1:52": (raw) => {
    const input = shape(raw, ["unitIsAdept", "carryingClaimedArtefact",
      "usesPsionicTransfer"], "FAQ_F4_52_INPUT_INVALID");
    const adept = bool(input.unitIsAdept, "FAQ_F4_52_ADEPT_REQUIRED");
    const carrying = bool(input.carryingClaimedArtefact, "FAQ_F4_52_ARTEFACT_STATE_REQUIRED");
    const transfer = bool(input.usesPsionicTransfer, "FAQ_F4_52_TRANSFER_REQUIRED");
    const legal = !(adept && carrying && transfer);
    return decision("faq-v1:52", legal, {}, legal ? []
      : ["PSIONIC_TRANSFER_FORBIDDEN_WHILE_CARRYING_ARTEFACT"]);
  },
  "faq-v1:53": (raw) => {
    const input = shape(raw, ["attackerEngaged", "targetEngaged", "weaponHasPinpoint"],
      "FAQ_F4_53_INPUT_INVALID");
    const attacker = bool(input.attackerEngaged, "FAQ_F4_53_ATTACKER_STATE_REQUIRED");
    const target = bool(input.targetEngaged, "FAQ_F4_53_TARGET_STATE_REQUIRED");
    const pinpoint = bool(input.weaponHasPinpoint, "FAQ_F4_53_PINPOINT_REQUIRED");
    const legal = !attacker && (!target || pinpoint);
    return decision("faq-v1:53", legal, { shootIntoCombatAllowed: !attacker && target && pinpoint,
      shootOutOfCombatAllowed: false }, legal ? [] : [attacker
      ? "PINPOINT_DOES_NOT_ALLOW_SHOOTING_OUT_OF_COMBAT" : "ENGAGED_TARGET_REQUIRES_PINPOINT"]);
  },
  "faq-v1:54": (raw) => {
    const input = shape(raw, ["actionType", "endsWithinOneOfCreep"], "FAQ_F4_54_INPUT_INVALID");
    const actionType = enumeration(input.actionType,
      ["move", "deploy", "run", "charge", "disengage", "place"],
      "FAQ_F4_54_ACTION_TYPE_INVALID");
    const near = bool(input.endsWithinOneOfCreep, "FAQ_F4_54_DISTANCE_STATE_REQUIRED");
    const removalEvent = ["move", "deploy", "run", "charge", "disengage"].includes(actionType);
    return decision("faq-v1:54", true, { creepRemoved: removalEvent && near,
      placePreservesCreep: actionType === "place" });
  },
  "faq-v1:55": (raw) => {
    const input = shape(raw, ["weaponHasLockedIn", "targetStationary"],
      "FAQ_F4_55_INPUT_INVALID");
    const locked = bool(input.weaponHasLockedIn, "FAQ_F4_55_LOCKED_IN_REQUIRED");
    const stationary = bool(input.targetStationary, "FAQ_F4_55_STATIONARY_REQUIRED");
    return decision("faq-v1:55", true, { lockedInRateBonusApplies: locked && stationary });
  },
  "faq-v1:56": (raw) => {
    const input = shape(raw, ["weaponHasIndirectFire", "visibleModelCount", "totalModelCount"],
      "FAQ_F4_56_INPUT_INVALID");
    const indirect = bool(input.weaponHasIndirectFire, "FAQ_F4_56_INDIRECT_REQUIRED");
    const visible = number(input.visibleModelCount, "FAQ_F4_56_VISIBLE_COUNT_INVALID");
    const total = number(input.totalModelCount, "FAQ_F4_56_TOTAL_COUNT_INVALID", 1);
    if (!Number.isInteger(visible) || !Number.isInteger(total) || visible > total) {
      fail("FAQ_F4_56_MODEL_COUNT_INVALID");
    }
    const unitInLineOfSight = visible > 0;
    return decision("faq-v1:56", indirect, { evadeAllowed: indirect && !unitInLineOfSight,
      unseenModelsMayBeCasualties: indirect && visible < total,
      unitInLineOfSight,
      preFaqFullyUnseenEvadeRetained: indirect && visible === 0 },
    indirect ? [] : ["INDIRECT_FIRE_REQUIRED"]);
  },
  "faq-v1:57": (raw) => {
    const input = shape(raw, ["abilityIsDetection", "selectionKind", "locationLegal"],
      "FAQ_F4_57_INPUT_INVALID");
    const detection = bool(input.abilityIsDetection, "FAQ_F4_57_DETECTION_REQUIRED");
    const kind = enumeration(input.selectionKind, ["location", "unit"],
      "FAQ_F4_57_SELECTION_KIND_INVALID");
    const legalLocation = bool(input.locationLegal, "FAQ_F4_57_LOCATION_STATE_REQUIRED");
    const legal = detection && kind === "location" && legalLocation;
    return decision("faq-v1:57", legal, { factionIndicatorPlaced: legal,
      hiddenTargetRangeCheckRequired: false }, legal ? [] : [kind !== "location"
      ? "DETECTION_REQUIRES_LOCATION_SELECTION" : "DETECTION_LOCATION_ILLEGAL"]);
  },
  "faq-v1:58": (raw) => {
    const input = shape(raw, ["withinAtStart", "withinAtEnd"], "FAQ_F4_58_INPUT_INVALID");
    const start = bool(input.withinAtStart, "FAQ_F4_58_START_STATE_REQUIRED");
    const end = bool(input.withinAtEnd, "FAQ_F4_58_END_STATE_REQUIRED");
    return decision("faq-v1:58", true, { appliesAtStart: start, appliesAtEnd: end,
      checkpoints: ["action_or_ability_start", "action_or_ability_end"] });
  },
  "faq-v1:59": (raw) => {
    const input = shape(raw, ["timing", "repeatable", "reactionsResolvedThisActivation",
      "usesForTrigger"], "FAQ_F4_59_INPUT_INVALID");
    const timing = enumeration(input.timing, ["inside_activation", "outside_activation"],
      "FAQ_F4_59_TIMING_INVALID");
    bool(input.repeatable, "FAQ_F4_59_REPEATABLE_REQUIRED");
    const activationUses = number(input.reactionsResolvedThisActivation,
      "FAQ_F4_59_ACTIVATION_USE_INVALID");
    const triggerUses = number(input.usesForTrigger, "FAQ_F4_59_TRIGGER_USE_INVALID");
    const legal = timing === "inside_activation" ? activationUses === 0 : triggerUses === 0;
    return decision("faq-v1:59", legal, { repeatableDoesNotBypassReactionCap: true },
      legal ? [] : [timing === "inside_activation" ? "REACTION_LIMIT_REACHED"
        : "REACTION_ALREADY_USED_FOR_TRIGGER"]);
  },
  "faq-v1:64": (raw) => {
    const input = shape(raw, ["specialistCarrierRemoved", "specialistWeaponPresent"],
      "FAQ_F4_64_INPUT_INVALID");
    const removed = bool(input.specialistCarrierRemoved, "FAQ_F4_64_CARRIER_STATE_REQUIRED");
    const weapon = bool(input.specialistWeaponPresent, "FAQ_F4_64_WEAPON_STATE_REQUIRED");
    return decision("faq-v1:64", true, { specialistWeaponPresentAfterResolution:
      weapon && !removed, transferAllowed: false });
  },
});

export const OFFICIAL_FAQ_F4_BEHAVIOR_KEYS_V1 = Object.freeze(
  Object.fromEntries(ENTRY_IDS.map((entryId) => [
    entryId.replace("faq-v1:", "faq_f4_"), entryId,
  ])),
);

export function evaluateOfficialFaqF4RuleV1(entryId, input = {}) {
  if (!ENTRY_IDS.includes(entryId) || !handlers[entryId]) {
    fail("FAQ_F4_ENTRY_NOT_EXECUTABLE", String(entryId));
  }
  return handlers[entryId](input);
}
