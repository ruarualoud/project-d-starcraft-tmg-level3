#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_TICKET_15_ROLE_CONTEXT_ISOLATION_CONTRACT_V1 } from
  "../content/agent/ticket-15-role-context-isolation-contract-v1.mjs";
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
import { createInMemoryStarcraftTmgPromptArtifactStoreV1 } from
  "../packages/online-agent-session/prompt-artifact-store-v1.mjs";
import {
  createStarcraftTmgOnlineMemorySnapshotV1,
  createStarcraftTmgOnlineRuleSkillSnapshotV1,
} from "../packages/online-agent-session/role-context-contracts-v1.mjs";
import { createStarcraftTmgOnlineRoleContextRuntimeV1 } from
  "../packages/online-agent-session/role-context-runtime-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(ROOT,
  "build/ticket-15-slice-147-role-context-isolation-v1/report.json");
const bundle = createKerriganPrimalProductBundleV1();
const characterPackage = bundle.characterPackage;
const ROOM_ID = "slice-147-room";
const RULES_VERSION = "0.112.0-official-faq-v1-current";
const DATA_VERSION = "official-onetime-snapshot-v1";
const CHARACTER_SELECTION_HASH = hashStarcraftTmgContract({
  characterId: characterPackage.characterId,
  persona: "hots.primal_queen.post_zerus",
  scope: "slice-147-room-selection",
});

function verifyHash(value, field) {
  const { [field]: observed, ...unsigned } = value;
  assert.equal(hashStarcraftTmgContract(unsigned), observed);
}

function roomBinding() {
  return {
    schemaVersion: "starcraft_tmg_match_room_binding_v1",
    rulesVersion: RULES_VERSION,
    dataVersion: DATA_VERSION,
    matchBindingHash: "a".repeat(64),
    sourceSnapshotHash: "b".repeat(64),
    dataSnapshotHash: "c".repeat(64),
    rulesArtifactHash: "d".repeat(64),
    executorArtifactHash: "e".repeat(64),
    geometryArtifactHash: "f".repeat(64),
    actionSchemaHash: "1".repeat(64),
  };
}

function principalBinding(mode, overrides = {}) {
  const configurations = {
    tutor: { scope: "2", seatKey: "player1", principalType: "human", principalRoleMode: "player" },
    opponent: { scope: "3", seatKey: "player2", principalType: "model", principalRoleMode: "opponent" },
    commentator: { scope: "4", seatKey: "observer", principalType: "service", principalRoleMode: "commentator" },
    companion: { scope: "5", seatKey: "player1", principalType: "human", principalRoleMode: "player" },
  };
  const config = configurations[mode];
  return createStarcraftTmgOnlinePrincipalBindingV1({
    roomId: ROOM_ID,
    principalScopeHash: config.scope.repeat(64),
    seatKey: config.seatKey,
    principalType: config.principalType,
    principalRoleMode: config.principalRoleMode,
    bindingRevision: 1,
    allowedAgentModes: [mode],
    characterId: characterPackage.characterId,
    characterPackageHash: characterPackage.integrity.hash,
    characterSelectionHash: CHARACTER_SELECTION_HASH,
    roomBinding: roomBinding(),
    ...overrides,
  });
}

const principals = new Map([
  "tutor", "opponent", "commentator", "companion",
].map((mode) => [`principal-${mode}`, principalBinding(mode)]));
principals.set("principal-tutor-other", principalBinding("tutor", {
  principalScopeHash: "6".repeat(64),
}));

let sessionSequence = 0;
let sessionInstant = 0;
const lifecycle = createStarcraftTmgOnlineAgentSessionLifecycleV1({
  principalAuthority: {
    async resolve({ roomId, principalSessionRef }) {
      const binding = principals.get(principalSessionRef);
      return binding?.roomId === roomId
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
    return `slice-147-session-${String(sessionSequence).padStart(3, "0")}`;
  },
  now() {
    const value = new Date(Date.UTC(2026, 8, 4, 1, 0, sessionInstant));
    sessionInstant += 1;
    return value.toISOString();
  },
});

async function createSession(mode, principal = `principal-${mode}`) {
  const result = await lifecycle.createSession({
    roomId: ROOM_ID,
    mode,
    characterId: characterPackage.characterId,
  }, { principalSessionRef: principal });
  assert.equal(result.ok, true);
  return result.session;
}

function context(mode, principal = `principal-${mode}`) {
  return { principalSessionRef: principal };
}

function matchBinding() {
  return {
    bindingHash: "a".repeat(64),
    rulesVersion: RULES_VERSION,
    dataVersion: DATA_VERSION,
    sourceSnapshotHash: "b".repeat(64),
    dataSnapshotHash: "c".repeat(64),
    rulesArtifactHash: "d".repeat(64),
    executorArtifactHash: "e".repeat(64),
    geometryArtifactHash: "f".repeat(64),
    actionSchemaHash: "1".repeat(64),
  };
}

const STATE_HASH = hashStarcraftTmgContract({ roomId: ROOM_ID, revision: 7 });
function roomProjection(input) {
  return {
    schemaVersion: "starcraft_tmg_viewer_room_projection_v3",
    room: { roomId: ROOM_ID, stateRevision: 7, stateHash: STATE_HASH },
    viewer: input.mode === "commentator"
      ? { roleMode: "public_observer", visibilityScope: "public", capabilities: ["read_public"] }
      : { seatKey: input.seatKey, roleMode: input.mode, visibilityScope: input.visibilityPolicy },
    matchBinding: matchBinding(),
    state: {
      round: 2,
      phase: "combat",
      activeSideKey: "player1",
      pieces: [{ id: "marine-1", sideKey: "player1", unitId: "marine" }],
    },
    training: { eligibleForTraining: false, trainingTruth: false },
  };
}

function legalSpace() {
  return {
    schemaVersion: "starcraft_tmg_legal_space_v1",
    roomId: ROOM_ID,
    matchBindingHash: "a".repeat(64),
    stateRevision: 7,
    stateHash: STATE_HASH,
    legalSpaceHash: hashStarcraftTmgContract({ roomId: ROOM_ID, revision: 7, candidates: 2 }),
    candidates: [
      { candidateId: "candidate-hold", isEnabled: true, action: { actionType: "hold" } },
      { candidateId: "candidate-move", isEnabled: true, action: { actionType: "move" } },
    ],
  };
}

function publicEvents() {
  const events = [{ sequence: 1, type: "round_started", round: 2 }];
  return {
    schemaVersion: "starcraft_tmg_public_events_v1",
    roomId: ROOM_ID,
    matchBindingHash: "a".repeat(64),
    events,
    eventsHash: hashStarcraftTmgContract(events),
  };
}

function skillArtifact(overrides = {}) {
  return {
    schema: "project_d_game_skill_v1",
    gameId: "starcraft-tmg",
    rulesVersion: RULES_VERSION,
    skillId: "starcraft-tmg.current-turn-flow.accepted.v1",
    version: "1.0.0",
    skillType: "turn_flow",
    sourceRefs: [{
      sourceId: "archon.starcraft-tmg-rules.en",
      snapshotId: "official-onetime-snapshot-v1",
      snapshotHash: "b".repeat(64),
      authorityStatus: "official_game_rules",
      rulesEligible: true,
    }],
    appRuleEndpoints: ["GET /api/v1/rooms/:roomId/legal-space"],
    phase: "all",
    preconditions: ["Use the current viewer-scoped room projection."],
    procedure: ["Read current LegalSpace before discussing available actions."],
    legalityChecks: ["Rules service and Referee receipts outrank advice."],
    illegalPatterns: ["Inventing an action absent from current LegalSpace."],
    examples: [],
    counterExamples: [],
    judgeTests: [{ id: "current-space-only", expected: "reject_stale_candidate" }],
    confidence: "source_backed",
    trustTier: "human_reviewed_source_backed",
    status: "human_reviewed",
    humanReviewed: true,
    canAffectStrategy: false,
    canAffectRules: false,
    trainingTruth: false,
    ...overrides,
  };
}

function ruleSkillSnapshot(input) {
  return createStarcraftTmgOnlineRuleSkillSnapshotV1({
    gameId: "starcraft-tmg",
    roomId: input.roomId,
    roomBindingHash: input.roomBinding.roomBindingHash,
    rulesVersion: input.roomBinding.rulesVersion,
    dataVersion: input.roomBinding.dataVersion,
    sourceSnapshotHash: input.roomBinding.sourceSnapshotHash,
    skillEntries: [{ skillArtifact: skillArtifact() }],
  });
}

const namespaceByMode = {
  tutor: "teaching_memory",
  opponent: "strategy_memory",
  commentator: "battle_public_events",
  companion: "user_character_relation",
};
function memorySnapshot(input, overrides = {}) {
  const namespace = overrides.namespace || namespaceByMode[input.mode];
  return createStarcraftTmgOnlineMemorySnapshotV1({
    gameId: "starcraft-tmg",
    roomId: input.roomId,
    principalScopeHash: input.principalScopeHash,
    sessionBindingHash: input.sessionBindingHash,
    mode: input.mode,
    entries: [{
      namespace,
      refId: `${input.mode}-memory-1`,
      version: "1.0.0",
      content: { note: `${input.mode} same-session advisory context` },
      status: "accepted",
      advisoryOnly: true,
      canAffectRules: false,
      trainingTruth: false,
    }],
  });
}

const roomToolCalls = [];
let mutateRuleSnapshot = null;
let mutateMemorySnapshot = null;
let mutateRoomProjection = null;
let mutateLegalSpace = null;
const roomTools = {
  async readBoardState(input) {
    roomToolCalls.push({ method: "readBoardState", input: structuredClone(input) });
    const projection = roomProjection(input);
    return { ok: true, projection: mutateRoomProjection
      ? mutateRoomProjection(projection, input) : projection };
  },
  async listLegalActions(input) {
    roomToolCalls.push({ method: "listLegalActions", input: structuredClone(input) });
    const current = legalSpace();
    return { ok: true, legalSpace: mutateLegalSpace
      ? mutateLegalSpace(current, input) : current };
  },
  async readPublicEvents(input) {
    roomToolCalls.push({ method: "readPublicEvents", input: structuredClone(input) });
    return { ok: true, events: publicEvents() };
  },
  async readRulesSkills(input) {
    roomToolCalls.push({ method: "readRulesSkills", input: structuredClone(input) });
    const snapshot = ruleSkillSnapshot(input);
    return { ok: true, snapshot: mutateRuleSnapshot
      ? mutateRuleSnapshot(snapshot, input) : snapshot };
  },
};

const memoryCalls = [];
const memoryStore = {
  async read(input) {
    memoryCalls.push(structuredClone(input));
    const snapshot = memorySnapshot(input);
    return { ok: true, snapshot: mutateMemorySnapshot
      ? mutateMemorySnapshot(snapshot, input) : snapshot };
  },
};

let reverseMaterialForMode = null;
const materialCalls = [];
const materialCatalog = {
  async resolve(input) {
    materialCalls.push(structuredClone(input));
    const worldbooks = reverseMaterialForMode === input.mode
      ? [...bundle.worldbooks].reverse()
      : bundle.worldbooks;
    return {
      ok: true,
      characterPackage: bundle.characterPackage,
      roleSkillPack: bundle.roleSkillPacks[input.mode],
      conversationProfile: bundle.conversationProfile,
      providerProfile: bundle.providerProfile,
      worldbooks,
      spoilerCeilingRank: 60,
      knowledgeCeilingRank: 60,
      allowFanon: false,
    };
  },
};

let promptId = 0;
const promptStore = createInMemoryStarcraftTmgPromptArtifactStoreV1({
  createId() {
    promptId += 1;
    return `slice-147-prompt-${String(promptId).padStart(3, "0")}`;
  },
  maxArtifacts: 32,
  maxArtifactBytes: 1024 * 1024,
});
const gatewayCalls = [];
const resolvedPromptArtifacts = [];
const providerGateway = {
  async complete(input) {
    gatewayCalls.push(input);
    const resolved = promptStore.resolve(input.promptAssemblyRef);
    assert.equal(resolved.ok, true, "Gateway could not resolve prompt artifact");
    resolvedPromptArtifacts.push(resolved.artifact);
    const userNode = resolved.artifact.nodes.find((entry) => entry.nodeType === "user-message");
    const mode = resolved.artifact.responseContract.mode;
    const unsafe = userNode.content.text.includes("unsafe provider output");
    const output = unsafe
      ? { channels: { speech: { text: "Bearer abcdefghijklmno" } } }
      : { channels: { speech: { text: `${mode} accepted context ${resolved.artifact.receipt.receiptHash.slice(0, 8)}` } } };
    return {
      output,
      usageReceipt: createStarcraftTmgProviderGatewayUsageReceiptV1({
        reservation: input.budgetReservation,
        inputUnits: input.boundedRequest.inputUnits,
        outputUnits: 24,
        providerRequestIdHash: hashStarcraftTmgContract({
          turnId: input.budgetReservation.turnId,
          promptHash: input.promptAssemblyRef.hash,
        }),
        finishedAt: "2026-09-04T01:20:00.000Z",
      }),
    };
  },
};

let turnSequence = 0;
const providerSupervisor = createStarcraftTmgProviderGatewaySupervisorV1({
  sessionLifecycle: lifecycle,
  providerGateway,
  gatewayEvidence: "injected_deterministic_prompt_resolver",
  budgetPolicy: {
    maxTotalUnits: 1_000_000,
    maxTurns: 64,
    maxInputUnitsPerTurn: 100_000,
    maxOutputUnitsPerTurn: 4_096,
    timeoutMs: 5_000,
  },
  createId() {
    turnSequence += 1;
    return `slice-147-turn-${String(turnSequence).padStart(3, "0")}`;
  },
  now: () => "2026-09-04T01:10:00.000Z",
});

let contextInstant = 0;
const runtime = createStarcraftTmgOnlineRoleContextRuntimeV1({
  sessionLifecycle: lifecycle,
  providerSupervisor,
  materialCatalog,
  roomTools,
  memoryStore,
  promptArtifactStore: promptStore,
  historyPolicy: { maxEntries: 2, maxBytes: 128 * 1024 },
  maxUserMessageBytes: 4_096,
  maxOutputUnits: 512,
  now() {
    const value = new Date(Date.UTC(2026, 8, 4, 1, 30, contextInstant));
    contextInstant += 1;
    return value.toISOString();
  },
});

function sendInput(session, intent, userMessage) {
  return {
    sessionId: session.sessionId,
    roomId: session.binding.roomId,
    expectedConnectionEpoch: session.connection.epoch,
    intent,
    userMessage,
  };
}

const acceptance = [];
async function accept(name, operation) {
  await operation();
  acceptance.push(`${String(acceptance.length + 1).padStart(2, "0")}_${name}`);
}

await accept("contract_and_runtime_metadata_fix_four_prompt_routes_without_live_generation", async () => {
  const contract = STARCRAFT_TMG_TICKET_15_ROLE_CONTEXT_ISOLATION_CONTRACT_V1;
  verifyHash(contract, "contextContractHash");
  assert.equal(contract.promptRouting.tutor, "novice_teacher_prompt");
  assert.equal(contract.promptRouting.opponent, "opponent_prompt");
  assert.equal(contract.promptRouting.commentator, "referee_prompt");
  assert.equal(contract.promptRouting.companion, "sparring_coach_prompt");
  assert.equal(contract.ruleSkills.generatedDuringLiveTurn, false);
  assert.equal(contract.memory.liveWrites, 0);
  assert.deepEqual(runtime.metadata().promptPacks, {
    tutor: "novice_teacher_prompt",
    opponent: "opponent_prompt",
    commentator: "referee_prompt",
    companion: "sparring_coach_prompt",
  });
});

await accept("prompt_artifact_store_is_hash_bound_ephemeral_and_not_client_readable", async () => {
  assert.equal(promptStore.health().artifactCount, 0);
  assert.equal(promptStore.health().clientReadAllowed, false);
  const missing = promptStore.resolve({ id: "missing-prompt", version: "1", hash: "9".repeat(64) });
  assert.equal(missing.reason, "prompt_artifact_not_found");
});

const noProviderSession = await createSession("tutor");
const noProvider = createStarcraftTmgProviderGatewaySupervisorV1({
  sessionLifecycle: lifecycle,
  budgetPolicy: {
    maxTotalUnits: 100_000,
    maxTurns: 4,
    maxInputUnitsPerTurn: 50_000,
    maxOutputUnitsPerTurn: 1_000,
    timeoutMs: 5_000,
  },
});
const noProviderRuntime = createStarcraftTmgOnlineRoleContextRuntimeV1({
  sessionLifecycle: lifecycle,
  providerSupervisor: noProvider,
  materialCatalog,
  roomTools,
  memoryStore,
  promptArtifactStore: promptStore,
  maxOutputUnits: 512,
});

await accept("provider_not_configured_fails_before_room_memory_or_prompt_work", async () => {
  const counts = {
    room: roomToolCalls.length,
    memory: memoryCalls.length,
    material: materialCalls.length,
    prompts: promptStore.health().artifactCount,
  };
  const result = await noProviderRuntime.sendTurn(
    sendInput(noProviderSession, "explain", "What can I do?"),
    context("tutor"));
  assert.equal(result.reason, "provider_not_configured");
  assert.equal(roomToolCalls.length, counts.room);
  assert.equal(memoryCalls.length, counts.memory);
  assert.equal(materialCalls.length, counts.material);
  assert.equal(promptStore.health().artifactCount, counts.prompts);
});

const sessions = {};
const modeResults = {};
const expected = {
  tutor: {
    intent: "explain",
    promptPack: "novice_teacher_prompt",
    calls: ["read_board_state", "list_legal_actions", "read_rules_skills", "read_memory_snapshot", "read_character_worldbook"],
  },
  opponent: {
    intent: "take_turn",
    promptPack: "opponent_prompt",
    calls: ["read_board_state", "list_legal_actions", "read_rules_skills", "read_memory_snapshot", "read_character_worldbook"],
  },
  commentator: {
    intent: "commentate",
    promptPack: "referee_prompt",
    calls: ["read_board_state", "read_public_events", "read_rules_skills", "read_memory_snapshot", "read_character_worldbook"],
  },
  companion: {
    intent: "reflect",
    promptPack: "sparring_coach_prompt",
    calls: ["read_board_state", "read_rules_skills", "read_memory_snapshot", "read_character_worldbook"],
  },
};

for (const mode of Object.keys(expected)) {
  await accept(`${mode}_routes_exact_prompt_tools_rules_memory_and_history`, async () => {
    sessions[mode] = await createSession(mode);
    const result = await runtime.sendTurn(
      sendInput(sessions[mode], expected[mode].intent, `${mode} first message`),
      context(mode));
    assert.equal(result.ok, true);
    assert.equal(result.trace.promptPack, expected[mode].promptPack);
    assert.deepEqual(result.trace.harnessToolsCalled, expected[mode].calls);
    assert.equal(result.trace.roleMode, mode);
    assert.equal(result.trace.ruleSkillRefs.length, 1);
    assert.equal(result.trace.memoryRefs[0].namespace, namespaceByMode[mode]);
    assert.equal(result.context.history.retainedCount, 1);
    assert.equal(result.context.history.entries[0].user.text, `${mode} first message`);
    assert.equal(result.context.history.entries[0].assistant.channels.speech.text.startsWith(mode), true);
    assert.equal(result.trace.memoryWrites, 0);
    assert.equal(result.trace.skillGenerationRuns, 0);
    verifyHash(result.promptReceipt, "receiptHash");
    verifyHash(result.toolContextReceipt, "receiptHash");
    verifyHash(result.trace, "traceId");
    verifyHash(result.context.history, "historyHash");
    verifyHash(result.context, "contextHash");
    modeResults[mode] = result;
  });
}

await accept("prompt_nodes_preserve_rules_over_memory_and_response_authority", async () => {
  assert.equal(resolvedPromptArtifacts.length, 4);
  for (const artifact of resolvedPromptArtifacts) {
    verifyHash(artifact, "promptArtifactHash");
    const nodeTypes = artifact.nodes.map((entry) => entry.nodeType);
    assert(nodeTypes.includes("platform-policy"));
    assert(nodeTypes.includes("room-projection"));
    assert(nodeTypes.includes("runtime-rule-skills"));
    assert(nodeTypes.includes("runtime-memory"));
    assert(nodeTypes.includes("bounded-conversation-history"));
    assert(nodeTypes.includes("user-message"));
    assert(nodeTypes.includes("response-contract"));
    const skills = artifact.nodes.find((entry) => entry.nodeType === "runtime-rule-skills").content;
    assert.equal(skills.rulesAuthority, "external_rules_service");
    assert.equal(skills.skillsMayOverrideRules, false);
    const memory = artifact.nodes.find((entry) => entry.nodeType === "runtime-memory").content;
    assert.equal(memory.rulesMayBeOverridden, false);
    assert.equal(artifact.responseContract.mayConfirm, false);
    assert.equal(artifact.responseContract.mayApply, false);
  }
});

await accept("Provider_receives_only_ephemeral_prompt_refs_and_store_releases_each_artifact", async () => {
  assert.equal(promptStore.health().artifactCount, 0);
  assert.equal(gatewayCalls.length, 4);
  for (const call of gatewayCalls) {
    assert.deepEqual(Object.keys(call).sort(), [
      "boundedRequest", "budgetReservation", "promptAssemblyRef",
      "providerProfileRef", "responseContract", "schemaVersion", "signal",
    ]);
    assert.equal(promptStore.resolve(call.promptAssemblyRef).reason,
      "prompt_artifact_not_found");
    assert(!JSON.stringify(call).includes("first message"));
    assert(!JSON.stringify(call).includes("principal-"));
  }
});

await accept("room_and_memory_ports_receive_exact_internal_scope_without_auth_secrets", async () => {
  assert(roomToolCalls.length > 0 && memoryCalls.length === 4);
  for (const call of roomToolCalls) {
    assert.deepEqual(Object.keys(call.input).sort(), [
      "gameId", "mode", "principalScopeHash", "roomBinding", "roomId",
      "seatKey", "sessionBindingHash", "visibilityPolicy",
    ]);
    assert(!JSON.stringify(call).includes("principal-tutor"));
    assert(!JSON.stringify(call).includes("seatToken"));
  }
  for (const call of memoryCalls) {
    assert.deepEqual(Object.keys(call).sort(), [
      "allowedNamespaces", "gameId", "mode", "principalScopeHash", "roomId",
      "sessionBindingHash",
    ]);
  }
});

await accept("opponent_decision_influence_is_limited_to_strategy_memory", async () => {
  const opponentArtifact = resolvedPromptArtifacts.find((artifact) =>
    artifact.responseContract.mode === "opponent");
  const memory = opponentArtifact.nodes.find((entry) =>
    entry.nodeType === "runtime-memory").content.entries;
  assert.equal(memory.length, 1);
  assert.equal(memory[0].namespace, "strategy_memory");
  assert.equal(memory[0].mayInfluenceDecision, true);
  for (const artifact of resolvedPromptArtifacts.filter((entry) =>
    entry.responseContract.mode !== "opponent")) {
    const entries = artifact.nodes.find((entry) =>
      entry.nodeType === "runtime-memory").content.entries;
    assert(entries.every((entry) => entry.mayInfluenceDecision === false));
  }
});

await accept("accepted_rule_skill_trace_is_hash_refs_only_and_never_rules_authority", async () => {
  const ref = modeResults.tutor.trace.ruleSkillRefs[0];
  assert.deepEqual(Object.keys(ref).sort(), [
    "hash", "id", "skillType", "status", "trustTier", "version",
  ]);
  assert.equal(ref.status, "human_reviewed");
  assert.equal(modeResults.tutor.promptReceipt.rulesAuthority,
    "external_rules_service");
  assert.equal("procedure" in ref, false);
});

await accept("bounded_history_evicts_oldest_and_next_prompt_sees_only_retained_prior_turns", async () => {
  const tutor = sessions.tutor;
  const second = await runtime.sendTurn(
    sendInput(tutor, "explain", "tutor second message"), context("tutor"));
  assert.equal(second.ok, true);
  const third = await runtime.sendTurn(
    sendInput(tutor, "explain", "tutor third message"), context("tutor"));
  assert.equal(third.ok, true);
  assert.equal(third.context.history.retainedCount, 2);
  assert.equal(third.context.history.evictedCount, 1);
  assert.deepEqual(third.context.history.entries.map((entry) => entry.user.text),
    ["tutor second message", "tutor third message"]);
  const thirdArtifact = resolvedPromptArtifacts.at(-1);
  const prior = thirdArtifact.nodes.find((entry) =>
    entry.nodeType === "bounded-conversation-history").content;
  assert.deepEqual(prior.entries.map((entry) => entry.user.text),
    ["tutor first message", "tutor second message"]);
});

await accept("reconnect_restores_same_session_history_and_provider_budget", async () => {
  const tutor = sessions.tutor;
  const before = await runtime.readContext({
    sessionId: tutor.sessionId,
    roomId: tutor.binding.roomId,
    expectedConnectionEpoch: 1,
  }, context("tutor"));
  const reconnected = await lifecycle.reconnectSession({
    sessionId: tutor.sessionId,
    roomId: tutor.binding.roomId,
    expectedConnectionEpoch: 1,
  }, context("tutor"));
  assert.equal(reconnected.ok, true);
  const after = await runtime.readContext({
    sessionId: tutor.sessionId,
    roomId: tutor.binding.roomId,
    expectedConnectionEpoch: 2,
  }, context("tutor"));
  assert.equal(after.ok, true);
  assert.equal(after.context.history.historyHash,
    before.context.history.historyHash);
  assert.equal(after.context.providerState.budget.consumedUnits,
    before.context.providerState.budget.consumedUnits);
  assert.equal(after.context.connectionEpoch, 2);
  const stale = await runtime.readContext({
    sessionId: tutor.sessionId,
    roomId: tutor.binding.roomId,
    expectedConnectionEpoch: 1,
  }, context("tutor"));
  assert.equal(stale.reason, "stale_connection");
});

await accept("history_and_context_cannot_be_read_by_another_principal", async () => {
  const tutor = sessions.tutor;
  const denied = await runtime.readContext({
    sessionId: tutor.sessionId,
    roomId: tutor.binding.roomId,
    expectedConnectionEpoch: 2,
  }, context("tutor", "principal-tutor-other"));
  assert.equal(denied.reason, "principal_scope_mismatch");
  assert(!JSON.stringify(denied).includes("tutor second message"));
});

await accept("mode_incompatible_intents_fail_before_any_context_reads", async () => {
  const counts = { room: roomToolCalls.length, memory: memoryCalls.length };
  const denied = await runtime.sendTurn({
    ...sendInput(sessions.companion, "take_turn", "try to take control"),
  }, context("companion"));
  assert.equal(denied.reason, "intent_not_allowed_for_mode");
  assert.equal(roomToolCalls.length, counts.room);
  assert.equal(memoryCalls.length, counts.memory);
});

await accept("credential_material_in_user_text_fails_before_context_or_history_retention", async () => {
  const counts = { room: roomToolCalls.length, memory: memoryCalls.length };
  const denied = await runtime.sendTurn(
    sendInput(sessions.companion, "reflect", "authorization: abcdefghijklmno"),
    context("companion"));
  assert.equal(denied.reason, "credential_material_forbidden");
  assert.equal(roomToolCalls.length, counts.room);
  assert.equal(memoryCalls.length, counts.memory);
  const read = await runtime.readContext({
    sessionId: sessions.companion.sessionId,
    roomId: ROOM_ID,
    expectedConnectionEpoch: 1,
  }, context("companion"));
  assert.equal(read.context.history.retainedCount, 1);
  assert(!JSON.stringify(read).includes("abcdefghijklmno"));
});

await accept("credential_material_in_provider_text_is_rejected_without_history_leak", async () => {
  const session = await createSession("companion");
  const result = await runtime.sendTurn(
    sendInput(session, "reflect", "unsafe provider output"),
    context("companion"));
  assert.equal(result.reason, "unsafe_provider_result");
  assert.equal(result.historyEntry.assistant, null);
  assert.equal(result.historyEntry.failureCode, "unsafe_provider_result");
  assert(!JSON.stringify(result).includes("Bearer abcdefghijklmno"));
  assert.equal(promptStore.health().artifactCount, 0);
});

await accept("tampered_rule_skill_snapshot_is_rejected_before_gateway_dispatch", async () => {
  const session = await createSession("tutor");
  const calls = gatewayCalls.length;
  mutateRuleSnapshot = (snapshot) => {
    const copy = structuredClone(snapshot);
    copy.skillEntries[0].skillArtifact.gameId = "other-game";
    return copy;
  };
  const result = await runtime.sendTurn(
    sendInput(session, "explain", "read tampered rules"), context("tutor"));
  mutateRuleSnapshot = null;
  assert.equal(result.reason, "rule_skill_snapshot_rejected");
  assert.equal(gatewayCalls.length, calls);
});

await accept("cross_mode_memory_snapshot_is_rejected_before_gateway_dispatch", async () => {
  const session = await createSession("opponent");
  const calls = gatewayCalls.length;
  mutateMemorySnapshot = (_snapshot, input) => createStarcraftTmgOnlineMemorySnapshotV1({
    gameId: "starcraft-tmg",
    roomId: input.roomId,
    principalScopeHash: input.principalScopeHash,
    sessionBindingHash: input.sessionBindingHash,
    mode: "companion",
    entries: [{
      namespace: "conversation_history",
      refId: "cross-mode-memory",
      version: "1",
      content: { note: "must not cross modes" },
      status: "accepted",
      advisoryOnly: true,
      canAffectRules: false,
      trainingTruth: false,
    }],
  });
  const result = await runtime.sendTurn(
    sendInput(session, "take_turn", "use wrong memory"), context("opponent"));
  mutateMemorySnapshot = null;
  assert.equal(result.reason, "memory_snapshot_rejected");
  assert.equal(gatewayCalls.length, calls);
});

await accept("mixed_room_projection_and_legal_space_are_rejected_before_gateway", async () => {
  const commentator = await createSession("commentator");
  let calls = gatewayCalls.length;
  mutateRoomProjection = (projection) => ({
    ...projection,
    viewer: { seatKey: "player1", roleMode: "player" },
  });
  const hidden = await runtime.sendTurn(
    sendInput(commentator, "commentate", "show public state"),
    context("commentator"));
  mutateRoomProjection = null;
  assert.equal(hidden.reason, "online_context_turn_failed");
  assert.equal(gatewayCalls.length, calls);

  const opponent = await createSession("opponent");
  calls = gatewayCalls.length;
  mutateLegalSpace = (space) => ({ ...space, stateRevision: 99 });
  const stale = await runtime.sendTurn(
    sendInput(opponent, "take_turn", "read stale candidates"),
    context("opponent"));
  mutateLegalSpace = null;
  assert.equal(stale.reason, "online_context_turn_failed");
  assert.equal(gatewayCalls.length, calls);
});

await accept("material_snapshot_drift_after_creation_is_rejected_not_silently_migrated", async () => {
  const companion = sessions.companion;
  const calls = gatewayCalls.length;
  reverseMaterialForMode = "companion";
  const result = await runtime.sendTurn(
    sendInput(companion, "reflect", "use drifted materials"),
    context("companion"));
  reverseMaterialForMode = null;
  assert.equal(result.reason, "session_context_drift");
  assert.equal(gatewayCalls.length, calls);
});

await accept("separate_sessions_never_share_history_even_for_the_same_role", async () => {
  const secondTutor = await createSession("tutor");
  const fresh = await runtime.readContext({
    sessionId: secondTutor.sessionId,
    roomId: secondTutor.binding.roomId,
    expectedConnectionEpoch: 1,
  }, context("tutor"));
  assert.equal(fresh.ok, true);
  assert.equal(fresh.context.history.retainedCount, 0);
  assert.equal(fresh.context.ruleSkillRefs.length, 0);
  assert(!JSON.stringify(fresh).includes("tutor third message"));
});

await accept("live_context_flow_generates_no_skill_memory_write_or_training_truth", async () => {
  for (const result of Object.values(modeResults)) {
    assert.equal(result.trace.skillGenerationRuns, 0);
    assert.equal(result.trace.memoryWrites, 0);
    assert.equal(result.trace.eligibleForTraining, false);
    assert.equal(result.trace.trainingTruth, false);
    assert.equal(result.context.skillGenerationRuns, 0);
    assert.equal(result.context.memoryWrites, 0);
  }
  assert.equal(STARCRAFT_TMG_TICKET_15_ROLE_CONTEXT_ISOLATION_CONTRACT_V1
    .runTruth.dshRun, false);
});

assert.equal(acceptance.length, 24);

const reportBody = {
  schemaVersion: "starcraft_tmg_ticket_15_slice_147_report_v1",
  ticket: 15,
  slice: 147,
  generatedAt: "2026-09-04T01:40:00.000Z",
  contextContractHash:
    STARCRAFT_TMG_TICKET_15_ROLE_CONTEXT_ISOLATION_CONTRACT_V1
      .contextContractHash,
  acceptanceChecks: acceptance,
  acceptanceCount: acceptance.length,
  promptRoutes: Object.fromEntries(Object.entries(expected).map(([mode, value]) =>
    [mode, value.promptPack])),
  injectedGatewayInvocationCount: gatewayCalls.length,
  retainedPromptArtifactCount: promptStore.health().artifactCount,
  ticketProgress: "4/9",
  projectProgress: "13/22",
  nativeDeviceEvidence: "deferred_by_user_until_full_development_completion",
  runTruth:
    STARCRAFT_TMG_TICKET_15_ROLE_CONTEXT_ISOLATION_CONTRACT_V1.runTruth,
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: Object.values(expected).map((entry) => entry.promptPack),
    harnessToolsCalled: [...new Set(Object.values(modeResults)
      .flatMap((result) => result.trace.harnessToolsCalled))],
    uiTraceEvidence: "backend_trace_complete_web_mount_deferred_to_slices_150_152",
    agentDecisionEvidence: null,
    memoryTraceEvidence: {
      refsByMode: Object.fromEntries(Object.entries(modeResults).map(([mode, result]) =>
        [mode, result.trace.memoryRefs])),
      opponentStrategyMemoryOnly: true,
      writes: 0,
      crossModeIsolationChecked: true,
    },
    trainingTraceCandidates: 0,
    rollbackOrDemotionRules: [
      "reject context material drift and require a new session",
      "reject mixed room rules Skill or memory bindings before Provider dispatch",
      "release every ephemeral prompt artifact after the supervised turn",
    ],
    userVisibleChecks: [
      "four modes route to distinct prompt packs and tool surfaces",
      "reconnect restores bounded chronological history",
      "Provider unavailable and context failures are explicit",
      "no cross-principal history or cross-mode memory is visible",
    ],
  },
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["novice_teacher", "opponent", "referee", "sparring_coach"],
    skillsRead: ["starcraft-tmg.current-turn-flow.accepted.v1"],
    skillsGenerated: [],
    judgeTestsRun: ["runtime_snapshot_scope_and_status_validation"],
    crossTimeReplayResult: "not_run_no_skill_change",
    promotions: [],
    blocks: ["live_turn_skill_generation", "memory_over_rules", "cross_game_skill"],
    remainingRuleGaps: ["production_runtime_skill_snapshot_waits_for_tickets_17_18"],
  },
};
const report = { ...reportBody, reportHash: hashStarcraftTmgContract(reportBody) };
await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(`Ticket 15 Slice 147 role context isolation: ${acceptance.length}/${acceptance.length}`);
console.log(`Context contract: ${report.contextContractHash}`);
console.log(`Report: ${report.reportHash}`);
console.log(`Ticket 15 progress: ${report.ticketProgress}`);
console.log(`Project progress: ${report.projectProgress}`);
