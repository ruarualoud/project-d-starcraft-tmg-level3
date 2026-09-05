import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/referee-crypto-v1.mjs";
import { STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_HOW_TO_PLAY_V10 as priorExecution } from
  "./ticket-17-slice-170-live-how-to-play-v10.mjs";

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
  schemaVersion: "starcraft_tmg_ticket_17_slice_170_live_how_to_play_v11",
  targetAttemptOrdinal: 11,
  outputDirectoryName: "how-to-play-attempt-11",
  priorExactResponseContractFailureAttempt: {
    purpose: "formal_production_catalogue_how_to_play_pair_recovery_9",
    targetAttemptOrdinal: 10,
    runId: "slice170-live-84b4a12b-7df4-4d46-a756-05f59a31ffca",
    proofContractHash:
      "dd38347fa65b92ef1ce3a3864e6fdce51b249c9b9bcd5b107f46af7055106b36",
    executionContractHash: priorExecutionContractHash,
    reportHash:
      "c4e97e1f6c67087721ea862037c6e72dc2095da16328d590245bf3520b013e4e",
    lockHash:
      "8d30c179b53168d1c55ef7e15afbea5adb04ddb3c56a03dec09913f2ca47ca78",
    failureCode: "OFFLINE_PROVIDER_ATTEMPT_FAILED",
    failedRole: "generator",
    providerWorkerCallsObserved: 7,
    physicalProviderAttemptsObserved: 7,
    successfulProviderReceiptsObserved: 6,
    automaticRetries: 0,
    successfulUsageKnown: true,
    failedCallUsageKnown: false,
    successfulInputTokens: 39_106,
    successfulOutputTokens: 1_863,
    successfulTotalTokens: 40_969,
    successfulCalculatedCostNanoUsd: 9_396_676,
    attemptCalculatedOrConservativeCostNanoUsd: 450_748_356,
    attemptCalculatedOrConservativeCostCnyMicros: 3_605_991,
    transportFailureClass: "PROVIDER_RESPONSE_CONTRACT_REJECTED",
    providerWorkerState: "attached",
    persistedCandidates: 0,
    reusableAsCandidateEvidence: false,
  },
  recovery: {
    priorRoleShapeCorrection: priorExecution.recovery.priorRoleShapeCorrection,
    primaryDiagnosis:
      "attempt 10 proved the transport and parent now preserve the true Generator failure: DeepSeek JSON mode returned content that was missing or not a complete JSON object while the Worker remained healthy",
    diagnosisBasis: [
      "attempt_10_exact_transport_failure_was_provider_response_contract_rejected",
      "attempt_10_worker_remained_attached_and_was_not_quarantined",
      "attempt_10_six_prior_roles_had_known_usage_and_valid_outputs",
      "deepseek_official_json_mode_docs_warn_of_empty_content_and_truncation",
      "prior_prompt_allowed_expansion_of_one_or_more_generator_arrays_and_unbounded_write_text",
    ],
    correction:
      "classify empty content, invalid JSON and output truncation separately from finish_reason; use prompt compiler v5 to require one compact complete JSON object, cap every WRITE replacement at 240 characters, preserve exact template array cardinality, forbid staged-input repetition, and prioritize closing syntax over elaboration without changing the role schema or total budget",
    fullHostEvidenceChanged: false,
    modelFacingProjectionChanged: true,
    roleShapeContractChanged: false,
    rawProviderOutputPersisted: false,
    automaticRetryAllowed: false,
  },
  requiredFlags: [
    "--authorize-live-how-to-play-skill-pair-recovery-10-once",
    "--ack-attempt-10-seven-requests-conservatively-billed",
    "--ack-deepseek-json-completion-safety-prompt-v5",
    "--attest-credential-from-local-keychain-not-chat",
    "--ack-maximum-14-provider-attempts",
  ],
  costLedger: {
    ...priorExecution.costLedger,
    priorExactResponseContractFailureAttemptNanoUsd: 450_748_356,
    priorExactResponseContractFailureAttemptCnyMicros: 3_605_991,
    targetStartingNanoUsd: 4_251_714_288,
    targetStartingCnyMicros: 34_013_743,
    maximumNewPairNanoUsd: 6_178_923_520,
    maximumNewPairCnyMicros: 49_431_389,
    maximumCumulativeNanoUsd: 10_430_637_808,
    maximumCumulativeCnyMicros: 83_445_132,
    nextNotificationThresholdCnyMicros: 100_000_000,
    crossesNotificationThresholdAtMaximum: false,
  },
};

export const STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_HOW_TO_PLAY_V11 = freeze({
  ...body,
  executionContractHash: hashStarcraftTmgContract(body),
});
