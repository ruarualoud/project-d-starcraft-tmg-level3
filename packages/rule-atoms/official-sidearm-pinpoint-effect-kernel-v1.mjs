import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const OFFICIAL_SIDEARM_PINPOINT_EFFECT_KERNEL_ID =
  "authority.sidearm-pinpoint-effect-kernel-v1";
export const OFFICIAL_SIDEARM_PINPOINT_EFFECT_KERNEL_VERSION = "1.0.0";
export const OFFICIAL_SIDEARM_EFFECT_ATOM_ID = "attack-effect:sidearm-v1";
export const OFFICIAL_PINPOINT_EFFECT_ATOM_ID = "attack-effect:pinpoint-v1";

const GOLIATH_RECORD_KEY = "army_units:goliath";
const AUTOCANNON_PROFILE_KEY = "army_units:goliath::assault::Autocannon";
const UNDERBELLY_PROFILE_KEY =
  "army_units:goliath::assault::Underbelly Machine Gun";
const HAYWIRE_PROFILE_KEY = "army_units:goliath::assault::Haywire Missiles";
const PROFILE_HASHES = Object.freeze({
  [AUTOCANNON_PROFILE_KEY]:
    "3be2ef5234bccb909d9119fc83130718770de31a5f7cf0348e9a573512ea8ce3",
  [UNDERBELLY_PROFILE_KEY]:
    "c7574f07ba693d5c032d05f4cebd67cd665c62f390ce8557582bada9690b745e",
  [HAYWIRE_PROFILE_KEY]:
    "af5701e1dfac62a58972ede948f7ac9bd7001214ba4ad1caf5a69b4b9b1a94e4",
});
const PROFILE_KEYS = Object.freeze(Object.keys(PROFILE_HASHES).sort((left, right) => (
  left.localeCompare(right)
)));
const SIDEARM_PROFILE_KEYS = Object.freeze([
  HAYWIRE_PROFILE_KEY,
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

function effect(profile, effectAtomId) {
  return profile.effects.filter((entry) => entry.effectAtomId === effectAtomId);
}

function verifyParameterlessKeyword(profile, effectAtomId, required) {
  const matches = effect(profile, effectAtomId);
  if (matches.length !== (required ? 1 : 0)) {
    fail("SIDEARM_PINPOINT_EFFECT_BINDING_INVALID", `${profile.profileKey}:${effectAtomId}`);
  }
  if (required && (matches[0].sourceKind !== "weapon_keyword"
    || !object(matches[0].parameters)
    || Object.keys(matches[0].parameters).length !== 0)) {
    fail("SIDEARM_PINPOINT_EFFECT_PARAMETERS_INVALID", `${profile.profileKey}:${effectAtomId}`);
  }
}

function verifyProfile(profile) {
  if (!object(profile)
    || profile.schema !== "starcraft_tmg_official_attack_profile_v1"
    || profile.recordKey !== GOLIATH_RECORD_KEY
    || profile.phase !== "assault"
    || !PROFILE_KEYS.includes(profile.profileKey)
    || profile.profileHash !== PROFILE_HASHES[profile.profileKey]
    || profile.profileHash !== hashStarcraftTmgContract(without(profile, ["profileHash"]))
    || !Array.isArray(profile.effects)) {
    fail("SIDEARM_PINPOINT_PROFILE_INVALID", String(profile?.profileKey || ""));
  }
  const isSidearm = SIDEARM_PROFILE_KEYS.includes(profile.profileKey);
  verifyParameterlessKeyword(profile, OFFICIAL_SIDEARM_EFFECT_ATOM_ID, isSidearm);
  verifyParameterlessKeyword(
    profile,
    OFFICIAL_PINPOINT_EFFECT_ATOM_ID,
    profile.profileKey === UNDERBELLY_PROFILE_KEY,
  );
  if (profile.profileKey === AUTOCANNON_PROFILE_KEY
    && (profile.weaponName !== "Autocannon"
      || profile.linkedTo !== "-"
      || profile.range?.normalRangeInches !== 12
      || profile.rateOfAttack !== 9
      || profile.hitThreshold !== 4
      || profile.damage !== 1)) {
    fail("SIDEARM_PINPOINT_PROFILE_SHAPE_INVALID", profile.profileKey);
  }
  if (profile.profileKey === UNDERBELLY_PROFILE_KEY
    && (profile.weaponName !== "Underbelly Machine Gun"
      || profile.linkedTo !== "-"
      || profile.range?.normalRangeInches !== 8
      || profile.rateOfAttack !== 6
      || profile.hitThreshold !== 3
      || profile.damage !== 1)) {
    fail("SIDEARM_PINPOINT_PROFILE_SHAPE_INVALID", profile.profileKey);
  }
  if (profile.profileKey === HAYWIRE_PROFILE_KEY
    && (profile.weaponName !== "Haywire Missiles"
      || profile.linkedTo !== "Hellfire Missiles"
      || profile.range?.normalRangeInches !== 12
      || profile.rateOfAttack !== 3
      || profile.hitThreshold !== 3
      || profile.damage !== 1)) {
    fail("SIDEARM_PINPOINT_PROFILE_SHAPE_INVALID", profile.profileKey);
  }
  return profile;
}

function verifyLoadout(loadout) {
  if (!object(loadout)
    || loadout.schema !== "starcraft_tmg_official_replacement_weapon_loadout_v1"
    || loadout.recordKey !== GOLIATH_RECORD_KEY
    || loadout.phase !== "assault"
    || loadout.loadoutHash !== hashStarcraftTmgContract(without(loadout, ["loadoutHash"]))
    || !isDeepStrictEqual(loadout.selectedWeaponUpgradeNames, ["Haywire Missiles"])
    || !isDeepStrictEqual(loadout.availableProfileKeys, PROFILE_KEYS)
    || loadout.replacements?.length !== 1
    || loadout.replacements[0].replacementWeaponName !== "Haywire Missiles"
    || loadout.replacements[0].originalWeaponName !== "Hellfire Missiles"
    || loadout.trainingTruth !== false) {
    fail("SIDEARM_PINPOINT_LOADOUT_INVALID");
  }
  return loadout;
}

function normalizedSelection(values) {
  if (!Array.isArray(values)) fail("SIDEARM_PINPOINT_SELECTION_REQUIRED");
  const result = values.map((value) => String(value || "").trim())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
  if (result.length === 0
    || new Set(result).size !== result.length
    || result.some((profileKey) => !PROFILE_KEYS.includes(profileKey))) {
    fail("SIDEARM_PINPOINT_SELECTION_INVALID");
  }
  return result;
}

function authorizeSelection(input = {}) {
  const profiles = (input.profiles || []).map(verifyProfile)
    .sort((left, right) => left.profileKey.localeCompare(right.profileKey));
  if (!isDeepStrictEqual(profiles.map((profile) => profile.profileKey), PROFILE_KEYS)) {
    fail("SIDEARM_PINPOINT_PROFILE_DENOMINATOR_INVALID");
  }
  const loadout = verifyLoadout(input.weaponLoadout);
  const selectedBatchProfileKeys = normalizedSelection(input.selectedBatchProfileKeys);
  const selectedProfiles = profiles.filter((profile) => (
    selectedBatchProfileKeys.includes(profile.profileKey)
  ));
  const selectedSidearmProfileKeys = selectedBatchProfileKeys.filter((profileKey) => (
    SIDEARM_PROFILE_KEYS.includes(profileKey)
  ));
  const selectedOrdinaryProfileKeys = selectedBatchProfileKeys.filter((profileKey) => (
    !SIDEARM_PROFILE_KEYS.includes(profileKey)
  ));
  if (selectedOrdinaryProfileKeys.length > 1
    || (selectedBatchProfileKeys.length > 1 && selectedSidearmProfileKeys.length === 0)) {
    fail("SIDEARM_PINPOINT_ONE_WEAPON_LIMIT_NOT_OVERRIDDEN");
  }
  const sidearmUseMode = selectedBatchProfileKeys.length === 1
    ? "single_weapon"
    : "additional_sidearm";
  const body = {
    schema: "starcraft_tmg_official_sidearm_profile_selection_authorization_v1",
    kernelId: OFFICIAL_SIDEARM_PINPOINT_EFFECT_KERNEL_ID,
    kernelVersion: OFFICIAL_SIDEARM_PINPOINT_EFFECT_KERNEL_VERSION,
    effectAtomId: OFFICIAL_SIDEARM_EFFECT_ATOM_ID,
    weaponLoadoutHash: loadout.loadoutHash,
    selectedBatchProfileKeys,
    selectedSidearmProfileKeys,
    selectedOrdinaryProfileKeys,
    selectedProfileHashes: selectedProfiles.map((profile) => profile.profileHash),
    sidearmUseMode,
    additionalWeaponLimitOverrideUsed: selectedBatchProfileKeys.length > 1,
    allEquippedSidearmsSelected: isDeepStrictEqual(
      selectedSidearmProfileKeys,
      SIDEARM_PROFILE_KEYS,
    ),
    separateBatchRequired: selectedBatchProfileKeys.length > 1,
    independentTargetSelectionAuthorized: selectedSidearmProfileKeys.length > 0,
    behavior:
      "choose_one_ordinary_weapon_and_any_equipped_sidearms_then_resolve_each_selected_profile_as_a_separate_batch",
    rulesTruth: "official_goliath_haywire_two_sidearm_selection_subset",
    trainingTruth: false,
  };
  return freezeDeep({
    ...body,
    authorizationHash: hashStarcraftTmgContract(body),
  });
}

function authorizePinpointTarget(input = {}) {
  const profile = verifyProfile(input.profile);
  const attackerEngaged = input.attackerEngaged === true;
  const targetEngaged = input.targetEngaged === true;
  const standardTargetEligible = input.standardTargetEligible === true;
  if (profile.profileKey !== UNDERBELLY_PROFILE_KEY
    || attackerEngaged
    || !targetEngaged
    || standardTargetEligible) {
    fail("SIDEARM_PINPOINT_TARGET_OVERRIDE_INVALID");
  }
  const body = {
    schema: "starcraft_tmg_official_pinpoint_target_authorization_v1",
    kernelId: OFFICIAL_SIDEARM_PINPOINT_EFFECT_KERNEL_ID,
    kernelVersion: OFFICIAL_SIDEARM_PINPOINT_EFFECT_KERNEL_VERSION,
    effectAtomId: OFFICIAL_PINPOINT_EFFECT_ATOM_ID,
    profileKey: profile.profileKey,
    profileHash: profile.profileHash,
    attackerEngaged,
    targetEngaged,
    standardTargetEligible,
    overrideApplied: true,
    behavior: "unengaged_attacker_may_target_engaged_enemy_with_this_weapon",
    rulesTruth: "official_pinpoint_engaged_enemy_target_override",
    trainingTruth: false,
  };
  return freezeDeep({
    ...body,
    authorizationHash: hashStarcraftTmgContract(body),
  });
}

export function createOfficialSidearmPinpointEffectKernelV1() {
  const descriptorBody = {
    schema: "starcraft_tmg_official_sidearm_pinpoint_effect_kernel_descriptor_v1",
    kernelId: OFFICIAL_SIDEARM_PINPOINT_EFFECT_KERNEL_ID,
    kernelVersion: OFFICIAL_SIDEARM_PINPOINT_EFFECT_KERNEL_VERSION,
    effectAtomIds: [
      OFFICIAL_PINPOINT_EFFECT_ATOM_ID,
      OFFICIAL_SIDEARM_EFFECT_ATOM_ID,
    ],
    supportedProfileKeys: [...PROFILE_KEYS],
    supportedProfileHashes: PROFILE_KEYS.map((profileKey) => PROFILE_HASHES[profileKey]),
    sidearmProfileKeys: [...SIDEARM_PROFILE_KEYS],
    pinpointProfileKeys: [UNDERBELLY_PROFILE_KEY],
    exactLoadout: "goliath_autocannon_underbelly_and_haywire_replacing_hellfire",
    lifecycle: [
      "select_nonempty_weapon_profile_subset",
      "apply_sidearm_one_weapon_limit_override",
      "declare_and_resolve_each_selected_profile_as_a_separate_batch",
      "apply_pinpoint_only_to_the_underbelly_engaged_enemy_target",
      "complete_activation_after_the_last_declared_batch",
    ],
    indirectFireExecutionAuthorized: false,
    lockedInExecutionAuthorized: false,
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
    authorizePinpointTarget,
  });
}

export const OFFICIAL_SIDEARM_PINPOINT_PROFILE_KEYS = PROFILE_KEYS;
export const OFFICIAL_SIDEARM_PROFILE_KEYS = SIDEARM_PROFILE_KEYS;
