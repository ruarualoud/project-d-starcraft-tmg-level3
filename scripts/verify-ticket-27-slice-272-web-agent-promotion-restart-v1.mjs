#!/usr/bin/env node

// Concrete restart defect: promoting a locked Teach plan must not erase the
// original plan/receipt needed to reproduce the Agent-selected bridge.
import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp } from "node:fs/promises";
import path from "node:path";

import { createRosterPlanningProductModuleV1 } from
  "../packages/product-composition/roster-planning-product-module-v1.mjs";

const root = path.resolve(import.meta.dirname, "..");
const source = path.join(root, "build/ticket-27-slice-272-iterative-live-v1");
const dataDirectory = await mkdtemp(path.join(root,
  "build/ticket-27-slice-272-web-agent-promotion-restart-"));
await mkdir(path.join(dataDirectory, "iterative-draft/sessions"),
  { recursive: true });
await mkdir(path.join(dataDirectory, "drafts"), { recursive: true });
const iterativeSessionId = "iterative-standard-2000-fresh-c-v1";
const teachSessionId = "agent-selected-teach-standard-2000-fresh-c-v1";
const iterativeFile =
  "4c758034c8c51f88cda6bec93bd8bde2159b1225bf3130c8acfb7d4a39392b9a.json";
await copyFile(path.join(source, "iterative-draft/sessions", iterativeFile),
  path.join(dataDirectory, "iterative-draft/sessions", iterativeFile));
await copyFile(path.join(source, "drafts", `${teachSessionId}.json`),
  path.join(dataDirectory, "drafts", `${teachSessionId}.json`));

async function openProduct() {
  return createRosterPlanningProductModuleV1({ root,
    fixtureRoot: path.resolve(root, "../.."), dataDirectory,
    mapConfiguration: { seedId: "sc1_lost_temple_v1",
      elementSelections: [], passageSelections: [] },
    deliberationFactory: { createForRun: async () => {
      throw new Error("RESTART_PROOF_MUST_NOT_CALL_PROVIDER");
    } },
    enableIterativeDraft: true,
  });
}

const first = await openProduct();
const before = first.service.readSession(teachSessionId);
const initialBridge = await first.prepareAgentSelectedTeachPromotion(
  iterativeSessionId, teachSessionId);
await first.promoteAgentSelectedTeachForReview(iterativeSessionId,
  teachSessionId);

const restarted = await openProduct();
const after = restarted.service.readSession(teachSessionId);
const restoredBridge = await restarted.prepareAgentSelectedTeachPromotion(
  iterativeSessionId, teachSessionId);
assert.equal(after.plan.schema,
  "starcraft_tmg_agent_scheduled_roster_plan_v1");
assert.equal(after.lockedTeachSourcePlan?.planHash, before.plan.planHash);
assert.equal(after.lockedTeachSourceSessionReceipt?.receiptHash,
  before.evidence.sessionReceipt.receiptHash);
assert.equal(restoredBridge.bridgeHash, initialBridge.bridgeHash);
assert.equal(restoredBridge.sessionReceipt.receiptHash,
  initialBridge.sessionReceipt.receiptHash);
const again = await restarted.promoteAgentSelectedTeachForReview(
  iterativeSessionId, teachSessionId);
assert.equal(again.plan.planHash, after.plan.planHash);
process.stdout.write("Agent-selected promotion restart: passed\n");
