import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialAttackResolutionKernelV4 } from
  "./official-attack-resolution-kernel-v4.mjs";

export const OFFICIAL_ATTACK_RESOLUTION_KERNEL_V5_ID =
  "authority.attack-resolution-kernel-v5";
export const OFFICIAL_ATTACK_RESOLUTION_KERNEL_V5_VERSION = "5.0.0";

const BULKY_EFFECT_ATOM_ID = "attack-effect:bulky-v1";
const BASE_KERNEL = createOfficialAttackResolutionKernelV4();
const SUPPORTED_EFFECT_ATOM_IDS = Object.freeze([
  "attack-effect:anti-evade-v1",
  BULKY_EFFECT_ATOM_ID,
  "attack-effect:burst-fire-v1",
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

function clone(value) {
  return structuredClone(value);
}

function effectById(profile, effectAtomId) {
  const effects = profile.effects.filter((entry) => entry.effectAtomId === effectAtomId);
  if (effects.length > 1) fail("ATTACK_EFFECT_DUPLICATE", effectAtomId);
  return effects[0] || null;
}

function verifyProfileAndBulky(profile) {
  if (!object(profile)
    || profile.schema !== "starcraft_tmg_official_attack_profile_v1"
    || profile.profileHash !== hashStarcraftTmgContract(without(profile, ["profileHash"]))
    || !Array.isArray(profile.effects)
    || !Array.isArray(profile.targetTags)
    || profile.canAffectRules !== false
    || profile.trainingTruth !== false) {
    fail("ATTACK_PROFILE_INVALID");
  }
  const bulky = effectById(profile, BULKY_EFFECT_ATOM_ID);
  if (bulky && (
    bulky.sourceKind !== "weapon_keyword"
      || !object(bulky.parameters)
      || Object.keys(bulky.parameters).length !== 0
  )) {
    fail("ATTACK_BULKY_PARAMETERS_INVALID");
  }
  return bulky;
}

function normalizedAttackerEngagement(value) {
  if (!object(value)
    || typeof value.engaged !== "boolean"
    || value.source !== "official_engagement_graph_v2"
    || !/^[a-f0-9]{64}$/u.test(String(value.graphHash || ""))) {
    fail("ATTACK_ENGAGEMENT_EVIDENCE_REQUIRED");
  }
  return {
    engaged: value.engaged,
    source: value.source,
    graphHash: value.graphHash,
  };
}

function profileForBaseKernel(profile) {
  const body = clone(without(profile, ["profileHash"]));
  body.effects = body.effects.filter((entry) => entry.effectAtomId !== BULKY_EFFECT_ATOM_ID);
  return {
    ...body,
    profileHash: hashStarcraftTmgContract(body),
  };
}

function planAttack(input) {
  const profile = input?.profile;
  const bulky = verifyProfileAndBulky(profile);
  const attackerEngagement = bulky
    ? normalizedAttackerEngagement(input?.attackerEngagement)
    : null;
  if (bulky && attackerEngagement.engaged) {
    fail("ATTACK_BULKY_ENGAGED_PROHIBITION");
  }
  const baseProfile = profileForBaseKernel(profile);
  const basePlan = BASE_KERNEL.plan({
    profile: baseProfile,
    target: input?.target,
    distanceInches: input?.distanceInches,
    evadeEligibility: input?.evadeEligibility,
  });
  const body = {
    schema: "starcraft_tmg_official_attack_resolution_plan_v5",
    kernelId: OFFICIAL_ATTACK_RESOLUTION_KERNEL_V5_ID,
    kernelVersion: OFFICIAL_ATTACK_RESOLUTION_KERNEL_V5_VERSION,
    profileKey: profile.profileKey,
    profileHash: profile.profileHash,
    profile: clone(profile),
    basePlan,
    target: clone(basePlan.target),
    distanceInches: basePlan.distanceInches,
    normalRangeInches: basePlan.normalRangeInches,
    maximumRangeInches: basePlan.maximumRangeInches,
    rangeBand: basePlan.rangeBand,
    effectiveHitThreshold: basePlan.effectiveHitThreshold,
    printedRateOfAttack: basePlan.printedRateOfAttack,
    effectiveRateOfAttack: basePlan.effectiveRateOfAttack,
    burstFire: clone(basePlan.burstFire),
    bulky: bulky ? {
      effectAtomId: bulky.effectAtomId,
      attackerEngaged: attackerEngagement.engaged,
      prohibitionCheckedBeforeChance: true,
    } : null,
    attackerEngagement,
    effectAtomIds: profile.effects.map((entry) => entry.effectAtomId),
    evade: clone(basePlan.evade),
    chance: clone(basePlan.chance),
    trainingTruth: false,
  };
  return deepFreeze({ ...body, planHash: hashStarcraftTmgContract(body) });
}

function verifyPlan(plan) {
  if (!object(plan)
    || plan.schema !== "starcraft_tmg_official_attack_resolution_plan_v5"
    || plan.kernelId !== OFFICIAL_ATTACK_RESOLUTION_KERNEL_V5_ID
    || plan.kernelVersion !== OFFICIAL_ATTACK_RESOLUTION_KERNEL_V5_VERSION
    || plan.planHash !== hashStarcraftTmgContract(without(plan, ["planHash"]))) {
    fail("ATTACK_RESOLUTION_PLAN_INVALID");
  }
  const bulky = verifyProfileAndBulky(plan.profile);
  if (plan.profile.profileHash !== plan.profileHash
    || plan.profile.profileKey !== plan.profileKey) {
    fail("ATTACK_RESOLUTION_PROFILE_MISMATCH");
  }
  const attackerEngagement = bulky
    ? normalizedAttackerEngagement(plan.attackerEngagement)
    : null;
  if (bulky && attackerEngagement.engaged) {
    fail("ATTACK_BULKY_ENGAGED_PROHIBITION");
  }
  const baseProfile = profileForBaseKernel(plan.profile);
  if (!object(plan.basePlan)
    || plan.basePlan.profileHash !== baseProfile.profileHash
    || plan.basePlan.profileKey !== baseProfile.profileKey
    || !isDeepStrictEqual(plan.basePlan.profile, baseProfile)
    || !isDeepStrictEqual(plan.target, plan.basePlan.target)
    || plan.distanceInches !== plan.basePlan.distanceInches
    || plan.rangeBand !== plan.basePlan.rangeBand
    || plan.effectiveHitThreshold !== plan.basePlan.effectiveHitThreshold
    || plan.printedRateOfAttack !== plan.basePlan.printedRateOfAttack
    || plan.effectiveRateOfAttack !== plan.basePlan.effectiveRateOfAttack
    || !isDeepStrictEqual(plan.chance, plan.basePlan.chance)
    || !isDeepStrictEqual(
      plan.effectAtomIds,
      plan.profile.effects.map((entry) => entry.effectAtomId),
    )) {
    fail("ATTACK_RESOLUTION_BASE_PLAN_MISMATCH");
  }
  if (bulky && !isDeepStrictEqual(plan.bulky, {
    effectAtomId: BULKY_EFFECT_ATOM_ID,
    attackerEngaged: false,
    prohibitionCheckedBeforeChance: true,
  })) {
    fail("ATTACK_BULKY_PLAN_MISMATCH");
  }
  if (!bulky && (plan.bulky !== null || plan.attackerEngagement !== null)) {
    fail("ATTACK_BULKY_PLAN_MISMATCH");
  }
  return { bulky, attackerEngagement };
}

function resolveAttack(plan, reveals) {
  const { bulky, attackerEngagement } = verifyPlan(plan);
  const baseResolution = BASE_KERNEL.resolve(plan.basePlan, reveals);
  const stages = clone(baseResolution.stages);
  stages.declaration.profileHash = plan.profileHash;
  stages.effects.appliedEffectAtomIds = [...plan.effectAtomIds];
  stages.effects.bulkyEngagedProhibitionChecked = Boolean(bulky);
  stages.effects.attackerEngaged = attackerEngagement?.engaged ?? false;
  stages.effects.engagementGraphHash = attackerEngagement?.graphHash || null;
  const body = {
    schema: "starcraft_tmg_official_attack_resolution_receipt_v5",
    kernelId: OFFICIAL_ATTACK_RESOLUTION_KERNEL_V5_ID,
    kernelVersion: OFFICIAL_ATTACK_RESOLUTION_KERNEL_V5_VERSION,
    planHash: plan.planHash,
    baseResolutionHash: baseResolution.resolutionHash,
    reveals: clone(baseResolution.reveals),
    stages,
    trainingTruth: false,
  };
  return deepFreeze({ ...body, resolutionHash: hashStarcraftTmgContract(body) });
}

export function createOfficialAttackResolutionKernelV5() {
  const descriptorBody = {
    schema: "starcraft_tmg_official_attack_resolution_kernel_descriptor_v5",
    kernelId: OFFICIAL_ATTACK_RESOLUTION_KERNEL_V5_ID,
    kernelVersion: OFFICIAL_ATTACK_RESOLUTION_KERNEL_V5_VERSION,
    baseKernel: {
      kernelId: BASE_KERNEL.descriptor.kernelId,
      kernelVersion: BASE_KERNEL.descriptor.kernelVersion,
      kernelHash: BASE_KERNEL.descriptor.kernelHash,
    },
    stages: [...BASE_KERNEL.descriptor.stages],
    supportedEffectAtomIds: [...SUPPORTED_EFFECT_ATOM_IDS],
    evadeEligibilityReasons: [...BASE_KERNEL.descriptor.evadeEligibilityReasons],
    rateOfAttackPolicy: clone(BASE_KERNEL.descriptor.rateOfAttackPolicy),
    evadeModifierPolicy: clone(BASE_KERNEL.descriptor.evadeModifierPolicy),
    bulkyPolicy: {
      engagementEvidenceSource: "official_engagement_graph_v2",
      prohibitBeforeChanceAllocation: true,
      unengagedProfileRemainsUnmodified: true,
    },
    unknownEffectPolicy: "fail_closed",
    trainingTruth: false,
  };
  const descriptor = deepFreeze({
    ...descriptorBody,
    kernelHash: hashStarcraftTmgContract(descriptorBody),
  });
  return deepFreeze({ descriptor, plan: planAttack, resolve: resolveAttack });
}
