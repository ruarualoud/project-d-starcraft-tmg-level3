// Concrete paid B failure: false actor-relative VP lives in opponent hypotheses,
// while the completed source review covers only global/component prose.
// No live Provider/Room calls; fake findings exercise coverage and typed repair,
// not a semantic endorsement of the captured strategy.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { rosterPublicClaimTextEntriesV1 } from
  "../packages/roster-strategist/roster-public-claim-paths-v1.mjs";
import { reviewRosterFinalPlanV3 } from
  "../packages/roster-strategist/roster-final-plan-review-v1.mjs";
import { createRosterStrategistRuntimeV1 } from
  "../packages/roster-strategist/roster-strategist-runtime-v1.mjs";

const capture = JSON.parse(await readFile(process.argv[2], "utf8"));
const plan = capture.plan;
const hypothesis = plan.opponentHypotheses[0];
const paths = [
  `opponentHypotheses.${hypothesis.hypothesisId}.hypothesisText`,
  `opponentHypotheses.${hypothesis.hypothesisId}.expectedCounterTexts.0`,
  `counterResponses.${plan.counterResponses[0].responseId}.responseText`,
  `invalidationTriggers.${plan.invalidationTriggers[0].triggerId}.triggerText`,
];
assert.match(hypothesis.hypothesisText, /worth 2 VP each to the opponent/);
assert.equal(capture.review.review.findings.filter(f => f.severity === "high").length, 0);
assert.ok(!capture.review.review.reviewedClaimPaths.includes(paths[0]));
const claims = new Map(rosterPublicClaimTextEntriesV1(plan));
for (const path of paths) assert.equal(typeof claims.get(path), "string",
  `actual paid claim omitted from review/repair: ${path}`);

const reviewedTargets = [];
const reviewed = await reviewRosterFinalPlanV3({
  plan, sessionId: "captured-opponent-coverage-zero-provider",
  incrementalFrom: { plan, review: capture.review.review },
  toolReceipts: capture.toolReceipts,
  selectedCandidateInputHash: capture.selectedCandidateInputHash,
  selectionUnitRules: capture.unitRules,
  selectionJustificationPolicyVersion: capture.selectionPolicy,
  deliberation: { deliberate: async request => {
    const sources = request.promptNodes.find(n => n.kind === "frozen-plan-claims").sources;
    reviewedTargets.push(...sources.map(s => s.path));
    return { output: {
      schemaVersion: "starcraft_tmg_roster_final_plan_review_shard_v1",
      roundKind: "final_plan_review",
      findings: sources.filter(s => paths.includes(s.path)).map(s => ({
        claimPath: s.path, claimQuote: s.text, category: "scoring", severity: "high",
        publicReason: "Concrete coverage fixture: retain this original quote for typed repair.",
        correctionQuestion: "Reconcile the actor-relative scoring premise with sealed facts.",
      })),
      reviewedClaimPaths: sources.map(s => s.path),
      hasUnreportedMaterialFindings: false,
      publicSummary: "Coverage fixture only, not model or Rules strategy certification.",
    }, receipt: { paidProviderCall: false } };
  } },
});
for (const path of paths) assert.ok(reviewedTargets.includes(path));
for (const path of capture.review.review.reviewedClaimPaths) {
  assert.ok(!reviewedTargets.includes(path), `already-reviewed claim resent: ${path}`);
  assert.ok(reviewed.reviewedClaimPaths.includes(path));
}
assert.equal(reviewed.incrementalReview.reusedClaimCount,
  capture.review.review.reviewedClaimPaths.length);

const binding = plan.openingDeploymentSchedule.armyAuditResultHash;
const seal = body => ({ ...body, descriptorHash: hash(body) });
const forbidden = () => { throw new Error("unexpected Rules/query call"); };
const runtime = createRosterStrategistRuntimeV1({
  selectionUnitRules: capture.unitRules,
  armyBuilderPort: { portDescriptor: () => seal({
    schema: "starcraft_tmg_army_builder_query_port_descriptor_v1",
    readOnly: true, mutatesRoomState: false, mutatesSourceData: false,
    reimplementsRules: false, silentRepairOrFallback: false,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
    unknownStaysUnknown: true, providerCalls: 0, trainingTruth: false,
    unitCompositionUpgradeDataBundleHash: binding,
    armyResourceBudgetDataBundleHash: binding,
    factionArmyEligibilityDataBundleHash: binding,
  }), evaluateRosterCandidate: forbidden, enumerateArmyBuildingChoices: forbidden },
  laboratory: { labDescriptor: () => seal({
    schema: "starcraft_tmg_pregame_scene_laboratory_descriptor_v1",
    sourceStateHash: capture.sourceStateHash, builderBundleHash: binding,
    readOnly: true, mutatesRoomState: false, mutatesBuilderState: false,
    mutatesSourceData: false, reimplementsRules: false,
    resultsBoundToSourceState: true, unknownStaysUnknown: true,
    hostPreferenceWeightsApplied: false, sameStateABComparisonSupported: true,
    scenarioBranchesOperateOnClonesOnly: true,
    hypotheticalPlacementsAreAdvisoryNotRulesLegality: true,
    providerCalls: 0, trainingTruth: false,
  }), queryProbability: forbidden, querySpatial: forbidden, queryMath: forbidden,
  queryThreatExchange: forbidden, runScenarioBranch: forbidden, missionScoringAuthority: forbidden },
  strategyPack: { foundational: { entries: Array.from({ length: 5 }, () => ({})) },
    receipt: { hash: binding } },
});
const replacements = new Map(paths.map(path => [path,
  `Coverage repair fixture for ${path}; own-affinity markers score 1 VP per actor.`]));
let repairCalls = 0;
const repaired = await runtime.reviseRosterPlan({
  plan, finalPlanReview: { status: "completed", planHash: plan.planHash, review: reviewed },
  armyAudit: capture.armyAudit, missionProfile: capture.missionProfile,
  toolReceipts: capture.toolReceipts,
  selectedCandidateInputHash: capture.selectedCandidateInputHash,
  selectionJustificationPolicyVersion: capture.selectionPolicy,
  reasonText: "Repair captured previously omitted opponent claims",
  triggerIds: [], targetedClaimPaths: paths,
  revisedSectionKeys: ["opponentHypotheses", "counterResponses", "invalidationTriggers"],
}, { deliberation: {
  descriptor: () => ({ modelVersion: "zero_provider", promptVersion: "coverage_fixture_v1" }),
  deliberate: async () => {
    repairCalls += 1;
    return { output: { schemaVersion: "starcraft_tmg_roster_strategist_deliberation_v1",
      roundKind: "revision", repairs: [...replacements].map(([claimPath, replacementText]) =>
        ({ claimPath, replacementText })) }, receipt: { paidProviderCall: false } };
  },
} });
assert.equal(repairCalls, 1);
const after = new Map(rosterPublicClaimTextEntriesV1(repaired.plan));
for (const [path, replacement] of replacements) assert.equal(after.get(path), replacement);
for (const [path, original] of claims) {
  if (!replacements.has(path)) assert.equal(after.get(path), original);
}
assert.deepEqual(repaired.plan.rosterCandidate, plan.rosterCandidate);
assert.deepEqual(repaired.plan.openingDeploymentSchedule, plan.openingDeploymentSchedule);
assert.deepEqual(repaired.plan.scoreRoute.targetVpSchedule, plan.scoreRoute.targetVpSchedule);
assert.deepEqual(repaired.plan.opponentHypotheses[0].ownCounterResponseIds,
  plan.opponentHypotheses[0].ownCounterResponseIds);
await assert.rejects(runtime.reviseRosterPlan({
  plan, finalPlanReview: { status: "completed", planHash: plan.planHash, review: reviewed },
  armyAudit: capture.armyAudit, missionProfile: capture.missionProfile,
  reasonText: "Reject identity change", triggerIds: [],
  targetedClaimPaths: [`opponentHypotheses.${hypothesis.hypothesisId}.hypothesisId`],
  revisedSectionKeys: ["opponentHypotheses"],
}, { deliberation: { deliberate: forbidden } }), /CLAIM_REPAIR_INVALID/);
console.log(JSON.stringify({ pass: true, capturedPlanHash: plan.planHash,
  repairedPlanHash: repaired.plan.planHash, originalClaimsReused: capture.review.review.reviewedClaimPaths.length,
  newlyReviewedClaims: reviewedTargets.length, repairedPaths: paths,
  providerCalls: 0, roomWrites: 0, sourceTruthCertified: false, trainingTruth: false }));
