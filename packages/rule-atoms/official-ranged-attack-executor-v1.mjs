import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import {
  getOfficialAssaultRangedProfileV1,
  verifyOfficialAssaultRangedProfileBundleV1,
} from "../source-data/official-assault-ranged-profile-bundle-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import { deriveOfficialEngagementGraphV2 } from "./official-engagement-graph-v2.mjs";

export const OFFICIAL_RANGED_ATTACK_EXECUTOR_ID = "authority.ranged-attack-v1";
export const OFFICIAL_RANGED_ATTACK_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_RANGED_ATTACK_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_RANGED_ATTACK_ACTION_TYPE = "ranged_attack";

export const OFFICIAL_RANGED_ATTACK_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:assault-action-activation-marker",
  "rule-atom:line-of-sight-top-down-projection",
  "rule-atom:line-of-sight-unobstructed-visibility",
  "rule-atom:singleton:core-11-line-of-sight-definition:a8bfa2968b29",
  "rule-atom:singleton:core-11-line-of-sight-mutuality:6f2f610a5743",
  "rule-atom:singleton:core-11-line-of-sight-trace-geometry:e9a13cc44fb0",
  "rule-atom:singleton:core-11-visible-definition:4ee5aa701166",
  "rule-atom:singleton:core-11-visible-unobstructed-trace:895d45c5102f",
  "rule-atom:singleton:core-12-4-ranged-armour-step:123c67aede51",
  "rule-atom:singleton:core-12-4-ranged-attack-action-summary:9fb51e6d4d96",
  "rule-atom:singleton:core-12-4-ranged-attack-pool-step:3396278609c4",
  "rule-atom:singleton:core-12-4-ranged-damage-casualties-step:a7071a10c9d3",
  "rule-atom:singleton:core-12-4-ranged-hit-step:9da18a20c058",
  "rule-atom:singleton:core-12-4-ranged-surge-step:ad2d58185d06",
  "rule-atom:singleton:core-12-4-ranged-target-declaration-step:a1d459610357",
  "rule-atom:singleton:core-12-4-ranged-target-eligibility-check:8d5197605a7a",
  "rule-atom:singleton:core-3-1-d3-resolution:7ea35c21757f",
  "rule-atom:singleton:core-3-1-d6-resolution:e5c2fafc87ba",
  "rule-atom:singleton:core-3-1-dice-system:e1fed7b25a28",
  "rule-atom:singleton:core-3-1-multiple-dice-resolution:316f7ac580f4",
  "rule-atom:singleton:core-5-1-weapon-surge-die:1bd15f79c785",
  "rule-atom:singleton:core-5-1-weapon-surge-type:a8d3aa377f2c",
  "rule-atom:singleton:core-7-1-clear-trace-visible:4dbcb8dc6598",
  "rule-atom:singleton:core-7-1-los-purpose:c1c991d760fc",
  "rule-atom:singleton:core-8-6-1-reserves-cannot-assault:0d621d154f75",
  "rule-atom:singleton:core-8-7-3-combat-tag-target-match:ac21a155485d",
  "rule-atom:singleton:core-8-7-3-contributing-model-range:c383820a3b42",
  "rule-atom:singleton:core-8-7-3-model-weapon-selection:644a16ff7a70",
  "rule-atom:singleton:core-8-7-3-range-measurement:4266ce5aacd0",
  "rule-atom:singleton:core-8-7-3-same-profile-batch:39a85daa0988",
  "rule-atom:singleton:core-8-7-3-target-and-weapon-stage:1f07a7d27740",
  "rule-atom:singleton:core-8-7-3-target-visible-range:4e5f1374e734",
  "rule-atom:singleton:core-8-7-3-three-pool-stage:114ad8c69d43",
  "rule-atom:singleton:core-8-7-3-two-stage-resolution:279f743d7f59",
  "rule-atom:singleton:core-8-7-3-unengaged-targeting:9b47dbcf21b5",
  "rule-atom:singleton:core-8-7-4-surge-die-generation:3b4cfa2ae9f0",
  "rule-atom:singleton:core-8-7-4-surge-match-bypass:96312207a51a",
  "rule-atom:singleton:core-8-7-4-surge-type-eligibility:edb9613013a0",
  "rule-atom:surge-target-combat-tag-match",
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_RANGED_ATTACK_DEPENDENCY_ATOM_IDS = Object.freeze([
  "rule-atom:engagement-range-horizontal-distance",
  "rule-atom:post-disengage-assault-restriction-with-supply-exception",
  "rule-atom:singleton:core-11-engaged-ground-condition:2b9c2021716e",
  "rule-atom:singleton:core-11-engagement-range-top-down-measurement:8cc5ec9329e0",
  "rule-atom:singleton:core-11-mutual-engagement-range:dea87b4f0181",
  "rule-atom:singleton:core-11-unengaged-ground-condition:2e9dd1ba7f00",
  "rule-atom:singleton:core-5-1-armour:246d3a616a04",
  "rule-atom:singleton:core-5-1-combat-tags:5663bd2a2dd6",
  "rule-atom:singleton:core-5-1-hit-points:2eca3ef2f3c7",
  "rule-atom:singleton:core-5-1-weapon-hit:6b8067e389a2",
  "rule-atom:singleton:core-5-1-weapon-phase-and-range:8f67e49affda",
  "rule-atom:singleton:core-5-1-weapon-rate-of-attack:760646ba5efe",
  "rule-atom:singleton:core-5-1-weapon-target:0ecdc7377c72",
  "rule-atom:singleton:core-7-2-1-ground-tag-engagement:b7297b3931f1",
  "rule-atom:singleton:core-8-7-4-accumulated-total-damage:12bfa0943024",
  "rule-atom:singleton:core-8-7-4-armour-pool-roll:f0d49afb850a",
  "rule-atom:singleton:core-8-7-4-armour-result-transfer:2bb56af0195e",
  "rule-atom:singleton:core-8-7-4-armour-step:174eddf94bef",
  "rule-atom:singleton:core-8-7-4-attack-pool-generation:ba4df14ee6f0",
  "rule-atom:singleton:core-8-7-4-attack-pool-roll:e76d71a66486",
  "rule-atom:singleton:core-8-7-4-batch-hit-step:40b8d1233423",
  "rule-atom:singleton:core-8-7-4-casualty-removal-threshold:813ee5b154f9",
  "rule-atom:singleton:core-8-7-4-damage-pool-resolution:bf5700924e14",
  "rule-atom:singleton:core-8-7-4-damage-step-entry:31d4f5024638",
  "rule-atom:singleton:core-8-7-4-hit-success-transfer:cdb55aba4256",
  "rule-atom:singleton:core-8-7-4-residual-damage-marker:7f5934bce27a",
  "rule-atom:unit-level-engagement-propagation",
  "rule-atom:weapon-damage-characteristic",
  "rule-atom:weapon-damage-pool-calculation",
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_RANGED_ATTACK_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_RANGED_ATTACK_DEPENDENCY_ATOM_IDS,
    ...OFFICIAL_RANGED_ATTACK_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));

const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const MARINE_RECORD_KEY = "army_units:marine";
const MARINE_BASE_DIAMETER_MILLI_INCHES = 1260;
const C14_WEAPON_NAME = "C-14 rifle";

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
    model?.isDestroyed !== true && model?.isOnField !== false
  ));
}

function otherSide(sideKey) {
  if (sideKey === "player1") return "player2";
  if (sideKey === "player2") return "player1";
  fail("RANGED_ATTACK_SIDE_REQUIRED");
}

function milli(value, code, detail = "") {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code, detail);
  return result;
}

function validateState(state) {
  if (!object(state) || !object(state.players) || !object(state.board)
    || !Array.isArray(state.pieces)) {
    fail("RANGED_ATTACK_STATE_INVALID");
  }
}

function verifyProfileBinding(state, matchBinding) {
  const gameplayBundle = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayBundle);
  const rangedBundle = gameplayBundle.assaultRangedProfileBundle;
  verifyOfficialAssaultRangedProfileBundleV1(rangedBundle);
  if (!object(matchBinding)
    || hashStarcraftTmgContract(gameplayBundle) !== matchBinding.dataSnapshotHash) {
    fail("RANGED_ATTACK_DATA_SNAPSHOT_MISMATCH");
  }
  return rangedBundle;
}

function validateRestriction(state, piece) {
  const restriction = piece.disengageAssaultRestriction;
  if (restriction === undefined || restriction === null) return null;
  if (!object(restriction)) fail("RANGED_ATTACK_POST_DISENGAGE_RESTRICTION_INVALID");
  const { restrictionHash, ...body } = restriction;
  if (restriction.schema !== "starcraft_tmg_official_post_disengage_assault_restriction_v1"
    || restriction.appliesToPhase !== "assault"
    || Number(restriction.declaredRound) !== Number(state.round)
    || restriction.trainingTruth !== false
    || hashStarcraftTmgContract(body) !== restrictionHash
    || restriction.rangedAttackProhibited !== !restriction.tacticalMass
    || restriction.chargeProhibited !== !restriction.tacticalMass) {
    fail("RANGED_ATTACK_POST_DISENGAGE_RESTRICTION_INVALID");
  }
  if (restriction.rangedAttackProhibited) {
    fail("RANGED_ATTACK_POST_DISENGAGE_PROHIBITED");
  }
  return restriction;
}

function exactMarineModel(piece, profile, role) {
  const models = activeModels(piece);
  if (piece.officialUnitRecordKey !== MARINE_RECORD_KEY
    || piece.sourceRecordHash !== profile.sourceRecordHash
    || Number(piece.currentModels) !== 1
    || Number(piece.currentSupply) !== 0
    || models.length !== 1
    || piece.combatTag !== "ground"
    || !profile.combatTags.includes("ground")
    || (piece.statuses || []).length !== 0
    || (piece.selectedUpgradeNames || []).length !== 0
    || (piece.combatEffects || []).length !== 0
    || (piece.assaultEffects || []).length !== 0
    || models[0].baseShape !== "round"
    || milli(models[0].baseWidthInches, "RANGED_ATTACK_BASE_SCOPE_UNSUPPORTED")
      !== MARINE_BASE_DIAMETER_MILLI_INCHES
    || milli(models[0].baseDepthInches, "RANGED_ATTACK_BASE_SCOPE_UNSUPPORTED")
      !== MARINE_BASE_DIAMETER_MILLI_INCHES
    || models[0].elevation !== "ground"
    || !isDeepStrictEqual(models[0].supportTerrainIds, [])
    || !isDeepStrictEqual(models[0].adjacentAccessPointIds, [])) {
    fail("RANGED_ATTACK_MARINE_SCOPE_UNSUPPORTED", role);
  }
  return models[0];
}

function baseGapMilliInches(left, right) {
  return Math.max(0, Math.round(Math.hypot(
    milli(right.xInches, "RANGED_ATTACK_MODEL_GEOMETRY_INVALID")
      - milli(left.xInches, "RANGED_ATTACK_MODEL_GEOMETRY_INVALID"),
    milli(right.yInches, "RANGED_ATTACK_MODEL_GEOMETRY_INVALID")
      - milli(left.yInches, "RANGED_ATTACK_MODEL_GEOMETRY_INVALID"),
  ) - (MARINE_BASE_DIAMETER_MILLI_INCHES / 2) - (MARINE_BASE_DIAMETER_MILLI_INCHES / 2)));
}

function c14Weapon(profile) {
  const weapons = profile.assaultWeapons.filter((weapon) => (
    weapon.weaponName === C14_WEAPON_NAME
      && weapon.linkedTo === "-"
      && weapon.costSmall === 0
      && weapon.costLarge === 0
      && weapon.behaviorText === ""
  ));
  if (weapons.length !== 1) fail("RANGED_ATTACK_C14_PROFILE_DRIFT");
  const weapon = weapons[0];
  if (weapon.rangeInches !== 12
    || !isDeepStrictEqual(weapon.targetTags, ["all"])
    || weapon.rateOfAttack !== 2
    || weapon.hitThreshold !== 3
    || weapon.damage !== 1
    || !isDeepStrictEqual(weapon.surge, { targetTag: "light", dice: "D3" })) {
    fail("RANGED_ATTACK_C14_PROFILE_DRIFT");
  }
  return weapon;
}

function contextFor(state, sideKey, piece, target, rangedBundle, graph) {
  if (state.phase !== "assault") fail("RANGED_ATTACK_WRONG_PHASE");
  if (state.activeSideKey !== sideKey) fail("RANGED_ATTACK_NOT_ACTIVE_SIDE");
  if (state.players?.[sideKey]?.passedPhases?.assault === true) {
    fail("RANGED_ATTACK_SIDE_PASSED");
  }
  if (!activePiece(piece) || piece.sideKey !== sideKey) {
    fail("RANGED_ATTACK_UNIT_UNAVAILABLE");
  }
  if (!activePiece(target) || target.sideKey !== otherSide(sideKey)) {
    fail("RANGED_ATTACK_TARGET_UNAVAILABLE");
  }
  if (piece.activatedPhases?.assault === true) fail("RANGED_ATTACK_ALREADY_ACTIVATED");
  if ((state.board.terrain || []).length !== 0 || (state.board.accessPoints || []).length !== 0) {
    fail("RANGED_ATTACK_TERRAIN_SCOPE_UNSUPPORTED");
  }
  if (graph.engagedUnitIds.includes(piece.id) || graph.engagedUnitIds.includes(target.id)) {
    fail("RANGED_ATTACK_ENGAGEMENT_SCOPE_UNSUPPORTED");
  }
  const attackerProfile = getOfficialAssaultRangedProfileV1(
    rangedBundle,
    piece.officialUnitRecordKey,
  );
  const targetProfile = getOfficialAssaultRangedProfileV1(
    rangedBundle,
    target.officialUnitRecordKey,
  );
  const attackerModel = exactMarineModel(piece, attackerProfile, "attacker");
  const targetModel = exactMarineModel(target, targetProfile, "target");
  const damageMarker = Number(target.damageMarker || 0);
  if (targetProfile.shield !== 0
    || !Number.isSafeInteger(damageMarker)
    || damageMarker < 0
    || damageMarker >= targetProfile.hitPoints) {
    fail("RANGED_ATTACK_TARGET_DAMAGE_SCOPE_UNSUPPORTED");
  }
  const restriction = validateRestriction(state, piece);
  const weapon = c14Weapon(attackerProfile);
  const rangeMilliInches = weapon.rangeInches * 1000;
  const baseGap = baseGapMilliInches(attackerModel, targetModel);
  if (baseGap > rangeMilliInches) fail("RANGED_ATTACK_TARGET_OUT_OF_RANGE");
  if (!weapon.targetTags.includes("all")
    && !weapon.targetTags.some((tag) => targetProfile.combatTags.includes(tag))) {
    fail("RANGED_ATTACK_TARGET_TAG_INELIGIBLE");
  }
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
    attackerProfile,
    targetProfile,
    attackerModel,
    targetModel,
    weapon,
    restriction,
    baseGapMilliInches: baseGap,
    lineOfSightReceipt: {
      ...lineOfSightBody,
      receiptHash: hashStarcraftTmgContract(lineOfSightBody),
    },
  };
}

function canonicalAction(sideKey, piece, target, context) {
  return {
    actionType: OFFICIAL_RANGED_ATTACK_ACTION_TYPE,
    sideKey,
    phase: "assault",
    pieceId: piece.id,
    targetId: target.id,
    weaponName: context.weapon.weaponName,
    chance: {
      kind: "fixed_roll_sequence",
      faces: 6,
      count: 5,
      layout: { hit: 2, armour: 2, evade: 0, surge: 1 },
    },
    ruleAtomIds: [...OFFICIAL_RANGED_ATTACK_ACTION_ATOM_IDS],
    executorId: OFFICIAL_RANGED_ATTACK_EXECUTOR_ID,
    executorVersion: OFFICIAL_RANGED_ATTACK_EXECUTOR_VERSION,
  };
}

export function enumerateOfficialRangedAttackActionsV1(state, options = {}) {
  validateState(state);
  const sideKey = String(options.sideKey || state.activeSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey)) fail("RANGED_ATTACK_SIDE_REQUIRED");
  let rangedBundle;
  let graph;
  try {
    rangedBundle = verifyProfileBinding(state, options.matchBinding);
    graph = deriveOfficialEngagementGraphV2(state);
  } catch (error) {
    if (options.includeDisabled !== true) return [];
    return [];
  }
  const rows = [];
  for (const piece of state.pieces.filter((entry) => entry.sideKey === sideKey && activePiece(entry))) {
    for (const target of state.pieces.filter((entry) => (
      entry.sideKey === otherSide(sideKey) && activePiece(entry)
    ))) {
      let disabledReason = "";
      let context;
      try {
        context = contextFor(state, sideKey, piece, target, rangedBundle, graph);
      } catch (error) {
        disabledReason = String(error?.message || error).split(":")[0];
      }
      const fallbackProfile = getOfficialAssaultRangedProfileV1(
        rangedBundle,
        piece.officialUnitRecordKey,
      );
      const fallbackContext = {
        weapon: c14Weapon(fallbackProfile),
      };
      const row = {
        ...canonicalAction(sideKey, piece, target, context || fallbackContext),
        isEnabled: !disabledReason,
        disabledReason,
        score: disabledReason ? 0 : 180,
        details: {
          sourceRule: "official_core_3_1_5_1_7_1_8_6_1_8_7_3_8_7_4_and_quick_reference_12_4",
          officialAssaultRangedProfileBundleHash: rangedBundle.bundleHash,
          engagementGraphHash: graph.graphHash,
          lineOfSightReceiptHash: context?.lineOfSightReceipt.receiptHash || "",
          rangeInches: context?.weapon.rangeInches || 12,
          distanceInches: context
            ? Number((context.baseGapMilliInches / 1000).toFixed(3))
            : null,
          visible: Boolean(context?.lineOfSightReceipt.visible),
          engaged: graph.engagedUnitIds.includes(piece.id),
          supportedScope: "single_model_unmodified_ground_marine_c14_no_terrain_no_shield",
          rulesTruth: "official_current_profile_bound_ranged_attack_subset",
          trainingTruth: false,
        },
      };
      if (options.includeDisabled === true || row.isEnabled) rows.push(row);
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

function validateChanceReveals(chanceReveals, expected) {
  if (!Array.isArray(chanceReveals) || chanceReveals.length !== expected.count) {
    fail("RANGED_ATTACK_CHANCE_REVEALS_REQUIRED");
  }
  return chanceReveals.map((reveal) => {
    const outcome = Number(reveal?.outcome);
    if (Number(reveal?.faces) !== expected.faces
      || !Number.isSafeInteger(outcome)
      || outcome < 1
      || outcome > expected.faces) {
      fail("RANGED_ATTACK_CHANCE_REVEAL_INVALID");
    }
    return outcome;
  });
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
    consumedByActionType: OFFICIAL_RANGED_ATTACK_ACTION_TYPE,
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
    consumedByActionType: historyEntry.consumedByActionType,
    consumedByActionHash: historyEntry.consumedByActionHash,
    tacticalMass: historyEntry.tacticalMass,
    trainingTruth: false,
  };
}

export function applyOfficialRangedAttackV1(stateInput, actionInput, options = {}) {
  validateState(stateInput);
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_RANGED_ATTACK_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_RANGED_ATTACK_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_RANGED_ATTACK_EXECUTOR_VERSION) {
    fail("RANGED_ATTACK_ACTION_INVALID");
  }
  const candidates = enumerateOfficialRangedAttackActionsV1(stateInput, {
    sideKey: actionInput.sideKey,
    matchBinding: options.matchBinding,
  });
  const expectedCandidate = candidates.find((candidate) => (
    candidate.pieceId === actionInput.pieceId
      && candidate.targetId === actionInput.targetId
      && candidate.weaponName === actionInput.weaponName
  ));
  if (!expectedCandidate) fail("RANGED_ATTACK_ACTION_STALE");
  const expectedAction = actionFromCandidate(expectedCandidate);
  if (!isDeepStrictEqual(actionInput, expectedAction)) fail("RANGED_ATTACK_ACTION_MISMATCH");

  const rangedBundle = verifyProfileBinding(stateInput, options.matchBinding);
  const graph = deriveOfficialEngagementGraphV2(stateInput);
  const pieceBefore = stateInput.pieces.find((piece) => piece.id === actionInput.pieceId);
  const targetBefore = stateInput.pieces.find((piece) => piece.id === actionInput.targetId);
  const context = contextFor(
    stateInput,
    actionInput.sideKey,
    pieceBefore,
    targetBefore,
    rangedBundle,
    graph,
  );
  const rolls = validateChanceReveals(options.chanceReveals, expectedAction.chance);
  const hitRolls = rolls.slice(0, 2);
  const surgeRolls = rolls.slice(2, 3);
  const armourRolls = rolls.slice(3, 5);
  const hits = hitRolls.filter((roll) => roll >= context.weapon.hitThreshold).length;
  const surgeResults = surgeRolls.map((roll) => Math.ceil(roll / 2));
  const surgeMatched = context.targetProfile.combatTags.includes(
    context.weapon.surge.targetTag,
  );
  const bypassedArmourHits = surgeMatched
    ? Math.min(hits, surgeResults.reduce((total, value) => total + value, 0))
    : 0;
  const armourDice = hits - bypassedArmourHits;
  const resolvedArmourRolls = armourRolls.slice(0, armourDice);
  const saves = resolvedArmourRolls.filter((roll) => (
    roll >= context.targetProfile.armourThreshold
  )).length;
  const damagePoolDice = bypassedArmourHits + armourDice - saves;

  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === actionInput.pieceId);
  const target = state.pieces.find((entry) => entry.id === actionInput.targetId);
  const targetModel = activeModels(target)[0];
  const priorDamageMarker = Number(target.damageMarker || 0);
  const totalDamage = priorDamageMarker + (damagePoolDice * context.weapon.damage);
  const casualty = totalDamage >= context.targetProfile.hitPoints;
  if (casualty) {
    targetModel.isDestroyed = true;
    targetModel.isOnField = false;
    target.currentModels = 0;
    target.currentSupply = 0;
    target.damageMarker = 0;
    target.isDestroyed = true;
    target.isOnField = false;
  } else {
    target.damageMarker = totalDamage;
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
  const rangedEvent = {
    type: OFFICIAL_RANGED_ATTACK_ACTION_TYPE,
    sideKey: actionInput.sideKey,
    pieceId: piece.id,
    targetId: target.id,
    attackerModelId: context.attackerModel.id,
    targetModelId: context.targetModel.id,
    weaponName: context.weapon.weaponName,
    officialAssaultRangedProfileBundleHash: rangedBundle.bundleHash,
    engagementGraphHash: graph.graphHash,
    lineOfSightReceiptHash: context.lineOfSightReceipt.receiptHash,
    distanceInches: Number((context.baseGapMilliInches / 1000).toFixed(3)),
    attackPool: {
      dice: 2,
      rolls: hitRolls,
      hitThreshold: context.weapon.hitThreshold,
      hits,
    },
    surgePool: {
      dice: 1,
      rolls: surgeRolls,
      dieType: context.weapon.surge.dice,
      results: surgeResults,
      targetTag: context.weapon.surge.targetTag,
      matched: surgeMatched,
      bypassedArmourHits,
    },
    armourPool: {
      dice: armourDice,
      rolls: resolvedArmourRolls,
      unusedPreallocatedRolls: armourRolls.slice(armourDice),
      armourThreshold: context.targetProfile.armourThreshold,
      saves,
    },
    evadePool: {
      dice: 0,
      rolls: [],
      reason: "unengaged_no_cover_no_high_ground_no_explicit_evade_grant",
    },
    damagePool: {
      dice: damagePoolDice,
      damagePerDie: context.weapon.damage,
      priorDamageMarker,
      totalDamage,
    },
    casualtyModelIds: casualty ? [targetModel.id] : [],
    postDamageMarker: Number(target.damageMarker || 0),
    targetDestroyed: casualty,
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
    schemaVersion: "starcraft_tmg_official_ranged_attack_transition_v1",
    executorId: OFFICIAL_RANGED_ATTACK_EXECUTOR_ID,
    executorVersion: OFFICIAL_RANGED_ATTACK_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expectedAction,
    rulesTruth: "official_current_profile_bound_ranged_attack_subset",
    trainingTruth: false,
  };
}
