import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  getOfficialMissionEffectIrV1,
  verifyOfficialMissionEffectCatalogueV1,
} from "../source-data/official-mission-effect-ir-v1.mjs";
import { deriveOfficialEngagementGraphV2 } from "./official-engagement-graph-v2.mjs";
import { verifyOfficialSupplyLossLedgerV1 } from "./official-supply-loss-ledger-v1.mjs";

export const OFFICIAL_STANDARD_MISSION_RUNTIME_SCHEMA =
  "starcraft_tmg_official_standard_mission_runtime_v1";
export const OFFICIAL_STANDARD_MISSION_RUNTIME_VERSION = "1.0.0";
export const OFFICIAL_STANDARD_MISSION_RUNTIME_STATE_SCHEMA =
  "starcraft_tmg_official_standard_mission_runtime_state_v1";
export const OFFICIAL_STANDARD_MISSION_ACTION_SCHEMA =
  "starcraft_tmg_official_standard_mission_action_v1";

export const OFFICIAL_STANDARD_MISSION_ACTION_TYPES = Object.freeze({
  START_ROUND: "resolve_standard_mission_start_of_round",
  GATHER: "perform_standard_mission_gather_action",
  SCORE: "score_standard_mission",
  END_GAME: "check_standard_mission_end_game",
});

export const OFFICIAL_MISSION_RUNTIME_SCHEMA =
  "starcraft_tmg_official_mission_runtime_v2";
export const OFFICIAL_MISSION_RUNTIME_VERSION = "2.0.0";
export const OFFICIAL_MISSION_RUNTIME_STATE_SCHEMA =
  "starcraft_tmg_official_mission_runtime_state_v2";
export const OFFICIAL_MISSION_ACTION_SCHEMA =
  "starcraft_tmg_official_mission_action_v2";

export const OFFICIAL_MISSION_ACTION_TYPES = Object.freeze({
  START_ROUND: "resolve_mission_start_of_round",
  GATHER: "perform_mission_gather_action",
  SCORE: "score_mission",
  END_GAME: "check_mission_end_game",
});

const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const MARKER_RADIUS_INCHES = 16 / 25.4;
const DISTANCE_TOLERANCE_INCHES = 0.001;
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const SCALE_GEOMETRY = Object.freeze({
  Standard: Object.freeze({ widthInches: 54, heightInches: 36 }),
  Skirmish: Object.freeze({ widthInches: 36, heightInches: 36 }),
});

const STANDARD_V1_CONTRACT = Object.freeze({
  runtimeSchema: OFFICIAL_STANDARD_MISSION_RUNTIME_SCHEMA,
  runtimeVersion: OFFICIAL_STANDARD_MISSION_RUNTIME_VERSION,
  stateSchema: OFFICIAL_STANDARD_MISSION_RUNTIME_STATE_SCHEMA,
  actionSchema: OFFICIAL_STANDARD_MISSION_ACTION_SCHEMA,
  actionTypes: OFFICIAL_STANDARD_MISSION_ACTION_TYPES,
  supportedScales: Object.freeze(["Standard"]),
  supportedMissionCount: 5,
  startRoundResolutionSchema:
    "starcraft_tmg_official_standard_mission_start_round_resolution_v1",
  scoringResolutionSchema:
    "starcraft_tmg_official_standard_mission_scoring_resolution_v1",
  endGameResolutionSchema:
    "starcraft_tmg_official_standard_mission_end_game_resolution_v1",
  transitionSchema: "starcraft_tmg_official_standard_mission_transition_v1",
  rulesTruth: "official_current_standard_mission_runtime_exact_transition",
  stateRulesTruth: "official_current_standard_mission_runtime_state",
  eventPrefix: "standard_mission",
});

const ALL_MISSIONS_V2_CONTRACT = Object.freeze({
  runtimeSchema: OFFICIAL_MISSION_RUNTIME_SCHEMA,
  runtimeVersion: OFFICIAL_MISSION_RUNTIME_VERSION,
  stateSchema: OFFICIAL_MISSION_RUNTIME_STATE_SCHEMA,
  actionSchema: OFFICIAL_MISSION_ACTION_SCHEMA,
  actionTypes: OFFICIAL_MISSION_ACTION_TYPES,
  supportedScales: Object.freeze(["Standard", "Skirmish"]),
  supportedMissionCount: 10,
  startRoundResolutionSchema:
    "starcraft_tmg_official_mission_start_round_resolution_v2",
  scoringResolutionSchema:
    "starcraft_tmg_official_mission_scoring_resolution_v2",
  endGameResolutionSchema:
    "starcraft_tmg_official_mission_end_game_resolution_v2",
  transitionSchema: "starcraft_tmg_official_mission_transition_v2",
  rulesTruth: "official_current_mission_runtime_exact_transition",
  stateRulesTruth: "official_current_mission_runtime_state",
  eventPrefix: "mission",
});

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function safeInteger(value, code, minimum = 0) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum) fail(code, String(value));
  return number;
}

function side(value, code = "STANDARD_MISSION_SIDE_INVALID") {
  const normalized = String(value || "").trim();
  if (!SIDE_KEYS.includes(normalized)) fail(code, normalized);
  return normalized;
}

function otherSide(sideKey) {
  return sideKey === "player1" ? "player2" : "player1";
}

function stateHash(state) {
  return hashStarcraftTmgContract(state);
}

function runtimeStateBody(runtimeState) {
  return without(runtimeState, ["runtimeStateHash"]);
}

function sealRuntimeState(runtimeState) {
  const body = runtimeStateBody(runtimeState);
  return { ...body, runtimeStateHash: hashStarcraftTmgContract(body) };
}

function validateAffinity(value) {
  const affinity = Object.fromEntries([1, 2, 3, 4, 5].map((number) => {
    const owner = value?.[number] ?? value?.[String(number)] ?? null;
    if (owner !== null) side(owner, "STANDARD_MISSION_MARKER_AFFINITY_INVALID");
    return [number, owner];
  }));
  const p1 = Object.values(affinity).filter((owner) => owner === "player1").length;
  const p2 = Object.values(affinity).filter((owner) => owner === "player2").length;
  if (p1 !== 2 || p2 !== 2 || affinity[5] !== null
    || affinity[1] !== affinity[3] || affinity[2] !== affinity[4]
    || affinity[1] === affinity[2]) {
    fail("STANDARD_MISSION_MARKER_AFFINITY_INVALID");
  }
  return affinity;
}

function markerRows(state) {
  const engagementScale = String(state?.officialMissionRuntimeState?.engagementScale
    || state?.engagementScale || "Standard");
  const expectedNumbers = engagementScale === "Skirmish" ? [1, 2, 5] : [1, 2, 3, 4, 5];
  if (!object(state?.board) || !Array.isArray(state.board.missionMarkers)
    || state.board.missionMarkers.length !== expectedNumbers.length) {
    fail("STANDARD_MISSION_MARKER_DENOMINATOR_INVALID");
  }
  const rows = [...state.board.missionMarkers]
    .sort((left, right) => Number(left.number) - Number(right.number));
  rows.forEach((marker, index) => {
    const number = safeInteger(marker?.number,
      "STANDARD_MISSION_MARKER_NUMBER_INVALID", 1);
    if (number !== expectedNumbers[index]
      || String(marker.id || "") !== `mission-marker-${number}`
      || !Number.isFinite(Number(marker.xInches))
      || !Number.isFinite(Number(marker.yInches))) {
      fail("STANDARD_MISSION_MARKER_INVALID", String(marker?.id || number));
    }
  });
  return rows;
}

function validateScores(state) {
  if (!object(state?.scores)) fail("STANDARD_MISSION_SCORES_INVALID");
  return Object.fromEntries(SIDE_KEYS.map((sideKey) => [
    sideKey,
    safeInteger(state.scores[sideKey], "STANDARD_MISSION_SCORE_INVALID"),
  ]));
}

function progressFor(runtimeState, round) {
  return runtimeState.roundProgressByRound?.[round]
    || runtimeState.roundProgressByRound?.[String(round)]
    || null;
}

function verifyRuntimeState(state, catalogue, contract) {
  const runtimeState = state?.officialMissionRuntimeState;
  if (!object(runtimeState)
    || runtimeState.schema !== contract.stateSchema
    || runtimeState.runtimeVersion !== contract.runtimeVersion
    || runtimeState.runtimeStateHash !== hashStarcraftTmgContract(
      runtimeStateBody(runtimeState))
    || !contract.supportedScales.includes(runtimeState.engagementScale)
    || runtimeState.trainingTruth !== false) {
    fail("STANDARD_MISSION_RUNTIME_STATE_INVALID");
  }
  const mission = getOfficialMissionEffectIrV1(catalogue, runtimeState.missionRecordKey);
  if (mission.missionRef.engagementScale !== runtimeState.engagementScale
    || !contract.supportedScales.includes(mission.missionRef.engagementScale)
    || mission.missionEffectIrHash !== runtimeState.missionEffectIrHash
    || mission.missionRef.family !== runtimeState.missionFamily) {
    fail("STANDARD_MISSION_RUNTIME_BINDING_DRIFT");
  }
  validateAffinity(runtimeState.markerAffinityByNumber);
  markerRows(state);
  validateScores(state);
  if (!Array.isArray(state.pieces)) fail("STANDARD_MISSION_PIECES_INVALID");
  return { runtimeState, mission, contract };
}

function actionBody(action) {
  return without(action, ["actionHash"]);
}

function sealAction(action) {
  return freezeDeep({ ...action, actionHash: hashStarcraftTmgContract(action) });
}

function verifyAction(action, expected, contract) {
  if (!object(action)
    || action.schema !== contract.actionSchema
    || action.actionHash !== hashStarcraftTmgContract(actionBody(action))
    || !isDeepStrictEqual(action, expected)) {
    fail("STANDARD_MISSION_ACTION_STALE_OR_INVALID");
  }
}

function firstPlayer(state) {
  const value = side(state?.firstPlayerSideKey,
    "STANDARD_MISSION_FIRST_PLAYER_INVALID");
  if (!object(state.players?.[value])) fail("STANDARD_MISSION_FIRST_PLAYER_INVALID");
  return value;
}

function roundNumber(state, mission) {
  const round = safeInteger(state?.round, "STANDARD_MISSION_ROUND_INVALID", 1);
  if (round > mission.pacing.gameLengthRounds) {
    fail("STANDARD_MISSION_ROUND_INVALID", String(round));
  }
  return round;
}

function baseAction(state, runtimeState, mission, contract, actionType, sideKey, payload) {
  return sealAction({
    schema: contract.actionSchema,
    actionType,
    sideKey,
    phase: String(state.phase || ""),
    preStateHash: stateHash(state),
    missionRecordKey: runtimeState.missionRecordKey,
    missionEffectIrHash: mission.missionEffectIrHash,
    executorId: contract.runtimeSchema,
    executorVersion: contract.runtimeVersion,
    payload,
    rulesTruth: contract.rulesTruth,
    trainingTruth: false,
  });
}

function chanceSelection(effect, chanceReveal) {
  const eligible = effect.eligibleMarkerNumbers;
  if (!object(chanceReveal)
    || chanceReveal.schema !== "starcraft_tmg_rules_chance_reveal_v1"
    || chanceReveal.rangeSize !== eligible.length
    || !Number.isSafeInteger(Number(chanceReveal.outcomeIndex))
    || Number(chanceReveal.outcomeIndex) < 0
    || Number(chanceReveal.outcomeIndex) >= eligible.length
    || !HASH_PATTERN.test(String(chanceReveal.randomReceiptHash || ""))) {
    fail("STANDARD_MISSION_CHANCE_REVEAL_INVALID");
  }
  return {
    markerNumber: eligible[Number(chanceReveal.outcomeIndex)],
    chanceReveal: clone(chanceReveal),
  };
}

function startRoundResolution(state, context, chanceReveal) {
  const round = roundNumber(state, context.mission);
  const progress = progressFor(context.runtimeState, round);
  if (state.phase !== "start_of_round" || progress?.startRoundApplied === true) {
    fail("STANDARD_MISSION_START_ROUND_UNAVAILABLE");
  }
  const markers = markerRows(state);
  const effects = [];
  for (const effect of context.mission.roundStartEffects) {
    if (!effect.rounds.includes(round)) continue;
    if (effect.kind === "activate_specific_marker") {
      const marker = markers.find((entry) => Number(entry.number) === effect.markerNumber);
      if (!marker || marker.isRemoved === true) {
        fail("STANDARD_MISSION_SPECIFIC_MARKER_UNAVAILABLE");
      }
      effects.push({ kind: effect.kind, markerNumber: effect.markerNumber,
        activationRound: round, chanceReveal: null });
      continue;
    }
    if (effect.kind === "activate_random_eligible_marker") {
      const eligibleMarkerNumbers = effect.eligibleMarkerNumbers.filter((number) => {
        const marker = markers.find((entry) => Number(entry.number) === number);
        return marker && marker.isActivated !== true && marker.isRemoved !== true;
      });
      if (!eligibleMarkerNumbers.length) {
        fail("STANDARD_MISSION_RANDOM_MARKER_DENOMINATOR_EMPTY");
      }
      const selected = chanceSelection({ ...effect, eligibleMarkerNumbers }, chanceReveal);
      effects.push({ kind: effect.kind, markerNumber: selected.markerNumber,
        activationRound: round, chanceReveal: selected.chanceReveal });
    }
  }
  const body = {
    schema: context.contract.startRoundResolutionSchema,
    round,
    missionRecordKey: context.runtimeState.missionRecordKey,
    effects,
    trainingTruth: false,
  };
  return { ...body, resolutionHash: hashStarcraftTmgContract(body) };
}

function activeModels(piece) {
  return (piece?.models || []).filter((model) => (
    model?.isOnField === true && model?.isDestroyed !== true
  ));
}

function modelRadius(model) {
  const shape = String(model?.baseShape || "").toLowerCase();
  const width = Number(model?.baseWidthInches);
  const depth = Number(model?.baseDepthInches);
  if (shape !== "round" || !Number.isFinite(width) || width <= 0
    || !Number.isFinite(depth) || Math.abs(width - depth) > 0.001) {
    fail("STANDARD_MISSION_MODEL_BASE_SCOPE_UNSUPPORTED", String(model?.id || ""));
  }
  return width / 2;
}

function edgeDistance(model, marker) {
  const dx = Number(model.xInches) - Number(marker.xInches);
  const dy = Number(model.yInches) - Number(marker.yInches);
  return Math.max(0, Math.hypot(dx, dy) - modelRadius(model) - MARKER_RADIUS_INCHES);
}

function relativeAffinity(runtimeState, markerNumber, sideKey) {
  const owner = runtimeState.markerAffinityByNumber[markerNumber]
    ?? runtimeState.markerAffinityByNumber[String(markerNumber)] ?? null;
  return owner === null ? "neutral" : owner === sideKey ? "own" : "opponent";
}

function gatherCandidates(state, context, sideKey) {
  if (context.mission.missionRef.family !== "gather_the_resources"
    || state.phase !== "assault" || String(state.activeSideKey || "") !== sideKey
    || state.gameOver === true || state.terminal === true) return [];
  const graph = deriveOfficialEngagementGraphV2(state);
  const engaged = new Set(graph.engagedUnitIds || []);
  const markers = markerRows(state).filter((marker) => (
    marker.isActivated === true && marker.isRemoved !== true
      && marker.controlSideKey === sideKey
      && ["neutral", "opponent"].includes(relativeAffinity(
        context.runtimeState, Number(marker.number), sideKey))
  ));
  const candidates = [];
  for (const piece of state.pieces) {
    if (piece?.sideKey !== sideKey || piece.isOnField !== true || piece.isDestroyed === true
      || Number(piece.currentModels || 0) < 1 || engaged.has(piece.id)
      || piece.activatedPhases?.assault === true) continue;
    const models = activeModels(piece);
    if (models.length !== Number(piece.currentModels)) {
      fail("STANDARD_MISSION_GATHER_MODEL_COUNT_INVALID", String(piece.id || ""));
    }
    for (const marker of markers) {
      const minimumDistance = Math.min(...models.map((model) => edgeDistance(model, marker)));
      if (minimumDistance > 3 + DISTANCE_TOLERANCE_INCHES) continue;
      candidates.push({ pieceId: piece.id, markerId: marker.id,
        markerNumber: Number(marker.number), minimumEdgeDistanceInches: minimumDistance,
        engagementGraphHash: graph.graphHash });
    }
  }
  return candidates.sort((left, right) => left.pieceId.localeCompare(right.pieceId)
    || left.markerNumber - right.markerNumber);
}

function controlEvent(state, round) {
  const markers = markerRows(state);
  const events = (state.log || []).flatMap((entry) => entry?.events || [])
    .filter((event) => event?.type === "mission_marker_control_determined"
    && Number(event.round) === round);
  if (events.length !== 1 || !HASH_PATTERN.test(String(events[0].controlResolutionHash || ""))
    || !Array.isArray(events[0].markerResults)
    || events[0].markerResults.length !== markers.length) {
    fail("STANDARD_MISSION_CONTROL_RECEIPT_INVALID");
  }
  const event = events[0];
  for (const marker of markers) {
    const result = event.markerResults.find((entry) => entry.markerId === marker.id);
    if (!result || result.nextControlSideKey !== (marker.controlSideKey ?? null)
      || marker.controlDeterminedAt?.round !== round
      || marker.controlDeterminedAt?.controlResolutionHash !== event.controlResolutionHash) {
      fail("STANDARD_MISSION_CONTROL_RECEIPT_INVALID", marker.id);
    }
  }
  return event;
}

function whollyWithinQuarter(state, piece, context) {
  const geometry = SCALE_GEOMETRY[context.runtimeState.engagementScale];
  if (!geometry
    || Number(state.board?.widthInches) !== geometry.widthInches
    || Number(state.board?.heightInches) !== geometry.heightInches) {
    fail("STANDARD_MISSION_QUARTER_BOARD_INVALID");
  }
  const models = activeModels(piece);
  if (models.length !== Number(piece.currentModels) || !models.length) return null;
  const midpoint = {
    x: geometry.widthInches / 2,
    y: geometry.heightInches / 2,
  };
  const quadrants = models.map((model) => {
    const radius = modelRadius(model);
    const x = Number(model.xInches);
    const y = Number(model.yInches);
    if (![x, y].every(Number.isFinite)) {
      fail("STANDARD_MISSION_QUARTER_POSITION_INVALID", String(model.id || ""));
    }
    const horizontal = x < midpoint.x && x + radius <= midpoint.x
      ? "west" : x >= midpoint.x && x - radius >= midpoint.x ? "east" : null;
    const vertical = y < midpoint.y && y + radius <= midpoint.y
      ? "south" : y >= midpoint.y && y - radius >= midpoint.y ? "north" : null;
    return horizontal && vertical ? `${vertical}_${horizontal}` : null;
  });
  return quadrants.every((quadrant) => quadrant && quadrant === quadrants[0])
    ? quadrants[0] : null;
}

function quarterBreakdowns(state, context, control) {
  const controllingUnitIds = new Set(control.markerResults.flatMap((marker) => {
    const owner = marker.nextControlSideKey;
    return owner ? (marker.contestingUnitsBySide?.[owner] || []).map((unit) => unit.unitId) : [];
  }));
  const totals = Object.fromEntries(SIDE_KEYS.map((sideKey) => [sideKey, {
    south_west: 0, south_east: 0, north_west: 0, north_east: 0,
  }]));
  const unitRows = [];
  for (const piece of state.pieces) {
    if (piece?.isOnField !== true || piece.isDestroyed === true
      || Number(piece.currentModels || 0) < 1) continue;
    const sideKey = side(piece.sideKey);
    const quarter = whollyWithinQuarter(state, piece, context);
    const currentSupply = safeInteger(piece.currentSupply,
      "STANDARD_MISSION_QUARTER_SUPPLY_INVALID");
    const markerControlBonus = controllingUnitIds.has(piece.id) ? 1 : 0;
    if (quarter) totals[sideKey][quarter] += currentSupply + markerControlBonus;
    unitRows.push({ unitId: piece.id, sideKey, quarter, currentSupply,
      markerControlBonus, contributes: Boolean(quarter) });
  }
  const vp = { player1: 0, player2: 0 };
  const results = [];
  for (const quarter of ["south_west", "south_east", "north_west", "north_east"]) {
    const p1 = totals.player1[quarter];
    const p2 = totals.player2[quarter];
    const winnerSideKey = p1 === p2 ? null : p1 > p2 ? "player1" : "player2";
    if (winnerSideKey) vp[winnerSideKey] += 1;
    results.push({ quarter, supplyBySide: { player1: p1, player2: p2 },
      winnerSideKey, vp: winnerSideKey ? 1 : 0 });
  }
  return { vp, totals, results, unitRows };
}

function scoringBreakdown(state, context) {
  const round = roundNumber(state, context.mission);
  const progress = progressFor(context.runtimeState, round);
  if (state.phase !== "cleanup" || progress?.startRoundApplied !== true
    || progress?.scoringApplied === true) {
    fail("STANDARD_MISSION_SCORING_UNAVAILABLE");
  }
  verifyOfficialSupplyLossLedgerV1(state.supplyLossLedger, { round });
  const control = controlEvent(state, round);
  const activeMarkers = markerRows(state).filter((marker) => (
    marker.isActivated === true && marker.isRemoved !== true
  ));
  const breakdowns = Object.fromEntries(SIDE_KEYS.map((sideKey) => [sideKey, {
    destroyedEnemySupplyVp:
      safeInteger(state.supplyLossLedger.scoreableLossCreditedToSide[sideKey],
        "STANDARD_MISSION_SUPPLY_SCORE_INVALID"),
    objectiveVp: 0,
    objectiveRows: [],
    roundVp: 0,
  }]));
  const family = context.mission.missionRef.family;
  if (family === "divide_and_conquer") {
    const quarters = quarterBreakdowns(state, context, control);
    for (const sideKey of SIDE_KEYS) {
      breakdowns[sideKey].objectiveVp += quarters.vp[sideKey];
      breakdowns[sideKey].objectiveRows.push({ kind: "quarter_supply_dominance_vp",
        vp: quarters.vp[sideKey], quarters: clone(quarters.results),
        ownUnits: quarters.unitRows.filter((row) => row.sideKey === sideKey) });
    }
    const markerFive = activeMarkers.find((marker) => Number(marker.number) === 5);
    if (markerFive?.controlSideKey) {
      breakdowns[markerFive.controlSideKey].objectiveVp += 2;
      breakdowns[markerFive.controlSideKey].objectiveRows.push({
        kind: "marker_five_control_vp", markerNumber: 5, vp: 2 });
    }
  } else if (family === "frontlines" && round >= 2) {
    for (const marker of activeMarkers) {
      if (!marker.controlSideKey) continue;
      const sideKey = marker.controlSideKey;
      breakdowns[sideKey].objectiveVp += 1;
      breakdowns[sideKey].objectiveRows.push({ kind: "marker_control_vp",
        markerNumber: Number(marker.number), vp: 1 });
      const result = control.markerResults.find((entry) => entry.markerId === marker.id);
      if (result?.controlChanged === true
        && result.previousControlSideKey === otherSide(sideKey)
        && result.nextControlSideKey === sideKey) {
        breakdowns[sideKey].objectiveVp += 2;
        breakdowns[sideKey].objectiveRows.push({
          kind: "marker_control_transfer_bonus_vp",
          markerNumber: Number(marker.number), previousControlSideKey: otherSide(sideKey), vp: 2 });
      }
    }
  } else if (family === "gather_the_resources" && round >= 2) {
    for (const marker of activeMarkers) {
      if (!marker.controlSideKey) continue;
      const sideKey = marker.controlSideKey;
      if (relativeAffinity(context.runtimeState, Number(marker.number), sideKey) !== "opponent") {
        continue;
      }
      breakdowns[sideKey].objectiveVp += 2;
      breakdowns[sideKey].objectiveRows.push({ kind: "marker_affinity_control_vp",
        markerNumber: Number(marker.number), affinity: "opponent", vp: 2 });
    }
  } else if (family === "hold_position" && round >= 2) {
    for (const marker of activeMarkers) {
      if (!marker.controlSideKey) continue;
      const sideKey = marker.controlSideKey;
      const affinity = relativeAffinity(context.runtimeState, Number(marker.number), sideKey);
      const vp = affinity === "opponent" ? 2 : 1;
      breakdowns[sideKey].objectiveVp += vp;
      breakdowns[sideKey].objectiveRows.push({ kind: "marker_affinity_control_vp",
        markerNumber: Number(marker.number), affinity, vp });
    }
  } else if (family === "supply_drop") {
    for (const marker of activeMarkers) {
      if (!marker.controlSideKey) continue;
      const activationRound = safeInteger(marker.activationRound,
        "STANDARD_MISSION_MARKER_ACTIVATION_ROUND_INVALID", 1);
      const sideKey = marker.controlSideKey;
      breakdowns[sideKey].objectiveVp += activationRound;
      breakdowns[sideKey].objectiveRows.push({
        kind: "controlled_marker_activation_round_cashout_vp",
        markerNumber: Number(marker.number), activationRound,
        vp: activationRound, removeMarkerAfterScoring: true });
    }
  }
  for (const sideKey of SIDE_KEYS) {
    breakdowns[sideKey].roundVp = breakdowns[sideKey].destroyedEnemySupplyVp
      + breakdowns[sideKey].objectiveVp;
  }
  const body = {
    schema: context.contract.scoringResolutionSchema,
    round,
    missionRecordKey: context.runtimeState.missionRecordKey,
    missionEffectIrHash: context.mission.missionEffectIrHash,
    controlResolutionHash: control.controlResolutionHash,
    supplyLossLedgerHash: state.supplyLossLedger.ledgerHash,
    beforeScores: validateScores(state),
    breakdowns,
    simultaneousCommit: true,
    trainingTruth: false,
  };
  return { ...body, resolutionHash: hashStarcraftTmgContract(body) };
}

function endGameResolution(state, context) {
  const round = roundNumber(state, context.mission);
  const progress = progressFor(context.runtimeState, round);
  if (state.phase !== "cleanup" || progress?.scoringApplied !== true
    || progress?.endGameChecked === true) {
    fail("STANDARD_MISSION_END_GAME_UNAVAILABLE");
  }
  const scores = validateScores(state);
  const leader = scores.player1 === scores.player2 ? null
    : scores.player1 > scores.player2 ? "player1" : "player2";
  const lead = Math.abs(scores.player1 - scores.player2);
  const immediate = leader !== null
    && lead >= context.mission.terminal.immediateLeadThresholdVp;
  const roundLimit = round >= context.mission.terminal.scheduledRoundLimit;
  const terminal = immediate || roundLimit;
  const winnerSideKey = !terminal || !leader ? null : leader;
  const reason = immediate
    ? `mission_${context.mission.missionRef.family}_special_lead_${context.mission.terminal.immediateLeadThresholdVp}_plus`
    : roundLimit ? "mission_scheduled_round_limit" : null;
  const body = {
    schema: context.contract.endGameResolutionSchema,
    round,
    missionRecordKey: context.runtimeState.missionRecordKey,
    scores,
    lead,
    immediateLeadThresholdVp: context.mission.terminal.immediateLeadThresholdVp,
    scheduledRoundLimit: context.mission.terminal.scheduledRoundLimit,
    terminal,
    winnerSideKey,
    result: terminal ? winnerSideKey ? "win" : "draw" : "continue",
    reason,
    nextStep: terminal ? null : "resolve_end_of_round_effects",
    trainingTruth: false,
  };
  return { ...body, resolutionHash: hashStarcraftTmgContract(body) };
}

function applyRuntimeState(state, updater) {
  const next = updater(clone(state.officialMissionRuntimeState));
  state.officialMissionRuntimeState = sealRuntimeState(next);
}

function appendLog(state, action, events) {
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ id: `log-${state.log.length + 1}`, round: Number(state.round || 0),
    phase: String(state.phase || ""), action: clone(action), events: clone(events) });
}

function transition(state, action, events, contract, extra = {}) {
  return freezeDeep({
    ok: true,
    schema: contract.transitionSchema,
    executorId: contract.runtimeSchema,
    executorVersion: contract.runtimeVersion,
    state,
    action,
    events,
    ...extra,
    postStateHash: stateHash(state),
    rulesTruth: contract.rulesTruth,
    trainingTruth: false,
  });
}

function createMissionRuntime(input, contract) {
  const catalogue = input.missionEffectCatalogue;
  verifyOfficialMissionEffectCatalogueV1(catalogue);
  const supported = catalogue.missions.filter((entry) => (
    contract.supportedScales.includes(entry.missionRef.engagementScale)
  ));
  if (supported.length !== contract.supportedMissionCount) {
    fail("STANDARD_MISSION_RUNTIME_DENOMINATOR_INVALID");
  }
  const descriptorBody = {
    schema: contract.runtimeSchema,
    version: contract.runtimeVersion,
    missionEffectCatalogueHash: catalogue.catalogueHash,
    supportedMissionRecordKeys: supported.map((entry) => entry.missionRef.recordKey).sort(),
    supportedMissionFamilies: [...new Set(supported.map((entry) => (
      entry.missionRef.family)))].sort(),
    supportedMissionCount: contract.supportedMissionCount,
    ...(contract.supportedScales.length === 1
      ? { supportedEngagementScale: contract.supportedScales[0] }
      : {
          supportedEngagementScales: [...contract.supportedScales],
          supportedMissionCountByScale: Object.fromEntries(
            contract.supportedScales.map((scale) => [scale, supported.filter((entry) => (
              entry.missionRef.engagementScale === scale)).length]),
          ),
          lifecycleAdapterContract:
            "mission_runtime_initialize_enumerate_prepare_apply_v2",
        }),
    exactCapabilities: ["setup", "round_start", "gather_action", "scoring", "end_game"],
    chanceAuthority: "injected_rules_chance_reveal",
    contentHashIsLineageNotCompatibilityGate: true,
    trainingTruth: false,
  };
  const descriptor = freezeDeep({ ...descriptorBody,
    runtimeHash: hashStarcraftTmgContract(descriptorBody) });

  function initialize(input = {}) {
    const state = clone(input.state);
    if (!object(state) || state.officialMissionRuntimeState) {
      fail("STANDARD_MISSION_INITIAL_STATE_INVALID");
    }
    const mission = getOfficialMissionEffectIrV1(catalogue, input.missionRecordKey);
    if (!contract.supportedScales.includes(mission.missionRef.engagementScale)) {
      fail("STANDARD_MISSION_SCALE_UNSUPPORTED");
    }
    const affinity = validateAffinity(input.markerAffinityByNumber);
    const activated = mission.setup.initialMarkerState === "activated";
    for (const marker of markerRows(state)) {
      marker.isActivated = activated;
      marker.isRemoved = false;
      marker.activationRound = activated ? 0 : null;
      marker.controlSideKey = null;
      marker.factionIndicatorSideKey = null;
      delete marker.controlDeterminedAt;
    }
    validateScores(state);
    const runtimeBody = {
      schema: contract.stateSchema,
      runtimeVersion: contract.runtimeVersion,
      runtimeHash: descriptor.runtimeHash,
      missionRecordKey: mission.missionRef.recordKey,
      missionEffectIrHash: mission.missionEffectIrHash,
      missionFamily: mission.missionRef.family,
      engagementScale: mission.missionRef.engagementScale,
      markerAffinityByNumber: affinity,
      roundProgressByRound: {},
      startRoundHistory: [],
      gatherHistory: [],
      scoringHistory: [],
      endGameHistory: [],
      sourceSnapshotHash: catalogue.sourceSnapshotHash,
      normalizedDatasetHash: catalogue.normalizedDatasetHash,
      rulesTruth: contract.stateRulesTruth,
      trainingTruth: false,
    };
    state.officialMissionRuntimeState = sealRuntimeState(runtimeBody);
    const events = [{ type: `${contract.eventPrefix}_initialized`,
      missionRecordKey: mission.missionRef.recordKey,
      missionEffectIrHash: mission.missionEffectIrHash,
      initialMarkerState: mission.setup.initialMarkerState,
      trainingTruth: false }];
    appendLog(state, null, events);
    return transition(state, null, events, contract, { descriptor });
  }

  function prepareStartOfRound(input = {}) {
    const state = input.state;
    const context = verifyRuntimeState(state, catalogue, contract);
    const resolution = startRoundResolution(state, context, input.chanceReveal);
    return baseAction(state, context.runtimeState, context.mission, contract,
      contract.actionTypes.START_ROUND,
      firstPlayer(state), { resolution });
  }

  function enumerateGather(input = {}) {
    const state = input.state;
    const context = verifyRuntimeState(state, catalogue, contract);
    const sideKey = side(input.sideKey);
    return gatherCandidates(state, context, sideKey).map((candidate) => (
      baseAction(state, context.runtimeState, context.mission, contract,
        contract.actionTypes.GATHER, sideKey, candidate)
    ));
  }

  function prepareScore(input = {}) {
    const state = input.state;
    const context = verifyRuntimeState(state, catalogue, contract);
    const resolution = scoringBreakdown(state, context);
    return baseAction(state, context.runtimeState, context.mission, contract,
      contract.actionTypes.SCORE,
      firstPlayer(state), { resolution });
  }

  function prepareEndGame(input = {}) {
    const state = input.state;
    const context = verifyRuntimeState(state, catalogue, contract);
    const resolution = endGameResolution(state, context);
    return baseAction(state, context.runtimeState, context.mission, contract,
      contract.actionTypes.END_GAME,
      firstPlayer(state), { resolution });
  }

  function enumerateLifecycle(input = {}) {
    const state = input.state;
    const context = verifyRuntimeState(state, catalogue, contract);
    const requestedSideKey = side(input.sideKey);
    const round = roundNumber(state, context.mission);
    const progress = progressFor(context.runtimeState, round);
    const candidates = [];
    const chanceRequests = [];
    if (state.gameOver !== true && state.terminal !== true) {
      if (state.phase === "start_of_round" && progress?.startRoundApplied !== true
        && firstPlayer(state) === requestedSideKey) {
        const randomEffect = context.mission.roundStartEffects.find((effect) => (
          effect.kind === "activate_random_eligible_marker"
            && effect.rounds.includes(round)
        ));
        if (randomEffect) {
          const eligibleMarkerNumbers = randomEffect.eligibleMarkerNumbers.filter((number) => {
            const marker = markerRows(state).find((entry) => Number(entry.number) === number);
            return marker && marker.isActivated !== true && marker.isRemoved !== true;
          });
          if (!eligibleMarkerNumbers.length) {
            fail("STANDARD_MISSION_RANDOM_MARKER_DENOMINATOR_EMPTY");
          }
          const requestBody = {
            schema: "starcraft_tmg_official_mission_chance_request_v2",
            purpose: "mission_marker_activation",
            sideKey: requestedSideKey,
            round,
            missionRecordKey: context.runtimeState.missionRecordKey,
            rangeSize: eligibleMarkerNumbers.length,
            eligibleMarkerNumbers,
            preStateHash: stateHash(state),
            resolutionMethod: "rules_chance_reveal_outcome_index",
            trainingTruth: false,
          };
          chanceRequests.push({ ...requestBody,
            chanceRequestHash: hashStarcraftTmgContract(requestBody) });
          if (input.chanceReveal) {
            candidates.push(prepareStartOfRound({
              state,
              chanceReveal: input.chanceReveal,
            }));
          }
        } else {
          candidates.push(prepareStartOfRound({ state }));
        }
      }
      if (state.phase === "assault" && String(state.activeSideKey || "") === requestedSideKey) {
        candidates.push(...enumerateGather({ state, sideKey: requestedSideKey }));
      }
      if (state.phase === "cleanup" && firstPlayer(state) === requestedSideKey) {
        if (progress?.startRoundApplied === true && progress.scoringApplied !== true) {
          candidates.push(prepareScore({ state }));
        } else if (progress?.scoringApplied === true && progress.endGameChecked !== true) {
          candidates.push(prepareEndGame({ state }));
        }
      }
    }
    const body = {
      schema: "starcraft_tmg_official_mission_lifecycle_legal_space_v2",
      executorId: contract.runtimeSchema,
      executorVersion: contract.runtimeVersion,
      missionRecordKey: context.runtimeState.missionRecordKey,
      engagementScale: context.runtimeState.engagementScale,
      sideKey: requestedSideKey,
      round,
      phase: String(state.phase || ""),
      preStateHash: stateHash(state),
      candidates,
      chanceRequests,
      lifecycleComplete: state.gameOver === true || state.terminal === true,
      trainingTruth: false,
    };
    return freezeDeep({ ...body,
      legalSpaceHash: hashStarcraftTmgContract(body) });
  }

  function applyStart(stateInput, action) {
    const expected = prepareStartOfRound({ state: stateInput,
      chanceReveal: action.payload?.resolution?.effects?.find((entry) => (
        entry.chanceReveal))?.chanceReveal });
    verifyAction(action, expected, contract);
    const state = clone(stateInput);
    const resolution = action.payload.resolution;
    for (const effect of resolution.effects) {
      const marker = markerRows(state).find((entry) => Number(entry.number) === effect.markerNumber);
      marker.isActivated = true;
      marker.isRemoved = false;
      marker.activationRound = effect.activationRound;
    }
    applyRuntimeState(state, (runtimeState) => {
      runtimeState.roundProgressByRound[resolution.round] = {
        startRoundApplied: true,
        scoringApplied: false,
        endGameChecked: false,
      };
      runtimeState.startRoundHistory.push({ round: resolution.round,
        resolutionHash: resolution.resolutionHash, effects: clone(resolution.effects),
        trainingTruth: false });
      return runtimeState;
    });
    const events = [{ type: `${contract.eventPrefix}_start_of_round_resolved`,
      round: resolution.round, resolutionHash: resolution.resolutionHash,
      effects: clone(resolution.effects), trainingTruth: false }];
    appendLog(state, action, events);
    return transition(state, action, events, contract, { resolution });
  }

  function applyGather(stateInput, action) {
    const candidates = enumerateGather({ state: stateInput, sideKey: action.sideKey });
    const expected = candidates.find((candidate) => (
      candidate.payload.pieceId === action.payload?.pieceId
        && candidate.payload.markerId === action.payload?.markerId));
    if (!expected) fail("STANDARD_MISSION_GATHER_ACTION_UNAVAILABLE");
    verifyAction(action, expected, contract);
    const state = clone(stateInput);
    const piece = state.pieces.find((entry) => entry.id === action.payload.pieceId);
    piece.activatedPhases = object(piece.activatedPhases) ? piece.activatedPhases : {};
    piece.activatedPhases.assault = true;
    state.scores[action.sideKey] = safeInteger(state.scores[action.sideKey],
      "STANDARD_MISSION_SCORE_INVALID") + 1;
    const context = verifyRuntimeState(stateInput, catalogue, contract);
    const opposingScore = state.scores[otherSide(action.sideKey)];
    const immediate = state.scores[action.sideKey] - opposingScore
      >= context.mission.terminal.immediateLeadThresholdVp;
    if (immediate) {
      state.gameOver = true;
      state.terminal = true;
      state.winner = action.sideKey;
      state.terminalReason = `mission_${context.mission.missionRef.family}`
        + `_special_lead_${context.mission.terminal.immediateLeadThresholdVp}_plus`;
    }
    applyRuntimeState(state, (runtimeState) => {
      runtimeState.gatherHistory.push({ round: Number(state.round), sideKey: action.sideKey,
        pieceId: action.payload.pieceId, markerId: action.payload.markerId,
        actionHash: action.actionHash, resultingScore: state.scores[action.sideKey],
        immediateTerminal: immediate, trainingTruth: false });
      return runtimeState;
    });
    const events = [{ type: `${contract.eventPrefix}_gather_performed`,
      round: Number(state.round), sideKey: action.sideKey,
      pieceId: action.payload.pieceId, markerId: action.payload.markerId,
      victoryPointsGained: 1, resultingScore: state.scores[action.sideKey],
      immediateTerminal: immediate, trainingTruth: false }];
    appendLog(state, action, events);
    return transition(state, action, events, contract);
  }

  function applyScore(stateInput, action) {
    const expected = prepareScore({ state: stateInput });
    verifyAction(action, expected, contract);
    const state = clone(stateInput);
    const resolution = action.payload.resolution;
    for (const sideKey of SIDE_KEYS) {
      state.scores[sideKey] = resolution.beforeScores[sideKey]
        + resolution.breakdowns[sideKey].roundVp;
    }
    for (const sideKey of SIDE_KEYS) {
      for (const row of resolution.breakdowns[sideKey].objectiveRows) {
        if (row.removeMarkerAfterScoring !== true) continue;
        const marker = markerRows(state).find((entry) => Number(entry.number) === row.markerNumber);
        marker.isRemoved = true;
        marker.isActivated = false;
        marker.controlSideKey = null;
        marker.factionIndicatorSideKey = null;
      }
    }
    applyRuntimeState(state, (runtimeState) => {
      runtimeState.roundProgressByRound[resolution.round].scoringApplied = true;
      runtimeState.scoringHistory.push({ round: resolution.round,
        resolutionHash: resolution.resolutionHash,
        resultingScores: clone(state.scores), trainingTruth: false });
      return runtimeState;
    });
    const events = [{ type: `${contract.eventPrefix}_victory_points_scored`,
      round: resolution.round, resolutionHash: resolution.resolutionHash,
      breakdowns: clone(resolution.breakdowns), resultingScores: clone(state.scores),
      simultaneousCommit: true, trainingTruth: false }];
    appendLog(state, action, events);
    return transition(state, action, events, contract, { resolution });
  }

  function applyEndGame(stateInput, action) {
    const expected = prepareEndGame({ state: stateInput });
    verifyAction(action, expected, contract);
    const state = clone(stateInput);
    const resolution = action.payload.resolution;
    if (resolution.terminal) {
      state.gameOver = true;
      state.terminal = true;
      state.winner = resolution.winnerSideKey;
      state.terminalReason = resolution.reason;
    }
    applyRuntimeState(state, (runtimeState) => {
      runtimeState.roundProgressByRound[resolution.round].endGameChecked = true;
      runtimeState.endGameHistory.push({ round: resolution.round,
        resolutionHash: resolution.resolutionHash, terminal: resolution.terminal,
        winnerSideKey: resolution.winnerSideKey, result: resolution.result,
        reason: resolution.reason, trainingTruth: false });
      return runtimeState;
    });
    const events = [{ type: `${contract.eventPrefix}_end_game_checked`,
      round: resolution.round, resolutionHash: resolution.resolutionHash,
      terminal: resolution.terminal, winnerSideKey: resolution.winnerSideKey,
      result: resolution.result, reason: resolution.reason, trainingTruth: false }];
    appendLog(state, action, events);
    return transition(state, action, events, contract, { resolution });
  }

  function apply(input = {}) {
    const state = input.state;
    const action = input.action;
    if (!object(action) || action.preStateHash !== stateHash(state)) {
      fail("STANDARD_MISSION_ACTION_STALE_OR_INVALID");
    }
    switch (action.actionType) {
      case contract.actionTypes.START_ROUND:
        return applyStart(state, action);
      case contract.actionTypes.GATHER:
        return applyGather(state, action);
      case contract.actionTypes.SCORE:
        return applyScore(state, action);
      case contract.actionTypes.END_GAME:
        return applyEndGame(state, action);
      default:
        fail("STANDARD_MISSION_ACTION_TYPE_UNSUPPORTED", String(action.actionType || ""));
    }
  }

  return freezeDeep({ descriptor, initialize, enumerateLifecycle,
    prepareStartOfRound, enumerateGather, prepareScore, prepareEndGame, apply });
}

export function createOfficialStandardMissionRuntimeV1(input = {}) {
  return createMissionRuntime(input, STANDARD_V1_CONTRACT);
}

export function createOfficialMissionRuntimeV2(input = {}) {
  return createMissionRuntime(input, ALL_MISSIONS_V2_CONTRACT);
}
