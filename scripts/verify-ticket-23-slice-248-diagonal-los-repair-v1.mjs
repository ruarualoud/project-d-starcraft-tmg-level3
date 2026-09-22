#!/usr/bin/env node
// Concrete regression: the live Goliath/swarm scene loses all batched LOS
// because a diagonal rectangle has neither the old axis proof nor sample ray.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { evaluateOfficialSpecialTerrainLineOfSightBatchV1 } from
  "../packages/rule-atoms/official-special-terrain-rules-kernel-v1.mjs";
import { createOfficialPhysicalFootprintV1 } from
  "../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";
import { buildStarcraftTmgTacticalRelationshipGraphV1 } from
  "../packages/online-agent-session/tactical-relationship-graph-v1.mjs";

const directory = process.argv.find((arg) => arg.startsWith("--run-directory="))
  ?.slice("--run-directory=".length);
assert(directory, "--run-directory required");
const snapshotPath = path.join(directory, "diagonal-los-regression-snapshot.json");
let snapshot;
try { snapshot = JSON.parse(await readFile(snapshotPath, "utf8")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  const privateState = JSON.parse(await readFile(
    path.join(directory, "runner-private.json"), "utf8"));
  const codec = createStarcraftTmgPrivatePayloadCodec({
    key: privateState.storeEncryptionKeyBase64,
    keyId: `ticket23-slice248-room-store-${path.basename(directory)}`,
    trustLevel: "development_persistent",
  });
  const db = new DatabaseSync(path.join(directory, "room.sqlite"), { readOnly: true });
  try {
    const { envelope } = codec.decode(db.prepare(
      "SELECT aggregate_cipher FROM sc_rooms WHERE room_id = ?"
    ).get(privateState.roomId).aggregate_cipher, `room:${privateState.roomId}:aggregate`);
    snapshot = { stateRevision: envelope.stateRevision, stateHash: envelope.stateHash,
      state: envelope.state };
  } finally { db.close(); }
  // Freeze the failed geometry once: subsequent verification never races the
  // continuing match and contains no private runner credentials.
  await writeFile(snapshotPath, JSON.stringify(snapshot), { mode: 0o600, flag: "wx" });
}
const started = performance.now();
const state = snapshot.state;
const attacker = state.pieces.find((piece) => piece.id === "player1-goliath-1");
const targets = state.pieces.filter((piece) => ["player2-swarmling",
  "player2-raptor", "player2-hydralisk"].includes(piece.id) && piece.isOnField);
const queries = targets.flatMap((target) => target.models.filter((model) =>
  model.isOnField !== false && model.isDestroyed !== true).flatMap((model) => {
  const forward = { queryId: `forward:${model.id}`, actorUnitId: attacker.id,
    attackerModelId: attacker.models[0].id, targetUnitId: target.id,
    targetModelId: model.id };
  return [forward, { queryId: `reverse:${model.id}`, actorUnitId: target.id,
    attackerModelId: model.id, targetUnitId: attacker.id,
    targetModelId: attacker.models[0].id }];
}));
assert(queries.length >= 36, "real swarm model denominator is present");
let batch;
assert.doesNotThrow(() => {
  batch = evaluateOfficialSpecialTerrainLineOfSightBatchV1({ state,
    dataBundle: state.officialTerrainLosDataBundle, queries });
}, "valid diagonal rectangular terrain must not poison the live LOS batch");
for (let index = 0; index < batch.results.length; index += 2) {
  const left = batch.results[index].result;
  const right = batch.results[index + 1].result;
  assert.equal(left.visible, right.visible, "mutual LOS for every real model pair");
  assert.deepEqual(left.blockingTerrainIds, right.blockingTerrainIds);
}
const graph = buildStarcraftTmgTacticalRelationshipGraphV1({ state,
  seatKey: "player1", request: { intent: "inspect",
    subjectUnitIds: [attacker.id], targetIds: targets.map((entry) => entry.id) } });
assert.equal(graph.sourceReceipts.specialTerrainLosBatchFailure, null);
assert(graph.relationships.every((edge) => edge.lineOfSight.unknownModelPairCount === 0));

const { resolveConvexFootprintRectangleTraceV1: trace } = await import(
  "../packages/rule-atoms/convex-footprint-rectangle-trace-v1.mjs");
const base = (id, x, y, shape = "round", rotationDegrees = 0) =>
  createOfficialPhysicalFootprintV1({ objectId: id, kind: "model_base", shape,
    center: { xMilliInches: x, yMilliInches: y },
    widthMilliInches: 1000, depthMilliInches: shape === "round" ? 1000 : 2500,
    rotationDegrees });
const rectangle = { minXMilliInches: 4000, maxXMilliInches: 8000,
  minYMilliInches: 4000, maxYMilliInches: 8000 };
const left = base("left", 1000, 1000);
const right = base("right", 11000, 11000);
assert.equal(trace(left, right, rectangle).kind, "blocked");
assert.equal(trace(right, left, rectangle).kind, "blocked");
assert.equal(trace(base("left-rotated", 1000, 1000, "rectangle", 37),
  right, rectangle).kind, "blocked");
const partial = { ...rectangle, minYMilliInches: 8100, maxYMilliInches: 10100 };
const visible = trace(left, right, partial);
assert.equal(visible.kind, "clear");
assert(visible.minimumSeparatingClearanceMilliInches > 0);
// The only clear normals occupy a narrow interval not covered by cardinal
// base-point sampling; an analytic partition must retain this visibility.
const narrow = { minXMilliInches: 4900, maxXMilliInches: 5100,
  minYMilliInches: -1000, maxYMilliInches: 499 };
assert.equal(trace(base("a", 0, 0), base("b", 10000, 0), narrow).kind, "clear");
assert.equal(trace(base("a", 0, 0), base("b", 10000, 0),
  { ...narrow, maxYMilliInches: 501 }).kind, "blocked");
const reversed = trace(right, left, partial);
assert.equal(reversed.kind, visible.kind);
// Independent certificate: every rectangle corner lies below the returned
// separating line, while both physical-base endpoints lie strictly above it.
for (const result of [visible, reversed]) {
  const dot = (p) => p.xMilliInches * result.normal.x
    + p.yMilliInches * result.normal.y;
  const plane = Math.max(...[partial.minXMilliInches, partial.maxXMilliInches]
    .flatMap((x) => [partial.minYMilliInches, partial.maxYMilliInches]
      .map((y) => dot({ xMilliInches: x, yMilliInches: y }))));
  assert(dot(result.leftWitness) > plane);
  assert(dot(result.rightWitness) > plane);
}
const report = { schema: "ticket23_slice248_diagonal_los_repair_v1", ok: true,
  stateRevision: snapshot.stateRevision, stateHash: snapshot.stateHash,
  realModelPairQueries: queries.length, visibleQueries: batch.results
    .filter((entry) => entry.result.visible).length,
  unknownQueries: 0, realBatchAndAgentGraphVerified: true,
  roundRotatedRectangleNarrowGapAndReciprocityVerified: true,
  elapsedMs: Math.round(performance.now() - started), providerCalls: 0,
  roomMutations: 0, trainingTruth: false };
await writeFile(path.join(directory, "diagonal-los-regression-report.json"),
  `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report));
