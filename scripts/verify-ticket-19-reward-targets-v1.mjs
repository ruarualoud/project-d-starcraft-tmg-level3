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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root,
  "build/ticket-19-slice-197-reward-targets-v1");
const ATOM_ID = "ticket19.test.authoritative-d6-terminal";
const EXECUTOR_ID = "ticket19.test.d6-terminal-executor";

function testRuntime() {
  const core = {
    schema: "starcraft_tmg_official_executable_rule_runtime_v1",
    mode: "official_executable_catalogue",
    runtimeId: "ticket19-s197-rule-fact-runtime",
    runtimeVersion: "1.0.0",
    gameId: "starcraft-tmg",
    rulesVersion: "ticket19-s197-test-rules-v1",
    catalogueHash: hashStarcraftTmgContract({ atom: ATOM_ID }),
    executorManifest: [{
      executorId: EXECUTOR_ID,
      executorVersion: "1.0.0",
      actionTypes: ["ticket19_test_roll"],
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
    descriptor: Object.freeze({
      ...core,
      runtimeHash: hashStarcraftTmgContract(core),
    }),
    enumerate(state, options = {}) {
      const sideKey = options.sideKey || state.activeSideKey;
      return {
        stateSummary: { phase: state.phase },
        terminal: state.terminal ? { terminal: true } : null,
        candidates: state.terminal ? [] : [{
          actionType: "ticket19_test_roll",
          sideKey,
          ruleAtomIds: [ATOM_ID],
          executorId: EXECUTOR_ID,
          executorVersion: "1.0.0",
          chance: {
            kind: "fixed_roll_sequence",
            faces: 6,
            count: 1,
            layout: { charge: 1 },
          },
          isEnabled: sideKey === state.activeSideKey,
        }],
        parameterDomains: [],
      };
    },
    apply(inputState, action, options = {}) {
      const state = structuredClone(inputState);
      const roll = options.chanceReveals?.[0]?.outcome;
      assert.ok(Number.isSafeInteger(roll));
      const turn = Number(state.ticket19TestTurn || 0) + 1;
      state.ticket19TestTurn = turn;
      const event = {
        type: "ticket19_test_roll_resolved",
        sideKey: action.sideKey,
        roll,
        turn,
      };
      if (turn === 1) {
        state.activeSideKey = "player2";
      } else {
        state.scores = { player1: 1, player2: 0 };
        state.terminal = true;
        state.gameOver = true;
        state.winner = "player1";
        state.terminalReason = "ticket19_two_roll_fixture_complete";
      }
      state.log = [...(state.log || []), {
        id: `ticket19-log-${turn}`,
        round: state.round,
        phase: state.phase,
        action: structuredClone(action),
        events: [event],
      }];
      return { ok: true, state, events: [event] };
    },
  });
}

function authorityFor(engine, envelope, seatKey) {
  const authority = engine.issueSeatAuthority({
    grantId: `ticket19-${seatKey}`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey,
    roleMode: "supervisor",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  return {
    authority,
    lease: engine.issueControlLease({
      seatAuthority: authority,
      sessionId: `ticket19-${seatKey}-session`,
      leaseFence: 1,
      issuedAtRoomRevision: 0,
    }),
  };
}

function applyOne(engine, envelope, credentials, idempotencyKey) {
  const legal = engine.legalSpace(envelope, {
    seatAuthority: credentials.authority,
  });
  const selected = legal.finiteActions[0];
  assert.ok(selected);
  const preview = engine.preview({
    envelope,
    seatAuthority: credentials.authority,
    proposal: { kind: "finite", actionKey: selected.actionKey },
  });
  assert.equal(preview.ok, true);
  const confirmed = engine.confirmPreview({
    envelope,
    preview: preview.preview,
    seatAuthority: credentials.authority,
  });
  assert.equal(confirmed.ok, true);
  const applied = engine.apply({
    envelope,
    expectedStateRevision: envelope.stateRevision,
    preview: preview.preview,
    confirmation: confirmed.confirmation,
    seatAuthority: credentials.authority,
    controlLease: credentials.lease,
    idempotencyKey,
  });
  assert.equal(applied.ok, true, JSON.stringify(applied));
  return applied;
}

const engine = createStarcraftTmgAuthoritativeEngine({
  rulesRuntime: testRuntime(),
});
const initialEnvelope = engine.createEnvelope({
  roomId: "ticket19-s197-reward-room",
  dataVersion: "ticket19-s197-data-v1",
  state: {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 1,
    phase: "combat",
    activeSideKey: "player1",
    firstPlayerSideKey: "player1",
    players: {
      player1: { sideKey: "player1", passedPhases: {} },
      player2: { sideKey: "player2", passedPhases: {} },
    },
    scores: { player1: 0, player2: 0 },
    board: { widthInches: 54, heightInches: 36 },
    cardResources: { player1: [], player2: [] },
    pieces: [],
    log: [],
  },
});
const player1 = authorityFor(engine, initialEnvelope, "player1");
const player2 = authorityFor(engine, initialEnvelope, "player2");
const first = applyOne(engine, initialEnvelope, player1,
  "ticket19-s197-first");
const second = applyOne(engine, first.envelope, player2,
  "ticket19-s197-second");

const roomStore = {
  async loadReplayBundle() {
    return {
      initialEnvelope,
      privateJournal: [first.receipt, second.receipt].map((receipt, index) => ({
        sequence: index + 1,
        payload: {
          type: "accepted_transition",
          payload: { receipt },
        },
      })),
      currentAggregate: { envelope: second.envelope },
    };
  },
};
const compiler = createStarcraftTmgPlayerViewTrajectoryCompilerV1({
  authorityEngine: engine,
  roomStore,
});
const trajectory = await compiler.compile({
  roomId: initialEnvelope.roomId,
  episodeId: "ticket19-s197-reward-episode",
});
const [firstStep, secondStep] = trajectory.steps;

assert.equal(trajectory.terminal.terminal, true);
assert.equal(trajectory.terminal.winnerSeat, "player1");
assert.equal(firstStep.targets.valueTarget, 1);
assert.equal(secondStep.targets.valueTarget, -1);
assert.equal(firstStep.targets.rewardVector.terminalWinLoss, 0);
assert.equal(secondStep.targets.rewardVector.terminalWinLoss, -1);
assert.equal(secondStep.targets.rewardVector.officialScoreDelta, -1);
assert.equal(secondStep.targets.rewardVector.missionControlDelta, null);
assert.equal(secondStep.targets.scalarReward, -1.1);
assert.equal(firstStep.discount, 1);
assert.equal(secondStep.discount, 0);
assert.equal(firstStep.isTerminal, false);
assert.equal(secondStep.isTerminal, true);
for (const step of trajectory.steps) {
  assert.equal(step.targets.chance.used, true);
  assert.equal(step.targets.chance.revealCount, 1);
  assert.equal(step.targets.chance.outcomes.length, 1);
  assert.equal(step.targets.chance.availableOnlyAfterAction, true);
  assert.equal(JSON.stringify(step.actorInput).includes('"outcome"'), false);
}

const report = {
  schemaVersion: "starcraft_tmg_ticket_19_slice_197_report_v1",
  ticket: 19,
  slice: 197,
  status: "passed",
  trajectoryHash: trajectory.contentIdentity.hash,
  stepCount: trajectory.steps.length,
  reward: {
    vectorVersion: secondStep.targets.rewardVector.schemaVersion,
    scalarizationVersion: secondStep.targets.scalarization.schemaVersion,
    player1ValueFromPlayer1Step: firstStep.targets.valueTarget,
    player1ValueFromPlayer2Step: secondStep.targets.valueTarget,
    lastActorTerminalReward: secondStep.targets.rewardVector.terminalWinLoss,
    unavailableMissionFact: secondStep.targets.rewardVector.missionControlDelta,
  },
  chance: {
    signedReceiptSteps: trajectory.steps.filter((step) =>
      step.targets.chance.used).length,
    outcomesInActorInput: 0,
    outcomesInPostActionTargets: 2,
  },
  checks: {
    rulesFactsOnly: true,
    llmEvaluationUsed: false,
    unavailableIsNull: true,
    terminalValueUsesEachStepToPlay: true,
    terminalDiscountZero: true,
    chanceReceiptBoundAfterAction: true,
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
