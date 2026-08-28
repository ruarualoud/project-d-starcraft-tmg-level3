import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { getOfficialCombatProfileV1 } from
  "../source-data/official-combat-profile-bundle-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import {
  applyOfficialMarineStimpackActiveV1,
  enumerateOfficialMarineStimpackActiveV1,
  OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_ATOM_IDS,
  OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_TYPE,
  OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_ID,
  OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_VERSION,
} from "./official-marine-stimpack-active-executor-v1.mjs";
import { OFFICIAL_REPLACEMENT_WEAPON_LOADOUT_ATOM_IDS } from
  "./official-weapon-replacement-loadout-v1.mjs";

export const OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_EXECUTOR_ID =
  "authority.marine-stimpack-active-v2";
export const OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_EXECUTOR_VERSION = "2.0.0";
export const OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_NEW_ATOM_IDS = Object.freeze([]);
export const OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_ATOM_IDS,
    ...OFFICIAL_REPLACEMENT_WEAPON_LOADOUT_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));
export const OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_EXECUTOR_ATOM_IDS =
  OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_ACTION_ATOM_IDS;

const MARINE_RECORD_KEY = "army_units:marine";
const CURRENT_GAMEPLAY_BUNDLE_HASH =
  "35cd2e1a7a7cb7575f0525dbf6ff08fa0a5285b5fcf89e6b901976f532f1463b";
const EXACT_SELECTED_UPGRADES = Object.freeze(["Bayonet", "Stimpack"]);
const BAYONET_SOURCE_TEXT_HASH =
  "9b0f85969b11da20c6d837f23a06335f8572bfd798460de3083ed124cef9205a";
const STRIKE_SOURCE_TEXT_HASH =
  "b0156a37c3e3890968e8fe1f14932d8ebcc9dd9920d00c1cc7a6e27dc50a039a";

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

function actionFromCandidate(candidate) {
  return without(candidate, ["isEnabled", "disabledReason", "score", "details"]);
}

function verifyBayonetLoadout(state, pieceId, matchBinding) {
  const gameplay = state?.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplay);
  if (!object(matchBinding)
    || hashStarcraftTmgContract(gameplay) !== matchBinding.dataSnapshotHash
    || gameplay.gameplayDataBundleHash !== CURRENT_GAMEPLAY_BUNDLE_HASH
    || gameplay.repositoryFallbackAllowed !== false) {
    fail("STIMPACK_V2_LATEST_OFFICIAL_DATA_REQUIRED");
  }
  const piece = state.pieces?.find((entry) => entry.id === pieceId);
  if (!piece
    || piece.officialUnitRecordKey !== MARINE_RECORD_KEY
    || !isDeepStrictEqual(piece.selectedUpgradeNames || [], EXACT_SELECTED_UPGRADES)) {
    fail("STIMPACK_V2_EXACT_BAYONET_LOADOUT_REQUIRED");
  }
  const profile = getOfficialCombatProfileV1(
    gameplay.combatProfileBundle,
    MARINE_RECORD_KEY,
  );
  const bayonet = profile.combatWeapons.find((weapon) => weapon.weaponName === "Bayonet");
  const strike = profile.combatWeapons.find((weapon) => weapon.weaponName === "Strike");
  if (profile.combatWeapons.length !== 2
    || bayonet?.linkedTo !== "Strike"
    || bayonet?.rateOfAttack !== 2
    || bayonet?.hitThreshold !== 5
    || bayonet?.damage !== 1
    || bayonet?.sourceTextHash !== BAYONET_SOURCE_TEXT_HASH
    || strike?.linkedTo !== "-"
    || strike?.rateOfAttack !== 1
    || strike?.hitThreshold !== 5
    || strike?.damage !== 1
    || strike?.sourceTextHash !== STRIKE_SOURCE_TEXT_HASH) {
    fail("STIMPACK_V2_MARINE_CLOSE_COMBAT_PROFILE_DRIFT");
  }
  const body = {
    schema: "starcraft_tmg_official_marine_bayonet_loadout_binding_v1",
    gameplayDataBundleHash: gameplay.gameplayDataBundleHash,
    combatProfileBundleHash: gameplay.combatProfileBundle.bundleHash,
    pieceId,
    selectedUpgradeNames: [...EXACT_SELECTED_UPGRADES],
    replacementWeaponName: "Bayonet",
    replacedWeaponName: "Strike",
    bayonetSourceTextHash: BAYONET_SOURCE_TEXT_HASH,
    strikeSourceTextHash: STRIKE_SOURCE_TEXT_HASH,
    rulesTruth: "official_bayonet_replaces_strike_while_stimpack_remains_selected",
    trainingTruth: false,
  };
  return { ...body, loadoutBindingHash: hashStarcraftTmgContract(body) };
}

function toV1State(state, pieceId) {
  const result = clone(state);
  const piece = result.pieces.find((entry) => entry.id === pieceId);
  if (!piece) fail("STIMPACK_V2_SOURCE_MISSING");
  piece.selectedUpgradeNames = ["Stimpack"];
  return result;
}

function toV1Action(action) {
  return {
    ...without(clone(action), [
      "selectedUpgradeNames",
      "combatWeaponLoadoutHash",
    ]),
    ruleAtomIds: [...OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_ATOM_IDS],
    executorId: OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_VERSION,
  };
}

function toV2Candidate(candidate, loadout) {
  return {
    ...clone(candidate),
    selectedUpgradeNames: [...EXACT_SELECTED_UPGRADES],
    combatWeaponLoadoutHash: loadout.loadoutBindingHash,
    ruleAtomIds: [...OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_ACTION_ATOM_IDS],
    executorId: OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_EXECUTOR_VERSION,
    details: {
      ...(candidate.details || {}),
      selectedUpgradeNames: [...EXACT_SELECTED_UPGRADES],
      replacementWeaponName: "Bayonet",
      replacedWeaponName: "Strike",
      closeCombatPrecisionConsumerExecutable: true,
      compatibilityMode: "explicit_v2_loadout_preservation",
      delegatedExecutorId: OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_ID,
      delegatedExecutorVersion: OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_VERSION,
      trainingTruth: false,
    },
  };
}

export function enumerateOfficialMarineStimpackActiveV2(state, options = {}) {
  const sideKey = String(options.sideKey || state?.activeSideKey || "").trim();
  const rows = [];
  const diagnostics = [];
  for (const piece of (state?.pieces || []).filter((entry) => (
    entry.sideKey === sideKey
      && entry.officialUnitRecordKey === MARINE_RECORD_KEY
      && isDeepStrictEqual(entry.selectedUpgradeNames || [], EXACT_SELECTED_UPGRADES)
  ))) {
    try {
      const loadout = verifyBayonetLoadout(state, piece.id, options.matchBinding);
      const delegated = enumerateOfficialMarineStimpackActiveV1(
        toV1State(state, piece.id),
        {
          ...options,
          sideKey,
          throwOnError: true,
        },
      );
      rows.push(...delegated.map((candidate) => toV2Candidate(candidate, loadout)));
    } catch (error) {
      diagnostics.push(error);
    }
  }
  if (rows.length === 0 && options.throwOnError === true && diagnostics.length > 0) {
    throw diagnostics[0];
  }
  return rows.sort((left, right) => left.abilityWindow.localeCompare(right.abilityWindow));
}

export function applyOfficialMarineStimpackActiveV2(
  stateInput,
  actionInput,
  options = {},
) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_EXECUTOR_VERSION) {
    fail("STIMPACK_V2_ACTION_INVALID");
  }
  const expected = enumerateOfficialMarineStimpackActiveV2(stateInput, {
    sideKey: actionInput.sideKey,
    matchBinding: options.matchBinding,
    throwOnError: true,
  }).map(actionFromCandidate).find((candidate) => isDeepStrictEqual(candidate, actionInput));
  if (!expected) fail("STIMPACK_V2_ACTION_STALE");
  const loadout = verifyBayonetLoadout(
    stateInput,
    actionInput.pieceId,
    options.matchBinding,
  );
  if (actionInput.combatWeaponLoadoutHash !== loadout.loadoutBindingHash) {
    fail("STIMPACK_V2_LOADOUT_BINDING_STALE");
  }
  const delegated = applyOfficialMarineStimpackActiveV1(
    toV1State(stateInput, actionInput.pieceId),
    toV1Action(actionInput),
    options,
  );
  const result = clone(delegated);
  const piece = result.state.pieces.find((entry) => entry.id === actionInput.pieceId);
  piece.selectedUpgradeNames = [...EXACT_SELECTED_UPGRADES];
  result.schemaVersion = "starcraft_tmg_official_marine_stimpack_active_transition_v2";
  result.executorId = OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_EXECUTOR_ID;
  result.executorVersion = OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_EXECUTOR_VERSION;
  result.action = clone(actionInput);
  result.bayonetLoadoutBinding = clone(loadout);
  result.events = (result.events || []).map((event) => ({
    ...event,
    selectedUpgradeNamesPreserved: [...EXACT_SELECTED_UPGRADES],
    combatWeaponLoadoutHash: loadout.loadoutBindingHash,
    closeCombatPrecisionConsumerExecutable: true,
  }));
  const lastLog = result.state.log?.at(-1);
  if (lastLog) {
    lastLog.action = clone(actionInput);
    lastLog.events = clone(result.events);
  }
  result.rulesTruth =
    "official_stimpack_active_with_explicit_bayonet_loadout_preservation";
  result.trainingTruth = false;
  return result;
}
