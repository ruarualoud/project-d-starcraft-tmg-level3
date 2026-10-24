import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRosterPlanningProductModuleV1 } from
  "../packages/product-composition/roster-planning-product-module-v1.mjs";

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const at = arg.indexOf("="); return [arg.slice(2, at), arg.slice(at + 1)];
}));
const root = path.resolve(import.meta.dirname, "..");
const originalBytes = await readFile(args.capture, "utf8");
const captured = JSON.parse(originalBytes);
const session = structuredClone(captured);
const priorReview = session.planReviewHistory[0];
const scheduleReview = session.planReviewHistory[1];
const schedulePlan = session.planVersionHistory.find(serialized =>
  JSON.parse(serialized).planHash === scheduleReview.planHash);
assert.ok(schedulePlan, "actual reviewed schedule version must exist");
const deferredPath = priorReview.review.findings.find(f =>
  f.severity === "high").claimPath;
assert.ok(session.claimRepairHistory[0].coverage.deferredClaimPaths.includes(deferredPath));
assert.ok(!scheduleReview.review.findings.some(f =>
  f.severity === "high" && f.claimPath === deferredPath));
session.planSerialized = schedulePlan;
session.planReview = scheduleReview;
session.planReviewHistory = [priorReview];
session.claimRepairHistory = [session.claimRepairHistory[0]];
session.planVersionHistory = session.planVersionHistory.filter(serialized =>
  JSON.parse(serialized).planVersion < JSON.parse(schedulePlan).planVersion);
session.publicOutputs = [];
session.status = "planned";
session.failure = null;
const temp = await mkdtemp(path.join(root, "build/s272-deferred-claim-bug-"));
await mkdir(path.join(temp, "drafts"));
await writeFile(path.join(temp, "drafts", `${session.sessionId}.json`),
  JSON.stringify(session), { mode: 0o600 });
let requestedPaths;
let localReplies = 0;
const product = await createRosterPlanningProductModuleV1({ root,
  fixtureRoot: args.fixtureRoot, dataDirectory: temp,
  mapConfiguration: JSON.parse(await readFile(args.map, "utf8")),
  deliberationFactory: {
    descriptor: () => ({ available: true, paidProvider: false }),
    async createForRun() {
      return { descriptor: () => ({ available: true }), async deliberate(request) {
        requestedPaths = request.promptNodes.find(node =>
          node.nodeType === "response-schema")?.content?.requestedClaimPaths;
        assert.ok(requestedPaths?.includes(deferredPath),
          "deferred Medic claim must survive the next review's missing High");
        localReplies++;
        return { output: { schemaVersion: "starcraft_tmg_roster_strategist_deliberation_v1",
          roundKind: "revision", repairs: requestedPaths.map(claimPath => ({ claimPath,
            replacementText: `Revised ${claimPath}: this is conditional tactical intent, not a guaranteed Rules outcome. Verify placement and combat in the current match before committing.` })) },
          receipt: { paidProviderCall: false } };
      } };
    },
  },
});
const before = JSON.parse(schedulePlan);
const latestPaths = [...new Set(scheduleReview.review.findings.filter(f =>
  f.severity === "high").map(f => f.claimPath))];
await product.service.revisePlan(session.sessionId, {
  reasonText: "Repair the current cited claims and retained deferred backlog.",
  revisedSectionKeys: ["scoreRoute", "deploymentConcept", "componentPurposes", "publicSummaryText"],
  targetedClaimPaths: latestPaths, fresh: true,
});
while (product.service.readSession(session.sessionId).status === "running") {
  await new Promise(resolve => setTimeout(resolve, 20));
}
const after = product.service.readSession(session.sessionId);
assert.equal(after.status, "planned", after.failure?.detail || JSON.stringify(after.failure));
assert.ok(requestedPaths.includes(deferredPath));
assert.equal(new Set(requestedPaths).size, requestedPaths.length);
assert.deepEqual(after.plan.rosterCandidate, before.rosterCandidate);
assert.deepEqual(after.plan.openingDeploymentSchedule, before.openingDeploymentSchedule);
assert.deepEqual(after.plan.scoreRoute.targetVpSchedule, before.scoreRoute.targetVpSchedule);
assert.notEqual(after.plan.componentPurposes.find(p =>
  `componentPurposes.${p.instanceId}` === deferredPath).publicPurposeText,
  before.componentPurposes.find(p => `componentPurposes.${p.instanceId}` === deferredPath).publicPurposeText);
assert.equal(await readFile(args.capture, "utf8"), originalBytes);
assert.equal(localReplies, 1);
console.log("CAPTURED_DEFERRED_CLAIM_BACKLOG_OK", JSON.stringify({ requestedPaths,
  providerCalls: 0, originalWorkspaceWrites: 0, roomWrites: 0, strategyQualityClaimed: false }));
