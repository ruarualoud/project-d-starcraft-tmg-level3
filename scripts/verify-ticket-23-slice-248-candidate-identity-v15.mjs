// Concrete A r12 regression: a valid Omega Network candidate was rejected
// three times solely because selected prose omitted the exact ability title.
// Exercise the real exported identity seam against the original paid output.
// No Provider call, Rules execution, room mutation, or broad historical gate.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodeStarcraftTmgLiveDecisionRecordV1 } from
  "../packages/online-agent-session/sqlite-live-decision-store-v1.mjs";
import { inspectStarcraftTmgSelectedActionIdentityClaimsV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argument = name => process.argv.find(value =>
  value.startsWith(`--${name}=`))?.slice(name.length + 3);
function scoped(name) {
  assert(argument(name), `${name} required`);
  const result = path.resolve(root, argument(name));
  const relative = path.relative(root, result);
  assert(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
  return result;
}
const directory = scoped("captured-run-directory");
const receiptPath = scoped("receipt");
const db = new DatabaseSync(path.join(directory, "seats", "player2", "provider",
  "live-decisions.sqlite"), { readOnly: true });
let match;
try {
  match = decodeStarcraftTmgLiveDecisionRecordV1(db.prepare(
    "SELECT record_json FROM sc_live_decision_records").get().record_json);
} finally { db.close(); }
const choice = Object.values(match.decisions).find(entry =>
  entry.authority.stateRevision === 12 && entry.stage === "planning"
  && entry.semanticCorrectionFeedbackHistory?.some(feedback =>
    feedback.correction === "PLANNER_SELECTED_ACTION_IDENTITY_REQUIRED:Omega Network"));
assert(choice, "actual A12 failed paid choice required");
const attempt = choice.attempts[choice.attemptKeys.at(-1)];
assert.equal(attempt.status, "completed");
const raw = attempt.safeOutput;
const originalRaw = JSON.stringify(raw);
const space = {
  finiteActions: choice.actionIndex.filter(row => row.kind === "finite")
    .map(row => ({ candidateId: row.id, action: row.action })),
  parameterDomains: choice.actionIndex.filter(row => row.kind === "parameterized")
    .map(row => row.action),
};
const originalSpace = JSON.stringify(space);
const candidateId = raw.recommendedCandidateId;
const inspect = (value, stage = "planning", spatialActionSpace = space) =>
  inspectStarcraftTmgSelectedActionIdentityClaimsV1({
    spatialActionSpace, candidateId, value, stage,
  });
const receipt = {
  schemaVersion: "s248_authority_candidate_identity_regression_v15",
  choiceKey: choice.choiceKey, stateRevision: 12,
  paidAttemptKey: attempt.attemptKey,
  scope: "actual_paid_reply_identity_seam_not_full_room_or_strategy_admission",
  providerCalls: 0, roomWrites: 0, rulesReexecutions: 0, trainingTruth: false,
};
try {
  const result = inspect(raw);
  assert.equal(result.selectedIdentity.abilityName, "Omega Network");
  assert.equal(result.selectedIdentityMentioned, false,
    "capture must reproduce missing literal title in selected prose");
  assert.equal(result.status, "consistent",
    "unique Rules candidate must bind identity without a repeated prose title");
  assert.equal(result.identityBinding, "rules_candidate_id");
  assert.equal(inspect({ selectedReason: raw.plan.currentGoal }, "action").status,
    "consistent", "Action uses the same authoritative identity contract");
  const missing = inspectStarcraftTmgSelectedActionIdentityClaimsV1({
    spatialActionSpace: space, candidateId: "not-a-current-candidate", value: raw,
  });
  assert.equal(missing.status, "missing_candidate");
  // Narrow negative mutation of the actual domain: an explicit other ability
  // title must still contradict the selected identity, not be silently accepted.
  const other = structuredClone(space.parameterDomains.find(domain =>
    domain.domainId === candidateId));
  other.domainId = "regression-other-ability";
  other.abilityName = "Regression Other Ability";
  const negativeSpace = { ...space,
    parameterDomains: [...space.parameterDomains, other] };
  assert.equal(inspect({ plan: { currentGoal: "Use Regression Other Ability." } },
    "planning", negativeSpace).status, "contradicted");
  assert.equal(inspect({ selectedReason: "Use Regression Other Ability." },
    "action", negativeSpace).status, "contradicted");
  assert.equal(JSON.stringify(raw), originalRaw, "paid output unchanged");
  assert.equal(JSON.stringify(space), originalSpace, "Rules domain unchanged");
  receipt.ok = true;
} catch (error) {
  receipt.ok = false;
  receipt.failure = String(error.message);
  await writeFile(receiptPath, JSON.stringify(receipt, null, 2), {
    flag: "wx", mode: 0o600,
  });
  throw error;
}
await writeFile(receiptPath, JSON.stringify(receipt, null, 2), {
  flag: "wx", mode: 0o600,
});
console.log(JSON.stringify(receipt));
