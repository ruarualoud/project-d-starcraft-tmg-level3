import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import {
  createOfficialMissionSetupBindingV1,
  verifyOfficialMissionSetupBindingV1,
} from "../source-data/official-mission-setup-binding-v1.mjs";

export const OFFICIAL_CURRENT_LIFE_SUPPORT_DATA_ADAPTER_V2_SCHEMA =
  "starcraft_tmg_official_current_life_support_data_adapter_v2";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const CURRENT_SOURCE_SNAPSHOT_HASH =
  "c737db613fbba1c917348c98f00e1cb856650ae9bbbaec1093145fe0fae62a61";
const CURRENT_DATASET_HASH =
  "38f89f3a383555627d131dc11fbba53f5b6918b604d25eaa87198df00a1a8e63";
const CURRENT_GAMEPLAY_BUNDLE_HASH =
  "f530568fbb6118bc2921fe13d807dbe8bb095e42efb5faf33d8f3d9806177459";
const FROZEN_SOURCE_SNAPSHOT_HASH =
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78";
const FROZEN_DATASET_HASH =
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a";
const FROZEN_COMBAT_PROFILE_BUNDLE_HASH =
  "a44c28a3b20fc451c7a2f2ec202dc546a633ca21b48126cdc9f5b0bc9564e378";
const FROZEN_CLEANUP_CARD_BUNDLE_HASH =
  "484302fb13e83927186c8d2e5db84ad7f2684c1980a54011bc1630eaed981798";
const FROZEN_GAMEPLAY_BUNDLE_HASH =
  "35cd2e1a7a7cb7575f0525dbf6ff08fa0a5285b5fcf89e6b901976f532f1463b";
const FROZEN_RULES_SCOPE =
  "official_current_combat_profiles_hold_position_and_cleanup_cards";

const LOADOUT_PROJECTIONS = Object.freeze(new Map([
  ["Medpack", Object.freeze(["Life Support"])],
  ["Life Support", Object.freeze(["Life Support"])],
  ["Medpack|Stabilizer Medpacks",
    Object.freeze(["Life Support", "Stabilizer Medpacks"])],
  ["Life Support|Stabilizer Medpacks",
    Object.freeze(["Life Support", "Stabilizer Medpacks"])],
]));

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
    fail("LIFE_SUPPORT_DATA_ADAPTER_V2_STATE_INVALID");
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
    fail("LIFE_SUPPORT_DATA_ADAPTER_V2_LATEST_UNIFIED_BUNDLE_REQUIRED");
  }
  verifyOfficialMissionSetupBindingV1(state.officialMissionSetupBinding, bundle);
  const unitKeys = bundle.combatProfileBundle.profiles
    .map((profile) => profile.recordKey)
    .sort((left, right) => left.localeCompare(right));
  const cardKeys = bundle.cleanupCardBundle?.profiles
    ?.map((profile) => profile.recordKey)
    .sort((left, right) => left.localeCompare(right));
  if (!isDeepStrictEqual(unitKeys, ["army_units:marine", "army_units:medic"])
    || !isDeepStrictEqual(cardKeys, [
      "tactical_cards:academy",
      "tactical_cards:terran_armed_forces",
    ])) {
    fail("LIFE_SUPPORT_DATA_ADAPTER_V2_PROFILE_SCOPE_INVALID");
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
  bundle.cleanupCardBundle.sourceSnapshotHash = FROZEN_SOURCE_SNAPSHOT_HASH;
  bundle.cleanupCardBundle.normalizedDatasetHash = FROZEN_DATASET_HASH;
  bundle.cleanupCardBundle.cleanupCardBundleHash = FROZEN_CLEANUP_CARD_BUNDLE_HASH;
  bundle.gameplayDataBundleHash = FROZEN_GAMEPLAY_BUNDLE_HASH;
  verifyOfficialGameplayDataBundleV1(bundle);
  if (hashStarcraftTmgContract(without(bundle, ["gameplayDataBundleHash"]))
      !== FROZEN_GAMEPLAY_BUNDLE_HASH) {
    fail("LIFE_SUPPORT_DATA_ADAPTER_V2_FROZEN_VIEW_DRIFT");
  }
  return bundle;
}

function medicLoadoutRows(state) {
  return (state.pieces || []).filter((piece) => (
    piece?.officialUnitRecordKey === "army_units:medic"
  )).map((piece) => ({
    pieceId: String(piece.id || ""),
    selectedUpgradeNames: [...(piece.selectedUpgradeNames || [])]
      .sort((left, right) => left.localeCompare(right)),
  })).sort((left, right) => left.pieceId.localeCompare(right.pieceId));
}

function stationaryStatusRows(state) {
  return (state.pieces || []).filter((piece) => (
    isDeepStrictEqual(piece?.statuses, ["stationary"])
  )).map((piece) => ({
    pieceId: String(piece.id || ""),
    statuses: ["stationary"],
  })).sort((left, right) => left.pieceId.localeCompare(right.pieceId));
}

function adaptedStatusRows(state, pieceIds) {
  return [...pieceIds].map((pieceId) => {
    const piece = state.pieces?.find((entry) => entry.id === pieceId);
    if (!piece || !Array.isArray(piece.statuses)) {
      fail("LIFE_SUPPORT_DATA_ADAPTER_V2_STATUS_SET_INVALID");
    }
    return { pieceId, statuses: clone(piece.statuses) };
  }).sort((left, right) => left.pieceId.localeCompare(right.pieceId));
}

function projectedLoadout(names) {
  const projected = LOADOUT_PROJECTIONS.get(names.join("|"));
  if (!projected) {
    fail("LIFE_SUPPORT_DATA_ADAPTER_V2_CURRENT_LOADOUT_SCOPE_INVALID");
  }
  return [...projected];
}

function receiptBody(receipt) {
  return without(receipt, ["adapterReceiptHash"]);
}

function verifyReceipt(receipt) {
  if (!object(receipt)
    || receipt.schema !== OFFICIAL_CURRENT_LIFE_SUPPORT_DATA_ADAPTER_V2_SCHEMA
    || receipt.currentSourceSnapshotHash !== CURRENT_SOURCE_SNAPSHOT_HASH
    || receipt.currentDatasetHash !== CURRENT_DATASET_HASH
    || receipt.currentGameplayDataBundleHash !== CURRENT_GAMEPLAY_BUNDLE_HASH
    || receipt.frozenSourceSnapshotHash !== FROZEN_SOURCE_SNAPSHOT_HASH
    || receipt.frozenDatasetHash !== FROZEN_DATASET_HASH
    || receipt.frozenGameplayDataBundleHash !== FROZEN_GAMEPLAY_BUNDLE_HASH
    || receipt.adapterMode !== "explicit_current_to_frozen_life_support_semantic_view"
    || receipt.repositoryFallbackAllowed !== false
    || receipt.silentCompatibilityAllowed !== false
    || receipt.trainingTruth !== false
    || !HASH_PATTERN.test(String(receipt.currentMissionSetupBindingHash || ""))
    || !HASH_PATTERN.test(String(receipt.frozenMissionSetupBindingHash || ""))
    || !HASH_PATTERN.test(String(receipt.currentMatchDataSnapshotHash || ""))
    || !HASH_PATTERN.test(String(receipt.frozenMatchDataSnapshotHash || ""))
    || !HASH_PATTERN.test(String(receipt.currentMedicLoadoutHash || ""))
    || !HASH_PATTERN.test(String(receipt.frozenMedicLoadoutHash || ""))
    || !HASH_PATTERN.test(String(receipt.currentStationaryStatusHash || ""))
    || !HASH_PATTERN.test(String(receipt.frozenStationaryStatusHash || ""))
    || !Array.isArray(receipt.adaptedMedicPieceIds)
    || !Array.isArray(receipt.adaptedStationaryPieceIds)
    || receipt.adapterReceiptHash !== hashStarcraftTmgContract(receiptBody(receipt))) {
    fail("LIFE_SUPPORT_DATA_ADAPTER_V2_RECEIPT_INVALID");
  }
}

export function createOfficialCurrentLifeSupportFrozenViewV2(state, options = {}) {
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
  const currentMedicRows = medicLoadoutRows(state);
  for (const row of currentMedicRows) {
    const piece = frozenState.pieces.find((entry) => entry.id === row.pieceId);
    if (!piece) fail("LIFE_SUPPORT_DATA_ADAPTER_V2_MEDIC_SET_INVALID");
    piece.selectedUpgradeNames = projectedLoadout(row.selectedUpgradeNames);
  }
  const frozenMedicRows = medicLoadoutRows(frozenState);
  const currentStationaryRows = stationaryStatusRows(state);
  for (const row of currentStationaryRows) {
    const piece = frozenState.pieces.find((entry) => entry.id === row.pieceId);
    if (!piece) fail("LIFE_SUPPORT_DATA_ADAPTER_V2_STATUS_SET_INVALID");
    piece.statuses = [];
  }
  const adaptedStationaryPieceIds = currentStationaryRows.map((row) => row.pieceId);
  const frozenStationaryRows = adaptedStatusRows(
    frozenState,
    adaptedStationaryPieceIds,
  );
  const frozenMatchBinding = {
    ...clone(options.matchBinding),
    dataSnapshotHash: hashStarcraftTmgContract(frozenBundle),
  };
  const body = {
    schema: OFFICIAL_CURRENT_LIFE_SUPPORT_DATA_ADAPTER_V2_SCHEMA,
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
    currentMedicLoadoutHash: hashStarcraftTmgContract(currentMedicRows),
    frozenMedicLoadoutHash: hashStarcraftTmgContract(frozenMedicRows),
    currentStationaryStatusHash: hashStarcraftTmgContract(currentStationaryRows),
    frozenStationaryStatusHash: hashStarcraftTmgContract(frozenStationaryRows),
    adaptedMedicPieceIds: currentMedicRows.map((row) => row.pieceId),
    adaptedStationaryPieceIds,
    adapterMode: "explicit_current_to_frozen_life_support_semantic_view",
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

export function restoreOfficialCurrentLifeSupportViewV2(
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
      !== receipt.frozenMissionSetupBindingHash
    || hashStarcraftTmgContract(medicLoadoutRows(currentState))
      !== receipt.currentMedicLoadoutHash
    || hashStarcraftTmgContract(medicLoadoutRows(frozenStateAfter))
      !== receipt.frozenMedicLoadoutHash
    || hashStarcraftTmgContract(stationaryStatusRows(currentState))
      !== receipt.currentStationaryStatusHash
    || hashStarcraftTmgContract(adaptedStatusRows(
      frozenStateAfter,
      receipt.adaptedStationaryPieceIds,
    )) !== receipt.frozenStationaryStatusHash) {
    fail("LIFE_SUPPORT_DATA_ADAPTER_V2_RESTORE_MISMATCH");
  }
  const restored = clone(frozenStateAfter);
  restored.officialGameplayDataBundle = clone(currentBundle);
  restored.officialMissionSetupBinding = clone(currentMissionSetupBinding);
  const currentLoadoutByPieceId = new Map(medicLoadoutRows(currentState).map((row) => (
    [row.pieceId, row.selectedUpgradeNames]
  )));
  for (const pieceId of receipt.adaptedMedicPieceIds) {
    const piece = restored.pieces?.find((entry) => entry.id === pieceId);
    const selectedUpgradeNames = currentLoadoutByPieceId.get(pieceId);
    if (!piece || !selectedUpgradeNames) {
      fail("LIFE_SUPPORT_DATA_ADAPTER_V2_RESTORE_MISMATCH");
    }
    piece.selectedUpgradeNames = clone(selectedUpgradeNames);
  }
  for (const pieceId of receipt.adaptedStationaryPieceIds) {
    const piece = restored.pieces?.find((entry) => entry.id === pieceId);
    const currentPiece = currentState.pieces?.find((entry) => entry.id === pieceId);
    if (!piece || !currentPiece
      || !isDeepStrictEqual(currentPiece.statuses, ["stationary"])) {
      fail("LIFE_SUPPORT_DATA_ADAPTER_V2_RESTORE_MISMATCH");
    }
    piece.statuses = ["stationary"];
  }
  return restored;
}
