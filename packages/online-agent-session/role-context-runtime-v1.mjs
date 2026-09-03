import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import {
  assertStarcraftTmgCharacterContract,
  createGameRoleBinding,
} from "../character-agent/contracts-v1.mjs";
import { getStarcraftTmgModeCapability } from
  "../character-agent/mode-capability-v1.mjs";
import { assembleStarcraftTmgRolePrompt } from
  "../character-agent/prompt-assembly-v1.mjs";
import { createStarcraftTmgWorldbookRegistry } from
  "../character-agent/worldbook-registry-v1.mjs";
import {
  assertStarcraftTmgOnlineMemorySnapshotV1,
  assertStarcraftTmgOnlineRuleSkillSnapshotV1,
  containsStarcraftTmgOnlineContextCredentialMaterialV1,
} from "./role-context-contracts-v1.mjs";

export const STARCRAFT_TMG_ONLINE_ROLE_CONTEXT_RUNTIME_VERSION =
  "starcraft_tmg_online_role_context_runtime_v1";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const SEND_FIELDS = new Set([
  "sessionId",
  "roomId",
  "expectedConnectionEpoch",
  "intent",
  "userMessage",
]);
const READ_FIELDS = new Set([
  "sessionId",
  "roomId",
  "expectedConnectionEpoch",
]);
const MODE_INTENTS = Object.freeze({
  tutor: Object.freeze(["chat", "explain"]),
  opponent: Object.freeze(["chat", "take_turn"]),
  commentator: Object.freeze(["commentate"]),
  companion: Object.freeze(["chat", "reflect"]),
});

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requiredString(value, field, maximum = 240) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new TypeError(`${field} is required`);
  if (normalized.length > maximum) throw new TypeError(`${field} exceeds ${maximum} characters`);
  return normalized;
}

function hash(value, field) {
  const normalized = requiredString(value, field, 64).toLowerCase();
  if (!HASH_PATTERN.test(normalized)) throw new TypeError(`${field} must be a sha256 hash`);
  return normalized;
}

function exactFields(value, allowed, label) {
  if (!object(value)) throw new TypeError(`${label} must be an object`);
  const forbiddenFields = Object.keys(value).filter((field) => !allowed.has(field)).sort();
  if (forbiddenFields.length) {
    throw Object.assign(new TypeError(`${label} contains forbidden fields`), {
      code: "forbidden_context_field",
      forbiddenFields,
    });
  }
}

function seal(value, hashField) {
  const unsigned = clone(value);
  return deepFreeze({ ...unsigned, [hashField]: hashStarcraftTmgContract(unsigned) });
}

function rejection(reason, details = {}) {
  return deepFreeze({
    ok: false,
    schemaVersion: `${STARCRAFT_TMG_ONLINE_ROLE_CONTEXT_RUNTIME_VERSION}.rejection`,
    reason,
    ...clone(details),
    trainingTruth: false,
  });
}

function ref(contract, idField) {
  return deepFreeze({
    id: contract[idField],
    version: contract.version,
    hash: contract.integrity.hash,
  });
}

function node(nodeType, authority, content) {
  return seal({ nodeType, authority, content: clone(content) }, "nodeHash");
}

function normalizeHistoryPolicy(value = {}) {
  const maxEntries = Number(value.maxEntries || 32);
  const maxBytes = Number(value.maxBytes || 128 * 1024);
  if (!Number.isSafeInteger(maxEntries) || maxEntries < 1 || maxEntries > 256) {
    throw new TypeError("historyPolicy.maxEntries is invalid");
  }
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 4_096
    || maxBytes > 2 * 1024 * 1024) {
    throw new TypeError("historyPolicy.maxBytes is invalid");
  }
  return deepFreeze({ maxEntries, maxBytes });
}

function historyProjection(history, policy) {
  return seal({
    schemaVersion: `${STARCRAFT_TMG_ONLINE_ROLE_CONTEXT_RUNTIME_VERSION}.history`,
    entries: clone(history.entries),
    retainedCount: history.entries.length,
    evictedCount: history.evictedCount,
    retainedBytes: Buffer.byteLength(JSON.stringify(history.entries), "utf8"),
    policy,
    durability: "process_memory_bounded_v1",
    eligibleForTraining: false,
    trainingTruth: false,
  }, "historyHash");
}

function appendHistory(history, policy, input) {
  const unsigned = {
    schemaVersion: `${STARCRAFT_TMG_ONLINE_ROLE_CONTEXT_RUNTIME_VERSION}.history-entry`,
    turnId: input.turnId,
    mode: input.mode,
    intent: input.intent,
    user: {
      text: input.userMessage,
      textHash: hashStarcraftTmgContract(input.userMessage),
    },
    assistant: input.output === undefined ? null : clone(input.output),
    outputHash: input.outputHash || null,
    status: input.status,
    failureCode: input.failureCode || null,
    promptReceiptHash: input.promptReceiptHash,
    occurredAt: input.occurredAt,
    eligibleForTraining: false,
    reviewStatus: input.status === "completed" ? "raw" : "rejected",
    trainingTruth: false,
  };
  const entry = seal(unsigned, "entryHash");
  history.entries.push(entry);
  while (history.entries.length > policy.maxEntries
    || Buffer.byteLength(JSON.stringify(history.entries), "utf8") > policy.maxBytes) {
    history.entries.shift();
    history.evictedCount += 1;
  }
  return entry;
}

function normalizeIntent(mode, value) {
  const allowed = MODE_INTENTS[mode];
  const fallback = mode === "opponent" ? "take_turn"
    : mode === "commentator" ? "commentate"
      : mode === "companion" ? "reflect" : "explain";
  const intent = requiredString(value || fallback, "intent", 40).toLowerCase();
  if (!allowed?.includes(intent)) {
    throw Object.assign(new TypeError(`${intent} is forbidden for ${mode}`), {
      code: "intent_not_allowed_for_mode",
    });
  }
  return intent;
}

function assertRoomProjection(projection, session) {
  if (!object(projection) || projection.room?.roomId !== session.binding.roomId) {
    throw new TypeError("room projection room mismatch");
  }
  const roomBinding = session.binding.roomBinding;
  const match = projection.matchBinding;
  if (!object(match)
    || match.bindingHash !== roomBinding.matchBindingHash
    || match.rulesVersion !== roomBinding.rulesVersion
    || match.dataVersion !== roomBinding.dataVersion
    || match.sourceSnapshotHash !== roomBinding.sourceSnapshotHash
    || match.dataSnapshotHash !== roomBinding.dataSnapshotHash
    || match.rulesArtifactHash !== roomBinding.rulesArtifactHash
    || match.executorArtifactHash !== roomBinding.executorArtifactHash
    || match.geometryArtifactHash !== roomBinding.geometryArtifactHash
    || match.actionSchemaHash !== roomBinding.actionSchemaHash) {
    throw new TypeError("room projection MatchBinding mismatch");
  }
  if (session.binding.mode === "commentator") {
    if (projection.viewer?.roleMode !== "public_observer"
      || projection.ownPrivateJournal !== undefined) {
      throw new TypeError("commentator received a non-public projection");
    }
  } else if (projection.viewer?.seatKey !== session.binding.seatKey) {
    throw new TypeError("room projection seat mismatch");
  }
  return deepFreeze(clone(projection));
}

function assertLegalSpace(legalSpace, session, roomProjection) {
  if (!object(legalSpace)
    || legalSpace.roomId !== session.binding.roomId
    || legalSpace.matchBindingHash !== session.binding.roomBinding.matchBindingHash
    || legalSpace.stateRevision !== roomProjection.room.stateRevision
    || legalSpace.stateHash !== roomProjection.room.stateHash
    || !HASH_PATTERN.test(String(legalSpace.legalSpaceHash || ""))) {
    throw new TypeError("LegalSpace session binding mismatch");
  }
  return deepFreeze(clone(legalSpace));
}

function assertPublicEvents(events, session) {
  if (!object(events)
    || events.roomId !== session.binding.roomId
    || events.matchBindingHash !== session.binding.roomBinding.matchBindingHash
    || !HASH_PATTERN.test(String(events.eventsHash || ""))) {
    throw new TypeError("public event stream session binding mismatch");
  }
  return deepFreeze(clone(events));
}

function responseContract(capability) {
  const contract = seal({
    schemaVersion: "starcraft_tmg_online_role_response_contract_v1",
    mode: capability.mode,
    allowedChannels: capability.outputChannels,
    toolAllowlist: capability.tools,
    maySelectDecision: capability.maySelectDecision === true,
    mayPreview: capability.mayPreview === true,
    mayConfirm: false,
    mayApply: false,
    rulesAuthority: "external_rules_service",
    trainingTruth: false,
  }, "contractHash");
  return deepFreeze({
    contract,
    ref: {
      id: `starcraft-tmg.${capability.mode}.online-response.v1`,
      version: "1.0.0",
      hash: contract.contractHash,
    },
  });
}

function traceMode(mode) {
  if (mode === "opponent") return "user_vs_agent";
  if (mode === "commentator") return "referee";
  return "teaching";
}

export function createStarcraftTmgOnlineRoleContextRuntimeV1(options = {}) {
  const sessionLifecycle = options.sessionLifecycle;
  const providerSupervisor = options.providerSupervisor;
  const materialCatalog = options.materialCatalog;
  const roomTools = options.roomTools;
  const memoryStore = options.memoryStore;
  const promptArtifactStore = options.promptArtifactStore;
  const roleOutputPolicy = options.roleOutputPolicy || null;
  if (typeof sessionLifecycle?.readSession !== "function") {
    throw new TypeError("sessionLifecycle.readSession is required");
  }
  if (typeof providerSupervisor?.readState !== "function"
    || typeof providerSupervisor?.sendTurn !== "function") {
    throw new TypeError("providerSupervisor readState/sendTurn is required");
  }
  if (typeof materialCatalog?.resolve !== "function") {
    throw new TypeError("materialCatalog.resolve is required");
  }
  for (const method of [
    "readBoardState",
    "listLegalActions",
    "readPublicEvents",
    "readRulesSkills",
  ]) {
    if (typeof roomTools?.[method] !== "function") {
      throw new TypeError(`roomTools.${method} is required`);
    }
  }
  if (typeof memoryStore?.read !== "function") {
    throw new TypeError("memoryStore.read is required");
  }
  for (const method of ["put", "release"] ) {
    if (typeof promptArtifactStore?.[method] !== "function") {
      throw new TypeError(`promptArtifactStore.${method} is required`);
    }
  }
  if (roleOutputPolicy !== null
    && (typeof roleOutputPolicy.createResponseContract !== "function"
      || typeof roleOutputPolicy.process !== "function")) {
    throw new TypeError(
      "roleOutputPolicy createResponseContract/process are required when configured");
  }
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();
  const historyPolicy = normalizeHistoryPolicy(options.historyPolicy);
  const maxUserMessageBytes = Number(options.maxUserMessageBytes || 8_192);
  const maxOutputUnits = Number(options.maxOutputUnits || 2_048);
  if (!Number.isSafeInteger(maxUserMessageBytes)
    || maxUserMessageBytes < 64 || maxUserMessageBytes > 64 * 1024) {
    throw new TypeError("maxUserMessageBytes is invalid");
  }
  if (!Number.isSafeInteger(maxOutputUnits)
    || maxOutputUnits < 1 || maxOutputUnits > 1_000_000) {
    throw new TypeError("maxOutputUnits is invalid");
  }
  const contextBindings = new Map();
  const histories = new Map();
  const lastContexts = new Map();

  function metadata() {
    return deepFreeze({
      schemaVersion: `${STARCRAFT_TMG_ONLINE_ROLE_CONTEXT_RUNTIME_VERSION}.metadata`,
      modes: Object.keys(MODE_INTENTS),
      promptPacks: Object.fromEntries(Object.keys(MODE_INTENTS).map((mode) => [
        mode,
        getStarcraftTmgModeCapability(mode).promptPack,
      ])),
      historyPolicy,
      promptArtifactDurability: "ephemeral_server_store",
      ruleSkillPolicy: "accepted_same_game_same_rules_hash_refs_only",
      memoryPolicy: "accepted_same_session_allowed_namespace_advisory_only",
      memoryWrites: "disabled_live_turn",
      skillGeneration: "disabled_live_turn",
      providerCredentialsAccepted: false,
      productionReady: false,
      trainingTruth: false,
    });
  }

  function historyFor(sessionId) {
    let history = histories.get(sessionId);
    if (!history) {
      history = { entries: [], evictedCount: 0 };
      histories.set(sessionId, history);
    }
    return history;
  }

  async function authenticatedSession(input, context) {
    const session = await sessionLifecycle.readSession({
      sessionId: input.sessionId,
      roomId: input.roomId,
      ...(input.expectedConnectionEpoch === undefined ? {}
        : { expectedConnectionEpoch: input.expectedConnectionEpoch }),
    }, context);
    if (!session?.ok) return { rejection: session || rejection("session_authentication_failed") };
    return { session: session.session };
  }

  async function materialsFor(session) {
    const result = await materialCatalog.resolve({
      sessionId: session.sessionId,
      sessionBindingHash: session.binding.sessionBindingHash,
      characterId: session.binding.character.id,
      characterPackageHash: session.binding.character.hash,
      characterSelectionHash: session.binding.character.selectionHash,
      mode: session.binding.mode,
      roomBindingHash: session.binding.roomBinding.roomBindingHash,
    });
    if (!object(result) || result.ok !== true) {
      throw Object.assign(new Error("session material is unavailable"), {
        code: "session_material_not_available",
      });
    }
    const characterPackage = assertStarcraftTmgCharacterContract(
      result.characterPackage, "character-package");
    const roleSkillPack = assertStarcraftTmgCharacterContract(
      result.roleSkillPack, "role-skill-pack");
    const conversationProfile = assertStarcraftTmgCharacterContract(
      result.conversationProfile, "conversation-profile");
    const providerProfile = assertStarcraftTmgCharacterContract(
      result.providerProfile, "provider-profile");
    if (characterPackage.characterId !== session.binding.character.id
      || characterPackage.integrity.hash !== session.binding.character.hash) {
      throw Object.assign(new Error("CharacterPackage drifted"), {
        code: "session_material_binding_mismatch",
      });
    }
    const worldbooks = (result.worldbooks || []).map((worldbook) =>
      assertStarcraftTmgCharacterContract(worldbook, "worldbook"));
    const registry = createStarcraftTmgWorldbookRegistry({
      characterId: characterPackage.characterId,
      worldbooks,
    });
    const selection = registry.resolve({
      characterPackage,
      requestedWorldbookIds: worldbooks.map((worldbook) => worldbook.worldbookId),
      spoilerCeilingRank: result.spoilerCeilingRank
        ?? characterPackage.spoilerProfile.defaultRank,
      knowledgeCeilingRank: result.knowledgeCeilingRank
        ?? result.spoilerCeilingRank
        ?? characterPackage.spoilerProfile.defaultRank,
      allowFanon: result.allowFanon === true,
      requirePersonaEdition: characterPackage.defaultWorldbookIds.length > 0,
    });
    if (!selection.ok) {
      throw Object.assign(new Error("worldbook selection failed"), {
        code: "session_worldbook_selection_failed",
      });
    }
    const capability = getStarcraftTmgModeCapability(session.binding.mode);
    const roleBinding = createGameRoleBinding({
      bindingId: `${session.sessionId}.online-role-context`,
      version: "1.0.0",
      characterPackage,
      roleSkillPack,
      conversationProfile,
      providerProfile,
      mode: session.binding.mode,
      roomId: session.binding.roomId,
      seatId: session.binding.seatKey,
      gameId: "starcraft-tmg",
      rulesetVersion: session.binding.roomBinding.rulesVersion,
      visibilityPolicy: capability.visibilityPolicy,
      capabilityProfileId: capability.capabilityProfileId,
      worldbookRefs: selection.receipt.selectedRefs.map((entry) => ({
        id: entry.id,
        version: entry.version,
        hash: entry.hash,
      })),
      strategySkillSnapshot: { refs: [], canOverrideRules: false },
      memoryScopes: capability.memoryNamespaces,
      createdBy: "online-agent-context-runtime",
      createdAt: session.createdAt,
      extensions: {
        onlineSessionBindingHash: session.binding.sessionBindingHash,
        characterSelectionHash: session.binding.character.selectionHash,
        worldbookSelectionHash: selection.receipt.selectionHash,
      },
    });
    const snapshot = seal({
      schemaVersion: `${STARCRAFT_TMG_ONLINE_ROLE_CONTEXT_RUNTIME_VERSION}.material-snapshot`,
      sessionId: session.sessionId,
      sessionBindingHash: session.binding.sessionBindingHash,
      mode: session.binding.mode,
      characterPackageRef: ref(characterPackage, "characterId"),
      roleSkillPackRef: ref(roleSkillPack, "roleSkillPackId"),
      conversationProfileRef: ref(conversationProfile, "conversationProfileId"),
      providerProfileRef: ref(providerProfile, "providerProfileId"),
      worldbookRefs: selection.receipt.selectedRefs,
      worldbookSelectionHash: selection.receipt.selectionHash,
      roleBindingHash: roleBinding.integrity.hash,
      trainingTruth: false,
    }, "materialSnapshotHash");
    const existing = contextBindings.get(session.sessionId);
    if (existing && existing !== snapshot.materialSnapshotHash) {
      throw Object.assign(new Error("session material snapshot drifted"), {
        code: "session_context_drift",
      });
    }
    contextBindings.set(session.sessionId, snapshot.materialSnapshotHash);
    return {
      characterPackage,
      roleSkillPack,
      conversationProfile,
      providerProfile,
      worldbooks: selection.worldbooks,
      worldbookRegistry: registry,
      worldbookSelection: selection,
      roleBinding,
      capability,
      snapshot,
    };
  }

  function toolInput(session) {
    return {
      gameId: "starcraft-tmg",
      roomId: session.binding.roomId,
      principalScopeHash: session.binding.principalScopeHash,
      seatKey: session.binding.seatKey,
      mode: session.binding.mode,
      visibilityPolicy: session.capability.visibilityPolicy,
      sessionBindingHash: session.binding.sessionBindingHash,
      roomBinding: session.binding.roomBinding,
    };
  }

  async function gatherContext(session, materials, userMessage) {
    const calls = [];
    const input = toolInput(session);
    const board = await roomTools.readBoardState(input);
    calls.push("read_board_state");
    if (!board?.ok) throw Object.assign(new Error("board read failed"), {
      code: "room_context_read_failed",
    });
    const roomProjection = assertRoomProjection(board.projection, session);

    let legalSpace = null;
    if (materials.capability.tools.includes("list_legal_actions")) {
      const legal = await roomTools.listLegalActions(input);
      calls.push("list_legal_actions");
      if (!legal?.ok) throw Object.assign(new Error("LegalSpace read failed"), {
        code: "legal_space_read_failed",
      });
      legalSpace = assertLegalSpace(legal.legalSpace, session, roomProjection);
    }

    let publicEvents = null;
    if (materials.capability.tools.includes("read_public_events")) {
      const events = await roomTools.readPublicEvents(input);
      calls.push("read_public_events");
      if (!events?.ok) throw Object.assign(new Error("public event read failed"), {
        code: "public_event_read_failed",
      });
      publicEvents = assertPublicEvents(events.events, session);
    }

    const rules = await roomTools.readRulesSkills(input);
    calls.push("read_rules_skills");
    if (!rules?.ok) throw Object.assign(new Error("rule Skill read failed"), {
      code: "rule_skill_read_failed",
    });
    let ruleSkills;
    try {
      ruleSkills = assertStarcraftTmgOnlineRuleSkillSnapshotV1(
        rules.snapshot, {
          roomId: session.binding.roomId,
          roomBindingHash: session.binding.roomBinding.roomBindingHash,
          rulesVersion: session.binding.roomBinding.rulesVersion,
          dataVersion: session.binding.roomBinding.dataVersion,
          sourceSnapshotHash: session.binding.roomBinding.sourceSnapshotHash,
        });
    } catch {
      throw Object.assign(new Error("rule Skill snapshot was rejected"), {
        code: "rule_skill_snapshot_rejected",
      });
    }

    const memory = await memoryStore.read({
      gameId: "starcraft-tmg",
      roomId: session.binding.roomId,
      principalScopeHash: session.binding.principalScopeHash,
      sessionBindingHash: session.binding.sessionBindingHash,
      mode: session.binding.mode,
      allowedNamespaces: materials.capability.memoryNamespaces,
    });
    calls.push("read_memory_snapshot");
    if (!memory?.ok) throw Object.assign(new Error("memory read failed"), {
      code: "memory_read_failed",
    });
    let memorySnapshot;
    try {
      memorySnapshot = assertStarcraftTmgOnlineMemorySnapshotV1(
        memory.snapshot, {
          roomId: session.binding.roomId,
          principalScopeHash: session.binding.principalScopeHash,
          sessionBindingHash: session.binding.sessionBindingHash,
          mode: session.binding.mode,
        });
    } catch {
      throw Object.assign(new Error("memory snapshot was rejected"), {
        code: "memory_snapshot_rejected",
      });
    }

    const worldbookActivation = materials.worldbookRegistry.activate(
      materials.worldbookSelection, {
        mode: session.binding.mode,
        userMessage,
        maxEntries: 32,
      });
    if (!worldbookActivation.ok) throw Object.assign(new Error("worldbook activation failed"), {
      code: "worldbook_activation_failed",
    });
    calls.push("read_character_worldbook");

    const receipt = seal({
      schemaVersion: `${STARCRAFT_TMG_ONLINE_ROLE_CONTEXT_RUNTIME_VERSION}.tool-context-receipt`,
      sessionId: session.sessionId,
      sessionBindingHash: session.binding.sessionBindingHash,
      mode: session.binding.mode,
      calls,
      roomProjectionHash: hashStarcraftTmgContract(roomProjection),
      legalSpaceHash: legalSpace?.legalSpaceHash || null,
      publicEventsHash: publicEvents?.eventsHash || null,
      ruleSkillSnapshotHash: ruleSkills.snapshotHash,
      memorySnapshotHash: memorySnapshot.snapshotHash,
      worldbookActivationHash: worldbookActivation.receipt.activationHash,
      modelInitiatedToolCalls: 0,
      roomMutationCalls: 0,
      memoryWrites: 0,
      trainingTruth: false,
    }, "receiptHash");
    return {
      roomProjection,
      legalSpace,
      publicEvents,
      ruleSkills,
      memorySnapshot,
      worldbookActivation,
      receipt,
    };
  }

  function assemblePrompt(session, materials, gathered, history, userMessage, intent) {
    const base = assembleStarcraftTmgRolePrompt({
      characterPackage: materials.characterPackage,
      roleSkillPack: materials.roleSkillPack,
      conversationProfile: materials.conversationProfile,
      binding: materials.roleBinding,
      worldbooks: materials.worldbooks,
      memoryRefs: gathered.memorySnapshot.refs,
      roomProjection: gathered.roomProjection,
      legalSpace: gathered.legalSpace,
      worldbookActivation: gathered.worldbookActivation,
    });
    const response = roleOutputPolicy
      ? roleOutputPolicy.createResponseContract({
        session,
        capability: materials.capability,
        gathered,
        intent,
      })
      : responseContract(materials.capability);
    const nodes = [
      ...base.nodes,
      node("runtime-rule-skills", "rules-advisory", {
        snapshotHash: gathered.ruleSkills.snapshotHash,
        refs: gathered.ruleSkills.skillRefs,
        skills: gathered.ruleSkills.skillEntries.map((entry) => entry.skillArtifact),
        rulesAuthority: "external_rules_service",
        skillsMayOverrideRules: false,
      }),
      node("runtime-memory", "advisory", {
        snapshotHash: gathered.memorySnapshot.snapshotHash,
        entries: gathered.memorySnapshot.entries,
        rulesMayBeOverridden: false,
        opponentDecisionInfluence:
          "strategy_memory_only_when_explicitly_marked_mayInfluenceDecision",
      }),
      ...(gathered.publicEvents ? [node("public-events", "referee", gathered.publicEvents)] : []),
      node("bounded-conversation-history", "conversation", history),
      node("user-message", "user", { intent, text: userMessage }),
      node("response-contract", "platform", response.contract),
    ];
    const receipt = seal({
      schemaVersion: `${STARCRAFT_TMG_ONLINE_ROLE_CONTEXT_RUNTIME_VERSION}.prompt-receipt`,
      sessionId: session.sessionId,
      sessionBindingHash: session.binding.sessionBindingHash,
      materialSnapshotHash: materials.snapshot.materialSnapshotHash,
      mode: session.binding.mode,
      intent,
      promptPack: materials.capability.promptPack,
      basePromptReceiptHash: base.receipt.receiptHash,
      nodeHashes: nodes.map((entry) => entry.nodeHash),
      ruleSkillSetHash: gathered.ruleSkills.skillSetHash,
      memorySetHash: gathered.memorySnapshot.memorySetHash,
      historyHash: history.historyHash,
      toolContextReceiptHash: gathered.receipt.receiptHash,
      responseContractHash: response.contract.contractHash,
      userMessageHash: hashStarcraftTmgContract(userMessage),
      rulesAuthority: "external_rules_service",
      trainingTruth: false,
    }, "receiptHash");
    const artifact = seal({
      schemaVersion: `${STARCRAFT_TMG_ONLINE_ROLE_CONTEXT_RUNTIME_VERSION}.prompt-artifact`,
      sessionId: session.sessionId,
      sessionBindingHash: session.binding.sessionBindingHash,
      promptPack: materials.capability.promptPack,
      nodes,
      responseContract: response.contract,
      receipt,
      retentionPolicy: "ephemeral_release_after_supervised_turn",
      eligibleForTraining: false,
      trainingTruth: false,
    }, "promptArtifactHash");
    return { artifact, receipt, response };
  }

  function safeLastContext(session) {
    const previous = lastContexts.get(session.sessionId);
    if (!previous) {
      return deepFreeze({
        promptPack: getStarcraftTmgModeCapability(session.binding.mode).promptPack,
        ruleSkillRefs: [],
        memoryRefs: [],
        harnessToolsCalled: [],
        lastTrace: null,
      });
    }
    return previous;
  }

  function contextProjection(session, providerState) {
    const history = historyProjection(historyFor(session.sessionId), historyPolicy);
    const previous = safeLastContext(session);
    return seal({
      schemaVersion: `${STARCRAFT_TMG_ONLINE_ROLE_CONTEXT_RUNTIME_VERSION}.viewer-context`,
      sessionId: session.sessionId,
      sessionBindingHash: session.binding.sessionBindingHash,
      connectionEpoch: session.connection.epoch,
      mode: session.binding.mode,
      promptPack: previous.promptPack,
      toolAllowlist: session.capability.tools,
      memoryNamespaces: session.capability.memoryNamespaces,
      ruleSkillRefs: previous.ruleSkillRefs,
      memoryRefs: previous.memoryRefs,
      harnessToolsCalled: previous.harnessToolsCalled,
      history,
      providerState,
      lastTrace: previous.lastTrace,
      memoryWrites: 0,
      skillGenerationRuns: 0,
      reconnectRestoresHistory: true,
      productionReady: false,
      trainingTruth: false,
    }, "contextHash");
  }

  async function readContext(input = {}, context = {}) {
    try {
      exactFields(input, READ_FIELDS, "readContext input");
      const authenticated = await authenticatedSession(input, context);
      if (authenticated.rejection) return authenticated.rejection;
      const provider = await providerSupervisor.readState({
        sessionId: input.sessionId,
        roomId: input.roomId,
        ...(input.expectedConnectionEpoch === undefined ? {}
          : { expectedConnectionEpoch: input.expectedConnectionEpoch }),
      }, context);
      if (!provider?.ok) return provider;
      return deepFreeze({
        ok: true,
        context: contextProjection(authenticated.session, provider.state),
      });
    } catch (error) {
      return rejection(error?.code || "invalid_context_request", {
        ...(Array.isArray(error?.forbiddenFields)
          ? { forbiddenFields: error.forbiddenFields } : {}),
      });
    }
  }

  async function sendTurn(input = {}, context = {}) {
    try {
      exactFields(input, SEND_FIELDS, "sendContextTurn input");
      const authenticated = await authenticatedSession(input, context);
      if (authenticated.rejection) return authenticated.rejection;
      const session = authenticated.session;
      if (session.lifecycleState !== "active") return rejection("session_ended");
      const intent = normalizeIntent(session.binding.mode, input.intent);
      const userMessage = requiredString(input.userMessage, "userMessage",
        maxUserMessageBytes);
      if (Buffer.byteLength(userMessage, "utf8") > maxUserMessageBytes) {
        return rejection("user_message_too_large");
      }
      if (containsStarcraftTmgOnlineContextCredentialMaterialV1(userMessage)) {
        return rejection("credential_material_forbidden");
      }
      const preflight = await providerSupervisor.readState({
        sessionId: session.sessionId,
        roomId: session.binding.roomId,
        expectedConnectionEpoch: session.connection.epoch,
      }, context);
      if (!preflight?.ok) return preflight;
      if (preflight.state.provider.state === "provider_not_configured") {
        return rejection("provider_not_configured", { state: preflight.state });
      }

      const materials = await materialsFor(session);
      const gathered = await gatherContext(session, materials, userMessage);
      const beforeHistory = historyProjection(historyFor(session.sessionId),
        historyPolicy);
      const prompt = assemblePrompt(session, materials, gathered,
        beforeHistory, userMessage, intent);
      const stored = promptArtifactStore.put({
        sessionId: session.sessionId,
        sessionBindingHash: session.binding.sessionBindingHash,
        artifact: prompt.artifact,
      });
      if (!stored?.ok) return rejection(stored?.reason || "prompt_artifact_store_failed");
      const inputUnits = Math.max(1, Math.ceil(stored.bytes / 4));
      if (inputUnits > materials.providerProfile.contextBudget) {
        promptArtifactStore.release(stored.ref);
        return rejection("prompt_context_budget_exceeded");
      }
      const boundedRequestBody = {
        schemaVersion: "starcraft_tmg_bounded_provider_request_v1",
        intent,
        requestPayloadHash: prompt.artifact.promptArtifactHash,
        inputUnits,
        maxOutputUnits: Math.min(maxOutputUnits,
          materials.providerProfile.outputBudget),
      };
      const boundedRequest = {
        ...boundedRequestBody,
        requestHash: hashStarcraftTmgContract(boundedRequestBody),
      };
      let providerResult;
      try {
        providerResult = await providerSupervisor.sendTurn({
          sessionId: session.sessionId,
          roomId: session.binding.roomId,
          expectedConnectionEpoch: session.connection.epoch,
          providerProfileRef: ref(materials.providerProfile, "providerProfileId"),
          promptAssemblyRef: stored.ref,
          boundedRequest,
          responseContract: prompt.response.ref,
        }, context);
      } finally {
        promptArtifactStore.release(stored.ref);
      }
      const occurredAt = new Date(now()).toISOString();
      let roleOutcome = null;
      if (roleOutputPolicy && providerResult.ok) {
        try {
          roleOutcome = await roleOutputPolicy.process({
            session,
            capability: materials.capability,
            intent,
            output: providerResult.output,
            providerOutputHash: providerResult.turn?.outputHash || null,
            gathered,
            responseContract: prompt.response.contract,
            occurredAt,
          });
        } catch (error) {
          roleOutcome = rejection(error?.code || "provider_output_rejected");
        }
      }
      const roleAccepted = providerResult.ok
        && (!roleOutputPolicy || roleOutcome?.ok === true);
      const acceptedOutput = roleOutputPolicy
        ? roleOutcome?.output
        : providerResult.output;
      const acceptedOutputHash = roleOutputPolicy
        ? roleOutcome?.outputHash || null
        : providerResult.turn?.outputHash || null;
      const effectiveFailureCode = providerResult.ok
        ? roleOutcome?.reason || null
        : providerResult.reason;
      const additionalToolCalls = roleOutputPolicy
        ? roleOutcome?.harnessToolsCalled || []
        : [];
      const allToolCalls = [...gathered.receipt.calls, ...additionalToolCalls];
      const history = historyFor(session.sessionId);
      const entry = appendHistory(history, historyPolicy, {
        turnId: providerResult.turn?.turnId || null,
        mode: session.binding.mode,
        intent,
        userMessage,
        output: roleAccepted ? acceptedOutput : undefined,
        outputHash: roleAccepted ? acceptedOutputHash : null,
        status: roleAccepted ? "completed" : "failed",
        failureCode: effectiveFailureCode,
        promptReceiptHash: prompt.receipt.receiptHash,
        occurredAt,
      });
      const trace = seal({
        schemaVersion: `${STARCRAFT_TMG_ONLINE_ROLE_CONTEXT_RUNTIME_VERSION}.harness-trace`,
        gameId: "starcraft-tmg",
        roomId: session.binding.roomId,
        sessionId: session.sessionId,
        sessionBindingHash: session.binding.sessionBindingHash,
        connectionEpoch: session.connection.epoch,
        mode: traceMode(session.binding.mode),
        roleMode: session.binding.mode,
        intent,
        promptPack: materials.capability.promptPack,
        promptReceiptHash: prompt.receipt.receiptHash,
        promptArtifactHash: prompt.artifact.promptArtifactHash,
        ruleSkillRefs: gathered.ruleSkills.skillRefs,
        memoryRefs: gathered.memorySnapshot.refs,
        harnessVersion: STARCRAFT_TMG_ONLINE_ROLE_CONTEXT_RUNTIME_VERSION,
        agentVersion: materials.providerProfile.model,
        rulesVersion: session.binding.roomBinding.rulesVersion,
        harnessToolsCalled: allToolCalls,
        toolContextReceiptHash: gathered.receipt.receiptHash,
        providerTurnReceiptHash: providerResult.receipt?.receiptHash || null,
        userMessageHash: hashStarcraftTmgContract(userMessage),
        outputHash: roleAccepted
          ? acceptedOutputHash
          : providerResult.turn?.outputHash || null,
        historyEntryHash: entry.entryHash,
        ...(roleOutputPolicy ? {
          providerOutputHash: providerResult.turn?.outputHash || null,
          roleOutputReceiptHash: roleOutcome?.receipt?.receiptHash || null,
          roleOutputStatus: roleAccepted ? "accepted" : "rejected",
          decision: roleOutcome?.decision || null,
          decisionReceiptHash: roleOutcome?.decisionReceipt?.receiptHash || null,
          previewProjectionHash: roleOutcome?.preview?.previewProjectionHash || null,
          confirmationRequired: roleOutcome?.confirmationRequired === true,
          confirmationOwner: roleOutcome?.confirmationRequired
            ? "human_outside_agent_runtime"
            : null,
          modelConfirmCalls: 0,
          modelApplyCalls: 0,
        } : {}),
        memoryWrites: 0,
        skillGenerationRuns: 0,
        eligibleForTraining: false,
        reviewStatus: roleAccepted ? "raw" : "rejected",
        occurredAt,
        trainingTruth: false,
      }, "traceId");
      lastContexts.set(session.sessionId, deepFreeze({
        promptPack: materials.capability.promptPack,
        ruleSkillRefs: gathered.ruleSkills.skillRefs,
        memoryRefs: gathered.memorySnapshot.refs,
        harnessToolsCalled: allToolCalls,
        lastTrace: trace,
      }));
      const contextView = contextProjection(session, providerResult.state);
      const publicResult = roleOutputPolicy
        ? roleAccepted
          ? {
            ...providerResult,
            output: acceptedOutput,
            roleOutputReceipt: roleOutcome.receipt,
            decision: roleOutcome.decision || null,
            decisionReceipt: roleOutcome.decisionReceipt || null,
            preview: roleOutcome.preview || null,
            confirmationRequired: roleOutcome.confirmationRequired === true,
            confirmationOwner: roleOutcome.confirmationRequired
              ? "human_outside_agent_runtime"
              : null,
          }
          : rejection(effectiveFailureCode || "provider_output_rejected", {
            providerTurn: providerResult.turn || null,
            providerTurnReceipt: providerResult.receipt || null,
            providerState: providerResult.state || null,
            roleOutputReceipt: roleOutcome?.receipt || null,
          })
        : providerResult;
      return deepFreeze({
        ...publicResult,
        promptReceipt: prompt.receipt,
        toolContextReceipt: gathered.receipt,
        trace,
        historyEntry: entry,
        context: contextView,
      });
    } catch (error) {
      return rejection(error?.code || "online_context_turn_failed", {
        ...(Array.isArray(error?.forbiddenFields)
          ? { forbiddenFields: error.forbiddenFields } : {}),
      });
    }
  }

  return Object.freeze({ metadata, readContext, sendTurn });
}
