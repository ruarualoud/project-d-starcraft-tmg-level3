#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  inspectStarcraftTmgSelectedActionIdentityClaimsV1,
} from "../packages/online-agent-session/live-flash-decision-port-v1.mjs";

const actionSpace = {
  finiteActions: [],
  parameterDomains: [
    {
      domainId: "creep-spread-domain",
      actionType: "resolve_battlefield_asset_ability",
      pieceId: "player2-raptor",
      abilityName: "Creep Spread",
      effectKind: "creep_token_place",
      sourceInstanceId: "player2-tactical-2",
    },
    {
      domainId: "ventral-sacs-domain",
      actionType: "resolve_battlefield_asset_ability",
      pieceId: "player2-raptor",
      abilityName: "Ventral Sacs",
      effectKind: "reserve_deploy_indicator",
      sourceInstanceId: "player2-tactical-4",
    },
  ],
};

const drifted = inspectStarcraftTmgSelectedActionIdentityClaimsV1({
  spatialActionSpace: actionSpace,
  candidateId: "ventral-sacs-domain",
  stage: "action",
  value: {
    selectedReason:
      "Select Raptor's Creep Spread (Ventral Sacs battlefield-asset family plan).",
    intent: {
      currentGoal: "Use Raptor's Creep Spread to extend the Creep network.",
      purpose: "Place another Creep Tumor near marker-4.",
    },
    publicDecisionSummary: {
      plan: "Use Creep Spread to place a Creep Tumor.",
      purpose: "Extend the Creep network.",
    },
    assetPlacementSelection: {
      publicReason: "Place the Creep Tumor near marker-4.",
    },
  },
});
assert.equal(drifted.status, "contradicted");
assert.equal(drifted.selectedIdentity.abilityName, "Ventral Sacs");
assert.ok(drifted.contradictions.some((entry) =>
  entry.claimedAbilityName === "Creep Spread"));

const corrected = inspectStarcraftTmgSelectedActionIdentityClaimsV1({
  spatialActionSpace: actionSpace,
  candidateId: "ventral-sacs-domain",
  stage: "action",
  value: {
    selectedReason:
      "Use Raptor's Ventral Sacs to place the reserve-deploy beacon.",
    intent: {
      currentGoal: "Use Ventral Sacs to prepare a later reserve deploy.",
      purpose: "Create a legal reserve-deploy beacon near marker-4.",
    },
    publicDecisionSummary: {
      plan: "Use Ventral Sacs; Creep Spread was already used this round.",
      purpose: "Preserve the reserve deployment route.",
    },
    assetPlacementSelection: {
      publicReason: "Place the reserve-deploy beacon near marker-4.",
    },
  },
});
assert.equal(corrected.status, "consistent");
assert.equal(corrected.selectedIdentityMentioned, true);
assert.equal(corrected.contradictions.length, 0);

const rejectedAlternativeOnly =
  inspectStarcraftTmgSelectedActionIdentityClaimsV1({
    spatialActionSpace: actionSpace,
    candidateId: "ventral-sacs-domain",
    stage: "action",
    value: {
      selectedReason: "Use Ventral Sacs to open a reserve route.",
      intent: {
        currentGoal: "Activate Ventral Sacs now.",
        purpose: "Create a reserve-deploy beacon.",
      },
      publicDecisionSummary: {
        plan: "Use Ventral Sacs for reserve deployment.",
        purpose: "Do not use Creep Spread again; its card is exhausted.",
      },
      rejectedAlternatives: [{
        candidateId: "creep-spread-domain",
        reason: "Creep Spread is already exhausted.",
      }],
    },
  });
assert.equal(rejectedAlternativeOnly.status, "consistent");

console.log(JSON.stringify({
  passed: true,
  driftedStatus: drifted.status,
  driftedContradictionCount: drifted.contradictions.length,
  correctedStatus: corrected.status,
  rejectedAlternativeStatus: rejectedAlternativeOnly.status,
  providerCalls: 0,
  paidCostCny: 0,
}, null, 2));
