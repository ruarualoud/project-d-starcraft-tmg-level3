import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  assertStarcraftTmgSkillGenerationCredentialFree,
} from "../skill-generation/contracts-v1.mjs";
import {
  STARCRAFT_TMG_CTX2SKILL_PAIRED_PROMPT_PACK_V1 as promptPack,
} from "../../content/skill-generation/ticket-17-slice-170-paired-proof-v1.mjs";
import {
  createStarcraftTmgOfflineSkillProviderBrokerV1,
} from "./provider-broker-v1.mjs";
import {
  assertStarcraftTmgOfflineSkillRoleOutputV3,
  compileStarcraftTmgOfflineSkillRoleProviderRequestV3,
} from "./provider-broker-v3.mjs";

export const STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_V4_VERSION =
  "starcraft_tmg_offline_skill_provider_broker_v4";

const HASH = /^[a-f0-9]{64}$/u;

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

function envelope(body, field) {
  return freeze({ ...body, [field]: hashStarcraftTmgContract(body) });
}

function hashWithout(value, field) {
  const copy = clone(value);
  const observed = copy[field];
  delete copy[field];
  return observed === hashStarcraftTmgContract(copy);
}

function wrapFailure(compiled, brokerReceipt, transportReceipt) {
  const body = {
    schemaVersion:
      `${STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_V4_VERSION}.failure`,
    code: brokerReceipt?.code || "OFFLINE_PROVIDER_ATTEMPT_FAILED",
    role: compiled.role,
    providerRequestHash: compiled.providerRequestHash,
    brokerFailureReceipt: clone(brokerReceipt || null),
    transportFailureReceipt: clone(transportReceipt || null),
    transportFailureCode: transportReceipt?.code || null,
    transportStatus: transportReceipt?.status ?? null,
    requestDefinitelyNotSent:
      transportReceipt?.requestDefinitelyNotSent
        ?? brokerReceipt?.requestDefinitelyNotSent ?? false,
    requestMayHaveBeenSent:
      transportReceipt?.requestMayHaveBeenSent
        ?? brokerReceipt?.requestMayHaveBeenSent ?? true,
    physicalAttempts:
      transportReceipt?.physicalAttempts ?? brokerReceipt?.physicalAttempts ?? 1,
    automaticRetries: 0,
    payloadIncluded: false,
    canAffectRules: false,
    mayPublishSkill: false,
    trainingTruth: false,
  };
  const safeReceipt = envelope(body, "receiptHash");
  assertStarcraftTmgSkillGenerationCredentialFree(
    safeReceipt,
    "paired Provider v4 failure receipt",
  );
  const error = new Error(body.code);
  error.code = body.code;
  error.safeReceipt = safeReceipt;
  throw error;
}

function outputFailureReceipt(compiled, result, error) {
  return envelope({
    schemaVersion:
      `${STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_V4_VERSION}.output-failure`,
    code: "PAIRED_ROLE_OUTPUT_CONTRACT_REJECTED",
    role: compiled.role,
    providerRequestHash: compiled.providerRequestHash,
    providerRoleReceiptHash: result.receipt.receiptHash,
    costSettlementHash: result.costSettlement.settlementHash,
    outputDiagnostic: clone(error.outputDiagnostic),
    physicalAttempts: 1,
    automaticRetries: 0,
    payloadIncluded: false,
    canAffectRules: false,
    mayPublishSkill: false,
    trainingTruth: false,
  }, "receiptHash");
}

function throwOutputFailure(compiled, result, error) {
  const safeReceipt = outputFailureReceipt(compiled, result, error);
  assertStarcraftTmgSkillGenerationCredentialFree(
    safeReceipt,
    "paired Provider v4 output failure receipt",
  );
  const wrapped = new Error("PAIRED_ROLE_OUTPUT_CONTRACT_REJECTED");
  wrapped.code = "PAIRED_ROLE_OUTPUT_CONTRACT_REJECTED";
  wrapped.safeReceipt = safeReceipt;
  throw wrapped;
}

export function createStarcraftTmgOfflineSkillProviderBrokerV4(options = {}) {
  const providerWorkerPort = options.providerWorkerPort;
  const costGuard = options.costGuard;
  if (typeof providerWorkerPort?.metadata !== "function"
    || typeof providerWorkerPort?.complete !== "function"
    || typeof costGuard?.metadata !== "function"
    || typeof costGuard?.authorizeAttempt !== "function"
    || typeof costGuard?.settleAttempt !== "function") {
    throw new TypeError("paired Provider v4 broker ports are required");
  }
  let active = null;
  let transportFailureReceipt = null;
  const workerProxy = freeze({
    metadata: (...args) => providerWorkerPort.metadata(...args),
    async complete(input) {
      if (!active
        || hashStarcraftTmgContract(input.providerRequest)
          !== active.v1ProviderRequestHash) {
        throw new TypeError("paired Provider v4 base request binding is invalid");
      }
      try {
        return await providerWorkerPort.complete({
          ...input,
          providerRequest: active.providerRequest,
        });
      } catch (error) {
        transportFailureReceipt = clone(error?.safeReceipt || null);
        throw error;
      }
    },
  });
  const costProxy = freeze({
    metadata: (...args) => costGuard.metadata(...args),
    async authorizeAttempt(input) {
      if (!active || input.requestHash !== active.v1ProviderRequestHash) {
        throw new TypeError("paired v4 cost request binding is invalid");
      }
      return costGuard.authorizeAttempt({
        ...input,
        requestHash: active.providerRequestHash,
      });
    },
    settleAttempt: (...args) => costGuard.settleAttempt(...args),
    readSnapshot: (...args) => costGuard.readSnapshot(...args),
  });
  const baseBroker = createStarcraftTmgOfflineSkillProviderBrokerV1({
    providerWorkerPort: workerProxy,
    costGuard: costProxy,
    ...(options.now ? { now: options.now } : {}),
  });

  async function completeRole(input = {}) {
    if (active) throw new TypeError("paired Provider v4 broker is single-flight");
    const compiled = compileStarcraftTmgOfflineSkillRoleProviderRequestV3({
      jobManifest: input.jobManifest,
      rolePacket: input.rolePacket,
      requestId: input.attemptId,
    });
    active = compiled;
    transportFailureReceipt = null;
    try {
      let result;
      try {
        result = await baseBroker.completeRole(input);
      } catch (error) {
        if (transportFailureReceipt || error?.safeReceipt) {
          wrapFailure(compiled, error?.safeReceipt, transportFailureReceipt);
        }
        throw error;
      }
      if (result.costAuthorization.requestHash !== compiled.providerRequestHash
        || result.receipt.providerRequestHash
          !== compiled.v1ProviderRequestHash) {
        throw new TypeError("paired v4 actual request cost lineage is invalid");
      }
      try {
        assertStarcraftTmgOfflineSkillRoleOutputV3(
          compiled.role,
          result.roleOutput,
        );
      } catch (error) {
        throwOutputFailure(compiled, result, error);
      }
      const { receiptHash: _oldHash, ...oldBody } = clone(result.receipt);
      const receipt = envelope({
        ...oldBody,
        schemaVersion:
          `${STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_V4_VERSION}.role-receipt`,
        promptContractHash: compiled.promptContractHash,
        providerRequestHash: compiled.providerRequestHash,
        v2PromptContractHash: compiled.v2PromptContractHash,
        v2ProviderRequestHash: compiled.v2ProviderRequestHash,
        v1PromptContractHash: compiled.v1PromptContractHash,
        v1ProviderRequestHash: compiled.v1ProviderRequestHash,
        promptPackHash: compiled.promptPackHash,
        promptCompilerVersion: compiled.compilerVersion,
        actualProviderRequestBound: true,
        strictRoleShapeChecked: true,
        transportFailureReceiptPreserved: true,
      }, "receiptHash");
      assertStarcraftTmgSkillGenerationCredentialFree(
        receipt,
        "paired Provider v4 role receipt",
      );
      return freeze({ ...clone(result), receipt });
    } finally {
      active = null;
      transportFailureReceipt = null;
    }
  }

  return freeze({
    metadata() {
      return freeze({
        schemaVersion:
          `${STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_V4_VERSION}.metadata`,
        acceptedArms: ["dsh", "direct_provider_control"],
        promptPackHash: promptPack.promptPackHash,
        promptCompilerVersion: "starcraft_tmg_offline_skill_prompt_compiler_v3",
        actualProviderRequestBound: true,
        strictRoleShapeChecked: true,
        transportFailureReceiptPreserved: true,
        physicalAttemptsPerRole: 1,
        automaticRetryAllowed: false,
        credentialInputAccepted: false,
        workerReferenceOnly: true,
        canAffectRules: false,
        mayPublishSkill: false,
        trainingTruth: false,
      });
    },
    completeRole,
    readCostSnapshot: (...args) => costGuard.readSnapshot(...args),
  });
}

export function verifyStarcraftTmgOfflineSkillProviderRoleReceiptV4(value) {
  if (!object(value) || !HASH.test(String(value.receiptHash || ""))
    || !hashWithout(value, "receiptHash")
    || value.schemaVersion
      !== `${STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_V4_VERSION}.role-receipt`
    || value.promptPackHash !== promptPack.promptPackHash
    || value.promptCompilerVersion
      !== "starcraft_tmg_offline_skill_prompt_compiler_v3"
    || value.actualProviderRequestBound !== true
    || value.strictRoleShapeChecked !== true
    || value.transportFailureReceiptPreserved !== true
    || value.providerRequestHash === value.v2ProviderRequestHash
    || value.v2ProviderRequestHash === value.v1ProviderRequestHash
    || ![value.promptContractHash, value.providerRequestHash,
      value.v2PromptContractHash, value.v2ProviderRequestHash,
      value.v1PromptContractHash, value.v1ProviderRequestHash]
      .every((hash) => HASH.test(String(hash || "")))
    || value.physicalAttempts !== 1
    || value.automaticRetries !== 0
    || value.canAffectRules !== false
    || value.mayPublishSkill !== false
    || value.trainingTruth !== false) {
    throw new TypeError("paired Provider v4 role receipt is invalid");
  }
  assertStarcraftTmgSkillGenerationCredentialFree(
    value,
    "paired Provider v4 role receipt",
  );
  return true;
}
