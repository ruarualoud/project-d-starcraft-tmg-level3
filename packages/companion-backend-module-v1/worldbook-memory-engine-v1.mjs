import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";
import {
  COMPANION_BACKEND_CONTRACT_VERSION,
  COMPANION_BACKEND_ERROR_CODES,
  CompanionBackendError,
  assertCompanionPersistencePort,
  assertNoCredentials,
  assertNoHiddenChainOfThought,
} from "./contracts-v1.mjs";

// CB-2: world-book / context / layered-memory / relationship engine.
//
// Hard guarantees implemented here:
// - World-book triggers are always | keyword | regex, sorted by priority then
//   entryId, charged against a deterministic token budget with per-entry
//   budgets, source receipts and explicit omission disclosure.
// - Memory layers are strictly isolated persistence namespaces: immutable
//   canon, append-only transcript, versioned rolling summary, episodic facts,
//   typed relationship state and user-approved durable-memory candidates.
//   Durable promotion is only ever explicit user approval; nothing in this
//   module auto-promotes memory or Skills.
// - Relationship updates require typed observed events; opponent-private
//   inference is rejected and unknown state is never rendered as zero.
// - Persistence is always injected (port companion_persistence_port_v1). The
//   module ships no durable adapter and performs no network or Provider work.
// - Assembly is a pure deterministic function of injected persistence state:
//   no wall clock, no randomness; revisions are logical sequence numbers.

export const COMPANION_BACKEND_CB2_ERROR_CODES = Object.freeze({
  WORLDBOOK_ENTRY_INVALID: "WORLDBOOK_ENTRY_INVALID",
  WORLDBOOK_TRIGGER_INVALID: "WORLDBOOK_TRIGGER_INVALID",
  WORLDBOOK_ENTRY_CONFLICT: "WORLDBOOK_ENTRY_CONFLICT",
  TOKEN_BUDGET_INVALID: "TOKEN_BUDGET_INVALID",
  MEMORY_SCOPE_INVALID: "MEMORY_SCOPE_INVALID",
  MEMORY_LAYER_INVALID: "MEMORY_LAYER_INVALID",
  MEMORY_RECORD_INVALID: "MEMORY_RECORD_INVALID",
  CANON_IMMUTABLE: "CANON_IMMUTABLE",
  DURABLE_PROMOTION_REQUIRES_USER_APPROVAL: "DURABLE_PROMOTION_REQUIRES_USER_APPROVAL",
  DURABLE_CANDIDATE_NOT_FOUND: "DURABLE_CANDIDATE_NOT_FOUND",
  RELATIONSHIP_EVENT_INVALID: "RELATIONSHIP_EVENT_INVALID",
  RELATIONSHIP_EVENT_VISIBILITY_VIOLATION: "RELATIONSHIP_EVENT_VISIBILITY_VIOLATION",
  OPPONENT_PRIVATE_INFERENCE_FORBIDDEN: "OPPONENT_PRIVATE_INFERENCE_FORBIDDEN",
  CONTEXT_ASSEMBLY_INVALID: "CONTEXT_ASSEMBLY_INVALID",
});

export const COMPANION_MEMORY_LAYERS = Object.freeze([
  "canon",
  "transcript",
  "rolling_summary",
  "episodic_facts",
  "relationship_state",
  "durable_memory",
]);

export const COMPANION_CONTEXT_ASSEMBLY_ORDER = Object.freeze([
  "canon",
  "durable_memory",
  "worldbook",
  "rolling_summary",
  "episodic_facts",
  "relationship_state",
  "transcript",
]);

export const COMPANION_WORLDBOOK_TRIGGER_KINDS = Object.freeze(["always", "keyword", "regex"]);

export const COMPANION_RELATIONSHIP_EVENT_TYPES = Object.freeze([
  "promise_kept",
  "promise_broken",
  "personal_shared",
  "assistance_given",
  "conflict_resolved",
  "boundary_respected",
  "boundary_violated",
  "observed_match_outcome",
  "gift_given",
  "time_spent",
]);

export const COMPANION_CONTEXT_BUDGET_POLICY = "companion_context_budget_policy_v1";

const MEMORY_LAYER_SET = new Set(COMPANION_MEMORY_LAYERS);
const ADDRESSABLE_LAYER_SET = new Set([...COMPANION_MEMORY_LAYERS, "worldbook"]);
const TRIGGER_KIND_SET = new Set(COMPANION_WORLDBOOK_TRIGGER_KINDS);
const EVENT_TYPE_SET = new Set(COMPANION_RELATIONSHIP_EVENT_TYPES);
const PROVENANCE_SOURCE_KINDS = new Set([
  "official_summary",
  "official_source_context",
  "community_original",
  "platform_original",
  "mixed",
]);
const REGEX_FLAGS_PATTERN = /^[imsu]*$/;
const OPPONENT_PRIVATE_KEY_PATTERN = /opponent[_-]?(private|hidden|hand|deck|strategy|plan|state)|enemy[_-]?(hand|deck|hidden)|hidden[_-]?(state|hand|deck)|private[_-]?(state|hand|deck)|inferr?ed|inferr?ence/i;
const RELATIONSHIP_AXIS_MIN = -100;
const RELATIONSHIP_AXIS_MAX = 100;

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

function requiredString(value, field, code = COMPANION_BACKEND_CB2_ERROR_CODES.MEMORY_RECORD_INVALID) {
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

function assertNoOpponentPrivateInference(value, field = "value") {
  scanKeys(value, OPPONENT_PRIVATE_KEY_PATTERN, COMPANION_BACKEND_CB2_ERROR_CODES.OPPONENT_PRIVATE_INFERENCE_FORBIDDEN, field);
  return value;
}

function safeInteger(value, field, minimum, maximum, code) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < minimum || normalized > maximum) {
    fail(code, `${field} must be a safe integer between ${minimum} and ${maximum}`);
  }
  return normalized;
}

function normalizeProvenance(value, { required, field }) {
  if (value === undefined || value === null) {
    if (required) fail(COMPANION_BACKEND_ERROR_CODES.PROVENANCE_INVALID, `${field} is required`);
    return null;
  }
  if (!object(value)) fail(COMPANION_BACKEND_ERROR_CODES.PROVENANCE_INVALID, `${field} must be an object`);
  const sourceKind = requiredString(value.sourceKind, `${field}.sourceKind`, COMPANION_BACKEND_ERROR_CODES.PROVENANCE_INVALID);
  if (!PROVENANCE_SOURCE_KINDS.has(sourceKind)) {
    fail(COMPANION_BACKEND_ERROR_CODES.PROVENANCE_INVALID, `unsupported ${field}.sourceKind: ${sourceKind}`);
  }
  const sourceRefs = value.sourceRefs === undefined ? [] : value.sourceRefs;
  if (!Array.isArray(sourceRefs)) fail(COMPANION_BACKEND_ERROR_CODES.PROVENANCE_INVALID, `${field}.sourceRefs must be an array`);
  return {
    sourceKind,
    author: requiredString(value.author, `${field}.author`, COMPANION_BACKEND_ERROR_CODES.PROVENANCE_INVALID),
    license: requiredString(value.license, `${field}.license`, COMPANION_BACKEND_ERROR_CODES.PROVENANCE_INVALID),
    sourceRefs: sourceRefs.map((ref, index) => requiredString(ref, `${field}.sourceRefs[${index}]`, COMPANION_BACKEND_ERROR_CODES.PROVENANCE_INVALID)),
    notes: String(value.notes || ""),
  };
}

function normalizeSourceReceipts(value, field) {
  if (!Array.isArray(value) || value.length === 0) {
    fail(COMPANION_BACKEND_CB2_ERROR_CODES.WORLDBOOK_ENTRY_INVALID, `${field} must be a non-empty array of source receipts`);
  }
  return value.map((receipt, index) => {
    if (!object(receipt)) fail(COMPANION_BACKEND_CB2_ERROR_CODES.WORLDBOOK_ENTRY_INVALID, `${field}[${index}] must be an object`);
    return {
      receiptId: requiredString(receipt.receiptId, `${field}[${index}].receiptId`, COMPANION_BACKEND_CB2_ERROR_CODES.WORLDBOOK_ENTRY_INVALID),
      sourceRef: requiredString(receipt.sourceRef, `${field}[${index}].sourceRef`, COMPANION_BACKEND_CB2_ERROR_CODES.WORLDBOOK_ENTRY_INVALID),
      note: String(receipt.note || ""),
    };
  });
}

// Deterministic token estimator. This is an accounting heuristic, not a real
// tokenizer; it is fixed so that budgeting and replay are byte-reproducible.
export function estimateWorldbookTokens(text) {
  const length = String(text ?? "").length;
  return Math.max(1, Math.ceil(length / 4));
}

function truncateToTokenBudget(text, tokenBudget) {
  const source = String(text ?? "");
  const maxChars = Math.max(0, tokenBudget * 4);
  if (source.length <= maxChars) return { content: source, truncated: false };
  return { content: source.slice(0, maxChars), truncated: true };
}

export function normalizeCompanionScope(scope = {}) {
  if (!object(scope)) fail(COMPANION_BACKEND_CB2_ERROR_CODES.MEMORY_SCOPE_INVALID, "memory scope must be an object");
  const companionId = requiredString(scope.companionId, "scope.companionId", COMPANION_BACKEND_CB2_ERROR_CODES.MEMORY_SCOPE_INVALID);
  const packageId = scope.packageId === undefined || scope.packageId === null
    ? null
    : requiredString(scope.packageId, "scope.packageId", COMPANION_BACKEND_CB2_ERROR_CODES.MEMORY_SCOPE_INVALID);
  const conversationId = scope.conversationId === undefined || scope.conversationId === null
    ? "default"
    : requiredString(scope.conversationId, "scope.conversationId", COMPANION_BACKEND_CB2_ERROR_CODES.MEMORY_SCOPE_INVALID);
  const scopeKey = [packageId, companionId, conversationId].filter(Boolean).join("/");
  return deepFreeze({ packageId, companionId, conversationId, scopeKey });
}

export function createWorldbookEntry(input = {}) {
  if (!object(input)) fail(COMPANION_BACKEND_CB2_ERROR_CODES.WORLDBOOK_ENTRY_INVALID, "worldbook entry must be an object");
  assertNoHiddenChainOfThought(input, "worldbookEntry");
  assertNoCredentials(input, "worldbookEntry");
  const triggers = input.triggers;
  if (!Array.isArray(triggers) || triggers.length === 0) {
    fail(COMPANION_BACKEND_CB2_ERROR_CODES.WORLDBOOK_TRIGGER_INVALID, "worldbook entry triggers must be a non-empty array");
  }
  const normalizedTriggers = triggers.map((trigger, index) => {
    if (!object(trigger)) fail(COMPANION_BACKEND_CB2_ERROR_CODES.WORLDBOOK_TRIGGER_INVALID, `triggers[${index}] must be an object`);
    const kind = requiredString(trigger.kind, `triggers[${index}].kind`, COMPANION_BACKEND_CB2_ERROR_CODES.WORLDBOOK_TRIGGER_INVALID);
    if (!TRIGGER_KIND_SET.has(kind)) {
      fail(COMPANION_BACKEND_CB2_ERROR_CODES.WORLDBOOK_TRIGGER_INVALID, `unsupported trigger kind: ${kind}`);
    }
    if (kind === "always") return { kind };
    if (kind === "keyword") {
      if (!Array.isArray(trigger.keywords) || trigger.keywords.length === 0) {
        fail(COMPANION_BACKEND_CB2_ERROR_CODES.WORLDBOOK_TRIGGER_INVALID, `triggers[${index}].keywords must be a non-empty array`);
      }
      return {
        kind,
        keywords: trigger.keywords.map((keyword, keywordIndex) =>
          requiredString(keyword, `triggers[${index}].keywords[${keywordIndex}]`, COMPANION_BACKEND_CB2_ERROR_CODES.WORLDBOOK_TRIGGER_INVALID)),
      };
    }
    const pattern = requiredString(trigger.pattern, `triggers[${index}].pattern`, COMPANION_BACKEND_CB2_ERROR_CODES.WORLDBOOK_TRIGGER_INVALID);
    const flags = trigger.flags === undefined ? "i" : String(trigger.flags);
    if (!REGEX_FLAGS_PATTERN.test(flags)) {
      fail(COMPANION_BACKEND_CB2_ERROR_CODES.WORLDBOOK_TRIGGER_INVALID, `triggers[${index}].flags may only contain i, m, s, u`);
    }
    try {
      // Compile once at validation time so malformed patterns fail closed.
      new RegExp(pattern, flags);
    } catch (error) {
      fail(COMPANION_BACKEND_CB2_ERROR_CODES.WORLDBOOK_TRIGGER_INVALID, `triggers[${index}].pattern does not compile: ${error.message}`);
    }
    return { kind, pattern, flags };
  });
  const content = typeof input.content === "string" ? input.content : null;
  if (content === null || !content.trim()) {
    fail(COMPANION_BACKEND_CB2_ERROR_CODES.WORLDBOOK_ENTRY_INVALID, "worldbook entry content must be a non-empty string");
  }
  const unsigned = {
    schemaVersion: `${COMPANION_BACKEND_CONTRACT_VERSION}.worldbook-entry`,
    entryId: requiredString(input.entryId, "entryId", COMPANION_BACKEND_CB2_ERROR_CODES.WORLDBOOK_ENTRY_INVALID),
    label: String(input.label || input.entryId || ""),
    triggers: normalizedTriggers,
    priority: safeInteger(input.priority ?? 0, "priority", -10000, 10000, COMPANION_BACKEND_CB2_ERROR_CODES.WORLDBOOK_ENTRY_INVALID),
    tokenBudget: safeInteger(input.tokenBudget ?? 256, "tokenBudget", 1, 100000, COMPANION_BACKEND_CB2_ERROR_CODES.TOKEN_BUDGET_INVALID),
    content,
    enabled: input.enabled === false ? false : true,
    provenance: normalizeProvenance(input.provenance, { required: true, field: "worldbookEntry.provenance" }),
    sourceReceipts: normalizeSourceReceipts(input.sourceReceipts, "worldbookEntry.sourceReceipts"),
    extensions: clone(input.extensions || {}),
  };
  return deepFreeze({ ...unsigned, entryHash: hashStarcraftTmgContract(unsigned) });
}

export function matchWorldbookEntry(entry, scanText) {
  if (!object(entry) || !Array.isArray(entry.triggers)) {
    fail(COMPANION_BACKEND_CB2_ERROR_CODES.WORLDBOOK_ENTRY_INVALID, "matchWorldbookEntry requires a normalized worldbook entry");
  }
  const text = String(scanText ?? "");
  const lower = text.toLowerCase();
  const matchedBy = [];
  for (const trigger of entry.triggers) {
    if (trigger.kind === "always") {
      matchedBy.push("always");
    } else if (trigger.kind === "keyword") {
      for (const keyword of trigger.keywords) {
        if (lower.includes(keyword.toLowerCase())) matchedBy.push(`keyword:${keyword}`);
      }
    } else if (trigger.kind === "regex") {
      if (new RegExp(trigger.pattern, trigger.flags).test(text)) matchedBy.push(`regex:${trigger.pattern}`);
    }
  }
  return deepFreeze({ matched: matchedBy.length > 0, matchedBy });
}

// Deterministic trigger ordering: priority descending, then entryId ascending,
// then entryHash ascending as a final stable tiebreak.
export function selectWorldbookEntries(entries, scanText) {
  if (!Array.isArray(entries)) fail(COMPANION_BACKEND_CB2_ERROR_CODES.WORLDBOOK_ENTRY_INVALID, "entries must be an array");
  const fired = [];
  for (const entry of entries) {
    if (entry.enabled === false) continue;
    const match = matchWorldbookEntry(entry, scanText);
    if (match.matched) fired.push({ entry, matchedBy: [...match.matchedBy] });
  }
  fired.sort((left, right) =>
    (right.entry.priority - left.entry.priority) ||
    left.entry.entryId.localeCompare(right.entry.entryId) ||
    String(left.entry.entryHash || "").localeCompare(String(right.entry.entryHash || "")));
  return deepFreeze(fired);
}

export function createCompanionMemoryEngine(options = {}) {
  if (!object(options)) fail(COMPANION_BACKEND_CB2_ERROR_CODES.MEMORY_RECORD_INVALID, "memory engine options must be an object");
  if (options.persistence === undefined || options.persistence === null) {
    fail(COMPANION_BACKEND_ERROR_CODES.DEPENDENCY_MISSING,
      "companion memory engine requires an injected persistence port",
      { missing: ["persistence"] });
  }
  const persistence = assertCompanionPersistencePort(options.persistence);
  const prefix = String(options.namespacePrefix || "cb2").trim() || "cb2";
  const metaNamespace = `${prefix}.meta`;

  function layerNamespace(layer, scopeKey) {
    if (!ADDRESSABLE_LAYER_SET.has(layer)) {
      fail(COMPANION_BACKEND_CB2_ERROR_CODES.MEMORY_LAYER_INVALID, `unsupported memory layer: ${layer}`);
    }
    return `${prefix}.${layer}.${scopeKey}`;
  }

  async function nextRevision(scopeKey) {
    const key = `${scopeKey}::revision`;
    const current = await persistence.get(metaNamespace, key);
    const revision = (current.found ? Number(current.value?.revision) || 0 : 0) + 1;
    await persistence.put(metaNamespace, key, { revision });
    return revision;
  }

  async function readAllRecords(layer, scopeKey) {
    const namespace = layerNamespace(layer, scopeKey);
    const keys = await persistence.list(namespace);
    const records = [];
    for (const key of keys) {
      const result = await persistence.get(namespace, key);
      if (result.found) records.push(clone(result.value));
    }
    return records;
  }

  async function writeCanon(scope, key, value, provenance) {
    const sc = normalizeCompanionScope(scope);
    const canonKey = requiredString(key, "canon.key");
    assertNoHiddenChainOfThought(value, "canon.value");
    assertNoCredentials(value, "canon.value");
    const namespace = layerNamespace("canon", sc.scopeKey);
    const existing = await persistence.get(namespace, canonKey);
    if (existing.found) {
      fail(COMPANION_BACKEND_CB2_ERROR_CODES.CANON_IMMUTABLE, `canon entry is immutable and cannot be overwritten: ${canonKey}`, { key: canonKey });
    }
    const revision = await nextRevision(sc.scopeKey);
    const record = {
      key: canonKey,
      value: clone(value),
      provenance: normalizeProvenance(provenance, { required: true, field: "canon.provenance" }),
      revision,
    };
    await persistence.put(namespace, canonKey, record);
    return deepFreeze({ ok: true, layer: "canon", key: canonKey, revision, scopeKey: sc.scopeKey });
  }

  async function readCanon(scope, key) {
    const sc = normalizeCompanionScope(scope);
    const canonKey = requiredString(key, "canon.key");
    const result = await persistence.get(layerNamespace("canon", sc.scopeKey), canonKey);
    return deepFreeze({ ok: true, layer: "canon", found: result.found, value: result.found ? clone(result.value) : undefined });
  }

  async function appendTranscript(scope, entry = {}) {
    const sc = normalizeCompanionScope(scope);
    assertNoHiddenChainOfThought(entry, "transcript.entry");
    assertNoCredentials(entry, "transcript.entry");
    if (!object(entry)) fail(COMPANION_BACKEND_CB2_ERROR_CODES.MEMORY_RECORD_INVALID, "transcript entry must be an object");
    const speakerId = requiredString(entry.speakerId, "transcript.speakerId");
    const content = typeof entry.content === "string" ? entry.content : null;
    if (content === null) fail(COMPANION_BACKEND_CB2_ERROR_CODES.MEMORY_RECORD_INVALID, "transcript entry content must be a string");
    const namespace = layerNamespace("transcript", sc.scopeKey);
    const existing = await persistence.get(namespace, "log");
    const log = existing.found ? clone(existing.value?.entries) || [] : [];
    const sequence = await nextRevision(sc.scopeKey);
    log.push({
      sequence,
      speakerId,
      kind: requiredString(entry.kind || "message", "transcript.kind"),
      content,
      receipts: Array.isArray(entry.receipts) ? clone(entry.receipts) : [],
    });
    await persistence.put(namespace, "log", { entries: log });
    return deepFreeze({ ok: true, layer: "transcript", sequence, scopeKey: sc.scopeKey });
  }

  async function readTranscript(scope, options = {}) {
    const sc = normalizeCompanionScope(scope);
    const existing = await persistence.get(layerNamespace("transcript", sc.scopeKey), "log");
    const log = existing.found ? clone(existing.value?.entries) || [] : [];
    log.sort((left, right) => left.sequence - right.sequence);
    const limited = options.limit === undefined ? log : log.slice(-safeInteger(options.limit, "limit", 1, 100000, COMPANION_BACKEND_CB2_ERROR_CODES.MEMORY_RECORD_INVALID));
    return deepFreeze(limited);
  }

  // Session-scoped checkpoint recovery uses this exact replacement primitive
  // instead of restoring an entire shared persistence database.
  async function replaceTranscript(scope, entries) {
    const sc = normalizeCompanionScope(scope);
    if (!Array.isArray(entries)) {
      fail(COMPANION_BACKEND_CB2_ERROR_CODES.MEMORY_RECORD_INVALID,
        "replacement transcript must be an array");
    }
    const normalized = entries.map((entry, index) => {
      if (!object(entry)) {
        fail(COMPANION_BACKEND_CB2_ERROR_CODES.MEMORY_RECORD_INVALID,
          `replacement transcript[${index}] must be an object`);
      }
      assertNoHiddenChainOfThought(entry, `replacementTranscript[${index}]`);
      assertNoCredentials(entry, `replacementTranscript[${index}]`);
      if (typeof entry.content !== "string") {
        fail(COMPANION_BACKEND_CB2_ERROR_CODES.MEMORY_RECORD_INVALID,
          `replacementTranscript[${index}].content must be a string`);
      }
      return {
        sequence: safeInteger(entry.sequence, `replacementTranscript[${index}].sequence`,
          1, Number.MAX_SAFE_INTEGER,
          COMPANION_BACKEND_CB2_ERROR_CODES.MEMORY_RECORD_INVALID),
        speakerId: requiredString(entry.speakerId,
          `replacementTranscript[${index}].speakerId`),
        kind: requiredString(entry.kind || "message",
          `replacementTranscript[${index}].kind`),
        content: entry.content,
        receipts: Array.isArray(entry.receipts) ? clone(entry.receipts) : [],
      };
    });
    for (const [index, entry] of normalized.entries()) {
      if (index > 0 && entry.sequence <= normalized[index - 1].sequence) {
        fail(COMPANION_BACKEND_CB2_ERROR_CODES.MEMORY_RECORD_INVALID,
          "replacement transcript sequence must be strictly increasing");
      }
    }
    await persistence.put(layerNamespace("transcript", sc.scopeKey), "log", {
      entries: normalized,
    });
    return deepFreeze({
      ok: true,
      layer: "transcript",
      entryCount: normalized.length,
      transcriptHash: hashStarcraftTmgContract(normalized),
      scopeKey: sc.scopeKey,
    });
  }

  async function writeRollingSummary(scope, summary = {}) {
    const sc = normalizeCompanionScope(scope);
    assertNoHiddenChainOfThought(summary, "rollingSummary");
    assertNoCredentials(summary, "rollingSummary");
    const content = typeof summary.content === "string" ? summary.content : null;
    if (content === null || !content.trim()) {
      fail(COMPANION_BACKEND_CB2_ERROR_CODES.MEMORY_RECORD_INVALID, "rolling summary content must be a non-empty string");
    }
    const namespace = layerNamespace("rolling_summary", sc.scopeKey);
    const existing = await persistence.get(namespace, "current");
    const summaryVersion = (existing.found ? Number(existing.value?.summaryVersion) || 0 : 0) + 1;
    const revision = await nextRevision(sc.scopeKey);
    const record = {
      summaryVersion,
      content,
      coversTranscriptThrough: summary.coversTranscriptThrough === undefined
        ? null
        : safeInteger(summary.coversTranscriptThrough, "coversTranscriptThrough", 0, Number.MAX_SAFE_INTEGER, COMPANION_BACKEND_CB2_ERROR_CODES.MEMORY_RECORD_INVALID),
      receipts: Array.isArray(summary.receipts) ? clone(summary.receipts) : [],
      revision,
    };
    await persistence.put(namespace, "current", record);
    return deepFreeze({ ok: true, layer: "rolling_summary", summaryVersion, revision, scopeKey: sc.scopeKey });
  }

  async function readRollingSummary(scope) {
    const sc = normalizeCompanionScope(scope);
    const existing = await persistence.get(layerNamespace("rolling_summary", sc.scopeKey), "current");
    return deepFreeze({ ok: true, layer: "rolling_summary", found: existing.found, value: existing.found ? clone(existing.value) : undefined });
  }

  async function addEpisodicFact(scope, fact = {}) {
    const sc = normalizeCompanionScope(scope);
    assertNoHiddenChainOfThought(fact, "episodicFact");
    assertNoCredentials(fact, "episodicFact");
    if (!object(fact)) fail(COMPANION_BACKEND_CB2_ERROR_CODES.MEMORY_RECORD_INVALID, "episodic fact must be an object");
    const content = typeof fact.content === "string" ? fact.content : null;
    if (content === null || !content.trim()) {
      fail(COMPANION_BACKEND_CB2_ERROR_CODES.MEMORY_RECORD_INVALID, "episodic fact content must be a non-empty string");
    }
    const factType = requiredString(fact.factType || "observation", "episodicFact.factType");
    if (!["observation", "user_statement", "companion_statement"].includes(factType)) {
      fail(COMPANION_BACKEND_CB2_ERROR_CODES.MEMORY_RECORD_INVALID, `unsupported episodic factType: ${factType}`);
    }
    const sequence = await nextRevision(sc.scopeKey);
    const factId = fact.factId === undefined ? `fact-${sequence}` : requiredString(fact.factId, "episodicFact.factId");
    const namespace = layerNamespace("episodic_facts", sc.scopeKey);
    const existing = await persistence.get(namespace, factId);
    if (existing.found) {
      fail(COMPANION_BACKEND_CB2_ERROR_CODES.MEMORY_RECORD_INVALID, `episodic fact already exists: ${factId}`);
    }
    const record = {
      factId,
      content,
      factType,
      provenance: normalizeProvenance(fact.provenance, { required: false, field: "episodicFact.provenance" }),
      sequence,
    };
    await persistence.put(namespace, factId, record);
    return deepFreeze({ ok: true, layer: "episodic_facts", factId, sequence, scopeKey: sc.scopeKey });
  }

  async function listEpisodicFacts(scope) {
    const sc = normalizeCompanionScope(scope);
    const records = await readAllRecords("episodic_facts", sc.scopeKey);
    records.sort((left, right) => (left.sequence - right.sequence) || left.factId.localeCompare(right.factId));
    return deepFreeze(records);
  }

  async function proposeDurableMemoryCandidate(scope, candidate = {}) {
    const sc = normalizeCompanionScope(scope);
    assertNoHiddenChainOfThought(candidate, "durableCandidate");
    assertNoCredentials(candidate, "durableCandidate");
    if (!object(candidate)) fail(COMPANION_BACKEND_CB2_ERROR_CODES.MEMORY_RECORD_INVALID, "durable memory candidate must be an object");
    const content = typeof candidate.content === "string" ? candidate.content : null;
    if (content === null || !content.trim()) {
      fail(COMPANION_BACKEND_CB2_ERROR_CODES.MEMORY_RECORD_INVALID, "durable memory candidate content must be a non-empty string");
    }
    const proposedRevision = await nextRevision(sc.scopeKey);
    const candidateId = candidate.candidateId === undefined
      ? `durable-${proposedRevision}`
      : requiredString(candidate.candidateId, "durableCandidate.candidateId");
    const namespace = layerNamespace("durable_memory", sc.scopeKey);
    const existing = await persistence.get(namespace, candidateId);
    if (existing.found) {
      fail(COMPANION_BACKEND_CB2_ERROR_CODES.MEMORY_RECORD_INVALID, `durable memory candidate already exists: ${candidateId}`);
    }
    const record = {
      candidateId,
      content,
      reason: String(candidate.reason || ""),
      provenance: normalizeProvenance(candidate.provenance, { required: false, field: "durableCandidate.provenance" }),
      status: "candidate",
      proposedRevision,
      approval: null,
    };
    await persistence.put(namespace, candidateId, record);
    return deepFreeze({ ok: true, layer: "durable_memory", candidateId, status: "candidate", scopeKey: sc.scopeKey });
  }

  // The ONLY promotion path. Nothing else in this module may turn a candidate
  // into durable memory, and no Skill/memory promotion is ever automatic.
  async function approveDurableMemoryCandidate(scope, candidateId, approval = {}) {
    const sc = normalizeCompanionScope(scope);
    const id = requiredString(candidateId, "candidateId");
    const namespace = layerNamespace("durable_memory", sc.scopeKey);
    const existing = await persistence.get(namespace, id);
    if (!existing.found) {
      fail(COMPANION_BACKEND_CB2_ERROR_CODES.DURABLE_CANDIDATE_NOT_FOUND, `durable memory candidate not found: ${id}`, { candidateId: id });
    }
    if (!object(approval) || approval.approvedBy !== "user" || approval.userApproved !== true) {
      fail(COMPANION_BACKEND_CB2_ERROR_CODES.DURABLE_PROMOTION_REQUIRES_USER_APPROVAL,
        "durable memory promotion requires explicit user approval: { approvedBy: \"user\", userApproved: true }",
        { candidateId: id });
    }
    const record = clone(existing.value);
    if (record.status === "approved_durable") {
      return deepFreeze({ ok: true, layer: "durable_memory", candidateId: id, status: "approved_durable", duplicate: true });
    }
    const approvedRevision = await nextRevision(sc.scopeKey);
    record.status = "approved_durable";
    record.approval = {
      approvedBy: "user",
      userApproved: true,
      note: String(approval.note || ""),
    };
    record.approvedRevision = approvedRevision;
    await persistence.put(namespace, id, record);
    return deepFreeze({ ok: true, layer: "durable_memory", candidateId: id, status: "approved_durable", scopeKey: sc.scopeKey });
  }

  async function listDurableMemory(scope, filter = {}) {
    const sc = normalizeCompanionScope(scope);
    const records = await readAllRecords("durable_memory", sc.scopeKey);
    const filtered = filter.status === undefined ? records : records.filter((record) => record.status === filter.status);
    filtered.sort((left, right) => left.candidateId.localeCompare(right.candidateId));
    return deepFreeze(filtered);
  }

  async function registerWorldbookEntry(scope, entry) {
    const sc = normalizeCompanionScope(scope);
    const normalized = object(entry) && entry.schemaVersion === `${COMPANION_BACKEND_CONTRACT_VERSION}.worldbook-entry`
      ? entry
      : createWorldbookEntry(entry);
    const namespace = layerNamespace("worldbook", sc.scopeKey);
    const existing = await persistence.get(namespace, normalized.entryId);
    if (existing.found) {
      if (existing.value?.entryHash !== normalized.entryHash) {
        fail(COMPANION_BACKEND_CB2_ERROR_CODES.WORLDBOOK_ENTRY_CONFLICT,
          `worldbook entry ${normalized.entryId} is already registered with different content`,
          { registeredHash: existing.value?.entryHash, receivedHash: normalized.entryHash });
      }
      return deepFreeze({ ok: true, layer: "worldbook", entryId: normalized.entryId, duplicate: true, scopeKey: sc.scopeKey });
    }
    await persistence.put(namespace, normalized.entryId, clone(normalized));
    return deepFreeze({ ok: true, layer: "worldbook", entryId: normalized.entryId, duplicate: false, scopeKey: sc.scopeKey });
  }

  async function listWorldbookEntries(scope) {
    const sc = normalizeCompanionScope(scope);
    const records = await readAllRecords("worldbook", sc.scopeKey);
    records.sort((left, right) =>
      (right.priority - left.priority) ||
      left.entryId.localeCompare(right.entryId) ||
      String(left.entryHash || "").localeCompare(String(right.entryHash || "")));
    return deepFreeze(records);
  }

  async function listLayerKeys(scope, layer) {
    const sc = normalizeCompanionScope(scope);
    return persistence.list(layerNamespace(layer, sc.scopeKey));
  }

  function emptyRelationshipState(scopeKey) {
    return { scopeKey, axes: {}, history: [] };
  }

  async function getRelationshipRecord(sc) {
    const existing = await persistence.get(layerNamespace("relationship_state", sc.scopeKey), "state");
    return existing.found ? clone(existing.value) : emptyRelationshipState(sc.scopeKey);
  }

  async function initializeRelationshipState(scope, input = {}) {
    const sc = normalizeCompanionScope(scope);
    const axes = Array.isArray(input.axes) ? input.axes : [];
    const state = await getRelationshipRecord(sc);
    for (const axis of axes) {
      const name = requiredString(axis, "relationship.axis");
      if (!state.axes[name]) {
        // Unknown is a first-class state; it is never silently zero.
        state.axes[name] = { status: "unknown", value: null, lastEventId: null, updatedRevision: null };
      }
    }
    await persistence.put(layerNamespace("relationship_state", sc.scopeKey), "state", state);
    return deepFreeze({ ok: true, layer: "relationship_state", axes: Object.keys(state.axes).sort(), scopeKey: sc.scopeKey });
  }

  async function getRelationshipState(scope) {
    const sc = normalizeCompanionScope(scope);
    return deepFreeze(await getRelationshipRecord(sc));
  }

  function clampAxis(value) {
    return Math.min(RELATIONSHIP_AXIS_MAX, Math.max(RELATIONSHIP_AXIS_MIN, value));
  }

  async function applyRelationshipEvent(scope, event = {}) {
    const sc = normalizeCompanionScope(scope);
    if (!object(event)) fail(COMPANION_BACKEND_CB2_ERROR_CODES.RELATIONSHIP_EVENT_INVALID, "relationship event must be an object");
    assertNoHiddenChainOfThought(event, "relationshipEvent");
    assertNoCredentials(event, "relationshipEvent");
    // Typed observed events only: no inference, and never anything derived
    // from opponent-private state.
    assertNoOpponentPrivateInference(event, "relationshipEvent");
    const eventType = requiredString(event.eventType, "relationshipEvent.eventType", COMPANION_BACKEND_CB2_ERROR_CODES.RELATIONSHIP_EVENT_INVALID);
    if (!EVENT_TYPE_SET.has(eventType)) {
      fail(COMPANION_BACKEND_CB2_ERROR_CODES.RELATIONSHIP_EVENT_INVALID, `unsupported relationship eventType: ${eventType}`);
    }
    const visibility = requiredString(event.visibility || "player_visible", "relationshipEvent.visibility", COMPANION_BACKEND_CB2_ERROR_CODES.RELATIONSHIP_EVENT_INVALID);
    if (visibility !== "player_visible") {
      fail(COMPANION_BACKEND_CB2_ERROR_CODES.RELATIONSHIP_EVENT_VISIBILITY_VIOLATION,
        `relationship events must be player-visible observed events; received visibility: ${visibility}`);
    }
    if (!object(event.observed) || event.observed.source !== "observed_event") {
      fail(COMPANION_BACKEND_CB2_ERROR_CODES.RELATIONSHIP_EVENT_INVALID,
        "relationship events require observed.source === \"observed_event\"; the engine never infers relationship changes");
    }
    requiredString(event.observed.observedBy, "relationshipEvent.observed.observedBy", COMPANION_BACKEND_CB2_ERROR_CODES.RELATIONSHIP_EVENT_INVALID);
    if (!Array.isArray(event.deltas) || event.deltas.length === 0) {
      fail(COMPANION_BACKEND_CB2_ERROR_CODES.RELATIONSHIP_EVENT_INVALID, "relationship event deltas must be a non-empty array");
    }
    const seenAxes = new Set();
    const deltas = event.deltas.map((delta, index) => {
      if (!object(delta)) fail(COMPANION_BACKEND_CB2_ERROR_CODES.RELATIONSHIP_EVENT_INVALID, `deltas[${index}] must be an object`);
      const axis = requiredString(delta.axis, `deltas[${index}].axis`, COMPANION_BACKEND_CB2_ERROR_CODES.RELATIONSHIP_EVENT_INVALID);
      if (seenAxes.has(axis)) {
        fail(COMPANION_BACKEND_CB2_ERROR_CODES.RELATIONSHIP_EVENT_INVALID, `duplicate relationship axis in one event: ${axis}`);
      }
      seenAxes.add(axis);
      const amount = Number(delta.delta);
      if (!Number.isFinite(amount) || amount < RELATIONSHIP_AXIS_MIN || amount > RELATIONSHIP_AXIS_MAX) {
        fail(COMPANION_BACKEND_CB2_ERROR_CODES.RELATIONSHIP_EVENT_INVALID, `deltas[${index}].delta must be a finite number between ${RELATIONSHIP_AXIS_MIN} and ${RELATIONSHIP_AXIS_MAX}`);
      }
      return { axis, delta: amount };
    });
    const revision = await nextRevision(sc.scopeKey);
    const eventId = event.eventId === undefined
      ? `rel-${revision}`
      : requiredString(event.eventId, "relationshipEvent.eventId", COMPANION_BACKEND_CB2_ERROR_CODES.RELATIONSHIP_EVENT_INVALID);
    const state = await getRelationshipRecord(sc);
    for (const { axis, delta } of deltas) {
      const current = state.axes[axis];
      if (!current || current.status !== "known") {
        state.axes[axis] = {
          status: "known",
          value: clampAxis(delta),
          establishedFrom: "unknown",
          lastEventId: eventId,
          updatedRevision: revision,
        };
      } else {
        state.axes[axis] = {
          ...current,
          status: "known",
          value: clampAxis(current.value + delta),
          lastEventId: eventId,
          updatedRevision: revision,
        };
      }
    }
    state.history.push({
      eventId,
      eventType,
      revision,
      deltas: clone(deltas),
      note: String(event.note || ""),
    });
    await persistence.put(layerNamespace("relationship_state", sc.scopeKey), "state", state);
    return deepFreeze({ ok: true, layer: "relationship_state", eventId, revision, axes: clone(state.axes), scopeKey: sc.scopeKey });
  }

  // Deterministic context assembly with provenance, omission disclosure and
  // unknown-never-zero semantics. Policy COMPANION_CONTEXT_BUDGET_POLICY:
  // sections are filled in COMPANION_CONTEXT_ASSEMBLY_ORDER; world-book items
  // are truncated to min(entry.tokenBudget, remaining budget); every other
  // item is included whole or omitted with a disclosure record.
  async function assembleContext(scope, options = {}) {
    const sc = normalizeCompanionScope(scope);
    const tokenBudget = safeInteger(options.tokenBudget ?? 2048, "tokenBudget", 1, 1000000, COMPANION_BACKEND_CB2_ERROR_CODES.TOKEN_BUDGET_INVALID);
    const tail = safeInteger(options.transcriptTail ?? 20, "transcriptTail", 1, 100000, COMPANION_BACKEND_CB2_ERROR_CODES.CONTEXT_ASSEMBLY_INVALID);

    const transcript = await readTranscript(sc);
    const tailEntries = transcript.slice(-tail);
    const scanText = options.scanText !== undefined
      ? String(options.scanText)
      : tailEntries.map((entry) => entry.content).join("\n");

    const sections = [];
    const omissions = [];
    const unknowns = [];
    let usedTokens = 0;

    function includeWhole({ layer, itemId, content, provenance, extra = {} }) {
      const tokens = estimateWorldbookTokens(content);
      if (usedTokens + tokens > tokenBudget) {
        omissions.push({
          layer,
          itemId,
          reason: "token_budget_exceeded",
          requiredTokens: tokens,
          availableTokens: tokenBudget - usedTokens,
        });
        return;
      }
      usedTokens += tokens;
      sections.push({ layer, itemId, content, tokens, truncated: false, provenance: provenance || null, ...extra });
    }

    function includeBudgeted({ layer, itemId, content, provenance, itemBudget, extra = {} }) {
      const requiredTokens = estimateWorldbookTokens(content);
      const allowed = Math.min(itemBudget, tokenBudget - usedTokens);
      if (allowed < 1) {
        omissions.push({
          layer,
          itemId,
          reason: "token_budget_exceeded",
          requiredTokens,
          availableTokens: 0,
        });
        return;
      }
      const { content: finalContent, truncated } = truncateToTokenBudget(content, allowed);
      const tokens = estimateWorldbookTokens(finalContent);
      usedTokens += tokens;
      sections.push({ layer, itemId, content: finalContent, tokens, truncated, provenance: provenance || null, ...extra });
    }

    // 1. canon (immutable, precedence first)
    const canonKeys = await persistence.list(layerNamespace("canon", sc.scopeKey));
    for (const key of canonKeys) {
      const record = await persistence.get(layerNamespace("canon", sc.scopeKey), key);
      if (!record.found) continue;
      const value = record.value?.value;
      includeWhole({
        layer: "canon",
        itemId: `canon:${key}`,
        content: typeof value === "string" ? value : JSON.stringify(value),
        provenance: clone(record.value?.provenance) || null,
      });
    }

    // 2. durable memory: approved entries only; candidates never enter context
    const durableRecords = await readAllRecords("durable_memory", sc.scopeKey);
    const approvedDurable = durableRecords.filter((record) => record.status === "approved_durable")
      .sort((left, right) => left.candidateId.localeCompare(right.candidateId));
    const excludedDurableCandidates = durableRecords.filter((record) => record.status === "candidate").length;
    for (const record of approvedDurable) {
      includeWhole({
        layer: "durable_memory",
        itemId: `durable:${record.candidateId}`,
        content: record.content,
        provenance: record.provenance ? clone(record.provenance) : null,
      });
    }

    // 3. world-book: triggered entries in deterministic priority order,
    //    truncated to their per-entry token budget
    const worldbookEntries = await listWorldbookEntries(sc);
    const fired = selectWorldbookEntries(worldbookEntries, scanText);
    for (const { entry, matchedBy } of fired) {
      includeBudgeted({
        layer: "worldbook",
        itemId: `worldbook:${entry.entryId}`,
        content: entry.content,
        itemBudget: entry.tokenBudget,
        provenance: { ...clone(entry.provenance), sourceReceipts: clone(entry.sourceReceipts) },
        extra: { matchedBy },
      });
    }

    // 4. rolling summary
    const summary = await persistence.get(layerNamespace("rolling_summary", sc.scopeKey), "current");
    if (summary.found) {
      includeWhole({
        layer: "rolling_summary",
        itemId: `rolling-summary-v${summary.value?.summaryVersion}`,
        content: summary.value?.content || "",
        provenance: { revision: summary.value?.revision, coversTranscriptThrough: summary.value?.coversTranscriptThrough ?? null },
      });
    }

    // 5. episodic facts, most recent first
    const facts = await listEpisodicFacts(sc);
    const recentFacts = [...facts].sort((left, right) => (right.sequence - left.sequence) || left.factId.localeCompare(right.factId));
    for (const fact of recentFacts) {
      includeWhole({
        layer: "episodic_facts",
        itemId: `episodic:${fact.factId}`,
        content: `[${fact.factType}] ${fact.content}`,
        provenance: fact.provenance ? clone(fact.provenance) : null,
      });
    }

    // 6. relationship state; unknown axes are disclosed, never zeroed
    const relationship = await getRelationshipRecord(sc);
    const axisNames = Object.keys(relationship.axes).sort();
    if (axisNames.length > 0) {
      const lines = axisNames.map((axis) => {
        const axisState = relationship.axes[axis];
        if (axisState.status !== "known") {
          unknowns.push({
            layer: "relationship_state",
            itemId: `relationship:${axis}`,
            value: "unknown",
            note: "unknown relationship state is never rendered as zero",
          });
          return `${axis}: unknown`;
        }
        return `${axis}: ${axisState.value}`;
      });
      includeWhole({
        layer: "relationship_state",
        itemId: "relationship:state",
        content: lines.join("; "),
        provenance: { observedEventCount: relationship.history.length },
      });
    }

    // 7. transcript tail, chronological
    for (const entry of tailEntries) {
      includeWhole({
        layer: "transcript",
        itemId: `transcript:${entry.sequence}`,
        content: `${entry.speakerId}: ${entry.content}`,
        provenance: entry.receipts && entry.receipts.length ? { receipts: clone(entry.receipts) } : null,
      });
    }

    const unsigned = {
      schemaVersion: `${COMPANION_BACKEND_CONTRACT_VERSION}.context-assembly`,
      policy: COMPANION_CONTEXT_BUDGET_POLICY,
      assemblyOrder: [...COMPANION_CONTEXT_ASSEMBLY_ORDER],
      scope: { packageId: sc.packageId, companionId: sc.companionId, conversationId: sc.conversationId },
      tokenBudget,
      tokensUsed: usedTokens,
      tokensRemaining: tokenBudget - usedTokens,
      sections,
      omissions,
      unknowns,
      disclosures: {
        omittedCount: omissions.length,
        excludedDurableCandidates,
        relationshipStatus: axisNames.length > 0 ? "has_observed_axes" : "no_observed_events",
        unknownNeverZero: true,
        durablePromotion: "explicit_user_approval_only",
        opponentPrivateInference: "not_performed",
        trainingTruth: false,
      },
    };
    return deepFreeze({ ...unsigned, assemblyHash: hashStarcraftTmgContract(unsigned) });
  }

  return Object.freeze({
    engineId: "companion_worldbook_memory_engine_v1",
    layers: COMPANION_MEMORY_LAYERS,
    assemblyOrder: COMPANION_CONTEXT_ASSEMBLY_ORDER,
    relationshipEventTypes: COMPANION_RELATIONSHIP_EVENT_TYPES,
    writeCanon,
    readCanon,
    appendTranscript,
    readTranscript,
    replaceTranscript,
    writeRollingSummary,
    readRollingSummary,
    addEpisodicFact,
    listEpisodicFacts,
    proposeDurableMemoryCandidate,
    approveDurableMemoryCandidate,
    listDurableMemory,
    registerWorldbookEntry,
    listWorldbookEntries,
    listLayerKeys,
    initializeRelationshipState,
    getRelationshipState,
    applyRelationshipEvent,
    assembleContext,
  });
}
