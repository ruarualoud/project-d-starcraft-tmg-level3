// Reproduce the seven actual C102 requests rejected before probability dispatch.
// The adapter below observes transport only; it does not invent numeric evidence.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import {
  createStarcraftTmgNativeSpatialQueryToolV1,
  createStarcraftTmgSpatialActionQueryRuntimeV1,
} from "../packages/online-agent-session/spatial-action-query-runtime-v1.mjs";

const [fixturePath, reportPath] = process.argv.slice(2);
assert(fixturePath && reportPath);
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const captured = JSON.stringify(fixture);
const a = fixture.authority;
assert.equal(a.stateRevision, 102);
assert.equal(fixture.requests.length, 7);
const input = {
  roomProjection: {
    room: { roomId: a.roomId, stateRevision: a.stateRevision,
      stateHash: a.stateHash },
    matchBinding: { bindingHash: a.matchBindingHash },
    viewer: { seatKey: a.seatKey, visibilityScope: "seat" },
    state: {},
  },
  legalSpace: { roomId: a.roomId, stateRevision: a.stateRevision,
    stateHash: a.stateHash, matchBindingHash: a.matchBindingHash,
    legalSpaceHash: a.legalSpaceHash,
    parameterDomains: fixture.parameterDomains },
};
const observed = [];
const runtime = createStarcraftTmgSpatialActionQueryRuntimeV1({
  rulesQuery: async request => {
    const args = request.arguments;
    observed.push(structuredClone(request));
    const domain = args.currentLegalSpaceDomain;
    const valid = domain?.domainId === args.domainId
      && domain?.sideKey === a.seatKey
      && typeof args.parameters?.targetUnitId === "string";
    return { ok: true, authority: request.authority,
      precision: valid ? "advisory_estimate" : "unknown",
      reason: valid ? null : "RULES_QUERY_CURRENT_DOMAIN_MISSING",
      // This acknowledgement is deliberately not a combat estimate.
      result: valid ? { transportAcknowledged: true,
        domainId: domain.domainId,
        targetUnitId: args.parameters.targetUnitId } : null };
  },
});

for (const request of fixture.requests) {
  const receipt = await runtime.query({ ...input, request });
  assert.equal(receipt.status, "advisory_estimate",
    `${request.requestId}: actual candidateId/flat target must reach the adapter`);
  const args = observed.at(-1).arguments;
  const domain = fixture.parameterDomains.find(entry =>
    entry.domainId === request.arguments.candidateId);
  assert(domain);
  assert.equal(args.domainId, domain.domainId);
  assert.deepEqual(args.currentLegalSpaceDomain, domain);
  assert.deepEqual(args.parameters, {
    targetUnitId: request.arguments.targetUnitId });
  assert.equal(receipt.mayApply, false);
  assert.equal(receipt.trainingTruth, false);
}

const first = fixture.requests[0];
const canonicalArgs = { domainId: first.arguments.candidateId,
  parameters: { targetUnitId: first.arguments.targetUnitId }, sampleBudget: 216 };
await runtime.query({ ...input, request: { queryKind: "attack_probability",
  arguments: canonicalArgs } });
assert.deepEqual(observed.at(-1).arguments.parameters, canonicalArgs.parameters);
assert.equal(observed.at(-1).arguments.sampleBudget, 216);

// Malformed aliases are correctable requests, not guessed targets or action
// authority. Conflicting declarations must not silently choose one value.
const callsBeforeInvalid = observed.length;
for (const arguments_ of [
  { ...first.arguments, domainId: fixture.requests[1].arguments.candidateId },
  { ...first.arguments, parameters: { targetUnitId: "different-target" } },
  { candidateId: "not-a-current-domain", targetUnitId: "anything" },
]) {
  const receipt = await runtime.query({ ...input, request: {
    queryKind: "attack_probability", arguments: arguments_ } });
  assert.equal(receipt.status, "unknown");
  assert.equal(receipt.findingSeverity, "Medium");
  assert.equal(receipt.repairContext.suggestionExecuted, false);
}
assert.equal(observed.length, callsBeforeInvalid);

const spoofed = await runtime.query({ ...input, request: {
  queryKind: "attack_probability", arguments: { ...first.arguments,
    currentLegalSpaceDomain: { domainId: "spoofed", sideKey: "player2" } },
} });
assert.equal(spoofed.status, "advisory_estimate");
assert.deepEqual(observed.at(-1).arguments.currentLegalSpaceDomain,
  fixture.parameterDomains.find(entry =>
    entry.domainId === first.arguments.candidateId));

const descriptor = createStarcraftTmgNativeSpatialQueryToolV1({
  name: "spatial_query", queryKinds: ["attack_probability"] });
const description = descriptor.function.parameters.properties.argumentsJson.description;
assert(description.includes("domainId"));
assert(description.includes("parameters"));
assert(description.includes("targetUnitId"));
assert.equal(JSON.stringify(fixture), captured);
const report = { passed: true, capturedRevision: 102,
  sevenCapturedRequestsReachCurrentDomainAndTarget: true,
  canonicalArgumentsPreserved: true,
  contradictoryOrUnknownReferencesNotGuessed: true,
  callerCannotSupplyTrustedDomain: true,
  numericProbabilityEvaluated: false,
  adapterTransportOnly: true,
  providerCalls: 0, roomWrites: 0, trainingTruth: false };
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
console.log(JSON.stringify(report));
