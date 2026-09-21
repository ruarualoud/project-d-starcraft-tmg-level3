#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  inspectStarcraftTmgSelectedActionIdentityClaimsV1,
} from "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { projectStarcraftTmgSpatialParameterDomainsV1 } from
  "../packages/online-agent-session/spatial-action-query-runtime-v1.mjs";

const legalSpace = {
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
    {
      domainId: "omega-network-domain",
      actionType: "use_active_ability",
      pieceId: "player2-raptor",
      abilityName: "Omega Network",
      effectKind: "omega_network",
      effectContract: {
        schema: "starcraft_tmg_selected_action_effect_contract_v1",
        effectKind: "omega_network",
        abilityName: "Omega Network",
        sourceText:
          "Set an Omega Worm on ground level more than 10 inches from Enemy models; its base is an Entry Edge.",
        targetKind: "ground_place",
        resultAssetKind: "omega_worm",
      },
    },
  ],
};
const actionSpace = {
  finiteActions: [],
  parameterDomains: projectStarcraftTmgSpatialParameterDomainsV1(legalSpace),
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

const effectDriftOnly = inspectStarcraftTmgSelectedActionIdentityClaimsV1({
  spatialActionSpace: actionSpace,
  candidateId: "ventral-sacs-domain",
  stage: "action",
  value: {
    selectedReason:
      "Use Raptor's Ventral Sacs to extend the Creep network.",
    intent: {
      currentGoal: "Activate Ventral Sacs and place a Creep Tumor.",
      purpose: "Build an ON CREEP speed lane near marker-4.",
    },
    publicDecisionSummary: {
      plan: "Use Ventral Sacs for another Creep token.",
      purpose: "Extend the Creep network for Speed on Creep.",
    },
    assetPlacementSelection: {
      publicReason: "Place the Creep Tumor near marker-4.",
    },
  },
});
assert.equal(effectDriftOnly.status, "contradicted");
assert.ok(effectDriftOnly.contradictions.some((entry) =>
  entry.expectedEffectKind === "reserve_deploy_indicator"
    && entry.claimedEffectKind === "creep_token_place"));

const omegaEffectDrift = inspectStarcraftTmgSelectedActionIdentityClaimsV1({
  spatialActionSpace: actionSpace,
  candidateId: "omega-network-domain",
  stage: "action",
  value: {
    selectedReason:
      "Use Omega Network to place a Faction Indicator for reserve deployment.",
    intent: {
      currentGoal: "Activate Omega Network and place the reserve-deploy beacon.",
      purpose: "At End of Round deploy a Ground Unit from Reserves by the indicator.",
    },
    publicDecisionSummary: {
      plan: "Use Omega Network for the reserve-deploy route.",
      purpose: "Create a Faction Indicator.",
    },
  },
});
assert.equal(omegaEffectDrift.status, "contradicted");
assert.equal(omegaEffectDrift.selectedIdentity.effectContract.resultAssetKind,
  "omega_worm");
assert.ok(omegaEffectDrift.contradictions.some((entry) =>
  entry.expectedEffectKind === "omega_network"
    && entry.claimedEffectKind === "reserve_deploy_indicator"));

const omegaCorrectContractLanguage =
  inspectStarcraftTmgSelectedActionIdentityClaimsV1({
    spatialActionSpace: actionSpace,
    candidateId: "omega-network-domain",
    stage: "planning",
    value: {
      plan: {
        currentGoal:
          "Use the Swarmling's Omega Network active ability to set an Omega Worm.",
      },
      publicPlanSummary: {
        plan:
          "Activate Omega Network to set a friendly Omega Worm Unit on Ground Level more than 10 inches from every enemy model.",
        purpose:
          "Establish a non-contesting Structure and Source of Creep plus a future reserve Entry Edge. This is not a creep token placement and not a reserve-deploy faction indicator.",
      },
    },
  });
assert.equal(omegaCorrectContractLanguage.status, "consistent");
assert.equal(omegaCorrectContractLanguage.contradictions.length, 0);

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
  effectDriftOnlyStatus: effectDriftOnly.status,
  effectDriftOnlyContradictionCount: effectDriftOnly.contradictions.length,
  omegaEffectDriftStatus: omegaEffectDrift.status,
  omegaEffectDriftContradictionCount: omegaEffectDrift.contradictions.length,
  omegaCorrectContractLanguageStatus: omegaCorrectContractLanguage.status,
  correctedStatus: corrected.status,
  rejectedAlternativeStatus: rejectedAlternativeOnly.status,
  providerCalls: 0,
  paidCostCny: 0,
}, null, 2));
