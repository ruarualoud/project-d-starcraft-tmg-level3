import { createHash } from "node:crypto";
import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";

export const STARCRAFT_TMG_SOURCE_REGISTRY_VERSION = "starcraft_tmg_source_registry_v1";

const SOURCE_CLASSES = new Set([
  "official_rulebook",
  "official_product_backend_candidate",
  "official_product_asset_candidate",
  "product_reference_repository",
  "community_content",
  "project_d_derived",
  "legacy_adapter",
  "community_asset",
]);

const AUTHORITY_CLASSES = new Set([
  "canonical_rules",
  "canonical_product_data_candidate",
  "canonical_asset_candidate",
  "reference_implementation",
  "display_only",
  "experimental_derived",
  "provisional_adapter",
]);

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requiredString(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

function stringArray(value, field) {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
  return value.map((entry, index) => requiredString(entry, `${field}[${index}]`));
}

function assertNoCredentialMaterial(value, field) {
  const serialized = JSON.stringify(value || {}).toLowerCase();
  if (/api[_-]?key|authorization|bearer|credential|secret|cookie/.test(serialized)) throw new Error(`${field} must not contain credential material`);
}

function byteView(rawContent) {
  if (typeof rawContent === "string") return Buffer.from(rawContent, "utf8");
  if (rawContent instanceof Uint8Array) return Buffer.from(rawContent);
  return Buffer.from(JSON.stringify(rawContent), "utf8");
}

export function createStarcraftTmgSourceDescriptor(input = {}) {
  const sourceClass = requiredString(input.sourceClass, "sourceClass");
  const authorityClass = requiredString(input.authorityClass, "authorityClass");
  if (!SOURCE_CLASSES.has(sourceClass)) throw new Error(`unsupported sourceClass: ${sourceClass}`);
  if (!AUTHORITY_CLASSES.has(authorityClass)) throw new Error(`unsupported authorityClass: ${authorityClass}`);
  const unsigned = {
    schemaVersion: `${STARCRAFT_TMG_SOURCE_REGISTRY_VERSION}.source`,
    sourceId: requiredString(input.sourceId, "sourceId"),
    displayName: requiredString(input.displayName, "displayName"),
    publisher: requiredString(input.publisher, "publisher"),
    sourceClass,
    authorityClass,
    canonicalScopes: stringArray(input.canonicalScopes || [], "canonicalScopes"),
    prohibitedScopes: stringArray(input.prohibitedScopes || [], "prohibitedScopes"),
    sourceUrl: input.sourceUrl || null,
    repositoryRef: clone(input.repositoryRef || null),
    transport: clone(input.transport || {}),
    license: clone(input.license || { status: "unknown", redistributionAllowed: false }),
    review: clone(input.review || { status: "unreviewed", reviewerRequired: true }),
    snapshotPolicy: clone(input.snapshotPolicy || { rawSnapshotRequired: true, immutable: true }),
    notes: stringArray(input.notes || [], "notes"),
  };
  assertNoCredentialMaterial(unsigned, "SourceDescriptor");
  return deepFreeze({ ...unsigned, descriptorHash: hashStarcraftTmgContract(unsigned) });
}

export function createStarcraftTmgSourceRegistry(input = {}) {
  const byId = new Map();
  for (const source of input.sources || []) {
    if (!source || source.schemaVersion !== `${STARCRAFT_TMG_SOURCE_REGISTRY_VERSION}.source`) throw new Error("invalid SourceDescriptor");
    const { descriptorHash: _descriptorHash, ...unsigned } = source;
    if (hashStarcraftTmgContract(unsigned) !== source.descriptorHash) throw new Error(`SourceDescriptor integrity mismatch: ${source.sourceId || "unknown"}`);
    if (byId.has(source.sourceId)) throw new Error(`duplicate sourceId: ${source.sourceId}`);
    byId.set(source.sourceId, source);
  }

  function get(sourceId) {
    return byId.get(String(sourceId || "")) || null;
  }

  function list() {
    return deepFreeze([...byId.values()].map((source) => clone(source)));
  }

  function requireScope(sourceId, scope, options = {}) {
    const source = get(sourceId);
    if (!source) return deepFreeze({ ok: false, reason: "source_not_found", sourceId });
    if (source.prohibitedScopes.includes(scope)) return deepFreeze({ ok: false, reason: "scope_explicitly_prohibited", sourceId, scope });
    if (!source.canonicalScopes.includes(scope)) return deepFreeze({ ok: false, reason: "scope_not_canonical", sourceId, scope });
    if (options.requireReviewed === true && source.review.status !== "approved") return deepFreeze({ ok: false, reason: "source_review_required", sourceId, scope });
    if (options.requireRedistribution === true && source.license.redistributionAllowed !== true) return deepFreeze({ ok: false, reason: "redistribution_not_allowed", sourceId, scope });
    return deepFreeze({ ok: true, source: clone(source), scope });
  }

  return Object.freeze({ get, list, requireScope });
}

export function sealStarcraftTmgSourceSnapshot(input = {}) {
  const source = input.source;
  if (!source || source.schemaVersion !== `${STARCRAFT_TMG_SOURCE_REGISTRY_VERSION}.source`) throw new Error("valid source descriptor is required");
  if (input.rawContent === undefined || input.rawContent === null) throw new Error("rawContent is required");
  const capturedAt = new Date(input.capturedAt).toISOString();
  const bytes = byteView(input.rawContent);
  const retrieval = clone(input.retrieval || {});
  assertNoCredentialMaterial(retrieval, "snapshot retrieval metadata");
  const unsigned = {
    schemaVersion: `${STARCRAFT_TMG_SOURCE_REGISTRY_VERSION}.snapshot`,
    sourceRef: { id: source.sourceId, descriptorHash: source.descriptorHash },
    capturedAt,
    mediaType: requiredString(input.mediaType || "application/octet-stream", "mediaType"),
    contentEncoding: input.contentEncoding || "identity",
    byteLength: bytes.byteLength,
    rawSha256: createHash("sha256").update(bytes).digest("hex"),
    retrieval,
    immutable: true,
    rawContentStored: input.rawContentStored === true,
    reviewStatus: input.reviewStatus || "unreviewed",
  };
  const snapshotHash = hashStarcraftTmgContract(unsigned);
  return deepFreeze({ ...unsigned, snapshotId: `sc-source-snapshot-${snapshotHash}`, snapshotHash });
}

export function createStarcraftTmgNormalizedDatasetManifest(input = {}) {
  const inputSnapshots = clone(input.inputSnapshots || []);
  if (!inputSnapshots.length) throw new Error("at least one input snapshot is required");
  for (const snapshot of inputSnapshots) {
    if (!snapshot?.snapshotId || !snapshot?.snapshotHash || snapshot.immutable !== true) throw new Error("invalid input snapshot reference");
  }
  const recordIndex = clone(input.recordIndex || []);
  const unsigned = {
    schemaVersion: `${STARCRAFT_TMG_SOURCE_REGISTRY_VERSION}.normalized-dataset`,
    gameId: "starcraft-tmg",
    datasetId: requiredString(input.datasetId, "datasetId"),
    datasetVersion: requiredString(input.datasetVersion, "datasetVersion"),
    generatedAt: new Date(input.generatedAt).toISOString(),
    transformer: {
      id: requiredString(input.transformer?.id, "transformer.id"),
      version: requiredString(input.transformer?.version, "transformer.version"),
      codeHash: input.transformer?.codeHash || null,
    },
    inputSnapshots: inputSnapshots.map((snapshot) => ({
      snapshotId: snapshot.snapshotId,
      snapshotHash: snapshot.snapshotHash,
      sourceRef: clone(snapshot.sourceRef),
      reviewStatus: snapshot.reviewStatus,
    })),
    recordIndexHash: hashStarcraftTmgContract(recordIndex),
    recordCount: recordIndex.length,
    recordTypeCounts: clone(input.recordTypeCounts || {}),
    lineage: clone(input.lineage || { complete: false, missing: [] }),
    exactness: clone(input.exactness || { rulesEligible: false, reasons: ["unreviewed"] }),
    redistribution: clone(input.redistribution || { allowed: false, reasons: ["unreviewed"] }),
    training: clone(input.training || { eligible: false, reasons: ["independent_training_gate_not_passed"] }),
    omittedScopes: stringArray(input.omittedScopes || [], "omittedScopes"),
  };
  const datasetHash = hashStarcraftTmgContract(unsigned);
  return deepFreeze({ ...unsigned, datasetHash, recordIndex: deepFreeze(recordIndex) });
}
