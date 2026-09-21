import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";

export const COMPANION_BACKEND_CONTRACT_VERSION = "companion_backend_module_contract_v1";

export const COMPANION_BACKEND_ERROR_CODES = Object.freeze({
  PACKAGE_INVALID: "PACKAGE_INVALID",
  PACKAGE_VERSION_CONFLICT: "PACKAGE_VERSION_CONFLICT",
  PACKAGE_NOT_FOUND: "PACKAGE_NOT_FOUND",
  PACKAGE_VERSION_AMBIGUOUS: "PACKAGE_VERSION_AMBIGUOUS",
  AUTHORITY_BOUNDARY_VIOLATION: "AUTHORITY_BOUNDARY_VIOLATION",
  HIDDEN_COT_FORBIDDEN: "HIDDEN_COT_FORBIDDEN",
  CREDENTIALS_FORBIDDEN: "CREDENTIALS_FORBIDDEN",
  TRAINING_TRUTH_FORBIDDEN: "TRAINING_TRUTH_FORBIDDEN",
  PROVENANCE_INVALID: "PROVENANCE_INVALID",
  PRESENTATION_ASSET_INVALID: "PRESENTATION_ASSET_INVALID",
  PORT_CONFORMANCE_FAILURE: "PORT_CONFORMANCE_FAILURE",
  PERSISTENCE_DURABILITY_MISDECLARED: "PERSISTENCE_DURABILITY_MISDECLARED",
  PERSISTENCE_FAKE_DURABLE: "PERSISTENCE_FAKE_DURABLE",
  PERSISTENCE_CLOSED: "PERSISTENCE_CLOSED",
  PROVIDER_NETWORK_FORBIDDEN: "PROVIDER_NETWORK_FORBIDDEN",
  PROVIDER_REQUEST_INVALID: "PROVIDER_REQUEST_INVALID",
  PROVIDER_RESPONDER_ERROR: "PROVIDER_RESPONDER_ERROR",
  DEPENDENCY_MISSING: "DEPENDENCY_MISSING",
  CONTRACT_INTEGRITY_MISMATCH: "CONTRACT_INTEGRITY_MISMATCH",
});

export const COMPANION_PRESENTATION_STATES = Object.freeze([
  "idle",
  "speaking",
  "listening",
  "alert_combat",
  "damaged_concerned",
  "reflective",
]);

export const COMPANION_SUPPORTED_SEATS = Object.freeze(["player_seat", "observer", "review"]);

const CONTRACT_TYPES = new Set(["companion-package"]);
const PRESENTATION_STATE_SET = new Set(COMPANION_PRESENTATION_STATES);
const SEAT_SET = new Set(COMPANION_SUPPORTED_SEATS);
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const HIDDEN_COT_KEY_PATTERN = /chain[_-]?of[_-]?thought|hidden[_-]?(chain|reasoning|thought|state)|thinking[_-]?trace|internal[_-]?monologue|private[_-]?reasoning/i;
const CREDENTIAL_KEY_PATTERN = /api[_-]?key|authorization|bearer|credential|secret|password|access[_-]?token|session[_-]?token/i;

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

export class CompanionBackendError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "CompanionBackendError";
    this.code = code;
    this.details = deepFreeze(clone(details) || {});
  }
}

function fail(code, message, details) {
  throw new CompanionBackendError(code, message, details);
}

function requiredString(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) fail(COMPANION_BACKEND_ERROR_CODES.PACKAGE_INVALID, `${field} is required`);
  return normalized;
}

function stringArray(value, field) {
  if (!Array.isArray(value)) fail(COMPANION_BACKEND_ERROR_CODES.PACKAGE_INVALID, `${field} must be an array`);
  return value.map((entry, index) => requiredString(entry, `${field}[${index}]`));
}

function boundedNumber(value, field, minimum, maximum) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < minimum || normalized > maximum) {
    fail(COMPANION_BACKEND_ERROR_CODES.PACKAGE_INVALID, `${field} must be between ${minimum} and ${maximum}`);
  }
  return normalized;
}

function positiveInteger(value, field, maximum) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1 || normalized > maximum) {
    fail(COMPANION_BACKEND_ERROR_CODES.PACKAGE_INVALID, `${field} must be a positive safe integer at most ${maximum}`);
  }
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

export function assertNoHiddenChainOfThought(value, field = "value") {
  scanKeys(value, HIDDEN_COT_KEY_PATTERN, COMPANION_BACKEND_ERROR_CODES.HIDDEN_COT_FORBIDDEN, field);
  return value;
}

export function assertNoCredentials(value, field = "value") {
  scanKeys(value, CREDENTIAL_KEY_PATTERN, COMPANION_BACKEND_ERROR_CODES.CREDENTIALS_FORBIDDEN, field);
  return value;
}

function normalizeProvenance(value) {
  if (!object(value)) fail(COMPANION_BACKEND_ERROR_CODES.PROVENANCE_INVALID, "provenance is required and must be an object");
  const sourceKind = requiredString(value.sourceKind, "provenance.sourceKind");
  if (!["official_summary", "official_source_context", "community_original", "platform_original", "mixed"].includes(sourceKind)) {
    fail(COMPANION_BACKEND_ERROR_CODES.PROVENANCE_INVALID, `unsupported provenance.sourceKind: ${sourceKind}`);
  }
  return {
    sourceKind,
    author: requiredString(value.author, "provenance.author"),
    license: requiredString(value.license, "provenance.license"),
    sourceRefs: stringArray(value.sourceRefs || [], "provenance.sourceRefs"),
    notes: String(value.notes || ""),
  };
}

function normalizeIdentityEras(value, defaultEraId) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) fail(COMPANION_BACKEND_ERROR_CODES.PACKAGE_INVALID, "identityEras must be an array");
  const eras = value.map((era, index) => {
    if (!object(era)) fail(COMPANION_BACKEND_ERROR_CODES.PACKAGE_INVALID, `identityEras[${index}] must be an object`);
    return {
      eraId: requiredString(era.eraId, `identityEras[${index}].eraId`),
      label: requiredString(era.label, `identityEras[${index}].label`),
      personaState: requiredString(era.personaState || era.eraId, `identityEras[${index}].personaState`),
      knowledgeRank: Number.isSafeInteger(Number(era.knowledgeRank)) && Number(era.knowledgeRank) >= 0 ? Number(era.knowledgeRank) : 0,
      spoilerRank: Number.isSafeInteger(Number(era.spoilerRank)) && Number(era.spoilerRank) >= 0 ? Number(era.spoilerRank) : 0,
    };
  });
  if (new Set(eras.map((era) => era.eraId)).size !== eras.length) {
    fail(COMPANION_BACKEND_ERROR_CODES.PACKAGE_INVALID, "identityEras must not contain duplicate eraId values");
  }
  if (defaultEraId !== undefined && defaultEraId !== null && !eras.some((era) => era.eraId === defaultEraId)) {
    fail(COMPANION_BACKEND_ERROR_CODES.PACKAGE_INVALID, `defaultEraId is not a registered era: ${defaultEraId}`);
  }
  return eras;
}

function normalizePresentationAssets(value) {
  if (value === undefined) return {};
  if (!object(value)) fail(COMPANION_BACKEND_ERROR_CODES.PRESENTATION_ASSET_INVALID, "presentationAssets must be an object keyed by presentation state");
  const normalized = {};
  for (const [state, ref] of Object.entries(value)) {
    if (!PRESENTATION_STATE_SET.has(state)) {
      fail(COMPANION_BACKEND_ERROR_CODES.PRESENTATION_ASSET_INVALID, `unsupported presentation state: ${state}`);
    }
    if (!object(ref)) fail(COMPANION_BACKEND_ERROR_CODES.PRESENTATION_ASSET_INVALID, `presentationAssets.${state} must be an object`);
    const contentHash = String(ref.contentHash || "");
    if (!HASH_PATTERN.test(contentHash)) {
      fail(COMPANION_BACKEND_ERROR_CODES.PRESENTATION_ASSET_INVALID, `presentationAssets.${state}.contentHash must be a SHA-256 hash (receipt-bound asset)`);
    }
    normalized[state] = {
      assetId: requiredString(ref.assetId, `presentationAssets.${state}.assetId`),
      contentHash,
      mediaType: requiredString(ref.mediaType || "application/octet-stream", `presentationAssets.${state}.mediaType`),
    };
  }
  return normalized;
}

function unsignedContract(value = {}) {
  const { integrity: _integrity, ...unsigned } = clone(value);
  return unsigned;
}

function seal(contractType, value) {
  if (!CONTRACT_TYPES.has(contractType)) fail(COMPANION_BACKEND_ERROR_CODES.PACKAGE_INVALID, `unknown contract type: ${contractType}`);
  const unsigned = {
    schemaVersion: COMPANION_BACKEND_CONTRACT_VERSION,
    contractType,
    ...unsignedContract(value),
  };
  const integrity = {
    algorithm: "sha256",
    hash: hashStarcraftTmgContract(unsigned),
  };
  return deepFreeze({ ...unsigned, integrity });
}

export function assertCompanionBackendContract(value, expectedType) {
  if (!object(value)) fail(COMPANION_BACKEND_ERROR_CODES.PACKAGE_INVALID, "companion contract must be an object");
  if (value.schemaVersion !== COMPANION_BACKEND_CONTRACT_VERSION) {
    fail(COMPANION_BACKEND_ERROR_CODES.PACKAGE_INVALID, "companion contract schemaVersion mismatch");
  }
  if (expectedType && value.contractType !== expectedType) {
    fail(COMPANION_BACKEND_ERROR_CODES.PACKAGE_INVALID, `expected ${expectedType}, received ${value.contractType}`);
  }
  if (!CONTRACT_TYPES.has(value.contractType)) {
    fail(COMPANION_BACKEND_ERROR_CODES.PACKAGE_INVALID, `unknown companion contract type: ${value.contractType}`);
  }
  if (value.integrity?.algorithm !== "sha256") {
    fail(COMPANION_BACKEND_ERROR_CODES.CONTRACT_INTEGRITY_MISMATCH, "companion contract integrity algorithm mismatch");
  }
  const expectedHash = hashStarcraftTmgContract(unsignedContract(value));
  if (value.integrity?.hash !== expectedHash) {
    fail(COMPANION_BACKEND_ERROR_CODES.CONTRACT_INTEGRITY_MISMATCH, "companion contract integrity mismatch");
  }
  return value;
}

export function exportCompanionBackendContract(value) {
  assertCompanionBackendContract(value);
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function importCompanionBackendContract(serialized, expectedType) {
  const parsed = typeof serialized === "string" ? JSON.parse(serialized) : clone(serialized);
  assertCompanionBackendContract(parsed, expectedType);
  return deepFreeze(parsed);
}

export function createCompanionPackage(input = {}) {
  if (!object(input)) fail(COMPANION_BACKEND_ERROR_CODES.PACKAGE_INVALID, "companion package input must be an object");
  assertNoHiddenChainOfThought(input, "companionPackage");
  assertNoCredentials(input, "companionPackage");
  if (input.trainingTruth === true) {
    fail(COMPANION_BACKEND_ERROR_CODES.TRAINING_TRUTH_FORBIDDEN, "companion packages can never be training truth");
  }
  const authority = object(input.authority) ? input.authority : {};
  if (authority.rules !== "external_rules_service") {
    fail(COMPANION_BACKEND_ERROR_CODES.AUTHORITY_BOUNDARY_VIOLATION, "companion package rules authority must be external_rules_service");
  }
  if (authority.matchState !== "room_tools_only") {
    fail(COMPANION_BACKEND_ERROR_CODES.AUTHORITY_BOUNDARY_VIOLATION, "companion package match state must come from room_tools_only");
  }
  const supportedSeats = stringArray(input.supportedSeats || ["observer"], "supportedSeats");
  for (const seat of supportedSeats) {
    if (!SEAT_SET.has(seat)) fail(COMPANION_BACKEND_ERROR_CODES.PACKAGE_INVALID, `unsupported seat: ${seat}`);
  }
  if (new Set(supportedSeats).size !== supportedSeats.length) {
    fail(COMPANION_BACKEND_ERROR_CODES.PACKAGE_INVALID, "supportedSeats must not contain duplicates");
  }
  const identityEras = normalizeIdentityEras(input.identityEras, input.defaultEraId);
  return seal("companion-package", {
    packageId: requiredString(input.packageId, "packageId"),
    slug: requiredString(input.slug, "slug"),
    displayName: requiredString(input.displayName, "displayName"),
    version: requiredString(input.version, "version"),
    status: requiredString(input.status || "draft", "status"),
    supportedSeats,
    defaultPersonaState: requiredString(input.defaultPersonaState, "defaultPersonaState"),
    identityEras,
    defaultEraId: input.defaultEraId ?? identityEras[0]?.eraId ?? null,
    description: String(input.description || ""),
    personalitySummary: String(input.personalitySummary || ""),
    worldbookRefs: stringArray(input.worldbookRefs || [], "worldbookRefs"),
    presentationAssets: normalizePresentationAssets(input.presentationAssets),
    authority: { rules: "external_rules_service", matchState: "room_tools_only" },
    visibilityPolicy: requiredString(input.visibilityPolicy || "player_visible_only", "visibilityPolicy"),
    rationalePolicy: "public_rationale_only",
    reasoningTransparency: "public_rationale_and_receipts_only",
    trainingTruth: false,
    provenance: normalizeProvenance(input.provenance),
    rights: clone(input.rights || {}),
    contentRating: input.contentRating || "teen",
    locale: input.locale || "en-US",
    tags: stringArray(input.tags || [], "tags"),
    extensions: clone(input.extensions || {}),
  });
}

function registryRejection(reason, details = {}) {
  return deepFreeze({
    ok: false,
    schemaVersion: `${COMPANION_BACKEND_CONTRACT_VERSION}.registry-rejection`,
    reason,
    ...clone(details),
  });
}

export function createCompanionPackageRegistry() {
  const byId = new Map();

  function register(candidate) {
    const contract = object(candidate) && candidate.schemaVersion === COMPANION_BACKEND_CONTRACT_VERSION
      ? assertCompanionBackendContract(candidate, "companion-package")
      : createCompanionPackage(candidate);
    let versions = byId.get(contract.packageId);
    if (!versions) {
      versions = new Map();
      byId.set(contract.packageId, versions);
    }
    const existing = versions.get(contract.version);
    const packageRef = { id: contract.packageId, version: contract.version, hash: contract.integrity.hash };
    if (existing) {
      if (existing.integrity.hash !== contract.integrity.hash) {
        fail(COMPANION_BACKEND_ERROR_CODES.PACKAGE_VERSION_CONFLICT,
          `companion package ${contract.packageId}@${contract.version} is already registered with different content`,
          { registeredHash: existing.integrity.hash, receivedHash: contract.integrity.hash });
      }
      return deepFreeze({ ok: true, duplicate: true, packageRef, registeredCount: versions.size });
    }
    versions.set(contract.version, contract);
    return deepFreeze({ ok: true, duplicate: false, packageRef, registeredCount: versions.size });
  }

  function list() {
    const rows = [];
    for (const versions of byId.values()) {
      for (const contract of versions.values()) {
        rows.push({
          packageId: contract.packageId,
          version: contract.version,
          slug: contract.slug,
          displayName: contract.displayName,
          status: contract.status,
          supportedSeats: [...contract.supportedSeats],
          provenanceSourceKind: contract.provenance.sourceKind,
          integrityHash: contract.integrity.hash,
        });
      }
    }
    rows.sort((left, right) => left.packageId.localeCompare(right.packageId) || left.version.localeCompare(right.version));
    return deepFreeze(rows);
  }

  function count() {
    let total = 0;
    for (const versions of byId.values()) total += versions.size;
    return total;
  }

  function get(packageId, version) {
    const id = requiredString(packageId, "packageId");
    const versions = byId.get(id);
    if (!versions) {
      fail(COMPANION_BACKEND_ERROR_CODES.PACKAGE_NOT_FOUND, `companion package not registered: ${id}`, { packageId: id });
    }
    if (version === undefined || version === null) {
      if (versions.size !== 1) {
        fail(COMPANION_BACKEND_ERROR_CODES.PACKAGE_VERSION_AMBIGUOUS,
          `companion package ${id} has ${versions.size} registered versions; an exact version is required`,
          { packageId: id, versions: [...versions.keys()] });
      }
      return [...versions.values()][0];
    }
    const normalizedVersion = requiredString(version, "version");
    const contract = versions.get(normalizedVersion);
    if (!contract) {
      fail(COMPANION_BACKEND_ERROR_CODES.PACKAGE_NOT_FOUND,
        `companion package version not registered: ${id}@${normalizedVersion}`,
        { packageId: id, version: normalizedVersion, versions: [...versions.keys()] });
    }
    return contract;
  }

  function resolve(selection = {}) {
    let contract;
    try {
      contract = get(selection.packageId, selection.version);
    } catch (error) {
      if (error instanceof CompanionBackendError) {
        return registryRejection(error.code, { message: error.message, ...clone(error.details) });
      }
      throw error;
    }
    const unsigned = {
      schemaVersion: `${COMPANION_BACKEND_CONTRACT_VERSION}.registry-resolution`,
      packageRef: { id: contract.packageId, version: contract.version, hash: contract.integrity.hash },
      provenanceHash: hashStarcraftTmgContract(contract.provenance),
      authority: clone(contract.authority),
      rulesAuthority: "external_rules_service",
      trainingTruth: false,
    };
    const receipt = deepFreeze({ ...unsigned, resolutionHash: hashStarcraftTmgContract(unsigned) });
    return deepFreeze({ ok: true, package: clone(contract), receipt });
  }

  return Object.freeze({ register, list, count, get, resolve });
}

export const COMPANION_PERSISTENCE_PORT_V1 = deepFreeze({
  schemaVersion: `${COMPANION_BACKEND_CONTRACT_VERSION}.persistence-port`,
  portId: "companion_persistence_port_v1",
  requiredMethods: ["get", "put", "delete", "list", "checkpoint", "restore", "exportSnapshot", "close"],
  requiresExplicitDurabilityDeclaration: true,
  fakeDurablePersistenceForbidden: true,
});

export function assertCompanionPersistencePort(adapter) {
  if (!object(adapter) && typeof adapter !== "object") {
    fail(COMPANION_BACKEND_ERROR_CODES.PORT_CONFORMANCE_FAILURE, "persistence adapter must be an object");
  }
  if (adapter.portId !== COMPANION_PERSISTENCE_PORT_V1.portId) {
    fail(COMPANION_BACKEND_ERROR_CODES.PORT_CONFORMANCE_FAILURE, `persistence adapter portId must be ${COMPANION_PERSISTENCE_PORT_V1.portId}`);
  }
  for (const method of COMPANION_PERSISTENCE_PORT_V1.requiredMethods) {
    if (typeof adapter[method] !== "function") {
      fail(COMPANION_BACKEND_ERROR_CODES.PORT_CONFORMANCE_FAILURE, `persistence adapter is missing method: ${method}`);
    }
  }
  if (typeof adapter.durable !== "boolean" || !String(adapter.durability || "").trim()) {
    fail(COMPANION_BACKEND_ERROR_CODES.PERSISTENCE_DURABILITY_MISDECLARED, "persistence adapter must declare durable (boolean) and durability (string)");
  }
  if (adapter.durable === true && /volatile|in[_-]?memory|ephemeral|transient/i.test(String(adapter.durability))) {
    fail(COMPANION_BACKEND_ERROR_CODES.PERSISTENCE_DURABILITY_MISDECLARED,
      `persistence adapter declares durable=true with non-durable durability label: ${adapter.durability}`);
  }
  return adapter;
}

export const COMPANION_PROVIDER_PORT_V1 = deepFreeze({
  schemaVersion: `${COMPANION_BACKEND_CONTRACT_VERSION}.provider-port`,
  portId: "companion_provider_port_v1",
  requiredMethods: ["complete"],
  networkCallsForbiddenInsideModule: true,
  credentialsForbidden: true,
  hiddenChainOfThoughtForbidden: true,
});

export function assertCompanionProviderPort(adapter) {
  if (!adapter || typeof adapter !== "object") {
    fail(COMPANION_BACKEND_ERROR_CODES.PORT_CONFORMANCE_FAILURE, "provider adapter must be an object");
  }
  if (adapter.portId !== COMPANION_PROVIDER_PORT_V1.portId) {
    fail(COMPANION_BACKEND_ERROR_CODES.PORT_CONFORMANCE_FAILURE, `provider adapter portId must be ${COMPANION_PROVIDER_PORT_V1.portId}`);
  }
  for (const method of COMPANION_PROVIDER_PORT_V1.requiredMethods) {
    if (typeof adapter[method] !== "function") {
      fail(COMPANION_BACKEND_ERROR_CODES.PORT_CONFORMANCE_FAILURE, `provider adapter is missing method: ${method}`);
    }
  }
  assertNoCredentials(adapter, "providerAdapter");
  return adapter;
}

const PROVIDER_MESSAGE_ROLES = new Set(["system", "user", "assistant", "tool"]);

export function createCompanionProviderRequest(input = {}) {
  if (!object(input)) fail(COMPANION_BACKEND_ERROR_CODES.PROVIDER_REQUEST_INVALID, "provider request must be an object");
  assertNoHiddenChainOfThought(input, "providerRequest");
  assertNoCredentials(input, "providerRequest");
  if (!Array.isArray(input.messages) || input.messages.length === 0) {
    fail(COMPANION_BACKEND_ERROR_CODES.PROVIDER_REQUEST_INVALID, "provider request messages must be a non-empty array");
  }
  const messages = input.messages.map((message, index) => {
    if (!object(message)) fail(COMPANION_BACKEND_ERROR_CODES.PROVIDER_REQUEST_INVALID, `messages[${index}] must be an object`);
    const role = requiredString(message.role, `messages[${index}].role`);
    if (!PROVIDER_MESSAGE_ROLES.has(role)) {
      fail(COMPANION_BACKEND_ERROR_CODES.PROVIDER_REQUEST_INVALID, `unsupported message role: ${role}`);
    }
    if (typeof message.content !== "string") {
      fail(COMPANION_BACKEND_ERROR_CODES.PROVIDER_REQUEST_INVALID, `messages[${index}].content must be a string`);
    }
    return { role, content: message.content };
  });
  return deepFreeze({
    schemaVersion: `${COMPANION_BACKEND_CONTRACT_VERSION}.provider-request`,
    requestId: requiredString(input.requestId || `req-${hashStarcraftTmgContract(messages).slice(0, 16)}`, "requestId"),
    companionRef: input.companionRef ? clone(input.companionRef) : null,
    messages,
    maxOutputTokens: positiveInteger(input.maxOutputTokens ?? 1024, "maxOutputTokens", 100000),
    temperature: boundedNumber(input.temperature ?? 0.3, "temperature", 0, 2),
    rationalePolicy: "public_rationale_only",
    reasoningTrace: "not_requested",
    trainingTruth: false,
    metadata: clone(input.metadata || {}),
  });
}

export function createCompanionProviderResponse(input = {}) {
  if (!object(input)) fail(COMPANION_BACKEND_ERROR_CODES.PROVIDER_REQUEST_INVALID, "provider response must be an object");
  assertNoHiddenChainOfThought(input, "providerResponse");
  assertNoCredentials(input, "providerResponse");
  if (typeof input.content !== "string") {
    fail(COMPANION_BACKEND_ERROR_CODES.PROVIDER_REQUEST_INVALID, "provider response content must be a string");
  }
  let uncertainty = input.uncertainty ?? "unknown";
  if (uncertainty !== "unknown") uncertainty = boundedNumber(uncertainty, "uncertainty", 0, 1);
  const usage = object(input.usage) ? {
    promptTokens: Math.max(0, Math.floor(Number(input.usage.promptTokens) || 0)),
    completionTokens: Math.max(0, Math.floor(Number(input.usage.completionTokens) || 0)),
    reportedCostUnits: Math.max(0, Number(input.usage.reportedCostUnits) || 0),
  } : { promptTokens: 0, completionTokens: 0, reportedCostUnits: 0 };
  return deepFreeze({
    schemaVersion: `${COMPANION_BACKEND_CONTRACT_VERSION}.provider-response`,
    content: input.content,
    rationale: typeof input.rationale === "string" ? input.rationale : "",
    receipts: Array.isArray(input.receipts) ? clone(input.receipts) : [],
    uncertainty,
    usage,
    trainingTruth: false,
  });
}

export const COMPANION_BACKEND_INTEGRATION_DESCRIPTOR = deepFreeze({
  schemaVersion: `${COMPANION_BACKEND_CONTRACT_VERSION}.integration`,
  entryPoint: "packages/companion-backend-module-v1/index.mjs",
  composition: "single_existing_composition_file_change",
  requiredDependencies: [
    {
      name: "persistence",
      port: COMPANION_PERSISTENCE_PORT_V1.portId,
      reason: "layered memory, session resume and checkpoint storage; durable adapters are a later Codex integration",
    },
  ],
  optionalDependencies: [
    {
      name: "provider",
      port: COMPANION_PROVIDER_PORT_V1.portId,
      failClosedWhenAbsent: true,
      reason: "no Provider implementation, network call or credential handling inside this module",
    },
    { name: "registry", port: "companion_package_registry_v1", failClosedWhenAbsent: false, reason: "defaults to an empty in-process registry" },
  ],
  authorityBoundaries: {
    rules: "external_rules_service",
    matchState: "room_tools_only",
    trainingTruth: false,
    hiddenChainOfThought: "forbidden",
  },
});

export function assertCompanionBackendDependencies(dependencies = {}) {
  const missing = [];
  for (const required of COMPANION_BACKEND_INTEGRATION_DESCRIPTOR.requiredDependencies) {
    if (dependencies[required.name] === undefined || dependencies[required.name] === null) missing.push(required.name);
  }
  if (missing.length) {
    fail(COMPANION_BACKEND_ERROR_CODES.DEPENDENCY_MISSING,
      `companion backend startup is missing required dependencies: ${missing.join(", ")}`,
      { missing });
  }
  assertCompanionPersistencePort(dependencies.persistence);
  if (dependencies.provider !== undefined && dependencies.provider !== null) {
    assertCompanionProviderPort(dependencies.provider);
  }
  return dependencies;
}
