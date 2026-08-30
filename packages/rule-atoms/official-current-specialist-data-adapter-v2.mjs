import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialAttackProfileCatalogueV2 } from
  "../source-data/official-attack-profile-catalogue-v2.mjs";
import {
  createOfficialCurrentGoliathScatterFrozenViewV2,
  restoreOfficialCurrentGoliathScatterViewV2,
} from "./official-current-goliath-scatter-data-adapter-v2.mjs";

export const OFFICIAL_CURRENT_SPECIALIST_DATA_ADAPTER_V2_SCHEMA =
  "starcraft_tmg_official_current_specialist_data_adapter_v2";

const CURRENT_GAMEPLAY_BUNDLE_HASH =
  "bf09bd38b9984cb8f1dbc1f6e83d6ad8d436c469433f05ce1af33ba9636f8133";
const FROZEN_GAMEPLAY_BUNDLE_HASH =
  "31369902352d6459c723e880a50e4b5a23eed695a6feef38406e11141263cb21";
const CURRENT_ATTACK_PROFILE_CATALOGUE_V2_HASH =
  "8bb3e1c5056ccb622a9119622017406464881033fbca41fa645adca179a4e854";
const FROZEN_ATTACK_PROFILE_CATALOGUE_V2_HASH =
  "89bf8ab2fdcf2475a0857faa668d82213137b28d04d2120d10a3a49459c676bf";

function fail(code) {
  throw new Error(code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function loadoutHash(loadout) {
  return hashStarcraftTmgContract(without(loadout, ["specialistLoadoutHash"]));
}

function translateLoadout(piece, from, to) {
  const loadout = piece?.specialistLoadout;
  if (!object(loadout)) return null;
  if (piece.specialistLoadoutHash !== loadout.specialistLoadoutHash
    || loadout.specialistLoadoutHash !== loadoutHash(loadout)
    || loadout.gameplayDataBundleHash !== from.gameplay
    || loadout.attackProfileCatalogueHash !== from.catalogue) {
    fail("SPECIALIST_DATA_ADAPTER_V2_SEALED_LOADOUT_INVALID");
  }
  const previousHash = loadout.specialistLoadoutHash;
  loadout.gameplayDataBundleHash = to.gameplay;
  loadout.attackProfileCatalogueHash = to.catalogue;
  loadout.specialistLoadoutHash = loadoutHash(loadout);
  piece.specialistLoadoutHash = loadout.specialistLoadoutHash;
  return { pieceId: piece.id, fromHash: previousHash, toHash: loadout.specialistLoadoutHash };
}

function translateStateLoadouts(state, from, to) {
  const translations = (state.pieces || []).map((piece) => (
    translateLoadout(piece, from, to)
  )).filter(Boolean);
  const pending = state.pendingRangedAttackSequence;
  if (object(pending)) {
    const translation = translations.find((entry) => entry.pieceId === pending.pieceId);
    if (!translation || pending.specialistLoadoutHash !== translation.fromHash) {
      fail("SPECIALIST_DATA_ADAPTER_V2_PENDING_LOADOUT_INVALID");
    }
    pending.specialistLoadoutHash = translation.toHash;
    pending.pendingHash = hashStarcraftTmgContract(without(pending, ["pendingHash"]));
  }
  return translations;
}

function expectedCatalogueV2(bundle, expectedHash) {
  const catalogue = createOfficialAttackProfileCatalogueV2({
    previousCatalogue: bundle.attackProfileCatalogue,
  });
  if (catalogue.catalogueHash !== expectedHash) {
    fail("SPECIALIST_DATA_ADAPTER_V2_CATALOGUE_DRIFT");
  }
  return catalogue;
}

function receiptBody(receipt) {
  return without(receipt, ["adapterReceiptHash"]);
}

function verifyReceipt(receipt) {
  if (!object(receipt)
    || receipt.schema !== OFFICIAL_CURRENT_SPECIALIST_DATA_ADAPTER_V2_SCHEMA
    || receipt.currentGameplayDataBundleHash !== CURRENT_GAMEPLAY_BUNDLE_HASH
    || receipt.frozenGameplayDataBundleHash !== FROZEN_GAMEPLAY_BUNDLE_HASH
    || receipt.currentAttackProfileCatalogueV2Hash
      !== CURRENT_ATTACK_PROFILE_CATALOGUE_V2_HASH
    || receipt.frozenAttackProfileCatalogueV2Hash
      !== FROZEN_ATTACK_PROFILE_CATALOGUE_V2_HASH
    || receipt.adapterMode
      !== "explicit_specialist_loadout_and_batch_projection_over_reviewed_shared_view"
    || receipt.repositoryFallbackAllowed !== false
    || receipt.silentCompatibilityAllowed !== false
    || receipt.trainingTruth !== false
    || !object(receipt.sharedAdapterReceipt)
    || receipt.adapterReceiptHash !== hashStarcraftTmgContract(receiptBody(receipt))) {
    fail("SPECIALIST_DATA_ADAPTER_V2_RECEIPT_INVALID");
  }
}

export function createOfficialCurrentSpecialistFrozenViewV2(state, options = {}) {
  const currentBundle = state?.officialGameplayDataBundle;
  if (currentBundle?.gameplayDataBundleHash !== CURRENT_GAMEPLAY_BUNDLE_HASH) {
    fail("SPECIALIST_DATA_ADAPTER_V2_LATEST_UNIFIED_BUNDLE_REQUIRED");
  }
  expectedCatalogueV2(currentBundle, CURRENT_ATTACK_PROFILE_CATALOGUE_V2_HASH);
  const shared = createOfficialCurrentGoliathScatterFrozenViewV2(state, options);
  expectedCatalogueV2(
    shared.frozenState.officialGameplayDataBundle,
    FROZEN_ATTACK_PROFILE_CATALOGUE_V2_HASH,
  );
  const translations = translateStateLoadouts(shared.frozenState, {
    gameplay: CURRENT_GAMEPLAY_BUNDLE_HASH,
    catalogue: CURRENT_ATTACK_PROFILE_CATALOGUE_V2_HASH,
  }, {
    gameplay: FROZEN_GAMEPLAY_BUNDLE_HASH,
    catalogue: FROZEN_ATTACK_PROFILE_CATALOGUE_V2_HASH,
  });
  const body = {
    schema: OFFICIAL_CURRENT_SPECIALIST_DATA_ADAPTER_V2_SCHEMA,
    currentGameplayDataBundleHash: CURRENT_GAMEPLAY_BUNDLE_HASH,
    frozenGameplayDataBundleHash: FROZEN_GAMEPLAY_BUNDLE_HASH,
    currentAttackProfileCatalogueV2Hash: CURRENT_ATTACK_PROFILE_CATALOGUE_V2_HASH,
    frozenAttackProfileCatalogueV2Hash: FROZEN_ATTACK_PROFILE_CATALOGUE_V2_HASH,
    translatedLoadouts: translations,
    sharedAdapterReceipt: structuredClone(shared.receipt),
    adapterMode:
      "explicit_specialist_loadout_and_batch_projection_over_reviewed_shared_view",
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

export function restoreOfficialCurrentSpecialistViewV2(
  currentState,
  frozenStateAfter,
  receipt,
) {
  verifyReceipt(receipt);
  const restored = restoreOfficialCurrentGoliathScatterViewV2(
    currentState,
    frozenStateAfter,
    receipt.sharedAdapterReceipt,
  );
  const translations = translateStateLoadouts(restored, {
    gameplay: FROZEN_GAMEPLAY_BUNDLE_HASH,
    catalogue: FROZEN_ATTACK_PROFILE_CATALOGUE_V2_HASH,
  }, {
    gameplay: CURRENT_GAMEPLAY_BUNDLE_HASH,
    catalogue: CURRENT_ATTACK_PROFILE_CATALOGUE_V2_HASH,
  });
  if (!isDeepStrictEqual(
    translations.map((entry) => entry.pieceId),
    receipt.translatedLoadouts.map((entry) => entry.pieceId),
  ) && receipt.translatedLoadouts.length > 0) {
    fail("SPECIALIST_DATA_ADAPTER_V2_RESTORE_LOADOUT_MISMATCH");
  }
  return restored;
}
