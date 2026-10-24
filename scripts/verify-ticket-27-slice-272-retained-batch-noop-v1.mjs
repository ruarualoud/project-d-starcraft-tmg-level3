// Concrete paid-reply incident: one of eight coordinated claim replacements
// was unchanged. Keep the other seven corrections and expose the no-op path
// for independent review; never buy the same repair response again.
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
const stem = "agent-selected-teach-5c6f47fe6a92c230";
const read = async (name) => JSON.parse(await readFile(path.join(
  dataDirectory, `${stem}-${name}.json`), "utf8"));
const { plan } = await read("claim-repair-v2");
const review = await read("revised-review-v2");
const retained = await read("claim-repair-retained-v3");
const paths = [...new Set(review.findings.filter((finding) =>
  finding.severity === "high").map((finding) => finding.claimPath))];
assert.equal(plan.planHash, review.planHash);
assert.equal(paths.length, 8);
assert.equal(retained.paidProviderCall, true);
assert.deepEqual(new Set(retained.sanitizedOutput.repairs.map((item) =>
  item.claimPath)), new Set(paths));

const product = await createRosterPlanningProductModuleV1({ root,
  fixtureRoot, dataDirectory,
  mapConfiguration: { seedId: "sc1_lost_temple_v1",
    elementSelections: [], passageSelections: [] },
  deliberationFactory: { createForRun: async () => {
    throw new Error("retained-reply gate must not call Provider");
  } },
  createSessionId: () => "agent-selected-teach-standard-2000-fresh-c-v1",
  enableIterativeDraft: true,
});
let replayCount = 0;
const repaired = await product.reviseAgentSelectedTeachPlan({
  iterativeSessionId: "iterative-standard-2000-fresh-c-v1",
  teachSessionId: "agent-selected-teach-standard-2000-fresh-c-v1",
  plan, review, targetedClaimPaths: paths,
  deliberation: {
    descriptor: () => ({ modelVersion: "retained_paid_reply",
      promptVersion: "retained_batch_noop_regression_v1" }),
    deliberate: async (request) => {
      replayCount += 1;
      assert.equal(request.contextHash, retained.contextHash);
      return { output: retained.sanitizedOutput,
        receipt: { receiptHash: retained.receiptHash,
          retainedPaidReplyReplay: true } };
    },
  },
});
assert.equal(replayCount, 1);
assert.deepEqual(repaired.unchangedRequestedClaimPaths,
  ["componentPurposes.player1-exact-repair-2-upgrade-4"]);
assert.equal(repaired.plan.planVersion, plan.planVersion + 1);
assert.equal(repaired.plan.rosterCandidate.candidateHash,
  plan.rosterCandidate.candidateHash);
assert.equal(repaired.plan.openingDeploymentSchedule.scheduleHash,
  plan.openingDeploymentSchedule.scheduleHash);
assert.deepEqual(repaired.plan.scoreRoute.targetVpSchedule,
  plan.scoreRoute.targetVpSchedule);
assert.notEqual(repaired.plan.planHash, plan.planHash);
process.stdout.write("RETAINED_BATCH_NOOP_ZERO_PROVIDER_OK\n");
