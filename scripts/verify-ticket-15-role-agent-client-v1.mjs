#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  confirmStarcraftTmgTrustedRoleAgentPreviewV1,
  createStarcraftTmgClientDomain,
  STARCRAFT_TMG_CLIENT_DOMAIN_INTERFACE,
} from "../packages/client-domain/client-domain-v1.mjs";
import {
  createHttpStarcraftTmgOnlineAgentClientTransportV1,
} from "../packages/client-domain/online-agent-transport-adapters-v1.mjs";
import { createStarcraftTmgRoleAgentSessionClientV1 } from
  "../packages/client-domain/role-agent-session-client-v1.mjs";
import { createInMemoryStarcraftTmgAuthoritativeTransportAdapter } from
  "../packages/client-domain/authoritative-transport-adapters-v1.mjs";
import { createInMemoryStarcraftTmgLifecycleAdapter } from
  "../packages/client-domain/lifecycle-adapters-v1.mjs";
import { createInMemoryStarcraftTmgProjectionStoreAdapter } from
  "../packages/client-domain/projection-store-adapters-v1.mjs";
import {
  createStarcraftTmgAuthoritativeEngine,
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgRoomRuntime } from
  "../packages/room-runtime/in-memory-room-v1.mjs";
import {
  createStarcraftTmgSampleState,
  loadStarcraftTmgData,
} from "../../scripts/starcraft-tmg-rules-v0.mjs";
import { STARCRAFT_TMG_TICKET_15_ROLE_AGENT_CLIENT_CONTRACT_V1 } from
  "../content/agent/ticket-15-role-agent-client-contract-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_ROOT = path.resolve(ROOT, "..");
const OUTPUT = path.join(ROOT,
  "build/ticket-15-slice-150-role-agent-client-v1/report.json");
const OCCURRED_AT = "2026-09-04T08:00:00.000Z";
const ROOM_ID = "slice-150-role-agent-client-room";
const checks = [];
const failures = [];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ids(prefix = "slice150") {
  let sequence = 0;
  return (kind) => `${kind}-${prefix}-${String(sequence += 1).padStart(4, "0")}`;
}

async function check(id, operation) {
  try {
    await operation();
    checks.push({ id, passed: true });
  } catch (error) {
    checks.push({ id, passed: false, error: error.message });
    failures.push(`${id}: ${error.message}`);
  }
}

function fakeHost() {
  let view = {
    schemaVersion: "starcraft_tmg_client_domain_v1.character_presentation_v2.view",
    clientRevision: 1,
    phase: "ready",
    locator: { roomId: ROOM_ID },
    surface: "expo_web",
    locale: "zh-CN",
    lifecycle: { online: true, visibility: "active" },
    roomProjection: { room: { stateRevision: 0 } },
    characterPresentation: {
      character: { characterId: "starcraft.kerrigan", displayName: "Sarah Kerrigan" },
    },
    recovery: { authoritativeOutcomeUncertain: false },
    trainingTruth: false,
    viewHash: "1".repeat(64),
  };
  const listeners = new Set();
  const calls = [];
  const host = Object.freeze({
    async bootstrap() {
      calls.push("bootstrap");
      return { ok: true, outcome: "projection_refreshed", view };
    },
    read() { return view; },
    async dispatch(intent) {
      calls.push(intent.type);
      return { ok: true, outcome: "host_dispatch", view };
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(view);
      return () => listeners.delete(listener);
    },
  });
  return {
    host,
    calls,
    emit(patch) {
      view = { ...view, ...clone(patch), clientRevision: view.clientRevision + 1 };
      for (const listener of listeners) listener(view);
    },
  };
}

function fakeSession(mode = "companion", epoch = 1, lifecycleState = "active") {
  return {
    sessionId: "slice-150-session-0001",
    sessionRevision: epoch,
    lifecycleState,
    turnState: "idle",
    roomId: ROOM_ID,
    sessionBindingHash: "2".repeat(64),
    seatKey: "player1",
    mode,
    character: { characterId: "starcraft.kerrigan" },
    roomBinding: { matchBindingHash: "3".repeat(64) },
    capability: {},
    connection: { epoch, state: lifecycleState === "active" ? "connected" : "ended" },
    createdAt: OCCURRED_AT,
    updatedAt: OCCURRED_AT,
    endedAt: lifecycleState === "ended" ? OCCURRED_AT : null,
    productionReady: false,
    trainingTruth: false,
  };
}

const hostFixture = fakeHost();
let session = fakeSession();
let currentTurn = null;
let slowResolve;
const agentCalls = [];
const agentTransport = {
  async execute(input) {
    agentCalls.push(clone(input));
    if (input.operation === "create_session") {
      session = fakeSession(input.mode);
      return { ok: true, session };
    }
    if (input.operation === "read_session") {
      return {
        ok: true,
        session,
        context: {
          promptPack: { id: `starcraft-tmg.${session.mode}.v1`, hash: "4".repeat(64) },
          ruleSkillRefs: [{ id: "turn-flow", hash: "5".repeat(64) }],
          memoryRefs: [{ id: "same-session-memory", hash: "6".repeat(64) }],
          providerState: {
            provider: { state: "configured", gatewayEvidence: "injected", liveProviderClaim: false },
            budget: {
              policy: { maxTotalUnits: 1000 },
              consumedUnits: 20,
              remainingUnits: 980,
              turnCount: 1,
            },
            currentTurn,
          },
          lastTrace: null,
        },
      };
    }
    if (input.operation === "send_turn") {
      currentTurn = {
        turnId: "turn-0001",
        state: "waiting_provider",
        intent: input.intent,
        startedAt: OCCURRED_AT,
      };
      if (input.userMessage === "slow") {
        await new Promise((resolve) => { slowResolve = resolve; });
        return { ok: false, reason: "cancelled", turnId: currentTurn.turnId };
      }
      currentTurn = { ...currentTurn, state: "completed", terminalAt: OCCURRED_AT };
      return {
        ok: true,
        turn: { turnId: "turn-0001", state: "completed" },
        output: {
          schemaVersion: "starcraft_tmg_online_role_output_v1",
          channels: { speech: { text: "我已核对当前房间与规则证据。" } },
          visualCue: "reflect",
          evidenceRefIds: ["current_room_projection"],
        },
        decision: null,
        preview: null,
        trace: {
          traceId: "trace-0001",
          mode: session.mode,
          intent: input.intent,
          promptPack: { id: `starcraft-tmg.${session.mode}.v1` },
          harnessToolsCalled: ["read_board_state", "list_legal_actions"],
          reviewStatus: "raw",
        },
        budget: { policy: { maxTotalUnits: 1000 }, remainingUnits: 960 },
      };
    }
    if (input.operation === "cancel_turn") {
      currentTurn = { ...currentTurn, state: "cancelled", terminalAt: OCCURRED_AT };
      slowResolve?.();
      return { ok: true, turn: currentTurn, budget: { remainingUnits: 900 } };
    }
    if (input.operation === "reconnect_session") {
      session = fakeSession(session.mode, session.connection.epoch + 1);
      return { ok: true, session };
    }
    if (input.operation === "end_session") {
      session = fakeSession(session.mode, session.connection.epoch, "ended");
      return { ok: true, session };
    }
    return { ok: true, events: [], nextCursor: 0 };
  },
};
const client = createStarcraftTmgRoleAgentSessionClientV1({
  clientDomain: hostFixture.host,
  transport: agentTransport,
  now: () => OCCURRED_AT,
  createId: ids(),
});

await check("extension_preserves_exact_four_operation_client_interface", async () => {
  assert.deepEqual(Object.keys(client), STARCRAFT_TMG_CLIENT_DOMAIN_INTERFACE);
  assert.equal("transport" in client, false);
});

await check("extension_is_opt_in_and_projects_non_authoritative_capabilities", async () => {
  const projection = client.read().roleAgentSession;
  assert.equal(projection.enabled, true);
  assert.equal(projection.capabilities.localRulesAuthority, false);
  assert.equal(projection.capabilities.modelMayConfirm, false);
  assert.equal(projection.capabilities.skillGeneration, false);
});

await check("open_uses_current_server_character_and_never_accepts_client_authority", async () => {
  const opened = await client.dispatch({ type: "open_agent_session", mode: "companion" });
  assert.equal(opened.ok, true);
  const create = agentCalls.find((entry) => entry.operation === "create_session");
  assert.equal(create.characterId, "starcraft.kerrigan");
  assert.equal(create.seatKey, undefined);
  assert.equal(create.principalSessionRef, undefined);
  assert.equal(client.read().roleAgentSession.sessionRef.length, 64);
  assert.equal(JSON.stringify(client.read()).includes(session.sessionId), false);
});

await check("chat_projects_chronological_messages_budget_and_safe_harness_trace", async () => {
  const sent = await client.dispatch({
    type: "send_agent_message",
    intent: "reflect",
    message: "复盘当前局势",
  });
  assert.equal(sent.ok, true);
  const projection = client.read().roleAgentSession;
  assert.deepEqual(projection.messages.map((entry) => entry.author), ["human", "agent"]);
  assert.equal(projection.budget.remainingUnits, 960);
  assert.deepEqual(projection.trace.toolCalls,
    ["read_board_state", "list_legal_actions"]);
  assert.equal(projection.trace.rawPromptExposed, false);
  assert.equal(JSON.stringify(projection).includes("usageReceipt"), false);
});

await check("credential_shaped_chat_is_rejected_before_transport", async () => {
  const before = agentCalls.length;
  const rejected = await client.dispatch({
    type: "send_agent_message",
    intent: "chat",
    message: "api_key=sk-this-is-not-allowed",
  });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.rejection.code, "AGENT_CREDENTIAL_MATERIAL_FORBIDDEN");
  assert.equal(agentCalls.length, before);
});

await check("cancel_bypasses_the_long_turn_queue", async () => {
  const pending = client.dispatch({
    type: "send_agent_message",
    intent: "chat",
    message: "slow",
  });
  while (client.read().roleAgentSession.currentTurn?.state !== "waiting_provider") {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  const cancelled = await client.dispatch({ type: "cancel_agent_turn" });
  assert.equal(cancelled.ok, true);
  assert.equal(cancelled.view.roleAgentSession.currentTurn.state, "cancelled");
  await pending;
});

await check("offline_and_background_states_block_agent_network_writes", async () => {
  hostFixture.emit({
    phase: "offline_read_only",
    lifecycle: { online: false, visibility: "active" },
  });
  const before = agentCalls.length;
  const rejected = await client.dispatch({ type: "refresh_agent_session" });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.rejection.code, "AGENT_CLIENT_READ_ONLY");
  assert.equal(agentCalls.length, before);
  assert.equal(client.read().roleAgentSession.status, "offline_read_only");
  hostFixture.emit({
    phase: "offline_read_only",
    lifecycle: { online: true, visibility: "background" },
  });
  const backgroundRejected = await client.dispatch({ type: "refresh_agent_session" });
  assert.equal(backgroundRejected.ok, false);
  assert.equal(agentCalls.length, before);
  assert.equal(client.read().roleAgentSession.status, "background_read_only");
});

await check("foreground_requires_explicit_reconnect_and_advances_epoch", async () => {
  hostFixture.emit({
    phase: "ready",
    lifecycle: { online: true, visibility: "active" },
  });
  assert.equal(client.read().roleAgentSession.status, "reconnect_required");
  const reconnected = await client.dispatch({ type: "reconnect_agent_session" });
  assert.equal(reconnected.ok, true);
  assert.equal(client.read().roleAgentSession.connectionEpoch, 2);
});

await check("end_is_explicit_and_fences_further_turns", async () => {
  const ended = await client.dispatch({ type: "end_agent_session" });
  assert.equal(ended.ok, true);
  assert.equal(client.read().roleAgentSession.status, "ended");
  const rejected = await client.dispatch({
    type: "send_agent_message",
    intent: "chat",
    message: "must fail",
  });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.rejection.code, "AGENT_SESSION_ENDED");
});

await check("http_adapter_uses_same_origin_cookie_auth_without_authorization_or_key", async () => {
  let observed;
  const transport = createHttpStarcraftTmgOnlineAgentClientTransportV1({
    fetchImpl: async (url, init) => {
      observed = { url, init };
      return {
        async text() {
          return JSON.stringify({
            ok: true,
            schemaVersion: "starcraft_tmg_online_agent_http_v1",
            endpoint: "sessions",
            result: { ok: true, session: fakeSession() },
          });
        },
      };
    },
  });
  await transport.execute({
    operation: "create_session",
    roomId: ROOM_ID,
    mode: "companion",
    characterId: "starcraft.kerrigan",
    idempotencyKey: "slice-150-http-create-0001",
  });
  assert.equal(observed.init.credentials, "include");
  assert.equal(observed.init.headers.authorization, undefined);
  assert.equal(observed.init.headers["idempotency-key"],
    "slice-150-http-create-0001");
  assert.equal(JSON.stringify(observed).includes("apiKey"), false);
});

await check("http_adapter_rejects_non_loopback_plain_http", async () => {
  assert.throws(() => createHttpStarcraftTmgOnlineAgentClientTransportV1({
    baseUrl: "http://example.test",
    fetchImpl: async () => {},
  }), /HTTPS/u);
});

await check("trusted_agent_preview_still_requires_real_human_confirm_and_fenced_apply", async () => {
  const data = await loadStarcraftTmgData(PROJECT_ROOT);
  const initialState = createStarcraftTmgSampleState(data);
  initialState.board.terrain = [];
  initialState.activeSideKey = "player1";
  const engine = createStarcraftTmgAuthoritativeEngine({ now: () => OCCURRED_AT });
  const room = createStarcraftTmgRoomRuntime({ authorityEngine: engine, now: () => OCCURRED_AT });
  const created = await room.createRoom({
    roomId: ROOM_ID,
    gameId: "starcraft-tmg",
    initialStateAuthority: {
      source: "server_factory",
      state: initialState,
      dataVersion: data.version,
      receiptHash: hashStarcraftTmgContract({ source: "slice-150", initialState }),
    },
    serverSeatPlan: [
      { label: "human", seatKey: "player1", roleMode: "player", principalType: "human" },
      { label: "model", seatKey: "player1", roleMode: "opponent", principalType: "model" },
    ],
  });
  assert.equal(created.ok, true);
  const roomCalls = [];
  const backing = createInMemoryStarcraftTmgAuthoritativeTransportAdapter({ roomRuntime: room });
  const base = createStarcraftTmgClientDomain({
    transport: {
      async execute(input) {
        roomCalls.push(input.operation);
        return backing.execute(input);
      },
    },
    projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
    lifecycle: createInMemoryStarcraftTmgLifecycleAdapter({ online: true, visibility: "active" }),
    now: () => OCCURRED_AT,
    createId: ids("authority"),
  });
  await base.bootstrap({
    route: { roomId: ROOM_ID },
    principal: { seatToken: created.credentials.human.seatToken },
    surface: "expo_web",
    locale: "zh-CN",
  });
  await base.dispatch({ type: "load_legal_space" });
  const modelSpace = await room.legalSpace({
    roomId: ROOM_ID,
    seatToken: created.credentials.model.seatToken,
  });
  const candidate = modelSpace.legalSpace.candidates.find((entry) => entry.isEnabled);
  const generated = await room.previewAction({
    roomId: ROOM_ID,
    seatToken: created.credentials.model.seatToken,
    candidateId: candidate.candidateId,
  });
  assert.equal(generated.ok, true);
  assert.equal(generated.preview.core.confirmationPolicy.requiresExplicitHuman, true);
  const raw = generated.preview;
  const projectionCore = {
    schemaVersion: "starcraft_tmg_online_role_turn_runtime_v1.preview-projection",
    previewId: raw.previewId,
    previewToken: raw.previewToken,
    previewContentHash: raw.previewSeal.contentHash,
    roomId: raw.core.roomId,
    matchBindingHash: raw.core.matchBindingHash,
    expectedStateRevision: raw.core.expectedStateRevision,
    preStateHash: raw.core.preStateHash,
    legalSpaceHash: raw.core.legalSpaceHash,
    candidateId: candidate.candidateId,
    candidateHash: hashStarcraftTmgContract(candidate),
    proposal: raw.core.proposal,
    proposalHash: raw.core.proposalHash,
    action: raw.core.action,
    result: raw.core.result,
    confirmationPolicy: raw.core.confirmationPolicy,
    confirmationRequired: true,
    confirmationOwner: "human_outside_agent_runtime",
    modelMayConfirm: false,
    modelMayApply: false,
    trainingTruth: false,
  };
  const projection = {
    ...projectionCore,
    previewProjectionHash: hashStarcraftTmgContract(projectionCore),
  };
  const beforeRevision = base.read().roomProjection.room.stateRevision;
  const confirmed = await confirmStarcraftTmgTrustedRoleAgentPreviewV1(base, {
    preview: projection,
    expectedPreviewId: projection.previewId,
  });
  assert.equal(confirmed.ok, true, confirmed.rejection?.code);
  assert.equal(base.read().roomProjection.room.stateRevision, beforeRevision + 1);
  assert.deepEqual(roomCalls.slice(-4),
    ["confirm_preview", "claim_control", "apply_action", "read_room"]);
  assert.equal(confirmed.receipt.refereeSignature.signatureAlgorithm, "ed25519");
});

await check("forged_agent_preview_is_rejected_before_room_confirm", async () => {
  const fake = fakeHost().host;
  assert.throws(() => confirmStarcraftTmgTrustedRoleAgentPreviewV1(fake, {
    preview: {},
    expectedPreviewId: "forged",
  }), /trusted role-Agent Preview ingress/u);
});

await check("expo_panel_contains_mode_budget_chat_cancel_reconnect_and_confirmation_controls", async () => {
  const source = await readFile(path.join(ROOT,
    "apps/starcraft-tmg-expo/components/character/tactical-adjutant-panel.tsx"),
  "utf8");
  for (const marker of [
    "AGENT_MODES", "remainingUnits", "send_agent_message", "cancel_agent_turn",
    "reconnect_agent_session", "agent-human-confirmation", "agent-harness-trace",
  ]) assert(source.includes(marker), `Expo control missing ${marker}`);
});

await check("slice_keeps_live_provider_byok_skill_dsh_and_training_out_of_scope", async () => {
  const serialized = JSON.stringify(client.read().roleAgentSession);
  assert.equal(serialized.includes("apiKey"), false);
  assert.equal(client.read().roleAgentSession.capabilities.providerCredentialInput, false);
  assert.equal(client.read().roleAgentSession.capabilities.skillGeneration, false);
  assert.equal(client.read().roleAgentSession.trainingTruth, false);
});

const reportCore = {
  schemaVersion: "starcraft_tmg_ticket_15_role_agent_client_report_v1",
  generatedAt: OCCURRED_AT,
  ticket: 15,
  slice: 150,
  status: failures.length ? "failed" : "passed",
  assertionsPassed: checks.filter((entry) => entry.passed).length,
  assertionsTotal: checks.length,
  checks,
  failures,
  clientDomainInterface: STARCRAFT_TMG_CLIENT_DOMAIN_INTERFACE,
  roleAgentClientContractHash:
    STARCRAFT_TMG_TICKET_15_ROLE_AGENT_CLIENT_CONTRACT_V1
      .roleAgentClientContractHash,
  transports: ["http_same_origin_cookie", "injected_port"],
  humanConfirmationFlow: "Agent Preview -> human intent -> Confirm -> lease -> Apply -> Receipt -> read",
  liveProviderCalled: false,
  injectedGatewayUsed: true,
  sourceRefreshPerformed: false,
  nativeDeviceEvidence: "deferred_by_user",
  skillGenerated: false,
  dshRun: false,
  muzeroDataGenerated: false,
  selfPlayRun: false,
  trainingTruth: false,
};
const report = {
  ...reportCore,
  reportHash: hashStarcraftTmgContract(reportCore),
};
await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
