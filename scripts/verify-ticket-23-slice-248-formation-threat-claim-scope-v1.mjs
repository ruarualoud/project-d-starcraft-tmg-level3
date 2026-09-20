#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  inspectStarcraftTmgFormationThreatClaimsV1,
  STARCRAFT_TMG_MAX_SEMANTIC_CORRECTION_ROUNDS_PER_CHOICE,
} from "../packages/online-agent-session/live-flash-decision-port-v1.mjs";

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

assert.equal(STARCRAFT_TMG_MAX_SEMANTIC_CORRECTION_ROUNDS_PER_CHOICE, 3,
  "one decision cannot reopen more than three semantic correction rounds");

console.log(JSON.stringify({
  passed: true,
  aspirationCheckedClaims: aspirationOnly.checkedClaimCount,
  falseOutcomeFields: falseOutcome.contradictions.map((entry) => entry.field),
  correctedOutcomeCheckedClaims: correctedOutcome.checkedClaimCount,
  semanticCorrectionLimit:
    STARCRAFT_TMG_MAX_SEMANTIC_CORRECTION_ROUNDS_PER_CHOICE,
  providerCalls: 0,
  paidCostCny: 0,
}, null, 2));
