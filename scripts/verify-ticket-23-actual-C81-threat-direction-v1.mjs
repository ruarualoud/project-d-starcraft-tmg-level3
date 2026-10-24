import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { inspectStarcraftTmgFormationThreatClaimsV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";

const [capturePath, reportPath] = process.argv.slice(2);
const captureText = await readFile(capturePath, "utf8");
const capture = JSON.parse(captureText);
assert.equal(capture.authority.stateRevision, 81);
const inspect = raw => inspectStarcraftTmgFormationThreatClaimsV1({
  raw, queryReceipts: capture.queryReceipts,
  spatialObservation: capture.spatialObservation,
  plannerSelectedAction: capture.actionIndex.find(entry =>
    entry.id === raw.recommendedCandidateId)?.action,
});
const results = capture.attempts.map(attempt => inspect(attempt.planning));
await writeFile(reportPath, JSON.stringify({
  status: "observed", stateRevision: 81,
  contradictions: results.map(result => result.contradictions),
  providerCalls: 0, roomMutations: 0,
}, null, 2));
assert.equal(results.length, 2);
for (const result of results) {
  assert.equal(result.contradicted, false,
    "unit possesses no profiles does not assert absence of incoming enemy fire");
  assert.equal(result.advisoryFindings.filter(finding =>
    finding.reasonCode === "threat_profile_direction_unspecified").length, 2);
}
const raw = capture.attempts.at(-1).planning;
const incoming = text => {
  const changed = structuredClone(raw);
  changed.candidateComparisons[1].evaluation = text;
  return inspect(changed);
};
assert.equal(incoming("Queen has no current threat profiles against it.")
  .contradicted, true);
assert.equal(incoming("Queen is not currently threatened by current-round stationary fire.")
  .contradicted, true);
assert.equal(incoming("Queen has no current threat profiles; Queen is outside the enemy fire band.")
  .contradicted, true,
  "direction ambiguity cannot hide an independent incoming safety assertion");
assert.equal(await readFile(capturePath, "utf8"), captureText);
await writeFile(reportPath, JSON.stringify({
  schemaVersion: "actual_C81_threat_direction_regression_v1",
  status: "passed", stateRevision: 81,
  paidOutputHashes: capture.attempts.map(attempt => attempt.outputHash),
  originalPaidRepliesAllowedWithDirectionWarnings: true,
  actualIncomingDenialStillRejected: true,
  separateFalseSafetyStillRejected: true,
  originalCaptureUnchanged: true,
  providerCalls: 0, roomMutations: 0,
}, null, 2) + "\n");
console.log(JSON.stringify({ passed: true, stateRevision: 81 }));
