#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  inspectStarcraftTmgFormationThreatClaimsV1,
  STARCRAFT_TMG_MAX_SEMANTIC_CORRECTION_ROUNDS_PER_CHOICE,
} from "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { createStarcraftTmgHostedBotSeatRuntimeV1 } from
  "../packages/online-agent-session/hosted-bot-seat-runtime-v1.mjs";

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

function inspect(raw, publicReason = "Rules-checked complete formation.") {
  return inspectStarcraftTmgFormationThreatClaimsV1({
    raw,
    selection: { publicReason },
    option,
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
  semanticCorrectionLimit:
    STARCRAFT_TMG_MAX_SEMANTIC_CORRECTION_ROUNDS_PER_CHOICE,
  rejectionSeverity: rejectedDrive.findingSeverity,
  rejectionLifecycle: rejectedDrive.projection.lifecycle,
  rejectedDecisionCalls,
  providerCalls: 0,
  paidCostCny: 0,
}, null, 2));
