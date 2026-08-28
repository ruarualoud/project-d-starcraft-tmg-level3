import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_DENOMINATOR_ID,
  OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_DENOMINATOR_VERSION,
  OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PLAN_SCHEMA,
} from "./official-marine-multi-model-close-combat-denominator-v1.mjs";
import {
  OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_DENOMINATOR_V2_ID,
  OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_DENOMINATOR_V2_VERSION,
  OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PLAN_V2_SCHEMA,
} from "./official-marine-multi-model-close-combat-denominator-v2.mjs";
import {
  createOfficialMarineMultiModelCloseCombatPrecisionKernelV2,
} from "./official-marine-multi-model-close-combat-precision-kernel-v2.mjs";

export const OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_KERNEL_V3_ID =
  "authority.marine-multi-model-close-combat-precision-kernel-v3";
export const OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_KERNEL_V3_VERSION =
  "3.0.0";

const V2 = createOfficialMarineMultiModelCloseCombatPrecisionKernelV2();

function fail(code) {
  throw new Error(code);
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

function compatibilityPlan(plan) {
  if (!object(plan)
    || plan.schema !== OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PLAN_V2_SCHEMA
    || plan.denominatorId !== OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_DENOMINATOR_V2_ID
    || plan.denominatorVersion
      !== OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_DENOMINATOR_V2_VERSION
    || plan.planHash !== hashStarcraftTmgContract(without(plan, ["planHash"]))) {
    fail("MARINE_MULTI_MODEL_PRECISION_V3_PLAN_INVALID");
  }
  const {
    planHash: _planHash,
    targetHitPoints: _targetHitPoints,
    targetPriorDamageMarker: _targetPriorDamageMarker,
    targetInteractionScope: _targetInteractionScope,
    ...shared
  } = plan;
  const body = {
    ...shared,
    schema: OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PLAN_SCHEMA,
    denominatorId: OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_DENOMINATOR_ID,
    denominatorVersion: OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_DENOMINATOR_VERSION,
    casualtyPolicy:
      "target_exactly_one_remaining_model_for_deterministic_slice45_resolution",
    staleDomainPolicy:
      "any_model_ledger_geometry_rank_loadout_status_marker_or_history_change_rederive",
    rulesTruth:
      "official_current_marine_unit_wide_close_combat_multi_model_denominator",
  };
  const adapted = freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
  V2.verifyPlan(adapted);
  return adapted;
}

function createGrant(input = {}) {
  return V2.createGrant({
    plan: compatibilityPlan(input.plan),
    status: input.status,
  });
}

function verifyGrant(input = {}) {
  const expected = createGrant(input);
  if (!isDeepStrictEqual(expected, input.grant)) {
    fail("MARINE_MULTI_MODEL_PRECISION_V3_GRANT_STALE");
  }
  return true;
}

function enumerateSelections(input = {}) {
  verifyGrant(input);
  return V2.enumerateSelections({
    ...input,
    plan: compatibilityPlan(input.plan),
  });
}

function resolve(input = {}) {
  verifyGrant(input);
  return V2.resolve({
    ...input,
    plan: compatibilityPlan(input.plan),
  });
}

const descriptorBody = {
  schema:
    "starcraft_tmg_official_marine_multi_model_close_combat_precision_kernel_descriptor_v3",
  kernelId: OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_KERNEL_V3_ID,
  kernelVersion: OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_KERNEL_V3_VERSION,
  planAuthority: "slice47_full_target_multi_model_close_combat_denominator_v2",
  delegatedFrozenKernelHash: V2.descriptor.kernelHash,
  delegatedFrozenKernelMutationAllowed: false,
  compatibilityProjection:
    "hash_verified_v2_plan_to_frozen_precision_v2_shared_attack_fields",
  excludedProjectionFields: [
    "targetHitPoints",
    "targetPriorDamageMarker",
    "targetInteractionScope",
  ],
  excludedFieldsRemainBoundByCasualtyDomain: true,
  supportedWeapons: ["Bayonet", "Strike"],
  precisionValue: 3,
  staleDomainPolicy:
    "full_v2_plan_rederived_before_frozen_precision_algorithm_projection",
  trainingTruth: false,
};

export function createOfficialMarineMultiModelCloseCombatPrecisionKernelV3() {
  return freezeDeep({
    descriptor: {
      ...descriptorBody,
      kernelHash: hashStarcraftTmgContract(descriptorBody),
    },
    createGrant,
    verifyGrant,
    enumerateSelections,
    resolve,
    compatibilityPlan,
  });
}
