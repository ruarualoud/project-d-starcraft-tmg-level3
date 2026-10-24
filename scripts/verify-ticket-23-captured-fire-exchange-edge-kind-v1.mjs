// Concrete A20 producer uses unit_spatial_relationship; combat summary was
// still filtering only the older unit_relationship edge kind.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { buildStarcraftTmgTacticalRelationshipGraphV1 } from
  "../packages/online-agent-session/tactical-relationship-graph-v1.mjs";
import { estimateStarcraftTmgFireZoneExchangeV1 } from
  "../packages/online-agent-session/combat-estimation-runtime-v1.mjs";
const [snapshotPath, capturePath, outputPath] = process.argv.slice(2);
const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
const actual = JSON.parse(await readFile(capturePath, "utf8"));
const state = snapshot.currentEnvelope.state;
const original = JSON.stringify(state);
const authority = actual.queryReceipts[0].authority;
const request = { intent: "fire_zone_exchange", maximumRelations: 128 };
const graph = buildStarcraftTmgTacticalRelationshipGraphV1({
  state, seatKey: "player2", authority, request,
});
const edges = graph.relationships.filter(x => x.edgeKind === "unit_spatial_relationship");
assert(edges.length > 0);
const expected = Object.fromEntries([
  ["ownStationaryProfileCount", "fromStationaryProfileCount"],
  ["enemyStationaryProfileCount", "toStationaryProfileCount"],
  ["ownMoveThenFireProfileCount", "fromMoveThenFireProfileCount"],
  ["enemyMoveThenFireProfileCount", "toMoveThenFireProfileCount"],
].map(([field, key]) => [field, edges.reduce((sum, edge) =>
  sum + Number(edge.fireZoneExchange?.[key] || 0), 0)]));
assert(expected.enemyStationaryProfileCount > 0, "real A20 has incoming enemy fire");
const exchange = estimateStarcraftTmgFireZoneExchangeV1({
  state, seatKey: "player2", authority, request, currentLegalSpaceDomains: [],
});
for (const [field, count] of Object.entries(expected)) {
  assert.equal(exchange.currentGeometry[field], count,
    `combat summary must consume actual producer edge kind for ${field}`);
}
assert.equal(exchange.currentRelationshipGraphHash, graph.relationshipGraphHash);
assert.deepEqual(exchange.currentGeometry.classes,
  [...new Set(edges.map(x => x.fireZoneExchange?.class).filter(Boolean))].sort());
assert.equal(JSON.stringify(state), original);
const report = { passed: true, capturedStateRevision: 20,
  actualRelationshipProducerAndCombatConsumerUsed: true,
  expectedCounts: expected, edgeCount: edges.length,
  graphHashPreserved: true, providerCalls: 0, liveRoomWrites: 0,
  scope: "fire_exchange_geometry_summary_not_attack_probability_numerics",
  trainingTruth: false };
await writeFile(outputPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
console.log(JSON.stringify(report));
