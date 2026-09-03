#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgBattleLabRuntime } from
  "../apps/starcraft-tmg-battle-lab/battle-lab-runtime-v1.mjs";
import {
  STARCRAFT_TMG_TICKET_15_BATTLE_LAB_TRACE_PROJECTION_CONTRACT_V2,
} from "../content/agent/ticket-15-battle-lab-trace-projection-contract-v2.mjs";
import {
  createStarcraftTmgAuthoritativeEngine,
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/transition-v1.mjs";
import {
  createInMemoryStarcraftTmgAuthoritativeTransportAdapter,
} from "../packages/client-domain/authoritative-transport-adapters-v1.mjs";
import {
  projectStarcraftTmgBattleLabObservabilityV1,
} from "../packages/client-domain/battle-lab-observability-v1.mjs";
import { STARCRAFT_TMG_CLIENT_DOMAIN_INTERFACE } from
  "../packages/client-domain/client-domain-v1.mjs";
import { createInMemoryStarcraftTmgLifecycleAdapter } from
  "../packages/client-domain/lifecycle-adapters-v1.mjs";
import { hashStarcraftTmgClientContract } from
  "../packages/client-domain/portable-contract-hash-v1.mjs";
import { createInMemoryStarcraftTmgProjectionStoreAdapter } from
  "../packages/client-domain/projection-store-adapters-v1.mjs";
import {
  assertStarcraftTmgRoleAgentTraceProjectionV2,
  createStarcraftTmgRoleAgentTraceProjectionPortV2,
  projectStarcraftTmgRoleAgentTraceProjectionV2,
  STARCRAFT_TMG_ROLE_AGENT_TRACE_PROJECTION_VERSION,
} from "../packages/client-domain/role-agent-trace-projection-v2.mjs";
import { createStarcraftTmgRoomRuntime } from
  "../packages/room-runtime/in-memory-room-v1.mjs";
import {
  createStarcraftTmgSampleState,
  loadStarcraftTmgData,
} from "../../scripts/starcraft-tmg-rules-v0.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_ROOT = path.resolve(ROOT, "..");
const OUTPUT = path.join(ROOT,
  "build/ticket-15-slice-151-battle-lab-trace-projection-v2/report.json");
const OCCURRED_AT = "2026-09-04T10:00:00.000Z";
const ROOM_ID = "slice-151-live-battle-lab-room";
const RAW_OUTPUT_SENTINEL = "RAW_PROVIDER_OUTPUT_MUST_NOT_ENTER_TRACE_151";
const checks = [];
const failures = [];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ids(scope = "slice151") {
  let sequence = 0;
  return (kind) => `${kind}-${scope}-${String(sequence += 1).padStart(4, "0")}`;
}

async function check(id, operation) {
  try {
    await operation();
    checks.push({ id, passed: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push({ id, passed: false, error: message });
    failures.push(`${id}: ${message}`);
  }
}

function verifyHash(value, field) {
  const { [field]: observed, ...core } = value;
  assert.equal(hashStarcraftTmgContract(core), observed);
}

function baseRoleProjection(patch = {}) {
  const core = {
    schemaVersion:
      "starcraft_tmg_client_domain_v1.role_agent_session_v1.projection",
    enabled: true,
    agentRevision: 7,
    status: "waiting_confirmation",
    mode: "opponent",
    sessionRef: "1".repeat(64),
    sessionBindingHash: "2".repeat(64),
    lifecycleState: "active",
    connectionEpoch: 3,
    provider: { state: "configured", liveProviderClaim: false },
    budget: { policy: { maxTotalUnits: 2_000 }, remainingUnits: 1_200, turnCount: 2 },
    currentTurn: {
      turnId: "server-turn-private-locator",
      state: "completed",
      intent: "take_turn",
      terminalAt: OCCURRED_AT,
    },
    messages: [{
      id: "message-1",
      author: "agent",
      text: RAW_OUTPUT_SENTINEL,
      occurredAt: OCCURRED_AT,
    }],
    decision: {
      candidateId: "candidate-move-1",
      candidateHash: "3".repeat(64),
      selectedReason: "Private free-form model rationale sentinel",
      scoreOrPositionValue: "+0.6",
      risk: "counterattack",
      rejectedAlternatives: [
        { candidateId: "candidate-hold-1", reason: "lower value" },
      ],
      memoryInfluence: null,
      decisionReceiptHash: "4".repeat(64),
      previewProjectionHash: "5".repeat(64),
    },
    pendingConfirmation: {
      previewId: "preview-opaque-locator",
      previewProjectionHash: "5".repeat(64),
      candidateId: "candidate-move-1",
      actionType: "move_unit",
      confirmationRequired: true,
      modelMayConfirm: false,
      modelMayApply: false,
      trainingTruth: false,
    },
    trace: {
      traceId: "server-trace-private-locator",
      gameId: "starcraft-tmg",
      roleMode: "opponent",
      mode: "opponent",
      intent: "take_turn",
      promptPack: { id: "starcraft-tmg.opponent.v1", hash: "6".repeat(64) },
      harnessVersion: "starcraft_tmg_online_role_context_runtime_v1",
      agentVersion: "server-profile-v1",
      toolCalls: ["read_board_state", "list_legal_actions", "preview_action"],
      ruleSkillRefs: [{ id: "turn-flow", hash: "7".repeat(64) }],
      memoryRefs: [{ id: "same-room", hash: "8".repeat(64) }],
      decisionReceiptHash: "4".repeat(64),
      previewProjectionHash: "5".repeat(64),
      confirmationRequired: true,
      occurredAt: OCCURRED_AT,
      reviewStatus: "raw",
      rawPromptExposed: false,
      rawProviderOutputExposed: false,
      eligibleForTraining: false,
      trainingTruth: false,
    },
    rejection: null,
    readOnly: false,
    requiresExplicitReconnect: false,
    capabilities: {
      modes: ["tutor", "opponent", "commentator", "companion"],
      intentsByMode: {
        tutor: ["chat", "explain"],
        opponent: ["chat", "take_turn"],
        commentator: ["commentate"],
        companion: ["chat", "reflect"],
      },
    },
    rawPromptExposed: false,
    rawProviderOutputExposed: false,
    providerReceiptExposed: false,
    updatedAt: OCCURRED_AT,
    productionReady: false,
    trainingTruth: false,
    ...clone(patch),
  };
  return { ...core, projectionHash: hashStarcraftTmgClientContract(core) };
}

function sourceView(role = baseRoleProjection(), patch = {}) {
  return {
    locator: { roomId: ROOM_ID },
    roomProjection: {
      room: { roomId: ROOM_ID, stateHash: "9".repeat(64) },
    },
    legalSpace: { legalSpaceHash: "a".repeat(64) },
    hostViewHash: "b".repeat(64),
    roleAgentSession: role,
    ...clone(patch),
  };
}

function projectionFor(role = baseRoleProjection()) {
  return projectStarcraftTmgRoleAgentTraceProjectionV2({
    clientView: sourceView(role),
    generatedAt: OCCURRED_AT,
  });
}

function session(mode = "companion", epoch = 1, lifecycleState = "active") {
  return {
    sessionId: "slice-151-server-session-0001",
    sessionRevision: epoch,
    lifecycleState,
    turnState: "idle",
    roomId: ROOM_ID,
    sessionBindingHash: "c".repeat(64),
    seatKey: "player1",
    mode,
    character: { characterId: "starcraft.kerrigan" },
    roomBinding: { matchBindingHash: "d".repeat(64) },
    capability: {},
    connection: {
      epoch,
      state: lifecycleState === "active" ? "connected" : "ended",
    },
    createdAt: OCCURRED_AT,
    updatedAt: OCCURRED_AT,
    endedAt: lifecycleState === "ended" ? OCCURRED_AT : null,
    productionReady: false,
    trainingTruth: false,
  };
}

async function waitFor(operation, message) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (operation()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.fail(message);
}

await check("contract_is_hash_sealed_and_binds_slice_150", () => {
  const contract =
    STARCRAFT_TMG_TICKET_15_BATTLE_LAB_TRACE_PROJECTION_CONTRACT_V2;
  verifyHash(contract, "traceProjectionContractHash");
  assert.equal(contract.slice, 151);
  assert.match(contract.predecessorRoleAgentClientContractHash,
    /^[a-f0-9]{64}$/u);
  assert.deepEqual(contract.observableStates,
    ["session", "turn", "tools", "decision", "confirmation", "failure"]);
});

let safeProjection;
await check("projector_emits_hash_sealed_exact_v2_projection", () => {
  safeProjection = projectionFor();
  assert.equal(safeProjection.schemaVersion,
    STARCRAFT_TMG_ROLE_AGENT_TRACE_PROJECTION_VERSION);
  assertStarcraftTmgRoleAgentTraceProjectionV2(safeProjection, ROOM_ID);
  verifyHash(safeProjection, "projectionHash");
  assert.deepEqual(safeProjection.traces.map((entry) => entry.kind),
    ["session", "turn", "tools", "decision", "confirmation"]);
});

await check("source_agent_hash_session_binding_and_epoch_are_exact", () => {
  const role = baseRoleProjection();
  const projected = projectionFor(role);
  assert.equal(projected.identity.sourceAgentProjectionHash,
    role.projectionHash);
  assert.equal(projected.identity.sessionRef, role.sessionRef);
  assert.equal(projected.identity.sessionBindingHash,
    role.sessionBindingHash);
  assert.equal(projected.identity.connectionEpoch, role.connectionEpoch);
  assert.equal(projected.identity.hostViewHash, sourceView(role).hostViewHash);
});

await check("trace_omits_conversation_rationale_and_private_server_locators", () => {
  const serialized = JSON.stringify(safeProjection);
  assert.equal(serialized.includes(RAW_OUTPUT_SENTINEL), false);
  assert.equal(serialized.includes("Private free-form model rationale sentinel"), false);
  assert.equal(serialized.includes("server-turn-private-locator"), false);
  assert.equal(serialized.includes("server-trace-private-locator"), false);
  assert.equal(serialized.includes("slice-151-server-session"), false);
  assert.match(safeProjection.traces.find((entry) => entry.kind === "decision")
    .decision.selectedReasonHash, /^[a-f0-9]{64}$/u);
});

await check("tools_rules_and_memory_are_catalogued_or_hash_only", () => {
  const trace = safeProjection.traces.find((entry) => entry.kind === "tools");
  assert.deepEqual(trace.harnessToolsCalled,
    ["read_board_state", "list_legal_actions", "preview_action"]);
  assert.deepEqual(trace.ruleSkillRefHashes, ["7".repeat(64)]);
  assert.deepEqual(trace.memoryRefHashes, ["8".repeat(64)]);
  assert.equal(JSON.stringify(trace).includes("turn-flow"), false);
  assert.equal(JSON.stringify(trace).includes("same-room"), false);
});

await check("all_privacy_and_training_claims_are_closed", () => {
  assert(Object.values(safeProjection.privacy).every((entry) => entry === false));
  assert.equal(safeProjection.trainingTruth, false);
  assert(safeProjection.traces.every((entry) =>
    entry.trainingTruth === false && entry.eligibleForTraining === false));
});

await check("failure_state_projects_code_without_error_text", () => {
  const failure = projectionFor(baseRoleProjection({
    status: "ready",
    pendingConfirmation: null,
    decision: null,
    rejection: {
      code: "provider_not_configured",
      details: { internalMessage: RAW_OUTPUT_SENTINEL },
      occurredAt: OCCURRED_AT,
      trainingTruth: false,
    },
  }));
  const trace = failure.traces.find((entry) => entry.kind === "failure");
  assert.equal(trace.failureCode, "provider_not_configured");
  assert.equal(JSON.stringify(failure).includes(RAW_OUTPUT_SENTINEL), false);
});

await check("tampered_source_hash_is_rejected", () => {
  const role = baseRoleProjection();
  role.status = "forged";
  assert.throws(() => projectionFor(role),
    /AGENT_TRACE_SOURCE_PROJECTION_HASH_INVALID/u);
});

await check("cross_room_source_is_rejected", () => {
  const view = sourceView();
  view.locator.roomId = "other-room";
  assert.throws(() => projectStarcraftTmgRoleAgentTraceProjectionV2({
    clientView: view,
    roomId: ROOM_ID,
    generatedAt: OCCURRED_AT,
  }), /AGENT_TRACE_SOURCE_ROOM_MISMATCH/u);
});

await check("unknown_tool_and_invalid_reference_fail_closed", () => {
  const unknownTool = baseRoleProjection();
  unknownTool.trace.toolCalls.push("model_free_form_tool_name");
  const { projectionHash: ignoredToolHash, ...unknownToolCore } = unknownTool;
  void ignoredToolHash;
  unknownTool.projectionHash = hashStarcraftTmgClientContract(unknownToolCore);
  assert.throws(() => projectionFor(unknownTool),
    /AGENT_TRACE_TOOL_NOT_CATALOGUED/u);
  const invalidRef = baseRoleProjection();
  invalidRef.trace.memoryRefs[0].hash = "not-a-hash";
  const { projectionHash: ignoredRefHash, ...invalidRefCore } = invalidRef;
  void ignoredRefHash;
  invalidRef.projectionHash = hashStarcraftTmgClientContract(invalidRefCore);
  assert.throws(() => projectionFor(invalidRef),
    /AGENT_TRACE_MEMORYREFS_INVALID/u);
});

await check("tampered_projection_and_secret_field_fail_closed", () => {
  const tampered = clone(safeProjection);
  tampered.status = "ended";
  assert.throws(() => assertStarcraftTmgRoleAgentTraceProjectionV2(
    tampered, ROOM_ID), /AGENT_TRACE_PROJECTION_HASH_INVALID/u);
  const secret = clone(safeProjection);
  secret.traces[0].rawOutput = RAW_OUTPUT_SENTINEL;
  assert.throws(() => assertStarcraftTmgRoleAgentTraceProjectionV2(
    secret, ROOM_ID), /AGENT_TRACE_SECRET_FIELD_REJECTED/u);
});

await check("read_port_accepts_only_room_locator_and_reuses_same_client_view", async () => {
  const role = baseRoleProjection();
  const view = sourceView(role);
  const port = createStarcraftTmgRoleAgentTraceProjectionPortV2({
    clientDomain: { read: () => view },
    now: () => OCCURRED_AT,
  });
  const projected = await port.read({ roomId: ROOM_ID });
  assert.equal(projected.identity.sourceAgentProjectionHash,
    role.projectionHash);
  await assert.rejects(() => port.read({
    roomId: ROOM_ID,
    seatToken: "forbidden",
  }), /AGENT_TRACE_PORT_INPUT_INVALID/u);
});

await check("battle_lab_observability_accepts_v2_and_exposes_safe_harness_evidence", () => {
  const view = sourceView();
  view.phase = "ready";
  view.lifecycle = { online: true, visibility: "active" };
  view.roomProjection.viewer = { roleMode: "player", visibilityScope: "seat" };
  const observed = projectStarcraftTmgBattleLabObservabilityV1({
    clientView: view,
    agentTraceProjection: safeProjection,
  });
  assert.equal(observed.agent.schemaVersion,
    STARCRAFT_TMG_ROLE_AGENT_TRACE_PROJECTION_VERSION);
  assert.equal(observed.agentControls.rawConversationProjected, false);
  assert.equal(observed.harness.agentIdentityEvidence.sourceAgentProjectionHash,
    view.roleAgentSession.projectionHash);
  assert.equal(observed.harness.agentDecisionEvidence.length, 2);
  assert(observed.harness.userVisibleChecks.includes(
    "live_agent_trace_identity_and_privacy_are_visible"));
});

await check("historical_v1_projection_remains_readable_without_becoming_default", () => {
  const view = sourceView();
  view.phase = "ready";
  view.lifecycle = { online: true, visibility: "active" };
  const v1 = {
    schemaVersion: "starcraft_tmg_agent_trace_projection_v1",
    roomId: ROOM_ID,
    status: "historical_adapter",
    generatedAt: OCCURRED_AT,
    traces: [],
    trainingTruth: false,
  };
  const observed = projectStarcraftTmgBattleLabObservabilityV1({
    clientView: view,
    agentTraceProjection: v1,
  });
  assert.equal(observed.agent.status, "historical_adapter");
  assert.equal(observed.agent.schemaVersion,
    "starcraft_tmg_agent_trace_projection_v1");
});

const data = await loadStarcraftTmgData(PROJECT_ROOT);
const initialState = createStarcraftTmgSampleState(data);
initialState.board.terrain = [];
initialState.activeSideKey = "player1";
const engine = createStarcraftTmgAuthoritativeEngine({ now: () => OCCURRED_AT });
const room = createStarcraftTmgRoomRuntime({
  authorityEngine: engine,
  characterReleaseChannel: "development_internal",
  now: () => OCCURRED_AT,
});
const created = await room.createRoom({
  roomId: ROOM_ID,
  matchId: "slice-151-live-battle-lab-match",
  gameId: "starcraft-tmg",
  surfaceMode: "battle_lab",
  initialStateAuthority: {
    source: "server_factory",
    state: initialState,
    dataVersion: data.version,
    receiptHash: hashStarcraftTmgContract({ source: "slice-151", initialState }),
  },
  serverSeatPlan: [{
    label: "human",
    seatKey: "player1",
    roleMode: "player",
    principalType: "human",
  }],
});
assert.equal(created.ok, true, created.reason);

let activeSession = session();
let currentTurn = null;
let lastTrace = null;
let slowResolve;
const agentCalls = [];
const agentTransport = {
  async execute(input) {
    agentCalls.push(clone(input));
    if (input.operation === "create_session") {
      activeSession = session(input.mode);
      return { ok: true, session: activeSession };
    }
    if (input.operation === "read_session") {
      return {
        ok: true,
        session: activeSession,
        context: {
          promptPack: {
            id: `starcraft-tmg.${activeSession.mode}.v1`,
            hash: "e".repeat(64),
          },
          ruleSkillRefs: [{ id: "turn-flow", hash: "f".repeat(64) }],
          memoryRefs: [{ id: "room-memory", hash: "0".repeat(64) }],
          providerState: {
            provider: {
              state: "configured",
              gatewayEvidence: "injected",
              liveProviderClaim: false,
            },
            budget: {
              policy: { maxTotalUnits: 2_000 },
              remainingUnits: 1_500,
              turnCount: currentTurn ? 1 : 0,
            },
            currentTurn,
          },
          lastTrace,
        },
      };
    }
    if (input.operation === "send_turn") {
      currentTurn = {
        turnId: "slice-151-turn-0001",
        turnSequence: 1,
        state: "waiting_provider",
        connectionEpoch: 1,
        intent: input.intent,
        startedAt: OCCURRED_AT,
      };
      if (input.userMessage === "slow") {
        await new Promise((resolve) => { slowResolve = resolve; });
        return { ok: false, reason: "cancelled", turnId: currentTurn.turnId };
      }
      if (input.userMessage === "fail") {
        currentTurn = {
          ...currentTurn,
          state: "failed",
          failure: { code: "provider_failed" },
          terminalAt: OCCURRED_AT,
        };
        lastTrace = {
          traceId: "slice-151-failed-trace",
          gameId: "starcraft-tmg",
          roleMode: activeSession.mode,
          mode: activeSession.mode,
          intent: input.intent,
          promptPack: { id: `starcraft-tmg.${activeSession.mode}.v1` },
          harnessVersion: "starcraft_tmg_online_role_context_runtime_v1",
          agentVersion: "injected-verifier-profile",
          harnessToolsCalled: ["read_board_state"],
          reviewStatus: "rejected",
          occurredAt: OCCURRED_AT,
        };
        return { ok: false, reason: "provider_failed", turnId: currentTurn.turnId };
      }
      currentTurn = {
        ...currentTurn,
        state: "completed",
        terminalAt: OCCURRED_AT,
      };
      lastTrace = {
        traceId: "slice-151-success-trace",
        gameId: "starcraft-tmg",
        roleMode: activeSession.mode,
        mode: activeSession.mode,
        intent: input.intent,
        promptPack: { id: `starcraft-tmg.${activeSession.mode}.v1` },
        harnessVersion: "starcraft_tmg_online_role_context_runtime_v1",
        agentVersion: "injected-verifier-profile",
        harnessToolsCalled: ["read_board_state", "read_rules_skills"],
        reviewStatus: "raw",
        occurredAt: OCCURRED_AT,
      };
      return {
        ok: true,
        turn: currentTurn,
        output: {
          channels: { speech: { text: RAW_OUTPUT_SENTINEL } },
          visualCue: "reflect",
        },
        decision: null,
        preview: null,
        trace: lastTrace,
        budget: { policy: { maxTotalUnits: 2_000 }, remainingUnits: 1_400 },
      };
    }
    if (input.operation === "cancel_turn") {
      currentTurn = {
        ...currentTurn,
        state: "cancelled",
        terminalAt: OCCURRED_AT,
      };
      slowResolve?.();
      return { ok: true, turn: currentTurn, budget: { remainingUnits: 1_300 } };
    }
    if (input.operation === "reconnect_session") {
      activeSession = session(activeSession.mode,
        activeSession.connection.epoch + 1);
      return { ok: true, session: activeSession };
    }
    if (input.operation === "end_session") {
      activeSession = session(activeSession.mode,
        activeSession.connection.epoch, "ended");
      return { ok: true, session: activeSession };
    }
    return { ok: true, events: [], nextCursor: 0 };
  },
};

const liveLab = createStarcraftTmgBattleLabRuntime({
  transport: createInMemoryStarcraftTmgAuthoritativeTransportAdapter({
    roomRuntime: room,
    enableCharacterPresentation: true,
  }),
  agentTransport,
  projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
  lifecycle: createInMemoryStarcraftTmgLifecycleAdapter({
    online: true,
    visibility: "active",
  }),
  enableRoleAgentSession: true,
  now: () => OCCURRED_AT,
  createId: ids("live"),
});

await check("live_battle_lab_preserves_exact_four_operation_interface", () => {
  assert.deepEqual(Object.keys(liveLab), STARCRAFT_TMG_CLIENT_DOMAIN_INTERFACE);
});

await check("live_battle_lab_bootstrap_replaces_ticket_15_placeholder", async () => {
  const result = await liveLab.bootstrap({
    route: { roomId: ROOM_ID },
    principal: { seatToken: created.credentials.human.seatToken },
    locale: "en",
  });
  assert.equal(result.ok, true, result.rejection?.code);
  assert.equal(liveLab.read().agent.schemaVersion,
    STARCRAFT_TMG_ROLE_AGENT_TRACE_PROJECTION_VERSION);
  assert.equal(liveLab.read().agent.status, "not_started");
  assert.notEqual(liveLab.read().agent.status, "not_mounted_ticket_15");
  assert.equal(liveLab.read().agentControls.rawConversationProjected, false);
});

await check("live_session_and_successful_turn_publish_identity_tools_and_budget", async () => {
  const opened = await liveLab.dispatch({
    type: "open_agent_session",
    mode: "companion",
  });
  assert.equal(opened.ok, true, opened.rejection?.code);
  assert.equal(liveLab.read().agent.identity.sessionBindingHash,
    activeSession.sessionBindingHash);
  assert.equal(liveLab.read().agent.identity.connectionEpoch, 1);
  const sent = await liveLab.dispatch({
    type: "send_agent_message",
    intent: "reflect",
    message: "Review the current position.",
  });
  assert.equal(sent.ok, true, sent.rejection?.code);
  const view = liveLab.read();
  assert(view.agent.traces.some((entry) => entry.kind === "turn"
    && entry.state === "completed"));
  assert.deepEqual(view.harness.harnessToolsCalled,
    ["read_board_state", "read_rules_skills"]);
  assert.equal(view.agentControls.budget.remainingUnits, 1_400);
  assert.equal(JSON.stringify(view.agent).includes(RAW_OUTPUT_SENTINEL), false);
});

await check("waiting_provider_is_visible_before_the_turn_promise_settles", async () => {
  const pending = liveLab.dispatch({
    type: "send_agent_message",
    intent: "chat",
    message: "slow",
  });
  await waitFor(() => liveLab.read().agent.traces.some((entry) =>
    entry.kind === "turn" && entry.state === "waiting_provider"),
  "Battle Lab did not publish waiting_provider before settlement");
  const cancelled = await liveLab.dispatch({ type: "cancel_agent_turn" });
  assert.equal(cancelled.ok, true, cancelled.rejection?.code);
  await pending;
});

await check("live_failure_projects_failure_code_without_raw_error_or_output", async () => {
  const failed = await liveLab.dispatch({
    type: "send_agent_message",
    intent: "chat",
    message: "fail",
  });
  assert.equal(failed.ok, false);
  const trace = liveLab.read().agent.traces.find((entry) =>
    entry.kind === "failure");
  assert.equal(trace.failureCode, "provider_failed");
  assert.equal(JSON.stringify(liveLab.read().agent).includes(RAW_OUTPUT_SENTINEL),
    false);
});

await check("battle_lab_source_contains_all_trace_controls_and_live_mount", async () => {
  const [app, html, runtime] = await Promise.all([
    readFile(path.join(ROOT, "apps/starcraft-tmg-battle-lab/app.mjs"), "utf8"),
    readFile(path.join(ROOT, "apps/starcraft-tmg-battle-lab/index.html"), "utf8"),
    readFile(path.join(ROOT,
      "apps/starcraft-tmg-battle-lab/battle-lab-runtime-v1.mjs"), "utf8"),
  ]);
  for (const marker of [
    "agent-open", "agent-send", "agent-cancel", "agent-reconnect",
    "agent-end", "agent-confirm", "enableRoleAgentSession: true",
  ]) assert(`${app}\n${html}`.includes(marker), `missing ${marker}`);
  assert(runtime.includes("createStarcraftTmgRoleAgentTraceProjectionPortV2"));
  assert(!/fetch\s*\(/u.test(app));
});

await check("slice_does_not_accept_api_keys_or_claim_live_provider_skill_or_training", () => {
  const contract =
    STARCRAFT_TMG_TICKET_15_BATTLE_LAB_TRACE_PROJECTION_CONTRACT_V2;
  assert.equal(contract.runTruth.apiKeyAccepted, false);
  assert.equal(contract.runTruth.liveProviderCalled, false);
  assert.equal(contract.runTruth.skillGenerated, false);
  assert.equal(contract.runTruth.dshRun, false);
  assert.equal(contract.runTruth.muzeroDataGenerated, false);
  assert.equal(contract.runTruth.trainingTruth, false);
  assert(agentCalls.every((entry) => !Object.keys(entry).some((key) =>
    /api.?key|credential/iu.test(key))));
});

const reportCore = {
  schemaVersion:
    "starcraft_tmg_ticket_15_battle_lab_trace_projection_report_v2",
  generatedAt: OCCURRED_AT,
  ticket: 15,
  slice: 151,
  ticketProgress: "8/9",
  projectProgress: "13/22",
  status: failures.length ? "failed" : "passed",
  assertionsPassed: checks.filter((entry) => entry.passed).length,
  assertionsTotal: checks.length,
  checks,
  failures,
  traceProjectionContractHash:
    STARCRAFT_TMG_TICKET_15_BATTLE_LAB_TRACE_PROJECTION_CONTRACT_V2
      .traceProjectionContractHash,
  projectionSchema: STARCRAFT_TMG_ROLE_AGENT_TRACE_PROJECTION_VERSION,
  observableStates: [
    "session", "turn", "tools", "decision", "confirmation", "failure",
  ],
  battleLabClientInterface: STARCRAFT_TMG_CLIENT_DOMAIN_INTERFACE,
  liveProviderCalled: false,
  apiKeyAccepted: false,
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
