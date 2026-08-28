import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialAttackResolutionKernelV5 } from
  "./official-attack-resolution-kernel-v5.mjs";
import {
  createOfficialIndirectFireLockedInEffectKernelV1,
  OFFICIAL_INDIRECT_FIRE_EFFECT_ATOM_ID,
  OFFICIAL_LOCKED_IN_EFFECT_ATOM_ID,
  OFFICIAL_SCATTER_MISSILES_PROFILE_KEY,
} from "./official-indirect-fire-locked-in-effect-kernel-v1.mjs";

export const OFFICIAL_INDIRECT_FIRE_LOCKED_IN_ATTACK_KERNEL_ID =
  "authority.indirect-fire-locked-in-attack-kernel-v1";
export const OFFICIAL_INDIRECT_FIRE_LOCKED_IN_ATTACK_KERNEL_VERSION = "1.0.0";
export const OFFICIAL_INDIRECT_FIRE_EVADE_REASON =
  "indirect_fire_target_not_within_line_of_sight";

const CONTEXTUAL_EFFECT_IDS = new Set([
  "attack-effect:pinpoint-v1",
  "attack-effect:sidearm-v1",
  OFFICIAL_INDIRECT_FIRE_EFFECT_ATOM_ID,
  OFFICIAL_LOCKED_IN_EFFECT_ATOM_ID,
]);
const NUMERIC_KERNEL = createOfficialAttackResolutionKernelV5();
const EFFECT_KERNEL = createOfficialIndirectFireLockedInEffectKernelV1();

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function numericProfile(profile, effectiveRateOfAttack) {
  const body = clone(without(profile, ["profileHash"]));
  body.profileKey = `${profile.profileKey}::indirect-locked-numeric`;
  body.rateOfAttack = effectiveRateOfAttack;
  body.effects = body.effects.filter((entry) => !CONTEXTUAL_EFFECT_IDS.has(
    entry.effectAtomId,
  ));
  return freezeDeep({ ...body, profileHash: hashStarcraftTmgContract(body) });
}

function verifyLosReceipt(receipt) {
  if (!object(receipt)
    || receipt.schema !== "starcraft_tmg_official_bounded_full_cover_los_receipt_v1"
    || receipt.lineOfSightHash
      !== hashStarcraftTmgContract(without(receipt, ["lineOfSightHash"]))
    || !["visible", "blocked_by_full_cover"].includes(receipt.lineOfSightStatus)
    || receipt.visible !== (receipt.lineOfSightStatus === "visible")
    || receipt.trainingTruth !== false) {
    fail("INDIRECT_LOCKED_LINE_OF_SIGHT_RECEIPT_INVALID");
  }
  return receipt;
}

function normalizedTarget(target) {
  const armourThreshold = Number(target?.armourThreshold);
  const evadeThreshold = target?.evadeThreshold === null
    ? null
    : Number(target?.evadeThreshold);
  const combatTags = [...new Set((target?.combatTags || []).map((tag) => (
    String(tag || "").trim().toLowerCase()
  )).filter(Boolean))].sort((left, right) => left.localeCompare(right));
  if (!Number.isSafeInteger(armourThreshold)
    || armourThreshold < 2
    || armourThreshold > 6
    || (evadeThreshold !== null && (!Number.isSafeInteger(evadeThreshold)
      || evadeThreshold < 2
      || evadeThreshold > 6))
    || combatTags.length === 0) {
    fail("INDIRECT_LOCKED_TARGET_PROFILE_INVALID");
  }
  return { armourThreshold, evadeThreshold, combatTags };
}

function planAttack(input = {}) {
  const profile = EFFECT_KERNEL.verifyProfile(input.profile);
  const target = normalizedTarget(input.target);
  const lineOfSight = verifyLosReceipt(input.lineOfSight);
  const targetStationary = input.targetStationary === true;
  const scatter = profile.profileKey === OFFICIAL_SCATTER_MISSILES_PROFILE_KEY;
  if (!lineOfSight.visible && !scatter) {
    fail("INDIRECT_LOCKED_VISIBLE_TARGET_REQUIRED", profile.profileKey);
  }
  const distanceInches = Number(input.distanceInches);
  if (!Number.isFinite(distanceInches) || distanceInches < 0) {
    fail("INDIRECT_LOCKED_DISTANCE_INVALID");
  }
  const maximumRangeInches = scatter ? 24 : profile.range.normalRangeInches;
  if (distanceInches > maximumRangeInches) {
    fail("INDIRECT_LOCKED_TARGET_OUT_OF_RANGE");
  }
  const scatterAuthorization = scatter
    ? EFFECT_KERNEL.authorizeScatterAttack({
        profile,
        targetStationary,
        targetWithinLineOfSight: lineOfSight.visible,
        targetWithinMaximumRange: true,
      })
    : null;
  const effectiveRateOfAttack = scatterAuthorization?.effectiveRateOfAttack
    || profile.rateOfAttack;
  const basePlan = NUMERIC_KERNEL.plan({
    profile: numericProfile(profile, effectiveRateOfAttack),
    target,
    distanceInches,
    evadeEligibility: { eligible: false, reason: "none" },
  });
  const offLineOfSightEvadeEligible = !lineOfSight.visible && scatter;
  if (offLineOfSightEvadeEligible && target.evadeThreshold === null) {
    fail("INDIRECT_LOCKED_EVADE_VALUE_REQUIRED");
  }
  const chance = clone(basePlan.chance);
  chance.layout.indirectFireEvade = offLineOfSightEvadeEligible
    ? effectiveRateOfAttack
    : 0;
  chance.count += chance.layout.indirectFireEvade;
  chance.revealOrder = [...chance.revealOrder, "indirect_fire_evade"];
  const body = {
    schema: "starcraft_tmg_official_indirect_fire_locked_in_attack_plan_v1",
    kernelId: OFFICIAL_INDIRECT_FIRE_LOCKED_IN_ATTACK_KERNEL_ID,
    kernelVersion: OFFICIAL_INDIRECT_FIRE_LOCKED_IN_ATTACK_KERNEL_VERSION,
    profileKey: profile.profileKey,
    profileHash: profile.profileHash,
    profile: clone(profile),
    target,
    targetStationary,
    lineOfSight: clone(lineOfSight),
    distanceInches,
    rangeBand: basePlan.rangeBand,
    printedRateOfAttack: profile.rateOfAttack,
    lockedInAdditionalRateOfAttack:
      scatterAuthorization?.lockedInAdditionalRateOfAttack || 0,
    effectiveRateOfAttack,
    indirectFireUsed: offLineOfSightEvadeEligible,
    evadeEligibilityReason: offLineOfSightEvadeEligible
      ? OFFICIAL_INDIRECT_FIRE_EVADE_REASON
      : "none",
    scatterAuthorizationHash: scatterAuthorization?.authorizationHash || null,
    basePlan,
    chance,
    rulesTruth: "official_indirect_fire_locked_in_numeric_exact_subset",
    trainingTruth: false,
  };
  return freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
}

function revealOutcomes(reveals, count) {
  if (!Array.isArray(reveals) || reveals.length !== count) {
    fail("INDIRECT_LOCKED_CHANCE_REVEALS_REQUIRED");
  }
  return reveals.map((reveal) => {
    const faces = object(reveal) ? Number(reveal.faces) : 6;
    const outcome = object(reveal) ? Number(reveal.outcome) : Number(reveal);
    if (faces !== 6 || !Number.isSafeInteger(outcome) || outcome < 1 || outcome > 6) {
      fail("INDIRECT_LOCKED_CHANCE_REVEAL_INVALID");
    }
    return outcome;
  });
}

function succeeds(roll, threshold) {
  if (roll === 1) return false;
  if (roll === 6) return true;
  return roll >= threshold;
}

function verifyPlan(plan) {
  if (!object(plan)
    || plan.schema !== "starcraft_tmg_official_indirect_fire_locked_in_attack_plan_v1"
    || plan.kernelId !== OFFICIAL_INDIRECT_FIRE_LOCKED_IN_ATTACK_KERNEL_ID
    || plan.kernelVersion !== OFFICIAL_INDIRECT_FIRE_LOCKED_IN_ATTACK_KERNEL_VERSION
    || plan.planHash !== hashStarcraftTmgContract(without(plan, ["planHash"]))) {
    fail("INDIRECT_LOCKED_PLAN_INVALID");
  }
  EFFECT_KERNEL.verifyProfile(plan.profile);
  verifyLosReceipt(plan.lineOfSight);
  const expected = planAttack({
    profile: plan.profile,
    target: plan.target,
    targetStationary: plan.targetStationary,
    lineOfSight: plan.lineOfSight,
    distanceInches: plan.distanceInches,
  });
  if (!isDeepStrictEqual(plan, expected)) fail("INDIRECT_LOCKED_PLAN_MISMATCH");
  return plan;
}

function resolveAttack(planInput, revealsInput) {
  const plan = verifyPlan(planInput);
  const reveals = revealOutcomes(revealsInput, plan.chance.count);
  const baseCount = plan.basePlan.chance.count;
  const baseResolution = NUMERIC_KERNEL.resolve(
    plan.basePlan,
    reveals.slice(0, baseCount),
  );
  const stages = clone(baseResolution.stages);
  const allocatedEvadeRolls = reveals.slice(baseCount);
  const damagePoolBeforeEvade = stages.evade.damagePoolBeforeEvade;
  const evadeRolls = allocatedEvadeRolls.slice(0, damagePoolBeforeEvade);
  const evadeSaves = evadeRolls.filter((roll) => succeeds(
    roll,
    plan.target.evadeThreshold,
  )).length;
  const confirmedDamageDice = damagePoolBeforeEvade - evadeSaves;
  if (plan.indirectFireUsed) {
    stages.evade = {
      eligible: true,
      eligibilityReason: OFFICIAL_INDIRECT_FIRE_EVADE_REASON,
      dice: damagePoolBeforeEvade,
      rolls: evadeRolls,
      unusedPreallocatedRolls: allocatedEvadeRolls.slice(damagePoolBeforeEvade),
      baseThreshold: plan.target.evadeThreshold,
      modifier: 0,
      targetNumberDelta: 0,
      unboundedThreshold: plan.target.evadeThreshold,
      effectiveThreshold: plan.target.evadeThreshold,
      modifierAppliedBeforeRoll: true,
      modifiesDieResult: false,
      naturalFailures: evadeRolls.filter((roll) => roll === 1),
      naturalSuccesses: evadeRolls.filter((roll) => roll === 6),
      damagePoolBeforeEvade,
      saves: evadeSaves,
      confirmedDamageDice,
    };
    stages.damage.damagePoolDice = confirmedDamageDice;
    stages.damage.totalDamage = confirmedDamageDice * stages.damage.damagePerDie;
  }
  stages.declaration.profileKey = plan.profileKey;
  stages.declaration.profileHash = plan.profileHash;
  stages.effects.appliedEffectAtomIds = plan.profile.effects.map((entry) => (
    entry.effectAtomId
  ));
  stages.effects.printedRateOfAttack = plan.printedRateOfAttack;
  stages.effects.lockedInAdditionalRateOfAttack =
    plan.lockedInAdditionalRateOfAttack;
  stages.effects.effectiveRateOfAttack = plan.effectiveRateOfAttack;
  stages.effects.indirectFireUsed = plan.indirectFireUsed;
  stages.effects.lineOfSightStatus = plan.lineOfSight.lineOfSightStatus;
  const body = {
    schema: "starcraft_tmg_official_indirect_fire_locked_in_attack_receipt_v1",
    kernelId: OFFICIAL_INDIRECT_FIRE_LOCKED_IN_ATTACK_KERNEL_ID,
    kernelVersion: OFFICIAL_INDIRECT_FIRE_LOCKED_IN_ATTACK_KERNEL_VERSION,
    planHash: plan.planHash,
    baseResolutionHash: baseResolution.resolutionHash,
    reveals: reveals.map((outcome) => ({ faces: 6, outcome })),
    stages,
    rulesTruth: "official_indirect_fire_locked_in_evade_after_armour_exact_subset",
    trainingTruth: false,
  };
  return freezeDeep({ ...body, resolutionHash: hashStarcraftTmgContract(body) });
}

export function createOfficialIndirectFireLockedInAttackKernelV1() {
  const descriptorBody = {
    schema: "starcraft_tmg_official_indirect_fire_locked_in_attack_kernel_descriptor_v1",
    kernelId: OFFICIAL_INDIRECT_FIRE_LOCKED_IN_ATTACK_KERNEL_ID,
    kernelVersion: OFFICIAL_INDIRECT_FIRE_LOCKED_IN_ATTACK_KERNEL_VERSION,
    numericBaseKernel: clone(NUMERIC_KERNEL.descriptor),
    effectKernel: clone(EFFECT_KERNEL.descriptor),
    stages: ["declaration", "hit", "effects", "armour", "evade", "damage"],
    evadeEligibilityReasons: [OFFICIAL_INDIRECT_FIRE_EVADE_REASON],
    chancePolicy: {
      offLineOfSightEvadeDicePreallocatedAtEffectiveRateOfAttack: true,
      evadeResolvedAfterArmour: true,
    },
    unknownEffectPolicy: "fail_closed",
    trainingTruth: false,
  };
  const descriptor = freezeDeep({
    ...descriptorBody,
    kernelHash: hashStarcraftTmgContract(descriptorBody),
  });
  return freezeDeep({ descriptor, plan: planAttack, resolve: resolveAttack });
}
