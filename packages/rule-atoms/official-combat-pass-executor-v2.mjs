import {
  OFFICIAL_COMBAT_PASS_ATOM_IDS,
} from "./official-combat-pass-executor-v1.mjs";
import {
  deriveOfficialEngagementGraphV2,
  OfficialEngagementGraphV2Error,
} from "./official-engagement-graph-v2.mjs";

export const OFFICIAL_COMBAT_PASS_V2_EXECUTOR_ID = "authority.combat-pass-v2";
export const OFFICIAL_COMBAT_PASS_V2_EXECUTOR_VERSION = "2.0.0";
export const OFFICIAL_COMBAT_PASS_V2_TRANSITION_SCHEMA = "starcraft_tmg_authority_v2.receipt";

const SETTLEMENT_ATOM_ID = "rule-atom:singleton:core-8-8-both-pass-phase-end:298eb297cb06";

export const OFFICIAL_ELEVATED_ENGAGEMENT_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:battlefield-elevation-band-map",
  "rule-atom:ground-level-elevation-definition",
  "rule-atom:ground-tag-elevation-terminology-distinction",
  "rule-atom:ground-to-mid-access-point-engagement",
  "rule-atom:high-ground-elevation-definition",
  "rule-atom:high-ground-ground-level-engagement-prohibition",
  "rule-atom:high-to-mid-access-point-engagement",
  "rule-atom:mid-ground-cross-elevation-engagement",
  "rule-atom:mid-ground-elevation-definition",
  "rule-atom:model-base-elevation-rule",
  "rule-atom:multi-level-model-elevation-rule",
  "rule-atom:singleton:core-11-access-point-definition:549c620ba267",
  "rule-atom:singleton:core-11-flying-elevation-and-access:7941f34132a1",
  "rule-atom:singleton:core-11-multiple-elevation-highest:fc8ff738bce5",
].sort());

const BASE_ATOM_IDS = Object.freeze([
  ...OFFICIAL_COMBAT_PASS_ATOM_IDS.filter((atomId) => atomId !== SETTLEMENT_ATOM_ID),
  ...OFFICIAL_ELEVATED_ENGAGEMENT_NEW_ATOM_IDS,
].sort());

export const OFFICIAL_COMBAT_PASS_V2_ATOM_IDS = Object.freeze([
  ...BASE_ATOM_IDS,
  SETTLEMENT_ATOM_ID,
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
  fail("COMBAT_PASS_V2_SIDE_REQUIRED");
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

export function officialCombatPassV2AtomIdsForState(state, sideKey) {
  const ids = [...BASE_ATOM_IDS];
  if (sidePassed(state, otherSide(sideKey))) ids.push(SETTLEMENT_ATOM_ID);
  return ids.sort();
}

function action(state, sideKey) {
  return {
    actionType: "pass",
    sideKey,
    phase: "combat",
    ruleAtomIds: officialCombatPassV2AtomIdsForState(state, sideKey),
    executorId: OFFICIAL_COMBAT_PASS_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_COMBAT_PASS_V2_EXECUTOR_VERSION,
  };
}

function validateState(state) {
  if (!object(state) || !object(state.players) || !Array.isArray(state.pieces)) {
    fail("COMBAT_PASS_V2_STATE_INVALID");
  }
}

export function enumerateOfficialCombatPassV2Actions(state, options = {}) {
  validateState(state);
  const sideKey = String(options.sideKey || state.activeSideKey || "").trim();
  if (!sideKey) fail("COMBAT_PASS_V2_SIDE_REQUIRED");
  let graph = null;
  let disabledReason = "";
  let remainingUnitIds = [];
  if (state.phase !== "combat") disabledReason = "COMBAT_PASS_V2_WRONG_PHASE";
  else if (sideKey !== state.activeSideKey) disabledReason = "COMBAT_PASS_V2_NOT_ACTIVE_SIDE";
  else if (sidePassed(state, sideKey)) disabledReason = "COMBAT_PASS_V2_ALREADY_PASSED";
  if (!disabledReason) {
    try {
      graph = deriveOfficialEngagementGraphV2(state);
      remainingUnitIds = remainingEngagedUnitIds(state, graph, sideKey);
      if (remainingUnitIds.length > 0) disabledReason = "COMBAT_PASS_ENGAGED_UNIT_REMAINS";
    } catch (error) {
      if (!(error instanceof OfficialEngagementGraphV2Error)) throw error;
      disabledReason = error.code;
    }
  }
  const row = {
    ...action(state, sideKey),
    isEnabled: !disabledReason,
    disabledReason,
    score: disabledReason ? 0 : 100,
    details: {
      sourceRule: "official_core_7_2_1_8_8_11_and_quick_reference_12_5",
      passKind: "mandatory",
      engagementGraphSchema: graph?.schema || null,
      engagementGraphHash: graph?.graphHash || null,
      engagedUnitIds: graph?.engagedUnitIds || [],
      remainingEngagedUnitIds: remainingUnitIds,
      geometryScope: graph?.supportedGeometryScope || "unresolved",
      rulesTruth: "combat_pass_v2_requires_zero_remaining_engaged_units",
      trainingTruth: false,
    },
  };
  return options.includeDisabled === true || row.isEnabled ? [row] : [];
}

export function applyOfficialCombatPassV2(stateInput, actionInput, options = {}) {
  validateState(stateInput);
  if (!object(actionInput) || actionInput.actionType !== "pass") fail("COMBAT_PASS_V2_ACTION_INVALID");
  const state = clone(stateInput);
  const sideKey = String(actionInput.sideKey || "").trim();
  if (!sideKey) fail("COMBAT_PASS_V2_SIDE_REQUIRED");
  if (state.phase !== "combat" || actionInput.phase !== "combat") fail("COMBAT_PASS_V2_WRONG_PHASE");
  if (sideKey !== state.activeSideKey) fail("COMBAT_PASS_V2_NOT_ACTIVE_SIDE");
  if (sidePassed(state, sideKey)) fail("COMBAT_PASS_V2_ALREADY_PASSED");
  const graph = deriveOfficialEngagementGraphV2(state);
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
    engagementGraphSchema: graph.schema,
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
    schemaVersion: "starcraft_tmg_official_combat_pass_transition_v2",
    executorId: OFFICIAL_COMBAT_PASS_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_COMBAT_PASS_V2_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: resolvedAction,
    engagementGraph: graph,
    rulesTruth: "combat_pass_v2_requires_zero_remaining_engaged_units",
    trainingTruth: false,
  };
}
