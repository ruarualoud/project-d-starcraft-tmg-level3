#!/usr/bin/env node
// Real r39 regression: a legal impassable board piece prevents Cleanup.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { resolveOfficialMissionMarkerControlV2 } from
  "../packages/rule-atoms/official-mission-marker-control-kernel-v1.mjs";
import { createOfficialTerrainPieceV1 } from
  "../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs";

const directory = process.argv.find((arg) => arg.startsWith("--run-directory="))
  ?.slice("--run-directory=".length);
assert(directory, "--run-directory required");
const fixture = path.join(directory, "cleanup-terrain-regression-snapshot.json");
let snapshot;
try { snapshot = JSON.parse(await readFile(fixture, "utf8")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  const privateState = JSON.parse(await readFile(path.join(directory,
    "runner-private.json"), "utf8"));
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
      state: envelope.state, matchBinding: envelope.matchBinding };
  } finally { db.close(); }
  await writeFile(fixture, JSON.stringify(snapshot), { mode: 0o600, flag: "wx" });
}
const started = performance.now();
const state = snapshot.state;
assert.equal(state.phase, "cleanup");
assert(state.board.terrain.some((terrain) => terrain.terrainKind === "impassable"));
const before = JSON.stringify(state);
const options = { matchBinding: snapshot.matchBinding, sideKey: state.firstPlayerSideKey };
let result;
assert.doesNotThrow(() => {
  result = resolveOfficialMissionMarkerControlV2({ state, ...options });
}, "legal impassable terrain must retain its LOS footprint during marker control");
const reference = structuredClone(state);
reference.board.terrain = reference.board.terrain.map((terrain) => ({ ...terrain,
  ...createOfficialTerrainPieceV1({ ...terrain, terrainKind: "ordinary",
    openings: terrain.setupAgreement.openings }) }));
const ordinary = resolveOfficialMissionMarkerControlV2({ state: reference, ...options });
assert.deepEqual(result.markerResults, ordinary.markerResults,
  "movement impassability must not erase or alter the same Size/footprint LOS");
assert.deepEqual(result.grassTerrainIds, state.board.terrain
  .filter((terrain) => terrain.terrainKind === "grass" && !terrain.isRemoved)
  .map((terrain) => terrain.id).sort());
// The current-product runtime calls this V2 kernel directly. Historical V3
// executor wrappers use another binding and are not this Room's action seam.
const ramp = structuredClone(state);
const rampIndex = ramp.board.terrain.findIndex((terrain) => terrain.size === 1);
assert(rampIndex >= 0);
ramp.board.terrain[rampIndex] = { ...ramp.board.terrain[rampIndex],
  terrainKind: "ramp" };
assert.deepEqual(resolveOfficialMissionMarkerControlV2({ state: ramp, ...options }).markerResults,
  result.markerResults, "Size 1 ramp keeps the same footprint-based LOS");
assert.equal(JSON.stringify(state), before, "isolated probe must not mutate the source Room");
// Unsupported kinds still fail closed; the repair is not a catch-and-ignore.
const invalid = structuredClone(state);
invalid.board.terrain[0].terrainKind = "unknown-terrain";
assert.throws(() => resolveOfficialMissionMarkerControlV2({ state: invalid, ...options }),
  /MISSION_MARKER_TERRAIN_KIND_UNSUPPORTED/);

const { advanceCompletedDriveProgressV1 } = await import(
  "../packages/online-agent-session/completed-drive-progress-v1.mjs");
let progress = { stateRevision: 39, actionCount: 32, noProgressCompletions: 0 };
for (let i = 1; i <= 2; i += 1) {
  progress = advanceCompletedDriveProgressV1(progress, { stateRevision: 39, actionCount: 32 });
  assert.equal(progress.noProgressCompletions, i);
}
assert.throws(() => advanceCompletedDriveProgressV1(progress,
  { stateRevision: 39, actionCount: 32 }), /SLICE248_COMPLETED_DRIVES_WITHOUT_PROGRESS/);
assert.equal(advanceCompletedDriveProgressV1(progress,
  { stateRevision: 40, actionCount: 33 }).noProgressCompletions, 0);
const runner = await readFile(new URL("./run-ticket-23-slice-248-agent-agent-web-v1.mjs",
  import.meta.url), "utf8");
assert.match(runner, /completedDriveProgress = advanceCompletedDriveProgressV1/u);
const report = { schema: "ticket23_slice248_cleanup_terrain_repair_v1", ok: true,
  stateRevision: snapshot.stateRevision, terrainCount: state.board.terrain.length,
  markerResults: result.markerResults, currentProductKernelResolved: true,
  liveApplyReplayPending: true,
  completedNoProgressStopsAt: 3, providerCalls: 0, roomMutations: 0,
  elapsedMs: Math.round(performance.now() - started), trainingTruth: false };
await writeFile(path.join(directory, "cleanup-terrain-regression-report.json"),
  `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ...report, markerResults: result.markerResults.map((marker) => ({
  id: marker.markerId, result: marker.result, side: marker.nextControlSideKey,
  supply: marker.supplyTotals })) }));
