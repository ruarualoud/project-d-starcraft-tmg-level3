// Specific reproduction: a settled exact-budget journey was stopped by the
// workspace's single writer while another Plan review was running.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createAgentSelectedRosterJourneyV1 } from
  "../packages/roster-planning-workspace/agent-selected-roster-journey-v1.mjs";

const state = JSON.parse(await readFile(process.argv[2], "utf8")).value;
assert.equal(state.status, "paused");
assert.equal(state.currentCandidate.mineralSpent, 2000);
assert.equal(state.arrivalPublicRevision.publicAudit.status,
  "unit_references_verified");
let createCalls = 0;
let planningCalls = 0;
let promoted = 0;
let teach = null;
const sessionId = state.sessionId;
const planId = `agent-selected-${sessionId}`;
const reviewedHash = "a".repeat(64);
const journey = createAgentSelectedRosterJourneyV1({
  iterativeDraft: {
    start: async () => {}, listSessions: async () => [state],
    read: async () => state, prepare: async () => state,
    proposeSchedule: async () => ({ status: "rules_audited" }),
    reviseSchedulePublicPlan: async () =>
      ({ status: "unit_references_verified" }),
    prepareTeachHandoff: async () => ({ fixture: "slot-only" }),
  },
  workspaceService: {
    listSessions: async () => ({ sessions: teach
      ? [{ sessionId: teach.sessionId,
        planningMode: "locked_roster_teach_v1" }] : [] }),
    createAgentSelectedTeachSession: async () => {
      createCalls += 1;
      if (createCalls === 1) throw Object.assign(
        new Error("ROSTER_WORKSPACE_PLANNING_BUSY"),
        { code: "ROSTER_WORKSPACE_PLANNING_BUSY" });
      teach = { sessionId: "slot-fixture-teach", status: "draft",
        setup: { factionRecordKey: state.frozenContext.factionRecordKey,
          mineralBudget: 2000 },
        agentSelectedCandidateHash: state.currentCandidate.candidateHash,
        plan: { planId, planHash: reviewedHash },
        planReview: { status: "completed", planHash: reviewedHash,
          review: { findings: [] } } };
      return teach;
    },
    readSession: () => teach,
    startPlanning: async () => { planningCalls += 1; teach.status = "planned"; },
    reviewFinalPlan: async () => assert.fail("existing review must be retained"),
    revisePlan: async () => assert.fail("no repair needed in slot fixture"),
  },
  promoteTeachPlan: async () => { promoted += 1; },
});
await journey.run(sessionId);
const deadline = Date.now() + 4000;
let result;
do {
  await new Promise((resolve) => setTimeout(resolve, 25));
  result = await journey.read(sessionId);
} while (result.running && Date.now() < deadline);
assert.equal(result.stoppedReason, null,
  "a transient single-writer busy result must not stop the settled journey");
assert.equal(result.stage, "source_review_completed_clean");
assert.equal(createCalls, 2);
assert.equal(planningCalls, 1);
assert.equal(promoted, 1);
console.log(JSON.stringify({ status: "passed", fixture: "workspace-slot-only",
  capturedSession: sessionId, createCalls, planningCalls, promoted,
  providerCalls: 0, originalWorkspaceWrites: 0,
  validatesRosterOrStrategy: false, trainingTruth: false }));
