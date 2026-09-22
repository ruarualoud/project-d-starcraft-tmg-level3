import { randomUUID } from "node:crypto";

import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";
import { createWorldbookEntry, importCompanionBackendContract } from
  "../companion-backend-module-v1/index.mjs";

export const STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION =
  "starcraft_tmg_companion_room_session_service_v1";

const BINDING_NAMESPACE = "product.companion-room-binding.v1";
const PERSONA_NAMESPACE = "product.companion-persona.v1";
const AUTHORS_NOTE_NAMESPACE = "product.companion-authors-note.v1";
// Slice 266e: durable package-to-backend promotion records (sealed contract +
// sha256 integrity pin). Exported so product construction can re-verify and
// re-register promotions on every composition.
export const STARCRAFT_TMG_COMPANION_PACKAGE_PROMOTION_NAMESPACE =
  "product.companion-package-promotion.v1";
const PACKAGE_PROMOTION_NAMESPACE = STARCRAFT_TMG_COMPANION_PACKAGE_PROMOTION_NAMESPACE;
const MAX_COMPANIONS = 6;
const MAX_USER_MESSAGE_CHARS = 8_192;
const MAX_PROVIDER_OUTPUT_TOKENS = 4_096;
const MAX_PERSONA_VERSIONS = 32;
const MAX_PERSONA_NAME_CHARS = 64;
const MAX_PERSONA_DESCRIPTION_CHARS = 2_000;
const MAX_AUTHORS_NOTE_CHARS = 2_000;
const MAX_AUTHORS_NOTE_VERSIONS = 32;
const MAX_AUTHORS_NOTE_DEPTH = 8;
const MAX_AUTHORS_NOTE_FREQUENCY = 16;
const MAX_CHAT_WORLDBOOK_ENTRIES = 64;
const WORLDBOOK_ENTRY_SCHEMA = "companion_backend_module_contract_v1.worldbook-entry";
const CONVERSATION_EXPORT_SCHEMA = "starcraft_tmg_companion_room_session_service_v1.conversation-export-v1";
const PACKAGE_EXPORT_SCHEMA = "starcraft_tmg_companion_room_session_service_v1.package-export-v1";
const WORLDBOOK_EXPORT_SCHEMA = "starcraft_tmg_companion_room_session_service_v1.worldbook-export-v1";
const HIDDEN_COT_KEY_PATTERN = /chain[_-]?of[_-]?thought|hidden[_-]?(chain|reasoning|thought|state)|thinking[_-]?trace|internal[_-]?monologue|private[_-]?reasoning/i;
const CREDENTIAL_KEY_PATTERN = /api[_-]?key|authorization|bearer|credential|secret|password|access[_-]?token|session[_-]?token/i;

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

function scanKeys(value, pattern, code, path = "") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanKeys(entry, pattern, code, `${path}[${index}]`));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (pattern.test(key)) {
      throw Object.assign(new TypeError(`forbidden key "${key}" at ${path || "<root>"}`), { code });
    }
    scanKeys(child, pattern, code, path ? `${path}.${key}` : key);
  }
}

function assertPortablePayload(value, field = "value") {
  scanKeys(value, HIDDEN_COT_KEY_PATTERN, "COMPANION_HIDDEN_COT_FORBIDDEN", field);
  scanKeys(value, CREDENTIAL_KEY_PATTERN, "COMPANION_CREDENTIALS_FORBIDDEN", field);
  return value;
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

function publicConversation(binding, state, extra = {}, userLabel = null) {
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
      label: participant.participantId === binding.userParticipantId && userLabel
        ? userLabel
        : participant.label,
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

// Slice 266f.9: speaker-specific prompt assembly. The sealed package's formal
// persona profile (voice/doctrine/style — Project D role configuration), the
// era detail (title/timeline/knowledge cutoff) and an explicit
// multi-companion distinctness instruction make each companion's prompt
// observably role- and era-specific, so companions can no longer collapse
// into one interchangeable voice. All of it is static package-sealed canon/
// lore configuration; session long-term memory rides in the context layers.
function personaProfileOf(pkg) {
  const profile = pkg?.extensions?.personaProfile;
  return object(profile) ? profile : null;
}

function eraDetailOf(pkg, eraId) {
  const details = Array.isArray(pkg?.extensions?.eraDetails)
    ? pkg.extensions.eraDetails : [];
  return details.find((era) => era.personaState === eraId)
    || details.find((era) => era.personaState === pkg?.defaultEraId)
    || null;
}

function packageAuthorNoteOf(pkg) {
  const note = pkg?.extensions?.authorNote;
  return object(note) && String(note.note || "").trim() ? note : null;
}

function systemPrompt(pkg, binding, eraId, sessionParticipants = []) {
  const profile = personaProfileOf(pkg);
  const era = eraDetailOf(pkg, eraId);
  const lines = [
    `You are ${pkg.displayName}, a player-side StarCraft TMG tactical companion.`,
    `Identity summary: ${pkg.personalitySummary || pkg.description || "Use the registered companion identity."}`,
  ];
  if (era) {
    lines.push(`Era: ${era.personaState} — ${era.title} (${era.timeline.start} → ${era.timeline.end}). Knowledge cutoff: ${era.knowledgeCutoff}; never use knowledge beyond this era (spoiler rank ${era.spoilerRank}).`);
  } else {
    lines.push(`Era: ${eraId || pkg.defaultEraId || "registered default"}.`);
  }
  if (profile) {
    lines.push(`Persona voice (sealed package, ${profile.authoringClass}): cadence ${profile.cadence}; address ${profile.addressStyle}; humor ${profile.humor}; warmth ${profile.companionWarmth}; teaching ${profile.teachingPosture}.`);
    if (String(profile.tacticalPattern || "").trim()) {
      lines.push(`Tactical pattern: ${String(profile.tacticalPattern).replaceAll("_", " ")}.`);
    }
    if (Array.isArray(profile.doctrineHints) && profile.doctrineHints.length) {
      lines.push(`Doctrine priorities: ${profile.doctrineHints.map(String).join("; ")}.`);
    }
    if (Array.isArray(profile.styleExamples) && profile.styleExamples.length) {
      lines.push(`Style examples (package-authored role configuration, not official quotes): ${profile.styleExamples.map(String).join(" / ")}`);
    }
  }
  const others = (Array.isArray(sessionParticipants) ? sessionParticipants : [])
    .filter((participant) => participant?.kind === "companion" && participant.label !== pkg.displayName)
    .map((participant) => String(participant.label));
  if (others.length) {
    lines.push(`This is a multi-companion conversation with: ${others.join(", ")}. Answer ONLY as ${pkg.displayName}, in your own era and voice, with your own priorities. When the plan or another speaker conflicts with your doctrine, say so explicitly and propose your own action; never merge another speaker's persona or wording into your answer.`);
  }
  lines.push(
    `Bound seat: ${binding.seatKey}; mode: ${binding.mode}.`,
    "Use only the supplied player-visible room material and memory context.",
    "Treat Rules/LegalSpace/Preview/Apply/Replay as external authority; never invent legality or mutate the room.",
    "Opponent intention is inference, never private fact. Label uncertainty and distinguish observed facts from inference.",
    "Give a concise in-character answer plus public tactical rationale; never reveal hidden chain-of-thought.",
  );
  return lines.join("\n");
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
  for (const method of ["createSession", "getSessionState", "peekNextTurn", "submitTurn", "filterSessionState", "checkpointSession", "resumeSession", "closeSession", "openBranch", "submitBranchEntry", "acceptBranchEntry", "discardBranch", "listBranches", "exportSession", "importSession", "authorizeSessionRead"]) {
    assertMethod(backend?.sessionRuntime, method, "companionBackend.sessionRuntime");
  }
  for (const method of ["assembleContext", "readTranscript", "replaceTranscript", "readRollingSummary", "writeRollingSummary", "listRollingSummaryVersions", "rollbackRollingSummary", "addEpisodicFact", "listEpisodicFacts", "initializeRelationshipState", "getRelationshipState", "applyRelationshipEvent", "listWorldbookEntries", "registerWorldbookEntry"]) assertMethod(backend?.memoryEngine, method, "companionBackend.memoryEngine");
  for (const method of ["complete", "stats"]) assertMethod(backend?.providerGateway, method, "companionBackend.providerGateway");
  for (const method of ["record", "verify", "exportAuditLog", "buildReplayCandidate"]) assertMethod(backend?.auditLog, method, "companionBackend.auditLog");

  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();
  const createId = typeof options.createId === "function"
    ? options.createId
    : () => `sc-companion-${randomUUID()}`;
  const queues = new Map();

  // Slice 266d: deterministic worldbook trigger wiring. Global-tier entries
  // are product-construction constants (validated and sealed at startup);
  // character-tier entries are derived from the sealed package extensions at
  // request time; persona-tier entries are derived from the seat's current
  // user persona; chat-tier entries are persisted per conversation. Trigger
  // recursion is bounded (engine maximum 4; product default 2).
  const worldbookRecursionDepth = Math.min(4, Math.max(0,
    Number.isSafeInteger(Number(options.worldbookRecursionDepth))
      ? Number(options.worldbookRecursionDepth)
      : 2));
  const globalWorldbookEntries = (Array.isArray(options.globalWorldbookEntries)
    ? options.globalWorldbookEntries
    : []).map((entry, index) => {
    try {
      return createWorldbookEntry({ ...clone(entry), scope: "global" });
    } catch (error) {
      throw Object.assign(new TypeError(
        `globalWorldbookEntries[${index}] is invalid: ${error instanceof Error ? error.message : String(error)}`), {
        code: "COMPANION_WORLDBOOK_ENTRY_INVALID",
      });
    }
  });

  function chatWorldbookScope(conversationId) {
    return { packageId: null, companionId: "chat", conversationId: String(conversationId) };
  }

  function personaKeyFor(binding) {
    return `persona-${hashStarcraftTmgContract({
      roomId: binding.roomId,
      seatKey: binding.seatKey,
      matchBindingHash: binding.matchBindingHash,
    }).slice(0, 32)}`;
  }

  async function loadPersonaRecord(binding) {
    const personaKey = personaKeyFor(binding);
    const stored = await backend.persistenceGateway.get(PERSONA_NAMESPACE, personaKey);
    return { personaKey, record: stored.found ? clone(stored.value) : null };
  }

  function currentPersona(record) {
    if (!record || !Array.isArray(record.versions) || !record.versions.length) return null;
    return record.versions.find((entry) => entry.version === record.currentVersion)
      || record.versions[record.versions.length - 1];
  }

  async function resolveUserLabel(binding) {
    const { record } = await loadPersonaRecord(binding);
    return currentPersona(record)?.displayName || "Player";
  }

  // The persona-tier worldbook entry is derived deterministically from the
  // seat's current persona version — never persisted as a worldbook entry,
  // so a persona edit can never leave a stale duplicate behind.
  function personaWorldbookEntry(personaKey, record) {
    const persona = currentPersona(record);
    if (!persona || !String(persona.description || "").trim()) return null;
    return createWorldbookEntry({
      entryId: `persona.current.v${persona.version}`,
      label: `User persona: ${persona.displayName}`,
      scope: "persona",
      triggers: [{ kind: "always" }],
      priority: 10,
      tokenBudget: 512,
      content: `The player is "${persona.displayName}". ${persona.description}`,
      provenance: {
        sourceKind: "platform_original",
        author: "authenticated_seat_user",
        license: "user_owned_content",
        sourceRefs: [`persona://${personaKey}/v${persona.version}`],
        notes: "Derived from the seat's current versioned user persona at request time.",
      },
      sourceReceipts: [{
        receiptId: `persona-v${persona.version}-receipt`,
        sourceRef: `persona://${personaKey}/v${persona.version}`,
      }],
    });
  }

  // Character-tier entries derived from the sealed package extensions (pack
  // worldbook entries). Canon-status maps to provenance honestly; every pack
  // entry stays always-active (parity-matrix documented) AND gains a
  // deterministic keyword trigger on its title.
  function characterWorldbookEntries(pkg) {
    const raw = Array.isArray(pkg?.extensions?.worldbookEntries)
      ? pkg.extensions.worldbookEntries
      : [];
    return raw.map((entry) => {
      const triggers = [];
      if (entry.activation?.always !== false) triggers.push({ kind: "always" });
      const title = String(entry.title || "").trim();
      if (title.length >= 3) triggers.push({ kind: "keyword", keywords: [title] });
      if (!triggers.length) triggers.push({ kind: "keyword", keywords: [String(entry.entryId)] });
      const canon = String(entry.canonStatus || "platform_framing");
      return createWorldbookEntry({
        entryId: String(entry.entryId),
        label: title || String(entry.entryId),
        scope: "character",
        triggers,
        priority: 0,
        tokenBudget: 384,
        content: String(entry.content || ""),
        provenance: {
          sourceKind: canon === "platform_framing" ? "platform_original" : "official_summary",
          author: "Project D",
          license: "proprietary-development-internal",
          sourceRefs: Array.isArray(entry.sourceRefs) ? entry.sourceRefs.map(String) : [],
          notes: `Character-tier worldbook entry sealed in the companion package (canonStatus: ${canon}).`,
        },
        sourceReceipts: (Array.isArray(entry.sourceRefs) && entry.sourceRefs.length
          ? entry.sourceRefs.map(String)
          : [`package://${pkg.packageId}/${entry.entryId}`]).map((sourceRef, index) => ({
          receiptId: `${entry.entryId}-src-${index + 1}`,
          sourceRef,
        })),
      });
    });
  }

  async function loadAuthorsNoteRecord(conversationId) {
    const stored = await backend.persistenceGateway.get(AUTHORS_NOTE_NAMESPACE, String(conversationId));
    return stored.found ? clone(stored.value) : null;
  }

  function currentAuthorsNote(record) {
    if (!record || !Array.isArray(record.versions) || !record.versions.length) return null;
    return record.versions.find((entry) => entry.version === record.currentVersion)
      || record.versions[record.versions.length - 1];
  }

  function authorsNoteProjection(record) {
    const current = currentAuthorsNote(record);
    if (!current) {
      return { configured: false, version: 0, injection: "not_configured" };
    }
    return {
      configured: true,
      version: record.currentVersion,
      versionCount: record.versions.length,
      depth: current.depth,
      frequency: current.frequency,
      noteChars: current.note.length,
      injection: `depth ${current.depth}, every ${current.frequency} companion turn(s)`,
    };
  }

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
    // Conversation scope is the authenticated human SEAT inside the exact
    // match binding — not one credential. A seat re-authenticating with a
    // fresh recovery-derived credential (page reload, new device) resumes
    // its own conversation; every credential is verified against the room
    // runtime on every operation and the creating credential's principal
    // scope hash stays recorded in the binding for audit.
    if (binding.roomId !== authenticated.binding.roomId
      || binding.seatKey !== authenticated.binding.seatKey) {
      return { rejection: rejection("COMPANION_CONVERSATION_SCOPE_MISMATCH") };
    }
    if (binding.matchBindingHash !== authenticated.binding.matchBindingHash) {
      return { rejection: rejection("COMPANION_MATCH_BINDING_STALE") };
    }
    const state = await backend.sessionRuntime.getSessionState(conversationId);
    const userLabel = await resolveUserLabel(binding);
    return { ...authenticated, conversationId, binding, state, userLabel };
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
      // The seat's current persona names the human participant (versioned
      // user-persona binding, Slice 266d); the fallback stays "Player".
      const userLabel = await resolveUserLabel(authenticated.binding);
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
            label: userLabel,
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
      return publicConversation(binding, state, {}, userLabel);
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
      }, await resolveUserLabel(active.binding));
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
        }, await resolveUserLabel(active.binding));
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
        authorsNote: authorsNoteProjection(await loadAuthorsNoteRecord(loaded.conversationId)),
      }, loaded.userLabel);
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
    // Deterministic worldbook merge (Slice 266d): the companion's own
    // persisted entries (primary scope) plus character-tier entries derived
    // from the sealed package, the persona-tier entry derived from the seat's
    // current persona, product-level global entries, and the persisted
    // chat-tier entries; the conversation-shared memory scope overlays its
    // rolling summary / episodic facts / relationship state. Trigger
    // recursion is bounded (product default depth 2).
    const { personaKey, record: personaRecord } = await loadPersonaRecord(loaded.binding);
    const personaEntry = personaWorldbookEntry(personaKey, personaRecord);
    const contextAssembly = await backend.memoryEngine.assembleContext(memoryScope, {
      scanText,
      tokenBudget: Number.isSafeInteger(Number(options.contextTokenBudget))
        ? Number(options.contextTokenBudget)
        : 6_144,
      transcriptTail: 1,
      maxRecursionDepth: worldbookRecursionDepth,
      additionalScopes: [
        chatWorldbookScope(loaded.conversationId),
        loaded.state.memoryScope,
      ],
      extraEntries: [
        ...characterWorldbookEntries(pkg),
        ...(personaEntry ? [personaEntry] : []),
        ...globalWorldbookEntries,
      ],
    });
    const requestId = `companion-${loaded.conversationId}-${loaded.state.turnCounter + 1}`;
    const systemContent = systemPrompt(pkg, loaded.binding, companion.eraId,
      loaded.state.participants);
    const messages = [
      { role: "system", content: systemContent },
      { role: "system", content: contextMessage(contextAssembly, roomContext) },
      ...transcriptMessages(loaded.state, participant.participantId),
    ];
    // Slice 266f.9: the sealed package's formal author-note material is
    // injected as its own labelled system layer directly behind the persona
    // system prompt (deterministic; provenance-recorded). It is static
    // package-sealed role configuration — distinct from the conversation
    // Author's Note below, which is user-configured and depth/frequency-gated.
    let packageAuthorsNoteInjected = null;
    const packageAuthorNote = packageAuthorNoteOf(pkg);
    if (packageAuthorNote) {
      const noteText = `${packageAuthorNote.note}${String(packageAuthorNote.noteZh || "").trim()
        ? ` ${packageAuthorNote.noteZh}` : ""}`;
      const position = Math.min(2, messages.length);
      messages.splice(position, 0, {
        role: "system",
        content: `Companion author note (sealed package ${pkg.packageId} v${pkg.version}; ${packageAuthorNote.authoringClass}): ${noteText}`,
      });
      packageAuthorsNoteInjected = {
        packageId: pkg.packageId,
        version: pkg.version,
        authoringClass: String(packageAuthorNote.authoringClass || "project_d_role_configuration"),
        noteHash: hashStarcraftTmgContract({
          note: packageAuthorNote.note,
          noteZh: String(packageAuthorNote.noteZh || ""),
        }),
        depth: packageAuthorNote.depth,
        frequency: packageAuthorNote.frequency,
        position,
        layerKind: "static_package_sealed_role_configuration",
        separation: "sealed package formal author note — distinct from the user-configured conversation author's note",
      };
    }
    // Author's Note depth/frequency injection (Slice 266d): the note is
    // inserted as a system message `depth` messages above the tail (never
    // above the two leading system messages) every `frequency` companion
    // turns. Fully deterministic from persisted state; no note is ever
    // invented.
    let authorsNoteInjected = null;
    const authorsNoteRecord = await loadAuthorsNoteRecord(loaded.conversationId);
    const authorsNote = currentAuthorsNote(authorsNoteRecord);
    if (authorsNote && authorsNote.note.trim()) {
      const turnIndex = loaded.state.turnCounter + 1;
      if (turnIndex % authorsNote.frequency === 0) {
        const position = Math.max(2, messages.length - authorsNote.depth);
        messages.splice(position, 0, {
          role: "system",
          content: `Author's note (depth ${authorsNote.depth}, frequency ${authorsNote.frequency}): ${authorsNote.note}`,
        });
        authorsNoteInjected = {
          version: authorsNoteRecord.currentVersion,
          depth: authorsNote.depth,
          frequency: authorsNote.frequency,
          position,
        };
      }
    }
    const completed = await backend.providerGateway.complete({
      requestId,
      companionRef: companion.packageRef,
      messages,
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
        authorsNoteInjected: clone(authorsNoteInjected),
        roomMutationAuthority: false,
      },
    });
    if (!completed?.ok) return completed;
    // Attach the deterministic assembly provenance so the product can
    // project exactly which worldbook entries fired (scope tier, matched
    // triggers, recursion depth) and whether the author's note injected.
    const firedWorldbook = contextAssembly.sections
      .filter((section) => section.layer === "worldbook")
      .map((section) => ({
        entryId: section.itemId.replace(/^worldbook:/u, ""),
        scopeTier: section.scopeTier,
        firedAtDepth: section.firedAtDepth,
        matchedBy: clone(section.matchedBy),
        tokens: section.tokens,
        truncated: section.truncated === true,
      }));
    const personaProfile = personaProfileOf(pkg);
    const sessionMemoryLayers = [...new Set(contextAssembly.sections
      .map((section) => section.layer)
      .filter((layer) => ["rolling_summary", "episodic_facts",
        "relationship_state", "durable_memory"].includes(layer)))];
    return deepFreeze({
      ...clone(completed),
      contextAssembly: {
        assemblyHash: contextAssembly.assemblyHash,
        tokensUsed: contextAssembly.tokensUsed,
        tokensRemaining: contextAssembly.tokensRemaining,
        worldbookFired: firedWorldbook,
        layersIncluded: [...new Set(contextAssembly.sections.map((section) => section.layer))],
        omissions: contextAssembly.omissions.length,
      },
      authorsNoteInjected: clone(authorsNoteInjected),
      // Slice 266f.9: exact prompt-layer provenance per reply. Static
      // canon/lore (package character-tier + product-global worldbook +
      // immutable canon) is never conflated with session long-term memory
      // (rolling summary / episodic facts / relationship state / approved
      // durable memory + chat/persona-tier worldbook).
      promptLayers: {
        systemPersona: {
          packageId: pkg.packageId,
          version: pkg.version,
          eraId: companion.eraId,
          systemPromptHash: hashStarcraftTmgContract(systemContent),
          personaProfile: personaProfile
            ? {
              present: true,
              authoringClass: String(personaProfile.authoringClass || "project_d_role_configuration"),
              profileHash: hashStarcraftTmgContract(personaProfile),
              styleExamples: Array.isArray(personaProfile.styleExamples)
                ? personaProfile.styleExamples.length : 0,
              doctrineHints: Array.isArray(personaProfile.doctrineHints)
                ? personaProfile.doctrineHints.length : 0,
            }
            : { present: false },
          otherCompanionLabels: loaded.state.participants
            .filter((entry) => entry.kind === "companion"
              && entry.participantId !== participant.participantId)
            .map((entry) => String(entry.label)),
        },
        packageAuthorsNote: clone(packageAuthorsNoteInjected),
        conversationAuthorsNote: clone(authorsNoteInjected),
        staticCanonLore: {
          canonSections: contextAssembly.sections
            .filter((section) => section.layer === "canon")
            .map((section) => section.itemId),
          worldbookStaticTiers: firedWorldbook
            .filter((entry) => ["character", "global"].includes(entry.scopeTier))
            .map((entry) => ({ entryId: entry.entryId, scopeTier: entry.scopeTier })),
        },
        sessionLongTermMemory: {
          layers: sessionMemoryLayers,
          worldbookSessionTiers: firedWorldbook
            .filter((entry) => ["chat", "persona"].includes(entry.scopeTier))
            .map((entry) => ({ entryId: entry.entryId, scopeTier: entry.scopeTier })),
        },
        layerSeparation: "static canon/lore (package character-tier + product-global worldbook + immutable canon) is never conflated with session long-term memory (rolling summary / episodic facts / relationship state / approved durable memory + chat/persona-tier worldbook)",
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
        contextAssembly: clone(completed.contextAssembly),
        authorsNoteInjected: clone(completed.authorsNoteInjected),
        promptLayers: clone(completed.promptLayers),
      });
    }
    const state = await backend.sessionRuntime.getSessionState(loaded.conversationId);
    return publicConversation(loaded.binding, state, {
      replies,
      providerAccounting: backend.providerGateway.stats(),
      authorsNote: authorsNoteProjection(await loadAuthorsNoteRecord(loaded.conversationId)),
    }, loaded.userLabel);
  }

  async function sendMessage(input = {}) {
    let conversationId;
    try {
      conversationId = requiredString(input.conversationId, "conversationId", 160);
      return await serialize(conversationId, async () => {
        let loaded = await loadBound(input);
        if (loaded.rejection) return loaded.rejection;
        const content = requiredString(input.content, "content", MAX_USER_MESSAGE_CHARS);
        // An empty mentions list is equivalent to no mentions; only a
        // non-empty list goes through the bounded 1..6 validation.
        const mentions = input.mentions === undefined
          || (Array.isArray(input.mentions) && input.mentions.length === 0)
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
      return publicConversation(loaded.binding, state, {
        resumed: true,
        authorsNote: authorsNoteProjection(await loadAuthorsNoteRecord(loaded.conversationId)),
      }, loaded.userLabel);
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
      return publicConversation(loaded.binding, state, {}, loaded.userLabel);
    } catch (error) {
      return rejection(error?.code || "COMPANION_CLOSE_FAILED");
    }
  }

  // ── Slice 266d: versioned user-persona binding to the authenticated seat ──

  function personaProjection(binding, record) {
    const persona = currentPersona(record);
    return deepFreeze({
      ok: true,
      schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.persona`,
      boundSeat: binding.seatKey,
      configured: Boolean(persona),
      displayName: persona?.displayName || null,
      description: persona?.description || null,
      currentVersion: record?.currentVersion || 0,
      versionCount: record?.versions?.length || 0,
      versions: (record?.versions || []).map((entry) => ({
        version: entry.version,
        displayName: entry.displayName,
        note: entry.note || "",
      })),
      versionBound: MAX_PERSONA_VERSIONS,
      worldbookTier: "persona (derived deterministically at request time; never a stale persisted entry)",
      speakerLabel: "names the human participant in this seat's conversations",
      trainingTruth: false,
    });
  }

  async function readUserPersona(input = {}) {
    try {
      const authenticated = await authority(input);
      if (authenticated.rejection) return authenticated.rejection;
      const { record } = await loadPersonaRecord(authenticated.binding);
      return personaProjection(authenticated.binding, record);
    } catch (error) {
      return rejection(error?.code || "COMPANION_PERSONA_READ_FAILED");
    }
  }

  async function putUserPersona(input = {}) {
    try {
      const authenticated = await authority(input);
      if (authenticated.rejection) return authenticated.rejection;
      const displayName = requiredString(input.displayName, "displayName", MAX_PERSONA_NAME_CHARS);
      const description = String(input.description ?? "");
      if (description.length > MAX_PERSONA_DESCRIPTION_CHARS) {
        return rejection("COMPANION_PERSONA_INPUT_INVALID", { field: "description" });
      }
      assertPortablePayload({ displayName, description, note: input.note }, "persona");
      const { personaKey, record } = await loadPersonaRecord(authenticated.binding);
      const versions = record ? clone(record.versions) : [];
      if (versions.length >= MAX_PERSONA_VERSIONS) {
        return rejection("COMPANION_PERSONA_VERSION_LIMIT", { versionBound: MAX_PERSONA_VERSIONS });
      }
      const nextVersion = (record?.currentVersion || 0) + 1;
      versions.push({
        version: nextVersion,
        displayName,
        description,
        note: String(input.note || "").slice(0, 200),
        recordedAt: new Date(now()).toISOString(),
      });
      const next = {
        schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.persona-record`,
        personaKey,
        roomId: authenticated.binding.roomId,
        seatKey: authenticated.binding.seatKey,
        matchBindingHash: authenticated.binding.matchBindingHash,
        currentVersion: nextVersion,
        versions,
        createdAt: record?.createdAt || new Date(now()).toISOString(),
        updatedAt: new Date(now()).toISOString(),
        trainingTruth: false,
      };
      await backend.persistenceGateway.put(PERSONA_NAMESPACE, personaKey, next);
      return personaProjection(authenticated.binding, next);
    } catch (error) {
      return rejection(error?.code || "COMPANION_PERSONA_WRITE_FAILED");
    }
  }

  // Rollback is append-only: restoring an older persona writes a NEW current
  // version copying the target content; no version is ever overwritten.
  async function rollbackUserPersona(input = {}) {
    try {
      const authenticated = await authority(input);
      if (authenticated.rejection) return authenticated.rejection;
      const targetVersion = Number(input.version);
      if (!Number.isSafeInteger(targetVersion) || targetVersion < 1) {
        return rejection("COMPANION_PERSONA_INPUT_INVALID", { field: "version" });
      }
      const { personaKey, record } = await loadPersonaRecord(authenticated.binding);
      const target = record?.versions?.find((entry) => entry.version === targetVersion);
      if (!record || !target) {
        return rejection("COMPANION_PERSONA_VERSION_NOT_FOUND", { version: targetVersion });
      }
      return putUserPersona({
        ...input,
        displayName: target.displayName,
        description: target.description,
        note: String(input.note || `rolled back from persona v${targetVersion}`),
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_PERSONA_ROLLBACK_FAILED");
    }
  }

  // ── Slice 266d: deterministic worldbook triggers across four scope tiers ──

  function worldbookEntryProjection(entry) {
    return {
      entryId: entry.entryId,
      label: entry.label,
      scopeTier: entry.scope || "character",
      triggers: entry.triggers.map((trigger) => trigger.kind === "keyword"
        ? `keyword:${trigger.keywords.join("|")}`
        : trigger.kind === "regex"
          ? `regex:${trigger.pattern}`
          : "always"),
      priority: entry.priority,
      tokenBudget: entry.tokenBudget,
      enabled: entry.enabled !== false,
      provenance: {
        sourceKind: entry.provenance?.sourceKind || null,
        author: entry.provenance?.author || null,
        sourceRefs: clone(entry.provenance?.sourceRefs) || [],
      },
      contentPreview: String(entry.content || "").slice(0, 120),
    };
  }

  async function readWorldbook(input = {}) {
    try {
      const loaded = await loadBound(input);
      if (loaded.rejection) return loaded.rejection;
      const chatEntries = await backend.memoryEngine.listWorldbookEntries(
        chatWorldbookScope(loaded.conversationId));
      const characterEntries = [];
      for (const companion of loaded.binding.companions) {
        const packageResult = backend.registry.resolve({
          packageId: companion.packageRef.id,
          version: companion.packageRef.version,
        });
        if (packageResult.ok) characterEntries.push(...characterWorldbookEntries(packageResult.package));
      }
      const { personaKey, record: personaRecord } = await loadPersonaRecord(loaded.binding);
      const personaEntry = personaWorldbookEntry(personaKey, personaRecord);
      const merged = [
        ...chatEntries.map((entry) => worldbookEntryProjection(entry)),
        ...characterEntries.map((entry) => worldbookEntryProjection(entry)),
        ...(personaEntry ? [worldbookEntryProjection(personaEntry)] : []),
        ...globalWorldbookEntries.map((entry) => worldbookEntryProjection(entry)),
      ];
      return deepFreeze({
        ok: true,
        schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.worldbook`,
        conversationId: loaded.conversationId,
        scopeTiers: ["chat", "persona", "character", "global"],
        insertionOrder: "priority desc → scope tier (chat > persona > character > global) → entryId → entryHash",
        triggerKinds: ["always", "keyword", "regex"],
        recursion: { maxDepth: worldbookRecursionDepth, bounded: true, engineMaximum: 4 },
        entries: merged,
        entryCount: merged.length,
        trainingTruth: false,
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_WORLDBOOK_READ_FAILED");
    }
  }

  async function registerChatWorldbookEntry(input = {}) {
    try {
      const loaded = await loadBound(input);
      if (loaded.rejection) return loaded.rejection;
      const scope = chatWorldbookScope(loaded.conversationId);
      const existing = await backend.memoryEngine.listWorldbookEntries(scope);
      if (existing.length >= MAX_CHAT_WORLDBOOK_ENTRIES) {
        return rejection("COMPANION_WORLDBOOK_ENTRY_LIMIT", { bound: MAX_CHAT_WORLDBOOK_ENTRIES });
      }
      const raw = object(input.entry) ? input.entry : {};
      const entry = createWorldbookEntry({
        ...clone(raw),
        scope: "chat",
        provenance: object(raw.provenance)
          ? clone(raw.provenance)
          : {
            sourceKind: "platform_original",
            author: "authenticated_seat_user",
            license: "user_owned_content",
            sourceRefs: [`conversation://${loaded.conversationId}/chat-worldbook`],
            notes: "User-authored chat-tier worldbook entry.",
          },
        sourceReceipts: Array.isArray(raw.sourceReceipts) && raw.sourceReceipts.length
          ? clone(raw.sourceReceipts)
          : [{
            receiptId: `chat-worldbook-${String(raw.entryId || "entry")}`,
            sourceRef: `conversation://${loaded.conversationId}/chat-worldbook`,
          }],
      });
      const registered = await backend.memoryEngine.registerWorldbookEntry(scope, entry);
      return deepFreeze({
        ok: true,
        schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.worldbook-registered`,
        conversationId: loaded.conversationId,
        registered: clone(registered),
        entry: worldbookEntryProjection(entry),
        trainingTruth: false,
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_WORLDBOOK_REGISTER_FAILED");
    }
  }

  // ── Slice 266d: layered persistent memory operations ──

  async function readMemory(input = {}) {
    try {
      const loaded = await loadBound(input);
      if (loaded.rejection) return loaded.rejection;
      const groupScope = loaded.state.memoryScope;
      const transcript = await backend.memoryEngine.readTranscript(groupScope, { limit: 32 });
      const summary = await backend.memoryEngine.readRollingSummary(groupScope);
      const summaryVersions = await backend.memoryEngine.listRollingSummaryVersions(groupScope);
      const episodicFacts = await backend.memoryEngine.listEpisodicFacts(groupScope);
      const relationship = await backend.memoryEngine.getRelationshipState(groupScope);
      const chatEntries = await backend.memoryEngine.listWorldbookEntries(
        chatWorldbookScope(loaded.conversationId));
      return deepFreeze({
        ok: true,
        schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.memory`,
        conversationId: loaded.conversationId,
        layers: {
          transcript: {
            entries: clone(transcript),
            persistedAppendOnly: true,
          },
          rollingSummary: summary.found ? clone(summary.value) : null,
          rollingSummaryHonesty: summary.found ? "persisted" : "not_written_yet_never_fabricated",
          rollingSummaryVersions: summaryVersions.map((entry) => ({
            summaryVersion: entry.summaryVersion,
            coversTranscriptThrough: entry.coversTranscriptThrough,
            note: entry.note || "",
          })),
          rollingSummaryRollback: "append_only_new_current_version_never_overwrites",
          episodicFacts: clone(episodicFacts),
          relationshipState: clone(relationship),
          relationshipHonesty: "unknown_is_first_class_never_zero_filled; typed observed events only",
          chatWorldbookEntries: chatEntries.map((entry) => worldbookEntryProjection(entry)),
        },
        contextBudgetPolicy: "companion_context_budget_policy_v1 (omissions and unknowns disclosed)",
        hiddenChainOfThought: "not_collected",
        trainingTruth: false,
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_MEMORY_READ_FAILED");
    }
  }

  async function writeConversationSummary(input = {}) {
    try {
      const loaded = await loadBound(input);
      if (loaded.rejection) return loaded.rejection;
      const content = requiredString(input.content, "content", MAX_USER_MESSAGE_CHARS);
      const written = await serialize(loaded.conversationId, () =>
        backend.memoryEngine.writeRollingSummary(loaded.state.memoryScope, {
          content,
          ...(input.coversTranscriptThrough !== undefined
            ? { coversTranscriptThrough: Number(input.coversTranscriptThrough) }
            : { coversTranscriptThrough: loaded.state.turnCounter }),
          note: String(input.note || "user-edited summary"),
        }));
      return deepFreeze({
        ok: true,
        schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.memory-write`,
        conversationId: loaded.conversationId,
        written: clone(written),
        editable: "every edit writes a new immutable version",
        rollbackSafe: true,
        trainingTruth: false,
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_SUMMARY_WRITE_FAILED");
    }
  }

  async function rollbackConversationSummary(input = {}) {
    try {
      const loaded = await loadBound(input);
      if (loaded.rejection) return loaded.rejection;
      const summaryVersion = Number(input.summaryVersion);
      if (!Number.isSafeInteger(summaryVersion) || summaryVersion < 1) {
        return rejection("COMPANION_MEMORY_INPUT_INVALID", { field: "summaryVersion" });
      }
      const rolled = await serialize(loaded.conversationId, () =>
        backend.memoryEngine.rollbackRollingSummary(loaded.state.memoryScope, summaryVersion, {
          note: String(input.note || `user rollback to summary v${summaryVersion}`),
        }));
      return deepFreeze({
        ok: true,
        schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.memory-write`,
        conversationId: loaded.conversationId,
        rolledBack: clone(rolled),
        trainingTruth: false,
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_SUMMARY_ROLLBACK_FAILED");
    }
  }

  async function addConversationEpisodicFact(input = {}) {
    try {
      const loaded = await loadBound(input);
      if (loaded.rejection) return loaded.rejection;
      const content = requiredString(input.content, "content", MAX_USER_MESSAGE_CHARS);
      const factType = ["observation", "user_statement", "companion_statement"]
        .includes(String(input.factType || "")) ? String(input.factType) : "user_statement";
      const added = await serialize(loaded.conversationId, () =>
        backend.memoryEngine.addEpisodicFact(loaded.state.memoryScope, {
          content,
          factType,
          provenance: {
            sourceKind: "platform_original",
            author: "authenticated_seat_user",
            license: "user_owned_content",
            sourceRefs: [`conversation://${loaded.conversationId}/episodic`],
            notes: "User-recorded episodic fact.",
          },
        }));
      return deepFreeze({
        ok: true,
        schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.memory-write`,
        conversationId: loaded.conversationId,
        added: clone(added),
        trainingTruth: false,
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_EPISODIC_WRITE_FAILED");
    }
  }

  async function applyConversationRelationshipEvent(input = {}) {
    try {
      const loaded = await loadBound(input);
      if (loaded.rejection) return loaded.rejection;
      const eventType = requiredString(input.eventType, "eventType", 64);
      if (!Array.isArray(input.deltas) || !input.deltas.length) {
        return rejection("COMPANION_RELATIONSHIP_INPUT_INVALID", { field: "deltas" });
      }
      const applied = await serialize(loaded.conversationId, () =>
        backend.memoryEngine.applyRelationshipEvent(loaded.state.memoryScope, {
          eventType,
          visibility: "player_visible",
          observed: {
            source: "observed_event",
            observedBy: `seat:${loaded.binding.seatKey}`,
          },
          deltas: clone(input.deltas),
          note: String(input.note || ""),
        }));
      return deepFreeze({
        ok: true,
        schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.memory-write`,
        conversationId: loaded.conversationId,
        applied: clone(applied),
        opponentPrivateInference: "not_performed",
        trainingTruth: false,
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_RELATIONSHIP_WRITE_FAILED");
    }
  }

  // ── Slice 266d: swipe / reroll / edit-as-branch with lineage ──

  async function listConversationBranches(input = {}) {
    try {
      const loaded = await loadBound(input);
      if (loaded.rejection) return loaded.rejection;
      const branches = await backend.sessionRuntime.listBranches(loaded.conversationId);
      return deepFreeze({
        ok: true,
        schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.branches`,
        conversationId: loaded.conversationId,
        branches: clone(branches),
        lineage: "accepted branch entries append NEW turns sourced from the branch; accepted history is never overwritten",
        trainingTruth: false,
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_BRANCH_LIST_FAILED");
    }
  }

  async function openConversationBranch(input = {}) {
    try {
      const loaded = await loadBound(input);
      if (loaded.rejection) return loaded.rejection;
      const kind = requiredString(input.kind, "kind", 32);
      if (!["swipe", "regenerate", "edit"].includes(kind)) {
        return rejection("COMPANION_BRANCH_KIND_INVALID", { kind });
      }
      const baseTurnSequence = input.baseTurnSequence === undefined
        ? loaded.state.turnCounter
        : Number(input.baseTurnSequence);
      if (!Number.isSafeInteger(baseTurnSequence)
        || baseTurnSequence < 1
        || baseTurnSequence > loaded.state.turnCounter) {
        return rejection("COMPANION_BRANCH_BASE_INVALID", {
          baseTurnSequence,
          turnCounter: loaded.state.turnCounter,
        });
      }
      const baseTurn = loaded.state.acceptedTurns[baseTurnSequence - 1];
      const baseParticipant = loaded.state.participants
        .find((entry) => entry.participantId === baseTurn.ownerParticipantId);
      if (kind === "edit") {
        if (baseTurn.ownerParticipantId !== loaded.binding.userParticipantId) {
          return rejection("COMPANION_BRANCH_EDIT_REQUIRES_OWN_USER_TURN", {
            baseTurnSequence,
            owner: baseTurn.ownerParticipantId,
          });
        }
      } else if (baseParticipant?.kind !== "companion") {
        return rejection("COMPANION_BRANCH_SWIPE_REQUIRES_COMPANION_TURN", {
          baseTurnSequence,
          owner: baseTurn.ownerParticipantId,
        });
      }
      const opened = await serialize(loaded.conversationId, () =>
        backend.sessionRuntime.openBranch(loaded.conversationId, {
          kind,
          participantId: baseTurn.ownerParticipantId,
          baseTurnSequence,
          note: String(input.note || ""),
        }));
      return deepFreeze({
        ok: true,
        schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.branch-opened`,
        conversationId: loaded.conversationId,
        branch: clone(opened.branch),
        trainingTruth: false,
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_BRANCH_OPEN_FAILED");
    }
  }

  // Reroll: the provider generates one alternative entry for the branch owner
  // (swipe / regenerate). No entry is ever fabricated without a provider
  // completion; an outage surfaces the same explicit rejection as a live turn.
  async function rerollConversationBranch(input = {}) {
    try {
      const conversationId = requiredString(input.conversationId, "conversationId", 160);
      return await serialize(conversationId, async () => {
        const loaded = await loadBound(input);
        if (loaded.rejection) return loaded.rejection;
        const branchId = requiredString(input.branchId, "branchId", 64);
        const branch = loaded.state.branches[branchId];
        if (!branch) return rejection("BRANCH_NOT_FOUND", { branchId });
        if (branch.status !== "open") return rejection("BRANCH_CLOSED", { branchId, status: branch.status });
        if (branch.kind === "edit") {
          return rejection("COMPANION_BRANCH_REROLL_REQUIRES_SWIPE_OR_REGENERATE", { branchId, kind: branch.kind });
        }
        const participant = loaded.state.participants
          .find((entry) => entry.participantId === branch.ownerParticipantId);
        if (!participant || participant.kind !== "companion") {
          return rejection("COMPANION_TURN_OWNER_INVALID", { participantId: branch.ownerParticipantId });
        }
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
        const lastUserTurn = [...loaded.state.acceptedTurns].reverse()
          .find((turn) => turn.ownerParticipantId === loaded.binding.userParticipantId);
        const completed = await providerReply(
          loaded,
          participant,
          lastUserTurn?.content || "",
          {
            room: roomResult.projection.room,
            viewer: roomResult.projection.viewer,
            matchBinding: roomResult.projection.matchBinding,
            state: roomResult.projection.state,
            workbench: workbenchResult.snapshot,
            visibility: "player_visible",
          },
        );
        if (!completed.ok) {
          return rejection(completed.reason || "COMPANION_PROVIDER_REJECTED", {
            conversationId: loaded.conversationId,
            acceptedHistoryPreserved: true,
            retryPolicy: "explicit_retry_only_never_automatic",
            provider: clone(completed),
          });
        }
        const submitted = await backend.sessionRuntime.submitBranchEntry(
          loaded.conversationId,
          branchId,
          {
            participantId: branch.ownerParticipantId,
            content: completed.response.content,
            mentions: [],
            receipts: [safeProviderReceipt(completed.receipt)],
          },
        );
        return deepFreeze({
          ok: true,
          schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.branch-entry`,
          conversationId: loaded.conversationId,
          branchId,
          entry: clone(submitted.entry),
          contextAssembly: clone(completed.contextAssembly),
          promptLayers: clone(completed.promptLayers),
          providerReceipt: safeProviderReceipt(completed.receipt),
          trainingTruth: false,
        });
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_BRANCH_REROLL_FAILED");
    }
  }

  // Edit-as-branch: the user supplies the edited content for their own turn.
  async function submitConversationBranchEdit(input = {}) {
    try {
      const conversationId = requiredString(input.conversationId, "conversationId", 160);
      return await serialize(conversationId, async () => {
        const loaded = await loadBound(input);
        if (loaded.rejection) return loaded.rejection;
        const branchId = requiredString(input.branchId, "branchId", 64);
        const branch = loaded.state.branches[branchId];
        if (!branch) return rejection("BRANCH_NOT_FOUND", { branchId });
        if (branch.status !== "open") return rejection("BRANCH_CLOSED", { branchId, status: branch.status });
        if (branch.kind !== "edit") {
          return rejection("COMPANION_BRANCH_EDIT_REQUIRES_EDIT_BRANCH", { branchId, kind: branch.kind });
        }
        if (branch.ownerParticipantId !== loaded.binding.userParticipantId) {
          return rejection("COMPANION_BRANCH_EDIT_REQUIRES_OWN_USER_TURN", { branchId });
        }
        const content = requiredString(input.content, "content", MAX_USER_MESSAGE_CHARS);
        const submitted = await backend.sessionRuntime.submitBranchEntry(
          loaded.conversationId,
          branchId,
          {
            participantId: loaded.binding.userParticipantId,
            content,
            mentions: [],
            receipts: [{
              receiptId: `user-edit-${branchId}`,
              sourceRef: `room://${loaded.binding.roomId}/seat/${loaded.binding.seatKey}`,
            }],
          },
        );
        return deepFreeze({
          ok: true,
          schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.branch-entry`,
          conversationId: loaded.conversationId,
          branchId,
          entry: clone(submitted.entry),
          trainingTruth: false,
        });
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_BRANCH_EDIT_FAILED");
    }
  }

  // Accepting a branch entry appends a NEW accepted turn sourced from the
  // branch; the original turn and the hash chain are never overwritten.
  async function acceptConversationBranch(input = {}) {
    try {
      const conversationId = requiredString(input.conversationId, "conversationId", 160);
      return await serialize(conversationId, async () => {
        const loaded = await loadBound(input);
        if (loaded.rejection) return loaded.rejection;
        const branchId = requiredString(input.branchId, "branchId", 64);
        const entryId = requiredString(input.entryId, "entryId", 128);
        const accepted = await backend.sessionRuntime.acceptBranchEntry(
          loaded.conversationId,
          branchId,
          entryId,
          { expectedTurnSequence: loaded.state.turnCounter + 1 },
        );
        const state = await backend.sessionRuntime.getSessionState(loaded.conversationId);
        return publicConversation(loaded.binding, state, {
          acceptedBranch: {
            branchId,
            entryId,
            appendedTurn: clone(accepted.turn),
            lineage: "appended as a NEW turn; the branch base turn is unchanged and hash-chained",
          },
          providerAccounting: backend.providerGateway.stats(),
        }, loaded.userLabel);
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_BRANCH_ACCEPT_FAILED");
    }
  }

  async function discardConversationBranch(input = {}) {
    try {
      const loaded = await loadBound(input);
      if (loaded.rejection) return loaded.rejection;
      const branchId = requiredString(input.branchId, "branchId", 64);
      const discarded = await serialize(loaded.conversationId, () =>
        backend.sessionRuntime.discardBranch(loaded.conversationId, branchId));
      return deepFreeze({
        ok: true,
        schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.branch-discarded`,
        conversationId: loaded.conversationId,
        discarded: clone(discarded),
        trainingTruth: false,
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_BRANCH_DISCARD_FAILED");
    }
  }

  // ── Slice 266d: Author's Note depth/frequency injection ──

  async function readAuthorsNote(input = {}) {
    try {
      const loaded = await loadBound(input);
      if (loaded.rejection) return loaded.rejection;
      const record = await loadAuthorsNoteRecord(loaded.conversationId);
      const current = currentAuthorsNote(record);
      return deepFreeze({
        ok: true,
        schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.authors-note`,
        conversationId: loaded.conversationId,
        ...authorsNoteProjection(record),
        note: current?.note ?? null,
        bounds: {
          depth: `0..${MAX_AUTHORS_NOTE_DEPTH} (messages above the tail, never above the leading system messages)`,
          frequency: `1..${MAX_AUTHORS_NOTE_FREQUENCY} (every N companion turns)`,
          noteChars: MAX_AUTHORS_NOTE_CHARS,
          versions: MAX_AUTHORS_NOTE_VERSIONS,
        },
        injectionDeterminism: "pure function of persisted conversation state",
        trainingTruth: false,
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_AUTHORS_NOTE_READ_FAILED");
    }
  }

  async function putAuthorsNote(input = {}) {
    try {
      const loaded = await loadBound(input);
      if (loaded.rejection) return loaded.rejection;
      const note = String(input.note ?? "");
      if (note.length > MAX_AUTHORS_NOTE_CHARS) {
        return rejection("COMPANION_AUTHORS_NOTE_INPUT_INVALID", { field: "note" });
      }
      const depth = input.depth === undefined ? 4 : Number(input.depth);
      const frequency = input.frequency === undefined ? 1 : Number(input.frequency);
      if (!Number.isSafeInteger(depth) || depth < 0 || depth > MAX_AUTHORS_NOTE_DEPTH
        || !Number.isSafeInteger(frequency) || frequency < 1 || frequency > MAX_AUTHORS_NOTE_FREQUENCY) {
        return rejection("COMPANION_AUTHORS_NOTE_INPUT_INVALID", { field: "depth/frequency" });
      }
      assertPortablePayload({ note }, "authorsNote");
      const record = await loadAuthorsNoteRecord(loaded.conversationId);
      const versions = record ? clone(record.versions) : [];
      if (versions.length >= MAX_AUTHORS_NOTE_VERSIONS) {
        return rejection("COMPANION_AUTHORS_NOTE_VERSION_LIMIT", { bound: MAX_AUTHORS_NOTE_VERSIONS });
      }
      const nextVersion = (record?.currentVersion || 0) + 1;
      versions.push({
        version: nextVersion,
        note,
        depth,
        frequency,
        recordedAt: new Date(now()).toISOString(),
      });
      const next = {
        schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.authors-note-record`,
        conversationId: loaded.conversationId,
        currentVersion: nextVersion,
        versions,
        createdAt: record?.createdAt || new Date(now()).toISOString(),
        updatedAt: new Date(now()).toISOString(),
        trainingTruth: false,
      };
      await backend.persistenceGateway.put(AUTHORS_NOTE_NAMESPACE, loaded.conversationId, next);
      return deepFreeze({
        ok: true,
        schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.authors-note`,
        conversationId: loaded.conversationId,
        ...authorsNoteProjection(next),
        note,
        trainingTruth: false,
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_AUTHORS_NOTE_WRITE_FAILED");
    }
  }

  // ── Slice 266d: safe import / export / restore ──

  async function exportConversation(input = {}) {
    try {
      const loaded = await loadBound(input);
      if (loaded.rejection) return loaded.rejection;
      const groupScope = loaded.state.memoryScope;
      const sessionExport = JSON.parse(
        await backend.sessionRuntime.exportSession(loaded.conversationId));
      const authorsNoteRecord = await loadAuthorsNoteRecord(loaded.conversationId);
      const unsigned = {
        schemaVersion: CONVERSATION_EXPORT_SCHEMA,
        version: 1,
        exportedAt: new Date(now()).toISOString(),
        conversationId: loaded.conversationId,
        binding: {
          roomId: loaded.binding.roomId,
          seatKey: loaded.binding.seatKey,
          matchBindingHash: loaded.binding.matchBindingHash,
          mode: loaded.binding.mode,
          userParticipantId: loaded.binding.userParticipantId,
          companions: clone(loaded.binding.companions),
        },
        sessionExport,
        memory: {
          transcript: await backend.memoryEngine.readTranscript(groupScope),
          rollingSummary: (await backend.memoryEngine.readRollingSummary(groupScope)).value ?? null,
          rollingSummaryVersions: await backend.memoryEngine.listRollingSummaryVersions(groupScope),
          episodicFacts: await backend.memoryEngine.listEpisodicFacts(groupScope),
          relationshipState: await backend.memoryEngine.getRelationshipState(groupScope),
        },
        worldbookEntries: await backend.memoryEngine.listWorldbookEntries(
          chatWorldbookScope(loaded.conversationId)),
        authorsNote: currentAuthorsNote(authorsNoteRecord)
          ? clone(currentAuthorsNote(authorsNoteRecord))
          : null,
        checkpointPortability: "session checkpoint snapshots are session-scoped and intentionally not exported; a restored conversation starts without portable checkpoints",
        trainingTruth: false,
      };
      assertPortablePayload(unsigned, "conversationExport");
      const integrity = { algorithm: "sha256", hash: hashStarcraftTmgContract(unsigned) };
      return deepFreeze({
        ok: true,
        schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.export`,
        conversationId: loaded.conversationId,
        export: { ...clone(unsigned), integrity },
        exportHash: integrity.hash,
        credentialsIncluded: false,
        trainingTruth: false,
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_EXPORT_FAILED");
    }
  }

  // Restore is same-seat recovery only: the export's room/seat/match binding
  // must equal the authenticated binding, the schema and integrity hash are
  // re-verified, and restore NEVER overwrites an existing conversation.
  async function restoreConversation(input = {}) {
    try {
      const authenticated = await authority(input);
      if (authenticated.rejection) return authenticated.rejection;
      const payload = object(input.export) ? clone(input.export) : null;
      if (!payload || payload.schemaVersion !== CONVERSATION_EXPORT_SCHEMA) {
        return rejection("COMPANION_IMPORT_SCHEMA_INVALID");
      }
      const { integrity, ...unsigned } = payload;
      if (integrity?.algorithm !== "sha256"
        || integrity.hash !== hashStarcraftTmgContract(unsigned)) {
        return rejection("COMPANION_IMPORT_INTEGRITY_MISMATCH");
      }
      try {
        assertPortablePayload(unsigned, "conversationImport");
      } catch (error) {
        return rejection(error?.code || "COMPANION_IMPORT_FORBIDDEN_CONTENT");
      }
      const binding = object(payload.binding) ? payload.binding : {};
      if (binding.roomId !== authenticated.binding.roomId
        || binding.seatKey !== authenticated.binding.seatKey
        || binding.matchBindingHash !== authenticated.binding.matchBindingHash) {
        return rejection("COMPANION_EXPORT_SCOPE_MISMATCH");
      }
      const conversationId = requiredString(payload.conversationId, "export.conversationId", 160);
      const existing = await backend.persistenceGateway.get(BINDING_NAMESPACE, conversationId);
      if (existing.found) {
        return rejection("COMPANION_CONVERSATION_ALREADY_EXISTS", {
          conversationId,
          restoreSemantics: "restore_never_overwrites",
        });
      }
      const imported = await backend.sessionRuntime.importSession(
        JSON.stringify(payload.sessionExport));
      if (!imported?.ok) return rejection("COMPANION_IMPORT_SESSION_REJECTED");
      const state = await backend.sessionRuntime.getSessionState(conversationId);
      const groupScope = state.memoryScope;
      const memory = object(payload.memory) ? payload.memory : {};
      await backend.memoryEngine.replaceTranscript(groupScope,
        Array.isArray(memory.transcript) ? memory.transcript : []);
      const summaryVersions = Array.isArray(memory.rollingSummaryVersions)
        ? memory.rollingSummaryVersions
        : [];
      for (const version of summaryVersions) {
        await backend.memoryEngine.writeRollingSummary(groupScope, {
          content: String(version.content || " "),
          ...(version.coversTranscriptThrough === null || version.coversTranscriptThrough === undefined
            ? {}
            : { coversTranscriptThrough: Number(version.coversTranscriptThrough) }),
          receipts: Array.isArray(version.receipts) ? version.receipts : [],
          note: String(version.note || "restored summary version"),
        });
      }
      if (!summaryVersions.length && object(memory.rollingSummary) && memory.rollingSummary?.content) {
        await backend.memoryEngine.writeRollingSummary(groupScope, {
          content: String(memory.rollingSummary.content),
          note: "restored summary",
        });
      }
      for (const fact of Array.isArray(memory.episodicFacts) ? memory.episodicFacts : []) {
        await backend.memoryEngine.addEpisodicFact(groupScope, {
          ...(fact.factId ? { factId: String(fact.factId) } : {}),
          content: String(fact.content || " "),
          factType: String(fact.factType || "observation"),
          ...(object(fact.provenance) ? { provenance: fact.provenance } : {}),
        });
      }
      const relationshipState = object(memory.relationshipState) ? memory.relationshipState : {};
      const axisNames = Object.keys(object(relationshipState.axes) ? relationshipState.axes : {});
      if (axisNames.length) {
        await backend.memoryEngine.initializeRelationshipState(groupScope, { axes: axisNames });
      }
      for (const event of Array.isArray(relationshipState.history) ? relationshipState.history : []) {
        await backend.memoryEngine.applyRelationshipEvent(groupScope, {
          ...(event.eventId ? { eventId: String(event.eventId) } : {}),
          eventType: String(event.eventType),
          visibility: "player_visible",
          observed: {
            source: "observed_event",
            observedBy: `restore:${authenticated.binding.seatKey}`,
          },
          deltas: clone(event.deltas) || [],
          note: String(event.note || ""),
        });
      }
      for (const entry of Array.isArray(payload.worldbookEntries) ? payload.worldbookEntries : []) {
        await backend.memoryEngine.registerWorldbookEntry(
          chatWorldbookScope(conversationId), entry);
      }
      if (object(payload.authorsNote) && typeof payload.authorsNote.note === "string") {
        await backend.persistenceGateway.put(AUTHORS_NOTE_NAMESPACE, conversationId, {
          schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.authors-note-record`,
          conversationId,
          currentVersion: 1,
          versions: [{
            version: 1,
            note: payload.authorsNote.note,
            depth: Number(payload.authorsNote.depth) || 4,
            frequency: Number(payload.authorsNote.frequency) || 1,
            recordedAt: new Date(now()).toISOString(),
          }],
          createdAt: new Date(now()).toISOString(),
          updatedAt: new Date(now()).toISOString(),
          trainingTruth: false,
        });
      }
      const restoredBinding = {
        schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.binding`,
        conversationId,
        roomId: authenticated.binding.roomId,
        seatKey: authenticated.binding.seatKey,
        principalScopeHash: authenticated.binding.principalScopeHash,
        matchBindingHash: authenticated.binding.matchBindingHash,
        mode: "companion",
        userParticipantId: String(binding.userParticipantId),
        companions: clone(binding.companions) || [],
        persistence: backend.persistenceGateway.durabilityDeclaration(),
        createdAt: new Date(now()).toISOString(),
        restoredFrom: {
          exportedAt: String(payload.exportedAt || ""),
          exportHash: integrity.hash,
        },
        roomMutationAuthority: false,
        trainingTruth: false,
      };
      await backend.persistenceGateway.put(BINDING_NAMESPACE, conversationId, restoredBinding);
      const restoredState = await backend.sessionRuntime.getSessionState(conversationId);
      return publicConversation(restoredBinding, restoredState, {
        restored: true,
        restoredFrom: clone(restoredBinding.restoredFrom),
      }, await resolveUserLabel(restoredBinding));
    } catch (error) {
      return rejection(error?.code || "COMPANION_RESTORE_FAILED");
    }
  }

  async function exportPackage(input = {}) {
    try {
      const authenticated = await authority(input);
      if (authenticated.rejection) return authenticated.rejection;
      const packageId = requiredString(input.packageId, "packageId", 160);
      let contract;
      try {
        contract = backend.registry.get(packageId);
      } catch (error) {
        return rejection(error?.code || "PACKAGE_NOT_FOUND", { packageId });
      }
      const serialized = JSON.stringify(contract);
      const unsigned = {
        schemaVersion: PACKAGE_EXPORT_SCHEMA,
        packageId,
        version: contract.version,
        exportedAt: new Date(now()).toISOString(),
        contract: clone(contract),
        trainingTruth: false,
      };
      assertPortablePayload(unsigned, "packageExport");
      return deepFreeze({
        ok: true,
        schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.export`,
        export: {
          ...clone(unsigned),
          integrity: { algorithm: "sha256", hash: hashStarcraftTmgContract(unsigned) },
        },
        contractHash: hashStarcraftTmgContract(serialized),
        trainingTruth: false,
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_PACKAGE_EXPORT_FAILED");
    }
  }

  // Character-card import: the sealed package contract is re-validated by the
  // registry itself (schema + integrity); version conflicts fail closed.
  async function importPackage(input = {}) {
    try {
      const authenticated = await authority(input);
      if (authenticated.rejection) return authenticated.rejection;
      const contract = object(input.contract) ? clone(input.contract) : null;
      if (!contract) return rejection("COMPANION_IMPORT_SCHEMA_INVALID", { field: "contract" });
      try {
        assertPortablePayload(contract, "packageImport");
      } catch (error) {
        return rejection(error?.code || "COMPANION_IMPORT_FORBIDDEN_CONTENT");
      }
      const registered = backend.registry.register(contract);
      if (!registered?.ok) {
        return rejection(registered?.reason || "COMPANION_PACKAGE_IMPORT_REJECTED");
      }
      return deepFreeze({
        ok: true,
        schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.import`,
        registered: clone(registered),
        trainingTruth: false,
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_PACKAGE_IMPORT_FAILED");
    }
  }

  // ── Slice 266e: package-to-backend promotion (backend sealing + hash pins) ──

  // Promoting a registered package persists the EXACT sealed backend contract
  // with its sha256 integrity hash as the pin, so any later composition can
  // re-verify the pin and re-register the identical sealed bytes (durable
  // backend sealing). Promotion is idempotent on the same pin, a different
  // pin for the same package fails closed, and a promotion never grants
  // Rules, room-mutation, Provider or memory authority.
  async function promotePackage(input = {}) {
    try {
      const authenticated = await authority(input);
      if (authenticated.rejection) return authenticated.rejection;
      const packageId = requiredString(input.packageId, "packageId", 160);
      let contract;
      try {
        contract = backend.registry.get(packageId);
      } catch (error) {
        return rejection(error?.code || "PACKAGE_NOT_FOUND", { packageId });
      }
      try {
        assertPortablePayload(contract, "packagePromotion");
      } catch (error) {
        return rejection(error?.code || "COMPANION_PACKAGE_PROMOTION_FORBIDDEN_CONTENT");
      }
      const pin = String(contract.integrity?.hash || "");
      if (!/^[0-9a-f]{64}$/u.test(pin)) {
        return rejection("COMPANION_PACKAGE_PROMOTION_PIN_INVALID", { packageId });
      }
      const stored = await backend.persistenceGateway.get(PACKAGE_PROMOTION_NAMESPACE, packageId);
      if (stored?.found) {
        if (String(stored.value?.pin || "") === pin) {
          return deepFreeze({
            ok: true,
            schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.package-promotion`,
            packageId,
            version: String(contract.version),
            pin,
            duplicate: true,
            durable: backend.persistenceGateway.durable === true,
            durability: String(backend.persistenceGateway.durability || ""),
            trainingTruth: false,
          });
        }
        return rejection("COMPANION_PACKAGE_PROMOTION_CONFLICT", {
          packageId,
          pinnedHash: String(stored.value?.pin || ""),
          requestedHash: pin,
        });
      }
      const record = {
        schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.package-promotion-record`,
        packageId,
        version: String(contract.version),
        pin,
        contract: clone(contract),
        promotedAt: new Date(now()).toISOString(),
        promotedBySeat: authenticated.binding.seatKey,
        roomId: authenticated.binding.roomId,
        authority: { canOverrideRules: false, canMutateRoom: false },
        trainingTruth: false,
      };
      await backend.persistenceGateway.put(PACKAGE_PROMOTION_NAMESPACE, packageId, record);
      return deepFreeze({
        ok: true,
        schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.package-promotion`,
        packageId,
        version: String(contract.version),
        pin,
        duplicate: false,
        durable: backend.persistenceGateway.durable === true,
        durability: String(backend.persistenceGateway.durability || ""),
        trainingTruth: false,
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_PACKAGE_PROMOTE_FAILED");
    }
  }

  // Every listed pin is re-derived LIVE from the persisted sealed contract's
  // sha256 integrity and cross-checked against the backend registry; a
  // mismatch is surfaced fail-closed (pinVerified: false + reason), never
  // hidden.
  async function readPackagePromotions(input = {}) {
    try {
      const authenticated = await authority(input);
      if (authenticated.rejection) return authenticated.rejection;
      const keys = await backend.persistenceGateway.list(PACKAGE_PROMOTION_NAMESPACE);
      const promotions = [];
      for (const key of keys) {
        const stored = await backend.persistenceGateway.get(PACKAGE_PROMOTION_NAMESPACE, key);
        if (!stored?.found) continue;
        const record = stored.value;
        let contract = null;
        let pinVerified = false;
        let pinReason = null;
        try {
          contract = importCompanionBackendContract(record?.contract, "companion-package");
          pinVerified = String(record?.pin || "") === String(contract.integrity?.hash || "");
          if (!pinVerified) pinReason = "COMPANION_PACKAGE_PROMOTION_PIN_MISMATCH";
        } catch (error) {
          pinReason = error?.code || "COMPANION_PACKAGE_PROMOTION_RECORD_INVALID";
        }
        let registered = false;
        if (contract && pinVerified) {
          try {
            registered = backend.registry.get(contract.packageId, contract.version)
              .integrity.hash === contract.integrity.hash;
          } catch {
            registered = false;
          }
        }
        promotions.push({
          packageId: String(record?.packageId || key),
          version: String(record?.version || ""),
          pin: String(record?.pin || ""),
          pinVerified,
          ...(pinReason ? { pinReason } : {}),
          registered,
          promotedAt: String(record?.promotedAt || ""),
          promotedBySeat: String(record?.promotedBySeat || ""),
        });
      }
      promotions.sort((left, right) => left.packageId.localeCompare(right.packageId));
      return deepFreeze({
        ok: true,
        schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.package-promotions`,
        promotions,
        verification: "every pin is re-derived live from the persisted sealed contract (sha256 integrity) and cross-checked against the backend registry; mismatch fails closed",
        durable: backend.persistenceGateway.durable === true,
        durability: String(backend.persistenceGateway.durability || ""),
        trainingTruth: false,
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_PACKAGE_PROMOTIONS_READ_FAILED");
    }
  }

  async function exportConversationWorldbook(input = {}) {
    try {
      const loaded = await loadBound(input);
      if (loaded.rejection) return loaded.rejection;
      const entries = await backend.memoryEngine.listWorldbookEntries(
        chatWorldbookScope(loaded.conversationId));
      const unsigned = {
        schemaVersion: WORLDBOOK_EXPORT_SCHEMA,
        conversationId: loaded.conversationId,
        exportedAt: new Date(now()).toISOString(),
        entries: clone(entries),
        trainingTruth: false,
      };
      assertPortablePayload(unsigned, "worldbookExport");
      return deepFreeze({
        ok: true,
        schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.export`,
        conversationId: loaded.conversationId,
        export: {
          ...clone(unsigned),
          integrity: { algorithm: "sha256", hash: hashStarcraftTmgContract(unsigned) },
        },
        entryCount: entries.length,
        trainingTruth: false,
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_WORLDBOOK_EXPORT_FAILED");
    }
  }

  async function importConversationWorldbook(input = {}) {
    try {
      const loaded = await loadBound(input);
      if (loaded.rejection) return loaded.rejection;
      const entries = Array.isArray(input.entries) ? input.entries : null;
      if (!entries || !entries.length) {
        return rejection("COMPANION_IMPORT_SCHEMA_INVALID", { field: "entries" });
      }
      const scope = chatWorldbookScope(loaded.conversationId);
      const existing = await backend.memoryEngine.listWorldbookEntries(scope);
      if (existing.length + entries.length > MAX_CHAT_WORLDBOOK_ENTRIES) {
        return rejection("COMPANION_WORLDBOOK_ENTRY_LIMIT", { bound: MAX_CHAT_WORLDBOOK_ENTRIES });
      }
      const registered = [];
      for (const [index, raw] of entries.entries()) {
        if (!object(raw)) {
          return rejection("COMPANION_IMPORT_SCHEMA_INVALID", { field: `entries[${index}]` });
        }
        let entry;
        if (raw.schemaVersion === WORLDBOOK_ENTRY_SCHEMA) {
          const { entryHash, ...unsignedEntry } = clone(raw);
          if (entryHash !== hashStarcraftTmgContract(unsignedEntry)) {
            return rejection("COMPANION_WORLDBOOK_IMPORT_INTEGRITY_MISMATCH", { entryId: raw.entryId });
          }
          entry = raw;
        } else {
          // Raw entries (e.g. authored in another Tavern-equivalent tool) get
          // the same honest user-authorship defaults as chat registration.
          entry = createWorldbookEntry({
            ...clone(raw),
            scope: "chat",
            provenance: object(raw.provenance)
              ? clone(raw.provenance)
              : {
                sourceKind: "platform_original",
                author: "authenticated_seat_user",
                license: "user_owned_content",
                sourceRefs: [`conversation://${loaded.conversationId}/chat-worldbook-import`],
                notes: "User-imported chat-tier worldbook entry.",
              },
            sourceReceipts: Array.isArray(raw.sourceReceipts) && raw.sourceReceipts.length
              ? clone(raw.sourceReceipts)
              : [{
                receiptId: `chat-worldbook-import-${String(raw.entryId || index)}`,
                sourceRef: `conversation://${loaded.conversationId}/chat-worldbook-import`,
              }],
          });
        }
        try {
          registered.push(clone(await backend.memoryEngine.registerWorldbookEntry(scope, entry)));
        } catch (error) {
          return rejection(error?.code || "COMPANION_WORLDBOOK_IMPORT_REJECTED", { entryId: raw.entryId });
        }
      }
      return deepFreeze({
        ok: true,
        schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.import`,
        conversationId: loaded.conversationId,
        registered,
        trainingTruth: false,
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_WORLDBOOK_IMPORT_FAILED");
    }
  }

  // ── Slice 266d: audit / replay of public companion turns ──

  async function readAuditExport(input = {}) {
    try {
      const authenticated = await authority(input);
      if (authenticated.rejection) return authenticated.rejection;
      return deepFreeze({
        ok: true,
        schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.audit`,
        verify: backend.auditLog.verify(),
        export: JSON.parse(await backend.auditLog.exportAuditLog()),
        scope: "hash-chained persistence/provider/presentation operations of the composed companion backend; values are audited by hash only",
        trainingTruth: false,
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_AUDIT_EXPORT_FAILED");
    }
  }

  async function verifyAuditLive(input = {}) {
    try {
      const authenticated = await authority(input);
      if (authenticated.rejection) return authenticated.rejection;
      return deepFreeze({
        ok: true,
        schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.audit-verify`,
        verify: backend.auditLog.verify(),
        trainingTruth: false,
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_AUDIT_VERIFY_FAILED");
    }
  }

  // Replay candidates are evidence for later WikiSkill/EvoTest evaluation
  // only: never training truth, never an automatic promotion.
  async function buildAuditReplayCandidate(input = {}) {
    try {
      const authenticated = await authority(input);
      if (authenticated.rejection) return authenticated.rejection;
      if (input.promote === true || input.automaticPromotion === true
        || input.promotion === "automatic") {
        return rejection("COMPANION_AUDIT_AUTOMATIC_PROMOTION_FORBIDDEN", {
          promotion: "replay candidates never request automatic Skill or memory promotion",
        });
      }
      const candidate = backend.auditLog.buildReplayCandidate({
        ...(object(input.sessionRef) ? { sessionRef: clone(input.sessionRef) } : {}),
      });
      return deepFreeze({
        ok: true,
        schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.replay-candidate`,
        candidate: clone(candidate),
        trainingTruth: false,
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_REPLAY_CANDIDATE_FAILED");
    }
  }

  // ── Slice 266d: explicit permission surfaces ──

  // The four surfaces are computed LIVE through a probe session in the real
  // session runtime — never a static claim. Opponent-private state is denied
  // on every surface, unknown visibility fails closed, read-only surfaces
  // cannot speak, and no surface holds Preview/Confirm/Apply or Room-mutation
  // authority.
  async function readPermissionSurfaces(input = {}) {
    try {
      const authenticated = await authority(input);
      if (authenticated.rejection) return authenticated.rejection;
      const probeSessionId = `permprobe-${hashStarcraftTmgContract({
        roomId: authenticated.binding.roomId,
        seatKey: authenticated.binding.seatKey,
        matchBindingHash: authenticated.binding.matchBindingHash,
      }).slice(0, 24)}`;
      try {
        await backend.sessionRuntime.createSession({
          sessionId: probeSessionId,
          conversationId: probeSessionId,
          participants: [
            { participantId: "probe-human-a", kind: "user", seat: "player_seat", label: "Human A" },
            { participantId: "probe-human-b", kind: "user", seat: "player_seat", label: "Human B" },
            { participantId: "probe-agent-observer", kind: "agent", seat: "observer", label: "Agent observer" },
            { participantId: "probe-reviewer", kind: "agent", seat: "review", label: "Reviewer" },
          ],
          speakerOrder: ["probe-human-a", "probe-human-b"],
          memoryScope: { companionId: "permission-probe", conversationId: probeSessionId },
        });
      } catch (error) {
        if (error?.code !== "SESSION_ALREADY_EXISTS") throw error;
      }
      async function probeDecision(participantId, resource) {
        try {
          const result = await backend.sessionRuntime.authorizeSessionRead(
            probeSessionId, participantId, resource);
          return {
            resourceId: resource.itemId,
            ok: result.ok === true,
            visibility: result.visibility,
            reason: result.reason,
            failClosed: result.failClosed === true,
          };
        } catch (error) {
          return {
            resourceId: resource.itemId,
            ok: false,
            visibility: String(resource.visibility || "unknown"),
            reason: error?.code || "forbidden_content_fail_closed",
            failClosed: true,
          };
        }
      }
      const participantOf = async (participantId) => {
        const state = await backend.sessionRuntime.getSessionState(probeSessionId);
        const participant = state.participants.find((entry) => entry.participantId === participantId);
        return { seat: participant?.seat || "unknown", canSpeak: participant?.canSpeak === true };
      };
      const resources = {
        playerVisible: { itemId: "player-visible-context", visibility: "player_visible", payload: { note: "public room projection" } },
        sameSeatPlan: { itemId: "same-seat-public-plan", visibility: "same_seat_public_plan", seat: "player_seat", payload: { note: "same-seat public plan" } },
        opponentPrivate: { itemId: "opponent-private-plan", visibility: "opponent_private", payload: { note: "withheld by construction" } },
        smuggledPrivate: { itemId: "smuggled-private-payload", visibility: "player_visible", payload: { opponentPlan: "smuggle attempt" } },
        unknownVisibility: { itemId: "unknown-visibility", visibility: "mystery_tier" },
        observerPublic: { itemId: "observer-public", visibility: "observer_public", payload: { note: "observer surface" } },
        reviewPublic: { itemId: "review-public", visibility: "review_public", payload: { note: "review artifact" } },
      };
      const surfaceAuthority = {
        previewConfirmApplyAuthority: false,
        roomMutationAuthority: false,
        opponentPrivateInference: "not_performed",
      };
      const surfaces = [];
      surfaces.push(deepFreeze({
        surfaceId: "human_vs_agent",
        description: "human player seat with agent companions",
        ...(await participantOf("probe-human-a")),
        decisions: [
          await probeDecision("probe-human-a", resources.playerVisible),
          await probeDecision("probe-human-a", resources.sameSeatPlan),
          await probeDecision("probe-human-a", resources.opponentPrivate),
          await probeDecision("probe-human-a", resources.smuggledPrivate),
          await probeDecision("probe-human-a", resources.unknownVisibility),
        ],
        ...surfaceAuthority,
      }));
      surfaces.push(deepFreeze({
        surfaceId: "human_vs_human",
        description: "second human seat in the same room; cross-seat conversation access is denied by the seat-scoped conversation binding (COMPANION_CONVERSATION_SCOPE_MISMATCH), proven on the live path",
        ...(await participantOf("probe-human-b")),
        decisions: [
          await probeDecision("probe-human-b", resources.playerVisible),
          await probeDecision("probe-human-b", resources.opponentPrivate),
          await probeDecision("probe-human-b", resources.unknownVisibility),
        ],
        conversationIsolation: "seat_scoped_binding_enforced_on_every_operation",
        ...surfaceAuthority,
      }));
      surfaces.push(deepFreeze({
        surfaceId: "agent_vs_agent_observer",
        description: "agent-vs-agent observer seat; defaults to observer_public only and cannot take a speaking turn",
        ...(await participantOf("probe-agent-observer")),
        decisions: [
          await probeDecision("probe-agent-observer", resources.observerPublic),
          await probeDecision("probe-agent-observer", resources.playerVisible),
          await probeDecision("probe-agent-observer", resources.opponentPrivate),
        ],
        ...surfaceAuthority,
      }));
      surfaces.push(deepFreeze({
        surfaceId: "review_mode",
        description: "separate read-only review mode; review-scoped and player-visible artifacts only, never a speaking turn",
        ...(await participantOf("probe-reviewer")),
        decisions: [
          await probeDecision("probe-reviewer", resources.reviewPublic),
          await probeDecision("probe-reviewer", resources.playerVisible),
          await probeDecision("probe-reviewer", resources.opponentPrivate),
          await probeDecision("probe-reviewer", resources.sameSeatPlan),
        ],
        ...surfaceAuthority,
      }));
      return deepFreeze({
        ok: true,
        schemaVersion: `${STARCRAFT_TMG_COMPANION_ROOM_SESSION_SERVICE_VERSION}.permission-surfaces`,
        probeSessionId,
        evaluation: "live decisions through the CB-3 session runtime read policy (fail closed)",
        surfaces,
        previewConfirmApplyAuthority: false,
        roomMutationAuthority: false,
        trainingTruth: false,
      });
    } catch (error) {
      return rejection(error?.code || "COMPANION_PERMISSION_SURFACES_FAILED");
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
        "persona_read",
        "persona_put",
        "persona_rollback",
        "worldbook_read",
        "worldbook_register_chat_entry",
        "memory_read",
        "memory_summary_write",
        "memory_summary_rollback",
        "memory_episodic_add",
        "memory_relationship_event",
        "branches_list",
        "branch_open",
        "branch_reroll",
        "branch_edit_submit",
        "branch_accept",
        "branch_discard",
        "authors_note_read",
        "authors_note_put",
        "conversation_export",
        "conversation_restore",
        "package_export",
        "package_import",
        "package_promote",
        "package_promotions",
        "worldbook_export",
        "worldbook_import",
        "audit_export",
        "audit_verify",
        "audit_replay_candidate",
        "permission_surfaces",
      ],
      maximumCompanions: MAX_COMPANIONS,
      roomBinding: "revalidated_on_every_operation",
      conversationScope: "room_seat_match_binding (credential revalidation per operation; a seat re-authenticating with a fresh credential resumes its own conversation; the creating credential principal scope hash stays recorded for audit)",
      userPersona: "versioned (append-only, 32-version bound), bound to the authenticated seat inside the exact match binding; names the human participant and derives the persona-tier worldbook entry deterministically",
      worldbook: "deterministic triggers (always/keyword/regex) across chat/persona/character/global tiers with bounded recursion (product depth 2, engine maximum 4), insertion priority and per-entry provenance",
      layeredMemory: "transcript (append-only) / rolling summary (versioned, editable, append-only rollback) / episodic facts / typed observed relationship state; context budgeting with disclosed omissions; no hidden chain-of-thought",
      branches: "swipe/reroll/edit-as-branch with lineage; accepting an entry appends a NEW turn and never overwrites accepted history",
      authorsNote: "depth/frequency system-message injection, deterministic from persisted state, versioned (32-version bound)",
      importExportRestore: "schema-validated, integrity-hashed exports of conversations/packages/chat worldbooks; restore is same-seat only and never overwrites; no credentials in either direction",
      packagePromotion: "package-to-backend promotion: the exact sealed backend contract is persisted with its sha256 integrity hash as the pin (idempotent on the same pin, conflict fail-closed); every composition re-verifies each pin and re-registers the identical sealed bytes; no Rules/room/Provider authority is granted",
      audit: "hash-chained deterministic audit log of public companion operations; replay candidates are WikiSkill/EvoTest evidence only, never automatic promotion",
      permissionSurfaces: "human_vs_agent / human_vs_human / agent_vs_agent_observer / review_mode computed live through the CB-3 read policy; opponent-private always denied; no Preview/Confirm/Apply anywhere",
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
    readUserPersona,
    putUserPersona,
    rollbackUserPersona,
    readWorldbook,
    registerChatWorldbookEntry,
    readMemory,
    writeConversationSummary,
    rollbackConversationSummary,
    addConversationEpisodicFact,
    applyConversationRelationshipEvent,
    listConversationBranches,
    openConversationBranch,
    rerollConversationBranch,
    submitConversationBranchEdit,
    acceptConversationBranch,
    discardConversationBranch,
    readAuthorsNote,
    putAuthorsNote,
    exportConversation,
    restoreConversation,
    exportPackage,
    importPackage,
    promotePackage,
    readPackagePromotions,
    exportConversationWorldbook,
    importConversationWorldbook,
    readAuditExport,
    verifyAuditLive,
    buildAuditReplayCandidate,
    readPermissionSurfaces,
  });
}
