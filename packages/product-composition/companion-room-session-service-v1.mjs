import { randomUUID } from "node:crypto";

import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";

export const STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION =
  "starcraft_tmg_companion_room_session_service_v1";

const BINDING_NAMESPACE = "product.companion-room-binding.v1";
const MAX_COMPANIONS = 6;
const MAX_USER_MESSAGE_CHARS = 8_192;
const MAX_PROVIDER_OUTPUT_TOKENS = 4_096;

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requiredString(value, field, maximum = 512) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw Object.assign(new TypeError(`${field} is required`), {
    code: "COMPANION_ROOM_INPUT_INVALID",
  });
  if (normalized.length > maximum) throw Object.assign(new TypeError(`${field} is too long`), {
    code: "COMPANION_ROOM_INPUT_INVALID",
  });
  return normalized;
}

function rejection(reason, details = {}) {
  return deepFreeze({
    ok: false,
    schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.rejection`,
    reason: String(reason || "COMPANION_ROOM_OPERATION_FAILED"),
    ...clone(details),
    trainingTruth: false,
  });
}

function assertMethod(owner, method, label) {
  if (typeof owner?.[method] !== "function") {
    throw new TypeError(`${label}.${method} is required`);
  }
}

function uniqueStrings(values, field, maximum = MAX_COMPANIONS) {
  if (!Array.isArray(values) || values.length === 0 || values.length > maximum) {
    throw Object.assign(new TypeError(`${field} must contain 1..${maximum} entries`), {
      code: "COMPANION_ROOM_INPUT_INVALID",
    });
  }
  const rows = values.map((value, index) => requiredString(value, `${field}[${index}]`));
  if (new Set(rows).size !== rows.length) {
    throw Object.assign(new TypeError(`${field} must not contain duplicates`), {
      code: "COMPANION_ROOM_INPUT_INVALID",
    });
  }
  return rows;
}

function packageParticipantId(packageRef) {
  return `companion-${hashStarcraftTmgContract(packageRef).slice(0, 24)}`;
}

function publicConversation(binding, state, extra = {}) {
  return deepFreeze({
    ok: true,
    schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.conversation`,
    conversationId: binding.conversationId,
    roomId: binding.roomId,
    seatKey: binding.seatKey,
    mode: binding.mode,
    status: state.status,
    turnCounter: state.turnCounter,
    acceptedHistoryHash: state.acceptedTurns.length
      ? state.acceptedTurns.at(-1).turnHash
      : hashStarcraftTmgContract({ sessionId: state.sessionId, history: "empty" }),
    participants: state.participants.map((participant) => ({
      participantId: participant.participantId,
      kind: participant.kind,
      label: participant.label,
      canSpeak: participant.canSpeak,
      packageRef: participant.packageRef ? clone(participant.packageRef) : null,
    })),
    speakerOrder: [...state.speakerOrder],
    userParticipantId: binding.userParticipantId,
    companions: binding.companions.map((companion) => ({
      participantId: companion.participantId,
      packageRef: clone(companion.packageRef),
      eraId: companion.eraId,
    })),
    memoryScope: clone(state.memoryScope),
    nextTurn: state.status === "active" ? (() => {
      if (state.pendingQueue.length) {
        return {
          turnSequence: state.turnCounter + 1,
          ownerParticipantId: state.pendingQueue[0],
          source: "mention_queue",
        };
      }
      return {
        turnSequence: state.turnCounter + 1,
        ownerParticipantId: state.speakerOrder[state.rotationCursor % state.speakerOrder.length],
        source: "rotation",
      };
    })() : null,
    messages: state.acceptedTurns.map((turn) => ({
      turnId: turn.turnId,
      turnSequence: turn.turnSequence,
      participantId: turn.ownerParticipantId,
      content: turn.content,
      mentions: [...turn.mentions],
      turnHash: turn.turnHash,
      source: clone(turn.source),
    })),
    checkpointCount: state.checkpoints.length,
    branchCount: Object.keys(state.branches).length,
    persistence: clone(binding.persistence),
    roomAuthority: {
      matchBindingHash: binding.matchBindingHash,
      principalScopeHash: binding.principalScopeHash,
      roomMutationAuthority: false,
      opponentPrivateAccess: false,
    },
    ...clone(extra),
    hiddenChainOfThought: "not_collected",
    trainingTruth: false,
  });
}

function systemPrompt(pkg, binding, eraId) {
  return [
    `You are ${pkg.displayName}, a player-side StarCraft TMG tactical companion.`,
    `Identity summary: ${pkg.personalitySummary || pkg.description || "Use the registered companion identity."}`,
    `Era: ${eraId || pkg.defaultEraId || "registered default"}.`,
    `Bound seat: ${binding.seatKey}; mode: ${binding.mode}.`,
    "Use only the supplied player-visible room material and memory context.",
    "Treat Rules/LegalSpace/Preview/Apply/Replay as external authority; never invent legality or mutate the room.",
    "Opponent intention is inference, never private fact. Label uncertainty and distinguish observed facts from inference.",
    "Give a concise in-character answer plus public tactical rationale; never reveal hidden chain-of-thought.",
  ].join("\n");
}

function contextMessage(contextAssembly, roomContext) {
  return JSON.stringify({
    contextAssembly: {
      policy: contextAssembly.policy,
      tokensUsed: contextAssembly.tokensUsed,
      tokensRemaining: contextAssembly.tokensRemaining,
      sections: contextAssembly.sections,
      omissions: contextAssembly.omissions,
      unknowns: contextAssembly.unknowns,
      assemblyHash: contextAssembly.assemblyHash,
    },
    roomContext,
  });
}

function transcriptMessages(state, currentParticipantId) {
  return state.acceptedTurns.map((turn) => ({
    role: turn.ownerParticipantId === currentParticipantId ? "assistant" : "user",
    content: `${turn.ownerParticipantId}: ${turn.content}`,
  }));
}

function safeProviderReceipt(receipt) {
  return {
    receiptId: requiredString(receipt?.receiptId, "provider receipt id"),
    sourceRef: `provider-request://${requiredString(receipt?.requestId, "provider request id")}`,
    requestHash: receipt.requestHash,
    responseHash: receipt.responseHash,
    usage: clone(receipt.usage),
    directModuleNetworkAttempts: receipt.directModuleNetworkAttempts,
    externalNetworkAttempts: receipt.externalNetworkAttempts,
    paidInference: receipt.paidInference,
    reportedCostUnits: receipt.reportedCostUnits,
    accountingSource: receipt.accountingSource,
    reasoningTrace: "not_collected",
  };
}

export function createStarcraftTmgCompanionRoomSessionServiceV1(options = {}) {
  const roomRuntime = options.roomRuntime;
  const backend = options.companionBackend;
  for (const method of ["readRoom", "readCharacterPresentation", "readBattleWorkbench"]) {
    assertMethod(roomRuntime, method, "roomRuntime");
  }
  for (const method of ["resolve"]) assertMethod(backend?.registry, method, "companionBackend.registry");
  for (const method of ["get", "put", "durabilityDeclaration"]) assertMethod(backend?.persistenceGateway, method, "companionBackend.persistenceGateway");
  for (const method of ["createSession", "getSessionState", "peekNextTurn", "submitTurn", "filterSessionState", "checkpointSession", "resumeSession", "closeSession"]) {
    assertMethod(backend?.sessionRuntime, method, "companionBackend.sessionRuntime");
  }
  for (const method of ["assembleContext"]) assertMethod(backend?.memoryEngine, method, "companionBackend.memoryEngine");
  for (const method of ["complete", "stats"]) assertMethod(backend?.providerGateway, method, "companionBackend.providerGateway");

  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();
  const createId = typeof options.createId === "function"
    ? options.createId
    : () => `sc-companion-${randomUUID()}`;
  const queues = new Map();

  async function serialize(conversationId, operation) {
    const previous = queues.get(conversationId) || Promise.resolve();
    let release;
    const current = new Promise((resolve) => { release = resolve; });
    const chain = previous.then(() => current);
    queues.set(conversationId, chain);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (queues.get(conversationId) === chain) queues.delete(conversationId);
    }
  }

  async function authority(input) {
    const roomId = requiredString(input.roomId, "roomId", 128);
    const seatToken = requiredString(input.seatToken, "seatToken", 1024);
    const [roomResult, presentationResult] = await Promise.all([
      roomRuntime.readRoom({ roomId, seatToken }),
      roomRuntime.readCharacterPresentation({ roomId, seatToken }),
    ]);
    if (!roomResult?.ok) return { rejection: rejection(roomResult?.reason || "ROOM_AUTHORITY_REJECTED") };
    if (!presentationResult?.ok) {
      return { rejection: rejection(presentationResult?.reason || "CHARACTER_PRESENTATION_REJECTED") };
    }
    const room = roomResult.projection;
    const presentation = presentationResult.projection;
    if (!room?.viewer?.seatKey || room.viewer.roleMode === "public_observer"
      || !presentation?.principalScopeHash || !room?.matchBinding?.bindingHash) {
      return { rejection: rejection("COMPANION_AUTHORITY_BINDING_INVALID") };
    }
    return {
      roomId,
      seatToken,
      room,
      presentation,
      binding: {
        roomId,
        seatKey: room.viewer.seatKey,
        principalScopeHash: presentation.principalScopeHash,
        matchBindingHash: room.matchBinding.bindingHash,
      },
    };
  }

  async function loadBound(input) {
    const authenticated = await authority(input);
    if (authenticated.rejection) return authenticated;
    const conversationId = requiredString(input.conversationId, "conversationId", 160);
    const stored = await backend.persistenceGateway.get(BINDING_NAMESPACE, conversationId);
    if (!stored.found) return { rejection: rejection("COMPANION_CONVERSATION_NOT_FOUND") };
    const binding = stored.value;
    if (binding.roomId !== authenticated.binding.roomId
      || binding.seatKey !== authenticated.binding.seatKey
      || binding.principalScopeHash !== authenticated.binding.principalScopeHash) {
      return { rejection: rejection("COMPANION_CONVERSATION_SCOPE_MISMATCH") };
    }
    if (binding.matchBindingHash !== authenticated.binding.matchBindingHash) {
      return { rejection: rejection("COMPANION_MATCH_BINDING_STALE") };
    }
    const state = await backend.sessionRuntime.getSessionState(conversationId);
    return { ...authenticated, conversationId, binding, state };
  }

  async function openConversation(input = {}) {
    try {
      const authenticated = await authority(input);
      if (authenticated.rejection) return authenticated.rejection;
      const packageIds = uniqueStrings(input.packageIds, "packageIds");
      const resolved = packageIds.map((packageId) => backend.registry.resolve({
        packageId,
        ...(input.versions?.[packageId] ? { version: input.versions[packageId] } : {}),
      }));
      const failed = resolved.find((entry) => !entry.ok);
      if (failed) return rejection(failed.reason || "COMPANION_PACKAGE_NOT_AVAILABLE");
      const packages = resolved.map((entry) => entry.package);
      if (packages.some((pkg) => !pkg.supportedSeats.includes("player_seat"))) {
        return rejection("COMPANION_PACKAGE_SEAT_UNSUPPORTED");
      }
      const conversationId = requiredString(createId(), "generated conversationId", 160);
      const userParticipantId = `user-${authenticated.binding.principalScopeHash.slice(0, 24)}`;
      const companionParticipants = packages.map((pkg) => ({
        participantId: packageParticipantId({
          id: pkg.packageId,
          version: pkg.version,
          hash: pkg.integrity.hash,
        }),
        kind: "companion",
        seat: "player_seat",
        label: pkg.displayName,
        packageRef: { id: pkg.packageId, version: pkg.version, hash: pkg.integrity.hash },
      }));
      await backend.sessionRuntime.createSession({
        sessionId: conversationId,
        conversationId,
        participants: [
          {
            participantId: userParticipantId,
            kind: "user",
            seat: "player_seat",
            label: "Player",
          },
          ...companionParticipants,
        ],
        speakerOrder: [userParticipantId, ...companionParticipants.map((entry) => entry.participantId)],
        memoryScope: {
          companionId: `group-${hashStarcraftTmgContract(companionParticipants.map((entry) => entry.packageRef)).slice(0, 24)}`,
          conversationId,
        },
      });
      const binding = {
        schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.binding`,
        conversationId,
        roomId: authenticated.binding.roomId,
        seatKey: authenticated.binding.seatKey,
        principalScopeHash: authenticated.binding.principalScopeHash,
        matchBindingHash: authenticated.binding.matchBindingHash,
        mode: "companion",
        userParticipantId,
        companions: packages.map((pkg, index) => ({
          participantId: companionParticipants[index].participantId,
          packageRef: companionParticipants[index].packageRef,
          eraId: input.eraIds?.[pkg.packageId] || pkg.defaultEraId || null,
        })),
        persistence: backend.persistenceGateway.durabilityDeclaration(),
        createdAt: new Date(now()).toISOString(),
        roomMutationAuthority: false,
        trainingTruth: false,
      };
      await backend.persistenceGateway.put(BINDING_NAMESPACE, conversationId, binding);
      const state = await backend.sessionRuntime.getSessionState(conversationId);
      return publicConversation(binding, state);
    } catch (error) {
      return rejection(error?.code || "COMPANION_CONVERSATION_CREATE_FAILED", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function listScopeBindings(bindingScope) {
    const keys = await backend.persistenceGateway.list(BINDING_NAMESPACE);
    const matches = [];
    for (const key of keys) {
      const stored = await backend.persistenceGateway.get(BINDING_NAMESPACE, key);
      const binding = stored.found ? stored.value : null;
      if (!binding
        || binding.roomId !== bindingScope.roomId
        || binding.seatKey !== bindingScope.seatKey
        || binding.principalScopeHash !== bindingScope.principalScopeHash
        || binding.matchBindingHash !== bindingScope.matchBindingHash) continue;
      matches.push(binding);
    }
    matches.sort((left, right) => String(left.createdAt).localeCompare(String(right.createdAt))
      || left.conversationId.localeCompare(right.conversationId));
    return matches;
  }

  function sameCompanionSet(binding, packageIds) {
    const bound = binding.companions.map((entry) => entry.packageRef.id);
    if (bound.length !== packageIds.length) return false;
    const wanted = new Set(packageIds);
    return bound.every((id) => wanted.has(id));
  }

  async function latestActiveBinding(bindings) {
    for (let index = bindings.length - 1; index >= 0; index -= 1) {
      const binding = bindings[index];
      const state = await backend.sessionRuntime.getSessionState(binding.conversationId);
      if (state.status === "active") return { binding, state };
    }
    return null;
  }

  async function readActiveConversation(input = {}) {
    try {
      const authenticated = await authority(input);
      if (authenticated.rejection) return authenticated.rejection;
      const active = await latestActiveBinding(
        await listScopeBindings(authenticated.binding),
      );
      if (!active) return rejection("COMPANION_CONVERSATION_NOT_FOUND");
      return publicConversation(active.binding, active.state, {
        providerAccounting: backend.providerGateway.stats(),
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_CONVERSATION_READ_FAILED");
    }
  }

  async function openOrResumeConversation(input = {}) {
    try {
      const authenticated = await authority(input);
      if (authenticated.rejection) return authenticated.rejection;
      const packageIds = uniqueStrings(input.packageIds, "packageIds");
      const candidates = (await listScopeBindings(authenticated.binding))
        .filter((binding) => sameCompanionSet(binding, packageIds));
      const active = await latestActiveBinding(candidates);
      if (active) {
        return publicConversation(active.binding, active.state, {
          resumed: true,
          providerAccounting: backend.providerGateway.stats(),
        });
      }
      return openConversation(input);
    } catch (error) {
      return rejection(error?.code || "COMPANION_CONVERSATION_CREATE_FAILED", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function readConversation(input = {}) {
    try {
      const loaded = await loadBound(input);
      if (loaded.rejection) return loaded.rejection;
      return publicConversation(loaded.binding, loaded.state, {
        providerAccounting: backend.providerGateway.stats(),
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_CONVERSATION_READ_FAILED");
    }
  }

  async function providerReply(loaded, participant, scanText, roomContext) {
    const companion = loaded.binding.companions.find((entry) => entry.participantId === participant.participantId);
    if (!companion) return rejection("COMPANION_PARTICIPANT_BINDING_MISSING");
    const packageResult = backend.registry.resolve({
      packageId: companion.packageRef.id,
      version: companion.packageRef.version,
    });
    if (!packageResult.ok || packageResult.package.integrity.hash !== companion.packageRef.hash) {
      return rejection("COMPANION_PACKAGE_BINDING_STALE");
    }
    const pkg = packageResult.package;
    const memoryScope = {
      packageId: pkg.packageId,
      companionId: participant.participantId,
      conversationId: loaded.conversationId,
    };
    const contextAssembly = await backend.memoryEngine.assembleContext(memoryScope, {
      scanText,
      tokenBudget: Number.isSafeInteger(Number(options.contextTokenBudget))
        ? Number(options.contextTokenBudget)
        : 6_144,
      transcriptTail: 1,
    });
    const requestId = `companion-${loaded.conversationId}-${loaded.state.turnCounter + 1}`;
    return backend.providerGateway.complete({
      requestId,
      companionRef: companion.packageRef,
      messages: [
        { role: "system", content: systemPrompt(pkg, loaded.binding, companion.eraId) },
        { role: "system", content: contextMessage(contextAssembly, roomContext) },
        ...transcriptMessages(loaded.state, participant.participantId),
      ],
      maxOutputTokens: Math.min(MAX_PROVIDER_OUTPUT_TOKENS,
        Math.max(1, Number(options.maxOutputTokens || 1_024))),
      temperature: Number.isFinite(Number(options.temperature))
        ? Number(options.temperature)
        : 0.35,
      metadata: {
        gameId: "starcraft-tmg",
        roomId: loaded.binding.roomId,
        seatKey: loaded.binding.seatKey,
        mode: loaded.binding.mode,
        conversationId: loaded.conversationId,
        participantId: participant.participantId,
        matchBindingHash: loaded.binding.matchBindingHash,
        contextAssemblyHash: contextAssembly.assemblyHash,
        roomMutationAuthority: false,
      },
    });
  }

  async function drainCompanionReplies(loaded, scanText) {
    const [roomResult, workbenchResult] = await Promise.all([
      roomRuntime.readRoom({ roomId: loaded.binding.roomId, seatToken: loaded.seatToken }),
      roomRuntime.readBattleWorkbench({ roomId: loaded.binding.roomId, seatToken: loaded.seatToken }),
    ]);
    if (!roomResult?.ok || !workbenchResult?.ok) {
      return rejection("COMPANION_ROOM_CONTEXT_UNAVAILABLE", {
        conversationId: loaded.conversationId,
        acceptedHistoryPreserved: true,
      });
    }
    const roomContext = {
      room: roomResult.projection.room,
      viewer: roomResult.projection.viewer,
      matchBinding: roomResult.projection.matchBinding,
      state: roomResult.projection.state,
      workbench: workbenchResult.snapshot,
      visibility: "player_visible",
    };
    const replies = [];
    while (true) {
      loaded.state = await backend.sessionRuntime.getSessionState(loaded.conversationId);
      const pending = loaded.state.pendingQueue.length
        ? loaded.state.pendingQueue[0]
        : loaded.state.speakerOrder[loaded.state.rotationCursor % loaded.state.speakerOrder.length];
      if (pending === loaded.binding.userParticipantId) break;
      const participant = loaded.state.participants.find((entry) => entry.participantId === pending);
      if (!participant || participant.kind !== "companion") {
        return rejection("COMPANION_TURN_OWNER_INVALID", {
          conversationId: loaded.conversationId,
          participantId: pending,
        });
      }
      const filtered = await backend.sessionRuntime.filterSessionState(
        loaded.conversationId,
        pending,
        {
          items: [{
            itemId: `room-context-${roomResult.projection.room.stateRevision}`,
            visibility: "player_visible",
            payload: roomContext,
          }],
        },
      );
      if (filtered.visible.length !== 1) {
        return rejection("COMPANION_ROOM_CONTEXT_WITHHELD", {
          conversationId: loaded.conversationId,
          withheld: filtered.withheld,
        });
      }
      const completed = await providerReply(loaded, participant, scanText,
        filtered.visible[0].payload);
      if (!completed.ok) {
        return rejection(completed.reason || "COMPANION_PROVIDER_REJECTED", {
          conversationId: loaded.conversationId,
          acceptedHistoryPreserved: true,
          pendingParticipantId: pending,
          retryPolicy: "explicit_continue_only_never_automatic",
          provider: clone(completed),
        });
      }
      const turn = await backend.sessionRuntime.submitTurn(loaded.conversationId, {
        participantId: pending,
        expectedTurnSequence: loaded.state.turnCounter + 1,
        content: completed.response.content,
        mentions: [],
        receipts: [safeProviderReceipt(completed.receipt)],
      });
      replies.push({
        participantId: pending,
        content: completed.response.content,
        rationale: completed.response.rationale,
        uncertainty: completed.response.uncertainty,
        turnHash: turn.turn.turnHash,
        providerReceipt: safeProviderReceipt(completed.receipt),
      });
    }
    const state = await backend.sessionRuntime.getSessionState(loaded.conversationId);
    return publicConversation(loaded.binding, state, {
      replies,
      providerAccounting: backend.providerGateway.stats(),
    });
  }

  async function sendMessage(input = {}) {
    let conversationId;
    try {
      conversationId = requiredString(input.conversationId, "conversationId", 160);
      return await serialize(conversationId, async () => {
        let loaded = await loadBound(input);
        if (loaded.rejection) return loaded.rejection;
        const content = requiredString(input.content, "content", MAX_USER_MESSAGE_CHARS);
        const mentions = input.mentions === undefined
          ? []
          : uniqueStrings(input.mentions, "mentions", MAX_COMPANIONS).map((packageId) => {
            const companion = loaded.binding.companions.find((entry) => entry.packageRef.id === packageId);
            if (!companion) throw Object.assign(new TypeError(`mentioned companion is not bound: ${packageId}`), {
              code: "COMPANION_MENTION_NOT_BOUND",
            });
            return companion.participantId;
          });
        const next = await backend.sessionRuntime.peekNextTurn(conversationId);
        if (next.ownerParticipantId !== loaded.binding.userParticipantId) {
          return rejection("COMPANION_RESPONSE_PENDING", { nextTurn: next });
        }
        await backend.sessionRuntime.submitTurn(conversationId, {
          participantId: loaded.binding.userParticipantId,
          expectedTurnSequence: next.turnSequence,
          content,
          mentions,
          receipts: [{
            receiptId: `user-message-${next.turnSequence}`,
            sourceRef: `room://${loaded.binding.roomId}/seat/${loaded.binding.seatKey}`,
          }],
        });

        return drainCompanionReplies(loaded, content);
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_MESSAGE_FAILED", {
        ...(conversationId ? { conversationId } : {}),
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function continueConversation(input = {}) {
    let conversationId;
    try {
      conversationId = requiredString(input.conversationId, "conversationId", 160);
      return await serialize(conversationId, async () => {
        const loaded = await loadBound(input);
        if (loaded.rejection) return loaded.rejection;
        const next = await backend.sessionRuntime.peekNextTurn(conversationId);
        if (next.ownerParticipantId === loaded.binding.userParticipantId) {
          return rejection("COMPANION_RESPONSE_NOT_PENDING", { nextTurn: next });
        }
        const lastUserTurn = [...loaded.state.acceptedTurns].reverse()
          .find((turn) => turn.ownerParticipantId === loaded.binding.userParticipantId);
        if (!lastUserTurn) return rejection("COMPANION_USER_CONTEXT_MISSING");
        return drainCompanionReplies(loaded, lastUserTurn.content);
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_CONTINUE_FAILED", {
        ...(conversationId ? { conversationId } : {}),
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function checkpointConversation(input = {}) {
    try {
      const loaded = await loadBound(input);
      if (loaded.rejection) return loaded.rejection;
      const checkpoint = await serialize(loaded.conversationId, () =>
        backend.sessionRuntime.checkpointSession(loaded.conversationId, String(input.label || "")));
      return deepFreeze({ ...checkpoint, trainingTruth: false });
    } catch (error) {
      return rejection(error?.code || "COMPANION_CHECKPOINT_FAILED");
    }
  }

  async function resumeConversation(input = {}) {
    try {
      const loaded = await loadBound(input);
      if (loaded.rejection) return loaded.rejection;
      await serialize(loaded.conversationId, () => backend.sessionRuntime.resumeSession(
        loaded.conversationId,
        input.checkpointId ? { checkpointId: input.checkpointId } : {},
      ));
      const state = await backend.sessionRuntime.getSessionState(loaded.conversationId);
      return publicConversation(loaded.binding, state, { resumed: true });
    } catch (error) {
      return rejection(error?.code || "COMPANION_RESUME_FAILED");
    }
  }

  async function closeConversation(input = {}) {
    try {
      const loaded = await loadBound(input);
      if (loaded.rejection) return loaded.rejection;
      await serialize(loaded.conversationId, () =>
        backend.sessionRuntime.closeSession(loaded.conversationId));
      const state = await backend.sessionRuntime.getSessionState(loaded.conversationId);
      return publicConversation(loaded.binding, state);
    } catch (error) {
      return rejection(error?.code || "COMPANION_CLOSE_FAILED");
    }
  }

  function metadata() {
    return deepFreeze({
      schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.metadata`,
      operations: [
        "open",
        "open_or_resume",
        "read",
        "read_active",
        "send",
        "continue",
        "checkpoint",
        "resume",
        "close",
      ],
      maximumCompanions: MAX_COMPANIONS,
      roomBinding: "revalidated_on_every_operation",
      storedSeatCredential: false,
      principalStorage: "scope_hash_only",
      opponentPrivateAccess: false,
      roomMutationAuthority: false,
      hiddenChainOfThought: "not_collected",
      concurrency: "single_process_serialized_per_conversation",
      multiInstanceProductionReady: false,
      trainingTruth: false,
    });
  }

  return Object.freeze({
    metadata,
    openConversation,
    openOrResumeConversation,
    readConversation,
    readActiveConversation,
    sendMessage,
    continueConversation,
    checkpointConversation,
    resumeConversation,
    closeConversation,
  });
}
