import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/referee-crypto-v1.mjs";
import { STARCRAFT_TMG_TICKET_17_SLICE_170_PAIRED_PROOF_V1 as proof } from
  "./ticket-17-slice-170-paired-proof-v1.mjs";

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

const body = {
  schemaVersion: "starcraft_tmg_ticket_17_slice_170_live_how_to_play_v1",
  ticket: 17,
  slice: 170,
  targetAttemptOrdinal: 1,
  outputDirectoryName: "how-to-play-attempt-1",
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
  requiredFlags: [...proof.liveAuthority.requiredFlags],
  costLedger: {
    historicalBaselineNanoUsd: 562_320,
    historicalBaselineCnyMicros: 4_499,
    priorTracerConservativeNanoUsd: 89_351_680,
    priorTracerConservativeCnyMicros: 714_814,
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

export const STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_HOW_TO_PLAY_V1 = freeze({
  ...body,
  executionContractHash: hashStarcraftTmgContract(body),
});
