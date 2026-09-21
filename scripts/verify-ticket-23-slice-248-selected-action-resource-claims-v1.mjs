#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  inspectStarcraftTmgSelectedActionResourceClaimsV1,
} from "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { projectStarcraftTmgSpatialParameterDomainsV1 } from
  "../packages/online-agent-session/spatial-action-query-runtime-v1.mjs";

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
    {
      domainId: "field-repair-domain",
      actionType: "resolve_characteristic_status_ability",
      pieceId: "player1-goliath",
      abilityName: "Field Repair",
      effectKind: "fixed_heal",
      sourceKind: "card_feature",
      sourceInstanceId: "player1-tactical-2",
      constraints: {
        strategicImmediateValue: {
          kind: "heal", effectiveHeal: 0, zeroBenefit: true,
        },
        resourceCostsByChoice: { default: {
          resourceType: null,
          printedResourceCost: 0,
          resourceCostReduction: 0,
          effectiveResourceCost: 0,
        } },
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

const falseNoExhaustion = inspectStarcraftTmgSelectedActionResourceClaimsV1({
  spatialActionSpace: actionSpace,
  candidateId: "field-repair-domain",
  stage: "planning",
  value: {
    assessment: { currentGoal:
      "Use Field Repair at no source card exhaustion." },
    publicPlanSummary: {
      plan: "Heal without exhausting the source card.",
      purpose: "Keep every card ready.",
    },
  },
});
assert.equal(falseNoExhaustion.status, "contradicted");
assert.equal(falseNoExhaustion.resourceContract.sourceCardExhaustedOnCommit,
  true);
assert(falseNoExhaustion.contradictions.some((entry) =>
  entry.claimKind === "source_card_exhaustion"));

const projectedOmegaActionSpace = {
  finiteActions: [],
  parameterDomains: projectStarcraftTmgSpatialParameterDomainsV1({
    parameterDomains: [{
      domainId: "omega-network-domain",
      actionType: "use_active_ability",
      pieceId: "player2-swarmling",
      abilityName: "Omega Network",
      effectKind: "omega_network",
      constraints: {
        sourceCardInstanceId: "player2-tactical-omega",
        resourceCostsByChoice: { default: {
          resourceType: null,
          printedResourceCost: 0,
          resourceCostReduction: 0,
          effectiveResourceCost: 0,
        } },
      },
    }],
  }),
};
const omegaFalseNoExhaustion =
  inspectStarcraftTmgSelectedActionResourceClaimsV1({
    spatialActionSpace: projectedOmegaActionSpace,
    candidateId: "omega-network-domain",
    stage: "action",
    value: {
      selectedReason:
        "Use Omega Network at zero cost; the source card is not exhausted.",
      intent: {
        currentGoal: "Use Omega Network without exhausting its source card.",
        purpose: "Keep the source card ready after placing the Omega Worm.",
      },
    },
  });
assert.equal(omegaFalseNoExhaustion.status, "contradicted");
assert.equal(omegaFalseNoExhaustion.resourceContract
  .sourceCardExhaustedOnCommit, true);
assert.equal(omegaFalseNoExhaustion.resourceContract.sourceInstanceId,
  "player2-tactical-omega");

console.log(JSON.stringify({
  passed: true,
  driftedStatus: drifted.status,
  driftedContradictionCount: drifted.contradictions.length,
  effectiveBiomassCost: drifted.resourceContract.costs[0].effectiveResourceCost,
  correctedStatus: corrected.status,
  supplyOnlyStatus: supplyOnly.status,
  sourceCardExhaustionStatus: falseNoExhaustion.status,
  projectedOmegaSourceCardExhaustionStatus: omegaFalseNoExhaustion.status,
  providerCalls: 0,
  paidCostCny: 0,
}, null, 2));
