import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  assertStarcraftTmgSkillGenerationCredentialFree,
} from "../skill-generation/contracts-v1.mjs";
import {
  STARCRAFT_TMG_CTX2SKILL_PAIRED_PROMPT_PACK_V1 as promptPack,
} from "../../content/skill-generation/ticket-17-slice-170-paired-proof-v1.mjs";
import {
  createStarcraftTmgHowToPlayModelProjectionV1,
  STARCRAFT_TMG_HOW_TO_PLAY_MODEL_PROJECTION_VERSION,
  verifyStarcraftTmgHowToPlayModelProjectionV1,
} from "./how-to-play-model-projection-v1.mjs";
import {
  createStarcraftTmgOfflineSkillProviderBrokerV1,
} from "./provider-broker-v1.mjs";
import {
  assertStarcraftTmgOfflineSkillRoleOutputV3,
  compileStarcraftTmgOfflineSkillRoleProviderRequestV3,
} from "./provider-broker-v3.mjs";

export const STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_V5_VERSION =
  "starcraft_tmg_offline_skill_provider_broker_v5";
export const STARCRAFT_TMG_OFFLINE_SKILL_PROMPT_COMPILER_V4_VERSION =
  "starcraft_tmg_offline_skill_prompt_compiler_v4";

const HASH = /^[a-f0-9]{64}$/u;
const MAX_MODEL_FACING_REQUEST_BYTES = 64 * 1024;

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

function attemptBudgetCap(value) {
  if (value === undefined) return null;
  if (!object(value)
    || Object.keys(value).sort().join(",")
      !== "maxInputTokens,maxOutputTokens"
    || !Number.isSafeInteger(value.maxInputTokens)
    || value.maxInputTokens < 1 || value.maxInputTokens > 1_000_000
    || !Number.isSafeInteger(value.maxOutputTokens)
    || value.maxOutputTokens < 1 || value.maxOutputTokens > 8_192) {
    throw new TypeError("paired Provider v5 attempt budget cap is invalid");
  }
  return freeze({
    maxInputTokens: value.maxInputTokens,
    maxOutputTokens: value.maxOutputTokens,
  });
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

function safeFailureClass(error) {
  if (typeof error?.safeReceipt?.code === "string") {
    return error.safeReceipt.code;
  }
  if (error instanceof TypeError) {
    return "PROVIDER_WORKER_RESULT_VALIDATION_REJECTED";
  }
  if (/^[A-Z][A-Z0-9_]{2,79}$/u.test(String(error?.code || ""))) {
    return error.code;
  }
  return "PROVIDER_WORKER_UNCLASSIFIED_FAILURE";
}

function safeWorkerStateProjection(result) {
  const worker = result?.ok === true ? result.worker : null;
  return freeze({
    found: Boolean(worker),
    state: typeof worker?.state === "string" ? worker.state : null,
    exitReason: typeof worker?.exitReason === "string"
      ? worker.exitReason : null,
    expectedExit: typeof worker?.expectedExit === "boolean"
      ? worker.expectedExit : null,
    providerTransportMounted:
      typeof worker?.providerTransportMounted === "boolean"
        ? worker.providerTransportMounted : null,
    automaticRestarted: typeof worker?.automaticRestarted === "boolean"
      ? worker.automaticRestarted : null,
    payloadIncluded: false,
    trainingTruth: false,
  });
}

export function compileStarcraftTmgOfflineSkillRoleProviderRequestV4(
  input = {},
) {
  const v3 = compileStarcraftTmgOfflineSkillRoleProviderRequestV3(input);
  const fullStagedInput = input.rolePacket?.stagedInput;
  const stagedInput = createStarcraftTmgHowToPlayModelProjectionV1(
    fullStagedInput,
  );
  verifyStarcraftTmgHowToPlayModelProjectionV1(stagedInput, fullStagedInput);
  const promptContract = freeze({
    ...clone(v3.promptContract),
    stagedInput,
    fullStagedInputHash: fullStagedInput.stagedInputHash,
    stagedInputProjectionVersion:
      STARCRAFT_TMG_HOW_TO_PLAY_MODEL_PROJECTION_VERSION,
    modelEvidenceMode: "hash_complete_hierarchical_projection",
    fullRuleEntriesIncludedInModelPrompt: false,
  });
  const providerRequest = freeze({
    ...clone(v3.providerRequest),
    promptNodes: [promptContract],
  });
  assertStarcraftTmgSkillGenerationCredentialFree(
    providerRequest,
    "paired Provider v4 compact request",
  );
  const serializedBytes = Buffer.byteLength(
    JSON.stringify(providerRequest),
    "utf8",
  );
  if (serializedBytes > MAX_MODEL_FACING_REQUEST_BYTES
    || serializedBytes > v3.budget.maxInputTokens) {
    throw new TypeError("paired Provider v4 compact request exceeds budget");
  }
  return freeze({
    ...clone(v3),
    promptContract,
    promptContractHash: hashStarcraftTmgContract(promptContract),
    providerRequest,
    providerRequestHash: hashStarcraftTmgContract(providerRequest),
    serializedBytes,
    modelProjectionHash: stagedInput.projectionHash,
    fullStagedInputHash: fullStagedInput.stagedInputHash,
    v3PromptContractHash: v3.promptContractHash,
    v3ProviderRequestHash: v3.providerRequestHash,
    compilerVersion: STARCRAFT_TMG_OFFLINE_SKILL_PROMPT_COMPILER_V4_VERSION,
  });
}

function wrapFailure(compiled, brokerReceipt, transportObservation) {
  const transportReceipt = transportObservation.receipt;
  const body = {
    schemaVersion:
      `${STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_V5_VERSION}.failure`,
    code: brokerReceipt?.code || "OFFLINE_PROVIDER_ATTEMPT_FAILED",
    role: compiled.role,
    providerRequestHash: compiled.providerRequestHash,
    brokerFailureReceipt: clone(brokerReceipt || null),
    transportFailureReceipt: clone(transportReceipt || null),
    transportFailureClass: transportObservation.failureClass,
    transportFailureCode: transportReceipt?.code || null,
    transportStatus: transportReceipt?.status ?? null,
    providerWorkerState: clone(transportObservation.workerState),
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
    "paired Provider v5 failure receipt",
  );
  const error = new Error(body.code);
  error.code = body.code;
  error.safeReceipt = safeReceipt;
  throw error;
}

function throwOutputFailure(compiled, result, error) {
  const safeReceipt = envelope({
    schemaVersion:
      `${STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_V5_VERSION}.output-failure`,
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
  assertStarcraftTmgSkillGenerationCredentialFree(
    safeReceipt,
    "paired Provider v5 output failure receipt",
  );
  const wrapped = new Error("PAIRED_ROLE_OUTPUT_CONTRACT_REJECTED");
  wrapped.code = "PAIRED_ROLE_OUTPUT_CONTRACT_REJECTED";
  wrapped.safeReceipt = safeReceipt;
  throw wrapped;
}

export function createStarcraftTmgOfflineSkillProviderBrokerV5(options = {}) {
  const providerWorkerPort = options.providerWorkerPort;
  const costGuard = options.costGuard;
  const budgetCap = attemptBudgetCap(options.attemptBudgetCap);
  const compileRoleRequest = options.compileRoleRequest
    || compileStarcraftTmgOfflineSkillRoleProviderRequestV4;
  const promptCompilerVersion = options.promptCompilerVersion
    || STARCRAFT_TMG_OFFLINE_SKILL_PROMPT_COMPILER_V4_VERSION;
  const brokerAdapterVersion = options.brokerAdapterVersion
    || STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_V5_VERSION;
  if (typeof providerWorkerPort?.metadata !== "function"
    || typeof providerWorkerPort?.complete !== "function"
    || typeof costGuard?.metadata !== "function"
    || typeof costGuard?.authorizeAttempt !== "function"
    || typeof costGuard?.settleAttempt !== "function"
    || typeof compileRoleRequest !== "function"
    || !/^[a-z][a-z0-9_]{7,95}$/u.test(promptCompilerVersion)
    || !/^[a-z][a-z0-9_]{7,95}$/u.test(brokerAdapterVersion)) {
    throw new TypeError("paired Provider v5 broker ports are required");
  }
  let active = null;
  let transportObservation = null;
  const workerProxy = freeze({
    metadata: (...args) => providerWorkerPort.metadata(...args),
    async complete(input) {
      if (!active
        || hashStarcraftTmgContract(input.providerRequest)
          !== active.v1ProviderRequestHash) {
        throw new TypeError("paired Provider v5 base request binding is invalid");
      }
      try {
        return await providerWorkerPort.complete({
          ...input,
          providerRequest: active.providerRequest,
        });
      } catch (error) {
        let workerState = safeWorkerStateProjection(null);
        if (typeof providerWorkerPort.readWorkerState === "function") {
          const observed = await Promise.resolve(
            providerWorkerPort.readWorkerState({ workerRef: input.workerRef }),
          ).catch(() => null);
          workerState = safeWorkerStateProjection(observed);
        }
        transportObservation = freeze({
          receipt: clone(error?.safeReceipt || null),
          failureClass: safeFailureClass(error),
          workerState,
        });
        throw error;
      }
    },
  });
  const costProxy = freeze({
    metadata: (...args) => costGuard.metadata(...args),
    async authorizeAttempt(input) {
      if (!active || input.requestHash !== active.v1ProviderRequestHash) {
        throw new TypeError("paired v5 cost request binding is invalid");
      }
      return costGuard.authorizeAttempt({
        ...input,
        requestHash: active.providerRequestHash,
        ...(budgetCap ? {
          maxInputTokens: budgetCap.maxInputTokens,
          maxOutputTokens: budgetCap.maxOutputTokens,
        } : {}),
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
    if (active) throw new TypeError("paired Provider v5 broker is single-flight");
    const compiled = compileRoleRequest({
      jobManifest: input.jobManifest,
      rolePacket: input.rolePacket,
      requestId: input.attemptId,
    });
    if (compiled?.compilerVersion !== promptCompilerVersion) {
      throw new TypeError("paired Provider compiler identity is invalid");
    }
    active = compiled;
    transportObservation = null;
    try {
      let result;
      try {
        result = await baseBroker.completeRole(input);
      } catch (error) {
        wrapFailure(compiled, error?.safeReceipt, transportObservation || {
          receipt: null,
          failureClass: "BROKER_PRE_TRANSPORT_OR_UNCLASSIFIED_FAILURE",
          workerState: safeWorkerStateProjection(null),
        });
      }
      if (result.costAuthorization.requestHash !== compiled.providerRequestHash
        || result.receipt.providerRequestHash
          !== compiled.v1ProviderRequestHash
        || budgetCap && (
          result.costAuthorization.maxInputTokens !== budgetCap.maxInputTokens
          || result.costAuthorization.maxOutputTokens
            !== budgetCap.maxOutputTokens
          || result.pricingReceipt?.usage?.inputUnits
            > budgetCap.maxInputTokens
          || result.pricingReceipt?.usage?.outputUnits
            > budgetCap.maxOutputTokens
        )) {
        throw new TypeError("paired v5 actual request cost lineage is invalid");
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
          `${STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_V5_VERSION}.role-receipt`,
        promptContractHash: compiled.promptContractHash,
        providerRequestHash: compiled.providerRequestHash,
        modelProjectionHash: compiled.modelProjectionHash,
        fullStagedInputHash: compiled.fullStagedInputHash,
        v3PromptContractHash: compiled.v3PromptContractHash,
        v3ProviderRequestHash: compiled.v3ProviderRequestHash,
        ...(compiled.v4PromptContractHash ? {
          v4PromptContractHash: compiled.v4PromptContractHash,
          v4ProviderRequestHash: compiled.v4ProviderRequestHash,
        } : {}),
        v2PromptContractHash: compiled.v2PromptContractHash,
        v2ProviderRequestHash: compiled.v2ProviderRequestHash,
        v1PromptContractHash: compiled.v1PromptContractHash,
        v1ProviderRequestHash: compiled.v1ProviderRequestHash,
        promptPackHash: compiled.promptPackHash,
        promptCompilerVersion: compiled.compilerVersion,
        actualProviderRequestBound: true,
        strictRoleShapeChecked: true,
        hostFullEvidenceRetained: true,
        fullRuleEntriesIncludedInModelPrompt: false,
        safeFailureClassification: true,
      }, "receiptHash");
      assertStarcraftTmgSkillGenerationCredentialFree(
        receipt,
        "paired Provider v5 role receipt",
      );
      return freeze({ ...clone(result), receipt });
    } finally {
      active = null;
      transportObservation = null;
    }
  }

  return freeze({
    metadata() {
      return freeze({
        schemaVersion:
          `${STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_V5_VERSION}.metadata`,
        brokerAdapterVersion,
        acceptedArms: ["dsh", "direct_provider_control"],
        promptPackHash: promptPack.promptPackHash,
        promptCompilerVersion,
        stagedInputProjectionVersion:
          STARCRAFT_TMG_HOW_TO_PLAY_MODEL_PROJECTION_VERSION,
        maximumModelFacingRequestBytes: MAX_MODEL_FACING_REQUEST_BYTES,
        attemptBudgetCap: clone(budgetCap),
        actualProviderRequestBound: true,
        strictRoleShapeChecked: true,
        hostFullEvidenceRetained: true,
        fullRuleEntriesIncludedInModelPrompt: false,
        safeFailureClassification: true,
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

export function verifyStarcraftTmgOfflineSkillProviderRoleReceiptV5(value) {
  if (!object(value) || !HASH.test(String(value.receiptHash || ""))
    || !hashWithout(value, "receiptHash")
    || value.schemaVersion
      !== `${STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_V5_VERSION}.role-receipt`
    || value.promptPackHash !== promptPack.promptPackHash
    || value.promptCompilerVersion
      !== STARCRAFT_TMG_OFFLINE_SKILL_PROMPT_COMPILER_V4_VERSION
    || value.actualProviderRequestBound !== true
    || value.strictRoleShapeChecked !== true
    || value.hostFullEvidenceRetained !== true
    || value.fullRuleEntriesIncludedInModelPrompt !== false
    || value.safeFailureClassification !== true
    || value.fullStagedInputHash === value.modelProjectionHash
    || value.providerRequestHash === value.v3ProviderRequestHash
    || value.v3ProviderRequestHash === value.v2ProviderRequestHash
    || value.v2ProviderRequestHash === value.v1ProviderRequestHash
    || ![value.promptContractHash, value.providerRequestHash,
      value.modelProjectionHash, value.fullStagedInputHash,
      value.v3PromptContractHash, value.v3ProviderRequestHash,
      value.v2PromptContractHash, value.v2ProviderRequestHash,
      value.v1PromptContractHash, value.v1ProviderRequestHash]
      .every((hash) => HASH.test(String(hash || "")))
    || value.physicalAttempts !== 1
    || value.automaticRetries !== 0
    || value.canAffectRules !== false
    || value.mayPublishSkill !== false
    || value.trainingTruth !== false) {
    throw new TypeError("paired Provider v5 role receipt is invalid");
  }
  assertStarcraftTmgSkillGenerationCredentialFree(
    value,
    "paired Provider v5 role receipt",
  );
  return true;
}
