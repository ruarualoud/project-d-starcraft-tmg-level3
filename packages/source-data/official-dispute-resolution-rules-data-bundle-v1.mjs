import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "./official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "./official-gameplay-data-bundle-v1.mjs";
import { verifyOfficialScoringFinalizationRulesDataBundleV1 } from
  "./official-scoring-finalization-rules-data-bundle-v1.mjs";

export const OFFICIAL_DISPUTE_RESOLUTION_RULES_DATA_BUNDLE_SCHEMA =
  "starcraft_tmg_official_dispute_resolution_rules_data_bundle_v1";

const CORE_RULES_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";
const HASH_PATTERN = /^[a-f0-9]{64}$/u;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function clause(atomId, clauseId, textHash, candidateOrdinalStart,
  candidateOrdinalEnd) {
  const body = { atomId, clauseIds: [clauseId], pdfPages: [96],
    sourceTextHashes: [textHash], candidateOrdinalStart, candidateOrdinalEnd,
    sourceAuthority: "official_primary", sourceContentHash: CORE_RULES_HASH };
  return { ...body, candidateSequenceHash: hashStarcraftTmgContract(body) };
}

const RULE_CLAUSES = Object.freeze([
  clause(
    "rule-atom:singleton:core-12-9-continue-after-provisional-ruling:0e982d041bc4",
    "core:12.9:continue-after-provisional-ruling",
    "53b28142ffb2744dce4ca2f266dda1e1bd7172d3f3f47f079808cebda9e030ed",
    4,
    4,
  ),
  clause(
    "rule-atom:singleton:core-12-9-post-match-ruling-verification:45d659d8e2bc",
    "core:12.9:post-match-ruling-verification",
    "5b47e3d6df717eabd9e45667492721b02b242d1bca2854170de811c722c8120e",
    5,
    5,
  ),
  clause(
    "rule-atom:singleton:core-12-9-provisional-ruling-owner:ff5a3f124ebb",
    "core:12.9:provisional-ruling-owner",
    "caebf99eba32db81adc4f026304e61326e95bb87ab4d68b2373a11d49cbb54a1",
    3,
    3,
  ),
  clause(
    "rule-atom:singleton:core-12-9-unresolved-dispute-rolloff:0fa3cdc56e75",
    "core:12.9:unresolved-dispute-rolloff",
    "16d1ae13c5047cefbeb991ff86741d880de5fa5e50ba58b97d2650d7412a72ce",
    1,
    2,
  ),
].sort((left, right) => left.atomId.localeCompare(right.atomId)));

export function createOfficialDisputeResolutionRulesDataBundleV1(input = {}) {
  const dataset = input.dataset;
  const gameplay = input.gameplayDataBundle;
  const scoring = input.scoringFinalizationRulesDataBundle;
  if (!object(dataset)
    || dataset.datasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || dataset.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || dataset.repositoryFallbackAllowed !== false) {
    fail("DISPUTE_RESOLUTION_DATASET_INVALID");
  }
  verifyOfficialGameplayDataBundleV1(gameplay);
  verifyOfficialScoringFinalizationRulesDataBundleV1(scoring);
  if (gameplay.normalizedDatasetHash !== dataset.datasetHash
    || scoring.normalizedDatasetHash !== dataset.datasetHash
    || scoring.gameplayDataBundleHash !== gameplay.gameplayDataBundleHash) {
    fail("DISPUTE_RESOLUTION_DATA_LINEAGE_INVALID");
  }
  const body = {
    schema: OFFICIAL_DISPUTE_RESOLUTION_RULES_DATA_BUNDLE_SCHEMA,
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
    normalizedDatasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
    coreRulesHash: CORE_RULES_HASH,
    gameplayDataBundleHash: gameplay.gameplayDataBundleHash,
    scoringFinalizationRulesDataBundleHash: scoring.bundleHash,
    ruleClauses: structuredClone(RULE_CLAUSES),
    disputeContract: {
      trigger: "rules_dispute_cannot_be_resolved_swiftly",
      dicePerPlayer: 2,
      dieFaces: 6,
      higherTotalWins: true,
      tiePolicy: "repeat_new_roll_off_attempt_until_winner",
      rulingOwner: "roll_off_winner",
      rulingScope: "specific_instance_only",
      continueAfterRuling: true,
      postMatchVerificationRequired: true,
    },
    authorityContract: {
      coordinatorDoesNotOwnRuling: true,
      clientWholeStateMutationAccepted: false,
      canonicalRulesMutationAccepted: false,
      contentHashRequired: true,
      permanentReceiptSignature: "ed25519",
      shortLivedPreviewSeal: "hmac-sha256",
    },
    manualAdjudicationContract: {
      typedOptionsOnly: true,
      arbitraryPatchAccepted: false,
      roomTrainingEligibleAfterUse: false,
      rulingTrainingTruth: false,
      verificationDoesNotRewriteHistoricalReceipt: true,
    },
    counts: { promotedAtoms: 4, rollOffAtoms: 1, rulingOwnerAtoms: 1,
      continueAtoms: 1, postMatchVerificationAtoms: 1 },
    sourcePolicy: { refreshDuringDevelopment: false,
      repositoryFallbackAllowed: false },
    existingConsumersFrozen: true,
    rulesTruth: "official_dispute_procedure_and_manual_adjudication_boundary",
    trainingTruth: false,
  };
  const bundle = freezeDeep({ ...body,
    bundleHash: hashStarcraftTmgContract(body) });
  verifyOfficialDisputeResolutionRulesDataBundleV1(bundle);
  return bundle;
}

export function verifyOfficialDisputeResolutionRulesDataBundleV1(bundle) {
  if (!object(bundle)
    || bundle.schema !== OFFICIAL_DISPUTE_RESOLUTION_RULES_DATA_BUNDLE_SCHEMA
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))
    || bundle.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || bundle.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle.coreRulesHash !== CORE_RULES_HASH
    || bundle.ruleClauses?.length !== 4
    || new Set(bundle.ruleClauses.map((entry) => entry.atomId)).size !== 4
    || bundle.disputeContract?.dicePerPlayer !== 2
    || bundle.disputeContract?.dieFaces !== 6
    || bundle.disputeContract?.rulingOwner !== "roll_off_winner"
    || bundle.disputeContract?.rulingScope !== "specific_instance_only"
    || bundle.disputeContract?.continueAfterRuling !== true
    || bundle.disputeContract?.postMatchVerificationRequired !== true
    || bundle.authorityContract?.clientWholeStateMutationAccepted !== false
    || bundle.authorityContract?.canonicalRulesMutationAccepted !== false
    || bundle.manualAdjudicationContract?.typedOptionsOnly !== true
    || bundle.manualAdjudicationContract?.arbitraryPatchAccepted !== false
    || bundle.manualAdjudicationContract?.roomTrainingEligibleAfterUse !== false
    || bundle.sourcePolicy?.refreshDuringDevelopment !== false
    || bundle.sourcePolicy?.repositoryFallbackAllowed !== false
    || bundle.existingConsumersFrozen !== true
    || bundle.trainingTruth !== false) {
    fail("DISPUTE_RESOLUTION_DATA_BUNDLE_INVALID");
  }
  if (bundle.ruleClauses.some((entry) => !HASH_PATTERN.test(entry.candidateSequenceHash)
    || entry.sourceContentHash !== CORE_RULES_HASH
    || entry.pdfPages?.[0] !== 96
    || entry.sourceTextHashes?.length !== 1
    || !HASH_PATTERN.test(entry.sourceTextHashes[0]))) {
    fail("DISPUTE_RESOLUTION_RULE_CLAUSE_INVALID");
  }
  return true;
}
