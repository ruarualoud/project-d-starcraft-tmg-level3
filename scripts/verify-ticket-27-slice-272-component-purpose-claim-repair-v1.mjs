// Concrete retained v3 finding: the Marauder's public purpose contradicts
// the reviewed round-1 marker holders. No Provider call or Room mutation.
import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";

import { createRosterPlanningProductModuleV1 } from
  "../packages/product-composition/roster-planning-product-module-v1.mjs";
import { resolveOfficialDevelopmentTrancheFixtureRootV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const root = path.resolve(import.meta.dirname, "..");
const fixtureRoot = await resolveOfficialDevelopmentTrancheFixtureRootV1({
  root,
});
const dataDirectory = path.join(root,
  "build/ticket-27-slice-272-iterative-live-v1");
const stem = "agent-selected-teach-f1047bc9848e12ef";
const { plan } = JSON.parse(await readFile(path.join(dataDirectory,
  `${stem}-claim-repair-v2.json`), "utf8"));
const review = JSON.parse(await readFile(path.join(dataDirectory,
  `${stem}-revised-review-v2.json`), "utf8"));
const claimPath = "componentPurposes.u-marauder-1";
assert.equal(review.planHash, plan.planHash);
assert.equal(review.findings.filter((finding) => (
  finding.severity === "high" && finding.claimPath === claimPath)).length, 1);

const product = await createRosterPlanningProductModuleV1({ root,
  fixtureRoot, dataDirectory,
  mapConfiguration: { seedId: "sc1_lost_temple_v1",
    elementSelections: [], passageSelections: [] },
  deliberationFactory: { createForRun: async () => {
    throw new Error("focused gate must not call Provider");
  } },
  createSessionId: () => "agent-selected-teach-standard-2000-fresh-b-v2",
  enableIterativeDraft: true,
});
const replacementText = "Round-2 Marauder (Supply 2) is the durable Core "
  + "body for marker 3 and an answer to Armoured units near markers 2 or 4. "
  + "The round-1 Goliath u-goliath-1 holds marker 3 until the Marauder "
  + "relieves it; the round-1 Marine remains assigned to marker 1. "
  + "Marker-control VP starts in round 2, the same round this Marauder "
  + "first arrives. These assignments still depend on legal positions "
  + "and can be revised if the opponent contests the route.";
let providerCalls = 0;
const repaired = await product.reviseAgentSelectedTeachPlan({
  iterativeSessionId: "iterative-standard-2000-fresh-b-v1",
  teachSessionId: "agent-selected-teach-standard-2000-fresh-b-v2",
  plan, review, targetedClaimPaths: [claimPath],
  deliberation: {
    descriptor: () => ({ modelVersion: "focused_zero_provider",
      promptVersion: "component_purpose_claim_repair_regression_v1" }),
    deliberate: async () => {
      providerCalls += 1;
      return { output: {
        schemaVersion: "starcraft_tmg_roster_strategist_deliberation_v1",
        roundKind: "revision",
        repairs: [{ claimPath, replacementText }],
      }, receipt: { paidProviderCall: false } };
    },
  },
});
assert.equal(providerCalls, 1, "one local fake answer, no paid Provider");
assert.equal(repaired.plan.componentPurposes.find((item) => (
  item.instanceId === "u-marauder-1")).publicPurposeText, replacementText);
assert.deepEqual(repaired.plan.componentPurposes.filter((item) => (
  item.instanceId !== "u-marauder-1")), plan.componentPurposes.filter((item) => (
  item.instanceId !== "u-marauder-1")));
assert.equal(repaired.plan.rosterCandidate.candidateHash,
  plan.rosterCandidate.candidateHash);
assert.equal(repaired.plan.openingDeploymentSchedule.scheduleHash,
  plan.openingDeploymentSchedule.scheduleHash);
assert.deepEqual(repaired.plan.scoreRoute.targetVpSchedule,
  plan.scoreRoute.targetVpSchedule);
assert.ok(repaired.revisionEvent.revisedSectionKeys.includes(
  "componentPurposes"));
process.stdout.write("AGENT_COMPONENT_PURPOSE_CLAIM_REPAIR_ZERO_PROVIDER_OK\n");
