import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialAttackProfileCatalogueV1 } from
  "../source-data/official-attack-profile-catalogue-v1.mjs";

export const OFFICIAL_REPLACEMENT_WEAPON_LOADOUT_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-5-2-replacement:91b9f418d86b",
  "rule-atom:singleton:core-5-2-upgrade:191e2715a36e",
  "rule-atom:singleton:core-9-1-7-replacement-weapon-effect:cfcd72d74c46",
  "rule-atom:singleton:core-9-1-7-unit-wide-upgrade-effect:3ecc0ca27ffc",
]);

const PHASES = new Set(["assault", "combat"]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredText(value, code) {
  const result = String(value || "").trim();
  if (!result) fail(code);
  return result;
}

function uniqueTexts(value, duplicateCode, requiredCode) {
  if (!Array.isArray(value)) fail(requiredCode);
  const normalized = value.map((entry) => requiredText(entry, requiredCode));
  if (new Set(normalized).size !== normalized.length) fail(duplicateCode);
  return normalized.sort((left, right) => left.localeCompare(right));
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function receiptBody(receipt) {
  return without(receipt, ["loadoutHash"]);
}

export function createOfficialReplacementWeaponLoadoutV1(input = {}) {
  const catalogue = input.catalogue;
  verifyOfficialAttackProfileCatalogueV1(catalogue);
  const recordKey = requiredText(input.recordKey, "WEAPON_LOADOUT_RECORD_KEY_REQUIRED");
  const phase = requiredText(input.phase, "WEAPON_LOADOUT_PHASE_REQUIRED");
  if (!PHASES.has(phase)) fail("WEAPON_LOADOUT_PHASE_UNSUPPORTED", phase);
  const selectedWeaponUpgradeNames = uniqueTexts(
    input.selectedWeaponUpgradeNames,
    "WEAPON_LOADOUT_SELECTED_UPGRADE_DUPLICATE",
    "WEAPON_LOADOUT_SELECTED_UPGRADES_REQUIRED",
  );
  const modelIds = uniqueTexts(
    input.modelIds,
    "WEAPON_LOADOUT_MODEL_DUPLICATE",
    "WEAPON_LOADOUT_MODELS_REQUIRED",
  );
  if (modelIds.length === 0) fail("WEAPON_LOADOUT_MODELS_REQUIRED");

  const phaseProfiles = catalogue.profiles.filter((profile) => (
    profile.recordKey === recordKey && profile.phase === phase
  ));
  if (phaseProfiles.length === 0) fail("WEAPON_LOADOUT_PROFILE_SCOPE_UNKNOWN", recordKey);
  const baseProfiles = phaseProfiles.filter((profile) => profile.linkedTo === "-");
  const replacementProfiles = phaseProfiles.filter((profile) => (
    profile.linkedTo && profile.linkedTo !== "-"
  ));
  const selectedProfiles = selectedWeaponUpgradeNames.map((weaponName) => {
    const matches = replacementProfiles.filter((profile) => profile.weaponName === weaponName);
    if (matches.length !== 1) fail("WEAPON_LOADOUT_SELECTED_UPGRADE_UNKNOWN", weaponName);
    return matches[0];
  });
  const replacedWeaponNames = selectedProfiles.map((profile) => profile.linkedTo);
  if (new Set(replacedWeaponNames).size !== replacedWeaponNames.length) {
    fail("WEAPON_LOADOUT_REPLACEMENT_CONFLICT");
  }
  for (const weaponName of replacedWeaponNames) {
    if (baseProfiles.filter((profile) => profile.weaponName === weaponName).length !== 1) {
      fail("WEAPON_LOADOUT_REPLACED_WEAPON_UNKNOWN", weaponName);
    }
  }
  const activeProfiles = [
    ...baseProfiles.filter((profile) => !replacedWeaponNames.includes(profile.weaponName)),
    ...selectedProfiles,
  ].sort((left, right) => left.profileKey.localeCompare(right.profileKey));
  const replacements = selectedProfiles.map((profile) => ({
    replacementWeaponName: profile.weaponName,
    originalWeaponName: profile.linkedTo,
    appliedToModelIds: [...modelIds],
  })).sort((left, right) => left.replacementWeaponName.localeCompare(right.replacementWeaponName));
  const body = {
    schema: "starcraft_tmg_official_replacement_weapon_loadout_v1",
    attackProfileCatalogueHash: catalogue.catalogueHash,
    sourceSnapshotHash: catalogue.sourceSnapshotHash,
    normalizedDatasetHash: catalogue.normalizedDatasetHash,
    recordKey,
    phase,
    selectedWeaponUpgradeNames,
    modelIds,
    availableProfileKeys: activeProfiles.map((profile) => profile.profileKey),
    availableWeaponNames: activeProfiles
      .map((profile) => profile.weaponName)
      .sort((left, right) => left.localeCompare(right)),
    replacements,
    ruleAtomIds: [...OFFICIAL_REPLACEMENT_WEAPON_LOADOUT_ATOM_IDS],
    rulesTruth: "official_selected_replacement_weapon_loadout",
    trainingTruth: false,
  };
  return freezeDeep({ ...body, loadoutHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialReplacementWeaponLoadoutV1(input = {}) {
  const catalogue = input.catalogue;
  verifyOfficialAttackProfileCatalogueV1(catalogue);
  const receipt = input.receipt;
  if (!object(receipt)
    || receipt.schema !== "starcraft_tmg_official_replacement_weapon_loadout_v1"
    || receipt.loadoutHash !== hashStarcraftTmgContract(receiptBody(receipt))) {
    fail("WEAPON_LOADOUT_RECEIPT_HASH_MISMATCH");
  }
  const expected = createOfficialReplacementWeaponLoadoutV1({
    catalogue,
    recordKey: receipt.recordKey,
    phase: receipt.phase,
    selectedWeaponUpgradeNames: receipt.selectedWeaponUpgradeNames,
    modelIds: receipt.modelIds,
  });
  if (!isDeepStrictEqual(receipt, expected)) fail("WEAPON_LOADOUT_RECEIPT_CONTENT_MISMATCH");
  return true;
}
