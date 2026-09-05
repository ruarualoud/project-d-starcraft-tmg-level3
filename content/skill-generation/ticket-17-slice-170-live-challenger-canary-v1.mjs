import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/referee-crypto-v1.mjs";
import { STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_HOW_TO_PLAY_V7 as priorExecution } from
  "./ticket-17-slice-170-live-how-to-play-v7.mjs";
import { STARCRAFT_TMG_TICKET_17_SLICE_170_PAIRED_PROOF_V1 as proof } from
  "./ticket-17-slice-170-paired-proof-v1.mjs";

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

const body = {
  schemaVersion:
    "starcraft_tmg_ticket_17_slice_170_live_challenger_canary_v1",
  ticket: 17,
  slice: 170,
  purpose: "one_call_parent_child_worker_boundary_canary",
  proofContractHash: proof.contractHash,
  priorExecutionContractHash: priorExecution.executionContractHash,
  outputDirectoryName: "how-to-play-challenger-canary-1",
  priorParentValidationFailureAttempt: {
    targetAttemptOrdinal: 7,
    runId: "slice170-live-fbff038c-f061-49b4-81ed-72abc24502af",
    reportHash:
      "b5d3606a7e9ffee3902df721b17def311b4e18340620268f3a6c4a8d6cb4b96f",
    lockHash:
      "35a6396e71b8c6c6c10c237bfe8a8136b194284535b1c041072b205a14b7df5f",
    failedRole: "challenger",
    failureCode: "OFFLINE_PROVIDER_ATTEMPT_FAILED",
    transportFailureClass: "PROVIDER_WORKER_RESULT_VALIDATION_REJECTED",
    providerWorkerCallsObserved: 4,
    physicalProviderAttemptsObserved: 4,
    successfulProviderReceiptsObserved: 3,
    successfulInputTokens: 18_330,
    successfulOutputTokens: 772,
    successfulTotalTokens: 19_102,
    successfulCalculatedCostNanoUsd: 4_351_272,
    failedCallUsageKnown: false,
    attemptCalculatedOrConservativeCostNanoUsd: 445_702_952,
    attemptCalculatedOrConservativeCostCnyMicros: 3_565_626,
    candidatesEmitted: 0,
    reusableAsCandidateEvidence: false,
  },
  boundaryCorrection: {
    parentWorkerPort:
      "starcraft_tmg_provider_egress_worker_port_v2",
    childWireVersion: "starcraft_tmg_provider_egress_worker_child_v1",
    childSuccessClassifier:
      "starcraft_tmg_provider_worker_success_classifier_v1",
    parentAndChildUseSharedSuccessClassifier: true,
    frozenParentV1Modified: false,
    realIpcPreflightRequired: true,
    realIpcPreflightAssertions: 21,
    realIpcPreflightReportHash:
      "987a39fb6124897864ab0af2be7496f8ce72d6f0661767a45ae11ebb86ed1ddd",
    realIpcRolesPerArm: 7,
    realIpcArms: 2,
    faultClassesCovered: 10,
  },
  canary: {
    role: "challenger",
    locallyConstructedPrefixRoles: ["planner", "tutor", "student"],
    liveProviderRoles: ["challenger"],
    stopBeforeRole: "reasoner",
    maximumPhysicalProviderAttempts: 1,
    automaticRetries: 0,
    candidatesEmitted: 0,
    candidatesPromoted: 0,
    selfPlayRuns: 0,
    muzeroExports: 0,
    maxInputTokens: 32_000,
    maxOutputTokens: 1_024,
    maximumForecastCostNanoUsd: 15_431_680,
    maximumForecastCostCnyMicros: 123_454,
    formalPairAttemptOrdinalAfterPass: 8,
  },
  requiredFlags: [
    "--authorize-live-challenger-canary-once",
    "--ack-maximum-one-provider-attempt",
    "--attest-credential-from-local-keychain-not-chat",
  ],
  credentialIngress: {
    kind: "macos_login_keychain_generic_password",
    chatCredentialAllowed: false,
    environmentCredentialAllowed: false,
    argumentCredentialAllowed: false,
    repositoryCredentialAllowed: false,
  },
  costLedger: {
    targetStartingNanoUsd: 2_887_617_788,
    targetStartingCnyMicros: 23_100_954,
    maximumCanaryNanoUsd: 15_431_680,
    maximumCanaryCnyMicros: 123_454,
    maximumCumulativeNanoUsd: 2_903_049_468,
    maximumCumulativeCnyMicros: 23_224_408,
    nextNotificationThresholdCnyMicros: 100_000_000,
    crossesNotificationThresholdAtMaximum: false,
  },
  automaticRetryAllowed: false,
  rerunRequiresFreshUserAuthority: true,
  sourceRefreshPerformed: false,
  trainingTruth: false,
};

export const STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_CHALLENGER_CANARY_V1 =
  freeze({
    ...body,
    executionContractHash: hashStarcraftTmgContract(body),
  });
