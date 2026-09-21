#!/usr/bin/env node

import assert from "node:assert/strict";

import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgTurnPlanRuntimeV1 } from
  "../packages/online-agent-session/turn-plan-runtime-v1.mjs";

const roomId = "slice265-restored-plan-authority";
const matchBindingHash = hash({ roomId, kind: "match" });
const scope = {
  gameId: "starcraft-tmg",
  roomId,
  matchBindingHash,
  seatKey: "player2",
};
const state = {
  round: 1,
  phase: "movement",
  activeSideKey: "player2",
  firstPlayerSideKey: "player1",
  players: {
    player1: { passedPhases: {} },
    player2: { passedPhases: {} },
  },
  log: [],
};
const stateHash = hash(state);
const legalSpaceHash = hash({ roomId, stateHash, kind: "legal-space" });
const actionSpaceHash = hash({ roomId, stateHash, kind: "action-space" });
const restoredAuthority = {
  stateRevision: 6,
  stateHash,
  round: 1,
  phase: "movement",
  publicLogCursor: 0,
  publicLogHash: hash([]),
};
const continuity = {
  async query() {
    return {
      records: [{
        sequence: 1,
        kind: "turn_plan",
        authority: restoredAuthority,
        payload: {
          planId: "fork-prefix-player2-r6",
          objective: "Contest the western objective lane.",
          currentGoal: "Reassess the next legal deployment.",
          strategicApproach: ["Use mutually supporting units."],
          activationPriorities: ["Swarmling"],
          resourcePolicy: ["Preserve Supply headroom."],
          initiativePolicy: ["Track the first-player marker."],
          reservePolicy: ["Retain a response unit."],
          reviseIf: ["the opponent contests the lane"],
          opponentModel: ["Terran may contest with ranged fire."],
          status: "active",
        },
      }],
    };
  },
  async record() {
    return { ok: true };
  },
};
const runtime = createStarcraftTmgTurnPlanRuntimeV1({
  decisionContinuity: continuity,
  now: () => "2026-09-22T00:00:00.000Z",
});
const inputs = {
  scope,
  roomProjection: {
    room: { roomId, stateRevision: 6, stateHash },
    matchBinding: { bindingHash: matchBindingHash },
    state,
  },
  legalSpace: {
    roomId,
    matchBindingHash,
    stateRevision: 6,
    stateHash,
    legalSpaceHash,
    finiteActions: [],
    parameterDomains: [],
  },
  spatialObservation: { observationHash: hash({ roomId, kind: "observation" }) },
  spatialActionSpace: {
    authority: { stateRevision: 6, stateHash, legalSpaceHash },
    actionSpaceHash,
    finiteActions: [],
    parameterDomains: [],
  },
};

await runtime.hydrate({ scope });
const restored = runtime.read({ scope });
assert.equal(restored.plan.lastValidatedAuthority?.stateHash, stateHash,
  "fork-restored plan must recover authority from its continuity record");
const observed = await runtime.dispatch({
  ...inputs,
  command: "observe_state",
});
assert.equal(observed.result.event, "state_observed");
assert.equal(observed.plan.lastValidatedAuthority.stateHash, stateHash);
assert.equal(observed.reflectionRequired, true);

process.stdout.write(`${JSON.stringify({
  ok: true,
  restoredStateRevision: restored.plan.lastValidatedAuthority.stateRevision,
  restoredStateHash: restored.plan.lastValidatedAuthority.stateHash,
  providerCalls: 0,
  trainingTruth: false,
}, null, 2)}\n`);
