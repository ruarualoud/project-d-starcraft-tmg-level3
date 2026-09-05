import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { assertStarcraftTmgSkillGenerationCredentialFree } from
  "../skill-generation/contracts-v1.mjs";
import {
  createStarcraftTmgSlice170SkillJobV1,
} from "./paired-skill-proof-v1.mjs";
import {
  verifyStarcraftTmgOfflineSkillProviderRoleReceiptV5,
} from "./provider-broker-v5.mjs";
import { runTeachCtx2SkillRoleGraphV1 } from
  "./teach-ctx2skill-role-graph-v1.mjs";

export const STARCRAFT_TMG_CHALLENGER_CANARY_VERSION =
  "starcraft_tmg_challenger_canary_v1";

const STOP_CODE = "CHALLENGER_CANARY_ACCEPTED_STOP";
const HASH = /^[a-f0-9]{64}$/u;

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

function localRoleOutput(role, stagedInput) {
  const evidenceId = stagedInput.evidence[0].evidenceId;
  if (role === "planner") return {
    summary: "Construct the bounded total-rules routing question.",
    questions: [{
      questionId: "question.how-to-play.workflow",
      prompt:
        "How should current rule questions route through exact evidence and authoritative Rules decisions?",
      evidenceIds: [evidenceId],
    }],
    learningObjectives: [
      "Retrieve exact current RuleAtoms before asking for legality.",
      "Keep legality and state transitions in authoritative Rules services.",
    ],
  };
  if (role === "tutor") return {
    summary: "Provide the exact retrieval and Rules authority boundary.",
    claims: [
      {
        claimId: "claim.index.binding",
        claimType: "legality",
        statement:
          "The current index routes 1,163 RuleAtom references in 10 chapters without replacing exact RuleAtom retrieval.",
        evidenceIds: [evidenceId],
        advisoryOnly: false,
      },
      {
        claimId: "claim.rules.authority",
        claimType: "legality",
        statement:
          "Only the current Rules and Referee LegalSpace and transition services decide live legality and mutation.",
        evidenceIds: [evidenceId],
        advisoryOnly: false,
      },
    ],
    lessonSteps: [{
      stepId: "lesson.how-to-play.contract",
      summary:
        "Route to a chapter, retrieve exact evidence, then ask authoritative Rules.",
      claimIds: ["claim.index.binding", "claim.rules.authority"],
    }],
  };
  if (role === "student") return {
    summary: "Restate the retrieval and authority boundary.",
    claims: [],
    answers: [{
      questionId: "question.how-to-play.workflow",
      answerSummary:
        "Use the index for routing, retrieve exact evidence, and ask LegalSpace before mutation.",
      claimIds: ["claim.index.binding", "claim.rules.authority"],
    }],
    uncertainties: [],
  };
  throw Object.assign(new Error(`Unexpected local canary role: ${role}`), {
    code: "CHALLENGER_CANARY_LOCAL_ROLE_INVALID",
  });
}

export async function runStarcraftTmgChallengerCanaryV1(input = {}) {
  if (typeof input.broker?.completeRole !== "function"
    || typeof input.createId !== "function"
    || typeof input.now !== "function") {
    throw new TypeError("challenger canary dependencies are invalid");
  }
  const job = createStarcraftTmgSlice170SkillJobV1({
    arm: "direct_provider_control",
    stagedInput: input.stagedInput,
    egressAllowlistHash: input.egressAllowlistHash,
    createdAt: input.startedAt,
    budgetProfile: "challenger_canary_v1",
  });
  let brokerResult = null;
  let liveProviderCalls = 0;
  let advancedToReasoner = false;
  const localRoleOutputHashes = [];
  try {
    await runTeachCtx2SkillRoleGraphV1({
      runId: input.runId,
      stagedInput: input.stagedInput,
      async executeRole(packet) {
        const role = packet.request.role;
        if (["planner", "tutor", "student"].includes(role)) {
          const output = localRoleOutput(role, input.stagedInput);
          localRoleOutputHashes.push({
            role,
            outputHash: hashStarcraftTmgContract(output),
          });
          return output;
        }
        if (role === "challenger") {
          liveProviderCalls += 1;
          if (liveProviderCalls !== 1) {
            throw Object.assign(new Error("CHALLENGER_CANARY_CALL_LIMIT_EXCEEDED"), {
              code: "CHALLENGER_CANARY_CALL_LIMIT_EXCEEDED",
            });
          }
          brokerResult = await input.broker.completeRole({
            jobManifest: job,
            workerRef: input.workerRef,
            rolePacket: packet,
            attemptId: `canary-challenger-${input.createId("challenger")}`,
          });
          verifyStarcraftTmgOfflineSkillProviderRoleReceiptV5(
            brokerResult.receipt,
          );
          return brokerResult.roleOutput;
        }
        if (role === "reasoner" && brokerResult) {
          advancedToReasoner = true;
          throw Object.assign(new Error(STOP_CODE), { code: STOP_CODE });
        }
        throw Object.assign(new Error("CHALLENGER_CANARY_ROLE_BOUNDARY_INVALID"), {
          code: "CHALLENGER_CANARY_ROLE_BOUNDARY_INVALID",
        });
      },
      async judgeClaim() {
        throw new Error("CHALLENGER_CANARY_FACT_JUDGE_MUST_NOT_RUN");
      },
      async replayCandidate() {
        throw new Error("CHALLENGER_CANARY_REPLAY_MUST_NOT_RUN");
      },
    });
    throw new Error("CHALLENGER_CANARY_STOP_MISSING");
  } catch (error) {
    if (error?.code !== STOP_CODE || !brokerResult || !advancedToReasoner
      || liveProviderCalls !== 1) throw error;
  }
  const body = {
    schemaVersion: STARCRAFT_TMG_CHALLENGER_CANARY_VERSION,
    runId: input.runId,
    jobRef: {
      id: job.jobId,
      hash: job.integrity.hash,
      budgetProfile: "challenger_canary_v1",
    },
    taskRef: clone(input.stagedInput.task),
    stagedInputHash: input.stagedInput.stagedInputHash,
    localRoleOutputHashes,
    liveRole: "challenger",
    challengerRoleOutputHash:
      hashStarcraftTmgContract(brokerResult.roleOutput),
    providerRoleReceipt: clone(brokerResult.receipt),
    pricingReceipt: clone(brokerResult.pricingReceipt),
    budgetGrant: {
      grantHash: brokerResult.costAuthorization.authorizationHash,
      maxInputTokens: brokerResult.costAuthorization.maxInputTokens,
      maxOutputTokens: brokerResult.costAuthorization.maxOutputTokens,
      forecastCostNanoUsd:
        brokerResult.costAuthorization.forecastCostNanoUsd,
      forecastCostCnyMicros:
        brokerResult.costAuthorization.forecastCostCnyMicros,
    },
    budgetSettlement: {
      settlementHash: brokerResult.costSettlement.settlementHash,
      actualOrConservativeCostNanoUsd:
        brokerResult.costSettlement.actualOrConservativeCostNanoUsd,
      actualOrConservativeCostCnyMicros:
        brokerResult.costSettlement.actualOrConservativeCostCnyMicros,
      disposition: brokerResult.costSettlement.disposition,
      forecastExceeded: brokerResult.costSettlement.forecastExceeded,
    },
    roleGraphAdvancedTo: "reasoner",
    providerAttempts: 1,
    automaticRetries: 0,
    candidateEmissions: 0,
    candidatesPromoted: 0,
    sourceRefreshPerformed: false,
    rawPromptPersisted: false,
    rawResponsePersisted: false,
    rawReasoningPersisted: false,
    canAffectRules: false,
    canAffectStrategy: false,
    trainingTruth: false,
  };
  const result = envelope(body, "canaryHash");
  assertStarcraftTmgSkillGenerationCredentialFree(
    result,
    "challenger canary result",
  );
  return result;
}

export function verifyStarcraftTmgChallengerCanaryV1(value) {
  if (!value || value.schemaVersion !== STARCRAFT_TMG_CHALLENGER_CANARY_VERSION
    || !HASH.test(String(value.canaryHash || ""))) {
    throw new TypeError("challenger canary identity is invalid");
  }
  const copy = clone(value);
  const observed = copy.canaryHash;
  delete copy.canaryHash;
  if (observed !== hashStarcraftTmgContract(copy)
    || value.localRoleOutputHashes?.map((row) => row.role).join(",")
      !== "planner,tutor,student"
    || value.liveRole !== "challenger"
    || value.roleGraphAdvancedTo !== "reasoner"
    || value.providerAttempts !== 1
    || value.automaticRetries !== 0
    || value.candidateEmissions !== 0
    || value.candidatesPromoted !== 0
    || value.sourceRefreshPerformed !== false
    || value.rawPromptPersisted !== false
    || value.rawResponsePersisted !== false
    || value.rawReasoningPersisted !== false
    || value.canAffectRules !== false
    || value.canAffectStrategy !== false
    || value.trainingTruth !== false) {
    throw new TypeError("challenger canary closure is invalid");
  }
  verifyStarcraftTmgOfflineSkillProviderRoleReceiptV5(
    value.providerRoleReceipt,
  );
  if (value.budgetGrant?.maxInputTokens !== 32_000
    || value.budgetGrant?.maxOutputTokens !== 1_024
    || !HASH.test(String(value.budgetGrant?.grantHash || ""))
    || !HASH.test(String(value.budgetSettlement?.settlementHash || ""))
    || value.budgetSettlement?.forecastExceeded !== false) {
    throw new TypeError("challenger canary budget closure is invalid");
  }
  assertStarcraftTmgSkillGenerationCredentialFree(
    value,
    "challenger canary result",
  );
  return true;
}
