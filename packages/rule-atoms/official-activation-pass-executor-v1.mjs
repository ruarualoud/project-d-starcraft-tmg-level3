export const OFFICIAL_ACTIVATION_PASS_EXECUTOR_ID = "authority.activation-pass-v1";
export const OFFICIAL_ACTIVATION_PASS_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_ACTIVATION_PASS_TRANSITION_SCHEMA = "starcraft_tmg_authority_v2.receipt";

const GENERAL_PASS_ATOM_IDS = Object.freeze([
  "rule-atom:first-passer-next-phase-marker",
  "rule-atom:general-first-player-phase-priority",
  "rule-atom:singleton:core-8-2-1-mandatory-pass:c3f3099c0aee",
  "rule-atom:singleton:core-8-2-1-optional-pass:ce1210ada5c9",
  "rule-atom:singleton:core-8-2-1-pass-lockout-and-completion:5000debbc056",
]);

const PHASE_PASS_ATOM_IDS = Object.freeze({
  movement: Object.freeze([
    "rule-atom:first-passer-phase-two-marker",
    "rule-atom:movement-first-pass-priority",
    "rule-atom:singleton:core-8-4-2-unactivated-unit-markers:d4d57b8ee9fb",
  ]),
  assault: Object.freeze([
    "rule-atom:combat-first-pass-priority",
    "rule-atom:first-passer-phase-three-marker",
    "rule-atom:singleton:core-8-6-2-unactivated-assault-markers:3af601495352",
  ]),
});

export const OFFICIAL_ACTIVATION_PASS_ATOM_IDS = Object.freeze([
  ...GENERAL_PASS_ATOM_IDS,
  ...PHASE_PASS_ATOM_IDS.movement,
  ...PHASE_PASS_ATOM_IDS.assault,
].sort());

const SUPPORTED_PHASES = Object.freeze(["movement", "assault"]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function activeOnTablePiece(piece) {
  return piece?.isOnField === true
    && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}

function sidePassed(state, sideKey, phase) {
  return state?.players?.[sideKey]?.passedPhases?.[phase] === true;
}

function phaseActivated(piece, phase) {
  return piece?.activatedPhases?.[phase] === true;
}

function defaultSideHasAvailableActivation(state, sideKey, phase) {
  if (sidePassed(state, sideKey, phase)) return false;
  return (state.pieces || []).some((piece) => (
    piece.sideKey === sideKey
      && activeOnTablePiece(piece)
      && !phaseActivated(piece, phase)
  ));
}

function markUnactivatedOnTableUnits(state, sideKey, phase) {
  const markedPieceIds = [];
  for (const piece of state.pieces || []) {
    if (piece.sideKey !== sideKey || !activeOnTablePiece(piece) || phaseActivated(piece, phase)) continue;
    piece.activatedPhases = {
      movement: false,
      assault: false,
      combat: false,
      ...(piece.activatedPhases || {}),
      [phase]: true,
    };
    markedPieceIds.push(piece.id);
  }
  return markedPieceIds.sort((left, right) => left.localeCompare(right));
}

function nextPhase(phase) {
  if (phase === "movement") return "assault";
  if (phase === "assault") return "combat";
  fail("PASS_WRONG_PHASE", phase);
}

function completePhase(state, phase) {
  const markerAssignments = {
    player1: markUnactivatedOnTableUnits(state, "player1", phase),
    player2: markUnactivatedOnTableUnits(state, "player2", phase),
  };
  const next = nextPhase(phase);
  for (const piece of state.pieces || []) {
    piece.activatedPhases = {
      movement: false,
      assault: false,
      combat: false,
      ...(piece.activatedPhases || {}),
      [next]: false,
    };
  }
  state.phase = next;
  state.players = state.players || {};
  for (const sideKey of ["player1", "player2"]) {
    state.players[sideKey] = state.players[sideKey] || { sideKey };
    state.players[sideKey].passedPhases = state.players[sideKey].passedPhases || {};
    delete state.players[sideKey].passedPhases[next];
  }
  state.activeSideKey = state.firstPlayerSideKey || "player1";
  return [{
    type: "phase_activation_markers_completed",
    phase,
    markerAssignments,
  }, {
    type: "phase_advanced",
    fromPhase: phase,
    phase: next,
    round: Number(state.round || 1),
    activeSideKey: state.activeSideKey,
  }];
}

function validateState(state) {
  if (!object(state) || !Array.isArray(state.pieces) || !object(state.players)) {
    fail("PASS_STATE_INVALID");
  }
}

function rejectionCode(state, sideKey, actionPhase) {
  if (!SUPPORTED_PHASES.includes(state.phase)) return "PASS_WRONG_PHASE";
  if (actionPhase !== state.phase) return "PASS_PHASE_STALE";
  if (sideKey !== state.activeSideKey) return "PASS_NOT_ACTIVE_SIDE";
  if (sidePassed(state, sideKey, state.phase)) return "PASS_ALREADY_PASSED";
  return null;
}

export function officialActivationPassAtomIdsForPhaseV1(phase) {
  if (!SUPPORTED_PHASES.includes(phase)) fail("PASS_WRONG_PHASE", phase);
  return [...GENERAL_PASS_ATOM_IDS, ...PHASE_PASS_ATOM_IDS[phase]]
    .sort((left, right) => left.localeCompare(right));
}

function enrichedAction(action) {
  return {
    actionType: "pass",
    sideKey: action.sideKey,
    phase: action.phase,
    ruleAtomIds: officialActivationPassAtomIdsForPhaseV1(action.phase),
    executorId: OFFICIAL_ACTIVATION_PASS_EXECUTOR_ID,
    executorVersion: OFFICIAL_ACTIVATION_PASS_EXECUTOR_VERSION,
  };
}

export function enumerateOfficialActivationPassActionsV1(state, options = {}) {
  validateState(state);
  const sideKey = String(options.sideKey || state.activeSideKey || "").trim();
  if (!sideKey) fail("PASS_SIDE_REQUIRED");
  const phase = String(state.phase || "").trim();
  if (!SUPPORTED_PHASES.includes(phase)) return [];
  const rejected = rejectionCode(state, sideKey, phase);
  const sideHasAvailableActivation = typeof options.sideHasAvailableActivation === "function"
    ? options.sideHasAvailableActivation
    : (targetSideKey, targetState, targetPhase) => (
      defaultSideHasAvailableActivation(targetState, targetSideKey, targetPhase)
    );
  const passKind = sideHasAvailableActivation(sideKey, state, phase) ? "optional" : "mandatory";
  const row = {
    ...enrichedAction({ sideKey, phase }),
    isEnabled: rejected === null,
    disabledReason: rejected || "",
    score: passKind === "mandatory" ? 100 : 0,
    details: {
      sourceRule: "official_core_8_2_1_8_4_2_8_6_2_and_quick_reference_12_3_12_4",
      passKind,
      rulesTruth: "movement_and_assault_pass_only",
      trainingTruth: false,
    },
  };
  return options.includeDisabled === true || row.isEnabled ? [row] : [];
}

export function settleOfficialAlternatingPhaseAfterActivationV1(stateInput, options = {}) {
  validateState(stateInput);
  const state = clone(stateInput);
  const phase = String(options.phase || state.phase || "").trim();
  if (!SUPPORTED_PHASES.includes(phase) || state.phase !== phase) {
    fail("PASS_WRONG_PHASE", phase);
  }
  const actingSideKey = String(options.actingSideKey || "").trim();
  if (!state.players?.[actingSideKey]) fail("PASS_SIDE_REQUIRED");
  const otherSideKey = actingSideKey === "player1" ? "player2" : "player1";
  const sideHasAvailableActivation = typeof options.sideHasAvailableActivation === "function"
    ? options.sideHasAvailableActivation
    : (targetSideKey, targetState, targetPhase) => (
      defaultSideHasAvailableActivation(targetState, targetSideKey, targetPhase)
    );
  const events = [];
  if (sidePassed(state, otherSideKey, phase)) {
    if (sideHasAvailableActivation(actingSideKey, state, phase)) {
      state.activeSideKey = actingSideKey;
    } else {
      events.push(...completePhase(state, phase));
    }
  } else {
    // Even with no eligible activation the opponent receives the turn and must Pass.
    state.activeSideKey = otherSideKey;
  }
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_activation_settlement_v1",
    state,
    events,
    phaseCompleted: events.some((event) => event.type === "phase_advanced"),
    rulesTruth: "movement_and_assault_pass_only",
    trainingTruth: false,
  };
}

export function applyOfficialActivationPassV1(stateInput, actionInput, options = {}) {
  validateState(stateInput);
  if (!object(actionInput) || actionInput.actionType !== "pass") fail("PASS_ACTION_INVALID");
  const state = clone(stateInput);
  const sideKey = String(actionInput.sideKey || "").trim();
  const phase = String(actionInput.phase || "").trim();
  if (!sideKey || !phase) fail("PASS_ACTION_INVALID");
  const rejected = rejectionCode(state, sideKey, phase);
  if (rejected) fail(rejected, `${sideKey}:${phase}`);
  const action = enrichedAction({ sideKey, phase });
  const sideHasAvailableActivation = typeof options.sideHasAvailableActivation === "function"
    ? options.sideHasAvailableActivation
    : (targetSideKey, targetState, targetPhase) => (
      defaultSideHasAvailableActivation(targetState, targetSideKey, targetPhase)
    );
  const passKind = sideHasAvailableActivation(sideKey, state, phase) ? "optional" : "mandatory";
  state.players[sideKey].passedPhases = state.players[sideKey].passedPhases || {};
  state.players[sideKey].passedPhases[phase] = true;
  state.firstPassSideByPhase = state.firstPassSideByPhase || {};
  const firstPass = !state.firstPassSideByPhase[phase];
  if (firstPass) {
    state.firstPassSideByPhase[phase] = sideKey;
    state.firstPlayerSideKey = sideKey;
  }
  const markedPieceIds = markUnactivatedOnTableUnits(state, sideKey, phase);
  const events = [{
    type: "pass",
    sideKey,
    phase,
    passKind,
    firstPass,
    firstPlayerSideKey: state.firstPlayerSideKey,
    markedPieceIds,
  }];
  const otherSideKey = sideKey === "player1" ? "player2" : "player1";
  if (sidePassed(state, otherSideKey, phase)) {
    events.push(...completePhase(state, phase));
  } else {
    state.activeSideKey = otherSideKey;
  }
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round || 1),
    phase,
    action: clone(action),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_activation_pass_transition_v1",
    executorId: OFFICIAL_ACTIVATION_PASS_EXECUTOR_ID,
    executorVersion: OFFICIAL_ACTIVATION_PASS_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action,
    rulesTruth: "movement_and_assault_pass_only",
    trainingTruth: false,
  };
}
