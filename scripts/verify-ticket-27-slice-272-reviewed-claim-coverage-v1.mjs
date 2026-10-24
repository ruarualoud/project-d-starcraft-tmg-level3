import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRosterPlanningProductModuleV1 } from
  "../packages/product-composition/roster-planning-product-module-v1.mjs";

// Reproduce retained fixed v6: eight High findings in five Goliath paths
// survived an ordinary revision that returned only other purpose changes.
const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const at = arg.indexOf("="); return [arg.slice(2, at), arg.slice(at + 1)];
}));
const root = path.resolve(import.meta.dirname, "..");
const setupCapture = JSON.parse(await readFile(args.capture, "utf8"));
const fixed = JSON.parse(await readFile(args.fixed, "utf8"));
const fresh = setupCapture.sessions.find(session => session.sessionId !== fixed.sessionId);
const originalFixedBytes = await readFile(args.fixed, "utf8");
const temp = await mkdtemp(path.join(root, "build/s272-claim-coverage-bug-"));
await mkdir(path.join(temp, "drafts"));
const sessions = [fixed, fresh];
for (const session of sessions) await writeFile(path.join(temp, "drafts",
  `${session.sessionId}.json`), JSON.stringify(session), { mode: 0o600 });
let localReplies = 0;
const requestedPaths = [];
const replacement = claimPath => `Corrected ${claimPath}: a missing route witness is unknown, `
  + "not proof of unreachability. Preserve conditional tactical options; re-query exact placement in the match.";
const checks = [];
try {
  const product = await createRosterPlanningProductModuleV1({ root,
    fixtureRoot: setupCapture.fixtureRoot, dataDirectory: temp,
    mapConfiguration: setupCapture.mapConfiguration,
    deliberationFactory: {
      descriptor: () => ({ available: true, paidProvider: false,
        modelVersion: "captured-claim-coverage-only" }),
      async createForRun({ sessionId }) {
        const plan = JSON.parse(sessions.find(session => session.sessionId === sessionId).planSerialized);
        return { descriptor: () => ({ available: true }), async deliberate(request) {
          localReplies += 1;
          const paths = request.promptNodes.find(node => node.nodeType === "response-schema")
            ?.content?.requestedClaimPaths;
          if (paths) {
            requestedPaths.push({ sessionId, paths });
            return { output: { schemaVersion: "starcraft_tmg_roster_strategist_deliberation_v1",
              roundKind: "revision", repairs: paths.map(claimPath => ({ claimPath,
                replacementText: replacement(claimPath) })) },
            receipt: { paidProviderCall: false } };
          }
          // Existing ordinary output accepts a partial or empty purpose patch.
          return { output: { schemaVersion: "starcraft_tmg_roster_strategist_deliberation_v1",
            roundKind: "revision", publicSummaryText: plan.publicSummaryText,
            revisedScoreRoute: { routeKind: plan.scoreRoute.routeKind,
              routeText: plan.scoreRoute.routeText, scheduleStatus: plan.scoreRoute.scheduleStatus,
              targetVpSchedule: plan.scoreRoute.targetVpSchedule,
              fallbackRouteText: plan.scoreRoute.fallbackRouteText },
            revisedDeploymentConcept: { deploymentConceptText: plan.deploymentConcept.deploymentConceptText,
              activationOrderStatus: plan.deploymentConcept.activationOrderStatus,
              activationOrder: plan.deploymentConcept.activationOrder,
              reinforcementPolicyText: plan.deploymentConcept.reinforcementPolicyText,
              threatTradeText: plan.deploymentConcept.threatTradeText,
              objectiveControlText: plan.deploymentConcept.objectiveControlText },
            componentPurposeRevisions: [] }, receipt: { paidProviderCall: false } };
        } };
      },
    },
  });
  for (const session of sessions) {
    const before = JSON.parse(session.planSerialized);
    const highs = [...new Set(session.planReview.review.findings.filter(finding =>
      finding.severity === "high").map(finding => finding.claimPath))];
    assert.ok(highs.length > 0, "only a concrete existing reviewed failure is exercised");
    await product.service.revisePlan(session.sessionId, {
      reasonText: "Repair every current reviewed High without rewriting roster or first arrivals.",
      revisedSectionKeys: ["scoreRoute", "deploymentConcept", "componentPurposes", "publicSummaryText"],
      fresh: true,
    });
    for (let i = 0; i < 1000; i += 1) {
      if (product.service.readSession(session.sessionId).status !== "running") break;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    const after = product.service.readSession(session.sessionId);
    assert.equal(after.status, "planned", after.failure?.detail || "revision must complete");
    const request = requestedPaths.find(item => item.sessionId === session.sessionId);
    assert.ok(request, "ordinary revision must enter the shared exact-path claim repair boundary");
    assert.ok(highs.every(claimPath => request.paths.includes(claimPath)),
      "all current High claim paths must be represented once");
    assert.equal(new Set(request.paths).size, request.paths.length);
    assert.ok(request.paths.includes("publicSummaryText"), "the derived summary is explicitly revisited");
    const revised = after.plan;
    assert.deepEqual(revised.rosterCandidate, before.rosterCandidate);
    assert.deepEqual(revised.openingDeploymentSchedule, before.openingDeploymentSchedule);
    assert.deepEqual(revised.scoreRoute.targetVpSchedule, before.scoreRoute.targetVpSchedule);
    for (const purpose of revised.componentPurposes) {
      const claimPath = `componentPurposes.${purpose.instanceId}`;
      assert.equal(purpose.publicPurposeText, request.paths.includes(claimPath)
        ? replacement(claimPath) : before.componentPurposes.find(old => old.instanceId === purpose.instanceId).publicPurposeText);
    }
    checks.push({ sessionId: session.sessionId, schema: revised.schema,
      uniqueHighPaths: highs.length, requestedPaths: request.paths.length,
      lockedRosterAndSchedulePreserved: true });
  }
  assert.equal(await readFile(args.fixed, "utf8"), originalFixedBytes);
  assert.equal(localReplies, 2);
  await writeFile(args.report, JSON.stringify({ ok: true, checks, localFakeReplies: localReplies,
    providerCalls: 0, originalWorkspaceWrites: 0, roomMutations: 0,
    generatedStrategyQualityClaimed: false, trainingTruth: false }, null, 2), { mode: 0o600 });
  console.log("REVIEWED_CLAIM_COVERAGE_OK", JSON.stringify(checks));
} catch (error) {
  await writeFile(args.report, JSON.stringify({ ok: false, failure: error.message, checks,
    providerCalls: 0, originalWorkspaceWrites: 0, roomMutations: 0,
    trainingTruth: false }, null, 2), { mode: 0o600 });
  throw error;
}
