#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  inspectStarcraftTmgSelectedActionIdentityClaimsV1,
  projectStarcraftTmgSubmittedPlanningV1,
} from "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { projectStarcraftTmgSpatialParameterDomainsV1 } from
  "../packages/online-agent-session/spatial-action-query-runtime-v1.mjs";

// Actual B r6: protecting an existing Omega Worm is not summoning one.
// This mode runs only that captured regression, not historical passed modes.
if (process.argv.includes("--existing-asset-reference-only")) {
  const { DatabaseSync } = await import("node:sqlite");
  const { decodeStarcraftTmgLiveDecisionRecordV1 } = await import(
    "../packages/online-agent-session/sqlite-live-decision-store-v1.mjs");
  const directory = process.argv.find(arg => arg.startsWith("--run-directory="))
    ?.slice("--run-directory=".length);
  assert.ok(directory, "saved run directory required");
  const db = new DatabaseSync(`${directory}/seats/player2/provider/live-decisions.sqlite`,
    { readOnly: true });
  let choice;
  try {
    const record = decodeStarcraftTmgLiveDecisionRecordV1(db.prepare(
      "SELECT record_json FROM sc_live_decision_records").get().record_json);
    choice = Object.values(record.decisions).find(entry =>
      entry.authority?.stateRevision === 6 && entry.status === "provider_output_invalid");
  } finally { db.close(); }
  assert.ok(choice, "actual stopped B r6 choice required");
  const submission = choice.attempts[choice.attemptKeys.at(-1)].safeOutput;
  const before = JSON.stringify(submission);
  const input = {
    spatialActionSpace: {
      finiteActions: choice.actionIndex.filter(entry => entry.kind === "finite")
        .map(entry => ({ candidateId: entry.id, action: entry.action })),
      parameterDomains: choice.actionIndex.filter(entry => entry.kind === "parameterized")
        .map(entry => entry.action),
    },
    planState: { plan: choice.currentPlan },
    roomProjection: { room: choice.authority },
  };
  const projected = projectStarcraftTmgSubmittedPlanningV1(submission, input,
    { terminal: true });
  const inspect = (value, stage = "planning") =>
    inspectStarcraftTmgSelectedActionIdentityClaimsV1({ ...input,
      candidateId: submission.recommendedCandidateId, stage, value });
  const actual = inspect(projected);
  assert.equal(actual.status, "consistent",
    `existing protected Worm is not a selected effect: ${JSON.stringify(actual.contradictions)}`);
  const cases = [
    ["Place a Faction Indicator while keeping the Omega Worm safe.", "consistent"],
    ["Establish a forward entry edge while protecting the existing Omega Worm.", "consistent"],
    ["Use Ventral Sacs to place a Faction Indicator and preserve the Omega Worm.", "consistent"],
    ["Place the Faction Indicator near the Omega Worm.", "consistent"],
    ["Use Ventral Sacs and keep the Omega Worm safe.", "consistent"],
    ["放置势力指示物，同时保护已有欧米伽虫道。", "consistent"],
    ["Place an Omega Worm while keeping Kerrigan safe.", "contradicted"],
    ["Create an Omega Worm and protect Kerrigan.", "contradicted"],
    ["Keep Kerrigan safe and place an Omega Worm.", "contradicted"],
    ["An Omega Worm will be created while Kerrigan remains safe.", "contradicted"],
    ["Protect the Faction Indicator; summon an Omega Worm.", "contradicted"],
    ["保护凯瑞甘，同时放置欧米伽虫道。", "contradicted"],
  ];
  for (const [text, expected] of cases) {
    assert.equal(inspect({ publicPlanSummary: { plan: text } }).status,
      expected, text);
    assert.equal(inspect({ selectedReason: text }, "action").status,
      expected, `action: ${text}`);
  }
  assert.equal(JSON.stringify(submission), before, "paid output stays unchanged");
  console.log(JSON.stringify({ passed: true, focusedCases: 26,
    mode: "existing-asset-reference-only", providerCalls: 0, roomWrites: 0,
    fullPlannerAccepted: false, previousPassedModesRerun: false }));
  process.exit(0);
}

if (process.argv.includes("--captured-prefix-collision")) {
  const capturePath = process.argv[process.argv.indexOf(
    "--captured-prefix-collision") + 1];
  const capture = JSON.parse(await readFile(capturePath, "utf8"));
  const attempts = capture.choice.attemptKeys.map((key) =>
    capture.choice.attempts[key]);
  for (const attempt of attempts.slice(0, 2)) {
    const result = inspectStarcraftTmgSelectedActionIdentityClaimsV1({
      ...capture.input, candidateId: attempt.safeOutput.recommendedCandidateId,
      stage: "planning", value: attempt.safeOutput,
    });
    assert.equal(result.status, "consistent",
      "Leaping Strike is not the separate Leap ability");
  }
  const first = attempts[0].safeOutput;
  const explicitWrongAbility = { ...first,
    assessment: { ...first.assessment, currentGoal: "Use Leap now." } };
  assert.equal(inspectStarcraftTmgSelectedActionIdentityClaimsV1({
    ...capture.input, candidateId: first.recommendedCandidateId,
    stage: "planning", value: explicitWrongAbility,
  }).status, "contradicted", "an actual Leap claim must still reject");
  const { selectStarcraftTmgPlannerLocalReplayAttemptV1 } = await import(
    "../packages/online-agent-session/live-flash-decision-port-v1.mjs");
  const before = JSON.stringify(capture.choice);
  const result = selectStarcraftTmgPlannerLocalReplayAttemptV1(
    capture.choice, capture.input);
  assert.equal(result, capture.choice.attemptKeys[1],
    "skip the newest invalid candidate ID, reuse latest wholly valid paid plan");
  assert.equal(JSON.stringify(capture.choice), before,
    "local validation must not rewrite any paid output or retry counters");
  const allInvalid = structuredClone(capture.choice);
  for (const attempt of Object.values(allInvalid.attempts)) {
    attempt.safeOutput.recommendedCandidateId = "not-a-current-candidate";
  }
  assert.equal(selectStarcraftTmgPlannerLocalReplayAttemptV1(
    allInvalid, capture.input), allInvalid.attemptKeys.at(-1),
  "no valid saved plan retains the existing failure path, not fabricated data");
  console.log(JSON.stringify({ passed: true, replayAttemptKey: result,
    paidOutputsRewritten: false, providerCalls: 0, roomMutations: 0 }));
  process.exit(0);
}

if (process.argv.includes("--captured-selected-comparison")) {
  const capturePath = process.argv[process.argv.indexOf(
    "--captured-selected-comparison") + 1];
  const capture = JSON.parse(await readFile(capturePath, "utf8"));
  const input = { spatialActionSpace: capture.spatialActionSpace,
    candidateId: capture.output.recommendedCandidateId,
    stage: "planning", value: capture.output };
  const result = inspectStarcraftTmgSelectedActionIdentityClaimsV1(input);
  assert.equal(result.selectedIdentity.abilityName, "Burrow Ambush");
  assert.equal(result.status, "consistent");
  assert.ok(result.checkedClaims.some((entry) => (
    entry.field.startsWith("candidateComparisons.")
      && entry.text.includes("Burrow Ambush"))));
  const withoutSelected = { ...capture.output,
    candidateComparisons: capture.output.candidateComparisons.filter(
      (comparison) => comparison.candidateId !== input.candidateId) };
  assert.equal(inspectStarcraftTmgSelectedActionIdentityClaimsV1({ ...input,
    value: withoutSelected }).status, "unbound",
  "other candidates cannot bind the chosen action identity");
  console.log(JSON.stringify({ passed: true, candidateId: input.candidateId,
    identity: result.selectedIdentity.abilityName, providerCalls: 0,
    originalPaidOutputRewritten: false }));
  process.exit(0);
}

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
