#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_ZH_CN_CORE_GLOSSARY_V1 } from
  "../content/localization/zh-cn-core-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  createStarcraftTmgOfflineProvenanceCacheV1,
} from "../packages/localization/offline-provenance-cache-v1.mjs";
import { createSqliteStarcraftTmgTranslationReviewStoreV1 } from
  "../packages/localization/sqlite-translation-review-store-v1.mjs";
import {
  STARCRAFT_TMG_SOURCE_REVIEW_CSS_V1,
  createStarcraftTmgSourceReviewBundleV1,
  createStarcraftTmgSourceReviewControllerV1,
  createStarcraftTmgSourceReviewViewModelV1,
  renderStarcraftTmgSourceReviewHtmlV1,
  renderStarcraftTmgSourceReviewNativeTreeV1,
} from "../packages/localization/source-review-ui-v1.mjs";
import {
  createStarcraftTmgMachineTranslationCandidate,
  createStarcraftTmgTranslationIntent,
} from "../packages/localization/translation-sidecar-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../packages/source-data/official-development-tranche-source-lock-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_PATH = path.join(ROOT, "build/ticket-12-source-review-ui-v1/report.json");
const T0 = "2026-09-02T19:00:00.000Z";
const LOCALIZATION_A = "299b075b83ccd7f4147ed9f1119ae2b54eed58446ea7385399af4373d4abd42c";
const LOCALIZATION_B = hashStarcraftTmgContract({ localizationDataset: "reconnect-b" });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function candidate(datasetHash, suffix, translatedText) {
  const intent = createStarcraftTmgTranslationIntent({
    datasetId: "starcraft-tmg.official-command-center.localization",
    datasetVersion: suffix === "a" ? "u71-c69-r48" : "u72-c69-r48",
    datasetHash,
    recordType: "unit",
    canonicalId: "adept",
    recordHash: hashStarcraftTmgContract({ unit: "adept", datasetHash }),
    fieldPath: "army_units[].name",
    canonicalText: "Adept",
    sourceLocale: "en",
    targetLocale: "zh-CN",
    glossary: STARCRAFT_TMG_ZH_CN_CORE_GLOSSARY_V1,
    providerClass: "direct_translation_provider",
    providerProfileRef: { id: "translation-admin-default", version: "1" },
    promptTemplateVersion: "starcraft-tmg-translation-prompt-v1",
    createdAt: suffix === "a" ? T0 : "2026-09-02T19:00:10.000Z",
  });
  const receiptBody = {
    schema: "starcraft_tmg_direct_translation_provider_receipt_v1",
    provider: "openai-compatible-direct",
    providerClass: "direct_translation_provider",
    model: "translation-model-v1",
    requestId: `slice117-${suffix}`,
    intentHash: intent.intentHash,
    datasetHash,
    glossaryHash: intent.glossaryRef.hash,
    displayOnly: true,
    mayAffectRules: false,
    eligibleForTraining: false,
    trainingTruth: false,
  };
  return createStarcraftTmgMachineTranslationCandidate({
    intent,
    translatedText,
    providerReceipt: { ...receiptBody, receiptHash: hashStarcraftTmgContract(receiptBody) },
    qualitySignals: { humanReviewRequired: true },
    createdAt: intent.createdAt,
  });
}

const candidateA = candidate(LOCALIZATION_A, "a", "使徒（草稿 A）");
const candidateB = candidate(LOCALIZATION_B, "b", "使徒（草稿 B）");
const reviewStore = createSqliteStarcraftTmgTranslationReviewStoreV1();
await reviewStore.initialize();
await reviewStore.putCandidate({
  candidate: candidateA,
  idempotencyKey: "slice117-a",
  actorId: "translation-worker",
  createdAt: T0,
});
await reviewStore.putCandidate({
  candidate: candidateB,
  idempotencyKey: "slice117-b",
  actorId: "translation-worker",
  createdAt: "2026-09-02T19:00:10.000Z",
});

const storageValues = new Map();
const storage = {
  descriptor: { adapter: "deterministic-device-key-value", deviceLocal: true, encryptedAtRest: false },
  getItem(key) { return storageValues.has(key) ? storageValues.get(key) : null; },
  setItem(key, value) { storageValues.set(key, value); },
  removeItem(key) { storageValues.delete(key); },
};
let clock = 1000;
const cache = createStarcraftTmgOfflineProvenanceCacheV1({
  storage,
  nowMs: () => clock,
  ttlMs: 100,
  maxEntries: 4,
});
let active = "a";
let sourceFailure = false;

function sourceFor(which) {
  if (which === "a") {
    return {
      sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
      sourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
      officialDatasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
      localizationDatasetHash: LOCALIZATION_A,
      sourceRevisionHash: hashStarcraftTmgContract({ sourceRevision: "a" }),
      authorityDisposition: "official_current_product_candidate",
      sourceReviewStatus: "captured_pending_independent_certification",
      rightsStatus: "unresolved_no_public_release",
      currentLocator: { sourceId: "starcraft-tmg.official.command-center", recordKey: "army_units:adept" },
      historicalLocators: [{ sourceId: "p2p-protoss-en", pdfPage: 1 }],
    };
  }
  return {
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: hashStarcraftTmgContract({ sourceSnapshot: "b" }),
    officialDatasetHash: hashStarcraftTmgContract({ officialDataset: "b" }),
    localizationDatasetHash: LOCALIZATION_B,
    sourceRevisionHash: hashStarcraftTmgContract({ sourceRevision: "b" }),
    authorityDisposition: "official_current_product_candidate",
    sourceReviewStatus: "candidate_pending_independent_certification",
    rightsStatus: "unresolved_no_public_release",
    currentLocator: { sourceId: "starcraft-tmg.official.command-center", recordKey: "army_units:adept" },
    historicalLocators: [{ sourceId: "p2p-protoss-en", pdfPage: 1 }],
  };
}

async function bundleFor(which) {
  const selected = which === "a" ? candidateA : candidateB;
  return createStarcraftTmgSourceReviewBundleV1({
    recordRef: selected.recordRef,
    targetLocale: selected.targetLocale,
    source: sourceFor(which),
    canonicalText: "Adept",
    reviewRecord: await reviewStore.getCandidate(selected.candidateHash),
  });
}

const sourceClient = {
  async fetchReviewBundle() {
    if (sourceFailure) throw new Error("simulated source network failure");
    return bundleFor(active);
  },
};
const controller = createStarcraftTmgSourceReviewControllerV1({ sourceClient, reviewStore, cache });
const admin = { id: "translation-admin-1", role: "translation_admin" };
const viewer = { id: "viewer-1", role: "viewer" };
const baseInput = {
  recordType: "unit",
  canonicalId: "adept",
  fieldPath: "army_units[].name",
  targetLocale: "zh-CN",
  locale: "zh-CN",
  localeFallbacks: ["en-US"],
  connectivity: "online",
  principal: admin,
};

const checks = [];
const failures = [];
async function check(id, fn) {
  try {
    await fn();
    checks.push({ id, passed: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push({ id, passed: false, error: message });
    failures.push(`${id}: ${message}`);
  }
}

let web;
let app;
let corrected;
let stale;
let reconnected;

await check("web_and_app_use_one_hash_identical_source_review_content_model", async () => {
  web = await controller.load({ ...baseInput, surface: "web", viewportWidth: 1280 });
  app = await controller.load({ ...baseInput, surface: "app", viewportWidth: 1280 });
  assert(web.sharedContentHash === app.sharedContentHash, "Web/App content semantics diverged");
  assert(web.content.text.machineDraft === "使徒（草稿 A）", "admin machine draft missing");
  assert(web.content.source.sourceSnapshotHash === OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH, "source provenance missing");
  assert(web.content.actions.correct.enabled && app.content.actions.correct.enabled, "pending admin actions not enabled");
});

await check("viewer_is_provenance_only_and_cannot_review_or_read_unreleased_body", async () => {
  const bundle = await bundleFor("a");
  const model = createStarcraftTmgSourceReviewViewModelV1({
    ...baseInput,
    surface: "web",
    viewportWidth: 1280,
    principal: viewer,
    bundle,
  });
  assert(model.content.textVisible === false && model.content.text.canonical === null, "unreleased source body reached viewer");
  assert(model.content.actions.approve.enabled === false, "viewer gained review action");
  let rejected = false;
  try {
    await controller.review({
      ...baseInput,
      principal: viewer,
      candidateHash: candidateA.candidateHash,
      expectedRevision: 0,
      decision: "approve",
      reviewedAt: "2026-09-02T19:00:20.000Z",
    });
  } catch (error) { rejected = error?.code === "SOURCE_REVIEW_ADMIN_REQUIRED"; }
  assert(rejected, "viewer review mutation was accepted");
});

await check("admin_correction_uses_store_cas_invalidates_cache_and_disables_repeat_actions", async () => {
  const result = await controller.review({
    ...baseInput,
    candidateHash: candidateA.candidateHash,
    expectedRevision: 0,
    decision: "approve_with_correction",
    correctedText: "使徒",
    reviewedAt: "2026-09-02T19:00:20.000Z",
    notes: "terminology correction",
  });
  assert(result.ok && result.record.status === "corrected" && result.cacheInvalidated, "CAS correction failed");
  corrected = await controller.load({ ...baseInput, surface: "web", viewportWidth: 1280 });
  assert(corrected.content.status === "corrected" && corrected.content.text.reviewed === "使徒", "corrected view missing");
  assert(corrected.content.actions.correct.enabled === false, "reviewed candidate remained actionable");
});

await check("desktop_tablet_mobile_layouts_preserve_touch_accessibility_and_board_geometry", async () => {
  const bundle = await bundleFor("a");
  const models = [
    createStarcraftTmgSourceReviewViewModelV1({ ...baseInput, surface: "web", viewportWidth: 1280, bundle }),
    createStarcraftTmgSourceReviewViewModelV1({ ...baseInput, surface: "web", viewportWidth: 800, bundle }),
    createStarcraftTmgSourceReviewViewModelV1({ ...baseInput, surface: "app", viewportWidth: 390, bundle }),
  ];
  assert(models.map((model) => model.layout.className).join("/") === "desktop/tablet/mobile", "responsive breakpoints mismatch");
  assert(models.every((model) => model.layout.minimumTouchTargetCssPx === 44), "touch target minimum changed");
  assert(models.every((model) => Object.entries(model.layout.boardGeometryIsolation)
    .filter(([key]) => key !== "placement").every(([, value]) => value === false)), "source panel changed board geometry");
  assert(models.every((model) => model.layout.responsiveWithoutHorizontalOverflow), "responsive overflow contract missing");
});

await check("web_html_and_app_native_tree_have_accessible_labels_status_and_controls", () => {
  const html = renderStarcraftTmgSourceReviewHtmlV1(corrected);
  const native = renderStarcraftTmgSourceReviewNativeTreeV1(app);
  assert(html.includes('role="region"') && html.includes('aria-live="polite"'), "Web landmark/live status missing");
  assert(html.includes('<label for="sc-source-review-correction">'), "Web correction label missing");
  assert((html.match(/<button /gu) || []).length === 3, "Web action button denominator mismatch");
  assert(STARCRAFT_TMG_SOURCE_REVIEW_CSS_V1.includes("min-block-size:44px"), "Web touch CSS missing");
  assert(native.children.filter((child) => child.type === "Button").every((button) => button.accessibilityLabel && button.minTouchTarget === 44), "App accessible buttons missing");
  assert(native.semanticContentHash === app.sharedContentHash, "native tree lost shared content binding");
});

await check("locale_fallback_is_deterministic_on_both_surfaces", async () => {
  const bundle = await bundleFor("a");
  const zh = createStarcraftTmgSourceReviewViewModelV1({ ...baseInput, surface: "web", viewportWidth: 800, locale: "zh-Hans", bundle });
  const en = createStarcraftTmgSourceReviewViewModelV1({ ...baseInput, surface: "app", viewportWidth: 390, locale: "fr-FR", localeFallbacks: ["en-US"], bundle });
  assert(zh.locale === "zh-CN" && zh.localeFallbackUsed, "Chinese locale fallback mismatch");
  assert(en.locale === "en-US" && en.localeFallbackUsed, "English locale fallback mismatch");
});

await check("offline_stale_fallback_exposes_metadata_only_and_disables_all_mutation", async () => {
  clock = 1200;
  stale = await controller.load({
    ...baseInput,
    surface: "web",
    viewportWidth: 800,
    connectivity: "offline",
    expectedSourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
    expectedOfficialDatasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
    expectedLocalizationDatasetHash: LOCALIZATION_A,
  });
  assert(stale.content.cache.stale && stale.content.cache.mode === "offline_metadata_cache", "stale offline mode missing");
  assert(stale.content.textVisible === false && stale.content.text.machineDraft === null, "offline cache leaked text body");
  assert(Object.values(stale.content.actions).filter((value) => typeof value === "object").every((action) => action.enabled === false), "offline action remained enabled");
});

await check("network_error_uses_stale_metadata_then_reconnect_refreshes_and_invalidates_prior_version", async () => {
  sourceFailure = true;
  const fallback = await controller.load({ ...baseInput, surface: "app", viewportWidth: 390 });
  assert(fallback.content.cache.mode === "network_error_stale_fallback", "network failure did not use cache");
  sourceFailure = false;
  active = "b";
  reconnected = await controller.load({ ...baseInput, surface: "app", viewportWidth: 390 });
  assert(reconnected.content.cache.mode === "network_refreshed_invalidated_prior", "reconnect did not invalidate old version");
  assert(reconnected.content.source.localizationDatasetHash === LOCALIZATION_B, "reconnect retained old dataset");
  assert(reconnected.content.text.machineDraft === "使徒（草稿 B）", "reconnect did not render new draft");
});

await check("new_version_is_available_offline_but_old_expected_hash_fails_closed", async () => {
  const latest = await controller.load({
    ...baseInput,
    surface: "app",
    viewportWidth: 390,
    connectivity: "offline",
    expectedSourceSnapshotHash: sourceFor("b").sourceSnapshotHash,
    expectedOfficialDatasetHash: sourceFor("b").officialDatasetHash,
    expectedLocalizationDatasetHash: LOCALIZATION_B,
  });
  assert(latest.content.source.localizationDatasetHash === LOCALIZATION_B, "new cached version unavailable offline");
  let rejected = false;
  try {
    await controller.load({
      ...baseInput,
      surface: "web",
      viewportWidth: 800,
      connectivity: "offline",
      expectedLocalizationDatasetHash: LOCALIZATION_A,
    });
  } catch (error) { rejected = error?.code === "SOURCE_REVIEW_OFFLINE_CACHE_UNAVAILABLE"; }
  assert(rejected, "old expected dataset silently used new cache");
});

await check("cache_contains_only_content_free_provenance_and_review_hashes", async () => {
  const inspection = await cache.inspect();
  const serialized = [...storageValues.values()].join("\n");
  assert(inspection.rawSourceBodyCached === false && inspection.translatedSourceBodyCached === false, "cache body policy widened");
  assert(inspection.credentialMaterialCached === false, "cache credential policy widened");
  assert(!serialized.includes("使徒（草稿") && !serialized.includes('"canonicalText":"Adept"'), "cache persisted source/translation bodies");
});

await check("tampered_cache_entry_is_invalidated_instead_of_rendered", async () => {
  active = "b";
  await controller.load({ ...baseInput, surface: "web", viewportWidth: 1280 });
  const entryKey = [...storageValues.keys()].find((key) => key.includes(":entry:"));
  const entry = JSON.parse(storageValues.get(entryKey));
  entry.projection.source.rightsStatus = "tampered-public";
  storageValues.set(entryKey, JSON.stringify(entry));
  let rejected = false;
  try {
    await controller.load({ ...baseInput, surface: "web", viewportWidth: 800, connectivity: "offline" });
  } catch (error) { rejected = error?.code === "SOURCE_REVIEW_OFFLINE_CACHE_UNAVAILABLE"; }
  assert(rejected && !storageValues.has(entryKey), "tampered cache entry rendered or remained stored");
});

reviewStore.close();

const report = {
  schema: "starcraft_tmg_ticket_12_slice_117_source_review_ui_offline_cache_verification_v1",
  generatedAt: "2026-09-02T19:10:00.000Z",
  ticket: 12,
  slice: 117,
  status: failures.length === 0 ? "passed" : "failed",
  checks,
  counts: {
    assertions: checks.length,
    passed: checks.filter((entry) => entry.passed).length,
    failed: failures.length,
    surfaces: 2,
    responsiveLayouts: 3,
    minimumTouchTargetCssPx: 44,
  },
  evidence: {
    webViewModelHash: web?.viewModelHash || null,
    appViewModelHash: app?.viewModelHash || null,
    sharedContentHash: web?.sharedContentHash || null,
    correctedViewModelHash: corrected?.viewModelHash || null,
    staleViewModelHash: stale?.viewModelHash || null,
    reconnectedViewModelHash: reconnected?.viewModelHash || null,
    offlineBodiesCached: false,
    boardGeometryChanged: false,
    sourceRefreshPerformed: false,
    productionReady: false,
    trainingTruth: false,
  },
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["fact_probe"],
    skillsRead: 0,
    skillsGenerated: 0,
    judgeTests: checks.length,
    crossTimeReplayResult: failures.length === 0 ? "passed" : "failed",
    promotions: [],
    blocks: ["source_body_public_rights_unresolved", "offline_cache_is_metadata_only", "translation_remains_display_only"],
    remainingRuleGaps: 0,
  },
  dshUsed: false,
  muzeroUsed: false,
  selfPlayUsed: false,
  trainingPromotion: false,
  failures,
};
report.reportHash = hashStarcraftTmgContract(report);
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
