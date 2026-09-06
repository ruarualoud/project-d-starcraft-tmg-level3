import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { seal, verifySeal } from "../skill-production/common.mjs";
import {
  normalizeStarcraftTmgOutputContractRefV1,
  outputContractRefStarcraftTmgV1,
} from "./output-contract-registry-v1.mjs";

export const STARCRAFT_TMG_STRUCTURED_GENERATION_RUNTIME_VERSION =
  "starcraft_tmg_structured_generation_runtime_v1";

const HASH = /^[a-f0-9]{64}$/u;
const ID = /^[A-Za-z0-9._:-]{1,200}$/u;
const REF_FIELDS = new Set(["id", "version", "hash"]);
const INPUT_FIELDS = new Set([
  "roleRef", "contextManifestRef", "outputContractRef", "executionPolicyRef",
  "continuationRef",
]);
const STATUSES = new Set(["accepted", "quarantined", "retryable", "stopped"]);

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function exactFields(value, allowed, label) {
  if (!object(value) || Object.keys(value).some((key) => !allowed.has(key))) {
    throw new TypeError(`${label} contains invalid fields`);
  }
}

function ref(value, field) {
  exactFields(value, REF_FIELDS, field);
  const normalized = {
    id: String(value.id || ""),
    version: String(value.version || ""),
    hash: String(value.hash || "").toLowerCase(),
  };
  if (!ID.test(normalized.id) || !ID.test(normalized.version)
    || !HASH.test(normalized.hash)) throw new TypeError(`${field} is invalid`);
  return freeze(normalized);
}

function nonNegativeInteger(value, field) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 0) {
    throw new TypeError(`${field} is invalid`);
  }
  return normalized;
}

function positiveInteger(value, field) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1) {
    throw new TypeError(`${field} is invalid`);
  }
  return normalized;
}

function resolveOrThrow(resolver, reference, label) {
  const result = resolver.resolve(reference);
  if (!object(result) || result.ok !== true) {
    const error = new Error(`${label.toUpperCase()}_NOT_FOUND`);
    error.code = `${label.toUpperCase()}_NOT_FOUND`;
    throw error;
  }
  return result;
}

function normalizedUsage(value = null, estimatedCnyMicros = 0) {
  const inputUnits = nonNegativeInteger(value?.inputUnits || 0, "usage.inputUnits");
  const outputUnits = nonNegativeInteger(value?.outputUnits || 0, "usage.outputUnits");
  const totalUnits = nonNegativeInteger(value?.totalUnits
    ?? inputUnits + outputUnits, "usage.totalUnits");
  if (totalUnits < inputUnits + outputUnits) {
    throw new TypeError("usage.totalUnits is invalid");
  }
  const cacheHit = nonNegativeInteger(value?.inputCacheHitUnits || 0,
    "usage.inputCacheHitUnits");
  const cacheMiss = nonNegativeInteger(value?.inputCacheMissUnits
    ?? Math.max(0, inputUnits - cacheHit), "usage.inputCacheMissUnits");
  if (cacheHit + cacheMiss !== inputUnits) {
    throw new TypeError("usage cache split is invalid");
  }
  return freeze({ input: inputUnits, output: outputUnits,
    total: totalUnits, cacheHit, cacheMiss,
    estimatedCny: nonNegativeInteger(estimatedCnyMicros,
      "usage.estimatedCnyMicros") / 1_000_000 });
}

function outcome(value) {
  if (!STATUSES.has(value.status)) throw new TypeError("Runtime status is invalid");
  return freeze({
    status: value.status,
    candidateRef: value.candidateRef || null,
    issueRef: value.issueRef || null,
    receiptRef: value.receiptRef,
    usage: value.usage,
  });
}

export function createStarcraftTmgStructuredGenerationRuntimeV1(options = {}) {
  const outputContracts = options.outputContractRegistry;
  const contexts = options.contextManifestRegistry;
  const policies = options.executionPolicyRegistry;
  const capabilities = options.capabilityReceiptRegistry;
  const adapter = options.providerAdapter;
  const store = options.store;
  const binding = options.egressBinding;
  const price = options.priceUsage;
  const classify = options.classifyFailure;
  if (typeof outputContracts?.resolve !== "function"
    || typeof contexts?.resolve !== "function"
    || typeof policies?.resolve !== "function"
    || typeof capabilities?.resolve !== "function"
    || typeof adapter?.complete !== "function"
    || !store || ["reserve", "settle", "acquire", "finish", "artifact"]
      .some((method) => typeof store[method] !== "function")
    || typeof price !== "function" || typeof classify !== "function") {
    throw new TypeError("Structured Generation Runtime dependencies are invalid");
  }

  function metadata() {
    return freeze({
      schemaVersion: `${STARCRAFT_TMG_STRUCTURED_GENERATION_RUNTIME_VERSION}.metadata`,
      operation: "generateStructured",
      externalOperations: ["generateStructured"],
      providerDialectHiddenFromCaller: true,
      onePhysicalAttemptPerInvocation: true,
      fullContextFormatRetryAllowed: false,
      rawModelControlFieldsAllowed: false,
      trainingTruth: false,
    });
  }

  async function generateStructured(input = {}) {
    exactFields(input, INPUT_FIELDS, "generateStructured input");
    const roleReference = ref(input.roleRef, "roleRef");
    const contextReference = ref(input.contextManifestRef,
      "contextManifestRef");
    const outputReference = normalizeStarcraftTmgOutputContractRefV1(
      input.outputContractRef);
    const policyReference = ref(input.executionPolicyRef,
      "executionPolicyRef");
    const continuationReference = input.continuationRef === null
      ? null : ref(input.continuationRef, "continuationRef");
    const contractResolved = resolveOrThrow(outputContracts,
      { outputContractRef: outputReference }, "output_contract");
    const contract = contractResolved.outputContract;
    if (hashStarcraftTmgContract(outputContractRefStarcraftTmgV1(contract))
      !== hashStarcraftTmgContract(outputReference)) {
      const error = new Error("CONTRACT_CHAIN_DRIFT");
      error.code = "CONTRACT_CHAIN_DRIFT";
      throw error;
    }
    const contextResolved = resolveOrThrow(contexts, {
      contextManifestRef: contextReference,
      roleRef: roleReference,
      continuationRef: continuationReference,
      outputContractRef: outputReference,
    }, "context_manifest");
    const policyResolved = resolveOrThrow(policies, {
      executionPolicyRef: policyReference,
      roleRef: roleReference,
      outputContractRef: outputReference,
    }, "execution_policy");
    const policy = policyResolved.executionPolicy;
    const capabilityResolved = resolveOrThrow(capabilities, {
      providerProfileRef: binding.providerProfileRef,
      outputContractRef: outputReference,
      capability: "responses_json_schema",
    }, "capability_receipt");
    const capabilityReceipt = capabilityResolved.capabilityReceipt;
    const invocationBody = {
      schemaVersion: `${STARCRAFT_TMG_STRUCTURED_GENERATION_RUNTIME_VERSION}.invocation`,
      roleRef: roleReference,
      contextManifestRef: contextReference,
      outputContractRef: outputReference,
      executionPolicyRef: policyReference,
      continuationRef: continuationReference,
      contextPayloadHash: hashStarcraftTmgContract({
        instructions: contextResolved.instructions,
        input: contextResolved.input,
      }),
      capabilityReceiptHash: capabilityReceipt.receiptHash,
      trainingTruth: false,
    };
    const invocationHash = hashStarcraftTmgContract(invocationBody);
    const attemptId = `structured-${invocationHash.slice(0, 48)}`;
    const providerRequest = {
      schemaVersion: "starcraft_tmg_structured_provider_request_v1",
      requestId: attemptId,
      roleRef: roleReference,
      instructions: contextResolved.instructions,
      input: contextResolved.input,
      outputContractRef: outputReference,
      maxOutputUnits: positiveInteger(policy.maxOutputUnits,
        "executionPolicy.maxOutputUnits"),
    };
    const estimateMicros = positiveInteger(policy.attemptEstimateMicros,
      "executionPolicy.attemptEstimateMicros");
    const tokenReserve = positiveInteger(policy.attemptTokenReserve,
      "executionPolicy.attemptTokenReserve");
    const reservation = store.reserve(attemptId, providerRequest,
      estimateMicros, tokenReserve);
    let response;
    if (reservation.cached) {
      response = reservation.response;
    } else if (reservation.failed) {
      const error = new Error(reservation.code || "STRUCTURED_ATTEMPT_FAILED");
      error.code = reservation.code || "STRUCTURED_ATTEMPT_FAILED";
      throw error;
    } else {
      try {
        response = await adapter.complete({
          egressBinding: binding,
          capabilityReceipt,
          outputContract: contract,
          providerRequest,
        });
        const costMicros = nonNegativeInteger(price(
          response.usageReceipt.usage, response.usageReceipt),
        "priced usage");
        store.settle(attemptId, { usage: response.usageReceipt.usage,
          costMicros, response });
      } catch (error) {
        const safeReceipt = object(error?.safeReceipt)
          ? error.safeReceipt : null;
        const knownUsage = safeReceipt?.usageKnown === true
          ? safeReceipt.usage : null;
        const costMicros = knownUsage ? nonNegativeInteger(
          price(knownUsage, safeReceipt), "priced failure usage") : null;
        const definitelyNotSent = safeReceipt?.requestDefinitelyNotSent === true;
        store.settle(attemptId, {
          usage: knownUsage,
          costMicros,
          failureReceipt: safeReceipt,
          code: error.code || "STRUCTURED_PROVIDER_FAILURE_UNKNOWN",
          definitelyNotSent,
        });
        const classification = classify({ error, safeReceipt,
          invocation: invocationBody, policy });
        if (!object(classification) || !STATUSES.has(classification.status)
          || classification.status === "accepted") {
          throw new TypeError("Structured failure classification is invalid");
        }
        const issue = seal({
          version: `${STARCRAFT_TMG_STRUCTURED_GENERATION_RUNTIME_VERSION}.issue`,
          invocationHash,
          outputContractRef: outputReference,
          class: String(classification.class || "unclassified"),
          code: String(error.code || "STRUCTURED_PROVIDER_FAILURE_UNKNOWN"),
          retryRoute: classification.retryRoute || null,
          safeReceiptHash: safeReceipt?.receiptHash || null,
          rawPayloadPersisted: false,
          trainingTruth: false,
        });
        const issueLease = store.acquire(`${attemptId}.issue`, {
          issueHash: issue.hash,
        });
        const storedIssue = issueLease.cached ? issueLease.artifact
          : store.finish(issueLease, issue);
        const runtimeReceipt = seal({
          version: `${STARCRAFT_TMG_STRUCTURED_GENERATION_RUNTIME_VERSION}.receipt`,
          invocationHash,
          attemptId,
          outputContractRef: outputReference,
          status: classification.status,
          candidateHash: null,
          issueHash: storedIssue.hash,
          providerAttempts: definitelyNotSent ? 0 : 1,
          automaticRetries: 0,
          acceptanceScope: "none",
          trainingTruth: false,
        });
        const receiptLease = store.acquire(`${attemptId}.runtime-receipt`, {
          receiptHash: runtimeReceipt.hash,
        });
        const storedReceipt = receiptLease.cached ? receiptLease.artifact
          : store.finish(receiptLease, runtimeReceipt);
        return outcome({
          status: classification.status,
          candidateRef: null,
          issueRef: { hash: storedIssue.hash, class: storedIssue.class },
          receiptRef: { hash: storedReceipt.hash },
          usage: normalizedUsage(knownUsage, costMicros || 0),
        });
      }
    }
    const responseContractRef = response.usageReceipt.outputContractRef;
    if (hashStarcraftTmgContract(responseContractRef)
      !== hashStarcraftTmgContract(outputReference)
      || response.localValidationReceipt.outputContractRef.hash
        !== outputReference.hash) {
      const error = new Error("CONTRACT_CHAIN_DRIFT");
      error.code = "CONTRACT_CHAIN_DRIFT";
      throw error;
    }
    const candidate = seal({
      version: `${STARCRAFT_TMG_STRUCTURED_GENERATION_RUNTIME_VERSION}.candidate`,
      invocationHash,
      roleRef: roleReference,
      contextManifestRef: contextReference,
      outputContractRef: outputReference,
      providerValue: clone(response.output),
      providerReceiptHash: response.usageReceipt.receiptHash,
      localValidationReceipt: clone(response.localValidationReceipt),
      semanticAcceptanceInherited: false,
      published: false,
      runtimeAccepted: false,
      trainingTruth: false,
    });
    const candidateLease = store.acquire(`${attemptId}.candidate`, {
      candidateHash: candidate.hash,
    });
    const storedCandidate = candidateLease.cached ? candidateLease.artifact
      : store.finish(candidateLease, candidate);
    verifySeal(storedCandidate);
    const runtimeReceipt = seal({
      version: `${STARCRAFT_TMG_STRUCTURED_GENERATION_RUNTIME_VERSION}.receipt`,
      invocationHash,
      attemptId,
      outputContractRef: outputReference,
      status: "accepted",
      candidateHash: storedCandidate.hash,
      issueHash: null,
      providerReceiptHash: response.usageReceipt.receiptHash,
      providerAttempts: 1,
      automaticRetries: 0,
      acceptanceScope: "structured_decode_and_local_schema_only",
      semanticAcceptance: false,
      trainingTruth: false,
    });
    const receiptLease = store.acquire(`${attemptId}.runtime-receipt`, {
      receiptHash: runtimeReceipt.hash,
    });
    const storedReceipt = receiptLease.cached ? receiptLease.artifact
      : store.finish(receiptLease, runtimeReceipt);
    const pricedMicros = nonNegativeInteger(
      price(response.usageReceipt.usage, response.usageReceipt), "priced usage");
    return outcome({
      status: "accepted",
      candidateRef: { hash: storedCandidate.hash,
        contractHash: outputReference.hash },
      issueRef: null,
      receiptRef: { hash: storedReceipt.hash },
      usage: normalizedUsage(response.usageReceipt.usage, pricedMicros),
    });
  }

  function readCandidate(candidateRef = {}) {
    exactFields(candidateRef, new Set(["hash", "contractHash"]),
      "candidateRef");
    const candidateHash = String(candidateRef.hash || "");
    const contractHash = String(candidateRef.contractHash || "");
    if (!HASH.test(candidateHash) || !HASH.test(contractHash)) {
      throw new TypeError("candidateRef is invalid");
    }
    // Candidate IDs are derived from invocations, so the caller supplies the
    // runtime receipt/candidate ref and the journal remains the lookup owner.
    const value = typeof options.readCandidate === "function"
      ? options.readCandidate(candidateRef) : null;
    if (value) {
      verifySeal(value);
      if (value.hash !== candidateHash
        || value.outputContractRef.hash !== contractHash) {
        throw new TypeError("candidateRef does not match stored candidate");
      }
    }
    return value ? clone(value) : null;
  }

  return Object.freeze({ generateStructured, readCandidate, metadata });
}
