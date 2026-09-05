import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/referee-crypto-v1.mjs";
import { STARCRAFT_TMG_DEEPSEEK_DEV_KEYCHAIN_ITEM_V1 as keychainItem } from
  "../../packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs";
import { STARCRAFT_TMG_TICKET_17_SLICE_170_PAIRED_PROOF_V1 as proof } from
  "./ticket-17-slice-170-paired-proof-v1.mjs";

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

const body = {
  schemaVersion: "starcraft_tmg_ticket_17_slice_170_live_how_to_play_v2",
  ticket: 17,
  slice: 170,
  targetAttemptOrdinal: 2,
  outputDirectoryName: "how-to-play-attempt-2",
  target: {
    taskId: proof.target.taskId,
    productionSkillId: proof.target.productionSkillId,
    productionCatalogueHash: proof.target.productionCatalogueHash,
    productionCatalogueSkillCount: proof.target.productionCatalogueSkillCount,
    proofContractHash: proof.contractHash,
  },
  priorObsoleteTracerAttempt: {
    purpose: "faq_v1_11_single_atom_tracer",
    runId: "slice170-live-35fe46ad-9593-40d5-91e2-3b68a42486d0",
    proofContractHash:
      "8f5f089dfe034bea7295a6b577e9a7edeb8808f3ef76ece0a1b23318ad76c669",
    reportHash:
      "b8034d08d0d0416ae8d891d39853202fdd6a02088d00c574daa84c504426b474",
    lockHash:
      "d07046442cad4d1dd77ebeb275ac72181791812bc7ff3d84126a80ab65383c64",
    failureCode: "OFFLINE_PROVIDER_ATTEMPT_FAILED",
    providerCallsObserved: 1,
    automaticRetries: 0,
    candidatesEmitted: 0,
    mayHaveBeenBilled: true,
    reusableAsHowToPlayEvidence: false,
  },
  priorHowToPlayAttempt: {
    purpose: "formal_production_catalogue_how_to_play_pair",
    targetAttemptOrdinal: 1,
    runId: "slice170-live-d326f427-378c-4117-9f57-fbe1025e00af",
    proofContractHash:
      "dd38347fa65b92ef1ce3a3864e6fdce51b249c9b9bcd5b107f46af7055106b36",
    executionContractHash:
      "95fc3affc1653eea093bd55c96ee2afc30333c33d31af30435aff54759d0da06",
    reportHash:
      "7499f8fbcd1eb3758fc73fed13be01b3d74aee6ec64e75b4b8323a3e3dfe0663",
    lockHash:
      "8506b88ca19fcffa7f856fd829baf82c6d277c466e4100fe492fb40b804bd649",
    failureCode: "OFFLINE_PROVIDER_ATTEMPT_FAILED",
    providerFailureCode: "PROVIDER_REQUEST_CONTRACT_REJECTED",
    requestDefinitelyNotSent: true,
    requestMayHaveBeenSent: false,
    providerWorkerCallsObserved: 1,
    physicalProviderAttemptsObserved: 0,
    automaticRetries: 0,
    candidatesEmitted: 0,
    costNanoUsd: 0,
    costCnyMicros: 0,
    reusableAsCandidateEvidence: false,
  },
  recovery: {
    cause:
      "host-only negative capability leaked into model-facing request and matched the transport sensitive-field denylist",
    correction:
      "validate the host request then remove readHostSecrets from the model-facing projection",
    minimizedRegressionExpectedStop: "PROVIDER_DNS_RESOLUTION_FAILED",
    minimizedRegressionRequestDefinitelyNotSent: true,
  },
  requiredFlags: [
    "--authorize-live-how-to-play-skill-pair-recovery-once",
    "--ack-prior-how-to-play-attempt-definitely-not-sent",
    "--attest-credential-from-local-keychain-not-chat",
    "--ack-maximum-14-provider-attempts",
  ],
  credentialIngress: {
    kind: "macos_login_keychain_generic_password",
    service: keychainItem.service,
    account: keychainItem.account,
    oneTimeEnrollmentRequired: true,
    chatCredentialAllowed: false,
    environmentCredentialAllowed: false,
    argumentCredentialAllowed: false,
    repositoryCredentialAllowed: false,
    keychainOutputPersisted: false,
  },
  costLedger: {
    historicalBaselineNanoUsd: 562_320,
    historicalBaselineCnyMicros: 4_499,
    priorTracerConservativeNanoUsd: 89_351_680,
    priorTracerConservativeCnyMicros: 714_814,
    priorHowToPlayAttemptNanoUsd: 0,
    priorHowToPlayAttemptCnyMicros: 0,
    targetStartingNanoUsd: 89_914_000,
    targetStartingCnyMicros: 719_313,
    maximumNewPairNanoUsd: 6_178_923_520,
    maximumNewPairCnyMicros: 49_431_389,
    maximumCumulativeNanoUsd: 6_268_837_520,
    maximumCumulativeCnyMicros: 50_150_702,
    nextNotificationThresholdCnyMicros: 100_000_000,
    crossesNotificationThresholdAtMaximum: false,
    providerInvoiceAuthoritative: true,
  },
  priorEvidenceImmutable: true,
  automaticRetryAllowed: false,
  rerunRequiresFreshUserAuthority: true,
  sourceRefreshPerformed: false,
  largeScaleProductionRun: false,
  candidatesPromoted: 0,
  trainingTruth: false,
};

export const STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_HOW_TO_PLAY_V2 = freeze({
  ...body,
  executionContractHash: hashStarcraftTmgContract(body),
});
