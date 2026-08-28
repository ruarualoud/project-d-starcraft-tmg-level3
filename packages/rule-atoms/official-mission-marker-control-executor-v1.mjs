import {
  OfficialMissionMarkerControlKernelV1Error,
  resolveOfficialMissionMarkerControlV1,
} from "./official-mission-marker-control-kernel-v1.mjs";

export const OFFICIAL_MISSION_MARKER_CONTROL_ACTION_TYPE =
  "determine_mission_marker_control";
export const OFFICIAL_MISSION_MARKER_CONTROL_EXECUTOR_ID =
  "authority.mission-marker-control-v1";
export const OFFICIAL_MISSION_MARKER_CONTROL_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_MISSION_MARKER_CONTROL_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";

export const OFFICIAL_MISSION_MARKER_CONTROL_ATOM_IDS = Object.freeze([
  "rule-atom:burrowed-mission-control-prohibition",
  "rule-atom:flying-contest-prohibition",
  "rule-atom:flying-mission-control-prohibition",
  "rule-atom:flying-mission-control-restriction-summary",
  "rule-atom:mission-marker-contest-coherency-requirement",
  "rule-atom:mission-marker-contest-eligibility-composite",
  "rule-atom:mission-marker-physical-state",
  "rule-atom:mission-marker-tie-no-transfer",
  "rule-atom:out-of-coherency-mission-control-prohibition",
  "rule-atom:reserve-mission-control-prohibition",
  "rule-atom:singleton:core-11-mission-marker-control-comparison:cf762ce2f142",
  "rule-atom:singleton:core-11-mission-marker-sticky-control:f362f18cbd13",
  "rule-atom:singleton:core-8-9-1-contest-on-battlefield:5f6385016b52",
  "rule-atom:singleton:core-8-9-1-contest-range-los-elevation:52d7b1187cc8",
  "rule-atom:singleton:core-8-9-1-control-faction-indicator:36d792891bee",
  "rule-atom:singleton:core-8-9-1-higher-supply-controls:cbc765a7ee40",
  "rule-atom:singleton:core-8-9-1-marker-sight-size:2b8af25b48fd",
  "rule-atom:singleton:core-8-9-1-sticky-control-reclaim:ff2cf72fcff5",
  "rule-atom:singleton:core-8-9-1-sum-contesting-supply:d7d6f8d54553",
  "rule-atom:singleton:core-8-9-1-tied-supply-control:183ca309e8b5",
  "rule-atom:sticky-control-tie-and-neutrality",
  "rule-atom:uncontested-zero-supply-control",
].sort((left, right) => left.localeCompare(right)));

const PROGRESS_SCHEMA = "starcraft_tmg_scoring_cleanup_progress_v1";

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function firstPlayerSideKey(state) {
  const sideKey = String(state?.firstPlayerSideKey || "").trim();
  if (!state?.players?.[sideKey]) fail("MISSION_MARKER_FIRST_PLAYER_REQUIRED");
  return sideKey;
}

function stepAlreadyCompleted(state) {
  const progress = state?.scoringCleanupProgress;
  if (!progress) return false;
  if (progress.schemaVersion !== PROGRESS_SCHEMA || progress.round !== Number(state.round || 1)) {
    fail("MISSION_MARKER_SCORING_PROGRESS_INVALID");
  }
  return (progress.completedSteps || []).includes(OFFICIAL_MISSION_MARKER_CONTROL_ACTION_TYPE);
}

function action(state, resolution) {
  return {
    actionType: OFFICIAL_MISSION_MARKER_CONTROL_ACTION_TYPE,
    sideKey: firstPlayerSideKey(state),
    phase: "cleanup",
    controlResolutionHash: resolution.controlResolutionHash,
    missionMarkerControlResolution: {
      markerResults: clone(resolution.markerResults),
      geometryScope: resolution.geometryScope,
      lineOfSightPolicy: resolution.lineOfSightPolicy,
      rulesTruth: resolution.rulesTruth,
      trainingTruth: false,
    },
    ruleAtomIds: [...OFFICIAL_MISSION_MARKER_CONTROL_ATOM_IDS],
    executorId: OFFICIAL_MISSION_MARKER_CONTROL_EXECUTOR_ID,
    executorVersion: OFFICIAL_MISSION_MARKER_CONTROL_EXECUTOR_VERSION,
    details: {
      sourceRule: "official_core_4_4_6_2_8_9_1_and_glossary_mission_markers",
      markerResults: clone(resolution.markerResults),
      geometryScope: resolution.geometryScope,
      lineOfSightPolicy: resolution.lineOfSightPolicy,
      rulesTruth: resolution.rulesTruth,
      trainingTruth: false,
    },
  };
}

function baseDisabledReason(state, sideKey) {
  if (!object(state) || !object(state.players) || !Array.isArray(state.pieces)) {
    return "MISSION_MARKER_CONTROL_STATE_INVALID";
  }
  if (state.phase !== "cleanup") return "MISSION_MARKER_CONTROL_WRONG_PHASE";
  let firstPlayer;
  try {
    firstPlayer = firstPlayerSideKey(state);
    if (stepAlreadyCompleted(state)) return "MISSION_MARKER_CONTROL_ALREADY_DETERMINED";
  } catch (error) {
    return String(error?.message || "MISSION_MARKER_CONTROL_STATE_INVALID").split(":")[0];
  }
  if (sideKey !== firstPlayer) return "MISSION_MARKER_CONTROL_FIRST_PLAYER_ONLY";
  return "";
}

export function enumerateOfficialMissionMarkerControlActionsV1(state, options = {}) {
  const sideKey = String(options.sideKey || "").trim();
  let disabledReason = baseDisabledReason(state, sideKey);
  let resolution = null;
  if (!disabledReason) {
    try {
      resolution = resolveOfficialMissionMarkerControlV1({
        state,
        matchBinding: options.matchBinding,
      });
    } catch (error) {
      if (!(error instanceof OfficialMissionMarkerControlKernelV1Error)) throw error;
      disabledReason = error.code;
    }
  }
  const row = resolution
    ? action(state, resolution)
    : {
        actionType: OFFICIAL_MISSION_MARKER_CONTROL_ACTION_TYPE,
        sideKey: sideKey || String(state?.firstPlayerSideKey || ""),
        phase: "cleanup",
        controlResolutionHash: null,
        ruleAtomIds: [...OFFICIAL_MISSION_MARKER_CONTROL_ATOM_IDS],
        executorId: OFFICIAL_MISSION_MARKER_CONTROL_EXECUTOR_ID,
        executorVersion: OFFICIAL_MISSION_MARKER_CONTROL_EXECUTOR_VERSION,
        details: {
          sourceRule: "official_core_4_4_6_2_8_9_1_and_glossary_mission_markers",
          rulesTruth: "unsupported_until_exact_inputs_resolve",
          trainingTruth: false,
        },
      };
  return options.includeDisabled === true || !disabledReason
    ? [{
        ...row,
        isEnabled: !disabledReason,
        disabledReason,
        score: disabledReason ? 0 : 100,
      }]
    : [];
}

export function applyOfficialMissionMarkerControlV1(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_MISSION_MARKER_CONTROL_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_MISSION_MARKER_CONTROL_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_MISSION_MARKER_CONTROL_EXECUTOR_VERSION) {
    fail("MISSION_MARKER_CONTROL_ACTION_INVALID");
  }
  const state = clone(stateInput);
  const sideKey = String(actionInput.sideKey || "").trim();
  const disabledReason = baseDisabledReason(state, sideKey);
  if (disabledReason) fail(disabledReason);
  const resolution = resolveOfficialMissionMarkerControlV1({
    state,
    matchBinding: options.matchBinding,
  });
  if (actionInput.controlResolutionHash !== resolution.controlResolutionHash) {
    fail("MISSION_MARKER_CONTROL_RESOLUTION_STALE");
  }
  const byId = new Map(resolution.markerResults.map((entry) => [entry.markerId, entry]));
  for (const marker of state.board.missionMarkers) {
    const result = byId.get(marker.id);
    if (!result) fail("MISSION_MARKER_CONTROL_RESULT_MISSING", marker.id);
    marker.controlSideKey = result.nextControlSideKey;
    marker.factionIndicatorSideKey = result.factionIndicatorSideKey;
    marker.controlDeterminedAt = {
      round: Number(state.round || 1),
      step: OFFICIAL_MISSION_MARKER_CONTROL_ACTION_TYPE,
      postRevision: Number(options.postRevision || 0),
      controlResolutionHash: resolution.controlResolutionHash,
    };
  }
  state.scoringCleanupProgress = {
    schemaVersion: PROGRESS_SCHEMA,
    round: Number(state.round || 1),
    completedSteps: [OFFICIAL_MISSION_MARKER_CONTROL_ACTION_TYPE],
    currentStep: "score_victory_points",
    initiatingSideKey: sideKey,
    controlResolutionHash: resolution.controlResolutionHash,
    trainingTruth: false,
  };
  const resolvedAction = action(stateInput, resolution);
  const events = [{
    type: "mission_marker_control_determined",
    round: Number(state.round || 1),
    initiatingSideKey: sideKey,
    controlResolutionHash: resolution.controlResolutionHash,
    markerResults: clone(resolution.markerResults),
  }];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round || 1),
    phase: "cleanup",
    action: clone(resolvedAction),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_mission_marker_control_transition_v1",
    executorId: OFFICIAL_MISSION_MARKER_CONTROL_EXECUTOR_ID,
    executorVersion: OFFICIAL_MISSION_MARKER_CONTROL_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: resolvedAction,
    controlResolution: resolution,
    rulesTruth: resolution.rulesTruth,
    trainingTruth: false,
  };
}
