#!/usr/bin/env node

import assert from "node:assert/strict";

import { settleOfficialAlternatingPhaseAfterActivationV1 } from
  "../packages/rule-atoms/official-activation-pass-executor-v1.mjs";

const state = {
  round: 1,
  phase: "movement",
  firstPlayerSideKey: "player1",
  activeSideKey: "player2",
  players: {
    player1: { sideKey: "player1", passedPhases: { movement: true } },
    player2: { sideKey: "player2", passedPhases: {} },
  },
  pieces: [{
    id: "p1-finished",
    sideKey: "player1",
    isOnField: true,
    isDestroyed: false,
    currentModels: 1,
    activatedPhases: { movement: true, assault: false, combat: false },
  }, {
    id: "p2-finished",
    sideKey: "player2",
    isOnField: true,
    isDestroyed: false,
    currentModels: 1,
    activatedPhases: { movement: true, assault: false, combat: false },
  }],
};

const result = settleOfficialAlternatingPhaseAfterActivationV1(state, {
  phase: "movement",
  actingSideKey: "player2",
});
assert.equal(result.phaseCompleted, true);
assert.equal(result.state.phase, "assault");
assert.equal(result.state.activeSideKey, "player1");
assert(result.events.some((event) => event.type === "phase_advanced"));

process.stdout.write(`${JSON.stringify({
  schema: "ticket23_slice248_phase_pass_completion_repair_v1",
  ok: true,
  nextPhase: result.state.phase,
  nextActiveSideKey: result.state.activeSideKey,
  providerCalls: 0,
  trainingTruth: false,
}, null, 2)}\n`);
