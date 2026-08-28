#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createKerriganPrimalProductBundleV1,
} from "../content/characters/kerrigan-primal-v1.mjs";
import {
  createProviderProfile,
  exportStarcraftTmgCharacterContract,
  importStarcraftTmgCharacterContract,
} from "../packages/character-agent/contracts-v1.mjs";
import { createStarcraftTmgCharacterSessionRuntime } from "../packages/character-agent/session-runtime-v1.mjs";
import {
  createStarcraftTmgCharacterHttpAdapter,
  STARCRAFT_TMG_CHARACTER_API_PREFIX,
} from "../packages/character-agent/http-handler-v1.mjs";
import {
  createStarcraftTmgAuthoritativeEngine,
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgRoomRuntime } from "../packages/room-runtime/in-memory-room-v1.mjs";
import { createStarcraftTmgConfiguredCharacterSessionFactory } from "../packages/product-composition/character-session-factory-v1.mjs";
import { createStarcraftTmgSampleState, loadStarcraftTmgData } from "../../scripts/starcraft-tmg-rules-v0.mjs";

const LEVEL3_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_ROOT = path.resolve(LEVEL3_ROOT, "..");
const REPORT_PATH = path.join(LEVEL3_ROOT, "build", "kerrigan-role-agent-v1", "report.json");
const OCCURRED_AT = "2026-08-24T03:00:00.000Z";
const ROOM_ID = "kerrigan-role-agent-verifier-room";
const API_KEY_SENTINEL = "sk-verifier-never-persist-this-value";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const data = await loadStarcraftTmgData(PROJECT_ROOT);
  const authorityEngine = createStarcraftTmgAuthoritativeEngine({ now: () => OCCURRED_AT });
  const roomRuntime = createStarcraftTmgRoomRuntime({ authorityEngine, now: () => OCCURRED_AT });
  const state = createStarcraftTmgSampleState(data);
  state.board.terrain = [];
  const serverSeatPlan = [
    { label: "tutor", seatKey: "player1", roleMode: "tutor", principalType: "model" },
    { label: "opponent", seatKey: "player1", roleMode: "opponent", principalType: "model" },
    { label: "opponentSupervisor", seatKey: "player1", roleMode: "supervisor", principalType: "human" },
    { label: "commentator", seatKey: "observer", roleMode: "commentator", principalType: "model" },
    { label: "companion", seatKey: "player1", roleMode: "companion", principalType: "model" },
  ];
  const initialStateAuthority = {
    source: "server_factory",
    state,
    dataVersion: data.version,
    receiptHash: hashStarcraftTmgContract({ source: "kerrigan-role-agent-verifier-v2", state }),
    serverSeatPlan,
  };
  const room = await roomRuntime.createRoom({
    roomId: ROOM_ID,
    gameId: "starcraft-tmg",
    initialStateAuthority,
    serverSeatPlan,
  });
  assert(room.ok, `room setup failed: ${room.reason || "unknown"}`);

  const transportAudits = [];
  const providerTransport = {
    async complete(request) {
      transportAudits.push({
        credentialReceived: request.apiKey === API_KEY_SENTINEL,
        promptPack: request.promptPack,
        allowedChannels: [...request.responseContract.allowedChannels],
        hasRoomProjection: Boolean(request.toolContext.roomProjection),
        legalSpaceHash: request.toolContext.legalSpace?.legalSpaceHash || null,
      });
      if (request.userMessage === "forbidden-decision") {
        return { output: { channels: { decision: { candidateId: request.toolContext.legalSpace.candidates.find((candidate) => candidate.isEnabled).candidateId, selectedReason: "forbidden test" } } } };
      }
      if (request.intent === "take_turn") {
        const enabled = request.toolContext.legalSpace.candidates.filter((candidate) => candidate.isEnabled);
        return {
          output: {
            channels: {
              decision: {
                candidateId: enabled.find((candidate) => candidate.action.actionType === "move")?.candidateId || enabled[0].candidateId,
                selectedReason: "Verifier transport selected an enabled movement candidate from the sealed LegalSpace.",
                rejectedAlternatives: enabled.slice(1, 3).map((candidate) => candidate.candidateId),
              },
              speech: { text: "我已选择一个合法候选，等待你的确认。" },
            },
          },
        };
      }
      if (request.promptPack === "novice_teacher_prompt") return { output: { channels: { teaching: { text: "先比较当前合法候选；我不会替你提交动作。" } } } };
      if (request.promptPack === "referee_prompt") return { output: { channels: { speech: { text: "当前只解说公开局面与已提交事件。" } } } };
      return { output: { channels: { speech: { text: "我会陪你复盘，但不会替你操作棋局。" }, teaching: { text: "需要时我可以解释公开信息。" } } } };
    },
  };

  const bundle = createKerriganPrimalProductBundleV1();
  const characterRuntime = createStarcraftTmgCharacterSessionRuntime({ roomRuntime, providerTransport, now: () => OCCURRED_AT });
  const configuredCharacterFactory = createStarcraftTmgConfiguredCharacterSessionFactory({
    allowRightsGatedDemo: true,
    productionMode: false,
    now: () => OCCURRED_AT,
    resolveSeatCredential: ({ mode }) => room.credentials[mode]?.seatToken,
  });
  const characterHttp = createStarcraftTmgCharacterHttpAdapter({
    sessionRuntime: characterRuntime,
    createSessionId: () => "kerrigan-http-tutor-session",
    liveProviderConfigured: false,
    sessionInputFactory: configuredCharacterFactory.sessionInputFactory,
    sessionFactoryMetadata: configuredCharacterFactory.metadata,
  });
  const checks = [];
  const failures = [];
  const sessionIds = {};
  let opponentInvocation = null;
  let applied = null;
  let tutorInvocation = null;

  async function check(id, fn) {
    try {
      await fn();
      checks.push({ id, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      checks.push({ id, ok: false, error: message });
      failures.push(`${id}: ${message}`);
    }
  }

  await check("character_package_round_trip_preserves_integrity_and_extensions", () => {
    const serialized = exportStarcraftTmgCharacterContract(bundle.characterPackage);
    const imported = importStarcraftTmgCharacterContract(serialized, "character-package");
    assert(imported.integrity.hash === bundle.characterPackage.integrity.hash, "CharacterPackage hash changed on round trip");
    assert(imported.extensions.characterCardV2.unknownFieldsPolicy === "preserve", "CharacterPackage extensions were lost");
    assert(imported.productRoleIsCanon === false, "Adjutant framing was incorrectly marked canon");
    assert(bundle.rightsGate.passed === false && bundle.rightsGate.productionSelectable === false, "rights gate was bypassed");
  });

  await check("online_provider_contract_rejects_dsh_and_credentials", () => {
    let dshRejected = false;
    try {
      createProviderProfile({ providerProfileId: "bad", version: "1", provider: "dsh", baseUrl: "https://example.invalid", model: "bad" });
    } catch {
      dshRejected = true;
    }
    assert(dshRejected, "DSH was accepted as an online ProviderProfile");
    let credentialRejected = false;
    try {
      createProviderProfile({ providerProfileId: "bad-key", version: "1", provider: "direct", baseUrl: "https://example.invalid", model: "bad", apiKey: API_KEY_SENTINEL });
    } catch {
      credentialRejected = true;
    }
    assert(credentialRejected, "ProviderProfile accepted credential material");
  });

  await check("four_modes_create_isolated_bindings_and_capabilities", async () => {
    for (const mode of ["tutor", "opponent", "commentator", "companion"]) {
      const sessionId = `kerrigan-${mode}-session`;
      sessionIds[mode] = sessionId;
      const created = await characterRuntime.createSession({
        sessionId,
        characterPackage: bundle.characterPackage,
        roleSkillPack: bundle.roleSkillPacks[mode],
        conversationProfile: bundle.conversationProfile,
        providerProfile: bundle.providerProfile,
        worldbooks: bundle.worldbooks,
        mode,
        roomId: ROOM_ID,
        seatId: room.credentials[mode].seatKey,
        seatToken: room.credentials[mode].seatToken,
        rulesetVersion: "starcraft_tmg_rules_v0",
        memoryRefs: mode === "opponent" ? [{ namespace: "strategy_memory", refId: "empty-strategy-snapshot", version: "v0" }] : [],
        ruleSkillRefs: ["starcraft_tmg_turn_flow_v61", "starcraft_tmg_action_legality_v61"],
        createdAt: OCCURRED_AT,
      });
      assert(created.ok, `${mode} session failed: ${created.reason || created.message || "unknown"}`);
      assert(created.session.binding.mode === mode, `${mode} binding mismatch`);
      assert(created.session.capability.mayApply === false, `${mode} was granted model-owned apply`);
      assert(created.session.capability.mayPreview === (mode === "opponent"), `${mode} preview capability mismatch`);
      const bound = characterRuntime.bindByok({ sessionId, apiKey: API_KEY_SENTINEL, boundAt: OCCURRED_AT });
      assert(bound.ok && bound.credentialBound, `${mode} BYOK binding failed`);
    }
    assert(new Set(Object.values(sessionIds)).size === 4, "role sessions are not isolated");
    const invalidMemory = await characterRuntime.createSession({
      sessionId: "invalid-tutor-memory-session",
      characterPackage: bundle.characterPackage,
      roleSkillPack: bundle.roleSkillPacks.tutor,
      conversationProfile: bundle.conversationProfile,
      providerProfile: bundle.providerProfile,
      worldbooks: bundle.worldbooks,
      mode: "tutor",
      roomId: ROOM_ID,
      seatId: "player1",
      seatToken: room.credentials.tutor.seatToken,
      rulesetVersion: "starcraft_tmg_rules_v0",
      memoryRefs: [{ namespace: "strategy_memory", refId: "forbidden", version: "v1" }],
      createdAt: OCCURRED_AT,
    });
    assert(!invalidMemory.ok && invalidMemory.reason === "invalid_session_contract", "Tutor accepted opponent strategy memory");
  });

  await check("tutor_is_read_only_and_cannot_emit_decision", async () => {
    tutorInvocation = await characterRuntime.invoke({ sessionId: sessionIds.tutor, userMessage: "请解释当前回合", intent: "chat", occurredAt: OCCURRED_AT });
    assert(tutorInvocation.ok && tutorInvocation.output.channels.teaching, "Tutor teaching invocation failed");
    assert(tutorInvocation.preview === null && tutorInvocation.confirmationRequired === false, "Tutor created a preview");
    const rejected = await characterRuntime.invoke({ sessionId: sessionIds.tutor, userMessage: "forbidden-decision", intent: "chat", occurredAt: OCCURRED_AT });
    assert(!rejected.ok && rejected.reason === "provider_output_rejected", "Tutor decision channel was not rejected");
    const current = await roomRuntime.readRoom({ roomId: ROOM_ID });
    assert(current.projection.room.stateRevision === 0 && current.projection.room.acceptedReceiptCount === 0, "Tutor mutated the room");
  });

  await check("opponent_selects_current_candidate_and_waits_for_human_confirmation", async () => {
    opponentInvocation = await characterRuntime.invoke({
      sessionId: sessionIds.opponent,
      userMessage: "执行你的回合",
      intent: "take_turn",
      occurredAt: OCCURRED_AT,
    });
    assert(opponentInvocation.ok, `Opponent invocation failed: ${opponentInvocation.reason || "unknown"}`);
    assert(opponentInvocation.preview?.ok && opponentInvocation.confirmationRequired, "Opponent did not create a confirmation-bound preview");
    assert(opponentInvocation.trace.promptPack === "opponent_prompt", "Opponent prompt route mismatch");
    assert(opponentInvocation.trace.harnessToolsCalled.join("/") === "read_board_state/list_legal_actions/read_character_worldbook/preview_action", "Opponent harness tool trace mismatch");
    assert(opponentInvocation.trace.promptAssemblyReceipt.worldbookActivationHash, "Opponent prompt receipt missed worldbook activation binding");
    const beforeApply = await roomRuntime.readRoom({ roomId: ROOM_ID });
    assert(beforeApply.projection.room.stateRevision === 0, "Provider preview applied itself");
    const confirmed = await roomRuntime.confirmPreview({
      roomId: ROOM_ID,
      seatToken: room.credentials.opponentSupervisor.seatToken,
      previewId: opponentInvocation.preview.preview.previewId,
      occurredAt: OCCURRED_AT,
    });
    assert(confirmed.ok, `human confirmation failed: ${confirmed.reason || "unknown"}`);
    const claimed = await roomRuntime.claimControl({
      roomId: ROOM_ID,
      seatToken: room.credentials.opponentSupervisor.seatToken,
      sessionId: "kerrigan-opponent-supervisor",
    });
    assert(claimed.ok, `human ControlLease failed: ${claimed.reason || "unknown"}`);
    applied = await roomRuntime.applyAction({
      roomId: ROOM_ID,
      seatToken: room.credentials.opponentSupervisor.seatToken,
      previewId: opponentInvocation.preview.preview.previewId,
      confirmationId: confirmed.confirmation.confirmationId,
      leaseId: claimed.controlLease.leaseId,
      leaseFence: claimed.controlLease.leaseFence,
      expectedStateRevision: 0,
      idempotencyKey: "kerrigan-opponent-action-1",
      occurredAt: OCCURRED_AT,
    });
    assert(applied.ok && applied.room.stateRevision === 1, "human-confirmed apply failed");
    assert(opponentInvocation.trace.roleMode === "opponent", "Character Harness trace lost opponent identity");
    assert(applied.receipt.confirmationProofHash, "accepted room receipt lost human confirmation proof");
  });

  await check("commentator_and_companion_remain_non_mutating", async () => {
    const commentator = await characterRuntime.invoke({ sessionId: sessionIds.commentator, userMessage: "解说局面", intent: "chat", occurredAt: OCCURRED_AT });
    const companion = await characterRuntime.invoke({ sessionId: sessionIds.companion, userMessage: "陪我复盘", intent: "chat", occurredAt: OCCURRED_AT });
    assert(commentator.ok && companion.ok, "read-only role invocation failed");
    assert(commentator.preview === null && companion.preview === null, "read-only role created a preview");
    const current = await roomRuntime.readRoom({ roomId: ROOM_ID });
    assert(current.projection.room.stateRevision === 1 && current.projection.room.acceptedReceiptCount === 1, "read-only role mutated room");
  });

  await check("byok_remains_session_memory_only_and_can_be_detached", async () => {
    for (const sessionId of Object.values(sessionIds)) {
      const inspected = characterRuntime.inspectSession({ sessionId });
      assert(inspected.ok && !JSON.stringify(inspected).includes(API_KEY_SENTINEL), "session inspection leaked BYOK material");
      const traces = characterRuntime.listTraces({ sessionId });
      assert(!JSON.stringify(traces).includes(API_KEY_SENTINEL), "harness trace leaked BYOK material");
    }
    assert(transportAudits.every((entry) => entry.credentialReceived), "direct Provider transport did not receive the session credential");
    const detached = characterRuntime.unbindByok({ sessionId: sessionIds.companion, unboundAt: OCCURRED_AT });
    assert(detached.ok && detached.credentialBound === false, "BYOK detach failed");
    const rejected = await characterRuntime.invoke({ sessionId: sessionIds.companion, userMessage: "再次对话", intent: "chat" });
    assert(!rejected.ok && rejected.reason === "credential_required", "detached session still invoked Provider");
  });

  await check("agent_http_boundary_requires_secure_byok_and_server_configured_contracts", async () => {
    const metadata = await characterHttp.handle({ method: "GET", pathname: `${STARCRAFT_TMG_CHARACTER_API_PREFIX}/metadata` });
    assert(metadata.status === 200 && metadata.response.result.arbitrarySystemPromptUpload === false, "Agent HTTP metadata allowed arbitrary prompt upload");
    assert(metadata.response.result.arbitraryProviderProfileUpload === false, "Agent HTTP metadata allowed arbitrary ProviderProfile upload");
    assert(metadata.response.result.configuredCharacterCatalogue.defaultCharacterId === bundle.characterPackage.characterId, "Agent HTTP default character mismatch");
    const created = await characterHttp.handle({
      method: "POST",
      pathname: `${STARCRAFT_TMG_CHARACTER_API_PREFIX}/sessions`,
      body: { mode: "tutor", roomId: ROOM_ID, seatId: "player1", systemPrompt: "must be ignored" },
    });
    assert(created.status === 200 && created.response.result.ok, "Agent HTTP session create failed");
    const insecure = await characterHttp.handle({
      method: "POST",
      pathname: `${STARCRAFT_TMG_CHARACTER_API_PREFIX}/sessions/kerrigan-http-tutor-session/byok`,
      body: { apiKey: API_KEY_SENTINEL },
      secureTransport: false,
    });
    assert(insecure.status === 426 && insecure.response.error === "secure_transport_required", "insecure BYOK ingress was accepted");
    const bound = await characterHttp.handle({
      method: "POST",
      pathname: `${STARCRAFT_TMG_CHARACTER_API_PREFIX}/sessions/kerrigan-http-tutor-session/byok`,
      body: { apiKey: API_KEY_SENTINEL, boundAt: OCCURRED_AT },
      secureTransport: true,
    });
    assert(bound.status === 200 && !JSON.stringify(bound).includes(API_KEY_SENTINEL), "secure BYOK response leaked credential material");
    const invoked = await characterHttp.handle({
      method: "POST",
      pathname: `${STARCRAFT_TMG_CHARACTER_API_PREFIX}/sessions/kerrigan-http-tutor-session/invoke`,
      body: { userMessage: "通过 HTTP 教我当前回合", intent: "chat", occurredAt: OCCURRED_AT },
    });
    assert(invoked.status === 200 && invoked.response.result.output.channels.teaching, "Agent HTTP Tutor invocation failed");
    assert(invoked.response.result.preview === null, "Agent HTTP Tutor created a preview");
    const destroyed = await characterHttp.handle({ method: "DELETE", pathname: `${STARCRAFT_TMG_CHARACTER_API_PREFIX}/sessions/kerrigan-http-tutor-session` });
    assert(destroyed.status === 200 && destroyed.response.result.credentialCleared, "Agent HTTP session destroy did not clear credential");
  });

  await check("authoritative_room_replays_after_agent_assisted_action", async () => {
    const replayed = await roomRuntime.replayRoom({ roomId: ROOM_ID });
    assert(replayed.ok && replayed.matchesCurrent && replayed.receiptCount === 1, "agent-assisted room replay failed");
    assert(replayed.trainingTruth === false, "replay overclaimed training truth");
  });

  const allCharacterTraces = Object.values(sessionIds).flatMap((sessionId) => characterRuntime.listTraces({ sessionId }).traces || []);
  const report = {
    schemaVersion: "starcraft_tmg_kerrigan_role_agent_verifier_v1",
    generatedAt: new Date().toISOString(),
    ok: failures.length === 0,
    checks,
    failures,
    evidence: {
      roomId: ROOM_ID,
      characterPackageHash: bundle.characterPackage.integrity.hash,
      worldbookHashes: bundle.worldbooks.map((worldbook) => worldbook.integrity.hash),
      roleSessionIds: sessionIds,
      opponentPromptReceiptHash: opponentInvocation?.promptAssemblyReceipt?.receiptHash || null,
      opponentWorldbookActivationHash: opponentInvocation?.promptAssemblyReceipt?.worldbookActivationHash || null,
      opponentPreviewToken: opponentInvocation?.preview?.preview?.previewToken || null,
      roomReceiptHash: applied?.receipt?.journalHash || null,
      roomTraceId: opponentInvocation?.trace?.traceId || null,
      directProviderEvidence: "injected_fake_transport_only_not_real_provider",
      agentHttpSecureByokGate: "command_verified_with_injected_provider_transport",
      rightsGatePassed: false,
      productionReady: false,
      trainingTruth: false,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: [...new Set(allCharacterTraces.map((trace) => trace.promptPack))],
      harnessToolsCalled: [...new Set(allCharacterTraces.flatMap((trace) => trace.harnessToolsCalled || []))],
      uiTraceEvidence: "not_run",
      agentDecisionEvidence: opponentInvocation?.trace?.decision || null,
      memoryTraceEvidence: {
        opponentRefs: opponentInvocation?.trace?.memoryRefs || [],
        crossModeIsolationChecked: true,
        promotionAttempted: false,
      },
      trainingTraceCandidates: 0,
      rollbackOrDemotionRules: [
        "disable the CharacterPackage when rights, era, chronology, hidden-state, or rule-hallucination gates fail",
        "disable a role capability when it emits a forbidden channel or tool",
        "reject and replay-audit any opponent trace whose LegalSpace or receipt binding no longer matches",
      ],
      userVisibleChecks: "not_run",
    },
  };
  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  if (!report.ok) throw new Error(failures.join("\n"));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
