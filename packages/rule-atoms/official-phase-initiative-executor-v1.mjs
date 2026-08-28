export const OFFICIAL_PHASE_INITIATIVE_EXECUTOR_ID = "authority.phase-initiative-v1";
export const OFFICIAL_PHASE_INITIATIVE_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_PHASE_INITIATIVE_TRANSITION_SCHEMA = "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_PHASE_INITIATIVE_ATOM_IDS = Object.freeze([
  "rule-atom:combat-first-player-priority",
  "rule-atom:general-first-player-phase-priority",
  "rule-atom:singleton:core-11-first-player-phase-activation-choice:3919d6d8e24b",
]);

const SUPPORTED_PHASES = Object.freeze(["movement", "assault", "combat"]);
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

function phaseKey(state) {
  return `${Number(state.round || 1)}:${String(state.phase || "")}`;
}

function validateState(state) {
  if (!object(state) || !object(state.players) || !SUPPORTED_PHASES.includes(state.phase)) {
    fail("PHASE_INITIATIVE_STATE_INVALID");
  }
  if (SIDE_KEYS.some((sideKey) => !object(state.players[sideKey]))) {
    fail("PHASE_INITIATIVE_STATE_INVALID");
  }
  if (!SIDE_KEYS.includes(state.firstPlayerSideKey)) fail("PHASE_INITIATIVE_MARKER_HOLDER_INVALID");
  if (state.phaseFirstActorByRound !== undefined && !object(state.phaseFirstActorByRound)) {
    fail("PHASE_INITIATIVE_STATE_INVALID");
  }
}

function phaseChoice(state) {
  const choice = state.phaseFirstActorByRound?.[phaseKey(state)] || null;
  if (!choice) return null;
  if (!object(choice)
    || Number(choice.round) !== Number(state.round || 1)
    || choice.phase !== state.phase
    || !SIDE_KEYS.includes(choice.markerHolderSideKey)
    || !SIDE_KEYS.includes(choice.chosenFirstActorSideKey)) {
    fail("PHASE_INITIATIVE_STATE_INVALID");
  }
  return choice;
}

function enrichedAction(state, sideKey, chosenFirstActorSideKey) {
  return {
    actionType: "choose_first_actor",
    sideKey,
    phase: state.phase,
    chosenFirstActorSideKey,
    ruleAtomIds: [...OFFICIAL_PHASE_INITIATIVE_ATOM_IDS].sort(),
    executorId: OFFICIAL_PHASE_INITIATIVE_EXECUTOR_ID,
    executorVersion: OFFICIAL_PHASE_INITIATIVE_EXECUTOR_VERSION,
  };
}

function rejectionCode(state, sideKey, chosenFirstActorSideKey) {
  if (!SUPPORTED_PHASES.includes(state.phase)) return "PHASE_INITIATIVE_WRONG_PHASE";
  if (phaseChoice(state)) return "PHASE_INITIATIVE_ALREADY_CHOSEN";
  if (sideKey !== state.firstPlayerSideKey) return "PHASE_INITIATIVE_NOT_MARKER_HOLDER";
  if (!SIDE_KEYS.includes(chosenFirstActorSideKey)) return "PHASE_INITIATIVE_TARGET_INVALID";
  return null;
}

export function isOfficialPhaseInitiativePendingV1(state) {
  validateState(state);
  return phaseChoice(state) === null;
}

export function enumerateOfficialPhaseInitiativeActionsV1(state, options = {}) {
  validateState(state);
  const sideKey = String(options.sideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey)) fail("PHASE_INITIATIVE_SIDE_REQUIRED");
  const includeDisabled = options.includeDisabled === true;
  return [...SIDE_KEYS]
    .map((chosenFirstActorSideKey) => {
      const disabledReason = rejectionCode(state, sideKey, chosenFirstActorSideKey);
      return {
        ...enrichedAction(state, sideKey, chosenFirstActorSideKey),
        isEnabled: disabledReason === null,
        disabledReason: disabledReason || "",
        score: 0,
        details: {
          sourceRule: "official_core_8_2_8_8_and_glossary_first_player",
          markerHolderSideKey: state.firstPlayerSideKey,
          rulesTruth: "phase_first_actor_choice_only",
          trainingTruth: false,
        },
      };
    })
    .filter((row) => includeDisabled || row.isEnabled);
}

export function applyOfficialPhaseInitiativeV1(stateInput, actionInput, options = {}) {
  validateState(stateInput);
  if (!object(actionInput) || actionInput.actionType !== "choose_first_actor") {
    fail("PHASE_INITIATIVE_ACTION_INVALID");
  }
  const state = clone(stateInput);
  const sideKey = String(actionInput.sideKey || "").trim();
  const chosenFirstActorSideKey = String(actionInput.chosenFirstActorSideKey || "").trim();
  if (!sideKey || !chosenFirstActorSideKey || actionInput.phase !== state.phase) {
    fail("PHASE_INITIATIVE_ACTION_INVALID");
  }
  const rejected = rejectionCode(state, sideKey, chosenFirstActorSideKey);
  if (rejected) fail(rejected, `${sideKey}:${chosenFirstActorSideKey}`);
  const action = enrichedAction(state, sideKey, chosenFirstActorSideKey);
  const key = phaseKey(state);
  state.phaseFirstActorByRound = object(state.phaseFirstActorByRound)
    ? state.phaseFirstActorByRound
    : {};
  state.phaseFirstActorByRound[key] = {
    round: Number(state.round || 1),
    phase: state.phase,
    markerHolderSideKey: state.firstPlayerSideKey,
    chosenFirstActorSideKey,
  };
  state.activeSideKey = chosenFirstActorSideKey;
  const events = [{
    type: "phase_first_actor_chosen",
    round: Number(state.round || 1),
    phase: state.phase,
    markerHolderSideKey: sideKey,
    chosenFirstActorSideKey,
  }];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round || 1),
    phase: state.phase,
    action: clone(action),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_phase_initiative_transition_v1",
    executorId: OFFICIAL_PHASE_INITIATIVE_EXECUTOR_ID,
    executorVersion: OFFICIAL_PHASE_INITIATIVE_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action,
    rulesTruth: "phase_first_actor_choice_only",
    trainingTruth: false,
  };
}
