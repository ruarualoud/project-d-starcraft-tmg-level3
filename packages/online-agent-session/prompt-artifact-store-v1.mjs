import { randomUUID } from "node:crypto";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";

export const STARCRAFT_TMG_PROMPT_ARTIFACT_STORE_VERSION =
  "starcraft_tmg_prompt_artifact_store_v1";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const ID_PATTERN = /^[A-Za-z0-9._:-]{8,200}$/u;
const REF_FIELDS = new Set(["id", "version", "hash"]);

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requiredString(value, field, maximum = 240) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new TypeError(`${field} is required`);
  if (normalized.length > maximum) throw new TypeError(`${field} exceeds ${maximum} characters`);
  return normalized;
}

function hash(value, field) {
  const normalized = requiredString(value, field, 64).toLowerCase();
  if (!HASH_PATTERN.test(normalized)) throw new TypeError(`${field} must be a sha256 hash`);
  return normalized;
}

function exactFields(value, allowed, label) {
  if (!object(value)) throw new TypeError(`${label} must be an object`);
  const unexpected = Object.keys(value).filter((field) => !allowed.has(field)).sort();
  if (unexpected.length) throw new TypeError(`${label} contains unexpected fields: ${unexpected.join(",")}`);
}

function normalizeRef(value) {
  exactFields(value, REF_FIELDS, "prompt artifact ref");
  const id = requiredString(value.id, "prompt artifact ref.id", 200);
  if (!ID_PATTERN.test(id)) throw new TypeError("prompt artifact ref.id is invalid");
  return deepFreeze({
    id,
    version: requiredString(value.version, "prompt artifact ref.version", 80),
    hash: hash(value.hash, "prompt artifact ref.hash"),
  });
}

function rejection(reason) {
  return deepFreeze({
    ok: false,
    schemaVersion: `${STARCRAFT_TMG_PROMPT_ARTIFACT_STORE_VERSION}.rejection`,
    reason,
    trainingTruth: false,
  });
}

export function createInMemoryStarcraftTmgPromptArtifactStoreV1(options = {}) {
  const createId = typeof options.createId === "function"
    ? options.createId
    : () => `sc-prompt-artifact-${randomUUID()}`;
  const maxArtifacts = Number(options.maxArtifacts || 128);
  const maxArtifactBytes = Number(options.maxArtifactBytes || 512 * 1024);
  if (!Number.isSafeInteger(maxArtifacts) || maxArtifacts < 1 || maxArtifacts > 10_000) {
    throw new TypeError("maxArtifacts is invalid");
  }
  if (!Number.isSafeInteger(maxArtifactBytes)
    || maxArtifactBytes < 1_024 || maxArtifactBytes > 8 * 1024 * 1024) {
    throw new TypeError("maxArtifactBytes is invalid");
  }
  const artifacts = new Map();

  function put(input = {}) {
    try {
      if (artifacts.size >= maxArtifacts) return rejection("prompt_artifact_capacity_reached");
      const sessionId = requiredString(input.sessionId, "sessionId", 200);
      const sessionBindingHash = hash(input.sessionBindingHash,
        "sessionBindingHash");
      if (!object(input.artifact)) throw new TypeError("artifact is required");
      const artifact = clone(input.artifact);
      const observedHash = hash(artifact.promptArtifactHash,
        "artifact.promptArtifactHash");
      const { promptArtifactHash: _hash, ...unsigned } = artifact;
      if (hashStarcraftTmgContract(unsigned) !== observedHash) {
        return rejection("prompt_artifact_integrity_mismatch");
      }
      if (artifact.sessionId !== sessionId
        || artifact.sessionBindingHash !== sessionBindingHash) {
        return rejection("prompt_artifact_session_binding_mismatch");
      }
      const bytes = Buffer.byteLength(JSON.stringify(artifact), "utf8");
      if (bytes > maxArtifactBytes) return rejection("prompt_artifact_too_large");
      let id;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        id = requiredString(createId("prompt_artifact"),
          "server prompt artifact id", 200);
        if (!ID_PATTERN.test(id)) throw new TypeError("server prompt artifact id is invalid");
        if (!artifacts.has(id)) break;
        id = null;
      }
      if (!id) return rejection("prompt_artifact_id_exhausted");
      const ref = deepFreeze({ id, version: "1", hash: observedHash });
      artifacts.set(id, {
        ref,
        sessionId,
        sessionBindingHash,
        artifact: deepFreeze(artifact),
        bytes,
      });
      return deepFreeze({ ok: true, ref, bytes, trainingTruth: false });
    } catch {
      return rejection("invalid_prompt_artifact");
    }
  }

  function resolve(input = {}) {
    try {
      const ref = normalizeRef(input);
      const record = artifacts.get(ref.id);
      if (!record || record.ref.version !== ref.version || record.ref.hash !== ref.hash) {
        return rejection("prompt_artifact_not_found");
      }
      return deepFreeze({
        ok: true,
        ref: record.ref,
        artifact: clone(record.artifact),
        bytes: record.bytes,
        trainingTruth: false,
      });
    } catch {
      return rejection("invalid_prompt_artifact_ref");
    }
  }

  function release(input = {}) {
    try {
      const ref = normalizeRef(input);
      const record = artifacts.get(ref.id);
      if (!record || record.ref.version !== ref.version || record.ref.hash !== ref.hash) {
        return deepFreeze({
          ok: true,
          released: false,
          idempotentReplay: true,
          trainingTruth: false,
        });
      }
      artifacts.delete(ref.id);
      return deepFreeze({
        ok: true,
        released: true,
        idempotentReplay: false,
        releasedHash: record.ref.hash,
        trainingTruth: false,
      });
    } catch {
      return rejection("invalid_prompt_artifact_ref");
    }
  }

  function health() {
    return deepFreeze({
      schemaVersion: `${STARCRAFT_TMG_PROMPT_ARTIFACT_STORE_VERSION}.health`,
      healthy: true,
      durability: "process_memory_ephemeral",
      artifactCount: artifacts.size,
      maxArtifacts,
      maxArtifactBytes,
      clientReadAllowed: false,
      automaticTrainingRetention: false,
      productionReady: false,
      trainingTruth: false,
    });
  }

  return Object.freeze({ put, resolve, release, health });
}
