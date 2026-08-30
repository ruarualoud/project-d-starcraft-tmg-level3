import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import {
  createOfficialCurrentGoliathScatterFrozenViewV2,
  restoreOfficialCurrentGoliathScatterViewV2,
} from "./official-current-goliath-scatter-data-adapter-v2.mjs";

export const OFFICIAL_CURRENT_SIDEARM_PINPOINT_DATA_ADAPTER_V2_SCHEMA =
  "starcraft_tmg_official_current_sidearm_pinpoint_data_adapter_v2";

const CURRENT_SOURCE_SNAPSHOT_HASH =
  "c737db613fbba1c917348c98f00e1cb856650ae9bbbaec1093145fe0fae62a61";
const CURRENT_DATASET_HASH =
  "38f89f3a383555627d131dc11fbba53f5b6918b604d25eaa87198df00a1a8e63";
const CURRENT_GAMEPLAY_BUNDLE_HASH =
  "bf09bd38b9984cb8f1dbc1f6e83d6ad8d436c469433f05ce1af33ba9636f8133";
const REQUIRED_PROFILE_KEYS = Object.freeze([
  "army_units:goliath::assault::Autocannon",
  "army_units:goliath::assault::Haywire Missiles",
  "army_units:goliath::assault::Underbelly Machine Gun",
]);

function fail(code) {
  throw new Error(code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function receiptBody(receipt) {
  return without(receipt, ["adapterReceiptHash"]);
}

function verifyCurrentSidearmScope(state, matchBinding) {
  const bundle = state?.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(bundle);
  const unitKeys = bundle.combatProfileBundle.profiles
    .map((profile) => profile.recordKey)
    .sort((left, right) => left.localeCompare(right));
  const profileKeys = new Set(bundle.attackProfileCatalogue.profiles
    .map((profile) => profile.profileKey));
  if (!object(matchBinding)
    || bundle.sourceSnapshotHash !== CURRENT_SOURCE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== CURRENT_DATASET_HASH
    || bundle.gameplayDataBundleHash !== CURRENT_GAMEPLAY_BUNDLE_HASH
    || bundle.repositoryFallbackAllowed !== false
    || matchBinding.dataSnapshotHash !== hashStarcraftTmgContract(bundle)
    || !isDeepStrictEqual(unitKeys, ["army_units:goliath", "army_units:marine"])
    || REQUIRED_PROFILE_KEYS.some((profileKey) => !profileKeys.has(profileKey))) {
    fail("SIDEARM_PINPOINT_DATA_ADAPTER_V2_LATEST_UNIFIED_BUNDLE_REQUIRED");
  }
}

function verifyReceipt(receipt) {
  if (!object(receipt)
    || receipt.schema !== OFFICIAL_CURRENT_SIDEARM_PINPOINT_DATA_ADAPTER_V2_SCHEMA
    || receipt.currentSourceSnapshotHash !== CURRENT_SOURCE_SNAPSHOT_HASH
    || receipt.currentDatasetHash !== CURRENT_DATASET_HASH
    || receipt.currentGameplayDataBundleHash !== CURRENT_GAMEPLAY_BUNDLE_HASH
    || receipt.adapterMode !== "explicit_sidearm_projection_over_reviewed_shared_goliath_view"
    || receipt.repositoryFallbackAllowed !== false
    || receipt.silentCompatibilityAllowed !== false
    || receipt.trainingTruth !== false
    || !object(receipt.sharedAdapterReceipt)
    || receipt.sharedAdapterReceipt.adapterMode
      !== "explicit_current_to_frozen_goliath_scatter_view"
    || receipt.adapterReceiptHash !== hashStarcraftTmgContract(receiptBody(receipt))) {
    fail("SIDEARM_PINPOINT_DATA_ADAPTER_V2_RECEIPT_INVALID");
  }
}

export function createOfficialCurrentSidearmPinpointFrozenViewV2(state, options = {}) {
  verifyCurrentSidearmScope(state, options.matchBinding);
  const shared = createOfficialCurrentGoliathScatterFrozenViewV2(state, options);
  const body = {
    schema: OFFICIAL_CURRENT_SIDEARM_PINPOINT_DATA_ADAPTER_V2_SCHEMA,
    currentSourceSnapshotHash: CURRENT_SOURCE_SNAPSHOT_HASH,
    currentDatasetHash: CURRENT_DATASET_HASH,
    currentGameplayDataBundleHash: CURRENT_GAMEPLAY_BUNDLE_HASH,
    requiredProfileKeys: [...REQUIRED_PROFILE_KEYS],
    sharedAdapterReceipt: structuredClone(shared.receipt),
    adapterMode: "explicit_sidearm_projection_over_reviewed_shared_goliath_view",
    repositoryFallbackAllowed: false,
    silentCompatibilityAllowed: false,
    trainingTruth: false,
  };
  return {
    frozenState: shared.frozenState,
    frozenMatchBinding: shared.frozenMatchBinding,
    receipt: {
      ...body,
      adapterReceiptHash: hashStarcraftTmgContract(body),
    },
  };
}

export function restoreOfficialCurrentSidearmPinpointViewV2(
  currentState,
  frozenStateAfter,
  receipt,
) {
  verifyReceipt(receipt);
  return restoreOfficialCurrentGoliathScatterViewV2(
    currentState,
    frozenStateAfter,
    receipt.sharedAdapterReceipt,
  );
}
