// A source-bound arithmetic projection, not a prediction of marker control.
// The laboratory receipt comes from the frozen Room mission profile and
// marker affinities. Neither a strategy narrative nor a VP target supplies
// missing Rules facts here.
import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

function unknown(reason) {
  return Object.freeze({ status: "unknown", reason,
    provesFeasibleControlOrActualScore: false });
}

function nonnegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

// A retained log can contain the same frozen authority from multiple lab
// versions. Versions/receipt hashes are provenance, not different game facts.
// Resolve only validated, same-scope contents; a real disagreement stays unknown.
export function resolveMissionMarkerScoringAuthorityV1({ receipts,
  expectedMissionScoringProfileHash = null, expectedSourceStateHash = null } = {}) {
  const candidates = (Array.isArray(receipts) ? receipts : []).filter(receipt =>
    (!expectedSourceStateHash || receipt?.sourceStateHash === expectedSourceStateHash)
      && (!expectedMissionScoringProfileHash || receipt?.missionScoringProfile?.missionScoringProfileHash
        === expectedMissionScoringProfileHash));
  const valid = candidates.filter(receipt => projectMissionMarkerScoringArithmeticV1({
    receipt, sideKey: 'player1', expectedMissionScoringProfileHash,
    expectedSourceStateHash }).status !== 'unknown');
  if (!valid.length) return unknown('mission_authority_unavailable_or_source_mismatch');
  const contents = new Set(valid.map(receipt => hashStarcraftTmgContract({
    sourceStateHash: receipt.sourceStateHash,
    missionScoringProfile: receipt.missionScoringProfile,
    markerAffinity: { ...receipt.markerAffinity,
      markers: [...receipt.markerAffinity.markers].sort((a, b) => a.number - b.number) },
  })));
  if (contents.size !== 1) return unknown('conflicting_mission_authority_contents');
  return { status: 'resolved', receipt: valid[0],
    equivalentReceiptHashes: valid.map(receipt => receipt.receiptHash) };
}

export function projectMissionMarkerScoringArithmeticV1({ receipt, receipts, sideKey,
  expectedMissionScoringProfileHash = null,
  expectedSourceStateHash = null } = {}) {
  if (receipts !== undefined) {
    const resolved = resolveMissionMarkerScoringAuthorityV1({ receipts,
      expectedMissionScoringProfileHash, expectedSourceStateHash });
    if (resolved.status === 'unknown') return resolved;
    receipt = resolved.receipt;
  }
  if (!["player1", "player2"].includes(sideKey)) {
    return unknown("side_unavailable");
  }
  if (!receipt || receipt.queryId !== "mission-scoring-authority"
    || receipt.resultStatus !== "derivable"
    || !receipt.sourceStateHash
    || receipt.baseStateHash !== receipt.sourceStateHash
    || (expectedSourceStateHash
      && receipt.sourceStateHash !== expectedSourceStateHash)) {
    return unknown("mission_authority_unavailable_or_source_mismatch");
  }
  const { receiptHash, ...body } = receipt;
  if (!receiptHash || hashStarcraftTmgContract(body) !== receiptHash) {
    return unknown("mission_authority_receipt_drift");
  }
  const profile = receipt.missionScoringProfile;
  const affinity = receipt.markerAffinity;
  if (!profile?.missionScoringProfileHash
    || (expectedMissionScoringProfileHash
      && profile.missionScoringProfileHash
        !== expectedMissionScoringProfileHash)
    || !profile.sourceText
    || hashStarcraftTmgContract(profile.sourceText)
      !== profile.sourceTextHash
    || profile.allMissionMarkersActivated !== true
    || !Number.isSafeInteger(profile.gameLengthRounds)
    || profile.gameLengthRounds < 1
    || !Number.isSafeInteger(profile.markerScoringStartsRound)
    || profile.markerScoringStartsRound < 1
    || profile.markerScoringStartsRound > profile.gameLengthRounds
    || !nonnegativeInteger(profile.neutralOrOwnAffinityMarkerVp)
    || !nonnegativeInteger(profile.opponentAffinityMarkerVp)
    || affinity?.status !== "derivable"
    || !Array.isArray(affinity.markers)
    || affinity.markers.length < 1
    || affinity.markers.length > 16) {
    return unknown("mission_scoring_or_marker_affinity_unavailable");
  }
  const seen = new Set();
  const markers = [];
  for (const marker of affinity.markers) {
    if (!Number.isSafeInteger(marker?.number) || marker.number < 1
      || seen.has(marker.number)
      || ![null, "player1", "player2"].includes(
        marker.affinityPlayerId)) {
      return unknown("mission_marker_affinity_invalid");
    }
    seen.add(marker.number);
    markers.push({ number: marker.number,
      affinityPlayerId: marker.affinityPlayerId,
      vpIfControlledBySide: marker.affinityPlayerId === null
        || marker.affinityPlayerId === sideKey
        ? profile.neutralOrOwnAffinityMarkerVp
        : profile.opponentAffinityMarkerVp });
  }
  markers.sort((left, right) => left.number - right.number);
  const perRound = markers.reduce((sum, marker) => (
    sum + marker.vpIfControlledBySide), 0);
  const byRound = Array.from({ length: profile.gameLengthRounds },
    (_, index) => ({ round: index + 1,
      vp: Math.max(0, index + 2 - profile.markerScoringStartsRound)
        * perRound }));
  return Object.freeze({
    status: "source_bound_arithmetic_only",
    receiptHash,
    missionScoringProfileHash: profile.missionScoringProfileHash,
    sourceStateHash: receipt.sourceStateHash,
    sideKey,
    markerScoringStartsRound: profile.markerScoringStartsRound,
    specialLeadWinThreshold: profile.specialLeadWinThreshold ?? null,
    specialLeadWinCondition: profile.specialLeadWinThreshold == null ? null
      : Object.freeze({
        scoreBasis: "own_cumulative_vp_minus_opponent_cumulative_vp",
        comparison: "greater_than_or_equal",
        threshold: profile.specialLeadWinThreshold,
        opponentCumulativeVp: null,
        terminalFromOwnScoreAlone: "unknown",
      }),
    markers,
    allControlledVpPerScoringRound: perRound,
    unconstrainedCumulativeMarkerVpByRound: byRound,
    destroyedEnemySupplyVpExcluded: true,
    opponentControlAndEarlyTerminalIgnored: true,
    provesFeasibleControlOrActualScore: false,
    planSpecificMarkerPatternMustBeEvaluatedSeparately: true,
  });
}

// Affinity is not a global value attached to a marker: the scoring actor
// matters. Reuse the same frozen-source calculation for both actors; never
// infer actual control, reachable positions or a tactic from this table.
export function projectMissionMarkerScoringByActorV1(input = {}) {
  const first = projectMissionMarkerScoringArithmeticV1({ ...input, sideKey: "player1" });
  const second = projectMissionMarkerScoringArithmeticV1({ ...input, sideKey: "player2" });
  if (first.status === "unknown" || second.status === "unknown") {
    return unknown(first.reason || second.reason);
  }
  return Object.freeze({
    status: "source_bound_arithmetic_only",
    receiptHash: first.receiptHash,
    missionScoringProfileHash: first.missionScoringProfileHash,
    sourceStateHash: first.sourceStateHash,
    markerScoringStartsRound: first.markerScoringStartsRound,
    markers: first.markers.map(marker => {
      const opponent = second.markers.find(x => x.number === marker.number);
      return Object.freeze({ number: marker.number,
        affinityPlayerId: marker.affinityPlayerId,
        vpByScoringActor: Object.freeze({ player1: marker.vpIfControlledBySide,
          player2: opponent.vpIfControlledBySide }),
        relativeVpSwingOnControlTransfer:
          marker.vpIfControlledBySide + opponent.vpIfControlledBySide,
      });
    }),
    controlTransferPremise: "assumes_the_marker_changes_from_one_actor_control_to_the_other_at_a_scoring_window",
    destroyedEnemySupplyVpExcluded: true,
    provesFeasibleControlOrActualScore: false,
    numericMathInputsAreNotScoringRuleEvidence: true,
  });
}

// The agent chooses a CONTROL hypothesis, never the VP printed on a marker.
// Use the same actor-relative frozen Rules projection as source review. This
// is deliberately marker-only: unprovided kills, missing windows and geometry
// feasibility cannot be silently supplied by this calculator.
export function projectMissionMarkerControlScheduleV1({ receipt, sideKey,
  windows, ...sourceBinding } = {}) {
  if (!["player1", "player2"].includes(sideKey)) return unknown("side_unavailable");
  const scoring = projectMissionMarkerScoringByActorV1({ receipt, ...sourceBinding });
  if (scoring.status === "unknown") return scoring;
  if (!Array.isArray(windows)) return unknown("control_windows_required");
  const actors = ["player1", "player2"];
  const opponent = actors.find(actor => actor !== sideKey);
  const byNumber = new Map(scoring.markers.map(marker => [marker.number, marker]));
  const roundCount = receipt.missionScoringProfile.gameLengthRounds;
  const byRound = new Map();
  for (const window of windows) {
    if (!Number.isSafeInteger(window?.round) || window.round < 1
      || window.round > roundCount || byRound.has(window.round)) {
      return unknown("control_window_round_invalid_or_duplicate");
    }
    const assigned = new Set();
    for (const actor of actors) {
      const controlled = window.controlledMarkersBySide?.[actor];
      if (!Array.isArray(controlled)) return unknown("both_actors_control_assignments_required");
      for (const number of controlled) {
        if (!byNumber.has(number)) return unknown("control_marker_not_in_frozen_mission");
        if (assigned.has(number)) return unknown("control_marker_duplicate_or_conflicting");
        assigned.add(number);
      }
    }
    byRound.set(window.round, window);
  }
  const cumulative = { player1: 0, player2: 0 };
  const rows = Array.from({ length: roundCount }, (_, index) => {
    const round = index + 1;
    const window = byRound.get(round);
    const markerVpByActor = {};
    const markerContributions = {};
    for (const actor of actors) {
      const contributions = window?.controlledMarkersBySide[actor].map(number => ({
        number, vp: round < scoring.markerScoringStartsRound ? 0
          : byNumber.get(number).vpByScoringActor[actor],
      })) ?? null;
      markerContributions[actor] = contributions;
      const value = round < scoring.markerScoringStartsRound ? 0
        : contributions === null ? null : contributions.reduce((sum, marker) => sum + marker.vp, 0);
      markerVpByActor[actor] = value;
      cumulative[actor] = value === null || cumulative[actor] === null
        ? null : cumulative[actor] + value;
    }
    return { round, controlAssumptionStatus: window ? "model_declared" : "unknown",
      controlledMarkersBySide: window ? structuredClone(window.controlledMarkersBySide) : null,
      markerContributions, markerVpByActor,
      cumulativeMarkerVpByActor: { ...cumulative },
      ownMinusOpponentCumulativeMarkerVp: cumulative[sideKey] === null || cumulative[opponent] === null
        ? null : cumulative[sideKey] - cumulative[opponent] };
  });
  return Object.freeze({ status: "conditional_rules_arithmetic", sideKey,
    authorityReceiptHash: scoring.receiptHash,
    missionScoringProfileHash: scoring.missionScoringProfileHash,
    sourceStateHash: scoring.sourceStateHash, rows,
    controlAssumptionsAreNotObservedOrProven: true,
    unlistedMarkersInDeclaredWindowAssumedUncontrolled: true,
    missingScoringWindowsStayUnknown: true,
    destroyedEnemySupplyVpExcluded: true,
    earlyTerminalNotEvaluated: true,
    provesFeasibleControlOrActualScore: false });
}
