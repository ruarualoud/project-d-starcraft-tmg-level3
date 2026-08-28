import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const OFFICIAL_HEAL_RESOLUTION_KERNEL_ID =
  "authority.heal-resolution-kernel-v1";
export const OFFICIAL_HEAL_RESOLUTION_KERNEL_VERSION = "1.0.0";

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

function normalizedUniqueStrings(value, code) {
  if (!Array.isArray(value)) fail(code);
  const normalized = value.map((entry) => String(entry || "").trim().toLowerCase());
  if (normalized.some((entry) => !entry)
    || new Set(normalized).size !== normalized.length) {
    fail(code);
  }
  return normalized.sort((left, right) => left.localeCompare(right));
}

function resolveHeal(input = {}) {
  const currentModels = positiveInteger(input.currentModels, "HEAL_CURRENT_MODELS_INVALID");
  const maxModels = positiveInteger(input.maxModels, "HEAL_MAX_MODELS_INVALID");
  if (currentModels > maxModels) fail("HEAL_MODEL_DENOMINATOR_INVALID");
  const destroyedModelIds = normalizedUniqueStrings(
    input.destroyedModelIds,
    "HEAL_DESTROYED_MODEL_IDS_INVALID",
  );
  if (destroyedModelIds.length !== maxModels - currentModels) {
    fail("HEAL_DESTROYED_MODEL_DENOMINATOR_INVALID");
  }
  const damageMarkerBefore = nonNegativeInteger(
    input.damageMarker,
    "HEAL_DAMAGE_MARKER_INVALID",
  );
  const healValue = nonNegativeInteger(input.healValue, "HEAL_VALUE_INVALID");
  const statusesBefore = normalizedUniqueStrings(input.statuses || [], "HEAL_STATUS_SET_INVALID");
  const shieldValue = nonNegativeInteger(input.shieldValue || 0, "HEAL_SHIELD_VALUE_INVALID");
  if (statusesBefore.some((status) => status !== "shielded")) {
    fail("HEAL_STATUS_SCOPE_UNSUPPORTED");
  }
  const effectiveHeal = Math.min(healValue, damageMarkerBefore);
  const discardedHeal = healValue - effectiveHeal;
  const damageMarkerAfter = damageMarkerBefore - effectiveHeal;
  const shieldedBefore = statusesBefore.includes("shielded");
  const shieldedAfter = shieldedBefore;
  const statusesAfter = [...statusesBefore];
  const body = {
    schema: "starcraft_tmg_official_heal_resolution_v1",
    currentModelsBefore: currentModels,
    currentModelsAfter: currentModels,
    maxModels,
    destroyedModelIdsBefore: [...destroyedModelIds],
    destroyedModelIdsAfter: [...destroyedModelIds],
    damageMarkerBefore,
    healValue,
    effectiveHeal,
    discardedHeal,
    damageMarkerAfter,
    shieldValue,
    statusesBefore,
    statusesAfter,
    shieldedBefore,
    shieldedAfter,
    shieldedStatusRestored: false,
    destroyedModelsReturned: 0,
    respawnPerformed: false,
    rulesTruth: "official_core_part_5_and_part_11_heal_exact_transition",
    trainingTruth: false,
  };
  if (!isDeepStrictEqual(body.destroyedModelIdsBefore, body.destroyedModelIdsAfter)
    || body.currentModelsBefore !== body.currentModelsAfter
    || (!shieldedBefore && shieldedAfter)) {
    fail("HEAL_LIFECYCLE_INVARIANT_BROKEN");
  }
  return deepFreeze({
    ...body,
    healResolutionHash: hashStarcraftTmgContract(body),
  });
}

export function createOfficialHealResolutionKernelV1() {
  const descriptorBody = {
    schema: "starcraft_tmg_official_heal_resolution_kernel_descriptor_v1",
    kernelId: OFFICIAL_HEAL_RESOLUTION_KERNEL_ID,
    kernelVersion: OFFICIAL_HEAL_RESOLUTION_KERNEL_VERSION,
    damagePolicy: "remove_up_to_x_accumulated_damage",
    destroyedModelPolicy: "never_return_destroyed_models",
    shieldedPolicy: "heal_never_restores_lost_shielded_status",
    respawnIsDistinct: true,
    unsupportedScopesFailClosed: true,
    trainingTruth: false,
  };
  const descriptor = deepFreeze({
    ...descriptorBody,
    kernelHash: hashStarcraftTmgContract(descriptorBody),
  });
  return deepFreeze({ descriptor, resolveHeal });
}

