import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import {
  createOfficialCurrentAcademyMedicFrozenViewV2,
  restoreOfficialCurrentAcademyMedicViewV2,
} from "./official-current-academy-medic-data-adapter-v2.mjs";

export const OFFICIAL_CURRENT_STIMPACK_DATA_ADAPTER_V2_SCHEMA =
  "starcraft_tmg_official_current_stimpack_data_adapter_v2";

const CURRENT_SOURCE_SNAPSHOT_HASH =
  "c737db613fbba1c917348c98f00e1cb856650ae9bbbaec1093145fe0fae62a61";
const CURRENT_DATASET_HASH =
  "38f89f3a383555627d131dc11fbba53f5b6918b604d25eaa87198df00a1a8e63";
const CURRENT_GAMEPLAY_BUNDLE_HASH =
  "f530568fbb6118bc2921fe13d807dbe8bb095e42efb5faf33d8f3d9806177459";
const FROZEN_GAMEPLAY_BUNDLE_HASH =
  "35cd2e1a7a7cb7575f0525dbf6ff08fa0a5285b5fcf89e6b901976f532f1463b";
const MARINE_SOURCE_RECORD_HASH =
  "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215";
const MARINE_PAYLOAD_HASH =
  "33cbc0b9e9e17ca95f1cd639f78d81e8ec7606f035642e32fdf7064bcc49d1e6";
const TERRAN_RESOURCE_SOURCE_RECORD_HASH =
  "44aa8b4d52a065dbbc5e93a9bfc203957647393efe4c123e1a0b2b909dbf63c5";

function fail(code) { throw new Error(code); }
function object(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function receiptBody(receipt) { return without(receipt, ["adapterReceiptHash"]); }

function verifyCurrentScope(state, matchBinding) {
  const bundle = state?.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(bundle);
  const marine = bundle.combatProfileBundle.profiles.find((entry) => (
    entry.recordKey === "army_units:marine"
  ));
  const resource = bundle.cleanupCardBundle?.profiles?.find((entry) => (
    entry.recordKey === "tactical_cards:terran_armed_forces"
  ));
  if (!object(matchBinding)
    || bundle.sourceSnapshotHash !== CURRENT_SOURCE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== CURRENT_DATASET_HASH
    || bundle.gameplayDataBundleHash !== CURRENT_GAMEPLAY_BUNDLE_HASH
    || bundle.repositoryFallbackAllowed !== false
    || matchBinding.dataSnapshotHash !== hashStarcraftTmgContract(bundle)
    || marine?.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || marine?.payloadHash !== MARINE_PAYLOAD_HASH
    || marine?.hitPoints !== 2
    || !isDeepStrictEqual(marine?.combatTags, ["biological", "ground", "light"])
    || resource?.sourceRecordHash !== TERRAN_RESOURCE_SOURCE_RECORD_HASH
    || resource?.resource !== 1) {
    fail("STIMPACK_DATA_ADAPTER_V2_LATEST_UNIFIED_BUNDLE_REQUIRED");
  }
}

function verifyReceipt(receipt) {
  if (!object(receipt)
    || receipt.schema !== OFFICIAL_CURRENT_STIMPACK_DATA_ADAPTER_V2_SCHEMA
    || receipt.currentSourceSnapshotHash !== CURRENT_SOURCE_SNAPSHOT_HASH
    || receipt.currentDatasetHash !== CURRENT_DATASET_HASH
    || receipt.currentGameplayDataBundleHash !== CURRENT_GAMEPLAY_BUNDLE_HASH
    || receipt.frozenGameplayDataBundleHash !== FROZEN_GAMEPLAY_BUNDLE_HASH
    || receipt.adapterMode
      !== "explicit_current_stimpack_projection_over_reviewed_academy_medic_view"
    || receipt.repositoryFallbackAllowed !== false
    || receipt.silentCompatibilityAllowed !== false
    || receipt.trainingTruth !== false
    || !object(receipt.sharedAdapterReceipt)
    || receipt.adapterReceiptHash !== hashStarcraftTmgContract(receiptBody(receipt))) {
    fail("STIMPACK_DATA_ADAPTER_V2_RECEIPT_INVALID");
  }
}

export function createOfficialCurrentStimpackFrozenViewV2(state, options = {}) {
  verifyCurrentScope(state, options.matchBinding);
  const shared = createOfficialCurrentAcademyMedicFrozenViewV2(state, options);
  if (shared.frozenState.officialGameplayDataBundle.gameplayDataBundleHash
    !== FROZEN_GAMEPLAY_BUNDLE_HASH) {
    fail("STIMPACK_DATA_ADAPTER_V2_FROZEN_VIEW_DRIFT");
  }
  const body = {
    schema: OFFICIAL_CURRENT_STIMPACK_DATA_ADAPTER_V2_SCHEMA,
    currentSourceSnapshotHash: CURRENT_SOURCE_SNAPSHOT_HASH,
    currentDatasetHash: CURRENT_DATASET_HASH,
    currentGameplayDataBundleHash: CURRENT_GAMEPLAY_BUNDLE_HASH,
    frozenGameplayDataBundleHash: FROZEN_GAMEPLAY_BUNDLE_HASH,
    sharedAdapterReceipt: structuredClone(shared.receipt),
    adapterMode:
      "explicit_current_stimpack_projection_over_reviewed_academy_medic_view",
    repositoryFallbackAllowed: false,
    silentCompatibilityAllowed: false,
    trainingTruth: false,
  };
  return {
    frozenState: shared.frozenState,
    frozenMatchBinding: shared.frozenMatchBinding,
    receipt: { ...body, adapterReceiptHash: hashStarcraftTmgContract(body) },
  };
}

export function restoreOfficialCurrentStimpackViewV2(currentState, frozenAfter, receipt) {
  verifyReceipt(receipt);
  return restoreOfficialCurrentAcademyMedicViewV2(
    currentState,
    frozenAfter,
    receipt.sharedAdapterReceipt,
  );
}
