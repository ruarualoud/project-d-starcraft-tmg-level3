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
import { createOfficialAttackResolutionKernelV5 } from
  "./official-attack-resolution-kernel-v5.mjs";
import { deriveOfficialEngagementGraphV2 } from
  "./official-engagement-graph-v2.mjs";
import {
  createOfficialSidearmPinpointEffectKernelV1,
  OFFICIAL_PINPOINT_EFFECT_ATOM_ID,
  OFFICIAL_SIDEARM_EFFECT_ATOM_ID,
  OFFICIAL_SIDEARM_PINPOINT_PROFILE_KEYS,
  OFFICIAL_SIDEARM_PROFILE_KEYS,
} from "./official-sidearm-pinpoint-effect-kernel-v1.mjs";
import {
  createOfficialReplacementWeaponLoadoutV1,
  verifyOfficialReplacementWeaponLoadoutV1,
} from "./official-weapon-replacement-loadout-v1.mjs";

export const OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_ID =
  "authority.sidearm-pinpoint-ranged-batch-v1";
export const OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_ACTION_TYPE = "ranged_attack";

export const OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-11-multiple-sidearm-use:0670eabc2b38",
  "rule-atom:singleton:core-11-pinpoint-engaged-ranged-targeting:593cfa7216ad",
  "rule-atom:singleton:core-11-sidearm-independent-target:957dee96b667",
  "rule-atom:singleton:core-11-sidearm-separate-batches:124944751bb7",
  "rule-atom:singleton:core-11-sidearm-weapon-limit-override:318ae45fc7f8",
  "rule-atom:singleton:core-8-7-3-sidearm-batch:0a1cbea3fa89",
]);

export const OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_DEPENDENCY_ATOM_IDS = Object.freeze([
  "rule-atom:modified-target-number-bounds",
  "rule-atom:pierce-tag-damage",
  "rule-atom:singleton:core-11-anti-evade-modifier:030a03ac0c7a",
  "rule-atom:singleton:core-11-long-range-maximum:c5fc24657625",
  "rule-atom:singleton:core-11-modifier-target-not-result:ba0342baab13",
  "rule-atom:singleton:core-11-modifier-target-number-timing:f9150dba9358",
  "rule-atom:singleton:core-11-natural-roll-modifier-priority:d1b9fa6ee229",
  "rule-atom:singleton:core-3-4-modifier-target-and-timing:3ef35dff8a07",
  "rule-atom:singleton:core-3-6-natural-roll-boundaries:3fcbc5078b1b",
  "rule-atom:singleton:core-5-2-replacement:91b9f418d86b",
  "rule-atom:singleton:core-5-2-upgrade:191e2715a36e",
  "rule-atom:singleton:core-8-7-3-combat-tag-target-match:ac21a155485d",
  "rule-atom:singleton:core-8-7-3-contributing-model-range:c383820a3b42",
  "rule-atom:singleton:core-8-7-3-engaged-targeting:9025d57d1dfd",
  "rule-atom:singleton:core-8-7-3-model-weapon-selection:644a16ff7a70",
  "rule-atom:singleton:core-8-7-3-multiple-profile-batches:fdea86c20962",
  "rule-atom:singleton:core-8-7-3-profile-target-splitting:9e95cfd9a838",
  "rule-atom:singleton:core-8-7-3-range-measurement:4266ce5aacd0",
  "rule-atom:singleton:core-8-7-3-same-profile-batch:39a85daa0988",
  "rule-atom:singleton:core-8-7-3-sequential-batch-declaration:48523e04ae11",
  "rule-atom:singleton:core-8-7-3-target-and-weapon-stage:1f07a7d27740",
  "rule-atom:singleton:core-8-7-3-target-visible-range:4e5f1374e734",
  "rule-atom:singleton:core-8-7-3-unengaged-targeting:9b47dbcf21b5",
  "rule-atom:singleton:core-8-7-4-accumulated-total-damage:12bfa0943024",
  "rule-atom:singleton:core-8-7-4-armour-pool-roll:f0d49afb850a",
  "rule-atom:singleton:core-8-7-4-attack-pool-generation:ba4df14ee6f0",
  "rule-atom:singleton:core-8-7-4-attack-pool-roll:e76d71a66486",
  "rule-atom:singleton:core-8-7-4-casualty-removal-threshold:813ee5b154f9",
  "rule-atom:singleton:core-8-7-4-casualty-visible-cap:d235242004ed",
  "rule-atom:singleton:core-8-7-4-damage-pool-resolution:bf5700924e14",
  "rule-atom:singleton:core-8-7-4-discard-nonvisible-overflow:7066cac1175c",
  "rule-atom:singleton:core-8-7-4-evade-before-damage:91d84abadc6a",
  "rule-atom:singleton:core-8-7-4-evade-eligibility:22a3e7f37955",
  "rule-atom:singleton:core-8-7-4-evade-result:491da6621715",
  "rule-atom:singleton:core-8-7-4-hit-success-transfer:cdb55aba4256",
  "rule-atom:singleton:core-8-7-4-residual-damage-marker:7f5934bce27a",
  "rule-atom:singleton:core-8-7-4-surge-match-bypass:96312207a51a",
  "rule-atom:singleton:core-9-1-7-replacement-weapon-effect:cfcd72d74c46",
  "rule-atom:singleton:core-9-1-7-unit-wide-upgrade-effect:3ecc0ca27ffc",
  "rule-atom:surge-target-combat-tag-match",
  "rule-atom:weapon-damage-characteristic",
  "rule-atom:weapon-damage-pool-calculation",
]);

export const OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_DEPENDENCY_ATOM_IDS,
    ...OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));
export const OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_ATOM_IDS =
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_ACTION_ATOM_IDS;

const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const CURRENT_SOURCE_SNAPSHOT_HASH =
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78";
const CURRENT_DATASET_HASH =
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a";
const GOLIATH_RECORD_KEY = "army_units:goliath";
const GOLIATH_SOURCE_RECORD_HASH =
  "e36b38cc46ff9a2fecce9f1fa7bc087923fca2fc29fad2d9f0eead479a68ab16";
const GOLIATH_PAYLOAD_HASH =
  "168f9cdc1199f698cc74fe882e98b8d17106a14c7c12acc903be19a3b1bf946d";
const MARINE_RECORD_KEY = "army_units:marine";
const MARINE_SOURCE_RECORD_HASH =
  "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215";
const MARINE_PAYLOAD_HASH =
  "33cbc0b9e9e17ca95f1cd639f78d81e8ec7606f035642e32fdf7064bcc49d1e6";
const PROFILE_HASHES_V1 = Object.freeze({
  "army_units:goliath::assault::Autocannon":
    "3be2ef5234bccb909d9119fc83130718770de31a5f7cf0348e9a573512ea8ce3",
  "army_units:goliath::assault::Haywire Missiles":
    "af5701e1dfac62a58972ede948f7ac9bd7001214ba4ad1caf5a69b4b9b1a94e4",
  "army_units:goliath::assault::Underbelly Machine Gun":
    "c7574f07ba693d5c032d05f4cebd67cd665c62f390ce8557582bada9690b745e",
});
const PROFILE_HASHES_V2 = Object.freeze({
  "army_units:goliath::assault::Autocannon":
    "67012ccc1b3896877521a87d8533435c698fd448e0b0c6685d26fca63e65634e",
  "army_units:goliath::assault::Haywire Missiles":
    "88fd9cec9593fdad96f676eb400305e4f6e28434368dcc7a9ccca588ded877b2",
  "army_units:goliath::assault::Underbelly Machine Gun":
    "ff152c91ff0190c047072d14888fc912fc057071ac4a4d0d38c710c390cfc3f9",
});
const GOLIATH_BASE_MILLI_INCHES = 3150;
const MARINE_BASE_MILLI_INCHES = 1260;
const NUMERIC_KERNEL = createOfficialAttackResolutionKernelV5();
const EFFECT_KERNEL = createOfficialSidearmPinpointEffectKernelV1();

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
  fail("SIDEARM_PINPOINT_SIDE_REQUIRED");
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

function runtimeHash(matchBinding) {
  const value = String(matchBinding?.rulesRuntimeBinding?.runtimeHash || "").trim();
  if (!HASH_PATTERN.test(value)) fail("SIDEARM_PINPOINT_RUNTIME_BINDING_REQUIRED");
  return value;
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
    fail("SIDEARM_PINPOINT_LATEST_OFFICIAL_DATA_REQUIRED");
  }
  verifyOfficialAttackProfileCatalogueV1(gameplayDataBundle.attackProfileCatalogue);
  const catalogueV2 = createOfficialAttackProfileCatalogueV2({
    previousCatalogue: gameplayDataBundle.attackProfileCatalogue,
  });
  const profilesV1 = {};
  const profilesV2 = {};
  for (const profileKey of OFFICIAL_SIDEARM_PINPOINT_PROFILE_KEYS) {
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
      fail("SIDEARM_PINPOINT_OFFICIAL_PROFILE_DRIFT", profileKey);
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
    fail("SIDEARM_PINPOINT_COMBAT_PROFILE_DRIFT");
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

function verifyGoliath(piece, sideKey, bindings, attacker) {
  if (!attacker && piece?.isDestroyed === true) {
    if (piece.sideKey !== sideKey
      || piece.officialUnitRecordKey !== GOLIATH_RECORD_KEY
      || piece.sourceRecordHash !== GOLIATH_SOURCE_RECORD_HASH
      || piece.isOnField !== false
      || Number(piece.currentModels) !== 0
      || Number(piece.currentSupply) !== 0
      || Number(piece.damageMarker || 0) !== 0
      || piece.models?.length !== 1
      || piece.models[0].isDestroyed !== true
      || piece.models[0].isOnField !== false) {
      fail("SIDEARM_PINPOINT_DESTROYED_TARGET_INVALID", String(piece?.id || ""));
    }
    return piece;
  }
  if (!object(piece)
    || piece.sideKey !== sideKey
    || piece.officialUnitRecordKey !== GOLIATH_RECORD_KEY
    || piece.sourceRecordHash !== GOLIATH_SOURCE_RECORD_HASH
    || piece.combatTag !== "ground"
    || !activePiece(piece)
    || Number(piece.currentModels) !== 1
    || Number(piece.currentSupply) !== 2
    || !isDeepStrictEqual(piece.statuses || [], [])
    || !isDeepStrictEqual(piece.combatEffects || [], [])
    || !isDeepStrictEqual(piece.assaultEffects || [], [])
    || activeModels(piece).length !== 1
    || (attacker
      ? (!isDeepStrictEqual(piece.selectedUpgradeNames, ["Haywire Missiles"])
        || piece.activatedPhases?.assault === true)
      : !isDeepStrictEqual(piece.selectedUpgradeNames || [], []))) {
    fail(attacker
      ? "SIDEARM_PINPOINT_ATTACKER_SCOPE_UNSUPPORTED"
      : "SIDEARM_PINPOINT_GOLIATH_TARGET_SCOPE_UNSUPPORTED", String(piece?.id || ""));
  }
  exactRoundModel(
    activeModels(piece)[0],
    GOLIATH_BASE_MILLI_INCHES,
    attacker
      ? "SIDEARM_PINPOINT_ATTACKER_MODEL_INVALID"
      : "SIDEARM_PINPOINT_GOLIATH_TARGET_MODEL_INVALID",
  );
  const damage = Number(piece.damageMarker || 0);
  if (!Number.isSafeInteger(damage) || damage < 0 || damage >= bindings.goliath.hitPoints) {
    fail("SIDEARM_PINPOINT_TARGET_DAMAGE_INVALID", piece.id);
  }
  return piece;
}

function verifyMarine(piece, sideKey, bindings, allowDestroyed = false) {
  if (allowDestroyed && piece?.isDestroyed === true) {
    if (piece.sideKey !== sideKey
      || piece.officialUnitRecordKey !== MARINE_RECORD_KEY
      || piece.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
      || piece.isOnField !== false
      || Number(piece.currentModels) !== 0
      || Number(piece.currentSupply) !== 0
      || Number(piece.damageMarker || 0) !== 0
      || piece.models?.length !== 1
      || piece.models[0].isDestroyed !== true
      || piece.models[0].isOnField !== false) {
      fail("SIDEARM_PINPOINT_DESTROYED_TARGET_INVALID", String(piece?.id || ""));
    }
    return piece;
  }
  if (!object(piece)
    || piece.sideKey !== sideKey
    || piece.officialUnitRecordKey !== MARINE_RECORD_KEY
    || piece.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || piece.combatTag !== "ground"
    || !activePiece(piece)
    || Number(piece.currentModels) !== 1
    || Number(piece.currentSupply) !== 0
    || !isDeepStrictEqual(piece.selectedUpgradeNames || [], [])
    || !isDeepStrictEqual(piece.statuses || [], [])
    || !isDeepStrictEqual(piece.combatEffects || [], [])
    || !isDeepStrictEqual(piece.assaultEffects || [], [])
    || activeModels(piece).length !== 1) {
    fail("SIDEARM_PINPOINT_MARINE_SCOPE_UNSUPPORTED", String(piece?.id || ""));
  }
  exactRoundModel(
    activeModels(piece)[0],
    MARINE_BASE_MILLI_INCHES,
    "SIDEARM_PINPOINT_MARINE_MODEL_INVALID",
  );
  const damage = Number(piece.damageMarker || 0);
  if (!Number.isSafeInteger(damage) || damage < 0 || damage >= bindings.marine.hitPoints) {
    fail("SIDEARM_PINPOINT_TARGET_DAMAGE_INVALID", piece.id);
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

function sequenceBody(sequence) {
  return without(sequence, ["pendingHash"]);
}

function sequenceDescriptor(context, selectionAuthorization) {
  const body = {
    schema: "starcraft_tmg_official_sidearm_ranged_sequence_descriptor_v1",
    sideKey: context.piece.sideKey,
    pieceId: context.piece.id,
    weaponLoadoutHash: context.weaponLoadout.loadoutHash,
    profileSelectionAuthorizationHash: selectionAuthorization.authorizationHash,
    selectedBatchProfileKeys: [...selectionAuthorization.selectedBatchProfileKeys],
    sidearmUseMode: selectionAuthorization.sidearmUseMode,
    sourceSnapshotHash: context.bindings.gameplayDataBundle.sourceSnapshotHash,
    normalizedDatasetHash: context.bindings.gameplayDataBundle.normalizedDatasetHash,
    attackProfileCatalogueHash: context.bindings.catalogueV2.catalogueHash,
    rulesRuntimeHash: context.bindings.runtimeHash,
  };
  return freezeDeep({ ...body, sequenceHash: hashStarcraftTmgContract(body) });
}

function verifyPendingSequence(state, context) {
  const pending = state.pendingRangedAttackSequence;
  if (!object(pending)
    || pending.schema !== "starcraft_tmg_official_sidearm_ranged_sequence_pending_v1"
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
      !OFFICIAL_SIDEARM_PINPOINT_PROFILE_KEYS.includes(key)
    ))
    || pending.completedBatches.some((batch, index) => (
      batch.ordinal !== index + 1
        || !pending.originalBatchProfileKeys.includes(batch.profileKey)
        || !HASH_PATTERN.test(String(batch.batchHash || ""))
    ))
    || pending.remainingBatchProfileKeys.some((key) => (
      !pending.originalBatchProfileKeys.includes(key)
    ))) {
    fail("SIDEARM_PINPOINT_PENDING_SEQUENCE_INVALID");
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
    fail("SIDEARM_PINPOINT_PENDING_SEQUENCE_INVALID");
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
    fail("SIDEARM_PINPOINT_PENDING_SEQUENCE_INVALID");
  }
  return { pending, selectionAuthorization, descriptor };
}

function baseGapMilliInches(attacker, attackerDiameter, target, targetDiameter) {
  return Math.max(0, Math.round(Math.hypot(
    milli(target.xInches, "SIDEARM_PINPOINT_MODEL_GEOMETRY_INVALID")
      - milli(attacker.xInches, "SIDEARM_PINPOINT_MODEL_GEOMETRY_INVALID"),
    milli(target.yInches, "SIDEARM_PINPOINT_MODEL_GEOMETRY_INVALID")
      - milli(attacker.yInches, "SIDEARM_PINPOINT_MODEL_GEOMETRY_INVALID"),
  ) - (attackerDiameter / 2) - (targetDiameter / 2)));
}

function numericProfile(profile) {
  const body = clone(without(profile, ["profileHash"]));
  body.profileKey = `${profile.profileKey}::sidearm-pinpoint-numeric`;
  body.effects = body.effects.filter((entry) => ![
    OFFICIAL_PINPOINT_EFFECT_ATOM_ID,
    OFFICIAL_SIDEARM_EFFECT_ATOM_ID,
  ].includes(entry.effectAtomId));
  return freezeDeep({ ...body, profileHash: hashStarcraftTmgContract(body) });
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
  if (!profile.targetTags.some((tag) => targetProfile.combatTags.includes(tag))) {
    fail("SIDEARM_PINPOINT_TARGET_TAG_MISMATCH");
  }
  const baseGap = baseGapMilliInches(
    attackerModel,
    GOLIATH_BASE_MILLI_INCHES,
    targetModel,
    targetBaseDiameter(target),
  );
  const distanceInches = Number((baseGap / 1000).toFixed(3));
  if (distanceInches > profile.range.normalRangeInches) {
    fail("SIDEARM_PINPOINT_TARGET_OUT_OF_RANGE");
  }
  const attackerEngaged = context.graph.engagedUnitIds.includes(context.piece.id);
  const targetEngaged = context.graph.engagedUnitIds.includes(target.id);
  if (attackerEngaged) fail("SIDEARM_PINPOINT_ATTACKER_MUST_BE_UNENGAGED");
  const standardTargetEligible = !targetEngaged;
  let pinpointAuthorization = null;
  if (!standardTargetEligible) {
    pinpointAuthorization = EFFECT_KERNEL.authorizePinpointTarget({
      profile,
      attackerEngaged,
      targetEngaged,
      standardTargetEligible,
    });
  }
  const basePlan = NUMERIC_KERNEL.plan({
    profile: numericProfile(profile),
    target: {
      armourThreshold: targetProfile.armourThreshold,
      evadeThreshold: targetProfile.evadeThreshold,
      combatTags: targetProfile.combatTags,
    },
    distanceInches,
    evadeEligibility: targetEngaged
      ? { eligible: true, reason: "target_engaged_and_suffering_ranged_damage" }
      : { eligible: false, reason: "none" },
  });
  const body = {
    schema: "starcraft_tmg_official_sidearm_pinpoint_ranged_batch_plan_v1",
    sequencePieceId: context.piece.id,
    targetId: target.id,
    targetModelId: targetModel.id,
    officialProfileKey: profile.profileKey,
    officialProfileHash: profile.profileHash,
    officialProfileV2Hash: context.bindings.profilesV2[profileKey].profileHash,
    numericProfileHash: basePlan.profileHash,
    attackerModelId: attackerModel.id,
    distanceInches,
    targetEngaged,
    standardTargetEligible,
    pinpointAuthorizationHash: pinpointAuthorization?.authorizationHash || null,
    lineOfSight: {
      projection: "top_down",
      trace: "base_to_base",
      terrainCount: 0,
      visible: true,
    },
    basePlan,
    chance: clone(basePlan.chance),
    rulesTruth: "official_goliath_sidearm_pinpoint_exact_target_and_numeric_subset",
    trainingTruth: false,
  };
  return freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
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

function baseContext(state, sideKey, options = {}) {
  if (!object(state)
    || !SIDE_KEYS.includes(sideKey)
    || state.phase !== "assault"
    || state.activeSideKey !== sideKey
    || state.players?.[sideKey]?.passedPhases?.assault === true
    || state.gameOver === true
    || state.terminal === true
    || !Array.isArray(state.pieces)
    || state.pieces.length !== 5
    || !object(state.board)
    || !isDeepStrictEqual(state.board.terrain || [], [])
    || !isDeepStrictEqual(state.board.accessPoints || [], [])
    || !isDeepStrictEqual(state.board.effectMarkers || [], [])) {
    fail("SIDEARM_PINPOINT_STATE_SCOPE_UNSUPPORTED");
  }
  const bindings = officialBindings(state, options.matchBinding);
  const pendingInput = isOfficialSidearmRangedSequencePendingV1(state);
  const friendly = state.pieces.filter((piece) => piece.sideKey === sideKey);
  const enemies = state.pieces.filter((piece) => piece.sideKey === otherSide(sideKey));
  const attacker = friendly.find((piece) => (
    piece.officialUnitRecordKey === GOLIATH_RECORD_KEY
  ));
  const alliedMarine = friendly.find((piece) => (
    piece.officialUnitRecordKey === MARINE_RECORD_KEY
  ));
  const enemyMarine = enemies.find((piece) => (
    piece.officialUnitRecordKey === MARINE_RECORD_KEY
  ));
  const enemyGoliaths = enemies.filter((piece) => (
    piece.officialUnitRecordKey === GOLIATH_RECORD_KEY
  ));
  if (!attacker
    || !alliedMarine
    || !enemyMarine
    || friendly.length !== 2
    || enemies.length !== 3
    || enemyGoliaths.length !== 2) {
    fail("SIDEARM_PINPOINT_EXACT_UNITS_REQUIRED");
  }
  verifyGoliath(attacker, sideKey, bindings, true);
  verifyMarine(alliedMarine, sideKey, bindings);
  verifyMarine(enemyMarine, otherSide(sideKey), bindings, pendingInput);
  for (const target of enemyGoliaths) {
    verifyGoliath(target, otherSide(sideKey), bindings, false);
  }
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
    OFFICIAL_SIDEARM_PINPOINT_PROFILE_KEYS)) {
    fail("SIDEARM_PINPOINT_WEAPON_LOADOUT_INVALID");
  }
  const graph = deriveOfficialEngagementGraphV2(state);
  const expectedEngagementPreserved = activePiece(enemyMarine);
  if (graph.engagedUnitIds.includes(attacker.id)
    || graph.engagedUnitIds.includes(enemyGoliaths[0].id)
    || graph.engagedUnitIds.includes(enemyGoliaths[1].id)
    || graph.engagedUnitIds.includes(alliedMarine.id) !== expectedEngagementPreserved
    || graph.engagedUnitIds.includes(enemyMarine.id) !== expectedEngagementPreserved
    || graph.modelEdges.length !== (expectedEngagementPreserved ? 1 : 0)) {
    fail("SIDEARM_PINPOINT_ENGAGEMENT_FIXTURE_INVALID");
  }
  const context = {
    bindings,
    piece: attacker,
    alliedMarine,
    enemyMarine,
    targetPieces: [enemyMarine, ...enemyGoliaths]
      .sort((left, right) => left.id.localeCompare(right.id)),
    weaponLoadout,
    graph,
  };
  if (isOfficialSidearmRangedSequencePendingV1(state)) {
    return { ...context, ...verifyPendingSequence(state, context) };
  }
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
  return powerSet(OFFICIAL_SIDEARM_PINPOINT_PROFILE_KEYS).map((selection) => {
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

function canonicalAction(context, selection, profileKey, target, plan) {
  const profile = context.bindings.profilesV1[profileKey];
  return {
    actionType: OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_ACTION_TYPE,
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
    chance: clone(plan.chance),
    ruleAtomIds: [...OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_ACTION_ATOM_IDS],
    executorId: OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_ID,
    executorVersion: OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_VERSION,
  };
}

export function isOfficialSidearmRangedSequencePendingV1(state) {
  return state?.pendingRangedAttackSequence?.schema
    === "starcraft_tmg_official_sidearm_ranged_sequence_pending_v1";
}

export function enumerateOfficialSidearmPinpointRangedBatchV1(state, options = {}) {
  const sideKey = String(options.sideKey || state?.activeSideKey || "").trim();
  let context;
  try {
    context = baseContext(state, sideKey, options);
  } catch (error) {
    if (isOfficialSidearmRangedSequencePendingV1(state)) throw error;
    return options.includeDisabled === true ? [freezeDeep({
      actionType: OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_ACTION_TYPE,
      sideKey,
      phase: "assault",
      pieceId: "",
      targetId: "",
      weaponName: "Underbelly Machine Gun",
      ruleAtomIds: [...OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_ACTION_ATOM_IDS],
      executorId: OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_ID,
      executorVersion: OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_VERSION,
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
          score: context.pending ? 245 : 235,
          details: {
            sourceRule: "official_core_8_7_3_8_7_4_and_11_sidearm_pinpoint",
            weaponLoadoutHash: context.weaponLoadout.loadoutHash,
            profileSelectionAuthorizationHash:
              selection.selectionAuthorization.authorizationHash,
            numericKernelHash: NUMERIC_KERNEL.descriptor.kernelHash,
            sidearmPinpointKernelHash: EFFECT_KERNEL.descriptor.kernelHash,
            engagementGraphHash: context.graph.graphHash,
            batchOrdinal: selection.completedBatchCount + 1,
            sequenceCompletesOnApply: selection.availableProfileKeys.length === 1,
            remainingBatchCountAfterApply: selection.availableProfileKeys.length - 1,
            targetEngaged: plan.targetEngaged,
            pinpointOverrideApplied: Boolean(plan.pinpointAuthorizationHash),
            selectedSidearmCount:
              selection.selectionAuthorization.selectedSidearmProfileKeys.length,
            allEquippedSidearmsSelected:
              selection.selectionAuthorization.allEquippedSidearmsSelected,
            supportedScope:
              "one_goliath_haywire_loadout_two_sidearms_one_engaged_marine_two_unengaged_goliaths_no_terrain",
            rulesTruth: "official_sidearm_pinpoint_sequential_batch_exact_subset",
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
    schema: "starcraft_tmg_official_sidearm_ranged_sequence_pending_v1",
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

export function applyOfficialSidearmPinpointRangedBatchV1(
  stateInput,
  actionInput,
  options = {},
) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_ID
    || actionInput.executorVersion
      !== OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_VERSION) {
    fail("SIDEARM_PINPOINT_ACTION_INVALID");
  }
  const context = baseContext(stateInput, actionInput.sideKey, options);
  const candidates = enumerateOfficialSidearmPinpointRangedBatchV1(stateInput, {
    sideKey: actionInput.sideKey,
    matchBinding: options.matchBinding,
  });
  const expectedCandidate = candidates.find((candidate) => (
    candidate.attackProfileKey === actionInput.attackProfileKey
      && candidate.targetId === actionInput.targetId
      && candidate.sequenceHash === actionInput.sequenceHash
  ));
  if (!expectedCandidate) fail("SIDEARM_PINPOINT_ACTION_STALE");
  const expectedAction = actionFromCandidate(expectedCandidate);
  if (!isDeepStrictEqual(actionInput, expectedAction)) {
    fail("SIDEARM_PINPOINT_ACTION_MISMATCH");
  }
  const selection = selectionContexts(context).find((entry) => (
    entry.descriptor.sequenceHash === actionInput.sequenceHash
  ));
  if (!selection) fail("SIDEARM_PINPOINT_ACTION_STALE");
  const targetBefore = context.targetPieces.find((entry) => entry.id === actionInput.targetId);
  const plan = planBatch(context, actionInput.attackProfileKey, targetBefore);
  const resolution = NUMERIC_KERNEL.resolve(plan.basePlan, options.chanceReveals);
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
    schema: "starcraft_tmg_official_sidearm_pinpoint_ranged_batch_receipt_v1",
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
    pinpointAuthorizationHash: plan.pinpointAuthorizationHash,
    planHash: plan.planHash,
    numericPlanHash: plan.basePlan.planHash,
    resolutionHash: resolution.resolutionHash,
    attackPoolDice: plan.basePlan.effectiveRateOfAttack,
    hitCount: resolution.stages.hit.hits,
    incomingDamage,
    priorDamageMarker,
    appliedDamage,
    discardedOverflowDamage,
    casualtyModelIds: casualty ? [targetModel.id] : [],
    postDamageMarker: Number(target.damageMarker || 0),
    targetDestroyed: casualty,
    stageOrder: ["declaration", "hit", "effects", "armour", "evade", "damage"],
    rulesTruth: "official_sidearm_pinpoint_sequential_batch_and_visible_damage",
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
    type: "sidearm_pinpoint_ranged_batch_resolved",
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
      ? "sidearm_ranged_sequence_completed"
      : "sidearm_ranged_sequence_continues",
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
      "starcraft_tmg_official_sidearm_pinpoint_ranged_batch_transition_v1",
    executorId: OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_ID,
    executorVersion: OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expectedAction,
    batchReceipt,
    sequenceComplete,
    rulesTruth: "official_sidearm_pinpoint_sequential_attack_batch_exact_subset",
    trainingTruth: false,
  };
}

export const OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_KERNELS = freezeDeep({
  numeric: clone(NUMERIC_KERNEL.descriptor),
  sidearmPinpoint: clone(EFFECT_KERNEL.descriptor),
});
