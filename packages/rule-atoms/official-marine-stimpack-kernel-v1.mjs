import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const OFFICIAL_MARINE_STIMPACK_KERNEL_ID =
  "authority.marine-stimpack-kernel-v1";
export const OFFICIAL_MARINE_STIMPACK_KERNEL_VERSION = "1.0.0";
export const OFFICIAL_STIMPACK_STATUS_SCHEMA =
  "starcraft_tmg_official_stimpack_status_v1";
export const OFFICIAL_STIMPACK_MARKER_SCHEMA =
  "starcraft_tmg_official_stimpack_buff_marker_v1";

export const OFFICIAL_MARINE_STIMPACK_KERNEL_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-11-buff-duration:48199913097a",
  "rule-atom:singleton:core-11-non-lethal-damage-accumulation:70938eb8369b",
  "rule-atom:singleton:core-11-non-lethal-no-casualty-removal:cb98ebd1c290",
  "rule-atom:singleton:core-11-non-lethal-standard-damage-trigger:79458dcf31db",
  "rule-atom:singleton:core-11-precision-failed-dice-conversion:b540b4f0a7c2",
].sort((left, right) => left.localeCompare(right)));

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const STIMPACK_SOURCE = Object.freeze({
  abilityId: "stimpack",
  abilityName: "Stimpack",
  activation: "<Active>\n(1 Command Point)",
  phase: "Movement Phase",
  resourceType: "CP",
  resourceCost: 1,
  description:
    "This Unit suffers NON-LETHAL DAMAGE (2). This Unit gains BUFF Speed (3). Additionally, its C-14 Rifle and all Close Combat Weapons gain PRECISION (3).",
  nonLethalDamage: 2,
  speedBuff: 3,
  precision: 3,
  rangedWeaponNames: ["C-14 Rifle"],
  closeCombatWeaponScope: "all",
  duration: "until_end_of_round_cleanup",
});
const STIMPACK_SOURCE_TEXT_HASH = hashStarcraftTmgContract(STIMPACK_SOURCE);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
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

function statusBody(input) {
  return {
    schema: OFFICIAL_STIMPACK_STATUS_SCHEMA,
    statusKind: "buff",
    statusName: "Stimpack",
    effectId: input.effectId,
    roundApplied: input.round,
    sourceSideKey: input.sourceSideKey,
    sourcePieceId: input.sourcePieceId,
    targetPieceId: input.sourcePieceId,
    sourceAbilityId: STIMPACK_SOURCE.abilityId,
    sourceAbilityName: STIMPACK_SOURCE.abilityName,
    sourceAbilityTextHash: STIMPACK_SOURCE_TEXT_HASH,
    speedBuff: STIMPACK_SOURCE.speedBuff,
    precision: STIMPACK_SOURCE.precision,
    rangedWeaponNames: [...STIMPACK_SOURCE.rangedWeaponNames],
    closeCombatWeaponScope: STIMPACK_SOURCE.closeCombatWeaponScope,
    duration: STIMPACK_SOURCE.duration,
    removalStep: "cleanup_and_refresh",
    speedValueConsumerExecutable: false,
    rangedPrecisionConsumerExecutable: true,
    closeCombatPrecisionConsumerExecutable: false,
    trainingTruth: false,
  };
}

function markerBody(input, statusEffectHash) {
  return {
    schema: OFFICIAL_STIMPACK_MARKER_SCHEMA,
    id: `buff-marker-${input.effectId}`,
    markerType: "buff",
    label: "Stimpack: BUFF Speed (3); PRECISION (3)",
    targetPieceId: input.sourcePieceId,
    speedBuff: STIMPACK_SOURCE.speedBuff,
    precision: STIMPACK_SOURCE.precision,
    statusEffectHash,
    expiresAt: "cleanup_and_refresh",
    trainingTruth: false,
  };
}

export function verifyOfficialStimpackStatusV1(status) {
  if (!object(status)
    || status.schema !== OFFICIAL_STIMPACK_STATUS_SCHEMA
    || status.statusKind !== "buff"
    || status.statusName !== "Stimpack"
    || !String(status.effectId || "")
    || !Number.isSafeInteger(status.roundApplied)
    || status.roundApplied < 1
    || !String(status.sourceSideKey || "")
    || !String(status.sourcePieceId || "")
    || status.targetPieceId !== status.sourcePieceId
    || status.sourceAbilityId !== STIMPACK_SOURCE.abilityId
    || status.sourceAbilityName !== STIMPACK_SOURCE.abilityName
    || status.sourceAbilityTextHash !== STIMPACK_SOURCE_TEXT_HASH
    || status.speedBuff !== 3
    || status.precision !== 3
    || !isDeepStrictEqual(status.rangedWeaponNames, ["C-14 Rifle"])
    || status.closeCombatWeaponScope !== "all"
    || status.duration !== "until_end_of_round_cleanup"
    || status.removalStep !== "cleanup_and_refresh"
    || status.speedValueConsumerExecutable !== false
    || status.rangedPrecisionConsumerExecutable !== true
    || status.closeCombatPrecisionConsumerExecutable !== false
    || status.trainingTruth !== false
    || !HASH_PATTERN.test(String(status.statusEffectHash || ""))
    || status.statusEffectHash
      !== hashStarcraftTmgContract(without(status, ["statusEffectHash"]))) {
    fail("STIMPACK_STATUS_INVALID");
  }
  return status;
}

export function verifyOfficialStimpackMarkerV1(marker, status) {
  verifyOfficialStimpackStatusV1(status);
  if (!object(marker)
    || marker.schema !== OFFICIAL_STIMPACK_MARKER_SCHEMA
    || marker.id !== `buff-marker-${status.effectId}`
    || marker.markerType !== "buff"
    || marker.label !== "Stimpack: BUFF Speed (3); PRECISION (3)"
    || marker.targetPieceId !== status.targetPieceId
    || marker.speedBuff !== 3
    || marker.precision !== 3
    || marker.statusEffectHash !== status.statusEffectHash
    || marker.expiresAt !== "cleanup_and_refresh"
    || marker.trainingTruth !== false
    || !HASH_PATTERN.test(String(marker.markerHash || ""))
    || marker.markerHash !== hashStarcraftTmgContract(without(marker, ["markerHash"]))) {
    fail("STIMPACK_MARKER_INVALID");
  }
  return marker;
}

function createStatus(input = {}) {
  const round = Number(input.round);
  const sourceSideKey = String(input.sourceSideKey || "").trim();
  const sourcePieceId = String(input.sourcePieceId || "").trim();
  const abilityResolutionHash = String(input.abilityResolutionHash || "").trim();
  if (!Number.isSafeInteger(round) || round < 1
    || !sourceSideKey || !sourcePieceId || !HASH_PATTERN.test(abilityResolutionHash)) {
    fail("STIMPACK_STATUS_INPUT_INVALID");
  }
  const effectId = hashStarcraftTmgContract({
    schema: "starcraft_tmg_official_stimpack_effect_identity_v1",
    round,
    sourceSideKey,
    sourcePieceId,
    abilityResolutionHash,
  }).slice(0, 24);
  const body = statusBody({ effectId, round, sourceSideKey, sourcePieceId });
  const status = freezeDeep({
    ...body,
    statusEffectHash: hashStarcraftTmgContract(body),
  });
  const marker = markerBody({ effectId, sourcePieceId }, status.statusEffectHash);
  return freezeDeep({
    status,
    marker: { ...marker, markerHash: hashStarcraftTmgContract(marker) },
  });
}

function resolveNonLethalDamage(input = {}) {
  const targetPieceId = String(input.targetPieceId || "").trim();
  const targetModelId = String(input.targetModelId || "").trim();
  const abilityResolutionHash = String(input.abilityResolutionHash || "").trim();
  const priorDamageMarker = nonNegativeInteger(
    input.priorDamageMarker,
    "STIMPACK_NON_LETHAL_PRIOR_MARKER_INVALID",
  );
  const amount = positiveInteger(
    input.amount,
    "STIMPACK_NON_LETHAL_AMOUNT_INVALID",
  );
  const targetHitPoints = positiveInteger(
    input.targetHitPoints,
    "STIMPACK_NON_LETHAL_TARGET_HP_INVALID",
  );
  if (!targetPieceId || !targetModelId || !HASH_PATTERN.test(abilityResolutionHash)) {
    fail("STIMPACK_NON_LETHAL_BINDING_INVALID");
  }
  if (amount !== STIMPACK_SOURCE.nonLethalDamage) {
    fail("STIMPACK_NON_LETHAL_SOURCE_VALUE_MISMATCH");
  }
  const body = {
    schema: "starcraft_tmg_official_non_lethal_damage_resolution_v1",
    targetPieceId,
    targetModelId,
    abilityResolutionHash,
    priorDamageMarker,
    nonLethalDamage: amount,
    postDamageMarker: priorDamageMarker + amount,
    targetHitPoints,
    totalDamageMayMeetOrExceedHitPoints: true,
    casualtyRemovalDeferredUntilLaterStandardDamage: true,
    targetDestroyed: false,
    casualtyModelIds: [],
    discardedOverflowDamage: 0,
    trainingTruth: false,
  };
  return freezeDeep({
    ...body,
    nonLethalResolutionHash: hashStarcraftTmgContract(body),
  });
}

function createPrecisionGrant(input = {}) {
  const status = verifyOfficialStimpackStatusV1(input.status);
  const attackerPieceId = String(input.attackerPieceId || "").trim();
  const weaponName = String(input.weaponName || "").trim();
  const attackPlanHash = String(input.attackPlanHash || "").trim();
  if (!attackerPieceId
    || attackerPieceId !== status.targetPieceId
    || weaponName !== "C-14 rifle"
    || !HASH_PATTERN.test(attackPlanHash)) {
    fail("STIMPACK_PRECISION_GRANT_BINDING_INVALID");
  }
  const body = {
    schema: "starcraft_tmg_official_stimpack_precision_grant_v1",
    statusEffectHash: status.statusEffectHash,
    attackerPieceId,
    attackPlanHash,
    weaponName,
    sourceWeaponName: "C-14 Rifle",
    weaponKind: "ranged",
    precisionValue: status.precision,
    timing: "after_hit_roll_before_armour_pool",
    treatsConvertedDiceAsSuccessfulHitsForAllPurposes: true,
    speedValueConsumed: false,
    closeCombatPrecisionConsumed: false,
    trainingTruth: false,
  };
  return freezeDeep({
    ...body,
    precisionGrantHash: hashStarcraftTmgContract(body),
  });
}

export function verifyOfficialStimpackPrecisionGrantV1(grant) {
  if (!object(grant)
    || grant.schema !== "starcraft_tmg_official_stimpack_precision_grant_v1"
    || !HASH_PATTERN.test(String(grant.statusEffectHash || ""))
    || !String(grant.attackerPieceId || "")
    || !HASH_PATTERN.test(String(grant.attackPlanHash || ""))
    || grant.weaponName !== "C-14 rifle"
    || grant.sourceWeaponName !== "C-14 Rifle"
    || grant.weaponKind !== "ranged"
    || grant.precisionValue !== 3
    || grant.timing !== "after_hit_roll_before_armour_pool"
    || grant.treatsConvertedDiceAsSuccessfulHitsForAllPurposes !== true
    || grant.speedValueConsumed !== false
    || grant.closeCombatPrecisionConsumed !== false
    || grant.trainingTruth !== false
    || !HASH_PATTERN.test(String(grant.precisionGrantHash || ""))
    || grant.precisionGrantHash
      !== hashStarcraftTmgContract(without(grant, ["precisionGrantHash"]))) {
    fail("STIMPACK_PRECISION_GRANT_INVALID");
  }
  return grant;
}

function resolveLaterStandardDamage(input = {}) {
  const targetPieceId = String(input.targetPieceId || "").trim();
  const targetModelId = String(input.targetModelId || "").trim();
  const attackResolutionHash = String(input.attackResolutionHash || "").trim();
  const priorDamageMarker = nonNegativeInteger(
    input.priorDamageMarker,
    "STIMPACK_STANDARD_DAMAGE_PRIOR_MARKER_INVALID",
  );
  const incomingDamage = positiveInteger(
    input.incomingDamage,
    "STIMPACK_STANDARD_DAMAGE_INCOMING_INVALID",
  );
  const targetHitPoints = positiveInteger(
    input.targetHitPoints,
    "STIMPACK_STANDARD_DAMAGE_TARGET_HP_INVALID",
  );
  if (!targetPieceId || !targetModelId || !HASH_PATTERN.test(attackResolutionHash)) {
    fail("STIMPACK_STANDARD_DAMAGE_BINDING_INVALID");
  }
  const totalDamage = priorDamageMarker + incomingDamage;
  const targetDestroyed = totalDamage >= targetHitPoints;
  const body = {
    schema: "starcraft_tmg_official_non_lethal_then_standard_damage_resolution_v1",
    targetPieceId,
    targetModelId,
    attackResolutionHash,
    priorDamageMarker,
    incomingStandardDamage: incomingDamage,
    totalDamage,
    targetHitPoints,
    nonLethalDamageIncludedInNormalResolution: true,
    targetDestroyed,
    casualtyModelIds: targetDestroyed ? [targetModelId] : [],
    postDamageMarker: targetDestroyed ? 0 : totalDamage,
    discardedOverflowDamage: targetDestroyed ? totalDamage - targetHitPoints : 0,
    trainingTruth: false,
  };
  return freezeDeep({
    ...body,
    standardDamageResolutionHash: hashStarcraftTmgContract(body),
  });
}

function removeAtCleanup(input = {}) {
  const statuses = Array.isArray(input.statuses) ? input.statuses : [];
  const markers = Array.isArray(input.markers) ? input.markers : [];
  const stimpackStatuses = statuses.filter((status) => (
    status?.schema === OFFICIAL_STIMPACK_STATUS_SCHEMA
  ));
  for (const status of stimpackStatuses) verifyOfficialStimpackStatusV1(status);
  const stimpackMarkers = markers.filter((marker) => (
    marker?.schema === OFFICIAL_STIMPACK_MARKER_SCHEMA
  ));
  for (const marker of stimpackMarkers) {
    const status = stimpackStatuses.find((row) => (
      row.statusEffectHash === marker.statusEffectHash
    ));
    if (!status) fail("STIMPACK_MARKER_ORPHANED");
    verifyOfficialStimpackMarkerV1(marker, status);
  }
  if (stimpackStatuses.some((status) => !stimpackMarkers.some((marker) => (
    marker.statusEffectHash === status.statusEffectHash
  )))) {
    fail("STIMPACK_STATUS_MARKER_REQUIRED");
  }
  const retainedStatuses = statuses.filter((status) => (
    status?.schema !== OFFICIAL_STIMPACK_STATUS_SCHEMA
  ));
  const retainedMarkers = markers.filter((marker) => (
    marker?.schema !== OFFICIAL_STIMPACK_MARKER_SCHEMA
  ));
  const body = {
    schema: "starcraft_tmg_official_stimpack_cleanup_resolution_v1",
    removedStatusEffectHashes: stimpackStatuses
      .map((status) => status.statusEffectHash).sort(),
    removedMarkerHashes: stimpackMarkers.map((marker) => marker.markerHash).sort(),
    retainedStatusCount: retainedStatuses.length,
    retainedMarkerCount: retainedMarkers.length,
    damageMarkerPolicy: "retained_outside_status_cleanup",
    cleanupStep: "cleanup_and_refresh",
    trainingTruth: false,
  };
  return freezeDeep({
    statuses: clone(retainedStatuses),
    markers: clone(retainedMarkers),
    receipt: { ...body, cleanupHash: hashStarcraftTmgContract(body) },
  });
}

const descriptorBody = {
  schema: "starcraft_tmg_official_marine_stimpack_kernel_descriptor_v1",
  kernelId: OFFICIAL_MARINE_STIMPACK_KERNEL_ID,
  kernelVersion: OFFICIAL_MARINE_STIMPACK_KERNEL_VERSION,
  ruleAtomIds: [...OFFICIAL_MARINE_STIMPACK_KERNEL_NEW_ATOM_IDS],
  supportedCarrier: "current_official_marine_stimpack",
  nonLethalDamagePolicy: {
    exactValue: 2,
    addsToDamageMarker: true,
    neverRemovesModelsAtApplication: true,
    laterPositiveStandardDamageResolvesCombinedTotalNormally: true,
  },
  statusPolicy: {
    speedBuffStored: 3,
    speedValueConsumerExecutable: false,
    rangedC14PrecisionExecutable: 3,
    closeCombatPrecisionConsumerExecutable: false,
    removedDuringCleanup: true,
    damageMarkerRetainedDuringCleanup: true,
  },
  unknownStatusPolicy: "quarantine_and_fail_closed",
  trainingTruth: false,
};

export function createOfficialMarineStimpackKernelV1() {
  return freezeDeep({
    descriptor: {
      ...descriptorBody,
      kernelHash: hashStarcraftTmgContract(descriptorBody),
    },
    createStatus,
    resolveNonLethalDamage,
    createPrecisionGrant,
    resolveLaterStandardDamage,
    removeAtCleanup,
  });
}

export const OFFICIAL_MARINE_STIMPACK_SOURCE_V1 = STIMPACK_SOURCE;
export const OFFICIAL_MARINE_STIMPACK_SOURCE_TEXT_HASH_V1 =
  STIMPACK_SOURCE_TEXT_HASH;
