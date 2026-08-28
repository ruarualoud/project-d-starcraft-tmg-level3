import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const OFFICIAL_DODGE_RESOLUTION_KERNEL_ID =
  "authority.dodge-resolution-kernel-v1";
export const OFFICIAL_DODGE_RESOLUTION_KERNEL_VERSION = "1.0.0";
export const OFFICIAL_DODGE_EFFECT_ATOM_ID = "attack-effect:dodge-v1";
export const OFFICIAL_GUARDIAN_SHELL_DODGE_SOURCE =
  "power_field_guardian_shell_current_official_card";
export const OFFICIAL_POWER_FIELD_SOURCE_RECORD_HASH =
  "65bc452416df2ab8c4275810e8333d5557e990de1ce9ae88bc135771637bdc58";

const PLAN_SCHEMA = "starcraft_tmg_official_dodge_resolution_plan_v1";
const RECEIPT_SCHEMA = "starcraft_tmg_official_dodge_resolution_receipt_v1";
const ABSENT_DODGE_SOURCE = "target_official_profile_and_effect_state";
const SUPPORTED_TRANSFER_EFFECT_ATOM_IDS = Object.freeze([
  "attack-effect:surge-armour-bypass-v1",
  "attack-effect:critical-hit-v1",
]);

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

function nonNegativeInteger(value, code) {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 0) fail(code);
  return result;
}

function verifyTargetDodge(value) {
  if (!object(value) || typeof value.present !== "boolean") {
    fail("DODGE_EVIDENCE_REQUIRED");
  }
  const reduction = nonNegativeInteger(value.reduction, "DODGE_REDUCTION_INVALID");
  if (value.present === false) {
    if (reduction !== 0 || value.source !== ABSENT_DODGE_SOURCE) {
      fail("DODGE_ABSENT_EVIDENCE_INVALID");
    }
    return {
      present: false,
      reduction: 0,
      source: ABSENT_DODGE_SOURCE,
    };
  }
  if (reduction <= 0) fail("DODGE_REDUCTION_INVALID");
  if (value.source !== OFFICIAL_GUARDIAN_SHELL_DODGE_SOURCE
    || value.sourceRecordHash !== OFFICIAL_POWER_FIELD_SOURCE_RECORD_HASH
    || value.abilityName !== "Guardian Shell"
    || value.duration !== "this_armour_roll") {
    fail(value.sourceRecordHash !== OFFICIAL_POWER_FIELD_SOURCE_RECORD_HASH
      ? "DODGE_SOURCE_RECORD_MISMATCH"
      : "DODGE_SOURCE_EVIDENCE_INVALID");
  }
  return {
    present: true,
    reduction,
    source: OFFICIAL_GUARDIAN_SHELL_DODGE_SOURCE,
    sourceRecordHash: OFFICIAL_POWER_FIELD_SOURCE_RECORD_HASH,
    abilityName: "Guardian Shell",
    duration: "this_armour_roll",
  };
}

function verifyTransferRequests(value) {
  if (!Array.isArray(value)) fail("DODGE_TRANSFER_REQUESTS_REQUIRED");
  const seen = new Set();
  return value.map((request) => {
    const effectAtomId = String(request?.effectAtomId || "");
    if (!SUPPORTED_TRANSFER_EFFECT_ATOM_IDS.includes(effectAtomId)) {
      fail("DODGE_TRANSFER_EFFECT_UNSUPPORTED", effectAtomId);
    }
    if (seen.has(effectAtomId)) fail("DODGE_TRANSFER_EFFECT_DUPLICATE", effectAtomId);
    seen.add(effectAtomId);
    return {
      effectAtomId,
      requestedDice: nonNegativeInteger(
        request.requestedDice,
        "DODGE_TRANSFER_DICE_INVALID",
      ),
    };
  });
}

function planDodgeResolution(input = {}) {
  const armourPoolDice = nonNegativeInteger(
    input.armourPoolDice,
    "DODGE_ARMOUR_POOL_INVALID",
  );
  const targetDodge = verifyTargetDodge(input.targetDodge);
  const transferRequests = verifyTransferRequests(input.transferRequests);
  const body = {
    schema: PLAN_SCHEMA,
    kernelId: OFFICIAL_DODGE_RESOLUTION_KERNEL_ID,
    kernelVersion: OFFICIAL_DODGE_RESOLUTION_KERNEL_VERSION,
    effectAtomId: OFFICIAL_DODGE_EFFECT_ATOM_ID,
    timing: "resolve_surge",
    armourPoolDice,
    targetDodge,
    transferRequests,
    sharedReductionBudget: true,
    minimumTransferredDice: 0,
    trainingTruth: false,
  };
  return deepFreeze({ ...body, planHash: hashStarcraftTmgContract(body) });
}

function verifyPlan(plan) {
  if (!object(plan)
    || plan.schema !== PLAN_SCHEMA
    || plan.kernelId !== OFFICIAL_DODGE_RESOLUTION_KERNEL_ID
    || plan.kernelVersion !== OFFICIAL_DODGE_RESOLUTION_KERNEL_VERSION
    || plan.effectAtomId !== OFFICIAL_DODGE_EFFECT_ATOM_ID
    || plan.timing !== "resolve_surge"
    || plan.sharedReductionBudget !== true
    || plan.minimumTransferredDice !== 0
    || plan.trainingTruth !== false
    || plan.planHash !== hashStarcraftTmgContract(without(plan, ["planHash"]))) {
    fail("DODGE_PLAN_INVALID");
  }
  nonNegativeInteger(plan.armourPoolDice, "DODGE_PLAN_INVALID");
  verifyTargetDodge(plan.targetDodge);
  verifyTransferRequests(plan.transferRequests);
  return true;
}

function resolveDodge(plan) {
  verifyPlan(plan);
  const requestedTransferDice = plan.transferRequests.reduce(
    (total, request) => total + request.requestedDice,
    0,
  );
  const transferDiceBeforeDodge = Math.min(
    plan.armourPoolDice,
    requestedTransferDice,
  );
  const dodgeReductionApplied = Math.min(
    transferDiceBeforeDodge,
    plan.targetDodge.reduction,
  );
  const transferredDamagePoolDice = Math.max(
    0,
    transferDiceBeforeDodge - dodgeReductionApplied,
  );
  const body = {
    schema: RECEIPT_SCHEMA,
    kernelId: OFFICIAL_DODGE_RESOLUTION_KERNEL_ID,
    kernelVersion: OFFICIAL_DODGE_RESOLUTION_KERNEL_VERSION,
    effectAtomId: OFFICIAL_DODGE_EFFECT_ATOM_ID,
    planHash: plan.planHash,
    timing: "resolve_surge",
    armourPoolDiceBeforeTransfer: plan.armourPoolDice,
    transferEffectAtomIds: plan.transferRequests.map((request) => request.effectAtomId),
    transferRequests: structuredClone(plan.transferRequests),
    requestedTransferDice,
    transferDiceBeforeDodge,
    dodgeReductionRequested: plan.targetDodge.reduction,
    dodgeReductionApplied,
    transferredDamagePoolDice,
    remainingArmourPoolDice: plan.armourPoolDice - transferredDamagePoolDice,
    sharedReductionBudget: true,
    minimumTransferredDice: 0,
    generatedAdditionalHits: 0,
    trainingTruth: false,
  };
  return deepFreeze({ ...body, resolutionHash: hashStarcraftTmgContract(body) });
}

function verifyReceipt(receipt) {
  if (!object(receipt)
    || receipt.schema !== RECEIPT_SCHEMA
    || receipt.kernelId !== OFFICIAL_DODGE_RESOLUTION_KERNEL_ID
    || receipt.kernelVersion !== OFFICIAL_DODGE_RESOLUTION_KERNEL_VERSION
    || receipt.effectAtomId !== OFFICIAL_DODGE_EFFECT_ATOM_ID
    || receipt.timing !== "resolve_surge"
    || receipt.sharedReductionBudget !== true
    || receipt.minimumTransferredDice !== 0
    || receipt.generatedAdditionalHits !== 0
    || receipt.trainingTruth !== false
    || receipt.resolutionHash
      !== hashStarcraftTmgContract(without(receipt, ["resolutionHash"]))) {
    fail("DODGE_RECEIPT_INVALID");
  }
  const armour = nonNegativeInteger(
    receipt.armourPoolDiceBeforeTransfer,
    "DODGE_RECEIPT_INVALID",
  );
  const requests = verifyTransferRequests(receipt.transferRequests);
  const requested = requests.reduce((total, request) => total + request.requestedDice, 0);
  if (receipt.requestedTransferDice !== requested
    || receipt.transferDiceBeforeDodge !== Math.min(armour, requested)
    || receipt.dodgeReductionApplied
      !== Math.min(receipt.transferDiceBeforeDodge, receipt.dodgeReductionRequested)
    || receipt.transferredDamagePoolDice
      !== Math.max(0, receipt.transferDiceBeforeDodge - receipt.dodgeReductionApplied)
    || receipt.remainingArmourPoolDice !== armour - receipt.transferredDamagePoolDice
    || JSON.stringify(receipt.transferEffectAtomIds)
      !== JSON.stringify(requests.map((request) => request.effectAtomId))) {
    fail("DODGE_RECEIPT_INVALID");
  }
  return true;
}

export function createOfficialDodgeResolutionKernelV1() {
  const descriptorBody = {
    schema: "starcraft_tmg_official_dodge_resolution_kernel_descriptor_v1",
    kernelId: OFFICIAL_DODGE_RESOLUTION_KERNEL_ID,
    kernelVersion: OFFICIAL_DODGE_RESOLUTION_KERNEL_VERSION,
    effectAtomId: OFFICIAL_DODGE_EFFECT_ATOM_ID,
    supportedTransferEffectAtomIds: [...SUPPORTED_TRANSFER_EFFECT_ATOM_IDS],
    timing: "resolve_surge",
    sharedReductionBudget: true,
    minimumTransferredDice: 0,
    sourceRecordHash: OFFICIAL_POWER_FIELD_SOURCE_RECORD_HASH,
    sourceAbilityName: "Guardian Shell",
    generatedAdditionalHits: 0,
    trainingTruth: false,
  };
  const descriptor = deepFreeze({
    ...descriptorBody,
    kernelHash: hashStarcraftTmgContract(descriptorBody),
  });
  return deepFreeze({
    descriptor,
    plan: planDodgeResolution,
    resolve: resolveDodge,
    verifyPlan,
    verifyReceipt,
  });
}
