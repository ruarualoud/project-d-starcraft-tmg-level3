import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const OFFICIAL_ATTACK_RESOLUTION_KERNEL_V2_ID =
  "authority.attack-resolution-kernel-v2";
export const OFFICIAL_ATTACK_RESOLUTION_KERNEL_V2_VERSION = "2.0.0";

const SUPPORTED_EFFECT_ATOM_IDS = Object.freeze([
  "attack-effect:long-range-v1",
  "attack-effect:pierce-v1",
  "attack-effect:surge-armour-bypass-v1",
]);

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

function effectById(profile, effectAtomId) {
  const effects = profile.effects.filter((entry) => entry.effectAtomId === effectAtomId);
  if (effects.length > 1) fail("ATTACK_EFFECT_DUPLICATE", effectAtomId);
  return effects[0] || null;
}

function verifyPierce(pierce) {
  if (!pierce) return;
  const targetTag = String(pierce.parameters?.targetTag || "");
  const damage = Number(pierce.parameters?.damage);
  if (!targetTag
    || targetTag !== targetTag.trim().toLowerCase()
    || !Number.isSafeInteger(damage)
    || damage <= 0) {
    fail("ATTACK_PIERCE_PARAMETERS_INVALID");
  }
}

function verifyProfile(profile) {
  if (!object(profile)
    || profile.schema !== "starcraft_tmg_official_attack_profile_v1"
    || profile.profileHash !== hashStarcraftTmgContract(without(profile, ["profileHash"]))
    || !Array.isArray(profile.effects)
    || !Array.isArray(profile.targetTags)
    || profile.canAffectRules !== false
    || profile.trainingTruth !== false) {
    fail("ATTACK_PROFILE_INVALID");
  }
  if (profile.phase !== "assault" || profile.range?.kind !== "inches") {
    fail("ATTACK_PROFILE_SCOPE_UNSUPPORTED", profile.profileKey);
  }
  const unavailable = profile.effects.find((entry) => (
    !SUPPORTED_EFFECT_ATOM_IDS.includes(entry.effectAtomId)
  ));
  if (unavailable) fail("ATTACK_EFFECT_HANDLER_UNAVAILABLE", unavailable.effectAtomId);
  verifyPierce(effectById(profile, "attack-effect:pierce-v1"));
}

function normalizedTarget(target) {
  const armourThreshold = Number(target?.armourThreshold);
  const combatTags = [...new Set((target?.combatTags || []).map((tag) => (
    String(tag || "").trim().toLowerCase()
  )).filter(Boolean))].sort((left, right) => left.localeCompare(right));
  if (!Number.isSafeInteger(armourThreshold)
    || armourThreshold < 2
    || armourThreshold > 6
    || combatTags.length === 0) {
    fail("ATTACK_TARGET_PROFILE_INVALID");
  }
  return { armourThreshold, combatTags };
}

function diceValue(expression, outcome) {
  if (expression === "D3") return Math.ceil(outcome / 2);
  if (expression === "D3+1") return Math.ceil(outcome / 2) + 1;
  if (expression === "D6") return outcome;
  fail("ATTACK_SURGE_DICE_EXPRESSION_UNSUPPORTED", expression);
}

function revealOutcomes(reveals, count) {
  if (!Array.isArray(reveals) || reveals.length !== count) {
    fail("ATTACK_CHANCE_REVEALS_REQUIRED");
  }
  return reveals.map((reveal) => {
    const faces = object(reveal) ? Number(reveal.faces) : 6;
    const outcome = object(reveal) ? Number(reveal.outcome) : Number(reveal);
    if (faces !== 6 || !Number.isSafeInteger(outcome) || outcome < 1 || outcome > 6) {
      fail("ATTACK_CHANCE_REVEAL_INVALID");
    }
    return outcome;
  });
}

function planAttack(input) {
  const profile = input?.profile;
  verifyProfile(profile);
  const target = normalizedTarget(input?.target);
  if (input.evadeEligible !== false) fail("ATTACK_EVADE_SCOPE_UNSUPPORTED");
  if (!profile.targetTags.includes("all")
    && !profile.targetTags.some((tag) => target.combatTags.includes(tag))) {
    fail("ATTACK_TARGET_TAG_MISMATCH");
  }
  const distanceInches = Number(input.distanceInches);
  if (!Number.isFinite(distanceInches) || distanceInches < 0) {
    fail("ATTACK_DISTANCE_INVALID");
  }
  const longRange = effectById(profile, "attack-effect:long-range-v1");
  const maximumRangeInches = longRange
    ? Number(longRange.parameters?.maximumRangeInches)
    : Number(profile.range.normalRangeInches);
  if (!Number.isSafeInteger(maximumRangeInches)
    || maximumRangeInches < Number(profile.range.normalRangeInches)) {
    fail("ATTACK_LONG_RANGE_PARAMETERS_INVALID");
  }
  if (distanceInches > maximumRangeInches) fail("ATTACK_TARGET_OUT_OF_RANGE");
  const rangeBand = distanceInches <= Number(profile.range.normalRangeInches)
    ? "normal"
    : "extended";
  const surge = effectById(profile, "attack-effect:surge-armour-bypass-v1");
  const rateOfAttack = Number(profile.rateOfAttack);
  const layout = {
    hit: rateOfAttack,
    surge: surge ? 1 : 0,
    armour: rateOfAttack,
    evade: 0,
  };
  const body = {
    schema: "starcraft_tmg_official_attack_resolution_plan_v2",
    kernelId: OFFICIAL_ATTACK_RESOLUTION_KERNEL_V2_ID,
    kernelVersion: OFFICIAL_ATTACK_RESOLUTION_KERNEL_V2_VERSION,
    profileKey: profile.profileKey,
    profileHash: profile.profileHash,
    profile: structuredClone(profile),
    target,
    distanceInches,
    normalRangeInches: profile.range.normalRangeInches,
    maximumRangeInches,
    rangeBand,
    effectiveHitThreshold: profile.hitThreshold + (rangeBand === "extended" ? 1 : 0),
    effectAtomIds: profile.effects.map((entry) => entry.effectAtomId),
    chance: {
      kind: "fixed_roll_sequence",
      faces: 6,
      count: layout.hit + layout.surge + layout.armour + layout.evade,
      layout,
      revealOrder: ["hit", "surge", "armour", "evade"],
    },
    trainingTruth: false,
  };
  return deepFreeze({ ...body, planHash: hashStarcraftTmgContract(body) });
}

function resolveAttack(plan, reveals) {
  if (!object(plan)
    || plan.schema !== "starcraft_tmg_official_attack_resolution_plan_v2"
    || plan.kernelId !== OFFICIAL_ATTACK_RESOLUTION_KERNEL_V2_ID
    || plan.kernelVersion !== OFFICIAL_ATTACK_RESOLUTION_KERNEL_V2_VERSION
    || plan.planHash !== hashStarcraftTmgContract(without(plan, ["planHash"]))) {
    fail("ATTACK_RESOLUTION_PLAN_INVALID");
  }
  verifyProfile(plan.profile);
  if (plan.profile.profileHash !== plan.profileHash) fail("ATTACK_RESOLUTION_PROFILE_MISMATCH");
  const rolls = revealOutcomes(reveals, plan.chance.count);
  let offset = 0;
  const hitRolls = rolls.slice(offset, offset += plan.chance.layout.hit);
  const surgeRolls = rolls.slice(offset, offset += plan.chance.layout.surge);
  const armourRolls = rolls.slice(offset, offset += plan.chance.layout.armour);
  const evadeRolls = rolls.slice(offset, offset + plan.chance.layout.evade);
  const hits = hitRolls.filter((roll) => roll >= plan.effectiveHitThreshold).length;
  const surge = effectById(plan.profile, "attack-effect:surge-armour-bypass-v1");
  const surgeResults = surgeRolls.map((roll) => (
    diceValue(surge.parameters.diceExpression, roll)
  ));
  const surgeMatched = Boolean(surge) && surge.parameters.targetTags.some((tag) => (
    plan.target.combatTags.includes(tag)
  ));
  const bypassedArmourHits = surgeMatched
    ? Math.min(hits, surgeResults.reduce((total, result) => total + result, 0))
    : 0;
  const armourDice = hits - bypassedArmourHits;
  const resolvedArmourRolls = armourRolls.slice(0, armourDice);
  const saves = resolvedArmourRolls.filter((roll) => (
    roll >= plan.target.armourThreshold
  )).length;
  const damagePoolDice = bypassedArmourHits + armourDice - saves;
  const pierce = effectById(plan.profile, "attack-effect:pierce-v1");
  const pierceMatched = Boolean(pierce)
    && plan.target.combatTags.includes(pierce.parameters.targetTag);
  const damagePerDie = pierceMatched
    ? pierce.parameters.damage
    : plan.profile.damage;
  const stages = {
    declaration: {
      profileKey: plan.profileKey,
      profileHash: plan.profileHash,
      distanceInches: plan.distanceInches,
      rangeBand: plan.rangeBand,
    },
    hit: {
      dice: hitRolls.length,
      rolls: hitRolls,
      threshold: plan.effectiveHitThreshold,
      hits,
    },
    effects: {
      appliedEffectAtomIds: [...plan.effectAtomIds],
      surgeRolls,
      surgeResults,
      surgeMatched,
      bypassedArmourHits,
      pierceMatched,
      pierceTargetTag: pierce?.parameters.targetTag || null,
      pierceDamage: pierce?.parameters.damage || null,
    },
    armour: {
      dice: armourDice,
      rolls: resolvedArmourRolls,
      unusedPreallocatedRolls: armourRolls.slice(armourDice),
      threshold: plan.target.armourThreshold,
      saves,
    },
    evade: {
      dice: 0,
      rolls: evadeRolls,
      reason: "explicit_non_evade_subset",
    },
    damage: {
      damagePoolDice,
      baseDamagePerDie: plan.profile.damage,
      damagePerDie,
      totalDamage: damagePoolDice * damagePerDie,
    },
  };
  const body = {
    schema: "starcraft_tmg_official_attack_resolution_receipt_v2",
    kernelId: OFFICIAL_ATTACK_RESOLUTION_KERNEL_V2_ID,
    kernelVersion: OFFICIAL_ATTACK_RESOLUTION_KERNEL_V2_VERSION,
    planHash: plan.planHash,
    reveals: rolls.map((outcome) => ({ faces: 6, outcome })),
    stages,
    trainingTruth: false,
  };
  return deepFreeze({ ...body, resolutionHash: hashStarcraftTmgContract(body) });
}

export function createOfficialAttackResolutionKernelV2() {
  const descriptorBody = {
    schema: "starcraft_tmg_official_attack_resolution_kernel_descriptor_v2",
    kernelId: OFFICIAL_ATTACK_RESOLUTION_KERNEL_V2_ID,
    kernelVersion: OFFICIAL_ATTACK_RESOLUTION_KERNEL_V2_VERSION,
    stages: ["declaration", "hit", "effects", "armour", "evade", "damage"],
    supportedEffectAtomIds: [...SUPPORTED_EFFECT_ATOM_IDS],
    unknownEffectPolicy: "fail_closed",
    trainingTruth: false,
  };
  const descriptor = deepFreeze({
    ...descriptorBody,
    kernelHash: hashStarcraftTmgContract(descriptorBody),
  });
  return deepFreeze({ descriptor, plan: planAttack, resolve: resolveAttack });
}
