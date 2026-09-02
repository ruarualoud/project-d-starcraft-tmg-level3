import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialDisputeResolutionRulesDataBundleV1 } from
  "../source-data/official-dispute-resolution-rules-data-bundle-v1.mjs";

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function seal(body, field) {
  return { ...body, [field]: hashStarcraftTmgContract(body) };
}
function participants(value) {
  const ids = [...(value || [])].map(String).sort();
  if (ids.length !== 2 || new Set(ids).size !== 2) {
    fail("DISPUTE_RESOLUTION_PARTICIPANTS_INVALID");
  }
  return ids;
}
function score(value, code) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) fail(code, String(value));
  return number;
}

function liveUnit(piece) {
  return piece?.isDestroyed !== true && Number(piece?.currentModels || 0) > 0;
}

export function createOfficialSimultaneousEliminationDisputeV1(input = {}) {
  const bundle = input.disputeResolutionRulesDataBundle;
  const state = input.state;
  verifyOfficialDisputeResolutionRulesDataBundleV1(bundle);
  if (!object(state) || state.phase !== "cleanup" || state.gameOver === true
    || state.terminal === true || !object(state.players) || !Array.isArray(state.pieces)
    || !object(state.scores)
    || state.scoringCleanupProgress?.currentStep !== "check_end_game_conditions") {
    fail("SIMULTANEOUS_ELIMINATION_DISPUTE_WINDOW_INVALID");
  }
  const participantIds = participants(Object.keys(state.players));
  const armyStatusBySide = {};
  for (const sideKey of participantIds) {
    const units = state.pieces.filter((piece) => piece?.sideKey === sideKey
      && liveUnit(piece));
    const fieldUnitIds = units.filter((piece) => piece.isOnField === true)
      .map((piece) => String(piece.id)).sort();
    const reserveUnitIds = units.filter((piece) => piece.isInReserves === true)
      .map((piece) => String(piece.id)).sort();
    if (units.some((piece) => piece.isOnField !== true && piece.isInReserves !== true)) {
      fail("SIMULTANEOUS_ELIMINATION_UNIT_LOCATION_UNRESOLVED", sideKey);
    }
    armyStatusBySide[sideKey] = { sideKey, fieldUnitIds, reserveUnitIds,
      eliminated: fieldUnitIds.length === 0 && reserveUnitIds.length === 0 };
  }
  if (!participantIds.every((sideKey) => armyStatusBySide[sideKey].eliminated)) {
    fail("SIMULTANEOUS_ELIMINATION_DISPUTE_NOT_PRESENT");
  }
  const beforeScores = Object.fromEntries(participantIds.map((sideKey) => [sideKey,
    score(state.scores[sideKey], "DISPUTE_RESOLUTION_SCORE_INVALID")]));
  const rulingOptions = [
    ...participantIds.map((sideKey) => ({
      optionId: `treat-${sideKey}-as-surviving-side`,
      summary: `Treat ${sideKey} as the surviving side for this instance`,
      effectKind: "terminal_winner",
      winnerSideKey: sideKey,
      survivorVpAward: 10,
    })),
    { optionId: "treat-simultaneous-elimination-as-draw",
      summary: "Treat simultaneous elimination as a draw for this instance",
      effectKind: "terminal_draw", winnerSideKey: null, survivorVpAward: 0 },
  ].sort((left, right) => left.optionId.localeCompare(right.optionId));
  const coordinatorSideKey = String(state.firstPlayerSideKey || "");
  if (!participantIds.includes(coordinatorSideKey)) {
    fail("DISPUTE_RESOLUTION_COORDINATOR_INVALID");
  }
  return seal({ schema: "starcraft_tmg_official_pending_rules_dispute_v1",
    disputeKind: "simultaneous_army_elimination",
    specificInstance: { round: Number(state.round), phase: state.phase,
      progressStep: state.scoringCleanupProgress.currentStep,
      armyStatusBySide, beforeScores },
    participantIds, coordinatorSideKey,
    rulingOptions, rollOffAttempt: 1,
    canonicalRulesMutationAllowed: false,
    manualAdjudication: true,
    eligibleForTraining: false,
    trainingTruth: false }, "disputeHash");
}

export function resolveOfficialRulesDisputeRollOffV1(input = {}) {
  const bundle = input.disputeResolutionRulesDataBundle;
  verifyOfficialDisputeResolutionRulesDataBundleV1(bundle);
  const participantIds = participants(input.participantIds);
  const attempt = Number(input.attempt);
  if (!Number.isSafeInteger(attempt) || attempt < 1) {
    fail("DISPUTE_ROLL_OFF_ATTEMPT_INVALID");
  }
  const reveals = input.chanceReveals;
  if (!Array.isArray(reveals) || reveals.length !== 4) {
    fail("DISPUTE_ROLL_OFF_REVEALS_REQUIRED");
  }
  const outcomes = reveals.map((reveal, counter) => {
    const outcome = Number(reveal?.outcome);
    if (reveal?.counter !== counter || reveal?.faces !== 6
      || !Number.isSafeInteger(outcome) || outcome < 1 || outcome > 6) {
      fail("DISPUTE_ROLL_OFF_REVEAL_INVALID", String(counter));
    }
    return outcome;
  });
  const rollsBySide = { [participantIds[0]]: outcomes.slice(0, 2),
    [participantIds[1]]: outcomes.slice(2, 4) };
  const totalsBySide = Object.fromEntries(participantIds.map((sideKey) => [sideKey,
    rollsBySide[sideKey].reduce((sum, value) => sum + value, 0)]));
  const tied = totalsBySide[participantIds[0]] === totalsBySide[participantIds[1]];
  const winnerSideKey = tied ? null
    : totalsBySide[participantIds[0]] > totalsBySide[participantIds[1]]
      ? participantIds[0] : participantIds[1];
  return seal({ schema: "starcraft_tmg_official_rules_dispute_roll_off_v1",
    attempt, participantIds, rollsBySide, totalsBySide,
    outcome: tied ? "tie" : "winner", winnerSideKey,
    nextProcedure: tied ? "rules_dispute_roll_off" : "provisional_ruling",
    tiePolicy: bundle.disputeContract.tiePolicy,
    authorityChanceOnly: true,
    eligibleForTraining: false, trainingTruth: false }, "rollOffHash");
}

export function createOfficialProvisionalRulingChoicesV1(input = {}) {
  const bundle = input.disputeResolutionRulesDataBundle;
  const dispute = input.dispute;
  verifyOfficialDisputeResolutionRulesDataBundleV1(bundle);
  if (!object(dispute) || !Array.isArray(dispute.rulingOptions)
    || dispute.rulingOptions.length < 2 || dispute.manualAdjudication !== true
    || dispute.disputeHash !== hashStarcraftTmgContract(
      Object.fromEntries(Object.entries(dispute).filter(([key]) => key !== "disputeHash")),
    )) {
    fail("PROVISIONAL_RULING_DISPUTE_INVALID");
  }
  const participantIds = participants(dispute.participantIds);
  const winnerSideKey = String(input.rollOffWinnerSideKey || "");
  if (!participantIds.includes(winnerSideKey)) {
    fail("PROVISIONAL_RULING_OWNER_INVALID");
  }
  return dispute.rulingOptions.map((option) => seal({
    schema: "starcraft_tmg_official_provisional_ruling_choice_v1",
    disputeHash: dispute.disputeHash,
    rulingOwnerSideKey: winnerSideKey,
    option: clone(option),
    specificInstanceOnly: true,
    canonicalRulesMutationAllowed: false,
    manualAdjudication: true,
    eligibleForTraining: false,
    trainingTruth: false,
  }, "choiceHash"));
}

export function resolveOfficialPostMatchRulingVerificationV1(input = {}) {
  const bundle = input.disputeResolutionRulesDataBundle;
  const ruling = input.provisionalRuling;
  const verificationOutcome = String(input.verificationOutcome || "");
  verifyOfficialDisputeResolutionRulesDataBundleV1(bundle);
  if (!object(ruling) || typeof ruling.rulingHash !== "string"
    || ruling.manualAdjudication !== true || ruling.specificInstanceOnly !== true
    || !["ruling_confirmed", "ruling_corrected", "verification_unresolved"]
      .includes(verificationOutcome)) {
    fail("POST_MATCH_RULING_VERIFICATION_INVALID");
  }
  return seal({ schema: "starcraft_tmg_official_post_match_ruling_verification_v1",
    rulingHash: ruling.rulingHash,
    disputeHash: ruling.disputeHash,
    verificationOutcome,
    historicalAsPlayedReceiptRewritten: false,
    canonicalRulesMutationAllowed: false,
    futureRulesReviewRequired: verificationOutcome !== "ruling_confirmed",
    eligibleForTraining: false,
    trainingTruth: false }, "verificationHash");
}
