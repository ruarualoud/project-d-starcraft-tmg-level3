#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_TICKET_15_ONLINE_AGENT_HTTP_EVENTS_CONTRACT_V1 } from
  "../content/agent/ticket-15-online-agent-http-events-contract-v1.mjs";
import { createKerriganPrimalProductBundleV1 } from
  "../content/characters/kerrigan-primal-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";
import {
  createStarcraftTmgOnlineAgentSessionLifecycleV1,
  createStarcraftTmgOnlinePrincipalBindingV1,
} from "../packages/online-agent-session/session-lifecycle-v1.mjs";
import {
  createStarcraftTmgProviderGatewaySupervisorV1,
  createStarcraftTmgProviderGatewayUsageReceiptV1,
} from "../packages/online-agent-session/provider-gateway-supervisor-v1.mjs";
import {
  createStarcraftTmgOnlineAgentHttpEventsV1,
  STARCRAFT_TMG_ONLINE_AGENT_API_PREFIX,
  STARCRAFT_TMG_ONLINE_AGENT_MAX_BODY_BYTES,
} from "../packages/online-agent-session/http-events-v1.mjs";
import { containsStarcraftTmgOnlineContextCredentialMaterialV1 } from
  "../packages/online-agent-session/role-context-contracts-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(ROOT,
  "build/ticket-15-slice-149-online-agent-http-events-v1/report.json");
const ROOM_ID = "slice-149-online-agent-room";
const AUTH_A = "Bearer slice-149-principal-a-session";
const AUTH_B = "Bearer slice-149-principal-b-session";
const bundle = createKerriganPrimalProductBundleV1();
const characterPackage = bundle.characterPackage;

function verifyHash(value, field) {
  const { [field]: observed, ...unsigned } = value;
  assert.equal(hashStarcraftTmgContract(unsigned), observed);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function roomBinding() {
  return {
    schemaVersion: "starcraft_tmg_match_room_binding_v1",
    rulesVersion: "0.112.0-official-faq-v1-current",
    dataVersion: "official-onetime-snapshot-v1",
    matchBindingHash: "a".repeat(64),
    sourceSnapshotHash: "b".repeat(64),
    dataSnapshotHash: "c".repeat(64),
    rulesArtifactHash: "d".repeat(64),
    executorArtifactHash: "e".repeat(64),
    geometryArtifactHash: "f".repeat(64),
    actionSchemaHash: "1".repeat(64),
  };
}

const selectionHash = hashStarcraftTmgContract({
  characterId: characterPackage.characterId,
  persona: "hots.primal_queen.post_zerus",
  roomId: ROOM_ID,
});

function principalBinding(scopeHash) {
  return createStarcraftTmgOnlinePrincipalBindingV1({
    roomId: ROOM_ID,
    principalScopeHash: scopeHash,
    seatKey: "player1",
    principalType: "human",
    principalRoleMode: "player",
    bindingRevision: 1,
    allowedAgentModes: ["tutor"],
    characterId: characterPackage.characterId,
    characterPackageHash: characterPackage.integrity.hash,
    characterSelectionHash: selectionHash,
    roomBinding: roomBinding(),
  });
}

const principalBindings = new Map([
  ["principal-a", principalBinding("2".repeat(64))],
  ["principal-b", principalBinding("3".repeat(64))],
]);
let sessionSequence = 0;
let lifecycleInstant = 0;
const principalAuthorityCalls = [];
const lifecycle = createStarcraftTmgOnlineAgentSessionLifecycleV1({
  principalAuthority: {
    async resolve(input) {
      principalAuthorityCalls.push(clone(input));
      const binding = principalBindings.get(input.principalSessionRef);
      return binding?.roomId === input.roomId
        ? { ok: true, binding }
        : { ok: false, reason: "principal_not_authenticated" };
    },
  },
  characterCatalog: {
    async resolve(input) {
      return input.characterId === characterPackage.characterId
        && input.characterPackageHash === characterPackage.integrity.hash
        ? { ok: true, characterPackage }
        : { ok: false, reason: "character_not_found" };
    },
  },
  createId() {
    sessionSequence += 1;
    return `slice-149-session-${String(sessionSequence).padStart(3, "0")}`;
  },
  now() {
    const value = new Date(Date.UTC(2026, 8, 4, 5, 0, lifecycleInstant));
    lifecycleInstant += 1;
    return value.toISOString();
  },
});

function deferred() {
  let resolve;
  const promise = new Promise((onResolve) => { resolve = onResolve; });
  return { promise, resolve };
}

const gatewayCalls = [];
const deferredCompletions = new Map();
let turnSequence = 0;
let supervisorInstant = 0;
const providerSupervisor = createStarcraftTmgProviderGatewaySupervisorV1({
  sessionLifecycle: lifecycle,
  providerGateway: {
    async complete(input) {
      gatewayCalls.push(input);
      assert.equal(JSON.stringify(input).includes(AUTH_A), false);
      assert.equal(JSON.stringify(input).includes(AUTH_B), false);
      assert.equal(JSON.stringify(input).includes("principal-a"), false);
      const pending = deferredCompletions.get(
        input.boundedRequest.requestPayloadHash);
      if (pending) await pending.promise;
      return {
        output: {
          schemaVersion: "starcraft_tmg_online_role_output_v1",
          channels: {
            speech: { text: "已根据当前会话证据完成受限响应。" },
            teaching: { text: "先核对规则证据，再执行任何棋盘动作。" },
          },
          visualCue: "explain",
          evidenceRefIds: ["current_viewer_room_projection"],
        },
        usageReceipt: createStarcraftTmgProviderGatewayUsageReceiptV1({
          reservation: input.budgetReservation,
          inputUnits: input.boundedRequest.inputUnits,
          outputUnits: 32,
          providerRequestIdHash: hashStarcraftTmgContract({
            turnId: input.budgetReservation.turnId,
            requestHash: input.boundedRequest.requestHash,
          }),
          finishedAt: "2026-09-04T05:20:00.000Z",
        }),
      };
    },
  },
  gatewayEvidence: "injected_deterministic_http_integration_gateway",
  budgetPolicy: {
    maxTotalUnits: 2_000_000,
    maxTurns: 1_000,
    maxInputUnitsPerTurn: 4_096,
    maxOutputUnitsPerTurn: 1_024,
    timeoutMs: 10_000,
  },
  createId() {
    turnSequence += 1;
    return `slice-149-turn-${String(turnSequence).padStart(3, "0")}`;
  },
  now() {
    const value = new Date(Date.UTC(2026, 8, 4, 5, 10, supervisorInstant));
    supervisorInstant += 1;
    return value.toISOString();
  },
});

function boundedRequest(input) {
  const unsigned = {
    schemaVersion: "starcraft_tmg_bounded_provider_request_v1",
    intent: input.intent,
    requestPayloadHash: hashStarcraftTmgContract({
      intent: input.intent,
      userMessage: input.userMessage,
    }),
    inputUnits: 96,
    maxOutputUnits: 128,
  };
  return { ...unsigned, requestHash: hashStarcraftTmgContract(unsigned) };
}

const providerRefs = Object.freeze({
  providerProfileRef: Object.freeze({
    id: bundle.providerProfile.providerProfileId,
    version: bundle.providerProfile.version,
    hash: bundle.providerProfile.integrity.hash,
  }),
  promptAssemblyRef: Object.freeze({
    id: "slice-149-server-prompt-assembly",
    version: "1.0.0",
    hash: "4".repeat(64),
  }),
  responseContract: Object.freeze({
    id: "slice-149-role-output-contract",
    version: "1.0.0",
    hash: "5".repeat(64),
  }),
});

const histories = new Map();
const roleTurnRuntime = {
  async sendTurn(input, context) {
    const provider = await providerSupervisor.sendTurn({
      sessionId: input.sessionId,
      roomId: input.roomId,
      expectedConnectionEpoch: input.expectedConnectionEpoch,
      ...providerRefs,
      boundedRequest: boundedRequest(input),
    }, context);
    if (!provider.ok) return provider;
    const history = histories.get(input.sessionId) || [];
    history.push({
      turnId: provider.turn.turnId,
      intent: input.intent,
      userText: input.userMessage,
      output: clone(provider.output),
    });
    histories.set(input.sessionId, history);
    return {
      ok: true,
      turn: provider.turn,
      output: provider.output,
      decision: null,
      preview: null,
      confirmationRequired: false,
      confirmationOwner: null,
      trace: {
        traceId: `trace-${provider.turn.turnId}`,
        roleMode: "tutor",
        mode: "tutor",
        intent: input.intent,
        promptPack: "kerrigan-primal-tutor-v1",
        harnessToolsCalled: ["provider_gateway.complete"],
        outputHash: provider.turn.outputHash,
        providerOutputHash: provider.turn.outputHash,
        roleOutputStatus: "accepted",
        decisionReceiptHash: null,
        previewProjectionHash: null,
        confirmationRequired: false,
        confirmationOwner: null,
        reviewStatus: "raw",
        occurredAt: "2026-09-04T05:20:00.000Z",
      },
      state: provider.state,
    };
  },
  async readContext(input, context) {
    const session = await lifecycle.readSession(input, context);
    if (!session.ok) return session;
    const provider = await providerSupervisor.readState(input, context);
    if (!provider.ok) return provider;
    return {
      ok: true,
      context: {
        schemaVersion: "starcraft_tmg_online_role_context_v1",
        sessionId: input.sessionId,
        sessionBindingHash: session.session.binding.sessionBindingHash,
        connectionEpoch: session.session.connection.epoch,
        mode: session.session.binding.mode,
        promptPack: {
          id: "kerrigan-primal-tutor-v1",
          hash: "6".repeat(64),
        },
        toolAllowlist: ["read_board_state", "read_rules_skills"],
        memoryNamespaces: ["teaching_memory"],
        ruleSkillRefs: [],
        memoryRefs: [],
        harnessToolsCalled: ["provider_gateway.complete"],
        history: clone(histories.get(input.sessionId) || []),
        providerState: provider.state,
        lastTrace: null,
      },
    };
  },
};

const authenticationCalls = [];
const principalAuthenticator = {
  async authenticate(input) {
    authenticationCalls.push({ method: input.method, pathname: input.pathname });
    const authorization = Object.entries(input.headers || {})
      .find(([name]) => name.toLowerCase() === "authorization")?.[1];
    if (authorization === AUTH_A) {
      return {
        ok: true,
        principalSessionRef: "principal-a",
        authenticationScopeHash: "2".repeat(64),
      };
    }
    if (authorization === AUTH_B) {
      return {
        ok: true,
        principalSessionRef: "principal-b",
        authenticationScopeHash: "3".repeat(64),
      };
    }
    return { ok: false };
  },
};

function createHttp(options = {}) {
  return createStarcraftTmgOnlineAgentHttpEventsV1({
    sessionLifecycle: lifecycle,
    roleTurnRuntime,
    providerSupervisor,
    principalAuthenticator,
    now: () => "2026-09-04T05:30:00.000Z",
    ...options,
  });
}

const http = createHttp();

function request(method, pathName, options = {}) {
  const headers = {
    ...(options.auth === false ? {} : { authorization: options.auth || AUTH_A }),
    ...(options.key ? { "idempotency-key": options.key } : {}),
  };
  return http.handle({
    method,
    pathname: `${STARCRAFT_TMG_ONLINE_AGENT_API_PREFIX}${pathName}`,
    headers,
    ...(options.body === undefined ? {} : { body: options.body }),
    ...(options.bodyBytes === undefined ? {} : { bodyBytes: options.bodyBytes }),
    ...(options.query === undefined ? {} : { query: options.query }),
  });
}

function createBody() {
  return {
    roomId: ROOM_ID,
    mode: "tutor",
    characterId: characterPackage.characterId,
  };
}

function turnBody(epoch, userMessage = "Explain the current position.") {
  return {
    roomId: ROOM_ID,
    expectedConnectionEpoch: epoch,
    intent: "explain",
    userMessage,
  };
}

async function waitFor(operation, message) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const value = await operation();
    if (value) return value;
    await Promise.resolve();
  }
  assert.fail(message);
}

const checks = [];
const failures = [];
async function check(id, operation) {
  try {
    await operation();
    checks.push({ id, ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push({ id, ok: false, error: message });
    failures.push(`${id}: ${message}`);
  }
}

let session;
let firstTurn;

await check("contract_is_hash_sealed_and_binds_slice_148", async () => {
  const contract = STARCRAFT_TMG_TICKET_15_ONLINE_AGENT_HTTP_EVENTS_CONTRACT_V1;
  verifyHash(contract, "httpEventsContractHash");
  assert.match(contract.predecessorOutputPreviewContractHash, /^[a-f0-9]{64}$/u);
  assert.equal(contract.slice, 149);
  assert.deepEqual(contract.deepModule.interface, ["handle", "metadata"]);
});

await check("health_and_metadata_are_public_safe_and_exactly_catalogued", async () => {
  const health = await request("GET", "/health", { auth: false });
  const metadata = await request("GET", "/metadata", { auth: false });
  assert.equal(health.status, 200);
  assert.equal(metadata.status, 200);
  assert.equal(metadata.response.result.endpoints.length, 9);
  assert.equal(metadata.response.result.sensitiveInputRoutes.length, 0);
  assert.equal(metadata.response.result.secureByokAndLiveProviderTicket, 16);
  assert.equal(containsStarcraftTmgOnlineContextCredentialMaterialV1(
    metadata.response), false);
  assert.equal(JSON.stringify(metadata).toLowerCase().includes("/byok"), false);
});

await check("session_routes_require_external_authentication", async () => {
  const result = await request("POST", "/sessions", {
    auth: false,
    key: "create-unauthenticated-0001",
    body: createBody(),
  });
  assert.equal(result.status, 401);
  assert.equal(result.response.error, "authentication_required");
});

await check("payload_limit_rejects_before_session_mutation", async () => {
  const before = sessionSequence;
  const result = await request("POST", "/sessions", {
    key: "create-too-large-0001",
    body: createBody(),
    bodyBytes: STARCRAFT_TMG_ONLINE_AGENT_MAX_BODY_BYTES + 1,
  });
  assert.equal(result.status, 413);
  assert.equal(sessionSequence, before);
});

await check("mutations_require_a_valid_idempotency_key", async () => {
  const result = await request("POST", "/sessions", { body: createBody() });
  assert.equal(result.status, 400);
  assert.equal(result.response.error, "idempotency_key_required");
});

await check("client_authority_and_provider_material_are_rejected", async () => {
  const principal = await request("POST", "/sessions", {
    key: "create-forbidden-principal-0001",
    body: { ...createBody(), principalSessionRef: "principal-a" },
  });
  assert.equal(principal.status, 400);
  assert.equal(principal.response.error, "forbidden_client_field");
  const providerMaterial = await request("POST", "/sessions", {
    key: "create-forbidden-provider-0001",
    body: { ...createBody(), apiKey: "sk-verifier-not-a-real-key" },
  });
  assert.equal(providerMaterial.status, 400);
  assert.equal(providerMaterial.response.error,
    "sensitive_request_material_forbidden");
});

await check("create_is_exactly_replayed_without_duplicate_session_or_event", async () => {
  const first = await request("POST", "/sessions", {
    key: "create-session-primary-0001",
    body: createBody(),
  });
  const createdCount = sessionSequence;
  const replay = await request("POST", "/sessions", {
    key: "create-session-primary-0001",
    body: createBody(),
  });
  assert.equal(first.status, 200);
  assert.deepEqual(replay, first);
  assert.equal(sessionSequence, createdCount);
  session = first.response.result.session;
  const events = await request("GET", `/sessions/${session.sessionId}/events`, {
    query: { roomId: ROOM_ID, expectedConnectionEpoch: 1 },
  });
  assert.equal(events.response.result.events.length, 1);
  assert.equal(events.response.result.events[0].eventType, "session_created");
});

await check("same_idempotency_key_with_changed_payload_conflicts", async () => {
  const result = await request("POST", "/sessions", {
    key: "create-session-primary-0001",
    body: { ...createBody(), mode: "companion" },
  });
  assert.equal(result.status, 409);
  assert.equal(result.response.error, "idempotency_conflict");
});

await check("owner_read_is_safe_and_strips_provider_sensitive_keys", async () => {
  const result = await request("GET", `/sessions/${session.sessionId}`, {
    query: { roomId: ROOM_ID, expectedConnectionEpoch: 1 },
  });
  assert.equal(result.status, 200);
  assert.equal(result.response.result.context.providerState.provider.state,
    "configured");
  assert.equal(containsStarcraftTmgOnlineContextCredentialMaterialV1(
    result.response), false);
  assert.equal(JSON.stringify(result).includes("credentialInputs"), false);
  assert.equal(JSON.stringify(result).includes("principal-a"), false);
});

await check("cross_principal_session_read_is_forbidden", async () => {
  const result = await request("GET", `/sessions/${session.sessionId}`, {
    auth: AUTH_B,
    query: { roomId: ROOM_ID, expectedConnectionEpoch: 1 },
  });
  assert.equal(result.status, 403);
  assert.equal(result.response.error, "principal_scope_mismatch");
});

await check("http_turn_invokes_one_injected_gateway_and_projects_normalized_output", async () => {
  const before = gatewayCalls.length;
  firstTurn = await request("POST", `/sessions/${session.sessionId}/turns`, {
    key: "send-primary-turn-0001",
    body: turnBody(1),
  });
  assert.equal(firstTurn.status, 200);
  assert.equal(gatewayCalls.length, before + 1);
  assert.equal(firstTurn.response.result.output.schemaVersion,
    "starcraft_tmg_online_role_output_v1");
  assert.equal(firstTurn.response.result.confirmationRequired, false);
  assert.equal("usageReceipt" in firstTurn.response.result, false);
  assert.equal("rawPrompt" in firstTurn.response.result, false);
  assert.equal(containsStarcraftTmgOnlineContextCredentialMaterialV1(
    firstTurn.response), false);
});

await check("same_turn_request_is_exactly_replayed_without_gateway_or_event_duplication", async () => {
  const before = gatewayCalls.length;
  const replay = await request("POST", `/sessions/${session.sessionId}/turns`, {
    key: "send-primary-turn-0001",
    body: turnBody(1),
  });
  assert.deepEqual(replay, firstTurn);
  assert.equal(gatewayCalls.length, before);
  const events = await request("GET", `/sessions/${session.sessionId}/events`, {
    query: { roomId: ROOM_ID, expectedConnectionEpoch: 1 },
  });
  assert.equal(events.response.result.events.length, 2);
});

await check("concurrent_same_key_turns_coalesce_to_one_gateway_call", async () => {
  const before = gatewayCalls.length;
  const options = {
    key: "send-concurrent-turn-0001",
    body: turnBody(1, "Explain the next safe decision."),
  };
  const [first, second] = await Promise.all([
    request("POST", `/sessions/${session.sessionId}/turns`, options),
    request("POST", `/sessions/${session.sessionId}/turns`, options),
  ]);
  assert.equal(first.status, 200);
  assert.deepEqual(second, first);
  assert.equal(gatewayCalls.length, before + 1);
});

await check("changed_turn_payload_under_same_key_conflicts", async () => {
  const result = await request("POST", `/sessions/${session.sessionId}/turns`, {
    key: "send-concurrent-turn-0001",
    body: turnBody(1, "A changed decision request."),
  });
  assert.equal(result.status, 409);
  assert.equal(result.response.error, "idempotency_conflict");
});

await check("events_are_cursor_paged_and_hash_chained", async () => {
  const first = await request("GET", `/sessions/${session.sessionId}/events`, {
    query: {
      roomId: ROOM_ID,
      expectedConnectionEpoch: 1,
      cursor: 0,
      limit: 2,
    },
  });
  assert.equal(first.status, 200);
  assert.equal(first.response.result.events.length, 2);
  assert.equal(first.response.result.nextCursor, 2);
  assert.equal(first.response.result.hasMore, true);
  const second = await request("GET", `/sessions/${session.sessionId}/events`, {
    query: {
      roomId: ROOM_ID,
      expectedConnectionEpoch: 1,
      cursor: 2,
      limit: 2,
    },
  });
  const all = [...first.response.result.events, ...second.response.result.events];
  assert.equal(all.length, 3);
  for (const [index, event] of all.entries()) {
    assert.equal(event.sequence, index + 1);
    assert.equal(event.previousEventHash,
      index === 0 ? "0".repeat(64) : all[index - 1].eventHash);
    verifyHash(event, "eventHash");
  }
  assert.equal(second.response.result.streamHeadHash, all.at(-1).eventHash);
});

await check("event_cursor_ahead_and_cross_principal_access_fail_closed", async () => {
  const ahead = await request("GET", `/sessions/${session.sessionId}/events`, {
    query: { roomId: ROOM_ID, expectedConnectionEpoch: 1, cursor: 999 },
  });
  assert.equal(ahead.status, 409);
  assert.equal(ahead.response.error, "event_cursor_ahead");
  const crossPrincipal = await request("GET",
    `/sessions/${session.sessionId}/events`, {
      auth: AUTH_B,
      query: { roomId: ROOM_ID, expectedConnectionEpoch: 1 },
    });
  assert.equal(crossPrincipal.status, 403);
});

await check("reconnect_is_exactly_idempotent_and_increments_epoch_once", async () => {
  const input = {
    key: "reconnect-primary-session-0001",
    body: { roomId: ROOM_ID, expectedConnectionEpoch: 1 },
  };
  const first = await request("POST",
    `/sessions/${session.sessionId}/reconnect`, input);
  const replay = await request("POST",
    `/sessions/${session.sessionId}/reconnect`, input);
  assert.equal(first.status, 200);
  assert.deepEqual(replay, first);
  assert.equal(first.response.result.session.connection.epoch, 2);
  session = first.response.result.session;
});

await check("stale_epoch_is_rejected_after_reconnect", async () => {
  const result = await request("GET", `/sessions/${session.sessionId}`, {
    query: { roomId: ROOM_ID, expectedConnectionEpoch: 1 },
  });
  assert.equal(result.status, 409);
  assert.equal(result.response.error, "stale_connection");
  assert.equal(result.response.result.observedConnectionEpoch, 2);
});

let cancelSession;
await check("cancel_route_aborts_an_in_flight_gateway_turn", async () => {
  const created = await request("POST", "/sessions", {
    key: "create-cancel-session-0001",
    body: createBody(),
  });
  cancelSession = created.response.result.session;
  const message = "Wait for cancel while explaining the position.";
  const payloadHash = boundedRequest({ intent: "explain", userMessage: message })
    .requestPayloadHash;
  const pending = deferred();
  deferredCompletions.set(payloadHash, pending);
  const sendPromise = request("POST",
    `/sessions/${cancelSession.sessionId}/turns`, {
      key: "send-cancel-session-turn-0001",
      body: turnBody(1, message),
    });
  const waiting = await waitFor(async () => {
    const read = await request("GET", `/sessions/${cancelSession.sessionId}`, {
      query: { roomId: ROOM_ID, expectedConnectionEpoch: 1 },
    });
    return read.response.result?.context?.providerState?.currentTurn?.state
      === "waiting_provider" ? read : null;
  }, "turn never entered waiting_provider");
  const turnId = waiting.response.result.context.providerState.currentTurn.turnId;
  const cancelled = await request("POST",
    `/sessions/${cancelSession.sessionId}/cancel`, {
      key: "cancel-session-turn-0001",
      body: {
        roomId: ROOM_ID,
        expectedConnectionEpoch: 1,
        turnId,
      },
    });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.response.result.turn.state, "cancelled");
  const send = await sendPromise;
  assert.equal(send.status, 400);
  assert.equal(send.response.result.turnId, turnId);
  pending.resolve();
  deferredCompletions.delete(payloadHash);
});

await check("end_cancels_in_flight_turn_and_replays_without_double_end", async () => {
  const created = await request("POST", "/sessions", {
    key: "create-end-session-0001",
    body: createBody(),
  });
  const endingSession = created.response.result.session;
  const message = "Wait for end while explaining the position.";
  const payloadHash = boundedRequest({ intent: "explain", userMessage: message })
    .requestPayloadHash;
  const pending = deferred();
  deferredCompletions.set(payloadHash, pending);
  const sendPromise = request("POST",
    `/sessions/${endingSession.sessionId}/turns`, {
      key: "send-ending-session-turn-0001",
      body: turnBody(1, message),
    });
  await waitFor(async () => {
    const read = await request("GET", `/sessions/${endingSession.sessionId}`, {
      query: { roomId: ROOM_ID, expectedConnectionEpoch: 1 },
    });
    return read.response.result?.context?.providerState?.currentTurn?.state
      === "waiting_provider" ? read : null;
  }, "ending turn never entered waiting_provider");
  const endInput = {
    key: "end-session-primary-0001",
    query: { roomId: ROOM_ID, expectedConnectionEpoch: 1 },
  };
  const ended = await request("DELETE",
    `/sessions/${endingSession.sessionId}`, endInput);
  const replay = await request("DELETE",
    `/sessions/${endingSession.sessionId}`, endInput);
  assert.equal(ended.status, 200);
  assert.equal(ended.response.result.inFlightTurnCancelled, true);
  assert.equal(ended.response.result.session.lifecycleState, "ended");
  assert.deepEqual(replay, ended);
  const send = await sendPromise;
  assert.equal(send.status, 400);
  pending.resolve();
  deferredCompletions.delete(payloadHash);
  const afterEnd = await request("POST",
    `/sessions/${endingSession.sessionId}/turns`, {
      key: "send-after-end-session-0001",
      body: turnBody(2, "Try to send after the session ended."),
    });
  assert.equal(afterEnd.status, 409);
  assert.equal(afterEnd.response.error, "session_ended");
});

await check("event_capacity_fails_closed_and_prior_replay_still_works", async () => {
  const boundedHttp = createHttp({ maxEventsPerSession: 8 });
  const boundedRequestCall = (method, pathName, options = {}) => boundedHttp.handle({
    method,
    pathname: `${STARCRAFT_TMG_ONLINE_AGENT_API_PREFIX}${pathName}`,
    headers: {
      authorization: AUTH_A,
      ...(options.key ? { "idempotency-key": options.key } : {}),
    },
    ...(options.body ? { body: options.body } : {}),
    ...(options.query ? { query: options.query } : {}),
  });
  const created = await boundedRequestCall("POST", "/sessions", {
    key: "bounded-create-session-0001",
    body: createBody(),
  });
  const boundedSession = created.response.result.session;
  let lastSuccess;
  for (let index = 1; index <= 7; index += 1) {
    lastSuccess = await boundedRequestCall("POST",
      `/sessions/${boundedSession.sessionId}/turns`, {
        key: `bounded-send-turn-${String(index).padStart(4, "0")}`,
        body: turnBody(1, `Bounded event turn ${index}.`),
      });
    assert.equal(lastSuccess.status, 200);
  }
  const overflow = await boundedRequestCall("POST",
    `/sessions/${boundedSession.sessionId}/turns`, {
      key: "bounded-send-turn-0008",
      body: turnBody(1, "This event must not fit."),
    });
  assert.equal(overflow.status, 429);
  assert.equal(overflow.response.error, "event_capacity_exceeded");
  const replay = await boundedRequestCall("POST",
    `/sessions/${boundedSession.sessionId}/turns`, {
      key: "bounded-send-turn-0007",
      body: turnBody(1, "Bounded event turn 7."),
    });
  assert.deepEqual(replay, lastSuccess);
  const events = await boundedRequestCall("GET",
    `/sessions/${boundedSession.sessionId}/events`, {
      query: { roomId: ROOM_ID, expectedConnectionEpoch: 1, limit: 100 },
    });
  assert.equal(events.response.result.events.length, 8);
});

await check("idempotency_capacity_fails_closed_without_eviction", async () => {
  const boundedHttp = createHttp({ maxIdempotencyRecords: 8 });
  const invoke = (key) => boundedHttp.handle({
    method: "POST",
    pathname: `${STARCRAFT_TMG_ONLINE_AGENT_API_PREFIX}/sessions`,
    headers: { authorization: AUTH_A, "idempotency-key": key },
    body: createBody(),
  });
  let first;
  for (let index = 1; index <= 8; index += 1) {
    const result = await invoke(`capacity-create-${String(index).padStart(4, "0")}`);
    if (index === 1) first = result;
    assert.equal(result.status, 200);
  }
  const overflow = await invoke("capacity-create-0009");
  assert.equal(overflow.status, 429);
  assert.equal(overflow.response.error, "idempotency_capacity_exceeded");
  assert.deepEqual(await invoke("capacity-create-0001"), first);
});

await check("invalid_methods_paths_queries_and_get_bodies_are_rejected", async () => {
  const method = await request("PATCH", `/sessions/${session.sessionId}`, {
    body: {},
  });
  assert.equal(method.status, 405);
  const pathResult = await request("GET", "/unknown", { auth: false });
  assert.equal(pathResult.status, 404);
  const query = await request("GET", `/sessions/${session.sessionId}`, {
    query: { roomId: ROOM_ID, expectedConnectionEpoch: 2, seatToken: "no" },
  });
  assert.equal(query.status, 400);
  const getBody = await request("GET", `/sessions/${session.sessionId}`, {
    body: { roomId: ROOM_ID },
    query: { roomId: ROOM_ID, expectedConnectionEpoch: 2 },
  });
  assert.equal(getBody.status, 400);
  assert.equal(getBody.response.error, "request_body_forbidden");
  const missingEpoch = await request("POST",
    `/sessions/${session.sessionId}/turns`, {
      key: "send-without-epoch-0001",
      body: {
        roomId: ROOM_ID,
        intent: "explain",
        userMessage: "An epoch fence is required.",
      },
    });
  assert.equal(missingEpoch.status, 400);
  const invalidDeclaredSize = await request("POST", "/sessions", {
    key: "create-invalid-size-0001",
    body: createBody(),
    bodyBytes: -1,
  });
  assert.equal(invalidDeclaredSize.status, 413);
});

await check("provider_budget_exhaustion_is_projected_as_backpressure", async () => {
  const budgetHttp = createStarcraftTmgOnlineAgentHttpEventsV1({
    sessionLifecycle: lifecycle,
    roleTurnRuntime: {
      ...roleTurnRuntime,
      async sendTurn() {
        return { ok: false, reason: "provider_total_budget_exceeded" };
      },
    },
    providerSupervisor,
    principalAuthenticator,
    now: () => "2026-09-04T05:30:00.000Z",
  });
  const created = await budgetHttp.handle({
    method: "POST",
    pathname: `${STARCRAFT_TMG_ONLINE_AGENT_API_PREFIX}/sessions`,
    headers: {
      authorization: AUTH_A,
      "idempotency-key": "budget-create-session-0001",
    },
    body: createBody(),
  });
  const budgetSession = created.response.result.session;
  const result = await budgetHttp.handle({
    method: "POST",
    pathname: `${STARCRAFT_TMG_ONLINE_AGENT_API_PREFIX}/sessions/${budgetSession.sessionId}/turns`,
    headers: {
      authorization: AUTH_A,
      "idempotency-key": "budget-send-session-0001",
    },
    body: turnBody(1, "Explain within the exhausted budget."),
  });
  assert.equal(result.status, 429);
  assert.equal(result.response.error, "provider_total_budget_exceeded");
});

await check("no_public_response_event_or_gateway_call_leaks_auth_or_provider_material", async () => {
  assert(authenticationCalls.length > 0);
  assert(principalAuthorityCalls.length > 0);
  assert(gatewayCalls.length > 0);
  for (const call of gatewayCalls) {
    const serialized = JSON.stringify(call);
    assert.equal(serialized.includes(AUTH_A), false);
    assert.equal(serialized.includes(AUTH_B), false);
    assert.equal(serialized.includes("principal-a"), false);
    assert.equal(serialized.includes("seatToken"), false);
    assert.equal(serialized.includes("apiKey"), false);
  }
  const events = await request("GET", `/sessions/${session.sessionId}/events`, {
    query: { roomId: ROOM_ID, expectedConnectionEpoch: 2, limit: 100 },
  });
  assert.equal(events.status, 200);
  assert.equal(containsStarcraftTmgOnlineContextCredentialMaterialV1(
    events.response), false);
  assert.equal(JSON.stringify(events).includes(AUTH_A), false);
  assert.equal(JSON.stringify(events).includes("usageReceipt"), false);
});

await check("slice_truth_keeps_live_provider_byok_native_skill_and_training_deferred", async () => {
  const truth = STARCRAFT_TMG_TICKET_15_ONLINE_AGENT_HTTP_EVENTS_CONTRACT_V1
    .runTruth;
  assert.equal(truth.liveProviderCalled, false);
  assert.equal(truth.injectedGatewayUsed, true);
  assert.equal(truth.sourceRefreshPerformed, false);
  assert.equal(truth.nativeDeviceEvidence, "deferred_by_user");
  assert.equal(truth.skillGenerated, false);
  assert.equal(truth.dshRun, false);
  assert.equal(truth.muzeroDataGenerated, false);
});

const reportBody = {
  schemaVersion: "starcraft_tmg_ticket_15_online_agent_http_events_report_v1",
  ticket: 15,
  slice: 149,
  generatedAt: "2026-09-04T05:40:00.000Z",
  httpEventsContractHash:
    STARCRAFT_TMG_TICKET_15_ONLINE_AGENT_HTTP_EVENTS_CONTRACT_V1
      .httpEventsContractHash,
  apiPrefix: STARCRAFT_TMG_ONLINE_AGENT_API_PREFIX,
  checks,
  totals: {
    checks: checks.length,
    passed: checks.filter((entry) => entry.ok).length,
    failed: failures.length,
    injectedGatewayCalls: gatewayCalls.length,
    sessionsCreated: sessionSequence,
  },
  truth: {
    authenticatedHttpMounted: true,
    exactMutationReplay: true,
    concurrentSameKeyCoalesced: true,
    boundedHashChainedEvents: true,
    rawPromptExposed: false,
    rawProviderOutputExposed: false,
    providerReceiptExposed: false,
    liveProviderCalled: false,
    secureByokDeferredToTicket: 16,
    webMountDeferredToSlice: 150,
    nativeDeviceEvidence: "deferred_by_user",
    eligibleForTraining: false,
    trainingTruth: false,
  },
};
const report = {
  ...reportBody,
  reportHash: hashStarcraftTmgContract(reportBody),
};
await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (failures.length) {
  console.error(`Ticket 15 Slice 149 failed (${failures.length}/${checks.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Ticket 15 Slice 149 passed (${checks.length}/${checks.length})`);
  console.log(`Contract: ${report.httpEventsContractHash}`);
  console.log(`Report: ${report.reportHash}`);
  console.log(`Injected Gateway calls: ${report.totals.injectedGatewayCalls}`);
  console.log("Live Provider/BYOK: deferred to Ticket 16");
}
