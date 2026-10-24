import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { planStarcraftTmgUnavailableFormationRecoveryV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";

const [capturePath, reportPath] = process.argv.slice(2);
if (!capturePath || !reportPath) throw new Error("B111_CAPTURE_REPORT_REQUIRED");
const capture = JSON.parse(await readFile(capturePath, "utf8"));
const choice = capture.selected.at(-1).value;
assert.equal(choice.authority.stateRevision, 111);
assert.equal(choice.status, "provider_output_invalid");
const candidateId = choice.unavailableCandidateIds[0];
const latestAttemptKey = choice.attemptKeys.at(-1);
const latestAttempt = choice.attempts[latestAttemptKey];
assert.equal(latestAttempt.status, "completed");
assert.equal(latestAttempt.stage, "planning");
assert.equal(latestAttempt.safeOutput.recommendedCandidateId, candidateId);
assert.equal(latestAttempt.safeOutput.formationSearchRequested, true);
assert.equal(choice.actionIndex.length, 1);
const before = JSON.stringify(choice);
const recovery = planStarcraftTmgUnavailableFormationRecoveryV1(choice, {
  retryApproved: true, authority: choice.authority,
});
console.log(JSON.stringify({ symptom: "B111_CACHED_FAILURE_NOT_REVALIDATED",
  actionIndexCount: choice.actionIndex.length, protocol: "json_channels_v1",
  selectedCandidateId: candidateId, recoveryCandidateId: recovery?.candidateId || null,
  providerDispatches: 0, originalWrites: 0 }));
assert.equal(recovery?.candidateId, candidateId,
  "B111 completed JSON Planner draft must reach bounded current-solver revalidation");
assert.equal(recovery.attemptKey, latestAttemptKey);
assert.equal(recovery.providerRetryAllowed, false);
assert.equal(recovery.roomMutationAllowed, false);
assert.equal(JSON.stringify(choice), before, "Recovery planning must be pure");
assert.equal(planStarcraftTmgUnavailableFormationRecoveryV1(choice, {
  retryApproved: false, authority: choice.authority,
}), null, "An exhausted choice cannot grant itself another recovery cycle");
assert.equal(planStarcraftTmgUnavailableFormationRecoveryV1(choice, {
  retryApproved: true,
  authority: { ...choice.authority, stateRevision: 112 },
}), null, "The old unknown result is not evidence for a different authority");
assert.equal(planStarcraftTmgUnavailableFormationRecoveryV1({ ...choice,
  warnings: [...choice.warnings, recovery.warning],
}, { retryApproved: true, authority: choice.authority }), null,
"The same implementation may not reopen this failed search indefinitely");
await writeFile(reportPath, JSON.stringify({ ok: true,
  schemaVersion: "slice248_B111_cached_formation_recovery_regression_v1",
  candidateId, attemptKey: recovery.attemptKey, warning: recovery.warning,
  preservesPaidDrafts: true, preservesOriginalAuthority: true,
  providerDispatches: 0, originalWrites: 0 }), { mode: 0o600 });
