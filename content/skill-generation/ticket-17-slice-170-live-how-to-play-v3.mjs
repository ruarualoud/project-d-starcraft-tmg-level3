import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/referee-crypto-v1.mjs";
import { STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_HOW_TO_PLAY_V2 as priorExecution } from
  "./ticket-17-slice-170-live-how-to-play-v2.mjs";

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
  schemaVersion: "starcraft_tmg_ticket_17_slice_170_live_how_to_play_v3",
  targetAttemptOrdinal: 3,
  outputDirectoryName: "how-to-play-attempt-3",
  priorRecoveryAttempt: {
    purpose: "formal_production_catalogue_how_to_play_pair_recovery_1",
    targetAttemptOrdinal: 2,
    runId: "slice170-live-59466679-a654-42fc-9707-675ee2f05bd9",
    proofContractHash:
      "dd38347fa65b92ef1ce3a3864e6fdce51b249c9b9bcd5b107f46af7055106b36",
    executionContractHash: priorExecutionContractHash,
    reportHash:
      "86972ba26fd367c455e2dfa98716d0bf0c0e2e95d706bd7a2f0007e0cea6d004",
    lockHash:
      "dbeff8f67b03dd4da87fa647e43a43a8e05d328618950f2ed7aa0b98abc56cfc",
    failureCode: "OFFLINE_PROVIDER_RESULT_REJECTED",
    providerWorkerCallsObserved: 1,
    physicalProviderAttemptsObserved: 1,
    automaticRetries: 0,
    requestDefinitelyNotSent: false,
    requestMayHaveBeenSent: true,
    usageKnown: false,
    conservativeCostNanoUsd: 441_351_680,
    conservativeCostCnyMicros: 3_530_814,
    candidatesEmitted: 0,
    reusableAsCandidateEvidence: false,
  },
  recovery: {
    priorTransportProjectionCorrection:
      priorExecution.recovery.correction,
    primaryDiagnosis:
      "the Provider success receipt may omit reasoningOutputUnits when thinking is disabled, while the Broker incorrectly required the optional field",
    diagnosisBasis: [
      "ticket_16_real_success_receipt_omits_reasoning_breakdown",
      "provider_transport_contract_marks_reasoning_breakdown_optional",
      "slice_170_fourteen_node_missing-reasoning regression passes after correction",
    ],
    correction:
      "accept an absent optional reasoning breakdown and normalize downstream harness usage to zero; retain strict rejection for malformed present values",
    safeResultRejectionClassificationAdded: true,
    rawProviderOutputPersisted: false,
  },
  requiredFlags: [
    "--authorize-live-how-to-play-skill-pair-recovery-2-once",
    "--ack-attempt-2-one-request-conservatively-billed",
    "--attest-credential-from-local-keychain-not-chat",
    "--ack-maximum-14-provider-attempts",
  ],
  costLedger: {
    ...priorExecution.costLedger,
    priorRecoveryAttemptNanoUsd: 441_351_680,
    priorRecoveryAttemptCnyMicros: 3_530_814,
    targetStartingNanoUsd: 531_265_680,
    targetStartingCnyMicros: 4_250_127,
    maximumNewPairNanoUsd: 6_178_923_520,
    maximumNewPairCnyMicros: 49_431_389,
    maximumCumulativeNanoUsd: 6_710_189_200,
    maximumCumulativeCnyMicros: 53_681_516,
    nextNotificationThresholdCnyMicros: 100_000_000,
    crossesNotificationThresholdAtMaximum: false,
  },
};

export const STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_HOW_TO_PLAY_V3 = freeze({
  ...body,
  executionContractHash: hashStarcraftTmgContract(body),
});
