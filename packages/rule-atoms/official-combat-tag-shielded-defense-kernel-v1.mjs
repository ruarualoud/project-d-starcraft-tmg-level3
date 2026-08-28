import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const OFFICIAL_COMBAT_TAG_SHIELDED_DEFENSE_KERNEL_ID =
  "authority.combat-tag-shielded-defense-kernel-v1";
export const OFFICIAL_COMBAT_TAG_SHIELDED_DEFENSE_KERNEL_VERSION = "1.0.0";
export const OFFICIAL_COMBAT_TAGS = Object.freeze([
  "armoured",
  "biological",
  "light",
  "mechanical",
  "psionic",
  "flying",
  "ground",
]);

const OFFICIAL_COMBAT_TAG_SET = new Set(OFFICIAL_COMBAT_TAGS);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function nonNegativeInteger(value, code) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) fail(code, String(value));
  return parsed;
}

function positiveInteger(value, code) {
  const parsed = nonNegativeInteger(value, code);
  if (parsed === 0) fail(code, String(value));
  return parsed;
}

function normalizeTags(values, { target = false } = {}) {
  if (!Array.isArray(values)) fail("COMBAT_TAG_SET_REQUIRED");
  const normalized = values.map((value) => String(value || "").trim().toLowerCase());
  if (normalized.length === 0
    || normalized.some((value) => !value)
    || new Set(normalized).size !== normalized.length) {
    fail("COMBAT_TAG_SET_INVALID");
  }
  if (target && normalized.includes("all")) {
    if (normalized.length !== 1) fail("COMBAT_TAG_TARGET_ALL_MUST_BE_EXCLUSIVE");
    return ["all"];
  }
  if (normalized.some((value) => !OFFICIAL_COMBAT_TAG_SET.has(value))) {
    fail("COMBAT_TAG_UNKNOWN", normalized.find((value) => !OFFICIAL_COMBAT_TAG_SET.has(value)));
  }
  return normalized.sort((left, right) => left.localeCompare(right));
}

function authorizeTarget(input = {}) {
  const profileTargetTags = normalizeTags(input.profileTargetTags, { target: true });
  const targetCombatTags = normalizeTags(input.targetCombatTags);
  const allTargets = isDeepStrictEqual(profileTargetTags, ["all"]);
  const matchedTargetTags = allTargets
    ? [...targetCombatTags]
    : profileTargetTags.filter((tag) => targetCombatTags.includes(tag));
  const body = {
    schema: "starcraft_tmg_official_combat_tag_target_authorization_v1",
    profileTargetTags,
    targetCombatTags,
    allTargets,
    matchedTargetTags,
    authorized: allTargets || matchedTargetTags.length > 0,
    groundCombatTagDistinctFromGroundLevelElevation: true,
    rulesTruth: "official_core_2_4_2_and_part_11_combat_tag_authority",
    trainingTruth: false,
  };
  return deepFreeze({
    ...body,
    authorizationHash: hashStarcraftTmgContract(body),
  });
}

function shieldState(input = {}) {
  const printedHitPoints = positiveInteger(
    input.printedHitPoints,
    "SHIELDED_PRINTED_HIT_POINTS_INVALID",
  );
  const shieldValue = nonNegativeInteger(input.shieldValue, "SHIELDED_VALUE_INVALID");
  const damageMarker = nonNegativeInteger(input.damageMarker, "SHIELDED_DAMAGE_MARKER_INVALID");
  const firstModelPresent = input.firstModelPresent === true;
  if (typeof input.firstModelPresent !== "boolean") {
    fail("SHIELDED_FIRST_MODEL_PRESENCE_REQUIRED");
  }
  const statuses = [...new Set((input.statuses || []).map((value) => (
    String(value || "").trim().toLowerCase()
  )).filter(Boolean))].sort((left, right) => left.localeCompare(right));
  if (!Array.isArray(input.statuses)
    || statuses.length !== input.statuses.length
    || statuses.some((value) => value !== "shielded")) {
    fail("SHIELDED_STATUS_SET_UNSUPPORTED");
  }
  const effectiveFirstModelHitPoints = printedHitPoints + shieldValue;
  if ((firstModelPresent && damageMarker >= effectiveFirstModelHitPoints)
    || (!firstModelPresent && damageMarker !== 0)) {
    fail("SHIELDED_DAMAGE_MARKER_LIFECYCLE_INVALID");
  }
  const shielded = statuses.includes("shielded");
  const expectedShielded = firstModelPresent
    && shieldValue > 0
    && damageMarker <= shieldValue;
  if (shielded !== expectedShielded) fail("SHIELDED_STATUS_MISMATCH");
  const body = {
    schema: "starcraft_tmg_official_shielded_defense_state_v1",
    printedHitPoints,
    shieldValue,
    effectiveFirstModelHitPoints,
    damageMarker,
    remainingHitPoints: firstModelPresent
      ? effectiveFirstModelHitPoints - damageMarker
      : 0,
    firstModelPresent,
    shielded,
    shieldLossDamageThreshold: shieldValue + 1,
    shieldLossUsesStrictExceedsComparison: true,
    rulesTruth: "official_core_5_1_and_part_11_shielded_lifecycle",
    trainingTruth: false,
  };
  return deepFreeze({ ...body, shieldStateHash: hashStarcraftTmgContract(body) });
}

function applyDamage(input = {}) {
  if (!object(input.shieldState)
    || input.shieldState.schema !== "starcraft_tmg_official_shielded_defense_state_v1"
    || input.shieldState.shieldStateHash
      !== hashStarcraftTmgContract(without(input.shieldState, ["shieldStateHash"]))) {
    fail("SHIELDED_STATE_INVALID");
  }
  const before = shieldState({
    printedHitPoints: input.shieldState.printedHitPoints,
    shieldValue: input.shieldState.shieldValue,
    damageMarker: input.shieldState.damageMarker,
    firstModelPresent: input.shieldState.firstModelPresent,
    statuses: input.shieldState.shielded ? ["shielded"] : [],
  });
  if (!isDeepStrictEqual(before, input.shieldState)) fail("SHIELDED_STATE_MISMATCH");
  if (!before.firstModelPresent) fail("SHIELDED_DAMAGE_TARGET_REMOVED");
  const incomingDamage = nonNegativeInteger(input.damage, "SHIELDED_DAMAGE_INVALID");
  const appliedDamage = Math.min(incomingDamage, before.remainingHitPoints);
  const discardedOverflowDamage = incomingDamage - appliedDamage;
  const totalDamageMarker = before.damageMarker + appliedDamage;
  const firstModelRemoved = totalDamageMarker >= before.effectiveFirstModelHitPoints;
  const shieldedAfter = before.shielded
    && !firstModelRemoved
    && totalDamageMarker <= before.shieldValue;
  const shieldedLost = before.shielded && !shieldedAfter;
  const remainingHitPoints = firstModelRemoved
    ? 0
    : before.effectiveFirstModelHitPoints - totalDamageMarker;
  const body = {
    schema: "starcraft_tmg_official_shielded_damage_transition_v1",
    beforeShieldStateHash: before.shieldStateHash,
    incomingDamage,
    appliedDamage,
    discardedOverflowDamage,
    priorDamageMarker: before.damageMarker,
    totalDamageMarker,
    printedHitPoints: before.printedHitPoints,
    shieldValue: before.shieldValue,
    effectiveFirstModelHitPoints: before.effectiveFirstModelHitPoints,
    remainingHitPoints,
    shieldedBefore: before.shielded,
    shieldedAfter,
    shieldedLost,
    shieldLossReason: shieldedLost
      ? firstModelRemoved
        ? "first_model_removed"
        : "total_damage_exceeds_shield_value"
      : null,
    firstModelRemoved,
    shieldedDependentEffectsEnded: shieldedLost,
    losingShieldedRemovedRemainingHitPoints: false,
    healRestorationEvaluated: false,
    rulesTruth: "official_core_5_1_and_part_11_shielded_damage_transition",
    trainingTruth: false,
  };
  return deepFreeze({ ...body, transitionHash: hashStarcraftTmgContract(body) });
}

export function createOfficialCombatTagShieldedDefenseKernelV1() {
  const descriptorBody = {
    schema: "starcraft_tmg_official_combat_tag_shielded_defense_kernel_descriptor_v1",
    kernelId: OFFICIAL_COMBAT_TAG_SHIELDED_DEFENSE_KERNEL_ID,
    kernelVersion: OFFICIAL_COMBAT_TAG_SHIELDED_DEFENSE_KERNEL_VERSION,
    officialCombatTags: [...OFFICIAL_COMBAT_TAGS],
    targetingPolicy: "all_or_at_least_one_exact_combat_tag_match",
    shieldedPolicy: {
      firstModelEffectiveHitPoints: "printed_hit_points_plus_shield_value",
      statusLostWhen: ["total_damage_strictly_exceeds_shield", "first_model_removed"],
      losingStatusPreservesRemainingHitPoints: true,
      healRestorationExecutable: false,
      shieldedDependentAbilityExecutionExecutable: false,
    },
    unsupportedScopesFailClosed: true,
    trainingTruth: false,
  };
  const descriptor = deepFreeze({
    ...descriptorBody,
    kernelHash: hashStarcraftTmgContract(descriptorBody),
  });
  return deepFreeze({ descriptor, authorizeTarget, shieldState, applyDamage });
}
