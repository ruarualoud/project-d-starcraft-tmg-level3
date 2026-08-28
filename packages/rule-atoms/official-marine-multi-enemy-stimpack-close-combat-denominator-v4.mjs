import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { deriveOfficialEngagementGraphV2 } from
  "./official-engagement-graph-v2.mjs";
import {
  createOfficialMarineMultiModelCloseCombatDenominatorV2,
} from "./official-marine-multi-model-close-combat-denominator-v2.mjs";

export const OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CLOSE_COMBAT_DENOMINATOR_V4_ID =
  "authority.marine-multi-enemy-stimpack-close-combat-denominator-v4";
export const OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CLOSE_COMBAT_DENOMINATOR_V4_VERSION =
  "4.0.0";
export const OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CLOSE_COMBAT_PLAN_V4_SCHEMA =
  "starcraft_tmg_official_marine_multi_enemy_stimpack_close_combat_plan_v4";

const V2 = createOfficialMarineMultiModelCloseCombatDenominatorV2();

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
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

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function pairProjection(state, leftPieceId, targetPieceId) {
  const projected = clone(state);
  delete projected.pendingAction;
  projected.pieces = projected.pieces.filter((piece) => (
    piece.id === leftPieceId || piece.id === targetPieceId
  ));
  projected.board.effectMarkers = (projected.board.effectMarkers || []).filter((marker) => (
    marker?.targetPieceId === leftPieceId
  ));
  projected.activeAbilityUseHistory = (projected.activeAbilityUseHistory || []).filter((entry) => (
    entry?.pieceId === leftPieceId
  ));
  if (projected.pieces.length !== 2) {
    fail("MARINE_MULTI_ENEMY_STIMPACK_V4_PAIR_PROJECTION_INVALID");
  }
  return projected;
}

function enemyUnitIdsFor(graph, pieceId) {
  return [...new Set(graph.modelEdges.flatMap((edge) => {
    if (edge.leftUnitId === pieceId) return [edge.rightUnitId];
    if (edge.rightUnitId === pieceId) return [edge.leftUnitId];
    return [];
  }))].sort((left, right) => left.localeCompare(right));
}

function modelIdsEngagedWithUnit(graph, pieceId, enemyPieceId) {
  return [...new Set(graph.modelEdges.flatMap((edge) => {
    if (edge.leftUnitId === pieceId && edge.rightUnitId === enemyPieceId) {
      return [edge.leftModelId];
    }
    if (edge.rightUnitId === pieceId && edge.leftUnitId === enemyPieceId) {
      return [edge.rightModelId];
    }
    return [];
  }))].sort((left, right) => left.localeCompare(right));
}

function plan(input = {}) {
  const state = input.state;
  const sideKey = String(input.sideKey || state?.activeSideKey || "").trim();
  if (!object(state)
    || !["player1", "player2"].includes(sideKey)
    || state.activeSideKey !== sideKey
    || state.phase !== "combat"
    || state.pendingAction !== undefined && state.pendingAction !== null
    || !Array.isArray(state.pieces)
    || state.pieces.length !== 3
    || !Array.isArray(state.board?.effectMarkers)
    || !Array.isArray(state.activeAbilityUseHistory)) {
    fail("MARINE_MULTI_ENEMY_STIMPACK_V4_COMBAT_SCOPE_UNSUPPORTED");
  }
  const attacker = state.pieces.find((piece) => piece.id === input.attackerPieceId);
  const target = state.pieces.find((piece) => piece.id === input.targetPieceId);
  const coEngagers = state.pieces.filter((piece) => (
    piece.sideKey === sideKey && piece.id !== attacker?.id
  ));
  if (!attacker || !target || attacker.id === target.id
    || target.sideKey === sideKey
    || coEngagers.length !== 1
    || state.board.effectMarkers.some((marker) => marker?.targetPieceId !== attacker.id)
    || state.activeAbilityUseHistory.some((entry) => entry?.pieceId !== attacker.id)) {
    fail("MARINE_MULTI_ENEMY_STIMPACK_V4_PARTICIPANTS_OR_EFFECT_SCOPE_INVALID");
  }
  const coEngager = coEngagers[0];
  const selectedPairPlan = V2.plan({
    state: pairProjection(state, attacker.id, target.id),
    sideKey,
    attackerPieceId: attacker.id,
    targetPieceId: target.id,
    matchBinding: input.matchBinding,
  });
  const coEngagerPairPlan = V2.plan({
    state: pairProjection(state, coEngager.id, target.id),
    sideKey,
    attackerPieceId: coEngager.id,
    targetPieceId: target.id,
    matchBinding: input.matchBinding,
  });
  if (!selectedPairPlan.stimpacked
    || coEngagerPairPlan.stimpacked
    || !selectedPairPlan.unitWideLoadout.selectedUpgradeNames.includes("Stimpack")
    || !isDeepStrictEqual(coEngagerPairPlan.unitWideLoadout.selectedUpgradeNames, [])) {
    fail("MARINE_MULTI_ENEMY_STIMPACK_V4_EXACT_LOADOUT_REQUIRED");
  }
  const graph = deriveOfficialEngagementGraphV2(state);
  const expectedEnemyUnitIds = [attacker.id, coEngager.id]
    .sort((left, right) => left.localeCompare(right));
  const targetEngagedEnemyUnitIds = enemyUnitIdsFor(graph, target.id);
  if (!isDeepStrictEqual(targetEngagedEnemyUnitIds, expectedEnemyUnitIds)
    || !isDeepStrictEqual(enemyUnitIdsFor(graph, attacker.id), [target.id])
    || !isDeepStrictEqual(enemyUnitIdsFor(graph, coEngager.id), [target.id])
    || !isDeepStrictEqual(
      modelIdsEngagedWithUnit(graph, attacker.id, target.id),
      selectedPairPlan.fightingModelIds,
    )
    || !isDeepStrictEqual(
      modelIdsEngagedWithUnit(graph, coEngager.id, target.id),
      coEngagerPairPlan.fightingModelIds,
    )) {
    fail("MARINE_MULTI_ENEMY_STIMPACK_V4_ENGAGEMENT_SCOPE_INVALID");
  }
  const body = {
    schema: OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CLOSE_COMBAT_PLAN_V4_SCHEMA,
    denominatorId: OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CLOSE_COMBAT_DENOMINATOR_V4_ID,
    denominatorVersion:
      OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CLOSE_COMBAT_DENOMINATOR_V4_VERSION,
    sourceBinding: clone(selectedPairPlan.sourceBinding),
    sideKey,
    attackerPieceId: attacker.id,
    coEngagerPieceId: coEngager.id,
    targetPieceId: target.id,
    attackerLedger: clone(selectedPairPlan.attackerLedger),
    coEngagerLedger: clone(coEngagerPairPlan.attackerLedger),
    targetLedger: clone(selectedPairPlan.targetLedger),
    targetHitPoints: selectedPairPlan.targetHitPoints,
    targetPriorDamageMarker: selectedPairPlan.targetPriorDamageMarker,
    unitWideLoadout: clone(selectedPairPlan.unitWideLoadout),
    weapon: clone(selectedPairPlan.weapon),
    fightingModelIds: [...selectedPairPlan.fightingModelIds],
    supportingModelIds: [...selectedPairPlan.supportingModelIds],
    eligibleModelIds: [...selectedPairPlan.eligibleModelIds],
    eligibleModelCount: selectedPairPlan.eligibleModelCount,
    rateOfAttack: selectedPairPlan.rateOfAttack,
    attackDice: selectedPairPlan.attackDice,
    chance: clone(selectedPairPlan.chance),
    stimpacked: true,
    statusEffectHash: selectedPairPlan.statusEffectHash,
    markerHash: selectedPairPlan.markerHash,
    abilityUseHash: selectedPairPlan.abilityUseHash,
    precisionValue: selectedPairPlan.precisionValue,
    selectedPairPlan: clone(selectedPairPlan),
    coEngagerPairPlan: clone(coEngagerPairPlan),
    selectedPairEngagementGraphHash: selectedPairPlan.engagementGraphHash,
    coEngagerPairEngagementGraphHash: coEngagerPairPlan.engagementGraphHash,
    engagementGraphHash: graph.graphHash,
    targetEngagedEnemyUnitIds,
    casualtyPolicy:
      "full_multi_model_target_choice_preserving_each_specific_enemy_unit_engagement",
    precisionPolicy:
      "selected_attacker_failed_hit_choice_before_defender_casualty_choice",
    targetInteractionScope:
      "exact_three_marine_units_stimpacked_attacker_and_clean_coengager",
    staleDomainPolicy:
      "any_three_unit_ledger_geometry_rank_loadout_status_marker_history_damage_or_engagement_change_rederive",
    rulesTruth:
      "official_current_marine_multi_enemy_stimpack_close_combat_denominator",
    trainingTruth: false,
  };
  return freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
}

function verifyPlan(input = {}) {
  const observed = input.plan;
  if (!object(observed)
    || observed.schema !== OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CLOSE_COMBAT_PLAN_V4_SCHEMA
    || observed.denominatorId
      !== OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CLOSE_COMBAT_DENOMINATOR_V4_ID
    || observed.denominatorVersion
      !== OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CLOSE_COMBAT_DENOMINATOR_V4_VERSION
    || observed.planHash !== hashStarcraftTmgContract(without(observed, ["planHash"]))) {
    fail("MARINE_MULTI_ENEMY_STIMPACK_V4_PLAN_INVALID");
  }
  const expected = plan({
    state: input.state,
    sideKey: observed.sideKey,
    attackerPieceId: observed.attackerPieceId,
    targetPieceId: observed.targetPieceId,
    matchBinding: input.matchBinding,
  });
  if (!isDeepStrictEqual(observed, expected)) {
    fail("MARINE_MULTI_ENEMY_STIMPACK_V4_PLAN_STALE");
  }
  return true;
}

const descriptorBody = {
  schema:
    "starcraft_tmg_official_marine_multi_enemy_stimpack_close_combat_denominator_descriptor_v4",
  denominatorId: OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CLOSE_COMBAT_DENOMINATOR_V4_ID,
  denominatorVersion:
    OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CLOSE_COMBAT_DENOMINATOR_V4_VERSION,
  delegatedFrozenDenominatorHash: V2.descriptor.denominatorHash,
  delegatedFrozenDenominatorMutationAllowed: false,
  interface: ["plan", "verifyPlan"],
  participantScope: "stimpacked_marine_and_clean_marine_coengage_one_enemy_marine",
  targetEngagedEnemyUnitCount: 2,
  selectedAttackerLoadouts: ["Stimpack", "Bayonet_plus_Stimpack"],
  coEngagerLoadout: "unmodified_Strike",
  precisionValue: 3,
  fullEngagementGraphBound: true,
  specificEnemyUnitEngagementPreservationRequired: true,
  repositoryFallbackAllowed: false,
  rulesTruth: "official_current_multi_enemy_stimpack_engagement_denominator",
  trainingTruth: false,
};

export function createOfficialMarineMultiEnemyStimpackCloseCombatDenominatorV4() {
  return freezeDeep({
    descriptor: {
      ...descriptorBody,
      denominatorHash: hashStarcraftTmgContract(descriptorBody),
    },
    plan,
    verifyPlan,
  });
}
