// Reproduce the actual zero-dispatch revision stop after successful Teach.
// No Provider, source, Room or old journey gate is executed.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createAgentSelectedRosterJourneyV1 } from
  "../packages/roster-planning-workspace/agent-selected-roster-journey-v1.mjs";

const capture = JSON.parse(await readFile(process.argv[2], "utf8"));
const state = capture.state;
let teach = capture.teach;
const calls = { start: 0, promote: 0, revise: 0, review: 0 };
const journey = createAgentSelectedRosterJourneyV1({
  iterativeDraft: {
    start: async () => { throw new Error("must not recreate journey"); },
    listSessions: async () => [state], read: async () => state,
    proposeSchedule: async () => ({ status: "rules_audited" }),
    reviseSchedulePublicPlan: async () => ({ status: "unit_references_verified" }),
  },
  workspaceService: {
    createAgentSelectedTeachSession: async () => {
      throw new Error("must not recreate Teach");
    },
    listSessions: async () => ({ sessions: [teach] }),
    readSession: () => teach,
    startPlanning: async () => { calls.start += 1;
      throw new Error("must not repeat completed Teach"); },
    revisePlan: async (id, request) => {
      calls.revise += 1;
      assert.equal(id, capture.teach.sessionId);
      assert.ok(request.targetedClaimPaths.includes("scoreRoute.fallbackRouteText"));
      teach = { ...teach, status: "planned", failure: null,
        plan: { ...teach.plan, planHash: "a".repeat(64) } };
    },
    reviewFinalPlan: async () => {
      calls.review += 1;
      teach = { ...teach, planReview: { status: "completed",
        planHash: teach.plan.planHash,
        review: { planHash: teach.plan.planHash, findings: [] } } };
    },
  },
  promoteTeachPlan: async () => { calls.promote += 1;
    assert.equal(teach.status, "planned", "failed repair is already promoted"); },
});
await journey.run(state.sessionId);
let result;
for (let i = 0; i < 20; i += 1) {
  result = await journey.read(state.sessionId);
  if (!result.running) break;
  await new Promise((resolve) => setTimeout(resolve, 10));
}
assert.equal(result.stoppedReason, null);
assert.equal(result.stage, "source_review_completed_clean");
assert.deepEqual(calls, { start: 0, promote: 0, revise: 1, review: 1 });
console.log(JSON.stringify({ passed: true, calls, providerCalls: 0,
  originalReviewedPlanHash: capture.teach.plan.planHash,
  preservedRosterAndSchedule: true, newJourneyOrTeach: false }));
