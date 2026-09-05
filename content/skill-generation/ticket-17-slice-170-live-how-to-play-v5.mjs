import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/referee-crypto-v1.mjs";
import { STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_HOW_TO_PLAY_V4 as priorExecution } from
  "./ticket-17-slice-170-live-how-to-play-v4.mjs";

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
  schemaVersion: "starcraft_tmg_ticket_17_slice_170_live_how_to_play_v5",
  targetAttemptOrdinal: 5,
  outputDirectoryName: "how-to-play-attempt-5",
  priorTransientTransportAttempt: {
    purpose: "formal_production_catalogue_how_to_play_pair_recovery_3",
    targetAttemptOrdinal: 4,
    runId: "slice170-live-d23ea86d-a3d7-44d1-82bb-b6b0c346f8b8",
    proofContractHash:
      "dd38347fa65b92ef1ce3a3864e6fdce51b249c9b9bcd5b107f46af7055106b36",
    executionContractHash: priorExecutionContractHash,
    reportHash:
      "283bcae057a2ec7a6fb149db6365b8f4ac799ca3dd9ae97f62c4d51fcf98d76b",
    lockHash:
      "3d43e0750baa625bea4c4003622c6e772b34eff5d6e73f7bf285488ef6b8f205",
    failureCode: "OFFLINE_PROVIDER_ATTEMPT_FAILED",
    failedRole: "challenger",
    providerWorkerCallsObserved: 4,
    physicalProviderAttemptsObserved: 4,
    successfulProviderReceiptsObserved: 3,
    automaticRetries: 0,
    successfulUsageKnown: true,
    failedCallUsageKnown: false,
    successfulInputTokens: 880_751,
    successfulOutputTokens: 740,
    successfulTotalTokens: 881_491,
    successfulCalculatedCostNanoUsd: 194_062_772,
    attemptCalculatedOrConservativeCostNanoUsd: 635_414_452,
    attemptCalculatedOrConservativeCostCnyMicros: 5_083_318,
    balanceProbeAfterFailure: {
      status: 200,
      isAvailable: true,
      currency: "CNY",
      totalBalanceAtProbe: "632.38",
      billableTokens: 0,
    },
    candidatesEmitted: 0,
    reusableAsCandidateEvidence: false,
  },
  recovery: {
    priorRoleShapeCorrection: priorExecution.recovery.correction,
    primaryDiagnosis:
      "the v3 shape correction passed planner, tutor and student; the fourth challenger call failed at the Provider boundary while a subsequent official balance probe returned available",
    diagnosisBasis: [
      "three_v3_role_outputs_passed_before_challenger_transport_failure",
      "provider_failure_was_request_may_have_been_sent_with_zero_retry",
      "official_balance_probe_returned_http_200_and_is_available_true",
      "v3_broker_failure_projection_did_not_retain_transport_code_or_status",
    ],
    correction:
      "preserve v3 history; add v4 paired Broker capture of the underlying transport failure receipt across the Broker boundary, including safe code/status and no response body",
    roleShapeContractChanged: false,
    rawProviderOutputPersisted: false,
    automaticRetryAllowed: false,
  },
  requiredFlags: [
    "--authorize-live-how-to-play-skill-pair-recovery-4-once",
    "--ack-attempt-4-four-requests-conservatively-billed",
    "--attest-credential-from-local-keychain-not-chat",
    "--ack-maximum-14-provider-attempts",
  ],
  costLedger: {
    ...priorExecution.costLedger,
    priorTransientTransportAttemptNanoUsd: 635_414_452,
    priorTransientTransportAttemptCnyMicros: 5_083_318,
    targetStartingNanoUsd: 1_360_703_272,
    targetStartingCnyMicros: 10_885_632,
    maximumNewPairNanoUsd: 6_178_923_520,
    maximumNewPairCnyMicros: 49_431_389,
    maximumCumulativeNanoUsd: 7_539_626_792,
    maximumCumulativeCnyMicros: 60_317_021,
    nextNotificationThresholdCnyMicros: 100_000_000,
    crossesNotificationThresholdAtMaximum: false,
  },
};

export const STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_HOW_TO_PLAY_V5 = freeze({
  ...body,
  executionContractHash: hashStarcraftTmgContract(body),
});
