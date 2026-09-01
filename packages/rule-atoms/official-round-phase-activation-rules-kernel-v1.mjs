import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialRoundPhaseActivationDataBundleV1 } from
  "../source-data/official-round-phase-activation-data-bundle-v1.mjs";

const PROCEDURE_KINDS = new Set([
  "activation_turn_order", "phase_action_menu", "round_phase_sequence",
]);

function fail(code, detail = "") { throw new Error(detail ? `${code}:${detail}` : code); }
function object(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function nonEmpty(value, code) {
  const result = String(value || "").trim();
  if (!result) fail(code);
  return result;
}
function result(body) {
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}
function bundleFor(input) {
  const bundle = input.roundPhaseActivationDataBundle;
  verifyOfficialRoundPhaseActivationDataBundleV1(bundle);
  return bundle;
}
function phaseFor(bundle, phase) {
  const row = bundle.phaseSequence.find((entry) => entry.phase === phase);
  if (!row) fail("ROUND_PHASE_ACTIVATION_PHASE_INVALID", String(phase || ""));
  return row;
}
function exactTwoSides(value) {
  if (!Array.isArray(value) || value.length !== 2) {
    fail("ROUND_PHASE_ACTIVATION_TWO_PLAYERS_REQUIRED");
  }
  const sides = value.map((entry) => nonEmpty(entry,
    "ROUND_PHASE_ACTIVATION_TWO_PLAYERS_REQUIRED"));
  if (new Set(sides).size !== 2) fail("ROUND_PHASE_ACTIVATION_TWO_PLAYERS_REQUIRED");
  return sides;
}

export function resolveOfficialRoundPhaseSequenceV1(input = {}) {
  const bundle = bundleFor(input);
  if (input.rulesOwnedSequenceRequested !== true
    || input.clientSuppliedMaximumRounds !== undefined
    || input.clientSuppliedPhaseSequence !== undefined) {
    fail("ROUND_PHASE_SEQUENCE_REQUEST_INVALID");
  }
  return result({ schema: "starcraft_tmg_official_round_phase_sequence_resolution_v1",
    maximumRounds: bundle.maximumRounds,
    phaseSequence: structuredClone(bundle.phaseSequence),
    phaseSequenceHash: bundle.phaseSequenceHash,
    strictOrder: true, alternatingActivationPhaseOrdinals: [1, 2, 3],
    scoringAndCleanupPhaseOrdinal: 4,
    roundSixMayNotBegin: true,
    clientSuppliedSequenceAccepted: false, trainingTruth: false });
}

export function resolveOfficialPhaseActionMenuV1(input = {}) {
  const bundle = bundleFor(input);
  const phase = nonEmpty(input.phase, "ROUND_PHASE_ACTIVATION_PHASE_INVALID");
  const row = phaseFor(bundle, phase);
  const unitLocation = nonEmpty(input.unitLocation,
    "PHASE_ACTION_MENU_UNIT_LOCATION_INVALID");
  if (!["battlefield", "reserves"].includes(unitLocation)
    || input.rulesOwnedMenuRequested !== true
    || input.clientSuppliedActionTypes !== undefined) {
    fail("PHASE_ACTION_MENU_REQUEST_INVALID");
  }
  let phaseActionTypes = [];
  if (row.alternatingActivation) {
    if (phase === "movement" && unitLocation === "battlefield") {
      phaseActionTypes = [...bundle.battlefieldMovementActionTypes];
    } else if (phase === "movement" && unitLocation === "reserves") {
      phaseActionTypes = ["deploy"];
    } else if (unitLocation === "battlefield") {
      phaseActionTypes = [...row.phaseActionTypes];
    }
  }
  return result({ schema: "starcraft_tmg_official_phase_action_menu_resolution_v1",
    phase, phaseOrdinal: row.ordinal, unitLocation,
    phaseUsesAlternatingActivation: row.alternatingActivation,
    phaseActionTypes: phaseActionTypes.sort(), exactlyOnePhaseActionPerActivation: true,
    movementBattlefieldMenuExact: phase === "movement" && unitLocation === "battlefield",
    atomicExecutorsStillDetermineCurrentLegality: true,
    completeCurrentLegalSpaceClaimed: false,
    clientSuppliedActionTypesAccepted: false, trainingTruth: false });
}

export function resolveOfficialActivationTurnOrderV1(input = {}) {
  const bundle = bundleFor(input);
  const phase = nonEmpty(input.phase, "ROUND_PHASE_ACTIVATION_PHASE_INVALID");
  const row = phaseFor(bundle, phase);
  const round = Number(input.round);
  const sides = exactTwoSides(input.playerSideKeys);
  const activeSideKey = nonEmpty(input.activeSideKey,
    "ROUND_PHASE_ACTIVATION_ACTIVE_SIDE_REQUIRED");
  const unitId = nonEmpty(input.activatedUnitId,
    "ROUND_PHASE_ACTIVATION_UNIT_REQUIRED");
  const unitLocation = nonEmpty(input.unitLocation,
    "PHASE_ACTION_MENU_UNIT_LOCATION_INVALID");
  const actionType = nonEmpty(input.completedPhaseActionType,
    "ROUND_PHASE_ACTIVATION_ACTION_REQUIRED");
  if (!Number.isSafeInteger(round) || round < 1 || round > bundle.maximumRounds) {
    fail("ROUND_PHASE_ACTIVATION_ROUND_OUT_OF_RANGE");
  }
  if (!row.alternatingActivation || !sides.includes(activeSideKey)
    || !["battlefield", "reserves"].includes(unitLocation)) {
    fail("ROUND_PHASE_ACTIVATION_TURN_INVALID");
  }
  if (input.activatedUnitWasEligible !== true
    || input.activationMarkerBeforeAction !== false
    || input.phaseActionFullyResolved !== true
    || input.completedUnitCount !== 1
    || input.completedPhaseActionCount !== 1) {
    fail("ONE_PHASE_ACTION_COMPLETION_RECEIPT_REQUIRED", unitId);
  }
  if (!row.phaseActionTypes.includes(actionType)) {
    fail("PHASE_ACTION_TYPE_NOT_IN_PHASE", actionType);
  }
  if (phase === "movement" && unitLocation === "battlefield"
    && !bundle.battlefieldMovementActionTypes.includes(actionType)) {
    fail("MOVEMENT_BATTLEFIELD_ACTION_TYPE_INVALID", actionType);
  }
  const opponentSideKey = sides.find((entry) => entry !== activeSideKey);
  const opponentPassed = input.opponentPassed === true;
  const actingSideHasRemainingActivation =
    input.actingSideHasRemainingActivation === true;
  const nextTurn = opponentPassed
    ? (actingSideHasRemainingActivation ? "same_side_continues" : "phase_complete")
    : "opponent_activates";
  const nextActiveSideKey = nextTurn === "opponent_activates" ? opponentSideKey
    : nextTurn === "same_side_continues" ? activeSideKey : null;
  return result({ schema: "starcraft_tmg_official_activation_turn_order_resolution_v1",
    round, phase, phaseOrdinal: row.ordinal, activatedUnitId: unitId, unitLocation,
    completedPhaseActionType: actionType, activeSideKey, opponentSideKey,
    completedUnitCount: 1, completedPhaseActionCount: 1,
    activationMarkerMustBeSetAfterResolution: true,
    opponentPassed, actingSideHasRemainingActivation, nextTurn, nextActiveSideKey,
    playersAlternateOneUnitPerTurn: !opponentPassed,
    sameSideContinuationOnlyAfterOpponentPass: nextTurn === "same_side_continues",
    atomicActionReceiptRequired: true,
    clientSuppliedFinalTurnAccepted: false, trainingTruth: false });
}

export function certifyOfficialRoundPhaseActivationPlanV1(input = {}) {
  const bundle = input.roundPhaseActivationDataBundle;
  const plan = input.plan; const procedureKind = String(input.procedureKind || "");
  verifyOfficialRoundPhaseActivationDataBundleV1(bundle);
  if (!object(plan) || !PROCEDURE_KINDS.has(procedureKind)
    || plan.procedureKind !== procedureKind || plan.rulesOwnedInputsComplete !== true
    || plan.clientSuppliedResult === true) fail("ROUND_PHASE_ACTIVATION_PLAN_INVALID");
  const planId = nonEmpty(plan.planId, "ROUND_PHASE_ACTIVATION_PLAN_INVALID");
  const shared = { ...plan.input, roundPhaseActivationDataBundle: bundle };
  let resolution;
  if (procedureKind === "round_phase_sequence") {
    resolution = resolveOfficialRoundPhaseSequenceV1(shared);
  } else if (procedureKind === "phase_action_menu") {
    resolution = resolveOfficialPhaseActionMenuV1(shared);
  } else resolution = resolveOfficialActivationTurnOrderV1(shared);
  const body = { schema: "starcraft_tmg_official_round_phase_activation_plan_certificate_v1",
    planId, procedureKind, sideKey: String(plan.sideKey || ""),
    roundPhaseActivationDataBundleHash: bundle.bundleHash, result: resolution,
    rulesOwnedInputsComplete: true, clientSuppliedResultAccepted: false,
    trainingTruth: false };
  return freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialRoundPhaseActivationPlanCertificateV1(input = {}) {
  const rebuilt = certifyOfficialRoundPhaseActivationPlanV1(input);
  if (!isDeepStrictEqual(rebuilt, input.certificate)) {
    fail("ROUND_PHASE_ACTIVATION_PLAN_CERTIFICATE_DRIFT");
  }
  return true;
}

export function officialRoundPhaseActivationProcedureKindsV1() {
  return [...PROCEDURE_KINDS].sort();
}
