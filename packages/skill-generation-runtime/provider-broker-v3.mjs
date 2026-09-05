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
  compileStarcraftTmgOfflineSkillRoleProviderRequestV2,
} from "./provider-broker-v2.mjs";

export const STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_V3_VERSION =
  "starcraft_tmg_offline_skill_provider_broker_v3";
export const STARCRAFT_TMG_OFFLINE_SKILL_PROMPT_COMPILER_V3_VERSION =
  "starcraft_tmg_offline_skill_prompt_compiler_v3";

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

function claimTemplate(claimId, evidenceIds) {
  return {
    claimId,
    claimType: "legality",
    statement: "WRITE_AN_EVIDENCE_BOUNDED_STATEMENT",
    evidenceIds: clone(evidenceIds),
    advisoryOnly: false,
  };
}

function rolePayloadTemplate(role, base) {
  const fixed = base.fixedValues || {};
  if (role === "planner") return {
    summary: "WRITE_A_CONCISE_PLANNER_SUMMARY",
    questions: [{
      questionId: fixed.questionId,
      prompt: "WRITE_THE_ONE_WORKFLOW_QUESTION",
      evidenceIds: clone(fixed.evidenceIds),
    }],
    learningObjectives: ["WRITE_ONE_TO_THREE_LEARNING_OBJECTIVES"],
  };
  if (role === "tutor") return {
    summary: "WRITE_A_CONCISE_TUTOR_SUMMARY",
    claims: base.claims.fixedClaimIds.map((claimId) => (
      claimTemplate(claimId, base.claims.evidenceIds)
    )),
    lessonSteps: [{
      stepId: fixed.lessonStepId,
      summary: "WRITE_THE_ONE_LESSON_STEP_SUMMARY",
      claimIds: clone(fixed.lessonStepClaimIds),
    }],
  };
  if (role === "student") return {
    summary: "WRITE_A_CONCISE_STUDENT_SUMMARY",
    claims: [],
    answers: [{
      questionId: fixed.questionId,
      answerSummary: "WRITE_THE_ONE_WORKFLOW_ANSWER",
      claimIds: clone(fixed.answerClaimIds),
    }],
    uncertainties: [],
  };
  if (role === "challenger") return {
    summary: "WRITE_A_CONCISE_CHALLENGER_SUMMARY",
    probes: [{
      probeId: fixed.probeId,
      kind: fixed.kind,
      targetClaimId: fixed.targetClaimId,
      prompt: "WRITE_THE_ONE_ILLEGAL_BOUNDARY_PROBE",
    }],
  };
  if (role === "reasoner") return {
    summary: "WRITE_A_CONCISE_REASONER_SUMMARY",
    claims: base.claims.fixedClaimIds.map((claimId) => (
      claimTemplate(claimId, base.claims.evidenceIds)
    )),
    resolutions: [{
      probeId: fixed.probeId,
      disposition: fixed.disposition,
      decisionSummary: "WRITE_THE_ONE_RESOLUTION_SUMMARY",
      claimIds: clone(fixed.resolutionClaimIds),
    }],
  };
  if (role === "proposer") return {
    summary: "WRITE_A_CONCISE_PROPOSER_SUMMARY",
    revisionTargets: [],
    candidatePlan: clone(fixed.candidatePlan),
  };
  if (role === "generator") return {
    summary: "WRITE_A_CONCISE_GENERATOR_SUMMARY",
    claims: [],
    candidateDraft: {
      ...clone(fixed.candidateIdentity),
      summary: "WRITE_THE_CANDIDATE_SKILL_SUMMARY",
      claimIds: clone(fixed.claimIds),
      procedure: ["WRITE_ONE_OR_MORE_ORDERED_PROCEDURE_STEPS"],
      legalityChecks: ["WRITE_ONE_OR_MORE_LEGALITY_CHECKS"],
      illegalPatterns: ["WRITE_ONE_OR_MORE_ILLEGAL_PATTERNS"],
      examples: ["WRITE_AT_LEAST_ONE_POSITIVE_EXAMPLE"],
      counterExamples: ["WRITE_AT_LEAST_ONE_COUNTEREXAMPLE"],
      judgeTests: [
        {
          testId: "judge.positive.exact-routing",
          kind: "positive",
          claimIds: clone(fixed.claimIds),
          expected: "pass",
        },
        {
          testId: "judge.negative.index-authority",
          kind: "negative",
          claimIds: ["claim.rules.authority", "claim.atom.retrieval"],
          expected: "reject",
        },
      ],
      unresolvedClaims: [],
    },
  };
  throw new TypeError(`unsupported paired role: ${role}`);
}

const ROLE_SHAPES = Object.freeze({
  planner: {
    arrays: { questions: [1, 1], learningObjectives: [1, 3] },
  },
  tutor: {
    arrays: { claims: [2, 2], lessonSteps: [1, 1] },
  },
  student: {
    arrays: { claims: [0, 0], answers: [1, 1], uncertainties: [0, 0] },
  },
  challenger: {
    arrays: { probes: [1, 1] },
  },
  reasoner: {
    arrays: { claims: [2, 2], resolutions: [1, 1] },
  },
  proposer: {
    arrays: { revisionTargets: [0, 0] },
    objects: ["candidatePlan"],
  },
  generator: {
    arrays: { claims: [0, 0] },
    objects: ["candidateDraft"],
    nestedArrays: {
      "candidateDraft.procedure": [1, 128],
      "candidateDraft.legalityChecks": [1, 128],
      "candidateDraft.illegalPatterns": [1, 128],
      "candidateDraft.examples": [1, 128],
      "candidateDraft.counterExamples": [1, 128],
      "candidateDraft.judgeTests": [2, 128],
      "candidateDraft.unresolvedClaims": [0, 0],
    },
  },
});

function hardenedRoleOutputContract(role, base) {
  return freeze({
    ...clone(base),
    strictShapeVersion: "starcraft_tmg_paired_role_shape_v1",
    arraySemantics:
      "Every field shown with square brackets is a JSON array even when it has exactly one item.",
    templateSemantics: [
      "Copy the exact object and array structure from exactJsonTemplate.",
      "Replace only strings beginning with WRITE_ using concise evidence-bounded text.",
      "Copy all other fixed strings, booleans, arrays, IDs, and keys exactly.",
      "Do not return the role payload by itself; return the outer envelope shown.",
    ],
    deterministicShape: clone(ROLE_SHAPES[role]),
    exactJsonTemplate: {
      schemaVersion: "starcraft_tmg_offline_skill_role_output_v1",
      channels: {
        skill_generation_role_output: rolePayloadTemplate(role, base),
      },
    },
  });
}

function observedShape(value) {
  if (Array.isArray(value)) return { kind: "array", count: value.length };
  if (value === null) return { kind: "null", count: null };
  return { kind: typeof value === "object" ? "object" : typeof value, count: null };
}

function shapeFailure(role, field, expected, value) {
  const error = new TypeError("paired role output shape is invalid");
  error.code = "PAIRED_ROLE_OUTPUT_SHAPE_INVALID";
  error.outputDiagnostic = freeze({
    role,
    field,
    expected,
    ...observedShape(value),
    payloadIncluded: false,
  });
  throw error;
}

function valueAtPath(value, pathname) {
  return pathname.split(".").reduce((current, key) => current?.[key], value);
}

export function assertStarcraftTmgOfflineSkillRoleOutputV3(role, output) {
  const shape = ROLE_SHAPES[role];
  if (!shape || !object(output)) {
    shapeFailure(role, "$", "object", output);
  }
  const baseKeys = {
    planner: ["summary", "questions", "learningObjectives"],
    tutor: ["summary", "claims", "lessonSteps"],
    student: ["summary", "claims", "answers", "uncertainties"],
    challenger: ["summary", "probes"],
    reasoner: ["summary", "claims", "resolutions"],
    proposer: ["summary", "revisionTargets", "candidatePlan"],
    generator: ["summary", "claims", "candidateDraft"],
  }[role];
  if (Object.keys(output).length !== baseKeys.length
    || baseKeys.some((key) => !Object.hasOwn(output, key))) {
    shapeFailure(role, "$", `exact_keys:${baseKeys.join(",")}`, output);
  }
  if (typeof output.summary !== "string" || output.summary.trim() === "") {
    shapeFailure(role, "summary", "non_empty_string", output.summary);
  }
  for (const [field, [minimum, maximum]] of Object.entries(shape.arrays || {})) {
    const value = output[field];
    if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
      shapeFailure(role, field, `array_length_${minimum}_to_${maximum}`, value);
    }
  }
  for (const field of shape.objects || []) {
    if (!object(output[field])) shapeFailure(role, field, "object", output[field]);
  }
  for (const [field, [minimum, maximum]] of Object.entries(
    shape.nestedArrays || {},
  )) {
    const value = valueAtPath(output, field);
    if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
      shapeFailure(role, field, `array_length_${minimum}_to_${maximum}`, value);
    }
  }
  return output;
}

export function compileStarcraftTmgOfflineSkillRoleProviderRequestV3(
  input = {},
) {
  const v2 = compileStarcraftTmgOfflineSkillRoleProviderRequestV2(input);
  const roleOutputContract = hardenedRoleOutputContract(
    v2.role,
    v2.promptContract.roleOutputContract,
  );
  const promptContract = freeze({
    ...clone(v2.promptContract),
    roleOutputContract,
  });
  const providerRequest = freeze({
    ...clone(v2.providerRequest),
    promptNodes: [promptContract],
    userMessage:
      "Execute the sealed role and return JSON only. Copy the exactJsonTemplate object/array structure, replace only WRITE_ strings, preserve all fixed values, and emit exactly the outer envelope with channels.skill_generation_role_output. Square brackets always mean arrays, including one-item arrays. No markdown and no additional fields.",
  });
  assertStarcraftTmgSkillGenerationCredentialFree(
    providerRequest,
    "paired Provider v3 request",
  );
  const serializedBytes = Buffer.byteLength(
    JSON.stringify(providerRequest),
    "utf8",
  );
  if (serializedBytes > v2.budget.maxInputTokens) {
    throw new TypeError("paired Provider v3 request exceeds sealed input budget");
  }
  return freeze({
    ...clone(v2),
    promptContract,
    promptContractHash: hashStarcraftTmgContract(promptContract),
    providerRequest,
    providerRequestHash: hashStarcraftTmgContract(providerRequest),
    serializedBytes,
    v2PromptContractHash: v2.promptContractHash,
    v2ProviderRequestHash: v2.providerRequestHash,
    v1PromptContractHash: v2.basePromptContractHash,
    v1ProviderRequestHash: v2.baseProviderRequestHash,
    compilerVersion: STARCRAFT_TMG_OFFLINE_SKILL_PROMPT_COMPILER_V3_VERSION,
  });
}

function outputFailureReceipt(compiled, result, error) {
  return envelope({
    schemaVersion:
      `${STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_V3_VERSION}.output-failure`,
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
    "paired Provider v3 output failure receipt",
  );
  const wrapped = new Error("PAIRED_ROLE_OUTPUT_CONTRACT_REJECTED");
  wrapped.code = "PAIRED_ROLE_OUTPUT_CONTRACT_REJECTED";
  wrapped.safeReceipt = safeReceipt;
  throw wrapped;
}

export function createStarcraftTmgOfflineSkillProviderBrokerV3(options = {}) {
  const providerWorkerPort = options.providerWorkerPort;
  const costGuard = options.costGuard;
  if (typeof providerWorkerPort?.metadata !== "function"
    || typeof providerWorkerPort?.complete !== "function"
    || typeof costGuard?.metadata !== "function"
    || typeof costGuard?.authorizeAttempt !== "function"
    || typeof costGuard?.settleAttempt !== "function") {
    throw new TypeError("paired Provider v3 broker ports are required");
  }
  let active = null;
  const workerProxy = freeze({
    metadata: (...args) => providerWorkerPort.metadata(...args),
    async complete(input) {
      if (!active
        || hashStarcraftTmgContract(input.providerRequest)
          !== active.v1ProviderRequestHash) {
        throw new TypeError("paired Provider v3 base request binding is invalid");
      }
      return providerWorkerPort.complete({
        ...input,
        providerRequest: active.providerRequest,
      });
    },
  });
  const costProxy = freeze({
    metadata: (...args) => costGuard.metadata(...args),
    async authorizeAttempt(input) {
      if (!active || input.requestHash !== active.v1ProviderRequestHash) {
        throw new TypeError("paired v3 cost request binding is invalid");
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
    if (active) throw new TypeError("paired Provider v3 broker is single-flight");
    const compiled = compileStarcraftTmgOfflineSkillRoleProviderRequestV3({
      jobManifest: input.jobManifest,
      rolePacket: input.rolePacket,
      requestId: input.attemptId,
    });
    active = compiled;
    try {
      const result = await baseBroker.completeRole(input);
      if (result.costAuthorization.requestHash !== compiled.providerRequestHash
        || result.receipt.providerRequestHash
          !== compiled.v1ProviderRequestHash) {
        throw new TypeError("paired v3 actual request cost lineage is invalid");
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
          `${STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_V3_VERSION}.role-receipt`,
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
      }, "receiptHash");
      assertStarcraftTmgSkillGenerationCredentialFree(
        receipt,
        "paired Provider v3 role receipt",
      );
      return freeze({ ...clone(result), receipt });
    } finally {
      active = null;
    }
  }

  return freeze({
    metadata() {
      return freeze({
        schemaVersion:
          `${STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_V3_VERSION}.metadata`,
        acceptedArms: ["dsh", "direct_provider_control"],
        promptPackHash: promptPack.promptPackHash,
        promptCompilerVersion:
          STARCRAFT_TMG_OFFLINE_SKILL_PROMPT_COMPILER_V3_VERSION,
        actualProviderRequestBound: true,
        strictRoleShapeChecked: true,
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

export function verifyStarcraftTmgOfflineSkillProviderRoleReceiptV3(value) {
  if (!object(value) || !HASH.test(String(value.receiptHash || ""))
    || !hashWithout(value, "receiptHash")
    || value.schemaVersion
      !== `${STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_V3_VERSION}.role-receipt`
    || value.promptPackHash !== promptPack.promptPackHash
    || value.promptCompilerVersion
      !== STARCRAFT_TMG_OFFLINE_SKILL_PROMPT_COMPILER_V3_VERSION
    || value.actualProviderRequestBound !== true
    || value.strictRoleShapeChecked !== true
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
    throw new TypeError("paired Provider v3 role receipt is invalid");
  }
  assertStarcraftTmgSkillGenerationCredentialFree(
    value,
    "paired Provider v3 role receipt",
  );
  return true;
}
