#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStarcraftTmgAuthoritativeEngine, hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgClientCharacterPresentationRuntimeV2 } from
  "../packages/character-agent/client-character-presentation-runtime-v2.mjs";
import { createStarcraftTmgCharacterAssetGrantAuthorityV1 } from
  "../packages/character-agent/character-asset-grant-v1.mjs";
import {
  assertStarcraftTmgClientCharacterProjectionV2,
} from "../packages/client-domain/character-presentation-projection-v2.mjs";
import { createStarcraftTmgClientDomain } from
  "../packages/client-domain/client-domain-v1.mjs";
import { createInMemoryStarcraftTmgAuthoritativeTransportAdapter } from
  "../packages/client-domain/authoritative-transport-adapters-v1.mjs";
import { createInMemoryStarcraftTmgLifecycleAdapter } from
  "../packages/client-domain/lifecycle-adapters-v1.mjs";
import { createInMemoryStarcraftTmgProjectionStoreAdapter } from
  "../packages/client-domain/projection-store-adapters-v1.mjs";
import { createStarcraftTmgRoomRuntime } from
  "../packages/room-runtime/in-memory-room-v1.mjs";
import {
  createStarcraftTmgVisiblePortraitPlayerV2,
  resolveStarcraftTmgCharacterPortraitAssetUriV2,
} from "../apps/starcraft-tmg-expo/lib/level3/character-presentation-mount-runtime.mjs";
import { createStarcraftTmgLevel3HttpAdapter, STARCRAFT_TMG_LEVEL3_API_PREFIX } from
  "../packages/http-adapter/handler-v1.mjs";
import {
  KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_CATALOG_V1,
  KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_PLAN_V1,
} from "../content/characters/kerrigan-all-era-dynamic-portraits-v1.mjs";
import { KERRIGAN_PERSONA_VISUAL_BINDINGS_V2 } from
  "../content/characters/kerrigan-persona-visual-bindings-v2.mjs";
import { STARCRAFT_TMG_TICKET_13_CHARACTER_PACKAGE_HANDOFF_V1 } from
  "../content/characters/ticket-13-character-package-handoff-v1.mjs";
import { createStarcraftTmgSampleState, loadStarcraftTmgData } from
  "../../scripts/starcraft-tmg-rules-v0.mjs";

const LEVEL3_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_ROOT = path.resolve(LEVEL3_ROOT, "..");
const OUTPUT_DIR = path.join(LEVEL3_ROOT, "build", "ticket-14-slice-133-character-mount-v2");
const REPORT_PATH = path.join(OUTPUT_DIR, "report.json");
const OCCURRED_AT = "2026-09-03T09:30:00.000Z";
const ROOM_ID = "ticket-14-slice-133-room";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function ids(prefix) {
  let sequence = 0;
  return (kind) => `${kind}-${prefix}-${String(sequence += 1).padStart(4, "0")}`;
}

function fakeTimers() {
  let sequence = 0;
  const active = new Map();
  return {
    set(callback, milliseconds) {
      const id = ++sequence;
      active.set(id, { callback, milliseconds });
      return id;
    },
    clear(id) {
      active.delete(id);
    },
    snapshot() {
      return [...active.entries()];
    },
    fire(id) {
      const record = active.get(id);
      if (!record) return;
      active.delete(id);
      record.callback();
    },
  };
}

async function main() {
  const checks = [];
  const failures = [];
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

  const scopeHash = "a".repeat(64);
  let fixtureGrantSequence = 0;
  const fixtureAssetAuthority = createStarcraftTmgCharacterAssetGrantAuthorityV1({
    secret: "slice-133-verifier-character-asset-secret",
    keyId: "slice-133-verifier",
    now: () => OCCURRED_AT,
    createNonce: () => `slice-133-verifier-nonce-${fixtureGrantSequence += 1}`,
  });
  const characterRuntime = createStarcraftTmgClientCharacterPresentationRuntimeV2({
    releaseChannel: "development_internal",
    issueAssetDelivery: (fields) => fixtureAssetAuthority.issue({
      ...fields,
      roomId: "projection-fixture-room",
      seatGrantId: "projection-fixture-grant",
      seatKey: "player1",
      principalScopeHash: scopeHash,
    }),
  });
  let selectorState = characterRuntime.createInitialState({ updatedAt: OCCURRED_AT });
  let defaultProjection = characterRuntime.project(selectorState, {
    principalScopeHash: scopeHash,
    authenticated: true,
  });
  let fullProjection = null;
  let alternateProjection = null;

  await check("frozen_ticket_13_handoff_and_slice_127_v2_are_both_pinned_without_rewriting_history", async () => {
    assert(characterRuntime.pins.ticket13HandoffHash === STARCRAFT_TMG_TICKET_13_CHARACTER_PACKAGE_HANDOFF_V1.handoffHash, "Ticket 13 handoff pin drifted");
    assert(characterRuntime.pins.visualBindingHash === KERRIGAN_PERSONA_VISUAL_BINDINGS_V2.bindingHash, "V2 visual binding pin drifted");
    assert(characterRuntime.pins.allEraPlanHash === KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_PLAN_V1.planHash, "all-era plan pin drifted");
    assert(STARCRAFT_TMG_TICKET_13_CHARACTER_PACKAGE_HANDOFF_V1.frozenIdentities.personaVisualBindingHash !== KERRIGAN_PERSONA_VISUAL_BINDINGS_V2.bindingHash, "V2 silently rewrote the frozen V1 binding");
  });

  await check("default_rank_60_projection_exposes_six_safe_personas_and_two_identity_free_locked_slots", async () => {
    assertStarcraftTmgClientCharacterProjectionV2(defaultProjection, scopeHash);
    const visible = defaultProjection.selector.options.filter((entry) => entry.kind === "persona");
    const locked = defaultProjection.selector.options.filter((entry) => entry.kind === "locked");
    assert(visible.length === 6 && locked.length === 2, `unexpected 60-ceiling denominator: ${visible.length}/${locked.length}`);
    const lockedSerialized = JSON.stringify(locked).toLowerCase();
    for (const forbidden of ["lotv", "xelnaga", "coalition", "ascension", "worldbookid", "personastate", "timeline", "contenthash"]) {
      assert(!lockedSerialized.includes(forbidden), `locked slot leaked ${forbidden}`);
    }
  });

  await check("public_projection_is_asset_free_identity_free_and_rejects_character_mutation", async () => {
    const publicRuntime = createStarcraftTmgClientCharacterPresentationRuntimeV2({ releaseChannel: "public" });
    const projection = publicRuntime.project(selectorState, {
      principalScopeHash: scopeHash,
      authenticated: true,
    });
    assertStarcraftTmgClientCharacterProjectionV2(projection, scopeHash);
    const serialized = JSON.stringify(projection).toLowerCase();
    const knownHashes = KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_CATALOG_V1.flatMap((entry) => [
      entry.manifest.manifestHash,
      ...entry.manifest.frames.map((frame) => frame.contentHash),
    ]);
    assert(!serialized.includes("kerrigan") && !serialized.includes("assets/characters"), "public projection leaked restricted identity or path");
    assert(knownHashes.every((hash) => !serialized.includes(hash)), "public projection leaked a restricted manifest/frame hash");
    assert(!publicRuntime.selectPersona(selectorState, {
      personaWorldbookId: "lotv.xelnaga_epilogue",
      expectedRevision: 0,
      occurredAt: OCCURRED_AT,
    }).ok, "public release mutated a hidden persona selector");
  });

  await check("explicit_spoiler_opt_in_reveals_all_eight_without_a_fixed_capacity_branch", async () => {
    const opened = characterRuntime.setFullSpoilerAccess(selectorState, {
      enabled: true,
      expectedRevision: selectorState.revision,
      occurredAt: OCCURRED_AT,
    });
    assert(opened.ok, `spoiler opt-in failed: ${opened.reason || "unknown"}`);
    selectorState = opened.state;
    fullProjection = characterRuntime.project(selectorState, {
      principalScopeHash: scopeHash,
      authenticated: true,
    });
    assert(fullProjection.selector.options.every((entry) => entry.kind === "persona"), "full ceiling retained a locked identity");
    assert(fullProjection.selector.options.length === 8 && fullProjection.selector.fullCatalogueRevealed, "all-era denominator is not 8/8");
    assert(fullProjection.selector.capacityPolicy === "unbounded_versioned_catalogue_no_fixed_persona_denominator", "selector introduced a fixed eight-item capacity");
  });

  await check("all_eight_personas_bind_distinct_manifests_and_complete_atomic_identity", async () => {
    const manifestHashes = new Set();
    for (const option of fullProjection.selector.options) {
      const selected = characterRuntime.selectPersona(selectorState, {
        personaWorldbookId: option.worldbookId,
        expectedRevision: selectorState.revision,
        occurredAt: OCCURRED_AT,
      });
      assert(selected.ok, `persona selection failed: ${option.worldbookId}`);
      selectorState = selected.state;
      const projection = characterRuntime.project(selectorState, {
        principalScopeHash: scopeHash,
        authenticated: true,
      });
      assertStarcraftTmgClientCharacterProjectionV2(projection, scopeHash);
      assert(projection.bindings.selectedPersonaWorldbookId === option.worldbookId, "selector/binding persona mismatch");
      assert(projection.portrait.manifestHash === projection.bindings.manifestHash, "portrait/binding manifest mismatch");
      assert(projection.portrait.frameRegistry.length === 5, "selected persona did not expose five exact frame roles");
      manifestHashes.add(projection.portrait.manifestHash);
      if (option.slotIndex === 0) alternateProjection = projection;
    }
    assert(manifestHashes.size === 8, `manifest identity denominator drifted: ${manifestHashes.size}`);
    fullProjection = characterRuntime.project(selectorState, {
      principalScopeHash: scopeHash,
      authenticated: true,
    });
  });

  await check("stale_selector_revision_and_cross_binding_tamper_fail_closed", async () => {
    const stale = characterRuntime.selectPersona(selectorState, {
      personaWorldbookId: fullProjection.selector.selectedPersonaWorldbookId,
      expectedRevision: selectorState.revision - 1,
      occurredAt: OCCURRED_AT,
    });
    assert(!stale.ok && stale.reason === "stale_selector_revision", "stale selector CAS was accepted");
    const tampered = JSON.parse(JSON.stringify(fullProjection));
    tampered.bindings.manifestHash = "b".repeat(64);
    let rejected = false;
    try {
      assertStarcraftTmgClientCharacterProjectionV2(tampered, scopeHash);
    } catch (error) {
      rejected = error.code === "CHARACTER_PROJECTION_INVALID";
    }
    assert(rejected, "cross-manifest atomic binding tamper rendered");
  });

  const data = await loadStarcraftTmgData(PROJECT_ROOT);
  const state = createStarcraftTmgSampleState(data);
  state.board.terrain = [];
  state.activeSideKey = "player1";
  const roomRuntime = createStarcraftTmgRoomRuntime({
    authorityEngine: createStarcraftTmgAuthoritativeEngine({ now: () => OCCURRED_AT }),
    now: () => OCCURRED_AT,
    characterReleaseChannel: "development_internal",
  });
  const created = await roomRuntime.createRoom({
    roomId: ROOM_ID,
    gameId: "starcraft-tmg",
    initialStateAuthority: {
      source: "server_factory",
      state,
      dataVersion: data.version,
      receiptHash: hashStarcraftTmgContract({ source: "ticket-14-slice-133", state }),
    },
    serverSeatPlan: [{ label: "host", seatKey: "player1", roleMode: "player", principalType: "human" }],
  });
  assert(created.ok, `fixture room failed: ${created.reason || "unknown"}`);
  const seatToken = created.credentials.host.seatToken;

  await check("character_contracts_are_explicit_opt_in_extensions_and_frozen_defaults_do_not_drift", async () => {
    const baseRuntime = createStarcraftTmgRoomRuntime({
      authorityEngine: createStarcraftTmgAuthoritativeEngine({ now: () => OCCURRED_AT }),
      now: () => OCCURRED_AT,
    });
    const baseRoomId = `${ROOM_ID}-frozen-default`;
    const baseCreated = await baseRuntime.createRoom({
      roomId: baseRoomId,
      gameId: "starcraft-tmg",
      initialStateAuthority: {
        source: "server_factory",
        state,
        dataVersion: data.version,
        receiptHash: hashStarcraftTmgContract({ source: "ticket-14-slice-133-frozen-default", state }),
      },
      serverSeatPlan: [{ label: "host", seatKey: "player1", roleMode: "player", principalType: "human" }],
    });
    assert(baseCreated.ok, "frozen default RoomRuntime fixture failed");
    const stored = await baseRuntime.roomStore.loadRoom(baseRoomId);
    assert(stored.schemaVersion === "starcraft_tmg_room_runtime_v2.aggregate", "RoomRuntime v2 default aggregate version drifted");
    assert(stored.characterSelections === undefined, "RoomRuntime v2 default aggregate gained character extension state");
    assert(typeof baseRuntime.readCharacterPresentation === "undefined"
      && typeof baseRuntime.selectCharacterPersona === "undefined"
      && typeof baseRuntime.setCharacterSpoilerAccess === "undefined"
      && typeof baseRuntime.readCharacterAsset === "undefined", "RoomRuntime v2 default surface gained character extension methods");
    const baseTransport = createInMemoryStarcraftTmgAuthoritativeTransportAdapter({ roomRuntime: baseRuntime });
    let transportRejected = false;
    try {
      await baseTransport.execute({ operation: "read_character_presentation", roomId: baseRoomId });
    } catch (error) {
      transportRejected = error.code === "TRANSPORT_OPERATION_UNSUPPORTED";
    }
    assert(transportRejected, "transport v1 accepted a character operation without explicit extension enablement");
    const baseClient = createStarcraftTmgClientDomain({
      transport: baseTransport,
      projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
      lifecycle: createInMemoryStarcraftTmgLifecycleAdapter(),
      now: () => OCCURRED_AT,
    });
    const baseView = baseClient.read();
    assert(baseView.schemaVersion === "starcraft_tmg_client_domain_v1.view", "frozen Client Domain view version drifted");
    assert(!Object.hasOwn(baseView, "characterPresentation")
      && !Object.hasOwn(baseView, "characterOfflineSnapshot")
      && !Object.hasOwn(baseView, "characterStatus"), "frozen Client Domain view gained extension fields");
    const unsupportedIntent = await baseClient.dispatch({
      type: "select_character_persona",
      personaWorldbookId: "sc1.terran_ghost.pre_tarsonis",
    });
    assert(!unsupportedIntent.ok && unsupportedIntent.rejection.code === "CLIENT_INTENT_UNSUPPORTED", "Client Domain v1 recognized an extension intent without opt-in");
    const baseHttp = createStarcraftTmgLevel3HttpAdapter({ roomRuntime: baseRuntime });
    const baseMetadata = await baseHttp.handle({
      method: "GET",
      pathname: `${STARCRAFT_TMG_LEVEL3_API_PREFIX}/metadata`,
    });
    assert(baseMetadata.status === 200
      && !baseMetadata.response.result.endpoints.some((entry) => entry.includes("character")), "default HTTP metadata advertised Character extension endpoints");
    const baseCharacterRead = await baseHttp.handle({
      method: "GET",
      pathname: `${STARCRAFT_TMG_LEVEL3_API_PREFIX}/rooms/${baseRoomId}/character-presentation`,
      headers: { authorization: `Bearer ${baseCreated.credentials.host.seatToken}` },
    });
    assert(baseCharacterRead.status === 404
      && baseCharacterRead.response.result.reason === "CHARACTER_PRESENTATION_EXTENSION_NOT_ENABLED", "default HTTP adapter did not reject Character routing with a typed response");
    for (const query of [undefined, new URLSearchParams({ grant: "opaque-grant" })]) {
      const baseAssetRead = await baseHttp.handle({
        method: "GET",
        pathname: `/starcraft-tmg-level3/assets/v1/character/${"a".repeat(64)}`,
        ...(query ? { query } : {}),
      });
      assert(baseAssetRead.status === 404
        && baseAssetRead.response.result.reason === "NOT_FOUND", "default HTTP adapter revealed a Character asset route without opt-in");
    }
    const strictExtensionRuntime = createStarcraftTmgRoomRuntime({
      roomStore: baseRuntime.roomStore,
      authorityEngine: createStarcraftTmgAuthoritativeEngine({ now: () => OCCURRED_AT }),
      now: () => OCCURRED_AT,
      characterReleaseChannel: "development_internal",
    });
    const legacyAggregateRead = await strictExtensionRuntime.readCharacterPresentation({
      roomId: baseRoomId,
      seatToken: baseCreated.credentials.host.seatToken,
    });
    assert(!legacyAggregateRead.ok
      && legacyAggregateRead.reason === "CHARACTER_PRESENTATION_AGGREGATE_VERSION_MISMATCH", "Character extension silently mutated or defaulted a frozen base aggregate");
  });
  const extensionStored = await roomRuntime.roomStore.loadRoom(ROOM_ID);
  assert(extensionStored.schemaVersion === "starcraft_tmg_room_runtime_v2.character_presentation_v2.aggregate", "Room character extension did not advertise its aggregate contract");
  const lifecycle = createInMemoryStarcraftTmgLifecycleAdapter({ online: true, visibility: "active" });
  const projectionBacking = new Map();
  const client = createStarcraftTmgClientDomain({
    transport: createInMemoryStarcraftTmgAuthoritativeTransportAdapter({ roomRuntime, enableCharacterPresentation: true }),
    projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter({ backingMap: projectionBacking }),
    lifecycle,
    enableCharacterPresentation: true,
    now: () => OCCURRED_AT,
    createId: ids("web"),
  });

  await check("shared_client_domain_hides_selector_cas_and_persists_one_seat_choice_across_web_and_app", async () => {
    const boot = await client.bootstrap({
      route: { roomId: ROOM_ID },
      principal: { seatToken },
      surface: "expo_web",
      locale: "zh-CN",
    });
    const bootView = client.read();
    assert(
      boot.ok && bootView.characterPresentation?.releaseChannel === "development_internal",
      `Web character mount failed: ${JSON.stringify({
        bootOk: boot.ok,
        bootOutcome: boot.outcome || null,
        phase: bootView.phase,
        characterStatus: bootView.characterStatus,
        rejection: bootView.rejection,
      })}`,
    );
    const reveal = await client.dispatch({ type: "set_character_spoiler_access", enabled: true });
    assert(reveal.ok && reveal.refreshConfirmed, "Client Domain spoiler intent did not refresh authority");
    const selected = await client.dispatch({
      type: "select_character_persona",
      personaWorldbookId: "lotv.xelnaga_epilogue",
    });
    assert(selected.ok && selected.refreshConfirmed, "Client Domain persona intent failed");
    const appClient = createStarcraftTmgClientDomain({
      transport: createInMemoryStarcraftTmgAuthoritativeTransportAdapter({ roomRuntime, enableCharacterPresentation: true }),
      projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
      lifecycle: createInMemoryStarcraftTmgLifecycleAdapter(),
      enableCharacterPresentation: true,
      now: () => OCCURRED_AT,
      createId: ids("app"),
    });
    const appBoot = await appClient.bootstrap({
      route: { roomId: ROOM_ID },
      principal: { seatToken },
      surface: "expo_native",
      locale: "en-US",
    });
    assert(appBoot.ok, "App client bootstrap failed");
    assert(appClient.read().characterPresentation.selector.selectedPersonaWorldbookId === "lotv.xelnaga_epilogue", "Web/App seat selection did not converge");
    assert(appClient.read().characterPresentation.bindings.bindingHash === client.read().characterPresentation.bindings.bindingHash, "Web/App semantic character bindings diverged");
    assert(appClient.read().characterPresentation.portrait.assetDelivery.grantToken !== client.read().characterPresentation.portrait.assetDelivery.grantToken, "ephemeral asset grants were reused across client reads");
  });

  await check("anonymous_viewer_gets_only_public_fallback_even_on_an_internal_development_server", async () => {
    const observer = createStarcraftTmgClientDomain({
      transport: createInMemoryStarcraftTmgAuthoritativeTransportAdapter({ roomRuntime, enableCharacterPresentation: true }),
      projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
      lifecycle: createInMemoryStarcraftTmgLifecycleAdapter(),
      enableCharacterPresentation: true,
      now: () => OCCURRED_AT,
    });
    const result = await observer.bootstrap({ route: { roomId: ROOM_ID }, principal: {}, surface: "expo_web", locale: "en-US" });
    assert(result.ok && observer.read().characterPresentation.releaseChannel === "public", "anonymous viewer received internal character metadata");
    const mutation = await observer.dispatch({ type: "set_character_spoiler_access", enabled: true });
    assert(!mutation.ok && mutation.rejection.code === "CHARACTER_SELECTION_UNAVAILABLE", "anonymous observer mutated persona selection");
  });

  await check("offline_and_background_keep_only_the_current_in_memory_frame_and_block_selection", async () => {
    const beforeHash = client.read().characterPresentation.projectionHash;
    lifecycle.emit({ online: false });
    assert(client.read().phase === "offline_read_only", "offline lifecycle did not become read-only");
    assert(client.read().characterPresentation.projectionHash === beforeHash, "offline transition discarded the safe in-memory character projection");
    const blocked = await client.dispatch({
      type: "select_character_persona",
      personaWorldbookId: "sc1.terran_ghost.pre_tarsonis",
    });
    assert(!blocked.ok && blocked.rejection.code === "OFFLINE_READ_ONLY", "offline persona intent reached authority");
    lifecycle.emit({ online: true, visibility: "background" });
    const backgroundBlocked = await client.dispatch({ type: "set_character_spoiler_access", enabled: false });
    assert(!backgroundBlocked.ok && backgroundBlocked.rejection.code === "OFFLINE_READ_ONLY", "background persona intent reached authority");
    const coldClient = createStarcraftTmgClientDomain({
      transport: createInMemoryStarcraftTmgAuthoritativeTransportAdapter({ roomRuntime, enableCharacterPresentation: true }),
      projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter({ backingMap: projectionBacking }),
      lifecycle: createInMemoryStarcraftTmgLifecycleAdapter({ online: false, visibility: "active" }),
      enableCharacterPresentation: true,
      now: () => OCCURRED_AT,
      createId: ids("cold-offline"),
    });
    const recovered = await coldClient.bootstrap({
      route: { roomId: ROOM_ID },
      principal: { seatToken },
      surface: "expo_native",
      locale: "zh-CN",
    });
    const coldView = coldClient.read();
    assert(recovered.ok && recovered.offline === true, "cold offline client did not recover its viewer cache");
    assert(coldView.characterPresentation === null, "cold offline recovery persisted an expiring asset grant");
    assert(coldView.characterOfflineSnapshot?.selectedPersona?.worldbookId === "lotv.xelnaga_epilogue", "cold offline recovery lost the sealed selected persona");
    const serializedSnapshot = JSON.stringify(coldView.characterOfflineSnapshot);
    assert(!serializedSnapshot.includes("grantToken") && !serializedSnapshot.includes("routeTemplate"), "offline snapshot persisted asset capability material");
    const transientBase = createInMemoryStarcraftTmgAuthoritativeTransportAdapter({
      roomRuntime,
      enableCharacterPresentation: true,
    });
    const transientClient = createStarcraftTmgClientDomain({
      transport: {
        async execute(request) {
          if (request.operation === "read_character_presentation") {
            return { ok: false, reason: "CHARACTER_TEMPORARILY_UNAVAILABLE" };
          }
          return transientBase.execute(request);
        },
      },
      projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter({ backingMap: projectionBacking }),
      lifecycle: createInMemoryStarcraftTmgLifecycleAdapter({ online: true, visibility: "active" }),
      enableCharacterPresentation: true,
      now: () => OCCURRED_AT,
      createId: ids("transient-character"),
    });
    const transientBoot = await transientClient.bootstrap({
      route: { roomId: ROOM_ID },
      principal: { seatToken },
      surface: "expo_web",
      locale: "en-US",
    });
    assert(transientBoot.ok
      && transientClient.read().characterPresentation === null
      && transientClient.read().characterOfflineSnapshot?.selectedPersona?.worldbookId === "lotv.xelnaga_epilogue", "temporary Character failure erased the last-known-good offline snapshot");
    const revokedClient = createStarcraftTmgClientDomain({
      transport: {
        async execute(request) {
          if (request.operation === "read_character_presentation") {
            return { ok: false, reason: "CHARACTER_PRESENTATION_UNAVAILABLE" };
          }
          return transientBase.execute(request);
        },
      },
      projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter({ backingMap: projectionBacking }),
      lifecycle: createInMemoryStarcraftTmgLifecycleAdapter({ online: true, visibility: "active" }),
      enableCharacterPresentation: true,
      now: () => OCCURRED_AT,
      createId: ids("revoked-character"),
    });
    const revokedBoot = await revokedClient.bootstrap({
      route: { roomId: ROOM_ID },
      principal: { seatToken },
      surface: "expo_web",
      locale: "en-US",
    });
    assert(revokedBoot.ok
      && revokedClient.read().characterPresentation === null
      && revokedClient.read().characterOfflineSnapshot === null, "permanent Character withdrawal retained stale internal persona metadata");
  });

  await check("http_character_endpoints_are_bearer_scoped_and_reject_extra_authority_fields", async () => {
    lifecycle.emit({ online: true, visibility: "active" });
    await client.dispatch({ type: "refresh" });
    const http = createStarcraftTmgLevel3HttpAdapter({ roomRuntime });
    const endpoint = `${STARCRAFT_TMG_LEVEL3_API_PREFIX}/rooms/${ROOM_ID}`;
    const read = await http.handle({
      method: "GET",
      pathname: `${endpoint}/character-presentation`,
      headers: { authorization: `Bearer ${seatToken}` },
    });
    assert(read.status === 200 && read.response.result.projection.releaseChannel === "development_internal", "HTTP character read lost bearer scope");
    const rejected = await http.handle({
      method: "POST",
      pathname: `${endpoint}/character-persona`,
      headers: { authorization: `Bearer ${seatToken}` },
      body: { personaWorldbookId: "sc1.terran_ghost.pre_tarsonis", expectedRevision: 10, roleMode: "supervisor" },
    });
    assert(rejected.status === 400 && rejected.response.result.reason === "CLIENT_AUTHORITY_FIELD_REJECTED", "HTTP character endpoint accepted caller authority fields");
  });

  await check("invalid_atomic_character_response_clears_the_picture_without_blocking_room_read", async () => {
    const base = createInMemoryStarcraftTmgAuthoritativeTransportAdapter({ roomRuntime, enableCharacterPresentation: true });
    const malformedClient = createStarcraftTmgClientDomain({
      transport: {
        async execute(request) {
          const result = await base.execute(request);
          if (request.operation !== "read_character_presentation" || !result.ok || result.projection.releaseChannel !== "development_internal") return result;
          const changed = JSON.parse(JSON.stringify(result));
          changed.projection.bindings.manifestHash = "c".repeat(64);
          return changed;
        },
      },
      projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
      lifecycle: createInMemoryStarcraftTmgLifecycleAdapter(),
      enableCharacterPresentation: true,
      now: () => OCCURRED_AT,
    });
    const boot = await malformedClient.bootstrap({ route: { roomId: ROOM_ID }, principal: { seatToken }, surface: "expo_web", locale: "en-US" });
    assert(boot.ok && malformedClient.read().roomProjection?.room?.roomId === ROOM_ID, "optional character failure blocked room projection");
    assert(malformedClient.read().characterPresentation === null, "mismatched character projection remained visible");
    assert(malformedClient.read().characterStatus.rejectionCode === "CHARACTER_PROJECTION_INVALID", "mismatch did not expose a typed fail-closed status");
  });

  await check("character_mutation_response_is_bound_to_intent_receipt_revision_and_authoritative_readback", async () => {
    const base = createInMemoryStarcraftTmgAuthoritativeTransportAdapter({ roomRuntime, enableCharacterPresentation: true });
    const tamperedClient = createStarcraftTmgClientDomain({
      transport: {
        async execute(request) {
          const result = await base.execute(request);
          if (request.operation !== "select_character_persona" || !result.ok) return result;
          const changed = JSON.parse(JSON.stringify(result));
          changed.requestBinding.requestedPersonaWorldbookId = "hots.primal_queen.post_zerus";
          const { requestHash: _oldRequestHash, ...requestCore } = changed.requestBinding;
          changed.requestBinding.requestHash = hashStarcraftTmgContract(requestCore);
          const { responseHash: _oldResponseHash, ...responseCore } = changed;
          changed.responseHash = hashStarcraftTmgContract(responseCore);
          return changed;
        },
      },
      projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
      lifecycle: createInMemoryStarcraftTmgLifecycleAdapter(),
      enableCharacterPresentation: true,
      now: () => OCCURRED_AT,
      createId: ids("mutation-tamper"),
    });
    const boot = await tamperedClient.bootstrap({
      route: { roomId: ROOM_ID },
      principal: { seatToken },
      surface: "expo_web",
      locale: "en-US",
    });
    assert(boot.ok, "mutation-tamper fixture failed to bootstrap");
    const rejected = await tamperedClient.dispatch({
      type: "select_character_persona",
      personaWorldbookId: "sc1.terran_ghost.pre_tarsonis",
    });
    assert(!rejected.ok && rejected.rejection.code === "CHARACTER_SELECTION_RESPONSE_INVALID", "self-consistent wrong-intent mutation response was accepted");
    assert(tamperedClient.read().characterPresentation === null, "invalid mutation response left a portrait visible");
    let mutationCommitted = false;
    let readbackBlocked = false;
    const readbackClient = createStarcraftTmgClientDomain({
      transport: {
        async execute(request) {
          if (mutationCommitted && request.operation === "read_room" && !readbackBlocked) {
            readbackBlocked = true;
            return { ok: false, reason: "READBACK_FIXTURE_REJECTED" };
          }
          const result = await base.execute(request);
          if (request.operation === "select_character_persona" && result.ok) mutationCommitted = true;
          return result;
        },
      },
      projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
      lifecycle: createInMemoryStarcraftTmgLifecycleAdapter(),
      enableCharacterPresentation: true,
      now: () => OCCURRED_AT,
      createId: ids("mutation-readback"),
    });
    assert((await readbackClient.bootstrap({
      route: { roomId: ROOM_ID },
      principal: { seatToken },
      surface: "expo_native",
      locale: "en-US",
    })).ok, "readback fixture failed to bootstrap");
    const unconfirmed = await readbackClient.dispatch({
      type: "select_character_persona",
      personaWorldbookId: "hots.primal_queen.post_zerus",
    });
    assert(!unconfirmed.ok
      && unconfirmed.rejection.code === "CHARACTER_SELECTION_READBACK_MISMATCH"
      && unconfirmed.view.characterPresentation === null,
    "mutation succeeded without authoritative character readback");
    const refreshed = await client.dispatch({ type: "refresh" });
    assert(refreshed.ok, "primary client did not recover after the adversarial mutation fixture");
    const reorderedClient = createStarcraftTmgClientDomain({
      transport: {
        async execute(request) {
          const result = await base.execute(request);
          if (request.operation !== "select_character_persona" || !result.ok) return result;
          const changed = JSON.parse(JSON.stringify(result));
          const event = changed.transition.selectorEvent;
          changed.transition.selectorEvent = {
            occurredAt: event.occurredAt,
            expectedRevision: event.expectedRevision,
            personaWorldbookId: event.personaWorldbookId,
            type: event.type,
          };
          const { transitionHash: _oldTransitionHash, ...transitionCore } = changed.transition;
          changed.transition.transitionHash = hashStarcraftTmgContract(transitionCore);
          const { responseHash: _oldResponseHash, ...responseCore } = changed;
          changed.responseHash = hashStarcraftTmgContract(responseCore);
          return changed;
        },
      },
      projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
      lifecycle: createInMemoryStarcraftTmgLifecycleAdapter(),
      enableCharacterPresentation: true,
      now: () => OCCURRED_AT,
      createId: ids("reordered-selector-event"),
    });
    assert((await reorderedClient.bootstrap({
      route: { roomId: ROOM_ID },
      principal: { seatToken },
      surface: "expo_web",
      locale: "en-US",
    })).ok, "reordered selector-event fixture failed to bootstrap");
    const reorderedAccepted = await reorderedClient.dispatch({
      type: "select_character_persona",
      personaWorldbookId: "sc1.terran_ghost.pre_tarsonis",
    });
    assert(reorderedAccepted.ok && reorderedAccepted.refreshConfirmed, "canonical selector-event validation depended on JSON key insertion order");
    assert((await client.dispatch({ type: "refresh" })).ok, "primary client did not resynchronize after canonical selector-event fixture");
  });

  await check("visible_portrait_player_owns_exactly_one_timer_and_cleans_up_on_stop", async () => {
    const timers = fakeTimers();
    const player = createStarcraftTmgVisiblePortraitPlayerV2({
      setTimeoutImpl: timers.set,
      clearTimeoutImpl: timers.clear,
    });
    const frames = [];
    player.start({ projection: fullProjection, active: true, reducedMotion: false }, (frame) => frames.push(frame));
    assert(player.read().timerCount === 0 && timers.snapshot().length === 0, "portrait timer advanced before the frame loaded");
    assert(player.markLoaded({ generationKey: frames[0].generationKey, contentHash: frames[0].contentHash }), "loaded frame acknowledgement was rejected");
    assert(player.read().timerCount === 1 && timers.snapshot().length === 1, "visible loaded portrait did not own exactly one timer");
    const [firstTimer] = timers.snapshot()[0];
    timers.fire(firstTimer);
    assert(frames.length === 2 && player.read().timerCount === 0 && timers.snapshot().length === 0, "next timer was scheduled before the next frame loaded");
    player.markLoaded({ generationKey: frames[1].generationKey, contentHash: frames[1].contentHash });
    assert(player.read().timerCount === 1 && timers.snapshot().length === 1, "second loaded frame did not schedule exactly one timer");
    assert(player.markFailed({ generationKey: frames[1].generationKey, contentHash: frames[1].contentHash }), "current frame failure was not latched");
    assert(player.read().failed === true && player.read().timerCount === 0, "failed frame kept animating");
    assert(!player.markLoaded({ generationKey: frames[1].generationKey, contentHash: frames[1].contentHash }), "failed frame silently retried without a new projection");
    player.stop();
    assert(player.read().timerCount === 0 && timers.snapshot().length === 0, "portrait timer survived unmount/stop");
  });

  await check("offscreen_background_reduced_motion_and_public_fallback_schedule_zero_timers", async () => {
    const publicProjection = characterRuntime.project(selectorState, {
      principalScopeHash: scopeHash,
      authenticated: false,
    });
    for (const input of [
      { projection: fullProjection, active: false, reducedMotion: false },
      { projection: fullProjection, active: true, reducedMotion: true },
      { projection: publicProjection, active: true, reducedMotion: false },
    ]) {
      const timers = fakeTimers();
      const player = createStarcraftTmgVisiblePortraitPlayerV2({ setTimeoutImpl: timers.set, clearTimeoutImpl: timers.clear });
      player.start(input, () => {});
      assert(player.read().timerCount === 0 && timers.snapshot().length === 0, "inactive/reduced/public view scheduled a timer");
    }
  });

  await check("persona_switch_generation_token_prevents_a_delayed_old_frame_from_overwriting_the_new_portrait", async () => {
    const timers = fakeTimers();
    const player = createStarcraftTmgVisiblePortraitPlayerV2({ setTimeoutImpl: timers.set, clearTimeoutImpl: timers.clear });
    const frames = [];
    player.start({ projection: alternateProjection, active: true, reducedMotion: false }, (frame) => frames.push(frame));
    player.markLoaded({ generationKey: frames[0].generationKey, contentHash: frames[0].contentHash });
    const staleCallback = timers.snapshot()[0][1].callback;
    player.start({ projection: fullProjection, active: true, reducedMotion: false }, (frame) => frames.push(frame));
    const expectedGeneration = frames.at(-1).generationKey;
    const before = frames.length;
    staleCallback();
    assert(frames.length === before && frames.at(-1).generationKey === expectedGeneration, "delayed old persona callback overwrote the new frame");
  });

  await check("asset_uri_uses_only_the_fixed_origin_content_hash_route_and_rejects_unknown_frames", async () => {
    const contentHash = fullProjection.portrait.frameSchedule[0].contentHash;
    const uri = resolveStarcraftTmgCharacterPortraitAssetUriV2(fullProjection, contentHash, { assetOrigin: "https://assets.project-d.invalid" });
    assert(uri === `https://assets.project-d.invalid/starcraft-tmg-level3/assets/v1/character/${contentHash}?grant=${encodeURIComponent(fullProjection.portrait.assetDelivery.grantToken)}`, "asset URI drifted from the fixed signed content-hash route");
    assert(resolveStarcraftTmgCharacterPortraitAssetUriV2(fullProjection, "f".repeat(64), { assetOrigin: "https://assets.project-d.invalid" }) === null, "unknown frame hash produced a URI");
    let rejected = false;
    try {
      resolveStarcraftTmgCharacterPortraitAssetUriV2(fullProjection, contentHash, { assetOrigin: "https://evil.invalid/path?token=x" });
    } catch (error) {
      rejected = error.code === "CHARACTER_ASSET_ORIGIN_INVALID";
    }
    assert(rejected, "untrusted character asset origin was accepted");
  });

  await check("short_opaque_hmac_asset_grant_is_room_seat_rights_ceiling_and_hash_bound", async () => {
    const liveProjection = client.read().characterPresentation;
    const contentHash = liveProjection.portrait.frameSchedule[0].contentHash;
    const grantToken = liveProjection.portrait.assetDelivery.grantToken;
    const grantSegments = grantToken.split(".");
    assert(grantSegments.length === 3
      && grantToken.length < 160
      && !grantToken.includes(ROOM_ID)
      && !grantToken.includes("player1")
      && !grantToken.includes(liveProjection.selector.selectedPersonaWorldbookId), "asset URL capability exposed signed room/seat/persona metadata instead of an opaque handle");
    const base64UrlEdgeAuthority = createStarcraftTmgCharacterAssetGrantAuthorityV1({
      secret: "slice-133-base64url-edge-secret-32-bytes",
      keyId: "slice-133-base64url-edge",
      now: () => OCCURRED_AT,
      createNonce: () => "_slice-133-leading-symbol-handle",
    });
    const edgeDelivery = base64UrlEdgeAuthority.issue({
      roomId: ROOM_ID,
      seatGrantId: "edge-grant",
      seatKey: "player1",
      principalScopeHash: liveProjection.principalScopeHash,
      rightsDecisionHash: liveProjection.rights.rightsDecisionHash,
      characterPackageHash: liveProjection.bindings.characterPackageHash,
      visualBindingHash: liveProjection.bindings.visualBindingHash,
      selectorStateHash: liveProjection.selector.stateHash,
      selectorRevision: liveProjection.selector.revision,
      selectedPersonaWorldbookId: liveProjection.selector.selectedPersonaWorldbookId,
      manifestHash: liveProjection.portrait.manifestHash,
      allowedContentHashes: liveProjection.portrait.frameRegistry.map((frame) => frame.contentHash),
    });
    assert(base64UrlEdgeAuthority.verify({
      grantToken: edgeDelivery.grantToken,
      contentHash,
    }).ok, "valid Base64URL opaque handle with a leading symbol was rejected nondeterministically");
    const internalHttp = createStarcraftTmgLevel3HttpAdapter({ roomRuntime });
    const anonymous = await internalHttp.handle({
      method: "GET",
      pathname: `/starcraft-tmg-level3/assets/v1/character/${contentHash}`,
    });
    assert(anonymous.status === 401 && !anonymous.body, "internal asset route served anonymous hash-only access");
    const served = await internalHttp.handle({
      method: "GET",
      pathname: `/starcraft-tmg-level3/assets/v1/character/${contentHash}`,
      query: new URLSearchParams({ grant: grantToken }),
    });
    assert(
      served.status === 200 && served.binary === true,
      `internal asset route did not return binary PNG bytes: ${JSON.stringify({
        status: served.status,
        result: served.response?.result || null,
      })}`,
    );
    assert(served.headers["content-type"] === "image/png" && served.headers["x-content-sha256"] === contentHash, "asset route lost exact MIME/hash binding");
    assert(createHash("sha256").update(served.body).digest("hex") === contentHash, "served portrait bytes do not match the projected content hash");
    const futureHash = KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_CATALOG_V1
      .find((entry) => entry.manifest.manifestHash !== liveProjection.portrait.manifestHash)
      .manifest.frames[0].contentHash;
    const crossManifest = await internalHttp.handle({
      method: "GET",
      pathname: `/starcraft-tmg-level3/assets/v1/character/${futureHash}`,
      query: new URLSearchParams({ grant: grantToken }),
    });
    assert(crossManifest.status === 403 && !crossManifest.body, "current persona grant disclosed another era asset");
    const tampered = `${grantToken.slice(0, -1)}${grantToken.endsWith("A") ? "B" : "A"}`;
    const tamperedResult = await internalHttp.handle({
      method: "GET",
      pathname: `/starcraft-tmg-level3/assets/v1/character/${contentHash}`,
      query: new URLSearchParams({ grant: tampered }),
    });
    assert(tamperedResult.status === 403 && !tamperedResult.body, "tampered asset grant returned bytes");
    const switched = await client.dispatch({
      type: "select_character_persona",
      personaWorldbookId: "hots.primal_queen.post_zerus",
    });
    assert(switched.ok && switched.refreshConfirmed, "asset-grant invalidation fixture could not switch persona");
    const staleAfterSwitch = await internalHttp.handle({
      method: "GET",
      pathname: `/starcraft-tmg-level3/assets/v1/character/${contentHash}`,
      query: new URLSearchParams({ grant: grantToken }),
    });
    assert(staleAfterSwitch.status === 403 && !staleAfterSwitch.body, "persona switch did not revoke the prior asset grant");
    let grantClock = OCCURRED_AT;
    const expiringAuthority = createStarcraftTmgCharacterAssetGrantAuthorityV1({
      secret: "slice-133-expiry-verifier-secret-32-bytes",
      keyId: "slice-133-expiry",
      ttlMs: 90_000,
      now: () => grantClock,
      createNonce: () => "slice-133-expiry-nonce",
    });
    const expiringDelivery = expiringAuthority.issue({
      roomId: ROOM_ID,
      seatGrantId: "expiry-grant",
      seatKey: "player1",
      principalScopeHash: liveProjection.principalScopeHash,
      rightsDecisionHash: liveProjection.rights.rightsDecisionHash,
      characterPackageHash: liveProjection.bindings.characterPackageHash,
      visualBindingHash: liveProjection.bindings.visualBindingHash,
      selectorStateHash: liveProjection.selector.stateHash,
      selectorRevision: liveProjection.selector.revision,
      selectedPersonaWorldbookId: liveProjection.selector.selectedPersonaWorldbookId,
      manifestHash: liveProjection.portrait.manifestHash,
      allowedContentHashes: liveProjection.portrait.frameRegistry.map((frame) => frame.contentHash),
    });
    grantClock = "2026-09-03T09:32:00.001Z";
    const expired = expiringAuthority.verify({ grantToken: expiringDelivery.grantToken, contentHash });
    assert(!expired.ok && expired.reason === "CHARACTER_ASSET_GRANT_EXPIRED", "expired asset grant was accepted");
    const publicHttp = createStarcraftTmgLevel3HttpAdapter({
      roomRuntime: createStarcraftTmgRoomRuntime({ characterReleaseChannel: "public" }),
    });
    const blocked = await publicHttp.handle({
      method: "GET",
      pathname: `/starcraft-tmg-level3/assets/v1/character/${contentHash}`,
      query: new URLSearchParams({ grant: grantToken }),
    });
    assert(blocked.status === 403 && !blocked.body, "public runtime served restricted character bytes");
  });

  await check("tracked_expo_match_and_settings_mount_real_shared_components_without_node_or_provider_dependencies", async () => {
    const files = [
      "apps/starcraft-tmg-expo/app/(tabs)/match.tsx",
      "apps/starcraft-tmg-expo/app/(tabs)/settings.tsx",
      "apps/starcraft-tmg-expo/components/character/tactical-adjutant-panel.tsx",
      "apps/starcraft-tmg-expo/components/character/character-persona-settings-panel.tsx",
      "apps/starcraft-tmg-expo/lib/level3/character-presentation-mount-runtime.mjs",
      "packages/client-domain/character-presentation-projection-v2.mjs",
    ];
    const source = Object.fromEntries(await Promise.all(files.map(async (relative) => [
      relative,
      await readFile(path.join(LEVEL3_ROOT, relative), "utf8"),
    ])));
    assert(source[files[0]].includes("<TacticalAdjutantPanel />"), "Match did not mount the Adjutant component");
    assert(source[files[1]].includes("<CharacterPersonaSettingsPanel />"), "Settings did not mount the persona component");
    const reachable = Object.values(source).join("\n");
    for (const forbidden of ["node:crypto", "node:util", "openai-compatible-provider", "/invoke", "assets/characters/", "KERRIGAN_"]) {
      assert(!reachable.includes(forbidden), `Expo reachable character graph contains forbidden dependency/content: ${forbidden}`);
    }
    assert(reachable.includes("useIsFocused") && reachable.includes("useReducedMotion"), "actual mount omitted route focus or runtime reduced-motion handling");
    assert(!reachable.includes("Image.prefetch")
      && reachable.includes("markLoaded")
      && reachable.includes("markFailed"), "actual mount omitted preload/load-gated playback or failure latching");
  });

  await check("slice_runs_no_provider_skill_dsh_muzero_self_play_or_training_authority", async () => {
    assert(defaultProjection.capabilities.runProvider === false, "projection enabled Provider execution");
    assert(defaultProjection.capabilities.generateSkill === false, "projection enabled Skill generation");
    assert(defaultProjection.capabilities.createTrainingTruth === false && defaultProjection.trainingTruth === false, "projection claimed training truth");
  });

  const reportCore = {
    schemaVersion: "starcraft_tmg_ticket_14_slice_133_character_mount_verification_v2",
    generatedAt: OCCURRED_AT,
    ticket: 14,
    slice: 133,
    status: failures.length ? "failed" : "passed",
    assertionsPassed: checks.filter((entry) => entry.passed).length,
    assertionsTotal: checks.length,
    checks,
    failures,
    denominator: {
      configuredPersonaCount: 8,
      defaultVisiblePersonaCount: 6,
      defaultIdentityFreeLockedSlotCount: 2,
      fullOptInPersonaCount: 8,
      dynamicManifestCount: 8,
      frameRoleCountPerManifest: 5,
      totalFrameCount: 40,
      selectorCapacityPolicy: "unbounded_versioned_catalogue_no_fixed_persona_denominator",
    },
    evidence: {
      ticket13HandoffHash: characterRuntime.pins.ticket13HandoffHash,
      visualBindingV2Hash: characterRuntime.pins.visualBindingHash,
      defaultProjectionHash: defaultProjection.projectionHash,
      allEraProjectionHash: fullProjection?.projectionHash || null,
      webAppSharedProjectionVerified: true,
      publicAssetIdentityLeakCount: 0,
      visibleTimerUpperBound: 1,
      reducedMotionTimerCount: 0,
      backgroundTimerCount: 0,
      internalAssetBytesHashVerified: true,
      publicAssetBytesServed: 0,
      productComponentMountVerified: true,
      realBrowserEvidenceVerified: false,
      realDeviceEvidenceVerified: false,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: [],
      harnessToolsCalled: ["read_character_presentation", "select_character_persona", "set_character_spoiler_access"],
      uiTraceEvidence: ["shared_expo_match_panel", "shared_expo_settings_selector", "visible_only_idle_portrait_player"],
      agentDecisionEvidence: [],
      memoryTraceEvidence: [],
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "character_atomic_binding_drift_clears_the_picture",
        "public_or_anonymous_scope_falls_back_without_identity_or_assets",
        "background_offscreen_offline_or_reduced_motion_stops_all_portrait_timers",
      ],
      userVisibleChecks: [
        "rank_60_hides_later_persona_identity_until_explicit_spoiler_opt_in",
        "one_selected_persona_animates_only_while_visible",
        "web_and_app_share_the_same_seat_scoped_selection_hash",
      ],
    },
    sourceRefreshPerformed: false,
    providerCalled: false,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingPromotion: false,
    productionReady: false,
    trainingTruth: false,
  };
  const report = { ...reportCore, reportHash: sha256(JSON.stringify(reportCore)) };
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (failures.length) throw new Error(failures.join("\n"));
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
