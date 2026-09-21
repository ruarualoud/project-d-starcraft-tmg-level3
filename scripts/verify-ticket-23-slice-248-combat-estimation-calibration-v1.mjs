#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgRefereeCrypto } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgMatchDecisionContinuityV1 } from
  "../packages/online-agent-session/match-decision-continuity-v1.mjs";
import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from
  "../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs";
import { createStarcraftTmgTurnPlanRuntimeV1 } from
  "../packages/online-agent-session/turn-plan-runtime-v1.mjs";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { createSqliteStarcraftTmgRoomStore } from
  "../packages/room-store/sqlite-room-store-v1.mjs";
import { createTicket20AgentAgentDemoFixtureV1 } from
  "./support/ticket20-human-agent-demo-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_RUN = path.join(ROOT,
  "build/ticket-23-slice-248-standard-2000-aa-live-v1/20260920191139413");
const runArgument = process.argv.find((value) =>
  value.startsWith("--run-directory="));
const runDirectory = path.resolve(ROOT, runArgument
  ? runArgument.slice("--run-directory=".length) : DEFAULT_RUN);
const privateState = JSON.parse(await readFile(
  path.join(runDirectory, "runner-private.json"), "utf8"));
const runId = path.basename(runDirectory);
const roomStore = createSqliteStarcraftTmgRoomStore({
  filename: path.join(runDirectory, "room.sqlite"),
  privatePayloadCodec: createStarcraftTmgPrivatePayloadCodec({
    key: privateState.storeEncryptionKeyBase64,
    keyId: `ticket23-slice248-room-store-${runId}`,
    trustLevel: "development_persistent",
  }),
});

function authorityInputs(state, bindingHash, roomId, revision, legalSpace,
  actionSpace) {
  const stateHash = hash(state);
  return {
    roomProjection: {
      room: { roomId, stateRevision: revision, stateHash },
      matchBinding: { bindingHash },
      viewer: { seatKey: "player1", visibilityScope: "player" },
      state,
    },
    legalSpace: {
      roomId,
      matchBindingHash: bindingHash,
      stateRevision: revision,
      stateHash,
      legalSpaceHash: legalSpace.legalSpaceHash,
      finiteActions: legalSpace.finiteActions,
      parameterDomains: legalSpace.parameterDomains,
    },
    spatialActionSpace: {
      authority: {
        stateRevision: revision,
        stateHash,
        legalSpaceHash: legalSpace.legalSpaceHash,
      },
      actionSpaceHash: actionSpace.actionSpaceHash,
      finiteActions: actionSpace.finiteActions,
      parameterDomains: actionSpace.parameterDomains,
    },
  };
}

function resetForAssault(source) {
  const state = structuredClone(source);
  state.phase = "assault";
  state.stage = "unit_activation";
  state.activeSideKey = "player1";
  state.pendingAction = null;
  state.pendingReactionWindow = null;
  state.selectedRosterActivationWindow = null;
  delete state.pendingCurrentProductRangedSequence;
  delete state.pendingCurrentProductRangedCasualtyChoice;
  for (const player of Object.values(state.players || {})) {
    player.passedPhases = { ...(player.passedPhases || {}), assault: false };
  }
  for (const piece of state.pieces || []) {
    piece.activatedPhases = {
      movement: false,
      assault: false,
      combat: false,
      ...(piece.activatedPhases || {}),
      assault: false,
    };
  }
  const phaseKey = `${Number(state.round || 1)}:assault`;
  state.phaseFirstActorByRound = {
    ...(state.phaseFirstActorByRound || {}),
    [phaseKey]: {
      round: Number(state.round || 1),
      phase: "assault",
      markerHolderSideKey: state.firstPlayerSideKey,
      chosenFirstActorSideKey: "player1",
    },
  };
  return state;
}

try {
  const aggregate = await roomStore.loadRoom(privateState.roomId);
  assert.equal(aggregate.stateRevision, 66,
    "the frozen low-strategy baseline must remain at revision 66");
  const fixture = await createTicket20AgentAgentDemoFixtureV1({
    root: ROOT,
    roomId: privateState.roomId,
    roomProfile: "standard_2000_live",
    mapConfiguration: {
      seedId: "sc1_lost_temple_v1",
      elementSelections: [],
      passageSelections: [],
    },
    maxAppliedActions: 180,
    enableSpatialPreexecution: false,
    autoDrive: false,
    attachBot: false,
    issueHumanRecovery: false,
    roomStore,
    refereeCrypto: createStarcraftTmgRefereeCrypto({
      privateKey: privateState.refereePrivateKeyPem,
      publicKey: privateState.refereePublicKeyPem,
      hmacSecret: privateState.refereeHmacSecret,
      keyId: `ticket23-slice248-referee-${runId}`,
      trustLevel: "development_persistent",
    }),
    resumeRoom: true,
    resumeCredentials: privateState.resumeCredentials,
    botDecisionPort: { async decide() {
      throw new Error("FOCUSED_GATE_MUST_NOT_CALL_PROVIDER");
    } },
    player1DecisionPort: { async decide() {
      throw new Error("FOCUSED_GATE_MUST_NOT_CALL_PROVIDER");
    } },
  });
  const state = resetForAssault(aggregate.envelope.state);
  const enumerated = fixture.rulesRuntime.enumerate(state, {
    sideKey: "player1",
    includeDisabled: false,
  });
  const rangedDomains = enumerated.parameterDomains.filter((entry) =>
    entry.sourceRuntimeKind === "ranged"
      && entry.sourceDomain?.parameterKind
        === "official_selected_roster_ranged_target_v1");
  assert(rangedDomains.length > 0,
    "frozen r66 geometry must expose a real Terran ranged domain");
  const domain = rangedDomains[0];
  const targetUnitId = domain.parameterSchema.targetUnitId.enum[0];
  const stateHash = hash(state);
  const legalSpaceHash = hash({ rangedDomains: rangedDomains.map((entry) =>
    entry.domainId), stateHash });
  const bindingHash = aggregate.envelope.matchBindingHash;
  const authority = {
    gameId: "starcraft-tmg",
    roomId: privateState.roomId,
    matchBindingHash: bindingHash,
    stateRevision: 66,
    stateHash,
    legalSpaceHash,
    seatKey: "player1",
    visibilityScope: "player",
    spatialObservationHash: null,
  };
  const analysisRoomStore = {
    async loadRoom() {
      return {
        stateRevision: 66,
        envelope: {
          state,
          stateHash,
          matchBindingHash: bindingHash,
          matchBinding: aggregate.envelope.matchBinding,
        },
      };
    },
  };
  const adapter = createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({
    roomStore: analysisRoomStore,
    rulesRuntime: fixture.rulesRuntime,
    seatKey: "player1",
  });
  const parameters = {
    targetUnitId,
    pointDefenseSourcePieceIds: [],
    pointDefenseRemovedDieIds: [],
  };
  const attack = await adapter.query({
    authority,
    queryKind: "attack_probability",
    arguments: {
      domainId: domain.domainId,
      currentLegalSpaceDomain: domain,
      parameters,
      sampleBudget: 216,
    },
  });
  assert.equal(attack.precision, "advisory_estimate");
  assert.equal(attack.result.domainId, domain.domainId);
  assert.equal(attack.result.targetUnitId, targetUnitId);
  assert(attack.result.outcomes.sampleCount >= 216);
  assert(Number.isFinite(attack.result.outcomes.expectedDamage));
  assert.equal(attack.result.rulesMechanicsPerOutcome, "exact");

  const exchange = await adapter.query({
    authority,
    queryKind: "fire_zone_exchange",
    arguments: {
      currentLegalSpaceDomains: rangedDomains,
      sampleBudgetPerAttack: 72,
      subjectUnitIds: [domain.pieceId],
      targetIds: [targetUnitId],
    },
  });
  assert.equal(exchange.precision, "advisory_estimate");
  assert(exchange.result.alternatives.some((entry) => entry.kind === "hold"));
  assert(exchange.result.alternatives.some((entry) => entry.kind === "attack"));
  assert(exchange.result.alternatives.some((entry) => entry.kind === "retreat"));
  assert(exchange.result.alternatives.some((entry) => entry.kind === "disperse"));

  const scope = {
    gameId: "starcraft-tmg",
    roomId: privateState.roomId,
    matchBindingHash: bindingHash,
    seatKey: "player1",
  };
  const continuity = createStarcraftTmgMatchDecisionContinuityV1();
  const turnPlan = createStarcraftTmgTurnPlanRuntimeV1({
    decisionContinuity: continuity,
    now: () => "2026-09-21T10:00:00.000Z",
  });
  const legal = {
    legalSpaceHash,
    finiteActions: [],
    parameterDomains: [domain],
  };
  const actionSpace = {
    actionSpaceHash: hash({ stateHash, legalSpaceHash }),
    finiteActions: [],
    parameterDomains: [{
      domainId: domain.domainId,
      proposalTemplate: { kind: "parameterized", domainId: domain.domainId },
    }],
  };
  const before = authorityInputs(state, bindingHash, privateState.roomId, 66,
    legal, actionSpace);
  await turnPlan.dispatch({
    ...before,
    scope,
    command: "open_plan",
    plan: {
      objective: "Win the current fire-zone exchange.",
      currentGoal: "Remove the exposed target without losing objective control.",
      strategicApproach: ["Use measured firepower before committing reserves."],
      successSignals: ["Expected exchange remains positive."],
      activationPriorities: [domain.pieceId],
      resourcePolicy: [],
      initiativePolicy: [],
      reservePolicy: [],
      reviseIf: ["the opponent attacks the predicted target"],
      assumptions: [],
      opponentModel: [],
      contingencies: [],
    },
  });
  await turnPlan.dispatch({
    ...before,
    scope,
    command: "reflect_plan",
    assessment: {
      verdict: "continue",
      health: "sound",
      continuitySummary: "The measured attack remains available.",
      currentGoal: "Remove the exposed target without losing objective control.",
      evidenceFor: [attack.result.estimateHash],
      evidenceAgainst: [],
      changedAssumptions: [],
      opponentModelUpdates: [],
      unresolvedRisks: [],
      nextDecisionFocus: "Observe the next opponent action.",
    },
  });
  const actualActor = state.pieces.find((piece) =>
    piece.sideKey === "player2")?.id;
  assert(actualActor, "an opponent unit is required");
  const intent = await turnPlan.dispatch({
    ...before,
    scope,
    command: "create_intent",
    intent: {
      proposal: { kind: "parameterized", domainId: domain.domainId,
        parameters },
      currentGoal: "Remove the exposed target without losing objective control.",
      purpose: "Apply the positive measured exchange.",
      decisionSummary: "Attack before the opponent can improve the fire zone.",
      planContinuity: "Retain the plan while measuring the opponent response.",
      expectedOwnOutcome: "Deal damage and preserve the firing unit.",
      expectedEffects: ["target damage"],
      predictedOpponentResponses: [{
        responseId: "prediction-1",
        actionClass: "ranged_attack",
        opponentAction: "Return fire with the nearest visible ranged unit.",
        likelyActorUnitId: actualActor,
        likelyTargetUnitId: domain.pieceId,
        horizon: { kind: "next_opponent_action", count: 1 },
        confidence: 0.65,
        basis: [attack.result.estimateHash],
        evidenceRefs: [attack.result.estimateHash],
        invalidationCriteria: ["opponent chooses a non-attack action"],
        counterResponse: "Re-evaluate the firing lane.",
        counterPurpose: "Avoid repeating a losing exchange.",
        replanIf: "the actual target or action class differs",
        probabilityEvidenceRef: attack.result.estimateHash,
      }],
      tradeoffs: [{
        benefit: "Immediate damage.",
        cost: "Return-fire exposure.",
        acceptanceReason: "Measured exchange is currently positive.",
      }],
      risks: ["return fire"],
      fallbacks: ["disperse"],
      stopOrReplanTriggers: ["prediction misses"],
      nextDecisionFocus: "Calibrate the opponent prediction.",
      unitIds: [domain.pieceId],
      skillsUsed: ["general-rules"],
      abilitiesIntended: [],
      resourcesIntended: [],
      rejectedAlternatives: [],
      queryReceipts: [],
    },
  });
  const intentId = intent.result.intent.intentId;
  const observedState = structuredClone(state);
  observedState.log = [...(observedState.log || []), {
    id: `log-${(observedState.log || []).length + 1}`,
    round: observedState.round,
    phase: observedState.phase,
    action: {
      actionType: "ranged_attack",
      sideKey: "player2",
      pieceId: actualActor,
      targetId: domain.pieceId,
    },
    events: [],
  }];
  observedState.activeSideKey = "player1";
  const afterStateHash = hash(observedState);
  const afterLegalSpaceHash = hash({ stateHash: afterStateHash,
    domains: [domain.domainId] });
  const afterActionSpaceHash = hash({ afterStateHash, afterLegalSpaceHash });
  const after = authorityInputs(observedState, bindingHash, privateState.roomId,
    67, {
      ...legal,
      legalSpaceHash: afterLegalSpaceHash,
    }, {
      ...actionSpace,
      actionSpaceHash: afterActionSpaceHash,
    });
  const observation = await turnPlan.dispatch({
    ...after,
    scope,
    command: "observe_state",
  });
  assert.equal(observation.result.predictionCalibrations.length, 1);
  assert.equal(observation.result.predictionCalibrations[0].classification,
    "hit");
  const calibrationQuery = await continuity.query({
    scope,
    query: { kinds: ["prediction_calibration"], order: "oldest_first" },
  });
  assert.equal(calibrationQuery.returnedCount, 1);
  assert.equal(calibrationQuery.records[0].payload.intentId, intentId);
  const memory = await continuity.observe({
    scope,
    roomProjection: after.roomProjection,
    legalSpace: after.legalSpace,
  });
  assert.equal(memory.matchMemory.workingMemory.opponentModel
    .predictionCalibrations[0].payload.classification, "hit");

  process.stdout.write(`${JSON.stringify({
    passed: true,
    frozenBaselineRevision: aggregate.stateRevision,
    attackDomainId: domain.domainId,
    attackSampleCount: attack.result.outcomes.sampleCount,
    fireZoneAlternativeKinds: exchange.result.alternatives.map((entry) =>
      entry.kind),
    predictionClassification: observation.result.predictionCalibrations[0]
      .classification,
    providerCalls: 0,
    paidCostCny: 0,
    trainingTruth: false,
  }, null, 2)}\n`);
} finally {
  roomStore.close();
}
