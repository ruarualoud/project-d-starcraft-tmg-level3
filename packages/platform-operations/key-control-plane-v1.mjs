import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import {
  canonicalStarcraftTmgJson,
  hashStarcraftTmgContract,
} from "../authoritative-engine/referee-crypto-v1.mjs";

export const STARCRAFT_TMG_KEY_CONTROL_VERSION =
  "starcraft_tmg_key_control_plane_v1";
export const STARCRAFT_TMG_KMS_PORT_VERSION =
  "starcraft_tmg_external_kms_port_v1";

const SAFE_ID = /^[A-Za-z0-9._:@/+\-]{1,240}$/u;
const HASH = /^[a-f0-9]{64}$/u;
const STATES = new Set(["active", "retired", "revoked"]);
const KEY_KINDS = Object.freeze({
  long_term_signature: "ed25519",
  short_lived_seal: "hmac-sha256",
  private_payload_encryption: "kms-envelope-aes-256-gcm",
  quarantine_encryption: "kms-envelope-aes-256-gcm",
  release_signature: "ed25519",
});
const FORBIDDEN_PURPOSE = /(?:byok|user.?api.?key|seat.?credential)/iu;
const SECRET_KEY = /^(?:api.?key|authorization|cookie|credential(?:value|bytes|material)|secret(?:value|bytes|material)|access.?token|refresh.?token|seat.?token|bearer(?:token|value|bytes|material)|plaintextKey|privateKey)$/iu;
const SECRET_VALUE = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}|\b(?:sk|jsk)-[A-Za-z0-9_-]{12,}/iu;

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function id(value, field) {
  const result = String(value || "").trim();
  if (!SAFE_ID.test(result)) throw new TypeError(`${field} is invalid`);
  return result;
}

function digest(value, field) {
  const result = String(value || "").toLowerCase();
  if (!HASH.test(result)) throw new TypeError(`${field} is invalid`);
  return result;
}

function instant(value, field) {
  let result;
  try { result = new Date(value).toISOString(); } catch {
    throw new TypeError(`${field} is invalid`);
  }
  if (result !== value) throw new TypeError(`${field} is invalid`);
  return result;
}

function assertNoSecrets(value, path = "$", seen = new Set()) {
  if (typeof value === "string") {
    if (SECRET_VALUE.test(value)) throw new Error(`KEY_CONTROL_SECRET_FORBIDDEN:${path}`);
    return;
  }
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoSecrets(entry, `${path}[${index}]`, seen));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) throw new Error(`KEY_CONTROL_SECRET_FIELD_FORBIDDEN:${path}.${key}`);
    assertNoSecrets(child, `${path}.${key}`, seen);
  }
}

function normalizedContext(value, purpose) {
  if (!object(value)) throw new TypeError("cryptographic context is required");
  assertNoSecrets(value, "context");
  const result = { ...clone(value), gameId: "starcraft-tmg", purpose };
  for (const [key, entry] of Object.entries(result)) {
    if (!SAFE_ID.test(key) || typeof entry !== "string" || !entry.trim()
      || entry.length > 512) throw new TypeError("cryptographic context must contain bounded string pairs");
  }
  return Object.fromEntries(Object.entries(result)
    .sort(([left], [right]) => left.localeCompare(right)));
}

function keyKind(value) {
  const result = id(value, "keyKind");
  if (!KEY_KINDS[result] || FORBIDDEN_PURPOSE.test(result)) {
    throw new TypeError("keyKind is not allowed");
  }
  return result;
}

function cryptoPurpose(value) {
  const result = id(value, "purpose");
  if (FORBIDDEN_PURPOSE.test(result)) {
    throw new Error("PERSISTENT_BYOK_PURPOSE_FORBIDDEN");
  }
  return result;
}

function assertPort(port) {
  const methods = [
    "signDigest", "verifyDigest", "computeMac", "verifyMac",
    "withGeneratedDataKey", "withUnwrappedDataKey",
  ];
  if (!object(port?.descriptor)
    || port.descriptor.interfaceVersion !== STARCRAFT_TMG_KMS_PORT_VERSION
    || typeof port.descriptor.productionReady !== "boolean"
    || port.descriptor.rawKeyPersistence !== false
    || methods.some((name) => typeof port[name] !== "function")) {
    throw new TypeError("external KMS port is invalid");
  }
  return port;
}

function normalizeRecord(input) {
  const kind = keyKind(input.keyKind);
  const state = id(input.state || "active", "state");
  if (!STATES.has(state)) throw new TypeError("key state is invalid");
  const record = {
    logicalKeyId: id(input.logicalKeyId, "logicalKeyId"),
    keyRef: id(input.keyRef, "keyRef"),
    keyVersion: Number(input.keyVersion),
    keyKind: kind,
    algorithm: KEY_KINDS[kind],
    state,
    activatedAt: instant(input.activatedAt, "activatedAt"),
    retiredAt: input.retiredAt == null ? null : instant(input.retiredAt, "retiredAt"),
    revokedAt: input.revokedAt == null ? null : instant(input.revokedAt, "revokedAt"),
    publicVerificationRef: input.publicVerificationRef == null
      ? null : id(input.publicVerificationRef, "publicVerificationRef"),
    secretMaterialPersisted: false,
    byok: false,
  };
  if (!Number.isSafeInteger(record.keyVersion) || record.keyVersion < 1
    || (state === "active" && (record.retiredAt || record.revokedAt))
    || (state === "retired" && !record.retiredAt)
    || (state === "revoked" && !record.revokedAt)) {
    throw new TypeError("key lifecycle record is invalid");
  }
  return record;
}

function b64(value) { return Buffer.from(value).toString("base64url"); }

export function createStarcraftTmgKeyControlPlaneV1(options = {}) {
  const port = assertPort(options.kmsPort);
  const records = new Map();
  for (const input of options.initialKeys || []) {
    const record = normalizeRecord(input);
    if (records.has(record.keyRef)) throw new Error("KEY_REF_ALREADY_EXISTS");
    if (record.state === "active" && [...records.values()].some((entry) =>
      entry.logicalKeyId === record.logicalKeyId && entry.state === "active")) {
      throw new Error("MULTIPLE_ACTIVE_KEY_VERSIONS");
    }
    records.set(record.keyRef, record);
  }

  function resolve(keyRef, { issue = false, expectedKind = null } = {}) {
    const record = records.get(id(keyRef, "keyRef"));
    if (!record) throw new Error("KEY_REF_NOT_FOUND");
    if (expectedKind && record.keyKind !== expectedKind) {
      throw new Error("KEY_KIND_MISMATCH");
    }
    if (issue && record.state !== "active") throw new Error("KEY_NOT_ACTIVE");
    return record;
  }

  function active(logicalKeyId, expectedKind) {
    const logical = id(logicalKeyId, "logicalKeyId");
    const record = [...records.values()].find((entry) =>
      entry.logicalKeyId === logical && entry.state === "active");
    if (!record) throw new Error("ACTIVE_KEY_NOT_FOUND");
    if (expectedKind && record.keyKind !== expectedKind) throw new Error("KEY_KIND_MISMATCH");
    return record;
  }

  function snapshot() {
    const body = {
      schemaVersion: `${STARCRAFT_TMG_KEY_CONTROL_VERSION}.snapshot`,
      provider: clone(port.descriptor),
      keys: [...records.values()].map(clone)
        .sort((left, right) => left.keyRef.localeCompare(right.keyRef)),
      secretMaterialPersisted: false,
      byokPersisted: false,
      trainingTruth: false,
    };
    return freeze({ ...body, snapshotHash: hashStarcraftTmgContract(body) });
  }

  function rotate(input = {}) {
    const current = active(input.logicalKeyId, keyKind(input.keyKind));
    const at = instant(input.rotatedAt, "rotatedAt");
    const next = normalizeRecord({
      logicalKeyId: current.logicalKeyId,
      keyRef: input.newKeyRef,
      keyVersion: input.newKeyVersion,
      keyKind: current.keyKind,
      state: "active",
      activatedAt: at,
      publicVerificationRef: input.publicVerificationRef ?? null,
    });
    if (next.keyVersion <= current.keyVersion || records.has(next.keyRef)) {
      throw new Error("KEY_ROTATION_VERSION_INVALID");
    }
    records.set(current.keyRef, { ...current, state: "retired", retiredAt: at });
    records.set(next.keyRef, next);
    return snapshot();
  }

  function revoke(input = {}) {
    const current = resolve(input.keyRef);
    const at = instant(input.revokedAt, "revokedAt");
    records.set(current.keyRef, {
      ...current,
      state: "revoked",
      retiredAt: current.retiredAt || at,
      revokedAt: at,
    });
    return snapshot();
  }

  async function sign(input = {}) {
    assertNoSecrets(input);
    const record = active(input.logicalKeyId, input.keyKind || "long_term_signature");
    if (!new Set(["long_term_signature", "release_signature"]).has(record.keyKind)) {
      throw new Error("KEY_KIND_CANNOT_SIGN");
    }
    const issuedAt = instant(input.issuedAt, "issuedAt");
    const purpose = cryptoPurpose(input.purpose);
    const context = normalizedContext(input.context, purpose);
    const contentHash = hashStarcraftTmgContract(input.value);
    const contextHash = hashStarcraftTmgContract(context);
    const signature = await port.signDigest({
      keyRef: record.keyRef, algorithm: record.algorithm, contentHash,
      contextHash, purpose,
    });
    return freeze({
      schemaVersion: `${STARCRAFT_TMG_KEY_CONTROL_VERSION}.signature`,
      keyRef: record.keyRef,
      keyVersion: record.keyVersion,
      keyKind: record.keyKind,
      algorithm: record.algorithm,
      purpose,
      context,
      contextHash,
      contentHash,
      issuedAt,
      signature: id(signature, "signature"),
      byok: false,
      trainingTruth: false,
    });
  }

  async function verifySignature(input = {}) {
    const proof = input.proof;
    const record = resolve(proof?.keyRef);
    const purpose = cryptoPurpose(input.purpose);
    const context = normalizedContext(input.context, purpose);
    const contentHash = hashStarcraftTmgContract(input.value);
    const structureValid = proof?.schemaVersion
        === `${STARCRAFT_TMG_KEY_CONTROL_VERSION}.signature`
      && proof.keyVersion === record.keyVersion
      && proof.keyKind === record.keyKind
      && proof.algorithm === record.algorithm
      && proof.purpose === purpose
      && proof.contextHash === hashStarcraftTmgContract(context)
      && proof.contentHash === contentHash;
    const cryptographicValid = structureValid && await port.verifyDigest({
      keyRef: record.keyRef, algorithm: record.algorithm, contentHash,
      contextHash: proof.contextHash, purpose, signature: proof.signature,
    });
    const issuedAt = proof?.issuedAt ? instant(proof.issuedAt, "proof.issuedAt") : null;
    const trustedAtIssue = cryptographicValid
      && (!record.revokedAt || issuedAt < record.revokedAt);
    return freeze({ cryptographicValid, trustedAtIssue,
      currentKeyState: record.state, historicalRetiredKeyAccepted:
        cryptographicValid && record.state === "retired", trainingTruth: false });
  }

  async function seal(input = {}) {
    assertNoSecrets(input);
    const record = active(input.logicalKeyId, "short_lived_seal");
    const issuedAt = instant(input.issuedAt, "issuedAt");
    const expiresAt = instant(input.expiresAt, "expiresAt");
    if (expiresAt <= issuedAt) throw new Error("SEAL_EXPIRY_INVALID");
    const purpose = cryptoPurpose(input.purpose);
    const context = normalizedContext(input.context, purpose);
    const contentHash = hashStarcraftTmgContract(input.value);
    const contextHash = hashStarcraftTmgContract(context);
    const mac = await port.computeMac({ keyRef: record.keyRef,
      algorithm: record.algorithm, contentHash, contextHash, purpose,
      issuedAt, expiresAt });
    return freeze({
      schemaVersion: `${STARCRAFT_TMG_KEY_CONTROL_VERSION}.seal`,
      keyRef: record.keyRef, keyVersion: record.keyVersion,
      algorithm: record.algorithm, purpose, context, contextHash, contentHash,
      issuedAt, expiresAt, mac: id(mac, "mac"), byok: false,
      trainingTruth: false,
    });
  }

  async function verifySeal(input = {}) {
    const proof = input.proof;
    const record = resolve(proof?.keyRef);
    const at = instant(input.at, "at");
    const purpose = cryptoPurpose(input.purpose);
    const context = normalizedContext(input.context, purpose);
    const contentHash = hashStarcraftTmgContract(input.value);
    const structureValid = proof?.schemaVersion
        === `${STARCRAFT_TMG_KEY_CONTROL_VERSION}.seal`
      && proof.keyVersion === record.keyVersion
      && proof.algorithm === record.algorithm
      && proof.purpose === purpose
      && proof.contextHash === hashStarcraftTmgContract(context)
      && proof.contentHash === contentHash;
    const cryptographicValid = structureValid && record.state !== "revoked"
      && await port.verifyMac({ keyRef: record.keyRef,
        algorithm: record.algorithm, contentHash, contextHash: proof.contextHash,
        purpose, issuedAt: proof.issuedAt, expiresAt: proof.expiresAt,
        mac: proof.mac });
    return freeze({ cryptographicValid,
      valid: cryptographicValid && at >= proof.issuedAt && at < proof.expiresAt,
      expired: at >= proof.expiresAt, currentKeyState: record.state,
      trainingTruth: false });
  }

  async function encrypt(input = {}) {
    assertNoSecrets(input);
    const kind = keyKind(input.keyKind || "private_payload_encryption");
    if (!new Set(["private_payload_encryption", "quarantine_encryption"]).has(kind)) {
      throw new Error("KEY_KIND_CANNOT_ENCRYPT");
    }
    const record = active(input.logicalKeyId, kind);
    const purpose = cryptoPurpose(input.purpose);
    const context = normalizedContext(input.context, purpose);
    const aad = Buffer.from(canonicalStarcraftTmgJson(context), "utf8");
    const plaintext = Buffer.from(canonicalStarcraftTmgJson(input.value), "utf8");
    try {
      return await port.withGeneratedDataKey({ keyRef: record.keyRef,
        contextHash: hashStarcraftTmgContract(context), purpose },
      async ({ plaintextDataKey, wrappedDataKey }) => {
        const key = Buffer.from(plaintextDataKey);
        if (key.length !== 32) throw new Error("KMS_DATA_KEY_INVALID");
        const iv = randomBytes(12);
        try {
          const cipher = createCipheriv("aes-256-gcm", key, iv);
          cipher.setAAD(aad);
          const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
          const body = {
            schemaVersion: `${STARCRAFT_TMG_KEY_CONTROL_VERSION}.envelope`,
            keyRef: record.keyRef, keyVersion: record.keyVersion,
            keyKind: record.keyKind, algorithm: record.algorithm,
            purpose, context, contextHash: hashStarcraftTmgContract(context),
            wrappedDataKey: id(wrappedDataKey, "wrappedDataKey"),
            iv: b64(iv), authTag: b64(cipher.getAuthTag()),
            ciphertext: b64(ciphertext), plaintextPersisted: false,
            byok: false, trainingTruth: false,
          };
          return freeze({ ...body, envelopeHash: hashStarcraftTmgContract(body) });
        } finally { key.fill(0); }
      });
    } finally { plaintext.fill(0); }
  }

  async function decrypt(input = {}) {
    const envelope = input.envelope;
    const record = resolve(envelope?.keyRef);
    if (record.state === "revoked") throw new Error("KEY_REVOKED");
    const { envelopeHash, ...body } = clone(envelope || {});
    if (hashStarcraftTmgContract(body) !== envelopeHash
      || record.keyVersion !== envelope.keyVersion
      || record.keyKind !== envelope.keyKind) throw new Error("ENVELOPE_INVALID");
    const purpose = cryptoPurpose(envelope.purpose);
    const context = normalizedContext(input.context, purpose);
    if (hashStarcraftTmgContract(context) !== envelope.contextHash) {
      throw new Error("ENVELOPE_CONTEXT_MISMATCH");
    }
    const aad = Buffer.from(canonicalStarcraftTmgJson(context), "utf8");
    return port.withUnwrappedDataKey({ keyRef: record.keyRef,
      wrappedDataKey: envelope.wrappedDataKey,
      contextHash: envelope.contextHash, purpose: envelope.purpose },
    async (plaintextDataKey) => {
      const key = Buffer.from(plaintextDataKey);
      if (key.length !== 32) throw new Error("KMS_DATA_KEY_INVALID");
      try {
        const decipher = createDecipheriv("aes-256-gcm", key,
          Buffer.from(envelope.iv, "base64url"));
        decipher.setAAD(aad);
        decipher.setAuthTag(Buffer.from(envelope.authTag, "base64url"));
        const plaintext = Buffer.concat([
          decipher.update(Buffer.from(envelope.ciphertext, "base64url")),
          decipher.final(),
        ]);
        try { return JSON.parse(plaintext.toString("utf8")); }
        finally { plaintext.fill(0); }
      } finally { key.fill(0); }
    });
  }

  return freeze({
    version: STARCRAFT_TMG_KEY_CONTROL_VERSION,
    providerDescriptor: clone(port.descriptor),
    snapshot, rotate, revoke, sign, verifySignature, seal, verifySeal,
    encrypt, decrypt,
  });
}
