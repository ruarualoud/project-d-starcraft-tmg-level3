// Concrete regression for the retained false claim that round 1 cannot score
// any VP. Exercise the real bridge and typed repair with a local fake answer;
// this verifier never calls a Provider or mutates a Room.
import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";

import { createRosterPlanningProductModuleV1 } from
  "../packages/product-composition/roster-planning-product-module-v1.mjs";
import { resolveOfficialDevelopmentTrancheFixtureRootV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

// Actual Daybreak failure: final review cites fallbackRouteText, while the
// repair manifest omits it. Exercise only this repair, not old product gates.
if (process.argv.includes("--captured-fallback-repro")) {
  const capturePath = process.argv[process.argv.indexOf(
    "--captured-fallback-repro") + 1];
  const capture = JSON.parse(await readFile(capturePath, "utf8"));
  const { hashStarcraftTmgContract: hash } = await import(
    "../packages/authoritative-engine/referee-crypto-v1.mjs");
  const { createRosterStrategistRuntimeV1 } = await import(
    "../packages/roster-strategist/roster-strategist-runtime-v1.mjs");
  const seal = (body) => ({ ...body, descriptorHash: hash(body) });
  const binding = capture.plan.openingDeploymentSchedule.armyAuditResultHash;
  const forbidden = () => { throw new Error("unexpected Rules/query call"); };
  const builderDescriptor = seal({
    schema: "starcraft_tmg_army_builder_query_port_descriptor_v1",
    readOnly: true, mutatesRoomState: false, mutatesSourceData: false,
    reimplementsRules: false, silentRepairOrFallback: false,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
    unknownStaysUnknown: true, providerCalls: 0, trainingTruth: false,
    unitCompositionUpgradeDataBundleHash: binding,
    armyResourceBudgetDataBundleHash: binding,
    factionArmyEligibilityDataBundleHash: binding,
  });
  const labDescriptor = seal({
    schema: "starcraft_tmg_pregame_scene_laboratory_descriptor_v1",
    sourceStateHash: capture.sourceStateHash, builderBundleHash: binding,
    readOnly: true, mutatesRoomState: false, mutatesBuilderState: false,
    mutatesSourceData: false, reimplementsRules: false,
    resultsBoundToSourceState: true, unknownStaysUnknown: true,
    hostPreferenceWeightsApplied: false, sameStateABComparisonSupported: true,
    scenarioBranchesOperateOnClonesOnly: true,
    hypotheticalPlacementsAreAdvisoryNotRulesLegality: true,
    providerCalls: 0, trainingTruth: false,
  });
  const runtime = createRosterStrategistRuntimeV1({
    armyBuilderPort: { portDescriptor: () => builderDescriptor,
      evaluateRosterCandidate: forbidden, enumerateArmyBuildingChoices: forbidden },
    laboratory: { labDescriptor: () => labDescriptor,
      queryProbability: forbidden, querySpatial: forbidden, queryMath: forbidden,
      queryThreatExchange: forbidden, runScenarioBranch: forbidden,
      missionScoringAuthority: forbidden },
    strategyPack: { foundational: { entries: Array.from({ length: 5 },
      () => ({})) }, receipt: { hash: binding } },
  });
  const paths = [...new Set(capture.review.review.findings.filter(
    (finding) => finding.severity === "high").map((finding) => finding.claimPath))];
  assert.ok(paths.includes("scoreRoute.fallbackRouteText"));
  const replacements = Object.fromEntries(paths.map((claimPath) => [claimPath,
    `Focused repair fixture for ${claimPath}: retain conditional intent, `
      + "use the frozen mission arithmetic and audited arrival facts."]));
  let calls = 0;
  const deliberation = { descriptor: () => ({
    modelVersion: "focused_zero_provider",
    promptVersion: "captured_fallback_claim_repair_v1",
  }), deliberate: async () => {
    calls += 1;
    return { output: {
      schemaVersion: "starcraft_tmg_roster_strategist_deliberation_v1",
      roundKind: "revision", repairs: Object.entries(replacements).map(
        ([claimPath, replacementText]) => ({ claimPath, replacementText })),
    }, receipt: { paidProviderCall: false } };
  } };
  const request = { plan: capture.plan, finalPlanReview: capture.review,
    armyAudit: capture.armyAudit, missionProfile: capture.missionProfile,
    toolReceipts: capture.toolReceipts,
    reasonText: "Reproduce the captured Daybreak fallback repair rejection",
    triggerIds: [], targetedClaimPaths: paths,
    revisedSectionKeys: ["scoreRoute", "deploymentConcept", "componentPurposes"],
  };
  const repaired = await runtime.reviseRosterPlan(request, { deliberation });
  assert.equal(calls, 1);
  for (const [claimPath, replacement] of Object.entries(replacements)) {
    const actual = claimPath.startsWith("componentPurposes.")
      ? repaired.plan.componentPurposes.find((purpose) => purpose.instanceId
        === claimPath.slice("componentPurposes.".length)).publicPurposeText
      : claimPath.split(".").reduce((value, key) => value[key], repaired.plan);
    assert.equal(actual, replacement, `replacement lost: ${claimPath}`);
  }
  assert.deepEqual(repaired.plan.openingDeploymentSchedule,
    capture.plan.openingDeploymentSchedule);
  assert.deepEqual(repaired.plan.rosterCandidate, capture.plan.rosterCandidate);
  assert.deepEqual(repaired.plan.scoreRoute.targetVpSchedule,
    capture.plan.scoreRoute.targetVpSchedule);
  await assert.rejects(runtime.reviseRosterPlan({ ...request,
    targetedClaimPaths: ["openingDeploymentSchedule.scheduleHash"] },
  { deliberation }), /binding_or_reviewed_paths/u);
  assert.equal(calls, 1);
  process.stdout.write("CAPTURED_FALLBACK_ALL_REPLACEMENTS_ZERO_PROVIDER_OK\n");
  process.exit(0);
}

const root = path.resolve(import.meta.dirname, "..");
const fixtureRoot = await resolveOfficialDevelopmentTrancheFixtureRootV1({
  root,
});
const dataDirectory = path.join(root,
  "build/ticket-27-slice-272-iterative-live-v1");
const iterativeSessionId = "iterative-standard-2000-fresh-b-v1";
const teachSessionId = "agent-selected-teach-standard-2000-fresh-b-v2";
const review = JSON.parse(await readFile(path.join(dataDirectory,
  "agent-selected-teach-f1047bc9848e12ef-final-review-source-bound-v1.json"),
"utf8"));
const product = await createRosterPlanningProductModuleV1({ root,
  fixtureRoot, dataDirectory,
  mapConfiguration: { seedId: "sc1_lost_temple_v1",
    elementSelections: [], passageSelections: [] },
  deliberationFactory: { createForRun: async () => {
    throw new Error("focused gate must not call Provider");
  } },
  createSessionId: () => teachSessionId, enableIterativeDraft: true,
});
const bridge = await product.prepareAgentSelectedTeachPromotion(
  iterativeSessionId, teachSessionId);
assert.equal(review.planHash, bridge.plan.planHash);
assert.equal(review.missionScoringSourceAudit.status, "verified");
assert.equal(review.findings.filter((finding) => finding.severity === "high")
  .length, 3);
const replacements = {
  "scoreRoute.routeText": "Round 1 enemy Supply destroyed can score VP. "
    + "Marker-control VP begins in round 2; retain the unchanged target "
    + "schedule as a contingent three-marker plan, not a guaranteed score.",
  publicSummaryText: "Round 1 can score through enemy Supply destroyed; "
    + "marker-control VP begins in round 2. Preserve the verified arrival "
    + "schedule and adapt the three-marker plan to legal positions.",
  "deploymentConcept.deploymentConceptText": "The round-1 small Marine "
    + "is assigned to marker 3 for the round-2 Marauder handoff. Other "
    + "round-1 bodies cover marker 1 and the temple approach, contingent "
    + "on exact legal deployment and movement.",
  "deploymentConcept.reinforcementPolicyText": "The round-3 Marine "
    + "cannot screen during rounds 1-2. The already-arrived units must "
    + "handle an early Omega Worm threat without assuming that reserve "
    + "Marine is on the table.",
};
const repaired = await product.reviseAgentSelectedTeachPlan({
  iterativeSessionId, teachSessionId, plan: bridge.plan, review,
  targetedClaimPaths: Object.keys(replacements),
  deliberation: {
    descriptor: () => ({ modelVersion: "focused_zero_provider",
      promptVersion: "scoring_claim_repair_regression_v1" }),
    deliberate: async () => ({ output: {
      schemaVersion: "starcraft_tmg_roster_strategist_deliberation_v1",
      roundKind: "revision",
      repairs: Object.entries(replacements).map(([claimPath,
        replacementText]) => ({ claimPath, replacementText })),
    }, receipt: { paidProviderCall: false } }),
  },
});
assert.notEqual(repaired.plan.scoreRoute.scoreRouteHash,
  bridge.plan.scoreRoute.scoreRouteHash);
assert.deepEqual(repaired.plan.scoreRoute.targetVpSchedule,
  bridge.plan.scoreRoute.targetVpSchedule);
assert.equal(repaired.plan.rosterCandidate.candidateHash,
  bridge.plan.rosterCandidate.candidateHash);
assert.equal(repaired.plan.openingDeploymentSchedule.scheduleHash,
  bridge.plan.openingDeploymentSchedule.scheduleHash);
assert.ok(repaired.revisionEvent.revisedSectionKeys.includes("scoreRoute"));
assert.equal(repaired.plan.planVersion, 2);
process.stdout.write("AGENT_SCORING_CLAIM_REPAIR_ZERO_PROVIDER_OK\n");
