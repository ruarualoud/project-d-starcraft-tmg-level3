import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/referee-crypto-v1.mjs";
import { STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_HOW_TO_PLAY_V3 as priorExecution } from
  "./ticket-17-slice-170-live-how-to-play-v3.mjs";

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

const {
  executionContractHash: priorExecutionContractHash,
  ...priorBody
} = priorExecution;

const body = {
  ...priorBody,
  schemaVersion: "starcraft_tmg_ticket_17_slice_170_live_how_to_play_v4",
  targetAttemptOrdinal: 4,
  outputDirectoryName: "how-to-play-attempt-4",
  priorRoleShapeAttempt: {
    purpose: "formal_production_catalogue_how_to_play_pair_recovery_2",
    targetAttemptOrdinal: 3,
    runId: "slice170-live-fbdc5896-017f-41a7-ab77-21a77a9c27df",
    proofContractHash:
      "dd38347fa65b92ef1ce3a3864e6fdce51b249c9b9bcd5b107f46af7055106b36",
    executionContractHash: priorExecutionContractHash,
    reportHash:
      "ec4268a59976812676273440bb3f3ba6a68c877b5a5c8a0c95e587c53eaa066b",
    lockHash:
      "e1a300629adbd8e24e71f51514173711ff5323233316e1dc7517297f126ee2d6",
    failureCode: "TEACH_CTX2SKILL_STUDENT_ANSWERS_INVALID",
    providerWorkerCallsObserved: 3,
    physicalProviderAttemptsObserved: 3,
    automaticRetries: 0,
    usageKnown: true,
    inputTokens: 880_020,
    outputTokens: 841,
    totalTokens: 880_861,
    calculatedCostNanoUsd: 194_023_140,
    calculatedCostCnyMicros: 1_552_187,
    candidatesEmitted: 0,
    reusableAsCandidateEvidence: false,
  },
  recovery: {
    priorTransportProjectionCorrection:
      priorExecution.recovery.priorTransportProjectionCorrection,
    priorOptionalUsageCorrection: priorExecution.recovery.correction,
    primaryDiagnosis:
      "student answers failed the generic role graph cardinality gate after three valid billed Provider responses; the v2 prompt described one answers object but the runtime requires a one-item answers array",
    diagnosisBasis: [
      "failure_code_is_exact_student_answers_container_gate",
      "planner_and_tutor_outputs_passed_before_student_failure",
      "v2_student_requirement_used_ambiguous_one_answers_object_wording",
      "deepseek_chat_json_mode_guarantees_json_not_application_schema",
    ],
    correction:
      "preserve v2 history; add v3 paired broker with an exact outer JSON template, explicit one-item array semantics for every role, deterministic shape validation, and payload-free shape failure receipts",
    rawProviderOutputPersisted: false,
    deterministicPayloadRepairAllowed: false,
    automaticRetryAllowed: false,
  },
  requiredFlags: [
    "--authorize-live-how-to-play-skill-pair-recovery-3-once",
    "--ack-attempt-3-three-requests-billed",
    "--attest-credential-from-local-keychain-not-chat",
    "--ack-maximum-14-provider-attempts",
  ],
  costLedger: {
    ...priorExecution.costLedger,
    priorRoleShapeAttemptNanoUsd: 194_023_140,
    priorRoleShapeAttemptCnyMicros: 1_552_187,
    targetStartingNanoUsd: 725_288_820,
    targetStartingCnyMicros: 5_802_314,
    maximumNewPairNanoUsd: 6_178_923_520,
    maximumNewPairCnyMicros: 49_431_389,
    maximumCumulativeNanoUsd: 6_904_212_340,
    maximumCumulativeCnyMicros: 55_233_703,
    nextNotificationThresholdCnyMicros: 100_000_000,
    crossesNotificationThresholdAtMaximum: false,
  },
};

export const STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_HOW_TO_PLAY_V4 = freeze({
  ...body,
  executionContractHash: hashStarcraftTmgContract(body),
});
