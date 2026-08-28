import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { deriveOfficialEngagementGraphV2 } from
  "./official-engagement-graph-v2.mjs";
import {
  createOfficialMarineMultiModelCloseCombatDenominatorV2,
} from "./official-marine-multi-model-close-combat-denominator-v2.mjs";

export const OFFICIAL_MARINE_MULTI_ENEMY_CLOSE_COMBAT_DENOMINATOR_V3_ID =
  "authority.marine-multi-enemy-close-combat-denominator-v3";
export const OFFICIAL_MARINE_MULTI_ENEMY_CLOSE_COMBAT_DENOMINATOR_V3_VERSION =
  "3.0.0";
export const OFFICIAL_MARINE_MULTI_ENEMY_CLOSE_COMBAT_PLAN_V3_SCHEMA =
  "starcraft_tmg_official_marine_multi_enemy_close_combat_plan_v3";

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
  if (projected.pieces.length !== 2) {
    fail("MARINE_MULTI_ENEMY_V3_PAIR_PROJECTION_INVALID");
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
    || !isDeepStrictEqual(state.board?.effectMarkers || [], [])
    || !isDeepStrictEqual(state.activeAbilityUseHistory || [], [])) {
    fail("MARINE_MULTI_ENEMY_V3_COMBAT_SCOPE_UNSUPPORTED");
  }
  const attacker = state.pieces.find((piece) => piece.id === input.attackerPieceId);
  const target = state.pieces.find((piece) => piece.id === input.targetPieceId);
  const coEngagers = state.pieces.filter((piece) => (
    piece.sideKey === sideKey && piece.id !== attacker?.id
  ));
  if (!attacker || !target || attacker.id === target.id
    || target.sideKey === sideKey
    || coEngagers.length !== 1) {
    fail("MARINE_MULTI_ENEMY_V3_PARTICIPANTS_INVALID");
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
  if (selectedPairPlan.stimpacked
    || coEngagerPairPlan.stimpacked
    || selectedPairPlan.unitWideLoadout.selectedUpgradeNames.includes("Stimpack")
    || !isDeepStrictEqual(coEngagerPairPlan.unitWideLoadout.selectedUpgradeNames, [])) {
    fail("MARINE_MULTI_ENEMY_V3_STIMPACK_SCOPE_PENDING");
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
    fail("MARINE_MULTI_ENEMY_V3_ENGAGEMENT_SCOPE_INVALID");
  }
  const body = {
    schema: OFFICIAL_MARINE_MULTI_ENEMY_CLOSE_COMBAT_PLAN_V3_SCHEMA,
    denominatorId: OFFICIAL_MARINE_MULTI_ENEMY_CLOSE_COMBAT_DENOMINATOR_V3_ID,
    denominatorVersion: OFFICIAL_MARINE_MULTI_ENEMY_CLOSE_COMBAT_DENOMINATOR_V3_VERSION,
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
    selectedPairPlan: clone(selectedPairPlan),
    coEngagerPairPlan: clone(coEngagerPairPlan),
    selectedPairEngagementGraphHash: selectedPairPlan.engagementGraphHash,
    coEngagerPairEngagementGraphHash: coEngagerPairPlan.engagementGraphHash,
    engagementGraphHash: graph.graphHash,
    targetEngagedEnemyUnitIds,
    casualtyPolicy:
      "full_multi_model_target_choice_preserving_each_specific_enemy_unit_engagement",
    targetInteractionScope:
      "exact_three_marine_units_target_engaged_by_two_enemy_units",
    staleDomainPolicy:
      "any_three_unit_ledger_geometry_rank_loadout_activation_damage_or_engagement_change_rederive",
    rulesTruth:
      "official_current_marine_multi_enemy_engagement_close_combat_denominator",
    trainingTruth: false,
  };
  return freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
}

function verifyPlan(input = {}) {
  const observed = input.plan;
  if (!object(observed)
    || observed.schema !== OFFICIAL_MARINE_MULTI_ENEMY_CLOSE_COMBAT_PLAN_V3_SCHEMA
    || observed.denominatorId !== OFFICIAL_MARINE_MULTI_ENEMY_CLOSE_COMBAT_DENOMINATOR_V3_ID
    || observed.denominatorVersion
      !== OFFICIAL_MARINE_MULTI_ENEMY_CLOSE_COMBAT_DENOMINATOR_V3_VERSION
    || observed.planHash !== hashStarcraftTmgContract(without(observed, ["planHash"]))) {
    fail("MARINE_MULTI_ENEMY_V3_PLAN_INVALID");
  }
  const expected = plan({
    state: input.state,
    sideKey: observed.sideKey,
    attackerPieceId: observed.attackerPieceId,
    targetPieceId: observed.targetPieceId,
    matchBinding: input.matchBinding,
  });
  if (!isDeepStrictEqual(observed, expected)) {
    fail("MARINE_MULTI_ENEMY_V3_PLAN_STALE");
  }
  return true;
}

const descriptorBody = {
  schema: "starcraft_tmg_official_marine_multi_enemy_close_combat_denominator_descriptor_v3",
  denominatorId: OFFICIAL_MARINE_MULTI_ENEMY_CLOSE_COMBAT_DENOMINATOR_V3_ID,
  denominatorVersion: OFFICIAL_MARINE_MULTI_ENEMY_CLOSE_COMBAT_DENOMINATOR_V3_VERSION,
  delegatedFrozenDenominatorHash: V2.descriptor.denominatorHash,
  delegatedFrozenDenominatorMutationAllowed: false,
  interface: ["plan", "verifyPlan"],
  participantScope: "two_friendly_marine_units_and_one_enemy_marine_unit",
  targetEngagedEnemyUnitCount: 2,
  selectedAttackerLoadouts: ["Strike", "Bayonet_replaces_Strike"],
  coEngagerLoadout: "unmodified_Strike",
  stimpackScope: "pending",
  fullEngagementGraphBound: true,
  specificEnemyUnitEngagementPreservationRequired: true,
  repositoryFallbackAllowed: false,
  rulesTruth: "official_current_multi_enemy_engagement_denominator",
  trainingTruth: false,
};

export function createOfficialMarineMultiEnemyCloseCombatDenominatorV3() {
  return freezeDeep({
    descriptor: {
      ...descriptorBody,
      denominatorHash: hashStarcraftTmgContract(descriptorBody),
    },
    plan,
    verifyPlan,
  });
}
