import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const OFFICIAL_INDIRECT_FIRE_LOCKED_IN_EFFECT_KERNEL_ID =
  "authority.indirect-fire-locked-in-effect-kernel-v1";
export const OFFICIAL_INDIRECT_FIRE_LOCKED_IN_EFFECT_KERNEL_VERSION = "1.0.0";
export const OFFICIAL_INDIRECT_FIRE_EFFECT_ATOM_ID =
  "attack-effect:indirect-fire-v1";
export const OFFICIAL_LOCKED_IN_EFFECT_ATOM_ID = "attack-effect:locked-in-v1";

const SIDEARM_EFFECT_ATOM_ID = "attack-effect:sidearm-v1";
const PINPOINT_EFFECT_ATOM_ID = "attack-effect:pinpoint-v1";
const LONG_RANGE_EFFECT_ATOM_ID = "attack-effect:long-range-v1";
const SURGE_EFFECT_ATOM_ID = "attack-effect:surge-armour-bypass-v1";
const GOLIATH_RECORD_KEY = "army_units:goliath";
const AUTOCANNON_PROFILE_KEY = "army_units:goliath::assault::Autocannon";
const UNDERBELLY_PROFILE_KEY =
  "army_units:goliath::assault::Underbelly Machine Gun";
export const OFFICIAL_SCATTER_MISSILES_PROFILE_KEY =
  "army_units:goliath::assault::Scatter Missiles";
const PROFILE_HASHES = Object.freeze({
  [AUTOCANNON_PROFILE_KEY]:
    "3be2ef5234bccb909d9119fc83130718770de31a5f7cf0348e9a573512ea8ce3",
  [UNDERBELLY_PROFILE_KEY]:
    "c7574f07ba693d5c032d05f4cebd67cd665c62f390ce8557582bada9690b745e",
  [OFFICIAL_SCATTER_MISSILES_PROFILE_KEY]:
    "af871c574958994688cc7e7751ac0fce2d0a09123944f06480511dea0d24f544",
});
export const OFFICIAL_SCATTER_LOADOUT_PROFILE_KEYS = Object.freeze(
  Object.keys(PROFILE_HASHES).sort((left, right) => left.localeCompare(right)),
);
export const OFFICIAL_SCATTER_SIDEARM_PROFILE_KEYS = Object.freeze([
  OFFICIAL_SCATTER_MISSILES_PROFILE_KEY,
  UNDERBELLY_PROFILE_KEY,
].sort((left, right) => left.localeCompare(right)));

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

function effects(profile, effectAtomId) {
  return profile.effects.filter((entry) => entry.effectAtomId === effectAtomId);
}

function verifyEffect(profile, effectAtomId, expectedParameters, required) {
  const matches = effects(profile, effectAtomId);
  if (matches.length !== (required ? 1 : 0)) {
    fail("INDIRECT_LOCKED_EFFECT_BINDING_INVALID", `${profile.profileKey}:${effectAtomId}`);
  }
  if (required && (matches[0].sourceKind !== "weapon_keyword"
    || !isDeepStrictEqual(matches[0].parameters, expectedParameters))) {
    fail("INDIRECT_LOCKED_EFFECT_PARAMETERS_INVALID", `${profile.profileKey}:${effectAtomId}`);
  }
}

function verifyProfile(profile) {
  if (!object(profile)
    || profile.schema !== "starcraft_tmg_official_attack_profile_v1"
    || profile.recordKey !== GOLIATH_RECORD_KEY
    || profile.phase !== "assault"
    || !OFFICIAL_SCATTER_LOADOUT_PROFILE_KEYS.includes(profile.profileKey)
    || profile.profileHash !== PROFILE_HASHES[profile.profileKey]
    || profile.profileHash !== hashStarcraftTmgContract(without(profile, ["profileHash"]))
    || !Array.isArray(profile.effects)) {
    fail("INDIRECT_LOCKED_PROFILE_INVALID", String(profile?.profileKey || ""));
  }
  const scatter = profile.profileKey === OFFICIAL_SCATTER_MISSILES_PROFILE_KEY;
  verifyEffect(profile, OFFICIAL_INDIRECT_FIRE_EFFECT_ATOM_ID, {}, scatter);
  verifyEffect(profile, OFFICIAL_LOCKED_IN_EFFECT_ATOM_ID, {
    additionalRateOfAttack: 6,
  }, scatter);
  const longRangeMaximum = profile.profileKey === AUTOCANNON_PROFILE_KEY
    ? 18
    : scatter
      ? 24
      : null;
  verifyEffect(profile, LONG_RANGE_EFFECT_ATOM_ID, longRangeMaximum === null
    ? {}
    : { maximumRangeInches: longRangeMaximum }, longRangeMaximum !== null);
  verifyEffect(profile, SIDEARM_EFFECT_ATOM_ID, {}, (
    OFFICIAL_SCATTER_SIDEARM_PROFILE_KEYS.includes(profile.profileKey)
  ));
  verifyEffect(profile, PINPOINT_EFFECT_ATOM_ID, {}, (
    profile.profileKey === UNDERBELLY_PROFILE_KEY
  ));
  if (profile.profileKey === AUTOCANNON_PROFILE_KEY
    && (profile.weaponName !== "Autocannon"
      || profile.linkedTo !== "-"
      || profile.range?.normalRangeInches !== 12
      || profile.rateOfAttack !== 9
      || profile.hitThreshold !== 4
      || profile.damage !== 1)) {
    fail("INDIRECT_LOCKED_PROFILE_SHAPE_INVALID", profile.profileKey);
  }
  if (profile.profileKey === UNDERBELLY_PROFILE_KEY
    && (profile.weaponName !== "Underbelly Machine Gun"
      || profile.linkedTo !== "-"
      || profile.range?.normalRangeInches !== 8
      || profile.rateOfAttack !== 6
      || profile.hitThreshold !== 3
      || profile.damage !== 1)) {
    fail("INDIRECT_LOCKED_PROFILE_SHAPE_INVALID", profile.profileKey);
  }
  if (scatter
    && (profile.weaponName !== "Scatter Missiles"
      || profile.linkedTo !== "Hellfire Missiles"
      || profile.costSmall !== 30
      || profile.costLarge !== 30
      || profile.range?.normalRangeInches !== 18
      || profile.rateOfAttack !== 6
      || profile.hitThreshold !== 5
      || profile.damage !== 1
      || !isDeepStrictEqual(profile.targetTags, ["ground"])
      || !isDeepStrictEqual(profile.surge, {
        targetTags: ["light"],
        diceExpression: "D3",
      })
      || effects(profile, SURGE_EFFECT_ATOM_ID).length !== 1)) {
    fail("INDIRECT_LOCKED_PROFILE_SHAPE_INVALID", profile.profileKey);
  }
  return profile;
}

function verifyLoadout(loadout) {
  if (!object(loadout)
    || loadout.schema !== "starcraft_tmg_official_replacement_weapon_loadout_v1"
    || loadout.recordKey !== GOLIATH_RECORD_KEY
    || loadout.phase !== "assault"
    || loadout.loadoutHash !== hashStarcraftTmgContract(without(loadout, ["loadoutHash"]))
    || !isDeepStrictEqual(loadout.selectedWeaponUpgradeNames, ["Scatter Missiles"])
    || !isDeepStrictEqual(loadout.availableProfileKeys,
      OFFICIAL_SCATTER_LOADOUT_PROFILE_KEYS)
    || loadout.replacements?.length !== 1
    || loadout.replacements[0].replacementWeaponName !== "Scatter Missiles"
    || loadout.replacements[0].originalWeaponName !== "Hellfire Missiles"
    || loadout.trainingTruth !== false) {
    fail("INDIRECT_LOCKED_LOADOUT_INVALID");
  }
  return loadout;
}

function normalizedSelection(values) {
  if (!Array.isArray(values)) fail("INDIRECT_LOCKED_SELECTION_REQUIRED");
  const result = values.map((value) => String(value || "").trim())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
  if (result.length === 0
    || new Set(result).size !== result.length
    || result.some((profileKey) => !OFFICIAL_SCATTER_LOADOUT_PROFILE_KEYS.includes(
      profileKey,
    ))) {
    fail("INDIRECT_LOCKED_SELECTION_INVALID");
  }
  return result;
}

function authorizeSelection(input = {}) {
  const profiles = (input.profiles || []).map(verifyProfile)
    .sort((left, right) => left.profileKey.localeCompare(right.profileKey));
  if (!isDeepStrictEqual(profiles.map((profile) => profile.profileKey),
    OFFICIAL_SCATTER_LOADOUT_PROFILE_KEYS)) {
    fail("INDIRECT_LOCKED_PROFILE_DENOMINATOR_INVALID");
  }
  const loadout = verifyLoadout(input.weaponLoadout);
  const selectedBatchProfileKeys = normalizedSelection(input.selectedBatchProfileKeys);
  const selectedSidearmProfileKeys = selectedBatchProfileKeys.filter((profileKey) => (
    OFFICIAL_SCATTER_SIDEARM_PROFILE_KEYS.includes(profileKey)
  ));
  const selectedOrdinaryProfileKeys = selectedBatchProfileKeys.filter((profileKey) => (
    !OFFICIAL_SCATTER_SIDEARM_PROFILE_KEYS.includes(profileKey)
  ));
  if (selectedOrdinaryProfileKeys.length > 1
    || (selectedBatchProfileKeys.length > 1 && selectedSidearmProfileKeys.length === 0)) {
    fail("INDIRECT_LOCKED_ONE_WEAPON_LIMIT_NOT_OVERRIDDEN");
  }
  const body = {
    schema: "starcraft_tmg_official_scatter_profile_selection_authorization_v1",
    kernelId: OFFICIAL_INDIRECT_FIRE_LOCKED_IN_EFFECT_KERNEL_ID,
    kernelVersion: OFFICIAL_INDIRECT_FIRE_LOCKED_IN_EFFECT_KERNEL_VERSION,
    weaponLoadoutHash: loadout.loadoutHash,
    selectedBatchProfileKeys,
    selectedSidearmProfileKeys,
    selectedOrdinaryProfileKeys,
    selectedProfileHashes: profiles.filter((profile) => (
      selectedBatchProfileKeys.includes(profile.profileKey)
    )).map((profile) => profile.profileHash),
    sidearmUseMode: selectedBatchProfileKeys.length === 1
      ? "single_weapon"
      : "additional_sidearm",
    additionalWeaponLimitOverrideUsed: selectedBatchProfileKeys.length > 1,
    allEquippedSidearmsSelected: isDeepStrictEqual(
      selectedSidearmProfileKeys,
      OFFICIAL_SCATTER_SIDEARM_PROFILE_KEYS,
    ),
    separateBatchRequired: selectedBatchProfileKeys.length > 1,
    independentTargetSelectionAuthorized: selectedSidearmProfileKeys.length > 0,
    behavior:
      "choose_one_ordinary_weapon_and_any_equipped_sidearms_then_resolve_each_selected_profile_as_a_separate_batch",
    rulesTruth: "official_goliath_scatter_two_sidearm_selection_subset",
    trainingTruth: false,
  };
  return freezeDeep({ ...body, authorizationHash: hashStarcraftTmgContract(body) });
}

function authorizeScatterAttack(input = {}) {
  const profile = verifyProfile(input.profile);
  if (profile.profileKey !== OFFICIAL_SCATTER_MISSILES_PROFILE_KEY
    || typeof input.targetStationary !== "boolean"
    || typeof input.targetWithinLineOfSight !== "boolean"
    || typeof input.targetWithinMaximumRange !== "boolean"
    || input.targetWithinMaximumRange !== true) {
    fail("INDIRECT_LOCKED_SCATTER_CONTEXT_INVALID");
  }
  const lockedInAdditionalRateOfAttack = input.targetStationary ? 6 : 0;
  const body = {
    schema: "starcraft_tmg_official_indirect_locked_scatter_authorization_v1",
    kernelId: OFFICIAL_INDIRECT_FIRE_LOCKED_IN_EFFECT_KERNEL_ID,
    kernelVersion: OFFICIAL_INDIRECT_FIRE_LOCKED_IN_EFFECT_KERNEL_VERSION,
    profileKey: profile.profileKey,
    profileHash: profile.profileHash,
    indirectFireEffectAtomId: OFFICIAL_INDIRECT_FIRE_EFFECT_ATOM_ID,
    lockedInEffectAtomId: OFFICIAL_LOCKED_IN_EFFECT_ATOM_ID,
    targetStationary: input.targetStationary,
    targetWithinLineOfSight: input.targetWithinLineOfSight,
    targetWithinMaximumRange: true,
    lineOfSightIgnored: input.targetWithinLineOfSight === false,
    offLineOfSightEvadeEligible: input.targetWithinLineOfSight === false,
    printedRateOfAttack: 6,
    lockedInAdditionalRateOfAttack,
    effectiveRateOfAttack: 6 + lockedInAdditionalRateOfAttack,
    behavior:
      "scatter_may_ignore_line_of_sight_but_not_range_and_adds_six_roa_against_stationary_target",
    rulesTruth: "official_indirect_fire_and_locked_in_exact_scatter_subset",
    trainingTruth: false,
  };
  return freezeDeep({ ...body, authorizationHash: hashStarcraftTmgContract(body) });
}

export function createOfficialIndirectFireLockedInEffectKernelV1() {
  const descriptorBody = {
    schema: "starcraft_tmg_official_indirect_fire_locked_in_effect_kernel_descriptor_v1",
    kernelId: OFFICIAL_INDIRECT_FIRE_LOCKED_IN_EFFECT_KERNEL_ID,
    kernelVersion: OFFICIAL_INDIRECT_FIRE_LOCKED_IN_EFFECT_KERNEL_VERSION,
    effectAtomIds: [
      OFFICIAL_INDIRECT_FIRE_EFFECT_ATOM_ID,
      OFFICIAL_LOCKED_IN_EFFECT_ATOM_ID,
    ],
    supportedProfileKeys: [...OFFICIAL_SCATTER_LOADOUT_PROFILE_KEYS],
    supportedProfileHashes: OFFICIAL_SCATTER_LOADOUT_PROFILE_KEYS.map((profileKey) => (
      PROFILE_HASHES[profileKey]
    )),
    sidearmProfileKeys: [...OFFICIAL_SCATTER_SIDEARM_PROFILE_KEYS],
    exactLoadout:
      "goliath_autocannon_underbelly_and_scatter_replacing_hellfire",
    indirectFirePolicy: {
      mayIgnoreLineOfSight: true,
      mustRemainWithinRange: true,
      offLineOfSightTargetMayEvade: true,
    },
    lockedInPolicy: {
      status: "stationary",
      additionalRateOfAttack: 6,
      modifiesEffectiveNotPrintedRateOfAttack: true,
    },
    unknownProfilePolicy: "fail_closed",
    dataChangeCannotGrantRuleAuthority: true,
    trainingTruth: false,
  };
  const descriptor = freezeDeep({
    ...descriptorBody,
    kernelHash: hashStarcraftTmgContract(descriptorBody),
  });
  return freezeDeep({
    descriptor,
    authorizeSelection,
    authorizeScatterAttack,
    verifyProfile,
    verifyLoadout,
  });
}
