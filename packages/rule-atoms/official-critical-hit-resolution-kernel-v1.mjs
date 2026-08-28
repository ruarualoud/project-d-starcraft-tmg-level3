import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const OFFICIAL_CRITICAL_HIT_RESOLUTION_KERNEL_ID =
  "authority.critical-hit-resolution-kernel-v1";
export const OFFICIAL_CRITICAL_HIT_RESOLUTION_KERNEL_VERSION = "1.0.0";

const CRITICAL_HIT_EFFECT_ATOM_ID = "attack-effect:critical-hit-v1";
const PROFILE_SCHEMA = "starcraft_tmg_official_attack_profile_v2";
const DODGE_EVIDENCE_SOURCE = "target_official_profile_and_effect_state";

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

function verifyProfile(profile) {
  if (!object(profile)
    || profile.schema !== PROFILE_SCHEMA
    || profile.profileHash !== hashStarcraftTmgContract(without(profile, ["profileHash"]))
    || profile.phase !== "combat"
    || !Array.isArray(profile.effects)
    || profile.canAffectRules !== false
    || profile.trainingTruth !== false) {
    fail("CRITICAL_HIT_PROFILE_INVALID");
  }
  const critical = profile.effects.filter((effect) => (
    effect.effectAtomId === CRITICAL_HIT_EFFECT_ATOM_ID
  ));
  if (critical.length !== 1
    || profile.effects.length !== 1
    || critical[0].sourceKind !== "weapon_keyword") {
    fail("CRITICAL_HIT_PROFILE_SCOPE_UNSUPPORTED", profile.profileKey);
  }
  const keys = Object.keys(critical[0].parameters || {});
  const bypassArmourDice = Number(critical[0].parameters?.bypassArmourDice);
  if (keys.length !== 1
    || keys[0] !== "bypassArmourDice"
    || !Number.isSafeInteger(bypassArmourDice)
    || bypassArmourDice <= 0) {
    fail("CRITICAL_HIT_PROFILE_INVALID", profile.profileKey);
  }
  return { critical: critical[0], bypassArmourDice };
}

function verifyNoDodge(value) {
  if (!object(value)
    || typeof value.present !== "boolean"
    || !Number.isSafeInteger(Number(value.reduction))
    || Number(value.reduction) < 0
    || value.source !== DODGE_EVIDENCE_SOURCE) {
    fail("CRITICAL_HIT_DODGE_EVIDENCE_REQUIRED");
  }
  if (value.present === true || Number(value.reduction) !== 0) {
    fail("CRITICAL_HIT_DODGE_INTERACTION_UNSUPPORTED");
  }
  return {
    present: false,
    reduction: 0,
    source: DODGE_EVIDENCE_SOURCE,
  };
}

function planCriticalHit(input = {}) {
  const profile = input.profile;
  const { critical, bypassArmourDice } = verifyProfile(profile);
  const targetDodge = verifyNoDodge(input.targetDodge);
  const attackPoolDice = input.attackPoolDice === undefined
    ? Number(profile.rateOfAttack)
    : Number(input.attackPoolDice);
  if (!Number.isSafeInteger(attackPoolDice) || attackPoolDice <= 0) {
    fail("CRITICAL_HIT_ATTACK_POOL_INVALID");
  }
  const body = {
    schema: "starcraft_tmg_official_critical_hit_resolution_plan_v1",
    kernelId: OFFICIAL_CRITICAL_HIT_RESOLUTION_KERNEL_ID,
    kernelVersion: OFFICIAL_CRITICAL_HIT_RESOLUTION_KERNEL_VERSION,
    profileKey: profile.profileKey,
    profileHash: profile.profileHash,
    profile: structuredClone(profile),
    effectAtomId: critical.effectAtomId,
    attackPoolDice,
    maximumBypassArmourDice: bypassArmourDice,
    targetDodge,
    timing: "resolve_surge",
    additionalChanceDice: 0,
    generatedAdditionalHits: 0,
    trainingTruth: false,
  };
  return deepFreeze({ ...body, planHash: hashStarcraftTmgContract(body) });
}

function verifyPlan(plan) {
  if (!object(plan)
    || plan.schema !== "starcraft_tmg_official_critical_hit_resolution_plan_v1"
    || plan.kernelId !== OFFICIAL_CRITICAL_HIT_RESOLUTION_KERNEL_ID
    || plan.kernelVersion !== OFFICIAL_CRITICAL_HIT_RESOLUTION_KERNEL_VERSION
    || plan.planHash !== hashStarcraftTmgContract(without(plan, ["planHash"]))) {
    fail("CRITICAL_HIT_PLAN_INVALID");
  }
  const { bypassArmourDice } = verifyProfile(plan.profile);
  verifyNoDodge(plan.targetDodge);
  if (plan.profile.profileKey !== plan.profileKey
    || plan.profile.profileHash !== plan.profileHash
    || plan.maximumBypassArmourDice !== bypassArmourDice
    || !Number.isSafeInteger(plan.attackPoolDice)
    || plan.attackPoolDice <= 0
    || plan.additionalChanceDice !== 0
    || plan.generatedAdditionalHits !== 0) {
    fail("CRITICAL_HIT_PLAN_MISMATCH");
  }
}

function resolveCriticalHit(plan, input = {}) {
  verifyPlan(plan);
  const attackPoolHits = Number(input.attackPoolHits);
  if (!Number.isSafeInteger(attackPoolHits)
    || attackPoolHits < 0
    || attackPoolHits > plan.attackPoolDice) {
    fail("CRITICAL_HIT_ATTACK_POOL_HITS_INVALID");
  }
  const bypassedArmourDice = Math.min(
    attackPoolHits,
    plan.maximumBypassArmourDice,
  );
  const armourPoolDice = attackPoolHits - bypassedArmourDice;
  const body = {
    schema: "starcraft_tmg_official_critical_hit_resolution_receipt_v1",
    kernelId: OFFICIAL_CRITICAL_HIT_RESOLUTION_KERNEL_ID,
    kernelVersion: OFFICIAL_CRITICAL_HIT_RESOLUTION_KERNEL_VERSION,
    planHash: plan.planHash,
    profileHash: plan.profileHash,
    effectAtomId: CRITICAL_HIT_EFFECT_ATOM_ID,
    timing: "resolve_surge",
    attackPoolHits,
    maximumBypassArmourDice: plan.maximumBypassArmourDice,
    dodgeReduction: 0,
    bypassedArmourDice,
    armourPoolDice,
    damagePoolBypassDice: bypassedArmourDice,
    generatedAdditionalHits: 0,
    trainingTruth: false,
  };
  return deepFreeze({ ...body, resolutionHash: hashStarcraftTmgContract(body) });
}

export function createOfficialCriticalHitResolutionKernelV1() {
  const descriptorBody = {
    schema: "starcraft_tmg_official_critical_hit_resolution_kernel_descriptor_v1",
    kernelId: OFFICIAL_CRITICAL_HIT_RESOLUTION_KERNEL_ID,
    kernelVersion: OFFICIAL_CRITICAL_HIT_RESOLUTION_KERNEL_VERSION,
    supportedEffectAtomIds: [CRITICAL_HIT_EFFECT_ATOM_ID],
    stages: [
      "attack_pool",
      "resolve_surge_and_critical_hit",
      "armour_pool",
      "damage_pool",
    ],
    policy: {
      movesDiceInsteadOfGeneratingHits: true,
      maximumIsCurrentArmourPool: true,
      createsChanceDice: false,
      dodgeInteraction: "fail_closed_until_separate_dodge_atom_is_executable",
    },
    trainingTruth: false,
  };
  const descriptor = deepFreeze({
    ...descriptorBody,
    kernelHash: hashStarcraftTmgContract(descriptorBody),
  });
  return deepFreeze({
    descriptor,
    plan: planCriticalHit,
    resolve: resolveCriticalHit,
  });
}
