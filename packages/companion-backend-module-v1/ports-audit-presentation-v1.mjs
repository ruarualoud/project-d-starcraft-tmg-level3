import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";
import {
  COMPANION_BACKEND_CONTRACT_VERSION,
  COMPANION_BACKEND_ERROR_CODES,
  COMPANION_PRESENTATION_STATES,
  COMPANION_PROVIDER_PORT_V1,
  CompanionBackendError,
  assertCompanionPersistencePort,
  assertCompanionProviderPort,
  assertNoCredentials,
  assertNoHiddenChainOfThought,
  createCompanionProviderRequest,
  createCompanionProviderResponse,
} from "./contracts-v1.mjs";

// CB-4: strict Provider/persistence ports, deterministic audit/replay records
// and receipt-bound presentation-state output.
//
// Hard guarantees implemented here:
// - Provider gateway: a strict request/response port wrapper. This module
//   ships no Provider implementation, performs no direct network I/O, handles
//   no credential and initiates no paid inference. An injected provider port
//   is OPAQUE: it may execute externally (its own endpoint/transport/fetch or
//   paid inference live outside this module) and is never rejected for
//   carrying such capability. Credentials remain forbidden in module requests
//   and in stored adapter data. The module's own directModuleNetworkAttempts
//   is always 0. When the external adapter reports per-call accounting
//   (networkAttempts, paidInference, reportedCostUnits) the gateway preserves
//   those provider-reported values verbatim in receipts, stats and the audit
//   log instead of inventing zeros; an adapter that declares network "none"
//   (the pure in-memory port) truthfully reports zeros, and an opaque adapter
//   that reports nothing yields "unknown", never a fabricated zero. Without
//   an injected provider the gateway fails closed with a rejection record
//   (never a throw, never a network attempt, all accounting zeros).
// - Persistence gateway: a strict integration surface over the CB-1 injected
//   persistence port. It re-verifies the port conformance and the honest
//   durability declaration, enforces an optional namespace allowlist, and
//   audits every operation by hash (values are never copied into the audit
//   log). It never adds durability: the in-memory adapter remains explicitly
//   volatile and fake durable persistence stays forbidden.
// - Deterministic audit log: append-only, hash-chained, no wall clock, no
//   randomness. The same operation sequence always produces the same export
//   bytes, and any tamper is detected on verify. Replay candidates derived
//   from the log are marked for later WikiSkill/EvoTest evaluation only;
//   Skill or memory promotion is manual-approval-only and the log refuses to
//   record any promotion event, so automatic promotion is impossible here.
// - Presentation resolver: emits presentation-state output for idle,
//   speaking, listening, alert_combat, damaged_concerned and reflective. It
//   consumes only externally supplied, receipt-bound assets (an injected
//   catalog; the module performs no I/O) and fails closed with a rejection
//   record whenever a required asset binding, catalog entry, content hash or
//   receipt is absent or mismatched.
// - Public rationale records carry rationale text, source/tool receipts and
//   uncertainty only; any other field, hidden chain-of-thought keys and
//   credentials are rejected.

const CB1 = COMPANION_BACKEND_ERROR_CODES;

export const COMPANION_BACKEND_CB4_ERROR_CODES = Object.freeze({
  GATEWAY_INVALID: "GATEWAY_INVALID",
  PROVIDER_PAID_INFERENCE_FORBIDDEN: "PROVIDER_PAID_INFERENCE_FORBIDDEN",
  PROVIDER_RECEIPT_INVALID: "PROVIDER_RECEIPT_INVALID",
  PERSISTENCE_NAMESPACE_VIOLATION: "PERSISTENCE_NAMESPACE_VIOLATION",
  AUDIT_INVALID: "AUDIT_INVALID",
  AUDIT_KIND_UNSUPPORTED: "AUDIT_KIND_UNSUPPORTED",
  AUDIT_INTEGRITY_MISMATCH: "AUDIT_INTEGRITY_MISMATCH",
  AUTOMATIC_PROMOTION_FORBIDDEN: "AUTOMATIC_PROMOTION_FORBIDDEN",
  ASSET_CATALOG_INVALID: "ASSET_CATALOG_INVALID",
  PRESENTATION_STATE_INVALID: "PRESENTATION_STATE_INVALID",
  PRESENTATION_BINDING_INVALID: "PRESENTATION_BINDING_INVALID",
  RATIONALE_INVALID: "RATIONALE_INVALID",
});

const CB4 = COMPANION_BACKEND_CB4_ERROR_CODES;

export const COMPANION_AUDIT_EVENT_KINDS = Object.freeze([
  "persistence.get",
  "persistence.put",
  "persistence.delete",
  "persistence.list",
  "persistence.checkpoint",
  "persistence.restore",
  "persistence.export",
  "persistence.close",
  "provider.request",
  "provider.response",
  "provider.rejection",
  "presentation.resolve",
  "presentation.fail_closed",
  "replay.candidate_built",
]);

export const COMPANION_RATIONALE_RECEIPT_KINDS = Object.freeze(["source", "tool"]);

const AUDIT_KIND_SET = new Set(COMPANION_AUDIT_EVENT_KINDS);
const RECEIPT_KIND_SET = new Set(COMPANION_RATIONALE_RECEIPT_KINDS);
const PRESENTATION_STATE_SET = new Set(COMPANION_PRESENTATION_STATES);
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const PAID_INFERENCE_KEY_PATTERN = /paid[_-]?inference|billing|cost[_-]?override|charge[_-]?account/i;
const PAID_INFERENCE_STATUSES = new Set(["performed", "not_performed", "unknown"]);
const AUDIT_EXPORT_SCHEMA = `${COMPANION_BACKEND_CONTRACT_VERSION}.audit-export`;

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function fail(code, message, details) {
  throw new CompanionBackendError(code, message, details);
}

function requiredString(value, field, code = CB4.GATEWAY_INVALID) {
  const normalized = String(value ?? "").trim();
  if (!normalized) fail(code, `${field} is required`);
  return normalized;
}

function scanKeys(value, pattern, code, path = "") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanKeys(entry, pattern, code, `${path}[${index}]`));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (pattern.test(key)) {
      fail(code, `forbidden key "${key}" at ${path || "<root>"}`, { key, path: path || "<root>" });
    }
    scanKeys(child, pattern, code, path ? `${path}.${key}` : key);
  }
}

function normalizeAuditLog(value) {
  if (value === undefined || value === null) return null;
  if (typeof value.record !== "function" || typeof value.exportAuditLog !== "function") {
    fail(CB4.GATEWAY_INVALID, "injected auditLog must expose the companion audit log contract (record/exportAuditLog)");
  }
  return value;
}

// ---------------------------------------------------------------------------
// Deterministic audit log and replay candidates.
// ---------------------------------------------------------------------------

export function createCompanionAuditLog(options = {}) {
  const logId = String(options.logId || "companion-audit-v1").trim() || "companion-audit-v1";
  const entries = [];

  function unsignedEntry(entry) {
    const { entryHash: _entryHash, eventId: _eventId, ...unsigned } = entry;
    return unsigned;
  }

  function record(kind, subject = {}) {
    const normalizedKind = requiredString(kind, "audit.kind", CB4.AUDIT_INVALID);
    // Promotion is never an audit-recordable event: Skill/memory promotion is
    // manual-approval-only and can never be triggered from this module.
    if (/promot/i.test(normalizedKind)) {
      fail(CB4.AUTOMATIC_PROMOTION_FORBIDDEN,
        "audit events can never record or trigger Skill/memory promotion; promotion is manual-approval-only",
        { kind: normalizedKind });
    }
    if (!AUDIT_KIND_SET.has(normalizedKind)) {
      fail(CB4.AUDIT_KIND_UNSUPPORTED,
        `unsupported audit event kind: ${normalizedKind}; expected one of ${COMPANION_AUDIT_EVENT_KINDS.join(", ")}`,
        { kind: normalizedKind });
    }
    if (!object(subject)) fail(CB4.AUDIT_INVALID, "audit subject must be an object");
    assertNoHiddenChainOfThought(subject, "audit.subject");
    assertNoCredentials(subject, "audit.subject");
    const unsigned = {
      sequence: entries.length + 1,
      kind: normalizedKind,
      subject: clone(subject),
      prevEntryHash: entries.length > 0 ? entries[entries.length - 1].entryHash : null,
    };
    const entryHash = hashStarcraftTmgContract(unsigned);
    const entry = deepFreeze({ ...unsigned, eventId: `audit-${unsigned.sequence}-${entryHash.slice(0, 12)}`, entryHash });
    entries.push(entry);
    return entry;
  }

  function head() {
    return entries.length > 0 ? entries[entries.length - 1] : null;
  }

  function list() {
    return deepFreeze(clone(entries));
  }

  function emptyHeadHash() {
    return hashStarcraftTmgContract({ logId, history: "empty" });
  }

  // Recomputes the whole hash chain; any tamper fails closed.
  function verify() {
    let previous = null;
    for (const [index, entry] of entries.entries()) {
      if (entry.sequence !== index + 1 || entry.prevEntryHash !== previous) {
        fail(CB4.AUDIT_INTEGRITY_MISMATCH, `audit chain is broken at sequence ${index + 1}`, { logId, sequence: index + 1 });
      }
      if (hashStarcraftTmgContract(unsignedEntry(entry)) !== entry.entryHash) {
        fail(CB4.AUDIT_INTEGRITY_MISMATCH, `audit entry hash mismatch at sequence ${index + 1}`, { logId, sequence: index + 1 });
      }
      previous = entry.entryHash;
    }
    return deepFreeze({
      ok: true,
      logId,
      entryCount: entries.length,
      headHash: entries.length > 0 ? entries[entries.length - 1].entryHash : emptyHeadHash(),
    });
  }

  function exportAuditLog() {
    verify();
    const unsigned = {
      schemaVersion: AUDIT_EXPORT_SCHEMA,
      logId,
      entries: clone(entries),
    };
    const integrity = { algorithm: "sha256", hash: hashStarcraftTmgContract(unsigned) };
    return `${JSON.stringify({ ...unsigned, integrity }, null, 2)}\n`;
  }

  // Replay candidates are evidence for later WikiSkill/EvoTest evaluation.
  // They are never training truth and never promote anything automatically.
  function buildReplayCandidate(input = {}) {
    if (!object(input)) fail(CB4.AUDIT_INVALID, "replay candidate input must be an object");
    assertNoHiddenChainOfThought(input, "replayCandidate");
    assertNoCredentials(input, "replayCandidate");
    if (input.promote === true || input.automaticPromotion === true || input.promotion === "automatic") {
      fail(CB4.AUTOMATIC_PROMOTION_FORBIDDEN,
        "replay candidates can never request automatic Skill or memory promotion");
    }
    verify();
    const headHash = entries.length > 0 ? entries[entries.length - 1].entryHash : emptyHeadHash();
    const unsigned = {
      schemaVersion: `${COMPANION_BACKEND_CONTRACT_VERSION}.replay-candidate`,
      candidateId: String(input.candidateId || `replay-${logId}-${headHash.slice(0, 12)}`),
      logId,
      entryCount: entries.length,
      headHash,
      eventKinds: [...new Set(entries.map((entry) => entry.kind))].sort(),
      sessionRef: input.sessionRef === undefined ? null : clone(input.sessionRef),
      candidateFor: ["wikiskill", "evotest"],
      trainingTruth: false,
      promotion: {
        automatic: "forbidden",
        skillPromotion: "manual_approval_only",
        memoryPromotion: "manual_approval_only",
        requiredGates: ["player_view", "leakage", "lineage", "replay", "promotion_review"],
      },
    };
    const candidate = deepFreeze({ ...unsigned, candidateHash: hashStarcraftTmgContract(unsigned) });
    record("replay.candidate_built", { candidateId: candidate.candidateId, candidateHash: candidate.candidateHash });
    return candidate;
  }

  return Object.freeze({ logId, record, head, list, verify, exportAuditLog, buildReplayCandidate });
}

export function verifyCompanionAuditExport(serialized) {
  const parsed = typeof serialized === "string" ? JSON.parse(serialized) : clone(serialized);
  if (!object(parsed) || parsed.schemaVersion !== AUDIT_EXPORT_SCHEMA) {
    fail(CB4.AUDIT_INTEGRITY_MISMATCH, "audit export schemaVersion mismatch");
  }
  if (parsed.integrity?.algorithm !== "sha256") {
    fail(CB4.AUDIT_INTEGRITY_MISMATCH, "audit export integrity algorithm mismatch");
  }
  const { integrity: _integrity, ...unsigned } = parsed;
  if (parsed.integrity.hash !== hashStarcraftTmgContract(unsigned)) {
    fail(CB4.AUDIT_INTEGRITY_MISMATCH, "audit export integrity mismatch");
  }
  if (!Array.isArray(parsed.entries)) {
    fail(CB4.AUDIT_INTEGRITY_MISMATCH, "audit export entries must be an array");
  }
  let previous = null;
  for (const [index, entry] of parsed.entries.entries()) {
    if (!object(entry) || entry.sequence !== index + 1 || entry.prevEntryHash !== previous) {
      fail(CB4.AUDIT_INTEGRITY_MISMATCH, `audit export chain is broken at sequence ${index + 1}`, { sequence: index + 1 });
    }
    const { entryHash, eventId, ...unsignedEntryRest } = entry;
    if (hashStarcraftTmgContract(unsignedEntryRest) !== entryHash) {
      fail(CB4.AUDIT_INTEGRITY_MISMATCH, `audit export entry hash mismatch at sequence ${index + 1}`, { sequence: index + 1 });
    }
    if (eventId !== `audit-${index + 1}-${entryHash.slice(0, 12)}`) {
      fail(CB4.AUDIT_INTEGRITY_MISMATCH, `audit export event id mismatch at sequence ${index + 1}`, { sequence: index + 1 });
    }
    previous = entryHash;
  }
  return deepFreeze({
    ok: true,
    logId: String(parsed.logId || ""),
    entryCount: parsed.entries.length,
    headHash: parsed.entries.length > 0 ? parsed.entries[parsed.entries.length - 1].entryHash : null,
  });
}

// ---------------------------------------------------------------------------
// Strict persistence gateway. Audited pass-through over the CB-1 port; it
// adds namespace enforcement and audit, never durability.
// ---------------------------------------------------------------------------

export function createCompanionPersistenceGateway(options = {}) {
  if (!object(options)) fail(CB4.GATEWAY_INVALID, "persistence gateway options must be an object");
  const delegate = assertCompanionPersistencePort(options.persistence);
  const auditLog = normalizeAuditLog(options.auditLog);
  const gatewayId = String(options.gatewayId || `persistence-gateway:${delegate.adapterId || "anonymous"}`);
  const namespacePrefixes = options.namespacePrefixes === undefined || options.namespacePrefixes === null
    ? null
    : (Array.isArray(options.namespacePrefixes) ? options.namespacePrefixes : [options.namespacePrefixes])
      .map((value, index) => requiredString(value, `namespacePrefixes[${index}]`));

  function guardNamespace(namespace) {
    const ns = requiredString(namespace, "persistence namespace", CB4.PERSISTENCE_NAMESPACE_VIOLATION);
    if (namespacePrefixes && !namespacePrefixes.some((prefix) => ns.startsWith(prefix))) {
      fail(CB4.PERSISTENCE_NAMESPACE_VIOLATION,
        `persistence namespace "${ns}" is outside the gateway allowlist`,
        { namespace: ns, namespacePrefixes: [...namespacePrefixes] });
    }
    return ns;
  }

  function audit(kind, subject) {
    if (auditLog) auditLog.record(kind, { gatewayId, ...subject });
  }

  async function get(namespace, key) {
    const ns = guardNamespace(namespace);
    const result = await delegate.get(ns, key);
    audit("persistence.get", { namespace: ns, key: String(key ?? ""), found: result?.found === true });
    return result;
  }

  async function put(namespace, key, value) {
    const ns = guardNamespace(namespace);
    const result = await delegate.put(ns, key, value);
    // Only the value hash is audited; payloads are never copied into the log.
    audit("persistence.put", { namespace: ns, key: String(key ?? ""), valueHash: result?.valueHash ?? null });
    return result;
  }

  async function deleteEntry(namespace, key) {
    const ns = guardNamespace(namespace);
    const result = await delegate.delete(ns, key);
    audit("persistence.delete", { namespace: ns, key: String(key ?? ""), deleted: result?.deleted === true });
    return result;
  }

  async function list(namespace, filter = {}) {
    const ns = guardNamespace(namespace);
    const result = await delegate.list(ns, filter);
    audit("persistence.list", {
      namespace: ns,
      prefix: filter && filter.prefix !== undefined ? String(filter.prefix) : null,
      keyCount: Array.isArray(result) ? result.length : 0,
    });
    return result;
  }

  async function checkpoint(label = "") {
    const result = await delegate.checkpoint(label);
    audit("persistence.checkpoint", {
      label: String(label ?? ""),
      checkpointId: result?.checkpointId ?? null,
      contentHash: result?.contentHash ?? null,
    });
    return result;
  }

  async function restore(checkpointId) {
    const result = await delegate.restore(checkpointId);
    audit("persistence.restore", { checkpointId: String(checkpointId ?? ""), ok: result?.ok === true });
    return result;
  }

  async function exportSnapshot() {
    const snapshot = await delegate.exportSnapshot();
    audit("persistence.export", { snapshotHash: hashStarcraftTmgContract(String(snapshot)) });
    return snapshot;
  }

  async function close() {
    const result = await delegate.close();
    audit("persistence.close", { adapterId: delegate.adapterId ?? null });
    return result;
  }

  function durabilityDeclaration() {
    return deepFreeze({
      gatewayId,
      adapterId: delegate.adapterId ?? null,
      durable: delegate.durable === true,
      durability: String(delegate.durability || ""),
      addsDurability: false,
      fakeDurablePersistence: "forbidden",
    });
  }

  return Object.freeze({
    portId: delegate.portId,
    adapterId: gatewayId,
    delegateAdapterId: delegate.adapterId ?? null,
    durable: delegate.durable === true,
    durability: String(delegate.durability || ""),
    implementsRealDurability: delegate.durable === true,
    get,
    put,
    delete: deleteEntry,
    list,
    checkpoint,
    restore,
    exportSnapshot,
    close,
    durabilityDeclaration,
  });
}

// ---------------------------------------------------------------------------
// Strict provider gateway. The module ships no Provider implementation,
// performs no direct network I/O, handles no credentials and initiates no
// paid inference. An injected provider port is opaque and may execute
// externally; provider-reported external accounting is preserved verbatim.
// Fail closed (all zeros) when no provider port is injected.
// ---------------------------------------------------------------------------

// Normalizes the external accounting an opaque provider port reports for one
// call. Returns { ok: true, accounting } or { ok: false, reason, message }.
// The module never invents zeros for an external execution: unreported values
// from an opaque adapter surface as "unknown", while an adapter that declares
// network "none" (the pure in-memory port) truthfully reports zeros.
function externalAccountingOf(raw, provider, response) {
  const rawReceipt = object(raw) && raw.receipt !== undefined ? raw.receipt : null;
  if (rawReceipt !== null) {
    if (!object(rawReceipt)) {
      return { ok: false, reason: CB4.PROVIDER_RECEIPT_INVALID, message: "provider receipt must be an object" };
    }
    try {
      assertNoHiddenChainOfThought(rawReceipt, "providerReceipt");
      assertNoCredentials(rawReceipt, "providerReceipt");
    } catch (error) {
      if (error instanceof CompanionBackendError) {
        return { ok: false, reason: error.code, message: error.message, details: error.details };
      }
      throw error;
    }
    const networkAttempts = rawReceipt.networkAttempts === undefined
      ? (String(provider?.network || "") === "none" ? 0 : "unknown")
      : Number(rawReceipt.networkAttempts);
    if (networkAttempts !== "unknown" && (!Number.isSafeInteger(networkAttempts) || networkAttempts < 0)) {
      return { ok: false, reason: CB4.PROVIDER_RECEIPT_INVALID, message: "provider receipt networkAttempts must be a non-negative safe integer" };
    }
    const paidInference = rawReceipt.paidInference === undefined ? "unknown" : String(rawReceipt.paidInference);
    if (!PAID_INFERENCE_STATUSES.has(paidInference)) {
      return { ok: false, reason: CB4.PROVIDER_RECEIPT_INVALID, message: `provider receipt paidInference must be one of ${[...PAID_INFERENCE_STATUSES].join(", ")}` };
    }
    const reportedCostUnits = rawReceipt.reportedCostUnits === undefined
      ? response.usage.reportedCostUnits
      : Number(rawReceipt.reportedCostUnits);
    if (!Number.isFinite(reportedCostUnits) || reportedCostUnits < 0) {
      return { ok: false, reason: CB4.PROVIDER_RECEIPT_INVALID, message: "provider receipt reportedCostUnits must be a non-negative number" };
    }
    return {
      ok: true,
      accounting: {
        externalNetworkAttempts: networkAttempts,
        paidInference,
        reportedCostUnits,
        accountingSource: rawReceipt.networkAttempts === undefined
          ? "provider_receipt_partial"
          : "provider_receipt",
      },
    };
  }
  if (String(provider?.network || "") === "none") {
    // Truthful zeros: the adapter itself declares it performs no network.
    return {
      ok: true,
      accounting: {
        externalNetworkAttempts: 0,
        paidInference: "not_performed",
        reportedCostUnits: response.usage.reportedCostUnits,
        accountingSource: "adapter_declared_no_network",
      },
    };
  }
  // Opaque external adapter that reported nothing: never invent zeros.
  return {
    ok: true,
    accounting: {
      externalNetworkAttempts: "unknown",
      paidInference: "unknown",
      reportedCostUnits: response.usage.reportedCostUnits,
      accountingSource: "unreported",
    },
  };
}

export function createCompanionProviderGateway(options = {}) {
  if (!object(options)) fail(CB4.GATEWAY_INVALID, "provider gateway options must be an object");
  const provider = options.provider === undefined ? null : options.provider;
  const auditLog = normalizeAuditLog(options.auditLog);
  // Port conformance + credential scan only. An injected port is opaque: it
  // may execute externally (endpoint/transport/fetch/paid inference outside
  // this module) and is NOT rejected for that; the module itself still
  // performs no direct network I/O and stores no credentials.
  if (provider !== null) {
    assertCompanionProviderPort(provider);
  }
  const gatewayId = String(options.gatewayId || "companion-provider-gateway-v1");
  let calls = 0;
  const usage = { promptTokens: 0, completionTokens: 0, reportedCostUnits: 0 };
  let externalNetworkAttemptsKnown = 0;
  let externalNetworkAttemptsUnknown = 0;
  let paidInferencePerformed = 0;
  let paidInferenceUnknown = 0;

  function audit(kind, subject) {
    if (auditLog) auditLog.record(kind, { gatewayId, ...subject });
  }

  function rejection(reason, details = {}) {
    audit("provider.rejection", { reason, ...clone(details) });
    return deepFreeze({
      ok: false,
      schemaVersion: `${COMPANION_BACKEND_CONTRACT_VERSION}.provider-gateway-rejection`,
      gatewayId,
      reason,
      failClosed: true,
      directModuleNetworkAttempts: 0,
      networkAttempts: 0,
      paidInference: "not_performed",
      accountingSource: "fail_closed",
      ...clone(details),
    });
  }

  async function complete(requestInput = {}) {
    if (!object(requestInput)) {
      fail(CB1.PROVIDER_REQUEST_INVALID, "provider gateway complete requires a request object or contract");
    }
    // No paid inference can ever be initiated through this module.
    scanKeys(requestInput, PAID_INFERENCE_KEY_PATTERN, CB4.PROVIDER_PAID_INFERENCE_FORBIDDEN, "providerRequest");
    let request;
    if (requestInput.schemaVersion === `${COMPANION_BACKEND_CONTRACT_VERSION}.provider-request`) {
      assertNoHiddenChainOfThought(requestInput, "providerRequest");
      assertNoCredentials(requestInput, "providerRequest");
      request = requestInput;
    } else {
      request = createCompanionProviderRequest(requestInput);
    }
    calls += 1;
    const requestHash = hashStarcraftTmgContract(request);
    audit("provider.request", {
      requestId: request.requestId,
      requestHash,
      messageCount: request.messages.length,
    });
    if (!provider) {
      return rejection("provider_unavailable", {
        requestId: request.requestId,
        message: "no provider port injected; this module ships no Provider implementation and performs no direct network call, credential handling or paid inference",
      });
    }
    let raw;
    try {
      raw = await provider.complete(request);
    } catch (error) {
      return rejection(CB1.PROVIDER_RESPONDER_ERROR, {
        requestId: request.requestId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    if (object(raw) && raw.ok === false) {
      return rejection(String(raw.reason || CB1.PROVIDER_RESPONDER_ERROR), {
        requestId: request.requestId,
        message: String(raw.message || "provider adapter rejected the request"),
      });
    }
    const responseInput = object(raw) && raw.ok === true && raw.response !== undefined ? raw.response : raw;
    let response;
    try {
      response = createCompanionProviderResponse(responseInput || {});
    } catch (error) {
      if (error instanceof CompanionBackendError) {
        return rejection(error.code, { requestId: request.requestId, message: error.message, ...clone(error.details) });
      }
      throw error;
    }
    const accountingResult = externalAccountingOf(raw, provider, response);
    if (!accountingResult.ok) {
      return rejection(accountingResult.reason, {
        requestId: request.requestId,
        message: accountingResult.message,
        ...(accountingResult.details ? clone(accountingResult.details) : {}),
      });
    }
    const accounting = accountingResult.accounting;
    usage.promptTokens += response.usage.promptTokens;
    usage.completionTokens += response.usage.completionTokens;
    usage.reportedCostUnits += accounting.reportedCostUnits;
    if (typeof accounting.externalNetworkAttempts === "number") {
      externalNetworkAttemptsKnown += accounting.externalNetworkAttempts;
    } else {
      externalNetworkAttemptsUnknown += 1;
    }
    if (accounting.paidInference === "performed") paidInferencePerformed += 1;
    if (accounting.paidInference === "unknown") paidInferenceUnknown += 1;
    const responseHash = hashStarcraftTmgContract(response);
    audit("provider.response", {
      requestId: request.requestId,
      requestHash,
      responseHash,
      usage: clone(response.usage),
      directModuleNetworkAttempts: 0,
      externalNetworkAttempts: accounting.externalNetworkAttempts,
      paidInference: accounting.paidInference,
      reportedCostUnits: accounting.reportedCostUnits,
      accountingSource: accounting.accountingSource,
    });
    const receipt = deepFreeze({
      schemaVersion: `${COMPANION_BACKEND_CONTRACT_VERSION}.provider-call-receipt`,
      receiptId: `provider-receipt-${request.requestId}`,
      requestId: request.requestId,
      requestHash,
      responseHash,
      usage: clone(response.usage),
      // The module itself never touches the network; external attempts are
      // provider-reported (or "unknown" when an opaque adapter reports
      // nothing) and are preserved verbatim, never invented as zero.
      directModuleNetworkAttempts: 0,
      networkAttempts: accounting.externalNetworkAttempts,
      externalNetworkAttempts: accounting.externalNetworkAttempts,
      paidInference: accounting.paidInference,
      reportedCostUnits: accounting.reportedCostUnits,
      accountingSource: accounting.accountingSource,
      hiddenChainOfThought: "not_present",
    });
    return deepFreeze({ ok: true, gatewayId, requestId: request.requestId, request, response, receipt });
  }

  function stats() {
    return deepFreeze({
      gatewayId,
      calls,
      ...usage,
      directModuleNetworkAttempts: 0,
      externalNetworkAttempts: externalNetworkAttemptsUnknown > 0
        ? "unknown"
        : externalNetworkAttemptsKnown,
      externalNetworkAttemptsKnown,
      externalNetworkAttemptsUnknown,
      paidInferencePerformed,
      paidInferenceUnknown,
      providerInjected: provider !== null,
    });
  }

  return Object.freeze({
    portId: COMPANION_PROVIDER_PORT_V1.portId,
    gatewayId,
    // The module itself performs no direct network I/O; an injected opaque
    // provider port may execute externally (outside this module).
    directModuleNetwork: "none",
    externalProviderExecution: provider !== null ? "allowed_outside_module" : "not_available",
    implementsRealProvider: false,
    providerInjected: provider !== null,
    complete,
    stats,
  });
}

// ---------------------------------------------------------------------------
// Presentation-state output over externally supplied, receipt-bound assets.
// ---------------------------------------------------------------------------

function normalizeAssetCatalog(catalog) {
  if (catalog === undefined || catalog === null) return null;
  const entries = catalog instanceof Map
    ? [...catalog.values()]
    : object(catalog)
      ? Object.values(catalog)
      : null;
  if (!entries) {
    fail(CB4.ASSET_CATALOG_INVALID, "asset catalog must be a Map or a plain object of receipt-bound asset records");
  }
  const byId = new Map();
  for (const [index, raw] of entries.entries()) {
    if (!object(raw)) fail(CB4.ASSET_CATALOG_INVALID, `asset catalog entry ${index} must be an object`);
    assertNoHiddenChainOfThought(raw, `assetCatalog[${index}]`);
    assertNoCredentials(raw, `assetCatalog[${index}]`);
    const assetId = requiredString(raw.assetId, `assetCatalog[${index}].assetId`, CB4.ASSET_CATALOG_INVALID);
    const contentHash = String(raw.contentHash || "");
    if (!HASH_PATTERN.test(contentHash)) {
      fail(CB4.ASSET_CATALOG_INVALID, `asset ${assetId} contentHash must be a SHA-256 hash (receipt-bound asset)`);
    }
    if (!object(raw.receipt)) {
      fail(CB4.ASSET_CATALOG_INVALID, `asset ${assetId} must carry an external receipt (receipt-bound asset)`);
    }
    const receiptId = requiredString(raw.receipt.receiptId, `asset ${assetId} receipt.receiptId`, CB4.ASSET_CATALOG_INVALID);
    const sourceRef = requiredString(raw.receipt.sourceRef, `asset ${assetId} receipt.sourceRef`, CB4.ASSET_CATALOG_INVALID);
    if (String(raw.receipt.contentHash || "") !== contentHash) {
      fail(CB4.ASSET_CATALOG_INVALID, `asset ${assetId} receipt does not bind the asset content hash`);
    }
    byId.set(assetId, deepFreeze({
      assetId,
      contentHash,
      mediaType: String(raw.mediaType || "application/octet-stream"),
      receipt: { receiptId, sourceRef, contentHash },
    }));
  }
  return byId;
}

export function createCompanionPresentationResolver(options = {}) {
  if (!object(options)) fail(CB4.GATEWAY_INVALID, "presentation resolver options must be an object");
  const catalog = normalizeAssetCatalog(options.assetCatalog);
  const auditLog = normalizeAuditLog(options.auditLog);
  const resolverId = String(options.resolverId || "companion-presentation-resolver-v1");

  function audit(kind, subject) {
    if (auditLog) auditLog.record(kind, { resolverId, ...subject });
  }

  function failClosed(reason, details = {}) {
    audit("presentation.fail_closed", { reason, state: details.state ?? null, assetId: details.assetId ?? null });
    return deepFreeze({
      ok: false,
      failClosed: true,
      schemaVersion: `${COMPANION_BACKEND_CONTRACT_VERSION}.presentation-rejection`,
      resolverId,
      reason,
      networkAttempts: 0,
      ...clone(details),
    });
  }

  function companionRefOf(source) {
    if (source.contractType === "companion-package" && source.packageId) {
      return { id: source.packageId, version: source.version ?? null, hash: source.integrity?.hash ?? null };
    }
    return source.packageRef === undefined ? null : clone(source.packageRef);
  }

  function resolveState(input = {}) {
    if (!object(input)) fail(CB4.PRESENTATION_BINDING_INVALID, "presentation resolution input must be an object");
    assertNoHiddenChainOfThought(input, "presentationInput");
    assertNoCredentials(input, "presentationInput");
    const state = requiredString(input.state, "presentation.state", CB4.PRESENTATION_STATE_INVALID);
    if (!PRESENTATION_STATE_SET.has(state)) {
      fail(CB4.PRESENTATION_STATE_INVALID,
        `unsupported presentation state: ${state}; expected one of ${COMPANION_PRESENTATION_STATES.join(", ")}`,
        { state });
    }
    const source = object(input.package) ? input.package : input;
    if (!object(source.presentationAssets)) {
      fail(CB4.PRESENTATION_BINDING_INVALID,
        "presentation resolution requires a companion package (or descriptor) with a presentationAssets binding map");
    }
    const companionRef = companionRefOf(source);
    const binding = source.presentationAssets[state];
    if (!object(binding)) {
      return failClosed("asset_binding_absent", { state, companionRef });
    }
    const assetId = String(binding.assetId || "");
    const contentHash = String(binding.contentHash || "");
    if (!assetId || !HASH_PATTERN.test(contentHash)) {
      return failClosed("asset_binding_invalid", { state, companionRef, assetId: assetId || null });
    }
    if (!catalog) {
      return failClosed("asset_catalog_absent", { state, companionRef, assetId });
    }
    const asset = catalog.get(assetId);
    if (!asset) {
      return failClosed("asset_absent", { state, companionRef, assetId });
    }
    if (asset.contentHash !== contentHash) {
      return failClosed("asset_hash_mismatch", { state, companionRef, assetId });
    }
    const unsigned = {
      schemaVersion: `${COMPANION_BACKEND_CONTRACT_VERSION}.presentation-output`,
      resolverId,
      state,
      companionRef,
      asset: { assetId: asset.assetId, contentHash: asset.contentHash, mediaType: asset.mediaType },
      receipt: clone(asset.receipt),
      context: input.context === undefined ? {} : clone(input.context),
      trainingTruth: false,
    };
    const output = deepFreeze({ ok: true, failClosed: false, ...unsigned, outputHash: hashStarcraftTmgContract(unsigned) });
    audit("presentation.resolve", { state, assetId: asset.assetId, outputHash: output.outputHash });
    return output;
  }

  function resolveAllStates(packageLike) {
    return deepFreeze(COMPANION_PRESENTATION_STATES.map((state) => resolveState({ package: packageLike, state })));
  }

  return Object.freeze({
    resolverId,
    requiredStates: COMPANION_PRESENTATION_STATES,
    assetCatalogSize: catalog ? catalog.size : 0,
    resolveState,
    resolveAllStates,
  });
}

// ---------------------------------------------------------------------------
// Public rationale records: rationale, source/tool receipts and uncertainty
// only. Hidden chain-of-thought is never requested, stored or exposed.
// ---------------------------------------------------------------------------

const RATIONALE_ALLOWED_KEYS = new Set(["subjectRef", "companionRef", "rationale", "receipts", "uncertainty"]);
const RATIONALE_RECEIPT_ALLOWED_KEYS = new Set(["receiptId", "kind", "sourceRef", "toolName", "note"]);

export function createCompanionRationaleRecord(input = {}) {
  if (!object(input)) fail(CB4.RATIONALE_INVALID, "rationale record input must be an object");
  assertNoHiddenChainOfThought(input, "rationale");
  assertNoCredentials(input, "rationale");
  for (const key of Object.keys(input)) {
    if (!RATIONALE_ALLOWED_KEYS.has(key)) {
      fail(CB4.RATIONALE_INVALID,
        `rationale records carry public rationale, source/tool receipts and uncertainty only; unexpected field: ${key}`,
        { key });
    }
  }
  const rationale = input.rationale === undefined ? "" : input.rationale;
  if (typeof rationale !== "string") fail(CB4.RATIONALE_INVALID, "rationale must be a string");
  if (input.receipts !== undefined && !Array.isArray(input.receipts)) {
    fail(CB4.RATIONALE_INVALID, "receipts must be an array");
  }
  const receipts = (input.receipts || []).map((receipt, index) => {
    if (!object(receipt)) fail(CB4.RATIONALE_INVALID, `receipts[${index}] must be an object`);
    for (const key of Object.keys(receipt)) {
      if (!RATIONALE_RECEIPT_ALLOWED_KEYS.has(key)) {
        fail(CB4.RATIONALE_INVALID, `receipts[${index}] carries an unexpected field: ${key}`, { key });
      }
    }
    const kind = requiredString(receipt.kind, `receipts[${index}].kind`, CB4.RATIONALE_INVALID);
    if (!RECEIPT_KIND_SET.has(kind)) {
      fail(CB4.RATIONALE_INVALID, `unsupported receipt kind: ${kind}; expected source or tool`);
    }
    return {
      receiptId: requiredString(receipt.receiptId, `receipts[${index}].receiptId`, CB4.RATIONALE_INVALID),
      kind,
      sourceRef: requiredString(receipt.sourceRef, `receipts[${index}].sourceRef`, CB4.RATIONALE_INVALID),
      toolName: receipt.toolName === undefined ? null : requiredString(receipt.toolName, `receipts[${index}].toolName`, CB4.RATIONALE_INVALID),
      note: String(receipt.note || ""),
    };
  });
  let uncertainty = input.uncertainty ?? "unknown";
  if (uncertainty !== "unknown") {
    const normalized = Number(uncertainty);
    if (!Number.isFinite(normalized) || normalized < 0 || normalized > 1) {
      fail(CB4.RATIONALE_INVALID, "uncertainty must be \"unknown\" or a number between 0 and 1");
    }
    uncertainty = normalized;
  }
  const unsigned = {
    schemaVersion: `${COMPANION_BACKEND_CONTRACT_VERSION}.rationale`,
    subjectRef: input.subjectRef === undefined ? null : clone(input.subjectRef),
    companionRef: input.companionRef === undefined ? null : clone(input.companionRef),
    rationale,
    receipts,
    uncertainty,
    hiddenChainOfThought: "not_included",
    trainingTruth: false,
  };
  return deepFreeze({ ...unsigned, rationaleHash: hashStarcraftTmgContract(unsigned) });
}
