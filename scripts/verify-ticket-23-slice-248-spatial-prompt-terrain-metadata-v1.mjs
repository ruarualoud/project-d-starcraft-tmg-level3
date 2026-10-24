import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { compactQueryReceiptForPrompt } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { decodeStarcraftTmgGeometryTableV1,
  encodeStarcraftTmgGeometryTableV1,
  deduplicateStarcraftTmgSpatialPromptReceiptsV1 } from
  "../packages/online-agent-session/spatial-query-prompt-projection-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const index = arg.indexOf("=");
  return [arg.slice(2, index), arg.slice(index + 1)];
}));
assert.ok(args.fixture && args.baseline, "explicit private fixture/baseline paths required");
const fixture = JSON.parse(await readFile(args.fixture, "utf8"));
const sourceBefore = JSON.stringify(fixture);
const receipts = fixture.receipts;
assert.equal(receipts.length, 3, "retain the three original r71 queries");
assert.ok(receipts.every((receipt) => receipt.queryKind
  === "space.inspect_relationships" && receipt.result.nodes.terrain.length === 1804));
const projected = receipts.map(compactQueryReceiptForPrompt);
let baseline;
try {
  baseline = JSON.parse(await readFile(args.baseline, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  baseline = { sourceHash: hashStarcraftTmgContract(fixture), projected };
  await writeFile(args.baseline, JSON.stringify(baseline), { mode: 0o600 });
}
assert.equal(hashStarcraftTmgContract(fixture), baseline.sourceHash);

const withoutProof = (records) => records.map((record) => {
  const copy = structuredClone(record);
  if (copy.footprint && typeof copy.footprint === "object"
    && !Array.isArray(copy.footprint)) delete copy.footprint.footprintHash;
  return copy;
});
let originalTerrainBytes = 0;
let projectedTerrainBytes = 0;
for (let index = 0; index < projected.length; index += 1) {
  const before = baseline.projected[index];
  const terrainBefore = decodeStarcraftTmgGeometryTableV1(before.result.nodes.terrain);
  assert.ok(terrainBefore.some((row) => row.footprint?.footprintHash),
    "baseline must contain the observed repeated internal metadata");
  const terrain = decodeStarcraftTmgGeometryTableV1(projected[index].result.nodes.terrain);
  assert.equal(terrain.filter((row) => row.footprint?.footprintHash).length, 0,
    "MODEL_TERRAIN_INTERNAL_HASH_LEAK: do not ask the model to read per-cell proof hashes");
  assert.deepEqual(terrain, withoutProof(terrainBefore),
    "every terrain id/property/coordinate/unknown value remains unchanged");
  const expected = structuredClone(before);
  expected.result.nodes.terrain = projected[index].result.nodes.terrain;
  expected.result.terrainProofMetadataRetainedByHost = true;
  assert.deepEqual(projected[index], expected,
    "only the declared terrain proof metadata projection changes");
  originalTerrainBytes += Buffer.byteLength(JSON.stringify(before.result.nodes.terrain));
  projectedTerrainBytes += Buffer.byteLength(JSON.stringify(projected[index].result.nodes.terrain));
}

const dedup = deduplicateStarcraftTmgSpatialPromptReceiptsV1(projected);
const terrainByReceipt = new Map();
const edgeByReceipt = new Map();
for (let index = 0; index < dedup.length; index += 1) {
  const receipt = dedup[index];
  const terrain = receipt.result.terrainNodesFromReceiptHash
    ? terrainByReceipt.get(receipt.result.terrainNodesFromReceiptHash)
    : decodeStarcraftTmgGeometryTableV1(receipt.result.nodes.terrain);
  assert.ok(terrain, "terrain references point to an earlier included receipt");
  assert.deepEqual(terrain,
    decodeStarcraftTmgGeometryTableV1(projected[index].result.nodes.terrain));
  const edges = [...receipt.result.relationships,
    ...(receipt.result.relationshipReuseRefs || []).map((ref) => {
      const edge = edgeByReceipt.get(ref.sourceReceiptHash)?.get(ref.edgeId);
      assert.ok(edge, "relationship references remain locally resolvable");
      return edge;
    })];
  assert.deepEqual(edges.map((edge) => hashStarcraftTmgContract(edge)).sort(),
    projected[index].result.relationships.map((edge) => hashStarcraftTmgContract(edge)).sort());
  terrainByReceipt.set(receipt.queryReceiptHash, terrain);
  edgeByReceipt.set(receipt.queryReceiptHash,
    new Map(edges.map((edge) => [edge.edgeId, edge])));
}
assert.equal(JSON.stringify(fixture), sourceBefore, "durable source receipts unchanged");
assert.deepEqual(decodeStarcraftTmgGeometryTableV1(
  encodeStarcraftTmgGeometryTableV1(receipts[0].result.nodes.terrain)),
receipts[0].result.nodes.terrain, "generic exact encoder retains ALL source fields");
console.log(JSON.stringify({ passed: true,
  sourceTerrainRowsPerReceipt: 1804, receiptCount: receipts.length,
  originalTerrainBytes, projectedTerrainBytes,
  deduplicatedReceiptBytes: Buffer.byteLength(JSON.stringify(dedup)),
  allOtherProjectedFieldsEqual: true, allReferencesResolvable: true,
  fullDurableReceiptsUnchanged: true, genericExactCodecUnchanged: true,
  providerCalls: 0, originalRoomWrites: 0, trainingTruth: false,
  measuredTokenOrStrategyImprovement: false }));
