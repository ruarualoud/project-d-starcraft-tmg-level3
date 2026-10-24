#!/usr/bin/env node

// Concrete gap: a completed locked Teach still needs promotion and V3 source
// review on the Agent-selected plan; the Web journey used to stop here.
import assert from "node:assert/strict";

import { createAgentSelectedRosterJourneyV1 } from
  "../packages/roster-planning-workspace/agent-selected-roster-journey-v1.mjs";

const sessionId = "iterative-review-web-v1";
const state = { sessionId, status: "paused", revision: 7,
  blockingFinding: "ITERATIVE_ROSTER_FINAL_REVIEW_BLOCKED",
  frozenContext: { factionRecordKey: "terran",
    opponentFactionRecordKey: "zerg", scaleId: "Standard" },
  mineralBudget: 2000,
  currentCandidate: { candidateHash: "selected-candidate", mineralSpent: 2000,
    input: { units: [] } },
  plan: { victoryRoute: "Marker control",
    mapEvidenceHash: "certified-route" },
  openingDeploymentSchedule: { entries: [], scheduleHash: "arrival-hash" },
  arrivalPublicRevision: { publicAudit: {
    status: "unit_references_verified" } },
  iterations: [], observations: [] };
let teach = { sessionId: "teach-review-web-v1", status: "planned",
  agentSelectedCandidateHash: "selected-candidate",
  agentSelectionHandoffHash: "selected-handoff",
  // Teach may retain the normalized handoff schedule rather than the
  // iterative draft's public revision hash. The plan ID binds the session.
  agentSelectedArrivalScheduleHash: "normalized-arrival-hash",
  setup: { factionRecordKey: "terran", mineralBudget: 2000 },
  plan: { schema: "starcraft_tmg_roster_plan_v2",
    planId: `agent-selected-${sessionId}` }, planReview: null };
let promotionCalls = 0;
let reviewCalls = 0;
let revisionCalls = 0;
let handoffCalls = 0;
const journey = createAgentSelectedRosterJourneyV1({
  iterativeDraft: { start: async () => {},
    listSessions: async () => [state], read: async () => state,
    prepareTeachHandoff: async () => {
      handoffCalls += 1;
      return { handoffHash: "selected-handoff" };
    },
    proposeSchedule: async () => ({ status: "rules_audited" }),
    reviseSchedulePublicPlan: async () => ({
      status: "unit_references_verified" }),
  },
  workspaceService: {
    createAgentSelectedTeachSession: async () => {
      throw new Error("EXISTING_TEACH_MUST_BE_REUSED");
    },
    listSessions: async () => ({ sessions: [{
      sessionId: teach.sessionId, planningMode: "locked_roster_teach_v1",
    }] }),
    readSession: () => structuredClone(teach),
    revisePlan: async (_sessionId, request) => {
      revisionCalls += 1;
      assert.deepEqual(request.targetedClaimPaths,
        ["deploymentConcept.threatTradeText"]);
      teach = { ...teach, plan: { ...teach.plan,
        planStatus: "revised", planHash: "revised-plan",
        revisions: [{ previousPlanHash: "initial-plan" }] } };
      return structuredClone(teach);
    },
    reviewFinalPlan: async () => {
      reviewCalls += 1;
      assert.equal(teach.plan.schema,
        "starcraft_tmg_agent_scheduled_roster_plan_v1");
      teach.planReview = { status: "completed",
        planHash: teach.plan.planHash,
        review: { findings: reviewCalls === 1 ? [{
          severity: "high",
          claimPath: "deploymentConcept.threatTradeText",
        }] : [] } };
      return structuredClone(teach);
    },
  },
  promoteTeachPlan: async () => {
    promotionCalls += 1;
    teach = { ...teach, plan: {
      schema: "starcraft_tmg_agent_scheduled_roster_plan_v1",
      planId: `agent-selected-${sessionId}-plan`,
      planStatus: "active", planHash: "initial-plan", revisions: [] } };
    return structuredClone(teach);
  },
});
await journey.run(sessionId);
let result;
for (let attempt = 0; attempt < 20; attempt += 1) {
  result = await journey.read(sessionId);
  if (!result.running) break;
  await new Promise((resolve) => setTimeout(resolve, 5));
}
assert.equal(promotionCalls, 1);
assert.equal(reviewCalls, 2);
assert.equal(revisionCalls, 1);
assert.equal(handoffCalls, 0,
  "journey polling must not rebuild the full Builder handoff");
assert.equal(result.stage, "source_review_completed_clean");
assert.equal(result.canEnterRoom, false);
const unresolved = { severity: "high",
  claimPath: "deploymentConcept.threatTradeText" };
teach = { ...teach,
  planVersionHistory: [{ planHash: "initial-plan" },
    { planHash: "revised-plan-1" }],
  planReviewHistory: [
    { status: "completed", planHash: "initial-plan",
      review: { findings: [unresolved] } },
    { status: "completed", planHash: "revised-plan-1",
      review: { findings: [unresolved] } },
  ],
  planReview: { status: "completed", planHash: "revised-plan",
    review: { findings: [unresolved] } },
};
const exhausted = await journey.read(sessionId);
assert.equal(exhausted.stage, "source_review_nonconvergent");
await assert.rejects(() => journey.run(sessionId), (error) => (
  error.code === "AGENT_SELECTED_JOURNEY_SOURCE_REVIEW_NONCONVERGENT"));
assert.equal(reviewCalls, 2);
assert.equal(revisionCalls, 1);
process.stdout.write("Web Agent source review route: passed\n");
