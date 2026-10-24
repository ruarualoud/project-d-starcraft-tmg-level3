import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { inspectStarcraftTmgFormationThreatClaimsV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";

const [capturePath, reportPath] = process.argv.slice(2);
const capture = JSON.parse(await readFile(capturePath, "utf8"));
const beforeHash = hashStarcraftTmgContract(capture);
const inspect = raw => inspectStarcraftTmgFormationThreatClaimsV1({
  raw, queryReceipts: capture.queryReceipts,
  spatialObservation: capture.spatialObservation,
});
if (process.argv.includes("--incoming-denial-only")) {
  // The first post-fix run already passed shorthand/canonical agreement.
  // Only check its newly exposed, unpassed actual incoming-denial clause.
  const complete = inspect(capture.latestPaid.planning);
  assert.equal(complete.contradicted, true);
  assert(complete.contradictions.some(entry => entry.threatFacts.some(fact =>
    fact.targetId === "player2-hydralisk")));
  const outgoing = { publicPlanSummary: { visibleFacts:
    capture.latestPaid.planning.publicPlanSummary.visibleFacts.filter(text =>
      text.startsWith("Hydralisk has no current-round fire band against")),
  } };
  assert.equal(outgoing.publicPlanSummary.visibleFacts.length, 1);
  assert.equal(inspect(outgoing).contradicted, false,
    "an outgoing-fire fact must not be read as absence of incoming fire");
  assert.equal(hashStarcraftTmgContract(capture), beforeHash);
  await writeFile(reportPath, JSON.stringify({
    schemaVersion: "captured_incoming_denial_regression_v1",
    status: "passed", stateRevision: capture.stateRevision,
    originalPaidOutputHash: capture.latestPaid.outputHash,
    genuineIncomingDenialRejected: true,
    outgoingFireFactNotMisread: true,
    originalPaidCaptureUnchanged: true,
    passedAliasChecksRepeated: false,
    providerCalls: 0, roomMutations: 0,
  }, null, 2) + "\n");
  console.log(JSON.stringify({ passed: true, incomingDenialOnly: true }));
  process.exit(0);
}
// These are the actual paid calculations. They name Raptor, not Hydralisk.
const calculation = { publicPlanSummary: {
  calculations: capture.latestPaid.planning.publicPlanSummary.calculations,
} };
const actual = inspect(calculation);
const canonical = structuredClone(calculation);
canonical.publicPlanSummary.calculations = canonical.publicPlanSummary
  .calculations.map(text => text.replaceAll("Raptor",
    "Kerrigan Swarm Raptor (Zergling)"));
const canonicalResult = inspect(canonical);
await writeFile(reportPath, JSON.stringify({
  schemaVersion: "captured_unit_alias_claim_scope_regression_v1",
  stateRevision: capture.stateRevision,
  originalPaidOutputHash: capture.latestPaid.outputHash,
  aliasContradicted: actual.contradicted,
  canonicalContradicted: canonicalResult.contradicted,
  aliasContradictions: actual.contradictions,
  providerCalls: 0, roomMutations: 0,
}, null, 2) + "\n");
assert.equal(canonicalResult.contradicted, false);
assert.equal(actual.contradicted, false,
  "a statement about the unthreatened Raptor must not bind Hydralisk's incoming band");
// The complete same paid output separately denies Hydralisk's actual threat.
// Fixing the shorthand reader must not admit that genuine factual error.
const complete = inspect(capture.latestPaid.planning);
assert.equal(complete.contradicted, true);
assert(complete.contradictions.some(entry => entry.threatFacts.some(fact =>
  fact.targetId === "player2-hydralisk")));
assert.equal(hashStarcraftTmgContract(capture), beforeHash);
await writeFile(reportPath, JSON.stringify({
  schemaVersion: "captured_unit_alias_claim_scope_regression_v1",
  status: "passed", stateRevision: capture.stateRevision,
  originalPaidOutputHash: capture.latestPaid.outputHash,
  shorthandAndCanonicalClaimAgree: true,
  independentHydraliskFalseClaimStillRejected: true,
  originalPaidCaptureUnchanged: true,
  providerCalls: 0, roomMutations: 0,
}, null, 2) + "\n");
console.log(JSON.stringify({ passed: true, stateRevision: capture.stateRevision }));
