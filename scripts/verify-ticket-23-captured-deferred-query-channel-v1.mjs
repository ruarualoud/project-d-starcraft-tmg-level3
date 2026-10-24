import assert from "node:assert/strict";
import { createStarcraftTmgLiveFlashDecisionPortV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { createInMemoryStarcraftTmgPromptArtifactStoreV1 } from
  "../packages/online-agent-session/prompt-artifact-store-v1.mjs";

// Actual C/r7 JSON request was advertised as a host-deferred query but
// reported as unsupported. Neither protocol may run the expensive solver
// before Planner selects a candidate; both must return the same typed defer.
const hash = "a".repeat(64);
for (const providerInteractionMode of ["json_channels_v1", "native_tools"]) {
  let record = null;
  let fakeCalls = 0;
  let spatialCalls = 0;
  const queryKind = "legal_asset_placement_options";
  const request = { requestId: "captured-asset-search", queryKind,
    arguments: { domainId: "ventral-sacs" } };
  const output = providerInteractionMode === "json_channels_v1"
    ? { query_requests: [request] }
    : { providerTurn: { kind: "tool_calls", toolCalls: [{ callId: request.requestId,
      name: "query_spatial_rules", arguments: { requestId: request.requestId,
        queryKind, argumentsJson: JSON.stringify(request.arguments) } }] } };
  const scope = { gameId: "starcraft-tmg", roomId: "captured-deferred-query",
    matchBindingHash: hash, seatKey: "player1" };
  const port = createStarcraftTmgLiveFlashDecisionPortV1({ providerInteractionMode,
    providerSupervisor: { async readState() { return {}; }, async sendTurn() {
      fakeCalls++;
      return fakeCalls === 1 ? { ok: true, output,
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
    spatialQueryPort: { async query() { spatialCalls++; throw Error("deferred query must not execute"); } },
    store: { async load() { return record ? structuredClone(record) : null; },
      async commit(_key, expected, next) {
        assert.equal(expected, record?.revision ?? null);
        record = structuredClone(next); return { ok: true };
      } },
    profileCandidates: [{ providerId: "deepseek-openai-compatible-direct", model: "deepseek-flash",
      profileRef: { id: "captured-deferred-query", version: "1", hash }, maxOutputUnits: 1024 }],
  });
  const preflight = await port.preflight({ scope, matchMode: "agent_vs_agent" });
  assert.equal(preflight.ok, true);
  assert.equal((await port.openMatch({ scope, preflightReceipt: preflight,
    providerSession: { sessionId: "captured-deferred-query-session", connectionEpoch: 1,
      sessionBindingHash: hash } })).ok, true);
  await port.decide({ scope, promptPack: "selfplay_agent_prompt",
    roomProjection: { room: { roomId: scope.roomId, stateRevision: 7, stateHash: hash },
      matchBinding: { bindingHash: hash }, viewer: { seatKey: "player1" },
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
  const receipt = choice.queryReceipts.find(r => r.queryKind === queryKind);
  assert.ok(receipt, `${providerInteractionMode}: legal deferred query must retain a receipt`);
  assert.equal(receipt.status, "deferred");
  assert.equal(receipt.reason, "host_executes_once_after_planner_candidate_selection");
  assert.equal(receipt.rulesAuthority, false);
  assert.equal(receipt.mutationAuthority, false);
  assert.equal(spatialCalls, 0);
  assert.ok(!choice.warnings.some(w => w.startsWith("JSON_QUERY_KIND_UNSUPPORTED")));
}
console.log("CAPTURED_DEFERRED_QUERY_CHANNEL_OK; providerCalls=0; roomWrites=0");
