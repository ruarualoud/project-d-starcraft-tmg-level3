import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import {
  getOfficialCombatProfileV1,
  verifyOfficialCombatProfileBundleV1,
} from "../source-data/official-combat-profile-bundle-v1.mjs";
import { OFFICIAL_ELEVATED_ENGAGEMENT_NEW_ATOM_IDS } from "./official-combat-pass-executor-v2.mjs";
import { deriveOfficialEngagementGraphV2 } from "./official-engagement-graph-v2.mjs";

export const OFFICIAL_CLOSE_COMBAT_ATTACK_EXECUTOR_ID = "authority.close-combat-attack-v1";
export const OFFICIAL_CLOSE_COMBAT_ATTACK_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_CLOSE_COMBAT_ATTACK_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";

export const OFFICIAL_CLOSE_COMBAT_ATTACK_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:base-contact-casualty-priority",
  "rule-atom:engaged-casualty-priority-unengaged-models-first",
  "rule-atom:engaged-non-contact-casualty-priority",
  "rule-atom:fighting-rank-membership",
  "rule-atom:fighting-rank-strike-permission",
  "rule-atom:singleton:core-12-5-close-combat-action-summary:8003e08811dc",
  "rule-atom:singleton:core-12-5-combat-alternating-activations:64d1f7b43ac7",
  "rule-atom:singleton:core-12-7-close-combat-casualty-step:2dae2d1eb115",
  "rule-atom:singleton:core-12-7-close-combat-roll-step:48e990ba6cd9",
  "rule-atom:singleton:core-12-7-declare-ranks-step:823f305bfb49",
  "rule-atom:singleton:core-12-7-preserve-engagement-casualty:7fd582a8d40f",
  "rule-atom:singleton:core-5-1-armour:246d3a616a04",
  "rule-atom:singleton:core-5-1-combat-tags:5663bd2a2dd6",
  "rule-atom:singleton:core-5-1-hit-points:2eca3ef2f3c7",
  "rule-atom:singleton:core-5-1-weapon-hit:6b8067e389a2",
  "rule-atom:singleton:core-5-1-weapon-phase-and-range:8f67e49affda",
  "rule-atom:singleton:core-5-1-weapon-rate-of-attack:760646ba5efe",
  "rule-atom:singleton:core-5-1-weapon-target:0ecdc7377c72",
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
  "rule-atom:singleton:core-8-7-4-no-surge-result:ba6b234eedd3",
  "rule-atom:singleton:core-8-7-4-residual-damage-marker:7f5934bce27a",
  "rule-atom:singleton:core-8-7-5-engaged-casualty-visibility:ba5a6df81658",
  "rule-atom:singleton:core-8-7-5-preserve-specific-engagement:b8e418206537",
  "rule-atom:singleton:core-8-8-1-choose-one-combat-weapon:8b1b6145c94f",
  "rule-atom:singleton:core-8-8-1-close-combat-attack-sequence:c6a4c2a50923",
  "rule-atom:singleton:core-8-8-1-close-combat-definition:e498ba47afea",
  "rule-atom:singleton:core-8-8-1-engaged-casualty-removal:e29c24d17996",
  "rule-atom:singleton:core-8-8-1-fighting-rank:9988b0a87a5b",
  "rule-atom:singleton:core-8-8-1-no-melee-line-of-sight:d2b7e3086c48",
  "rule-atom:singleton:core-8-8-1-post-combat-unengaged:cc59d447c59c",
  "rule-atom:singleton:core-8-8-1-unit-wide-melee-target:8e374d45a0ca",
  "rule-atom:singleton:core-8-8-close-combat-procedure:9b168769540b",
  "rule-atom:singleton:core-8-8-one-engaged-unit-activation:d057c060f544",
  "rule-atom:supporting-rank-core-eligibility",
  "rule-atom:supporting-rank-glossary-membership",
  "rule-atom:supporting-rank-strike-permission",
  "rule-atom:weapon-damage-characteristic",
  "rule-atom:weapon-damage-pool-calculation",
].sort());

export const OFFICIAL_CLOSE_COMBAT_ATTACK_DEPENDENCY_ATOM_IDS = Object.freeze([
  "rule-atom:engaged-combat-activation-alternation",
  "rule-atom:engagement-range-horizontal-distance",
  "rule-atom:flying-cannot-be-engaged",
  "rule-atom:flying-engagement-immunity-composite",
  "rule-atom:singleton:core-11-engaged-ground-condition:2b9c2021716e",
  "rule-atom:singleton:core-11-engaged-terrain-block:015124cec0f0",
  "rule-atom:singleton:core-11-engagement-range-top-down-measurement:8cc5ec9329e0",
  "rule-atom:singleton:core-11-mutual-engagement-range:dea87b4f0181",
  "rule-atom:singleton:core-11-unengaged-flying:d8ee46a61288",
  "rule-atom:singleton:core-11-unengaged-ground-condition:2e9dd1ba7f00",
  "rule-atom:singleton:core-7-2-1-ground-tag-engagement:b7297b3931f1",
  "rule-atom:singleton:core-7-2-1-terrain-engagement:2b8304f688dd",
  "rule-atom:singleton:core-8-8-engaged-unit-eligibility:82151c0ac7d7",
  "rule-atom:singleton:core-8-8-flying-combat-exclusion:6dd5609b1ee1",
  "rule-atom:singleton:core-8-8-mandatory-combat-activation:a2dbc7ad7908",
  "rule-atom:unit-level-engagement-propagation",
  ...OFFICIAL_ELEVATED_ENGAGEMENT_NEW_ATOM_IDS,
].sort());

export const OFFICIAL_CLOSE_COMBAT_ATTACK_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_CLOSE_COMBAT_ATTACK_DEPENDENCY_ATOM_IDS,
    ...OFFICIAL_CLOSE_COMBAT_ATTACK_NEW_ATOM_IDS,
  ]),
].sort());

const SIDE_KEYS = Object.freeze(["player1", "player2"]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function otherSide(sideKey) {
  if (sideKey === "player1") return "player2";
  if (sideKey === "player2") return "player1";
  fail("CLOSE_COMBAT_ATTACK_SIDE_REQUIRED");
}

function activePiece(piece) {
  return piece?.isOnField === true
    && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}

function activeModels(piece) {
  return (piece.models || []).filter((model) => (
    model?.isDestroyed !== true && model?.isOnField !== false
  ));
}

function supplyAt(profile, modelCount) {
  if (modelCount === 0) return 0;
  const tier = profile.squadProfile.find((entry) => (
    entry.minimumModels !== null
      && modelCount >= entry.minimumModels
      && modelCount <= entry.maximumModels
  ));
  if (!tier) fail("CLOSE_COMBAT_ATTACK_SUPPLY_TIER_UNRESOLVED", `${profile.recordKey}:${modelCount}`);
  return tier.supply;
}

function verifyProfileBinding(state, matchBinding) {
  const bundle = state.officialCombatProfileBundle;
  verifyOfficialCombatProfileBundleV1(bundle);
  if (!object(matchBinding)
    || hashStarcraftTmgContract(bundle) !== matchBinding.dataSnapshotHash) {
    fail("CLOSE_COMBAT_ATTACK_DATA_SNAPSHOT_MISMATCH");
  }
  return bundle;
}

function exactModelById(piece, modelId) {
  return activeModels(piece).find((model) => model.id === modelId);
}

function modelIdsEngagedWithUnit(graph, unitId, enemyUnitId) {
  return [...new Set(graph.modelEdges.flatMap((edge) => {
    if (edge.leftUnitId === unitId && edge.rightUnitId === enemyUnitId) return [edge.leftModelId];
    if (edge.rightUnitId === unitId && edge.leftUnitId === enemyUnitId) return [edge.rightModelId];
    return [];
  }))].sort((left, right) => left.localeCompare(right));
}

function enemyUnitIdsFor(graph, unitId) {
  return [...new Set(graph.modelEdges.flatMap((edge) => {
    if (edge.leftUnitId === unitId) return [edge.rightUnitId];
    if (edge.rightUnitId === unitId) return [edge.leftUnitId];
    return [];
  }))].sort((left, right) => left.localeCompare(right));
}

function milli(value) {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail("CLOSE_COMBAT_ATTACK_MODEL_GEOMETRY_INVALID");
  return result;
}

function basesTouch(left, right) {
  const leftRadius = milli(left.baseWidthInches) / 2;
  const rightRadius = milli(right.baseWidthInches) / 2;
  const distance = Math.hypot(
    milli(right.xInches) - milli(left.xInches),
    milli(right.yInches) - milli(left.yInches),
  );
  return Math.abs(distance - leftRadius - rightRadius) <= 1;
}

function ranksFor(attacker, target, graph) {
  const fightingModelIds = modelIdsEngagedWithUnit(graph, attacker.id, target.id);
  const fightingSet = new Set(fightingModelIds);
  const attackerModels = activeModels(attacker);
  const supportingModelIds = attackerModels.filter((model) => (
    !fightingSet.has(model.id)
      && attackerModels.some((friend) => fightingSet.has(friend.id) && basesTouch(model, friend))
  )).map((model) => model.id).sort((left, right) => left.localeCompare(right));
  return { fightingModelIds, supportingModelIds };
}

function simpleWeapons(profile, piece) {
  if ((piece.selectedUpgradeNames || []).length > 0
    || (piece.statuses || []).length > 0
    || (piece.combatEffects || []).length > 0) return [];
  return profile.combatWeapons.filter((weapon) => (
    weapon.costSmall === 0
      && weapon.costLarge === 0
      && weapon.linkedTo === "-"
      && weapon.range === "engagement"
      && weapon.surge === null
      && weapon.behaviorText === ""
  ));
}

function contextFor(state, sideKey, piece, target, weapon, graph, bundle) {
  if (!activePiece(piece) || piece.sideKey !== sideKey) fail("CLOSE_COMBAT_ATTACK_UNIT_UNAVAILABLE");
  if (!activePiece(target) || target.sideKey !== otherSide(sideKey)) fail("CLOSE_COMBAT_ATTACK_TARGET_UNAVAILABLE");
  if (piece.activatedPhases?.combat === true) fail("CLOSE_COMBAT_ATTACK_ALREADY_ACTIVATED");
  const enemyUnitIds = enemyUnitIdsFor(graph, piece.id);
  if (!isDeepStrictEqual(enemyUnitIds, [target.id])) fail("CLOSE_COMBAT_ATTACK_SINGLE_TARGET_REQUIRED");
  if (activeModels(target).length !== 1) fail("CLOSE_COMBAT_ATTACK_SINGLE_TARGET_MODEL_REQUIRED");
  const attackerProfile = getOfficialCombatProfileV1(bundle, piece.officialUnitRecordKey);
  const targetProfile = getOfficialCombatProfileV1(bundle, target.officialUnitRecordKey);
  if (piece.combatTag !== "ground" || target.combatTag !== "ground"
    || !attackerProfile.combatTags.includes(piece.combatTag)
    || !targetProfile.combatTags.includes(target.combatTag)) {
    fail("CLOSE_COMBAT_ATTACK_PROFILE_TAG_MISMATCH");
  }
  if (targetProfile.shield !== 0
    || (target.statuses || []).length > 0
    || (target.combatEffects || []).length > 0
    || (target.selectedUpgradeNames || []).length > 0) {
    fail("CLOSE_COMBAT_ATTACK_TARGET_EFFECTS_UNSUPPORTED");
  }
  if (Number(piece.currentSupply) !== supplyAt(attackerProfile, Number(piece.currentModels))
    || Number(target.currentSupply) !== supplyAt(targetProfile, Number(target.currentModels))
    || supplyAt(targetProfile, 0) !== Number(target.currentSupply)) {
    fail("CLOSE_COMBAT_ATTACK_SUPPLY_CHANGE_UNSUPPORTED");
  }
  if (!weapon.targetTags.includes(target.combatTag)) fail("CLOSE_COMBAT_ATTACK_TARGET_TAG_INELIGIBLE");
  const ranks = ranksFor(piece, target, graph);
  const eligibleModelCount = ranks.fightingModelIds.length + ranks.supportingModelIds.length;
  if (eligibleModelCount <= 0) fail("CLOSE_COMBAT_ATTACK_NO_ELIGIBLE_MODELS");
  const attackDice = eligibleModelCount * weapon.rateOfAttack;
  if (!Number.isSafeInteger(attackDice) || attackDice <= 0) fail("CLOSE_COMBAT_ATTACK_POOL_INVALID");
  return { attackerProfile, targetProfile, ranks, eligibleModelCount, attackDice };
}

function canonicalAction(sideKey, piece, target, weapon, attackDice) {
  return {
    actionType: "fight",
    sideKey,
    phase: "combat",
    pieceId: piece.id,
    targetId: target.id,
    weaponName: weapon.weaponName,
    closeRanksMode: "decline",
    chance: {
      kind: "fixed_roll_sequence",
      faces: 6,
      count: attackDice * 2,
      layout: { hit: attackDice, armour: attackDice, evade: 0, surge: 0 },
    },
    ruleAtomIds: [...OFFICIAL_CLOSE_COMBAT_ATTACK_ACTION_ATOM_IDS],
    executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_EXECUTOR_VERSION,
  };
}

function validateState(state) {
  if (!object(state) || !object(state.players) || !Array.isArray(state.pieces)) {
    fail("CLOSE_COMBAT_ATTACK_STATE_INVALID");
  }
}

export function enumerateOfficialCloseCombatAttackActionsV1(state, options = {}) {
  validateState(state);
  const sideKey = String(options.sideKey || state.activeSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey)) fail("CLOSE_COMBAT_ATTACK_SIDE_REQUIRED");
  const rows = [];
  let graph;
  let bundle;
  try {
    graph = deriveOfficialEngagementGraphV2(state);
    bundle = verifyProfileBinding(state, options.matchBinding);
  } catch (error) {
    if (options.includeDisabled !== true) return [];
    return [{
      ...canonicalAction(sideKey, { id: "" }, { id: "" }, { weaponName: "" }, 1),
      isEnabled: false,
      disabledReason: String(error?.message || error),
      score: 0,
      details: { rulesTruth: "official_close_combat_fail_closed", trainingTruth: false },
    }];
  }
  for (const piece of state.pieces.filter((entry) => entry.sideKey === sideKey)) {
    const targetIds = enemyUnitIdsFor(graph, piece.id);
    for (const targetId of targetIds) {
      const target = state.pieces.find((entry) => entry.id === targetId);
      const profile = getOfficialCombatProfileV1(bundle, piece.officialUnitRecordKey);
      for (const weapon of simpleWeapons(profile, piece)) {
        let disabledReason = "";
        let context;
        if (state.phase !== "combat") disabledReason = "CLOSE_COMBAT_ATTACK_WRONG_PHASE";
        else if (state.activeSideKey !== sideKey) disabledReason = "CLOSE_COMBAT_ATTACK_NOT_ACTIVE_SIDE";
        else {
          try {
            context = contextFor(state, sideKey, piece, target, weapon, graph, bundle);
          } catch (error) {
            disabledReason = String(error?.message || error);
          }
        }
        const attackDice = context?.attackDice || 1;
        const row = {
          ...canonicalAction(sideKey, piece, target, weapon, attackDice),
          isEnabled: !disabledReason,
          disabledReason,
          score: disabledReason ? 0 : 200,
          details: {
            sourceRule: "official_core_5_1_8_7_4_8_7_5_8_8_1_and_quick_reference_12",
            officialCombatProfileBundleHash: bundle.bundleHash,
            engagementGraphHash: graph.graphHash,
            fightingModelIds: context?.ranks.fightingModelIds || [],
            supportingModelIds: context?.ranks.supportingModelIds || [],
            attackDice: context?.attackDice || 0,
            closeRanksMode: "decline",
            supportedScope: "single_enemy_single_target_model_simple_no_surge_no_evade_no_modifier_weapon",
            rulesTruth: "official_current_profile_bound_close_combat_attack_subset",
            trainingTruth: false,
          },
        };
        if (options.includeDisabled === true || row.isEnabled) rows.push(row);
      }
    }
  }
  return rows;
}

function validateChanceReveals(chanceReveals, expected) {
  if (!Array.isArray(chanceReveals) || chanceReveals.length !== expected.count) {
    fail("CLOSE_COMBAT_ATTACK_CHANCE_REVEALS_REQUIRED");
  }
  return chanceReveals.map((reveal) => {
    const outcome = Number(reveal?.outcome);
    if (reveal?.faces !== expected.faces
      || !Number.isSafeInteger(outcome)
      || outcome < 1
      || outcome > expected.faces) {
      fail("CLOSE_COMBAT_ATTACK_CHANCE_REVEAL_INVALID");
    }
    return outcome;
  });
}

export function applyOfficialCloseCombatAttackV1(stateInput, actionInput, options = {}) {
  validateState(stateInput);
  if (!object(actionInput) || actionInput.actionType !== "fight") {
    fail("CLOSE_COMBAT_ATTACK_ACTION_INVALID");
  }
  const state = clone(stateInput);
  const sideKey = String(actionInput.sideKey || "").trim();
  if (state.phase !== "combat" || actionInput.phase !== "combat") fail("CLOSE_COMBAT_ATTACK_WRONG_PHASE");
  if (state.activeSideKey !== sideKey) fail("CLOSE_COMBAT_ATTACK_NOT_ACTIVE_SIDE");
  if (actionInput.closeRanksMode !== "decline") fail("CLOSE_COMBAT_ATTACK_CLOSE_RANKS_UNSUPPORTED");
  const bundle = verifyProfileBinding(state, options.matchBinding);
  const graph = deriveOfficialEngagementGraphV2(state);
  const piece = state.pieces.find((entry) => entry.id === actionInput.pieceId);
  const target = state.pieces.find((entry) => entry.id === actionInput.targetId);
  const profile = getOfficialCombatProfileV1(bundle, piece?.officialUnitRecordKey);
  const weapon = simpleWeapons(profile, piece).find((entry) => entry.weaponName === actionInput.weaponName);
  if (!weapon) fail("CLOSE_COMBAT_ATTACK_WEAPON_UNAVAILABLE");
  const context = contextFor(state, sideKey, piece, target, weapon, graph, bundle);
  const resolvedAction = canonicalAction(sideKey, piece, target, weapon, context.attackDice);
  if (!isDeepStrictEqual(actionInput, resolvedAction)) fail("CLOSE_COMBAT_ATTACK_ACTION_MISMATCH");
  const rolls = validateChanceReveals(options.chanceReveals, resolvedAction.chance);
  const hitRolls = rolls.slice(0, context.attackDice);
  const armourRolls = rolls.slice(context.attackDice);
  const hits = hitRolls.filter((roll) => roll >= weapon.hitThreshold).length;
  const resolvedArmourRolls = armourRolls.slice(0, hits);
  const saves = resolvedArmourRolls.filter((roll) => roll >= context.targetProfile.armourThreshold).length;
  const damagePoolDice = hits - saves;
  const priorDamageMarker = Number(target.damageMarker || 0);
  const totalDamage = priorDamageMarker + (damagePoolDice * weapon.damage);
  const casualty = totalDamage >= context.targetProfile.hitPoints;
  const targetModel = activeModels(target)[0];
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
  piece.activatedPhases = piece.activatedPhases || {};
  piece.activatedPhases.combat = true;
  state.activeSideKey = otherSide(sideKey);
  const postGraph = deriveOfficialEngagementGraphV2(state);
  const events = [{
    type: "close_combat_attack",
    sideKey,
    pieceId: piece.id,
    targetId: target.id,
    weaponName: weapon.weaponName,
    closeRanksMode: "decline",
    officialCombatProfileBundleHash: bundle.bundleHash,
    preEngagementGraphHash: graph.graphHash,
    postEngagementGraphHash: postGraph.graphHash,
    fightingModelIds: context.ranks.fightingModelIds,
    supportingModelIds: context.ranks.supportingModelIds,
    attackPool: { dice: context.attackDice, rolls: hitRolls, hitThreshold: weapon.hitThreshold, hits },
    surgePool: { dice: 0, rolls: [], matches: 0 },
    armourPool: {
      dice: hits,
      rolls: resolvedArmourRolls,
      unusedPreallocatedRolls: armourRolls.slice(hits),
      armourThreshold: context.targetProfile.armourThreshold,
      saves,
    },
    evadePool: { dice: 0, rolls: [], reason: "no_explicit_close_combat_evade_grant" },
    damagePool: { dice: damagePoolDice, damagePerDie: weapon.damage, priorDamageMarker, totalDamage },
    casualtyModelIds: casualty ? [targetModel.id] : [],
    postDamageMarker: Number(target.damageMarker || 0),
    targetDestroyed: casualty,
    trainingTruth: false,
  }];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round || 1),
    phase: "combat",
    action: clone(resolvedAction),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_close_combat_attack_transition_v1",
    executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: resolvedAction,
    engagementGraph: postGraph,
    rulesTruth: "official_current_profile_bound_close_combat_attack_subset",
    trainingTruth: false,
  };
}
