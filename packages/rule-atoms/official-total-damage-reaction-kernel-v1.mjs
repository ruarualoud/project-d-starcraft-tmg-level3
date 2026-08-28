import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const OFFICIAL_TOTAL_DAMAGE_REACTION_KERNEL_ID =
  "authority.total-damage-reaction-kernel-v1";
export const OFFICIAL_TOTAL_DAMAGE_REACTION_KERNEL_VERSION = "1.0.0";
export const OFFICIAL_TOTAL_DAMAGE_REACTION_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-8-7-4-total-damage-reduction:f463f134d482",
]);

const PLAN_SCHEMA = "starcraft_tmg_official_total_damage_reaction_plan_v1";
const RESOLUTION_SCHEMA =
  "starcraft_tmg_official_total_damage_reaction_resolution_v1";
const HASH_PATTERN = /^[a-f0-9]{64}$/u;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function nonNegativeInteger(value, code) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) fail(code);
  return parsed;
}

function positiveInteger(value, code) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) fail(code);
  return parsed;
}

function planBody(input) {
  const priorDamageMarker = nonNegativeInteger(
    input.priorDamageMarker,
    "TOTAL_DAMAGE_PRIOR_MARKER_INVALID",
  );
  const incomingDamage = nonNegativeInteger(
    input.incomingDamage,
    "TOTAL_DAMAGE_INCOMING_INVALID",
  );
  const targetHitPoints = positiveInteger(
    input.targetHitPoints,
    "TOTAL_DAMAGE_TARGET_HP_INVALID",
  );
  if (!String(input.targetPieceId || "")
    || !String(input.targetModelId || "")
    || !HASH_PATTERN.test(String(input.attackResolutionHash || ""))) {
    fail("TOTAL_DAMAGE_BINDING_INVALID");
  }
  if (priorDamageMarker >= targetHitPoints) {
    fail("TOTAL_DAMAGE_PRIOR_MARKER_ALREADY_LETHAL");
  }
  return {
    schema: PLAN_SCHEMA,
    targetPieceId: input.targetPieceId,
    targetModelId: input.targetModelId,
    attackResolutionHash: input.attackResolutionHash,
    priorDamageMarker,
    incomingDamage,
    totalDamageBeforeReduction: priorDamageMarker + incomingDamage,
    targetHitPoints,
    visibleModelCount: 1,
    reductionWindow: "after_total_damage_before_casualty_allocation",
    trainingTruth: false,
  };
}

function verifyPlan(plan) {
  if (!object(plan)
    || plan.schema !== PLAN_SCHEMA
    || plan.trainingTruth !== false
    || plan.visibleModelCount !== 1
    || plan.reductionWindow !== "after_total_damage_before_casualty_allocation"
    || plan.planHash !== hashStarcraftTmgContract(without(plan, ["planHash"]))) {
    fail("TOTAL_DAMAGE_PLAN_INVALID");
  }
  const expected = {
    ...planBody(plan),
    planHash: plan.planHash,
  };
  if (!isDeepStrictEqual(plan, expected)) fail("TOTAL_DAMAGE_PLAN_INVALID");
  return plan;
}

function createPlan(input) {
  const body = planBody(input);
  return freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
}

function resolvePlan(planInput, input = {}) {
  const plan = verifyPlan(planInput);
  const requestedReduction = nonNegativeInteger(
    input.requestedReduction || 0,
    "TOTAL_DAMAGE_REDUCTION_INVALID",
  );
  const reductionSourceHash = input.reductionSourceHash === null
    || input.reductionSourceHash === undefined
    ? null
    : String(input.reductionSourceHash);
  if (reductionSourceHash !== null && !HASH_PATTERN.test(reductionSourceHash)) {
    fail("TOTAL_DAMAGE_REDUCTION_SOURCE_INVALID");
  }
  if (requestedReduction > 0 && reductionSourceHash === null) {
    fail("TOTAL_DAMAGE_REDUCTION_SOURCE_REQUIRED");
  }
  const appliedReduction = Math.min(
    requestedReduction,
    plan.totalDamageBeforeReduction,
  );
  const totalDamageAfterReduction =
    plan.totalDamageBeforeReduction - appliedReduction;
  const targetDestroyed = totalDamageAfterReduction >= plan.targetHitPoints;
  const discardedOverflowDamage = targetDestroyed
    ? totalDamageAfterReduction - plan.targetHitPoints
    : 0;
  const postDamageMarker = targetDestroyed ? 0 : totalDamageAfterReduction;
  const body = {
    schema: RESOLUTION_SCHEMA,
    planHash: plan.planHash,
    attackResolutionHash: plan.attackResolutionHash,
    targetPieceId: plan.targetPieceId,
    targetModelId: plan.targetModelId,
    priorDamageMarker: plan.priorDamageMarker,
    incomingDamage: plan.incomingDamage,
    totalDamageBeforeReduction: plan.totalDamageBeforeReduction,
    requestedReduction,
    appliedReduction,
    reductionSourceHash,
    totalDamageAfterReduction,
    targetHitPoints: plan.targetHitPoints,
    targetDestroyed,
    casualtyModelIds: targetDestroyed ? [plan.targetModelId] : [],
    postDamageMarker,
    discardedOverflowDamage,
    reductionAppliedBeforeCasualtyAllocation: true,
    trainingTruth: false,
  };
  return freezeDeep({
    ...body,
    resolutionHash: hashStarcraftTmgContract(body),
  });
}

const descriptorBody = {
  schema: "starcraft_tmg_official_total_damage_reaction_kernel_descriptor_v1",
  kernelId: OFFICIAL_TOTAL_DAMAGE_REACTION_KERNEL_ID,
  kernelVersion: OFFICIAL_TOTAL_DAMAGE_REACTION_KERNEL_VERSION,
  ruleAtomIds: [...OFFICIAL_TOTAL_DAMAGE_REACTION_NEW_ATOM_IDS],
  supportedScope:
    "one_visible_model_exact_total_damage_reduction_before_casualty_allocation",
  chance: "none",
  rulesTruth: "official_core_total_damage_reaction_window_exact_subset",
  trainingTruth: false,
};

export function createOfficialTotalDamageReactionKernelV1() {
  return freezeDeep({
    descriptor: {
      ...descriptorBody,
      kernelHash: hashStarcraftTmgContract(descriptorBody),
    },
    plan: createPlan,
    resolve: resolvePlan,
    verifyPlan,
  });
}
