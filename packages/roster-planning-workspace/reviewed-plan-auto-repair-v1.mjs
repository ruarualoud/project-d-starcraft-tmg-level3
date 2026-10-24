import { effectiveRosterFinalPlanReviewFindingsV1, needsRosterFinalPlanReconciliationV1 } from
  "../roster-strategist/roster-final-plan-review-v1.mjs";
import { PLANNED_PRESET_ROSTER_PLAN_SCHEMA } from
  "../roster-strategist/planned-preset-roster-plan-v2.mjs";
import { rosterReferencedRepairClaimPathsV1 } from
  "../roster-strategist/roster-public-claim-paths-v1.mjs";

function fail(code) {
  throw Object.assign(new Error(code), { code });
}

// A cross-claim contradiction cannot be repaired by changing only its primary
// quote. Resolve references against the current public-prose catalogue, never
// arbitrary model paths. A referenced structured hypothesis/response is one
// coherent prose object; its supporting sentences must be editable together.
export function rosterReviewedRepairClaimPathsV1(plan, findings, backlog = []) {
  const paths = new Set([
    ...findings.filter(f => f.severity === "high").map(f => f.claimPath),
    ...backlog.filter(e => e.status === "repair_required").map(e => e.claimPath),
  ]);
  for (const path of rosterReferencedRepairClaimPathsV1(plan,
    findings.filter(f => f.severity === "high"))) paths.add(path);
  return [...paths];
}

// Shared by fixed-roster and agent-selected plans. This is corrective model
// work, not a blind retry of an ambiguous Provider dispatch or a new Rules lane.
export async function runReviewedRosterPlanRepairV1({ service, sessionId,
  expectedPlanHash, authorizeAdditionalCycle = false,
  shouldStop = () => false, onProgress = async () => {} } = {}) {
  let current = service.readSession(sessionId);
  if (!current.plan || current.plan.planHash !== expectedPlanHash) {
    fail("ROSTER_WORKSPACE_AUTO_REPAIR_PLAN_CHANGED");
  }
  const completedReviews = [...(current.planReviewHistory || []), current.planReview]
    .filter(review => review?.status === "completed").length;
  const maximumCycles = authorizeAdditionalCycle ? 1
    : Math.max(0, 3 - completedReviews);
  let completedCycles = 0;
  const waitFor = async (kind) => {
    while (true) {
      if (shouldStop()) fail("ROSTER_WORKSPACE_AUTO_REPAIR_STOPPED");
      const snapshot = service.readSession(sessionId);
      if (kind === "revision" && snapshot.status === "planned") return snapshot;
      if (kind === "review" && snapshot.planReview?.status === "completed"
        && snapshot.planReview.planHash === snapshot.plan?.planHash) return snapshot;
      if (kind === "revision" && snapshot.status !== "running") {
        fail(snapshot.failure?.code || "ROSTER_WORKSPACE_AUTO_REPAIR_REVISION_FAILED");
      }
      if (kind === "review" && snapshot.planReview?.status !== "running") {
        fail(snapshot.planReview?.failure?.code || "ROSTER_WORKSPACE_AUTO_REPAIR_REVIEW_FAILED");
      }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  };
  while (true) {
    if (shouldStop()) fail("ROSTER_WORKSPACE_AUTO_REPAIR_STOPPED");
    let wrapper = current.planReview;
    if (wrapper?.status !== "completed" || wrapper.planHash !== current.plan.planHash
      || wrapper.stale === true) fail("ROSTER_WORKSPACE_AUTO_REPAIR_CURRENT_REVIEW_REQUIRED");
    let findings = effectiveRosterFinalPlanReviewFindingsV1({
      plan: current.plan, review: wrapper.review });
    if (findings.some(f => f.severity === "critical")) {
      fail("ROSTER_WORKSPACE_AUTO_REPAIR_CRITICAL");
    }
    if (needsRosterFinalPlanReconciliationV1(wrapper.review)
      && typeof service.reconcileReviewFindings === "function") {
      await onProgress({ phase: "qualifying_source_review", completedCycles,
        maximumCycles, planHash: current.plan.planHash });
      current = await service.reconcileReviewFindings(sessionId);
      wrapper = current.planReview;
      findings = effectiveRosterFinalPlanReviewFindingsV1({
        plan: current.plan, review: wrapper.review });
    }
    if (wrapper.review.reviewAdjudication?.reconciliation?.unresolvedJudgments?.length) {
      fail("ROSTER_WORKSPACE_REVIEW_JUDGMENT_RECOVERY_REQUIRED");
    }
    const paths = rosterReviewedRepairClaimPathsV1(current.plan, findings,
      current.claimRepairBacklog || []);
    if (paths.length === 0 && !(current.claimRepairBacklog || []).length) {
      const result = { status: "completed", completedCycles,
        planHash: current.plan.planHash, reviewHash: wrapper.review.reviewHash,
        maximumCycles, historyReset: false, trainingTruth: false };
      await onProgress({ phase: "completed", ...result });
      return result;
    }
    if (completedCycles >= maximumCycles) {
      fail("ROSTER_WORKSPACE_SOURCE_REVIEW_NONCONVERGENT");
    }
    // The first fixed-roster plan legitimately has no arrival schedule yet.
    // Its normal revisePlan path derives and audits that schedule. Later preset
    // revisions and agent-selected plans must retain their existing schedule.
    const initialPresetCorrection = current.plan.schema
      === PLANNED_PRESET_ROSTER_PLAN_SCHEMA && current.plan.revisions?.length === 0;
    if (!paths.length || paths.length > 64
      || (!current.plan.openingDeploymentSchedule && !initialPresetCorrection)) {
      fail("ROSTER_WORKSPACE_AUTO_REPAIR_UNREPAIRABLE");
    }
    const before = current.plan.planHash;
    const sections = [...new Set(["deploymentConcept", ...paths.map(path =>
      path === "publicSummaryText" ? path : path.split(".")[0])])];
    await onProgress({ phase: "repairing_claims", completedCycles,
      maximumCycles, targetClaimPaths: paths, fromPlanHash: before });
    await service.revisePlan(sessionId, {
      // Revision validates original/current frozen dependencies before using
      // this evidence. Never relabel old Teach as the current Plan's Teach.
      ...(current.teachFramework?.status === "completed"
        ? { sourceTeachPlanHash: current.teachFramework.planHash } : {}),
      reasonText: "Automatically correct the cited High public claims against "
        + "the verified facts; preserve the audited roster, arrival schedule "
        + "and unrelated plan content",
      triggerIds: [], revisedSectionKeys: sections, targetedClaimPaths: paths,
    });
    current = await waitFor("revision");
    if (current.plan.planHash === before) fail("ROSTER_WORKSPACE_AUTO_REPAIR_NO_EFFECT");
    await onProgress({ phase: "reviewing_changed_claims", completedCycles,
      maximumCycles, targetClaimPaths: paths, toPlanHash: current.plan.planHash });
    await service.reviewFinalPlan(sessionId, { scope: "changed_claims",
      baselinePlanHash: before, relatedRepairClaimPaths: paths });
    current = await waitFor("review");
    completedCycles += 1;
  }
}
