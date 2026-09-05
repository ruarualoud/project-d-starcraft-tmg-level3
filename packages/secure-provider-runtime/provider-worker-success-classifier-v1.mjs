import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { containsStarcraftTmgOnlineCredentialMaterialV1 } from
  "../online-agent-session/portable-credential-material-v1.mjs";
import {
  StarcraftTmgProviderEgressError,
} from "./provider-egress-contract-v1.mjs";

export const STARCRAFT_TMG_PROVIDER_WORKER_SUCCESS_CLASSIFIER_VERSION =
  "starcraft_tmg_provider_worker_success_classifier_v1";

const HASH = /^[a-f0-9]{64}$/u;
const MODEL = /^[A-Za-z0-9._:/-]{1,240}$/u;
const REF_FIELDS = new Set(["id", "version", "hash"]);
const SUCCESS_FIELDS = new Set(["output", "usageReceipt"]);
const RECEIPT_FIELDS = new Set([
  "schemaVersion", "requestId", "providerProfileRef", "egressPolicyHash",
  "providerId", "requestedModel", "reportedModel", "providerRequestIdHash",
  "providerSystemFingerprintHash", "status", "usage", "responseFingerprint",
  "dnsAddressSetHash", "tlsServerName",
  "tlsCertificateVerificationDisabled", "redirectFollowed", "proxyUsed",
  "physicalAttempts", "automaticRetries", "startedAt", "finishedAt",
  "trainingTruth", "receiptHash", "responseNormalization",
]);
const USAGE_FIELDS = new Set([
  "inputUnits", "outputUnits", "totalUnits", "inputCacheHitUnits",
  "inputCacheMissUnits", "reasoningOutputUnits",
]);

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function exactFields(value, allowed) {
  return object(value) && Object.keys(value).every((key) => allowed.has(key));
}

function fail(code) {
  throw new StarcraftTmgProviderEgressError(code, {
    requestMayHaveBeenSent: true,
    physicalAttempts: 1,
  });
}

export function assertStarcraftTmgProviderWorkerSuccessV1(
  value,
  input = {},
) {
  const receipt = value?.usageReceipt;
  const usage = receipt?.usage;
  const binding = input.egressBinding;
  if (!exactFields(value, SUCCESS_FIELDS)
    || !object(value.output)
    || !exactFields(receipt, RECEIPT_FIELDS)
    || !exactFields(receipt?.providerProfileRef, REF_FIELDS)
    || !exactFields(usage, USAGE_FIELDS)) {
    fail("PROVIDER_SUCCESS_SHAPE_REJECTED");
  }
  if (Buffer.byteLength(JSON.stringify(value.output), "utf8")
      > Number(input.maxOutputBytes || 256 * 1024)) {
    fail("PROVIDER_SUCCESS_OUTPUT_SIZE_REJECTED");
  }
  const { receiptHash, ...receiptBody } = receipt;
  if (!HASH.test(String(receiptHash || ""))
    || receiptHash !== hashStarcraftTmgContract(receiptBody)) {
    fail("PROVIDER_SUCCESS_RECEIPT_HASH_REJECTED");
  }
  if (receipt.requestId !== input.providerRequestId) {
    fail("PROVIDER_SUCCESS_REQUEST_BINDING_REJECTED");
  }
  if (receipt.providerProfileRef?.hash !== binding.providerProfileRef.hash
    || receipt.providerProfileRef?.id !== binding.providerProfileRef.id
    || receipt.providerProfileRef?.version !== binding.providerProfileRef.version
    || receipt.egressPolicyHash !== binding.policyHash
    || !HASH.test(String(receipt.egressPolicyHash || ""))) {
    fail("PROVIDER_SUCCESS_PROFILE_BINDING_REJECTED");
  }
  if (receipt.providerId !== binding.providerId
    || receipt.requestedModel !== binding.model
    || !(receipt.reportedModel === null
      || MODEL.test(String(receipt.reportedModel || "")))
    || !(receipt.providerRequestIdHash === null
      || HASH.test(String(receipt.providerRequestIdHash || "")))
    || !(receipt.providerSystemFingerprintHash === undefined
      || HASH.test(String(receipt.providerSystemFingerprintHash || "")))) {
    fail("PROVIDER_SUCCESS_PROVIDER_IDENTITY_REJECTED");
  }
  const cacheBreakdownPresent = usage.inputCacheHitUnits !== undefined
    || usage.inputCacheMissUnits !== undefined;
  if (![usage.inputUnits, usage.outputUnits, usage.totalUnits]
    .every((entry) => Number.isSafeInteger(entry) && entry >= 0)
    || usage.totalUnits < usage.inputUnits + usage.outputUnits
    || cacheBreakdownPresent && (!Number.isSafeInteger(usage.inputCacheHitUnits)
      || usage.inputCacheHitUnits < 0
      || !Number.isSafeInteger(usage.inputCacheMissUnits)
      || usage.inputCacheMissUnits < 0
      || usage.inputCacheHitUnits + usage.inputCacheMissUnits
        !== usage.inputUnits)
    || usage.reasoningOutputUnits !== undefined
      && (!Number.isSafeInteger(usage.reasoningOutputUnits)
        || usage.reasoningOutputUnits < 0
        || usage.reasoningOutputUnits > usage.outputUnits)) {
    fail("PROVIDER_SUCCESS_USAGE_REJECTED");
  }
  if (!HASH.test(String(receipt.responseFingerprint || ""))
    || !HASH.test(String(receipt.dnsAddressSetHash || ""))
    || receipt.tlsServerName !== binding.endpoint.hostname
    || receipt.tlsCertificateVerificationDisabled !== false
    || receipt.redirectFollowed !== false
    || receipt.proxyUsed !== false) {
    fail("PROVIDER_SUCCESS_NETWORK_PROOF_REJECTED");
  }
  if (!Number.isInteger(receipt.status)
    || receipt.status < 200 || receipt.status >= 300
    || receipt.physicalAttempts !== 1
    || receipt.automaticRetries !== 0
    || !Number.isFinite(Date.parse(receipt.startedAt))
    || !Number.isFinite(Date.parse(receipt.finishedAt))) {
    fail("PROVIDER_SUCCESS_ATTEMPT_PROOF_REJECTED");
  }
  if (receipt.trainingTruth !== false
    || receipt.responseNormalization !== undefined && !["none", "single_json_fence", "outer_object_close", "single_json_fence_and_outer_object_close"].includes(receipt.responseNormalization)
    || containsStarcraftTmgOnlineCredentialMaterialV1(value)) {
    fail("PROVIDER_SUCCESS_SAFETY_REJECTED");
  }
  return true;
}
