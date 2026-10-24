#!/usr/bin/env node

// Concrete r68 regression. Reads the retained B Room without changing it or
// calling a Provider; never prints credentials, private state or paid output.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { evaluateOfficialChargeRoundLeadingPathCoverV1 } from
  "../packages/rule-atoms/official-charge-round-path-infeasibility-proof-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV1 } from
  "../packages/product-composition/official-current-product-match-runtime-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV2 } from
  "../packages/product-composition/official-current-product-match-runtime-v2.mjs";
import {
  createOfficialCurrentProductMatchRuntimeV5,
  OFFICIAL_CHARGE_ROUND_PATH_FAILURE_PARAMETER_KIND,
  OFFICIAL_CHARGE_ROUND_PATH_FAILURE_PROOF_KIND,
} from "../packages/product-composition/official-current-product-match-runtime-v5.mjs";
import { resolveOfficialDevelopmentTrancheFixtureRootV1,
  loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const directory = path.resolve(process.argv[2] || "");
assert(directory !== path.parse(directory).root,
  "pass the exact retained B Room directory");
const fork = JSON.parse(readFileSync(path.join(directory,
  "fork-private.json"), "utf8"));
const sourceDirectory = path.resolve(fork.sourceDirectory);
const sourcePrivate = JSON.parse(readFileSync(path.join(sourceDirectory,
  "runner-private.json"), "utf8"));
const codec = createStarcraftTmgPrivatePayloadCodec({
  key: fork.storeEncryptionKeyBase64,
  keyId: `ticket23-slice248-room-store-${path.basename(sourceDirectory)}`,
});
function envelopeAt(filename, roomId, column) {
  const database = new DatabaseSync(filename, { readOnly: true });
  try {
    const row = database.prepare(`SELECT ${column} FROM sc_rooms WHERE room_id=?`)
      .get(roomId);
    assert(row, "frozen Room must exist");
    return codec.decode(row[column], column === "aggregate_cipher"
      ? `room:${roomId}:aggregate`
      : `room:${roomId}:initial-envelope`);
  } finally {
    database.close();
  }
}
const current = envelopeAt(path.join(directory, "room.sqlite"),
  fork.targetRoomId, "aggregate_cipher").envelope;
const original = envelopeAt(path.join(sourceDirectory, "room.sqlite"),
  sourcePrivate.roomId, "initial_envelope_cipher");
assert.equal(current.stateRevision, 68, "concrete B r68 must stay frozen");
const sourceRoot = await resolveOfficialDevelopmentTrancheFixtureRootV1({
  root: path.resolve(import.meta.dirname, ".."),
});
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({
  root: sourceRoot,
});
const startedRuntimeAt = performance.now();
const runtimeV1 = createOfficialCurrentProductMatchRuntimeV1({
  dataset: source.dataset, state: structuredClone(original.state),
});
const runtimeV2 = createOfficialCurrentProductMatchRuntimeV2({
  legacyRuntime: runtimeV1,
});
const runtimeV5 = createOfficialCurrentProductMatchRuntimeV5({
  legacyRuntime: runtimeV2,
});
const runtimeBuildMilliseconds = Math.round(performance.now()
  - startedRuntimeAt);
const proof = evaluateOfficialChargeRoundLeadingPathCoverV1(
  current.state, current.state.pendingAction);
assert.equal(proof.allIntegerEndpointsExcluded, true);
assert.equal(proof.certificateKind,
  "leader_path_blocked_by_occupied_round_base");
assert(proof.excludedByReason.round_blocker_path_too_long > 0);
const domain = runtimeV5.enumerate(current.state, { sideKey: "player2",
  includeDisabled: true, matchBinding: current.matchBinding,
}).parameterDomains.find((entry) =>
  entry.parameterKind === OFFICIAL_CHARGE_ROUND_PATH_FAILURE_PARAMETER_KIND);
assert(domain, "V5 must expose the exact failure domain");
const parameters = { outcome: "failure",
  failureProof: { kind: OFFICIAL_CHARGE_ROUND_PATH_FAILURE_PROOF_KIND } };
const instance = runtimeV5.instantiate(current.state, domain, parameters,
  { matchBinding: current.matchBinding });
const result = runtimeV5.apply(current.state, instance.action,
  { postRevision: 69, matchBinding: current.matchBinding });
assert.equal(result.ok, true);
assert.equal(result.state.pendingAction, undefined);
assert.equal(result.events[0].type, "charge_failed");
assert.deepEqual(result.state.pieces.find((entry) =>
  entry.id === "player2-kerrigan").models.map((entry) =>
  [entry.xInches, entry.yInches]),
current.state.pieces.find((entry) =>
  entry.id === "player2-kerrigan").models.map((entry) =>
  [entry.xInches, entry.yInches]));

const challenge = structuredClone(current.state);
const raptors = challenge.pieces.find((entry) =>
  entry.id === "player2-kerrigan-raptor");
raptors.isOnField = false;
for (const model of raptors.models) model.isOnField = false;
const challengedProof = evaluateOfficialChargeRoundLeadingPathCoverV1(
  challenge, challenge.pendingAction);
assert.equal(challengedProof.allIntegerEndpointsExcluded, false,
  "removing the occupied corridor must remove this failure certificate");
assert.equal(runtimeV5.enumerate(challenge, { sideKey: "player2",
  includeDisabled: true, matchBinding: current.matchBinding,
}).parameterDomains.some((entry) =>
  entry.parameterKind === OFFICIAL_CHARGE_ROUND_PATH_FAILURE_PARAMETER_KIND),
false);

console.log(JSON.stringify({ ok: true, revision: current.stateRevision,
  runtimeBuildMilliseconds,
  proofVersion: proof.schemaVersion,
  examinedCells: proof.examinedCells,
  excludedByReason: proof.excludedByReason,
  runtimeHash: runtimeV5.descriptor.runtimeHash,
  actionType: instance.action.actionType,
  event: result.events[0].type,
  counterfactualAllExcluded: challengedProof.allIntegerEndpointsExcluded,
  providerCalls: 0, roomMutations: 0 }));
