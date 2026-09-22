#!/usr/bin/env node
// Captured c75: avoidance alternatives drop the Planner's marker/screen targets.
// Replay the actual comparison boundary, not the whole expensive search.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { projectStarcraftTmgFormationRelationshipComparisonV1 as compare } from
  "../packages/online-agent-session/legal-formation-search-v1.mjs";

const directory = process.argv.find((arg) => arg.startsWith("--run-directory="))
  ?.slice("--run-directory=".length);
assert(directory, "--run-directory required");
const privateState = JSON.parse(await readFile(
  path.join(directory, "runner-private.json"), "utf8"));
const codec = createStarcraftTmgPrivatePayloadCodec({
  key: privateState.storeEncryptionKeyBase64,
  keyId: `ticket23-slice248-room-store-${path.basename(directory)}`,
  trustLevel: "development_persistent",
});
const room = new DatabaseSync(path.join(directory, "room.sqlite"), { readOnly: true });
let state;
try {
  state = codec.decode(room.prepare(
    "SELECT checkpoint_cipher FROM sc_checkpoints WHERE room_id=? AND state_revision=72"
  ).get(privateState.roomId).checkpoint_cipher,
  `room:${privateState.roomId}:checkpoint:72`).state;
} finally { room.close(); }
// The immutable r72 fixture retains this actor/marker geometry. It does not
// recreate r75's later Marine3 deployment or certify that full game decision.
const provider = new DatabaseSync(path.join(directory,
  "seats/player2/provider/live-decisions.sqlite"), { readOnly: true });
let choice;
try {
  const record = JSON.parse(provider.prepare(
    "SELECT record_json FROM sc_live_decision_records"
  ).get().record_json);
  choice = Object.values(record.decisions).find((entry) =>
    entry.authority?.stateRevision === 75);
} finally { provider.close(); }
assert(choice?.plannerResult, "captured c75 Planner required");
const source = choice.actionIndex.find((entry) =>
  entry.id === choice.plannerResult.recommendedCandidateId).action;
const receipt = choice.queryReceipts.find((entry) =>
  entry.queryKind === "space.solve_formation");
const originalObjectives = choice.plannerResult.formationSearchRequest.formationObjectives;
const baseline = choice.queryReceipts.find((entry) =>
  entry.queryKind === "space.inspect_relationships").result;
const alternatives = receipt.result.formationOptions.filter((option) =>
  option.patternId === "intent-solver:isolate-avoid_threat");
assert.equal(alternatives.length, 3);
assert(alternatives.every((option) => !option.relationshipComparison.relationships
  .some((edge) => edge.targetId === "mission-marker-5")),
"retain captured missing target evidence");
const before = structuredClone({ state, source, originalObjectives, alternatives });
const started = performance.now();
const results = [];
for (const option of alternatives) {
  const input = { state, source, slots: option.slots,
    objectives: option.formationObjectives, baseline };
  const original = compare(input);
  const result = compare({ ...input, comparisonObjectives: originalObjectives });
  assert.equal(result.status, "available", result.reason);
  const marker = result.relationships.find((edge) =>
    edge.targetId === "mission-marker-5");
  assert(marker, "every alternative must preserve the Planner's marker comparison");
  assert(Number.isFinite(marker.minimumBaseEdgeDistanceMilliInches));
  const screen = result.relationships.find((edge) =>
    edge.targetId === "player2-hydralisk");
  assert(screen, "every alternative must preserve the Planner's screen target");
  assert.equal(screen.enemyStationaryThreatProfileCount, 0,
    "an added friendly comparison must not become hostile fire");
  for (const edge of original.relationships) {
    assert.deepEqual(result.relationships.find((entry) => entry.edgeId === edge.edgeId),
      edge, "existing geometry and threat facts remain unchanged");
  }
  results.push({ optionId: option.formationOptionId,
    markerDistanceMilliInches: marker.minimumBaseEdgeDistanceMilliInches,
    preservedEdges: original.relationships.length,
    comparedEdges: result.relationships.length });
}
assert.deepEqual({ state, source, originalObjectives, alternatives }, before,
  "comparison cannot alter the Room, slots, weights, scores or stored results");
const report = { schema: "ticket23_slice248_formation_common_targets_v1", ok: true,
  fixtureStateRevision: 72, capturedDecisionRevision: 75,
  sameRoomActionReaccepted: false, results,
  searchRegenerated: false, scoresAndPlacementsUnchanged: true,
  elapsedMs: Math.round(performance.now() - started),
  providerCalls: 0, roomMutations: 0, trainingTruth: false };
await writeFile(path.join(directory, "formation-common-targets-report.json"),
  `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report));
