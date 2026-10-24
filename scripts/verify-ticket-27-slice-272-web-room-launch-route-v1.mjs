#!/usr/bin/env node

// Repro: the Web roster journey has no route that can hand a reviewed plan
// to a real Room launch host. No Provider or Room is invoked by this gate.
import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRosterPlanningProductModuleV1 } from
  "../packages/product-composition/roster-planning-product-module-v1.mjs";
import { createRosterPlanningWorkspaceHttpAdapterV1,
  ROSTER_PLANNING_WORKSPACE_API_PREFIX } from
  "../packages/roster-planning-workspace/roster-planning-workspace-http-v1.mjs";
import { verifyAgentScheduledRosterPlanRevisionLineageV1 } from
  "../packages/roster-strategist/agent-scheduled-roster-plan-v1.mjs";

let launches = 0;
const adapter = createRosterPlanningWorkspaceHttpAdapterV1({
  service: { descriptor: () => ({}), startPlanning: async () => ({}) },
  iterativeJourney: { descriptor: () => ({}),
    read: async () => ({ teachSessionId: "teach-linked" }) },
  launchRoom: async (sessionId) => {
    launches += 1;
    assert.equal(sessionId, "journey-linked");
    return { roomId: "room-reviewed", joinUrl: "/room/room-reviewed#recovery=opaque" };
  },
});
const result = await adapter.handle({ method: "POST",
  pathname: `${ROSTER_PLANNING_WORKSPACE_API_PREFIX}/iterative/sessions/journey-linked/launch-room`,
  body: {} });
assert.equal(result.status, 201);
assert.equal(result.response.ok, true);
assert.equal(result.response.match.roomId, "room-reviewed");
assert.equal(launches, 1);
const unavailable = createRosterPlanningWorkspaceHttpAdapterV1({
  service: { descriptor: () => ({}), startPlanning: async () => ({}) },
  iterativeJourney: { descriptor: () => ({}),
    read: async () => ({ teachSessionId: "teach-linked" }) },
});
const noHost = await unavailable.handle({ method: "POST",
  pathname: `${ROSTER_PLANNING_WORKSPACE_API_PREFIX}/iterative/sessions/journey-linked/launch-room`,
  body: {} });
assert.equal(noHost.status, 503);
assert.equal(noHost.response.reason,
  "ROSTER_WORKSPACE_ROOM_LAUNCH_UNAVAILABLE");
const root = path.resolve(import.meta.dirname, "..");
const source = path.join(root, "build/ticket-27-slice-272-iterative-live-v1");
const dataDirectory = await mkdtemp(path.join(root,
  "build/ticket-27-slice-272-web-room-launch-"));
await mkdir(path.join(dataDirectory, "drafts"), { recursive: true });
await mkdir(path.join(dataDirectory, "iterative-draft/sessions"),
  { recursive: true });
const iterativeSessionId = "iterative-standard-2000-fresh-b-v1";
const teachSessionId = "agent-selected-teach-standard-2000-fresh-b-v2";
await copyFile(path.join(source, "iterative-draft/sessions",
  "c2277d65fe090b800663ac7c00538d9512e311c7e52b6da37eb46baedf7ec8c0.json"),
path.join(dataDirectory, "iterative-draft/sessions",
  "c2277d65fe090b800663ac7c00538d9512e311c7e52b6da37eb46baedf7ec8c0.json"));
const draftPath = path.join(dataDirectory, "drafts", `${teachSessionId}.json`);
await copyFile(path.join(source, "drafts", `${teachSessionId}.json`),
  draftPath);
const productInput = { root, fixtureRoot: path.resolve(root, "../.."),
  dataDirectory, mapConfiguration: { seedId: "sc1_lost_temple_v1",
    elementSelections: [], passageSelections: [] },
  deliberationFactory: { createForRun: async () => {
    throw new Error("ROOM_LAUNCH_GATE_MUST_NOT_CALL_PROVIDER");
  } }, enableIterativeDraft: true };
const initial = await createRosterPlanningProductModuleV1(productInput);
const bridge = await initial.prepareAgentSelectedTeachPromotion(
  iterativeSessionId, teachSessionId);
const cleanInitialLineage = verifyAgentScheduledRosterPlanRevisionLineageV1({
  initialPlanHash: bridge.plan.planHash,
  initialPlanVersion: bridge.plan.planVersion,
  intermediatePlans: [], finalPlan: bridge.plan,
});
assert.equal(cleanInitialLineage.revisionCount, 0);
assert.throws(() => verifyAgentScheduledRosterPlanRevisionLineageV1({
  initialPlanHash: "0".repeat(64),
  initialPlanVersion: bridge.plan.planVersion,
  intermediatePlans: [], finalPlan: bridge.plan,
}), /AGENT_SCHEDULED_REVISION_LINEAGE_INVALID/);
await initial.promoteAgentSelectedTeachForReview(iterativeSessionId,
  teachSessionId);
const artifact = async (name) => JSON.parse(await readFile(path.join(source,
  name), "utf8"));
const intermediateNames = [
  "agent-selected-teach-f1047bc9848e12ef-claim-repair-v1.json",
  "agent-selected-teach-f1047bc9848e12ef-claim-repair-v2.json",
  "agent-selected-teach-f1047bc9848e12ef-cycle-component-purpose-20260929-claim-repair-v1.json",
];
const intermediate = await Promise.all(intermediateNames.map(artifact));
const final = await artifact(
  "agent-selected-teach-f1047bc9848e12ef-cycle-component-purpose-20260929-claim-repair-v2.json");
const review = await artifact(
  "agent-selected-teach-f1047bc9848e12ef-cycle-component-purpose-20260929-adjudicated-review-v1.json");
const persisted = JSON.parse(await readFile(draftPath, "utf8"));
persisted.planSerialized = JSON.stringify(final.plan);
persisted.generatedPlanHash = final.plan.planHash;
persisted.planVersionHistory = [bridge.plan, ...intermediate.map((entry) =>
  entry.plan)].map((plan) => JSON.stringify(plan));
persisted.planReview = { status: "completed",
  planHash: final.plan.planHash,
  reviewContextVersion: review.reviewContextVersion,
  review, failure: null };
persisted.planEvidenceStale = false;
await writeFile(draftPath, JSON.stringify(persisted));
let launchRequest = null;
const product = await createRosterPlanningProductModuleV1({ ...productInput,
  roomLaunchPort: { async launch(input) {
    launchRequest = input;
    return { roomId: "formal-reviewed-room",
      joinUrl: "/room/formal-reviewed-room#recovery=opaque" };
  } },
});
const launched = await product.handle({ method: "POST",
  pathname: `${ROSTER_PLANNING_WORKSPACE_API_PREFIX}/iterative/sessions/${iterativeSessionId}/launch-room`,
  body: { plan: { planHash: "browser-forgery" } } });
// The retained v5 review is V2, not the current seven-shard V3. Reject it
// before even calling the host adapter; this is not a successful match.
assert.equal(launched.status, 409, JSON.stringify(launched.response));
assert.equal(launched.response.reason,
  "AGENT_SELECTED_ROOM_LAUNCH_NOT_REVIEWED");
assert.equal(launchRequest, null);
process.stdout.write("Web Room route and stale-review rejection: passed\n");
