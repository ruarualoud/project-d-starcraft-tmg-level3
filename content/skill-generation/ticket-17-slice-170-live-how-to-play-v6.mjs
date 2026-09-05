import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/referee-crypto-v1.mjs";
import { STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_HOW_TO_PLAY_V5 as priorExecution } from
  "./ticket-17-slice-170-live-how-to-play-v5.mjs";

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
  schemaVersion: "starcraft_tmg_ticket_17_slice_170_live_how_to_play_v6",
  targetAttemptOrdinal: 6,
  outputDirectoryName: "how-to-play-attempt-6",
  priorTransportDiagnosticAttempt: {
    purpose: "formal_production_catalogue_how_to_play_pair_recovery_4",
    targetAttemptOrdinal: 5,
    runId: "slice170-live-07fd7a41-d174-42d9-9f3f-30094f7bd69e",
    proofContractHash:
      "dd38347fa65b92ef1ce3a3864e6fdce51b249c9b9bcd5b107f46af7055106b36",
    executionContractHash: priorExecutionContractHash,
    reportHash:
      "23a8bfc213831ca7405abc6f5379eab9d2c4c092d04cdc142cb396b86475f7d5",
    lockHash:
      "11c4277eb52c880a1c4b956b0ed16fd5552009cb11f4c3c4fc03c03fc28b4746",
    failureCode: "OFFLINE_PROVIDER_ATTEMPT_FAILED",
    failedRole: "challenger",
    providerWorkerCallsObserved: 4,
    physicalProviderAttemptsObserved: 4,
    successfulProviderReceiptsObserved: 3,
    automaticRetries: 0,
    successfulUsageKnown: true,
    failedCallUsageKnown: false,
    successfulInputTokens: 880_816,
    successfulOutputTokens: 808,
    successfulTotalTokens: 881_624,
    successfulCalculatedCostNanoUsd: 194_121_952,
    attemptCalculatedOrConservativeCostNanoUsd: 635_473_632,
    attemptCalculatedOrConservativeCostCnyMicros: 5_083_791,
    transportFailureReceiptPreserved: false,
    candidatesEmitted: 0,
    reusableAsCandidateEvidence: false,
  },
  recovery: {
    priorRoleShapeCorrection: priorExecution.recovery.priorRoleShapeCorrection,
    primaryDiagnosis:
      "attempts 4 and 5 passed planner, tutor and student then failed the challenger request; official DeepSeek V4 documentation declares a 1M context, so the observed approximately 295K successful inputs do not prove a context-limit failure; the legacy Worker boundary cannot distinguish a Provider failure from local success-result rejection",
    diagnosisBasis: [
      "same_fourth_challenger_boundary_failed_in_two_independent_attempts",
      "three_preceding_v3_outputs_passed_exact_shape_and_usage_validation",
      "official_deepseek_v4_flash_context_is_one_million_tokens",
      "attempt_5_transport_receipt_was_null_after_v4_capture",
      "full_index_was_repeated_in_every_role_prompt_at_approximately_778_kilobytes",
    ],
    correction:
      "preserve every prior version and attempt; replace only the model-facing full staged index with a deterministic hash-complete 10-chapter projection while the trusted host retains and validates all 1,163 entries; classify receipt-bearing transport failure separately from local Worker result-validation rejection without retaining any response payload",
    fullHostEvidenceChanged: false,
    modelFacingProjectionChanged: true,
    roleShapeContractChanged: false,
    rawProviderOutputPersisted: false,
    automaticRetryAllowed: false,
  },
  requiredFlags: [
    "--authorize-live-how-to-play-skill-pair-recovery-5-once",
    "--ack-attempt-5-four-requests-conservatively-billed",
    "--attest-credential-from-local-keychain-not-chat",
    "--ack-maximum-14-provider-attempts",
  ],
  costLedger: {
    ...priorExecution.costLedger,
    priorTransportDiagnosticAttemptNanoUsd: 635_473_632,
    priorTransportDiagnosticAttemptCnyMicros: 5_083_791,
    targetStartingNanoUsd: 1_996_176_904,
    targetStartingCnyMicros: 15_969_423,
    maximumNewPairNanoUsd: 6_178_923_520,
    maximumNewPairCnyMicros: 49_431_389,
    maximumCumulativeNanoUsd: 8_175_100_424,
    maximumCumulativeCnyMicros: 65_400_812,
    nextNotificationThresholdCnyMicros: 100_000_000,
    crossesNotificationThresholdAtMaximum: false,
  },
};

export const STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_HOW_TO_PLAY_V6 = freeze({
  ...body,
  executionContractHash: hashStarcraftTmgContract(body),
});
