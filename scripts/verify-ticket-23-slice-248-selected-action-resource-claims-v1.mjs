#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  inspectStarcraftTmgSelectedActionResourceClaimsV1,
} from "../packages/online-agent-session/live-flash-decision-port-v1.mjs";

const actionSpace = {
  finiteActions: [],
  parameterDomains: [
    {
      domainId: "glial-domain",
      actionType: "resolve_battlefield_asset_ability",
      pieceId: "player2-vile",
      abilityName: "Glial Reconstitution",
      effectKind: "on_creep_speed_active",
      sourceKind: "unit_feature",
      sourceInstanceId: "player2-vile",
      constraints: {
        resourceCostsByChoice: {
          default: {
            resourceType: "BM",
            printedResourceCost: 1,
            resourceCostReduction: 0,
            effectiveResourceCost: 1,
          },
        },
      },
    },
  ],
};

const drifted = inspectStarcraftTmgSelectedActionResourceClaimsV1({
  spatialActionSpace: actionSpace,
  candidateId: "glial-domain",
  stage: "action",
  value: {
    selectedReason:
      "Glial Reconstitution is a zero-Biomass, zero-Supply value play.",
    intent: {
      currentGoal: "Use Glial Reconstitution now.",
      purpose: "Gain Speed on Creep without spending Biomass.",
      resourcesIntended: ["No Biomass is spent by this candidate."],
    },
    publicDecisionSummary: {
      plan: "Use Glial Reconstitution at zero Biomass cost.",
      purpose: "Preserve all Biomass.",
    },
  },
});
assert.equal(drifted.status, "contradicted");
assert.equal(drifted.resourceContract.costs[0].effectiveResourceCost, 1);
assert.ok(drifted.contradictions.length >= 3);
assert.ok(drifted.contradictions.every((entry) => entry.resourceType === "BM"));

const corrected = inspectStarcraftTmgSelectedActionResourceClaimsV1({
  spatialActionSpace: actionSpace,
  candidateId: "glial-domain",
  stage: "action",
  value: {
    selectedReason:
      "Use Glial Reconstitution and pay 1 Biomass while spending zero Supply.",
    intent: {
      currentGoal: "Use Glial Reconstitution now.",
      purpose: "Pay 1 BM to gain Speed on Creep.",
      resourcesIntended: ["Exhaust one Biomass-producing card."],
    },
    publicDecisionSummary: {
      plan: "Spend 1 Biomass on Glial Reconstitution.",
      purpose: "Gain Speed without committing additional Supply.",
    },
  },
});
assert.equal(corrected.status, "consistent");
assert.equal(corrected.contradictions.length, 0);

const supplyOnly = inspectStarcraftTmgSelectedActionResourceClaimsV1({
  spatialActionSpace: actionSpace,
  candidateId: "glial-domain",
  stage: "planning",
  value: {
    assessment: {
      currentGoal:
        "Use Glial Reconstitution for 1 Biomass and zero additional Supply.",
    },
    publicPlanSummary: {
      plan: "Pay 1 BM for Glial Reconstitution; deploy no new unit.",
      purpose: "Keep Supply available for round 3.",
    },
  },
});
assert.equal(supplyOnly.status, "consistent",
  "zero Supply is not a false claim about the exact Biomass cost");

console.log(JSON.stringify({
  passed: true,
  driftedStatus: drifted.status,
  driftedContradictionCount: drifted.contradictions.length,
  effectiveBiomassCost: drifted.resourceContract.costs[0].effectiveResourceCost,
  correctedStatus: corrected.status,
  supplyOnlyStatus: supplyOnly.status,
  providerCalls: 0,
  paidCostCny: 0,
}, null, 2));
