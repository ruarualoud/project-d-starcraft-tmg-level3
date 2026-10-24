// Actual C102 threat requests have the same candidate/parameter transport bug.
// Exercise the real shared runtime and Room adapter, without executing a game.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createStarcraftTmgSpatialActionQueryRuntimeV1 } from
  "../packages/online-agent-session/spatial-action-query-runtime-v1.mjs";
import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from
  "../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs";

const [fixturePath, reportPath] = process.argv.slice(2);
assert(fixturePath && reportPath);
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const captured = JSON.stringify(fixture);
const a = fixture.authority;
assert.equal(a.stateRevision, 102);
assert.equal(fixture.requests.length, 7);
const instantiations = [];
const adapter = createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({
  seatKey: a.seatKey,
  roomStore: { loadRoom: async roomId => {
    assert.equal(roomId, a.roomId);
    return structuredClone(fixture.roomAggregate);
  } },
  rulesRuntime: { instantiate: (state, domain, parameters) => {
    instantiations.push({ domainId: domain.domainId,
      parameters: structuredClone(parameters) });
    // A transport acknowledgement, not a claim of actual Rules legality.
    return { canonicalParameters: parameters, action: {
      actionType: domain.actionType, sideKey: domain.sideKey,
      pieceId: domain.pieceId, targetUnitId: parameters.targetUnitId } };
  } },
});
const runtime = createStarcraftTmgSpatialActionQueryRuntimeV1({
  rulesQuery: adapter.query });
const input = {
  roomProjection: { room: { roomId: a.roomId,
    stateRevision: a.stateRevision, stateHash: a.stateHash },
    matchBinding: { bindingHash: a.matchBindingHash },
    viewer: { seatKey: a.seatKey, visibilityScope: "seat" }, state: {} },
  legalSpace: { roomId: a.roomId, stateRevision: a.stateRevision,
    stateHash: a.stateHash, matchBindingHash: a.matchBindingHash,
    legalSpaceHash: a.legalSpaceHash,
    parameterDomains: fixture.parameterDomains },
};
for (const request of fixture.requests) {
  const receipt = await runtime.query({ ...input, request });
  assert.equal(receipt.status, "exact",
    `${request.requestId}: actual threat query must reach the Room adapter`);
  assert.deepEqual(instantiations.at(-1), {
    domainId: request.arguments.candidateId,
    parameters: { targetUnitId: request.arguments.targetUnitId } });
}
// Preserve the existing canonical proposal form in the same repaired seam.
const first = fixture.requests[0].arguments;
const receipt = await runtime.query({ ...input, request: {
  queryKind: "action_specific_threat", arguments: { proposal: {
    kind: "parameterized", domainId: first.candidateId,
    parameters: { targetUnitId: first.targetUnitId } } },
} });
assert.equal(receipt.status, "exact");
assert.deepEqual(instantiations.at(-1), { domainId: first.candidateId,
  parameters: { targetUnitId: first.targetUnitId } });
assert.equal(JSON.stringify(fixture), captured);
const report = { passed: true, capturedRevision: 102,
  sevenActualThreatRequestsReachRealRoomAdapter: true,
  existingCanonicalProposalPreserved: true,
  fixtureRulesInstantiationOnly: true,
  actualLegalityOrProbabilityNotEvaluated: true,
  providerCalls: 0, originalRoomWrites: 0, trainingTruth: false };
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
console.log(JSON.stringify(report));
