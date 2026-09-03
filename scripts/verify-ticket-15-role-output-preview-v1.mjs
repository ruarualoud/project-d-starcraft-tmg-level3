#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_TICKET_15_ROLE_OUTPUT_PREVIEW_CONTRACT_V1 } from
  "../content/agent/ticket-15-role-output-preview-contract-v1.mjs";
import { createKerriganPrimalProductBundleV1 } from
  "../content/characters/kerrigan-primal-v1.mjs";
import {
  createStarcraftTmgAuthoritativeEngine,
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgRoomRuntime } from
  "../packages/room-runtime/in-memory-room-v1.mjs";
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
import {
  createStarcraftTmgOnlineRoleTurnRuntimeV1,
  STARCRAFT_TMG_ONLINE_ROLE_OUTPUT_VERSION,
} from "../packages/online-agent-session/role-output-runtime-v1.mjs";
import {
  createStarcraftTmgSampleState,
  loadStarcraftTmgData,
} from "../../scripts/starcraft-tmg-rules-v0.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_ROOT = path.resolve(ROOT, "..");
const OUTPUT = path.join(ROOT,
  "build/ticket-15-slice-148-role-output-preview-v1/report.json");
const ROOM_ID = "slice-148-role-output-room";
const OCCURRED_AT = "2026-09-04T03:10:00.000Z";
const bundle = createKerriganPrimalProductBundleV1();
const characterPackage = bundle.characterPackage;

function verifyHash(value, field) {
  const { [field]: observed, ...unsigned } = value;
  assert.equal(hashStarcraftTmgContract(unsigned), observed);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const data = await loadStarcraftTmgData(PROJECT_ROOT);
const state = createStarcraftTmgSampleState(data);
state.board.terrain = [];
state.activeSideKey = "player1";
const authorityEngine = createStarcraftTmgAuthoritativeEngine({
  now: () => OCCURRED_AT,
});
const roomRuntime = createStarcraftTmgRoomRuntime({
  authorityEngine,
  now: () => OCCURRED_AT,
});
const serverSeatPlan = [
  { label: "tutor", seatKey: "player1", roleMode: "tutor", principalType: "model" },
  { label: "opponent", seatKey: "player1", roleMode: "opponent", principalType: "model" },
  { label: "opponentSupervisor", seatKey: "player1", roleMode: "supervisor", principalType: "human" },
  { label: "commentator", seatKey: "observer", roleMode: "commentator", principalType: "model" },
  { label: "companion", seatKey: "player1", roleMode: "companion", principalType: "model" },
];
const createdRoom = await roomRuntime.createRoom({
  roomId: ROOM_ID,
  gameId: "starcraft-tmg",
  initialStateAuthority: {
    source: "server_factory",
    state,
    dataVersion: data.version,
    receiptHash: hashStarcraftTmgContract({
      source: "ticket-15-slice-148-verifier",
      state,
    }),
    serverSeatPlan,
  },
  serverSeatPlan,
});
assert.equal(createdRoom.ok, true,
  `room creation failed: ${createdRoom.reason || "unknown"}`);

function onlineRoomBinding() {
  const binding = createdRoom.matchBinding;
  return {
    schemaVersion: "starcraft_tmg_match_room_binding_v1",
    rulesVersion: binding.rulesVersion,
    dataVersion: binding.dataVersion,
    matchBindingHash: binding.bindingHash,
    sourceSnapshotHash: binding.sourceSnapshotHash,
    dataSnapshotHash: binding.dataSnapshotHash,
    rulesArtifactHash: binding.rulesArtifactHash,
    executorArtifactHash: binding.executorArtifactHash,
    geometryArtifactHash: binding.geometryArtifactHash,
    actionSchemaHash: binding.actionSchemaHash,
  };
}

const CHARACTER_SELECTION_HASH = hashStarcraftTmgContract({
  characterId: characterPackage.characterId,
  persona: "hots.primal_queen.post_zerus",
  roomId: ROOM_ID,
});
const principalConfiguration = {
  tutor: { scope: "2", seatKey: "player1", principalType: "human", principalRoleMode: "player" },
  opponent: { scope: "3", seatKey: "player1", principalType: "model", principalRoleMode: "opponent" },
  commentator: { scope: "4", seatKey: "observer", principalType: "service", principalRoleMode: "commentator" },
  companion: { scope: "5", seatKey: "player1", principalType: "human", principalRoleMode: "player" },
};

function principalBinding(mode) {
  const configuration = principalConfiguration[mode];
  return createStarcraftTmgOnlinePrincipalBindingV1({
    roomId: ROOM_ID,
    principalScopeHash: configuration.scope.repeat(64),
    seatKey: configuration.seatKey,
    principalType: configuration.principalType,
    principalRoleMode: configuration.principalRoleMode,
    bindingRevision: 1,
    allowedAgentModes: [mode],
    characterId: characterPackage.characterId,
    characterPackageHash: characterPackage.integrity.hash,
    characterSelectionHash: CHARACTER_SELECTION_HASH,
    roomBinding: onlineRoomBinding(),
  });
}

const principals = new Map(["tutor", "opponent", "commentator", "companion"]
  .map((mode) => [`principal-${mode}`, principalBinding(mode)]));
let sessionSequence = 0;
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
    return `slice-148-session-${String(sessionSequence).padStart(3, "0")}`;
  },
  now: () => OCCURRED_AT,
});

function context(mode) {
  return { principalSessionRef: `principal-${mode}` };
}

const sessions = {};
for (const mode of ["tutor", "opponent", "commentator", "companion"]) {
  const result = await lifecycle.createSession({
    roomId: ROOM_ID,
    mode,
    characterId: characterPackage.characterId,
  }, context(mode));
  assert.equal(result.ok, true,
    `${mode} lifecycle failed: ${result.reason || "unknown"}`);
  sessions[mode] = result.session;
}

function skillArtifact() {
  return {
    schema: "project_d_game_skill_v1",
    gameId: "starcraft-tmg",
    rulesVersion: onlineRoomBinding().rulesVersion,
    skillId: "starcraft-tmg.current-turn-flow.accepted.v1",
    version: "1.0.0",
    skillType: "turn_flow",
    sourceRefs: [{
      sourceId: "archon.starcraft-tmg-rules.en",
      snapshotId: onlineRoomBinding().dataVersion,
      snapshotHash: onlineRoomBinding().sourceSnapshotHash,
      authorityStatus: "official_game_rules",
      rulesEligible: true,
    }],
    appRuleEndpoints: ["GET /api/v1/rooms/:roomId/legal-space"],
    phase: "all",
    preconditions: ["Read current viewer state."],
    procedure: ["Select only a current enabled LegalSpace candidate."],
    legalityChecks: ["Rules and room receipts outrank strategy memory."],
    illegalPatterns: ["Using a candidate from another revision."],
    examples: [],
    counterExamples: [],
    judgeTests: [{ id: "current-candidate", expected: "reject_stale" }],
    confidence: "source_backed",
    trustTier: "human_reviewed_source_backed",
    status: "human_reviewed",
    humanReviewed: true,
    canAffectStrategy: false,
    canAffectRules: false,
    trainingTruth: false,
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

function memorySnapshot(input) {
  return createStarcraftTmgOnlineMemorySnapshotV1({
    gameId: "starcraft-tmg",
    roomId: input.roomId,
    principalScopeHash: input.principalScopeHash,
    sessionBindingHash: input.sessionBindingHash,
    mode: input.mode,
    entries: [{
      namespace: namespaceByMode[input.mode],
      refId: `${input.mode}-memory-1`,
      version: "1.0.0",
      content: { note: `${input.mode} advisory verifier memory` },
      status: "accepted",
      advisoryOnly: true,
      canAffectRules: false,
      trainingTruth: false,
    }],
  });
}

const materialCatalog = {
  async resolve(input) {
    return {
      ok: true,
      characterPackage: bundle.characterPackage,
      roleSkillPack: bundle.roleSkillPacks[input.mode],
      conversationProfile: bundle.conversationProfile,
      providerProfile: bundle.providerProfile,
      worldbooks: bundle.worldbooks,
      spoilerCeilingRank: 60,
      knowledgeCeilingRank: 60,
      allowFanon: false,
    };
  },
};

const credentialByMode = {
  tutor: createdRoom.credentials.tutor.seatToken,
  opponent: createdRoom.credentials.opponent.seatToken,
  companion: createdRoom.credentials.companion.seatToken,
};
const roomToolCalls = [];
let previewFault = null;
let forbiddenConfirmCalls = 0;
let forbiddenApplyCalls = 0;
const roomTools = {
  async readBoardState(input) {
    roomToolCalls.push({ method: "readBoardState", input: clone(input) });
    assert.equal(input.seatToken, undefined);
    return roomRuntime.readRoom({
      roomId: input.roomId,
      ...(input.mode === "commentator"
        ? {}
        : { seatToken: credentialByMode[input.mode] }),
    });
  },
  async listLegalActions(input) {
    roomToolCalls.push({ method: "listLegalActions", input: clone(input) });
    assert.equal(input.seatToken, undefined);
    return roomRuntime.legalSpace({
      roomId: input.roomId,
      seatToken: credentialByMode[input.mode],
    });
  },
  async readPublicEvents(input) {
    roomToolCalls.push({ method: "readPublicEvents", input: clone(input) });
    const read = await roomRuntime.readRoom({
      roomId: input.roomId,
      includeJournal: true,
    });
    const events = read.projection.publicJournal || [];
    return {
      ok: true,
      events: {
        schemaVersion: "starcraft_tmg_public_events_v1",
        roomId: input.roomId,
        matchBindingHash: onlineRoomBinding().matchBindingHash,
        events,
        eventsHash: hashStarcraftTmgContract(events),
      },
    };
  },
  async readRulesSkills(input) {
    roomToolCalls.push({ method: "readRulesSkills", input: clone(input) });
    return { ok: true, snapshot: ruleSkillSnapshot(input) };
  },
  async previewAction(input) {
    roomToolCalls.push({ method: "previewAction", input: clone(input) });
    assert.equal(input.seatToken, undefined);
    const fault = previewFault;
    previewFault = null;
    if (fault === "stale") return { ok: false, reason: "LEGAL_SPACE_STALE" };
    if (fault === "throw") throw new Error("simulated private Preview adapter failure");
    const result = await roomRuntime.previewAction({
      roomId: input.roomId,
      seatToken: credentialByMode[input.mode],
      candidateId: input.candidateId,
      expectedMatchBindingHash: input.expectedMatchBindingHash,
      expectedLegalSpaceHash: input.expectedLegalSpaceHash,
      expectedStateRevision: input.expectedStateRevision,
      expectedStateHash: input.expectedStateHash,
      occurredAt: input.occurredAt,
    });
    if (fault === "binding" && result.ok) {
      const tampered = clone(result);
      tampered.preview.core.preStateHash = "0".repeat(64);
      return tampered;
    }
    if (fault === "candidate_switch" && result.ok) {
      const tampered = clone(result);
      tampered.preview.core.proposal = {
        kind: "finite",
        actionKey: "candidate-selected-by-transport-instead",
      };
      tampered.preview.core.proposalHash = hashStarcraftTmgContract(
        tampered.preview.core.proposal);
      tampered.preview.previewSeal.contentHash = hashStarcraftTmgContract({
        previewId: tampered.preview.previewId,
        core: tampered.preview.core,
      });
      tampered.preview.previewSeal.mac = "forged-preview-mac";
      tampered.preview.previewToken =
        `${tampered.preview.previewId}.${tampered.preview.previewSeal.mac}`;
      return tampered;
    }
    return result;
  },
  async confirmPreview() {
    forbiddenConfirmCalls += 1;
    throw new Error("Agent must never call confirmPreview");
  },
  async applyAction() {
    forbiddenApplyCalls += 1;
    throw new Error("Agent must never call applyAction");
  },
};

const memoryStore = {
  async read(input) {
    return { ok: true, snapshot: memorySnapshot(input) };
  },
};
let promptSequence = 0;
const promptStore = createInMemoryStarcraftTmgPromptArtifactStoreV1({
  createId() {
    promptSequence += 1;
    return `slice-148-prompt-${String(promptSequence).padStart(3, "0")}`;
  },
  maxArtifacts: 64,
  maxArtifactBytes: 2 * 1024 * 1024,
});

function refsForRequiredEvidence(contract) {
  return contract.requiredEvidenceKinds.map((kind) => {
    const ref = contract.evidenceRefs.find((entry) => entry.kind === kind);
    assert(ref, `response contract missed ${kind}`);
    return ref.evidenceId;
  });
}

function decisionFor(artifact, overrides = {}) {
  const legalNode = artifact.nodes.find((entry) => entry.nodeType === "legal-space");
  const enabled = legalNode.content.candidates.filter((entry) => entry.isEnabled);
  assert(enabled.length > 1, "verifier needs at least two enabled candidates");
  const strategyRef = artifact.responseContract.strategyMemoryRefs[0];
  return {
    candidateId: enabled[0].candidateId,
    selectedReason: "This current enabled line best preserves initiative.",
    scoreOrPositionValue: "It improves board position while retaining options.",
    risk: "The opposing unit may counter on its next activation.",
    memoryInfluence: strategyRef
      ? { kind: "advisory_strategy_memory", refIds: [strategyRef.refId] }
      : { kind: "none", refIds: [] },
    rejectedAlternatives: [{
      candidateId: enabled[1].candidateId,
      reason: "The alternative gives up more position for no immediate gain.",
    }],
    ...overrides,
  };
}

function validOutput(artifact) {
  const contract = artifact.responseContract;
  const output = {
    schemaVersion: STARCRAFT_TMG_ONLINE_ROLE_OUTPUT_VERSION,
    channels: {},
    visualCue: contract.mode === "tutor" ? "explain"
      : contract.mode === "opponent" ? "challenge"
        : contract.mode === "commentator" ? "announce" : "reflect",
    evidenceRefIds: refsForRequiredEvidence(contract),
  };
  if (contract.mode === "tutor") {
    output.channels.teaching = { text: "先核对当前规则与合法动作，再决定操作。" };
  } else if (contract.mode === "opponent" && contract.intent === "take_turn") {
    output.channels.decision = decisionFor(artifact);
    output.channels.speech = { text: "我选择了当前合法方案，等待你确认。" };
  } else if (contract.mode === "commentator") {
    output.channels.speech = { text: "当前公开事件与棋盘状态已完成核对。" };
  } else {
    output.channels.speech = { text: "我会依据当前可见局面给出建议。" };
  }
  return output;
}

const gatewayCalls = [];
const providerGateway = {
  async complete(input) {
    gatewayCalls.push(clone(input));
    const resolved = promptStore.resolve(input.promptAssemblyRef);
    assert.equal(resolved.ok, true, "Gateway could not resolve prompt");
    const artifact = resolved.artifact;
    const userNode = artifact.nodes.find((entry) => entry.nodeType === "user-message");
    const message = userNode.content.text;
    const output = validOutput(artifact);
    if (message === "wrong schema") output.schemaVersion = "unknown_output_v9";
    if (message === "unknown top field") output.confirm = true;
    if (message === "unknown evidence") output.evidenceRefIds[0] = "other_room";
    if (message === "missing rule evidence") {
      output.evidenceRefIds = output.evidenceRefIds.filter((entry) =>
        !entry.startsWith("rule_skill:"));
    }
    if (message === "tutor decision") {
      output.channels.decision = decisionFor(artifact, {
        memoryInfluence: { kind: "none", refIds: [] },
      });
    }
    if (message === "opponent chat decision") {
      output.channels.decision = decisionFor(artifact);
    }
    if (message === "disabled candidate") {
      output.channels.decision.candidateId = "candidate-not-in-current-space";
    }
    if (message === "missing alternative") {
      output.channels.decision.rejectedAlternatives = [];
    }
    if (message === "bad strategy memory") {
      output.channels.decision.memoryInfluence = {
        kind: "advisory_strategy_memory",
        refIds: ["memory-from-another-session"],
      };
    }
    if (message === "preview stale") previewFault = "stale";
    if (message === "preview throws") previewFault = "throw";
    if (message === "preview binding mismatch") previewFault = "binding";
    if (message === "preview candidate switched") previewFault = "candidate_switch";
    return {
      output,
      usageReceipt: createStarcraftTmgProviderGatewayUsageReceiptV1({
        reservation: input.budgetReservation,
        inputUnits: input.boundedRequest.inputUnits,
        outputUnits: 64,
        providerRequestIdHash: hashStarcraftTmgContract({
          turnId: input.budgetReservation.turnId,
          promptHash: input.promptAssemblyRef.hash,
        }),
        finishedAt: OCCURRED_AT,
      }),
    };
  },
};

let turnSequence = 0;
const providerSupervisor = createStarcraftTmgProviderGatewaySupervisorV1({
  sessionLifecycle: lifecycle,
  providerGateway,
  gatewayEvidence: "injected_deterministic_strict_role_output",
  budgetPolicy: {
    maxTotalUnits: 2_000_000,
    maxTurns: 128,
    maxInputUnitsPerTurn: 200_000,
    maxOutputUnitsPerTurn: 4_096,
    timeoutMs: 5_000,
  },
  createId() {
    turnSequence += 1;
    return `slice-148-turn-${String(turnSequence).padStart(3, "0")}`;
  },
  now: () => OCCURRED_AT,
});

const runtime = createStarcraftTmgOnlineRoleTurnRuntimeV1({
  sessionLifecycle: lifecycle,
  providerSupervisor,
  materialCatalog,
  roomTools,
  memoryStore,
  promptArtifactStore: promptStore,
  historyPolicy: { maxEntries: 64, maxBytes: 512 * 1024 },
  maxUserMessageBytes: 4_096,
  maxOutputUnits: 1_024,
  now: () => OCCURRED_AT,
});

function send(mode, userMessage, intent) {
  const session = sessions[mode];
  return runtime.sendTurn({
    sessionId: session.sessionId,
    roomId: ROOM_ID,
    expectedConnectionEpoch: session.connection.epoch,
    intent,
    userMessage,
  }, context(mode));
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

let tutorResult;
let opponentResult;
let commentatorResult;
let companionResult;

await check("contract_is_hash_sealed_and_binds_slice_147", async () => {
  const contract = STARCRAFT_TMG_TICKET_15_ROLE_OUTPUT_PREVIEW_CONTRACT_V1;
  verifyHash(contract, "outputPreviewContractHash");
  assert.match(contract.predecessorContextContractHash, /^[a-f0-9]{64}$/u);
  assert.deepEqual(contract.deepModule.interface,
    ["metadata", "readContext", "sendTurn"]);
});

await check("deep_module_metadata_denies_model_confirm_and_apply", async () => {
  const metadata = runtime.metadata();
  assert.equal(metadata.outputSchemaVersion,
    STARCRAFT_TMG_ONLINE_ROLE_OUTPUT_VERSION);
  assert.equal(metadata.modelConfirmCapability, false);
  assert.equal(metadata.modelApplyCapability, false);
  assert.equal(metadata.confirmationOwner, "human_outside_agent_runtime");
});

await check("rules_preview_rejects_partial_observed_binding_before_open_preview", async () => {
  const legal = await roomRuntime.legalSpace({
    roomId: ROOM_ID,
    seatToken: createdRoom.credentials.opponent.seatToken,
  });
  const candidate = legal.legalSpace.candidates.find((entry) => entry.isEnabled);
  const rejected = await roomRuntime.previewAction({
    roomId: ROOM_ID,
    seatToken: createdRoom.credentials.opponent.seatToken,
    candidateId: candidate.candidateId,
    expectedLegalSpaceHash: legal.legalSpace.legalSpaceHash,
    occurredAt: OCCURRED_AT,
  });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, "LEGAL_SPACE_STALE");
  const aggregate = await roomRuntime.roomStore.loadRoom(ROOM_ID);
  assert.equal(Object.keys(aggregate.previews).length, 0);
  assert.equal(aggregate.stateRevision, 0);
});

await check("rules_preview_rejects_wrong_complete_observed_binding", async () => {
  const legal = await roomRuntime.legalSpace({
    roomId: ROOM_ID,
    seatToken: createdRoom.credentials.opponent.seatToken,
  });
  const candidate = legal.legalSpace.candidates.find((entry) => entry.isEnabled);
  const rejected = await roomRuntime.previewAction({
    roomId: ROOM_ID,
    seatToken: createdRoom.credentials.opponent.seatToken,
    candidateId: candidate.candidateId,
    expectedMatchBindingHash: onlineRoomBinding().matchBindingHash,
    expectedLegalSpaceHash: "0".repeat(64),
    expectedStateRevision: legal.legalSpace.stateRevision,
    expectedStateHash: legal.legalSpace.stateHash,
    occurredAt: OCCURRED_AT,
  });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, "LEGAL_SPACE_STALE");
  const aggregate = await roomRuntime.roomStore.loadRoom(ROOM_ID);
  assert.equal(Object.keys(aggregate.previews).length, 0);
  assert.equal(aggregate.stateRevision, 0);
});

await check("tutor_structured_teaching_is_read_only_and_evidence_bound", async () => {
  const before = roomToolCalls.filter((entry) => entry.method === "previewAction").length;
  tutorResult = await send("tutor", "explain current turn", "explain");
  assert.equal(tutorResult.ok, true);
  assert(tutorResult.output.channels.teaching);
  assert.equal(tutorResult.decision, null);
  assert.equal(tutorResult.preview, null);
  assert.equal(tutorResult.confirmationRequired, false);
  assert(tutorResult.output.evidenceRefs.some((entry) => entry.kind === "room_projection"));
  assert(tutorResult.output.evidenceRefs.some((entry) => entry.kind === "rule_skill"));
  assert.equal(roomToolCalls.filter((entry) => entry.method === "previewAction").length,
    before);
});

await check("commentator_uses_public_events_and_never_previews", async () => {
  const before = roomToolCalls.filter((entry) => entry.method === "previewAction").length;
  commentatorResult = await send("commentator", "commentate public events", "commentate");
  assert.equal(commentatorResult.ok, true);
  assert(commentatorResult.output.channels.speech);
  assert(commentatorResult.output.evidenceRefs.some((entry) => entry.kind === "public_events"));
  assert.equal(commentatorResult.trace.harnessToolsCalled.includes("read_public_events"), true);
  assert.equal(roomToolCalls.filter((entry) => entry.method === "previewAction").length,
    before);
});

await check("companion_structured_speech_is_read_only", async () => {
  const before = roomToolCalls.filter((entry) => entry.method === "previewAction").length;
  companionResult = await send("companion", "reflect on position", "reflect");
  assert.equal(companionResult.ok, true);
  assert(companionResult.output.channels.speech);
  assert.equal(companionResult.output.channels.decision, undefined);
  assert.equal(companionResult.confirmationRequired, false);
  assert.equal(roomToolCalls.filter((entry) => entry.method === "previewAction").length,
    before);
});

await check("opponent_chat_is_speech_only_and_read_only", async () => {
  const before = roomToolCalls.filter((entry) => entry.method === "previewAction").length;
  const result = await send("opponent", "discuss position", "chat");
  assert.equal(result.ok, true);
  assert(result.output.channels.speech);
  assert.equal(result.decision, null);
  assert.equal(result.confirmationRequired, false);
  assert.equal(roomToolCalls.filter((entry) => entry.method === "previewAction").length,
    before);
});

await check("opponent_take_turn_selects_one_current_enabled_candidate", async () => {
  opponentResult = await send("opponent", "take a legal turn", "take_turn");
  assert.equal(opponentResult.ok, true,
    `Opponent rejected: ${opponentResult.reason || "unknown"}`);
  assert(opponentResult.decision?.candidateId);
  assert.match(opponentResult.decision.candidateHash, /^[a-f0-9]{64}$/u);
  assert.equal(opponentResult.decision.rejectedAlternatives.length, 1);
  assert(opponentResult.decision.scoreOrPositionValue);
  assert(opponentResult.decision.risk);
  assert.equal(opponentResult.decision.memoryInfluence.kind,
    "advisory_strategy_memory");
});

await check("opponent_preview_is_four_way_bound_and_hash_sealed", async () => {
  const preview = opponentResult.preview;
  verifyHash(preview, "previewProjectionHash");
  assert.equal(preview.matchBindingHash, onlineRoomBinding().matchBindingHash);
  assert.equal(preview.legalSpaceHash,
    opponentResult.decisionReceipt.legalSpaceHash);
  assert.equal(preview.expectedStateRevision,
    opponentResult.decisionReceipt.stateRevision);
  assert.equal(preview.preStateHash,
    opponentResult.decisionReceipt.stateHash);
  assert.equal(preview.confirmationRequired, true);
  assert.equal(preview.confirmationOwner, "human_outside_agent_runtime");
  assert.equal(preview.modelMayConfirm, false);
  assert.equal(preview.modelMayApply, false);
});

await check("preview_does_not_apply_and_only_human_can_continue", async () => {
  const aggregate = await roomRuntime.roomStore.loadRoom(ROOM_ID);
  assert.equal(aggregate.stateRevision, 0);
  assert.equal(aggregate.acceptedReceiptCount, 0);
  assert.equal(Object.keys(aggregate.previews).length, 1);
  assert.equal(Object.keys(aggregate.confirmations).length, 0);
  assert.equal(forbiddenConfirmCalls, 0);
  assert.equal(forbiddenApplyCalls, 0);
});

await check("decision_trace_explains_choice_alternatives_risk_and_memory", async () => {
  const trace = opponentResult.trace;
  verifyHash(trace, "traceId");
  assert.equal(trace.harnessToolsCalled.at(-1), "preview_action");
  assert.equal(trace.confirmationRequired, true);
  assert.equal(trace.confirmationOwner, "human_outside_agent_runtime");
  assert.equal(trace.modelConfirmCalls, 0);
  assert.equal(trace.modelApplyCalls, 0);
  assert.equal(trace.decision.memoryInfluence.rulesMayBeOverridden, false);
  assert(trace.decisionReceiptHash && trace.previewProjectionHash);
});

await check("provider_hash_and_accepted_output_hash_are_both_auditable", async () => {
  assert.match(opponentResult.trace.providerOutputHash, /^[a-f0-9]{64}$/u);
  assert.match(opponentResult.trace.outputHash, /^[a-f0-9]{64}$/u);
  assert.notEqual(opponentResult.trace.providerOutputHash,
    opponentResult.trace.outputHash);
  assert.equal(opponentResult.roleOutputReceipt.providerOutputHash,
    opponentResult.trace.providerOutputHash);
  assert.equal(opponentResult.roleOutputReceipt.acceptedOutputHash,
    opponentResult.trace.outputHash);
});

await check("unknown_output_schema_is_rejected_without_retention", async () => {
  const result = await send("tutor", "wrong schema", "explain");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "provider_output_rejected");
  assert.equal(result.roleOutputReceipt.unsafeOutputRetained, false);
});

await check("server_owned_top_level_fields_are_rejected", async () => {
  const result = await send("tutor", "unknown top field", "explain");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "provider_output_rejected");
  assert.deepEqual(result.roleOutputReceipt.forbiddenFields, ["confirm"]);
});

await check("tutor_cannot_emit_a_decision_or_preview", async () => {
  const before = roomToolCalls.filter((entry) => entry.method === "previewAction").length;
  const result = await send("tutor", "tutor decision", "explain");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "provider_output_rejected");
  assert.equal(roomToolCalls.filter((entry) => entry.method === "previewAction").length,
    before);
});

await check("opponent_chat_cannot_emit_a_decision", async () => {
  const before = roomToolCalls.filter((entry) => entry.method === "previewAction").length;
  const result = await send("opponent", "opponent chat decision", "chat");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "provider_output_rejected");
  assert.equal(roomToolCalls.filter((entry) => entry.method === "previewAction").length,
    before);
});

await check("unknown_evidence_reference_is_rejected", async () => {
  const result = await send("companion", "unknown evidence", "reflect");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "provider_output_rejected");
});

await check("same_game_rule_skill_evidence_is_required_when_available", async () => {
  const result = await send("commentator", "missing rule evidence", "commentate");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "provider_output_rejected");
});

await check("candidate_absent_from_current_legal_space_is_rejected_before_preview", async () => {
  const before = roomToolCalls.filter((entry) => entry.method === "previewAction").length;
  const result = await send("opponent", "disabled candidate", "take_turn");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "provider_output_rejected");
  assert.equal(roomToolCalls.filter((entry) => entry.method === "previewAction").length,
    before);
});

await check("opponent_must_compare_an_enabled_alternative_when_available", async () => {
  const before = roomToolCalls.filter((entry) => entry.method === "previewAction").length;
  const result = await send("opponent", "missing alternative", "take_turn");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "provider_output_rejected");
  assert.equal(roomToolCalls.filter((entry) => entry.method === "previewAction").length,
    before);
});

await check("cross_session_strategy_memory_reference_is_rejected", async () => {
  const before = roomToolCalls.filter((entry) => entry.method === "previewAction").length;
  const result = await send("opponent", "bad strategy memory", "take_turn");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "provider_output_rejected");
  assert.equal(roomToolCalls.filter((entry) => entry.method === "previewAction").length,
    before);
});

await check("preview_port_staleness_rejects_completed_model_output", async () => {
  const result = await send("opponent", "preview stale", "take_turn");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "legal_space_stale");
  assert.equal(result.roleOutputReceipt.roomReason, "LEGAL_SPACE_STALE");
  assert.equal(result.trace.roleOutputStatus, "rejected");
  assert.equal(result.historyEntry.assistant, null);
  assert.equal(result.historyEntry.outputHash, null);
});

await check("preview_port_failure_is_redacted_and_does_not_escape", async () => {
  const result = await send("opponent", "preview throws", "take_turn");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "opponent_preview_failed");
  assert.equal(result.roleOutputReceipt.roomReason, "preview_port_failed");
  assert.equal(JSON.stringify(result).includes("simulated private"), false);
  assert.equal(result.historyEntry.assistant, null);
});

await check("malformed_preview_binding_is_rejected_without_confirm_or_apply", async () => {
  const result = await send("opponent", "preview binding mismatch", "take_turn");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "opponent_preview_binding_mismatch");
  assert.equal(result.trace.modelConfirmCalls, 0);
  assert.equal(result.trace.modelApplyCalls, 0);
  assert.equal(forbiddenConfirmCalls, 0);
  assert.equal(forbiddenApplyCalls, 0);
});

await check("preview_transport_cannot_switch_the_selected_candidate", async () => {
  const result = await send("opponent", "preview candidate switched", "take_turn");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "opponent_preview_binding_mismatch");
  assert.equal(result.historyEntry.assistant, null);
  assert.equal(result.trace.modelConfirmCalls, 0);
  assert.equal(result.trace.modelApplyCalls, 0);
});

await check("all_gateway_and_room_tool_inputs_remain_credential_free", async () => {
  const serialized = JSON.stringify({ gatewayCalls, roomToolCalls });
  assert.equal(/seatToken|apiKey|authorization|Bearer\s|sk-/iu.test(serialized), false);
  assert(gatewayCalls.every((entry) => entry.promptAssemblyRef
    && entry.responseContract
    && entry.budgetReservation));
});

await check("accepted_and_rejected_turns_leave_no_prompt_artifacts", async () => {
  assert.equal(promptStore.health().artifactCount, 0);
  const contextView = await runtime.readContext({
    sessionId: sessions.opponent.sessionId,
    roomId: ROOM_ID,
    expectedConnectionEpoch: sessions.opponent.connection.epoch,
  }, context("opponent"));
  assert.equal(contextView.ok, true);
  assert(contextView.context.history.entries.some((entry) =>
    entry.status === "completed"));
  assert(contextView.context.history.entries.some((entry) =>
    entry.status === "failed" && entry.assistant === null));
});

const contractHash =
  STARCRAFT_TMG_TICKET_15_ROLE_OUTPUT_PREVIEW_CONTRACT_V1
    .outputPreviewContractHash;
const reportBody = {
  schemaVersion: "starcraft_tmg_ticket_15_role_output_preview_report_v1",
  generatedAt: "2026-09-04T03:40:00.000Z",
  ticket: 15,
  slice: 148,
  ticketProgress: "5/9",
  projectProgress: "13/22",
  acceptanceCount: checks.length,
  acceptanceChecks: checks,
  outputPreviewContractHash: contractHash,
  acceptedRoleModes: ["tutor", "opponent", "commentator", "companion"],
  acceptedOpponentPreviewProjectionHash:
    opponentResult?.preview?.previewProjectionHash || null,
  acceptedOpponentDecisionReceiptHash:
    opponentResult?.decisionReceipt?.receiptHash || null,
  providerGatewayInvocationCount: gatewayCalls.length,
  modelConfirmCalls: forbiddenConfirmCalls,
  modelApplyCalls: forbiddenApplyCalls,
  retainedPromptArtifactCount: promptStore.health().artifactCount,
  nativeDeviceEvidence: "deferred_by_user_until_full_development_completion",
  runTruth:
    STARCRAFT_TMG_TICKET_15_ROLE_OUTPUT_PREVIEW_CONTRACT_V1.runTruth,
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: [
      "novice_teacher_prompt",
      "opponent_prompt",
      "referee_prompt",
      "sparring_coach_prompt",
    ],
    harnessToolsCalled: [
      "read_board_state",
      "list_legal_actions",
      "read_rules_skills",
      "read_memory_snapshot",
      "read_character_worldbook",
      "read_public_events",
      "preview_action",
    ],
    uiTraceEvidence: [
      "server_role_turn_returns_structured_user_visible_channels",
      "opponent_returns_waiting_for_human_confirmation_preview_projection",
      "browser_mount_remains_slice_150_and_152",
    ],
    agentDecisionEvidence: opponentResult ? {
      candidateId: opponentResult.decision.candidateId,
      candidateHash: opponentResult.decision.candidateHash,
      selectedReason: opponentResult.decision.selectedReason,
      scoreOrPositionValue: opponentResult.decision.scoreOrPositionValue,
      risk: opponentResult.decision.risk,
      rejectedAlternatives: opponentResult.decision.rejectedAlternatives,
      memoryInfluence: opponentResult.decision.memoryInfluence,
      legalSpaceHash: opponentResult.decisionReceipt.legalSpaceHash,
      previewProjectionHash: opponentResult.preview.previewProjectionHash,
    } : null,
    memoryTraceEvidence: {
      opponentRefs: opponentResult?.decision?.memoryInfluence?.refs || [],
      rulesMayBeOverridden: false,
      writesPerformed: 0,
      promotionAttempted: false,
    },
    trainingTraceCandidates: 0,
    rollbackOrDemotionRules: [
      "reject a role output with an unknown schema channel field or evidence ref",
      "reject a decision outside the current enabled LegalSpace",
      "reject and audit a Preview whose MatchBinding LegalSpace or state changed",
      "never expose model Confirm or Apply capability",
    ],
    userVisibleChecks: [
      "tutor_teaching_response",
      "commentator_public_event_response",
      "companion_reflection_response",
      "opponent_decision_comparison_and_waiting_confirmation",
    ],
  },
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["novice_teacher", "opponent", "referee", "sparring_coach"],
    skillsRead: [skillArtifact().skillId],
    skillsGenerated: [],
    judgeTestsRun: [
      "same_game_skill_evidence_required",
      "current_legal_space_candidate_only",
      "rules_over_strategy_memory",
    ],
    crossTimeReplayResult: "not_run_no_skill_change",
    promotions: [],
    blocks: [
      "live_turn_skill_generation",
      "cross_game_or_cross_snapshot_skill",
      "memory_over_rules",
    ],
    remainingRuleGaps: [
      "production_runtime_skill_snapshot_waits_for_tickets_17_18",
    ],
  },
};
const report = {
  ...reportBody,
  reportHash: hashStarcraftTmgContract(reportBody),
};
await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(`Ticket 15 Slice 148 role output and Preview: ${checks.filter((entry) => entry.ok).length}/${checks.length}`);
console.log(`Output/Preview contract: ${contractHash}`);
console.log(`Report: ${report.reportHash}`);
console.log("Ticket 15 progress: 5/9");
console.log("Project progress: 13/22");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
}
