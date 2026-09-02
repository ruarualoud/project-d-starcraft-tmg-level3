import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";
import {
  assertStarcraftTmgCharacterContract,
  createGameRoleBinding,
} from "./contracts-v1.mjs";
import {
  assertStarcraftTmgModeToolAllowed,
  getStarcraftTmgModeCapability,
  validateStarcraftTmgMemoryRefs,
} from "./mode-capability-v1.mjs";
import { assembleStarcraftTmgRolePrompt } from "./prompt-assembly-v1.mjs";
import { createStarcraftTmgWorldbookRegistry } from "./worldbook-registry-v1.mjs";
import {
  assertStarcraftTmgDynamicDialoguePortraitManifestV1,
  createStarcraftTmgDynamicDialoguePortraitStateV1,
  listStarcraftTmgDialogueVisualCuesV1,
  reduceStarcraftTmgDynamicDialoguePortraitStateV1,
  resolveStarcraftTmgDynamicDialoguePortraitV1,
  validateStarcraftTmgDialogueVisualCueV1,
} from "./dynamic-dialogue-portrait-v1.mjs";

export const STARCRAFT_TMG_CHARACTER_SESSION_VERSION = "starcraft_tmg_character_session_v1";

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requiredString(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

function rejection(reason, details = {}) {
  return deepFreeze({ ok: false, schemaVersion: `${STARCRAFT_TMG_CHARACTER_SESSION_VERSION}.rejection`, reason, ...clone(details) });
}

function boundedText(value, field, maxLength = 8000) {
  const normalized = requiredString(value, field);
  if (normalized.length > maxLength) throw new Error(`${field} exceeds ${maxLength} characters`);
  return normalized;
}

function safeProviderReceipt(receipt) {
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) return null;
  const serialized = JSON.stringify(receipt).toLowerCase();
  if (/api[_-]?key|authorization|bearer|credential|secret|cookie/.test(serialized)) throw new Error("Provider receipt contains credential material");
  if (receipt.receiptHash) {
    const { receiptHash, ...unsigned } = receipt;
    if (hashStarcraftTmgContract(unsigned) !== receiptHash) throw new Error("Provider receipt integrity mismatch");
  }
  const safe = {
    schemaVersion: receipt.schemaVersion || "unknown_provider_receipt",
    provider: receipt.provider || null,
    providerProfileRef: clone(receipt.providerProfileRef || null),
    model: receipt.model || null,
    requestId: receipt.requestId || null,
    status: Number.isSafeInteger(receipt.status) ? receipt.status : null,
    usage: clone(receipt.usage || null),
    elapsedMs: Number.isSafeInteger(receipt.elapsedMs) ? receipt.elapsedMs : null,
    responseFingerprint: receipt.responseFingerprint || null,
    internalRetries: Number.isSafeInteger(receipt.internalRetries) ? receipt.internalRetries : null,
    receiptHash: receipt.receiptHash || null,
  };
  return deepFreeze(safe);
}

function safeProviderFailure(error) {
  const code = /^[A-Z][A-Z0-9_]{1,63}$/.test(String(error?.code || "")) ? String(error.code) : "PROVIDER_TRANSPORT_FAILED";
  const receipt = error?.safeReceipt && typeof error.safeReceipt === "object" ? error.safeReceipt : {};
  return deepFreeze({
    code,
    retryable: receipt.retryable === true,
    status: Number.isSafeInteger(receipt.status) ? receipt.status : null,
    requestId: /^[A-Za-z0-9._:-]{1,200}$/.test(String(receipt.requestId || "")) ? receipt.requestId : null,
  });
}

function validateOutput(output, capability, legalSpace, requireDecision) {
  if (!output || typeof output !== "object" || Array.isArray(output)) throw new Error("Provider output must be an object");
  for (const key of Object.keys(output)) {
    if (!["channels", "visualCue"].includes(key)) throw new Error(`Provider output cannot set server-owned field: ${key}`);
  }
  const channels = output.channels;
  if (!channels || typeof channels !== "object" || Array.isArray(channels)) throw new Error("Provider output.channels must be an object");
  const normalizedChannels = {};
  for (const [channelName, channel] of Object.entries(channels)) {
    if (!capability.outputChannels.includes(channelName)) throw new Error(`${channelName} output is forbidden for ${capability.mode}`);
    if (!channel || typeof channel !== "object" || Array.isArray(channel)) throw new Error(`${channelName} channel must be an object`);
    if (channelName === "decision") {
      if (!capability.maySelectDecision) throw new Error(`${capability.mode} cannot emit a decision channel`);
      const candidateId = requiredString(channel.candidateId, "channels.decision.candidateId");
      const candidate = legalSpace?.candidates?.find((entry) => entry.candidateId === candidateId && entry.isEnabled);
      if (!candidate) throw new Error("decision candidate is not enabled in the current LegalSpace");
      normalizedChannels.decision = {
        candidateId,
        selectedReason: boundedText(channel.selectedReason || "selected from the current LegalSpace", "channels.decision.selectedReason", 2000),
        rejectedAlternatives: Array.isArray(channel.rejectedAlternatives)
          ? channel.rejectedAlternatives.slice(0, 16).map((entry) => String(entry))
          : [],
      };
    } else {
      normalizedChannels[channelName] = { text: boundedText(channel.text, `channels.${channelName}.text`) };
      if (Array.isArray(channel.citations)) normalizedChannels[channelName].citations = channel.citations.slice(0, 32).map((entry) => String(entry));
    }
  }
  if (requireDecision && !normalizedChannels.decision) throw new Error("opponent take_turn requires a decision channel");
  if (Object.keys(normalizedChannels).length === 0) throw new Error("Provider output contains no allowed channel");
  const visualCue = validateStarcraftTmgDialogueVisualCueV1(capability.mode, output.visualCue || "neutral");
  return deepFreeze({ channels: normalizedChannels, visualCue });
}

export function createStarcraftTmgCharacterSessionRuntime(options = {}) {
  const roomRuntime = options.roomRuntime;
  if (!roomRuntime || typeof roomRuntime.readRoom !== "function") throw new Error("roomRuntime is required");
  const providerTransport = options.providerTransport;
  if (!providerTransport || typeof providerTransport.complete !== "function") throw new Error("direct providerTransport.complete is required");
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();
  const dialoguePortraitManifest = options.dialoguePortraitManifest
    ? assertStarcraftTmgDynamicDialoguePortraitManifestV1(options.dialoguePortraitManifest)
    : null;
  const dialoguePortraitEnvironment = options.dialoguePortraitEnvironment || "development";
  if (!["development", "public"].includes(dialoguePortraitEnvironment)) {
    throw new Error(`unsupported dialoguePortraitEnvironment: ${dialoguePortraitEnvironment}`);
  }
  const sessions = new Map();
  const byokCredentials = new Map();
  const seatCredentials = new Map();

  function getSession(sessionId) {
    return sessions.get(String(sessionId || "")) || null;
  }

  function summary(session) {
    const portraitView = session.dialoguePortraitState && dialoguePortraitManifest
      ? resolveStarcraftTmgDynamicDialoguePortraitV1(
        dialoguePortraitManifest,
        session.dialoguePortraitState,
        { environment: dialoguePortraitEnvironment },
      )
      : null;
    return deepFreeze({
      schemaVersion: `${STARCRAFT_TMG_CHARACTER_SESSION_VERSION}.summary`,
      sessionId: session.sessionId,
      binding: session.binding,
      character: {
        id: session.characterPackage.characterId,
        displayName: session.characterPackage.displayName,
        version: session.characterPackage.version,
        hash: session.characterPackage.integrity.hash,
        productRoleIsCanon: session.characterPackage.productRoleIsCanon,
        rightsStatus: session.characterPackage.rights?.status || "unknown",
      },
      mode: session.binding.mode,
      capability: session.capability,
      worldbookPolicy: clone(session.worldbookPolicy),
      promptPack: session.capability.promptPack,
      provider: {
        profileId: session.providerProfile.providerProfileId,
        provider: session.providerProfile.provider,
        model: session.providerProfile.model,
        credentialPolicy: session.providerProfile.credentialPolicy,
        credentialBound: byokCredentials.has(session.sessionId),
      },
      historyCount: session.history.length,
      traceCount: session.traces.length,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      dialoguePortrait: session.dialoguePortraitState ? {
        manifestRef: {
          id: dialoguePortraitManifest.manifestId,
          version: dialoguePortraitManifest.version,
          hash: dialoguePortraitManifest.manifestHash,
        },
        state: session.dialoguePortraitState,
        view: portraitView,
      } : null,
      durability: "process_memory_v0",
      productionReady: false,
      trainingTruth: false,
    });
  }

  async function createSession(input = {}) {
    let sessionId;
    try {
      sessionId = requiredString(input.sessionId, "sessionId");
      if (sessions.has(sessionId)) return rejection("session_already_exists", { sessionId });
      const characterPackage = assertStarcraftTmgCharacterContract(input.characterPackage, "character-package");
      const roleSkillPack = assertStarcraftTmgCharacterContract(input.roleSkillPack, "role-skill-pack");
      const conversationProfile = assertStarcraftTmgCharacterContract(input.conversationProfile, "conversation-profile");
      const providerProfile = assertStarcraftTmgCharacterContract(input.providerProfile, "provider-profile");
      const capability = getStarcraftTmgModeCapability(input.mode);
      const submittedWorldbooks = (input.worldbooks || []).map((worldbook) => assertStarcraftTmgCharacterContract(worldbook, "worldbook"));
      const spoilerCeilingRank = Number(input.spoilerCeilingRank ?? characterPackage.spoilerProfile?.defaultRank ?? 0);
      const knowledgeCeilingRank = Number(input.knowledgeCeilingRank ?? spoilerCeilingRank);
      if (!Number.isSafeInteger(spoilerCeilingRank) || spoilerCeilingRank < 0) throw new Error("spoilerCeilingRank must be a non-negative safe integer");
      if (!Number.isSafeInteger(knowledgeCeilingRank) || knowledgeCeilingRank < 0) throw new Error("knowledgeCeilingRank must be a non-negative safe integer");
      for (const worldbook of submittedWorldbooks) {
        if (worldbook.characterId !== characterPackage.characterId) throw new Error(`worldbook ${worldbook.worldbookId} character mismatch`);
        if (!characterPackage.worldbookIds.includes(worldbook.worldbookId)) throw new Error(`worldbook ${worldbook.worldbookId} is not allowed by CharacterPackage`);
        if (worldbook.spoilerRank > spoilerCeilingRank) throw new Error(`worldbook ${worldbook.worldbookId} exceeds spoiler ceiling`);
        if (worldbook.knowledgeRank > knowledgeCeilingRank) throw new Error(`worldbook ${worldbook.worldbookId} exceeds knowledge ceiling`);
        if (worldbook.canonStatus === "fanon" && input.allowFanon !== true) throw new Error(`worldbook ${worldbook.worldbookId} requires explicit fanon opt-in`);
      }
      const personaWorldbooks = submittedWorldbooks.filter((worldbook) => worldbook.worldbookKind === "persona_edition");
      if (personaWorldbooks.length > 1) throw new Error("multiple persona edition worldbooks are forbidden");
      if (characterPackage.defaultWorldbookIds.length > 0 && personaWorldbooks.length !== 1) throw new Error("one persona edition worldbook is required");
      const worldbookRegistry = createStarcraftTmgWorldbookRegistry({
        characterId: characterPackage.characterId,
        worldbooks: submittedWorldbooks,
      });
      const worldbookSelection = worldbookRegistry.resolve({
        characterPackage,
        requestedWorldbookIds: submittedWorldbooks.map((worldbook) => worldbook.worldbookId),
        spoilerCeilingRank,
        knowledgeCeilingRank,
        allowFanon: input.allowFanon === true,
        requirePersonaEdition: characterPackage.defaultWorldbookIds.length > 0,
      });
      if (!worldbookSelection.ok) throw new Error(`worldbook selection failed: ${worldbookSelection.reason}`);
      const worldbooks = worldbookSelection.worldbooks;
      const memoryRefs = validateStarcraftTmgMemoryRefs(input.mode, input.memoryRefs || []);
      const createdAt = new Date(input.createdAt || now()).toISOString();
      if (dialoguePortraitManifest && dialoguePortraitManifest.characterId !== characterPackage.characterId) {
        throw new Error("dialogue portrait manifest character mismatch");
      }
      const binding = createGameRoleBinding({
        bindingId: input.bindingId || `${sessionId}.binding`,
        version: "1.0.0",
        characterPackage,
        roleSkillPack,
        conversationProfile,
        providerProfile,
        mode: capability.mode,
        roomId: input.roomId,
        seatId: input.seatId || "observer",
        gameId: input.gameId || "starcraft-tmg",
        rulesetVersion: input.rulesetVersion,
        visibilityPolicy: capability.visibilityPolicy,
        capabilityProfileId: capability.capabilityProfileId,
        worldbookRefs: worldbooks.map((worldbook) => ({ id: worldbook.worldbookId, version: worldbook.version, hash: worldbook.integrity.hash })),
        strategySkillSnapshot: input.strategySkillSnapshot || { refs: [], canOverrideRules: false },
        memoryScopes: memoryRefs.map((entry) => entry.namespace),
        createdBy: input.createdBy || "local-user",
        createdAt,
        extensions: {
          worldbookPolicy: {
            spoilerCeilingRank,
            knowledgeCeilingRank,
            allowFanon: input.allowFanon === true,
            activePersonaState: personaWorldbooks[0]?.personaState || null,
            selectionHash: worldbookSelection.receipt.selectionHash,
          },
        },
      });
      const seatToken = requiredString(input.seatToken, "seatToken");
      const room = await roomRuntime.readRoom({ roomId: binding.roomId, seatToken });
      if (!room.ok) return rejection(room.reason || "room_projection_failed");
      const session = {
        sessionId,
        characterPackage,
        roleSkillPack,
        conversationProfile,
        providerProfile,
        worldbooks,
        worldbookRegistry,
        worldbookSelectionReceipt: worldbookSelection.receipt,
        worldbookPolicy: binding.extensions.worldbookPolicy,
        memoryRefs,
        ruleSkillRefs: clone(input.ruleSkillRefs || []),
        capability,
        binding,
        history: [],
        traces: [],
        dialoguePortraitState: dialoguePortraitManifest
          ? createStarcraftTmgDynamicDialoguePortraitStateV1(dialoguePortraitManifest, {
            mode: capability.mode,
            updatedAt: createdAt,
          })
          : null,
        createdAt,
        updatedAt: createdAt,
      };
      sessions.set(sessionId, session);
      seatCredentials.set(sessionId, seatToken);
      return deepFreeze({ ok: true, session: summary(session) });
    } catch (error) {
      return rejection("invalid_session_contract", { message: error instanceof Error ? error.message : String(error) });
    }
  }

  function bindByok(input = {}) {
    const session = getSession(input.sessionId);
    if (!session) return rejection("session_not_found", { sessionId: input.sessionId || "" });
    const apiKey = String(input.apiKey || "");
    if (apiKey.trim().length < 8) return rejection("invalid_byok_credential");
    byokCredentials.set(session.sessionId, apiKey);
    session.updatedAt = new Date(input.boundAt || now()).toISOString();
    return deepFreeze({ ok: true, sessionId: session.sessionId, credentialBound: true, credentialPolicy: "session_memory_only_byok" });
  }

  function unbindByok(input = {}) {
    const session = getSession(input.sessionId);
    if (!session) return rejection("session_not_found", { sessionId: input.sessionId || "" });
    byokCredentials.delete(session.sessionId);
    session.updatedAt = new Date(input.unboundAt || now()).toISOString();
    return deepFreeze({ ok: true, sessionId: session.sessionId, credentialBound: false });
  }

  function inspectSession(input = {}) {
    const session = getSession(input.sessionId);
    if (!session) return rejection("session_not_found", { sessionId: input.sessionId || "" });
    return deepFreeze({ ok: true, session: summary(session) });
  }

  function appendTrace(session, unsigned) {
    const trace = deepFreeze({ ...unsigned, traceId: `sc-character-trace-${hashStarcraftTmgContract(unsigned)}` });
    session.traces.push(trace);
    session.updatedAt = trace.occurredAt;
    return trace;
  }

  function transitionDialoguePortrait(session, event) {
    if (!dialoguePortraitManifest || !session.dialoguePortraitState) return null;
    session.dialoguePortraitState = reduceStarcraftTmgDynamicDialoguePortraitStateV1(
      dialoguePortraitManifest,
      session.dialoguePortraitState,
      event,
    );
    return resolveStarcraftTmgDynamicDialoguePortraitV1(
      dialoguePortraitManifest,
      session.dialoguePortraitState,
      { environment: dialoguePortraitEnvironment },
    );
  }

  function readDialoguePortrait(input = {}) {
    const session = getSession(input.sessionId);
    if (!session) return rejection("session_not_found", { sessionId: input.sessionId || "" });
    if (!dialoguePortraitManifest || !session.dialoguePortraitState) {
      return rejection("dialogue_portrait_not_configured", { sessionId: session.sessionId });
    }
    return deepFreeze({
      ok: true,
      sessionId: session.sessionId,
      state: session.dialoguePortraitState,
      view: resolveStarcraftTmgDynamicDialoguePortraitV1(
        dialoguePortraitManifest,
        session.dialoguePortraitState,
        { environment: dialoguePortraitEnvironment },
      ),
      trainingTruth: false,
    });
  }

  async function invoke(input = {}) {
    const session = getSession(input.sessionId);
    if (!session) return rejection("session_not_found", { sessionId: input.sessionId || "" });
    const apiKey = byokCredentials.get(session.sessionId);
    if (!apiKey) return rejection("credential_required", { credentialPolicy: "session_memory_only_byok" });
    const seatToken = seatCredentials.get(session.sessionId);
    if (!seatToken) return rejection("seat_credential_required");
    const intent = input.intent || "chat";
    let userMessage;
    try {
      userMessage = boundedText(input.userMessage, "userMessage", 12000);
    } catch (error) {
      return rejection("invalid_user_message", { message: error instanceof Error ? error.message : String(error) });
    }
    const portraitOccurredAt = new Date(input.occurredAt || now()).toISOString();
    transitionDialoguePortrait(session, { type: "user_message_received", occurredAt: portraitOccurredAt });
    transitionDialoguePortrait(session, { type: "planning_started", occurredAt: portraitOccurredAt });
    const toolCalls = [];
    assertStarcraftTmgModeToolAllowed(session.binding.mode, "read_board_state");
    const room = await roomRuntime.readRoom({
      roomId: session.binding.roomId,
      seatToken,
      includeJournal: false,
    });
    toolCalls.push("read_board_state");
    if (!room.ok) return rejection(room.reason || "room_projection_failed");

    let legalSpace = null;
    if (session.capability.tools.includes("list_legal_actions")) {
      const legal = await roomRuntime.legalSpace({ roomId: session.binding.roomId, seatToken });
      toolCalls.push("list_legal_actions");
      if (!legal.ok) return rejection(legal.reason || "legal_space_failed");
      legalSpace = legal.legalSpace;
    }

    const assembly = assembleStarcraftTmgRolePrompt({
      characterPackage: session.characterPackage,
      roleSkillPack: session.roleSkillPack,
      conversationProfile: session.conversationProfile,
      binding: session.binding,
      worldbooks: session.worldbooks,
      memoryRefs: session.memoryRefs,
      roomProjection: room.projection,
      legalSpace,
      worldbookActivation: session.worldbookRegistry.activate({
        ok: true,
        worldbooks: session.worldbooks,
        receipt: session.worldbookSelectionReceipt,
      }, {
        mode: session.binding.mode,
        userMessage,
        maxEntries: 32,
      }),
    });
    toolCalls.push("read_character_worldbook");
    let providerResult;
    try {
      providerResult = await providerTransport.complete({
        providerProfile: session.providerProfile,
        apiKey,
        promptPack: session.capability.promptPack,
        promptNodes: assembly.nodes,
        userMessage,
        intent,
        toolContext: { roomProjection: room.projection, legalSpace },
        responseContract: {
          allowedChannels: session.capability.outputChannels,
          allowedVisualCues: listStarcraftTmgDialogueVisualCuesV1(session.binding.mode),
          decisionCandidateSource: session.capability.maySelectDecision ? "current_legal_space_only" : "forbidden",
          visualCueAuthority: "validated_model_suggestion_only_mode_phase_and_asset_are_server_owned",
        },
      });
    } catch (error) {
      const occurredAt = new Date(now()).toISOString();
      const portraitView = transitionDialoguePortrait(session, { type: "provider_failed", occurredAt });
      const providerFailure = safeProviderFailure(error);
      const trace = appendTrace(session, {
        schemaVersion: `${STARCRAFT_TMG_CHARACTER_SESSION_VERSION}.harness-trace`,
        gameId: session.binding.gameId,
        roomId: session.binding.roomId,
        sessionId: session.sessionId,
        mode: session.binding.mode === "opponent" ? "user_vs_agent" : session.binding.mode === "commentator" ? "referee" : "teaching",
        roleMode: session.binding.mode,
        promptPack: session.capability.promptPack,
        promptAssemblyReceipt: assembly.receipt,
        ruleSkillRefs: session.ruleSkillRefs,
        memoryRefs: session.memoryRefs,
        harnessVersion: STARCRAFT_TMG_CHARACTER_SESSION_VERSION,
        agentVersion: session.providerProfile.model,
        rulesVersion: session.binding.rulesetVersion,
        providerStatus: "transport_failed",
        providerFailure,
        harnessToolsCalled: toolCalls,
        occurredAt,
        eligibleForTraining: false,
        reviewStatus: "rejected",
        trainingTruth: false,
      });
      return rejection("provider_transport_failed", {
        traceId: trace.traceId,
        providerFailure,
        portraitState: session.dialoguePortraitState,
        portraitView,
      });
    }

    let output;
    let providerReceipt;
    try {
      providerReceipt = safeProviderReceipt(providerResult?.receipt);
      if (providerReceipt?.providerProfileRef
        && (providerReceipt.providerProfileRef.id !== session.providerProfile.providerProfileId
          || providerReceipt.providerProfileRef.hash !== session.providerProfile.integrity.hash)) {
        throw new Error("Provider receipt profile binding mismatch");
      }
      if (providerReceipt?.responseFingerprint
        && providerReceipt.responseFingerprint !== hashStarcraftTmgContract(providerResult?.output)) {
        throw new Error("Provider receipt output binding mismatch");
      }
      output = validateOutput(providerResult?.output, session.capability, legalSpace, intent === "take_turn" && session.binding.mode === "opponent");
    } catch (error) {
      const occurredAt = new Date(input.occurredAt || now()).toISOString();
      const portraitView = transitionDialoguePortrait(session, { type: "provider_failed", occurredAt });
      const message = error instanceof Error ? error.message : String(error);
      const trace = appendTrace(session, {
        schemaVersion: `${STARCRAFT_TMG_CHARACTER_SESSION_VERSION}.harness-trace`,
        gameId: session.binding.gameId,
        roomId: session.binding.roomId,
        sessionId: session.sessionId,
        mode: session.binding.mode === "opponent" ? "user_vs_agent" : session.binding.mode === "commentator" ? "referee" : "teaching",
        roleMode: session.binding.mode,
        promptPack: session.capability.promptPack,
        promptAssemblyReceipt: assembly.receipt,
        ruleSkillRefs: session.ruleSkillRefs,
        memoryRefs: session.memoryRefs,
        harnessVersion: STARCRAFT_TMG_CHARACTER_SESSION_VERSION,
        agentVersion: session.providerProfile.model,
        rulesVersion: session.binding.rulesetVersion,
        providerStatus: "output_rejected",
        outputHash: hashStarcraftTmgContract(providerResult?.output || null),
        rejectionCode: "provider_output_rejected",
        harnessToolsCalled: toolCalls,
        occurredAt,
        eligibleForTraining: false,
        reviewStatus: "rejected",
        trainingTruth: false,
      });
      return rejection("provider_output_rejected", {
        message,
        traceId: trace.traceId,
        portraitState: session.dialoguePortraitState,
        portraitView,
      });
    }

    let preview = null;
    if (output.channels.decision) {
      assertStarcraftTmgModeToolAllowed(session.binding.mode, "preview_action");
      preview = await roomRuntime.previewAction({
        roomId: session.binding.roomId,
        seatToken,
        candidateId: output.channels.decision.candidateId,
        occurredAt: input.occurredAt || now(),
      });
      toolCalls.push("preview_action");
      if (!preview.ok) {
        const occurredAt = new Date(input.occurredAt || now()).toISOString();
        const portraitView = transitionDialoguePortrait(session, { type: "provider_failed", occurredAt });
        const trace = appendTrace(session, {
          schemaVersion: `${STARCRAFT_TMG_CHARACTER_SESSION_VERSION}.harness-trace`,
          gameId: session.binding.gameId,
          roomId: session.binding.roomId,
          sessionId: session.sessionId,
          mode: "user_vs_agent",
          roleMode: session.binding.mode,
          promptPack: session.capability.promptPack,
          promptAssemblyReceipt: assembly.receipt,
          ruleSkillRefs: session.ruleSkillRefs,
          memoryRefs: session.memoryRefs,
          harnessVersion: STARCRAFT_TMG_CHARACTER_SESSION_VERSION,
          agentVersion: session.providerProfile.model,
          rulesVersion: session.binding.rulesetVersion,
          providerStatus: "completed_preview_rejected",
          decision: output.channels.decision,
          rejectionCode: preview.reason || "preview_failed",
          harnessToolsCalled: toolCalls,
          occurredAt,
          eligibleForTraining: false,
          reviewStatus: "rejected",
          trainingTruth: false,
        });
        return rejection(preview.reason || "preview_failed", {
          traceId: trace.traceId,
          portraitState: session.dialoguePortraitState,
          portraitView,
        });
      }
    }

    const occurredAt = new Date(input.occurredAt || now()).toISOString();
    let portraitView = transitionDialoguePortrait(session, {
      type: "provider_output_accepted",
      visualCue: output.visualCue,
      occurredAt,
    });
    if (preview) {
      portraitView = transitionDialoguePortrait(session, { type: "confirmation_requested", occurredAt });
    }
    const traceUnsigned = {
      schemaVersion: `${STARCRAFT_TMG_CHARACTER_SESSION_VERSION}.harness-trace`,
      gameId: session.binding.gameId,
      roomId: session.binding.roomId,
      sessionId: session.sessionId,
      mode: session.binding.mode === "opponent" ? "user_vs_agent" : session.binding.mode === "commentator" ? "referee" : "teaching",
      roleMode: session.binding.mode,
      promptPack: session.capability.promptPack,
      promptAssemblyReceipt: assembly.receipt,
      ruleSkillRefs: session.ruleSkillRefs,
      memoryRefs: session.memoryRefs,
      harnessVersion: STARCRAFT_TMG_CHARACTER_SESSION_VERSION,
      agentVersion: session.providerProfile.model,
      rulesVersion: session.binding.rulesetVersion,
      providerProfileRef: {
        id: session.providerProfile.providerProfileId,
        version: session.providerProfile.version,
        hash: session.providerProfile.integrity.hash,
      },
      providerStatus: "completed",
      providerReceipt,
      harnessToolsCalled: toolCalls,
      userMessageHash: hashStarcraftTmgContract(userMessage),
      outputHash: hashStarcraftTmgContract(output),
      decision: output.channels.decision ? {
        ...output.channels.decision,
        legalSpaceHash: legalSpace.legalSpaceHash,
        previewToken: preview.preview.previewToken,
      } : null,
      confirmationRequired: Boolean(preview),
      portraitStateHash: session.dialoguePortraitState?.stateHash || null,
      portraitViewHash: portraitView?.viewHash || null,
      occurredAt,
      eligibleForTraining: false,
      reviewStatus: "raw",
      trainingTruth: false,
    };
    const trace = appendTrace(session, traceUnsigned);
    session.history.push(deepFreeze({
      turnId: `sc-character-turn-${hashStarcraftTmgContract({ sessionId: session.sessionId, traceId: trace.traceId })}`,
      userMessageHash: trace.userMessageHash,
      outputHash: trace.outputHash,
      occurredAt,
    }));
    return deepFreeze({
      ok: true,
      output,
      preview,
      confirmationRequired: Boolean(preview),
      promptAssemblyReceipt: assembly.receipt,
      trace,
      portraitState: session.dialoguePortraitState,
      portraitView,
      session: summary(session),
    });
  }

  function listTraces(input = {}) {
    const session = getSession(input.sessionId);
    if (!session) return rejection("session_not_found", { sessionId: input.sessionId || "" });
    return deepFreeze({ ok: true, sessionId: session.sessionId, traces: clone(session.traces), trainingTruth: false });
  }

  function destroySession(input = {}) {
    const session = getSession(input.sessionId);
    if (!session) return rejection("session_not_found", { sessionId: input.sessionId || "" });
    byokCredentials.delete(session.sessionId);
    seatCredentials.delete(session.sessionId);
    sessions.delete(session.sessionId);
    return deepFreeze({ ok: true, sessionId: session.sessionId, credentialCleared: true });
  }

  return Object.freeze({
    createSession,
    bindByok,
    unbindByok,
    inspectSession,
    invoke,
    readDialoguePortrait,
    listTraces,
    destroySession,
  });
}
