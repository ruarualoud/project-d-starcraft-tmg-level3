#!/usr/bin/env node

// Concrete product regression: the Web roster endpoint used the legacy
// bounded planner and could not reach the iterative exact-budget route.
import assert from "node:assert/strict";

import { createRosterPlanningWorkspaceHttpAdapterV1,
  ROSTER_PLANNING_WORKSPACE_API_PREFIX as API } from
  "../packages/roster-planning-workspace/roster-planning-workspace-http-v1.mjs";
import { createAgentSelectedRosterJourneyV1 } from
  "../packages/roster-planning-workspace/agent-selected-roster-journey-v1.mjs";

const calls = [];
const journey = {
  async create(setup) {
    calls.push(["create", setup]);
    return { sessionId: "iterative-web-2000-v1", stage: "selecting_roster",
      exactBudget: false, canEnterRoom: false };
  },
  async list() { return []; },
  async read(sessionId) {
    calls.push(["read", sessionId]);
    return { sessionId, stage: "selecting_roster",
      exactBudget: false, canEnterRoom: false };
  },
  async run(sessionId) {
    calls.push(["run", sessionId]);
    return { sessionId, stage: "selecting_roster", running: true,
      canEnterRoom: false };
  },
  async pause(sessionId) {
    calls.push(["pause", sessionId]);
    return { sessionId, stage: "paused", canEnterRoom: false };
  },
};
const adapter = createRosterPlanningWorkspaceHttpAdapterV1({
  service: { descriptor: () => ({}), startPlanning: async () => ({}) },
  iterativeJourney: journey,
});
const created = await adapter.handle({ method: "POST",
  pathname: `${API}/iterative/sessions`, body: {
    setup: { factionRecordKey: "tactical_cards:terran_armed_forces",
      opponentFactionRecordKey: "tactical_cards:zerg_swarm",
      engagementScale: "Standard", mineralBudget: 2000,
      opponentInformationBoundary: "open_roster" },
  } });
assert.equal(created.status, 201);
assert.equal(created.response.journey.sessionId, "iterative-web-2000-v1");
assert.equal(created.response.journey.canEnterRoom, false);
assert.equal(calls[0][0], "create");
const run = await adapter.handle({ method: "POST",
  pathname: `${API}/iterative/sessions/iterative-web-2000-v1/run`, body: {} });
assert.equal(run.status, 202);
assert.equal(run.response.journey.running, true);
const read = await adapter.handle({ method: "GET",
  pathname: `${API}/iterative/sessions/iterative-web-2000-v1` });
assert.equal(read.response.journey.canEnterRoom, false);
assert.deepEqual(calls.map(([operation]) => operation),
  ["create", "run", "read"]);
let state = null;
let teach = null;
const port = {
  start: async ({ sessionId, factionRecordKey,
    opponentFactionRecordKey, scaleId, mineralBudget }) => {
    state = { sessionId, revision: 0, status: "active",
      blockingFinding: null, iterations: [], observations: [],
      frozenContext: { factionRecordKey, opponentFactionRecordKey,
        scaleId }, mineralBudget, currentCandidate: null, plan: null };
    return structuredClone(state);
  },
  listSessions: async () => [structuredClone(state)],
  read: async () => structuredClone(state),
  resume: async () => {
    state.revision = 1;
    state.status = "paused";
    state.blockingFinding = "ITERATIVE_ROSTER_FINAL_REVIEW_BLOCKED";
    state.currentCandidate = { candidateHash: "candidate-2000",
      mineralSpent: 2000, input: { units: [{ unitInstanceId: "marine-1",
        recordKey: "units:marine", compositionKind: "single",
        upgrades: [] }] } };
    state.plan = { victoryRoute: "Control a certified objective route",
      mapEvidenceHash: "certified-map-receipt" };
    state.iterations.push({ revision: 1, decisionKind: "finish",
      status: "paused" });
    return structuredClone(state);
  },
  pause: async () => structuredClone(state),
  proposeSchedule: async () => {
    state.openingDeploymentSchedule = { entries: [{ round: 1,
      unitInstanceId: "marine-1", publicReasonText: "early marker" }] };
    return { status: "rules_audited_public_plan_revision_required" };
  },
  reviseSchedulePublicPlan: async () => {
    state.arrivalPublicRevision = { publicAudit: {
      status: "unit_references_verified" } };
    return { status: "unit_references_verified" };
  },
  prepareTeachHandoff: async () => ({
    handoffHash: "handoff-2000", iterativeCandidateHash: "candidate-2000",
  }),
};
const workspace = {
  listSessions: async () => ({ sessions: teach ? [{
    sessionId: teach.sessionId, planningMode: "locked_roster_teach_v1",
  }] : [] }),
  readSession: () => structuredClone(teach),
  createAgentSelectedTeachSession: async ({ handoff }) => {
    assert.equal(handoff.handoffHash, "handoff-2000");
    teach = { sessionId: "teach-web-2000-v1", status: "draft",
      agentSelectedCandidateHash: "candidate-2000",
      agentSelectionHandoffHash: "handoff-2000",
      setup: { factionRecordKey: state.frozenContext.factionRecordKey,
        mineralBudget: 2000 } };
    return structuredClone(teach);
  },
  startPlanning: async () => { teach.status = "running";
    return structuredClone(teach); },
};
const realJourney = createAgentSelectedRosterJourneyV1({
  iterativeDraft: port, workspaceService: workspace,
  promoteTeachPlan: async () => ({}),
  createSessionId: () => "iterative-web-repro-v1",
});
await realJourney.create({ engagementScale: "Standard",
  mineralBudget: 2000,
  factionRecordKey: "tactical_cards:terran_armed_forces",
  opponentFactionRecordKey: "tactical_cards:zerg_swarm" });
await realJourney.run("iterative-web-repro-v1");
let progressed;
for (let attempt = 0; attempt < 20; attempt += 1) {
  progressed = await realJourney.read("iterative-web-repro-v1");
  if (!progressed.running) break;
  await new Promise((resolve) => setTimeout(resolve, 5));
}
assert.equal(progressed.stage, "teaching");
assert.equal(progressed.exactBudget, true);
assert.equal(progressed.arrivalPublicAudit.status,
  "unit_references_verified");
assert.equal(progressed.teachSessionId, "teach-web-2000-v1");
assert.equal(progressed.canEnterRoom, false);
process.stdout.write("web iterative roster route: passed\n");
