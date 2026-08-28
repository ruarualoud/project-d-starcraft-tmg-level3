import {
  deriveOfficialEngagementGraphV1,
  OfficialEngagementGraphError,
} from "./official-engagement-graph-v1.mjs";

export const OFFICIAL_COMBAT_PASS_EXECUTOR_ID = "authority.combat-pass-v1";
export const OFFICIAL_COMBAT_PASS_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_COMBAT_PASS_TRANSITION_SCHEMA = "starcraft_tmg_authority_v2.receipt";

const BASE_ATOM_IDS = Object.freeze([
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
  "rule-atom:singleton:core-12-5-combat-pass-condition:9d5fb2064f3d",
  "rule-atom:singleton:core-12-5-engaged-unit-activation-required:d887d728cb84",
  "rule-atom:singleton:core-7-2-1-ground-tag-engagement:b7297b3931f1",
  "rule-atom:singleton:core-7-2-1-terrain-engagement:2b8304f688dd",
  "rule-atom:singleton:core-8-8-engaged-unit-eligibility:82151c0ac7d7",
  "rule-atom:singleton:core-8-8-flying-combat-exclusion:6dd5609b1ee1",
  "rule-atom:singleton:core-8-8-mandatory-combat-activation:a2dbc7ad7908",
  "rule-atom:singleton:core-8-8-mandatory-pass-condition:a5a59090c9ad",
  "rule-atom:unit-level-engagement-propagation",
].sort());
const SETTLEMENT_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-8-8-both-pass-phase-end:298eb297cb06",
]);

export const OFFICIAL_COMBAT_PASS_ATOM_IDS = Object.freeze([
  ...BASE_ATOM_IDS,
  ...SETTLEMENT_ATOM_IDS,
].sort());

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
  fail("COMBAT_PASS_SIDE_REQUIRED");
}

function sidePassed(state, sideKey) {
  return state.players?.[sideKey]?.passedPhases?.combat === true;
}

function remainingEngagedUnitIds(state, graph, sideKey) {
  const engaged = new Set(graph.engagedUnitIdsBySide[sideKey] || []);
  return (state.pieces || []).filter((piece) => (
    piece.sideKey === sideKey
      && engaged.has(piece.id)
      && piece.isOnField === true
      && piece.isDestroyed !== true
      && Number(piece.currentModels || 0) > 0
      && piece.activatedPhases?.combat !== true
  )).map((piece) => piece.id).sort();
}

export function officialCombatPassAtomIdsForStateV1(state, sideKey) {
  const ids = [...BASE_ATOM_IDS];
  if (sidePassed(state, otherSide(sideKey))) ids.push(...SETTLEMENT_ATOM_IDS);
  return ids.sort();
}

function action(state, sideKey) {
  return {
    actionType: "pass",
    sideKey,
    phase: "combat",
    ruleAtomIds: officialCombatPassAtomIdsForStateV1(state, sideKey),
    executorId: OFFICIAL_COMBAT_PASS_EXECUTOR_ID,
    executorVersion: OFFICIAL_COMBAT_PASS_EXECUTOR_VERSION,
  };
}

function validateState(state) {
  if (!object(state) || !object(state.players) || !Array.isArray(state.pieces)) {
    fail("COMBAT_PASS_STATE_INVALID");
  }
}

export function enumerateOfficialCombatPassActionsV1(state, options = {}) {
  validateState(state);
  const sideKey = String(options.sideKey || state.activeSideKey || "").trim();
  if (!sideKey) fail("COMBAT_PASS_SIDE_REQUIRED");
  let graph = null;
  let disabledReason = "";
  let remainingUnitIds = [];
  if (state.phase !== "combat") disabledReason = "COMBAT_PASS_WRONG_PHASE";
  else if (sideKey !== state.activeSideKey) disabledReason = "COMBAT_PASS_NOT_ACTIVE_SIDE";
  else if (sidePassed(state, sideKey)) disabledReason = "COMBAT_PASS_ALREADY_PASSED";
  if (!disabledReason) {
    try {
      graph = deriveOfficialEngagementGraphV1(state);
      remainingUnitIds = remainingEngagedUnitIds(state, graph, sideKey);
      if (remainingUnitIds.length > 0) disabledReason = "COMBAT_PASS_ENGAGED_UNIT_REMAINS";
    } catch (error) {
      if (!(error instanceof OfficialEngagementGraphError)) throw error;
      disabledReason = error.code;
    }
  }
  const row = {
    ...action(state, sideKey),
    isEnabled: !disabledReason,
    disabledReason,
    score: disabledReason ? 0 : 100,
    details: {
      sourceRule: "official_core_7_2_7_2_1_8_8_11_and_quick_reference_12_5",
      passKind: "mandatory",
      engagementGraphHash: graph?.graphHash || null,
      engagedUnitIds: graph?.engagedUnitIds || [],
      remainingEngagedUnitIds: remainingUnitIds,
      geometryScope: graph?.supportedGeometryScope || "unresolved",
      rulesTruth: "combat_pass_requires_zero_remaining_engaged_units",
      trainingTruth: false,
    },
  };
  return options.includeDisabled === true || row.isEnabled ? [row] : [];
}

export function applyOfficialCombatPassV1(stateInput, actionInput, options = {}) {
  validateState(stateInput);
  if (!object(actionInput) || actionInput.actionType !== "pass") fail("COMBAT_PASS_ACTION_INVALID");
  const state = clone(stateInput);
  const sideKey = String(actionInput.sideKey || "").trim();
  if (!sideKey) fail("COMBAT_PASS_SIDE_REQUIRED");
  if (state.phase !== "combat" || actionInput.phase !== "combat") fail("COMBAT_PASS_WRONG_PHASE");
  if (sideKey !== state.activeSideKey) fail("COMBAT_PASS_NOT_ACTIVE_SIDE");
  if (sidePassed(state, sideKey)) fail("COMBAT_PASS_ALREADY_PASSED");
  const graph = deriveOfficialEngagementGraphV1(state);
  const remainingUnitIds = remainingEngagedUnitIds(state, graph, sideKey);
  if (remainingUnitIds.length > 0) fail("COMBAT_PASS_ENGAGED_UNIT_REMAINS", remainingUnitIds.join(","));
  const resolvedAction = action(state, sideKey);
  state.players[sideKey].passedPhases = state.players[sideKey].passedPhases || {};
  state.players[sideKey].passedPhases.combat = true;
  const events = [{
    type: "combat_pass",
    sideKey,
    phase: "combat",
    passKind: "mandatory",
    engagementGraphHash: graph.graphHash,
    engagedUnitIds: graph.engagedUnitIds,
    remainingEngagedUnitIds: [],
  }];
  const opponentSideKey = otherSide(sideKey);
  if (sidePassed(state, opponentSideKey)) {
    state.phase = "cleanup";
    state.activeSideKey = null;
    events.push({
      type: "phase_advanced",
      fromPhase: "combat",
      phase: "cleanup",
      round: Number(state.round || 1),
      activeSideKey: null,
    });
  } else {
    state.activeSideKey = opponentSideKey;
  }
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
    schemaVersion: "starcraft_tmg_official_combat_pass_transition_v1",
    executorId: OFFICIAL_COMBAT_PASS_EXECUTOR_ID,
    executorVersion: OFFICIAL_COMBAT_PASS_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: resolvedAction,
    engagementGraph: graph,
    rulesTruth: "combat_pass_requires_zero_remaining_engaged_units",
    trainingTruth: false,
  };
}
