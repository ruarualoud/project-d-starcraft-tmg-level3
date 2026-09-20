#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readStarcraftTmgDurableAgentActionBoundaryV1 } from
  "../packages/online-agent-session/durable-agent-action-boundary-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argument = process.argv.find((entry) =>
  entry.startsWith("--run-directory="));
assert(argument, "--run-directory is required");
const runDirectory = path.resolve(ROOT,
  argument.slice("--run-directory=".length));
const failure = JSON.parse(await readFile(path.join(runDirectory,
  "failure.json"), "utf8"));
const previousStateRevision = Number(
  failure.lastManifest?.room?.stateRevision || 0);
const previousActionCount = Number(failure.actionCount || 0);
const boundary = readStarcraftTmgDurableAgentActionBoundaryV1({
  previousStateRevision,
  previousActionCount,
  roomDatabaseFilename: path.join(runDirectory, "room.sqlite"),
  seatDatabaseFilenames: {
    player1: path.join(runDirectory, "seats/player1/bot-seat.sqlite"),
    player2: path.join(runDirectory, "seats/player2/bot-seat.sqlite"),
  },
});

assert.equal(failure.code, "20");
assert.equal(previousStateRevision, 18);
assert.equal(previousActionCount, 18);
assert.equal(boundary.room.stateRevision, 19);
assert.equal(boundary.room.acceptedTransitionCount, 19);
assert.equal(boundary.totalActionCount, 19);
assert.equal(boundary.totalReplayVerifiedCount, 19);
assert.equal(boundary.atomicBoundarySatisfied, true);
assert.equal(boundary.disposition,
  "restart_control_plane_without_replay");
assert.equal(boundary.duplicateDriveAuthorized, false);
assert.equal(boundary.providerCallAuthorized, false);

process.stdout.write(`${JSON.stringify({
  schema: "ticket23_slice248_durable_action_boundary_verification_v1",
  ok: true,
  reproducedFailure: {
    runnerFailureCode: failure.code,
    runnerObservedStateRevision: previousStateRevision,
    runnerObservedActionCount: previousActionCount,
  },
  boundary,
  providerCalls: 0,
  roomMutations: 0,
  trainingTruth: false,
}, null, 2)}\n`);
