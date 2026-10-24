import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { planStarcraftTmgUnavailableFormationRecoveryV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";

const [capturePath, reportPath] = process.argv.slice(2);
const capture = JSON.parse(await readFile(capturePath, "utf8"));
const choice = capture.selected.at(-1).value;
assert.equal(choice.authority.stateRevision, 111);
assert.equal(choice.status, "provider_output_invalid");
const candidateId = choice.unavailableCandidateIds[0];
assert.equal(choice.attempts[choice.attemptKeys.at(-1)]
  .safeOutput.recommendedCandidateId, "");
const matching = choice.attemptKeys.filter(key => {
  const attempt = choice.attempts[key];
  return attempt.status === "completed" && attempt.stage === "planning"
    && attempt.safeOutput.recommendedCandidateId === candidateId
    && attempt.safeOutput.formationSearchRequested === true;
});
assert.equal(matching.length, 1);
const before = JSON.stringify(choice);
const recovery = planStarcraftTmgUnavailableFormationRecoveryV1(choice, {
  retryApproved: true, authority: choice.authority,
});
console.log(JSON.stringify({ symptom: "C111_VALID_PAID_INTENT_HIDDEN_BY_LATER_EMPTY_DRAFT",
  retainedPaidDraftCount: choice.attemptKeys.length,
  expectedReplayAttemptKey: matching[0], replayAttemptKey: recovery?.attemptKey || null,
  providerDispatches: 0, originalWrites: 0 }));
assert.equal(recovery?.candidateId, candidateId,
  "C111 must recover the saved full intention, not invent a choice from the empty later draft");
assert.equal(recovery.attemptKey, matching[0]);
assert.equal(recovery.providerRetryAllowed, false);
assert.equal(recovery.roomMutationAllowed, false);
assert.equal(JSON.stringify(choice), before);
assert.equal(planStarcraftTmgUnavailableFormationRecoveryV1({ ...choice,
  warnings: [...choice.warnings, recovery.warning],
}, { retryApproved: true, authority: choice.authority }), null);
await writeFile(reportPath, JSON.stringify({ ok: true,
  schemaVersion: "slice248_C111_paid_formation_draft_recovery_regression_v1",
  candidateId, replayAttemptKey: recovery.attemptKey,
  retainedPaidDraftCount: choice.attemptKeys.length, preservesOriginalAuthority: true,
  providerDispatches: 0, originalWrites: 0 }), { mode: 0o600 });
