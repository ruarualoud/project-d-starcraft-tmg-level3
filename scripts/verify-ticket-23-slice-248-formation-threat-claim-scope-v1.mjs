#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  inspectStarcraftTmgFormationThreatClaimsV1,
  inspectStarcraftTmgOpponentPredictionFeasibilityV1,
  normalizeStarcraftTmgOpponentPredictionsV1,
  inspectStarcraftTmgUnitSupplyClaimsV1,
  STARCRAFT_TMG_MAX_SEMANTIC_CORRECTION_ROUNDS_PER_CHOICE,
} from "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { createStarcraftTmgHostedBotSeatRuntimeV1 } from
  "../packages/online-agent-session/hosted-bot-seat-runtime-v1.mjs";
import { projectStarcraftTmgThreatActionWindowV1 } from
  "../packages/online-agent-session/tactical-relationship-graph-v1.mjs";
import { projectStarcraftTmgUnitSupplyControlV1 } from
  "../packages/online-agent-session/player-spatial-observation-v1.mjs";

if (process.argv.includes("--friendly-threat-only")) {
  const { readFile } = await import("node:fs/promises");
  const { DatabaseSync } = await import("node:sqlite");
  const { createStarcraftTmgPrivatePayloadCodec } = await import(
    "../packages/room-store/room-store-v1.mjs");
  const { buildStarcraftTmgTacticalRelationshipGraphV1 } = await import(
    "../packages/online-agent-session/tactical-relationship-graph-v1.mjs");
  const directory = process.argv.find((arg) => arg.startsWith("--run-directory="))
    ?.slice("--run-directory=".length);
  assert(directory);
  const privateState = JSON.parse(await readFile(`${directory}/runner-private.json`, "utf8"));
  const codec = createStarcraftTmgPrivatePayloadCodec({
    key: privateState.storeEncryptionKeyBase64,
    keyId: `ticket23-slice248-room-store-${directory.split("/").at(-1)}`,
    trustLevel: "development_persistent",
  });
  const roomDb = new DatabaseSync(`${directory}/room.sqlite`, { readOnly: true });
  const { envelope } = codec.decode(roomDb.prepare(
    "SELECT aggregate_cipher FROM sc_rooms WHERE room_id = ?").get(privateState.roomId).aggregate_cipher,
  `room:${privateState.roomId}:aggregate`);
  roomDb.close();
  assert.equal(envelope.stateRevision, 11);
  const db = new DatabaseSync(`${directory}/seats/player1/provider/live-decisions.sqlite`, { readOnly: true });
  const record = JSON.parse(db.prepare("SELECT record_json FROM sc_live_decision_records").get().record_json);
  db.close();
  const decision = Object.values(record.decisions).find((d) => d.authority.stateRevision === 11);
  const action = Object.values(decision.attempts).at(-1).safeOutput.providerTurn
    .toolCalls.find((call) => call.name === "submit_decision").arguments;
  const selection = action.intent.selection;
  const selected = decision.queryReceipts.find((receipt) => receipt.queryKind === "space.solve_formation")
    .result.formationOptions.find((entry) => entry.formationOptionId === selection.optionId);
  assert(selected.relationshipComparison.relationships.some((entry) =>
    entry.targetId === "player1-goliath-1" && entry.enemyStationaryThreatProfileCount === 5));
  const observation = { units: envelope.state.pieces.map((piece) => ({
    unitId: piece.id, sideRelation: piece.sideKey === "player1" ? "own" : "opponent",
  })) };
  const failures = [];
  const graphFor = (state) => buildStarcraftTmgTacticalRelationshipGraphV1({
    state, seatKey: "player1", request: { intent: "preserve_lane",
      subjectUnitIds: ["player1-marine-1"], targetIds: ["player1-goliath-1"] },
  });
  const friend = graphFor(envelope.state).relationships.find((edge) => edge.toUnitId === "player1-goliath-1");
  if (friend.threats.toFrom.stationaryProfileKeys.length
    || friend.threats.fromTo.stationaryProfileKeys.length
    || friend.threats.toFrom.chargeBand.withinMaximumBand) failures.push("friendly_weapons_become_hostile_threat");
  assert(friend.nearestPhysicalEdges.distanceMilliInches >= 0, "preserve friendly spacing geometry");
  const inspection = inspectStarcraftTmgFormationThreatClaimsV1({
    raw: action, selection, option: selected, spatialObservation: observation,
  });
  if (inspection.contradicted) failures.push("saved_correct_public_claim_rejected");
  const opponent = structuredClone(envelope.state);
  opponent.pieces.find((piece) => piece.id === "player1-goliath-1").sideKey = "player2";
  const enemy = graphFor(opponent).relationships.find((edge) => edge.toUnitId === "player1-goliath-1");
  assert(enemy.threats.toFrom.stationaryProfileKeys.length > 0, "real opposing fire is retained");
  const enemyObservation = structuredClone(observation);
  enemyObservation.units.find((unit) => unit.unitId === "player1-goliath-1").sideRelation = "opponent";
  assert(inspectStarcraftTmgFormationThreatClaimsV1({ raw: action, selection,
    option: selected, spatialObservation: enemyObservation }).contradicted,
  "the same supported hostile profiles still contradict a no-fire claim");
  opponent.rosterRegistryResolution = { ...opponent.rosterRegistryResolution,
    teamMembershipByPlayer: { player1: "team-a", player2: "team-a" } };
  const allied = graphFor(opponent).relationships.find((edge) => edge.toUnitId === "player1-goliath-1");
  if (allied.threats.toFrom.stationaryProfileKeys.length) failures.push("allied_weapons_become_hostile_threat");
  console.log(JSON.stringify({ regressionFailures: failures, stateRevision: 11,
    savedSelectedFormation: selected.formationOptionId, providerCalls: 0, roomMutations: 0 }));
  assert.deepEqual(failures, []);
  process.exit(0);
}

const option = {
  relationshipComparison: {
    relationships: [
      { targetId: "player1-goliath-1",
        enemyStationaryThreatProfileCount: 2 },
      { targetId: "player1-marine-1",
        enemyStationaryThreatProfileCount: 0 },
    ],
  },
};

function inspect(raw, publicReason = "Rules-checked complete formation.",
  queryReceipts = []) {
  return inspectStarcraftTmgFormationThreatClaimsV1({
    raw,
    selection: { publicReason },
    option,
    queryReceipts,
  });
}

const aspirationOnly = inspect({
  intent: {
    currentGoal: "Keep every own unit outside the Terran fire envelope.",
    planContinuity: "Continue the plan to stay outside every fire band.",
    predictedOpponentResponses: [{
      opponentAction: "Move a Goliath into firing range.",
    }],
  },
  rejectedAlternatives: [{
    reason: "Charge is beyond maximum charge range.",
  }],
});
assert.equal(aspirationOnly.contradicted, false,
  "aspirations, predictions and rejected alternatives are not realized facts");

const falseOutcome = inspect({
  intent: {
    expectedOwnOutcome: "The formation stays outside every current fire band.",
    expectedEffects: ["All own units remain outside the Terran fire envelope."],
  },
});
assert.equal(falseOutcome.contradicted, true,
  "a realized no-threat outcome must be rejected when stationary profiles cover");
assert.deepEqual(new Set(falseOutcome.contradictions.map((entry) => entry.field)),
  new Set(["intent.expectedOwnOutcome", "intent.expectedEffects"]));

const correctedOutcome = inspect({
  selectedReason: "Advance toward the objective with the largest separation.",
  scoreOrPositionValue:
    "The endpoint is beyond the 8000-13000 move-then-fire band.",
  risk: "The formation is NOT outside the enemy fire envelope; both Goliaths still cover it.",
  intent: {
    currentGoal: "Eventually leave every enemy fire band.",
    expectedOwnOutcome: "Every base ends on-board and in coherency.",
    expectedEffects: ["Minimum enemy base-edge distance becomes 15830."],
    risks: ["Both stationary Goliath profiles still cover the formation."],
  },
  publicDecisionSummary: {
    calculations: [
      "The endpoint remains inside both stationary weapon profiles.",
      "It is beyond only the move-then-fire band, not the fire envelope.",
    ],
    risk: "This endpoint is not outside the enemy fire envelope.",
  },
  speech: "Both Goliaths retain stationary fire coverage.",
}, "This endpoint is not outside the enemy fire envelope.");
assert.equal(correctedOutcome.contradicted, false,
  "explicitly corrected denial and movement-only bands must not be re-rejected");

const correctedRatherThanOutside = inspect({
  risk: "The Host projection shows stationary profiles covering the unit, so the position is inside the current fire envelope rather than outside it.",
}, "This formation is inside the enemy fire envelope rather than outside it.");
assert.equal(correctedRatherThanOutside.contradicted, false,
  "inside-rather-than-outside wording is an explicit correction, not an escape claim");

const moveThenFireReceipt = {
  queryKind: "space.inspect_relationships",
  status: "advisory_estimate",
  result: {
    relationships: [{
      edgeKind: "unit_spatial_relationship",
      fromUnitId: "player2-swarmling",
      toUnitId: "player1-goliath-1",
      threats: {
        toFrom: {
          stationaryProfileKeys: [],
          moveThenAttackProfileKeys: [
            "army_units:goliath::assault::Autocannon",
            "army_units:goliath::assault::Scatter Missiles",
          ],
          currentRoundStationaryProfileKeys: [],
          currentRoundMoveThenAttackProfileKeys: [
            "army_units:goliath::assault::Autocannon",
            "army_units:goliath::assault::Scatter Missiles",
          ],
        },
      },
      fireZoneExchange: {
        toStationaryProfileCount: 0,
        toMoveThenFireProfileCount: 2,
        toCurrentRoundStationaryProfileCount: 0,
        toCurrentRoundMoveThenFireProfileCount: 2,
      },
    }],
  },
};
const falseRejectedAlternative = inspect({
  candidateComparisons: [{
    candidateId: "lie-in-wait",
    evaluation: "Lie in Wait is unnecessary because the Swarmling is outside all enemy fire bands with 0 in-band move-then-fire profiles.",
  }],
  rejectedAlternatives: [{
    candidateId: "lie-in-wait",
    reason: "Burrowing gives no protection because there are 0 in-band move-then-fire profiles.",
  }],
}, "Rules-checked asset placement.", [moveThenFireReceipt]);
assert.equal(falseRejectedAlternative.contradicted, true,
  "selection-influencing alternative reasons must not erase live move-then-fire bands");
assert.deepEqual(new Set(falseRejectedAlternative.contradictions.map(
  (entry) => entry.field)), new Set([
  "candidateComparisons[0].evaluation",
  "rejectedAlternatives[0].reason",
]));

const goliathLifecycleState = {
  round: 1,
  phase: "movement",
  players: { player1: { passedPhases: {} } },
};
const goliathAfterMove = {
  sideKey: "player1",
  activatedPhases: { movement: true, assault: false, combat: false },
};
const activatedMovementWindow = projectStarcraftTmgThreatActionWindowV1(
  goliathLifecycleState, goliathAfterMove);
assert.equal(activatedMovementWindow.movementCurrentRoundAvailable, false);
assert.equal(activatedMovementWindow.assaultCurrentRoundAvailable, true);
assert.equal(activatedMovementWindow.rangedAttackIncludesMovement, false);
assert.equal(activatedMovementWindow.capabilityGates.move.canExecuteThisRound,
  false);
assert.equal(activatedMovementWindow.capabilityGates.rangedAttack
  .canExecuteThisRound, true);
assert.equal(activatedMovementWindow.capabilityGates.meleeAttack
  .canExecuteThisRound, true);
assert.equal(activatedMovementWindow.capabilityGates.damageAbility
  .canExecuteThisRound, null,
  "damage abilities remain unknown until a typed effect contract projects them");

const futureOnlyMoveThenFireReceipt = structuredClone(moveThenFireReceipt);
futureOnlyMoveThenFireReceipt.result.relationships[0].threats.toFrom
  .currentRoundMoveThenAttackProfileKeys = [];
futureOnlyMoveThenFireReceipt.result.relationships[0].threats.toFrom.actionWindow
  = {
    ...activatedMovementWindow,
    earliestMoveThenAttackHorizon: "next_round",
  };
futureOnlyMoveThenFireReceipt.result.relationships[0].fireZoneExchange
  .toCurrentRoundMoveThenFireProfileCount = 0;
const correctLifecycleClaim = inspect({
  publicDecisionSummary: {
    calculations: [
      "The Goliath cannot close distance this round because its Movement activation is complete; its geometric move-then-fire band remains next-round pressure.",
    ],
  },
}, "Rules-checked asset placement.", [futureOnlyMoveThenFireReceipt]);
assert.equal(correctLifecycleClaim.contradicted, false,
  "a future-only geometric band must not be promoted to current-round fire");

const goliathBeforeMove = {
  sideKey: "player1",
  activatedPhases: { movement: false, assault: false, combat: false },
};
const openMovementWindow = projectStarcraftTmgThreatActionWindowV1(
  goliathLifecycleState, goliathBeforeMove);
assert.equal(openMovementWindow.movementCurrentRoundAvailable, true);
assert.equal(openMovementWindow.assaultCurrentRoundAvailable, true);

const goliathAfterPassState = structuredClone(goliathLifecycleState);
goliathAfterPassState.players.player1.passedPhases.movement = true;
const passedMovementWindow = projectStarcraftTmgThreatActionWindowV1(
  goliathAfterPassState, goliathBeforeMove);
assert.equal(passedMovementWindow.movementCurrentRoundAvailable, false,
  "passing Movement closes current-round move-then-fire setup");

const opponentPredictionObservation = {
  units: [
    {
      unitId: "player1-goliath-1",
      sideRelation: "opponent",
      activationStatus: {
        activatedPhases: { movement: true, assault: false, combat: false },
      },
    },
    {
      unitId: "player2-swarmling",
      sideRelation: "own",
      activationStatus: {
        activatedPhases: { movement: true, assault: false, combat: false },
      },
    },
  ],
  offTableUnits: [{
    unitId: "player1-marine-1",
    sideRelation: "opponent",
    isInReserves: true,
    isDestroyed: false,
    positionAvailable: false,
  }],
};
const impossibleActivatedMove =
  inspectStarcraftTmgOpponentPredictionFeasibilityV1({
    responses: [{
      responseId: "resp-goliath-advance",
      actionClass: "move",
      opponentAction: "The Goliath advances south this Movement Phase.",
      likelyActorUnitId: "player1-goliath-1",
      horizon: { kind: "current_phase", count: 1 },
    }],
    spatialObservation: opponentPredictionObservation,
    currentPhase: "movement",
  });
assert.equal(impossibleActivatedMove.status, "contradicted");
assert.equal(impossibleActivatedMove.contradictions[0].reason,
  "actor_already_activated_for_predicted_phase");
assert.equal(impossibleActivatedMove.contradictions[0].repairHint,
  "use_bounded_public_transitions_for_later_round_or_choose_actor_unactivated_in_predicted_phase");

const impossibleCurrentRoundRangedTarget =
  inspectStarcraftTmgOpponentPredictionFeasibilityV1({
    responses: [{
      responseId: "resp-goliath-ranged-next-round",
      actionClass: "ranged_attack",
      opponentAction: "The Goliath fires once it can bring the Swarmling into range.",
      likelyActorUnitId: "player1-goliath-1",
      likelyTargetUnitId: "player2-swarmling",
      horizon: { kind: "current_round", count: 1 },
      basis: [
        "No current-round fire band exists; movement pressure begins next round.",
      ],
    }],
    spatialObservation: opponentPredictionObservation,
    currentPhase: "movement",
    queryReceipts: [futureOnlyMoveThenFireReceipt],
  });
assert.equal(impossibleCurrentRoundRangedTarget.status, "contradicted");
assert.equal(impossibleCurrentRoundRangedTarget.contradictions[0].reason,
  "ranged_target_not_in_current_round_fire_band");
assert.equal(impossibleCurrentRoundRangedTarget.contradictions[0].repairHint,
  "use_bounded_public_transitions_for_future_fire_or_choose_actor_target_with_current_round_fire_band",
  "the concrete live failure must return a repairable horizon instruction");

const currentRoundStationaryReceipt = structuredClone(
  futureOnlyMoveThenFireReceipt);
currentRoundStationaryReceipt.result.relationships[0].threats.toFrom
  .currentRoundStationaryProfileKeys = [
    "army_units:goliath::assault::Autocannon",
  ];
const possibleCurrentRoundRangedTarget =
  inspectStarcraftTmgOpponentPredictionFeasibilityV1({
    responses: [{
      responseId: "resp-goliath-current-fire",
      actionClass: "ranged_attack",
      opponentAction: "The Goliath fires its Autocannon at the Swarmling.",
      likelyActorUnitId: "player1-goliath-1",
      likelyTargetUnitId: "player2-swarmling",
      horizon: { kind: "current_round", count: 1 },
    }],
    spatialObservation: opponentPredictionObservation,
    currentPhase: "movement",
    queryReceipts: [currentRoundStationaryReceipt],
  });
assert.equal(possibleCurrentRoundRangedTarget.status, "consistent");

const impossibleReserveMove =
  inspectStarcraftTmgOpponentPredictionFeasibilityV1({
    responses: [{
      responseId: "resp-marine-move",
      actionClass: "move",
      opponentAction: "A Marine moves from reserves.",
      likelyActorUnitId: "player1-marine-1",
      horizon: { kind: "current_phase", count: 1 },
    }],
    spatialObservation: opponentPredictionObservation,
    currentPhase: "movement",
  });
assert.equal(impossibleReserveMove.status, "contradicted");
assert.equal(impossibleReserveMove.contradictions[0].reason,
  "reserve_actor_requires_deploy_action_class");

const possibleFutureReserveMoveThenFire =
  inspectStarcraftTmgOpponentPredictionFeasibilityV1({
    responses: [{
      responseId: "resp-marine-future-move-fire",
      actionClass: "move_then_ranged_attack",
      opponentAction:
        "After deploying, the Marine moves and fires in a later round.",
      likelyActorUnitId: "player1-marine-1",
      horizon: { kind: "bounded_public_transitions", count: 2 },
    }],
    spatialObservation: opponentPredictionObservation,
    currentPhase: "movement",
  });
assert.equal(possibleFutureReserveMoveThenFire.status, "consistent",
  "a reserve unit may be predicted to act after a bounded deploy prerequisite");

const possibleReserveDeploy =
  inspectStarcraftTmgOpponentPredictionFeasibilityV1({
    responses: [{
      responseId: "resp-marine-deploy",
      actionClass: "deploy",
      opponentAction: "A Marine deploys from reserves.",
      likelyActorUnitId: "player1-marine-1",
      horizon: { kind: "current_phase", count: 1 },
    }],
    spatialObservation: opponentPredictionObservation,
    currentPhase: "movement",
  });
assert.equal(possibleReserveDeploy.status, "consistent");

const recoveredMixedReservePredictions =
  normalizeStarcraftTmgOpponentPredictionsV1({
    action: {
      intent: {
        predictedOpponentResponses: [
          {
            responseId: "resp-marine-deploy",
            actionClass: "deploy",
            opponentAction: "A Marine deploys from reserves.",
            likelyActorUnitId: "player1-marine-1",
            horizon: { kind: "current_phase", count: 1 },
          },
          {
            responseId: "resp-marine-move",
            actionClass: "move",
            opponentAction: "A Marine moves from reserves.",
            likelyActorUnitId: "player1-marine-1",
            horizon: { kind: "current_phase", count: 1 },
          },
        ],
      },
    },
    spatialObservation: opponentPredictionObservation,
    currentPhase: "movement",
  });
assert.deepEqual(
  recoveredMixedReservePredictions.intent.predictedOpponentResponses
    .map((entry) => entry.responseId),
  ["resp-marine-deploy"],
  "a valid prediction must survive while an impossible auxiliary row is dropped",
);
assert.deepEqual(recoveredMixedReservePredictions.opponentPredictionNormalization,
  {
    schema: "starcraft_tmg_opponent_prediction_normalization_v1",
    normalizationVersion: "starcraft_tmg_live_action_shape_normalization_v32",
    operation: "drop_lifecycle_impossible_auxiliary_predictions",
    inputCount: 2,
    retainedCount: 1,
    removed: [{
      responseId: "resp-marine-move",
      actorId: "player1-marine-1",
      actionClass: "move",
      reason: "reserve_actor_requires_deploy_action_class",
    }],
    rulesAuthority: false,
    trainingTruth: false,
  });

const stillBlockedAllInvalidPredictions =
  normalizeStarcraftTmgOpponentPredictionsV1({
    action: {
      intent: {
        predictedOpponentResponses: [{
          responseId: "resp-marine-move",
          actionClass: "move",
          opponentAction: "A Marine moves from reserves.",
          likelyActorUnitId: "player1-marine-1",
          horizon: { kind: "current_phase", count: 1 },
        }],
      },
    },
    spatialObservation: opponentPredictionObservation,
    currentPhase: "movement",
  });
assert.equal(
  stillBlockedAllInvalidPredictions.intent.predictedOpponentResponses[0]
    .responseId,
  "resp-marine-move",
  "normalization must not invent a prediction when every row is impossible",
);
assert.equal(stillBlockedAllInvalidPredictions.opponentPredictionNormalization,
  undefined);

const impossibleUnitBoundPhaseControl =
  inspectStarcraftTmgOpponentPredictionFeasibilityV1({
    responses: [{
      responseId: "resp-pass",
      actionClass: "phase_control",
      opponentAction: "Player1 may Pass.",
      likelyActorUnitId: "player1-goliath-1",
      horizon: { kind: "current_phase", count: 1 },
    }],
    spatialObservation: opponentPredictionObservation,
    currentPhase: "movement",
  });
assert.equal(impossibleUnitBoundPhaseControl.status, "contradicted");
assert.equal(impossibleUnitBoundPhaseControl.contradictions[0].reason,
  "side_level_action_must_not_name_unit_actor");

const supplyObservation = {
  units: [{
    unitId: "player2-swarmling",
    unitName: "Swarmling (Zergling)",
    currentModels: 18,
    currentSupply: 1,
  }],
  offTableUnits: [{
    unitId: "player1-medic",
    unitName: "Medic",
    currentModels: 3,
    currentSupply: 1,
  }],
};
const falseModelCountSupply = inspectStarcraftTmgUnitSupplyClaimsV1({
  spatialObservation: supplyObservation,
  value: {
    assessment: {
      evidenceAgainst: [
        "The Swarmling's 18 models give the opponent a large marker-contest Supply pool once it advances.",
      ],
    },
  },
});
assert.equal(falseModelCountSupply.status, "contradicted",
  "model count must not be promoted into marker-control Supply");
assert.deepEqual(falseModelCountSupply.contradictions.map((entry) => ({
  unitId: entry.unitId,
  currentSupply: entry.currentSupply,
  reason: entry.reason,
})), [{
  unitId: "player2-swarmling",
  currentSupply: 1,
  reason: "model_count_inferred_as_large_supply",
}]);

const exactSwarmlingSupply = inspectStarcraftTmgUnitSupplyClaimsV1({
  spatialObservation: supplyObservation,
  value: {
    publicDecisionSummary: {
      visibleFacts: [
        "The Swarmling has 18 models but Current Supply 1; the models expand footprint and casualty buffer, not marker strength.",
      ],
    },
  },
});
assert.equal(exactSwarmlingSupply.status, "consistent",
  "an exact Supply-1 explanation must remain valid");

const supplyState = {
  officialUnitCardSupplyDataBundle: {
    unitProfiles: [{
      recordKey: "army_units:swarmling__zergling_",
      profileHash: "swarmling-profile-hash",
      supplyProfile: [
        { minimumModels: 1, maximumModels: 6, supply: 0, applicable: true },
        { minimumModels: 7, maximumModels: 18, supply: 1, applicable: true },
      ],
    }, {
      recordKey: "army_units:zergling",
      profileHash: "zergling-profile-hash",
      supplyProfile: [
        { minimumModels: 1, maximumModels: 6, supply: 0, applicable: true },
        { minimumModels: 7, maximumModels: 12, supply: 1, applicable: true },
        { minimumModels: 13, maximumModels: 18, supply: 2, applicable: true },
      ],
    }],
  },
};
const swarmlingSupplyControl = projectStarcraftTmgUnitSupplyControlV1({
  id: "player2-swarmling",
  officialUnitRecordKey: "army_units:swarmling__zergling_",
  currentModels: 18,
  currentSupply: 1,
}, supplyState);
assert.deepEqual(swarmlingSupplyControl, {
  status: "exact_rules_profile",
  currentModels: 18,
  currentSupply: 1,
  currentStateMatchesProfile: true,
  nextSupplyReduction: {
    casualtiesRequired: 12,
    remainingModels: 6,
    currentSupplyAfter: 0,
    supplyLost: 1,
  },
  supplyZeroThreshold: {
    casualtiesRequired: 12,
    remainingModels: 6,
    currentSupplyAfter: 0,
    supplyLost: 1,
  },
  futureSupplyReductions: [{
    casualtiesRequired: 12,
    remainingModels: 6,
    currentSupplyAfter: 0,
    supplyLost: 1,
  }],
  sourceProfileHash: "swarmling-profile-hash",
  compositionLabelsExposed: false,
  rulesAuthority: true,
  trainingTruth: false,
});
const zerglingSupplyControl = projectStarcraftTmgUnitSupplyControlV1({
  id: "player2-zergling",
  officialUnitRecordKey: "army_units:zergling",
  currentModels: 18,
  currentSupply: 2,
}, supplyState);
assert.deepEqual(zerglingSupplyControl.futureSupplyReductions.map((entry) => ({
  casualtiesRequired: entry.casualtiesRequired,
  remainingModels: entry.remainingModels,
  currentSupplyAfter: entry.currentSupplyAfter,
})), [
  { casualtiesRequired: 6, remainingModels: 12, currentSupplyAfter: 1 },
  { casualtiesRequired: 12, remainingModels: 6, currentSupplyAfter: 0 },
]);

assert.equal(STARCRAFT_TMG_MAX_SEMANTIC_CORRECTION_ROUNDS_PER_CHOICE, 3,
  "one decision cannot reopen more than three semantic correction rounds");

const rejectionScope = {
  gameId: "starcraft-tmg",
  roomId: "slice248-semantic-limit-room",
  matchBindingHash: "slice248-semantic-limit-match",
  seatKey: "player2",
};
const roomProjection = {
  room: {
    roomId: rejectionScope.roomId,
    stateRevision: 56,
    stateHash: "slice248-semantic-limit-state",
  },
  matchBinding: { bindingHash: rejectionScope.matchBindingHash },
  viewer: { seatKey: rejectionScope.seatKey },
  state: {
    round: 2,
    phase: "movement",
    activeSideKey: rejectionScope.seatKey,
    terminal: false,
    gameOver: false,
  },
};
const legalSpace = {
  legalSpaceHash: "slice248-semantic-limit-legal-space",
  finiteActions: ["candidate-1", "candidate-2"].map((actionKey) => ({
    actionKey,
    action: { actionType: "pass", sideKey: rejectionScope.seatKey },
  })),
  parameterDomains: [],
};
const roomPort = Object.fromEntries([
  "previewAction", "confirmPreview", "claimControl", "applyAction",
  "replayRoom",
].map((method) => [method, async () => ({
  ok: false,
  reason: `UNEXPECTED_${method.toUpperCase()}`,
})]));
roomPort.readRoom = async () => ({ ok: true, projection: roomProjection });
roomPort.legalSpace = async () => ({ ok: true, legalSpace });
let rejectedDecisionCalls = 0;
const rejectionRuntime = createStarcraftTmgHostedBotSeatRuntimeV1({
  roomPort,
  decisionPort: {
    async decide() {
      rejectedDecisionCalls += 1;
      return {
        ok: false,
        reason: "LIVE_DECISION_SEMANTIC_CORRECTION_LIMIT_REACHED",
        findingSeverity: "High",
      };
    },
  },
  matchMode: "agent_vs_agent",
});
await rejectionRuntime.attach({
  scope: rejectionScope,
  seatToken: "slice248-semantic-limit-seat-token",
  automationConsent: {
    approved: true,
    approvedBy: "human",
    scope: "current_match_bot_seat",
    approvedAt: "2026-09-21T00:00:00.000Z",
  },
  autoDrive: false,
});
const rejectedDrive = await rejectionRuntime.drive({ scope: rejectionScope });
assert.equal(rejectedDrive.ok, false);
assert.equal(rejectedDrive.reason,
  "LIVE_DECISION_SEMANTIC_CORRECTION_LIMIT_REACHED");
assert.equal(rejectedDrive.findingSeverity, "High",
  "a High decision rejection must block the Bot seat immediately");
assert.equal(rejectedDrive.projection.lifecycle, "blocked");
assert.equal(rejectedDecisionCalls, 1,
  "the Bot runtime must not reopen the exhausted decision");
await rejectionRuntime.close();

console.log(JSON.stringify({
  passed: true,
  aspirationCheckedClaims: aspirationOnly.checkedClaimCount,
  falseOutcomeFields: falseOutcome.contradictions.map((entry) => entry.field),
  correctedOutcomeCheckedClaims: correctedOutcome.checkedClaimCount,
  ratherThanOutsideCheckedClaims:
    correctedRatherThanOutside.checkedClaimCount,
  moveThenFireAlternativeFields:
    falseRejectedAlternative.contradictions.map((entry) => entry.field),
  activatedMovementWindow,
  correctLifecycleClaimContradicted: correctLifecycleClaim.contradicted,
  openMovementWindow,
  passedMovementWindow,
  impossibleActivatedPredictionStatus: impossibleActivatedMove.status,
  impossibleReserveMoveStatus: impossibleReserveMove.status,
  possibleReserveDeployStatus: possibleReserveDeploy.status,
  impossibleUnitBoundPhaseControlStatus:
    impossibleUnitBoundPhaseControl.status,
  falseModelCountSupplyStatus: falseModelCountSupply.status,
  exactSwarmlingSupplyStatus: exactSwarmlingSupply.status,
  swarmlingSupplyZeroCasualties:
    swarmlingSupplyControl.supplyZeroThreshold.casualtiesRequired,
  zerglingSupplyReductionCasualties:
    zerglingSupplyControl.futureSupplyReductions.map((entry) =>
      entry.casualtiesRequired),
  semanticCorrectionLimit:
    STARCRAFT_TMG_MAX_SEMANTIC_CORRECTION_ROUNDS_PER_CHOICE,
  rejectionSeverity: rejectedDrive.findingSeverity,
  rejectionLifecycle: rejectedDrive.projection.lifecycle,
  rejectedDecisionCalls,
  providerCalls: 0,
  paidCostCny: 0,
}, null, 2));
