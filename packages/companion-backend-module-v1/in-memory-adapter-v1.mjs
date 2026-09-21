import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";
import {
  COMPANION_BACKEND_CONTRACT_VERSION,
  COMPANION_BACKEND_ERROR_CODES,
  COMPANION_PERSISTENCE_PORT_V1,
  COMPANION_PROVIDER_PORT_V1,
  CompanionBackendError,
  assertNoCredentials,
  assertNoHiddenChainOfThought,
  createCompanionProviderResponse,
} from "./contracts-v1.mjs";

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function fail(code, message, details) {
  throw new CompanionBackendError(code, message, details);
}

function namespaceStore(store, namespace) {
  let bucket = store.get(namespace);
  if (!bucket) {
    bucket = new Map();
    store.set(namespace, bucket);
  }
  return bucket;
}

function snapshotStore(store) {
  const snapshot = {};
  for (const [namespace, bucket] of [...store.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    snapshot[namespace] = Object.fromEntries(
      [...bucket.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => [key, clone(value)]),
    );
  }
  return snapshot;
}

export function createInMemoryPersistenceAdapter(options = {}) {
  if (options.durable === true) {
    fail(COMPANION_BACKEND_ERROR_CODES.PERSISTENCE_FAKE_DURABLE,
      "the in-memory persistence adapter cannot claim durable persistence; durable adapters are a later Codex integration");
  }
  const adapterId = String(options.adapterId || "in-memory-persistence-v1");
  const store = new Map();
  const checkpoints = new Map();
  let checkpointSequence = 0;
  let closed = false;

  function ensureOpen() {
    if (closed) {
      fail(COMPANION_BACKEND_ERROR_CODES.PERSISTENCE_CLOSED, `persistence adapter is closed: ${adapterId}`);
    }
  }

  async function put(namespace, key, value) {
    ensureOpen();
    const ns = String(namespace || "").trim();
    const normalizedKey = String(key || "").trim();
    if (!ns || !normalizedKey) {
      fail(COMPANION_BACKEND_ERROR_CODES.PACKAGE_INVALID, "persistence put requires a non-empty namespace and key");
    }
    const stored = clone(value);
    namespaceStore(store, ns).set(normalizedKey, stored);
    return deepFreeze({
      ok: true,
      namespace: ns,
      key: normalizedKey,
      valueHash: hashStarcraftTmgContract(stored === undefined ? null : stored),
      durable: false,
    });
  }

  async function get(namespace, key) {
    ensureOpen();
    const bucket = store.get(String(namespace || ""));
    const found = Boolean(bucket && bucket.has(String(key || "")));
    return deepFreeze({
      ok: true,
      found,
      value: found ? clone(bucket.get(String(key || ""))) : undefined,
      durable: false,
    });
  }

  async function deleteEntry(namespace, key) {
    ensureOpen();
    const bucket = store.get(String(namespace || ""));
    const deleted = Boolean(bucket && bucket.delete(String(key || "")));
    return deepFreeze({ ok: true, deleted, durable: false });
  }

  async function list(namespace, filter = {}) {
    ensureOpen();
    const bucket = store.get(String(namespace || ""));
    const prefix = filter.prefix === undefined ? null : String(filter.prefix);
    const keys = bucket ? [...bucket.keys()] : [];
    return deepFreeze(keys.filter((key) => prefix === null || key.startsWith(prefix)).sort());
  }

  async function checkpoint(label = "") {
    ensureOpen();
    checkpointSequence += 1;
    const snapshot = snapshotStore(store);
    const contentHash = hashStarcraftTmgContract(snapshot);
    const checkpointId = `ckpt-${adapterId}-${checkpointSequence}-${contentHash.slice(0, 16)}`;
    checkpoints.set(checkpointId, deepFreeze({
      checkpointId,
      label: String(label || ""),
      contentHash,
      snapshot,
      durable: false,
    }));
    return deepFreeze({ ok: true, checkpointId, contentHash, durable: false });
  }

  async function restore(checkpointId) {
    ensureOpen();
    const record = checkpoints.get(String(checkpointId || ""));
    if (!record) {
      return deepFreeze({
        ok: false,
        reason: "checkpoint_not_found",
        checkpointId: String(checkpointId || ""),
        durable: false,
      });
    }
    if (hashStarcraftTmgContract(record.snapshot) !== record.contentHash) {
      fail(COMPANION_BACKEND_ERROR_CODES.CONTRACT_INTEGRITY_MISMATCH, `checkpoint integrity mismatch: ${checkpointId}`);
    }
    store.clear();
    for (const [namespace, bucket] of Object.entries(clone(record.snapshot))) {
      store.set(namespace, new Map(Object.entries(bucket)));
    }
    return deepFreeze({ ok: true, checkpointId: record.checkpointId, contentHash: record.contentHash, durable: false });
  }

  async function exportSnapshot() {
    ensureOpen();
    return `${JSON.stringify({
      schemaVersion: `${COMPANION_BACKEND_CONTRACT_VERSION}.persistence-snapshot`,
      adapterId,
      durable: false,
      durability: "volatile_in_memory",
      warning: "snapshot export is a conformance artifact, not durable persistence",
      data: snapshotStore(store),
    }, null, 2)}\n`;
  }

  async function close() {
    closed = true;
    return deepFreeze({ ok: true, durable: false });
  }

  return Object.freeze({
    portId: COMPANION_PERSISTENCE_PORT_V1.portId,
    adapterId,
    durable: false,
    durability: "volatile_in_memory",
    get,
    put,
    delete: deleteEntry,
    list,
    checkpoint,
    restore,
    exportSnapshot,
    close,
  });
}

export function createInMemoryProviderAdapter(options = {}) {
  assertNoCredentials(options, "providerAdapterOptions");
  assertNoHiddenChainOfThought(options, "providerAdapterOptions");
  for (const forbidden of ["baseUrl", "endpoint", "url", "fetch", "socket", "transport"]) {
    if (options[forbidden] !== undefined) {
      fail(COMPANION_BACKEND_ERROR_CODES.PROVIDER_NETWORK_FORBIDDEN,
        `in-memory provider adapter must not be configured with network capability: ${forbidden}`);
    }
  }
  const responder = options.responder;
  if (responder !== undefined && typeof responder !== "function") {
    fail(COMPANION_BACKEND_ERROR_CODES.PROVIDER_RESPONDER_ERROR, "provider adapter responder must be an injected pure function");
  }
  const adapterId = String(options.adapterId || "in-memory-provider-v1");
  let calls = 0;
  const usage = { promptTokens: 0, completionTokens: 0, reportedCostUnits: 0 };

  function providerRejection(reason, details = {}) {
    return deepFreeze({
      ok: false,
      schemaVersion: `${COMPANION_BACKEND_CONTRACT_VERSION}.provider-rejection`,
      reason,
      failClosed: true,
      networkAttempts: 0,
      ...clone(details),
    });
  }

  async function complete(request) {
    if (!request || request.schemaVersion !== `${COMPANION_BACKEND_CONTRACT_VERSION}.provider-request`) {
      fail(COMPANION_BACKEND_ERROR_CODES.PROVIDER_REQUEST_INVALID, "provider complete requires a companion provider request contract");
    }
    assertNoHiddenChainOfThought(request, "providerRequest");
    assertNoCredentials(request, "providerRequest");
    calls += 1;
    if (!responder) {
      return providerRejection("provider_unavailable", {
        message: "no responder injected; this module ships no Provider implementation and performs no network calls",
      });
    }
    let raw;
    try {
      raw = await responder(clone(request));
    } catch (error) {
      return providerRejection(COMPANION_BACKEND_ERROR_CODES.PROVIDER_RESPONDER_ERROR, {
        message: error instanceof Error ? error.message : String(error),
      });
    }
    try {
      const response = createCompanionProviderResponse(raw || {});
      usage.promptTokens += response.usage.promptTokens;
      usage.completionTokens += response.usage.completionTokens;
      usage.reportedCostUnits += response.usage.reportedCostUnits;
      return deepFreeze({ ok: true, response });
    } catch (error) {
      if (error instanceof CompanionBackendError) {
        return providerRejection(error.code, { message: error.message, ...clone(error.details) });
      }
      throw error;
    }
  }

  function stats() {
    return deepFreeze({ calls, ...usage, networkAttempts: 0 });
  }

  return Object.freeze({
    portId: COMPANION_PROVIDER_PORT_V1.portId,
    adapterId,
    implementsRealProvider: false,
    network: "none",
    complete,
    stats,
  });
}
