#!/usr/bin/env node

// Concrete product defect: the Web Teach session still presents the locked
// temporary preset plan. Source review must see the promoted Agent-selected
// plan, preserving the original Builder choice, map and Rules arrival.
import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp } from "node:fs/promises";
import path from "node:path";

import { createRosterPlanningProductModuleV1 } from
  "../packages/product-composition/roster-planning-product-module-v1.mjs";

const root = path.resolve(import.meta.dirname, "..");
const source = path.join(root, "build/ticket-27-slice-272-iterative-live-v1");
const dataDirectory = await mkdtemp(path.join(root,
  "build/ticket-27-slice-272-web-agent-promotion-"));
await mkdir(path.join(dataDirectory, "iterative-draft/sessions"),
  { recursive: true });
await mkdir(path.join(dataDirectory, "drafts"), { recursive: true });
const iterativeSessionId = "iterative-standard-2000-fresh-c-v1";
const teachSessionId = "agent-selected-teach-standard-2000-fresh-c-v1";
await copyFile(path.join(source, "iterative-draft/sessions",
  "4c758034c8c51f88cda6bec93bd8bde2159b1225bf3130c8acfb7d4a39392b9a.json"),
path.join(dataDirectory, "iterative-draft/sessions",
  "4c758034c8c51f88cda6bec93bd8bde2159b1225bf3130c8acfb7d4a39392b9a.json"));
await copyFile(path.join(source, "drafts", `${teachSessionId}.json`),
  path.join(dataDirectory, "drafts", `${teachSessionId}.json`));

const product = await createRosterPlanningProductModuleV1({ root,
  fixtureRoot: path.resolve(root, "../.."), dataDirectory,
  mapConfiguration: { seedId: "sc1_lost_temple_v1",
    elementSelections: [], passageSelections: [] },
  deliberationFactory: { createForRun: async () => {
    throw new Error("PROMOTION_MUST_NOT_CALL_PROVIDER");
  } },
  enableIterativeDraft: true,
});
assert.equal(typeof product.promoteAgentSelectedTeachForReview, "function");
const before = product.service.readSession(teachSessionId);
assert.equal(before.planningMode, "locked_roster_teach_v1");
const result = await product.promoteAgentSelectedTeachForReview(
  iterativeSessionId, teachSessionId);
const after = product.service.readSession(teachSessionId);
assert.equal(result.plan.planHash, after.plan.planHash);
assert.equal(after.plan.schema, "starcraft_tmg_agent_scheduled_roster_plan_v1");
assert.equal(after.planEvidenceStale, false);
assert.notEqual(after.plan.rosterCandidate.candidateId,
  before.plan.rosterCandidate.candidateId);
assert.deepEqual(after.plan.rosterCandidate.units,
  before.plan.rosterCandidate.units);
assert.deepEqual(after.plan.openingDeploymentSchedule.entries,
  before.plan.openingDeploymentSchedule.entries);
assert.equal(after.planReview, null);
assert.equal(after.trainingTruth, false);
process.stdout.write("agent-selected Web plan promotion: passed\n");
