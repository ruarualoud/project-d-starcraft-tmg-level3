import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/referee-crypto-v1.mjs";
import { STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_CHALLENGER_CANARY_V1 as canaryExecution } from
  "./ticket-17-slice-170-live-challenger-canary-v1.mjs";
import { STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_HOW_TO_PLAY_V7 as priorExecution } from
  "./ticket-17-slice-170-live-how-to-play-v7.mjs";

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
  schemaVersion: "starcraft_tmg_ticket_17_slice_170_live_how_to_play_v8",
  targetAttemptOrdinal: 8,
  outputDirectoryName: "how-to-play-attempt-8",
  priorParentValidationFailureAttempt: {
    purpose: "formal_production_catalogue_how_to_play_pair_recovery_6",
    targetAttemptOrdinal: 7,
    runId: "slice170-live-fbff038c-f061-49b4-81ed-72abc24502af",
    proofContractHash:
      "dd38347fa65b92ef1ce3a3864e6fdce51b249c9b9bcd5b107f46af7055106b36",
    executionContractHash: priorExecutionContractHash,
    reportHash:
      "b5d3606a7e9ffee3902df721b17def311b4e18340620268f3a6c4a8d6cb4b96f",
    lockHash:
      "35a6396e71b8c6c6c10c237bfe8a8136b194284535b1c041072b205a14b7df5f",
    failureCode: "OFFLINE_PROVIDER_ATTEMPT_FAILED",
    failedRole: "challenger",
    providerWorkerCallsObserved: 4,
    physicalProviderAttemptsObserved: 4,
    successfulProviderReceiptsObserved: 3,
    automaticRetries: 0,
    successfulUsageKnown: true,
    failedCallUsageKnown: false,
    successfulInputTokens: 18_330,
    successfulOutputTokens: 772,
    successfulTotalTokens: 19_102,
    successfulCalculatedCostNanoUsd: 4_351_272,
    attemptCalculatedOrConservativeCostNanoUsd: 445_702_952,
    attemptCalculatedOrConservativeCostCnyMicros: 3_565_626,
    transportFailureClass: "PROVIDER_WORKER_RESULT_VALIDATION_REJECTED",
    candidatesEmitted: 0,
    reusableAsCandidateEvidence: false,
  },
  priorChallengerCanary: {
    purpose: canaryExecution.purpose,
    runId: "slice170.canary.7c2b2966-b2a2-4654-bb02-27592e6a039d",
    executionContractHash: canaryExecution.executionContractHash,
    preflightReportHash:
      "d723bfb64a68d1c323dd8752fee6db3de1c9f7a8f733935a0363b2bead385b88",
    reportHash:
      "a71e65a3a9f004742e4aecc188d4c7b8b617d60eebed00f7c7794da81e433712",
    lockHash:
      "facfa7740a33538bbc0ed60fa06b622ed5f4bb12b6727ad9bb98c838050108f2",
    providerPhysicalAttempts: 1,
    automaticRetries: 0,
    inputTokens: 7_194,
    outputTokens: 175,
    totalTokens: 7_369,
    calculatedCostNanoUsd: 1_643_652,
    calculatedCostCnyMicros: 13_150,
    roleGraphAdvancedTo: "reasoner",
    candidateEmissions: 0,
    candidatesPromoted: 0,
  },
  recovery: {
    priorRoleShapeCorrection: priorExecution.recovery.priorRoleShapeCorrection,
    primaryDiagnosis:
      "attempt 7 proved the classified child accepted the Challenger response while the frozen parent v1 rejected it; the independent parent v2 now uses the shared classifier, passed a 14-call real-IPC paired fixture and ten-class fault matrix, and passed a one-call live Challenger canary",
    diagnosisBasis: [
      "attempt_7_failed_at_frozen_parent_after_classified_child_success",
      "independent_parent_v2_does_not_compose_frozen_parent_v1",
      "real_ipc_two_arm_seven_role_fixture_passed",
      "ten_result_fault_classes_were_classified_and_quarantined",
      "one_live_challenger_canary_passed_with_7369_tokens",
    ],
    correction:
      "use the independent v2 parent and fixed classified child for the formal pair; retain v1 metadata compatibility only at the Broker port contract, require current source-bound preflight and the immutable live canary before Keychain ingress",
    fullHostEvidenceChanged: false,
    modelFacingProjectionChanged: false,
    roleShapeContractChanged: false,
    rawProviderOutputPersisted: false,
    automaticRetryAllowed: false,
  },
  requiredFlags: [
    "--authorize-live-how-to-play-skill-pair-recovery-7-once",
    "--ack-attempt-7-four-requests-conservatively-billed",
    "--ack-challenger-canary-passed-one-call",
    "--attest-credential-from-local-keychain-not-chat",
    "--ack-maximum-14-provider-attempts",
  ],
  costLedger: {
    ...priorExecution.costLedger,
    priorParentValidationFailureAttemptNanoUsd: 445_702_952,
    priorParentValidationFailureAttemptCnyMicros: 3_565_626,
    priorChallengerCanaryNanoUsd: 1_643_652,
    priorChallengerCanaryCnyMicros: 13_150,
    targetStartingNanoUsd: 2_889_261_440,
    targetStartingCnyMicros: 23_114_104,
    maximumNewPairNanoUsd: 6_178_923_520,
    maximumNewPairCnyMicros: 49_431_389,
    maximumCumulativeNanoUsd: 9_068_184_960,
    maximumCumulativeCnyMicros: 72_545_493,
    nextNotificationThresholdCnyMicros: 100_000_000,
    crossesNotificationThresholdAtMaximum: false,
  },
};

export const STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_HOW_TO_PLAY_V8 = freeze({
  ...body,
  executionContractHash: hashStarcraftTmgContract(body),
});
