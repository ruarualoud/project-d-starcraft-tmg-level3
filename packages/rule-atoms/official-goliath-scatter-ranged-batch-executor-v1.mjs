import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  getOfficialAttackProfileV1,
  verifyOfficialAttackProfileCatalogueV1,
} from "../source-data/official-attack-profile-catalogue-v1.mjs";
import {
  createOfficialAttackProfileCatalogueV2,
  getOfficialAttackProfileV2,
} from "../source-data/official-attack-profile-catalogue-v2.mjs";
import { getOfficialCombatProfileV1 } from
  "../source-data/official-combat-profile-bundle-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import {
  createOfficialBoundedFullCoverLosKernelV1,
  OFFICIAL_BOUNDED_FULL_COVER_LOS_ATOM_IDS,
} from "./official-bounded-full-cover-los-kernel-v1.mjs";
import { createOfficialIndirectFireLockedInAttackKernelV1 } from
  "./official-indirect-fire-locked-in-attack-kernel-v1.mjs";
import {
  createOfficialIndirectFireLockedInEffectKernelV1,
  OFFICIAL_SCATTER_LOADOUT_PROFILE_KEYS,
  OFFICIAL_SCATTER_MISSILES_PROFILE_KEY,
} from "./official-indirect-fire-locked-in-effect-kernel-v1.mjs";
import { OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_ACTION_ATOM_IDS } from
  "./official-sidearm-pinpoint-ranged-batch-executor-v1.mjs";
import {
  createOfficialReplacementWeaponLoadoutV1,
  verifyOfficialReplacementWeaponLoadoutV1,
} from "./official-weapon-replacement-loadout-v1.mjs";

export const OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_EXECUTOR_ID =
  "authority.goliath-scatter-ranged-batch-v1";
export const OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_ACTION_TYPE = "ranged_attack";

export const OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_NEW_ATOM_IDS = Object.freeze([
  ...OFFICIAL_BOUNDED_FULL_COVER_LOS_ATOM_IDS,
  "rule-atom:singleton:core-11-indirect-fire-los-ignore:06c39713e53e",
  "rule-atom:singleton:core-11-indirect-fire-off-los-evade:8de63a970f7f",
  "rule-atom:singleton:core-11-indirect-fire-range:5f12a92319c7",
  "rule-atom:singleton:core-11-locked-in-stationary-roa:615deb544566",
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_DEPENDENCY_ATOM_IDS =
  Object.freeze([...new Set([
    ...OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_ACTION_ATOM_IDS,
    "rule-atom:stationary-start-round-grant",
    "rule-atom:singleton:core-11-stationary-movement-loss:2c62fc0668d0",
  ])].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_DEPENDENCY_ATOM_IDS,
    ...OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));
export const OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_EXECUTOR_ATOM_IDS =
  OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_ACTION_ATOM_IDS;

const AUTOCANNON = "army_units:goliath::assault::Autocannon";
const UNDERBELLY = "army_units:goliath::assault::Underbelly Machine Gun";
const GOLIATH_RECORD_KEY = "army_units:goliath";
const MARINE_RECORD_KEY = "army_units:marine";
const CURRENT_SOURCE_SNAPSHOT_HASH =
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78";
const CURRENT_DATASET_HASH =
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a";
const GOLIATH_SOURCE_RECORD_HASH =
  "e36b38cc46ff9a2fecce9f1fa7bc087923fca2fc29fad2d9f0eead479a68ab16";
const GOLIATH_PAYLOAD_HASH =
  "168f9cdc1199f698cc74fe882e98b8d17106a14c7c12acc903be19a3b1bf946d";
const MARINE_SOURCE_RECORD_HASH =
  "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215";
const MARINE_PAYLOAD_HASH =
  "33cbc0b9e9e17ca95f1cd639f78d81e8ec7606f035642e32fdf7064bcc49d1e6";
const PROFILE_HASHES_V1 = Object.freeze({
  [AUTOCANNON]:
    "3be2ef5234bccb909d9119fc83130718770de31a5f7cf0348e9a573512ea8ce3",
  [OFFICIAL_SCATTER_MISSILES_PROFILE_KEY]:
    "af871c574958994688cc7e7751ac0fce2d0a09123944f06480511dea0d24f544",
  [UNDERBELLY]:
    "c7574f07ba693d5c032d05f4cebd67cd665c62f390ce8557582bada9690b745e",
});
const PROFILE_HASHES_V2 = Object.freeze({
  [AUTOCANNON]:
    "67012ccc1b3896877521a87d8533435c698fd448e0b0c6685d26fca63e65634e",
  [OFFICIAL_SCATTER_MISSILES_PROFILE_KEY]:
    "4ce889bb487e7c2d56c2bdeb379f4842382c06e22478795e4764254063690859",
  [UNDERBELLY]:
    "ff152c91ff0190c047072d14888fc912fc057071ac4a4d0d38c710c390cfc3f9",
});
const GOLIATH_BASE_MILLI_INCHES = 3150;
const MARINE_BASE_MILLI_INCHES = 1260;
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const EFFECT_KERNEL = createOfficialIndirectFireLockedInEffectKernelV1();
const ATTACK_KERNEL = createOfficialIndirectFireLockedInAttackKernelV1();
const LOS_KERNEL = createOfficialBoundedFullCoverLosKernelV1();

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function milli(value, code) {
  const number = Number(value);
  if (!Number.isFinite(number)) fail(code);
  const result = Math.round(number * 1000);
  if (!Number.isSafeInteger(result)) fail(code);
  return result;
}

function otherSide(sideKey) {
  if (sideKey === "player1") return "player2";
  if (sideKey === "player2") return "player1";
  fail("GOLIATH_SCATTER_SIDE_REQUIRED");
}

function activePiece(piece) {
  return piece?.isOnField === true
    && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}

function activeModels(piece) {
  return (piece?.models || []).filter((model) => (
    model?.isOnField !== false && model?.isDestroyed !== true
  ));
}

function exactRoundModel(model, diameter, code) {
  if (!object(model)
    || model.isOnField === false
    || model.isDestroyed === true
    || model.baseShape !== "round"
    || milli(model.baseWidthInches, code) !== diameter
    || milli(model.baseDepthInches, code) !== diameter
    || model.elevation !== "ground"
    || !isDeepStrictEqual(model.supportTerrainIds, [])
    || !isDeepStrictEqual(model.adjacentAccessPointIds, [])) {
    fail(code, String(model?.id || ""));
  }
  milli(model.xInches, code);
  milli(model.yInches, code);
  return model;
}

function runtimeHash(matchBinding) {
  const value = String(matchBinding?.rulesRuntimeBinding?.runtimeHash || "").trim();
  if (!HASH_PATTERN.test(value)) fail("GOLIATH_SCATTER_RUNTIME_BINDING_REQUIRED");
  return value;
}

function officialBindings(state, matchBinding) {
  const gameplayDataBundle = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayDataBundle);
  if (gameplayDataBundle.sourceSnapshotHash !== CURRENT_SOURCE_SNAPSHOT_HASH
    || gameplayDataBundle.normalizedDatasetHash !== CURRENT_DATASET_HASH
    || !isDeepStrictEqual(gameplayDataBundle.dataVersions, {
      cardsVersion: "69",
      rulesVersion: "48",
      unitsVersion: "71",
    })
    || gameplayDataBundle.repositoryFallbackAllowed !== false
    || !object(matchBinding)
    || hashStarcraftTmgContract(gameplayDataBundle) !== matchBinding.dataSnapshotHash) {
    fail("GOLIATH_SCATTER_LATEST_OFFICIAL_DATA_REQUIRED");
  }
  verifyOfficialAttackProfileCatalogueV1(gameplayDataBundle.attackProfileCatalogue);
  const catalogueV2 = createOfficialAttackProfileCatalogueV2({
    previousCatalogue: gameplayDataBundle.attackProfileCatalogue,
  });
  const profilesV1 = {};
  const profilesV2 = {};
  for (const profileKey of OFFICIAL_SCATTER_LOADOUT_PROFILE_KEYS) {
    const profileV1 = getOfficialAttackProfileV1(
      gameplayDataBundle.attackProfileCatalogue,
      profileKey,
    );
    const profileV2 = getOfficialAttackProfileV2(catalogueV2, profileKey);
    if (profileV1.profileHash !== PROFILE_HASHES_V1[profileKey]
      || profileV1.sourceRecordHash !== GOLIATH_SOURCE_RECORD_HASH
      || profileV1.payloadHash !== GOLIATH_PAYLOAD_HASH
      || profileV2.profileHash !== PROFILE_HASHES_V2[profileKey]
      || profileV2.previousProfileHash !== profileV1.profileHash) {
      fail("GOLIATH_SCATTER_OFFICIAL_PROFILE_DRIFT", profileKey);
    }
    profilesV1[profileKey] = profileV1;
    profilesV2[profileKey] = profileV2;
  }
  const goliath = getOfficialCombatProfileV1(
    gameplayDataBundle.combatProfileBundle,
    GOLIATH_RECORD_KEY,
  );
  const marine = getOfficialCombatProfileV1(
    gameplayDataBundle.combatProfileBundle,
    MARINE_RECORD_KEY,
  );
  if (goliath.sourceRecordHash !== GOLIATH_SOURCE_RECORD_HASH
    || goliath.payloadHash !== GOLIATH_PAYLOAD_HASH
    || goliath.hitPoints !== 10
    || goliath.armourThreshold !== 4
    || goliath.evadeThreshold !== null
    || !isDeepStrictEqual(goliath.combatTags, ["armoured", "ground", "mechanical"])
    || marine.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || marine.payloadHash !== MARINE_PAYLOAD_HASH
    || marine.hitPoints !== 2
    || marine.armourThreshold !== 5
    || marine.evadeThreshold !== 5
    || !isDeepStrictEqual(marine.combatTags, ["biological", "ground", "light"])) {
    fail("GOLIATH_SCATTER_COMBAT_PROFILE_DRIFT");
  }
  return {
    gameplayDataBundle,
    catalogueV1: gameplayDataBundle.attackProfileCatalogue,
    catalogueV2,
    profilesV1,
    profilesV2,
    goliath,
    marine,
    runtimeHash: runtimeHash(matchBinding),
  };
}

function verifyDestroyedTarget(piece, sideKey, recordKey) {
  if (piece.sideKey !== sideKey
    || piece.officialUnitRecordKey !== recordKey
    || piece.isOnField !== false
    || Number(piece.currentModels) !== 0
    || Number(piece.currentSupply) !== 0
    || Number(piece.damageMarker || 0) !== 0
    || piece.models?.length !== 1
    || piece.models[0].isDestroyed !== true
    || piece.models[0].isOnField !== false) {
    fail("GOLIATH_SCATTER_DESTROYED_TARGET_INVALID", String(piece?.id || ""));
  }
}

function verifyGoliath(piece, sideKey, bindings, attacker, allowDestroyed = false) {
  if (allowDestroyed && piece?.isDestroyed === true) {
    verifyDestroyedTarget(piece, sideKey, GOLIATH_RECORD_KEY);
    return piece;
  }
  if (!object(piece)
    || piece.sideKey !== sideKey
    || piece.officialUnitRecordKey !== GOLIATH_RECORD_KEY
    || piece.sourceRecordHash !== GOLIATH_SOURCE_RECORD_HASH
    || piece.sizeCharacteristic !== 3
    || piece.combatTag !== "ground"
    || !activePiece(piece)
    || Number(piece.currentModels) !== 1
    || Number(piece.currentSupply) !== 2
    || !isDeepStrictEqual(piece.statuses || [], [])
    || !isDeepStrictEqual(piece.combatEffects || [], [])
    || !isDeepStrictEqual(piece.assaultEffects || [], [])
    || activeModels(piece).length !== 1
    || (attacker
      ? (!isDeepStrictEqual(piece.selectedUpgradeNames, ["Scatter Missiles"])
        || piece.activatedPhases?.assault === true)
      : !isDeepStrictEqual(piece.selectedUpgradeNames || [], []))) {
    fail(attacker
      ? "GOLIATH_SCATTER_ATTACKER_SCOPE_UNSUPPORTED"
      : "GOLIATH_SCATTER_GOLIATH_TARGET_SCOPE_UNSUPPORTED", String(piece?.id || ""));
  }
  exactRoundModel(
    activeModels(piece)[0],
    GOLIATH_BASE_MILLI_INCHES,
    attacker
      ? "GOLIATH_SCATTER_ATTACKER_MODEL_INVALID"
      : "GOLIATH_SCATTER_GOLIATH_TARGET_MODEL_INVALID",
  );
  const damage = Number(piece.damageMarker || 0);
  if (!Number.isSafeInteger(damage) || damage < 0 || damage >= bindings.goliath.hitPoints) {
    fail("GOLIATH_SCATTER_TARGET_DAMAGE_INVALID", piece.id);
  }
  return piece;
}

function verifyMarine(piece, sideKey, bindings, allowDestroyed = false) {
  if (allowDestroyed && piece?.isDestroyed === true) {
    verifyDestroyedTarget(piece, sideKey, MARINE_RECORD_KEY);
    return piece;
  }
  const statuses = piece?.statuses || [];
  if (!object(piece)
    || piece.sideKey !== sideKey
    || piece.officialUnitRecordKey !== MARINE_RECORD_KEY
    || piece.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || piece.sizeCharacteristic !== 1
    || piece.combatTag !== "ground"
    || !activePiece(piece)
    || Number(piece.currentModels) !== 1
    || Number(piece.currentSupply) !== 0
    || !isDeepStrictEqual(piece.selectedUpgradeNames || [], [])
    || !isDeepStrictEqual(piece.combatEffects || [], [])
    || !isDeepStrictEqual(piece.assaultEffects || [], [])
    || !([0, 1].includes(statuses.length)
      && statuses.every((status) => status === "stationary"))
    || activeModels(piece).length !== 1) {
    fail("GOLIATH_SCATTER_MARINE_SCOPE_UNSUPPORTED", String(piece?.id || ""));
  }
  exactRoundModel(
    activeModels(piece)[0],
    MARINE_BASE_MILLI_INCHES,
    "GOLIATH_SCATTER_MARINE_MODEL_INVALID",
  );
  const damage = Number(piece.damageMarker || 0);
  if (!Number.isSafeInteger(damage) || damage < 0 || damage >= bindings.marine.hitPoints) {
    fail("GOLIATH_SCATTER_TARGET_DAMAGE_INVALID", piece.id);
  }
  return piece;
}

function powerSet(values) {
  const rows = [];
  for (let mask = 1; mask < 2 ** values.length; mask += 1) {
    rows.push(values.filter((_value, index) => (mask & (2 ** index)) !== 0));
  }
  return rows.sort((left, right) => (
    `${left.length}:${left.join(":")}`.localeCompare(`${right.length}:${right.join(":")}`)
  ));
}

function baseGapMilliInches(attacker, attackerDiameter, target, targetDiameter) {
  return Math.max(0, Math.round(Math.hypot(
    milli(target.xInches, "GOLIATH_SCATTER_MODEL_GEOMETRY_INVALID")
      - milli(attacker.xInches, "GOLIATH_SCATTER_MODEL_GEOMETRY_INVALID"),
    milli(target.yInches, "GOLIATH_SCATTER_MODEL_GEOMETRY_INVALID")
      - milli(attacker.yInches, "GOLIATH_SCATTER_MODEL_GEOMETRY_INVALID"),
  ) - (attackerDiameter / 2) - (targetDiameter / 2)));
}

function sequenceDescriptor(context, authorization) {
  const body = {
    schema: "starcraft_tmg_official_goliath_scatter_sequence_descriptor_v1",
    sideKey: context.piece.sideKey,
    pieceId: context.piece.id,
    weaponLoadoutHash: context.weaponLoadout.loadoutHash,
    profileSelectionAuthorizationHash: authorization.authorizationHash,
    selectedBatchProfileKeys: [...authorization.selectedBatchProfileKeys],
    sidearmUseMode: authorization.sidearmUseMode,
    sourceSnapshotHash: context.bindings.gameplayDataBundle.sourceSnapshotHash,
    normalizedDatasetHash: context.bindings.gameplayDataBundle.normalizedDatasetHash,
    attackProfileCatalogueHash: context.bindings.catalogueV2.catalogueHash,
    rulesRuntimeHash: context.bindings.runtimeHash,
  };
  return freezeDeep({ ...body, sequenceHash: hashStarcraftTmgContract(body) });
}

function sequenceBody(sequence) {
  return without(sequence, ["pendingHash"]);
}

function verifyPendingSequence(state, context) {
  const pending = state.pendingRangedAttackSequence;
  if (!object(pending)
    || pending.schema !== "starcraft_tmg_official_goliath_scatter_sequence_pending_v1"
    || pending.pendingHash !== hashStarcraftTmgContract(sequenceBody(pending))
    || pending.sideKey !== context.piece.sideKey
    || pending.pieceId !== context.piece.id
    || pending.weaponLoadoutHash !== context.weaponLoadout.loadoutHash
    || !Array.isArray(pending.originalBatchProfileKeys)
    || !Array.isArray(pending.remainingBatchProfileKeys)
    || !Array.isArray(pending.completedBatches)
    || pending.completedBatches.length < 1
    || pending.completedBatches.length > 2
    || pending.remainingBatchProfileKeys.length < 1
    || pending.originalBatchProfileKeys.length
      !== pending.completedBatches.length + pending.remainingBatchProfileKeys.length
    || !isDeepStrictEqual(
      [...pending.originalBatchProfileKeys].sort((left, right) => left.localeCompare(right)),
      pending.originalBatchProfileKeys,
    )
    || new Set(pending.originalBatchProfileKeys).size
      !== pending.originalBatchProfileKeys.length
    || pending.originalBatchProfileKeys.some((key) => (
      !OFFICIAL_SCATTER_LOADOUT_PROFILE_KEYS.includes(key)
    ))
    || pending.completedBatches.some((batch, index) => (
      batch.ordinal !== index + 1
        || !pending.originalBatchProfileKeys.includes(batch.profileKey)
        || !HASH_PATTERN.test(String(batch.batchHash || ""))
    ))
    || pending.remainingBatchProfileKeys.some((key) => (
      !pending.originalBatchProfileKeys.includes(key)
    ))) {
    fail("GOLIATH_SCATTER_PENDING_SEQUENCE_INVALID");
  }
  const completedKeys = pending.completedBatches.map((batch) => batch.profileKey);
  if (new Set([...completedKeys, ...pending.remainingBatchProfileKeys]).size
      !== pending.originalBatchProfileKeys.length
    || !isDeepStrictEqual(
      [...completedKeys, ...pending.remainingBatchProfileKeys].sort((left, right) => (
        left.localeCompare(right)
      )),
      pending.originalBatchProfileKeys,
    )) {
    fail("GOLIATH_SCATTER_PENDING_SEQUENCE_INVALID");
  }
  const selectionAuthorization = EFFECT_KERNEL.authorizeSelection({
    profiles: Object.values(context.bindings.profilesV1),
    weaponLoadout: context.weaponLoadout,
    selectedBatchProfileKeys: pending.originalBatchProfileKeys,
  });
  const descriptor = sequenceDescriptor(context, selectionAuthorization);
  if (pending.sequenceHash !== descriptor.sequenceHash
    || pending.profileSelectionAuthorizationHash !== selectionAuthorization.authorizationHash
    || pending.sidearmUseMode !== selectionAuthorization.sidearmUseMode) {
    fail("GOLIATH_SCATTER_PENDING_SEQUENCE_INVALID");
  }
  return { pending, selectionAuthorization, descriptor };
}

function baseContext(state, sideKey, options = {}) {
  const pendingInput = isOfficialGoliathScatterRangedSequencePendingV1(state);
  if (!object(state)
    || !["player1", "player2"].includes(sideKey)
    || state.phase !== "assault"
    || state.activeSideKey !== sideKey
    || state.players?.[sideKey]?.passedPhases?.assault === true
    || state.gameOver === true
    || state.terminal === true
    || !Array.isArray(state.pieces)
    || state.pieces.length !== 5
    || !object(state.board)
    || !Array.isArray(state.board.terrain)
    || state.board.terrain.length !== 1
    || !isDeepStrictEqual(state.board.accessPoints || [], [])
    || !isDeepStrictEqual(state.board.effectMarkers || [], [])) {
    fail("GOLIATH_SCATTER_STATE_SCOPE_UNSUPPORTED");
  }
  const bindings = officialBindings(state, options.matchBinding);
  const friendly = state.pieces.filter((piece) => piece.sideKey === sideKey);
  const enemies = state.pieces.filter((piece) => piece.sideKey === otherSide(sideKey));
  const attacker = friendly.find((piece) => piece.officialUnitRecordKey === GOLIATH_RECORD_KEY);
  const enemyGoliaths = enemies.filter((piece) => (
    piece.officialUnitRecordKey === GOLIATH_RECORD_KEY
  ));
  const enemyMarines = enemies.filter((piece) => (
    piece.officialUnitRecordKey === MARINE_RECORD_KEY
  ));
  if (!attacker
    || friendly.length !== 1
    || enemies.length !== 4
    || enemyGoliaths.length !== 2
    || enemyMarines.length !== 2) {
    fail("GOLIATH_SCATTER_EXACT_UNITS_REQUIRED");
  }
  verifyGoliath(attacker, sideKey, bindings, true);
  for (const target of enemyGoliaths) {
    verifyGoliath(target, otherSide(sideKey), bindings, false, pendingInput);
  }
  for (const target of enemyMarines) {
    verifyMarine(target, otherSide(sideKey), bindings, pendingInput);
  }
  const stationaryMarines = enemyMarines.filter((piece) => (
    piece.statuses.includes("stationary")
  ));
  if (stationaryMarines.length !== 1) fail("GOLIATH_SCATTER_STATIONARY_FIXTURE_INVALID");
  const attackerModel = activeModels(attacker)[0];
  const weaponLoadout = createOfficialReplacementWeaponLoadoutV1({
    catalogue: bindings.catalogueV1,
    recordKey: GOLIATH_RECORD_KEY,
    phase: "assault",
    selectedWeaponUpgradeNames: attacker.selectedUpgradeNames,
    modelIds: [attackerModel.id],
  });
  verifyOfficialReplacementWeaponLoadoutV1({
    catalogue: bindings.catalogueV1,
    receipt: weaponLoadout,
  });
  if (!isDeepStrictEqual(weaponLoadout.availableProfileKeys,
    OFFICIAL_SCATTER_LOADOUT_PROFILE_KEYS)) {
    fail("GOLIATH_SCATTER_WEAPON_LOADOUT_INVALID");
  }
  const context = {
    bindings,
    piece: attacker,
    targetPieces: [...enemyGoliaths, ...enemyMarines]
      .sort((left, right) => left.id.localeCompare(right.id)),
    weaponLoadout,
    terrain: state.board.terrain,
  };
  if (pendingInput) return { ...context, ...verifyPendingSequence(state, context) };
  return { ...context, pending: null, selectionAuthorization: null, descriptor: null };
}

function selectionContexts(context) {
  if (context.pending) {
    return [{
      selectionAuthorization: context.selectionAuthorization,
      descriptor: context.descriptor,
      availableProfileKeys: [...context.pending.remainingBatchProfileKeys],
      completedBatchCount: context.pending.completedBatches.length,
    }];
  }
  return powerSet(OFFICIAL_SCATTER_LOADOUT_PROFILE_KEYS).map((selection) => {
    const selectionAuthorization = EFFECT_KERNEL.authorizeSelection({
      profiles: Object.values(context.bindings.profilesV1),
      weaponLoadout: context.weaponLoadout,
      selectedBatchProfileKeys: selection,
    });
    return {
      selectionAuthorization,
      descriptor: sequenceDescriptor(context, selectionAuthorization),
      availableProfileKeys: [...selection],
      completedBatchCount: 0,
    };
  });
}

function targetCombatProfile(target, bindings) {
  return target.officialUnitRecordKey === MARINE_RECORD_KEY
    ? bindings.marine
    : bindings.goliath;
}

function targetBaseDiameter(target) {
  return target.officialUnitRecordKey === MARINE_RECORD_KEY
    ? MARINE_BASE_MILLI_INCHES
    : GOLIATH_BASE_MILLI_INCHES;
}

function planBatch(context, profileKey, target) {
  const profile = context.bindings.profilesV1[profileKey];
  const attackerModel = activeModels(context.piece)[0];
  const targetModel = activeModels(target)[0];
  const targetProfile = targetCombatProfile(target, context.bindings);
  const lineOfSight = LOS_KERNEL.evaluate({
    attackerModel,
    targetModel,
    attackerSizeCharacteristic: context.piece.sizeCharacteristic,
    targetSizeCharacteristic: target.sizeCharacteristic,
    terrain: context.terrain,
  });
  const distanceInches = Number((baseGapMilliInches(
    attackerModel,
    GOLIATH_BASE_MILLI_INCHES,
    targetModel,
    targetBaseDiameter(target),
  ) / 1000).toFixed(3));
  const attackPlan = ATTACK_KERNEL.plan({
    profile,
    target: {
      armourThreshold: targetProfile.armourThreshold,
      evadeThreshold: targetProfile.evadeThreshold,
      combatTags: targetProfile.combatTags,
    },
    distanceInches,
    lineOfSight,
    targetStationary: target.statuses.includes("stationary"),
  });
  const body = {
    schema: "starcraft_tmg_official_goliath_scatter_ranged_batch_plan_v1",
    sequencePieceId: context.piece.id,
    targetId: target.id,
    targetModelId: targetModel.id,
    officialProfileKey: profile.profileKey,
    officialProfileHash: profile.profileHash,
    officialProfileV2Hash: context.bindings.profilesV2[profileKey].profileHash,
    attackerModelId: attackerModel.id,
    distanceInches,
    targetStationary: attackPlan.targetStationary,
    lineOfSight,
    attackPlan,
    chance: clone(attackPlan.chance),
    rulesTruth: "official_goliath_scatter_indirect_locked_exact_target_subset",
    trainingTruth: false,
  };
  return freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
}

function canonicalAction(context, selection, profileKey, target, plan) {
  const profile = context.bindings.profilesV1[profileKey];
  return {
    actionType: OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_ACTION_TYPE,
    sideKey: context.piece.sideKey,
    phase: "assault",
    pieceId: context.piece.id,
    targetId: target.id,
    weaponName: profile.weaponName,
    attackProfileKey: profile.profileKey,
    attackProfileHash: profile.profileHash,
    attackProfileV2Hash: context.bindings.profilesV2[profileKey].profileHash,
    contributingModelIds: [activeModels(context.piece)[0].id],
    selectedBatchProfileKeys: [
      ...selection.selectionAuthorization.selectedBatchProfileKeys,
    ],
    sidearmUseMode: selection.selectionAuthorization.sidearmUseMode,
    sequenceHash: selection.descriptor.sequenceHash,
    batchOrdinal: selection.completedBatchCount + 1,
    sequenceFinalBatch: selection.availableProfileKeys.length === 1,
    batchPlanHash: plan.planHash,
    lineOfSightStatus: plan.lineOfSight.lineOfSightStatus,
    indirectFireUsed: plan.attackPlan.indirectFireUsed,
    lockedInAdditionalRateOfAttack:
      plan.attackPlan.lockedInAdditionalRateOfAttack,
    effectiveRateOfAttack: plan.attackPlan.effectiveRateOfAttack,
    rangeBand: plan.attackPlan.rangeBand,
    evadeEligibilityReason: plan.attackPlan.evadeEligibilityReason,
    blockingTerrainId: plan.lineOfSight.visible ? null : plan.lineOfSight.terrainId,
    chance: clone(plan.chance),
    ruleAtomIds: [...OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_ACTION_ATOM_IDS],
    executorId: OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_EXECUTOR_ID,
    executorVersion: OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_EXECUTOR_VERSION,
  };
}

function actionFromCandidate(candidate) {
  const {
    isEnabled: _isEnabled,
    disabledReason: _disabledReason,
    score: _score,
    details: _details,
    ...action
  } = candidate;
  return action;
}

export function isOfficialGoliathScatterRangedSequencePendingV1(state) {
  return state?.pendingRangedAttackSequence?.schema
    === "starcraft_tmg_official_goliath_scatter_sequence_pending_v1";
}

export function enumerateOfficialGoliathScatterRangedBatchV1(state, options = {}) {
  const sideKey = String(options.sideKey || state?.activeSideKey || "").trim();
  let context;
  try {
    context = baseContext(state, sideKey, options);
  } catch (error) {
    if (isOfficialGoliathScatterRangedSequencePendingV1(state)) throw error;
    return options.includeDisabled === true ? [freezeDeep({
      actionType: OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_ACTION_TYPE,
      sideKey,
      phase: "assault",
      pieceId: "",
      targetId: "",
      weaponName: "Scatter Missiles",
      ruleAtomIds: [...OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_ACTION_ATOM_IDS],
      executorId: OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_EXECUTOR_ID,
      executorVersion: OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_EXECUTOR_VERSION,
      isEnabled: false,
      disabledReason: String(error?.message || error).split(":")[0],
      score: 0,
      details: { rulesTruth: "fail_closed", trainingTruth: false },
    })] : [];
  }
  const rows = [];
  for (const selection of selectionContexts(context)) {
    for (const profileKey of selection.availableProfileKeys) {
      for (const target of context.targetPieces.filter(activePiece)) {
        let plan;
        try {
          plan = planBatch(context, profileKey, target);
        } catch {
          continue;
        }
        rows.push(freezeDeep({
          ...canonicalAction(context, selection, profileKey, target, plan),
          isEnabled: true,
          disabledReason: "",
          score: context.pending ? 255 : 250,
          details: {
            sourceRule:
              "official_core_8_7_3_8_7_4_and_11_sidearm_indirect_locked_full_cover",
            weaponLoadoutHash: context.weaponLoadout.loadoutHash,
            profileSelectionAuthorizationHash:
              selection.selectionAuthorization.authorizationHash,
            attackKernelHash: ATTACK_KERNEL.descriptor.kernelHash,
            effectKernelHash: EFFECT_KERNEL.descriptor.kernelHash,
            lineOfSightKernelHash: LOS_KERNEL.descriptor.kernelHash,
            lineOfSightHash: plan.lineOfSight.lineOfSightHash,
            targetStationary: plan.targetStationary,
            sequenceCompletesOnApply: selection.availableProfileKeys.length === 1,
            remainingBatchCountAfterApply: selection.availableProfileKeys.length - 1,
            supportedScope:
              "one_scatter_goliath_two_visible_goliaths_two_full_cover_marines_one_stationary",
            rulesTruth: "official_goliath_scatter_sequential_batch_exact_subset",
            trainingTruth: false,
          },
        }));
      }
    }
  }
  return freezeDeep(rows.sort((left, right) => (
    `${left.selectedBatchProfileKeys.join("+")}:${left.attackProfileKey}:${left.targetId}`
      .localeCompare(
        `${right.selectedBatchProfileKeys.join("+")}:${right.attackProfileKey}:${right.targetId}`,
      )
  )));
}

function pendingAfterBatch(context, selection, profileKey, batchReceipt) {
  const priorCompleted = context.pending?.completedBatches || [];
  const completedBatches = [...priorCompleted, {
    ordinal: priorCompleted.length + 1,
    profileKey,
    targetId: batchReceipt.targetId,
    batchHash: batchReceipt.batchHash,
  }];
  const remainingBatchProfileKeys = selection.selectionAuthorization.selectedBatchProfileKeys
    .filter((key) => !completedBatches.some((batch) => batch.profileKey === key));
  const body = {
    schema: "starcraft_tmg_official_goliath_scatter_sequence_pending_v1",
    sequenceHash: selection.descriptor.sequenceHash,
    sideKey: context.piece.sideKey,
    pieceId: context.piece.id,
    weaponLoadoutHash: context.weaponLoadout.loadoutHash,
    profileSelectionAuthorizationHash:
      selection.selectionAuthorization.authorizationHash,
    sidearmUseMode: selection.selectionAuthorization.sidearmUseMode,
    originalBatchProfileKeys: [
      ...selection.selectionAuthorization.selectedBatchProfileKeys,
    ],
    remainingBatchProfileKeys,
    completedBatches,
    activeSideRetainedUntilAllBatchesResolve: true,
    otherActionsLockedOut: true,
    trainingTruth: false,
  };
  return freezeDeep({ ...body, pendingHash: hashStarcraftTmgContract(body) });
}

export function applyOfficialGoliathScatterRangedBatchV1(
  stateInput,
  actionInput,
  options = {},
) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_EXECUTOR_ID
    || actionInput.executorVersion
      !== OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_EXECUTOR_VERSION) {
    fail("GOLIATH_SCATTER_ACTION_INVALID");
  }
  const context = baseContext(stateInput, actionInput.sideKey, options);
  const candidates = enumerateOfficialGoliathScatterRangedBatchV1(stateInput, {
    sideKey: actionInput.sideKey,
    matchBinding: options.matchBinding,
  });
  const expectedCandidate = candidates.find((candidate) => (
    candidate.attackProfileKey === actionInput.attackProfileKey
      && candidate.targetId === actionInput.targetId
      && candidate.sequenceHash === actionInput.sequenceHash
  ));
  if (!expectedCandidate) fail("GOLIATH_SCATTER_ACTION_STALE");
  const expectedAction = actionFromCandidate(expectedCandidate);
  if (!isDeepStrictEqual(actionInput, expectedAction)) {
    fail("GOLIATH_SCATTER_ACTION_MISMATCH");
  }
  const selection = selectionContexts(context).find((entry) => (
    entry.descriptor.sequenceHash === actionInput.sequenceHash
  ));
  if (!selection) fail("GOLIATH_SCATTER_ACTION_STALE");
  const targetBefore = context.targetPieces.find((entry) => entry.id === actionInput.targetId);
  const plan = planBatch(context, actionInput.attackProfileKey, targetBefore);
  const resolution = ATTACK_KERNEL.resolve(plan.attackPlan, options.chanceReveals);
  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === actionInput.pieceId);
  const target = state.pieces.find((entry) => entry.id === actionInput.targetId);
  const targetModel = activeModels(target)[0];
  const targetProfile = targetCombatProfile(targetBefore, context.bindings);
  const priorDamageMarker = Number(target.damageMarker || 0);
  const incomingDamage = resolution.stages.damage.totalDamage;
  const remainingHitPoints = targetProfile.hitPoints - priorDamageMarker;
  const appliedDamage = Math.min(incomingDamage, remainingHitPoints);
  const discardedOverflowDamage = incomingDamage - appliedDamage;
  const accumulatedDamage = priorDamageMarker + appliedDamage;
  const casualty = accumulatedDamage >= targetProfile.hitPoints;
  if (casualty) {
    targetModel.isDestroyed = true;
    targetModel.isOnField = false;
    target.currentModels = 0;
    target.currentSupply = 0;
    target.damageMarker = 0;
    target.isDestroyed = true;
    target.isOnField = false;
  } else {
    target.damageMarker = accumulatedDamage;
  }
  const batchBody = {
    schema: "starcraft_tmg_official_goliath_scatter_ranged_batch_receipt_v1",
    sequenceHash: selection.descriptor.sequenceHash,
    ordinal: selection.completedBatchCount + 1,
    pieceId: piece.id,
    targetId: target.id,
    targetModelId: targetModel.id,
    profileKey: actionInput.attackProfileKey,
    profileHash: actionInput.attackProfileHash,
    profileV2Hash: actionInput.attackProfileV2Hash,
    weaponName: actionInput.weaponName,
    contributingModelIds: [...actionInput.contributingModelIds],
    selectedBatchProfileKeys: [...actionInput.selectedBatchProfileKeys],
    sidearmUseMode: actionInput.sidearmUseMode,
    profileSelectionAuthorizationHash:
      selection.selectionAuthorization.authorizationHash,
    planHash: plan.planHash,
    attackPlanHash: plan.attackPlan.planHash,
    lineOfSightHash: plan.lineOfSight.lineOfSightHash,
    resolutionHash: resolution.resolutionHash,
    lineOfSightStatus: plan.lineOfSight.lineOfSightStatus,
    indirectFireUsed: plan.attackPlan.indirectFireUsed,
    lockedInAdditionalRateOfAttack:
      plan.attackPlan.lockedInAdditionalRateOfAttack,
    effectiveRateOfAttack: plan.attackPlan.effectiveRateOfAttack,
    rangeBand: plan.attackPlan.rangeBand,
    evadeEligibilityReason: plan.attackPlan.evadeEligibilityReason,
    attackPoolDice: plan.attackPlan.effectiveRateOfAttack,
    hitCount: resolution.stages.hit.hits,
    evadeDice: resolution.stages.evade.dice,
    evadeSaves: resolution.stages.evade.saves,
    incomingDamage,
    priorDamageMarker,
    appliedDamage,
    discardedOverflowDamage,
    casualtyModelIds: casualty ? [targetModel.id] : [],
    postDamageMarker: Number(target.damageMarker || 0),
    targetDestroyed: casualty,
    stageOrder: ["declaration", "hit", "effects", "armour", "evade", "damage"],
    rulesTruth: "official_goliath_scatter_indirect_locked_visible_damage",
    trainingTruth: false,
  };
  const batchReceipt = freezeDeep({
    ...batchBody,
    batchHash: hashStarcraftTmgContract(batchBody),
  });
  const sequenceComplete = selection.availableProfileKeys.length === 1;
  if (sequenceComplete) {
    delete state.pendingRangedAttackSequence;
    piece.activatedPhases = {
      movement: false,
      assault: false,
      combat: false,
      ...(piece.activatedPhases || {}),
      assault: true,
    };
  } else {
    state.pendingRangedAttackSequence = clone(pendingAfterBatch(
      context,
      selection,
      actionInput.attackProfileKey,
      batchReceipt,
    ));
  }
  const completedBatchCount = selection.completedBatchCount + 1;
  const remainingBatchCount = sequenceComplete
    ? 0
    : state.pendingRangedAttackSequence.remainingBatchProfileKeys.length;
  const events = [{
    type: "goliath_scatter_ranged_batch_resolved",
    sideKey: actionInput.sideKey,
    pieceId: piece.id,
    targetId: target.id,
    batch: clone(batchReceipt),
    sequenceComplete,
    pendingSequenceHash: state.pendingRangedAttackSequence?.pendingHash || null,
    activeSideRetained: !sequenceComplete,
    trainingTruth: false,
  }, {
    type: sequenceComplete
      ? "goliath_scatter_sequence_completed"
      : "goliath_scatter_sequence_continues",
    sideKey: actionInput.sideKey,
    pieceId: piece.id,
    sequenceHash: selection.descriptor.sequenceHash,
    completedBatchCount,
    remainingBatchCount,
    assaultActivationCompleted: sequenceComplete,
    trainingTruth: false,
  }];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round || 1),
    phase: "assault",
    action: clone(expectedAction),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion:
      "starcraft_tmg_official_goliath_scatter_ranged_batch_transition_v1",
    executorId: OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_EXECUTOR_ID,
    executorVersion: OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expectedAction,
    batchReceipt,
    sequenceComplete,
    rulesTruth: "official_goliath_scatter_sequential_attack_batch_exact_subset",
    trainingTruth: false,
  };
}

export const OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_KERNELS = freezeDeep({
  attack: clone(ATTACK_KERNEL.descriptor),
  effect: clone(EFFECT_KERNEL.descriptor),
  lineOfSight: clone(LOS_KERNEL.descriptor),
});
