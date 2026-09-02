#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createStarcraftTmgAuthoritativeEngine,
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgRoomRuntime } from "../packages/room-runtime/in-memory-room-v1.mjs";
import {
  createHttpStarcraftTmgAuthoritativeTransportAdapter,
  createInMemoryStarcraftTmgAuthoritativeTransportAdapter,
  StarcraftTmgClientTransportError,
} from "../packages/client-domain/authoritative-transport-adapters-v1.mjs";
import {
  createStarcraftTmgClientDomain,
  STARCRAFT_TMG_CLIENT_DOMAIN_INTERFACE,
} from "../packages/client-domain/client-domain-v1.mjs";
import {
  createBrowserStarcraftTmgLifecycleAdapter,
  createExpoStarcraftTmgLifecycleAdapter,
  createInMemoryStarcraftTmgLifecycleAdapter,
} from "../packages/client-domain/lifecycle-adapters-v1.mjs";
import {
  createAsyncStorageStarcraftTmgProjectionStoreAdapter,
  createInMemoryStarcraftTmgProjectionStoreAdapter,
} from "../packages/client-domain/projection-store-adapters-v1.mjs";
import { hashStarcraftTmgClientContract } from "../packages/client-domain/portable-contract-hash-v1.mjs";
import {
  createStarcraftTmgLevel3HttpAdapter,
} from "../packages/http-adapter/handler-v1.mjs";
import {
  createStarcraftTmgSampleState,
  loadStarcraftTmgData,
} from "../../scripts/starcraft-tmg-rules-v0.mjs";

const LEVEL3_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_ROOT = path.resolve(LEVEL3_ROOT, "..");
const OUTPUT_DIR = path.join(LEVEL3_ROOT, "build", "ticket-14-slice-129-client-domain-v1");
const REPORT_PATH = path.join(OUTPUT_DIR, "report.json");
const PREVIEW_PATH = path.join(OUTPUT_DIR, "preview.html");
const OCCURRED_AT = "2026-09-03T06:00:00.000Z";
const ROOM_ID = "ticket-14-slice-129-room";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function deterministicIdFactory(prefix = "slice129") {
  let sequence = 0;
  return (kind) => `${kind}-${prefix}-${String(sequence += 1).padStart(4, "0")}`;
}

function movementParameters(domain, deltaY = -500) {
  return {
    path: [
      { ...domain.constraints.start },
      {
        xMilliInches: domain.constraints.start.xMilliInches,
        yMilliInches: domain.constraints.start.yMilliInches + Math.trunc(deltaY / 2),
      },
      {
        xMilliInches: domain.constraints.start.xMilliInches,
        yMilliInches: domain.constraints.start.yMilliInches + deltaY,
      },
    ],
  };
}

function createEventTarget(initial = {}) {
  const listeners = new Map();
  return {
    ...initial,
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    emit(type) {
      for (const listener of [...(listeners.get(type) || [])]) listener();
    },
    listenerCount(type) {
      return listeners.get(type)?.size || 0;
    },
  };
}

function previewHtml(report) {
  const rows = report.checks.map((check) => `<li><span>${check.passed ? "PASS" : "FAIL"}</span>${check.id}</li>`).join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ticket 14 Slice 129 — Client Domain Module</title>
<style>
:root{color-scheme:dark;font-family:ui-sans-serif,system-ui;background:#071018;color:#d8edf6}body{margin:0;padding:32px;background:radial-gradient(circle at 20% 0,#163545,#071018 48%)}main{max-width:1080px;margin:auto}.status{color:#7cf7cf;text-transform:uppercase;letter-spacing:.14em}.flow{display:grid;grid-template-columns:1fr auto 1.3fr auto 1fr;gap:12px;align-items:center;margin:28px 0}.box{border:1px solid #2d6072;background:#0c1a24;padding:18px;border-radius:12px;min-height:118px}.deep{border-color:#76d8ff;box-shadow:0 0 30px #1c90b633}.arrow{color:#76d8ff;font-size:26px}code{color:#93e7ff}ul{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:8px;padding:0}li{list-style:none;background:#0c1a24;border:1px solid #1f4655;padding:10px;border-radius:8px}li span{color:#7cf7cf;margin-right:10px;font-size:.75rem}small{color:#85a7b5}</style></head>
<body><main><p class="status">${report.status} · ${report.assertionsPassed}/${report.assertionsTotal}</p><h1>One client domain, three internal seams</h1>
<div class="flow"><div class="box"><b>Expo / Battle Lab</b><p><code>bootstrap · read · dispatch · subscribe</code></p></div><div class="arrow">→</div><div class="box deep"><b>Client Domain Module</b><p>typed intents, viewer projection, cache integrity, revision, reconnect, confirmation, lease, idempotency</p></div><div class="arrow">→</div><div class="box"><b>Authoritative Referee</b><p>LegalSpace · Preview · Confirm · Apply · Replay</p></div></div>
<p><small>HTTP/in-memory transport · AsyncStorage/in-memory projection store · Browser/Expo/in-memory lifecycle. No Rules, source, Provider, Skill, DSH, MuZero or training authority.</small></p><ul>${rows}</ul></main></body></html>`;
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

  const data = await loadStarcraftTmgData(PROJECT_ROOT);
  const state = createStarcraftTmgSampleState(data);
  state.board.terrain = [];
  state.activeSideKey = "player1";
  const engine = createStarcraftTmgAuthoritativeEngine({ now: () => OCCURRED_AT });
  const runtime = createStarcraftTmgRoomRuntime({ authorityEngine: engine, now: () => OCCURRED_AT });
  const created = await runtime.createRoom({
    roomId: ROOM_ID,
    gameId: "starcraft-tmg",
    surfaceMode: "classic",
    initialStateAuthority: {
      source: "server_factory",
      state,
      dataVersion: data.version,
      receiptHash: hashStarcraftTmgContract({ source: "ticket-14-slice-129", state }),
    },
    serverSeatPlan: [
      { label: "host", seatKey: "player1", roleMode: "player", principalType: "human" },
    ],
  });
  assert(created.ok, `fixture room failed: ${created.reason || "unknown"}`);
  const seatToken = created.credentials.host.seatToken;
  const backingMap = new Map();
  const store = createInMemoryStarcraftTmgProjectionStoreAdapter({ backingMap });
  const lifecycle = createInMemoryStarcraftTmgLifecycleAdapter({ online: true, visibility: "active" });
  const baseTransport = createInMemoryStarcraftTmgAuthoritativeTransportAdapter({ roomRuntime: runtime });
  const transportCalls = [];
  const transport = {
    async execute(request) {
      transportCalls.push({ operation: request.operation, hasSeatToken: Boolean(request.seatToken), payload: request.payload });
      return baseTransport.execute(request);
    },
  };
  const client = createStarcraftTmgClientDomain({
    transport,
    projectionStore: store,
    lifecycle,
    now: () => OCCURRED_AT,
    createId: deterministicIdFactory("primary"),
  });
  const observedViews = [];
  const unsubscribe = client.subscribe((view) => observedViews.push(view));
  let legalSpace;
  let acceptedReceipt;

  await check("portable_rfc8785_sha256_matches_the_authoritative_node_hash", async () => {
    const probes = [
      { z: 1, a: [true, null, "凯瑞甘"] },
      { number: -0, nested: { beta: 2, alpha: 1 } },
      ["web", "app", { revision: 0 }],
      { multiBlock: "凯瑞甘".repeat(300), values: Array.from({ length: 96 }, (_unused, index) => index) },
    ];
    for (const probe of probes) {
      assert(hashStarcraftTmgClientContract(probe) === hashStarcraftTmgContract(probe), "portable hash drifted from authority hash");
    }
  });

  await check("the_deep_module_exposes_exactly_bootstrap_read_dispatch_and_subscribe", async () => {
    assert(Object.keys(client).sort().join("/") === [...STARCRAFT_TMG_CLIENT_DOMAIN_INTERFACE].sort().join("/"), "Client Domain interface widened");
    assert(!("transport" in client) && !("projectionStore" in client) && !("lifecycle" in client), "internal seam leaked through interface");
  });

  await check("bootstrap_reads_a_viewer_scoped_projection_and_writes_an_integrity_bound_cache", async () => {
    const result = await client.bootstrap({
      route: { roomId: ROOM_ID },
      principal: { seatToken },
      surface: "expo_web",
      locale: "zh-CN",
    });
    assert(result.ok && result.outcome === "projection_refreshed", `bootstrap failed: ${result.rejection?.code || "unknown"}`);
    const view = client.read();
    assert(view.phase === "ready" && view.roomProjection.viewer.seatKey === "player1", "viewer projection binding mismatch");
    assert(view.roomProjection.room.stateRevision === 0 && view.capabilities.authoritativeMutation === false, "client overclaimed authority");
    assert(observedViews.length >= 3, "subscription did not observe bind/load/ready progress");
    const serializedView = JSON.stringify(view);
    const serializedCache = JSON.stringify([...backingMap.values()]);
    assert(!serializedView.includes(seatToken) && !serializedCache.includes(seatToken), "SeatGrant credential leaked into projection or cache");
    const record = [...backingMap.values()][0];
    const { integrityHash, ...core } = record;
    assert(integrityHash === hashStarcraftTmgClientContract(core), "projection cache integrity hash mismatch");
  });

  await check("caller_owned_state_side_role_confirmation_rng_rules_source_and_provider_fields_fail_before_transport", async () => {
    let calls = 0;
    const guarded = createStarcraftTmgClientDomain({
      transport: { execute: async () => { calls += 1; throw new Error("must not be called"); } },
      projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
      lifecycle: createInMemoryStarcraftTmgLifecycleAdapter(),
      now: () => OCCURRED_AT,
    });
    const rejectedBootstrap = await guarded.bootstrap({
      route: { roomId: ROOM_ID },
      principal: { seatToken },
      roleMode: "player1",
    });
    assert(!rejectedBootstrap.ok && rejectedBootstrap.rejection.code === "CLIENT_AUTHORITY_FIELD_REJECTED", "caller role was not rejected");
    for (const intent of [
      { type: "refresh", state: {} },
      { type: "load_legal_space", sideKey: "player1" },
      { type: "confirm_and_apply_preview", previewId: "x", confirmed: true },
      { type: "preview_parameterized", domainId: "x", parameters: { rngSeed: 7 } },
      { type: "refresh", rulesOverride: {} },
      { type: "refresh", sourceOverride: {} },
      { type: "refresh", providerCredential: "secret" },
    ]) {
      const rejected = await guarded.dispatch(intent);
      assert(!rejected.ok && rejected.rejection.code === "CLIENT_AUTHORITY_FIELD_REJECTED", `authority intent escaped: ${JSON.stringify(intent)}`);
    }
    assert(calls === 0, "forbidden caller fields reached the transport");
    const currentRoomId = client.read().locator.roomId;
    const liveBefore = transportCalls.length;
    const rejectedRebind = await client.bootstrap({ route: { roomId: "forged-room" }, principal: { seatToken }, sideKey: "player2" });
    assert(!rejectedRebind.ok && rejectedRebind.rejection.code === "CLIENT_AUTHORITY_FIELD_REJECTED", "invalid live rebind was accepted");
    assert(client.read().locator.roomId === currentRoomId && client.read().phase === "ready", "invalid rebind damaged the current valid session");
    assert(transportCalls.length === liveBefore, "invalid live rebind reached transport");
  });

  await check("legal_space_and_parameter_domains_are_revision_bound_and_unknown_candidates_never_reach_transport", async () => {
    const loaded = await client.dispatch({ type: "load_legal_space" });
    assert(loaded.ok, `LegalSpace load failed: ${loaded.rejection?.code || "unknown"}`);
    legalSpace = client.read().legalSpace;
    assert(legalSpace.stateRevision === 0 && legalSpace.legalSpaceHash, "LegalSpace revision/hash missing");
    const before = transportCalls.length;
    const rejected = await client.dispatch({
      type: "preview_parameterized",
      domainId: "not-in-rules-owned-space",
      parameters: { path: [] },
    });
    assert(!rejected.ok && rejected.rejection.code === "UNCHECKED_ACTION_REJECTED", "unknown domain was not rejected");
    assert(transportCalls.length === before, "unknown domain reached authoritative transport");
  });

  await check("a_rules_owned_parameter_domain_produces_a_sealed_preview_without_client_mutation", async () => {
    const moveDomain = legalSpace.parameterDomains.find((domain) => domain.actionType === "move");
    assert(moveDomain, "fixture LegalSpace has no movement parameter domain");
    const beforeRevision = client.read().roomProjection.room.stateRevision;
    const result = await client.dispatch({
      type: "preview_parameterized",
      domainId: moveDomain.domainId,
      parameters: movementParameters(moveDomain),
    });
    assert(result.ok && result.confirmationRequired === true, `preview failed: ${result.rejection?.code || "unknown"}`);
    assert(client.read().pendingPreview.previewToken.startsWith("sc-preview-"), "sealed preview token missing");
    assert(client.read().roomProjection.room.stateRevision === beforeRevision, "preview mutated projected rules state");
  });

  await check("one_human_intent_hides_confirm_control_lease_idempotency_apply_and_refresh", async () => {
    const previewId = client.read().pendingPreview.previewId;
    const before = transportCalls.length;
    const result = await client.dispatch({ type: "confirm_and_apply_preview", previewId });
    assert(result.ok && result.outcome === "authoritative_receipt_applied", `apply failed: ${result.rejection?.code || "unknown"}`);
    acceptedReceipt = result.receipt;
    const sequence = transportCalls.slice(before).map((entry) => entry.operation).join("/");
    assert(sequence === "confirm_preview/claim_control/apply_action/read_room", `hidden authority sequence drifted: ${sequence}`);
    assert(acceptedReceipt.preStateRevision === 0 && acceptedReceipt.postStateRevision === 1, "receipt revision mismatch");
    assert(acceptedReceipt.refereeSignature.signatureAlgorithm === "ed25519", "receipt lost long-term signature");
    assert(client.read().roomProjection.room.stateRevision === 1 && client.read().pendingPreview === null, "accepted apply did not refresh projection");
    const applyCall = transportCalls.findLast((entry) => entry.operation === "apply_action");
    assert(applyCall.payload.idempotencyKey.startsWith("sc-client-apply-") && applyCall.payload.expectedStateRevision === 0, "client module did not own idempotency/revision");
  });

  await check("replay_is_verified_against_the_current_authoritative_revision", async () => {
    const result = await client.dispatch({ type: "read_replay" });
    assert(result.ok && result.replay.matchesCurrent === true, `replay failed: ${result.rejection?.code || "unknown"}`);
    assert(result.replay.receiptCount === 1 && result.replay.stateRevision === 1, "replay denominator mismatch");
  });

  await check("offline_bootstrap_recovers_only_the_same_viewer_cache_and_blocks_all_authority_operations", async () => {
    const offlineLifecycle = createInMemoryStarcraftTmgLifecycleAdapter({ online: false, visibility: "active" });
    let offlineTransportCalls = 0;
    const offlineClient = createStarcraftTmgClientDomain({
      transport: { execute: async () => { offlineTransportCalls += 1; throw new StarcraftTmgClientTransportError("NETWORK_UNAVAILABLE", "offline"); } },
      projectionStore: store,
      lifecycle: offlineLifecycle,
      now: () => OCCURRED_AT,
    });
    const recovered = await offlineClient.bootstrap({ route: { roomId: ROOM_ID }, principal: { seatToken }, surface: "expo_native" });
    assert(recovered.ok && recovered.offline === true && offlineClient.read().phase === "offline_read_only", "offline cache recovery failed");
    assert(offlineClient.read().roomProjection.room.stateRevision === 1, "offline cache did not retain latest authoritative projection");
    const blocked = await offlineClient.dispatch({ type: "load_legal_space" });
    assert(!blocked.ok && blocked.rejection.code === "OFFLINE_READ_ONLY", "offline client reached LegalSpace");
    assert(offlineTransportCalls === 0, "known-offline lifecycle still called transport");
    const otherPrincipal = createStarcraftTmgClientDomain({
      transport: { execute: async () => { throw new StarcraftTmgClientTransportError("NETWORK_UNAVAILABLE", "offline"); } },
      projectionStore: store,
      lifecycle: offlineLifecycle,
      now: () => OCCURRED_AT,
    });
    const isolated = await otherPrincipal.bootstrap({ route: { roomId: ROOM_ID }, principal: { seatToken: `${seatToken}-other` } });
    assert(!isolated.ok && isolated.rejection.code === "PROJECTION_CACHE_MISS", "another principal reused the viewer cache");
  });

  await check("tampered_projection_cache_fails_integrity_instead_of_restoring_room_state", async () => {
    const tamperedMap = new Map([...backingMap.entries()].map(([key, value]) => [key, JSON.parse(JSON.stringify(value))]));
    const record = [...tamperedMap.values()][0];
    record.projection.room.stateRevision = 999;
    const tampered = createStarcraftTmgClientDomain({
      transport: { execute: async () => { throw new StarcraftTmgClientTransportError("NETWORK_UNAVAILABLE", "offline"); } },
      projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter({ backingMap: tamperedMap }),
      lifecycle: createInMemoryStarcraftTmgLifecycleAdapter({ online: false }),
      now: () => OCCURRED_AT,
    });
    const result = await tampered.bootstrap({ route: { roomId: ROOM_ID }, principal: { seatToken } });
    assert(!result.ok && result.rejection.code === "PROJECTION_CACHE_INTEGRITY_FAILED", "tampered cache was accepted");
    assert(tampered.read().roomProjection === null, "tampered cache became a client projection");
  });

  await check("lifecycle_background_is_read_only_and_foreground_serially_revalidates_authority", async () => {
    const before = transportCalls.filter((entry) => entry.operation === "read_room").length;
    lifecycle.emit({ visibility: "background" });
    assert(client.read().phase === "offline_read_only" && client.read().legalSpace === null, "background lifecycle remained mutable");
    lifecycle.emit({ visibility: "active" });
    await client.dispatch({ type: "refresh" });
    const after = transportCalls.filter((entry) => entry.operation === "read_room").length;
    assert(client.read().phase === "ready" && after >= before + 2, "foreground did not queue revalidation before explicit work");
  });

  await check("http_and_in_memory_transport_adapters_drive_the_same_client_interface", async () => {
    const httpServer = createStarcraftTmgLevel3HttpAdapter({ roomRuntime: runtime });
    const fakeFetch = async (url, init = {}) => {
      const parsed = new URL(url);
      const handled = await httpServer.handle({
        method: init.method || "GET",
        pathname: parsed.pathname,
        query: parsed.searchParams,
        headers: init.headers || {},
        body: init.body ? JSON.parse(init.body) : {},
      });
      return { status: handled.status, text: async () => JSON.stringify(handled.response) };
    };
    const httpClient = createStarcraftTmgClientDomain({
      transport: createHttpStarcraftTmgAuthoritativeTransportAdapter({ baseUrl: "https://level3.invalid", fetchImpl: fakeFetch }),
      projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
      lifecycle: createInMemoryStarcraftTmgLifecycleAdapter(),
      now: () => OCCURRED_AT,
    });
    const bootstrapped = await httpClient.bootstrap({ route: { roomId: ROOM_ID }, principal: { seatToken }, surface: "battle_lab" });
    assert(bootstrapped.ok && httpClient.read().roomProjection.room.stateRevision === 1, "HTTP transport projection parity failed");
    const listed = await httpClient.dispatch({ type: "load_legal_space" });
    assert(listed.ok && httpClient.read().legalSpace.stateRevision === 1, "HTTP transport LegalSpace parity failed");
  });

  await check("async_storage_adapter_round_trips_bounded_json_without_credential_material", async () => {
    const raw = new Map();
    const asyncStorage = {
      async getItem(key) { return raw.has(key) ? raw.get(key) : null; },
      async setItem(key, value) { raw.set(key, value); },
      async removeItem(key) { raw.delete(key); },
    };
    const adapter = createAsyncStorageStarcraftTmgProjectionStoreAdapter({ asyncStorage });
    const key = "a".repeat(64);
    const record = { schemaVersion: "probe", projection: { room: { stateRevision: 1 } } };
    await adapter.save(key, record);
    assert(JSON.stringify(await adapter.load(key)) === JSON.stringify(record), "AsyncStorage round trip failed");
    assert(![...raw.values()].join("").includes(seatToken), "AsyncStorage probe leaked a SeatGrant credential");
    await adapter.remove(key);
    assert(await adapter.load(key) === null, "AsyncStorage removal failed");
  });

  await check("browser_and_expo_lifecycle_adapters_emit_platform_state_without_domain_authority", async () => {
    const documentRef = createEventTarget({ visibilityState: "visible" });
    const windowRef = createEventTarget();
    const navigatorRef = { onLine: true };
    const browser = createBrowserStarcraftTmgLifecycleAdapter({ documentRef, windowRef, navigatorRef });
    const browserEvents = [];
    const stopBrowser = browser.subscribe((snapshot) => browserEvents.push(snapshot));
    documentRef.visibilityState = "hidden";
    documentRef.emit("visibilitychange");
    navigatorRef.onLine = false;
    windowRef.emit("offline");
    assert(browserEvents.at(-1).online === false && browserEvents.at(-1).visibility === "background", "browser lifecycle mapping failed");
    stopBrowser();
    assert(documentRef.listenerCount("visibilitychange") === 0, "browser lifecycle listener leaked");

    let appListener = null;
    let networkListener = null;
    let expoOnline = true;
    const appState = {
      currentState: "active",
      addEventListener(_type, listener) {
        appListener = listener;
        return { remove() { appListener = null; } };
      },
    };
    const expo = createExpoStarcraftTmgLifecycleAdapter({
      appState,
      readOnline: () => expoOnline,
      subscribeOnline(listener) {
        networkListener = listener;
        return () => { networkListener = null; };
      },
    });
    const expoEvents = [];
    const stopExpo = expo.subscribe((snapshot) => expoEvents.push(snapshot));
    appState.currentState = "background";
    appListener();
    assert(expoEvents.at(-1).visibility === "background", "Expo AppState mapping failed");
    appState.currentState = "active";
    expoOnline = false;
    networkListener();
    assert(expoEvents.at(-1).online === false && expoEvents.at(-1).visibility === "active", "Expo network mapping failed");
    stopExpo();
    assert(appListener === null && networkListener === null, "Expo lifecycle listener leaked");
  });

  await check("concurrent_callers_are_serialized_behind_the_four_operation_interface", async () => {
    const projection = client.read().roomProjection;
    let active = 0;
    let maximumActive = 0;
    const serialTransport = {
      async execute(request) {
        assert(request.operation === "read_room", "serialization probe received an unexpected operation");
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        await new Promise((resolve) => setTimeout(resolve, 3));
        active -= 1;
        return { ok: true, projection };
      },
    };
    const serialClient = createStarcraftTmgClientDomain({
      transport: serialTransport,
      projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
      lifecycle: createInMemoryStarcraftTmgLifecycleAdapter(),
      now: () => OCCURRED_AT,
    });
    await serialClient.bootstrap({ route: { roomId: ROOM_ID } });
    await Promise.all([
      serialClient.dispatch({ type: "refresh" }),
      serialClient.dispatch({ type: "refresh" }),
      serialClient.dispatch({ type: "refresh" }),
    ]);
    assert(maximumActive === 1, `Client Domain ran ${maximumActive} concurrent transport calls`);
  });

  await check("an_interrupted_apply_never_retries_silently_and_marks_the_authoritative_outcome_uncertain", async () => {
    const legalHash = "b".repeat(64);
    const projection = {
      room: { roomId: "uncertain-room", stateRevision: 0, stateHash: "c".repeat(64) },
      viewer: { capabilities: ["read_room", "read_legal_space", "preview", "confirm", "apply"] },
      state: {},
      training: { trainingTruth: false },
    };
    let applyCalls = 0;
    const interruptedTransport = {
      async execute(request) {
        if (request.operation === "read_room") return { ok: true, projection };
        if (request.operation === "read_legal_space") return {
          ok: true,
          legalSpace: { stateRevision: 0, legalSpaceHash: legalHash, finiteActions: [{ actionKey: "finite-1" }], parameterDomains: [] },
        };
        if (request.operation === "preview_action") return {
          ok: true,
          preview: { previewId: "preview-1", previewToken: "sc-preview-1.seal", core: { expectedStateRevision: 0, legalSpaceHash: legalHash } },
        };
        if (request.operation === "confirm_preview") return { ok: true, confirmation: { confirmationId: "confirmation-1" } };
        if (request.operation === "claim_control") return { ok: true, controlLease: { leaseId: "lease-1", leaseFence: 1 } };
        applyCalls += 1;
        throw new StarcraftTmgClientTransportError("NETWORK_UNAVAILABLE", "connection dropped after send");
      },
    };
    const interrupted = createStarcraftTmgClientDomain({
      transport: interruptedTransport,
      projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
      lifecycle: createInMemoryStarcraftTmgLifecycleAdapter(),
      now: () => OCCURRED_AT,
      createId: deterministicIdFactory("uncertain"),
    });
    await interrupted.bootstrap({ route: { roomId: "uncertain-room" }, principal: { seatToken: "uncertain-seat-token" } });
    await interrupted.dispatch({ type: "load_legal_space" });
    await interrupted.dispatch({ type: "preview_finite", actionKey: "finite-1" });
    const result = await interrupted.dispatch({ type: "confirm_and_apply_preview", previewId: "preview-1" });
    assert(result.ok && result.offline === true, "interrupted apply did not recover its viewer projection");
    assert(applyCalls === 1, "interrupted apply was silently retried");
    assert(interrupted.read().recovery.authoritativeOutcomeUncertain === true, "uncertain authoritative outcome was hidden");
    assert(interrupted.read().trainingTruth === false, "interrupted operation became training truth");
  });

  await check("all_outputs_remain_viewer_scoped_non_authoritative_and_training_false", async () => {
    const view = client.read();
    const serialized = JSON.stringify({ view, calls: transportCalls.map(({ operation, payload }) => ({ operation, payload })) });
    assert(!serialized.includes(seatToken), "final evidence leaked SeatGrant credential");
    assert(view.trainingTruth === false && view.capabilities.trainingTruth === false, "client view overclaimed training truth");
    assert(view.capabilities.providerExecution === false && view.capabilities.skillGeneration === false, "client view widened into Provider/Skill authority");
    assert(acceptedReceipt?.refereeSignature?.signatureAlgorithm === "ed25519", "accepted receipt evidence missing");
    unsubscribe();
  });

  const moduleFiles = [
    "packages/client-domain/client-domain-v1.mjs",
    "packages/client-domain/authoritative-transport-adapters-v1.mjs",
    "packages/client-domain/projection-store-adapters-v1.mjs",
    "packages/client-domain/lifecycle-adapters-v1.mjs",
    "packages/client-domain/portable-contract-hash-v1.mjs",
  ];
  const moduleFileHashes = {};
  for (const relative of moduleFiles) moduleFileHashes[relative] = sha256(await readFile(path.join(LEVEL3_ROOT, relative)));
  const coreReport = {
    schema: "starcraft_tmg_ticket_14_client_domain_module_verification_v1",
    generatedAt: OCCURRED_AT,
    ticket: 14,
    slice: 129,
    status: failures.length ? "failed" : "passed",
    assertionsPassed: checks.filter((checkRow) => checkRow.passed).length,
    assertionsTotal: checks.length,
    checks,
    failures,
    ticketStatus: { completedSlices: 2, plannedSlices: 11, remainingSlices: 9, nextSlice: 130 },
    interface: [...STARCRAFT_TMG_CLIENT_DOMAIN_INTERFACE],
    interfaceHash: hashStarcraftTmgContract(STARCRAFT_TMG_CLIENT_DOMAIN_INTERFACE),
    moduleFileHashes,
    adapterDenominator: {
      authoritativeTransport: ["http", "in_memory_room_runtime"],
      projectionStore: ["async_storage", "in_memory"],
      lifecycle: ["browser_visibility", "expo_app_state", "in_memory"],
    },
    operationalEvidence: {
      authoritativeRoomUsed: true,
      viewerProjectionRevisionAfterApply: 1,
      acceptedReceiptObserved: Boolean(acceptedReceipt?.journalHash),
      ed25519ReceiptObserved: acceptedReceipt?.refereeSignature?.signatureAlgorithm === "ed25519",
      replayMatchesCurrent: client.read().replay?.matchesCurrent === true,
      cacheIntegrityAndViewerIsolationVerified: true,
      interruptedApplyRetried: false,
    },
    productMountReady: false,
    browserRuntimeEvidenceVerified: false,
    nativeRuntimeEvidenceVerified: false,
    sourceRefreshPerformed: false,
    providerCalled: false,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingPromotion: false,
    productionReady: false,
    trainingTruth: false,
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: [],
      harnessToolsCalled: [
        "read_board_state",
        "list_legal_actions",
        "preview_action",
        "apply_action_after_user_confirmation",
        "replay_room",
      ],
      uiTraceEvidence: [
        "interface_level_view_subscription_trace",
        "online_to_background_to_foreground_projection_trace",
        "offline_viewer_scoped_cache_trace",
      ],
      agentDecisionEvidence: [],
      memoryTraceEvidence: [],
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "reject_any_client_authority_field_before_transport",
        "reject_unlisted_candidate_before_preview",
        "cache_hash_or_principal_scope_drift_disables_recovery",
        "interrupted_apply_is_never_silently_retried",
        "room_revision_or_receipt_drift_forces_authoritative_refresh",
      ],
      userVisibleChecks: [
        "loading_ready_offline_and_recovering_states_are_subscribed",
        "offline_projection_is_read_only",
        "preview_waits_for_explicit_human_confirm_and_apply_intent",
        "accepted_receipt_and_replay_revision_are_visible",
      ],
    },
  };
  const report = { ...coreReport, reportHash: hashStarcraftTmgContract(coreReport) };
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(PREVIEW_PATH, previewHtml(report), "utf8");
  if (failures.length) throw new Error(failures.join("\n"));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
