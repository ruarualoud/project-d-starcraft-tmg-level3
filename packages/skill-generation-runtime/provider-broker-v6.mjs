import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { assertStarcraftTmgSkillGenerationCredentialFree } from
  "../skill-generation/contracts-v1.mjs";
import {
  compileStarcraftTmgOfflineSkillRoleProviderRequestV4,
  createStarcraftTmgOfflineSkillProviderBrokerV5,
  STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_V5_VERSION,
} from "./provider-broker-v5.mjs";

export const STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_V6_VERSION =
  "starcraft_tmg_offline_skill_provider_broker_v6";
export const STARCRAFT_TMG_OFFLINE_SKILL_PROMPT_COMPILER_V5_VERSION =
  "starcraft_tmg_offline_skill_prompt_compiler_v5";

const HASH = /^[a-f0-9]{64}$/u;
const MAX_MODEL_FACING_REQUEST_BYTES = 64 * 1024;
const WRITE_STRING_MAXIMUM_CHARACTERS = 240;

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

function hashWithout(value, field) {
  const copy = clone(value);
  const observed = copy[field];
  delete copy[field];
  return observed === hashStarcraftTmgContract(copy);
}

export function compileStarcraftTmgOfflineSkillRoleProviderRequestV5(
  input = {},
) {
  const v4 = compileStarcraftTmgOfflineSkillRoleProviderRequestV4(input);
  const roleOutputContract = freeze({
    ...clone(v4.promptContract.roleOutputContract),
    templateSemantics: [
      ...clone(v4.promptContract.roleOutputContract.templateSemantics),
      `Keep every WRITE_ replacement at or below ${WRITE_STRING_MAXIMUM_CHARACTERS} characters.`,
      "Keep exactly the array cardinality shown in exactJsonTemplate; do not expand one-item example arrays.",
      "Prioritize a syntactically complete JSON object over elaboration; never omit a closing quote, bracket, or brace.",
    ],
    completionSafety: {
      outputMode: "json_object",
      firstCharacter: "{",
      lastCharacter: "}",
      maximumWriteStringCharacters: WRITE_STRING_MAXIMUM_CHARACTERS,
      copyTemplateArrayCardinalityExactly: true,
      markdownAllowed: false,
      repeatStagedInputAllowed: false,
    },
  });
  const promptContract = freeze({
    ...clone(v4.promptContract),
    roleOutputContract,
  });
  const providerRequest = freeze({
    ...clone(v4.providerRequest),
    promptNodes: [promptContract],
    userMessage:
      "Return one complete compact JSON object only. Begin with { and end with }. Copy exactJsonTemplate exactly, replace only WRITE_ strings with at most 240 characters, keep every shown array at the shown cardinality, and never repeat staged input. If space is tight, shorten WRITE_ text; never truncate JSON. No markdown or additional fields.",
  });
  assertStarcraftTmgSkillGenerationCredentialFree(
    providerRequest,
    "paired Provider v5 completion-safe compact request",
  );
  const serializedBytes = Buffer.byteLength(
    JSON.stringify(providerRequest),
    "utf8",
  );
  if (serializedBytes > MAX_MODEL_FACING_REQUEST_BYTES
    || serializedBytes > v4.budget.maxInputTokens) {
    throw new TypeError("paired Provider v5 compact request exceeds budget");
  }
  return freeze({
    ...clone(v4),
    promptContract,
    promptContractHash: hashStarcraftTmgContract(promptContract),
    providerRequest,
    providerRequestHash: hashStarcraftTmgContract(providerRequest),
    serializedBytes,
    v4PromptContractHash: v4.promptContractHash,
    v4ProviderRequestHash: v4.providerRequestHash,
    compilerVersion: STARCRAFT_TMG_OFFLINE_SKILL_PROMPT_COMPILER_V5_VERSION,
  });
}

export function createStarcraftTmgOfflineSkillProviderBrokerV6(options = {}) {
  return createStarcraftTmgOfflineSkillProviderBrokerV5({
    ...options,
    compileRoleRequest:
      compileStarcraftTmgOfflineSkillRoleProviderRequestV5,
    promptCompilerVersion:
      STARCRAFT_TMG_OFFLINE_SKILL_PROMPT_COMPILER_V5_VERSION,
    brokerAdapterVersion:
      STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_V6_VERSION,
  });
}

export function verifyStarcraftTmgOfflineSkillProviderRoleReceiptV6(value) {
  if (!object(value) || !HASH.test(String(value.receiptHash || ""))
    || !hashWithout(value, "receiptHash")
    || value.schemaVersion
      !== `${STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_V5_VERSION}.role-receipt`
    || value.promptCompilerVersion
      !== STARCRAFT_TMG_OFFLINE_SKILL_PROMPT_COMPILER_V5_VERSION
    || value.actualProviderRequestBound !== true
    || value.strictRoleShapeChecked !== true
    || value.hostFullEvidenceRetained !== true
    || value.fullRuleEntriesIncludedInModelPrompt !== false
    || value.safeFailureClassification !== true
    || value.fullStagedInputHash === value.modelProjectionHash
    || value.providerRequestHash === value.v4ProviderRequestHash
    || value.v4ProviderRequestHash === value.v3ProviderRequestHash
    || value.v3ProviderRequestHash === value.v2ProviderRequestHash
    || value.v2ProviderRequestHash === value.v1ProviderRequestHash
    || ![
      value.promptContractHash, value.providerRequestHash,
      value.modelProjectionHash, value.fullStagedInputHash,
      value.v4PromptContractHash, value.v4ProviderRequestHash,
      value.v3PromptContractHash, value.v3ProviderRequestHash,
      value.v2PromptContractHash, value.v2ProviderRequestHash,
      value.v1PromptContractHash, value.v1ProviderRequestHash,
    ].every((hash) => HASH.test(String(hash || "")))
    || value.physicalAttempts !== 1
    || value.automaticRetries !== 0
    || value.canAffectRules !== false
    || value.mayPublishSkill !== false
    || value.trainingTruth !== false) {
    throw new TypeError("paired Provider v6 role receipt is invalid");
  }
  assertStarcraftTmgSkillGenerationCredentialFree(
    value,
    "paired Provider v6 role receipt",
  );
  return true;
}
