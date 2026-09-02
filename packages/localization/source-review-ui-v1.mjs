import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { assertStarcraftTmgPersistentTranslationCandidate } from
  "./translation-review-store-contract-v1.mjs";

export const STARCRAFT_TMG_SOURCE_REVIEW_UI_VERSION =
  "starcraft_tmg_source_review_ui_v1";

const HASH = /^[a-f0-9]{64}$/u;
const LABELS = Object.freeze({
  "zh-CN": Object.freeze({
    title: "来源与翻译审核",
    source: "来源证据",
    canonical: "原文",
    machineDraft: "机器翻译草稿",
    reviewed: "审核展示文本",
    approve: "批准草稿",
    correct: "修正并批准",
    reject: "拒绝草稿",
    correction: "人工修正",
    offline: "当前离线：仅显示本机缓存的来源元数据，正文和审核操作不可用。",
    stale: "来源元数据缓存已过期；重新联网后将自动刷新。",
    rights: "来源正文的公开发布权尚未通过独立审核。",
    noText: "离线或无权限，正文未缓存。",
    pending: "待审核",
    approved: "已批准",
    corrected: "已人工修正",
    rejected: "已拒绝",
  }),
  "en-US": Object.freeze({
    title: "Source and translation review",
    source: "Source evidence",
    canonical: "Canonical text",
    machineDraft: "Machine draft",
    reviewed: "Reviewed display text",
    approve: "Approve draft",
    correct: "Correct and approve",
    reject: "Reject draft",
    correction: "Human correction",
    offline: "Offline: only device-cached provenance metadata is available; text and review actions are disabled.",
    stale: "Cached provenance is stale and will refresh after reconnecting.",
    rights: "Public release of source bodies has not passed independent rights review.",
    noText: "Text is not cached offline or is unavailable to this role.",
    pending: "Pending review",
    approved: "Approved",
    corrected: "Human corrected",
    rejected: "Rejected",
  }),
});

function fail(code, detail = "") {
  const error = new Error(detail ? `${code}:${detail}` : code);
  error.code = code;
  throw error;
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value || {}).filter(([key]) => !keys.includes(key)));
}

function requireHash(value, code) {
  if (!HASH.test(String(value || ""))) fail(code);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function resolveLocale(requested, fallbacks = []) {
  const candidates = [requested, ...fallbacks, "en-US"].map((value) => String(value || ""));
  for (const candidate of candidates) {
    if (LABELS[candidate]) return { locale: candidate, fallbackUsed: candidate !== requested };
    if (candidate.toLowerCase().startsWith("zh")) return { locale: "zh-CN", fallbackUsed: candidate !== "zh-CN" };
    if (candidate.toLowerCase().startsWith("en")) return { locale: "en-US", fallbackUsed: candidate !== "en-US" };
  }
  return { locale: "en-US", fallbackUsed: true };
}

function viewport(width) {
  const value = Number(width);
  if (!Number.isFinite(value) || value < 240 || value > 10000) fail("SOURCE_REVIEW_VIEWPORT_INVALID");
  if (value >= 1024) return { className: "desktop", columns: 2, panelMode: "side_panel" };
  if (value >= 640) return { className: "tablet", columns: 1, panelMode: "sheet" };
  return { className: "mobile", columns: 1, panelMode: "full_width_sheet" };
}

export function createStarcraftTmgSourceReviewBundleV1(input = {}) {
  const reviewRecord = input.reviewRecord;
  const candidate = reviewRecord?.candidate;
  assertStarcraftTmgPersistentTranslationCandidate(candidate);
  for (const [field, code] of [
    [input.source?.sourceLockHash, "SOURCE_REVIEW_LOCK_HASH_INVALID"],
    [input.source?.sourceSnapshotHash, "SOURCE_REVIEW_SNAPSHOT_HASH_INVALID"],
    [input.source?.officialDatasetHash, "SOURCE_REVIEW_OFFICIAL_DATASET_HASH_INVALID"],
    [input.source?.localizationDatasetHash, "SOURCE_REVIEW_LOCALIZATION_DATASET_HASH_INVALID"],
  ]) requireHash(field, code);
  if (candidate.datasetRef.datasetHash !== input.source.localizationDatasetHash
    || candidate.recordRef.recordType !== input.recordRef?.recordType
    || candidate.recordRef.canonicalId !== input.recordRef?.canonicalId
    || candidate.recordRef.fieldPath !== input.recordRef?.fieldPath
    || candidate.targetLocale !== input.targetLocale) {
    fail("SOURCE_REVIEW_BUNDLE_CANDIDATE_BINDING_MISMATCH");
  }
  const canonicalText = String(input.canonicalText || "");
  if (!canonicalText || hashStarcraftTmgContract(canonicalText) !== candidate.canonicalTextHash) {
    fail("SOURCE_REVIEW_CANONICAL_TEXT_MISMATCH");
  }
  const source = {
    sourceLockHash: input.source.sourceLockHash,
    sourceSnapshotHash: input.source.sourceSnapshotHash,
    officialDatasetHash: input.source.officialDatasetHash,
    localizationDatasetHash: input.source.localizationDatasetHash,
    sourceRevisionHash: input.source.sourceRevisionHash || null,
    authorityDisposition: String(input.source.authorityDisposition || ""),
    sourceReviewStatus: String(input.source.sourceReviewStatus || ""),
    rightsStatus: String(input.source.rightsStatus || "unresolved"),
    currentLocator: clone(input.source.currentLocator || null),
    historicalLocators: clone(input.source.historicalLocators || []),
    rawSourceBodyIncluded: false,
    publicDisplayReleaseAllowed: false,
    repositoryFallbackAllowed: false,
  };
  const field = {
    canonicalText,
    canonicalTextHash: candidate.canonicalTextHash,
    draftText: candidate.translatedText,
    draftTextHash: candidate.translatedTextHash,
    reviewedText: reviewRecord.reviewEntry?.displayText || null,
    reviewedTextHash: reviewRecord.reviewEntry?.displayTextHash || null,
  };
  const body = {
    schema: "starcraft_tmg_source_review_bundle_v1",
    recordRef: clone(input.recordRef),
    targetLocale: input.targetLocale,
    source,
    field,
    reviewRecord: clone(reviewRecord),
    displayOnly: true,
    mayAffectRules: false,
    trainingTruth: false,
  };
  return deepFreeze({ ...body, bundleHash: hashStarcraftTmgContract(body) });
}

export function verifyStarcraftTmgSourceReviewBundleV1(bundle) {
  if (!bundle?.bundleHash
    || hashStarcraftTmgContract(without(bundle, ["bundleHash"])) !== bundle.bundleHash
    || bundle.displayOnly !== true || bundle.mayAffectRules !== false
    || bundle.trainingTruth !== false
    || bundle.source?.rawSourceBodyIncluded !== false
    || bundle.source?.publicDisplayReleaseAllowed !== false
    || bundle.source?.repositoryFallbackAllowed !== false) {
    fail("SOURCE_REVIEW_BUNDLE_INVALID");
  }
  assertStarcraftTmgPersistentTranslationCandidate(bundle.reviewRecord?.candidate);
  return bundle;
}

export function createStarcraftTmgSourceReviewViewModelV1(input = {}) {
  const surface = input.surface;
  if (!['web', 'app'].includes(surface)) fail("SOURCE_REVIEW_SURFACE_INVALID");
  const localeResolution = resolveLocale(input.locale, input.localeFallbacks);
  const labels = LABELS[localeResolution.locale];
  const layout = viewport(input.viewportWidth);
  const onlineBundle = input.bundle ? verifyStarcraftTmgSourceReviewBundleV1(input.bundle) : null;
  const offline = input.offlineProjection || null;
  if (!onlineBundle && !offline) fail("SOURCE_REVIEW_DATA_REQUIRED");
  const source = clone(onlineBundle?.source || offline.source);
  const reviewRecord = onlineBundle?.reviewRecord || null;
  const summary = offline?.reviewSummary || null;
  const status = reviewRecord?.status || summary?.status || "pending";
  const revision = reviewRecord?.revision ?? summary?.revision ?? 0;
  const candidateHash = reviewRecord?.candidate?.candidateHash || summary?.candidateHash || null;
  const connected = input.connectivity === "online" && Boolean(onlineBundle);
  const admin = input.principal?.role === "translation_admin";
  const textVisible = connected && admin;
  const pending = status === "pending";
  const actionEnabled = connected && admin && pending;
  const text = textVisible ? {
    canonical: onlineBundle.field.canonicalText,
    machineDraft: onlineBundle.field.draftText,
    reviewed: onlineBundle.field.reviewedText,
  } : { canonical: null, machineDraft: null, reviewed: null };
  const content = {
    recordRef: clone(onlineBundle?.recordRef || offline.recordRef),
    targetLocale: onlineBundle?.targetLocale || offline.targetLocale,
    source,
    candidateHash,
    status,
    revision,
    text,
    textVisible,
    actions: {
      approve: { enabled: actionEnabled },
      correct: { enabled: actionEnabled },
      reject: { enabled: actionEnabled },
      requiresOnline: true,
      requiresRole: "translation_admin",
      usesRevisionCas: true,
    },
    cache: {
      mode: input.cacheMode || "network_fresh",
      stale: input.cacheStale === true,
      textAvailableOffline: false,
      rawSourceBodyCached: false,
    },
    rights: {
      publicDisplayReleaseAllowed: false,
      sourceBodyVisibleToAdminOnlineOnly: true,
    },
  };
  const model = {
    schema: "starcraft_tmg_source_review_view_model_v1",
    surface,
    locale: localeResolution.locale,
    localeFallbackUsed: localeResolution.fallbackUsed,
    labels,
    content,
    layout: {
      ...layout,
      viewportWidth: Number(input.viewportWidth),
      minimumTouchTargetCssPx: 44,
      responsiveWithoutHorizontalOverflow: true,
      boardGeometryIsolation: {
        placement: layout.panelMode,
        changesWorldToCssScale: false,
        changesViewportFit: false,
        changesBoardPanOrZoom: false,
        changesBaseOrTokenGeometry: false,
        changesRulesCollision: false,
      },
    },
    accessibility: {
      landmark: "region",
      headingLevel: 2,
      statusLiveRegion: "polite",
      correctionHasExplicitLabel: true,
      buttonsHaveAccessibleNames: true,
      minimumTouchTargetCssPx: 44,
    },
    displayOnly: true,
    mayAffectRules: false,
    trainingTruth: false,
  };
  model.sharedContentHash = hashStarcraftTmgContract(content);
  model.viewModelHash = hashStarcraftTmgContract(without(model, ["viewModelHash"]));
  return deepFreeze(model);
}

export const STARCRAFT_TMG_SOURCE_REVIEW_CSS_V1 = `
.sc-source-review{box-sizing:border-box;display:grid;gap:16px;grid-template-columns:minmax(0,1fr);max-inline-size:100%;overflow-wrap:anywhere}
.sc-source-review *{box-sizing:border-box}
.sc-source-review__evidence{display:grid;grid-template-columns:minmax(7rem,.45fr) minmax(0,1fr);gap:8px 12px}
.sc-source-review__actions{display:grid;gap:8px;grid-template-columns:repeat(3,minmax(0,1fr))}
.sc-source-review button,.sc-source-review textarea{min-block-size:44px}
.sc-source-review textarea{inline-size:100%;min-inline-size:0}
@media (max-width:639px){.sc-source-review__actions{grid-template-columns:1fr}.sc-source-review__evidence{grid-template-columns:1fr}}
@media (min-width:1024px){.sc-source-review{grid-template-columns:minmax(0,1fr) minmax(20rem,.7fr)}}
`;

export function renderStarcraftTmgSourceReviewHtmlV1(model) {
  const statusLabel = model.labels[model.content.status] || model.content.status;
  const text = model.content.text;
  const disabled = (name) => model.content.actions[name].enabled ? "" : " disabled aria-disabled=\"true\"";
  const display = (value) => escapeHtml(value || model.labels.noText);
  return `<section class="sc-source-review" data-layout="${model.layout.className}" role="region" aria-labelledby="sc-source-review-title">
  <div>
    <h2 id="sc-source-review-title">${escapeHtml(model.labels.title)}</h2>
    <p role="status" aria-live="polite">${escapeHtml(statusLabel)}</p>
    ${model.content.cache.mode !== "network_fresh" ? `<p role="status">${escapeHtml(model.labels.offline)}</p>` : ""}
    ${model.content.cache.stale ? `<p role="status">${escapeHtml(model.labels.stale)}</p>` : ""}
    <p>${escapeHtml(model.labels.rights)}</p>
    <h3>${escapeHtml(model.labels.canonical)}</h3><p>${display(text.canonical)}</p>
    <h3>${escapeHtml(model.labels.machineDraft)}</h3><p>${display(text.machineDraft)}</p>
    <h3>${escapeHtml(model.labels.reviewed)}</h3><p>${display(text.reviewed)}</p>
  </div>
  <aside aria-label="${escapeHtml(model.labels.source)}">
    <h3>${escapeHtml(model.labels.source)}</h3>
    <dl class="sc-source-review__evidence">
      <dt>snapshot</dt><dd>${escapeHtml(model.content.source.sourceSnapshotHash)}</dd>
      <dt>dataset</dt><dd>${escapeHtml(model.content.source.officialDatasetHash)}</dd>
      <dt>authority</dt><dd>${escapeHtml(model.content.source.authorityDisposition)}</dd>
      <dt>rights</dt><dd>${escapeHtml(model.content.source.rightsStatus)}</dd>
    </dl>
    <label for="sc-source-review-correction">${escapeHtml(model.labels.correction)}</label>
    <textarea id="sc-source-review-correction"${model.content.actions.correct.enabled ? "" : " disabled aria-disabled=\"true\""}></textarea>
    <div class="sc-source-review__actions">
      <button type="button" data-action="approve"${disabled("approve")}>${escapeHtml(model.labels.approve)}</button>
      <button type="button" data-action="correct"${disabled("correct")}>${escapeHtml(model.labels.correct)}</button>
      <button type="button" data-action="reject"${disabled("reject")}>${escapeHtml(model.labels.reject)}</button>
    </div>
  </aside>
</section>`;
}

export function renderStarcraftTmgSourceReviewNativeTreeV1(model) {
  return deepFreeze({
    type: model.layout.panelMode === "side_panel" ? "SidePanel" : "BottomSheet",
    accessibilityRole: "summary",
    accessibilityLabel: model.labels.title,
    minTouchTarget: 44,
    semanticContentHash: model.sharedContentHash,
    children: [
      { type: "Heading", level: 2, text: model.labels.title },
      { type: "Status", liveRegion: "polite", text: model.labels[model.content.status] },
      { type: "TextBlock", label: model.labels.canonical, text: model.content.text.canonical || model.labels.noText },
      { type: "TextBlock", label: model.labels.machineDraft, text: model.content.text.machineDraft || model.labels.noText },
      { type: "TextArea", label: model.labels.correction, enabled: model.content.actions.correct.enabled, minTouchTarget: 44 },
      ...["approve", "correct", "reject"].map((action) => ({
        type: "Button",
        action,
        accessibilityLabel: model.labels[action],
        enabled: model.content.actions[action].enabled,
        minTouchTarget: 44,
      })),
    ],
    boardGeometryIsolation: clone(model.layout.boardGeometryIsolation),
  });
}

export function createStarcraftTmgSourceReviewControllerV1(options = {}) {
  const sourceClient = options.sourceClient;
  const reviewStore = options.reviewStore;
  const cache = options.cache;
  if (typeof sourceClient?.fetchReviewBundle !== "function"
    || typeof reviewStore?.reviewCandidate !== "function"
    || typeof cache?.put !== "function" || typeof cache?.get !== "function") {
    throw new Error("sourceClient, reviewStore, and cache are required");
  }

  function cacheKey(input) {
    return [input.recordType, input.canonicalId, input.fieldPath, input.targetLocale].join("\u001f");
  }

  async function load(input = {}) {
    const key = cacheKey(input);
    if (input.connectivity === "online") {
      try {
        const bundle = verifyStarcraftTmgSourceReviewBundleV1(
          await sourceClient.fetchReviewBundle(clone(input)),
        );
        const cacheWrite = await cache.put({ key, bundle });
        return createStarcraftTmgSourceReviewViewModelV1({
          ...input,
          bundle,
          cacheMode: cacheWrite.invalidatedPrior ? "network_refreshed_invalidated_prior" : "network_fresh",
          cacheStale: false,
        });
      } catch (error) {
        const cached = await cache.get({
          key,
          expectedSourceSnapshotHash: input.expectedSourceSnapshotHash,
          expectedOfficialDatasetHash: input.expectedOfficialDatasetHash,
          expectedLocalizationDatasetHash: input.expectedLocalizationDatasetHash,
          allowStale: true,
        });
        if (!cached.hit) throw error;
        return createStarcraftTmgSourceReviewViewModelV1({
          ...input,
          connectivity: "offline",
          offlineProjection: cached.projection,
          cacheMode: "network_error_stale_fallback",
          cacheStale: cached.stale,
        });
      }
    }
    const cached = await cache.get({
      key,
      expectedSourceSnapshotHash: input.expectedSourceSnapshotHash,
      expectedOfficialDatasetHash: input.expectedOfficialDatasetHash,
      expectedLocalizationDatasetHash: input.expectedLocalizationDatasetHash,
      allowStale: true,
    });
    if (!cached.hit) fail("SOURCE_REVIEW_OFFLINE_CACHE_UNAVAILABLE", cached.reason);
    return createStarcraftTmgSourceReviewViewModelV1({
      ...input,
      offlineProjection: cached.projection,
      cacheMode: "offline_metadata_cache",
      cacheStale: cached.stale,
    });
  }

  async function review(input = {}) {
    if (input.connectivity !== "online") fail("SOURCE_REVIEW_ONLINE_REQUIRED");
    if (input.principal?.role !== "translation_admin") fail("SOURCE_REVIEW_ADMIN_REQUIRED");
    const result = await reviewStore.reviewCandidate({
      candidateHash: input.candidateHash,
      expectedRevision: input.expectedRevision,
      decision: input.decision,
      correctedText: input.correctedText,
      reviewerId: input.principal.id,
      reviewedAt: input.reviewedAt,
      notes: input.notes,
    });
    await cache.invalidate(cacheKey(input));
    return deepFreeze({ ok: true, record: clone(result), cacheInvalidated: true });
  }

  return Object.freeze({ load, review });
}
