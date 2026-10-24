import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { inspectStarcraftTmgFormationThreatClaimsV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";

const [capturePath, reportPath] = process.argv.slice(2);
const capture = JSON.parse(await readFile(capturePath, "utf8"));
assert.equal(capture.stateRevision, 67);
const originalHash = hashStarcraftTmgContract(capture);
const inspect = raw => inspectStarcraftTmgFormationThreatClaimsV1({
  raw, queryReceipts: capture.queryReceipts,
  spatialObservation: capture.spatialObservation,
});
const prospective = inspect(capture.latestPaid.planning);
await writeFile(reportPath, JSON.stringify({
  schemaVersion: "captured_prospective_threat_claim_regression_v1",
  stateRevision: capture.stateRevision,
  latestPaidOutputHash: capture.latestPaid.outputHash,
  prospectiveGoalContradicted: prospective.contradicted,
  actualContradictions: prospective.contradictions,
  providerCalls: 0, roomMutations: 0,
}, null, 2) + "\n");
assert.equal(prospective.contradicted, false,
  "an acknowledged existing threat plus a relocation goal is not a denial of the current threat");

// The immediately preceding paid output really denied the current rifle band.
assert.equal(inspect(capture.previousPaid.planning).contradicted, true);
const compound = structuredClone(capture.latestPaid.planning);
compound.plan.strategicApproach.push(
  "Hydralisk currently has no stationary threat profiles against it.");
assert.equal(inspect(compound).contradicted, true,
  "a prospective goal must not hide a separate false present-tense assertion");
const falseFact = structuredClone(capture.latestPaid.planning);
falseFact.publicPlanSummary.calculations.push(
  "Hydralisk is currently outside the stationary fire band.");
assert.equal(inspect(falseFact).contradicted, true);
assert.equal(hashStarcraftTmgContract(capture), originalHash);
await writeFile(reportPath, JSON.stringify({
  schemaVersion: "captured_prospective_threat_claim_regression_v1",
  status: "passed", stateRevision: 67,
  latestPaidOutputHash: capture.latestPaid.outputHash,
  acknowledgedThreatAndFutureGoalAllowed: true,
  previousActualFalseClaimRejected: true,
  independentFalseAssertionRejected: true,
  falseCalculationRejected: true,
  originalPaidOutputsAndEvidenceUnchanged: true,
  providerCalls: 0, roomMutations: 0,
}, null, 2) + "\n");
console.log(JSON.stringify({ passed: true, stateRevision: 67 }));
