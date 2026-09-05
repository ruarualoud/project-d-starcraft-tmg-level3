import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/referee-crypto-v1.mjs";
import { STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_HOW_TO_PLAY_V6 as priorExecution } from
  "./ticket-17-slice-170-live-how-to-play-v6.mjs";

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
  schemaVersion: "starcraft_tmg_ticket_17_slice_170_live_how_to_play_v7",
  targetAttemptOrdinal: 7,
  outputDirectoryName: "how-to-play-attempt-7",
  priorClassifiedFailureAttempt: {
    purpose: "formal_production_catalogue_how_to_play_pair_recovery_5",
    targetAttemptOrdinal: 6,
    runId: "slice170-live-e60e1612-2bec-40c0-a6cb-d1a90ac19e96",
    proofContractHash:
      "dd38347fa65b92ef1ce3a3864e6fdce51b249c9b9bcd5b107f46af7055106b36",
    executionContractHash: priorExecutionContractHash,
    reportHash:
      "78894465ac03a783dbf9c34f125de631386eca3b259b56b4f385655ab922389a",
    lockHash:
      "bfa8a9af848573717cfe584ece9c8abaa46b005e833e35cfccf52ce5b3763de9",
    failureCode: "OFFLINE_PROVIDER_ATTEMPT_FAILED",
    failedRole: "challenger",
    providerWorkerCallsObserved: 4,
    physicalProviderAttemptsObserved: 4,
    successfulProviderReceiptsObserved: 3,
    automaticRetries: 0,
    successfulUsageKnown: true,
    failedCallUsageKnown: false,
    successfulInputTokens: 18_360,
    successfulOutputTokens: 815,
    successfulTotalTokens: 19_175,
    successfulCalculatedCostNanoUsd: 4_386_252,
    attemptCalculatedOrConservativeCostNanoUsd: 445_737_932,
    attemptCalculatedOrConservativeCostCnyMicros: 3_565_905,
    transportFailureClass: "PROVIDER_WORKER_RESULT_VALIDATION_REJECTED",
    providerWorkerState: "attached",
    candidatesEmitted: 0,
    reusableAsCandidateEvidence: false,
  },
  recovery: {
    priorRoleShapeCorrection: priorExecution.recovery.priorRoleShapeCorrection,
    primaryDiagnosis:
      "the compact projection reduced three-role usage by approximately 97.8 percent but reproduced the same fourth-role failure; v5 diagnostics proved the Provider Worker remained attached and rejected a success-shaped result locally, while the frozen v1 port did not expose which validation category failed",
    diagnosisBasis: [
      "attempt_6_compact_input_three_role_total_was_19175_tokens",
      "attempt_6_failed_again_at_fourth_challenger_role",
      "transport_failure_class_was_provider_worker_result_validation_rejected",
      "provider_worker_state_remained_attached",
      "transport_failure_receipt_was_null_because_frozen_v1_validation_threw_type_error",
    ],
    correction:
      "preserve the frozen v1 Worker and wire contract; introduce a v2 composition using a fixed isolated child that runs the same success checks before IPC and converts each rejection category to a payload-free safe Provider receipt",
    fullHostEvidenceChanged: false,
    modelFacingProjectionChanged: false,
    roleShapeContractChanged: false,
    rawProviderOutputPersisted: false,
    automaticRetryAllowed: false,
  },
  requiredFlags: [
    "--authorize-live-how-to-play-skill-pair-recovery-6-once",
    "--ack-attempt-6-four-requests-conservatively-billed",
    "--attest-credential-from-local-keychain-not-chat",
    "--ack-maximum-14-provider-attempts",
  ],
  costLedger: {
    ...priorExecution.costLedger,
    priorClassifiedFailureAttemptNanoUsd: 445_737_932,
    priorClassifiedFailureAttemptCnyMicros: 3_565_905,
    targetStartingNanoUsd: 2_441_914_836,
    targetStartingCnyMicros: 19_535_328,
    maximumNewPairNanoUsd: 6_178_923_520,
    maximumNewPairCnyMicros: 49_431_389,
    maximumCumulativeNanoUsd: 8_620_838_356,
    maximumCumulativeCnyMicros: 68_966_717,
    nextNotificationThresholdCnyMicros: 100_000_000,
    crossesNotificationThresholdAtMaximum: false,
  },
};

export const STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_HOW_TO_PLAY_V7 = freeze({
  ...body,
  executionContractHash: hashStarcraftTmgContract(body),
});
