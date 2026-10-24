import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { inspectStarcraftTmgFormationThreatClaimsV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";

const [capturePath, reportPath] = process.argv.slice(2);
const capture = JSON.parse(await readFile(capturePath, "utf8"));
const choice = capture.selected.at(-1).value;
assert.equal(choice.authority.stateRevision, 111);
const graph = choice.queryReceipts.find(receipt =>
  receipt.queryKind === "space.inspect_relationships").result;
// These are the real, same-state observed unit identities, not ID-prefix guesses.
const spatialObservation = { units: graph.nodes.units.map(node => ({
  ...node, unitId: node.nodeId,
})) };
const formation = choice.queryReceipts.find(receipt =>
  receipt.queryKind === "space.solve_formation").result;
const actions = choice.attemptKeys.map(key => choice.attempts[key])
  .filter(attempt => attempt.stage === "action" && attempt.status === "completed")
  .map(attempt => attempt.safeOutput.decision || attempt.safeOutput);
assert.equal(actions.length, 3);
const inspect = raw => {
  const option = formation.formationOptions.find(entry =>
    entry.formationOptionId === raw.selection.optionId);
  assert.ok(option);
  return inspectStarcraftTmgFormationThreatClaimsV1({ raw,
    selection: raw.selection, option, spatialObservation });
};
const originalFirst = inspect(actions[0]);
assert.equal(originalFirst.contradicted, true,
  "The first reply really claimed safety from all enemies; do not weaken that check");
const corrected = actions.slice(1).map(inspect);
console.log(JSON.stringify({ symptom: "A111_ALL_MARINE_FIRE_MISREAD_AS_ALL_ENEMY_FIRE",
  originalFirstRejected: originalFirst.contradicted,
  correctedRepliesRejected: corrected.map(result => result.contradicted),
  falseAttackerIds: corrected.flatMap(result => result.contradictions
    .flatMap(finding => finding.threatFacts || []).map(fact => fact.attackerId)),
  providerDispatches: 0, originalWrites: 0 }));
for (const result of corrected) assert.equal(result.contradicted, false,
  "A corrected Marine-only claim must not be disproved by acknowledged Goliath fire");
const globalDenial = { ...actions[2], selectedReason:
  "The formation is outside all current-round enemy fire bands, including Marine fire." };
assert.equal(inspect(globalDenial).contradicted, true,
  "An incidental named Marine must not narrow an explicitly whole-enemy denial");
await writeFile(reportPath, JSON.stringify({ ok: true,
  schemaVersion: "slice248_A111_quantified_threat_scope_regression_v1",
  authority: choice.authority, correctedPaidRepliesAccepted: corrected.length,
  genuinelyUniversalClaimsStillRejected: true,
  providerDispatches: 0, originalWrites: 0 }), { mode: 0o600 });
