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
    const relationship = await backend.memoryEngine.getRelationshipState(scope);
    return deepFreeze({
      schemaVersion: `${STARCRAFT_TMG_COMPANION_PRODUCT_MODULE_VERSION}.memory-summary`,
      layeredMemory: "cb2_transcript_rolling_summary_relationship",
      transcriptEntries: transcript.length,
      latestSpeakers: transcript.slice(-6).map((entry) => entry.speakerId),
      rollingSummary: rolling.found
        ? {
          summaryVersion: rolling.value.summaryVersion,
          coversTranscriptThrough: rolling.value.coversTranscriptThrough,
        }
        : null,
      rollingSummaryHonesty: rolling.found
        ? "persisted"
        : "not_written_yet_never_fabricated",
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
        "POST conversations (open_or_resume)",
        "GET conversations/active",
        "GET conversations/{id}",
        "POST conversations/{id}/turns",
        "POST conversations/{id}/continue",
        "POST conversations/{id}/checkpoint",
        "POST conversations/{id}/resume",
        "POST conversations/{id}/close",
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
