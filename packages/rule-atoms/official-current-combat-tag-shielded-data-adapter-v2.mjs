import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import {
  createOfficialMissionSetupBindingV1,
  verifyOfficialMissionSetupBindingV1,
} from "../source-data/official-mission-setup-binding-v1.mjs";

export const OFFICIAL_CURRENT_COMBAT_TAG_SHIELDED_DATA_ADAPTER_V2_SCHEMA =
  "starcraft_tmg_official_current_combat_tag_shielded_data_adapter_v2";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const CURRENT_SOURCE_SNAPSHOT_HASH =
  "c737db613fbba1c917348c98f00e1cb856650ae9bbbaec1093145fe0fae62a61";
const CURRENT_DATASET_HASH =
  "38f89f3a383555627d131dc11fbba53f5b6918b604d25eaa87198df00a1a8e63";
const CURRENT_GAMEPLAY_BUNDLE_HASH =
  "c99e9cda71451e2fffe366c2eaa80a3067ea5beaaa99c0552740da06f95f755b";
const FROZEN_SOURCE_SNAPSHOT_HASH =
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78";
const FROZEN_DATASET_HASH =
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a";
const FROZEN_COMBAT_PROFILE_BUNDLE_HASH =
  "c2378817452553923064f48ff6570f507870ecf32adfeeb6f966e675ad0abda3";
const FROZEN_ATTACK_PROFILE_CATALOGUE_HASH =
  "46a8e2ac804cef4993e40e53e3d4effe8c21b8f2d1eb7c96d0245d9bbac72ef1";
const FROZEN_GAMEPLAY_BUNDLE_HASH =
  "14935d15740b639e52d790b83311cf9e8fae0cde1898db6b5a9a0b3e81921bf0";
const FROZEN_RULES_SCOPE =
  "official_current_combat_profiles_plus_hold_position_standard_and_atomic_attack_profiles";
const REQUIRED_UNIT_KEYS = Object.freeze([
  "army_units:adept",
  "army_units:goliath",
  "army_units:marine",
  "army_units:stalker",
]);
const REQUIRED_ATTACK_PROFILE_KEYS = Object.freeze([
  "army_units:goliath::assault::Autocannon",
  "army_units:marine::assault::C-14 rifle",
]);

function fail(code) {
  throw new Error(code);
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

function verifyCurrentState(state, matchBinding) {
  if (!object(state)
    || !object(matchBinding)
    || !object(state.officialGameplayDataBundle)
    || !object(state.officialMissionSetupBinding)) {
    fail("COMBAT_TAG_SHIELDED_DATA_ADAPTER_V2_STATE_INVALID");
  }
  const bundle = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(bundle);
  if (bundle.gameplayDataBundleHash !== CURRENT_GAMEPLAY_BUNDLE_HASH
    || bundle.sourceSnapshotHash !== CURRENT_SOURCE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== CURRENT_DATASET_HASH
    || bundle.repositoryFallbackAllowed !== false
    || bundle.productionRoomBindingEligible !== false
    || bundle.reserveDeployDataBundle === undefined
    || !isDeepStrictEqual(bundle.dataVersions, {
      cardsVersion: "69",
      rulesVersion: "48",
      unitsVersion: "71",
    })
    || !HASH_PATTERN.test(String(matchBinding.bindingHash || ""))
    || matchBinding.dataSnapshotHash !== hashStarcraftTmgContract(bundle)) {
    fail("COMBAT_TAG_SHIELDED_DATA_ADAPTER_V2_LATEST_UNIFIED_BUNDLE_REQUIRED");
  }
  verifyOfficialMissionSetupBindingV1(state.officialMissionSetupBinding, bundle);
  const unitKeys = bundle.combatProfileBundle.profiles
    .map((profile) => profile.recordKey)
    .sort((left, right) => left.localeCompare(right));
  const attackKeys = new Set(bundle.attackProfileCatalogue.profiles
    .map((profile) => profile.profileKey));
  if (!isDeepStrictEqual(unitKeys, REQUIRED_UNIT_KEYS)
    || REQUIRED_ATTACK_PROFILE_KEYS.some((profileKey) => !attackKeys.has(profileKey))
    || !bundle.attackProfileCatalogue.unitRecordKeys
      .includes("army_units:point_defense_drone")) {
    fail("COMBAT_TAG_SHIELDED_DATA_ADAPTER_V2_PROFILE_SCOPE_INVALID");
  }
  return bundle;
}

function createFrozenBundle(currentBundle) {
  const bundle = clone(currentBundle);
  delete bundle.reserveDeployDataBundle;
  bundle.rulesScope = FROZEN_RULES_SCOPE;
  bundle.sourceSnapshotHash = FROZEN_SOURCE_SNAPSHOT_HASH;
  bundle.normalizedDatasetHash = FROZEN_DATASET_HASH;
  bundle.combatProfileBundle.sourceSnapshotHash = FROZEN_SOURCE_SNAPSHOT_HASH;
  bundle.combatProfileBundle.normalizedDatasetHash = FROZEN_DATASET_HASH;
  bundle.combatProfileBundle.bundleHash = FROZEN_COMBAT_PROFILE_BUNDLE_HASH;
  bundle.attackProfileCatalogue.sourceSnapshotHash = FROZEN_SOURCE_SNAPSHOT_HASH;
  bundle.attackProfileCatalogue.normalizedDatasetHash = FROZEN_DATASET_HASH;
  bundle.attackProfileCatalogue.catalogueHash = FROZEN_ATTACK_PROFILE_CATALOGUE_HASH;
  bundle.gameplayDataBundleHash = FROZEN_GAMEPLAY_BUNDLE_HASH;
  verifyOfficialGameplayDataBundleV1(bundle);
  if (hashStarcraftTmgContract(without(bundle, ["gameplayDataBundleHash"]))
      !== FROZEN_GAMEPLAY_BUNDLE_HASH) {
    fail("COMBAT_TAG_SHIELDED_DATA_ADAPTER_V2_FROZEN_VIEW_DRIFT");
  }
  return bundle;
}

function receiptBody(receipt) {
  return without(receipt, ["adapterReceiptHash"]);
}

function verifyReceipt(receipt) {
  if (!object(receipt)
    || receipt.schema !== OFFICIAL_CURRENT_COMBAT_TAG_SHIELDED_DATA_ADAPTER_V2_SCHEMA
    || receipt.currentSourceSnapshotHash !== CURRENT_SOURCE_SNAPSHOT_HASH
    || receipt.currentDatasetHash !== CURRENT_DATASET_HASH
    || receipt.currentGameplayDataBundleHash !== CURRENT_GAMEPLAY_BUNDLE_HASH
    || receipt.frozenSourceSnapshotHash !== FROZEN_SOURCE_SNAPSHOT_HASH
    || receipt.frozenDatasetHash !== FROZEN_DATASET_HASH
    || receipt.frozenGameplayDataBundleHash !== FROZEN_GAMEPLAY_BUNDLE_HASH
    || receipt.adapterMode !== "explicit_current_to_frozen_combat_tag_shielded_view"
    || receipt.repositoryFallbackAllowed !== false
    || receipt.silentCompatibilityAllowed !== false
    || receipt.trainingTruth !== false
    || !HASH_PATTERN.test(String(receipt.currentMissionSetupBindingHash || ""))
    || !HASH_PATTERN.test(String(receipt.frozenMissionSetupBindingHash || ""))
    || !HASH_PATTERN.test(String(receipt.currentMatchDataSnapshotHash || ""))
    || !HASH_PATTERN.test(String(receipt.frozenMatchDataSnapshotHash || ""))
    || receipt.adapterReceiptHash !== hashStarcraftTmgContract(receiptBody(receipt))) {
    fail("COMBAT_TAG_SHIELDED_DATA_ADAPTER_V2_RECEIPT_INVALID");
  }
}

export function createOfficialCurrentCombatTagShieldedFrozenViewV2(state, options = {}) {
  const currentBundle = verifyCurrentState(state, options.matchBinding);
  const frozenBundle = createFrozenBundle(currentBundle);
  const currentMissionSetupBinding = state.officialMissionSetupBinding;
  const frozenMissionSetupBinding = createOfficialMissionSetupBindingV1({
    gameplayDataBundle: frozenBundle,
    missionDraftReceiptHash: currentMissionSetupBinding.missionDraftReceiptHash,
    deploymentDraftReceiptHash: currentMissionSetupBinding.deploymentDraftReceiptHash,
    seatColorAssignment: currentMissionSetupBinding.seatColorAssignment,
  });
  const frozenState = clone(state);
  frozenState.officialGameplayDataBundle = frozenBundle;
  frozenState.officialMissionSetupBinding = frozenMissionSetupBinding;
  const frozenMatchBinding = {
    ...clone(options.matchBinding),
    dataSnapshotHash: hashStarcraftTmgContract(frozenBundle),
  };
  const body = {
    schema: OFFICIAL_CURRENT_COMBAT_TAG_SHIELDED_DATA_ADAPTER_V2_SCHEMA,
    currentSourceSnapshotHash: CURRENT_SOURCE_SNAPSHOT_HASH,
    currentDatasetHash: CURRENT_DATASET_HASH,
    currentGameplayDataBundleHash: CURRENT_GAMEPLAY_BUNDLE_HASH,
    frozenSourceSnapshotHash: FROZEN_SOURCE_SNAPSHOT_HASH,
    frozenDatasetHash: FROZEN_DATASET_HASH,
    frozenGameplayDataBundleHash: FROZEN_GAMEPLAY_BUNDLE_HASH,
    currentMissionSetupBindingHash: currentMissionSetupBinding.missionSetupBindingHash,
    frozenMissionSetupBindingHash: frozenMissionSetupBinding.missionSetupBindingHash,
    currentMatchDataSnapshotHash: options.matchBinding.dataSnapshotHash,
    frozenMatchDataSnapshotHash: frozenMatchBinding.dataSnapshotHash,
    adapterMode: "explicit_current_to_frozen_combat_tag_shielded_view",
    repositoryFallbackAllowed: false,
    silentCompatibilityAllowed: false,
    trainingTruth: false,
  };
  return {
    frozenState,
    frozenMatchBinding,
    receipt: {
      ...body,
      adapterReceiptHash: hashStarcraftTmgContract(body),
    },
  };
}

export function restoreOfficialCurrentCombatTagShieldedViewV2(
  currentState,
  frozenStateAfter,
  receipt,
) {
  verifyReceipt(receipt);
  const currentBundle = currentState?.officialGameplayDataBundle;
  const currentMissionSetupBinding = currentState?.officialMissionSetupBinding;
  const frozenBundle = frozenStateAfter?.officialGameplayDataBundle;
  const frozenMissionSetupBinding = frozenStateAfter?.officialMissionSetupBinding;
  verifyOfficialGameplayDataBundleV1(frozenBundle);
  verifyOfficialMissionSetupBindingV1(frozenMissionSetupBinding, frozenBundle);
  if (currentBundle?.gameplayDataBundleHash !== receipt.currentGameplayDataBundleHash
    || currentMissionSetupBinding?.missionSetupBindingHash
      !== receipt.currentMissionSetupBindingHash
    || frozenBundle.gameplayDataBundleHash !== receipt.frozenGameplayDataBundleHash
    || frozenMissionSetupBinding.missionSetupBindingHash
      !== receipt.frozenMissionSetupBindingHash) {
    fail("COMBAT_TAG_SHIELDED_DATA_ADAPTER_V2_RESTORE_MISMATCH");
  }
  const restored = clone(frozenStateAfter);
  restored.officialGameplayDataBundle = clone(currentBundle);
  restored.officialMissionSetupBinding = clone(currentMissionSetupBinding);
  return restored;
}
