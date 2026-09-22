#!/usr/bin/env node
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { inspectStarcraftTmgSelectedActionIdentityClaimsV1 as inspect } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";

// Replay the exact paid r51 response locally; never call a Provider or Room.
const runDirectory = process.argv.find((arg) => arg.startsWith("--run-directory="))
  ?.slice("--run-directory=".length);
assert.ok(runDirectory, "--run-directory is required");
const db = new DatabaseSync(path.join(runDirectory,
  "seats/player2/provider/live-decisions.sqlite"), { readOnly: true });
let choice;
try {
  const record = JSON.parse(db.prepare(
    "SELECT record_json FROM sc_live_decision_records").get().record_json);
  choice = Object.values(record.decisions).find((entry) =>
    entry.authority?.stateRevision === 51);
} finally { db.close(); }
assert.ok(choice, "saved revision-51 decision is required");
const attempt = choice.attempts[
  "provider-attempt-763c47f3f03430d38cb442c7288fdaeb9ce3f27159f5ed88dc0a624a62564e09"];
assert.ok(attempt, "original rejected response must be retained");
const raw = attempt.safeOutput.providerTurn.toolCalls[0].arguments;
const spatialActionSpace = {
  finiteActions: choice.actionIndex.filter((entry) => entry.kind === "finite")
    .map((entry) => ({ candidateId: entry.id, action: entry.action })),
  parameterDomains: choice.actionIndex.filter((entry) => entry.kind === "parameterized")
    .map((entry) => entry.action),
};
const inspectValue = (value) => inspect({ spatialActionSpace,
  candidateId: raw.candidateId, stage: "action", value });
const original = inspectValue({ ...raw, assetPlacementSelection: raw.selection });
assert.equal(original.selectedIdentity.effectKind, "creep_token_place");
assert.equal(original.status, "consistent",
  `a threatened existing Omega Worm is not the selected asset: ${JSON.stringify(original.contradictions)}`);

// Same selected identity, different narrative relation: only actual effect
// claims may contradict it. Do not suppress an entire risk paragraph.
const cases = [
  ["selected asset declaration", "Place an Omega Worm on marker-4.", "contradicted"],
  ["effect declaration", "Creep Spread creates an Omega Worm.", "contradicted"],
  ["passive result", "An Omega Worm is placed by this action.", "contradicted"],
  ["comma before wrong effect", "The Goliath threatens this lane, so place an Omega Worm here.", "contradicted"],
  ["risk label is not a bypass", "Accepted exposure: we place an Omega Worm near Goliath.", "contradicted"],
  ["negated alternative", "Place a Creep Tumor, not an Omega Worm.", "consistent"],
  ["asset next to existing unit", "Place a Creep Tumor beside the Omega Worm.", "consistent"],
  ["enemy threat on existing unit", "The enemy can attack the Omega Worm this round.", "consistent"],
  ["existing unit positional reference", "The Omega Worm is already within the enemy fire band.", "consistent"],
  ["Chinese threat context", "敌方火力覆盖欧米伽虫道，本次放置菌毯肿瘤。", "consistent"],
  ["Chinese wrong effect", "本次放置欧米伽虫道。", "contradicted"],
];
for (const [name, publicReason, status] of cases) {
  const result = inspectValue({ selectedReason: "Use Creep Spread.",
    assetPlacementSelection: { publicReason } });
  assert.equal(result.status, status, name);
}
console.log(JSON.stringify({ passed: true, revision: 51,
  originalResponseIdentityStatus: original.status, counterexamples: cases.length,
  fullResponseContentAccepted: false, // the separate standoff claim is not judged here
  providerCalls: 0, roomMutations: 0, costCny: 0 }, null, 2));
