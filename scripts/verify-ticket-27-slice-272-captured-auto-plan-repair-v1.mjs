import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createRosterPlanV1, createRosterComponentPurposeV1,
  createRosterPlanRevisionEventV1 } from
  "../packages/roster-strategist/roster-plan-contracts-v1.mjs";
import { createPlannedPresetRosterPlanV2 } from
  "../packages/roster-strategist/planned-preset-roster-plan-v2.mjs";
import { reviewRosterFinalPlanV3 } from
  "../packages/roster-strategist/roster-final-plan-review-v1.mjs";

const filename = process.argv.find(arg => arg.startsWith("--capture="))
  ?.slice("--capture=".length);
assert.ok(filename, "Use the captured A v5 session, never its mutable live draft");
const captured = JSON.parse(await readFile(filename, "utf8"));
if (process.argv.includes("--dependency-scope-only")) {
  const previousFilename = process.argv.find(arg => arg.startsWith("--baseline-capture="))
    ?.slice("--baseline-capture=".length);
  assert.ok(previousFilename, "Use both actual paid A plans");
  const previous = JSON.parse(await readFile(previousFilename, "utf8"));
  assert.equal(previous.plan.openingDeploymentSchedule, undefined);
  assert.ok(captured.plan.openingDeploymentSchedule);
  assert.notEqual(captured.plan.planHash, previous.plan.planHash);
  const original = JSON.stringify([previous, captured]);
  const calls = [];
  const input = { plan: captured.plan, sessionId: captured.sessionId,
    toolReceipts: captured.evidence.toolReceipts,
    selectedCandidateInputHash: captured.selectedCandidateInput
      ? hashStarcraftTmgContract(captured.selectedCandidateInput) : null,
    incrementalFrom: { plan: previous.plan, review: previous.planReview.review },
    allowFullReviewOnDependencyChange: true,
    deliberation: { async deliberate(request) {
      const targets = request.promptNodes.find(n => n.kind === "frozen-plan-claims")
        .sources.map(s => s.path);
      calls.push(targets);
      return { output: {
        schemaVersion: request.responseFormat.schema.properties.schemaVersion.enum[0],
        roundKind: "final_plan_review", findings: [],
        publicSummary: "Diagnostic scope only, no real model or acceptance",
        reviewedClaimPaths: targets, hasUnreportedMaterialFindings: false,
      }, receipt: { paidProviderCall: false, diagnosticOnly: true } };
    } } };
  const reviewed = await reviewRosterFinalPlanV3(input);
  assert.equal(reviewed.reviewScopeSelection.requestedScope, "changed_claims");
  assert.equal(reviewed.reviewScopeSelection.effectiveScope, "full");
  assert.equal(reviewed.reviewScopeSelection.reason, "non_prose_or_coverage");
  assert.equal(reviewed.reviewScopeSelection.priorFindingsReused, false);
  assert.equal(reviewed.incrementalReview, undefined);
  assert.deepEqual(calls.flat(), reviewed.reviewedClaimPaths);
  assert.equal(new Set(calls.flat()).size, reviewed.reviewedClaimCount);
  const fullCalls = calls.length;
  calls.length = 0;
  await assert.rejects(reviewRosterFinalPlanV3({ ...input,
    allowFullReviewOnDependencyChange: false }), /INCREMENTAL_REVIEW_DEPENDENCY_CHANGED/);
  assert.equal(calls.length, 0, "Strict incremental clients still fail before any send");
  assert.equal(JSON.stringify([previous, captured]), original);
  console.log(JSON.stringify({ status: "passed", fullScopeChosenBeforeDispatch: true,
    reviewedClaims: reviewed.reviewedClaimCount, diagnosticModelCalls: fullCalls,
    strictIncrementalStillRejects: true, priorFindingsReused: false,
    actualPlanRewritten: false, providerCalls: 0, roomWrites: 0 }));
  process.exit(0);
}
if (process.argv.includes("--unscheduled-preset-only")) {
  const { runReviewedRosterPlanRepairV1 } = await import(
    "../packages/roster-planning-workspace/reviewed-plan-auto-repair-v1.mjs");
  const { AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA } = await import(
    "../packages/roster-strategist/agent-scheduled-roster-plan-v1.mjs");
  const { PLANNED_PRESET_ROSTER_PLAN_SCHEMA } = await import(
    "../packages/roster-strategist/planned-preset-roster-plan-v2.mjs");
  const source = JSON.stringify(captured);
  assert.equal(captured.plan.schema, PLANNED_PRESET_ROSTER_PLAN_SCHEMA);
  assert.equal(captured.plan.revisions.length, 0);
  assert.equal(captured.plan.openingDeploymentSchedule, undefined);
  assert.ok(captured.planReview.review.findings.some(f => f.severity === "high"));
  const targeted = [...new Set(captured.planReview.review.findings
    .filter(f => f.severity === "high").map(f => f.claimPath))];
  const steps = [];
  let state = structuredClone(captured);
  const service = {
    readSession: () => structuredClone(state),
    async revisePlan(id, request) {
      steps.push(request);
      throw Object.assign(new Error("CAPTURED_REVISION_ENTRY_REACHED"),
        { code: "CAPTURED_REVISION_ENTRY_REACHED" });
    },
  };
  await assert.rejects(runReviewedRosterPlanRepairV1({ service,
    sessionId: captured.sessionId, expectedPlanHash: captured.plan.planHash }),
  /CAPTURED_REVISION_ENTRY_REACHED/);
  assert.equal(steps.length, 1);
  assert.deepEqual(steps[0].targetedClaimPaths, targeted);
  assert.ok(steps[0].revisedSectionKeys.includes("deploymentConcept"));
  steps.length = 0;
  state = { ...structuredClone(captured), plan: {
    ...structuredClone(captured.plan), schema: AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA } };
  await assert.rejects(runReviewedRosterPlanRepairV1({ service,
    sessionId: captured.sessionId, expectedPlanHash: captured.plan.planHash }),
  /AUTO_REPAIR_UNREPAIRABLE/);
  assert.equal(steps.length, 0, "Agent-selected plans still need their audited schedule");
  state = { ...structuredClone(captured), plan: {
    ...structuredClone(captured.plan), revisions: [{}] } };
  await assert.rejects(runReviewedRosterPlanRepairV1({ service,
    sessionId: captured.sessionId, expectedPlanHash: captured.plan.planHash }),
  /AUTO_REPAIR_UNREPAIRABLE/);
  assert.equal(steps.length, 0, "Existing preset revisions cannot lose their schedule");
  assert.equal(JSON.stringify(captured), source);
  console.log(JSON.stringify({ status: "passed", checks: 3,
    firstPresetCorrectionReached: true, missingRequiredSchedulesRejected: true,
    targetedClaims: targeted.length, strategyRewritten: false,
    providerCalls: 0, roomWrites: 0 }));
  process.exit(0);
}
const baseline = JSON.parse(captured.planSerialized);
const path = "componentPurposes.player1-tactical-3";
assert.equal(baseline.planVersion, 5);
assert.equal(captured.planReview.review.findings.filter(f => f.severity === "high")
  .map(f => f.claimPath).join(), path);
const revision = createRosterPlanRevisionEventV1({
  revisionId: `${baseline.planId}-revision-6`, planId: baseline.planId,
  fromPlanVersion: 5, toPlanVersion: 6, previousPlanHash: baseline.planHash,
  reasonText: "Captured Supply claim seam; diagnostic plan only",
  triggerIds: [], revisedSectionKeys: ["componentPurposes"],
});
const diagnosticPlan = createPlannedPresetRosterPlanV2({
  ...createRosterPlanV1({ ...baseline, presetRoster: false, presetBinding: null,
    planVersion: 6, planStatus: "revised",
    componentPurposes: baseline.componentPurposes.map(p =>
      p.instanceId !== "player1-tactical-3" ? p : createRosterComponentPurposeV1({
        ...p, publicPurposeText: "Supply Depot supports the verified arrival "
          + "schedule. Round 1 capacity and committed Supply are both 6; "
          + "cumulative committed Supply is 6/8/9/11/12 in rounds 1–5. "
          + "The 12-Supply army is not a 12-Supply Round 1 opening.",
      })),
    revisions: [...baseline.revisions, revision],
  }),
  baselinePlan: captured.lockedRoster.baselinePlan,
  openingDeploymentSchedule: baseline.openingDeploymentSchedule,
});
const calls = [];
const deliberation = { async deliberate(request) {
  const sources = request.promptNodes.find(n => n.kind === "frozen-plan-claims")
    .sources;
  calls.push(sources.map(s => s.path));
  return { output: {
    schemaVersion: request.responseFormat.schema.properties.schemaVersion.enum[0],
    roundKind: "final_plan_review", findings: [],
    publicSummary: "Captured seam: exact corrected Supply claim, no real model call",
    reviewedClaimPaths: sources.map(s => s.path),
    hasUnreportedMaterialFindings: false,
  }, receipt: { paidProviderCall: false, diagnosticOnly: true } };
} };
const input = { plan: diagnosticPlan, sessionId: captured.sessionId,
  toolReceipts: captured.toolReceipts,
  selectedCandidateInputHash: captured.selectedCandidateInput
    ? hashStarcraftTmgContract(captured.selectedCandidateInput) : null,
  deliberation, incrementalFrom: { plan: baseline,
    review: captured.planReview.review } };
const reviewed = await reviewRosterFinalPlanV3(input);
console.log(JSON.stringify({ changedPath: path, modelCalls: calls.length,
  targetPaths: calls.flat(), fullClaimCount: reviewed.reviewedClaimCount,
  diagnosticOnly: true, paidCalls: 0, roomWrites: 0 }));
assert.equal(calls.length, 1, "A corrected one claim but review re-sent all seven shards");
assert.deepEqual(calls[0], [path]);
assert.equal(reviewed.reviewedClaimCount, 50);
assert.equal(reviewed.incrementalReview.reusedClaimCount, 49);
assert.equal(reviewed.incrementalReview.previousReviewHash,
  captured.planReview.review.reviewHash);
assert.deepEqual(reviewed.findings, captured.planReview.review.findings
  .filter(f => f.claimPath !== path));
assert.equal(reviewed.findings.some(f => f.severity === "high"), false);
assert.equal(hashStarcraftTmgContract(Object.fromEntries(Object.entries(reviewed)
  .filter(([key]) => key !== "reviewHash"))), reviewed.reviewHash);

calls.length = 0;
await assert.rejects(reviewRosterFinalPlanV3({ ...input,
  selectedCandidateInputHash: "0".repeat(64) }), /INCREMENTAL_REVIEW_DEPENDENCY_CHANGED/);
assert.equal(calls.length, 0, "Dependency drift must fail before a paid send");

const { runReviewedRosterPlanRepairV1 } = await import(
  "../packages/roster-planning-workspace/reviewed-plan-auto-repair-v1.mjs");
let state = { plan: baseline, status: "planned", claimRepairBacklog: [],
  planReview: captured.planReview, planReviewHistory: captured.planReviewHistory };
const steps = [];
const service = {
  readSession: () => structuredClone(state),
  async revisePlan(id, request) {
    steps.push({ kind: "revise", paths: request.targetedClaimPaths });
    state = { ...state, plan: diagnosticPlan }; return state;
  },
  async reviewFinalPlan(id, request) {
    steps.push({ kind: "review", scope: request.scope });
    state = { ...state, planReview: { status: "completed",
      planHash: diagnosticPlan.planHash, review: reviewed } }; return state;
  },
};
await assert.rejects(runReviewedRosterPlanRepairV1({ service,
  sessionId: captured.sessionId, expectedPlanHash: baseline.planHash }),
  /SOURCE_REVIEW_NONCONVERGENT/);
assert.equal(steps.length, 0, "The historical three-review limit cannot be silently reset");
const result = await runReviewedRosterPlanRepairV1({ service,
  sessionId: captured.sessionId, expectedPlanHash: baseline.planHash,
  authorizeAdditionalCycle: true });
assert.deepEqual(steps, [{ kind: "revise", paths: [path] },
  { kind: "review", scope: "changed_claims" }]);
assert.equal(result.status, "completed");
assert.equal(result.completedCycles, 1);
assert.equal(state.planReviewHistory.length, 3);
await import("../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs");
await import("../packages/roster-planning-workspace/roster-planning-workspace-http-v1.mjs");
console.log(JSON.stringify({ ok: true, incrementalTargets: 1, reusedClaims: 49,
  automaticRepairAndReview: true, historyPreserved: true,
  paidCalls: 0, roomWrites: 0, diagnosticPlanNeverPersisted: true }));
