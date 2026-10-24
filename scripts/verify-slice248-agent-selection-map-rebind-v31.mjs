// Captured-source admission check for the retained B Agent-selected roster.
// Do not infer a laboratory-binding failure from another Room's route witness.
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createRosterPlanningProductModuleV1 } from
  "../packages/product-composition/roster-planning-product-module-v1.mjs";
import { createIterativeRosterFileStoreV1 } from
  "../packages/roster-strategist/iterative-roster-file-store-v1.mjs";
import { projectPregameMapPhysicalFactsV1 } from
  "../packages/roster-strategist/pregame-map-evidence-port-v1.mjs";

const cfg = JSON.parse(await readFile(process.argv[2], "utf8"));
const out = path.resolve(process.argv[3]);
const workspace = path.join(out, "workspace");
await mkdir(out, { recursive: true });
try {
const original = JSON.stringify(cfg.iterativeRecord);
const store = createIterativeRosterFileStoreV1({
  directory: path.join(workspace, "iterative-draft"),
});
await store.save(cfg.iterativeRecord.id, cfg.iterativeRecord.value);
const product = await createRosterPlanningProductModuleV1({
  root: cfg.root, fixtureRoot: cfg.fixtureRoot, dataDirectory: workspace,
  mapConfiguration: cfg.mapConfiguration, enableIterativeDraft: true,
  deliberationFactory: {
    availability: () => ({ available: false }),
    createForRun: () => { throw new Error("PROVIDER_FORBIDDEN_IN_REGRESSION"); },
  },
});
const handoff = await product.iterativeDraft.prepareTeachHandoff(
  cfg.iterativeRecord.id);
const fresh = product.mapEvidencePort.summarizeMap({ queryId: "rebind-current" });
assert.equal(handoff.selectedMapRouteReceipt.mapBinding.roomFreezeHash,
  fresh.mapBinding.roomFreezeHash);
assert.deepEqual(projectPregameMapPhysicalFactsV1(cfg.sourceMapSummary),
  projectPregameMapPhysicalFactsV1(fresh));
const session = await product.service.createAgentSelectedTeachSession({
  setup: cfg.setup, handoff,
});
assert.equal(session.agentSelectedCandidateHash, handoff.iterativeCandidateHash);
assert.equal(session.agentSelectionHandoffHash, handoff.handoffHash);
assert.equal(JSON.stringify(cfg.iterativeRecord), original);
for (const alteration of ["freeze", "task"]) {
  const altered = structuredClone(handoff);
  altered.selectedMapRouteReceipt.mapBinding[alteration === "freeze"
    ? "roomFreezeHash" : "missionRecordKey"] = alteration === "freeze"
      ? hash("different-frozen-map") : "different-task";
  await assert.rejects(product.service.createAgentSelectedTeachSession({
    setup: cfg.setup, handoff: altered,
  }), { code: "ROSTER_WORKSPACE_AGENT_SELECTION_CONTEXT_DRIFT" });
}
await writeFile(path.join(out, "verified.private.json"), JSON.stringify({
  status: "passed", selectedCandidateHash: handoff.iterativeCandidateHash,
  originalHandoffHash: handoff.handoffHash,
  originalMapBinding: handoff.selectedMapRouteReceipt.mapBinding,
  currentMapBinding: fresh.mapBinding,
  rejected: ["freeze", "task"], providerCalls: 0,
  liveRoomWrites: 0, originalSourceRewritten: false,
}, null, 2));
console.log(JSON.stringify({ status: "passed", checks: 5,
  providerCalls: 0, liveRoomWrites: 0 }));
} catch (error) {
  await writeFile(path.join(out, "failure.private.json"), JSON.stringify({
    status: "failed", code: error?.code || error?.message,
    stack: error?.stack?.split("\n").slice(0, 7),
    providerCalls: 0, liveRoomWrites: 0,
  }, null, 2));
  process.exitCode = 1;
}
