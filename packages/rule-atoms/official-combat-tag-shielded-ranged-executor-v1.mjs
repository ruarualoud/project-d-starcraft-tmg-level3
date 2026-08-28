import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  getOfficialAttackProfileV1,
  verifyOfficialAttackProfileCatalogueV1,
} from "../source-data/official-attack-profile-catalogue-v1.mjs";
import { getOfficialCombatProfileV1 } from
  "../source-data/official-combat-profile-bundle-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialAttackResolutionKernelV5 } from
  "./official-attack-resolution-kernel-v5.mjs";
import { createOfficialCombatTagShieldedDefenseKernelV1 } from
  "./official-combat-tag-shielded-defense-kernel-v1.mjs";
import { deriveOfficialEngagementGraphV2 } from "./official-engagement-graph-v2.mjs";
import { OFFICIAL_RANGED_ATTACK_V2_ACTION_ATOM_IDS } from
  "./official-ranged-attack-executor-v2.mjs";

export const OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_ID =
  "authority.combat-tag-shielded-ranged-v1";
export const OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_ACTION_TYPE = "ranged_attack";

export const OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:combat-tag-definition",
  "rule-atom:combat-tag-targeting-restriction",
  "rule-atom:combat-tag-type-set",
  "rule-atom:shield-value-initial-hit-points-and-status",
  "rule-atom:shielded-lifecycle-and-effects",
  "rule-atom:shielded-loss-conditions",
  "rule-atom:singleton:core-11-combat-tag-bonus-eligibility:6866f0c19b55",
  "rule-atom:singleton:core-11-shielded-loss-preserves-hit-points:03c53e7b4d2e",
  "rule-atom:singleton:core-2-4-2-tag-conditional-bonuses:40ccb120a286",
  "rule-atom:singleton:core-2-4-tag-definition:88f1bcce328a",
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_DEPENDENCY_ATOM_IDS =
  Object.freeze([...OFFICIAL_RANGED_ATTACK_V2_ACTION_ATOM_IDS]);

export const OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_DEPENDENCY_ATOM_IDS,
    ...OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_ATOM_IDS =
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_ACTION_ATOM_IDS;

const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const CURRENT_SOURCE_SNAPSHOT_HASH =
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78";
const CURRENT_DATASET_HASH =
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a";
const CURRENT_GAMEPLAY_BUNDLE_HASH =
  "14935d15740b639e52d790b83311cf9e8fae0cde1898db6b5a9a0b3e81921bf0";
const ATTACK_KERNEL = createOfficialAttackResolutionKernelV5();
const DEFENSE_KERNEL = createOfficialCombatTagShieldedDefenseKernelV1();

const ATTACKER_SCOPES = Object.freeze({
  "army_units:goliath": Object.freeze({
    unitName: "Goliath",
    weaponName: "Autocannon",
    attackProfileHash:
      "3be2ef5234bccb909d9119fc83130718770de31a5f7cf0348e9a573512ea8ce3",
    sourceRecordHash:
      "e36b38cc46ff9a2fecce9f1fa7bc087923fca2fc29fad2d9f0eead479a68ab16",
    payloadHash:
      "168f9cdc1199f698cc74fe882e98b8d17106a14c7c12acc903be19a3b1bf946d",
    combatTags: Object.freeze(["armoured", "ground", "mechanical"]),
    currentSupply: 2,
    baseDiameterMilliInches: 3150,
    printedBaseDiameter: "Ø 80MM",
    sourceLocator:
      "official-p2p/StarCraft-Terran-P2P-Card-Sheets-A4_EN.txt#Goliath:Ø80MM",
  }),
  "army_units:marine": Object.freeze({
    unitName: "Marine",
    weaponName: "C-14 rifle",
    attackProfileHash:
      "a58fc5f16efc1096b4db052ad6fe92206a251e8d38c1bff3a4b02cd37fd802ba",
    sourceRecordHash:
      "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215",
    payloadHash:
      "33cbc0b9e9e17ca95f1cd639f78d81e8ec7606f035642e32fdf7064bcc49d1e6",
    combatTags: Object.freeze(["biological", "ground", "light"]),
    currentSupply: 0,
    baseDiameterMilliInches: 1260,
    printedBaseDiameter: "Ø 32MM",
    sourceLocator:
      "official-p2p/StarCraft-Terran-P2P-Card-Sheets-A4_EN.txt#Marine:Ø32MM",
  }),
});

const TARGET_SCOPES = Object.freeze({
  "army_units:adept": Object.freeze({
    unitName: "Adept",
    sourceRecordHash:
      "daba33c45aa3323b839def7eaca05f208371807ea92065e415d8936dfa7136a3",
    payloadHash:
      "8319c1cdf6621e776a2282b8089d74224db6ba202b1ed1f3ed815dd3d369db03",
    combatTags: Object.freeze(["biological", "ground", "light"]),
    armourThreshold: 5,
    evadeThreshold: 5,
    printedHitPoints: 3,
    shieldValue: 2,
    currentSupply: 0,
    engagementTag: "ground",
    baseDiameterMilliInches: 1575,
    printedBaseDiameter: "Ø 40MM",
    sourceLocator:
      "official-p2p/StarCraft-Protoss-P2P-Card-Sheets-A4_EN.txt#Adept:Ø40MM",
    profileSource: "official_combat_profile_bundle_v1",
  }),
  "army_units:stalker": Object.freeze({
    unitName: "Stalker",
    sourceRecordHash:
      "8757aed1d9a442ba79fec6f1fa66ec67658ca213f976f9dd9a1bf6dbc3f991d1",
    payloadHash:
      "bf7286f7fad582a880f4cbc776456d5b7545a765eeb66e4bfccee56950b87a31",
    combatTags: Object.freeze(["armoured", "ground", "mechanical"]),
    armourThreshold: 4,
    evadeThreshold: 6,
    printedHitPoints: 6,
    shieldValue: 3,
    currentSupply: 1,
    engagementTag: "ground",
    baseDiameterMilliInches: 3150,
    printedBaseDiameter: "Ø 80MM",
    sourceLocator:
      "official-p2p/StarCraft-Protoss-P2P-Card-Sheets-A4_EN.txt#Stalker:Ø80MM",
    profileSource: "official_combat_profile_bundle_v1",
  }),
  "army_units:point_defense_drone": Object.freeze({
    unitName: "Point Defense Drone",
    sourceRecordHash:
      "e8c9a2fb937375b2c33c508c79f5253c7c465179aca2b28b97febc36f8d6c2dc",
    payloadHash:
      "d248d4d7fa6999a9c5c8eb001871c4256c1ee70e42bfbfaf67065ea011081ddf",
    combatTags: Object.freeze(["armoured", "flying", "mechanical"]),
    armourThreshold: 6,
    evadeThreshold: 6,
    printedHitPoints: 3,
    shieldValue: 0,
    currentSupply: 0,
    engagementTag: "flying",
    baseDiameterMilliInches: 1260,
    printedBaseDiameter: "Ø 32MM",
    sourceLocator:
      "official-p2p/StarCraft-Terran-P2P-Card-Sheets-A4_EN.txt#Point-Defense-Drone:Ø32MM",
    profileSource: "current_dataset_hash_bound_weaponless_target_projection_v1",
  }),
});

const BUNDLE_RECORD_KEYS = Object.freeze([
  "army_units:adept",
  "army_units:goliath",
  "army_units:marine",
  "army_units:stalker",
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
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

function otherSide(sideKey) {
  if (sideKey === "player1") return "player2";
  if (sideKey === "player2") return "player1";
  fail("COMBAT_TAG_SHIELDED_SIDE_REQUIRED");
}

function milli(value, code) {
  const number = Number(value);
  if (!Number.isFinite(number)) fail(code);
  const result = Math.round(number * 1000);
  if (!Number.isSafeInteger(result)) fail(code);
  return result;
}

function validateState(state) {
  if (!object(state) || !object(state.players) || !object(state.board)
    || !Array.isArray(state.pieces)) {
    fail("COMBAT_TAG_SHIELDED_STATE_INVALID");
  }
}

function verifyBindings(state, matchBinding) {
  const gameplayBundle = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayBundle);
  const catalogue = gameplayBundle.attackProfileCatalogue;
  verifyOfficialAttackProfileCatalogueV1(catalogue);
  const bundleKeys = gameplayBundle.combatProfileBundle.profiles
    .map((profile) => profile.recordKey)
    .sort((left, right) => left.localeCompare(right));
  if (!object(matchBinding)
    || hashStarcraftTmgContract(gameplayBundle) !== matchBinding.dataSnapshotHash
    || gameplayBundle.gameplayDataBundleHash !== CURRENT_GAMEPLAY_BUNDLE_HASH
    || gameplayBundle.sourceSnapshotHash !== CURRENT_SOURCE_SNAPSHOT_HASH
    || gameplayBundle.normalizedDatasetHash !== CURRENT_DATASET_HASH
    || !isDeepStrictEqual(gameplayBundle.dataVersions, {
      cardsVersion: "69",
      rulesVersion: "48",
      unitsVersion: "71",
    })
    || gameplayBundle.repositoryFallbackAllowed !== false
    || !isDeepStrictEqual(bundleKeys, [...BUNDLE_RECORD_KEYS])
    || !catalogue.unitRecordKeys.includes("army_units:point_defense_drone")) {
    fail("COMBAT_TAG_SHIELDED_LATEST_OFFICIAL_DATA_REQUIRED");
  }
  return {
    gameplayBundle,
    catalogue,
    combatBundle: gameplayBundle.combatProfileBundle,
  };
}

function validateRestriction(state, piece) {
  const restriction = piece.disengageAssaultRestriction;
  if (restriction === undefined || restriction === null) return null;
  if (!object(restriction)) fail("COMBAT_TAG_SHIELDED_RESTRICTION_INVALID");
  const { restrictionHash, ...body } = restriction;
  if (restriction.schema !== "starcraft_tmg_official_post_disengage_assault_restriction_v1"
    || restriction.appliesToPhase !== "assault"
    || Number(restriction.declaredRound) !== Number(state.round)
    || restriction.trainingTruth !== false
    || hashStarcraftTmgContract(body) !== restrictionHash
    || restriction.rangedAttackProhibited !== !restriction.tacticalMass
    || restriction.chargeProhibited !== !restriction.tacticalMass) {
    fail("COMBAT_TAG_SHIELDED_RESTRICTION_INVALID");
  }
  if (restriction.rangedAttackProhibited) {
    fail("COMBAT_TAG_SHIELDED_POST_DISENGAGE_PROHIBITED");
  }
  return restriction;
}

function exactScopedModel(piece, scope, role) {
  const models = activeModels(piece);
  if (!scope
    || piece.sourceRecordHash !== scope.sourceRecordHash
    || piece.officialPayloadHash !== scope.payloadHash
    || Number(piece.currentModels) !== 1
    || Number(piece.maxModels) !== 1
    || Number(piece.currentSupply) !== scope.currentSupply
    || models.length !== 1
    || piece.combatTag !== (scope.engagementTag || "ground")
    || !isDeepStrictEqual(piece.combatTags, [...scope.combatTags])
    || (piece.selectedUpgradeNames || []).length !== 0
    || (piece.combatEffects || []).length !== 0
    || (piece.assaultEffects || []).length !== 0
    || models[0].baseShape !== "round"
    || milli(models[0].baseWidthInches, "COMBAT_TAG_SHIELDED_BASE_UNSUPPORTED")
      !== scope.baseDiameterMilliInches
    || milli(models[0].baseDepthInches, "COMBAT_TAG_SHIELDED_BASE_UNSUPPORTED")
      !== scope.baseDiameterMilliInches
    || !isDeepStrictEqual(models[0].supportTerrainIds, [])
    || !isDeepStrictEqual(models[0].adjacentAccessPointIds, [])) {
    fail("COMBAT_TAG_SHIELDED_UNIT_SCOPE_UNSUPPORTED", role);
  }
  milli(models[0].xInches, "COMBAT_TAG_SHIELDED_MODEL_GEOMETRY_INVALID");
  milli(models[0].yInches, "COMBAT_TAG_SHIELDED_MODEL_GEOMETRY_INVALID");
  return models[0];
}

function verifyCombatProfile(profile, scope, role) {
  if (!object(profile)
    || profile.sourceRecordHash !== scope.sourceRecordHash
    || profile.payloadHash !== scope.payloadHash
    || !isDeepStrictEqual(profile.combatTags, [...scope.combatTags])) {
    fail("COMBAT_TAG_SHIELDED_OFFICIAL_PROFILE_DRIFT", role);
  }
  if (role === "target" && (profile.armourThreshold !== scope.armourThreshold
    || profile.evadeThreshold !== scope.evadeThreshold
    || profile.hitPoints !== scope.printedHitPoints
    || profile.shield !== scope.shieldValue)) {
    fail("COMBAT_TAG_SHIELDED_OFFICIAL_PROFILE_DRIFT", role);
  }
  return profile;
}

function targetProfile(bindings, recordKey, scope) {
  if (recordKey === "army_units:point_defense_drone") {
    return {
      recordKey,
      sourceRecordHash: scope.sourceRecordHash,
      payloadHash: scope.payloadHash,
      combatTags: [...scope.combatTags],
      armourThreshold: scope.armourThreshold,
      evadeThreshold: scope.evadeThreshold,
      hitPoints: scope.printedHitPoints,
      shield: scope.shieldValue,
      profileSource: scope.profileSource,
    };
  }
  return verifyCombatProfile(
    getOfficialCombatProfileV1(bindings.combatBundle, recordKey),
    scope,
    "target",
  );
}

function baseGapMilliInches(left, leftScope, right, rightScope) {
  return Math.max(0, Math.round(Math.hypot(
    milli(right.xInches, "COMBAT_TAG_SHIELDED_MODEL_GEOMETRY_INVALID")
      - milli(left.xInches, "COMBAT_TAG_SHIELDED_MODEL_GEOMETRY_INVALID"),
    milli(right.yInches, "COMBAT_TAG_SHIELDED_MODEL_GEOMETRY_INVALID")
      - milli(left.yInches, "COMBAT_TAG_SHIELDED_MODEL_GEOMETRY_INVALID"),
  ) - (leftScope.baseDiameterMilliInches / 2) - (rightScope.baseDiameterMilliInches / 2)));
}

function contextFor(state, sideKey, piece, target, bindings, graph) {
  if (state.phase !== "assault") fail("COMBAT_TAG_SHIELDED_WRONG_PHASE");
  if (state.activeSideKey !== sideKey) fail("COMBAT_TAG_SHIELDED_NOT_ACTIVE_SIDE");
  if (state.players?.[sideKey]?.passedPhases?.assault === true) {
    fail("COMBAT_TAG_SHIELDED_SIDE_PASSED");
  }
  if (!activePiece(piece) || piece.sideKey !== sideKey) {
    fail("COMBAT_TAG_SHIELDED_ATTACKER_UNAVAILABLE");
  }
  if (!activePiece(target) || target.sideKey !== otherSide(sideKey)) {
    fail("COMBAT_TAG_SHIELDED_TARGET_UNAVAILABLE");
  }
  if (piece.activatedPhases?.assault === true) {
    fail("COMBAT_TAG_SHIELDED_ALREADY_ACTIVATED");
  }
  if ((state.board.terrain || []).length !== 0
    || (state.board.accessPoints || []).length !== 0) {
    fail("COMBAT_TAG_SHIELDED_TERRAIN_SCOPE_UNSUPPORTED");
  }
  if (graph.engagedUnitIds.includes(piece.id) || graph.engagedUnitIds.includes(target.id)) {
    fail("COMBAT_TAG_SHIELDED_ENGAGEMENT_SCOPE_UNSUPPORTED");
  }
  const attackerScope = ATTACKER_SCOPES[piece.officialUnitRecordKey];
  const targetScope = TARGET_SCOPES[target.officialUnitRecordKey];
  const attackerModel = exactScopedModel(piece, attackerScope, "attacker");
  const targetModel = exactScopedModel(target, targetScope, "target");
  if (!isDeepStrictEqual(piece.statuses || [], [])
    || Number(piece.damageMarker || 0) !== 0) {
    fail("COMBAT_TAG_SHIELDED_ATTACKER_STATE_UNSUPPORTED");
  }
  const attackerCombatProfile = verifyCombatProfile(
    getOfficialCombatProfileV1(bindings.combatBundle, piece.officialUnitRecordKey),
    attackerScope,
    "attacker",
  );
  const targetCombatProfile = targetProfile(
    bindings,
    target.officialUnitRecordKey,
    targetScope,
  );
  const attackProfile = getOfficialAttackProfileV1(bindings.catalogue, {
    recordKey: piece.officialUnitRecordKey,
    phase: "assault",
    weaponName: attackerScope.weaponName,
  });
  if (attackProfile.profileHash !== attackerScope.attackProfileHash
    || attackProfile.sourceRecordHash !== attackerScope.sourceRecordHash
    || attackProfile.payloadHash !== attackerScope.payloadHash
    || attackProfile.phase !== "assault") {
    fail("COMBAT_TAG_SHIELDED_ATTACK_PROFILE_DRIFT");
  }
  const targetAuthorization = DEFENSE_KERNEL.authorizeTarget({
    profileTargetTags: attackProfile.targetTags,
    targetCombatTags: targetCombatProfile.combatTags,
  });
  if (!targetAuthorization.authorized) fail("COMBAT_TAG_SHIELDED_TARGET_TAG_MISMATCH");
  const damageMarker = Number(target.damageMarker || 0);
  const shieldState = DEFENSE_KERNEL.shieldState({
    printedHitPoints: targetCombatProfile.hitPoints,
    shieldValue: targetCombatProfile.shield,
    damageMarker,
    firstModelPresent: true,
    statuses: target.statuses || [],
  });
  const baseGap = baseGapMilliInches(
    attackerModel,
    attackerScope,
    targetModel,
    targetScope,
  );
  const plan = ATTACK_KERNEL.plan({
    profile: attackProfile,
    target: {
      armourThreshold: targetCombatProfile.armourThreshold,
      evadeThreshold: targetCombatProfile.evadeThreshold,
      combatTags: targetCombatProfile.combatTags,
    },
    distanceInches: Number((baseGap / 1000).toFixed(3)),
    evadeEligibility: { eligible: false, reason: "none" },
  });
  const surgeTags = attackProfile.surge?.targetTags || [];
  const surgeTagMatched = surgeTags.some((tag) => (
    targetCombatProfile.combatTags.includes(tag)
  ));
  const lineOfSightBody = {
    schema: "starcraft_tmg_official_unobstructed_line_of_sight_receipt_v1",
    attackerModelId: attackerModel.id,
    targetModelId: targetModel.id,
    projection: "top_down",
    trace: "base_to_base",
    terrainCount: 0,
    mutual: true,
    visible: true,
    trainingTruth: false,
  };
  return {
    attackerScope,
    targetScope,
    attackerCombatProfile,
    targetCombatProfile,
    attackerModel,
    targetModel,
    attackProfile,
    targetAuthorization,
    shieldState,
    surgeTagMatched,
    plan,
    restriction: validateRestriction(state, piece),
    baseGapMilliInches: baseGap,
    lineOfSightReceipt: {
      ...lineOfSightBody,
      receiptHash: hashStarcraftTmgContract(lineOfSightBody),
    },
  };
}

function canonicalAction(sideKey, piece, target, context) {
  return {
    actionType: OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_ACTION_TYPE,
    sideKey,
    phase: "assault",
    pieceId: piece.id,
    targetId: target.id,
    weaponName: context.attackProfile.weaponName,
    attackProfileKey: context.attackProfile.profileKey,
    attackProfileHash: context.attackProfile.profileHash,
    targetCombatTags: [...context.targetCombatProfile.combatTags],
    profileTargetTags: [...context.attackProfile.targetTags],
    surgeTagMatched: context.surgeTagMatched,
    printedHitPoints: context.shieldState.printedHitPoints,
    shieldValue: context.shieldState.shieldValue,
    effectiveFirstModelHitPoints: context.shieldState.effectiveFirstModelHitPoints,
    shieldedBefore: context.shieldState.shielded,
    targetAuthorizationHash: context.targetAuthorization.authorizationHash,
    shieldStateHash: context.shieldState.shieldStateHash,
    rangeBand: context.plan.rangeBand,
    chance: clone(context.plan.chance),
    ruleAtomIds: [...OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_ACTION_ATOM_IDS],
    executorId: OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_ID,
    executorVersion: OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_VERSION,
  };
}

export function enumerateOfficialCombatTagShieldedRangedV1(state, options = {}) {
  validateState(state);
  const sideKey = String(options.sideKey || state.activeSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey)) fail("COMBAT_TAG_SHIELDED_SIDE_REQUIRED");
  let bindings;
  let graph;
  try {
    bindings = verifyBindings(state, options.matchBinding);
    graph = deriveOfficialEngagementGraphV2(state);
  } catch {
    return [];
  }
  const rows = [];
  for (const piece of state.pieces.filter((entry) => (
    entry.sideKey === sideKey
      && activePiece(entry)
      && Object.hasOwn(ATTACKER_SCOPES, entry.officialUnitRecordKey)
  ))) {
    for (const target of state.pieces.filter((entry) => (
      entry.sideKey === otherSide(sideKey)
        && activePiece(entry)
        && Object.hasOwn(TARGET_SCOPES, entry.officialUnitRecordKey)
    ))) {
      let context;
      try {
        context = contextFor(state, sideKey, piece, target, bindings, graph);
      } catch {
        continue;
      }
      rows.push({
        ...canonicalAction(sideKey, piece, target, context),
        isEnabled: true,
        disabledReason: "",
        score: 220,
        details: {
          sourceRule: "official_core_2_4_2_5_1_8_7_3_8_7_4_and_part_11",
          officialAttackProfileCatalogueHash: bindings.catalogue.catalogueHash,
          attackResolutionKernelHash: ATTACK_KERNEL.descriptor.kernelHash,
          combatTagShieldedDefenseKernelHash: DEFENSE_KERNEL.descriptor.kernelHash,
          attackPlanHash: context.plan.planHash,
          targetAuthorizationHash: context.targetAuthorization.authorizationHash,
          shieldStateHash: context.shieldState.shieldStateHash,
          targetProfileSource: context.targetScope.profileSource,
          targetCombatTags: [...context.targetCombatProfile.combatTags],
          profileTargetTags: [...context.attackProfile.targetTags],
          surgeTagMatched: context.surgeTagMatched,
          printedHitPoints: context.shieldState.printedHitPoints,
          shieldValue: context.shieldState.shieldValue,
          effectiveFirstModelHitPoints: context.shieldState.effectiveFirstModelHitPoints,
          shieldedBefore: context.shieldState.shielded,
          distanceInches: context.plan.distanceInches,
          rangeBand: context.plan.rangeBand,
          visible: true,
          supportedScope:
            "one_unmodified_goliath_or_marine_vs_one_current_adept_stalker_or_point_defense_drone_no_terrain_no_engagement",
          rulesTruth: "official_current_combat_tag_and_shielded_exact_subset",
          trainingTruth: false,
        },
      });
    }
  }
  return rows.sort((left, right) => (
    `${left.pieceId}:${left.targetId}:${left.weaponName}`.localeCompare(
      `${right.pieceId}:${right.targetId}:${right.weaponName}`,
    )
  ));
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

function sideHasAvailableAssaultActivation(state, sideKey) {
  if (state.players?.[sideKey]?.passedPhases?.assault === true) return false;
  return state.pieces.some((piece) => (
    piece.sideKey === sideKey
      && activePiece(piece)
      && piece.activatedPhases?.assault !== true
  ));
}

function consumeRestriction(piece, state, action) {
  const restriction = piece.disengageAssaultRestriction;
  if (!restriction) return null;
  const historyEntry = {
    schema: "starcraft_tmg_official_post_disengage_assault_restriction_consumption_v1",
    restrictionHash: restriction.restrictionHash,
    declaredRound: restriction.declaredRound,
    consumedRound: Number(state.round),
    consumedPhase: "assault",
    consumedByActionType: OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_ACTION_TYPE,
    consumedByActionHash: hashStarcraftTmgContract(action),
    tacticalMass: restriction.tacticalMass,
    rangedAttackWasProhibited: restriction.rangedAttackProhibited,
    trainingTruth: false,
  };
  piece.disengageAssaultRestrictionHistory = Array.isArray(
    piece.disengageAssaultRestrictionHistory,
  ) ? piece.disengageAssaultRestrictionHistory : [];
  piece.disengageAssaultRestrictionHistory.push(historyEntry);
  delete piece.disengageAssaultRestriction;
  return {
    type: "post_disengage_assault_restriction_consumed",
    pieceId: piece.id,
    restrictionHash: historyEntry.restrictionHash,
    consumedByActionHash: historyEntry.consumedByActionHash,
    trainingTruth: false,
  };
}

export function applyOfficialCombatTagShieldedRangedV1(
  stateInput,
  actionInput,
  options = {},
) {
  validateState(stateInput);
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_VERSION) {
    fail("COMBAT_TAG_SHIELDED_ACTION_INVALID");
  }
  const candidates = enumerateOfficialCombatTagShieldedRangedV1(stateInput, {
    sideKey: actionInput.sideKey,
    matchBinding: options.matchBinding,
  });
  const expectedCandidate = candidates.find((candidate) => (
    candidate.pieceId === actionInput.pieceId
      && candidate.targetId === actionInput.targetId
      && candidate.weaponName === actionInput.weaponName
  ));
  if (!expectedCandidate) fail("COMBAT_TAG_SHIELDED_ACTION_STALE");
  const expectedAction = actionFromCandidate(expectedCandidate);
  if (!isDeepStrictEqual(actionInput, expectedAction)) {
    fail("COMBAT_TAG_SHIELDED_ACTION_MISMATCH");
  }

  const bindings = verifyBindings(stateInput, options.matchBinding);
  const graph = deriveOfficialEngagementGraphV2(stateInput);
  const pieceBefore = stateInput.pieces.find((piece) => piece.id === actionInput.pieceId);
  const targetBefore = stateInput.pieces.find((piece) => piece.id === actionInput.targetId);
  const context = contextFor(
    stateInput,
    actionInput.sideKey,
    pieceBefore,
    targetBefore,
    bindings,
    graph,
  );
  const resolution = ATTACK_KERNEL.resolve(context.plan, options.chanceReveals);
  const defense = DEFENSE_KERNEL.applyDamage({
    shieldState: context.shieldState,
    damage: resolution.stages.damage.totalDamage,
  });

  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === actionInput.pieceId);
  const target = state.pieces.find((entry) => entry.id === actionInput.targetId);
  const targetModel = activeModels(target)[0];
  if (defense.firstModelRemoved) {
    targetModel.isDestroyed = true;
    targetModel.isOnField = false;
    target.currentModels = 0;
    target.currentSupply = 0;
    target.damageMarker = 0;
    target.statuses = (target.statuses || []).filter((status) => status !== "shielded");
    target.isDestroyed = true;
    target.isOnField = false;
  } else {
    target.damageMarker = defense.totalDamageMarker;
    target.statuses = defense.shieldedAfter
      ? ["shielded"]
      : (target.statuses || []).filter((status) => status !== "shielded");
  }
  piece.activatedPhases = {
    movement: false,
    assault: false,
    combat: false,
    ...(piece.activatedPhases || {}),
    assault: true,
  };
  const restrictionEvent = consumeRestriction(piece, state, expectedAction);
  const opponentSideKey = otherSide(actionInput.sideKey);
  if (sideHasAvailableAssaultActivation(state, opponentSideKey)) {
    state.activeSideKey = opponentSideKey;
  } else if (sideHasAvailableAssaultActivation(state, actionInput.sideKey)) {
    state.activeSideKey = actionInput.sideKey;
  }
  const stages = resolution.stages;
  const rangedEvent = {
    type: OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_ACTION_TYPE,
    subtype: "combat_tag_shielded_defense",
    sideKey: actionInput.sideKey,
    pieceId: piece.id,
    targetId: target.id,
    attackerModelId: context.attackerModel.id,
    targetModelId: context.targetModel.id,
    weaponName: context.attackProfile.weaponName,
    attackProfileKey: context.attackProfile.profileKey,
    attackProfileHash: context.attackProfile.profileHash,
    officialAttackProfileCatalogueHash: bindings.catalogue.catalogueHash,
    attackResolutionKernelHash: ATTACK_KERNEL.descriptor.kernelHash,
    combatTagShieldedDefenseKernelHash: DEFENSE_KERNEL.descriptor.kernelHash,
    attackPlanHash: context.plan.planHash,
    attackResolutionHash: resolution.resolutionHash,
    targetAuthorizationHash: context.targetAuthorization.authorizationHash,
    shieldStateHash: context.shieldState.shieldStateHash,
    shieldTransitionHash: defense.transitionHash,
    targetCombatTags: [...context.targetCombatProfile.combatTags],
    profileTargetTags: [...context.attackProfile.targetTags],
    surgeTagMatched: stages.effects.surgeMatched,
    baseSourceBindings: {
      attacker: {
        printedBaseDiameter: context.attackerScope.printedBaseDiameter,
        sourceLocator: context.attackerScope.sourceLocator,
      },
      target: {
        printedBaseDiameter: context.targetScope.printedBaseDiameter,
        sourceLocator: context.targetScope.sourceLocator,
        profileSource: context.targetScope.profileSource,
      },
    },
    engagementGraphHash: graph.graphHash,
    lineOfSightReceiptHash: context.lineOfSightReceipt.receiptHash,
    distanceInches: context.plan.distanceInches,
    rangeBand: context.plan.rangeBand,
    attackPool: clone(stages.hit),
    surgePool: {
      dice: context.plan.chance.layout.surge,
      rolls: [...stages.effects.surgeRolls],
      results: [...stages.effects.surgeResults],
      matched: stages.effects.surgeMatched,
      bypassedArmourHits: stages.effects.bypassedArmourHits,
    },
    armourPool: clone(stages.armour),
    evadePool: clone(stages.evade),
    damagePool: {
      dice: stages.damage.damagePoolDice,
      damagePerDie: stages.damage.damagePerDie,
      incomingDamage: defense.incomingDamage,
      appliedDamage: defense.appliedDamage,
      discardedOverflowDamage: defense.discardedOverflowDamage,
      priorDamageMarker: defense.priorDamageMarker,
      totalDamageMarker: defense.totalDamageMarker,
    },
    shieldedLifecycle: {
      printedHitPoints: defense.printedHitPoints,
      shieldValue: defense.shieldValue,
      effectiveFirstModelHitPoints: defense.effectiveFirstModelHitPoints,
      remainingHitPoints: defense.remainingHitPoints,
      shieldedBefore: defense.shieldedBefore,
      shieldedAfter: defense.shieldedAfter,
      shieldedLost: defense.shieldedLost,
      shieldLossReason: defense.shieldLossReason,
      losingShieldedRemovedRemainingHitPoints:
        defense.losingShieldedRemovedRemainingHitPoints,
    },
    casualtyModelIds: defense.firstModelRemoved ? [targetModel.id] : [],
    postDamageMarker: Number(target.damageMarker || 0),
    targetDestroyed: defense.firstModelRemoved,
    postDisengageRestrictionConsumed: Boolean(restrictionEvent),
    trainingTruth: false,
  };
  const events = restrictionEvent ? [rangedEvent, restrictionEvent] : [rangedEvent];
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
    schemaVersion: "starcraft_tmg_official_combat_tag_shielded_ranged_transition_v1",
    executorId: OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_ID,
    executorVersion: OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expectedAction,
    rulesTruth: "official_current_combat_tag_and_shielded_exact_subset",
    trainingTruth: false,
  };
}
