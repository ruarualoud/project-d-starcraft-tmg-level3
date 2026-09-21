import {
  COMPANION_BACKEND_CONTRACT_VERSION,
  COMPANION_DURABLE_PERSISTENCE_CONTRACT_V1,
  assertNoCredentials,
  assertNoHiddenChainOfThought,
  composeCompanionBackend,
  createCompanionPackage,
  createCompanionPackageRegistry,
  createPostgresCompanionPersistenceAdapter,
  createSqliteCompanionPersistenceAdapter,
} from "../companion-backend-module-v1/index.mjs";
import { createStarcraftTmgCompanionRoomSessionServiceV1 } from
  "./companion-room-session-service-v1.mjs";

export const STARCRAFT_TMG_COMPANION_PRODUCT_MODULE_VERSION =
  "starcraft_tmg_companion_product_module_v1";
export const STARCRAFT_TMG_COMPANION_PRODUCT_API_PREFIX =
  "/starcraft-tmg-level3/companion/api/v1";
export const STARCRAFT_TMG_COMPANION_PRODUCT_HTTP_VERSION =
  "starcraft_tmg_companion_product_http_v1";

const MAX_COMPANIONS = 6;
const CONVERSATION_ID = /^[A-Za-z0-9._:-]{1,160}$/u;

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

function fail(code, message) {
  throw Object.assign(new Error(message || code), { code });
}

function assertMethod(owner, method, label) {
  if (typeof owner?.[method] !== "function") {
    fail("COMPANION_PRODUCT_DEPENDENCY_MISSING", `${label}.${method} is required`);
  }
}

function rejection(reason, details = {}) {
  return deepFreeze({
    ok: false,
    schemaVersion: `${STARCRAFT_TMG_COMPANION_PRODUCT_MODULE_VERSION}.rejection`,
    reason: String(reason || "COMPANION_PRODUCT_OPERATION_FAILED"),
    ...clone(details),
    trainingTruth: false,
  });
}

function bearerToken(headers) {
  const raw = String(headers?.authorization || headers?.Authorization || "").trim();
  const match = raw.match(/^Bearer\s+(.+)$/iu);
  return match ? match[1].trim() : "";
}

/**
 * Map one COMPANION_CATALOGUE_V1 entry to a createCompanionPackage input.
 * The catalogue stays presentation-only; sealing happens here, product-side,
 * through the generic companion-package contract. Kerrigan's entry carries no
 * inline pack (her sealed content is the Ticket 13 backend reference), so her
 * package is a narrow registered reference whose identity truth remains the
 * server character projection. No package grants Rules, room-mutation,
 * Provider, or memory authority.
 *
 * Slice 266d: optional `extras.presentationAssets` (from the committed
 * portrait asset registry) seals receipt/hash-bound presentation assets into
 * the package, and a pack's worldbook entries ride inside the sealed
 * `extensions.worldbookEntries` so the product can inject them as
 * character-tier worldbook triggers without copying content into the
 * service. Both are additive; old callers see no change.
 */
export function companionProductPackageInputFromCatalogueEntryV1(entry, extras = {}) {
  if (!object(entry) || typeof entry.characterId !== "string") {
    fail("COMPANION_PRODUCT_PACKAGE_INVALID", "catalogue entry is required");
  }
  const slug = entry.characterId.split(".")[1] || entry.characterId;
  const pack = object(entry.pack) ? entry.pack : null;
  const eras = Array.isArray(pack?.eras) ? pack.eras : [];
  const extensions = {};
  if (Array.isArray(pack?.worldbookEntries) && pack.worldbookEntries.length) {
    extensions.worldbookEntries = pack.worldbookEntries.map((worldbook) => ({
      entryId: String(worldbook.entryId),
      title: String(worldbook.title || worldbook.entryId),
      content: String(worldbook.content || ""),
      canonStatus: String(worldbook.canonStatus || "platform_framing"),
      sourceRefs: Array.isArray(worldbook.sourceRefs) ? worldbook.sourceRefs.map(String) : [],
      activation: object(worldbook.activation)
        ? { always: worldbook.activation.always === true }
        : { always: true },
    }));
  }
  return {
    packageId: `starcraft-tmg.companion.${slug}`,
    slug,
    displayName: String(entry.displayName || slug),
    version: String(pack?.version || "1.0.0-reference.1"),
    status: "registered",
    supportedSeats: ["player_seat", "observer"],
    defaultPersonaState: String(entry.defaultPersonaState || "registered_default"),
    identityEras: eras.map((era) => ({
      eraId: String(era.personaState),
      label: String(era.title || era.personaState),
      personaState: String(era.personaState),
      knowledgeRank: Number(era.knowledgeRank) || 0,
      spoilerRank: Number(era.spoilerRank) || 0,
    })),
    defaultEraId: eras.find((era) => era.defaultSelected)?.personaState
      ?? eras[0]?.personaState
      ?? null,
    description: String(
      pack?.biography?.summary
        || "Backend-sealed reference companion; identity and era truth come from the server character projection, not from this registration.",
    ),
    personalitySummary: String(pack?.identity?.tagline || ""),
    worldbookRefs: Array.isArray(pack?.worldbookEntries)
      ? pack.worldbookEntries.map((worldbook) => String(worldbook.entryId))
      : [],
    ...(object(extras.presentationAssets)
      ? { presentationAssets: clone(extras.presentationAssets) }
      : {}),
    authority: { rules: "external_rules_service", matchState: "room_tools_only" },
    visibilityPolicy: "player_visible_only",
    provenance: {
      sourceKind: pack ? "mixed" : "platform_original",
      author: "Project D",
      license: "proprietary-development-internal",
      sourceRefs: [],
      notes: pack
        ? "Presentation pack promoted to a registered companion package product-side; canon facts stay official-source-cited inside the pack."
        : "Reference registration for the Ticket 13 backend-sealed companion; no content is copied.",
    },
    tags: [String(entry.factionAlignment || "unknown"), "tactical_companion"],
    extensions,
  };
}

/**
 * Durable companion product persistence (Ticket 26 / Slice 266d SS-3).
 *
 * Product-construction factory over the EXISTING encrypted persistence port:
 * local/M1 development uses the file-backed SQLite adapter (WAL,
 * synchronous=FULL, AES-256-GCM private payload codec) and production uses
 * the PostgreSQL adapter over an injected pool. Both factories fail closed on
 * a missing/malformed managed key or codec (enforced inside the adapters);
 * this wrapper only validates the selection and never generates an ephemeral
 * key. The in-memory adapter stays available for honestly-volatile fixtures
 * and is never selected here.
 */
export function createStarcraftTmgCompanionProductPersistenceV1(options = {}) {
  const kind = String(options.kind || "sqlite").trim();
  if (kind === "sqlite") {
    return createSqliteCompanionPersistenceAdapter({
      ...(options.filename !== undefined ? { filename: options.filename } : {}),
      ...(options.database !== undefined ? { database: options.database } : {}),
      ...(options.databaseDurable !== undefined ? { databaseDurable: options.databaseDurable } : {}),
      ...(options.adapterId !== undefined ? { adapterId: options.adapterId } : {}),
      ...(options.encryption !== undefined ? { encryption: options.encryption } : {}),
      ...(options.privatePayloadCodec !== undefined ? { privatePayloadCodec: options.privatePayloadCodec } : {}),
      ...(typeof options.now === "function" ? { now: options.now } : {}),
    });
  }
  if (kind === "postgresql" || kind === "postgres") {
    return createPostgresCompanionPersistenceAdapter({
      ...(options.pool !== undefined ? { pool: options.pool } : {}),
      ...(options.adapterId !== undefined ? { adapterId: options.adapterId } : {}),
      ...(options.encryption !== undefined ? { encryption: options.encryption } : {}),
      ...(options.privatePayloadCodec !== undefined ? { privatePayloadCodec: options.privatePayloadCodec } : {}),
      ...(typeof options.now === "function" ? { now: options.now } : {}),
    });
  }
  fail("COMPANION_PRODUCT_PERSISTENCE_KIND_UNKNOWN",
    `companion product persistence kind must be sqlite or postgresql; received: ${kind}`);
}

export { COMPANION_DURABLE_PERSISTENCE_CONTRACT_V1 };

/**
 * Narrow companion product module (Ticket 26 / Slice 266c SS-2).
 *
 * Connects the existing createStarcraftTmgCompanionRoomSessionServiceV1 to
 * the product over one authenticated HTTP surface. The module:
 *   - composes the generic companion backend around the INJECTED persistence
 *     and provider ports (this module ships no Provider, performs no network
 *     I/O and handles no credentials);
 *   - registers the supplied companion packages into the backend registry;
 *   - serves catalogue/status/conversation operations for the authenticated
 *     human seat (Bearer seat token, verified against the room runtime on
 *     every operation, never persisted, never logged);
 *   - projects honest memory/relationship summaries from the CB-2 layered
 *     memory engine (unknown stays unknown; nothing is zero-filled);
 *   - never mutates the Room: the only room-runtime methods touched are the
 *     read-only projection reads the room session service already declares.
 *
 * Slice 266d extends the same authenticated surface with the Tavern-equivalent
 * companion contracts: versioned seat-bound user persona, four-tier worldbook
 * triggers with bounded recursion, layered memory operations (summary edit /
 * rollback, episodic, relationship), swipe/reroll/edit-as-branch lineage,
 * Author's Note depth/frequency, schema-validated integrity-hashed
 * import/export/restore (no credentials either way), hash-chained audit
 * export/verify/replay-candidate, and the four live permission surfaces. All
 * of it delegates to the room session service; this module still ships no
 * Provider, performs no network I/O and handles no credentials.
 */
export function createStarcraftTmgCompanionProductModuleV1(options = {}) {
  const roomRuntime = options.roomRuntime;
  for (const method of ["readRoom", "readCharacterPresentation", "readBattleWorkbench"]) {
    assertMethod(roomRuntime, method, "roomRuntime");
  }
  const backend = options.companionBackend && object(options.companionBackend)
    ? options.companionBackend
    : composeCompanionBackend({
      persistence: options.persistence,
      provider: options.provider ?? null,
      ...(options.assetCatalog !== undefined ? { assetCatalog: options.assetCatalog } : {}),
      ...(options.registry ? { registry: options.registry } : {}),
    });
  for (const method of ["resolve", "register", "list"]) {
    assertMethod(backend?.registry, method, "companionBackend.registry");
  }
  for (const method of ["get", "put", "list", "durabilityDeclaration"]) {
    assertMethod(backend?.persistenceGateway, method, "companionBackend.persistenceGateway");
  }
  assertMethod(backend?.sessionRuntime, "createSession", "companionBackend.sessionRuntime");
  assertMethod(backend?.memoryEngine, "assembleContext", "companionBackend.memoryEngine");
  assertMethod(backend?.memoryEngine, "readTranscript", "companionBackend.memoryEngine");
  assertMethod(backend?.memoryEngine, "readRollingSummary", "companionBackend.memoryEngine");
  assertMethod(backend?.memoryEngine, "getRelationshipState", "companionBackend.memoryEngine");
  assertMethod(backend?.providerGateway, "complete", "companionBackend.providerGateway");
  assertMethod(backend?.providerGateway, "stats", "companionBackend.providerGateway");

  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();
  const apiPrefix = String(options.apiPrefix || STARCRAFT_TMG_COMPANION_PRODUCT_API_PREFIX)
    .replace(/\/+$/u, "");
  const providerAdapter = options.provider ?? backend.provider ?? null;

  const registrations = [];
  for (const candidate of options.packages || []) {
    const contract = object(candidate)
      && candidate.schemaVersion === COMPANION_BACKEND_CONTRACT_VERSION
      ? candidate
      : createCompanionPackage(candidate);
    assertNoHiddenChainOfThought(contract, "companionPackage");
    assertNoCredentials(contract, "companionPackage");
    const registered = backend.registry.register(contract);
    if (!registered?.ok) {
      fail("COMPANION_PRODUCT_PACKAGE_REGISTRATION_FAILED",
        String(registered?.reason || contract.packageId));
    }
    registrations.push(deepFreeze({
      packageRef: clone(registered.packageRef),
      duplicate: registered.duplicate === true,
    }));
  }

  const service = createStarcraftTmgCompanionRoomSessionServiceV1({
    roomRuntime,
    companionBackend: backend,
    now,
    ...(typeof options.createId === "function" ? { createId: options.createId } : {}),
    ...(options.contextTokenBudget !== undefined
      ? { contextTokenBudget: options.contextTokenBudget } : {}),
    ...(options.maxOutputTokens !== undefined
      ? { maxOutputTokens: options.maxOutputTokens } : {}),
    ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    ...(options.worldbookRecursionDepth !== undefined
      ? { worldbookRecursionDepth: options.worldbookRecursionDepth } : {}),
    ...(Array.isArray(options.globalWorldbookEntries)
      ? { globalWorldbookEntries: clone(options.globalWorldbookEntries) } : {}),
  });

  async function authority(roomId, seatToken) {
    if (!seatToken) return { rejection: rejection("authentication_required") };
    const room = await roomRuntime.readRoom({ roomId: String(roomId || ""), seatToken });
    if (!room?.ok) {
      return { rejection: rejection(room?.reason || "ROOM_AUTHORITY_REJECTED") };
    }
    if (!room.projection?.viewer?.seatKey
      || room.projection.viewer.roleMode === "public_observer") {
      return { rejection: rejection("COMPANION_AUTHORITY_BINDING_INVALID") };
    }
    return { roomId: String(roomId || ""), seatToken };
  }

  async function memorySummary(conversation) {
    const scope = conversation.memoryScope;
    if (!object(scope)) return null;
    const transcript = await backend.memoryEngine.readTranscript(scope);
    const rolling = await backend.memoryEngine.readRollingSummary(scope);
    const summaryVersions = await backend.memoryEngine.listRollingSummaryVersions(scope);
    const episodicFacts = await backend.memoryEngine.listEpisodicFacts(scope);
    const relationship = await backend.memoryEngine.getRelationshipState(scope);
    return deepFreeze({
      schemaVersion: `${STARCRAFT_TMG_COMPANION_PRODUCT_MODULE_VERSION}.memory-summary`,
      layeredMemory: "cb2_transcript_rolling_summary_episodic_relationship",
      transcriptEntries: transcript.length,
      latestSpeakers: transcript.slice(-6).map((entry) => entry.speakerId),
      rollingSummary: rolling.found
        ? {
          summaryVersion: rolling.value.summaryVersion,
          coversTranscriptThrough: rolling.value.coversTranscriptThrough,
        }
        : null,
      rollingSummaryVersions: summaryVersions.length,
      rollingSummaryHonesty: rolling.found
        ? "persisted_versioned_rollback_safe"
        : "not_written_yet_never_fabricated",
      episodicFacts: episodicFacts.length,
      relationshipAxes: clone(relationship.axes),
      relationshipEvents: relationship.history.length,
      relationshipHonesty: "unknown_is_first_class_never_zero_filled",
      persistence: backend.persistenceGateway.durabilityDeclaration(),
      opponentPrivateAccess: false,
      hiddenChainOfThought: "not_collected",
      trainingTruth: false,
    });
  }

  async function withSummary(result) {
    if (!result?.ok || !Array.isArray(result.messages)) return result;
    return deepFreeze({
      ...clone(result),
      memorySummary: await memorySummary(result),
    });
  }

  function providerStatus() {
    const stats = backend.providerGateway.stats();
    if (!providerAdapter) {
      return deepFreeze({
        state: "unavailable",
        reason: "provider_not_injected",
        failClosed: true,
        accounting: clone(stats),
      });
    }
    return deepFreeze({
      state: "injected_port",
      adapterId: providerAdapter.adapterId ?? null,
      implementsRealProvider: providerAdapter.implementsRealProvider === true,
      declaredNetwork: String(providerAdapter.network ?? "unknown"),
      accounting: clone(stats),
    });
  }

  function statusBody() {
    return deepFreeze({
      ok: true,
      schemaVersion: `${STARCRAFT_TMG_COMPANION_PRODUCT_MODULE_VERSION}.status`,
      module: STARCRAFT_TMG_COMPANION_PRODUCT_MODULE_VERSION,
      registeredPackages: backend.registry.count(),
      maximumCompanions: MAX_COMPANIONS,
      provider: providerStatus(),
      persistence: backend.persistenceGateway.durabilityDeclaration(),
      service: service.metadata(),
      roomMutationAuthority: false,
      previewConfirmApplyAuthority: false,
      seatTokenPersistence: "never",
      hiddenChainOfThought: "not_collected",
      byok: {
        surface: "secure_provider_session_console",
        note: "live BYOK attachment stays with the secure Provider session; the companion module itself never sees credentials",
      },
      trainingTruth: false,
    });
  }

  function catalogueBody() {
    return deepFreeze({
      ok: true,
      schemaVersion: `${STARCRAFT_TMG_COMPANION_PRODUCT_MODULE_VERSION}.catalogue`,
      packages: backend.registry.list().map((row) => ({
        packageId: row.packageId,
        version: row.version,
        slug: row.slug,
        displayName: row.displayName,
        status: row.status,
        supportedSeats: [...row.supportedSeats],
        integrityHash: row.integrityHash,
      })),
      maximumCompanions: MAX_COMPANIONS,
      speakerOrder: "deterministic_selection_order_then_rotation",
      registrations: clone(registrations),
      trainingTruth: false,
    });
  }

  function envelope(result, status = 200) {
    return {
      status,
      response: deepFreeze({
        schemaVersion: STARCRAFT_TMG_COMPANION_PRODUCT_HTTP_VERSION,
        result: clone(result),
      }),
    };
  }

  async function handle(input = {}) {
    const method = String(input.method || "GET").toUpperCase();
    const pathname = String(input.pathname || "/");
    const query = object(input.query) ? input.query : {};
    const body = object(input.body) ? input.body : {};
    if (!pathname.startsWith(apiPrefix)) {
      return envelope(rejection("COMPANION_PRODUCT_ROUTE_UNKNOWN"), 404);
    }
    const subpath = pathname.slice(apiPrefix.length).replace(/^\/+|\/+$/gu, "");
    const segments = subpath ? subpath.split("/") : [];
    const seatToken = bearerToken(input.headers || {});
    const roomId = String(body.roomId || query.roomId || "");
    try {
      if (method === "GET" && segments[0] === "status") {
        const auth = await authority(roomId, seatToken);
        if (auth.rejection) return envelope(auth.rejection, 401);
        return envelope(statusBody());
      }
      if (method === "GET" && segments[0] === "catalogue") {
        const auth = await authority(roomId, seatToken);
        if (auth.rejection) return envelope(auth.rejection, 401);
        return envelope(catalogueBody());
      }
      // ── Slice 266d: seat-scoped persona, audit, permissions, packages ──
      if (segments[0] === "persona") {
        const auth = await authority(roomId, seatToken);
        if (auth.rejection) return envelope(auth.rejection, 401);
        const scoped = { roomId: auth.roomId, seatToken };
        if (method === "GET" && segments.length === 1) {
          return envelope(await service.readUserPersona(scoped));
        }
        if (method === "PUT" && segments.length === 1) {
          return envelope(await service.putUserPersona({
            ...scoped,
            displayName: body.displayName,
            description: body.description,
            note: body.note,
          }));
        }
        if (method === "POST" && segments[1] === "rollback") {
          return envelope(await service.rollbackUserPersona({
            ...scoped,
            version: body.version,
            note: body.note,
          }));
        }
        return envelope(rejection("COMPANION_PRODUCT_ROUTE_UNKNOWN"), 404);
      }
      if (segments[0] === "audit") {
        const auth = await authority(roomId, seatToken);
        if (auth.rejection) return envelope(auth.rejection, 401);
        const scoped = { roomId: auth.roomId, seatToken };
        if (method === "GET" && segments[1] === "export") {
          return envelope(await service.readAuditExport(scoped));
        }
        if (method === "GET" && segments[1] === "verify") {
          return envelope(await service.verifyAuditLive(scoped));
        }
        if (method === "POST" && segments[1] === "replay-candidate") {
          return envelope(await service.buildAuditReplayCandidate({
            ...scoped,
            ...(object(body.sessionRef) ? { sessionRef: body.sessionRef } : {}),
          }));
        }
        return envelope(rejection("COMPANION_PRODUCT_ROUTE_UNKNOWN"), 404);
      }
      if (segments[0] === "permissions" && segments[1] === "surfaces" && method === "GET") {
        const auth = await authority(roomId, seatToken);
        if (auth.rejection) return envelope(auth.rejection, 401);
        return envelope(await service.readPermissionSurfaces({ roomId: auth.roomId, seatToken }));
      }
      if (segments[0] === "packages") {
        const auth = await authority(roomId, seatToken);
        if (auth.rejection) return envelope(auth.rejection, 401);
        if (method === "POST" && segments[1] === "import") {
          return envelope(await service.importPackage({
            roomId: auth.roomId,
            seatToken,
            contract: body.contract,
          }));
        }
        const packageId = String(segments[1] || "");
        if (method === "GET" && segments[2] === "export" && CONVERSATION_ID.test(packageId)) {
          return envelope(await service.exportPackage({
            roomId: auth.roomId,
            seatToken,
            packageId,
          }));
        }
        return envelope(rejection("COMPANION_PRODUCT_ROUTE_UNKNOWN"), 404);
      }
      if (segments[0] === "conversations") {
        const auth = await authority(roomId, seatToken);
        if (auth.rejection) return envelope(auth.rejection, 401);
        if (method === "POST" && segments.length === 1) {
          return envelope(await withSummary(await service.openOrResumeConversation({
            roomId: auth.roomId,
            seatToken,
            packageIds: body.packageIds,
            ...(object(body.versions) ? { versions: body.versions } : {}),
            ...(object(body.eraIds) ? { eraIds: body.eraIds } : {}),
          })));
        }
        if (method === "GET" && segments[1] === "active") {
          return envelope(await withSummary(await service.readActiveConversation({
            roomId: auth.roomId,
            seatToken,
          })));
        }
        // Slice 266d: restore is a room-level conversation collection op; it
        // must be matched BEFORE the conversationId branch ("restore" is a
        // syntactically valid conversation id).
        if (method === "POST" && segments[1] === "restore") {
          return envelope(await withSummary(await service.restoreConversation({
            roomId: auth.roomId,
            seatToken,
            export: body.export,
          })));
        }
        const conversationId = String(segments[1] || "");
        if (!CONVERSATION_ID.test(conversationId)) {
          return envelope(rejection("COMPANION_PRODUCT_ROUTE_UNKNOWN"), 404);
        }
        const scoped = { roomId: auth.roomId, seatToken, conversationId };
        if (method === "GET" && segments.length === 2) {
          return envelope(await withSummary(await service.readConversation(scoped)));
        }
        if (method === "POST" && segments[2] === "turns") {
          return envelope(await withSummary(await service.sendMessage({
            ...scoped,
            content: body.content,
            ...(body.mentions !== undefined ? { mentions: body.mentions } : {}),
          })));
        }
        if (method === "POST" && segments[2] === "continue") {
          return envelope(await withSummary(await service.continueConversation(scoped)));
        }
        if (method === "POST" && segments[2] === "checkpoint") {
          return envelope(await service.checkpointConversation({
            ...scoped,
            label: body.label,
          }));
        }
        if (method === "POST" && segments[2] === "resume") {
          return envelope(await withSummary(await service.resumeConversation({
            ...scoped,
            ...(body.checkpointId ? { checkpointId: body.checkpointId } : {}),
          })));
        }
        if (method === "POST" && segments[2] === "close") {
          return envelope(await withSummary(await service.closeConversation(scoped)));
        }
        // ── Slice 266d: worldbook, memory, branches, author's note, export ──
        if (segments[2] === "worldbook") {
          if (method === "GET" && segments.length === 3) {
            return envelope(await service.readWorldbook(scoped));
          }
          if (method === "POST" && segments.length === 3) {
            return envelope(await service.registerChatWorldbookEntry({
              ...scoped,
              entry: body.entry,
            }));
          }
          if (method === "GET" && segments[3] === "export") {
            return envelope(await service.exportConversationWorldbook(scoped));
          }
          if (method === "POST" && segments[3] === "import") {
            return envelope(await service.importConversationWorldbook({
              ...scoped,
              entries: body.entries,
            }));
          }
          return envelope(rejection("COMPANION_PRODUCT_ROUTE_UNKNOWN"), 404);
        }
        if (segments[2] === "memory") {
          if (method === "GET" && segments.length === 3) {
            return envelope(await service.readMemory(scoped));
          }
          if (method === "POST" && segments[3] === "summary" && segments.length === 4) {
            return envelope(await service.writeConversationSummary({
              ...scoped,
              content: body.content,
              ...(body.coversTranscriptThrough !== undefined
                ? { coversTranscriptThrough: body.coversTranscriptThrough } : {}),
              note: body.note,
            }));
          }
          if (method === "POST" && segments[3] === "summary" && segments[4] === "rollback") {
            return envelope(await service.rollbackConversationSummary({
              ...scoped,
              summaryVersion: body.summaryVersion,
              note: body.note,
            }));
          }
          if (method === "POST" && segments[3] === "episodic") {
            return envelope(await service.addConversationEpisodicFact({
              ...scoped,
              content: body.content,
              factType: body.factType,
            }));
          }
          if (method === "POST" && segments[3] === "relationship") {
            return envelope(await service.applyConversationRelationshipEvent({
              ...scoped,
              eventType: body.eventType,
              deltas: body.deltas,
              note: body.note,
            }));
          }
          return envelope(rejection("COMPANION_PRODUCT_ROUTE_UNKNOWN"), 404);
        }
        if (segments[2] === "branches") {
          if (method === "GET" && segments.length === 3) {
            return envelope(await service.listConversationBranches(scoped));
          }
          if (method === "POST" && segments.length === 3) {
            return envelope(await service.openConversationBranch({
              ...scoped,
              kind: body.kind,
              ...(body.baseTurnSequence !== undefined
                ? { baseTurnSequence: body.baseTurnSequence } : {}),
              note: body.note,
            }));
          }
          const branchId = String(segments[3] || "");
          if (!CONVERSATION_ID.test(branchId)) {
            return envelope(rejection("COMPANION_PRODUCT_ROUTE_UNKNOWN"), 404);
          }
          if (method === "POST" && segments[4] === "reroll") {
            return envelope(await service.rerollConversationBranch({ ...scoped, branchId }));
          }
          if (method === "POST" && segments[4] === "entries") {
            return envelope(await service.submitConversationBranchEdit({
              ...scoped,
              branchId,
              content: body.content,
            }));
          }
          if (method === "POST" && segments[4] === "accept") {
            return envelope(await withSummary(await service.acceptConversationBranch({
              ...scoped,
              branchId,
              entryId: body.entryId,
            })));
          }
          if (method === "POST" && segments[4] === "discard") {
            return envelope(await service.discardConversationBranch({ ...scoped, branchId }));
          }
          return envelope(rejection("COMPANION_PRODUCT_ROUTE_UNKNOWN"), 404);
        }
        if (segments[2] === "authors-note") {
          if (method === "GET") {
            return envelope(await service.readAuthorsNote(scoped));
          }
          if (method === "PUT") {
            return envelope(await service.putAuthorsNote({
              ...scoped,
              note: body.note,
              ...(body.depth !== undefined ? { depth: body.depth } : {}),
              ...(body.frequency !== undefined ? { frequency: body.frequency } : {}),
            }));
          }
          return envelope(rejection("COMPANION_PRODUCT_ROUTE_UNKNOWN"), 404);
        }
        if (method === "GET" && segments[2] === "export") {
          return envelope(await service.exportConversation(scoped));
        }
      }
      return envelope(rejection("COMPANION_PRODUCT_ROUTE_UNKNOWN"), 404);
    } catch (error) {
      return envelope(rejection(error?.code || "COMPANION_PRODUCT_OPERATION_FAILED"), 500);
    }
  }

  function metadata() {
    return deepFreeze({
      schemaVersion: `${STARCRAFT_TMG_COMPANION_PRODUCT_MODULE_VERSION}.metadata`,
      apiPrefix,
      httpVersion: STARCRAFT_TMG_COMPANION_PRODUCT_HTTP_VERSION,
      routes: [
        "GET status",
        "GET catalogue",
        "GET persona",
        "PUT persona",
        "POST persona/rollback",
        "GET audit/export",
        "GET audit/verify",
        "POST audit/replay-candidate",
        "GET permissions/surfaces",
        "GET packages/{packageId}/export",
        "POST packages/import",
        "POST conversations (open_or_resume)",
        "GET conversations/active",
        "POST conversations/restore",
        "GET conversations/{id}",
        "POST conversations/{id}/turns",
        "POST conversations/{id}/continue",
        "POST conversations/{id}/checkpoint",
        "POST conversations/{id}/resume",
        "POST conversations/{id}/close",
        "GET conversations/{id}/worldbook",
        "POST conversations/{id}/worldbook",
        "GET conversations/{id}/worldbook/export",
        "POST conversations/{id}/worldbook/import",
        "GET conversations/{id}/memory",
        "POST conversations/{id}/memory/summary",
        "POST conversations/{id}/memory/summary/rollback",
        "POST conversations/{id}/memory/episodic",
        "POST conversations/{id}/memory/relationship",
        "GET conversations/{id}/branches",
        "POST conversations/{id}/branches",
        "POST conversations/{id}/branches/{branchId}/reroll",
        "POST conversations/{id}/branches/{branchId}/entries",
        "POST conversations/{id}/branches/{branchId}/accept",
        "POST conversations/{id}/branches/{branchId}/discard",
        "GET conversations/{id}/authors-note",
        "PUT conversations/{id}/authors-note",
        "GET conversations/{id}/export",
      ],
      registeredPackages: registrations.map((entry) => clone(entry.packageRef)),
      provider: providerStatus().state,
      roomMutationAuthority: false,
      previewConfirmApplyAuthority: false,
      seatTokenPersistence: "never",
      hiddenChainOfThought: "not_collected",
      trainingTruth: false,
    });
  }

  return deepFreeze({
    schemaVersion: STARCRAFT_TMG_COMPANION_PRODUCT_MODULE_VERSION,
    apiPrefix,
    backend,
    service,
    metadata,
    handle,
    trainingTruth: false,
  });
}
