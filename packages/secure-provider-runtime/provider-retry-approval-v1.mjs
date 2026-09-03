import {
  hashStarcraftTmgContract,
} from "../authoritative-engine/referee-crypto-v1.mjs";
import {
  StarcraftTmgProviderAttemptStoreError,
  cloneProviderAttemptValue,
  deepFreezeProviderAttemptValue,
} from "./provider-attempt-store-contract-v1.mjs";

export const STARCRAFT_TMG_PROVIDER_RETRY_APPROVAL_VERSION =
  "starcraft_tmg_provider_retry_approval_v1";
export const STARCRAFT_TMG_PROVIDER_RETRY_APPROVAL_PURPOSE =
  "provider_ambiguous_retry_approval";

const HASH = /^[a-f0-9]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9._:@/+\-]{1,240}$/u;
const ISSUE_FIELDS = new Set([
  "budgetId",
  "attemptId",
  "principalScopeHash",
  "sessionBindingHash",
  "reservationIdempotencyKeyHash",
  "explicitSameUserApproval",
]);
const CONTENT_FIELDS = new Set([
  "schemaVersion",
  "approvalId",
  "budgetId",
  "attemptId",
  "principalScopeHash",
  "sessionBindingHash",
  "reservationIdempotencyKeyHash",
  "sameUserVerified",
  "oneRetryOnly",
  "automaticRetryAllowed",
  "issuedAt",
  "expiresAt",
  "trainingTruth",
]);
const RECEIPT_FIELDS = new Set([
  "content",
  "receiptHash",
  "refereeSignature",
  "shortSeal",
]);
const SIGNATURE_FIELDS = new Set([
  "schemaVersion",
  "purpose",
  "keyId",
  "canonicalization",
  "hashAlgorithm",
  "signatureAlgorithm",
  "contentHash",
  "signature",
]);
const SEAL_FIELDS = new Set([
  "schemaVersion",
  "purpose",
  "keyId",
  "hashAlgorithm",
  "sealAlgorithm",
  "contentHash",
  "mac",
]);

function fail(code, detail = "") {
  throw new StarcraftTmgProviderAttemptStoreError(code, detail);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function exactFields(value, allowed, code) {
  if (!object(value)) fail(code);
  const extras = Object.keys(value).filter((field) => !allowed.has(field)).sort();
  if (extras.length) fail(code, extras.join(","));
}

function safeId(value, field) {
  const result = String(value || "").trim();
  if (!SAFE_ID.test(result)) fail("PROVIDER_RETRY_APPROVAL_ID_INVALID", field);
  return result;
}

function hash(value, field) {
  const result = String(value || "").trim().toLowerCase();
  if (!HASH.test(result)) fail("PROVIDER_RETRY_APPROVAL_HASH_INVALID", field);
  return result;
}

function isoInstant(value, field) {
  let result;
  try { result = new Date(value).toISOString(); } catch {
    fail("PROVIDER_RETRY_APPROVAL_TIME_INVALID", field);
  }
  if (result !== value) fail("PROVIDER_RETRY_APPROVAL_TIME_INVALID", field);
  return result;
}

function freeze(value) {
  return deepFreezeProviderAttemptValue(cloneProviderAttemptValue(value));
}

function normalizeExpected(input = {}) {
  return {
    budgetId: safeId(input.budgetId, "budgetId"),
    attemptId: safeId(input.attemptId, "attemptId"),
    principalScopeHash: hash(input.principalScopeHash, "principalScopeHash"),
    sessionBindingHash: hash(input.sessionBindingHash, "sessionBindingHash"),
    reservationIdempotencyKeyHash: hash(input.reservationIdempotencyKeyHash,
      "reservationIdempotencyKeyHash"),
  };
}

function assertCrypto(crypto) {
  for (const method of ["sign", "verify", "seal", "verifySeal"]) {
    if (typeof crypto?.[method] !== "function") {
      throw new TypeError(`Provider retry approval requires refereeCrypto.${method}()`);
    }
  }
  return crypto;
}

export function createStarcraftTmgProviderRetryApprovalAuthorityV1(options = {}) {
  const crypto = assertCrypto(options.refereeCrypto);
  const now = typeof options.now === "function"
    ? options.now : () => new Date().toISOString();
  const ttlMs = Number(options.ttlMs ?? 120_000);
  if (!Number.isSafeInteger(ttlMs) || ttlMs < 1_000 || ttlMs > 300_000) {
    throw new TypeError("Provider retry approval ttlMs must be 1000..300000");
  }

  function issueApproval(input = {}) {
    exactFields(input, ISSUE_FIELDS, "PROVIDER_RETRY_APPROVAL_FIELDS_INVALID");
    if (input.explicitSameUserApproval !== true) {
      fail("PROVIDER_RETRY_EXPLICIT_SAME_USER_APPROVAL_REQUIRED");
    }
    const expected = normalizeExpected(input);
    const issuedAt = isoInstant(now(), "issuedAt");
    const approvalIdentityHash = hashStarcraftTmgContract({ ...expected, issuedAt });
    const content = freeze({
      schemaVersion: `${STARCRAFT_TMG_PROVIDER_RETRY_APPROVAL_VERSION}.content`,
      approvalId: `sc-provider-retry-approval-${approvalIdentityHash}`,
      ...expected,
      sameUserVerified: true,
      oneRetryOnly: true,
      automaticRetryAllowed: false,
      issuedAt,
      expiresAt: new Date(Date.parse(issuedAt) + ttlMs).toISOString(),
      trainingTruth: false,
    });
    return freeze({
      content,
      receiptHash: hashStarcraftTmgContract(content),
      refereeSignature: crypto.sign(content, STARCRAFT_TMG_PROVIDER_RETRY_APPROVAL_PURPOSE),
      shortSeal: crypto.seal(content, STARCRAFT_TMG_PROVIDER_RETRY_APPROVAL_PURPOSE),
    });
  }

  function normalizeReceipt(receipt) {
    exactFields(receipt, RECEIPT_FIELDS, "PROVIDER_RETRY_APPROVAL_RECEIPT_FIELDS_INVALID");
    exactFields(receipt.content, CONTENT_FIELDS,
      "PROVIDER_RETRY_APPROVAL_CONTENT_FIELDS_INVALID");
    exactFields(receipt.refereeSignature, SIGNATURE_FIELDS,
      "PROVIDER_RETRY_APPROVAL_SIGNATURE_FIELDS_INVALID");
    exactFields(receipt.shortSeal, SEAL_FIELDS,
      "PROVIDER_RETRY_APPROVAL_SEAL_FIELDS_INVALID");
    const content = {
      schemaVersion: String(receipt.content.schemaVersion || ""),
      approvalId: safeId(receipt.content.approvalId, "content.approvalId"),
      ...normalizeExpected(receipt.content),
      sameUserVerified: receipt.content.sameUserVerified,
      oneRetryOnly: receipt.content.oneRetryOnly,
      automaticRetryAllowed: receipt.content.automaticRetryAllowed,
      issuedAt: isoInstant(receipt.content.issuedAt, "content.issuedAt"),
      expiresAt: isoInstant(receipt.content.expiresAt, "content.expiresAt"),
      trainingTruth: receipt.content.trainingTruth,
    };
    if (content.schemaVersion !== `${STARCRAFT_TMG_PROVIDER_RETRY_APPROVAL_VERSION}.content`
      || content.sameUserVerified !== true
      || content.oneRetryOnly !== true
      || content.automaticRetryAllowed !== false
      || content.trainingTruth !== false
      || Date.parse(content.expiresAt) <= Date.parse(content.issuedAt)) {
      fail("PROVIDER_RETRY_APPROVAL_CONTENT_INVALID");
    }
    const receiptHash = hash(receipt.receiptHash, "receiptHash");
    if (receiptHash !== hashStarcraftTmgContract(content)) {
      fail("PROVIDER_RETRY_APPROVAL_CONTENT_HASH_MISMATCH");
    }
    return { content: freeze(content), receiptHash };
  }

  function verifyHistoricalApproval(receipt, expectedInput = {}) {
    const expected = normalizeExpected(expectedInput);
    const normalized = normalizeReceipt(receipt);
    for (const [field, value] of Object.entries(expected)) {
      if (normalized.content[field] !== value) {
        fail("PROVIDER_RETRY_APPROVAL_BINDING_MISMATCH", field);
      }
    }
    if (!crypto.verify(normalized.content, receipt.refereeSignature,
      STARCRAFT_TMG_PROVIDER_RETRY_APPROVAL_PURPOSE)) {
      fail("PROVIDER_RETRY_APPROVAL_SIGNATURE_INVALID");
    }
    return freeze({
      ok: true,
      historical: true,
      receiptHash: normalized.receiptHash,
      approvalId: normalized.content.approvalId,
      trainingTruth: false,
    });
  }

  function verifyApproval(receipt, expectedInput = {}) {
    const historical = verifyHistoricalApproval(receipt, expectedInput);
    const observedAt = isoInstant(now(), "observedAt");
    if (observedAt < receipt.content.issuedAt || observedAt >= receipt.content.expiresAt) {
      fail("PROVIDER_RETRY_APPROVAL_EXPIRED");
    }
    if (!crypto.verifySeal(receipt.content, receipt.shortSeal,
      STARCRAFT_TMG_PROVIDER_RETRY_APPROVAL_PURPOSE)) {
      fail("PROVIDER_RETRY_APPROVAL_SHORT_SEAL_INVALID");
    }
    return freeze({
      ...historical,
      historical: false,
      observedAt,
      expiresAt: receipt.content.expiresAt,
    });
  }

  return Object.freeze({
    issueApproval,
    verifyApproval,
    verifyHistoricalApproval,
  });
}
