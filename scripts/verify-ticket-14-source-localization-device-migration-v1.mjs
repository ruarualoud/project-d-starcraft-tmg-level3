#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createOfficialGameplayFaqReceipt } from
  "../packages/rule-atoms/official-gameplay-faq-source-v1.mjs";
import { STARCRAFT_TMG_SOURCE_LOCALIZATION_DEVICE_MIGRATION_V1 as sliceBinding } from
  "../content/client/source-localization-device-migration-v1.mjs";
import { createConfiguredStarcraftTmgSourceProvenanceRuntimeV3 } from
  "../packages/product-composition/source-provenance-factory-v3.mjs";
import {
  STARCRAFT_TMG_FROZEN_SOURCE_IDENTITIES_V1,
  STARCRAFT_TMG_SOURCE_FRESHNESS_AUDIT_V1,
  assertStarcraftTmgClientSourceLocalizationProjectionV1,
  classifyStarcraftTmgSourceRoomBindingV1,
  projectStarcraftTmgClientSourceLocalizationV1,
  starcraftTmgClientSourceLocalizationCacheKeyV1,
} from "../packages/client-domain/source-localization-projection-v1.mjs";
import {
  createInMemoryStarcraftTmgAuthoritativeTransportAdapter,
} from "../packages/client-domain/authoritative-transport-adapters-v1.mjs";
import {
  STARCRAFT_TMG_SOURCE_PROJECTION_HTTP_PREFIX,
  createHttpStarcraftTmgSourceProjectionAdapterV1,
  createInMemoryStarcraftTmgSourceProjectionAdapterV1,
  createStarcraftTmgSourceProjectionHttpHandlerV1,
} from "../packages/client-domain/source-projection-adapters-v1.mjs";
import {
  createStarcraftTmgClientDomain,
  STARCRAFT_TMG_CLIENT_DOMAIN_INTERFACE,
} from "../packages/client-domain/client-domain-v1.mjs";
import { createInMemoryStarcraftTmgLifecycleAdapter } from
  "../packages/client-domain/lifecycle-adapters-v1.mjs";
import { createInMemoryStarcraftTmgProjectionStoreAdapter } from
  "../packages/client-domain/projection-store-adapters-v1.mjs";
import { hashStarcraftTmgClientContract } from
  "../packages/client-domain/portable-contract-hash-v1.mjs";
import {
  STARCRAFT_TMG_DEVICE_STORAGE_KEYS_V1,
  STARCRAFT_TMG_LEGACY_STORAGE_KEYS_V1,
  confirmLegacyStarcraftTmgDeviceDataMigrationV1,
  loadStarcraftTmgDeviceMigrationManifestV1,
  readStarcraftTmgReadOnlyLegacyHistoryV1,
  readStarcraftTmgLocalPreferencesV1,
  scanLegacyStarcraftTmgDeviceDataV1,
  writeStarcraftTmgLocalPreferencesV1,
} from "../packages/client-domain/device-data-migration-v1.mjs";
import { createStarcraftTmgExpoClientRuntime } from
  "../apps/starcraft-tmg-expo/lib/level3/client-domain-mount-runtime.mjs";
import { createStarcraftTmgLevel3HttpAdapter } from
  "../packages/http-adapter/handler-v1.mjs";
import { createStarcraftTmgRoomRuntime } from
  "../packages/room-runtime/in-memory-room-v1.mjs";
import {
  createStarcraftTmgAuthoritativeEngine,
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/transition-v1.mjs";
import {
  createStarcraftTmgSampleState,
  loadStarcraftTmgData,
} from "../../scripts/starcraft-tmg-rules-v0.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TICKET_11_BUILD = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const OUTPUT_DIR = path.join(
  ROOT,
  "build",
  "ticket-14-slice-134-source-localization-device-migration-v1",
);
const REPORT_PATH = path.join(OUTPUT_DIR, "report.json");
const PREVIEW_PATH = path.join(OUTPUT_DIR, "preview.html");
const OCCURRED_AT = "2026-09-03T11:00:00.000Z";
const PROJECT_ROOT = new URL("../../", import.meta.url).pathname;
const EXPECTED_PROJECTION_HASH =
  "f47c8e7969751cb304b5d5c947b1977206b99f9ad9c9d0b4b04f38e8f5500250";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function artifact(filename, key) {
  const report = JSON.parse(
    await readFile(path.join(TICKET_11_BUILD, filename), "utf8"),
  );
  return report[key];
}

async function createFrozenSourceRuntime(frozenFixture) {
  const frozen = frozenFixture
    || await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: ROOT });
  const [
    sourceManifest,
    coreAnchorIndex,
    historicalP2pAliasIndex,
    historicalFaqReceipt,
    historicalFaqExactReconciliation,
    historicalFaqSupplementalReconciliation,
  ] = await Promise.all([
    artifact("official-rule-source-manifest-report.json", "manifest"),
    artifact("core-rule-anchor-index-report.json", "index"),
    artifact("official-p2p-alias-precedence-report.json", "aliasIndex"),
    artifact("official-gameplay-faq-report.json", "receipt"),
    artifact("official-faq-exact-reconciliation-v2-report.json", "reconciliation"),
    artifact("official-faq-supplemental-clause-v3-report.json", "reconciliation"),
  ]);
  const currentFaqHtml = await readFile(
    frozen.lock.texts.gameplay_faq.cachePath,
    "utf8",
  );
  const currentFaqReceipt = createOfficialGameplayFaqReceipt({
    html: currentFaqHtml,
    sourceUrl: frozen.lock.texts.gameplay_faq.requestedUrl,
    capturedAt: frozen.lock.capturedAt,
    categoryId: "9",
    sourceVersioning: {
      etag: null,
      lastModified: null,
      cachePolicy: "frozen_development_lock_explicit_refresh_only",
    },
  });
  return createConfiguredStarcraftTmgSourceProvenanceRuntimeV3({
    ...frozen,
    sourceLock: frozen.lock,
    sourceLockAudit: frozen.audit,
    sourceManifest,
    coreAnchorIndex,
    historicalP2pAliasIndex,
    historicalFaqReceipt,
    historicalFaqExactReconciliation,
    historicalFaqSupplementalReconciliation,
    currentFaqReceipt,
    now: () => OCCURRED_AT,
  }).runtime;
}

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  const calls = [];
  return {
    values,
    calls,
    async getItem(key) {
      calls.push({ operation: "getItem", key });
      return values.has(key) ? values.get(key) : null;
    },
    async setItem(key, value) {
      calls.push({ operation: "setItem", key });
      values.set(key, value);
    },
    async removeItem(key) {
      calls.push({ operation: "removeItem", key });
      values.delete(key);
    },
    async getAllKeys() {
      throw new Error("getAllKeys must never be called");
    },
  };
}

function migrationFixture() {
  const token = "slice-134-secret-capability-token";
  return {
    token,
    values: {
      [STARCRAFT_TMG_LEGACY_STORAGE_KEYS_V1.language]: "zh",
      [STARCRAFT_TMG_LEGACY_STORAGE_KEYS_V1.unitTranslations]: JSON.stringify({
        marine: "本地陆战队员",
        sensitive: `https://legacy.invalid/?token=${token}`,
      }),
      [STARCRAFT_TMG_LEGACY_STORAGE_KEYS_V1.armyLists]: JSON.stringify([{
        id: "legacy-army-1",
        name: "Old Terran roster",
        faction: "Terran",
        mineralsLimit: 100,
        gasLimit: 10,
        factionCardId: "legacy-faction-card",
        tacticalCardIds: ["legacy-tactical-card"],
        missionId: "legacy-mission",
        deploymentId: "legacy-deployment",
        roster: [{
          unitId: "marine",
          size: "large",
          activeUpgrades: [0, 2],
          stats: { hitPoints: 999 },
          cost: 1,
          keywords: ["forged"],
          abilities: [{ rulesText: "legacy rule text" }],
        }],
      }]),
      [STARCRAFT_TMG_LEGACY_STORAGE_KEYS_V1.matches]: JSON.stringify([{
        id: "legacy-match-1",
        name: "private match title",
        date: 1_780_000_000_000,
        player1Name: "Alice",
        player2Name: "Bob",
        notes: "private note",
        winner: "player1",
        player1TotalScore: 9,
        player2TotalScore: 7,
        rounds: [{
          roundNumber: 1,
          player1Damage: 4,
          player2Damage: 2,
          player1Score: 3,
          player2Score: 1,
          player1Kills: ["unit-a"],
          player2Kills: [],
          notes: "secret round note",
        }],
        timeline: [{ detail: "private timeline", type: "note" }],
        battleTable: { state: "caller-owned-whole-state" },
        remoteRoomBaseUrl: "https://untrusted.invalid",
        remoteRoomSideKey: "player2",
        remoteRoomVersion: 17,
        remoteInviteUrl: `https://untrusted.invalid/?token=${token}`,
      }]),
      [STARCRAFT_TMG_LEGACY_STORAGE_KEYS_V1.diceHistory]: JSON.stringify([{
        id: "legacy-roll",
        dice: [{ value: 5, sides: 6, timestamp: 1_780_000_000_000 }],
        total: 5,
        timestamp: 1_780_000_000_000,
        label: "private label",
      }]),
      [STARCRAFT_TMG_LEGACY_STORAGE_KEYS_V1.units]: JSON.stringify({
        download: `https://legacy.invalid/data?token=${token}`,
        payload: [{ name: "untrusted unit" }],
      }),
      [STARCRAFT_TMG_LEGACY_STORAGE_KEYS_V1.cards]: JSON.stringify([{ text: "untrusted" }]),
      [STARCRAFT_TMG_LEGACY_STORAGE_KEYS_V1.gameCards]: JSON.stringify([{ text: "untrusted" }]),
      [STARCRAFT_TMG_LEGACY_STORAGE_KEYS_V1.dataVersion]: JSON.stringify(999),
    },
  };
}

function dummyTransport() {
  return Object.freeze({
    async execute() {
      throw Object.assign(new Error("transport is not used by source-only checks"), {
        code: "NETWORK_UNAVAILABLE",
      });
    },
  });
}

function sequentialIds(prefix) {
  let sequence = 0;
  return (kind) => `${kind}-${prefix}-${sequence += 1}`;
}

function handlerFetch(handler, trace) {
  return async (url, init = {}) => {
    const parsed = new URL(url, "https://product.invalid");
    trace.push({
      url: parsed.toString(),
      method: init.method || "GET",
      headers: clone(init.headers || {}),
      bodyPresent: init.body !== undefined,
      credentials: init.credentials,
      redirect: init.redirect,
      referrerPolicy: init.referrerPolicy,
      cache: init.cache,
    });
    const handled = await handler.handle({
      method: init.method,
      pathname: parsed.pathname,
      query: parsed.searchParams,
      headers: init.headers,
      ...(init.body === undefined ? {} : { body: init.body }),
    });
    const serialized = JSON.stringify(handled.response);
    return {
      ok: handled.status >= 200 && handled.status < 300,
      status: handled.status,
      headers: {
        get(name) {
          if (name.toLowerCase() === "content-type") return "application/json";
          if (name.toLowerCase() === "content-length") return String(Buffer.byteLength(serialized));
          return null;
        },
      },
      async text() {
        return serialized;
      },
    };
  };
}

function previewHtml(report) {
  const rows = report.checks.map((check) => (
    `<li><b>${check.passed ? "PASS" : "FAIL"}</b><span>${check.id}</span></li>`
  )).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ticket 14 Slice 134</title><style>
:root{color-scheme:dark;font-family:ui-sans-serif,system-ui;background:#061019;color:#dbeafe}body{margin:0;padding:32px;background:radial-gradient(circle at 15% 0,#123c4a,#061019 50%)}main{max-width:1100px;margin:auto}.status{color:#67e8f9;letter-spacing:.12em;text-transform:uppercase}.flow{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;gap:12px;align-items:center;margin:28px 0}.box{min-height:128px;padding:18px;border:1px solid #28566a;border-radius:12px;background:#0b1c27}.arrow{font-size:24px;color:#67e8f9}code{color:#a5f3fc}ul{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:8px;padding:0}li{list-style:none;display:flex;gap:10px;padding:10px;border:1px solid #25485a;border-radius:8px;background:#0b1c27}li b{color:#86efac;font-size:.75rem}</style></head>
<body><main><p class="status">${report.status} · ${report.assertionsPassed}/${report.assertionsTotal}</p>
<h1>Frozen source metadata and explicit device migration</h1><div class="flow">
<div class="box"><b>Official source runtime</b><p>frozen lock · evidence · rights gate</p></div><div class="arrow">→</div>
<div class="box"><b>Client projection</b><p><code>hash · version · coverage · status</code></p><p>No text, image, credential, or fallback.</p></div><div class="arrow">→</div>
<div class="box"><b>Web / App device</b><p>verified offline metadata cache</p><p>explicit, sanitized, byte-preserving legacy import</p></div></div>
<ul>${rows}</ul></main></body></html>`;
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

  const frozenFixture = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({
    root: ROOT,
  });
  const sourceRuntime = await createFrozenSourceRuntime(frozenFixture);
  const inMemorySource = createInMemoryStarcraftTmgSourceProjectionAdapterV1({
    runtime: sourceRuntime,
  });
  const projection = await inMemorySource.read();
  const httpHandler = createStarcraftTmgSourceProjectionHttpHandlerV1({
    sourcePort: inMemorySource,
  });

  await check("slice_binding_is_hash_sealed_and_keeps_every_promotion_gate_closed", () => {
    const { bindingHash, ...body } = sliceBinding;
    assert(bindingHash === hashStarcraftTmgContract(body), "slice binding hash drifted");
    assert(sliceBinding.sourceProjection.projectionHash === projection.projectionHash, "slice binding projection drifted");
    assert(sliceBinding.latestOfficialAudit.sourceLockRefreshed === false, "slice binding overclaimed source refresh");
    assert(Object.values(sliceBinding.promotion).every((value) => value === false), "slice binding widened a promotion gate");
  });

  await check("frozen_v3_runtime_projects_exact_current_metadata_without_source_body", () => {
    assertStarcraftTmgClientSourceLocalizationProjectionV1(projection);
    assert(projection.projectionHash === EXPECTED_PROJECTION_HASH, "client projection hash drifted");
    assert(projection.source.sourceLockHash === STARCRAFT_TMG_FROZEN_SOURCE_IDENTITIES_V1.sourceLockHash, "source lock drifted");
    assert(projection.source.sourceSnapshotHash === STARCRAFT_TMG_FROZEN_SOURCE_IDENTITIES_V1.sourceSnapshotHash, "source snapshot drifted");
    assert(projection.source.officialDatasetHash === STARCRAFT_TMG_FROZEN_SOURCE_IDENTITIES_V1.officialDatasetHash, "official dataset drifted");
    assert(hashStarcraftTmgContract(frozenFixture.snapshot)
      === projection.source.roomSourceDependencyContentHash, "room source dependency hash drifted");
    assert(hashStarcraftTmgContract(frozenFixture.dataset)
      === projection.source.roomOfficialDatasetDependencyContentHash, "room data dependency hash drifted");
    assert(projection.source.localizationDatasetHash === STARCRAFT_TMG_FROZEN_SOURCE_IDENTITIES_V1.localizationDatasetHash, "localization dataset drifted");
    assert(projection.source.dataVersions.unitsVersion === "71", "unit version drifted");
    assert(projection.source.dataVersions.cardsVersion === "69", "card version drifted");
    assert(projection.source.dataVersions.rulesVersion === "48", "rule version drifted");
    assert(projection.coverage.records === 271 && projection.coverage.fields === 1440, "coverage drifted");
    assert(projection.freshness.commandCenterOfficialGameplayMatchesFrozen === true, "Command Center freshness audit missing");
    assert(projection.freshness.completeLatestOfficialRulesCorpus === false, "incomplete official corpus overclaimed currentness");
    assert(projection.freshness.officialFaqV1IncludedInFrozenLock === false, "unreviewed FAQ was claimed by frozen lock");
    assert(projection.freshness.requiresExplicitSourceRefreshAndReview === true, "explicit FAQ refresh/review gate missing");
    assert(projection.rights.publicReleaseGatePassed === false, "rights gate widened");
    assert(Object.values(projection.contentPolicy).every((value) => value === false), "content entered projection");
  });

  await check("freshness_audit_is_content_bound_and_never_overclaims_full_current_rules", async () => {
    const research = await readFile(
      path.join(ROOT, "docs/research/official-latest-data-audit-2026-09-03.md"),
    );
    assert(sha256(research) === STARCRAFT_TMG_SOURCE_FRESHNESS_AUDIT_V1.researchEvidenceHash, "freshness research evidence drifted");
    assert(STARCRAFT_TMG_SOURCE_FRESHNESS_AUDIT_V1.commandCenterOfficialGameplayMatchesFrozen === true, "Command Center audit status drifted");
    assert(STARCRAFT_TMG_SOURCE_FRESHNESS_AUDIT_V1.completeLatestOfficialRulesCorpus === false, "full current rules overclaimed");
    assert(STARCRAFT_TMG_SOURCE_FRESHNESS_AUDIT_V1.officialFaqV1QuestionCount === 68, "FAQ denominator drifted");
  });

  await check("projection_is_deterministic_portable_and_rejects_tamper_or_content_material", () => {
    const second = projectStarcraftTmgClientSourceLocalizationV1(sourceRuntime.inspect());
    assert(second.projectionHash === projection.projectionHash, "projection is nondeterministic");
    assert(hashStarcraftTmgClientContract(projection).length === 64, "portable hash unavailable");
    const tampered = clone(projection);
    tampered.coverage.fields += 1;
    let tamperRejected = false;
    try {
      assertStarcraftTmgClientSourceLocalizationProjectionV1(tampered);
    } catch (error) {
      tamperRejected = error?.code === "SOURCE_LOCALIZATION_PROJECTION_INVALID";
    }
    assert(tamperRejected, "tampered projection accepted");
    const leaked = clone(projection);
    leaked.precedence = { locator: "https://invalid.test/?token=secret" };
    const { projectionHash: _ignored, ...body } = leaked;
    leaked.projectionHash = hashStarcraftTmgClientContract(body);
    let leakRejected = false;
    try {
      assertStarcraftTmgClientSourceLocalizationProjectionV1(leaked);
    } catch (error) {
      leakRejected = [
        "SOURCE_LOCALIZATION_PROJECTION_INVALID",
        "SOURCE_LOCALIZATION_PROJECTION_CONTENT_LEAK",
      ].includes(error?.code);
    }
    assert(leakRejected, "capability-bearing locator entered projection");
    const quietLeak = clone(projection);
    quietLeak.rights.policy.confidentialBody = "unreleased prose without a denylist keyword";
    const { projectionHash: _quietIgnored, ...quietBody } = quietLeak;
    quietLeak.projectionHash = hashStarcraftTmgClientContract(quietBody);
    let quietLeakRejected = false;
    try {
      assertStarcraftTmgClientSourceLocalizationProjectionV1(quietLeak);
    } catch {
      quietLeakRejected = true;
    }
    assert(quietLeakRejected, "unknown nested content bypassed the metadata-only contract");
  });

  await check("metadata_only_http_contract_and_client_adapter_are_hash_identical", async () => {
    const trace = [];
    const httpClient = createHttpStarcraftTmgSourceProjectionAdapterV1({
      baseUrl: "https://product.invalid",
      fetchImpl: handlerFetch(httpHandler, trace),
    });
    const received = await httpClient.read();
    assert(received.projectionHash === projection.projectionHash, "HTTP/in-memory parity drifted");
    assert(trace.length === 1, "unexpected HTTP request count");
    assert(new URL(trace[0].url).pathname === `${STARCRAFT_TMG_SOURCE_PROJECTION_HTTP_PREFIX}/projection`, "wrong HTTP route");
    assert(trace[0].method === "GET" && trace[0].bodyPresent === false, "HTTP client sent a body");
    assert(trace[0].credentials === "omit" && trace[0].redirect === "error", "HTTP client may send ambient credentials or follow redirects");
    assert(trace[0].referrerPolicy === "no-referrer" && trace[0].cache === "no-store", "HTTP client privacy/cache policy widened");
    for (const request of [
      { method: "POST", pathname: `${STARCRAFT_TMG_SOURCE_PROJECTION_HTTP_PREFIX}/projection` },
      { method: "GET", pathname: `${STARCRAFT_TMG_SOURCE_PROJECTION_HTTP_PREFIX}/projection`, query: { source: "override" } },
      { method: "GET", pathname: `${STARCRAFT_TMG_SOURCE_PROJECTION_HTTP_PREFIX}/projection`, body: {} },
      { method: "GET", pathname: `${STARCRAFT_TMG_SOURCE_PROJECTION_HTTP_PREFIX}/projection`, headers: { authorization: "Bearer secret" } },
    ]) {
      const rejected = await httpHandler.handle(request);
      assert(rejected.status >= 400, `unsafe request accepted: ${JSON.stringify(request)}`);
    }
    let insecureRejected = false;
    try {
      createHttpStarcraftTmgSourceProjectionAdapterV1({
        baseUrl: "http://remote.invalid",
        fetchImpl: async () => {},
      });
    } catch {
      insecureRejected = true;
    }
    assert(insecureRejected, "non-loopback plaintext transport accepted");
    const oversizedClient = createHttpStarcraftTmgSourceProjectionAdapterV1({
      baseUrl: "https://product.invalid",
      fetchImpl: async () => ({
        ok: true,
        headers: { get: (name) => name === "content-length" ? String(64 * 1024 + 1) : "application/json" },
        text: async () => "must-not-read",
      }),
    });
    let oversizedRejected = false;
    try {
      await oversizedClient.read();
    } catch (error) {
      oversizedRejected = error?.code === "SOURCE_PROJECTION_RESPONSE_TOO_LARGE";
    }
    assert(oversizedRejected, "oversized source response accepted");
    let streamCancelled = false;
    let chunk = 0;
    const chunkedOversizedClient = createHttpStarcraftTmgSourceProjectionAdapterV1({
      baseUrl: "https://product.invalid",
      fetchImpl: async () => ({
        ok: true,
        headers: { get: (name) => name === "content-type" ? "application/json" : null },
        body: {
          getReader: () => ({
            read: async () => (
              chunk += 1,
              chunk <= 2
                ? { done: false, value: new Uint8Array(40 * 1024) }
                : { done: true, value: undefined }
            ),
            cancel: async () => { streamCancelled = true; },
            releaseLock: () => {},
          }),
        },
        text: async () => { throw new Error("streaming response must not call text"); },
      }),
    });
    let chunkedOversizedRejected = false;
    try {
      await chunkedOversizedClient.read();
    } catch (error) {
      chunkedOversizedRejected = error?.code === "SOURCE_PROJECTION_RESPONSE_TOO_LARGE";
    }
    assert(chunkedOversizedRejected && streamCancelled, "chunked oversized response was fully buffered");
  });

  await check("shared_product_http_composition_mounts_the_source_projection_route", async () => {
    const productHttp = createStarcraftTmgLevel3HttpAdapter({
      sourceProjectionPort: inMemorySource,
    });
    const handled = await productHttp.handle({
      method: "GET",
      pathname: `${STARCRAFT_TMG_SOURCE_PROJECTION_HTTP_PREFIX}/projection`,
      headers: {},
      query: {},
    });
    assert(handled.status === 200, "shared product HTTP route did not mount source projection");
    assert(handled.response.result.projection.projectionHash === projection.projectionHash, "product route projection drifted");
    const disabled = createStarcraftTmgLevel3HttpAdapter();
    const unavailable = await disabled.handle({
      method: "GET",
      pathname: `${STARCRAFT_TMG_SOURCE_PROJECTION_HTTP_PREFIX}/projection`,
    });
    assert(unavailable.status === 404, "unconfigured product route did not fail closed");
  });

  await check("source_extension_is_opt_in_and_keeps_the_original_client_contract_exact", async () => {
    const base = createStarcraftTmgClientDomain({
      transport: dummyTransport(),
      projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
      lifecycle: createInMemoryStarcraftTmgLifecycleAdapter(),
      now: () => OCCURRED_AT,
      createId: sequentialIds("base"),
    });
    assert(Object.keys(base).sort().join("/") === [...STARCRAFT_TMG_CLIENT_DOMAIN_INTERFACE].sort().join("/"), "deep interface widened");
    const baseView = base.read();
    assert(baseView.schemaVersion === "starcraft_tmg_client_domain_v1.view", "base schema changed");
    assert(!("sourceLocalization" in baseView), "source extension leaked into default view");
    assert(!("sourceLocalizationStatus" in baseView), "source status leaked into default view");
    assert(!("sourceMetadataProjection" in baseView.capabilities), "source capability leaked into default view");
    const rejected = await base.dispatch({ type: "refresh_source_localization" });
    assert(!rejected.ok && rejected.rejection.code === "CLIENT_INTENT_UNSUPPORTED", "base client accepted source intent");
    const historicalRejected = await base.dispatch({ type: "read_historical_rules" });
    assert(!historicalRejected.ok
      && historicalRejected.rejection.code === "CLIENT_INTENT_UNSUPPORTED", "base client accepted historical rules extension intent");
  });

  await check("current_historical_and_unavailable_room_source_pins_are_distinct", () => {
    const engine = createStarcraftTmgAuthoritativeEngine({
      allowIncompleteRuleRuntimeForDevelopment: true,
      now: () => OCCURRED_AT,
    });
    const makeRoom = (roomId, sourceContent, dataContent) => ({
      matchBinding: engine.createMatchBinding({
        roomId,
        matchId: `${roomId}-match`,
        dependencies: {
          sourceSnapshot: { artifactId: `${roomId}-source`, content: sourceContent },
          dataSnapshot: { artifactId: `${roomId}-data`, content: dataContent },
        },
      }),
    });
    const currentRoom = makeRoom(
      "slice-134-current",
      frozenFixture.snapshot,
      frozenFixture.dataset,
    );
    const currentSourceDistinctDataRoom = makeRoom(
      "slice-134-current-source-distinct-data",
      frozenFixture.snapshot,
      { exactRoomDataDependency: "gameplay-bundle-v1" },
    );
    const historicalRoom = makeRoom(
      "slice-134-historical",
      { historicalSourceSnapshot: true },
      { historicalDataSnapshot: true },
    );
    assert(classifyStarcraftTmgSourceRoomBindingV1(projection, null) === "not_bound", "unbound room misclassified");
    assert(classifyStarcraftTmgSourceRoomBindingV1(null, currentRoom) === "room_pin_visible_source_metadata_unavailable", "visible room pin vanished without metadata");
    assert(classifyStarcraftTmgSourceRoomBindingV1(projection, currentRoom) === "current_frozen_projection_matches_room", "current room pin mismatch");
    assert(classifyStarcraftTmgSourceRoomBindingV1(projection, currentSourceDistinctDataRoom) === "current_frozen_source_with_distinct_room_data_dependency", "distinct room data dependency was overclaimed");
    assert(classifyStarcraftTmgSourceRoomBindingV1(projection, historicalRoom) === "historical_or_distinct_room_source_dependency_preserved", "historical room source silently upgraded");
  });

  await check("room_pinned_historical_rules_are_read_only_and_never_silently_substituted", async () => {
    const data = await loadStarcraftTmgData(PROJECT_ROOT);
    const state = createStarcraftTmgSampleState(data);
    state.board.terrain = [];
    const rulesContent = "# Frozen room rules\n\nOnly this MatchBinding artifact may be displayed.";
    const engine = createStarcraftTmgAuthoritativeEngine({ now: () => OCCURRED_AT });
    const roomRuntime = createStarcraftTmgRoomRuntime({
      authorityEngine: engine,
      now: () => OCCURRED_AT,
    });
    const created = await roomRuntime.createRoom({
      roomId: "slice-134-historical-rules",
      gameId: "starcraft-tmg",
      initialStateAuthority: {
        source: "server_factory",
        state,
        dataVersion: data.version,
        receiptHash: hashStarcraftTmgContract({ source: "slice-134", state }),
        dependencies: {
          sourceSnapshot: {
            artifactId: "slice-134-official-source",
            content: frozenFixture.snapshot,
          },
          dataSnapshot: {
            artifactId: "slice-134-official-data",
            content: frozenFixture.dataset,
          },
        },
        rulesDisplay: {
          artifactId: "slice-134-frozen-rules-display",
          mediaType: "text/markdown",
          locale: "en",
          content: rulesContent,
        },
      },
      serverSeatPlan: [
        { label: "host", seatKey: "player1", roleMode: "player", principalType: "human" },
      ],
    });
    assert(created.ok, `historical rules room failed: ${created.reason || "unknown"}`);
    const baseTransport = createInMemoryStarcraftTmgAuthoritativeTransportAdapter({
      roomRuntime,
    });
    const createClient = (transport = baseTransport) => createStarcraftTmgClientDomain({
      transport,
      projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
      lifecycle: createInMemoryStarcraftTmgLifecycleAdapter({ online: true }),
      enableSourceLocalization: true,
      sourceProjectionPort: inMemorySource,
      now: () => OCCURRED_AT,
      createId: sequentialIds("historical-rules"),
    });
    const client = createClient();
    const bootstrapped = await client.bootstrap({
      route: { roomId: created.room.roomId },
      principal: { seatToken: created.credentials.host.seatToken },
      surface: "verifier",
      locale: "en",
    });
    assert(bootstrapped.ok, "historical rules client bootstrap failed");
    const loaded = await client.dispatch({ type: "read_historical_rules" });
    assert(loaded.ok, "room-pinned historical rules did not load");
    assert(loaded.view.historicalRulesDisplay.content === rulesContent, "historical rule content drifted");
    assert(loaded.view.historicalRulesDisplay.readOnly === true, "historical rule display became writable");
    assert(loaded.view.historicalRulesDisplay.mayAffectRules === false, "historical display gained rules authority");
    assert(loaded.view.historicalRulesStatus.silentCompatibilityUsed === false, "historical display used silent compatibility");

    const tamperingTransport = {
      async execute(request) {
        const result = await baseTransport.execute(request);
        return request.operation === "read_historical_rules" && result?.ok
          ? { ...result, content: `${result.content}\nsubstituted` }
          : result;
      },
    };
    const tamperedClient = createClient(tamperingTransport);
    assert((await tamperedClient.bootstrap({
      route: { roomId: created.room.roomId },
      principal: {},
      surface: "verifier",
      locale: "en",
    })).ok, "tampered historical rules client bootstrap failed");
    const tampered = await tamperedClient.dispatch({ type: "read_historical_rules" });
    assert(!tampered.ok
      && tampered.rejection.code === "HISTORICAL_RULES_DISPLAY_RESPONSE_INVALID", "tampered rule display was rendered");
    assert(tampered.view.historicalRulesDisplay === null, "tampered rule display remained visible");

    const missingClient = createClient({
      async execute(request) {
        if (request.operation === "read_historical_rules") {
          return { ok: false, reason: "HISTORICAL_RULES_DISPLAY_MISSING" };
        }
        return baseTransport.execute(request);
      },
    });
    assert((await missingClient.bootstrap({
      route: { roomId: created.room.roomId },
      principal: {},
      surface: "verifier",
      locale: "en",
    })).ok, "missing historical rules client bootstrap failed");
    const missing = await missingClient.dispatch({ type: "read_historical_rules" });
    assert(!missing.ok && missing.view.historicalRulesStatus.status === "quarantined", "missing rule dependency was silently substituted");
  });

  await check("online_source_metadata_is_integrity_cached_and_offline_recovers_without_a_port_call", async () => {
    const backingMap = new Map();
    const store = createInMemoryStarcraftTmgProjectionStoreAdapter({ backingMap });
    const onlineLifecycle = createInMemoryStarcraftTmgLifecycleAdapter({ online: true });
    let onlineReads = 0;
    const online = createStarcraftTmgClientDomain({
      transport: dummyTransport(),
      projectionStore: store,
      lifecycle: onlineLifecycle,
      enableSourceLocalization: true,
      sourceProjectionPort: { read: async () => { onlineReads += 1; return projection; } },
      now: () => OCCURRED_AT,
      createId: sequentialIds("online"),
    });
    const refreshed = await online.dispatch({ type: "refresh_source_localization" });
    assert(refreshed.ok && onlineReads === 1, "online source refresh failed");
    assert(refreshed.view.sourceLocalization.projectionHash === projection.projectionHash, "online projection missing");
    assert(refreshed.view.sourceLocalizationStatus.status === "network_fresh", "online status mismatch");
    const cacheKey = starcraftTmgClientSourceLocalizationCacheKeyV1();
    const cache = backingMap.get(cacheKey);
    assert(cache?.metadataOnly === true && cache?.authority === false, "source cache authority widened");
    const { integrityHash, ...cacheCore } = cache;
    assert(integrityHash === hashStarcraftTmgClientContract(cacheCore), "source cache integrity drifted");

    let offlineReads = 0;
    const offline = createStarcraftTmgClientDomain({
      transport: dummyTransport(),
      projectionStore: store,
      lifecycle: createInMemoryStarcraftTmgLifecycleAdapter({ online: false }),
      enableSourceLocalization: true,
      sourceProjectionPort: { read: async () => { offlineReads += 1; throw new Error("must not call"); } },
      now: () => OCCURRED_AT,
      createId: sequentialIds("offline"),
    });
    const recovered = await offline.dispatch({ type: "refresh_source_localization" });
    assert(recovered.ok && recovered.offline === true && offlineReads === 0, "offline recovery called network");
    assert(recovered.view.sourceLocalizationStatus.status === "offline_verified", "offline status mismatch");
    assert(recovered.view.sourceLocalizationStatus.legacyFallbackUsed === false, "legacy fallback used");
    assert(recovered.view.sourceLocalization.cachePolicy.maySeedRoomOrDraftValidation === false, "cache gained authority");
  });

  await check("corrupt_source_cache_is_removed_and_never_rendered", async () => {
    const cacheKey = starcraftTmgClientSourceLocalizationCacheKeyV1();
    const backingMap = new Map([[cacheKey, {
      schemaVersion: "starcraft_tmg_client_source_localization_cache_record_v1",
      cacheKey,
      projection,
      savedAt: OCCURRED_AT,
      authority: false,
      metadataOnly: true,
      trainingTruth: false,
      integrityHash: "0".repeat(64),
    }]]);
    const client = createStarcraftTmgClientDomain({
      transport: dummyTransport(),
      projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter({ backingMap }),
      lifecycle: createInMemoryStarcraftTmgLifecycleAdapter({ online: false }),
      enableSourceLocalization: true,
      sourceProjectionPort: { read: async () => projection },
      now: () => OCCURRED_AT,
      createId: sequentialIds("corrupt"),
    });
    const result = await client.dispatch({ type: "refresh_source_localization" });
    assert(!result.ok && result.rejection.code === "SOURCE_PROJECTION_CACHE_INTEGRITY_FAILED", "corrupt cache accepted");
    assert(!backingMap.has(cacheKey), "corrupt cache not removed");
    assert(result.view.sourceLocalization === null, "corrupt projection rendered");
  });

  await check("web_and_app_mounts_receive_the_same_metadata_semantics", async () => {
    const trace = [];
    const fetchImpl = handlerFetch(httpHandler, trace);
    const makeAsyncStorage = () => {
      const map = new Map();
      return {
        getItem: async (key) => map.get(key) ?? null,
        setItem: async (key, value) => { map.set(key, value); },
        removeItem: async (key) => { map.delete(key); },
      };
    };
    const web = createStarcraftTmgExpoClientRuntime({
      platform: "web",
      asyncStorage: makeAsyncStorage(),
      fetchImpl,
      baseUrl: "https://product.invalid",
      enableSourceLocalization: true,
      allowHeadlessFallback: true,
      now: () => OCCURRED_AT,
      createId: sequentialIds("web"),
    });
    const app = createStarcraftTmgExpoClientRuntime({
      platform: "native",
      asyncStorage: makeAsyncStorage(),
      fetchImpl,
      baseUrl: "https://product.invalid",
      enableSourceLocalization: true,
      allowHeadlessFallback: true,
      now: () => OCCURRED_AT,
      createId: sequentialIds("app"),
    });
    const [webResult, appResult] = await Promise.all([
      web.clientDomain.dispatch({ type: "refresh_source_localization" }),
      app.clientDomain.dispatch({ type: "refresh_source_localization" }),
    ]);
    assert(webResult.ok && appResult.ok, "surface source refresh failed");
    assert(web.surface === "expo_web" && app.surface === "expo_native", "surface identity drifted");
    assert(web.sourceProjectionKind === app.sourceProjectionKind, "source adapter kind drifted");
    assert(webResult.view.sourceLocalization.projectionHash === appResult.view.sourceLocalization.projectionHash, "Web/App source semantics drifted");
  });

  const fixture = migrationFixture();
  const storage = createStorage(fixture.values);
  const originalBytes = clone(fixture.values);
  let scan;
  let manifest;

  await check("legacy_scan_reads_only_nine_fixed_keys_and_writes_nothing", async () => {
    scan = await scanLegacyStarcraftTmgDeviceDataV1({
      storage,
      scannedAt: OCCURRED_AT,
    });
    const reads = storage.calls.filter((call) => call.operation === "getItem");
    assert(reads.length === 9 && scan.entries.length === 9, "fixed-key denominator drifted");
    assert(new Set(reads.map((call) => call.key)).size === 9, "legacy key read repeated");
    assert(storage.calls.every((call) => call.operation === "getItem"), "scan mutated storage");
    assert(scan.requiresExplicitUserConfirmation === true, "confirmation gate missing");
    assert(scan.originalsPreserved === true && scan.networkAllowed === false, "scan authority widened");
    assert(!JSON.stringify(scan).includes(fixture.token), "scan leaked raw capability material");
  });

  await check("migration_requires_confirmation_and_rejects_changed_original_before_writing", async () => {
    let confirmationRejected = false;
    try {
      await confirmLegacyStarcraftTmgDeviceDataMigrationV1({
        storage,
        scan,
        confirmed: false,
        sourceProjection: projection,
      });
    } catch (error) {
      confirmationRejected = error?.code === "LEGACY_MIGRATION_USER_CONFIRMATION_REQUIRED";
    }
    assert(confirmationRejected, "migration ran without confirmation");

    const changed = createStorage(fixture.values);
    const changedScan = await scanLegacyStarcraftTmgDeviceDataV1({
      storage: changed,
      scannedAt: OCCURRED_AT,
    });
    changed.values.set(
      STARCRAFT_TMG_LEGACY_STORAGE_KEYS_V1.armyLists,
      JSON.stringify([]),
    );
    changed.calls.length = 0;
    let changedRejected = false;
    try {
      await confirmLegacyStarcraftTmgDeviceDataMigrationV1({
        storage: changed,
        scan: changedScan,
        confirmed: true,
        sourceProjection: projection,
      });
    } catch (error) {
      changedRejected = error?.code === "LEGACY_SOURCE_CHANGED_RESCAN_REQUIRED";
    }
    assert(changedRejected, "changed source did not require rescan");
    assert(!changed.calls.some((call) => call.operation !== "getItem"), "changed source wrote before rejection");

    const forged = createStorage(fixture.values);
    const forgedScan = clone(await scanLegacyStarcraftTmgDeviceDataV1({
      storage: forged,
      scannedAt: OCCURRED_AT,
    }));
    forgedScan.entries.find((entry) => entry.policyName === "units").disposition =
      "eligible_after_user_confirmation";
    const { scanHash: _forgedScanHash, ...forgedBody } = forgedScan;
    forgedScan.scanHash = hashStarcraftTmgClientContract(forgedBody);
    let forgedRejected = false;
    try {
      await confirmLegacyStarcraftTmgDeviceDataMigrationV1({
        storage: forged,
        scan: forgedScan,
        confirmed: true,
        sourceProjection: projection,
      });
    } catch (error) {
      forgedRejected = error?.code === "LEGACY_MIGRATION_SCAN_INVALID";
    }
    assert(forgedRejected, "reclassified legacy source accepted a forged disposition");
    assert(!forged.calls.some((call) => call.operation !== "getItem"), "forged scan wrote before rejection");

    const appeared = createStorage({});
    const appearedScan = await scanLegacyStarcraftTmgDeviceDataV1({
      storage: appeared,
      scannedAt: OCCURRED_AT,
    });
    appeared.values.set(
      STARCRAFT_TMG_LEGACY_STORAGE_KEYS_V1.language,
      "zh",
    );
    let appearedRejected = false;
    try {
      await confirmLegacyStarcraftTmgDeviceDataMigrationV1({
        storage: appeared,
        scan: appearedScan,
        confirmed: true,
        sourceProjection: projection,
      });
    } catch (error) {
      appearedRejected = error?.code === "LEGACY_SOURCE_CHANGED_RESCAN_REQUIRED";
    }
    assert(appearedRejected, "absent-to-present legacy key bypassed rescan");
    assert(!appeared.calls.some((call) => call.operation !== "getItem"), "appeared legacy key wrote before rejection");

    const oversized = createStorage({
      [STARCRAFT_TMG_LEGACY_STORAGE_KEYS_V1.units]: "x".repeat(2 * 1024 * 1024 + 1),
    });
    const oversizedScan = await scanLegacyStarcraftTmgDeviceDataV1({
      storage: oversized,
      scannedAt: OCCURRED_AT,
    });
    let oversizedMigrationRejected = false;
    try {
      await confirmLegacyStarcraftTmgDeviceDataMigrationV1({
        storage: oversized,
        scan: oversizedScan,
        confirmed: true,
        sourceProjection: projection,
      });
    } catch (error) {
      oversizedMigrationRejected = error?.code
        === "LEGACY_MIGRATION_OVERSIZED_SOURCE_REQUIRES_ISOLATION";
    }
    assert(oversizedMigrationRejected, "unverifiable oversized legacy value was migrated");
    assert(!oversized.calls.some((call) => call.operation !== "getItem"), "oversized legacy value wrote before isolation");

    const midFlightBase = createStorage({});
    const midFlightScan = await scanLegacyStarcraftTmgDeviceDataV1({
      storage: midFlightBase,
      scannedAt: OCCURRED_AT,
    });
    let injected = false;
    const midFlightStorage = {
      ...midFlightBase,
      async setItem(key, value) {
        await midFlightBase.setItem(key, value);
        if (!injected) {
          injected = true;
          midFlightBase.values.set(
            STARCRAFT_TMG_LEGACY_STORAGE_KEYS_V1.language,
            "en",
          );
        }
      },
    };
    let midFlightRejected = false;
    try {
      await confirmLegacyStarcraftTmgDeviceDataMigrationV1({
        storage: midFlightStorage,
        scan: midFlightScan,
        confirmed: true,
        sourceProjection: projection,
      });
    } catch (error) {
      midFlightRejected = error?.code === "LEGACY_ORIGINAL_BYTES_CHANGED";
    }
    assert(midFlightRejected, "mid-flight absent-to-present change published a manifest");
    assert(!midFlightBase.values.has(STARCRAFT_TMG_DEVICE_STORAGE_KEYS_V1.manifest), "mid-flight mutation published partial state");
  });

  await check("confirmed_import_is_sanitized_manifest_last_idempotent_and_byte_preserving", async () => {
    storage.calls.length = 0;
    manifest = await confirmLegacyStarcraftTmgDeviceDataMigrationV1({
      storage,
      scan,
      confirmed: true,
      sourceProjection: projection,
    });
    for (const [key, value] of Object.entries(originalBytes)) {
      assert(storage.values.get(key) === value, `legacy bytes changed: ${key}`);
    }
    const mutations = storage.calls.filter((call) => call.operation !== "getItem");
    assert(mutations.at(-1)?.key === STARCRAFT_TMG_DEVICE_STORAGE_KEYS_V1.manifest, "manifest was not final state change");
    assert(manifest.originalBytesPreserved === true && manifest.originalKeysModified.length === 0, "originals not preserved");
    assert(manifest.networkUsed === false && manifest.roomRestoreAttempted === false, "migration gained network or room authority");
    assert(manifest.providerCalled === false && manifest.skillGenerated === false && manifest.dshRun === false, "agent pipeline entered migration");
    assert(manifest.muzeroDataGenerated === false && manifest.selfPlayRun === false, "training pipeline entered migration");
    const loaded = await loadStarcraftTmgDeviceMigrationManifestV1({ storage });
    assert(loaded?.manifestHash === manifest.manifestHash, "manifest reload failed");
    const migratedPreferences = await readStarcraftTmgLocalPreferencesV1({ storage });
    assert(migratedPreferences?.language === "zh", "raw legacy language did not migrate through the published generation");
    storage.calls.length = 0;
    const repeated = await confirmLegacyStarcraftTmgDeviceDataMigrationV1({
      storage,
      scan,
      confirmed: true,
      sourceProjection: projection,
    });
    assert(repeated.manifestHash === manifest.manifestHash, "same confirmed scan is not idempotent");
    assert(storage.calls.every((call) => call.operation === "getItem"), "idempotent retry rewrote generation or current data");

    const differentValues = { ...fixture.values };
    differentValues[STARCRAFT_TMG_LEGACY_STORAGE_KEYS_V1.language] = "en";
    const differentStorage = createStorage(differentValues);
    for (const [key, value] of storage.values) differentStorage.values.set(key, value);
    differentStorage.values.set(STARCRAFT_TMG_LEGACY_STORAGE_KEYS_V1.language, "en");
    const differentScan = await scanLegacyStarcraftTmgDeviceDataV1({
      storage: differentStorage,
      scannedAt: "2026-09-03T11:01:00.000Z",
    });
    differentStorage.calls.length = 0;
    let differentRejected = false;
    try {
      await confirmLegacyStarcraftTmgDeviceDataMigrationV1({
        storage: differentStorage,
        scan: differentScan,
        confirmed: true,
        sourceProjection: projection,
      });
    } catch (error) {
      differentRejected = error?.code === "DEVICE_MIGRATION_MANIFEST_CONFLICT";
    }
    assert(differentRejected, "different migration generation replaced the published pointer");
    assert(differentStorage.values.get(STARCRAFT_TMG_DEVICE_STORAGE_KEYS_V1.manifest)
      === storage.values.get(STARCRAFT_TMG_DEVICE_STORAGE_KEYS_V1.manifest), "published manifest pointer changed");
  });

  await check("army_drafts_are_quarantined_without_copied_stats_costs_keywords_or_rules", () => {
    const envelope = JSON.parse(
      storage.values.get(manifest.recordKeys.armyDraftQuarantine),
    );
    assert(envelope.drafts.length === 1 && envelope.activeDraftCount === 0, "army quarantine count mismatch");
    const draft = envelope.drafts[0];
    assert(draft.usableForRoom === false && draft.rulesLegalityClaimed === false, "legacy draft gained authority");
    assert(draft.status === "quarantined_pending_official_catalogue_and_room_validation", "draft bypassed current validation");
    const serialized = JSON.stringify(draft).toLowerCase();
    for (const forbidden of ["hitpoints", "keywords", "rulestext", "abilities", "\"cost\""]) {
      assert(!serialized.includes(forbidden), `derived army field copied: ${forbidden}`);
    }
  });

  await check("historical_matches_are_read_only_scores_without_identity_state_or_capabilities", () => {
    const envelope = JSON.parse(
      storage.values.get(manifest.recordKeys.history),
    );
    assert(envelope.records.length === 1 && envelope.mayRestoreRoom === false, "history scope widened");
    assert(envelope.mayCreateReplay === false && envelope.muzeroEligible === false, "history gained replay/training status");
    const serialized = JSON.stringify(envelope).toLowerCase();
    for (const forbidden of [
      "alice", "bob", "private note", "private timeline", "battletable",
      "remoteroom", "sidekey", "invite", fixture.token.toLowerCase(),
    ]) {
      assert(!serialized.includes(forbidden), `historical summary leaked: ${forbidden}`);
    }
  });

  await check("sanitized_historical_match_records_have_a_strict_read_only_consumer", async () => {
    const history = await readStarcraftTmgReadOnlyLegacyHistoryV1({ storage });
    assert(history?.records.length === 1, "read-only history consumer did not load published records");
    assert(history.readOnly === true && history.mayRestoreRoom === false, "history consumer widened room authority");
    assert(history.mayCreateReplay === false && history.muzeroEligible === false, "history consumer widened replay or training scope");
    const tampered = createStorage(Object.fromEntries(storage.values));
    const record = JSON.parse(tampered.values.get(manifest.recordKeys.history));
    record.records[0].player1TotalScore += 1;
    tampered.values.set(manifest.recordKeys.history, JSON.stringify(record));
    assert(await readStarcraftTmgReadOnlyLegacyHistoryV1({ storage: tampered }) === null, "tampered historical summary rendered");
  });

  await check("legacy_source_and_user_labels_are_hash_only_quarantine_never_fallback", () => {
    const quarantine = JSON.parse(
      storage.values.get(manifest.recordKeys.quarantine),
    );
    assert(quarantine.rawValuesStored === false && quarantine.sourceFallbackAllowed === false, "quarantine became fallback");
    assert(quarantine.entries.every((entry) => entry.rawValueCopied === false), "raw legacy payload copied");
    const targetValues = Object.values(manifest.recordKeys)
      .map((key) => storage.values.get(key) || "")
      .join("\n")
      .toLowerCase();
    assert(!targetValues.includes(fixture.token.toLowerCase()), "sanitized destination leaked capability");
    assert(!targetValues.includes("untrusted unit"), "legacy source body copied");
    assert(!targetValues.includes("本地陆战队员"), "unreviewed legacy label silently imported");
  });

  await check("migration_generation_never_overwrites_current_preferences_or_dice", async () => {
    const currentStorage = createStorage(fixture.values);
    await writeStarcraftTmgLocalPreferencesV1({
      storage: currentStorage,
      language: "en",
      unitLabelOverrides: { marine: "My Marine" },
    });
    const currentDice = JSON.stringify({
      schemaVersion: "starcraft_tmg_local_dice_history_v1",
      entries: [{ id: "current-roll", dice: [], total: 0, timestamp: 1_780_000_000_001 }],
      rngAuthority: false,
      trainingTruth: false,
    });
    currentStorage.values.set(STARCRAFT_TMG_DEVICE_STORAGE_KEYS_V1.diceHistory, currentDice);
    const currentPreferences = currentStorage.values.get(
      STARCRAFT_TMG_DEVICE_STORAGE_KEYS_V1.preferences,
    );
    const currentScan = await scanLegacyStarcraftTmgDeviceDataV1({
      storage: currentStorage,
      scannedAt: OCCURRED_AT,
    });
    await confirmLegacyStarcraftTmgDeviceDataMigrationV1({
      storage: currentStorage,
      scan: currentScan,
      confirmed: true,
      sourceProjection: projection,
    });
    assert(currentStorage.values.get(STARCRAFT_TMG_DEVICE_STORAGE_KEYS_V1.preferences) === currentPreferences, "current preferences overwritten");
    assert(currentStorage.values.get(STARCRAFT_TMG_DEVICE_STORAGE_KEYS_V1.diceHistory) === currentDice, "current dice overwritten");
    const displayed = await readStarcraftTmgLocalPreferencesV1({ storage: currentStorage });
    assert(displayed?.language === "en" && displayed.unitLabelOverrides.marine === "My Marine", "current preference did not win");
  });

  await check("every_staging_write_boundary_recovers_without_publishing_partial_state", async () => {
    for (let failureAt = 1; failureAt <= 7; failureAt += 1) {
      const base = createStorage(fixture.values);
      const boundaryScan = await scanLegacyStarcraftTmgDeviceDataV1({
        storage: base,
        scannedAt: OCCURRED_AT,
      });
      let mutation = 0;
      let enabled = true;
      const faultStorage = {
        ...base,
        async setItem(key, value) {
          mutation += 1;
          if (enabled && mutation === failureAt) throw new Error("INJECTED_WRITE_FAILURE");
          return base.setItem(key, value);
        },
      };
      let failed = false;
      try {
        await confirmLegacyStarcraftTmgDeviceDataMigrationV1({
          storage: faultStorage,
          scan: boundaryScan,
          confirmed: true,
          sourceProjection: projection,
        });
      } catch {
        failed = true;
      }
      assert(failed, `write boundary ${failureAt} did not fail`);
      assert(await loadStarcraftTmgDeviceMigrationManifestV1({ storage: base }) === null, `write boundary ${failureAt} published partial manifest`);
      enabled = false;
      const recovered = await confirmLegacyStarcraftTmgDeviceDataMigrationV1({
        storage: faultStorage,
        scan: boundaryScan,
        confirmed: true,
        sourceProjection: projection,
      });
      assert(recovered.stage === "sanitized_imported", `write boundary ${failureAt} did not recover`);
      assert(await loadStarcraftTmgDeviceMigrationManifestV1({ storage: base }), `write boundary ${failureAt} manifest invalid`);
    }
  });

  await check("invalid_legacy_json_is_quarantined_without_blocking_other_safe_records", async () => {
    const invalidValues = { ...fixture.values };
    invalidValues[STARCRAFT_TMG_LEGACY_STORAGE_KEYS_V1.armyLists] = "{not-json";
    const invalidStorage = createStorage(invalidValues);
    const invalidScan = await scanLegacyStarcraftTmgDeviceDataV1({
      storage: invalidStorage,
      scannedAt: OCCURRED_AT,
    });
    const invalidManifest = await confirmLegacyStarcraftTmgDeviceDataMigrationV1({
      storage: invalidStorage,
      scan: invalidScan,
      confirmed: true,
      sourceProjection: projection,
    });
    assert(invalidManifest.counts.armyDraftsQuarantined === 0, "invalid draft parsed or copied");
    assert(invalidManifest.counts.historyRecordsImportedReadOnly === 1, "safe history was blocked");
  });

  await check("tracked_expo_product_has_no_legacy_source_loader_or_silent_refresh_path", async () => {
    const files = [
      "apps/starcraft-tmg-expo/lib/data-context.tsx",
      "apps/starcraft-tmg-expo/lib/i18n.tsx",
      "apps/starcraft-tmg-expo/lib/storage.ts",
      "apps/starcraft-tmg-expo/app/(tabs)/army.tsx",
      "apps/starcraft-tmg-expo/app/(tabs)/index.tsx",
      "apps/starcraft-tmg-expo/app/(tabs)/tools.tsx",
      "apps/starcraft-tmg-expo/lib/level3/client-domain-provider.tsx",
      "apps/starcraft-tmg-expo/build.sh",
      "apps/starcraft-tmg-expo/PACKAGING.md",
    ];
    const source = (await Promise.all(
      files.map((file) => readFile(path.join(ROOT, file), "utf8")),
    )).join("\n");
    for (const forbidden of [
      "firestore.googleapis.com",
      "bundled-data-loader",
      "assets/data/bundled-data.json",
      "tools/export-data-pack",
      ...Object.values(STARCRAFT_TMG_LEGACY_STORAGE_KEYS_V1),
    ]) {
      assert(!source.includes(forbidden), `tracked product retained legacy source path: ${forbidden}`);
    }
    assert(source.includes("explicit_user_command_only"), "explicit source refresh policy missing");
    assert(source.includes("OFFICIAL_CATALOGUE_BODY_UNAVAILABLE"), "army draft fail-closed gate missing");
    assert(source.includes("LEGACY_CALCULATOR_EXECUTION_ENABLED = false"), "legacy calculator execution was not isolated");
    assert(!/useEffect\(\(\) => \{\s*void clientDomain\.dispatch\(\{ type: ["']refresh_source_localization["']/u.test(source), "source metadata refreshes implicitly on mount");
  });

  const reportCore = {
    schemaVersion: "starcraft_tmg_ticket_14_slice_134_verification_v1",
    generatedAt: OCCURRED_AT,
    ticket: 14,
    slice: 134,
    status: failures.length === 0 ? "passed" : "failed",
    assertionsPassed: checks.length - failures.length,
    assertionsTotal: checks.length,
    checks,
    failures,
    frozenSource: {
      ...STARCRAFT_TMG_FROZEN_SOURCE_IDENTITIES_V1,
      projectionHash: projection.projectionHash,
      dataVersions: projection.source.dataVersions,
      records: projection.coverage.records,
      fields: projection.coverage.fields,
      rightsReleasePassed: projection.rights.publicReleaseGatePassed,
      completeLatestOfficialRulesCorpus:
        projection.freshness.completeLatestOfficialRulesCorpus,
      officialFaqV1IncludedInFrozenLock:
        projection.freshness.officialFaqV1IncludedInFrozenLock,
      explicitRefreshAndReviewRequired:
        projection.freshness.requiresExplicitSourceRefreshAndReview,
    },
    migration: {
      fixedLegacyKeyCount: Object.keys(STARCRAFT_TMG_LEGACY_STORAGE_KEYS_V1).length,
      presentCount: scan?.presentCount ?? null,
      manifestHash: manifest?.manifestHash ?? null,
      originalsPreserved: manifest?.originalBytesPreserved ?? null,
      networkUsed: false,
      roomRestoreAttempted: false,
    },
    harness: {
      contractChanged: "optional_source_metadata_projection_and_explicit_local_migration",
      webAppSemanticParity: true,
      offlineTraceRun: true,
      providerCalls: 0,
      skillsGenerated: 0,
      dshRuns: 0,
      selfPlayRuns: 0,
      muzeroRecordsGenerated: 0,
      trainingPromotions: 0,
    },
    trainingTruth: false,
  };
  const report = {
    ...reportCore,
    reportHash: hashStarcraftTmgClientContract(reportCore),
  };
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  const preview = previewHtml(report);
  await writeFile(PREVIEW_PATH, preview, "utf8");
  console.log(JSON.stringify({
    schemaVersion: report.schemaVersion,
    status: report.status,
    assertionsPassed: report.assertionsPassed,
    assertionsTotal: report.assertionsTotal,
    failures,
    projectionHash: projection.projectionHash,
    manifestHash: manifest?.manifestHash ?? null,
    reportHash: report.reportHash,
    previewHash: sha256(preview),
  }, null, 2));
  if (failures.length > 0) process.exitCode = 1;
}

await main();
