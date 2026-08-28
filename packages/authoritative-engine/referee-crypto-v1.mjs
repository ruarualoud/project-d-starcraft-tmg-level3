import {
  createHash,
  createHmac,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  KeyObject,
  randomBytes,
  sign as signBytes,
  timingSafeEqual,
  verify as verifyBytes,
} from "node:crypto";

export const STARCRAFT_TMG_CANONICALIZATION = "RFC8785";
export const STARCRAFT_TMG_HASH_ALGORITHM = "sha256";
export const STARCRAFT_TMG_SIGNATURE_ALGORITHM = "ed25519";
export const STARCRAFT_TMG_SEAL_ALGORITHM = "hmac-sha256";

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeCanonical(value, path = "$") {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${path} contains a non-finite number`);
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) => {
      if (entry === undefined || typeof entry === "function" || typeof entry === "symbol" || typeof entry === "bigint") {
        throw new TypeError(`${path}[${index}] is not representable by RFC 8785 JSON`);
      }
      return normalizeCanonical(entry, `${path}[${index}]`);
    });
  }
  if (object(value)) {
    const result = {};
    for (const key of Object.keys(value).sort()) {
      const entry = value[key];
      if (entry === undefined) continue;
      if (typeof entry === "function" || typeof entry === "symbol" || typeof entry === "bigint") {
        throw new TypeError(`${path}.${key} is not representable by RFC 8785 JSON`);
      }
      result[key] = normalizeCanonical(entry, `${path}.${key}`);
    }
    return result;
  }
  throw new TypeError(`${path} is not representable by RFC 8785 JSON`);
}

export function canonicalStarcraftTmgJson(value) {
  return JSON.stringify(normalizeCanonical(value));
}

export function hashStarcraftTmgContract(value) {
  return createHash(STARCRAFT_TMG_HASH_ALGORITHM)
    .update(canonicalStarcraftTmgJson(value), "utf8")
    .digest("hex");
}

function normalizedSecret(secret) {
  if (Buffer.isBuffer(secret)) return Buffer.from(secret);
  if (secret instanceof Uint8Array) return Buffer.from(secret);
  if (typeof secret === "string" && secret.trim()) return Buffer.from(secret, "utf8");
  return randomBytes(32);
}

function normalizedKeyPair(options) {
  if (!options.privateKey && !options.publicKey) return generateKeyPairSync("ed25519");
  if (!options.privateKey) throw new Error("privateKey is required for referee signing");
  const privateKey = options.privateKey instanceof KeyObject ? options.privateKey : createPrivateKey(options.privateKey);
  const publicKey = options.publicKey instanceof KeyObject
    ? options.publicKey
    : options.publicKey
      ? createPublicKey(options.publicKey)
      : createPublicKey(privateKey);
  if (privateKey.type !== "private" || publicKey.type !== "public") throw new Error("referee Ed25519 key types are invalid");
  return { privateKey, publicKey };
}

function safeEqualBase64Url(left, right) {
  try {
    const a = Buffer.from(String(left || ""), "base64url");
    const b = Buffer.from(String(right || ""), "base64url");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function createStarcraftTmgRefereeCrypto(options = {}) {
  const keys = normalizedKeyPair(options);
  const hmacSecret = normalizedSecret(options.hmacSecret);
  const publicKeyDer = keys.publicKey.export({ type: "spki", format: "der" });
  const publicKeyFingerprint = createHash("sha256").update(publicKeyDer).digest("hex");
  const keyId = String(options.keyId || `sc-referee-${publicKeyFingerprint.slice(0, 20)}`);
  const trustLevel = String(options.trustLevel || (options.privateKey ? "externally_managed" : "development_ephemeral"));

  function signingPayload(purpose, contentHash) {
    return Buffer.from(canonicalStarcraftTmgJson({
      schemaVersion: "starcraft_tmg_referee_signature_payload_v1",
      purpose,
      keyId,
      canonicalization: STARCRAFT_TMG_CANONICALIZATION,
      hashAlgorithm: STARCRAFT_TMG_HASH_ALGORITHM,
      contentHash,
    }), "utf8");
  }

  function sign(value, purpose) {
    const normalizedPurpose = String(purpose || "artifact");
    const contentHash = hashStarcraftTmgContract(value);
    const signature = signBytes(null, signingPayload(normalizedPurpose, contentHash), keys.privateKey)
      .toString("base64url");
    return Object.freeze({
      schemaVersion: "starcraft_tmg_referee_signature_v1",
      purpose: normalizedPurpose,
      keyId,
      canonicalization: STARCRAFT_TMG_CANONICALIZATION,
      hashAlgorithm: STARCRAFT_TMG_HASH_ALGORITHM,
      signatureAlgorithm: STARCRAFT_TMG_SIGNATURE_ALGORITHM,
      contentHash,
      signature,
    });
  }

  function verify(value, proof, expectedPurpose) {
    if (!object(proof)
      || proof.schemaVersion !== "starcraft_tmg_referee_signature_v1"
      || proof.keyId !== keyId
      || proof.purpose !== String(expectedPurpose || proof.purpose || "")
      || proof.canonicalization !== STARCRAFT_TMG_CANONICALIZATION
      || proof.hashAlgorithm !== STARCRAFT_TMG_HASH_ALGORITHM
      || proof.signatureAlgorithm !== STARCRAFT_TMG_SIGNATURE_ALGORITHM
      || proof.contentHash !== hashStarcraftTmgContract(value)) return false;
    try {
      return verifyBytes(
        null,
        signingPayload(proof.purpose, proof.contentHash),
        keys.publicKey,
        Buffer.from(proof.signature, "base64url"),
      );
    } catch {
      return false;
    }
  }

  function seal(value, purpose) {
    const normalizedPurpose = String(purpose || "short_lived_artifact");
    const contentHash = hashStarcraftTmgContract(value);
    const macPayload = canonicalStarcraftTmgJson({
      schemaVersion: "starcraft_tmg_referee_seal_payload_v1",
      purpose: normalizedPurpose,
      keyId,
      contentHash,
    });
    const mac = createHmac("sha256", hmacSecret).update(macPayload, "utf8").digest("base64url");
    return Object.freeze({
      schemaVersion: "starcraft_tmg_referee_seal_v1",
      purpose: normalizedPurpose,
      keyId,
      hashAlgorithm: STARCRAFT_TMG_HASH_ALGORITHM,
      sealAlgorithm: STARCRAFT_TMG_SEAL_ALGORITHM,
      contentHash,
      mac,
    });
  }

  function verifySeal(value, proof, expectedPurpose) {
    if (!object(proof)
      || proof.schemaVersion !== "starcraft_tmg_referee_seal_v1"
      || proof.keyId !== keyId
      || proof.purpose !== String(expectedPurpose || proof.purpose || "")
      || proof.hashAlgorithm !== STARCRAFT_TMG_HASH_ALGORITHM
      || proof.sealAlgorithm !== STARCRAFT_TMG_SEAL_ALGORITHM
      || proof.contentHash !== hashStarcraftTmgContract(value)) return false;
    const expected = seal(value, proof.purpose);
    return safeEqualBase64Url(proof.mac, expected.mac);
  }

  return Object.freeze({
    descriptor: Object.freeze({
      schemaVersion: "starcraft_tmg_referee_key_descriptor_v1",
      keyId,
      trustLevel,
      publicKeyFingerprint,
      publicKeySpkiBase64: publicKeyDer.toString("base64"),
      signatureAlgorithm: STARCRAFT_TMG_SIGNATURE_ALGORITHM,
      sealAlgorithm: STARCRAFT_TMG_SEAL_ALGORITHM,
      canonicalization: STARCRAFT_TMG_CANONICALIZATION,
      hashAlgorithm: STARCRAFT_TMG_HASH_ALGORITHM,
      productionReady: trustLevel !== "development_ephemeral",
    }),
    sign,
    verify,
    seal,
    verifySeal,
  });
}
