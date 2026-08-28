import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialCriticalHitResolutionKernelV1 } from
  "./official-critical-hit-resolution-kernel-v1.mjs";
import { createOfficialDodgeResolutionKernelV1 } from
  "./official-dodge-resolution-kernel-v1.mjs";

export const OFFICIAL_CRITICAL_HIT_RESOLUTION_KERNEL_V2_ID =
  "authority.critical-hit-resolution-kernel-v2";
export const OFFICIAL_CRITICAL_HIT_RESOLUTION_KERNEL_V2_VERSION = "2.0.0";

const PLAN_SCHEMA = "starcraft_tmg_official_critical_hit_resolution_plan_v2";
const RECEIPT_SCHEMA = "starcraft_tmg_official_critical_hit_resolution_receipt_v2";
const CRITICAL_HIT_EFFECT_ATOM_ID = "attack-effect:critical-hit-v1";
const HISTORICAL = createOfficialCriticalHitResolutionKernelV1();
const DODGE = createOfficialDodgeResolutionKernelV1();

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function noDodge() {
  return {
    present: false,
    reduction: 0,
    source: "target_official_profile_and_effect_state",
  };
}

function validateTargetDodge(value) {
  const validationPlan = DODGE.plan({
    armourPoolDice: 0,
    targetDodge: value,
    transferRequests: [{ effectAtomId: CRITICAL_HIT_EFFECT_ATOM_ID, requestedDice: 0 }],
  });
  return structuredClone(validationPlan.targetDodge);
}

function planCriticalHit(input = {}) {
  const historicalPlan = HISTORICAL.plan({
    profile: input.profile,
    attackPoolDice: input.attackPoolDice,
    targetDodge: noDodge(),
  });
  const targetDodge = validateTargetDodge(input.targetDodge);
  const body = {
    schema: PLAN_SCHEMA,
    kernelId: OFFICIAL_CRITICAL_HIT_RESOLUTION_KERNEL_V2_ID,
    kernelVersion: OFFICIAL_CRITICAL_HIT_RESOLUTION_KERNEL_V2_VERSION,
    historicalKernelHash: HISTORICAL.descriptor.kernelHash,
    historicalPlan,
    profileKey: historicalPlan.profileKey,
    profileHash: historicalPlan.profileHash,
    effectAtomId: CRITICAL_HIT_EFFECT_ATOM_ID,
    attackPoolDice: historicalPlan.attackPoolDice,
    maximumBypassArmourDice: historicalPlan.maximumBypassArmourDice,
    targetDodge,
    timing: "resolve_surge",
    dodgeKernelHash: DODGE.descriptor.kernelHash,
    additionalChanceDice: 0,
    generatedAdditionalHits: 0,
    trainingTruth: false,
  };
  return deepFreeze({ ...body, planHash: hashStarcraftTmgContract(body) });
}

function verifyPlan(plan) {
  if (!object(plan)
    || plan.schema !== PLAN_SCHEMA
    || plan.kernelId !== OFFICIAL_CRITICAL_HIT_RESOLUTION_KERNEL_V2_ID
    || plan.kernelVersion !== OFFICIAL_CRITICAL_HIT_RESOLUTION_KERNEL_V2_VERSION
    || plan.historicalKernelHash !== HISTORICAL.descriptor.kernelHash
    || plan.dodgeKernelHash !== DODGE.descriptor.kernelHash
    || plan.effectAtomId !== CRITICAL_HIT_EFFECT_ATOM_ID
    || plan.timing !== "resolve_surge"
    || plan.additionalChanceDice !== 0
    || plan.generatedAdditionalHits !== 0
    || plan.trainingTruth !== false
    || plan.planHash !== hashStarcraftTmgContract(without(plan, ["planHash"]))) {
    fail("CRITICAL_HIT_V2_PLAN_INVALID");
  }
  const historicalReceipt = HISTORICAL.resolve(plan.historicalPlan, {
    attackPoolHits: 0,
  });
  validateTargetDodge(plan.targetDodge);
  if (historicalReceipt.profileHash !== plan.profileHash
    || plan.historicalPlan.profileKey !== plan.profileKey
    || plan.historicalPlan.attackPoolDice !== plan.attackPoolDice
    || plan.historicalPlan.maximumBypassArmourDice !== plan.maximumBypassArmourDice) {
    fail("CRITICAL_HIT_V2_PLAN_MISMATCH");
  }
  return true;
}

function resolveCriticalHit(plan, input = {}) {
  verifyPlan(plan);
  const attackPoolHits = Number(input.attackPoolHits);
  if (!Number.isSafeInteger(attackPoolHits)
    || attackPoolHits < 0
    || attackPoolHits > plan.attackPoolDice) {
    fail("CRITICAL_HIT_V2_ATTACK_POOL_HITS_INVALID");
  }
  const requestedCriticalHitTransfer = Math.min(
    attackPoolHits,
    plan.maximumBypassArmourDice,
  );
  const dodgePlan = DODGE.plan({
    armourPoolDice: attackPoolHits,
    targetDodge: plan.targetDodge,
    transferRequests: [{
      effectAtomId: CRITICAL_HIT_EFFECT_ATOM_ID,
      requestedDice: requestedCriticalHitTransfer,
    }],
  });
  const dodgeReceipt = DODGE.resolve(dodgePlan);
  const body = {
    schema: RECEIPT_SCHEMA,
    kernelId: OFFICIAL_CRITICAL_HIT_RESOLUTION_KERNEL_V2_ID,
    kernelVersion: OFFICIAL_CRITICAL_HIT_RESOLUTION_KERNEL_V2_VERSION,
    planHash: plan.planHash,
    profileHash: plan.profileHash,
    effectAtomId: CRITICAL_HIT_EFFECT_ATOM_ID,
    timing: "resolve_surge",
    attackPoolHits,
    maximumBypassArmourDice: plan.maximumBypassArmourDice,
    requestedCriticalHitTransfer,
    transferDiceBeforeDodge: dodgeReceipt.transferDiceBeforeDodge,
    dodgeReductionRequested: dodgeReceipt.dodgeReductionRequested,
    dodgeReductionApplied: dodgeReceipt.dodgeReductionApplied,
    bypassedArmourDice: dodgeReceipt.transferredDamagePoolDice,
    armourPoolDice: dodgeReceipt.remainingArmourPoolDice,
    damagePoolBypassDice: dodgeReceipt.transferredDamagePoolDice,
    dodgePlanHash: dodgePlan.planHash,
    dodgeResolutionHash: dodgeReceipt.resolutionHash,
    generatedAdditionalHits: 0,
    trainingTruth: false,
  };
  return deepFreeze({ ...body, resolutionHash: hashStarcraftTmgContract(body) });
}

export function createOfficialCriticalHitResolutionKernelV2() {
  const descriptorBody = {
    schema: "starcraft_tmg_official_critical_hit_resolution_kernel_descriptor_v2",
    kernelId: OFFICIAL_CRITICAL_HIT_RESOLUTION_KERNEL_V2_ID,
    kernelVersion: OFFICIAL_CRITICAL_HIT_RESOLUTION_KERNEL_V2_VERSION,
    historicalKernelHash: HISTORICAL.descriptor.kernelHash,
    dodgeKernelHash: DODGE.descriptor.kernelHash,
    supportedEffectAtomIds: [CRITICAL_HIT_EFFECT_ATOM_ID],
    stages: [
      "attack_pool",
      "resolve_surge_and_critical_hit",
      "dodge_shared_transfer_reduction",
      "armour_pool",
      "damage_pool",
    ],
    movesDiceInsteadOfGeneratingHits: true,
    dodgeInteraction: "official_dodge_kernel_v1",
    generatedAdditionalHits: 0,
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
    verifyPlan,
  });
}
