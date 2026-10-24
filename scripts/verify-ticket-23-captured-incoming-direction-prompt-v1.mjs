// Captured A20: Planner repeatedly reads its empty outgoing fire keys as
// absence of enemy fire onto Kerrigan. Reproduce at the real prompt builder.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { buildStarcraftTmgLivePromptArtifactV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
const [actualPath, builderFixturePath, outputPath] = process.argv.slice(2);
const actual = JSON.parse(await readFile(actualPath, "utf8"));
const original = JSON.stringify(actual);
const fixture = JSON.parse(await readFile(builderFixturePath, "utf8"));
const receipt = actual.queryReceipts[0];
const authority = receipt.authority;
const { match, input, choice } = fixture;
// The reusable builder fixture is not claimed to be the full historic A wire
// request. Only the original A receipt/authority/own-side identity is under test.
input.roomProjection.room = { ...input.roomProjection.room,
  roomId: authority.roomId, stateRevision: authority.stateRevision,
  stateHash: authority.stateHash };
input.roomProjection.matchBinding.bindingHash = authority.matchBindingHash;
input.legalSpace.legalSpaceHash = authority.legalSpaceHash;
input.spatialObservation = { ...authority,
  units: receipt.result.nodes.units.map(unit => ({
    ...unit, unitId: unit.nodeId })),
};
choice.authority = structuredClone(authority);
choice.queryReceipts = structuredClone(actual.queryReceipts);
choice.providerContinuationMessages = [];
const artifactFor = receipts => buildStarcraftTmgLivePromptArtifactV1(match,
  input, choice, 5, receipts, "planning").artifact;
const node = artifactFor(choice.queryReceipts).nodes.find(x =>
  x.nodeId === "current-incoming-fire-facts");
assert(node, "the actual Planner prompt must explicitly name enemy actor and own target");
const sourceRows = receipt.result.relationships.filter(row =>
  row.relation === "opposed");
assert.equal(node.content.relationships.length, sourceRows.length);
for (const row of sourceRows) {
  const found = node.content.relationships.find(x =>
    x.actorUnitId === row.toUnitId && x.targetUnitId === row.fromUnitId);
  assert(found);
  assert.deepEqual(found.currentRoundStationaryProfileKeys,
    row.threats.toFrom.currentRoundStationaryProfileKeys ?? null);
  assert.deepEqual(found.currentRoundMoveThenAttackProfileKeys,
    row.threats.toFrom.currentRoundMoveThenAttackProfileKeys ?? null);
  assert.deepEqual(found.currentRoundStationaryUnknownProfileKeys,
    row.threats.toFrom.currentRoundStationaryUnknownProfileKeys ?? null);
}
const kerrigan = node.content.relationships.find(x =>
  x.targetUnitId === "player2-kerrigan" && x.actorUnitId === "player1-goliath-1");
assert(kerrigan.currentRoundStationaryProfileKeys.some(x =>
  x.endsWith("::Scatter Missiles")));
assert.equal(kerrigan.earliestStationaryAttackHorizon, "current_round");
assert.equal(kerrigan.minimumBaseEdgeDistanceMilliInches, 22000);
assert.equal(node.content.strategyPreferenceApplied, false);
const missing = structuredClone(choice.queryReceipts);
delete missing[0].result.relationships.find(x =>
  x.fromUnitId === "player2-kerrigan" && x.toUnitId === "player1-goliath-1")
  .threats.toFrom.currentRoundStationaryProfileKeys;
assert.equal(artifactFor(missing).nodes.find(x =>
  x.nodeId === "current-incoming-fire-facts").content.relationships.find(x =>
  x.targetUnitId === "player2-kerrigan" && x.actorUnitId === "player1-goliath-1")
  .currentRoundStationaryProfileKeys, null);
const stale = structuredClone(choice.queryReceipts);
stale[0].authority.stateRevision -= 1;
assert.equal(artifactFor(stale).nodes.some(x =>
  x.nodeId === "current-incoming-fire-facts"), false);
assert.equal(JSON.stringify(actual), original);
const report = { passed: true, actualPromptBuilderUsed: true,
  capturedStateRevision: 20, everyOpposedRowForwardedExactly: true,
  incomingEnemyActorOwnTargetExplicit: true, outgoingFireNotIncomingFire: true,
  missingFieldsStayUnknown: true, staleEvidenceNotPromoted: true,
  strategyPreferenceApplied: false, providerCalls: 0, roomWrites: 0,
  scope: "actual_A_receipt_projection_not_full_historical_prompt_or_model_quality",
  trainingTruth: false };
await writeFile(outputPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
console.log(JSON.stringify(report));
