// Actual A18 regression: "except Goliath-1 Scatter Missiles" acknowledged the
// projected exposure, but the identity matcher only knew player1-goliath-1 and
// the shared card name Goliath. Exercise the real saved paid text/formation.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodeStarcraftTmgLiveDecisionRecordV1 } from
  "../packages/online-agent-session/sqlite-live-decision-store-v1.mjs";
import { inspectStarcraftTmgFormationThreatClaimsV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argument = name => process.argv.find(value =>
  value.startsWith(`--${name}=`))?.slice(name.length + 3);
const scoped = name => {
  assert(argument(name), `${name} required`);
  const resolved = path.resolve(root, argument(name));
  const relative = path.relative(root, resolved);
  assert(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
  return resolved;
};
const directory = scoped("captured-run-directory");
const receiptPath = scoped("receipt");
const db = new DatabaseSync(path.join(directory, "seats/player2/provider/live-decisions.sqlite"),
  { readOnly: true });
let match;
try {
  match = decodeStarcraftTmgLiveDecisionRecordV1(db.prepare(
    "SELECT record_json FROM sc_live_decision_records").get().record_json);
} finally { db.close(); }
const choice = Object.values(match.decisions).find(entry =>
  entry.authority.stateRevision === 18 && entry.stage === "action"
  && entry.semanticCorrectionFeedbackHistory?.some(feedback =>
    feedback.correction.includes("ACTION_FORMATION_THREAT_CLAIM_CONTRADICTS_PROJECTION")));
assert(choice, "actual A18 failed paid choice required");
const attempts = choice.attemptKeys.map(key => choice.attempts[key])
  .filter(attempt => attempt.safeOutput?.decision);
assert.equal(attempts.length, 3, "capture must contain the three paid correction drafts");
const formation = choice.queryReceipts.find(receipt =>
  Array.isArray(receipt.result?.formationOptions));
const graph = choice.queryReceipts.find(receipt =>
  Array.isArray(receipt.result?.nodes?.units));
assert(formation && graph, "actual saved formation and graph identities required");
const observation = { units: graph.result.nodes.units.map(unit => ({
  unitId: unit.nodeId, unitName: unit.unitName,
  sideKey: unit.sideKey, sideRelation: unit.sideRelation,
})) };
const inspect = (raw, option, spatialObservation = observation) =>
  inspectStarcraftTmgFormationThreatClaimsV1({ raw, selection: raw.selection,
    option, spatialObservation });
const original = JSON.stringify({ attempts, formation, graph });
const receipt = { schemaVersion: "s248_formation_threat_unit_alias_regression_v16",
  choiceKey: choice.choiceKey, stateRevision: 18,
  scope: "actual_paid_threat_claim_seam_not_full_room_or_strategy_admission",
  paidAttempts: attempts.map(attempt => attempt.attemptKey),
  providerCalls: 0, roomWrites: 0, rulesActionsReexecuted: 0,
  trainingTruth: false };
try {
  for (const attempt of attempts) {
    const raw = attempt.safeOutput.decision;
    const option = formation.result.formationOptions.find(entry =>
      entry.formationOptionId === raw.selection.optionId);
    assert(option, "selected original formation required");
    const result = inspect(raw, option);
    assert.equal(result.contradicted, false,
      "an exact numbered unit/weapon exception must retain acknowledged exposure");
    assert(result.incomingTargetIds.includes("player1-goliath-1"),
      "accepting the exception must not erase the projected incoming threat");
  }
  const raw = attempts.at(-1).safeOutput.decision;
  const option = formation.result.formationOptions.find(entry =>
    entry.formationOptionId === raw.selection.optionId);
  const noException = structuredClone(raw);
  noException.intent.expectedEffects = [
    "Hydralisk remains outside all current-round stationary fire bands.",
  ];
  assert.equal(inspect(noException, option).contradicted, true,
    "a genuinely false no-threat claim must still block");
  for (const alias of ["Goliath-2", "Goliath-9"]) {
    const wrongUnit = structuredClone(raw);
    wrongUnit.intent.expectedEffects = [
      `Hydralisk remains outside all current-round stationary fire bands except ${alias} Scatter Missiles.`,
    ];
    assert.equal(inspect(wrongUnit, option).contradicted, true,
      "a different or unknown unit cannot conceal Goliath1 exposure");
  }
  const anotherWeapon = structuredClone(option);
  const row = anotherWeapon.relationshipComparison.relationships.find(entry =>
    entry.targetId === "player1-goliath-1");
  row.enemyCurrentRoundStationaryThreatProfileKeys.push("regression::Autocannon");
  row.enemyStationaryThreatProfileKeys.push("regression::Autocannon");
  row.enemyCurrentRoundStationaryThreatProfileCount += 1;
  row.enemyStationaryThreatProfileCount += 1;
  assert.equal(inspect(raw, anotherWeapon).contradicted, true,
    "excepting Scatter Missiles must not conceal another weapon");
  const ambiguous = { units: [...observation.units, {
    unitId: "player9-goliath-1", unitName: "Goliath", sideKey: "player9",
    sideRelation: "opponent",
  }] };
  assert.equal(inspect(raw, option, ambiguous).contradicted, true,
    "a colliding numbered shorthand must not acquire a guessed side identity");
  assert.equal(JSON.stringify({ attempts, formation, graph }), original,
    "paid outputs, graph and original option unchanged");
  receipt.ok = true;
} catch (error) {
  receipt.ok = false;
  receipt.failure = String(error.message);
  await writeFile(receiptPath, JSON.stringify(receipt, null, 2),
    { flag: "wx", mode: 0o600 });
  throw error;
}
await writeFile(receiptPath, JSON.stringify(receipt, null, 2),
  { flag: "wx", mode: 0o600 });
console.log(JSON.stringify(receipt));
