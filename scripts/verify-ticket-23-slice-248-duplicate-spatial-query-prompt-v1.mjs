// Concrete r80 bug: the same exact unit edges were repeated by broad and
// narrow space.inspect_relationships queries, inflating one Planner prompt.
// Full receipts remain in the durable decision record and semantic verifier.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as promptProjection from
  "../packages/online-agent-session/spatial-query-prompt-projection-v1.mjs";
import { compactQueryReceiptForPrompt } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { deduplicateStarcraftTmgSpatialPromptReceiptsV1 } from
  "../packages/online-agent-session/spatial-query-prompt-projection-v1.mjs";

const capturedArgument = process.argv.find((arg) =>
  arg.startsWith("--captured-terrain-receipts="));
if (capturedArgument) {
  const input = JSON.parse(readFileSync(capturedArgument.slice(
    "--captured-terrain-receipts=".length), "utf8"));
  const before = JSON.stringify(input.sourceQueryReceipts);
  const projected = deduplicateStarcraftTmgSpatialPromptReceiptsV1(
    input.sourceQueryReceipts.map(compactQueryReceiptForPrompt));
  const encodedObservation = promptProjection.encodeStarcraftTmgGeometryTableV1
    ? promptProjection.encodeStarcraftTmgGeometryTableV1(input.observationTerrain)
    : input.observationTerrain;
  const estimatedPromptBytes = input.untouchedPromptByteUpperBound
    + Buffer.byteLength(JSON.stringify(encodedObservation))
    + Buffer.byteLength(JSON.stringify(projected))
    + input.requestWrapperHeadroom;
  assert(estimatedPromptBytes <= input.supervisorInputUnitCap,
    `captured r2 request still exceeds supervisor capacity: ${estimatedPromptBytes}`);
  assert.deepEqual(promptProjection.decodeStarcraftTmgGeometryTableV1(
    encodedObservation), input.observationTerrain);
  const byHash = new Map(projected.map((r) => [r.queryReceiptHash, r]));
  for (let i = 0; i < projected.length; i += 1) {
    const receipt = projected[i];
    const source = receipt.result.terrainNodesFromReceiptHash
      ? byHash.get(receipt.result.terrainNodesFromReceiptHash) : receipt;
    assert(source, "referenced terrain collection must exist in this prompt");
    assert.deepEqual(promptProjection.decodeStarcraftTmgGeometryTableV1(
      source.result.nodes.terrain), input.sourceQueryReceipts[i].result.nodes.terrain);
    assert.deepEqual(receipt.result.relationships,
      input.sourceQueryReceipts[i].result.relationships);
    assert.deepEqual(receipt.result.authority,
      input.sourceQueryReceipts[i].result.authority);
    assert.deepEqual(receipt.result.mapReachabilityCertificate,
      input.sourceQueryReceipts[i].result.mapReachabilityCertificate);
    assert.equal(receipt.queryReceiptHash,
      input.sourceQueryReceipts[i].queryReceiptHash);
  }
  assert.equal(JSON.stringify(input.sourceQueryReceipts), before);
  console.log(JSON.stringify({ passed: true, case: "captured_daybreak_r2",
    providerCalls: 0, roomMutations: 0, terrainCount: input.observationTerrain.length,
    oldPromptBytes: input.failedPromptBytes, projectedPromptByteUpperBound:
      estimatedPromptBytes, exactGeometryRoundTrip: true,
    unchangedRelationshipAndAuthorityFacts: true }));
  process.exit(0);
}

const edge = { edgeId: "raptor-to-marine", edgeKind:
    "unit_spatial_relationship", fromUnitId: "raptor",
  toUnitId: "marine", nearestPhysicalEdges: {
    distanceMilliInches: 18_361, precision: "exact_physical_footprints" },
  threats: { fromTo: { stationaryProfileKeys: [] },
    toFrom: { currentRoundStationaryProfileKeys: ["C-14"] } } };
const base = (hash, relationships, aggregates) => ({
  queryKind: "space.inspect_relationships", status: "advisory_estimate",
  queryReceiptHash: hash, result: { relationships,
    nodes: { units: [{ nodeId: "raptor" }, { nodeId: "marine" }] },
    aggregates },
});
const original = [base("a".repeat(64), [edge], { scope: "broad" }),
  base("b".repeat(64), [structuredClone(edge)], { scope: "narrow" })];
const projected = deduplicateStarcraftTmgSpatialPromptReceiptsV1(original);
assert.equal(original[1].result.relationships.length, 1);
assert.equal(projected[0].result.relationships.length, 1);
assert.equal(projected[1].result.relationships.length, 0);
assert.deepEqual(projected[1].result.aggregates, { scope: "narrow" });
assert.deepEqual(projected[1].result.relationshipReuseRefs, [{
  edgeId: "raptor-to-marine", sourceReceiptHash: "a".repeat(64),
}]);
assert.equal(projected[1].queryReceiptHash, "b".repeat(64));
assert.deepEqual(original[1].result.relationships, [edge],
  "durable full receipt must not mutate");
assert(JSON.stringify(projected).length < JSON.stringify(original).length);
console.log(JSON.stringify({ passed: true, providerCalls: 0,
  roomMutations: 0, originalBytes: JSON.stringify(original).length,
  projectedBytes: JSON.stringify(projected).length }));
