import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/referee-crypto-v1.mjs";
import { STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_HOW_TO_PLAY_V8 as priorExecution } from
  "./ticket-17-slice-170-live-how-to-play-v8.mjs";

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
  schemaVersion: "starcraft_tmg_ticket_17_slice_170_live_how_to_play_v9",
  targetAttemptOrdinal: 9,
  outputDirectoryName: "how-to-play-attempt-9",
  priorGeneratorParentValidationFailureAttempt: {
    purpose: "formal_production_catalogue_how_to_play_pair_recovery_7",
    targetAttemptOrdinal: 8,
    runId: "slice170-live-af87c155-2cbb-43d0-9b63-e99ab361da70",
    proofContractHash:
      "dd38347fa65b92ef1ce3a3864e6fdce51b249c9b9bcd5b107f46af7055106b36",
    executionContractHash: priorExecutionContractHash,
    reportHash:
      "03c6e949d1465493d55705e47010f67df88d95cf7b549fa321c883c2fd5992b6",
    lockHash:
      "a19e569cd45cc853fdbf9def7250e6f1b995427090546534fa033dc79684030f",
    failureCode: "OFFLINE_PROVIDER_ATTEMPT_FAILED",
    failedRole: "generator",
    providerWorkerCallsObserved: 7,
    reportedPhysicalProviderAttemptsObserved: 1,
    reconstructedPhysicalProviderAttemptsObserved: 7,
    successfulProviderReceiptsObserved: 6,
    automaticRetries: 0,
    successfulUsageKnown: true,
    failedCallUsageKnown: false,
    successfulInputTokens: 39_039,
    successfulOutputTokens: 1_467,
    successfulTotalTokens: 40_506,
    successfulCalculatedCostNanoUsd: 9_120_576,
    attemptCalculatedOrConservativeCostNanoUsd: 450_472_256,
    attemptCalculatedOrConservativeCostCnyMicros: 3_603_783,
    transportFailureClass: "PROVIDER_WORKER_RESULT_VALIDATION_REJECTED",
    providerWorkerState: "attached",
    candidatesEmitted: 0,
    reusableAsCandidateEvidence: false,
  },
  recovery: {
    priorRoleShapeCorrection: priorExecution.recovery.priorRoleShapeCorrection,
    primaryDiagnosis:
      "attempt 8 passed six model roles and failed at Generator after a seventh request; the Provider Worker parent emitted only an unclassified TypeError, and the v8 failure report separately undercounted seven physical calls as one and mislabeled partial known usage as whole-attempt known",
    diagnosisBasis: [
      "attempt_8_six_success_receipts_then_generator_failure",
      "attempt_8_parent_validation_failure_had_no_stage_specific_safe_code",
      "attempt_8_seven_worker_calls_reconstruct_seven_physical_attempts",
      "attempt_8_reported_only_final_failure_receipt_physical_attempt_count",
      "attempt_8_failed_call_usage_is_unknown_despite_six_known_success_receipts",
    ],
    correction:
      "classify parent envelope request binding, envelope shape, envelope identity and post-validation normalization separately; extend real IPC gates through all fourteen roles, thirteen rejection classes and a near-256-KiB success; reconstruct failure physical attempts from success receipts plus the final failure receipt and distinguish successfulUsageKnown from failedCallUsageKnown",
    fullHostEvidenceChanged: false,
    modelFacingProjectionChanged: false,
    roleShapeContractChanged: false,
    rawProviderOutputPersisted: false,
    automaticRetryAllowed: false,
  },
  requiredFlags: [
    "--authorize-live-how-to-play-skill-pair-recovery-8-once",
    "--ack-attempt-8-seven-requests-conservatively-billed",
    "--ack-challenger-canary-passed-one-call",
    "--attest-credential-from-local-keychain-not-chat",
    "--ack-maximum-14-provider-attempts",
  ],
  costLedger: {
    ...priorExecution.costLedger,
    priorGeneratorParentValidationFailureAttemptNanoUsd: 450_472_256,
    priorGeneratorParentValidationFailureAttemptCnyMicros: 3_603_783,
    targetStartingNanoUsd: 3_339_733_696,
    targetStartingCnyMicros: 26_717_887,
    maximumNewPairNanoUsd: 6_178_923_520,
    maximumNewPairCnyMicros: 49_431_389,
    maximumCumulativeNanoUsd: 9_518_657_216,
    maximumCumulativeCnyMicros: 76_149_276,
    nextNotificationThresholdCnyMicros: 100_000_000,
    crossesNotificationThresholdAtMaximum: false,
  },
};

export const STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_HOW_TO_PLAY_V9 = freeze({
  ...body,
  executionContractHash: hashStarcraftTmgContract(body),
});
