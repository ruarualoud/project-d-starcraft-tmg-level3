import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "./official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "./official-gameplay-data-bundle-v1.mjs";
import { verifyOfficialReserveLifecycleDataBundleV1 } from
  "./official-reserve-lifecycle-data-bundle-v1.mjs";
import { verifyOfficialBattlefieldTokenMarkerRulesDataBundleV1 } from
  "./official-battlefield-token-marker-rules-data-bundle-v1.mjs";

export const OFFICIAL_SCORING_FINALIZATION_RULES_DATA_BUNDLE_SCHEMA =
  "starcraft_tmg_official_scoring_finalization_rules_data_bundle_v1";

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
function clause(atomId, clauseIds, pdfPages, sourceTextHashes) {
  const body = { atomId, clauseIds, pdfPages, sourceTextHashes,
    sourceAuthority: "official_primary", sourceContentHash: CORE_RULES_HASH };
  return { ...body, candidateSequenceHash: hashStarcraftTmgContract(body) };
}

const RULE_CLAUSES = Object.freeze([
  clause("rule-atom:round-one-first-player-assignment", [
    "core:12.1:first-round-initiative-rolloff",
    "core:8.2.2:round-one-first-player-assignment",
  ], [57, 94], [
    "e3be93ee53132fcc99ac9ac1462e88425be3365e15f451851b2b69011c61d1b9",
    "9ff049c1da33ef40bbdcf1766e4ac94ee9da439ad303c40ce4d22e7e4101ecd1",
  ]),
  clause("rule-atom:singleton:core-11-first-player-marker-definition:b91df1325f67",
    ["core:11:first-player-marker-definition"], [87],
    ["d983282f4a752e84427f6c62d8a1b479c6fe7efc9204d467f63e506b2c4dd953"]),
  clause("rule-atom:singleton:core-11-first-player-marker-transfer-timing:bbb700cb2417",
    ["core:11:first-player-marker-transfer-timing"], [87],
    ["e97ad4c191eb51cab98bb30b8cfcdeaa2472eb8a3eec02d5b9a6950c45518fd0"]),
  clause("rule-atom:singleton:core-11-initial-first-player-marker-assignment:e4ad6170454b",
    ["core:11:initial-first-player-marker-assignment"], [87],
    ["bd10638735d3679c730f44b6832e9fb9f711aff9df88035ce8fc0b13e6ffd68f"]),
  clause("rule-atom:singleton:core-12-6-control-supply-step:7bd4906aecf0",
    ["core:12.6:control-supply-step"], [95],
    ["f2e8b4a89c96d898edb658d7996471e22e6919e9603dde9028e7a9210a869511"]),
  clause("rule-atom:singleton:core-12-6-control-tie-contested:440f5350445f",
    ["core:12.6:control-tie-contested"], [95],
    ["739d59faebbfa6b565922151f4d0e1f18edb4b67565316a580178397fdebe241"]),
  clause("rule-atom:singleton:core-12-6-higher-control-total:db050b31a5f0",
    ["core:12.6:higher-control-total"], [95],
    ["e4789b045ca38b76d4f33ff31b953f0b2311ea3102811ed0081f15ecd3701b73"]),
  clause("rule-atom:singleton:core-6-2-marker-control:f832dbd83fb0",
    ["core:6.2:marker-control"], [46],
    ["d8ed9f27104eefe7c61e040c566cb4a2a1d12d9eb1dbb133caa229fd19c6edc6"]),
  clause("rule-atom:singleton:core-8-10-highest-vp-winner:aa3dbd3a25ab",
    ["core:8.10:highest-vp-winner"], [74],
    ["c4d85579df925ca18d0e9f601e14e90a2a650dd01d333b5b361fe3e592dab60a"]),
  clause("rule-atom:singleton:core-8-10-mission-score-total:d211a95f7761",
    ["core:8.10:mission-score-total"], [74],
    ["b5cd01f3f81a0b4a0f3d7af84997f34f94e91bbbdc9fb5b890b01f51beb6a606"]),
  clause("rule-atom:singleton:core-8-10-tiebreaker-and-draw:41184b7bed03",
    ["core:8.10:tiebreaker-and-draw"], [74],
    ["2e25eb4e54fe83a9c5dc68fa2f16397ac605688ebce5dcf9781c20345cab5f73"]),
  clause("rule-atom:singleton:core-8-9-3-army-elimination-terminal:55b652e42766",
    ["core:8.9.3:army-elimination-terminal"], [74],
    ["ffe589e5ef6758501021a868e4af6bd57490fcb49ae666c88ea36d3b18fc8e0c"]),
  clause("rule-atom:singleton:core-8-9-3-round-limit-terminal:da87c7b7f16b",
    ["core:8.9.3:round-limit-terminal"], [74],
    ["f5211a9ec213f7b6fddd721eb44387e89b9dd8b26643c91d614d577a08724de3"]),
  clause("rule-atom:singleton:core-8-9-3-survivor-vp-award:c9f136bdf880",
    ["core:8.9.3:survivor-vp-award"], [74],
    ["82fc65df77e52575f57817e6a2d395f9044f6ff8944c58ecfe19792708dba5f3"]),
].sort((left, right) => left.atomId.localeCompare(right.atomId)));

export function createOfficialScoringFinalizationRulesDataBundleV1(input = {}) {
  const dataset = input.dataset;
  const gameplay = input.gameplayDataBundle;
  const reserve = input.reserveLifecycleDataBundle;
  const tokenMarker = input.battlefieldTokenMarkerRulesDataBundle;
  if (!object(dataset)
    || dataset.datasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || dataset.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || dataset.repositoryFallbackAllowed !== false) {
    fail("SCORING_FINALIZATION_DATASET_INVALID");
  }
  verifyOfficialGameplayDataBundleV1(gameplay);
  verifyOfficialReserveLifecycleDataBundleV1(reserve);
  verifyOfficialBattlefieldTokenMarkerRulesDataBundleV1(tokenMarker);
  if (gameplay.normalizedDatasetHash !== dataset.datasetHash
    || reserve.normalizedDatasetHash !== dataset.datasetHash
    || tokenMarker.normalizedDatasetHash !== dataset.datasetHash) {
    fail("SCORING_FINALIZATION_DATA_LINEAGE_INVALID");
  }
  const mission = gameplay.missionScoringProfile;
  const body = {
    schema: OFFICIAL_SCORING_FINALIZATION_RULES_DATA_BUNDLE_SCHEMA,
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
    normalizedDatasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
    coreRulesHash: CORE_RULES_HASH,
    gameplayDataBundleHash: gameplay.gameplayDataBundleHash,
    reserveLifecycleDataBundleHash: reserve.bundleHash,
    battlefieldTokenMarkerRulesDataBundleHash: tokenMarker.bundleHash,
    ruleClauses: structuredClone(RULE_CLAUSES),
    firstPlayerContract: { dicePerPlayer: 2, dieFaces: 6,
      tiePolicy: "repeat_new_roll_off_attempt_until_winner",
      winnerMayAssignMarkerToEitherParticipant: true,
      markerStateAuthority: "state.firstPlayerSideKey" },
    markerControlContract: { authorityExecutor: "authority.mission-marker-control-v3",
      rangeInches: 3, sumCurrentSupply: true, higherTotalControls: true,
      tiedTotalContestedNoTransfer: true,
      consumesWorldCoordinatesOnly: true, screenPixelsAccepted: false },
    terminalContract: { armyEliminationRequiresNoFieldModelsAndNoReserveUnits: true,
      survivingPlayerVpAward: 10, roundLimit: mission.gameLengthRounds,
      missionScoreIsAllObjectiveVp: true,
      highestVpWins: true, missionTiebreaker: mission.finalTiebreaker,
      noTiebreakerFallback: "draw" },
    projectionContract: { rulesUnit: "inch", modelBaseSizeAuthority: "official_mm",
      mapZoomAffectsRulesGeometry: false, panAffectsRulesGeometry: false,
      devicePixelRatioAffectsRulesGeometry: false,
      touchTargetAffectsRulesGeometry: false, uniformAxesRequired: true },
    counts: { promotedAtoms: 14, firstPlayerAtoms: 4,
      markerControlAtoms: 4, terminalAtoms: 3, finalScoreAtoms: 3 },
    sourcePolicy: { refreshDuringDevelopment: false, repositoryFallbackAllowed: false },
    existingConsumersFrozen: true,
    rulesTruth: "official_first_player_control_terminal_and_final_score_contract",
    trainingTruth: false,
  };
  const bundle = freezeDeep({ ...body, bundleHash: hashStarcraftTmgContract(body) });
  verifyOfficialScoringFinalizationRulesDataBundleV1(bundle);
  return bundle;
}

export function verifyOfficialScoringFinalizationRulesDataBundleV1(bundle) {
  if (!object(bundle)
    || bundle.schema !== OFFICIAL_SCORING_FINALIZATION_RULES_DATA_BUNDLE_SCHEMA
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))
    || bundle.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || bundle.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle.coreRulesHash !== CORE_RULES_HASH
    || bundle.ruleClauses?.length !== 14
    || new Set(bundle.ruleClauses.map((entry) => entry.atomId)).size !== 14
    || bundle.firstPlayerContract?.dicePerPlayer !== 2
    || bundle.markerControlContract?.rangeInches !== 3
    || bundle.markerControlContract?.screenPixelsAccepted !== false
    || bundle.terminalContract?.survivingPlayerVpAward !== 10
    || bundle.terminalContract?.noTiebreakerFallback !== "draw"
    || bundle.projectionContract?.rulesUnit !== "inch"
    || bundle.projectionContract?.mapZoomAffectsRulesGeometry !== false
    || bundle.projectionContract?.devicePixelRatioAffectsRulesGeometry !== false
    || bundle.sourcePolicy?.refreshDuringDevelopment !== false
    || bundle.sourcePolicy?.repositoryFallbackAllowed !== false
    || bundle.existingConsumersFrozen !== true || bundle.trainingTruth !== false) {
    fail("SCORING_FINALIZATION_DATA_BUNDLE_INVALID");
  }
  if (bundle.ruleClauses.some((entry) => !HASH_PATTERN.test(entry.candidateSequenceHash)
    || entry.sourceContentHash !== CORE_RULES_HASH
    || !Array.isArray(entry.sourceTextHashes) || entry.sourceTextHashes.length === 0
    || entry.sourceTextHashes.some((hash) => !HASH_PATTERN.test(hash)))) {
    fail("SCORING_FINALIZATION_RULE_CLAUSE_INVALID");
  }
  return true;
}
