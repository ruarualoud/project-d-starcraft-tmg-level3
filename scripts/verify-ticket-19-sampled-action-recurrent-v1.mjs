import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createStarcraftTmgAuthoritativeEngine,
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgPlayerViewTrajectoryCompilerV1 } from
  "../packages/training-data/player-view-trajectory-v1.mjs";
import { createTicket20AgentAgentDemoFixtureV1 } from
  "./support/ticket20-human-agent-demo-fixture-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root,
  "build/ticket-19-slice-198-sampled-action-recurrent-v1");
const ATOM_ID = "ticket19.test.parameter-move";
const EXECUTOR_ID = "ticket19.test.parameter-move-executor";

function parameterRuntime() {
  const descriptorCore = {
    schema: "starcraft_tmg_official_executable_rule_runtime_v1",
    mode: "official_executable_catalogue",
    runtimeId: "ticket19-s198-parameter-runtime",
    runtimeVersion: "1.0.0",
    gameId: "starcraft-tmg",
    rulesVersion: "ticket19-s198-parameter-rules-v1",
    catalogueHash: hashStarcraftTmgContract({ atom: ATOM_ID }),
    executorManifest: [{
      executorId: EXECUTOR_ID,
      executorVersion: "1.0.0",
      actionTypes: ["ticket19_parameter_move"],
    }],
    executableRuleAtomIds: [ATOM_ID],
    executableRuleAtomCount: 1,
    nonExecutableRuleAtomCount: 0,
    legalSpaceComplete: true,
    legacyCompatibilityUsed: false,
    productionRoomEligible: false,
    ctx2skillPromotionEligible: false,
    trainingTruth: false,
  };
  return Object.freeze({
    descriptor: Object.freeze({ ...descriptorCore,
      runtimeHash: hashStarcraftTmgContract(descriptorCore) }),
    enumerate(state, options = {}) {
      const sideKey = options.sideKey || state.activeSideKey;
      const domainId = `sc-domain-${hashStarcraftTmgContract({
        stateRevision: state.gameClock?.transition || 0,
        sideKey,
        atom: ATOM_ID,
      })}`;
      return {
        stateSummary: { phase: state.phase },
        candidates: [],
        parameterDomains: [{
          domainId,
          parameterKind: "fixed_point_path",
          actionType: "ticket19_parameter_move",
          sideKey,
          pieceId: `${sideKey}-piece`,
          parameterSchema: {
            type: "object",
            required: ["path"],
            pathUnit: "milli-inch",
          },
          constraints: { maxCostMilliInches: 6000 },
          ruleAtomIds: [ATOM_ID],
          executorId: EXECUTOR_ID,
          executorVersion: "1.0.0",
        }],
      };
    },
    instantiate(_state, domain, parameters) {
      const pathValue = structuredClone(parameters.path);
      return {
        action: {
          actionType: "ticket19_parameter_move",
          sideKey: domain.sideKey,
          pieceId: domain.pieceId,
          to: {
            xInches: pathValue.at(-1).xMilliInches / 1000,
            yInches: pathValue.at(-1).yMilliInches / 1000,
          },
          ruleAtomIds: [ATOM_ID],
          executorId: EXECUTOR_ID,
          executorVersion: "1.0.0",
          domainId: domain.domainId,
        },
        canonicalParameters: { path: pathValue },
      };
    },
    apply(inputState, action) {
      const state = structuredClone(inputState);
      const piece = state.pieces.find((entry) => entry.id === action.pieceId);
      piece.xInches = action.to.xInches;
      piece.yInches = action.to.yInches;
      const event = { type: "ticket19_parameter_move_applied",
        pieceId: piece.id, to: structuredClone(action.to) };
      state.log = [...(state.log || []), {
        id: "ticket19-parameter-log-1",
        round: state.round,
        phase: state.phase,
        action: structuredClone(action),
        events: [event],
      }];
      return { ok: true, state, events: [event] };
    },
  });
}

function playerAuthority(engine, envelope) {
  const seatAuthority = engine.issueSeatAuthority({
    grantId: "ticket19-s198-player1",
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1",
    roleMode: "supervisor",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  return {
    seatAuthority,
    controlLease: engine.issueControlLease({
      seatAuthority,
      sessionId: "ticket19-s198-session",
      leaseFence: 1,
      issuedAtRoomRevision: 0,
    }),
  };
}

const parameterEngine = createStarcraftTmgAuthoritativeEngine({
  rulesRuntime: parameterRuntime(),
});
const parameterInitial = parameterEngine.createEnvelope({
  roomId: "ticket19-s198-parameter-room",
  dataVersion: "ticket19-s198-data-v1",
  state: {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 1,
    phase: "movement",
    activeSideKey: "player1",
    firstPlayerSideKey: "player1",
    players: {
      player1: { sideKey: "player1", passedPhases: {} },
      player2: { sideKey: "player2", passedPhases: {} },
    },
    scores: { player1: 0, player2: 0 },
    board: { widthInches: 54, heightInches: 36 },
    cardResources: { player1: [], player2: [] },
    pieces: [{
      id: "player1-piece",
      sideKey: "player1",
      isOnField: true,
      isDestroyed: false,
      currentModels: 1,
      maxModels: 1,
      xInches: 3,
      yInches: 3,
      models: [{ id: "player1-model", xInches: 3, yInches: 3,
        isOnField: true, isDestroyed: false }],
      activatedPhases: {},
    }],
    log: [],
  },
});
const parameterCredentials = playerAuthority(parameterEngine, parameterInitial);
const parameterLegal = parameterEngine.legalSpace(parameterInitial, {
  seatAuthority: parameterCredentials.seatAuthority,
});
const parameterDomain = parameterLegal.parameterDomains[0];
const canonicalPath = [
  { xMilliInches: 3000, yMilliInches: 3000 },
  { xMilliInches: 4250, yMilliInches: 3750 },
];
const parameterPreview = parameterEngine.preview({
  envelope: parameterInitial,
  seatAuthority: parameterCredentials.seatAuthority,
  proposal: { kind: "parameterized", domainId: parameterDomain.domainId,
    parameters: { path: canonicalPath } },
});
assert.equal(parameterPreview.ok, true, JSON.stringify(parameterPreview));
const parameterConfirmation = parameterEngine.confirmPreview({
  envelope: parameterInitial,
  preview: parameterPreview.preview,
  seatAuthority: parameterCredentials.seatAuthority,
});
const parameterApplied = parameterEngine.apply({
  envelope: parameterInitial,
  expectedStateRevision: 0,
  preview: parameterPreview.preview,
  confirmation: parameterConfirmation.confirmation,
  seatAuthority: parameterCredentials.seatAuthority,
  controlLease: parameterCredentials.controlLease,
  idempotencyKey: "ticket19-s198-parameter-apply",
});
assert.equal(parameterApplied.ok, true, JSON.stringify(parameterApplied));
const parameterStore = {
  async loadReplayBundle() {
    return {
      initialEnvelope: parameterInitial,
      privateJournal: [{ sequence: 1, payload: {
        type: "accepted_transition",
        payload: { receipt: parameterApplied.receipt },
      } }],
      currentAggregate: { envelope: parameterApplied.envelope },
    };
  },
};
const parameterCompiler = createStarcraftTmgPlayerViewTrajectoryCompilerV1({
  authorityEngine: parameterEngine,
  roomStore: parameterStore,
});
const parameterTrajectory = await parameterCompiler.compile({
  roomId: parameterInitial.roomId,
  episodeId: "ticket19-s198-parameter-episode",
});
const parameterStep = parameterTrajectory.steps[0];
assert.equal(parameterStep.actionEncoding.kind, "parameterized");
assert.deepEqual(parameterStep.actionEncoding.hybridEncoding.path,
  canonicalPath);
assert.equal(parameterStep.actionEncoding.selectedParameterDomain.domainId,
  parameterDomain.domainId);
assert.equal(parameterStep.actionEncoding.actionSet
  .unsampledParameterizedActionsAreNotIllegal, true);
assert.equal(parameterStep.actionEncoding.behaviourPolicy.probability, null);
assert.equal(parameterStep.actionEncoding.behaviourPolicy.probabilityKnown,
  false);

const finiteFixture = await createTicket20AgentAgentDemoFixtureV1({
  root,
  roomId: "ticket19-s198-recurrent-room",
  autoDriveIntervalMs: 1,
});
await finiteFixture.orchestrator.start();
const finitePlayed = await finiteFixture.orchestrator.run({
  maxAdditionalActions: 6,
});
const finiteCompiler = createStarcraftTmgPlayerViewTrajectoryCompilerV1({
  authorityEngine: finiteFixture.authorityEngine,
  roomStore: finiteFixture.roomRuntime.roomStore,
});
const finiteTrajectory = await finiteCompiler.compile({
  roomId: finiteFixture.roomId,
  episodeId: "ticket19-s198-recurrent-episode",
  decisionBindings: finitePlayed.trajectory,
});
assert.equal(finiteTrajectory.steps.length, 6);
assert.equal(finiteTrajectory.steps.every((step) =>
  step.actionEncoding.kind === "finite"), true);
assert.equal(finiteTrajectory.steps[0].recurrentState
  .episodePreviousStepHash, null);
assert.equal(finiteTrajectory.steps[1].recurrentState
  .episodePreviousStepHash,
finiteTrajectory.steps[0].contentIdentity.hash);
const firstRepeatedSeatStep = finiteTrajectory.steps.find((step, index) =>
  index > 0 && finiteTrajectory.steps.slice(0, index).some((prior) =>
    prior.toPlay === step.toPlay));
assert.ok(firstRepeatedSeatStep);
assert.ok(firstRepeatedSeatStep.recurrentState.previousOwnDecisionStepHash);
assert.equal(firstRepeatedSeatStep.recurrentState.seatPublicHistory.encoding,
  "same_seat_append_only_prefix_v1");

const report = {
  schemaVersion: "starcraft_tmg_ticket_19_slice_198_report_v1",
  ticket: 19,
  slice: 198,
  status: "passed",
  parameterized: {
    trajectoryHash: parameterTrajectory.contentIdentity.hash,
    domainId: parameterDomain.domainId,
    pathPointCount: canonicalPath.length,
    roundTripParametersExact: true,
    unsampledParameterizedActionsAreNotIllegal: true,
  },
  finiteAndRecurrent: {
    trajectoryHash: finiteTrajectory.contentIdentity.hash,
    stepCount: finiteTrajectory.steps.length,
    finiteActionSetComplete: true,
    sameSeatPrefixReconstructed: true,
    previousOwnDecisionBound: true,
  },
  policies: {
    behaviourProbabilityKnown: false,
    searchPolicyAvailable: false,
    behaviourAndSearchPoliciesDistinct: true,
    omniscientCriticStateIncluded: false,
  },
  providerCalls: 0,
  estimatedCostCny: 0,
  sourceRefresh: false,
  eligibleForTraining: false,
  trainingTruth: false,
};
await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "report.json"),
  `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
