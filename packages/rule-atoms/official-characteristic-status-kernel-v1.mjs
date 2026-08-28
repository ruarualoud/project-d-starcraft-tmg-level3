import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const OFFICIAL_CHARACTERISTIC_STATUS_KERNEL_ID =
  "official-characteristic-status-kernel-v1";
export const OFFICIAL_CHARACTERISTIC_STATUS_KERNEL_VERSION = "1.0.0";
export const OFFICIAL_OPTICAL_FLARE_STATUS_SCHEMA =
  "starcraft_tmg_official_optical_flare_status_v1";
export const OFFICIAL_OPTICAL_FLARE_MARKER_SCHEMA =
  "starcraft_tmg_official_optical_flare_debuff_marker_v1";

export const OFFICIAL_CHARACTERISTIC_STATUS_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-11-debuff-duration:5903db472def",
  "rule-atom:singleton:core-11-debuff-value:84706dc86b4d",
  "rule-atom:singleton:core-11-status-definition:78de5e813bfb",
  "rule-atom:singleton:core-11-status-effect-markers:cd44cf1e9d23",
  "rule-atom:singleton:core-7-3-2-buff-debuff-marker:42d5602d6e12",
].sort((left, right) => left.localeCompare(right)));

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const OPTICAL_FLARE_SOURCE = Object.freeze({
  abilityId: "optical_flare",
  abilityName: "Optical Flare",
  activation: "<Active>\n(2 Command Point)",
  phase: "Movement Phase",
  description:
    "Select one Enemy Unit Within 12\". Until the End of the Round, apply DEBUFF Range (4) to that Unit’s Ranged Weapons. That Unit cannot benefit from LONG RANGE.",
  resourceType: "CP",
  resourceCost: 2,
  targetRangeInches: 12,
  characteristic: "range",
  debuffValue: 4,
  appliesTo: "ranged_weapons",
  longRangeAllowed: false,
  duration: "until_end_of_round_cleanup",
});
const OPTICAL_FLARE_SOURCE_TEXT_HASH = hashStarcraftTmgContract(OPTICAL_FLARE_SOURCE);

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

function nonNegativeNumber(value, code) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) fail(code, String(value));
  return parsed;
}

function statusBody(input) {
  return {
    schema: OFFICIAL_OPTICAL_FLARE_STATUS_SCHEMA,
    statusKind: "debuff",
    statusName: "DEBUFF Range (4)",
    effectId: input.effectId,
    roundApplied: input.round,
    sourceSideKey: input.sourceSideKey,
    sourcePieceId: input.sourcePieceId,
    targetPieceId: input.targetPieceId,
    sourceAbilityId: OPTICAL_FLARE_SOURCE.abilityId,
    sourceAbilityName: OPTICAL_FLARE_SOURCE.abilityName,
    sourceAbilityTextHash: OPTICAL_FLARE_SOURCE_TEXT_HASH,
    characteristic: OPTICAL_FLARE_SOURCE.characteristic,
    modifier: -OPTICAL_FLARE_SOURCE.debuffValue,
    minimumValue: 0,
    appliesTo: OPTICAL_FLARE_SOURCE.appliesTo,
    longRangeAllowed: OPTICAL_FLARE_SOURCE.longRangeAllowed,
    duration: OPTICAL_FLARE_SOURCE.duration,
    removalStep: "cleanup_and_refresh",
    trainingTruth: false,
  };
}

function markerBody(input, statusEffectHash) {
  return {
    schema: OFFICIAL_OPTICAL_FLARE_MARKER_SCHEMA,
    id: `debuff-marker-${input.effectId}`,
    markerType: "debuff",
    label: "DEBUFF Range (4)",
    targetPieceId: input.targetPieceId,
    characteristic: "range",
    value: 4,
    statusEffectHash,
    expiresAt: "cleanup_and_refresh",
    trainingTruth: false,
  };
}

export function verifyOfficialOpticalFlareStatusV1(status) {
  if (!object(status)
    || status.schema !== OFFICIAL_OPTICAL_FLARE_STATUS_SCHEMA
    || status.statusKind !== "debuff"
    || status.statusName !== "DEBUFF Range (4)"
    || !String(status.effectId || "")
    || !Number.isSafeInteger(status.roundApplied)
    || status.roundApplied < 1
    || !String(status.sourceSideKey || "")
    || !String(status.sourcePieceId || "")
    || !String(status.targetPieceId || "")
    || status.sourceAbilityId !== OPTICAL_FLARE_SOURCE.abilityId
    || status.sourceAbilityTextHash !== OPTICAL_FLARE_SOURCE_TEXT_HASH
    || status.characteristic !== "range"
    || status.modifier !== -4
    || status.minimumValue !== 0
    || status.appliesTo !== "ranged_weapons"
    || status.longRangeAllowed !== false
    || status.duration !== "until_end_of_round_cleanup"
    || status.removalStep !== "cleanup_and_refresh"
    || status.trainingTruth !== false
    || !HASH_PATTERN.test(String(status.statusEffectHash || ""))
    || status.statusEffectHash
      !== hashStarcraftTmgContract(without(status, ["statusEffectHash"]))) {
    fail("OPTICAL_FLARE_STATUS_INVALID");
  }
  return status;
}

export function verifyOfficialOpticalFlareMarkerV1(marker, status) {
  verifyOfficialOpticalFlareStatusV1(status);
  if (!object(marker)
    || marker.schema !== OFFICIAL_OPTICAL_FLARE_MARKER_SCHEMA
    || marker.id !== `debuff-marker-${status.effectId}`
    || marker.markerType !== "debuff"
    || marker.label !== "DEBUFF Range (4)"
    || marker.targetPieceId !== status.targetPieceId
    || marker.characteristic !== "range"
    || marker.value !== 4
    || marker.statusEffectHash !== status.statusEffectHash
    || marker.expiresAt !== "cleanup_and_refresh"
    || marker.trainingTruth !== false
    || !HASH_PATTERN.test(String(marker.markerHash || ""))
    || marker.markerHash !== hashStarcraftTmgContract(without(marker, ["markerHash"]))) {
    fail("OPTICAL_FLARE_MARKER_INVALID");
  }
  return marker;
}

export function createOfficialCharacteristicStatusKernelV1() {
  const descriptorBody = {
    schema: "starcraft_tmg_official_characteristic_status_kernel_v1",
    kernelId: OFFICIAL_CHARACTERISTIC_STATUS_KERNEL_ID,
    kernelVersion: OFFICIAL_CHARACTERISTIC_STATUS_KERNEL_VERSION,
    ruleAtomIds: [...OFFICIAL_CHARACTERISTIC_STATUS_NEW_ATOM_IDS],
    supportedStatuses: ["DEBUFF Range (4)"],
    characteristicFloor: 0,
    lifecycle: {
      appliedAtAbilityResolution: true,
      persistsThroughEndOfRoundResolution: true,
      removedDuringCleanup: true,
    },
    unknownStatusPolicy: "quarantine_and_fail_closed",
    trainingTruth: false,
  };
  const descriptor = freezeDeep({
    ...descriptorBody,
    kernelHash: hashStarcraftTmgContract(descriptorBody),
  });

  function createOpticalFlareStatus(input = {}) {
    const round = Number(input.round);
    const sourceSideKey = String(input.sourceSideKey || "").trim();
    const sourcePieceId = String(input.sourcePieceId || "").trim();
    const targetPieceId = String(input.targetPieceId || "").trim();
    const abilityResolutionHash = String(input.abilityResolutionHash || "").trim();
    if (!Number.isSafeInteger(round) || round < 1
      || !sourceSideKey || !sourcePieceId || !targetPieceId
      || !HASH_PATTERN.test(abilityResolutionHash)) {
      fail("OPTICAL_FLARE_STATUS_INPUT_INVALID");
    }
    const effectId = hashStarcraftTmgContract({
      schema: "starcraft_tmg_official_optical_flare_effect_identity_v1",
      round,
      sourceSideKey,
      sourcePieceId,
      targetPieceId,
      abilityResolutionHash,
    }).slice(0, 24);
    const body = statusBody({ effectId, round, sourceSideKey, sourcePieceId, targetPieceId });
    const status = freezeDeep({
      ...body,
      statusEffectHash: hashStarcraftTmgContract(body),
    });
    const marker = markerBody({ effectId, targetPieceId }, status.statusEffectHash);
    return freezeDeep({
      status,
      marker: { ...marker, markerHash: hashStarcraftTmgContract(marker) },
    });
  }

  function applyRangeDebuff(input = {}) {
    const status = verifyOfficialOpticalFlareStatusV1(input.status);
    const printedRangeInches = nonNegativeNumber(
      input.printedRangeInches,
      "OPTICAL_FLARE_PRINTED_RANGE_INVALID",
    );
    const printedLongRangeInches = input.printedLongRangeInches === null
      || input.printedLongRangeInches === undefined
      ? null
      : nonNegativeNumber(
          input.printedLongRangeInches,
          "OPTICAL_FLARE_PRINTED_LONG_RANGE_INVALID",
        );
    if (printedLongRangeInches !== null && printedLongRangeInches < printedRangeInches) {
      fail("OPTICAL_FLARE_PRINTED_LONG_RANGE_INVALID");
    }
    const effectiveRangeInches = Math.max(
      status.minimumValue,
      printedRangeInches + status.modifier,
    );
    const body = {
      schema: "starcraft_tmg_official_range_debuff_resolution_v1",
      statusEffectHash: status.statusEffectHash,
      targetPieceId: status.targetPieceId,
      printedRangeInches,
      printedLongRangeInches,
      modifier: status.modifier,
      minimumValue: status.minimumValue,
      effectiveRangeInches,
      longRangeAllowed: false,
      effectiveMaximumRangeInches: effectiveRangeInches,
      floorApplied: printedRangeInches + status.modifier < status.minimumValue,
      generatedValueRetained: 0,
      trainingTruth: false,
    };
    return freezeDeep({
      ...body,
      rangeDebuffResolutionHash: hashStarcraftTmgContract(body),
    });
  }

  function removeAtCleanup(input = {}) {
    const statuses = Array.isArray(input.statuses) ? input.statuses : [];
    const markers = Array.isArray(input.markers) ? input.markers : [];
    const opticalStatuses = statuses.filter((status) => (
      status?.schema === OFFICIAL_OPTICAL_FLARE_STATUS_SCHEMA
    ));
    for (const status of opticalStatuses) verifyOfficialOpticalFlareStatusV1(status);
    const removedStatusHashes = opticalStatuses.map((status) => status.statusEffectHash).sort();
    const opticalMarkers = markers.filter((marker) => (
      marker?.schema === OFFICIAL_OPTICAL_FLARE_MARKER_SCHEMA
    ));
    for (const marker of opticalMarkers) {
      const status = opticalStatuses.find((row) => row.statusEffectHash === marker.statusEffectHash);
      if (!status) fail("OPTICAL_FLARE_MARKER_ORPHANED");
      verifyOfficialOpticalFlareMarkerV1(marker, status);
    }
    const retainedStatuses = statuses.filter((status) => (
      status?.schema !== OFFICIAL_OPTICAL_FLARE_STATUS_SCHEMA
    ));
    const retainedMarkers = markers.filter((marker) => (
      marker?.schema !== OFFICIAL_OPTICAL_FLARE_MARKER_SCHEMA
    ));
    const body = {
      schema: "starcraft_tmg_official_end_round_status_cleanup_v1",
      removedStatusEffectHashes: removedStatusHashes,
      removedMarkerHashes: opticalMarkers.map((marker) => marker.markerHash).sort(),
      retainedStatusCount: retainedStatuses.length,
      retainedMarkerCount: retainedMarkers.length,
      cleanupStep: "cleanup_and_refresh",
      trainingTruth: false,
    };
    return freezeDeep({
      statuses: clone(retainedStatuses),
      markers: clone(retainedMarkers),
      receipt: {
        ...body,
        cleanupHash: hashStarcraftTmgContract(body),
      },
    });
  }

  function verifyExactOpticalFlarePair(status, marker) {
    verifyOfficialOpticalFlareStatusV1(status);
    verifyOfficialOpticalFlareMarkerV1(marker, status);
    return isDeepStrictEqual(marker.statusEffectHash, status.statusEffectHash);
  }

  return freezeDeep({
    descriptor,
    createOpticalFlareStatus,
    applyRangeDebuff,
    removeAtCleanup,
    verifyExactOpticalFlarePair,
  });
}

export const OFFICIAL_OPTICAL_FLARE_SOURCE_V1 = OPTICAL_FLARE_SOURCE;
export const OFFICIAL_OPTICAL_FLARE_SOURCE_TEXT_HASH_V1 =
  OPTICAL_FLARE_SOURCE_TEXT_HASH;
