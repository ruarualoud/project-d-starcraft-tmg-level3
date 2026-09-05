import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/referee-crypto-v1.mjs";
import { STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_HOW_TO_PLAY_V9 as priorExecution } from
  "./ticket-17-slice-170-live-how-to-play-v9.mjs";

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
  schemaVersion: "starcraft_tmg_ticket_17_slice_170_live_how_to_play_v10",
  targetAttemptOrdinal: 10,
  outputDirectoryName: "how-to-play-attempt-10",
  priorMalformedGeneratorFailureAttempt: {
    purpose: "formal_production_catalogue_how_to_play_pair_recovery_8",
    targetAttemptOrdinal: 9,
    runId: "slice170-live-9da88b18-708c-47e6-a324-faa7f286d360",
    proofContractHash:
      "dd38347fa65b92ef1ce3a3864e6fdce51b249c9b9bcd5b107f46af7055106b36",
    executionContractHash: priorExecutionContractHash,
    reportHash:
      "e5aaa6224e9dc41ef9f8cc04625a49d0c1630304e492f0979478ed6584f4c686",
    lockHash:
      "12a20dbb7a5764d24968905e9d10cdeea49285fb88ebda452044c83d9b18de2d",
    failureCode: "OFFLINE_PROVIDER_ATTEMPT_FAILED",
    failedRole: "generator",
    failedArmInference: "direct_provider_control",
    failedArmInferenceBasis:
      "the paired runner executes seven dsh roles before seven control roles and retained thirteen ordered success receipts",
    providerWorkerCallsObserved: 14,
    physicalProviderAttemptsObserved: 14,
    successfulProviderReceiptsObserved: 13,
    automaticRetries: 0,
    successfulUsageKnown: true,
    failedCallUsageKnown: false,
    successfulInputTokens: 86_706,
    successfulOutputTokens: 4_153,
    successfulTotalTokens: 90_859,
    successfulCalculatedCostNanoUsd: 19_880_556,
    attemptCalculatedOrConservativeCostNanoUsd: 461_232_236,
    attemptCalculatedOrConservativeCostCnyMicros: 3_689_865,
    observedTransportFailureClass:
      "PROVIDER_WORKER_RESULT_VALIDATION_REJECTED",
    diagnosedUnderlyingFailureClass:
      "PROVIDER_RESPONSE_CONTRACT_REJECTED",
    diagnosisConfidence:
      "code_path_proven_and_locally_reproduced_but_raw_response_not_persisted",
    persistedCandidates: 0,
    reusableAsCandidateEvidence: false,
  },
  recovery: {
    priorRoleShapeCorrection: priorExecution.recovery.priorRoleShapeCorrection,
    primaryDiagnosis:
      "attempt 9 completed thirteen role calls and failed on the final control Generator because a post-egress response-contract failure omitted physicalAttempts=1; the contradictory safe receipt was rejected by the parent and collapsed to a generic validation code",
    diagnosisBasis: [
      "attempt_9_retained_thirteen_success_receipts_and_failed_on_final_generator",
      "attempt_9_total_physical_attempts_and_partial_usage_semantics_are_correct",
      "transport_output_parser_failure_constructed_may_have_been_sent_with_zero_attempts",
      "parent_failure_receipt_validator_correctly_rejected_that_contradiction",
      "ticket_16_transport_fixture_reproduced_and_closed_the_missing_attempt_field",
    ],
    correction:
      "thread the current physical-attempt count into both missing-content and malformed-content response errors; prove their hash-sealed failure receipts report mayHaveBeenSent=true, physicalAttempts=1, retries=0; prove a real child IPC failure receipt preserves PROVIDER_RESPONSE_CONTRACT_REJECTED without quarantining a healthy attached Worker",
    fullHostEvidenceChanged: false,
    modelFacingProjectionChanged: false,
    roleShapeContractChanged: false,
    rawProviderOutputPersisted: false,
    automaticRetryAllowed: false,
  },
  requiredFlags: [
    "--authorize-live-how-to-play-skill-pair-recovery-9-once",
    "--ack-attempt-9-fourteen-requests-conservatively-billed",
    "--ack-challenger-canary-passed-one-call",
    "--attest-credential-from-local-keychain-not-chat",
    "--ack-maximum-14-provider-attempts",
  ],
  costLedger: {
    ...priorExecution.costLedger,
    priorMalformedGeneratorFailureAttemptNanoUsd: 461_232_236,
    priorMalformedGeneratorFailureAttemptCnyMicros: 3_689_865,
    targetStartingNanoUsd: 3_800_965_932,
    targetStartingCnyMicros: 30_407_752,
    maximumNewPairNanoUsd: 6_178_923_520,
    maximumNewPairCnyMicros: 49_431_389,
    maximumCumulativeNanoUsd: 9_979_889_452,
    maximumCumulativeCnyMicros: 79_839_141,
    nextNotificationThresholdCnyMicros: 100_000_000,
    crossesNotificationThresholdAtMaximum: false,
  },
};

export const STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_HOW_TO_PLAY_V10 = freeze({
  ...body,
  executionContractHash: hashStarcraftTmgContract(body),
});
