import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgPlayerViewTrajectoryCompilerV1 } from
  "../packages/training-data/player-view-trajectory-v1.mjs";
import { createStarcraftTmgTrainingExportRuntimeV1 } from
  "../packages/training-data/training-export-v1.mjs";
import { createTicket20AgentAgentDemoFixtureV1 } from
  "./support/ticket20-human-agent-demo-fixture-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root,
  "build/ticket-19-slice-200-training-export-v1");

const fixture = await createTicket20AgentAgentDemoFixtureV1({
  root,
  roomId: "ticket19-s200-export-room",
  autoDriveIntervalMs: 1,
});
await fixture.orchestrator.start();
const played = await fixture.orchestrator.run({ maxAdditionalActions: 5 });
assert.equal(played.status, "paused");
const compiler = createStarcraftTmgPlayerViewTrajectoryCompilerV1({
  authorityEngine: fixture.authorityEngine,
  roomStore: fixture.roomRuntime.roomStore,
});
const trajectory = await compiler.compile({
  roomId: fixture.roomId,
  episodeId: "ticket19-s200-export-episode",
  decisionBindings: played.trajectory,
});
const exports = createStarcraftTmgTrainingExportRuntimeV1({
  trajectoryVerifier: compiler.verify,
});

const ndjson = exports.exportNdjson(trajectory);
const fromNdjson = exports.importNdjson(ndjson);
const ndjsonReceipt = exports.verifyRoundTrip(trajectory, fromNdjson);
const muzero = exports.exportMuzero(trajectory);
const fromMuzero = exports.importMuzero(muzero);
const muzeroReceipt = exports.verifyRoundTrip(trajectory, fromMuzero);
const rlds = exports.exportRlds(trajectory);
const fromRlds = exports.importRlds(rlds);
const rldsReceipt = exports.verifyRoundTrip(trajectory, fromRlds);

assert.equal(muzero.interfaceKind,
  "player_view_recurrent_sampled_action");
assert.equal(muzero.records.every((record) =>
  record.behaviourPolicy.probabilityKnown === false), true);
assert.equal(rlds.steps.at(-1).is_truncated, true);
assert.equal(rlds.steps.at(-1).is_terminal, false);

const tamperedMuzero = structuredClone(muzero);
tamperedMuzero.records[0].reward += 1;
assert.throws(() => exports.importMuzero(tamperedMuzero),
  /learner alias reward disagrees/);

const parquet = exports.parquetCapability();
let parquetReceipt = null;
let parquetBytes = null;
if (parquet.available) {
  parquetBytes = exports.exportParquet(trajectory);
  const fromParquet = exports.importParquet(parquetBytes);
  parquetReceipt = exports.verifyRoundTrip(trajectory, fromParquet);
} else {
  assert.throws(() => exports.exportParquet(trajectory),
    /Parquet unavailable/);
}
const envelope = exports.exportEnvelope(trajectory);
assert.equal(envelope.requiredFormats.length, 3);
assert.equal(envelope.optionalFormats[0].available, parquet.available);

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "trajectory.ndjson"), ndjson, "utf8");
await writeFile(path.join(outputDir, "trajectory.muzero.json"),
  `${JSON.stringify(muzero, null, 2)}\n`, "utf8");
await writeFile(path.join(outputDir, "trajectory.rlds.json"),
  `${JSON.stringify(rlds, null, 2)}\n`, "utf8");
if (parquetBytes) {
  await writeFile(path.join(outputDir, "trajectory.parquet"), parquetBytes);
}

const report = {
  schemaVersion: "starcraft_tmg_ticket_19_slice_200_report_v1",
  ticket: 19,
  slice: 200,
  status: "passed",
  trajectoryHash: trajectory.contentIdentity.hash,
  stepCount: trajectory.steps.length,
  roundTrips: {
    ndjson: ndjsonReceipt,
    muzero: muzeroReceipt,
    rlds: rldsReceipt,
    parquet: parquetReceipt,
  },
  bytes: {
    ndjson: Buffer.byteLength(ndjson),
    muzero: Buffer.byteLength(JSON.stringify(muzero)),
    rlds: Buffer.byteLength(JSON.stringify(rlds)),
    parquet: parquetBytes?.length || null,
  },
  parquet,
  checks: {
    allRequiredFormatsLossless: true,
    learnerAliasTamperRejected: true,
    playerViewRecurrentSampledActionPreserved: true,
    fakeParquetFallbackExists: false,
  },
  providerCalls: 0,
  estimatedCostCny: 0,
  sourceRefresh: false,
  eligibleForTraining: false,
  trainingTruth: false,
};
await writeFile(path.join(outputDir, "report.json"),
  `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
