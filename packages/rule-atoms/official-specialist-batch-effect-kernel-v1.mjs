import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const OFFICIAL_SPECIALIST_BATCH_EFFECT_KERNEL_ID =
  "authority.specialist-batch-effect-kernel-v1";
export const OFFICIAL_SPECIALIST_BATCH_EFFECT_KERNEL_VERSION = "1.0.0";
export const OFFICIAL_SPECIALIST_EFFECT_ATOM_ID = "attack-effect:specialist-v1";

const MARINE_RECORD_KEY = "army_units:marine";
const AGG12_PROFILE_KEY = "army_units:marine::assault::AGG-12";
const AGG12_PROFILE_HASH_V1 =
  "408ec53bd4914dab92dc7816e0f21109187e871fec61229f6251745db74db5be";
const AGG12_PROFILE_HASH_V2 =
  "ab0ac32f359ecccf3ae1110c663f475bcff182564d9c138f7c23863bab8ad282";

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

function verifyAgg12Profile(profile) {
  if (!object(profile)
    || profile.schema !== "starcraft_tmg_official_attack_profile_v1"
    || profile.profileKey !== AGG12_PROFILE_KEY
    || profile.profileHash !== AGG12_PROFILE_HASH_V1
    || profile.profileHash !== hashStarcraftTmgContract(without(profile, ["profileHash"]))
    || profile.recordKey !== MARINE_RECORD_KEY
    || profile.phase !== "assault"
    || profile.weaponName !== "AGG-12"
    || profile.rateOfAttack !== 2
    || profile.range?.normalRangeInches !== 12
    || profile.hitThreshold !== 3
    || profile.damage !== 1
    || !Array.isArray(profile.effects)) {
    fail("SPECIALIST_BATCH_PROFILE_INVALID");
  }
  const specialist = profile.effects.filter((effect) => (
    effect.effectAtomId === OFFICIAL_SPECIALIST_EFFECT_ATOM_ID
  ));
  if (specialist.length !== 1
    || specialist[0].sourceKind !== "weapon_keyword"
    || !object(specialist[0].parameters)
    || Object.keys(specialist[0].parameters).length !== 0) {
    fail("SPECIALIST_BATCH_EFFECT_INVALID");
  }
  return profile;
}

function verifyLoadout(loadout) {
  if (!object(loadout)
    || loadout.schemaVersion !== "starcraft_tmg_official_specialist_loadout_plan_v1"
    || loadout.recordKey !== MARINE_RECORD_KEY
    || loadout.currentModels !== 6
    || loadout.currentSupply !== 1
    || loadout.specialistLoadoutHash
      !== hashStarcraftTmgContract(without(loadout, ["specialistLoadoutHash"]))
    || loadout.repositoryFallbackAllowed !== false
    || loadout.trainingTruth !== false
    || !Array.isArray(loadout.assignments)
    || !Array.isArray(loadout.modelLoadouts)) {
    fail("SPECIALIST_BATCH_LOADOUT_INVALID");
  }
  const assignments = loadout.assignments.filter((entry) => entry.weaponName === "AGG-12");
  if (loadout.assignments.length !== 1
    || assignments.length !== 1
    || assignments[0].profileKey !== AGG12_PROFILE_KEY
    || assignments[0].profileHash !== AGG12_PROFILE_HASH_V2
    || assignments[0].replacement !== true
    || assignments[0].originalWeaponRetained !== false) {
    fail("SPECIALIST_BATCH_ASSIGNMENT_INVALID");
  }
  return assignments[0];
}

function authorizeSpecialistBatch(input = {}) {
  const profile = verifyAgg12Profile(input.profile);
  const assignment = verifyLoadout(input.specialistLoadout);
  const contributingModelIds = [...new Set((input.contributingModelIds || []).map((value) => (
    String(value || "").trim()
  )))].filter(Boolean).sort((left, right) => left.localeCompare(right));
  if (!isDeepStrictEqual(contributingModelIds, [assignment.nominatedModelId])) {
    fail("SPECIALIST_BATCH_CARRIER_MISMATCH");
  }
  const modelLoadout = input.specialistLoadout.modelLoadouts.find((entry) => (
    entry.modelId === assignment.nominatedModelId
  ));
  if (!modelLoadout || !isDeepStrictEqual(
    modelLoadout.assaultWeapons.map((weapon) => ({
      weaponName: weapon.weaponName,
      profileKey: weapon.profileKey,
      profileHash: weapon.profileHash,
    })),
    [{
      weaponName: "AGG-12",
      profileKey: AGG12_PROFILE_KEY,
      profileHash: AGG12_PROFILE_HASH_V2,
    }],
  )) {
    fail("SPECIALIST_BATCH_MODEL_LOADOUT_MISMATCH");
  }
  const body = {
    schema: "starcraft_tmg_official_specialist_batch_authorization_v1",
    kernelId: OFFICIAL_SPECIALIST_BATCH_EFFECT_KERNEL_ID,
    kernelVersion: OFFICIAL_SPECIALIST_BATCH_EFFECT_KERNEL_VERSION,
    effectAtomId: OFFICIAL_SPECIALIST_EFFECT_ATOM_ID,
    profileKey: profile.profileKey,
    profileHash: profile.profileHash,
    profileV2Hash: assignment.profileHash,
    specialistLoadoutHash: input.specialistLoadout.specialistLoadoutHash,
    contributingModelIds,
    behavior: "nominated_model_resolves_this_weapon_as_a_separate_attack_batch",
    sidearmExecutionAuthorized: false,
    indirectFireExecutionAuthorized: false,
    rulesTruth: "official_specialist_separate_batch_exact_agg12_subset",
    trainingTruth: false,
  };
  return freezeDeep({
    ...body,
    authorizationHash: hashStarcraftTmgContract(body),
  });
}

export function createOfficialSpecialistBatchEffectKernelV1() {
  const descriptorBody = {
    schema: "starcraft_tmg_official_specialist_batch_effect_kernel_descriptor_v1",
    kernelId: OFFICIAL_SPECIALIST_BATCH_EFFECT_KERNEL_ID,
    kernelVersion: OFFICIAL_SPECIALIST_BATCH_EFFECT_KERNEL_VERSION,
    effectAtomId: OFFICIAL_SPECIALIST_EFFECT_ATOM_ID,
    supportedProfileKeys: [AGG12_PROFILE_KEY],
    supportedProfileHashes: [AGG12_PROFILE_HASH_V1],
    modelScope: "one_nominated_model_one_separate_batch",
    lifecycle: [
      "verify_sealed_model_loadout",
      "authorize_separate_batch",
      "fully_resolve_batch",
      "continue_remaining_profile_batch",
    ],
    sidearmExecutionAuthorized: false,
    indirectFireExecutionAuthorized: false,
    unknownProfilePolicy: "fail_closed",
    dataChangeCannotGrantRuleAuthority: true,
    trainingTruth: false,
  };
  const descriptor = freezeDeep({
    ...descriptorBody,
    kernelHash: hashStarcraftTmgContract(descriptorBody),
  });
  return freezeDeep({ descriptor, authorize: authorizeSpecialistBatch });
}
