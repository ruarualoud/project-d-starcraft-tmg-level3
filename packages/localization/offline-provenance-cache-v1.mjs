import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const STARCRAFT_TMG_OFFLINE_PROVENANCE_CACHE_VERSION =
  "starcraft_tmg_offline_provenance_cache_v1";

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

function assertBundle(bundle) {
  if (!bundle?.bundleHash
    || hashStarcraftTmgContract(without(bundle, ["bundleHash"])) !== bundle.bundleHash
    || bundle.displayOnly !== true
    || bundle.mayAffectRules !== false
    || bundle.trainingTruth !== false) {
    fail("OFFLINE_PROVENANCE_BUNDLE_INVALID");
  }
  return bundle;
}

function publicProjection(bundle) {
  const record = bundle.reviewRecord;
  return {
    schema: "starcraft_tmg_offline_provenance_projection_v1",
    bundleHash: bundle.bundleHash,
    recordRef: clone(bundle.recordRef),
    targetLocale: bundle.targetLocale,
    source: clone(bundle.source),
    reviewSummary: record ? {
      candidateHash: record.candidate?.candidateHash || null,
      status: record.status,
      revision: record.revision,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      reviewEntryHash: record.reviewEntry?.entryHash || null,
      providerReceiptHash: record.candidate?.providerReceipt?.receiptHash || null,
    } : null,
    canonicalTextHash: bundle.field?.canonicalTextHash || null,
    draftTextHash: bundle.field?.draftTextHash || null,
    textAvailableOffline: false,
    rawSourceBodyCached: false,
    translatedSourceBodyCached: false,
    credentialMaterialCached: false,
    deviceLocalOnly: true,
    redistributionAllowed: false,
    displayOnly: true,
    mayAffectRules: false,
    trainingTruth: false,
  };
}

export function createStarcraftTmgMemoryCacheStorageV1() {
  const values = new Map();
  return Object.freeze({
    descriptor: Object.freeze({ adapter: "memory", deviceLocal: true, encryptedAtRest: false }),
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); },
  });
}

export function createStarcraftTmgOfflineProvenanceCacheV1(options = {}) {
  const storage = options.storage;
  if (!storage || typeof storage.getItem !== "function"
    || typeof storage.setItem !== "function" || typeof storage.removeItem !== "function") {
    throw new Error("offline provenance cache storage is required");
  }
  const nowMs = options.nowMs || (() => Date.now());
  const ttlMs = Number(options.ttlMs ?? 5 * 60 * 1000);
  const maxEntries = Number(options.maxEntries ?? 100);
  if (!Number.isSafeInteger(ttlMs) || ttlMs < 1
    || !Number.isSafeInteger(maxEntries) || maxEntries < 1 || maxEntries > 1000) {
    throw new Error("offline provenance cache bounds are invalid");
  }
  const indexKey = `${STARCRAFT_TMG_OFFLINE_PROVENANCE_CACHE_VERSION}:index`;
  const entryKey = (key) => `${STARCRAFT_TMG_OFFLINE_PROVENANCE_CACHE_VERSION}:entry:${hashStarcraftTmgContract(key)}`;

  function readIndex() {
    const raw = storage.getItem(indexKey);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      fail("OFFLINE_PROVENANCE_CACHE_INDEX_INVALID");
    }
  }

  function writeIndex(index) {
    storage.setItem(indexKey, JSON.stringify(index));
  }

  function removeKey(key) {
    storage.removeItem(entryKey(key));
    writeIndex(readIndex().filter((entry) => entry.key !== key));
  }

  async function put({ key, bundle }) {
    const normalizedKey = String(key || "").trim();
    if (!normalizedKey) fail("OFFLINE_PROVENANCE_CACHE_KEY_REQUIRED");
    assertBundle(bundle);
    const projection = publicProjection(bundle);
    const cachedAtMs = nowMs();
    const body = {
      schema: "starcraft_tmg_offline_provenance_cache_entry_v1",
      key: normalizedKey,
      sourceBundleHash: bundle.bundleHash,
      sourceSnapshotHash: bundle.source.sourceSnapshotHash,
      officialDatasetHash: bundle.source.officialDatasetHash,
      localizationDatasetHash: bundle.source.localizationDatasetHash,
      cachedAtMs,
      expiresAtMs: cachedAtMs + ttlMs,
      projection,
    };
    const entry = { ...body, entryHash: hashStarcraftTmgContract(body) };
    const priorRaw = storage.getItem(entryKey(normalizedKey));
    let prior = null;
    if (priorRaw) {
      try { prior = JSON.parse(priorRaw); } catch { prior = null; }
    }
    storage.setItem(entryKey(normalizedKey), JSON.stringify(entry));
    let index = readIndex().filter((item) => item.key !== normalizedKey);
    index.push({ key: normalizedKey, cachedAtMs });
    index.sort((left, right) => right.cachedAtMs - left.cachedAtMs || left.key.localeCompare(right.key));
    for (const evicted of index.slice(maxEntries)) storage.removeItem(entryKey(evicted.key));
    index = index.slice(0, maxEntries);
    writeIndex(index);
    return deepFreeze({
      entry: clone(entry),
      invalidatedPrior: Boolean(prior && (
        prior.sourceSnapshotHash !== entry.sourceSnapshotHash
        || prior.officialDatasetHash !== entry.officialDatasetHash
        || prior.localizationDatasetHash !== entry.localizationDatasetHash
        || prior.sourceBundleHash !== entry.sourceBundleHash
      )),
    });
  }

  async function get({
    key,
    expectedSourceSnapshotHash = null,
    expectedOfficialDatasetHash = null,
    expectedLocalizationDatasetHash = null,
    allowStale = false,
  }) {
    const normalizedKey = String(key || "").trim();
    const raw = storage.getItem(entryKey(normalizedKey));
    if (!raw) return deepFreeze({ hit: false, reason: "not_found" });
    let entry;
    try { entry = JSON.parse(raw); } catch {
      removeKey(normalizedKey);
      return deepFreeze({ hit: false, reason: "corrupt_invalidated" });
    }
    if (entry.entryHash !== hashStarcraftTmgContract(without(entry, ["entryHash"]))) {
      removeKey(normalizedKey);
      return deepFreeze({ hit: false, reason: "integrity_invalidated" });
    }
    const mismatch = (
      (expectedSourceSnapshotHash && entry.sourceSnapshotHash !== expectedSourceSnapshotHash)
      || (expectedOfficialDatasetHash && entry.officialDatasetHash !== expectedOfficialDatasetHash)
      || (expectedLocalizationDatasetHash && entry.localizationDatasetHash !== expectedLocalizationDatasetHash)
    );
    if (mismatch) {
      removeKey(normalizedKey);
      return deepFreeze({ hit: false, reason: "source_version_invalidated" });
    }
    const stale = nowMs() > entry.expiresAtMs;
    if (stale && !allowStale) return deepFreeze({ hit: false, reason: "stale", stale: true });
    return deepFreeze({
      hit: true,
      stale,
      entry: clone(entry),
      projection: clone(entry.projection),
      source: "device_local_metadata_cache",
    });
  }

  async function invalidate(key) {
    removeKey(String(key || "").trim());
    return deepFreeze({ ok: true });
  }

  async function inspect() {
    return deepFreeze({
      schema: `${STARCRAFT_TMG_OFFLINE_PROVENANCE_CACHE_VERSION}.inspection`,
      entryCount: readIndex().length,
      ttlMs,
      maxEntries,
      storage: clone(storage.descriptor || { adapter: "unknown" }),
      rawSourceBodyCached: false,
      translatedSourceBodyCached: false,
      credentialMaterialCached: false,
      trainingTruth: false,
    });
  }

  return Object.freeze({ put, get, invalidate, inspect });
}
