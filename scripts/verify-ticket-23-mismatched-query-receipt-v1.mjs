import assert from "node:assert/strict";
import { createStarcraftTmgLiveFlashDecisionPortV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { createInMemoryStarcraftTmgPromptArtifactStoreV1 } from
  "../packages/online-agent-session/prompt-artifact-store-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { spatialQueryReceiptRejectionV1 } from
  "../packages/online-agent-session/spatial-query-receipt-contract-v1.mjs";

// Concrete receive-seam bug: a well-shaped hash cannot make a different query
// or an old Room state the answer to the current request. No actual Provider.
const hash = "a".repeat(64);
const correlationInput = {
  roomProjection: { room: { roomId: "current", stateRevision: 7, stateHash: hash },
    matchBinding: { bindingHash: hash }, viewer: { seatKey: "player1" } },
  legalSpace: { legalSpaceHash: hash },
};
const correlated = { queryReceiptHash: hash, queryKind: "base_edge_distance",
  status: "exact", authority: { roomId: "current", matchBindingHash: hash,
    stateRevision: 7, stateHash: hash, legalSpaceHash: hash, seatKey: "player1" } };
const currentRequest = { requestId: "current", queryKind: correlated.queryKind };
const rejection = receipt => spatialQueryReceiptRejectionV1({
  input: correlationInput, request: currentRequest, receipt });
assert.equal(rejection(correlated), null); // Native cached result, no requestId.
assert.equal(rejection({ ...correlated, status: "unknown" }), null);
assert.equal(rejection({ ...correlated, status: "advisory_estimate" }), null);
assert.equal(rejection({ ...correlated, requestId: "different" }), "request_id");
for (const key of Object.keys(correlated.authority)) {
  assert.equal(rejection({ ...correlated, authority: { ...correlated.authority,
    [key]: key === "stateRevision" ? 6 : "different" } }), `authority_${key}`);
}
assert.equal(rejection({ ...correlated, mayApply: true }), "query_authority");
for (const mismatch of ["queryKind", "stateHash"]) {
  let record = null;
  let fakeCalls = 0;
  const scope = { gameId: "starcraft-tmg", roomId: "query-receipt-probe",
    matchBindingHash: hash, seatKey: "player1" };
  const request = { requestId: "current-distance", queryKind: "base_edge_distance",
    arguments: {} };
  const body = { schemaVersion: "starcraft_tmg_spatial_action_query_runtime_v1.result",
    ok: true, status: "exact", queryKind: mismatch === "queryKind"
      ? "within_and_wholly_within" : request.queryKind,
    authority: { roomId: scope.roomId, matchBindingHash: hash, stateRevision: 7,
      stateHash: mismatch === "stateHash" ? "b".repeat(64) : hash,
      legalSpaceHash: hash, seatKey: scope.seatKey },
    result: { distanceInches: 1 }, maySelectAction: false, mayPreview: false,
    mayConfirm: false, mayApply: false, trainingTruth: false };
  const receipt = { ...body, queryReceiptHash: hashStarcraftTmgContract(body) };
  const port = createStarcraftTmgLiveFlashDecisionPortV1({
    providerInteractionMode: "json_channels_v1",
    providerSupervisor: { async readState() { return {}; }, async sendTurn() {
      fakeCalls++;
      return fakeCalls === 1 ? { ok: true, output: { query_requests: [request] },
        usageReceipt: { inputUnits: 10, outputUnits: 5, totalUnits: 15 },
        providerEvidence: { reportedModel: "deepseek-flash" } }
        : { ok: false, reason: "DIAGNOSTIC_STOP_BEFORE_EGRESS" };
    } },
    promptArtifactStore: createInMemoryStarcraftTmgPromptArtifactStoreV1(),
    profileAvailabilityPort: { async check() { return { ok: true, available: true }; } },
    strategySkillPort: { async resolve() { return { ok: true, snapshot: {
      skillSetHash: hash, skillRefs: [{ skillId: "general", hash }],
      skills: [{ skillId: "general", hash, procedure: [], knowledge: [] }],
    } }; } },
    spatialQueryPort: { async query() { return receipt; } },
    store: { async load() { return record ? structuredClone(record) : null; },
      async commit(_key, expected, next) {
        assert.equal(expected, record?.revision ?? null);
        record = structuredClone(next); return { ok: true };
      } },
    profileCandidates: [{ providerId: "deepseek-openai-compatible-direct", model: "deepseek-flash",
      profileRef: { id: "query-receipt-probe", version: "1", hash }, maxOutputUnits: 1024 }],
  });
  const preflight = await port.preflight({ scope, matchMode: "agent_vs_agent" });
  assert.equal(preflight.ok, true);
  assert.equal((await port.openMatch({ scope, preflightReceipt: preflight,
    providerSession: { sessionId: "query-receipt-probe", connectionEpoch: 1,
      sessionBindingHash: hash } })).ok, true);
  await port.decide({ scope, promptPack: "selfplay_agent_prompt",
    roomProjection: { room: { roomId: scope.roomId, stateRevision: 7, stateHash: hash },
      matchBinding: { bindingHash: hash }, viewer: { seatKey: scope.seatKey },
      state: { phase: "movement", round: 1 } },
    legalSpace: { roomId: scope.roomId, matchBindingHash: hash,
      stateRevision: 7, stateHash: hash, legalSpaceHash: hash, finiteActions: [] },
    spatialActionSpace: { authority: { stateRevision: 7, stateHash: hash, legalSpaceHash: hash },
      actionSpaceHash: hash, finiteActions: [
        { candidateId: "pass", action: { actionType: "pass" } },
        { candidateId: "deploy", action: { actionType: "deploy" } }], parameterDomains: [] },
    spatialObservation: { observationHash: hash }, matchMemory: null, planState: null,
  });
  const choice = Object.values(record.decisions)[0];
  assert.ok(!choice.queryReceipts.some(r => r.queryReceiptHash === receipt.queryReceiptHash),
    `${mismatch}: mismatched receipt must not become model evidence`);
  assert.ok(choice.warnings.some(w => w.startsWith("QUERY_RESULT_REJECTED:")));
}
console.log("MISMATCHED_QUERY_RECEIPT_OK; providerCalls=0; roomWrites=0");
