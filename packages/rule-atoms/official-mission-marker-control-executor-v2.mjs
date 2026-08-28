import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from "../source-data/official-gameplay-data-bundle-v1.mjs";
import {
  officialMarkerAffinitySideKeyV1,
  verifyOfficialMissionSetupBindingV1,
} from "../source-data/official-mission-setup-binding-v1.mjs";
import {
  applyOfficialMissionMarkerControlV1,
  enumerateOfficialMissionMarkerControlActionsV1,
  OFFICIAL_MISSION_MARKER_CONTROL_ACTION_TYPE,
  OFFICIAL_MISSION_MARKER_CONTROL_ATOM_IDS,
  OFFICIAL_MISSION_MARKER_CONTROL_EXECUTOR_ID,
  OFFICIAL_MISSION_MARKER_CONTROL_EXECUTOR_VERSION,
} from "./official-mission-marker-control-executor-v1.mjs";
import { verifyOfficialSupplyLossLedgerV1 } from "./official-supply-loss-ledger-v1.mjs";

export const OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE =
  OFFICIAL_MISSION_MARKER_CONTROL_ACTION_TYPE;
export const OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_ID =
  "authority.mission-marker-control-v2";
export const OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_VERSION = "2.0.0";
export const OFFICIAL_MISSION_MARKER_CONTROL_V2_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_MISSION_MARKER_CONTROL_V2_ATOM_IDS = Object.freeze([
  ...OFFICIAL_MISSION_MARKER_CONTROL_ATOM_IDS,
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

function runtimeHash(matchBinding) {
  const value = String(matchBinding?.rulesRuntimeBinding?.runtimeHash || "").trim();
  if (!/^[a-f0-9]{64}$/u.test(value)) fail("MISSION_MARKER_V2_RUNTIME_BINDING_REQUIRED");
  return value;
}

function validateMarkerAffinity(state, setupBinding) {
  const markers = state?.board?.missionMarkers;
  if (!Array.isArray(markers) || markers.length !== 5) {
    fail("MISSION_MARKER_V2_DENOMINATOR_INVALID");
  }
  const numbers = markers.map((marker) => Number(marker?.number)).sort((left, right) => left - right);
  if (new Set(numbers).size !== 5 || numbers.some((number, index) => number !== index + 1)) {
    fail("MISSION_MARKER_V2_DENOMINATOR_INVALID");
  }
  for (const marker of markers) {
    officialMarkerAffinitySideKeyV1(setupBinding, marker.number);
  }
}

function compatibilityContext(state, matchBinding) {
  const gameplayDataBundle = state?.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayDataBundle);
  if (!object(matchBinding)
    || hashStarcraftTmgContract(gameplayDataBundle) !== matchBinding.dataSnapshotHash) {
    fail("MISSION_MARKER_V2_DATA_SNAPSHOT_MISMATCH");
  }
  const setupBinding = state.officialMissionSetupBinding;
  verifyOfficialMissionSetupBindingV1(setupBinding, gameplayDataBundle);
  validateMarkerAffinity(state, setupBinding);
  const boundRuntimeHash = runtimeHash(matchBinding);
  verifyOfficialSupplyLossLedgerV1(state.supplyLossLedger, {
    round: Number(state.round || 1),
    rulesRuntimeHash: boundRuntimeHash,
  });
  const compatibilityState = clone(state);
  compatibilityState.officialCombatProfileBundle =
    clone(gameplayDataBundle.combatProfileBundle);
  const compatibilityMatchBinding = {
    ...clone(matchBinding),
    dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle.combatProfileBundle),
  };
  return {
    gameplayDataBundle,
    setupBinding,
    boundRuntimeHash,
    compatibilityState,
    compatibilityMatchBinding,
  };
}

function currentAction(action, context) {
  return {
    ...clone(action),
    executorId: OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_VERSION,
    details: {
      ...clone(action.details || {}),
      officialGameplayDataBundleHash: context.gameplayDataBundle.gameplayDataBundleHash,
      officialMissionScoringProfileHash:
        context.gameplayDataBundle.missionScoringProfile.missionScoringProfileHash,
      officialMissionSetupBindingHash: context.setupBinding.missionSetupBindingHash,
      markerAffinityByNumber: clone(context.setupBinding.markerAffinityByNumber),
      rulesTruth: "official_composite_data_and_draft_bound_marker_control",
      trainingTruth: false,
    },
  };
}

function legacyAction(action) {
  return {
    ...clone(action),
    executorId: OFFICIAL_MISSION_MARKER_CONTROL_EXECUTOR_ID,
    executorVersion: OFFICIAL_MISSION_MARKER_CONTROL_EXECUTOR_VERSION,
  };
}

function disabledAction(state, sideKey, error) {
  return [{
    actionType: OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE,
    sideKey: sideKey || String(state?.firstPlayerSideKey || ""),
    phase: "cleanup",
    controlResolutionHash: null,
    ruleAtomIds: [...OFFICIAL_MISSION_MARKER_CONTROL_V2_ATOM_IDS],
    executorId: OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0,
    details: {
      rulesTruth: "official_mission_marker_v2_fail_closed",
      trainingTruth: false,
    },
  }];
}

export function enumerateOfficialMissionMarkerControlActionsV2(state, options = {}) {
  let context;
  try {
    context = compatibilityContext(state, options.matchBinding);
  } catch (error) {
    return options.includeDisabled === true
      ? disabledAction(state, String(options.sideKey || ""), error)
      : [];
  }
  return enumerateOfficialMissionMarkerControlActionsV1(
    context.compatibilityState,
    {
      ...options,
      matchBinding: context.compatibilityMatchBinding,
    },
  ).map((action) => currentAction(action, context));
}

export function applyOfficialMissionMarkerControlV2(state, action, options = {}) {
  if (!object(action)
    || action.actionType !== OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE
    || action.executorId !== OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_ID
    || action.executorVersion !== OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_VERSION) {
    fail("MISSION_MARKER_V2_ACTION_INVALID");
  }
  const context = compatibilityContext(state, options.matchBinding);
  const previous = applyOfficialMissionMarkerControlV1(
    context.compatibilityState,
    legacyAction(action),
    {
      ...options,
      matchBinding: context.compatibilityMatchBinding,
    },
  );
  const result = clone(previous);
  delete result.state.officialCombatProfileBundle;
  result.action = currentAction(previous.action, context);
  result.executorId = OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_ID;
  result.executorVersion = OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_VERSION;
  result.schemaVersion = "starcraft_tmg_official_mission_marker_control_transition_v2";
  result.events = result.events.map((event) => ({
    ...event,
    officialMissionSetupBindingHash: context.setupBinding.missionSetupBindingHash,
    markerAffinityByNumber: clone(context.setupBinding.markerAffinityByNumber),
  }));
  const lastLog = result.state.log?.at(-1);
  if (lastLog) {
    lastLog.action = clone(result.action);
    lastLog.events = clone(result.events);
  }
  result.rulesTruth = "official_composite_data_and_draft_bound_marker_control";
  result.trainingTruth = false;
  return result;
}

