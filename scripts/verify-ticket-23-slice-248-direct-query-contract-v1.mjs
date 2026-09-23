#!/usr/bin/env node
// Concrete c81 bug: a unit-matrix request produces a raw TypeError instead of
// a usable tool contract. Immutable r80 geometry, no live Room/Provider writes.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import * as queryApi from
  "../packages/online-agent-session/spatial-action-query-runtime-v1.mjs";
import { projectStarcraftTmgViewerStateShapeV3 } from
  "../packages/client-domain/viewer-projection-v3.mjs";
import { evaluateOfficialBaseMeasurementV1,
  evaluateOfficialWithinWhollyWithinV1 } from
  "../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/transition-v1.mjs";

const directory = process.argv.find(arg => arg.startsWith("--run-directory="))
  ?.slice("--run-directory=".length);
assert(directory, "--run-directory required");
const privateState = JSON.parse(await readFile(
  path.join(directory, "runner-private.json"), "utf8"));
const codec = createStarcraftTmgPrivatePayloadCodec({
  key: privateState.storeEncryptionKeyBase64,
  keyId: `ticket23-slice248-room-store-${path.basename(directory)}`,
  trustLevel: "development_persistent",
});
const db = new DatabaseSync(path.join(directory, "room.sqlite"), { readOnly: true });
let state;
try {
  state = projectStarcraftTmgViewerStateShapeV3(codec.decode(db.prepare(
    "SELECT checkpoint_cipher FROM sc_checkpoints WHERE room_id=? AND state_revision=80"
  ).get(privateState.roomId).checkpoint_cipher,
  `room:${privateState.roomId}:checkpoint:80`).state);
} finally { db.close(); }
const provider = new DatabaseSync(path.join(directory,
  "seats/player2/provider/live-decisions.sqlite"), { readOnly: true });
let captured;
try {
  const record = JSON.parse(provider.prepare(
    "SELECT record_json FROM sc_live_decision_records").get().record_json);
  const choice = Object.values(record.decisions).find(c => c.authority.stateRevision === 81);
  const call = Object.values(choice.attempts).flatMap(a =>
    a.safeOutput?.providerTurn?.toolCalls || []).find(c =>
    c.name === "query_spatial_rules" && c.arguments?.queryKind === "base_edge_distance");
  captured = JSON.parse(call.arguments.argumentsJson);
} finally { provider.close(); }
const original = structuredClone({ state, captured });
const binding = { roomId: "direct-query-contract-r80-fixture",
  stateRevision: 80, stateHash: hash(state), matchBindingHash: hash("fixture-match"),
  legalSpaceHash: hash("fixture-legal-space") };
const input = { roomProjection: { room: binding,
  matchBinding: { bindingHash: binding.matchBindingHash },
  viewer: { seatKey: "player2", visibilityScope: "player" }, state },
  legalSpace: binding };
let delegatedCalls = 0;
const runtime = queryApi.createStarcraftTmgSpatialActionQueryRuntimeV1({
  rulesQuery: () => { delegatedCalls += 1; throw new Error("unexpected_auto_routing"); },
});
const query = (queryKind, args) => runtime.query({ ...input,
  request: { queryKind, arguments: args } });
const started = performance.now();
const malformed = await query("base_edge_distance", captured);
assert.equal(malformed.reason, "DIRECT_SPATIAL_QUERY_ARGUMENTS_INVALID",
  "captured batched arguments must get a repairable contract, not a raw TypeError");
assert.equal(malformed.status, "unknown");
assert.equal(malformed.result, null);
assert.equal(malformed.geometryEvaluationAttempted, false);
assert.equal(malformed.repairContext.suggestedQuery.queryKind, "space.inspect_relationships");
assert.deepEqual(malformed.repairContext.suggestedQuery.arguments, captured,
  "explicit suggestion preserves all requested units/targets/intent");
assert(malformed.repairContext.expectedArguments.properties.source);
assert(malformed.repairContext.expectedArguments.properties.target);

const source = { kind: "model", unitId: "player2-raptor",
  modelId: "player2-raptor-model-1" };
const target = { kind: "model", unitId: "player1-goliath-1",
  modelId: "player1-goliath-1-model-1" };
const exact = await query("base_edge_distance", { source, target });
assert.equal(exact.status, "exact", exact.reason);
assert.deepEqual(exact.result, evaluateOfficialBaseMeasurementV1({ state,
  dataBundle: state.officialModelBaseGeometryDataBundle, source, target }));
const withinArgs = { source, targetUnitId: "player2-swarmling", rangeMilliInches: 6000 };
const within = await query("within_and_wholly_within", withinArgs);
assert.equal(within.status, "exact", within.reason);
assert.deepEqual(within.result, evaluateOfficialWithinWhollyWithinV1({ state,
  dataBundle: state.officialModelBaseGeometryDataBundle, ...withinArgs }));
for (const [kind, args] of [
  ["base_edge_distance", {}],
  ["base_edge_distance", { source: null, target }],
  ["base_edge_distance", { source: { kind: "unit", unitId: source.unitId }, target }],
  ["within_and_wholly_within", { source, targetUnitId: "player2-swarmling" }],
  ["within_and_wholly_within", { ...withinArgs, rangeMilliInches: -1 }],
]) {
  const result = await query(kind, args);
  assert.equal(result.reason, "DIRECT_SPATIAL_QUERY_ARGUMENTS_INVALID");
  assert.equal(result.geometryEvaluationAttempted, false);
  assert.equal(result.mayApply, false);
}
const missing = await query("base_edge_distance", {
  source, target: { kind: "model", unitId: "not-visible", modelId: "not-visible" },
});
assert.equal(missing.status, "unknown");
assert.equal(missing.reason, "MODEL_BASE_GEOMETRY_REFERENCE_INVALID");
assert.equal(missing.result, null, "unavailable physical reference cannot become a distance");
const tool = queryApi.createStarcraftTmgNativeSpatialQueryToolV1({
  name: "query_spatial_rules",
  queryKinds: ["base_edge_distance", "within_and_wholly_within", "space.inspect_relationships"],
});
const guidance = tool.function.parameters.properties.argumentsJson.description;
for (const value of ["source", "target", "modelId", "targetUnitId", "rangeMilliInches",
  "space.inspect_relationships", "subjectUnitIds", "targetIds"]) assert(guidance.includes(value));
assert.deepEqual(tool.function.parameters.required, ["requestId", "queryKind", "argumentsJson"]);
assert.equal(delegatedCalls, 0, "invalid primitive request cannot silently become another query");
assert.deepEqual({ state, captured }, original);
const report = { schema: "ticket23_slice248_direct_query_contract_v1", ok: true,
  fixtureCheckpointRevision: 80, capturedDecisionRevision: 81,
  capturedFailure: malformed.reason, exactDistanceMilliInches: exact.result.distanceMilliInches,
  canonicalKernelParity: true, withinKernelParity: true, unavailableReferenceRemainsUnknown: true,
  suggestedBatchQueryExecuted: false, nativeToolDescriptorChecked: true,
  elapsedMs: Math.round(performance.now() - started), providerCalls: 0, roomMutations: 0,
  inputUnchanged: true, paidUnits: 0, estimatedCostCny: 0, trainingTruth: false };
await writeFile(path.join(directory, "direct-query-contract-report.json"),
  `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report));
