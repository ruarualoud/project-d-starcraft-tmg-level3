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
import { createOfficialSpecialistBatchEffectKernelV1 } from
  "./official-specialist-batch-effect-kernel-v1.mjs";

export const OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_ID =
  "authority.specialist-ranged-batch-v1";
export const OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_SPECIALIST_RANGED_BATCH_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_SPECIALIST_RANGED_BATCH_ACTION_TYPE = "ranged_attack";

export const OFFICIAL_SPECIALIST_RANGED_BATCH_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-8-7-3-multiple-profile-batches:fdea86c20962",
  "rule-atom:singleton:core-8-7-3-profile-target-splitting:9e95cfd9a838",
  "rule-atom:singleton:core-8-7-3-sequential-batch-declaration:48523e04ae11",
  "rule-atom:singleton:core-8-7-4-casualty-visible-cap:d235242004ed",
  "rule-atom:singleton:core-8-7-4-discard-nonvisible-overflow:7066cac1175c",
  "rule-atom:singleton:core-9-1-7-specialist-separate-attack-batch:85e56fc370d2",
]);

export const OFFICIAL_SPECIALIST_RANGED_BATCH_DEPENDENCY_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-8-7-3-combat-tag-target-match:ac21a155485d",
  "rule-atom:singleton:core-8-7-3-contributing-model-range:c383820a3b42",
  "rule-atom:singleton:core-8-7-3-model-weapon-selection:644a16ff7a70",
  "rule-atom:singleton:core-8-7-3-range-measurement:4266ce5aacd0",
  "rule-atom:singleton:core-8-7-3-same-profile-batch:39a85daa0988",
  "rule-atom:singleton:core-8-7-3-target-and-weapon-stage:1f07a7d27740",
  "rule-atom:singleton:core-8-7-3-target-visible-range:4e5f1374e734",
  "rule-atom:singleton:core-8-7-4-accumulated-total-damage:12bfa0943024",
  "rule-atom:singleton:core-8-7-4-armour-pool-roll:f0d49afb850a",
  "rule-atom:singleton:core-8-7-4-attack-pool-generation:ba4df14ee6f0",
  "rule-atom:singleton:core-8-7-4-attack-pool-roll:e76d71a66486",
  "rule-atom:singleton:core-8-7-4-casualty-removal-threshold:813ee5b154f9",
  "rule-atom:singleton:core-8-7-4-damage-pool-resolution:bf5700924e14",
  "rule-atom:singleton:core-8-7-4-hit-success-transfer:cdb55aba4256",
  "rule-atom:singleton:core-8-7-4-residual-damage-marker:7f5934bce27a",
  "rule-atom:singleton:core-8-7-4-surge-match-bypass:96312207a51a",
  "rule-atom:singleton:core-9-1-7-specialist-distinct-assignment:b7eea08d049e",
  "rule-atom:singleton:core-9-1-7-specialist-nomination:2fd9d6fc1e8c",
  "rule-atom:singleton:core-9-1-7-specialist-single-carrier:81a9cd2746ac",
]);

export const OFFICIAL_SPECIALIST_RANGED_BATCH_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_SPECIALIST_RANGED_BATCH_DEPENDENCY_ATOM_IDS,
    ...OFFICIAL_SPECIALIST_RANGED_BATCH_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));
export const OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_ATOM_IDS =
  OFFICIAL_SPECIALIST_RANGED_BATCH_ACTION_ATOM_IDS;

const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const CURRENT_SOURCE_SNAPSHOT_HASH =
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78";
const CURRENT_DATASET_HASH =
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a";
const MARINE_RECORD_KEY = "army_units:marine";
const MARINE_SOURCE_RECORD_HASH =
  "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215";
const MARINE_PAYLOAD_HASH =
  "33cbc0b9e9e17ca95f1cd639f78d81e8ec7606f035642e32fdf7064bcc49d1e6";
const GOLIATH_RECORD_KEY = "army_units:goliath";
const GOLIATH_SOURCE_RECORD_HASH =
  "e36b38cc46ff9a2fecce9f1fa7bc087923fca2fc29fad2d9f0eead479a68ab16";
const GOLIATH_PAYLOAD_HASH =
  "168f9cdc1199f698cc74fe882e98b8d17106a14c7c12acc903be19a3b1bf946d";
const C14_PROFILE_KEY = "army_units:marine::assault::C-14 rifle";
const C14_PROFILE_HASH_V1 =
  "a58fc5f16efc1096b4db052ad6fe92206a251e8d38c1bff3a4b02cd37fd802ba";
const C14_PROFILE_HASH_V2 =
  "a20160b32f9965e1b23c17b6d0fdbd3995796dedad0277a52fd15bf194cb7229";
const AGG12_PROFILE_KEY = "army_units:marine::assault::AGG-12";
const AGG12_PROFILE_HASH_V1 =
  "408ec53bd4914dab92dc7816e0f21109187e871fec61229f6251745db74db5be";
const AGG12_PROFILE_HASH_V2 =
  "ab0ac32f359ecccf3ae1110c663f475bcff182564d9c138f7c23863bab8ad282";
const MARINE_BASE_MILLI_INCHES = 1260;
const GOLIATH_BASE_MILLI_INCHES = 3150;
const NUMERIC_KERNEL = createOfficialAttackResolutionKernelV5();
const SPECIALIST_KERNEL = createOfficialSpecialistBatchEffectKernelV1();

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
  return sideKey === "player1" ? "player2" : "player1";
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
  if (!HASH_PATTERN.test(value)) fail("SPECIALIST_BATCH_RUNTIME_BINDING_REQUIRED");
  return value;
}

function verifyExactAttackProfile(profile, expected) {
  if (profile.profileKey !== expected.profileKey
    || profile.profileHash !== expected.profileHash
    || profile.recordKey !== MARINE_RECORD_KEY
    || profile.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || profile.payloadHash !== MARINE_PAYLOAD_HASH
    || profile.phase !== "assault"
    || profile.weaponName !== expected.weaponName
    || profile.rateOfAttack !== 2
    || profile.range?.normalRangeInches !== 12
    || profile.hitThreshold !== 3
    || profile.damage !== 1) {
    fail("SPECIALIST_BATCH_OFFICIAL_PROFILE_DRIFT", expected.weaponName);
  }
  return profile;
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
    fail("SPECIALIST_BATCH_LATEST_OFFICIAL_DATA_REQUIRED");
  }
  verifyOfficialAttackProfileCatalogueV1(gameplayDataBundle.attackProfileCatalogue);
  const catalogueV2 = createOfficialAttackProfileCatalogueV2({
    previousCatalogue: gameplayDataBundle.attackProfileCatalogue,
  });
  const c14V1 = verifyExactAttackProfile(getOfficialAttackProfileV1(
    gameplayDataBundle.attackProfileCatalogue,
    C14_PROFILE_KEY,
  ), { profileKey: C14_PROFILE_KEY, profileHash: C14_PROFILE_HASH_V1, weaponName: "C-14 rifle" });
  const agg12V1 = verifyExactAttackProfile(getOfficialAttackProfileV1(
    gameplayDataBundle.attackProfileCatalogue,
    AGG12_PROFILE_KEY,
  ), { profileKey: AGG12_PROFILE_KEY, profileHash: AGG12_PROFILE_HASH_V1, weaponName: "AGG-12" });
  const c14V2 = getOfficialAttackProfileV2(catalogueV2, C14_PROFILE_KEY);
  const agg12V2 = getOfficialAttackProfileV2(catalogueV2, AGG12_PROFILE_KEY);
  if (c14V2.profileHash !== C14_PROFILE_HASH_V2
    || c14V2.previousProfileHash !== c14V1.profileHash
    || agg12V2.profileHash !== AGG12_PROFILE_HASH_V2
    || agg12V2.previousProfileHash !== agg12V1.profileHash) {
    fail("SPECIALIST_BATCH_PROFILE_VERSION_BINDING_INVALID");
  }
  const marine = getOfficialCombatProfileV1(
    gameplayDataBundle.combatProfileBundle,
    MARINE_RECORD_KEY,
  );
  const goliath = getOfficialCombatProfileV1(
    gameplayDataBundle.combatProfileBundle,
    GOLIATH_RECORD_KEY,
  );
  if (marine.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || marine.payloadHash !== MARINE_PAYLOAD_HASH
    || goliath.sourceRecordHash !== GOLIATH_SOURCE_RECORD_HASH
    || goliath.payloadHash !== GOLIATH_PAYLOAD_HASH
    || goliath.hitPoints !== 10
    || goliath.armourThreshold !== 4
    || goliath.evadeThreshold !== null
    || goliath.shield !== 0
    || !isDeepStrictEqual(goliath.combatTags, ["armoured", "ground", "mechanical"])) {
    fail("SPECIALIST_BATCH_COMBAT_PROFILE_DRIFT");
  }
  return {
    gameplayDataBundle,
    catalogueV2,
    profilesV1: { [C14_PROFILE_KEY]: c14V1, [AGG12_PROFILE_KEY]: agg12V1 },
    profilesV2: { [C14_PROFILE_KEY]: c14V2, [AGG12_PROFILE_KEY]: agg12V2 },
    marine,
    goliath,
    runtimeHash: runtimeHash(matchBinding),
  };
}

function exactRoundModel(model, expectedDiameter, code) {
  if (!object(model)
    || model.isOnField === false
    || model.isDestroyed === true
    || model.baseShape !== "round"
    || milli(model.baseWidthInches, code) !== expectedDiameter
    || milli(model.baseDepthInches, code) !== expectedDiameter
    || model.elevation !== "ground"
    || !isDeepStrictEqual(model.supportTerrainIds, [])
    || !isDeepStrictEqual(model.adjacentAccessPointIds, [])) {
    fail(code, String(model?.id || ""));
  }
  milli(model.xInches, code);
  milli(model.yInches, code);
  return model;
}

function verifySpecialistLoadout(piece, bindings) {
  const loadout = piece.specialistLoadout;
  if (!object(loadout)
    || piece.rosterLoadoutSealed !== true
    || piece.specialistLoadoutHash !== loadout.specialistLoadoutHash
    || loadout.specialistLoadoutHash
      !== hashStarcraftTmgContract(without(loadout, ["specialistLoadoutHash"]))
    || loadout.recordKey !== MARINE_RECORD_KEY
    || loadout.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || loadout.payloadHash !== MARINE_PAYLOAD_HASH
    || loadout.attackProfileCatalogueHash !== bindings.catalogueV2.catalogueHash
    || loadout.gameplayDataBundleHash !== bindings.gameplayDataBundle.gameplayDataBundleHash
    || loadout.rulesRuntimeHash !== bindings.runtimeHash
    || loadout.currentModels !== 6
    || loadout.currentSupply !== 1
    || loadout.attackBatchExecutionAuthorized !== false
    || loadout.attackBatchStatus !== "review_required"
    || loadout.sidearmExecutionAuthorized !== false
    || loadout.indirectFireExecutionAuthorized !== false
    || loadout.repositoryFallbackAllowed !== false
    || loadout.trainingTruth !== false) {
    fail("SPECIALIST_BATCH_SEALED_LOADOUT_INVALID");
  }
  return loadout;
}

function profileGroups(piece, bindings) {
  const loadout = verifySpecialistLoadout(piece, bindings);
  const loadoutByModel = new Map(loadout.modelLoadouts.map((entry) => [entry.modelId, entry]));
  const groups = new Map([[C14_PROFILE_KEY, []], [AGG12_PROFILE_KEY, []]]);
  for (const model of activeModels(piece)) {
    exactRoundModel(model, MARINE_BASE_MILLI_INCHES, "SPECIALIST_BATCH_MARINE_MODEL_INVALID");
    const sealed = loadoutByModel.get(model.id);
    if (!sealed
      || !Array.isArray(model.assaultWeaponProfileKeys)
      || !Array.isArray(model.assaultWeaponNames)
      || model.assaultWeaponProfileKeys.length !== 1
      || model.assaultWeaponNames.length !== 1
      || sealed.assaultWeapons.length !== 1
      || model.assaultWeaponProfileKeys[0] !== sealed.assaultWeapons[0].profileKey
      || model.assaultWeaponNames[0] !== sealed.assaultWeapons[0].weaponName
      || !groups.has(model.assaultWeaponProfileKeys[0])) {
      fail("SPECIALIST_BATCH_MODEL_WEAPON_SELECTION_INVALID", model.id);
    }
    groups.get(model.assaultWeaponProfileKeys[0]).push(model.id);
  }
  const rows = [...groups.entries()].map(([profileKey, modelIds]) => ({
    profileKey,
    profileHash: bindings.profilesV1[profileKey].profileHash,
    profileV2Hash: bindings.profilesV2[profileKey].profileHash,
    weaponName: bindings.profilesV1[profileKey].weaponName,
    contributingModelIds: modelIds.sort((left, right) => left.localeCompare(right)),
  })).sort((left, right) => left.profileKey.localeCompare(right.profileKey));
  const c14 = rows.find((row) => row.profileKey === C14_PROFILE_KEY);
  const agg12 = rows.find((row) => row.profileKey === AGG12_PROFILE_KEY);
  if (c14.contributingModelIds.length !== 5 || agg12.contributingModelIds.length !== 1) {
    fail("SPECIALIST_BATCH_PROFILE_GROUP_DENOMINATOR_INVALID");
  }
  const authorization = SPECIALIST_KERNEL.authorize({
    profile: bindings.profilesV1[AGG12_PROFILE_KEY],
    specialistLoadout: loadout,
    contributingModelIds: agg12.contributingModelIds,
  });
  return { loadout, groups: rows, specialistAuthorization: authorization };
}

function verifyAttacker(piece, sideKey, bindings) {
  if (!object(piece)
    || piece.sideKey !== sideKey
    || piece.officialUnitRecordKey !== MARINE_RECORD_KEY
    || piece.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || piece.combatTag !== "ground"
    || !activePiece(piece)
    || Number(piece.currentModels) !== 6
    || Number(piece.currentSupply) !== 1
    || piece.activatedPhases?.assault === true
    || !isDeepStrictEqual(piece.selectedUpgradeNames, ["AGG-12"])
    || !isDeepStrictEqual(piece.statuses || [], [])
    || !isDeepStrictEqual(piece.combatEffects || [], [])
    || !isDeepStrictEqual(piece.assaultEffects || [], [])
    || activeModels(piece).length !== 6) {
    fail("SPECIALIST_BATCH_ATTACKER_SCOPE_UNSUPPORTED");
  }
  return profileGroups(piece, bindings);
}

function verifyGoliathPiece(piece, targetSideKey, bindings) {
  if (!object(piece)
    || piece.sideKey !== targetSideKey
    || piece.officialUnitRecordKey !== GOLIATH_RECORD_KEY
    || piece.sourceRecordHash !== GOLIATH_SOURCE_RECORD_HASH
    || piece.combatTag !== "ground"
    || !isDeepStrictEqual(piece.selectedUpgradeNames || [], [])
    || !isDeepStrictEqual(piece.statuses || [], [])
    || !isDeepStrictEqual(piece.combatEffects || [], [])
    || !isDeepStrictEqual(piece.assaultEffects || [], [])
    || !Array.isArray(piece.models)
    || piece.models.length !== 1) {
    fail("SPECIALIST_BATCH_TARGET_SCOPE_UNSUPPORTED", String(piece?.id || ""));
  }
  if (activePiece(piece)) {
    if (Number(piece.currentModels) !== 1
      || Number(piece.currentSupply) !== 2
      || activeModels(piece).length !== 1) {
      fail("SPECIALIST_BATCH_TARGET_SCOPE_UNSUPPORTED", piece.id);
    }
    exactRoundModel(piece.models[0], GOLIATH_BASE_MILLI_INCHES,
      "SPECIALIST_BATCH_GOLIATH_MODEL_INVALID");
    const damage = Number(piece.damageMarker || 0);
    if (!Number.isSafeInteger(damage) || damage < 0 || damage >= bindings.goliath.hitPoints) {
      fail("SPECIALIST_BATCH_TARGET_DAMAGE_INVALID", piece.id);
    }
  } else if (piece.isDestroyed !== true
    || piece.isOnField !== false
    || Number(piece.currentModels) !== 0
    || Number(piece.currentSupply) !== 0
    || piece.models[0].isDestroyed !== true
    || piece.models[0].isOnField !== false
    || Number(piece.damageMarker || 0) !== 0) {
    fail("SPECIALIST_BATCH_DESTROYED_TARGET_INVALID", piece.id);
  }
  return piece;
}

function sequenceBody(sequence) {
  return without(sequence, ["pendingHash"]);
}

function sequenceDescriptor(piece, groups, bindings) {
  const body = {
    schema: "starcraft_tmg_official_specialist_ranged_sequence_descriptor_v1",
    sideKey: piece.sideKey,
    pieceId: piece.id,
    specialistLoadoutHash: piece.specialistLoadoutHash,
    groupSet: groups.map((group) => ({
      profileKey: group.profileKey,
      profileHash: group.profileHash,
      profileV2Hash: group.profileV2Hash,
      weaponName: group.weaponName,
      contributingModelIds: [...group.contributingModelIds],
    })),
    sourceSnapshotHash: bindings.gameplayDataBundle.sourceSnapshotHash,
    normalizedDatasetHash: bindings.gameplayDataBundle.normalizedDatasetHash,
    attackProfileCatalogueHash: bindings.catalogueV2.catalogueHash,
    rulesRuntimeHash: bindings.runtimeHash,
  };
  return freezeDeep({ ...body, sequenceHash: hashStarcraftTmgContract(body) });
}

function verifyPendingSequence(state, descriptor, groups) {
  const pending = state.pendingRangedAttackSequence;
  if (!object(pending)
    || pending.schema !== "starcraft_tmg_official_specialist_ranged_sequence_pending_v1"
    || pending.pendingHash !== hashStarcraftTmgContract(sequenceBody(pending))
    || pending.sequenceHash !== descriptor.sequenceHash
    || pending.sideKey !== descriptor.sideKey
    || pending.pieceId !== descriptor.pieceId
    || pending.specialistLoadoutHash !== descriptor.specialistLoadoutHash
    || !isDeepStrictEqual(pending.originalBatchProfileKeys,
      groups.map((group) => group.profileKey))
    || !Array.isArray(pending.remainingBatchProfileKeys)
    || pending.remainingBatchProfileKeys.length !== 1
    || !groups.some((group) => group.profileKey === pending.remainingBatchProfileKeys[0])
    || !Array.isArray(pending.completedBatches)
    || pending.completedBatches.length !== 1
    || !HASH_PATTERN.test(String(pending.completedBatches[0]?.batchHash || ""))) {
    fail("SPECIALIST_BATCH_PENDING_SEQUENCE_INVALID");
  }
  const completed = pending.completedBatches[0].profileKey;
  const remaining = pending.remainingBatchProfileKeys[0];
  if (completed === remaining
    || !groups.some((group) => group.profileKey === completed)) {
    fail("SPECIALIST_BATCH_PENDING_SEQUENCE_INVALID");
  }
  return pending;
}

function baseGapMilliInches(attacker, target) {
  return Math.max(0, Math.round(Math.hypot(
    milli(target.xInches, "SPECIALIST_BATCH_MODEL_GEOMETRY_INVALID")
      - milli(attacker.xInches, "SPECIALIST_BATCH_MODEL_GEOMETRY_INVALID"),
    milli(target.yInches, "SPECIALIST_BATCH_MODEL_GEOMETRY_INVALID")
      - milli(attacker.yInches, "SPECIALIST_BATCH_MODEL_GEOMETRY_INVALID"),
  ) - (MARINE_BASE_MILLI_INCHES / 2) - (GOLIATH_BASE_MILLI_INCHES / 2)));
}

function aggregateProfile(profile, group) {
  const body = clone(without(profile, ["profileHash"]));
  body.profileKey = `${profile.profileKey}::batch:${group.contributingModelIds.length}`;
  body.rateOfAttack = profile.rateOfAttack * group.contributingModelIds.length;
  body.effects = body.effects.filter((effect) => (
    effect.effectAtomId !== "attack-effect:specialist-v1"
  ));
  body.batchAggregation = {
    sourceProfileKey: profile.profileKey,
    sourceProfileHash: profile.profileHash,
    printedRateOfAttackPerModel: profile.rateOfAttack,
    contributingModelIds: [...group.contributingModelIds],
    aggregationRuleAtomId:
      "rule-atom:singleton:core-8-7-4-attack-pool-generation:ba4df14ee6f0",
  };
  return freezeDeep({ ...body, profileHash: hashStarcraftTmgContract(body) });
}

function planBatch(piece, target, group, bindings, specialistAuthorization) {
  const targetModel = activeModels(target)[0];
  const modelById = new Map(activeModels(piece).map((model) => [model.id, model]));
  const distances = group.contributingModelIds.map((modelId) => {
    const model = modelById.get(modelId);
    if (!model) fail("SPECIALIST_BATCH_CONTRIBUTING_MODEL_MISSING", modelId);
    const gap = baseGapMilliInches(model, targetModel);
    return { modelId, baseGapMilliInches: gap, distanceInches: Number((gap / 1000).toFixed(3)) };
  });
  const sourceProfile = bindings.profilesV1[group.profileKey];
  if (distances.some((entry) => entry.distanceInches > sourceProfile.range.normalRangeInches)) {
    fail("SPECIALIST_BATCH_MIXED_OR_EXTENDED_RANGE_UNSUPPORTED");
  }
  const aggregate = aggregateProfile(sourceProfile, group);
  const maximumDistance = Math.max(...distances.map((entry) => entry.distanceInches));
  const basePlan = NUMERIC_KERNEL.plan({
    profile: aggregate,
    target: {
      armourThreshold: bindings.goliath.armourThreshold,
      evadeThreshold: bindings.goliath.evadeThreshold,
      combatTags: bindings.goliath.combatTags,
    },
    distanceInches: maximumDistance,
    evadeEligibility: { eligible: false, reason: "none" },
  });
  if (basePlan.rangeBand !== "normal"
    || basePlan.effectiveRateOfAttack
      !== sourceProfile.rateOfAttack * group.contributingModelIds.length) {
    fail("SPECIALIST_BATCH_ATTACK_POOL_INVALID");
  }
  const body = {
    schema: "starcraft_tmg_official_specialist_ranged_batch_plan_v1",
    sequencePieceId: piece.id,
    targetId: target.id,
    targetModelId: targetModel.id,
    officialProfileKey: sourceProfile.profileKey,
    officialProfileHash: sourceProfile.profileHash,
    officialProfileV2Hash: group.profileV2Hash,
    aggregateProfileHash: aggregate.profileHash,
    contributingModelIds: [...group.contributingModelIds],
    modelDistances: distances,
    maximumDistanceInches: maximumDistance,
    printedRateOfAttackPerModel: sourceProfile.rateOfAttack,
    attackPoolDice: basePlan.effectiveRateOfAttack,
    specialistAuthorizationHash: group.profileKey === AGG12_PROFILE_KEY
      ? specialistAuthorization.authorizationHash
      : null,
    lineOfSight: {
      projection: "top_down",
      trace: "base_to_base",
      terrainCount: 0,
      allContributingModelsVisible: true,
    },
    basePlan,
    chance: clone(basePlan.chance),
    rulesTruth: "official_same_profile_model_batch_exact_normal_range_subset",
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

function batchContext(state, sideKey, options = {}) {
  if (!object(state)
    || !SIDE_KEYS.includes(sideKey)
    || state.phase !== "assault"
    || state.activeSideKey !== sideKey
    || state.players?.[sideKey]?.passedPhases?.assault === true
    || state.gameOver === true
    || state.terminal === true
    || !Array.isArray(state.pieces)
    || state.pieces.length !== 3
    || !object(state.board)
    || !isDeepStrictEqual(state.board.terrain || [], [])
    || !isDeepStrictEqual(state.board.accessPoints || [], [])
    || !isDeepStrictEqual(state.board.effectMarkers || [], [])) {
    fail("SPECIALIST_BATCH_STATE_SCOPE_UNSUPPORTED");
  }
  const bindings = officialBindings(state, options.matchBinding);
  const piece = state.pieces.find((entry) => (
    entry.sideKey === sideKey && entry.officialUnitRecordKey === MARINE_RECORD_KEY
  ));
  const targetPieces = state.pieces.filter((entry) => entry.sideKey === otherSide(sideKey));
  if (!piece || targetPieces.length !== 2) fail("SPECIALIST_BATCH_EXACT_UNITS_REQUIRED");
  const { loadout, groups, specialistAuthorization } = verifyAttacker(
    piece,
    sideKey,
    bindings,
  );
  for (const target of targetPieces) verifyGoliathPiece(target, otherSide(sideKey), bindings);
  const graph = deriveOfficialEngagementGraphV2(state);
  if (graph.engagedUnitIds.length !== 0 || graph.modelEdges.length !== 0) {
    fail("SPECIALIST_BATCH_ENGAGEMENT_SCOPE_UNSUPPORTED");
  }
  const descriptor = sequenceDescriptor(piece, groups, bindings);
  const pending = state.pendingRangedAttackSequence === undefined
    || state.pendingRangedAttackSequence === null
    ? null
    : verifyPendingSequence(state, descriptor, groups);
  const availableProfileKeys = pending
    ? [...pending.remainingBatchProfileKeys]
    : groups.map((group) => group.profileKey);
  return {
    bindings,
    piece,
    targetPieces,
    loadout,
    groups,
    specialistAuthorization,
    graph,
    descriptor,
    pending,
    availableProfileKeys,
  };
}

function canonicalAction(context, group, target, plan) {
  return {
    actionType: OFFICIAL_SPECIALIST_RANGED_BATCH_ACTION_TYPE,
    sideKey: context.piece.sideKey,
    phase: "assault",
    pieceId: context.piece.id,
    targetId: target.id,
    weaponName: group.weaponName,
    attackProfileKey: group.profileKey,
    attackProfileHash: group.profileHash,
    attackProfileV2Hash: group.profileV2Hash,
    contributingModelIds: [...group.contributingModelIds],
    sequenceHash: context.descriptor.sequenceHash,
    batchOrdinal: context.pending ? 2 : 1,
    sequenceFinalBatch: Boolean(context.pending),
    batchPlanHash: plan.planHash,
    chance: clone(plan.chance),
    ruleAtomIds: [...OFFICIAL_SPECIALIST_RANGED_BATCH_ACTION_ATOM_IDS],
    executorId: OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_ID,
    executorVersion: OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_VERSION,
  };
}

export function isOfficialSpecialistRangedSequencePendingV1(state) {
  return state?.pendingRangedAttackSequence !== undefined
    && state?.pendingRangedAttackSequence !== null;
}

export function enumerateOfficialSpecialistRangedBatchV1(state, options = {}) {
  const sideKey = String(options.sideKey || state?.activeSideKey || "").trim();
  let context;
  try {
    context = batchContext(state, sideKey, options);
  } catch (error) {
    if (isOfficialSpecialistRangedSequencePendingV1(state)) throw error;
    return options.includeDisabled === true ? [freezeDeep({
      actionType: OFFICIAL_SPECIALIST_RANGED_BATCH_ACTION_TYPE,
      sideKey,
      phase: "assault",
      pieceId: "",
      targetId: "",
      weaponName: "AGG-12",
      ruleAtomIds: [...OFFICIAL_SPECIALIST_RANGED_BATCH_ACTION_ATOM_IDS],
      executorId: OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_ID,
      executorVersion: OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_VERSION,
      isEnabled: false,
      disabledReason: String(error?.message || error).split(":")[0],
      score: 0,
      details: { rulesTruth: "fail_closed", trainingTruth: false },
    })] : [];
  }
  const rows = [];
  for (const profileKey of context.availableProfileKeys) {
    const group = context.groups.find((entry) => entry.profileKey === profileKey);
    for (const target of context.targetPieces.filter(activePiece)) {
      const plan = planBatch(
        context.piece,
        target,
        group,
        context.bindings,
        context.specialistAuthorization,
      );
      rows.push(freezeDeep({
        ...canonicalAction(context, group, target, plan),
        isEnabled: true,
        disabledReason: "",
        score: context.pending ? 230 : 220,
        details: {
          sourceRule: "official_core_8_7_3_8_7_4_and_9_1_7",
          specialistLoadoutHash: context.loadout.specialistLoadoutHash,
          specialistAuthorizationHash:
            context.specialistAuthorization.authorizationHash,
          attackPlanHash: plan.planHash,
          numericKernelHash: NUMERIC_KERNEL.descriptor.kernelHash,
          specialistKernelHash: SPECIALIST_KERNEL.descriptor.kernelHash,
          engagementGraphHash: context.graph.graphHash,
          batchOrdinal: context.pending ? 2 : 1,
          sequenceCompletesOnApply: Boolean(context.pending),
          remainingBatchCountAfterApply: context.pending ? 0 : 1,
          supportedScope:
            "six_model_marine_one_agg12_vs_two_single_model_goliaths_normal_range_no_terrain",
          rulesTruth: "official_specialist_sequential_batch_exact_subset",
          trainingTruth: false,
        },
      }));
    }
  }
  return freezeDeep(rows.sort((left, right) => (
    `${left.attackProfileKey}:${left.targetId}`.localeCompare(
      `${right.attackProfileKey}:${right.targetId}`,
    )
  )));
}

function pendingAfterFirstBatch(context, group, batchReceipt) {
  const remainingBatchProfileKeys = context.groups
    .map((entry) => entry.profileKey)
    .filter((profileKey) => profileKey !== group.profileKey);
  const body = {
    schema: "starcraft_tmg_official_specialist_ranged_sequence_pending_v1",
    sequenceHash: context.descriptor.sequenceHash,
    sideKey: context.piece.sideKey,
    pieceId: context.piece.id,
    specialistLoadoutHash: context.piece.specialistLoadoutHash,
    originalBatchProfileKeys: context.groups.map((entry) => entry.profileKey),
    remainingBatchProfileKeys,
    completedBatches: [{
      ordinal: 1,
      profileKey: group.profileKey,
      targetId: batchReceipt.targetId,
      batchHash: batchReceipt.batchHash,
    }],
    activeSideRetainedUntilAllBatchesResolve: true,
    otherActionsLockedOut: true,
    trainingTruth: false,
  };
  return freezeDeep({ ...body, pendingHash: hashStarcraftTmgContract(body) });
}

export function applyOfficialSpecialistRangedBatchV1(
  stateInput,
  actionInput,
  options = {},
) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_SPECIALIST_RANGED_BATCH_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_VERSION) {
    fail("SPECIALIST_BATCH_ACTION_INVALID");
  }
  const context = batchContext(stateInput, actionInput.sideKey, options);
  const candidates = enumerateOfficialSpecialistRangedBatchV1(stateInput, {
    sideKey: actionInput.sideKey,
    matchBinding: options.matchBinding,
  });
  const expectedCandidate = candidates.find((candidate) => (
    candidate.attackProfileKey === actionInput.attackProfileKey
      && candidate.targetId === actionInput.targetId
  ));
  if (!expectedCandidate) fail("SPECIALIST_BATCH_ACTION_STALE");
  const expectedAction = actionFromCandidate(expectedCandidate);
  if (!isDeepStrictEqual(actionInput, expectedAction)) {
    fail("SPECIALIST_BATCH_ACTION_MISMATCH");
  }
  const group = context.groups.find((entry) => (
    entry.profileKey === actionInput.attackProfileKey
  ));
  const targetBefore = context.targetPieces.find((entry) => entry.id === actionInput.targetId);
  const plan = planBatch(
    context.piece,
    targetBefore,
    group,
    context.bindings,
    context.specialistAuthorization,
  );
  const resolution = NUMERIC_KERNEL.resolve(plan.basePlan, options.chanceReveals);
  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === actionInput.pieceId);
  const target = state.pieces.find((entry) => entry.id === actionInput.targetId);
  const targetModel = activeModels(target)[0];
  const priorDamageMarker = Number(target.damageMarker || 0);
  const incomingDamage = resolution.stages.damage.totalDamage;
  const remainingHitPoints = context.bindings.goliath.hitPoints - priorDamageMarker;
  const appliedDamage = Math.min(incomingDamage, remainingHitPoints);
  const discardedOverflowDamage = incomingDamage - appliedDamage;
  const accumulatedDamage = priorDamageMarker + appliedDamage;
  const casualty = accumulatedDamage >= context.bindings.goliath.hitPoints;
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
    schema: "starcraft_tmg_official_specialist_ranged_batch_receipt_v1",
    sequenceHash: context.descriptor.sequenceHash,
    ordinal: context.pending ? 2 : 1,
    pieceId: piece.id,
    targetId: target.id,
    targetModelId: targetModel.id,
    profileKey: group.profileKey,
    profileHash: group.profileHash,
    profileV2Hash: group.profileV2Hash,
    weaponName: group.weaponName,
    contributingModelIds: [...group.contributingModelIds],
    specialistAuthorizationHash: group.profileKey === AGG12_PROFILE_KEY
      ? context.specialistAuthorization.authorizationHash
      : null,
    planHash: plan.planHash,
    numericPlanHash: plan.basePlan.planHash,
    resolutionHash: resolution.resolutionHash,
    attackPoolDice: plan.attackPoolDice,
    hitCount: resolution.stages.hit.hits,
    incomingDamage,
    priorDamageMarker,
    appliedDamage,
    discardedOverflowDamage,
    casualtyModelIds: casualty ? [targetModel.id] : [],
    postDamageMarker: Number(target.damageMarker || 0),
    targetDestroyed: casualty,
    stageOrder: ["declaration", "hit", "effects", "armour", "evade", "damage"],
    rulesTruth: "official_sequential_profile_batch_and_visible_single_model_damage",
    trainingTruth: false,
  };
  const batchReceipt = freezeDeep({
    ...batchBody,
    batchHash: hashStarcraftTmgContract(batchBody),
  });
  const sequenceComplete = Boolean(context.pending);
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
    state.pendingRangedAttackSequence = clone(pendingAfterFirstBatch(
      context,
      group,
      batchReceipt,
    ));
  }
  const events = [{
    type: "specialist_ranged_batch_resolved",
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
      ? "specialist_ranged_sequence_completed"
      : "specialist_ranged_sequence_continues",
    sideKey: actionInput.sideKey,
    pieceId: piece.id,
    sequenceHash: context.descriptor.sequenceHash,
    completedBatchCount: sequenceComplete ? 2 : 1,
    remainingBatchCount: sequenceComplete ? 0 : 1,
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
    schemaVersion: "starcraft_tmg_official_specialist_ranged_batch_transition_v1",
    executorId: OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_ID,
    executorVersion: OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expectedAction,
    batchReceipt,
    sequenceComplete,
    rulesTruth: "official_specialist_sequential_attack_batch_exact_subset",
    trainingTruth: false,
  };
}

export const OFFICIAL_SPECIALIST_RANGED_BATCH_KERNELS = freezeDeep({
  numeric: clone(NUMERIC_KERNEL.descriptor),
  specialist: clone(SPECIALIST_KERNEL.descriptor),
});
