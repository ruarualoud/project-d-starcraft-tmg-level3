import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  assertStarcraftTmgSkillGenerationContract,
  assertStarcraftTmgSkillGenerationCredentialFree,
} from "../skill-generation/contracts-v1.mjs";
import {
  STARCRAFT_TMG_CTX2SKILL_PAIRED_PROMPT_PACK_V1 as promptPack,
  STARCRAFT_TMG_TICKET_17_SLICE_170_PAIRED_PROOF_V1 as proof,
} from "../../content/skill-generation/ticket-17-slice-170-paired-proof-v1.mjs";
import {
  compileStarcraftTmgOfflineSkillRoleProviderRequestV1,
  createStarcraftTmgOfflineSkillProviderBrokerV1,
} from "./provider-broker-v1.mjs";

export const STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_V2_VERSION =
  "starcraft_tmg_offline_skill_provider_broker_v2";
export const STARCRAFT_TMG_OFFLINE_SKILL_PROMPT_COMPILER_V2_VERSION =
  "starcraft_tmg_offline_skill_prompt_compiler_v2";

const HASH = /^[a-f0-9]{64}$/u;
const EVIDENCE_ID = proof.target.evidenceId;
const SKILL_ID = proof.target.productionSkillId;
const SKILL_VERSION = "0.1.0-candidate.slice170";
const SKILL_TITLE = "StarCraft TMG — How to Play";

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

function claimContract(ids) {
  return {
    exactKeys: [
      "claimId", "claimType", "statement", "evidenceIds", "advisoryOnly",
    ],
    fixedClaimIds: ids,
    claimType: "legality",
    evidenceIds: [EVIDENCE_ID],
    advisoryOnly: false,
    statementRule:
      "Write a concise evidence-bounded statement and quote relevant canonical identifiers verbatim.",
  };
}

function roleOutputContract(role) {
  const common = {
    schemaVersion: "starcraft_tmg_ctx2skill_role_output_contract_v1",
    role,
    outputLanguage: "English",
    noMarkdown: true,
    noExtraKeys: true,
    returnOuterEnvelope: {
      schemaVersion: "starcraft_tmg_offline_skill_role_output_v1",
      channels: { skill_generation_role_output: "ROLE_PAYLOAD_OBJECT" },
    },
  };
  if (role === "planner") return freeze({
    ...common,
    exactRoleKeys: ["summary", "questions", "learningObjectives"],
    fixedValues: {
      questionId: "question.how-to-play.workflow",
      evidenceIds: [EVIDENCE_ID],
    },
    requirements: [
      "Return exactly one question object with keys questionId,prompt,evidenceIds.",
      "Ask how one total How-to-Play Skill routes a live question from phase and chapter to an exact current RuleAtom and the authoritative Rules service.",
      "Return one to three concise learningObjectives strings.",
    ],
  });
  if (role === "tutor") return freeze({
    ...common,
    exactRoleKeys: ["summary", "claims", "lessonSteps"],
    claims: claimContract([
      "claim.index.binding", "claim.rules.authority",
    ]),
    fixedValues: {
      lessonStepId: "lesson.how-to-play.contract",
      lessonStepClaimIds: [
        "claim.index.binding", "claim.rules.authority",
      ],
    },
    requirements: [
      "Return exactly two claims using the fixed claim IDs.",
      "The index claim must describe one How-to-Play Skill over 10 chapters and 1,163 hash-bound RuleAtom references: 1,049 executable and 114 display-only.",
      "The authority claim must say the index routes retrieval but never replaces current Rules/Referee LegalSpace or state-transition authority.",
      "Return exactly one lessonSteps object with keys stepId,summary,claimIds.",
    ],
  });
  if (role === "student") return freeze({
    ...common,
    exactRoleKeys: ["summary", "claims", "answers", "uncertainties"],
    fixedValues: {
      claims: [],
      questionId: "question.how-to-play.workflow",
      answerClaimIds: ["claim.index.binding", "claim.rules.authority"],
      uncertainties: [],
    },
    requirements: [
      "Return exactly one answers object with keys questionId,answerSummary,claimIds.",
      "Explain phase/topic to chapter routing, exact RuleAtom retrieval, and the Rules-owned LegalSpace boundary.",
    ],
  });
  if (role === "challenger") return freeze({
    ...common,
    exactRoleKeys: ["summary", "probes"],
    fixedValues: {
      probeId: "probe.illegal.index-as-authority",
      kind: "illegal_boundary",
      targetClaimId: "claim.rules.authority",
    },
    requirements: [
      "Return exactly one probe object with keys probeId,kind,targetClaimId,prompt.",
      "Probe using an index summary or display-only historical atom as live legality without exact retrieval and current Rules verification.",
    ],
  });
  if (role === "reasoner") return freeze({
    ...common,
    exactRoleKeys: ["summary", "claims", "resolutions"],
    claims: claimContract([
      "claim.atom.retrieval", "claim.action.lifecycle",
    ]),
    fixedValues: {
      probeId: "probe.illegal.index-as-authority",
      disposition: "defended",
      resolutionClaimIds: [
        "claim.atom.retrieval", "claim.action.lifecycle",
      ],
    },
    requirements: [
      "Return exactly two new claims and one resolution object with keys probeId,disposition,decisionSummary,claimIds.",
      "The retrieval claim must require full RuleAtom lookup by evidenceId plus content, locator and current Rules receipt hash verification.",
      "The lifecycle claim must require LegalSpace, Preview, human confirmation, Apply, AcceptedReceipt and Replay, and fail closed on missing or drifted evidence.",
    ],
  });
  if (role === "proposer") return freeze({
    ...common,
    exactRoleKeys: ["summary", "revisionTargets", "candidatePlan"],
    fixedValues: {
      revisionTargets: [],
      candidatePlan: {
        skillId: SKILL_ID,
        version: SKILL_VERSION,
        skillType: "turn_flow",
        title: SKILL_TITLE,
        focusClaimIds: [
          "claim.index.binding", "claim.rules.authority",
          "claim.atom.retrieval", "claim.action.lifecycle",
        ],
      },
    },
    requirements: [
      "All independent fact verdicts passed, so revisionTargets must be an empty array.",
      "Return candidatePlan with exactly skillId,version,skillType,title,focusClaimIds and copy every fixed value exactly.",
    ],
  });
  if (role === "generator") return freeze({
    ...common,
    exactRoleKeys: ["summary", "claims", "candidateDraft"],
    fixedValues: {
      claims: [],
      candidateIdentity: {
        skillId: SKILL_ID,
        version: SKILL_VERSION,
        skillType: "turn_flow",
        title: SKILL_TITLE,
      },
      claimIds: [
        "claim.index.binding", "claim.rules.authority",
        "claim.atom.retrieval", "claim.action.lifecycle",
      ],
      unresolvedClaims: [],
    },
    candidateDraftExactKeys: [
      "skillId", "version", "skillType", "title", "summary", "claimIds",
      "procedure", "legalityChecks", "illegalPatterns", "examples",
      "counterExamples", "judgeTests", "unresolvedClaims",
    ],
    requirements: [
      "Copy the fixed candidate identity and claimIds exactly.",
      "Return one or more strings in procedure, legalityChecks, and illegalPatterns.",
      "Include at least one example and one counterExample.",
      "Return at least two judgeTests; each has exactly testId,kind,claimIds,expected.",
      "Include at least one expected=pass test and one expected=reject test; kinds must be positive, negative, counterexample, or cross_time.",
      "Use only the four fixed claim IDs in judgeTests.",
    ],
  });
  throw new TypeError(`unsupported paired role: ${role}`);
}

export function compileStarcraftTmgOfflineSkillRoleProviderRequestV2(
  input = {},
) {
  const job = assertStarcraftTmgSkillGenerationContract(
    input.jobManifest,
    "job-manifest",
  );
  if (job.promptPackRef.id !== promptPack.id
    || job.promptPackRef.version !== promptPack.version
    || job.promptPackRef.hash !== promptPack.promptPackHash
    || job.stagedInputHash !== proof.target.stagedInputHash
    || input.rolePacket?.stagedInput?.task?.taskId !== proof.target.taskId) {
    throw new TypeError("paired prompt pack or frozen task binding is invalid");
  }
  const base = compileStarcraftTmgOfflineSkillRoleProviderRequestV1(input);
  const outputContract = roleOutputContract(base.role);
  const promptContract = freeze({
    ...clone(base.promptContract),
    promptPackArtifact: clone(promptPack),
    roleOutputContract: clone(outputContract),
    evaluationContractRef: {
      id: "starcraft-tmg.slice170.complete-how-to-play-blind-evaluator.v2",
      hash: proof.common.evaluationContractHash,
      visibleDuringGeneration: false,
    },
  });
  const providerRequest = freeze({
    ...clone(base.providerRequest),
    promptNodes: [promptContract],
    userMessage:
      "Execute the sealed role. Return exactly the outer JSON envelope declared in roleOutputContract, with the role payload under channels.skill_generation_role_output. Follow every fixed value and exact-key rule; output no markdown and no additional fields.",
  });
  assertStarcraftTmgSkillGenerationCredentialFree(
    providerRequest,
    "paired Provider request",
  );
  const serializedBytes = Buffer.byteLength(
    JSON.stringify(providerRequest),
    "utf8",
  );
  if (serializedBytes > base.budget.maxInputTokens) {
    throw new TypeError("paired Provider request exceeds sealed input budget");
  }
  return freeze({
    ...clone(base),
    promptContract,
    promptContractHash: hashStarcraftTmgContract(promptContract),
    providerRequest,
    providerRequestHash: hashStarcraftTmgContract(providerRequest),
    serializedBytes,
    basePromptContractHash: base.promptContractHash,
    baseProviderRequestHash: base.providerRequestHash,
    promptPackHash: promptPack.promptPackHash,
    compilerVersion: STARCRAFT_TMG_OFFLINE_SKILL_PROMPT_COMPILER_V2_VERSION,
  });
}

export function createStarcraftTmgOfflineSkillProviderBrokerV2(options = {}) {
  const providerWorkerPort = options.providerWorkerPort;
  const costGuard = options.costGuard;
  if (typeof providerWorkerPort?.metadata !== "function"
    || typeof providerWorkerPort?.complete !== "function"
    || typeof costGuard?.metadata !== "function"
    || typeof costGuard?.authorizeAttempt !== "function"
    || typeof costGuard?.settleAttempt !== "function") {
    throw new TypeError("paired Provider broker ports are required");
  }
  let active = null;
  const workerProxy = freeze({
    metadata: (...args) => providerWorkerPort.metadata(...args),
    async complete(input) {
      if (!active
        || hashStarcraftTmgContract(input.providerRequest)
          !== active.baseProviderRequestHash) {
        throw new TypeError("paired Provider base request binding is invalid");
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
      if (!active || input.requestHash !== active.baseProviderRequestHash) {
        throw new TypeError("paired cost request binding is invalid");
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
    if (active) throw new TypeError("paired Provider broker is single-flight");
    const compiled = compileStarcraftTmgOfflineSkillRoleProviderRequestV2({
      jobManifest: input.jobManifest,
      rolePacket: input.rolePacket,
      requestId: input.attemptId,
    });
    active = compiled;
    try {
      const result = await baseBroker.completeRole(input);
      if (result.costAuthorization.requestHash !== compiled.providerRequestHash
        || result.receipt.providerRequestHash
          !== compiled.baseProviderRequestHash) {
        throw new TypeError("paired actual request cost lineage is invalid");
      }
      const { receiptHash: _oldHash, ...oldBody } = clone(result.receipt);
      const receipt = envelope({
        ...oldBody,
        schemaVersion:
          `${STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_V2_VERSION}.role-receipt`,
        promptContractHash: compiled.promptContractHash,
        providerRequestHash: compiled.providerRequestHash,
        basePromptContractHash: compiled.basePromptContractHash,
        baseProviderRequestHash: compiled.baseProviderRequestHash,
        promptPackHash: compiled.promptPackHash,
        promptCompilerVersion: compiled.compilerVersion,
        actualProviderRequestBound: true,
      }, "receiptHash");
      assertStarcraftTmgSkillGenerationCredentialFree(
        receipt,
        "paired Provider role receipt",
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
          `${STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_V2_VERSION}.metadata`,
        acceptedArms: ["dsh", "direct_provider_control"],
        promptPackHash: promptPack.promptPackHash,
        promptCompilerVersion:
          STARCRAFT_TMG_OFFLINE_SKILL_PROMPT_COMPILER_V2_VERSION,
        actualProviderRequestBound: true,
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

export function verifyStarcraftTmgOfflineSkillProviderRoleReceiptV2(value) {
  if (!object(value) || !HASH.test(String(value.receiptHash || ""))
    || !hashWithout(value, "receiptHash")
    || value.schemaVersion
      !== `${STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_V2_VERSION}.role-receipt`
    || value.promptPackHash !== promptPack.promptPackHash
    || value.promptCompilerVersion
      !== STARCRAFT_TMG_OFFLINE_SKILL_PROMPT_COMPILER_V2_VERSION
    || value.actualProviderRequestBound !== true
    || value.providerRequestHash === value.baseProviderRequestHash
    || ![value.promptContractHash, value.providerRequestHash,
      value.basePromptContractHash, value.baseProviderRequestHash]
      .every((hash) => HASH.test(String(hash || "")))
    || value.physicalAttempts !== 1
    || value.automaticRetries !== 0
    || value.canAffectRules !== false
    || value.mayPublishSkill !== false
    || value.trainingTruth !== false) {
    throw new TypeError("paired Provider role receipt is invalid");
  }
  assertStarcraftTmgSkillGenerationCredentialFree(
    value,
    "paired Provider role receipt",
  );
  return true;
}
